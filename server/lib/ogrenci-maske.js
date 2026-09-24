// ══════════════════════════════════════════════════════════════
// ÖĞRENCİ OKUMASINDA BAŞKASININ KAYDINI MASKELEME
//
// ⚠ RANDEVU TALEPLERİ HERKESE AÇIKTI. Öğrenci /api/db/randevu_talepleri
// çağrısıyla bütün talepleri okuyabiliyordu: kim, hangi hocadan, hangi saate
// randevu istemiş ve KONUSU ne ("sınav notum hakkında", "devamsızlık
// sorunum"). Ekran kendi kayıtlarını süzüyordu ama veri çoktan tarayıcıya
// inmişti — süzgeç gizlilik sağlamaz, yalnız görünümü düzenler.
//
// Öğrencinin başkasının talebinden bilmesi gereken tek şey var: o saat
// istenmiş mi, onaylanmış mı. (Aynı saate birden çok öğrenci talep
// gönderebildiği için ekran "2 talep" yazar — gösterilen SAYIDIR, kimlik
// değil.) Bu yüzden KENDİ kaydı olduğu gibi döner, başkasınınki yalnız SLOT
// alanlarına indirgenir; ad, numara, konu ve hocanın notu hiç çıkmaz.
//
// ── NEDEN STUDENT_READ_STRIPPED YETMEDİ ──
// O mekanizma koleksiyonun TÜM kayıtlarına aynı alan listesini uygular;
// öğrenci kendi talebinin konusunu da göremez olurdu. Maske SAHİPLİĞE bakar.
// ══════════════════════════════════════════════════════════════

/**
 * Koleksiyon → maske tanımı.
 *   sahip   → kaydın sahibini söyleyen alan (JWT'deki öğrenci numarasıyla kıyaslanır)
 *   alanlar → başkasının kaydından görünmeye devam eden alanlar
 */
const STUDENT_READ_MASKED = {
  randevu_talepleri: {
    sahip: 'studentNumber',
    alanlar: ['akademisyen', 'gun', 'saat', 'tarih', 'durum'],
  },
};

/**
 * Başkasının kaydını izinli alanlara indirger; kendi kaydına dokunmaz.
 *
 * ⚠ SAHİPSİZ KAYIT DA MASKELENİR. `studentNumber` alanı boş bir kayıt
 * (eski/bozuk veri) "kimsenin değil" demektir; onu açık döndürmek, maskenin
 * kaçış kapısı olurdu.
 *
 * @param {object} kayit  döndürülecek doküman (id alanı korunur)
 * @param {object} maske  STUDENT_READ_MASKED girdisi
 * @param {string} ogrNo  isteği yapan öğrencinin numarası
 */
function ogrenciMaskesiUygula(kayit, maske, ogrNo) {
  if (!maske || !kayit || typeof kayit !== 'object') return kayit;
  const sahip = String(kayit[maske.sahip] == null ? '' : kayit[maske.sahip]).trim();
  const ben = String(ogrNo == null ? '' : ogrNo).trim();
  if (sahip && ben && sahip === ben) return kayit;
  const kirpik = {};
  (maske.alanlar || []).forEach((f) => {
    if (kayit[f] !== undefined) kirpik[f] = kayit[f];
  });
  if (kayit.id !== undefined) kirpik.id = kayit.id;
  return kirpik;
}

module.exports = { STUDENT_READ_MASKED, ogrenciMaskesiUygula };
