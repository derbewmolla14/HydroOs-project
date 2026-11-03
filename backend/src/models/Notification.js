import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    alertId: { type: mongoose.Schema.Types.ObjectId, ref: 'Alert', required: true, index: true },
    title: { type: String, required: true },
    message: { type: String, required: true },
    severity: { type: String, enum: ['CRITICAL', 'WARNING', 'INFO'], required: true },
    readAt: { type: Date, default: null },
    createdAt: { type: Date, default: Date.now }
});

notificationSchema.index({ userId: 1, readAt: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, alertId: 1 }, { unique: true });

export const Notification = mongoose.models.Notification || mongoose.model('Notification', notificationSchema);
