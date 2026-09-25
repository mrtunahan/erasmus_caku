/**
 * DİJİTAL YOKLAMA — kural dosyası.
 *
 * Sorun şudur: projeksiyondaki karekodun fotoğrafını çekip WhatsApp grubuna
 * atan öğrenci, evdeki arkadaşına yoklama verdirir. Sabit bir karekod bunu
 * hiçbir şekilde engelleyemez — bu yüzden kod DÖNER.
 *
 * ── Dönen kod (TOTP ilkesi) ──
 * Oturum açılırken sunucuda oturuma özel bir gizli anahtar üretilir. Kod:
 *
 *     <oturumId>.<zamanDilimi>.<imza>
 *
 * `zamanDilimi = floor(zaman / ADIM)`, `imza = HMAC(sirr, oturumId.dilim)`.
 * Akademisyenin ekranı her ADIM milisaniyede yeni kod çizer. Öğrenci kodu
 * okuttuğunda SUNUCU şunu sorar: imza doğru mu VE dilimin zamanı ile şimdi
 * arasındaki fark TOLERANS'tan küçük mü?
 *
 * ⚠ GİZLİ ANAHTAR ÖĞRENCİYE ASLA GİTMEZ. Öğrenci yalnız okuduğu kodu
 * gönderir; doğrulama sunucuda yapılır. Anahtar istemciye verilseydi kodu
 * kendisi üretir, dersin tamamına evden yoklama verirdi.
 *
 * ⚠ DOĞRULAMA SUNUCUNUN SAATİYLE YAPILIR. Öğrencinin telefon saati yanlışsa
 * bu onun sorunudur ve kodu geçersiz kılmaz. Akademisyenin ekranı da kendi
 * saatine değil, oturum açılırken sunucudan gelen saate göre düzeltilmiş
 * zamanı kullanır (bkz. `duzeltilmisZaman`) — hocanın bilgisayarı 20 saniye
 * ileriyse aksi hâlde sınıftaki HİÇBİR öğrenci yoklama veremezdi.
 *
 * Kod fotoğraflanıp gönderilse bile alıcının elinde kalan süre TOLERANS
 * kadardır; sekiz saniyede ekran görüntüsünü paylaşıp karşı tarafın okutması
 * pratikte mümkün değildir.
 */

import { esitMi, hmacHex } from './hmac-sha256.js';

/** Kodun yenilenme aralığı (ms) — projeksiyondaki karekod bu sıklıkta değişir. */
export const ADIM_MS = 6000;

/** Kabul penceresi (ms) — okutma anı ile kodun zamanı arasındaki azami fark. */
export const TOLERANS_MS = 8000;

// ══════════════════════════════════════════════════════════════
// ELLE YAZILAN KISA KOD
//
// ⚠ NİÇİN İKİNCİ BİR KOD? Karekod okutmak her öğrenci için çalışmıyor:
// kamerası bozuk, kamera izni kapalı, telefonu eski ya da sınıfın arkasından
// projeksiyon okunmuyor. Bu öğrenciler yoklamada "yok" görünüyordu. Ekranda
// karekodun YANINDA duran altı haneli kodu yazarak da yoklama verilebilir.
//
// ⚠ PENCERESİ NİÇİN DAHA UZUN? Altı haneyi okuyup yazmak birkaç saniye
// sürer; karekodun 6 saniyelik penceresinde hiç kimse yetiştiremezdi.
// Bu yüzden kısa kod KISA_ADIM_MS'de bir değişir.
//
// ⚠ BUNUN BEDELİ AÇIKTIR: kodu WhatsApp'a yazan öğrencinin arkadaşının
// elinde karekoda göre daha uzun bir süre kalır. Kabul edilmesinin sebebi,
// yoklamanın TEK savunmasının kod olmamasıdır: her öğrenci kendi cihazına
// bağlıdır (lib/cihaz-kimlik.js), ikinci bir kişi aynı cihazdan okutamaz ve
// son söz akademisyenin canlı listesindedir.
// ══════════════════════════════════════════════════════════════

/** Elle yazılan kodun yenilenme aralığı (ms). */
export const KISA_ADIM_MS = 30000;

