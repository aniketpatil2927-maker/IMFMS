import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import PDFDocument from 'pdfkit';
import { format } from 'date-fns';
import { env } from '../config/env.js';
import { toNumber } from './documentNumber.js';
import { amountInWordsInr } from './amountInWords.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOGO_PATH = path.resolve(__dirname, '../../assets/company-logo.png');

function money(n: number | string, decimals = 2) {
  return Number(n).toLocaleString('en-IN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function stateFromGst(gst: string | null | undefined) {
  if (!gst || gst.length < 2) return { name: 'MAHARASHTRA', code: '27' };
  const code = gst.slice(0, 2);
  if (code === '27') return { name: 'MAHARASHTRA', code: '27' };
  return { name: 'STATE', code };
}

function billForLabel(periodFrom: Date | string) {
  return format(new Date(periodFrom), 'MMM-yy');
}

type InvoicePdfData = {
  invoiceNumber: string;
  date: Date;
  periodFrom: Date;
  periodTo: Date;
  subtotal: unknown;
  gstPercent: unknown;
  gstAmount: unknown;
  total: unknown;
  client: {
    companyName: string;
    address: string;
    gstNumber: string | null;
    contactPerson: string;
    mobile: string;
  };
  site: { name: string; address: string };
  items: Array<{
    serviceDetails: string;
    quantity: unknown;
    rate: unknown;
    mandays?: unknown;
    actualMandays?: unknown;
    amount: unknown;
  }>;
};

/**
 * Tax invoice PDF matching Immaculate Masters / Loreal invoice format.
 */
export function buildInvoicePdf(invoice: InvoicePdfData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: 28, bottom: 36, left: 22, right: 22 },
    });
    const chunks: Buffer[] = [];
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const pageW = doc.page.width;
    const left = 22;
    const right = pageW - 22;
    const contentW = right - left;

    const company = env.company;
    const billingName = invoice.site?.name || invoice.client.companyName;
    const billingAddress = invoice.site?.address || invoice.client.address;
    const clientGst = invoice.client.gstNumber;
    const state = stateFromGst(clientGst);

    const gstPercent = toNumber(invoice.gstPercent as never);
    const subtotal = toNumber(invoice.subtotal as never);
    const gstAmount = toNumber(invoice.gstAmount as never);
    const total = toNumber(invoice.total as never);
    const halfGst = gstPercent / 2;
    const cgst = round2(gstAmount / 2);
    const sgst = round2(gstAmount - cgst);

    // ---------- Header with logo ----------
    const logoSize = 54;
    const hasLogo = fs.existsSync(LOGO_PATH);
    if (hasLogo) {
      doc.image(LOGO_PATH, left, 20, { width: logoSize, height: logoSize });
    }

    const headerTop = 22;
    doc
      .font('Helvetica-Bold')
      .fontSize(12)
      .fillColor('#111827')
      .text(company.name.toUpperCase(), left, headerTop, { width: contentW, align: 'center' });

    doc
      .font('Helvetica')
      .fontSize(9)
      .fillColor('#1f2937')
      .text(company.address, left, doc.y + 2, { width: contentW, align: 'center' });

    doc.text(`Mobile no - ${company.phone} , Mail ID: ${company.email}`, {
      width: contentW,
      align: 'center',
    });
    doc.font('Helvetica-Bold').text(`PAN NO - ${company.pan}`, { width: contentW, align: 'center' });
    doc.text(`GST NO - ${company.gst}`, { width: contentW, align: 'center' });

    // Keep content below logo
    doc.y = Math.max(doc.y, hasLogo ? 20 + logoSize + 6 : doc.y);

    doc.moveDown(0.35);
    doc.fontSize(16).text('INVOICE', { width: contentW, align: 'center', underline: true });
    doc.moveDown(0.45);

    // ---------- Billing / Bill meta box ----------
    const metaTop = doc.y;
    const metaH = 72;
    const metaMid = left + contentW * 0.52;

    doc.rect(left, metaTop, contentW, metaH).strokeColor('#111827').lineWidth(0.8).stroke();
    doc
      .moveTo(metaMid, metaTop)
      .lineTo(metaMid, metaTop + metaH)
      .stroke();

    // Left: Billing Address
    let y = metaTop + 6;
    doc.font('Helvetica-Bold').fontSize(9).fillColor('#111827').text('Billing Address:', left + 6, y);
    y = doc.y + 2;
    doc.font('Helvetica').fontSize(9).text(billingName, left + 6, y, { width: metaMid - left - 12 });
    doc.text(billingAddress, left + 6, doc.y, { width: metaMid - left - 12 });
    doc.text(`${state.name} - ${state.code}`, left + 6, doc.y + 2, { width: metaMid - left - 12 });
    if (clientGst) {
      doc.font('Helvetica-Bold').text(`GST NO. ${clientGst}`, left + 6, doc.y + 2, {
        width: metaMid - left - 12,
      });
    }

    // Right: Bill For / No / Date
    const rx = metaMid + 8;
    const rw = right - metaMid - 14;
    y = metaTop + 8;
    doc.font('Helvetica').fontSize(9);
    drawLabelValue(doc, rx, y, 'Bill For', billForLabel(invoice.periodFrom), rw);
    y += 14;
    drawLabelValue(doc, rx, y, 'Bill. No', invoice.invoiceNumber, rw);
    y += 14;
    drawLabelValue(doc, rx, y, 'Bill Date', format(new Date(invoice.date), 'dd.MM.yyyy'), rw);
    y += 16;
    doc.font('Helvetica').text('Reverse Charge- No.', rx, y, { width: rw });

    doc.y = metaTop + metaH + 10;

    // ---------- Line items table ----------
    const cols = [
      { key: 'sr', label: 'Sr.\nNo.', w: 28 },
      { key: 'part', label: 'Particulars', w: 150 },
      { key: 'qty', label: 'QTY as\nper W.O.', w: 48 },
      { key: 'rate', label: 'Rate Per\nDay', w: 58 },
      { key: 'md', label: 'Mandays', w: 52 },
      { key: 'amd', label: 'Actual Mandays\n/ OT hours', w: 78 },
      { key: 'amt', label: 'Amount', w: contentW - 28 - 150 - 48 - 58 - 52 - 78 },
    ] as const;

    const headerH = 28;
    let tableY = doc.y;
    drawTableHeader(doc, left, tableY, headerH, cols);
    tableY += headerH;

    const rowH = 18;
    invoice.items.forEach((item, index) => {
      const qty = toNumber(item.quantity as never);
      const rate = toNumber(item.rate as never);
      const mandays = item.mandays != null ? toNumber(item.mandays as never) : null;
      const actual = item.actualMandays != null ? toNumber(item.actualMandays as never) : null;
      const amount = toNumber(item.amount as never);

      const values = [
        String(index + 1),
        item.serviceDetails,
        qty > 0 ? money(qty, qty % 1 === 0 ? 0 : 2) : '',
        rate > 0 ? money(rate) : '-',
        mandays != null && mandays > 0 ? money(mandays) : '-',
        actual != null && actual > 0 ? money(actual) : '-',
        amount > 0 ? money(amount) : '-',
      ];

      if (tableY + rowH > doc.page.height - 200) {
        doc.addPage();
        tableY = 40;
        drawTableHeader(doc, left, tableY, headerH, cols);
        tableY += headerH;
      }

      drawTableRow(doc, left, tableY, rowH, cols, values, false);
      tableY += rowH;
    });

    // Pad a few empty rows for look (like blank lines in Word)
    const minRows = 6;
    const filled = invoice.items.length;
    for (let i = filled; i < minRows; i += 1) {
      drawTableRow(doc, left, tableY, rowH, cols, ['', '', '', '', '', '', ''], false);
      tableY += rowH;
    }

    doc.y = tableY + 8;

    // ---------- Bank details + totals ----------
    const boxTop = doc.y;
    const boxH = 108;
    const splitX = left + contentW * 0.48;

    doc.rect(left, boxTop, contentW, boxH).strokeColor('#111827').lineWidth(0.8).stroke();
    doc
      .moveTo(splitX, boxTop)
      .lineTo(splitX, boxTop + boxH)
      .stroke();

    // Bank
    y = boxTop + 6;
    doc.font('Helvetica-Bold').fontSize(9).text('BANK DETAILS', left + 8, y);
    y += 14;
    doc.font('Helvetica').fontSize(8.5);
    const bankLines = [
      `BANK NAME - ${company.bankName.toUpperCase()}`,
      `ACCOUNT NO - ${company.bankAccount}`,
      `IFSC CODE - ${company.bankIfsc}`,
      `BRANCH - ${company.bankBranch.toUpperCase()}`,
      `A/C TYPE - ${company.bankAccountType.toUpperCase()}`,
    ];
    for (const line of bankLines) {
      doc.text(line, left + 8, y, { width: splitX - left - 16 });
      y += 12;
    }

    // Totals
    const tx = splitX + 8;
    const tw = right - splitX - 16;
    const labelW = tw * 0.68;
    const valW = tw * 0.32;
    y = boxTop + 8;
    const totalRows: Array<[string, string, boolean]> = [
      ['Total Bill Amount before Tax', money(subtotal), false],
      [`CGST @ ${money(halfGst)}%`, money(cgst), false],
      [`SGST @ ${money(halfGst)}%`, money(sgst), false],
      ['Gross Bill Amount', money(total), true],
      ['Rounded to Rs.', money(Math.round(total), 0), true],
    ];
    for (const [label, value, bold] of totalRows) {
      doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(9);
      doc.text(label, tx, y, { width: labelW });
      doc.text(value, tx + labelW, y, { width: valW, align: 'right' });
      y += 16;
    }

    doc.y = boxTop + boxH + 10;

    // Amount in words
    doc
      .font('Helvetica-Bold')
      .fontSize(9)
      .text(`Total Amount  ${amountInWordsInr(Math.round(total))}`, left, doc.y, {
        width: contentW,
      });

    doc.moveDown(0.8);
    doc
      .font('Helvetica')
      .fontSize(9)
      .text('Remarks:  Certified that the particulars given above are true and correct', left, doc.y, {
        width: contentW,
      });

    doc.moveDown(0.6);
    doc.text('Payment requested by crossed cheque "A/c payee" or NEFT/RTGS before the 10th of next month.', {
      width: contentW,
    });

    doc.moveDown(1.4);
    doc
      .font('Helvetica-Bold')
      .fontSize(9)
      .text(`FOR ${company.name.toUpperCase()}`, left, doc.y, { width: contentW, align: 'right' });

    doc.moveDown(2.2);
    doc.font('Helvetica').text(company.signatory, left, doc.y, { width: contentW, align: 'right' });
    doc.font('Helvetica-Bold').text('Authorised Signatory', left, doc.y + 2, {
      width: contentW,
      align: 'right',
    });

    doc.end();
  });
}

