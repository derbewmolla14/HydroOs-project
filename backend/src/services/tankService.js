import mongoose from 'mongoose';
import { Tank } from '../models/Tank.js';
import { User } from '../models/User.js';

export const tankFields = ['name', 'code', 'shape', 'dimensions', 'tankType', 'capacity', 'location', 'latitude', 'longitude', 'installationDate', 'assignedOperatorId', 'assignedUserIds', 'status', 'description', 'currentWaterLevel', 'minimumWaterLevel', 'maximumWaterLevel', 'lastMeasuredAt'];
export const managerRoles = ['SUPER_ADMIN', 'ORGANIZATION_ADMIN', 'SUB_ADMIN'];

export function canManageTanks(user) {
    return managerRoles.includes(user?.role) && (user.role !== 'SUB_ADMIN' || (user.permissions || []).some((permission) => ['tanks:manage', 'manage_tanks', 'tanks'].includes(permission)));
}

export function tankOrganizationFilter(user, organizationId) {
    if (user.role === 'SUPER_ADMIN') return organizationId ? { organizationId } : {};
    return { organizationId: user.organizationId };
}

export function serializeTank(tank) {
    const value = typeof tank.toObject === 'function' ? tank.toObject({ virtuals: true }) : { ...tank };
    const maximum = value.maximumWaterLevel || value.capacity || 0;
    const current = value.currentWaterLevel || 0;
    return { ...value, remainingWaterVolume: current, waterLevelPercentage: maximum ? Math.round((current / maximum) * 10000) / 100 : 0 };
}

export async function assertTankInput(input, { organizationId, tankId } = {}) {
    const values = Object.fromEntries(tankFields.filter((field) => input[field] !== undefined).map((field) => [field, input[field]]));
    if (values.code) values.code = String(values.code).trim().toUpperCase();
    if (values.name !== undefined) values.name = String(values.name).trim();
    if (values.capacity !== undefined) values.capacity = Number(values.capacity);
    if (values.dimensions !== undefined) {
        if (!values.dimensions || typeof values.dimensions !== 'object' || Array.isArray(values.dimensions)) throw Object.assign(new Error('Tank dimensions are invalid.'), { statusCode: 400 });
        values.dimensions = Object.fromEntries(['diameter', 'length', 'width', 'height'].map((field) => [field, values.dimensions[field] === '' || values.dimensions[field] === undefined ? null : Number(values.dimensions[field])]));
        if (Object.values(values.dimensions).some((value) => value !== null && (!Number.isFinite(value) || value <= 0))) throw Object.assign(new Error('Tank dimensions must be positive numbers.'), { statusCode: 400 });
    }
    for (const field of ['latitude', 'longitude', 'currentWaterLevel', 'minimumWaterLevel', 'maximumWaterLevel']) {
        if (values[field] !== undefined && values[field] !== null && values[field] !== '') values[field] = Number(values[field]);
    }
    if (values.name !== undefined && !values.name) throw Object.assign(new Error('Tank name cannot be empty.'), { statusCode: 400 });
    if (values.capacity !== undefined && (!Number.isFinite(values.capacity) || values.capacity <= 0)) throw Object.assign(new Error('Capacity must be a positive number.'), { statusCode: 400 });
    const capacity = values.capacity ?? (tankId ? (await Tank.findById(tankId).select('capacity').lean())?.capacity : undefined);
    const maximum = values.maximumWaterLevel ?? capacity;
    if (maximum !== undefined && values.currentWaterLevel !== undefined && values.currentWaterLevel > maximum) throw Object.assign(new Error('Current water level cannot exceed the maximum water level.'), { statusCode: 400 });
    if (maximum !== undefined && values.minimumWaterLevel !== undefined && values.minimumWaterLevel > maximum) throw Object.assign(new Error('Minimum water level cannot exceed the maximum water level.'), { statusCode: 400 });
    if (values.assignedOperatorId && (!mongoose.isValidObjectId(values.assignedOperatorId) || !(await User.exists({ _id: values.assignedOperatorId, organizationId, role: 'OPERATOR', status: { $ne: 'deactivated' } })))) throw Object.assign(new Error('Assigned operator is not valid for this organization.'), { statusCode: 400 });
    if (values.assignedUserIds !== undefined) {
        if (!Array.isArray(values.assignedUserIds) || values.assignedUserIds.some((id) => !mongoose.isValidObjectId(id))) throw Object.assign(new Error('Assigned users are invalid.'), { statusCode: 400 });
        const count = await User.countDocuments({ _id: { $in: values.assignedUserIds }, organizationId, status: { $ne: 'deactivated' }, role: { $ne: 'SUPER_ADMIN' } });
        if (count !== values.assignedUserIds.length) throw Object.assign(new Error('Assigned users must belong to this organization.'), { statusCode: 400 });
    }
    return values;
}
