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
  private readonly publicPort: number; // يجب أن يكون رقمًا

  // الخصائص السرية (للتوقيع)
  private readonly accessKey: string;
  private readonly secretKey: string;
  private readonly useSSL: boolean;
  private readonly internalEndpoint: string; // جديد
  private readonly internalPort: number; // جديد

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
    const portRaw = this.configService.get<string>('MINIO_PORT'); // قراءة كـ string فقط
    const useSSLRaw = this.configService.get<string>('MINIO_USE_SSL'); // قراءة كـ string فقط
    const accessKey = this.configService.get<string>('MINIO_ACCESS_KEY');
    const secretKey = this.configService.get<string>('MINIO_SECRET_KEY');

    if (!endPoint || !portRaw || !accessKey || !secretKey || !useSSLRaw) {
      throw new InternalServerErrorException(
        'One or more required MinIO internal environment variables are missing.',
      );
    }

    // --- 3. تحويل وتخزين القيم الداخلية ---
    const port = parseInt(portRaw, 10); // تحويل آمن بعد التحقق
    if (Number.isNaN(port)) {
      throw new InternalServerErrorException(
        'MINIO_PORT is not a valid number',
      );
    }
    this.internalEndpoint = endPoint; // تخزين نقطة النهاية الداخلية
    this.internalPort = port; // تخزين المنفذ الداخلي
    this.useSSL = ['true', '1'].includes(useSSLRaw); // تحويل آمن
    this.accessKey = accessKey;
    this.secretKey = secretKey;
    // --- 4. إنشاء العميل الداخلي ---
    this.minioClient = new Client({
      endPoint: this.internalEndpoint, // استخدام القيمة المخزنة
      port: this.internalPort, // استخدام القيمة المخزنة
      useSSL: this.useSSL,
      accessKey: this.accessKey,
      secretKey: this.secretKey,
    });

    // --- 5. قراءة وتخزين الإعدادات العامة (للمتصفح) ---
    const publicHostFromEnv =
      this.configService.get<string>('MINIO_PUBLIC_HOST');
    const publicPortRaw = this.configService.get<string>('MINIO_PUBLIC_PORT'); // قراءة كـ string فقط

    if (!publicHostFromEnv || !publicPortRaw) {
      throw new InternalServerErrorException(
        'MINIO_PUBLIC_HOST or MINIO_PUBLIC_PORT is not defined in .env file. These are required to generate public URLs.',
      );
    }

    // *** التصحيح الرئيسي: تحويل المنفذ العام إلى رقم صحيح ***
    const publicPort = parseInt(publicPortRaw, 10); // تحويل آمن بعد التحقق
    if (Number.isNaN(publicPort)) {
      throw new InternalServerErrorException(
        'MINIO_PUBLIC_PORT is not a valid number',
      );
    }

    this.publicHost = publicHostFromEnv;
    this.publicPort = publicPort; // تخزين القيمة المحولة إلى رقم

    // this.ensureBucketExists();
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
   * ينشئ رابطًا مؤقتًا آمنًا لتنزيل الملف، ويقوم بتصحيح المضيف يدوياً.
   * @param objectName اسم الملف في MinIO
   * @param expiry صلاحية الرابط بالثواني (افتراضي 7 أيام)
   * @returns رابط التنزيل المؤقت
   */
  async getPresignedUrl(
    objectName: string,
    expiry: number = 60 * 60 * 24 * 7,
  ): Promise<string> {
    try {
      // 1. إنشاء عميل MinIO مؤقت لغرض التوقيع فقط.
      // نستخدم إعدادات المضيف العام (192.168.1.7:9000) لضمان التوقيع الصحيح.
      // هذا لن يسبب ECONNREFUSED لأن 192.168.1.7 هو عنوان IP حقيقي.
      const publicUrlClient = new Client({
        endPoint: this.publicHost, // 192.168.1.7
        port: this.publicPort, // 9000
        useSSL: this.useSSL,
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
    // *** تغيير الاسم إلى onModuleInit ***
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
}
