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
  // BŞ/BZ: staj ve notla ölçülmeyen derslerin "başarılı / başarısız" notu.
  gecerNotlar: ['AA', 'BA', 'BB', 'CB', 'CC', 'DC', 'DD', 'S', 'G', 'M', 'MU', 'BŞ'],
  kalirNotlar: ['FF', 'FD', 'F', 'K', 'DZ', 'GR', 'D', 'BZ'],
  aciklama: '',
  // ── DERS SATIRI KURALLARI (Mezuniyet modülü → başvuru formu) ──
  // Transkriptten forma aktarılan her ders bu kurallarla denetlenir; kurala
  // uymayan satır formda SARI zeminle görünür ve danışman onu görerek karar
  // verir. Satır silinmez, düzeltilmez: form transkriptin birebir kopyasıdır.
  satirKurallari: {
    kalanNot: true, // başarısız (kalır) not
    belirsizNot: true, // ölçekte tanınmayan not
    mufredatDisi: true, // bölüm müfredatında olmayan ders
    aktsFarki: true, // transkriptteki AKTS müfredattakinden farklı
    tekrar: true, // aynı ders transkriptte birden çok kez
    // Geçer sayılan ama işaretlenmesi istenen notlar (ör. koşullu geçer DD/DC).
    uyariNotlari: [],
  },
  // Danışmanın "eksik staj" olarak işaretleyebileceği stajlar (yalnız adlar;
  // stajDersleri'nden türetilir, eski kayıtlar için korunur).
  stajlar: ['Staj I (İşyeri Stajı)', 'Staj II (Mühendislik Stajı)'],
  // Staj transkriptte bir DERS olarak geçer (örn. BİL200). Kodu girilen
  // stajın tamamlanmış sayılması için notu `stajBasariNotu` olmalıdır.
  // Kodu boş staj transkriptten denetlenmez (danışman işaretler).
  stajDersleri: [
    { ad: 'Staj I (İşyeri Stajı)', kod: '' },
    { ad: 'Staj II (Mühendislik Stajı)', kod: '' },
  ],
  stajBasariNotu: 'BŞ',
};

