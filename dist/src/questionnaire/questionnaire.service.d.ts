import { Repository } from 'typeorm';
import { QuestionnaireResponse } from './questionnaire-response.entity';
import { OrdersService } from 'src/orders/order.service';
import { UsersService } from 'src/users/users.service';
import { Pricing } from 'src/pricing/pricing.entity';
import { TaxDeclaration } from 'src/orders/tax-declaration.entity';
import { PricingService } from 'src/pricing/pricing.service';
export declare class QuestionnaireService {
    private responseRepository;
    private pricingRepository;
    private declarationsRepository;
    private ordersService;
    private usersService;
    private readonly pricingService;
    constructor(responseRepository: Repository<QuestionnaireResponse>, pricingRepository: Repository<Pricing>, declarationsRepository: Repository<TaxDeclaration>, ordersService: OrdersService, usersService: UsersService, pricingService: PricingService);
    startQuestionnaire(userId: string, forceNew?: boolean): Promise<QuestionnaireResponse>;
    saveStep(questionnaireId: string, stepData: Record<string, any>, userId?: string): Promise<QuestionnaireResponse>;
    getResponseByDeclarationId(declarationId: string): Promise<QuestionnaireResponse | null>;
    getResponseById(questionnaireId: string): Promise<QuestionnaireResponse | null>;
    finalizeQuestionnaire(questionnaireId: string, userId: string, offer: string, billing?: {
        firstName?: string;
        lastName?: string;
        street?: string;
        postalCode?: string;
        city?: string;
    }): Promise<QuestionnaireResponse>;
    createTempDeclaration(answers: any): Promise<{
        declaration: TaxDeclaration;
        token: string;
    }>;
    createStandaloneResponse(): Promise<QuestionnaireResponse>;
    claimAnonymous(token: string, userId: string): Promise<{
        questionnaire: QuestionnaireResponse;
        declaration: TaxDeclaration | null;
    }>;
    createTempDeclarationFromResponse(questionnaireId: string): Promise<{
        declaration: TaxDeclaration;
        token: string;
    }>;
}
