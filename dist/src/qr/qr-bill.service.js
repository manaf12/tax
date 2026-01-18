"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.QrBillService = void 0;
const common_1 = require("@nestjs/common");
const pdfkit_1 = __importDefault(require("pdfkit"));
const qrcode_1 = __importDefault(require("qrcode"));
let QrBillService = class QrBillService {
    async generateQrBillPdf(data) {
        const payload = this.buildQrPayload(data);
        const qrBuffer = await qrcode_1.default.toBuffer(payload, {
            type: 'png',
            errorCorrectionLevel: 'M',
            margin: 0,
            scale: 8,
        });
        const doc = new pdfkit_1.default({ size: 'A4', margin: 36 });
        const buffers = [];
        doc.on('data', buffers.push.bind(buffers));
        return new Promise((resolve, reject) => {
            doc.on('end', () => resolve(Buffer.concat(buffers)));
            doc.on('error', reject);
            const mm = (v) => (v * 72) / 25.4;
            const pageW = doc.page.width;
            const pageH = doc.page.height;
            const fontRegular = 'Helvetica';
            const fontBold = 'Helvetica-Bold';
            const safe = (v) => (v == null ? '' : String(v));
            const money = (v) => Number(v || 0).toFixed(2);
            const sanitize = (v) => safe(v)
                .replace(/[\u0000-\u001F\u007F]/g, '')
                .replace(/\uFFFD/g, '')
                .trim();
            const formatIban = (v) => sanitize(v)
                .replace(/\s+/g, '')
                .replace(/(.{4})/g, '$1 ')
                .trim();
            const formatRefReadable = (v) => {
                const r = sanitize(v).replace(/\s+/g, '');
                if (!r)
                    return '';
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
            const iban = safe(data.creditorAccount).replace(/\s/g, '');
            const useQrIban = this.isQrIban(iban);
            const referenceType = useQrIban ? 'QRR' : 'SCOR';
            const reference = useQrIban
                ? this.generateQrrReference(data.reference || '0')
                : this.generateRFReference(data.reference || 'INV');
            const contentX = doc.page.margins.left;
            const contentW = pageW - doc.page.margins.left - doc.page.margins.right;
            doc.font(fontBold).fontSize(18).text('FACTURE', contentX, doc.y, {
                width: contentW,
                align: 'right',
            });
            doc.moveDown(0.4);
            const headerTopY = doc.y;
            const leftW = contentW * 0.58;
            const rightW = contentW - leftW;
            const headerRightX = contentX + leftW;
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
                .text([
                sanitize(data.debtor?.name),
                sanitize(data.debtor?.address),
                `${sanitize(data.debtor?.zip)} ${sanitize(data.debtor?.city)}`.trim(),
                sanitize(data.debtor?.country),
            ]
                .filter(Boolean)
                .join('\n'), headerRightX, headerTopY + 74, { width: rightW, lineGap: 2 });
            doc.y = Math.max(doc.y, headerTopY + 140);
            doc.moveDown(0.6);
            doc.save();
            doc.strokeColor('#000').lineWidth(0.6);
            doc
                .moveTo(contentX, doc.y)
                .lineTo(contentX + contentW, doc.y)
                .stroke();
            doc.restore();
            doc.moveDown(0.8);
            const tableX = contentX;
            const tableW = contentW;
            const colAmountW = mm(45);
            const colDescW = tableW - colAmountW;
            const tableHeaderY = doc.y;
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
            doc.y = tableHeaderY + 26;
            doc.font(fontRegular).fontSize(9);
            doc.text(`Déclaration d'impôt ${sanitize(data.year)}`, tableX + 8, doc.y, {
                width: colDescW - 8,
            });
            doc.text(money(data.amount), tableX + colDescW, doc.y, {
                width: colAmountW - 8,
                align: 'right',
            });
            doc.moveDown(1.0);
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
            doc.y = Math.min(doc.y + mm(10), pageH - doc.page.margins.bottom - mm(115));
            const blockH = mm(105);
            const blockY = pageH - doc.page.margins.bottom - blockH;
            const blockX = contentX;
            const blockW = contentW;
            doc.save();
            doc.strokeColor('#000').lineWidth(0.7).dash(4, { space: 3 });
            doc
                .moveTo(blockX, blockY)
                .lineTo(blockX + blockW, blockY)
                .stroke();
            doc.undash();
            doc.restore();
            doc.save();
            doc.strokeColor('#000').lineWidth(0.6);
            doc.rect(blockX, blockY, blockW, blockH).stroke();
            doc.restore();
            const receiptW = mm(62);
            doc.save();
            doc.strokeColor('#000').lineWidth(0.6);
            doc
                .moveTo(blockX + receiptW, blockY)
                .lineTo(blockX + receiptW, blockY + blockH)
                .stroke();
            doc.restore();
            doc.font(fontBold).fontSize(10);
            doc.text('Récépissé', blockX + mm(3), blockY + mm(4));
            doc.text('Section paiement', blockX + receiptW + mm(3), blockY + mm(4));
            const label = (x, y, t) => {
                doc.font(fontBold).fontSize(7).fillColor('#000').text(t, x, y);
            };
            const value = (x, y, t, opts = {}) => {
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
            label(receiptX, receiptY, 'Compte / Payable à');
            value(receiptX, receiptY + mm(3.5), formatIban(data.creditorAccount));
            value(receiptX, receiptY + mm(10), 'A&G Fiduciaire Sàrl');
            value(receiptX, receiptY + mm(14), 'Impasse du nouveau marché 7');
            value(receiptX, receiptY + mm(18), '1723 Marly');
            label(receiptX, receiptY + mm(26), 'Référence');
            value(receiptX, receiptY + mm(29.5), formatRefReadable(referenceType === 'SCOR' ? reference : reference), { width: receiptW - mm(6) });
            label(receiptX, receiptY + mm(37), 'Payable par');
            value(receiptX, receiptY + mm(40.5), sanitize(data.debtor?.name), {
                width: receiptW - mm(6),
            });
            value(receiptX, receiptY + mm(44.5), sanitize(data.debtor?.address), {
                width: receiptW - mm(6),
            });
            value(receiptX, receiptY + mm(48.5), `${sanitize(data.debtor?.zip)} ${sanitize(data.debtor?.city)}`.trim(), { width: receiptW - mm(6) });
            label(receiptX, blockY + blockH - mm(18), 'Monnaie');
            value(receiptX, blockY + blockH - mm(14), 'CHF');
            label(receiptX + mm(22), blockY + blockH - mm(18), 'Montant');
            value(receiptX + mm(22), blockY + blockH - mm(14), money(data.amount));
            const qrBoxSize = mm(46);
            const qrBoxX = payX;
            const qrBoxY = payY + mm(4);
            doc.save();
            doc.strokeColor('#000').lineWidth(0.6);
            doc.rect(qrBoxX, qrBoxY, qrBoxSize, qrBoxSize).stroke();
            doc.restore();
            doc.image(qrBuffer, qrBoxX + mm(3), qrBoxY + mm(3), {
                width: qrBoxSize - mm(6),
            });
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
            value(infoX, payY + mm(48.5), `${sanitize(data.debtor?.zip)} ${sanitize(data.debtor?.city)}`.trim(), { width: infoW });
            label(infoX, blockY + blockH - mm(18), 'Monnaie');
            value(infoX, blockY + blockH - mm(14), 'CHF');
            label(infoX + mm(22), blockY + blockH - mm(18), 'Montant');
            value(infoX + mm(22), blockY + blockH - mm(14), money(data.amount));
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
    generateRFReference(input) {
        const base = input
            .replace(/[^a-zA-Z0-9]/g, '')
            .toUpperCase()
            .slice(0, 20);
        const temp = base + 'RF00';
        const converted = temp.replace(/[A-Z]/g, (c) => (c.charCodeAt(0) - 55).toString());
        const mod = BigInt(converted) % 97n;
        const checksum = (98n - mod).toString().padStart(2, '0');
        return `RF${checksum}${base}`;
    }
    isQrIban(iban) {
        const clean = iban.replace(/\s/g, '');
        if (!clean.startsWith('CH') || clean.length !== 21)
            return false;
        const iidStr = clean.slice(4, 9);
        if (!/^\d{5}$/.test(iidStr))
            return false;
        const iid = Number(iidStr);
        return iid >= 30000 && iid <= 31999;
    }
    mod10Recursive(referenceDigits) {
        const table = [0, 9, 4, 6, 8, 2, 7, 1, 3, 5];
        let carry = 0;
        for (const ch of referenceDigits) {
            carry = table[(carry + Number(ch)) % 10];
        }
        return String((10 - carry) % 10);
    }
    generateQrrReference(input) {
        const digits = String(input).replace(/\D/g, '');
        const base = digits.slice(-26).padStart(26, '0');
        const check = this.mod10Recursive(base);
        return base + check;
    }
    buildQrPayload(data) {
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
};
exports.QrBillService = QrBillService;
exports.QrBillService = QrBillService = __decorate([
    (0, common_1.Injectable)()
], QrBillService);
//# sourceMappingURL=qr-bill.service.js.map