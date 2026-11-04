// ══════════════════════════════════════════════════════════════
// PATENT & FSMH MODÜLÜ — İSTEMCİ VE SUNUCUNUN ORTAK KURAL DOSYASI
//
// Modül iki parçadan oluşur (TTO modülüyle aynı yapı):
//   1) BULUŞ BİLDİRİMİ — her akademisyen buluşunu (patent, faydalı model,
//      tasarım tescili, marka, telif hakkı) bildirir; durumunu izler.
//   2) PATENT & FSMH TAKİBİ — üniversite yetkilisinin atadığı PATENT & FSMH
//      YÖNETİCİSİ (professors.isPatentYoneticisi) gelen bildirimleri karara
//      bağlar ve portföyü (patent-otomasyon/) yönetir.
//
// Kim yönetici? Bayrağı yalnız üniversite yetkilisi verir/alır
// (unv-yonetimi-modulu.jsx); sunucu bayrağı PRIV_FIELDS ile korur. Sistem
// yöneticisi (eski admin girişi) her zaman yöneticidir.
//
// Arayüz bu kurallarla düğmeleri gösterir; sunucu (server/routes/db.js) aynı
// kurallarla isteği kabul ya da reddeder. İki kopya tutulsaydı biri değişip
// öteki kalırdı.
// ══════════════════════════════════════════════════════════════

/** Portföy koleksiyonları: okuma VE yazma yalnız Patent & FSMH yöneticisine. */
export const PATENT_KOLEKSIYONLARI = [
  'patent_kayitlari',
  'patent_basvuru_sahipleri',
  'patent_bolumler',
  'patent_vekil_firmalar',
  'patent_fsmh_turleri',
];

/** Buluş bildirimleri: akademisyen kendisininkini, yönetici hepsini görür. */
export const PATENT_BILDIRIM_KOLEKSIYONU = 'patent_bildirimleri';

export const PATENT_DURUMLARI = ['Tescillendi', 'Süreç Devam Ediyor', 'Reddedildi'];

export const VARSAYILAN_FSMH_TURLERI = [
  'Patent',
  'Faydalı Model',
  'Tasarım Tescili',
  'Marka',
  'Telif Hakkı',
];

// ── Metin ──
export const metin = (v) => String(v == null ? '' : v).trim();

/**
 * Karşılaştırma/arama anahtarı (patent backend'i normalize_tr ile aynı):
 * İ→i, I→ı, küçük harf, NFC, iç boşluklar teke. Aksan katlaması YOK.
 */
export function normalizeTr(deger) {
  return String(deger == null ? '' : deger)
    .trim()
    .normalize('NFC')
    .replace(/İ/g, 'i')
    .replace(/I/g, 'ı')
    .toLowerCase()
    .normalize('NFC')
    .split(/\s+/)
    .filter(Boolean)
    .join(' ');
}

/** Türkçe alfabe sırası. */
export const trKarsilastir = (a, b) =>
  String(a == null ? '' : a).localeCompare(String(b == null ? '' : b), 'tr', {
    sensitivity: 'base',
  });

// ── Yetki ──
/**
 * Kullanıcı Patent & FSMH yöneticisi mi? (yalnız görünürlük; kapı sunucudadır)
 * ⚠ role === 'admin' TEK BAŞINA YETMEZ: üniversite ve fakülte yetkilileri de
 * istemcide 'admin' rolüyle açılır. Yalnız bayrak ya da sistem yöneticisi.
 */
export function patentYoneticisiMi(user) {
  const u = user || {};
  if (u.isPatentYoneticisi) return true;
  return u.role === 'admin' && !u.isUniversityAdmin && !u.isFacultyManager && !u.baseRole;
}

// ══════════════════════════════════════════════════════════════
// PORTFÖY KAYITLARI — alan kuralları (sunucu yazmada yeniden denetler)
// ══════════════════════════════════════════════════════════════
const TARIH = /^\d{4}-\d{2}-\d{2}$/;

function uzunluk(v, en, ad, zorunlu) {
  const s = metin(v);
  if (zorunlu && !s) return ad + ' zorunludur.';
  if (s.length > en) return ad + ' en fazla ' + en + ' karakter olabilir.';
  return '';
}

/**
 * Bir portföy kaydının hatası ('' = geçerli). `tam`: kayıt bütünüyle
 * yazılıyor (ekleme) — zorunlu alanlar aranır; güncellemede yalnız gelen
 * alanlar denetlenir. `noZorunlu`: veritabanına eklenen belge kayıt
 * numarasını (no) taşımalı (sunucu eklemede ister; istemcideki taslak
 * denetiminde numara henüz verilmemiştir).
 */
