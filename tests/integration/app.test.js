import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../../backend/src/app.js';

test('exposes versioned API health without a database connection', async () => {
    const app = createApp({ emit() {} });
    const server = app.listen(0);

    await new Promise((resolve) => server.once('listening', resolve));
    const address = server.address();
    const response = await fetch(`http://127.0.0.1:${address.port}/api/v1/health`);
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.deepEqual(body, { success: true, version: 'v1', status: 'ok' });
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
});

test('returns a structured 404 response', async () => {
    const app = createApp({ emit() {} });
    const server = app.listen(0);

    await new Promise((resolve) => server.once('listening', resolve));
    const address = server.address();
    const response = await fetch(`http://127.0.0.1:${address.port}/api/v1/missing`);
    const body = await response.json();

    assert.equal(response.status, 404);
    assert.equal(body.success, false);
    assert.match(body.message, /Route not found/);
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
});

test('handles localhost CORS preflight without redirecting', async () => {
    const app = createApp({ emit() {} });
    const server = app.listen(0);

    await new Promise((resolve) => server.once('listening', resolve));
    const address = server.address();
    const response = await fetch(`http://127.0.0.1:${address.port}/api/v1/auth/register`, {
        method: 'OPTIONS',
        headers: {
            Origin: 'http://localhost:5173',
            'Access-Control-Request-Method': 'POST',
            'Access-Control-Request-Headers': 'content-type'
        },
        redirect: 'manual'
    });

    test('allows credentialed requests from the local loopback origin', async () => {
        const app = createApp({ emit() {} });
        const server = app.listen(0);

        await new Promise((resolve) => server.once('listening', resolve));
        const address = server.address();
        const response = await fetch(`http://127.0.0.1:${address.port}/api/v1/auth/me`, {
            headers: { Origin: 'http://127.0.0.1:5173' }
        });

        assert.equal(response.status, 401);
        assert.equal(response.headers.get('access-control-allow-origin'), 'http://127.0.0.1:5173');
        assert.equal(response.headers.get('access-control-allow-credentials'), 'true');
        await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    });

    assert.equal(response.status, 204);
    assert.equal(response.headers.get('access-control-allow-origin'), 'http://localhost:5173');
    assert.equal(response.headers.get('access-control-allow-credentials'), 'true');
    assert.match(response.headers.get('access-control-allow-methods') || '', /OPTIONS/);
    assert.match(response.headers.get('access-control-allow-headers') || '', /Content-Type/i);
    assert.equal(response.headers.get('location'), null);
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
});

test('keeps the existing static login page available', async () => {
    const app = createApp({ emit() {} });
    const server = app.listen(0);

    await new Promise((resolve) => server.once('listening', resolve));
    const address = server.address();
    const response = await fetch(`http://127.0.0.1:${address.port}/login.html`);
    const body = await response.text();

    assert.equal(response.status, 200);
    assert.match(body, /Welcome to HydroOS/);
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
});
