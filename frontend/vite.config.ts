import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// In dev, /api is proxied to the FastAPI backend so the browser never needs the backend URL.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: { '/api': { target: 'http://127.0.0.1:8000', changeOrigin: true } },
  },
  test: {
    environment: 'jsdom',
    include: ['src/test/**/*.test.tsx'],
    testTimeout: 30000,
    env: { VITE_API_BASE: process.env.FIXFLOW_TEST_API ?? 'http://127.0.0.1:8000' },
  },
})
