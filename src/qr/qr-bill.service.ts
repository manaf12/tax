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
      const sanitize = (v: any) =>
        safe(v)
          .replace(/[\u0000-\u001F\u007F]/g, '')
          .replace(/\uFFFD/g, '')
          .trim();

      // QR payload must stay with dot decimals; DISPLAY uses Swiss style (comma)
      const moneyPayload = (v: any) => Number(v || 0).toFixed(2);
      const moneyDisplay = (v: any) => moneyPayload(v).replace('.', ',');

      const formatIban = (v: any) =>
        sanitize(v)
          .replace(/\s+/g, '')
          .replace(/(.{4})/g, '$1 ')
          .trim();

      const formatRefReadable = (v: any) => {
        const r = sanitize(v).replace(/\s+/g, '');
        if (!r) return '';
        if (r.startsWith('RF') && r.length > 4) {
          const head = r.slice(0, 4);
          const rest = r
            .slice(4)
            .replace(/(.{4})/g, '$1 ')
            .trim();
          return `${head} ${rest}`.trim();
        }
        return r.replace(/(.{5})/g, '$1 ').trim();
      };

      const formatDateCH = (d: Date) => {
        const dd = String(d.getDate()).padStart(2, '0');
        const mm2 = String(d.getMonth() + 1).padStart(2, '0');
        const yyyy = d.getFullYear();
        return `${dd}.${mm2}.${yyyy}`;
      };

      // ---------------------------
      // Reference recompute for DISPLAY ONLY (same logic as your current code)
      // ---------------------------
      const iban = safe(data.creditorAccount).replace(/\s/g, '');
      const useQrIban = this.isQrIban(iban);

      const reference = useQrIban
        ? this.generateQrrReference(data.reference || '0')
        : this.generateRFReference(data.reference || 'INV');

      // ---------------------------
      // Page constants
      // ---------------------------
      const contentX = doc.page.margins.left;
      const contentW = pageW - doc.page.margins.left - doc.page.margins.right;

      const BLUE = '#0B5E8C';
      const LIGHT_ROW = '#EAF3FA';

      // ===========================
      // HEADER (match sample layout)
      // ===========================
      const headerTopY = doc.y;

      // Optional logo (Buffer). Pure design: no impact if missing.
      const logoSize = mm(20);
      const logoX = contentX;
      const logoY = headerTopY;

      if (data.logo && Buffer.isBuffer(data.logo)) {
        doc.image(data.logo, logoX, logoY, {
          width: logoSize,
          height: logoSize,
        });
      }

      const headerTextX = logoX + (data.logo ? logoSize + mm(6) : 0);

      doc.font(fontBold).fontSize(16).fillColor('#000');
      doc.text('A&G Fiduciaire Sàrl', headerTextX, headerTopY, {
        width: contentW,
      });

      doc.font(fontBold).fontSize(9);
      doc.text('Georges Arbach', headerTextX, headerTopY + mm(7), {
        width: contentW,
      });

      doc.font(fontRegular).fontSize(9);
      doc.text(
        'Impasse du nouveau marché 7, 1723 Marly',
        headerTextX,
        headerTopY + mm(11),
        { width: contentW },
      );
      doc.text(
        'georges.arbach@ag-fiduciaire.ch, www.ag-fiduciaire.ch',
        headerTextX,
        headerTopY + mm(15),
        { width: contentW },
      );
      doc.text('CHE-450.723.829 TVA', headerTextX, headerTopY + mm(19), {
        width: contentW,
      });

      doc.y = headerTopY + mm(30);

      // Meta left + debtor right
      const metaLeftX = contentX;
      const metaTopY = doc.y;
      const debtorX = contentX + contentW * 0.62;

      const invNo = sanitize(data.reference);
      const invDate = formatDateCH(new Date());

      doc.font(fontRegular).fontSize(11).fillColor('#000');
      doc.text('Facture:', metaLeftX, metaTopY);
      doc.text('Date:', metaLeftX, metaTopY + mm(6));
      doc.text('Numéro Client:', metaLeftX, metaTopY + mm(12));
      doc.text('Échéance:', metaLeftX, metaTopY + mm(18));
      doc.text('Page:', metaLeftX, metaTopY + mm(24));

      doc.font(fontRegular).fontSize(11);
      doc.text(invNo, metaLeftX + mm(30), metaTopY);
      doc.text(invDate, metaLeftX + mm(30), metaTopY + mm(6));
      doc.text(
        sanitize(data.clientNumber || ''),
        metaLeftX + mm(30),
        metaTopY + mm(12),
      );
      doc.text(
        sanitize(data.dueDate || ''),
        metaLeftX + mm(30),
        metaTopY + mm(18),
      );
      doc.text('1', metaLeftX + mm(30), metaTopY + mm(24));

      // Debtor block
      doc.font(fontRegular).fontSize(11);
      doc.text(
        [
          sanitize(data.debtor?.name),
          sanitize(data.debtor?.address),
          `${sanitize(data.debtor?.zip)} ${sanitize(data.debtor?.city)}`.trim(),
        ]
          .filter(Boolean)
          .join('\n'),
        debtorX,
        metaTopY,
        { width: contentX + contentW - debtorX, lineGap: 2 },
      );

      // Title in blue
      doc.y = metaTopY + mm(40);
      doc.font(fontBold).fontSize(16).fillColor(BLUE);
      doc.text(`Facture ${invNo}`, contentX, doc.y, { width: contentW });
      doc.moveDown(0.8);

      // ===========================
      // TABLE (5 columns) — fixed mm widths for stable alignment
      // ===========================
      const tableX = contentX;
      const tableW = contentW;

      const colDescW = mm(88);
      const colQtyW = mm(20);
      const colUnitW = mm(20);
      const colUnitPriceW = mm(30);
      const colAmountW =
        tableW - (colDescW + colQtyW + colUnitW + colUnitPriceW);

      const headerH = mm(8);
      const rowH = mm(8);

      // Header background
      const tableHeaderY = doc.y;
      doc.save();
      doc.rect(tableX, tableHeaderY, tableW, headerH).fill(BLUE);
      doc.restore();

      doc.font(fontBold).fontSize(11).fillColor('#fff');
      doc.text('Description', tableX + mm(2), tableHeaderY + mm(1.7), {
        width: colDescW - mm(2),
      });
      doc.text('Quantité', tableX + colDescW, tableHeaderY + mm(1.7), {
        width: colQtyW,
        align: 'center',
      });
      doc.text('Unité', tableX + colDescW + colQtyW, tableHeaderY + mm(1.7), {
        width: colUnitW,
        align: 'center',
      });
      doc.text(
        'Prix Unitaire',
        tableX + colDescW + colQtyW + colUnitW,
        tableHeaderY + mm(1.7),
        { width: colUnitPriceW, align: 'right' },
      );
      doc.text(
        'Montant',
        tableX + colDescW + colQtyW + colUnitW + colUnitPriceW,
        tableHeaderY + mm(1.7),
        { width: colAmountW, align: 'right' },
      );

      // One row
      const rowY = tableHeaderY + headerH;
      doc.save();
      doc.rect(tableX, rowY, tableW, rowH).fill(LIGHT_ROW);
      doc.restore();

      doc.font(fontRegular).fontSize(11).fillColor('#000');
      doc.text("Déclaration d'impôt", tableX + mm(2), rowY + mm(1.8), {
        width: colDescW - mm(2),
      });

      doc.text('', tableX + colDescW, rowY + mm(1.8), {
        width: colQtyW,
        align: 'center',
      });
      doc.text('', tableX + colDescW + colQtyW, rowY + mm(1.8), {
        width: colUnitW,
        align: 'center',
      });

      const amount = Number(data.amount || 0);
      doc.text(
        moneyDisplay(amount),
        tableX + colDescW + colQtyW + colUnitW,
        rowY + mm(1.8),
        { width: colUnitPriceW, align: 'right' },
      );
      doc.text(
        moneyDisplay(amount),
        tableX + colDescW + colQtyW + colUnitW + colUnitPriceW,
        rowY + mm(1.8),
        { width: colAmountW, align: 'right' },
      );

      // Divider line under item
      const lineY = rowY + rowH;
      doc.save();
      doc.strokeColor(BLUE).lineWidth(1.2);
      doc
        .moveTo(tableX, lineY)
        .lineTo(tableX + tableW, lineY)
        .stroke();
      doc.restore();

      // Summary
      doc.y = lineY + mm(6);

      const totalNet = amount;
      const tvaRate = Number(data.tvaRate ?? 8.1);
      const tvaValue = Number(data.tvaValue ?? (totalNet * tvaRate) / 100);
      const grandTotal = Number(data.totalAmount ?? totalNet + tvaValue);

      doc.font(fontRegular).fontSize(11).fillColor('#000');
      doc.text('Total net', tableX + mm(2), doc.y, { width: tableW * 0.6 });
      doc.text(moneyDisplay(totalNet), tableX, doc.y, {
        width: tableW - mm(2),
        align: 'right',
      });

      doc.moveDown(0.6);
      doc.text(
        `TVA ${tvaRate.toFixed(2)}% (${moneyDisplay(totalNet)})`,
        tableX + mm(2),
        doc.y,
        {
          width: tableW * 0.7,
        },
      );
      doc.text(moneyDisplay(tvaValue), tableX, doc.y, {
        width: tableW - mm(2),
        align: 'right',
      });

      doc.moveDown(0.8);

      const totalY = doc.y;
      doc.font(fontBold).fontSize(13).fillColor(BLUE);
      doc.text('TOTAL CHF', tableX + mm(2), totalY, { width: tableW * 0.5 });
      doc.text(moneyDisplay(grandTotal), tableX, totalY, {
        width: tableW - mm(2),
        align: 'right',
      });

      const ruleY1 = totalY + mm(6.5);
      const ruleY2 = ruleY1 + mm(1.6);
      doc.save();
      doc.strokeColor(BLUE).lineWidth(1.4);
      doc
        .moveTo(tableX, ruleY1)
        .lineTo(tableX + tableW, ruleY1)
        .stroke();
      doc.lineWidth(0.8);
      doc
        .moveTo(tableX, ruleY2)
        .lineTo(tableX + tableW, ruleY2)
        .stroke();
      doc.restore();

      // ===========================
      // QR BILL BLOCK (safe positions to prevent extra pages)
      // ===========================
      const blockH = mm(92);
      const blockY = pageH - doc.page.margins.bottom - blockH;
      const blockX = contentX;
      const blockW = contentW;

      // Clamp helper: guarantee all text stays INSIDE the QR block
      const clampY = (y: number) => Math.min(y, blockY + blockH - mm(6));

      // Cut line (dashed) + scissors on the line
      const cutY = blockY - mm(6);
      doc.save();
      doc.strokeColor('#000').lineWidth(0.7).dash(4, { space: 3 });
      doc
        .moveTo(blockX, cutY)
        .lineTo(blockX + blockW, cutY)
        .stroke();
      doc.undash();
      doc.restore();

      doc.font(fontRegular).fontSize(14).fillColor('#000');
      doc.text('✂', blockX + mm(2), cutY - mm(4));

      const receiptW = mm(70);
      const splitX = blockX + receiptW;

      // Vertical split dashed
      doc.save();
      doc.strokeColor('#000').lineWidth(0.6).dash(3, { space: 3 });
      doc
        .moveTo(splitX, blockY)
        .lineTo(splitX, blockY + blockH)
        .stroke();
      doc.undash();
      doc.restore();

      // Titles
      doc.font(fontBold).fontSize(12).fillColor('#000');
      doc.text('Récépissé', blockX + mm(2), blockY + mm(4));
      doc.text('Section paiement', splitX + mm(8), blockY + mm(4));

      // Label/value helpers (QR area)
      const label = (x: number, y: number, t: string) => {
        doc.font(fontBold).fontSize(8).fillColor('#000').text(t, x, clampY(y));
      };
      const value = (x: number, y: number, t: string, opts: any = {}) => {
        doc
          .font(fontRegular)
          .fontSize(9)
          .fillColor('#000')
          .text(t, x, clampY(y), {
            lineGap: 1.5,
            ...opts,
          });
      };

      // ---- Receipt (left)
      const rX = blockX + mm(2);
      const rY = blockY + mm(16);

      label(rX, rY, 'Compte / Payable à');
      value(rX, rY + mm(4), formatIban(data.creditorAccount));

      value(rX, rY + mm(10), 'A&G Fiduciaire Sàrl');
      value(rX, rY + mm(14), 'Impasse du nouveau marché 7');
      value(rX, rY + mm(18), '1723 Marly');

      label(rX, rY + mm(28), 'Référence');
      value(rX, rY + mm(32), formatRefReadable(reference), {
        width: receiptW - mm(6),
      });

      label(rX, rY + mm(44), 'Payable par');
      value(rX, rY + mm(48), sanitize(data.debtor?.name), {
        width: receiptW - mm(6),
      });
      value(rX, rY + mm(52), sanitize(data.debtor?.address), {
        width: receiptW - mm(6),
      });
      value(
        rX,
        rY + mm(56),
        `${sanitize(data.debtor?.zip)} ${sanitize(data.debtor?.city)}`.trim(),
        { width: receiptW - mm(6) },
      );

      // Receipt bottom (currency/amount)
      const rbBaseY = blockY + blockH - mm(16);
      label(rX, rbBaseY - mm(5), 'Monnaie');
      label(rX + mm(18), rbBaseY - mm(5), 'Montant');
      value(rX, rbBaseY, 'CHF');
      value(rX + mm(18), rbBaseY, moneyPayload(grandTotal));

      // Point de dépôt centered in receipt column
      doc.font(fontBold).fontSize(8).fillColor('#000');
      doc.text('Point de dépôt', blockX, clampY(blockY + blockH - mm(6)), {
        width: receiptW,
        align: 'center',
      });

      // ---- Payment section (right)
      const pX = splitX + mm(8);
      const pY = blockY + mm(16);

      // QR size (safer) + slightly higher to ensure under-amount stays inside block
      const qrSize = mm(46);
      const qrX = pX;
      const qrY = pY + mm(6);

      doc.image(qrBuffer, qrX, qrY, { width: qrSize, height: qrSize });

      // Swiss cross overlay
      const crossBox = mm(10);
      const cx = qrX + qrSize / 2 - crossBox / 2;
      const cy = qrY + qrSize / 2 - crossBox / 2;

      doc.save();
      doc.rect(cx, cy, crossBox, crossBox).fill('#fff');
      doc.strokeColor('#000').lineWidth(1.4);
      doc
        .moveTo(cx + crossBox / 2, cy + mm(1.2))
        .lineTo(cx + crossBox / 2, cy + crossBox - mm(1.2))
        .stroke();
      doc
        .moveTo(cx + mm(1.2), cy + crossBox / 2)
        .lineTo(cx + crossBox - mm(1.2), cy + crossBox / 2)
        .stroke();
      doc.restore();

      // Amount UNDER QR (clamped to avoid new pages)
      const underY = clampY(qrY + qrSize + mm(6));
      label(qrX + mm(2), underY, 'Monnaie');
      label(qrX + mm(22), underY, 'Montant');
      value(qrX + mm(2), underY + mm(5), 'CHF');
      value(qrX + mm(22), underY + mm(5), moneyPayload(grandTotal));

      // Right text column
      const infoX = qrX + qrSize + mm(14);
      const infoW = blockX + blockW - infoX - mm(2);

      label(infoX, pY, 'Compte / Payable à');
      value(infoX, pY + mm(4), formatIban(data.creditorAccount), {
        width: infoW,
      });

      value(infoX, pY + mm(10), 'A&G Fiduciaire Sàrl', { width: infoW });
      value(infoX, pY + mm(14), 'Impasse du nouveau marché 7', {
        width: infoW,
      });
      value(infoX, pY + mm(18), '1723 Marly', { width: infoW });

      label(infoX, pY + mm(28), 'Référence');
      value(infoX, pY + mm(32), formatRefReadable(reference), { width: infoW });

      label(infoX, pY + mm(44), 'Payable par');
      value(infoX, pY + mm(48), sanitize(data.debtor?.name), { width: infoW });
      value(infoX, pY + mm(52), sanitize(data.debtor?.address), {
        width: infoW,
      });
      value(
        infoX,
        pY + mm(56),
        `${sanitize(data.debtor?.zip)} ${sanitize(data.debtor?.city)}`.trim(),
        { width: infoW },
      );

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
