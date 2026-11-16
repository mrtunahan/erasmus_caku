// ══════════════════════════════════════════════════════════════
// MEZUNİYET BAŞVURUSU — süreç kuralları (istemci ve sunucu AYNI dosyayı okur)
//
//   1) ÖĞRENCİ transkriptini yükler; sistem tarar ve dersleri OLDUĞU GİBİ
//      forma aktarır. Öğrenci formdaki dersleri düzenleyemez — yalnız yeni
//      transkript yükleyip yeniden taratabilir. Bölüm kurallarına uymayan
//      satırlar (lib/mezuniyet.js → mezSatirIhlalleri) sarı görünür.
//   2) Öğrenci formu DANIŞMANINA gönderir                  → 'danismanda'
//   3) Danışman inceler: düzeltme ister                     → 'iade'
//                        ya da onaylar                      → 'dilekce'
//   4) Dilekçe aşamasında danışman öğrenciye not yazar, silinmesi gereken
//      dersleri ve eksik stajları işaretler; bunlar mezuniyet dilekçesinin
//      ders sildirme bölümüne işlenir (TEK dilekçe). Öğrenci mezuniyet dilekçesini (ve gerekiyorsa
//      ders sildirme dilekçesini) indirir, imzalar, imzalı hâlini yükler
//                                                           → 'imzali'
//   5) Danışman imzalı belgeyi geri çevirir                 → 'dilekce'
//      ya da transkript ve dilekçeleri MEMURA iletir        → 'memurda'
//   6) Memur işlemi bitirir                                 → 'tamamlandi'
//
// Sunucu (server/routes/db.js) her yazmayı buradaki kararlarla denetler:
// ekranda gizlenen bir düğme güvenlik değildir.
// ══════════════════════════════════════════════════════════════

export const MEZ_BASVURU_KOLEKSIYONU = 'mezuniyet_basvurulari';
export const MEZ_BELGE_KLASORU = 'mezuniyet';

export const MEZ_DURUMLAR = {
  taslak: { etiket: 'Taslak', renk: '#5F6368', zemin: '#F1F3F4' },
  danismanda: { etiket: 'Danışman incelemesinde', renk: '#105BFF', zemin: '#E8F0FF' },
  iade: { etiket: 'Danışman düzeltme istedi', renk: '#B45309', zemin: '#FFF7E6' },
  dilekce: { etiket: 'Dilekçe aşaması', renk: '#7C3AED', zemin: '#F5F3FF' },
  imzali: { etiket: 'İmzalı dilekçe danışmanda', renk: '#105BFF', zemin: '#E8F0FF' },
  memurda: { etiket: 'Memura iletildi', renk: '#FE8500', zemin: '#FFF3E6' },
  tamamlandi: { etiket: 'İşlem tamamlandı', renk: '#059669', zemin: '#ECFDF5' },
};

/** Sürecin adımları — ekrandaki ilerleme şeridi bu sırayı çizer. */
export const MEZ_ADIMLAR = [
  { id: 'form', etiket: 'Transkript ve form', durumlar: ['taslak', 'iade'] },
  { id: 'danisman', etiket: 'Danışman onayı', durumlar: ['danismanda'] },
  { id: 'dilekce', etiket: 'Dilekçe ve imza', durumlar: ['dilekce'] },
  { id: 'kontrol', etiket: 'Danışman kontrolü', durumlar: ['imzali'] },
  { id: 'memur', etiket: 'Memur', durumlar: ['memurda', 'tamamlandi'] },
];

const metin = (v) => String(v == null ? '' : v).trim();
const dizi = (v) => (Array.isArray(v) ? v : []);

export function durumEtiketi(durum) {
  return (MEZ_DURUMLAR[metin(durum)] || MEZ_DURUMLAR.taslak).etiket;
}

/** Adım şeridinde kaçıncı adımdayız (0'dan). */
export function adimSirasi(durum) {
  const d = metin(durum) || 'taslak';
  const i = MEZ_ADIMLAR.findIndex((a) => a.durumlar.indexOf(d) >= 0);
  return i < 0 ? 0 : i;
}

