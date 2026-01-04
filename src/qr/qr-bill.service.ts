/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Injectable } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';

@Injectable()
export class QrBillService {
  async generateQrBillPdf(data: any): Promise<Buffer> {
    console.log(this.buildQrPayload(data));
    const payload = this.buildQrPayload(data);
    const lines = payload.split('\r\n');
    console.log(lines.length);
    const qrBuffer = await QRCode.toBuffer(payload, {
      type: 'png',
      errorCorrectionLevel: 'M',
      margin: 0,
      scale: 8,
    });
    const doc = new PDFDocument({ size: 'A4' });
    const buffers: Buffer[] = [];
    doc.on('data', buffers.push.bind(buffers));
    return new Promise((resolve, reject) => {
      doc.on('end', () => {
        resolve(Buffer.concat(buffers));
      });
      doc.on('error', reject);
      doc.fontSize(20).text('INVOICE', { align: 'center' });
      doc.moveDown();

      doc.fontSize(12).text(`Invoice No: ${data.reference}`);
      doc.text(`Date: ${new Date().toLocaleDateString()}`);
      doc.moveDown();

      doc.text('Creditor:');
      doc.text('A&G Fiduciaire Sàrl');
      doc.text('Impasse du nouveau marché 7');
      doc.text('1723 Marly, CH');

      doc.moveDown();
      doc.text('Bill To:');
      doc.text(data.debtor.name);
      doc.text(data.debtor.address);
      doc.text(`${data.debtor.zip} ${data.debtor.city}`);
      doc.text(data.debtor.country);

      doc.moveDown();
      doc.text(`Service: Tax declaration ${data.year}`);
      doc.text(`Amount: ${data.amount.toFixed(2)} CHF`);

      doc.moveDown();
      doc.image(qrBuffer, (doc.page.width - 220) / 2, doc.y, { width: 220 });

      doc.moveDown();
      doc
        .fontSize(10)
        .text('Please scan the QR code to pay.', { align: 'center' });
      doc.end();
    });
  }
  private generateRFReference(input: string): string {
    const base = input
      .replace(/[^a-zA-Z0-9]/g, '')
      .toUpperCase()
      .slice(0, 20);
    const temp = base + 'RF00';
    const converted = temp.replace(/[A-Z]/g, (c) =>
      (c.charCodeAt(0) - 55).toString(),
    );
    const mod = BigInt(converted) % 97n;
    const checksum = (98n - mod).toString().padStart(2, '0');
    return `RF${checksum}${base}`;
  }
  private isQrIban(iban: string): boolean {
    const clean = iban.replace(/\s/g, '');
    if (!clean.startsWith('CH') || clean.length !== 21) return false;

    // IID = positions 5-9 (بعد CH + checksum)
    const iidStr = clean.slice(4, 9);
    if (!/^\d{5}$/.test(iidStr)) return false;

    const iid = Number(iidStr);
    return iid >= 30000 && iid <= 31999;
  }
  private mod10Recursive(referenceDigits: string): string {
    const table = [0, 9, 4, 6, 8, 2, 7, 1, 3, 5];
    let carry = 0;
    for (const ch of referenceDigits) {
      carry = table[(carry + Number(ch)) % 10];
    }
    return String((10 - carry) % 10);
  }

  private generateQrrReference(input: string): string {
    // لازم يكون رقمي فقط
    const digits = String(input).replace(/\D/g, '');
    // خذي آخر 26 رقم (أو أقل) واعملي pad لليسار
    const base = digits.slice(-26).padStart(26, '0');
    const check = this.mod10Recursive(base);
    return base + check; // 27 digits
  }

  private buildQrPayload(data: any): string {
    const iban = data.creditorAccount.replace(/\s/g, '');
    const amount = Number(data.amount).toFixed(2);

    const useQrIban = this.isQrIban(iban);
    const referenceType = useQrIban ? 'QRR' : 'SCOR';

    const reference = useQrIban
      ? this.generateQrrReference(data.reference || '0')
      : this.generateRFReference(data.reference || 'INV');

    const creditorCountry = 'CH';
    const debtorCountry = (data.debtor.country || 'CH').toUpperCase();

    const lines = [
      'SPC',
      '0200',
      '1',
      iban,

      // Creditor (AdrTp=K) BUT with 7 reserved lines
      'K',
      'A&G Fiduciaire Sàrl',
      'Impasse du nouveau marché 7',
      '1723 Marly',
      '', // PstCd (empty for K)
      '', // TwnNm (empty for K)
      creditorCountry, // Ctry MUST be here

      // Ultimate creditor (7 empty lines) - must remain empty
      '',
      '',
      '',
      '',
      '',
      '',
      '',

      // Amount & currency
      amount,
      'CHF',

      // Debtor (AdrTp=K) BUT with 7 reserved lines
      'K',
      data.debtor.name,
      data.debtor.address,
      `${data.debtor.zip} ${data.debtor.city}`,
      '', // PstCd (empty for K)
      '', // TwnNm (empty for K)
      debtorCountry, // Ctry MUST be here

      // Reference
      referenceType,
      reference,

      // Additional information
      data.additionalInformation || '',

      // Trailer (must be last line)
      'EPD',
    ];

    // لازم يكون 31 بالضبط
    if (lines.length !== 31) {
      lines.forEach((v, i) => console.log(i + 1, JSON.stringify(v)));
      throw new Error(`Invalid QR payload line count: ${lines.length}`);
    }

    return lines.join('\r\n');
  }
}
