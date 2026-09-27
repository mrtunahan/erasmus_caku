// ══════════════════════════════════════════════════════════════
// YAPISAL KAYITLARDA HİYERARŞİ KORUMASI
//
// 1) BÖLÜM YETKİLİSİ (role='bolum_yetkilisi') ve yapısal koleksiyonlar
//    Yapısal koleksiyon denetimi yalnız `role === 'professor'` için
//    yapılıyordu; ayrı bir rol olan bölüm yetkilisi `departments`,
//    `faculties`, `universities` ve `tenant_config`e SINIRSIZ yazabiliyordu.
//    En kötüsü: başka bir bölümün `managerNames` listesine ad ekleyip o
//    bölümün yetkilisi olarak giriş yapabilirdi (routes/auth.js).
//
//    Kural (arayüzün bugün yaptığı hiçbir şeyi kırmadan):
//      • Yalnız KENDİ bölüm kaydı güncellenebilir (Sınav Otomasyonu ve
//        gözetmen kuralı ekranları bunu yapıyor).
//      • Ekleme/silme ve fakülte/üniversite/kurum ayarı yazımı yok.
//      • Hiyerarşi alanları (yetkili adları, fakülte/üniversite bağı,
//        kimlik) sessizce düşürülür; `set` birleştirmeye çevrilir ki kayıt
//        komple değiştirilip bu alanlar silinemesin.
//
// 2) AKADEMİSYEN ADININ DEĞİŞTİRİLMESİ
//    Kimlik ad metnidir ve AYNI ADLI kayıtların yetki bayrakları birleşik
//    profilde OR'lanır (lib/akademisyen-kimlik.js). Yetkili bir kaydın adını
//    kendi adına çevirmek, o kaydın bayraklarını devralmak demekti. Kural:
//      • Üniversite yetkilisi/admin dışındakiler, üst düzey bayrak taşıyan
//        (üniversite ya da fakülte yetkilisi) bir kaydın adını değiştiremez.
//      • Ad, BAŞKA bir kayıtta zaten kullanılan bir ada çevrilemez
//        (kayıtlar birleşip yetki karışmasın). Birleştirme gerekiyorsa
//        birlestir-akademisyen.js betiği kullanılır.
// ══════════════════════════════════════════════════════════════

const metin = (v) => String(v == null ? '' : v).trim();

const BOLUM_KORUNAN_ALANLAR = [
  'managerName',
  'managerNames',
  'facultyId',
  'universityId',
  '_docId',
  'eskiKimlikler',
];

/** Bölüm kaydının bütün kimlik biçimleri. */
function bolumKimlikleri(kayit) {
  if (!kayit) return [];
  return [
    kayit._docId,
    kayit._id && kayit._id.toString ? kayit._id.toString() : kayit._id,
    kayit.code,
    kayit.id,
    ...(Array.isArray(kayit.eskiKimlikler) ? kayit.eskiKimlikler : []),
  ]
    .map(metin)
    .filter(Boolean);
}

/**
 * Bölüm yetkilisinin yapısal koleksiyon yazımı. `op` YERİNDE düzeltilebilir.
 * @returns {{izin: boolean, hata?: string}}
 */
function bolumYetkilisiYapisalYazim(op, user, mevcut) {
  if (!op || !user || user.role !== 'bolum_yetkilisi') return { izin: true };
  if (op.collection !== 'departments') {
    return {
      izin: false,
      hata: `Bu kaydı yalnız fakülte ya da üniversite yetkilisi düzenleyebilir: ${op.collection}`,
    };
  }
  if (op.type !== 'update' && op.type !== 'set') {
    return { izin: false, hata: 'Bölüm ekleme/silme yalnız fakülte yetkilisindedir.' };
  }
  const benim = metin(user.departmentId);
  if (!mevcut || !benim || bolumKimlikleri(mevcut).indexOf(benim) < 0) {
    return { izin: false, hata: 'Yalnız kendi bölümünüzün kaydını düzenleyebilirsiniz.' };
  }
  if (op.data && typeof op.data === 'object') {
    Object.keys(op.data).forEach((k) => {
      const kok = k.split('.')[0];
      if (BOLUM_KORUNAN_ALANLAR.indexOf(kok) >= 0) delete op.data[k];
    });
  }
  if (op.type === 'set') op.merge = true;
  return { izin: true };
}

const sade = (v) =>
  metin(v)
    .replace(/(prof\.?|doç\.?|dr\.?|öğr\.?|gör\.?|arş\.?|üyesi)/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLocaleLowerCase('tr');

/**
 * Akademisyen kaydının adı değiştirilebilir mi?
 * @param {object} p
 * @param {object} p.mevcut        değiştirilen kayıt
 * @param {string} p.yeniAd
 * @param {boolean} p.adBaskasinda  yeni ad başka bir kayıtta kullanılıyor mu
 * @param {object} p.flags          işlemi yapanın bayrakları (getActorFlags)
 */
function akademisyenAdDegisimi(p) {
  const mevcut = (p && p.mevcut) || null;
  const yeniAd = metin(p && p.yeniAd);
  if (!mevcut || !yeniAd || yeniAd === metin(mevcut.name)) return { izin: true };
  const flags = (p && p.flags) || {};
  if (flags.admin || flags.uniAdmin) return { izin: true };
  if (mevcut.isUniversityAdmin || mevcut.isFacultyManager) {
    return {
      izin: false,
      hata: 'Üniversite ya da fakülte yetkilisi olan bir akademisyenin adını yalnız üniversite yetkilisi değiştirebilir.',
    };
  }
  if (p.adBaskasinda) {
    return {
      izin: false,
      hata:
        'Bu ad başka bir akademisyen kaydında kullanılıyor. Aynı adlı kayıtlar tek kişi sayılır; ' +
        'birleştirme gerekiyorsa üniversite yetkilisine iletin.',
    };
  }
  return { izin: true };
}

module.exports = {
  BOLUM_KORUNAN_ALANLAR,
  bolumKimlikleri,
  bolumYetkilisiYapisalYazim,
  akademisyenAdDegisimi,
  sade,
};
