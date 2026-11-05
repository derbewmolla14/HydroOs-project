import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const configDirectory = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(configDirectory, '../../.env'), quiet: true });
dotenv.config({ quiet: true });

const required = (name) => {
    const value = process.env[name]?.trim();
    return value || undefined;
};

const parseOrigins = () => [...new Set((process.env.CLIENT_ORIGINS || process.env.CLIENT_ORIGIN || 'http://localhost:5173')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)
    .concat(process.env.NODE_ENV === 'production' ? [] : ['http://localhost:5173', 'http://127.0.0.1:5173']))];

const parseTtl = (name, fallback) => {
    const value = process.env[name]?.trim() || fallback;
    if (!/^\d+(s|m|h|d|w|y)$/.test(value)) throw new Error(`${name} must use a JWT duration such as 15m or 7d.`);
    return value;
};

const parsePort = () => {
    const port = Number.parseInt(process.env.PORT || '3000', 10);
    if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT must be an integer between 1 and 65535.');
    return port;
};

export const env = Object.freeze({
    nodeEnv: process.env.NODE_ENV || 'development',
    port: parsePort(),
    mongodbUri: required('MONGODB_URI'),
    clientOrigin: required('CLIENT_ORIGIN') || 'http://localhost:5173',
    clientOrigins: parseOrigins(),
    adminPassword: required('ADMIN_PASSWORD'),
    jwtAccessSecret: required('JWT_ACCESS_SECRET'),
    jwtRefreshSecret: required('JWT_REFRESH_SECRET'),
    accessTokenTtl: parseTtl('ACCESS_TOKEN_TTL', '15m'),
    refreshTokenTtl: parseTtl('REFRESH_TOKEN_TTL', '7d'),
    bootstrapSecret: required('SUPER_ADMIN_BOOTSTRAP_SECRET'),
    email: {
        provider: (process.env.EMAIL_PROVIDER || 'none').trim().toLowerCase(),
        apiKey: required('RESEND_API_KEY'),
        from: required('EMAIL_FROM') || 'HydroOS <no-reply@example.com>'
    },
    cloudinary: {
        cloudName: required('CLOUDINARY_CLOUD_NAME'),
        apiKey: required('CLOUDINARY_API_KEY'),
        apiSecret: required('CLOUDINARY_API_SECRET')
    },
    cookie: {
        sameSite: (process.env.COOKIE_SAME_SITE || (process.env.NODE_ENV === 'production' ? 'none' : 'lax')).toLowerCase(),
        domain: required('COOKIE_DOMAIN')
    }
});

export function assertRuntimeConfig() {
    if (!env.mongodbUri || !env.jwtAccessSecret || !env.jwtRefreshSecret) {
        throw new Error('MONGODB_URI, JWT_ACCESS_SECRET, and JWT_REFRESH_SECRET must be configured before starting the server.');
    }
    if (!['lax', 'strict', 'none'].includes(env.cookie.sameSite)) throw new Error('COOKIE_SAME_SITE must be lax, strict, or none.');
    if (env.cookie.sameSite === 'none' && env.nodeEnv === 'production' && !env.cookie.domain && !env.clientOrigins.every((origin) => origin.startsWith('https://'))) {
        throw new Error('COOKIE_SAME_SITE=none in production requires HTTPS frontend origins.');
    }
}
