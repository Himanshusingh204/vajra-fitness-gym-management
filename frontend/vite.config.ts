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
    host: true,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
  preview: {
    port: 4173,
    host: true,
  },
  build: {
    // Modern evergreen browsers: smaller output (native ESM, no legacy polyfills).
    target: 'es2022',
    cssCodeSplit: true,
    // Raise the warning threshold so only genuinely oversized chunks warn.
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react-router')) return 'react-router';
            if (id.includes('@tanstack')) return 'react-query';
            if (id.includes('react-hook-form') || id.includes('@hookform') || id.includes('zod')) return 'forms';
            if (id.includes('axios')) return 'http';
            if (id.includes('lucide-react')) return 'icons';
            if (id.includes('zustand')) return 'state';
            if (id.includes('react') || id.includes('react-dom') || id.includes('scheduler')) return 'react-vendor';
          }
        },
      },
    },
  },
});
