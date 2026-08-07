// ══════════════════════════════════════════════════════════════
// MEZUNİYET DURUMU — hesap çekirdeği
//
//   Öğrencinin transkriptinden çıkarılan dersler ile bölümün müfredatı
//   (sinav_dersler) karşılaştırılır; kalan dersler ve mezuniyet koşulları
//   hesaplanır.
//
//   Hesap TEK yerde durur ve bilerek ayrı bir modüldür: öğrenci ekranı da,
//   ileride eklenecek personel görünümü de aynı fonksiyonu çağırır — iki
//   ekran farklı sonuç söyleyemez — ve saf olduğu için test edilebilir.
//
//   ⚠ Bu bir BİLGİLENDİRMEDİR. Resmî kayıt öğrenci bilgi sistemidir (OBS);
//   burada üretilen sayı mezuniyet kararı yerine geçmez. Ekranlarda bu
//   uyarı görünür durumda tutulmalıdır.
// ══════════════════════════════════════════════════════════════

// ── Öğretim modeli: yarıyıl sayısı + işyeri eğitimi yarıyılı ──
//
// Model bilerek SAYIYLA tanımlanıyor, sabit bir listeyle değil. "normal / 7+1"
// ikilisi yalnız 4 yıllık lisansı anlatabiliyordu; MYO'nun 3+1'i, 5 ve 6 yıllık
// programlar ya da iki yarıyıl işyeri eğitimi veren bir müfredat bu ikiliye
// sığmıyordu. İki sayı — toplam yarıyıl ve bunun kaçının işyeri eğitimi olduğu
// — bugünkü ve yarınki bütün kombinasyonları karşılıyor: 3+1, 4+0, 7+1, 8+0,
// 10+0, 12+0, 6+2 … Etiket bu iki sayıdan TÜRETİLİYOR, ayrıca saklanmıyor ki
// etiketle gerçek ayarın çelişmesi mümkün olmasın.
// ── NOT ÖLÇEĞİ: yüzlük puan → harf notu → katsayı ──
//
// Bu, kurumun DERS GEÇME ÖLÇEĞİDİR ve bölüm yetkilisi tarafından Mezuniyet
// Kuralları'ndan düzenlenir. Buradaki liste yalnız İLK AÇILIŞ TOHUMUDUR;
// kullanılan değer daima veritabanındaki kayıttan gelir. Yönetmelik değişince
// koda dokunmak gerekmesin diye böyle.
//
// Aynı ölçek iki yerde birden kullanılıyor ve bu kasıtlı:
//   • Mezuniyet hesabı — hangi harf geçer, hangi katsayı.
//   • Yaz intibakı — karşı kurumdan alınan YÜZLÜK puan bu ölçekle harfe
//     çevrilir. Karşı kurumun kendi harfi kullanılmaz (bkz. ders-muafiyet).
export const NOT_OLCEGI_VARSAYILAN = [
  { min: 90, max: 100, harf: 'A', katsayi: 4.0, gecer: true },
  { min: 85, max: 89, harf: 'B1', katsayi: 3.5, gecer: true },
  { min: 80, max: 84, harf: 'B2', katsayi: 3.25, gecer: true },
  { min: 75, max: 79, harf: 'B3', katsayi: 3.0, gecer: true },
  { min: 70, max: 74, harf: 'C1', katsayi: 2.5, gecer: true },
  { min: 65, max: 69, harf: 'C2', katsayi: 2.25, gecer: true },
  { min: 60, max: 64, harf: 'C3', katsayi: 2.0, gecer: true },
  { min: 50, max: 59, harf: 'F1', katsayi: 1.5, gecer: false },
  { min: 0, max: 49, harf: 'F2', katsayi: 0.0, gecer: false },
];

