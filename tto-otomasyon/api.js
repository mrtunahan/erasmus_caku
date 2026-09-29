// ══════════════════════════════════════════════════════════════
// TTO Otomasyonu ekranlarının veri katmanı (uyum katmanı)
//
// Ekranlar orijinal uygulamadan BİREBİR taşındı ve FastAPI uçlarını
// çağırıyor (`apiFetch('/api/records/?year=2026')` gibi). Bu dosya aynı
// imzayı (apiFetch, ApiError) verir ve her ucu Offline Asistan'ın
// veritabanı API'si (/api/db) üzerinden, orijinalle AYNI biçimde yanıtlar:
// alan adları, tutarların "1234.56" metni, oranların "0.15" kesri, sayfalama.
//
// Kurallar ve hesaplama lib/tto-odeme.js'tedir; sunucu (server/routes/db.js)
// her yazmayı aynı dosyayla yeniden denetler. Buradaki hiçbir denetim
// yetki kapısı değildir — kapı sunucudadır.
//
// Koleksiyon ↔ orijinal tablo:
//   tto_firmalar ↔ firms · tto_akademisyenler ↔ academicians ·
//   tto_projeler ↔ projects · tto_oranlar ↔ settings · tto_is_kayitlari ↔ work_records
// ══════════════════════════════════════════════════════════════
import { hesapla, ibanSadele } from '../lib/tto-odeme.js';
import { trIcerir, trSirala } from '../lib/tr-metin.js';
import { calismaKitabiParcalari } from '../lib/xlsx-yaz.js';

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
    this.name = 'ApiError';
  }
}

// Orijinalde 401'de giriş ekranına dönülürdü; burada oturumu Offline Asistan
// yönetir. İmza sayfalar için korunur.
export function setUnauthorizedHandler() {}

let oturum = null;
/** Giriş yapan kullanıcı (AppShell'deki ad/unvan satırı için). */
export function oturumAyarla(kullanici) {
  oturum = kullanici || null;
}

// ── Para ve oran dönüşümleri ──
// Veritabanında kuruş (tam sayı); API'de orijinaldeki gibi "1234.56".
function kurusMetin(k) {
  const n = Math.round(Number(k) || 0);
  const m = Math.abs(n);
  return (n < 0 ? '-' : '') + Math.floor(m / 100) + '.' + String(m % 100).padStart(2, '0');
}
function metindenKurus(v, alan) {
  if (v === null || v === undefined || v === '') return 0;
  let s = String(v).trim().replace(/\s+/g, '');
  if (s.indexOf('.') < 0) s = s.replace(',', '.');
  if (!/^\d+(\.\d{1,2})?$/.test(s) && !/^\d+\.\d+$/.test(s)) {
    throw new ApiError((alan || 'Tutar') + ': geçerli bir sayı girin.', 422);
  }
  return Math.round(Number(s) * 100);
}
// Oran: veritabanında yüzde (15), API'de kesir ("0.15").
// Orijinal Decimal(12,2) gibi en az iki ondalık: 15 → "0.15", 10 → "0.10", 15.5 → "0.155".
const kesir = (yuzde) =>
  (Math.round(Number(yuzde) * 100) / 10000).toFixed(4).replace(/0{1,2}$/, '');
const yuzde = (kesirDeger) => Math.round(Number(kesirDeger) * 10000) / 100;

const bos = (v) => (v === undefined || v === null || String(v).trim() === '' ? null : v);
const metin = (v) => String(v == null ? '' : v).trim();

// ── Okuma (her çağrıda taze; önbellek yazmadan hemen sonra bayat kalırdı) ──
async function oku(koleksiyon) {
  try {
    const l = await window.apiRead.strict(koleksiyon);
    return Array.isArray(l) ? l : [];
  } catch (e) {
    throw new ApiError((e && e.message) || 'Veri okunamadı.', (e && e.status) || 500);
  }
}
async function yaz(islem) {
  try {
    return await islem();
  } catch (e) {
    const m = (e && e.message) || 'İşlem yapılamadı.';
    throw new ApiError(m, /zaten/.test(m) ? 409 : 400);
  }
}
const idAl = (r) => r && (r.id || (r.ids && r.ids[0]));

