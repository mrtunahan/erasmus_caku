// ══════════════════════════════════════════════════════════════
// ÖĞRENCİNİN OKUYABİLECEĞİ KAYIT — KOLEKSİYON KOLEKSİYON
//
// ⚠ SORUN: giriş yapmış öğrenci, /api/db/<koleksiyon> ile bir koleksiyonun
// TAMAMINI çekebiliyordu. Ekranlar kendi kayıtlarını süzüyordu ama veri çoktan
// tarayıcıya inmişti — süzgeç gizlilik sağlamaz, yalnız görünümü düzenler.
// Böylece bir öğrenci şunları okuyabiliyordu:
//
//   muafiyet_history          → herkesin muaf sayılan dersi, NOTU, numarası
//   trip_history              → Erasmus geçmişi, ad ve numara
//   student_notifications     → herkesin bildirimi (RED GEREKÇELERİ dahil)
//   notifications             → merkezî bildirimler
//   internship_notifications  → kim hangi adımda, kim reddetti
//   survey_responses          → anket yanıtları, KİMLİĞİYLE
//   internship_uploads        → başkasının staj belgelerinin dosya yolu
//   internship_roadmap        → başkasının staj süreci
//
// ⚠ NEDEN `STUDENT_READ_SCOPED` YETMEDİ: o mekanizma tek bir alanda EŞİTLİK
// kurabiliyor. Buradaki kayıtların sahipliği üç ayrı biçimde çözülüyor:
//   • doğrudan alan       (studentNo / studentNumber / targetStudentNo)
//   • alıcı kuralı        (notifications: kişiye mi, bölüme mi, role mi)
//   • başka koleksiyon    (staj belgeleri: sahibi BAŞVURUNUN öğrencisidir)
// Ayrıca bazı kayıtların tamamı gizlenemez: Erasmus kurum listesi geçmişten
// türüyor; orada satır KALIR, kimlik alanları düşer (maske).
//
// ⚠ VERİ KAYBI YAŞATMAMA KURALI: hiçbir kural, öğrencinin KENDİ kaydını
// gizlememelidir. Anket yanıtında kimlik alanı geçmişte ÖĞRENCİNİN ADIYLA
// yazılmış (`userId`); numarayla da adla da eşleşme kabul edilir, yoksa
// "bu anketi yanıtladınız" bilgisi kaybolur ve öğrenci ikinci kez yanıtlar.
// ══════════════════════════════════════════════════════════════

const metin = (v) => String(v == null ? '' : v).trim();

/**
 * İki kimlik değerini karşılaştırır (boş değer hiçbir şeye eşit değildir).
 * İkinci taraf LİSTE olabilir: çift numaralı ÇAP öğrencisinin iki numarası da
 * kendisidir (bkz. lib/ogrenci-baglanti.js) ve ikisinin kayıtları da onundur.
 */
function esit(a, b) {
  const x = metin(a);
  if (!x) return false;
  const liste = Array.isArray(b) ? b : [b];
  return liste.some((y) => {
    const z = metin(y);
    return !!z && z === x;
  });
}

/**
 * Koleksiyon → öğrenci okuma kuralı.
 *
 *   tur: 'sahip'   → kayıtta şu alanlardan BİRİ öğrencinin kimliğiyse görünür
 *   tur: 'alici'   → bildirim alıcı kuralı (kişi / bölüm / rol)
 *   tur: 'basvuru' → sahiplik başka koleksiyondan (staj başvurusu) çözülür
 *   tur: 'maske'   → satır kalır, yalnız `gorunen` alanları döner
 */
const OGRENCI_OKUMA = {
  muafiyet_history: { tur: 'sahip', alanlar: ['studentNo', 'studentNumber'] },
  student_notifications: { tur: 'sahip', alanlar: ['studentNumber', 'studentNo'] },
  internship_notifications: { tur: 'sahip', alanlar: ['targetStudentNo', 'studentNo'] },
  // Anket yanıtı: kimlik alanı eski kayıtlarda AD, yenilerde numara.
  survey_responses: { tur: 'sahip', alanlar: ['userId', 'studentNumber'], adKabul: true },
  notifications: { tur: 'alici' },
  internship_uploads: { tur: 'basvuru' },
  internship_roadmap: { tur: 'basvuru' },
  // Erasmus geçmişi: kurum listesi buradan türüyor, satır KALMALI. Kimlik ve
  // not alanları düşer; kendi kaydı olduğu gibi döner.
  trip_history: {
    tur: 'maske',
    alanlar: ['studentNumber'],
    gorunen: [
      'hostInstitution',
      'homeInstitution',
      'sourceUniversity',
      'departmentId',
      'department',
      'semester',
      'academicYear',
      'yil',
      'donem',
    ],
  },
};

