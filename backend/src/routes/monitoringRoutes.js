import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { Device } from '../models/Device.js';
import { DeviceReading } from '../models/DeviceReading.js';
import { Tank } from '../models/Tank.js';
import { deviceOrganizationFilter } from '../services/deviceService.js';
import { monitoringFilter, waterLevelPercentage } from '../services/telemetryService.js';

const router = express.Router();
router.use(authenticate);

async function scopedTankIds(req, filter) {
    if (req.user.role !== 'OPERATOR') return null;
    const tanks = await Tank.find({ ...filter, $or: [{ assignedOperatorId: req.user.id }, { assignedUserIds: req.user.id }] }, '_id').lean();
    return tanks.map((tank) => tank._id);
}

function range(req) {
    const end = req.query.to ? new Date(req.query.to) : new Date();
    const start = req.query.from ? new Date(req.query.from) : new Date(end.getTime() - 24 * 60 * 60 * 1000);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start >= end || end.getTime() - start.getTime() > 366 * 24 * 60 * 60 * 1000) {
        const error = new Error('Invalid date range. Use a maximum range of one year.');
        error.statusCode = 400;
        throw error;
    }
    return { start, end };
}

function bucketDate(date, granularity) {
    const value = new Date(date);
    if (granularity === 'hour') value.setMinutes(0, 0, 0);
    else if (granularity === 'day') value.setHours(0, 0, 0, 0);
    else if (granularity === 'week') {
        value.setHours(0, 0, 0, 0);
        value.setDate(value.getDate() - value.getDay());
    } else value.setMonth(value.getMonth(), 1), value.setHours(0, 0, 0, 0);
    return value;
}

router.get('/overview', async (req, res, next) => {
    try {
        const filter = monitoringFilter(req.user, req.query.organizationId);
        const tankIds = await scopedTankIds(req, filter);
        if (tankIds) filter._id = { $in: tankIds };
        const tanks = await Tank.find(filter).select('name code capacity status currentWaterLevel lastMeasuredAt assignedOperatorId').lean({ virtuals: true });
        const organizationFilter = monitoringFilter(req.user, req.query.organizationId);
        const deviceFilter = { ...organizationFilter, ...(tankIds ? { tankId: { $in: tankIds } } : {}) };
        const devices = await Device.find(deviceFilter).select('name identifier status tankId heartbeatIntervalSeconds lastSeenAt lastHeartbeatAt').populate('tankId', 'name code capacity currentWaterLevel').lean({ virtuals: true });
        const now = Date.now();
        const online = devices.filter((device) => device.status === 'active' && device.lastSeenAt && now - new Date(device.lastSeenAt).getTime() <= device.heartbeatIntervalSeconds * 2000).length;
        const readings = await DeviceReading.find({ ...organizationFilter, ...(tankIds ? { tankId: { $in: tankIds } } : {}), measuredAt: { $gte: new Date(now - 24 * 60 * 60 * 1000) } }).sort({ measuredAt: -1 }).limit(2000).lean();
        const waterReadings = readings.filter((reading) => reading.waterVolume !== null || reading.waterLevel !== null);
        const latest = waterReadings[0] || null;
        const averageLevel = tanks.length ? Math.round(tanks.reduce((sum, tank) => sum + (waterLevelPercentage(tank.currentWaterLevel, tank.capacity) || 0), 0) / tanks.length * 100) / 100 : null;
        const consumption = readings.slice().sort((a, b) => new Date(a.measuredAt) - new Date(b.measuredAt)).reduce((sum, reading, index, ordered) => {
            if (!index) return sum;
            const minutes = (new Date(reading.measuredAt).getTime() - new Date(ordered[index - 1].measuredAt).getTime()) / 60000;
            return minutes >= 0 && minutes <= 1440 ? sum + Number(ordered[index - 1].flowRate || reading.flowRate || 0) * minutes : sum;
        }, 0);
        res.json({ success: true, summary: { tanks: tanks.length, monitoredTanks: tanks.filter((tank) => tank.status === 'active').length, devices: devices.length, connectedDevices: online, offlineDevices: devices.length - online, averageWaterLevel: averageLevel, waterAvailabilityLiters: tanks.reduce((sum, tank) => sum + (tank.currentWaterLevel || 0), 0), waterConsumptionLiters: Math.round(consumption * 100) / 100, lastReadingAt: latest?.measuredAt || null }, tanks, devices: devices.map((device) => ({ ...device, connectionStatus: device.status === 'active' && device.lastSeenAt && now - new Date(device.lastSeenAt).getTime() <= device.heartbeatIntervalSeconds * 2000 ? 'online' : device.status === 'deactivated' ? 'deactivated' : 'offline' })), latestReadings: readings.slice(0, 20) });
    } catch (error) { next(error); }
});