/** Satır kurallarının adları — ekran ve dilekçe aynı metni kullanır. */
export const MEZ_SATIR_KURAL_ADLARI = {
  kalanNot: 'Başarısız not',
  belirsizNot: 'Tanınmayan not',
  mufredatDisi: 'Müfredat dışı ders',
  aktsFarki: 'AKTS müfredatla uyuşmuyor',
  tekrar: 'Ders birden çok kez alınmış',
  uyariNotlari: 'İşaretlenen not',
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

  // Satır kuralları: kısmi kayıt varsayılanla BİRLEŞİR (yeni bir kural
  // eklendiğinde eski kayıtlar onu kapalı saymasın).
  const sk = Object.assign(
    {},
    MEZUNIYET_VARSAYILAN.satirKurallari,
    ham && ham.satirKurallari && typeof ham.satirKurallari === 'object' ? ham.satirKurallari : {}
  );
  ['kalanNot', 'belirsizNot', 'mufredatDisi', 'aktsFarki', 'tekrar'].forEach((a) => {
    sk[a] = sk[a] !== false;
  });
  const uyari = Array.isArray(sk.uyariNotlari)
    ? sk.uyariNotlari
    : String(sk.uyariNotlari || '').split(/[,;\s]+/);
  sk.uyariNotlari = Array.from(
    new Set(
      uyari
        .map((x) =>
          String(x || '')
            .trim()
            .toLocaleUpperCase('tr-TR')
        )
        .filter(Boolean)
    )
  );
  k.satirKurallari = sk;
  // Stajlar: yapılandırılmış liste (ad + ders kodu) esastır. Yalnız ad
  // listesi taşıyan eski kayıtta kodsuz staj olarak çevrilir.
  const hamStaj =
    ham && Array.isArray(ham.stajDersleri)
      ? ham.stajDersleri
      : ham && ham.stajlar != null
        ? (Array.isArray(ham.stajlar)
            ? ham.stajlar
            : String(ham.stajlar || '').split(/[\n;]+/)
          ).map((x) => (x && typeof x === 'object' ? x : { ad: x, kod: '' }))
        : MEZUNIYET_VARSAYILAN.stajDersleri;
  const gorulen = new Set();
  k.stajDersleri = hamStaj
    .map((x) => ({
      ad: String((x && x.ad) || '').trim(),
      kod: String((x && x.kod) || '').trim(),
    }))
    .filter((x) => x.ad || x.kod)
    .map((x) => ({ ad: x.ad || x.kod, kod: x.kod }))
    .filter((x) => !gorulen.has(x.ad) && gorulen.add(x.ad));
  k.stajlar = k.stajDersleri.map((x) => x.ad);
  k.stajBasariNotu =
    String(k.stajBasariNotu == null ? 'BŞ' : k.stajBasariNotu)
      .trim()
      .toLocaleUpperCase('tr-TR') || 'BŞ';

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
  // Bölümde uygulanan müfredatlar (kalıp kimlikleri). Kayıtta yoksa bölümün
  // program yapısına uyan tek kalıp; o da yoksa boş (tek, isimsiz program).
  const gecerli = new Set(MEZUNIYET_KALIPLARI.map((x) => x.id));
  const liste = Array.isArray(k.programlar) ? k.programlar.map(String) : [];
  k.programlar = Array.from(new Set(liste.filter((x) => gecerli.has(x))));
  if (k.programlar.length === 0) {
    const kendi = MEZUNIYET_KALIPLARI.find(
      (x) => x.toplamYariyil === k.toplamYariyil && x.isyeriYariyilSayisi === k.isyeriYariyilSayisi
    );
    if (kendi) k.programlar = [kendi.id];
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

// ══════════════════════════════════════════════════════════════
// MÜFREDAT (PROGRAM) SEÇİMİ
//
// Bir bölümde birden çok müfredat birlikte yürüyebilir (8+0 ve 7+1 gibi).
// Ders yönetiminde her ders hangi müfredatlarda olduğuyla işaretlenir
// (`mufredatlar`, boşsa bütün müfredatlarda); öğrenci mezuniyet başvurusunda
// kendi müfredatını seçer. Hesap yalnız o müfredatın dersleriyle ve o
// müfredatın yarıyıl/işyeri/AKTS yapısıyla yapılır — 8+0 öğrencisi 7+1
// derslerini almadı diye eksik görünmez.
// ══════════════════════════════════════════════════════════════

/** Müfredat kimliğinin görünen adı ("Lisans — 7+1"). */
export function mezProgramAdi(id) {
  const x = MEZUNIYET_KALIPLARI.find((k) => k.id === id);
  return x ? x.ad : '';
}

/** Bölümün müfredat seçenekleri: [{id, ad}]. */
export function mezProgramlar(kural) {
  return mezKuralNormalize(kural).programlar.map((id) => ({ id, ad: mezProgramAdi(id) }));
}

/** Ders bu müfredatta okutuluyor mu? İşaretsiz ders bütün müfredatlarda sayılır. */
export function mezDersProgramda(ders, programId) {
  if (!programId) return true;
  const l = ders && Array.isArray(ders.mufredatlar) ? ders.mufredatlar : [];
  return l.length === 0 || l.indexOf(programId) >= 0;
}

/**
 * Seçilen müfredatın yapısıyla kural: yarıyıl, işyeri yarıyılı ve toplam
 * AKTS kalıptan gelir; not ölçeği, AGNO, staj vb. bölüm kuralı olarak kalır.
 * Müfredat bölümün listesinde değilse kural olduğu gibi döner.
 */
export function mezProgramKurali(kural, programId) {
  const k = mezKuralNormalize(kural);
  if (!programId || k.programlar.indexOf(programId) < 0) return k;
  const x = MEZUNIYET_KALIPLARI.find((p) => p.id === programId);
  if (!x) return k;
  return Object.assign({}, k, {
    toplamYariyil: x.toplamYariyil,
    isyeriYariyilSayisi: x.isyeriYariyilSayisi,
    toplamAkts: x.toplamAkts,
  });
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
  // Belge okuyucu Türkçe harfi düz getirebilir ("BS" ↔ "BŞ").
  const sade = (x) => mezNorm(x);
  if (gecer.some((x) => sade(x) === sade(n))) return 'gecti';
  if (kalir.some((x) => sade(x) === sade(n))) return 'kaldi';
  return 'belirsiz';
}

/**
 * Bir transkript satırının bölüm kurallarına uymadığı noktalar.
 *
 * @param {object} r    mezuniyetHesapla kaydı (durum, mufredatta, akts, mufredatAkts, not)
 * @param {object} kuralHam
 * @param {object} [o]  { mufredatVar, tekrar }
 * @returns {Array<{id:string, etiket:string}>} boşsa satır kurala uygundur
 */
export function mezSatirIhlalleri(r, kuralHam, o) {
  const kural = kuralHam && kuralHam.satirKurallari ? kuralHam : mezKuralNormalize(kuralHam);
  const sk = kural.satirKurallari || {};
  const ek = o || {};
  const out = [];
  const ekle = (id, etiket) => out.push({ id, etiket: etiket || MEZ_SATIR_KURAL_ADLARI[id] });
  const not = String((r && r.not) || '')
    .trim()
    .toLocaleUpperCase('tr-TR');
  if (sk.kalanNot && r.durum === 'kaldi') ekle('kalanNot');
  if (sk.belirsizNot && r.durum === 'belirsiz') ekle('belirsizNot');
  if (sk.uyariNotlari && sk.uyariNotlari.indexOf(not) >= 0 && r.durum !== 'kaldi') {
    ekle('uyariNotlari', 'İşaretlenen not (' + not + ')');
  }
  // GEÇİLMİŞ DERS müfredat dışı ya da AKTS'i farklı diye sarı olmaz: bölüm
  // dışı (CIS…) ya da eski müfredattan alınmış geçilmiş ders sorun değildir;
  // müfredat sonradan değişince AKTS'in tutmaması da olağandır.
  const gecmis = r.durum === 'gecti';
  // Müfredat sistemde hiç tanımlı değilse her ders "müfredat dışı" çıkar;
  // bütün formu sarıya boyamak bilgi değil gürültü olurdu.
  if (sk.mufredatDisi && !gecmis && ek.mufredatVar !== false && !r.mufredatta) {
    ekle('mufredatDisi');
  }
  if (
    sk.aktsFarki &&
    !gecmis &&
    r.mufredatta &&
    Number(r.mufredatAkts) > 0 &&
    Number(r.akts) !== Number(r.mufredatAkts)
  ) {
    ekle('aktsFarki', 'AKTS müfredatla uyuşmuyor (müfredatta ' + r.mufredatAkts + ')');
  }
  if (sk.tekrar && ek.tekrar) ekle('tekrar');
  return out;
}

// "Aynı ders" anahtarları: aynı kod, aynı ad, aynı müfredat dersine eşleşme
// ya da birinin eşdeğer kodunun ötekinin kodu olması.
function dersAnahtarlari(r) {
  return [
    'k:' + mezNorm(r.kod),
    'k:' + mezNorm(r.esdeger),
    'a:' + mezNorm(r.ad),
    'm:' + (r.mufredatAnahtari || ''),
  ].filter((x) => x.length > 2);
}

/** İki transkript satırı aynı dersin denemeleri mi? */
export function mezAyniDers(r, p) {
  const a = dersAnahtarlari(r);
  return dersAnahtarlari(p).some((x) => a.indexOf(x) >= 0);
}

/**
 * Mezuniyet durumunu hesaplar.
 *
 * @param {Array}  mufredat  bölümün dersleri — [{code,name,akts,sinif,donem,statu}]
 * @param {Array}  alinan    transkriptten çıkarılan dersler — [{kod,ad,akts,not}]
 * @param {Object} kuralHam  mezuniyet_kurallari kaydı (kısmi olabilir)
 * @param {Object} ek        { agno, stajTamam, transkriptAkts, program }
 */
export function mezuniyetHesapla(mufredat, alinan, kuralHam, ek) {
  const bilgi = ek || {};
  // Öğrencinin müfredatı seçildiyse yapı o müfredattan, dersler yalnız o
  // müfredatta okutulanlardan (bkz. mezProgramKurali).
  const kural = mezProgramKurali(kuralHam, bilgi.program);
  const isyeriVar = kural.isyeriYariyilSayisi > 0;

  // İşyeri eğitimi yarıyıllarında ders yoktur; o yarıyıllara düşen müfredat
  // derslerini "kalan ders" diye göstermek yanlış olurdu.
  const dersler = (mufredat || []).filter(
    (c) => mezDersProgramda(c, bilgi.program) && !mezIsyeriYariyilindaMi(c, kural)
  );

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

  // Eşdeğer ZİNCİRİ: kodu birden çok kez değişen ders (BİL122 → BİL142 →
  // MAT142). Transkriptte her satırın Açıklama'sı yalnız bir önceki kodu
  // verir; müfredattaki koda ulaşmak için zincir izlenir.
  const oncekiKod = new Map(); // kod → yerine sayıldığı kod
  (alinan || []).forEach((d) => {
    const k = mezNorm(d.kod);
    const e = mezNorm(d.esdeger);
    if (k && e && k !== e && !oncekiKod.has(k)) oncekiKod.set(k, e);
  });
  const zincirdenBul = (d) => {
    let e = mezNorm(d.esdeger);
    const gorulen = new Set([mezNorm(d.kod)]);
    while (e && !gorulen.has(e)) {
      if (koda.has(e)) return koda.get(e);
      gorulen.add(e);
      e = oncekiKod.get(e) || '';
    }
    return null;
  };

  const eslesenler = new Map(); // müfredat dersi anahtarı → en iyi durum
  const kayitlar = [];
  (alinan || []).forEach((d) => {
    const durum = mezNotDurumu(d.not, kural);
    // Kodu değişmiş ders: transkriptin Açıklama sütunu yerine sayıldığı
    // dersin kodunu verir (BM498 → "2025 - Bahar : BİL494"). Eşleşme sırası:
    // kendi kodu → eşdeğer kodu → adı.
    // Danışmanın kabul ettiği eşleştirme (lib/mezuniyet-eslestirme.js) en önce.
    const m =
      (d.eslestirilen
        ? koda.get(mezNorm(d.eslestirilen)) || ada.get(mezNorm(d.eslestirilen))
        : null) ||
      koda.get(mezNorm(d.kod)) ||
      (d.esdeger ? zincirdenBul(d) : null) ||
      ada.get(mezNorm(d.ad)) ||
      null;
    // Aynı ders tekrar alınmışsa EN İYİ sonuç geçerlidir (bütünleme/tekrar).
    if (m) {
      const anahtar = anahtarOf(m);
      const onceki = eslesenler.get(anahtar);
      if (!onceki || (onceki !== 'gecti' && durum === 'gecti')) eslesenler.set(anahtar, durum);
    }
    kayitlar.push({
      kod: d.kod || '',
      ad: d.ad || '',
      esdeger: d.esdeger || '',
      eslestirilen: d.eslestirilen || '',
      // Eşleşen müfredat dersinin anahtarı: kodu değişmiş ders ile eski
      // kodlu denemesi aynı ders sayılsın diye.
      mufredatAnahtari: m ? anahtarOf(m) : '',
      akts: Number(d.akts) || 0,
      not: d.not || '',
      durum,
      mufredatta: !!m,
      mufredatAkts: m ? Number(m.akts) || 0 : 0,
      // Dilekçedeki ders tablosu için: transkriptteki eğitim-öğretim yılı ve
      // yarıyıl; yoksa müfredattaki yarıyıl sırası.
      yil: d.yil || '',
      yariyil: d.yariyil || '',
      // Transkriptte yazan statü (Z/S, Zorunlu/Seçmeli); müfredattaki `statu` ayrı.
      statuTranskript: d.statu || '',
      mufredatYariyil: m ? mezDersYariyili(m) : null,
      statu: m ? m.statu || '' : '',
      sinif: m ? m.sinif : '',
    });
  });

  // Satır kuralları: her satırın neden sarı olduğu (boş dizi = kurala uygun).
  //
  // TEKRAR ALINAN DERS: öğrenci bir dersi birden çok kez alabilir, önce
  // kalıp sonra geçebilir. Ders sonunda GEÇİLDİYSE ne geçilen deneme ne de
  // önceki başarısız denemeler kural ihlalidir: önceki denemeler
  // `sonradanGecildi` ile işaretlenir ve sarı OLMAZ. Sarı yalnız hiç
  // geçilmemiş derste kalır.
  //
  // "Aynı ders" geniş tanımlanır: aynı kod, aynı ad, aynı müfredat dersine
  // eşleşme ya da birinin eşdeğer kodunun ötekinin kodu olması. Kodu
  // değişen (BİL494 → BM498) ya da adı korunan dersler böylece birleşir.
  kayitlar.forEach((r) => {
    const esler = kayitlar.filter((p) => p !== r && mezAyniDers(r, p));
    const gecildi = r.durum === 'gecti' || esler.some((p) => p.durum === 'gecti');
    r.sonradanGecildi = gecildi && r.durum !== 'gecti';
    r.ihlaller = mezSatirIhlalleri(r, kural, {
      mufredatVar: dersler.length > 0,
      tekrar: !gecildi && esler.length > 0,
    }).filter((x) => !r.sonradanGecildi || x.id === 'uyariNotlari');
  });

  // AKTS toplanırken aynı ders iki kez sayılmamalı: tekrar edilen bir dersin
  // kredisi bir kez sayılır. Müfredat dışı dersler kendi kod/adıyla tekilleşir.
  const sayilan = new Set();
  let gecilenAkts = 0; // transkript toplamı okunduysa aşağıda onunla değişir
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

  // Transkriptin "Birikimli · Tamamlanan AKTS" değeri resmîdir; okunduysa
  // esas alınır. Satır satır toplam (tekrar, tanınmayan not, eşdeğer ders)
  // ondan sapabilir — yalnız transkript okunamadığında kullanılır.
  const hesaplananAkts = gecilenAkts;
  const trAkts = parseFloat(
    String(bilgi.transkriptAkts == null ? '' : bilgi.transkriptAkts).replace(',', '.')
  );
  const aktsKaynagi = Number.isFinite(trAkts) && trAkts > 0 ? 'transkript' : 'hesap';
  if (aktsKaynagi === 'transkript') gecilenAkts = trAkts;

  const kosullar = [
    {
      id: 'akts',
      label: aktsKaynagi === 'transkript' ? 'Toplam AKTS (transkript)' : 'Toplam AKTS',
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
  // STAJ: kodu tanımlı stajlar transkriptte ders olarak aranır; notu
  // `stajBasariNotu` (varsayılan BŞ) olan staj tamamlanmış sayılır.
  const stajDurumlari = kural.stajDersleri
    .filter((s) => s.kod)
    .map((s) => {
      const denemeler = (alinan || []).filter((d) => mezNorm(d.kod) === mezNorm(s.kod));
      const tamam = denemeler.some((d) => mezNorm(d.not) === mezNorm(kural.stajBasariNotu));
      return { ad: s.ad, kod: s.kod, tamam, alindi: denemeler.length > 0 };
    });
  const stajEksik = stajDurumlari.filter((s) => !s.tamam).map((s) => s.ad);
  if (kural.stajZorunlu) {
    if (stajDurumlari.length && bilgi.stajTamam == null) {
      kosullar.push({
        id: 'staj',
        label:
          'Staj (' +
          stajDurumlari.map((s) => s.kod).join(', ') +
          ' — ' +
          kural.stajBasariNotu +
          ')',
        hedef: 'tamamlanmış',
        mevcut: stajEksik.length ? stajEksik.length + ' staj eksik' : 'tamam',
        saglandi: stajEksik.length === 0,
      });
    } else {
      kosullar.push({
        id: 'staj',
        label: 'Staj',
        hedef: 'tamamlanmış',
        mevcut:
          bilgi.stajTamam === true ? 'tamam' : bilgi.stajTamam === false ? 'eksik' : 'bilinmiyor',
        saglandi: bilgi.stajTamam === true ? true : bilgi.stajTamam === false ? false : null,
      });
    }
  }

  return {
    kural,
    // Hesabın yapıldığı müfredat (boş: bölümün tek/varsayılan yapısı).
    program: bilgi.program && kural.programlar.indexOf(bilgi.program) >= 0 ? bilgi.program : '',
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
    ihlalSayisi: kayitlar.filter((r) => r.ihlaller.length > 0).length,
    aktsKaynagi,
    hesaplananAkts,
    // Kodu tanımlı stajların transkriptteki durumu ve eksik olanların adları.
    stajDurumlari,
    stajEksik,
    mufredatBos: dersler.length === 0,
  };
}

/** Bölümün tanıdığı bütün harf notları (ölçek + ek harfler + ek listeler). */
export function mezGecerliNotlar(kuralHam) {
  const k = mezKuralNormalize(kuralHam);
  const liste = []
    .concat((k.notOlcegi || []).map((r) => r && r.harf))
    .concat((k.ekHarfler || []).map((r) => r && r.harf))
    .concat(k.gecerNotlar || [], k.kalirNotlar || [])
    .map((h) =>
      String(h || '')
        .trim()
        .toLocaleUpperCase('tr-TR')
    )
    .filter(Boolean);
  return Array.from(new Set(liste));
}

/**
 * Transkriptten okunan notu bölümün ölçeğine oturtur.
 *
 * Belge okuyucu notu çoğu zaman bozuk getiriyordu: "B 2", "C-3", "b2", ya da
 * rakamı düşmüş "B" / "C". Sırasıyla:
 *   1) boşluk/tire/nokta atılır, büyük harfe çevrilir ("C-3" → "C3");
 *   2) ölçekte tanınıyorsa o kullanılır;
 *   3) tanınmıyorsa ve yüzlük puan okunduysa harf PUANDAN hesaplanır
 *      (ölçek bölümün kendi ölçeğidir — bkz. mezPuandanHarf);
 *   4) hiçbiri olmazsa temizlenmiş hâli döner (form onu "Tanınmayan not"
 *      diye sarı gösterir; tahmin edilmez).
 * @returns {{not:string, kaynak:'okunan'|'puan'|'tanınmadı'}}
 */
export function mezNotDuzelt(ham, puan, kuralHam) {
  const temiz = String(ham == null ? '' : ham)
    .toLocaleUpperCase('tr-TR')
    .replace(/[\s.\-_]/g, '');
  if (temiz && mezNotDurumu(temiz, kuralHam) !== 'belirsiz')
    return { not: temiz, kaynak: 'okunan' };
  const p = String(puan == null ? '' : puan).trim();
  if (p) {
    const h = mezPuandanHarf(p, kuralHam);
    if (h.harf) return { not: h.harf, kaynak: 'puan' };
  }
  return { not: temiz, kaynak: 'tanınmadı' };
}

// ══════════════════════════════════════════════════════════════
// SİLİNME ADAYLARI — mezuniyet ekranının sade görünümü
//
// Transkriptin tamamı yerine yalnız karar gerektiren dersler gösterilir:
//   • silinmeli — başarısız ve sonradan geçilmemiş ders; ya SEÇMELİ ya da
//     kodu/adı değişmiş BENZER bir ders geçilmiş (Ayrık Matematik kalındı,
//     "Ayrık Matematik ve Uygulamaları" geçildi gibi). Öneridir; işaretleme
//     kararı danışmandadır.
//   • engel — müfredattaki zorunlu ders geçilmemiş; ya da transkriptte
//     zorunlu bir ders kalınmış ve yerine geçilen benzer ders yok. Zorunlu
//     ders silinemez, mezuniyete engeldir.
//   • kontrol — notu tanınmayan ya da statüsü (Z/S) hiçbir yerde yazmayan
//     başarısız ders; danışman bakmalı.
// Başarısız dersin AKTS'si mezuniyet hesabına zaten girmez; önerilenleri
// silmek AKTS koşullarını değiştirmez.
// ══════════════════════════════════════════════════════════════

// Ders adı karşılaştırmasında anlam taşımayan kelimeler.
const AD_DOLGU = new Set(['ve', 'ile', 'icin', 'a', 'b']);
// Adın sonuna eklenince dersi değiştirmeyen kelimeler: "Ayrık Matematik" ile
// "Ayrık Matematik ve Uygulamaları" aynı içeriğin yeni adıdır.
const AD_EKLERI = new Set([
  'uygulamalari',
  'uygulamalar',
  'uygulamali',
  'uygulama',
  'uygulamalariyla',
  'temelleri',
  'teori',
  'teorisi',
  'kavramlari',
]);
const ROMEN = /^(i|ii|iii|iv|v|vi|vii|viii|ix|x|\d+)$/;

function adKelimeleri(ad) {
  return String(ad == null ? '' : ad)
    .split(/[\s\-–/,.()]+/)
    .map(mezNorm)
    .filter((k) => k && !AD_DOLGU.has(k));
}

/**
 * İki ders adı aynı dersin eski/yeni adı gibi mi duruyor?
 * Kısa adın bütün kelimeleri uzun adda geçmeli; sıra numaraları (I/II, 1/2)
 * birebir aynı olmalı (Matematik I ≠ Matematik II). Kısa ad tek kelimeyse
 * fazladan kelimeler yalnız "uygulamaları/temelleri" türünden olabilir —
 * "Fizik" ile "Fizik Laboratuvarı" benzer sayılmaz.
 */
export function mezAdBenzerMi(a, b) {
  const ka = adKelimeleri(a);
  const kb = adKelimeleri(b);
  if (!ka.length || !kb.length) return false;
  if (ka.join(' ') === kb.join(' ')) return true;
  const sayiA = ka.filter((k) => ROMEN.test(k)).join(',');
  const sayiB = kb.filter((k) => ROMEN.test(k)).join(',');
  if (sayiA !== sayiB) return false;
  const [kisa, uzun] = ka.length <= kb.length ? [ka, kb] : [kb, ka];
  if (!kisa.every((k) => uzun.indexOf(k) >= 0)) return false;
  const fazla = uzun.filter((k) => kisa.indexOf(k) < 0);
  const anlamli = kisa.filter((k) => !ROMEN.test(k));
  if (anlamli.length >= 2) return true;
  return fazla.every((k) => AD_EKLERI.has(k));
}

function statuTuru(r) {
  const t = mezNorm(r.statuTranskript);
  if (t === 's' || t.indexOf('secmeli') === 0) return 'S';
  if (t === 'z' || t.indexOf('zorunlu') === 0) return 'Z';
  const m = String(r.statu || '')
    .trim()
    .toUpperCase();
  if (m === 'S' || m === 'Z') return m;
  return '';
}

function donemDegeri(r) {
  const m = String((r && r.yil) || '').match(/(\d{4})/);
  const yil = m ? Number(m[1]) : 0;
  const y = mezNorm(r && r.yariyil);
  let s = parseInt(y, 10) || 0;
  if (y.indexOf('guz') >= 0) s = 1;
  else if (y.indexOf('bahar') >= 0) s = 2;
  else if (y.indexOf('yaz') >= 0) s = 3;
  return yil * 10 + s;
}

/**
 * Hesaplanmış mezuniyet sonucunu üç gruba ayırır. Her ders bir kez, en son
 * dönemdeki denemesiyle döner; `i` sonuc.kayitlar içindeki sırasıdır
 * (ekranın satır anahtarı bununla kurulur).
 *
 * @returns {{ silinmeli: Array, engel: Array, kontrol: Array }}
 *   silinmeli/kontrol: [{ i, r, neden, benzer? }]
 *   engel: [{ i?, r?, kod, ad, durum, neden }]
 */
export function mezSilinmeSiniflandir(sonuc) {
  const kayitlar = (sonuc && sonuc.kayitlar) || [];
  const gecenler = kayitlar.filter((r) => r.durum === 'gecti');
  const silinmeli = [];
  const kontrol = [];
  const engel = [];
  const islenen = new Set();

  kayitlar.forEach((r, i) => {
    if (islenen.has(i)) return;
    if (r.durum === 'gecti' || r.sonradanGecildi) return;
    // Aynı dersin bütün başarısız denemeleri tek satır: en son dönem.
    const grup = [];
    kayitlar.forEach((p, j) => {
      if (j === i || (!islenen.has(j) && p.durum !== 'gecti' && mezAyniDers(r, p))) grup.push(j);
    });
    grup.forEach((j) => islenen.add(j));
    const son = grup.reduce(
      (a, j) => (donemDegeri(kayitlar[j]) >= donemDegeri(kayitlar[a]) ? j : a),
      i
    );
    const rr = kayitlar[son];

    if (rr.durum === 'belirsiz') {
      kontrol.push({ i: son, r: rr, neden: 'Not tanınmadı (' + (rr.not || 'boş') + ')' });
      return;
    }
    const benzer = gecenler.find((p) => !mezAyniDers(rr, p) && mezAdBenzerMi(rr.ad, p.ad));
    if (benzer) {
      silinmeli.push({
        i: son,
        r: rr,
        neden: 'Benzer ders geçilmiş: ' + [benzer.kod, benzer.ad].filter(Boolean).join(' '),
        benzer,
      });
      return;
    }
    const st = statuTuru(rr);
    if (st === 'S') silinmeli.push({ i: son, r: rr, neden: 'Seçmeli, başarısız' });
    else if (st === 'Z') {
      if (!rr.mufredatta)
        engel.push({
          i: son,
          r: rr,
          kod: rr.kod,
          ad: rr.ad,
          durum: 'kaldi',
          neden: 'Zorunlu ders kalınmış',
        });
    } else kontrol.push({ i: son, r: rr, neden: 'Statüsü (zorunlu/seçmeli) bilinmiyor' });
  });

  // Müfredattaki geçilmemiş zorunlu dersler. Transkriptte benzer adla
  // geçilmiş bir ders varsa (kodu değişmiş) engel sayılmaz.
  ((sonuc && sonuc.kalanZorunlu) || []).forEach((c) => {
    if (gecenler.some((p) => mezAdBenzerMi(c.name, p.ad))) return;
    const i = kayitlar.findIndex(
      (r) =>
        r.mufredatta && (mezNorm(r.kod) === mezNorm(c.code) || mezNorm(r.ad) === mezNorm(c.name))
    );
    engel.push({
      i: i >= 0 ? i : undefined,
      r: i >= 0 ? kayitlar[i] : undefined,
      kod: c.code,
      ad: c.name,
      durum: c.durum,
      neden: c.durum === 'alinmadi' ? 'Zorunlu ders alınmamış' : 'Zorunlu ders geçilmemiş',
    });
  });

  return { silinmeli, engel, kontrol };
}
