// ══════════════════════════════════════════════════════════════
// ANKET SONUÇ KIRILIMLARI — ders · hoca · yanıtlayan bölüm · bilgi alanı
//
// Sonuç raporu yalnız anketin tamamını gösteriyordu. Ders değerlendirme
// anketinde asıl soru "hangi ders, hangi hoca nasıl değerlendirildi?";
// fakülte anketinde "hangi bölümden kaç kişi katıldı, memnuniyet bölüme
// göre nasıl?". Burada her grup için yanıt sayısı ve genel ortalama
// (5 üzerinden, anket-istatistik.js → genelOrtalama ile aynı hesap) çıkar.
//
// Hoca bilgisi yanıtta yoktur: dersin kodundan ders kataloğu
// (sinav_dersler) üzerinden bulunur. Katalog verilmezse hoca kırılımı
// çıkmaz. Yanıtlar anonimdir; kırılım kimlik açmaz.
// ══════════════════════════════════════════════════════════════

import { genelOrtalama } from './anket-istatistik.js';

const metin = (v) => String(v == null ? '' : v).trim();
const kodNormal = (v) => metin(v).toLocaleUpperCase('tr-TR').replace(/\s+/g, '');

// Bilgi alanı ancak bu kadar farklı değer alıyorsa kırılım olur; daha
// fazlası (ad, numara, serbest metin) gruplama değil listedir.
const BILGI_UST_SINIR = 15;

/**
 * @param {object} survey
 * @param {object[]} yanitlar
 * @param {(r:object) => string} grupOf  yanıtın grubu ('' → dışarıda kalır)
 * @param {(grup:string) => string} [etiketOf]
 * @returns {{grup:string, etiket:string, n:number, ortalama:number|null}[]}
 *          yanıt sayısına göre azalan, eşitlikte ada göre
 */
export function grupla(survey, yanitlar, grupOf, etiketOf) {
  const sorular = (survey && survey.questions) || [];
  const gruplar = new Map();
  (yanitlar || []).forEach((r) => {
    const g = metin(grupOf(r));
    if (!g) return;
    if (!gruplar.has(g)) gruplar.set(g, []);
    gruplar.get(g).push(r);
  });
  return [...gruplar.entries()]
    .map(([grup, liste]) => {
      const go = genelOrtalama(sorular, liste);
      return {
        grup,
        etiket: (etiketOf && metin(etiketOf(grup))) || grup,
        n: liste.length,
        ortalama: go.n > 0 ? go.besUzerinden : null,
      };
    })
    .sort((a, b) => b.n - a.n || a.etiket.localeCompare(b.etiket, 'tr'));
}

const alanKey = (survey, kaynak, varsayilan) => {
  const f = ((survey && survey.infoFields) || []).find((x) => x && x.source === kaynak);
  return (f && f.key) || varsayilan || '';
};

/**
 * @param {object} survey
 * @param {object[]} yanitlar
 * @param {object} [o]
 * @param {Object<string,{ad?:string, hocalar?:string[]}>} [o.dersKatalogu]  KOD → ders
 * @param {(bolumId:string) => string} [o.bolumAdi]
 * @returns {{id:string, baslik:string, aciklama:string, satirlar:Array}[]}
 */
