// ══════════════════════════════════════════════════════════════
// YATAY GEÇİŞ — başvuru kriterleri ve puan alanlarının doğrulanması
//
// Üç ayrı sorunu tek yerde topluyor:
//   1) Kurumun elle belirlediği TABAN ÖSYM PUANI eşiği. Bu eşiğin altındaki
//      aday, sıralamada nerede olursa olsun "uygun değil"dir.
//   2) AGNO'nun 100'lük sistemde olması. Sıralama puanı
//      (YKS×0,40 + AGNO×0,60) ancak iki bileşen de aynı ölçekteyse
//      anlamlıdır; 4'lük bir AGNO buraya girerse sonuç sessizce saçmalar.
//   3) Puan türlerinin tam listesi. Alan serbest metindi ve YÖS/DGS gibi
//      türler ne kullanıcı ne de belge okuma tarafında doğru tanınıyordu.
// ══════════════════════════════════════════════════════════════

import { puanOku, siralamaPuani } from './yatay-siralama.js';

// ── Puan türleri ──
// Yatay geçiş başvurusunda adayın YERLEŞTİĞİ sınavın puan türü. Liste
// eksik olduğu için YÖS ve DGS ile gelen adaylar "SAY/EA/SÖZ/DİL"e
// sıkıştırılıyor ya da boş bırakılıyordu.
export const YKS_PUAN_TURLERI = [
  { id: 'SAY', label: 'SAY (Sayısal)' },
  { id: 'EA', label: 'EA (Eşit Ağırlık)' },
  { id: 'SÖZ', label: 'SÖZ (Sözel)' },
  { id: 'DİL', label: 'DİL (Yabancı Dil)' },
  { id: 'TYT', label: 'TYT' },
  { id: 'DGS SAY', label: 'DGS — SAY' },
  { id: 'DGS EA', label: 'DGS — EA' },
  { id: 'DGS SÖZ', label: 'DGS — SÖZ' },
  { id: 'YÖS', label: 'YÖS (Yurt Dışından Öğrenci Kabul)' },
  { id: 'ÖZEL YETENEK', label: 'Özel Yetenek Sınavı' },
  { id: 'DİĞER', label: 'Diğer' },
];

const TR_BUYUT = (s) =>
  String(s == null ? '' : s)
    .replace(/i/g, 'İ')
    .replace(/ı/g, 'I')
    .toLocaleUpperCase('tr-TR')
    .replace(/\s+/g, ' ')
    .trim();

// Belgelerde ve elle girişte karşılaşılan yazımlar → kanonik tür.
const TUR_ESLEME = [
  [/^(SAY|SAYISAL|MF|SAY-?\d?)$/, 'SAY'],
  [/^(EA|EŞİT ?AĞIRLIK|TM|EA-?\d?)$/, 'EA'],
  [/^(SÖZ|SOZ|SÖZEL|SOZEL|TS|SÖZ-?\d?)$/, 'SÖZ'],
  [/^(DİL|DIL|YABANCI ?DİL|YDT|DİL-?\d?)$/, 'DİL'],
  [/^(TYT|TEMEL ?YETERLİLİK.*)$/, 'TYT'],
  [/^(DGS ?[-–/ ]? ?SAY(ISAL)?|SAY ?DGS)$/, 'DGS SAY'],
  [/^(DGS ?[-–/ ]? ?EA|DGS ?[-–/ ]? ?EŞİT ?AĞIRLIK)$/, 'DGS EA'],
  [/^(DGS ?[-–/ ]? ?SÖZ(EL)?|DGS ?[-–/ ]? ?SOZ(EL)?)$/, 'DGS SÖZ'],
  [/^(DGS|DİKEY ?GEÇİŞ.*)$/, 'DGS SAY'],
  [/^(YÖS|YOS|Y[ÖO]S ?\d*|YURT ?DIŞI.*)$/, 'YÖS'],
  [/^(ÖZEL ?YETENEK.*|OZEL ?YETENEK.*)$/, 'ÖZEL YETENEK'],
];

/**
 * Serbest yazılmış puan türünü kanonik hâle getirir.
 * Tanınmazsa BOŞ döner — uydurma bir tür üretmek, yanlış listeyle
 * karşılaştırmaya yol açardı.
 */
export function puanTuruNormalize(ham) {
  const s = TR_BUYUT(ham);
  if (!s) return '';
  if (YKS_PUAN_TURLERI.some((t) => t.id === s)) return s;
  for (const [kalip, tur] of TUR_ESLEME) {
    if (kalip.test(s)) return tur;
  }
  return '';
}

