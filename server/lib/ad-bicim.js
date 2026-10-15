/**
 * ÖĞRENCİ ADI BİÇİMİ — BÜYÜK HARF.
 *
 * Öğrencinin kimliği öğrenci NUMARASIDIR; ad yalnız gösterimdir. Bu yüzden
 * öğrenci adı yazılırken (kayıt, güncelleme) güvenle büyük harfe çevrilir.
 * Türkçe kural zorunlu: "ılgın" → "ILGIN", "işık" → "IŞIK" (İngilizce
 * büyütme i → I yapıp adı bozardı).
 *
 * ⚠ AKADEMİSYEN / MEMUR ADI BURADA ÇEVRİLMEZ: onlarda ad kimliğin kendisidir
 * (şifre anahtarı, ders atamaları). Onların yeni kaydı formda standart
 * biçimde oluşturulur, mevcut kayıtlar server/ad-standart-gecis.js ile bütün
 * atıflarla birlikte dönüştürülür.
 */
const AD_ALANLARI = ['firstName', 'lastName', 'name'];

function adBuyukHarf(v) {
  return String(v == null ? '' : v)
    .replace(/\s+/g, ' ')
    .trim()
    .toLocaleUpperCase('tr-TR');
}

/** Öğrenci kaydı verisindeki ad alanlarını büyük harfe çevirir (kopya döner). */
function ogrenciAdlariniBuyut(veri) {
  if (!veri || typeof veri !== 'object' || Array.isArray(veri)) return veri;
  let degisti = false;
  const out = { ...veri };
  AD_ALANLARI.forEach((a) => {
    if (typeof out[a] === 'string' && out[a]) {
      const y = adBuyukHarf(out[a]);
      if (y !== out[a]) {
        out[a] = y;
        degisti = true;
      }
    }
  });
  return degisti ? out : veri;
}

// Öğrenci adının BAŞKA kayıtlara kopyalandığı alanlar (geçmiş, başvuru,
// muafiyet, staj…). Bu adlar yalnız gösterimdir; kimlik numaradır.
const OGRENCI_AD_KOPYALARI = ['studentName', 'ogrenciAdSoyad', 'ogrenciAdi', 'ogrenciAd'];
// `adSoyad` genel bir alan adı; yalnız belge bir öğrenci numarası taşıyorsa
// öğrenci adı sayılır (akademisyen adı kimliktir, ona dokunulmamalı).
const NUMARA_ALANLARI = ['studentNumber', 'ogrenciNo', 'ogrenciNumarasi'];

/** Belgenin üst düzey öğrenci-adı kopyalarını büyük harfe çevirir (kopya döner). */
function ogrenciAdKopyalariniBuyut(veri) {
  if (!veri || typeof veri !== 'object' || Array.isArray(veri)) return veri;
  const alanlar = OGRENCI_AD_KOPYALARI.slice();
  if (NUMARA_ALANLARI.some((n) => veri[n])) alanlar.push('adSoyad');
  let degisti = false;
  const out = { ...veri };
  alanlar.forEach((a) => {
    if (typeof out[a] === 'string' && out[a]) {
      const y = adBuyukHarf(out[a]);
      if (y !== out[a]) {
        out[a] = y;
        degisti = true;
      }
    }
  });
  return degisti ? out : veri;
}

/**
 * Bir değerdeki ESKİ adlara birebir eşit her metni ve her ANAHTARI haritaya
 * göre çevirir — lib/akademisyen-kimlik.js → adAtiflariniCevir'in çok adlı
 * hâli, aynı kural: yalnız tam eşleşme (cümle içindeki ad değişmez), hedef
 * anahtar zaten varsa üstüne yazılmaz. Tarih, ObjectId, sayı dokunulmaz.
 */
function cevir(deger, harita) {
  if (typeof deger === 'string') {
    return harita.has(deger)
      ? { deger: harita.get(deger), degisti: true }
      : { deger, degisti: false };
  }
  if (Array.isArray(deger)) {
    let degisti = false;
    const d = deger.map((x) => {
      const s = cevir(x, harita);
      if (s.degisti) degisti = true;
      return s.deger;
    });
    return { deger: d, degisti };
  }
  if (deger && typeof deger === 'object' && deger.constructor === Object) {
    let degisti = false;
    const o = {};
    Object.keys(deger).forEach((k) => {
      const s = cevir(deger[k], harita);
      if (s.degisti) degisti = true;
      if (harita.has(k)) {
        degisti = true;
        const yk = harita.get(k);
        if (!(yk in deger)) o[yk] = s.deger;
      } else {
        o[k] = s.deger;
      }
    });
    return { deger: o, degisti };
  }
  return { deger, degisti: false };
}

/**
 * Akademisyen adları için dönüşüm planı.
 * Hedef ad zaten başka bir kayıtta varsa ya da iki farklı ad aynı hedefe
 * iniyorsa o adlar ATLANIR (birleştirmedir; insan kararı gerekir).
 * @returns {{harita: Map<string,string>, atlanan: string[], adSayisi: number}}
 */
function adHaritasiPlanla(adlar, standartAd) {
  const liste = [...new Set((adlar || []).map((a) => String(a || '').trim()).filter(Boolean))];
  const mevcut = new Set(liste);
  const hedefler = new Map();
  liste.forEach((eski) => {
    const yeni = standartAd(eski);
    if (!yeni || yeni === eski) return;
    if (!hedefler.has(yeni)) hedefler.set(yeni, []);
    hedefler.get(yeni).push(eski);
  });
  const harita = new Map();
  const atlanan = [];
  hedefler.forEach((eskiler, yeni) => {
    if (mevcut.has(yeni)) {
      atlanan.push(
        eskiler.join(' | ') +
          ' → "' +
          yeni +
          '" (bu adla zaten bir kayıt var — birleştirme gerekir)'
      );
    } else if (eskiler.length > 1) {
      atlanan.push(
        eskiler.join(' | ') +
          ' → "' +
          yeni +
          '" (iki farklı ad aynı ada iniyor — birleştirme gerekir)'
      );
    } else {
      harita.set(eskiler[0], yeni);
    }
  });
  return { harita, atlanan, adSayisi: liste.length };
}

module.exports = {
  adBuyukHarf,
  ogrenciAdlariniBuyut,
  ogrenciAdKopyalariniBuyut,
  cevir,
  adHaritasiPlanla,
  AD_ALANLARI,
  OGRENCI_AD_KOPYALARI,
};
