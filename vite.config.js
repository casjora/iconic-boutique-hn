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
      rollupOptions: {
        external: ['pdf2json'],
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              if (id.includes('pdf2json')) return null;

              // 1. Separar las librerías base de React que son pesadas
              if (id.includes('react-dom')) return 'vendor-react-core';
              
              // 2. Tus categorías existentes
              if (id.includes('lucide-react')) return 'vendor-lucide';
              if (id.includes('@supabase')) return 'vendor-supabase';
              if (id.includes('recharts')) return 'vendor-recharts';
              if (id.includes('react-router') || id.includes('react-router-dom')) return 'vendor-router';
              
              // 3. Separar la SDK de Google Gen AI si se asocia al bundle
              if (id.includes('@google/genai')) return 'vendor-gemini-sdk';

              // Fallback para el resto de dependencias pequeñas
              return 'vendor-core';
            }
          },
        },
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});