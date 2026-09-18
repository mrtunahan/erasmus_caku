// ══════════════════════════════════════════════════════════════
// ÖĞRENCİNİN KENDİ BİLGİLERİ — BİR KEZ GİRİLİR, HER BELGEDE KULLANILIR
//
// ⚠ AYNI BİLGİ HER MODÜLDE YENİDEN SORULUYORDU: staj formunda T.C. kimlik,
// doğum yeri, nüfus cilt/aile sıra numarası; muafiyet dilekçesinde telefon,
// e-posta, adres; ÇAP dilekçesinde yine aynı üçü. Öğrenci her dilekçede
// baştan yazıyor, bir yerde yanlış yazınca belgeler birbirini tutmuyordu.
//
// Bilgiler artık TEK kayıtta (student_profiles/{öğrenciNo}) durur; Benim
// Sayfam'da girilir, belge üreten her modül oradan okur. Bu dosya o kaydın
// SÖZLÜĞÜDÜR: hangi alan var, hangi belge hangisini ister, hangi değer
// geçerli. Ekran yalnız çizer.
//
// ── NEDEN HEPSİ ZORUNLU DEĞİL ──
// Öğrencinin çoğu hiç staj yapmayacak; nüfus bilgilerini zorunlu kılmak
// herkesi ilgisiz bir formla karşılamak olurdu. Alanlar BELGEYE bağlıdır:
// "Staj belgeleri için 4 bilgi eksik" denir, dilekçeyi üretecek olan da
// eksiği önceden görür.
//
// ── KVKK ──
// T.C. kimlik ve nüfus bilgileri kimlik verisidir: yalnız belgeyi üretmek
// için istenir, öğrencinin kendi kaydında durur ve hangi belge için
// gerektiği alanın yanında yazar. Zorunlu tutulmaz.
// ══════════════════════════════════════════════════════════════

const metin = (v) => String(v == null ? '' : v).trim();

/** Bilgi kümeleri — ekranda bu sırayla, ayrı başlıklar altında çizilir. */
export const PROFIL_GRUPLARI = [
  {
    id: 'iletisim',
    ad: 'İletişim',
    aciklama: 'Dilekçelerin üstünde ve komisyon yazışmalarında kullanılır.',
  },
  {
    id: 'kimlik',
    ad: 'Kimlik',
    aciklama: 'Staj ve sigorta belgelerinde istenir; resmî belgeye aynen yazılır.',
  },
  {
    id: 'nufus',
    ad: 'Nüfus kayıt bilgileri',
    aciklama: 'Yalnız staj sigorta işlemleri için gerekir — nüfus cüzdanınızda yazar.',
  },
];

/** Bu bilgileri isteyen belgeler. */
export const PROFIL_BELGELERI = [
  { id: 'dilekce', ad: 'Dilekçeler (muafiyet · ÇAP · yatay geçiş)' },
  { id: 'staj', ad: 'Staj başvuru ve sigorta belgeleri' },
];

/**
 * Alan sözlüğü.
 *
 * `anahtar` student_profiles kaydındaki alan adıdır. İlk üçü ESKİ adlarını
 * korur (phone/email/address): kayıtlar zaten bu adlarla yazılmış, yeniden
 * adlandırmak eski profillerin sessizce boşalması demekti.
 */
export const PROFIL_ALANLARI = [
  {
    anahtar: 'phone',
    etiket: 'Telefon',
    grup: 'iletisim',
    tip: 'telefon',
    belgeler: ['dilekce', 'staj'],
    ipucu: 'Size ulaşılacak numara — 0555 000 00 00',
  },
  {
    anahtar: 'email',
    etiket: 'E-posta',
    grup: 'iletisim',
    tip: 'eposta',
    belgeler: ['dilekce', 'staj'],
    ipucu: 'Öğrenci e-postanız',
  },
  {
    anahtar: 'address',
    etiket: 'Adres',
    grup: 'iletisim',
    tip: 'uzunMetin',
    belgeler: ['dilekce'],
    ipucu: 'Dilekçelerde yazışma adresi olarak geçer',
  },
  {
    anahtar: 'tcKimlikNo',
    etiket: 'T.C. Kimlik No',
    grup: 'kimlik',
    tip: 'tc',
    belgeler: ['staj'],
    ipucu: '11 hane',
  },
  {
    anahtar: 'dogumTarihi',
    etiket: 'Doğum Tarihi',
    grup: 'kimlik',
    tip: 'tarih',
    belgeler: ['staj'],
  },
  { anahtar: 'dogumYeri', etiket: 'Doğum Yeri', grup: 'kimlik', tip: 'metin', belgeler: ['staj'] },
  { anahtar: 'babaAdi', etiket: 'Baba Adı', grup: 'kimlik', tip: 'metin', belgeler: ['staj'] },
  { anahtar: 'anaAdi', etiket: 'Ana Adı', grup: 'kimlik', tip: 'metin', belgeler: ['staj'] },
  {
    anahtar: 'nufusIl',
    etiket: 'Nüfusa Kayıtlı Olduğu İl',
    grup: 'nufus',
    tip: 'metin',
    belgeler: ['staj'],
  },
  { anahtar: 'nufusIlce', etiket: 'İlçe', grup: 'nufus', tip: 'metin', belgeler: ['staj'] },
  {
    anahtar: 'nufusMahalleKoy',
    etiket: 'Mahalle / Köy',
    grup: 'nufus',
    tip: 'metin',
    belgeler: ['staj'],
  },
  { anahtar: 'ciltNo', etiket: 'Cilt No', grup: 'nufus', tip: 'sayi', belgeler: ['staj'] },
  {
    anahtar: 'aileSiraNo',
    etiket: 'Aile Sıra No',
    grup: 'nufus',
    tip: 'sayi',
    belgeler: ['staj'],
  },
  { anahtar: 'siraNo', etiket: 'Sıra No', grup: 'nufus', tip: 'sayi', belgeler: ['staj'] },
  {
    anahtar: 'nufusCuzdanSeriNo',
    etiket: 'Nüfus Cüzdanı Seri No',
    grup: 'nufus',
    tip: 'metin',
    belgeler: ['staj'],
  },
];

