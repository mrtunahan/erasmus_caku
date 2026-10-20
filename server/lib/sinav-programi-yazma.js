/**
 * SINAV PROGRAMI — BÖLÜM VERİLERİ YAZMA KURALLARI (SUNUCU)
 *
 * İstemci kuralları (akademisyen yalnız kendi dersinin sınavını yerleştirir,
 * bölüm yetkilisi yalnız kendi bölümünü düzenler) yalnız arayüzdeydi: her
 * akademisyen /api/db/write ile başka bölümün sınavını taşıyabilir, silebilir
 * ya da sınav dönemini (bütün sınavlarıyla) silebilirdi.
 *
 *   sinav_programi
 *     • yetkili (bölüm/fakülte): kaydın bölümü alanındaysa
 *     • akademisyen: kayıt KENDİ dersinin sınavıysa (dersin hoca(lar)ından
 *       biri; unvan ve harf farkı önemsenmez) ve bölümü değişmiyorsa
 *   sinav_donemler, sinav_dersler, department_classrooms
 *     • yalnız yetkili, kaydın bölümü alanındaysa
 *
 * Üniversite yetkilisi / admin her yerde yazar. `alan` = yetkiAlani çıktısı.
 */
const { bolumAlanda } = require('./yetki-alani');

const SINAV_PROGRAMI = 'sinav_programi';
const BOLUM_SINAV_KAYITLARI = new Set(['sinav_donemler', 'sinav_dersler', 'department_classrooms']);

const metin = (v) => String(v == null ? '' : v).trim();
const ret = (hata) => ({ izin: false, hata });
const IZIN = { izin: true };

// Baştaki unvan kelimeleri (lib/akademik-unvan.js listesinin kelimeleri).
const UNVAN_KELIMELERI = new Set([
  'prof',
  'profesör',
  'doç',
  'doc',
  'doçent',
  'yrd',
  'yardımcı',
  'dr',
  'doktor',
  'öğr',
  'ogr',
  'öğrt',
  'öğretim',
  'üyesi',
  'uyesi',
  'gör',
  'gor',
  'görevlisi',
  'arş',
  'ars',
  'araştırma',
  'okutman',
  'uzm',
  'uzman',
]);

/** "Dr. Öğr. Üyesi Ali VELİ" → "ali veli" (unvan ve harf farkı önemsenmez). */
function kisiAnahtari(ad) {
  const kelimeler = metin(ad)
    .toLocaleLowerCase('tr-TR')
    .replace(/[.,]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
  while (kelimeler.length > 1 && UNVAN_KELIMELERI.has(kelimeler[0])) kelimeler.shift();
  return kelimeler.join(' ');
}

/** Kaydın öğretim elemanları ("A / B" ya da "A, B" birleşik yazım da). */
function hocalari(kayit) {
  if (!kayit) return [];
  return []
    .concat(Array.isArray(kayit.professors) ? kayit.professors : [], kayit.professor || [])
    .flatMap((x) => metin(x).split(/\s*[/;]\s*|\s*,\s*(?=\S+\.)/))
    .map(kisiAnahtari)
    .filter(Boolean);
}

const kendiDersi = (kayit, kullaniciAdi) => {
  const k = kisiAnahtari(kullaniciAdi);
  return !!k && hocalari(kayit).includes(k);
};

/**
 * @param {object} op yazma işlemi
 * @param {object|null} mevcut belgenin şimdiki hâli
 * @param {object} alan yetkiAlani çıktısı
 * @param {string} kullaniciAdi oturumdaki kimlik (ad)
 * @returns {{izin:boolean, hata?:string}}
 */
function sinavProgramiYazmaKarari(op, mevcut, alan, kullaniciAdi) {
  if (!op) return IZIN;
  const a = alan || { tur: 'yok' };
  if (a.tur === 'universite') return IZIN;
  const koleksiyon = op.collection;
  if (koleksiyon !== SINAV_PROGRAMI && !BOLUM_SINAV_KAYITLARI.has(koleksiyon)) return IZIN;

  const veri = op.data && typeof op.data === 'object' ? op.data : {};
  const eskiBolum = metin(mevcut && mevcut.departmentId);
  const yeniBolum = metin(veri.departmentId);
  const bolumler = [eskiBolum, yeniBolum].filter(Boolean);
  const yetkili = a.tur === 'bolum' || a.tur === 'fakulte';
  if (yetkili && bolumler.length > 0 && bolumler.every((b) => bolumAlanda(a, b))) return IZIN;

  if (BOLUM_SINAV_KAYITLARI.has(koleksiyon)) {
    return ret(
      bolumler.length === 0
        ? 'Kaydın bölümü belli değil.'
        : 'Bu kaydı yalnız bölümün (ya da fakültenin) yetkilisi düzenler.'
    );
  }

  // sinav_programi — akademisyen yalnız kendi dersinin sınavını.
  if (eskiBolum && yeniBolum && eskiBolum !== yeniBolum) {
    return ret('Sınavın bölümü değiştirilemez.');
  }
  const kontrol = [];
  if (mevcut) kontrol.push(mevcut);
  // Ekleme ya da hoca alanlarını değiştiren yazım: yeni hâl de kendi dersi olmalı.
  if (!mevcut || 'professor' in veri || 'professors' in veri) {
    kontrol.push({ ...(mevcut || {}), ...veri });
  }
  if (kontrol.length > 0 && kontrol.every((k) => kendiDersi(k, kullaniciAdi))) return IZIN;
  return ret('Yalnız kendi dersinizin sınavını düzenleyebilirsiniz.');
}

module.exports = {
  sinavProgramiYazmaKarari,
  SINAV_PROGRAMI_KOLEKSIYONLARI: new Set([SINAV_PROGRAMI, ...BOLUM_SINAV_KAYITLARI]),
  kisiAnahtari,
};