/**
 * Elle yazılan kodun kabul penceresi (ms) — kodun DİLİMİ BAŞLADIĞINDAN beri.
 * 60 sn = ekranda durduğu 30 sn + okuyup yazması için 30 sn. Daha kısası,
 * kodu ekranın sonunda görüp yazmaya başlayan öğrenciyi reddederdi.
 */
export const KISA_TOLERANS_MS = 60000;

/** Elle yazılan kodun hane sayısı. */
export const KISA_KOD_UZUNLUGU = 6;

/** İmzanın koda yazılan kısmı. Tamamı gerekmiyor; kod kısa kalsın diye kırpılır. */
export const IMZA_UZUNLUGU = 16;

export const YOKLAMA_DURUMLARI = {
  var: { etiket: 'Var', renk: '#059669', isaret: '✓' },
  yok: { etiket: 'Yok', renk: '#DC2626', isaret: '✕' },
  izinli: { etiket: 'İzinli', renk: '#B45309', isaret: '—' },
};

const metin = (v) => String(v == null ? '' : v).trim();

/** Zaman diliminin numarası. */
export function zamanDilimi(zaman, adim) {
  const a = Number(adim) > 0 ? Number(adim) : ADIM_MS;
  const t = Number(zaman);
  return Math.floor((Number.isFinite(t) ? t : 0) / a);
}

/**
 * Sunucu saatine göre düzeltilmiş "şimdi".
 * Oturum açılırken sunucunun saati alınır; aradaki fark her çizimde eklenir.
 */
export function duzeltilmisZaman(yerelZaman, saatFarki) {
  const t = Number(yerelZaman);
  const f = Number(saatFarki);
  return (Number.isFinite(t) ? t : 0) + (Number.isFinite(f) ? f : 0);
}

/** İmzalanacak metin — sunucu ve istemci AYNI dizeyi imzalamalıdır. */
export function imzaGovdesi(oturumId, dilim) {
  return metin(oturumId) + '.' + String(dilim);
}

/** Bir zaman dilimi için yoklama kodu. */
export function yoklamaKodu(sirr, oturumId, dilim) {
  const imza = hmacHex(metin(sirr), imzaGovdesi(oturumId, dilim)).slice(0, IMZA_UZUNLUGU);
  return metin(oturumId) + '.' + String(dilim) + '.' + imza;
}

/** Şu anki kod — akademisyenin ekranı bunu çizer. */
export function anlikKod(sirr, oturumId, zaman, adim) {
  return yoklamaKodu(sirr, oturumId, zamanDilimi(zaman, adim || ADIM_MS));
}

// ── KISA KOD ──
// Karekodla AYNI gizli anahtardan türer ama ayrı bir gövde imzalanır
// ('.kisa'): iki kod birbirinden hesaplanamasın. Kısa kodu gören biri
// karekodun imzasını üretemez.

/** Kısa kodun imzaladığı gövde. */
export function kisaGovde(oturumId, dilim) {
  return imzaGovdesi(oturumId, dilim) + '.kisa';
}

/** Bir zaman dilimi için altı haneli kod. */
export function kisaKod(sirr, oturumId, dilim) {
  const imza = hmacHex(metin(sirr), kisaGovde(oturumId, dilim));
  // İlk 52 bit güvenle sayıya çevrilir; 10^6'ya indirgenir.
  const sayi = parseInt(imza.slice(0, 13), 16) % Math.pow(10, KISA_KOD_UZUNLUGU);
  return String(sayi).padStart(KISA_KOD_UZUNLUGU, '0');
}

/** Şu anki kısa kod — akademisyenin ekranı bunu yazar. */
export function anlikKisaKod(sirr, oturumId, zaman) {
  return kisaKod(sirr, oturumId, zamanDilimi(zaman, KISA_ADIM_MS));
}

/** Ekranda okunaklı biçim: "481 902". */
export function kisaKodBicimle(kod) {
  const k = metin(kod);
  return k.length === 6 ? k.slice(0, 3) + ' ' + k.slice(3) : k;
}

/**
 * Öğrencinin yazdığını temizler: boşluk, tire ve nokta atılır.
 * Altı haneli sayı değilse '' döner (yani bu bir kısa kod değildir).
 */
