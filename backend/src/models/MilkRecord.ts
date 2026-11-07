import mongoose, { Document, Schema, Types } from 'mongoose';
import { MilkType } from '../types';

export interface IMilkRecord extends Document {
  dairyId: Types.ObjectId;
  customerId: Types.ObjectId;
  date: Date;
  morningQty: number;
  eveningQty: number;
  totalQty: number;
  milkType: MilkType;
  rateApplied: number;
  amount: number;
  remarks?: string;
  isHoliday: boolean;
  isDeleted: boolean;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const MilkRecordSchema = new Schema<IMilkRecord>(
  {
    dairyId: { type: Schema.Types.ObjectId, ref: 'DairyAccount', required: true },
    customerId: { type: Schema.Types.ObjectId, ref: 'Customer', required: true },
    date: { type: Date, required: true },
    morningQty: { type: Number, default: 0, min: 0 },
    eveningQty: { type: Number, default: 0, min: 0 },
    totalQty: { type: Number, default: 0 },
    milkType: { type: String, enum: ['cow', 'buffalo', 'mixed'], default: 'mixed' },
    rateApplied: { type: Number, required: true },
    amount: { type: Number, default: 0 },
    remarks: { type: String, trim: true },
    isHoliday: { type: Boolean, default: false },
    isDeleted: { type: Boolean, default: false },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

// Compound unique index: one record per customer per day per dairy
MilkRecordSchema.index({ dairyId: 1, customerId: 1, date: 1 }, { unique: true });
MilkRecordSchema.index({ dairyId: 1, date: 1 });

// Pre-save hook to compute totalQty and amount
MilkRecordSchema.pre('save', function (this: IMilkRecord, next: (err?: Error) => void) {
  this.totalQty = this.morningQty + this.eveningQty;
  this.amount = parseFloat((this.totalQty * this.rateApplied).toFixed(2));
  next();
});

export default mongoose.model<IMilkRecord>('MilkRecord', MilkRecordSchema);
