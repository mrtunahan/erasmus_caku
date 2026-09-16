// ══════════════════════════════════════════════════════════════
// STAJ ETABINDA ACİL DURUM AÇILIŞI
//
// Staj etabına kayıt, etabın başlamasına 10 gün kala kapanır. Bu kural
// keyfî değil: kalan 10 gün komisyon onayı ve SGK bildirimi içindir, süreç o
// pencerede yetişmek zorundadır. Kapanış bu yüzden KALKMIYOR.
//
// ⚠ AMA KAPININ HİÇ AÇILMAMASI DA BİR ARIZAYDI. Gerçek hayatta olan şeyler:
// öğrencinin işyeri son anda değişir, hastalık raporu gelir, kabul yazısı
// geç ulaşır, bir kayıt sistem hatasıyla düşer. Bugün bu durumda yapılacak
// hiçbir şey yok: etap öğrencinin listesinden kayboluyor, form da
// "başvuru dönemi kapanmıştır" deyip duruyor. Yetkili, tarihi elle geri
// alıp bütün etabı herkese açmak zorunda kalıyordu — yani bir kişi için
// kuralı herkeste deliyordu.
//
// Bu dosya üçüncü bir yol tanımlar: SÜRESİ DOLMUŞ ETABI, YETKİLİNİN
// GEREKÇESİYLE ve BELİRLİ KİŞİLER İÇİN yeniden açmak.
//
// ── AÇILIŞ BİR İMZADIR ──
// Kayıt bir istisnadır; istisnanın sahibi olmalı. Bu yüzden her açılış:
//   • GEREKÇE ister (boş geçilemez),
//   • kimin açtığını ve ne zaman açtığını yazar,
//   • varsayılan olarak SEÇİLİ ÖĞRENCİLERE açılır — "herkese" ayrı ve
//     bilinçli bir seçimdir,
//   • bir BİTİŞ tarihi taşır; süresiz açık kalan kapı, kapanmamış kapıdır,
//   • geri alınabilir (iptal), ama kaydı silinmez — iz kalır.
//
// ── AÇILIŞ TARİHİ DEĞİŞTİRMEZ ──
// Etabın kendi `baslangic`/`bitis` tarihlerine dokunulmaz. Komisyon ve SGK
// pencereleri aynı yerde durur; açılış yalnızca KAYIT kapısını, adı geçen
// kişiler için ve belirtilen süreyle aralar. Böylece "bir öğrenci için
// tarihi geri aldım, sonra düzeltmeyi unuttum" hatası olamaz.
// ══════════════════════════════════════════════════════════════

const metin = (v) => String(v == null ? '' : v).trim();

/** Kayıt kapanışı: etap başlangıcından kaç gün önce? */
export const KAYIT_KAPANIS_GUNU = 10;

/** 'yyyy-mm-dd' → gün başlangıcı (yerel). Çözülemezse null. */
function gun(t) {
  const s = metin(t);
  if (!s) return null;
  const d = new Date(s.length === 10 ? s + 'T00:00:00' : s);
  return isNaN(d.getTime()) ? null : d;
}

/** Tarihe gün ekle/çıkar → 'yyyy-mm-dd'. */
export function gunEkle(tarih, adet) {
  const d = gun(tarih);
  if (!d) return '';
  d.setDate(d.getDate() + Number(adet || 0));
  const p = (n) => String(n).padStart(2, '0');
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
}

/** Etabın kayıt son tarihi (başlangıç − 10 gün). Tarihsiz etapta ''. */
export function kayitSonTarihi(etap, kapanisGunu) {
  const e = etap || {};
  if (!metin(e.baslangic)) return '';
  const k = Number.isFinite(kapanisGunu) ? kapanisGunu : KAYIT_KAPANIS_GUNU;
  return gunEkle(e.baslangic, -k);
}

/** Öğrenci numarasını karşılaştırma anahtarına çevirir (boşluk/harf toleranslı). */
export function numaraAnahtari(no) {
  return metin(no).replace(/\s+/g, '').toLocaleUpperCase('tr');
}

/**
 * Yapıştırılan metinden öğrenci numaraları.
 * Virgül, noktalı virgül, satır sonu ve boşlukla ayrılmış listeleri çözer;
 * yinelenenleri düşürür. Yetkili Excel'den kopyalayıp yapıştırabilsin diye.
 */
export function numaralariCoz(ham) {
  const parcalar = metin(ham)
    .split(/[\s,;]+/)
    .map(numaraAnahtari)
    .filter(Boolean);
  const gorulen = new Set();
  const out = [];
  parcalar.forEach((n) => {
    if (gorulen.has(n)) return;
    gorulen.add(n);
    out.push(n);
  });
  return out;
}

// ══════════════════════════════════════════════════════════════
// AÇILIŞ KAYDI
// ══════════════════════════════════════════════════════════════

