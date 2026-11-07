import { Types } from 'mongoose';
import MonthlyBill from '../models/MonthlyBill';
import MilkRecord from '../models/MilkRecord';
import Payment from '../models/Payment';
import Adjustment from '../models/Adjustment';
import Customer from '../models/Customer';
import { getMonthRange } from '../utils/dateUtils';

interface GenerateBillPayload {
  dairyId: string;
  customerId: string;
  month: number;
  year: number;
  createdByUserId: string;
}

export async function generateBill(payload: GenerateBillPayload): Promise<object> {
  const { dairyId, customerId, month, year } = payload;
  const dairyObjectId = new Types.ObjectId(dairyId);
  const customerObjectId = new Types.ObjectId(customerId);

  const { start, end } = getMonthRange(month, year);

  // Check if bill already exists
  const existingBill = await MonthlyBill.findOne({
    dairyId: dairyObjectId,
    customerId: customerObjectId,
    billMonth: month,
    billYear: year,
  });

  // 1. Sum all milk records
  const milkRecords = await MilkRecord.find({
    dairyId: dairyObjectId,
    customerId: customerObjectId,
    date: { $gte: start, $lte: end },
    isDeleted: false,
  }).sort({ date: 1 });

  let totalQuantity = 0;
  let milkCharges = 0;
  const dailySnapshot = milkRecords.map((rec) => {
    totalQuantity += rec.totalQty;
    milkCharges += rec.amount;
    return {
      date: rec.date,
      morning: rec.morningQty,
      evening: rec.eveningQty,
      total: rec.totalQty,
      rate: rec.rateApplied,
      amount: rec.amount,
    };
  });

  milkCharges = parseFloat(milkCharges.toFixed(2));

  // 2. Previous balance - look for previous month's bill finalBalance
  const prevMonth = month === 1 ? 12 : month - 1;
  const prevYear = month === 1 ? year - 1 : year;
  const prevBill = await MonthlyBill.findOne({
    dairyId: dairyObjectId,
    customerId: customerObjectId,
    billMonth: prevMonth,
    billYear: prevYear,
  });
  const previousBalance = prevBill ? prevBill.finalBalance : 0;

  // 3. Sum payments for this month
  const paymentsAgg = await Payment.aggregate([
    {
      $match: {
        dairyId: dairyObjectId,
        customerId: customerObjectId,
        paymentDate: { $gte: start, $lte: end },
        isReversed: false,
      },
    },
    { $group: { _id: null, total: { $sum: '$amount' } } },
  ]);
  const paymentsReceived = paymentsAgg.length > 0 ? paymentsAgg[0].total : 0;

  // 4. Sum adjustments for this month
  const adjAgg = await Adjustment.aggregate([
    {
      $match: {
        dairyId: dairyObjectId,
        customerId: customerObjectId,
        adjustmentDate: { $gte: start, $lte: end },
      },
    },
    {
      $group: {
        _id: null,
        credit: {
          $sum: {
            $cond: [
              { $in: ['$type', ['discount', 'credit', 'refund']] },
              '$amount',
              0,
            ],
          },
        },
        debit: {
          $sum: {
            $cond: [{ $eq: ['$type', 'debit'] }, '$amount', 0],
          },
        },
      },
    },
  ]);
  const adjNet =
    adjAgg.length > 0 ? adjAgg[0].debit - adjAgg[0].credit : 0;

  // 5. Final balance
  const finalBalance = parseFloat(
    (milkCharges + previousBalance - paymentsReceived + adjNet).toFixed(2)
  );

  // Generate bill number
  const billCount = await MonthlyBill.countDocuments({ dairyId: dairyObjectId });
  const billNumber = `DS-${year}-${String(month).padStart(2, '0')}-${String(billCount + 1).padStart(3, '0')}`;

  let bill;
  if (existingBill) {
    // Update existing draft
    existingBill.totalQuantity = totalQuantity;
    existingBill.milkCharges = milkCharges;
    existingBill.previousBalance = previousBalance;
    existingBill.paymentsReceived = paymentsReceived;
    existingBill.adjustments = parseFloat(adjNet.toFixed(2));
    existingBill.finalBalance = finalBalance;
    existingBill.dailySnapshot = dailySnapshot;
    bill = await existingBill.save();
  } else {
    bill = await MonthlyBill.create({
      dairyId: dairyObjectId,
      customerId: customerObjectId,
      billMonth: month,
      billYear: year,
      billNumber,
      totalQuantity,
      milkCharges,
      previousBalance,
      paymentsReceived,
      adjustments: parseFloat(adjNet.toFixed(2)),
      finalBalance,
      dailySnapshot,
      status: 'draft',
    });
  }

  // Update customer balance
  await Customer.findByIdAndUpdate(customerObjectId, {
    currentBalance: finalBalance,
  });

  return bill;
}

export async function finalizeBill(billId: string, dairyId: string): Promise<object | null> {
  const bill = await MonthlyBill.findOneAndUpdate(
    {
      _id: billId,
      dairyId: new Types.ObjectId(dairyId),
      status: 'draft',
    },
    {
      $set: {
        status: 'finalized',
        finalizedAt: new Date(),
      },
    },
    { new: true }
  );
  return bill;
}

export async function closeBill(billId: string, dairyId: string): Promise<object | null> {
  const bill = await MonthlyBill.findOneAndUpdate(
    {
      _id: billId,
      dairyId: new Types.ObjectId(dairyId),
      status: 'finalized',
    },
    {
      $set: {
        status: 'closed',
        closedAt: new Date(),
      },
    },
    { new: true }
  );
  return bill;
}
