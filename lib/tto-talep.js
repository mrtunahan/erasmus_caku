// ══════════════════════════════════════════════════════════════
// TTO — ÜNİVERSİTE İLE İŞBİRLİĞİ TALEP FORMU (TTO-TF-001)
//
// Teknoloji Transfer Ofisi'nin (ÇAKÜ TTO A.Ş.) kâğıt formunun dijital hâli.
// Süreç iki taraflıdır:
//   1) AKADEMİSYEN formu doldurur, taslak saklar, Word olarak dışa aktarır
//      ve TTO yöneticisine gönderir.
//   2) TTO YÖNETİCİSİ (bir akademisyen de olabilir; `isTtoYoneticisi`)
//      talebi inceler, "TTO tarafından doldurulacaktır" alanlarını (talep no,
//      başvuruyu alan kişi) doldurur, onaylar ya da düzeltme için iade eder
//      ve onaylı belgeyi akademisyene geri gönderir.
//
// Bu dosya İSTEMCİ ve SUNUCUNUN ORTAK kural dosyasıdır: hangi alanın zorunlu
// olduğu, kimin hangi durumdan hangisine geçebileceği ve akademisyenin hangi
// alanlara dokunamayacağı burada, bir kez tanımlanır. Arayüz bu kurallarla
// düğmeleri gösterir; sunucu (server/routes/db.js) aynı kurallarla isteği
// kabul ya da reddeder. İki kopya tutulsaydı biri değişip öteki kalırdı.
// ══════════════════════════════════════════════════════════════

import { unvaniAyir } from './akademik-unvan.js';

const metin = (v) => String(v == null ? '' : v).trim();

// ── BELGE ÜST/ALT BİLGİSİ (değişkenler) ──
// Formun üst bilgisindeki doküman kodu, yayın/revizyon bilgisi ve alt
// bilgisindeki iletişim satırları kuruma aittir ve zamanla değişir (yeni
// revizyon, yeni telefon). Koda gömülmezler: `tto_ayarlar/genel` kaydında
// tutulur, TTO yöneticisi kendi panelinden değiştirir (2. aşama). Kayıt
// yoksa aşağıdaki varsayılanlar kullanılır — bunlar formun 13.02.2026
// tarihli 002 revizyonundan alınmıştır.
export const TTO_AYAR_VARSAYILAN = {
  dokumanKodu: 'TTO-TF-001',
  yayinTarihi: '13.02.2026',
  revizyonNo: '002',
  revizyonTarihi: '13.02.2026',
  kurumUst: 'T.C. ÇANKIRI KARATEKİN ÜNİVERSİTESİ',
  kurumAdi: 'TEKNOLOJİ TRANSFER OFİSİ ANONİM ŞİRKETİ (ÇAKÜ TTO A.Ş.)',
  formAdi: 'ÜNİVERSİTE İLE İŞBİRLİĞİ TALEP FORMU',
  ttoAdres:
    'Kırkevler Mah. Kastamonu Cad. Karatekin Üniversitesi Rektörlük Binası No:244 Merkez / ÇANKIRI',
  ttoTelefon: '+90 376 218 95 32 – 8383',
  ttoEposta: 'tto@karatekin.edu.tr',
  ttoWeb: 'https://tto.karatekin.edu.tr',
  beyanMetni:
    'Tarafımdan doldurulmuş olan işbu ÇAKÜ TTO A.Ş. ile İşbirliği Talep Formunda belirtmiş ' +
    'olduğum bilgilerin doğruluğunu beyan ederim. Talep ettiğim hizmetler için gereğini arz ederim.',
};

/** Kayıttaki ayarları varsayılanlarla birleştirir (boş alan varsayılana düşer). */
export function ttoAyarlari(kayit) {
  const k = kayit && typeof kayit === 'object' ? kayit : {};
  const out = {};
  Object.keys(TTO_AYAR_VARSAYILAN).forEach((a) => {
    out[a] = metin(k[a]) || TTO_AYAR_VARSAYILAN[a];
  });
  return out;
}

// ── FORM ALANLARI ──
export const TTO_GENEL_ALANLAR = [
  { id: 'adSoyad', label: 'Adı Soyadı', zorunlu: true },
  { id: 'unvan', label: 'Ünvan', zorunlu: true },
  { id: 'kurum', label: 'Kurum/Firma', zorunlu: true },
  { id: 'adres', label: 'Adres', cokSatir: true },
  { id: 'gsm', label: 'GSM', tip: 'tel' },
  { id: 'isTelefonu', label: 'İş Telefonu', tip: 'tel' },
  { id: 'email', label: 'E-posta', tip: 'email', zorunlu: true },
  { id: 'web', label: 'Web Adresi' },
  { id: 'vergiDairesi', label: 'Vergi Dairesi' },
  { id: 'vergiNo', label: 'Vergi Numarası' },
  { id: 'faaliyetAlani', label: 'Firma Faaliyet Alanı', cokSatir: true },
];

