// ══════════════════════════════════════════════════════════════
// MEMURUN BELGE KAPSAMI — SUNUCU TARAFI
//
// `memur_outputs` bütün modüllerin ürettiği belgelerin ortak kaydıdır ve
// okuma izni personelin tamamına açıktı: süzme yalnız TARAYICIDA yapılıyordu.
// Ekranda doğru görünen kısıt, /api/db/memur_outputs'a doğrudan istek atan
// biri için yoktu — bir bölümün memuru bütün fakültenin belgelerini
// çekebiliyordu. Kural artık sunucuda da uygulanır.
//
// İki koşul birden aranır:
//   1) GÖNDERİM — belge memura fiilen yönlendirilmiş olmalı. Üretilmiş ama
//      gönderilmemiş anlık görüntü (recordMemurOutput) memura ait değildir.
//   2) ATAMA    — yönlendirmenin kapsadığı bölümde memur, belgenin modülüne
//      atanmış olmalı (memur_bolum_modulleri).
//
// İstemcideki lib/memur-belge-erisim.js ile aynı kuraldır; TEK farkı, orada
// bir de "sağda seçili bölüm" süzgeci vardır. O bir arayüz kolaylığı;
// güvenlik sınırı buradaki atamadır. İkisi birlikte değişmelidir.
// ══════════════════════════════════════════════════════════════

const metin = (v) => String(v == null ? '' : v).trim();
const dizi = (v) => (Array.isArray(v) ? v.filter(Boolean).map(String) : []);

/**
 * Memurun bir bölümde göreceği modüller.
 *
 * Atama kaydı varsa odur. Kayıt yoksa memur kaydındaki ESKİ düz liste
 * (`memurModules`) yalnız memurun KENDİ bölümünde geçerlidir: o liste bir
 * bölümün kararıdır, fakültenin tamamına yayılamaz.
 */
function memurBolumModulleri(atamalar, bolumId, memur) {
  const b = metin(bolumId);
  if (!b || !memur) return [];
  const memurId = metin(memur.memurId);
  const atama = (atamalar || []).find(
    (a) => a && metin(a.departmentId) === b && metin(a.memurId) === memurId
  );
  if (atama) return dizi(atama.modules);
  if (b && b === metin(memur.departmentId)) return dizi(memur.memurModules);
  return [];
}

/** Belgenin MEMURA yapılmış yönlendirmeleri. */
function memurYonlendirmeleri(belge) {
  const gs = (belge && belge.gonderimler) || [];
  return Array.isArray(gs) ? gs.filter((g) => g && g.hedefRol === 'memur') : [];
}

/**
 * Bu belge bu memura ait mi?
 *
 * @param {object} belge   memur_outputs dokümanı
 * @param {object} memur   { memurId, departmentId, facultyId, memurModules }
 * @param {Array}  atamalar memur_bolum_modulleri kayıtları
 */
function stajYetkilisiMi(memur, atamalar) {
  if (!memur) return false;
  if (memur.isStajCoordinator === true) return true;
  return (atamalar || []).some(
    (a) => a && metin(a.memurId) === metin(memur.memurId) && dizi(a.modules).indexOf('staj') >= 0
  );
}

function ayniFakulte(belge, memur) {
  const a = metin(belge && belge.facultyId);
  const b = metin(memur && memur.facultyId);
  return !!a && !!b && a === b;
}

function memurunBelgesiMi(belge, memur, atamalar) {
  if (!belge || !memur) return false;
  const modul = metin(belge.module);
  if (!modul) return false;
  // STAJ İSTİSNASI — bilerek fakülte çapındadır: SGK onayı tek elden verilir
  // (bkz. lib/memur-atama.js → memurStajYetkilisiMi). Yine de GÖNDERİM şartı
  // sürer; yalnız bölüm ataması aranmaz.
  const stajGenel = modul === 'staj' && stajYetkilisiMi(memur, atamalar);
  return memurYonlendirmeleri(belge).some((g) => {
    if (stajGenel) return ayniFakulte(belge, memur);
    const bolum = metin(g.kapsamId) || metin(belge.departmentId);
    if (bolum) return memurBolumModulleri(atamalar, bolum, memur).indexOf(modul) >= 0;
    // Bölümsüz (fakülte geneli) belge: fakülte eşleşmeli ve memur HERHANGİ
    // bir bölümde bu modüle atanmış olmalı. Sunucu, arayüzde hangi bölümün
    // seçili olduğunu bilmez; daraltmayı istemci yapar.
    const belgeFak = metin(belge.facultyId);
    const memurFak = metin(memur.facultyId);
    if (!belgeFak || !memurFak || belgeFak !== memurFak) return false;
    return (atamalar || []).some(
      (a) => a && metin(a.memurId) === metin(memur.memurId) && dizi(a.modules).indexOf(modul) >= 0
    );
  });
}

