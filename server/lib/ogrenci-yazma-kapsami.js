// ══════════════════════════════════════════════════════════════
// ÖĞRENCİNİN YAZABİLECEĞİ KOLEKSİYONLAR
//
// Bu liste bir İZİN listesidir: burada olmayan koleksiyona öğrenci rolü
// yazamaz, güncelleyemez, SİLEMEZ. Rotanın içinde duruyordu; kendi dosyasına
// alındı ki ne içerdiği (ve neyi kasten içermediği) testle kilitlensin.
//
// ⚠ NİÇİN AYRILDI: Erasmus eşleştirme geçmişi öğrenciye akademisyendeki gibi
// açılırken "peki silemediğinden emin miyiz?" sorusunun cevabı kaynak koda
// bakmaktı. Artık test cevaplıyor (tests/ogrenci-yazma-kapsami.test.js).
//
// ⚠ BURAYA KOLEKSİYON EKLEMEK, o koleksiyonu öğrencinin SİLMESİNE de açar.
// Sahiplik ayrıca denetlenir (routes/db.js → öğrenci sahiplik kuralları) ama
// bu liste ilk kapıdır.
// ══════════════════════════════════════════════════════════════

const STUDENT_WRITABLE = new Set([
  'survey_responses',
  'internship_applications',
  'internship_uploads',
  'internship_notifications',
  'internship_roadmap',
  'muafiyet_records',
  'portal_posts',
  'portal_posts_comments',
  'portal_profiles',
  'portal_follows',
  'portal_reports',
  'portal_notifications',
  'portal_notifications_items',
  'portal_moderators',
  'student_notifications',
  'forms',
  'course_groups',
  'course_group_posts',
  'student_clubs',
  'club_documents',
  'club_followers',
  'club_posts',
  // Öğrenci ankette oy verir / etkinliğe katılım işaretler.
  'club_post_votes',
  'student_profiles',
  'projects',
  'unides_projects',
  'tubitak2209_projects',
  // Öğrencinin dönem bazlı aldığı dersler (kendi kaydı, per (öğrenci, dönem))
  'student_courses',
  // ÇAP/Yandal başvurusu — öğrenci kendi başvurusunu oluşturur/günceller.
  'cap_yandal_basvurular',
  // Yatay geçiş başvurusu — öğrenci kendi başvurusunu oluşturur/günceller.
  'yatay_gecis_basvurular',
  // Transkriptten türetilen akademik kayıt — öğrenci kendi transkriptini
  // yükler, sonuç kendi kaydına yazılır (docId = öğrenci no).
  'ogrenci_akademik_kayit',
  // Randevu talebi — öğrenci kendi talebini açar/iptal eder. Onay/ret
  // yetkisi YOKTUR; kural aşağıda (a2a-3).
  'randevu_talepleri',
]);

/** Öğrenci bu koleksiyona yazabilir mi? */
function ogrenciYazabilir(koleksiyon) {
  return STUDENT_WRITABLE.has(String(koleksiyon || ''));
}

module.exports = { STUDENT_WRITABLE, ogrenciYazabilir };
