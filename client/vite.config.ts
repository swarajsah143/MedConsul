import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig(({ mode }) => {
  // PORT lives in the repo-root .env, one level above the client.
  const rootEnv = loadEnv(mode, path.resolve(__dirname, '..'), '')

  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      port: 5173,
      proxy: {
        '/api': {
          target: `http://localhost:${rootEnv.PORT || 5050}`,
          changeOrigin: true,
        },
      },
    },
  }
})
