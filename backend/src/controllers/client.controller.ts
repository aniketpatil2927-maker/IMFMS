import type { NextFunction, Request, Response } from 'express';
import { clientService } from '../services/client.service.js';
import { clientRepository } from '../repositories/client.repository.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { clientQuerySchema } from '../validators/client.validator.js';

export const clientController = {
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await clientService.create(req.body);
      return sendSuccess(res, data, 'Client created', 201);
    } catch (e) {
      return next(e);
    }
  },
  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await clientService.update(req.params.id as string, req.body);
      return sendSuccess(res, data, 'Client updated');
    } catch (e) {
      return next(e);
    }
  },
  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await clientService.getById(req.params.id as string);
      return sendSuccess(res, data);
    } catch (e) {
      return next(e);
    }
  },
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const query = clientQuerySchema.parse(req.query);
      const data = await clientService.list(query);
      return sendSuccess(res, data);
    } catch (e) {
      return next(e);
    }
  },
  async remove(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await clientService.remove(req.params.id as string);
      return sendSuccess(res, data, data.message);
    } catch (e) {
      return next(e);
    }
  },
  async exportExcel(req: Request, res: Response, next: NextFunction) {
    try {
      const search = typeof req.query.search === 'string' ? req.query.search : undefined;
      const { items } = await clientRepository.findMany({ search, page: 1, limit: 10000 });
      const columns = [
        { header: 'Client / Company Name', key: 'companyName', width: 28 },
        { header: 'Contact Person', key: 'contactPerson', width: 20 },
        { header: 'Mobile Number', key: 'mobile', width: 16 },
        { header: 'Email Address', key: 'email', width: 24 },
        { header: 'GST Number', key: 'gstNumber', width: 18 },
        { header: 'Address', key: 'address', width: 32 },
        { header: 'Sites Count', key: 'sitesCount', width: 14 },
      ];
      const rows = items.map((c) => ({
        companyName: c.companyName,
        contactPerson: c.contactPerson || '-',
        mobile: c.mobile,
        email: c.email || '-',
        gstNumber: c.gstNumber || '-',
        address: c.address,
        sitesCount: c._count?.sites ?? 0,
      }));
      const { buildGenericExcel } = await import('../utils/excel.js');
      const buffer = await buildGenericExcel('Clients Directory', columns, rows);
      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      );
      res.setHeader('Content-Disposition', 'attachment; filename="clients-list.xlsx"');
      return res.send(buffer);
    } catch (e) {
      return next(e);
    }
  },
  async exportPdf(req: Request, res: Response, next: NextFunction) {
    try {
      const search = typeof req.query.search === 'string' ? req.query.search : undefined;
      const { items } = await clientRepository.findMany({ search, page: 1, limit: 10000 });
      const columns = [
        { header: 'Client / Company Name', key: 'companyName', width: 170 },
        { header: 'Contact Person', key: 'contactPerson', width: 120 },
        { header: 'Mobile', key: 'mobile', width: 90 },
        { header: 'Email', key: 'email', width: 130 },
        { header: 'GST Number', key: 'gstNumber', width: 110 },
        { header: 'Sites', key: 'sitesCount', width: 60, align: 'center' as const },
      ];
      const rows = items.map((c) => ({
        companyName: c.companyName,
        contactPerson: c.contactPerson || '-',
        mobile: c.mobile,
        email: c.email || '-',
        gstNumber: c.gstNumber || '-',
        sitesCount: c._count?.sites ?? 0,
      }));
      const { buildGenericPdfTable } = await import('../utils/pdf.js');
      const buffer = await buildGenericPdfTable({
        title: 'Clients Directory',
        subtitle: `Total Clients: ${items.length}`,
        columns,
        rows,
      });
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename="clients-list.pdf"');
      return res.send(buffer);
    } catch (e) {
      return next(e);
    }
  },
};
