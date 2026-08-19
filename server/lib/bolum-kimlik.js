// ══════════════════════════════════════════════════════════════
// BÖLÜM KİMLİĞİ — AYNI BÖLÜMÜN BİRDEN ÇOK KİMLİĞİ VAR
//
// Bir bölüm veritabanında birden fazla kimlikle anılabiliyor: `id`, `_id`,
// `_docId`, `code`. Üstelik istemci tarafındaki gömülü çekirdek liste
// (shared-components.jsx → DEPARTMENTS) slug kullanıyor ('bilgisayar'), DB
// kayıtları ise ObjectId. Hangi kimliğin yazıldığı, kaydın NE ZAMAN ve HANGİ
// ekrandan açıldığına bağlı.
//
// Bu yüzden `t.departmentId === s.departmentId` gibi ham eşitlik denetimleri
// aynı bölümü farklı bölüm sanıyor. Somut sonuçları:
//
//   • Şablon çözümünde `find({ scope:'department', departmentId })` bölümün
//     ÖTEKİ kimliğiyle kaydedilmiş şablonu bulamıyor — bölüm şablonu
//     yokmuş gibi davranılıp fakülte/üniversite şablonuna düşülüyor.
//   • Bölüm→fakülte haritası bölüm başına TEK anahtar tutuyordu; gelen kimlik
//     o anahtar değilse `facultyId` boş çıkıyor ve FAKÜLTE ŞABLONU adımı
//     tamamen atlanıyor. Fakülte düzeyinde yüklenen şablon çekirdek
//     bölümlere hiç ulaşmıyordu.
//
// Çözüm: bölümün TÜM kimlikleri tek bir kanonik kimliğe bağlanır; fakülte
// haritası da her kimlik biçimi için anahtar taşır.
// ══════════════════════════════════════════════════════════════

/** Bir bölüm dokümanının taşıdığı tüm kimlik biçimleri. */
function kimlikler(d) {
  if (!d) return [];
  return [d.id, d._docId, d.code, d._id && d._id.toString()]
    .filter(Boolean)
    .map(String)
    .filter((x, i, a) => a.indexOf(x) === i);
}

/**
 * `departments` dokümanlarından kimlik haritaları kurar.
 *
 * @param {Array} dokumanlar
 * @returns {{fakulte:Object, kanonik:Object, varyantlar:Object}}
 *   fakulte    → herhangi bir kimlik → fakülte kimliği
 *   kanonik    → herhangi bir kimlik → o bölümün ASIL kimliği
 *   varyantlar → herhangi bir kimlik → o bölümün tüm kimlikleri
 */
function bolumKimlikHaritasi(dokumanlar) {
  const fakulte = {};
  const kanonik = {};
  const varyantlar = {};
  (dokumanlar || []).forEach((d) => {
    const hepsi = kimlikler(d);
    if (hepsi.length === 0) return;
    // Kanonik: dokümanın kendi tercih sırası (id → _docId → code → _id).
    const asil = hepsi[0];
    const fak = String((d && d.facultyId) || '');
    hepsi.forEach((k) => {
      fakulte[k] = fak;
      kanonik[k] = asil;
      varyantlar[k] = hepsi;
    });
  });
  return { fakulte, kanonik, varyantlar };
}

/**
 * Verilen kimliğin tüm eşdeğerleri. Bilinmeyen kimlik KENDİSİYLE döner —
 * bölüm listesi okunamadıysa sorgu boşa düşmesin.
 */
function bolumVaryantlari(harita, id) {
  const k = String(id || '');
  if (!k) return [];
  const v = harita && harita.varyantlar && harita.varyantlar[k];
  return v && v.length ? v : [k];
}

/** İki kimlik aynı bölümü mü gösteriyor? */
function ayniBolum(a, b, harita) {
  const x = String(a || '');
  const y = String(b || '');
  if (!x || !y) return false;
  const kan = (v) => (harita && harita.kanonik && harita.kanonik[v]) || v;
  return kan(x) === kan(y);
}

module.exports = { bolumKimlikHaritasi, bolumVaryantlari, ayniBolum, kimlikler };
