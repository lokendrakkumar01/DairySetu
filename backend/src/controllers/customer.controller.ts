import { Response } from 'express';
import { Types } from 'mongoose';
import { z } from 'zod';
import { AuthRequest } from '../types';
import { sendSuccess, sendError } from '../utils/responseHelper';
import Customer from '../models/Customer';
import MilkRecord from '../models/MilkRecord';
import Payment from '../models/Payment';
import { createCustomer, updateCustomer, softDeleteCustomer, resetCustomerPassword } from '../services/customer.service';
import { getMonthRange } from '../utils/dateUtils';

const CreateCustomerSchema = z.object({
  fullName: z.string().min(2).max(100),
  mobile: z.string().min(10).max(15),
  address: z.string().optional(),
  village: z.string().optional(),
  milkType: z.enum(['cow', 'buffalo', 'mixed']).optional(),
  defaultMorningQty: z.number().min(0).optional(),
  defaultEveningQty: z.number().min(0).optional(),
  joinDate: z.string().optional(),
});

const UpdateCustomerSchema = z.object({
  fullName: z.string().min(2).optional(),
  mobile: z.string().min(10).optional(),
  address: z.string().optional(),
  village: z.string().optional(),
  milkType: z.enum(['cow', 'buffalo', 'mixed']).optional(),
  defaultMorningQty: z.number().min(0).optional(),
  defaultEveningQty: z.number().min(0).optional(),
  isActive: z.boolean().optional(),
});

export async function listCustomers(req: AuthRequest, res: Response): Promise<void> {
  if (!req.user) { sendError(res, 'Unauthorized', 401); return; }
  const dairyId = new Types.ObjectId(req.user.dairyId);
  const { search, status, page = '1', limit = '20' } = req.query as Record<string, string>;

  const pageNum = Math.max(1, parseInt(page, 10));
  const limitNum = Math.min(100, parseInt(limit, 10));
  const skip = (pageNum - 1) * limitNum;

  const query: Record<string, unknown> = { dairyId };
  if (status === 'active') query.isActive = true;
  else if (status === 'inactive') query.isActive = false;
  if (search) {
    query.$or = [
      { fullName: { $regex: search, $options: 'i' } },
      { customerId: { $regex: search, $options: 'i' } },
      { mobile: { $regex: search, $options: 'i' } },
    ];
  }

  const [customers, total] = await Promise.all([
    Customer.find(query).sort({ customerId: 1 }).skip(skip).limit(limitNum),
    Customer.countDocuments(query),
  ]);

  sendSuccess(res, customers, 'Customers fetched', 200, {
    total,
    page: pageNum,
    limit: limitNum,
    pages: Math.ceil(total / limitNum),
  });
}

export async function createCustomerHandler(req: AuthRequest, res: Response): Promise<void> {
  if (!req.user) { sendError(res, 'Unauthorized', 401); return; }
  const body = CreateCustomerSchema.parse(req.body);
  const result = await createCustomer(
    { ...body, dairyId: req.user.dairyId, joinDate: body.joinDate ? new Date(body.joinDate) : undefined },
    req.user.userId
  );
  sendSuccess(res, result, 'Customer created', 201);
}

export async function getCustomer(req: AuthRequest, res: Response): Promise<void> {
  if (!req.user) { sendError(res, 'Unauthorized', 401); return; }
  const id = req.params.id as string;

  // Customer can only access their own data
  if (req.user.role === 'customer' && req.user.customerId !== id) {
    sendError(res, 'Access denied', 403); return;
  }

  const customer = await Customer.findOne({
    _id: id,
    dairyId: new Types.ObjectId(req.user.dairyId),
  });
  if (!customer) { sendError(res, 'Customer not found', 404); return; }
  sendSuccess(res, customer);
}

export async function updateCustomerHandler(req: AuthRequest, res: Response): Promise<void> {
  if (!req.user) { sendError(res, 'Unauthorized', 401); return; }
  const id = req.params.id as string;
  const body = UpdateCustomerSchema.parse(req.body);
  const customer = await updateCustomer(id, req.user.dairyId, body);
  if (!customer) { sendError(res, 'Customer not found', 404); return; }
  sendSuccess(res, customer, 'Customer updated');
}

export async function deleteCustomerHandler(req: AuthRequest, res: Response): Promise<void> {
  if (!req.user) { sendError(res, 'Unauthorized', 401); return; }
  const id = req.params.id as string;
  const deleted = await softDeleteCustomer(id, req.user.dairyId);
  if (!deleted) { sendError(res, 'Customer not found', 404); return; }
  sendSuccess(res, null, 'Customer deactivated');
}

export async function resetPassword(req: AuthRequest, res: Response): Promise<void> {
  if (!req.user) { sendError(res, 'Unauthorized', 401); return; }
  const id = req.params.id as string;
  const tempPassword = await resetCustomerPassword(id, req.user.dairyId);
  sendSuccess(res, { tempPassword }, 'Password reset successfully');
}

export async function getCustomerStatement(req: AuthRequest, res: Response): Promise<void> {
  if (!req.user) { sendError(res, 'Unauthorized', 401); return; }
  const id = req.params.id as string;
  const { month, year } = req.query as { month?: string; year?: string };

  if (req.user.role === 'customer' && req.user.customerId !== id) {
    sendError(res, 'Access denied', 403); return;
  }

  const dairyId = new Types.ObjectId(req.user.dairyId);
  const now = new Date();
  const m = parseInt(month || String(now.getMonth() + 1), 10);
  const y = parseInt(year || String(now.getFullYear()), 10);
  const { start, end } = getMonthRange(m, y);

  const customer = await Customer.findOne({ _id: id, dairyId });
  if (!customer) { sendError(res, 'Customer not found', 404); return; }

  const [records, payments] = await Promise.all([
    MilkRecord.find({ dairyId, customerId: new Types.ObjectId(id), date: { $gte: start, $lte: end }, isDeleted: false }).sort({ date: 1 }),
    Payment.find({ dairyId, customerId: new Types.ObjectId(id), paymentDate: { $gte: start, $lte: end }, isReversed: false }).sort({ paymentDate: 1 }),
  ]);

  const totalQuantity = records.reduce((s, r) => s + r.totalQty, 0);
  const milkCharges = records.reduce((s, r) => s + r.amount, 0);
  const totalPaid = payments.reduce((s, p) => s + p.amount, 0);

  sendSuccess(res, {
    customer,
    month: m,
    year: y,
    milkRecords: records,
    payments,
    summary: {
      totalQuantity,
      milkCharges: parseFloat(milkCharges.toFixed(2)),
      totalPaid,
      currentBalance: customer.currentBalance,
    },
  });
}
