// ══════════════════════════════════════════════════════════════
// AÇILAN DERSLER LİSTESİNİ İÇE AKTARMA
//
// Bölümler her dönem "açılan dersler" listesini Word (ya da PDF) olarak
// hazırlıyor. O liste sisteme tek tek elle giriliyordu: elli satırlık bir
// tabloyu elle kopyalamak hem uzun sürüyor hem de hata üretiyor.
//
// Belgeden okunabilen alanlar ŞUNLARDIR ve fazlası uydurulmaz:
//   ders kodu · dersin adı · N (Z/S) · AKTS · dersi yürütecek öğretim elemanı
// Sınıf, tablonun içindeki "1.SINIF" başlık satırlarından okunur.
//
// Belgede OLMAYAN üç alan (dönem, seviye, Bologna linki) içe aktarma
// ekranında toplu verilir ve satır bazında değiştirilebilir — çünkü tek bir
// belge tek dönemi anlatır ama istisnası olur.
//
// ── NEDEN KENDİ XML AYRIŞTIRICIMIZ ──
// Tarayıcıda DOMParser var, testte (node) yok. Ayrıştırma kuralları veri
// doğruluğunun kalbi olduğu için testsiz bırakılamaz; bu yüzden burada
// DOM'a bağımlı olmayan, derinlik bilen küçük bir etiket tarayıcı var.
// ══════════════════════════════════════════════════════════════

// ── Ortak metin yardımcıları ──

/** Baştaki/sondaki boşluk ve yinelenen boşluklar tek boşluğa iner. */
export function duzMetin(s) {
  return String(s == null ? '' : s)
    .replace(/\u00A0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const XML_ENTITY = {
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&apos;': "'",
  '&amp;': '&',
};

function cozEntity(s) {
  return String(s == null ? '' : s)
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, n) => String.fromCharCode(parseInt(n, 16)))
    .replace(/&(lt|gt|quot|apos|amp);/g, (m) => XML_ENTITY[m]);
}

/**
 * Türkçe duyarlı karşılaştırma anahtarı: kasa, noktalama ve boşluk atılır.
 * 'İ'/'I' özel olarak çevrilir — toLowerCase bunları yanlış eşler.
 */
export function sadeMetin(s) {
  return String(s == null ? '' : s)
    .replace(/İ/g, 'i')
    .replace(/I/g, 'ı')
    .toLocaleLowerCase('tr-TR')
    .replace(/[^0-9a-zçğıöşü]/g, '');
}

// ── Akademik unvanlar ──
// Belgede ad unvanla yazılır ("Dr. Öğr. Üyesi Enes Bektaş"); sistemde de
// çoğu kayıt unvanlıdır ama ikisi aynı unvanı kullanmayabilir. Eşleştirme
// unvan SOYULARAK yapılır.
const UNVANLAR = [
  'Prof. Dr.',
  'Prof Dr.',
  'Prof.',
  'Doç. Dr.',
  'Doç Dr.',
  'Doç.',
  'Dr. Öğr. Üyesi',
  'Dr. Ögr. Üyesi',
  'Dr. Öğr. Gör.',
  'Öğr. Gör. Dr.',
  'Arş. Gör. Dr.',
  'Öğr. Gör.',
  'Arş. Gör.',
  'Uzm.',
  'Dr.',
];

/** 'Dr. Öğr. Üyesi Enes Bektaş' → 'Enes Bektaş' */
export function unvaniSoy(ad) {
  let n = duzMetin(ad);
  // Birden çok unvan üst üste yazılmış olabilir ('Prof. Dr. Dr.').
  let degisti = true;
  while (degisti) {
    degisti = false;
    for (const u of UNVANLAR) {
      if (sadeMetin(n).startsWith(sadeMetin(u)) && sadeMetin(u)) {
        // Sade karşılaştırma noktalamayı yok saydığı için kesme uzunluğu
        // ham metinden bulunur: unvanın sade hâli kadar harf tüketilir.
        const hedef = sadeMetin(u).length;
        let sayac = 0;
        let i = 0;
        while (i < n.length && sayac < hedef) {
          if (sadeMetin(n[i])) sayac += 1;
          i += 1;
        }
        // Unvanın SON noktası sayaca girmez ('Doç. Dr.' → 'doçdr'); sayaç
        // dolduğunda imleç 'r'den sonrada kalır ve ad '. Fatih Korkmaz' diye
        // çıkardı. Kalan noktalama ve boşluk da tüketilir.
        while (i < n.length && !sadeMetin(n[i])) i += 1;
        n = n.slice(i).trim();
        degisti = true;
        break;
      }
    }
  }
  return n;
}

