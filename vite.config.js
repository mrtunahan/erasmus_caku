import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

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

export default defineConfig({
  plugins: [
    injectReactImport(),
    react({ jsxRuntime: 'classic' }),
  ],
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: 'index.html',
    },
    // Code splitting için chunk boyut uyarı limitini artır
    chunkSizeWarningLimit: 300,
  },
});