// Talebin niteliği — formdaki sıra ve numaralar korunur (belge çıktısı ve
// şablon değişkenleri bu sıraya dayanır).
export const TTO_NITELIKLER = [
  { id: 'danismanlik', no: 1, label: 'TTO Danışmanlık Hizmeti' },
  { id: 'laboratuvar', no: 2, label: 'Laboratuvar – test analiz hizmetleri' },
  { id: 'projeDestegi', no: 3, label: 'Proje desteği', proje: true },
  { id: 'projeOrtagi', no: 4, label: 'Proje ortağına ihtiyacım var', proje: true },
  { id: 'lisansustu', no: 5, label: 'Lisansüstü tez çalışması / Öğrenci' },
  { id: 'fikriMulkiyet', no: 6, label: 'Fikri mülki hakların yönetimi ve ticarileştirme' },
];

// Proje bilgileri. `evetHayir` sorular iki seçenekli; 9. soru "evet" ise
// açıklama ister.
export const TTO_PROJE_ALANLAR = [
  { id: 'ad', no: 1, label: 'Projenin adı nedir?' },
  {
    id: 'destekProgrami',
    no: 2,
    label: 'Başvurulan / başvurulacak destek programı nedir?',
    ipucu: 'TÜBİTAK, AB, KOSGEB gibi',
  },
  { id: 'konu', no: 3, label: 'Proje konusu / amacı nedir?', cokSatir: true },
  { id: 'butce', no: 4, label: 'Projenin planlanan bütçesi nedir?' },
  { id: 'sure', no: 5, label: 'Projenin planlanan süresi nedir?' },
  { id: 'ortaklar', no: 6, label: 'Proje ortakları (sektörler / tedarikçiler)', cokSatir: true },
  { id: 'ticarilesme', no: 7, label: 'Projenin ticarileşme potansiyeli var mı?', evetHayir: true },
  {
    id: 'patent',
    no: 8,
    label: 'Proje çıktısı ile patent vb. başvuru yapılacak mıdır?',
    evetHayir: true,
  },
  { id: 'benzer', no: 9, label: 'Benzer proje/projeler var mı?', evetHayir: true },
];

export const TTO_OZET_SINIRI = 4000;

// ── DURUMLAR ──
export const TTO_DURUMLAR = {
  taslak: { label: 'Taslak', renk: '#64748B' },
  gonderildi: { label: 'TTO’ya gönderildi', renk: '#2563EB' },
  incelemede: { label: 'İncelemede', renk: '#D97706' },
  iade: { label: 'Düzeltme için iade edildi', renk: '#DC2626' },
  onaylandi: { label: 'Onaylandı', renk: '#059669' },
  reddedildi: { label: 'Reddedildi', renk: '#7F1D1D' },
};

/** Akademisyen formu bu durumda düzenleyebilir mi? */
export function akademisyenDuzenleyebilirMi(durum) {
  return durum === 'taslak' || durum === 'iade' || !durum;
}

/**
 * Akademisyenin (talep sahibinin) yapabileceği durum geçişleri.
 *   taslak/iade → gonderildi   (TTO'ya gönder)
 *   gonderildi  → taslak       (inceleme başlamadan geri çek)
 * İnceleme, onay, iade ve ret TTO yöneticisinindir (2. aşama).
 */
export const TTO_SAHIP_GECISLERI = {
  taslak: ['taslak', 'gonderildi'],
  iade: ['iade', 'gonderildi'],
  gonderildi: ['gonderildi', 'taslak'],
  incelemede: ['incelemede'],
  onaylandi: ['onaylandi'],
  reddedildi: ['reddedildi'],
};

export function sahipGecisiGecerliMi(eski, yeni) {
  const e = eski || 'taslak';
  const y = yeni || e;
  return (TTO_SAHIP_GECISLERI[e] || []).indexOf(y) >= 0;
}

