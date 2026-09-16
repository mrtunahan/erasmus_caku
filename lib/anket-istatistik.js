// ══════════════════════════════════════════════════════════════
// ANKET SONUÇLARININ İSTATİSTİĞİ
//
// ⚠ SONUÇ EKRANI TEK BİR SAYI SÖYLÜYORDU. Her soru için bir halka grafik
// çiziliyor, üstte de "genel ortalama" yazıyordu. Ortalama tek başına
// yanıltıcıdır: 40 kişinin "3" dediği anket ile yarısı "1" yarısı "5" diyen
// anket AYNI ortalamayı verir — birincisi kayıtsızlık, ikincisi kutuplaşmadır
// ve ikisine verilecek karar aynı değildir. Ekran bunu göstermiyordu.
//
// Ayrıca hiçbir yerde "hangi soru en düşük" yazmıyordu; yetkili 20 halkaya
// tek tek bakıp kafasından sıralamak zorundaydı.
//
// Bu dosya sayıları üretir, çizmez. Grafikler yalnız buradan beslenir ki
// ekrandaki sayı ile Excel'e inen sayı ayrışmasın.
//
// ── SIRALI ÖLÇEK / SIRASIZ LİSTE AYRIMI ──
// Ortalama yalnız SIRALI ve sayısal ölçekte anlamlıdır (1–5 katılım). Şıkları
// "Evet/Hayır" ya da "Kulüp adı" olan bir soruda ortalama hesaplamak
// saçmadır; bu dosya böyle sorularda ortalama ÜRETMEZ (n=0 döner), ekran da
// çizmez.
// ══════════════════════════════════════════════════════════════

import { secenekSayisi, seceneklerSayisalMi, soruSecenekleri } from './anket-secenek.js';

const metin = (v) => String(v == null ? '' : v).trim();

/**
 * Bir yanıt hücresinin değerleri. Çoklu seçimde dizi, tekte düz değer.
 * Boş/işaretlenmemiş hücre boş dizi döner (yanıtsız sayılır).
 */
export function yanitDegerleri(v) {
  if (v == null || v === '') return [];
  return Array.isArray(v) ? v.map(metin).filter(Boolean) : [metin(v)];
}

/**
 * Bir sorunun ŞIK DAĞILIMI.
 *
 * @returns {{
 *   secenekler: {deger,etiket,sayi,oran}[],  // oran 0..1, yanıtlayan sayısına göre
 *   yanitlayan: number,   // en az bir şık işaretleyen kişi
 *   toplamIsaret: number, // çoklu seçimde kişiden fazla olabilir
 *   yanitsiz: number
 * }}
 */
export function dagilim(yanitlar, soru) {
  const ops = soruSecenekleri(soru);
  const sayac = new Map(ops.map((o) => [o.deger, 0]));
  let yanitlayan = 0;
  let toplamIsaret = 0;
  (yanitlar || []).forEach((r) => {
    const degerler = yanitDegerleri(r && r.answers ? r.answers[soru.id] : null);
    if (degerler.length === 0) return;
    let sayildi = false;
    degerler.forEach((d) => {
      if (!sayac.has(d)) return; // silinmiş şık — dağılıma girmez
      sayac.set(d, sayac.get(d) + 1);
      toplamIsaret++;
      sayildi = true;
    });
    if (sayildi) yanitlayan++;
  });
  const bolen = yanitlayan || 1;
  return {
    secenekler: ops.map((o) => ({
      deger: o.deger,
      etiket: o.etiket,
      sayi: sayac.get(o.deger) || 0,
      oran: (sayac.get(o.deger) || 0) / bolen,
    })),
    yanitlayan,
    toplamIsaret,
    yanitsiz: Math.max(0, (yanitlar || []).length - yanitlayan),
  };
}

/**
 * Sayısal ölçekli sorunun özeti.
 *
 * ⚠ ORTALAMA TEK BAŞINA YETMEZ — standart sapma ve medyan birlikte okunur:
 * aynı ortalamanın altında "herkes kararsız" da olabilir "yarısı çok memnun
 * yarısı hiç değil" de. `kutuplasma` bu ikincisini işaretler.
 *
 * Sayısal olmayan ölçekte n:0 döner; çağıran ortalama ÇİZMEMELİDİR.
 */
