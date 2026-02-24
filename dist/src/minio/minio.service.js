"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var MinioService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MinioService = void 0;
const common_1 = require("@nestjs/common");
const minio_1 = require("minio");
const config_1 = require("@nestjs/config");
let MinioService = MinioService_1 = class MinioService {
    configService;
    logger = new common_1.Logger(MinioService_1.name);
    minioClient;
    bucketName;
    publicHost;
    publicPort;
    publicUseSSL;
    accessKey;
    secretKey;
    useSSL;
    internalEndpoint;
    internalPort;
    constructor(configService) {
        this.configService = configService;
        this.bucketName = this.configService.get('MINIO_BUCKET_NAME', 'swisstax-files');
        if (!this.bucketName) {
            throw new common_1.InternalServerErrorException('MINIO_BUCKET_NAME is not defined in .env');
        }
        const endPoint = this.configService.get('MINIO_ENDPOINT');
        const portRaw = this.configService.get('MINIO_PORT');
        const useSSLRaw = this.configService.get('MINIO_USE_SSL');
        const accessKey = this.configService.get('MINIO_ROOT_USER');
        const secretKey = this.configService.get('MINIO_ROOT_PASSWORD');
        if (!endPoint || !portRaw || !accessKey || !secretKey || !useSSLRaw) {
            throw new common_1.InternalServerErrorException('One or more required MinIO internal environment variables are missing.');
        }
        const port = parseInt(portRaw, 10);
        if (Number.isNaN(port)) {
            throw new common_1.InternalServerErrorException('MINIO_PORT is not a valid number');
        }
        this.internalEndpoint = endPoint;
        this.internalPort = port;
        this.useSSL = ['true', '1'].includes(useSSLRaw);
        this.accessKey = accessKey;
        this.secretKey = secretKey;
        this.minioClient = new minio_1.Client({
            endPoint: this.internalEndpoint,
            port: this.internalPort,
            useSSL: this.useSSL,
            accessKey: this.accessKey,
            secretKey: this.secretKey,
        });
        const publicHostFromEnv = this.configService.get('MINIO_PUBLIC_HOST');
        const publicPortRaw = this.configService.get('MINIO_PUBLIC_PORT');
        const publicUseSSLRaw = this.configService.get('MINIO_PUBLIC_USE_SSL', 'true');
        if (!publicHostFromEnv || !publicPortRaw) {
            throw new common_1.InternalServerErrorException('MINIO_PUBLIC_HOST or MINIO_PUBLIC_PORT is not defined in .env file. These are required to generate public URLs.');
        }
        const publicPort = parseInt(publicPortRaw, 10);
        if (Number.isNaN(publicPort)) {
            throw new common_1.InternalServerErrorException('MINIO_PUBLIC_PORT is not a valid number');
        }
        this.publicHost = publicHostFromEnv;
        this.publicPort = publicPort;
        this.publicUseSSL = ['true', '1'].includes(publicUseSSLRaw);
    }
    async uploadFile(objectName, buffer, mimeType) {
        try {
            const metaData = {
                'Content-Type': mimeType,
            };
            await this.minioClient.putObject(this.bucketName, objectName, buffer, buffer.length, metaData);
            return objectName;
        }
        catch (error) {
            this.logger.error(`Failed to upload file ${objectName}`, error);
            throw new common_1.InternalServerErrorException('File upload failed.');
        }
    }
    async getPresignedUrl(objectName, expiry = 60 * 60 * 24 * 7) {
        try {
            const publicUrlClient = new minio_1.Client({
                endPoint: this.publicHost,
                port: this.publicPort,
                useSSL: this.publicUseSSL,
                accessKey: this.accessKey,
                secretKey: this.secretKey,
            });
            const publicUrl = await publicUrlClient.presignedGetObject(this.bucketName, objectName, expiry);
            this.logger.log(`Final Public URL with correct signature: ${publicUrl}`);
            return publicUrl;
        }
        catch (error) {
            this.logger.error(`FATAL ERROR: Failed to get presigned URL. Root cause:`, error.message, error.stack);
            throw new common_1.InternalServerErrorException(`Failed to generate download link. Please check your MINIO_ACCESS_KEY and MINIO_SECRET_KEY.`);
        }
    }
    async objectExists(objectName) {
        try {
            await this.minioClient.statObject(this.bucketName, objectName);
            return true;
        }
        catch (e) {
            return false;
        }
    }
    async onModuleInit() {
        try {
            const exists = await this.minioClient.bucketExists(this.bucketName);
            if (!exists) {
                await this.minioClient.makeBucket(this.bucketName, 'us-east-1');
                this.logger.log(`MinIO Bucket '${this.bucketName}' created successfully.`);
            }
            else {
                this.logger.log(`MinIO Bucket '${this.bucketName}' already exists.`);
            }
        }
        catch (error) {
            this.logger.error('Failed to ensure MinIO bucket exists', error);
            throw new Error('MinIO initialization failed: Could not connect or create bucket.');
        }
    }
    async removeFile(objectName) {
        try {
            await this.minioClient.removeObject(this.bucketName, objectName);
        }
        catch (error) {
            this.logger.error(`Failed to remove object ${objectName}`, error);
            throw new common_1.InternalServerErrorException('Failed to delete file from storage.');
        }
    }
};
exports.MinioService = MinioService;
exports.MinioService = MinioService = MinioService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], MinioService);
//# sourceMappingURL=minio.service.js.map