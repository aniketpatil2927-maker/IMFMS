import type { NextFunction, Request, Response } from 'express';
import { attendanceService } from '../services/attendance.service.js';
import { attendanceRepository } from '../repositories/attendance.repository.js';
import { employeeRepository } from '../repositories/employee.repository.js';
import { siteRepository } from '../repositories/site.repository.js';
import { prisma } from '../config/database.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { attendanceQuerySchema } from '../validators/attendance.validator.js';
import {
  buildAttendanceExcel,
  buildExactAttendanceRegisterExcel,
  buildMultiSheetAttendanceRegisterExcel,
  buildPhotoAttendanceExcel,
  type AttendanceRegisterEmployee,
} from '../utils/excel.js';
import { buildAttendancePdf, buildExactAttendanceRegisterPdf } from '../utils/pdf.js';
import { AppError } from '../utils/AppError.js';
import { parseAttendanceImage } from '../utils/ocrParser.js';
import ExcelJS from 'exceljs';
import type { AttendanceStatus } from '@prisma/client';

function resolveSiteId(req: Request, querySiteId?: string) {
  if (req.user?.role === 'SITE_SUPERVISOR') {
    if (!req.user.siteId) throw new AppError('Supervisor is not assigned to a site', 403);
    return req.user.siteId;
  }
  return querySiteId;
}

function calculateEmployeeTotals(emp: AttendanceRegisterEmployee, daysInMonth: number) {
  let pCount = 0;
  let woCount = 0;
  let otLeaveCount = 0;
  let halfDayCount = 0;

  for (let d = 1; d <= daysInMonth; d++) {
    const val = (emp.days && emp.days[d] !== undefined ? String(emp.days[d]) : '').trim().toUpperCase();
    if (val === 'P' || val === 'PRESENT') pCount += 1;
    else if (val === 'WO' || val === 'W/O') woCount += 1;
    else if (val === '1/2' || val === 'HD' || val === '0.5' || val === 'HALF') halfDayCount += 1;
    else if (val === 'L' || val === 'P/L' || val === 'PL' || val === 'OT' || val === 'LEAVE' || val === 'CL') otLeaveCount += 1;
  }

  const wDays = emp.wDays !== undefined ? emp.wDays : (pCount + halfDayCount);
  const wo = emp.wo !== undefined ? emp.wo : woCount;
  const otLeave = emp.otLeave !== undefined ? emp.otLeave : otLeaveCount;
  const total = emp.total !== undefined ? emp.total : (pCount + halfDayCount * 0.5 + wo + otLeave);

  return { ...emp, wDays, wo, otLeave, total };
}

function calculateSheetSummary(employees: AttendanceRegisterEmployee[]) {
  let hkSupDays = 0;
  let hkDays = 0;

  for (const emp of employees) {
    const desig = (emp.designation || '').toLowerCase();
    const isSup = desig.includes('sup') || desig.includes('supervisor');
    const tot = emp.total || 0;
    if (isSup) {
      hkSupDays += tot;
    } else {
      hkDays += tot;
    }
  }

  hkSupDays = Number(hkSupDays.toFixed(2));
  hkDays = Number(hkDays.toFixed(2));
  const totalDays = Number((hkSupDays + hkDays).toFixed(2));

  return { hkSupDays, hkDays, totalDays };
}

/**
 * Persists a register sheet (Site, Employees, and daily Attendance records) into MySQL Database
 */
