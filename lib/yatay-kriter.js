// ══════════════════════════════════════════════════════════════
// YATAY GEÇİŞ — başvuru kriterleri ve puan alanlarının doğrulanması
//
// Üç ayrı sorunu tek yerde topluyor:
//   1) Kurumun elle belirlediği TABAN BAŞARI SIRALAMASI eşiği (ör. 300.000).
//      Bu eşiğin gerisinde kalan aday, sıralamada nerede olursa olsun
//      "uygun değil"dir. ⚠ Ölçüt PUAN DEĞİL SIRADIR — ayrıntısı aşağıda.
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

// ── ÖSYM sonuç belgesinde HANGİ TABLO ──
//
// Sonuç belgesinde yan yana duran İKİ tablo var ve sütun başlıkları birebir
// aynı ("Puanı", "Başarı Sırası"):
//
//   SINAV PUANLARI VE BAŞARI SIRALARI   |  YERLEŞTİRME PUANLARI VE BAŞARI SIRALARI
//   TYT / SAY / SÖZ / EA / DİL          |  Y-TYT / Y-SAY / Y-SÖZ / Y-EA / Y-DİL
//                                       |  ├─ Yerleştirme ─┤ ├─ Ek Puanlı Yerleştirme ─┤
//
// Yatay geçişte ölçüt SAĞDAKİ tablonun "Yerleştirme" sütunudur. Soldaki
// SINAV puanı ham sınav sonucudur ve OBP katkısını içermez; örnek bir belgede
// SAY 298,59699 / 172.218 iken Y-SAY 355,29843 / 164.283'tür. Yanlış tabloyu
// okumak hem puanı hem sırayı sistematik olarak bozar.
//
// Satırlar yalnız "Y-" önekiyle ayrıldığı için okuma sırasında karışması çok
// kolay. Bu yüzden SOLDAKİ tablonun değerleri de ayrıca alınır ve burada
// karşılaştırılır: ikisi aynıysa neredeyse kesin yanlış tablo okunmuştur.

/**
 * Beyan edilen yerleştirme değerleri, SINAV tablosundaki değerlerle aynı mı?
 *
 * Yerleştirme puanı sınav puanına OBP katkısı eklenerek bulunur; ikisinin
 * birebir aynı çıkması pratikte mümkün değildir. Aynıysa yanlış sütun
 * okunmuştur.
 *
 * ⚠ Bu bir UYARIDIR, eleme sebebi değil: kesin bilgi belgede, karar insanda.
 *
 * @returns {{puan:boolean, sira:boolean, suphe:boolean}}
 */
export function yanlisTabloSuphesi(kayit) {
  const k = kayit || {};
  const p1 = puanOku(k.yksPuani);
  const p2 = puanOku(k.sinavPuani);
  const s1 = siraOku(k.yksBasariSirasi);
  const s2 = siraOku(k.sinavBasariSirasi);
  const puan = p1 != null && p2 != null && p1 === p2;
  const sira = s1 != null && s2 != null && s1 === s2;
  return { puan, sira, suphe: puan || sira };
}

// ── Taban BAŞARI SIRALAMASI eşiği ──
//
// ⚠ Uygunluk şartı PUAN değil SIRALAMA üzerinden işler. Yatay geçiş
// yönetmeliklerinde şart "… başarı sırası şartı" olarak yazılır (mühendislik
// programları için 300.000'inci başarı sırası gibi) ve aday, YERLEŞTİĞİ puan
// türündeki YERLEŞTİRME BAŞARI SIRASI ile değerlendirilir.
//
// Sıralamada KÜÇÜK sayı daha iyidir: 245.000 sıralı aday 300.000 eşiğini
// karşılar, 350.000 sıralı aday karşılamaz. Bu yön, puandaki karşılaştırmanın
// tam TERSİDİR ve karıştırılırsa tam olarak yanlış adaylar elenir.

/**
 * Başarı sırasını sayıya çevirir.
 *
 * ⚠ Neden `puanOku` KULLANILAMAZ: sıralamalar Türkçe binlik ayracıyla
 * yazılıyor ("300.000") ve `puanOku` noktayı ONDALIK ayracı sayıp bunu 300
 * olarak okuyor. 300.000'lik bir eşik 300'e dönerse hiç kimse elenmez.
 * Başarı sırası her zaman TAM SAYIdır; bu yüzden nokta, virgül ve boşluk
 * ayracı sayılıp atılır.
 *
 * @returns {number|null} okunamazsa null (asla 0 varsayılmaz)
 */
