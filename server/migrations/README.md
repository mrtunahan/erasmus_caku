# Migrations

Bu dizindeki dosyalar veritabanı şema/veri migration'larıdır.

## Çalıştırma

```bash
npm --prefix server run migrate           # bekleyenleri uygular
npm --prefix server run migrate:status    # durumu listeler
npm --prefix server run migrate -- --dry  # uygulamaz, neyin çalışacağını gösterir
```

## Yeni migration ekleme

Dosya adı **kronolojik sıralı** olmalı; öneri: `YYYYMMDD_HHMMSS_kısa_isim.js`.

```js
// 20260315_140000_add_unique_studentNumber.js
module.exports = {
  description: 'students.studentNumber için unique index ekle',
  async up(db) {
    // önce dedup yap, sonra index oluştur
    // await db.collection("students").createIndex({ studentNumber: 1 }, { unique: true });
  },
};
```

## Önemli kurallar

- **Idempotent yaz** — aynı migration iki kez çalışsa bile veriyi bozmamalı (runner \_migrations'a yazdığı için normalde bir kez çalışır ama yine de defensive olun).
- **Hata fırlat** — `up()` reject olursa runner durur ve `_migrations`'a yazılmaz; düzeltip tekrar denenebilir.
- **`down()` opsiyoneldir** — runner henüz rollback uygulamıyor; gerekirse ileride eklenir.
- Dosya adı `_migrations` koleksiyonunda anahtardır; **yeniden adlandırma** dosyayı tekrar çalıştırır.
