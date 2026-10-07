import ExcelJS from 'exceljs';
import { format } from 'date-fns';
import { env } from '../config/env.js';

export async function buildAttendanceExcel(records: Array<{
  date: Date;
  status: string;
  employee: { employeeCode: string; name: string; designation: string };
  site?: { name: string };
}>): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Attendance');

  sheet.columns = [
    { header: 'Date', key: 'date', width: 14 },
    { header: 'Employee ID', key: 'code', width: 14 },
    { header: 'Name', key: 'name', width: 24 },
    { header: 'Designation', key: 'designation', width: 18 },
    { header: 'Site', key: 'site', width: 20 },
    { header: 'Status', key: 'status', width: 12 },
  ];

  for (const row of records) {
    sheet.addRow({
      date: format(new Date(row.date), 'yyyy-MM-dd'),
      code: row.employee.employeeCode,
      name: row.employee.name,
      designation: row.employee.designation,
      site: row.site?.name ?? '',
      status: row.status,
    });
  }

  sheet.getRow(1).font = { bold: true };
  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

export interface AttendanceRegisterEmployee {
  serial?: number;
  id?: string;
  employeeId?: string;
  employeeCode?: string;
  name: string;
  designation: string;
  days: Record<number, string>; // day 1..31 -> 'P' | 'WO' | '1/2' | 'A' | 'L' | 'P/L' | 'New Joining' | etc.
  wDays?: number;
  wo?: number;
  otLeave?: number;
  total?: number;
  note?: string;
}

export interface AttendanceRegisterPayload {
  siteName: string;
  month: number; // 1-12
  year: number;
  employees: AttendanceRegisterEmployee[];
  hkSupDays?: number;
  hkDays?: number;
  totalDays?: number;
  clientSignatureName?: string;
}

