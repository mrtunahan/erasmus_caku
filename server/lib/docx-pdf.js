// ══════════════════════════════════════════════════════════════
// WORD (.docx) → PDF ÇEVİRİSİ (LibreOffice)
//
// Kurumun Şablonlar modülüne yüklediği Word şablonundan üretilen belge
// (ör. TTO işbirliği talep formu) BİREBİR PDF'e ancak bir ofis programıyla
// çevrilebilir; tarayıcıda bunu yapacak güvenilir bir yol yok. Sunucuda
// LibreOffice kuruluysa (`soffice`) çeviri burada yapılır. Kurulu değilse
// `kullanilabilir()` false döner ve istemci belgeyi Word olarak indirip
// kullanıcıdan PDF'e çevirmesini ister.
//
// Kurulum (Debian/Ubuntu):  apt install -y libreoffice-writer-nogui
// Farklı bir yoldaysa:      SOFFICE_YOLU=/opt/libreoffice/program/soffice
// ══════════════════════════════════════════════════════════════
const { execFile } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');

const SOFFICE = process.env.SOFFICE_YOLU || 'soffice';
const ZAMAN_ASIMI_MS = 60 * 1000;
// Aynı anda en çok bu kadar çeviri: LibreOffice her çağrıda ayrı süreç açar.
const ES_ZAMANLI = 2;

let durumSozu = null;
/** LibreOffice çağrılabiliyor mu? (Sonuç süreç boyunca önbellekte.) */
function kullanilabilir() {
  if (!durumSozu) {
    durumSozu = new Promise((coz) => {
      execFile(SOFFICE, ['--version'], { timeout: 15000 }, (hata, cikti) =>
        coz(!hata && /LibreOffice/i.test(String(cikti || '')))
      );
    });
  }
  return durumSozu;
}

let calisan = 0;
const kuyruk = [];
function sira() {
  if (calisan < ES_ZAMANLI) {
    calisan++;
    return Promise.resolve();
  }
  return new Promise((coz) => kuyruk.push(coz));
}
function birak() {
  const sonraki = kuyruk.shift();
  if (sonraki) sonraki();
  else calisan--;
}

/**
 * PDF dışa aktarım süzgeci. `saltOkunur`: belge parolasız açılır ve
 * yazdırılır, ama DÜZENLEME ve metin kopyalama kapalıdır (izin parolası
 * rastgeledir, hiçbir yerde saklanmaz). LibreOffice 7.4+ JSON seçenekleri.
 */
function disaAktarimSuzgeci(saltOkunur, filtre) {
  const f = filtre || 'writer_pdf_Export';
  if (!saltOkunur) return 'pdf:' + f;
  const s = (tur, deger) => ({ type: tur, value: String(deger) });
  return (
    'pdf:' +
    f +
    ':' +
    JSON.stringify({
      RestrictPermissions: s('boolean', true),
      PermissionPassword: s('string', crypto.randomBytes(18).toString('hex')),
      Changes: s('long', 0), // değişiklik yok
      EnableCopyingOfContent: s('boolean', false),
      Printing: s('long', 2), // yüksek çözünürlükte yazdırma serbest
    })
  );
}

/**
 * @param {Buffer} docx
 * @param {{saltOkunur?: boolean}} [secenek]
 * @returns {Promise<Buffer>} PDF baytları
 */
