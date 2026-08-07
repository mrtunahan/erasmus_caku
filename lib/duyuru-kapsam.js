// ══════════════════════════════════════════════════════════════
// DUYURU KAPSAMI — kim kime duyuru yapabilir
//
// Kural basit: bir duyuru, YAZANIN yetki alanının dışına çıkamaz.
//   • Bölüm yetkilisi  → yalnız kendi bölüm(ler)i
//   • Fakülte yetkilisi → yalnız kendi fakültesindeki bölümler
//   • Üniversite yetkilisi → tümü
//
// ⚠ BU DOSYA BİR HATADAN DOĞDU. Önceki kod hedef listesi boş bırakılan bir
// duyuruyu "herkese göster" diye yorumluyordu; kaydın üzerinde yazanın yetki
// alanı hiç durmuyordu. Sonuç: Bilgisayar Mühendisliği bölüm yetkilisinin
// duyurusu Fen Fakültesi'nde de görünüyordu. Artık kapsam kaydın kendisine
// yazılıyor ve gösterimde ZORUNLU olarak uygulanıyor — hedef listesi yalnız
// bu kapsamı DARALTABİLİR, genişletemez.
// ══════════════════════════════════════════════════════════════

const dizi = (v) => (Array.isArray(v) ? v.filter(Boolean).map(String) : []);

/**
 * Kullanıcının duyuru yapabileceği alan.
 *
 * @param {object} user
 * @param {Array}  tumBolumler  [{id, facultyId}]
 * @returns {{kapsamTuru:'universite'|'fakulte'|'bolum', facultyId:string,
 *   departmentIds:string[]}}  `universite` kapsamında departmentIds boştur
 *   (liste tutmanın anlamı yok: yeni açılan bölüm de kapsama girer).
 */
export function duyuruKapsamCoz(user, tumBolumler) {
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

  const benim = dizi([user.departmentId].concat(dizi(user.additionalDepartments)));
  return { kapsamTuru: 'bolum', facultyId: fak, departmentIds: benim };
}

// Kullanıcının bağlı olduğu bölümler (ana + çapraz).
export function duyuruKullaniciBolumleri(user) {
  return dizi([user && user.departmentId].concat(dizi(user && user.additionalDepartments)));
}

/**
 * Duyuru, bu kullanıcının bölümüne ULAŞABİLİR Mİ?
 *
 * Hedef listesinden ÖNCE sorulur: hedef listesi kapsamı daraltmak içindir,
 * kapsam dışına taşımak için değil.
 *
 * ── Eski kayıtlar ──
 * `kapsamTuru` alanı eklenmeden önce yazılmış duyurularda kapsam bilgisi yok.
 * Bunları körlemesine "üniversite geneli" saymak, düzeltmeye çalıştığımız
 * sızıntıyı olduğu gibi bırakırdı. Bu yüzden eski kayıtta hedef listesi boşsa
 * yazanın bölümüne (kayıttaki `departmentId`) düşülür — yani DAR tarafa.
 * Gerçekten üniversite geneli olması gereken eski bir duyuru, yetkilisi bir
 * kez kaydı açıp yeniden kaydettiğinde doğru kapsamla işaretlenir.
 */
export function duyuruKapsamdaMi(d, user) {
  if (!d) return false;
  const kapsamTuru = String(d.kapsamTuru || '');
  const benim = duyuruKullaniciBolumleri(user);

  if (kapsamTuru === 'universite') return true;
  if (kapsamTuru === 'fakulte' || kapsamTuru === 'bolum') {
    const kapsam = dizi(d.kapsamDepartmentIds);
    // Kapsam listesi boş kalmış bir kayıt (bölüm silinmiş olabilir) kimseye
    // açılmaz — "boş liste = herkes" yorumu bu hatanın ta kendisiydi.
    return kapsam.some((x) => benim.includes(x));
  }

  // ── Kapsamsız (eski) kayıt ──
  const hedefler = dizi(d.hedefDepartmentIds);
  if (hedefler.length > 0) return hedefler.some((h) => benim.includes(h));
  const yazanBolum = String(d.departmentId || '');
  if (yazanBolum) return benim.includes(yazanBolum);
  return true; // yazanın bölümü de yoksa gerçekten genel bir duyurudur
}
