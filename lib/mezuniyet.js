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

// Varsayılan kural seti. Bölüm yetkilisi Bölüm Yönetimi → Mezuniyet
// Kuralları'ndan değiştirir; kayıt yoksa bunlar kullanılır.
export const MEZUNIYET_VARSAYILAN = {
  mufredatTipi: 'normal', // 'normal' | '7+1'
  toplamAkts: 240,
  minAgno: 2.0,
  minSecmeliAkts: 0,
  // 7+1'de 8. yarıyıl ders yerine işyeri eğitimidir.
  isyeriEgitimiAkts: 30,
  stajZorunlu: true,
  // Geçer sayılan harf notları. DD/DC bazı yönetmeliklerde AGNO'ya bağlı
  // "koşullu geçer"dir; listeye alınıp alınmayacağına bölüm karar verir.
  gecerNotlar: ['AA', 'BA', 'BB', 'CB', 'CC', 'DC', 'DD', 'S', 'G', 'M', 'MU'],
  kalirNotlar: ['FF', 'FD', 'F', 'K', 'DZ', 'GR', 'D'],
  aciklama: '',
};

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
  const k = Object.assign({}, MEZUNIYET_VARSAYILAN, kural || {});
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
  const kural = Object.assign({}, MEZUNIYET_VARSAYILAN, kuralHam || {});
  const bilgi = ek || {};
  const yediArti = kural.mufredatTipi === '7+1';

  // 7+1'de 8. yarıyıl (4. sınıf bahar) ders taşımaz; yerine işyeri eğitimi
  // geçer. Müfredattaki o dersleri "kalan ders" diye göstermek yanlış olurdu.
  const dersler = (mufredat || []).filter((c) => {
    if (!yediArti) return true;
    return !(Number(c.sinif) === 4 && c.donem === 'bahar');
  });

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
  if (yediArti) {
    kosullar.push({
      id: 'isyeri',
      label: 'İşyeri Eğitimi (7+1, 8. yarıyıl)',
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
