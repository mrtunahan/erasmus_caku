// ══════════════════════════════════════════════════════════════
// DUYURU SAHİPLİĞİ — kim düzenleyebilir, kim silebilir
//
// Kapsam (kim KİME duyuru yapabilir) lib/yayin-kapsami.js'te. Bu dosya ikinci
// bir soruyu yanıtlıyor: bir duyuruyu kim DEĞİŞTİREBİLİR?
//
// ── KAPSAM YETKİSİ, SAHİPLİK DEĞİLDİR ──
// Eskiden yönetim listesindeki her duyuru düzenlenebilir ve silinebilirdi;
// tek koşul duyurunun kapsamınıza değmesiydi. Yani üniversite yetkilisi her
// duyuruyu, fakülte yetkilisi de kendi fakültesindeki herkesin duyurusunu
// değiştirebiliyordu. Bir bölüm yetkilisinin yazdığı duyuruyu başkasının
// sessizce düzenlemesi ya da silmesi, duyurunun altındaki imzayı anlamsız
// kılar.
//
// Kural: DÜZENLEME VE SİLME YALNIZ YAZANDA. Kapsam yetkisi görmeyi ve yeni
// duyuru yazmayı verir, başkasının kaydına dokunmayı değil.
//
// ── ESKİ KAYITLAR ──
// Sahip alanı eklenmeden önce yazılmış duyurularda `olusturanId` yok. Bunları
// "sahipsiz" sayıp herkese açmak, düzeltmeye çalıştığımız şeyi geri getirirdi;
// kimseye kapatmak ise kimsenin silemediği ölü kayıtlar bırakırdı. Ortası:
// sahipsiz kayda yalnız ÜNİVERSİTE yetkilisi dokunabilir — kaydı düzenleyip
// kaydettiğinde sahiplik damgası oluşur ve kayıt normal kurala döner.
// ══════════════════════════════════════════════════════════════

import { adAnahtari } from './ders-listesi-ice-aktar.js';

/** Kullanıcının duyuru kayıtlarındaki kimliği. */
export function duyuruKimligi(user) {
  const u = user || {};
  return String(u.identifier || u.name || '').trim();
}

/** Karşılaştırma anahtarı — unvan ve büyük/küçük harf farkına takılmaz. */
export function kimlikAnahtari(deger) {
  return adAnahtari(deger);
}

/** Yeni/güncellenen kayda yazılacak sahiplik damgası. */
export function sahiplikDamgasi(user) {
  const u = user || {};
  return {
    olusturanId: duyuruKimligi(u),
    olusturanAd: String(u.name || u.identifier || '').trim(),
    olusturanRol: String(u.role || ''),
  };
}

/** Duyurunun sahibi var mı (eski kayıtta yok)? */
export function sahipliMi(d) {
  return !!kimlikAnahtari((d || {}).olusturanId);
}

/** Bu kullanıcı duyurunun sahibi mi? */
export function sahibiMi(d, user) {
  const sahip = kimlikAnahtari((d || {}).olusturanId);
  const ben = kimlikAnahtari(duyuruKimligi(user));
  return !!sahip && !!ben && sahip === ben;
}

/**
 * Düzenleme/silme izni.
 *
 * @param d     duyuru kaydı
 * @param user  {identifier|name, role, isUniversityAdmin}
 */
export function duyuruDuzenlenebilirMi(d, user) {
  if (!d || !user) return false;
  if (sahibiMi(d, user)) return true;
  // Sahipsiz (eski) kayıt: yalnız üniversite yetkilisi devralabilir.
  if (!sahipliMi(d)) return !!(user.isUniversityAdmin || user.role === 'admin');
  return false;
}

/** İzin verilmediğinde kullanıcıya söylenecek sebep. */
export function duzenlemeEngeli(d, user) {
  if (duyuruDuzenlenebilirMi(d, user)) return '';
  const ad = String((d || {}).olusturanAd || '').trim();
  return ad
    ? 'Bu duyuruyu ' + ad + ' yayınladı; düzenleme ve silme yalnız yayınlayandadır.'
    : 'Bu duyuruyu başka bir yetkili yayınladı; düzenleme ve silme yalnız yayınlayandadır.';
}