// Puan aralığı OLMAYAN harfler: devamsızlık, sınava girmeme, muafiyet gibi
// durumlar. `sayilanHarf` doluysa ortalama hesabında o harfin katsayısıyla
// işleme girer (ör. FF1/FF2/FF3 → F2).
export const EK_HARFLER_VARSAYILAN = [
  {
    harf: 'FF1',
    aciklama: 'Sınava girme hakkı olduğu hâlde girmedi, başarısız.',
    sayilanHarf: 'F2',
    gecer: false,
  },
  {
    harf: 'FF2',
    aciklama: 'Devamsızlık nedeniyle sınava girme hakkı yok, başarısız.',
    sayilanHarf: 'F2',
    gecer: false,
  },
  {
    harf: 'FF3',
    aciklama: 'Uygulama sınavından başarısız, sınava girme hakkı yok.',
    sayilanHarf: 'F2',
    gecer: false,
  },
  { harf: 'M', aciklama: 'Muaf.', sayilanHarf: '', gecer: true },
  { harf: 'G', aciklama: 'Geçer (notla ölçülmeyen ders).', sayilanHarf: '', gecer: true },
  { harf: 'K', aciklama: 'Kalır (notla ölçülmeyen ders).', sayilanHarf: '', gecer: false },
];

export const MEZUNIYET_VARSAYILAN = {
  toplamYariyil: 8,
  isyeriYariyilSayisi: 0,
  toplamAkts: 240,
  minAgno: 2.0,
  minSecmeliAkts: 0,
  // İşyeri eğitimi yarıyıl(lar)ının toplam AKTS'i.
  isyeriEgitimiAkts: 30,
  stajZorunlu: true,
  notOlcegi: NOT_OLCEGI_VARSAYILAN,
  ekHarfler: EK_HARFLER_VARSAYILAN,
  // Ölçekteki `gecer` bayrağından TÜRETİLEN listelere EKLENEN notlar.
  //
  // ⚠ Bu listeler boşaltılamaz: ikili harf ölçeğini (AA/BA/BB…) kullanan ve
  // henüz yeni ölçeği tanımlamamış bölümlerde, boşaltmak "hiçbir not geçmez"
  // demek olurdu — öğrencinin geçtiği bütün dersler sessizce belirsize düşerdi.
  // İki ölçek bir arada durabilir; bir ölçeğin harfleri diğerinin
  // transkriptinde zaten geçmez.
  gecerNotlar: ['AA', 'BA', 'BB', 'CB', 'CC', 'DC', 'DD', 'S', 'G', 'M', 'MU'],
  kalirNotlar: ['FF', 'FD', 'F', 'K', 'DZ', 'GR', 'D'],
  aciklama: '',
};

// Bölüm yetkilisine sunulan hazır kalıplar. Liste KISITLAMA DEĞİL kolaylıktır:
// hiçbirine uymayan bir program iki sayıyı elle girerek tanımlanabilir.
export const MEZUNIYET_KALIPLARI = [
  { id: 'myo-4-0', ad: 'MYO — 4+0', toplamYariyil: 4, isyeriYariyilSayisi: 0, toplamAkts: 120 },
  { id: 'myo-3-1', ad: 'MYO — 3+1', toplamYariyil: 4, isyeriYariyilSayisi: 1, toplamAkts: 120 },
  { id: 'lis-8-0', ad: 'Lisans — 8+0', toplamYariyil: 8, isyeriYariyilSayisi: 0, toplamAkts: 240 },
  { id: 'lis-7-1', ad: 'Lisans — 7+1', toplamYariyil: 8, isyeriYariyilSayisi: 1, toplamAkts: 240 },
  { id: 'lis-6-2', ad: 'Lisans — 6+2', toplamYariyil: 8, isyeriYariyilSayisi: 2, toplamAkts: 240 },
  { id: 'yil5', ad: '5 yıllık — 10+0', toplamYariyil: 10, isyeriYariyilSayisi: 0, toplamAkts: 300 },
  {
    id: 'yil5-1',
    ad: '5 yıllık — 9+1',
    toplamYariyil: 10,
    isyeriYariyilSayisi: 1,
    toplamAkts: 300,
  },
  { id: 'yil6', ad: '6 yıllık — 12+0', toplamYariyil: 12, isyeriYariyilSayisi: 0, toplamAkts: 360 },
];

const MEZ_MAX_YARIYIL = 16; // 8 yıl — hazırlık + uzun programlar için geniş üst sınır

