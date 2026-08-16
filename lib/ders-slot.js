// ══════════════════════════════════════════════════════════════
// DERS PROGRAMI — BÖLÜNMÜŞ HÜCRENİN ÇIKTIYA BİRLEŞTİRİLMESİ
//
// Bir slotta iki ders yürüyebilir ("hücre bölme"): KML312 ile TLK543 gibi
// eşdeğer sayılan iki ders aynı saatte, aynı hücrede durur. Ekrandaki tablo
// iki dersi alt alta ayrı ayrı gösterir; YAZDIRMA/PDF çıktısı ve fakülte
// birleşik görünümü ise hücreyi TEK karta indirger.
//
// ⚠ Bu indirgeme, bölmenin "aynı hocanın iki dersi" olduğu varsayımıyla
// yazılmıştı ve ikinci dersin hocasını sessizce düşürüyordu: iki FARKLI
// hocanın dersi bölündüğünde çıktıda yalnız birinci hoca görünüyor, ikinci
// hoca hiç yazılmıyordu. Bölme kısıtı yalnız SAAT üzerinedir — hoca ve ders
// adı pekâlâ farklı olabilir.
//
// Kural: her alan için iki değer de yazılır, ama TEKRAR YAZILMAZ. Aynı olan
// (iki dersin ortak hocası, ortak dersliği) bir kez görünür; farklı olan
// "A / B" biçiminde yan yana. Ders kodlarının sırası ile hoca adlarının
// sırası aynıdır, okuyan eşleştirebilir.
// ══════════════════════════════════════════════════════════════

/** İki değeri tekrarsız birleştirir: 'A' + 'A' → 'A', 'A' + 'B' → 'A / B'. */
function birlesik(a, b) {
  const liste = [];
  [a, b].forEach((v) => {
    const t = String(v == null ? '' : v).trim();
    if (t && !liste.includes(t)) liste.push(t);
  });
  return liste.join(' / ');
}

/**
 * Bölünmüş hücreyi çıktı/görünüm için tek karta indirger.
 *
 * @param {object} slot ders programı slotu (varsa `ikinci` alt dersiyle)
 * @param {object} [ek] karta eklenecek bağlam (deptName, year gibi)
 * @returns {object} { courseCode, courseName, instructor, classroom, sinif }
 */
export function slotBirlestir(slot, ek) {
  const s = slot || {};
  const ik = s.ikinci && s.ikinci.courseCode ? s.ikinci : null;
  return {
    courseCode: birlesik(s.courseCode, ik && ik.courseCode),
    courseName: birlesik(s.courseName, ik && ik.courseName),
    // İkinci dersin hocası/dersliği kendi alanında boşsa birincininkini
    // paylaşıyor demektir; tekrarsız birleştirme bunu zaten tek kez yazar.
    instructor: birlesik(s.instructor, ik && ik.instructor),
    classroom: birlesik(s.classroom, ik && ik.classroom),
    sinif: s.sinif,
    ...(ek || {}),
  };
}
