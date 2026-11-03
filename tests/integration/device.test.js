import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../../backend/src/app.js';
import { canManageDevices, generateDeviceSecret, serializeDevice } from '../../backend/src/services/deviceService.js';
import { validateTelemetryPayload, waterLevelPercentage } from '../../backend/src/services/telemetryService.js';

test('protects device management and device ingestion endpoints', async () => {
    const app = createApp({ emit() {} });
    const server = app.listen(0);
    await new Promise((resolve) => server.once('listening', resolve));
    const address = server.address();
    const management = await fetch(`http://127.0.0.1:${address.port}/api/v1/devices`);
    const ingest = await fetch(`http://127.0.0.1:${address.port}/api/v1/devices/ingest/heartbeat`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' });
    assert.equal(management.status, 401);
    assert.equal(ingest.status, 401);
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
});

test('enforces device management permissions and never serializes the secret hash', () => {
    assert.equal(canManageDevices({ role: 'SUPER_ADMIN' }), true);
    assert.equal(canManageDevices({ role: 'ORGANIZATION_ADMIN' }), true);
    assert.equal(canManageDevices({ role: 'SUB_ADMIN', permissions: ['devices:manage'] }), true);
    assert.equal(canManageDevices({ role: 'SUB_ADMIN', permissions: [] }), false);
    assert.equal(canManageDevices({ role: 'OPERATOR' }), false);
    assert.match(generateDeviceSecret(), /^hydroos_[A-Za-z0-9_-]+$/);
    assert.equal(serializeDevice({ identifier: 'D-1', secretHash: 'never-return-this' }).secretHash, undefined);
});

test('validates telemetry fields and water-level calculations', () => {
    const telemetry = validateTelemetryPayload({ waterVolume: 4200, flowRate: 12, electricalConductivity: 380, ph: 7.2, batteryLevel: 88, measuredAt: '2026-11-03T10:00:00.000Z' });
    assert.equal(telemetry.values.waterVolume, 4200);
    assert.equal(telemetry.values.electricalConductivity, 380);
    assert.equal(waterLevelPercentage(4200, 10000), 42);
    assert.throws(() => validateTelemetryPayload({ ph: 15 }), /Invalid ph reading/);
    assert.throws(() => validateTelemetryPayload({ batteryLevel: 101 }), /Invalid batteryLevel reading/);
});

test('protects the monitoring endpoints from unauthenticated access', async () => {
    const app = createApp({ emit() {} });
    const server = app.listen(0);
    await new Promise((resolve) => server.once('listening', resolve));
    const address = server.address();
    const response = await fetch(`http://127.0.0.1:${address.port}/api/v1/monitoring/overview`);
    assert.equal(response.status, 401);
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
});
