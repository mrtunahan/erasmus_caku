/**
 * BENİM SAYFAM — SAYFA DÜZENİ
 *
 * Sayfa üç sütundan ve iki açılır panelden oluşur:
 *
 *   SOL   · öğrenci bilgileri, takip edilen topluluklar
 *   ORTA  · akademik takvim, kampüs haritası
 *   SAĞ   · yaklaşan etkinlikler, hızlı bağlantılar, danışman bilgileri
 *   PANEL · "Derslerim" ve "Mezuniyet Durumum" — sütunların DIŞINDA, sayfanın
 *           ortasına gelen ayrı birer pencere.
 *
 * ⚠ Bu dosya çizim yapmaz; yalnız "hangi kart hangi sütunda" ve "hangi
 * genişlikte kaç sütun" sorularını yanıtlar. Düzen JSX'in içinde dağınık
 * duruyordu: bir kart yanlışlıkla iki sütuna da yazılırsa ya da bir kırılma
 * noktası ters çevrilirse bunu ancak ekranda fark ederdik. Burada testi var.
 */

/** Sütunlar ve içerdikleri kartlar — sıra ekrandaki sırayla aynıdır. */
export const SAYFA_SUTUNLARI = [
  {
    id: 'sol',
    etiket: 'Öğrenci',
    kartlar: ['profil', 'kisisel', 'topluluklar'],
  },
  {
    id: 'orta',
    etiket: 'Takvim ve kampüs',
    kartlar: ['takvim', 'harita'],
  },
  {
    id: 'sag',
    etiket: 'Etkinlik ve iletişim',
    kartlar: ['etkinlikler', 'baglantilar', 'danisman'],
  },
];

/** Sütunların dışında, açılır pencere olarak duran alanlar. */
export const SAYFA_PANELLERI = [
  { id: 'dersler', baslik: 'Derslerim', aciklama: 'Bu dönem aldığınız dersler' },
  {
    id: 'mezuniyet',
    baslik: 'Mezuniyet Durumum',
    aciklama: 'Transkript ve mezuniyet koşulları',
  },
  {
    id: 'yoklama',
    baslik: 'Dijital Yoklama',
    aciklama: 'Karekodu okutun, devamsızlığınızı görün',
  },
  {
    id: 'randevu',
    baslik: 'Randevu Al',
    aciklama: 'Akademisyenlerinizin görüşme saatleri',
  },
];

/* Kırılma noktaları: üç sütun ancak sütunların hepsi okunabilir kalırken
   gösterilir. 300 + 300 = 600 piksel yan sütunlara gidiyor; ortaya takvimin
   yedi gününü sıkıştırmadan çizecek kadar yer kalmalı. */
export const UC_SUTUN_ESIGI = 1180;
export const IKI_SUTUN_ESIGI = 760;

/** Ekran genişliğine düşen sütun sayısı (3 · 2 · 1). */
export function sutunSayisi(genislik) {
  const g = Number(genislik);
  if (!Number.isFinite(g)) return 3;
  if (g >= UC_SUTUN_ESIGI) return 3;
  if (g >= IKI_SUTUN_ESIGI) return 2;
  return 1;
}

/** CSS `grid-template-columns` değeri. */
export function sutunSablonu(genislik) {
  const n = sutunSayisi(genislik);
  if (n === 3) return '300px minmax(0, 1fr) 300px';
  if (n === 2) return '300px minmax(0, 1fr)';
  return '1fr';
}

/** Bir kartın hangi sütunda olduğu — bilinmiyorsa ''. */
export function kartinSutunu(kartId) {
  const k = String(kartId == null ? '' : kartId);
  const s = SAYFA_SUTUNLARI.find((x) => x.kartlar.includes(k));
  return s ? s.id : '';
}

function sayiMetni(n) {
  const x = Number(n);
  return Number.isFinite(x) ? String(x) : '0';
}

/**
 * Açılır panel düğmelerinin üzerinde yazacak özet.
 * Düğme yalnız bir ad taşırsa tıklamadan önce hiçbir şey bilinmez; sayı
 * burada üretilir ki panel açılmadan da durum görünsün.
 */
export function panelOzeti(panelId, veri) {
  const d = veri || {};
  if (panelId === 'dersler') {
    const ders = d.dersOzet || {};
    const sayi = Number(ders.sayi) || 0;
    if (sayi === 0) return 'Henüz ders seçilmedi';
    const akts = sayiMetni(ders.toplamAkts);
    const tavan = Number(ders.tavan);
    const tavanlı =
      Number.isFinite(tavan) && tavan > 0 ? akts + '/' + tavan + ' AKTS' : akts + ' AKTS';
    return sayi + ' ders · ' + tavanlı;
  }
  if (panelId === 'mezuniyet') return 'Transkript ve mezuniyet koşulları';
  if (panelId === 'yoklama') {
    const y = d.yoklama || {};
    // ⚠ Sınırı aşan ders varsa düğmede YAZAR: öğrenci paneli açmadan
    // devamsızlıktan kaldığını görmeli, tıklamayı beklememeli.
    const asan = Number(y.asan) || 0;
    if (asan > 0) return asan + ' derste sınır aşıldı';
    const riskli = Number(y.riskli) || 0;
    if (riskli > 0) return riskli + ' derste hak azaldı';
    if (Number(y.dersSayisi) > 0) return 'Devamsızlık durumunuz iyi';
    return 'Karekodu okutun';
  }
  if (panelId === 'randevu') {
    const r = d.randevu || {};
    const bekleyen = Number(r.bekleyen) || 0;
    if (bekleyen > 0) return bekleyen + ' talebiniz yanıt bekliyor';
    const onayli = Number(r.onayli) || 0;
    if (onayli > 0) return onayli + ' onaylı randevunuz var';
    return 'Görüşme saatlerine bakın';
  }
  return '';
}

/** Düğme şeridinin tamamı: panel tanımı + o anki özeti. */
export function panelDugmeleri(veri) {
  return SAYFA_PANELLERI.map((p) => ({ ...p, ozet: panelOzeti(p.id, veri) }));
}
