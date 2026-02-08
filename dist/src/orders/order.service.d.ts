import { Repository, DataSource } from 'typeorm';
import { TaxDeclaration, DeclarationStatus } from './tax-declaration.entity';
import { UsersService } from '../users/users.service';
import { User } from '../users/user.entity';
import { PricingService } from 'src/pricing/pricing.service';
import { Pricing } from 'src/pricing/pricing.entity';
import { Step } from '../types/steps';
import { StepStatus } from '../types/steps';
export declare class OrdersService {
    declarationsRepository: Repository<TaxDeclaration>;
    private usersService;
    private pricingService;
    private pricingRepository;
    private dataSource;
    constructor(declarationsRepository: Repository<TaxDeclaration>, usersService: UsersService, pricingService: PricingService, pricingRepository: Repository<Pricing>, dataSource: DataSource);
    private isStaff;
    getDefaultSteps(): Step[];
    findDeclarationById(declarationId: string, relations?: string[]): Promise<TaxDeclaration>;
    findOne(declarationId: string): Promise<TaxDeclaration>;
    findOrCreateDraft(userId: string): Promise<TaxDeclaration>;
    submitDraft(declarationId: string, user: User): Promise<TaxDeclaration>;
    setPricing(declarationId: string, adminUser: User, pricingData: {
        basePrice: number;
        surcharges: Record<string, number>;
        finalPrice: number;
    }): Promise<TaxDeclaration>;
    acceptPricing(declarationId: string, userId: string): Promise<TaxDeclaration>;
    markAsPaid(declarationId: string): Promise<TaxDeclaration>;
    markAsCompleted(declarationId: string, adminId: string): Promise<TaxDeclaration>;
    linkDeclarationToUser(userId: string, tempDeclarationId: string): Promise<void>;
    findAllByUserId(userId: string): Promise<TaxDeclaration[]>;
    createDeclarationFromPricing(pricingId: string, userId: string): Promise<TaxDeclaration>;
    updateStep(declarationId: string, stepId: string, status: StepStatus, actorId: string, extra?: Record<string, any>): Promise<TaxDeclaration>;
    initStepsIfEmpty(declarationId: string): Promise<TaxDeclaration>;
    confirmDownloadByUser(declarationId: string, stepId: string, userId: string, fileId?: string): Promise<TaxDeclaration>;
    saveDeclaration(declarationId: string, partial: Partial<TaxDeclaration>): Promise<TaxDeclaration | null>;
    addAdminFileToStep(declarationId: string, stepId: string, fileId: string): Promise<void>;
    getCountsByCurrentStep(): Promise<Record<string, number>>;
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
    assignDeclarationsToAdmin(declarationIds: string[], adminId: string, assignedById: string, note?: string): Promise<TaxDeclaration[]>;
    confirmStep1(declarationId: string, userId: string): Promise<{
        ok: boolean;
    }>;
}
