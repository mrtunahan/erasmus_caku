// ══════════════════════════════════════════════════════════════
// DERS PROGRAMI — BİR SLOTTAKİ DERSLER
//
// Bir slotta (gün + saat) BİRDEN ÇOK ders yürüyebilir: KML312 ile TLK543 gibi
// eşdeğer sayılan dersler, ya da aynı saatte ayrı dersliklerde okutulan farklı
// gruplar. Bu dosya "bu hücrede hangi dersler var" sorusunun TEK cevabıdır;
// okuma, birleştirme ve yazma yardımcılarının hepsi burada.
//
// ── VERİ BİÇİMİ ──
//   slot = {
//     courseCode, courseName, instructor, classroom, courseId, sinif,  // 1. ders
//     dersler: [ { courseCode, … }, … ]                                // 2., 3., …
//   }
// Birinci ders slotun KENDİ alanlarında durur (biçim hiç değişmedi), ek dersler
// `dersler` dizisinde. Böylece kayıtlı programların tamamı olduğu gibi okunur.
//
// ── ESKİ BİÇİM (`ikinci`) ──
// Hücre bölme önce yalnız İKİ dersi destekliyordu ve ikinci ders `ikinci`
// alanında duruyordu. Veri taşımaya gerek yok: okuma sırasında `ikinci`,
// `dersler[0]` gibi normalize edilir. Yazma tarafı artık yalnız `dersler`
// üretir; eski kayıt bir kez düzenlenince kendiliğinden yeni biçime geçer.
//
// ── ÜÇ KURAL ──
//   1) Her dersin KENDİ dersliği ve hocası olabilir. Aynı saatte iki ders iki
//      ayrı derslikte olabilir; alanı boş olan ders BİRİNCİNİN dersliğini
//      paylaşıyor demektir (eski kayıtların davranışı korunur).
//   2) Aynı hücredeki dersler birbiriyle ÇAKIŞMAZ — bölme kasıtlıdır. Çakışma
//      taraması bunu bilsin diye her kayda slot kimliği yazılır.
//   3) Çıktıda hücre tek karta indirgenirken her alanda tüm değerler yazılır
//      ama TEKRAR yazılmaz (aynı hoca bir kez, farklı hocalar "A / B").
// ══════════════════════════════════════════════════════════════

const metin = (v) => String(v == null ? '' : v).trim();

/** Ham ders nesnesini tek biçime indirger. */
function dersNormalize(ham, birinci) {
  const d = ham || {};
  const b = birinci || {};
  return {
    courseCode: metin(d.courseCode),
    courseName: metin(d.courseName),
    // Boş alan "birinciyle aynı" demektir — eski kayıtlarda ikinci ders
    // hocasını/dersliğini paylaşıyordu, o davranış korunur.
    instructor: metin(d.instructor) || metin(b.instructor),
    classroom: metin(d.classroom) || metin(b.classroom),
    courseId: d.courseId != null ? d.courseId : undefined,
    sinif: d.sinif != null ? d.sinif : b.sinif,
  };
}

/**
 * Slottaki TÜM dersler (birinci + ek dersler), sırayla.
 * Eski `ikinci` alanı da kapsanır. Kodu olmayan ders yok sayılır (yarım kayıt).
 *
 * @returns {Array} [{courseCode, courseName, instructor, classroom, sinif, courseId}]
 */
export function slotDersleri(slot) {
  const s = slot || {};
  if (!metin(s.courseCode)) return [];
  const birinci = {
    courseCode: metin(s.courseCode),
    courseName: metin(s.courseName),
    instructor: metin(s.instructor),
    classroom: metin(s.classroom),
    courseId: s.courseId != null ? s.courseId : undefined,
    sinif: s.sinif,
  };
  const ekler = slotEkDersler(s).map((d) => dersNormalize(d, birinci));
  return [birinci].concat(ekler.filter((d) => d.courseCode));
}

/**
 * Slotun EK dersleri (birinci hariç), ham hâlleriyle.
 * `dersler` dizisi varsa o; yoksa eski `ikinci` alanı tek elemanlı dizi olur.
 */
export function slotEkDersler(slot) {
  const s = slot || {};
  if (Array.isArray(s.dersler)) return s.dersler.filter((d) => d && metin(d.courseCode));
  if (s.ikinci && metin(s.ikinci.courseCode)) return [s.ikinci];
  return [];
}

/** Slottaki ders sayısı. */
export function slotDersSayisi(slot) {
  return slotDersleri(slot).length;
}

