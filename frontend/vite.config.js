import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Vite configuration for the r/place clone
// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0', // Listen on all network interfaces
    port: 3000,
    // Proxy all requests to the consumer (middleware layer)
    // Consumer will handle both HTTP API and WebSocket connections
    proxy: {
      '/api': {
        target: 'http://localhost:3001',  // Consumer handles API requests
        changeOrigin: true,
      },
      '/ws': {
        target: 'http://localhost:3001',  // Consumer handles WebSocket
        ws: true, // Enable WebSocket proxying
        changeOrigin: true,
      }
    }
  }
})