// "TTO tarafından doldurulacaktır" alanları ve karar alanları. Talep sahibi
// bunları YAZAMAZ — sunucu istekten düşürür. Aksi hâlde akademisyen kendi
// talebine numara verip "onaylandı" damgası vurabilirdi.
export const TTO_YONETICI_ALANLARI = [
  'talepNo',
  'talepTarihi',
  'alanKisi',
  'yoneticiNotu',
  'karar',
  'kararVeren',
  'kararTarihi',
  'onayliBelgeUrl',
  'onayliBelgeAdi',
  'incelemeBaslangic',
];

// Sunucunun damgaladığı alanlar: istemci değeri yok sayılır.
export const TTO_SUNUCU_ALANLARI = ['sahip', 'gonderimTarihi', 'gecmis'];

/** Talep proje ile ilgili mi? (formdaki 3. ve 4. seçenek) */
export function projeBilgisiGerekliMi(talep) {
  const n = Array.isArray(talep && talep.nitelik) ? talep.nitelik : [];
  return TTO_NITELIKLER.some((x) => x.proje && n.indexOf(x.id) >= 0);
}

const EPOSTA = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Gönderim öncesi denetim. Taslak kaydı için çağrılmaz — yarım form
 * saklanabilir; eksikler ancak TTO'ya gönderirken aranır.
 * @returns {string[]} hata iletileri (boşsa gönderilebilir)
 */
export function talepHatalari(talep) {
  const t = talep || {};
  const g = t.genel || {};
  const hatalar = [];
  TTO_GENEL_ALANLAR.filter((a) => a.zorunlu).forEach((a) => {
    if (!metin(g[a.id])) hatalar.push(a.label + ' zorunludur.');
  });
  if (metin(g.email) && !EPOSTA.test(metin(g.email))) {
    hatalar.push('E-posta adresi geçerli değil.');
  }
  if (!metin(g.gsm) && !metin(g.isTelefonu)) {
    hatalar.push('GSM ya da iş telefonundan en az biri girilmelidir.');
  }
  const n = Array.isArray(t.nitelik) ? t.nitelik : [];
  if (n.length === 0) hatalar.push('Talebin niteliğinden en az birini seçin.');
  if (projeBilgisiGerekliMi(t)) {
    const p = t.proje || {};
    TTO_PROJE_ALANLAR.forEach((a) => {
      const v = metin(p[a.id]);
      if (a.evetHayir) {
        if (v !== 'evet' && v !== 'hayir') {
          hatalar.push('Proje bilgileri ' + a.no + '. soru yanıtlanmalıdır.');
        }
      } else if (!v) {
        hatalar.push('Proje bilgileri ' + a.no + '. soru zorunludur (' + a.label + ').');
      }
    });
    if (metin(p.benzer) === 'evet' && !metin(p.benzerAciklama)) {
      hatalar.push('Benzer proje varsa ne olduğunu yazın (9. soru).');
    }
  }
  const ozet = metin(t.ozet);
  if (!ozet) hatalar.push('Talep özeti zorunludur.');
  if (ozet.length > TTO_OZET_SINIRI) {
    hatalar.push('Talep özeti en çok ' + TTO_OZET_SINIRI + ' karakter olabilir.');
  }
  if (t.beyan !== true) hatalar.push('Beyan kutusunu onaylayın.');
  return hatalar;
}

export const TTO_KURUM_VARSAYILAN = 'Çankırı Karatekin Üniversitesi';

// ══════════════════════════════════════════════════════════════
// BENİM SAYFAM → FORM
//
// Akademisyenin kendi bilgileri (professors kaydı; Benim Sayfam ve Bölüm
// Yönetimi aynı kayda yazar) formun genel bilgilerine aktarılır:
//   ad            → Adı Soyadı      (unvan ADDAN AYRILIR)
//   unvan/title   → Ünvan           (yoksa addan ayrılan unvan)
//   bölüm         → Kurum/Firma     ("Çankırı Karatekin Üniversitesi – Bölüm")
//   email         → E-posta
//   dahili        → İş Telefonu     ("Dahili: 1234")
//
// ⚠ ÜNVAN ADIN İÇİNDE DURUYOR. Kayıtlarda ad çoğu zaman unvanlıdır
// ("Arş. Gör. A. Tunahan KORKMAZ"); doğrudan kopyalanınca formun "Adı
// Soyadı" kutusunda unvan da görünüyordu. lib/akademik-unvan.js'teki ayırıcı
// tanınan unvanı keser; tanımadığı bir önek varsa ada dokunmaz (uydurma yok).
// ══════════════════════════════════════════════════════════════
export function profildenGenelBilgi(profil, bolumAdi) {
  const p = profil || {};
  const ayrik = unvaniAyir(metin(p.adSoyad || p.name));
  const unvan = metin(p.unvan || p.title) || ayrik.unvan;
  const dahili = metin(p.dahili);
  const bolum = metin(bolumAdi);
  return {
    adSoyad: ayrik.ad || metin(p.adSoyad || p.name),
    unvan,
    kurum: metin(p.kurum) || TTO_KURUM_VARSAYILAN + (bolum ? ' – ' + bolum : ''),
    email: metin(p.email),
    isTelefonu: metin(p.isTelefonu) || (dahili ? 'Dahili: ' + dahili : ''),
  };
}

