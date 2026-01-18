"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.QrBillController = void 0;
const common_1 = require("@nestjs/common");
const qr_bill_service_1 = require("./qr-bill.service");
const sampleInvoice = {
    amount: 150.0,
    currency: 'CHF',
    customerName: 'Max Mustermann',
    customerAddress: 'Musterstrasse 1',
    customerZip: '8000',
    customerCity: 'Zürich',
    customerCountry: 'CH',
    reference: 'RF0020250612000000001',
    year: 2025,
};
let QrBillController = class QrBillController {
    qrBillService;
    constructor(qrBillService) {
        this.qrBillService = qrBillService;
    }
    async generateQrCode(res, amount, reference) {
        try {
            const invoiceData = {
                ...sampleInvoice,
                amount: amount ? parseFloat(amount) : sampleInvoice.amount,
                reference: reference || sampleInvoice.reference,
            };
            const dataForService = {
                creditorAccount: 'CH65 3080 8001 0062 4300 3',
                amount: invoiceData.amount,
                currency: invoiceData.currency,
                debtor: {
                    name: invoiceData.customerName,
                    address: invoiceData.customerAddress,
                    zip: invoiceData.customerZip,
                    city: invoiceData.customerCity,
                    country: invoiceData.customerCountry,
                },
                reference: invoiceData.reference,
                additionalInformation: "Déclaration d'impôt " + invoiceData.year,
                year: invoiceData.year,
            };
            const pdfBuffer = await this.qrBillService.generateQrBillPdf(dataForService);
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', 'attachment; filename="qr-bill.pdf"');
            res.status(common_1.HttpStatus.OK).send(pdfBuffer);
        }
        catch (error) {
            console.error('QR-Bill Generation Error:', error);
            res.status(common_1.HttpStatus.INTERNAL_SERVER_ERROR).json({
                message: ' Error Generating Qr-Bill.',
                details: error.message,
            });
        }
    }
    async generateQr(data, res) {
        try {
            const pdfBuffer = await this.qrBillService.generateQrBillPdf(data);
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', 'attachment; filename="qr-bill.pdf"');
            res.send(pdfBuffer);
        }
        catch (e) {
            res
                .status(500)
                .json({ message: 'Failed to generate QR-Bill', details: e.message });
        }
    }
};
exports.QrBillController = QrBillController;
__decorate([
    (0, common_1.Get)('generate-pdf'),
    __param(0, (0, common_1.Res)()),
    __param(1, (0, common_1.Query)('amount')),
    __param(2, (0, common_1.Query)('reference')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], QrBillController.prototype, "generateQrCode", null);
__decorate([
    (0, common_1.Post)('generate'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], QrBillController.prototype, "generateQr", null);
exports.QrBillController = QrBillController = __decorate([
    (0, common_1.Controller)('qr-bill'),
    __metadata("design:paramtypes", [qr_bill_service_1.QrBillService])
], QrBillController);
//# sourceMappingURL=qr-bill.controller.js.map