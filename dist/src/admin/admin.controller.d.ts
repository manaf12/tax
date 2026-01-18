import { UsersService } from 'src/users/users.service';
import { AdminService } from './admin.service';
import { TaxDeclaration } from '../orders/tax-declaration.entity';
import { FilesService } from 'src/files/files.service';
import type { File as MulterFile } from 'multer';
import { Step } from 'src/types/steps';
import { UserRole } from 'src/users/user.entity';
import { AssignDeclarationsDto } from './dto/assign-declarations.dto';
export declare class AdminController {
    private readonly adminService;
    private readonly filesService;
    private readonly usersService;
    constructor(adminService: AdminService, filesService: FilesService, usersService: UsersService);
    getPaidDeclarations(): Promise<TaxDeclaration[]>;
    completeDeclaration(declarationId: string, adminId: string): Promise<TaxDeclaration>;
    getDeclarationDetails(declarationId: string): Promise<TaxDeclaration>;
    reviewDeclaration(declarationId: string, adminId: string, body: {
        status: Step;
        note?: string;
    }): Promise<TaxDeclaration>;
    uploadDraft(declarationId: string, file: MulterFile, adminId: string, documentType: string, stepId?: string): Promise<{
        id: string;
        originalName: string;
        createdAt: Date;
    }>;
    completeAdminStep(declarationId: string, stepId: string, adminId: string, body?: {
        note?: string;
    }): Promise<TaxDeclaration>;
    uploadStep3Draft(declarationId: string, file: MulterFile, adminId: string): Promise<import("../files/file.entity").File>;
    assign(body: AssignDeclarationsDto, assignedById: string): Promise<{
        updatedCount: number;
        updated: TaxDeclaration[];
    }>;
    getStepStats(): Promise<Record<string, number>>;
    list(q: any, user: any): Promise<{
        items: TaxDeclaration[];
        total: number;
        page: number;
        perPage: number;
    }>;
    listAdmins(): Promise<{
        id: string;
        email: string;
        roles: UserRole[];
    }[]>;
}
