import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { authenticateDevice } from '../middleware/deviceAuth.js';
import { Device } from '../models/Device.js';
import { DeviceReading } from '../models/DeviceReading.js';
import { Tank } from '../models/Tank.js';
import { recordAudit } from '../services/auditService.js';
import { assertEntitlement } from '../services/entitlementService.js';
import { assertOperatorTankAccess, canManageDevices, deviceOrganizationFilter, generateDeviceSecret, serializeDevice, validateDeviceInput } from '../services/deviceService.js';
import { hashToken } from '../services/authService.js';
import { persistTelemetry } from '../services/telemetryService.js';
import { evaluateHeartbeat } from '../services/alertService.js';

const router = express.Router();
const managerRoles = ['SUPER_ADMIN', 'ORGANIZATION_ADMIN', 'SUB_ADMIN'];
const userRoles = [...managerRoles, 'OPERATOR'];

function organizationIdFor(req) {
    return req.user.role === 'SUPER_ADMIN' ? req.body.organizationId || req.query.organizationId : req.user.organizationId;
}

function broadcast(req, event, payload) {
    const io = req.app.get('io');
    if (io?.to) {
        io.to(`organization:${payload.organizationId}`).emit(event, payload);
        io.to('organization:platform').emit(event, payload);
    }
}

router.post('/ingest/heartbeat', authenticateDevice, async (req, res, next) => {
    try {
        const now = new Date();
        const device = await Device.findByIdAndUpdate(req.device.id, { $set: { lastSeenAt: now, lastHeartbeatAt: now, firmwareVersion: req.body.firmwareVersion || req.device.firmwareVersion, metadata: req.body.metadata || req.device.metadata } }, { new: true }).lean({ virtuals: true });
        await evaluateHeartbeat({ device, io: req.app.get('io') });
        broadcast(req, 'device:heartbeat', { organizationId: device.organizationId.toString(), device: serializeDevice(device) });
        res.json({ success: true, receivedAt: now, device: serializeDevice(device) });
    } catch (error) { next(error); }
});

router.post('/ingest/readings', authenticateDevice, async (req, res, next) => {
    try {
        const result = await persistTelemetry({ device: req.device, payload: req.body, io: req.app.get('io') });
        res.status(201).json({ success: true, ...result });
    } catch (error) { next(error); }
});

router.use(authenticate);

