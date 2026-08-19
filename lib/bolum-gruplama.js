// ══════════════════════════════════════════════════════════════
// BÖLÜM SEÇİCİYİ FAKÜLTEYE GÖRE GRUPLA
//
// Üniversitede 57 bölüm var. Bölüm seçme listeleri bunları düz sıralıyordu:
// kullanıcı aradığı bölümü bulmak için tüm listeyi taramak zorunda kalıyor,
// üstelik benzer adlar (İnşaat / İnşaat Mühendisliği, Yönetim ve Organizasyon
// — iki ayrı yüksekokulda) hangisinin hangisi olduğunu belli etmiyor.
// Fakülte başlığı hem listeyi kısaltıyor hem de bu ayrımı görünür kılıyor.
//
// ── FAKÜLTE ADLARI SONRADAN GELİR ──
// Adlar ayrı bir okumayla yükleniyor; gelmeden önce hiçbir kimlik
// çözülemiyor. O anda her şeyi "Diğer" başlığı altına toplamak listeyi
// bozuk gösterirdi. Bunun yerine çözülemeyen bölümler kimliksiz TEK bir
// gruba düşer ve arayüz o durumda başlık YAZMAZ: liste yükleme sırasında
// eskisi gibi düz görünür, adlar gelince kendiliğinden gruplanır.
// ══════════════════════════════════════════════════════════════

const trSirala = (a, b) => String(a || '').localeCompare(String(b || ''), 'tr-TR');

/**
 * @param {Array}  bolumler      window.DEPARTMENTS biçimi: { id, name, facultyId }
 * @param {Object} fakulteAdlari { fakulteId: ad } — window.useFakulteAdlari()
 * @param {Object} [secenekler]  { haric: kimlik | kimlik[] } listeden çıkarılacak bölüm(ler)
 * @returns {Array<{id:string, ad:string, bolumler:Array}>}
 *   Fakülteler ada göre sıralı; çözülemeyenler kimliksiz grupta ve EN SONDA.
 */
export function bolumleriFakulteyeGrupla(bolumler, fakulteAdlari, secenekler) {
  const adlar = fakulteAdlari || {};
  const haricListe = (secenekler && secenekler.haric) || [];
  const haric = new Set(
    (Array.isArray(haricListe) ? haricListe : [haricListe]).filter(Boolean).map(String)
  );

  const gruplar = new Map(); // fakülte kimliği ('' = çözülemedi) → bölümler
  (bolumler || []).forEach((d) => {
    if (!d || !d.id) return;
    if (haric.has(String(d.id))) return;
    const fakId = String(d.facultyId || '');
    // Adı bilinmeyen fakülte, fakültesi hiç olmayan bölümle aynı kefeye
    // konur: ikisi de kullanıcıya anlamlı bir başlık veremez.
    const anahtar = adlar[fakId] ? fakId : '';
    if (!gruplar.has(anahtar)) gruplar.set(anahtar, []);
    gruplar.get(anahtar).push(d);
  });

  const cikti = [...gruplar.entries()]
    .filter(([id]) => id)
    .map(([id, liste]) => ({
      id,
      ad: adlar[id],
      bolumler: liste.slice().sort((a, b) => trSirala(a.name, b.name)),
    }))
    .sort((a, b) => trSirala(a.ad, b.ad));

  const cozulemeyen = gruplar.get('');
  if (cozulemeyen && cozulemeyen.length) {
    cikti.push({
      id: '',
      ad: 'Diğer',
      bolumler: cozulemeyen.slice().sort((a, b) => trSirala(a.name, b.name)),
    });
  }
  return cikti;
}

/**
 * Başlık yazılmalı mı? Fakülte adları henüz yüklenmediyse tek bir kimliksiz
 * grup oluşur; ona "Diğer" başlığı koymak listeyi bozuk gösterir.
 */
export function baslikGosterilsinMi(gruplar) {
  const g = gruplar || [];
  if (g.length === 0) return false;
  return !(g.length === 1 && !g[0].id);
}
