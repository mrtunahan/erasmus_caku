// ══════════════════════════════════════════════════════════════
// SINAVA YAYILIM — başka modüldeki değişiklik yerleşmiş sınavlara
//
// Ders, salon ya da gözetmen başka bir ekranda değişince yerleşmiş sınavlar
// eski bilgiyi taşımaya devam ediyordu (eski hoca kendi sınavına yazılıyor,
// silinen dersin sınavı takvimde kalıyor, adı değişen salon çakışma
// denetiminden kaçıyordu). Buradaki işlevler YALNIZ HESAPLAR: hangi sınava
// ne yazılacağını döndürür. Yazma kararı ekranındır ve her zaman kullanıcıya
// sorulduktan sonra yapılır.
//
// Fakülteye gönderilmiş programın sınavı bölüm tarafınca değiştirilemez
// (sunucu reddeder): `sinavKilitliMi` bunları önceden ayırır.
// ══════════════════════════════════════════════════════════════

import { donemGrubu, gonderimKimlikleri } from './sinav-fakulte.js';
import { adAnahtari } from './gozetmen.js';

const metin = (v) => String(v == null ? '' : v).trim();
const kimligi = (x) => metin(x && (x.id || x._docId || (x._id && String(x._id))));
const salonParcala = (v) =>
  metin(v)
    .split(/\s+-\s+|,/)
    .map(metin)
    .filter(Boolean);
const gozetmenParcala = (v) => metin(v).split(',').map(metin).filter(Boolean);

/**
 * Sınav, bölümünün fakülteye GÖNDERDİĞİ bir dönem grubunda mı?
 * @param {object} sinav
 * @param {object} p { donemler, gonderimler, varyant: (bolumId) => string[] }
 */
export function sinavKilitliMi(sinav, p) {
  const o = p || {};
  if (!sinav) return false;
  const donem = (o.donemler || []).find((d) => kimligi(d) === metin(sinav.periodId));
  if (!donem) return false;
  const bolum = metin(sinav.departmentId) || metin(donem.departmentId);
  if (!bolum) return false;
  const grup = donemGrubu(donem);
  const varyant = typeof o.varyant === 'function' ? o.varyant : (b) => [b];
  const idler = new Set();
  [bolum, ...(varyant(bolum) || [])].forEach((v) =>
    gonderimKimlikleri(v, grup).forEach((k) => idler.add(k))
  );
  return (o.gonderimler || []).some(
    (g) =>
      g &&
      metin(g.durum) === 'gonderildi' &&
      [g.id, g._docId, g._id && String(g._id)].some((k) => k && idler.has(String(k)))
  );
}

// ── B1: DERS DEĞİŞİKLİĞİ ──

/** Dersten sınava kopyalanan alanlar. */
export const DERS_SINAV_ALANLARI = ['code', 'name', 'sinif', 'duration', 'professor', 'professors'];

const esit = (a, b) => JSON.stringify(a == null ? '' : a) === JSON.stringify(b == null ? '' : b);

/**
 * Ders kaydı değişince o derse bağlı sınavlara yazılacak alanlar.
 *
 * Yalnız sınavda hâlâ dersin ESKİ değerini taşıyan alan güncellenir: sınavda
 * elle farklı girilmiş bir değer (ör. o oturum için başka hoca) ezilmez.
 *
 * @param {object} eski  dersin önceki hâli
 * @param {object} yeni  dersin yeni hâli (kaydedilen alanlar)
 * @param {object[]} sinavlar bu derse bağlı sınavlar (courseId === ders)
 * @returns {{id:string, data:object, sinav:object}[]}
 */
export function dersYayilimYamalari(eski, yeni, sinavlar) {
  const e = eski || {};
  const y = yeni || {};
  const degisen = DERS_SINAV_ALANLARI.filter((k) => k in y && !esit(e[k], y[k]));
  if (degisen.length === 0) return [];
  return (sinavlar || [])
    .map((s) => {
      const data = {};
      degisen.forEach((k) => {
        // Sınavda alan yoksa (eski kayıt) ya da dersin eski değeriyse yazılır.
        const sv = s[k];
        if (sv == null || sv === '' || esit(sv, e[k])) {
          if (!esit(sv, y[k])) data[k] = y[k];
        }
      });
      return { id: kimligi(s), data, sinav: s };
    })
    .filter((x) => x.id && Object.keys(x.data).length > 0);
}

// ── B2: DERS SİLME ──

/**
 * Ders silinince silinecek sınavlar ve ortak oturumdan geriye tek kalan
 * üyelerin bağ çözme yamaları.
 * @param {object[]} dersinSinavlari  silinecek sınavlar
 * @param {object[]} tumSinavlar      ortak oturum üyelerini bulmak için
 * @returns {{silinecek:string[], bagCoz:{id, data}[]}}
 */
export function dersSilmePlani(dersinSinavlari, tumSinavlar) {
  const silinecek = (dersinSinavlari || []).map(kimligi).filter(Boolean);
  const silSet = new Set(silinecek);
  const bagCoz = [];
  const oturumlar = new Set(
    (dersinSinavlari || []).map((s) => metin(s && s.birlesimId)).filter(Boolean)
  );
  oturumlar.forEach((bid) => {
    const kalan = (tumSinavlar || []).filter(
      (s) => s && metin(s.birlesimId) === bid && !silSet.has(kimligi(s))
    );
    if (kalan.length === 1) bagCoz.push({ id: kimligi(kalan[0]), data: { birlesimId: '' } });
  });
  return { silinecek, bagCoz };
}

