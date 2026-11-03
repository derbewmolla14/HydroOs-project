import crypto from 'node:crypto';
import mongoose from 'mongoose';
import { Device } from '../models/Device.js';
import { Tank } from '../models/Tank.js';
import { User } from '../models/User.js';
import { hashToken } from './authService.js';

export const deviceManagerRoles = ['SUPER_ADMIN', 'ORGANIZATION_ADMIN', 'SUB_ADMIN'];
export const deviceFields = ['identifier', 'name', 'deviceType', 'protocol', 'firmwareVersion', 'heartbeatIntervalSeconds', 'tankId', 'status', 'metadata'];

export function canManageDevices(user) {
    return deviceManagerRoles.includes(user?.role) && (user.role !== 'SUB_ADMIN' || (user.permissions || []).some((permission) => ['devices:manage', 'manage_devices', 'devices'].includes(permission)));
}

export function deviceOrganizationFilter(user, organizationId) {
    if (user.role === 'SUPER_ADMIN') return organizationId ? { organizationId } : {};
    return { organizationId: user.organizationId };
}

export function generateDeviceSecret() {
    return `hydroos_${crypto.randomBytes(32).toString('base64url')}`;
}

export async function validateDeviceInput(input, organizationId) {
    const values = Object.fromEntries(deviceFields.filter((field) => input[field] !== undefined).map((field) => [field, input[field]]));
    if (values.identifier !== undefined) values.identifier = String(values.identifier).trim().toUpperCase();
    if (values.name !== undefined) values.name = String(values.name).trim();
    if (values.heartbeatIntervalSeconds !== undefined) values.heartbeatIntervalSeconds = Number(values.heartbeatIntervalSeconds);
    if (values.tankId !== undefined && values.tankId !== null && values.tankId !== '') {
        if (!mongoose.isValidObjectId(values.tankId) || !(await Tank.exists({ _id: values.tankId, organizationId, status: { $ne: 'deactivated' } }))) throw Object.assign(new Error('Tank is not valid for this organization.'), { statusCode: 400 });
    } else if (values.tankId === '') values.tankId = null;
    if (values.heartbeatIntervalSeconds !== undefined && (!Number.isInteger(values.heartbeatIntervalSeconds) || values.heartbeatIntervalSeconds < 10 || values.heartbeatIntervalSeconds > 86400)) throw Object.assign(new Error('Heartbeat interval must be between 10 and 86400 seconds.'), { statusCode: 400 });
    if (values.name !== undefined && !values.name) throw Object.assign(new Error('Device name cannot be empty.'), { statusCode: 400 });
    return values;
}

export function serializeDevice(device) {
    const value = typeof device.toObject === 'function' ? device.toObject({ virtuals: true }) : { ...device };
    delete value.secretHash;
    return value;
}

export async function authenticateDeviceCredentials(identifier, secret) {
    if (!identifier || !secret) return null;
    const device = await Device.findOne({ identifier: String(identifier).trim().toUpperCase() }).select('+secretHash');
    if (!device || device.status !== 'active' || hashToken(secret) !== device.secretHash) return null;
    return device;
}

export async function assertDeviceOrganization(device, organizationId) {
    if (!device || device.organizationId.toString() !== organizationId.toString()) throw Object.assign(new Error('Device organization access denied.'), { statusCode: 403 });
    return device;
}

export async function assertOperatorTankAccess(user, tankId) {
    if (user.role !== 'OPERATOR') return true;
    return User.exists({ _id: user.id, organizationId: user.organizationId }) && Tank.exists({ _id: tankId, organizationId: user.organizationId, assignedOperatorId: user.id });
}
