import type { NextFunction, Request, Response } from 'express';
import { invoiceService } from '../services/invoice.service.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { invoiceQuerySchema } from '../validators/invoice.validator.js';
import { buildInvoicePdf } from '../utils/pdf.js';

export const invoiceController = {
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await invoiceService.create(req.body);
      return sendSuccess(res, data, 'Invoice created', 201);
    } catch (e) {
      return next(e);
    }
  },
  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await invoiceService.update(req.params.id as string, req.body);
      return sendSuccess(res, data, 'Invoice updated');
    } catch (e) {
      return next(e);
    }
  },
  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await invoiceService.getById(req.params.id as string);
      return sendSuccess(res, data);
    } catch (e) {
      return next(e);
    }
  },
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const query = invoiceQuerySchema.parse(req.query);
      const data = await invoiceService.list(query);
      return sendSuccess(res, data);
    } catch (e) {
      return next(e);
    }
  },
  async remove(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await invoiceService.remove(req.params.id as string);
      return sendSuccess(res, data, data.message);
    } catch (e) {
      return next(e);
    }
  },
  async pdf(req: Request, res: Response, next: NextFunction) {
    try {
      const invoice = await invoiceService.getById(req.params.id as string);
      const buffer = await buildInvoicePdf(invoice);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${invoice.invoiceNumber}.pdf"`);
      return res.send(buffer);
    } catch (e) {
      return next(e);
    }
  },
};
