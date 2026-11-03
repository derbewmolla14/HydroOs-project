import crypto from 'node:crypto';
import express from 'express';
import { Organization } from '../models/Organization.js';
import { User } from '../models/User.js';
import { AuditLog } from '../models/AuditLog.js';
import { authenticate, hasTenantAccess, requireOrganization, requireRoles } from '../middleware/auth.js';
import { hashPassword, hashToken } from '../services/authService.js';
import { assertEntitlement } from '../services/entitlementService.js';
import { recordAudit } from '../services/auditService.js';
import { Tank } from '../models/Tank.js';

const router = express.Router();
router.use((req, res, next) => req.path === '/invitations/accept' ? next() : authenticate(req, res, next));

router.post('/', requireRoles('SUPER_ADMIN'), async (req, res, next) => {
    try {
        const organization = await Organization.create(req.body);
        await recordAudit({ actorUserId: req.user.id, action: 'ORGANIZATION_CREATED', resourceType: 'Organization', resourceId: organization.id, metadata: { code: organization.code }, ipAddress: req.ip });
        res.status(201).json({ success: true, organization });
    } catch (error) {
        next(error);
    }
});

router.patch('/:organizationId/entitlements', requireRoles('SUPER_ADMIN'), async (req, res, next) => {
    try {
        const allowed = ['userLimit', 'tankLimit', 'subAdminLimit', 'modules'];
        const changes = Object.fromEntries(Object.entries(req.body).filter(([key]) => allowed.includes(key)));
        const organization = await Organization.findByIdAndUpdate(req.params.organizationId, { $set: Object.fromEntries(Object.entries(changes).map(([key, value]) => [`subscription.${key}`, value])) }, { new: true, runValidators: true });
        if (!organization) return res.status(404).json({ success: false, message: 'Organization not found.' });
        await recordAudit({ actorUserId: req.user.id, action: 'CAPACITY_CHANGED', resourceType: 'Organization', resourceId: organization.id, organizationId: organization.id, metadata: changes, ipAddress: req.ip });
        res.json({ success: true, organization });
    } catch (error) {
        next(error);
    }
});

router.post('/:organizationId/admin', requireRoles('SUPER_ADMIN'), async (req, res, next) => {
    try {
        await assertEntitlement(req.params.organizationId, 'users');
        const { email, firstname, lastname, password } = req.body;
        const user = await User.create({ email: email.toLowerCase(), firstname, lastname, passwordHash: await hashPassword(password), organizationId: req.params.organizationId, role: 'ORGANIZATION_ADMIN', status: 'active' });
        await recordAudit({ actorUserId: req.user.id, action: 'ORGANIZATION_ADMIN_CREATED', resourceType: 'User', resourceId: user.id, organizationId: req.params.organizationId, ipAddress: req.ip });
        res.status(201).json({ success: true, user: { id: user.id, email: user.email, role: user.role } });
    } catch (error) {
        next(error);
    }
});

router.post('/:organizationId/invitations', requireOrganization, requireRoles('SUPER_ADMIN', 'ORGANIZATION_ADMIN'), async (req, res, next) => {
    try {
        if (!hasTenantAccess(req.user, req.params.organizationId)) return res.status(403).json({ success: false, message: 'Cross-tenant access denied.' });
        const role = req.body.role;
        if (!['SUB_ADMIN', 'OPERATOR'].includes(role)) return res.status(400).json({ success: false, message: 'Only Sub-Admins and Operators can be invited here.' });
        await assertEntitlement(req.params.organizationId, 'users');
        if (role === 'SUB_ADMIN') await assertEntitlement(req.params.organizationId, 'subAdmins');
        const rawToken = crypto.randomBytes(32).toString('hex');
        const user = await User.create({ email: req.body.email.toLowerCase(), firstname: req.body.firstname, lastname: req.body.lastname, organizationId: req.params.organizationId, role, status: 'invited', invitationTokenHash: hashToken(rawToken), invitationExpiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000) });
        await recordAudit({ actorUserId: req.user.id, action: 'USER_INVITED', resourceType: 'User', resourceId: user.id, organizationId: req.params.organizationId, metadata: { role }, ipAddress: req.ip });
        res.status(201).json({ success: true, invitation: { id: user.id, email: user.email, expiresAt: user.invitationExpiresAt, ...(process.env.NODE_ENV !== 'production' ? { token: rawToken } : {}) } });
    } catch (error) {
        next(error);
    }
});

router.post('/:organizationId/tanks', requireOrganization, requireRoles('SUPER_ADMIN', 'ORGANIZATION_ADMIN', 'SUB_ADMIN'), async (req, res, next) => {
    try {
        if (!hasTenantAccess(req.user, req.params.organizationId)) return res.status(403).json({ success: false, message: 'Cross-tenant access denied.' });
        await assertEntitlement(req.params.organizationId, 'tanks');
        const tank = await Tank.create({ ...req.body, organizationId: req.params.organizationId });
        await recordAudit({ actorUserId: req.user.id, action: 'TANK_CREATED', resourceType: 'Tank', resourceId: tank.id, organizationId: req.params.organizationId, ipAddress: req.ip });
        res.status(201).json({ success: true, tank });
    } catch (error) {
        next(error);
    }
});

