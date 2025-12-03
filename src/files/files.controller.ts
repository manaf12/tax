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
        fileSize: 1 * 1024 * 1024, // 3dlon 3la hsab shu bytlob hon msahet l file
      },
    }),
  )
  async uploadFile(
    @Param('declarationId') declarationId: string,
    @UploadedFile() file: MulterFile,
    @User('sub') userId: string,
  ): Promise<File> {
    if (!file) {
      throw new NotFoundException('File not provided in the request.');
    }
    return this.filesService.uploadFile(userId, declarationId, file);
  }

  @Get(':fileId/url')
  async getFileUrl(
    @Param('fileId', ParseUUIDPipe) fileId: string,
  ): Promise<{ url: string }> {
    const url = await this.filesService.getFileUrl(fileId);
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
  ) {
    return this.filesService.uploadMultipleFiles(userId, declarationId, files);
  }
}
