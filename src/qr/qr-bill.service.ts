/* eslint-disable no-control-regex */
// /* eslint-disable @typescript-eslint/no-unsafe-assignment */
// /* eslint-disable @typescript-eslint/no-unsafe-member-access */
// import { Injectable } from '@nestjs/common';
// import PDFDocument from 'pdfkit';
// import QRCode from 'qrcode';

// @Injectable()
// export class QrBillService {
//   async generateQrBillPdf(data: any): Promise<Buffer> {
//     console.log(this.buildQrPayload(data));
//     const payload = this.buildQrPayload(data);
//     const lines = payload.split('\r\n');
//     console.log(lines.length);
//     const qrBuffer = await QRCode.toBuffer(payload, {
//       type: 'png',
//       errorCorrectionLevel: 'M',
//       margin: 0,
//       scale: 8,
//     });
//     const doc = new PDFDocument({ size: 'A4' });
//     const buffers: Buffer[] = [];
//     doc.on('data', buffers.push.bind(buffers));
//     return new Promise((resolve, reject) => {
//       doc.on('end', () => {
//         resolve(Buffer.concat(buffers));
//       });
//       doc.on('error', reject);
//       doc.fontSize(20).text('INVOICE', { align: 'center' });
//       doc.moveDown();

//       doc.fontSize(12).text(`Invoice No: ${data.reference}`);
//       doc.text(`Date: ${new Date().toLocaleDateString()}`);
//       doc.moveDown();

//       doc.text('Creditor:');
//       doc.text('A&G Fiduciaire Sàrl');
//       doc.text('Impasse du nouveau marché 7');
//       doc.text('1723 Marly, CH');

//       doc.moveDown();
//       doc.text('Bill To:');
//       doc.text(data.debtor.name);
//       doc.text(data.debtor.address);
//       doc.text(`${data.debtor.zip} ${data.debtor.city}`);
//       doc.text(data.debtor.country);

//       doc.moveDown();
//       doc.text(`Service: Tax declaration ${data.year}`);
//       doc.text(`Amount: ${data.amount.toFixed(2)} CHF`);

//       doc.moveDown();
//       doc.image(qrBuffer, (doc.page.width - 220) / 2, doc.y, { width: 220 });

//       doc.moveDown();
//       doc
//         .fontSize(10)
//         .text('Please scan the QR code to pay.', { align: 'center' });
//       doc.end();
//     });
//   }
//   private generateRFReference(input: string): string {
//     const base = input
//       .replace(/[^a-zA-Z0-9]/g, '')
//       .toUpperCase()
//       .slice(0, 20);
//     const temp = base + 'RF00';
//     const converted = temp.replace(/[A-Z]/g, (c) =>
//       (c.charCodeAt(0) - 55).toString(),
//     );
//     const mod = BigInt(converted) % 97n;
//     const checksum = (98n - mod).toString().padStart(2, '0');
//     return `RF${checksum}${base}`;
//   }
//   private isQrIban(iban: string): boolean {
//     const clean = iban.replace(/\s/g, '');
//     if (!clean.startsWith('CH') || clean.length !== 21) return false;

//     // IID = positions 5-9 (بعد CH + checksum)
//     const iidStr = clean.slice(4, 9);
//     if (!/^\d{5}$/.test(iidStr)) return false;

//     const iid = Number(iidStr);
//     return iid >= 30000 && iid <= 31999;
//   }
//   private mod10Recursive(referenceDigits: string): string {
//     const table = [0, 9, 4, 6, 8, 2, 7, 1, 3, 5];
//     let carry = 0;
//     for (const ch of referenceDigits) {
//       carry = table[(carry + Number(ch)) % 10];
//     }
//     return String((10 - carry) % 10);
//   }

//   private generateQrrReference(input: string): string {
//     // لازم يكون رقمي فقط
//     const digits = String(input).replace(/\D/g, '');
//     // خذي آخر 26 رقم (أو أقل) واعملي pad لليسار
//     const base = digits.slice(-26).padStart(26, '0');
//     const check = this.mod10Recursive(base);
//     return base + check; // 27 digits
//   }

//   private buildQrPayload(data: any): string {
//     const iban = data.creditorAccount.replace(/\s/g, '');
//     const amount = Number(data.amount).toFixed(2);

