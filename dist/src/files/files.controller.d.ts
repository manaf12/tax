import { FilesService } from './files.service';
import { File as MulterFile } from 'multer';
import { File } from './file.entity';
export declare class FilesController {
    private readonly filesService;
    constructor(filesService: FilesService);
    uploadFile(declarationId: string, file: MulterFile, userId: string, documentType: string, deliveredForStep?: string): Promise<File>;
    getFileUrl(fileId: string, userId: string): Promise<{
        url: string;
    }>;
    uploadMultiple(declarationId: string, files: MulterFile[], userId: string, documentType: string): Promise<{
        saved: File[];
        failed: {
            fileName: string;
            reason: any;
        }[];
    }>;
    markMissing(declarationId: string, docType: string, userId: string, body: {
        reason?: string;
    }): Promise<{
        ok: boolean;
    }>;
    saveStep1Answers(declarationId: string, userId: string, body: {
        answers: Record<string, any>;
    }): Promise<{
        ok: boolean;
    }>;
    unmarkMissing(declarationId: string, docType: string, userId: string): Promise<{
        ok: boolean;
    }>;
    getStep1Answers(declarationId: string, userId: string, roles?: string[]): Promise<{
        answers: any;
    }>;
    deleteFile(fileId: string, userId: string): Promise<{
        ok: boolean;
    }>;
}
