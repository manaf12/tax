import { TaxDeclaration } from 'src/orders/tax-declaration.entity';
export declare class File {
    id: string;
    originalName: string;
    storagePath: string;
    documentType: string;
    mimetype: string;
    size: number;
    uploadedAt: Date;
    createdAt: Date;
    declaration: TaxDeclaration;
    meta: Record<string, any>;
}
