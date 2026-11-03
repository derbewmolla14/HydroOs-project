import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema({
    actorUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    action: { type: String, required: true },
    resourceType: { type: String, required: true },
    resourceId: { type: String, default: null },
    organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', default: null },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
    ipAddress: String
}, { timestamps: true });

auditLogSchema.index({ organizationId: 1, createdAt: -1 });
export const AuditLog = mongoose.models.AuditLog || mongoose.model('AuditLog', auditLogSchema);
