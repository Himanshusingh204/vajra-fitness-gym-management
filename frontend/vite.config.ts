import { defineConfig } from 'vite';
import type { Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { ViteImageOptimizer } from 'vite-plugin-image-optimizer';
import * as viteCompression from 'vite-plugin-compression';

const compression = (viteCompression as unknown as {
  default: (options?: {
    algorithm?: 'gzip' | 'brotliCompress' | 'deflate' | 'deflateRaw';
    threshold?: number;
    deleteOriginFile?: boolean;
  }) => Plugin;
}).default;

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    tailwindcss(),
    react(),
    ViteImageOptimizer({
      test: /\.(jpe?g|png|gif|tiff|webp|svg|avif)$/i,
      png: { quality: 80 },
      jpeg: { quality: 80 },
      jpg: { quality: 80 },
      // Lossy WebP: re-encoding an already-optimized WebP losslessly inflates it.
      webp: { quality: 80, lossless: false },
    }),
    // Emit .gz alongside every JS/CSS/HTML asset so the host can serve
    // pre-compressed files without on-the-fly re-compression.
    compression({ algorithm: 'gzip', threshold: 1024, deleteOriginFile: false }),
  ],
  server: {
    port: 5173,
    host: true
  },
  preview: {
    port: 4173,
    host: true
  },
  build: {
    // Modern evergreen browsers: smaller output (native ESM, no legacy polyfills).
    target: 'es2022',
    cssCodeSplit: true,
    // Raise the warning threshold so only genuinely oversized chunks warn.
    chunkSizeWarningLimit: 600,
    rolldownOptions: {
      output: {
        // Manual vendor splitting via Rolldown codeSplitting groups. Each major
        // dependency gets its own long-lived, cacheable chunk so app code and
        // library code change independently and the browser downloads less on
        // updates.
        codeSplitting: {
          groups: [
            { name: 'react-vendor', test: /node_modules[\\/](react|react-dom|scheduler)[\\/]/ },
            { name: 'react-router', test: /node_modules[\\/]react-router[\\/]/ },
            { name: 'react-query', test: /node_modules[\\/]@tanstack[\\/]/ },
            { name: 'forms', test: /node_modules[\\/](react-hook-form|@hookform|zod)[\\/]/ },
            { name: 'http', test: /node_modules[\\/]axios[\\/]/ },
            { name: 'icons', test: /node_modules[\\/]lucide-react[\\/]/ },
            { name: 'state', test: /node_modules[\\/]zustand[\\/]/ },
          ],
        },
      },
    },
  },
});
