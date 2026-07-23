import type { NextFunction, Request, Response } from 'express';
import { billService } from '../services/bill.service.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { billQuerySchema } from '../validators/bill.validator.js';
import { buildBillPdf } from '../utils/pdf.js';

export const billController = {
  async generate(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await billService.generate(req.body);
      return sendSuccess(res, data, 'Bill generated', 201);
    } catch (e) {
      return next(e);
    }
  },
  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await billService.getById(req.params.id as string);
      return sendSuccess(res, data);
    } catch (e) {
      return next(e);
    }
  },
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const query = billQuerySchema.parse(req.query);
      const data = await billService.list(query);
      return sendSuccess(res, data);
    } catch (e) {
      return next(e);
    }
  },
  async pdf(req: Request, res: Response, next: NextFunction) {
    try {
      const bill = await billService.getById(req.params.id as string);
      const buffer = await buildBillPdf(bill);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${bill.billNumber}.pdf"`);
      return res.send(buffer);
    } catch (e) {
      return next(e);
    }
  },
};