function tamSayi(v, varsayilan) {
  const n = parseInt(String(v == null ? '' : v).trim(), 10);
  return Number.isFinite(n) ? n : varsayilan;
}

/**
 * Kural kaydını kullanılabilir hâle getirir: varsayılanlarla birleştirir,
 * ESKİ KAYITLARI ÇEVİRİR ve değerleri sınırlar içine çeker.
 *
 * Eski kayıtlar `mufredatTipi: 'normal' | '7+1'` taşıyor. Çevrilmeselerdi
 * 7+1 uygulayan bir bölüm, alan adı değiştiği gün sessizce 8+0'a dönerdi ve
 * öğrencilere 8. yarıyıl dersleri "eksik" diye görünürdü.
 */
export function mezKuralNormalize(ham) {
  const k = Object.assign({}, MEZUNIYET_VARSAYILAN, ham || {});
  const eski = ham && ham.mufredatTipi;
  const yeniAlanVar = ham && ham.toplamYariyil != null;
  if (eski && !yeniAlanVar) {
    k.toplamYariyil = 8;
    k.isyeriYariyilSayisi = eski === '7+1' ? 1 : 0;
  }
  k.toplamYariyil = Math.max(1, Math.min(MEZ_MAX_YARIYIL, tamSayi(k.toplamYariyil, 8)));
  // İşyeri yarıyılı toplamı aşamaz — aşsaydı müfredatın tamamı "ders değil"
  // sayılıp kalan ders listesi boşalır, öğrenci mezun sanırdı.
  k.isyeriYariyilSayisi = Math.max(0, Math.min(k.toplamYariyil, tamSayi(k.isyeriYariyilSayisi, 0)));
  k.toplamAkts = Math.max(0, tamSayi(k.toplamAkts, 240));
  k.minSecmeliAkts = Math.max(0, tamSayi(k.minSecmeliAkts, 0));
  k.isyeriEgitimiAkts = Math.max(0, tamSayi(k.isyeriEgitimiAkts, 0));
  const agno = parseFloat(String(k.minAgno == null ? '' : k.minAgno).replace(',', '.'));
  k.minAgno = Number.isFinite(agno) ? agno : 2.0;

  // ── Not ölçeği ve geçer/kalır listelerinin TÜRETİLMESİ ──
  // Ölçek varsa geçer/kalır listeleri ondan çıkar. İki ayrı virgüllü liste
  // elle tutulunca ölçekle listeler birbirinden sapabiliyordu: ölçekte "geçer"
  // yazan bir harf listede unutulursa öğrencinin geçtiği ders sessizce
  // "belirsiz" sayılırdı.
  k.notOlcegi = Array.isArray(k.notOlcegi) ? k.notOlcegi : [];
  k.ekHarfler = Array.isArray(k.ekHarfler) ? k.ekHarfler : [];
  const olcekVar = k.notOlcegi.length > 0 || k.ekHarfler.length > 0;
  if (olcekVar) {
    const gecer = [];
    const kalir = [];
    k.notOlcegi.concat(k.ekHarfler).forEach((r) => {
      const h = String((r && r.harf) || '')
        .trim()
        .toLocaleUpperCase('tr-TR');
      if (!h) return;
      (r.gecer ? gecer : kalir).push(h);
    });
    // Ek liste (ör. S, MU ya da bölümün kendi yazdıkları) ölçeği TAMAMLAR.
    // `k` üzerinden okunuyor, `ham` üzerinden değil: kayıt bu alanları hiç
    // taşımıyorsa varsayılan liste devrede kalmalı — aksi hâlde ikili harf
    // ölçeğini kullanan bölümlerde hiçbir not geçmez olurdu.
    const elleGecer = Array.isArray(k.gecerNotlar) ? k.gecerNotlar : [];
    const elleKalir = Array.isArray(k.kalirNotlar) ? k.kalirNotlar : [];
    k.gecerNotlar = Array.from(new Set(gecer.concat(elleGecer.map((x) => String(x).trim()))));
    k.kalirNotlar = Array.from(new Set(kalir.concat(elleKalir.map((x) => String(x).trim()))));
  } else if ((k.gecerNotlar || []).length === 0 && (k.kalirNotlar || []).length === 0) {
    // Ölçek de liste de yoksa varsayılan ölçekten türet — kayıt boş diye
    // hiçbir not "geçti" sayılmasın.
    k.notOlcegi = NOT_OLCEGI_VARSAYILAN;
    k.ekHarfler = EK_HARFLER_VARSAYILAN;
    return mezKuralNormalize(Object.assign({}, ham || {}, k));
  }
  return k;
}

