/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */

import {
  Injectable,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { File } from './file.entity';
import { File as MulterFile } from 'multer';
import { OrdersService } from 'src/orders/order.service';
import { MinioService } from 'src/minio/minio.service';
import { ClamAVService } from 'src/clamav/clamav.service';
import { StepStatus } from 'src/types/steps'; // أو المسار الصحيح للمشروع
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
    const uniqueFileName = `${Date.now()}-${file.originalname}`;
    const objectName = `files/${uniqueFileName}`;

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

      const allMandatoryDocsUploaded = REQUIRED_DOCUMENT_TYPES.every(
        (docType) => uploadedDocTypes.has(docType),
      );

      if (allMandatoryDocsUploaded) {
        // 3. If yes, update the step status to COMPLETED
        await this.ordersService.updateStep(
          declarationId,
          'documentsPreparation', // The ID for Step 1
          StepStatus.DONE, // Use your enum for 'COMPLETED'
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
}