/** Bu koleksiyonun öğrenci okuma kuralı (yoksa null). */
function ogrenciOkumaKurali(koleksiyon) {
  return OGRENCI_OKUMA[koleksiyon] || null;
}

/** Sahiplik alanlarından biri öğrenciye mi ait? */
function sahibiMi(kayit, kural, kimlik) {
  const k = kimlik || {};
  const alanlar = (kural && kural.alanlar) || [];
  return alanlar.some((alan) => {
    const deger = kayit ? kayit[alan] : '';
    if (esit(deger, k.no)) return true;
    // Eski kayıtlarda kimlik AD olarak yazılmış olabilir (bkz. başlık).
    return !!kural.adKabul && esit(deger, k.ad);
  });
}

/** Bildirim bu öğrenciye mi geliyor? (istemcideki Notify.listFor ile aynı kural) */
function bildirimBana(kayit, kimlik) {
  const k = kimlik || {};
  const tur = metin(kayit && kayit.recipientType) || 'user';
  const id = kayit ? kayit.recipientId : '';
  if (tur === 'user') return esit(id, k.no) || esit(id, k.ad);
  if (tur === 'department') return esit(id, k.bolum);
  if (tur === 'role') return metin(id) === 'student';
  return false;
}

/** Maskede görünmeye devam eden alanlar (id hep kalır). */
function maskele(kayit, kural) {
  const cikti = {};
  (kural.gorunen || []).forEach((alan) => {
    if (kayit[alan] !== undefined) cikti[alan] = kayit[alan];
  });
  if (kayit.id !== undefined) cikti.id = kayit.id;
  if (kayit._docId !== undefined) cikti._docId = kayit._docId;
  return cikti;
}

/**
 * Tek kaydın öğrenciye dönecek hâli.
 * Dönüş: kayıt (aynen), maskelenmiş kayıt ya da null (hiç görünmez).
 *
 * @param {object} kayit
 * @param {object} kural   ogrenciOkumaKurali çıktısı
 * @param {object} kimlik  { no, ad, bolum, basvuruIdleri:Set<string> }
 */
function ogrenciKaydi(kayit, kural, kimlik) {
  if (!kural) return kayit;
  if (!kayit || typeof kayit !== 'object') return null;
  const k = kimlik || {};
  switch (kural.tur) {
    case 'sahip':
      return sahibiMi(kayit, kural, k) ? kayit : null;
    case 'alici':
      return bildirimBana(kayit, k) ? kayit : null;
    case 'basvuru': {
      const idler = k.basvuruIdleri;
      if (!idler || typeof idler.has !== 'function') return null;
      // Belge kimliği = başvuru kimliği. Kayıt hangi biçimde geldiyse ona bak.
      const aday = [kayit._docId, kayit.id, kayit.appId, kayit.basvuruId];
      return aday.some((x) => metin(x) && idler.has(metin(x))) ? kayit : null;
    }
    case 'maske':
      return sahibiMi(kayit, kural, k) ? kayit : maskele(kayit, kural);
    default:
      return kayit;
  }
}

/** Liste okumasının öğrenciye dönecek hâli. */
function ogrenciOkumasiSuz(kayitlar, kural, kimlik) {
  if (!kural) return kayitlar;
  const liste = Array.isArray(kayitlar) ? kayitlar : [];
  const cikti = [];
  liste.forEach((kayit) => {
    const sonuc = ogrenciKaydi(kayit, kural, kimlik);
    if (sonuc) cikti.push(sonuc);
  });
  return cikti;
}

/** Kural, staj başvurusu kimliklerinin çözülmesini gerektiriyor mu? */
function basvuruGerekli(kural) {
  return !!kural && kural.tur === 'basvuru';
}

module.exports = {
  OGRENCI_OKUMA,
  ogrenciOkumaKurali,
  ogrenciKaydi,
  ogrenciOkumasiSuz,
  basvuruGerekli,
};
