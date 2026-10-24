// ══════════════════════════════════════════════════════════════
// DERS PROGRAMI × SINAV PROGRAMI ÇAKIŞMASI (uyarı)
//
// Vize haftaları ders haftalarının içindedir: bir salona sınav konurken o
// saatte orada ders olabilir, gözetmen o saatte ders anlatıyor olabilir.
// Sınav modülü ders programını hiç okumuyordu. Burada sınavın tarihi
// haftanın gününe çevrilir, ders programının (course_schedules) aynı gün ve
// saatteki dersleriyle karşılaştırılır:
//   • 'ders_salon'    : sınav salonunda o saatte ders var
//   • 'ders_gozetmen' : sınavın gözetmeni o saatte ders veriyor
//
// UYARIDIR, ENGEL DEĞİL: ders o hafta yapılmayabilir (sınav haftası ders
// yapılmaz kararı), ya da ders başka salona alınmış olabilir.
//
// Sınavın KENDİ dersi sayılmaz: dersin sınavı, o dersin saatinde ve salonunda,
// hocası gözetmenken yapılabilir — o saatte ders zaten sınavın kendisidir.
// Birleşik oturumun üyeleri aynı satırı bir kez üretir.
// ══════════════════════════════════════════════════════════════

import { adAnahtari } from './gozetmen.js';

const metin = (v) => String(v == null ? '' : v).trim();
export const PROGRAM_GUNLERI = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma'];

const dk = (saat) => {
  const m = /^\s*(\d{1,2}):(\d{2})/.exec(String(saat || ''));
  return m ? parseInt(m[1], 10) * 60 + parseInt(m[2], 10) : null;
};
// Ders kodu karşılaştırması: "FİZ181/FZK181", "KİM177 / KİM161", "İNŞ231" ile
// "INS231" aynı ders sayılır (boşluk, harf büyüklüğü ve Türkçe harf farkı yok).
const KATLA = { İ: 'I', I: 'I', Ş: 'S', Ğ: 'G', Ü: 'U', Ö: 'O', Ç: 'C' };
const kodlar = (v) =>
  metin(v)
    .split(/[/,;]/)
    .map((k) =>
      k
        .replace(/\s+/g, '')
        .toLocaleUpperCase('tr-TR')
        .replace(/[İIŞĞÜÖÇ]/g, (h) => KATLA[h])
    )
    .filter(Boolean);
const salonParcala = (v) =>
  metin(v)
    .split(/\s+-\s+|,/)
    .map(metin)
    .filter((x) => x && x !== 'TBD');

/** Sınav döneminin (ya da tarihin) ders yarıyılı: 'guz' | 'bahar' | ''. */
export function yariyilAnahtari(donem, tarih) {
  const t = metin(donem && (donem.semester || donem.label)).toLocaleLowerCase('tr-TR');
  if (t.includes('güz') || t.includes('guz')) return 'guz';
  if (t.includes('bahar')) return 'bahar';
  const ay = parseInt(metin(tarih).slice(5, 7), 10);
  if (!ay) return '';
  return ay >= 9 || ay === 1 ? 'guz' : ay >= 2 && ay <= 6 ? 'bahar' : '';
}

/**
 * Ders programı belgelerini olay listesine çevirir.
 * @param {object[]} dokumanlar course_schedules ({ id: bolum_yari_sinif[_seviye], slots })
 * @param {object} o { slotDersleri(slot) => ders[], saatler(bolum, seviye) => etiket[] }
 * @returns {{gun, bas, bit, salon, hoca, kod, bolum, yari}[]}
 */
export function dersProgramiOlaylari(dokumanlar, o) {
  const op = o || {};
  if (typeof op.slotDersleri !== 'function') return [];
  const saatler = typeof op.saatler === 'function' ? op.saatler : () => [];
  const out = [];
  (dokumanlar || []).forEach((dok) => {
    if (!dok) return;
    const parca = metin(dok.id || dok._docId).split('_');
    const bolum = metin(dok.departmentId) || parca[0] || '';
    const yari = metin(dok.semester) || parca[1] || '';
    const seviye = metin(dok.seviye) || (parca.length >= 4 ? parca[3] : 'lisans');
    const etiketler = saatler(bolum, seviye) || [];
    Object.entries(dok.slots || {}).forEach(([anahtar, slot]) => {
      const [gun, iStr] = String(anahtar).split('_');
      const i = parseInt(iStr, 10);
      if (!PROGRAM_GUNLERI.includes(gun) || !Number.isInteger(i)) return;
      const etiket = metin(etiketler[i]);
      const bas = dk(etiket.split('-')[0]);
      const bit = dk(etiket.split('-')[1]);
      if (bas == null || bit == null) return;
      op.slotDersleri(slot).forEach((d) =>
        out.push({
          gun,
          bas,
          bit,
          salon: metin(d.classroom),
          hoca: metin(d.instructor),
          kod: metin(d.courseCode),
          bolum,
          yari,
        })
      );
    });
  });
  return out;
}

