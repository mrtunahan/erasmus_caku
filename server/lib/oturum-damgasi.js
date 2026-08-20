// ══════════════════════════════════════════════════════════════
// ŞİFRE DEĞİŞİMİNDEN ÖNCEKİ OTURUMLARI DÜŞÜR
//
// Şifre sıfırlamanın asıl amacı ele geçirilmiş bir hesabı geri almaktır. Ama
// jetonlar 24 saat geçerli ve iptal edilemiyordu: şifre değişse bile
// saldırganın açık oturumu bir gün daha çalışmaya devam ediyordu. Sıfırlama
// bu hâliyle amacına ulaşmıyordu.
//
// ── NEDEN KULLANICI KAYDINA SÜRÜM EKLENMEDİ ──
// Klasik çözüm her kullanıcıya `tokenVersion` eklemek ve jetona gömmektir.
// Bu, DÖRT ayrı giriş yolunu ve her kullanıcı kaydını değiştirmeyi gerektirir;
// üstelik dağıtım anında sürümü olmayan herkesin oturumu düşerdi.
//
// Bunun yerine jetonun KENDİ `iat` (veriliş zamanı) damgası kullanılır: zaten
// her jetonun içinde var. Yanına yalnız "bu hesabın şifresi en son ne zaman
// değişti" bilgisi gerekir. Damgası olmayan hesapta kimse düşmez, dolayısıyla
// dağıtım kimseyi çıkışa zorlamaz.
//
// ── NEDEN BELLEKTE ──
// Ara katmanlar (requireAuth, softAuth) EŞZAMANLI. Her istekte veritabanı
// okumak hem yapılarını bozar hem de her isteğe bir sorgu ekler. Damga tablosu
// küçüktür (hesap başına bir sayı) ve arka planda tazelenir; şifre değişimi
// aynı süreçte olduğunda anında tazelenir.
//
// Bunun bedeli: çok süreçli bir dağıtımda BAŞKA bir süreçteki değişim en geç
// TAZELEME_MS kadar sonra görülür. Jetonun 24 saatlik ömrü yanında kabul
// edilebilir bir gecikme.
// ══════════════════════════════════════════════════════════════

const { jetonEskimisMi, damgaAnahtari } = require('./sifre-sifirlama');

const TAZELEME_MS = 60 * 1000;
const DOC_ID = 'sifre_degisim_zamanlari';

let damgalar = {};
let sonOkuma = 0;
let okumaSozu = null;
let dbGetir = null;

/** Bir kez kurulur (server/index.js). Kurulmazsa hiçbir jeton düşmez. */
function kur(getDb) {
  dbGetir = getDb;
  tazele().catch(() => {});
}

async function tazele() {
  if (!dbGetir) return damgalar;
  if (okumaSozu) return okumaSozu;
  okumaSozu = (async () => {
    try {
      const db = await dbGetir();
      const doc = await db.collection('passwords').findOne({ _id: DOC_ID });
      if (doc) {
        const { _id, _docId, updatedAt, ...rest } = doc;
        damgalar = rest;
      } else {
        damgalar = {};
      }
      sonOkuma = Date.now();
    } catch (_) {
      // Okunamazsa ESKİ tablo korunur: erişilemeyen veritabanı yüzünden
      // herkesi içeri almak da herkesi dışarı atmak da yanlış olur.
    } finally {
      okumaSozu = null;
    }
    return damgalar;
  })();
  return okumaSozu;
}

/** Şifre değiştiğinde çağrılır — tablo anında tazelenir. */
function bildirimVer() {
  sonOkuma = 0;
  return tazele();
}

/**
 * Bu jeton, sahibinin şifresi değiştikten ÖNCE mi verilmiş?
 * Eşzamanlıdır; tablo bayatladıysa arka planda tazelenir.
 */
function eskimisMi(user) {
  if (!user || !user.role || !user.identifier || !user.iat) return false;
  if (Date.now() - sonOkuma > TAZELEME_MS) tazele().catch(() => {});
  const damga = damgalar[damgaAnahtari(user.role, user.identifier)];
  return jetonEskimisMi(user.iat, damga);
}

/**
 * Bu jeton normal bir OTURUM jetonu mu?
 *
 * Şifre sıfırlama jetonu (`amac: 'sifre-sifirlama'`) aynı gizli anahtarla
 * imzalanır ama yalnız şifre belirlemeye yetkilidir; oturum jetonu olarak
 * kabul edilirse sıfırlama kodunu bilen biri kodu şifreye çevirmeden doğrudan
 * hesaba girerdi.
 */
function oturumJetonuMu(user) {
  return !!user && !user.amac;
}

module.exports = { kur, tazele, bildirimVer, eskimisMi, oturumJetonuMu, TAZELEME_MS };
