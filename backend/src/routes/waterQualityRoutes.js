import express from 'express';
import mongoose from 'mongoose';
import { authenticate, hasTenantAccess, requireRoles, requireServiceAccess } from '../middleware/auth.js';
import { WaterQuality } from '../models/WaterQuality.js';
import { Tank } from '../models/Tank.js';
import { WaterSource } from '../models/WaterSource.js';
import { recordAudit } from '../services/auditService.js';

const router = express.Router();
const managers = ['SUPER_ADMIN', 'ORGANIZATION_ADMIN', 'SUB_ADMIN'];
router.use(authenticate);
router.use(requireServiceAccess('water_quality'));

function organizationScope(user, requested) {
    if (user.role === 'SUPER_ADMIN') return requested ? { organizationId: requested } : {};
    return { organizationId: user.organizationId };
}

router.get('/', async (req, res, next) => {
    try {
        const filter = organizationScope(req.user, req.query.organizationId);
        if (req.query.tankId) filter.tankId = req.query.tankId;
        if (req.query.waterSourceId) filter.waterSourceId = req.query.waterSourceId;
        if (req.query.washStatus) filter.washStatus = req.query.washStatus;
        const limit = Math.min(Math.max(Number.parseInt(req.query.limit || '25', 10), 1), 100);
        const page = Math.max(Number.parseInt(req.query.page || '1', 10), 1);
        const [tests, total] = await Promise.all([
            WaterQuality.find(filter).sort({ measuredAt: -1 }).skip((page - 1) * limit).limit(limit).populate('tankId', 'name code').populate('waterSourceId', 'name code').lean(),
            WaterQuality.countDocuments(filter)
        ]);
        res.json({ success: true, tests, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
    } catch (error) { next(error); }
});

router.post('/', requireRoles(...managers, 'OPERATOR'), async (req, res, next) => {
    try {
        const organizationId = req.user.role === 'SUPER_ADMIN' ? req.body.organizationId : req.user.organizationId;
        if (!organizationId || !hasTenantAccess(req.user, String(organizationId))) return res.status(403).json({ success: false, message: 'Organization access denied.' });
        if (Boolean(req.body.tankId) === Boolean(req.body.waterSourceId)) return res.status(400).json({ success: false, message: 'Provide exactly one tankId or waterSourceId.' });
        if (req.body.tankId) {
            if (!mongoose.isValidObjectId(req.body.tankId) || !await Tank.exists({ _id: req.body.tankId, organizationId })) return res.status(404).json({ success: false, message: 'Tank not found in this organization.' });
        }
        if (req.body.waterSourceId) {
            if (!mongoose.isValidObjectId(req.body.waterSourceId) || !await WaterSource.exists({ _id: req.body.waterSourceId, organizationId })) return res.status(404).json({ success: false, message: 'Water source not found in this organization.' });
        }
        const allowed = ['tankId','waterSourceId','ph','turbidity','chlorine','tds','temperature','measuredAt','coordinates','adminLocation','measuringDevice','technician','testingMethod','remarks','laboratoryReportUrl'];
        const values = Object.fromEntries(allowed.filter(key => req.body[key] !== undefined).map(key => [key, req.body[key]]));
        const test = await WaterQuality.create({ ...values, organizationId, recordedBy: req.user.id });
        await recordAudit({ actorUserId: req.user.id, action: 'WATER_QUALITY_RECORDED', resourceType: 'WaterQuality', resourceId: test.id, organizationId, metadata: { washStatus: test.washStatus }, ipAddress: req.ip });
        res.status(201).json({ success: true, test });
    } catch (error) { next(error); }
});

router.patch('/:testId', requireRoles(...managers, 'OPERATOR'), async (req, res, next) => {
    try {
        const filter = { _id: req.params.testId, ...organizationScope(req.user, req.body.organizationId) };
        const test = await WaterQuality.findOne(filter);
        if (!test) return res.status(404).json({ success: false, message: 'Water quality test not found.' });
        const allowed = ['ph','turbidity','chlorine','tds','temperature','measuredAt','coordinates','adminLocation','measuringDevice','technician','testingMethod','remarks','laboratoryReportUrl'];
        for (const key of allowed) if (req.body[key] !== undefined) test[key] = req.body[key];
        await test.save(); // pre-validate hook recalculates washStatus on every update.
        await recordAudit({ actorUserId: req.user.id, action: 'WATER_QUALITY_UPDATED', resourceType: 'WaterQuality', resourceId: test.id, organizationId: test.organizationId, metadata: { washStatus: test.washStatus }, ipAddress: req.ip });
        res.json({ success: true, test });
    } catch (error) { next(error); }
});

export { router as waterQualityRoutes };
