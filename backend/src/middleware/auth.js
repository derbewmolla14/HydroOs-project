import { User } from '../models/User.js';
import { verifyAccessToken } from '../services/authService.js';

export async function authenticate(req, res, next) {
    try {
        const header = req.get('authorization');
        const token = req.cookies?.hydroos_access || (header?.startsWith('Bearer ') ? header.slice(7) : null);
        if (!token) return res.status(401).json({ success: false, message: 'Authentication required.' });
        const claims = verifyAccessToken(token);
        const user = await User.findById(claims.sub).select('+passwordHash').lean();
        if (!user || user.status !== 'active') return res.status(401).json({ success: false, message: 'Account is unavailable.' });
        req.user = { ...user, id: user._id.toString(), organizationId: user.organizationId?.toString() || null };
        req.auth = claims;
        next();
    } catch (error) {
        res.status(401).json({ success: false, message: 'Invalid or expired authentication.' });
    }
}

export function requireRoles(...roles) {
    return (req, res, next) => {
        if (!req.user || !roles.includes(req.user.role)) return res.status(403).json({ success: false, message: 'Insufficient permissions.' });
        next();
    };
}

export function requireOrganization(req, res, next) {
    if (!req.user?.organizationId && req.user?.role !== 'SUPER_ADMIN') {
        return res.status(403).json({ success: false, message: 'Organization context required.' });
    }
    next();
}

export function hasTenantAccess(user, organizationId) {
    return user?.role === 'SUPER_ADMIN' || user?.organizationId === organizationId;
}

/**
 * Subscription gate for standard operator accounts. Platform administrators retain
 * administrative access; operator accounts must have a paid, current subscription
 * and the requested service explicitly enabled.
 */
export function requireServiceAccess(serviceType) {
    return (req, res, next) => {
        if (!req.user || req.user.role !== 'OPERATOR') return next();
        const user = req.user;
        const validSubscription = user.subscriptionStatus === 'active'
            && user.monthlyFeePaid === true
            && user.subscriptionExpiresAt && new Date(user.subscriptionExpiresAt) > new Date();
        if (!validSubscription) {
            return res.status(403).json({ success: false, code: 'SUBSCRIPTION_REQUIRED', message: 'An active, paid monthly subscription is required to use this service.' });
        }
        const allowedServices = user.allowedServices || [];
        const allowed = allowedServices.includes(serviceType);
        if (!allowed) {
            return res.status(403).json({ success: false, code: 'SERVICE_NOT_ALLOWED', message: 'This service is not included in your subscription. Contact your HydroOS administrator.' });
        }
        next();
    };
}

export function requireAnyServiceSubscription(req, res, next) {
    if (!req.user || req.user.role !== 'OPERATOR') return next();
    const user = req.user;
    const current = user.subscriptionStatus === 'active'
        && user.monthlyFeePaid === true
        && (!user.subscriptionExpiresAt || new Date(user.subscriptionExpiresAt) > new Date());
    const hasServices = (user.allowedServices || []).length > 0;
    if (!current || !hasServices) {
        return res.status(403).json({ success: false, code: 'SUBSCRIPTION_REQUIRED', message: 'An active, paid subscription with at least one enabled service is required.' });
    }
    next();
}
