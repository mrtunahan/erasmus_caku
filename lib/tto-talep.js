// ══════════════════════════════════════════════════════════════
// TTO — ÜNİVERSİTE İLE İŞBİRLİĞİ TALEP FORMU (TTO-TF-001)
//
// Teknoloji Transfer Ofisi'nin (ÇAKÜ TTO A.Ş.) kâğıt formunun dijital hâli.
// Süreç iki taraflıdır:
//   1) AKADEMİSYEN formu doldurur, taslak saklar, Word olarak dışa aktarır
//      ve TTO yöneticisine gönderir.
//   2) TTO YÖNETİCİSİ — TTO birimine kayıtlı akademisyen (ttoBirimUyesiMi)
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

// ── SÜREÇ VE DURUMLAR ──
//
//   AKADEMİSYEN formu doldurur → PDF indirir → imzalar, kaşeler → imzalı
//   PDF'i yükleyip gönderir                                  (gonderildi)
//   TTO inceler (incelemede); düzeltme ister (iade) ya da reddeder
//   TTO onaylar: talep no + TTO onaylı imzalı başvuru formu  (onaylandi)
//   TTO kendi imzaladığı PROFORMAYI yükler            (proforma_gonderildi)
//   AKADEMİSYEN proformayı firmaya doldurtur, imzalatıp kaşeletir ve
//   yükler                                                (proforma_dondu)
//   TTO Genel Sekreterliğe gönderir                  (genel_sekreterlikte)
//   Yönetim kararı çıkar: TTO kararı ve görevlendirme yazısını yükler
//                                                         (gorevlendirildi)
//   TTO faturayı keser ve yükler                              (tamamlandi)
//
// Her aşamanın ZORUNLU belgesi vardır (TTO_GECIS_BELGELERI); sunucu belge
// olmadan geçişe izin vermez. Belgeler yalnız PDF'tir ve iki taraf da hepsini
// görür ve indirir.
export const TTO_DURUMLAR = {
  taslak: { label: 'Taslak', renk: '#64748B' },
  gonderildi: { label: 'TTO’ya gönderildi', renk: '#2563EB' },
  incelemede: { label: 'İncelemede', renk: '#D97706' },
  iade: { label: 'Düzeltme için iade edildi', renk: '#DC2626' },
  onaylandi: { label: 'Başvuru onaylandı', renk: '#059669' },
  proforma_gonderildi: { label: 'Proforma akademisyende', renk: '#7C3AED' },
  proforma_dondu: { label: 'Firma onaylı proforma TTO’da', renk: '#0891B2' },
  genel_sekreterlikte: { label: 'Genel Sekreterlikte', renk: '#B45309' },
  gorevlendirildi: { label: 'Görevlendirme yazısı iletildi', renk: '#15803D' },
  tamamlandi: { label: 'Fatura kesildi — tamamlandı', renk: '#065F46' },
  reddedildi: { label: 'Reddedildi', renk: '#7F1D1D' },
};

/** Sürecin sıralı aşamaları (ilerleme çizgisi ve yol haritası). */
export const TTO_ASAMALAR = [
  { durum: 'gonderildi', kisa: 'Başvuru', kim: 'akademisyen' },
  { durum: 'onaylandi', kisa: 'TTO onayı', kim: 'tto' },
  { durum: 'proforma_gonderildi', kisa: 'Proforma', kim: 'tto' },
  { durum: 'proforma_dondu', kisa: 'Firma onayı', kim: 'akademisyen' },
  { durum: 'genel_sekreterlikte', kisa: 'Genel Sekreterlik', kim: 'tto' },
  { durum: 'gorevlendirildi', kisa: 'Görevlendirme', kim: 'tto' },
  { durum: 'tamamlandi', kisa: 'Fatura', kim: 'tto' },
];

/** Durumun aşama sırası (0: henüz gönderilmedi). İade/inceleme başvuruda sayılır. */
export function asamaSirasi(durum) {
  const d = durum || 'taslak';
  if (d === 'incelemede' || d === 'iade') return 1;
  const i = TTO_ASAMALAR.findIndex((a) => a.durum === d);
  return i + 1;
}

/** Gönderilmiş (TTO'nun gördüğü) bütün durumlar. */
export const TTO_GONDERILMIS_DURUMLAR = Object.keys(TTO_DURUMLAR).filter((d) => d !== 'taslak');

