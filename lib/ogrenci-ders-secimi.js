// ══════════════════════════════════════════════════════════════
// ÖĞRENCİNİN SEÇTİĞİ DERSLER — TEK KAYNAK
//
// Seçim İKİ yerde durabiliyor:
//   • `student_courses/{ogrNo}__{donem}` → Benim Sayfam'ın BUGÜNKÜ yazdığı
//     yer. Dönem bazlıdır; öğrenci birden çok dönemde seçim yapmış olabilir.
//   • `students.myCourseIds`            → eski tek-liste seçim. Yeni kayıt
//     üretmiyor ama eski öğrencilerde dolu.
//
// Bu ikiliğin bedeli görüldü: proje modülü "bu derse kayıtlı mısın" denetimini
// YALNIZ eski alandan yapıyordu. Benim Sayfam'dan ders seçen öğrenci proje
// grubuna katılmak istediğinde "bu dersi seçmediniz" duvarına çarpıyordu —
// seçim vardı, denetim yanlış yere bakıyordu.
//
// Karar burada toplanır: sorusu olan iki kaynağı da okur, aynı fonksiyondan
// geçer. Yeni bir çağıran ikisinden birini unutamaz.
// ══════════════════════════════════════════════════════════════

// Ders kodu karşılaştırması locale'e bırakılamaz: 'BIL101'.toLowerCase('tr')
// → 'bıl101', 'bil101' değil. İki uç farklı yoldan normalize ederse aynı ders
// eşleşmez. Türkçe harfler ASCII karşılığına çevrilir, sonra kasa düşürülür.
const TR_ASCII = {
  ı: 'i',
  İ: 'i',
  I: 'i',
  ş: 's',
  Ş: 's',
  ğ: 'g',
  Ğ: 'g',
  ü: 'u',
  Ü: 'u',
  ö: 'o',
  Ö: 'o',
  ç: 'c',
  Ç: 'c',
};

/** Ders kodunun karşılaştırma anahtarı: 'BİL 101-A' → 'bil101a'. */
export function kodAnahtari(kod) {
  let s = '';
  for (const h of String(kod == null ? '' : kod)) s += TR_ASCII[h] || h;
  return s.toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * Öğrencinin seçtiği ders KİMLİKLERİ — iki kaynağın birleşimi.
 *
 * @param {Array} donemKayitlari `student_courses` dokümanları (courseIds taşır)
 * @param {object} ogrenciKaydi  `students` kaydı (myCourseIds taşır)
 * @returns {string[]} tekrarsız kimlikler
 */
export function secilenDersIdleri(donemKayitlari, ogrenciKaydi) {
  const kume = new Set();
  const ekle = (dizi) =>
    (Array.isArray(dizi) ? dizi : []).forEach((id) => {
      const s = String(id == null ? '' : id).trim();
      if (s) kume.add(s);
    });
  (Array.isArray(donemKayitlari) ? donemKayitlari : []).forEach((d) => ekle(d && d.courseIds));
  ekle(ogrenciKaydi && ogrenciKaydi.myCourseIds);
  return [...kume];
}

/**
 * Kimlikleri ders KODU anahtarlarına çevirir.
 * Kimliği ders listesinde bulunmayan seçim düşer — kod olmadan
 * karşılaştırılamaz (ders silinmiş ya da başka bölümün dersi olabilir).
 */
export function secilenDersKodlari(idler, dersler) {
  const kume = new Set((Array.isArray(idler) ? idler : []).map((x) => String(x)));
  const kodlar = new Set();
  (Array.isArray(dersler) ? dersler : []).forEach((c) => {
    if (!c) return;
    const anahtar = kodAnahtari(c.code);
    if (anahtar && kume.has(String(c.id))) kodlar.add(anahtar);
  });
  return [...kodlar];
}

/** Bu ders kodu, verilen kod anahtarları arasında var mı? */
export function dersSecilmisMi(kodAnahtarlari, kod) {
  const a = kodAnahtari(kod);
  if (!a) return false;
  return (Array.isArray(kodAnahtarlari) ? kodAnahtarlari : []).includes(a);
}
