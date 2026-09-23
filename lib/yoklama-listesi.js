// ══════════════════════════════════════════════════════════════
// DERS DEVAM (YOKLAMA) LİSTESİ — ŞABLON DEĞİŞKENLERİ VE SATIRLARI
//
// Akademisyenin dönem içinde imzaya/arşive verdiği resmî çıktı budur:
// dersin künyesi + öğrenci listesi + HAFTA SÜTUNLARI. Örnek çıktı (bkz.
// "Java Devam Listesi") şöyle:
//
//   ┌──────────────────────────────────────────────────────────────┐
//   │        2026-2027 Yıl Güz Dönemi Ders Öğrenci Listesi         │
//   │ Ders Kodu ve Adı  : BİL111.1 - Bilgisayar Programlama I …    │
//   │ Öğretim Üyesi     : Dr. Öğr. Üyesi …        22 Eylül 2026 Salı│
//   │ Fakülte Bilgisi   : Mühendislik Fakültesi                    │
//   │ Dersi Alan Kadın/Erkek Öğrenci Sayısı : 43 / 53              │
//   ├───┬──────────┬─────┬────────┬───────┬───────┬────HAFTALAR────┤
//   │No │Öğrenci No│ Adı │ Soyadı │Sınıfı │ Devam │1.H │2.H │ …    │
//   └───┴──────────┴─────┴────────┴───────┴───────┴────┴────┴──────┘
//
// ⚠ HAFTA SAYISI SABİT DEĞİLDİR. Örnek belgede 15 hafta var; başka bir
// dönemde 14, yaz okulunda 7 olabilir. Bu yüzden hafta sütunları BURADA
// üretilir (`haftaListesi`) ve şablon değişkenleri `hafta1 … hafta20` diye
// NUMARALI durur: şablonda kaç hafta sütunu varsa o kadarı dolar, fazlası
// boş kalır. Sabit 15'e göre yazılmış bir çıktı, dönem 14 haftaya indiğinde
// belgeyi sessizce yanlış yapardı.
//
// ── BİR OTURUM HANGİ HAFTAYA DÜŞER? ──
// Dijital yoklamada her ders saati bir OTURUMdur (yoklama_oturumlari) ve
// tarihi bellidir. Hafta numarası iki yoldan çıkar:
//
//   1) DÖNEM BAŞLANGICI GİRİLMİŞSE → takvim: (tarih − başlangıç) / 7 + 1.
//      Doğru olan budur; ara tatilde yoklama alınmamışsa o hafta boş kalır
//      ve sütunlar takvimle aynı hizada durur.
//   2) GİRİLMEMİŞSE → sıra: oturumlar tarihe göre sıralanır, 1'den başlayarak
//      numaralanır. Yaklaşıktır (boş hafta kaymaya yol açar) ve çıktı bunu
//      SÖYLER (`kaynak: 'sira'`), sessizce doğruymuş gibi davranmaz.
//
// ── "DEVAM" SÜTUNU BİR KARARDIR ──
// Var/Yok, öğrencinin derse devam HAKKI'nı söyler: devamsızlık sınırını
// aşmışsa "Yok". Sınır girilmemişse karar verilmez (boş kalır) — yanlış bir
// "Var" yazmak, sınavda hak kaybına yol açacak bir belge üretmek demektir.
// ══════════════════════════════════════════════════════════════

import { devamsizlikDurumu } from './yoklama.js';
import { tarihMetni } from './randevu.js';

const metin = (v) => String(v == null ? '' : v).trim();
const sayi = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);

/** Şablonda tanımlı en fazla hafta sütunu (dönem uzasa da yeter). */
export const HAFTA_SINIRI = 20;
/** Hafta sayısı girilmemişse varsayılan (ÇAKÜ dönem uzunluğu). */
export const VARSAYILAN_HAFTA = 14;

/** Hücre işaretleri — çıktıda katılım nasıl görünür. */
export const VARSAYILAN_ISARETLER = { var: '+', yok: '-', izinli: 'İ', bos: '' };

