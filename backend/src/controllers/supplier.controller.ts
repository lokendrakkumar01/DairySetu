import { Response } from 'express';
import { Types } from 'mongoose';
import { z } from 'zod';
import { AuthRequest } from '../types';
import Supplier from '../models/Supplier';
import MilkProcurement from '../models/MilkProcurement';
import AuditLog from '../models/AuditLog';
import { sendError, sendSuccess } from '../utils/responseHelper';

const SupplierSchema = z.object({
  fullName: z.string().trim().min(2).max(100),
  mobile: z.string().trim().regex(/^[0-9+()\-\s]{10,15}$/),
  address: z.string().trim().max(300).optional(),
  village: z.string().trim().max(100).optional(),
  milkTypes: z.array(z.enum(['cow', 'buffalo'])).min(1),
  upiId: z.string().trim().max(100).optional(),
  bankName: z.string().trim().max(100).optional(),
  accountNumber: z.string().trim().max(34).optional(),
  ifscCode: z.string().trim().max(11).optional(),
  status: z.enum(['active', 'inactive']).optional(),
});

export async function listSuppliers(req: AuthRequest, res: Response): Promise<void> {
  if (!req.user) { sendError(res, 'Unauthorized', 401); return; }
  const dairyId = new Types.ObjectId(req.user.dairyId);
  const { search, status, page = '1', limit = '50' } = req.query as Record<string, string>;
  const pageNum = Math.max(1, Number.parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, Number.parseInt(limit, 10) || 50));
  const query: Record<string, unknown> = { dairyId };
  if (status === 'active' || status === 'inactive') query.status = status;
  if (search?.trim()) {
    const safe = search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    query.$or = [
      { fullName: { $regex: safe, $options: 'i' } },
      { supplierCode: { $regex: safe, $options: 'i' } },
      { mobile: { $regex: safe, $options: 'i' } },
      { village: { $regex: safe, $options: 'i' } },
    ];
  }
  const [suppliers, total] = await Promise.all([
    Supplier.find(query).sort({ fullName: 1 }).skip((pageNum - 1) * limitNum).limit(limitNum),
    Supplier.countDocuments(query),
  ]);
  sendSuccess(res, suppliers, 'Suppliers fetched', 200, { total, page: pageNum, limit: limitNum, pages: Math.ceil(total / limitNum) });
}

export async function createSupplier(req: AuthRequest, res: Response): Promise<void> {
  if (!req.user) { sendError(res, 'Unauthorized', 401); return; }
  const data = SupplierSchema.parse(req.body);
  const dairyId = new Types.ObjectId(req.user.dairyId);
  const supplier = await Supplier.create({
    ...data,
    dairyId,
    supplierCode: `F-${new Types.ObjectId().toString().slice(-8).toUpperCase()}`,
  });
  await AuditLog.create({ dairyId, userId: new Types.ObjectId(req.user.userId), action: 'SUPPLIER_CREATED', entityType: 'Supplier', entityId: supplier._id, newValue: { fullName: supplier.fullName, supplierCode: supplier.supplierCode }, ip: req.ip });
  sendSuccess(res, supplier, 'Farmer registered', 201);
}

export async function updateSupplier(req: AuthRequest, res: Response): Promise<void> {
  if (!req.user) { sendError(res, 'Unauthorized', 401); return; }
  const data = SupplierSchema.partial().parse(req.body);
  if (data.milkTypes && data.milkTypes.length === 0) { sendError(res, 'At least one milk type is required', 422); return; }
  const dairyId = new Types.ObjectId(req.user.dairyId);
  const supplier = await Supplier.findOneAndUpdate({ _id: req.params.id, dairyId }, { $set: data }, { new: true, runValidators: true });
  if (!supplier) { sendError(res, 'Farmer not found', 404); return; }
  await AuditLog.create({ dairyId, userId: new Types.ObjectId(req.user.userId), action: 'SUPPLIER_UPDATED', entityType: 'Supplier', entityId: supplier._id, newValue: data, ip: req.ip });
  sendSuccess(res, supplier, 'Farmer profile updated');
}

export async function getSupplier(req: AuthRequest, res: Response): Promise<void> {
  if (!req.user) { sendError(res, 'Unauthorized', 401); return; }
  const dairyId = new Types.ObjectId(req.user.dairyId);
  const supplier = await Supplier.findOne({ _id: req.params.id, dairyId });
  if (!supplier) { sendError(res, 'Farmer not found', 404); return; }
  const [summary, recent] = await Promise.all([
    MilkProcurement.aggregate([
      { $match: { dairyId, supplierId: supplier._id, qualityStatus: 'accepted' } },
      { $group: { _id: null, kilograms: { $sum: '$quantityKg' }, payable: { $sum: '$amount' }, collections: { $sum: 1 } } },
    ]),
    MilkProcurement.find({ dairyId, supplierId: supplier._id }).sort({ collectionDate: -1 }).limit(20),
  ]);
  sendSuccess(res, { supplier, summary: summary[0] || { kilograms: 0, payable: 0, collections: 0 }, recent });
}