/** Profilden gelen alanların listesi (arayüzde "Benim Sayfam'dan" etiketi). */
export const TTO_PROFIL_ALANLARI = ['adSoyad', 'unvan', 'kurum', 'email', 'isTelefonu'];

/** Boş bir talep; genel bilgiler akademisyen profilinden önceden doldurulur. */
export function bosTalep(profil, bolumAdi) {
  const pg = profildenGenelBilgi(profil, bolumAdi);
  return {
    durum: 'taslak',
    genel: {
      adSoyad: pg.adSoyad,
      unvan: pg.unvan,
      kurum: pg.kurum,
      adres: '',
      gsm: '',
      isTelefonu: pg.isTelefonu,
      email: pg.email,
      web: '',
      vergiDairesi: '',
      vergiNo: '',
      faaliyetAlani: '',
    },
    nitelik: [],
    proje: {
      ad: '',
      destekProgrami: '',
      konu: '',
      butce: '',
      sure: '',
      ortaklar: '',
      ticarilesme: '',
      patent: '',
      benzer: '',
      benzerAciklama: '',
    },
    ozet: '',
    beyan: false,
  };
}

// ══════════════════════════════════════════════════════════════
// SUNUCU KARARI: talep sahibi (akademisyen) bu yazmayı yapabilir mi?
//
// TTO yöneticisi ve üniversite yetkilisi bu kararın DIŞINDADIR (çağıran
// taraf onları önceden ayırır). Karar `veri`yi YERİNDE temizler:
// yönetici alanları ve sunucu damgaları düşer, sahiplik damgalanır.
//
// @param {object} p
// @param {'add'|'set'|'update'|'delete'} p.tur   işlem türü
// @param {object|null} p.mevcut  veritabanındaki kayıt (yoksa null)
// @param {object} p.veri         yazılacak gövde (add/set/update)
// @param {string} p.kimlik       işlemi yapanın kimliği (JWT identifier)
// @param {Date}   [p.simdi]
// @returns {{izin: boolean, hata?: string}}
// ══════════════════════════════════════════════════════════════
export function sahipYazmaKarari(p) {
  const tur = p && p.tur;
  const mevcut = (p && p.mevcut) || null;
  const veri = p && p.veri && typeof p.veri === 'object' ? p.veri : null;
  const kimlik = metin(p && p.kimlik);
  const simdi = (p && p.simdi) || new Date();
  if (!kimlik) return { izin: false, hata: 'Kimlik çözülemedi.' };

  // Başkasının talebi: okuma kapsamı zaten kapalı; yazma da kapalıdır.
  if (mevcut && metin(mevcut.sahip) !== kimlik) {
    return { izin: false, hata: 'Bu talep size ait değil.' };
  }

  if (tur === 'delete') {
    if (!mevcut) return { izin: true };
    if ((mevcut.durum || 'taslak') !== 'taslak') {
      return {
        izin: false,
        hata: 'Yalnız taslak talepler silinebilir. Gönderilmiş talebi önce geri çekin.',
      };
    }
    return { izin: true };
  }

  if (!veri) return { izin: false, hata: 'Geçersiz istek.' };

  // Noktalı anahtar (ör. 'genel.email') alan listesini atlatmanın kapısıdır;
  // form her zaman bütün alt nesneyi yazar.
  const noktali = Object.keys(veri).filter((k) => k.indexOf('.') >= 0 || k.charAt(0) === '$');
  if (noktali.length > 0) {
    return { izin: false, hata: 'Geçersiz alan: ' + noktali.join(', ') };
  }

  TTO_YONETICI_ALANLARI.concat(TTO_SUNUCU_ALANLARI).forEach((a) => {
    delete veri[a];
  });

  const eskiDurum = mevcut ? mevcut.durum || 'taslak' : 'taslak';
  const yeniDurum = 'durum' in veri ? metin(veri.durum) : eskiDurum;
  if (!TTO_DURUMLAR[yeniDurum]) {
    return { izin: false, hata: 'Geçersiz durum.' };
  }
  if (!sahipGecisiGecerliMi(eskiDurum, yeniDurum)) {
    return {
      izin: false,
      hata:
        'Bu talep "' + (TTO_DURUMLAR[eskiDurum] || {}).label + '" durumunda; bu işlem yapılamaz.',
    };
  }

  // İçerik yalnız düzenlenebilir durumdayken değişir. Gönderilmiş talepte
  // yalnız "geri çek" (durum → taslak) yazılabilir.
  const icerikAlanlari = Object.keys(veri).filter(
    (k) => k !== 'durum' && k !== 'updatedAt' && k !== 'createdAt'
  );
  if (!akademisyenDuzenleyebilirMi(eskiDurum) && icerikAlanlari.length > 0) {
    return {
      izin: false,
      hata: 'Gönderilmiş talep değiştirilemez. Değişiklik için önce geri çekin.',
    };
  }

  if (yeniDurum === 'gonderildi' && eskiDurum !== 'gonderildi') {
    // Gönderimde form eksiksiz olmalı: kayıttaki hâl ile gelen yamanın
    // birleşimi denetlenir (yama yalnız durumu taşıyabilir).
    const birlesik = Object.assign({}, mevcut || {}, veri);
    const hatalar = talepHatalari(birlesik);
    if (hatalar.length > 0) {
      return { izin: false, hata: 'Talep eksik: ' + hatalar.join(' ') };
    }
    veri.gonderimTarihi = simdi.toISOString();
  }

  veri.sahip = kimlik;
  const olay =
    yeniDurum !== eskiDurum
      ? yeniDurum === 'gonderildi'
        ? 'gonderildi'
        : yeniDurum === 'taslak'
          ? 'geri_cekildi'
          : yeniDurum
      : mevcut
        ? 'duzenlendi'
        : 'olusturuldu';
  const gecmis = Array.isArray(mevcut && mevcut.gecmis) ? mevcut.gecmis.slice(-49) : [];
  gecmis.push({ at: simdi.toISOString(), kim: kimlik, olay });
  veri.gecmis = gecmis;
  return { izin: true };
}