export function addExactAttendanceRegisterSheet(
  workbook: ExcelJS.Workbook,
  payload: AttendanceRegisterPayload,
  sheetTitle?: string,
): ExcelJS.Worksheet {
  const monthName = new Date(payload.year, payload.month - 1, 1).toLocaleString('en', { month: 'long' });
  const rawSheetName = sheetTitle || payload.siteName || 'Attendance';
  // Excel worksheet names must be <= 31 chars and no special chars : \ / ? * [ ]
  const sanitizedSheetName = rawSheetName.replace(/[:\\/?*[\]]/g, ' ').slice(0, 31).trim() || 'Attendance';

  const sheet = workbook.addWorksheet(sanitizedSheetName, {
    pageSetup: {
      orientation: 'landscape',
      paperSize: 9, // A4
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      margins: { left: 0.3, right: 0.3, top: 0.4, bottom: 0.4, header: 0.2, footer: 0.2 },
    },
  });

  const daysInMonth = new Date(payload.year, payload.month, 0).getDate();
  const totalCols = 3 + daysInMonth + 4; // SrNo(1), Name(2), Desig(3) + Days(4..34) + WDays(35), WO(36), OTHrs(37), Total(38)

  // Set column widths matching ATTN FORMAT-3.xlsx
  const colWidths: { width: number }[] = [
    { width: 6.2 }, // 1: Sr No
    { width: 34 }, // 2: Employee Name
    { width: 14 }, // 3: Designation
  ];
  for (let d = 1; d <= daysInMonth; d++) {
    colWidths.push({ width: 4.8 });
  }
  colWidths.push({ width: 6.5 }); // W Days
  colWidths.push({ width: 6.5 }); // W/O
  colWidths.push({ width: 7.2 }); // OT Hrs
  colWidths.push({ width: 11 }); // TOTAL

  sheet.columns = colWidths.map((c, i) => ({ header: '', key: `col_${i + 1}`, width: c.width }));

  const borderThin: Partial<ExcelJS.Borders> = {
    top: { style: 'thin', color: { argb: 'FF000000' } },
    left: { style: 'thin', color: { argb: 'FF000000' } },
    bottom: { style: 'thin', color: { argb: 'FF000000' } },
    right: { style: 'thin', color: { argb: 'FF000000' } },
  };

  // Row 1: Company Header (exact font Tahoma 21pt bold #702FA0 from ATTN FORMAT-3.xlsx)
  sheet.mergeCells(1, 1, 1, totalCols);
  const r1 = sheet.getCell(1, 1);
  r1.value = 'IMMACULATE MASTERS FACILITY MANAGEMENT SERVICES';
  r1.font = { name: 'Tahoma', size: 20, bold: true, color: { argb: 'FF702FA0' } };
  r1.alignment = { horizontal: 'center', vertical: 'middle' };
  sheet.getRow(1).height = 28;

  // Row 2: Spacer
  sheet.getRow(2).height = 8;

  // Row 3: Site Name & Month (exact Times New Roman 14-16pt from ATTN FORMAT-3.xlsx)
  const siteMergeEnd = Math.max(3, Math.floor(totalCols * 0.65));
  sheet.mergeCells(3, 1, 3, siteMergeEnd);
  const siteCell = sheet.getCell(3, 1);
  siteCell.value = `Site Name :-  ${payload.siteName || ''}`;
  siteCell.font = { name: 'Times New Roman', size: 14, bold: true, color: { argb: 'FF000000' } };
  siteCell.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };

  sheet.mergeCells(3, siteMergeEnd + 1, 3, totalCols);
  const monthCell = sheet.getCell(3, siteMergeEnd + 1);
  monthCell.value = `Month :  ${monthName} ${payload.year}`;
  monthCell.font = { name: 'Times New Roman', size: 14, bold: true, color: { argb: 'FF000000' } };
  monthCell.alignment = { horizontal: 'right', vertical: 'middle' };
  sheet.getRow(3).height = 22;

  // Row 4 & 5: Spacing
  sheet.getRow(4).height = 6;
  sheet.getRow(5).height = 6;

  // Row 6: Main Table Header (matching ATTN FORMAT-3.xlsx Row 6)
  const headerRow = sheet.getRow(6);
  headerRow.height = 36;

  const headers = [
    'Sr No',
    'Employee Name',
    'Designation',
    ...Array.from({ length: daysInMonth }, (_, i) => String(i + 1)),
    'W Days',
    'W/O',
    'OT Hrs',
    'TOTAL',
  ];

  headers.forEach((h, idx) => {
    const colNum = idx + 1;
    const cell = sheet.getCell(6, colNum);
    cell.value = h;
    const isDay = idx >= 3 && idx < 3 + daysInMonth;
    const isSummary = idx >= 3 + daysInMonth;
    cell.font = {
      name: 'Times New Roman',
      size: isDay ? 10 : isSummary ? 9.5 : 12,
      bold: true,
      color: { argb: 'FF000000' },
    };
    cell.alignment = {
      horizontal: colNum === 2 ? 'left' : 'center',
      vertical: 'middle',
      wrapText: true,
    };
    cell.border = borderThin;
  });

  // Calculate & insert employee rows starting from Row 7
  let hkSupTotal = 0;
  let hkStaffTotal = 0;

  payload.employees.forEach((emp, empIdx) => {
    const rowNum = 7 + empIdx;
    const row = sheet.getRow(rowNum);
    row.height = 24;

    const srNo = emp.serial ?? empIdx + 1;

    // Col 1: Sr No
    const c1 = sheet.getCell(rowNum, 1);
    c1.value = srNo;
    c1.alignment = { horizontal: 'center', vertical: 'middle' };
    c1.font = { name: 'Times New Roman', size: 10 };
    c1.border = borderThin;

    // Col 2: Name
    const c2 = sheet.getCell(rowNum, 2);
    c2.value = emp.name;
    c2.alignment = { horizontal: 'left', vertical: 'middle', indent: 0.5 };
    c2.font = { name: 'Times New Roman', size: 11, bold: true };
    c2.border = borderThin;

    // Col 3: Designation
    const c3 = sheet.getCell(rowNum, 3);
    c3.value = emp.designation || 'Housekeeping';
    c3.alignment = { horizontal: 'left', vertical: 'middle' };
    c3.font = { name: 'Times New Roman', size: 10 };
    c3.border = borderThin;

    // Calculate days breakdown
    let pCount = 0;
    let woCount = 0;
    let otLeaveCount = 0;
    let halfDayCount = 0;

    for (let d = 1; d <= daysInMonth; d++) {
      const colNum = 3 + d;
      const cell = sheet.getCell(rowNum, colNum);
      const val = (emp.days && emp.days[d] !== undefined ? String(emp.days[d]) : '').trim();
      const isSun = new Date(payload.year, payload.month - 1, d).getDay() === 0;

      cell.value = val;
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.font = {
        name: 'Times New Roman',
        size: 9.5,
        bold: val === 'WO' || val === 'P' || isSun,
        color: isSun ? { argb: 'FFB91C1C' } : undefined,
      };
      if (isSun) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF1F2' } };
      }
      cell.border = borderThin;

      const upper = val.toUpperCase();
      if (upper === 'P' || upper === 'PRESENT') {
        pCount += 1;
      } else if (upper === 'WO' || upper === 'W/O') {
        woCount += 1;
      } else if (upper === '1/2' || upper === 'HD' || upper === '0.5') {
        halfDayCount += 1;
      } else if (upper === 'L' || upper === 'P/L' || upper === 'PL' || upper === 'OT' || upper === 'LEAVE') {
        otLeaveCount += 1;
      }
    }

    const calculatedWDays = emp.wDays !== undefined ? emp.wDays : (pCount + halfDayCount);
    const calculatedWO = emp.wo !== undefined ? emp.wo : woCount;
    const calculatedOTL = emp.otLeave !== undefined ? emp.otLeave : otLeaveCount;
    const rawTotal = emp.total !== undefined ? emp.total : (pCount + halfDayCount * 0.5 + calculatedWO + calculatedOTL);

    // Format total display (e.g. 21.05, 32, 04)
    let displayTotal: string | number = rawTotal;
    if (!Number.isInteger(rawTotal)) {
      const intP = Math.floor(rawTotal);
      const frac = Math.round((rawTotal - intP) * 100);
      if (frac === 50) {
        displayTotal = `${intP}.05`;
      } else {
        displayTotal = Number(rawTotal.toFixed(2));
      }
    }

    // Col: W Days
    const cW = sheet.getCell(rowNum, 3 + daysInMonth + 1);
    cW.value = String(calculatedWDays).padStart(2, '0');
    cW.alignment = { horizontal: 'center', vertical: 'middle' };
    cW.font = { name: 'Times New Roman', size: 10, bold: true };
    cW.border = borderThin;

    // Col: WO
    const cWO = sheet.getCell(rowNum, 3 + daysInMonth + 2);
    cWO.value = String(calculatedWO).padStart(2, '0');
    cWO.alignment = { horizontal: 'center', vertical: 'middle' };
    cWO.font = { name: 'Times New Roman', size: 10, bold: true };
    cWO.border = borderThin;

    // Col: OT Hrs
    const cOTL = sheet.getCell(rowNum, 3 + daysInMonth + 3);
    cOTL.value = calculatedOTL > 0 ? (calculatedOTL === 1 ? 'P/L' : String(calculatedOTL).padStart(2, '0')) : '00';
    cOTL.alignment = { horizontal: 'center', vertical: 'middle' };
    cOTL.font = { name: 'Times New Roman', size: 9.5 };
    cOTL.border = borderThin;

    // Col: TOTAL
    const cTot = sheet.getCell(rowNum, 3 + daysInMonth + 4);
    cTot.value = displayTotal;
    cTot.alignment = { horizontal: 'center', vertical: 'middle' };
    cTot.font = { name: 'Times New Roman', size: 11, bold: true };
    cTot.border = borderThin;

    const desigLower = (emp.designation || '').toLowerCase();
    if (desigLower.includes('sup') || desigLower.includes('supervisor')) {
      hkSupTotal += rawTotal;
    } else {
      hkStaffTotal += rawTotal;
    }
  });

  const lastEmpRow = 6 + Math.max(1, payload.employees.length);

  // Bottom Summary Section
  const summaryStartRow = lastEmpRow + 2;
  const hkSupVal = payload.hkSupDays !== undefined ? payload.hkSupDays : hkSupTotal;
  const hkVal = payload.hkDays !== undefined ? payload.hkDays : hkStaffTotal;
  const grandTotalVal = payload.totalDays !== undefined ? payload.totalDays : (hkSupVal + hkVal);

  const formatSummaryNum = (val: number) => {
    if (Number.isInteger(val)) return `${val}`;
    const intP = Math.floor(val);
    const frac = Math.round((val - intP) * 100);
    if (frac === 50 || frac === 5) return `${intP}.05`;
    return val.toFixed(2).replace(/\.00$/, '');
  };

  const summaryColStart = Math.max(1, totalCols - 9);

  // Row 1 of Summary: H.K. Sup
  sheet.mergeCells(summaryStartRow, summaryColStart, summaryStartRow, totalCols - 3);
  const s1Label = sheet.getCell(summaryStartRow, summaryColStart);
  s1Label.value = 'H.K. Sup  =';
  s1Label.font = { name: 'Times New Roman', size: 11, bold: true };
  s1Label.alignment = { horizontal: 'right', vertical: 'middle' };

  sheet.mergeCells(summaryStartRow, totalCols - 2, summaryStartRow, totalCols);
  const s1Val = sheet.getCell(summaryStartRow, totalCols - 2);
  s1Val.value = `${hkSupVal} Days`;
  s1Val.font = { name: 'Times New Roman', size: 11, bold: true };
  s1Val.alignment = { horizontal: 'left', vertical: 'middle' };

  // Row 2 of Summary: H.K.
  sheet.mergeCells(summaryStartRow + 1, summaryColStart, summaryStartRow + 1, totalCols - 3);
  const s2Label = sheet.getCell(summaryStartRow + 1, summaryColStart);
  s2Label.value = 'H.K.  =';
  s2Label.font = { name: 'Times New Roman', size: 11, bold: true };
  s2Label.alignment = { horizontal: 'right', vertical: 'middle' };

  sheet.mergeCells(summaryStartRow + 1, totalCols - 2, summaryStartRow + 1, totalCols);
  const s2Val = sheet.getCell(summaryStartRow + 1, totalCols - 2);
  s2Val.value = `${formatSummaryNum(hkVal)} Days`;
  s2Val.font = { name: 'Times New Roman', size: 11, bold: true };
  s2Val.alignment = { horizontal: 'left', vertical: 'middle' };

  // Row 3 of Summary: Total
  sheet.mergeCells(summaryStartRow + 2, summaryColStart, summaryStartRow + 2, totalCols - 3);
  const s3Label = sheet.getCell(summaryStartRow + 2, summaryColStart);
  s3Label.value = 'Total  =';
  s3Label.font = { name: 'Times New Roman', size: 12, bold: true };
  s3Label.alignment = { horizontal: 'right', vertical: 'middle' };

  sheet.mergeCells(summaryStartRow + 2, totalCols - 2, summaryStartRow + 2, totalCols);
  const s3Val = sheet.getCell(summaryStartRow + 2, totalCols - 2);
  s3Val.value = `${formatSummaryNum(grandTotalVal)}`;
  s3Val.font = { name: 'Times New Roman', size: 12, bold: true };
  s3Val.alignment = { horizontal: 'left', vertical: 'middle' };

  // Signatures Section (3 columns across bottom matching ATTN FORMAT-3.xlsx Row 27)
  const sigRow = summaryStartRow + 5;
  sheet.getRow(sigRow).height = 40;

  const colWidthThird = Math.floor(totalCols / 3);

  // Area Manager
  sheet.mergeCells(sigRow, 1, sigRow, colWidthThird);
  const sig1 = sheet.getCell(sigRow, 1);
  sig1.value = 'Area Manager signature';
  sig1.font = { name: 'Times New Roman', size: 11, bold: true };
  sig1.alignment = { horizontal: 'center', vertical: 'middle' };

  // Operation Manager
  sheet.mergeCells(sigRow, colWidthThird + 1, sigRow, colWidthThird * 2);
  const sig2 = sheet.getCell(sigRow, colWidthThird + 1);
  sig2.value = 'Operation Manager Signature';
  sig2.font = { name: 'Times New Roman', size: 11, bold: true };
  sig2.alignment = { horizontal: 'center', vertical: 'middle' };

  // Client Signature
  sheet.mergeCells(sigRow, colWidthThird * 2 + 1, sigRow, totalCols);
  const sig3 = sheet.getCell(sigRow, colWidthThird * 2 + 1);
  sig3.value = 'Client Signature';
  sig3.font = { name: 'Times New Roman', size: 11, bold: true };
  sig3.alignment = { horizontal: 'center', vertical: 'middle' };

  return sheet;
}

