import type { NextFunction, Request, Response } from 'express';
import { employeeService } from '../services/employee.service.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { employeeQuerySchema } from '../validators/employee.validator.js';

export const employeeController = {
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await employeeService.create(req.body);
      return sendSuccess(res, data, 'Employee created', 201);
    } catch (e) {
      return next(e);
    }
  },
  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await employeeService.update(req.params.id as string, req.body);
      return sendSuccess(res, data, 'Employee updated');
    } catch (e) {
      return next(e);
    }
  },
  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await employeeService.getById(req.params.id as string);
      return sendSuccess(res, data);
    } catch (e) {
      return next(e);
    }
  },
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const query = employeeQuerySchema.parse(req.query);
      const data = await employeeService.list({
        ...query,
        isActive: query.isActive === undefined ? undefined : query.isActive === 'true',
        siteId: req.user?.role === 'SITE_SUPERVISOR' ? req.user.siteId ?? undefined : query.siteId,
      });
      return sendSuccess(res, data);
    } catch (e) {
      return next(e);
    }
  },
  async transfer(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await employeeService.transfer(req.params.id as string, req.body.siteId);
      return sendSuccess(res, data, 'Employee transferred');
    } catch (e) {
      return next(e);
    }
  },
  async disable(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await employeeService.disable(req.params.id as string);
      return sendSuccess(res, data, 'Employee disabled');
    } catch (e) {
      return next(e);
    }
  },
};
