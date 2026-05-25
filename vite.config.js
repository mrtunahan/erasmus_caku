import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Bundle analyzer — sadece ANALYZE=true ile etkin. Kurulu değilse no-op.
async function maybeVisualizer() {
  if (!process.env.ANALYZE) return null;
  try {
    const { visualizer } = await import('rollup-plugin-visualizer');
    return visualizer({
      filename: 'dist/bundle-stats.html',
      gzipSize: true,
      brotliSize: true,
      open: false,
    });
  } catch (_e) {
    console.warn('[vite] rollup-plugin-visualizer kurulu değil — analiz atlandı');
    return null;
  }
}

// Her JSX dosyasının başına otomatik React import ekle
// (mevcut dosyalar global React kullanıyor, Vite ES module olduğu için import gerekli)
function injectReactImport() {
  return {
    name: 'inject-react-import',
    transform(code, id) {
      if (id.endsWith('.jsx') && !id.includes('node_modules') && !id.endsWith('main.jsx')) {
        return {
          code: `import React from 'react';\n${code}`,
          map: null,
        };
      }
    },
  };
}

export default defineConfig(async () => ({
  plugins: [injectReactImport(), react({ jsxRuntime: 'classic' }), await maybeVisualizer()].filter(
    Boolean
  ),
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      input: 'index.html',
      output: {
        // Büyük ortak satıcı kodu (react, react-dom, socket.io) tek bir vendor
        // chunk'a; her modül halihazırda lazy import edildiği için zaten ayrı
        // chunk olur — burada sadece runtime/vendor split'i yapıyoruz.
        manualChunks(id) {
          if (!id.includes('node_modules')) return;
          if (id.includes('react-dom')) return 'vendor-react-dom';
          if (id.includes('/react/')) return 'vendor-react';
          if (id.includes('socket.io-client')) return 'vendor-socket';
          if (id.includes('lucide-react')) return 'vendor-icons';
          return 'vendor';
        },
      },
    },
    chunkSizeWarningLimit: 500,
  },
}));
