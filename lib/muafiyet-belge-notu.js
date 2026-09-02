// ══════════════════════════════════════════════════════════════
// MEMUR YAZISINDAKİ İKİ NOT SÜTUNU
//
// Belgede iki not vardır: karşı kurumun notu ve onun ÇAKÜ karşılığı. İkisi de
// üç ayrı yerden gelebiliyor ve sıralama yanlış kurulduğunda sütun BOŞ
// çıkıyor — belge üretiliyor, kimse hata görmüyor, memur tabloyu elle
// doldurmak zorunda kalıyor.
//
// ── BULUNAN HATA ──
// Yaz intibakında öğrencinin yüklediği belge okunuyor. Belgede yüzlük puan
// varsa not `kaynakNot`a, YALNIZ HARF varsa (çoğu transkriptte durum budur)
// `kaynakHarf`e yazılıyor. Belge üretimi ise yalnız `kaynakNot`a bakıyordu:
// harf notuyla gelen bütün kayıtlarda "karşı başarı notu" sütunu boş
// çıkıyordu. Öğrenci notunu yüklüyor, belgede görünmüyordu.
//
// ── İKİNCİ HATA: ANAHTAR ──
// Öğrencinin girdiği notlar `ogrenciNotlari` içinde SIRA NUMARASIYLA
// saklanıyor. Sıra, panelin listesine göre veriliyor (reddedilenler hariç);
// belge ise onaylananlar üzerinden yeniden sıralıyordu. Bir satır
// reddedildiğinde numaralar kayıyor ve belgeye BAŞKA DERSİN notu yazılıyordu.
// Anahtar artık iki tarafta da aynı kuralla çözülür.
// ══════════════════════════════════════════════════════════════

/** Satır, öğrencinin not girebildiği listede mi? (reddedilenler dışarıda) */
function notlanabilir(m) {
  return !!m && (!m.adminDecision || m.adminDecision === 'confirmed');
}

function kod(m, taraf) {
  const k =
    taraf === 'kaynak' ? m && (m.sourceCourse || m.source) : m && (m.localCourse || m.target);
  const o = k || {};
  return String(o.code || o.name || '')
    .replace(/\s/g, '')
    .toLocaleUpperCase('tr');
}

/** İki satır aynı eşleştirmeyi mi gösteriyor? (kopyalanmış nesneler için) */
function ayniSatir(a, b) {
  if (a === b) return true;
  if (!a || !b) return false;
  if (a.id != null && b.id != null) return String(a.id) === String(b.id);
  return kod(a, 'kaynak') === kod(b, 'kaynak') && kod(a, 'yerel') === kod(b, 'yerel');
}

/**
 * Öğrencinin girdiği notların anahtarı.
 *
 * Panel şu listeyi kullanıyor: reddedilmemiş satırlar, sırasıyla. Anahtar
 * `id` varsa odur, yoksa BU listedeki sıra numarasıdır. Belge de aynı listeyi
 * kurup aynı numarayı bulmak zorunda — kendi sırasını kullanırsa notlar
 * kayar.
 */
export function ogrenciNotAnahtari(matches, eslesme) {
  if (eslesme && eslesme.id != null) return String(eslesme.id);
  const liste = (Array.isArray(matches) ? matches : []).filter(notlanabilir);
  const i = liste.findIndex((m) => ayniSatir(m, eslesme));
  return i >= 0 ? String(i) : '';
}

/** Kayıttaki not girdisi (yoksa boş nesne). */
export function ogrenciNotu(kayit, eslesme) {
  const tumu = (kayit && kayit.ogrenciNotlari) || {};
  const a = ogrenciNotAnahtari(kayit && kayit.matches, eslesme);
  return (a && tumu[a]) || {};
}

/**
 * Karşı kurumun başarı notu.
 *
 * Sıra: talepte saklanan not (muafiyette transkriptten okunur) → belgeden
 * okunan yüzlük puan → belgeden okunan HARF. Sonuncusu eksikti; yaz
 * intibakında belge çoğu zaman yalnız harf taşıyor.
 */
export function karsiBasariNotu(eslesme, notGirdisi) {
  const src = (eslesme && (eslesme.sourceCourse || eslesme.source)) || {};
  const n = notGirdisi || {};
  return (
    String(src.grade || '').trim() ||
    String(n.kaynakNot || '').trim() ||
    String(n.kaynakHarf || '').trim()
  );
}

/**
 * ÇAKÜ karşılığı (harf).
 *
 * Sıra: akademisyenin onayladığı dönüşüm → derse yazılmış not → öğrencinin
 * belgesinden hesaplanan karşılık.
 */
export function cakuBasariNotu(eslesme, notGirdisi) {
  const cak = (eslesme && (eslesme.localCourse || eslesme.target)) || {};
  const n = notGirdisi || {};
  return (
    String((eslesme && eslesme.convertedGrade) || '').trim() ||
    String(cak.grade || '').trim() ||
    String(n.cakuNot || '').trim()
  );
}

/**
 * Bir satırın belgeye yazılacak iki notu.
 *
 * Belge üretimi ve ekran AYNI işi çağırır: ekranda görünen notla belgeye
 * yazılan not birbirinden ayrılmasın.
 */
export function belgeNotlari(kayit, eslesme) {
  const n = ogrenciNotu(kayit, eslesme);
  return { karsi: karsiBasariNotu(eslesme, n), caku: cakuBasariNotu(eslesme, n) };
}

/**
 * Notu eksik satırlar — belge üretmeden önce uyarmak için.
 *
 * Yalnız KARARI OLUMLU (ya da henüz kararsız) satırlar sayılır: reddedilen
 * ders zaten belgeye girmiyor.
 */
export function notsuzSatirlar(kayit) {
  const matches = (kayit && kayit.matches) || [];
  return matches.filter((m) => notlanabilir(m) && !belgeNotlari(kayit, m).karsi);
}
