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

// ── BİR DERSİN ÖĞRENCİ LİSTESİ (Ders Odaları + Dijital Yoklama ortak) ──
// İki modül aynı dersin öğrencilerini ayrı kurallarla sayıyordu: yoklama
// yalnız `students` kaydı olan öğrenciyi ama BÜTÜN dönemlerin seçimlerini,
// ders odası ise dönemi süzüp kaydı olmayan numarayı da sayıyordu — aynı ders
// iki ekranda farklı sayı gösterdi (59 / 60). Kural artık burada:
//   • Dönem seçimi (`student_courses`) yalnız İSTENEN dönemden sayılır
//     (termKey ya da belge kimliğinin `__dönem` eki; ikisi de yoksa sayılır).
//   • Eski tek-liste seçim (`myCourseIds`) yalnız `eskiListe` açıksa (içinde
//     bulunulan dönem) ve öğrencinin o döneme ait yeni kaydı YOKSA sayılır.
//   • `students` kaydı olmayan numara sayılmaz (resmî listeye ad, sınıf
//     yazılamaz; kayıt dışı/deneme hesabıdır). ADAY- numaraları sayılmaz.
//   • Ders kimliği birden çok biçimde olabilir (_docId / _id / id): hepsi verilir.

const metinS = (v) => String(v == null ? '' : v).trim();

/**
 * @param {object} p
 * @param {string[]} p.dersIdleri      dersin bütün kimlik biçimleri
 * @param {string}   p.donem           '2026-2027_guz'
 * @param {object[]} p.donemKayitlari  student_courses kayıtları
 * @param {object[]} p.ogrenciKayitlari students kayıtları (studentNumber, myCourseIds)
 * @param {boolean}  [p.eskiListe]     eski myCourseIds sayılsın mı
 * @returns {string[]} tekrarsız öğrenci numaraları
 */
export function dersinOgrenciNolari(p) {
  const o = p || {};
  const idler = new Set((o.dersIdleri || []).map(metinS).filter(Boolean));
  const donem = metinS(o.donem);
  if (!idler.size) return [];
  const kayitli = new Map();
  (o.ogrenciKayitlari || []).forEach((s) => {
    const no = metinS(s && s.studentNumber);
    if (no) kayitli.set(no, s);
  });
  const secimNo = (k) =>
    metinS(k && k.studentNumber) || metinS(k && (k._docId || k.id)).split('__')[0];
  const secimDonemi = (k) =>
    metinS(k && k.termKey) || metinS(k && (k._docId || k.id)).split('__')[1] || '';
  const donemKaydiOlan = new Set();
  const nolar = new Set();
  (o.donemKayitlari || []).forEach((k) => {
    const d = secimDonemi(k);
    if (donem && d && d !== donem) return;
    const no = secimNo(k);
    if (!no) return;
    donemKaydiOlan.add(no);
    if ((k.courseIds || []).some((id) => idler.has(metinS(id)))) nolar.add(no);
  });
  if (o.eskiListe) {
    kayitli.forEach((s, no) => {
      if (donemKaydiOlan.has(no)) return;
      if ((s.myCourseIds || []).some((id) => idler.has(metinS(id)))) nolar.add(no);
    });
  }
  return [...nolar].filter((no) => kayitli.has(no) && !/^ADAY-/i.test(no));
}
