import type { NextFunction, Request, Response } from 'express';
import { expenseService } from '../services/expense.service.js';
import { expenseCreateSchema, expenseQuerySchema, expenseUpdateSchema } from '../validators/expense.validator.js';
import { sendSuccess } from '../utils/apiResponse.js';

export const expenseController = {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const query = expenseQuerySchema.parse(req.query);
      const data = await expenseService.list(query);
      return sendSuccess(res, data);
    } catch (e) {
      return next(e);
    }
  },

  async summary(req: Request, res: Response, next: NextFunction) {
    try {
      const siteId = typeof req.query.siteId === 'string' ? req.query.siteId : undefined;
      const from = typeof req.query.from === 'string' ? req.query.from : undefined;
      const to = typeof req.query.to === 'string' ? req.query.to : undefined;
      const data = await expenseService.summary({ siteId, from, to });
      return sendSuccess(res, data);
    } catch (e) {
      return next(e);
    }
  },

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await expenseService.getById(req.params.id as string);
      if (!data) {
        return res.status(404).json({ success: false, message: 'Expense record not found' });
      }
      return sendSuccess(res, data);
    } catch (e) {
      return next(e);
    }
  },

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const input = expenseCreateSchema.parse(req.body);
      const data = await expenseService.create(input);
      return sendSuccess(res, data, 'Expense recorded successfully', 201);
    } catch (e) {
      return next(e);
    }
  },

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const input = expenseUpdateSchema.parse(req.body);
      const data = await expenseService.update(req.params.id as string, input);
      return sendSuccess(res, data, 'Expense updated successfully');
    } catch (e) {
      return next(e);
    }
  },

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      await expenseService.delete(req.params.id as string);
      return sendSuccess(res, null, 'Expense record deleted');
    } catch (e) {
      return next(e);
    }
  },

  async exportExcel(req: Request, res: Response, next: NextFunction) {
    try {
      const query = expenseQuerySchema.partial().parse(req.query);
      const buffer = await expenseService.buildExcel(query);
      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      );
      res.setHeader('Content-Disposition', 'attachment; filename="expenses-register.xlsx"');
      return res.send(buffer);
    } catch (e) {
      return next(e);
    }
  },

  async exportPdf(req: Request, res: Response, next: NextFunction) {
    try {
      const query = expenseQuerySchema.partial().parse(req.query);
      const buffer = await expenseService.buildPdf(query);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename="expenses-register.pdf"');
      return res.send(buffer);
    } catch (e) {
      return next(e);
    }
  },
};
