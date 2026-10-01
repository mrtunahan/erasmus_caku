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
 * @param {Buffer} docx
 * @returns {Promise<Buffer>} PDF baytları
 */
async function docxPdfCevir(docx) {
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
          'pdf:writer_pdf_Export',
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
    return fs.readFileSync(cikis);
  } finally {
    birak();
    fs.rm(kok, { recursive: true, force: true }, () => {});
  }
}

module.exports = { kullanilabilir, docxPdfCevir };