export function kisaKodNormalle(ham) {
  const sade = metin(ham).replace(/[\s.\-_]/g, '');
  return new RegExp('^\\d{' + KISA_KOD_UZUNLUGU + '}$').test(sade) ? sade : '';
}

/**
 * Kısa kodu doğrular. Karekoddan farkı: kod oturumu SÖYLEMEZ, bu yüzden
 * çağıran hangi oturuma bakılacağını verir (sunucu, öğrencinin dersleri
 * arasında açık olan oturumları sırayla dener).
 *
 * Komşu dilim de denenir: kod tam değişirken yazan öğrenci reddedilmesin.
 */
export function kisaKodDogrula(ham, secenekler) {
  const s = secenekler || {};
  const kod = kisaKodNormalle(ham);
  if (!kod) return { gecerli: false, sebep: 'bicim' };
  const simdi = Number.isFinite(Number(s.simdi)) ? Number(s.simdi) : Date.now();
  const adim = Number(s.adim) > 0 ? Number(s.adim) : KISA_ADIM_MS;
  const tolerans = Number(s.tolerans) >= 0 ? Number(s.tolerans) : KISA_TOLERANS_MS;
  // ⚠ DENENECEK DİLİMLERİ TOLERANS BELİRLER, SABİT BİR SAYI DEĞİL.
  // "şimdiki ve bir öncekine bak" demek, pencerenin dilim sınırına göre
  // kayması demekti: kodu dilimin sonunda görüp yazan öğrenci, süresi
  // dolmamışken reddedilebiliyordu.
  const enEski = zamanDilimi(simdi - tolerans + 1, adim);
  const enYeni = zamanDilimi(simdi, adim) + 1; // ekrana birazdan gelecek kod
  for (let dilim = enYeni; dilim >= enEski; dilim--) {
    const gecikme = simdi - dilim * adim;
    if (gecikme >= tolerans || gecikme <= -adim) continue;
    if (esitMi(kisaKod(s.sirr, s.oturumId, dilim), kod)) {
      return { gecerli: true, sebep: '', oturumId: metin(s.oturumId), dilim, gecikmeMs: gecikme };
    }
  }
  return { gecerli: false, sebep: 'kisa_kod' };
}

/**
 * Kodu parçalarına ayırır. Bozuk/eksik kodda null.
 * Karekod okuyucu başka bir karekodu (ör. kantindeki menü) okuyabilir;
 * biçimi tutmayan her şey burada elenir.
 */
export function kodCoz(ham) {
  const p = metin(ham).split('.');
  if (p.length !== 3) return null;
  const [oturumId, dilimMetni, imza] = p;
  if (!oturumId || !dilimMetni || !imza) return null;
  if (!/^\d+$/.test(dilimMetni)) return null;
  if (!/^[0-9a-f]+$/i.test(imza)) return null;
  return { oturumId, dilim: Number(dilimMetni), imza: imza.toLowerCase() };
}

/**
 * Kodu doğrular. Dönüş: { gecerli, sebep, oturumId, dilim, gecikmeMs }
 *
 * Sebepler ayrı ayrı döner çünkü öğrenciye ne yazacağımız buna bağlıdır:
 * "kod eskimiş, ekrana tekrar bakın" ile "bu kod bu derse ait değil" farklı
 * durumlardır ve aynı mesajla geçiştirilirse öğrenci ne yapacağını bilemez.
 */