export function siraOku(v) {
  const s = String(v == null ? '' : v).trim();
  if (!s) return null;
  // Yalnız rakam ve ayraçlardan oluşmalı — "300.000" evet, "300 bin" hayır.
  if (!/^\d[\d.,\s]*$/.test(s)) return null;
  const n = parseInt(s.replace(/[.,\s]/g, ''), 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/**
 * Adayın yerleştirme başarı sırası, kurumun belirlediği taban sıralamayı
 * karşılıyor mu?
 *
 * Eşik girilmemişse 'kriter_yok' döner — eşik yokluğunu "kaldı" saymak,
 * kriteri hiç koymamış bir bölümde herkesi elemek olurdu.
 * Sıra okunamıyorsa 'belirsiz' döner; asla 0 varsayılmaz.
 *
 * @returns {{durum:'uygun'|'altinda'|'belirsiz'|'kriter_yok', aday:number|null,
 *   esik:number|null, fark:number|null}} fark = eşik - aday (pozitifse aday önde)
 */
export function siraEsikDurumu(adaySirasi, esik) {
  const e = siraOku(esik);
  if (e == null) return { durum: 'kriter_yok', aday: siraOku(adaySirasi), esik: null, fark: null };
  const a = siraOku(adaySirasi);
  if (a == null) return { durum: 'belirsiz', aday: null, esik: e, fark: null };
  // Küçük sıra daha iyi: aday <= eşik ise şart sağlanır.
  return { durum: a <= e ? 'uygun' : 'altinda', aday: a, esik: e, fark: e - a };
}

export const SIRA_ESIK_ETIKET = {
  uygun: 'Taban başarı sıralamasını karşılıyor',
  altinda: 'Taban başarı sıralamasının altında',
  belirsiz: 'Başarı sıralaması okunamadı',
  kriter_yok: 'Taban başarı sıralaması kriteri tanımlı değil',
};

/** Sıralamayı okunabilir yazar: 300000 → "300.000" */
export function siraYaz(v) {
  const n = siraOku(v);
  return n == null ? '' : n.toLocaleString('tr-TR');
}

/**
 * Eşiğin altında kalan kayıtların id kümesi. Sıralama/kontenjan önerisi
 * bunları kontenjana SAYMADAN 'uygun değil' işaretler.
 */
export function esikAltindakiler(kayitlar, esik) {
  const out = new Set();
  if (siraOku(esik) == null) return out;
  (kayitlar || []).forEach((k) => {
    if (!k) return;
    const d = siraEsikDurumu(k.yksBasariSirasi, esik);
    if (d.durum === 'altinda') out.add(String(k.id || k._docId));
  });
  return out;
}

// ── Ek Madde-1: daha önce yatay geçiş yapmamış olma şartı ──
//
// Merkezi yerleştirme puanıyla geçiş (Ek Madde-1) bir öğrenci için BİR KEZ
// kullanılabilir. Bunu aritmetik doğrulayamayız — bilgi, adayın yüklediği
// Öğrenci Belgesinde yazar. Bu yüzden iki ayrı alan var:
//
//   oncekiEkMadde1Gecisi → adayın BEYANI ('evet' | 'hayir' | '')
//   ekMadde1Dogrulama    → personelin belgeye bakıp verdiği KARAR
//                          ('var' | 'yok' | '')
//
// Eleme yalnız POZİTİF kanıtla olur: beyan "evet" ya da personel "var"
// dediyse. Belirsizlik eleme sebebi değildir — belge okunmadı diye adayı
// elemek, doğrulanmamış bir gerekçeyle karar vermek olurdu. Belirsiz kayıt
// arayüzde "kontrol bekliyor" diye işaretlenir.
export function ekMadde1Durumu(kayit) {
  const k = kayit || {};
  const dogrulama = String(k.ekMadde1Dogrulama || '').trim();
  if (dogrulama === 'var') return 'onceki_gecis_var';
  if (dogrulama === 'yok') return 'temiz';
  const beyan = String(k.oncekiEkMadde1Gecisi || '').trim();
  if (beyan === 'evet') return 'onceki_gecis_var';
  if (beyan === 'hayir') return 'beyan_var';
  return 'bilinmiyor';
}

/**
 * Bir başvurunun ELENME nedeni. Şartlar sırayla bakılır; ilk ihlal yazılır.
 *
 *   1) `esik` → kurumun elle girdiği, tüm başvurulara uygulanan taban başarı
 *      sıralaması (ör. 300.000).
 *   2) `basvurduguBolumTabanSirasi` → adayın BAŞVURDUĞU PROGRAMIN taban
 *      başarı sırası.
 *   3) `basvurduguBolumOsysPuani` → adayın BAŞVURDUĞU PROGRAMIN, adayın
 *      YERLEŞTİĞİ YILA ait taban puanı. Merkezi yerleştirme puanıyla geçişte
 *      (Ek Madde-1) adayın o yılki yerleştirme puanı bu değerden YÜKSEK
 *      olmalıdır. Yıl eşlemesi çağıranın işi: alana hangi yılın taban puanı
 *      yazıldıysa karşılaştırma onunla yapılır.
 *   4) Ek Madde-1 ile daha önce yatay geçiş yapmış olmak.
 *
 * Şartı karşılamayan kayıt yedek bile olamaz; sıralamaya girmeden elenir.
 * Alanı boş olan şart UYGULANMAZ — kriteri koymamış bölümde herkesi elemek
 * olurdu.
 *
 * @returns {''|'taban_sira'|'program_sira'|'program_taban_puan'|'onceki_gecis'}
 */
export function elemeNedeni(kayit, esik) {
  if (!kayit) return '';
  if (siraEsikDurumu(kayit.yksBasariSirasi, esik).durum === 'altinda') return 'taban_sira';
  if (siraEsikDurumu(kayit.yksBasariSirasi, kayit.basvurduguBolumTabanSirasi).durum === 'altinda') {
    return 'program_sira';
  }
  if (tabanPuanDurumu(kayit.yksPuani, kayit.basvurduguBolumOsysPuani).durum === 'altinda') {
    return 'program_taban_puan';
  }
  if (ekMadde1Durumu(kayit) === 'onceki_gecis_var') return 'onceki_gecis';
  return '';
}

/**
 * Adayın yerleştirme puanı, başvurduğu programın (aynı yıla ait) taban
 * puanından yüksek mi?
 *
 * ⚠ Karşılaştırma KESİN BÜYÜKTÜR: kural "taban puanından yüksek olmalıdır"
 * biçiminde konuldu, yani tam eşitlik şartı sağlamaz. Sıralama şartındaki
 * (siraEsikDurumu) eşitlik davranışından bilerek farklı.
 *
 * @returns {{durum:'uygun'|'altinda'|'belirsiz'|'kriter_yok', aday:number|null,
 *   taban:number|null, fark:number|null}}
 */
export function tabanPuanDurumu(adayPuani, tabanPuani) {
  const t = puanOku(tabanPuani);
  if (t == null) return { durum: 'kriter_yok', aday: puanOku(adayPuani), taban: null, fark: null };
  const a = puanOku(adayPuani);
  if (a == null) return { durum: 'belirsiz', aday: null, taban: t, fark: null };
  const fark = Math.round((a - t) * 100000) / 100000;
  return { durum: fark > 0 ? 'uygun' : 'altinda', aday: a, taban: t, fark };
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
  taban_sira: 'Taban başarı sıralamasının altında',
  program_sira: 'Başvurduğu programın taban sıralamasının altında',
  program_taban_puan: 'Programın o yıla ait taban puanının altında',
  onceki_gecis: 'Ek Madde-1 ile daha önce yatay geçiş yapmış',
  // Şart sorunu değil, yer sorunu: sıraya girdi ama kontenjan doldu.
  kontenjan: 'Kontenjan dışı',
  // Sıra bilgisi olmadan aday ne elenebilir ne sıralanabilir.
  sira_yok: 'Yerleştirme başarı sıralaması girilmemiş',
};

// Belgeye parantez içinde yazılan kısa gerekçe.
export const ELEME_KISA = {
  taban_sira: 'Taban başarı sıralamasının altında',
  program_sira: 'Program taban sıralamasının altında',
  program_taban_puan: 'Program taban puanının altında',
  onceki_gecis: 'Ek Madde-1 ile daha önce yatay geçiş yapmış',
  kontenjan: 'Kontenjan dışı',
  sira_yok: 'Başarı sıralaması yok',
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
  if (!sebep) {
    // Şart ihlali yok. Kayıt "uygun değil" ise gerekçe sıralama turundan
    // kalmıştır (kontenjan doldu gibi) — belgeye o yazılır.
    const kayitliSebep =
      kayitli.degerlendirme === 'uygun_degil' ? String(k.degerlendirmeSebebi || '') : '';
    return { ...kayitli, sebep: kayitliSebep, cakisma: false };
  }
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
