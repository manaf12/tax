/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
// qr-bill.controller.ts
import {
  Controller,
  Get,
  Query,
  Res,
  HttpStatus,
  Body,
  Post,
} from '@nestjs/common';
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

@Controller('qr-bill')
export class QrBillController {
  constructor(private readonly qrBillService: QrBillService) {}

  @Get('generate-pdf')
  async generateQrCode(
    @Res() res: Response,
    @Query('amount') amount: string,
    @Query('reference') reference: string,
  ) {
    try {
      const invoiceData = {
        ...sampleInvoice,
        amount: amount ? parseFloat(amount) : sampleInvoice.amount,
        reference: reference || sampleInvoice.reference,
      };

      const dataForService = {
        creditorAccount: 'CH37 8080 8001 0062 4300 3',
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

      const pdfBuffer =
        await this.qrBillService.generateQrBillPdf(dataForService);

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        'attachment; filename="qr-bill.pdf"',
      );
      res.status(HttpStatus.OK).send(pdfBuffer);
    } catch (error) {
      console.error('QR-Bill Generation Error:', error);
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        message: ' Error Generating Qr-Bill.',
        details: error.message,
      });
    }
  }
  @Post('generate')
  async generateQr(@Body() data: InvoiceData, @Res() res: Response) {
    try {
      const pdfBuffer = await this.qrBillService.generateQrBillPdf(data);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        'attachment; filename="qr-bill.pdf"',
      );
      res.send(pdfBuffer);
    } catch (e) {
      res
        .status(500)
        .json({ message: 'Failed to generate QR-Bill', details: e.message });
    }
  }
}
