// src/minio/minio.module.ts

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config'; // MinioService depends on ConfigService
import { MinioService } from './minio.service';

@Module({
  imports: [ConfigModule], // Import ConfigModule here
  providers: [MinioService],
  exports: [MinioService], // Export MinioService so other modules (like FilesModule) can use it
})
export class MinioModule {}
