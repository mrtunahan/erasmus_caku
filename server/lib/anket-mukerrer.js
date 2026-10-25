// ══════════════════════════════════════════════════════════════
// ANKET YANITI — AYNI KİŞİ AYNI ANKETİ İKİ KEZ YANITLAYAMAZ
//
// "Zaten yanıtladınız" denetimi yalnız ekrandaydı: iki sekme, çift tıklama
// ya da /api/db/write'a doğrudan istek aynı kişinin ikinci yanıtını
// yazabiliyor, sonuçları şişiriyordu. Sunucu, yanıtlayanın kimliğiyle
// eşleşen bir yanıt varsa yenisini reddeder.
//
// Kimlik:
//   öğrenci  → studentNumber / _owner (ikisini de sunucu yazar)
//   personel → yanitlayanKimlik (sunucu damgası) ya da eski kayıtlarda
//              userId (profil kaydı id'si / ad), öğrenci yanıtları hariç
// Çok dersli ankette (lib/anket-ders-coklu.js → cokDersliMi; çağıran
// `dersBasina` ile bildirir) eşleşme DERS başınadır: aynı ders iki kez
// değerlendirilemez, başka ders değerlendirilebilir.
//
// Kimliği çözülemeyen eski biçimli kayıtlar (yalnız ad taşıyan öğrenci
// yanıtları) eşleşmez — yanlışlıkla engellemektense geçirmek tercih edildi.
// ══════════════════════════════════════════════════════════════

const metin = (v) => String(v == null ? '' : v).trim();

/** Ankette ders kodunun yazıldığı bilgi alanının anahtarı (yoksa ''). */
function dersKoduAlani(anket) {
  const alanlar = (anket && Array.isArray(anket.infoFields) && anket.infoFields) || [];
  const f = alanlar.find((x) => x && x.source === 'courseCode');
  return f ? metin(f.key) || 'dersKodu' : '';
}

/**
 * Var olan yanıtı bulacak Mongo sorgusu; kimlik çözülemezse null.
 *
 * @param {object} p
 * @param {object} p.user        JWT kullanıcısı ({role, identifier, studentNumber})
 * @param {object} p.data        yazılacak yanıt (sunucu damgaları uygulanmış)
 * @param {object} [p.anket]     anket kaydı (ders alanı için)
 * @param {string[]} [p.kimlikler] personelin profil kaydı id'leri
 * @param {boolean} [p.dersBasina] çok dersli anket: eşleşme ders başına
 */
function mukerrerSorgusu(p) {
  const o = p || {};
  const user = o.user || {};
  const data = o.data || {};
  const sid = metin(data.surveyId);
  if (!sid) return null;
  let kim;
  if (user.role === 'student') {
    const no = metin(data.studentNumber || user.studentNumber || user.identifier);
    if (!no) return null;
    kim = [{ studentNumber: no }, { _owner: no }];
  } else {
    const ident = metin(user.identifier);
    if (!ident) return null;
    const idler = [ident].concat((o.kimlikler || []).map(metin)).filter(Boolean);
    kim = [{ yanitlayanKimlik: ident }, { userId: { $in: idler }, role: { $ne: 'student' } }];
  }
  const sorgu = { surveyId: sid, $or: kim };
  const alan = o.dersBasina ? dersKoduAlani(o.anket) : '';
  if (alan) {
    const cevaplar = (data.answers && typeof data.answers === 'object' && data.answers) || {};
    const kod = metin(cevaplar[alan]);
    if (kod) sorgu['answers.' + alan] = kod;
  }
  return sorgu;
}

module.exports = { mukerrerSorgusu, dersKoduAlani };
