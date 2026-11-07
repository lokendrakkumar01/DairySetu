import { Request, Response, NextFunction } from 'express';
import { sendError } from '../utils/responseHelper';

interface AppError extends Error {
  statusCode?: number;
  status?: number;
  code?: number;
}

export function errorHandler(
  err: AppError,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction
): void {
  console.error('❌ Error:', err);

  // Mongoose duplicate key
  if (err.code === 11000) {
    sendError(res, 'Duplicate entry: resource already exists', 409);
    return;
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    sendError(res, err.message, 422);
    return;
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    sendError(res, 'Invalid token', 401);
    return;
  }

  if (err.name === 'TokenExpiredError') {
    sendError(res, 'Token expired', 401);
    return;
  }

  const statusCode = err.statusCode || err.status || 500;
  const message = err.message || 'Internal server error';
  sendError(res, message, statusCode);
}
