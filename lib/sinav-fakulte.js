// ══════════════════════════════════════════════════════════════
// FAKÜLTE SINAV PROGRAMI — ORTAK TABLO, KISALTMALAR, BÖLÜM GÖNDERİMİ
//
// Fakültenin bütün bölümlerinin sınavları tek tabloda: gün başına bir sayfa,
// sütunlar fakültenin ortak salonları, satırlar 30 dakikalık dilimler.
// Fakülte yetkilisinin elle hazırladığı Excel'in düzeni esas alındı:
//
//   • Hücre: 1. satır ders kodları, gerekirse bölüm etiketi
//     ("(İNŞ-MAK Ortak)"), son satır gözetmen kısaltmaları. Aynı dersin
//     müfredat karşılıkları " / ", aynı oturumdaki farklı dersler " - " ile
//     ayrılır. Oturumdan kısa süren derse süre notu düşülür: "İNŞ402 (30dk)".
//   • Dersin hocası gözetmense kısaltma yerine "Dersin Öğr. Elemanı" yazılır.
//   • Hücre sınav süresince dikey birleşir (90 dk = 3 satır); birden çok
//     salona yayılan sınavın metni her salon sütununa yazılır.
//   • Renk bölüme göredir; birden çok bölümün ortak sınavı sarıdır.
//   • "Kısaltmalar" sayfası: kısaltma, unvanlı ad, kişinin gözetmenlik sayısı.
//
// Ekrandaki geniş görünüm ile Excel çıktısı AYNI modelden çizilir
// (gunTablosu) — ekranda görünen ile indirilen dosya ayrışmasın.
// ══════════════════════════════════════════════════════════════

import { adAnahtari } from './gozetmen.js';
import { unvansizAd } from './akademik-unvan.js';
import { oturumlar, oturumOzeti, dersAdiKoku, kodAnahtari } from './sinav-birlesim.js';

const metin = (v) => String(v == null ? '' : v).trim();
const sayi = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);
const tekil = (l) => [...new Set(l.map(metin).filter(Boolean))];

export const HOCA_ETIKETI = 'Dersin Öğr. Elemanı';
export const ORTAK_RENK = 'FFFF00';