export function portfoyKaydiHatasi(koleksiyon, veri, tam, noZorunlu) {
  const v = veri || {};
  const var_ = (a) => tam || a in v;
  if ((noZorunlu || 'no' in v) && !(Number.isInteger(v.no) && v.no > 0))
    return 'Kayıt numarası geçersiz.';
  switch (koleksiyon) {
    case 'patent_kayitlari': {
      if (var_('baslik')) {
        const h = uzunluk(v.baslik, 500, 'Buluş başlığı', true);
        if (h) return h;
      }
      if (var_('basvuruSahibiNo') && !(Number(v.basvuruSahibiNo) > 0))
        return 'Başvuru sahibi zorunludur.';
      if (var_('fsmhTuruNo') && !(Number(v.fsmhTuruNo) > 0)) return 'FSMH türü zorunludur.';
      if ('durum' in v && v.durum != null && PATENT_DURUMLARI.indexOf(v.durum) < 0)
        return 'Geçersiz durum.';
      for (const a of ['basvuruTarihi', 'tescilTarihi']) {
        if (a in v && v[a] != null && !TARIH.test(String(v[a]))) return 'Geçerli bir tarih girin.';
      }
      if (v.basvuruTarihi && v.tescilTarihi && v.tescilTarihi < v.basvuruTarihi)
        return 'Tescil tarihi başvuru tarihinden önce olamaz.';
      if ('ortaklar' in v) {
        if (!Array.isArray(v.ortaklar)) return 'Ortak listesi geçersiz.';
        const g = new Set();
        for (const o of v.ortaklar) {
          const h = uzunluk(o, 200, 'Ortak adı', true);
          if (h) return h;
          const k = normalizeTr(o);
          if (g.has(k)) return 'Aynı ortak adı birden fazla kez eklenemez.';
          g.add(k);
        }
      }
      if ('notlar' in v && v.notlar != null && String(v.notlar).length > 5000)
        return 'Notlar en fazla 5000 karakter olabilir.';
      return '';
    }
    case 'patent_basvuru_sahipleri':
      return var_('ad') ? uzunluk(v.ad, 200, 'Ad soyad', true) : '';
    case 'patent_bolumler':
      return var_('ad') ? uzunluk(v.ad, 200, 'Bölüm adı', true) : '';
    case 'patent_fsmh_turleri':
      return var_('ad') ? uzunluk(v.ad, 100, 'Tür adı', true) : '';
    case 'patent_vekil_firmalar': {
      if (var_('ad')) {
        const h = uzunluk(v.ad, 200, 'Firma adı', true);
        if (h) return h;
      }
      if (v.vergiNo != null && v.vergiNo !== '' && !/^[0-9]{10,11}$/.test(String(v.vergiNo)))
        return 'Vergi no 10 veya 11 haneli rakam olmalı.';
      if (v.eposta != null && v.eposta !== '' && !epostaGecerli(v.eposta))
        return 'Geçerli bir e-posta adresi girin.';
      return '';
    }
    default:
      return '';
  }
}

export function epostaGecerli(e) {
  const s = String(e || '');
  const at = s.indexOf('@');
  if (at <= 0 || /\s/.test(s)) return false;
  const alan = s.slice(at + 1);
  return !!alan && alan.indexOf('@') < 0 && alan.indexOf('.') > 0 && !alan.endsWith('.');
}

// ══════════════════════════════════════════════════════════════
// BULUŞ BİLDİRİMLERİ
// ══════════════════════════════════════════════════════════════
export const BILDIRIM_DURUMLARI = {
  bekliyor: { label: 'Yöneticide bekliyor', renk: '#B45309' },
  iade: { label: 'Düzeltme istendi', renk: '#7C3AED' },
  kabul: { label: 'Portföye alındı', renk: '#059669' },
  ret: { label: 'Reddedildi', renk: '#DC2626' },
};

/** Sırası yöneticide olan durumlar (menü rozeti ve "Sizde bekleyen"). */
export const BILDIRIM_YONETICIDE = ['bekliyor'];
/** Sahibinin düzenleyebildiği durumlar. */
export const BILDIRIM_SAHIP_DUZENLER = ['bekliyor', 'iade'];

/** Sahibin doldurduğu alanlar (yönetici bunlara dokunmaz). */
export const BILDIRIM_SAHIP_ALANLARI = [
  'adSoyad',
  'unvan',
  'bolum',
  'eposta',
  'baslik',
  'tur',
  'ozet',
  'ortaklar',
  'basvuruYapildi',
  'basvuruTarihi',
  'notlar',
];
/** Yöneticinin yazdığı alanlar (sahip bunlara dokunmaz). */
export const BILDIRIM_YONETICI_ALANLARI = ['yoneticiNotu', 'karar', 'patentNo'];

