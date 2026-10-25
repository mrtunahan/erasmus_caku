// ══════════════════════════════════════════════════════════════
// ANKET YANITI — YANITLAYAN HEDEF KİTLEDE Mİ, PAYLAŞIMI AÇIK MI?
//
// ⚠ İKİ AÇIK VARDI (ikisi de yalnız ekranda denetleniyordu):
//   1) Hedef kitle: sunucu yanıtlayanın anketin paylaşıldığı rol/bölüm/
//      gruptan olup olmadığına bakmıyordu; /api/db/write'a doğrudan istekle
//      kendisine paylaşılmamış bir anket yanıtlanabiliyordu.
//   2) Süre: "süresi doldu" anket GENELİNDE hesaplanıyordu. Bir grubun süresi
//      dolmuş, başka grubunki açıksa süresi dolan gruptaki kişi de
//      yanıtlayabiliyordu.
//
// Kural: kişiye UYAN paylaşımlardan en az biri AÇIK olmalı. Hiç paylaşılmamış
// anket yanıt almaz. Ekranla aynı yardımcılar kullanılır (yayin-kapsami,
// ogrenci-sinif, anket-hedef-kitle, anket-yayin). Sınıf ve unvan gibi birden
// fazla kaynaktan çözülebilen bilgilerde sunucu GENİŞ tarafta kalır: ekranın
// gösterdiği bir anketi sunucunun reddetmesi, kişiyi sebepsiz kilitlerdi.
// ══════════════════════════════════════════════════════════════

import { yayinKapsamdaMi } from './yayin-kapsami.js';
import { sinifGrubunaUyarMi } from './ogrenci-sinif.js';
import { akademisyenGrubaUyarMi } from './anket-hedef-kitle.js';
import { atamaAcikMi } from './anket-yayin.js';

const metin = (v) => String(v == null ? '' : v).trim();

/** Kişi mezun mu? (ekrandaki isAlumni ile aynı alanlar) */
export function mezunMu(kisi) {
  const k = kisi || {};
  return !!(k.isAlumni || k.mezun || k.status === 'mezun');
}

/**
 * Paylaşım bu kişiye uyuyor mu? (rol + kapsam + grup; süre hariç)
 *
 * @param {object} atama  survey_assignments kaydı
 * @param {object} kisi   { rol:'student'|'professor', departmentId,
 *                          additionalDepartments, isAlumni…, studentNumber,
 *                          sinif…, title/name }
 * @param {object} [secenek] { kisiler: [ek kayıtlar] } — sınıf/unvan için
 *        başka kaynaklar (ör. oturum adı); BİRİ uyarsa yeter
 */
export function atamaKisiyeUyarMi(atama, kisi, secenek) {
  const a = atama || {};
  const k = kisi || {};
  const rol = a.targetRole === 'alumni' ? 'student' : metin(a.targetRole);
  const grup = a.targetRole === 'alumni' ? 'Mezun' : metin(a.targetGroup);
  if (!rol || rol !== metin(k.rol)) return false;
  if (!yayinKapsamdaMi(a, k)) return false;
  const kaynaklar = [k].concat((secenek && secenek.kisiler) || []).filter(Boolean);
  if (rol !== 'student') {
    return kaynaklar.some((x) => akademisyenGrubaUyarMi(x, grup).uyar);
  }
  if (!grup || grup === 'Tüm öğrenciler') return true;
  const mezun = kaynaklar.some(mezunMu);
  if (grup === 'Mezun') return mezun;
  if (mezun) return false;
  return kaynaklar.some((x) => sinifGrubunaUyarMi(x, grup).uyar);
}

/**
 * Yanıt kararı.
 * @returns {{izin:boolean, hata?:string}}
 */
export function yanitHedefKarari(anket, atamalar, kisi, secenek) {
  if (anket && anket.pasif === true) return { izin: false, hata: 'Bu anket yayından kaldırıldı.' };
  const liste = Array.isArray(atamalar) ? atamalar : [];
  if (liste.length === 0) return { izin: false, hata: 'Bu anket henüz paylaşılmadı.' };
  const uyan = liste.filter((a) => atamaKisiyeUyarMi(a, kisi, secenek));
  if (uyan.length === 0) return { izin: false, hata: 'Bu anket size paylaşılmadı.' };
  const bugun = secenek && secenek.bugun;
  if (!uyan.some((a) => atamaAcikMi(a, anket, bugun))) {
    return { izin: false, hata: 'Bu anketin süresi doldu.' };
  }
  return { izin: true };
}
