import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IAuditLog extends Document {
  dairyId: Types.ObjectId;
  userId: Types.ObjectId;
  action: string;
  entityType?: string;
  entityId?: Types.ObjectId;
  oldValue?: unknown;
  newValue?: unknown;
  ip?: string;
  createdAt: Date;
  updatedAt: Date;
}

const AuditLogSchema = new Schema<IAuditLog>(
  {
    dairyId: { type: Schema.Types.ObjectId, ref: 'DairyAccount', required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    action: { type: String, required: true, trim: true },
    entityType: { type: String, trim: true },
    entityId: { type: Schema.Types.ObjectId },
    oldValue: { type: Schema.Types.Mixed },
    newValue: { type: Schema.Types.Mixed },
    ip: { type: String },
  },
  { timestamps: true }
);

AuditLogSchema.index({ dairyId: 1, createdAt: -1 });
AuditLogSchema.index({ dairyId: 1, entityType: 1, entityId: 1 });

export default mongoose.model<IAuditLog>('AuditLog', AuditLogSchema);
