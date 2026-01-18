/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  Controller,
  Post,
  Get,
  Param,
  UploadedFile,
  UseInterceptors,
  UseGuards,
  ParseUUIDPipe,
  NotFoundException,
  BadRequestException,
  UploadedFiles,
  Body,
  Delete,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { FilesService } from './files.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { File as MulterFile } from 'multer';
import { User } from '../auth/user.decorator';
import { File } from './file.entity';
import * as multer from 'multer';

@Controller('files')
@UseGuards(JwtAuthGuard)
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Post(':declarationId/upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: multer.memoryStorage(),
      fileFilter: (req, file, cb) => {
        if (file.mimetype !== 'application/pdf')
          return cb(new BadRequestException('Only PDFs allowed'), false);
        cb(null, true);
      },
      limits: {
        fileSize: 1 * 1024 * 1024,
      },
    }),
  )
  async uploadFile(
    @Param('declarationId') declarationId: string,
    @UploadedFile() file: MulterFile,
    @User('sub') userId: string,
    @Body('documentType') documentType: string,
    @Body('deliveredForStep') deliveredForStep?: string,
  ): Promise<File> {
    if (!file) {
      throw new NotFoundException('File not provided in the request.');
    }
    return this.filesService.uploadFile(
      userId,
      declarationId,
      file,
      documentType,
      false,
      deliveredForStep,
    );
  }

  @Get(':fileId/url')
  async getFileUrl(
    @Param('fileId', ParseUUIDPipe) fileId: string,
    @User('sub') userId: string,
  ) {
    const url = await this.filesService.getFileUrl(fileId, userId);
    return { url };
  }
  @Post(':declarationId/upload-multiple')
  @UseInterceptors(
    FilesInterceptor('files', 30, {
      storage: multer.memoryStorage(),
      fileFilter: (req, file, cb) => {
        // قبول PDF فقط
        if (file.mimetype !== 'application/pdf') {
          return cb(new BadRequestException('Only PDF files allowed'), false);
        }
        cb(null, true);
      },
      limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    }),
  )
  async uploadMultiple(
    @Param('declarationId') declarationId: string,
    @UploadedFiles() files: MulterFile[],
    @User('sub') userId: string,
    @Body('documentType') documentType: string,
  ) {
    return this.filesService.uploadMultipleFiles(
      userId,
      declarationId,
      files,
      documentType,
    );
  }
  @Post(':declarationId/documents/:docType/missing')
  async markMissing(
    @Param('declarationId', ParseUUIDPipe) declarationId: string,
    @Param('docType') docType: string,
    @User('sub') userId: string,
    @Body() body: { reason?: string },
  ) {
    await this.filesService.markDocumentMissing(
      userId,
      declarationId,
      docType,
      body?.reason,
    );
    return { ok: true };
  }

  // POST /files/:declarationId/step1/answers
  @Post(':declarationId/step1/answers')
  async saveStep1Answers(
    @Param('declarationId', ParseUUIDPipe) declarationId: string,
    @User('sub') userId: string,
    @Body() body: { answers: Record<string, any> },
  ) {
    if (!body?.answers || typeof body.answers !== 'object') {
      throw new BadRequestException('Answers payload is required.');
    }
    await this.filesService.saveStep1Answers(
      userId,
      declarationId,
      body.answers,
    );
    return { ok: true };
  }
  @Delete(':declarationId/documents/:docType/missing')
  async unmarkMissing(
    @Param('declarationId', ParseUUIDPipe) declarationId: string,
    @Param('docType') docType: string,
    @User('sub') userId: string,
  ) {
    await this.filesService.unmarkDocumentMissing(
      userId,
      declarationId,
      docType,
    );
    return { ok: true };
  }
  @Get(':declarationId/step1/answers')
  async getStep1Answers(
    @Param('declarationId', ParseUUIDPipe) declarationId: string,
    @User('sub') userId: string,
    @User('roles') roles: string[] = [],
  ) {
    const answers = await this.filesService.getStep1Answers(
      userId,
      roles,
      declarationId,
    );
    return { answers };
  }
  @Delete(':fileId')
  async deleteFile(
    @Param('fileId', ParseUUIDPipe) fileId: string,
    @User('sub') userId: string,
  ) {
    await this.filesService.deleteFile(userId, fileId);
    return { ok: true };
  }
}