// ── Belge → orijinal yanıt biçimi ──
const firmaCevir = (d) => ({
  id: d.id,
  name: d.ad,
  tax_no: bos(d.vergiNo),
  tax_office: bos(d.vergiDairesi),
  contact_email: bos(d.eposta),
  created_at: d.createdAt || null,
});
const akademisyenCevir = (d) => ({
  id: d.id,
  full_name: d.ad,
  iban: bos(d.iban),
  department: bos(d.bolum),
  faculty: bos(d.fakulte),
  created_at: d.createdAt || null,
});
const projeCevir = (d) => ({
  id: d.id,
  name: d.ad,
  description: bos(d.aciklama),
  created_at: d.createdAt || null,
});
const oranCevir = (d) => ({
  id: Number(d.yil),
  valid_year: Number(d.yil),
  tto_share_rate: kesir(d.ttoPayi),
  withholding_rate: kesir(d.stopaj),
  vat_rate: kesir(d.kdv),
  invoice_withholding_rate: kesir(d.tevkifat),
});

const TAHSILAT = { edildi: 'Tahsil Edildi', edilmedi: 'Tahsil Edilmedi' };
const TAHSILAT_GERI = { 'Tahsil Edildi': 'edildi', 'Tahsil Edilmedi': 'edilmedi' };
const ODEME = { odendi: 'Ödendi', odenmedi: 'Ödenmedi' };
const ODEME_GERI = { Ödendi: 'odendi', Ödenmedi: 'odenmedi' };

function kayitCevir(k, h) {
  const f = h.firma[k.firmaId];
  const a = h.akademisyen[k.akademisyenId];
  const p = k.projeId ? h.proje[k.projeId] : null;
  const digerFon = Number(k.digerFonKurus) || 0;
  return {
    id: k.id,
    year: Number(k.yil),
    sira_no: k.siraNo,
    firm_id: k.firmaId,
    firm: f ? { id: f.id, name: f.ad, created_at: f.createdAt || null } : null,
    academician_id: k.akademisyenId,
    academician: a ? akademisyenCevir(a) : null,
    project_id: k.projeId || null,
    project: p ? { id: p.id, name: p.ad, created_at: p.createdAt || null } : null,
    work_done: k.yapilanIs,
    invoice_price: kurusMetin(k.faturaKurus),
    invoice_vat: kurusMetin(k.kdvKurus),
    withholding_tax: kurusMetin(k.tevkifatKurus),
    tto_share_amount: kurusMetin(k.ttoPayiKurus),
    amount_after_tto_share: kurusMetin(k.ttoSonrasiKurus),
    amount_after_withholding: kurusMetin(k.stopajSonrasiKurus),
    other_funds: kurusMetin(digerFon),
    final_net_payable: kurusMetin((Number(k.stopajSonrasiKurus) || 0) - digerFon),
    request_date: bos(k.talepTarihi),
    firm_collection_status: TAHSILAT[k.tahsilat] || null,
    payment_status: ODEME[k.odeme] || 'Ödenmedi',
    paid_date: bos(k.odemeTarihi),
    iban_snapshot: bos(k.ibanAnlik),
    notes: bos(k.notlar),
    is_manually_adjusted: !!k.manuelDuzeltme,
    created_at: k.createdAt || null,
    updated_at: k.updatedAt || null,
  };
}

function harita(liste) {
  const m = {};
  liste.forEach((x) => (m[x.id] = x));
  return m;
}

async function hepsiniOku() {
  const [firmalar, akademisyenler, projeler, kayitlar] = await Promise.all([
    oku('tto_firmalar'),
    oku('tto_akademisyenler'),
    oku('tto_projeler'),
    oku('tto_is_kayitlari'),
  ]);
  return {
    firmalar,
    akademisyenler,
    projeler,
    kayitlar,
    h: { firma: harita(firmalar), akademisyen: harita(akademisyenler), proje: harita(projeler) },
  };
}

