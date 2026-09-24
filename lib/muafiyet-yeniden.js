// ══════════════════════════════════════════════════════════════
// REDDEDİLEN DERSİ ÖĞRENCİ DÜZELTİP YENİDEN GÖNDEREBİLİR
//
// ⚠ BU DOSYA BİR ÇIKMAZDAN DOĞDU. Muafiyet ve yaz intibakı talepleri çoğu
// zaman ON-YİRMİ ders içeriyor. Akademisyen bunlardan BİRİNİ reddettiğinde
// (öğrenci ÇAKÜ dersini yanlış müfredattan seçmiş, karşı kurumun kodunu
// yanlış yazmış) öğrencinin yapabileceği hiçbir şey yoktu: talep kilitliydi.
// Tek çıkar yol baştan yeni talep açmaktı — onaylanmış on beş ders yeniden
// akademisyenin önüne düşüyor, aynı kararlar yeniden veriliyordu.
//
// ── KURAL ──
//   • Öğrenci YALNIZ REDDEDİLEN satırları düzeltebilir.
//   • Onaylanmış satıra ve karar bekleyen satıra dokunamaz: onay geri
//     alınamaz, bekleyen satır zaten akademisyenin önündedir.
//   • Notlara hiçbir hâlde dokunamaz (karşı kurum notu, harf karşılığı).
//     Notu belirleyen akademisyendir; öğrenci kendi notunu yazamaz.
//   • Bütün dersler karara bağlandıysa VE reddedilen kalmadıysa talep
//     KAPANIR; öğrenci bir daha düzenleme yapamaz.
//
// ── VERİ KAYBI OLMAZ ──
// Düzeltilen satır SİLİNMEZ; eski hâli (`oncekiHaller`) ve reddin gerekçesi
// satırın içinde kalır. Öğrenci bir dersten vazgeçerse satır yine silinmez,
// `ogrenciVazgecti` bayrağıyla işaretlenir: reddin kaydı da vazgeçmenin
// kaydı da durur. Satır sayısı hiç değişmediği için sunucu, gelen listeyi
// mevcut listeyle birebir karşılaştırıp yeniden kurabilir.
// ══════════════════════════════════════════════════════════════

const metin = (v) => String(v == null ? '' : v).trim();

/** Öğrencinin değiştirebileceği ders alanları — NOT ALANLARI BİLEREK YOK. */
export const OGRENCI_DERS_ALANLARI = {
  localCourse: ['code', 'name', 'akts', 'statu', 'donem', 'bolognaLink', 'weeklyContent'],
  sourceCourse: ['code', 'name', 'akts'],
};

/** Yeniden gönderimde temizlenen karar alanları. */
export const KARAR_ALANLARI = [
  'adminDecision',
  'adminNote',
  'adminDecidedBy',
  'adminUpdatedAt',
  'recommendation',
];

/** Bir satırın durumu: 'onayli' | 'reddedildi' | 'bekliyor'. */
export function satirDurumu(m) {
  const k = metin(m && m.adminDecision).toLocaleLowerCase('tr');
  if (k === 'confirmed' || k === 'approved') return 'onayli';
  if (k === 'rejected' || k === 'red') return 'reddedildi';
  return 'bekliyor';
}

/** Satırlar ne durumda — kart başlığındaki sayılar buradan. */
export function satirOzeti(kayit) {
  const ms = (kayit && kayit.matches) || [];
  const o = { toplam: ms.length, onayli: 0, reddedildi: 0, bekliyor: 0, vazgecilen: 0 };
  ms.forEach((m) => {
    if (m && m.ogrenciVazgecti) {
      o.vazgecilen += 1;
      return;
    }
    const d = satirDurumu(m);
    if (d === 'onayli') o.onayli += 1;
    else if (d === 'reddedildi') o.reddedildi += 1;
    else o.bekliyor += 1;
  });
  return o;
}

