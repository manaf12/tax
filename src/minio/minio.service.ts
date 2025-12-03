/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  Injectable,
  Logger,
  InternalServerErrorException,
} from '@nestjs/common';
import { Client } from 'minio';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class MinioService {
  private readonly logger = new Logger(MinioService.name);
  private readonly minioClient: Client;
  private readonly bucketName: string;

  constructor(private configService: ConfigService) {
    this.bucketName = this.configService.get<string>(
      'MINIO_BUCKET_NAME',
      'swisstax-files',
    );
    const endPoint = this.configService.get<string>(
      'MINIO_ENDPOINT',
      'localhost',
    );
    const portRaw = this.configService.get<string | number>('MINIO_PORT', 9000);
    const useSSLRaw = this.configService.get<string | boolean>(
      'MINIO_USE_SSL',
      false,
    );
    const accessKey = this.configService.get<string>(
      'MINIO_ACCESS_KEY',
      'minioadmin',
    );
    const secretKey = this.configService.get<string>(
      'MINIO_SECRET_KEY',
      'minioadmin',
    );

    // تحويل port إلى number
    const port = typeof portRaw === 'string' ? parseInt(portRaw, 10) : portRaw;
    if (Number.isNaN(port)) {
      throw new InternalServerErrorException(
        'MINIO_PORT is not a valid number',
      );
    }

    // تحويل useSSL إلى boolean — نقبل: true | 'true' | '1' => true
    const useSSL =
      useSSLRaw === true ||
      (typeof useSSLRaw === 'string' &&
        ['true', '1', 'yes'].includes(useSSLRaw.toLowerCase()));

    this.logger.log(
      `MinIO config: endpoint=${endPoint}, port=${port}, useSSL=${useSSL}`,
    );

    this.minioClient = new Client({
      endPoint,
      port,
      useSSL,
      accessKey,
      secretKey,
    });

    this.ensureBucketExists();
  }

  private async ensureBucketExists() {
    try {
      const exists = await this.minioClient.bucketExists(this.bucketName);
      if (!exists) {
        await this.minioClient.makeBucket(this.bucketName, 'us-east-1');
        this.logger.log(
          `MinIO Bucket '${this.bucketName}' created successfully.`,
        );
      } else {
        this.logger.log(`MinIO Bucket '${this.bucketName}' already exists.`);
      }
    } catch (error) {
      this.logger.error('Failed to ensure MinIO bucket exists', error);
      throw new InternalServerErrorException('MinIO initialization failed.');
    }
  }

  /**
   * يرفع ملفًا إلى MinIO
   * @param objectName اسم الملف في MinIO
   * @param buffer محتوى الملف كـ Buffer
   * @param mimeType نوع الملف
   * @returns اسم الملف الذي تم تخزينه
   */
  async uploadFile(
    objectName: string,
    buffer: Buffer,
    mimeType: string,
  ): Promise<string> {
    try {
      // 1. تعريف كائن البيانات الوصفية (metadata)
      const metaData = {
        'Content-Type': mimeType,
      };

      // 2. استدعاء الدالة بالشكل الصحيح مرة واحدة فقط
      await this.minioClient.putObject(
        this.bucketName,
        objectName,
        buffer,
        buffer.length, // المعامل الرابع: حجم الملف (رقم)
        metaData, // المعامل الخامس: البيانات الوصفية (كائن)
      );

      return objectName;
    } catch (error) {
      this.logger.error(`Failed to upload file ${objectName}`, error);
      throw new InternalServerErrorException('File upload failed.');
    }
  }

  /**
   * ينشئ رابطًا مؤقتًا آمنًا لتنزيل الملف
   * @param objectName اسم الملف في MinIO
   * @param expiry صلاحية الرابط بالثواني (افتراضي 7 أيام)
   * @returns رابط التنزيل المؤقت
   */
  async getPresignedUrl(
    objectName: string,
    expiry: number = 60 * 60 * 24 * 7,
  ): Promise<string> {
    try {
      const url = await this.minioClient.presignedGetObject(
        this.bucketName,
        objectName,
        expiry,
      );
      return url;
    } catch (error) {
      this.logger.error(`Failed to get presigned URL for ${objectName}`, error);
      throw new InternalServerErrorException(
        'Failed to generate download link.',
      );
    }
  }
}
