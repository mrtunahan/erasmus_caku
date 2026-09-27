// ══════════════════════════════════════════════════════════════
// GENEL OKUMA KAPISINDAN (/api/db) HİÇ ÇIKMAMASI GEREKEN ALANLAR
//
// ⚠ YOKLAMA GİZLİ ANAHTARI SIZIYORDU. `yoklama_oturumlari` kaydındaki
// `sirr`, karekodu ve kısa kodu üreten HMAC anahtarıdır (lib/yoklama.js).
// routes/yoklama.js onu yalnız oturumu açan akademisyene veriyordu, ama
// aynı kayıt /api/db/yoklama_oturumlari üzerinden giriş yapmış HERKESE
// tam hâliyle dönüyordu. Anahtarı alan bir öğrenci, istemci paketinde açık
// duran kod üreticisiyle sınıfta olmadan geçerli kod üretip yoklama
// verebilirdi.
//
// Karekod ekranı anahtarı YALNIZ `POST /api/yoklama/oturum` yanıtından
// alıyor; /api/db okuması yalnız istatistik (devamsızlık, oturum listesi)
// içindir ve anahtara ihtiyaç duymaz. Bu yüzden alan, rol ne olursa olsun
// ve DB_AUTH_MODE'dan bağımsız olarak bu kapıdan hiç çıkmaz.
// ══════════════════════════════════════════════════════════════

const GIZLI_ALANLAR = {
  yoklama_oturumlari: ['sirr'],
};

/** MongoDB projeksiyonu (ör. { sirr: 0 }); gizli alan yoksa null. */
function gizliAlanProjeksiyonu(koleksiyon) {
  const alanlar = GIZLI_ALANLAR[String(koleksiyon || '')];
  if (!alanlar || alanlar.length === 0) return null;
  const p = {};
  alanlar.forEach((a) => {
    p[a] = 0;
  });
  return p;
}

/** Belgeden gizli alanları çıkarır (yerinde); belgeyi döndürür. */
function gizliAlanlariCikar(belge, koleksiyon) {
  const alanlar = GIZLI_ALANLAR[String(koleksiyon || '')];
  if (!belge || typeof belge !== 'object' || !alanlar) return belge;
  alanlar.forEach((a) => {
    delete belge[a];
  });
  return belge;
}

module.exports = { GIZLI_ALANLAR, gizliAlanProjeksiyonu, gizliAlanlariCikar };
