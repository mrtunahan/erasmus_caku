// ══════════════════════════════════════════════════════════════
// ADAY KİMLİĞİ — henüz öğrenci numarası olmayan başvuranlar
//
// Yatay/dikey geçişle gelen aday, başvuru sırasında HENÜZ kayıtlı öğrenci
// değildir: numarası kesin kayıt yapılınca verilir. Oysa başvuru
// değerlendirmesi (ders eşleştirme, taban puan kıyası, belge üretimi) daha
// önce başlıyor. Bu yüzden akademisyen adayın işlemlerini onun adına
// yürütebilmeli — ve kaydın bir kimliği olmalı.
//
// ÇÖZÜM: geçici aday numarası. "ADAY-2026-0007" gibi.
//
// ⚠ NEDEN HARF ÖNEKİ: gerçek öğrenci numaraları tamamen rakamdır
// (240905072). Geçici numaraya harf öneki koymak, ikisinin BİRBİRİNE
// KARIŞMASINI matematiksel olarak imkânsız kılar. Sayısal bir aralık
// ayırsaydık (ör. 900000000+) kurum bir gün o aralığı kullanmaya
// başladığında iki farklı kişi aynı kaydı paylaşırdı.
//
// ⚠ ÖĞRENCİ TARAFI KENDİLİĞİNDEN KORUNUR: öğrenci listeleri kaydı
// `ogrenciNo === kendi numarası` diye süzüyor. Geçici numara hiçbir
// öğrencinin numarasına eşit olamayacağı için vekâleten açılmış kayıt
// yanlışlıkla başka bir öğrenciye görünmez. Gerçek numara girildiği anda
// kayıt kendiliğinden sahibine geçer.
// ══════════════════════════════════════════════════════════════

const ONEK = 'ADAY';
const ADAY_KALIBI = /^ADAY-(\d{4})-(\d{1,6})$/i;

/** Verilen değer geçici aday numarası mı? */
export function adayNoMu(no) {
  return ADAY_KALIBI.test(String(no == null ? '' : no).trim());
}

/**
 * Gerçek (kurumun verdiği) öğrenci numarası mı?
 * Boş değil, geçici değil ve rakamdan oluşuyor.
 */
export function gercekOgrenciNoMu(no) {
  const s = String(no == null ? '' : no).trim();
  if (!s || adayNoMu(s)) return false;
  return /^\d{4,}$/.test(s);
}

/**
 * Mevcut kayıtlarla çakışmayan yeni bir geçici aday numarası üretir.
 *
 * @param {Array<string|{ogrenciNo?:string, studentNo?:string}>} mevcutlar
 * @param {number|string} [yil] varsayılan: bu yıl
 * @returns {string} "ADAY-2026-0007"
 */
export function adayNoUret(mevcutlar, yil) {
  const y = String(yil || new Date().getFullYear()).slice(0, 4);
  let enBuyuk = 0;
  (mevcutlar || []).forEach((m) => {
    const no = typeof m === 'string' ? m : (m && (m.ogrenciNo || m.studentNo)) || '';
    const e = ADAY_KALIBI.exec(String(no).trim());
    if (!e) return;
    if (e[1] !== y) return; // sayaç yıl başına
    const n = parseInt(e[2], 10);
    if (Number.isFinite(n) && n > enBuyuk) enBuyuk = n;
  });
  return ONEK + '-' + y + '-' + String(enBuyuk + 1).padStart(4, '0');
}

/** Ekranda numaranın yanına yazılacak açıklama. */
export function kimlikEtiketi(no) {
  if (adayNoMu(no)) return 'geçici aday no';
  if (gercekOgrenciNoMu(no)) return 'öğrenci no';
  return '';
}

/**
 * Vekâleten (akademisyenin aday adına) açılmış bir kayıt mı?
 * Hem açık bayrağa hem numaranın biçimine bakar — eski kayıtlarda bayrak yok.
 */
export function vekaletenMi(kayit) {
  if (!kayit) return false;
  if (kayit.vekaleten === true) return true;
  return adayNoMu(kayit.ogrenciNo || kayit.studentNo || '');
}

/**
 * Vekâleten açılmış bir kayda gerçek öğrenci numarası tanımlanabilir mi?
 * @returns {{ok:boolean, sebep?:string}}
 */
export function numaraTanimlanabilirMi(kayit, yeniNo) {
  const s = String(yeniNo == null ? '' : yeniNo).trim();
  if (!s) return { ok: false, sebep: 'Öğrenci numarası boş olamaz.' };
  if (adayNoMu(s)) {
    return { ok: false, sebep: 'Geçici aday numarası, kalıcı numara olarak tanımlanamaz.' };
  }
  if (!gercekOgrenciNoMu(s)) {
    return { ok: false, sebep: 'Öğrenci numarası yalnız rakamlardan oluşmalı (en az 4 hane).' };
  }
  if (!vekaletenMi(kayit)) {
    // Zaten gerçek numarası olan bir kaydın sahibini değiştirmek, başvuruyu
    // başka bir öğrenciye devretmek olurdu.
    return { ok: false, sebep: 'Bu kaydın zaten bir öğrenci numarası var.' };
  }
  return { ok: true };
}
