// ══════════════════════════════════════════════════════════════
// OTURUM İPTALİ — şifre sıfırlanınca hesabın eski oturumları geçersizdir.
//
// JWT 24 saat geçerli ve sunucuda tutulmuyor; şifresi e-postayla sıfırlanan
// hesabın (belki çalınmış) eski jetonu süresi dolana kadar çalışmaya devam
// ederdi. Hesap başına "bu andan önce verilmiş jetonlar geçersiz" zamanı
// tutulur. Denetim her istekte çalıştığı için bellekte tutulur; kalıcılık
// için `oturum_iptalleri` koleksiyonuna da yazılır ve açılışta yüklenir
// (uygulama tek süreçte çalışıyor: ecosystem.config.js → instances: 1).
// ══════════════════════════════════════════════════════════════

const { jetonAnahtari } = require('./eposta-kurali');

const KOLEKSIYON = 'oturum_iptalleri';
const iptaller = new Map(); // anahtar → ms

async function yukle(db) {
  try {
    const liste = await db.collection(KOLEKSIYON).find({}).toArray();
    liste.forEach((k) => {
      const t = new Date(k.at).getTime();
      if (k._id && Number.isFinite(t)) iptaller.set(String(k._id), t);
    });
  } catch (e) {
    console.warn('[oturum-iptal] yüklenemedi:', e && e.message);
  }
}

async function iptalEt(db, anahtar) {
  if (!anahtar) return;
  const simdi = Date.now();
  iptaller.set(anahtar, simdi);
  try {
    await db
      .collection(KOLEKSIYON)
      .updateOne({ _id: anahtar }, { $set: { at: new Date(simdi) } }, { upsert: true });
  } catch (e) {
    console.warn('[oturum-iptal] yazılamadı:', e && e.message);
  }
}

/**
 * Ham JWT yükünü denetler; iptal edilmiş oturumsa hata FIRLATIR (jwt.verify
 * ile aynı davranış — çağıranlar zaten try/catch içinde). Yükü aynen döner.
 * `iat` saniye hassasiyetindedir: iptalden ÖNCEKİ saniyelerde verilen jetonlar
 * reddedilir; iptal saniyesinde ve sonrasında (yeni şifreyle hemen alınan)
 * jeton geçerlidir.
 */
function denetle(yuk) {
  const anahtar = jetonAnahtari(yuk);
  const t = anahtar ? iptaller.get(anahtar) : undefined;
  if (t && yuk && Number(yuk.iat) < Math.floor(t / 1000)) {
    const e = new Error('Oturum sonlandırıldı.');
    e.name = 'JsonWebTokenError';
    throw e;
  }
  return yuk;
}

module.exports = { yukle, iptalEt, denetle, _iptaller: iptaller };
