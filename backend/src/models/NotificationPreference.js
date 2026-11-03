import mongoose from 'mongoose';

const preferenceSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    critical: { type: Boolean, default: true },
    warning: { type: Boolean, default: true },
    info: { type: Boolean, default: true },
    deviceDisconnections: { type: Boolean, default: true },
    waterLevel: { type: Boolean, default: true },
    waterQuality: { type: Boolean, default: true }
}, { timestamps: true });

export const NotificationPreference = mongoose.models.NotificationPreference || mongoose.model('NotificationPreference', preferenceSchema);