export function bosBildirim(profil) {
  const p = profil || {};
  return {
    adSoyad: metin(p.name),
    unvan: metin(p.title),
    bolum: metin(p.department),
    eposta: metin(p.email),
    baslik: '',
    tur: 'Patent',
    ozet: '',
    ortaklar: [],
    basvuruYapildi: 'hayir',
    basvuruTarihi: '',
    notlar: '',
  };
}

/** Bildirimin alan hataları: { alan: mesaj }. Boş nesne = gönderilebilir. */
export function bildirimHatalari(b) {
  const v = b || {};
  const h = {};
  if (!metin(v.adSoyad)) h.adSoyad = 'Ad soyad zorunludur.';
  if (!metin(v.baslik)) h.baslik = 'Buluş başlığı zorunludur.';
  else if (metin(v.baslik).length > 500) h.baslik = 'En fazla 500 karakter olabilir.';
  if (!metin(v.tur)) h.tur = 'FSMH türü seçin.';
  if (!metin(v.ozet)) h.ozet = 'Kısa açıklama zorunludur.';
  else if (metin(v.ozet).length > 4000) h.ozet = 'En fazla 4000 karakter olabilir.';
  if (v.basvuruYapildi === 'evet' && v.basvuruTarihi && !TARIH.test(String(v.basvuruTarihi)))
    h.basvuruTarihi = 'Geçerli bir tarih girin.';
  if (v.ortaklar != null && !Array.isArray(v.ortaklar)) h.ortaklar = 'Ortak listesi geçersiz.';
  return h;
}

const yalniz = (veri, izinli) =>
  Object.keys(veri || {}).filter(
    (a) => izinli.indexOf(a) < 0 && a !== 'updatedAt' && a !== 'createdAt'
  );

/**
 * Sahibin (bildirimi yapan akademisyenin) yazma kararı.
 * @returns {{izin: boolean, hata?: string}}
 */
export function sahipBildirimYazmaKarari({ tur, mevcut, veri, kimlik }) {
  const ben = metin(kimlik);
  if (!ben) return { izin: false, hata: 'Kimlik çözülemedi.' };
  if (tur === 'delete') {
    if (!mevcut || metin(mevcut.sahip) !== ben)
      return { izin: false, hata: 'Yalnız kendi bildiriminizi silebilirsiniz.' };
    if (BILDIRIM_SAHIP_DUZENLER.indexOf(mevcut.durum) < 0)
      return { izin: false, hata: 'Karara bağlanmış bildirim silinemez.' };
    return { izin: true };
  }
  const v = veri || {};
  if (!mevcut) {
    // Yeni bildirim: kendi adına, "bekliyor" durumunda.
    if (metin(v.sahip) !== ben)
      return { izin: false, hata: 'Bildirim yalnız kendi adınıza açılır.' };
    if (v.durum !== 'bekliyor') return { izin: false, hata: 'Yeni bildirim beklemede açılır.' };
    const fazla = yalniz(v, BILDIRIM_SAHIP_ALANLARI.concat(['sahip', 'durum']));
    if (fazla.length) return { izin: false, hata: 'İzin verilmeyen alan: ' + fazla.join(', ') };
    const h = bildirimHatalari(v);
    const ilk = Object.keys(h)[0];
    if (ilk) return { izin: false, hata: h[ilk] };
    return { izin: true };
  }
  if (metin(mevcut.sahip) !== ben)
    return { izin: false, hata: 'Yalnız kendi bildiriminizi değiştirebilirsiniz.' };
  if (BILDIRIM_SAHIP_DUZENLER.indexOf(mevcut.durum) < 0)
    return { izin: false, hata: 'Karara bağlanmış bildirim değiştirilemez.' };
  // Düzeltilip yeniden gönderilen bildirim tekrar yöneticiye düşer.
  if ('durum' in v && v.durum !== 'bekliyor')
    return { izin: false, hata: 'Bildirimin durumunu yalnız yönetici değiştirir.' };
  if ('sahip' in v && metin(v.sahip) !== ben)
    return { izin: false, hata: 'Bildirimin sahibi değiştirilemez.' };
  const fazla = yalniz(v, BILDIRIM_SAHIP_ALANLARI.concat(['sahip', 'durum']));
  if (fazla.length) return { izin: false, hata: 'İzin verilmeyen alan: ' + fazla.join(', ') };
  const h = bildirimHatalari(Object.assign({}, mevcut, v));
  const ilk = Object.keys(h)[0];
  if (ilk) return { izin: false, hata: h[ilk] };
  return { izin: true };
}

