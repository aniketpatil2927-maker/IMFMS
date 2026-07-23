import ExcelJS from 'exceljs';
import { format } from 'date-fns';

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

export async function buildGenericExcel(
  sheetName: string,
  columns: Array<{ header: string; key: string; width?: number }>,
  rows: Record<string, unknown>[],
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(sheetName);
  sheet.columns = columns;
  rows.forEach((row) => sheet.addRow(row));
  sheet.getRow(1).font = { bold: true };
  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