/** Bu satırı öğrenci düzeltebilir mi? (yalnız reddedilen ve vazgeçilmemiş) */
export function satirDuzeltilebilirMi(m) {
  if (!m || m.ogrenciVazgecti) return false;
  return satirDurumu(m) === 'reddedildi';
}

/** Öğrencinin düzeltebileceği satırların indeksleri. */
export function duzeltilebilirIndeksler(kayit) {
  const ms = (kayit && kayit.matches) || [];
  const liste = [];
  ms.forEach((m, i) => {
    if (satirDuzeltilebilirMi(m)) liste.push(i);
  });
  return liste;
}

/**
 * Öğrenci bu talebi düzenleyip yeniden gönderebilir mi?
 * @returns {{izin:boolean, neden:string, sayi:number}}
 */
export function ogrenciDuzenleyebilirMi(kayit) {
  const k = kayit || {};
  if (metin(k.status) === 'iptal') {
    return { izin: false, neden: 'İptal edilmiş talep düzenlenemez.', sayi: 0 };
  }
  const indeksler = duzeltilebilirIndeksler(k);
  if (indeksler.length > 0) {
    return { izin: true, neden: '', sayi: indeksler.length };
  }
  const ozet = satirOzeti(k);
  if (ozet.bekliyor > 0) {
    return {
      izin: false,
      neden:
        'Talebiniz akademisyen kararını bekliyor. Karar verilince reddedilen dersleri düzeltebilirsiniz.',
      sayi: 0,
    };
  }
  return {
    izin: false,
    neden: 'Tüm dersler karara bağlandı; talep kapandı ve artık düzenlenemez.',
    sayi: 0,
  };
}

/** Talep kapandı mı — düzeltilecek reddedilmiş ders kalmadı mı? */
export function talepKapandiMi(kayit) {
  const ozet = satirOzeti(kayit);
  return ozet.bekliyor === 0 && ozet.reddedildi === 0;
}

/** Ders nesnesinden yalnız izinli alanları alır; gerisi mevcut hâlinden gelir. */
function dersBirlestir(mevcutDers, gelenDers, alanlar) {
  const cikti = Object.assign({}, mevcutDers || {});
  const g = gelenDers && typeof gelenDers === 'object' ? gelenDers : null;
  if (!g) return cikti;
  alanlar.forEach((a) => {
    if (Object.prototype.hasOwnProperty.call(g, a)) cikti[a] = g[a];
  });
  return cikti;
}

/** İki satırın ders alanları aynı mı (değişiklik var mı)? */
function dersDegistiMi(a, b, alanlar) {
  return alanlar.some((alan) => metin((a || {})[alan]) !== metin((b || {})[alan]));
}

/**
 * GÜVENLİ SATIR — sunucunun da istemcinin de kullandığı tek kural.
 *
 * Mevcut satır düzeltilebilir değilse GELEN VERİ TAMAMEN YOK SAYILIR ve
 * satır olduğu gibi kalır. Düzeltilebilirse yalnız ders alanları alınır,
 * karar alanları temizlenir, eski hâli ize geçer.
 *
 * @returns {{satir:object, degisti:boolean}}
 */
