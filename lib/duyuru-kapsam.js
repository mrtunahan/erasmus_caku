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

// ⚠ Kuralın kendisi artık lib/yayin-kapsami.js'te: aynı kapsam mantığı
// anketlerde de gerekti (Bilgisayar'a atanan anket Orman'da görünüyordu) ve
// iki kopya kaçınılmaz olarak ayrışırdı. Bu dosya duyuruya özgü olanı —
// eski kayıtlardaki `hedefDepartmentIds` listesini — koruyan ince bir katman.
import { kullaniciBolumleri, yayinKapsamCoz, yayinKapsamdaMi } from './yayin-kapsami.js';

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
  return yayinKapsamCoz(user, tumBolumler);
}

// Kullanıcının bağlı olduğu bölümler (ana + çapraz).
export function duyuruKullaniciBolumleri(user) {
  return kullaniciBolumleri(user);
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
  return yayinKapsamdaMi(d, user, { hedefAlan: 'hedefDepartmentIds' });
}

// ══════════════════════════════════════════════════════════════
// DUYURUNUN ERİŞİM ETİKETİ — okuyucuya ne yazacağız
//
// ⚠ BU DA BİR HATADAN DOĞDU. Pop-up'taki rozet `kapsamTuru` alanını
// okuyordu; oysa o alan YAZANIN YETKİ ALANIDIR, duyurunun eriştiği yer
// değil. Üniversite yetkilisi tek bir bölüme duyuru yazdığında kayıtta
// `kapsamTuru: 'universite'` duruyor ve o bölümün öğrencisi duyuruyu
// "Üniversite geneli" diye görüyordu.
//
// Doğru soru: bu duyuru KİME ULAŞIYOR?
//   • hedef listesi doluysa → duyuru o bölümlere özeldir
//   • boşsa → yazanın yetki alanının tamamına gider
// ══════════════════════════════════════════════════════════════

const KAPSAM_ETIKETI = {
  universite: 'Üniversite geneli',
  fakulte: 'Fakülte geneli',
  bolum: 'Bölüm duyurusu',
};

/**
 * Duyurunun okuyucuya gösterilecek erişim etiketi.
 *
 * @param d         duyuru kaydı
 * @param bolumler  [{id, name}] — hedef bölümün adını yazabilmek için
 * @returns {etiket, hedefli} `hedefli` true ise duyuru belirli bölümlere
 *          özeldir; false ise yazanın kapsamının tamamına gider.
 */
export function duyuruErisimEtiketi(d, bolumler) {
  const kayit = d || {};
  const hedef = Array.isArray(kayit.hedefDepartmentIds)
    ? kayit.hedefDepartmentIds.filter(Boolean)
    : [];

  if (hedef.length > 0) {
    // Tek bölüm: adını yaz — "Bilgisayar Mühendisliği" , "1 bölüme özel"den
    // çok daha fazlasını söyler.
    if (hedef.length === 1) {
      const b = (Array.isArray(bolumler) ? bolumler : []).find(
        (x) => String(x && x.id) === String(hedef[0])
      );
      return { etiket: (b && b.name) || 'Bölüm duyurusu', hedefli: true };
    }
    return { etiket: hedef.length + ' bölüme özel', hedefli: true };
  }

  const tur = String(kayit.kapsamTuru || '');
  return { etiket: KAPSAM_ETIKETI[tur] || KAPSAM_ETIKETI.bolum, hedefli: false };
}
