import mongoose from 'mongoose';

export const WATER_QUALITY_STATUS = ['Safe', 'Needs Attention', 'Unsafe - HWTS Required'];

export function evaluateWashStatus({ ph, turbidity, chlorine }) {
    const values = [ph, turbidity, chlorine].filter((value) => value !== null && value !== undefined && value !== '');
    if (!values.length) return 'Needs Attention';
    // Operational screening only: pH is an acceptability/operational consideration,
    // not a standalone health-based WHO guideline.
    if (Number.isFinite(Number(turbidity)) && Number(turbidity) > 5) return 'Unsafe - HWTS Required';
    if ((ph !== null && ph !== undefined && (Number(ph) < 6.5 || Number(ph) > 8.5))
        || (chlorine !== null && chlorine !== undefined && (Number(chlorine) < 0.2 || Number(chlorine) > 0.5))) {
        return 'Needs Attention';
    }
    if (turbidity === null || turbidity === undefined || chlorine === null || chlorine === undefined || ph === null || ph === undefined) {
        return 'Needs Attention';
    }
    return 'Safe';
}

const waterQualitySchema = new mongoose.Schema({
    organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    tankId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tank', default: null, index: true },
    waterSourceId: { type: mongoose.Schema.Types.ObjectId, ref: 'WaterSource', default: null, index: true },
    ph: { type: Number, min: 0, max: 14, default: null },
    turbidity: { type: Number, min: 0, default: null },
    chlorine: { type: Number, min: 0, default: null },
    tds: { type: Number, min: 0, default: null },
    temperature: { type: Number, default: null },
    washStatus: { type: String, enum: WATER_QUALITY_STATUS, default: 'Needs Attention' },
    measuredAt: { type: Date, default: Date.now, index: true },
    coordinates: { latitude: Number, longitude: Number },
    adminLocation: { country: String, region: String, zone: String, woreda: String, kebele: String },
    measuringDevice: { type: String, trim: true, default: '' },
    technician: { type: String, trim: true, default: '' },
    testingMethod: { type: String, trim: true, default: '' },
    remarks: { type: String, trim: true, maxlength: 3000, default: '' },
    laboratoryReportUrl: { type: String, trim: true, default: '' },
    recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

waterQualitySchema.pre('validate', function evaluateStatus() {
    this.washStatus = evaluateWashStatus(this);
});
waterQualitySchema.index({ organizationId: 1, measuredAt: -1 });
waterQualitySchema.index({ tankId: 1, measuredAt: -1 });
waterQualitySchema.index({ waterSourceId: 1, measuredAt: -1 });

export const WaterQuality = mongoose.models.WaterQuality || mongoose.model('WaterQuality', waterQualitySchema);