// Sıradaki iş kimde? Yönetici listesinde "Sizde bekleyen" süzgeci.
export const TTO_YONETICIDE_BEKLEYEN = [
  'gonderildi',
  'incelemede',
  'onaylandi',
  'proforma_dondu',
  'genel_sekreterlikte',
  'gorevlendirildi',
];
export const TTO_AKADEMISYENDE_BEKLEYEN = ['iade', 'proforma_gonderildi'];

// ── BELGELER ──
// `rol`: kim yükler. 'ek' iki tarafa da açıktır (aşamaya bağlı değildir).
export const TTO_BELGE_TURLERI = {
  basvuru_imzali: { label: 'İmzalı ve kaşeli başvuru formu', rol: 'akademisyen' },
  onayli_basvuru: { label: 'TTO onaylı başvuru formu', rol: 'tto' },
  proforma_tto: { label: 'Proforma (TTO imzalı)', rol: 'tto' },
  proforma_firma: { label: 'Proforma (firma imzalı ve kaşeli)', rol: 'akademisyen' },
  ust_yazi: { label: 'Genel Sekreterliğe üst yazı', rol: 'tto' },
  yonetim_karari: { label: 'Yönetim kurulu kararı', rol: 'tto' },
  gorevlendirme: { label: 'Görevlendirme yazısı', rol: 'tto' },
  fatura: { label: 'Fatura', rol: 'tto' },
  ek: { label: 'Ek belge', rol: 'her' },
};

/** Yüklenen dosyaların klasörü; sunucu bu klasöre yalnız PDF kabul eder. */
export const TTO_BELGE_KLASORU = 'tto_belgeler';
const BELGE_ADRESI = /^\/api\/files\/download\/tto_belgeler\/[A-Za-z0-9._-]+\.pdf$/i;
const EK_BELGE_SINIRI = 5;

// Geçişin zorunlu belgeleri. `yeni: true` → bu istekte YENİ yüklenmiş olmalı
// (ör. her gönderimde imzalı formun güncel hâli); yoksa talepte daha önce
// yüklenmiş olması da yeter (ör. kararı geri alıp yeniden onaylarken).
export const TTO_GECIS_BELGELERI = {
  'taslak>gonderildi': [{ tur: 'basvuru_imzali', yeni: true }],
  'iade>gonderildi': [{ tur: 'basvuru_imzali', yeni: true }],
  'gonderildi>onaylandi': [{ tur: 'onayli_basvuru' }],
  'incelemede>onaylandi': [{ tur: 'onayli_basvuru' }],
  'onaylandi>proforma_gonderildi': [{ tur: 'proforma_tto' }],
  'proforma_gonderildi>proforma_dondu': [{ tur: 'proforma_firma', yeni: true }],
  'genel_sekreterlikte>gorevlendirildi': [{ tur: 'yonetim_karari' }, { tur: 'gorevlendirme' }],
  'gorevlendirildi>tamamlandi': [{ tur: 'fatura' }],
};

/** Geçiş için eksik belgelerin adları (boşsa tamam). */
export function eksikGecisBelgeleri(eski, yeni, mevcutBelgeler, eklenenler) {
  const kurallar = TTO_GECIS_BELGELERI[(eski || 'taslak') + '>' + yeni] || [];
  const var_ = (liste, tur) => (liste || []).some((b) => b && b.tur === tur);
  return kurallar
    .filter((k) => !(var_(eklenenler, k.tur) || (!k.yeni && var_(mevcutBelgeler, k.tur))))
    .map((k) => TTO_BELGE_TURLERI[k.tur].label);
}

/**
 * İstekle gelen `ekBelgeler`i doğrular ve sunucu damgalarıyla belge kaydına
 * çevirir. Yükleyen, rolü ve tarih İSTEMCİDEN ALINMAZ.
 * @returns {{hata?:string, belgeler?:Array}}
 */