// ── İş kaydı: orijinal gövde → veritabanı alanları (yalnız gönderilenler) ──
function kayitGovdesi(b) {
  const v = {};
  const para = (anahtar, alan, ad) => {
    if (anahtar in b) v[alan] = metindenKurus(b[anahtar], ad);
  };
  if ('year' in b) v.yil = Number(b.year);
  if ('firm_id' in b) v.firmaId = metin(b.firm_id);
  if ('academician_id' in b) v.akademisyenId = metin(b.academician_id);
  if ('project_id' in b) v.projeId = metin(b.project_id);
  if ('work_done' in b) v.yapilanIs = metin(b.work_done);
  if ('request_date' in b) v.talepTarihi = metin(b.request_date);
  para('invoice_price', 'faturaKurus', 'Fatura tutarı');
  para('invoice_vat', 'kdvKurus', 'KDV');
  para('withholding_tax', 'tevkifatKurus', 'Tevkifat');
  para('tto_share_amount', 'ttoPayiKurus', 'TTO payı');
  para('amount_after_tto_share', 'ttoSonrasiKurus', 'TTO payı sonrası');
  para('amount_after_withholding', 'stopajSonrasiKurus', 'Stopaj sonrası');
  para('other_funds', 'digerFonKurus', 'Diğer fon ve harçlar');
  if ('firm_collection_status' in b) v.tahsilat = TAHSILAT_GERI[b.firm_collection_status] || '';
  if ('payment_status' in b) {
    if (!ODEME_GERI[b.payment_status]) throw new ApiError('Ödeme durumu geçerli değil.', 422);
    v.odeme = ODEME_GERI[b.payment_status];
  }
  if ('paid_date' in b) v.odemeTarihi = metin(b.paid_date);
  if ('iban_snapshot' in b) v.ibanAnlik = ibanSadele(b.iban_snapshot);
  if ('notes' in b) v.notlar = metin(b.notes);
  if ('is_manually_adjusted' in b) v.manuelDuzeltme = !!b.is_manually_adjusted;
  return v;
}

// ── Süzgeç (orijinal records.py → _apply_filters) ──
function suz(kayitlar, q, h) {
  const yil = q.get('year');
  const firma = q.get('firm_id');
  const akad = q.get('academician_id');
  const odeme = q.get('payment_status');
  const ara = metin(q.get('search'));
  return kayitlar.filter((k) => {
    if (yil && Number(k.yil) !== Number(yil)) return false;
    if (firma && String(k.firmaId) !== String(firma)) return false;
    if (akad && String(k.akademisyenId) !== String(akad)) return false;
    if (odeme && (ODEME[k.odeme] || 'Ödenmedi') !== odeme) return false;
    if (ara) {
      const f = h.firma[k.firmaId];
      const a = h.akademisyen[k.akademisyenId];
      const havuz = [k.yapilanIs, f && f.ad, a && a.ad].join(' ');
      if (!trIcerir(havuz, ara)) return false;
    }
    return true;
  });
}

function sirala(kayitlar, artan) {
  const y = artan ? 1 : -1;
  return kayitlar
    .slice()
    .sort(
      (a, b) =>
        y * ((Number(a.yil) || 0) - (Number(b.yil) || 0)) ||
        y * ((Number(a.siraNo) || 0) - (Number(b.siraNo) || 0))
    );
}

const topla = (l, f) => l.reduce((t, k) => t + (Number(f(k)) || 0), 0);
const net = (k) => (Number(k.stopajSonrasiKurus) || 0) - (Number(k.digerFonKurus) || 0);

// ── Uçlar ──
async function kayitlarListesi(q) {
  const v = await hepsiniOku();
  const liste = sirala(suz(v.kayitlar, q, v.h), q.get('order') === 'asc');
  const boy = Math.min(200, Math.max(1, Number(q.get('page_size')) || 25));
  const sayfa = Math.max(1, Number(q.get('page')) || 1);
  return {
    total: liste.length,
    page: sayfa,
    page_size: boy,
    pages: Math.max(1, Math.ceil(liste.length / boy)),
    items: liste.slice((sayfa - 1) * boy, sayfa * boy).map((k) => kayitCevir(k, v.h)),
  };
}

