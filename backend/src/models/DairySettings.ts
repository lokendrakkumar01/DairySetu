import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IDairySettings extends Document {
  dairyId: Types.ObjectId;
  billingCycleDay: number;
  defaultMilkType: 'cow' | 'buffalo' | 'mixed';
  cowRatePerLitre: number;
  buffaloRatePerLitre: number;
  mixedRatePerLitre: number;
  enableWhatsappNotifications: boolean;
  enableSmsNotifications: boolean;
  billPrefix: string;
  autoGenerateBills: boolean;
  workingDays: string[];
  createdAt: Date;
  updatedAt: Date;
}

const DairySettingsSchema = new Schema<IDairySettings>(
  {
    dairyId: { type: Schema.Types.ObjectId, ref: 'DairyAccount', required: true, unique: true },
    billingCycleDay: { type: Number, default: 1 },
    defaultMilkType: { type: String, enum: ['cow', 'buffalo', 'mixed'], default: 'mixed' },
    cowRatePerLitre: { type: Number, default: 50 },
    buffaloRatePerLitre: { type: Number, default: 65 },
    mixedRatePerLitre: { type: Number, default: 55 },
    enableWhatsappNotifications: { type: Boolean, default: false },
    enableSmsNotifications: { type: Boolean, default: false },
    billPrefix: { type: String, default: 'DS' },
    autoGenerateBills: { type: Boolean, default: false },
    workingDays: {
      type: [String],
      default: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
    },
  },
  { timestamps: true }
);

export default mongoose.model<IDairySettings>('DairySettings', DairySettingsSchema);
