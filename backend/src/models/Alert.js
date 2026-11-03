import mongoose from 'mongoose';

const historySchema = new mongoose.Schema({
    action: { type: String, required: true },
    actorUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    note: { type: String, default: '' },
    at: { type: Date, default: Date.now }
}, { _id: false });

const alertSchema = new mongoose.Schema({
    organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    tankId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tank', default: null, index: true },
    deviceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Device', default: null, index: true },
    category: { type: String, enum: ['WATER_LEVEL', 'WATER_QUALITY', 'DEVICE', 'USAGE'], required: true },
    conditionKey: { type: String, required: true },
    severity: { type: String, enum: ['CRITICAL', 'WARNING', 'INFO'], required: true },
    status: { type: String, enum: ['ACTIVE', 'ACKNOWLEDGED', 'RESOLVED', 'SNOOZED'], default: 'ACTIVE', index: true },
    title: { type: String, required: true },
    description: { type: String, required: true },
    measurementValue: { type: mongoose.Schema.Types.Mixed, default: null },
    threshold: { type: mongoose.Schema.Types.Mixed, default: null },
    snoozedUntil: { type: Date, default: null },
    acknowledgedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    acknowledgedAt: { type: Date, default: null },
    resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    resolvedAt: { type: Date, default: null },
    history: { type: [historySchema], default: [] }
}, { timestamps: true });

alertSchema.index({ organizationId: 1, createdAt: -1 });
alertSchema.index({ organizationId: 1, conditionKey: 1, status: 1 }, {
    unique: true,
    partialFilterExpression: { status: { $in: ['ACTIVE', 'ACKNOWLEDGED', 'SNOOZED'] } }
});

export const Alert = mongoose.models.Alert || mongoose.model('Alert', alertSchema);
