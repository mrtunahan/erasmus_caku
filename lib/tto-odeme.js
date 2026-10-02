// ══════════════════════════════════════════════════════════════
// TTO — DANIŞMANLIK İŞ KAYITLARI VE AKADEMİSYEN ÖDEMELERİ (yönetici tarafı)
//
// TTO'nun firmalara yaptığı danışmanlık işlerinin ve bu işlerden
// akademisyene yapılan ödemelerin defteri. Daha önce ayrı bir uygulamada
// (TTO Otomasyonu — FastAPI + SQLite) tutuluyordu; kurallar ve hesaplama
// zinciri oradan birebir taşındı.
//
// Koleksiyonlar (yalnız TTO birimine kayıtlı akademisyen ve admin; sunucu
// kapısı server/routes/db.js):
//   tto_firmalar        { ad, vergiNo, vergiDairesi, eposta }
//   tto_akademisyenler  { ad, iban, bolum, fakulte }
//   tto_projeler        { ad, aciklama }
//   tto_oranlar         doc id = yıl; { yil, kdv, tevkifat, ttoPayi, stopaj } (yüzde)
//   tto_is_kayitlari    { yil, siraNo, firmaId, akademisyenId, projeId, yapilanIs,
//                         talepTarihi, faturaKurus … digerFonKurus, manuelDuzeltme,
//                         tahsilat, odeme, odemeTarihi, ibanAnlik, notlar }
//
// Bu dosya İSTEMCİ ve SUNUCUNUN ORTAK kural dosyasıdır (bkz. tto-talep.js):
// arayüz önizlemeyi bununla hesaplar (tto-otomasyon/api.js), sunucu aynı
// fonksiyonla yeniden hesaplayıp doğrular. İki kopya tutulsaydı biri değişip
// öteki kalırdı.
//
// ── PARA ──
// Tutarlar KURUŞ cinsinden TAM SAYI saklanır (alan adları `…Kurus`).
// Kayan nokta 0,1 + 0,2 ≠ 0,3 der; muhasebe defterinde bir kuruşluk sapma
// bile kabul edilemez. Çarpımlar BigInt ile yapılır, yuvarlama eski
// uygulamanın Decimal ROUND_HALF_UP kuralıyla aynıdır.
// ══════════════════════════════════════════════════════════════

import { trAnahtar } from './tr-metin.js';

const metin = (v) => String(v == null ? '' : v).trim();

// Yalnız yönetici tarafının okuyup yazabildiği koleksiyonlar.
export const TTO_ODEME_KOLEKSIYONLARI = [
  'tto_firmalar',
  'tto_akademisyenler',
  'tto_projeler',
  'tto_oranlar',
  'tto_is_kayitlari',
];

export function ttoOdemeKoleksiyonuMu(ad) {
  return TTO_ODEME_KOLEKSIYONLARI.indexOf(ad) >= 0;
}

// ══════════════════════════════════════════════════════════════
// PARA BİÇİMİ
// ══════════════════════════════════════════════════════════════

// Tek bir kayıtta olabilecek en büyük tutar (eski şemadaki Numeric(12,2)).
export const TTO_AZAMI_KURUS = 999999999999;

/**
 * Kullanıcının yazdığı tutarı kuruşa çevirir. Türkçe ("10.000,50") ve
 * noktalı ("10000.50") yazımın ikisi de kabul edilir. Geçersizse null.
 */
