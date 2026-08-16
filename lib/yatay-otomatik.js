// ══════════════════════════════════════════════════════════════
// YATAY GEÇİŞ — DEĞERLENDİRMENİN OTOMATİK DOLDURULMASI
//
// Akademisyen değerlendirme aşamasında elle üç şey yazıyordu: programın taban
// puanı, asil/yedek sınıf–sıra ve Ek Madde-1 tespiti. Üçünün de kaynağı
// zaten sistemde: taban puan kütüphanede (adayın YKS yerleşme yılına göre),
// sıra diğer adayların puanlarında, Ek Madde-1 geçmişi ise adayın beyanında
// ve kurumun kendi başvuru kayıtlarında.
//
// Bu modül "ne yazılacağını" hesaplar; YAZMA kararı çağırana aittir ve iki
// kural hiç çiğnenmez:
//   1) İNSANIN YAZDIĞI DEĞER KAZANIR. Otomatik doldurma yalnız BOŞ alana
//      dokunur; personelin verdiği bir kararı hiçbir koşulda ezmez.
//   2) DEĞERİN NEREDEN GELDİĞİ SAKLANIR (`kaynak`). "Belgeden doğrulandı" ile
//      "sistem kaydından çıkarıldı" aynı şey değildir; ekran ve belge bunu
//      ayırt edebilmeli, yoksa kimsenin bakmadığı bir alan denetlenmiş gibi
//      görünür.
// ══════════════════════════════════════════════════════════════

/** Kabul edilmiş sayılan sonuçlar — önceki Ek Madde-1 geçişinin kanıtı. */
const KABUL_SONUCLARI = new Set(['uygun_asil']);

function metin(v) {
  return String(v == null ? '' : v).trim();
}

/**
 * Ek Madde-1 tespitinin sistemdeki karşılığı.
 *
 * İki kaynak vardır, güçlüden zayıfa:
 *   1) KURUMUN KENDİ KAYDI — aynı öğrenci numarasıyla daha önce yapılmış ve
 *      ASİL sonuçlanmış bir merkezi yerleştirme (Ek Madde-1) başvurusu.
 *      Bu bir beyan değil, kurumun kendi işlemidir.
 *   2) ADAYIN BEYANI — başvuru formunda "daha önce yaptım/yapmadım".
 *
 * Sonradan yapılmış bir başvuru, önceki bir geçişin kanıtı olamaz: iki kaydın
 * da tarihi biliniyorsa yalnız DAHA ESKİ olan sayılır.
 *
 * @returns {{deger:''|'var'|'yok', kaynak:''|'sistem_kaydi'|'beyan', gerekce:string}}
 */
export function ekMadde1Otomatik(kayit, gecmis) {
  const bos = { deger: '', kaynak: '', gerekce: '' };
  if (!kayit) return bos;
  const no = metin(kayit.ogrenciNo);
  const buId = metin(kayit.id || kayit._docId);
  const buTarih = metin(kayit.createdAt);

  if (no) {
    const onceki = (gecmis || []).find((r) => {
      if (!r) return false;
      if (metin(r.id || r._docId) === buId) return false;
      if (metin(r.ogrenciNo) !== no) return false;
      if (metin(r.turu) !== 'merkezi') return false;
      if (!KABUL_SONUCLARI.has(metin(r.degerlendirme))) return false;
      const oTarih = metin(r.createdAt);
      if (buTarih && oTarih && oTarih >= buTarih) return false;
      return true;
    });
    if (onceki) {
      return {
        deger: 'var',
        kaynak: 'sistem_kaydi',
        gerekce:
          'Sistemde bu öğrenci numarasına ait, asil sonuçlanmış önceki bir merkezi ' +
          'yerleştirme (Ek Madde-1) başvurusu var' +
          (metin(onceki.createdAt) ? ' (' + metin(onceki.createdAt).slice(0, 10) + ')' : '') +
          '.',
      };
    }
  }

  const beyan = metin(kayit.oncekiEkMadde1Gecisi);
  if (beyan === 'evet') {
    return { deger: 'var', kaynak: 'beyan', gerekce: 'Aday “daha önce yaptım” beyan etti.' };
  }
  if (beyan === 'hayir') {
    return {
      deger: 'yok',
      kaynak: 'beyan',
      gerekce: 'Aday “daha önce yapmadım” beyan etti; sistemde aksini gösteren kayıt yok.',
    };
  }
  return bos;
}

/**
 * Otomatik Ek Madde-1 değerini kritere yansıtır (KAYDA yazmadan).
 * Kayıtta personelin verdiği bir karar varsa ona dokunulmaz.
 * Kart ile liste aynı sayıya bakmalı: eleme kararını değiştiren bir değer,
 * ekranda gösterilmeden önce kritere de girmelidir.
 */
