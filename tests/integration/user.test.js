import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../../backend/src/app.js';

test('protects user management from unauthenticated access', async () => {
    const app = createApp({ emit() {} });
    const server = app.listen(0);
    await new Promise((resolve) => server.once('listening', resolve));
    const address = server.address();
    const response = await fetch(`http://127.0.0.1:${address.port}/api/v1/users`);
    const body = await response.json();
    assert.equal(response.status, 401);
    assert.equal(body.success, false);
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
});
