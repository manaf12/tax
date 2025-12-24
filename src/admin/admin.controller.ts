/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminService } from './admin.service';
import { TaxDeclaration } from '../orders/tax-declaration.entity';
import { AdminGuard } from 'src/auth/admin.guard';
import { User } from '../auth/user.decorator';
import { FilesService } from 'src/files/files.service';
import { FileInterceptor } from '@nestjs/platform-express';
import * as multer from 'multer';
import type { File as MulterFile } from 'multer';
import { Step, StepStatus } from 'src/types/steps';
import { RolesGuard } from 'src/auth/roles.guard';
import { UserRole } from 'src/users/user.entity';
import { Roles } from 'src/auth/roles.decorator';
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
   * @param declarationId
   */
  @Patch(':declarationId/complete')
  async completeDeclaration(
    @Param('declarationId') declarationId: string,
    @User('sub') adminId: string,
  ): Promise<TaxDeclaration> {
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
    body: { status: Step; note?: string },
  ): Promise<TaxDeclaration> {
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
    @Body('documentType') documentType: string,
    @Body('stepId') stepId?: string, // <--- جديد
  ) {
    const savedFile = await this.filesService.uploadFile(
      adminId,
      declarationId,
      file,
      documentType,
      true,
      stepId,
    );
    return {
      id: savedFile.id,
      originalName: savedFile.originalName,
      createdAt: savedFile.uploadedAt ?? savedFile.uploadedAt,
    };
  }
  @Patch(':declarationId/steps/:stepId/complete')
  async completeAdminStep(
    @Param('declarationId', ParseUUIDPipe) declarationId: string,
    @Param('stepId') stepId: string,
    @User('sub') adminId: string,
    @Body() body?: { note?: string },
  ): Promise<TaxDeclaration> {
    const meta = body?.note ? { note: body.note } : undefined;

    return this.adminService.updateDeclarationStep(
      declarationId,
      adminId,
      stepId,
      StepStatus.DONE,
      meta,
    );
  }
  @Post(':declarationId/step3-upload-draft') // <--- مسار جديد ومختلف
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @UseInterceptors(FileInterceptor('file'))
  async uploadStep3Draft(
    @Param('declarationId') declarationId: string,
    @UploadedFile() file: MulterFile,
    @User('sub') adminId: string,
  ) {
    if (!file) throw new BadRequestException('File not provided.');
    return this.filesService.uploadDraftForReviewStep(
      adminId,
      declarationId,
      file,
    );
  }
}