function round2(n: number) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

function drawLabelValue(
  doc: PDFKit.PDFDocument,
  x: number,
  y: number,
  label: string,
  value: string,
  width: number,
) {
  const labelText = `${label}: `;
  doc.font('Helvetica-Bold').fontSize(9);
  const labelW = doc.widthOfString(labelText);
  doc.text(labelText, x, y, { lineBreak: false });
  doc.font('Helvetica').text(value, x + labelW, y, {
    width: Math.max(40, width - labelW),
    lineBreak: false,
  });
}

function drawTableHeader(
  doc: PDFKit.PDFDocument,
  x: number,
  y: number,
  h: number,
  cols: ReadonlyArray<{ label: string; w: number }>,
) {
  let cx = x;
  doc.rect(x, y, cols.reduce((s, c) => s + c.w, 0), h).strokeColor('#111827').lineWidth(0.8).stroke();
  for (const col of cols) {
    doc
      .moveTo(cx, y)
      .lineTo(cx, y + h)
      .stroke();
    doc
      .font('Helvetica-Bold')
      .fontSize(7.5)
      .fillColor('#111827')
      .text(col.label, cx + 2, y + 4, { width: col.w - 4, align: 'center' });
    cx += col.w;
  }
  doc
    .moveTo(cx, y)
    .lineTo(cx, y + h)
    .stroke();
}

function drawTableRow(
  doc: PDFKit.PDFDocument,
  x: number,
  y: number,
  h: number,
  cols: ReadonlyArray<{ w: number }>,
  values: string[],
  _bold: boolean,
) {
  const totalW = cols.reduce((s, c) => s + c.w, 0);
  doc.rect(x, y, totalW, h).strokeColor('#111827').lineWidth(0.6).stroke();
  let cx = x;
  values.forEach((val, i) => {
    const col = cols[i];
    doc
      .moveTo(cx, y)
      .lineTo(cx, y + h)
      .stroke();
    const align = i === 1 ? 'left' : 'center';
    doc
      .font('Helvetica')
      .fontSize(8)
      .fillColor('#111827')
      .text(val, cx + 2, y + 5, { width: col.w - 4, align, lineBreak: false, ellipsis: true });
    cx += col.w;
  });
  doc
    .moveTo(cx, y)
    .lineTo(cx, y + h)
    .stroke();
}
