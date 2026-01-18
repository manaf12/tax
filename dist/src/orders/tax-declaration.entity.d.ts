import { ClientProfile } from '../users/client-profile.entity';
import { File } from '../files/file.entity';
import { Pricing } from '../pricing/pricing.entity';
import { Payment } from 'src/payment/payment.entity';
import { Step } from '../types/steps';
export declare enum DeclarationStatus {
    DRAFT = "DRAFT",
    PENDING_PRICING = "PENDING_PRICING",
    PRICING_ACCEPTED = "PRICING_ACCEPTED",
    PENDING_PAYMENT = "PENDING_PAYMENT",
    IN_REVIEW = "IN_REVIEW",
    COMPLETED = "COMPLETED",
    CANCELED = "CANCELED"
}
export declare enum OfferType {
    STANDARD = "Standard",
    PREMIUM = "Premium",
    CONFORT = "Confort"
}
export declare class TaxDeclaration {
    id: string;
    clientProfile: ClientProfile;
    offer: OfferType;
    steps: Step[];
    currentStep?: number;
    status: DeclarationStatus;
    questionnaireSnapshot?: Record<string, any>;
    questionnaireResponseId?: string;
    pricing?: Pricing;
    payments: Payment[];
    files: File[];
    createdAt: Date;
    updatedAt: Date;
    assignedAdminId?: string;
    assignedAt?: Date;
    assignedById?: string;
    assignmentHistory?: Array<{
        adminId: string;
        assignedById?: string;
        assignedAt: string;
        note?: string;
    }>;
}
