import { OfferType } from 'src/orders/tax-declaration.entity';
declare class BillingDto {
    firstName?: string;
    lastName?: string;
    street?: string;
    postalCode?: string;
    city?: string;
}
export declare class FinalizeDto {
    offer: OfferType;
    billing?: BillingDto;
}
export {};
