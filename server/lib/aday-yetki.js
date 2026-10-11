// ══════════════════════════════════════════════════════════════
// ADAY YETKİSİ — numarasız başvuranın sunucuda neye dokunabileceği
//
// ── NEDEN JETON "ÖĞRENCİ" GİBİ ÇÖZÜLÜYOR ──
// Sunucuda personeli `role !== 'student'` diye tanıyan onlarca denetim var
// (yapay zekâ, dosya, anket, yoklama…). Jetona yeni bir rol adı ('aday')
// yazıp öyle bıraksaydık, aday bu denetimlerin HEPSİNDE personel sayılırdı.
// Bu yüzden aday jetonu TEK yerde (jetonKullanicisi) çözülür ve
// `{ role: 'student', aday: true }` olur: öğrenciye kapalı olan her şey
// adaya da kapalıdır. Öğrenciye AÇIK olup adaya kapalı olması gerekenler
// (portal, staj, anket, ders seçimi…) aşağıdaki İZİN LİSTELERİYLE kapanır.
//
// ── TERS YÖN: ADAY NUMARASIYLA ÖĞRENCİ GİRİŞİ YOK ──
// Öğrenci giriş/kayıt/şifre uçları ADAY-… kimliğini reddetmeli (adayNoMu).
// Aksi hâlde biri öğrenci şifre kurulumundan "ADAY-2026-0001" için şifre
// belirleyip aday bayrağı OLMAYAN bir öğrenci jetonu alır ve adayın
// kayıtlarını okurdu.
// ══════════════════════════════════════════════════════════════

const metin = (v) => String(v == null ? '' : v).trim();

// lib/aday-kimlik.js ile aynı kalıp (testle eşitliği denetlenir).
const ADAY_KALIBI = /^ADAY-(\d{4})-(\d{1,6})$/i;
function adayNoMu(no) {
  return ADAY_KALIBI.test(metin(no));
}

const ADAY_TUR_IDLERI = ['dikey', 'kurumlararasi', 'merkezi'];

/**
 * Doğrulanmış JWT yükünü sunucunun kullanacağı kullanıcıya çevirir.
 * Aday dışındaki jetonlar olduğu gibi döner.
 */
function jetonKullanicisi(yuk) {
  if (!yuk || yuk.role !== 'aday') return yuk;
  const turler = (Array.isArray(yuk.turler) ? yuk.turler : [])
    .map(metin)
    .filter((t) => ADAY_TUR_IDLERI.includes(t));
  return {
    ...yuk,
    role: 'student',
    aday: true,
    identifier: metin(yuk.identifier),
    departmentId: metin(yuk.departmentId),
    turler,
  };
}

// Adayın OKUYABİLECEĞİ koleksiyonlar. Öğrenci okuma kuralları (kendi kaydına
// daraltma, maskeleme) bunların ÜSTÜNE uygulanmaya devam eder.
const ADAY_OKUMA = new Set([
  // Kurum adı / marka (giriş öncesi de herkese açık)
  'tenant_config',
  // Başvuru formlarının seçim listeleri
  'departments',
  'faculties',
  'universities',
  // Yatay geçiş başvurusu (yalnız kendi kaydı — ogrenci-okuma 'sahip')
  'yatay_gecis_basvurular',
  // Dikey geçiş: muafiyet/intibak talebi ve gereken ayarlar
  'muafiyet_records',
  'muafiyet_settings',
  'sinav_dersler',
  'karsi_not_olcekleri',
  'mezuniyet_kurallari',
  // Kendi bildirimleri. Merkezî `notifications` burada YOK: o koleksiyonun
  // öğrenci kuralı bölüme/öğrencilere giden yayınları da açar; aday zili
  // kendi ucundan (/api/bildirim) yalnız kişisel bildirimleri alır.
  'student_notifications',
]);

/** Aday bu koleksiyonu okuyabilir mi? (personel/öğrenci için hep true) */
function adayOkuyabilirMi(koleksiyon, kullanici) {
  if (!kullanici || !kullanici.aday) return true;
  return ADAY_OKUMA.has(metin(koleksiyon));
}

