import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Proxy all /api/* requests to the Express backend
      '/api': {
        target: 'http://localhost:3002',
        changeOrigin: true,
        secure: false,
        // Don't follow redirects server-side — let the browser handle them
        // (critical for OAuth flows that return 302 → accounts.google.com)
        followRedirects: false,
      },
    },
  },
})
