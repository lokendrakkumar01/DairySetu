import { Response } from 'express';
import { Types } from 'mongoose';
import { z } from 'zod';
import { AuthRequest } from '../types';
import { sendSuccess, sendError } from '../utils/responseHelper';
import MilkRecord from '../models/MilkRecord';
import MilkRate from '../models/MilkRate';
import Customer from '../models/Customer';
import { startOfDay } from '../utils/dateUtils';

const CreateRecordSchema = z.object({
  customerId: z.string().min(1),
  date: z.string().min(1),
  morningQty: z.number().min(0).default(0),
  eveningQty: z.number().min(0).default(0),
  milkType: z.enum(['cow', 'buffalo', 'mixed']).optional(),
  remarks: z.string().optional(),
  isHoliday: z.boolean().optional(),
});

const UpdateRecordSchema = z.object({
  morningQty: z.number().min(0).optional(),
  eveningQty: z.number().min(0).optional(),
  remarks: z.string().optional(),
  isHoliday: z.boolean().optional(),
});

const BulkRecordSchema = z.array(CreateRecordSchema);

async function getApplicableRate(
  dairyId: Types.ObjectId,
  customerId: Types.ObjectId,
  milkType: string,
  date: Date
): Promise<number> {
  const r1 = await (MilkRate as any).findOne({
    dairyId,
    customerId,
    milkType,
    effectiveFrom: { $lte: date },
    $or: [{ effectiveTo: null }, { effectiveTo: { $gte: date } }],
  }).sort({ effectiveFrom: -1 }).lean();
  if (r1) return r1.ratePerLitre || 0;

  const r2 = await (MilkRate as any).findOne({
    dairyId,
    customerId: null,
    milkType,
    effectiveFrom: { $lte: date },
    $or: [{ effectiveTo: null }, { effectiveTo: { $gte: date } }],
  }).sort({ effectiveFrom: -1 }).lean();
  return r2 ? (r2.ratePerLitre || 0) : 0;
}

export async function createMilkRecord(req: AuthRequest, res: Response): Promise<void> {
  if (!req.user) { sendError(res, 'Unauthorized', 401); return; }
  const dairyId = new Types.ObjectId(req.user.dairyId);
  const body = CreateRecordSchema.parse(req.body);
  const customerObjectId = new Types.ObjectId(body.customerId);

  const customer = await Customer.findOne({ _id: customerObjectId, dairyId });
  if (!customer) { sendError(res, 'Customer not found', 404); return; }

  const recordDate = startOfDay(new Date(body.date));
  const milkType = body.milkType || customer.milkType;
  const rateApplied = await getApplicableRate(dairyId, customerObjectId, milkType, recordDate);

  try {
    const record = await MilkRecord.create({
      dairyId,
      customerId: customerObjectId,
      date: recordDate,
      morningQty: body.morningQty,
      eveningQty: body.eveningQty,
      milkType,
      rateApplied,
      remarks: body.remarks,
      isHoliday: body.isHoliday || false,
      createdBy: new Types.ObjectId(req.user.userId),
    });
    sendSuccess(res, record, 'Milk record created', 201);
  } catch (err: unknown) {
    if ((err as { code?: number }).code === 11000) {
      sendError(res, 'Milk record already exists for this customer and date', 409); return;
    }
    throw err;
  }
}

