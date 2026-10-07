import type { NextFunction, Request, Response } from 'express';
import { format } from 'date-fns';
import { invoiceService } from '../services/invoice.service.js';
import { invoiceRepository } from '../repositories/invoice.repository.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { invoiceQuerySchema } from '../validators/invoice.validator.js';
import { buildInvoicePdf, buildGenericPdfTable } from '../utils/pdf.js';
import { buildGenericExcel, buildSingleInvoiceExcel } from '../utils/excel.js';

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
  async summary(req: Request, res: Response, next: NextFunction) {
    try {
      const clientId = typeof req.query.clientId === 'string' ? req.query.clientId : undefined;
      const data = await invoiceService.summary(clientId);
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
  async singleExcel(req: Request, res: Response, next: NextFunction) {
    try {
      const invoice = await invoiceService.getById(req.params.id as string);
      const buffer = await buildSingleInvoiceExcel(invoice);
      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      );
      res.setHeader('Content-Disposition', `attachment; filename="${invoice.invoiceNumber}.xlsx"`);
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
      const { items } = await invoiceRepository.findMany({ search, clientId, status, page: 1, limit: 10000 });
      const columns = [
        { header: 'Invoice Number', key: 'invoiceNumber', width: 18 },
        { header: 'Date', key: 'date', width: 14 },
        { header: 'Client Company', key: 'client', width: 25 },
        { header: 'Facility Site', key: 'site', width: 20 },
        { header: 'Billing Period', key: 'period', width: 24 },
        { header: 'Status', key: 'status', width: 12 },
        { header: 'Subtotal (₹)', key: 'subtotal', width: 15 },
        { header: 'GST Amount (₹)', key: 'gst', width: 15 },
        { header: 'Total (₹)', key: 'total', width: 18 },
      ];
      const rows = items.map((i) => ({
        invoiceNumber: i.invoiceNumber,
        date: format(new Date(i.date), 'dd/MM/yyyy'),
        client: i.client.companyName,
        site: i.site.name,
        period: `${format(new Date(i.periodFrom), 'dd/MM/yyyy')} - ${format(new Date(i.periodTo), 'dd/MM/yyyy')}`,
        status: i.status,
        subtotal: Number(i.subtotal),
        gst: Number(i.gstAmount),
        total: Number(i.total),
      }));
      const buffer = await buildGenericExcel('Invoices Directory', columns, rows);
      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      );
      res.setHeader('Content-Disposition', 'attachment; filename="invoices-list.xlsx"');
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
      const { items } = await invoiceRepository.findMany({ search, clientId, status, page: 1, limit: 10000 });
      const columns = [
        { header: 'Invoice No', key: 'invoiceNumber', width: 100 },
        { header: 'Date', key: 'date', width: 75 },
        { header: 'Client Company', key: 'client', width: 160 },
        { header: 'Facility Site', key: 'site', width: 130 },
        { header: 'Billing Period', key: 'period', width: 140 },
        { header: 'Status', key: 'status', width: 75 },
        { header: 'Total (₹)', key: 'total', width: 100, align: 'right' as const },
      ];
      const rows = items.map((i) => ({
        invoiceNumber: i.invoiceNumber,
        date: format(new Date(i.date), 'dd/MM/yyyy'),
        client: i.client.companyName,
        site: i.site.name,
        period: `${format(new Date(i.periodFrom), 'dd/MM/yy')} - ${format(new Date(i.periodTo), 'dd/MM/yy')}`,
        status: i.status,
        total: Number(i.total).toLocaleString('en-IN', { minimumFractionDigits: 2 }),
      }));
      const buffer = await buildGenericPdfTable({
        title: 'Tax Invoices Directory',
        subtitle: `Total Invoices: ${items.length}`,
        columns,
        rows,
      });
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename="invoices-list.pdf"');
      return res.send(buffer);
    } catch (e) {
      return next(e);
    }
  },
};
