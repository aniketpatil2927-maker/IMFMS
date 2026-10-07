import type { NextFunction, Request, Response } from 'express';
import { employeeService } from '../services/employee.service.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { employeeQuerySchema } from '../validators/employee.validator.js';

export const employeeController = {
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await employeeService.create(req.body);
      return sendSuccess(res, data, 'Employee created', 201);
    } catch (e) {
      return next(e);
    }
  },
  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await employeeService.update(req.params.id as string, req.body);
      return sendSuccess(res, data, 'Employee updated');
    } catch (e) {
      return next(e);
    }
  },
  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await employeeService.getById(req.params.id as string);
      return sendSuccess(res, data);
    } catch (e) {
      return next(e);
    }
  },
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const query = employeeQuerySchema.parse(req.query);
      const data = await employeeService.list({
        ...query,
        isActive: query.isActive === undefined ? undefined : query.isActive === 'true',
        siteId: req.user?.role === 'SITE_SUPERVISOR' ? req.user.siteId ?? undefined : query.siteId,
      });
      return sendSuccess(res, data);
    } catch (e) {
      return next(e);
    }
  },
  async transfer(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await employeeService.transfer(req.params.id as string, req.body.siteId);
      return sendSuccess(res, data, 'Employee transferred');
    } catch (e) {
      return next(e);
    }
  },
  async disable(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await employeeService.disable(req.params.id as string);
      return sendSuccess(res, data, 'Employee disabled');
    } catch (e) {
      return next(e);
    }
  },
  async exportExcel(req: Request, res: Response, next: NextFunction) {
    try {
      const search = typeof req.query.search === 'string' ? req.query.search : undefined;
      const siteId =
        req.user?.role === 'SITE_SUPERVISOR'
          ? req.user.siteId ?? undefined
          : typeof req.query.siteId === 'string'
            ? req.query.siteId
            : undefined;
      const { employeeRepository } = await import('../repositories/employee.repository.js');
      const { items } = await employeeRepository.findMany({
        search,
        siteId,
        page: 1,
        limit: 10000,
      });
      const columns = [
        { header: 'Staff ID', key: 'code', width: 14 },
        { header: 'Full Name', key: 'name', width: 24 },
        { header: 'Mobile Number', key: 'mobile', width: 16 },
        { header: 'Aadhaar Card', key: 'aadhaar', width: 18 },
        { header: 'PAN Card', key: 'pan', width: 15 },
        { header: 'Bank Name', key: 'bankName', width: 20 },
        { header: 'Account No', key: 'accountNumber', width: 20 },
        { header: 'IFSC Code', key: 'ifscCode', width: 14 },
        { header: 'Branch', key: 'branch', width: 16 },
        { header: 'Designation', key: 'designation', width: 18 },
        { header: 'Monthly Salary (₹)', key: 'salary', width: 18 },
        { header: 'Assigned Site', key: 'site', width: 22 },
        { header: 'Status', key: 'status', width: 12 },
      ];
      const rows = items.map((e) => ({
        code: e.employeeCode,
        name: e.name,
        mobile: e.mobile,
        aadhaar: e.aadhaar || '-',
        pan: e.pan || '-',
        bankName: e.bankName || '-',
        accountNumber: e.accountNumber || '-',
        ifscCode: e.ifscCode || '-',
        branch: e.branch || '-',
        designation: e.designation,
        salary: Number(e.salary),
        site: e.site?.name || '-',
        status: e.isActive ? 'Active' : 'Disabled',
      }));
      const { buildGenericExcel } = await import('../utils/excel.js');
      const buffer = await buildGenericExcel('Staff Roster', columns, rows);
      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      );
      res.setHeader('Content-Disposition', 'attachment; filename="employees-roster.xlsx"');
      return res.send(buffer);
    } catch (e) {
      return next(e);
    }
  },
  async exportPdf(req: Request, res: Response, next: NextFunction) {
    try {
      const search = typeof req.query.search === 'string' ? req.query.search : undefined;
      const siteId =
        req.user?.role === 'SITE_SUPERVISOR'
          ? req.user.siteId ?? undefined
          : typeof req.query.siteId === 'string'
            ? req.query.siteId
            : undefined;
      const { employeeRepository } = await import('../repositories/employee.repository.js');
      const { items } = await employeeRepository.findMany({
        search,
        siteId,
        page: 1,
        limit: 10000,
      });
      const columns = [
        { header: 'Staff ID', key: 'code', width: 70 },
        { header: 'Employee Name', key: 'name', width: 140 },
        { header: 'Designation', key: 'designation', width: 110 },
        { header: 'Mobile', key: 'mobile', width: 85 },
        { header: 'Aadhaar No', key: 'aadhaar', width: 105 },
        { header: 'Assigned Site', key: 'site', width: 130 },
        { header: 'Salary (₹)', key: 'salary', width: 80, align: 'right' as const },
        { header: 'Status', key: 'status', width: 60, align: 'center' as const },
      ];
      const rows = items.map((e) => ({
        code: e.employeeCode,
        name: e.name,
        designation: e.designation,
        mobile: e.mobile,
        aadhaar: e.aadhaar || '-',
        site: e.site?.name || '-',
        salary: Number(e.salary).toLocaleString('en-IN', { minimumFractionDigits: 2 }),
        status: e.isActive ? 'Active' : 'Disabled',
      }));
      const { buildGenericPdfTable } = await import('../utils/pdf.js');
      const buffer = await buildGenericPdfTable({
        title: 'Employee Staff Roster',
        subtitle: `Total Staff: ${items.length}`,
        columns,
        rows,
      });
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename="employees-roster.pdf"');
      return res.send(buffer);
    } catch (e) {
      return next(e);
    }
  },
};
