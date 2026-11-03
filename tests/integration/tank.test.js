import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../../backend/src/app.js';
import { canManageTanks, serializeTank } from '../../backend/src/services/tankService.js';

test('protects the tank resource from unauthenticated access', async () => {
    const app = createApp({ emit() {} });
    const server = app.listen(0);
    await new Promise((resolve) => server.once('listening', resolve));
    const address = server.address();
    const response = await fetch(`http://127.0.0.1:${address.port}/api/v1/tanks`);
    const body = await response.json();
    assert.equal(response.status, 401);
    assert.equal(body.success, false);
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
});

test('allows tank management only for authorized roles and calculates water level', () => {
    assert.equal(canManageTanks({ role: 'SUPER_ADMIN' }), true);
    assert.equal(canManageTanks({ role: 'ORGANIZATION_ADMIN' }), true);
    assert.equal(canManageTanks({ role: 'SUB_ADMIN', permissions: ['tanks:manage'] }), true);
    assert.equal(canManageTanks({ role: 'SUB_ADMIN', permissions: [] }), false);
    assert.equal(canManageTanks({ role: 'OPERATOR' }), false);
    assert.equal(serializeTank({ capacity: 10000, currentWaterLevel: 2750, maximumWaterLevel: 5000 }).waterLevelPercentage, 55);
});