/** Ad eşleştirme anahtarı — unvan soyulur, kasa/noktalama yok sayılır. */
export function adAnahtari(ad) {
  return sadeMetin(unvaniSoy(ad));
}

// ══════════════════════════════════════════════════════════════
// DOCX TABLOSU OKUMA
// ══════════════════════════════════════════════════════════════

/**
 * `xml` içindeki `<ad …>…</ad>` bloklarının İÇERİĞİNİ döndürür.
 *
 * Derinlik bilir: iç içe tablo (bir hücrenin içindeki tablo) dıştakinin
 * satırı sayılmaz. Etiket adı TAM eşleşir — '<w:tr' düz aramasıyla '<w:trPr'
 * de yakalanır ve satır sınırları kayar; bu yüzden ad sonrası boşluk, '>'
 * ya da '/' zorunludur.
 */
export function etiketBloklari(xml, ad) {
  const s = String(xml || '');
  const bloklar = [];
  const rx = new RegExp('<' + ad + '(?=[\\s/>])[^>]*?(/?)>|</' + ad + '>', 'g');
  let derinlik = 0;
  let bas = -1;
  let m;
  while ((m = rx.exec(s)) !== null) {
    const kapanis = m[0].startsWith('</');
    const kendiniKapatan = m[1] === '/';
    if (kapanis) {
      derinlik -= 1;
      if (derinlik === 0 && bas >= 0) {
        bloklar.push(s.slice(bas, m.index));
        bas = -1;
      }
      if (derinlik < 0) derinlik = 0;
    } else if (kendiniKapatan) {
      if (derinlik === 0) bloklar.push('');
    } else {
      if (derinlik === 0) bas = m.index + m[0].length;
      derinlik += 1;
    }
  }
  return bloklar;
}

/**
 * Bir hücrenin görünen metni.
 * Word bir cümleyi biçimlendirme yüzünden çok sayıda `<w:t>`ye böler; hepsi
 * birleştirilir. Paragraf sonu ve `<w:br/>` boşluk sayılır — hücre içindeki
 * iki satır tek metne iner.
 */
export function hucreMetni(hucreXml) {
  // Ayraçlar METİN AKIŞINA katılmalı: `<w:t>` içerikleri birleştirilerek
  // okunduğu için etiketlerin ARASINA konan boşluk birleştirmede düşer ve
  // iki paragraflık hücre 'AB' diye okunurdu. Ayraç da bir `<w:t>` yapılır.
  const AYRAC = '<w:t> </w:t>';
  const s = String(hucreXml || '')
    .replace(/<w:br\b[^>]*\/?>/g, AYRAC)
    .replace(/<w:tab\b[^>]*\/?>/g, AYRAC)
    .replace(/<\/w:p>/g, AYRAC);
  const parcalar = [...s.matchAll(/<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>/g)].map((m) => m[1]);
  return duzMetin(cozEntity(parcalar.join('')));
}

/**
 * `word/document.xml` → tablolar; her tablo satır dizisi, her satır hücre
 * metinleri dizisi.
 */
export function docxTablolari(documentXml) {
  return etiketBloklari(documentXml, 'w:tbl').map((tbl) =>
    etiketBloklari(tbl, 'w:tr').map((tr) => etiketBloklari(tr, 'w:tc').map(hucreMetni))
  );
}

