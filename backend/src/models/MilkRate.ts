import mongoose, { Document, Schema, Types } from 'mongoose';
import { MilkType } from '../types';

export interface IMilkRate extends Document {
  dairyId: Types.ObjectId;
  customerId?: Types.ObjectId;
  milkType: MilkType;
  ratePerLitre: number;
  effectiveFrom: Date;
  effectiveTo?: Date;
  createdBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const MilkRateSchema = new Schema<IMilkRate>(
  {
    dairyId: { type: Schema.Types.ObjectId, ref: 'DairyAccount', required: true },
    customerId: { type: Schema.Types.ObjectId, ref: 'Customer', default: null },
    milkType: { type: String, enum: ['cow', 'buffalo', 'mixed'], required: true },
    ratePerLitre: { type: Number, required: true, min: 0 },
    effectiveFrom: { type: Date, required: true },
    effectiveTo: { type: Date, default: null },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

MilkRateSchema.index({ dairyId: 1, customerId: 1, milkType: 1, effectiveFrom: -1 });

export default mongoose.model<IMilkRate>('MilkRate', MilkRateSchema);
