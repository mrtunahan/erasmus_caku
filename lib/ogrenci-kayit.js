// ══════════════════════════════════════════════════════════════
// ÖĞRENCİ KAYDI EKLEME — MÜKERRER NUMARA VE BÖLÜM
//
// `students.studentNumber` üzerinde BENZERSİZ indeks var
// (server/config/database.js). İkinci kayıt veritabanı düzeyinde reddedilir.
//
// ⚠ BU DOSYA İKİ HATADAN DOĞDU:
//
// 1) Kullanıcı Yönetimi'ndeki "Yeni Öğrenci" formu `departmentId` HİÇ
//    yazmıyordu. Kaydedilen öğrenci veritabanına giriyor ama hiçbir bölümün
//    listesine düşmüyordu (listeler bölüme göre süzülür). Yetkiliye "ekledim,
//    silindi" gibi görünüyordu.
//
// 2) Aynı numarayla ikinci deneme benzersiz indekse takılıyor, sunucu bunu
//    genel "Yazma sırasında bir hata oluştu" metnine çeviriyordu. Var olan
//    kayıt listede görünmediği (bölümsüz ya da başka bölümde) için yetkili
//    "kayıt yok ama eklettirmiyor" duvarına çarpıyordu.
//
// Çözüm: eklemeden ÖNCE numara tüm kayıtlarda aranır; varsa silmek/zorlamak
// yerine TAŞIMA teklif edilir.
// ══════════════════════════════════════════════════════════════

/** Öğrenci numarasını karşılaştırma anahtarına çevirir (boşluk toleranslı). */
export function numaraAnahtari(no) {
  return String(no == null ? '' : no).trim();
}

/**
 * Bu numarayla kayıtlı öğrenci — bölümü ne olursa olsun.
 * Bölümsüz ("kayıp") kayıtlar da bulunur; asıl amaç odur.
 */
export function ayniNumarali(kayitlar, no) {
  const anahtar = numaraAnahtari(no);
  if (!anahtar) return null;
  const liste = Array.isArray(kayitlar) ? kayitlar : [];
  return liste.find((s) => s && numaraAnahtari(s.studentNumber) === anahtar) || null;
}

/**
 * Var olan kaydı formdaki bilgilerle günceller.
 * Formda olmayan alanlar (ÇAP bölümleri, Erasmus eşleştirmeleri, transkript
 * atıfları) KORUNUR — taşıma bir yeniden-oluşturma değildir.
 */
export function kayitBirlestir(mevcut, form) {
  const m = mevcut || {};
  const f = form || {};
  const birlesik = { ...m };
  Object.keys(f).forEach((alan) => {
    const deger = f[alan];
    if (deger === undefined || deger === null) return;
    if (typeof deger === 'string' && deger.trim() === '') return;
    if (Array.isArray(deger) && deger.length === 0) return;
    birlesik[alan] = deger;
  });
  birlesik.id = m.id || m._docId || f.id;
  return birlesik;
}

/**
 * Kayıt yapılabilir mi, önce ne sorulmalı?
 * @returns {{durum:'eksik_no'|'eksik_bolum'|'tasima'|'yeni', mevcut?:object}}
 */
export function kayitKarari(kayitlar, form) {
  const f = form || {};
  if (!numaraAnahtari(f.studentNumber)) return { durum: 'eksik_no' };
  // Bölümsüz kayıt hiçbir listede görünmez — bilerek engelleniyor.
  if (!String(f.departmentId || '').trim()) return { durum: 'eksik_bolum' };
  const mevcut = ayniNumarali(kayitlar, f.studentNumber);
  if (mevcut) return { durum: 'tasima', mevcut };
  return { durum: 'yeni' };
}