/**
 * Belgenin İLK TABLOSUNDAN ÖNCEKİ paragrafları.
 *
 * Künye buradan okunur (kurum, fakülte, '2026/2027 GÜZ DÖNEMİ', bölüm).
 * Bir paragrafın parçaları ARALIKSIZ birleştirilir: Word bir yılı bile
 * biçimlendirme yüzünden bölüyor ('202' + '6' + '/202' + '7'); araya boşluk
 * koymak '2026/2027'yi tanınmaz hâle getirirdi.
 */
export function docxBaslikParagraflari(documentXml) {
  const s = String(documentXml || '');
  const ilkTablo = s.search(/<w:tbl(?=[\s/>])/);
  const bas = ilkTablo < 0 ? s : s.slice(0, ilkTablo);
  return etiketBloklari(bas, 'w:p')
    .map((p) =>
      duzMetin(
        cozEntity([...p.matchAll(/<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>/g)].map((m) => m[1]).join(''))
      )
    )
    .filter(Boolean);
}

/**
 * PDF metnini satır/hücreye çevirir.
 * `window.pdfMetniCikar` sütun sınırlarına sekme koyuyor; burada sekme kesin
 * hücre sınırıdır (bkz. taban tablosu ayrıştırıcısı, aynı sözleşme).
 */
export function pdfSatirlari(metin) {
  return String(metin || '')
    .split(/\r?\n/)
    .map((satir) => satir.split('\t').map(duzMetin))
    .filter((hucreler) => hucreler.some((h) => h));
}

// ══════════════════════════════════════════════════════════════
// TABLOYU DERSLERE ÇEVİRME
// ══════════════════════════════════════════════════════════════

const TR_ASCII = { ç: 'c', ğ: 'g', ı: 'i', ö: 'o', ş: 's', ü: 'u' };

/**
 * Başlık eşleştirme anahtarı: `sadeMetin` + Türkçe harfler ASCII'ye iner.
 *
 * Sebebi somut: 'DERSİN ADI' büyük harfle yazıldığında Türkçe kurala göre
 * 'dersin adı' olur (I → ı), 'DERSIN ADI' ise 'dersin adi'. Aynı başlık,
 * belgeyi yazanın klavyesine göre iki farklı anahtar üretir. Aynı şey
 * 'ÖĞRETİM' / 'OGRETIM' için de geçerli — bölümler başlığı Türkçe karakter
 * kullanmadan da yazıyor.
 *
 * Bu daraltma YALNIZ başlık eşleştirmede yapılır. İnsan adlarında 'ı' ile
 * 'i', 'ö' ile 'o' AYRI harflerdir; orada birleştirmek farklı akademisyenleri
 * aynı kişi sayar ve dersi yanlış kişiye yazar (bkz. adAnahtari).
 */
export function basAnahtari(s) {
  return sadeMetin(s).replace(/[çğıöşü]/g, (h) => TR_ASCII[h]);
}

// Başlık satırı tanıma. Sütun SIRASI sabit varsayılmaz: bölümler kendi
// tablosunu kurar, T/U/L sütunlarını çıkarabilir ya da sıralarını
// değiştirebilir. Sütunlar BAŞLIK ADINDAN bulunur.
const SUTUN_DESENLERI = [
  { alan: 'kod', test: (s) => /derskodu|^kod$|dersinkodu/.test(s) },
  { alan: 'ad', test: (s) => /dersinadi|dersadi|^ders$|^dersler$/.test(s) },
  // 'N' sütunu Zorunlu/Seçmeli demektir; bazı tablolar açıkça yazar.
  { alan: 'statu', test: (s) => /^n$/.test(s) || /zorunlusecmeli|zs|statu/.test(s) },
  { alan: 'akts', test: (s) => /^akts$/.test(s) || /^ects$/.test(s) || /akts/.test(s) },
  {
    alan: 'ogretimElemani',
    test: (s) => /ogretimeleman|yurutecek|ogretimuyesi|dersiveren|dersihoca/.test(s),
  },
];

