"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.QrBillService = void 0;
const common_1 = require("@nestjs/common");
const pdfkit_1 = __importDefault(require("pdfkit"));
const qrcode_1 = __importDefault(require("qrcode"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
let QrBillService = class QrBillService {
    async generateQrBillPdf(data) {
        const amount = Number(data.amount || 0);
        const tvaRate = Number(data.tvaRate ?? 8.1);
        const grandTotal = Number(data.totalAmount != null ? data.totalAmount : amount);
        const payloadData = { ...data, amount: grandTotal };
        const payload = this.buildQrPayload(payloadData);
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
            const sanitize = (v) => safe(v)
                .replace(/[\u0000-\u001F\u007F]/g, '')
                .replace(/\uFFFD/g, '')
                .trim();
            const moneyPayload = (v) => Number(v || 0).toFixed(2);
            const moneyDisplay = (v) => moneyPayload(v).replace('.', ',');
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
            const formatDateCH = (d) => {
                const dd = String(d.getDate()).padStart(2, '0');
                const mm2 = String(d.getMonth() + 1).padStart(2, '0');
                const yyyy = d.getFullYear();
                return `${dd}.${mm2}.${yyyy}`;
            };
            const iban = safe(data.creditorAccount).replace(/\s/g, '');
            const useQrIban = this.isQrIban(iban);
            const reference = useQrIban
                ? this.generateQrrReference(data.reference || '0')
                : this.generateRFReference(data.reference || 'INV');
            const contentX = doc.page.margins.left;
            const contentW = pageW - doc.page.margins.left - doc.page.margins.right;
            const BLUE = '#0B5E8C';
            const LIGHT_ROW = '#EAF3FA';
            const headerTopY = doc.y;
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
            doc.text('Taxero.ch', headerTextX, headerTopY, { width: contentW });
            doc.font(fontBold).fontSize(9);
            doc.text('A&G Fiduciaire Sàrl', headerTextX, headerTopY + mm(7), {
                width: contentW,
            });
            doc.font(fontRegular).fontSize(9);
            doc.text('Route de Moncor 14', headerTextX, headerTopY + mm(11), {
                width: contentW,
            });
            doc.text('1752 Villars sur Glâne', headerTextX, headerTopY + mm(15), {
                width: contentW,
            });
            doc.text('CHE-450.723.829 VAT', headerTextX, headerTopY + mm(19), {
                width: contentW,
            });
            doc.y = headerTopY + mm(30);
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
            doc.text(sanitize(data.clientNumber || ''), metaLeftX + mm(30), metaTopY + mm(12));
            doc.text(sanitize(data.dueDate || ''), metaLeftX + mm(30), metaTopY + mm(18));
            doc.text('1', metaLeftX + mm(30), metaTopY + mm(24));
            doc.font(fontRegular).fontSize(11);
            doc.text([
                sanitize(data.debtor?.name),
                sanitize(data.debtor?.address),
                `${sanitize(data.debtor?.zip)} ${sanitize(data.debtor?.city)}`.trim(),
            ]
                .filter(Boolean)
                .join('\n'), debtorX, metaTopY, { width: contentX + contentW - debtorX, lineGap: 2 });
            doc.y = metaTopY + mm(40);
            doc.font(fontBold).fontSize(16).fillColor(BLUE);
            doc.text(`Facture ${invNo}`, contentX, doc.y, { width: contentW });
            doc.moveDown(0.8);
            const tableX = contentX;
            const tableW = contentW;
            const colDescW = mm(88);
            const colQtyW = mm(20);
            const colUnitW = mm(20);
            const colUnitPriceW = mm(30);
            const colAmountW = tableW - (colDescW + colQtyW + colUnitW + colUnitPriceW);
            const headerH = mm(8);
            const rowH = mm(8);
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
            doc.text('Prix Unitaire', tableX + colDescW + colQtyW + colUnitW, tableHeaderY + mm(1.7), { width: colUnitPriceW, align: 'right' });
            doc.text('Montant', tableX + colDescW + colQtyW + colUnitW + colUnitPriceW, tableHeaderY + mm(1.7), { width: colAmountW, align: 'right' });
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
            doc.text(moneyDisplay(grandTotal), tableX + colDescW + colQtyW + colUnitW, rowY + mm(1.8), { width: colUnitPriceW, align: 'right' });
            doc.text(moneyDisplay(grandTotal), tableX + colDescW + colQtyW + colUnitW + colUnitPriceW, rowY + mm(1.8), { width: colAmountW, align: 'right' });
            const lineY = rowY + rowH;
            doc.save();
            doc.strokeColor(BLUE).lineWidth(1.2);
            doc
                .moveTo(tableX, lineY)
                .lineTo(tableX + tableW, lineY)
                .stroke();
            doc.restore();
            doc.y = lineY + mm(6);
            const totalNet = grandTotal / (1 + tvaRate / 100);
            const tvaValue = grandTotal - totalNet;
            const boxW = mm(55);
            const boxX = tableX + tableW - boxW;
            let boxY = doc.y;
            const summaryRow2 = (labelText, valueText, isBold = false) => {
                doc.font(isBold ? fontBold : fontRegular).fontSize(isBold ? 10.8 : 10);
                doc.fillColor('#000');
                doc.text(labelText, boxX, boxY, { width: mm(26) });
                doc.text(valueText, boxX + mm(26), boxY, {
                    width: boxW - mm(26),
                    align: 'right',
                });
                boxY += mm(6);
            };
            summaryRow2('Net', moneyDisplay(totalNet));
            summaryRow2(`VAT (${tvaRate.toFixed(1)}%)`, moneyDisplay(tvaValue));
            summaryRow2('Total', moneyDisplay(grandTotal), true);
            doc.y = Math.max(doc.y, boxY + mm(2));
            const blockH = mm(92);
            const blockY = pageH - doc.page.margins.bottom - blockH;
            const blockX = contentX;
            const blockW2 = contentW;
            const clampY = (y) => Math.min(y, blockY + blockH - mm(6));
            const cutY = blockY - mm(6);
            doc.save();
            doc.strokeColor('#000').lineWidth(0.7).dash(4, { space: 3 });
            doc
                .moveTo(blockX, cutY)
                .lineTo(blockX + blockW2, cutY)
                .stroke();
            doc.undash();
            doc.restore();
            doc.font(fontRegular).fontSize(14).fillColor('#000');
            doc.text('✂', blockX + mm(2), cutY - mm(4));
            const receiptW = mm(70);
            const splitX = blockX + receiptW;
            doc.save();
            doc.strokeColor('#000').lineWidth(0.6).dash(3, { space: 3 });
            doc
                .moveTo(splitX, blockY)
                .lineTo(splitX, blockY + blockH)
                .stroke();
            doc.undash();
            doc.restore();
            doc.font(fontBold).fontSize(12).fillColor('#000');
            doc.text('Récépissé', blockX + mm(2), blockY + mm(4));
            doc.text('Section paiement', splitX + mm(8), blockY + mm(4));
            const label = (x, y, t) => {
                doc.font(fontBold).fontSize(8).fillColor('#000').text(t, x, clampY(y));
            };
            const value = (x, y, t, opts = {}) => {
                doc
                    .font(fontRegular)
                    .fontSize(9)
                    .fillColor('#000')
                    .text(t, x, clampY(y), { lineGap: 1.4, ...opts });
            };
            const receiptValue = (x, y, t, opts = {}) => {
                doc
                    .font(fontRegular)
                    .fontSize(8.7)
                    .fillColor('#000')
                    .text(t, x, clampY(y), {
                    width: receiptW - mm(6),
                    lineGap: 1,
                    ...opts,
                });
            };
            const rX = blockX + mm(2);
            const rY = blockY + mm(16);
            label(rX, rY, 'Compte / Payable à');
            receiptValue(rX, rY + mm(4), formatIban(data.creditorAccount));
            receiptValue(rX, rY + mm(10), 'A&G Fiduciaire Sàrl');
            receiptValue(rX, rY + mm(14), 'Impasse du nouveau marché 7');
            receiptValue(rX, rY + mm(18), '1723 Marly');
            label(rX, rY + mm(28), 'Référence');
            receiptValue(rX, rY + mm(32), formatRefReadable(reference), {
                width: receiptW - mm(6),
            });
            const rbBaseY = blockY + blockH - mm(16);
            const bottomReservedTop = rbBaseY - mm(8);
            const fitTextByFont = (text, maxWidth, maxHeight, startSize = 8.7, minSize = 6.5) => {
                const t = (text ?? '').trim();
                if (!t)
                    return { text: '', fontSize: startSize };
                for (let fs2 = startSize; fs2 >= minSize; fs2 -= 0.2) {
                    doc.font(fontRegular).fontSize(fs2);
                    const h = doc.heightOfString(t, { width: maxWidth, lineGap: 1 });
                    if (h <= maxHeight)
                        return { text: t, fontSize: fs2 };
                }
                return { text: t, fontSize: minSize };
            };
            const payableLabelY = rY + mm(38);
            label(rX, payableLabelY, 'Payable par');
            const payableTextY = payableLabelY + mm(4);
            const availableH = Math.max(0, bottomReservedTop - payableTextY);
            const debtorBlock = [
                sanitize(data.debtor?.name),
                sanitize(data.debtor?.address),
                [sanitize(data.debtor?.zip), sanitize(data.debtor?.city)]
                    .filter(Boolean)
                    .join(' ')
                    .trim(),
                sanitize(data.debtor?.country),
            ]
                .filter(Boolean)
                .join('\n');
            const maxW = receiptW - mm(6);
            const fitted = fitTextByFont(debtorBlock, maxW, availableH);
            doc.font(fontRegular).fontSize(fitted.fontSize).fillColor('#000');
            doc.text(fitted.text, rX, clampY(payableTextY), {
                width: maxW,
                lineGap: 1,
            });
            label(rX, rbBaseY - mm(5), 'Monnaie');
            label(rX + mm(18), rbBaseY - mm(5), 'Montant');
            value(rX, rbBaseY, 'CHF');
            value(rX + mm(18), rbBaseY, moneyPayload(grandTotal));
            doc.font(fontBold).fontSize(8).fillColor('#000');
            doc.text('Point de dépôt', blockX, clampY(blockY + blockH - mm(6)), {
                width: receiptW,
                align: 'center',
            });
            const pX = splitX + mm(8);
            const pY = blockY + mm(16);
            const qrSize = mm(46);
            const qrX = pX;
            const qrY = pY + mm(6);
            doc.image(qrBuffer, qrX, qrY, { width: qrSize, height: qrSize });
            const crossBox = mm(10);
            const cx = qrX + qrSize / 2 - crossBox / 2;
            const cy = qrY + qrSize / 2 - crossBox / 2;
            doc.save();
            doc.rect(cx, cy, crossBox, crossBox).fill('#fff');
            let crossPng = null;
            try {
                const envPath = process.env.QR_CROSS_PATH
                    ? path.resolve(process.env.QR_CROSS_PATH)
                    : null;
                const mntPath = '/mnt/data/CH-Kreuz_7mm.png';
                const relPath = path.join(process.cwd(), 'src/assets/CH-Kreuz_7mm.png');
                const chosen = (envPath && fs.existsSync(envPath) && envPath) ||
                    (fs.existsSync(mntPath) && mntPath) ||
                    relPath;
                if (fs.existsSync(chosen))
                    crossPng = fs.readFileSync(chosen);
            }
            catch {
                crossPng = null;
            }
            if (crossPng) {
                doc.image(crossPng, cx, cy, { width: crossBox, height: crossBox });
            }
            else {
                doc.strokeColor('#000').lineWidth(1.4);
                doc
                    .moveTo(cx + crossBox / 2, cy + mm(1.2))
                    .lineTo(cx + crossBox / 2, cy + crossBox - mm(1.2))
                    .stroke();
                doc
                    .moveTo(cx + mm(1.2), cy + crossBox / 2)
                    .lineTo(cx + crossBox - mm(1.2), cy + crossBox / 2)
                    .stroke();
            }
            doc.restore();
            const underY = clampY(qrY + qrSize + mm(6));
            label(qrX + mm(2), underY, 'Monnaie');
            label(qrX + mm(22), underY, 'Montant');
            value(qrX + mm(2), underY + mm(5), 'CHF');
            value(qrX + mm(22), underY + mm(5), moneyPayload(grandTotal));
            const infoX = qrX + qrSize + mm(14);
            const infoW = blockX + blockW2 - infoX - mm(2);
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
            value(infoX, pY + mm(56), `${sanitize(data.debtor?.zip)} ${sanitize(data.debtor?.city)}`.trim(), { width: infoW });
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