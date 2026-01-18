import { ClientProfile } from '../users/client-profile.entity';
import { Pricing } from '../pricing/pricing.entity';
export declare class TaxFiling {
    id: string;
    clientProfile: ClientProfile;
    pricing: Pricing;
    status: string;
    assignedTo: string;
    createdAt: Date;
    updatedAt: Date;
}
