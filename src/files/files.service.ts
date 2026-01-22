/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */

import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { File } from './file.entity';
import { File as MulterFile } from 'multer';
import { OrdersService } from 'src/orders/order.service';
import { MinioService } from 'src/minio/minio.service';
import { ClamAVService } from 'src/clamav/clamav.service';
import { Step, StepStatus } from 'src/types/steps';
import { UserRole } from 'src/users/user.entity';
import { UsersService } from 'src/users/users.service';
import { randomUUID } from 'crypto';
@Injectable()
export class FilesService {
  constructor(
    @InjectRepository(File)
    private filesRepository: Repository<File>,
    private ordersService: OrdersService,
    private minioService: MinioService,
    private userService: UsersService,
    private clamAVService: ClamAVService,
  ) {}

  private async saveFileToStorage(file: MulterFile): Promise<string> {
    const ext = file.originalname.split('.').pop();
    const objectName = `files/${Date.now()}-${randomUUID()}.${ext}`;

    await this.minioService.uploadFile(
      objectName,
      file.buffer, // MulterFile يحتوي على buffer
      file.mimetype,
    );

    return objectName;
  }

  async uploadFile(
    userId: string,
    declarationId: string,
    file: MulterFile,
    documentType: string,
    actorIsAdmin = false,
    deliveredForStep?: string,
  ): Promise<File> {
    const declaration =
      await this.ordersService.findDeclarationById(declarationId);
    const ownerUserId = declaration.clientProfile?.user?.id;

    if (!actorIsAdmin && ownerUserId !== userId) {
      throw new ForbiddenException('Access to this declaration is forbidden.');
    }
    if (
      !actorIsAdmin &&
      (!deliveredForStep || deliveredForStep === 'documentsPreparation')
    ) {
      await this.ensureStep1Editable(declarationId, actorIsAdmin);
      await this.reopenStep1IfConfirmed(declarationId, userId);
      await this.ensureStep1Started(declarationId, userId);
    }

    const storagePath = await this.saveFileToStorage(file);

    const savedMeta = {
      ...((file as any).meta ?? {}),
      deliveredForStep: deliveredForStep ?? null,
      uploadedBy: userId,
      uploaderRole: actorIsAdmin ? 'admin' : 'user',
    };

    const fileEntity = this.filesRepository.create({
      originalName: file.originalname,
      storagePath,
      mimetype: file.mimetype,
      size: file.size,
      declaration,
      documentType,
      meta: savedMeta,
    });

    const savedFile = await this.filesRepository.save(fileEntity);

    // If the step is already DONE, do not change the status back to IN_PROGRESS
    const steps: Step[] = Array.isArray(declaration.steps)
      ? declaration.steps
      : this.ordersService.getDefaultSteps();

    const step = steps.find((s) => s.id === 'documentsPreparation');
    if (step && step.status === StepStatus.DONE) {
      // Do not change status if step is already DONE
      return savedFile;
    }

    // If actor is admin, mark the step as in-progress
    if (actorIsAdmin) {
      if (deliveredForStep) {
        await this.ordersService.updateStep(
          declarationId,
          deliveredForStep,
          StepStatus.IN_PROGRESS,
          userId,
          { adminFile: savedFile.id },
        );
      } else {
        await this.ordersService.updateStep(
          declarationId,
          'adminUploads',
          StepStatus.IN_PROGRESS,
          userId,
          { adminFile: savedFile.id },
        );
      }
    }

    return savedFile;
  }

  async getFileUrl(fileId: string, requestingUserId: string): Promise<string> {
    const file = await this.filesRepository.findOne({
      where: { id: fileId },
      relations: [
        'declaration',
        'declaration.clientProfile',
        'declaration.clientProfile.user',
      ],
    });
    if (!file) {
      throw new NotFoundException('File not found.');
    }

    const declaration = file.declaration;
    const ownerUserId = declaration?.clientProfile?.user?.id;

    if (requestingUserId !== ownerUserId) {
      const requestingUser =
        await this.userService.findOneById(requestingUserId);
      const isAdmin = requestingUser?.roles?.includes(UserRole.ADMIN);
      if (!isAdmin) {
        throw new ForbiddenException('Not allowed to download this file.');
      }
      return this.minioService.getPresignedUrl(file.storagePath);
    }
    const deliveredForStep = file.meta?.deliveredForStep;
    const alreadyDownloaded = file.meta?.downloadedBy;
    if (deliveredForStep && !alreadyDownloaded) {
      file.meta = {
        ...(file.meta ?? {}),
        downloadedBy: requestingUserId,
        downloadedAt: new Date().toISOString(),
      };
      await this.filesRepository.save(file);
    }
    const exists = await this.minioService.objectExists(file.storagePath);
    console.log('Object exists in MinIO:', exists, file.storagePath);
    if (!exists) {
      console.error(
        `MinIO object missing: ${file.storagePath} for file id ${file.id}`,
      );
      throw new NotFoundException(
        'File not found in storage (object missing).',
      );
    }
    return this.minioService.getPresignedUrl(file.storagePath);
  }
  async uploadMultipleFiles(
    userId: string,
    declarationId: string,
    files: MulterFile[],
    documentType: string,
  ): Promise<{ saved: File[]; failed: { fileName: string; reason: any }[] }> {
    await this.ensureStep1Editable(declarationId, false);
    await this.reopenStep1IfConfirmed(declarationId, userId);
    await this.ensureStep1Started(declarationId, userId);

    const concurrency = 4;
    const savedFiles: File[] = [];
    const failed: { fileName: string; reason: any }[] = [];

    for (let i = 0; i < files.length; i += concurrency) {
      const batch = files.slice(i, i + concurrency);
      const results = await Promise.allSettled(
        batch.map((file) =>
          this.uploadFile(userId, declarationId, file, documentType),
        ),
      );

      results.forEach((r, idx) => {
        if (r.status === 'fulfilled') savedFiles.push(r.value);
        else
          failed.push({ fileName: batch[idx].originalname, reason: r.reason });
      });
    }

    try {
      const decl = await this.ordersService.findDeclarationById(declarationId);
      const existingStep = decl.steps?.find(
        (s) => s.id === 'documentsPreparation',
      );
      const existingFileIds: string[] = existingStep?.meta?.files ?? [];

      await this.ordersService.updateStep(
        declarationId,
        'documentsPreparation',
        existingStep?.status ?? StepStatus.IN_PROGRESS, // keep current
        userId,
        { files: [...existingFileIds, ...savedFiles.map((f) => f.id)] },
      );
    } catch (err) {
      console.error(
        'Failed to update step metadata after multiple uploads',
        err,
      );
    }

    return { saved: savedFiles, failed };
  }