/** Bir grubun alanları — ekranın çizim sırası. */
export function grubunAlanlari(grupId) {
  return PROFIL_ALANLARI.filter((a) => a.grup === grupId);
}

/** Alanı anahtarından bul. */
export function alanBul(anahtar) {
  return PROFIL_ALANLARI.find((a) => a.anahtar === anahtar) || null;
}

/**
 * T.C. kimlik numarası doğrulaması (ÖSYM/NVİ algoritması).
 * 11 hane · 0 ile başlayamaz · 10. ve 11. hane sağlama toplamıdır.
 * Boş değer GEÇERLİDİR: alan zorunlu değil, yalnız yazıldıysa doğru olmalı.
 */
export function tcGecerliMi(ham) {
  const s = metin(ham);
  if (!s) return true;
  if (!/^\d{11}$/.test(s) || s[0] === '0') return false;
  const d = s.split('').map(Number);
  const tek = d[0] + d[2] + d[4] + d[6] + d[8];
  const cift = d[1] + d[3] + d[5] + d[7];
  const onuncu = (((tek * 7 - cift) % 10) + 10) % 10;
  const onbirinci = d.slice(0, 10).reduce((a, b) => a + b, 0) % 10;
  return onuncu === d[9] && onbirinci === d[10];
}

/**
 * Bir alanın hatası — boş dize "sorun yok" demektir.
 * Hiçbir alan ZORUNLU değildir; denetim yalnız yazılan değere bakar.
 */
export function alanHatasi(alan, deger) {
  const a = typeof alan === 'string' ? alanBul(alan) : alan;
  const v = metin(deger);
  if (!a || !v) return '';
  if (a.tip === 'eposta' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) {
    return 'Geçerli bir e-posta adresi girin.';
  }
  if (a.tip === 'telefon') {
    if (!/^[\d\s+\-()]+$/.test(v)) return 'Telefon yalnız rakam ve + - ( ) içerebilir.';
    if (v.replace(/\D/g, '').length < 10) return 'Telefon en az 10 haneli olmalı.';
  }
  if (a.tip === 'tc' && !tcGecerliMi(v)) {
    return /^\d{11}$/.test(v)
      ? 'T.C. Kimlik No doğrulanamadı — haneleri kontrol edin.'
      : 'T.C. Kimlik No 11 haneli olmalı ve 0 ile başlayamaz.';
  }
  if (a.tip === 'tarih' && !/^\d{4}-\d{2}-\d{2}$/.test(v)) return 'Tarihi gg.aa.yyyy seçin.';
  if (a.tip === 'sayi' && !/^\d+$/.test(v)) return 'Yalnız rakam girin.';
  return '';
}

/** Yazım sırasında uygulanan süzgeç — alana girilemeyecek karakterler. */
export function alanSuzgeci(alan, ham) {
  const a = typeof alan === 'string' ? alanBul(alan) : alan;
  const v = String(ham == null ? '' : ham);
  if (!a) return v;
  if (a.tip === 'tc') return v.replace(/\D/g, '').slice(0, 11);
  if (a.tip === 'sayi') return v.replace(/\D/g, '').slice(0, 10);
  if (a.tip === 'telefon') return v.replace(/[^\d\s+\-()]/g, '').slice(0, 20);
  // Ad/soyad türü alanlarda rakam yazılmaz: "Doğum Yeri: 06 Ankara" belgeye
  // olduğu gibi geçiyordu.
  if (
    a.tip === 'metin' &&
    ['dogumYeri', 'babaAdi', 'anaAdi', 'nufusIl', 'nufusIlce', 'nufusMahalleKoy'].includes(
      a.anahtar
    )
  ) {
    return v.replace(/[0-9]/g, '');
  }
  return v;
}

