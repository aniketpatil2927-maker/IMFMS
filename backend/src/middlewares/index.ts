import type { NextFunction, Request, Response } from 'express';
import { ZodError, type ZodType } from 'zod';
import { verifyToken, type JwtPayload } from '../utils/jwt.js';
import { sendError } from '../utils/apiResponse.js';
import { AppError } from '../utils/AppError.js';
import type { Role } from '@prisma/client';

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

export function authenticate(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return sendError(res, 'Authentication required', 401);
  }

  try {
    const token = header.slice(7);
    req.user = verifyToken(token);
    return next();
  } catch {
    return sendError(res, 'Invalid or expired token', 401);
  }
}

export function authorize(...roles: Role[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return sendError(res, 'Authentication required', 401);
    }
    if (!roles.includes(req.user.role)) {
      return sendError(res, 'You do not have permission to perform this action', 403);
    }
    return next();
  };
}

export function validateBody<T>(schema: ZodType<T>) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      req.body = schema.parse(req.body);
      return next();
    } catch (error) {
      if (error instanceof ZodError) {
        return sendError(res, 'Validation failed', 400, error.flatten());
      }
      return next(error);
    }
  };
}

export function validateQuery<T>(schema: ZodType<T>) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = schema.parse(req.query);
      (req as Request & { validatedQuery: T }).validatedQuery = parsed;
      return next();
    } catch (error) {
      if (error instanceof ZodError) {
        return sendError(res, 'Invalid query parameters', 400, error.flatten());
      }
      return next(error);
    }
  };
}

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof AppError) {
    return sendError(res, err.message, err.status, err.errors);
  }

  if (err instanceof ZodError) {
    return sendError(res, 'Validation failed', 400, err.flatten());
  }

  console.error(err);
  return sendError(res, 'Internal server error', 500);
}
