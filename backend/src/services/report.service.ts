import { Types } from 'mongoose';
import MilkRecord from '../models/MilkRecord';
import Customer from '../models/Customer';
import Payment from '../models/Payment';
import { getMonthRange, startOfDay, endOfDay } from '../utils/dateUtils';

export async function getDailyCollectionReport(dairyId: string, date: Date): Promise<object[]> {
  const dairyObjectId = new Types.ObjectId(dairyId);
  const dayStart = startOfDay(date);
  const dayEnd = endOfDay(date);

  const records = await MilkRecord.find({
    dairyId: dairyObjectId,
    date: { $gte: dayStart, $lte: dayEnd },
    isDeleted: false,
  })
    .populate('customerId', 'fullName customerId mobile')
    .sort({ 'customerId.customerId': 1 });

  return records;
}

export async function getMonthlySummaryReport(
  dairyId: string,
  month: number,
  year: number
): Promise<object[]> {
  const dairyObjectId = new Types.ObjectId(dairyId);
  const { start, end } = getMonthRange(month, year);

  const summary = await MilkRecord.aggregate([
    {
      $match: {
        dairyId: dairyObjectId,
        date: { $gte: start, $lte: end },
        isDeleted: false,
      },
    },
    {
      $group: {
        _id: '$customerId',
        totalMorning: { $sum: '$morningQty' },
        totalEvening: { $sum: '$eveningQty' },
        totalQuantity: { $sum: '$totalQty' },
        totalAmount: { $sum: '$amount' },
        days: { $sum: 1 },
      },
    },
    {
      $lookup: {
        from: 'customers',
        localField: '_id',
        foreignField: '_id',
        as: 'customer',
      },
    },
    { $unwind: '$customer' },
    {
      $project: {
        customerId: '$customer.customerId',
        fullName: '$customer.fullName',
        mobile: '$customer.mobile',
        currentBalance: '$customer.currentBalance',
        totalMorning: 1,
        totalEvening: 1,
        totalQuantity: 1,
        totalAmount: 1,
        days: 1,
      },
    },
    { $sort: { customerId: 1 } },
  ]);

  return summary;
}

export async function getOutstandingReport(dairyId: string): Promise<object[]> {
  const dairyObjectId = new Types.ObjectId(dairyId);
  const customers = await Customer.find({
    dairyId: dairyObjectId,
    currentBalance: { $gt: 0 },
    isActive: true,
  })
    .select('customerId fullName mobile currentBalance village')
    .sort({ currentBalance: -1 });

  return customers;
}

export async function getAnalyticsReport(
  dairyId: string,
  startDate: Date,
  endDate: Date
): Promise<object> {
  const dairyObjectId = new Types.ObjectId(dairyId);

  // Daily milk trend
  const dailyMilkTrend = await MilkRecord.aggregate([
    {
      $match: {
        dairyId: dairyObjectId,
        date: { $gte: startDate, $lte: endDate },
        isDeleted: false,
      },
    },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$date' } },
        morning: { $sum: '$morningQty' },
        evening: { $sum: '$eveningQty' },
        total: { $sum: '$totalQty' },
      },
    },
    { $sort: { _id: 1 } },
    {
      $project: {
        date: '$_id',
        morning: 1,
        evening: 1,
        total: 1,
        _id: 0,
      },
    },
  ]);

  // Monthly revenue trend
  const monthlyRevenueTrend = await MilkRecord.aggregate([
    {
      $match: {
        dairyId: dairyObjectId,
        date: { $gte: startDate, $lte: endDate },
        isDeleted: false,
      },
    },
    {
      $group: {
        _id: {
          month: { $month: '$date' },
          year: { $year: '$date' },
        },
        revenue: { $sum: '$amount' },
      },
    },
    { $sort: { '_id.year': 1, '_id.month': 1 } },
  ]);

  // Payments by month
  const paymentsByMonth = await Payment.aggregate([
    {
      $match: {
        dairyId: dairyObjectId,
        paymentDate: { $gte: startDate, $lte: endDate },
        isReversed: false,
      },
    },
    {
      $group: {
        _id: {
          month: { $month: '$paymentDate' },
          year: { $year: '$paymentDate' },
        },
        collected: { $sum: '$amount' },
      },
    },
  ]);

  // Merge revenue and payments
  const revenueMap = new Map(
    monthlyRevenueTrend.map((r) => [`${r._id.year}-${r._id.month}`, r.revenue])
  );
  const paymentMap = new Map(
    paymentsByMonth.map((p) => [`${p._id.year}-${p._id.month}`, p.collected])
  );

  const allMonthKeys = new Set([...revenueMap.keys(), ...paymentMap.keys()]);
  const monthlyRevenueTrendFinal = Array.from(allMonthKeys).map((key) => ({
    month: key,
    revenue: revenueMap.get(key) || 0,
    collected: paymentMap.get(key) || 0,
  }));

  // Milk type distribution
  const milkTypeDistribution = await MilkRecord.aggregate([
    {
      $match: {
        dairyId: dairyObjectId,
        date: { $gte: startDate, $lte: endDate },
        isDeleted: false,
      },
    },
    {
      $group: {
        _id: '$milkType',
        quantity: { $sum: '$totalQty' },
      },
    },
  ]);

  const distribution: Record<string, number> = { cow: 0, buffalo: 0, mixed: 0 };
  milkTypeDistribution.forEach((d) => {
    distribution[d._id] = d.quantity;
  });

  // Top customers by quantity
  const topCustomers = await MilkRecord.aggregate([
    {
      $match: {
        dairyId: dairyObjectId,
        date: { $gte: startDate, $lte: endDate },
        isDeleted: false,
      },
    },
    {
      $group: {
        _id: '$customerId',
        totalQuantity: { $sum: '$totalQty' },
        totalAmount: { $sum: '$amount' },
      },
    },
    { $sort: { totalQuantity: -1 } },
    { $limit: 10 },
    {
      $lookup: {
        from: 'customers',
        localField: '_id',
        foreignField: '_id',
        as: 'customer',
      },
    },
    { $unwind: '$customer' },
    {
      $project: {
        customerId: '$customer.customerId',
        fullName: '$customer.fullName',
        totalQuantity: 1,
        totalAmount: 1,
      },
    },
  ]);

  return {
    dailyMilkTrend,
    monthlyRevenueTrend: monthlyRevenueTrendFinal,
    milkTypeDistribution: distribution,
    topCustomers,
  };
}
