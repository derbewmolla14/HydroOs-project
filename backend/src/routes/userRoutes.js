import crypto from 'node:crypto';
import express from 'express';
import mongoose from 'mongoose';
import { User } from '../models/User.js';
import { Tank } from '../models/Tank.js';
import { authenticate, hasTenantAccess, requireRoles } from '../middleware/auth.js';
import { hashToken } from '../services/authService.js';
import { assertEntitlement } from '../services/entitlementService.js';
import { recordAudit } from '../services/auditService.js';

const router = express.Router();
router.use(authenticate, requireRoles('SUPER_ADMIN', 'ORGANIZATION_ADMIN', 'SUB_ADMIN'));

const managedRoles = ['ORGANIZATION_ADMIN', 'SUB_ADMIN', 'OPERATOR'];
const publicFields = 'firstname lastname username email phone organizationId role permissions status lastLoginAt lastActivityAt createdAt';

function organizationFilter(req) {
    if (req.user.role === 'SUPER_ADMIN') return req.query.organizationId ? { organizationId: req.query.organizationId } : {};
    return { organizationId: req.user.organizationId };
}

function canManageUsers(user) {
    return user.role !== 'SUB_ADMIN' || (user.permissions || []).some((permission) => ['users:manage', 'manage_users', 'users'].includes(permission));
}

function publicUser(user, tanks = []) {
    return {
        id: user._id?.toString() || user.id,
        firstname: user.firstname,
        lastname: user.lastname,
        username: user.username,
        email: user.email,
        phone: user.phone,
        organizationId: user.organizationId?.toString() || null,
        role: user.role,
        permissions: user.permissions || [],
        status: user.status,
        lastLoginAt: user.lastLoginAt,
        lastActivityAt: user.lastActivityAt,
        createdAt: user.createdAt,
        assignedTanks: tanks
    };
}

router.get('/', async (req, res, next) => {
    try {
        const filter = organizationFilter(req);
        const search = req.query.search?.trim();
        if (search) {
            const terms = [{ firstname: { $regex: search, $options: 'i' } }, { lastname: { $regex: search, $options: 'i' } }, { username: { $regex: search, $options: 'i' } }, { email: { $regex: search, $options: 'i' } }];
            if (mongoose.isValidObjectId(search)) terms.push({ _id: search });
            filter.$or = terms;
        }
        const users = await User.find({ ...filter, role: { $ne: 'SUPER_ADMIN' } }, publicFields).sort({ createdAt: -1 }).lean();
        const tanks = await Tank.find({ ...filter }, 'name code organizationId assignedUserIds assignedOperatorId').lean();
        const response = users.map((user) => publicUser(user, tanks.filter((tank) => tank.assignedUserIds?.some((id) => id.toString() === user._id.toString()) || tank.assignedOperatorId?.toString() === user._id.toString()).map((tank) => ({ _id: tank._id, name: tank.name, code: tank.code }))));
        res.json({ success: true, users: response });
    } catch (error) { next(error); }
});

router.post('/', async (req, res, next) => {
    try {
        if (!canManageUsers(req.user)) return res.status(403).json({ success: false, message: 'User management permission is required.' });
        const organizationId = req.user.role === 'SUPER_ADMIN' ? req.body.organizationId : req.user.organizationId;
        if (!organizationId || !hasTenantAccess(req.user, organizationId) || !mongoose.isValidObjectId(organizationId)) return res.status(403).json({ success: false, message: 'Organization access denied.' });
        const role = req.body.role || 'OPERATOR';
        if (!managedRoles.includes(role) || (req.user.role !== 'SUPER_ADMIN' && role === 'ORGANIZATION_ADMIN')) return res.status(400).json({ success: false, message: 'Invalid role for this account.' });
        if (!req.body.email || !req.body.firstname) return res.status(400).json({ success: false, message: 'Email and first name are required.' });
        await assertEntitlement(organizationId, 'users');
        const rawToken = crypto.randomBytes(32).toString('hex');
        const user = await User.create({ email: req.body.email.toLowerCase(), firstname: req.body.firstname, lastname: req.body.lastname, username: req.body.username, phone: req.body.phone, organizationId, role, status: 'invited', invitationTokenHash: hashToken(rawToken), invitationExpiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000) });
        await recordAudit({ actorUserId: req.user.id, action: 'USER_INVITED', resourceType: 'User', resourceId: user.id, organizationId, metadata: { role }, ipAddress: req.ip });
        res.status(201).json({ success: true, user: publicUser(user.toObject()), invitation: { email: user.email, expiresAt: user.invitationExpiresAt, ...(process.env.NODE_ENV !== 'production' ? { token: rawToken } : {}) } });
    } catch (error) { if (error.code === 11000) error.statusCode = 409; next(error); }
});

