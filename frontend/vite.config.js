import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Vite configuration for the r/place clone
// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0', // Listen on all network interfaces
    port: 3000,
    // Proxy API requests to the backend server
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      '/ws': {
        target: 'http://localhost:3001',
        ws: true, // Enable WebSocket proxying
        changeOrigin: true,
      }
    }
  }
})