/** Bir satır tablo başlığı mı? Öyleyse sütun → indeks haritası döner. */
export function sutunHaritasi(hucreler) {
  const harita = {};
  (hucreler || []).forEach((h, i) => {
    const s = basAnahtari(h);
    if (!s) return;
    SUTUN_DESENLERI.forEach((d) => {
      if (harita[d.alan] == null && d.test(s)) harita[d.alan] = i;
    });
  });
  // Kod ve ad olmadan tablo okunamaz; ikisi birden varsa başlık sayılır.
  return harita.kod != null && harita.ad != null ? harita : null;
}

/**
 * '1.SINIF' → 1 · '4. SINIF' → 4 · 'SEÇMELİ DERSLER' → 5
 * Tanınmazsa null (satır sınıf başlığı değildir).
 */
export function sinifCoz(metin) {
  // basAnahtari: 'SINIF' büyük harfle yazıldığında Türkçe kurala göre 'sınıf'
  // olur (I → ı); ASCII'ye indirmeden desen tutmaz.
  const s = basAnahtari(metin);
  if (!s) return null;
  const m = /^([1-8])\s*sinif/.exec(s);
  if (m) return Number(m[1]);
  if (/^secmeli/.test(s)) return 5;
  return null;
}

/** 'Z' / 'Zorunlu' → 'Z' · 'S' / 'Seçmeli' → 'S' · tanınmazsa ''. */
export function statuCoz(metin) {
  const s = sadeMetin(metin);
  if (!s) return '';
  if (s.startsWith('z')) return 'Z';
  if (s.startsWith('s')) return 'S';
  return '';
}

/** Hücredeki ilk tam sayı (AKTS). Yoksa null — 0 ile karıştırılmaz. */
export function sayiCoz(metin) {
  const m = /-?\d+/.exec(String(metin == null ? '' : metin));
  return m ? Number(m[0]) : null;
}

// Ders kodu: harflerle başlar, rakamla biter (EMU101, EEM119, MAT-161).
const KOD_RX = /^[A-ZÇĞİÖŞÜ]{2,6}\s?-?\s?\d{2,4}$/i;

/** Metin bir ders koduna benziyor mu? */
export function dersKoduMu(metin) {
  return KOD_RX.test(duzMetin(metin).replace(/\s+/g, ' '));
}

/**
 * Tablo satırlarını ders kayıtlarına çevirir.
 *
 * ── ÇOK ÖĞRETİM ELEMANLI DERS ──
 * Belgede bitirme projesi gibi dersler kod ve ad TEKRARLANARAK, ama N/AKTS
 * sütunları BOŞ bırakılarak her danışman için bir satır yazılıyor:
 *
 *   EEM421 · Lisans Araştırma Projesi · Z · … · 10 · Prof. Dr. Murat Arı
 *   EEM421 · Lisans Araştırma Projesi ·   · … ·    · Doç. Dr. Fatih Korkmaz
 *
 * Bu ikinci satır AYRI BİR DERS DEĞİL, aynı dersin ikinci öğretim elemanıdır.
 * Ayrı ders saymak listeyi sekiz kopyayla şişirirdi. Ölçüt "kod aynı VE
 * N/AKTS boş"tur: aynı kod kendi AKTS'siyle yeniden geçiyorsa (iki farklı
 * müfredat) o gerçekten ayrı bir kayıttır ve ayrı tutulur.
 *
 * @param {Array<Array<string>>} satirlar
 * @returns {{dersler:Array, uyarilar:Array<string>}}
 *   ders: { kod, ad, statu, akts, sinif, ogretimElemanlari:[], satirNo }
 */