/**
 * Yüzlük puanı harf notuna çevirir (kurumun KENDİ ölçeğiyle).
 *
 * Yaz intibakının çekirdek kuralı budur: öğrencinin karşı kurumdan aldığı
 * yüzlük puan, ÇAKÜ'nün ölçeğiyle harfe çevrilir — karşı kurumun kendi harfi
 * kullanılmaz, çünkü iki kurumun harf ölçekleri aynı şeyi ifade etmez.
 *
 * Aralık dışında kalan puan için harf UYDURULMAZ; boş döner.
 */
export function mezPuandanHarf(puan, kural) {
  const k = mezKuralNormalize(kural);
  const n = parseFloat(String(puan == null ? '' : puan).replace(',', '.'));
  if (!Number.isFinite(n)) return { harf: '', katsayi: null, sebep: 'Puan okunamadı.' };
  const uyanlar = (k.notOlcegi || []).filter((r) => {
    const min = parseFloat(String(r.min).replace(',', '.'));
    const max = parseFloat(String(r.max).replace(',', '.'));
    return Number.isFinite(min) && Number.isFinite(max) && n >= min && n <= max;
  });
  if (uyanlar.length === 0) {
    return { harf: '', katsayi: null, sebep: '"' + puan + '" ölçekteki hiçbir aralığa girmiyor.' };
  }
  if (uyanlar.length > 1) {
    return { harf: '', katsayi: null, sebep: '"' + puan + '" ölçekte birden çok aralığa giriyor.' };
  }
  const r = uyanlar[0];
  const kat = parseFloat(String(r.katsayi).replace(',', '.'));
  return {
    harf: String(r.harf || '')
      .trim()
      .toLocaleUpperCase('tr-TR'),
    katsayi: Number.isFinite(kat) ? kat : null,
    gecer: !!r.gecer,
    sebep: '',
  };
}

/** Harf notunun katsayısı. Ek harflerde `sayilanHarf` üzerinden çözülür. */
export function mezHarfKatsayisi(harf, kural) {
  const k = mezKuralNormalize(kural);
  const h = String(harf || '')
    .trim()
    .toLocaleUpperCase('tr-TR');
  if (!h) return null;
  const olcek = (k.notOlcegi || []).find(
    (r) => String(r.harf || '').toLocaleUpperCase('tr-TR') === h
  );
  if (olcek) {
    const kat = parseFloat(String(olcek.katsayi).replace(',', '.'));
    return Number.isFinite(kat) ? kat : null;
  }
  const ek = (k.ekHarfler || []).find((r) => String(r.harf || '').toLocaleUpperCase('tr-TR') === h);
  // FF1/FF2/FF3 gibi harfler ortalamaya kendi başlarına girmez; işaret ettikleri
  // harfin katsayısıyla işleme alınır.
  if (ek && ek.sayilanHarf) return mezHarfKatsayisi(ek.sayilanHarf, k);
  return null;
}