router.get('/:organizationId/users', requireOrganization, requireRoles('SUPER_ADMIN', 'ORGANIZATION_ADMIN', 'SUB_ADMIN'), async (req, res, next) => {
    try {
        if (!hasTenantAccess(req.user, req.params.organizationId)) return res.status(403).json({ success: false, message: 'Cross-tenant access denied.' });
        const users = await User.find({ organizationId: req.params.organizationId }, '-password -passwordHash -refreshTokenHash -invitationTokenHash').lean();
        res.json({ success: true, users });
    } catch (error) {
        next(error);
    }
});

router.patch('/:organizationId/users/:userId/status', requireOrganization, requireRoles('SUPER_ADMIN', 'ORGANIZATION_ADMIN'), async (req, res, next) => {
    try {
        if (!hasTenantAccess(req.user, req.params.organizationId)) return res.status(403).json({ success: false, message: 'Cross-tenant access denied.' });
        if (req.user.id === req.params.userId) return res.status(400).json({ success: false, message: 'Users cannot change their own status.' });
        const user = await User.findOneAndUpdate({ _id: req.params.userId, organizationId: req.params.organizationId }, { status: req.body.status }, { new: true, runValidators: true });
        if (!user) return res.status(404).json({ success: false, message: 'User not found.' });
        await recordAudit({ actorUserId: req.user.id, action: 'USER_STATUS_CHANGED', resourceType: 'User', resourceId: user.id, organizationId: req.params.organizationId, metadata: { status: user.status }, ipAddress: req.ip });
        res.json({ success: true, user: { id: user.id, status: user.status } });
    } catch (error) {
        next(error);
    }
});

router.patch('/:organizationId/users/:userId/role', requireOrganization, requireRoles('SUPER_ADMIN', 'ORGANIZATION_ADMIN'), async (req, res, next) => {
    try {
        if (!hasTenantAccess(req.user, req.params.organizationId)) return res.status(403).json({ success: false, message: 'Cross-tenant access denied.' });
        if (req.user.id === req.params.userId) return res.status(400).json({ success: false, message: 'Users cannot change their own role.' });
        const allowed = ['SUB_ADMIN', 'OPERATOR'];
        if (!allowed.includes(req.body.role) && req.user.role !== 'SUPER_ADMIN') return res.status(400).json({ success: false, message: 'Invalid organization role.' });
        const user = await User.findOneAndUpdate({ _id: req.params.userId, organizationId: req.params.organizationId }, { role: req.body.role, permissions: Array.isArray(req.body.permissions) ? req.body.permissions : [] }, { new: true, runValidators: true });
        if (!user) return res.status(404).json({ success: false, message: 'User not found.' });
        await recordAudit({ actorUserId: req.user.id, action: 'ROLE_CHANGED', resourceType: 'User', resourceId: user.id, organizationId: req.params.organizationId, metadata: { role: user.role, permissions: user.permissions }, ipAddress: req.ip });
        res.json({ success: true, user: { id: user.id, role: user.role, permissions: user.permissions } });
    } catch (error) {
        next(error);
    }
});

router.post('/invitations/accept', async (req, res, next) => {
    try {
        if (!req.body.password || req.body.password.length < 8) return res.status(400).json({ success: false, message: 'Password must be at least 8 characters.' });
        const user = await User.findOne({ email: req.body.email?.toLowerCase() }).select('+invitationTokenHash');
        if (!user || user.status !== 'invited' || user.invitationTokenHash !== hashToken(req.body.token) || user.invitationExpiresAt < new Date()) return res.status(400).json({ success: false, message: 'Invalid or expired invitation.' });
        user.passwordHash = await hashPassword(req.body.password || '');
        user.status = 'active';
        user.invitationTokenHash = undefined;
        user.invitationExpiresAt = undefined;
        await user.save();
        await recordAudit({ actorUserId: user.id, action: 'INVITATION_ACCEPTED', resourceType: 'User', resourceId: user.id, organizationId: user.organizationId, ipAddress: req.ip });
        res.json({ success: true });
    } catch (error) {
        next(error);
    }
});

router.get('/:organizationId', requireOrganization, requireRoles('SUPER_ADMIN', 'ORGANIZATION_ADMIN', 'SUB_ADMIN'), async (req, res, next) => {
    try {
        if (!hasTenantAccess(req.user, req.params.organizationId)) return res.status(403).json({ success: false, message: 'Cross-tenant access denied.' });
        const organization = await Organization.findById(req.params.organizationId).lean();
        if (!organization) return res.status(404).json({ success: false, message: 'Organization not found.' });
        res.json({ success: true, organization });
    } catch (error) {
        next(error);
    }
});

router.get('/:organizationId/audit-logs', requireOrganization, requireRoles('SUPER_ADMIN', 'ORGANIZATION_ADMIN', 'SUB_ADMIN'), async (req, res, next) => {
    try {
        if (req.user.role !== 'SUPER_ADMIN' && req.user.organizationId !== req.params.organizationId) return res.status(403).json({ success: false, message: 'Cross-tenant access denied.' });
        res.json({ success: true, logs: await AuditLog.find({ organizationId: req.params.organizationId }).sort({ createdAt: -1 }).limit(100).lean() });
    } catch (error) {
        next(error);
    }
});

export { router as organizationRoutes };