// ══════════════════════════════════════════════════════════════
// ŞABLON DEĞİŞKENLERİ
//
// Üniversite yetkilisi TTO şablonunu (.docx) Şablonlar modülüne yükler ve
// şablondaki yer tutucuları aşağıdaki değişkenlere eşler. Onay kutuları
// için ☒ / ☐ değerleri üretilir: şablonda kutunun yerine bir yer tutucu
// konur, belge çıktısında doğru işaret basılır.
// ══════════════════════════════════════════════════════════════
const KUTU_DOLU = '☒';
const KUTU_BOS = '☐';

export const TTO_SABLON_DEGISKENLERI = [
  // Üst/alt bilgi — kuruma ait (tto_ayarlar); 2. aşamada yönetici değiştirir.
  { id: 'dokumanKodu', label: 'Doküman Kodu' },
  { id: 'yayinTarihi', label: 'Yayın Tarihi' },
  { id: 'revizyonNo', label: 'Revizyon No' },
  { id: 'revizyonTarihi', label: 'Revizyon Tarihi' },
  { id: 'ttoAdres', label: 'TTO Adres' },
  { id: 'ttoTelefon', label: 'TTO Telefon' },
  { id: 'ttoEposta', label: 'TTO E-posta' },
  { id: 'ttoWeb', label: 'TTO Web' },
  // TTO tarafından doldurulacaktır (2. aşama)
  { id: 'talepTarihi', label: 'Talep Tarihi (TTO doldurur)' },
  { id: 'talepNo', label: 'Talep No (TTO doldurur)' },
  { id: 'alanKisi', label: 'Başvuruyu Alan Kişi (TTO doldurur)' },
  // Genel bilgiler — büyük/küçük harf OLDUĞU GİBİ basılır ("KORKMAZ" gibi
  // büyük harfli soyadı akademik yazımın parçasıdır; biçimlendirilmez).
  { id: 'adSoyad', label: 'Adı Soyadı' },
  { id: 'unvan', label: 'Ünvan' },
  { id: 'kurum', label: 'Kurum/Firma' },
  { id: 'adres', label: 'Adres' },
  { id: 'gsm', label: 'GSM' },
  { id: 'isTelefonu', label: 'İş Telefonu' },
  { id: 'email', label: 'E-posta' },
  { id: 'web', label: 'Web Adresi' },
  { id: 'vergiDairesi', label: 'Vergi Dairesi' },
  { id: 'vergiNo', label: 'Vergi Numarası' },
  { id: 'faaliyetAlani', label: 'Firma Faaliyet Alanı' },
  // Talebin niteliği — kutunun (☐) yerine {{Nitelik 1}} … {{Nitelik 6}}
  ...TTO_NITELIKLER.map((n) => ({
    id: 'nitelik_' + n.id,
    label: 'Nitelik ' + n.no + ' (' + n.label + ')',
    kutu: true,
  })),
  // Proje bilgileri — yanıt hücresine {{Proje 1}} … {{Proje 6}}; Evet/Hayır
  // kutularının yerine {{Proje 7 Evet}}, {{Proje 7 Hayır}} …
  { id: 'projeAd', label: 'Proje 1 (Projenin adı)' },
  { id: 'projeDestekProgrami', label: 'Proje 2 (Destek programı)' },
  { id: 'projeKonu', label: 'Proje 3 (Konu / amaç)' },
  { id: 'projeButce', label: 'Proje 4 (Bütçe)' },
  { id: 'projeSure', label: 'Proje 5 (Süre)' },
  { id: 'projeOrtaklar', label: 'Proje 6 (Ortaklar)' },
  { id: 'ticarilesmeEvet', label: 'Proje 7 Evet', kutu: true },
  { id: 'ticarilesmeHayir', label: 'Proje 7 Hayır', kutu: true },
  { id: 'patentEvet', label: 'Proje 8 Evet', kutu: true },
  { id: 'patentHayir', label: 'Proje 8 Hayır', kutu: true },
  { id: 'benzerEvet', label: 'Proje 9 Evet', kutu: true },
  { id: 'benzerHayir', label: 'Proje 9 Hayır', kutu: true },
  { id: 'benzerAciklama', label: 'Proje 9 Açıklama (Varsa nedir?)' },
  { id: 'ozet', label: 'Talep Özeti' },
  { id: 'basvuruSahibi', label: 'Başvuru Sahibi (Adı Soyadı)' },
  { id: 'belgeTarihi', label: 'Belge Tarihi' },
];

