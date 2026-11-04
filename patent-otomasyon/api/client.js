// ══════════════════════════════════════════════════════════════
// Patent & FSMH Takibi ekranlarının veri katmanı (uyum katmanı)
//
// Ekranlar ayrı uygulamadan (mrtunahan/patent — FastAPI) BİREBİR taşındı ve
// onun uçlarını çağırıyor (`request('GET', '/patents', { query })` gibi). Bu
// dosya aynı imzayı (request, download, ApiError, isAbort) verir ve her ucu
// Offline Asistan'ın veritabanı API'si (/api/db) üzerinden, orijinalle AYNI
// biçimde yanıtlar: sayısal kimlikler, alan adları, sayfalama, 409 mükerrer
// uyarısı, silme engelleri (tto-otomasyon/api.js ile aynı yaklaşım).
//
// Kurallar lib/patent-fsmh.js'tedir; sunucu (server/routes/db.js) her yazmayı
// aynı dosyayla yeniden denetler. Buradaki hiçbir denetim yetki kapısı
// değildir — kapı sunucudadır (yalnız Patent & FSMH yöneticisi).
//
// Koleksiyon ↔ orijinal tablo (kimlik = belgedeki `no`):
//   patent_kayitlari ↔ patents (+ patent_partners → ortaklar[])
//   patent_basvuru_sahipleri ↔ applicants · patent_bolumler ↔ departments
//   patent_vekil_firmalar ↔ attorney_firms · patent_fsmh_turleri ↔ fsmh_types
// ══════════════════════════════════════════════════════════════
import {
  VARSAYILAN_FSMH_TURLERI,
  bildirimdenPortfoy,
  metin,
  normalizeTr,
  portfoyKaydiHatasi,
  trKarsilastir,
} from '../../lib/patent-fsmh.js';
import { calismaKitabiParcalari } from '../../lib/xlsx-yaz.js';

export class ApiError extends Error {
  constructor(status, detail, extra = {}) {
    super(detail);
    this.status = status;
    this.detail = detail;
    this.duplicate = extra.duplicate ?? false;
    this.existingIds = extra.existingIds ?? [];
    this.fieldErrors = extra.fieldErrors ?? {};
  }
}

export function isAbort(error) {
  return !!error && error.name === 'AbortError';
}

const K = {
  patent: 'patent_kayitlari',
  sahip: 'patent_basvuru_sahipleri',
  bolum: 'patent_bolumler',
  firma: 'patent_vekil_firmalar',
  tur: 'patent_fsmh_turleri',
};

const bos = (v) => (v === undefined || v === null || String(v).trim() === '' ? null : v);
const kirp = (v) => (v == null ? null : bos(String(v).trim()));
const zaman = (v) => (v ? new Date(v).toISOString() : new Date(0).toISOString());

// ── Okuma / yazma ──
async function oku(koleksiyon) {
  try {
    const l = await window.apiRead.strict(koleksiyon);
    return Array.isArray(l) ? l : [];
  } catch (e) {
    throw new ApiError((e && e.status) || 500, (e && e.message) || 'Veri okunamadı.');
  }
}

async function yaz(islem) {
  try {
    return await islem();
  } catch (e) {
    const m = (e && e.message) || 'İşlem yapılamadı.';
    throw new ApiError(/çakıştı|zaten/.test(m) ? 409 : /yetki|yalnız/i.test(m) ? 403 : 400, m);
  }
}

const noIle = (liste, no) => liste.find((d) => Number(d.no) === Number(no)) || null;
const sonrakiNo = (liste) => liste.reduce((en, d) => Math.max(en, Number(d.no) || 0), 0) + 1;

/** Yeni belge: sıradaki numarayla eklenir; numara çakışırsa bir kez yeniden dener. */
async function ekle(koleksiyon, veri) {
  for (let deneme = 0; deneme < 3; deneme++) {
    const liste = await oku(koleksiyon);
    const no = sonrakiNo(liste);
    try {
      await window.DBWrite.add(koleksiyon, { ...veri, no });
      return no;
    } catch (e) {
      if (!/çakıştı/.test((e && e.message) || '') || deneme === 2) {
        return yaz(() => Promise.reject(e));
      }
    }
  }
  return 0;
}

