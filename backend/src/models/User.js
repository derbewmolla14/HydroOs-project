import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
    firstName: String,
    lastName: String,
    phoneNumber: String,
    // Legacy aliases retained for existing pages and older account records.
    firstname: String,
    lastname: String,
    username: String,
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    phone: String,
    passwordHash: { type: String, select: false },
    password: { type: String, select: false },
    organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', default: null },
    roleIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Role' }],
    role: { type: String, enum: ['SUPER_ADMIN', 'ORGANIZATION_ADMIN', 'SUB_ADMIN', 'OPERATOR'], default: 'OPERATOR' },
    permissions: { type: [String], default: [] },
    subscriptionStatus: { type: String, enum: ['active', 'inactive', 'expired'], default: 'inactive', index: true },
    subscriptionPlan: { type: String, enum: ['individual', 'all'], default: 'individual' },
    monthlyFeePaid: { type: Boolean, default: false },
    monthlyFeePaidAt: { type: Date, default: null },
    subscriptionExpiresAt: { type: Date, default: null },
    allowedServices: {
        type: [{ type: String, enum: ['water_tank', 'irrigation', 'soil_moisture', 'water_source', 'water_quality'] }],
        default: []
    },
    status: { type: String, enum: ['invited', 'active', 'suspended', 'deactivated'], default: 'active' },
    refreshTokenHash: { type: String, select: false },
    invitationTokenHash: { type: String, select: false },
    invitationExpiresAt: Date,
    passwordResetTokenHash: { type: String, select: false },
    passwordResetExpiresAt: Date,
    lastLoginAt: Date,
    lastActivityAt: Date
}, { timestamps: true, strict: false });

export const User = mongoose.models.User || mongoose.model('User', userSchema);
