// ══════════════════════════════════════════════════════════════
// DUYURU SAHİPLİK DENETİMİ — SUNUCU TARAFI
//
// Kural ve gerekçesi lib/duyuru-sahiplik.js'te: düzenleme ve silme yalnız
// duyuruyu YAZANDA; kapsam yetkisi görmeyi ve yeni duyuru yazmayı verir,
// başkasının kaydına dokunmayı değil.
//
// ── NEDEN BURADA DA VAR ──
// İstemcideki denetim düğmeyi gizler, isteği engellemez. `/api/db/write`
// doğrudan çağrılabildiği için kural sunucuda da uygulanmazsa hiç
// uygulanmamış sayılır.
// ══════════════════════════════════════════════════════════════

// Türkçe-duyarlı ad anahtarı. İstemci tarafı `adAnahtari` (ESM) kullanıyor;
// sunucu CJS olduğu için aynı sadeleştirme burada, dar biçimde tekrar edilir:
// unvan soyma yok — kayda yazılan `olusturanId` zaten oturumun `identifier`
// değeridir, yani unvansız ham addır.
const TR = {
  ı: 'i',
  İ: 'i',
  I: 'i',
  ş: 's',
  Ş: 's',
  ğ: 'g',
  Ğ: 'g',
  ü: 'u',
  Ü: 'u',
  ö: 'o',
  Ö: 'o',
  ç: 'c',
  Ç: 'c',
};

function anahtar(deger) {
  let s = '';
  for (const h of String(deger == null ? '' : deger)) s += TR[h] || h;
  return s.toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * Bu kullanıcı duyuruyu değiştirebilir mi?
 *
 * @param mevcut  veritabanındaki kayıt (yoksa null)
 * @param user    JWT'den çözülen { role, identifier }
 * @param flags   getActorFlags çıktısı { admin, uniAdmin, ... }
 */
function duyuruyaDokunabilir(mevcut, user, flags) {
  if (!mevcut) return true; // yeni kayıt — sahiplik damgası yazılacak
  const sahip = anahtar(mevcut.olusturanId);
  const ben = anahtar((user && user.identifier) || '');
  if (sahip && ben && sahip === ben) return true;
  // Sahipsiz (eski) kayıt: yalnız üniversite yetkilisi devralabilir.
  if (!sahip) return !!(flags && (flags.uniAdmin || flags.admin));
  return false;
}

module.exports = { duyuruyaDokunabilir, anahtar };
