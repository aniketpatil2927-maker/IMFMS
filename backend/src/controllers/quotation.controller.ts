import type { NextFunction, Request, Response } from 'express';
import { quotationService } from '../services/quotation.service.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { quotationQuerySchema } from '../validators/quotation.validator.js';
import { buildQuotationPdf } from '../utils/quotationPdf.js';

export const quotationController = {
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await quotationService.create(req.body);
      return sendSuccess(res, data, 'Quotation created', 201);
    } catch (e) {
      return next(e);
    }
  },
  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await quotationService.update(req.params.id as string, req.body);
      return sendSuccess(res, data, 'Quotation updated');
    } catch (e) {
      return next(e);
    }
  },
  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await quotationService.getById(req.params.id as string);
      return sendSuccess(res, data);
    } catch (e) {
      return next(e);
    }
  },
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const query = quotationQuerySchema.parse(req.query);
      const data = await quotationService.list(query);
      return sendSuccess(res, data);
    } catch (e) {
      return next(e);
    }
  },
  async duplicate(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await quotationService.duplicate(req.params.id as string);
      return sendSuccess(res, data, 'Quotation duplicated', 201);
    } catch (e) {
      return next(e);
    }
  },
  async remove(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await quotationService.remove(req.params.id as string);
      return sendSuccess(res, data, data.message);
    } catch (e) {
      return next(e);
    }
  },
  async pdf(req: Request, res: Response, next: NextFunction) {
    try {
      const quotation = await quotationService.getById(req.params.id as string);
      const buffer = await buildQuotationPdf(quotation);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${quotation.quotationNumber}.pdf"`,
      );
      return res.send(buffer);
    } catch (e) {
      return next(e);
    }
  },
};
