import express from 'express';
import { authenticate, hasTenantAccess, requireRoles } from '../middleware/auth.js';
import { Tank } from '../models/Tank.js';
import { User } from '../models/User.js';
import { assertEntitlement } from '../services/entitlementService.js';
import { recordAudit } from '../services/auditService.js';
import { assertTankInput, canManageTanks, serializeTank, tankFields, tankOrganizationFilter } from '../services/tankService.js';

const router = express.Router();
router.use(authenticate);

function getOrganizationId(req) {
    return req.user.role === 'SUPER_ADMIN' ? req.body.organizationId || req.query.organizationId : req.user.organizationId;
}

router.get('/operators', requireRoles('SUPER_ADMIN', 'ORGANIZATION_ADMIN', 'SUB_ADMIN'), async (req, res, next) => {
    try {
        const filter = tankOrganizationFilter(req.user, req.query.organizationId);
        const operators = await User.find({ ...filter, role: 'OPERATOR', status: 'active' }, 'firstname lastname email organizationId').sort({ firstname: 1, lastname: 1 }).lean();
        res.json({ success: true, operators });
    } catch (error) { next(error); }
});

router.get('/', requireRoles('SUPER_ADMIN', 'ORGANIZATION_ADMIN', 'SUB_ADMIN', 'OPERATOR'), async (req, res, next) => {
    try {
        const page = Math.max(Number.parseInt(req.query.page || '1', 10), 1);
        const limit = Math.min(Math.max(Number.parseInt(req.query.limit || '10', 10), 1), 100);
        const filter = { ...tankOrganizationFilter(req.user, req.query.organizationId) };
        if (req.user.role === 'OPERATOR') filter.$or = [{ assignedOperatorId: req.user.id }, { assignedUserIds: req.user.id }];
        if (req.query.status && ['active', 'suspended', 'deactivated'].includes(req.query.status)) filter.status = req.query.status;
        if (req.query.tankType) filter.tankType = req.query.tankType;
        if (req.query.search?.trim()) filter.$or = [{ name: { $regex: req.query.search.trim(), $options: 'i' } }, { code: { $regex: req.query.search.trim(), $options: 'i' } }, { location: { $regex: req.query.search.trim(), $options: 'i' } }];
        const [tanks, total] = await Promise.all([Tank.find(filter).populate('assignedOperatorId', 'firstname lastname email').sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean({ virtuals: true }), Tank.countDocuments(filter)]);
        res.json({ success: true, tanks: tanks.map(serializeTank), pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
    } catch (error) { next(error); }
});

router.post('/', requireRoles('SUPER_ADMIN', 'ORGANIZATION_ADMIN', 'SUB_ADMIN'), async (req, res, next) => {
    try {
        if (!canManageTanks(req.user)) return res.status(403).json({ success: false, message: 'Tank management permission is required.' });
        const organizationId = getOrganizationId(req);
        if (!organizationId || !hasTenantAccess(req.user, organizationId)) return res.status(403).json({ success: false, message: 'Organization access denied.' });
        await assertEntitlement(organizationId, 'tanks');
        const values = await assertTankInput(req.body, { organizationId });
        const tank = await Tank.create({ ...values, organizationId, maximumWaterLevel: values.maximumWaterLevel ?? values.capacity });
        await recordAudit({ actorUserId: req.user.id, action: 'TANK_CREATED', resourceType: 'Tank', resourceId: tank.id, organizationId, metadata: { code: tank.code }, ipAddress: req.ip });
        res.status(201).json({ success: true, tank: serializeTank(tank) });
    } catch (error) { if (error.code === 11000) error.statusCode = 409; next(error); }
});

router.get('/:tankId', requireRoles('SUPER_ADMIN', 'ORGANIZATION_ADMIN', 'SUB_ADMIN', 'OPERATOR'), async (req, res, next) => {
    try {
        const tank = await Tank.findOne({ _id: req.params.tankId, ...tankOrganizationFilter(req.user, req.query.organizationId), ...(req.user.role === 'OPERATOR' ? { $or: [{ assignedOperatorId: req.user.id }, { assignedUserIds: req.user.id }] } : {}) }).populate('assignedOperatorId', 'firstname lastname email').lean({ virtuals: true });
        if (!tank) return res.status(404).json({ success: false, message: 'Tank not found.' });
        res.json({ success: true, tank: serializeTank(tank) });
    } catch (error) { next(error); }
});

router.patch('/:tankId', requireRoles('SUPER_ADMIN', 'ORGANIZATION_ADMIN', 'SUB_ADMIN'), async (req, res, next) => {
    try {
        if (!canManageTanks(req.user)) return res.status(403).json({ success: false, message: 'Tank management permission is required.' });
        const existing = await Tank.findOne({ _id: req.params.tankId, ...tankOrganizationFilter(req.user, req.body.organizationId) });
        if (!existing) return res.status(404).json({ success: false, message: 'Tank not found.' });
        const values = await assertTankInput(req.body, { organizationId: existing.organizationId.toString(), tankId: existing.id });
        const tank = await Tank.findByIdAndUpdate(existing.id, { $set: values }, { new: true, runValidators: true }).populate('assignedOperatorId', 'firstname lastname email');
        await recordAudit({ actorUserId: req.user.id, action: 'TANK_UPDATED', resourceType: 'Tank', resourceId: tank.id, organizationId: existing.organizationId, metadata: { fields: Object.keys(values) }, ipAddress: req.ip });
        res.json({ success: true, tank: serializeTank(tank) });
    } catch (error) { if (error.code === 11000) error.statusCode = 409; next(error); }
});

router.delete('/:tankId', requireRoles('SUPER_ADMIN', 'ORGANIZATION_ADMIN', 'SUB_ADMIN'), async (req, res, next) => {
    try {
        if (!canManageTanks(req.user)) return res.status(403).json({ success: false, message: 'Tank management permission is required.' });
        const tank = await Tank.findOneAndUpdate({ _id: req.params.tankId, ...tankOrganizationFilter(req.user, req.body.organizationId) }, { status: 'deactivated' }, { new: true });
        if (!tank) return res.status(404).json({ success: false, message: 'Tank not found.' });
        await recordAudit({ actorUserId: req.user.id, action: 'TANK_DEACTIVATED', resourceType: 'Tank', resourceId: tank.id, organizationId: tank.organizationId, ipAddress: req.ip });
        res.json({ success: true, tank: serializeTank(tank) });
    } catch (error) { next(error); }
});

export { router as tankRoutes };