const guncelle = (koleksiyon, belge, veri) =>
  yaz(() => window.DBWrite.update(koleksiyon, String(belge.id), veri));
const sil = (koleksiyon, belge) => yaz(() => window.DBWrite.remove(koleksiyon, String(belge.id)));

// ── FSMH türleri: koleksiyon boşsa varsayılan türlerle başlatılır (orijinal ilk migration) ──
let turTohumu = null;
async function turler() {
  const l = await oku(K.tur);
  if (l.length > 0) return l;
  if (!turTohumu) {
    turTohumu = (async () => {
      for (let i = 0; i < VARSAYILAN_FSMH_TURLERI.length; i++) {
        await ekle(K.tur, { ad: VARSAYILAN_FSMH_TURLERI[i], sira: i + 1 });
      }
    })().finally(() => {
      turTohumu = null;
    });
  }
  await turTohumu;
  return oku(K.tur);
}

// ── Belge → orijinal yanıt biçimi ──
const turCevir = (d) => ({
  id: Number(d.no),
  name: d.ad,
  sort_order: Number(d.sira) || 0,
  created_at: zaman(d.createdAt),
  updated_at: zaman(d.updatedAt),
});
const bolumCevir = (d) => ({
  id: Number(d.no),
  name: d.ad,
  created_at: zaman(d.createdAt),
  updated_at: zaman(d.updatedAt),
});
const sahipCevir = (d) => ({
  id: Number(d.no),
  full_name: d.ad,
  department_id: d.bolumNo ? Number(d.bolumNo) : null,
  email: bos(d.eposta),
  is_active: d.aktif !== false,
  created_at: zaman(d.createdAt),
  updated_at: zaman(d.updatedAt),
});
const firmaCevir = (d) => ({
  id: Number(d.no),
  name: d.ad,
  contact_info: bos(d.iletisim),
  tax_no: bos(d.vergiNo),
  title: bos(d.unvan),
  email: bos(d.eposta),
  is_active: d.aktif !== false,
  created_at: zaman(d.createdAt),
  updated_at: zaman(d.updatedAt),
});

function harita(liste) {
  const m = {};
  liste.forEach((x) => (m[Number(x.no)] = x));
  return m;
}

async function hepsiniOku() {
  const [patentler, sahipler, bolumler, firmalar, turListesi] = await Promise.all([
    oku(K.patent),
    oku(K.sahip),
    oku(K.bolum),
    oku(K.firma),
    turler(),
  ]);
  return {
    patentler,
    aktif: patentler.filter((p) => !p.silindi),
    sahipler,
    bolumler,
    firmalar,
    turler: turListesi,
    h: {
      sahip: harita(sahipler),
      bolum: harita(bolumler),
      firma: harita(firmalar),
      tur: harita(turListesi),
    },
  };
}

function patentCevir(p, h) {
  const s = h.sahip[Number(p.basvuruSahibiNo)];
  const b = p.bolumNo ? h.bolum[Number(p.bolumNo)] : null;
  const t = h.tur[Number(p.fsmhTuruNo)];
  const f = p.vekilFirmaNo ? h.firma[Number(p.vekilFirmaNo)] : null;
  return {
    id: Number(p.no),
    title: p.baslik,
    applicant: { id: Number(p.basvuruSahibiNo), full_name: s ? s.ad : '?' },
    department: b ? { id: Number(b.no), name: b.ad } : null,
    fsmh_type: { id: Number(p.fsmhTuruNo), name: t ? t.ad : '?' },
    attorney_firm: f ? { id: Number(f.no), name: f.ad } : null,
    partners: Array.isArray(p.ortaklar) ? p.ortaklar : [],
    application_date: bos(p.basvuruTarihi),
    registration_date: bos(p.tescilTarihi),
    status: bos(p.durum),
    notes: bos(p.notlar),
    created_at: zaman(p.createdAt),
    updated_at: zaman(p.updatedAt),
  };
}

const ref = (p, h) => {
  const t = h.tur[Number(p.fsmhTuruNo)];
  return {
    id: Number(p.no),
    title: p.baslik,
    fsmh_type_name: t ? t.ad : '?',
    status: bos(p.durum),
    application_date: bos(p.basvuruTarihi),
    registration_date: bos(p.tescilTarihi),
  };
};
const refler = (liste, h) => liste.map((p) => ref(p, h)).sort((a, b) => a.id - b.id);

