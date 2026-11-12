import mongoose, { Document, Schema, Types } from 'mongoose';
import { calculateMilkProcurementAmount } from '../utils/milkRateUtils';

export type CollectionSession = 'morning' | 'evening';
export type MilkQualityStatus = 'accepted' | 'rejected';

export interface IMilkProcurement extends Document {
  dairyId: Types.ObjectId;
  supplierId?: Types.ObjectId;
  customerId?: Types.ObjectId;
  collectionDate: Date;
  session: CollectionSession;
  milkType: 'cow' | 'buffalo';
  quantityKg: number;
  fatPercent: number;
  snfPercent: number;
  temperatureC?: number;
  ratePerKg: number;
  amount: number;
  qualityStatus: MilkQualityStatus;
  notes?: string;
  receiptNumber: string;
  recordedBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const MilkProcurementSchema = new Schema<IMilkProcurement>({
  dairyId: { type: Schema.Types.ObjectId, ref: 'DairyAccount', required: true },
  supplierId: { type: Schema.Types.ObjectId, ref: 'Supplier' },
  customerId: { type: Schema.Types.ObjectId, ref: 'Customer' },
  collectionDate: { type: Date, required: true },
  session: { type: String, enum: ['morning', 'evening'], required: true },
  milkType: { type: String, enum: ['cow', 'buffalo'], required: true },
  quantityKg: { type: Number, required: true, min: 0.01, max: 5000 },
  fatPercent: { type: Number, required: true, min: 0, max: 20 },
  snfPercent: { type: Number, required: true, min: 0, max: 20 },
  temperatureC: { type: Number, min: 0, max: 100 },
  ratePerKg: { type: Number, required: true, min: 0 },
  amount: { type: Number, default: 0, min: 0 },
  qualityStatus: { type: String, enum: ['accepted', 'rejected'], default: 'accepted' },
  notes: { type: String, trim: true, maxlength: 500 },
  receiptNumber: { type: String, required: true, unique: true },
  recordedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

MilkProcurementSchema.index({ dairyId: 1, collectionDate: -1, session: 1 });
MilkProcurementSchema.index({ dairyId: 1, customerId: 1, collectionDate: 1, session: 1, milkType: 1 }, { unique: true, partialFilterExpression: { customerId: { $exists: true } } });
MilkProcurementSchema.index({ dairyId: 1, supplierId: 1, collectionDate: 1, session: 1, milkType: 1 }, { unique: true, partialFilterExpression: { supplierId: { $exists: true } } });
MilkProcurementSchema.pre('save', function () {
  this.amount = calculateMilkProcurementAmount(this.quantityKg, this.ratePerKg, this.qualityStatus === 'accepted');
});

export default mongoose.model<IMilkProcurement>('MilkProcurement', MilkProcurementSchema);