export function sayisalOzet(yanitlar, soru) {
  const bos = {
    n: 0,
    ortalama: 0,
    medyan: 0,
    mod: null,
    stdSapma: 0,
    enAz: 0,
    enCok: 0,
    olcekAlt: 0,
    olcekUst: 0,
  };
  if (!seceneklerSayisalMi(soru)) return bos;
  const ops = soruSecenekleri(soru);
  const olcek = ops.map((o) => secenekSayisi(o.deger)).filter((n) => n != null);
  const gecerli = new Set(ops.map((o) => o.deger));
  const degerler = [];
  (yanitlar || []).forEach((r) => {
    yanitDegerleri(r && r.answers ? r.answers[soru.id] : null).forEach((d) => {
      if (!gecerli.has(d)) return;
      const n = secenekSayisi(d);
      if (n != null) degerler.push(n);
    });
  });
  if (degerler.length === 0) {
    return { ...bos, olcekAlt: Math.min(...olcek), olcekUst: Math.max(...olcek) };
  }
  const n = degerler.length;
  const ortalama = degerler.reduce((a, b) => a + b, 0) / n;
  const sirali = degerler.slice().sort((a, b) => a - b);
  const orta = Math.floor(n / 2);
  const medyan = n % 2 ? sirali[orta] : (sirali[orta - 1] + sirali[orta]) / 2;
  const varyans = degerler.reduce((a, b) => a + (b - ortalama) ** 2, 0) / n;
  // Mod: en çok işaretlenen değer. Beraberlikte küçük olan — keyfi ama
  // kararlı; ekranda hep aynı sayıyı göstersin.
  const sayac = new Map();
  degerler.forEach((d) => sayac.set(d, (sayac.get(d) || 0) + 1));
  let mod = null;
  let modSayi = -1;
  [...sayac.entries()]
    .sort((a, b) => a[0] - b[0])
    .forEach(([d, c]) => {
      if (c > modSayi) {
        mod = d;
        modSayi = c;
      }
    });
  return {
    n,
    ortalama,
    medyan,
    mod,
    stdSapma: Math.sqrt(varyans),
    enAz: sirali[0],
    enCok: sirali[n - 1],
    olcekAlt: Math.min(...olcek),
    olcekUst: Math.max(...olcek),
  };
}

/**
 * Ölçek SIRALI mı? (az → çok, katılmıyorum → katılıyorum)
 *
 * ⚠ BU AYRIM OLMADAN EKRAN SAÇMALIYOR. "Üst uç / alt uç" ve "kutuplaşma"
 * yalnız sıralı ölçekte anlamlıdır: "yarısı web sitesi, yarısı sosyal medya
 * dedi" kutuplaşma değildir, iki ayrı şıktır. İlk sürümde bu denetim yoktu ve
 * sırasız listelerde "yanıtlar iki uca ayrışmış" uyarısı çıkıyordu.
 *
 * Sıra, şık DEĞERLERİNİN sayısal olmasından anlaşılır (hazır ölçeklerin hepsi
 * 1..n verir). Metin değerli ama gerçekten sıralı bir ölçek kuran kişi soruya
 * `sirali: true` koyarak bunu açıkça söyleyebilir; `sirali: false` ise sayısal
 * bir ölçeği sırasız ilan eder (ör. şıkları bina numarası olan bir soru).
 */
export function olcekSiraliMi(soru) {
  const s = soru || {};
  if (s.sirali === true) return true;
  if (s.sirali === false) return false;
  return seceneklerSayisalMi(s);
}

/**
 * Sıralı ölçekte ALT UÇ / ORTA / ÜST UÇ payları (top-box / bottom-box).
 *
 * Yüzdeler ortalamadan daha okunur bir cümle kurar: "%64 katılıyor, %12
 * katılmıyor". Beş şıklı ölçekte ilk iki şık alt uç, son iki şık üst uç,
 * ortadaki nötr sayılır; çift sayıda şıkta nötr yoktur.
 */
export function ucOranlari(yanitlar, soru) {
  const d = dagilim(yanitlar, soru);
  const n = d.secenekler.length;
  const bos = { olumsuz: 0, notr: 0, olumlu: 0, yanitlayan: d.yanitlayan };
  if (n < 2 || d.yanitlayan === 0 || !olcekSiraliMi(soru)) return bos;
  const kanat = n <= 3 ? 1 : 2;
  const notrVar = n % 2 === 1;
  const topla = (liste) => liste.reduce((a, o) => a + o.sayi, 0);
  const olumsuz = topla(d.secenekler.slice(0, kanat));
  const olumlu = topla(d.secenekler.slice(n - kanat));
  const notr = notrVar ? d.yanitlayan - olumsuz - olumlu : 0;
  return {
    olumsuz: olumsuz / d.yanitlayan,
    notr: Math.max(0, notr) / d.yanitlayan,
    olumlu: olumlu / d.yanitlayan,
    yanitlayan: d.yanitlayan,
  };
}

