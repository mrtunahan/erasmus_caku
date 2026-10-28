/**
 * PERSONELİN ÖĞRENCİ VERİSİ OKUMASI — BÖLÜM KAPSAMI (KVKK)
 *
 * Okuma kuralı giriş yapmış her personele `students` ve `student_profiles`
 * koleksiyonlarının TAMAMINI açıyordu: herhangi bir akademisyen bütün
 * üniversitenin öğrencilerinin TC kimlik numarasını, adresini, anne-baba
 * adını, nüfus kaydını okuyabiliyordu. Personelin bu veriyle meşru işi kendi
 * bölümündedir (muafiyet belgesi, staj formu…).
 *
 *   student_profiles → kapsam dışı öğrencinin profili HİÇ dönmez.
 *   students         → kapsam dışı öğrencinin kaydı gizlenmez, TEMEL
 *                      alanlarına indirgenir: ÇAP öğrenci ekleme, numara
 *                      bağlama, başka bölümden derse gelen öğrencinin adı
 *                      gibi bölümler arası işler çalışmaya devam eder.
 *
 * Kapsam = okuma yetki alanı (ana + ek bölümler; fakülte/üniversite
 * yetkilisinde geniş alan) ∪ memurun atandığı bölümler. Öğrencinin bölümü
 * ana bölümü + ÇAP bölümleridir; bölümsüz eski kayıt Bilgisayar sayılır
 * (yazma kuralıyla aynı).
 */

const metin = (v) => String(v == null ? '' : v).trim();

/** Kapsam dışı öğrencide görünen alanlar. */
const TEMEL_ALANLAR = [
  'id',
  '_docId',
  'studentNumber',
  'firstName',
  'lastName',
  'name',
  'departmentId',
  'departmentName',
  'additionalDepartments',
  'bagliOgrenciNolar',
  'sinif',
  // Sınıfın kaynağı ve program süresi: sınıf numaradan doğru türetilsin
  // (işaretsiz önbellek değeri "elle girilmiş" sanılmasın).
  'sinifKaynagi',
  'programYili',
  // Cinsiyet resmî devam listesinin bir sütunu: başka bölümden servis
  // dersine gelen öğrencinin satırı boş basılıyordu.
  'cinsiyet',
  'gender',
  'status',
];

function ogrenciBolumleri(kayit) {
  const k = kayit || {};
  const ana = metin(k.departmentId) || 'bilgisayar';
  const ek = Array.isArray(k.additionalDepartments) ? k.additionalDepartments.map(metin) : [];
  return [ana].concat(ek).filter(Boolean);
}

/**
 * @param {object} p
 * @param {boolean} p.tamErisim  sistem/üniversite yetkilisi, staj yetkilisi
 * @param {object} p.alan        kullaniciAlani(..., true)
 * @param {(alan, id) => boolean} p.alanda
 * @param {string[]} [p.ekBolumler]  memur atamaları
 * @returns {(kayit:object) => boolean}  öğrenci kapsamda mı?
 */
function kapsamKarari(p) {
  const o = p || {};
  if (o.tamErisim) return () => true;
  const ek = new Set((o.ekBolumler || []).map(metin).filter(Boolean));
  return (kayit) =>
    ogrenciBolumleri(kayit).some((b) => ek.has(b) || (o.alan && o.alanda(o.alan, b)));
}

/** Kapsam dışı öğrenci kaydını temel alanlara indirger. */
function temelAlanlar(kayit) {
  const out = {};
  TEMEL_ALANLAR.forEach((f) => {
    if (kayit && kayit[f] !== undefined) out[f] = kayit[f];
  });
  return out;
}

module.exports = { TEMEL_ALANLAR, ogrenciBolumleri, kapsamKarari, temelAlanlar };
