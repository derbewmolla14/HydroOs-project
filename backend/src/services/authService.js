import crypto from 'node:crypto';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

const HASH_ROUNDS = 12;

export function hashPassword(password) {
    return bcrypt.hash(password, HASH_ROUNDS);
}

export function verifyPassword(password, hash) {
    return bcrypt.compare(password, hash);
}

export function hashToken(token) {
    return crypto.createHash('sha256').update(token).digest('hex');
}

export function issueTokens(user) {
    const claims = {
        sub: user.id,
        role: user.role,
        organizationId: user.organizationId?.toString() || null
    };
    const accessToken = jwt.sign(claims, env.jwtAccessSecret, { expiresIn: env.accessTokenTtl });
    const refreshToken = jwt.sign({ sub: user.id, type: 'refresh' }, env.jwtRefreshSecret, { expiresIn: env.refreshTokenTtl });
    return { accessToken, refreshToken };
}

export function verifyAccessToken(token) {
    return jwt.verify(token, env.jwtAccessSecret);
}

export function verifyRefreshToken(token) {
    return jwt.verify(token, env.jwtRefreshSecret);
}

export function setAuthCookies(res, tokens) {
    const secure = env.nodeEnv === 'production';
    const cookieOptions = { httpOnly: true, secure, sameSite: env.cookie.sameSite, ...(env.cookie.domain ? { domain: env.cookie.domain } : {}) };
    res.cookie('hydroos_access', tokens.accessToken, { ...cookieOptions, maxAge: 15 * 60 * 1000, path: '/' });
    res.cookie('hydroos_refresh', tokens.refreshToken, { ...cookieOptions, maxAge: 7 * 24 * 60 * 60 * 1000, path: '/api/v1/auth' });
}

export function clearAuthCookies(res) {
    const cookieOptions = { httpOnly: true, secure: env.nodeEnv === 'production', sameSite: env.cookie.sameSite, ...(env.cookie.domain ? { domain: env.cookie.domain } : {}) };
    res.clearCookie('hydroos_access', { ...cookieOptions, path: '/' });
    res.clearCookie('hydroos_refresh', { ...cookieOptions, path: '/api/v1/auth' });
}