export function dersleriCoz(satirlar) {
  const dersler = [];
  const uyarilar = [];
  let harita = null;
  let sinif = null;
  let sonuncu = null;

  (satirlar || []).forEach((ham, i) => {
    const hucreler = (ham || []).map(duzMetin);
    if (!hucreler.some((h) => h)) {
      // Boş ayraç satırı: blok bitti, birleştirme zinciri de biter.
      sonuncu = null;
      return;
    }

    // Sınıf başlığı: tek dolu hücre ve içinde 'N.SINIF' yazıyor.
    const dolu = hucreler.filter((h) => h);
    if (dolu.length === 1) {
      const s = sinifCoz(dolu[0]);
      if (s != null) {
        sinif = s;
        sonuncu = null;
        return;
      }
    }

    // Başlık satırı — her blokta yeniden yazılmış olabilir.
    const yeni = sutunHaritasi(hucreler);
    if (yeni) {
      harita = yeni;
      sonuncu = null;
      return;
    }
    if (!harita) return; // başlıktan önceki metin satırları (kurum adı vb.)

    const al = (alan) => (harita[alan] == null ? '' : hucreler[harita[alan]] || '');
    const kod = duzMetin(al('kod'));
    if (!kod) return;
    if (!dersKoduMu(kod)) {
      uyarilar.push(`${i + 1}. satır atlandı: "${kod}" ders koduna benzemiyor.`);
      return;
    }

    const statu = statuCoz(al('statu'));
    const akts = sayiCoz(al('akts'));
    const eleman = duzMetin(al('ogretimElemani'));

    // Aynı dersin ek öğretim elemanı mı?
    const devam =
      sonuncu && sadeMetin(sonuncu.kod) === sadeMetin(kod) && !statu && akts == null && eleman;
    if (devam) {
      if (!sonuncu.ogretimElemanlari.includes(eleman)) sonuncu.ogretimElemanlari.push(eleman);
      return;
    }

    const ders = {
      kod,
      ad: duzMetin(al('ad')),
      statu,
      akts,
      sinif,
      ogretimElemanlari: eleman ? [eleman] : [],
      satirNo: i + 1,
    };
    dersler.push(ders);
    sonuncu = ders;
  });

  return { dersler, uyarilar };
}

/**
 * Belge başlığından dönem ve akademik yıl tahmini.
 * Tahmindir: içe aktarma ekranında toplu alanların BAŞLANGIÇ değeri olur,
 * yetkili onaylar. Bulunamazsa alanlar boş kalır — yanlış varsayım, boş
 * bırakmaktan kötüdür.
 */
export function kunyeTahmini(metin) {
  const s = String(metin || '');
  const sade = sadeMetin(s);
  const donem = /güz|guz/.test(sade) ? 'guz' : /bahar/.test(sade) ? 'bahar' : '';
  const yil = /(\d{4})\s*[/–-]\s*(\d{4})/.exec(s);
  const seviye = /lisansüstü|yükseklisans|yukseklisans/.test(sade)
    ? 'yukseklisans'
    : /doktora/.test(sade)
      ? 'doktora'
      : /lisans/.test(sade)
        ? 'lisans'
        : '';
  return {
    donem,
    seviye,
    akademikYil: yil ? `${yil[1]}-${yil[2]}` : '',
  };
}

/**
 * Belgedeki öğretim elemanı adını sistemdeki akademisyenle eşler.
 *
 * Üç ölçüt sırayla denenir; hiçbiri tutmazsa null döner ve içe aktarma
 * ekranı o satırı "eşleşmedi" diye işaretler. Yanlış akademisyene bağlamak,
 * boş bırakmaktan çok daha kötüdür: ders yanlış kişinin üzerine yazılır.
 */
