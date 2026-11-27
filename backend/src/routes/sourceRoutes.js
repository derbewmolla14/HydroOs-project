import express from 'express';
import { authenticate, hasTenantAccess, requireRoles } from '../middleware/auth.js';
import { WaterSource } from '../models/WaterSource.js';
import { normalizeLocationInput } from '../models/locationSchema.js';
import { recordAudit } from '../services/auditService.js';

const router = express.Router();
const managers = ['SUPER_ADMIN', 'ORGANIZATION_ADMIN', 'SUB_ADMIN'];
router.use(authenticate);
const scope = (user, organizationId) => user.role === 'SUPER_ADMIN' ? (organizationId ? { organizationId } : {}) : { organizationId: user.organizationId };

router.get('/', async (req, res, next) => {
    try {
        const filter = scope(req.user, req.query.organizationId);
        if (req.query.status) filter.status = req.query.status;
        if (req.query.search?.trim()) filter.$or = [{ name: { $regex: req.query.search.trim(), $options: 'i' } }, { code: { $regex: req.query.search.trim(), $options: 'i' } }];
        const limit = Math.min(Math.max(Number.parseInt(req.query.limit || '25', 10), 1), 100);
        const page = Math.max(Number.parseInt(req.query.page || '1', 10), 1);
        const [sources, total] = await Promise.all([WaterSource.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(), WaterSource.countDocuments(filter)]);
        res.json({ success: true, sources, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
    } catch (error) { next(error); }
});

router.post('/', requireRoles(...managers), async (req, res, next) => {
    try {
        const organizationId = req.user.role === 'SUPER_ADMIN' ? req.body.organizationId : req.user.organizationId;
        if (!organizationId || !hasTenantAccess(req.user, String(organizationId))) return res.status(403).json({ success: false, message: 'Organization access denied.' });
        const source = await WaterSource.create({
            organizationId, name: req.body.name, code: req.body.code, sourceType: req.body.sourceType,
            ...normalizeLocationInput(req.body), description: req.body.description, createdBy: req.user.id
        });
        await recordAudit({ actorUserId: req.user.id, action: 'WATER_SOURCE_CREATED', resourceType: 'WaterSource', resourceId: source.id, organizationId, ipAddress: req.ip });
        res.status(201).json({ success: true, source });
    } catch (error) { if (error.code === 11000) error.statusCode = 409; next(error); }
});

router.put('/:sourceId', requireRoles(...managers), async (req, res, next) => {
    try {
        const filter = { _id: req.params.sourceId, ...scope(req.user, req.body.organizationId) };
        const existing = await WaterSource.findOne(filter);
        if (!existing) return res.status(404).json({ success: false, message: 'Water source not found.' });
        const values = {};
        for (const key of ['name', 'code', 'sourceType', 'description', 'status']) if (req.body[key] !== undefined) values[key] = req.body[key];
        if (['coordinates', 'adminLocation', 'mapAdded', 'latitude', 'longitude'].some(key => req.body[key] !== undefined)) Object.assign(values, normalizeLocationInput(req.body));
        const source = await WaterSource.findByIdAndUpdate(existing.id, { $set: values }, { new: true, runValidators: true });
        await recordAudit({ actorUserId: req.user.id, action: 'WATER_SOURCE_UPDATED', resourceType: 'WaterSource', resourceId: source.id, organizationId: existing.organizationId, metadata: { fields: Object.keys(values) }, ipAddress: req.ip });
        res.json({ success: true, source });
    } catch (error) { if (error.code === 11000) error.statusCode = 409; next(error); }
});

router.delete('/:sourceId', requireRoles(...managers), async (req, res, next) => {
    try {
        const source = await WaterSource.findOneAndUpdate({ _id: req.params.sourceId, ...scope(req.user, req.body?.organizationId || req.query.organizationId) }, { status: 'deactivated' }, { new: true });
        if (!source) return res.status(404).json({ success: false, message: 'Water source not found.' });
        await recordAudit({ actorUserId: req.user.id, action: 'WATER_SOURCE_DEACTIVATED', resourceType: 'WaterSource', resourceId: source.id, organizationId: source.organizationId, ipAddress: req.ip });
        res.json({ success: true, source });
    } catch (error) { next(error); }
});
export { router as sourceRoutes };
