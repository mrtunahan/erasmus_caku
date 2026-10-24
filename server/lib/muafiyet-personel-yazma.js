/**
 * MUAFİYET SATIRINI DÜZELTME / ÇIKARMA YALNIZ ÜNİVERSİTE YETKİLİSİNDE
 *
 * Ekranda "talebi yalnız üniversite yetkilisi düzeltebilir" kuralı vardı
 * (lib/muafiyet-duzenleme.js → duzenleyebilirMi), sunucuda yoktu: ders kararı
 * da düzeltme de aynı `matches.<n>` yoluyla yazıldığı için ayırt edilmiyordu.
 * Ayrım burada ALAN düzeyinde yapılır — satırın eski hâliyle karşılaştırılır:
 *
 *   serbest (bölüm personeli): ders kararı (adminDecision/Note/DecidedBy/
 *                              UpdatedAt) ve not eşlemesi (convertedGrade,
 *                              sourceCourse.grade / gradeHarf / gradePuan)
 *   üniversite yetkilisi:      ders bilgisi (kod, ad, AKTS, içerik…), düzeltme
 *                              izi (duzenlemeler), satır ekleme / çıkarma
 *
 * Bu kural personel içindir; öğrencinin yeniden gönderimi kendi kuralıyla
 * (routes/db.js, öğrenci dalı) yönetilir.
 */

const SERBEST = new Set([
  'adminDecision',
  'adminNote',
  'adminDecidedBy',
  'adminUpdatedAt',
  'convertedGrade',
  'sourceCourse.grade',
  'sourceCourse.gradeHarf',
  'sourceCourse.gradePuan',
]);

const nesneMi = (v) => !!v && typeof v === 'object' && !Array.isArray(v);
const esit = (a, b) =>
  JSON.stringify(a === undefined ? null : a) === JSON.stringify(b === undefined ? null : b);

/** İki satır arasında değişen alan yolları (iç içe nesnelerde bir düzey). */
function satirFarki(eski, yeni) {
  const e = nesneMi(eski) ? eski : {};
  const y = nesneMi(yeni) ? yeni : {};
  const out = [];
  new Set(Object.keys(e).concat(Object.keys(y))).forEach((k) => {
    if (nesneMi(e[k]) || nesneMi(y[k])) {
      const ei = nesneMi(e[k]) ? e[k] : {};
      const yi = nesneMi(y[k]) ? y[k] : {};
      new Set(Object.keys(ei).concat(Object.keys(yi))).forEach((a) => {
        if (!esit(ei[a], yi[a])) out.push(k + '.' + a);
      });
    } else if (!esit(e[k], y[k])) {
      out.push(k);
    }
  });
  return out;
}

const RET = (hata) => ({ izin: false, hata });
const YETKI = 'Muafiyet satırını düzeltmeyi ve çıkarmayı yalnız üniversite yetkilisi yapabilir.';

/**
 * @param {object} data    yazılan alanlar (op.data)
 * @param {object} mevcut  kaydın şimdiki hâli
 * @returns {{izin:boolean, hata?:string}}
 */
function personelMuafiyetSatirKarari(data, mevcut) {
  const veri = nesneMi(data) ? data : {};
  const eskiSatirlar = (mevcut && Array.isArray(mevcut.matches) && mevcut.matches) || [];
  // Eski kayıtlarda karşı ders `source` alanında; not eşlemesi onu
  // `sourceCourse` adıyla yeniden yazar — bu bir ders bilgisi değişikliği değil.
  const esdeger = (eski) =>
    nesneMi(eski) && !nesneMi(eski.sourceCourse) && nesneMi(eski.source)
      ? { ...eski, sourceCourse: eski.source }
      : eski;
  const satirUygun = (eski, yeni) => satirFarki(esdeger(eski), yeni).every((y) => SERBEST.has(y));
  for (const k of Object.keys(veri)) {
    if (k === 'cikarilanEslesmeler') return RET(YETKI);
    if (k === 'matches') {
      const yeni = veri.matches;
      if (!Array.isArray(yeni) || yeni.length !== eskiSatirlar.length) return RET(YETKI);
      if (!yeni.every((s, i) => satirUygun(eskiSatirlar[i], s))) return RET(YETKI);
      continue;
    }
    const m = /^matches\.(\d+)(?:\.([a-zA-Z_][a-zA-Z0-9_]*))?$/.exec(k);
    if (!m) continue;
    const eski = eskiSatirlar[Number(m[1])];
    if (!eski) return RET(YETKI); // yeni satır eklemek
    if (m[2]) {
      if (!SERBEST.has(m[2])) return RET(YETKI);
    } else if (!satirUygun(eski, veri[k])) {
      return RET(YETKI);
    }
  }
  return { izin: true };
}

module.exports = { personelMuafiyetSatirKarari, satirFarki, SERBEST };
