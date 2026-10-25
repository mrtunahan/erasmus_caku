// ══════════════════════════════════════════════════════════════
// ANKET KATILIMCISI — KİM HANGİ ROLLE YANITLAR, HANGİ YANIT ONUN?
//
// ⚠ İKİ HATA VARDI:
//   1) Katılımcı rolü doğrudan `currentUser.role` idi. Fakülte/üniversite
//      yetkilisi ('admin'), bölüm yetkilisi ('bolum_yetkilisi') ve memur da
//      birer akademisyendir (baseRole 'professor') ama "akademisyenlere"
//      paylaşılan anket onlara hiç ulaşmıyordu.
//   2) "Zaten yanıtladım" denetimi `userId === myId` idi; öğrencide myId ADDIR.
//      Aynı adlı iki öğrenciden biri yanıtlayınca öteki için anket
//      "yanıtlandı" görünüyordu. Yanıt numara taşıyorsa numaraya bakılır.
// ══════════════════════════════════════════════════════════════

const metin = (v) => String(v == null ? '' : v).trim();

/** Atamalarla eşleşen rol: 'student' | 'professor' | (başka rol olduğu gibi). */
export function katilimciRolu(user) {
  const u = user || {};
  if (u.role === 'student') return 'student';
  if (u.baseRole === 'professor') return 'professor';
  return u.role;
}

/** Yetkili ekranında "Bana gelen anketler" sekmesi gösterilsin mi? */
export function yoneticiKatilimciMi(user) {
  const u = user || {};
  return u.role !== 'student' && u.role !== 'professor' && u.baseRole === 'professor';
}

/**
 * Kullanıcının "benim" sayacağı kimlik (yanıtın `userId`'si).
 * Öğrencide ad, akademisyende profil kaydı id'si (yoksa ad).
 */
export function katilimciKimligi(user) {
  const u = user || {};
  return u.id || u._id || u.identifier || u.name || 'anon';
}

/** Bu yanıt kullanıcının kendisine mi ait? */
export function yanitBenimMi(yanit, user) {
  const r = yanit || {};
  const u = user || {};
  if (u.role === 'student') {
    const benim = new Set(
      [u.studentNumber]
        .concat(Array.isArray(u.bagliOgrenciNolar) ? u.bagliOgrenciNolar : [])
        .map(metin)
        .filter(Boolean)
    );
    const no = metin(r.studentNumber) || metin(r._owner);
    if (no) return benim.has(no);
  } else if (metin(r.yanitlayanKimlik)) {
    // Personel yanıtına sunucu giriş kimliğini (ad) damgalar.
    const ad = metin(u.identifier || u.name);
    if (ad && metin(r.yanitlayanKimlik) === ad) return true;
  }
  const id = katilimciKimligi(u);
  if (id === 'anon') return false;
  return metin(r.userId) === metin(id);
}