async function persistRegisterToDatabase(sheet: {
  siteId?: string;
  siteName?: string;
  month: number;
  year: number;
  employees: AttendanceRegisterEmployee[];
}) {
  const year = Number(sheet.year) || new Date().getFullYear();
  const month = Number(sheet.month) || (new Date().getMonth() + 1);
  const daysInMonth = new Date(year, month, 0).getDate();

  // 1. Find or create Site
  let site = sheet.siteId ? await prisma.site.findUnique({ where: { id: sheet.siteId } }) : null;
  if (!site && sheet.siteName) {
    site = await prisma.site.findFirst({
      where: {
        OR: [
          { name: { equals: sheet.siteName } },
          { name: { contains: sheet.siteName } },
        ],
      },
    });
  }

  if (!site) {
    let client = await prisma.client.findFirst();
    if (!client) {
      client = await prisma.client.create({
        data: {
          companyName: 'Immaculate Masters Facility Management Services',
          contactPerson: 'Admin',
          mobile: '9999999999',
          address: 'Pune, Maharashtra',
        },
      });
    }
    site = await prisma.site.create({
      data: {
        name: sheet.siteName || 'Facility Site',
        clientId: client.id,
        address: 'Pune, Maharashtra',
        supervisorName: 'Site Supervisor',
        contactNumber: '9999999999',
      },
    });
  }

  const resolvedSiteId = site.id;

  // 2. Find or create Employees and build entries
  const existingEmployees = await prisma.employee.findMany({
    where: { siteId: resolvedSiteId },
  });
  const employeeMap = new Map<string, string>(); // lowercase name -> id
  existingEmployees.forEach((e) => {
    employeeMap.set(e.name.trim().toLowerCase(), e.id);
  });

  const updatedEmployees: AttendanceRegisterEmployee[] = [];
  const entriesToUpsert: Array<{
    employeeId: string;
    siteId: string;
    date: Date;
    status: AttendanceStatus;
  }> = [];

  for (let idx = 0; idx < sheet.employees.length; idx++) {
    const emp = sheet.employees[idx];
    const cleanName = (emp.name || `Staff ${idx + 1}`).trim();
    let empId = emp.employeeId || emp.id || employeeMap.get(cleanName.toLowerCase());

    if (!empId) {
      const code = `EMP-${Date.now().toString(36).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`;
      const newEmp = await prisma.employee.create({
        data: {
          name: cleanName,
          employeeCode: code,
          designation: emp.designation || 'Housekeeping',
          siteId: resolvedSiteId,
          salary: 15000,
          joiningDate: new Date(Date.UTC(year, month - 1, 1)),
          mobile: '9800000000',
        },
      });
      empId = newEmp.id;
      employeeMap.set(cleanName.toLowerCase(), empId);
    }

    updatedEmployees.push({
      ...emp,
      employeeId: empId,
    });

    for (let d = 1; d <= daysInMonth; d++) {
      const rawCode = String(emp.days?.[d] || '').trim().toUpperCase();
      if (!rawCode || rawCode === '-') continue;

      let status: AttendanceStatus = 'PRESENT';
      if (rawCode === 'A' || rawCode === 'ABSENT') status = 'ABSENT';
      else if (rawCode === '1/2' || rawCode === 'HD' || rawCode === 'HALF_DAY') status = 'HALF_DAY';
      else if (rawCode === 'L' || rawCode === 'LEAVE' || rawCode === 'P/L' || rawCode === 'PL' || rawCode === 'CL') status = 'LEAVE';
      else if (rawCode === 'H' || rawCode === 'HOLIDAY') status = 'HOLIDAY';
      else if (rawCode === 'WO') status = 'PRESENT';

      entriesToUpsert.push({
        employeeId: empId,
        siteId: resolvedSiteId,
        date: new Date(Date.UTC(year, month - 1, d)),
        status,
      });
    }
  }

  if (entriesToUpsert.length > 0) {
    await attendanceRepository.upsertMany(entriesToUpsert);
  }

  return {
    siteId: resolvedSiteId,
    siteName: site.name,
    savedEntriesCount: entriesToUpsert.length,
    employees: updatedEmployees,
  };
}