export function ekBelgeleriHazirla(ham, rol, kimlik, simdi) {
  if (ham == null) return { belgeler: [] };
  if (!Array.isArray(ham)) return { hata: 'Belge listesi geçersiz.' };
  if (ham.length > EK_BELGE_SINIRI) {
    return { hata: 'Tek seferde en çok ' + EK_BELGE_SINIRI + ' belge yüklenebilir.' };
  }
  const zaman = (simdi || new Date()).toISOString();
  const belgeler = [];
  for (let i = 0; i < ham.length; i++) {
    const b = ham[i] || {};
    const tur = metin(b.tur);
    const tanim = TTO_BELGE_TURLERI[tur];
    if (!tanim) return { hata: 'Bilinmeyen belge türü: ' + (tur || '—') };
    if (tanim.rol !== 'her' && tanim.rol !== rol) {
      return {
        hata:
          '“' +
          tanim.label +
          '” belgesini yalnız ' +
          (tanim.rol === 'tto' ? 'TTO' : 'akademisyen') +
          ' yükler.',
      };
    }
    const url = metin(b.url);
    if (!BELGE_ADRESI.test(url)) return { hata: 'Belgeler PDF olarak yüklenmelidir.' };
    belgeler.push({
      id: 'b-' + zaman.replace(/\D/g, '') + '-' + i,
      tur,
      ad: metin(b.ad).slice(0, 200) || tanim.label + '.pdf',
      url,
      rol,
      yukleyen: kimlik,
      tarih: zaman,
    });
  }
  return { belgeler };
}

/** Akademisyen formu bu durumda düzenleyebilir mi? */
export function akademisyenDuzenleyebilirMi(durum) {
  return durum === 'taslak' || durum === 'iade' || !durum;
}

/**
 * Akademisyenin (talep sahibinin) yapabileceği durum geçişleri.
 *   taslak/iade → gonderildi              (imzalı formla TTO'ya gönder)
 *   gonderildi  → taslak                  (inceleme başlamadan geri çek)
 *   proforma_gonderildi → proforma_dondu  (firma onaylı proformayı gönder)
 */
export const TTO_SAHIP_GECISLERI = {
  taslak: ['taslak', 'gonderildi'],
  iade: ['iade', 'gonderildi'],
  gonderildi: ['gonderildi', 'taslak'],
  proforma_gonderildi: ['proforma_gonderildi', 'proforma_dondu'],
};

export function sahipGecisiGecerliMi(eski, yeni) {
  const e = eski || 'taslak';
  const y = yeni || e;
  if (y === e) return true;
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
  'faturaNo',
  'karar',
  'kararVeren',
  'kararTarihi',
  'onayliBelgeUrl',
  'onayliBelgeAdi',
  'incelemeBaslangic',
];

// Sunucunun damgaladığı alanlar: istemci değeri yok sayılır. Belgeler yalnız
// `ekBelgeler` ile EKLENİR; liste istemciden yazılamaz (başkasının belgesi
// silinemez, yükleyen adı değiştirilemez).
export const TTO_SUNUCU_ALANLARI = ['sahip', 'gonderimTarihi', 'gecmis', 'belgeler'];

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

// ── Ortak yardımcılar ──
function noktaliAlanlar(veri) {
  return Object.keys(veri).filter((k) => k.indexOf('.') >= 0 || k.charAt(0) === '$');
}

function gecmiseEkle(mevcut, kayitlar) {
  const gecmis = Array.isArray(mevcut && mevcut.gecmis) ? mevcut.gecmis.slice(-49) : [];
  kayitlar.forEach((k) => gecmis.push(k));
  return gecmis.slice(-60);
}

/**
 * `veri.ekBelgeler`i işler: doğrular, damgalar, talebin belge listesine
 * ekler (`veri.belgeler`). Eklenen belgeleri döndürür.
 */
function belgeleriIsle(veri, mevcut, rol, kimlik, simdi) {
  const ham = veri.ekBelgeler;
  delete veri.ekBelgeler;
  delete veri.belgeler;
  const r = ekBelgeleriHazirla(ham, rol, kimlik, simdi);
  if (r.hata) return r;
  if (r.belgeler.length > 0) {
    const onceki = Array.isArray(mevcut && mevcut.belgeler) ? mevcut.belgeler : [];
    veri.belgeler = onceki.concat(r.belgeler);
  }
  return r;
}