function trTarih(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return metin(iso);
  const iki = (x) => String(x).padStart(2, '0');
  return iki(d.getDate()) + '.' + iki(d.getMonth() + 1) + '.' + d.getFullYear();
}

/** Şablon motoruna verilecek düz değişken sözlüğü. */
export function ttoSablonVerisi(talep, ayarKaydi, simdi) {
  const t = talep || {};
  const g = t.genel || {};
  const p = t.proje || {};
  const a = ttoAyarlari(ayarKaydi);
  const n = Array.isArray(t.nitelik) ? t.nitelik : [];
  const eh = (v, beklenen) => (metin(v) === beklenen ? KUTU_DOLU : KUTU_BOS);
  const out = {
    dokumanKodu: a.dokumanKodu,
    yayinTarihi: a.yayinTarihi,
    revizyonNo: a.revizyonNo,
    revizyonTarihi: a.revizyonTarihi,
    ttoAdres: a.ttoAdres,
    ttoTelefon: a.ttoTelefon,
    ttoEposta: a.ttoEposta,
    ttoWeb: a.ttoWeb,
    talepTarihi: trTarih(t.talepTarihi),
    talepNo: metin(t.talepNo),
    alanKisi: metin(t.alanKisi),
    projeAd: metin(p.ad),
    projeDestekProgrami: metin(p.destekProgrami),
    projeKonu: metin(p.konu),
    projeButce: metin(p.butce),
    projeSure: metin(p.sure),
    projeOrtaklar: metin(p.ortaklar),
    ticarilesmeEvet: eh(p.ticarilesme, 'evet'),
    ticarilesmeHayir: eh(p.ticarilesme, 'hayir'),
    patentEvet: eh(p.patent, 'evet'),
    patentHayir: eh(p.patent, 'hayir'),
    benzerEvet: eh(p.benzer, 'evet'),
    benzerHayir: eh(p.benzer, 'hayir'),
    benzerAciklama: metin(p.benzer) === 'evet' ? metin(p.benzerAciklama) : '',
    ozet: metin(t.ozet),
    basvuruSahibi: metin(g.adSoyad),
    belgeTarihi: trTarih(t.gonderimTarihi || (simdi || new Date()).toISOString()),
  };
  TTO_GENEL_ALANLAR.forEach((f) => {
    out[f.id] = metin(g[f.id]);
  });
  TTO_NITELIKLER.forEach((x) => {
    out['nitelik_' + x.id] = n.indexOf(x.id) >= 0 ? KUTU_DOLU : KUTU_BOS;
  });
  return out;
}

