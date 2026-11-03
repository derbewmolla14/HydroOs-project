import { Alert } from '../models/Alert.js';
import { AlertConfig } from '../models/AlertConfig.js';
import { Device } from '../models/Device.js';
import { DeviceReading } from '../models/DeviceReading.js';
import { Notification } from '../models/Notification.js';
import { NotificationPreference } from '../models/NotificationPreference.js';
import { Tank } from '../models/Tank.js';
import { User } from '../models/User.js';

const activeStatuses = ['ACTIVE', 'ACKNOWLEDGED', 'SNOOZED'];
const alertManagerPermissions = ['alerts:manage', 'manage_alerts', 'alerts'];

export function canManageAlerts(user) {
    return ['SUPER_ADMIN', 'ORGANIZATION_ADMIN'].includes(user?.role)
        || (user?.role === 'SUB_ADMIN' && (user.permissions || []).some((permission) => alertManagerPermissions.includes(permission)));
}

export function canManageAlertLifecycle(user) {
    return canManageAlerts(user)
        || (user?.role === 'OPERATOR' && (user.permissions || []).some((permission) => ['alerts:acknowledge', 'alerts:manage', 'manage_alerts'].includes(permission)));
}

function scopedConditionKey(conditionKey, tankId, deviceId) {
    return `${conditionKey}:${tankId || deviceId || 'organization'}`;
}

async function configFor(organizationId, tankId) {
    const [tankConfig, organizationConfig] = await Promise.all([
        tankId ? AlertConfig.findOne({ organizationId, tankId }).lean() : null,
        AlertConfig.findOne({ organizationId, tankId: null }).lean()
    ]);
    return {
        ...(organizationConfig || {}),
        ...(tankConfig || {}),
        waterLevel: { ...(organizationConfig?.waterLevel || {}), ...(tankConfig?.waterLevel || {}) },
        quality: { ...(organizationConfig?.quality || {}), ...(tankConfig?.quality || {}) },
        device: { ...(organizationConfig?.device || {}), ...(tankConfig?.device || {}) },
        usage: { ...(organizationConfig?.usage || {}), ...(tankConfig?.usage || {}) }
    };
}

function emit(io, event, payload) {
    if (!io) return;
    const organizationId = payload.organizationId.toString();
    io.to(`organization:${organizationId}`).emit(event, payload);
    io.to('organization:platform').emit(event, payload);
}

async function notifyUsers(alert, io) {
    const users = await User.find({
        status: 'active',
        $or: [{ organizationId: alert.organizationId }, { role: 'SUPER_ADMIN' }]
    }).select('_id').lean();
    const preferences = await NotificationPreference.find({ userId: { $in: users.map((user) => user._id) } }).lean();
    const preferenceMap = new Map(preferences.map((preference) => [preference.userId.toString(), preference]));
    const preferenceKey = alert.category === 'DEVICE' ? 'deviceDisconnections' : alert.category === 'WATER_LEVEL' ? 'waterLevel' : alert.category === 'WATER_QUALITY' ? 'waterQuality' : null;
    const severityKey = alert.severity.toLowerCase();
    const notifications = users.filter((user) => {
        const preference = preferenceMap.get(user._id.toString());
        return !preference || (preference[severityKey] !== false && (!preferenceKey || preference[preferenceKey] !== false));
    }).map((user) => ({
        userId: user._id,
        organizationId: alert.organizationId,
        alertId: alert._id,
        title: alert.title,
        message: alert.description,
        severity: alert.severity
    }));
    if (notifications.length) await Notification.insertMany(notifications, { ordered: false }).catch((error) => {
        if (error.code !== 11000) throw error;
    });
    emit(io, 'notification:new', { organizationId: alert.organizationId, alert });
}

export async function raiseAlert({ organizationId, tankId = null, deviceId = null, category, conditionKey, severity, title, description, measurementValue = null, threshold = null, io }) {
    const scopedKey = scopedConditionKey(conditionKey, tankId, deviceId);
    const existing = await Alert.findOne({ organizationId, conditionKey: scopedKey, status: { $in: activeStatuses } });
    if (existing) return existing;
    const alert = await Alert.create({ organizationId, tankId, deviceId, category, conditionKey: scopedKey, severity, title, description, measurementValue, threshold, history: [{ action: 'CREATED', at: new Date() }] });
    await notifyUsers(alert, io);
    emit(io, 'alert:new', { organizationId, alert });
    return alert;
}

