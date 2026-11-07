import { Response } from 'express';
import { Types } from 'mongoose';
import { AuthRequest } from '../types';
import { sendSuccess, sendError } from '../utils/responseHelper';
import DairyAccount from '../models/DairyAccount';
import Customer from '../models/Customer';
import MilkRecord from '../models/MilkRecord';
import Payment from '../models/Payment';
import { startOfDay, endOfDay, getMonthRange } from '../utils/dateUtils';
import { z } from 'zod';

const UpdateProfileSchema = z.object({
  dairyName: z.string().min(2).optional(),
  ownerName: z.string().min(2).optional(),
  address: z.string().optional(),
  village: z.string().optional(),
  logoUrl: z.string().optional(),
  whatsappNumber: z.string().optional(),
  language: z.enum(['en', 'hi']).optional(),
  currency: z.string().optional(),
});

export async function getDashboard(req: AuthRequest, res: Response): Promise<void> {
  if (!req.user) { sendError(res, 'Unauthorized', 401); return; }
  const dairyId = new Types.ObjectId(req.user.dairyId);
  const now = new Date();
  const today = startOfDay(now);
  const todayEnd = endOfDay(now);
  const { start: monthStart, end: monthEnd } = getMonthRange(now.getMonth() + 1, now.getFullYear());

  const [
    totalCustomers,
    activeCustomers,
    todayRecords,
    monthlyMilkAgg,
    paymentsThisMonthAgg,
    outstandingAgg,
    recentEntries,
    topDebtors,
  ] = await Promise.all([
    Customer.countDocuments({ dairyId }),
    Customer.countDocuments({ dairyId, isActive: true }),
    MilkRecord.aggregate([
      { $match: { dairyId, date: { $gte: today, $lte: todayEnd }, isDeleted: false } },
      { $group: { _id: null, morning: { $sum: '$morningQty' }, evening: { $sum: '$eveningQty' }, total: { $sum: '$totalQty' } } },
    ]),
    MilkRecord.aggregate([
      { $match: { dairyId, date: { $gte: monthStart, $lte: monthEnd }, isDeleted: false } },
      { $group: { _id: null, revenue: { $sum: '$amount' } } },
    ]),
    Payment.aggregate([
      { $match: { dairyId, paymentDate: { $gte: monthStart, $lte: monthEnd }, isReversed: false } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),
    Customer.aggregate([
      { $match: { dairyId, currentBalance: { $gt: 0 } } },
      { $group: { _id: null, total: { $sum: '$currentBalance' } } },
    ]),
    MilkRecord.find({ dairyId, isDeleted: false })
      .populate('customerId', 'fullName customerId')
      .sort({ createdAt: -1 })
      .limit(5),
    Customer.find({ dairyId, currentBalance: { $gt: 0 }, isActive: true })
      .select('customerId fullName mobile currentBalance')
      .sort({ currentBalance: -1 })
      .limit(5),
  ]);

  const todayMilk = todayRecords[0] || { morning: 0, evening: 0, total: 0 };

  sendSuccess(res, {
    totalCustomers,
    activeCustomers,
    todayMilkTotal: todayMilk.total,
    morningTotal: todayMilk.morning,
    eveningTotal: todayMilk.evening,
    monthlyRevenue: monthlyMilkAgg[0]?.revenue || 0,
    totalOutstanding: outstandingAgg[0]?.total || 0,
    paymentsThisMonth: paymentsThisMonthAgg[0]?.total || 0,
    recentEntries,
    topDebtors,
  });
}

export async function getProfile(req: AuthRequest, res: Response): Promise<void> {
  if (!req.user) { sendError(res, 'Unauthorized', 401); return; }
  const dairy = await DairyAccount.findById(req.user.dairyId);
  if (!dairy) { sendError(res, 'Dairy not found', 404); return; }
  sendSuccess(res, dairy);
}

export async function updateProfile(req: AuthRequest, res: Response): Promise<void> {
  if (!req.user) { sendError(res, 'Unauthorized', 401); return; }
  const body = UpdateProfileSchema.parse(req.body);
  const dairy = await DairyAccount.findByIdAndUpdate(
    req.user.dairyId,
    { $set: body },
    { new: true, runValidators: true }
  );
  if (!dairy) { sendError(res, 'Dairy not found', 404); return; }
  sendSuccess(res, dairy, 'Profile updated');
}
