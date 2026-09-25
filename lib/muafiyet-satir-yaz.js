// ══════════════════════════════════════════════════════════════
// TEK SATIRI YAZMAK — "ONAYLADIM, GERİ ONAYA DÜŞTÜ" HATASI
//
// ⚠ ŞİKÂYET: akademisyen telefonda dersleri onaylıyor, bir süre sonra
// bazıları yeniden "karar bekliyor" oluyordu.
//
// SEBEP: karar yazarken TÜM `matches` dizisi geri yazılıyordu:
//
//     const data = await oku(kayit);        // ← o anki hâli
//     data.matches[3].adminDecision = 'confirmed';
//     await yaz({ matches: data.matches }); // ← DİZİNİN TAMAMI
//
// Bu bir KÖR YAZMADIR: okuma ile yazma arasında başka bir karar (başka
// sekme, başka cihaz, öğrencinin düzeltmesi, 15 saniyelik okuma önbelleği)
// kayda girdiyse, eski dizi onun üzerine yazılır ve o satır kararsız hâline
// DÖNER. Telefonda bağlantı yavaş olduğu için pencere büyüyor, hata orada
// görülüyordu; masaüstünde taze okumayla düzelmiş gibi oluyordu.
//
// ── ÇÖZÜM: DİZİYİ DEĞİL, SATIRI YAZ ──
// MongoDB tek bir dizi elemanını adresleyebilir:
//
//     { $set: { 'matches.3': yeniSatir } }
//
// Böylece iki yazıcı FARKLI satırlara dokunduğunda birbirini ezemez. Aynı
// satıra iki karar gelirse son yazan kazanır — bu doğru davranıştır, kaybolan
// bir karar olmaz.
//
// ⚠ SAYAÇLAR İSTEMCİDEN ALINMAZ. `pendingReviewCount` gibi alanlar dizinin
// tamamından türer; bayat bir diziden hesaplanırsa yine yanlış olur. Sunucu
// yazmadan SONRA kaydın kendisine bakıp yeniden hesaplar (bkz. sayaclar).
// ══════════════════════════════════════════════════════════════

const metin = (v) => String(v == null ? '' : v).trim();

// Alan adı gibi görünen ama dilin kancası olan adlar hiçbir yolda geçmez.
const YASAKLI_ALAN = new Set(['__proto__', 'constructor', 'prototype']);

/** `matches.3` — satırın kendisi. */
export function satirYolu(indeks) {
  const i = Math.floor(Number(indeks));
  if (!Number.isFinite(i) || i < 0) return '';
  return 'matches.' + i;
}

/** `matches.3.adminDecision` — satırın tek alanı. */
export function satirAlanYolu(indeks, alan) {
  const yol = satirYolu(indeks);
  const a = metin(alan);
  if (!yol || !/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(a) || YASAKLI_ALAN.has(a)) return '';
  return yol + '.' + a;
}

/** Tek satırlık yazma yaması: { 'matches.3': {...} }. */
export function satirYamasi(indeks, satir) {
  const yol = satirYolu(indeks);
  if (!yol) return null;
  return { [yol]: satir };
}

/** Akademisyenin kararını taşıyan yeni satır (eski alanlar korunur). */
export function kararSatiri(mevcut, karar, gerekce, kim, simdi) {
  const zaman = (simdi instanceof Date ? simdi : new Date()).toISOString();
  return Object.assign({}, mevcut || {}, {
    adminDecision: metin(karar),
    adminNote: metin(gerekce),
    adminDecidedBy: metin(kim),
    adminUpdatedAt: zaman,
  });
}

/**
 * Bu anahtar bir dizi-satırı yolu mu?
 * Sunucu, noktalı anahtarları YALNIZ bu biçimde kabul eder; başka bir
 * noktalı yol (ör. `status.x`) alan denetimlerini atlatmanın kapısı olurdu.
 */
export function satirYoluMu(anahtar) {
  const a = metin(anahtar);
  if (!/^matches\.\d+(\.[a-zA-Z_][a-zA-Z0-9_]*)?$/.test(a)) return false;
  // `matches.3.__proto__` biçim olarak geçerli görünür ama bir alan adı
  // DEĞİL, dilin kendi kancasıdır: belgeye böyle bir anahtar yazılırsa kayıt
  // sonradan okunduğunda beklenmedik şeyler yapar. Kapı burada kapanır.
  const parcalar = a.split('.');
  return parcalar.length < 3 || !YASAKLI_ALAN.has(parcalar[2]);
}

/** Yoldaki satır indeksi (yol değilse -1). */
export function yolIndeksi(anahtar) {
  const m = /^matches\.(\d+)/.exec(metin(anahtar));
  return m ? Number(m[1]) : -1;
}

/**
 * Sayaçlar — kaydın KENDİ dizisinden hesaplanır.
 * Öğrencinin vazgeçtiği satır bekleyene sayılmaz (lib/muafiyet-yeniden.js
 * ile aynı kural).
 */
export function sayaclar(matches) {
  const ms = Array.isArray(matches) ? matches : [];
  let bekleyen = 0;
  let onayli = 0;
  let red = 0;
  ms.forEach((m) => {
    if (!m) return;
    const karar = metin(m.adminDecision).toLocaleLowerCase('tr');
    if (karar === 'confirmed' || karar === 'approved') {
      onayli += 1;
      return;
    }
    if (karar === 'rejected' || karar === 'red') {
      red += 1;
      return;
    }
    if (m.ogrenciVazgecti) return;
    // ── KARARSIZ SATIR HER ZAMAN "BEKLİYOR" DEĞİLDİR ──
    // Sihirbazla açılan taleplerde eşleştirmenin kendisi `tier` ile
    // etiketleniyor: `approved` satır otomatik muaf, `rejected` satır
    // otomatik red sayılır ve akademisyenin önüne DÜŞMEZ. Bunları bekleyene
    // saymak, olmayan bir işi "1 ders onay bekliyor" diye göstermek olurdu.
    // Öğrenci formunda her satır `tier: 'review'`tır, yani gerçekten bekler.
    const tier = metin(m.tier).toLocaleLowerCase('tr');
    if (tier === 'approved') onayli += 1;
    else if (tier === 'rejected') red += 1;
    else bekleyen += 1;
  });
  return { pendingReviewCount: bekleyen, approvedCount: onayli, rejectedCount: red };
}

/**
 * Birden çok satırın tek yamada yazılması: { 'matches.0': {...}, 'matches.4': {...} }.
 *
 * Girdi bir nesne ({ 0: satir }) ya da çift listesi ([[0, satir]]) olabilir.
 * Yalnız DEĞİŞEN satırlar verilir; dokunulmayan satır yamada yer almaz ve
 * böylece aradaki başka bir kararın üzerine yazılmaz. Boş girdi `null` döner:
 * çağıran "yazacak bir şey yok" ile "her şeyi yaz"ı karıştırmasın.
 */
export function satirlarYamasi(girdiler) {
  const ciftler = Array.isArray(girdiler) ? girdiler : Object.entries(girdiler || {});
  const yama = {};
  let adet = 0;
  ciftler.forEach((cift) => {
    if (!Array.isArray(cift)) return;
    const yol = satirYolu(cift[0]);
    if (!yol || cift[1] == null) return;
    yama[yol] = cift[1];
    adet += 1;
  });
  return adet ? yama : null;
}