export async function listMilkRecords(req: AuthRequest, res: Response): Promise<void> {
  if (!req.user) { sendError(res, 'Unauthorized', 401); return; }
  const dairyId = new Types.ObjectId(req.user.dairyId);
  const { customerId, date, startDate, endDate, page = '1', limit = '50' } = req.query as Record<string, string>;

  const pageNum = Math.max(1, parseInt(page, 10));
  const limitNum = Math.min(200, parseInt(limit, 10));
  const skip = (pageNum - 1) * limitNum;

  const query: Record<string, unknown> = { dairyId, isDeleted: false };

  if (req.user.role === 'customer' && req.user.customerId) {
    query.customerId = new Types.ObjectId(req.user.customerId);
  } else if (customerId) {
    query.customerId = new Types.ObjectId(customerId);
  }

  if (date) {
    const d = startOfDay(new Date(date));
    query.date = { $gte: d, $lte: new Date(d.getTime() + 86399999) };
  } else if (startDate || endDate) {
    query.date = {} as Record<string, Date>;
    if (startDate) (query.date as Record<string, Date>).$gte = startOfDay(new Date(startDate));
    if (endDate) (query.date as Record<string, Date>).$lte = new Date(new Date(endDate).setHours(23, 59, 59, 999));
  }

  const [records, total] = await Promise.all([
    MilkRecord.find(query)
      .populate('customerId', 'fullName customerId')
      .sort({ date: -1 })
      .skip(skip)
      .limit(limitNum),
    MilkRecord.countDocuments(query),
  ]);

  sendSuccess(res, records, 'Records fetched', 200, {
    total,
    page: pageNum,
    limit: limitNum,
    pages: Math.ceil(total / limitNum),
  });
}

export async function updateMilkRecord(req: AuthRequest, res: Response): Promise<void> {
  if (!req.user) { sendError(res, 'Unauthorized', 401); return; }
  const dairyId = new Types.ObjectId(req.user.dairyId);
  const id = req.params.id as string;
  const body = UpdateRecordSchema.parse(req.body);

  const record = await MilkRecord.findOne({ _id: id, dairyId, isDeleted: false });
  if (!record) { sendError(res, 'Record not found', 404); return; }

  if (body.morningQty !== undefined) record.morningQty = body.morningQty;
  if (body.eveningQty !== undefined) record.eveningQty = body.eveningQty;
  if (body.remarks !== undefined) record.remarks = body.remarks;
  if (body.isHoliday !== undefined) record.isHoliday = body.isHoliday;

  await record.save();
  sendSuccess(res, record, 'Record updated');
}

export async function deleteMilkRecord(req: AuthRequest, res: Response): Promise<void> {
  if (!req.user) { sendError(res, 'Unauthorized', 401); return; }
  const dairyId = new Types.ObjectId(req.user.dairyId);
  const id = req.params.id as string;

  const record = await MilkRecord.findOneAndUpdate(
    { _id: id, dairyId, isDeleted: false },
    { $set: { isDeleted: true } },
    { new: true }
  );
  if (!record) { sendError(res, 'Record not found', 404); return; }
  sendSuccess(res, null, 'Record deleted');
}

export async function bulkCreateMilkRecords(req: AuthRequest, res: Response): Promise<void> {
  if (!req.user) { sendError(res, 'Unauthorized', 401); return; }
  const dairyId = new Types.ObjectId(req.user.dairyId);
  const entries = BulkRecordSchema.parse(req.body);

  const results: { success: boolean; customerId: string; date: string; error?: string }[] = [];

  for (const entry of entries) {
    try {
      const customerObjectId = new Types.ObjectId(entry.customerId);
      const customer = await Customer.findOne({ _id: customerObjectId, dairyId });
      if (!customer) {
        results.push({ success: false, customerId: entry.customerId, date: entry.date, error: 'Customer not found' });
        continue;
      }
      const recordDate = startOfDay(new Date(entry.date));
      const milkType = entry.milkType || customer.milkType;
      const rateApplied = await getApplicableRate(dairyId, customerObjectId, milkType, recordDate);

      await MilkRecord.create({
        dairyId,
        customerId: customerObjectId,
        date: recordDate,
        morningQty: entry.morningQty,
        eveningQty: entry.eveningQty,
        milkType,
        rateApplied,
        remarks: entry.remarks,
        isHoliday: entry.isHoliday || false,
        createdBy: new Types.ObjectId(req.user!.userId),
      });
      results.push({ success: true, customerId: entry.customerId, date: entry.date });
    } catch (err: unknown) {
      const isDuplicate = (err as { code?: number }).code === 11000;
      results.push({
        success: false,
        customerId: entry.customerId,
        date: entry.date,
        error: isDuplicate ? 'Duplicate record skipped' : (err as Error).message,
      });
    }
  }

  const successCount = results.filter((r) => r.success).length;
  sendSuccess(res, { results, successCount, totalCount: entries.length }, `Bulk insert: ${successCount}/${entries.length} created`);
}