router.get('/', async (req, res, next) => {
    try {
        const filter = deviceOrganizationFilter(req.user, req.query.organizationId);
        if (req.user.role === 'OPERATOR') {
            const tanks = await Tank.find({ organizationId: req.user.organizationId, $or: [{ assignedOperatorId: req.user.id }, { assignedUserIds: req.user.id }] }, '_id').lean();
            filter.tankId = { $in: tanks.map((tank) => tank._id) };
        }
        if (req.query.status && ['active', 'inactive', 'deactivated'].includes(req.query.status)) filter.status = req.query.status;
        if (req.query.deviceType) filter.deviceType = req.query.deviceType;
        if (req.query.search?.trim()) filter.$or = [{ name: { $regex: req.query.search.trim(), $options: 'i' } }, { identifier: { $regex: req.query.search.trim(), $options: 'i' } }, { firmwareVersion: { $regex: req.query.search.trim(), $options: 'i' } }];
        const page = Math.max(Number.parseInt(req.query.page || '1', 10), 1);
        const limit = Math.min(Math.max(Number.parseInt(req.query.limit || '10', 10), 1), 100);
        const [devices, total] = await Promise.all([Device.find(filter).populate('tankId', 'name code').sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean({ virtuals: true }), Device.countDocuments(filter)]);
        res.json({ success: true, devices: devices.map(serializeDevice), pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
    } catch (error) { next(error); }
});

router.get('/:deviceId/readings', async (req, res, next) => {
    try {
        const device = await Device.findOne({ _id: req.params.deviceId, ...deviceOrganizationFilter(req.user, req.query.organizationId) }).lean();
        if (!device) return res.status(404).json({ success: false, message: 'Device not found.' });
        if (req.user.role === 'OPERATOR' && !(device.tankId && await assertOperatorTankAccess(req.user, device.tankId))) return res.status(404).json({ success: false, message: 'Device not found.' });
        const limit = Math.min(Math.max(Number.parseInt(req.query.limit || '25', 10), 1), 100);
        const readings = await DeviceReading.find({ deviceId: device._id }).sort({ measuredAt: -1 }).limit(limit).lean();
        res.json({ success: true, readings });
    } catch (error) { next(error); }
});

router.get('/:deviceId', async (req, res, next) => {
    try {
        const device = await Device.findOne({ _id: req.params.deviceId, ...deviceOrganizationFilter(req.user, req.query.organizationId) }).populate('tankId', 'name code capacity').lean({ virtuals: true });
        if (!device) return res.status(404).json({ success: false, message: 'Device not found.' });
        if (req.user.role === 'OPERATOR' && !(device.tankId?._id && await assertOperatorTankAccess(req.user, device.tankId._id))) return res.status(404).json({ success: false, message: 'Device not found.' });
        res.json({ success: true, device: serializeDevice(device) });
    } catch (error) { next(error); }
});

router.post('/', async (req, res, next) => {
    try {
        if (!managerRoles.includes(req.user.role) || !canManageDevices(req.user)) return res.status(403).json({ success: false, message: 'Device management permission is required.' });
        const organizationId = organizationIdFor(req);
        if (!organizationId || (req.user.role !== 'SUPER_ADMIN' && req.user.organizationId !== organizationId)) return res.status(403).json({ success: false, message: 'Organization access denied.' });
        await assertEntitlement(organizationId, 'devices');
        const values = await validateDeviceInput(req.body, organizationId);
        const secret = generateDeviceSecret();
        const device = await Device.create({ ...values, organizationId, secretHash: hashToken(secret) });
        await recordAudit({ actorUserId: req.user.id, action: 'DEVICE_CREATED', resourceType: 'Device', resourceId: device.id, organizationId, metadata: { identifier: device.identifier }, ipAddress: req.ip });
        res.status(201).json({ success: true, device: serializeDevice(device), credentials: { identifier: device.identifier, secret } });
    } catch (error) { if (error.code === 11000) error.statusCode = 409; next(error); }
});

router.patch('/:deviceId', async (req, res, next) => {
    try {
        if (!canManageDevices(req.user)) return res.status(403).json({ success: false, message: 'Device management permission is required.' });
        const existing = await Device.findOne({ _id: req.params.deviceId, ...deviceOrganizationFilter(req.user, req.body.organizationId) });
        if (!existing) return res.status(404).json({ success: false, message: 'Device not found.' });
        const values = await validateDeviceInput(req.body, existing.organizationId);
        const device = await Device.findByIdAndUpdate(existing.id, { $set: values }, { new: true, runValidators: true }).populate('tankId', 'name code');
        await recordAudit({ actorUserId: req.user.id, action: 'DEVICE_UPDATED', resourceType: 'Device', resourceId: device.id, organizationId: existing.organizationId, metadata: { fields: Object.keys(values) }, ipAddress: req.ip });
        res.json({ success: true, device: serializeDevice(device) });
    } catch (error) { if (error.code === 11000) error.statusCode = 409; next(error); }
});

router.post('/:deviceId/rotate-secret', async (req, res, next) => {
    try {
        if (!canManageDevices(req.user)) return res.status(403).json({ success: false, message: 'Device management permission is required.' });
        const device = await Device.findOne({ _id: req.params.deviceId, ...deviceOrganizationFilter(req.user, req.body.organizationId) });
        if (!device) return res.status(404).json({ success: false, message: 'Device not found.' });
        const secret = generateDeviceSecret();
        device.secretHash = hashToken(secret);
        await device.save();
        await recordAudit({ actorUserId: req.user.id, action: 'DEVICE_SECRET_ROTATED', resourceType: 'Device', resourceId: device.id, organizationId: device.organizationId, ipAddress: req.ip });
        res.json({ success: true, credentials: { identifier: device.identifier, secret } });
    } catch (error) { next(error); }
});

router.delete('/:deviceId', async (req, res, next) => {
    try {
        if (!canManageDevices(req.user)) return res.status(403).json({ success: false, message: 'Device management permission is required.' });
        const device = await Device.findOneAndUpdate({ _id: req.params.deviceId, ...deviceOrganizationFilter(req.user, req.body.organizationId) }, { status: 'deactivated' }, { new: true });
        if (!device) return res.status(404).json({ success: false, message: 'Device not found.' });
        await recordAudit({ actorUserId: req.user.id, action: 'DEVICE_DEACTIVATED', resourceType: 'Device', resourceId: device.id, organizationId: device.organizationId, ipAddress: req.ip });
        res.json({ success: true, device: serializeDevice(device) });
    } catch (error) { next(error); }
});

export { router as deviceRoutes };
