import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    // Proxy /api/* to the local backend when running without Supabase env vars
    proxy: {
      '/api': 'http://localhost:3001',
    },
  },
})
