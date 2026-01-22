import { Repository } from 'typeorm';
import { File } from './file.entity';
import { File as MulterFile } from 'multer';
import { OrdersService } from 'src/orders/order.service';
import { MinioService } from 'src/minio/minio.service';
import { ClamAVService } from 'src/clamav/clamav.service';
import { UsersService } from 'src/users/users.service';
export declare class FilesService {
    private filesRepository;
    private ordersService;
    private minioService;
    private userService;
    private clamAVService;
    constructor(filesRepository: Repository<File>, ordersService: OrdersService, minioService: MinioService, userService: UsersService, clamAVService: ClamAVService);
    private saveFileToStorage;
    uploadFile(userId: string, declarationId: string, file: MulterFile, documentType: string, actorIsAdmin?: boolean, deliveredForStep?: string): Promise<File>;
    getFileUrl(fileId: string, requestingUserId: string): Promise<string>;
    uploadMultipleFiles(userId: string, declarationId: string, files: MulterFile[], documentType: string): Promise<{
        saved: File[];
        failed: {
            fileName: string;
            reason: any;
        }[];
    }>;
    uploadDraftForReviewStep(adminId: string, declarationId: string, file: MulterFile): Promise<File>;
    markDocumentMissing(userId: string, declarationId: string, documentType: string, reason?: string): Promise<void>;
    unmarkDocumentMissing(userId: string, declarationId: string, documentType: string): Promise<{
        ok: boolean;
    }>;
    saveStep1Answers(userId: string, declarationId: string, answers: Record<string, any>): Promise<void>;
    getStep1Answers(userId: string, roles: string[], declarationId: string): Promise<any>;
    deleteFile(userId: string, fileId: string): Promise<void>;
    private reopenStep1IfConfirmed;
    private ensureStep1Started;
    private ensureStep1Editable;
}
