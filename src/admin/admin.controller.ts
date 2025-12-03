/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard'; // استخدام حارس JWT مؤقتًا
import { AdminService } from './admin.service';
import { TaxDeclaration } from '../orders/tax-declaration.entity';
import { AdminGuard } from 'src/auth/admin.guard';
import { User } from '../auth/user.decorator'; // يجب أن يكون لديك هذا الديكوراتور
import { FilesService } from 'src/files/files.service';
import { FileInterceptor } from '@nestjs/platform-express';
import * as multer from 'multer';
import type { File as MulterFile } from 'multer';
// يجب استخدام AdminGuard هنا للتحقق من دور المسؤول
@UseGuards(JwtAuthGuard, AdminGuard)
@Controller('admin/declarations')
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly filesService: FilesService,
  ) {}

  @Get('paid')
  async getPaidDeclarations(): Promise<TaxDeclaration[]> {
    return this.adminService.getPaidDeclarations();
  }

  /**
   * [المرحلة 6] تغيير حالة إقرار إلى "مكتمل".
   * @param declarationId معرف الإقرار
   */
  @Patch(':declarationId/complete')
  async completeDeclaration(
    @Param('declarationId') declarationId: string,
    @User('sub') adminId: string, // استخراج معرف المستخدم (Admin ID) من الـ JWT
  ): Promise<TaxDeclaration> {
    // تمرير معرف المسؤول إلى الخدمة
    return this.adminService.completeDeclaration(declarationId, adminId);
  }
  @Get(':declarationId')
  async getDeclarationDetails(
    @Param('declarationId') declarationId: string,
  ): Promise<TaxDeclaration> {
    return this.adminService.getDeclarationDetailsForAdmin(declarationId);
  }
  @Patch(':declarationId/review')
  async reviewDeclaration(
    @Param('declarationId') declarationId: string,
    @User('sub') adminId: string,
    @Body()
    body: { status: 'DONE' | 'IN_PROGRESS' | 'REJECTED'; note?: string },
  ): Promise<TaxDeclaration> {
    // استخدم الخدمة لإجراء التحديث
    return this.adminService.reviewDeclaration(
      declarationId,
      adminId,
      body.status,
      body.note,
    );
  }
  @Post(':declarationId/upload-draft')
  @UseInterceptors(FileInterceptor('file', { storage: multer.memoryStorage() }))
  async uploadDraft(
    @Param('declarationId') declarationId: string,
    @UploadedFile() file: MulterFile,
    @User('sub') adminId: string,
  ) {
    // pass actorIsAdmin = true
    const savedFile = await this.filesService.uploadFile(
      adminId,
      declarationId,
      file,
      true,
    );
    // لا تُرجع الـ declaration كامل لتجنب circular JSON — أعد DTO بسيط
    return {
      id: savedFile.id,
      originalName: savedFile.originalName,
      createdAt: savedFile.uploadedAt,
      // لعرض رابط تحميل اطلب endpoint /files/:fileId/url
    };
  }
}