/** Ölçeği kullanıma açmadan önce denetler (çakışan/boşluklu aralık, boş harf). */
export function mezOlcekDogrula(notOlcegi) {
  const sorunlar = [];
  const satirlar = Array.isArray(notOlcegi) ? notOlcegi : [];
  if (satirlar.length === 0) sorunlar.push('Not ölçeği boş.');
  const sayi = (v) => {
    const n = parseFloat(String(v == null ? '' : v).replace(',', '.'));
    return Number.isFinite(n) ? n : null;
  };
  satirlar.forEach((r, i) => {
    const no = 'Satır ' + (i + 1) + ': ';
    if (!String((r && r.harf) || '').trim()) sorunlar.push(no + 'harf boş.');
    const min = sayi(r.min);
    const max = sayi(r.max);
    if (min == null || max == null) sorunlar.push(no + 'puan aralığı eksik.');
    else if (min > max) sorunlar.push(no + 'alt sınır üst sınırdan büyük.');
    if (sayi(r.katsayi) == null) sorunlar.push(no + 'katsayı eksik.');
  });
  const araliklar = satirlar
    .map((r, i) => ({ i, min: sayi(r.min), max: sayi(r.max) }))
    .filter((a) => a.min != null && a.max != null)
    .sort((a, b) => a.min - b.min);
  for (let i = 1; i < araliklar.length; i += 1) {
    const o = araliklar[i - 1];
    const s = araliklar[i];
    if (s.min <= o.max) {
      sorunlar.push('Aralıklar çakışıyor: satır ' + (o.i + 1) + ' ile ' + (s.i + 1) + '.');
    } else if (s.min - o.max > 1) {
      sorunlar.push('Aralıklarda boşluk: ' + o.max + ' ile ' + s.min + ' arası tanımsız.');
    }
  }
  return { gecerli: sorunlar.length === 0, sorunlar };
}

// "7+1", "3+1", "12+0" — iki sayıdan türetilir, ayrıca saklanmaz.
export function mezModelEtiketi(kural) {
  const k = mezKuralNormalize(kural);
  return k.toplamYariyil - k.isyeriYariyilSayisi + '+' + k.isyeriYariyilSayisi;
}

/**
 * Bir müfredat dersinin kaçıncı yarıyılda olduğunu verir (1'den başlar).
 * Sınıf/dönem bilgisi eksikse null döner — tahmin edilmez.
 */
export function mezDersYariyili(ders) {
  const sinif = tamSayi(ders && ders.sinif, 0);
  if (sinif < 1) return null;
  const donem = String((ders && ders.donem) || '').toLocaleLowerCase('tr-TR');
  if (!donem) return null;
  const bahar = donem.indexOf('bahar') >= 0 || donem.indexOf('spring') >= 0;
  return (sinif - 1) * 2 + (bahar ? 2 : 1);
}

/**
 * Ders, işyeri eğitimi yarıyılına mı düşüyor?
 *
 * İşyeri eğitimi yarıyılları programın SONUNDAKİ yarıyıllardır: 7+1'de 8.,
 * 3+1'de 4., 6+2'de 7. ve 8. Yarıyılı çözülemeyen ders (sınıf/dönem boş)
 * DERS SAYILIR — belirsizliği "bu ders zaten yok" diye yorumlamak, eksik
 * dersi listeden düşürüp öğrenciyi yanıltırdı.
 */
export function mezIsyeriYariyilindaMi(ders, kural) {
  const k = mezKuralNormalize(kural);
  if (k.isyeriYariyilSayisi <= 0) return false;
  const y = mezDersYariyili(ders);
  if (y == null) return false;
  return y > k.toplamYariyil - k.isyeriYariyilSayisi;
}

// Ders kodu/adı eşleştirmesi için normalize. Türkçe harfler sadeleşir,
// boşluk ve noktalama düşer: "BLM 101" ↔ "blm101".
export function mezNorm(s) {
  return String(s == null ? '' : s)
    .replace(/İ/g, 'i')
    .replace(/I/g, 'ı')
    .toLocaleLowerCase('tr-TR')
    .replace(/ç/g, 'c')
    .replace(/ğ/g, 'g')
    .replace(/ı/g, 'i')
    .replace(/ö/g, 'o')
    .replace(/ş/g, 's')
    .replace(/ü/g, 'u')
    .replace(/[^a-z0-9]/g, '');
}