export async function evaluateTelemetry({ device, reading, io }) {
    const config = await configFor(device.organizationId, device.tankId);
    const tank = device.tankId ? await Tank.findById(device.tankId).select('name code capacity').lean() : null;
    const level = reading.waterVolume ?? reading.waterLevel;
    const label = tank?.name || device.identifier;
    const checks = [];
    const previous = await DeviceReading.findOne({ deviceId: device._id, measuredAt: { $lt: reading.measuredAt } }).sort({ measuredAt: -1 }).lean();
    if (level !== null && level !== undefined) {
        if (config.waterLevel.critical !== null && level <= config.waterLevel.critical) checks.push(['CRITICAL', 'WATER_LEVEL_CRITICAL', 'Critically low water level', `${label} is critically low at ${level} liters.`, config.waterLevel.critical]);
        else if (config.waterLevel.minimum !== null && level <= config.waterLevel.minimum) checks.push(['WARNING', 'WATER_LEVEL_LOW', 'Low water level', `${label} is below its configured minimum at ${level} liters.`, config.waterLevel.minimum]);
        if (config.waterLevel.maximum !== null && level >= config.waterLevel.maximum) checks.push(['WARNING', 'WATER_LEVEL_HIGH', 'Maximum water level reached', `${label} has reached ${level} liters.`, config.waterLevel.maximum]);
    }
    const quality = [
        ['ph', 'phMin', 'pH below configured range', 'pH above configured range'],
        ['turbidity', 'turbidityMax', 'Turbidity exceeds configured limit', 'Turbidity exceeds configured limit'],
        ['electricalConductivity', 'electricalConductivityMax', 'Electrical conductivity exceeds configured limit', 'Electrical conductivity exceeds configured limit'],
        ['temperature', 'temperatureMin', 'Temperature below configured range', 'Temperature above configured range']
    ];
    for (const [field, thresholdField, lowTitle, highTitle] of quality) {
        const value = reading[field];
        const low = config.quality[thresholdField];
        const high = field === 'ph' ? config.quality.phMax : field === 'temperature' ? config.quality.temperatureMax : low;
        if (value === null || value === undefined) continue;
        if ((field === 'ph' || field === 'temperature') && low !== null && value < low) checks.push(['WARNING', `QUALITY_${field.toUpperCase()}_LOW`, lowTitle, `${label} reported ${field} ${value}.`, low]);
        if ((field === 'ph' || field === 'temperature') && high !== null && value > high) checks.push(['WARNING', `QUALITY_${field.toUpperCase()}_HIGH`, highTitle, `${label} reported ${field} ${value}.`, high]);
        if ((field === 'turbidity' || field === 'electricalConductivity') && high !== null && value > high) checks.push(['WARNING', `QUALITY_${field.toUpperCase()}_HIGH`, highTitle, `${label} reported ${field} ${value}.`, high]);
    }
    if (reading.batteryLevel !== null && reading.batteryLevel <= config.device.lowBattery) checks.push(['WARNING', 'DEVICE_LOW_BATTERY', 'Low device battery', `${device.identifier} battery is ${reading.batteryLevel}%.`, config.device.lowBattery]);
    if (reading.flowRate !== null && config.usage.maxLitersPerHour !== null && reading.flowRate * 60 > config.usage.maxLitersPerHour) checks.push(['WARNING', 'USAGE_HIGH_FLOW', 'Possible abnormal water usage', `${label} reported unusually high flow. This is a possible anomaly, not a confirmed leak.`, config.usage.maxLitersPerHour]);
    if (previous && level !== null && config.waterLevel.unexpectedDrop !== null && (previous.waterVolume ?? previous.waterLevel) - level >= config.waterLevel.unexpectedDrop) checks.push(['WARNING', 'USAGE_RAPID_LEVEL_DECREASE', 'Possible rapid water loss', `${label} experienced a rapid water-level decrease. This is a possible anomaly, not a confirmed leak.`, config.waterLevel.unexpectedDrop]);
    for (const [severity, conditionKey, title, description, threshold] of checks) await raiseAlert({ organizationId: device.organizationId, tankId: device.tankId, deviceId: device._id, category: conditionKey.startsWith('QUALITY') ? 'WATER_QUALITY' : conditionKey.startsWith('DEVICE') ? 'DEVICE' : 'WATER_LEVEL', conditionKey, severity, title, description, measurementValue: level ?? reading.batteryLevel, threshold, io });
}