// ══════════════════════════════════════════════════════════════
// PATENTLER — filtre, sıralama, sayfalama (backend/app/services/patents.py)
// ══════════════════════════════════════════════════════════════
const sayi = (v) => (v === undefined || v === null || v === '' ? null : Number(v));

function suz(v, q) {
  let l = v.aktif.slice().sort((a, b) => Number(a.no) - Number(b.no));
  const esit = (alan, deger) => {
    if (deger !== null) l = l.filter((p) => Number(p[alan] || 0) === deger);
  };
  esit('basvuruSahibiNo', sayi(q.applicant_id));
  esit('bolumNo', sayi(q.department_id));
  esit('fsmhTuruNo', sayi(q.fsmh_type_id));
  esit('vekilFirmaNo', sayi(q.attorney_firm_id));
  if (q.has_attorney !== undefined && q.has_attorney !== null && q.has_attorney !== '') {
    const var_ = q.has_attorney === true || q.has_attorney === 'true';
    l = l.filter((p) => !!p.vekilFirmaNo === var_);
  }
  if (q.date_from) l = l.filter((p) => p.basvuruTarihi && p.basvuruTarihi >= q.date_from);
  if (q.date_to) l = l.filter((p) => p.basvuruTarihi && p.basvuruTarihi <= q.date_to);
  const aranan = q.q ? normalizeTr(q.q) : '';
  if (aranan) {
    l = l.filter((p) => {
      const s = v.h.sahip[Number(p.basvuruSahibiNo)];
      const alanlar = [p.baslik, s ? s.ad : '', p.notlar || '', ...(p.ortaklar || [])];
      return alanlar.some((a) => normalizeTr(a).includes(aranan));
    });
  }
  const ad = (harita_, no) => (no && harita_[Number(no)] ? harita_[Number(no)].ad : null);
  const deger = (p) => {
    switch (q.sort_by || 'id') {
      case 'created_at':
        return zaman(p.createdAt);
      case 'title':
        return p.baslik;
      case 'applicant':
        return ad(v.h.sahip, p.basvuruSahibiNo);
      case 'fsmh_type':
        return ad(v.h.tur, p.fsmhTuruNo);
      case 'department':
        return ad(v.h.bolum, p.bolumNo);
      case 'attorney_firm':
        return ad(v.h.firma, p.vekilFirmaNo);
      case 'application_date':
        return bos(p.basvuruTarihi);
      default:
        return Number(p.no);
    }
  };
  const azalan = q.sort_dir === 'desc';
  const metinsel = ['title', 'applicant', 'fsmh_type', 'department', 'attorney_firm'].includes(
    q.sort_by
  );
  const olan = [];
  const olmayan = []; // değeri boş olanlar yön ne olursa olsun sona
  l.forEach((p) => {
    const d = deger(p);
    (d === null || d === undefined ? olmayan : olan).push({ p, d });
  });
  olan.sort((a, b) => {
    const c = metinsel ? trKarsilastir(a.d, b.d) : a.d < b.d ? -1 : a.d > b.d ? 1 : 0;
    return azalan ? -c : c; // eşitlikte numara sırası korunur (kararlı sıralama)
  });
  return olan.concat(olmayan).map((x) => x.p);
}

