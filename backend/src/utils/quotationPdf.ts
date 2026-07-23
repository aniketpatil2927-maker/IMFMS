import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { format } from 'date-fns';
import { toNumber } from './documentNumber.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEMPLATE_PATH = path.resolve(__dirname, '../../assets/quotation-template.pdf');

const BLACK = rgb(0, 0, 0);
const WHITE = rgb(1, 1, 1);
const PURPLE = rgb(0.38, 0.2, 0.6);

/** Template table column x positions (from original PDF drawings). */
const COL = {
  left: 24.5,
  afterNo: 54.2,
  afterDesc: 207.3,
  afterQty: 262.5,
  afterDuty: 326.2,
  afterRate: 411.2,
  right: 588.0,
} as const;

const TABLE_WIDTH = COL.right - COL.left;
const HEADER_H = 33.1;
const ROW_H = 17.0;

function formatDateDot(value: Date | string) {
  return format(new Date(value), 'dd.MM.yyyy');
}

function moneyPlain(n: number | string) {
  // Match template style: 40500/- (no grouping commas)
  return `${Math.round(Number(n))}/-`;
}

/** MuPDF top-left Y → pdf-lib bottom-left Y for a box of given height. */
function yBox(pageHeight: number, top: number, boxHeight: number) {
  return pageHeight - top - boxHeight;
}

/** Approximate text baseline from MuPDF top Y + font size. */
function yText(pageHeight: number, top: number, size: number) {
  return pageHeight - top - size + 1;
}

function drawVLine(
  page: ReturnType<PDFDocument['getPages']>[number],
  pageHeight: number,
  x: number,
  top: number,
  bottom: number,
) {
  page.drawLine({
    start: { x, y: yBox(pageHeight, bottom, 0) },
    end: { x, y: yBox(pageHeight, top, 0) },
    thickness: 0.75,
    color: BLACK,
  });
}

function drawHLine(
  page: ReturnType<PDFDocument['getPages']>[number],
  pageHeight: number,
  yTop: number,
  x0 = COL.left,
  x1 = COL.right,
) {
  page.drawLine({
    start: { x: x0, y: yBox(pageHeight, yTop, 0) },
    end: { x: x1, y: yBox(pageHeight, yTop, 0) },
    thickness: 0.75,
    color: BLACK,
  });
}

/**
 * Exact replica of the Immaculate Masters quotation template PDF.
 * Copies the 8-page branded template and overlays only:
 * - Client name / address / date (page 1)
 * - Rates table + closing (page 7)
 */