//     const useQrIban = this.isQrIban(iban);
//     const referenceType = useQrIban ? 'QRR' : 'SCOR';

//     const reference = useQrIban
//       ? this.generateQrrReference(data.reference || '0')
//       : this.generateRFReference(data.reference || 'INV');

//     const creditorCountry = 'CH';
//     const debtorCountry = (data.debtor.country || 'CH').toUpperCase();

//     const lines = [
//       'SPC',
//       '0200',
//       '1',
//       iban,

//       // Creditor (AdrTp=K) BUT with 7 reserved lines
//       'K',
//       'A&G Fiduciaire Sàrl',
//       'Impasse du nouveau marché 7',
//       '1723 Marly',
//       '', // PstCd (empty for K)
//       '', // TwnNm (empty for K)
//       creditorCountry, // Ctry MUST be here

//       // Ultimate creditor (7 empty lines) - must remain empty
//       '',
//       '',
//       '',
//       '',
//       '',
//       '',
//       '',

//       // Amount & currency
//       amount,
//       'CHF',

//       // Debtor (AdrTp=K) BUT with 7 reserved lines
//       'K',
//       data.debtor.name,
//       data.debtor.address,
//       `${data.debtor.zip} ${data.debtor.city}`,
//       '', // PstCd (empty for K)
//       '', // TwnNm (empty for K)
//       debtorCountry, // Ctry MUST be here

//       // Reference
//       referenceType,
//       reference,

//       // Additional information
//       data.additionalInformation || '',

//       // Trailer (must be last line)
//       'EPD',
//     ];

//     // لازم يكون 31 بالضبط
//     if (lines.length !== 31) {
//       lines.forEach((v, i) => console.log(i + 1, JSON.stringify(v)));
//       throw new Error(`Invalid QR payload line count: ${lines.length}`);
//     }

//     return lines.join('\r\n');
//   }
// }

/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */

import { Injectable } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';

