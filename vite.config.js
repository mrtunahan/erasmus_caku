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

// ── SÜRÜM DAMGASI ──
// ⚠ "Değişiklik yansımadı" şikâyetlerinin çoğu kodda değil, DAĞITIMDA
// oluyordu: tarayıcıda ya da nginx'te önbellekte kalmış eski `index.html`,
// eski parça dosyalarını çağırmaya devam ediyor (dist temizlenmediği için o
// dosyalar hâlâ duruyor) ve kullanıcı aylar önceki uygulamayı çalıştırıyor.
// Hangi sürümün çalıştığı EKRANDAN okunabilsin diye derleme anındaki commit
// ve tarih pakete gömülür.
function surumBilgisi() {
  let commit = 'bilinmiyor';
  try {
    commit = require('child_process').execSync('git rev-parse --short HEAD').toString().trim();
  } catch (_e) {
    /* git yoksa (docker build) sessiz geç */
  }
  return { commit, tarih: new Date().toISOString().slice(0, 16).replace('T', ' ') };
}

export default defineConfig(async () => ({
  plugins: [injectReactImport(), react({ jsxRuntime: 'classic' }), await maybeVisualizer()].filter(
    Boolean
  ),
  define: {
    __SURUM__: JSON.stringify(surumBilgisi()),
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/socket.io': {
        target: 'http://localhost:3001',
        ws: true,
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    // ⚠ ESKİ PARÇALAR SİLİNMEZ. Varsayılan davranış her derlemede dist'i
    // boşaltmaktı; canlıda yeni sürüm yayınlanınca AÇIK DURAN sekmeler hâlâ
    // eski giriş dosyasını çalıştırdığı için artık var olmayan parça adlarını
    // istiyor, nginx 404 dönüyor ve kullanıcı "Modül yüklenemedi" duvarına
    // çarpıyordu (özellikle o oturumda henüz açılmamış modüllerde).
    // Eski parçalar yerinde kalınca açık sekmeler çalışmaya devam eder; yeni
    // sekmeler zaten önbelleğe alınmayan index.html üzerinden yeni parçaları
    // alır. Bedeli dist'in zamanla büyümesidir — arada bir eski
    // assets/ dosyalarını temizlemek yeterli.
    emptyOutDir: false,
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
          // Quill YALNIZ duyuru yazma ekranında kullanılıyor ve ~230 kB.
          // Ortak `vendor` yığınına düşerse index.html'den doğrudan
          // yükleniyor, yani duyuru yazmayan herkes (öğrenciler dahil) her
          // açılışta indiriyordu. Kendi yığınında kalsın ki dinamik import
          // gerçekten geciktirsin.
          if (id.includes('/quill') || id.includes('parchment') || id.includes('quill-delta')) {
            return 'vendor-quill';
          }
          return 'vendor';
        },
      },
    },
    chunkSizeWarningLimit: 500,
  },
}));