export function ekMadde1Uygula(kayit, oto) {
  if (!kayit || !oto || !oto.deger) return kayit;
  if (metin(kayit.ekMadde1Dogrulama)) return kayit;
  return { ...kayit, ekMadde1Dogrulama: oto.deger };
}

/**
 * Bir başvuru için otomatik yazılabilecek alanlar.
 *
 * @param {object} kayit  başvurunun KAYITTAKİ hâli (çözülmüş kopya değil)
 * @param {object} oneri  asilYedekOner çıktısındaki satır (varsa)
 * @param {object} secenek { ekMadde1Oto, siralama:boolean, ekMadde1:boolean }
 * @returns {{patch:object, notlar:string[]}} patch boşsa yazılacak bir şey yok
 */
export function otomatikYazim(kayit, oneri, secenek) {
  const s = secenek || {};
  const patch = {};
  const notlar = [];
  if (!kayit) return { patch, notlar };

  // ── Asil/yedek sınıf ve sıra ──
  // Yalnız HİÇ değerlendirilmemiş kayda yazılır. Personelin verdiği bir sonuç
  // (EKSİK BELGE dâhil) varsa dokunulmaz — sıralama insanın kararını ezemez.
  if (s.siralama && oneri && metin(oneri.degerlendirme) && !metin(kayit.degerlendirme)) {
    patch.degerlendirme = oneri.degerlendirme;
    patch.degerlendirmeSinif = oneri.degerlendirmeSinif || '';
    patch.degerlendirmeSira = oneri.degerlendirmeSira || '';
    patch.degerlendirmeSebebi = oneri.sebep || '';
    patch.degerlendirmeKaynak = 'otomatik';
    notlar.push('siralama');
  }

  // ── Ek Madde-1 tespiti ──
  const oto = s.ekMadde1Oto;
  if (
    s.ekMadde1 &&
    oto &&
    oto.deger &&
    !metin(kayit.ekMadde1Dogrulama) &&
    metin(kayit.ekMadde1Kaynak) !== 'personel'
  ) {
    patch.ekMadde1Dogrulama = oto.deger;
    patch.ekMadde1Kaynak = oto.kaynak || 'otomatik';
    patch.ekMadde1Gerekce = oto.gerekce || '';
    notlar.push('ekMadde1');
  }

  return { patch, notlar };
}

/**
 * Görünen tüm başvurular için otomatik yazımları toplar.
 *
 * @param {Array} kayitlar   görünen başvurular (kayıttaki hâlleriyle)
 * @param {Map|object} oneriHarita id → asilYedekOner satırı
 * @param {object} secenek   { gecmis, siralama, ekMadde1 }
 * @returns {Array} [{ id, patch, notlar }]
 */
export function otomatikYazimlar(kayitlar, oneriHarita, secenek) {
  const s = secenek || {};
  const al = (id) =>
    oneriHarita && typeof oneriHarita.get === 'function'
      ? oneriHarita.get(String(id))
      : (oneriHarita || {})[String(id)];

  const sonuc = [];
  (kayitlar || []).forEach((k) => {
    const id = metin(k && (k.id || k._docId));
    if (!id) return;
    const { patch, notlar } = otomatikYazim(k, al(id), {
      siralama: s.siralama,
      ekMadde1: s.ekMadde1,
      ekMadde1Oto: s.ekMadde1 ? ekMadde1Otomatik(k, s.gecmis) : null,
    });
    if (Object.keys(patch).length > 0) sonuc.push({ id, patch, notlar });
  });
  return sonuc;
}

/** Otomatik yazımın ekranda gösterilecek özeti. */
export function otomatikOzet(yazimlar) {
  let siralama = 0;
  let ekMadde1 = 0;
  (yazimlar || []).forEach((y) => {
    if ((y.notlar || []).includes('siralama')) siralama += 1;
    if ((y.notlar || []).includes('ekMadde1')) ekMadde1 += 1;
  });
  return { siralama, ekMadde1, toplam: (yazimlar || []).length };
}

/** Ek Madde-1 tespitinin nereden geldiğini anlatan kısa etiket. */
export const EK_MADDE1_KAYNAK_ETIKET = {
  personel: 'personel kontrolü (6 nolu belge)',
  sistem_kaydi: 'sistem kaydı — belge kontrolü bekliyor',
  beyan: 'adayın beyanı — belge kontrolü bekliyor',
  otomatik: 'otomatik — belge kontrolü bekliyor',
};
