import type { NextFunction, Request, Response } from 'express';
import { format } from 'date-fns';
import { prisma } from '../config/database.js';
import { attendanceRepository } from '../repositories/attendance.repository.js';
import { buildAttendanceExcel, buildGenericExcel } from '../utils/excel.js';
import { buildAttendancePdf } from '../utils/pdf.js';
import { toNumber } from '../utils/documentNumber.js';
import { AppError } from '../utils/AppError.js';
import { sendSuccess } from '../utils/apiResponse.js';

export const reportController = {
  async attendance(req: Request, res: Response, next: NextFunction) {
    try {
      const year = Number(req.query.year) || new Date().getFullYear();
      const month = Number(req.query.month) || new Date().getMonth() + 1;
      let siteId = typeof req.query.siteId === 'string' ? req.query.siteId : undefined;
      if (req.user?.role === 'SITE_SUPERVISOR') {
        siteId = req.user.siteId ?? undefined;
      }
      const records = await attendanceRepository.findMonthly({ siteId, year, month });
      return sendSuccess(res, { year, month, records });
    } catch (e) {
      return next(e);
    }
  },

  async employees(_req: Request, res: Response, next: NextFunction) {
    try {
      const items = await prisma.employee.findMany({
        include: { site: { select: { id: true, name: true } } },
        orderBy: { name: 'asc' },
      });
      return sendSuccess(res, { items });
    } catch (e) {
      return next(e);
    }
  },

  async quotations(_req: Request, res: Response, next: NextFunction) {
    try {
      const items = await prisma.quotation.findMany({
        include: {
          client: { select: { companyName: true } },
          site: { select: { name: true } },
        },
        orderBy: { createdAt: 'desc' },
      });
      return sendSuccess(res, { items });
    } catch (e) {
      return next(e);
    }
  },

  async invoices(_req: Request, res: Response, next: NextFunction) {
    try {
      const items = await prisma.invoice.findMany({
        include: {
          client: { select: { companyName: true } },
          site: { select: { name: true } },
        },
        orderBy: { createdAt: 'desc' },
      });
      return sendSuccess(res, { items });
    } catch (e) {
      return next(e);
    }
  },

  async bills(_req: Request, res: Response, next: NextFunction) {
    try {
      const items = await prisma.bill.findMany({
        include: {
          invoice: {
            select: {
              invoiceNumber: true,
              client: { select: { companyName: true } },
              site: { select: { name: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
      return sendSuccess(res, { items });
    } catch (e) {
      return next(e);
    }
  },

  async clients(_req: Request, res: Response, next: NextFunction) {
    try {
      const items = await prisma.client.findMany({
        include: { _count: { select: { sites: true } } },
        orderBy: { companyName: 'asc' },
      });
      return sendSuccess(res, { items });
    } catch (e) {
      return next(e);
    }
  },

  async sites(_req: Request, res: Response, next: NextFunction) {
    try {
      const items = await prisma.site.findMany({
        include: { client: true, _count: { select: { employees: true } } },
        orderBy: { name: 'asc' },
      });
      return sendSuccess(res, { items });
    } catch (e) {
      return next(e);
    }
  },

  async expenses(_req: Request, res: Response, next: NextFunction) {
    try {
      const { expenseRepository } = await import('../repositories/expense.repository.js');
      const { items } = await expenseRepository.findMany({ page: 1, limit: 1000 });
      return sendSuccess(res, { items });
    } catch (e) {
      return next(e);
    }
  },

  async export(req: Request, res: Response, next: NextFunction) {
    try {
      const type = String(req.params.type);
      const formatType = String(req.query.format ?? 'excel');

      if (type === 'attendance') {
        const year = Number(req.query.year) || new Date().getFullYear();
        const month = Number(req.query.month) || new Date().getMonth() + 1;
        let siteId = typeof req.query.siteId === 'string' ? req.query.siteId : undefined;
        if (req.user?.role === 'SITE_SUPERVISOR') siteId = req.user.siteId ?? undefined;

        if (siteId) {
          const { attendanceService } = await import('../services/attendance.service.js');
          const registerData = (await attendanceService.getMonthly({ siteId, year, month })) as {
            site?: { name: string } | null;
            employees: Array<{
              serial?: number;
              name: string;
              designation: string;
              days: Record<number, string>;
              wDays?: number;
              wo?: number;
              otLeave?: number;
              total?: number;
            }>;
            summary: {
              hkSupDays: number;
              hkDays: number;
              totalDays: number;
            };
          };

          const siteName = registerData.site?.name || 'Site';
          if (formatType === 'pdf') {
            const { buildExactAttendanceRegisterPdf } = await import('../utils/pdf.js');
            const buffer = await buildExactAttendanceRegisterPdf({
              siteName,
              month,
              year,
              employees: registerData.employees,
              hkSupDays: registerData.summary.hkSupDays,
              hkDays: registerData.summary.hkDays,
              totalDays: registerData.summary.totalDays,
            });
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename="attendance-${siteName.toLowerCase().replace(/\s+/g, '-')}-${month}-${year}.pdf"`);
            return res.send(buffer);
          }

          const { buildExactAttendanceRegisterExcel } = await import('../utils/excel.js');
          const buffer = await buildExactAttendanceRegisterExcel({
            siteName,
            month,
            year,
            employees: registerData.employees,
            hkSupDays: registerData.summary.hkSupDays,
            hkDays: registerData.summary.hkDays,
            totalDays: registerData.summary.totalDays,
          });
          res.setHeader(
            'Content-Type',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          );
          res.setHeader('Content-Disposition', `attachment; filename="attendance-${siteName.toLowerCase().replace(/\s+/g, '-')}-${month}-${year}.xlsx"`);
          return res.send(buffer);
        }

        const records = await attendanceRepository.findMonthly({ siteId, year, month });
        if (formatType === 'pdf') {
          const buffer = await buildAttendancePdf({
            title: `Attendance Report ${month}/${year}`,
            records,
          });
          res.setHeader('Content-Type', 'application/pdf');
          res.setHeader('Content-Disposition', 'attachment; filename="attendance-report.pdf"');
          return res.send(buffer);
        }
        const buffer = await buildAttendanceExcel(records);
        res.setHeader(
          'Content-Type',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        );
        res.setHeader('Content-Disposition', 'attachment; filename="attendance-report.xlsx"');
        return res.send(buffer);
      }

      if (req.user?.role === 'SITE_SUPERVISOR' && type !== 'attendance') {
        throw new AppError('Access denied', 403);
      }

      let columns: Array<{ header: string; key: string; width?: number }> = [];
      let rows: Record<string, unknown>[] = [];
      let filename = `${type}-report`;

      if (type === 'employees') {
        const items = await prisma.employee.findMany({
          include: { site: { select: { name: true } } },
        });
        columns = [
          { header: 'Employee ID', key: 'code', width: 14 },
          { header: 'Name', key: 'name', width: 22 },
          { header: 'Mobile', key: 'mobile', width: 14 },
          { header: 'Designation', key: 'designation', width: 16 },
          { header: 'Salary', key: 'salary', width: 12 },
          { header: 'Site', key: 'site', width: 18 },
          { header: 'Active', key: 'active', width: 10 },
        ];
        rows = items.map((e) => ({
          code: e.employeeCode,
          name: e.name,
          mobile: e.mobile,
          designation: e.designation,
          salary: toNumber(e.salary),
          site: e.site.name,
          active: e.isActive ? 'Yes' : 'No',
        }));
      } else if (type === 'quotations') {
        const items = await prisma.quotation.findMany({
          include: { client: true, site: true },
        });
        columns = [
          { header: 'Number', key: 'number', width: 16 },
          { header: 'Date', key: 'date', width: 12 },
          { header: 'Client', key: 'client', width: 22 },
          { header: 'Site', key: 'site', width: 18 },
          { header: 'Status', key: 'status', width: 12 },
          { header: 'Total', key: 'total', width: 12 },
        ];
        rows = items.map((q) => ({
          number: q.quotationNumber,
          date: format(q.date, 'yyyy-MM-dd'),
          client: q.client.companyName,
          site: q.site.name,
          status: q.status,
          total: toNumber(q.total),
        }));
      } else if (type === 'invoices') {
        const items = await prisma.invoice.findMany({
          include: { client: true, site: true },
        });
        columns = [
          { header: 'Number', key: 'number', width: 16 },
          { header: 'Date', key: 'date', width: 12 },
          { header: 'Client', key: 'client', width: 22 },
          { header: 'Site', key: 'site', width: 18 },
          { header: 'Status', key: 'status', width: 12 },
          { header: 'Total', key: 'total', width: 12 },
        ];
        rows = items.map((i) => ({
          number: i.invoiceNumber,
          date: format(i.date, 'yyyy-MM-dd'),
          client: i.client.companyName,
          site: i.site.name,
          status: i.status,
          total: toNumber(i.total),
        }));
      } else if (type === 'bills') {
        const items = await prisma.bill.findMany({
          include: {
            invoice: { include: { client: true, site: true } },
          },
        });
        columns = [
          { header: 'Bill No', key: 'number', width: 16 },
          { header: 'Invoice', key: 'invoice', width: 16 },
          { header: 'Month', key: 'month', width: 14 },
          { header: 'Client', key: 'client', width: 22 },
          { header: 'Employees', key: 'employees', width: 12 },
          { header: 'Grand Total', key: 'total', width: 14 },
        ];
        rows = items.map((b) => ({
          number: b.billNumber,
          invoice: b.invoice.invoiceNumber,
          month: b.billingMonth,
          client: b.invoice.client.companyName,
          employees: b.totalEmployees,
          total: toNumber(b.grandTotal),
        }));
      } else if (type === 'clients') {
        const items = await prisma.client.findMany({
          include: { _count: { select: { sites: true } } },
        });
        columns = [
          { header: 'Client Company', key: 'company', width: 24 },
          { header: 'Contact Person', key: 'contact', width: 20 },
          { header: 'Mobile', key: 'mobile', width: 16 },
          { header: 'Email', key: 'email', width: 22 },
          { header: 'GST', key: 'gst', width: 18 },
          { header: 'Sites', key: 'sites', width: 10 },
        ];
        rows = items.map((c) => ({
          company: c.companyName,
          contact: c.contactPerson || '-',
          mobile: c.mobile,
          email: c.email || '-',
          gst: c.gstNumber || '-',
          sites: c._count?.sites ?? 0,
        }));
      } else if (type === 'sites') {
        const items = await prisma.site.findMany({
          include: { client: true, _count: { select: { employees: true } } },
        });
        columns = [
          { header: 'Site Name', key: 'name', width: 24 },
          { header: 'Client', key: 'client', width: 22 },
          { header: 'Supervisor', key: 'supervisor', width: 18 },
          { header: 'Contact', key: 'contact', width: 16 },
          { header: 'Employees', key: 'employees', width: 12 },
        ];
        rows = items.map((s) => ({
          name: s.name,
          client: s.client.companyName,
          supervisor: s.supervisorName || '-',
          contact: s.contactNumber || '-',
          employees: s._count?.employees ?? 0,
        }));
      } else if (type === 'expenses') {
        const { expenseRepository } = await import('../repositories/expense.repository.js');
        const { items } = await expenseRepository.findMany({ page: 1, limit: 10000 });
        columns = [
          { header: 'Voucher', key: 'number', width: 14 },
          { header: 'Date', key: 'date', width: 12 },
          { header: 'Category', key: 'category', width: 14 },
          { header: 'Particulars', key: 'title', width: 28 },
          { header: 'Site', key: 'site', width: 18 },
          { header: 'Staff', key: 'staff', width: 16 },
          { header: 'Vendor', key: 'vendor', width: 16 },
          { header: 'Mode', key: 'mode', width: 12 },
          { header: 'Amount', key: 'amount', width: 14 },
        ];
        rows = items.map((e) => ({
          number: e.expenseNumber,
          date: e.date,
          category: e.category,
          title: e.title,
          site: e.site?.name || '-',
          staff: e.employee?.name || '-',
          vendor: e.vendorName || '-',
          mode: e.paymentMode,
          amount: e.amount,
        }));
      } else {
        throw new AppError('Unknown report type', 400);
      }

      if (formatType === 'pdf') {
        const { buildGenericPdfTable } = await import('../utils/pdf.js');
        const totalW = columns.reduce((acc, c) => acc + (c.width || 15), 0);
        const pdfCols = columns.map((c) => ({
          header: c.header,
          key: c.key,
          width: Math.round(((c.width || 15) / totalW) * 780),
        }));
        const buffer = await buildGenericPdfTable({
          title: `${type.toUpperCase()} REPORT`,
          subtitle: `Total Records: ${rows.length}`,
          columns: pdfCols,
          rows,
        });
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}.pdf"`);
        return res.send(buffer);
      }

      const buffer = await buildGenericExcel(type, columns, rows);
      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      );
      res.setHeader('Content-Disposition', `attachment; filename="${filename}.xlsx"`);
      return res.send(buffer);
    } catch (e) {
      return next(e);
    }
  },
};