// ── Patent gövdesi doğrulama (backend PatentIn + servis kuralları) ──
async function patentGovdesi(b, v) {
  const fieldErrors = {};
  const baslik = metin(b.title);
  if (!baslik) fieldErrors.title = 'Bu alan zorunludur.';
  else if (baslik.length > 500) fieldErrors.title = 'En fazla 500 karakter olabilir.';
  if (!b.applicant_id) fieldErrors.applicant_id = 'Bu alan zorunludur.';
  if (!b.fsmh_type_id) fieldErrors.fsmh_type_id = 'Bu alan zorunludur.';
  if (Object.keys(fieldErrors).length) {
    throw new ApiError(422, 'Girilen bilgilerde hata var. Lütfen alanları kontrol edin.', {
      fieldErrors,
    });
  }
  const kontrol = [
    [v.h.sahip, b.applicant_id, 'Başvuru sahibi', 'applicant_id'],
    [v.h.tur, b.fsmh_type_id, 'FSMH türü', 'fsmh_type_id'],
    [v.h.bolum, b.department_id, 'Bölüm', 'department_id'],
    [v.h.firma, b.attorney_firm_id, 'Vekil firma', 'attorney_firm_id'],
  ];
  for (const [h, no, ad, alan] of kontrol) {
    if (no !== null && no !== undefined && !h[Number(no)]) {
      throw new ApiError(422, `${ad} bulunamadı (${alan}).`);
    }
  }
  const veri = {
    baslik,
    basvuruSahibiNo: Number(b.applicant_id),
    fsmhTuruNo: Number(b.fsmh_type_id),
    bolumNo: b.department_id ? Number(b.department_id) : null,
    vekilFirmaNo: b.attorney_firm_id ? Number(b.attorney_firm_id) : null,
    basvuruTarihi: bos(b.application_date),
    tescilTarihi: bos(b.registration_date),
    durum: bos(b.status),
    notlar: kirp(b.notes),
    ortaklar: (Array.isArray(b.partners) ? b.partners : []).map(metin).filter(Boolean),
  };
  const hata = portfoyKaydiHatasi(K.patent, veri, true);
  if (hata) throw new ApiError(422, hata);
  return veri;
}

const DUPLICATE_MESSAGE = 'Aynı başlık, başvuru sahibi ve tarihle kayıt var.';

function mukerrerDenetle(v, veri, haric) {
  const hedef = normalizeTr(veri.baslik);
  const idler = v.aktif
    .filter(
      (p) =>
        Number(p.no) !== haric &&
        Number(p.basvuruSahibiNo) === veri.basvuruSahibiNo &&
        (bos(p.basvuruTarihi) || null) === (veri.basvuruTarihi || null) &&
        normalizeTr(p.baslik) === hedef
    )
    .map((p) => Number(p.no))
    .sort((a, b) => a - b);
  if (idler.length) {
    throw new ApiError(409, DUPLICATE_MESSAGE, { duplicate: true, existingIds: idler });
  }
}

async function patentUclari(yontem, parca, q, govde) {
  const v = await hepsiniOku();
  if (parca.length === 1) {
    if (yontem === 'GET') {
      const l = suz(v, q);
      const sayfa = Math.max(1, Number(q.page) || 1);
      const boyut = Math.min(100, Math.max(1, Number(q.page_size) || 25));
      const bas = (sayfa - 1) * boyut;
      return {
        items: l.slice(bas, bas + boyut).map((p) => patentCevir(p, v.h)),
        total: l.length,
        page: sayfa,
        page_size: boyut,
      };
    }
    if (yontem === 'POST') {
      const veri = await patentGovdesi(govde, v);
      if (!q.confirm_duplicate) mukerrerDenetle(v, veri, null);
      const no = await ekle(K.patent, { ...veri, silindi: null });
      const t = await hepsiniOku();
      return patentCevir(noIle(t.patentler, no), t.h);
    }
  }
  const no = Number(parca[1]);
  const belge = v.aktif.find((p) => Number(p.no) === no);
  if (!belge) throw new ApiError(404, 'Patent bulunamadı.');
  if (yontem === 'GET') return patentCevir(belge, v.h);
  if (yontem === 'PUT') {
    const veri = await patentGovdesi(govde, v);
    if (!q.confirm_duplicate) mukerrerDenetle(v, veri, no);
    await guncelle(K.patent, belge, veri);
    const t = await hepsiniOku();
    return patentCevir(noIle(t.patentler, no), t.h);
  }
  if (yontem === 'DELETE') {
    // Soft delete (orijinal Madde 6/1): kayıt veritabanında kalır.
    await guncelle(K.patent, belge, { silindi: new Date().toISOString() });
    return undefined;
  }
  throw new ApiError(405, 'Desteklenmeyen işlem.');
}

