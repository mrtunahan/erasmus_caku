// ══════════════════════════════════════════════════════════════
// DERS ODALARI — KURAL DOSYASI (saf; sunucu ve arayüz ortak kullanır)
//
// Her dersin her dönemi için bir "oda" vardır (Google Classroom mantığı):
// akademisyen duyuru ve ödev paylaşır, öğrenci ödevini yükler, akademisyen
// not verip notu öğrenciye "geri verir", herkes paylaşıma yorum yazar.
//
// ── ODAYA KİM GİRER ──
// Öğrenci yalnız o dönem DERS SEÇİMİNDE seçtiği dersin odasına girer
// (student_courses → `<no>__<dönem>`). Akademisyen dersin hocasıysa odayı
// yönetir. Bölüm yetkilisi (ve üstü) kendi bölümünün odalarını görür.
//
// ── İLERİDE BAŞKA ALANLARA BAĞLANACAK ──
// Oda bir "bağlam"a bağlıdır: { tur, kaynakId, donem }. Bugün tek tür var
// ('ders'); proje grubu, staj grubu, kulüp gibi alanlar ODA_TURLERI'ne yeni
// bir tür ekleyerek aynı akışı (paylaşım, ödev, teslim, not, yorum) kullanır.
// Koleksiyonlar türden bağımsızdır; tür yalnız üyeliği ve yetkiyi belirler.
// ══════════════════════════════════════════════════════════════

const metin = (v) => String(v == null ? '' : v).trim();
const sayi = (v) => {
  const n = Number(String(v == null ? '' : v).replace(',', '.'));
  return Number.isFinite(n) ? n : NaN;
};

export const ODA_MODUL = 'dersodalari';

/** Oda türleri. Yeni alan eklenirken buraya bir tür yazılır. */
export const ODA_TURLERI = {
  ders: { etiket: 'Ders odası', aciklama: 'Ders seçiminde dersi seçen öğrenciler üyedir.' },
};

// ── DOSYA ──
// Şimdilik dosya başına 5 MB. Sunucu ODA_DOSYA_MB ortam değişkeniyle
// değiştirebilir; arayüz sınırı sunucudan okur (bkz. /api/oda/ayarlar).
export const DOSYA_SINIRI_MB = 5;
export const TESLIM_DOSYA_SINIRI = 10; // bir teslimde en çok dosya
export const ODEV_SINIRI = 20; // not çizelgesinde en çok ödev sütunu

export const IZINLI_UZANTILAR = [
  'pdf',
  'doc',
  'docx',
  'xls',
  'xlsx',
  'ppt',
  'pptx',
  'odt',
  'ods',
  'odp',
  'rtf',
  'txt',
  'csv',
  'md',
  'zip',
  'rar',
  '7z',
  'png',
  'jpg',
  'jpeg',
  'gif',
  'webp',
  'c',
  'cpp',
  'h',
  'hpp',
  'cs',
  'py',
  'java',
  'js',
  'ts',
  'html',
  'css',
  'sql',
  'ipynb',
  'm',
  'r',
  'json',
  'xml',
];

export function dosyaUzantisi(ad) {
  const m = /\.([A-Za-z0-9]{1,8})$/.exec(metin(ad));
  return m ? m[1].toLowerCase() : '';
}

/**
 * Yüklenecek dosya kabul edilir mi?
 * @param {{ad:string, boyut:number}} dosya
 * @param {number} [sinirMb]
 */
export function dosyaKarari(dosya, sinirMb) {
  const d = dosya || {};
  const mb = Number(sinirMb) > 0 ? Number(sinirMb) : DOSYA_SINIRI_MB;
  const uz = dosyaUzantisi(d.ad);
  if (!uz || !IZINLI_UZANTILAR.includes(uz)) {
    return { izin: false, hata: 'Bu dosya türü yüklenemez' + (uz ? ' (.' + uz + ')' : '') + '.' };
  }
  const boyut = Number(d.boyut) || 0;
  if (boyut <= 0) return { izin: false, hata: 'Dosya boş.' };
  if (boyut > mb * 1024 * 1024) {
    return { izin: false, hata: 'Dosya en fazla ' + mb + ' MB olabilir.' };
  }
  return { izin: true };
}

// ── DÖNEM ──
// Ders seçimi kayıtlarıyla aynı anahtar: '2026-2027_guz' / '2025-2026_bahar'.
// Eylül–Ocak güz, Şubat–Ağustos bahar (yaz okulu bahar yılına sayılır).
export function donemAnahtari(tarih) {
  const t = tarih ? new Date(tarih) : new Date();
  const d = isNaN(t.getTime()) ? new Date() : t;
  const ay = d.getMonth() + 1;
  const yil = d.getFullYear();
  if (ay >= 9) return yil + '-' + (yil + 1) + '_guz';
  if (ay === 1) return yil - 1 + '-' + yil + '_guz';
  return yil - 1 + '-' + yil + '_bahar';
}

