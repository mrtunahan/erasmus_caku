// ══════════════════════════════════════════════════════════════
// ÇAP / YANDAL ÖĞRENCİSİ — İKİNCİ BÖLÜME ERİŞİM
//
// Çift ana dal (ÇAP) yapan öğrenci İKİ programın öğrencisidir. Sistemde bu,
// öğrenci kaydındaki `additionalDepartments` dizisiyle tutulur; Kullanıcı
// Yönetimi'nden "ÇAP öğrencisi ekle" ile yazılır.
//
// ⚠ BU DOSYA BİR HATADAN DOĞDU. Kayıt doğru yazılıyordu ama öğrenci tarafı
// bu alanı hiç okumuyordu:
//   • Giriş yanıtı (auth) yalnız `departmentId` döndürüyordu → oturumda ek
//     bölüm bilgisi hiç bulunmuyordu.
//   • Erişilebilir bölüm listesi öğrenci için "yalnız kendi bölümü" idi →
//     bölüm değiştirme şeridi hiç çıkmıyordu.
// Sonuç: ÇAP öğrencisi ikinci bölümüne ait ders programı, sınav takvimi,
// duyuru, proje — hiçbir şeyi göremiyordu.
//
// ⚠ İKİNCİ TUZAK: uygulamada ek bölümde çalışan kullanıcıyı AKADEMİSYENE
// çeviren bir dal var (çapraz görevli hoca kendi dersini yönetsin diye). Bu
// dal öğrenciye UYGULANMAZ; uygulansaydı ÇAP öğrencisi ikinci bölümde
// akademisyen yetkisiyle dolaşırdı. Kural burada tek yerde tanımlıdır.
// ══════════════════════════════════════════════════════════════

function metin(d) {
  return String(d == null ? '' : d).trim();
}

/** Oturum sahibi öğrenci mi? */
export function ogrenciMi(kullanici) {
  return !!kullanici && kullanici.role === 'student';
}

/** Kullanıcının ek (ÇAP/çapraz) bölüm kimlikleri — tekilleştirilmiş. */
export function ekBolumler(kullanici) {
  const ham =
    kullanici && Array.isArray(kullanici.additionalDepartments)
      ? kullanici.additionalDepartments
      : [];
  const out = [];
  ham.forEach((d) => {
    const k = metin(d);
    if (k && !out.includes(k)) out.push(k);
  });
  return out;
}

/** ÇAP öğrencisi mi — öğrenci ve en az bir ek bölümü var. */
export function capOgrencisiMi(kullanici) {
  return ogrenciMi(kullanici) && ekBolumler(kullanici).length > 0;
}

/** Çift numaralı ÇAP programlarının bölümleri (giriş yanıtından gelir). */
export function capProgramBolumleri(kullanici) {
  const ham = kullanici && Array.isArray(kullanici.capProgramlari) ? kullanici.capProgramlari : [];
  const out = [];
  ham.forEach((p) => {
    const b = metin(p && p.departmentId);
    if (b && !out.includes(b)) out.push(b);
  });
  return out;
}

/**
 * Öğrencinin erişebileceği bölümler: ana bölüm + ek bölümler + bağlı
 * programlar. Ana bölüm her zaman başta durur (varsayılan aktif bölüm odur).
 *
 * ÇAP iki biçimde olabiliyor ve ikisi de kayıtlarda var: AYNI numarayla
 * (`additionalDepartments`) ve ÇİFT numarayla (`capProgramlari`, bkz.
 * lib/cap-numara-baglama.js). Liste ikisini birden kapsar.
 */
export function ogrenciBolumleri(kullanici) {
  const ana = metin(kullanici && kullanici.departmentId);
  const liste = ana ? [ana] : [];
  ekBolumler(kullanici)
    .concat(capProgramBolumleri(kullanici))
    .forEach((d) => {
      if (!liste.includes(d)) liste.push(d);
    });
  return liste;
}

