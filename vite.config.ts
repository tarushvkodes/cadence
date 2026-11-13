/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const bridgePort = Number(process.env.CADENCE_BRIDGE_PORT ?? 8741);

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      '/api': { target: `http://127.0.0.1:${bridgePort}`, changeOrigin: false },
    },
  },
  // One bundle on purpose: the app runs locally and splitting screens would add loading states mid-demo.
  build: { chunkSizeWarningLimit: 700 },
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
});
