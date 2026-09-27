// ══════════════════════════════════════════════════════════════
// ÖĞRENCİNİN AÇTIĞI YENİ KAYDIN SAHİBİ KİM?
//
// Öğrenci `add` (ya da var olmayan kimliğe upsert) ile yeni kayıt açarken
// sahiplik alanlarını gövdeye KENDİSİ yazıyordu ve sunucu bunlara
// bakmıyordu. Sonuç: öğrenci A, `studentNo: B` ile B adına muafiyet ya da
// staj başvurusu açabiliyor, B'nin bildirim kutusuna sahte "sistem"
// bildirimi düşürebiliyordu. `_owner` da yalnız BOŞSA damgalanıyordu;
// gövdede `_owner: B` gelirse kayıt B'nin sayılıyordu.
//
// Kural:
//   • `_owner` HER ZAMAN işlemi yapan öğrencidir (istemci değeri yok sayılır).
//   • Aşağıdaki koleksiyonlarda sahiplik alanı DOLUYSA öğrencinin kendi
//     numaralarından biri olmalıdır (ÇAP'ta iki numara olabilir). Değilse
//     istek REDDEDİLİR — sessizce düzeltilmez, çünkü düzeltmek yanlış
//     kişinin kaydını doğru kişiye yazmak olurdu.
//   • Alan BOŞSA dokunulmaz: veri biçimi değişmesin (ör. anket yanıtında
//     `userId` öğrencide AD taşır ve "zaten yanıtladınız" denetimi ona
//     bakar; bu yüzden anket için yalnız `studentNumber` denetlenir).
//
// Personel (vekâleten aday başvurusu dahil) bu kuraldan etkilenmez;
// yalnız `role === 'student'` yazmalarında uygulanır.
// ══════════════════════════════════════════════════════════════

const SAHIPLIK_ALANLARI = {
  muafiyet_records: ['studentNo'],
  internship_applications: ['ogrenciNo'],
  cap_yandal_basvurular: ['ogrenciNo', 'createdBy'],
  yatay_gecis_basvurular: ['ogrenciNo'],
  ogrenci_akademik_kayit: ['studentNo'],
  student_notifications: ['studentNumber'],
  internship_notifications: ['studentNo'],
  survey_responses: ['studentNumber'],
  randevu_talepleri: ['studentNumber'],
};

const metin = (v) => String(v == null ? '' : v).trim();

/**
 * Öğrencinin açtığı yeni kaydı denetler ve `_owner`'ı damgalar.
 * `data` YERİNDE değiştirilir.
 *
 * @param {string} koleksiyon
 * @param {object} data       yazılacak gövde
 * @param {string} kimlik     JWT kimliği (öğrenci no)
 * @param {string[]} numaralar öğrencinin tüm numaraları (ÇAP bağı dahil)
 * @returns {{izin: boolean, hata?: string}}
 */
function yeniKayitSahipligi(koleksiyon, data, kimlik, numaralar) {
  if (!data || typeof data !== 'object') return { izin: true };
  const ben = metin(kimlik);
  const benim = new Set(
    (Array.isArray(numaralar) ? numaralar : [numaralar])
      .map(metin)
      .filter(Boolean)
      .concat(ben ? [ben] : [])
  );
  const alanlar = SAHIPLIK_ALANLARI[String(koleksiyon || '')] || [];
  for (const alan of alanlar) {
    const deger = metin(data[alan]);
    if (deger && !benim.has(deger)) {
      return {
        izin: false,
        hata: 'Başka bir öğrenci adına kayıt oluşturamazsınız (' + alan + ').',
      };
    }
  }
  if (ben) data._owner = ben;
  return { izin: true };
}

module.exports = { SAHIPLIK_ALANLARI, yeniKayitSahipligi };