router.patch('/:userId', async (req, res, next) => {
    try {
        if (!canManageUsers(req.user) || req.user.id === req.params.userId) return res.status(403).json({ success: false, message: 'User update is not permitted.' });
        const user = await User.findOne({ _id: req.params.userId, ...organizationFilter(req) });
        if (!user || user.role === 'SUPER_ADMIN') return res.status(404).json({ success: false, message: 'User not found.' });
        const changes = {};
        for (const field of ['firstname', 'lastname', 'username', 'phone', 'status', 'permissions']) if (req.body[field] !== undefined) changes[field] = req.body[field];
        if (req.body.role !== undefined) {
            if (!managedRoles.includes(req.body.role) || (req.user.role !== 'SUPER_ADMIN' && req.body.role === 'ORGANIZATION_ADMIN')) return res.status(400).json({ success: false, message: 'Invalid role.' });
            changes.role = req.body.role;
        }
        Object.assign(user, changes);
        await user.save();
        await recordAudit({ actorUserId: req.user.id, action: 'USER_UPDATED', resourceType: 'User', resourceId: user.id, organizationId: user.organizationId, metadata: { fields: Object.keys(changes) }, ipAddress: req.ip });
        res.json({ success: true, user: publicUser(user.toObject()) });
    } catch (error) { next(error); }
});

router.patch('/:userId/assignments', async (req, res, next) => {
    try {
        if (!canManageUsers(req.user)) return res.status(403).json({ success: false, message: 'User management permission is required.' });
        const user = await User.findOne({ _id: req.params.userId, ...organizationFilter(req), role: { $ne: 'SUPER_ADMIN' } }).lean();
        if (!user) return res.status(404).json({ success: false, message: 'User not found.' });
        const tankIds = [...new Set((Array.isArray(req.body.tankIds) ? req.body.tankIds : []).map(String))];
        if (tankIds.some((id) => !mongoose.isValidObjectId(id))) return res.status(400).json({ success: false, message: 'Tank identifiers are invalid.' });
        const tanks = await Tank.find({ _id: { $in: tankIds }, organizationId: user.organizationId, status: { $ne: 'deactivated' } }, '_id assignedUserIds assignedOperatorId').lean();
        if (tanks.length !== tankIds.length) return res.status(400).json({ success: false, message: 'All assigned tanks must belong to the user organization.' });
        await Tank.updateMany({ organizationId: user.organizationId, $or: [{ assignedUserIds: user._id }, { assignedOperatorId: user._id }] }, { $pull: { assignedUserIds: user._id }, $unset: { assignedOperatorId: user.role === 'OPERATOR' ? 1 : 0 } });
        await Tank.updateMany({ _id: { $in: tankIds }, organizationId: user.organizationId }, { $addToSet: { assignedUserIds: user._id }, ...(user.role === 'OPERATOR' ? { $set: { assignedOperatorId: user._id } } : {}) });
        await recordAudit({ actorUserId: req.user.id, action: 'TANK_ASSIGNMENTS_UPDATED', resourceType: 'User', resourceId: user._id, organizationId: user.organizationId, metadata: { tankIds }, ipAddress: req.ip });
        res.json({ success: true, tankIds });
    } catch (error) { next(error); }
});

export { router as userRoutes };
