// ══════════════════════════════════════════════════════════════
// YAZMA İSTEĞİNİN GİRDİ DOĞRULAMASI
//
// ⚠ SORUN 1 — TİP KARIŞIKLIĞI (NoSQL enjeksiyonu):
// `/api/db/write` gövdesindeki `docId` hiçbir yerde "metin mi" diye
// sorulmadan Mongo süzgecine konuyordu:
//
//     const byId = await col.findOne({ _id: op.docId });   // ← nesne olabilir
//     await col.deleteOne({ _id: op.docId });
//
// İstemci `docId` yerine `{"$ne": null}` gönderirse Mongo bunu ALAN DEĞERİ
// değil OPERATÖR sayar: `findOne` koleksiyonun ilk belgesini bulur, `deleteOne`
// rastgele bir belgeyi siler, `updateOne` rastgele bir belgeye yazar. İstek
// tekrarlandıkça koleksiyon boşalır. `docId.length === 24` kontrolü bir nesnede
// `undefined` döndüğü için hiçbir şeyi engellemiyordu.
//
// ⚠ SORUN 2 — ALT KOLEKSİYON ADI DENETİMSİZ:
// `getCollectionName` "<koleksiyon>_<altKoleksiyon>" adını kuruyor ama izin
// listesi yalnız ÜST adı denetliyordu; istemci istediği adı uydurup yeni
// koleksiyonlar açabiliyordu.
//
// KURAL: kimlik alanları METİNDİR ve dar bir karakter kümesindendir. Bu dosya
// yalnız BİÇİM denetler; kimin neye dokunabileceği (sahiplik/rol) ayrı
// katmanın işidir (routes/db.js → enforceWritePolicies).
// ══════════════════════════════════════════════════════════════

// Belge kimlikleri: MongoDB ObjectId (24 hex), uygulamanın ürettiği 20
// karakterlik kimlikler, `{öğrenciNo}__{dönem}` gibi bileşik anahtarlar ve
// `yk-…` önekli kimlikler. Tümü şu kümeye sığar.
const KIMLIK_DESENI = /^[A-Za-z0-9._:@-]{1,128}$/;
const ALT_KOLEKSIYON_DESENI = /^[a-z][a-z0-9_]{0,40}$/;

/** Değer güvenli bir belge kimliği mi? (metin olmayan her şey reddedilir) */
function gecerliKimlik(deger) {
  return typeof deger === 'string' && KIMLIK_DESENI.test(deger);
}

/**
 * Tek bir yazma işleminin girdi biçimini doğrular.
 * Dönüş: { gecerli, hata }
 *
 * ⚠ `docId` OLMAYABİLİR (yeni kayıt eklenirken); ama VARSA metin olmalıdır.
 * Boş dize de kimlik değildir: `{_id: ''}` hiçbir belgeyi bulmaz ama
 * `upsert` ile boş kimlikli çöp belge yaratır.
 */
function yazmaGirdisiGecerliMi(op) {
  if (!op || typeof op !== 'object') return { gecerli: false, hata: 'İşlem gövdesi geçersiz.' };

  if (typeof op.collection !== 'string' || !op.collection) {
    return { gecerli: false, hata: 'Koleksiyon adı metin olmalı.' };
  }

  for (const alan of ['docId', 'parentDocId']) {
    const deger = op[alan];
    if (deger === undefined || deger === null) continue;
    if (!gecerliKimlik(deger)) {
      return { gecerli: false, hata: `Geçersiz ${alan}: kimlik metin olmalı.` };
    }
  }

  if (op.subCollection !== undefined && op.subCollection !== null) {
    if (typeof op.subCollection !== 'string' || !ALT_KOLEKSIYON_DESENI.test(op.subCollection)) {
      return { gecerli: false, hata: 'Geçersiz alt koleksiyon adı.' };
    }
  }

  // `data` bir nesne olmalı (dizi de değil): dizi gönderilirse Mongo'ya
  // beklenmedik bir gövde gider.
  if (op.data !== undefined && op.data !== null) {
    if (typeof op.data !== 'object' || Array.isArray(op.data)) {
      return { gecerli: false, hata: 'Veri gövdesi nesne olmalı.' };
    }
  }

  return { gecerli: true, hata: '' };
}

/**
 * Belge kimliği, sahipliği KENDİSİ söylüyor mu?
 *
 * Projede yerleşik bir kalıp var: kimi kayıtların belge kimliği öğrenci
 * numarasını taşıyor —
 *   student_courses  → "2021001__2026-guz"
 *   club_followers   → "<kulüpId>__2021001"
 *   student_profiles → "2021001"
 *
 * ⚠ NİÇİN GEREKLİ: sahiplik denetimi belgenin İÇİNDEKİ alanlara bakıyor
 * (`studentNumber`, `_owner`…). Bu alanlar sonradan eklendi; daha ÖNCE
 * yazılmış kayıtlarda yok. Sahipsiz belgeye yazmayı tümden kapatınca, eski
 * kaydını güncellemek isteyen öğrenci (ders seçimini değiştirmek, kulüp
 * takibini bırakmak) kendi kaydından dışlanırdı. Numara kimliğin İÇİNDE tam
 * bir parça olarak geçiyorsa sahiplik bellidir.
 *
 * Numara "tam parça" olarak aranır: "2021001" ile "12021001" karışmaz.
 */
function docIdSahibiMi(docId, numaralar) {
  const kimlik = typeof docId === 'string' ? docId.trim() : '';
  if (!kimlik) return false;
  const liste = (Array.isArray(numaralar) ? numaralar : [numaralar])
    .map((n) => String(n == null ? '' : n).trim())
    .filter(Boolean);
  if (liste.length === 0) return false;
  const parcalar = kimlik.split('__');
  return liste.some((no) => kimlik === no || parcalar.includes(no));
}

module.exports = { KIMLIK_DESENI, gecerliKimlik, yazmaGirdisiGecerliMi, docIdSahibiMi };
