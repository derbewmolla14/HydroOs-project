import mongoose from 'mongoose';
import { locationFields } from './locationSchema.js';

const waterSourceSchema = new mongoose.Schema({
    organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, trim: true, uppercase: true },
    sourceType: { type: String, enum: ['spring', 'borehole', 'river', 'well', 'reservoir', 'piped_scheme', 'other'], default: 'other' },
    ...locationFields,
    description: { type: String, trim: true, maxlength: 3000, default: '' },
    status: { type: String, enum: ['active', 'suspended', 'deactivated'], default: 'active' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });
waterSourceSchema.index({ organizationId: 1, code: 1 }, { unique: true });
waterSourceSchema.index({ geoLocation: '2dsphere' });
export const WaterSource = mongoose.models.WaterSource || mongoose.model('WaterSource', waterSourceSchema);
