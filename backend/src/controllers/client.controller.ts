import type { NextFunction, Request, Response } from 'express';
import { clientService } from '../services/client.service.js';
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
};
