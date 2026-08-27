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

/**
 * Öğrencinin erişebileceği bölümler: ana bölüm + ek bölümler.
 * Ana bölüm her zaman başta durur (varsayılan aktif bölüm odur).
 */
export function ogrenciBolumleri(kullanici) {
  const ana = metin(kullanici && kullanici.departmentId);
  const liste = ana ? [ana] : [];
  ekBolumler(kullanici).forEach((d) => {
    if (!liste.includes(d)) liste.push(d);
  });
  return liste;
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
