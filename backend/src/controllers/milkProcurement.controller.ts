import { Response } from 'express';
import { Types } from 'mongoose';
import { z } from 'zod';
import { AuthRequest } from '../types';
import Customer from '../models/Customer';
import MilkProcurement from '../models/MilkProcurement';
import AuditLog from '../models/AuditLog';
import { sendError, sendSuccess } from '../utils/responseHelper';
import { startOfDay, endOfDay } from '../utils/dateUtils';

const DateOnly = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(v => !Number.isNaN(new Date(`${v}T00:00:00`).getTime()), 'Invalid collection date');
const RecordSchema = z.object({
  customerId: z.string().regex(/^[0-9a-fA-F]{24}$/),
  collectionDate: DateOnly,
  session: z.enum(['morning', 'evening']),
  milkType: z.enum(['cow', 'buffalo']),
  quantityKg: z.number().positive().max(5000),
  fatPercent: z.number().min(0).max(20),
  snfPercent: z.number().min(0).max(20),
  temperatureC: z.number().min(0).max(100).optional(),
  ratePerKg: z.number().min(0).max(100000),
  qualityStatus: z.enum(['accepted', 'rejected']),
  notes: z.string().trim().max(500).optional(),
});

const dayDate = (date: string) => startOfDay(new Date(`${date}T00:00:00`));

export async function listProcurements(req: AuthRequest, res: Response): Promise<void> {
  if (!req.user) { sendError(res, 'Unauthorized', 401); return; }
  const dairyId = new Types.ObjectId(req.user.dairyId);
  const { date, startDate, endDate, session, customerId, page = '1', limit = '100' } = req.query as Record<string, string>;
  const pageNum = Math.max(1, Number.parseInt(page, 10) || 1);
  const limitNum = Math.min(200, Math.max(1, Number.parseInt(limit, 10) || 100));
  const query: Record<string, unknown> = { dairyId };
  if (date && DateOnly.safeParse(date).success) query.collectionDate = { $gte: dayDate(date), $lte: endOfDay(dayDate(date)) };
  else if (startDate || endDate) {
    const range: Record<string, Date> = {};
    if (startDate && DateOnly.safeParse(startDate).success) range.$gte = dayDate(startDate);
    if (endDate && DateOnly.safeParse(endDate).success) range.$lte = endOfDay(dayDate(endDate));
    if (Object.keys(range).length) query.collectionDate = range;
  }
  if (session === 'morning' || session === 'evening') query.session = session;
  if (customerId && Types.ObjectId.isValid(customerId)) query.customerId = new Types.ObjectId(customerId);
  const [records, total, summary] = await Promise.all([
    MilkProcurement.find(query).populate('customerId', 'customerId fullName mobile village milkType').populate('supplierId', 'supplierCode fullName mobile village').sort({ collectionDate: -1, createdAt: -1 }).skip((pageNum - 1) * limitNum).limit(limitNum),
    MilkProcurement.countDocuments(query),
    MilkProcurement.aggregate([
      { $match: query },
      { $group: { _id: null, totalKg: { $sum: '$quantityKg' }, acceptedKg: { $sum: { $cond: [{ $eq: ['$qualityStatus', 'accepted'] }, '$quantityKg', 0] } }, rejectedKg: { $sum: { $cond: [{ $eq: ['$qualityStatus', 'rejected'] }, '$quantityKg', 0] } }, payable: { $sum: '$amount' }, averageFat: { $avg: '$fatPercent' }, averageSnf: { $avg: '$snfPercent' } } },
    ]),
  ]);
  sendSuccess(res, records, 'Milk collection records fetched', 200, { total, page: pageNum, limit: limitNum, pages: Math.ceil(total / limitNum), summary: summary[0] || { totalKg: 0, acceptedKg: 0, rejectedKg: 0, payable: 0, averageFat: 0, averageSnf: 0 } });
}

export async function createProcurement(req: AuthRequest, res: Response): Promise<void> {
  if (!req.user) { sendError(res, 'Unauthorized', 401); return; }
  const data = RecordSchema.parse(req.body);
  const dairyId = new Types.ObjectId(req.user.dairyId);
  const customerId = new Types.ObjectId(data.customerId);
  const customer = await Customer.findOne({ _id: customerId, dairyId, isActive: true });
  if (!customer) { sendError(res, 'Active customer not found in this dairy', 404); return; }
  if (customer.milkType !== 'mixed' && customer.milkType !== data.milkType) { sendError(res, `This customer is registered for ${customer.milkType} milk`, 422); return; }
  const record = await MilkProcurement.create({ ...data, dairyId, customerId, collectionDate: dayDate(data.collectionDate), receiptNumber: `COL-${Date.now()}-${new Types.ObjectId().toString().slice(-5).toUpperCase()}`, recordedBy: new Types.ObjectId(req.user.userId) });
  await AuditLog.create({ dairyId, userId: new Types.ObjectId(req.user.userId), action: 'MILK_PROCUREMENT_RECORDED', entityType: 'MilkProcurement', entityId: record._id, newValue: { customerId, quantityKg: record.quantityKg, fatPercent: record.fatPercent, snfPercent: record.snfPercent, ratePerKg: record.ratePerKg, amount: record.amount }, ip: req.ip });
  await record.populate('customerId', 'customerId fullName mobile village milkType');
  sendSuccess(res, record, 'Milk collection saved', 201);
}

export async function updateProcurement(req: AuthRequest, res: Response): Promise<void> {
  if (!req.user) { sendError(res, 'Unauthorized', 401); return; }
  const data = RecordSchema.partial().parse(req.body);
  const dairyId = new Types.ObjectId(req.user.dairyId);
  const record = await MilkProcurement.findOne({ _id: req.params.id, dairyId });
  if (!record) { sendError(res, 'Collection record not found', 404); return; }
  const customer = record.customerId ? await Customer.findOne({ _id: record.customerId, dairyId }) : null;
  const nextMilkType = data.milkType || record.milkType;
  if (record.customerId && (!customer || (customer.milkType !== 'mixed' && customer.milkType !== nextMilkType))) { sendError(res, 'Customer is not registered for the selected milk type', 422); return; }
  const oldValue = { quantityKg: record.quantityKg, fatPercent: record.fatPercent, snfPercent: record.snfPercent, ratePerKg: record.ratePerKg, qualityStatus: record.qualityStatus };
  Object.assign(record, data, data.collectionDate ? { collectionDate: dayDate(data.collectionDate) } : {});
  await record.save();
  await AuditLog.create({ dairyId, userId: new Types.ObjectId(req.user.userId), action: 'MILK_PROCUREMENT_UPDATED', entityType: 'MilkProcurement', entityId: record._id, oldValue, newValue: data, ip: req.ip });
  await record.populate('customerId', 'customerId fullName mobile village milkType');
  await record.populate('supplierId', 'supplierCode fullName mobile village');
  sendSuccess(res, record, 'Collection record updated');
}
