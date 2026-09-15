import { defineConfig, Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';

/**
 * Render Static Site SPA Fallback Plugin:
 * 1. Emits 404.html (Render's native SPA fallback for unmatched paths)
 * 2. Emits physical index.html files for /admin, /admin/* and client tabs so direct
 *    route navigation resolves instantly with HTTP 200 on any static hosting.
 */
function renderSpaFallbackPlugin(): Plugin {
  return {
    name: 'render-spa-fallback',
    closeBundle() {
      const distDir = path.resolve(__dirname, 'dist');
      const indexPath = path.join(distDir, 'index.html');
      if (!fs.existsSync(indexPath)) return;

      const content = fs.readFileSync(indexPath, 'utf-8');

      // Universal static site fallback for Render
      fs.writeFileSync(path.join(distDir, '404.html'), content);

      // Direct routes for admin and client tabs
      const routes = [
        'admin',
        'admin/dashboard',
        'admin/content',
        'admin/hero',
        'admin/spotlight',
        'admin/ads',
        'admin/quick-add',
        'admin/editor',
        'admin/users',
        'admin/transactions',
        'admin/genres',
        'admin/design',
        'admin/settings',
        'search',
        'library',
        'wallet',
        'profile'
      ];

      for (const route of routes) {
        const routeDir = path.join(distDir, route);
        if (!fs.existsSync(routeDir)) {
          fs.mkdirSync(routeDir, { recursive: true });
        }
        fs.writeFileSync(path.join(routeDir, 'index.html'), content);
      }
    }
  };
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), renderSpaFallbackPlugin()],
  server: {
    port: 5173,
    host: true,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true
      },
      '/uploads': {
        target: 'http://localhost:5000',
        changeOrigin: true
      }
    }
  }
});

