import mongoose, { Document, Schema, Types } from 'mongoose';
import { PaymentMethod } from '../types';

export interface IPayment extends Document {
  dairyId: Types.ObjectId;
  customerId: Types.ObjectId;
  billId?: Types.ObjectId;
  amount: number;
  paymentMethod: PaymentMethod;
  paymentDate: Date;
  reference?: string;
  notes?: string;
  receiptNumber: string;
  recordedBy: Types.ObjectId;
  isReversed: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const PaymentSchema = new Schema<IPayment>(
  {
    dairyId: { type: Schema.Types.ObjectId, ref: 'DairyAccount', required: true },
    customerId: { type: Schema.Types.ObjectId, ref: 'Customer', required: true },
    billId: { type: Schema.Types.ObjectId, ref: 'MonthlyBill', default: null },
    amount: { type: Number, required: true, min: 0.01 },
    paymentMethod: {
      type: String,
      enum: ['cash', 'upi', 'bank', 'other'],
      required: true,
    },
    paymentDate: { type: Date, required: true, default: Date.now },
    reference: { type: String, trim: true },
    notes: { type: String, trim: true },
    receiptNumber: { type: String, unique: true },
    recordedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    isReversed: { type: Boolean, default: false },
  },
  { timestamps: true }
);

PaymentSchema.index({ dairyId: 1, customerId: 1 });
PaymentSchema.index({ dairyId: 1, paymentDate: -1 });

export default mongoose.model<IPayment>('Payment', PaymentSchema);