// ══════════════════════════════════════════════════════════════
// SUNUCU KARARI: talep sahibi (akademisyen) bu yazmayı yapabilir mi?
//
// TTO yöneticisi bu kararın DIŞINDADIR (çağıran taraf onu önceden ayırır;
// yöneticinin KENDİ talebi buraya düşer). Karar `veri`yi YERİNDE temizler:
// yönetici alanları ve sunucu damgaları düşer, sahiplik ve belgeler
// damgalanır.
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
  const noktali = noktaliAlanlar(veri);
  if (noktali.length > 0) {
    return { izin: false, hata: 'Geçersiz alan: ' + noktali.join(', ') };
  }

  TTO_YONETICI_ALANLARI.concat(TTO_SUNUCU_ALANLARI).forEach((a) => {
    if (a !== 'belgeler') delete veri[a];
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
  // yalnız durum (geri çek, proforma gönder) ve belge eklenebilir.
  const icerikAlanlari = Object.keys(veri).filter(
    (k) =>
      k !== 'durum' &&
      k !== 'updatedAt' &&
      k !== 'createdAt' &&
      k !== 'ekBelgeler' &&
      k !== 'belgeler'
  );
  if (!akademisyenDuzenleyebilirMi(eskiDurum) && icerikAlanlari.length > 0) {
    return {
      izin: false,
      hata: 'Gönderilmiş talep değiştirilemez. Değişiklik için önce geri çekin.',
    };
  }

  // Belgeler: aşama belgesi yalnız kendi geçişiyle, ek belge gönderildikten
  // sonra her zaman (taslakta belge tutulmaz — gönderimle birlikte gelir).
  const b = belgeleriIsle(veri, mevcut, 'akademisyen', kimlik, simdi);
  if (b.hata) return { izin: false, hata: b.hata };
  const eklenen = b.belgeler;
  const gecisBelgeleri = (TTO_GECIS_BELGELERI[eskiDurum + '>' + yeniDurum] || []).map((k) => k.tur);
  const yersiz = eklenen.filter((x) => x.tur !== 'ek' && gecisBelgeleri.indexOf(x.tur) < 0);
  if (yersiz.length > 0) {
    return {
      izin: false,
      hata: '“' + TTO_BELGE_TURLERI[yersiz[0].tur].label + '” bu aşamada yüklenemez.',
    };
  }
  if (eklenen.length > 0 && yeniDurum === 'taslak') {
    return { izin: false, hata: 'Belgeler talep gönderilirken yüklenir.' };
  }
  if (yeniDurum === 'tamamlandi' || yeniDurum === 'reddedildi') {
    if (eklenen.length > 0) return { izin: false, hata: 'Kapanmış talebe belge eklenemez.' };
  }

  if (yeniDurum !== eskiDurum) {
    const eksik = eksikGecisBelgeleri(eskiDurum, yeniDurum, mevcut && mevcut.belgeler, eklenen);
    if (eksik.length > 0) {
      return { izin: false, hata: 'Yüklenmesi gereken belge: ' + eksik.join(', ') + ' (PDF).' };
    }
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
      : eklenen.length > 0
        ? 'belge_yuklendi'
        : mevcut
          ? 'duzenlendi'
          : 'olusturuldu';
  veri.gecmis = gecmiseEkle(mevcut, [
    { at: simdi.toISOString(), kim: kimlik, olay, belgeler: eklenen.map((x) => x.tur) },
  ]);
  return { izin: true };
}

// ══════════════════════════════════════════════════════════════
// TTO YÖNETİCİSİNİN YAZMA KARARI (inceleme, karar ve süreç)
//
// Yönetici talebin İÇERİĞİNE dokunmaz — form akademisyenin beyanıdır.
// Yalnız "TTO tarafından doldurulacaktır" alanlarını (talep no, tarih,
// başvuruyu alan kişi), notunu, fatura no'yu, belgeleri ve durumu yazar.
//
//   gonderildi / incelemede → incelemede | onaylandi | iade | reddedildi
//   onaylandi               → proforma_gonderildi | incelemede (geri al)
//   proforma_dondu          → genel_sekreterlikte | proforma_gonderildi
//                             (firma proforması eksik: gerekçeyle geri)
//   genel_sekreterlikte     → gorevlendirildi | reddedildi (olumsuz karar)
//   gorevlendirildi         → tamamlandi (fatura)
//   reddedildi              → incelemede (yanlış kararı geri almak için)
//   iade, proforma_gonderildi → (sıra akademisyende)
//   taslak                  → yöneticiye kapalı (henüz gönderilmedi)
//
// Zorunlu belgeler TTO_GECIS_BELGELERI'nde; iade/ret/proforma geri gönderme
// gerekçe ister. Karar veren ve tarihi sunucu damgalar.
//
// Silme: yönetici GÖNDERİLMİŞ her talebi silebilir (akademisyene bildirilir).
// Yöneticinin KENDİ talebi: içerik yazımı ve gönder/geri çek sahip
// kuralına düşer (`sahipKurali: true` döner, çağıran sahipYazmaKarari'ni
// uygular).
// ══════════════════════════════════════════════════════════════
export const TTO_YONETICI_GECISLERI = {
  gonderildi: ['incelemede', 'onaylandi', 'iade', 'reddedildi'],
  incelemede: ['onaylandi', 'iade', 'reddedildi'],
  onaylandi: ['proforma_gonderildi', 'incelemede'],
  proforma_dondu: ['genel_sekreterlikte', 'proforma_gonderildi'],
  genel_sekreterlikte: ['gorevlendirildi', 'reddedildi'],
  gorevlendirildi: ['tamamlandi'],
  reddedildi: ['incelemede'],
};

// Gerekçe (yoneticiNotu) isteyen yönetici geçişleri.
const GEREKCELI = {
  iade: 'İade',
  reddedildi: 'Ret',
  'proforma_dondu>proforma_gonderildi': 'Proformayı geri gönderme',
};

// Sunucunun damgaladığı karar alanları: istemci değeri yok sayılır.
const TTO_KARAR_DAMGALARI = ['karar', 'kararVeren', 'kararTarihi', 'incelemeBaslangic'];

export function yoneticiGecisiGecerliMi(eski, yeni) {
  const e = eski || 'taslak';
  const y = yeni || e;
  if (e === 'taslak') return false;
  if (y === e) return true;
  return (TTO_YONETICI_GECISLERI[e] || []).indexOf(y) >= 0;
}

/**
 * @param {object} p  { tur, mevcut, veri, kimlik, simdi } (sahipYazmaKarari ile aynı)
 * @returns {{izin:boolean, hata?:string, sahipKurali?:boolean}}
 *   `veri` YERİNDE düzeltilir (damgalar eklenir, yasak alanlar düşer).
 */
export function yoneticiYazmaKarari(p) {
  const tur = p && p.tur;
  const mevcut = (p && p.mevcut) || null;
  const veri = p && p.veri && typeof p.veri === 'object' ? p.veri : null;
  const kimlik = metin(p && p.kimlik);
  const simdi = (p && p.simdi) || new Date();
  if (!kimlik) return { izin: false, hata: 'Kimlik çözülemedi.' };

  const kendisinin = !mevcut || metin(mevcut.sahip) === kimlik;
  if (tur === 'add' || !mevcut) {
    if (kendisinin) return { izin: true, sahipKurali: true };
    return { izin: false, hata: 'Talep bulunamadı.' };
  }
  if (tur === 'delete') {
    if (kendisinin) return { izin: true, sahipKurali: true };
    // Gönderilmiş talep yönetici tarafından silinebilir; başkasının taslağı
    // yöneticiye zaten görünmez.
    if ((mevcut.durum || 'taslak') === 'taslak') {
      return { izin: false, hata: 'Gönderilmemiş talep silinemez.' };
    }
    return { izin: true };
  }
  if (!veri) return { izin: false, hata: 'Geçersiz istek.' };
  const noktali = noktaliAlanlar(veri);
  if (noktali.length > 0) return { izin: false, hata: 'Geçersiz alan: ' + noktali.join(', ') };

  const eski = mevcut.durum || 'taslak';
  const yeni = 'durum' in veri ? metin(veri.durum) : eski;
  const serbest = TTO_YONETICI_ALANLARI.concat(['durum', 'updatedAt', 'createdAt', 'ekBelgeler']);
  const icerik = Object.keys(veri).filter(
    (k) => serbest.indexOf(k) < 0 && TTO_SUNUCU_ALANLARI.indexOf(k) < 0
  );
  // Kendi talebi: içerik ya da sahibin geçişi → sahip kuralı.
  if (
    kendisinin &&
    (icerik.length > 0 || (yeni !== eski && (TTO_SAHIP_GECISLERI[eski] || []).indexOf(yeni) >= 0))
  ) {
    return { izin: true, sahipKurali: true };
  }
  if (icerik.length > 0) {
    return { izin: false, hata: 'Talebin içeriğini yalnız sahibi değiştirebilir.' };
  }
  if (!TTO_DURUMLAR[yeni]) return { izin: false, hata: 'Geçersiz durum.' };
  if (eski === 'taslak') {
    return { izin: false, hata: 'Bu talep henüz TTO’ya gönderilmedi.' };
  }
  if (!yoneticiGecisiGecerliMi(eski, yeni)) {
    return {
      izin: false,
      hata:
        'Bu talep "' +
        (TTO_DURUMLAR[eski] || {}).label +
        '" durumunda; "' +
        (TTO_DURUMLAR[yeni] || {}).label +
        '" yapılamaz.',
    };
  }

  TTO_KARAR_DAMGALARI.forEach((a) => {
    delete veri[a];
  });
  TTO_SUNUCU_ALANLARI.forEach((a) => {
    if (a !== 'belgeler') delete veri[a];
  });
  const b = belgeleriIsle(veri, mevcut, 'tto', kimlik, simdi);
  if (b.hata) return { izin: false, hata: b.hata };
  const eklenen = b.belgeler;
  if (eklenen.length > 0 && (yeni === 'tamamlandi' || yeni === 'reddedildi') && yeni === eski) {
    return { izin: false, hata: 'Kapanmış talebe belge eklenemez.' };
  }

  const birlesik = Object.assign({}, mevcut, veri);
  if (yeni !== eski) {
    const gerekceAdi = GEREKCELI[yeni] || GEREKCELI[eski + '>' + yeni];
    if (gerekceAdi && !metin(birlesik.yoneticiNotu)) {
      return {
        izin: false,
        hata: gerekceAdi + ' için akademisyene iletilecek gerekçeyi yazın.',
      };
    }
    if (yeni === 'onaylandi') {
      const eksikAlan = [];
      if (!metin(birlesik.talepNo)) eksikAlan.push('Talep No');
      if (!metin(birlesik.alanKisi)) eksikAlan.push('Başvuruyu Alan Kişi');
      if (eksikAlan.length > 0) {
        return { izin: false, hata: 'Onay için doldurun: ' + eksikAlan.join(', ') + '.' };
      }
      if (!metin(birlesik.talepTarihi)) veri.talepTarihi = simdi.toISOString().slice(0, 10);
    }
    const eksik = eksikGecisBelgeleri(eski, yeni, mevcut.belgeler, eklenen);
    if (eksik.length > 0) {
      return { izin: false, hata: 'Yüklenmesi gereken belge: ' + eksik.join(', ') + ' (PDF).' };
    }
    if (yeni === 'incelemede' && !metin(mevcut.incelemeBaslangic)) {
      veri.incelemeBaslangic = simdi.toISOString();
    }
    if (yeni === 'onaylandi' || yeni === 'iade' || yeni === 'reddedildi') {
      veri.karar = yeni;
      veri.kararVeren = kimlik;
      veri.kararTarihi = simdi.toISOString();
    } else if (yeni === 'incelemede') {
      veri.karar = '';
    }
  }
  veri.gecmis = gecmiseEkle(mevcut, [
    {
      at: simdi.toISOString(),
      kim: kimlik,
      olay: yeni !== eski ? yeni : eklenen.length > 0 ? 'belge_yuklendi' : 'tto_guncelledi',
      belgeler: eklenen.map((x) => x.tur),
    },
  ]);
  return { izin: true };
}

/** Talebin listede/bildirimde görünen adı: proje adı, yoksa ilk nitelik. */
export function talepBasligi(t) {
  const p = metin(t && t.proje && t.proje.ad);
  if (p) return p;
  const n = Array.isArray(t && t.nitelik) ? t.nitelik : [];
  const ilk = TTO_NITELIKLER.find((x) => n.indexOf(x.id) >= 0);
  return ilk ? ilk.label : 'Başlıksız talep';
}

// ══════════════════════════════════════════════════════════════
// BİLDİRİMLER — kim, ne zaman haberdar edilir?
//
// Bildirimi SUNUCU üretir (yazma başarıyla bittikten sonra): istemciye
// bırakılsaydı yönetici adları istemciye açılmak zorunda kalırdı ve
// gönderilmeyen bir bildirim sessizce kaybolurdu.
//
//   akademisyen gönderir / yeniden gönderir / geri çeker / firma proformasını
//   gönderir / belge yükler                           → bütün TTO yöneticileri
//   yönetici aşamayı ilerletir / iade / ret / belge yükler / siler
//                                                     → talep sahibi
//
// @param {object} p { eski, yeni (birleşik kayıt), yapan, yoneticiler[],
//                     eklenenBelgeler[], silindi }
// @returns {Array<{recipientId,title,body,type,meta}>}
// ══════════════════════════════════════════════════════════════
const SAHIBE_MESAJ = {
  incelemede: () => 'TTO talebinizi incelemeye aldı.',
  onaylandi: (t) =>
    'Başvurunuz onaylandı' +
    (metin(t.talepNo) ? ' (Talep No: ' + t.talepNo + ')' : '') +
    '. TTO onaylı başvuru formu belgelerinizde.',
  iade: (t) =>
    'Talebiniz düzeltme için iade edildi' + (metin(t.yoneticiNotu) ? ': ' + t.yoneticiNotu : '.'),
  reddedildi: (t) => 'Talebiniz reddedildi' + (metin(t.yoneticiNotu) ? ': ' + t.yoneticiNotu : '.'),
  proforma_gonderildi: (t, eski) =>
    eski === 'proforma_dondu'
      ? 'Proforma geri gönderildi' +
        (metin(t.yoneticiNotu) ? ': ' + t.yoneticiNotu : '.') +
        ' Firmaya düzelttirip yeniden yükleyin.'
      : 'TTO imzalı proforma yüklendi. Firmaya doldurtup imzalatın, kaşeletin ve yükleyin.',
  genel_sekreterlikte: () => 'Talebiniz yönetim kararı için Genel Sekreterliğe gönderildi.',
  gorevlendirildi: () =>
    'Yönetim kararı çıktı. Görevlendirme yazınız ve karar belgeleriniz arasında.',
  tamamlandi: (t) =>
    'Fatura kesildi' +
    (metin(t.faturaNo) ? ' (No: ' + t.faturaNo + ')' : '') +
    '; süreç tamamlandı.',
};

export function ttoBildirimPlani(p) {
  const eskiKayit = (p && p.eski) || {};
  const yeni = (p && p.yeni) || {};
  const yapan = metin(p && p.yapan);
  const eski = eskiKayit.durum || 'taslak';
  const d = yeni.durum || 'taslak';
  const eklenen = (p && p.eklenenBelgeler) || [];
  const baslik = 'TTO · ' + talepBasligi(Object.assign({}, eskiKayit, yeni));
  const sahip = metin(yeni.sahip || eskiKayit.sahip);
  const kimden =
    metin((yeni.genel && yeni.genel.adSoyad) || (eskiKayit.genel && eskiKayit.genel.adSoyad)) ||
    sahip;
  const meta = { talepId: metin(yeni.id || eskiKayit.id), durum: d };
  const sahibe = (body, type) =>
    sahip && sahip !== yapan ? [{ recipientId: sahip, title: baslik, body, type, meta }] : [];
  const belgeAdlari = eklenen
    .map((b) => (TTO_BELGE_TURLERI[b.tur] || {}).label)
    .filter(Boolean)
    .join(', ');

  if (p && p.silindi) {
    return sahibe('Talebiniz TTO tarafından silindi.', 'uyari');
  }

  if (yapan === sahip) {
    let govde = '';
    if (d !== eski && d === 'gonderildi') {
      govde =
        kimden +
        (eski === 'iade'
          ? ' düzeltilmiş talebini yeniden gönderdi.'
          : ' yeni bir işbirliği talebi gönderdi.');
    } else if (d !== eski && eski === 'gonderildi' && d === 'taslak') {
      govde = kimden + ' talebini geri çekti.';
    } else if (d !== eski && d === 'proforma_dondu') {
      govde = kimden + ' firma imzalı ve kaşeli proformayı yükledi.';
    } else if (d === eski && eklenen.length > 0) {
      govde = kimden + ' yeni belge yükledi: ' + belgeAdlari + '.';
    }
    if (!govde) return [];
    return ((p && p.yoneticiler) || [])
      .map(metin)
      .filter((ad) => ad && ad !== yapan)
      .map((ad) => ({
        recipientId: ad,
        title: baslik,
        body: govde,
        type: d === 'taslak' ? 'uyari' : 'bilgi',
        meta,
      }));
  }

  if (d !== eski) {
    const f = SAHIBE_MESAJ[d];
    if (!f) return [];
    const tip =
      d === 'iade' ||
      d === 'reddedildi' ||
      (d === 'proforma_gonderildi' && eski === 'proforma_dondu')
        ? 'uyari'
        : d === 'tamamlandi' || d === 'onaylandi' || d === 'gorevlendirildi'
          ? 'basari'
          : 'bilgi';
    return sahibe(f(yeni, eski), tip);
  }
  if (eklenen.length > 0) return sahibe('TTO yeni belge yükledi: ' + belgeAdlari + '.', 'bilgi');
  return [];
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

/**
 * Üst/alt bilgi (header/footer) için { etiket: değer } sözlüğü. Şablonda
 * {{Doküman Kodu}} ya da {{Talep Tarihi (TTO doldurur)}} / {{Talep Tarihi}}
 * yazılabilir — etiketin parantezsiz hâli de anahtar olarak eklenir.
 */
export function ttoEtiketDegerleri(veri) {
  const v = veri || {};
  const out = {};
  TTO_SABLON_DEGISKENLERI.forEach((d) => {
    const deger = v[d.id] == null ? '' : v[d.id];
    out[d.label] = deger;
    const kisa = d.label.replace(/\s*\(.*?\)\s*/g, ' ').trim();
    if (kisa && !(kisa in out)) out[kisa] = deger;
  });
  return out;
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

/** PDF çıktısının adı (ttoDosyaAdi ile aynı kural, .pdf). */
export function ttoPdfDosyaAdi(talep) {
  return ttoDosyaAdi(talep).replace(/\.docx$/, '.pdf');
}

// ══════════════════════════════════════════════════════════════
// TTO YÖNETİCİSİ = TTO BİRİMİNE KAYITLI AKADEMİSYEN
//
// Ayrı bir yetki bayrağı atanmaz: `departments` içinde adı "Teknoloji
// Transfer Ofisi" (ya da kısa adı/kodu "TTO") olan birime ana birim
// (departmentId) veya ek birim (additionalDepartments) olarak kayıtlı her
// akademisyen TTO yöneticisidir. Aynı adlı birden çok profesör kaydı varsa
// herhangi birinin TTO'ya kayıtlı olması yeterlidir (kimlik addır).
// ══════════════════════════════════════════════════════════════
function adAnahtari(s) {
  return metin(s).replace(/İ/g, 'i').replace(/I/g, 'ı').toLocaleLowerCase('tr-TR');
}

/** Bir birim adı TTO'yu mu anlatıyor? */
export function ttoBirimAdiMi(ad) {
  const a = adAnahtari(ad);
  if (!a) return false;
  if (/teknoloji\s*transfer/.test(a)) return true;
  return /(^|[^0-9a-zçğıöşü])tto([^0-9a-zçğıöşü]|$)/.test(a);
}

/** `departments` dokümanı TTO birimi mi? */
export function ttoBirimiMi(bolum) {
  const b = bolum || {};
  return [b.name, b.shortName, b.code].some(ttoBirimAdiMi);
}

function birimKimlikleri(b) {
  return [
    b.id,
    b._docId,
    b.code,
    b._id && b._id.toString(),
    ...(Array.isArray(b.kimlikler) ? b.kimlikler : []),
    ...(Array.isArray(b.eskiKimlikler) ? b.eskiKimlikler : []),
  ]
    .filter(Boolean)
    .map(String);
}

/**
 * @param {Array<Object>} profKayitlari  aynı adlı `professors` kayıtları
 * @param {Array<Object>} bolumler       `departments` dokümanları
 */
export function ttoBirimUyesiMi(profKayitlari, bolumler) {
  const ttoKimlik = new Set();
  (bolumler || [])
    .filter(ttoBirimiMi)
    .forEach((b) => birimKimlikleri(b).forEach((k) => ttoKimlik.add(k)));
  return (profKayitlari || []).filter(Boolean).some((p) => {
    if (p.departmentId && ttoKimlik.has(String(p.departmentId))) return true;
    const ekler = Array.isArray(p.additionalDepartments) ? p.additionalDepartments : [];
    if (ekler.some((x) => ttoKimlik.has(String(x)))) return true;
    // Kimliksiz eski kayıt: yalnız birim ADI varsa ona bakılır.
    return !p.departmentId && ttoBirimAdiMi(p.department);
  });
}
