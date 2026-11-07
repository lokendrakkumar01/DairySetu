import { Response } from 'express';
import { Types } from 'mongoose';
import { z } from 'zod';
import { AuthRequest } from '../types';
import { sendSuccess, sendError } from '../utils/responseHelper';
import MilkRate from '../models/MilkRate';

const CreateRateSchema = z.object({
  customerId: z.string().optional(),
  milkType: z.enum(['cow', 'buffalo', 'mixed']),
  ratePerLitre: z.number().positive(),
  effectiveFrom: z.string().min(1),
});

export async function getCurrentRates(req: AuthRequest, res: Response): Promise<void> {
  if (!req.user) { sendError(res, 'Unauthorized', 401); return; }
  const dairyId = new Types.ObjectId(req.user.dairyId);
  const { customerId } = req.query as { customerId?: string };
  const now = new Date();

  const query: Record<string, unknown> = {
    dairyId,
    effectiveFrom: { $lte: now },
    $or: [{ effectiveTo: null }, { effectiveTo: { $gte: now } }],
  };

  if (customerId) {
    query.$or = [
      { customerId: new Types.ObjectId(customerId) },
      { customerId: null },
    ];
    // remove $or above and use proper filter
    delete query.$or;
    query.customerId = { $in: [new Types.ObjectId(customerId), null] };
    query.effectiveFrom = { $lte: now };
  } else {
    query.customerId = null;
  }

  const rates = await MilkRate.find(query).sort({ effectiveFrom: -1 });
  sendSuccess(res, rates);
}

export async function createRate(req: AuthRequest, res: Response): Promise<void> {
  if (!req.user) { sendError(res, 'Unauthorized', 401); return; }
  const dairyId = new Types.ObjectId(req.user.dairyId);
  const body = CreateRateSchema.parse(req.body);
  const effectiveFrom = new Date(body.effectiveFrom);
  const customerObjectId = body.customerId ? new Types.ObjectId(body.customerId) : null;

  // Close previous open rate for same dairy/customer/milkType
  await MilkRate.updateMany(
    {
      dairyId,
      customerId: customerObjectId,
      milkType: body.milkType,
      effectiveTo: null,
    },
    { $set: { effectiveTo: effectiveFrom } }
  );

  const rate = await MilkRate.create({
    dairyId,
    customerId: customerObjectId,
    milkType: body.milkType,
    ratePerLitre: body.ratePerLitre,
    effectiveFrom,
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
