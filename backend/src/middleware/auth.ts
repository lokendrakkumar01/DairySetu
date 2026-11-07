import { Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/jwt';
import { AuthRequest } from '../types';
import { sendError } from '../utils/responseHelper';

export function authenticate(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    sendError(res, 'No token provided', 401);
    return;
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = verifyAccessToken(token);
    req.user = decoded;
    next();
  } catch {
    sendError(res, 'Invalid or expired token', 401);
  }
}

export function requireAdmin(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void {
  if (!req.user || req.user.role !== 'admin') {
    sendError(res, 'Admin access required', 403);
    return;
  }
  next();
}

export function requireSameDairy(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void {
  const dairyId = req.params.dairyId || req.body.dairyId || req.query.dairyId;
  if (dairyId && req.user && dairyId !== req.user.dairyId) {
    sendError(res, 'Access denied: dairy mismatch', 403);
    return;
  }
  next();
}