export function donemEtiketi(anahtar) {
  const m = /^(\d{4})-(\d{4})_(guz|bahar)$/.exec(metin(anahtar));
  if (!m) return metin(anahtar);
  return m[1] + '-' + m[2] + ' ' + (m[3] === 'guz' ? 'Güz' : 'Bahar');
}

/** Kısa yıl etiketi (kapakta): '2026-2027_guz' → '26-27'. */
export function kisaYil(anahtar) {
  const m = /^(\d{4})-(\d{4})/.exec(metin(anahtar));
  return m ? m[1].slice(2) + '-' + m[2].slice(2) : '';
}

/** Oda kimliği — klasör adı olarak da kullanılır, yalnız güvenli karakterler. */
export function odaKimligi(tur, kaynakId, donem) {
  const parca = (v) => metin(v).replace(/[^A-Za-z0-9_-]/g, '_');
  return [parca(tur || 'ders'), parca(kaynakId), parca(donem)].join('-');
}

// ── SON TARİH VE TESLİM KABULÜ ──
// Ödevde:
//   kabulAcik   — "Gönderim kabul ediliyor" anahtarı (akademisyen kapatabilir)
//   sonTarih    — ISO tarih-saat; boşsa süresiz
//   gecKabul    — son tarihten sonra GEÇ teslim kabul edilir mi
//   ekSureler   — { öğrenciNo: ISO } öğrenciye özel yeni son tarih
//                 (akademisyen teslimi o öğrenci için yeniden açar)

const zaman = (v) => {
  const t = new Date(v).getTime();
  return Number.isFinite(t) ? t : NaN;
};
const simdiMs = (simdi) => (simdi == null ? Date.now() : zaman(simdi));

/** Öğrenci için geçerli son tarih (ek süre varsa o). */
export function etkinSonTarih(odev, ogrenciNo) {
  const o = odev || {};
  const ek = o.ekSureler && metin(ogrenciNo) ? o.ekSureler[metin(ogrenciNo)] : '';
  return metin(ek) || metin(o.sonTarih);
}

/**
 * Öğrenci bu ödeve şimdi teslim yapabilir mi?
 * @returns {{izin:boolean, gec:boolean, sebep:string}}
 */
export function teslimKabulKarari(odev, ogrenciNo, simdi) {
  const o = odev || {};
  const ek = o.ekSureler && o.ekSureler[metin(ogrenciNo)];
  if (o.kabulAcik === false && !ek) {
    return { izin: false, gec: false, sebep: 'Bu ödev için gönderim kapatıldı.' };
  }
  const son = etkinSonTarih(o, ogrenciNo);
  if (!son) return { izin: true, gec: false, sebep: '' };
  const t = zaman(son);
  if (!Number.isFinite(t) || simdiMs(simdi) <= t) return { izin: true, gec: false, sebep: '' };
  if (ek) {
    // Ek süre de doldu: genel geç teslim kuralı geçerli.
    return o.gecKabul
      ? { izin: true, gec: true, sebep: '' }
      : { izin: false, gec: false, sebep: 'Size tanınan ek süre doldu.' };
  }
  if (o.gecKabul) return { izin: true, gec: true, sebep: '' };
  return { izin: false, gec: false, sebep: 'Son teslim tarihi geçti.' };
}

/** Teslim son tarihten sonra mı yapılmış? */
export function gecTeslimMi(odev, ogrenciNo, teslimZamani) {
  const son = etkinSonTarih(odev, ogrenciNo);
  if (!son || !teslimZamani) return false;
  const t = zaman(son);
  const tt = zaman(teslimZamani);
  return Number.isFinite(t) && Number.isFinite(tt) && tt > t;
}

export const DURUMLAR = {
  atandi: { etiket: 'Atandı', renk: '#475569' },
  eksik: { etiket: 'Eksik', renk: '#B91C1C' },
  teslim: { etiket: 'Teslim edildi', renk: '#15803D' },
  gec: { etiket: 'Geç teslim edildi', renk: '#B45309' },
  notlandi: { etiket: 'Not verildi', renk: '#0F766E' },
};

/**
 * Öğrencinin ödevdeki durumu.
 *   notlandi → not geri verildi
 *   teslim / gec → teslim edildi (son tarihe göre)
 *   eksik → teslim yok, son tarih geçti
 *   atandi → teslim yok, süre devam ediyor ya da süresiz
 */
export function teslimDurumu(odev, teslim, ogrenciNo, simdi) {
  const t = teslim || {};
  if (t.geriVerildi && metin(t.puan) !== '') return 'notlandi';
  if (t.teslimEdildi) {
    return gecTeslimMi(odev, ogrenciNo, t.teslimZamani) ? 'gec' : 'teslim';
  }
  const son = etkinSonTarih(odev, ogrenciNo);
  if (son && Number.isFinite(zaman(son)) && simdiMs(simdi) > zaman(son)) return 'eksik';
  return 'atandi';
}

