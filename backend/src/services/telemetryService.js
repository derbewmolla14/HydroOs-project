import { DeviceReading } from '../models/DeviceReading.js';
import { Device } from '../models/Device.js';
import { Tank } from '../models/Tank.js';
import { evaluateTelemetry } from './alertService.js';

const readingFields = ['waterLevel', 'waterVolume', 'flowRate', 'temperature', 'ph', 'turbidity', 'electricalConductivity', 'batteryLevel'];

export function validateTelemetryPayload(payload = {}) {
    const values = {};
    for (const field of readingFields) {
        if (payload[field] === undefined || payload[field] === null) {
            values[field] = null;
            continue;
        }
        const value = Number(payload[field]);
        const invalid = !Number.isFinite(value) || value < 0 || (field === 'batteryLevel' && value > 100) || (field === 'ph' && value > 14);
        if (invalid) {
            const error = new Error(`Invalid ${field} reading.`);
            error.statusCode = 400;
            throw error;
        }
        values[field] = value;
    }
    const measuredAt = payload.measuredAt ? new Date(payload.measuredAt) : new Date();
    if (Number.isNaN(measuredAt.getTime()) || measuredAt.getTime() > Date.now() + 5 * 60 * 1000) {
        const error = new Error('Invalid measurement timestamp.');
        error.statusCode = 400;
        throw error;
    }
    return { values, measuredAt, payload: payload.payload || {} };
}

export function waterLevelPercentage(level, capacity) {
    if (!Number.isFinite(level) || !Number.isFinite(capacity) || capacity <= 0) return null;
    return Math.round(Math.min(level / capacity, 1) * 10000) / 100;
}

export async function persistTelemetry({ device, payload, io }) {
    const { values, measuredAt, payload: rawPayload } = validateTelemetryPayload(payload);
    const previous = await DeviceReading.findOne({ deviceId: device.id }).sort({ measuredAt: -1 }).lean();
    if (previous && measuredAt.getTime() < previous.measuredAt.getTime()) {
        const error = new Error('Out-of-order measurement rejected.');
        error.statusCode = 409;
        throw error;
    }
    const reading = await DeviceReading.create({ deviceId: device.id, organizationId: device.organizationId, tankId: device.tankId, measuredAt, ...values, payload: rawPayload });
    const now = new Date();
    await Device.findByIdAndUpdate(device.id, { $set: { lastSeenAt: now, lastHeartbeatAt: now } });
    let tank = null;
    if (device.tankId) {
        tank = await Tank.findOne({ _id: device.tankId, organizationId: device.organizationId });
        if (tank && measuredAt.getTime() >= (tank.lastMeasuredAt?.getTime() || 0)) {
            const level = values.waterVolume ?? values.waterLevel;
            const updates = { lastMeasuredAt: measuredAt };
            if (level !== null) updates.currentWaterLevel = Math.min(level, tank.capacity);
            tank = await Tank.findOneAndUpdate({ _id: tank.id, organizationId: device.organizationId }, { $set: updates }, { new: true }).lean({ virtuals: true });
        }
    }
    const organizationId = device.organizationId.toString();
    const readingEvent = { organizationId, deviceId: device.id.toString(), reading, tank };
    io?.to?.(`organization:${organizationId}`).emit('telemetry:reading', readingEvent);
    io?.to?.('organization:platform').emit('telemetry:reading', readingEvent);
    if (tank) {
        const tankEvent = { organizationId, tank };
        io?.to?.(`organization:${organizationId}`).emit('tank:water-level', tankEvent);
        io?.to?.('organization:platform').emit('tank:water-level', tankEvent);
    }
    await evaluateTelemetry({ device, reading, io });
    return { reading, tank };
}

export function monitoringFilter(user, organizationId) {
    if (user.role === 'SUPER_ADMIN') return organizationId ? { organizationId } : {};
    return { organizationId: user.organizationId };
}