// Harf notundan durum. Listede olmayan not 'belirsiz' döner — sessizce
// "geçti" saymak, öğrenciye olmayan bir mezuniyet vaat etmek olurdu.
export function mezNotDurumu(not, kural) {
  // Varsayılanlarla BİRLEŞTİR: veritabanındaki kural kaydı kısmi olabilir
  // (bu alanlar eklenmeden önce kaydedilmiş olabilir). Birleştirmeseydik
  // liste boş kalır ve her not "belirsiz" görünürdü — yani hiçbir ders
  // geçilmiş sayılmazdı. Bölüm listeyi bilerek boşaltırsa o değer korunur.
  const k = mezKuralNormalize(kural);
  const n = String(not || '')
    .trim()
    .toLocaleUpperCase('tr-TR');
  if (!n) return 'belirsiz';
  const gecer = (k.gecerNotlar || []).map((x) => String(x).toLocaleUpperCase('tr-TR'));
  const kalir = (k.kalirNotlar || []).map((x) => String(x).toLocaleUpperCase('tr-TR'));
  if (gecer.includes(n)) return 'gecti';
  if (kalir.includes(n)) return 'kaldi';
  return 'belirsiz';
}

/**
 * Mezuniyet durumunu hesaplar.
 *
 * @param {Array}  mufredat  bölümün dersleri — [{code,name,akts,sinif,donem,statu}]
 * @param {Array}  alinan    transkriptten çıkarılan dersler — [{kod,ad,akts,not}]
 * @param {Object} kuralHam  mezuniyet_kurallari kaydı (kısmi olabilir)
 * @param {Object} ek        { agno, stajTamam }
 */
