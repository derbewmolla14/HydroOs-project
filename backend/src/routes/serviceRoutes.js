import crypto from 'node:crypto';
import express from 'express';
import mongoose from 'mongoose';
import { authenticate, requireRoles } from '../middleware/auth.js';
import { ServiceDevice, SERVICE_TYPES } from '../models/ServiceDevice.js';
import { User } from '../models/User.js';
import { hashPassword, verifyPassword } from '../services/authService.js';
import { recordAudit } from '../services/auditService.js';

const router = express.Router();
router.use(authenticate);

const manager = requireRoles('SUPER_ADMIN');
const publicService = (item) => ({
    id: item._id.toString(),
    serviceId: item.serviceId,
    serviceType: item.serviceType,
    assignedToUser: item.assignedToUser?.toString() || null,
    isActive: item.isActive,
    linkedAt: item.linkedAt,
    createdAt: item.createdAt
});

function subscriptionIsCurrent(user) {
    return user.subscriptionStatus === 'active'
        && user.monthlyFeePaid === true
        && (!user.subscriptionExpiresAt || new Date(user.subscriptionExpiresAt) > new Date());
}

function createPassword() {
    return crypto.randomBytes(18).toString('base64url');
}

router.get('/me', async (req, res, next) => {
    try {
        const [user, services] = await Promise.all([
            User.findById(req.user.id).select('subscriptionStatus subscriptionPlan monthlyFeePaid monthlyFeePaidAt subscriptionExpiresAt allowedServices').lean(),
            ServiceDevice.find({ assignedToUser: req.user.id, isActive: true }).select('serviceId serviceType isActive linkedAt').lean()
        ]);
        res.json({ success: true, subscription: user, services });
    } catch (error) { next(error); }
});

router.post('/link', async (req, res, next) => {
    try {
        const serviceId = String(req.body.serviceId || '').trim().toUpperCase();
        const servicePassword = String(req.body.servicePassword || '');
        if (!serviceId || !servicePassword) return res.status(400).json({ success: false, message: 'Service ID and Service Password are required.' });

        const user = await User.findById(req.user.id);
        if (!user) return res.status(401).json({ success: false, message: 'User account not found.' });
        if (!subscriptionIsCurrent(user)) {
            return res.status(403).json({ success: false, code: 'SUBSCRIPTION_INACTIVE', message: 'Your monthly subscription is inactive, unpaid, or expired. Contact the administrator.' });
        }

        const service = await ServiceDevice.findOne({ serviceId }).select('+servicePasswordHash');
        if (!service || !service.isActive || !(await verifyPassword(servicePassword, service.servicePasswordHash))) {
            return res.status(400).json({ success: false, message: 'Invalid Service ID or Service Password.' });
        }
        if (service.assignedToUser && service.assignedToUser.toString() !== user.id) {
            return res.status(409).json({ success: false, message: 'This service is already linked to another user. Contact the administrator.' });
        }

        const currentAllowed = user.allowedServices || [];
        const alreadyAllowed = currentAllowed.includes(service.serviceType);
        if (user.subscriptionPlan !== 'all' && currentAllowed.length > 0 && !alreadyAllowed) {
            return res.status(403).json({ success: false, code: 'INDIVIDUAL_PLAN_LIMIT', message: 'Your Individual plan allows one service only. Upgrade to the All Services plan to link more.' });
        }

        service.assignedToUser = user._id;
        service.linkedAt = service.linkedAt || new Date();
        service.lastLinkedAt = new Date();
        await service.save();
        if (!alreadyAllowed) user.allowedServices = [...currentAllowed, service.serviceType];
        await user.save();

        await recordAudit({ actorUserId: user.id, action: 'SERVICE_LINKED', resourceType: 'ServiceDevice', resourceId: service.id, metadata: { serviceId: service.serviceId, serviceType: service.serviceType }, ipAddress: req.ip });
        res.status(200).json({ success: true, message: 'Service linked successfully.', service: publicService(service), allowedServices: user.allowedServices });
    } catch (error) { next(error); }
});

router.get('/admin/devices', manager, async (req, res, next) => {
    try {
        const services = await ServiceDevice.find().populate('assignedToUser', 'firstName lastName firstname lastname email').sort({ createdAt: -1 }).lean();
        res.json({ success: true, services: services.map((item) => ({ ...publicService(item), assignedToUser: item.assignedToUser ? { id: item.assignedToUser._id.toString(), email: item.assignedToUser.email, name: [item.assignedToUser.firstName || item.assignedToUser.firstname, item.assignedToUser.lastName || item.assignedToUser.lastname].filter(Boolean).join(' ') } : null })) });
    } catch (error) { next(error); }
});

