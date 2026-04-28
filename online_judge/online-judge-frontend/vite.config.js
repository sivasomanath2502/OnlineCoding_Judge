import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [react()],
    server: {
      port: 5173,
      // Proxy is only used during dev server — routes /api calls to gateway
      // This avoids CORS issues in local dev
      proxy: {
        '/submissions': { target: 'http://localhost:8090', changeOrigin: true },
        '/results':     { target: 'http://localhost:8090', changeOrigin: true },
        '/admin':       { target: 'http://localhost:8090', changeOrigin: true },
      },
    },
    define: {
      // Makes env variables available at build time
      __GATEWAY_URL__: JSON.stringify(env.VITE_GATEWAY_URL || 'http://localhost:8090'),
    },
  }
})