// ── AGNO ──
// Sıralama puanı YKS ile AGNO'yu toplar; ikisi de 100'lük ölçekte olmalı.
// 4'lük bir değer (ör. 3,10) buraya girerse hesap sessizce bozulur ve aday
// listenin en altına düşer.
export const GNO_TABAN = 0;
export const GNO_TAVAN = 100;
// Bu eşiğin altındaki değer neredeyse kesinlikle 4'lük sistemden gelmiştir.
const DORTLUK_SUPHE_SINIRI = 4.01;

/**
 * AGNO girdisini denetler.
 * @returns {{ok:boolean, deger:number|null, uyari:string, hata:string}}
 */
export function gnoDogrula(ham) {
  const s = String(ham == null ? '' : ham).trim();
  if (!s) return { ok: false, deger: null, uyari: '', hata: 'Not ortalaması boş.' };
  const n = puanOku(s);
  if (n == null) {
    return { ok: false, deger: null, uyari: '', hata: 'Not ortalaması sayı olmalı.' };
  }
  if (n < GNO_TABAN || n > GNO_TAVAN) {
    return {
      ok: false,
      deger: n,
      uyari: '',
      hata: '100’lük sistemde not ortalaması 0 ile 100 arasında olmalı.',
    };
  }
  if (n <= DORTLUK_SUPHE_SINIRI) {
    // Reddetmiyoruz — 4,00 gerçekten 100'lük sistemde çok düşük ama mümkün
    // bir değer. Ancak sessiz geçmek de olmaz: bu neredeyse her zaman
    // 4'lük AGNO'nun yanlışlıkla girilmesidir.
    return {
      ok: true,
      deger: n,
      uyari:
        'Bu değer 4’lük sistemden girilmiş olabilir. Yatay geçişte not ortalaması ' +
        '100’lük sistemde işlenir — transkriptinizdeki 100’lük değeri girin.',
      hata: '',
    };
  }
  return { ok: true, deger: n, uyari: '', hata: '' };
}

// ── Taban ÖSYM puanı eşiği ──

/**
 * Adayın ÖSYM yerleştirme puanı, kurumun belirlediği taban puanı karşılıyor mu?
 *
 * Eşik girilmemişse 'kriter_yok' döner — eşik yokluğunu "kaldı" saymak,
 * kriteri hiç koymamış bir bölümde herkesi elemek olurdu.
 * Puan okunamıyorsa 'belirsiz' döner; asla 0 varsayılmaz.
 *
 * @returns {{durum:'uygun'|'altinda'|'belirsiz'|'kriter_yok', aday:number|null,
 *   esik:number|null, fark:number|null}}
 */
export function osymEsikDurumu(adayPuani, esik) {
  const e = puanOku(esik);
  if (e == null) return { durum: 'kriter_yok', aday: puanOku(adayPuani), esik: null, fark: null };
  const a = puanOku(adayPuani);
  if (a == null) return { durum: 'belirsiz', aday: null, esik: e, fark: null };
  const fark = Math.round((a - e) * 1000) / 1000;
  return { durum: fark >= 0 ? 'uygun' : 'altinda', aday: a, esik: e, fark };
}

export const OSYM_ESIK_ETIKET = {
  uygun: 'Taban ÖSYM puanını karşılıyor',
  altinda: 'Taban ÖSYM puanının altında',
  belirsiz: 'ÖSYM puanı okunamadı',
  kriter_yok: 'Taban ÖSYM puanı kriteri tanımlı değil',
};

/**
 * Eşiğin altında kalan kayıtların id kümesi. Sıralama/kontenjan önerisi
 * bunları kontenjana SAYMADAN 'uygun değil' işaretler.
 */
export function esikAltindakiler(kayitlar, esik) {
  const out = new Set();
  if (puanOku(esik) == null) return out;
  (kayitlar || []).forEach((k) => {
    if (!k) return;
    // Merkezi yerleştirmede ölçüt doğrudan YKS puanı; kurumlararasında da
    // eşik ÖSYM yerleştirme puanına uygulanır (AGNO'ya değil).
    const d = osymEsikDurumu(k.yksPuani, esik);
    if (d.durum === 'altinda') out.add(String(k.id || k._docId));
  });
  return out;
}

