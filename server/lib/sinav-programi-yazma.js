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
const { ayniBolum } = require('./bolum-kimlik');

const SINAV_PROGRAMI = 'sinav_programi';
const BOLUM_SINAV_KAYITLARI = new Set(['sinav_donemler', 'sinav_dersler', 'department_classrooms']);

const metin = (v) => String(v == null ? '' : v).trim();
const ret = (hata) => ({ izin: false, hata });
const IZIN = { izin: true };

// Ad eşleştirmesi istemcideki kuralla BİREBİR aynı (lib/akademisyen-programi.js
// → adAnahtari, lib/ders-egitmenleri.js → egitmenleriCoz): istemcinin "kendi
// dersin" dediği bir sınavı sunucu reddetmemeli. Unvan kelimeleri adın her
// yerinden atılır; ayraç '/' ve ';' (virgül değil).
const UNVAN_KELIMELERI = new Set([
  'prof',
  'profesör',
  'doç',
  'doc',
  'doçent',
  'docent',
  'dr',
  'doktor',
  'yrd',
  'yardımcı',
  'öğr',
  'ogr',
  'öğrt',
  'öğretim',
  'ogretim',
  'gör',
  'gor',
  'görevlisi',
  'gorevlisi',
  'üyesi',
  'uyesi',
  'arş',
  'ars',
  'araş',
  'araştırma',
  'arastirma',
  'uzm',
  'uzman',
  'okt',
  'okutman',
]);

/** "Dr. Öğr. Üyesi Ali VELİ" → "ali veli" (unvan ve harf farkı önemsenmez). */
// Türkçe harfler ASCII'ye katlanır: ekran ders kaydındaki adı Türkçe
// yazımla ("Özgür Yılmaz") gösterip geri yazabiliyor, giriş adı ASCII olabilir.
const katla = (k) =>
  k
    .replace(/ç/g, 'c')
    .replace(/ğ/g, 'g')
    .replace(/ı/g, 'i')
    .replace(/i̇/g, 'i')
    .replace(/ö/g, 'o')
    .replace(/ş/g, 's')
    .replace(/ü/g, 'u');
const UNVAN_KATLI = new Set([...UNVAN_KELIMELERI].map(katla));

function kisiAnahtari(ad) {
  return metin(ad)
    .replace(/[.,]/g, ' ')
    .split(/\s+/)
    .map((k) => katla(k.trim().toLocaleLowerCase('tr-TR')))
    .filter((k) => k && !UNVAN_KATLI.has(k))
    .join(' ');
}

/** Kaydın öğretim elemanları (dizi ya da "A / B" birleşik yazım). */
function hocalari(kayit) {
  if (!kayit) return [];
  return []
    .concat(Array.isArray(kayit.professors) ? kayit.professors : [], kayit.professor || [])
    .flatMap((x) => metin(x).split(/[/;]/))
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
 * @param {object} [ek] { ders: sınavın dersi (sinav_dersler), donemBolumu:
 *   bölümü boş eski kayıtta sınav döneminin bölümü }
 * @returns {{izin:boolean, hata?:string}}
 */
function sinavProgramiYazmaKarari(op, mevcut, alan, kullaniciAdi, ek) {
  if (!op) return IZIN;
  const a = alan || { tur: 'yok' };
  if (a.tur === 'universite') return IZIN;
  const koleksiyon = op.collection;
  if (koleksiyon !== SINAV_PROGRAMI && !BOLUM_SINAV_KAYITLARI.has(koleksiyon)) return IZIN;
  const e = ek || {};

  const veri = op.data && typeof op.data === 'object' ? op.data : {};
  // Bölümü boş eski kayıt dönemin bölümüyle değerlendirilir (yoksa hiçbir
  // yetkili düzenleyemiyordu).
  const eskiBolum = metin(mevcut && mevcut.departmentId) || (mevcut ? metin(e.donemBolumu) : '');
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

  // sinav_programi — akademisyen yalnız KENDİ dersinin sınavını yazar.
  const hata = yetkili
    ? 'Bu sınav yetki alanınızdaki bir bölüme ait değil (ve dersin hocası değilsiniz).'
    : 'Yalnız kendi dersinizin sınavını düzenleyebilirsiniz.';
  const ders = e.ders || null;
  // Kayıt alanları değiştirilerek başka bölüme/döneme taşınamaz.
  if (mevcut) {
    for (const alanAdi of ['departmentId', 'periodId', 'courseId']) {
      if (alanAdi in veri && metin(veri[alanAdi]) !== metin(mevcut[alanAdi])) {
        return ret('Sınavın bölümü, dönemi ya da dersi değiştirilemez.');
      }
    }
  } else {
    // Ekleme: bir derse bağlı olmalı ve sınav dersin bölümünde açılmalı.
    if (!ders) return ret('Sınav bir derse bağlı olmalı.');
    if (!yeniBolum) return ret('Sınavın bölümü belli değil.');
    if (metin(ders.departmentId) && !ayniBolum(ders.departmentId, yeniBolum, a.harita)) {
      return ret('Sınav dersin bölümünde açılmalı.');
    }
  }
  // Mevcut kayıt: sınavda ya da dersinde hocası olmalı. Yeni hâl (ekleme ya
  // da hoca alanını değiştiren yazım) de kendi dersi olmalı.
  const eskiKendi = !mevcut || kendiDersi(mevcut, kullaniciAdi) || kendiDersi(ders, kullaniciAdi);
  // Hoca alanı GERÇEKTEN değişiyor mu? (Ekran kaydı bütün alanlarıyla geri
  // yazar; aynı değer "değişiklik" sayılmaz.)
  const hocaKumesi = (x) => hocalari(x).sort().join('|');
  const hocaDegisiyor =
    ('professor' in veri || 'professors' in veri) &&
    (!mevcut || hocaKumesi({ ...mevcut, ...veri }) !== hocaKumesi(mevcut));
  // Hoca değişiyorsa yeni hâl de kişinin dersi olmalı (sınavı başkasına
  // devredip sonra dokunulmaz kılmasın); dersin kaydı da kişinin olabilir.
  const yeniKendi =
    !hocaDegisiyor ||
    kendiDersi({ ...(mevcut || {}), ...veri }, kullaniciAdi) ||
    kendiDersi(ders, kullaniciAdi);
  const dersKendi = mevcut ? true : kendiDersi(ders, kullaniciAdi);
  if (eskiKendi && yeniKendi && dersKendi) return IZIN;
  return ret(hata);
}

module.exports = {
  sinavProgramiYazmaKarari,
  SINAV_PROGRAMI_KOLEKSIYONLARI: new Set([SINAV_PROGRAMI, ...BOLUM_SINAV_KAYITLARI]),
  kisiAnahtari,
};
