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
      host: true,
      port: 5173,
      proxy: {
        '/api': {
          target: `http://localhost:${rootEnv.PORT || 5050}`,
          changeOrigin: true,
        },
      },
    },

    build: {
      // Split the heavy libraries out of the critical path. Recharts alone is a large
      // fraction of the bundle and is only needed on the four chart pages — the login
      // screen was downloading it to render a password field.
      rolldownOptions: {
        output: {
          advancedChunks: {
            groups: [
              { name: 'react', test: /node_modules[\\/](react|react-dom|react-router|react-router-dom|scheduler)[\\/]/ },
              { name: 'charts', test: /node_modules[\\/](recharts|d3-.*|victory-.*|internmap|robust-predicates|delaunator)[\\/]/ },
              { name: 'motion', test: /node_modules[\\/](framer-motion|motion-dom|motion-utils)[\\/]/ },
              { name: 'icons', test: /node_modules[\\/]lucide-react[\\/]/ },
            ],
          },
        },
      },
    },
  }
})