async function kayitOzeti(q) {
  const v = await hepsiniOku();
  const l = suz(v.kayitlar, q, v.h);
  return {
    count: l.length,
    total_invoice_price: kurusMetin(topla(l, (k) => k.faturaKurus)),
    total_invoice_with_vat: kurusMetin(topla(l, (k) => (k.faturaKurus || 0) + (k.kdvKurus || 0))),
    total_tto_share_amount: kurusMetin(topla(l, (k) => k.ttoPayiKurus)),
    total_stopaj: kurusMetin(
      topla(l, (k) => (k.ttoSonrasiKurus || 0) - (k.stopajSonrasiKurus || 0))
    ),
    total_withholding_tax: kurusMetin(topla(l, (k) => k.tevkifatKurus)),
  };
}

async function oranBul(yil) {
  const oranlar = await oku('tto_oranlar');
  return oranlar.find((o) => Number(o.yil) === Number(yil)) || null;
}

async function onizleme(b) {
  const o = await oranBul(b.year);
  if (!o) {
    throw new ApiError(
      `${b.year} yılı için oran ayarı bulunamadı. Önce Ayarlar'dan bu yılın oranlarını ekleyin.`,
      404
    );
  }
  const fatura = metindenKurus(b.invoice_price, 'Fatura tutarı');
  const digerFon = metindenKurus(b.other_funds, 'Diğer fon ve harçlar');
  const h = hesapla(fatura, o, digerFon);
  const r = oranCevir(o);
  return {
    year: Number(b.year),
    invoice_price: kurusMetin(fatura),
    invoice_vat: kurusMetin(h.kdvKurus),
    withholding_tax: kurusMetin(h.tevkifatKurus),
    tto_share_amount: kurusMetin(h.ttoPayiKurus),
    amount_after_tto_share: kurusMetin(h.ttoSonrasiKurus),
    amount_after_withholding: kurusMetin(h.stopajSonrasiKurus),
    other_funds: kurusMetin(h.digerFonKurus),
    final_net_payable: kurusMetin(h.netKurus),
    rates_used: {
      tto_share_rate: r.tto_share_rate,
      withholding_rate: r.withholding_rate,
      vat_rate: r.vat_rate,
      invoice_withholding_rate: r.invoice_withholding_rate,
    },
  };
}

async function kayitGetir(id) {
  const v = await hepsiniOku();
  const k = v.kayitlar.find((x) => String(x.id) === String(id));
  if (!k) throw new ApiError('Kayıt bulunamadı.', 404);
  return kayitCevir(k, v.h);
}

async function akademisyenDetayi(id) {
  const v = await hepsiniOku();
  const a = v.h.akademisyen[id];
  if (!a) throw new ApiError('Akademisyen bulunamadı.', 404);
  const l = v.kayitlar.filter((k) => String(k.akademisyenId) === String(id));
  const odendi = (k) => k.odeme === 'odendi';
  const tahsil = (k) => k.tahsilat === 'edildi';
  const bekleyen = l.filter((k) => !odendi(k));
  const tahsilBekleyen = l.filter((k) => tahsil(k) && !odendi(k));
  const kayitlar = l
    .slice()
    .sort(
      (x, y) => (Number(y.yil) || 0) - (Number(x.yil) || 0) || (x.siraNo || 0) - (y.siraNo || 0)
    )
    .map((k) => {
      const c = kayitCevir(k, v.h);
      const f = v.h.firma[k.firmaId];
      c.firm = f ? firmaCevir(f) : null;
      if (c.project) c.project = projeCevir(v.h.proje[k.projeId]);
      delete c.academician;
      delete c.final_net_payable;
      return c;
    });
  return {
    ...akademisyenCevir(a),
    work_records: kayitlar,
    summary: {
      total_earned: kurusMetin(topla(l, net)),
      total_paid: kurusMetin(topla(l.filter(odendi), net)),
      pending_amount: kurusMetin(topla(bekleyen, net)),
      pending_count: bekleyen.length,
      total_invoice_price: kurusMetin(topla(l, (k) => k.faturaKurus)),
      total_collected: kurusMetin(topla(l.filter(tahsil), (k) => k.faturaKurus)),
      collected_pending_amount: kurusMetin(topla(tahsilBekleyen, net)),
      collected_pending_count: tahsilBekleyen.length,
    },
  };
}