/** Hafta sayısını 1..HAFTA_SINIRI aralığına çeker. */
export function haftaSayisiDuzelt(deger, varsayilan) {
  const yedek =
    Number(varsayilan) > 0 ? Math.min(HAFTA_SINIRI, Math.floor(varsayilan)) : VARSAYILAN_HAFTA;
  const n = Math.floor(Number(deger));
  if (!Number.isFinite(n) || n <= 0) return yedek;
  return Math.min(HAFTA_SINIRI, n);
}

/** Satır değişkeninin adı: 3 → 'hafta3'. */
export function haftaAnahtari(no) {
  return 'hafta' + Math.max(1, Math.floor(sayi(no)));
}

/** Sütun başlığı: 3 → '3.Hafta' (örnek belgedeki yazım). */
export function haftaBasligi(no) {
  return Math.max(1, Math.floor(sayi(no))) + '.Hafta';
}

/** Hafta sütunlarının listesi. */
export function haftaListesi(haftaSayisi) {
  const n = haftaSayisiDuzelt(haftaSayisi);
  const liste = [];
  for (let i = 1; i <= n; i++) {
    liste.push({ no: i, anahtar: haftaAnahtari(i), baslik: haftaBasligi(i) });
  }
  return liste;
}

/** ISO tarih/zaman damgasını gün başına indirger (saat farkı gürültüsü olmasın). */
function gunDegeri(deger) {
  const s = metin(deger).slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const [y, a, g] = s.split('-').map(Number);
  const d = Date.UTC(y, a - 1, g);
  return Number.isNaN(d) ? null : d;
}

/** İki tarih arasındaki tam gün farkı (b − a). Biri geçersizse null. */
export function gunFarki(a, b) {
  const x = gunDegeri(a);
  const y = gunDegeri(b);
  if (x == null || y == null) return null;
  return Math.round((y - x) / 86400000);
}

/**
 * Bir oturumun hafta numarası (takvim yolu).
 * @returns {number} 1..haftaSayisi; hesaplanamıyorsa ya da dönem dışıysa 0
 */
export function oturumHaftasi(tarih, donemBaslangici, haftaSayisi) {
  const fark = gunFarki(donemBaslangici, tarih);
  if (fark == null || fark < 0) return 0;
  const no = Math.floor(fark / 7) + 1;
  const sinir = haftaSayisiDuzelt(haftaSayisi);
  return no > sinir ? 0 : no;
}

/** Oturumun kimliği — kayıtlardaki `oturumId` ile eşleşen alan. */
function oturumKimligi(o) {
  return metin(o && (o.id || o._docId || o.oturumId));
}

/** Oturumun tarihi — `tarih` yoksa `baslangic` damgasından. */
function oturumTarihi(o) {
  return metin((o && (o.tarih || o.baslangic)) || '').slice(0, 10);
}

/**
 * Oturum → hafta numarası haritası.
 *
 * @param {Array} oturumlar dersin oturumları (açık olanlar da gelebilir)
 * @param {{donemBaslangici?:string, haftaSayisi?:number}} secenekler
 * @returns {{harita:Object, kaynak:'tarih'|'sira', disarida:number, haftaSayisi:number}}
 *   disarida → dönem aralığına düşmeyen (sütunu olmayan) oturum sayısı
 */
export function oturumHaftalari(oturumlar, secenekler) {
  const s = secenekler || {};
  const haftaSayisi = haftaSayisiDuzelt(s.haftaSayisi);
  const liste = (Array.isArray(oturumlar) ? oturumlar : [])
    .filter((o) => o && oturumKimligi(o))
    .slice()
    .sort((a, b) => {
      const ta = metin(a.baslangic || a.tarih);
      const tb = metin(b.baslangic || b.tarih);
      return ta.localeCompare(tb);
    });
  const harita = {};
  const baslangic = metin(s.donemBaslangici);
  if (baslangic) {
    let disarida = 0;
    liste.forEach((o) => {
      const hafta = oturumHaftasi(oturumTarihi(o), baslangic, haftaSayisi);
      if (hafta > 0) harita[oturumKimligi(o)] = hafta;
      else disarida += 1;
    });
    return { harita, kaynak: 'tarih', disarida, haftaSayisi };
  }
  // Dönem başlangıcı yok: aynı GÜNDEKİ oturumlar tek haftaya sayılır (bir
  // günde iki ders saati iki ayrı hafta sanılmasın), sonra sırayla numara.
  let sonGun = '';
  let no = 0;
  let disarida = 0;
  liste.forEach((o) => {
    const gun = oturumTarihi(o);
    if (gun !== sonGun) {
      no += 1;
      sonGun = gun;
    }
    if (no <= haftaSayisi) harita[oturumKimligi(o)] = no;
    else disarida += 1;
  });
  return { harita, kaynak: 'sira', disarida, haftaSayisi };
}