// ── NOT ──
/**
 * Not geçerli mi? 0 ile en yüksek puan arası, en çok iki ondalık.
 * Boş not "not yok" demektir (geçerli).
 */
export function puanKarari(puan, maks) {
  const ham = metin(puan);
  if (ham === '') return { gecerli: true, deger: '' };
  const n = sayi(ham);
  if (!Number.isFinite(n)) return { gecerli: false, hata: 'Not sayı olmalı.' };
  if (n < 0) return { gecerli: false, hata: 'Not negatif olamaz.' };
  const m = sayi(maks);
  if (Number.isFinite(m) && m > 0 && n > m) {
    return { gecerli: false, hata: 'Not en fazla ' + m + ' olabilir.' };
  }
  return { gecerli: true, deger: Math.round(n * 100) / 100 };
}

export function puanMetni(v) {
  if (v === '' || v == null) return '';
  const n = Number(v);
  return Number.isFinite(n) ? String(n).replace('.', ',') : '';
}

// ── ÖĞRENCİ LİSTESİ: AD / SOYAD / NUMARA / NOT DURUMU ──
const kucuk = (v) => metin(v).toLocaleLowerCase('tr-TR');

/** { ad, soyad } — kayıtta ayrı alan yoksa addan çözülür (son kelime soyad). */
export function adSoyadAyir(ogr) {
  const o = ogr || {};
  const ad = metin(o.firstName || o.ad);
  const soyad = metin(o.lastName || o.soyad);
  if (ad || soyad) return { ad, soyad };
  const tam = metin(o.name || o.adSoyad)
    .split(/\s+/)
    .filter(Boolean);
  if (tam.length < 2) return { ad: tam[0] || '', soyad: '' };
  return { ad: tam.slice(0, -1).join(' '), soyad: tam[tam.length - 1] };
}

/**
 * Öğrencileri süzer ve sıralar.
 * @param {object[]} ogrenciler { no, ad, soyad }
 * @param {object} o { arama, durum, sira, durumBul(no) → teslimDurumu kodu, notBul(no) → puan }
 *   durum: 'hepsi' | 'notlu' | 'notsuz' | 'teslim' | 'teslimsiz' | 'gec'
 *   sira : 'soyad' (varsayılan) | 'ad' | 'no'
 */
export function ogrencileriSuz(ogrenciler, o) {
  const op = o || {};
  const q = kucuk(op.arama);
  const durumBul = typeof op.durumBul === 'function' ? op.durumBul : () => '';
  const notBul = typeof op.notBul === 'function' ? op.notBul : () => '';
  const durum = metin(op.durum) || 'hepsi';
  const liste = (Array.isArray(ogrenciler) ? ogrenciler : []).filter((s) => {
    if (q) {
      const iz = [s.no, s.ad, s.soyad, s.ad + ' ' + s.soyad].map(kucuk).join(' | ');
      if (!iz.includes(q)) return false;
    }
    const d = durumBul(s.no);
    const notVar = metin(notBul(s.no)) !== '';
    switch (durum) {
      case 'notlu':
        return notVar;
      case 'notsuz':
        return !notVar;
      case 'teslim':
        return d === 'teslim' || d === 'gec' || d === 'notlandi';
      case 'teslimsiz':
        return d === 'atandi' || d === 'eksik';
      case 'gec':
        return d === 'gec';
      default:
        return true;
    }
  });
  const sira = metin(op.sira) || 'soyad';
  const kiyas = (a, b) => a.localeCompare(b, 'tr', { sensitivity: 'base' });
  return liste.sort((a, b) => {
    if (sira === 'no') return metin(a.no).localeCompare(metin(b.no), 'tr', { numeric: true });
    if (sira === 'ad')
      return kiyas(metin(a.ad), metin(b.ad)) || kiyas(metin(a.soyad), metin(b.soyad));
    return kiyas(metin(a.soyad), metin(b.soyad)) || kiyas(metin(a.ad), metin(b.ad));
  });
}

/** Ödev özeti: teslim eden, not verilen, atanmış sayıları (ekrandaki üçlü). */
export function odevOzeti(odev, ogrenciler, teslimler, simdi) {
  const harita = new Map((teslimler || []).map((t) => [metin(t.ogrenciNo), t]));
  let teslim = 0;
  let notlu = 0;
  let bekleyen = 0;
  (ogrenciler || []).forEach((s) => {
    const t = harita.get(metin(s.no));
    const d = teslimDurumu(odev, t, s.no, simdi);
    if (d === 'teslim' || d === 'gec' || d === 'notlandi') teslim++;
    else bekleyen++;
    if (t && metin(t.puan) !== '') notlu++;
  });
  return { teslim, notlu, atanan: bekleyen };
}

