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
