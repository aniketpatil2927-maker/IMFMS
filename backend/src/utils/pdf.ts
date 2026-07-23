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