// ══════════════════════════════════════════════════════════════
// LOOKUP'LAR — başvuru sahipleri, bölümler, vekil firmalar, FSMH türleri
// ══════════════════════════════════════════════════════════════
const LOOKUP = {
  applicants: {
    koleksiyon: K.sahip,
    cevir: sahipCevir,
    adAlani: 'full_name',
    mukerrer: 'Bu adla bir başvuru sahibi zaten var.',
    bulunamadi: 'Başvuru sahibi bulunamadı.',
    patentAlani: 'basvuruSahibiNo',
    async govde(b, v) {
      if (b.department_id && !v.h.bolum[Number(b.department_id)]) {
        throw new ApiError(422, 'Bölüm bulunamadı (department_id).');
      }
      return {
        ad: metin(b.full_name),
        bolumNo: b.department_id ? Number(b.department_id) : null,
        eposta: kirp(b.email),
        aktif: b.is_active !== false,
      };
    },
  },
  departments: {
    koleksiyon: K.bolum,
    cevir: bolumCevir,
    adAlani: 'name',
    mukerrer: 'Bu adla bir bölüm zaten var.',
    bulunamadi: 'Bölüm bulunamadı.',
    patentAlani: 'bolumNo',
    async govde(b) {
      return { ad: metin(b.name) };
    },
  },
  attorney_firms: {
    koleksiyon: K.firma,
    cevir: firmaCevir,
    adAlani: 'name',
    mukerrer: 'Bu adla bir vekil firma zaten var.',
    bulunamadi: 'Vekil firma bulunamadı.',
    patentAlani: 'vekilFirmaNo',
    async govde(b) {
      return {
        ad: metin(b.name),
        iletisim: kirp(b.contact_info),
        vergiNo: kirp(b.tax_no),
        unvan: kirp(b.title),
        eposta: kirp(b.email),
        aktif: b.is_active !== false,
      };
    },
  },
  fsmh_types: {
    koleksiyon: K.tur,
    cevir: turCevir,
    adAlani: 'name',
    mukerrer: 'Bu adla bir FSMH türü zaten var.',
    bulunamadi: 'Tür bulunamadı.',
    patentAlani: 'fsmhTuruNo',
    async govde(b) {
      return { ad: metin(b.name), sira: Number(b.sort_order) || 0 };
    },
  },
};

function lookupListesi(v, ad) {
  const l = {
    applicants: v.sahipler,
    departments: v.bolumler,
    attorney_firms: v.firmalar,
    fsmh_types: v.turler,
  }[ad];
  const sirali = l.slice().sort((a, b) => {
    if (ad === 'fsmh_types') {
      const s = (Number(a.sira) || 0) - (Number(b.sira) || 0);
      if (s) return s;
    }
    return trKarsilastir(a.ad, b.ad) || Number(a.no) - Number(b.no);
  });
  return sirali;
}

/** Özet: her kayıt (0 patentli dahil) ve bağlı AKTİF patentleri. */
function lookupOzeti(v, ad) {
  const tanim = LOOKUP[ad];
  return lookupListesi(v, ad).map((d) => {
    const bagli = v.aktif.filter((p) => Number(p[tanim.patentAlani] || 0) === Number(d.no));
    const o = { id: Number(d.no), patent_count: bagli.length, patents: refler(bagli, v.h) };
    if (ad === 'applicants') o.full_name = d.ad;
    else o.name = d.ad;
    return o;
  });
}

