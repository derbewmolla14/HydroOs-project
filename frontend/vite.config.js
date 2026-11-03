import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
    root: '.',
    plugins: [react(), tailwindcss()],
    server: {
        port: 5173,
        proxy: {
            '/api': 'http://localhost:3000',
            '/health': 'http://localhost:3000',
            '/socket.io': {
                target: 'http://localhost:3000',
                ws: true
            }
        }
    }
});
