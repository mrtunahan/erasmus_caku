// ══════════════════════════════════════════════════════════════
// YAYIN KAPSAMI (SUNUCU) — SİLME YETKİSİ İSTEMCİYE BIRAKILAMAZ
//
// Anket ataması ve duyuru, yayımlayanın yetki alanına bağlıdır. Bu kural
// istemcide `lib/yayin-kapsami.js` içinde vardı ama YALNIZ ORADA vardı:
// yönetim listesi süzülüyordu, silme isteği ise sunucuda hiçbir denetimden
// geçmiyordu. Arayüzü atlayan (ya da süzgeci yanlış çalışan) bir kullanıcı
// başka fakültenin -hatta üniversite genelinin- atamasını silebiliyordu.
// Yetki kararı, isteği KİMİN gönderdiğine bakılarak sunucuda verilmelidir.
//
// ── İSTEMCİDEKİ KURALLA AYNI ──
// Aynı üç kapsam: universite / fakulte / bolum. Fark yalnız girdide: burada
// kullanıcı profili ve `departments` dokümanları var.
//
// ── ROLE BAKMAK YETMEZ ──
// Fakülte yetkilisi de istemcide 'admin' rolüne yükseltiliyor. Sunucu
// kararını role değil, profildeki BAYRAKLARA dayandırır.
// ══════════════════════════════════════════════════════════════

const { kimlikler } = require('./bolum-kimlik');

const dizi = (v) => (Array.isArray(v) ? v.filter(Boolean).map(String) : []);

/**
 * Kullanıcının yayın yapabileceği/yönetebileceği alan.
 *
 * @param {object} profil  professors kaydı (bayraklar + facultyId/departmentId)
 * @param {Array}  bolumDokumanlari `departments` koleksiyonu
 */
function aktorKapsami(profil, bolumDokumanlari) {
  const p = profil || {};
  const bolumler = Array.isArray(bolumDokumanlari) ? bolumDokumanlari : [];
  if (p.isUniversityAdmin) {
    return { kapsamTuru: 'universite', facultyId: '', departmentIds: [] };
  }

  const fak = String(p.facultyId || '');
  if (p.isFacultyManager && fak) {
    const ids = [];
    bolumler.forEach((d) => {
      if (d && String(d.facultyId || '') === fak) ids.push(...kimlikler(d));
    });
    return { kapsamTuru: 'fakulte', facultyId: fak, departmentIds: [...new Set(ids)] };
  }

  // Bölüm düzeyi: kullanıcının kaydında hangi kimlik biçimi durursa dursun,
  // o bölümün TÜM biçimleri kapsama girer — kayıtların bir kısmı slug, bir
  // kısmı ObjectId taşıyor.
  const benim = dizi([p.departmentId].concat(dizi(p.additionalDepartments)));
  const genis = [];
  benim.forEach((k) => {
    const es = bolumler.find((d) => d && kimlikler(d).includes(k));
    genis.push(...(es ? kimlikler(es) : [k]));
  });
  return { kapsamTuru: 'bolum', facultyId: fak, departmentIds: [...new Set(genis)] };
}

/**
 * Bu kaydı bu kapsam yönetebilir (silebilir/düzenleyebilir) mi?
 *
 * Üniversite geneli bir yayın alt yetkiliye GÖRÜNÜR ama onun eseri değildir;
 * kaldırma yetkisi üst mercide kalır.
 */
function yonetilebilirMi(kayit, kapsam) {
  if (!kayit) return false;
  const k = kapsam || { kapsamTuru: 'bolum', departmentIds: [] };
  if (k.kapsamTuru === 'universite') return true;
  if (String(kayit.kapsamTuru || '') === 'universite') return false;

  const benim = dizi(k.departmentIds);
  const kayitKapsam = dizi(kayit.kapsamDepartmentIds);
  if (kayitKapsam.length > 0) return kayitKapsam.some((x) => benim.includes(x));

  // Kapsamsız (eski) kayıt: yazanın bölümü kapsamımızda mı?
  const yazanBolum = String(kayit.departmentId || '');
  if (yazanBolum) return benim.includes(yazanBolum);
  // Ne kapsam ne bölüm taşıyor: sahibi belirsiz, alt yetkiliye bırakılmaz.
  return false;
}

module.exports = { aktorKapsami, yonetilebilirMi };