/** Kaydedilmeden önce: her alan kırpılır, tanınmayan alanlar atılmaz. */
export function profilNormalle(ham) {
  const kaynak = ham || {};
  const cikti = {};
  PROFIL_ALANLARI.forEach((a) => {
    const v = metin(kaynak[a.anahtar]);
    if (v) cikti[a.anahtar] = v;
  });
  return cikti;
}

/** Tüm alanların hataları: {anahtar: hata}. Boşsa kaydedilebilir. */
export function profilHatalari(profil) {
  const p = profil || {};
  const hatalar = {};
  PROFIL_ALANLARI.forEach((a) => {
    const h = alanHatasi(a, p[a.anahtar]);
    if (h) hatalar[a.anahtar] = h;
  });
  return hatalar;
}

/** Bir belgenin istediği ama profilde olmayan alanlar. */
export function belgeEksikleri(profil, belgeId) {
  const p = profil || {};
  return PROFIL_ALANLARI.filter((a) => (a.belgeler || []).includes(belgeId)).filter(
    (a) => !metin(p[a.anahtar])
  );
}

/**
 * Profilin durumu — kart başlığındaki oran ve "hangi belge hazır" satırı.
 *
 * @returns {{gruplar:Array, belgeler:Array, dolu:number, toplam:number, oran:number}}
 */
export function profilDurumu(profil) {
  const p = profil || {};
  const gruplar = PROFIL_GRUPLARI.map((g) => {
    const alanlar = grubunAlanlari(g.id);
    const dolu = alanlar.filter((a) => metin(p[a.anahtar])).length;
    return {
      ...g,
      alanlar,
      dolu,
      toplam: alanlar.length,
      tamam: dolu === alanlar.length,
      eksikler: alanlar.filter((a) => !metin(p[a.anahtar])).map((a) => a.etiket),
    };
  });
  const belgeler = PROFIL_BELGELERI.map((b) => {
    const eksik = belgeEksikleri(p, b.id);
    return {
      ...b,
      eksik: eksik.length,
      eksikler: eksik.map((a) => a.etiket),
      hazir: eksik.length === 0,
    };
  });
  const dolu = PROFIL_ALANLARI.filter((a) => metin(p[a.anahtar])).length;
  return {
    gruplar,
    belgeler,
    dolu,
    toplam: PROFIL_ALANLARI.length,
    oran: PROFIL_ALANLARI.length ? dolu / PROFIL_ALANLARI.length : 0,
  };
}

/** Kart başlığındaki tek cümle. */
export function profilOzetMetni(durum) {
  const d = durum || {};
  const eksikBelge = (d.belgeler || []).filter((b) => !b.hazir);
  if (!d.dolu) return 'Henüz bilgi girmediniz — dilekçeleriniz eksik çıkar.';
  if (eksikBelge.length === 0) return 'Belgeleriniz için gereken bilgiler tamam.';
  return eksikBelge.map((b) => b.ad + ' için ' + b.eksik + ' bilgi eksik').join(' · ');
}

/**
 * Belge üretiminde kullanılan şablon değişkenleri.
 *
 * Adlar `ogrenci` önekiyle: şablonda "{{ogrenciTelefon}}" yazan alan bu
 * kayıttan dolar. Muafiyet dilekçesi bunların ilk üçünü zaten kullanıyordu;
 * kalanlar staj belgeleri ve kimlik isteyen dilekçeler için.
 */
export function profilBelgeDegerleri(profil) {
  const p = profil || {};
  const al = (k) => metin(p[k]);
  return {
    ogrenciTelefon: al('phone'),
    ogrenciEposta: al('email'),
    ogrenciAdres: al('address'),
    ogrenciTcKimlik: al('tcKimlikNo'),
    ogrenciDogumTarihi: tarihTr(al('dogumTarihi')),
    ogrenciDogumYeri: al('dogumYeri'),
    ogrenciBabaAdi: al('babaAdi'),
    ogrenciAnaAdi: al('anaAdi'),
    ogrenciNufusIl: al('nufusIl'),
    ogrenciNufusIlce: al('nufusIlce'),
  };
}

/** '2004-05-17' → '17.05.2004'; tanınmayan değer olduğu gibi döner. */
export function tarihTr(deger) {
  const s = metin(deger);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const [y, a, g] = s.split('-');
  return g + '.' + a + '.' + y;
}

/**
 * Staj gibi kendi formu olan modüllerin ön doldurması.
 * Formda DOLU olan alana dokunulmaz — öğrencinin o formda yazdığı değer
 * profildeki eski değerle ezilmemeli.
 */
export function formaUygula(form, profil, eslesme) {
  const f = { ...(form || {}) };
  const p = profil || {};
  const harita = eslesme || {};
  Object.keys(harita).forEach((formAlani) => {
    const profilAlani = harita[formAlani];
    if (metin(f[formAlani])) return;
    const v = metin(p[profilAlani]);
    if (v) f[formAlani] = v;
  });
  return f;
}
