import mongoose from 'mongoose';

const alertConfigSchema = new mongoose.Schema({
    organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true },
    tankId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tank', default: null },
    waterLevel: {
        minimum: { type: Number, min: 0, default: null },
        critical: { type: Number, min: 0, default: null },
        maximum: { type: Number, min: 0, default: null },
        unexpectedDrop: { type: Number, min: 0, default: null }
    },
    quality: {
        phMin: { type: Number, min: 0, max: 14, default: null },
        phMax: { type: Number, min: 0, max: 14, default: null },
        turbidityMax: { type: Number, min: 0, default: null },
        electricalConductivityMax: { type: Number, min: 0, default: null },
        temperatureMin: { type: Number, default: null },
        temperatureMax: { type: Number, default: null }
    },
    device: {
        lowBattery: { type: Number, min: 0, max: 100, default: 20 },
        offlineTimeoutSeconds: { type: Number, min: 10, default: 900 },
        missingMeasurementMinutes: { type: Number, min: 1, default: 60 }
    },
    usage: {
        maxLitersPerHour: { type: Number, min: 0, default: null },
        continuousFlowMinutes: { type: Number, min: 1, default: 60 }
    }
}, { timestamps: true });

alertConfigSchema.index({ organizationId: 1, tankId: 1 }, { unique: true });
export const AlertConfig = mongoose.models.AlertConfig || mongoose.model('AlertConfig', alertConfigSchema);