router.get('/history', async (req, res, next) => {
    try {
        const filter = monitoringFilter(req.user, req.query.organizationId);
        const tankIds = await scopedTankIds(req, filter);
        const readingFilter = { ...filter, ...(tankIds ? { tankId: { $in: tankIds } } : {}) };
        if (req.query.tankId) {
            if (tankIds && !tankIds.some((tankId) => tankId.toString() === req.query.tankId)) return res.json({ success: true, filters: { tankId: req.query.tankId }, points: [] });
            readingFilter.tankId = req.query.tankId;
        }
        if (req.query.deviceId) readingFilter.deviceId = req.query.deviceId;
        const { start, end } = range(req);
        const granularity = ['hour', 'day', 'week', 'month'].includes(req.query.granularity) ? req.query.granularity : 'hour';
        const readings = await DeviceReading.find({ ...readingFilter, measuredAt: { $gte: start, $lte: end } }).sort({ measuredAt: 1 }).limit(10000).lean();
        const buckets = new Map();
        let consumption = 0;
        let previous = null;
        for (const reading of readings) {
            const key = bucketDate(reading.measuredAt, granularity).toISOString();
            const bucket = buckets.get(key) || { timestamp: key, count: 0, waterLevel: [], waterVolume: [], flowRate: [], temperature: [], ph: [], turbidity: [], electricalConductivity: [], batteryLevel: [], consumptionLiters: 0 };
            bucket.count += 1;
            for (const field of ['waterLevel', 'waterVolume', 'flowRate', 'temperature', 'ph', 'turbidity', 'electricalConductivity', 'batteryLevel']) if (reading[field] !== null && reading[field] !== undefined) bucket[field].push(reading[field]);
            if (previous && reading.tankId?.toString() === previous.tankId?.toString() && reading.deviceId?.toString() === previous.deviceId?.toString()) {
                const hours = (new Date(reading.measuredAt).getTime() - new Date(previous.measuredAt).getTime()) / 3600000;
                const flow = Number(previous.flowRate || reading.flowRate || 0);
                if (hours >= 0 && hours <= 24 && flow >= 0) bucket.consumptionLiters += flow * hours * 60;
                if (reading.waterVolume !== null && previous.waterVolume !== null && reading.waterVolume < previous.waterVolume) bucket.consumptionLiters += previous.waterVolume - reading.waterVolume;
            }
            previous = reading;
            buckets.set(key, bucket);
        }
        const averages = (values) => values.length ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length * 100) / 100 : null;
        res.json({ success: true, filters: { start, end, granularity, tankId: req.query.tankId || null }, points: [...buckets.values()].map((bucket) => ({ ...bucket, ...Object.fromEntries(['waterLevel', 'waterVolume', 'flowRate', 'temperature', 'ph', 'turbidity', 'electricalConductivity', 'batteryLevel'].map((field) => [field, averages(bucket[field])])) })) });
    } catch (error) { next(error); }
});

export { router as monitoringRoutes };
