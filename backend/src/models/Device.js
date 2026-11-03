import mongoose from 'mongoose';

const deviceSchema = new mongoose.Schema({
    organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    tankId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tank', default: null, index: true },
    identifier: { type: String, required: true, trim: true, uppercase: true },
    name: { type: String, required: true, trim: true },
    deviceType: { type: String, enum: ['level_sensor', 'flow_meter', 'quality_sensor', 'gateway', 'multi_sensor'], default: 'level_sensor' },
    protocol: { type: String, enum: ['http', 'mqtt', 'socket'], default: 'http' },
    firmwareVersion: { type: String, trim: true, default: '' },
    heartbeatIntervalSeconds: { type: Number, min: 10, max: 86400, default: 300 },
    secretHash: { type: String, required: true, select: false },
    status: { type: String, enum: ['active', 'inactive', 'deactivated'], default: 'active' },
    lastSeenAt: { type: Date, default: null },
    lastHeartbeatAt: { type: Date, default: null },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} }
}, { timestamps: true });

deviceSchema.index({ identifier: 1 }, { unique: true });
deviceSchema.index({ organizationId: 1, status: 1, lastSeenAt: -1 });
deviceSchema.set('toJSON', { virtuals: true });
deviceSchema.virtual('connectionStatus').get(function connectionStatus() {
    if (this.status === 'deactivated') return 'deactivated';
    if (!this.lastSeenAt) return 'offline';
    return Date.now() - this.lastSeenAt.getTime() <= this.heartbeatIntervalSeconds * 2000 ? 'online' : 'offline';
});

export const Device = mongoose.models.Device || mongoose.model('Device', deviceSchema);
