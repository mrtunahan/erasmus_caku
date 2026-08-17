// ══════════════════════════════════════════════════════════════
// MEMUR ATAMALARI — havuz fakültede, atama bölümde
//
// Memur AKADEMİSYEN DEĞİLDİR: kendisine atanan modülde akademisyenin ürettiği
// çıktıyı salt-okunur görür/indirir. Model iki katmanlı:
//
//   1) HAVUZ  — memur fakülteye eklenir (professors + isMemur + facultyId).
//   2) ATAMA  — her BÖLÜM havuzdan istediği memuru kendi bölümüne alır ve o
//               bölüm için hangi modülleri göreceğini belirler.
//
// ⚠ Önceden atama memur kaydında düz bir listeydi (`memurModules`). Bölüm
// ayrımı olmadığı için bir bölümün ataması bütün bölümlerde geçerliydi:
// Bilgisayar'ın "staj" ataması, memuru Makine'nin staj çıktılarına da
// sokuyordu. Dahası iki bölüm yetkilisi aynı kaydı yazdığında biri diğerinin
// ayarını eziyordu. Atama artık (bölüm, memur) başına AYRI bir kayıttır:
// bölümler birbirinin ayarına dokunmaz.
//
// Staj yetkisi burada bir istisnadır ve bilerek öyle bırakılmıştır: SGK onayı
// fakülte çapında tek elden verilir. Bu yüzden `isStajCoordinator` bayrağı
// memur kaydında kalır ve kuralı "HERHANGİ bir bölüm staj atadıysa yetkilidir"
// biçiminde hesaplanır (bkz. memurStajYetkilisiMi).
// ══════════════════════════════════════════════════════════════

export const MEMUR_ATAMA_KOLEKSIYONU = 'memur_bolum_modulleri';

const metin = (v) => String(v == null ? '' : v).trim();
const dizi = (v) => (Array.isArray(v) ? v.filter(Boolean).map(String) : []);

/**
 * Atama kaydının kimliği. Bölüm ve memur birlikte anahtardır: aynı memur
 * birden çok bölüme, aynı bölüm birden çok memura atanabilir.
 */
export function memurAtamaAnahtari(bolumId, memurId) {
  return metin(bolumId) + '::' + metin(memurId);
}

/** Atama listesinden (bölüm, memur) kaydını bulur. */
export function memurAtamasi(atamalar, bolumId, memurId) {
  const b = metin(bolumId);
  const m = metin(memurId);
  if (!b || !m) return null;
  return (
    (atamalar || []).find((a) => a && metin(a.departmentId) === b && metin(a.memurId) === m) || null
  );
}

/**
 * Bir memurun BELİRLİ bir bölümde göreceği modüller.
 *
 * @param {Array} atamalar
 * @param {string} bolumId
 * @param {string} memurId
 * @param {Array}  [eskiModuller] memur kaydındaki eski düz liste. Atama kaydı
 *   yoksa geriye dönük olarak kullanılır — yeni model devreye girdiğinde
 *   mevcut memurlar bir anda yetkisiz kalmasın. Atama kaydı VARSA eski liste
 *   yok sayılır: bölümün kararı esastır.
 */
export function memurModulleri(atamalar, bolumId, memurId, eskiModuller) {
  const atama = memurAtamasi(atamalar, bolumId, memurId);
  if (atama) return dizi(atama.modules);
  return dizi(eskiModuller);
}

/**
 * Memurun atandığı bölümler. Memur yalnız kendisini ekleyen bölümleri görür;
 * fakültenin tamamını değil.
 */
export function memurBolumleri(atamalar, memurId) {
  const m = metin(memurId);
  if (!m) return [];
  const out = [];
  (atamalar || []).forEach((a) => {
    if (!a || metin(a.memurId) !== m) return;
    const b = metin(a.departmentId);
    // Modülü kalmamış atama, bölümün memuru fiilen çıkarmış olması demektir.
    if (!b || out.includes(b) || dizi(a.modules).length === 0) return;
    out.push(b);
  });
  return out;
}

/**
 * Staj yetkisi fakülte çapındadır (SGK onayı tek elden verilir): memura
 * HERHANGİ bir bölüm staj modülünü atadıysa staj yetkilisidir.
 */
export function memurStajYetkilisiMi(atamalar, memurId) {
  const m = metin(memurId);
  if (!m) return false;
  return (atamalar || []).some(
    (a) => a && metin(a.memurId) === m && dizi(a.modules).includes('staj')
  );
}

/**
 * Bir bölümün memur atamasını yazarken kullanılacak kayıt.
 * Modül listesi boşsa atama kaldırılmış sayılır — çağıran kaydı silebilir ya
 * da boş liste ile yazabilir; iki durumda da memur o bölümde görünmez.
 */
export function memurAtamaKaydi({ bolumId, memur, modules, yazan }) {
  const memurId = metin(memur && (memur.id || memur._docId));
  return {
    id: memurAtamaAnahtari(bolumId, memurId),
    departmentId: metin(bolumId),
    memurId,
    // Ad kayda kopyalanır: liste ekranı tek okumayla anlamlı olsun (memur
    // kaydı silinmişse bile kimin atandığı görünür).
    memurName: metin(memur && memur.name),
    facultyId: metin(memur && memur.facultyId),
    modules: dizi(modules),
    updatedBy: metin(yazan),
    updatedAt: new Date().toISOString(),
  };
}

/** Bir bölümde atanmış memurların kimlikleri (modülü olanlar). */
export function bolumunMemurlari(atamalar, bolumId) {
  const b = metin(bolumId);
  if (!b) return [];
  const out = [];
  (atamalar || []).forEach((a) => {
    if (!a || metin(a.departmentId) !== b) return;
    const m = metin(a.memurId);
    if (!m || out.includes(m) || dizi(a.modules).length === 0) return;
    out.push(m);
  });
  return out;
}
