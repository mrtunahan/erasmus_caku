// ══════════════════════════════════════════════════════════════
// BÖLÜM KİMLİĞİ (İSTEMCİ) — AYNI BÖLÜMÜN BİRDEN ÇOK KİMLİĞİ VAR
//
// Sunucudaki `server/lib/bolum-kimlik.js` ile aynı kavramı çözer ama GİRDİSİ
// farklıdır: orada ham `departments` dokümanları, burada uygulamanın bölüm
// listesi (`window.DEPARTMENTS`) vardır. Bu listedeki her kayıt, app-shell
// açılışta DB'yi okuyup zenginleştirdiği için bilinen tüm kimliklerini
// `kimlikler` dizisinde taşır.
//
// ── NEDEN GEREKLİ ──
// Çekirdek 6 bölüm koda slug kimliğiyle gömülü ('bilgisayar'); DB'deki aynı
// bölümün kimliği ise ObjectId. Bir kaydın hangisini taşıdığı, o kaydın NE
// ZAMAN ve HANGİ ekrandan açıldığına bağlı. Ham eşitlik (`a === b`) aynı
// bölümü farklı bölüm sanıyor ve şu üç arıza buradan çıktı:
//   • fakülte yetkilisinin anket ataması kimseye ulaşmıyordu
//   • fakülte şablonu çekirdek bölümlere çözülmüyordu
//   • akademisyen kendi bölümünde görünmüyordu
// ══════════════════════════════════════════════════════════════

/**
 * Bir bölümün bilinen TÜM kimlikleri.
 * Listede bulunamazsa kimliğin KENDİSİ döner — süzgeç boşa düşmesin.
 *
 * @param {Array} bolumler `window.DEPARTMENTS` biçimi: { id, kimlikler? }
 * @param {string} bolumId herhangi bir kimlik biçimi
 * @returns {string[]}
 */
export function bolumKimlikleri(bolumler, bolumId) {
  const k = String(bolumId == null ? '' : bolumId);
  if (!k) return [];
  const kayit = (bolumler || []).find(
    (d) =>
      d &&
      (String(d.id) === k || (Array.isArray(d.kimlikler) && d.kimlikler.map(String).includes(k)))
  );
  if (!kayit) return [k];
  const hepsi = [String(kayit.id), ...(Array.isArray(kayit.kimlikler) ? kayit.kimlikler : [])];
  return [...new Set(hepsi.map(String).filter(Boolean))];
}

/** İki kimlik aynı bölümü mü gösteriyor? */
export function ayniBolum(a, b, bolumler) {
  const x = String(a == null ? '' : a);
  const y = String(b == null ? '' : b);
  if (!x || !y) return false;
  if (x === y) return true;
  return bolumKimlikleri(bolumler, x).includes(y);
}
