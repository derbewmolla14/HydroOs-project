import mongoose from 'mongoose';

const tankSchema = new mongoose.Schema({
    organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    name: { type: String, required: true },
    code: { type: String, required: true, trim: true, uppercase: true },
    shape: { type: String, enum: ['cylindrical', 'rectangular', 'spherical', 'custom'], default: 'cylindrical' },
    dimensions: {
        diameter: { type: Number, min: 0, default: null },
        length: { type: Number, min: 0, default: null },
        width: { type: Number, min: 0, default: null },
        height: { type: Number, min: 0, default: null }
    },
    tankType: { type: String, enum: ['ground', 'overhead', 'underground', 'reservoir', 'other'], default: 'other' },
    capacity: { type: Number, required: true, min: 1 },
    location: { type: String, trim: true, default: '' },
    latitude: { type: Number, min: -90, max: 90, default: null },
    longitude: { type: Number, min: -180, max: 180, default: null },
    installationDate: { type: Date, default: null },
    assignedOperatorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    status: { type: String, enum: ['active', 'suspended', 'deactivated'], default: 'active' },
    description: { type: String, trim: true, maxlength: 2000, default: '' },
    currentWaterLevel: { type: Number, min: 0, default: 0 },
    minimumWaterLevel: { type: Number, min: 0, default: 0 },
    maximumWaterLevel: { type: Number, min: 0, default: null },
    lastMeasuredAt: { type: Date, default: null },
    assignedUserIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
}, { timestamps: true });

tankSchema.index({ organizationId: 1, code: 1 }, { unique: true });
tankSchema.index({ organizationId: 1, assignedUserIds: 1 });
tankSchema.set('toJSON', { virtuals: true });
tankSchema.set('toObject', { virtuals: true });
tankSchema.virtual('remainingWaterVolume').get(function remainingWaterVolume() {
    return this.currentWaterLevel ?? 0;
});
tankSchema.virtual('waterLevelPercentage').get(function waterLevelPercentage() {
    const maximum = this.maximumWaterLevel || this.capacity || 0;
    return maximum ? Math.round(((this.currentWaterLevel || 0) / maximum) * 10000) / 100 : 0;
});

export const Tank = mongoose.models.Tank || mongoose.model('Tank', tankSchema);