/**
 * Yöneticinin yazma kararı. Kendi bildirimi ise sahip kuralı uygulanır
 * (`sahipKurali: true`); başkasınınkinde yalnız karar alanlarını yazar.
 */
export function yoneticiBildirimYazmaKarari({ tur, mevcut, veri, kimlik }) {
  const ben = metin(kimlik);
  if (!mevcut) return { izin: true, sahipKurali: true };
  const v = veri || {};
  const kararAlanlari = BILDIRIM_YONETICI_ALANLARI.concat(['durum']);
  // Kendi bildiriminde içerik yazıyorsa sahip kuralı; yalnız karar alanlarını
  // yazıyorsa (yönetici kendi bildirimini de karara bağlayabilir) yönetici kuralı.
  if (metin(mevcut.sahip) === ben && (tur === 'delete' || yalniz(v, kararAlanlari).length > 0)) {
    return { izin: true, sahipKurali: true };
  }
  if (tur === 'delete') {
    if (mevcut.durum === 'kabul')
      return {
        izin: false,
        hata: 'Portföye alınmış bildirim silinemez; kaydı portföyden yönetin.',
      };
    return { izin: true };
  }
  const fazla = yalniz(v, kararAlanlari);
  if (fazla.length)
    return {
      izin: false,
      hata: 'Yönetici bildirimin içeriğini değiştiremez (' + fazla.join(', ') + ').',
    };
  if ('durum' in v && ['kabul', 'ret', 'iade', 'bekliyor'].indexOf(v.durum) < 0)
    return { izin: false, hata: 'Geçersiz durum.' };
  if (v.durum === 'iade' && !metin(v.yoneticiNotu || mevcut.yoneticiNotu))
    return { izin: false, hata: 'Düzeltme istemek için not yazın.' };
  if (v.durum === 'ret' && !metin(v.yoneticiNotu || mevcut.yoneticiNotu))
    return { izin: false, hata: 'Reddetmek için gerekçe yazın.' };
  return { izin: true, sahipKurali: false };
}

/** Bildirimden portföy kaydı adayının alanları (kabulde çekmece bununla açılır). */
export function bildirimdenPortfoy(b) {
  const v = b || {};
  const tarih = v.basvuruYapildi === 'evet' && TARIH.test(String(v.basvuruTarihi || ''));
  return {
    baslik: metin(v.baslik),
    basvuruSahibiAd: metin(v.adSoyad),
    bolumAd: metin(v.bolum),
    turAd: metin(v.tur),
    ortaklar: Array.isArray(v.ortaklar) ? v.ortaklar.map(metin).filter(Boolean) : [],
    basvuruTarihi: tarih ? v.basvuruTarihi : null,
    durum: 'Süreç Devam Ediyor',
    notlar: metin(v.ozet),
  };
}

/**
 * Zil bildirimi planı (yazma başarıyla bittikten sonra sunucu üretir).
 * Gönderimde yöneticilere, kararda sahibine haber verilir; kişi kendine
 * bildirim almaz.
 * @returns {Array<{recipientId, type, title, body, meta}>}
 */
export function bildirimZilPlani({ eski, yeni, yapan, yoneticiler }) {
  const o = eski || {};
  const n = Object.assign({}, o, yeni || {});
  const ben = metin(yapan);
  const title = 'Patent & FSMH · ' + (metin(n.baslik) || 'Buluş bildirimi');
  const meta = { bildirimId: metin(n.id), durum: n.durum || '' };
  const out = [];
  if (n.durum === 'bekliyor' && o.durum !== 'bekliyor') {
    (yoneticiler || [])
      .map(metin)
      .filter((ad) => ad && ad !== ben)
      .forEach((ad) =>
        out.push({
          recipientId: ad,
          type: 'patent-bildirim',
          title,
          body: (metin(n.adSoyad) || 'Bir akademisyen') + ' buluş bildirimi gönderdi.',
          meta,
        })
      );
  }
  const sahip = metin(n.sahip);
  if (
    n.durum !== o.durum &&
    ['kabul', 'ret', 'iade'].indexOf(n.durum) >= 0 &&
    sahip &&
    sahip !== ben
  ) {
    out.push({
      recipientId: sahip,
      type: 'patent-karar',
      title,
      body:
        BILDIRIM_DURUMLARI[n.durum].label +
        (metin(n.yoneticiNotu) ? ': ' + metin(n.yoneticiNotu) : '.'),
      meta,
    });
  }
  return out;
}
