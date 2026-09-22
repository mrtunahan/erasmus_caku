/**
 * SHA-256 ve HMAC-SHA256 — saf JavaScript.
 *
 * Dijital yoklamanın dönen QR kodu bir TOTP'tir: oturuma özel gizli anahtar
 * ile zaman dilimini imzalar. İmza HEM akademisyenin tarayıcısında (kodu her
 * altı saniyede yeniden çizmek için) HEM sunucuda (öğrencinin okuttuğu kodu
 * doğrulamak için) hesaplanır.
 *
 * ⚠ İKİ TARAF AYNI SONUCU ÜRETMEK ZORUNDADIR. Tarayıcıda WebCrypto (async,
 * yalnız güvenli bağlamda), sunucuda node:crypto kullanılsaydı iki ayrı
 * uygulama olurdu; birinin davranışı değiştiğinde ders ortasında hiçbir
 * öğrenci yoklama veremezdi. Tek uygulama, test altında ve her iki tarafta
 * aynı dosya. tests/hmac-sha256.test.js hem RFC 4231 vektörlerini hem de
 * node:crypto ile birebir eşleşmeyi doğrular.
 *
 * Bu dosya bir kimlik doğrulama aracı DEĞİLDİR: parola saklamaz, oturum
 * açmaz. Tek işi kısa ömürlü bir kodu imzalamaktır.
 */

const K = [
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
];

function sagDondur(x, n) {
  return ((x >>> n) | (x << (32 - n))) >>> 0;
}

/**
 * UTF-8 bayt dizisi.
 *
 * ⚠ Türkçe harfler tek bayt DEĞİLDİR ('ş' iki bayttır): charCodeAt ile
 * baytlamak "Şık" ile "Sik"i aynı imzaya götürürdü. Kodlama elle yazıldı —
 * `TextEncoder` global olarak her ortamda garanti değil ve bu dosyanın
 * sunucuda da, tarayıcıda da, testte de aynı şekilde çalışması gerekiyor.
 */
export function baytlar(metin) {
  if (metin instanceof Uint8Array) return metin;
  if (Array.isArray(metin)) return Uint8Array.from(metin);
  const s = String(metin == null ? '' : metin);
  const cikti = [];
  for (let i = 0; i < s.length; i++) {
    let kod = s.codePointAt(i);
    // Vekil çift (surrogate pair) tek kod noktasıdır; ikinci yarısı atlanır.
    if (kod > 0xffff) i++;
    if (kod < 0x80) {
      cikti.push(kod);
    } else if (kod < 0x800) {
      cikti.push(0xc0 | (kod >> 6), 0x80 | (kod & 0x3f));
    } else if (kod < 0x10000) {
      cikti.push(0xe0 | (kod >> 12), 0x80 | ((kod >> 6) & 0x3f), 0x80 | (kod & 0x3f));
    } else {
      cikti.push(
        0xf0 | (kod >> 18),
        0x80 | ((kod >> 12) & 0x3f),
        0x80 | ((kod >> 6) & 0x3f),
        0x80 | (kod & 0x3f)
      );
    }
  }
  return Uint8Array.from(cikti);
}

/** Bayt dizisini küçük harf onaltılık dizeye çevirir. */
export function onaltilik(bytes) {
  let s = '';
  for (let i = 0; i < bytes.length; i++) s += bytes[i].toString(16).padStart(2, '0');
  return s;
}