async function firmaDetayi(id) {
  const v = await hepsiniOku();
  const f = v.h.firma[id];
  if (!f) throw new ApiError('Firma bulunamadı.', 404);
  const l = v.kayitlar.filter((k) => String(k.firmaId) === String(id));
  const akadlar = new Set(l.map((k) => String(k.akademisyenId)));
  const bolumler = new Set(
    Array.from(akadlar)
      .map((a) => v.h.akademisyen[a] && metin(v.h.akademisyen[a].bolum))
      .filter(Boolean)
  );
  const projeler = new Set(l.map((k) => k.projeId).filter(Boolean));
  // Aylık hakediş eğilimi — orijinaldeki gibi kaydın oluşturulma tarihine göre, son 6 ay.
  const aylik = {};
  l.forEach((k) => {
    const ay = String(k.createdAt || '').slice(0, 7);
    if (ay) aylik[ay] = (aylik[ay] || 0) + (Number(k.faturaKurus) || 0);
  });
  const trend = Object.keys(aylik)
    .sort()
    .map((ay) => ({ month: ay, total: kurusMetin(aylik[ay]) }))
    .slice(-6);
  const ilk = l
    .map((k) => k.createdAt)
    .filter(Boolean)
    .sort()[0];
  const kayitlar = sirala(l, false).map((k) => {
    const a = v.h.akademisyen[k.akademisyenId];
    const p = k.projeId ? v.h.proje[k.projeId] : null;
    return {
      id: k.id,
      year: Number(k.yil),
      sira_no: k.siraNo,
      work_done: k.yapilanIs,
      academician_id: k.akademisyenId,
      academician: a
        ? { id: a.id, full_name: a.ad, department: bos(a.bolum), faculty: bos(a.fakulte) }
        : null,
      project: p ? { id: p.id, name: p.ad } : null,
      invoice_price: kurusMetin(k.faturaKurus),
      tto_share_amount: kurusMetin(k.ttoPayiKurus),
      amount_after_withholding: kurusMetin(k.stopajSonrasiKurus),
      other_funds: kurusMetin(k.digerFonKurus),
      firm_collection_status: TAHSILAT[k.tahsilat] || null,
      payment_status: ODEME[k.odeme] || 'Ödenmedi',
      paid_date: bos(k.odemeTarihi),
    };
  });
  return {
    ...firmaCevir(f),
    summary: {
      record_count: l.length,
      total_invoice_price: kurusMetin(topla(l, (k) => k.faturaKurus)),
      total_tto_share_amount: kurusMetin(topla(l, (k) => k.ttoPayiKurus)),
      total_academician_gross: kurusMetin(topla(l, (k) => k.ttoSonrasiKurus)),
      distinct_academician_count: akadlar.size,
      distinct_department_count: bolumler.size,
      distinct_project_count: projeler.size,
      open_balance: kurusMetin(
        topla(
          l.filter((k) => k.odeme !== 'odendi'),
          net
        )
      ),
      first_record_at: ilk || null,
      monthly_trend: trend,
    },
    work_records: kayitlar,
  };
}

// ── Firma / akademisyen / proje: ortak liste–ekle–güncelle ──
const KISILER = {
  firms: {
    koleksiyon: 'tto_firmalar',
    cevir: firmaCevir,
    alanlar: { name: 'ad', tax_no: 'vergiNo', tax_office: 'vergiDairesi', contact_email: 'eposta' },
    bulunamadi: 'Firma bulunamadı.',
  },
  academicians: {
    koleksiyon: 'tto_akademisyenler',
    cevir: akademisyenCevir,
    alanlar: { full_name: 'ad', iban: 'iban', department: 'bolum', faculty: 'fakulte' },
    bulunamadi: 'Akademisyen bulunamadı.',
  },
  projects: {
    koleksiyon: 'tto_projeler',
    cevir: projeCevir,
    alanlar: { name: 'ad', description: 'aciklama' },
    bulunamadi: 'Proje bulunamadı.',
  },
};

function kisiGovdesi(t, b) {
  const v = {};
  Object.keys(t.alanlar).forEach((a) => {
    if (a in b) v[t.alanlar[a]] = metin(b[a]);
  });
  return v;
}

