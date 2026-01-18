import { Pricing } from 'src/pricing/pricing.entity';
import { ClientProfile } from '../users/client-profile.entity';
export declare class QuestionnaireResponse {
    id: string;
    pricing?: Pricing;
    data: Record<string, any>;
    status: string;
    clientProfile?: ClientProfile;
    createdAt: Date;
    updatedAt: Date;
    anonymousToken?: string;
    anonymousExpiresAt?: Date;
    isAnonymous?: boolean;
}
