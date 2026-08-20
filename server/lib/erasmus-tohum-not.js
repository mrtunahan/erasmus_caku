// ══════════════════════════════════════════════════════════════
// TOHUM NOT MU, GERÇEK NOT MU?
//
// "Gidiş Eşleştirmelerinden Hızlı Doldur" düğmesi her ders için sabit bir
// ÇİFT yazıyordu: karşı kurum notu 'A', kendi kurumumuzdaki karşılık
// 'Muaf'. Bu kalıntılar silinecek — ama aynı alanlarda akademisyenin elle
// girdiği gerçek notlar da duruyor.
//
// ── AYRIM EŞLEŞTİRME DÜZEYİNDE YAPILAMAZ ──
// Canlı veri gösterdi ki ikisi AYNI eşleştirmenin içinde yan yana durur:
//
//   hostGrade='A', homeGrade='Muaf',        ← tohum (eski tekil alanlar)
//   hostGrades[0]='5', homeGrades[0]='A'    ← gerçek (ders bazlı)
//   hostGrades[1]='A', homeGrades[1]='Muaf' ← yine tohum
//
// Bu yüzden karar ders indeksi bazında verilir. Tekil alanlar (hostGrade/
// homeGrade) tek bir ders varsayan eski biçimdir; kendi başlarına bir
// "indeks" gibi ele alınır.
//
// ── İMZA TEK BİR DEĞER DEĞİL, ÇİFTTİR ──
// Yalnız 'A' görmek yetmez: 'A' harf ölçeğinde geçerli bir nottur, 'Muaf'
// da geçerli bir denklik kararıdır. Tohumu ele veren, ikisinin AYNI
// indekste birlikte durmasıdır — düğmenin yazdığı şey tam olarak budur.
// Biri gerçek bir değerle değiştirilmişse (host='10', home='Muaf') o çifte
// insan eli değmiştir; dokunulmaz.
//
// `erasmusNotOnayi` damgasına güvenilmez: alan yeni eklendi, mevcut
// kayıtların hiçbirinde yok.
// ══════════════════════════════════════════════════════════════

const NOT_ALANLARI = ['hostGrade', 'homeGrade', 'hostGrades', 'homeGrades'];

// Hızlı doldurmanın yazdığı çift.
const TOHUM_HOST = 'a';
const TOHUM_HOME = 'muaf';

// Tekil (ders bazlı olmayan) alanların indeks adı.
const TEKIL = '*';

const anahtar = (v) =>
  String(v == null ? '' : v)
    .trim()
    .toLocaleLowerCase('tr');
const dolu = (v) => anahtar(v) !== '';

const oku = (o, k) => (o && typeof o === 'object' ? o[k] : undefined);

/** Eşleştirmedeki not değerleri, indeks bazında: {indeks, host, home}. */
function notCiftleri(m) {
  if (!m || typeof m !== 'object') return [];
  const ciftler = [];
  if (dolu(m.hostGrade) || dolu(m.homeGrade)) {
    ciftler.push({ indeks: TEKIL, host: m.hostGrade, home: m.homeGrade });
  }
  const idx = new Set([
    ...Object.keys(m.hostGrades && typeof m.hostGrades === 'object' ? m.hostGrades : {}),
    ...Object.keys(m.homeGrades && typeof m.homeGrades === 'object' ? m.homeGrades : {}),
  ]);
  [...idx]
    .sort((a, b) => Number(a) - Number(b))
    .forEach((k) => {
      const host = oku(m.hostGrades, k);
      const home = oku(m.homeGrades, k);
      if (dolu(host) || dolu(home)) ciftler.push({ indeks: k, host, home });
    });
  return ciftler;
}

/** Bu çift hızlı doldurmanın bıraktığı sabit çift mi? */
function tohumCiftiMi(cift) {
  return anahtar(cift.host) === TOHUM_HOST && anahtar(cift.home) === TOHUM_HOME;
}

const yaz = (cift) =>
  `${cift.indeks === TEKIL ? 'tekil' : `ders${cift.indeks}`}: ` +
  `karşı='${cift.host == null ? '' : cift.host}' → denklik='${cift.home == null ? '' : cift.home}'`;

/** Boş kalan not haritalarını kaldırır (kayıtta çöp anahtar bırakmamak için). */
function haritalariDerle(m) {
  ['hostGrades', 'homeGrades'].forEach((a) => {
    const o = m[a];
    if (o && typeof o === 'object' && Object.keys(o).length === 0) delete m[a];
  });
  return m;
}

/**
 * Yalnız tohum çiftlerini boşaltır.
 * @returns {{temiz, silinen: string[], kalan: string[]}}
 */
function tohumlariBosalt(m) {
  const ciftler = notCiftleri(m);
  const silinen = [];
  const kalan = [];
  const temiz = {
    ...m,
    ...(m.hostGrades && typeof m.hostGrades === 'object'
      ? { hostGrades: { ...m.hostGrades } }
      : {}),
    ...(m.homeGrades && typeof m.homeGrades === 'object'
      ? { homeGrades: { ...m.homeGrades } }
      : {}),
  };
  ciftler.forEach((c) => {
    if (!tohumCiftiMi(c)) {
      kalan.push(yaz(c));
      return;
    }
    silinen.push(yaz(c));
    if (c.indeks === TEKIL) {
      delete temiz.hostGrade;
      delete temiz.homeGrade;
    } else {
      if (temiz.hostGrades) delete temiz.hostGrades[c.indeks];
      if (temiz.homeGrades) delete temiz.homeGrades[c.indeks];
    }
  });
  return { temiz: haritalariDerle(temiz), silinen, kalan };
}

/** Tüm not alanlarını boşaltır (ELLE_GIRILENLERI_DE_SIL yolu). */
function notlariBosalt(m) {
  const temiz = { ...m };
  NOT_ALANLARI.forEach((a) => delete temiz[a]);
  return temiz;
}

/**
 * Tekil alan, ders bazlı karşılığı OLMAYAN her derse sızar: gösterim
 * `homeGrades[i] ?? homeGrade` okur. Yani tek bir 'Muaf', notu hiç
 * girilmemiş dersleri de "Muaf" gösterir. Tohum çifti değil (silinmez)
 * ama gözden geçirilmeli.
 */
function tekilSizintisiVarMi(m, dersSayisi) {
  if (!m || typeof m !== 'object') return false;
  if (!dolu(m.hostGrade) && !dolu(m.homeGrade)) return false;
  const n = Number(dersSayisi || 0);
  if (!n) return false;
  for (let i = 0; i < n; i++) {
    if (!dolu(oku(m.hostGrades, i)) || !dolu(oku(m.homeGrades, i))) return true;
  }
  return false;
}

module.exports = {
  NOT_ALANLARI,
  TEKIL,
  notCiftleri,
  tohumCiftiMi,
  tohumlariBosalt,
  notlariBosalt,
  tekilSizintisiVarMi,
};