export function kodDogrula(ham, secenekler) {
  const s = secenekler || {};
  const adim = Number(s.adim) > 0 ? Number(s.adim) : ADIM_MS;
  const tolerans = Number(s.tolerans) >= 0 ? Number(s.tolerans) : TOLERANS_MS;
  const simdi = Number.isFinite(Number(s.simdi)) ? Number(s.simdi) : Date.now();

  const c = kodCoz(ham);
  if (!c) return { gecerli: false, sebep: 'bicim' };
  if (s.oturumId && metin(s.oturumId) !== c.oturumId) {
    return { gecerli: false, sebep: 'baska_oturum', oturumId: c.oturumId };
  }

  // ── Önce zaman, sonra imza ──
  // Sırası önemli değil gibi görünür ama eskimiş kodun imzası da doğrudur;
  // "imza geçersiz" demek öğrenciyi yanlış yere bakmaya iter.
  const kodZamani = c.dilim * adim;
  const gecikme = simdi - kodZamani;
  if (Math.abs(gecikme) >= tolerans) {
    return { gecerli: false, sebep: gecikme > 0 ? 'eskimis' : 'gelecek', gecikmeMs: gecikme };
  }

  const beklenen = hmacHex(metin(s.sirr), imzaGovdesi(c.oturumId, c.dilim)).slice(0, IMZA_UZUNLUGU);
  if (!esitMi(beklenen, c.imza)) return { gecerli: false, sebep: 'imza' };

  return { gecerli: true, sebep: '', oturumId: c.oturumId, dilim: c.dilim, gecikmeMs: gecikme };
}

/** Doğrulama sebebinin öğrenciye gösterilecek karşılığı. */
export function dogrulamaMesaji(sebep) {
  switch (sebep) {
    case 'bicim':
      return 'Okutulan kod bu sisteme ait değil. Ekrandaki karekodu okutun.';
    case 'baska_oturum':
      return 'Bu kod başka bir dersin yoklamasına ait.';
    case 'eskimis':
      return 'Kodun süresi doldu. Ekrandaki YENİ karekodu okutun.';
    case 'gelecek':
      return 'Telefonunuzun saati geride. Saati otomatiğe alıp tekrar deneyin.';
    case 'imza':
      return 'Kod doğrulanamadı. Ekrandaki karekodu yeniden okutun.';
    case 'kapali':
      return 'Bu yoklama kapatıldı.';
    case 'kisa_kod':
      return 'Girdiğiniz kod ekrandaki kodla uyuşmuyor ya da süresi doldu. Ekrandaki YENİ kodu yazın.';
    case 'kisa_ders_yok':
      return 'Elle kod girebilmek için ders seçiminizin kayıtlı olması gerekir. Karekodu okutun ya da akademisyeninize başvurun.';
    case 'kayitli_degil':
      return 'Bu dersin listesinde kaydınız görünmüyor. Akademisyeninize başvurun.';
    case 'zaten':
      return 'Yoklamanız zaten alınmış.';
    default:
      return 'Yoklama alınamadı.';
  }
}

/** Kod ekranda kaç saniye daha durur (geri sayım çubuğu için 0–1 oranı). */
export function kalanOran(zaman, adim) {
  const a = Number(adim) > 0 ? Number(adim) : ADIM_MS;
  const t = Number(zaman);
  const gecen = (Number.isFinite(t) ? t : 0) % a;
  return Math.max(0, Math.min(1, 1 - gecen / a));
}

// ══════════════════════════════════════════════════════════════
// DEVAMSIZLIK
// ══════════════════════════════════════════════════════════════

/**
 * Bir öğrencinin bir dersteki devamsızlık durumu.
 *
 * `limitSaat` akademisyenin o ders için kendi belirlediği devamsızlık hakkıdır
 * (YÖK tavanı değil; her ders farklı olabilir). Hesap SAAT üzerindendir:
 * bir yoklama = dersin haftalık saati kadar saat.
 *
 * ⚠ HENÜZ YAPILMAMIŞ YOKLAMA DEVAMSIZLIK DEĞİLDİR. Dönemin başında
 * "12 saat devamsızlık" yazan bir çubuk öğrenciyi boş yere korkutur; hesap
 * yalnız AÇILMIŞ yoklamalar üzerinden yapılır.
 */
