import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    host: true,
    port: 5173,
    allowedHosts: true,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
  build: {
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-maps': ['leaflet'],
          'vendor-icons': ['lucide-react'],
          'vendor-utils': ['date-fns', 'date-fns-tz', 'clsx', 'tailwind-merge'],
        },
      },
    },
  },
  // @ts-ignore
  test: {
    testTimeout: 30000,
    hookTimeout: 30000,
  },
});