router.post('/admin/devices', manager, async (req, res, next) => {
    try {
        const serviceId = String(req.body.serviceId || '').trim().toUpperCase();
        const serviceType = String(req.body.serviceType || '');
        if (!/^[A-Z0-9][A-Z0-9_-]{2,39}$/.test(serviceId)) return res.status(400).json({ success: false, message: 'Service ID must be 3–40 characters using letters, numbers, hyphens or underscores.' });
        if (!SERVICE_TYPES.includes(serviceType)) return res.status(400).json({ success: false, message: 'Select a valid service type.' });
        const password = typeof req.body.servicePassword === 'string' && req.body.servicePassword.length >= 12 ? req.body.servicePassword : createPassword();
        let assignedUser = null;
        if (req.body.assignedToUser) {
            if (!mongoose.isValidObjectId(req.body.assignedToUser)) return res.status(400).json({ success: false, message: 'Invalid assigned user.' });
            assignedUser = await User.findById(req.body.assignedToUser);
            if (!assignedUser) return res.status(404).json({ success: false, message: 'Assigned user not found.' });
            if (assignedUser.subscriptionPlan !== 'all' && assignedUser.allowedServices?.length && !assignedUser.allowedServices.includes(serviceType)) {
                return res.status(409).json({ success: false, message: 'The user already has a different service on the Individual plan.' });
            }
        }
        const service = await ServiceDevice.create({
            serviceId, serviceType, servicePasswordHash: await hashPassword(password),
            assignedToUser: assignedUser?._id || null, createdBy: req.user.id,
            linkedAt: assignedUser ? new Date() : null
        });
        if (assignedUser && !assignedUser.allowedServices.includes(serviceType)) {
            assignedUser.allowedServices.push(serviceType);
            await assignedUser.save();
        }
        await recordAudit({ actorUserId: req.user.id, action: 'SERVICE_DEVICE_CREATED', resourceType: 'ServiceDevice', resourceId: service.id, metadata: { serviceId, serviceType, assignedToUser: assignedUser?.id || null }, ipAddress: req.ip });
        res.status(201).json({ success: true, service: publicService(service), credentials: { serviceId, servicePassword: password }, message: 'Copy the service password now. It is not stored or displayed in plain text again.' });
    } catch (error) {
        if (error.code === 11000) return res.status(409).json({ success: false, message: 'That Service ID already exists.' });
        next(error);
    }
});

router.patch('/admin/devices/:id', manager, async (req, res, next) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ success: false, message: 'Invalid service record.' });
        const service = await ServiceDevice.findById(req.params.id);
        if (!service) return res.status(404).json({ success: false, message: 'Service record not found.' });
        if (typeof req.body.isActive === 'boolean') {
            if (req.body.isActive && service.assignedToUser) {
                const assignedUser = await User.findById(service.assignedToUser);
                if (assignedUser?.subscriptionPlan !== 'all' && (assignedUser?.allowedServices || []).some((item) => item !== service.serviceType)) {
                    return res.status(409).json({ success: false, message: 'This user already has another service on the Individual plan.' });
                }
            }
            service.isActive = req.body.isActive;
            if (service.assignedToUser) {
                if (service.isActive) await User.updateOne({ _id: service.assignedToUser }, { $addToSet: { allowedServices: service.serviceType } });
                else {
                    const otherActive = await ServiceDevice.exists({ _id: { $ne: service._id }, assignedToUser: service.assignedToUser, serviceType: service.serviceType, isActive: true });
                    if (!otherActive) await User.updateOne({ _id: service.assignedToUser }, { $pull: { allowedServices: service.serviceType } });
                }
            }
        }
        if (Object.prototype.hasOwnProperty.call(req.body, 'assignedToUser')) {
            const oldUserId = service.assignedToUser?.toString();
            const nextUser = req.body.assignedToUser ? await User.findById(req.body.assignedToUser) : null;
            if (req.body.assignedToUser && !nextUser) return res.status(404).json({ success: false, message: 'Assigned user not found.' });
            if (nextUser && nextUser.subscriptionPlan !== 'all' && nextUser.allowedServices?.length && !nextUser.allowedServices.includes(service.serviceType)) {
                return res.status(409).json({ success: false, message: 'The user already has a different service on the Individual plan.' });
            }
            service.assignedToUser = nextUser?._id || null;
            service.linkedAt = nextUser ? new Date() : null;
            await service.save();
            if (oldUserId && oldUserId !== nextUser?.id) {
                const remaining = await ServiceDevice.exists({ assignedToUser: oldUserId, serviceType: service.serviceType, isActive: true });
                if (!remaining) await User.updateOne({ _id: oldUserId }, { $pull: { allowedServices: service.serviceType } });
            }
            if (nextUser) await User.updateOne({ _id: nextUser._id }, { $addToSet: { allowedServices: service.serviceType } });
        } else {
            await service.save();
        }
        await recordAudit({ actorUserId: req.user.id, action: 'SERVICE_DEVICE_UPDATED', resourceType: 'ServiceDevice', resourceId: service.id, metadata: { isActive: service.isActive }, ipAddress: req.ip });
        res.json({ success: true, service: publicService(service) });
    } catch (error) { next(error); }
});


