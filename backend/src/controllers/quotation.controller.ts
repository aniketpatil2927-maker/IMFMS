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
  async summary(req: Request, res: Response, next: NextFunction) {
    try {
      const clientId = typeof req.query.clientId === 'string' ? req.query.clientId : undefined;
      const data = await quotationService.summary(clientId);
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
  async exportListExcel(req: Request, res: Response, next: NextFunction) {
    try {
      const search = typeof req.query.search === 'string' ? req.query.search : undefined;
      const clientId = typeof req.query.clientId === 'string' ? req.query.clientId : undefined;
      const status = typeof req.query.status === 'string' ? req.query.status : undefined;
      const { quotationRepository } = await import('../repositories/quotation.repository.js');
      const { format } = await import('date-fns');
      const { items } = await quotationRepository.findMany({ search, clientId, status, page: 1, limit: 10000 });
      const columns = [
        { header: 'Quotation Number', key: 'quotationNumber', width: 18 },
        { header: 'Date', key: 'date', width: 14 },
        { header: 'Client Company', key: 'client', width: 26 },
        { header: 'Facility Site', key: 'site', width: 22 },
        { header: 'Status', key: 'status', width: 12 },
        { header: 'Subtotal (₹)', key: 'subtotal', width: 15 },
        { header: 'GST (₹)', key: 'gst', width: 15 },
        { header: 'Total (₹)', key: 'total', width: 18 },
      ];
      const rows = items.map((q) => ({
        quotationNumber: q.quotationNumber,
        date: format(new Date(q.date), 'dd/MM/yyyy'),
        client: q.client.companyName,
        site: q.site.name,
        status: q.status,
        subtotal: Number(q.subtotal),
        gst: Number(q.gstAmount),
        total: Number(q.total),
      }));
      const { buildGenericExcel } = await import('../utils/excel.js');
      const buffer = await buildGenericExcel('Quotations Directory', columns, rows);
      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      );
      res.setHeader('Content-Disposition', 'attachment; filename="quotations-list.xlsx"');
      return res.send(buffer);
    } catch (e) {
      return next(e);
    }
  },
  async exportListPdf(req: Request, res: Response, next: NextFunction) {
    try {
      const search = typeof req.query.search === 'string' ? req.query.search : undefined;
      const clientId = typeof req.query.clientId === 'string' ? req.query.clientId : undefined;
      const status = typeof req.query.status === 'string' ? req.query.status : undefined;
      const { quotationRepository } = await import('../repositories/quotation.repository.js');
      const { format } = await import('date-fns');
      const { items } = await quotationRepository.findMany({ search, clientId, status, page: 1, limit: 10000 });
      const columns = [
        { header: 'Quotation No', key: 'quotationNumber', width: 110 },
        { header: 'Date', key: 'date', width: 80 },
        { header: 'Client Company', key: 'client', width: 180 },
        { header: 'Facility Site', key: 'site', width: 140 },
        { header: 'Status', key: 'status', width: 80 },
        { header: 'Total (₹)', key: 'total', width: 110, align: 'right' as const },
      ];
      const rows = items.map((q) => ({
        quotationNumber: q.quotationNumber,
        date: format(new Date(q.date), 'dd/MM/yyyy'),
        client: q.client.companyName,
        site: q.site.name,
        status: q.status,
        total: Number(q.total).toLocaleString('en-IN', { minimumFractionDigits: 2 }),
      }));
      const { buildGenericPdfTable } = await import('../utils/pdf.js');
      const buffer = await buildGenericPdfTable({
        title: 'Quotations Directory',
        subtitle: `Total Quotations: ${items.length}`,
        columns,
        rows,
      });
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename="quotations-list.pdf"');
      return res.send(buffer);
    } catch (e) {
      return next(e);
    }
  },
};
