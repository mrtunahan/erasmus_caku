// ══════════════════════════════════════════════════════════════
// YETKİ SORULARI — TEK TANIM
//
// "Bu kullanıcı üniversite yetkilisi mi?" sorusunun cevabı göründüğünden
// zordur ve yanlış cevaplamak yetkiyi sessizce genişletir.
//
// ── ROLE BAKMAK YETMEZ ──
// Giriş sırasında fakülte yetkilisi de 'admin' rolüne YÜKSELTİLİR
// (shared-components.jsx → attachProfile: `hierMgr ? 'admin' : …`), çünkü
// modüller düzenleme/silme iznini `role === 'admin'` ile veriyor. Yani
// `role === 'admin'` kontrolü fakülte yetkilisini de üniversite yetkilisi
// sayar — ayırt eden alan `isUniversityAdmin` bayrağıdır.
//
// ── ESKİ ADMİN GİRİŞİ ──
// Bayraksız (eski) admin oturumu da üniversite düzeyindedir ama profil
// bayrağı taşımaz. Onu ayıran işaret `baseRole`: akademisyen girişinden
// yükselen her yönetici `baseRole: 'professor'` taşır, eski admin taşımaz.
// ══════════════════════════════════════════════════════════════

/**
 * Kullanıcı üniversite düzeyinde yetkili mi?
 * Fakülte ve bölüm yetkilileri için FALSE döner.
 */
export function universiteYetkilisiMi(user) {
  const u = user || {};
  if (u.isUniversityAdmin) return true;
  return u.role === 'admin' && !u.baseRole;
}
