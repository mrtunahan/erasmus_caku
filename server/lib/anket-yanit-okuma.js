// ══════════════════════════════════════════════════════════════
// ANKET YANITLARI — PERSONEL KİMİN YANITINI, NASIL GÖRÜR?
//
// ⚠ İKİ AÇIK VARDI:
//   1) Yanıt kaydı yanıtlayanın BÖLÜMÜNÜ taşımıyordu; Sonuçlar sekmesi bir
//      anketin bütün yanıtlarını getiriyordu. Hem Bilgisayar'a hem Kimya'ya
//      paylaşılan ankette Bilgisayar bölüm yetkilisi Kimya öğrencilerinin
//      yanıtlarını görüp indirebiliyordu.
//   2) Öğrenci yalnız kendi yanıtını okuyabiliyordu ama HER akademisyen
//      /api/db/survey_responses ile bütün yanıtları öğrencinin ADI ve
//      NUMARASIYLA okuyabiliyordu. Ders değerlendirme anketinde öğrencinin
//      dersin hocasına adıyla görünmesi demekti.
//
// KURAL (öğrenci okuması ayrıdır: server/lib/ogrenci-okuma.js):
//   • Kişinin KENDİ yanıtı kimliğiyle döner ("bu anketi doldurdum" bilgisi).
//   • Üniversite yetkilisi   → bütün yanıtlar, ANONİM.
//   • Fakülte/bölüm yetkilisi → yanıtlayanın bölümü kendi alanındaysa, ANONİM.
//   • Akademisyen            → yalnız KENDİ paylaştığı ya da açtığı anketin,
//                              kendi bölümündeki yanıtları, ANONİM.
// Anonim: kimlik alanları (userId, studentNumber, ad) düşer; cevaplar,
// rol, tarih ve bölüm kalır. Anketin kendi bilgi alanları (ör. "Sınıf")
// anketi hazırlayanın kararıdır ve cevapların içinde durur.
// ══════════════════════════════════════════════════════════════

const metin = (v) => String(v == null ? '' : v).trim();
const dizi = (v) => (Array.isArray(v) ? v.filter(Boolean).map(String) : []);
const anahtar = (v) => metin(v).toLocaleLowerCase('tr-TR').replace(/\s+/g, ' ');

/** Yanıtta kimliği açık eden alanlar. */
const KIMLIK_ALANLARI = ['userId', 'studentNumber', 'studentName', 'userName', 'name', 'email'];

/** Yanıtı anonimleştirir (yeni nesne). */
function anonim(doc) {
  const out = { ...doc };
  KIMLIK_ALANLARI.forEach((a) => delete out[a]);
  return out;
}

/** Yanıtlayanın bölümleri (yeni kayıtlarda damgalı, eskilerde çağıran çözer). */
function yanitBolumleri(doc) {
  const d = doc || {};
  const liste = dizi(d.yanitlayanBolumleri);
  if (liste.length > 0) return liste;
  return dizi([d.departmentId]);
}

/** Bu yanıt okuyan kişinin kendisine mi ait? */
function kendiYanitiMi(doc, ben) {
  const k = anahtar(ben);
  if (!k) return false;
  return [doc && doc.userId, doc && doc.studentNumber].some((v) => anahtar(v) === k);
}

/**
 * Personel okuması için süzgeç kurar.
 *
 * @param {object} p
 * @param {object} p.kapsam     anketAktorKapsami çıktısı (universite/fakulte/bolum/akademisyen)
 * @param {string} p.ben        okuyanın kimliği (ad)
 * @param {Set<string>} [p.benimAnketlerim] akademisyenin açtığı ya da paylaştığı anket kimlikleri
 * @returns {(doc:object)=>object|null} görünen hâl ya da null (gizli)
 */
function yanitSuzgeci(p) {
  const k = (p && p.kapsam) || { kapsamTuru: 'bolum', departmentIds: [] };
  const ben = metin(p && p.ben);
  const benimBolumler = dizi(k.departmentIds);
  const anketlerim = (p && p.benimAnketlerim) || new Set();
  return (doc) => {
    if (!doc) return null;
    if (kendiYanitiMi(doc, ben)) return doc;
    if (k.kapsamTuru === 'universite') return anonim(doc);
    const bolumler = yanitBolumleri(doc);
    const alanimda = bolumler.some((b) => benimBolumler.includes(b));
    if (!alanimda) return null;
    if (k.kapsamTuru === 'akademisyen' && !anketlerim.has(metin(doc.surveyId))) return null;
    return anonim(doc);
  };
}

/** Liste okuması. */
function yanitlariSuz(docs, p) {
  const suz = yanitSuzgeci(p);
  return (Array.isArray(docs) ? docs : []).map(suz).filter(Boolean);
}

/**
 * Bölüm damgası olmayan eski yanıtlar için bölüm çözücü: numara ya da ad
 * üzerinden öğrenci/personel kaydına bakılır.
 *
 * @param {Array} ogrenciler [{studentNumber, firstName, lastName, name, departmentId, additionalDepartments}]
 * @param {Array} personel   [{name, departmentId}]
 */
function eskiYanitBolumCozucu(ogrenciler, personel) {
  const numara = new Map();
  const ad = new Map();
  (ogrenciler || []).forEach((o) => {
    if (!o) return;
    const b = dizi([o.departmentId].concat(dizi(o.additionalDepartments)));
    if (metin(o.studentNumber)) numara.set(metin(o.studentNumber), b);
    const tam = anahtar([o.firstName, o.lastName].filter(Boolean).join(' ') || o.name);
    if (tam && !ad.has(tam)) ad.set(tam, b);
  });
  (personel || []).forEach((x) => {
    const a = anahtar(x && x.name);
    if (a && !ad.has(a)) ad.set(a, dizi([x.departmentId]));
  });
  return (doc) => {
    if (!doc || yanitBolumleri(doc).length > 0) return doc;
    const b =
      numara.get(metin(doc.studentNumber)) ||
      numara.get(metin(doc.userId)) ||
      ad.get(anahtar(doc.userId)) ||
      [];
    return b.length > 0 ? { ...doc, yanitlayanBolumleri: b } : doc;
  };
}

module.exports = {
  KIMLIK_ALANLARI,
  anonim,
  yanitBolumleri,
  kendiYanitiMi,
  yanitSuzgeci,
  yanitlariSuz,
  eskiYanitBolumCozucu,
};
