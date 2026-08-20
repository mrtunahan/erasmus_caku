// ══════════════════════════════════════════════════════════════
// TOHUM NOT MU, İNSAN ELİ Mİ?
//
// "Gidiş Eşleştirmelerinden Hızlı Doldur" düğmesi her ders için sabit
// iki değer yazıyordu: karşı kurum notu 'A', denklik 'Muaf'. Bu kayıtlar
// silinecek — ama aynı alanlarda akademisyenin ELLE yazdığı gerçek notlar
// da duruyor olabilir ve onlar silinemez.
//
// ── ALAN ADI AYIRMAZ, DEĞER AYIRIR ──
// İki durum da aynı alanları (hostGrade/homeGrade/hostGrades/homeGrades)
// kullanır; hangisinin dolu olduğuna bakmak hiçbir şey söylemez. Ayrımı
// DEĞERLER yapar: tohum her zaman aynı iki sabiti taşır.
//
// `erasmusNotOnayi` damgası da bugün ayırmaz: alan yeni eklendi, canlıdaki
// hiçbir kayıtta yok. Bu yüzden korumayı damgaya bırakmak, hiç koruma
// koymamakla aynı şeydi.
//
// ── KARARSIZSA DOKUNMA ──
// Bir eşleştirmede tohum sabitleri DIŞINDA tek bir değer bile varsa o
// eşleştirmeye insan eli değmiştir; tamamı korunur. Yanlış silinen gerçek
// bir not, duran sahte bir nottan daha pahalıdır.
// ══════════════════════════════════════════════════════════════

const NOT_ALANLARI = ['hostGrade', 'homeGrade', 'hostGrades', 'homeGrades'];

// Hızlı doldurmanın yazdığı sabitler.
const TOHUM_HOST = 'a';
const TOHUM_HOME = 'muaf';

const anahtar = (v) =>
  String(v == null ? '' : v)
    .trim()
    .toLocaleLowerCase('tr');
const dolu = (v) => anahtar(v) !== '';

/** Eşleştirmedeki her not değeri: {alan, taraf, deger}. */
function notDegerleri(m) {
  if (!m || typeof m !== 'object') return [];
  const out = [];
  ['hostGrade', 'homeGrade'].forEach((a) => {
    if (dolu(m[a]))
      out.push({ alan: a, taraf: a === 'hostGrade' ? 'host' : 'home', deger: String(m[a]) });
  });
  ['hostGrades', 'homeGrades'].forEach((a) => {
    const o = m[a];
    if (!o || typeof o !== 'object') return;
    Object.keys(o).forEach((k) => {
      if (dolu(o[k])) {
        out.push({
          alan: `${a}[${k}]`,
          taraf: a === 'hostGrades' ? 'host' : 'home',
          deger: String(o[k]),
        });
      }
    });
  });
  return out;
}

/**
 * 'bos'   — not yok, yapılacak bir şey yok
 * 'tohum' — tüm değerler hızlı doldurmanın sabitleri: silinebilir
 * 'insan' — en az bir değer başka: elle girilmiş, KORUNUR
 */
function tohumKokusu(m) {
  const d = notDegerleri(m);
  if (!d.length) return 'bos';
  const hepsiTohum = d.every((x) =>
    x.taraf === 'host' ? anahtar(x.deger) === TOHUM_HOST : anahtar(x.deger) === TOHUM_HOME
  );
  return hepsiTohum ? 'tohum' : 'insan';
}

/** Not alanları boşaltılmış kopya. */
function notlariBosalt(m) {
  const temiz = { ...m };
  NOT_ALANLARI.forEach((a) => delete temiz[a]);
  return temiz;
}

module.exports = { NOT_ALANLARI, notDegerleri, tohumKokusu, notlariBosalt };