export function tlKurusa(deger) {
  if (typeof deger === 'number') {
    if (!Number.isFinite(deger) || deger < 0) return null;
    const k = Math.round(deger * 100);
    return k <= TTO_AZAMI_KURUS ? k : null;
  }
  let s = metin(deger).replace(/\s+/g, '').replace(/₺/g, '').replace(/tl$/i, '');
  if (!s) return null;
  const sonNokta = s.lastIndexOf('.');
  const sonVirgul = s.lastIndexOf(',');
  if (sonNokta >= 0 && sonVirgul >= 0) {
    // İkisi birden varsa sonda olan ondalık ayırıcıdır.
    const ondalik = sonVirgul > sonNokta ? ',' : '.';
    const binlik = ondalik === ',' ? '.' : ',';
    s = s.split(binlik).join('').replace(ondalik, '.');
  } else if (sonVirgul >= 0) {
    // Yalnız virgül: Türkçe ondalık ayırıcı.
    s = s.replace(',', '.');
  } else if (sonNokta >= 0 && /^\d{1,3}(\.\d{3})+$/.test(s)) {
    // "10.000" → on bin (Türkçe binlik ayırıcı); "10.5" → on buçuk.
    s = s.split('.').join('');
  }
  if (!/^\d+(\.\d{1,2})?$/.test(s)) return null;
  const [tam, kesir = ''] = s.split('.');
  const k = Number(tam) * 100 + Number((kesir + '00').slice(0, 2));
  return Number.isSafeInteger(k) && k <= TTO_AZAMI_KURUS ? k : null;
}

