import { TaxDeclaration } from '../orders/tax-declaration.entity';
export declare enum PaymentStatus {
    PENDING = "PENDING",
    SUCCESS = "SUCCESS",
    FAILED = "FAILED",
    REFUNDED = "REFUNDED"
}
export declare class Payment {
    id: string;
    declaration: TaxDeclaration;
    amount: number;
    status: PaymentStatus;
    transactionId: string;
    providerData: Record<string, any>;
    createdAt: Date;
}