export async function buildExactAttendanceRegisterExcel(payload: AttendanceRegisterPayload): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  addExactAttendanceRegisterSheet(workbook, payload, payload.siteName || 'Attendance');
  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

export async function buildMultiSheetAttendanceRegisterExcel(payloads: AttendanceRegisterPayload[]): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  payloads.forEach((p, idx) => {
    const title = p.siteName ? `${idx + 1}. ${p.siteName}` : `Sheet ${idx + 1}`;
    addExactAttendanceRegisterSheet(workbook, p, title);
  });
  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

export async function buildPhotoAttendanceExcel(payload: {
  image: Buffer;
  imageExtension: 'jpeg' | 'png';
  siteName: string;
  month: number;
  year: number;
  records: Array<{
    date: Date;
    status: string;
    employee: { employeeCode: string; name: string; designation: string };
  }>;
}): Promise<Buffer> {
  const employeesMap = new Map<string, AttendanceRegisterEmployee>();
  for (const record of payload.records) {
    const code = record.employee.employeeCode || record.employee.name;
    const existing = employeesMap.get(code) ?? {
      name: record.employee.name,
      designation: record.employee.designation,
      days: {},
    };
    const day = new Date(record.date).getDate();
    const st = record.status;
    existing.days[day] = st === 'PRESENT' ? 'P' : st === 'HALF_DAY' ? '1/2' : st === 'ABSENT' ? 'A' : st === 'LEAVE' ? 'L' : '';
    employeesMap.set(code, existing);
  }

  const employees = [...employeesMap.values()].map((emp, i) => ({ ...emp, serial: i + 1 }));

  const mainBuffer = await buildExactAttendanceRegisterExcel({
    siteName: payload.siteName,
    month: payload.month,
    year: payload.year,
    employees: employees.length > 0 ? employees : [
      { serial: 1, name: 'Sample Employee', designation: 'Housekeeping', days: { 1: 'P', 2: 'P', 3: 'WO', 4: 'P' } },
    ],
  });

  const combinedWorkbook = new ExcelJS.Workbook();
  await combinedWorkbook.xlsx.load(mainBuffer as never);

  const sourceSheet = combinedWorkbook.addWorksheet('Source Photo');
  sourceSheet.getCell('A1').value = 'Uploaded attendance register';
  sourceSheet.getCell('A1').font = { bold: true, size: 14 };
  const imageId = combinedWorkbook.addImage({ buffer: payload.image as never, extension: payload.imageExtension });
  sourceSheet.addImage(imageId, { tl: { col: 0, row: 2 }, ext: { width: 900, height: 620 } });
  sourceSheet.getColumn(1).width = 24;

  const buffer = await combinedWorkbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

export async function buildGenericExcel(
  sheetName: string,
  columns: Array<{ header: string; key: string; width?: number }>,
  rows: Record<string, unknown>[],
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sanitized = sheetName.replace(/[:\\/?*[\]]/g, ' ').slice(0, 31).trim() || 'Report';
  const sheet = workbook.addWorksheet(sanitized);

  // Set column definitions with fallback widths
  sheet.columns = columns.map((col) => ({
    header: col.header,
    key: col.key,
    width: col.width || Math.max(col.header.length + 4, 15),
  }));

  // Style Header Row
  const headerRow = sheet.getRow(1);
  headerRow.height = 26;
  headerRow.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF0F766E' }, // Dark Teal
  };
  headerRow.alignment = { vertical: 'middle', horizontal: 'center' };

  // Add Data Rows
  rows.forEach((row, idx) => {
    const r = sheet.addRow(row);
    r.height = 20;
    r.font = { name: 'Arial', size: 9 };
    const isEven = idx % 2 === 0;
    r.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: isEven ? 'FFFFFFFF' : 'FFF8FAFC' },
    };
    r.eachCell({ includeEmpty: true }, (cell) => {
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      };
      if (typeof cell.value === 'number') {
        cell.alignment = { vertical: 'middle', horizontal: 'right' };
      } else {
        cell.alignment = { vertical: 'middle', horizontal: 'left' };
      }
    });
  });

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

