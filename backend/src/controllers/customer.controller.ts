import { Response } from 'express';
import { Types } from 'mongoose';
import { z } from 'zod';
import { AuthRequest } from '../types';
import { sendSuccess, sendError } from '../utils/responseHelper';
import Customer from '../models/Customer';
import User from '../models/User';
import MilkRecord from '../models/MilkRecord';
import Payment from '../models/Payment';
import MonthlyBill from '../models/MonthlyBill';
import Adjustment from '../models/Adjustment';
import { createCustomer, updateCustomer, softDeleteCustomer, resetCustomerPassword } from '../services/customer.service';
import { getMonthRange } from '../utils/dateUtils';

const CreateCustomerSchema = z.object({
  fullName: z.string().min(2).max(100),
  mobile: z.string().min(10).max(15),
  password: z.string().min(6).max(100).optional(),
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
  const { search, status, page = '1', limit = '100' } = req.query as Record<string, string>;

  const pageNum = Math.max(1, parseInt(page, 10));
  const limitNum = Math.min(200, parseInt(limit, 10));
  const skip = (pageNum - 1) * limitNum;

  const query: Record<string, unknown> = { dairyId };
  // Customer accounts may only list their own customer record.
  if (req.user.role === 'customer') {
    if (!req.user.customerId) { sendError(res, 'Customer account is not linked to a profile', 403); return; }
    query._id = new Types.ObjectId(req.user.customerId);
  }
  if (status === 'active') query.isActive = true;
  else if (status === 'inactive') query.isActive = false;
  if (search) {
    query.$or = [
      { fullName: { $regex: search, $options: 'i' } },
      { customerId: { $regex: search, $options: 'i' } },
      { mobile: { $regex: search, $options: 'i' } },
      { village: { $regex: search, $options: 'i' } },
    ];
  }

  const [customers, total] = await Promise.all([
    Customer.find(query).sort({ customerId: 1 }).skip(skip).limit(limitNum),
    Customer.countDocuments(query),
  ]);

  sendSuccess(
    res,
    customers,
    'Customers retrieved',
    200,
    {
      total,
      page: pageNum,
      limit: limitNum,
      pages: Math.ceil(total / limitNum),
    }
  );
}

export async function createCustomerHandler(req: AuthRequest, res: Response): Promise<void> {
  if (!req.user) { sendError(res, 'Unauthorized', 401); return; }
  const body = CreateCustomerSchema.parse(req.body);

  const existing = await Customer.findOne({
    dairyId: new Types.ObjectId(req.user.dairyId),
    mobile: body.mobile,
  });
  if (existing) {
    sendError(res, 'Customer with this mobile already exists in this dairy', 409);
    return;
  }

  const result = await createCustomer(
    {
      dairyId: req.user.dairyId,
      fullName: body.fullName,
      mobile: body.mobile,
      password: body.password,
      address: body.address,
      village: body.village,
      milkType: body.milkType,
      defaultMorningQty: body.defaultMorningQty,
      defaultEveningQty: body.defaultEveningQty,
      joinDate: body.joinDate ? new Date(body.joinDate) : undefined,
    },
    req.user.userId
  );
  sendSuccess(res, { ...result, dairyCode: req.user.dairyId }, 'Customer registered successfully', 201);
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
  sendSuccess(res, customer, 'Customer updated successfully');
}

export async function deleteCustomerHandler(req: AuthRequest, res: Response): Promise<void> {
  if (!req.user) { sendError(res, 'Unauthorized', 401); return; }
  const id = req.params.id as string;
  const { permanent } = req.query as { permanent?: string };

  if (permanent === 'true') {
    const dairyId = new Types.ObjectId(req.user.dairyId);
    const cust = await Customer.findOne({ _id: id, dairyId });
    if (!cust) { sendError(res, 'Customer not found', 404); return; }
    const [hasPayments, hasBills, hasAdjustments] = await Promise.all([
      Payment.exists({ customerId: cust._id, dairyId }),
      MonthlyBill.exists({ customerId: cust._id, dairyId }),
      Adjustment.exists({ customerId: cust._id, dairyId }),
    ]);
    if (hasPayments || hasBills || hasAdjustments) {
      sendError(res, 'Customer has financial history; deactivate the account to preserve the audit trail', 409);
      return;
    }
    await Promise.all([
      MilkRecord.deleteMany({ customerId: cust._id, dairyId }),
      User.findByIdAndDelete(cust.userId),
    ]);
    await Customer.deleteOne({ _id: cust._id, dairyId });
    sendSuccess(res, null, 'Customer and records permanently deleted');
    return;
  }

  const deleted = await softDeleteCustomer(id, req.user.dairyId);
  if (!deleted) { sendError(res, 'Customer not found', 404); return; }
  sendSuccess(res, null, 'Customer deactivated');
}

export async function resetPassword(req: AuthRequest, res: Response): Promise<void> {
  if (!req.user) { sendError(res, 'Unauthorized', 401); return; }
  const id = req.params.id as string;
  const credentials = await resetCustomerPassword(id, req.user.dairyId);
  sendSuccess(res, credentials, 'Password reset successfully');
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
      milkCharges,
      totalPaid,
      closingBalance: customer.currentBalance,
    },
  });
}