/**
 * Açılış formunun hataları. Kayıttan önce çağrılır.
 *
 * ⚠ Gerekçe ZORUNLU. Gerekçesiz bir istisna, altı ay sonra "bu neden
 * açılmış?" diye bakan kişiye hiçbir şey söylemez; denetimde de savunulamaz.
 */
export function acilisHatalari(form, secenekler) {
  const f = form || {};
  const s = secenekler || {};
  const bugun = metin(s.simdi) ? metin(s.simdi).slice(0, 10) : yerelBugun();
  const hatalar = [];
  if (!metin(f.periodId)) hatalar.push('Etap seçilmedi.');
  if (metin(f.gerekce).length < 10) {
    hatalar.push('Gerekçe yazın (en az 10 karakter) — açılış kayda geçer ve denetlenir.');
  }
  const kapsam = metin(f.kapsam) || 'ogrenci';
  if (kapsam === 'ogrenci' && numaralariCoz(f.ogrenciNolar).length === 0) {
    hatalar.push('En az bir öğrenci numarası girin ya da kapsamı "herkes" seçin.');
  }
  const bitis = metin(f.bitis);
  if (!bitis) hatalar.push('Açılışın bitiş tarihi zorunludur — süresiz kapı kapanmamış kapıdır.');
  else if (bitis < bugun) hatalar.push('Bitiş tarihi geçmişte olamaz.');
  return hatalar;
}

/** Bugünün yerel tarihi 'yyyy-mm-dd'. */
function yerelBugun() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
}

/**
 * Kaydedilecek açılış kaydını kurar. Hatalıysa null döner (çağıran
 * `acilisHatalari` ile zaten uyarmış olmalı).
 */
export function acilisKaydi(form, secenekler) {
  if (acilisHatalari(form, secenekler).length > 0) return null;
  const f = form || {};
  const s = secenekler || {};
  const kapsam = metin(f.kapsam) || 'ogrenci';
  return {
    periodId: metin(f.periodId),
    periodLabel: metin(f.periodLabel),
    departmentId: metin(f.departmentId),
    kapsam, // 'ogrenci' | 'herkes'
    ogrenciNolar: kapsam === 'herkes' ? [] : numaralariCoz(f.ogrenciNolar),
    gerekce: metin(f.gerekce),
    bitis: metin(f.bitis),
    iptal: false,
    acanAd: metin(s.acanAd),
    acanRol: metin(s.acanRol),
    createdAt: metin(s.simdi) || new Date().toISOString(),
  };
}

/** Açılış bu öğrenciyi kapsıyor mu? ('herkes' kapsamı numarayı sormaz.) */
export function acilisKapsamda(acilis, ogrenciNo) {
  const a = acilis || {};
  if (metin(a.kapsam) === 'herkes') return true;
  const liste = Array.isArray(a.ogrenciNolar) ? a.ogrenciNolar.map(numaraAnahtari) : [];
  const no = numaraAnahtari(ogrenciNo);
  return !!no && liste.includes(no);
}

/**
 * Açılış hâlâ yürürlükte mi? İptal edilmişse ya da bitiş tarihi geçmişse
 * değildir. Bitiş GÜNÜ dahildir (o gün 23:59'a kadar açık).
 */
export function acilisYururlukteMi(acilis, secenekler) {
  const a = acilis || {};
  if (!a.periodId) return false;
  if (a.iptal === true) return false;
  const bugun = metin((secenekler || {}).simdi).slice(0, 10) || yerelBugun();
  const bitis = metin(a.bitis);
  if (!bitis) return false; // bitişsiz kayıt geçersiz sayılır
  return bugun <= bitis;
}

/**
 * Bu etap + bu öğrenci için yürürlükteki açılış. Birden çoksa en geç biteni
 * (öğrenciye en uzun süre tanıyan) seçilir.
 */
export function etkinAcilis(acilislar, periodId, ogrenciNo, secenekler) {
  const pid = metin(periodId);
  if (!pid) return null;
  const uygun = (acilislar || []).filter(
    (a) =>
      a &&
      metin(a.periodId) === pid &&
      acilisYururlukteMi(a, secenekler) &&
      acilisKapsamda(a, ogrenciNo)
  );
  if (uygun.length === 0) return null;
  return uygun.slice().sort((a, b) => metin(b.bitis).localeCompare(metin(a.bitis)))[0];
}

// ══════════════════════════════════════════════════════════════
// KAYIT KAPISI
// ══════════════════════════════════════════════════════════════

/**
 * Bu etaba kayıt açık mı?
 *
 * @returns {{
 *   acik: boolean,
 *   sebep: 'tarihsiz'|'acik'|'acil-acilis'|'mevcut-basvuru'|'suresi-doldu',
 *   sonTarih: string,       // olağan kayıt son tarihi
 *   acilis: object|null     // kapı acil açılışla açıldıysa o kayıt
 * }}
 */
