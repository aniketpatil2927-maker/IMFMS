import type { NextFunction, Request, Response } from 'express';
import { dashboardService } from '../services/dashboard.service.js';
import { sendSuccess } from '../utils/apiResponse.js';

export const dashboardController = {
  async stats(req: Request, res: Response, next: NextFunction) {
    try {
      const siteId = req.user?.role === 'SITE_SUPERVISOR' ? req.user.siteId : null;
      const data = await dashboardService.getStats(siteId);
      return sendSuccess(res, data);
    } catch (e) {
      return next(e);
    }
  },
};
