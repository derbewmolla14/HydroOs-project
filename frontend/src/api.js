import axios from 'axios';

export const api = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL || '/api/v1',
    withCredentials: true,
    headers: { 'Content-Type': 'application/json' }
});
