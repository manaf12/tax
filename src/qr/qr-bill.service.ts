/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Injectable } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';

@Injectable()
export class QrBillService {
  async generateQrBillPdf(data: any): Promise<Buffer> {
    const payload = this.buildQrPayload(data);
    const qrBuffer = await QRCode.toBuffer(payload, { type: 'png' });
    const doc = new PDFDocument({ size: 'A4' });
    const buffers: Buffer[] = [];
    doc.on('data', buffers.push.bind(buffers));
    return new Promise((resolve, reject) => {
      doc.on('end', () => {
        resolve(Buffer.concat(buffers));
      });
      doc.on('error', reject);
      doc.fontSize(18).text('Swiss QR-Bill', { align: 'center' });
      doc.moveDown();
      doc.image(qrBuffer, { fit: [200, 200], align: 'center' });
      doc.moveDown();
      doc.fontSize(12).text(`Amount: ${data.amount} CHF`);
      doc.text(`Reference: ${data.reference}`);
      doc.end();
    });
  }

  private buildQrPayload(data: any): string {
    return [
      'SPC',
      '0200',
      '1',
      data.creditorAccount.replace(/\s/g, ''),
      'S',
      'A&G Fiduciaire Sàrl',
      'Impasse du nouveau marché 7',
      '1723',
      'Marly',
      'CH',
      '',
      '',
      '',
      '',
      '',
      '',
      data.amount.toFixed(2),
      'CHF',
      'S',
      data.debtor.name,
      data.debtor.address,
      data.debtor.zip,
      data.debtor.city,
      data.debtor.country,
      'QRR',
      data.reference,
      `Déclaration d'impôt ${data.year}`,
      'EPD',
    ].join('\n');
  }
}
