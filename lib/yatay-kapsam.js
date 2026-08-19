// ══════════════════════════════════════════════════════════════
// YATAY GEÇİŞ BAŞVURUSU HANGİ BÖLÜMÜNDÜR?
//
// Başvuruyu DEĞERLENDİREN taraf, adayın gelmek istediği bölümdür: kontenjanı
// o ilan eder, taban sıralama ölçütünü o koyar, raporu o üretir. Modülün
// geri kalanı zaten `activeDepartment` ile çalışır — yani "başvurulan bölüm".
//
// ── ESKİ DAVRANIŞ VE ARIZASI ──
// Kayıt açılırken bölüm, FORMU DOLDURANIN bölümünden yazılıyordu:
//     departmentId: currentUser?.departmentId || ''
// İki türlü yanlış:
//   • Aday kurum dışından geliyorsa (ya da kaydı fakülte/üniversite düzeyinde
//     bir personel vekâleten açtıysa) o kişinin bölümü YOKTUR → alan boş
//     kalır.
//   • Kurum içi geçişte öğrencinin MEVCUT bölümü yazılır; oysa başvuruyu
//     gelmek istediği bölüm değerlendirir.
//
// Listeleme tarafındaki kural ise boş bölümü "herkese göster" sayıyordu:
//     !r.departmentId || r.departmentId === activeDepartment
// Sonuç: bölümü boş kalan başvurular ÜNİVERSİTEDEKİ HER BÖLÜMÜN listesinde
// ve sayacında görünüyordu — başka bölümün adayı kendi adayınız sanılıyordu.
//
// ── YENİ KURAL ──
// Sahip bölüm sırayla şuradan çözülür:
//   1) `basvurduguBolumId` — yeni kayıtlarda seçim anında yazılır
//   2) `departmentId`      — eski kayıtlar
//   3) `basvurduguBolum`   — bölüm ADINDAN çözülür (eski kayıtlar için ağ)
// Hiçbiri çözülemezse başvuru SAHİPSİZDİR: her bölümde değil, HİÇBİR bölümde
// listelenmez; ayrıca sahipsiz olduğu bildirilir ki yetkili düzeltebilsin.
// "Her bölümde göster" seçeneği yanlış bölüme yanlış aday göstermektir.
// ══════════════════════════════════════════════════════════════

import { programAnahtari } from './taban-puan.js';

/**
 * Bir başvurunun ait olduğu bölüm kimliği.
 *
 * @param {Object} kayit  yatay_gecis_basvurular dokümanı
 * @param {Array}  bolumler [{ id, _docId, name }] — ad→kimlik çözümü için
 * @returns {string} bölüm kimliği; çözülemezse ''
 */
export function basvuruBolumId(kayit, bolumler) {
  const k = kayit || {};
  if (k.basvurduguBolumId) return String(k.basvurduguBolumId);
  if (k.departmentId) return String(k.departmentId);
  const hedef = programAnahtari(k.basvurduguBolum || '');
  if (!hedef) return '';
  // Ad eşleşmesi BİREBİR olmalı. programAnahtari "bölüm/program" eklerini
  // atıp Türkçe harfleri sadeleştirir; yine de kapsama (substring) eşleşmesi
  // denenmez — "Makine" hem "Makine Mühendisliği" hem "Makine ve İmalat"
  // içinde geçer ve yanlış bölüme aday düşürmek, hiç düşürmemekten kötüdür.
  const eslesen = (bolumler || []).filter((b) => b && programAnahtari(b.name) === hedef);
  return eslesen.length === 1 ? String(eslesen[0].id || eslesen[0]._docId || '') : '';
}

/**
 * Başvuru, verilen bölümün listesinde görünmeli mi?
 * Sahipsiz kayıt hiçbir bölümde görünmez (bkz. dosya başı).
 */
export function basvuruBolumdeMi(kayit, bolumId, bolumler) {
  if (!bolumId) return true; // bölüm seçili değil (üniversite geneli görünüm)
  const sahip = basvuruBolumId(kayit, bolumler);
  return !!sahip && sahip === String(bolumId);
}

/** Sahibi çözülemeyen başvurular — yetkiliye "şunları düzeltin" demek için. */
export function sahipsizBasvurular(kayitlar, bolumler) {
  return (kayitlar || []).filter((k) => !basvuruBolumId(k, bolumler));
}
