import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  test: {
    environment: 'jsdom',
    // jsdom defaults to an opaque origin, where localStorage throws and relative
    // URLs cannot resolve. Give it the origin the app actually runs on.
    environmentOptions: { jsdom: { url: 'http://localhost:5173' } },
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/test/**/*.test.tsx'],
    testTimeout: 30000,
    // admin-ui.test.tsx writes to a real Mongo; running it beside the render suite
    // in parallel would interleave writes.
    fileParallelism: false,
  },
})