// ── ÖZEL RENKLER ──
// Ortak (birden çok bölümün) sınavı ile OSD (ortak seçmeli) ve OZD (ortak
// zorunlu) derslerin sınavları bölüm renginden ayrı renklendirilir. Her
// fakülte kendi ayarından değiştirebilir; bunlar varsayılanlardır.
export const OZEL_RENK_VARSAYILAN = Object.freeze({
  ortak: ORTAK_RENK,
  osd: 'C6E0B4',
  ozd: 'F8CBAD',
});
const renkMetni = (v) => metin(v).replace(/^#/, '').toUpperCase();

/** Ayardaki özel renkler varsayılanlarla tamamlanır. */
export function ozelRenkler(ayarRenkleri) {
  const a = ayarRenkleri || {};
  const out = {};
  Object.keys(OZEL_RENK_VARSAYILAN).forEach((k) => {
    out[k] = /^[0-9A-F]{6}$/.test(renkMetni(a[k])) ? renkMetni(a[k]) : OZEL_RENK_VARSAYILAN[k];
  });
  return out;
}

/** Ders kodundan OSD / OZD türü ("OZD101" → 'ozd'); değilse ''. */
export function ortakDersTuru(kod) {
  const k = metin(kod).toLocaleUpperCase('tr-TR').replace(/[\s*]/g, '');
  if (k.startsWith('OSD')) return 'osd';
  if (k.startsWith('OZD')) return 'ozd';
  return '';
}

// ── SAAT DİLİMLERİ: 08:30–18:30, 30 dakika ──
const BAS_DK = 8 * 60 + 30;
const BIT_DK = 18 * 60 + 30;
const iki = (n) => String(n).padStart(2, '0');
const saatMetni = (dk) => iki(Math.floor(dk / 60)) + ':' + iki(dk % 60);

export const SAAT_DILIMLERI = (() => {
  const l = [];
  for (let d = BAS_DK; d < BIT_DK; d += 30) {
    l.push({
      bas: saatMetni(d),
      bit: saatMetni(d + 30),
      dk: d,
      etiket: saatMetni(d) + '-' + saatMetni(d + 30),
    });
  }
  return l;
})();

export function dakikaya(saat) {
  const m = /^(\d{1,2}):(\d{2})/.exec(metin(saat));
  return m ? Number(m[1]) * 60 + Number(m[2]) : -1;
}

// ── SINAV TÜRÜ ──
const TUR_ADI = { vize: 'Vize', final: 'Final', but: 'Bütünleme' };
/** Dönem kaydından sınavın adı: "Vize", "Final", "Bütünleme". */
export function sinavAdi(donem) {
  const t = metin(donem && donem.examType).toLocaleLowerCase('tr-TR');
  if (TUR_ADI[t]) return TUR_ADI[t];
  const l = metin(donem && donem.label);
  return l ? l.split(' - ')[0] : '';
}

/**
 * Bölümler dönemlerini ayrı ayrı açıyor; fakülte aynı sınav dönemini
 * (tür + yarıyıl) birlikte görür. "final|2025-2026 bahar".
 */
export function donemGrubu(donem) {
  const d = donem || {};
  const tur =
    metin(d.examType).toLocaleLowerCase('tr-TR') ||
    metin(d.label).split(' - ')[0].toLocaleLowerCase('tr-TR');
  const yariyil = metin(d.semester || metin(d.label).split(' - ').slice(1).join(' - '))
    .toLocaleLowerCase('tr-TR')
    .replace(/\s+/g, ' ');
  // Lisans ve lisansüstü dönemleri ayrı açılır; aynı tür + yarıyıl olsalar da
  // ayrı programdır (ayrı gönderim, ayrı fakülte tablosu).
  const seviye = metin(d.seviye) || 'lisans';
  return tur + '|' + yariyil + (seviye === 'lisans' ? '' : '|' + seviye);
}

/** Dönem kayıtlarını gruplara ayırır (en yenisi önce). */
export function donemGruplari(donemler) {
  const h = new Map();
  (Array.isArray(donemler) ? donemler : []).filter(Boolean).forEach((d) => {
    const k = donemGrubu(d);
    const sv = metin(d.seviye) || 'lisans';
    const etiket = (metin(d.label) || k) + (sv === 'lisans' ? '' : ' (' + sv + ')');
    if (!h.has(k)) h.set(k, { anahtar: k, etiket, donemler: [], bas: '', bit: '' });
    const g = h.get(k);
    g.donemler.push(d);
    const b = metin(d.startDate);
    if (b && (!g.bas || b < g.bas)) g.bas = b;
    if (b) {
      const son = tarihNesne(b);
      son.setDate(son.getDate() + (sayi(d.weeks) || 1) * 7 - 1);
      const bit = isoTarih(son);
      if (!g.bit || bit > g.bit) g.bit = bit;
    }
  });
  return [...h.values()].sort((a, b) => (b.bas || '').localeCompare(a.bas || ''));
}

/**
 * Fakültenin ŞU ANKİ sınav dönemi: bugünü kapsayan dönem; yoksa en yakın
 * gelecek dönem; o da yoksa en son biten dönem.
 * @param {object[]} gruplar donemGruplari çıktısı
 * @param {string} bugun YYYY-AA-GG
 */
export function aktifDonemGrubu(gruplar, bugun) {
  const l = (Array.isArray(gruplar) ? gruplar : []).filter((g) => g && g.bas);
  if (l.length === 0) return (gruplar && gruplar[0]) || null;
  const t = metin(bugun);
  const icinde = l.filter((g) => g.bas <= t && t <= (g.bit || g.bas));
  if (icinde.length) return icinde.sort((a, b) => b.bas.localeCompare(a.bas))[0];
  const gelecek = l.filter((g) => g.bas > t).sort((a, b) => a.bas.localeCompare(b.bas));
  if (gelecek.length) return gelecek[0];
  return l.sort((a, b) => (b.bit || b.bas).localeCompare(a.bit || a.bas))[0];
}

// ── FAKÜLTE / MYO LİSTESİ ──
const adNormal = (v) => metin(v).toLocaleLowerCase('tr-TR').replace(/\s+/g, ' ');
const VARSAYILAN_FAKULTE_ADLARI = { muhendislik: 'Mühendislik Fakültesi' };

/**
 * Fakülte ve MYO seçenekleri. Aynı birim slug ('muhendislik') ve veritabanı
 * kimliğiyle (ObjectId) anılabiliyor; aynı adı ya da kimliği taşıyan kayıtlar
 * TEK seçenekte birleşir ve bölümler hangi kimlikle bağlı olursa olsun
 * doğru birime düşer. Bölümü olmayan birim de listelenir.
 * @returns {{anahtar, ad, kimlikler:string[], bolumSayisi}[]} ada göre sıralı
 */
export function fakulteListesi(kayitlar, bolumler) {
  const gruplar = [];
  const kimlikIle = (id) => gruplar.find((g) => g.kimlikler.has(id));
  const adIle = (ad) => (ad ? gruplar.find((g) => adNormal(g.ad) === adNormal(ad)) : null);
  (Array.isArray(kayitlar) ? kayitlar : []).filter(Boolean).forEach((f) => {
    const ids = tekil([f.id, f._docId, ...(Array.isArray(f.kimlikler) ? f.kimlikler : [])]);
    const ad = metin(f.name || f.ad);
    if (ids.length === 0) return;
    let g = ids.map(kimlikIle).find(Boolean) || adIle(ad);
    if (!g) {
      g = { ad, kimlikler: new Set(), bolumSayisi: 0 };
      gruplar.push(g);
    }
    ids.forEach((i) => g.kimlikler.add(i));
    if (!g.ad) g.ad = ad;
  });
  (Array.isArray(bolumler) ? bolumler : []).filter(Boolean).forEach((b) => {
    const id = metin(b.facultyId);
    if (!id) return;
    let g = kimlikIle(id) || adIle(VARSAYILAN_FAKULTE_ADLARI[id]);
    if (!g) {
      g = { ad: VARSAYILAN_FAKULTE_ADLARI[id] || '', kimlikler: new Set(), bolumSayisi: 0 };
      gruplar.push(g);
    }
    g.kimlikler.add(id);
    g.bolumSayisi += 1;
  });
  return gruplar
    .map((g) => {
      const k = [...g.kimlikler];
      return { anahtar: k[0], ad: g.ad || k[0], kimlikler: k, bolumSayisi: g.bolumSayisi };
    })
    .sort((a, b) => a.ad.localeCompare(b.ad, 'tr'));
}

// ── KISALTMALAR ──

/** "Arş. Gör. Mehmet Emin ÖZDEMİR" → "MEÖ" (unvan atılır, kelime baş harfleri). */
export function kisaltmaUret(ad, uzunluk) {
  const parca = metin(unvansizAd(ad))
    .split(/[\s-]+/)
    .filter(Boolean);
  if (parca.length === 0) return '';
  const soyad = parca[parca.length - 1].toLocaleUpperCase('tr-TR');
  const adlar = parca.slice(0, -1).map((p) => p[0].toLocaleUpperCase('tr-TR'));
  return adlar.join('') + soyad.slice(0, Math.max(1, uzunluk || 1));
}

/**
 * Kişiler için tekil kısaltma haritası. Elle girilen kısaltma (`elle`, ad →
 * kısaltma) her zaman esastır. Otomatik kısaltma başka biriyle çakışırsa
 * soyadından harf eklenir: Merve DURMAZ → "MD" doluysa "MDU".
 * @returns {Object<string,string>} ad → kısaltma
 */
export function kisaltmaHaritasi(adlar, elle) {
  const e = elle || {};
  const out = {};
  const kullanilan = new Set();
  // Sıra unvansız ada göre: kimin kısa kısaltmayı alacağı unvana bağlı olmasın.
  const liste = tekil(adlar || []).sort((a, b) => unvansizAd(a).localeCompare(unvansizAd(b), 'tr'));
  liste.forEach((ad) => {
    const k = metin(e[ad]);
    if (k) {
      out[ad] = k;
      kullanilan.add(k);
    }
  });
  liste.forEach((ad) => {
    if (out[ad]) return;
    let n = 1;
    let k = kisaltmaUret(ad, n);
    const soyadUzunlugu = metin(unvansizAd(ad))
      .split(/[\s-]+/)
      .pop().length;
    while (k && kullanilan.has(k) && n < soyadUzunlugu) k = kisaltmaUret(ad, ++n);
    if (k && kullanilan.has(k)) {
      let i = 2;
      while (kullanilan.has(k + i)) i++;
      k = k + i;
    }
    out[ad] = k;
    if (k) kullanilan.add(k);
  });
  return out;
}

// ── BÖLÜM KISA ADI VE RENGİ ──

const VARSAYILAN_RENK = {
  bilgisayar: '5B9BD5',
  elektrik: 'FF5B5B',
  makine: 'F4B183',
  insaat: 'FFC000',
  gida: 'A9D08E',
  kimya: 'C9A0DC',
  geomatik: '92D050',
};
const YEDEK_RENKLER = ['9DC3E6', 'F8CBAD', 'C5E0B4', 'FFE699', 'D9D2E9', 'B4C7E7', 'E2EFDA'];

/** "Bilgisayar" → "BİL", "İnşaat" → "İNŞ". */
export function kisaAdUret(ad) {
  const ilk = metin(ad).split(/[\s-]+/)[0] || '';
  return ilk.slice(0, 3).toLocaleUpperCase('tr-TR');
}

/**
 * Bölüm bilgisi: ayardaki kısa ad/renk esas, yoksa bölüm kaydından türetilir.
 * @param {object[]} bolumler [{id, name, shortName}]
 * @param {object} ayar { [bolumId]: { kisaAd, renk } }
 * @returns {Object<string,{ad, kisaAd, renk}>}
 */
export function bolumBilgileri(bolumler, ayar) {
  const a = ayar || {};
  const out = {};
  (Array.isArray(bolumler) ? bolumler : []).filter(Boolean).forEach((b, i) => {
    const id = metin(b.id);
    if (!id) return;
    const x = a[id] || {};
    out[id] = {
      ad: metin(b.name),
      kisaAd: metin(x.kisaAd) || kisaAdUret(b.shortName || b.name),
      renk:
        metin(x.renk).replace(/^#/, '').toUpperCase() ||
        VARSAYILAN_RENK[id] ||
        YEDEK_RENKLER[i % YEDEK_RENKLER.length],
    };
  });
  return out;
}

// ── OTURUM HÜCRESİ ──

const salonParcalari = (salon) =>
  metin(salon)
    .split(/\s+-\s+|,/)
    .map(metin)
    .filter((s) => s && s !== 'TBD');
const gozetmenParcalari = (g) => metin(g).split(',').map(metin).filter(Boolean);

/** Oturumdaki derslerin kod satırı: karşılıklar " / ", farklı dersler " - ". */
export function kodSatiri(uyeler, oturumSuresi) {
  const gruplar = new Map();
  (uyeler || []).forEach((u, i) => {
    const k = dersAdiKoku(u.name) || '#' + i;
    if (!gruplar.has(k)) gruplar.set(k, []);
    gruplar.get(k).push(u);
  });
  const parcalar = [];
  gruplar.forEach((l) => {
    const kodlar = [];
    l.forEach((u) => {
      const kod = metin(u.code);
      if (!kod || kodlar.some((x) => kodAnahtari(x.kod) === kodAnahtari(kod))) return;
      kodlar.push({ kod, sure: sayi(u.duration) || 60 });
    });
    if (kodlar.length === 0) return;
    const sure = Math.max(...kodlar.map((k) => k.sure));
    const not = sure < oturumSuresi ? ' (' + sure + 'dk)' : '';
    parcalar.push(kodlar.map((k) => k.kod).join(' / ') + not);
  });
  return parcalar.join(' - ');
}

/**
 * Sınavları fakülte tablosunun oturumlarına çevirir.
 * @returns {object[]} [{anahtar, date, timeSlot, sure, salonlar, bolumIdleri,
 *   kodSatiri, bolumEtiketi, gozetmenler, gozetmenSatiri, metin, renk,
 *   ogrenci, uyeler}]
 */
export function fakulteOturumlari(sinavlar, p) {
  const o = p || {};
  const bilgi = o.bolumBilgisi || {};
  const kisa = o.kisaltmalar || {};
  const renkler = ozelRenkler(o.ozelRenkler);
  return oturumlar((sinavlar || []).filter((s) => s && metin(s.date) && metin(s.timeSlot))).map(
    ({ anahtar, uyeler }) => {
      const oz = oturumOzeti(uyeler);
      const sure = oz.sure || 60;
      const bolumIdleri = tekil(uyeler.map((u) => u.departmentId));
      const salonlar = tekil(uyeler.flatMap((u) => salonParcalari(u.room)));
      const gozetmenler = tekil(uyeler.flatMap((u) => gozetmenParcalari(u.supervisor)));
      const hocaAnahtar = new Set(oz.hocalar.map(adAnahtari).filter(Boolean));
      const hocaGozetmen = gozetmenler.some((g) => hocaAnahtar.has(adAnahtari(g)));
      const digerleri = gozetmenler.filter((g) => !hocaAnahtar.has(adAnahtari(g)));
      const gozetmenSatiri = [
        ...digerleri.map((g) => kisa[g] || kisaltmaUret(g)),
        ...(hocaGozetmen ? [HOCA_ETIKETI] : []),
      ].join(' - ');
      const kodlar = kodSatiri(uyeler, sure);
      const bolumEtiketi =
        bolumIdleri.length > 1
          ? '(' + bolumIdleri.map((b) => (bilgi[b] && bilgi[b].kisaAd) || b).join('-') + ' Ortak)'
          : '';
      // Öncelik: OSD/OZD dersi → ortak (birden çok bölüm) → bölüm rengi.
      const tur = uyeler.map((u) => ortakDersTuru(u.code)).find(Boolean) || '';
      const renk = tur
        ? renkler[tur]
        : bolumIdleri.length > 1
          ? renkler.ortak
          : (bilgi[bolumIdleri[0]] && bilgi[bolumIdleri[0]].renk) || 'FFFFFF';
      return {
        anahtar,
        date: oz.date,
        timeSlot: oz.timeSlot,
        sure,
        salonlar,
        bolumIdleri,
        kodSatiri: kodlar,
        bolumEtiketi,
        gozetmenler,
        digerGozetmenler: digerleri,
        hocaGozetmen,
        gozetmenSatiri,
        metin: [kodlar, bolumEtiketi, gozetmenSatiri].filter(Boolean).join('\n'),
        renk,
        ogrenci: oz.toplamOgrenci,
        uyeler,
      };
    }
  );
}

/** Kısaltmalar sayfası: [{kisaltma, ad, sayi}] — gözetmenlik (oturum) sayısına göre. */
export function kisaltmaListesi(oturumListesi, kisaltmalar) {
  const sayac = new Map();
  (oturumListesi || []).forEach((o) => {
    const hoca = new Set((o.uyeler || []).map((u) => adAnahtari(u.professor)).filter(Boolean));
    (o.gozetmenler || []).forEach((g) => {
      if (hoca.has(adAnahtari(g))) return;
      sayac.set(g, (sayac.get(g) || 0) + 1);
    });
  });
  const satirlar = [...sayac.entries()]
    .map(([ad, n]) => ({ kisaltma: (kisaltmalar || {})[ad] || kisaltmaUret(ad), ad, sayi: n }))
    .sort((a, b) => b.sayi - a.sayi || a.ad.localeCompare(b.ad, 'tr'));
  satirlar.push({ kisaltma: '-', ad: HOCA_ETIKETI, sayi: '' });
  return satirlar;
}

// ── GÜN TABLOSU ──

/**
 * Bir günün tablo modeli. Salon listesinde olmayan bir salon kullanılmışsa
 * sona sütun olarak eklenir (veri kaybolmasın). Aynı salonda örtüşen iki
 * oturum tek hücrede birleşir ve `cakisma` işaretlenir — Excel'de üst üste
 * binen birleştirme dosyayı bozardı.
 *
 * @returns {{ salonlar:[{name, capacity}], satirlar:[{etiket, hucreler:[
 *   null | {metin, renk, satirSayisi, gizli, cakisma, oturumlar}]}] }}
 */
export function gunTablosu(gununOturumlari, salonlar, secenek) {
  const s = secenek || {};
  const metinAlani = s.metinAlani || 'metin';
  const sutunlar = (Array.isArray(salonlar) ? salonlar : [])
    .filter((x) => x && metin(x.name))
    .map((x) => ({ name: metin(x.name), capacity: x.capacity }));
  const bilinen = new Set(sutunlar.map((x) => x.name));
  (gununOturumlari || []).forEach((o) =>
    (o.salonlar || []).forEach((sl) => {
      if (!bilinen.has(sl)) {
        bilinen.add(sl);
        sutunlar.push({ name: sl, capacity: '' });
      }
    })
  );
  const n = SAAT_DILIMLERI.length;
  const izgara = SAAT_DILIMLERI.map((d) => ({
    etiket: d.etiket,
    hucreler: sutunlar.map(() => null),
  }));

  sutunlar.forEach((sutun, ci) => {
    const bloklar = (gununOturumlari || [])
      .filter((o) => (o.salonlar || []).includes(sutun.name))
      .map((o) => {
        const bas = dakikaya(o.timeSlot);
        let i = Math.floor((bas - BAS_DK) / 30);
        i = Math.max(0, Math.min(n - 1, i));
        const bitis = bas + (sayi(o.sure) || 60);
        let j = Math.ceil((bitis - BAS_DK) / 30);
        j = Math.max(i + 1, Math.min(n, j));
        return { i, j, o };
      })
      .sort((a, b) => a.i - b.i || b.j - a.j);
    const birlesik = [];
    bloklar.forEach((b) => {
      const son = birlesik[birlesik.length - 1];
      if (son && b.i < son.j) {
        son.j = Math.max(son.j, b.j);
        son.oturumlar.push(b.o);
        son.cakisma = true;
      } else {
        birlesik.push({ i: b.i, j: b.j, oturumlar: [b.o], cakisma: false });
      }
    });
    birlesik.forEach((b) => {
      const ilk = b.oturumlar[0];
      izgara[b.i].hucreler[ci] = {
        metin: b.oturumlar.map((o) => o[metinAlani] || o.metin).join('\n— ÇAKIŞMA —\n'),
        renk: ilk.renk,
        satirSayisi: b.j - b.i,
        gizli: false,
        cakisma: b.cakisma,
        oturumlar: b.oturumlar,
      };
      for (let r = b.i + 1; r < b.j; r++) izgara[r].hucreler[ci] = { gizli: true };
    });
  });
  return { salonlar: sutunlar, satirlar: izgara };
}

// ── GÜN LİSTESİ ──

const tarihNesne = (iso) => {
  const [y, m, d] = metin(iso).split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
};
const isoTarih = (dt) => dt.getFullYear() + '-' + iki(dt.getMonth() + 1) + '-' + iki(dt.getDate());
const GUNLER = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
const KISA_GUNLER = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'];

/** İlk ve son sınav günü arasındaki bütün hafta içi günler (boş günler dahil). */
export function sinavGunleri(sinavlar, ekGunler) {
  const tarihler = tekil([...(sinavlar || []).map((s) => s && s.date), ...(ekGunler || [])]).sort();
  if (tarihler.length === 0) return [];
  const out = [];
  const son = tarihNesne(tarihler[tarihler.length - 1]);
  for (let d = tarihNesne(tarihler[0]); d <= son; d.setDate(d.getDate() + 1)) {
    const hg = d.getDay();
    const iso = isoTarih(d);
    if ((hg === 0 || hg === 6) && !tarihler.includes(iso)) continue;
    out.push({
      tarih: iso,
      kisa: iki(d.getDate()) + '.' + iki(d.getMonth() + 1),
      gun: GUNLER[hg],
      kisaGun: KISA_GUNLER[hg],
    });
  }
  return out;
}

/**
 * Bütün çalışma kitabının modeli — ekran ve Excel ortak kullanır.
 * @param {object} p { sinavlar, salonlar, bolumler, ayar: {bolumler, kisaltmalar}, ekGunler }
 */
export function fakulteKitabi(p) {
  const o = p || {};
  const ayar = o.ayar || {};
  const bolumBilgisi = bolumBilgileri(o.bolumler, ayar.bolumler);
  // Kısaltma yalnız gözetmenlere: kendi sınavındaki hoca "Dersin Öğr.
  // Elemanı" yazılır, kısaltması olmaz.
  const tumGozetmenler = tekil(
    fakulteOturumlari(o.sinavlar, { bolumBilgisi }).flatMap((x) => x.digerGozetmenler)
  );
  const kisaltmalar = kisaltmaHaritasi(tumGozetmenler, ayar.kisaltmalar);
  const tumOturumlar = fakulteOturumlari(o.sinavlar, {
    bolumBilgisi,
    kisaltmalar,
    ozelRenkler: ayar.ozelRenkler,
  });
  const gunler = sinavGunleri(o.sinavlar, o.ekGunler).map((g) => {
    const gununkiler = tumOturumlar.filter((x) => x.date === g.tarih);
    return {
      ...g,
      oturumSayisi: gununkiler.length,
      salonsuz: gununkiler.filter((x) => x.salonlar.length === 0),
      tablo: gunTablosu(gununkiler, o.salonlar, o.tabloSecenek),
    };
  });
  return {
    bolumBilgisi,
    kisaltmalar,
    kisaltmaSatirlari: kisaltmaListesi(tumOturumlar, kisaltmalar),
    oturumlar: tumOturumlar,
    gunler,
  };
}

// ── BÖLÜM GÖNDERİMİ ──

/** Gönderim kaydının kimliği: bölüm + dönem grubu. */
export function gonderimKimligi(bolumId, grup) {
  return (metin(bolumId) + '__' + metin(grup)).replace(/[^\p{L}\p{N}_|-]+/gu, '_');
}

/**
 * Programın parmak izi: gönderimden sonra değişti mi? Yalnız fakülteyi
 * ilgilendiren alanlar (ders, gün, saat, süre, salon, gözetmen, öğrenci).
 */
export function programImzasi(sinavlar) {
  const satirlar = (sinavlar || [])
    .filter(Boolean)
    .map((s) =>
      [
        s.code,
        s.date,
        s.timeSlot,
        sayi(s.duration),
        metin(s.room),
        metin(s.supervisor),
        sayi(s.studentCount),
        metin(s.birlesimId) ? 'B' : '',
      ]
        .map(metin)
        .join('~')
    )
    .sort();
  let h = 5381;
  const t = satirlar.join('\n');
  for (let i = 0; i < t.length; i++) h = ((h << 5) + h + t.charCodeAt(i)) >>> 0;
  return satirlar.length + ':' + h.toString(36);
}

/**
 * Bölümün gönderim durumu.
 * @returns {'bekliyor'|'gonderildi'|'degisti'|'iade'}
 */
export function gonderimDurumu(kayit, guncelImza) {
  if (!kayit || !metin(kayit.durum)) return 'bekliyor';
  if (kayit.durum === 'iade') return 'iade';
  if (kayit.durum === 'gonderildi') {
    return metin(kayit.imza) && metin(guncelImza) && kayit.imza !== guncelImza
      ? 'degisti'
      : 'gonderildi';
  }
  return 'bekliyor';
}

export const GONDERIM_ETIKETI = {
  bekliyor: 'Gönderilmedi',
  gonderildi: 'Gönderildi',
  degisti: 'Gönderimden sonra değişti',
  iade: 'İade edildi',
};

// ── BÖLÜMLER ARASI BİRLEŞTİRME ──

/**
 * Dekanlığın birleştirebileceği sınavlar. Aynı dersi birden çok bölüme veren
 * akademisyen her bölümde dersi AYRI girer (öğrenci sayıları farklı); aynı
 * gün ve saatte, farklı bölümlerden, aynı ders (kod / ad kökü) ya da aynı
 * hoca olan ve henüz tek oturumda olmayan sınavlar önerilir.
 * @returns {{anahtar, date, timeSlot, sinavlar:object[], bolumler:string[], neden:string}[]}
 */
export function birlestirmeOnerileri(sinavlar) {
  const l = (Array.isArray(sinavlar) ? sinavlar : []).filter(
    (s) => s && metin(s.date) && metin(s.timeSlot) && metin(s.departmentId)
  );
  const saatler = new Map();
  l.forEach((s) => {
    const k = s.date + '|' + s.timeSlot;
    if (!saatler.has(k)) saatler.set(k, []);
    saatler.get(k).push(s);
  });
  const out = [];
  saatler.forEach((grup) => {
    const kullanilan = new Set();
    const anahtarlar = [
      ['ders', (s) => kodAnahtari(s.code)],
      ['ders', (s) => dersAdiKoku(s.name)],
      ['hoca', (s) => adAnahtari(s.professor)],
    ];
    anahtarlar.forEach(([neden, f]) => {
      const kume = new Map();
      grup.forEach((s) => {
        if (kullanilan.has(s)) return;
        const k = f(s);
        if (!k) return;
        if (!kume.has(k)) kume.set(k, []);
        kume.get(k).push(s);
      });
      kume.forEach((uyeler) => {
        const bolumler = tekil(uyeler.map((u) => u.departmentId));
        if (bolumler.length < 2) return;
        const bid = tekil(uyeler.map((u) => u.birlesimId));
        if (bid.length === 1 && uyeler.every((u) => metin(u.birlesimId))) return; // zaten tek oturum
        uyeler.forEach((u) => kullanilan.add(u));
        out.push({
          anahtar: uyeler
            .map((u) => u.id)
            .sort()
            .join('+'),
          date: uyeler[0].date,
          timeSlot: uyeler[0].timeSlot,
          sinavlar: uyeler,
          bolumler,
          neden: neden === 'hoca' ? 'Aynı öğretim elemanı' : 'Aynı ders',
        });
      });
    });
  });
  return out.sort((a, b) => (a.date + a.timeSlot).localeCompare(b.date + b.timeSlot));
}

/**
 * Sınavları tek oturumda birleştiren yamalar: ortak birleşim kimliği, salon
 * ve gözetmenlerin birleşimi (her bölümün kendi öğrencisi için ayırdığı
 * salonlar birlikte oturumun salonu olur).
 * @returns {{id, data}[]}
 */
export function birlestirmeYamalari(sinavlar, yeniKimlik) {
  const l = (Array.isArray(sinavlar) ? sinavlar : []).filter(Boolean);
  const bid = tekil(l.map((s) => s.birlesimId))[0] || metin(yeniKimlik);
  const salon = tekil(l.flatMap((s) => salonParcalari(s.room))).join(' - ');
  const gozetmen = tekil(l.flatMap((s) => gozetmenParcalari(s.supervisor))).join(', ');
  return l.map((s) => ({
    id: s.id,
    data: { birlesimId: bid, room: salon, supervisor: gozetmen },
  }));
}