/** Katılım durumunu hücre işaretine çevirir. */
export function durumIsareti(durum, isaretler) {
  const i = Object.assign({}, VARSAYILAN_ISARETLER, isaretler || {});
  const d = metin(durum);
  if (d === 'var') return i.var;
  if (d === 'izinli') return i.izinli;
  if (d === 'yok') return i.yok;
  return i.bos;
}

/** "2026-2027 Yıl Güz Dönemi Ders Öğrenci Listesi" */
export function donemBasligi(akademikYil, donem) {
  const yil = metin(akademikYil);
  const d = metin(donem).toLocaleLowerCase('tr');
  const ad = d === 'bahar' ? 'Bahar' : d === 'yaz' ? 'Yaz' : d ? 'Güz' : '';
  return [yil ? yil + ' Yıl' : '', ad ? ad + ' Dönemi' : '', 'Ders Öğrenci Listesi']
    .filter(Boolean)
    .join(' ');
}

/** "BİL111.1 - Bilgisayar Programlama I (Birleştirilmiş Ders:BLM103-…)" */
export function dersBasligi(ders) {
  const d = ders || {};
  const kod = metin(d.code || d.kod || d.dersKodu);
  const ad = metin(d.name || d.ad || d.dersAdi);
  const birlesik = metin(d.birlesikDers || d.birlesik);
  const govde = [kod, ad].filter(Boolean).join(' - ');
  return birlesik ? govde + ' (Birleştirilmiş Ders:' + birlesik + ')' : govde;
}

/**
 * Kadın/erkek sayımı. Sistem cinsiyeti ZORUNLU tutmuyor; bilinmeyenler ayrı
 * sayılır ve metin ("43 / 53") yalnızca bilinenleri gösterir — uydurma yok.
 */
export function cinsiyetSayimi(ogrenciler) {
  let kadin = 0;
  let erkek = 0;
  let bilinmeyen = 0;
  (Array.isArray(ogrenciler) ? ogrenciler : []).forEach((o) => {
    const c = metin(o && (o.cinsiyet || o.gender)).toLocaleLowerCase('tr');
    if (c === 'k' || c === 'kadın' || c === 'kadin' || c === 'kız' || c === 'kiz' || c === 'female')
      kadin += 1;
    else if (c === 'e' || c === 'erkek' || c === 'male') erkek += 1;
    else bilinmeyen += 1;
  });
  return { kadin, erkek, bilinmeyen, metin: kadin + ' / ' + erkek };
}

/** Öğrencinin ad/soyad ayrımı — kayıt tek alanda tutuyorsa son kelime soyadıdır. */
export function adSoyadAyir(ogrenci) {
  const o = ogrenci || {};
  const ad = metin(o.firstName || o.ad);
  const soyad = metin(o.lastName || o.soyad);
  if (ad || soyad) return { ad, soyad };
  const parcalar = metin(o.adSoyad || o.name)
    .split(/\s+/)
    .filter(Boolean);
  if (parcalar.length === 0) return { ad: '', soyad: '' };
  return { ad: parcalar.slice(0, -1).join(' '), soyad: parcalar[parcalar.length - 1] };
}