/** 1000050 → "10.000,50" */
export function kurusTl(kurus) {
  const k = Number(kurus);
  if (!Number.isFinite(k)) return '';
  const eksi = k < 0;
  const mutlak = Math.abs(Math.round(k));
  const tam = String(Math.floor(mutlak / 100)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const kesir = String(mutlak % 100).padStart(2, '0');
  return (eksi ? '-' : '') + tam + ',' + kesir;
}

// ══════════════════════════════════════════════════════════════
// ORANLAR (yıl bazında)
// ══════════════════════════════════════════════════════════════
export const TTO_ORAN_ALANLARI = [
  { id: 'kdv', label: 'KDV oranı', ipucu: 'Fatura tutarı üzerinden' },
  { id: 'tevkifat', label: 'Tevkifat oranı', ipucu: 'KDV tutarı üzerinden' },
  { id: 'ttoPayi', label: 'TTO payı', ipucu: 'Fatura tutarı üzerinden' },
  { id: 'stopaj', label: 'Stopaj oranı', ipucu: 'TTO payı sonrası tutar üzerinden' },
];

/** "%15", "15", "15,5" → 15.5 (yüzde). Geçersizse null. */
export function yuzdeOku(deger) {
  if (typeof deger === 'number') {
    return Number.isFinite(deger) && deger >= 0 && deger <= 100 && binde(deger) != null
      ? deger
      : null;
  }
  const s = metin(deger).replace('%', '').replace(/\s+/g, '').replace(',', '.');
  if (!/^\d{1,3}(\.\d{1,2})?$/.test(s)) return null;
  const n = Number(s);
  return n <= 100 ? n : null;
}

// Yüzdeyi on binde birlik tam sayıya çevirir (15,5 → 1550). İkiden fazla
// ondalık basamak kabul edilmez: eski şemada oranlar Numeric(12,2) idi.
function binde(yuzde) {
  const b = Math.round(Number(yuzde) * 100);
  return Math.abs(b - Number(yuzde) * 100) < 1e-6 ? b : null;
}

/** Oran kaydının hataları (boşsa geçerli). */
export function oranHatalari(kayit) {
  const k = kayit || {};
  const hatalar = [];
  const yil = Number(k.yil);
  if (!Number.isInteger(yil) || yil < 2000 || yil > 2100) hatalar.push('Yıl geçerli değil.');
  TTO_ORAN_ALANLARI.forEach((a) => {
    if (yuzdeOku(k[a.id]) == null) hatalar.push(a.label + ' 0 ile 100 arasında olmalıdır.');
  });
  return hatalar;
}

// ══════════════════════════════════════════════════════════════
// HESAPLAMA ZİNCİRİ
//
//   1. kdv            = fatura × KDV oranı
//   2. tevkifat       = kdv × tevkifat oranı
//   3. ttoPayi        = fatura × TTO payı oranı
//   4. ttoSonrasi     = fatura − ttoPayi
//   5. stopajSonrasi  = ttoSonrasi × (1 − stopaj oranı)
//   6. net            = stopajSonrasi − diğer fon & harçlar   (akademisyene)
//
// Her adım kendi içinde kuruşa yuvarlanır (yarım yukarı) — Excel'deki ve
// eski uygulamadaki sonuçlarla kuruşu kuruşuna aynı olsun diye.
// ══════════════════════════════════════════════════════════════
function oranla(kurus, bindeOran) {
  return Number((BigInt(kurus) * BigInt(bindeOran) + 5000n) / 10000n);
}

// Hesaplanan (elle düzeltilebilen) alanlar — kayıt formunda ve Excel'de bu sırayla.
export const TTO_HESAP_ALANLARI = [
  { id: 'kdvKurus', label: 'KDV' },
  { id: 'tevkifatKurus', label: 'Tevkifat' },
  { id: 'ttoPayiKurus', label: 'TTO payı' },
  { id: 'ttoSonrasiKurus', label: 'TTO payı sonrası' },
  { id: 'stopajSonrasiKurus', label: 'Stopaj sonrası' },
];

/**
 * @param {number} faturaKurus
 * @param {object} oranlar  tto_oranlar kaydı ({ kdv, tevkifat, ttoPayi, stopaj } yüzde)
 * @param {number} [digerFonKurus]
 */
export function hesapla(faturaKurus, oranlar, digerFonKurus) {
  const o = oranlar || {};
  const b = {};
  TTO_ORAN_ALANLARI.forEach((a) => {
    const y = yuzdeOku(o[a.id]);
    b[a.id] = y == null ? null : binde(y);
  });
  if (Object.keys(b).some((a) => b[a] == null)) return null;
  const fatura = Math.max(0, Math.round(Number(faturaKurus) || 0));
  const kdvKurus = oranla(fatura, b.kdv);
  const tevkifatKurus = oranla(kdvKurus, b.tevkifat);
  const ttoPayiKurus = oranla(fatura, b.ttoPayi);
  const ttoSonrasiKurus = fatura - ttoPayiKurus;
  const stopajSonrasiKurus = oranla(ttoSonrasiKurus, 10000 - b.stopaj);
  const digerFon = Math.max(0, Math.round(Number(digerFonKurus) || 0));
  return {
    kdvKurus,
    tevkifatKurus,
    ttoPayiKurus,
    ttoSonrasiKurus,
    stopajSonrasiKurus,
    digerFonKurus: digerFon,
    netKurus: stopajSonrasiKurus - digerFon,
  };
}

/** Akademisyene ödenecek net tutar (kayıttaki değerlerden). */
export function netKurus(kayit) {
  const k = kayit || {};
  return (Number(k.stopajSonrasiKurus) || 0) - (Number(k.digerFonKurus) || 0);
}

// ══════════════════════════════════════════════════════════════
// DURUMLAR
// ══════════════════════════════════════════════════════════════
// İki aşamalı ödeme: firma → TTO (tahsilat), TTO → akademisyen (ödeme).
export const TTO_ODEME_DURUMLARI = {
  odenmedi: { label: 'Ödenmedi', renk: '#D97706' },
  odendi: { label: 'Ödendi', renk: '#059669' },
};
export const TTO_TAHSILAT_DURUMLARI = {
  edilmedi: { label: 'Tahsil edilmedi', renk: '#DC2626' },
  edildi: { label: 'Tahsil edildi', renk: '#2563EB' },
};

// ══════════════════════════════════════════════════════════════
// IBAN
// ══════════════════════════════════════════════════════════════
/** Boşlukları atar, büyük harfe çevirir. */
export function ibanSadele(iban) {
  return metin(iban).replace(/\s+/g, '').toUpperCase();
}

/** TR IBAN'ı: 26 karakter ve mod-97 denetimi. */
export function ibanGecerliMi(iban) {
  const s = ibanSadele(iban);
  if (!/^TR\d{24}$/.test(s)) return false;
  const duzen = s.slice(4) + s.slice(0, 4);
  let kalan = 0;
  for (const h of duzen) {
    const parca = /\d/.test(h) ? h : String(h.charCodeAt(0) - 55);
    for (const r of parca) kalan = (kalan * 10 + Number(r)) % 97;
  }
  return kalan === 1;
}

/** "TR330006100519786457841326" → "TR33 0006 1005 1978 6457 8413 26" */
export function ibanBicimle(iban) {
  const s = ibanSadele(iban);
  return s.replace(/(.{4})/g, '$1 ').trim();
}

// ══════════════════════════════════════════════════════════════
// FİRMA / AKADEMİSYEN
// ══════════════════════════════════════════════════════════════
const EPOSTA = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Aynı adda (büyük/küçük harf ve Türkçe harf farkı gözetmeden) başka kayıt var mı? */
export function adCakisiyorMu(liste, ad, haricId) {
  const a = trAnahtar(ad);
  if (!a) return false;
  return (liste || []).some(
    (x) => x && String(x.id) !== String(haricId || '') && trAnahtar(x.ad) === a
  );
}

export function firmaHatalari(firma) {
  const f = firma || {};
  const hatalar = [];
  if (!metin(f.ad)) hatalar.push('Firma adı zorunludur.');
  if (metin(f.eposta) && !EPOSTA.test(metin(f.eposta))) {
    hatalar.push('E-posta adresi geçerli değil.');
  }
  return hatalar;
}

export function akademisyenHatalari(ak) {
  const a = ak || {};
  const hatalar = [];
  if (!metin(a.ad)) hatalar.push('Akademisyen adı zorunludur.');
  if (metin(a.iban) && !ibanGecerliMi(a.iban)) {
    hatalar.push('IBAN geçerli değil (TR ile başlayan 26 karakter).');
  }
  return hatalar;
}

export function projeHatalari(proje) {
  return metin(proje && proje.ad) ? [] : ['Proje adı zorunludur.'];
}

const FIRMA_ALANLARI = ['ad', 'vergiNo', 'vergiDairesi', 'eposta'];
const AKADEMISYEN_ALANLARI = ['ad', 'iban', 'bolum', 'fakulte'];
const PROJE_ALANLARI = ['ad', 'aciklama'];

function sadeYazmaKarari(p, alanlar, hataBul, cins) {
  const tur = p && p.tur;
  const mevcut = (p && p.mevcut) || null;
  if (tur === 'delete') {
    if (mevcut && Number(p.kullanimSayisi) > 0) {
      return {
        izin: false,
        hata:
          'Bu ' +
          cins +
          ' ' +
          p.kullanimSayisi +
          ' iş kaydında geçiyor; silinemez. Önce o kayıtları düzenleyin ya da silin.',
      };
    }
    return { izin: true };
  }
  const veri = p && p.veri && typeof p.veri === 'object' ? p.veri : null;
  if (!veri) return { izin: false, hata: 'Geçersiz istek.' };
  if (tur === 'update' && !mevcut) return { izin: false, hata: 'Kayıt bulunamadı.' };
  const yasak = yasakAnahtarlar(veri);
  if (yasak.length > 0) return { izin: false, hata: 'Geçersiz alan: ' + yasak.join(', ') };
  Object.keys(veri).forEach((a) => {
    if (alanlar.indexOf(a) < 0) delete veri[a];
    else veri[a] = metin(veri[a]);
  });
  if ('iban' in veri) veri.iban = ibanSadele(veri.iban);
  const birlesik = Object.assign({}, mevcut || {}, veri);
  const hatalar = hataBul(birlesik);
  // `digerleri` yazılan kaydın KENDİSİNİ içermez (çağıran ayıklar).
  if (adCakisiyorMu(p.digerleri, birlesik.ad)) {
    hatalar.push('"' + metin(birlesik.ad) + '" adlı bir ' + cins + ' zaten kayıtlı.');
  }
  if (hatalar.length > 0) return { izin: false, hata: hatalar.join(' ') };
  return { izin: true };
}

/**
 * SUNUCU KARARI: firma yazması. `veri` yerinde temizlenir.
 * @param {object} p { tur, mevcut, veri, digerleri: [{id, ad}] (kendisi hariç), kullanimSayisi }
 */
export function firmaYazmaKarari(p) {
  return sadeYazmaKarari(p, FIRMA_ALANLARI, firmaHatalari, 'firma');
}

/** SUNUCU KARARI: akademisyen (ödeme defteri kaydı) yazması. */
export function akademisyenYazmaKarari(p) {
  return sadeYazmaKarari(p, AKADEMISYEN_ALANLARI, akademisyenHatalari, 'akademisyen');
}

/** SUNUCU KARARI: proje yazması. */
export function projeYazmaKarari(p) {
  return sadeYazmaKarari(p, PROJE_ALANLARI, projeHatalari, 'proje');
}

/**
 * SUNUCU KARARI: yıl oranı yazması. Belge kimliği yıldır.
 * @param {object} p { tur, docId, mevcut, veri, kullanimSayisi }
 */
export function oranYazmaKarari(p) {
  const tur = p && p.tur;
  if (tur === 'delete') {
    if (Number(p.kullanimSayisi) > 0) {
      return {
        izin: false,
        hata: 'Bu yılın ' + p.kullanimSayisi + ' iş kaydı var; oranı silinemez.',
      };
    }
    return { izin: true };
  }
  if (tur === 'add') return { izin: false, hata: 'Oran kaydı yıl kimliğiyle yazılmalıdır.' };
  const veri = p && p.veri && typeof p.veri === 'object' ? p.veri : null;
  if (!veri) return { izin: false, hata: 'Geçersiz istek.' };
  const yasak = yasakAnahtarlar(veri);
  if (yasak.length > 0) return { izin: false, hata: 'Geçersiz alan: ' + yasak.join(', ') };
  const alanlar = ['yil'].concat(TTO_ORAN_ALANLARI.map((a) => a.id));
  Object.keys(veri).forEach((a) => {
    if (alanlar.indexOf(a) < 0) delete veri[a];
  });
  TTO_ORAN_ALANLARI.forEach((a) => {
    if (a.id in veri) {
      const y = yuzdeOku(veri[a.id]);
      if (y != null) veri[a.id] = y;
    }
  });
  const birlesik = Object.assign({}, (p && p.mevcut) || {}, veri);
  birlesik.yil = Number(metin(p && p.docId));
  veri.yil = birlesik.yil;
  const hatalar = oranHatalari(birlesik);
  if (hatalar.length > 0) return { izin: false, hata: hatalar.join(' ') };
  return { izin: true };
}

// ══════════════════════════════════════════════════════════════
// İŞ KAYDI
// ══════════════════════════════════════════════════════════════
const TARIH = /^\d{4}-\d{2}-\d{2}$/;

function tarihGecerliMi(v) {
  if (!TARIH.test(v)) return false;
  const d = new Date(v + 'T00:00:00Z');
  return !isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v;
}

function kurusGecerliMi(v) {
  return Number.isSafeInteger(v) && v >= 0 && v <= TTO_AZAMI_KURUS;
}

/** Boş bir iş kaydı (yeni kayıt formu). */
export function bosIsKaydi(yil) {
  return {
    yil: yil || new Date().getFullYear(),
    firmaId: '',
    akademisyenId: '',
    projeId: '',
    yapilanIs: '',
    talepTarihi: '',
    faturaKurus: 0,
    kdvKurus: 0,
    tevkifatKurus: 0,
    ttoPayiKurus: 0,
    ttoSonrasiKurus: 0,
    stopajSonrasiKurus: 0,
    digerFonKurus: 0,
    manuelDuzeltme: false,
    tahsilat: 'edilmedi',
    tahsilTarihi: '',
    odeme: 'odenmedi',
    odemeTarihi: '',
    ibanAnlik: '',
    notlar: '',
    // TTO talebinden otomatik oluşturulduysa talebin kimliği (bir talep → bir kayıt).
    talepId: '',
  };
}

/** Kayıt hataları (hesaplanan alanların tutarlılığı hariç). */
export function isKaydiHatalari(kayit) {
  const k = kayit || {};
  const hatalar = [];
  const yil = Number(k.yil);
  if (!Number.isInteger(yil) || yil < 2000 || yil > 2100) hatalar.push('Yıl geçerli değil.');
  if (!metin(k.firmaId)) hatalar.push('Firma seçilmelidir.');
  if (!metin(k.akademisyenId)) hatalar.push('Akademisyen seçilmelidir.');
  if (!metin(k.yapilanIs)) hatalar.push('Yapılan iş zorunludur.');
  if (!kurusGecerliMi(k.faturaKurus) || k.faturaKurus === 0) {
    hatalar.push('Fatura tutarı sıfırdan büyük olmalıdır.');
  }
  TTO_HESAP_ALANLARI.concat([{ id: 'digerFonKurus', label: 'Diğer fon ve harçlar' }]).forEach(
    (a) => {
      if (!kurusGecerliMi(k[a.id])) hatalar.push(a.label + ' tutarı geçerli değil.');
    }
  );
  if (netKurus(k) < 0) hatalar.push('Diğer fon ve harçlar stopaj sonrası tutarı aşamaz.');
  if (!TTO_ODEME_DURUMLARI[k.odeme]) hatalar.push('Ödeme durumu geçerli değil.');
  if (metin(k.tahsilat) && !TTO_TAHSILAT_DURUMLARI[k.tahsilat]) {
    hatalar.push('Tahsilat durumu geçerli değil.');
  }
  if (metin(k.talepTarihi) && !tarihGecerliMi(k.talepTarihi)) {
    hatalar.push('Talep tarihi geçerli değil.');
  }
  if (metin(k.odemeTarihi) && !tarihGecerliMi(k.odemeTarihi)) {
    hatalar.push('Ödeme tarihi geçerli değil.');
  }
  if (metin(k.tahsilTarihi) && !tarihGecerliMi(k.tahsilTarihi)) {
    hatalar.push('Tahsil tarihi geçerli değil.');
  }
  return hatalar;
}

// Sunucunun damgaladığı alanlar: istemcinin yazdığı değer yok sayılır.
export const TTO_IS_KAYDI_SUNUCU_ALANLARI = ['siraNo'];

// Yazılabilir alanlar — bunun dışındaki her şey istekten düşer.
const IS_KAYDI_ALANLARI = Object.keys(bosIsKaydi(2000));

function yasakAnahtarlar(veri) {
  return Object.keys(veri).filter((k) => k.indexOf('.') >= 0 || k.charAt(0) === '$');
}

// Hesabı değiştiren girdiler: yalnız bunlardan biri değişince tutarlar
// yeniden hesaplanır. Ödeme durumunu işaretlemek gibi bir güncelleme, o yılın
// oranı sonradan değişmiş olsa bile kaydın tutarlarına DOKUNMAZ.
const HESAP_GIRDILERI = ['yil', 'faturaKurus', 'digerFonKurus', 'manuelDuzeltme'];

/** Türkiye saatiyle bugünün tarihi (YYYY-MM-DD). */
export function ttoBugun(simdi) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Istanbul' }).format(
    simdi || new Date()
  );
}

