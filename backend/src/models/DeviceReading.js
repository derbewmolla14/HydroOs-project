import mongoose from 'mongoose';

const deviceReadingSchema = new mongoose.Schema({
    deviceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Device', required: true, index: true },
    organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    tankId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tank', default: null, index: true },
    measuredAt: { type: Date, required: true, default: Date.now, index: true },
    waterLevel: { type: Number, min: 0, default: null },
    waterVolume: { type: Number, min: 0, default: null },
    flowRate: { type: Number, min: 0, default: null },
    temperature: { type: Number, default: null },
    ph: { type: Number, min: 0, max: 14, default: null },
    turbidity: { type: Number, min: 0, default: null },
    electricalConductivity: { type: Number, min: 0, default: null },
    batteryLevel: { type: Number, min: 0, max: 100, default: null },
    payload: { type: mongoose.Schema.Types.Mixed, default: {} }
}, { timestamps: true });

deviceReadingSchema.index({ deviceId: 1, measuredAt: -1 });
deviceReadingSchema.index({ deviceId: 1, measuredAt: 1 }, { unique: true });
export const DeviceReading = mongoose.models.DeviceReading || mongoose.model('DeviceReading', deviceReadingSchema);
