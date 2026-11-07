import mongoose, { Document, Schema, Types } from 'mongoose';
import { UserRole } from '../types';

export interface IUser extends Document {
  dairyId: Types.ObjectId;
  role: UserRole;
  username: string;
  email?: string;
  passwordHash: string;
  customerId?: Types.ObjectId;
  isActive: boolean;
  lastLoginAt?: Date;
  refreshToken?: string;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    dairyId: { type: Schema.Types.ObjectId, ref: 'DairyAccount', required: true },
    role: { type: String, enum: ['admin', 'customer'], required: true },
    username: { type: String, required: true, trim: true, lowercase: true },
    email: { type: String, sparse: true, trim: true, lowercase: true },
    passwordHash: { type: String, required: true },
    customerId: { type: Schema.Types.ObjectId, ref: 'Customer', default: null },
    isActive: { type: Boolean, default: true },
    lastLoginAt: { type: Date },
    refreshToken: { type: String },
  },
  { timestamps: true }
);

// Compound unique index: username unique per dairy
UserSchema.index({ dairyId: 1, username: 1 }, { unique: true });

export default mongoose.model<IUser>('User', UserSchema);
