import { PricingService } from './pricing.service';
import { Pricing } from './pricing.entity';
import { OfferType, TaxDeclaration } from 'src/orders/tax-declaration.entity';
declare class CalculateDto {
    questionnaireId: string;
    offer: OfferType;
}
export declare class PricingController {
    private readonly pricingService;
    constructor(pricingService: PricingService);
    accept(userId: string, pricingId: string): Promise<TaxDeclaration>;
    calculateForQuestionnaire(body: CalculateDto): Promise<Pricing>;
    calculateAll(questionnaireId: string): Promise<{
        standard: number;
        premium: number;
        confort: number;
    }>;
}
export {};