@Injectable()
export class QrBillService {
  async generateQrBillPdf(data: any): Promise<Buffer> {
    // --- NO LOGIC CHANGE: payload generation stays identical ---
    const payload = this.buildQrPayload(data);

    // --- NO LOGIC CHANGE: QR generation stays identical ---
    const qrBuffer = await QRCode.toBuffer(payload, {
      type: 'png',
      errorCorrectionLevel: 'M',
      margin: 0,
      scale: 8,
    });

    const doc = new PDFDocument({ size: 'A4', margin: 36 });
    const buffers: Buffer[] = [];
    doc.on('data', buffers.push.bind(buffers));

    return new Promise((resolve, reject) => {
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', reject);

      // ---------------------------
      // Helpers (DESIGN ONLY)
      // ---------------------------
      const mm = (v: number) => (v * 72) / 25.4; // mm -> points
      const pageW = doc.page.width;
      const pageH = doc.page.height;

      const fontRegular = 'Helvetica';
      const fontBold = 'Helvetica-Bold';

      const safe = (v: any) => (v == null ? '' : String(v));
      const money = (v: any) => Number(v || 0).toFixed(2);

      // Display sanitation only (fixes weird hidden chars in facture/reference when printing)
      const sanitize = (v: any) =>
        safe(v)
          .replace(/[\u0000-\u001F\u007F]/g, '')
          .replace(/\uFFFD/g, '')
          .trim();

      const formatIban = (v: any) =>
        sanitize(v)
          .replace(/\s+/g, '')
          .replace(/(.{4})/g, '$1 ')
          .trim();

      const formatRefReadable = (v: any) => {
        const r = sanitize(v).replace(/\s+/g, '');
        if (!r) return '';
        // RF reference: RFxx + groups of 4
        if (r.startsWith('RF') && r.length > 4) {
          const head = r.slice(0, 4);
          const rest = r
            .slice(4)
            .replace(/(.{4})/g, '$1 ')
            .trim();
          return `${head} ${rest}`.trim();
        }
        // QRR numeric: groups of 5
        return r.replace(/(.{5})/g, '$1 ').trim();
      };

      // ---------------------------
      // Reference recompute for DISPLAY ONLY (same logic as your current code)
      // ---------------------------
      const iban = safe(data.creditorAccount).replace(/\s/g, '');
      const useQrIban = this.isQrIban(iban);
      const referenceType = useQrIban ? 'QRR' : 'SCOR';
      const reference = useQrIban
        ? this.generateQrrReference(data.reference || '0')
        : this.generateRFReference(data.reference || 'INV');

      // ---------------------------
      // Page layout constants
      // ---------------------------
      const contentX = doc.page.margins.left;
      const contentW = pageW - doc.page.margins.left - doc.page.margins.right;

      // ===========================
      // TOP INVOICE AREA (optimized)
      // ===========================
      // Title
      doc.font(fontBold).fontSize(18).text('FACTURE', contentX, doc.y, {
        width: contentW,
        align: 'right',
      });
      doc.moveDown(0.4);

      // Two-column header grid
      const headerTopY = doc.y;
      const leftW = contentW * 0.58;
      const rightW = contentW - leftW;
      const headerRightX = contentX + leftW; // renamed to avoid redeclare

      // Left: company
      doc
        .font(fontBold)
        .fontSize(11)
        .text('A&G Fiduciaire Sàrl', contentX, headerTopY, {
          width: leftW,
        });
      doc.font(fontRegular).fontSize(9);
      doc.text('Georges Arbach', { width: leftW, lineGap: 2 });
      doc.text('Impasse du nouveau marché 7', { width: leftW, lineGap: 2 });
      doc.text('1723 Marly, CH', { width: leftW, lineGap: 2 });
      doc.text('georges.arbach@ag-fiduciaire.ch', { width: leftW, lineGap: 2 });
      doc.text('www.ag-fiduciaire.ch', { width: leftW, lineGap: 2 });
      doc.text('CHE-450.723.829 TVA', { width: leftW, lineGap: 2 });

      // Right: meta + billed-to
      const invNo = sanitize(data.reference);
      const invDate = new Date().toLocaleDateString();

      doc.font(fontBold).fontSize(9).text('Facture', headerRightX, headerTopY, {
        width: rightW,
      });
      doc
        .font(fontRegular)
        .fontSize(9)
        .text(invNo, headerRightX, headerTopY + 12, {
          width: rightW,
          lineGap: 2,
        });

      doc
        .font(fontBold)
        .text('Date', headerRightX, headerTopY + 30, { width: rightW });
      doc
        .font(fontRegular)
        .text(invDate, headerRightX, headerTopY + 42, { width: rightW });

      doc
        .font(fontBold)
        .text('Facturé à', headerRightX, headerTopY + 62, { width: rightW });
      doc
        .font(fontRegular)
        .text(
          [
            sanitize(data.debtor?.name),
            sanitize(data.debtor?.address),
            `${sanitize(data.debtor?.zip)} ${sanitize(data.debtor?.city)}`.trim(),
            sanitize(data.debtor?.country),
          ]
            .filter(Boolean)
            .join('\n'),
          headerRightX,
          headerTopY + 74,
          { width: rightW, lineGap: 2 },
        );

      // Place cursor below header content
      doc.y = Math.max(doc.y, headerTopY + 140);
      doc.moveDown(0.6);

      // Divider
      doc.save();
      doc.strokeColor('#000').lineWidth(0.6);
      doc
        .moveTo(contentX, doc.y)
        .lineTo(contentX + contentW, doc.y)
        .stroke();
      doc.restore();
      doc.moveDown(0.8);

      // ===========================
      // ITEMS TABLE (optimized)
      // ===========================
      const tableX = contentX;
      const tableW = contentW;
      const colAmountW = mm(45);
      const colDescW = tableW - colAmountW;

      const tableHeaderY = doc.y;

      // Header background
      doc.save();
      doc.rect(tableX, tableHeaderY, tableW, 18).fill('#F3F4F6');
      doc.restore();

      doc.font(fontBold).fontSize(9).fillColor('#000');
      doc.text('Description', tableX + 8, tableHeaderY + 5, {
        width: colDescW - 8,
      });
      doc.text('Montant (CHF)', tableX + colDescW, tableHeaderY + 5, {
        width: colAmountW - 8,
        align: 'right',
      });

      // Row
      doc.y = tableHeaderY + 26;
      doc.font(fontRegular).fontSize(9);
      doc.text(
        `Déclaration d'impôt ${sanitize(data.year)}`,
        tableX + 8,
        doc.y,
        {
          width: colDescW - 8,
        },
      );
      doc.text(money(data.amount), tableX + colDescW, doc.y, {
        width: colAmountW - 8,
        align: 'right',
      });

      doc.moveDown(1.0);

      // Total line
      const totalLineY = doc.y;
      doc.save();
      doc.strokeColor('#000').lineWidth(0.6);
      doc
        .moveTo(tableX, totalLineY)
        .lineTo(tableX + tableW, totalLineY)
        .stroke();
      doc.restore();

      doc.moveDown(0.5);
      doc.font(fontBold).fontSize(10);
      doc.text('TOTAL', tableX + 8, doc.y, { width: colDescW - 8 });
      doc.text(money(data.amount), tableX + colDescW, doc.y, {
        width: colAmountW - 8,
        align: 'right',
      });

      // Keep some breathing room before QR bill block
      doc.y = Math.min(
        doc.y + mm(10),
        pageH - doc.page.margins.bottom - mm(115),
      );

      // ===========================
      // BOTTOM QR-BILL BLOCK
      // ===========================
      const blockH = mm(105);
      const blockY = pageH - doc.page.margins.bottom - blockH;
      const blockX = contentX;
      const blockW = contentW;

      // Cut line
      doc.save();
      doc.strokeColor('#000').lineWidth(0.7).dash(4, { space: 3 });
      doc
        .moveTo(blockX, blockY)
        .lineTo(blockX + blockW, blockY)
        .stroke();
      doc.undash();
      doc.restore();

      // Outer border
      doc.save();
      doc.strokeColor('#000').lineWidth(0.6);
      doc.rect(blockX, blockY, blockW, blockH).stroke();
      doc.restore();

      const receiptW = mm(62);

      // Split line
      doc.save();
      doc.strokeColor('#000').lineWidth(0.6);
      doc
        .moveTo(blockX + receiptW, blockY)
        .lineTo(blockX + receiptW, blockY + blockH)
        .stroke();
      doc.restore();

      // Titles
      doc.font(fontBold).fontSize(10);
      doc.text('Récépissé', blockX + mm(3), blockY + mm(4));
      doc.text('Section paiement', blockX + receiptW + mm(3), blockY + mm(4));

      // Label/value helpers (consistent lineGap)
      const label = (x: number, y: number, t: string) => {
        doc.font(fontBold).fontSize(7).fillColor('#000').text(t, x, y);
      };
      const value = (x: number, y: number, t: string, opts: any = {}) => {
        doc
          .font(fontRegular)
          .fontSize(8)
          .fillColor('#000')
          .text(t, x, y, {
            lineGap: 1.5,
            ...opts,
          });
      };

      const receiptX = blockX + mm(3);
      const receiptY = blockY + mm(10);

      const payX = blockX + receiptW + mm(3);
      const payY = blockY + mm(10);

      // ---- Left: Receipt
      label(receiptX, receiptY, 'Compte / Payable à');
      value(receiptX, receiptY + mm(3.5), formatIban(data.creditorAccount));

      value(receiptX, receiptY + mm(10), 'A&G Fiduciaire Sàrl');
      value(receiptX, receiptY + mm(14), 'Impasse du nouveau marché 7');
      value(receiptX, receiptY + mm(18), '1723 Marly');

      label(receiptX, receiptY + mm(26), 'Référence');
      value(
        receiptX,
        receiptY + mm(29.5),
        formatRefReadable(referenceType === 'SCOR' ? reference : reference),
        { width: receiptW - mm(6) },
      );

      label(receiptX, receiptY + mm(37), 'Payable par');
      value(receiptX, receiptY + mm(40.5), sanitize(data.debtor?.name), {
        width: receiptW - mm(6),
      });
      value(receiptX, receiptY + mm(44.5), sanitize(data.debtor?.address), {
        width: receiptW - mm(6),
      });
      value(
        receiptX,
        receiptY + mm(48.5),
        `${sanitize(data.debtor?.zip)} ${sanitize(data.debtor?.city)}`.trim(),
        { width: receiptW - mm(6) },
      );

      // Amount (receipt bottom)
      label(receiptX, blockY + blockH - mm(18), 'Monnaie');
      value(receiptX, blockY + blockH - mm(14), 'CHF');
      label(receiptX + mm(22), blockY + blockH - mm(18), 'Montant');
      value(receiptX + mm(22), blockY + blockH - mm(14), money(data.amount));

      // ---- Right: Payment section
      const qrBoxSize = mm(46);
      const qrBoxX = payX;
      const qrBoxY = payY + mm(4);

      // QR border
      doc.save();
      doc.strokeColor('#000').lineWidth(0.6);
      doc.rect(qrBoxX, qrBoxY, qrBoxSize, qrBoxSize).stroke();
      doc.restore();

      // QR image
      doc.image(qrBuffer, qrBoxX + mm(3), qrBoxY + mm(3), {
        width: qrBoxSize - mm(6),
      });

      // Swiss cross marker
      const crossSize = mm(6);
      const crossX = qrBoxX + qrBoxSize - crossSize - mm(2);
      const crossY = qrBoxY + mm(2);

      doc.save();
      doc
        .rect(crossX, crossY, crossSize, crossSize)
        .strokeColor('#000')
        .lineWidth(0.6)
        .stroke();
      doc
        .moveTo(crossX + crossSize / 2, crossY + mm(1.2))
        .lineTo(crossX + crossSize / 2, crossY + crossSize - mm(1.2))
        .stroke();
      doc
        .moveTo(crossX + mm(1.2), crossY + crossSize / 2)
        .lineTo(crossX + crossSize - mm(1.2), crossY + crossSize / 2)
        .stroke();
      doc.restore();

      // Text next to QR
      const infoX = qrBoxX + qrBoxSize + mm(6);
      const infoW = blockX + blockW - infoX - mm(3);

      label(infoX, payY, 'Compte / Payable à');
      value(infoX, payY + mm(3.5), formatIban(data.creditorAccount), {
        width: infoW,
      });

      value(infoX, payY + mm(10), 'A&G Fiduciaire Sàrl', { width: infoW });
      value(infoX, payY + mm(14), 'Impasse du nouveau marché 7', {
        width: infoW,
      });
      value(infoX, payY + mm(18), '1723 Marly', { width: infoW });

      label(infoX, payY + mm(26), 'Référence');
      value(infoX, payY + mm(29.5), formatRefReadable(reference), {
        width: infoW,
      });

      label(infoX, payY + mm(37), 'Payable par');
      value(infoX, payY + mm(40.5), sanitize(data.debtor?.name), {
        width: infoW,
      });
      value(infoX, payY + mm(44.5), sanitize(data.debtor?.address), {
        width: infoW,
      });
      value(
        infoX,
        payY + mm(48.5),
        `${sanitize(data.debtor?.zip)} ${sanitize(data.debtor?.city)}`.trim(),
        { width: infoW },
      );

      // Currency/amount (payment bottom)
      label(infoX, blockY + blockH - mm(18), 'Monnaie');
      value(infoX, blockY + blockH - mm(14), 'CHF');
      label(infoX + mm(22), blockY + blockH - mm(18), 'Montant');
      value(infoX + mm(22), blockY + blockH - mm(14), money(data.amount));

      // Optional additional info
      const addInfo = sanitize(data.additionalInformation || '');
      if (addInfo) {
        const addY = qrBoxY + qrBoxSize + mm(6);
        label(payX, addY, 'Informations supplémentaires');
        value(payX, addY + mm(3.5), addInfo, {
          width: blockW - receiptW - mm(6),
        });
      }

      doc.end();
    });
  }

  // --- keep everything else exactly as you already have it ---
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
    const digits = String(input).replace(/\D/g, '');
    const base = digits.slice(-26).padStart(26, '0');
    const check = this.mod10Recursive(base);
    return base + check;
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

      'K',
      'A&G Fiduciaire Sàrl',
      'Impasse du nouveau marché 7',
      '1723 Marly',
      '',
      '',
      creditorCountry,

      '',
      '',
      '',
      '',
      '',
      '',
      '',

      amount,
      'CHF',

      'K',
      data.debtor.name,
      data.debtor.address,
      `${data.debtor.zip} ${data.debtor.city}`,
      '',
      '',
      debtorCountry,

      referenceType,
      reference,

      data.additionalInformation || '',

      'EPD',
    ];

    if (lines.length !== 31) {
      lines.forEach((v, i) => console.log(i + 1, JSON.stringify(v)));
      throw new Error(`Invalid QR payload line count: ${lines.length}`);
    }

    return lines.join('\r\n');
  }
}
