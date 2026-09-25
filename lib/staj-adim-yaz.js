// ══════════════════════════════════════════════════════════════
// STAJ YOL HARİTASINDA TEK ADIMI YAZMAK
//
// ⚠ ŞİKÂYETİN AYNISI MUAFİYETTE YAŞANDI: "onayladım, geri onaya düştü."
// Sebep aynı KÖR YAZMA idi ve staj tarafında penceresi çok daha geniş:
//
//     const yeni = { ...roadmapData, steps: { ...roadmapData.steps, [i]: {...} } };
//     await yaz(yeni);           // ← HARİTANIN TAMAMI
//
// `roadmapData` ekran AÇILDIĞINDA yüklenmiş bir React state'idir. Öğrenci
// sayfayı açık tutarken akademisyen başka bir adımı onaylarsa, öğrencinin
// "Adımı Tamamla" tıklaması o onayı SİLER — pencere dakikalarcadır. Akademisyen
// tarafında da kayıt 15 saniyelik önbellekten okunup harita tümden yazılıyordu;
// iki yetkili aynı anda çalıştığında biri kayboluyordu.
//
// ── ÇÖZÜM: HARİTAYI DEĞİL ADIMI YAZ ──
// MongoDB tek bir alt alanı adresleyebilir:
//
//     { $set: { 'steps.3': yeniAdim } }
//
// Böylece iki yazıcı FARKLI adımlara dokunduğunda birbirini ezmez. Aynı adıma
// iki karar gelirse son yazan kazanır — bu doğrudur, kaybolan karar olmaz.
//
// ⚠ ADIMIN ESKİ ALANLARI KORUNUR. Red yolu eskiden adımı sıfırdan yazıyordu:
// "kim onaylamıştı, ne zaman" izi siliniyordu. Karar alanları güncellenir,
// geçmiş alanlar yerinde kalır.
// ══════════════════════════════════════════════════════════════

const metin = (v) => String(v == null ? '' : v).trim();

/** Adım indeksi geçerli mi? (0..99 — yol haritası bu kadar uzun olmaz) */
function gecerliIndeks(i) {
  const n = Math.floor(Number(i));
  return Number.isFinite(n) && n >= 0 && n < 100 ? n : -1;
}

/** `steps.3` — adımın kendisi. */
export function adimYolu(indeks) {
  const n = gecerliIndeks(indeks);
  return n < 0 ? '' : 'steps.' + n;
}

/** Tek adımlık yazma yaması: { 'steps.3': {...} }. Boş girdide null. */
export function adimYamasi(indeks, adim) {
  const yol = adimYolu(indeks);
  if (!yol || adim == null) return null;
  return { [yol]: adim };
}

/**
 * Bu anahtar bir adım yolu mu?
 * Sunucu noktalı anahtarı YALNIZ bu biçimde kabul eder; başka bir yol
 * (ör. `updatedAt.x`, `steps.3.__proto__`) alan denetimlerini atlatmanın
 * kapısı olurdu.
 */
const YASAKLI_ALAN = new Set(['__proto__', 'constructor', 'prototype']);

export function adimYoluMu(anahtar) {
  const a = metin(anahtar);
  if (!/^steps\.\d{1,2}(\.[a-zA-Z_][a-zA-Z0-9_]*)?$/.test(a)) return false;
  const parcalar = a.split('.');
  return parcalar.length < 3 || !YASAKLI_ALAN.has(parcalar[2]);
}

/** Yoldaki adım indeksi (yol değilse -1). */
export function yolIndeksi(anahtar) {
  const m = /^steps\.(\d{1,2})/.exec(metin(anahtar));
  return m ? Number(m[1]) : -1;
}

/** Öğrenci adımı tamamladı — onay bekliyor. */
export function tamamlandiAdimi(mevcut, ogrenciNo, simdi) {
  const zaman = (simdi instanceof Date ? simdi : new Date()).toISOString();
  return Object.assign({}, mevcut || {}, {
    status: 'pending_approval',
    completedByStudent: metin(ogrenciNo),
    completedAt: zaman,
  });
}

/** Yetkili adımı onayladı. Eski alanlar (öğrencinin tamamlama izi) korunur. */
export function onayAdimi(mevcut, kim, simdi) {
  const zaman = (simdi instanceof Date ? simdi : new Date()).toISOString();
  const yeni = Object.assign({}, mevcut || {}, {
    status: 'completed',
    approvedBy: metin(kim),
    approvedAt: zaman,
  });
  // Önceki bir red kararı artık geçerli değil; izi `redGecmisi`nde kalır.
  if (yeni.rejectedBy || yeni.rejectedAt) {
    yeni.redGecmisi = (Array.isArray(yeni.redGecmisi) ? yeni.redGecmisi : []).concat([
      { kim: metin(yeni.rejectedBy), tarih: metin(yeni.rejectedAt) },
    ]);
    delete yeni.rejectedBy;
    delete yeni.rejectedAt;
  }
  return yeni;
}

/** Yetkili adımı reddetti. Onay izi SİLİNMEZ — kimin ne yaptığı kayıtta kalır. */
export function redAdimi(mevcut, kim, simdi, gerekce) {
  const zaman = (simdi instanceof Date ? simdi : new Date()).toISOString();
  const yeni = Object.assign({}, mevcut || {}, {
    status: 'rejected',
    rejectedBy: metin(kim),
    rejectedAt: zaman,
  });
  const g = metin(gerekce);
  if (g) yeni.rejectGerekce = g;
  if (yeni.approvedBy || yeni.approvedAt) {
    yeni.onayGecmisi = (Array.isArray(yeni.onayGecmisi) ? yeni.onayGecmisi : []).concat([
      { kim: metin(yeni.approvedBy), tarih: metin(yeni.approvedAt) },
    ]);
    delete yeni.approvedBy;
    delete yeni.approvedAt;
  }
  return yeni;
}

/** Adımların özeti — kaç tamamlandı, kaç onay bekliyor, kaç reddedildi. */
export function adimOzeti(steps) {
  const harita = steps && typeof steps === 'object' ? steps : {};
  const o = { tamam: 0, bekleyen: 0, red: 0 };
  Object.keys(harita).forEach((k) => {
    const d = metin(harita[k] && harita[k].status);
    if (d === 'completed') o.tamam += 1;
    else if (d === 'pending_approval') o.bekleyen += 1;
    else if (d === 'rejected') o.red += 1;
  });
  return o;
}
