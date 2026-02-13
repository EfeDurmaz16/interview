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
          // Prevent huge localhost cookies from being forwarded to the WS backend,
          // which can trigger 413/431 errors during the handshake.
          configure: (proxy) => {
            const stripCookies = (proxyReq: any) => {
              if (proxyReq?.removeHeader) proxyReq.removeHeader('cookie');
            };

            proxy.on('proxyReq', stripCookies);
            proxy.on('proxyReqWs', stripCookies);
          },
        },
        // LSP proxy — browser'dan gelen /lsp WebSocket isteklerini
        // lsp-ws-proxy'ye (Intelephense gateway) yonlendirir
        '/lsp': {
          target: 'ws://127.0.0.1:9999',
          ws: true,
          rewrite: (path) => path.replace(/^\/lsp/, ''),
        },
      },
    },
    optimizeDeps: {
      exclude: ['php-wasm'], // ⭐⭐⭐ EN KRİTİK SATIR
    },
  };
});
