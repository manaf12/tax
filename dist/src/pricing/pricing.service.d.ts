import { Repository } from 'typeorm';
import { Pricing } from './pricing.entity';
import { QuestionnaireService } from '../questionnaire/questionnaire.service';
import { NotificationsService } from '../notifications/notifications.service';
import { OrdersService } from '../orders/order.service';
import { TaxDeclaration, OfferType } from 'src/orders/tax-declaration.entity';
export declare class PricingService {
    private pricingRepository;
    private orderService;
    private questionnaireService;
    private notificationsService;
    constructor(pricingRepository: Repository<Pricing>, orderService: OrdersService, questionnaireService: QuestionnaireService, notificationsService: NotificationsService);
    calculatePrice(questionnaireData: Record<string, any>, offer: OfferType): {
        basePrice: number;
        surcharges: Record<string, number | string>;
        finalPrice: number;
    };
    calculatePricing(userId: string, declarationId: string): Promise<Pricing>;
    acceptPricing(userId: string, pricingId: string): Promise<TaxDeclaration>;
    getPricingByDeclarationId(declarationId: string): Promise<Pricing | null>;
    createOrUpdatePricing(declaration: TaxDeclaration, pricingData: {
        basePrice: number;
        surcharges: Record<string, number>;
        finalPrice: number;
    }): Promise<Pricing>;
    calculateForQuestionnaire(questionnaireId: string, offer: OfferType): Promise<Pricing>;
    calculateAllPricesForQuestionnaire(questionnaireId: string): Promise<{
        standard: number;
        premium: number;
        confort: number;
    }>;
}
