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
