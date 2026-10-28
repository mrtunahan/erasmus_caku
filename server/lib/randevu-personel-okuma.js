// ══════════════════════════════════════════════════════════════
// RANDEVU TALEPLERİ — PERSONEL YALNIZ KENDİ TALEPLERİNİ AÇIK GÖRÜR
//
// ⚠ Öğrenci okuması maskeleniyordu (lib/ogrenci-maske.js) ama personel
// /api/db/randevu_talepleri ile BÜTÜN akademisyenlerin taleplerini okuyordu:
// hangi öğrenci, hangi hocadan, ne KONUDA ("devamsızlık sorunum") randevu
// istemiş. Akademisyen Sayfam kendi taleplerini süzüyordu ama veri tarayıcıya
// inmişti. Başkasının talebi yalnız SLOT alanlarına indirgenir (aynı
// alanlar öğrenciye de açık); sistem/üniversite yetkilisi hepsini görür.
// ══════════════════════════════════════════════════════════════

const metin = (v) => String(v == null ? '' : v).trim();
const SLOT_ALANLARI = ['akademisyen', 'gun', 'saat', 'tarih', 'durum'];

/** lib/randevu.js → akademisyenAnahtari ile aynı (unvan ve harf farkı yok sayılır). */
function akademisyenAnahtari(ad) {
  const harita = { ç: 'c', ğ: 'g', ı: 'i', ö: 'o', ş: 's', ü: 'u', â: 'a', î: 'i', û: 'u' };
  return metin(ad)
    .replace(/(prof\.?|doç\.?|dr\.?|öğr\.?|gör\.?|arş\.?|üyesi)/gi, ' ')
    .toLocaleLowerCase('tr')
    .replace(/[çğıöşüâîû]/g, (c) => harita[c] || c)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Personelin göreceği hâl: kendi talebi aynen, başkasınınki slot alanları. */
function personelRandevuGorunumu(kayit, ben) {
  if (!kayit || typeof kayit !== 'object') return kayit;
  const anahtar = akademisyenAnahtari(ben);
  if (anahtar && akademisyenAnahtari(kayit.akademisyen) === anahtar) return kayit;
  const out = {};
  ['id', '_docId'].concat(SLOT_ALANLARI).forEach((a) => {
    if (kayit[a] !== undefined) out[a] = kayit[a];
  });
  return out;
}

module.exports = { personelRandevuGorunumu, akademisyenAnahtari, SLOT_ALANLARI };