/**
 * Liste satırları — her öğrenci bir satır, her hafta bir alan.
 *
 * @param {object} girdi
 *   ogrenciler        [{studentNumber, firstName, lastName, sinif, cinsiyet}]
 *   oturumlar         dersin oturumları
 *   kayitlar          yoklama_kayitlari (bu derse ait)
 *   haftaSayisi       sütun sayısı
 *   donemBaslangici   'YYYY-MM-DD' (yoksa sıra yolu)
 *   limitSaat         devamsızlık hakkı (saat) — 0/boş ise Devam kararı verilmez
 *   dersSaati         haftalık ders saati
 *   isaretler         hücre işaretleri
 * @returns {Array<object>} şablon satırları (row:* değişkenleriyle aynı adlar)
 */
export function listeSatirlari(girdi) {
  const g = girdi || {};
  const hafta = oturumHaftalari(g.oturumlar, {
    donemBaslangici: g.donemBaslangici,
    haftaSayisi: g.haftaSayisi,
  });
  const sutunlar = haftaListesi(hafta.haftaSayisi);
  const isaretler = Object.assign({}, VARSAYILAN_ISARETLER, g.isaretler || {});

  // Kapanmış oturum sayısı = alınan yoklama sayısı (açık oturum henüz
  // bitmediği için devamsızlığa yazılmaz — lib/yoklama.js ile aynı kural).
  const kapali = (Array.isArray(g.oturumlar) ? g.oturumlar : []).filter((o) => o && !o.acik);
  const acilan = kapali.length;

  // Öğrenci → { oturumId: durum }
  const kayitHarita = new Map();
  (Array.isArray(g.kayitlar) ? g.kayitlar : []).forEach((k) => {
    if (!k) return;
    const no = metin(k.studentNumber);
    if (!no) return;
    if (!kayitHarita.has(no)) kayitHarita.set(no, {});
    kayitHarita.get(no)[metin(k.oturumId)] = metin(k.durum) || 'var';
  });

  const limitSaat = sayi(g.limitSaat);
  const dersSaati = sayi(g.dersSaati) > 0 ? sayi(g.dersSaati) : 1;

  // Bir haftada BİRDEN ÇOK oturum olabilir (blok ders). Hücre, o haftanın
  // oturumlarından en az birine katıldıysa "var" sayılır; hiçbiri yoksa boş.
  const haftaOturumlari = {};
  Object.keys(hafta.harita).forEach((oid) => {
    const no = hafta.harita[oid];
    (haftaOturumlari[no] = haftaOturumlari[no] || []).push(oid);
  });

  return (Array.isArray(g.ogrenciler) ? g.ogrenciler : []).map((o, i) => {
    const no = metin(o.studentNumber || o.ogrenciNo);
    const durumlar = kayitHarita.get(no) || {};
    const { ad, soyad } = adSoyadAyir(o);
    let katildigi = 0;
    Object.keys(durumlar).forEach((oid) => {
      const d = durumlar[oid];
      if (d === 'var' || d === 'izinli') katildigi += 1;
    });
    const durum = devamsizlikDurumu({
      acilanYoklama: acilan,
      katildigi,
      limitSaat,
      dersSaati,
    });
    const satir = {
      sira: i + 1,
      ogrenciNo: no,
      ad,
      soyad,
      adSoyad: [ad, soyad].filter(Boolean).join(' '),
      sinif: metin(o.sinif || o.sinifi || o.class),
      // Sınır girilmemişse karar YOK (boş) — bkz. dosya başı.
      devam: limitSaat > 0 ? (durum.asildi ? 'Yok' : 'Var') : '',
      katildigiHafta: katildigi,
      devamsizlikSaati: durum.kacirilanSaat,
      kalanHak: limitSaat > 0 ? durum.kalanHak : '',
    };
    sutunlar.forEach((s) => {
      const oturumIdleri = haftaOturumlari[s.no] || [];
      if (oturumIdleri.length === 0) {
        satir[s.anahtar] = isaretler.bos;
        return;
      }
      const o1 = oturumIdleri.map((oid) => durumlar[oid]).filter(Boolean);
      if (o1.includes('var')) satir[s.anahtar] = isaretler.var;
      else if (o1.includes('izinli')) satir[s.anahtar] = isaretler.izinli;
      else satir[s.anahtar] = isaretler.yok;
    });
    return satir;
  });
}

