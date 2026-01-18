import { TaxDeclaration } from '../orders/tax-declaration.entity';
import { QuestionnaireResponse } from '../questionnaire/questionnaire-response.entity';
import { PricingStatus } from './pricing-status.enum';
export declare class Pricing {
    id: string;
    questionnaireResponse?: QuestionnaireResponse;
    declaration?: TaxDeclaration;
    basePrice: number;
    surcharges: Record<string, number>;
    finalPrice: number;
    status: PricingStatus;
    calculatedAt: Date;
}