// ── İKİ AŞAMALI ÖDEME AKIŞI ──
//   1. aşama: Firma → TTO tahsilatı      (tahsilat + tahsilTarihi)
//   2. aşama: TTO → akademisyen ödemesi  (odeme + odemeTarihi)
// Aşama "yapıldı" işaretlenirken tarih verilmezse bugün yazılır; geri
// alınırsa tarih silinir. Akademisyene ödeme, firmadan tahsilat yapılmadan
// işaretlenemez (yalnız durum DEĞİŞİRKEN denetlenir; eski kayıtlar kilitlenmez).
function odemeAkisiniIsle(veri, mevcut, birlesik, simdi) {
  const eski = mevcut || {};
  const bugun = ttoBugun(simdi);
  const asama = (durumAlani, tarihAlani, yapildi) => {
    if (!(durumAlani in veri) || veri[durumAlani] === eski[durumAlani]) return;
    if (veri[durumAlani] === yapildi) {
      if (!metin(birlesik[tarihAlani])) veri[tarihAlani] = bugun;
    } else {
      veri[tarihAlani] = '';
    }
    birlesik[tarihAlani] = veri[tarihAlani];
  };
  asama('tahsilat', 'tahsilTarihi', 'edildi');
  asama('odeme', 'odemeTarihi', 'odendi');
  if (
    'odeme' in veri &&
    veri.odeme === 'odendi' &&
    eski.odeme !== 'odendi' &&
    birlesik.tahsilat !== 'edildi'
  ) {
    return 'Akademisyene ödeme, firmadan tahsilat yapıldıktan sonra işaretlenebilir.';
  }
  const ileri = ['tahsilTarihi', 'odemeTarihi'].filter((a) => a in veri && metin(veri[a]) > bugun);
  if (ileri.length > 0) return 'Tahsil ve ödeme tarihi ileri bir tarih olamaz.';
  return '';
}

