import mongoose, { Document, Schema } from 'mongoose';
import { Language } from '../types';

export interface IDairyAccount extends Document {
  dairyName: string;
  ownerName: string;
  mobile: string;
  email?: string;
  address?: string;
  village?: string;
  logoUrl?: string;
  whatsappNumber?: string;
  language: Language;
  currency: string;
  isActive: boolean;
  subscriptionPlan: string;
  createdAt: Date;
  updatedAt: Date;
}

const DairyAccountSchema = new Schema<IDairyAccount>(
  {
    dairyName: { type: String, required: true, trim: true },
    ownerName: { type: String, required: true, trim: true },
    mobile: { type: String, required: true, unique: true, trim: true },
    email: { type: String, unique: true, sparse: true, trim: true, lowercase: true },
    address: { type: String, trim: true },
    village: { type: String, trim: true },
    logoUrl: { type: String },
    whatsappNumber: { type: String, trim: true },
    language: { type: String, enum: ['en', 'hi'], default: 'en' },
    currency: { type: String, default: 'INR' },
    isActive: { type: Boolean, default: true },
    subscriptionPlan: { type: String, default: 'free' },
  },
  { timestamps: true }
);

export default mongoose.model<IDairyAccount>('DairyAccount', DairyAccountSchema);