/**
 * Danışman adını karşılaştırma anahtarına çevirir: unvan atılır, Türkçe harf
 * sadeleşir ("Dr. Öğr. Üyesi Ayşe İnan" ≡ "Ayşe İnan"). Öğrencinin seçtiği
 * danışman adı ile akademisyenin oturum kimliği farklı yazılmış olabilir.
 * (lib/randevu.js → akademisyenAnahtari ile aynı kural.)
 */
export function danismanAnahtari(ad) {
  const harita = { ç: 'c', ğ: 'g', ı: 'i', ö: 'o', ş: 's', ü: 'u', â: 'a', î: 'i', û: 'u' };
  return metin(ad)
    .replace(/(prof\.?|doç\.?|dr\.?|öğr\.?|gör\.?|arş\.?|üyesi)/gi, ' ')
    .toLocaleLowerCase('tr')
    .replace(/[çğıöşüâîû]/g, (c) => harita[c] || c)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Bu akademisyen başvurunun danışmanı mı? */
export function danismaniMi(basvuru, kimlik) {
  const a = danismanAnahtari(kimlik);
  if (!a || !basvuru) return false;
  return danismanAnahtari(basvuru.danisman) === a || metin(basvuru.danismanAnahtar) === a;
}

// ── Alan grupları ──
// Öğrencinin formu: transkriptten gelen her şey + iletişim + danışman.
const OGRENCI_FORM_ALANLARI = [
  'ogrenciNo',
  // Öğrencinin müfredatı (8+0 / 7+1 …): hesap bu müfredatın dersleriyle yapılır.
  'program',
  'ogrenciAd',
  'departmentId',
  'facultyId',
  'bolumAdi',
  'fakulteAdi',
  'sinif',
  'agno',
  'transkriptUrl',
  'transkriptAdi',
  'transkriptTarihi',
  // Transkriptin "Birikimli · Tamamlanan AKTS" değeri (taramada okunur).
  'transkriptAkts',
  'dersler',
  'ozet',
  // Transkript satırını müfredat dersiyle eşleştirme önerileri (danışman karar verir).
  'eslesmeOnerileri',
  'danisman',
  'danismanAnahtar',
  'iletisim',
  'gonderimTarihi',
];
// Dilekçe aşamasında öğrencinin yazabildikleri.
const OGRENCI_IMZA_ALANLARI = [
  'imzaliDilekce',
  'imzaliSildirme',
  'iletisim',
  'imzaTarihi',
  // Dilekçedeki iki kutudan hangisi: 'yok' | 'var'.
  'silmeBeyani',
  // "… öğretim yılı … dönemi sonu itibariyle" — öğrenci girer.
  'mezuniyetDonemi',
  // Silinecek dersin transkriptte okunamayan yıl/yarıyıl/statüsü (öğrenci
  // tamamlar; danışmanın ders listesine dokunmaz). Anahtar: "kod|ad".
  'silinecekEk',
];
// Danışmanın karar ve işaret alanları.
const DANISMAN_ALANLARI = [
  'danismanNotu',
  // "Düzeltme iste" notu. danismanNotu'ndan AYRI: danismanNotu dilekçeye
  // basılır; düzeltme isteği ("son sayfa eksik") dilekçeye gitmemeli.
  'iadeNotu',
  'silinecekDersler',
  'eksikStajlar',
  // Öğrencinin eşleştirme önerilerine kabul/red kararları.
  'eslesmeKararlari',
  'danismanKarariTarihi',
  'memuraIletim',
];
const MEMUR_ALANLARI = ['memurNotu', 'tamamlanmaTarihi'];
// Her yazmada serbest: zaman damgaları, geçmiş ve mesajlar (ikisi yalnız
// SONUNA EKLENEREK — aşağıda ayrıca denetlenir).
const ORTAK_ALANLAR = ['updatedAt', 'createdAt', 'gecmis', 'mesajlar', 'durum', '_owner'];

// Kim hangi durumdan hangisine geçirebilir.
const GECISLER = {
  ogrenci: {
    yok: ['taslak', 'danismanda'],
    taslak: ['taslak', 'danismanda'],
    iade: ['iade', 'taslak', 'danismanda'],
    dilekce: ['dilekce', 'imzali'],
  },
  danisman: {
    danismanda: ['danismanda', 'iade', 'dilekce'],
    // Form öğrencideyken danışman yalnız not yazar (öğrencinin notuna cevap).
    iade: ['iade'],
    dilekce: ['dilekce', 'iade'],
    imzali: ['imzali', 'dilekce', 'memurda'],
  },
  memur: {
    memurda: ['memurda', 'tamamlandi'],
  },
};

// Öğrenci bu durumlarda hangi alan grubunu yazar.
function ogrenciAlanlari(durum) {
  if (durum === 'yok' || durum === 'taslak' || durum === 'iade') return OGRENCI_FORM_ALANLARI;
  if (durum === 'dilekce') return OGRENCI_IMZA_ALANLARI;
  return [];
}

function esit(a, b) {
  return JSON.stringify(a === undefined ? null : a) === JSON.stringify(b === undefined ? null : b);
}

/** Yazmada GERÇEKTEN değişen alanlar (istemci kaydın tamamını gönderebilir). */
export function degisenAlanlar(mevcut, veri) {
  const m = mevcut || {};
  return Object.keys(veri || {}).filter((k) => k !== '_id' && !esit(m[k], veri[k]));
}

/** Dizi yalnız sonuna eklenerek mi büyüdü? Eklenenleri döner; değilse null. */
export function sonaEklenenler(eski, yeni) {
  const e = dizi(eski);
  const y = dizi(yeni);
  if (y.length < e.length) return null;
  for (let i = 0; i < e.length; i += 1) if (!esit(e[i], y[i])) return null;
  return y.slice(e.length);
}

function ortakDenetim(rol, mevcut, veri) {
  const m = mevcut || {};
  if ('gecmis' in veri && !esit(m.gecmis, veri.gecmis)) {
    if (!sonaEklenenler(m.gecmis, veri.gecmis)) {
      return 'Başvuru geçmişi değiştirilemez; yalnız yeni kayıt eklenir.';
    }
  }
  if ('mesajlar' in veri && !esit(m.mesajlar, veri.mesajlar)) {
    const yeni = sonaEklenenler(m.mesajlar, veri.mesajlar);
    if (!yeni) return 'Yazılmış notlar değiştirilemez; yalnız yeni not eklenir.';
    if (yeni.some((x) => !x || metin(x.rol) !== rol || !metin(x.metin))) {
      return 'Not yalnız kendi adınıza ve boş olmayan metinle eklenir.';
    }
  }
  return '';
}

function gecisDenetimi(rol, eskiDurum, yeniDurum) {
  const izinli = (GECISLER[rol] || {})[eskiDurum];
  if (!izinli) return 'Başvuru bu aşamadayken (' + durumEtiketi(eskiDurum) + ') değiştirilemez.';
  if (izinli.indexOf(yeniDurum) < 0) {
    return (
      'Başvuru “' +
      durumEtiketi(eskiDurum) +
      '” aşamasından “' +
      durumEtiketi(yeniDurum) +
      '” aşamasına geçirilemez.'
    );
  }
  return '';
}

/**
 * Öğrencinin yazma kararı.
 * @param {object} o
 * @param {'add'|'set'|'update'|'delete'} o.tur
 * @param {object|null} o.mevcut  veritabanındaki kayıt (yoksa null)
 * @param {object} o.veri         yazılacak alanlar
 * @param {string[]} o.numaralar  öğrencinin numaraları (ÇAP dahil)
 * @returns {{izin:boolean, hata?:string}}
 */
export function ogrenciYazmaKarari(o) {
  const p = o || {};
  const mevcut = p.mevcut || null;
  const veri = p.veri || {};
  const numaralar = dizi(p.numaralar).map(metin).filter(Boolean);
  const benim = (no) => numaralar.indexOf(metin(no)) >= 0;
  if (mevcut && !benim(mevcut.ogrenciNo)) {
    return { izin: false, hata: 'Bu mezuniyet başvurusu size ait değil.' };
  }
  const eskiDurum = mevcut ? metin(mevcut.durum) || 'taslak' : 'yok';
  if (p.tur === 'delete') {
    return eskiDurum === 'taslak' || eskiDurum === 'iade'
      ? { izin: true }
      : { izin: false, hata: 'Danışmana gönderilmiş başvuru silinemez.' };
  }
  if (!mevcut && !benim(veri.ogrenciNo)) {
    return { izin: false, hata: 'Başvuru yalnız kendi numaranızla açılır.' };
  }
  if ('ogrenciNo' in veri && mevcut && metin(veri.ogrenciNo) !== metin(mevcut.ogrenciNo)) {
    return { izin: false, hata: 'Başvurunun sahibi değiştirilemez.' };
  }
  const yeniDurum =
    'durum' in veri ? metin(veri.durum) : eskiDurum === 'yok' ? 'taslak' : eskiDurum;
  const g = gecisDenetimi('ogrenci', eskiDurum, yeniDurum);
  if (g) return { izin: false, hata: g };
  const serbest = ogrenciAlanlari(eskiDurum).concat(ORTAK_ALANLAR);
  const yasak = degisenAlanlar(mevcut, veri).filter((k) => serbest.indexOf(k) < 0);
  if (yasak.length) {
    return {
      izin: false,
      hata: 'Bu aşamada şu alanları değiştiremezsiniz: ' + yasak.join(', ') + '.',
    };
  }
  const od = ortakDenetim('ogrenci', mevcut, veri);
  if (od) return { izin: false, hata: od };
  const sonra = Object.assign({}, mevcut || {}, veri);
  if (yeniDurum === 'danismanda' && eskiDurum !== 'danismanda') {
    if (!metin(sonra.danisman)) return { izin: false, hata: 'Önce danışmanınızı seçin.' };
    if (!metin(sonra.transkriptUrl) || dizi(sonra.dersler).length === 0) {
      return { izin: false, hata: 'Önce transkriptinizi yükleyip taratın.' };
    }
  }
  if (yeniDurum === 'imzali' && eskiDurum === 'dilekce') {
    const eksik = imzaEksikleri(sonra);
    if (eksik.length) return { izin: false, hata: eksik.join(' ') };
  }
  return { izin: true };
}

/** İmzalı yükleme için eksik belgeler (boşsa danışmana gönderilebilir). */
export function imzaEksikleri(b) {
  const out = [];
  if (['yok', 'var'].indexOf(metin(b && b.silmeBeyani)) < 0) {
    out.push('Dilekçedeki beyan kutularından birini işaretleyin.');
  } else if (metin(b && b.silmeBeyani) === 'yok' && dizi(b && b.silinecekDersler).length > 0) {
    // Danışman silinecek ders işaretlediyse "silinecek dersim yok" beyanı
    // dilekçenin ders tablosuyla çelişir; memura çelişkili belge gitmesin.
    out.push(
      'Danışmanınız silinecek ders işaretledi; beyanda “derslerin silinmesini istiyorum” kutusunu işaretleyin.'
    );
  }
  if (!metin(b && b.imzaliDilekce && b.imzaliDilekce.url)) {
    out.push('İmzalı mezuniyet dilekçesini yükleyin.');
  }
  // Tek belge: silinecek dersler ve eksik stajlar mezuniyet dilekçesinin
  // içindedir (kurumun formu "Mezuniyet Dilekçesi + Ders Sildirme" tek sayfa).
  return out;
}

/**
 * Danışmanın yazma kararı. Yalnız başvurunun DANIŞMANI çağırır.
 * Danışman kayıt açamaz, silemez, öğrencinin formuna dokunamaz.
 */
export function danismanYazmaKarari(o) {
  const p = o || {};
  const mevcut = p.mevcut || null;
  const veri = p.veri || {};
  if (!mevcut) return { izin: false, hata: 'Mezuniyet başvurusunu yalnız öğrenci açar.' };
  // Danışman isterse başvuruyu HER AŞAMADA siler (öğrenci baştan başlar).
  // Memura iletilmiş belgeler sunucuda birlikte kaldırılır (routes/db.js →
  // mezuniyetSilmeTemizligi); memurda sahipsiz belge kalmaz.
  if (p.tur === 'delete') return { izin: true };
  const eskiDurum = metin(mevcut.durum) || 'taslak';
  const yeniDurum = 'durum' in veri ? metin(veri.durum) : eskiDurum;
  const g = gecisDenetimi('danisman', eskiDurum, yeniDurum);
  if (g) return { izin: false, hata: g };
  // Form öğrencideyken (iade) yalnız not; karar alanları form geri gelince.
  const serbest = (eskiDurum === 'iade' ? [] : DANISMAN_ALANLARI).concat(ORTAK_ALANLAR);
  const yasak = degisenAlanlar(mevcut, veri).filter((k) => serbest.indexOf(k) < 0);
  if (yasak.length) {
    return {
      izin: false,
      hata:
        eskiDurum === 'iade'
          ? 'Form öğrencide; yalnız not yazabilirsiniz.'
          : 'Danışman öğrencinin formunu değiştiremez (' + yasak.join(', ') + ').',
    };
  }
  // İşaretler yalnız dilekçe öncesi/sırasında değişir; imzalandıktan sonra
  // değişirse imzalı belge ile kayıt ayrışırdı.
  if (
    eskiDurum === 'imzali' &&
    ['silinecekDersler', 'eksikStajlar'].some((k) => k in veri && !esit(mevcut[k], veri[k]))
  ) {
    return {
      izin: false,
      hata: 'İmzalı dilekçe geldikten sonra işaretler değiştirilemez; önce dilekçeyi geri çevirin.',
    };
  }
  const od = ortakDenetim('danisman', mevcut, veri);
  if (od) return { izin: false, hata: od };
  if (yeniDurum === 'memurda' && eskiDurum !== 'memurda') {
    const eksik = imzaEksikleri(Object.assign({}, mevcut, veri));
    if (eksik.length) return { izin: false, hata: eksik.join(' ') };
  }
  return { izin: true };
}

/** Memurun yazma kararı: yalnız memura iletilmiş başvuruyu kapatır. */
export function memurYazmaKarari(o) {
  const p = o || {};
  const mevcut = p.mevcut || null;
  const veri = p.veri || {};
  if (!mevcut || p.tur === 'delete')
    return { izin: false, hata: 'Memur başvuru açamaz ve silemez.' };
  const eskiDurum = metin(mevcut.durum);
  const yeniDurum = 'durum' in veri ? metin(veri.durum) : eskiDurum;
  const g = gecisDenetimi('memur', eskiDurum, yeniDurum);
  if (g) return { izin: false, hata: g };
  const serbest = MEMUR_ALANLARI.concat(ORTAK_ALANLAR);
  const yasak = degisenAlanlar(mevcut, veri).filter((k) => serbest.indexOf(k) < 0);
  if (yasak.length) return { izin: false, hata: 'Memur yalnız işlemi tamamlar.' };
  const od = ortakDenetim('memur', mevcut, veri);
  if (od) return { izin: false, hata: od };
  return { izin: true };
}

/** Bir yazmanın geçmiş kaydı (ekran ekler, sunucu sırasını denetler). */
export function gecmisKaydi(olay, yapan, rol) {
  return {
    tarih: new Date().toISOString(),
    olay: metin(olay),
    yapan: metin(yapan),
    rol: metin(rol),
  };
}

// ══════════════════════════════════════════════════════════════
// BİLDİRİM PLANI — yazma başarıyla bittikten sonra kime ne gider
// ══════════════════════════════════════════════════════════════
/**
 * @param {object} o { eski, yeni, yapanRol: 'ogrenci'|'danisman'|'memur'|'' }
 * @returns {Array<{recipientId, type, title, body, link, meta}>}
 */
export function mezuniyetZilPlani(o) {
  const p = o || {};
  const eski = p.eski || {};
  const yeni = p.yeni || {};
  const rol = metin(p.yapanRol);
  const ogr = metin(yeni.ogrenciNo || eski.ogrenciNo);
  const dan = metin(yeni.danisman || eski.danisman);
  const ad = metin(yeni.ogrenciAd || eski.ogrenciAd) || ogr;
  const meta = { basvuruId: ogr };
  const plan = [];
  const ogrenciye = (type, title, body) =>
    ogr && plan.push({ recipientId: ogr, type, title, body, link: 'mezuniyet', meta });
  const danismana = (type, title, body) =>
    dan && plan.push({ recipientId: dan, type, title, body, link: 'benimakademik', meta });
  const e = metin(eski.durum) || 'yok';
  const y = metin(yeni.durum) || e;

  // Danışman başvuruyu sildi: öğrenciye haber verilir, başka bildirim yok.
  if (p.silindi) {
    if (rol === 'danisman') {
      ogrenciye(
        'mezuniyet_silindi',
        'Mezuniyet başvurunuz silindi',
        'Danışmanınız mezuniyet başvurunuzu sildi. Mezuniyet modülünden yeniden başlayabilirsiniz.'
      );
    }
    return plan;
  }

  if (y !== e) {
    if (y === 'danismanda') {
      danismana(
        'mezuniyet_onay',
        'Mezuniyet onayı bekleniyor',
        ad + ' mezuniyet formunu ve transkriptini onayınıza gönderdi.'
      );
    } else if (y === 'iade') {
      ogrenciye(
        'mezuniyet_iade',
        'Mezuniyet formunuz geri çevrildi',
        'Danışmanınız düzeltme istedi: ' +
          (metin(yeni.iadeNotu) || metin(yeni.danismanNotu) || 'notları inceleyin.')
      );
    } else if (y === 'dilekce' && e === 'danismanda') {
      ogrenciye(
        'mezuniyet_dilekce',
        'Mezuniyet formunuz onaylandı',
        'Danışmanınız formunuzu onayladı. Mezuniyet dilekçenizi oluşturabilirsiniz.'
      );
    } else if (y === 'dilekce' && e === 'imzali') {
      ogrenciye(
        'mezuniyet_imza_iade',
        'İmzalı dilekçeniz geri çevrildi',
        'Danışmanınız imzalı dilekçenizi yeniden yüklemenizi istedi.'
      );
    } else if (y === 'imzali') {
      danismana(
        'mezuniyet_imzali',
        'İmzalı mezuniyet dilekçesi geldi',
        ad + ' imzalı mezuniyet dilekçesini yükledi.'
      );
    } else if (y === 'memurda') {
      ogrenciye(
        'mezuniyet_memur',
        'Mezuniyet belgeleriniz memura iletildi',
        'Danışmanınız transkriptinizi ve dilekçenizi bölüm memuruna iletti.'
      );
    } else if (y === 'tamamlandi') {
      ogrenciye(
        'mezuniyet_tamam',
        'Mezuniyet işleminiz tamamlandı',
        metin(yeni.memurNotu) || 'Bölüm memuru mezuniyet başvurunuzu işledi.'
      );
    }
  } else if (rol === 'danisman' && y === 'dilekce') {
    // Dilekçe aşamasındaki işaretler öğrenciye ayrıca haber verilir.
    const degisti = ['silinecekDersler', 'eksikStajlar'].some((k) => !esit(eski[k], yeni[k]));
    if (degisti) {
      ogrenciye(
        'mezuniyet_isaret',
        'Danışmanınız dilekçenizi güncelledi',
        'Silinecek dersler ya da eksik stajlar işaretlendi; dilekçenizi yeniden indirin.'
      );
    }
  }
  // Yeni notlar: karşı tarafa.
  const yeniNotlar = sonaEklenenler(eski.mesajlar, yeni.mesajlar) || [];
  if (yeniNotlar.length && !plan.length) {
    const son = yeniNotlar[yeniNotlar.length - 1];
    if (metin(son.rol) === 'danisman') {
      ogrenciye('mezuniyet_not', 'Danışmanınızdan not', metin(son.metin).slice(0, 200));
    } else if (metin(son.rol) === 'ogrenci') {
      danismana('mezuniyet_not', ad + ' bir not yazdı', metin(son.metin).slice(0, 200));
    }
  }
  return plan;
}

// ══════════════════════════════════════════════════════════════
// DİLEKÇE VERİSİ — şablon (Şablonlar → Mezuniyet) ve yerleşik PDF ortak
// ══════════════════════════════════════════════════════════════
export const MEZ_DILEKCE_ALANLARI = [
  { id: 'ogrenciAd', label: 'Öğrenci Adı Soyadı', format: 'name' },
  { id: 'ogrenciNo', label: 'Öğrenci Numarası' },
  { id: 'bolumAdi', label: 'Bölüm', format: 'title' },
  { id: 'fakulteAdi', label: 'Fakülte', format: 'title' },
  { id: 'sinif', label: 'Sınıf' },
  { id: 'agno', label: 'AGNO' },
  { id: 'toplamAkts', label: 'Geçilen Toplam AKTS' },
  { id: 'telefon', label: 'Telefon' },
  { id: 'eposta', label: 'E-posta' },
  { id: 'adres', label: 'Adres' },
  { id: 'danisman', label: 'Danışman', format: 'name' },
  { id: 'tarih', label: 'Tarih' },
  { id: 'ogretimYili', label: 'Mezuniyet Öğretim Yılı (örn. 2025-2026)' },
  { id: 'donem', label: 'Mezuniyet Dönemi (Güz/Bahar/Yaz)' },
  { id: 'silinecekDersMetni', label: 'Silinecek Dersler (metin)' },
  { id: 'eksikStajMetni', label: 'Eksik Stajlar (metin)' },
  { id: 'danismanNotu', label: 'Danışman Notu' },
];
export const MEZ_DILEKCE_SATIRLARI = [
  { id: 'kod', label: 'Ders Kodu' },
  { id: 'ad', label: 'Ders Adı', format: 'title' },
  { id: 'akts', label: 'AKTS' },
  { id: 'not', label: 'Harf Notu' },
  { id: 'yil', label: 'Eğitim-Öğretim Yılı' },
  { id: 'yariyil', label: 'Yarıyıl' },
  { id: 'statu', label: 'Statüsü' },
];

function trTarih(d) {
  const t = d ? new Date(d) : new Date();
  const g = (n) => String(n).padStart(2, '0');
  return g(t.getDate()) + '.' + g(t.getMonth() + 1) + '.' + t.getFullYear();
}

/** Silinecek dersin anahtarı (öğrencinin tamamladığı bilgiler bununla eşlenir). */
export function dersAnahtari(d) {
  return metin(d && d.kod) + '|' + metin(d && d.ad);
}

/** Danışmanın listesi + öğrencinin tamamladığı yıl/yarıyıl/statü. */
const sade = (s) =>
  metin(s)
    .replace(/İ/g, 'i')
    .replace(/I/g, 'ı')
    .toLocaleLowerCase('tr-TR')
    .replace(/[çğıöşü]/g, (c) => ({ ç: 'c', ğ: 'g', ı: 'i', ö: 'o', ş: 's', ü: 'u' })[c])
    .replace(/[^a-z0-9]/g, '');

/** Aynı dersin denemelerini birleştiren anahtar (kod, yoksa ad). */
export function dersGrupAnahtari(d) {
  return sade(d && d.kod) || sade(d && d.ad);
}

/**
 * Dönemin sıralanabilir değeri: yıl × 10 + yarıyıl (Güz 1, Bahar 2, Yaz 3).
 * "2023", "2023-2024" ya da "2023 - 2024" yılın ilk sayısıyla okunur.
 */
export function donemSirasi(d) {
  const m = metin(d && d.yil).match(/(\d{4})/);
  const yil = m ? Number(m[1]) : 0;
  const y = sade(d && d.yariyil);
  let s = 0;
  if (y.indexOf('guz') >= 0) s = 1;
  else if (y.indexOf('bahar') >= 0) s = 2;
  else if (y.indexOf('yaz') >= 0) s = 3;
  else s = parseInt(y, 10) || 0;
  return yil * 10 + s;
}

/**
 * Silinecek dersler: her ders BİR KEZ, en son dönemdeki hâliyle. Danışman
 * bir dersin her başarısız denemesini işaretlediğinde dilekçeye aynı ders üç
 * kez gidiyordu. Sıra ilk görünüşe göre korunur.
 */
export function silinecekleriTekille(liste) {
  const sira = [];
  const enSon = new Map();
  dizi(liste).forEach((d) => {
    const k = dersGrupAnahtari(d);
    if (!k) return;
    if (!enSon.has(k)) sira.push(k);
    const o = enSon.get(k);
    if (!o || donemSirasi(d) >= donemSirasi(o)) enSon.set(k, d);
  });
  // En son denemede okunamamış statü/AKTS, aynı dersin önceki denemesinden
  // tamamlanır (statü ve AKTS dönemden döneme değişmez).
  return sira.map((k) => {
    const d = enSon.get(k);
    const digerleri = dizi(liste).filter((x) => dersGrupAnahtari(x) === k);
    const bul = (alan) =>
      metin(d[alan]) || (digerleri.find((x) => metin(x[alan])) || {})[alan] || '';
    return { ...d, statu: bul('statu'), akts: bul('akts') };
  });
}

export function silinecekDersleriBirlestir(b) {
  const ek = (b && b.silinecekEk) || {};
  return silinecekleriTekille(b && b.silinecekDersler).map((d) => {
    const e = ek[dersAnahtari(d)] || {};
    return {
      ...d,
      yil: metin(d.yil) || metin(e.yil),
      yariyil: metin(d.yariyil) || metin(e.yariyil),
      statu: metin(d.statu) || metin(e.statu),
    };
  });
}

export function dersMetni(d) {
  return (
    [metin(d.kod), metin(d.ad)].filter(Boolean).join(' — ') +
    (metin(d.akts) ? ' (' + metin(d.akts) + ' AKTS)' : '')
  );
}

/** Dilekçenin değişkenleri. */
export function dilekceVerisi(b, tarih) {
  const x = b || {};
  const il = x.iletisim || {};
  const sil = dizi(x.silinecekDersler);
  return {
    ogrenciAd: metin(il.adSoyad) || metin(x.ogrenciAd),
    ogrenciNo: metin(x.ogrenciNo),
    bolumAdi: metin(il.bolum) || metin(x.bolumAdi),
    fakulteAdi: metin(x.fakulteAdi),
    sinif: metin(x.sinif),
    agno: metin(x.agno),
    toplamAkts: metin(x.ozet && x.ozet.gecilenAkts),
    telefon: metin(il.telefon),
    eposta: metin(il.eposta),
    adres: metin(il.adres),
    danisman: metin(x.danisman),
    tarih: trTarih(tarih),
    silinecekDersMetni: sil.map(dersMetni).join('\n'),
    eksikStajMetni: dizi(x.eksikStajlar).map(metin).filter(Boolean).join(', '),
    danismanNotu: metin(x.danismanNotu),
    ogretimYili: metin(x.mezuniyetDonemi && x.mezuniyetDonemi.ogretimYili),
    donem: metin(x.mezuniyetDonemi && x.mezuniyetDonemi.donem),
  };
}

/** Dosya adı için güvenli parça. */
export function dosyaParcasi(s) {
  const harita = {
    ç: 'c',
    ğ: 'g',
    ı: 'i',
    ö: 'o',
    ş: 's',
    ü: 'u',
    Ç: 'C',
    Ğ: 'G',
    İ: 'I',
    Ö: 'O',
    Ş: 'S',
    Ü: 'U',
  };
  return metin(s)
    .replace(/[çğıöşüÇĞİÖŞÜ]/g, (c) => harita[c] || c)
    .replace(/[^A-Za-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 60);
}

/**
 * Personel bu başvuruyu görür mü? (sunucu okuma süzgeci + ekran)
 * @param {object} b       başvuru
 * @param {object} k       { kimlik, tamErisim, bolumAlaninda(bolumId)→bool, memurBolumunde(bolumId)→bool }
 */
export function personelGorurMu(b, k) {
  const x = b || {};
  const o = k || {};
  if (o.tamErisim) return true;
  const durum = metin(x.durum) || 'taslak';
  // Taslak yalnız öğrencinindir.
  if (durum === 'taslak') return false;
  if (o.kimlik && danismaniMi(x, o.kimlik)) return true;
  if (typeof o.bolumAlaninda === 'function' && o.bolumAlaninda(metin(x.departmentId))) return true;
  if (
    (durum === 'memurda' || durum === 'tamamlandi') &&
    typeof o.memurBolumunde === 'function' &&
    o.memurBolumunde(metin(x.departmentId))
  ) {
    return true;
  }
  return false;
}