// Koleksiyon → tür alanı ve adayın kendi türlerinden hangisine karşılık
// geldiği. Kayıt bu türlerden biri DEĞİLSE aday yazamaz (ör. kurum içi
// yatay geçiş ya da sıradan ders muafiyeti açamaz).
const ADAY_YAZMA = {
  yatay_gecis_basvurular: {
    alan: 'turu',
    turler: { kurumlararasi: 'kurumlararasi', merkezi: 'merkezi' },
  },
  muafiyet_records: { alan: 'basvuruTuru', turler: { dikey: 'dikey' } },
};

/**
 * Adayın tek yazma işlemi için karar.
 * Sahiplik (kendi kaydı mı) bu kararın ARDINDAN öğrenci kurallarıyla ayrıca
 * denetlenir; burada yalnız koleksiyon ve tür daraltılır.
 * @returns {{izin:boolean, hata?:string}}
 */
function adayYazmaKarari(op, kullanici) {
  if (!kullanici || !kullanici.aday) return { izin: true };
  const kural = ADAY_YAZMA[metin(op && op.collection)];
  if (!kural) {
    return { izin: false, hata: 'Aday hesabı bu kayda yazamaz: ' + metin(op && op.collection) };
  }
  if (op.parentDocId || op.subCollection) return { izin: false, hata: 'Geçersiz istek.' };
  if (op.type === 'delete') return { izin: true };
  const veri = op.data && typeof op.data === 'object' ? op.data : {};
  const benimTurlerim = new Set(kullanici.turler || []);
  const izinliDegerler = Object.keys(kural.turler)
    .filter((t) => benimTurlerim.has(t))
    .map((t) => kural.turler[t]);
  const tur = veri[kural.alan];
  // Yeni kayıtta tür ZORUNLU; güncellemede verilmişse yine izinli olmalı.
  if (op.type === 'add' || tur !== undefined) {
    if (!izinliDegerler.includes(metin(tur))) {
      return {
        izin: false,
        hata: 'Aday hesabınız bu başvuru türü için açılmadı (' + (metin(tur) || 'tür yok') + ').',
      };
    }
  }
  // Sahiplik alanları yalnız adayın KENDİ numarası olabilir: güncellemeyle
  // başvurusunu başka birinin numarasına devredemesin.
  const sahiplik = ['ogrenciNo', 'studentNo', '_owner'];
  const yabanci = sahiplik.find(
    (a) => veri[a] !== undefined && metin(veri[a]) !== metin(kullanici.identifier)
  );
  if (yabanci) return { izin: false, hata: 'Başvuru yalnız kendi aday numaranıza ait olabilir.' };
  // Değerlendirme alanları adaya kapalı (karar, sıra, sonuç). Yeni kayıtta
  // BOŞ gelmeleri serbesttir (form onları '' ile açıyor); dolu gelirse aday
  // kendi başvurusunu değerlendirmiş olurdu. Muafiyetin aşama (stage)
  // ilerletmesi öğrenci kurallarıyla zaten daraltılıyor.
  const yasak = [
    'degerlendirme',
    'degerlendirmeSinif',
    'degerlendirmeSira',
    'sonuc',
    'karar',
    'adminDecision',
    'yerlestirmePuani',
  ];
  const dokunulan = Object.keys(veri).find((a) => {
    if (!yasak.includes(a.split('.')[0])) return false;
    if (op.type !== 'add') return true;
    const v = veri[a];
    return !(v === '' || v === null || v === undefined);
  });
  if (dokunulan) return { izin: false, hata: 'Bu alanı değiştiremezsiniz: ' + dokunulan };
  return { izin: true };
}

module.exports = {
  adayNoMu,
  jetonKullanicisi,
  adayOkuyabilirMi,
  adayYazmaKarari,
  ADAY_OKUMA,
  ADAY_YAZMA,
  ADAY_TUR_IDLERI,
};
