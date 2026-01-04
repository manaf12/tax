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
import { Step, StepStatus } from 'src/types/steps'; // أو المسار الصحيح للمشروع
const REQUIRED_DOCUMENT_TYPES = [
  'salary_certificate',
  'bank_statement',
  'pillar_3_certificate',
  'property_deed_main',
  'property_deed_rental',
  'debt_statement',
  'medical_expense_receipt',
];
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
    // const uniqueFileName = `${Date.now()}-${file.originalname}`;
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
    if (!declaration) {
      throw new NotFoundException('Declaration not found');
    }
    const ownerUserId = declaration.clientProfile?.user?.id;
    if (!actorIsAdmin && ownerUserId !== userId) {
      throw new ForbiddenException('Access to this declaration is forbidden.');
    }
    const storagePath = await this.saveFileToStorage(file);

    // build meta including uploader info
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
    if (!actorIsAdmin && deliveredForStep) {
      const decl = await this.ordersService.findDeclarationById(declarationId);
      const step = (decl.steps ?? []).find((s) => s.id === deliveredForStep);
      const existingFiles = step?.meta?.files ?? [];
      await this.ordersService.updateStep(
        declarationId,
        deliveredForStep,
        step?.status ?? StepStatus.PENDING,
        userId,
        { files: [...existingFiles, savedFile.id] },
      );
    }

    if (!actorIsAdmin) {
      await this.checkAndCompleteStep1(declarationId, userId);
    } else {
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
  private async checkAndCompleteStep1(
    declarationId: string,
    userId: string,
  ): Promise<void> {
    try {
      const declaration = await this.ordersService.findDeclarationById(
        declarationId,
        ['files'],
      );

      const uploadedDocTypes = new Set(
        declaration.files.map((f) => f.documentType),
      );

      const step = (declaration.steps ?? []).find(
        (s) => s.id === 'documentsPreparation',
      );
      const missingMeta = step?.meta?.missingDocs ?? [];
      const missingDocTypes = new Set(
        missingMeta.map((m: any) => m.documentType),
      );

      // أمثلة على أسئلة إلزامية في خطوة 1 (يمكن حفظها في snapshot عند إنشاء العرض أو ديناميكياً)
      const requiredQuestions: string[] =
        (declaration?.questionnaireSnapshot
          ?.step1RequiredQuestions as string[]) ?? []; // لو فاضي => لا توجد أسئلة إلزامية

      const step1Answers =
        (declaration?.questionnaireSnapshot?.step1Answers as Record<
          string,
          any
        >) ?? {};

      const allMandatoryDocsHandled = REQUIRED_DOCUMENT_TYPES.every(
        (docType) =>
          uploadedDocTypes.has(docType) || missingDocTypes.has(docType),
      );

      const allRequiredQuestionsAnswered = requiredQuestions.every(
        (q) =>
          typeof step1Answers[q] !== 'undefined' &&
          step1Answers[q] !== null &&
          String(step1Answers[q]).trim().length > 0,
      );

      if (allMandatoryDocsHandled && allRequiredQuestionsAnswered) {
        await this.ordersService.updateStep(
          declarationId,
          'documentsPreparation',
          StepStatus.DONE,
          userId,
          { completedAt: new Date().toISOString() },
        );
        console.log(
          `Step 1 for declaration ${declarationId} marked as COMPLETED.`,
        );
      }
    } catch (error) {
      console.error(
        `Failed to check or complete Step 1 for declaration ${declarationId}`,
        error,
      );
    }
  }

  async uploadMultipleFiles(
    userId: string,
    declarationId: string,
    files: MulterFile[],
    documentType: string, // <-- ACTION 4: Accept the new argument
  ): Promise<{ saved: File[]; failed: { fileName: string; reason: any }[] }> {
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
        if (r.status === 'fulfilled') {
          savedFiles.push(r.value);
        } else {
          failed.push({ fileName: batch[idx].originalname, reason: r.reason });
        }
      });
    }
    await this.checkAndCompleteStep1(declarationId, userId);

    try {
      const decl = await this.ordersService.findDeclarationById(declarationId);
      const existingStep = decl.steps?.find(
        (s) => s.id === 'documentsPreparation',
      ); // Use the correct step ID
      const existingFileIds: string[] = existingStep?.meta?.files ?? [];

      await this.ordersService.updateStep(
        declarationId,
        'documentsPreparation', // Use the correct step ID
        existingStep?.status ?? StepStatus.PENDING, // Keep current status, `checkAndCompleteStep1` will override if needed
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

    // 4. احفظ الملف في قاعدة البيانات
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

    // استخدم ordersService.saveDeclaration الذي لديك
    await this.ordersService.saveDeclaration(declarationId, { steps });

    // بعد التحديث حاول اكتمال الخطوة
    await this.checkAndCompleteStep1(declarationId, userId);
  }

  // saveStep1Answers
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

    const snapshot = declaration.questionnaireSnapshot ?? {};
    snapshot.step1Answers = {
      ...(snapshot.step1Answers ?? {}),
      ...answers,
    };

    await this.ordersService.saveDeclaration(declarationId, {
      questionnaireSnapshot: snapshot,
    });

    // حاول اكتمال الخطوة بعد حفظ الإجابات
    await this.checkAndCompleteStep1(declarationId, userId);
  }
}