export function guvenliSatir(mevcut, gelen, simdi) {
  const m = mevcut || {};
  if (!satirDuzeltilebilirMi(m)) return { satir: m, degisti: false };

  const g = gelen && typeof gelen === 'object' ? gelen : {};
  const vazgecti = !!g.ogrenciVazgecti;
  const yeniLocal = dersBirlestir(m.localCourse, g.localCourse, OGRENCI_DERS_ALANLARI.localCourse);
  const yeniSource = dersBirlestir(
    m.sourceCourse,
    g.sourceCourse,
    OGRENCI_DERS_ALANLARI.sourceCourse
  );
  const dersDegisti =
    dersDegistiMi(m.localCourse, yeniLocal, OGRENCI_DERS_ALANLARI.localCourse) ||
    dersDegistiMi(m.sourceCourse, yeniSource, OGRENCI_DERS_ALANLARI.sourceCourse);

  if (!vazgecti && !dersDegisti) return { satir: m, degisti: false };

  const zaman = (simdi instanceof Date ? simdi : new Date()).toISOString();
  // ⚠ ESKİ HÂL SİLİNMEZ: reddin gerekçesi ve satırın önceki içeriği kayda
  // kalır; akademisyen neyin değiştiğini görebilmeli.
  const iz = {
    zaman,
    red: {
      karar: metin(m.adminDecision),
      gerekce: metin(m.adminNote),
      veren: metin(m.adminDecidedBy),
      zaman: metin(m.adminUpdatedAt),
    },
    localCourse: m.localCourse || {},
    sourceCourse: m.sourceCourse || {},
  };
  const oncekiler = Array.isArray(m.oncekiHaller) ? m.oncekiHaller.slice() : [];
  oncekiler.push(iz);

  if (vazgecti) {
    // Vazgeçme satırı SİLMEZ: red kaydı da vazgeçme kaydı da durur, satır
    // yalnız "öğrenci bu dersten vazgeçti" diye işaretlenir.
    return {
      satir: Object.assign({}, m, {
        ogrenciVazgecti: true,
        ogrenciVazgecmeZamani: zaman,
      }),
      degisti: true,
    };
  }

  const yeni = Object.assign({}, m, {
    localCourse: yeniLocal,
    sourceCourse: yeniSource,
    oncekiHaller: oncekiler,
    ogrenciDuzeltti: true,
    ogrenciDuzeltmeZamani: zaman,
    // Satır yeniden karar bekler duruma döner.
    tier: 'review',
  });
  KARAR_ALANLARI.forEach((a) => {
    delete yeni[a];
  });
  return { satir: yeni, degisti: true };
}

/**
 * Yeniden gönderilecek satır dizisi.
 *
 * ⚠ SATIR SAYISI DEĞİŞMEZ. Gelen dizide eksik/fazla satır varsa mevcut
 * dizinin uzunluğu esastır: öğrenci ne satır ekleyebilir ne silebilir
 * (yeni ders istiyorsa yeni talep açar; vazgeçmek bir bayraktır).
 *
 * @returns {{matches:Array, degisen:number, hata:string}}
 */
export function yenidenGonderim(mevcutMatches, gelenMatches, simdi) {
  const mevcut = Array.isArray(mevcutMatches) ? mevcutMatches : [];
  const gelen = Array.isArray(gelenMatches) ? gelenMatches : [];
  let degisen = 0;
  const matches = mevcut.map((m, i) => {
    const sonuc = guvenliSatir(m, gelen[i], simdi);
    if (sonuc.degisti) degisen += 1;
    return sonuc.satir;
  });
  if (degisen === 0) {
    return {
      matches: mevcut,
      degisen: 0,
      hata: 'Değişiklik yok; düzeltilecek bir satır bulunamadı.',
    };
  }
  return { matches, degisen, hata: '' };
}

/**
 * Yeniden gönderim sonrası kaydın sayaçları ve durumu.
 * Sunucu bunları İSTEMCİDEN ALMAZ, kendisi hesaplar.
 */
export function sayaclar(matches) {
  const ms = Array.isArray(matches) ? matches : [];
  let bekleyen = 0;
  let onayli = 0;
  let red = 0;
  ms.forEach((m) => {
    if (m && m.ogrenciVazgecti) {
      red += satirDurumu(m) === 'reddedildi' ? 1 : 0;
      return;
    }
    const d = satirDurumu(m);
    if (d === 'onayli') onayli += 1;
    else if (d === 'reddedildi') red += 1;
    else bekleyen += 1;
  });
  return {
    pendingReviewCount: bekleyen,
    approvedCount: onayli,
    rejectedCount: red,
    status: bekleyen > 0 ? 'pending' : 'reviewed',
  };
}

/** Öğrenciye/akademisyene gösterilecek özet cümle. */
export function yenidenGonderimOzeti(sonuc) {
  const s = sonuc || {};
  if (!s.degisen) return '';
  return s.degisen + ' ders düzeltildi ve yeniden akademisyen onayına gönderildi.';
}