router.get('/admin/users', manager, async (req, res, next) => {
    try {
        const users = await User.find({}, 'firstName lastName firstname lastname email role status subscriptionStatus subscriptionPlan monthlyFeePaid monthlyFeePaidAt subscriptionExpiresAt allowedServices').sort({ createdAt: -1 }).lean();
        res.json({ success: true, users: users.map((user) => ({
            id: user._id.toString(), email: user.email,
            name: [user.firstName || user.firstname, user.lastName || user.lastname].filter(Boolean).join(' '),
            role: user.role, status: user.status,
            subscriptionStatus: user.subscriptionStatus || 'inactive',
            subscriptionPlan: user.subscriptionPlan || 'individual',
            monthlyFeePaid: user.monthlyFeePaid === true,
            monthlyFeePaidAt: user.monthlyFeePaidAt || null,
            subscriptionExpiresAt: user.subscriptionExpiresAt || null,
            allowedServices: user.allowedServices || []
        })) });
    } catch (error) { next(error); }
});

router.post('/admin/devices/:id/rotate-password', manager, async (req, res, next) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ success: false, message: 'Invalid service record.' });
        const service = await ServiceDevice.findById(req.params.id);
        if (!service) return res.status(404).json({ success: false, message: 'Service record not found.' });
        const servicePassword = createPassword();
        service.servicePasswordHash = await hashPassword(servicePassword);
        await service.save();
        await recordAudit({ actorUserId: req.user.id, action: 'SERVICE_PASSWORD_ROTATED', resourceType: 'ServiceDevice', resourceId: service.id, metadata: { serviceId: service.serviceId }, ipAddress: req.ip });
        res.json({ success: true, credentials: { serviceId: service.serviceId, servicePassword }, message: 'Copy the new password now. The previous password is no longer valid.' });
    } catch (error) { next(error); }
});

router.patch('/admin/users/:userId/subscription', manager, async (req, res, next) => {
    try {
        if (!mongoose.isValidObjectId(req.params.userId)) return res.status(400).json({ success: false, message: 'Invalid user ID.' });
        const user = await User.findById(req.params.userId);
        if (!user) return res.status(404).json({ success: false, message: 'User not found.' });
        const { subscriptionStatus, subscriptionPlan, monthlyFeePaid, subscriptionExpiresAt, allowedServices } = req.body;
        if (subscriptionStatus !== undefined && !['active', 'inactive', 'expired'].includes(subscriptionStatus)) return res.status(400).json({ success: false, message: 'Invalid subscription status.' });
        if (subscriptionPlan !== undefined && !['individual', 'all'].includes(subscriptionPlan)) return res.status(400).json({ success: false, message: 'Invalid subscription plan.' });
        if (monthlyFeePaid !== undefined && typeof monthlyFeePaid !== 'boolean') return res.status(400).json({ success: false, message: 'monthlyFeePaid must be true or false.' });
        if (allowedServices !== undefined && (!Array.isArray(allowedServices) || allowedServices.some((item) => !SERVICE_TYPES.includes(item)))) return res.status(400).json({ success: false, message: 'Invalid allowed services list.' });
        if (subscriptionPlan === 'individual' && (allowedServices || user.allowedServices).length > 1) return res.status(409).json({ success: false, message: 'The Individual plan can include only one service.' });
        if (subscriptionStatus !== undefined) user.subscriptionStatus = subscriptionStatus;
        if (subscriptionPlan !== undefined) user.subscriptionPlan = subscriptionPlan;
        if (monthlyFeePaid !== undefined) {
            user.monthlyFeePaid = monthlyFeePaid;
            user.monthlyFeePaidAt = monthlyFeePaid ? new Date() : null;
        }
        if (subscriptionExpiresAt !== undefined) {
            const expiry = subscriptionExpiresAt ? new Date(subscriptionExpiresAt) : null;
            if (expiry && Number.isNaN(expiry.getTime())) return res.status(400).json({ success: false, message: 'Invalid subscription expiry date.' });
            user.subscriptionExpiresAt = expiry;
        }
        if (allowedServices !== undefined) {
            const nextAllowed = [...new Set(allowedServices)];
            const revoked = (user.allowedServices || []).filter((serviceType) => !nextAllowed.includes(serviceType));
            if (revoked.length) {
                await ServiceDevice.updateMany(
                    { assignedToUser: user._id, serviceType: { $in: revoked } },
                    { $set: { assignedToUser: null, isActive: false, linkedAt: null } }
                );
            }
            user.allowedServices = nextAllowed;
        }
        if (user.subscriptionPlan === 'all') user.allowedServices = [...SERVICE_TYPES];
        await user.save();
        await recordAudit({ actorUserId: req.user.id, action: 'USER_SUBSCRIPTION_UPDATED', resourceType: 'User', resourceId: user.id, metadata: { subscriptionStatus: user.subscriptionStatus, subscriptionPlan: user.subscriptionPlan, monthlyFeePaid: user.monthlyFeePaid, allowedServices: user.allowedServices }, ipAddress: req.ip });
        res.json({ success: true, user: { id: user.id, email: user.email, subscriptionStatus: user.subscriptionStatus, subscriptionPlan: user.subscriptionPlan, monthlyFeePaid: user.monthlyFeePaid, monthlyFeePaidAt: user.monthlyFeePaidAt, subscriptionExpiresAt: user.subscriptionExpiresAt, allowedServices: user.allowedServices } });
    } catch (error) { next(error); }
});

export { router as serviceRoutes };
