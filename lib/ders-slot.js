// ══════════════════════════════════════════════════════════════
// DERS PROGRAMI — BİR SLOTTAKİ DERSLER
//
// Bir slotta (gün + saat) BİRDEN ÇOK ders yürüyebilir: KML312 ile TLK543 gibi
// eşdeğer sayılan dersler, ya da aynı saatte ayrı dersliklerde okutulan farklı
// gruplar. Bu dosya "bu hücrede hangi dersler var" sorusunun TEK cevabıdır;
// okuma, birleştirme ve yazma yardımcılarının hepsi burada.
//
// ── AYNI DERSİN BİRDEN ÇOK KAYDI: ŞUBE ──
// Bir ders iki ayrı müfredatta bulunabilir ve her birinin iki şubesi olabilir;
// o zaman TEK slotta aynı kodun dört kaydı yürür. Kayıtları birbirinden ayıran
// ŞUBE alanıdır (`sube`): kod aynı olsa da şube farklıysa bunlar ayrı derstir,
// ayrı derslikte ve ayrı hocayla okutulur.
//   • kod + şube aynı  → aynı ders, ikinci kez eklenemez
//   • kod aynı, şube farklı → ayrı kayıt, eklenir
// Çıktıda kod "FZK181 (Şb:2)" diye yazılır; şubesiz ders eskisi gibi yalın.
//
// ── VERİ BİÇİMİ ──
//   slot = {
//     courseCode, courseName, instructor, classroom, courseId, sinif, sube, // 1. ders
//     dersler: [ { courseCode, …, sube }, … ]                               // 2., 3., …
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
//      paylaşıyor demektir (eski kayıtların davranışı korunur). ŞUBE bunun
//      DIŞINDADIR: devralınmaz, çünkü boş şube "şubesiz ders" demektir.
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
    // Şube DEVRALINMAZ: boş şube "bu dersin tek şubesi var" demektir, birinci
    // dersin şubesini kopyalamak iki kaydı yanlışlıkla aynı şube gösterirdi.
    sube: metin(d.sube),
  };
}

/**
 * Ders kodunun ŞUBELİ etiketi: 'FZK181' → 'FZK181 (Şb:2)'.
 * Şubesiz derste kod olduğu gibi kalır — tek şubeli derslerin görünümü
 * değişmesin (programların çoğu böyle).
 */
export function dersKodEtiketi(ders) {
  const d = ders || {};
  const kod = metin(d.courseCode);
  const sube = metin(d.sube);
  if (!kod) return '';
  return sube ? kod + ' (Şb:' + sube + ')' : kod;
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
    sube: metin(s.sube),
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

/**
 * Bu ders (kod + ŞUBE) slotta zaten var mı?
 *
 * Aynı kodun farklı şubesi AYRI derstir ve engellenmez — bir ders iki
 * müfredatta ve her müfredatta iki şubede okutulabiliyor.
 */
export function slotDersVarMi(slot, dersKodu, sube) {
  const k = metin(dersKodu);
  if (!k) return false;
  const sb = metin(sube);
  return slotDersleri(slot).some((d) => d.courseCode === k && metin(d.sube) === sb);
}

/** Bu ders kodu slotta (herhangi bir şubeyle) geçiyor mu? */
export function slotKodVarMi(slot, dersKodu) {
  const k = metin(dersKodu);
  if (!k) return false;
  return slotDersleri(slot).some((d) => d.courseCode === k);
}

/**
 * Bu kod için slotta boşta olan ilk şube numarası.
 *
 * Sürükle-bırakta şube sorulmaz; kod zaten varsa kullanıcıya "ikinci şube
 * olarak eklensin mi?" diye sorulur ve onaylarsa numara buradan gelir.
 * Şubesiz duran ilk kayıt 1. şube sayılır: ikinci kayıt 2 olur.
 */
export function sonrakiSube(slot, dersKodu) {
  const k = metin(dersKodu);
  if (!k) return '1';
  const ayniKod = slotDersleri(slot).filter((d) => d.courseCode === k);
  if (ayniKod.length === 0) return '1';
  let n = ayniKod.length + 1;
  const kullanilan = new Set(ayniKod.map((d) => metin(d.sube) || '1'));
  while (kullanilan.has(String(n))) n++;
  return String(n);
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
  // Şube yalnız VARSA yazılır: şubesiz dersin kaydına boş alan eklemek eski
  // programları gereksiz yere değiştirirdi.
  if (metin(d.sube)) out.sube = metin(d.sube);
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
    // Kod ŞUBELİ yazılır: aynı kodun iki şubesi varsa "FZK181 (Şb:1) /
    // FZK181 (Şb:2)" görünür; tekrarsız birleştirme ikisini tek koda
    // indirgemez.
    courseCode: birlesikListe(dersler.map(dersKodEtiketi)),
    courseName: birlesikListe(dersler.map((d) => d.courseName)),
    instructor: birlesikListe(dersler.map((d) => d.instructor)),
    classroom: birlesikListe(dersler.map((d) => d.classroom)),
    sinif: (slot || {}).sinif,
    ...(ek || {}),
  };
}

// ══════════════════════════════════════════════════════════════
// ÇAKIŞMA ANLIK GÖRÜNTÜSÜ
//
// Çakışma denetimi bölümün TÜM sınıflarının programını ister; o küme
// (`deptAllYearsSlots`) ağdan yalnız bölüm/dönem değişince yükleniyor —
// her düzenlemede yeniden okumak N+1 istek demek olurdu.
//
// ── GEÇ ÇALIŞMANIN SEBEBİ ──
// Kaydetmek bu kümeyi tazelemiyordu. 1. Sınıf'a ders eklenip 2. Sınıf'a
// geçildiğinde denetimin gördüğü 1. Sınıf hâlâ AÇILIŞTAKİ hâliydi: az önce
// yaratılan çakışma ne eklerken uyarı veriyor ne panelde görünüyordu, ancak
// bölüm/dönem değiştirilip geri dönülünce ortaya çıkıyordu.
//
// Yazılan veri zaten elde olduğu için ağdan okumaya gerek yok: küme yerinde
// güncellenir.
// ══════════════════════════════════════════════════════════════

/**
 * Anlık görüntüde bir sınıfın slotlarını değiştirir; sınıf kümede yoksa ekler.
 * Girdi DEĞİŞTİRİLMEZ, yeni dizi döner (React durumu için).
 *
 * @param {Array<{year:string|number, slots:object}>} anlikGoruntu
 * @param {string|number} yil
 * @param {object} slotlar
 */
export function yilSlotlariniGuncelle(anlikGoruntu, yil, slotlar) {
  const liste = Array.isArray(anlikGoruntu) ? anlikGoruntu : [];
  const y = String(yil);
  const veri = slotlar || {};
  return liste.some((x) => x && String(x.year) === y)
    ? liste.map((x) => (x && String(x.year) === y ? { ...x, slots: veri } : x))
    : [...liste, { year: y, slots: veri }];
}
