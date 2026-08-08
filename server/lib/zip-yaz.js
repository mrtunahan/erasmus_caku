// ══════════════════════════════════════════════════════════════
// ZIP YAZICI — bağımlılıksız, STORE (sıkıştırmasız) arşiv
//
// Neden sıkıştırma yok: arşive giren dosyalar PDF ve DOCX — ikisi de zaten
// sıkıştırılmış biçimler. Yeniden deflate etmek CPU harcayıp bayt kazandırmaz.
// STORE, spesifikasyonun en basit ve en az hata kaldıran yolu.
//
// Neden harici kütüphane yok: sunucuya yeni bir bağımlılık eklemek deploy'da
// "npm install unutuldu" hatasına açık bir yüzey. Burada ihtiyaç duyulan
// biçim (zip64 gerektirmeyen, tek diskli, yorumsuz arşiv) 100 satırda tam
// olarak yazılabiliyor.
//
// SINIR: zip64 YOK. Tek dosya ya da toplam arşiv 4 GiB'ı aşamaz; bu katman
// zaten onlarca MB'lık evrak paketleri için. Aşımda hata fırlatılır.
// ══════════════════════════════════════════════════════════════

const zlib = require('zlib');

const ZIP64_SINIR = 0xffffffff;

// CRC-32 (IEEE). Node 20.12+ zlib.crc32 sunuyor; yoksa tablo ile hesaplanır.
const crcTablosu = (() => {
  const t = new Int32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[i] = c;
  }
  return t;
})();

