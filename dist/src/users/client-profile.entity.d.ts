import { User } from './user.entity';
import { TaxDeclaration } from '../orders/tax-declaration.entity';
export declare class ClientProfile {
    id: string;
    firstName: string;
    lastName: string;
    canton: string;
    streetAddress: string;
    postalCode: string;
    city: string;
    languagePreference: string;
    user: User;
    declarations: TaxDeclaration[];
}
