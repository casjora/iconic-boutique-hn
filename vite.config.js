import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    build: {
      target: 'esnext',
      cssCodeSplit: true,
      rollupOptions: {
        external: ['pdf2json'],
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              if (id.includes('pdf2json')) return null;

              // 1. Separar librerías base de React
              if (id.includes('react-dom') || id.includes('react/')) return 'vendor-react-core';
              
              // 2. Chunks específicos por módulos
              if (id.includes('lucide-react')) return 'vendor-lucide';
              if (id.includes('@supabase')) return 'vendor-supabase';
              if (id.includes('recharts')) return 'vendor-recharts';
              if (id.includes('react-router')) return 'vendor-router';
              if (id.includes('@google/genai')) return 'vendor-gemini-sdk';

              // Fallback para resto de dependencias
              return 'vendor-core';
            }
          },
        },
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
      proxy: {
        '/api': {
          target: 'http://localhost:3000',
          changeOrigin: true,
        },
      },
    },
  };
});