export function akademisyenEsle(ad, akademisyenler) {
  const hedef = adAnahtari(ad);
  if (!hedef) return null;
  const liste = akademisyenler || [];
  // 1) Unvansız tam ad
  const tam = liste.find((p) => adAnahtari(p && p.name) === hedef);
  if (tam) return tam;
  // 2) Kelime kümesi aynı (ad-soyad sırası değişmiş olabilir)
  const kelimeKumesi = (x) =>
    unvaniSoy(x).split(/\s+/).map(sadeMetin).filter(Boolean).sort().join('|');
  const hedefKume = kelimeKumesi(ad);
  const kume = liste.find((p) => p && kelimeKumesi(p.name) === hedefKume);
  if (kume) return kume;
  // 3) Soyadı + ilk adın baş harfi ('Enes Bektaş' ↔ 'E. Bektaş')
  const parcala = (x) => {
    const p = unvaniSoy(x).split(/\s+/).filter(Boolean);
    return p.length < 2 ? null : { ilk: sadeMetin(p[0]), soy: sadeMetin(p[p.length - 1]) };
  };
  const h = parcala(ad);
  if (!h) return null;
  const adaylar = liste.filter((p) => {
    const c = parcala(p && p.name);
    return c && c.soy === h.soy && c.ilk[0] === h.ilk[0];
  });
  // Tek aday varsa kabul; iki kişi aynı soyadı ve baş harfi taşıyorsa
  // hangisi olduğu bilinemez — seçimi yetkiliye bırakmak zorunludur.
  return adaylar.length === 1 ? adaylar[0] : null;
}

/**
 * Belgeden okunan dersi, kayıtlı derslerle karşılaştırır.
 * Aynı kod + aynı dönem = aynı ders sayılır (kod tek başına yetmez: aynı ders
 * güz ve baharda ayrı kayıtlarla açılabiliyor).
 */
export function mevcutDersBul(ders, donem, mevcutlar) {
  const kod = sadeMetin(ders && ders.kod);
  if (!kod) return null;
  return (
    (mevcutlar || []).find(
      (c) => sadeMetin(c && c.code) === kod && (!donem || !c.donem || c.donem === donem)
    ) || null
  );
}

/**
 * İçe aktarma satırlarını hazırlar: belgeden gelen + toplu verilen alanlar +
 * akademisyen eşleşmesi + "yeni mi güncelleme mi".
 */
export function iceAktarmaSatirlari(dersler, secenek) {
  const o = secenek || {};
  return (dersler || []).map((d) => {
    const eslesen = d.ogretimElemanlari.map((ad) => ({
      belgedeki: ad,
      akademisyen: akademisyenEsle(ad, o.akademisyenler),
    }));
    const ilkEslesen = eslesen.find((e) => e.akademisyen);
    const mevcut = mevcutDersBul(d, o.donem, o.mevcutDersler);
    return {
      ...d,
      secili: true,
      // Belgedeki öğretim elemanı sütunu TEK addır; ders kaydı birden çok
      // hoca tutabilse de (bkz. lib/ders-egitmenleri.js) belgede çok
      // kişi varsa ilki seçili gelir, hepsi listede durur ve değiştirilebilir.
      professor: ilkEslesen
        ? ilkEslesen.akademisyen.name
        : d.ogretimElemanlari[0]
          ? unvaniSoy(d.ogretimElemanlari[0])
          : '',
      eslesenler: eslesen,
      eslesmeyen: eslesen.filter((e) => !e.akademisyen).map((e) => e.belgedeki),
      donem: o.donem || '',
      seviye: o.seviye || 'lisans',
      bolognaLink: o.bolognaLink || '',
      mevcutId: mevcut ? mevcut.id : null,
      durum: mevcut ? 'guncelle' : 'yeni',
    };
  });
}

/** Bir satırın kaydedilmeye hazır olup olmadığı; değilse eksik alan adları. */
export function eksikAlanlar(satir) {
  const s = satir || {};
  const eksik = [];
  if (!duzMetin(s.kod)) eksik.push('ders kodu');
  if (!duzMetin(s.ad)) eksik.push('ders adı');
  if (s.statu !== 'Z' && s.statu !== 'S') eksik.push('Z/S');
  if (!(Number(s.akts) > 0)) eksik.push('AKTS');
  if (s.donem !== 'guz' && s.donem !== 'bahar') eksik.push('dönem');
  if (!duzMetin(s.seviye)) eksik.push('seviye');
  if (!duzMetin(s.bolognaLink)) eksik.push('Bologna linki');
  return eksik;
}
