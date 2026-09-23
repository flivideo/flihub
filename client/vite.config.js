import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
export default defineConfig({
    plugins: [react(), tailwindcss()],
    server: {
        port: 5100,
        strictPort: true,
        host: '127.0.0.1', // Loopback only, like the API. Stale tsc output: Vite loads this .js before vite.config.ts
    },
});
