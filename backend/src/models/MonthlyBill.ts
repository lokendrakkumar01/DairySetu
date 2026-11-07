import mongoose, { Document, Schema, Types } from 'mongoose';
import { BillStatus, DailySnapshot } from '../types';

export interface IMonthlyBill extends Document {
  dairyId: Types.ObjectId;
  customerId: Types.ObjectId;
  billMonth: number;
  billYear: number;
  billNumber: string;
  totalQuantity: number;
  milkCharges: number;
  previousBalance: number;
  paymentsReceived: number;
  adjustments: number;
  finalBalance: number;
  status: BillStatus;
  dailySnapshot: DailySnapshot[];
  finalizedAt?: Date;
  closedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const DailySnapshotSchema = new Schema<DailySnapshot>(
  {
    date: { type: Date, required: true },
    morning: { type: Number, default: 0 },
    evening: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
    rate: { type: Number, default: 0 },
    amount: { type: Number, default: 0 },
  },
  { _id: false }
);

const MonthlyBillSchema = new Schema<IMonthlyBill>(
  {
    dairyId: { type: Schema.Types.ObjectId, ref: 'DairyAccount', required: true },
    customerId: { type: Schema.Types.ObjectId, ref: 'Customer', required: true },
    billMonth: { type: Number, required: true, min: 1, max: 12 },
    billYear: { type: Number, required: true },
    billNumber: { type: String, unique: true },
    totalQuantity: { type: Number, default: 0 },
    milkCharges: { type: Number, default: 0 },
    previousBalance: { type: Number, default: 0 },
    paymentsReceived: { type: Number, default: 0 },
    adjustments: { type: Number, default: 0 },
    finalBalance: { type: Number, default: 0 },
    status: { type: String, enum: ['draft', 'finalized', 'closed'], default: 'draft' },
    dailySnapshot: { type: [DailySnapshotSchema], default: [] },
    finalizedAt: { type: Date },
    closedAt: { type: Date },
  },
  { timestamps: true }
);

// Compound unique index
MonthlyBillSchema.index(
  { dairyId: 1, customerId: 1, billMonth: 1, billYear: 1 },
  { unique: true }
);

export default mongoose.model<IMonthlyBill>('MonthlyBill', MonthlyBillSchema);
