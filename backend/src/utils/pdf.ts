import PDFDocument from 'pdfkit';
import { format } from 'date-fns';
import { env } from '../config/env.js';
import { toNumber } from './documentNumber.js';

function money(n: number | string) {
  return `₹ ${Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(value: Date | string) {
  return format(new Date(value), 'dd MMM yyyy');
}

/** Letterhead matching Immaculate Masters quotation template */
function drawLetterhead(doc: PDFKit.PDFDocument) {
  const left = 50;
  const right = 545;

  doc
    .font('Helvetica-Bold')
    .fontSize(12)
    .fillColor('#111827')
    .text(env.company.name.toUpperCase(), left, 40, { width: 360, align: 'left' });

  doc
    .font('Helvetica')
    .fontSize(9)
    .fillColor('#334155')
    .text(env.company.address, left, doc.y + 2, { width: 360 })
    .text(env.company.email, left, doc.y + 1, { width: 360 });

  doc
    .font('Helvetica-Bold')
    .fontSize(10)
    .fillColor('#111827')
    .text(env.company.phone, right - 110, 40, { width: 110, align: 'right' });

  const y = Math.max(doc.y, 78) + 6;
  doc
    .strokeColor('#94a3b8')
    .lineWidth(1)
    .moveTo(left, y)
    .lineTo(right, y)
    .stroke();

  doc.y = y + 12;
}

/** Quotation PDFs use the branded template stamp in quotationPdf.ts */
export { buildQuotationPdf } from './quotationPdf.js';
/** Invoice PDFs use the Loreal / tax-invoice layout in invoicePdf.ts */
export { buildInvoicePdf } from './invoicePdf.js';


export function buildBillPdf(bill: {
  billNumber: string;
  billingMonth: string;
  attendanceYear: number;
  attendanceMonth: number;
  totalEmployees: number;
  amount: unknown;
  gstPercent: unknown;
  gstAmount: unknown;
  grandTotal: unknown;
  invoice: {
    invoiceNumber: string;
    client: { companyName: string; address: string; gstNumber: string | null };
    site: { name: string; address: string };
  };
}): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    const chunks: Buffer[] = [];
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    drawLetterhead(doc);
    doc.fontSize(14).fillColor('#0f172a').font('Helvetica-Bold').text('MONTHLY BILL', { align: 'center' }).moveDown();
    doc.font('Helvetica').fontSize(10).fillColor('#334155');
    doc.text(`Bill No: ${bill.billNumber}`);
    doc.text(`Billing Month: ${bill.billingMonth}`);
    doc.text(`Invoice Reference: ${bill.invoice.invoiceNumber}`);
    doc.text(
      `Attendance Reference: ${String(bill.attendanceMonth).padStart(2, '0')}/${bill.attendanceYear}`,
    );
    doc.moveDown();
    doc.text(`Client: ${bill.invoice.client.companyName}`);
    doc.text(`Address: ${bill.invoice.client.address}`);
    if (bill.invoice.client.gstNumber) doc.text(`GST: ${bill.invoice.client.gstNumber}`);
    doc.text(`Site: ${bill.invoice.site.name}`);
    doc.moveDown();
    doc.text(`Total Employees (Attendance): ${bill.totalEmployees}`);
    doc.text(`Amount: ${money(toNumber(bill.amount as never))}`);
    doc.text(`GST (${toNumber(bill.gstPercent as never)}%): ${money(toNumber(bill.gstAmount as never))}`);
    doc.font('Helvetica-Bold').text(`Grand Total: ${money(toNumber(bill.grandTotal as never))}`);
    doc.end();
  });
}

export function buildAttendancePdf(payload: {
  title: string;
  siteName?: string;
  records: Array<{
    date: Date;
    status: string;
    employee: { employeeCode: string; name: string; designation: string };
    site?: { name: string };
  }>;
}): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 40, size: 'A4', layout: 'landscape' });
    const chunks: Buffer[] = [];
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    drawLetterhead(doc);
    doc.fontSize(14).fillColor('#0f172a').font('Helvetica-Bold').text(payload.title, { align: 'center' }).moveDown();
    if (payload.siteName) doc.font('Helvetica').fontSize(10).text(`Site: ${payload.siteName}`).moveDown();

    doc.fontSize(9).font('Helvetica-Bold');
    const y0 = doc.y;
    doc.text('Date', 40, y0, { width: 80 });
    doc.text('Emp ID', 120, y0, { width: 80 });
    doc.text('Name', 200, y0, { width: 160 });
    doc.text('Designation', 370, y0, { width: 120 });
    doc.text('Site', 500, y0, { width: 120 });
    doc.text('Status', 630, y0, { width: 80 });
    doc.font('Helvetica').moveDown(0.6);

    for (const row of payload.records) {
      if (doc.y > 520) {
        doc.addPage();
        drawLetterhead(doc);
      }
      const y = doc.y;
      doc.text(formatDate(row.date), 40, y, { width: 80 });
      doc.text(row.employee.employeeCode, 120, y, { width: 80 });
      doc.text(row.employee.name, 200, y, { width: 160 });
      doc.text(row.employee.designation, 370, y, { width: 120 });
      doc.text(row.site?.name ?? payload.siteName ?? '-', 500, y, { width: 120 });
      doc.text(row.status.replace('_', ' '), 630, y, { width: 80 });
      doc.moveDown(0.55);
    }

    doc.end();
  });
}

export function buildGenericPdfTable(payload: {
  title: string;
  subtitle?: string;
  columns: Array<{ header: string; key: string; width: number; align?: 'left' | 'right' | 'center' }>;
  rows: Array<Record<string, unknown>>;
}): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      layout: 'landscape',
      margins: { top: 30, bottom: 35, left: 30, right: 30 },
    });
    const chunks: Buffer[] = [];
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const pageW = doc.page.width;
    const pageH = doc.page.height;
    const left = 30;
    const contentW = pageW - 60;

    const drawHeader = () => {
      doc
        .font('Helvetica-Bold')
        .fontSize(11)
        .fillColor('#0f766e')
        .text(env.company.name.toUpperCase(), left, 26, { width: contentW, align: 'left' });

      doc
        .font('Helvetica')
        .fontSize(8)
        .fillColor('#64748b')
        .text(`${env.company.address} | Contact: ${env.company.phone}`, left, 39, { width: contentW, align: 'left' });

      doc
        .font('Helvetica')
        .fontSize(8)
        .fillColor('#64748b')
        .text(`Generated: ${format(new Date(), 'dd MMM yyyy, HH:mm')}`, left, 26, { width: contentW, align: 'right' });

      doc
        .strokeColor('#cbd5e1')
        .lineWidth(0.8)
        .moveTo(left, 50)
        .lineTo(left + contentW, 50)
        .stroke();

      doc
        .font('Helvetica-Bold')
        .fontSize(13)
        .fillColor('#0f172a')
        .text(payload.title.toUpperCase(), left, 56, { width: contentW, align: 'left' });

      if (payload.subtitle) {
        doc
          .font('Helvetica')
          .fontSize(8.5)
          .fillColor('#64748b')
          .text(payload.subtitle, left, doc.y + 1, { width: contentW, align: 'left' });
      }

      const tableTop = Math.max(doc.y + 6, 82);
      const headerH = 22;

      // Table Header row background
      doc.rect(left, tableTop, contentW, headerH).fillColor('#0f766e').fill();

      // Table Header text
      let curX = left;
      payload.columns.forEach((col) => {
        doc
          .font('Helvetica-Bold')
          .fontSize(8.5)
          .fillColor('#ffffff')
          .text(col.header, curX + 4, tableTop + 6, {
            width: col.width - 8,
            align: col.align || 'left',
          });
        curX += col.width;
      });

      return tableTop + headerH;
    };

    let tableY = drawHeader();
    const rowH = 18;

    payload.rows.forEach((row, idx) => {
      if (tableY + rowH > pageH - 45) {
        doc.addPage();
        tableY = drawHeader();
      }

      const isEven = idx % 2 === 0;
      doc
        .rect(left, tableY, contentW, rowH)
        .fillColor(isEven ? '#ffffff' : '#f8fafc')
        .fill();

      doc
        .rect(left, tableY, contentW, rowH)
        .strokeColor('#e2e8f0')
        .lineWidth(0.5)
        .stroke();

      let curX = left;
      payload.columns.forEach((col) => {
        const val = row[col.key];
        const textVal = val !== undefined && val !== null ? String(val) : '-';
        doc
          .font('Helvetica')
          .fontSize(8)
          .fillColor('#1e293b')
          .text(textVal, curX + 4, tableY + 5, {
            width: col.width - 8,
            align: col.align || 'left',
            ellipsis: true,
          });
        curX += col.width;
      });

      tableY += rowH;
    });

    doc.end();
  });
}

export interface AttendanceRegisterPdfPayload {
  siteName: string;
  month: number;
  year: number;
  employees: Array<{
    serial?: number;
    employeeCode?: string;
    name: string;
    designation: string;
    days: Record<number, string>;
    wDays?: number;
    wo?: number;
    otLeave?: number;
    total?: number;
  }>;
  hkSupDays?: number;
  hkDays?: number;
  totalDays?: number;
}

export function buildExactAttendanceRegisterPdf(payload: AttendanceRegisterPdfPayload): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      layout: 'landscape',
      margins: { top: 20, bottom: 20, left: 24, right: 24 },
    });
    const chunks: Buffer[] = [];
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const year = Number(payload.year) || new Date().getFullYear();
    const month = Number(payload.month) || (new Date().getMonth() + 1);
    const monthName = new Date(year, month - 1, 1).toLocaleString('en', { month: 'long' });
    const daysInMonth = new Date(year, month, 0).getDate();

    const left = 24;
    const right = 841.89 - 24;
    const tableWidth = right - left; // ~793.89

    const colSr = 22;
    const colName = 120;
    const colDesig = 75;
    const colWD = 28;
    const colWO = 25;
    const colOT = 27;
    const colTotal = 31;
    const fixedWidth = colSr + colName + colDesig + colWD + colWO + colOT + colTotal; // 328
    const dayColWidth = Math.floor((tableWidth - fixedWidth) / daysInMonth); // ~15
    const actualDaysWidth = dayColWidth * daysInMonth;
    const extra = tableWidth - (fixedWidth + actualDaysWidth);

    const drawHeader = () => {
      // Title
      doc.font('Helvetica-Bold').fontSize(14).fillColor('#702FA0').text(
        'IMMACULATE MASTERS FACILITY MANAGEMENT SERVICES',
        left,
        22,
        { width: tableWidth, align: 'center' },
      );

      // Sub-header
      const subY = 40;
      doc.font('Helvetica-Bold').fontSize(10).fillColor('#0f172a');
      doc.text(`Site Name :-  `, left, subY, { continued: true });
      doc.font('Helvetica-Bold').text(payload.siteName || 'Facility Site');

      doc.font('Helvetica-Bold').fontSize(10).fillColor('#0f172a').text(
        `Month :  ${monthName} ${year}`,
        left,
        subY,
        { width: tableWidth, align: 'right' },
      );

      // Separator line
      doc.strokeColor('#cbd5e1').lineWidth(0.8).moveTo(left, subY + 16).lineTo(right, subY + 16).stroke();

      // Table Header Row
      const headY = subY + 22;
      const headH = 24;

      doc.rect(left, headY, tableWidth, headH).fillColor('#f8fafc').fill();
      doc.rect(left, headY, tableWidth, headH).strokeColor('#000000').lineWidth(0.6).stroke();

      let curX = left;

      // Sr No
      doc.rect(curX, headY, colSr, headH).strokeColor('#000000').lineWidth(0.5).stroke();
      doc.font('Helvetica-Bold').fontSize(7.5).fillColor('#000000').text('Sr No', curX, headY + 7, { width: colSr, align: 'center' });
      curX += colSr;

      // Employee Name
      doc.rect(curX, headY, colName, headH).strokeColor('#000000').lineWidth(0.5).stroke();
      doc.font('Helvetica-Bold').fontSize(8).fillColor('#000000').text('Employee Name', curX + 4, headY + 7, { width: colName - 8, align: 'left' });
      curX += colName;

      // Designation
      doc.rect(curX, headY, colDesig, headH).strokeColor('#000000').lineWidth(0.5).stroke();
      doc.font('Helvetica-Bold').fontSize(7.5).fillColor('#000000').text('Designation', curX + 4, headY + 7, { width: colDesig - 8, align: 'left' });
      curX += colDesig;

      // Days 1..daysInMonth
      for (let d = 1; d <= daysInMonth; d++) {
        const isSun = new Date(year, month - 1, d).getDay() === 0;
        if (isSun) {
          doc.rect(curX, headY, dayColWidth, headH).fillColor('#fee2e2').fill();
        }
        doc.rect(curX, headY, dayColWidth, headH).strokeColor('#000000').lineWidth(0.5).stroke();
        doc.font('Helvetica-Bold').fontSize(isSun ? 8 : 7.5).fillColor(isSun ? '#b91c1c' : '#000000').text(
          String(d),
          curX,
          headY + 7,
          { width: dayColWidth, align: 'center' },
        );
        curX += dayColWidth;
      }

      // W Days
      doc.rect(curX, headY, colWD, headH).strokeColor('#000000').lineWidth(0.5).stroke();
      doc.font('Helvetica-Bold').fontSize(7).fillColor('#000000').text('W Days', curX, headY + 7, { width: colWD, align: 'center' });
      curX += colWD;

      // W/O
      doc.rect(curX, headY, colWO, headH).strokeColor('#000000').lineWidth(0.5).stroke();
      doc.font('Helvetica-Bold').fontSize(7).fillColor('#000000').text('W/O', curX, headY + 7, { width: colWO, align: 'center' });
      curX += colWO;

      // OT Hrs
      doc.rect(curX, headY, colOT, headH).strokeColor('#000000').lineWidth(0.5).stroke();
      doc.font('Helvetica-Bold').fontSize(6.5).fillColor('#000000').text('OT Hrs', curX, headY + 7, { width: colOT, align: 'center' });
      curX += colOT;

      // TOTAL
      const lastW = colTotal + extra;
      doc.rect(curX, headY, lastW, headH).strokeColor('#000000').lineWidth(0.5).stroke();
      doc.font('Helvetica-Bold').fontSize(7.5).fillColor('#000000').text('TOTAL', curX, headY + 7, { width: lastW, align: 'center' });

      return headY + headH;
    };

    let tableY = drawHeader();
    const rowH = 17;
    const maxRowsPerPage = 20;
    let rowCount = 0;

    let hkSupTotal = 0;
    let hkStaffTotal = 0;

    (payload.employees || []).forEach((emp, empIdx) => {
      if (rowCount >= maxRowsPerPage || tableY > 480) {
        doc.addPage();
        tableY = drawHeader();
        rowCount = 0;
      }

      const srNo = emp.serial ?? empIdx + 1;
      let pCount = 0;
      let woCount = 0;
      let halfDayCount = 0;
      let otLeaveCount = 0;

      // Alternate row tint
      if (empIdx % 2 === 1) {
        doc.rect(left, tableY, tableWidth, rowH).fillColor('#f8fafc').fill();
      }

      let curX = left;

      // Col 1: Sr No
      doc.rect(curX, tableY, colSr, rowH).strokeColor('#000000').lineWidth(0.4).stroke();
      doc.font('Helvetica').fontSize(7.5).fillColor('#334155').text(String(srNo), curX, tableY + 5, { width: colSr, align: 'center' });
      curX += colSr;

      // Col 2: Name
      doc.rect(curX, tableY, colName, rowH).strokeColor('#000000').lineWidth(0.4).stroke();
      doc.font('Helvetica-Bold').fontSize(7.5).fillColor('#0f172a').text(emp.name, curX + 4, tableY + 5, { width: colName - 8, align: 'left', ellipsis: true });
      curX += colName;

      // Col 3: Designation
      doc.rect(curX, tableY, colDesig, rowH).strokeColor('#000000').lineWidth(0.4).stroke();
      doc.font('Helvetica').fontSize(7).fillColor('#475569').text(emp.designation || 'Housekeeping', curX + 4, tableY + 5, { width: colDesig - 8, align: 'left', ellipsis: true });
      curX += colDesig;

      // Day cells
      for (let d = 1; d <= daysInMonth; d++) {
        const isSun = new Date(year, month - 1, d).getDay() === 0;
        const val = (emp.days && emp.days[d] !== undefined ? String(emp.days[d]) : '').trim();
        const upper = val.toUpperCase();

        if (isSun) {
          doc.rect(curX, tableY, dayColWidth, rowH).fillColor('#fff1f2').fill();
        }

        doc.rect(curX, tableY, dayColWidth, rowH).strokeColor('#000000').lineWidth(0.35).stroke();

        let textColor = '#64748b';
        let isBold = false;
        if (upper === 'P' || upper === 'PRESENT') {
          textColor = '#15803d';
          isBold = true;
          pCount++;
        } else if (upper === 'WO' || upper === 'W/O') {
          textColor = '#4338ca';
          isBold = true;
          woCount++;
        } else if (upper === '1/2' || upper === 'HD' || upper === '0.5') {
          textColor = '#d97706';
          isBold = true;
          halfDayCount++;
        } else if (upper === 'A' || upper === 'ABSENT') {
          textColor = '#dc2626';
          isBold = true;
        } else if (upper === 'L' || upper === 'P/L' || upper === 'PL' || upper === 'OT' || upper === 'LEAVE') {
          textColor = '#7c3aed';
          isBold = true;
          otLeaveCount++;
        }

        if (val) {
          doc.font(isBold ? 'Helvetica-Bold' : 'Helvetica').fontSize(isBold ? 7 : 6.5).fillColor(textColor).text(
            val,
            curX,
            tableY + 5,
            { width: dayColWidth, align: 'center' },
          );
        }
        curX += dayColWidth;
      }

      const calculatedWD = emp.wDays !== undefined ? emp.wDays : (pCount + halfDayCount);
      const calculatedWO = emp.wo !== undefined ? emp.wo : woCount;
      const calculatedOT = emp.otLeave !== undefined ? emp.otLeave : otLeaveCount;
      const calculatedTotal = emp.total !== undefined ? emp.total : (pCount + (halfDayCount * 0.5) + calculatedWO + calculatedOT);

      const desigLower = (emp.designation || '').toLowerCase();
      if (desigLower.includes('sup') || desigLower.includes('supervisor')) {
        hkSupTotal += calculatedTotal;
      } else {
        hkStaffTotal += calculatedTotal;
      }

      // W Days
      doc.rect(curX, tableY, colWD, rowH).strokeColor('#000000').lineWidth(0.4).stroke();
      doc.font('Helvetica-Bold').fontSize(7.5).fillColor('#0f172a').text(String(calculatedWD).padStart(2, '0'), curX, tableY + 5, { width: colWD, align: 'center' });
      curX += colWD;

      // W/O
      doc.rect(curX, tableY, colWO, rowH).strokeColor('#000000').lineWidth(0.4).stroke();
      doc.font('Helvetica-Bold').fontSize(7.5).fillColor('#0f172a').text(String(calculatedWO).padStart(2, '0'), curX, tableY + 5, { width: colWO, align: 'center' });
      curX += colWO;

      // OT Hrs
      doc.rect(curX, tableY, colOT, rowH).strokeColor('#000000').lineWidth(0.4).stroke();
      doc.font('Helvetica').fontSize(7).fillColor('#475569').text(calculatedOT > 0 ? (calculatedOT === 1 ? 'P/L' : String(calculatedOT).padStart(2, '0')) : '00', curX, tableY + 5, { width: colOT, align: 'center' });
      curX += colOT;

      // TOTAL
      const lastW = colTotal + extra;
      doc.rect(curX, tableY, lastW, rowH).strokeColor('#000000').lineWidth(0.4).stroke();
      doc.font('Helvetica-Bold').fontSize(8).fillColor('#0f172a').text(Number.isInteger(calculatedTotal) ? String(calculatedTotal) : calculatedTotal.toFixed(2), curX, tableY + 5, { width: lastW, align: 'center' });

      tableY += rowH;
      rowCount++;
    });

    // Summary & Signatures at bottom
    const hkSupVal = payload.hkSupDays !== undefined ? payload.hkSupDays : hkSupTotal;
    const hkVal = payload.hkDays !== undefined ? payload.hkDays : hkStaffTotal;
    const grandTotalVal = payload.totalDays !== undefined ? payload.totalDays : (hkSupVal + hkVal);

    const sumY = Math.max(tableY + 10, 480);

    // Summary box
    doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#0f172a');
    doc.text(`H.K. Sup  =  ${hkSupVal} Days`, right - 200, sumY, { width: 200, align: 'right' });
    doc.text(`H.K.  =  ${Number(hkVal).toFixed(2).replace(/\.00$/, '')} Days`, right - 200, sumY + 12, { width: 200, align: 'right' });
    doc.text(`Total  =  ${Number(grandTotalVal).toFixed(2).replace(/\.00$/, '')}`, right - 200, sumY + 24, { width: 200, align: 'right' });

    // Signatures
    const sigY = 540;
    const sigColW = Math.floor(tableWidth / 3);

    // Area Manager
    doc.strokeColor('#000000').lineWidth(0.7).moveTo(left + 20, sigY).lineTo(left + sigColW - 20, sigY).stroke();
    doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#000000').text('Area Manager signature', left, sigY + 4, { width: sigColW, align: 'center' });

    // Operation Manager
    doc.strokeColor('#000000').lineWidth(0.7).moveTo(left + sigColW + 20, sigY).lineTo(left + (sigColW * 2) - 20, sigY).stroke();
    doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#000000').text('Operation Manager Signature', left + sigColW, sigY + 4, { width: sigColW, align: 'center' });

    // Client Signature
    doc.strokeColor('#000000').lineWidth(0.7).moveTo(left + (sigColW * 2) + 20, sigY).lineTo(right - 20, sigY).stroke();
    doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#000000').text('Client Signature', left + (sigColW * 2), sigY + 4, { width: sigColW, align: 'center' });

    doc.end();
  });
}


