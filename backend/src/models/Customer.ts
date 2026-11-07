import mongoose, { Document, Schema, Types } from 'mongoose';
import { MilkType } from '../types';

export interface ICustomer extends Document {
  dairyId: Types.ObjectId;
  customerId: string;
  fullName: string;
  mobile: string;
  address?: string;
  village?: string;
  joinDate: Date;
  milkType: MilkType;
  defaultMorningQty: number;
  defaultEveningQty: number;
  currentBalance: number;
  isActive: boolean;
  userId?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const CustomerSchema = new Schema<ICustomer>(
  {
    dairyId: { type: Schema.Types.ObjectId, ref: 'DairyAccount', required: true },
    customerId: { type: String, required: true, trim: true },
    fullName: { type: String, required: true, trim: true },
    mobile: { type: String, required: true, trim: true },
    address: { type: String, trim: true },
    village: { type: String, trim: true },
    joinDate: { type: Date, default: Date.now },
    milkType: { type: String, enum: ['cow', 'buffalo', 'mixed'], default: 'mixed' },
    defaultMorningQty: { type: Number, default: 0, min: 0 },
    defaultEveningQty: { type: Number, default: 0, min: 0 },
    currentBalance: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
);

// Compound unique index: customerId unique per dairy
CustomerSchema.index({ dairyId: 1, customerId: 1 }, { unique: true });
CustomerSchema.index({ dairyId: 1, mobile: 1 });

export default mongoose.model<ICustomer>('Customer', CustomerSchema);
