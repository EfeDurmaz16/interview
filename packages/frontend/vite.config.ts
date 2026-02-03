import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const wsPort =
    process.env.VITE_WS_PORT ||
    process.env.WS_PORT ||
    env.VITE_WS_PORT ||
    env.WS_PORT ||
    '8080';

  return {
    plugins: [react()],
    server: {
      port: 3000,
      proxy: {
        '/api': 'http://localhost:8000',
        '/ws': {
          target: `ws://127.0.0.1:${wsPort}`,
          ws: true,
        },
      },
    },
    optimizeDeps: {
      exclude: ['php-wasm'], // ⭐⭐⭐ EN KRİTİK SATIR
    },
  };
});
