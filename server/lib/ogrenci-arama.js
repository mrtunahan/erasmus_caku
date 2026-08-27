// ══════════════════════════════════════════════════════════════
// ÖĞRENCİ ADI ARAMA — KAPSAM VE SÜZGEÇ
//
// `students` koleksiyonu öğrenciye kapalıdır: kendi kaydı dışında hiçbir
// öğrenciyi okuyamaz (routes/db.js → STUDENT_READ_SCOPED). Proje modülünde
// grup üyesi seçerken ada göre öneri gerektiğinden dar bir arama kapısı var:
// yalnız AD döner, kapsam sunucuda belirlenir.
//
// Kural:
//   • Personel (akademisyen/memur/yönetici) istediği bölümü sorabilir; zaten
//     koleksiyonu okuma yetkisi vardır.
//   • Öğrencinin kapsamı KENDİ kaydından çözülür: ana bölümü + ek bölümleri.
//     İstemcinin gönderdiği departmentId ancak bu kümedeyse dikkate alınır;
//     değilse tüm kendi bölümleri taranır. Bölümü çözülemeyen öğrenci için
//     arama açılmaz (aksi halde tüm okulu tarayabilirdi).
// ══════════════════════════════════════════════════════════════

function metin(d) {
  return String(d == null ? '' : d).trim();
}

/**
 * Aranacak bölüm kimliklerini döndürür.
 * @param {{role?: string}|null} kullanici oturum sahibi (yoksa öğrenci sayılır)
 * @param {object|null} benKaydi öğrencinin kendi `students` kaydı
 * @param {string} istenen istemcinin gönderdiği departmentId
 * @returns {{izin: boolean, kapsamlar: string[]}}
 */
function aramaKapsami(kullanici, benKaydi, istenen) {
  const talep = metin(istenen);
  const ogrenci = !kullanici || kullanici.role === 'student';
  if (!ogrenci) {
    return { izin: true, kapsamlar: talep ? [talep] : [] };
  }
  if (!benKaydi) return { izin: false, kapsamlar: [] };
  const ek = Array.isArray(benKaydi.additionalDepartments) ? benKaydi.additionalDepartments : [];
  const kendi = [];
  [benKaydi.departmentId].concat(ek).forEach((d) => {
    const k = metin(d);
    if (k && !kendi.includes(k)) kendi.push(k);
  });
  if (kendi.length === 0) return { izin: false, kapsamlar: [] };
  return { izin: true, kapsamlar: talep && kendi.includes(talep) ? [talep] : kendi };
}

/** Düzenli ifade özel karakterlerini kaçırır (kullanıcı metni desen olmasın). */
function desenKacir(q) {
  return metin(q).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Kayıtlardan yinelenmeyen görünen ad listesi üretir. */
function aramaAdlari(kayitlar) {
  const adlar = [];
  (Array.isArray(kayitlar) ? kayitlar : []).forEach((s) => {
    if (!s) return;
    const ad = `${metin(s.firstName)} ${metin(s.lastName)}`.trim() || metin(s.name);
    if (ad && !adlar.includes(ad)) adlar.push(ad);
  });
  return adlar;
}

module.exports = { aramaKapsami, desenKacir, aramaAdlari };
