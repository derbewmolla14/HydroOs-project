import mongoose from 'mongoose';

const organizationSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    type: { type: String, required: true, trim: true },
    region: String,
    zone: String,
    woreda: String,
    city: String,
    physicalAddress: String,
    latitude: Number,
    longitude: Number,
    contact: { phone: String, email: String, website: String },
    status: { type: String, enum: ['active', 'suspended', 'deactivated'], default: 'active' },
    subscription: {
        plan: { type: String, default: 'starter' },
        status: { type: String, enum: ['trialing', 'active', 'suspended', 'cancelled'], default: 'trialing' },
        userLimit: { type: Number, default: 10 },
        tankLimit: { type: Number, default: 20 },
        deviceLimit: { type: Number, default: 50 },
        subAdminLimit: { type: Number, default: 2 },
        modules: { type: [String], default: [] }
    }
}, { timestamps: true });

export const Organization = mongoose.models.Organization || mongoose.model('Organization', organizationSchema);
