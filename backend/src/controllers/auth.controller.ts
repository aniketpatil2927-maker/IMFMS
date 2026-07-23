import type { Request, Response, NextFunction } from 'express';
import { authService } from '../services/auth.service.js';
import { sendSuccess } from '../utils/apiResponse.js';

export const authController = {
  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await authService.login(req.body);
      return sendSuccess(res, data, 'Login successful');
    } catch (error) {
      return next(error);
    }
  },

  async me(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await authService.me(req.user!.userId);
      return sendSuccess(res, data);
    } catch (error) {
      return next(error);
    }
  },

  async changePassword(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await authService.changePassword(req.user!.userId, req.body);
      return sendSuccess(res, data, data.message);
    } catch (error) {
      return next(error);
    }
  },

  async forgotPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await authService.forgotPassword(req.body);
      return sendSuccess(res, data, data.message);
    } catch (error) {
      return next(error);
    }
  },
};
