import { Request } from 'express';
import { Types } from 'mongoose';

export type UserRole = 'admin' | 'customer';
export type MilkType = 'cow' | 'buffalo' | 'mixed';
export type PaymentMethod = 'cash' | 'upi' | 'bank' | 'other';
export type BillStatus = 'draft' | 'finalized' | 'closed';
export type AdjustmentType = 'discount' | 'credit' | 'debit' | 'refund';
export type Language = 'en' | 'hi';

export interface JwtPayload {
  userId: string;
  dairyId: string;
  role: UserRole;
  customerId?: string;
}

export interface AuthRequest extends Request {
  user?: JwtPayload;
}

export interface PaginationQuery {
  page?: string;
  limit?: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  pagination?: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}

export interface DailySnapshot {
  date: Date;
  morning: number;
  evening: number;
  total: number;
  rate: number;
  amount: number;
}
