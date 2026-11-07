import mongoose, { Document, Schema, Types } from 'mongoose';
import { AdjustmentType } from '../types';

export interface IAdjustment extends Document {
  dairyId: Types.ObjectId;
  customerId: Types.ObjectId;
  billId?: Types.ObjectId;
  type: AdjustmentType;
  amount: number;
  reason: string;
  adjustmentDate: Date;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const AdjustmentSchema = new Schema<IAdjustment>(
  {
    dairyId: { type: Schema.Types.ObjectId, ref: 'DairyAccount', required: true },
    customerId: { type: Schema.Types.ObjectId, ref: 'Customer', required: true },
    billId: { type: Schema.Types.ObjectId, ref: 'MonthlyBill', default: null },
    type: {
      type: String,
      enum: ['discount', 'credit', 'debit', 'refund'],
      required: true,
    },
    amount: { type: Number, required: true },
    reason: { type: String, required: true, trim: true },
    adjustmentDate: { type: Date, default: Date.now },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

AdjustmentSchema.index({ dairyId: 1, customerId: 1 });

export default mongoose.model<IAdjustment>('Adjustment', AdjustmentSchema);