/** Listeyi memurun görebileceği belgelerle sınırlar. */
function memurBelgeleriniSuz(belgeler, memur, atamalar) {
  return (belgeler || []).filter((b) => memurunBelgesiMi(b, memur, atamalar));
}

/**
 * Memurun görebileceği MUAFİYET KAYITLARI.
 *
 * `memur_outputs` kapatıldı ama muafiyet kayıtları personelin tamamına
 * açıktı: memur, arayüzde göremediği bir başvurunun dilekçesine /api/db
 * üzerinden ulaşabiliyordu.
 *
 * Kayıt iki koşuldan BİRİYLE görünür:
 *   1) Kaydın bölümünde memur 'muafiyet' modülüne atanmışsa — o bölümün
 *      işlerini zaten yürütüyor.
 *   2) Kayıt, memura GÖNDERİLMİŞ bir belgenin kaynağıysa. Bu şart gerekli:
 *      belge yönlendirmesinin kapsamı gönderenin bölümünden de gelebiliyor,
 *      yani kaydın kendi bölümü boş olsa bile belge memura düşmüş olabilir.
 *      Bu dal olmadan gönderilmiş belgenin transkript ve ders içerikleri
 *      sessizce kaybolurdu.
 *
 * @param {Set|Array} gonderilenKayitIdleri memura gönderilmiş muafiyet
 *   belgelerinin `sourceId` değerleri
 */
function memurMuafiyetKaydiniGorurMu(kayit, memur, atamalar, gonderilenKayitIdleri) {
  if (!kayit || !memur) return false;
  const bolum = metin(kayit.departmentId);
  if (bolum && memurBolumModulleri(atamalar, bolum, memur).indexOf('muafiyet') >= 0) return true;
  const kimlik = metin(kayit._docId || kayit.id || (kayit._id && kayit._id.toString()));
  if (!kimlik) return false;
  const kume = gonderilenKayitIdleri;
  if (!kume) return false;
  return typeof kume.has === 'function' ? kume.has(kimlik) : dizi(kume).indexOf(kimlik) >= 0;
}

/** Muafiyet kayıtlarını memurun kapsamına indirger. */
function memurMuafiyetKayitlariniSuz(kayitlar, memur, atamalar, gonderilenKayitIdleri) {
  return (kayitlar || []).filter((k) =>
    memurMuafiyetKaydiniGorurMu(k, memur, atamalar, gonderilenKayitIdleri)
  );
}

/**
 * Memura gönderilmiş muafiyet belgelerinin kaynak kayıt kimlikleri.
 * `memur_outputs` dokümanlarından çıkarılır — yani gönderim şartı burada da
 * geçerlidir.
 */
function memuraGonderilenMuafiyetKayitlari(belgeler, memur, atamalar) {
  const out = new Set();
  (belgeler || []).forEach((b) => {
    if (!b || metin(b.module) !== 'muafiyet') return;
    if (!memurunBelgesiMi(b, memur, atamalar)) return;
    const kaynak = metin(b.sourceId);
    if (kaynak) out.add(kaynak);
  });
  return out;
}

module.exports = {
  stajYetkilisiMi,
  memurMuafiyetKaydiniGorurMu,
  memurMuafiyetKayitlariniSuz,
  memuraGonderilenMuafiyetKayitlari,
  memurBolumModulleri,
  memurYonlendirmeleri,
  memurunBelgesiMi,
  memurBelgeleriniSuz,
};
