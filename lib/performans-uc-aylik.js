// ══════════════════════════════════════════════════════════════
// ÜÇ AYLIK GÖSTERGE ŞABLONU — SATIR → GÖSTERGE EŞLEMESİ
//
// Şablondaki (xlsx) sarı satırlar gösterge ADIYLA eşleşiyordu: gösterge
// yeniden adlandırılınca ya da Excel'de biraz farklı yazılınca satır boş
// kalıyordu. Artık eşleme kalıcıdır (performance_uc_aylik_esleme):
//   satır anahtarı (normalleştirilmiş ad) → gostergeId
// Ad eşleşmesi yalnız eşleme yoksa denenir; ad ile eşleşen satır da ilk
// çıktıda eşlemeye yazılır, böylece sonraki ad değişiklikleri onu bozmaz.
// ══════════════════════════════════════════════════════════════

/** Satır/gösterge adının karşılaştırma anahtarı (şablon motorundaki xlNorm ile aynı). */
export function satirAnahtari(s) {
  return String(s || '')
    .replace(/&amp;/g, '&')
    .replace(/&#10;/g, ' ')
    .toLocaleLowerCase('tr-TR')
    .replace(/\s+/g, ' ')
    .replace(/[^\wçğıöşü ]/gi, '')
    .trim();
}

/** Eşleme kaydının belge kimliği. */
export function eslemeKimligi(anahtar) {
  return (
    'm_' +
    String(anahtar || '')
      .replace(/[^\wçğıöşü]/gi, '_')
      .slice(0, 140)
  );
}

/** Kayıt listesi → { anahtar: gostergeId } */
export function eslemeHaritasi(kayitlar) {
  const h = {};
  (Array.isArray(kayitlar) ? kayitlar : []).forEach((k) => {
    if (k && k.anahtar && k.gostergeId) h[k.anahtar] = k.gostergeId;
  });
  return h;
}

/**
 * Şablon motoruna verilecek { satırAnahtarı: [3 aylık değer] }.
 * Önce göstergenin kendi adı, sonra kalıcı eşlemeler (eşleme ad eşleşmesini ezer).
 * @param {{id:string, ad:string}[]} gostergeler
 * @param {object} esleme  { anahtar: gostergeId }
 * @param {(g) => any[]} degerler  göstergenin üç aylık değerleri
 */
export function satirDegerleri(gostergeler, esleme, degerler) {
  const byId = {};
  const out = {};
  (gostergeler || []).forEach((g) => {
    if (!g || !g.id) return;
    byId[g.id] = g;
    out[satirAnahtari(g.ad)] = degerler(g);
  });
  Object.entries(esleme || {}).forEach(([anahtar, gid]) => {
    if (byId[gid]) out[anahtar] = degerler(byId[gid]);
  });
  return out;
}

/**
 * Ad ile eşleşmiş ama henüz eşlemesi olmayan satırlar → yazılacak eşlemeler.
 * @param {string[]} eslesenSatirlar  şablon motorunun `matched` listesi
 */
export function yeniEslemeler(eslesenSatirlar, gostergeler, esleme) {
  const adIle = {};
  (gostergeler || []).forEach((g) => {
    if (g && g.id) adIle[satirAnahtari(g.ad)] = g.id;
  });
  const out = [];
  const gorulen = new Set();
  (eslesenSatirlar || []).forEach((satir) => {
    const anahtar = satirAnahtari(satir);
    if (!anahtar || gorulen.has(anahtar) || (esleme && esleme[anahtar])) return;
    gorulen.add(anahtar);
    if (adIle[anahtar])
      out.push({ anahtar, satir: String(satir).trim(), gostergeId: adIle[anahtar] });
  });
  return out;
}
