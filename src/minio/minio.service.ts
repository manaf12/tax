/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import {
  Injectable,
  Logger,
  InternalServerErrorException,
  OnModuleInit,
} from '@nestjs/common';
import { Client } from 'minio';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class MinioService implements OnModuleInit {
  private readonly logger = new Logger(MinioService.name);
  private readonly minioClient: Client;
  private readonly bucketName: string;

  // الخصائص العامة (للمتصفح)
  private readonly publicHost: string;
  private readonly publicPort: number;
  private readonly publicUseSSL: boolean; // ✅ NEW

  // الخصائص السرية (للتوقيع)
  private readonly accessKey: string;
  private readonly secretKey: string;

  // خصائص الاتصال الداخلي
  private readonly useSSL: boolean;
  private readonly internalEndpoint: string;
  private readonly internalPort: number;

  constructor(private configService: ConfigService) {
    // --- 1. قراءة وتخزين اسم الـ Bucket ---
    this.bucketName = this.configService.get<string>(
      'MINIO_BUCKET_NAME',
      'swisstax-files',
    );
    if (!this.bucketName) {
      throw new InternalServerErrorException(
        'MINIO_BUCKET_NAME is not defined in .env',
      );
    }

    // --- 2. قراءة المتغيرات الداخلية والسرية والتحقق منها ---
    const endPoint = this.configService.get<string>('MINIO_ENDPOINT');
    const portRaw = this.configService.get<string>('MINIO_PORT');
    const useSSLRaw = this.configService.get<string>('MINIO_USE_SSL');
    // const accessKey = this.configService.get<string>('MINIO_ROOT_USER');
    // const secretKey = this.configService.get<string>('MINIO_ROOT_PASSWORD');
    const accessKey = this.configService.get<string>('MINIO_ACCESS_KEY');
    const secretKey = this.configService.get<string>('MINIO_SECRET_KEY');
    if (!endPoint || !portRaw || !accessKey || !secretKey || !useSSLRaw) {
      throw new InternalServerErrorException(
        'One or more required MinIO internal environment variables are missing.',
      );
    }

    // --- 3. تحويل وتخزين القيم الداخلية ---
    const port = parseInt(portRaw, 10);
    if (Number.isNaN(port)) {
      throw new InternalServerErrorException(
        'MINIO_PORT is not a valid number',
      );
    }

    this.internalEndpoint = endPoint;
    this.internalPort = port;
    this.useSSL = ['true', '1'].includes(useSSLRaw);
    this.accessKey = accessKey;
    this.secretKey = secretKey;

    // --- 4. إنشاء العميل الداخلي ---
    this.minioClient = new Client({
      endPoint: this.internalEndpoint,
      port: this.internalPort,
      useSSL: this.useSSL,
      accessKey: this.accessKey,
      secretKey: this.secretKey,
    });

    // --- 5. قراءة وتخزين الإعدادات العامة (للمتصفح) ---
    const publicHostFromEnv =
      this.configService.get<string>('MINIO_PUBLIC_HOST');
    const publicPortRaw = this.configService.get<string>('MINIO_PUBLIC_PORT');

    // ✅ NEW: قراءة MINIO_PUBLIC_USE_SSL (مع default = 'true')
    const publicUseSSLRaw = this.configService.get<string>(
      'MINIO_PUBLIC_USE_SSL',
      'true',
    );

    if (!publicHostFromEnv || !publicPortRaw) {
      throw new InternalServerErrorException(
        'MINIO_PUBLIC_HOST or MINIO_PUBLIC_PORT is not defined in .env file. These are required to generate public URLs.',
      );
    }

    const publicPort = parseInt(publicPortRaw, 10);
    if (Number.isNaN(publicPort)) {
      throw new InternalServerErrorException(
        'MINIO_PUBLIC_PORT is not a valid number',
      );
    }

    this.publicHost = publicHostFromEnv;
    this.publicPort = publicPort;

    // ✅ NEW: تحويل وتخزين public useSSL
    this.publicUseSSL = ['true', '1'].includes(publicUseSSLRaw);
  }

  async uploadFile(
    objectName: string,
    buffer: Buffer,
    mimeType: string,
  ): Promise<string> {
    try {
      const metaData = {
        'Content-Type': mimeType,
      };

      await this.minioClient.putObject(
        this.bucketName,
        objectName,
        buffer,
        buffer.length,
        metaData,
      );

      return objectName;
    } catch (error) {
      this.logger.error(`Failed to upload file ${objectName}`, error);
      throw new InternalServerErrorException('File upload failed.');
    }
  }

  async getPresignedUrl(
    objectName: string,
    expiry: number = 60 * 60 * 24 * 7,
  ): Promise<string> {
    try {
      // ✅ هنا التعديل الأساسي: useSSL يجب أن يأتي من MINIO_PUBLIC_USE_SSL
      const publicUrlClient = new Client({
        endPoint: this.publicHost,
        port: this.publicPort,
        useSSL: this.publicUseSSL, // ✅ CHANGED (was this.useSSL)
        accessKey: this.accessKey,
        secretKey: this.secretKey,
      });

      const publicUrl = await publicUrlClient.presignedGetObject(
        this.bucketName,
        objectName,
        expiry,
      );

      this.logger.log(`Final Public URL with correct signature: ${publicUrl}`);
      return publicUrl;
    } catch (error) {
      this.logger.error(
        `FATAL ERROR: Failed to get presigned URL. Root cause:`,
        error.message,
        error.stack,
      );
      throw new InternalServerErrorException(
        `Failed to generate download link. Please check your MINIO_ACCESS_KEY and MINIO_SECRET_KEY.`,
      );
    }
  }

  async objectExists(objectName: string): Promise<boolean> {
    try {
      await this.minioClient.statObject(this.bucketName, objectName);
      return true;
    } catch (e) {
      return false;
    }
  }

  async onModuleInit() {
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
      throw new Error(
        'MinIO initialization failed: Could not connect or create bucket.',
      );
    }
  }

  async removeFile(objectName: string): Promise<void> {
    try {
      await this.minioClient.removeObject(this.bucketName, objectName);
    } catch (error) {
      this.logger.error(`Failed to remove object ${objectName}`, error);
      throw new InternalServerErrorException(
        'Failed to delete file from storage.',
      );
    }
  }
}
