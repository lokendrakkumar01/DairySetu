import { Response } from 'express';
import { Types } from 'mongoose';
import { AuthRequest } from '../types';
import { sendSuccess, sendError } from '../utils/responseHelper';
import DairySettings from '../models/DairySettings';
import DairyAccount from '../models/DairyAccount';

export async function getSettings(req: AuthRequest, res: Response): Promise<void> {
  if (!req.user) { sendError(res, 'Unauthorized', 401); return; }
  const dairyId = new Types.ObjectId(req.user.dairyId);
  const settings = await DairySettings.findOne({ dairyId });
  sendSuccess(res, settings, 'Settings fetched');
}

export async function updateSettings(req: AuthRequest, res: Response): Promise<void> {
  if (!req.user) { sendError(res, 'Unauthorized', 401); return; }
  const dairyId = new Types.ObjectId(req.user.dairyId);
  const settings = await DairySettings.findOneAndUpdate(
    { dairyId },
    { $set: req.body },
    { new: true, upsert: true }
  );
  sendSuccess(res, settings, 'Settings updated');
}

export async function getDairyProfile(req: AuthRequest, res: Response): Promise<void> {
  if (!req.user) { sendError(res, 'Unauthorized', 401); return; }
  const dairy = await DairyAccount.findById(req.user.dairyId).select('-__v');
  if (!dairy) { sendError(res, 'Dairy not found', 404); return; }
  sendSuccess(res, dairy, 'Profile fetched');
}

export async function updateDairyProfile(req: AuthRequest, res: Response): Promise<void> {
  if (!req.user) { sendError(res, 'Unauthorized', 401); return; }
  const allowed = ['dairyName', 'ownerName', 'address', 'village', 'whatsappNumber', 'language', 'currency', 'logoUrl'];
  const update: Record<string, unknown> = {};
  for (const key of allowed) {
    if (req.body[key] !== undefined) update[key] = req.body[key];
  }
  const dairy = await DairyAccount.findByIdAndUpdate(req.user.dairyId, { $set: update }, { new: true });
  if (!dairy) { sendError(res, 'Dairy not found', 404); return; }
  sendSuccess(res, dairy, 'Profile updated');
}