// ══════════════════════════════════════════════════════════════
// YERLEŞİK WORD ÇIKTISI (şablon yüklenmemişse)
//
// Üniversite yetkilisi henüz şablon yüklemediyse akademisyen yine de formu
// Word olarak alabilmeli. Gövde, formun bölüm sırasını birebir izler.
// `w` parametresi lib/word-belge.js'in fonksiyonlarıdır (bağımlılık tersine
// çevrildi ki bu dosya Node'da da, tarayıcıda da test edilebilsin).
// ══════════════════════════════════════════════════════════════
export function ttoWordGovdesi(talep, ayarKaydi, w, simdi) {
  const v = ttoSablonVerisi(talep, ayarKaydi, simdi);
  const a = ttoAyarlari(ayarKaydi);
  const t = talep || {};
  const parca = [];
  parca.push(
    w.wordTablo({
      basliklar: [a.kurumUst + '\n' + a.kurumAdi + '\n' + a.formAdi, 'Doküman Bilgisi'],
      satirlar: [
        ['', 'Doküman Kodu: ' + v.dokumanKodu],
        ['', 'Yayın Tarihi: ' + v.yayinTarihi],
        ['', 'Revizyon No: ' + v.revizyonNo],
        ['', 'Revizyon Tarihi: ' + v.revizyonTarihi],
      ],
      oranlar: [3, 1.4],
    })
  );
  parca.push(
    w.wordTablo({
      basliklar: ['TTO tarafından doldurulacaktır', ''],
      satirlar: [
        ['Talep Tarihi', v.talepTarihi || '…… / …… / 20……'],
        ['Talep No', v.talepNo],
      ],
      oranlar: [1, 2],
    })
  );
  parca.push(
    w.wordTablo({
      basliklar: ['GENEL BİLGİLER', ''],
      satirlar: TTO_GENEL_ALANLAR.map((f) => [f.label, v[f.id]]),
      oranlar: [1, 2.4],
    })
  );
  parca.push(
    w.wordTablo({
      basliklar: ['TALEBİN NİTELİĞİ', ''],
      satirlar: TTO_NITELIKLER.map((x) => [x.no + '. ' + x.label, v['nitelik_' + x.id]]),
      oranlar: [5, 1],
      hizalar: ['left', 'center'],
    })
  );
  const eh = (evet, hayir) => evet + ' Evet    ' + hayir + ' Hayır';
  parca.push(
    w.wordTablo({
      basliklar: [
        'PROJE BİLGİLERİ (Talep proje ile ilgili ise kesinlikle doldurulması gerekmektedir)',
        '',
      ],
      satirlar: [
        ['1. Projenin adı nedir?', v.projeAd],
        [
          '2. Başvurulan / başvurulacak destek programı nedir? (TÜBİTAK, AB, KOSGEB gibi)',
          v.projeDestekProgrami,
        ],
        ['3. Proje konusu / amacı nedir?', v.projeKonu],
        ['4. Projenin planlanan bütçesi nedir?', v.projeButce],
        ['5. Projenin planlanan süresi nedir?', v.projeSure],
        ['6. Proje ortakları (sektörler / tedarikçiler)', v.projeOrtaklar],
        ['7. Projenin ticarileşme potansiyeli var mı?', eh(v.ticarilesmeEvet, v.ticarilesmeHayir)],
        [
          '8. Proje çıktısı ile patent vb. başvuru yapılacak mıdır?',
          eh(v.patentEvet, v.patentHayir),
        ],
        [
          '9. Benzer proje/projeler var mı? Varsa nedir?',
          eh(v.benzerEvet, v.benzerHayir) + (v.benzerAciklama ? '\n' + v.benzerAciklama : ''),
        ],
      ],
      oranlar: [2, 2],
    })
  );
  parca.push(w.wordSayfaSonu());
  parca.push(
    w.wordTablo({
      basliklar: ['TALEP ÖZETİ (Talebinizi kısaca açıklayınız.)'],
      satirlar: [[v.ozet || ' ']],
    })
  );
  parca.push(w.wordParagraf(a.beyanMetni, { boyut: 20, oncesi: 200, sonrasi: 200 }));
  parca.push(
    w.wordTablo({
      basliklar: ['BAŞVURU SAHİBİNİN', 'BAŞVURUYU ALAN KİŞİNİN'],
      satirlar: [
        ['Adı Soyadı: ' + v.basvuruSahibi, 'Adı Soyadı: ' + v.alanKisi],
        ['Kaşe ve İmza:', 'İmza:'],
        ['Tarih: ' + v.belgeTarihi, ''],
      ],
    })
  );
  if (t.durum === 'taslak' || !t.durum) {
    parca.push(
      w.wordParagraf('Bu çıktı TASLAKTIR; TTO’ya henüz gönderilmemiştir.', {
        italik: true,
        boyut: 16,
        renk: '9CA3AF',
      })
    );
  }
  parca.push(
    w.wordParagraf(
      a.ttoAdres + '\nTel: ' + a.ttoTelefon + '  e-posta: ' + a.ttoEposta + '  web: ' + a.ttoWeb,
      {
        boyut: 16,
        renk: '6B7280',
        hiza: 'center',
        oncesi: 300,
      }
    )
  );
  return parca.join('');
}

