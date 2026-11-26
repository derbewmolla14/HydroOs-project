import axios from 'axios';

function normalizeApiBaseUrl(configuredUrl) {
    const value = String(configuredUrl || '/api/v1').trim().replace(/\\/+$/, '');
    if (!value) return '/api/v1';
    if (value === '/api/v1' || value.endsWith('/api/v1')) return value;
    if (value.endsWith('/api')) return `${value}/v1`;
    // A Render service origin alone is not an API prefix. Always include the
    // versioned backend mount so requests never fall through to /auth/*.
    return `${value}/api/v1`;
}

export const api = axios.create({
    baseURL: normalizeApiBaseUrl(import.meta.env.VITE_API_BASE_URL),
    withCredentials: true,
    headers: { 'Content-Type': 'application/json' }
});