/** Belge künyesi (static:* değişkenleriyle aynı adlar). */
export function listeKunyesi(girdi) {
  const g = girdi || {};
  const ogrenciler = Array.isArray(g.ogrenciler) ? g.ogrenciler : [];
  const sayim = cinsiyetSayimi(ogrenciler);
  const haftaSayisi = haftaSayisiDuzelt(g.haftaSayisi);
  const bugun = metin(g.tarih) || new Date().toISOString().slice(0, 10);
  return {
    baslik: donemBasligi(g.akademikYil, g.donem),
    akademikYil: metin(g.akademikYil),
    donem: metin(g.donem).toLocaleLowerCase('tr') === 'bahar' ? 'Bahar' : 'Güz',
    dersKodAd: dersBasligi(g.ders),
    dersKod: metin((g.ders || {}).code || (g.ders || {}).kod),
    dersAd: metin((g.ders || {}).name || (g.ders || {}).ad),
    birlesikDers: metin((g.ders || {}).birlesikDers),
    ogretimUyesi: metin(g.ogretimUyesi),
    fakulteAd: metin(g.fakulteAd),
    bolumAd: metin(g.bolumAd),
    kurumAd: metin(g.kurumAd) || 'Çankırı Karatekin Üniversitesi',
    tarih: tarihMetni(bugun),
    kadinSayisi: sayim.kadin,
    erkekSayisi: sayim.erkek,
    kadinErkek: sayim.metin,
    ogrenciSayisi: ogrenciler.length,
    haftaSayisi,
    devamsizlikSiniri: sayi(g.limitSaat) > 0 ? sayi(g.limitSaat) : '',
    alinanYoklama: (Array.isArray(g.oturumlar) ? g.oturumlar : []).filter((o) => o && !o.acik)
      .length,
  };
}

/**
 * Çıktı için tek çağrı: künye + satırlar + sütunlar + uyarılar.
 * Şablon yolu da yerleşik yol da bunu kullanır; ikisi asla ayrışmasın.
 */
export function listeVerisi(girdi) {
  const g = girdi || {};
  const hafta = oturumHaftalari(g.oturumlar, {
    donemBaslangici: g.donemBaslangici,
    haftaSayisi: g.haftaSayisi,
  });
  const uyarilar = [];
  if (hafta.kaynak === 'sira') {
    uyarilar.push(
      'Dönem başlangıç tarihi girilmedi: hafta sütunları yoklama sırasına göre numaralandı. Ara tatil ya da yoklama alınmayan hafta sütunları kaydırabilir.'
    );
  }
  if (hafta.disarida > 0) {
    uyarilar.push(
      hafta.disarida +
        ' yoklama, hafta sütunlarının dışında kaldı (dönem başlangıcından önce ya da ' +
        hafta.haftaSayisi +
        '. haftadan sonra). Hafta sayısını ya da başlangıç tarihini gözden geçirin.'
    );
  }
  if (!(sayi(g.limitSaat) > 0)) {
    uyarilar.push(
      'Devamsızlık sınırı girilmedi: "Devam" sütunu boş bırakıldı. Sınırı yazarsanız Var/Yok kararı da listeye işlenir.'
    );
  }
  return {
    staticData: listeKunyesi(girdi),
    rows: listeSatirlari(girdi),
    haftalar: haftaListesi(hafta.haftaSayisi),
    haftaKaynagi: hafta.kaynak,
    uyarilar,
  };
}