/**
 * Bir başvurunun ELENME nedeni — iki ayrı taban puan şartı vardır:
 *
 *   1) `esik`  → kurumun elle girdiği, tüm başvurulara uygulanan asgari puan.
 *   2) `basvurduguBolumOsysPuani` → adayın BAŞVURDUĞU PROGRAMIN kendi ÖSYM
 *      taban puanı. Merkezi yerleştirmeyle geçişte aday, gitmek istediği
 *      programın taban puanını da karşılamak zorundadır.
 *
 * ⚠ İkincisi kartta gösteriliyor ama sıralamaya HİÇ girmiyordu: programın
 * taban puanının altında kalan aday yine de sıraya alınıp yedek yazılıyordu.
 * Şart karşılanmadığı için bu kayıt yedek bile olamaz.
 *
 * @returns {''|'taban_osym'|'program_taban'}
 */
export function elemeNedeni(kayit, esik) {
  if (!kayit) return '';
  if (osymEsikDurumu(kayit.yksPuani, esik).durum === 'altinda') return 'taban_osym';
  if (osymEsikDurumu(kayit.yksPuani, kayit.basvurduguBolumOsysPuani).durum === 'altinda') {
    return 'program_taban';
  }
  return '';
}

/**
 * Elenecek kayıtlar: id → neden. `asilYedekOner` bunları kontenjana
 * saymadan 'uygun değil' işaretler.
 * @returns {Map<string,string>}
 */
export function elenecekler(kayitlar, esik) {
  const m = new Map();
  (kayitlar || []).forEach((k) => {
    if (!k) return;
    const neden = elemeNedeni(k, esik);
    if (neden) m.set(String(k.id || k._docId), neden);
  });
  return m;
}

export const ELEME_ETIKET = {
  taban_osym: 'Taban ÖSYM puanının altında',
  program_taban: 'Başvurduğu programın taban puanının altında',
};

/**
 * Kayıtta GÖRÜNEN ve BELGEYE YAZILAN değerlendirme.
 *
 * ⚠ Değerlendirme sonucu kayıtta SAKLI durur (`degerlendirme`,
 * `degerlendirmeSinif`, `degerlendirmeSira`). Sıralamayı düzeltmek tek başına
 * yetmiyor: daha önce yapılmış bir sıralamadan kalan "3. YEDEK" değeri kayıtta
 * öylece kalıyor, karta ve resmî rapora aynen basılıyordu. Sonuç, aynı kartta
 * yan yana duran iki çelişik ifadeydi: "Taban ÖSYM puanının altında" rozeti ve
 * "UYGUN 2. Sınıf (3. YEDEK)".
 *
 * Taban puan şartı bir SIRALAMA tercihi değil, bir UYGUNLUK şartıdır. Bu
 * yüzden şart okunduğu her yerde uygulanır: şartı karşılamayan kayıt, kayıtta
 * ne yazarsa yazsın "uygun değil"dir. Böylece eski bir sıralamadan artakalan
 * değer belgeye sızamaz.
 *
 * `cakisma`, kayıttaki değerin bu kuralla çeliştiğini söyler — arayüz bunu
 * "sıralamayı yeniden uygulayın" uyarısı için kullanır; veriye dokunulmaz.
 *
 * @returns {{degerlendirme:string, degerlendirmeSinif:string,
 *   degerlendirmeSira:string, sebep:string, cakisma:boolean}}
 */
export function gecerliDegerlendirme(kayit, esik) {
  const k = kayit || {};
  const kayitli = {
    degerlendirme: k.degerlendirme || '',
    degerlendirmeSinif: k.degerlendirmeSinif || '',
    degerlendirmeSira: k.degerlendirmeSira || '',
  };
  const sebep = elemeNedeni(k, esik);
  if (!sebep) return { ...kayitli, sebep: '', cakisma: false };
  return {
    degerlendirme: 'uygun_degil',
    // Sınıf/sıra yalnız "uygun" sonuçlarının alanlarıdır; elenen kayıtta
    // taşınmaları "UYGUN DEĞİL (3. YEDEK)" gibi anlamsız bir metin üretirdi.
    degerlendirmeSinif: '',
    degerlendirmeSira: '',
    sebep,
    cakisma: !!kayitli.degerlendirme && kayitli.degerlendirme !== 'uygun_degil',
  };
}

/** Sıralamaya esas puan — türe göre (yatay-siralama'dan yeniden verilir). */
export { siralamaPuani };