export function anketKirilimlari(survey, yanitlar, o) {
  const s = survey || {};
  const opt = o || {};
  const liste = yanitlar || [];
  const katalog = opt.dersKatalogu || {};
  const cevap = (r, k) => metin(r && r.answers && r.answers[k]);
  const out = [];

  // ── Ders ──
  const kodAlani = alanKey(s, 'courseCode', 'dersKodu');
  const adAlani = alanKey(s, 'course', '');
  const dersAdlari = {};
  liste.forEach((r) => {
    const k = kodNormal(cevap(r, kodAlani));
    if (k && !dersAdlari[k]) dersAdlari[k] = cevap(r, adAlani);
  });
  const dersEtiketi = (k) => {
    const ad = dersAdlari[k] || (katalog[k] && katalog[k].ad) || '';
    return ad && kodNormal(ad) !== k ? k + ' — ' + ad : k;
  };
  const dersler = grupla(s, liste, (r) => kodNormal(cevap(r, kodAlani)), dersEtiketi);
  if (dersler.length > 0) {
    out.push({
      id: 'ders',
      baslik: 'Ders bazında',
      aciklama: 'Yanıtların verildiği derse göre.',
      satirlar: dersler.map((d) => ({
        ...d,
        hocalar: ((katalog[d.grup] && katalog[d.grup].hocalar) || []).join(', '),
      })),
    });
  }

  // ── Hoca (dersin kodundan katalogla) ──
  // Bir dersin birden çok hocası varsa yanıt her birinde sayılır.
  const hocaGruplari = new Map();
  liste.forEach((r) => {
    const k = kodNormal(cevap(r, kodAlani));
    const hocalar = (katalog[k] && katalog[k].hocalar) || [];
    hocalar.forEach((h) => {
      const ad = metin(h);
      if (!ad) return;
      if (!hocaGruplari.has(ad)) hocaGruplari.set(ad, { liste: [], dersler: new Set() });
      hocaGruplari.get(ad).liste.push(r);
      hocaGruplari.get(ad).dersler.add(k);
    });
  });
  if (hocaGruplari.size > 0) {
    const satirlar = [...hocaGruplari.entries()]
      .map(([ad, g]) => {
        const go = genelOrtalama(s.questions || [], g.liste);
        return {
          grup: ad,
          etiket: ad,
          n: g.liste.length,
          ortalama: go.n > 0 ? go.besUzerinden : null,
          dersler: [...g.dersler].sort().join(', '),
        };
      })
      .sort((a, b) => b.n - a.n || a.etiket.localeCompare(b.etiket, 'tr'));
    out.push({
      id: 'hoca',
      baslik: 'Öğretim elemanı bazında',
      aciklama:
        'Dersin hocası ders kataloğundan bulunur; birden çok hocalı derste yanıt her hocada sayılır.',
      satirlar,
    });
  }

  // ── Yanıtlayan bölüm ──
  // Bilgi alanında bölüm sorulduysa o; yoksa sunucunun damgaladığı bölüm.
  const bolumAlani = alanKey(s, 'department', '');
  const bolumAdi = typeof opt.bolumAdi === 'function' ? opt.bolumAdi : (x) => x;
  const bolumler = grupla(
    s,
    liste,
    (r) =>
      (bolumAlani && cevap(r, bolumAlani)) ||
      metin(Array.isArray(r && r.yanitlayanBolumleri) ? r.yanitlayanBolumleri[0] : '') ||
      metin(r && r.departmentId),
    (g) => (bolumAlani ? g : bolumAdi(g) || g)
  );
  if (bolumler.length > 0) {
    out.push({
      id: 'bolum',
      baslik: 'Yanıtlayan bölüm',
      aciklama: 'Katılımcının bölümüne göre.',
      satirlar: bolumler,
    });
  }

  // ── Diğer bilgi alanları (sınıf, cinsiyet, öğretim türü…) ──
  const atla = new Set([kodAlani, adAlani, bolumAlani].filter(Boolean));
  (s.infoFields || [] || []).forEach((f) => {
    if (!f || !f.key || atla.has(f.key)) return;
    const satirlar = grupla(s, liste, (r) => cevap(r, f.key));
    if (satirlar.length < 2 || satirlar.length > BILGI_UST_SINIR) return;
    out.push({
      id: 'bilgi:' + f.key,
      baslik: metin(f.label) || f.key,
      aciklama: 'Katılımcının verdiği bilgiye göre.',
      satirlar,
    });
  });

  return out;
}

/**
 * Ders kataloğu haritası: sinav_dersler kayıtlarından KOD → { ad, hocalar }.
 * Hoca alanı tek metin ya da liste olabilir ("A, B" / "A / B").
 */
export function dersKataloguHaritasi(dersler) {
  const harita = {};
  (dersler || []).forEach((d) => {
    const k = kodNormal(d && d.code);
    if (!k) return;
    const hocalar = []
      .concat(Array.isArray(d.professors) ? d.professors : [])
      .concat(metin(d.professor) ? metin(d.professor).split(/\s*[,/;]\s*/) : [])
      .map(metin)
      .filter(Boolean);
    const mevcut = harita[k] || { ad: '', hocalar: [] };
    harita[k] = {
      ad: mevcut.ad || metin(d.name),
      hocalar: [...new Set(mevcut.hocalar.concat(hocalar))],
    };
  });
  return harita;
}