/**
 * @param {object[]} sinavlar  sınav kayıtları
 * @param {object[]} olaylar   dersProgramiOlaylari çıktısı
 * @param {object} [o] { donemler } — yarıyıl eşlemesi için
 * @returns {{tur, sinav, ders, kisi?, salon?, mesaj}[]}
 */
export function dersSinavCakismalari(sinavlar, olaylar, o) {
  const donemler = (o && o.donemler) || [];
  const donemOf = (id) =>
    donemler.find((d) => metin(d && (d.id || d._docId || (d._id && String(d._id)))) === metin(id));
  const out = [];
  const gorulen = new Set();
  (sinavlar || []).forEach((s) => {
    if (!s || !metin(s.date)) return;
    const t = new Date(metin(s.date) + 'T00:00:00');
    const gi = t.getDay(); // 1 = Pazartesi
    if (!(gi >= 1 && gi <= 5)) return;
    const gun = PROGRAM_GUNLERI[gi - 1];
    const bas = dk(s.timeSlot);
    if (bas == null) return;
    const bit = bas + (Number(s.duration) || 60);
    const yari = yariyilAnahtari(donemOf(s.periodId), s.date);
    const salonlar = new Set(salonParcala(s.room));
    const gozetmenler = metin(s.supervisor).split(',').map(metin).filter(Boolean);
    const gozK = new Map(gozetmenler.map((g) => [adAnahtari(g), g]));
    const sinavKodlari = new Set(kodlar(s.code));
    const sinavAnahtari = metin(s.date) + '|' + metin(s.timeSlot) + '|' + (metin(s.code) || s.id);
    (olaylar || []).forEach((d) => {
      if (d.gun !== gun || !(d.bas < bit && bas < d.bit)) return;
      if (yari && d.yari && d.yari !== yari) return;
      if (kodlar(d.kod).some((k) => sinavKodlari.has(k))) return;
      const saat = metin(s.timeSlot);
      if (d.salon && salonlar.has(d.salon)) {
        const k = 's|' + sinavAnahtari + '|' + d.salon + '|' + d.bas + '|' + d.kod;
        if (!gorulen.has(k)) {
          gorulen.add(k);
          out.push({
            tur: 'ders_salon',
            sinav: s,
            ders: d,
            salon: d.salon,
            mesaj:
              (s.code || 'Sınav') +
              ' (' +
              saat +
              ') ' +
              d.salon +
              ' salonunda; o saatte orada ' +
              (d.kod || 'bir ders') +
              ' dersi var.',
          });
        }
      }
      const hk = adAnahtari(d.hoca);
      if (hk && gozK.has(hk)) {
        const k = 'g|' + sinavAnahtari + '|' + hk + '|' + d.bas + '|' + d.kod;
        if (!gorulen.has(k)) {
          gorulen.add(k);
          out.push({
            tur: 'ders_gozetmen',
            sinav: s,
            ders: d,
            kisi: gozK.get(hk),
            mesaj:
              gozK.get(hk) +
              ', ' +
              (s.code || 'sınav') +
              ' (' +
              saat +
              ') gözetmeni; o saatte ' +
              (d.kod || 'bir') +
              ' dersini veriyor' +
              (d.salon ? ' (' + d.salon + ')' : '') +
              '.',
          });
        }
      }
    });
  });
  // Tarih ve saat sırası: liste günlere göre okunur.
  const sira = (c) => metin(c.sinav.date) + ' ' + metin(c.sinav.timeSlot).padStart(5, '0');
  return out.sort((a, b) => sira(a).localeCompare(sira(b)));
}