// ── B3: SALON ADI DEĞİŞİKLİĞİ ──

/**
 * Salon adı değişince sınav kayıtlarındaki salon metni ("M101 - M102"),
 * otomatik eklenen salon ve salon başına gözetmen dağılımı da çevrilir.
 * @returns {{id, data, sinav}[]}
 */
export function salonAdiYamalari(eskiAd, yeniAd, sinavlar) {
  const eski = metin(eskiAd);
  const yeni = metin(yeniAd);
  if (!eski || !yeni || eski === yeni) return [];
  const cevir = (v) => salonParcala(v).map((x) => (x === eski ? yeni : x));
  return (sinavlar || [])
    .map((s) => {
      const data = {};
      if (salonParcala(s.room).includes(eski)) data.room = cevir(s.room).join(' - ');
      if (salonParcala(s.otomatikEkSalon).includes(eski))
        data.otomatikEkSalon = cevir(s.otomatikEkSalon).join(' - ');
      if (
        Array.isArray(s.salonGozetmenleri) &&
        s.salonGozetmenleri.some((x) => x && metin(x.salon) === eski)
      ) {
        data.salonGozetmenleri = s.salonGozetmenleri.map((x) =>
          x && metin(x.salon) === eski ? { ...x, salon: yeni } : x
        );
      }
      return { id: kimligi(s), data, sinav: s };
    })
    .filter((x) => x.id && Object.keys(x.data).length > 0);
}

/** Bu salonu kullanan sınavlar (silme/yeniden adlandırma uyarısı için). */
export function salonuKullananlar(salonAd, sinavlar, bugun) {
  const ad = metin(salonAd);
  if (!ad) return [];
  return (sinavlar || []).filter(
    (s) =>
      s &&
      salonParcala(s.room).includes(ad) &&
      (!bugun || !metin(s.date) || metin(s.date) >= metin(bugun))
  );
}

/**
 * Ders programı (course_schedules) slotlarında salon adı çevirisi. Slotun
 * kendi salonu, ek dersleri (`dersler`) ve eski `ikinci` alanı çevrilir.
 * @param {object} slots  { "<gün>_<saat>": slot | slot[] }
 * @returns {{slots:object, degisen:number}}
 */
export function programSalonCevir(slots, eskiAd, yeniAd) {
  const eski = metin(eskiAd);
  const yeni = metin(yeniAd);
  let degisen = 0;
  const tek = (d) => {
    if (d && typeof d === 'object' && metin(d.classroom) === eski) {
      degisen++;
      return { ...d, classroom: yeni };
    }
    return d;
  };
  const slotCevir = (d) => {
    if (!d || typeof d !== 'object') return d;
    let x = tek(d);
    if (Array.isArray(x.dersler)) x = { ...x, dersler: x.dersler.map(tek) };
    if (x.ikinci && typeof x.ikinci === 'object') x = { ...x, ikinci: tek(x.ikinci) };
    return x;
  };
  const out = {};
  Object.entries(slots || {}).forEach(([k, v]) => {
    out[k] = Array.isArray(v) ? v.map(slotCevir) : slotCevir(v);
  });
  return { slots: out, degisen };
}

// ── B5: GÖZETMENLİKTEN ÇIKARMA / MÜSAİT DEĞİL GÜNÜ ──

/**
 * Kişinin OTOMATİK atandığı sınavlardan çıkarılması; elle girilmiş
 * atamalar ayrıca listelenir (onlara dokunulmaz, yetkili karar verir).
 *
 * @param {string} ad
 * @param {object[]} sinavlar  bölümün (gelecekteki) sınavları
 * @param {object} [s] { gunler: ['2026-11-09'] } — verilirse yalnız o günler
 * @returns {{yamalar:{id,data,sinav}[], elle:object[]}}
 */
export function gozetmenCikarmaPlani(ad, sinavlar, s) {
  const k = adAnahtari(ad);
  const gunler = s && Array.isArray(s.gunler) ? new Set(s.gunler.map(metin)) : null;
  const yamalar = [];
  const elle = [];
  if (!k) return { yamalar, elle };
  (sinavlar || []).forEach((e) => {
    if (!e || (gunler && !gunler.has(metin(e.date)))) return;
    const liste = gozetmenParcala(e.supervisor);
    if (!liste.some((g) => adAnahtari(g) === k)) return;
    if (!e.otomatikGozetmen) {
      elle.push(e);
      return;
    }
    const kalan = liste.filter((g) => adAnahtari(g) !== k);
    const data = { supervisor: kalan.join(', ') };
    if (kalan.length === 0) data.otomatikGozetmen = false;
    if (Array.isArray(e.salonGozetmenleri) && e.salonGozetmenleri.length) {
      data.salonGozetmenleri = e.salonGozetmenleri.map((x) => ({
        ...x,
        gozetmenler: (x.gozetmenler || []).filter((g) => adAnahtari(g) !== k),
      }));
    }
    yamalar.push({ id: kimligi(e), data, sinav: e });
  });
  return { yamalar, elle };
}
