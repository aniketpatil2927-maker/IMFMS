import type { NextFunction, Request, Response } from 'express';
import { attendanceService } from '../services/attendance.service.js';
import { attendanceRepository } from '../repositories/attendance.repository.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { attendanceQuerySchema } from '../validators/attendance.validator.js';
import { buildAttendanceExcel } from '../utils/excel.js';
import { buildAttendancePdf } from '../utils/pdf.js';
import { AppError } from '../utils/AppError.js';

function resolveSiteId(req: Request, querySiteId?: string) {
  if (req.user?.role === 'SITE_SUPERVISOR') {
    if (!req.user.siteId) throw new AppError('Supervisor is not assigned to a site', 403);
    return req.user.siteId;
  }
  return querySiteId;
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
      const records = await attendanceRepository.findMonthly({
        siteId,
        year,
        month,
        employeeId: query.employeeId,
      });
      const buffer = await buildAttendanceExcel(records);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="attendance-${year}-${month}.xlsx"`);
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
      const records = await attendanceRepository.findMonthly({
        siteId,
        year,
        month,
        employeeId: query.employeeId,
      });
      const buffer = await buildAttendancePdf({
        title: `Attendance Register - ${month}/${year}`,
        siteName: records[0]?.site?.name,
        records,
      });
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="attendance-${year}-${month}.pdf"`);
      return res.send(buffer);
    } catch (e) {
      return next(e);
    }
  },
};
