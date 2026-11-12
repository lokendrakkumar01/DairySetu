import { Response } from 'express';
import { Types } from 'mongoose';
import { z } from 'zod';
import { AuthRequest } from '../types';
import { sendSuccess, sendError } from '../utils/responseHelper';
import MonthlyBill from '../models/MonthlyBill';
import AuditLog from '../models/AuditLog';
import Customer from '../models/Customer';
import Payment from '../models/Payment';
import { generateBill, finalizeBill, closeBill } from '../services/billing.service';

const GenerateBillSchema = z.object({
  customerId: z.string().min(1),
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2000),
});

export async function generateBillHandler(req: AuthRequest, res: Response): Promise<void> {
  if (!req.user) { sendError(res, 'Unauthorized', 401); return; }
  const body = GenerateBillSchema.parse(req.body);
  const bill = await generateBill({
    dairyId: req.user.dairyId,
    customerId: body.customerId,
    month: body.month,
    year: body.year,
    createdByUserId: req.user.userId,
  });
  sendSuccess(res, bill, 'Bill generated', 201);
}

export async function listBills(req: AuthRequest, res: Response): Promise<void> {
  if (!req.user) { sendError(res, 'Unauthorized', 401); return; }
  const dairyId = new Types.ObjectId(req.user.dairyId);
  const { customerId, month, year, status, page = '1', limit = '20' } = req.query as Record<string, string>;

  const pageNum = Math.max(1, parseInt(page, 10));
  const limitNum = Math.min(100, parseInt(limit, 10));
  const skip = (pageNum - 1) * limitNum;

  const query: Record<string, unknown> = { dairyId };

  if (req.user.role === 'customer' && req.user.customerId) {
    query.customerId = new Types.ObjectId(req.user.customerId);
  } else if (customerId) {
    query.customerId = new Types.ObjectId(customerId);
  }

  if (month) query.billMonth = parseInt(month, 10);
  if (year) query.billYear = parseInt(year, 10);
  if (status) query.status = status;

  const [bills, total] = await Promise.all([
    MonthlyBill.find(query)
      .populate('customerId', 'fullName customerId')
      .sort({ billYear: -1, billMonth: -1 })
      .skip(skip)
      .limit(limitNum),
    MonthlyBill.countDocuments(query),
  ]);

  sendSuccess(res, bills, 'Bills fetched', 200, {
    total,
    page: pageNum,
    limit: limitNum,
    pages: Math.ceil(total / limitNum),
  });
}

export async function getBill(req: AuthRequest, res: Response): Promise<void> {
  if (!req.user) { sendError(res, 'Unauthorized', 401); return; }
  const dairyId = new Types.ObjectId(req.user.dairyId);
  const id = req.params.id as string;

  const bill = await MonthlyBill.findOne({ _id: id, dairyId })
    .populate('customerId', 'fullName customerId mobile address village');

  if (!bill) { sendError(res, 'Bill not found', 404); return; }

  const billCustomerId = (bill.customerId as unknown as { _id?: Types.ObjectId })._id || bill.customerId;
  if (req.user.role === 'customer' && billCustomerId.toString() !== req.user.customerId) {
    sendError(res, 'Access denied', 403); return;
  }

  sendSuccess(res, bill);
}

export async function finalizeBillHandler(req: AuthRequest, res: Response): Promise<void> {
  if (!req.user) { sendError(res, 'Unauthorized', 401); return; }
  const id = req.params.id as string;
  const bill = await finalizeBill(id, req.user.dairyId);
  if (!bill) { sendError(res, 'Bill not found or not in draft status', 404); return; }

  await AuditLog.create({
    dairyId: new Types.ObjectId(req.user.dairyId),
    userId: new Types.ObjectId(req.user.userId),
    action: 'BILL_FINALIZED',
    entityType: 'MonthlyBill',
    entityId: new Types.ObjectId(id),
    newValue: { status: 'finalized' },
    ip: req.ip,
  });

  sendSuccess(res, bill, 'Bill finalized');
}

export async function closeBillHandler(req: AuthRequest, res: Response): Promise<void> {
  if (!req.user) { sendError(res, 'Unauthorized', 401); return; }
  const id = req.params.id as string;
  const bill = await closeBill(id, req.user.dairyId);
  if (!bill) { sendError(res, 'Bill not found or not finalized', 404); return; }

  await AuditLog.create({
    dairyId: new Types.ObjectId(req.user.dairyId),
    userId: new Types.ObjectId(req.user.userId),
    action: 'BILL_CLOSED',
    entityType: 'MonthlyBill',
    entityId: new Types.ObjectId(id),
    newValue: { status: 'closed' },
    ip: req.ip,
  });

  sendSuccess(res, bill, 'Bill closed');
}

export async function getBillPdfData(req: AuthRequest, res: Response): Promise<void> {
  if (!req.user) { sendError(res, 'Unauthorized', 401); return; }
  const dairyId = new Types.ObjectId(req.user.dairyId);
  const id = req.params.id as string;

  const [bill, payments] = await Promise.all([
    MonthlyBill.findOne({ _id: id, dairyId })
      .populate('customerId', 'fullName customerId mobile address village milkType'),
    Payment.find({ dairyId, billId: new Types.ObjectId(id), isReversed: false })
      .sort({ paymentDate: 1 }),
  ]);

  if (!bill) { sendError(res, 'Bill not found', 404); return; }

  const customer = await Customer.findById(bill.customerId);

  sendSuccess(res, {
    bill,
    customer,
    payments,
    generatedAt: new Date(),
  });
}
