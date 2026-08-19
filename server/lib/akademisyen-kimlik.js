// ══════════════════════════════════════════════════════════════
// AKADEMİSYEN KİMLİĞİ — AYNI ADLI KAYITLARI BİRLEŞTİRME
//
// Bu sistemde kişi kimliği AD METNİDİR: oturum jetonu `identifier` olarak adı
// taşır (routes/auth.js), şifreler ada göre saklanır ve profil `professors`
// koleksiyonunda `{ name }` ile aranır.
//
// Ne var ki `professors.name` BENZERSİZ DEĞİLDİR ve aynı kişi için birden çok
// kayıt oluşabiliyor — ekleme ekranlarının hiçbiri "bu ad zaten var mı" diye
// bakmıyor. Depodaki üç ayrı temizlik betiği (dedupe-professors.js,
// dedupe-enis-sert.js, fix-university-admin.js) bunun kanıtıdır.
//
// ── NEDEN findOne YETMİYOR ──
// `findOne({ name })` sıralama vermeden çağrıldığında aynı adlı kayıtlardan
// RASTGELE birini döndürür. Sonucu somut bir arızaydı:
//
//   • Giriş (fetchProfessorProfile) yetkili kaydı görüp yönetici kabuğu
//     açıyor,
//   • aynı anda yazma koruması (getActorFlags) yetkisiz kaydı görüp aktörü
//     yetkisiz sayıyor ve yeni akademisyenin `isFacultyManager` alanını
//     SESSİZCE düşürüyordu — istek "başarılı" dönüyor, arayüz "fakülte
//     yetkilisi olarak eklendi" diyor, kişi rolsüz oluşuyordu.
//
// Çözüm, iki tarafın da AYNI birleşik profili görmesidir. Birleştirme kuralı
// dedupe-professors.js'in canonical seçimiyle birebir aynıdır: bayraklar
// OR'lanır, boş alanlar mükerrerlerden doldurulur.
//
// ── BU BİR YETKİ GENİŞLETMESİ DEĞİLDİR ──
// Bayrakları OR'lamak "aynı adlı kayıtlardan biri yetkiliyse kişi yetkilidir"
// demektir. Kimlik zaten addır: aynı ada sahip iki kayıt aynı şifreyle,
// aynı jetonla giriş yapar. Yani OR'lamak var olan kimlik modelini
// DEĞİŞTİRMEZ, yalnız rastgeleliği kaldırır. Asıl çözüm adın benzersiz
// olmasıdır ve o ayrı bir iştir.
// ══════════════════════════════════════════════════════════════

/** Yetki bayrakları — hepsi OR'lanır. */
const BAYRAKLAR = [
  'isUniversityAdmin',
  'isFacultyManager',
  'isDeptManager',
  'isStajCoordinator',
  'isMemur',
  'external',
];

/** Boşsa mükerrerden doldurulan alanlar (dedupe-professors.js ile aynı liste). */
const DOLDURULACAK = ['departmentId', 'department', 'facultyId', 'universityId', 'title', 'email'];

/** Yetki ağırlığı — canonical seçiminde en yetkili kayıt öne alınır. */
function bayrakSkoru(d) {
  const x = d || {};
  return (x.isUniversityAdmin ? 4 : 0) + (x.isFacultyManager ? 2 : 0) + (x.isDeptManager ? 1 : 0);
}

/**
 * Aynı adlı kayıtları TEK profile indirir.
 *
 * @param {Array<Object>} kayitlar `professors` dokümanları (aynı ad)
 * @returns {Object|null} birleşik doküman; liste boşsa null
 */
function profilBirlestir(kayitlar) {
  const liste = (kayitlar || []).filter(Boolean);
  if (liste.length === 0) return null;
  if (liste.length === 1) return { ...liste[0] };

  // Canonical: en yetkili → bölümü dolu → en eski. dedupe-professors.js ile
  // aynı sıra; iki taraf farklı kaydı "asıl" sayarsa tutarsızlık sürerdi.
  const sirali = liste.slice().sort((a, b) => {
    const fs = bayrakSkoru(b) - bayrakSkoru(a);
    if (fs !== 0) return fs;
    if (!!a.departmentId !== !!b.departmentId) return a.departmentId ? -1 : 1;
    const at = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const bt = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return at - bt;
  });
  const birlesik = { ...sirali[0] };
  const digerleri = sirali.slice(1);

  BAYRAKLAR.forEach((bayrak) => {
    if (!birlesik[bayrak] && digerleri.some((d) => d[bayrak])) birlesik[bayrak] = true;
  });
  DOLDURULACAK.forEach((alan) => {
    if (birlesik[alan]) return;
    const dolu = digerleri.find((d) => d[alan]);
    if (dolu) birlesik[alan] = dolu[alan];
  });
  // Liste alanları BİRLEŞTİRİLİR, seçilmez: kişinin bir kaydında 'gozetmen',
  // ötekinde ek bölüm varsa ikisi de geçerlidir.
  ['roles', 'additionalDepartments', 'memurModules'].forEach((alan) => {
    const hepsi = liste.flatMap((d) => (Array.isArray(d[alan]) ? d[alan] : []));
    if (hepsi.length) birlesik[alan] = [...new Set(hepsi)];
  });
  // Kaç kayıttan geldiği çağıranın uyarı verebilmesi için taşınır.
  birlesik._mukerrerSayisi = liste.length;
  return birlesik;
}

/**
 * Adı verilen akademisyenin BİRLEŞİK profili.
 * `findOne` yerine bu kullanılır: aynı adlı kayıtlardan rastgele biri değil,
 * hepsinin birleşimi döner.
 */
async function profilBul(db, ad) {
  const isim = String(ad == null ? '' : ad);
  if (!isim) return null;
  const kayitlar = await db.collection('professors').find({ name: isim }).toArray();
  return profilBirlestir(kayitlar);
}

module.exports = { profilBirlestir, profilBul };