/** SHA-256 özeti (32 bayt). */
export function sha256(girdi) {
  const veri = baytlar(girdi);
  const uzunlukBit = veri.length * 8;
  // Dolgu: 0x80, sonra 64-bit uzunluk 56 mod 64 hizasına gelene kadar sıfır.
  const dolguUzunluk = ((veri.length + 9 + 63) >> 6) << 6;
  const m = new Uint8Array(dolguUzunluk);
  m.set(veri);
  m[veri.length] = 0x80;
  // Uzunluk 64 bit big-endian; 2^53'ten büyük girdi bu uygulamada yok.
  const yuksek = Math.floor(uzunlukBit / 0x100000000);
  const dusuk = uzunlukBit >>> 0;
  m[dolguUzunluk - 8] = (yuksek >>> 24) & 0xff;
  m[dolguUzunluk - 7] = (yuksek >>> 16) & 0xff;
  m[dolguUzunluk - 6] = (yuksek >>> 8) & 0xff;
  m[dolguUzunluk - 5] = yuksek & 0xff;
  m[dolguUzunluk - 4] = (dusuk >>> 24) & 0xff;
  m[dolguUzunluk - 3] = (dusuk >>> 16) & 0xff;
  m[dolguUzunluk - 2] = (dusuk >>> 8) & 0xff;
  m[dolguUzunluk - 1] = dusuk & 0xff;

  let h0 = 0x6a09e667,
    h1 = 0xbb67ae85,
    h2 = 0x3c6ef372,
    h3 = 0xa54ff53a,
    h4 = 0x510e527f,
    h5 = 0x9b05688c,
    h6 = 0x1f83d9ab,
    h7 = 0x5be0cd19;

  const w = new Uint32Array(64);
  for (let blok = 0; blok < m.length; blok += 64) {
    for (let i = 0; i < 16; i++) {
      const j = blok + i * 4;
      w[i] = ((m[j] << 24) | (m[j + 1] << 16) | (m[j + 2] << 8) | m[j + 3]) >>> 0;
    }
    for (let i = 16; i < 64; i++) {
      const s0 = sagDondur(w[i - 15], 7) ^ sagDondur(w[i - 15], 18) ^ (w[i - 15] >>> 3);
      const s1 = sagDondur(w[i - 2], 17) ^ sagDondur(w[i - 2], 19) ^ (w[i - 2] >>> 10);
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0;
    }
    let a = h0,
      b = h1,
      c = h2,
      d = h3,
      e = h4,
      f = h5,
      g = h6,
      h = h7;
    for (let i = 0; i < 64; i++) {
      const S1 = sagDondur(e, 6) ^ sagDondur(e, 11) ^ sagDondur(e, 25);
      const ch = (e & f) ^ (~e & g);
      const t1 = (h + S1 + ch + K[i] + w[i]) >>> 0;
      const S0 = sagDondur(a, 2) ^ sagDondur(a, 13) ^ sagDondur(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const t2 = (S0 + maj) >>> 0;
      h = g;
      g = f;
      f = e;
      e = (d + t1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (t1 + t2) >>> 0;
    }
    h0 = (h0 + a) >>> 0;
    h1 = (h1 + b) >>> 0;
    h2 = (h2 + c) >>> 0;
    h3 = (h3 + d) >>> 0;
    h4 = (h4 + e) >>> 0;
    h5 = (h5 + f) >>> 0;
    h6 = (h6 + g) >>> 0;
    h7 = (h7 + h) >>> 0;
  }

  const cikti = new Uint8Array(32);
  [h0, h1, h2, h3, h4, h5, h6, h7].forEach((x, i) => {
    cikti[i * 4] = (x >>> 24) & 0xff;
    cikti[i * 4 + 1] = (x >>> 16) & 0xff;
    cikti[i * 4 + 2] = (x >>> 8) & 0xff;
    cikti[i * 4 + 3] = x & 0xff;
  });
  return cikti;
}

/** HMAC-SHA256 özeti (32 bayt). */
export function hmacSha256(anahtar, mesaj) {
  let k = baytlar(anahtar);
  // 64 bayttan uzun anahtar önce özetlenir; kısa anahtar sıfırla doldurulur.
  if (k.length > 64) k = sha256(k);
  const blok = new Uint8Array(64);
  blok.set(k);
  const ipad = new Uint8Array(64);
  const opad = new Uint8Array(64);
  for (let i = 0; i < 64; i++) {
    ipad[i] = blok[i] ^ 0x36;
    opad[i] = blok[i] ^ 0x5c;
  }
  const m = baytlar(mesaj);
  const ic = new Uint8Array(64 + m.length);
  ic.set(ipad);
  ic.set(m, 64);
  const icOzet = sha256(ic);
  const dis = new Uint8Array(96);
  dis.set(opad);
  dis.set(icOzet, 64);
  return sha256(dis);
}

/** HMAC-SHA256, onaltılık dize olarak. */
export function hmacHex(anahtar, mesaj) {
  return onaltilik(hmacSha256(anahtar, mesaj));
}

/**
 * Sabit süreli dize karşılaştırması.
 *
 * ⚠ `a === b` imzayı ilk farklı karakterde bırakır; geçen süre doğru
 * karakter sayısını sızdırır. Yoklama kodu kısa ömürlü olsa da imza
 * karşılaştırması zamanlama sızdırmamalı.
 */
export function esitMi(a, b) {
  const x = String(a == null ? '' : a);
  const y = String(b == null ? '' : b);
  if (x.length !== y.length) return false;
  let fark = 0;
  for (let i = 0; i < x.length; i++) fark |= x.charCodeAt(i) ^ y.charCodeAt(i);
  return fark === 0;
}