function crc32(buf) {
  if (typeof zlib.crc32 === 'function') return zlib.crc32(buf) >>> 0;
  let c = -1;
  for (let i = 0; i < buf.length; i++) c = crcTablosu[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}

// MS-DOS tarih/saat çifti (ZIP'in yerel biçimi; 1980 öncesi temsil edilemez).
function dosTarihSaat(d) {
  const t = d instanceof Date && !isNaN(d.getTime()) ? d : new Date();
  const yil = Math.max(1980, t.getFullYear());
  return {
    saat: ((t.getHours() << 11) | (t.getMinutes() << 5) | (t.getSeconds() >> 1)) & 0xffff,
    tarih: (((yil - 1980) << 9) | ((t.getMonth() + 1) << 5) | t.getDate()) & 0xffff,
  };
}

/**
 * Arşiv içi dosya adını güvenli hâle getirir: dizin kaçışı, ters bölü ve
 * denetim karakterleri temizlenir. Türkçe harfler KORUNUR — UTF-8 bayrağı
 * kurulduğu için arşivi açan program adı doğru okur.
 */
function zipAdTemizle(ad, yedek) {
  let s = String(ad == null ? '' : ad)
    .replace(/[\\/]+/g, '_') // dizin ayırıcı → düz ad
    // eslint-disable-next-line no-control-regex
    .replace(/[\x00-\x1F\x7F]/g, '')
    // Ayırıcılar gittikten sonra kalan ".." dizinden çıkamaz; yine de
    // bırakılmaz — arşivi açan tarafın adı yeniden yorumlamasına güvenmeyiz.
    .replace(/\.{2,}/g, '.')
    .replace(/^[.\s]+/, '') // gizli ad / boşlukla başlama
    .trim()
    .slice(0, 180);
  if (!s) s = String(yedek || 'belge');
  return s;
}

/**
 * @param {{ad:string, veri:Buffer, tarih?:Date}[]} girdiler
 * @returns {Buffer} tam ZIP arşivi
 */
function zipYaz(girdiler) {
  const liste = Array.isArray(girdiler) ? girdiler : [];
  const parcalar = [];
  const merkez = [];
  let ofset = 0;

  // Aynı ad iki kez geçerse arşivi açan program birini ezer — numaralandır.
  const kullanilan = new Map();
  const tekilAd = (ham, i) => {
    const ad = zipAdTemizle(ham, 'belge_' + (i + 1));
    if (!kullanilan.has(ad)) {
      kullanilan.set(ad, 1);
      return ad;
    }
    const n = kullanilan.get(ad) + 1;
    kullanilan.set(ad, n);
    const nokta = ad.lastIndexOf('.');
    return nokta > 0 ? ad.slice(0, nokta) + ' (' + n + ')' + ad.slice(nokta) : ad + ' (' + n + ')';
  };

  liste.forEach((g, i) => {
    const veri = Buffer.isBuffer(g && g.veri) ? g.veri : Buffer.from((g && g.veri) || '');
    if (veri.length > ZIP64_SINIR) {
      throw new Error('Dosya 4 GiB sınırını aşıyor (zip64 desteklenmiyor): ' + (g && g.ad));
    }
    const adBuf = Buffer.from(tekilAd(g && g.ad, i), 'utf8');
    const { saat, tarih } = dosTarihSaat(g && g.tarih);
    const crc = crc32(veri);

    const yerel = Buffer.alloc(30);
    yerel.writeUInt32LE(0x04034b50, 0); // imza
    yerel.writeUInt16LE(20, 4); // gereken sürüm (2.0)
    yerel.writeUInt16LE(0x0800, 6); // bayrak: ad UTF-8
    yerel.writeUInt16LE(0, 8); // yöntem: store
    yerel.writeUInt16LE(saat, 10);
    yerel.writeUInt16LE(tarih, 12);
    yerel.writeUInt32LE(crc, 14);
    yerel.writeUInt32LE(veri.length, 18); // sıkıştırılmış boyut
    yerel.writeUInt32LE(veri.length, 22); // ham boyut
    yerel.writeUInt16LE(adBuf.length, 26);
    yerel.writeUInt16LE(0, 28); // ek alan yok
    parcalar.push(yerel, adBuf, veri);

    const md = Buffer.alloc(46);
    md.writeUInt32LE(0x02014b50, 0);
    md.writeUInt16LE(20, 4); // yazan sürüm
    md.writeUInt16LE(20, 6); // gereken sürüm
    md.writeUInt16LE(0x0800, 8);
    md.writeUInt16LE(0, 10);
    md.writeUInt16LE(saat, 12);
    md.writeUInt16LE(tarih, 14);
    md.writeUInt32LE(crc, 16);
    md.writeUInt32LE(veri.length, 20);
    md.writeUInt32LE(veri.length, 24);
    md.writeUInt16LE(adBuf.length, 28);
    md.writeUInt16LE(0, 30); // ek alan
    md.writeUInt16LE(0, 32); // yorum
    md.writeUInt16LE(0, 34); // disk no
    md.writeUInt16LE(0, 36); // iç öznitelik
    md.writeUInt32LE(0, 38); // dış öznitelik
    md.writeUInt32LE(ofset, 42); // yerel başlığın konumu
    merkez.push(md, adBuf);

    ofset += yerel.length + adBuf.length + veri.length;
    if (ofset > ZIP64_SINIR) {
      throw new Error('Arşiv 4 GiB sınırını aşıyor (zip64 desteklenmiyor).');
    }
  });

  const merkezBuf = Buffer.concat(merkez);
  const son = Buffer.alloc(22);
  son.writeUInt32LE(0x06054b50, 0);
  son.writeUInt16LE(0, 4); // bu disk
  son.writeUInt16LE(0, 6); // merkez dizinin başladığı disk
  son.writeUInt16LE(liste.length, 8); // bu diskteki kayıt sayısı
  son.writeUInt16LE(liste.length, 10); // toplam kayıt
  son.writeUInt32LE(merkezBuf.length, 12);
  son.writeUInt32LE(ofset, 16);
  son.writeUInt16LE(0, 20); // arşiv yorumu yok

  return Buffer.concat([...parcalar, merkezBuf, son]);
}

module.exports = { zipYaz, zipAdTemizle, crc32 };
