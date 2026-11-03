import test from 'node:test';
import assert from 'node:assert/strict';

process.env.JWT_ACCESS_SECRET = 'test-access-secret-that-is-long-enough';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-that-is-long-enough';

const { hashPassword, verifyPassword, issueTokens, verifyAccessToken, verifyRefreshToken, hashToken } = await import('../../backend/src/services/authService.js');
const { createApp } = await import('../../backend/src/app.js');
const { hasTenantAccess } = await import('../../backend/src/middleware/auth.js');

test('hashes passwords and issues verifiable access and refresh tokens', async () => {
    const hash = await hashPassword('a-secure-password');
    assert.notEqual(hash, 'a-secure-password');
    assert.equal(await verifyPassword('a-secure-password', hash), true);
    assert.equal(await verifyPassword('wrong-password', hash), false);

    const tokens = issueTokens({ id: '507f1f77bcf86cd799439011', role: 'OPERATOR', organizationId: '507f1f77bcf86cd799439012' });
    assert.equal(verifyAccessToken(tokens.accessToken).role, 'OPERATOR');
    assert.equal(verifyRefreshToken(tokens.refreshToken).type, 'refresh');
    assert.notEqual(hashToken(tokens.refreshToken), tokens.refreshToken);
});

test('rejects protected organization routes without authentication', async () => {
    const app = createApp({ emit() {} });
    const server = app.listen(0);
    await new Promise((resolve) => server.once('listening', resolve));
    const address = server.address();
    const response = await fetch(`http://127.0.0.1:${address.port}/api/v1/organizations/507f1f77bcf86cd799439011`);
    const body = await response.json();
    assert.equal(response.status, 401);
    assert.equal(body.success, false);
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
});

test('denies cross-tenant access for organization users', () => {
    assert.equal(hasTenantAccess({ role: 'ORGANIZATION_ADMIN', organizationId: 'org-a' }, 'org-b'), false);
    assert.equal(hasTenantAccess({ role: 'ORGANIZATION_ADMIN', organizationId: 'org-a' }, 'org-a'), true);
    assert.equal(hasTenantAccess({ role: 'SUPER_ADMIN', organizationId: null }, 'org-b'), true);
});
