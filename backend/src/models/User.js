import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
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