export async function buildSingleInvoiceExcel(invoice: {
  invoiceNumber: string;
  date: Date | string;
  periodFrom: Date | string;
  periodTo: Date | string;
  subtotal: unknown;
  gstPercent: unknown;
  gstAmount: unknown;
  total: unknown;
  client: { companyName: string; address: string; gstNumber?: string | null };
  site?: { name: string; address?: string } | null;
  items: Array<{
    serviceDetails: string;
    quantity: unknown;
    rate: unknown;
    mandays?: unknown;
    actualMandays?: unknown;
    amount: unknown;
  }>;
}): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Tax Invoice');

  sheet.columns = [
    { key: 'sr', width: 8 },
    { key: 'particulars', width: 34 },
    { key: 'qty', width: 14 },
    { key: 'rate', width: 18 },
    { key: 'mandays', width: 14 },
    { key: 'actualMandays', width: 16 },
    { key: 'amount', width: 18 },
  ];

  const totalCols = 7;
  const borderThin: Partial<ExcelJS.Borders> = {
    top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
    left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
    bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
    right: { style: 'thin', color: { argb: 'FFCBD5E1' } },
  };

  // Row 1: Company Title
  sheet.mergeCells(1, 1, 1, totalCols);
  const r1 = sheet.getCell(1, 1);
  r1.value = env.company.name.toUpperCase();
  r1.font = { name: 'Arial', size: 14, bold: true, color: { argb: 'FF0F766E' } };
  r1.alignment = { horizontal: 'center', vertical: 'middle' };
  sheet.getRow(1).height = 28;

  // Row 2: Company Address & Contact
  sheet.mergeCells(2, 1, 2, totalCols);
  const r2 = sheet.getCell(2, 1);
  r2.value = `${env.company.address} | Phone: ${env.company.phone} | Email: ${env.company.email}`;
  r2.font = { name: 'Arial', size: 9, color: { argb: 'FF475569' } };
  r2.alignment = { horizontal: 'center', vertical: 'middle' };
  sheet.getRow(2).height = 18;

  // Row 3: PAN / GST
  sheet.mergeCells(3, 1, 3, totalCols);
  const r3 = sheet.getCell(3, 1);
  r3.value = `PAN: ${env.company.pan} | GSTIN: ${env.company.gst}`;
  r3.font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FF334155' } };
  r3.alignment = { horizontal: 'center', vertical: 'middle' };
  sheet.getRow(3).height = 18;

  // Row 4: Spacer
  sheet.getRow(4).height = 8;

  // Row 5 & 6: Invoice Details Banner
  sheet.mergeCells(5, 1, 5, 4);
  sheet.getCell(5, 1).value = `Client: ${invoice.client.companyName}`;
  sheet.getCell(5, 1).font = { name: 'Arial', size: 10, bold: true };
  sheet.mergeCells(5, 5, 5, totalCols);
  sheet.getCell(5, 5).value = `Invoice No: ${invoice.invoiceNumber}`;
  sheet.getCell(5, 5).font = { name: 'Arial', size: 10, bold: true };

  sheet.mergeCells(6, 1, 6, 4);
  sheet.getCell(6, 1).value = `Site: ${invoice.site?.name || 'General'}`;
  sheet.getCell(6, 1).font = { name: 'Arial', size: 9 };
  sheet.mergeCells(6, 5, 6, totalCols);
  const formattedDate = format(new Date(invoice.date), 'dd/MM/yyyy');
  sheet.getCell(6, 5).value = `Bill Date: ${formattedDate}`;
  sheet.getCell(6, 5).font = { name: 'Arial', size: 9 };

  sheet.mergeCells(7, 1, 7, 4);
  const periodStr = `${format(new Date(invoice.periodFrom), 'dd/MM/yyyy')} to ${format(new Date(invoice.periodTo), 'dd/MM/yyyy')}`;
  sheet.getCell(7, 1).value = `Billing Period: ${periodStr}`;
  sheet.getCell(7, 1).font = { name: 'Arial', size: 9 };
  sheet.mergeCells(7, 5, 7, totalCols);
  sheet.getCell(7, 5).value = invoice.client.gstNumber ? `Client GST: ${invoice.client.gstNumber}` : '';
  sheet.getCell(7, 5).font = { name: 'Arial', size: 9 };

  sheet.getRow(8).height = 8;

  // Row 9: Table Header
  const headers = [
    'Sr No',
    'Particulars',
    'QTY (W.O.)',
    'Rate Per Month',
    'Mandays',
    'Actual Mandays',
    'Amount (₹)',
  ];
  const tableHeaderRow = sheet.getRow(9);
  tableHeaderRow.height = 25;
  headers.forEach((h, i) => {
    const c = sheet.getCell(9, i + 1);
    c.value = h;
    c.font = { name: 'Arial', size: 9.5, bold: true, color: { argb: 'FFFFFFFF' } };
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F766E' } };
    c.alignment = { horizontal: i === 1 ? 'left' : 'center', vertical: 'middle' };
    c.border = borderThin;
  });

  // Table Data
  let rowIndex = 10;
  invoice.items.forEach((item, idx) => {
    const r = sheet.getRow(rowIndex);
    r.height = 20;

    const values = [
      idx + 1,
      item.serviceDetails,
      Number(item.quantity) || '',
      Number(item.rate) || 0,
      item.mandays != null ? Number(item.mandays) : '-',
      item.actualMandays != null ? Number(item.actualMandays) : '-',
      Number(item.amount) || 0,
    ];

    values.forEach((v, colIdx) => {
      const cell = sheet.getCell(rowIndex, colIdx + 1);
      cell.value = v as never;
      cell.font = { name: 'Arial', size: 9 };
      cell.border = borderThin;
      cell.alignment = {
        vertical: 'middle',
        horizontal: colIdx === 1 ? 'left' : colIdx >= 2 ? 'right' : 'center',
      };
      if (colIdx === 3 || colIdx === 6) {
        cell.numFmt = '#,##0.00';
      }
    });

    rowIndex++;
  });

  // Subtotal Row
  sheet.mergeCells(rowIndex, 1, rowIndex, 6);
  sheet.getCell(rowIndex, 1).value = 'Subtotal';
  sheet.getCell(rowIndex, 1).font = { name: 'Arial', size: 9.5, bold: true };
  sheet.getCell(rowIndex, 1).alignment = { horizontal: 'right', vertical: 'middle' };
  sheet.getCell(rowIndex, 1).border = borderThin;
  const subtotalCell = sheet.getCell(rowIndex, 7);
  subtotalCell.value = Number(invoice.subtotal);
  subtotalCell.font = { name: 'Arial', size: 9.5, bold: true };
  subtotalCell.numFmt = '#,##0.00';
  subtotalCell.border = borderThin;
  rowIndex++;

  // GST Row
  const gstPct = Number(invoice.gstPercent);
  if (gstPct > 0) {
    sheet.mergeCells(rowIndex, 1, rowIndex, 6);
    sheet.getCell(rowIndex, 1).value = `GST (${gstPct}%)`;
    sheet.getCell(rowIndex, 1).font = { name: 'Arial', size: 9 };
    sheet.getCell(rowIndex, 1).alignment = { horizontal: 'right', vertical: 'middle' };
    sheet.getCell(rowIndex, 1).border = borderThin;
    const gstCell = sheet.getCell(rowIndex, 7);
    gstCell.value = Number(invoice.gstAmount);
    gstCell.font = { name: 'Arial', size: 9 };
    gstCell.numFmt = '#,##0.00';
    gstCell.border = borderThin;
    rowIndex++;
  }

  // Grand Total Row
  sheet.mergeCells(rowIndex, 1, rowIndex, 6);
  sheet.getCell(rowIndex, 1).value = 'Grand Total (₹)';
  sheet.getCell(rowIndex, 1).font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF0F766E' } };
  sheet.getCell(rowIndex, 1).alignment = { horizontal: 'right', vertical: 'middle' };
  sheet.getCell(rowIndex, 1).border = borderThin;
  const totalCell = sheet.getCell(rowIndex, 7);
  totalCell.value = Number(invoice.total);
  totalCell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF0F766E' } };
  totalCell.numFmt = '#,##0.00';
  totalCell.border = borderThin;
  rowIndex += 2;

  // Bank Details Footer
  sheet.getCell(rowIndex, 1).value = 'Bank Details for NEFT/RTGS:';
  sheet.getCell(rowIndex, 1).font = { name: 'Arial', size: 9, bold: true };
  rowIndex++;
  sheet.getCell(rowIndex, 1).value = `Bank: ${env.company.bankName} | A/C No: ${env.company.bankAccount} | IFSC: ${env.company.bankIfsc} | Branch: ${env.company.bankBranch}`;
  sheet.getCell(rowIndex, 1).font = { name: 'Arial', size: 8.5, color: { argb: 'FF475569' } };

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