/**
 * SUNUCU KARARI: iş kaydı yazması (yetki kontrolü çağıranda yapılmıştır).
 * `veri` YERİNDE temizlenir: bilinmeyen alanlar ve sıra no düşer. Manuel
 * düzeltme yoksa hesaplanan alanlara istemcinin gönderdiği değer yazılmaz:
 * yeni kayıtta ya da hesap girdisi değiştiğinde sunucuda yeniden hesaplanır,
 * aksi hâlde kayıttaki değer korunur.
 *
 * @param {object} p
 * @param {'add'|'set'|'update'|'delete'} p.tur
 * @param {object|null} p.mevcut    veritabanındaki kayıt
 * @param {object} p.veri           yazılacak gövde
 * @param {object|null} p.oranKaydi kaydın yılına ait tto_oranlar kaydı
 * @returns {{izin: boolean, hata?: string}}
 */
export function isKaydiYazmaKarari(p) {
  const tur = p && p.tur;
  const mevcut = (p && p.mevcut) || null;
  if (tur === 'delete') return { izin: true };
  const veri = p && p.veri && typeof p.veri === 'object' ? p.veri : null;
  if (!veri) return { izin: false, hata: 'Geçersiz istek.' };
  if (tur === 'update' && !mevcut) return { izin: false, hata: 'Kayıt bulunamadı.' };
  const yasak = yasakAnahtarlar(veri);
  if (yasak.length > 0) return { izin: false, hata: 'Geçersiz alan: ' + yasak.join(', ') };

  Object.keys(veri).forEach((a) => {
    if (IS_KAYDI_ALANLARI.indexOf(a) < 0) delete veri[a];
  });
  if ('yil' in veri) veri.yil = Number(veri.yil);
  if ('ibanAnlik' in veri) veri.ibanAnlik = ibanSadele(veri.ibanAnlik);

  const birlesik = Object.assign({}, mevcut || {}, veri);
  const akisHatasi = odemeAkisiniIsle(veri, mevcut, birlesik, p.simdi);
  if (akisHatasi) return { izin: false, hata: akisHatasi };
  const girdiDegisti =
    !mevcut || HESAP_GIRDILERI.some((a) => a in veri && String(veri[a]) !== String(mevcut[a]));
  if (!birlesik.manuelDuzeltme && !girdiDegisti) {
    TTO_HESAP_ALANLARI.forEach((a) => {
      delete veri[a.id];
      birlesik[a.id] = mevcut[a.id];
    });
  } else if (!birlesik.manuelDuzeltme) {
    const h = hesapla(birlesik.faturaKurus, p.oranKaydi, birlesik.digerFonKurus);
    if (!h) {
      return {
        izin: false,
        hata:
          birlesik.yil +
          " yılı için oran tanımlı değil. Önce Ayarlar'dan bu yılın oranlarını girin " +
          'ya da tutarları elle girin (manuel düzeltme).',
      };
    }
    TTO_HESAP_ALANLARI.forEach((a) => {
      veri[a.id] = h[a.id];
      birlesik[a.id] = h[a.id];
    });
  }
  const hatalar = isKaydiHatalari(birlesik);
  if (hatalar.length > 0) return { izin: false, hata: hatalar.join(' ') };
  return { izin: true };
}