// ── ŞABLON DEĞİŞKEN SÖZLÜĞÜ ──
// Etiketler örnek belgedeki alan adlarıyla birebir seçildi: Şablonlar
// modülündeki otomatik eşleme, yer tutucu adıyla etiketi karşılaştırıyor.
export const YOKLAMA_LISTE_STATIC = [
  { id: 'baslik', label: 'Başlık (örn 2026-2027 Yıl Güz Dönemi Ders Öğrenci Listesi)' },
  { id: 'akademikYil', label: 'Akademik Yıl (örn 2026-2027)' },
  { id: 'donem', label: 'Dönem (Güz/Bahar)' },
  { id: 'dersKodAd', label: 'Ders Kodu ve Adı' },
  { id: 'dersKod', label: 'Ders Kodu' },
  { id: 'dersAd', label: 'Ders Adı', format: 'title' },
  { id: 'birlesikDers', label: 'Birleştirilmiş Ders' },
  { id: 'ogretimUyesi', label: 'Öğretim Üyesi / Görevlisi' },
  { id: 'fakulteAd', label: 'Fakülte Bilgisi', format: 'title' },
  { id: 'bolumAd', label: 'Bölüm Adı', format: 'title' },
  { id: 'kurumAd', label: 'Üniversite Adı' },
  { id: 'tarih', label: 'Tarih (örn 22 Eylül 2026 Salı)' },
  { id: 'kadinErkek', label: 'Dersi Alan Kadın/Erkek Öğrenci Sayısı (43 / 53)' },
  { id: 'kadinSayisi', label: 'Kadın Öğrenci Sayısı' },
  { id: 'erkekSayisi', label: 'Erkek Öğrenci Sayısı' },
  { id: 'ogrenciSayisi', label: 'Toplam Öğrenci Sayısı' },
  { id: 'haftaSayisi', label: 'Hafta Sayısı' },
  { id: 'devamsizlikSiniri', label: 'Devamsızlık Sınırı (saat)' },
  { id: 'alinanYoklama', label: 'Alınan Yoklama Sayısı' },
];

export const YOKLAMA_LISTE_ROWS = [
  { id: 'sira', label: 'No (sıra)' },
  { id: 'ogrenciNo', label: 'Öğrenci No' },
  { id: 'ad', label: 'Adı', format: 'title' },
  { id: 'soyad', label: 'Soyadı', format: 'upper' },
  { id: 'adSoyad', label: 'Adı Soyadı', format: 'name' },
  { id: 'sinif', label: 'Sınıfı' },
  { id: 'devam', label: 'Devam (Var/Yok)' },
  { id: 'katildigiHafta', label: 'Katıldığı Yoklama Sayısı' },
  { id: 'devamsizlikSaati', label: 'Devamsızlık (saat)' },
  { id: 'kalanHak', label: 'Kalan Devamsızlık Hakkı (saat)' },
];
for (let _h = 1; _h <= HAFTA_SINIRI; _h++) {
  YOKLAMA_LISTE_ROWS.push({ id: haftaAnahtari(_h), label: haftaBasligi(_h) });
}

// ══════════════════════════════════════════════════════════════
// YERLEŞİK ÇIKTI (şablon yüklenmemişse)
//
// Şablon YÜKLEMEK ZORUNLU DEĞİLDİR: yüklemeyen akademisyen de listesini
// alabilmeli. Aşağıdaki HTML, örnek belgenin düzenini birebir izler ve
// yazdırma penceresinde A4 yatay olarak çıkar. Şablon yolu ile bu yol AYNI
// `listeVerisi` çıktısını kullanır; ikisi asla birbirinden ayrışmaz.
// ══════════════════════════════════════════════════════════════

