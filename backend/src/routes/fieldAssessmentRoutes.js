import express from 'express';
import mongoose from 'mongoose';
import { authenticate, hasTenantAccess, requireRoles } from '../middleware/auth.js';
import { FieldAssessment } from '../models/FieldAssessment.js';
import { normalizeLocationInput } from '../models/locationSchema.js';
import { recordAudit } from '../services/auditService.js';

const router = express.Router();
const writers = ['SUPER_ADMIN', 'ORGANIZATION_ADMIN', 'SUB_ADMIN', 'OPERATOR'];
const managers = ['SUPER_ADMIN', 'ORGANIZATION_ADMIN', 'SUB_ADMIN'];
router.use(authenticate);

function scope(user, requested) {
    if (user.role === 'SUPER_ADMIN') return requested ? { organizationId: requested } : {};
    return { organizationId: user.organizationId };
}

router.get('/', async (req, res, next) => {
    try {
        const filter = scope(req.user, req.query.organizationId);
        if (req.query.sourceType) filter.sourceType = req.query.sourceType;
        if (req.query.priorityIntervention) filter.priorityIntervention = req.query.priorityIntervention;
        if (req.query.search?.trim()) filter.siteName = { $regex: req.query.search.trim(), $options: 'i' };
        const limit = Math.min(Math.max(Number.parseInt(req.query.limit || '25', 10), 1), 100);
        const page = Math.max(Number.parseInt(req.query.page || '1', 10), 1);
        const [assessments, total] = await Promise.all([
            FieldAssessment.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
            FieldAssessment.countDocuments(filter)
        ]);
        res.json({ success: true, assessments, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
    } catch (error) { next(error); }
});

router.post('/', requireRoles(...writers), async (req, res, next) => {
    try {
        const organizationId = req.user.role === 'SUPER_ADMIN' ? req.body.organizationId : req.user.organizationId;
        if (!organizationId || !hasTenantAccess(req.user, String(organizationId))) return res.status(403).json({ success: false, message: 'Organization access denied.' });
        const location = normalizeLocationInput(req.body);
        const values = {
            siteName: req.body.siteName, sourceType: req.body.sourceType,
            ...location,
            infrastructureStatus: req.body.infrastructureStatus,
            sanitaryRisks: req.body.sanitaryRisks,
            waterSecurityImpact: req.body.waterSecurityImpact,
            priorityIntervention: req.body.priorityIntervention,
            initialWaterQuality: req.body.initialWaterQuality,
            notes: req.body.notes, assessedBy: req.body.assessedBy
        };
        const assessment = await FieldAssessment.create({ ...values, organizationId, submittedBy: req.user.id });
        await recordAudit({ actorUserId: req.user.id, action: 'FIELD_ASSESSMENT_CREATED', resourceType: 'FieldAssessment', resourceId: assessment.id, organizationId, metadata: { siteName: assessment.siteName }, ipAddress: req.ip });
        res.status(201).json({ success: true, assessment });
    } catch (error) { next(error); }
});

router.delete('/:assessmentId', requireRoles(...managers), async (req, res, next) => {
    try {
        if (!mongoose.isValidObjectId(req.params.assessmentId)) return res.status(400).json({ success: false, message: 'Invalid assessment ID.' });
        const assessment = await FieldAssessment.findOneAndDelete({ _id: req.params.assessmentId, ...scope(req.user, req.body?.organizationId || req.query.organizationId) });
        if (!assessment) return res.status(404).json({ success: false, message: 'Assessment not found.' });
        await recordAudit({ actorUserId: req.user.id, action: 'FIELD_ASSESSMENT_DELETED', resourceType: 'FieldAssessment', resourceId: assessment.id, organizationId: assessment.organizationId, ipAddress: req.ip });
        res.json({ success: true, message: 'Field assessment deleted.' });
    } catch (error) { next(error); }
});

export { router as fieldAssessmentRoutes };
