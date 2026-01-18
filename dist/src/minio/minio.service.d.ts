import { OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
export declare class MinioService implements OnModuleInit {
    private configService;
    private readonly logger;
    private readonly minioClient;
    private readonly bucketName;
    private readonly publicHost;
    private readonly publicPort;
    private readonly accessKey;
    private readonly secretKey;
    private readonly useSSL;
    private readonly internalEndpoint;
    private readonly internalPort;
    constructor(configService: ConfigService);
    uploadFile(objectName: string, buffer: Buffer, mimeType: string): Promise<string>;
    getPresignedUrl(objectName: string, expiry?: number): Promise<string>;
    objectExists(objectName: string): Promise<boolean>;
    onModuleInit(): Promise<void>;
    removeFile(objectName: string): Promise<void>;
}
