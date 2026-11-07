import { Response } from 'express';
import { Types } from 'mongoose';
import { AuthRequest } from '../types';
import { sendSuccess, sendError } from '../utils/responseHelper';
import {
  getDailyCollectionReport,
  getMonthlySummaryReport,
  getOutstandingReport,
  getAnalyticsReport,
} from '../services/report.service';
import { startOfDay } from '../utils/dateUtils';

export async function dailyCollection(req: AuthRequest, res: Response): Promise<void> {
  if (!req.user) { sendError(res, 'Unauthorized', 401); return; }
  const { date } = req.query as { date?: string };
  const reportDate = date ? new Date(date) : new Date();
  const records = await getDailyCollectionReport(req.user.dairyId, reportDate);
  sendSuccess(res, records, 'Daily collection report');
}

export async function monthlySummary(req: AuthRequest, res: Response): Promise<void> {
  if (!req.user) { sendError(res, 'Unauthorized', 401); return; }
  const { month, year } = req.query as { month?: string; year?: string };
  const now = new Date();
  const m = month ? parseInt(month, 10) : now.getMonth() + 1;
  const y = year ? parseInt(year, 10) : now.getFullYear();
  const summary = await getMonthlySummaryReport(req.user.dairyId, m, y);
  sendSuccess(res, summary, 'Monthly summary report');
}

export async function outstanding(req: AuthRequest, res: Response): Promise<void> {
  if (!req.user) { sendError(res, 'Unauthorized', 401); return; }
  const report = await getOutstandingReport(req.user.dairyId);
  sendSuccess(res, report, 'Outstanding report');
}

export async function analytics(req: AuthRequest, res: Response): Promise<void> {
  if (!req.user) { sendError(res, 'Unauthorized', 401); return; }
  const { startDate, endDate } = req.query as { startDate?: string; endDate?: string };

  const now = new Date();
  const start = startDate
    ? startOfDay(new Date(startDate))
    : new Date(now.getFullYear(), now.getMonth() - 2, 1);
  const end = endDate
    ? new Date(new Date(endDate).setHours(23, 59, 59, 999))
    : new Date(now.setHours(23, 59, 59, 999));

  const report = await getAnalyticsReport(req.user.dairyId, start, end);
  sendSuccess(res, report, 'Analytics report');
}
