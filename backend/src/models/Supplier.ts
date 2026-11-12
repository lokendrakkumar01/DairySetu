import mongoose, { Document, Schema, Types } from 'mongoose';

export type SupplierStatus = 'active' | 'inactive';

export interface ISupplier extends Document {
  dairyId: Types.ObjectId;
  supplierCode: string;
  fullName: string;
  mobile: string;
  address?: string;
  village?: string;
  milkTypes: ('cow' | 'buffalo')[];
  upiId?: string;
  bankName?: string;
  accountNumber?: string;
  ifscCode?: string;
  status: SupplierStatus;
  registeredAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const SupplierSchema = new Schema<ISupplier>({
  dairyId: { type: Schema.Types.ObjectId, ref: 'DairyAccount', required: true, index: true },
  supplierCode: { type: String, required: true, trim: true, uppercase: true },
  fullName: { type: String, required: true, trim: true, maxlength: 100 },
  mobile: { type: String, required: true, trim: true, maxlength: 15 },
  address: { type: String, trim: true, maxlength: 300 },
  village: { type: String, trim: true, maxlength: 100 },
  milkTypes: { type: [{ type: String, enum: ['cow', 'buffalo'] }], required: true, validate: (v: string[]) => v.length > 0 },
  upiId: { type: String, trim: true, lowercase: true },
  bankName: { type: String, trim: true },
  accountNumber: { type: String, trim: true },
  ifscCode: { type: String, trim: true, uppercase: true },
  status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  registeredAt: { type: Date, default: Date.now },
}, { timestamps: true });

SupplierSchema.index({ dairyId: 1, supplierCode: 1 }, { unique: true });
SupplierSchema.index({ dairyId: 1, status: 1, fullName: 1 });

export default mongoose.model<ISupplier>('Supplier', SupplierSchema);
