import { Response } from 'express';
import { Types } from 'mongoose';
import { z } from 'zod';
import { AuthRequest } from '../types';
import { sendSuccess, sendError } from '../utils/responseHelper';
import MilkRate from '../models/MilkRate';
import Customer from '../models/Customer';

const CreateRateSchema = z.object({
  customerId: z.string().regex(/^[0-9a-fA-F]{24}$/).optional().or(z.literal('')),
  milkType: z.enum(['cow', 'buffalo', 'mixed']),
  rateUnit: z.enum(['litre', 'kg']).default('litre'),
  ratePerLitre: z.number().positive().max(1000000),
  effectiveFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(value => !Number.isNaN(new Date(`${value}T00:00:00`).getTime()), 'Invalid effective date'),
});

export async function getCurrentRates(req: AuthRequest, res: Response): Promise<void> {
  if (!req.user) { sendError(res, 'Unauthorized', 401); return; }
  const dairyId = new Types.ObjectId(req.user.dairyId);
  const { customerId, rateUnit = 'litre', asOf, includeCustomerRates } = req.query as { customerId?: string; rateUnit?: string; asOf?: string; includeCustomerRates?: string };
  if (rateUnit !== 'litre' && rateUnit !== 'kg' && rateUnit !== 'all') { sendError(res, 'Rate unit must be litre or kg', 422); return; }
  const scopedCustomerId = req.user.role === 'customer' ? req.user.customerId : customerId;
  if (req.user.role === 'customer' && !scopedCustomerId) { sendError(res, 'Customer account is not linked to a profile', 403); return; }
  if (scopedCustomerId && !Types.ObjectId.isValid(scopedCustomerId)) { sendError(res, 'Invalid customer ID', 422); return; }
  if (asOf && !/^\d{4}-\d{2}-\d{2}$/.test(asOf)) { sendError(res, 'Invalid rate date', 422); return; }
  const asOfDate = asOf ? new Date(`${asOf}T23:59:59.999`) : new Date();
  if (Number.isNaN(asOfDate.getTime())) { sendError(res, 'Invalid rate date', 422); return; }
  const filters: Record<string, unknown>[] = [
    { dairyId },
    { effectiveFrom: { $lte: asOfDate } },
    { $or: [{ effectiveTo: null }, { effectiveTo: { $gte: asOfDate } }] },
  ];
  if (rateUnit !== 'all') filters.push({ rateUnit: rateUnit === 'litre' ? { $in: ['litre', null] } : 'kg' });
  if (scopedCustomerId) filters.push({ $or: [{ customerId: new Types.ObjectId(scopedCustomerId) }, { customerId: null }] });
  else if (!(req.user.role === 'admin' && includeCustomerRates === 'true')) filters.push({ customerId: null });

  const rates = await MilkRate.find({ $and: filters }).populate('customerId', 'fullName customerId').sort({ effectiveFrom: -1 });
  sendSuccess(res, rates);
}

export async function createRate(req: AuthRequest, res: Response): Promise<void> {
  if (!req.user) { sendError(res, 'Unauthorized', 401); return; }
  const dairyId = new Types.ObjectId(req.user.dairyId);
  const body = CreateRateSchema.parse(req.body);
  const effectiveFrom = new Date(`${body.effectiveFrom}T00:00:00`);
  const customerObjectId = body.customerId ? new Types.ObjectId(body.customerId) : null;
  if (customerObjectId) {
    const customer = await Customer.exists({ _id: customerObjectId, dairyId, isActive: true });
    if (!customer) { sendError(res, 'Active customer not found in this dairy', 404); return; }
  }

  const scope: Record<string, unknown> = {
    dairyId,
    customerId: customerObjectId,
    milkType: body.milkType,
    ...(body.rateUnit === 'litre' ? { $or: [{ rateUnit: 'litre' }, { rateUnit: { $exists: false } }] } : { rateUnit: 'kg' }),
  };
  const sameStart = await MilkRate.exists({ ...scope, effectiveFrom } as any);
  const previousRate: any = await MilkRate.findOne({ ...scope, effectiveFrom: { $lt: effectiveFrom } } as any).sort({ effectiveFrom: -1 });
  const nextRate: any = await MilkRate.findOne({ ...scope, effectiveFrom: { $gt: effectiveFrom } } as any).sort({ effectiveFrom: 1 });
  if (sameStart) { sendError(res, 'A rate already exists for this dairy and date', 409); return; }
  if (previousRate) {
    previousRate.effectiveTo = effectiveFrom;
    await previousRate.save();
  }

  const rate = await MilkRate.create({
    dairyId,
    customerId: customerObjectId,
    milkType: body.milkType,
    rateUnit: body.rateUnit,
    ratePerLitre: body.ratePerLitre,
    effectiveFrom,
    effectiveTo: nextRate?.effectiveFrom || null,
    createdBy: new Types.ObjectId(req.user.userId),
  });

  sendSuccess(res, rate, 'Rate set successfully', 201);
}

export async function getRateHistory(req: AuthRequest, res: Response): Promise<void> {
  if (!req.user) { sendError(res, 'Unauthorized', 401); return; }
  const dairyId = new Types.ObjectId(req.user.dairyId);
  const customerId = req.params.customerId as string;

  const rates = await MilkRate.find({
    dairyId,
    customerId: new Types.ObjectId(customerId),
  }).sort({ effectiveFrom: -1 });

  sendSuccess(res, rates);
}