  async uploadDraftForReviewStep(
    adminId: string,
    declarationId: string,
    file: MulterFile,
  ): Promise<File> {
    // 1. تحقق من الصلاحيات والطلب (يمكنك نسخ هذا من uploadFile)
    const declaration =
      await this.ordersService.findDeclarationById(declarationId);
    if (!declaration) throw new NotFoundException('Declaration not found');

    // 2. احفظ الملف في MinIO
    const storagePath = await this.saveFileToStorage(file);

    // 3. أنشئ كيان الملف مع meta محددة
    const fileEntity = this.filesRepository.create({
      originalName: file.originalname,
      storagePath,
      mimetype: file.mimetype,
      size: file.size,
      declaration,
      documentType: 'final_draft', // النوع ثابت
      meta: {
        deliveredForStep: 'reviewAndValidation', // الخطوة المستهدفة ثابتة
        uploadedBy: adminId,
        uploaderRole: 'admin',
      },
    });

    return this.filesRepository.save(fileEntity);
  }
  async markDocumentMissing(
    userId: string,
    declarationId: string,
    documentType: string,
    reason?: string,
  ): Promise<void> {
    const declaration = await this.ordersService.findDeclarationById(
      declarationId,
      ['clientProfile', 'clientProfile.user', 'files'],
    );
    if (!declaration) throw new NotFoundException('Declaration not found');

    const ownerUserId = declaration.clientProfile?.user?.id;
    if (ownerUserId !== userId) {
      throw new ForbiddenException('Access to this declaration is forbidden.');
    }
    await this.ensureStep1Editable(declarationId, false);
    const steps: Step[] = Array.isArray(declaration.steps)
      ? declaration.steps
      : this.ordersService.getDefaultSteps();

    const idx = steps.findIndex((s) => s.id === 'documentsPreparation');
    if (idx === -1) {
      throw new BadRequestException('documentsPreparation step not found.');
    }

    const existingMeta = steps[idx].meta ?? {};
    const existingMissing = existingMeta.missingDocs ?? [];

    const now = new Date().toISOString();
    const updatedMissing = [
      ...existingMissing.filter((m: any) => m.documentType !== documentType),
      {
        documentType,
        reason: reason ?? null,
        declaredBy: userId,
        declaredAt: now,
      },
    ];

    steps[idx] = {
      ...steps[idx],
      meta: {
        ...existingMeta,
        missingDocs: updatedMissing,
      },
    };

    await this.ordersService.saveDeclaration(declarationId, { steps });
    await this.reopenStep1IfConfirmed(declarationId, userId);
    await this.ensureStep1Started(declarationId, userId);
  }
  async unmarkDocumentMissing(
    userId: string,
    declarationId: string,
    documentType: string,
  ) {
    const declaration = await this.ordersService.findDeclarationById(
      declarationId,
      ['clientProfile', 'clientProfile.user', 'files'],
    );
    if (!declaration) throw new NotFoundException('Declaration not found');

    const ownerUserId = declaration.clientProfile?.user?.id;
    if (ownerUserId !== userId)
      throw new ForbiddenException('Access forbidden');

    await this.ensureStep1Editable(declarationId, false); // ✅ ADD

    const steps: Step[] = Array.isArray(declaration.steps)
      ? declaration.steps
      : this.ordersService.getDefaultSteps();

    const idx = steps.findIndex((s) => s.id === 'documentsPreparation');
    if (idx === -1)
      throw new BadRequestException('documentsPreparation step not found.');

    const meta = steps[idx].meta ?? {};
    const existingMissing = meta.missingDocs ?? [];

    // Remove the document from the missing list
    steps[idx] = {
      ...steps[idx],
      meta: {
        ...meta,
        missingDocs: existingMissing.filter(
          (m: any) => m.documentType !== documentType,
        ),
      },
    };

    // If step is already DONE, leave it as DONE
    const currentStepStatus = steps[idx].status;
    if (currentStepStatus === StepStatus.DONE) {
      // Do not change the status if it's already DONE
      await this.ordersService.saveDeclaration(declarationId, { steps });
    } else {
      // If for some reason the status was not DONE, set it back to DONE
      steps[idx].status = StepStatus.DONE;
      await this.ordersService.saveDeclaration(declarationId, { steps });
    }

    // Return a response indicating that the document was unmarked as missing, but status remains DONE
    return { ok: true };
  }