async function kisiListesi(t) {
  return (await oku(t.koleksiyon)).sort((a, b) => trSirala(a.ad, b.ad)).map(t.cevir);
}
async function kisiGetir(t, id) {
  const d = (await oku(t.koleksiyon)).find((x) => String(x.id) === String(id));
  if (!d) throw new ApiError(t.bulunamadi, 404);
  return t.cevir(d);
}

// ── Oranlar (settings) ──
function oranGovdesi(b) {
  const v = {};
  if ('tto_share_rate' in b) v.ttoPayi = yuzde(b.tto_share_rate);
  if ('withholding_rate' in b) v.stopaj = yuzde(b.withholding_rate);
  if ('vat_rate' in b) v.kdv = yuzde(b.vat_rate);
  if ('invoice_withholding_rate' in b) v.tevkifat = yuzde(b.invoice_withholding_rate);
  return v;
}

// ── Excel (orijinal records.py → export_records ile aynı sütunlar) ──
const EXCEL_BASLIKLARI = [
  'Yıl',
  'Sıra No',
  'Firma',
  'Akademisyen',
  'Proje',
  'Yapılan İş',
  'Fatura Tutarı',
  'KDV',
  'KDV Dahil Fatura',
  'Tevkifat',
  'TTO Payı',
  'TTO Payı Sonrası',
  'Stopaj Sonrası (Akademisyene Net)',
  'Diğer Fon & Harçlar',
  'Nihai Net Ödeme',
  'Firma Tahsilat Durumu',
  'Ödeme Durumu',
  'Talep Tarihi',
  'Ödeme Tarihi',
  'Notlar',
];

async function jszip() {
  if (window.JSZip) return window.JSZip;
  await new Promise((tamam, hata) => {
    const el = document.createElement('script');
    el.src = 'https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js';
    el.onload = tamam;
    el.onerror = () => hata(new Error('JSZip yüklenemedi'));
    document.head.appendChild(el);
  });
  return window.JSZip;
}

