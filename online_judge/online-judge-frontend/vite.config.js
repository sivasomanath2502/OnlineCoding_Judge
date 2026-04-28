// vite.config.js — clean version
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/submissions': { target: 'http://localhost:8090', changeOrigin: true },
      '/results':     { target: 'http://localhost:8090', changeOrigin: true },
      '/admin':       { target: 'http://localhost:8090', changeOrigin: true },
    },
  },
})