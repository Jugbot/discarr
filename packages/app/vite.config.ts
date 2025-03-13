/// <reference types="vitest" />
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react-swc'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './setup-tests.ts',
    mockReset: true,
    // vitest does not load .env.development by default
    env: loadEnv('development', process.cwd()),
    includeSource: ['src/**/*.ts'],
  },
  define: {
    'import.meta.vitest': 'undefined',
  },
})