export function devamsizlikDurumu(girdi) {
  const g = girdi || {};
  const dersSaati = Number(g.dersSaati) > 0 ? Number(g.dersSaati) : 1;
  const acilan = Math.max(0, Number(g.acilanYoklama) || 0);
  const katilan = Math.max(0, Math.min(acilan, Number(g.katildigi) || 0));
  const limitSaat = Math.max(0, Number(g.limitSaat) || 0);

  const kacirilan = acilan - katilan;
  const kacirilanSaat = kacirilan * dersSaati;
  const katilanSaat = katilan * dersSaati;
  const kalanHak = Math.max(0, limitSaat - kacirilanSaat);
  const asildi = limitSaat > 0 && kacirilanSaat > limitSaat;
  // "Riskli": hakkın dörtte birinden azı kaldı ama henüz aşılmadı.
  const riskli = !asildi && limitSaat > 0 && kalanHak <= limitSaat / 4;

  return {
    acilan,
    katilan,
    kacirilan,
    dersSaati,
    katilanSaat,
    kacirilanSaat,
    limitSaat,
    kalanHak,
    asildi,
    riskli,
    durum: asildi ? 'kaldi' : riskli ? 'riskli' : 'guvenli',
    oran: limitSaat > 0 ? Math.min(1, kacirilanSaat / limitSaat) : 0,
  };
}

/** Devamsızlık çubuğunun rengi. */
export function devamsizlikRengi(durum) {
  if (durum === 'kaldi') return '#DC2626';
  if (durum === 'riskli') return '#D97706';
  return '#059669';
}

// ══════════════════════════════════════════════════════════════
// DEVAMSIZLIK SINIRI: SAAT Mİ, HAFTA MI?
//
// Yönetmelik saat üzerinden konuşur ("toplam ders saatinin %30'u"), ama
// akademisyenlerin çoğu HAFTA sayar: "üç hafta gelmeyen kalır". Sınırı
// saate çevirmeyi hocaya bırakmak (3 hafta × 2 saat = 6) küçük ama gerçek
// bir hata kaynağıydı: iki saatlik derse "3" yazan hoca üç HAFTA sandığı
// hakkı üç SAATE indirmiş oluyordu.
//
// Artık sınır DEĞER + BİRİM olarak saklanır; hesap tek yerde saate çevirir.
// Haftalık ders saati zaten biliniyor (yoklama oturumu onu kullanıyor).
// ══════════════════════════════════════════════════════════════

/** Sınırın birimleri. */
export const LIMIT_BIRIMLERI = [
  { id: 'saat', ad: 'saat', tekil: 'saat' },
  { id: 'hafta', ad: 'hafta', tekil: 'hafta' },
];

/** Birim adı geçerli mi — tanınmayan her şey 'saat' sayılır (eski kayıtlar). */
export function limitBirimi(ham) {
  return metin(ham) === 'hafta' ? 'hafta' : 'saat';
}

/**
 * Sınırı SAATE çevirir — hesap her zaman saat üzerindendir.
 * @param {number|string} deger  hocanın yazdığı sayı
 * @param {string} birim         'saat' | 'hafta'
 * @param {number} dersSaati     haftalık ders saati
 */
export function limitSaate(deger, birim, dersSaati) {
  const d = Math.max(0, Number(deger) || 0);
  if (!d) return 0;
  const saat = Number(dersSaati) > 0 ? Number(dersSaati) : 1;
  return limitBirimi(birim) === 'hafta' ? d * saat : d;
}

/** Saat cinsinden bir değeri, hocanın seçtiği birimde yazar: 6 → "3 hafta". */
export function birimdeDeger(saatDegeri, birim, dersSaati) {
  const v = Math.max(0, Number(saatDegeri) || 0);
  if (limitBirimi(birim) !== 'hafta') return v;
  const saat = Number(dersSaati) > 0 ? Number(dersSaati) : 1;
  const hafta = v / saat;
  // Yarım hafta çıkabiliyor (blok derste tek saat kaçırmak): 1.5 yazılır,
  // tam sayıysa ondalık gösterilmez.
  return Math.round(hafta * 10) / 10;
}

/** "3 / 4 hafta" ya da "6 / 8 saat" — ekranlar aynı cümleyi kursun. */
export function hakMetni(d, birim, dersSaati) {
  const x = d || {};
  const b = limitBirimi(birim);
  const ad = b === 'hafta' ? 'hafta' : 'saat';
  if (!x.limitSaat) return birimdeDeger(x.kacirilanSaat, b, dersSaati) + ' ' + ad + ' devamsızlık';
  return (
    birimdeDeger(x.kacirilanSaat, b, dersSaati) +
    ' / ' +
    birimdeDeger(x.limitSaat, b, dersSaati) +
    ' ' +
    ad
  );
}

