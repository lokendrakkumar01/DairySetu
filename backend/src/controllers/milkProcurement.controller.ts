import { Response } from 'express';
import { Types } from 'mongoose';
import { z } from 'zod';
import { AuthRequest } from '../types';
import Supplier from '../models/Supplier';
import MilkProcurement from '../models/MilkProcurement';
import AuditLog from '../models/AuditLog';
import { sendError, sendSuccess } from '../utils/responseHelper';
import { startOfDay, endOfDay } from '../utils/dateUtils';

const DateOnly = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(v => !Number.isNaN(new Date(`${v}T00:00:00`).getTime()), 'Invalid collection date');
const RecordSchema = z.object({
  supplierId: z.string().regex(/^[0-9a-fA-F]{24}$/),
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
  const { date, startDate, endDate, session, supplierId, page = '1', limit = '100' } = req.query as Record<string, string>;
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
  if (supplierId && Types.ObjectId.isValid(supplierId)) query.supplierId = new Types.ObjectId(supplierId);
  const [records, total, summary] = await Promise.all([
    MilkProcurement.find(query).populate('supplierId', 'supplierCode fullName mobile village').sort({ collectionDate: -1, createdAt: -1 }).skip((pageNum - 1) * limitNum).limit(limitNum),
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
  const supplierId = new Types.ObjectId(data.supplierId);
  const supplier = await Supplier.findOne({ _id: supplierId, dairyId, status: 'active' });
  if (!supplier) { sendError(res, 'Active farmer not found in this dairy', 404); return; }
  if (!supplier.milkTypes.includes(data.milkType)) { sendError(res, 'This farmer is not registered for the selected milk type', 422); return; }
  const record = await MilkProcurement.create({ ...data, dairyId, supplierId, collectionDate: dayDate(data.collectionDate), receiptNumber: `COL-${Date.now()}-${new Types.ObjectId().toString().slice(-5).toUpperCase()}`, recordedBy: new Types.ObjectId(req.user.userId) });
  await AuditLog.create({ dairyId, userId: new Types.ObjectId(req.user.userId), action: 'MILK_PROCUREMENT_RECORDED', entityType: 'MilkProcurement', entityId: record._id, newValue: { supplierId, quantityKg: record.quantityKg, fatPercent: record.fatPercent, snfPercent: record.snfPercent, ratePerKg: record.ratePerKg, amount: record.amount }, ip: req.ip });
  await record.populate('supplierId', 'supplierCode fullName mobile village');
  sendSuccess(res, record, 'Milk collection saved', 201);
}

export async function updateProcurement(req: AuthRequest, res: Response): Promise<void> {
  if (!req.user) { sendError(res, 'Unauthorized', 401); return; }
  const data = RecordSchema.partial().omit({ supplierId: true }).parse(req.body);
  const dairyId = new Types.ObjectId(req.user.dairyId);
  const record = await MilkProcurement.findOne({ _id: req.params.id, dairyId });
  if (!record) { sendError(res, 'Collection record not found', 404); return; }
  const supplier = await Supplier.findOne({ _id: record.supplierId, dairyId });
  const nextMilkType = data.milkType || record.milkType;
  if (!supplier || !supplier.milkTypes.includes(nextMilkType)) { sendError(res, 'Farmer is not registered for the selected milk type', 422); return; }
  const oldValue = { quantityKg: record.quantityKg, fatPercent: record.fatPercent, snfPercent: record.snfPercent, ratePerKg: record.ratePerKg, qualityStatus: record.qualityStatus };
  Object.assign(record, data, data.collectionDate ? { collectionDate: dayDate(data.collectionDate) } : {});
  await record.save();
  await AuditLog.create({ dairyId, userId: new Types.ObjectId(req.user.userId), action: 'MILK_PROCUREMENT_UPDATED', entityType: 'MilkProcurement', entityId: record._id, oldValue, newValue: data, ip: req.ip });
  await record.populate('supplierId', 'supplierCode fullName mobile village');
  sendSuccess(res, record, 'Collection record updated');
}
