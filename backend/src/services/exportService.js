import { Document, HeadingLevel, Packer, Paragraph, Table, TableCell, TableRow, TextRun, WidthType } from 'docx';
import mongoose from 'mongoose';
import XLSX from 'xlsx';
import { DeviceReading } from '../models/DeviceReading.js';
import { Device } from '../models/Device.js';
import { Tank } from '../models/Tank.js';
import { waterLevelPercentage } from './telemetryService.js';

const qualityFields = ['temperature', 'ph', 'turbidity', 'electricalConductivity'];
const readingStatuses = ['normal', 'critical', 'unavailable'];

function dateRange(from, to) {
    const end = to ? new Date(`${to}T23:59:59.999Z`) : new Date();
    const start = from ? new Date(`${from}T00:00:00.000Z`) : new Date(end.getTime() - 24 * 60 * 60 * 1000);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start >= end || end.getTime() - start.getTime() > 366 * 24 * 60 * 60 * 1000) {
        throw Object.assign(new Error('Invalid date range. Use a maximum range of one year.'), { statusCode: 400 });
    }
    return { start, end };
}

function readingStatus(reading, tank) {
    const level = reading.waterVolume ?? reading.waterLevel;
    if (level === null || level === undefined) return 'unavailable';
    return tank.minimumWaterLevel > 0 && level <= tank.minimumWaterLevel ? 'critical' : 'normal';
}

function qualityValues(reading) {
    return Object.fromEntries(qualityFields.filter((field) => reading[field] !== null && reading[field] !== undefined).map((field) => [field, reading[field]]));
}

function readingRow(reading, tank, device) {
    const waterVolume = reading.waterVolume ?? reading.waterLevel;
    return {
        date: new Date(reading.measuredAt),
        waterLevel: reading.waterLevel,
        waterVolume,
        waterPercentage: waterLevelPercentage(waterVolume, tank.capacity),
        waterQuality: qualityValues(reading),
        deviceStatus: device?.status || 'unknown',
        readingStatus: readingStatus(reading, tank)
    };
}

function worksheet(rows, columns) {
    const sheet = XLSX.utils.json_to_sheet(rows, { header: columns });
    sheet['!autofilter'] = { ref: `A1:${String.fromCharCode(64 + columns.length)}${Math.max(rows.length + 1, 1)}` };
    sheet['!cols'] = columns.map((column) => ({ wch: Math.max(column.length + 2, 16) }));
    return sheet;
}

export async function collectTankHistory({ user, tankId, from, to, readingStatus: requestedStatus }) {
    const { start, end } = dateRange(from, to);
    if (!mongoose.isValidObjectId(tankId)) throw Object.assign(new Error('A valid tank is required.'), { statusCode: 400 });
    if (requestedStatus && !readingStatuses.includes(requestedStatus)) throw Object.assign(new Error('Reading status is invalid.'), { statusCode: 400 });
    const tankFilter = { _id: tankId };
    if (user.role !== 'SUPER_ADMIN') tankFilter.organizationId = user.organizationId;
    if (user.role === 'OPERATOR') tankFilter.$or = [{ assignedOperatorId: user.id }, { assignedUserIds: user.id }];
    const tank = await Tank.findOne(tankFilter).lean();
    if (!tank) throw Object.assign(new Error('Tank not found.'), { statusCode: 404 });
    const readings = await DeviceReading.find({ organizationId: tank.organizationId, tankId: tank._id, measuredAt: { $gte: start, $lte: end } }).sort({ measuredAt: 1 }).limit(10000).lean();
    const devices = await Device.find({ _id: { $in: [...new Set(readings.map((reading) => reading.deviceId.toString()))] } }).select('status name identifier lastSeenAt').lean();
    const deviceMap = new Map(devices.map((device) => [device._id.toString(), device]));
    const rows = readings.map((reading) => readingRow(reading, tank, deviceMap.get(reading.deviceId.toString()))).filter((row) => !requestedStatus || row.readingStatus === requestedStatus);
    return { tank, rows, filters: { start, end, readingStatus: requestedStatus || null }, generatedAt: new Date() };
}