/**
 * İndirilecek dosyanın adı.
 *
 * ⚠ ASCII'ye indirgenir: Chromium, indirme adında Türkçe harf (ş, ğ, İ…)
 * görünce adı yok sayıp dosyayı "download" adıyla kaydediyordu (uçtan uca
 * testte görüldü). Ad yalnız dosyanın adıdır; belgenin içindeki metin
 * Türkçe kalır.
 */
export function ttoDosyaAdi(talep) {
  const g = (talep && talep.genel) || {};
  const harita = {
    ç: 'c',
    Ç: 'C',
    ğ: 'g',
    Ğ: 'G',
    ı: 'i',
    İ: 'I',
    ö: 'o',
    Ö: 'O',
    ş: 's',
    Ş: 'S',
    ü: 'u',
    Ü: 'U',
  };
  const ad = metin(g.adSoyad)
    .replace(/[çÇğĞıİöÖşŞüÜ]/g, (h) => harita[h])
    .replace(/[^A-Za-z0-9 ._-]+/g, ' ')
    .trim()
    .replace(/\s+/g, '_')
    .slice(0, 60);
  return 'TTO_Talep_Formu' + (ad ? '_' + ad : '') + '.docx';
}

// ══════════════════════════════════════════════════════════════
// YOL HARİTASI — modülün uygulama adımları (modül içindeki sekmede gösterilir)
// ══════════════════════════════════════════════════════════════
export const TTO_YOL_HARITASI = [
  {
    asama: '1. Aşama — Akademisyen',
    adimlar: [
      { baslik: 'Ortak alanda TTO modülü (yalnız personel)', durum: 'tamam' },
      {
        baslik: 'Talep formu: genel bilgiler, niteliği, proje bilgileri, özet, beyan',
        durum: 'tamam',
      },
      { baslik: 'Taslak kaydet / düzenle / sil', durum: 'tamam' },
      {
        baslik: 'Word olarak dışa aktar (şablon varsa şablondan, yoksa yerleşik biçim)',
        durum: 'tamam',
      },
      { baslik: 'TTO’ya gönder ve inceleme başlamadan geri çek', durum: 'tamam' },
      { baslik: 'Durum takibi ve onaylı belgeyi indirme ekranı', durum: 'tamam' },
      {
        baslik: 'Şablon: Şablonlar → TTO modülüne yalnız üniversite yetkilisi yükler',
        durum: 'tamam',
      },
      {
        baslik: 'Sunucu kuralları: yalnız kendi talebini görür/düzenler, öğrenciye kapalı',
        durum: 'tamam',
      },
    ],
  },
  {
    asama: '2. Aşama — TTO Yöneticisi',
    adimlar: [
      {
        baslik: 'Üniversite yetkilisinin akademisyene "TTO yöneticisi" yetkisi vermesi',
        durum: 'sirada',
      },
      { baslik: 'Yönetici paneli: gelen talepler listesi, filtre ve arama', durum: 'sirada' },
      { baslik: 'İncelemeye al, talep no ve başvuruyu alan kişiyi gir', durum: 'sirada' },
      { baslik: 'Onayla / düzeltme için iade et (not ile) / reddet', durum: 'sirada' },
      { baslik: 'Onaylı belgeyi üretip akademisyene geri gönder', durum: 'sirada' },
      {
        baslik: 'Şablon değişkenlerini (doküman kodu, revizyon, iletişim) panelden düzenleme',
        durum: 'sirada',
      },
      { baslik: 'Yeni talep ve karar bildirimleri (çan menüsü)', durum: 'sirada' },
    ],
  },
];
