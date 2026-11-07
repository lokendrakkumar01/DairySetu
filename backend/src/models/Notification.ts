import mongoose, { Document, Schema, Types } from 'mongoose';

export interface INotification extends Document {
  dairyId: Types.ObjectId;
  userId: Types.ObjectId;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'error';
  isRead: boolean;
  entityType?: string;
  entityId?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    dairyId: { type: Schema.Types.ObjectId, ref: 'DairyAccount', required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true, trim: true },
    message: { type: String, required: true, trim: true },
    type: {
      type: String,
      enum: ['info', 'warning', 'success', 'error'],
      default: 'info',
    },
    isRead: { type: Boolean, default: false },
    entityType: { type: String },
    entityId: { type: Schema.Types.ObjectId },
  },
  { timestamps: true }
);

NotificationSchema.index({ dairyId: 1, userId: 1, isRead: 1 });

export default mongoose.model<INotification>('Notification', NotificationSchema);
