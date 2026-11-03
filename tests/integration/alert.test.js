import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../../backend/src/app.js';
import { canManageAlertLifecycle, canManageAlerts, validateAlertConfig } from '../../backend/src/services/alertService.js';

test('protects alert and notification endpoints from unauthenticated access', async () => {
    const app = createApp({ emit() {} });
    const server = app.listen(0);
    await new Promise((resolve) => server.once('listening', resolve));
    const address = server.address();
    const [alerts, notifications, preferences] = await Promise.all([
        fetch(`http://127.0.0.1:${address.port}/api/v1/alerts`),
        fetch(`http://127.0.0.1:${address.port}/api/v1/notifications`),
        fetch(`http://127.0.0.1:${address.port}/api/v1/notifications/preferences`)
    ]);
    assert.equal(alerts.status, 401);
    assert.equal(notifications.status, 401);
    assert.equal(preferences.status, 401);
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
});

test('enforces alert management permissions and validates threshold relationships', () => {
    assert.equal(canManageAlerts({ role: 'ORGANIZATION_ADMIN' }), true);
    assert.equal(canManageAlerts({ role: 'SUB_ADMIN', permissions: [] }), false);
    assert.equal(canManageAlerts({ role: 'SUB_ADMIN', permissions: ['alerts:manage'] }), true);
    assert.equal(canManageAlertLifecycle({ role: 'OPERATOR', permissions: [] }), false);
    assert.equal(canManageAlertLifecycle({ role: 'OPERATOR', permissions: ['alerts:acknowledge'] }), true);
    assert.throws(() => validateAlertConfig({ waterLevel: { minimum: 100, critical: 200 } }), /Critical water level/);
    assert.throws(() => validateAlertConfig({ quality: { phMin: 8, phMax: 7 } }), /pH minimum/);
    assert.equal(validateAlertConfig({ device: { lowBattery: 20 } }).device.lowBattery, 20);
});