async function excelBlob(q) {
  const v = await hepsiniOku();
  const l = suz(v.kayitlar, q, v.h)
    .slice()
    .sort(
      (a, b) => (Number(b.yil) || 0) - (Number(a.yil) || 0) || (a.siraNo || 0) - (b.siraNo || 0)
    );
  const tl = (k) => Math.round(Number(k) || 0) / 100;
  const satirlar = [EXCEL_BASLIKLARI].concat(
    l.map((k) => {
      const f = v.h.firma[k.firmaId];
      const a = v.h.akademisyen[k.akademisyenId];
      const p = k.projeId ? v.h.proje[k.projeId] : null;
      return [
        Number(k.yil),
        Number(k.siraNo) || '',
        f ? f.ad : '',
        a ? a.ad : '',
        p ? p.ad : '',
        k.yapilanIs || '',
        tl(k.faturaKurus),
        tl(k.kdvKurus),
        tl((k.faturaKurus || 0) + (k.kdvKurus || 0)),
        tl(k.tevkifatKurus),
        tl(k.ttoPayiKurus),
        tl(k.ttoSonrasiKurus),
        tl(k.stopajSonrasiKurus),
        tl(k.digerFonKurus),
        tl(net(k)),
        TAHSILAT[k.tahsilat] || '',
        ODEME[k.odeme] || '',
        k.talepTarihi || '',
        k.odemeTarihi || '',
        k.notlar || '',
      ];
    })
  );
  const JSZip = await jszip();
  const zip = new JSZip();
  const parcalar = calismaKitabiParcalari({
    sayfaAdi: 'İş Kayıtları',
    satirlar,
    sutunGenislikleri: EXCEL_BASLIKLARI.map(() => 18),
    dondurSatir: 1,
  });
  Object.keys(parcalar).forEach((yol) => zip.file(yol, parcalar[yol]));
  return zip.generateAsync({
    type: 'blob',
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}

/**
 * Orijinaldeki `fetch('/api/records/export?…')` çağrısının karşılığı:
 * `{ ok, blob() }` döner, sayfanın indirme kodu olduğu gibi çalışır.
 */
export async function disaAktar(url) {
  const q = new URL(url, 'http://x').searchParams;
  const blob = await excelBlob(q);
  return { ok: true, blob: async () => blob };
}

// ══════════════════════════════════════════════════════════════
// apiFetch — orijinal imza
// ══════════════════════════════════════════════════════════════
export async function apiFetch(url, options = {}) {
  const yontem = String(options.method || 'GET').toUpperCase();
  const u = new URL(url, 'http://x');
  const q = u.searchParams;
  const parca = u.pathname
    .replace(/^\/api\//, '')
    .split('/')
    .filter(Boolean);
  let govde = {};
  if (options.body) {
    try {
      govde = JSON.parse(options.body);
    } catch {
      throw new ApiError('Geçersiz istek.', 400);
    }
  }
  const [kaynak, id, alt] = parca;

  if (kaynak === 'auth') {
    if (id === 'me') {
      return {
        full_name: (oturum && (oturum.name || oturum.identifier)) || '',
        username: 'TTO Yöneticisi',
      };
    }
    return null;
  }

  if (KISILER[kaynak]) {
    const t = KISILER[kaynak];
    if (!id && yontem === 'GET') return kisiListesi(t);
    if (!id && yontem === 'POST') {
      const r = await yaz(() => window.DBWrite.add(t.koleksiyon, kisiGovdesi(t, govde)));
      return kisiGetir(t, idAl(r));
    }
    if (id && alt === 'detail' && yontem === 'GET') {
      return kaynak === 'firms' ? firmaDetayi(id) : akademisyenDetayi(id);
    }
    if (id && !alt && yontem === 'GET') return kisiGetir(t, id);
    if (id && !alt && yontem === 'PUT') {
      await kisiGetir(t, id);
      await yaz(() => window.DBWrite.update(t.koleksiyon, String(id), kisiGovdesi(t, govde)));
      return kisiGetir(t, id);
    }
  }

  if (kaynak === 'settings') {
    if (!id && yontem === 'GET') {
      return (await oku('tto_oranlar')).map(oranCevir).sort((a, b) => a.valid_year - b.valid_year);
    }
    if (!id && yontem === 'POST') {
      const yil = Number(govde.valid_year);
      if (await oranBul(yil)) {
        throw new ApiError(
          `${yil} yılı için oran zaten mevcut. Güncellemek için listeden seçin.`,
          409
        );
      }
      await yaz(() =>
        window.DBWrite.set('tto_oranlar', String(yil), { yil, ...oranGovdesi(govde) }, true)
      );
      return oranCevir(await oranBul(yil));
    }
    if (id && yontem === 'PUT') {
      const mevcut = await oranBul(id);
      if (!mevcut) throw new ApiError('Oran ayarı bulunamadı.', 404);
      if ('valid_year' in govde && Number(govde.valid_year) !== Number(mevcut.yil)) {
        throw new ApiError(
          'Kayıtlı bir yılın yılı değiştirilemez; yeni yıl için "Yeni Yıl" ile ekleyin.',
          400
        );
      }
      await yaz(() =>
        window.DBWrite.set('tto_oranlar', String(mevcut.yil), oranGovdesi(govde), true)
      );
      return oranCevir(await oranBul(mevcut.yil));
    }
    if (id && yontem === 'GET') {
      const o = await oranBul(id);
      if (!o) throw new ApiError('Oran ayarı bulunamadı.', 404);
      return oranCevir(o);
    }
  }

  if (kaynak === 'records') {
    if (!id && yontem === 'GET') return kayitlarListesi(q);
    if (id === 'summary' && yontem === 'GET') return kayitOzeti(q);
    if (id === 'preview-calculation' && yontem === 'POST') return onizleme(govde);
    if (!id && yontem === 'POST') {
      const r = await yaz(() => window.DBWrite.add('tto_is_kayitlari', kayitGovdesi(govde)));
      return kayitGetir(idAl(r));
    }
    if (id && yontem === 'GET') return kayitGetir(id);
    if (id && yontem === 'PUT') {
      await kayitGetir(id);
      await yaz(() => window.DBWrite.update('tto_is_kayitlari', String(id), kayitGovdesi(govde)));
      return kayitGetir(id);
    }
    if (id && yontem === 'DELETE') {
      await kayitGetir(id);
      await yaz(() => window.DBWrite.remove('tto_is_kayitlari', String(id)));
      return null;
    }
  }

  throw new ApiError('Bilinmeyen istek: ' + yontem + ' ' + u.pathname, 404);
}