  async saveStep1Answers(
    userId: string,
    declarationId: string,
    answers: Record<string, any>,
  ): Promise<void> {
    const declaration = await this.ordersService.findDeclarationById(
      declarationId,
      ['clientProfile'],
    );
    if (!declaration) throw new NotFoundException('Declaration not found');

    const ownerUserId = declaration.clientProfile?.user?.id;
    if (ownerUserId !== userId) {
      throw new ForbiddenException('Access to this declaration is forbidden.');
    }
    await this.ensureStep1Editable(declarationId, false);
    const snapshot = declaration.questionnaireSnapshot ?? {};
    snapshot.step1Answers = {
      ...(snapshot.step1Answers ?? {}),
      ...answers,
    };

    await this.ordersService.saveDeclaration(declarationId, {
      questionnaireSnapshot: snapshot,
    });

    await this.reopenStep1IfConfirmed(declarationId, userId);
    await this.ensureStep1Started(declarationId, userId);
  }
  async getStep1Answers(
    userId: string,
    roles: string[],
    declarationId: string,
  ) {
    const declaration = await this.ordersService.findDeclarationById(
      declarationId,
      ['clientProfile', 'clientProfile.user'],
    );
    if (!declaration) throw new NotFoundException('Declaration not found');

    const isAdmin = roles?.includes('admin');

    // admin allowed
    if (!isAdmin) {
      const ownerUserId = declaration.clientProfile?.user?.id;
      if (ownerUserId !== userId) throw new ForbiddenException('Forbidden');
    }

    return declaration.questionnaireSnapshot?.step1Answers ?? {};
  }

  async deleteFile(userId: string, fileId: string): Promise<void> {
    const file = await this.filesRepository.findOne({
      where: { id: fileId },
      relations: [
        'declaration',
        'declaration.clientProfile',
        'declaration.clientProfile.user',
      ],
    });

    if (!file) throw new NotFoundException('File not found.');

    const ownerUserId = file.declaration?.clientProfile?.user?.id;
    if (ownerUserId !== userId) {
      throw new ForbiddenException('Not allowed to delete this file.');
    }
    await this.ensureStep1Editable(file.declaration.id, false);
    if (file.storagePath) {
      await this.minioService.removeFile(file.storagePath);
    }
    await this.filesRepository.remove(file);
    await this.reopenStep1IfConfirmed(file.declaration.id, userId);
    await this.ensureStep1Started(file.declaration.id, userId);
  }
  private async reopenStep1IfConfirmed(
    declarationId: string,
    actorUserId: string,
  ) {
    const decl = await this.ordersService.findDeclarationById(declarationId);
    const step = (decl.steps ?? []).find(
      (s: any) => s.id === 'documentsPreparation',
    );
    if (!step) return;

    if (step.status === StepStatus.DONE) {
      await this.ordersService.updateStep(
        declarationId,
        'documentsPreparation',
        StepStatus.IN_PROGRESS,
        actorUserId,
        {
          confirmedAt: null,
          confirmedBy: null,
          reopenedAt: new Date().toISOString(),
          reopenedBy: actorUserId,
        },
      );
    }
  }
  private async ensureStep1Started(declarationId: string, actorUserId: string) {
    const decl = await this.ordersService.findDeclarationById(declarationId);
    const step = (decl.steps ?? []).find(
      (s: any) => s.id === 'documentsPreparation',
    );
    if (!step) return;

    if (step.status === StepStatus.PENDING) {
      await this.ordersService.updateStep(
        declarationId,
        'documentsPreparation',
        StepStatus.IN_PROGRESS,
        actorUserId,
        {
          startedAt: new Date().toISOString(),
          startedBy: actorUserId,
        },
      );
    }
  }
  private async ensureStep1Editable(
    declarationId: string,
    actorIsAdmin: boolean,
  ) {
    if (actorIsAdmin) return; // admin always allowed
    const decl = await this.ordersService.findDeclarationById(declarationId);
    const reviewStep = (decl.steps ?? []).find(
      (s: any) => s.id === 'documentsReview',
    );
    if (reviewStep?.status === StepStatus.DONE) {
      throw new ForbiddenException(
        'Step 1 is locked because documents were approved.',
      );
    }
  }
}
