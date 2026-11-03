import mongoose from 'mongoose';

const passwordOtpSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    codeHash: { type: String, required: true },
    purpose: { type: String, enum: ['PASSWORD_CHANGE'], required: true },
    expiresAt: { type: Date, required: true, index: { expires: 0 } },
    attempts: { type: Number, default: 0 },
    consumedAt: Date
}, { timestamps: true });

export const PasswordOtp = mongoose.models.PasswordOtp || mongoose.model('PasswordOtp', passwordOtpSchema);
