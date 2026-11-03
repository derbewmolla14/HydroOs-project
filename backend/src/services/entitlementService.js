import { Organization } from '../models/Organization.js';
import { User } from '../models/User.js';

export async function assertEntitlement(organizationId, resource, amount = 1) {
    const organization = await Organization.findById(organizationId).lean();
    if (!organization || organization.status !== 'active') {
        const error = new Error('Organization is unavailable.');
        error.statusCode = 403;
        throw error;
    }

    const subscription = organization.subscription || {};
    if (resource === 'users') {
        const count = await User.countDocuments({ organizationId, status: { $ne: 'deactivated' } });
        if (count + amount > subscription.userLimit) throw capacityError('user');
    }
    if (resource === 'subAdmins') {
        const count = await User.countDocuments({ organizationId, role: 'SUB_ADMIN', status: { $ne: 'deactivated' } });
        if (count + amount > subscription.subAdminLimit) throw capacityError('Sub-Admin');
    }
    if (resource === 'tanks') {
        const { Tank } = await import('../models/Tank.js');
        const count = await Tank.countDocuments({ organizationId, status: { $ne: 'deactivated' } });
        if (count + amount > subscription.tankLimit) throw capacityError('tank');
    }
    if (resource === 'devices') {
        const { Device } = await import('../models/Device.js');
        const count = await Device.countDocuments({ organizationId, status: { $ne: 'deactivated' } });
        if (subscription.deviceLimit !== undefined && count + amount > subscription.deviceLimit) throw capacityError('device');
    }
    return organization;
}

function capacityError(resource) {
    const error = new Error(`Organization ${resource} capacity has been reached.`);
    error.statusCode = 409;
    return error;
}