// ── NOT ÇİZELGESİ (Excel / PDF; Şablonlar modülü ile aynı alanlar) ──
export const odevAnahtari = (i) => 'odev' + i;
export const odevBasligi = (i) => i + '.Ödev';

export const NOT_CIZELGESI_STATIC = [
  { id: 'baslik', label: 'Başlık (örn 2026-2027 Güz Dönemi Ödev Not Çizelgesi)' },
  { id: 'akademikYil', label: 'Akademik Yıl (örn 2026-2027)' },
  { id: 'donem', label: 'Dönem (Güz/Bahar)' },
  { id: 'dersKodAd', label: 'Ders Kodu ve Adı' },
  { id: 'dersKod', label: 'Ders Kodu' },
  { id: 'dersAd', label: 'Ders Adı', format: 'title' },
  { id: 'ogretimUyesi', label: 'Öğretim Üyesi / Görevlisi' },
  { id: 'fakulteAd', label: 'Fakülte Bilgisi', format: 'title' },
  { id: 'bolumAd', label: 'Bölüm Adı', format: 'title' },
  { id: 'kurumAd', label: 'Üniversite Adı' },
  { id: 'tarih', label: 'Tarih (örn 14 Ekim 2026 Çarşamba)' },
  { id: 'ogrenciSayisi', label: 'Öğrenci Sayısı' },
  { id: 'odevSayisi', label: 'Ödev Sayısı' },
  { id: 'odevListesi', label: 'Ödevler (1.Ödev: ÖDEV-1 / 20 puan; …)' },
];

export const NOT_CIZELGESI_ROWS = [
  { id: 'sira', label: 'No (sıra)' },
  { id: 'ogrenciNo', label: 'Öğrenci No' },
  { id: 'ad', label: 'Adı', format: 'title' },
  { id: 'soyad', label: 'Soyadı', format: 'upper' },
  { id: 'adSoyad', label: 'Adı Soyadı', format: 'name' },
  { id: 'teslimSayisi', label: 'Teslim Ettiği Ödev Sayısı' },
  { id: 'toplam', label: 'Toplam Puan' },
  { id: 'ortalama', label: 'Ortalama (100 üzerinden)' },
  { id: 'agirlikli', label: 'Ağırlıklı Ortalama (100 üzerinden)' },
  { id: 'harf', label: 'Harf Notu' },
];
for (let _i = 1; _i <= ODEV_SINIRI; _i++) {
  NOT_CIZELGESI_ROWS.push({ id: odevAnahtari(_i), label: odevBasligi(_i) });
}

// Tarih metinleri TÜRKİYE SAATİYLE üretilir: bildirim sunucuda yazılır ve
// sunucu UTC'de çalışıyorsa "23:59" son tarih "20:59" diye görünürdü.
const TR_SAAT = 'Europe/Istanbul';