async function lookupUclari(ad, yontem, parca, govde) {
  const tanim = LOOKUP[ad];
  const v = await hepsiniOku();
  if (parca.length === 2 && parca[1] === 'summary' && yontem === 'GET') return lookupOzeti(v, ad);
  if (parca.length === 1) {
    if (yontem === 'GET') return lookupListesi(v, ad).map(tanim.cevir);
    if (yontem === 'POST') {
      const veri = await tanim.govde(govde, v);
      const hata = portfoyKaydiHatasi(tanim.koleksiyon, veri, false);
      if (hata) throw new ApiError(422, hata);
      const hedef = normalizeTr(veri.ad);
      if (lookupListesi(v, ad).some((d) => normalizeTr(d.ad) === hedef)) {
        throw new ApiError(409, tanim.mukerrer);
      }
      const no = await ekle(tanim.koleksiyon, veri);
      return tanim.cevir(noIle(await oku(tanim.koleksiyon), no));
    }
  }
  const no = Number(parca[1]);
  const belge = noIle(lookupListesi(v, ad), no);
  if (!belge) throw new ApiError(404, tanim.bulunamadi);
  if (yontem === 'GET') return tanim.cevir(belge);
  if (yontem === 'PUT') {
    const veri = await tanim.govde(govde, v);
    const hata = portfoyKaydiHatasi(tanim.koleksiyon, veri, false);
    if (hata) throw new ApiError(422, hata);
    const hedef = normalizeTr(veri.ad);
    if (lookupListesi(v, ad).some((d) => Number(d.no) !== no && normalizeTr(d.ad) === hedef)) {
      throw new ApiError(409, tanim.mukerrer);
    }
    await guncelle(tanim.koleksiyon, belge, veri);
    return tanim.cevir(noIle(await oku(tanim.koleksiyon), no));
  }
  if (yontem === 'DELETE') {
    // Silme kuralı (orijinal delete_lookup): aktif patente bağlıysa engellenir;
    // yalnız SİLİNMİŞ patentler bağlıysa onlar da kalıcı silinir.
    const mesaj = [];
    const aktif = v.aktif.filter((p) => Number(p[tanim.patentAlani] || 0) === no).length;
    if (aktif) mesaj.push(`Bu kayıt ${aktif} aktif patentte kullanılıyor, silinemez.`);
    if (ad === 'departments') {
      const kullanan = v.sahipler.filter((s) => Number(s.bolumNo || 0) === no).length;
      if (kullanan) {
        mesaj.push(
          `Bu bölüm ${kullanan} başvuru sahibinin varsayılan bölümü olarak kullanılıyor, silinemez.`
        );
      }
    }
    if (mesaj.length) throw new ApiError(409, mesaj.join(' '));
    const silinmisler = v.patentler.filter(
      (p) => p.silindi && Number(p[tanim.patentAlani] || 0) === no
    );
    for (const p of silinmisler) await sil(K.patent, p);
    await sil(tanim.koleksiyon, belge);
    return undefined;
  }
  throw new ApiError(405, 'Desteklenmeyen işlem.');
}

/** Ortaklar ayrı kayıt değildir: aktif patentlerdeki adlar normalize edilerek gruplanır. */
function ortakOzeti(v) {
  const gorunen = new Map();
  const patentler = new Map();
  v.aktif
    .slice()
    .sort((a, b) => Number(a.no) - Number(b.no))
    .forEach((p) => {
      (p.ortaklar || []).forEach((ad) => {
        const k = normalizeTr(ad);
        if (!gorunen.has(k)) gorunen.set(k, ad);
        if (!patentler.has(k)) patentler.set(k, new Map());
        patentler.get(k).set(Number(p.no), p);
      });
    });
  return [...gorunen.keys()]
    .map((k) => {
      const l = [...patentler.get(k).values()];
      return { name: gorunen.get(k), patent_count: l.length, patents: refler(l, v.h) };
    })
    .sort((a, b) => trKarsilastir(a.name, b.name));
}

