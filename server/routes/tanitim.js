// ══════════════════════════════════════════════════════════════
// TANITIM SAYFASI GÖRSELLERİ — ANONİM, SALT OKUNUR
//
// Tanıtım sayfası (dist/tanitim.html) herkese açıktır ve oturum taşımaz.
// Mevcut dosya servisi /api/files/ ise kimlik ister (FILES_AUTH_MODE
// varsayılanı açık), dolayısıyla slider görselleri oradan gösterilemez.
//
// Bu router YALNIZCA uploads/tanitim dizinini, YALNIZCA resim uzantılarıyla,
// YALNIZCA GET ile açar. Yükleme buradan yapılmaz — yetkili mevcut
// /api/files/upload ucunu (folder=tanitim) kimlikli olarak kullanır.
//
// ── DAR KAPI ──
// Dosya adı kullanıcı girdisidir ve doğrudan yola çevrilir. İki bariyer:
//   1. lib/tanitim-slayt.js → gorselAdiGuvenliMi (dizin ayracı, `..`,
//      denetim karakteri ve izinsiz uzantı elenir)
//   2. path.resolve sonrası hedefin gerçekten TANITIM_DIR içinde kaldığı
//      doğrulanır — kural bir gün gevşerse ikinci bariyer tutar.
//
// SVG bilerek dışarıda: içine betik gömülebilir ve aynı kaynaktan
// servis edilen bir SVG, sayfanın bağlamında çalışır.
// ══════════════════════════════════════════════════════════════

const express = require('express');
const path = require('path');
const fs = require('fs');
const rateLimit = require('express-rate-limit');

const router = express.Router();

const TANITIM_DIR = path.join(__dirname, '..', 'uploads', 'tanitim');

// gorselAdiGuvenliMi ESM tarafında; sunucu CJS. Kural tek yerde kalsın diye
// aynı desenler burada da tanımlı değil — lib'den okunur.
let gorselAdiGuvenliMi;
try {
  // Node 22 require(esm) destekler; desteklemezse aşağıdaki yedek devreye girer.
  ({ gorselAdiGuvenliMi } = require('../../lib/tanitim-slayt.js'));
} catch (_) {
  gorselAdiGuvenliMi = null;
}
if (typeof gorselAdiGuvenliMi !== 'function') {
  // eslint-disable-next-line no-control-regex
  const TEHLIKELI = /[/\\]|\.\.|[\x00-\x1f\x7f]/;
  const IZINLI = /\.(jpe?g|png|webp|gif|avif)$/i;
  gorselAdiGuvenliMi = (ad) => {
    const a = String(ad == null ? '' : ad).trim();
    if (!a || a.length > 200) return false;
    if (TEHLIKELI.test(a)) return false;
    return IZINLI.test(a);
  };
}

const MIME = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.avif': 'image/avif',
};

const gorselLimiti = rateLimit({
  windowMs: 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Çok fazla istek.' },
});

// GET /api/tanitim/gorsel/:ad
router.get('/gorsel/:ad', gorselLimiti, (req, res) => {
  const ad = req.params.ad;
  if (!gorselAdiGuvenliMi(ad)) return res.status(404).end();

  const hedef = path.resolve(path.join(TANITIM_DIR, ad));
  // İkinci bariyer: çözülen yol gerçekten dizinin içinde mi?
  if (!hedef.startsWith(path.resolve(TANITIM_DIR) + path.sep)) return res.status(404).end();
  if (!fs.existsSync(hedef) || !fs.statSync(hedef).isFile()) return res.status(404).end();

  const tur = MIME[path.extname(hedef).toLowerCase()];
  if (!tur) return res.status(404).end();

  res.type(tur);
  // Görsel adı yüklemede zaman damgalı üretilir; içerik değişmez.
  res.setHeader('Cache-Control', 'public, max-age=86400');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  // Bu uç yalnız resim döndürür; tarayıcı sayfa olarak yorumlamasın.
  res.setHeader('Content-Disposition', 'inline');
  return res.sendFile(hedef);
});

module.exports = router;