/**
 * Öğrencinin ŞU AN baktığı programın bölümü.
 *
 * ⚠ BU KURAL BİR TUTARSIZLIKTAN DOĞDU. Ekranlar bölümü `currentUser.
 * departmentId`den okuyordu; o alan HER ZAMAN ana programdır. Çift numaralı
 * ÇAP öğrencisi ikinci programına geçtiğinde öğrenci numarası değişiyor ama
 * bölüm değişmiyordu: Benim Sayfam ikinci programın öğrenci kaydını, birinci
 * programın duyuru ve etkinliklerini gösteriyordu.
 *
 * Kimlik alanına DOKUNULMAZ (`departmentId` yerinde kalır — bölüm şeridi ve
 * yetki hesapları ona bakıyor); ekran, seçili bölümü kullanır. Seçili bölüm
 * öğrencinin programlarından biri değilse ana bölüme düşülür.
 */
export function ogrenciAktifBolumu(kullanici, aktifBolum) {
  const ana = metin(kullanici && kullanici.departmentId);
  const aktif = metin(aktifBolum);
  if (!ogrenciMi(kullanici)) return ana || aktif;
  if (aktif && ogrenciBolumleri(kullanici).includes(aktif)) return aktif;
  return ana || aktif;
}

/** Aktif bölüm, kullanıcının ANA bölümü değil de bir EK bölümü mü? */
export function ekBolumdeMi(kullanici, aktifBolum) {
  const aktif = metin(aktifBolum);
  if (!aktif) return false;
  if (aktif === metin(kullanici && kullanici.departmentId)) return false;
  return ekBolumler(kullanici).includes(aktif);
}

/**
 * "Çapraz görevli" kısıtı bu kullanıcıya uygulanır mı?
 *
 * Kısıt, ek bölümde çalışan AKADEMİSYEN/YETKİLİ içindir: modül seti üç derse
 * bağlı modüle iner ve kullanıcı o bölümde salt akademisyen sayılır. Öğrenci
 * için böyle bir şey yoktur — ÇAP öğrencisi ikinci bölümün de öğrencisidir,
 * kısıt uygulanırsa akademisyen yetkisi kazanırdı.
 */
export function caprazKisitli(kullanici, aktifBolum) {
  if (ogrenciMi(kullanici)) return false;
  return ekBolumdeMi(kullanici, aktifBolum);
}

/**
 * Bu satır, bölüm listesinde bir ÇAP satırı mı?
 *
 * Öğrenci listesi aktif bölümün öğrencilerini gösterir; ÇAP öğrencisi de ek
 * bölüm eşleşmesiyle bu listeye girer. Satırın hangi anlama geldiğini bilmek
 * ŞART: ÇAP satırındaki "Sil" düğmesi öğrencinin TÜM kaydını siler — yani
 * öğrenciyi ana bölümünden de yok eder.
 *
 * @param {object} ogrenci `students` kaydı
 * @param {string} aktifBolum listelenen bölüm
 */
export function capSatiriMi(ogrenci, aktifBolum) {
  const aktif = metin(aktifBolum);
  if (!aktif) return false;
  if (metin(ogrenci && ogrenci.departmentId) === aktif) return false;
  return ekBolumler(ogrenci).includes(aktif);
}

/**
 * Öğrenciyi bir ÇAP bölümünden çıkarınca kalan ek bölüm listesi.
 * Kaydın kendisine dokunmaz — yalnız bağı koparır.
 */
export function capBolumundenCikar(ogrenci, aktifBolum) {
  const aktif = metin(aktifBolum);
  return ekBolumler(ogrenci).filter((d) => d !== aktif);
}

/**
 * Bu öğrenci bu bölümden SİLİNEBİLİR mi?
 *
 * ⚠ BU KURAL BİR VERİ KAYBINDAN DOĞDU. ÇAP öğrencisi ikinci bölümün öğrenci
 * listesinde görünüyordu ve satırdaki tek işlem "Sil"di; o düğme `students`
 * kaydını tamamen siliyordu (geri alınamaz, kademeli silme de yok). ÇAP
 * bağını koparmak isteyen yetkili, öğrenciyi ANA bölümünden de sildi.
 *
 * Silme yalnız öğrencinin ANA bölümünden yapılabilir; ek bölümde tek yapılacak
 * şey ÇAP bağını koparmaktır.
 */
export function capSilinebilirMi(ogrenci, aktifBolum) {
  return !capSatiriMi(ogrenci, aktifBolum);
}
