import mongoose from 'mongoose';

export const SERVICE_TYPES = ['water_tank', 'irrigation', 'soil_moisture', 'water_source', 'water_quality'];

const serviceDeviceSchema = new mongoose.Schema({
    serviceId: { type: String, required: true, unique: true, uppercase: true, trim: true, index: true },
    serviceType: { type: String, required: true, enum: SERVICE_TYPES, index: true },
    servicePasswordHash: { type: String, required: true, select: false },
    assignedToUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    isActive: { type: Boolean, default: true, index: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    linkedAt: { type: Date, default: null },
    lastLinkedAt: { type: Date, default: null },
}, { timestamps: true });

export const ServiceDevice = mongoose.models.ServiceDevice || mongoose.model('ServiceDevice', serviceDeviceSchema);