export function uzunTarih(t) {
  const d = t ? new Date(t) : new Date();
  if (isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat('tr-TR', {
    timeZone: TR_SAAT,
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    weekday: 'long',
  })
    .format(d)
    .replace(/,/g, '');
}

/**
 * Not çizelgesi verisi.
 * @param {object} p
 * @param {object} p.oda       { dersKod, dersAd, donem, hocalar[] }
 * @param {object[]} p.odevler  sıralı ödevler { id, baslik, puan }
 * @param {object[]} p.ogrenciler { no, ad, soyad }
 * @param {object[]} p.teslimler  { icerikId, ogrenciNo, puan, teslimEdildi }
 * @param {object} [p.kunye]  { fakulteAd, bolumAd, kurumAd, ogretimUyesi }
 * @returns {{ staticData, rows, odevler, uyari }}
 */
export function notCizelgesiVerisi(p) {
  const o = p || {};
  const oda = o.oda || {};
  const kunye = o.kunye || {};
  const tumOdevler = Array.isArray(o.odevler) ? o.odevler : [];
  const odevler = tumOdevler.slice(0, ODEV_SINIRI);
  const teslim = new Map();
  (o.teslimler || []).forEach((t) => teslim.set(metin(t.icerikId) + '|' + metin(t.ogrenciNo), t));
  const donem = metin(oda.donem);
  const m = /^(\d{4}-\d{4})_(guz|bahar)$/.exec(donem);
  const akademikYil = m ? m[1] : '';
  const donemAd = m ? (m[2] === 'guz' ? 'Güz' : 'Bahar') : '';
  const maksToplam = odevler.reduce((t, od) => t + (sayi(od.puan) > 0 ? sayi(od.puan) : 0), 0);
  const rows = (o.ogrenciler || []).map((s, i) => {
    const satir = {
      sira: String(i + 1),
      ogrenciNo: metin(s.no),
      ad: metin(s.ad),
      soyad: metin(s.soyad),
      adSoyad: [metin(s.ad), metin(s.soyad)].filter(Boolean).join(' '),
    };
    let toplam = 0;
    let notlu = false;
    let teslimSayisi = 0;
    let notluMaks = 0;
    odevler.forEach((od, j) => {
      const t = teslim.get(metin(od.id) + '|' + metin(s.no));
      if (t && t.teslimEdildi) teslimSayisi++;
      const puan = t ? t.puan : '';
      if (metin(puan) !== '' && Number.isFinite(sayi(puan))) {
        toplam += sayi(puan);
        notlu = true;
        notluMaks += sayi(od.puan) > 0 ? sayi(od.puan) : 0;
      }
      satir[odevAnahtari(j + 1)] = puanMetni(puan);
    });
    for (let k = odevler.length + 1; k <= ODEV_SINIRI; k++) satir[odevAnahtari(k)] = '';
    satir.teslimSayisi = String(teslimSayisi);
    satir.toplam = notlu ? puanMetni(Math.round(toplam * 100) / 100) : '';
    satir.ortalama =
      notlu && notluMaks > 0 ? puanMetni(Math.round((toplam / notluMaks) * 10000) / 100) : '';
    return satir;
  });
  const staticData = {
    baslik: [akademikYil, donemAd ? donemAd + ' Dönemi' : '', 'Ödev Not Çizelgesi']
      .filter(Boolean)
      .join(' '),
    akademikYil,
    donem: donemAd,
    dersKod: metin(oda.dersKod),
    dersAd: metin(oda.dersAd),
    dersKodAd: [metin(oda.dersKod), metin(oda.dersAd)].filter(Boolean).join(' - '),
    ogretimUyesi: metin(kunye.ogretimUyesi) || (oda.hocalar || []).map(metin).join(', '),
    fakulteAd: metin(kunye.fakulteAd),
    bolumAd: metin(kunye.bolumAd),
    kurumAd: metin(kunye.kurumAd),
    tarih: uzunTarih(o.simdi),
    ogrenciSayisi: String(rows.length),
    odevSayisi: String(odevler.length),
    odevListesi: odevler
      .map(
        (od, j) =>
          odevBasligi(j + 1) +
          ': ' +
          metin(od.baslik) +
          (sayi(od.puan) > 0 ? ' / ' + sayi(od.puan) + ' puan' : '')
      )
      .join('; '),
    maksToplam: maksToplam ? String(maksToplam) : '',
  };
  for (let k = 1; k <= ODEV_SINIRI; k++) {
    const od = odevler[k - 1];
    staticData[odevAnahtari(k) + 'Baslik'] = od ? metin(od.baslik) : '';
  }
  return {
    staticData,
    rows,
    odevler,
    uyari:
      tumOdevler.length > ODEV_SINIRI
        ? 'Çizelgeye ilk ' + ODEV_SINIRI + ' ödev yazıldı (' + tumOdevler.length + ' ödev var).'
        : '',
  };
}

// ── NOT DEFTERİ: KALEMLER, AĞIRLIKLAR, HARF NOTU ──
// Bir dersin notu "kalemlerden" oluşur: her ödev bir kalemdir; akademisyen
// ayrıca vize, final, proje gibi EK kalemler açabilir (notu elle girilir).
// Her kalemin bir ağırlığı (%) vardır; ağırlıklı ortalama 100 üzerindendir.
//
// Oda kaydında `notAyari`:
//   agirliklar  — { kalemId: yüzde }   (ödev kalemi: 'odev:<icerikId>')
//   ekKalemler  — [{ id, ad, kisa, maks, yayinlandi }]
// Ağırlık hiç girilmemişse kalemler EŞİT ağırlıklıdır.

export const EK_KALEM_SINIRI = 10;
export const odevKalemId = (icerikId) => 'odev:' + metin(icerikId);

/** Başlıktan kısa sütun adı: "Vize Sınavı" → "VS", "Ödev 1" → "Ö1". */
export function kisaAd(ad) {
  const k = metin(ad)
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => (/^\d+$/.test(w) ? w : w[0]))
    .join('');
  return k.toLocaleUpperCase('tr-TR').slice(0, 4);
}

/**
 * Not defterinin sütunları (sıralı: önce ödevler, sonra ek kalemler).
 * @returns {{id, tur:'odev'|'ek', icerikId?, ad, kisa, maks, agirlik, yayinlandi}[]}
 */