/**
 * Yanıtlar kutuplaşmış mı? (aynı ortalamanın iki farklı hikâyesi)
 *
 * Ölçüt: uçlardaki payların ikisi de belirgin (>= %25) ve orta zayıf.
 * Kesin bir istatistik testi değil; ekranda "dikkat" demek için eşik.
 */
export function kutuplasmaVarMi(yanitlar, soru) {
  if (!olcekSiraliMi(soru)) return false;
  const u = ucOranlari(yanitlar, soru);
  if (u.yanitlayan < 5) return false; // az yanıtta gürültüyü kutuplaşma sanma
  return u.olumsuz >= 0.25 && u.olumlu >= 0.25 && u.notr < 0.3;
}

/**
 * Soruların ortalamaya göre SIRALANMIŞ karşılaştırması.
 *
 * "Hangi soru en düşük puanı aldı" sorusunun cevabı hiçbir yerde yazmıyordu.
 * Yalnız sayısal ölçekli sorular girer; ölçekleri farklı olabileceği için
 * (1–5 ile 0–10 aynı listede) `oran` (0..1) da verilir — çubuk uzunluğu buna
 * göre çizilir, ham ortalama yan yana yazılır.
 */
export function soruKarsilastirmasi(sorular, yanitlar) {
  const satirlar = [];
  (sorular || []).forEach((q, i) => {
    const o = sayisalOzet(yanitlar, q);
    if (o.n === 0) return;
    const aralik = o.olcekUst - o.olcekAlt;
    satirlar.push({
      id: q.id,
      sira: i + 1,
      metin: q.text || '',
      ortalama: o.ortalama,
      stdSapma: o.stdSapma,
      n: o.n,
      olcekAlt: o.olcekAlt,
      olcekUst: o.olcekUst,
      oran: aralik > 0 ? (o.ortalama - o.olcekAlt) / aralik : 0,
    });
  });
  return satirlar.sort((a, b) => b.ortalama - a.ortalama || a.sira - b.sira);
}

/**
 * Anketin genel ortalaması — yalnız sayısal ölçekli sorulardan.
 *
 * ⚠ Eskiden `q.type === 'likert'` süzgeci vardı: özel şıklarla kurulmuş
 * sayısal bir ölçek ortalamaya girmiyor, Likert tipinde ama metin şıklı bir
 * soru ise '1'/'2' sanılıp giriyordu. Ölçüt tip değil ŞIKLARDIR.
 *
 * Ölçekleri farklı sorular ham ortalamada toplanamaz; her soru kendi
 * ölçeğinde 0..1'e indirgenip ortalanır ve sonuç 5'lik gösterim için de
 * verilir.
 */
export function genelOrtalama(sorular, yanitlar) {
  const satirlar = soruKarsilastirmasi(sorular, yanitlar);
  if (satirlar.length === 0) return { n: 0, oran: 0, besUzerinden: 0, soruSayisi: 0 };
  const toplamN = satirlar.reduce((a, s) => a + s.n, 0);
  // Soru başına değil YANIT başına ağırlık: 200 yanıtlı soru, 3 yanıtlı
  // soruyla eşit sayılmasın.
  const oran = satirlar.reduce((a, s) => a + s.oran * s.n, 0) / (toplamN || 1);
  return {
    n: toplamN,
    oran,
    besUzerinden: 1 + oran * 4,
    soruSayisi: satirlar.length,
  };
}

/**
 * Günlük katılım — "anket duyurulunca mı dolduruldu, sonra da geldi mi?"
 * @returns {{gun:string, sayi:number}[]} tarih sırasına göre, boş günler dahil
 */
export function gunlukKatilim(yanitlar) {
  const sayac = new Map();
  (yanitlar || []).forEach((r) => {
    const g = metin(r && r.submittedAt).slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(g)) return;
    sayac.set(g, (sayac.get(g) || 0) + 1);
  });
  if (sayac.size === 0) return [];
  const gunler = [...sayac.keys()].sort();
  const out = [];
  // Aradaki boş günler atlanırsa çizgi grafiği zamanı yalan söyler
  // (üç haftalık boşluk bir adım gibi görünür). Günler doldurulur.
  const gun = (t) => new Date(t + 'T00:00:00Z');
  let imlec = gun(gunler[0]);
  const son = gun(gunler[gunler.length - 1]);
  let guvenlik = 0;
  while (imlec <= son && guvenlik++ < 1000) {
    const anahtar = imlec.toISOString().slice(0, 10);
    out.push({ gun: anahtar, sayi: sayac.get(anahtar) || 0 });
    imlec = new Date(imlec.getTime() + 86400000);
  }
  return out;
}

/** Metin sorularının yanıtları — yorum listesi ve sayısı için. */
export function metinYanitlari(yanitlar, soru) {
  return (yanitlar || [])
    .map((r) => (r && r.answers ? r.answers[soru.id] : null))
    .map((v) => (Array.isArray(v) ? v.join(' ') : metin(v)))
    .filter(Boolean);
}

