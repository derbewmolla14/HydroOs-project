import mongoose from 'mongoose';
import { locationFields } from './locationSchema.js';

const fieldAssessmentSchema = new mongoose.Schema({
    organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    siteName: { type: String, required: true, trim: true, maxlength: 200 },
    sourceType: { type: String, enum: ['Spring', 'Borehole/Handpump', 'Piped Scheme', 'Water Tank', 'Other'], required: true },
    ...locationFields,
    infrastructureStatus: { type: String, trim: true, default: '' },
    sanitaryRisks: { type: [String], default: [] },
    waterSecurityImpact: { type: String, trim: true, maxlength: 5000, default: '' },
    priorityIntervention: { type: String, enum: ['Rehabilitation', 'Spring Development & Protection', 'Water Quality Improvement', 'WASH Promotion', 'Sustainable Water Supply'], required: true },
    initialWaterQuality: {
        ph: { type: Number, min: 0, max: 14, default: null },
        turbidity: { type: Number, min: 0, default: null },
        chlorine: { type: Number, min: 0, default: null }
    },
    notes: { type: String, trim: true, maxlength: 10000, default: '' },
    assessedBy: { type: String, trim: true, default: '' },
    submittedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    createdAt: { type: Date, default: Date.now }
}, { timestamps: true });

fieldAssessmentSchema.index({ organizationId: 1, createdAt: -1 });
fieldAssessmentSchema.index({ 'geoLocation': '2dsphere' });
export const FieldAssessment = mongoose.models.FieldAssessment || mongoose.model('FieldAssessment', fieldAssessmentSchema);
