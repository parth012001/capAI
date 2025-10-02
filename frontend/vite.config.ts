import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/auto-drafts': 'http://localhost:3000',
      '/api': 'http://localhost:3000',
      '/auth/google': 'http://localhost:3000', // Only proxy backend auth endpoints
      '/auth/signin': 'http://localhost:3000',
      '/auth/signup': 'http://localhost:3000',
      '/emails': 'http://localhost:3000',
      '/calendar': 'http://localhost:3000',
      '/promotional-emails': 'http://localhost:3000',
      '/learning': 'http://localhost:3000'
    }
  }
})