export function notKalemleri(odevler, ayar) {
  const a = ayar || {};
  const ag = a.agirliklar || {};
  const liste = [];
  (odevler || []).forEach((o) => {
    const maks = sayi(o.puan);
    liste.push({
      id: odevKalemId(o.id),
      tur: 'odev',
      icerikId: metin(o.id),
      ad: metin(o.baslik) || 'Ödev',
      kisa: 'Ö' + (liste.length + 1),
      maks: maks > 0 ? maks : 100,
      yayinlandi: true,
    });
  });
  (a.ekKalemler || []).forEach((k) => {
    const maks = sayi(k.maks);
    liste.push({
      id: metin(k.id),
      tur: 'ek',
      ad: metin(k.ad) || 'Not',
      kisa: metin(k.kisa) || kisaAd(k.ad),
      maks: maks > 0 ? maks : 100,
      yayinlandi: !!k.yayinlandi,
    });
  });
  const girildi = liste.some((k) => metin(ag[k.id]) !== '');
  const esit = liste.length ? Math.round((100 / liste.length) * 100) / 100 : 0;
  liste.forEach((k) => {
    const v = sayi(ag[k.id]);
    k.agirlik = girildi ? (Number.isFinite(v) && v > 0 ? v : 0) : esit;
  });
  return liste;
}

export const agirlikToplami = (kalemler) =>
  Math.round((kalemler || []).reduce((t, k) => t + (sayi(k.agirlik) || 0), 0) * 100) / 100;

/**
 * Ağırlıklı ortalama (100 üzerinden). Notu girilmemiş kalem 0 sayılır ama
 * `eksik` ile bildirilir. Ağırlık toplamı 100 değilse toplama göre ölçeklenir.
 * @param {(kalem) => number|''} puanBul
 * @returns {{ort: number|'', eksik: number}}
 */
export function agirlikliOrtalama(kalemler, puanBul) {
  const ks = (kalemler || []).filter((k) => sayi(k.agirlik) > 0);
  const toplam = ks.reduce((t, k) => t + sayi(k.agirlik), 0);
  if (!toplam) return { ort: '', eksik: 0 };
  let eksik = 0;
  let notVar = false;
  let ham = 0;
  ks.forEach((k) => {
    const p = puanBul(k);
    const n = sayi(p);
    if (metin(p) === '' || !Number.isFinite(n)) {
      eksik++;
      return;
    }
    notVar = true;
    ham += (Math.min(n, k.maks) / k.maks) * 100 * sayi(k.agirlik);
  });
  if (!notVar) return { ort: '', eksik };
  return { ort: Math.round((ham / toplam) * 100) / 100, eksik };
}

/** Harf notu (100'lük ölçek, bağıl değil). Boş puan → ''. */
export const HARF_OLCEGI = [
  [90, 'AA'],
  [85, 'BA'],
  [80, 'BB'],
  [75, 'CB'],
  [70, 'CC'],
  [65, 'DC'],
  [60, 'DD'],
  [50, 'FD'],
  [0, 'FF'],
];
export function harfNotu(puan) {
  const n = sayi(puan);
  if (metin(puan) === '' || !Number.isFinite(n)) return '';
  return (HARF_OLCEGI.find(([alt]) => n >= alt) || HARF_OLCEGI[HARF_OLCEGI.length - 1])[1];
}

/**
 * Not ayarını doğrular ve temizler (sunucu yazmadan önce çağırır).
 * @param {object} govde { agirliklar, ekKalemler }
 * @param {string[]} gecerliOdevIdleri odadaki ödev kimlikleri
 * @param {() => string} yeniId ek kalem kimliği üretici
 * @returns {{hata?: string, ayar?: object}}
 */
export function notAyariDogrula(govde, gecerliOdevIdleri, yeniId) {
  const g = govde || {};
  const ek = Array.isArray(g.ekKalemler) ? g.ekKalemler : [];
  if (ek.length > EK_KALEM_SINIRI)
    return { hata: 'En çok ' + EK_KALEM_SINIRI + ' ek sütun açılabilir.' };
  const ekKalemler = [];
  for (const k of ek) {
    const ad = metin(k && k.ad).slice(0, 60);
    if (!ad) return { hata: 'Ek sütunun adı boş olamaz.' };
    const maks = metin(k.maks) === '' ? 100 : sayi(k.maks);
    if (!Number.isFinite(maks) || maks <= 0 || maks > 1000)
      return { hata: '"' + ad + '" için en yüksek puan 1 ile 1000 arasında olmalı.' };
    const id = /^ek:[A-Za-z0-9_-]{1,40}$/.test(metin(k.id)) ? metin(k.id) : 'ek:' + yeniId();
    if (ekKalemler.some((x) => x.id === id)) return { hata: 'Ek sütun kimliği yinelendi.' };
    ekKalemler.push({
      id,
      ad,
      kisa: metin(k.kisa).slice(0, 6) || kisaAd(ad),
      maks,
      yayinlandi: !!k.yayinlandi,
    });
  }
  const gecerli = new Set(
    (gecerliOdevIdleri || []).map(odevKalemId).concat(ekKalemler.map((k) => k.id))
  );
  const agirliklar = {};
  const ham = g.agirliklar && typeof g.agirliklar === 'object' ? g.agirliklar : {};
  for (const [anahtar, v] of Object.entries(ham)) {
    if (metin(v) === '') continue;
    const n = sayi(v);
    if (!Number.isFinite(n) || n < 0 || n > 100)
      return { hata: 'Ağırlıklar 0 ile 100 arasında olmalı.' };
    if (gecerli.has(anahtar)) agirliklar[anahtar] = Math.round(n * 100) / 100;
  }
  return { ayar: { agirliklar, ekKalemler } };
}