export function etapKayitDurumu(etap, secenekler) {
  const e = etap || {};
  const s = secenekler || {};
  const sonTarih = kayitSonTarihi(e, s.kapanisGunu);
  const temel = { sonTarih, acilis: null };

  // Öğrencinin ZATEN başvurduğu etap her zaman görünür kalır: başvurusunu
  // düzenleyebilmeli, belgesini görebilmeli.
  if (metin(s.mevcutBasvuruEtapId) && metin(s.mevcutBasvuruEtapId) === metin(e.id)) {
    return { ...temel, acik: true, sebep: 'mevcut-basvuru' };
  }

  // Tarihsiz etapta kapanış hesaplanamaz — kapı açık sayılır (eski kayıtlar).
  if (!sonTarih) return { ...temel, acik: true, sebep: 'tarihsiz' };

  const bugun = metin(s.simdi).slice(0, 10) || yerelBugun();
  if (bugun < sonTarih) return { ...temel, acik: true, sebep: 'acik' };

  // Süre dolmuş. Tek çıkış: yetkilinin gerekçeli acil durum açılışı.
  const acilis = etkinAcilis(s.acilislar, e.id, s.ogrenciNo, s);
  if (acilis) return { ...temel, acik: true, sebep: 'acil-acilis', acilis };

  return { ...temel, acik: false, sebep: 'suresi-doldu' };
}

/** Öğrenci bu etaba YENİ başvuru yapabilir mi? (kapı + mükerrer denetimi) */
export function etabaBasvurabilirMi(etap, secenekler) {
  const s = secenekler || {};
  const durum = etapKayitDurumu(etap, s);
  // Aynı etaba ikinci başvuru yapılmaz — mevcut başvuru düzenlenir.
  const zaten = (s.mevcutBasvurular || []).some(
    (a) => a && metin(a.stajEtapId) === metin((etap || {}).id)
  );
  if (zaten) return { olur: false, sebep: 'zaten-basvurdu', durum };
  if (!durum.acik) return { olur: false, sebep: durum.sebep, durum };
  return { olur: true, sebep: durum.sebep, durum };
}

/** Öğrenciye gösterilecek etap listesi (kapısı açık olanlar). */
export function acikEtaplar(etaplar, secenekler) {
  return (etaplar || []).filter((e) => etapKayitDurumu(e, secenekler).acik);
}

// ══════════════════════════════════════════════════════════════
// METİNLER
// ══════════════════════════════════════════════════════════════

/** Kapının neden kapalı/açık olduğunu anlatan cümle. */
export function kayitDurumMetni(durum) {
  const d = durum || {};
  if (d.sebep === 'acil-acilis') {
    const a = d.acilis || {};
    return (
      'Bu etabın kayıt süresi dolmuştu; ' +
      (a.acanAd ? a.acanAd + ' tarafından ' : '') +
      'acil durum kapsamında ' +
      (a.bitis ? a.bitis + ' tarihine kadar ' : '') +
      'açıldı.'
    );
  }
  if (d.sebep === 'suresi-doldu') {
    return (
      'Bu etabın kayıt süresi ' +
      (d.sonTarih || '—') +
      ' tarihinde doldu. Zorunlu bir durumunuz varsa bölümünüzün staj ' +
      'yetkilisiyle görüşün; yetkili gerekçesini yazarak etabı size açabilir.'
    );
  }
  if (d.sebep === 'mevcut-basvuru') return 'Bu etaba başvurunuz var.';
  if (d.sebep === 'acik') return 'Kayıt son tarihi: ' + (d.sonTarih || '—');
  return '';
}

/** Yetkili ekranında açılışın tek satırlık künyesi. */
export function acilisOzeti(acilis) {
  const a = acilis || {};
  const kim =
    metin(a.kapsam) === 'herkes'
      ? 'herkese'
      : (Array.isArray(a.ogrenciNolar) ? a.ogrenciNolar.length : 0) + ' öğrenciye';
  return (
    kim +
    ' · ' +
    (metin(a.bitis) ? a.bitis + ' tarihine kadar' : 'süresiz') +
    (metin(a.acanAd) ? ' · ' + a.acanAd : '')
  );
}

/**
 * Yetkilinin göreceği açılış listesi — yürürlükte olanlar önce, sonra
 * süresi dolmuş/iptal edilmiş olanlar (iz olarak durur).
 */
export function acilislariSirala(acilislar, secenekler) {
  return (acilislar || [])
    .filter(Boolean)
    .map((a) => ({ acilis: a, yururlukte: acilisYururlukteMi(a, secenekler) }))
    .sort((x, y) => {
      if (x.yururlukte !== y.yururlukte) return x.yururlukte ? -1 : 1;
      return metin(y.acilis.createdAt).localeCompare(metin(x.acilis.createdAt));
    });
}
