import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    fs: {
      allow: [
        path.resolve(__dirname, './'),
      ]
    },
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        // Manejar errores transitorios cuando el backend se reinicia (node --watch)
        configure: (proxy) => {
          proxy.on('error', (err, _req, res) => {
            // Si el backend está reiniciándose, devolver 503 en vez de crashear
            if (!res.headersSent && res.writeHead) {
              res.writeHead(503, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ message: 'Servidor reiniciándose, intente de nuevo.' }));
            }
          });
        },
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
      'zod': path.resolve(__dirname, './node_modules/zod'),
    },
  },
});
