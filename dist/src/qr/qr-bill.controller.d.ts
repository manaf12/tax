import type { Response } from 'express';
import { QrBillService } from './qr-bill.service';
interface Debtor {
    name: string;
    address: string;
    zip: string;
    city: string;
    country: string;
}
export interface InvoiceData {
    creditorAccount: string;
    amount: number;
    currency: string;
    debtor: Debtor;
    reference: string;
    additionalInformation: string;
    year: number;
}
export declare class QrBillController {
    private readonly qrBillService;
    constructor(qrBillService: QrBillService);
    generateQrCode(res: Response, amount: string, reference: string): Promise<void>;
    generateQr(data: InvoiceData, res: Response): Promise<void>;
}
export {};