/** Öğrenciye tek cümlelik özet. */
export function devamsizlikMetni(d) {
  const x = d || {};
  if (!x.acilan) return 'Bu derste henüz yoklama alınmadı.';
  if (!x.limitSaat) return x.kacirilanSaat + ' saat devamsızlık (sınır belirlenmemiş).';
  if (x.asildi) {
    return (
      'Devamsızlık sınırı aşıldı: ' +
      x.kacirilanSaat +
      ' / ' +
      x.limitSaat +
      ' saat. ' +
      'Devamsızlıktan kalma durumundasınız.'
    );
  }
  return 'Kalan hak: ' + x.kalanHak + ' / ' + x.limitSaat + ' saat.';
}

// ══════════════════════════════════════════════════════════════
// YOKLAMA LİSTESİ (akademisyen ekranı)
// ══════════════════════════════════════════════════════════════

/**
 * Sınıf listesi + o oturumda kod okutanlar → işaretli liste.
 *
 * Akademisyen kimin okuttuğunu canlı görür; okutmayanlar oturum kapanırken
 * "Yok" sayılır. Elle düzeltme (`elleDurumlar`) her zaman üstündür: sistem
 * öğrenciyi yok saysa bile hoca "Var" diyebilir — telefonu bozuk öğrenci
 * yüzünden yoklama tutulamaz olmamalı.
 */
export function yoklamaSatirlari(ogrenciler, katilimlar, elleDurumlar) {
  const katilim = new Map();
  (Array.isArray(katilimlar) ? katilimlar : []).forEach((k) => {
    const no = metin(k && (k.studentNumber || k.ogrenciNo || k.no));
    if (no) katilim.set(no, k);
  });
  const elle = elleDurumlar || {};

  return (Array.isArray(ogrenciler) ? ogrenciler : []).map((o) => {
    const no = metin(o && (o.studentNumber || o.ogrenciNo || o.no));
    const k = katilim.get(no) || null;
    const elleDurum = metin(elle[no]);
    const durum = elleDurum || (k ? 'var' : 'yok');
    return {
      ogrenciNo: no,
      ad: metin(o && (o.adSoyad || [o.firstName, o.lastName].filter(Boolean).join(' '))) || no,
      durum,
      elle: !!elleDurum,
      okuttu: !!k,
      // Yoklama kayıtlı olmayan bir cihazdan verildiyse akademisyen bunu
      // listede görmeli (bkz. lib/cihaz-kimlik.js).
      yeniCihaz: !!(k && k.yeniCihaz),
      zaman: k ? k.zaman || k.createdAt || '' : '',
    };
  });
}

/** Liste özeti — başlıktaki sayaçlar. */
export function yoklamaOzeti(satirlar) {
  const s = Array.isArray(satirlar) ? satirlar : [];
  const say = (d) => s.filter((x) => x.durum === d).length;
  const varSayisi = say('var');
  return {
    toplam: s.length,
    var: varSayisi,
    yok: say('yok'),
    izinli: say('izinli'),
    oran: s.length ? varSayisi / s.length : 0,
  };
}

/** Listeyi ada göre Türkçe sıralar; yok olanlar üste alınabilir. */
export function satirlariSirala(satirlar, yokUste) {
  const s = (Array.isArray(satirlar) ? satirlar : []).slice();
  s.sort((a, b) => {
    if (yokUste) {
      const ay = a.durum === 'yok' ? 0 : 1;
      const by = b.durum === 'yok' ? 0 : 1;
      if (ay !== by) return ay - by;
    }
    return String(a.ad).localeCompare(String(b.ad), 'tr');
  });
  return s;
}

/** Oturum kapanırken yazılacak kayıtlar. */
export function oturumKayitlari(oturum, satirlar) {
  const o = oturum || {};
  return (Array.isArray(satirlar) ? satirlar : []).map((s) => ({
    oturumId: metin(o.id),
    dersId: metin(o.dersId),
    dersAdi: metin(o.dersAdi),
    tarih: metin(o.tarih),
    dersSaati: Number(o.dersSaati) > 0 ? Number(o.dersSaati) : 1,
    studentNumber: s.ogrenciNo,
    durum: s.durum,
    elle: !!s.elle,
  }));
}
