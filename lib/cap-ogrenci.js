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
export function caprazKisitli(kullanici, aktifBolum, bolumler) {
  if (ogrenciMi(kullanici)) return false;
  if (!ekBolumdeMi(kullanici, aktifBolum)) return false;
  const k = kullanici || {};
  // Üniversite yetkilisi her bölümün yetkilisidir; fakülte yetkilisi kendi
  // FAKÜLTESİNDEKİ bölümün yetkilisidir — orada ders vermesi (ek bölüm) onu
  // sade akademisyene indirmez. Sunucu da bu bölümlerde yetkili sayar.
  if (k.isUniversityAdmin) return false;
  const fak = metin(k.facultyId);
  if (k.isFacultyManager && fak) {
    const liste = Array.isArray(bolumler)
      ? bolumler
      : (typeof globalThis !== 'undefined' && globalThis.DEPARTMENTS) || [];
    const aktif = metin(aktifBolum);
    const b = liste.find(
      (d) =>
        d &&
        (metin(d.id) === aktif ||
          metin(d._docId) === aktif ||
          (Array.isArray(d.kimlikler) && d.kimlikler.map(metin).includes(aktif)))
    );
    // Fakültesi boş bölüm istemcide Mühendislik sayılır (sunucuyla aynı).
    if (b && (metin(b.facultyId) || 'muhendislik') === fak) return false;
  }
  return true;
}

// ── EK BÖLÜMDE AÇIK MODÜLLER ──
// Kullanıcı ek bölümünde (ders verdiği başka bölüm) yalnız derse bağlı
// modülleri görür. İstisna: BÖLÜM ya da FAKÜLTE YETKİLİSİ başka bir
// FAKÜLTENİN bölümünde ders veriyorsa o fakültenin Ders Odaları modülüne
// erişemez — modül menüde de gösterilmez.
export const CAPRAZ_MODULLER = Object.freeze(['dersprogrami', 'sinav', 'projeler', 'dersodalari']);

/** Bölümün fakültesi (bölüm her kimliğiyle — slug, veritabanı kimliği — aranır). */
export function bolumunFakultesi(bolumler, bolumId) {
  const id = metin(bolumId);
  if (!id) return '';
  const b = (Array.isArray(bolumler) ? bolumler : []).find(
    (d) =>
      d &&
      (metin(d.id) === id ||
        metin(d._docId) === id ||
        (Array.isArray(d.kimlikler) && d.kimlikler.map(metin).includes(id)))
  );
  return metin(b && b.facultyId);
}

/** Bölüm ya da fakülte yetkilisi mi? (Üniversite yetkilisi ve admin değil.) */
function bolumVeyaFakulteYetkilisi(k) {
  if (!k || k.isUniversityAdmin || k.role === 'admin') return false;
  return k.role === 'bolum_yetkilisi' || !!k.isDeptManager || !!k.isFacultyManager;
}

/**
 * Ek bölümde görünen bölüm modülleri.
 * @param {object} kullanici oturum
 * @param {string} aktifBolum
 * @param {object[]} bolumler bölüm listesi (facultyId taşır)
 */
export function caprazModulleri(kullanici, aktifBolum, bolumler) {
  const l = CAPRAZ_MODULLER.slice();
  if (!bolumVeyaFakulteYetkilisi(kullanici)) return l;
  const kendi = bolumunFakultesi(bolumler, kullanici.departmentId) || metin(kullanici.facultyId);
  const aktif = bolumunFakultesi(bolumler, aktifBolum);
  // Fakülteler bilinmiyorsa kısıt konmaz (yanlışlıkla kendi fakültesinde gizlenmesin).
  if (!kendi || !aktif || kendi === aktif) return l;
  return l.filter((m) => m !== 'dersodalari');
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
