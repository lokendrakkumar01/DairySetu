import { Response } from 'express';
import { Types } from 'mongoose';
import { z } from 'zod';
import { AuthRequest } from '../types';
import { sendSuccess, sendError } from '../utils/responseHelper';
import Payment from '../models/Payment';
import Customer from '../models/Customer';
import AuditLog from '../models/AuditLog';
import { v4 as uuidv4 } from 'uuid';

const CreatePaymentSchema = z.object({
  customerId: z.string().min(1),
  amount: z.number().positive(),
  paymentMethod: z.enum(['cash', 'upi', 'bank', 'other']),
  paymentDate: z.string().optional(),
  reference: z.string().optional(),
  notes: z.string().optional(),
  billId: z.string().optional(),
});

const ReversePaymentSchema = z.object({
  reason: z.string().min(1),
});

export async function recordPayment(req: AuthRequest, res: Response): Promise<void> {
  if (!req.user) { sendError(res, 'Unauthorized', 401); return; }
  const dairyId = new Types.ObjectId(req.user.dairyId);
  const body = CreatePaymentSchema.parse(req.body);
  const customerObjectId = new Types.ObjectId(body.customerId);

  const customer = await Customer.findOne({ _id: customerObjectId, dairyId });
  if (!customer) { sendError(res, 'Customer not found', 404); return; }

  const receiptNumber = `RCP-${Date.now()}-${uuidv4().slice(0, 6).toUpperCase()}`;
  const paymentDate = body.paymentDate ? new Date(body.paymentDate) : new Date();

  const payment = await Payment.create({
    dairyId,
    customerId: customerObjectId,
    billId: body.billId ? new Types.ObjectId(body.billId) : undefined,
    amount: body.amount,
    paymentMethod: body.paymentMethod,
    paymentDate,
    reference: body.reference,
    notes: body.notes,
    receiptNumber,
    recordedBy: new Types.ObjectId(req.user.userId),
  });

  // Update customer balance
  await Customer.findByIdAndUpdate(customerObjectId, {
    $inc: { currentBalance: -body.amount },
  });

  await AuditLog.create({
    dairyId,
    userId: new Types.ObjectId(req.user.userId),
    action: 'PAYMENT_RECORDED',
    entityType: 'Payment',
    entityId: payment._id,
    newValue: { amount: body.amount, paymentMethod: body.paymentMethod },
    ip: req.ip,
  });

  sendSuccess(res, payment, 'Payment recorded', 201);
}

export async function listPayments(req: AuthRequest, res: Response): Promise<void> {
  if (!req.user) { sendError(res, 'Unauthorized', 401); return; }
  const dairyId = new Types.ObjectId(req.user.dairyId);
  const { customerId, startDate, endDate, page = '1', limit = '20' } = req.query as Record<string, string>;

  const pageNum = Math.max(1, parseInt(page, 10));
  const limitNum = Math.min(100, parseInt(limit, 10));
  const skip = (pageNum - 1) * limitNum;

  const query: Record<string, unknown> = { dairyId, isReversed: false };

  if (req.user.role === 'customer' && req.user.customerId) {
    query.customerId = new Types.ObjectId(req.user.customerId);
  } else if (customerId) {
    query.customerId = new Types.ObjectId(customerId);
  }

  if (startDate || endDate) {
    query.paymentDate = {};
    if (startDate) (query.paymentDate as Record<string, Date>).$gte = new Date(startDate);
    if (endDate) (query.paymentDate as Record<string, Date>).$lte = new Date(new Date(endDate).setHours(23, 59, 59, 999));
  }

  const [payments, total] = await Promise.all([
    Payment.find(query)
      .populate('customerId', 'fullName customerId')
      .sort({ paymentDate: -1 })
      .skip(skip)
      .limit(limitNum),
    Payment.countDocuments(query),
  ]);

  sendSuccess(res, payments, 'Payments fetched', 200, {
    total,
    page: pageNum,
    limit: limitNum,
    pages: Math.ceil(total / limitNum),
  });
}

export async function getPayment(req: AuthRequest, res: Response): Promise<void> {
  if (!req.user) { sendError(res, 'Unauthorized', 401); return; }
  const dairyId = new Types.ObjectId(req.user.dairyId);
  const { id } = req.params;

  const payment = await Payment.findOne({ _id: id, dairyId })
    .populate('customerId', 'fullName customerId mobile');

  if (!payment) { sendError(res, 'Payment not found', 404); return; }

  if (req.user.role === 'customer' && payment.customerId.toString() !== req.user.customerId) {
    sendError(res, 'Access denied', 403); return;
  }

  sendSuccess(res, payment);
}

export async function reversePayment(req: AuthRequest, res: Response): Promise<void> {
  if (!req.user) { sendError(res, 'Unauthorized', 401); return; }
  const dairyId = new Types.ObjectId(req.user.dairyId);
  const { id } = req.params;
  const { reason } = ReversePaymentSchema.parse(req.body);

  const payment = await Payment.findOne({ _id: id, dairyId, isReversed: false });
  if (!payment) { sendError(res, 'Payment not found or already reversed', 404); return; }

  payment.isReversed = true;
  await payment.save();

  // Restore customer balance
  await Customer.findByIdAndUpdate(payment.customerId, {
    $inc: { currentBalance: payment.amount },
  });

  await AuditLog.create({
    dairyId,
    userId: new Types.ObjectId(req.user.userId),
    action: 'PAYMENT_REVERSED',
    entityType: 'Payment',
    entityId: payment._id,
    newValue: { isReversed: true, reason },
    ip: req.ip,
  });

  sendSuccess(res, payment, 'Payment reversed');
}