export async function buildQuotationPdf(quotation: {
  quotationNumber: string;
  date: Date;
  terms: string | null;
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
    serviceDescription: string;
    numberOfEmployees: number;
    duty?: string | null;
    rate: unknown;
    amount: unknown;
  }>;
}): Promise<Buffer> {
  if (!fs.existsSync(TEMPLATE_PATH)) {
    throw new Error(`Quotation template not found at ${TEMPLATE_PATH}`);
  }

  const templateBytes = fs.readFileSync(TEMPLATE_PATH);
  const pdfDoc = await PDFDocument.load(templateBytes);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const pages = pdfDoc.getPages();
  const page1 = pages[0];
  const page7 = pages[6];
  const { height } = page1.getSize();

  const clientName = quotation.client.companyName;
  const clientAddress = (quotation.site?.address || quotation.client.address || '')
    .replace(/\s+/g, ' ')
    .trim();

  // ---------- PAGE 1: replace Date + client name/address (keep "To,") ----------
  page1.drawRectangle({
    x: 460,
    y: yBox(height, 302, 18),
    width: 130,
    height: 18,
    color: WHITE,
  });
  page1.drawRectangle({
    x: 3,
    y: yBox(height, 320, 40),
    width: 420,
    height: 40,
    color: WHITE,
  });

  page1.drawText(`Date: ${formatDateDot(quotation.date)}`, {
    x: 468.7,
    y: yText(height, 304, 12),
    size: 12,
    font: fontBold,
    color: BLACK,
  });

  page1.drawText(clientName, {
    x: 54,
    y: yText(height, 323.2, 12),
    size: 12,
    font: fontBold,
    color: BLACK,
    maxWidth: 400,
  });

  page1.drawText(clientAddress, {
    x: 54,
    y: yText(height, 342.5, 12),
    size: 12,
    font: fontBold,
    color: BLACK,
    maxWidth: 400,
  });

  // ---------- PAGE 7: replace rates table + closing ----------
  const rows = quotation.items.map((item, index) => {
    const qty = item.numberOfEmployees;
    return {
      no: String(index + 1),
      desc: item.serviceDescription,
      qty: qty > 0 ? String(qty) : '-',
      duty: (item.duty?.trim() || (qty > 0 ? '8 Hrs' : '-')).toString(),
      rate: String(toNumber(item.rate as never)),
      total: moneyPlain(toNumber(item.amount as never)),
    };
  });

  const tableTop = 318.4;
  const tableH = HEADER_H + ROW_H * (rows.length + 1);
  const contentBottom = Math.max(tableTop + tableH + 160, 565);

  // Cover original title, table, and closing so dynamic rows never leave ghost text
  page7.drawRectangle({
    x: 20,
    y: yBox(height, 288, contentBottom - 288),
    width: 572,
    height: contentBottom - 288,
    color: WHITE,
  });

  const title = 'Quotation with rates for Housekeeping services';
  const titleSize = 14;
  const titleWidth = fontBold.widthOfTextAtSize(title, titleSize);
  const titleX = (612 - titleWidth) / 2;
  page7.drawText(title, {
    x: titleX,
    y: yText(height, 295.4, titleSize),
    size: titleSize,
    font: fontBold,
    color: BLACK,
  });
  page7.drawLine({
    start: { x: titleX, y: yBox(height, 307.5, 0) },
    end: { x: titleX + titleWidth, y: yBox(height, 307.5, 0) },
    thickness: 1,
    color: BLACK,
  });

  // Outer border
  page7.drawRectangle({
    x: COL.left,
    y: yBox(height, tableTop, tableH),
    width: TABLE_WIDTH,
    height: tableH,
    borderColor: BLACK,
    borderWidth: 0.75,
  });

  // Header band
  page7.drawRectangle({
    x: COL.left,
    y: yBox(height, tableTop, HEADER_H),
    width: TABLE_WIDTH,
    height: HEADER_H,
    borderColor: BLACK,
    borderWidth: 0.75,
  });

  const headerMidY = yText(height, tableTop + 10, 12);
  page7.drawText('Sr.', { x: 40.6, y: yText(height, 321.6, 12), size: 12, font: fontBold });
  page7.drawText('No.', { x: 38.4, y: yText(height, 338.2, 12), size: 12, font: fontBold });
  page7.drawText('Description', { x: 109.9, y: headerMidY, size: 12, font: fontBold });
  page7.drawText('Qty', { x: 216.2, y: headerMidY, size: 12, font: fontBold });
  page7.drawText('Duty', { x: 268.4, y: headerMidY, size: 12, font: fontBold });
  page7.drawText('Rate', { x: 343.4, y: headerMidY, size: 12, font: fontBold });
  page7.drawText('Total', { x: 491.1, y: headerMidY, size: 12, font: fontBold });

  const vCols = [COL.afterNo, COL.afterDesc, COL.afterQty, COL.afterDuty, COL.afterRate];
  for (const x of vCols) {
    drawVLine(page7, height, x, tableTop, tableTop + tableH);
  }

  let rowTop = tableTop + HEADER_H;
  drawHLine(page7, height, rowTop);

  for (const row of rows) {
    const textY = yText(height, rowTop + 3, 12);
    page7.drawText(row.no, { x: 38, y: textY, size: 12, font });
    page7.drawText(row.desc.slice(0, 28), {
      x: 60,
      y: textY,
      size: 12,
      font,
      maxWidth: COL.afterDesc - 66,
    });
    const qtyW = font.widthOfTextAtSize(row.qty, 12);
    page7.drawText(row.qty, {
      x: COL.afterDesc + (COL.afterQty - COL.afterDesc - qtyW) / 2,
      y: textY,
      size: 12,
      font,
    });
    const dutyW = font.widthOfTextAtSize(row.duty, 12);
    page7.drawText(row.duty, {
      x: COL.afterQty + (COL.afterDuty - COL.afterQty - dutyW) / 2,
      y: textY,
      size: 12,
      font,
    });
    page7.drawText(row.rate, {
      x: COL.afterDuty + 32,
      y: textY,
      size: 12,
      font,
    });
    page7.drawText(row.total, {
      x: COL.right - font.widthOfTextAtSize(row.total, 12) - 12,
      y: textY,
      size: 12,
      font,
    });

    rowTop += ROW_H;
    drawHLine(page7, height, rowTop);
  }

  const totalY = yText(height, rowTop + 3, 12);
  page7.drawText('Total', {
    x: 364.9,
    y: totalY,
    size: 12,
    font: fontBold,
  });
  const totalValue = moneyPlain(toNumber(quotation.subtotal as never));
  page7.drawText(totalValue, {
    x: COL.right - fontBold.widthOfTextAtSize(totalValue, 12) - 12,
    y: totalY,
    size: 12,
    font: fontBold,
  });

  rowTop += ROW_H;

  const gstPercent = toNumber(quotation.gstPercent as never);
  let cursorTop = rowTop + 28;

  if (gstPercent > 0) {
    const gstText = `GST (${gstPercent}%): ${moneyPlain(toNumber(quotation.gstAmount as never))}`;
    const grandText = `Grand Total: ${moneyPlain(toNumber(quotation.total as never))}`;
    page7.drawText(gstText, {
      x: COL.right - font.widthOfTextAtSize(gstText, 11) - 4,
      y: yText(height, cursorTop, 11),
      size: 11,
      font,
    });
    cursorTop += 16;
    page7.drawText(grandText, {
      x: COL.right - fontBold.widthOfTextAtSize(grandText, 12) - 4,
      y: yText(height, cursorTop, 12),
      size: 12,
      font: fontBold,
    });
    cursorTop += 24;
  }

  // Closing block (same wording / phones as template)
  page7.drawText('Please feel free to call us for any queries on 9356418873 / 8551074434', {
    x: 38.6,
    y: yText(height, cursorTop, 12),
    size: 12,
    font: fontBold,
    color: BLACK,
  });
  cursorTop += 26;
  page7.drawText('Thanking you and assuring you our best services at all times.', {
    x: 36,
    y: yText(height, cursorTop, 12),
    size: 12,
    font,
  });
  cursorTop += 25;
  page7.drawText('Sincerely Yours,', {
    x: 36,
    y: yText(height, cursorTop, 12),
    size: 12,
    font: fontBold,
  });
  cursorTop += 24;
  page7.drawText('Krishna Patil', {
    x: 36,
    y: yText(height, cursorTop, 12),
    size: 12,
    font: fontBold,
  });
  cursorTop += 25;
  page7.drawText('For Immaculate Masters Facility Management Services', {
    x: 36,
    y: yText(height, cursorTop, 12),
    size: 12,
    font: fontBold,
  });

  if (quotation.terms?.trim()) {
    cursorTop += 22;
    page7.drawText('Terms & Conditions:', {
      x: 36,
      y: yText(height, cursorTop, 10),
      size: 10,
      font: fontBold,
      color: PURPLE,
    });
    cursorTop += 14;
    page7.drawText(quotation.terms.trim().slice(0, 420), {
      x: 36,
      y: yText(height, cursorTop, 9),
      size: 9,
      font,
      maxWidth: 530,
      lineHeight: 12,
    });
  }

  const bytes = await pdfDoc.save();
  return Buffer.from(bytes);
}
