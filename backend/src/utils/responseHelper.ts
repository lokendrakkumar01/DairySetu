import { Response } from 'express';
import { ApiResponse } from '../types';

export function sendSuccess<T>(
  res: Response,
  data: T,
  message = 'Success',
  statusCode = 200,
  pagination?: ApiResponse['pagination']
): void {
  const response: ApiResponse<T> = {
    success: true,
    data,
    message,
  };
  if (pagination) {
    response.pagination = pagination;
  }
  res.status(statusCode).json(response);
}

export function sendError(
  res: Response,
  message: string,
  statusCode = 500,
  data?: unknown
): void {
  const response: ApiResponse = {
    success: false,
    message,
    data,
  };
  res.status(statusCode).json(response);
}
