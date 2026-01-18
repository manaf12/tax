export declare class QrBillService {
    generateQrBillPdf(data: any): Promise<Buffer>;
    private generateRFReference;
    private isQrIban;
    private mod10Recursive;
    private generateQrrReference;
    private buildQrPayload;
}