/** Bu ders kodu slotta zaten var mı? (aynı dersi iki kez eklemeyi önler) */
export function slotDersVarMi(slot, dersKodu) {
  const k = metin(dersKodu);
  if (!k) return false;
  return slotDersleri(slot).some((d) => d.courseCode === k);
}

/**
 * Slota ders ekler; YENİ slot nesnesi döner (girdi değiştirilmez).
 * Slot boşsa ders birinci sıraya, doluysa `dersler` dizisinin sonuna gider.
 * Eski `ikinci` alanı bu sırada diziye taşınır ve kaydedilmez.
 */
export function slotDersEkle(slot, ders) {
  const yeni = dersNormalize(ders, {});
  if (!yeni.courseCode) return slot || null;
  const s = slot || {};
  if (!metin(s.courseCode)) {
    return { ...temizDers(yeni) };
  }
  const ekler = slotEkDersler(s).concat([temizDers(yeni)]);
  return slotYaz(s, ekler);
}

/**
 * Slottan indeksle ders çıkarır (0 = birinci ders); YENİ slot döner.
 * Birinci ders çıkarılırsa sıradaki ders birinciliğe geçer. Hiç ders kalmazsa
 * null döner — çağıran slotu siler.
 */
export function slotDersCikar(slot, indeks) {
  const dersler = slotDersleri(slot);
  const i = Number(indeks);
  if (!dersler.length || !Number.isInteger(i) || i < 0 || i >= dersler.length) return slot || null;
  const kalan = dersler.filter((_, j) => j !== i);
  if (kalan.length === 0) return null;
  const [birinci, ...ekler] = kalan;
  return slotYaz({ ...(slot || {}), ...temizDers(birinci) }, ekler.map(temizDers));
}

/**
 * Slottaki bir dersin alanını günceller (derslik, hoca …); YENİ slot döner.
 * @param {number} indeks 0 = birinci ders
 */
export function slotDersGuncelle(slot, indeks, yama) {
  const dersler = slotDersleri(slot);
  const i = Number(indeks);
  if (!dersler.length || !Number.isInteger(i) || i < 0 || i >= dersler.length) return slot || null;
  const guncel = dersler.map((d, j) => (j === i ? { ...d, ...(yama || {}) } : d));
  const [birinci, ...ekler] = guncel;
  return slotYaz({ ...(slot || {}), ...temizDers(birinci) }, ekler.map(temizDers));
}

/** Ders nesnesinden tanımsız alanları atar (kayda boş alan yazılmasın). */
function temizDers(d) {
  const out = {
    courseCode: metin(d.courseCode),
    courseName: metin(d.courseName),
    instructor: metin(d.instructor),
    classroom: metin(d.classroom),
  };
  if (d.courseId != null) out.courseId = d.courseId;
  if (d.sinif != null) out.sinif = d.sinif;
  return out;
}

/**
 * Slotu ek derslerle birlikte yazar. Yazma tarafı YALNIZ `dersler` üretir;
 * eski `ikinci` alanı kayıttan düşürülür (iki kaynak bir arada durmasın).
 */
function slotYaz(slot, ekler) {
  const temiz = { ...(slot || {}) };
  delete temiz.ikinci;
  const liste = (ekler || []).filter((d) => d && metin(d.courseCode));
  if (liste.length === 0) {
    delete temiz.dersler;
    return temiz;
  }
  temiz.dersler = liste;
  return temiz;
}

/** İki değeri tekrarsız birleştirir: 'A' + 'A' → 'A', 'A' + 'B' → 'A / B'. */
function birlesikListe(degerler) {
  const liste = [];
  (degerler || []).forEach((v) => {
    const t = metin(v);
    if (t && !liste.includes(t)) liste.push(t);
  });
  return liste.join(' / ');
}

/**
 * Bölünmüş hücreyi çıktı/görünüm için tek karta indirger.
 *
 * Her alanda TÜM dersler yazılır ama tekrar yazılmaz: aynı hocanın iki dersi
 * varsa adı bir kez, farklı hocalar "A / B". Ders kodlarının sırası ile hoca
 * ve derslik sırası aynıdır, okuyan eşleştirebilir.
 *
 * @param {object} slot
 * @param {object} [ek] karta eklenecek bağlam (deptName, year gibi)
 */
export function slotBirlestir(slot, ek) {
  const dersler = slotDersleri(slot);
  return {
    courseCode: birlesikListe(dersler.map((d) => d.courseCode)),
    courseName: birlesikListe(dersler.map((d) => d.courseName)),
    instructor: birlesikListe(dersler.map((d) => d.instructor)),
    classroom: birlesikListe(dersler.map((d) => d.classroom)),
    sinif: (slot || {}).sinif,
    ...(ek || {}),
  };
}