function kacis(v) {
  return metin(v)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Yazdırılabilir devam listesi (tek sayfa HTML).
 * @param {object} veri listeVerisi() çıktısı
 */
export function devamListesiHTML(veri) {
  const v = veri || {};
  const k = v.staticData || {};
  const haftalar = Array.isArray(v.haftalar) ? v.haftalar : [];
  const satirlar = Array.isArray(v.rows) ? v.rows : [];

  const kunye = [
    ['Ders Kodu ve Adı', k.dersKodAd],
    ['Öğretim Üyesi / Görevlisi', k.ogretimUyesi],
    ['Fakülte Bilgisi', k.fakulteAd],
    ['Bölüm', k.bolumAd],
    ['Dersi Alan Kadın/Erkek Öğrenci Sayısı', k.kadinErkek],
  ]
    .filter((c) => metin(c[1]))
    .map((c) => '<tr><th>' + kacis(c[0]) + '</th><td>' + kacis(c[1]) + '</td></tr>')
    .join('');

  const govde = satirlar
    .map((s) => {
      const hucreler = haftalar
        .map((h) => '<td class="h">' + kacis(s[h.anahtar]) + '</td>')
        .join('');
      const devamSinifi = s.devam === 'Yok' ? ' class="yok"' : '';
      return (
        '<tr><td class="c">' +
        kacis(s.sira) +
        '</td><td>' +
        kacis(s.ogrenciNo) +
        '</td><td>' +
        kacis(s.ad) +
        '</td><td>' +
        kacis(s.soyad) +
        '</td><td class="c">' +
        kacis(s.sinif) +
        '</td><td class="c"' +
        devamSinifi +
        '>' +
        kacis(s.devam) +
        '</td>' +
        hucreler +
        '</tr>'
      );
    })
    .join('');

  const uyarilar = (Array.isArray(v.uyarilar) ? v.uyarilar : [])
    .map((u) => '<li>' + kacis(u) + '</li>')
    .join('');

  return `<!DOCTYPE html>
<html lang="tr">
<head><meta charset="utf-8"><title>${kacis(k.baslik || 'Ders Öğrenci Listesi')}</title>
<style>
  @media print { body { margin: 0; background: #fff; } .page { box-shadow: none; margin: 0; } .uyari { display: none; } @page { size: A4 landscape; margin: 1cm; } }
  body { font-family: 'Times New Roman', serif; background: #e8e8e8; margin: 0; }
  .page { max-width: 1120px; margin: 20px auto; background: #fff; padding: 30px 34px; box-shadow: 0 2px 8px rgba(0,0,0,.15); }
  h1 { text-align: center; font-size: 15px; margin: 0 0 14px; }
  table.kunye { border-collapse: collapse; margin-bottom: 10px; font-size: 11px; }
  table.kunye th { text-align: left; font-weight: 700; padding: 2px 10px 2px 0; white-space: nowrap; vertical-align: top; }
  table.kunye th::after { content: ' :'; }
  table.kunye td { padding: 2px 0; }
  .ustsag { float: right; font-size: 11px; font-weight: 700; }
  table.liste { width: 100%; border-collapse: collapse; font-size: 10px; margin-top: 6px; }
  table.liste th, table.liste td { border: 1px solid #333; padding: 3px 4px; }
  table.liste th { background: #F1F5F9; font-size: 9.5px; text-align: center; }
  table.liste td.c { text-align: center; }
  table.liste td.h { text-align: center; width: 26px; }
  table.liste td.yok { color: #B91C1C; font-weight: 700; }
  tr:nth-child(even) td { background: #FBFBFC; }
  .imza { display: flex; justify-content: flex-end; margin-top: 26px; font-size: 11px; text-align: center; }
  .imza div { width: 240px; border-top: 1px solid #666; padding-top: 4px; }
  .uyari { margin-top: 14px; padding: 9px 12px; border: 1px solid #FDE68A; background: #FFFBEB; color: #92400E; font-size: 10.5px; border-radius: 6px; }
  .uyari ul { margin: 4px 0 0; padding-left: 18px; }
</style>
</head>
<body>
<div class="page">
  <h1>${kacis(k.baslik || 'Ders Öğrenci Listesi')}</h1>
  <div class="ustsag">${kacis(k.tarih)}</div>
  <table class="kunye">${kunye}</table>
  <table class="liste">
    <thead>
      <tr>
        <th rowspan="2">No</th><th rowspan="2">Öğrenci No</th><th rowspan="2">Adı</th>
        <th rowspan="2">Soyadı</th><th rowspan="2">Sınıfı</th><th rowspan="2">Devam</th>
        ${haftalar.length ? `<th colspan="${haftalar.length}">HAFTALAR</th>` : ''}
      </tr>
      <tr>${haftalar.map((h) => '<th>' + kacis(h.baslik) + '</th>').join('')}</tr>
    </thead>
    <tbody>${govde || '<tr><td colspan="6">Bu derse kayıtlı öğrenci bulunamadı.</td></tr>'}</tbody>
  </table>
  <div class="imza"><div>${kacis(k.ogretimUyesi)}<br/>İmza</div></div>
  ${uyarilar ? `<div class="uyari"><strong>Not:</strong><ul>${uyarilar}</ul></div>` : ''}
</div>
</body></html>`;
}
