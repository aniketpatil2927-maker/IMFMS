import type { NextFunction, Request, Response } from 'express';
import { siteService } from '../services/site.service.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { siteQuerySchema } from '../validators/site.validator.js';

export const siteController = {
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await siteService.create(req.body);
      return sendSuccess(res, data, 'Site created', 201);
    } catch (e) {
      return next(e);
    }
  },
  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await siteService.update(req.params.id as string, req.body);
      return sendSuccess(res, data, 'Site updated');
    } catch (e) {
      return next(e);
    }
  },
  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await siteService.getById(req.params.id as string);
      return sendSuccess(res, data);
    } catch (e) {
      return next(e);
    }
  },
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const query = siteQuerySchema.parse(req.query);
      const data = await siteService.list(query);
      return sendSuccess(res, data);
    } catch (e) {
      return next(e);
    }
  },
  async listLite(req: Request, res: Response, next: NextFunction) {
    try {
      const clientId = typeof req.query.clientId === 'string' ? req.query.clientId : undefined;
      const data = await siteService.listLite(clientId);
      return sendSuccess(res, data);
    } catch (e) {
      return next(e);
    }
  },
  async remove(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await siteService.remove(req.params.id as string);
      return sendSuccess(res, data, data.message);
    } catch (e) {
      return next(e);
    }
  },
  async exportExcel(req: Request, res: Response, next: NextFunction) {
    try {
      const search = typeof req.query.search === 'string' ? req.query.search : undefined;
      const clientId = typeof req.query.clientId === 'string' ? req.query.clientId : undefined;
      const { siteRepository } = await import('../repositories/site.repository.js');
      const { items } = await siteRepository.findMany({ search, clientId, page: 1, limit: 10000 });
      const columns = [
        { header: 'Site Name', key: 'name', width: 26 },
        { header: 'Client Company', key: 'client', width: 26 },
        { header: 'Supervisor Name', key: 'supervisorName', width: 20 },
        { header: 'Contact Number', key: 'contactNumber', width: 18 },
        { header: 'Site Address', key: 'address', width: 32 },
        { header: 'Staff Count', key: 'staffCount', width: 14 },
      ];
      const rows = items.map((s) => ({
        name: s.name,
        client: s.client.companyName,
        supervisorName: s.supervisorName || '-',
        contactNumber: s.contactNumber || '-',
        address: s.address,
        staffCount: s._count?.employees ?? 0,
      }));
      const { buildGenericExcel } = await import('../utils/excel.js');
      const buffer = await buildGenericExcel('Sites Directory', columns, rows);
      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      );
      res.setHeader('Content-Disposition', 'attachment; filename="sites-list.xlsx"');
      return res.send(buffer);
    } catch (e) {
      return next(e);
    }
  },
  async exportPdf(req: Request, res: Response, next: NextFunction) {
    try {
      const search = typeof req.query.search === 'string' ? req.query.search : undefined;
      const clientId = typeof req.query.clientId === 'string' ? req.query.clientId : undefined;
      const { siteRepository } = await import('../repositories/site.repository.js');
      const { items } = await siteRepository.findMany({ search, clientId, page: 1, limit: 10000 });
      const columns = [
        { header: 'Site Name', key: 'name', width: 170 },
        { header: 'Client Company', key: 'client', width: 160 },
        { header: 'Supervisor Name', key: 'supervisorName', width: 120 },
        { header: 'Contact Number', key: 'contactNumber', width: 100 },
        { header: 'Staff', key: 'staffCount', width: 60, align: 'center' as const },
      ];
      const rows = items.map((s) => ({
        name: s.name,
        client: s.client.companyName,
        supervisorName: s.supervisorName || '-',
        contactNumber: s.contactNumber || '-',
        staffCount: s._count?.employees ?? 0,
      }));
      const { buildGenericPdfTable } = await import('../utils/pdf.js');
      const buffer = await buildGenericPdfTable({
        title: 'Facility Sites Directory',
        subtitle: `Total Sites: ${items.length}`,
        columns,
        rows,
      });
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename="sites-list.pdf"');
      return res.send(buffer);
    } catch (e) {
      return next(e);
    }
  },
};