// ══════════════════════════════════════════════════════════════
// EXCEL DIŞA AKTARMA (orijinal patent_export.py — Madde 3 sütun sırası)
// ══════════════════════════════════════════════════════════════
const EXCEL_SUTUNLARI = [
  ['No', 7],
  ['Buluş Başlığı', 45],
  ['Başvuru Sahibi', 26],
  ['Bölüm / Birim', 26],
  ['FSMH Türü', 18],
  ['Vekil Firma', 24],
  ['Ortaklar & Oranları', 36],
  ['Başvuru Tarihi', 16],
  ['Tescil Tarihi', 16],
  ['Durum', 20],
  ['Notlar / Açıklama', 50],
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

const trTarih = (iso) => {
  const m = iso ? /^(\d{4})-(\d{2})-(\d{2})/.exec(iso) : null;
  return m ? `${m[3]}.${m[2]}.${m[1]}` : '';
};

async function excelIndir(q) {
  const v = await hepsiniOku();
  const satirlar = [EXCEL_SUTUNLARI.map((s) => s[0])].concat(
    suz(v, q).map((p, i) => {
      const x = patentCevir(p, v.h);
      return [
        i + 1,
        x.title,
        x.applicant.full_name,
        x.department ? x.department.name : '',
        x.fsmh_type.name,
        x.attorney_firm ? x.attorney_firm.name : '',
        x.partners.join(', '),
        trTarih(x.application_date),
        trTarih(x.registration_date),
        x.status || '',
        x.notes || '',
      ];
    })
  );
  let JSZip;
  try {
    JSZip = await jszip();
  } catch (e) {
    throw new ApiError(0, e.message);
  }
  const zip = new JSZip();
  const parcalar = calismaKitabiParcalari({
    sayfaAdi: 'Patent Takip',
    satirlar,
    sutunGenislikleri: EXCEL_SUTUNLARI.map((s) => s[1]),
    dondurSatir: 1,
  });
  Object.keys(parcalar).forEach((yol) => zip.file(yol, parcalar[yol]));
  const blob = await zip.generateAsync({
    type: 'blob',
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  return { blob, filename: `patent-takip-${new Date().toISOString().slice(0, 10)}.xlsx` };
}

// ══════════════════════════════════════════════════════════════
// BULUŞ BİLDİRİMİ → PORTFÖY (yöneticinin "Kabul et ve portföye al" kararı)
// Başvuru sahibi, bölüm ve FSMH türü ADLA eşlenir; yoksa açılır. Aynı başlık,
// sahip ve tarihle kayıt zaten varsa yenisi açılmaz, var olan döner.
// ══════════════════════════════════════════════════════════════
async function adlaBulVeyaEkle(koleksiyon, liste, ad, ek) {
  const hedef = normalizeTr(ad);
  const var_ = liste.find((d) => normalizeTr(d.ad) === hedef);
  if (var_) return Number(var_.no);
  return ekle(koleksiyon, { ad: metin(ad), ...(ek || {}) });
}

export async function bildirimiPortfoyeAl(bildirim) {
  const a = bildirimdenPortfoy(bildirim);
  if (!a.baslik || !a.basvuruSahibiAd)
    throw new ApiError(422, 'Bildirimde başlık ve ad soyad olmalı.');
  const v = await hepsiniOku();
  const bolumNo = a.bolumAd ? await adlaBulVeyaEkle(K.bolum, v.bolumler, a.bolumAd) : null;
  const sahipNo = await adlaBulVeyaEkle(K.sahip, v.sahipler, a.basvuruSahibiAd, {
    bolumNo,
    eposta: kirp(bildirim && bildirim.eposta),
    aktif: true,
  });
  const turNo = await adlaBulVeyaEkle(K.tur, v.turler, a.turAd || 'Patent', {
    sira: v.turler.reduce((en, t) => Math.max(en, Number(t.sira) || 0), 0) + 1,
  });
  const veri = {
    baslik: a.baslik,
    basvuruSahibiNo: sahipNo,
    fsmhTuruNo: turNo,
    bolumNo,
    vekilFirmaNo: null,
    basvuruTarihi: a.basvuruTarihi,
    tescilTarihi: null,
    durum: a.durum,
    notlar: a.notlar || null,
    ortaklar: a.ortaklar,
  };
  const hata = portfoyKaydiHatasi(K.patent, veri, true);
  if (hata) throw new ApiError(422, hata);
  const guncel = await hepsiniOku();
  try {
    mukerrerDenetle(guncel, veri, null);
  } catch (e) {
    if (e instanceof ApiError && e.duplicate) return e.existingIds[0];
    throw e;
  }
  return ekle(K.patent, { ...veri, silindi: null, bildirimId: metin(bildirim && bildirim.id) });
}

// ══════════════════════════════════════════════════════════════
// request / download — orijinal imza
// ══════════════════════════════════════════════════════════════
export async function request(method, path, options = {}) {
  const { query = {}, body, signal } = options;
  const parca = String(path).split('?')[0].split('/').filter(Boolean);
  const kok = parca[0];
  let sonuc;
  if (kok === 'patents') sonuc = await patentUclari(method, parca, query, body || {});
  else if (kok === 'partners' && method === 'GET') sonuc = ortakOzeti(await hepsiniOku());
  else if (LOOKUP[kok]) sonuc = await lookupUclari(kok, method, parca, body || {});
  else throw new ApiError(404, 'Bilinmeyen uç: ' + path);
  // İstek sürerken vazgeçildiyse (filtre değişti) yanıt eskisini ezmesin.
  if (signal && signal.aborted) {
    const e = new Error('Vazgeçildi');
    e.name = 'AbortError';
    throw e;
  }
  return sonuc;
}

export async function download(path, query) {
  if (String(path).startsWith('/patents/export')) return excelIndir(query || {});
  throw new ApiError(404, 'Bilinmeyen uç: ' + path);
}
