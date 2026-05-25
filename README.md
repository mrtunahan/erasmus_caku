# ÇAKÜ Yönetim Sistemi

Çankırı Karatekin Üniversitesi için geliştirilmiş Erasmus öğrenci ders eşleştirme
ve yönetim sistemi. Vite + React (klasik runtime, modüler lazy-load) frontend,
Express + MongoDB backend, Socket.IO ile gerçek zamanlı güncellemeler.

## Hızlı başlangıç

```bash
# 1) Frontend bağımlılıkları
npm install

# 2) Backend bağımlılıkları
cd server && npm install && cd ..

# 3) Ortam dosyaları
cp .env.example .env                # frontend (opsiyonel)
cp server/.env.example server/.env  # backend (zorunlu: MONGODB_URI, JWT_SECRET)

# 4) Geliştirme — iki ayrı terminal
npm run server:dev   # http://localhost:3001  (API + Socket.IO)
npm run dev          # http://localhost:5173  (Vite, /api → 3001 proxy)
```

Production build:

```bash
npm run build        # dist/ üretir
npm run server       # Express'i başlatır; nginx ile dist/ servis edilmeli
```

## Proje yapısı

```
.
├── index.html                  # Vite girişi (CSP burada)
├── main.jsx                    # window.__lazyModules + AppShell mount
├── shared-components.jsx       # Ortak UI + apiClient + realtime helper
├── *.jsx                       # Modüller (her biri tek dosyada bir feature)
├── public/                     # Statik varlıklar (logo, vb.)
├── server/
│   ├── index.js                # Express + Socket.IO + middleware kompozisyonu
│   ├── config/database.js      # MongoDB connect/disconnect
│   ├── middleware/
│   │   ├── auth.js             # JWT (httpOnly cookie + bearer fallback)
│   │   ├── security.js         # helmet, rate-limit, CORS origin çözücü
│   │   └── errorHandler.js     # Merkezi 404 / hata yakalayıcı
│   ├── routes/                 # auth, db, files, akademisyen, health
│   └── migrations/             # MongoDB migration script'leri
└── ssl-setup/                  # nginx + SSL deploy script'leri
```

## Önemli mimari notlar

- Modüller `window.__lazyModules` üzerinden dinamik yüklenir; her modül kendi
  React bileşenini `window.<ComponentName>` olarak yayınlar. Yeni modül
  eklerken `main.jsx` içindeki haritaya kaydı ve modül sonundaki global
  atamayı unutmayın.
- Cache invalidation `window.apiInvalidate(collection)` ile yapılır;
  Socket.IO `db:write` event'i sunucudan tetikler.
- CSP `index.html` `<meta>` etiketinden yönetilir; `helmet`'in CSP'si
  kapalıdır.
- Her HTTP isteğine `X-Request-Id` eklenir; log'lar ve `audit_logs`
  kayıtları bu ID ile ilişkilendirilir.
- `/api/db/write` çağrıları otomatik olarak `audit_logs` koleksiyonuna
  kaydedilir (fire-and-forget; aksaklık ana isteği etkilemez).
- API sözleşmesi `server/openapi.yaml` dosyasında belgelenir; index
  önerileri `docs/MONGO_INDEXES.md` altındadır.

## Komutlar

| Komut                | Açıklama                              |
| -------------------- | ------------------------------------- |
| `npm run dev`        | Vite dev server                       |
| `npm run server`     | Express prod                          |
| `npm run server:dev` | Express, dosya değişikliğinde restart |
| `npm run build`      | Üretim build'i (`dist/`)              |
| `npm run preview`    | Build çıktısını lokal önizle          |
| `npm run lint`       | ESLint (gevşek; uyarı seviyesinde)    |
| `npm run format`     | Prettier ile biçim                    |
| `npm test`           | Vitest (watch)                        |
| `npm run test:run`   | Vitest (tek seferlik, CI)             |

Server dizininde:

| Komut                    | Açıklama                        |
| ------------------------ | ------------------------------- |
| `npm run migrate`        | MongoDB migration'larını uygula |
| `npm run migrate:status` | Migration durumunu raporla      |

## Ortam değişkenleri

Backend (`server/.env`) — kritik olanlar:

- `MONGODB_URI` (zorunlu)
- `JWT_SECRET` (production'da zorunlu — eksikse process fail-fast eder)
- `ALLOWED_ORIGINS` (CORS whitelist, virgüllü; boşsa request origin'i yansıtılır)
- `NODE_ENV=production`
- `PORT` (varsayılan 3001)

## Deploy

`ssl-setup/` altında nginx config ve SSL sertifika script'leri mevcut.
Tek-konteyner alternatifi için kökte `Dockerfile` (multi-stage) var.

## Geliştirici notları

- Mevcut JSX dosyaları büyük ve `window` global'leri üzerinden konuşur;
  yapısal yeniden düzenleme bilinçli bir adım olarak ertelenmiştir.
- `.eslintrc.cjs` gevşek ayarlıdır — sadece çalışmayı bozacak hataları
  hedefler; stil Prettier'a bırakılmıştır.
- Vite manual-chunks `vendor-react`, `vendor-react-dom`, `vendor-socket`,
  `vendor-icons` ve `vendor` olarak bölünür.