async function docxPdfCevir(docx, secenek) {
  const saltOkunur = !!(secenek && secenek.saltOkunur);
  if (!Buffer.isBuffer(docx) || docx.length < 4 || docx.slice(0, 2).toString() !== 'PK') {
    throw Object.assign(new Error('Geçerli bir .docx dosyası değil.'), { durum: 400 });
  }
  await sira();
  const kok = fs.mkdtempSync(path.join(os.tmpdir(), 'docx-pdf-'));
  try {
    const giris = path.join(kok, 'belge.docx');
    fs.writeFileSync(giris, docx);
    // Her çağrıya ayrı profil: ortak profil kilitlenirse eşzamanlı çeviriler
    // sessizce boş çıkıyordu.
    const profil = 'file://' + path.join(kok, 'profil-' + crypto.randomBytes(4).toString('hex'));
    await new Promise((coz, red) => {
      execFile(
        SOFFICE,
        [
          '-env:UserInstallation=' + profil,
          '--headless',
          '--norestore',
          '--convert-to',
          disaAktarimSuzgeci(saltOkunur),
          '--outdir',
          kok,
          giris,
        ],
        { timeout: ZAMAN_ASIMI_MS },
        (hata, _c, hc) =>
          hata ? red(new Error('Çeviri başarısız: ' + (hc || hata.message))) : coz()
      );
    });
    const cikis = path.join(kok, 'belge.pdf');
    if (!fs.existsSync(cikis)) {
      // soffice çıktı vermeden 0 ile döner: yalnız çekirdek kurulu, Writer
      // bileşeni yok ("source file could not be loaded"). Bir daha denenmez;
      // istemci Word'e düşer. Writer kurulunca sunucu yeniden başlatılmalı.
      durumSozu = Promise.resolve(false);
      throw Object.assign(
        new Error('LibreOffice Writer kurulu değil (apt install libreoffice-writer-nogui).'),
        { durum: 501 }
      );
    }
    const pdf = fs.readFileSync(cikis);
    // Eski LibreOffice JSON seçeneklerini sessizce yok sayar: salt okunur
    // istenip şifresiz PDF çıktıysa bu, istenen belge DEĞİLDİR.
    if (saltOkunur && pdf.indexOf('/Encrypt') < 0) {
      throw Object.assign(
        new Error('Sunucudaki LibreOffice salt okunur PDF üretemiyor (7.4 ya da üstü gerekir).'),
        { durum: 501 }
      );
    }
    return pdf;
  } finally {
    birak();
    fs.rm(kok, { recursive: true, force: true }, () => {});
  }
}

/**
 * Hazır bir PDF'i salt okunur hâle getirir (düzenleme/kopyalama kapalı,
 * parolasız açılır ve yazdırılır). PDF, LibreOffice Draw'a alınıp aynı
 * izinlerle yeniden dışa aktarılır. Tarayıcıda üretilen yerleşik mezuniyet
 * dilekçesi için (pdf-lib şifreleme yapamıyor).
 * @param {Buffer} pdf
 * @returns {Promise<Buffer>}
 */
async function pdfKilitle(pdf) {
  if (!Buffer.isBuffer(pdf) || pdf.slice(0, 4).toString() !== '%PDF') {
    throw Object.assign(new Error('Geçerli bir PDF dosyası değil.'), { durum: 400 });
  }
  await sira();
  const kok = fs.mkdtempSync(path.join(os.tmpdir(), 'pdf-kilit-'));
  try {
    const cikisKlasoru = path.join(kok, 'cikis');
    fs.mkdirSync(cikisKlasoru);
    const giris = path.join(kok, 'belge.pdf');
    fs.writeFileSync(giris, pdf);
    const profil = 'file://' + path.join(kok, 'profil-' + crypto.randomBytes(4).toString('hex'));
    await new Promise((coz, red) => {
      execFile(
        SOFFICE,
        [
          '-env:UserInstallation=' + profil,
          '--headless',
          '--norestore',
          '--infilter=draw_pdf_import',
          '--convert-to',
          disaAktarimSuzgeci(true, 'draw_pdf_Export'),
          '--outdir',
          cikisKlasoru,
          giris,
        ],
        { timeout: ZAMAN_ASIMI_MS },
        (hata, _c, hc) =>
          hata ? red(new Error('Kilitleme başarısız: ' + (hc || hata.message))) : coz()
      );
    });
    const cikis = path.join(cikisKlasoru, 'belge.pdf');
    if (!fs.existsSync(cikis)) {
      throw Object.assign(
        new Error('LibreOffice Draw kurulu değil (apt install libreoffice-draw-nogui).'),
        { durum: 501 }
      );
    }
    const sonuc = fs.readFileSync(cikis);
    if (sonuc.indexOf('/Encrypt') < 0) {
      throw Object.assign(
        new Error('Sunucudaki LibreOffice salt okunur PDF üretemiyor (7.4 ya da üstü gerekir).'),
        { durum: 501 }
      );
    }
    return sonuc;
  } finally {
    birak();
    fs.rm(kok, { recursive: true, force: true }, () => {});
  }
}

module.exports = { kullanilabilir, docxPdfCevir, pdfKilitle };
