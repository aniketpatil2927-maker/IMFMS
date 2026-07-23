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
};