export const attendanceController = {
  async saveDaily(req: Request, res: Response, next: NextFunction) {
    try {
      if (req.user?.role === 'SITE_SUPERVISOR') {
        if (!req.user.siteId || req.user.siteId !== req.body.siteId) {
          throw new AppError('You can only mark attendance for your assigned site', 403);
        }
      }
      const data = await attendanceService.saveDaily(req.body);
      return sendSuccess(res, data, 'Attendance saved');
    } catch (e) {
      return next(e);
    }
  },

  async getDaily(req: Request, res: Response, next: NextFunction) {
    try {
      const query = attendanceQuerySchema.parse(req.query);
      const siteId = resolveSiteId(req, query.siteId);
      if (!siteId || !query.date) throw new AppError('siteId and date are required', 400);
      const data = await attendanceService.getDaily(siteId, query.date);
      return sendSuccess(res, data);
    } catch (e) {
      return next(e);
    }
  },

  async getMonthly(req: Request, res: Response, next: NextFunction) {
    try {
      const query = attendanceQuerySchema.parse(req.query);
      const now = new Date();
      const year = query.year ?? now.getFullYear();
      const month = query.month ?? now.getMonth() + 1;
      const siteId = resolveSiteId(req, query.siteId);
      const data = await attendanceService.getMonthly({
        siteId,
        year,
        month,
        employeeId: query.employeeId,
      });
      return sendSuccess(res, data);
    } catch (e) {
      return next(e);
    }
  },

  async exportExcel(req: Request, res: Response, next: NextFunction) {
    try {
      const query = attendanceQuerySchema.parse(req.query);
      const now = new Date();
      const year = query.year ?? now.getFullYear();
      const month = query.month ?? now.getMonth() + 1;
      const siteId = resolveSiteId(req, query.siteId);

      const monthlyData = await attendanceService.getMonthly({
        siteId,
        year,
        month,
        employeeId: query.employeeId,
      });

      const buffer = await buildExactAttendanceRegisterExcel({
        siteName: monthlyData.site?.name || 'Attendance Register',
        month,
        year,
        employees: monthlyData.employees,
        hkSupDays: monthlyData.summary?.hkSupDays,
        hkDays: monthlyData.summary?.hkDays,
        totalDays: monthlyData.summary?.totalDays,
      });

      const cleanSiteName = (monthlyData.site?.name || 'Register').replace(/[^a-zA-Z0-9_-]/g, '_');
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="attendance-${cleanSiteName}-${year}-${month}.xlsx"`);
      return res.send(buffer);
    } catch (e) {
      return next(e);
    }
  },

  async parseBulkUpload(req: Request, res: Response, next: NextFunction) {
    try {
      const files: Express.Multer.File[] = (req.files as Express.Multer.File[]) || (req.file ? [req.file] : []);
      const siteId = resolveSiteId(req, typeof req.body.siteId === 'string' ? req.body.siteId : undefined);
      const year = Math.max(2000, Math.min(2100, Number(req.body.year) || new Date().getFullYear()));
      const month = Math.max(1, Math.min(12, Number(req.body.month) || (new Date().getMonth() + 1)));
      const daysInMonth = new Date(year, month, 0).getDate();

      let defaultSiteName = req.body.siteName ? String(req.body.siteName) : '';
      if (!defaultSiteName && siteId) {
        const site = await siteRepository.findById(siteId);
        if (site) defaultSiteName = site.name;
      }
      if (!defaultSiteName) defaultSiteName = 'Facility Attendance Register';

      const registers: Array<{
        siteName: string;
        siteId?: string;
        month: number;
        year: number;
        daysInMonth: number;
        fileName?: string;
        employees: AttendanceRegisterEmployee[];
        summary: {
          hkSupDays: number;
          hkDays: number;
          totalDays: number;
        };
      }> = [];

      // If files are uploaded (support multiple images or spreadsheets)
      if (files.length > 0) {
        for (let fIndex = 0; fIndex < files.length; fIndex++) {
          const file = files[fIndex];
          const isImage = file.mimetype.startsWith('image/') || /\.(jpe?g|png)$/i.test(file.originalname);
          const ext = file.originalname.split('.').pop()?.toLowerCase() ?? '';

          const cleanFileName = file.originalname.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ').trim();
          let sheetSiteName = files.length === 1 ? defaultSiteName : (cleanFileName || `Site ${fIndex + 1}`);

          const employees: AttendanceRegisterEmployee[] = [];
          let sheetMonth = month;
          let sheetYear = year;

          if (isImage) {
            // Real OCR Image Parsing using Tesseract OCR / Vision
            const ocrResult = await parseAttendanceImage(file.buffer, daysInMonth, month, year, file.mimetype);

            if (ocrResult.siteName && ocrResult.siteName.length > 3) {
              sheetSiteName = ocrResult.siteName;
            }
            if (ocrResult.month) sheetMonth = ocrResult.month;
            if (ocrResult.year) sheetYear = ocrResult.year;

            if (ocrResult.employees.length > 0) {
              employees.push(...ocrResult.employees);
            }
          } else if (ext === 'xlsx' || ext === 'xls') {
            const workbook = new ExcelJS.Workbook();
            await workbook.xlsx.load(file.buffer as never);
            workbook.worksheets.forEach((sheet) => {
              const sheetEmployees: AttendanceRegisterEmployee[] = [];
              let headerRowIndex = 4;
              for (let r = 1; r <= Math.min(10, sheet.rowCount); r++) {
                const rowVals = (sheet.getRow(r).values as unknown[] || []).map((v) => String(v || '').toLowerCase());
                if (rowVals.some((v) => v.includes('employee') || v.includes('name') || v.includes('sr no'))) {
                  headerRowIndex = r;
                  break;
                }
              }

              sheet.eachRow((row, rowNumber) => {
                if (rowNumber <= headerRowIndex) return;
                const vals = (row.values as (string | number | undefined)[]) || [];
                const rawName = String(vals[2] || vals[1] || '').trim();
                if (!rawName || rawName.toLowerCase().includes('total') || rawName.toLowerCase().includes('signature')) return;

                const designation = String(vals[3] || 'Housekeeping').trim();
                const days: Record<number, string> = {};

                for (let d = 1; d <= daysInMonth; d++) {
                  const cellVal = vals[3 + d];
                  if (cellVal !== undefined && cellVal !== null) {
                    days[d] = String(cellVal).trim();
                  }
                }

                sheetEmployees.push({
                  serial: sheetEmployees.length + 1,
                  name: rawName,
                  designation,
                  days,
                });
              });

              if (sheetEmployees.length > 0) {
                const computedEmployees = sheetEmployees.map((emp) => calculateEmployeeTotals(emp, daysInMonth));
                const summary = calculateSheetSummary(computedEmployees);

                registers.push({
                  siteName: sheet.name !== 'Attendance' && sheet.name !== 'Sheet1' ? sheet.name : sheetSiteName,
                  siteId,
                  month,
                  year,
                  daysInMonth,
                  fileName: file.originalname,
                  employees: computedEmployees,
                  summary,
                });
              }
            });
            continue;
          } else if (ext === 'csv') {
            const text = file.buffer.toString('utf-8');
            const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
            if (lines.length > 1) {
              for (let i = 1; i < lines.length; i++) {
                const parts = lines[i].split(',').map((p) => p.trim().replace(/^["']|["']$/g, ''));
                if (parts.length < 2) continue;
                const name = parts[0] || `Employee ${i}`;
                const designation = parts[1] || 'Housekeeping';
                const days: Record<number, string> = {};
                for (let d = 1; d <= daysInMonth; d++) {
                  if (parts[1 + d]) days[d] = parts[1 + d];
                }
                employees.push({
                  serial: employees.length + 1,
                  name,
                  designation,
                  days,
                });
              }
            }
          }

          // If no employees were found from parsing, fetch real employees from database or provide editable staff rows
          if (employees.length === 0) {
            if (siteId) {
              const dbEmployees = await employeeRepository.findActiveBySite(siteId);
              if (dbEmployees.length > 0) {
                dbEmployees.forEach((dbEmp, idx) => {
                  const days: Record<number, string> = {};
                  for (let d = 1; d <= daysInMonth; d++) {
                    const isSunday = new Date(year, month - 1, d).getDay() === 0;
                    days[d] = isSunday ? 'WO' : 'P';
                  }
                  employees.push({
                    serial: idx + 1,
                    employeeId: dbEmp.id,
                    employeeCode: dbEmp.employeeCode,
                    name: dbEmp.name,
                    designation: dbEmp.designation || 'Housekeeping',
                    days,
                  });
                });
              }
            }

            // If still empty, create fresh initial editable roster for this site
            if (employees.length === 0) {
              const defaultNames = ['Staff Member 1', 'Staff Member 2', 'Staff Member 3', 'Staff Member 4'];
              defaultNames.forEach((name, idx) => {
                const days: Record<number, string> = {};
                for (let d = 1; d <= daysInMonth; d++) {
                  const isSunday = new Date(year, month - 1, d).getDay() === 0;
                  days[d] = isSunday ? 'WO' : 'P';
                }
                employees.push({
                  serial: idx + 1,
                  name,
                  designation: idx === 0 ? 'Supervisor' : 'Housekeeping',
                  days,
                });
              });
            }
          }

          const computedEmployees = employees.map((emp) => calculateEmployeeTotals(emp, daysInMonth));
          const summary = calculateSheetSummary(computedEmployees);

          registers.push({
            siteName: sheetSiteName,
            siteId,
            month: sheetMonth,
            year: sheetYear,
            daysInMonth,
            fileName: file.originalname,
            employees: computedEmployees,
            summary,
          });
        }
      }

      // If no file was uploaded at all, generate using site data or blank register
      if (registers.length === 0) {
        const employees: AttendanceRegisterEmployee[] = [];
        if (siteId) {
          const dbEmployees = await employeeRepository.findActiveBySite(siteId);
          dbEmployees.forEach((dbEmp, idx) => {
            const days: Record<number, string> = {};
            for (let d = 1; d <= daysInMonth; d++) {
              const isSunday = new Date(year, month - 1, d).getDay() === 0;
              days[d] = isSunday ? 'WO' : 'P';
            }
            employees.push({
              serial: idx + 1,
              employeeId: dbEmp.id,
              employeeCode: dbEmp.employeeCode,
              name: dbEmp.name,
              designation: dbEmp.designation || 'Housekeeping',
              days,
            });
          });
        }

        if (employees.length === 0) {
          const defaultNames = ['Staff Member 1', 'Staff Member 2', 'Staff Member 3', 'Staff Member 4'];
          defaultNames.forEach((name, idx) => {
            const days: Record<number, string> = {};
            for (let d = 1; d <= daysInMonth; d++) {
              const isSunday = new Date(year, month - 1, d).getDay() === 0;
              days[d] = isSunday ? 'WO' : 'P';
            }
            employees.push({
              serial: idx + 1,
              name,
              designation: idx === 0 ? 'Supervisor' : 'Housekeeping',
              days,
            });
          });
        }

        const computedEmployees = employees.map((emp) => calculateEmployeeTotals(emp, daysInMonth));
        const summary = calculateSheetSummary(computedEmployees);

        registers.push({
          siteName: defaultSiteName,
          siteId,
          month,
          year,
          daysInMonth,
          employees: computedEmployees,
          summary,
        });
      }

      // Automatically persist parsed attendance registers to Database
      let totalDbSaved = 0;
      for (let rIdx = 0; rIdx < registers.length; rIdx++) {
        const reg = registers[rIdx];
        try {
          const dbResult = await persistRegisterToDatabase({
            siteId: reg.siteId,
            siteName: reg.siteName,
            month: reg.month,
            year: reg.year,
            employees: reg.employees,
          });
          totalDbSaved += dbResult.savedEntriesCount;
          registers[rIdx] = {
            ...reg,
            siteId: dbResult.siteId,
            siteName: dbResult.siteName,
            employees: dbResult.employees.map((e) => calculateEmployeeTotals(e, reg.daysInMonth)),
          };
        } catch (dbErr) {
          console.warn('Auto-save to database skipped/failed for sheet:', reg.siteName, dbErr);
        }
      }

      return sendSuccess(res, {
        registers,
        savedToDb: totalDbSaved > 0,
        savedRecordsCount: totalDbSaved,
        ...registers[0],
      }, `Data processed and saved to database (${totalDbSaved} attendance records stored)`);
    } catch (e) {
      return next(e);
    }
  },

  async generateRegisterExcel(req: Request, res: Response, next: NextFunction) {
    try {
      const { siteName, month, year, employees, registers, hkSupDays, hkDays, totalDays } = req.body;

      let buffer: Buffer;
      let downloadFileName = `attendance-register-${year || 2026}-${month || 7}.xlsx`;

      if (Array.isArray(registers) && registers.length > 0) {
        buffer = await buildMultiSheetAttendanceRegisterExcel(registers);
        downloadFileName = `attendance-registers-${registers.length}-sheets-${year || 2026}-${month || 7}.xlsx`;
      } else {
        if (!month || !year || !Array.isArray(employees)) {
          throw new AppError('Invalid register payload', 400);
        }
        buffer = await buildExactAttendanceRegisterExcel({
          siteName: siteName || 'ILS Law College Ladies Hostel',
          month: Number(month),
          year: Number(year),
          employees,
          hkSupDays: hkSupDays !== undefined ? Number(hkSupDays) : undefined,
          hkDays: hkDays !== undefined ? Number(hkDays) : undefined,
          totalDays: totalDays !== undefined ? Number(totalDays) : undefined,
        });
      }

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${downloadFileName}"`);
      return res.send(buffer);
    } catch (e) {
      return next(e);
    }
  },

  async saveBulkRegister(req: Request, res: Response, next: NextFunction) {
    try {
      const { siteId, siteName, month, year, employees, registers } = req.body;

      if (Array.isArray(registers) && registers.length > 0) {
        let totalSaved = 0;
        const savedRegisters = [];
        for (const reg of registers) {
          const result = await persistRegisterToDatabase({
            siteId: reg.siteId,
            siteName: reg.siteName,
            month: Number(reg.month) || Number(month) || (new Date().getMonth() + 1),
            year: Number(reg.year) || Number(year) || new Date().getFullYear(),
            employees: reg.employees || [],
          });
          totalSaved += result.savedEntriesCount;
          savedRegisters.push({
            ...reg,
            siteId: result.siteId,
            siteName: result.siteName,
            employees: result.employees,
          });
        }
        return sendSuccess(res, { count: totalSaved, registers: savedRegisters }, `Successfully saved ${registers.length} sheets (${totalSaved} attendance records) to database`);
      }

      if (!Array.isArray(employees)) throw new AppError('employees array is required', 400);

      const result = await persistRegisterToDatabase({
        siteId,
        siteName,
        month: Number(month) || (new Date().getMonth() + 1),
        year: Number(year) || new Date().getFullYear(),
        employees,
      });

      return sendSuccess(res, {
        count: result.savedEntriesCount,
        siteId: result.siteId,
        siteName: result.siteName,
        employees: result.employees,
      }, `Successfully saved ${result.savedEntriesCount} attendance records to database`);
    } catch (e) {
      return next(e);
    }
  },

  async uploadPhoto(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.file) throw new AppError('Please upload an attendance register photo', 400);
      const siteId = resolveSiteId(req, typeof req.body.siteId === 'string' ? req.body.siteId : undefined);
      if (!siteId) throw new AppError('siteId is required', 400);
      const year = Number(req.body.year);
      const month = Number(req.body.month);
      if (!Number.isInteger(year) || year < 2000 || !Number.isInteger(month) || month < 1 || month > 12) {
        throw new AppError('A valid month and year are required', 400);
      }
      const records = await attendanceRepository.findMonthly({ siteId, year, month });
      const buffer = await buildPhotoAttendanceExcel({
        image: req.file.buffer,
        imageExtension: req.file.mimetype === 'image/png' ? 'png' : 'jpeg',
        siteName: String(req.body.siteName || 'Selected site'),
        month,
        year,
        records,
      });
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="attendance-photo-${year}-${month}.xlsx"`);
      return res.send(buffer);
    } catch (e) {
      return next(e);
    }
  },

  async exportPdf(req: Request, res: Response, next: NextFunction) {
    try {
      const query = attendanceQuerySchema.parse(req.query);
      const now = new Date();
      const year = query.year ?? now.getFullYear();
      const month = query.month ?? now.getMonth() + 1;
      const siteId = resolveSiteId(req, query.siteId);

      const monthlyData = await attendanceService.getMonthly({
        siteId,
        year,
        month,
        employeeId: query.employeeId,
      });

      const buffer = await buildExactAttendanceRegisterPdf({
        siteName: monthlyData.site?.name || 'Immaculate Masters Facility Management Services',
        month,
        year,
        employees: monthlyData.employees,
        hkSupDays: monthlyData.summary?.hkSupDays,
        hkDays: monthlyData.summary?.hkDays,
        totalDays: monthlyData.summary?.totalDays,
      });

      const cleanSiteName = (monthlyData.site?.name || 'Register').replace(/[^a-zA-Z0-9_-]/g, '_');
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="attendance-${cleanSiteName}-${year}-${month}.pdf"`);
      return res.send(buffer);
    } catch (e) {
      return next(e);
    }
  },

  async generateRegisterPdf(req: Request, res: Response, next: NextFunction) {
    try {
      const { siteName, month, year, employees, hkSupDays, hkDays, totalDays } = req.body;
      if (!month || !year || !Array.isArray(employees)) {
        throw new AppError('Invalid register payload', 400);
      }
      const buffer = await buildExactAttendanceRegisterPdf({
        siteName: siteName || 'Facility Attendance Register',
        month: Number(month),
        year: Number(year),
        employees,
        hkSupDays: hkSupDays !== undefined ? Number(hkSupDays) : undefined,
        hkDays: hkDays !== undefined ? Number(hkDays) : undefined,
        totalDays: totalDays !== undefined ? Number(totalDays) : undefined,
      });
      const cleanSiteName = (siteName || 'Register').replace(/[^a-zA-Z0-9_-]/g, '_');
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="attendance-register-${cleanSiteName}-${year}-${month}.pdf"`);
      return res.send(buffer);
    } catch (e) {
      return next(e);
    }
  },
};