export async function evaluateHeartbeat({ device, io }) {
    const config = await configFor(device.organizationId, device.tankId);
    const lastReading = await DeviceReading.findOne({ deviceId: device._id }).sort({ measuredAt: -1 }).lean();
    const now = Date.now();
    const timeout = Math.max(device.heartbeatIntervalSeconds, config.device.offlineTimeoutSeconds) * 1000;
    if (!device.lastSeenAt || now - new Date(device.lastSeenAt).getTime() > timeout) {
        await raiseAlert({ organizationId: device.organizationId, tankId: device.tankId, deviceId: device._id, category: 'DEVICE', conditionKey: 'DEVICE_OFFLINE', severity: 'CRITICAL', title: 'Device offline', description: `${device.identifier} has not communicated within the configured timeout.`, threshold: timeout / 1000, io });
    } else if (lastReading && now - new Date(lastReading.measuredAt).getTime() > config.device.missingMeasurementMinutes * 60000) {
        await raiseAlert({ organizationId: device.organizationId, tankId: device.tankId, deviceId: device._id, category: 'DEVICE', conditionKey: 'DEVICE_MISSING_MEASUREMENT', severity: 'WARNING', title: 'Missing sensor measurement', description: `${device.identifier} has not submitted a measurement recently.`, threshold: config.device.missingMeasurementMinutes, io });
    }

}

export async function evaluateOfflineDevices(io) {
    const devices = await Device.find({ status: 'active' }).lean();
    for (const device of devices) await evaluateHeartbeat({ device, io });
}

export async function listAlerts({ user, query }) {
    const filter = user.role === 'SUPER_ADMIN' && query.organizationId ? { organizationId: query.organizationId } : user.role === 'SUPER_ADMIN' ? {} : { organizationId: user.organizationId };
    if (user.role === 'OPERATOR') {
        const [tanks, devices] = await Promise.all([
            Tank.find({ organizationId: user.organizationId, assignedOperatorId: user.id }).select('_id').lean(),
            Device.find({ organizationId: user.organizationId }).select('_id tankId').lean()
        ]);
        const tankIds = tanks.map((tank) => tank._id);
        filter.$or = [{ tankId: { $in: tankIds } }, { deviceId: { $in: devices.filter((device) => tankIds.some((id) => id.toString() === device.tankId?.toString())).map((device) => device._id) } }];
    }
    if (query.status) filter.status = query.status;
    if (query.severity) filter.severity = query.severity;
    if (query.category) filter.category = query.category;
    const page = Math.max(Number.parseInt(query.page || '1', 10), 1);
    const limit = Math.min(Math.max(Number.parseInt(query.limit || '20', 10), 1), 100);
    if (query.search) {
        const search = [{ title: new RegExp(query.search, 'i') }, { description: new RegExp(query.search, 'i') }, { conditionKey: new RegExp(query.search, 'i') }];
        if (filter.$or) filter.$and = [{ $or: filter.$or }, { $or: search }], delete filter.$or;
        else filter.$or = search;
    }
    const [items, total] = await Promise.all([Alert.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).populate('tankId', 'name code').populate('deviceId', 'name identifier').lean(), Alert.countDocuments(filter)]);
    return { items, page, limit, total, pages: Math.ceil(total / limit) };
}

export function validateAlertConfig(input = {}) {
    const groups = ['waterLevel', 'quality', 'device', 'usage'];
    const values = {};
    for (const group of groups) {
        if (input[group] === undefined) continue;
        if (!input[group] || typeof input[group] !== 'object' || Array.isArray(input[group])) throw Object.assign(new Error(`${group} must be an object.`), { statusCode: 400 });
        values[group] = {};
        for (const [key, value] of Object.entries(input[group])) {
            if (value === null || value === '') {
                values[group][key] = null;
                continue;
            }
            const number = Number(value);
            if (!Number.isFinite(number) || number < 0) throw Object.assign(new Error(`${group}.${key} must be a non-negative number.`), { statusCode: 400 });
            if (key.startsWith('ph') && number > 14) throw Object.assign(new Error(`${group}.${key} must be between 0 and 14.`), { statusCode: 400 });
            if (key === 'lowBattery' && number > 100) throw Object.assign(new Error('device.lowBattery must be between 0 and 100.'), { statusCode: 400 });
            values[group][key] = number;
        }
    }
    const level = values.waterLevel;
    if (level && level.minimum != null && level.critical != null && level.critical > level.minimum) throw Object.assign(new Error('Critical water level cannot exceed minimum water level.'), { statusCode: 400 });
    if (level && level.maximum != null && level.minimum != null && level.maximum < level.minimum) throw Object.assign(new Error('Maximum water level cannot be below minimum water level.'), { statusCode: 400 });
    const quality = values.quality;
    if (quality && quality.phMin != null && quality.phMax != null && quality.phMin > quality.phMax) throw Object.assign(new Error('pH minimum cannot exceed pH maximum.'), { statusCode: 400 });
    if (quality && quality.temperatureMin != null && quality.temperatureMax != null && quality.temperatureMin > quality.temperatureMax) throw Object.assign(new Error('Temperature minimum cannot exceed temperature maximum.'), { statusCode: 400 });
    return values;
}

export { configFor };
