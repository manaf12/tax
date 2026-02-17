import { Repository } from 'typeorm';
import { TaxDeclaration, DeclarationStatus } from '../orders/tax-declaration.entity';
import { OrdersService } from '../orders/order.service';
import { Step, StepStatus } from 'src/types/steps';
import { UsersService } from 'src/users/users.service';
import { EmailService } from 'src/email/email.service';
export declare class AdminService {
    private taxDeclarationRepository;
    private readonly ordersService;
    private readonly usersService;
    private readonly emailService;
    constructor(taxDeclarationRepository: Repository<TaxDeclaration>, ordersService: OrdersService, usersService: UsersService, emailService: EmailService);
    getPaidDeclarations(): Promise<TaxDeclaration[]>;
    completeDeclaration(declarationId: string, adminId: string): Promise<TaxDeclaration>;
    getDeclarationDetailsForAdmin(declarationId: string): Promise<TaxDeclaration>;
    reviewDeclaration(declarationId: string, adminId: string, status: Step, note?: string): Promise<TaxDeclaration>;
    updateDeclarationStep(declarationId: string, adminId: string, stepId: string, newStatus: StepStatus, meta?: Record<string, any>): Promise<TaxDeclaration>;
    assignDeclarations(declarationIds: string[], adminId: string, assignedById: string, note?: string): Promise<TaxDeclaration[]>;
    getStepCounters(): Promise<Record<string, number>>;
    listDeclarations(query: {
        page?: number;
        perPage?: number;
        status?: DeclarationStatus;
        currentStep?: number;
        assignedAdminId?: string;
        search?: string;
    }): Promise<{
        items: TaxDeclaration[];
        total: number;
        page: number;
        perPage: number;
    }>;
}
