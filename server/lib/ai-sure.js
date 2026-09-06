// ══════════════════════════════════════════════════════════════
// BELGE OKUMA SÜRE BÜTÇESİ
//
// ⚠ BU DOSYA BİR HATADAN DOĞDU. Transkript okutan kullanıcıya
// "Satırlar okunamadı (HTTP 504)" dönüyordu. 504'ü uygulama üretmiyordu:
// nginx, /api/ altındaki her isteği 30 saniyede kesiyordu (bkz.
// ssl-setup/nginx-domain.conf). Çok sayfalı bir transkriptin okunması bunun
// çok üstünde sürebiliyor. Sunucu çalışmaya devam ediyor, modelin parası
// ödeniyor, ama yanıtı kimse alamıyordu — ve mesaj kullanıcıya ne olduğunu
// da söylemiyordu.
//
// İki taraf birden düzeltilir:
//   • nginx, belge okuma uçlarına ayrı ve uzun bir süre verir (300 sn),
//   • sunucu KENDİ üst sınırını uygular (aşağıdaki değer) ve süre dolarsa
//     ne olduğunu anlatan bir yanıt döner.
//
// Sunucunun sınırı nginx'inkinden KÜÇÜK olmalıdır; aksi halde bağlantıyı
// yine nginx keser ve kullanıcı gene açıklamasız 504 görür.
// ══════════════════════════════════════════════════════════════

/** Sunucu tarafı üst sınır. nginx'teki 300 sn'nin altında kalmalı. */
const AI_SURE_SINIRI_MS = 240000;

/** Süre aşımında kullanıcıya gösterilecek metin. */
function sureAsimiMesaji(ms) {
  const sn = Math.round((Number(ms) || 0) / 1000);
  return (
    'Belge ' +
    sn +
    ' saniyede okunamadı. Genellikle belge çok uzun ya da taranmış (görüntü) ' +
    'olduğunda olur. Transkripti sayfa sayısı daha az bir PDF olarak ya da ' +
    'metin katmanı olan bir dosya olarak yükleyip yeniden deneyin.'
  );
}

/**
 * Bir işi süreyle sınırlar.
 *
 * Süre dolduğunda `sureAsti: true` işaretli bir hata fırlatır — çağıran bunu
 * ayırt edip 504 + açıklama döndürür. Asıl iş arka planda sürebilir; amaç
 * kullanıcıyı boşta bırakmamaktır.
 */
function sureSinirli(is, ms) {
  const sinir = Number(ms) || AI_SURE_SINIRI_MS;
  let zamanlayici = null;
  const saat = new Promise((_c, red) => {
    zamanlayici = setTimeout(() => {
      const hata = new Error(sureAsimiMesaji(sinir));
      hata.sureAsti = true;
      red(hata);
    }, sinir);
    // Node süreci yalnız bu zamanlayıcı yüzünden ayakta kalmasın.
    if (zamanlayici && typeof zamanlayici.unref === 'function') zamanlayici.unref();
  });
  return Promise.race([is, saat]).finally(() => {
    if (zamanlayici) clearTimeout(zamanlayici);
  });
}

module.exports = { AI_SURE_SINIRI_MS, sureAsimiMesaji, sureSinirli };
