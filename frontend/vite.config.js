import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true, // Allow external connections (needed for ngrok)
    strictPort: false,
    allowedHosts: [
      '8edc37674f25.ngrok-free.app',
      'a762b207149b.ngrok-free.app',
      '.ngrok-free.app',
      '.ngrok.io'
    ],
    hmr: {
      clientPort: 443 // Use HTTPS port for ngrok
    },
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false
      }
    }
  }
});