/**
 * Anketin tepe özeti — üstteki kutular bunu gösterir.
 */
export function anketOzeti(survey, yanitlar) {
  const sorular = (survey && survey.questions) || [];
  const genel = genelOrtalama(sorular, yanitlar);
  const metinSorulari = sorular.filter((q) => soruSecenekleri(q).length === 0);
  const yorum = metinSorulari.reduce((a, q) => a + metinYanitlari(yanitlar, q).length, 0);
  const sonTarih = (yanitlar || [])
    .map((r) => metin(r && r.submittedAt))
    .filter(Boolean)
    .sort()
    .pop();
  const karsilastirma = soruKarsilastirmasi(sorular, yanitlar);
  return {
    yanitSayisi: (yanitlar || []).length,
    sonTarih: (sonTarih || '').slice(0, 10),
    genelOrtalama: genel.soruSayisi > 0 ? genel.besUzerinden : null,
    genelOran: genel.oran,
    yorumSayisi: yorum,
    enYuksek: karsilastirma[0] || null,
    enDusuk: karsilastirma.length > 0 ? karsilastirma[karsilastirma.length - 1] : null,
    kutuplasanlar: sorular.filter((q) => kutuplasmaVarMi(yanitlar, q)).map((q) => q.id),
  };
}

// ══════════════════════════════════════════════════════════════
// GRAFİK RENKLERİ
//
// ⚠ ESKİ RAMPA KIRMIZI→YEŞİLDİ ('#DC2626' … '#059669'). Renk körlüğünün en
// yaygın türünde (deuteran/protan) kırmızı ile yeşil BİRBİRİNE GİRER: yığılmış
// çubuğun iki ucu aynı renge düşüyor, "katılıyorum" ile "katılmıyorum" ayırt
// edilemiyordu. Ayrıca kolların adım sayısı eşit değildi.
//
// Yerine sıcak/soğuk kutuplu (kırmızı ↔ mavi) ve nötr grili bir ırak
// (diverging) rampa kullanılır; kollar eşit adımlı. Aşağıdaki diziler
// doğrulayıcıdan geçirildi (beyaz zemin, açık mod): parlaklık bandı, renk
// körlüğü ayrımı (ΔE ≥ 8) ve normal görü tabanı (ΔE ≥ 15) geçti. Nötr grinin
// doygunluğu düşüktür — ırak rampanın tanımı gereği böyledir.
//
// Kontrast uyarısı alan adımlar için KURAL: yüzdeler doğrudan çubuğun üstüne
// yazılır ve gösterge (legend) her zaman bulunur; renk hiçbir zaman tek
// başına anlam taşımaz.
// ══════════════════════════════════════════════════════════════

/** Sıralı ölçek için ırak rampa. 2–5 şık desteklenir; fazlası tek renkli çubuğa düşer. */
const IRAK_RAMPA = {
  2: ['#e34948', '#2a78d6'],
  3: ['#e34948', '#a8a69f', '#5598e7'],
  4: ['#8f2525', '#e34948', '#5598e7', '#184f95'],
  5: ['#8f2525', '#e34948', '#a8a69f', '#5598e7', '#184f95'],
};

/** Tek hue'lu çubuklar (sırasız liste) ve çizgi grafiği için. */
export const TEK_HUE = '#2a78d6';
/** Grafik mürekkebi — eksen, ızgara, yazı. */
export const GRAFIK_MUREKKEP = {
  yazi: '#1F2937',
  ikincil: '#52514e',
  soluk: '#898781',
  izgara: '#e1e0d9',
  eksen: '#c3c2b7',
  zemin: '#FFFFFF',
};

/**
 * Sorunun dağılımı ırak (diverging) yığılmış çubukla çizilebilir mi?
 *
 * Koşul: ölçek SIRALI ve 2–5 şıklı olmalı. Altı ve üstü şıkta renk
 * kanalı taşımaz — doğrulayıcı da geçmiyor — o durumda tek hue'lu yatay çubuk
 * kullanılır; uzunluk zaten büyüklüğü anlatır.
 */
export function irakCizilebilirMi(soru) {
  const n = soruSecenekleri(soru).length;
  return olcekSiraliMi(soru) && n >= 2 && n <= 5;
}

/** Sorunun şık renkleri — ırak rampa ya da hepsi tek hue. */
export function soruRenkleri(soru) {
  const ops = soruSecenekleri(soru);
  if (irakCizilebilirMi(soru)) return IRAK_RAMPA[ops.length].slice();
  return ops.map(() => TEK_HUE);
}
