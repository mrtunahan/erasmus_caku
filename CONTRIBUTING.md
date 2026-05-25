# Katkı rehberi

## Gereksinimler

- Node.js 22 (`.nvmrc` ile sabitlenmiştir)
- MongoDB 6+
- npm 10+

## Geliştirme akışı

```bash
# Bağımlılıklar
npm install
(cd server && npm install)

# Ortam dosyaları
cp .env.example .env
cp server/.env.example server/.env

# İki ayrı terminalde
npm run server:dev   # http://localhost:3001
npm run dev          # http://localhost:5173
```

## Branch & commit

- Feature branch: `feature/<kısa-ad>`
- Hata düzeltme: `fix/<kısa-ad>`
- Commit mesajı: Conventional Commits — `<type>(<scope>): <summary>`
  - `feat`, `fix`, `chore`, `refactor`, `docs`, `test`, `perf`, `ci`
  - Örnek: `fix(staj): pdf çıktısında türkçe karakter`

## PR kuralları

- En az 1 review (CODEOWNERS otomatik atar).
- CI yeşil olmalı (`npm run build`, `npm test`).
- DB şema değişikliği varsa `server/migrations/` altında migration dosyası.
- Yeni endpoint eklerken `server/openapi.yaml` güncelle.
- Güvenlik kritik dosyalarda (`server/middleware/auth.js`, `auditLog.js`,
  `security.js`) ikinci göz şart.

## Stil

- Prettier — `npm run format`
- ESLint — `npm run lint` (gevşek; sadece patlamaması için)
- Mevcut JSX modüllerine yeni kod eklerken **window globals** ve
  `apiRead`/`DBWrite` örüntüsünü koru — büyük refactor ayrı PR'a.

## Test

- Smoke: `npm test`
- Yeni modül eklerken `tests/` altına en az altyapı kontrolü ekle.

## Veritabanı

- Şema değişikliği = migration. Manuel `db.collection.update` ile prod'a
  girmek yasak.
- Yeni koleksiyon eklerken `server/routes/db.js` içindeki
  `ALLOWED_COLLECTIONS` ve `READABLE_COLLECTIONS` listelerini güncelle.
- İndeks eklerken `docs/MONGO_INDEXES.md` belgesini güncelle.

## Güvenlik

- Sırları `.env` içinde tut, repo'ya koyma.
- Kullanıcı girdisini doğrula (input + Mongo query parametreleri).
- Loglarda PII / token / şifre yer almamalı (logger zaten redaction yapar
  ama yine de dikkat et).
