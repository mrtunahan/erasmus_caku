// ══════════════════════════════════════════════════════════════
// YAYIN KAPSAMI — bir duyuru/anket kime ulaşır
//
// Kural tek: bir yayın, YAYIMLAYANIN yetki alanının dışına çıkamaz.
//   • Bölüm yetkilisi    → yalnız kendi bölüm(ler)i
//   • Fakülte yetkilisi  → kendi fakültesindeki TÜM bölümler
//   • Üniversite yetkilisi → tüm fakülteler
//
// ⚠ BU KURAL BİR HATADAN DOĞDU (önce duyurularda, sonra anketlerde):
// kapsam bilgisi kaydın üzerinde durmuyordu ve okuma tarafı "alan boşsa
// herkese göster" diye yorumluyordu. Sonuç: Bilgisayar Mühendisliği'ne
// atanan anket Orman Mühendisliği'nde de çıkıyordu.
//
// İki taraflı çözüm:
//   1) YAZARKEN kapsam kaydın kendisine yazılır (kapsamTuru +
//      kapsamDepartmentIds). Yayımcının o anki ekranı, rolü, aktif bölümü
//      sonradan değişse bile kaydın kapsamı sabit kalır.
//   2) OKURKEN kapsam ZORUNLU olarak uygulanır. Boş kapsam listesi "herkes"
//      değildir — kimse demektir.
//
// Hedef/grup listeleri kapsamı yalnız DARALTIR, asla genişletmez.
// ══════════════════════════════════════════════════════════════

const dizi = (v) => (Array.isArray(v) ? v.filter(Boolean).map(String) : []);

/** Kullanıcının bağlı olduğu bölümler (ana + çapraz atamalar). */
export function kullaniciBolumleri(user) {
  return dizi([user && user.departmentId].concat(dizi(user && user.additionalDepartments)));
}

/**
 * Kullanıcının yayın yapabileceği alan.
 *
 * @param {object} user
 * @param {Array}  tumBolumler [{id, facultyId}]
 * @returns {{kapsamTuru:'universite'|'fakulte'|'bolum', facultyId:string,
 *   departmentIds:string[]}} `universite` kapsamında departmentIds boştur —
 *   liste tutmanın anlamı yok, sonradan açılan bölüm de kapsama girer.
 */
export function yayinKapsamCoz(user, tumBolumler) {
  const hepsi = Array.isArray(tumBolumler) ? tumBolumler : [];
  if (!user) return { kapsamTuru: 'bolum', facultyId: '', departmentIds: [] };

  if (user.isUniversityAdmin || user.role === 'admin') {
    return { kapsamTuru: 'universite', facultyId: '', departmentIds: [] };
  }

  const fak = String(user.facultyId || '');
  if (user.isFacultyManager && fak) {
    return {
      kapsamTuru: 'fakulte',
      facultyId: fak,
      departmentIds: hepsi
        .filter((d) => String(d.facultyId || '') === fak)
        .map((d) => String(d.id)),
    };
  }

  return { kapsamTuru: 'bolum', facultyId: fak, departmentIds: kullaniciBolumleri(user) };
}

/**
 * Kayda yazılacak kapsam alanları.
 *
 * @param {object} kapsam  yayinKapsamCoz çıktısı
 * @param {string} [sadeceBolumId] yayımcı tek bir bölüm seçtiyse kapsam ona
 *   DARALTILIR. Kapsam dışı bir bölüm verilirse yok sayılır — daraltma aracı,
 *   kapsam aşma aracı değil.
 */
export function yayinKapsamYamasi(kapsam, sadeceBolumId) {
  const k = kapsam || { kapsamTuru: 'bolum', facultyId: '', departmentIds: [] };
  const tek = String(sadeceBolumId || '');
  if (tek) {
    const icinde = k.kapsamTuru === 'universite' || dizi(k.departmentIds).includes(tek);
    if (icinde) {
      return {
        kapsamTuru: 'bolum',
        kapsamFacultyId: String(k.facultyId || ''),
        kapsamDepartmentIds: [tek],
      };
    }
  }
  return {
    kapsamTuru: k.kapsamTuru,
    kapsamFacultyId: String(k.facultyId || ''),
    kapsamDepartmentIds: dizi(k.departmentIds),
  };
}

/**
 * Yayın bu kullanıcının bölümüne ULAŞABİLİR Mİ?
 *
 * ── Eski kayıtlar ──
 * `kapsamTuru` alanı eklenmeden önce yazılmış kayıtlarda kapsam bilgisi yok.
 * Bunları körlemesine "üniversite geneli" saymak, düzeltmeye çalıştığımız
 * sızıntıyı olduğu gibi bırakırdı; bu yüzden DAR tarafa düşülür: kayıtta
 * yazanın bölümü (departmentId) varsa yalnız o bölüm. Gerçekten genel olması
 * gereken eski bir kayıt, yetkilisi bir kez açıp yeniden kaydettiğinde doğru
 * kapsamla işaretlenir.
 *
 * @param {object} kayit
 * @param {object} user
 * @param {object} [secenek] { hedefAlan } eski kayıtlardaki hedef listesi alanı
 */
export function yayinKapsamdaMi(kayit, user, secenek) {
  if (!kayit) return false;
  const benim = kullaniciBolumleri(user);
  const kapsamTuru = String(kayit.kapsamTuru || '');

  if (kapsamTuru === 'universite') return true;
  if (kapsamTuru === 'fakulte' || kapsamTuru === 'bolum') {
    // Kapsam listesi boş kalmış kayıt (bölüm silinmiş olabilir) kimseye
    // açılmaz — "boş liste = herkes" yorumu bu hatanın ta kendisiydi.
    return dizi(kayit.kapsamDepartmentIds).some((x) => benim.includes(x));
  }

  // ── Kapsamsız (eski) kayıt ──
  const hedefAlan = (secenek && secenek.hedefAlan) || '';
  if (hedefAlan) {
    const hedefler = dizi(kayit[hedefAlan]);
    if (hedefler.length > 0) return hedefler.some((h) => benim.includes(h));
  }
  const yazanBolum = String(kayit.departmentId || '');
  if (yazanBolum) return benim.includes(yazanBolum);
  return true; // yazanın bölümü de yoksa gerçekten genel bir kayıttır
}

/**
 * Yayımcının YÖNETİM ekranında göreceği kayıtlar: kendi kapsamına giren ya da
 * kendi kapsamıyla kesişen yayınlar. Bir bölüm yetkilisi başka bölümün
 * atamasını görüp silememeli.
 */
export function yayinYonetilebilirMi(kayit, kapsam) {
  if (!kayit) return false;
  const k = kapsam || { kapsamTuru: 'bolum', departmentIds: [] };
  if (k.kapsamTuru === 'universite') return true;
  const benim = dizi(k.departmentIds);
  const kayitKapsam = dizi(kayit.kapsamDepartmentIds);
  if (String(kayit.kapsamTuru || '') === 'universite') {
    // Üniversite geneli bir yayın alt yetkiliye GÖRÜNÜR ama onun eseri
    // değildir; yönetimini (silme) üst yetkiliye bırakmak gerekir.
    return false;
  }
  if (kayitKapsam.length > 0) return kayitKapsam.some((x) => benim.includes(x));
  // Eski kayıt: yazanın bölümü kapsamımızda mı?
  const yazanBolum = String(kayit.departmentId || '');
  if (yazanBolum) return benim.includes(yazanBolum);
  return false;
}