// ── ÖĞRENCİYE GÖSTERİLEN ÇİZELGE: KİMLİK MASKESİ ──
/** "Ayşe Nur Yılmaz" → "A*** N** Y*****" (her kelimenin ilk harfi kalır). */
export function adMaskele(ad) {
  return metin(ad)
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0] + '*'.repeat(Math.max(2, Math.min(w.length - 1, 6))))
    .join(' ');
}
/** Öğrenci numarası tamamen yıldızlanır (uzunluk sabit, ipucu vermez). */
export const noMaskele = () => '*********';

// ── BİLDİRİM METİNLERİ ──
/**
 * @param {'odev'|'duyuru'|'not'|'yeniden-acildi'|'hatirlatma'|'yorum'} tur
 * @param {object} v { dersKod, baslik, puan, maks, sonTarih, yazar }
 */
export function bildirimMetni(tur, v) {
  const d = v || {};
  const ders = metin(d.dersKod) ? metin(d.dersKod) + ' — ' : '';
  const baslik = metin(d.baslik);
  switch (tur) {
    case 'odev':
      return {
        title: 'Yeni ödev: ' + baslik,
        body:
          ders +
          'Yeni ödev yayınlandı' +
          (d.sonTarih ? '. Son teslim: ' + tarihSaat(d.sonTarih) : '') +
          '.',
      };
    case 'duyuru':
      return { title: 'Ders odası duyurusu', body: ders + (baslik || 'Yeni duyuru') };
    case 'not':
      return {
        title: 'Notunuz verildi: ' + baslik,
        body: ders + 'Notunuz: ' + puanMetni(d.puan) + (d.maks ? ' / ' + d.maks : '') + '.',
      };
    case 'yeniden-acildi':
      return {
        title: 'Teslim yeniden açıldı: ' + baslik,
        body:
          ders +
          'Bu ödeve yeniden teslim yapabilirsiniz' +
          (d.sonTarih ? '. Yeni son tarih: ' + tarihSaat(d.sonTarih) : '') +
          '.',
      };
    case 'hatirlatma':
      return {
        title: 'Son teslim yaklaşıyor: ' + baslik,
        body: ders + 'Ödevi henüz teslim etmediniz. Son teslim: ' + tarihSaat(d.sonTarih) + '.',
      };
    case 'yorum':
      return {
        title: 'Yeni yorum: ' + baslik,
        body: ders + metin(d.yazar) + ' yorum yazdı.',
      };
    default:
      return { title: 'Ders odası', body: ders + baslik };
  }
}

