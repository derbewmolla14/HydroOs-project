import mongoose from 'mongoose';

const receiptSchema = new mongoose.Schema({
    url: String,
    username: String,
    email: String,
    serviceName: String,
    status: { type: String, default: 'pending' },
    timestamp: { type: Date, default: Date.now }
}, { timestamps: true });

export const Receipt = mongoose.models.Receipt || mongoose.model('Receipt', receiptSchema);