export function mezuniyetHesapla(mufredat, alinan, kuralHam, ek) {
  const kural = mezKuralNormalize(kuralHam);
  const bilgi = ek || {};
  const isyeriVar = kural.isyeriYariyilSayisi > 0;

  // İşyeri eğitimi yarıyıllarında ders yoktur; o yarıyıllara düşen müfredat
  // derslerini "kalan ders" diye göstermek yanlış olurdu.
  const dersler = (mufredat || []).filter((c) => !mezIsyeriYariyilindaMi(c, kural));

  // Transkript derslerini önce KODA, kod tutmazsa ADA göre müfredatla eşle.
  const koda = new Map();
  const ada = new Map();
  dersler.forEach((c) => {
    const k = mezNorm(c.code);
    const a = mezNorm(c.name);
    if (k && !koda.has(k)) koda.set(k, c);
    if (a && !ada.has(a)) ada.set(a, c);
  });
  const anahtarOf = (c) => mezNorm(c.code) || mezNorm(c.name);

  const eslesenler = new Map(); // müfredat dersi anahtarı → en iyi durum
  const kayitlar = [];
  (alinan || []).forEach((d) => {
    const durum = mezNotDurumu(d.not, kural);
    const m = koda.get(mezNorm(d.kod)) || ada.get(mezNorm(d.ad)) || null;
    // Aynı ders tekrar alınmışsa EN İYİ sonuç geçerlidir (bütünleme/tekrar).
    if (m) {
      const anahtar = anahtarOf(m);
      const onceki = eslesenler.get(anahtar);
      if (!onceki || (onceki !== 'gecti' && durum === 'gecti')) eslesenler.set(anahtar, durum);
    }
    kayitlar.push({
      kod: d.kod || '',
      ad: d.ad || '',
      akts: Number(d.akts) || 0,
      not: d.not || '',
      durum,
      mufredatta: !!m,
      statu: m ? m.statu || '' : '',
      sinif: m ? m.sinif : '',
    });
  });

  // AKTS toplanırken aynı ders iki kez sayılmamalı: tekrar edilen bir dersin
  // kredisi bir kez sayılır. Müfredat dışı dersler kendi kod/adıyla tekilleşir.
  const sayilan = new Set();
  let gecilenAkts = 0;
  let zorunluGecilenAkts = 0;
  let secmeliGecilenAkts = 0;
  kayitlar.forEach((r) => {
    if (r.durum !== 'gecti') return;
    const anahtar = mezNorm(r.kod) || mezNorm(r.ad);
    if (anahtar && sayilan.has(anahtar)) return;
    if (anahtar) sayilan.add(anahtar);
    gecilenAkts += r.akts;
    if (r.statu === 'Z') zorunluGecilenAkts += r.akts;
    else secmeliGecilenAkts += r.akts;
  });

  // Kalan zorunlu dersler: müfredattaki Z derslerinden geçilmemiş olanlar.
  const kalanZorunlu = dersler
    .filter((c) => (c.statu || '') === 'Z')
    .filter((c) => eslesenler.get(anahtarOf(c)) !== 'gecti')
    .map((c) => ({
      code: c.code || '',
      name: c.name || '',
      akts: Number(c.akts) || 0,
      sinif: c.sinif,
      donem: c.donem,
      durum: eslesenler.get(anahtarOf(c)) || 'alinmadi',
    }));

  const agnoSayi = parseFloat(String(bilgi.agno == null ? '' : bilgi.agno).replace(',', '.'));
  const agnoVar = !Number.isNaN(agnoSayi);

  const kosullar = [
    {
      id: 'akts',
      label: 'Toplam AKTS',
      hedef: kural.toplamAkts + ' AKTS',
      mevcut: gecilenAkts + ' AKTS',
      saglandi: gecilenAkts >= kural.toplamAkts,
    },
    {
      id: 'zorunlu',
      label: 'Zorunlu derslerin tamamı',
      hedef: 'eksiksiz',
      mevcut: kalanZorunlu.length === 0 ? 'tamam' : kalanZorunlu.length + ' ders eksik',
      // Müfredat sistemde tanımlı değilse "tüm zorunlular tamam" DENEMEZ —
      // boş müfredat, koşulun sağlandığı anlamına gelmez.
      saglandi: dersler.length === 0 ? null : kalanZorunlu.length === 0,
    },
    {
      id: 'agno',
      label: 'Asgari AGNO',
      hedef: Number(kural.minAgno).toFixed(2),
      mevcut: agnoVar ? agnoSayi.toFixed(2) : 'bilinmiyor',
      saglandi: agnoVar ? agnoSayi >= kural.minAgno : null,
    },
  ];
  if (kural.minSecmeliAkts > 0) {
    kosullar.push({
      id: 'secmeli',
      label: 'Asgari seçmeli AKTS',
      hedef: kural.minSecmeliAkts + ' AKTS',
      mevcut: secmeliGecilenAkts + ' AKTS',
      saglandi: secmeliGecilenAkts >= kural.minSecmeliAkts,
    });
  }
  if (isyeriVar) {
    const ilk = kural.toplamYariyil - kural.isyeriYariyilSayisi + 1;
    const yariyilMetni =
      kural.isyeriYariyilSayisi === 1
        ? ilk + '. yarıyıl'
        : ilk + '–' + kural.toplamYariyil + '. yarıyıllar';
    kosullar.push({
      id: 'isyeri',
      label: 'İşyeri Eğitimi (' + mezModelEtiketi(kural) + ', ' + yariyilMetni + ')',
      hedef: kural.isyeriEgitimiAkts + ' AKTS',
      mevcut: 'sistemde izlenmiyor',
      saglandi: null,
    });
  }
  if (kural.stajZorunlu) {
    kosullar.push({
      id: 'staj',
      label: 'Staj',
      hedef: 'tamamlanmış',
      mevcut:
        bilgi.stajTamam === true ? 'tamam' : bilgi.stajTamam === false ? 'eksik' : 'bilinmiyor',
      saglandi: bilgi.stajTamam === true ? true : bilgi.stajTamam === false ? false : null,
    });
  }

  return {
    kural,
    modelEtiketi: mezModelEtiketi(kural),
    kayitlar,
    kalanZorunlu,
    gecilenAkts,
    zorunluGecilenAkts,
    secmeliGecilenAkts,
    kalanAkts: Math.max(0, kural.toplamAkts - gecilenAkts),
    yuzde: kural.toplamAkts > 0 ? Math.min(100, (gecilenAkts / kural.toplamAkts) * 100) : 0,
    kosullar,
    // "Mezun olabilir" YALNIZ tüm koşullar kesin sağlandıysa. Bilinmeyen bir
    // koşul (null) olumlu sayılmaz.
    mezunOlabilir: kosullar.every((k) => k.saglandi === true),
    belirsizVar: kayitlar.some((r) => r.durum === 'belirsiz'),
    mufredatBos: dersler.length === 0,
  };
}
