import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5100,
    strictPort: true,
    host: true, // Bind to 0.0.0.0 — accessible via Tailscale from other machines
  },
});