export function tarihSaat(v) {
  const d = new Date(v);
  if (isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat('tr-TR', {
    timeZone: TR_SAAT,
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
    .format(d)
    .replace(',', '');
}

/** Son tarihe 24 saatten az kalmış ve henüz hatırlatılmamış mı? */
export function hatirlatmaZamaniMi(odev, simdi, saat) {
  const o = odev || {};
  if (o.hatirlatildi || o.kabulAcik === false || !metin(o.sonTarih)) return false;
  const t = zaman(o.sonTarih);
  const s = simdiMs(simdi);
  const pencere = (Number(saat) > 0 ? Number(saat) : 24) * 3600 * 1000;
  return Number.isFinite(t) && t > s && t - s <= pencere;
}

// ── DERS SAATİ ÖZETİ (Akış → "Ders bilgisi" kartı) ──
// Ders programı bölüm + sınıf başına course_schedules dokümanlarında durur;
// slot anahtarı `Pazartesi_3` gibi SAAT İNDEKSİDİR, etiketi bölümün saat
// ayarından gelir. Aynı günün art arda saatleri tek aralığa toplanır:
//   Pazartesi 09:30-10:15, 10:30-11:15, 11:30-12:15 → "09:30 - 12:15"
const GUNLER = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar'];

/** Ders kodu karşılaştırma anahtarı: büyük harf, boşluksuz, İ→I. */
export function dersKodAnahtari(kod) {
  return metin(kod).toLocaleUpperCase('tr-TR').replace(/İ/g, 'I').replace(/\s+/g, '');
}

/**
 * @param {object[]} dokumanlar course_schedules kayıtları
 * @param {object} o
 * @param {string} o.dersKod
 * @param {string} [o.yari] 'guz' | 'bahar' — dokümanın dönemi buna uymalı
 * @param {(slot:object)=>object[]} o.slotDersleri lib/ders-slot.js
 * @param {(bolumId:string, seviye:string)=>string[]} o.saatler saat etiketleri
 * @returns {{gun:string, baslangic:string, bitis:string, derslikler:string[]}[]}
 */
export function dersProgramiOzeti(dokumanlar, o) {
  const op = o || {};
  const hedef = dersKodAnahtari(op.dersKod);
  if (!hedef || typeof op.slotDersleri !== 'function') return [];
  const saatler = typeof op.saatler === 'function' ? op.saatler : () => [];
  const kayit = new Map(); // gun|indeks|bolum → { gun, i, etiket, derslik }
  (dokumanlar || []).forEach((dok) => {
    if (!dok) return;
    const parca = metin(dok.id || dok._docId).split('_');
    const yari = metin(dok.semester) || parca[1] || '';
    if (op.yari && yari && yari !== op.yari) return;
    const bolum = metin(dok.departmentId) || parca[0] || '';
    const seviye = metin(dok.seviye) || (parca.length >= 4 ? parca[3] : 'lisans');
    const etiketler = saatler(bolum, seviye) || [];
    Object.entries(dok.slots || {}).forEach(([anahtar, slot]) => {
      const [gun, iStr] = String(anahtar).split('_');
      const i = parseInt(iStr, 10);
      if (!GUNLER.includes(gun) || !Number.isInteger(i)) return;
      op.slotDersleri(slot).forEach((d) => {
        if (dersKodAnahtari(d.courseCode) !== hedef) return;
        const k = gun + '|' + i;
        const onceki = kayit.get(k);
        const derslik = metin(d.classroom);
        if (onceki) {
          if (derslik && !onceki.derslikler.includes(derslik)) onceki.derslikler.push(derslik);
          return;
        }
        kayit.set(k, { gun, i, etiket: metin(etiketler[i]), derslikler: derslik ? [derslik] : [] });
      });
    });
  });
  const bas = (e) => (e.split('-')[0] || '').trim();
  const son = (e) => (e.split('-')[1] || '').trim();
  const out = [];
  [...kayit.values()]
    .sort((a, b) => GUNLER.indexOf(a.gun) - GUNLER.indexOf(b.gun) || a.i - b.i)
    .forEach((k) => {
      const sonGrup = out[out.length - 1];
      if (sonGrup && sonGrup.gun === k.gun && sonGrup._i + 1 === k.i) {
        sonGrup._i = k.i;
        if (son(k.etiket)) sonGrup.bitis = son(k.etiket);
        k.derslikler.forEach((d) => !sonGrup.derslikler.includes(d) && sonGrup.derslikler.push(d));
        return;
      }
      out.push({
        gun: k.gun,
        _i: k.i,
        baslangic: bas(k.etiket),
        bitis: son(k.etiket),
        derslikler: k.derslikler.slice(),
      });
    });
  return out.map((g) => ({
    gun: g.gun,
    baslangic: g.baslangic,
    bitis: g.bitis,
    derslikler: g.derslikler,
  }));
}

/** Bağlantı güvenli mi (canlı ders linki, paylaşımdaki URL)? Yalnız http(s). */
export function guvenliBaglanti(v) {
  const s = metin(v);
  if (!s || s.length > 500) return '';
  try {
    const u = new globalThis.URL(s);
    return u.protocol === 'https:' || u.protocol === 'http:' ? u.toString() : '';
  } catch {
    return '';
  }
}

/** Metni düz parça + bağlantı parçalarına böler (paylaşım metnindeki URL'ler). */
export function baglantilariAyir(yazi) {
  const s = String(yazi == null ? '' : yazi);
  const rx = /https?:\/\/[^\s<>"']+/g;
  const out = [];
  let son = 0;
  let m;
  while ((m = rx.exec(s)) !== null) {
    let url = m[0];
    // Cümle sonu noktalaması bağlantıya dahil değildir.
    const kuyruk = /[.,;:!?)\]]+$/.exec(url);
    if (kuyruk) url = url.slice(0, -kuyruk[0].length);
    if (m.index > son) out.push({ t: s.slice(son, m.index) });
    out.push({ url });
    son = m.index + url.length;
    rx.lastIndex = son;
  }
  if (son < s.length) out.push({ t: s.slice(son) });
  return out;
}

/** "Bugün, 09:15" · "Dün, 18:40" · "12 Eki 2026 14:00" (Türkiye saati). */
export function akisZamani(v, simdi) {
  const d = new Date(v);
  if (isNaN(d.getTime())) return '';
  const gun = (t) =>
    new Intl.DateTimeFormat('en-CA', {
      timeZone: TR_SAAT,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(t);
  const saat = new Intl.DateTimeFormat('tr-TR', {
    timeZone: TR_SAAT,
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
  const n = simdi == null ? new Date() : new Date(simdi);
  if (gun(d) === gun(n)) return 'Bugün, ' + saat;
  const dun = new Date(n.getTime() - 24 * 3600 * 1000);
  if (gun(d) === gun(dun)) return 'Dün, ' + saat;
  return tarihSaat(d);
}
