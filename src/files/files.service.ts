/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */

import { Injectable, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { File } from './file.entity';
import { File as MulterFile } from 'multer';
import { OrdersService } from 'src/orders/order.service';
import { MinioService } from 'src/minio/minio.service';
import { ClamAVService } from 'src/clamav/clamav.service';

@Injectable()
export class FilesService {
  constructor(
    @InjectRepository(File)
    private filesRepository: Repository<File>,
    private ordersService: OrdersService,
    private minioService: MinioService,
    private clamAVService: ClamAVService,
  ) {}

  private async saveFileToStorage(file: MulterFile): Promise<string> {
    const uniqueFileName = `${Date.now()}-${file.originalname}`;
    const objectName = `files/${uniqueFileName}`;

    // استخدام MinioService لرفع الملف
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
    actorIsAdmin = false, // <-- جديد
  ): Promise<File> {
    const declaration =
      await this.ordersService.findDeclarationById(declarationId);

    // فقط تحقق من الملكية إذا ليس admin
    if (!actorIsAdmin && declaration.clientProfile.user.id !== userId) {
      throw new ForbiddenException('Access to this declaration is forbidden.');
    }

    // ... باقي منطق الفحص/رفع/حفظ كما عندك ...
    const storagePath = await this.saveFileToStorage(file);
    const fileEntity = this.filesRepository.create({
      originalName: file.originalname,
      storagePath,
      mimetype: file.mimetype,
      size: file.size,
      declaration,
    });
    const savedFile = await this.filesRepository.save(fileEntity);

    // تحديث steps (كما لديك) - إذا أردت تمييز نوع الملف (admin vs user) أضف حقل
    try {
      const decl = await this.ordersService.findDeclarationById(declarationId);
      const existing = decl.steps?.documentsUploaded?.files ?? [];
      // لو الرفع من الأدمن نحدّث adminUploads بدل documentsUploaded
      if (actorIsAdmin) {
        const existingAdmin = decl.steps?.adminUploads?.files ?? [];
        await this.ordersService.updateStep(
          declarationId,
          'adminUploads',
          'DONE',
          userId,
          { files: [...existingAdmin, savedFile.id] },
        );
      } else {
        await this.ordersService.updateStep(
          declarationId,
          'documentsUploaded',
          'PENDING',
          userId,
          { files: [...existing, savedFile.id] },
        );
      }
    } catch (err) {
      console.error('Failed to update steps after upload', err);
    }

    return savedFile;
  }

  async getFileUrl(fileId: string): Promise<string> {
    const file = await this.filesRepository.findOneBy({ id: fileId });
    if (!file) {
      throw new ForbiddenException('File not found.');
    }
    // استخدام MinioService لإنشاء رابط مؤقت
    return this.minioService.getPresignedUrl(file.storagePath);
  }
  async uploadMultipleFiles(
    userId: string,
    declarationId: string,
    files: MulterFile[],
  ): Promise<{ saved: File[]; failed: { fileName: string; reason: any }[] }> {
    const concurrency = 4;
    const savedFiles: File[] = [];
    const failed: { fileName: string; reason: any }[] = [];

    // batch processing
    for (let i = 0; i < files.length; i += concurrency) {
      const batch = files.slice(i, i + concurrency);
      const results = await Promise.allSettled(
        batch.map((f) => this.uploadFile(userId, declarationId, f)),
      );
      results.forEach((r, idx) => {
        if (r.status === 'fulfilled') savedFiles.push(r.value);
        else
          failed.push({ fileName: batch[idx].originalname, reason: r.reason });
      });
    }

    // تحديث الـ steps مرة واحدة
    try {
      const decl = await this.ordersService.findDeclarationById(declarationId);
      const existingFiles = decl.steps?.documentsUploaded?.files ?? [];
      await this.ordersService.updateStep(
        declarationId,
        'documentsUploaded',
        'PENDING',
        userId,
        { files: [...existingFiles, ...savedFiles.map((f) => f.id)] },
      );
    } catch (err) {
      console.error('Failed to update steps after upload', err);
    }

    return { saved: savedFiles, failed };
  }
}