export function createTankHistoryWorkbook(report) {
    const { tank, rows, filters, generatedAt } = report;
    const workbook = XLSX.utils.book_new();
    const summaryRows = [
        { Field: 'Tank name', Value: tank.name },
        { Field: 'Tank ID', Value: tank.code },
        { Field: 'Tank type', Value: tank.tankType },
        { Field: 'Capacity (L)', Value: tank.capacity },
        { Field: 'Date range', Value: `${filters.start.toISOString()} to ${filters.end.toISOString()}` },
        { Field: 'Report generated', Value: generatedAt }
    ];
    const levels = rows.map((row) => row.waterLevel).filter((value) => value !== null && value !== undefined);
    summaryRows.push({ Field: 'Minimum water level', Value: levels.length ? Math.min(...levels) : 'No data' });
    summaryRows.push({ Field: 'Maximum water level', Value: levels.length ? Math.max(...levels) : 'No data' });
    summaryRows.push({ Field: 'Average water level', Value: levels.length ? levels.reduce((sum, value) => sum + value, 0) / levels.length : 'No data' });
    XLSX.utils.book_append_sheet(workbook, worksheet(summaryRows, ['Field', 'Value']), 'Tank Summary');
    XLSX.utils.book_append_sheet(workbook, worksheet(rows.map((row) => ({ Date: row.date, 'Water level': row.waterLevel, 'Water volume (L)': row.waterVolume, 'Water percentage': row.waterPercentage, 'Device status': row.deviceStatus, 'Reading status': row.readingStatus })), ['Date', 'Water level', 'Water volume (L)', 'Water percentage', 'Device status', 'Reading status']), 'Historical Readings');
    const qualityRows = rows.filter((row) => Object.keys(row.waterQuality).length).map((row) => ({ Date: row.date, ...row.waterQuality }));
    if (qualityRows.length) XLSX.utils.book_append_sheet(workbook, worksheet(qualityRows, ['Date', ...Object.keys(qualityRows[0]).filter((key) => key !== 'Date')]), 'Water Quality History');
    return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx', cellDates: true });
}

function text(value) {
    return value === null || value === undefined ? '—' : String(value);
}

export async function createTankHistoryDocument(report) {
    const { tank, rows, filters, generatedAt } = report;
    const levels = rows.map((row) => row.waterLevel).filter((value) => value !== null && value !== undefined);
    const summary = levels.length ? `Minimum: ${Math.min(...levels)} | Maximum: ${Math.max(...levels)} | Average: ${(levels.reduce((sum, value) => sum + value, 0) / levels.length).toFixed(2)}` : 'No water-level data is available for this range.';
    const tableRows = [
        new TableRow({ children: ['Date and time', 'Water level', 'Water volume (L)', 'Water %', 'Quality', 'Device', 'Status'].map((value) => new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: value, bold: true })] })] })) }),
        ...rows.map((row) => new TableRow({ children: [text(row.date.toISOString()), text(row.waterLevel), text(row.waterVolume), text(row.waterPercentage), text(Object.entries(row.waterQuality).map(([key, value]) => `${key}: ${value}`).join(', ')), text(row.deviceStatus), text(row.readingStatus)].map((value) => new TableCell({ children: [new Paragraph(value)] })) }))
    ];
    const document = new Document({ sections: [{ children: [
        new Paragraph({ text: 'HydroOS', heading: HeadingLevel.TITLE }),
        new Paragraph({ text: 'Tank Historical Water Readings', heading: HeadingLevel.HEADING_1 }),
        new Paragraph(`Tank: ${tank.name} (${tank.code}) | Type: ${tank.tankType} | Capacity: ${tank.capacity} L`),
        new Paragraph(`Date range: ${filters.start.toISOString()} to ${filters.end.toISOString()}`),
        new Paragraph(`Report generated: ${generatedAt.toISOString()}`),
        new Paragraph({ text: 'Summary', heading: HeadingLevel.HEADING_2 }),
        new Paragraph(summary),
        new Paragraph({ text: 'Historical readings', heading: HeadingLevel.HEADING_2 }),
        new Table({ rows: tableRows, width: { size: 100, type: WidthType.PERCENTAGE } })
    ] }] });
    return Packer.toBuffer(document);
}
