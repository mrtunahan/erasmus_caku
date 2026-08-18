// ══════════════════════════════════════════════════════════════
// XLSX IZGARA ŞABLONU — SABİT TABLOYU DOLDURMA
//
// Ders programı çıktısı, fakültenin elle tuttuğu tabloyla AYNI olmalı:
//
//        │ {{Gün}}   │ {{Ders Saati}} │ M10Z04 │ M11101 │ … │  ← derslikler
//        ├───────────┼────────────────┼────────┼────────┼───┤
//        │ Pazartesi │ 08:30 - 09:15  │        │ FZK181 │   │
//        │           │ 09:30 - 10:15  │ MAT242 │        │   │
//
// Yani SÜTUN = DERSLİK, SATIR = gün + ders saati, hücre = ders kodu.
// Bu tablo satır çoğaltmayla üretilemez (kaç ders varsa o kadar satır değil,
// sabit bir ızgara); bu yüzden şablondaki hücreler ADRESLENİR:
//
//   1) Başlık satırı `{{Gün}}` ve `{{Ders Saati}}` yer tutucularından bulunur.
//   2) O satırda bu ikisinin SAĞINDA kalan her dolu hücre bir DERSLİKTİR.
//   3) Altındaki satırlarda gün sütunu (birleşik hücre) ve saat sütunu okunur.
//   4) Bir dersin yeri = (gün satırı ∩ derslik sütunu).
//
// ── DOLU VE BOYALI HÜCRELERE DOKUNULMAZ ──
// Şablonda elle yazılmış alanlar olur: ortak zorunlu dersler (sarı), öğle
// arası (yeşil). Bunlar kurumun kararıdır; sistem üzerlerine yazmaz. Ölçüt
// ikilidir — hücrede metin varsa ya da hücre BOYALIYSA atlanır.
// ══════════════════════════════════════════════════════════════

/** Karşılaştırma için sadeleştirme: kasa, boşluk, tire ve noktalama atılır. */
export function sadeAd(metin) {
  return String(metin == null ? '' : metin)
    .replace(/İ/g, 'i')
    .replace(/I/g, 'ı')
    .toLocaleLowerCase('tr-TR')
    .replace(/[^0-9a-zçğıöşü]/g, '');
}

/**
 * Bir derslik başlığının EŞLEŞEBİLECEĞİ adlar.
 *
 * Başlıklar iki biçimde yazılıyor:
 *   'M10Z04\n(T45 - S25)'        → derslik M10Z04, parantezde kapasite
 *   'Bilgisayar Kat1 \n(M111BL)' → derslik "Bilgisayar Kat1", parantezde kodu
 * Hangisinin ad hangisinin kod olduğu baştan bilinemez; ikisi de aday sayılır
 * ve sistemdeki derslik adı hangisine uyarsa o sütun kullanılır.
 */
export function derslikAdaylari(baslik) {
  const ham = String(baslik == null ? '' : baslik);
  const adaylar = [];
  const ekle = (v) => {
    const s = sadeAd(v);
    if (s && !adaylar.includes(s)) adaylar.push(s);
  };
  // Parantez içi ayrı bir aday
  const parantez = ham.match(/\(([^)]*)\)/);
  if (parantez) ekle(parantez[1]);
  // Parantezsiz ilk satır asıl addır
  ekle(ham.replace(/\([^)]*\)/g, '').split(/[\r\n]/)[0]);
  // Tüm metin de aday (tek parça yazılmış başlıklar için)
  ekle(ham);
  return adaylar;
}

/** 'C7' → { sutun: 'C', satir: 7 }; çözülemezse null. */
export function refCoz(ref) {
  const m = /^([A-Z]+)(\d+)$/.exec(String(ref || '').toUpperCase());
  return m ? { sutun: m[1], satir: Number(m[2]) } : null;
}

/** 'A' → 0, 'Z' → 25, 'AA' → 26 */
export function sutunIndeksi(sutun) {
  let n = 0;
  const s = String(sutun || '').toUpperCase();
  for (let i = 0; i < s.length; i++) n = n * 26 + (s.charCodeAt(i) - 64);
  return n - 1;
}

/** 0 → 'A', 26 → 'AA' */
export function sutunAdi(i) {
  let n = Number(i);
  if (!Number.isFinite(n) || n < 0) return 'A';
  let ad = '';
  n = Math.floor(n);
  do {
    ad = String.fromCharCode(65 + (n % 26)) + ad;
    n = Math.floor(n / 26) - 1;
  } while (n >= 0);
  return ad;
}

// Yer tutucu: yalnız çift süslü parantez.
const GUN_TOKEN = /\{\{\s*g[üu]n\s*\}\}/i;
const SAAT_TOKEN = /\{\{\s*ders\s*saati\s*\}\}/i;

/**
 * Şablonun ızgara yapısını çözer.
 *
 * @param {Object} hucreler { 'C7': { metin, boyali }, … }
 * @param {Array}  birlesikler ['C8:C17', …] — gün hücreleri birleşiktir
 * @returns {Object|null} { baslikSatiri, gunSutunu, saatSutunu, derslikler, satirlar }
 *   derslikler: [{ sutun, baslik, adaylar }]
 *   satirlar:   [{ satir, gun, saat }]
 *   Yapı bulunamazsa null (çağıran gömülü çıktıya düşer).
 */
export function izgaraCoz(hucreler, birlesikler) {
  const h = hucreler || {};
  let baslikSatiri = null;
  let gunSutunu = null;
  let saatSutunu = null;

  Object.entries(h).forEach(([ref, hucre]) => {
    const metin = (hucre && hucre.metin) || '';
    const c = refCoz(ref);
    if (!c) return;
    if (GUN_TOKEN.test(metin)) {
      gunSutunu = c.sutun;
      baslikSatiri = c.satir;
    } else if (SAAT_TOKEN.test(metin)) {
      saatSutunu = c.sutun;
      if (baslikSatiri == null) baslikSatiri = c.satir;
    }
  });
  if (baslikSatiri == null || !gunSutunu || !saatSutunu) return null;

  // Derslikler: başlık satırında saat sütununun SAĞINDA kalan dolu hücreler.
  const saatIdx = sutunIndeksi(saatSutunu);
  const derslikler = [];
  Object.entries(h).forEach(([ref, hucre]) => {
    const c = refCoz(ref);
    if (!c || c.satir !== baslikSatiri) return;
    if (sutunIndeksi(c.sutun) <= saatIdx) return;
    const baslik = (hucre && hucre.metin) || '';
    if (!String(baslik).trim()) return;
    derslikler.push({ sutun: c.sutun, baslik, adaylar: derslikAdaylari(baslik) });
  });
  derslikler.sort((a, b) => sutunIndeksi(a.sutun) - sutunIndeksi(b.sutun));
  if (derslikler.length === 0) return null;

  // Gün blokları: gün sütunundaki birleşik hücreler ('C8:C17' → 8..17).
  const gunAraliklari = [];
  (birlesikler || []).forEach((aralik) => {
    const [bas, son] = String(aralik).split(':');
    const b = refCoz(bas);
    const s = refCoz(son);
    if (!b || !s || b.sutun !== gunSutunu) return;
    const metin = ((h[bas] || {}).metin || '').trim();
    if (metin) gunAraliklari.push({ bas: b.satir, son: s.satir, gun: metin });
  });
  // Birleştirilmemiş gün hücreleri de olabilir (tek satırlık blok).
  Object.entries(h).forEach(([ref, hucre]) => {
    const c = refCoz(ref);
    if (!c || c.sutun !== gunSutunu || c.satir <= baslikSatiri) return;
    const metin = ((hucre && hucre.metin) || '').trim();
    if (!metin) return;
    if (gunAraliklari.some((g) => c.satir >= g.bas && c.satir <= g.son)) return;
    gunAraliklari.push({ bas: c.satir, son: c.satir, gun: metin });
  });

  // Veri satırları: saat sütununda değeri olan ve bir gün bloğuna düşen satırlar.
  const satirlar = [];
  Object.entries(h).forEach(([ref, hucre]) => {
    const c = refCoz(ref);
    if (!c || c.sutun !== saatSutunu || c.satir <= baslikSatiri) return;
    const saat = ((hucre && hucre.metin) || '').trim();
    if (!saat) return;
    const blok = gunAraliklari.find((g) => c.satir >= g.bas && c.satir <= g.son);
    if (!blok) return;
    satirlar.push({ satir: c.satir, gun: blok.gun, saat });
  });
  satirlar.sort((a, b) => a.satir - b.satir);
  if (satirlar.length === 0) return null;

  return { baslikSatiri, gunSutunu, saatSutunu, derslikler, satirlar };
}

/**
 * Saat etiketlerini karşılaştırılabilir hale getirir.
 * Şablonda '08:30 - 09:15', sistemde '08:30-09:15' yazıyor; ikisi aynı saat.
 */
export function saatAnahtari(etiket) {
  return String(etiket == null ? '' : etiket).replace(/\s+/g, '');
}

/**
 * Kayıtları ızgaradaki hücrelere yerleştirir.
 *
 * @param {Object} izgara   izgaraCoz çıktısı
 * @param {Object} hucreler { ref: { metin, boyali } } — dolu/boyalı denetimi için
 * @param {Array}  kayitlar [{ gun, saat, derslik, kod, renk }]
 * @returns {Object} { yazimlar: [{ ref, deger, renk }], atlanan: [...] }
 *   atlanan: yerleştirilemeyen kayıtlar ve SEBEBİ — sessizce düşürmek,
 *   yetkiliye eksik bir program vermek olurdu.
 */
export function yerlesimPlani(izgara, hucreler, kayitlar) {
  const h = hucreler || {};
  const yazimlar = [];
  const atlanan = [];
  if (!izgara) {
    (kayitlar || []).forEach((k) => atlanan.push({ ...k, sebep: 'izgara-yok' }));
    return { yazimlar, atlanan };
  }

  // (gün, saat) → satır
  const satirDizini = new Map();
  izgara.satirlar.forEach((s) => {
    satirDizini.set(sadeAd(s.gun) + '|' + saatAnahtari(s.saat), s.satir);
  });
  // derslik adayı → sütun
  const sutunDizini = new Map();
  izgara.derslikler.forEach((d) => {
    d.adaylar.forEach((a) => {
      if (!sutunDizini.has(a)) sutunDizini.set(a, d.sutun);
    });
  });

  // Aynı hücreye iki kayıt düşerse ikincisi atlanır: çakışma önlemi zaten
  // programda alınıyor, burada üzerine yazmak sessiz veri kaybı olurdu.
  const kullanilan = new Set();

  (kayitlar || []).forEach((k) => {
    const satir = satirDizini.get(sadeAd(k.gun) + '|' + saatAnahtari(k.saat));
    if (satir == null) {
      atlanan.push({ ...k, sebep: 'saat-yok' });
      return;
    }
    const sutun = sutunDizini.get(sadeAd(k.derslik));
    if (!sutun) {
      atlanan.push({ ...k, sebep: k.derslik ? 'derslik-yok' : 'derslik-bos' });
      return;
    }
    const ref = sutun + satir;
    const mevcut = h[ref] || {};
    // Şablonda elle yazılmış ya da BOYALI alan kurumun kararıdır — dokunulmaz.
    if (String(mevcut.metin || '').trim() || mevcut.boyali) {
      atlanan.push({ ...k, sebep: 'dolu-hucre', ref });
      return;
    }
    if (kullanilan.has(ref)) {
      atlanan.push({ ...k, sebep: 'hucre-kullanildi', ref });
      return;
    }
    kullanilan.add(ref);
    yazimlar.push({ ref, deger: k.kod, renk: k.renk });
  });

  return { yazimlar, atlanan };
}

/** Atlananları insan diline çevirir (uyarı metni için). */
export function atlananOzeti(atlanan) {
  const sebepler = {
    'saat-yok': 'şablonda o gün/saat satırı yok',
    'derslik-yok': 'şablonda o derslik sütunu yok',
    'derslik-bos': 'derse derslik atanmamış',
    'dolu-hucre': 'şablonda o hücre dolu ya da boyalı',
    'hucre-kullanildi': 'o hücreye başka bir ders yazıldı',
    'izgara-yok': 'şablonda ızgara bulunamadı',
  };
  const gruplar = {};
  (atlanan || []).forEach((a) => {
    const s = sebepler[a.sebep] || a.sebep;
    if (!gruplar[s]) gruplar[s] = [];
    gruplar[s].push(a.kod || '?');
  });
  return Object.entries(gruplar).map(([sebep, kodlar]) => ({
    sebep,
    kodlar,
    metin: `${kodlar.length} ders yazılamadı (${sebep}): ${[...new Set(kodlar)].slice(0, 8).join(', ')}${kodlar.length > 8 ? ' …' : ''}`,
  }));
}

// ══════════════════════════════════════════════════════════════
// ŞABLON XML'İ — OKUMA VE YAZMA
//
// Şablon kurumun kendi dosyasıdır: kenarlıkları, yazı tipleri, sütun
// genişlikleri, birleşik hücreleri onun eseridir. Bu yüzden dosya yeniden
// üretilmez, YERİNDE düzenlenir — yalnız boş hücrelere değer yazılır ve o
// hücrenin KENDİ biçimi korunup üstüne yalnız zemin rengi eklenir.
// ══════════════════════════════════════════════════════════════

const cozEntity = (s) =>
  String(s == null ? '' : s)
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&amp;/g, '&');

const kacisXml = (s) =>
  String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

/** xl/sharedStrings.xml → metin dizisi. */
export function paylasilanMetinler(xml) {
  return [...String(xml || '').matchAll(/<si>([\s\S]*?)<\/si>/g)].map((m) =>
    cozEntity([...m[1].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((x) => x[1]).join(''))
  );
}

/**
 * Zemini BOYALI olan biçim (xf) numaraları.
 *
 * Şablondaki sarı (ortak ders) ve yeşil (öğle arası) alanlar böyle bulunur;
 * bu hücrelere sistem yazmaz. Beyaz ve desensiz dolgular boyalı sayılmaz —
 * yoksa tablonun tamamı "dolu" görünürdü.
 */
export function boyaliStiller(stylesXml) {
  const s = String(stylesXml || '');
  const fillBlok = s.match(/<fills[^>]*>([\s\S]*?)<\/fills>/);
  const fills = fillBlok ? [...fillBlok[1].matchAll(/<fill>([\s\S]*?)<\/fill>|<fill\/>/g)] : [];
  const boyaliFill = new Set();
  fills.forEach((m, i) => {
    const f = m[1] || '';
    if (!/patternType="solid"/.test(f)) return;
    // Beyaz zemin boya sayılmaz.
    const rgb = f.match(/<fgColor rgb="(?:FF)?([0-9A-Fa-f]{6})"/);
    if (rgb && rgb[1].toUpperCase() === 'FFFFFF') return;
    const tema = f.match(/<fgColor theme="(\d+)"/);
    // theme 0 = arka plan (beyaz); tint yoksa boya değildir.
    if (tema && tema[1] === '0' && !/tint=/.test(f)) return;
    boyaliFill.add(i);
  });
  const xfBlok = s.match(/<cellXfs[^>]*>([\s\S]*?)<\/cellXfs>/);
  const xfler = xfBlok ? xfBlok[1].match(/<xf\b[^>]*\/>|<xf\b[^>]*>[\s\S]*?<\/xf>/g) || [] : [];
  const boyali = new Set();
  xfler.forEach((xf, i) => {
    const m = /fillId="(\d+)"/.exec(xf);
    if (m && boyaliFill.has(Number(m[1]))) boyali.add(i);
  });
  return boyali;
}

/** Sayfadaki birleşik hücre aralıkları. */
export function birlesikAraliklar(sheetXml) {
  return [...String(sheetXml || '').matchAll(/<mergeCell ref="([^"]+)"/g)].map((m) => m[1]);
}

/**
 * Sayfayı hücre haritasına çevirir: { ref: { metin, boyali, stil } }.
 * Metin hem paylaşılan tablodan (t="s") hem satır içinden (inlineStr / str)
 * okunur — şablonlar iki biçimi de kullanabiliyor.
 */
export function sayfaHucreleri(sheetXml, strings, boyaliSet) {
  const hucreler = {};
  const dizi = strings || [];
  const boyali = boyaliSet || new Set();
  const rx = /<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g;
  let m;
  while ((m = rx.exec(String(sheetXml || ''))) !== null) {
    const oz = m[1] || '';
    const ic = m[2] || '';
    const ref = (/\sr="([A-Z]+\d+)"/.exec(oz) || [])[1];
    if (!ref) continue;
    const stil = Number((/\ss="(\d+)"/.exec(oz) || [])[1] || 0);
    const tip = (/\st="(\w+)"/.exec(oz) || [])[1] || '';
    let metin = '';
    if (tip === 's') {
      const v = /<v>(\d+)<\/v>/.exec(ic);
      if (v) metin = dizi[Number(v[1])] || '';
    } else if (tip === 'inlineStr') {
      metin = cozEntity([...ic.matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((x) => x[1]).join(''));
    } else {
      const v = /<v>([\s\S]*?)<\/v>/.exec(ic);
      if (v) metin = cozEntity(v[1]);
    }
    hucreler[ref] = { metin, stil, boyali: boyali.has(stil) };
  }
  return hucreler;
}

/**
 * Şablonun stil sayfasına RENKLİ biçimler ekler.
 *
 * Her istek bir (temel biçim, renk) çiftidir: hücrenin KENDİ biçimi (kenarlık,
 * hizalama, yazı tipi) korunur, yalnız dolgusu değiştirilir. Böylece yazılan
 * hücre şablonun geri kalanıyla aynı görünür.
 *
 * @param {Array} istekler [{ temelStil: number, renk: '#5B9BD5' }]
 * @returns {{ xml: string, harita: Map }} harita: 'temelStil|RENK' → yeni xf no
 */
export function renkliStilEkle(stylesXml, istekler) {
  const s = String(stylesXml || '');
  const harita = new Map();
  const liste = (istekler || [])
    .map((i) => {
      const m = /^#?([0-9A-Fa-f]{6})$/.exec(String((i && i.renk) || '').trim());
      return m ? { temelStil: Number(i.temelStil) || 0, argb: 'FF' + m[1].toUpperCase() } : null;
    })
    .filter(Boolean);
  if (liste.length === 0) return { xml: s, harita };

  const fillBlok = s.match(/(<fills[^>]*>)([\s\S]*?)(<\/fills>)/);
  const xfBlok = s.match(/(<cellXfs[^>]*>)([\s\S]*?)(<\/cellXfs>)/);
  if (!fillBlok || !xfBlok) return { xml: s, harita };

  const mevcutFills = fillBlok[2].match(/<fill>[\s\S]*?<\/fill>|<fill\/>/g) || [];
  const mevcutXfler = xfBlok[2].match(/<xf\b[^>]*\/>|<xf\b[^>]*>[\s\S]*?<\/xf>/g) || [];

  const yeniFills = [];
  const fillNo = new Map();
  const yeniXfler = [];

  liste.forEach(({ temelStil, argb }) => {
    const anahtar = temelStil + '|' + argb;
    if (harita.has(anahtar)) return;
    if (!fillNo.has(argb)) {
      fillNo.set(argb, mevcutFills.length + yeniFills.length);
      yeniFills.push(
        '<fill><patternFill patternType="solid"><fgColor rgb="' +
          argb +
          '"/><bgColor indexed="64"/></patternFill></fill>'
      );
    }
    // Temel biçimi kopyala, yalnız dolgusunu değiştir.
    const temel = mevcutXfler[temelStil] || '<xf numFmtId="0" fontId="0" fillId="0" borderId="0"/>';
    let yeni = temel.replace(/\sfillId="\d+"/, ' fillId="' + fillNo.get(argb) + '"');
    if (!/fillId="/.test(yeni)) {
      yeni = yeni.replace(/^<xf\b/, '<xf fillId="' + fillNo.get(argb) + '"');
    }
    if (!/applyFill="1"/.test(yeni)) {
      yeni = yeni.replace(/^<xf\b/, '<xf applyFill="1"');
    }
    harita.set(anahtar, mevcutXfler.length + yeniXfler.length);
    yeniXfler.push(yeni);
  });

  let xml = s;
  if (yeniFills.length) {
    xml = xml.replace(
      /(<fills)([^>]*)(>)([\s\S]*?)(<\/fills>)/,
      (_, a, oz, b, ic, kapa) =>
        a +
        oz.replace(/\scount="\d+"/, ' count="' + (mevcutFills.length + yeniFills.length) + '"') +
        b +
        ic +
        yeniFills.join('') +
        kapa
    );
  }
  xml = xml.replace(
    /(<cellXfs)([^>]*)(>)([\s\S]*?)(<\/cellXfs>)/,
    (_, a, oz, b, ic, kapa) =>
      a +
      oz.replace(/\scount="\d+"/, ' count="' + (mevcutXfler.length + yeniXfler.length) + '"') +
      b +
      ic +
      yeniXfler.join('') +
      kapa
  );
  return { xml, harita };
}

/**
 * Hücrelere değer yazar — şablonun geri kalanına dokunmadan.
 *
 * Var olan `<c>` düğümü değiştirilir, yoksa satıra SÜTUN SIRASINDA eklenir
 * (Excel hücrelerin sıralı olmasını bekler). Değer inlineStr yazılır:
 * paylaşılan metin tablosuna dokunmak, şablondaki tüm dizinleri kaydırırdı.
 *
 * @param {Array} yazimlar [{ ref, deger, stil }] — stil: yeni xf no (varsa)
 */
export function hucreleriYaz(sheetXml, yazimlar) {
  let xml = String(sheetXml || '');
  const satirBazli = new Map();
  (yazimlar || []).forEach((y) => {
    const c = refCoz(y.ref);
    if (!c) return;
    if (!satirBazli.has(c.satir)) satirBazli.set(c.satir, []);
    satirBazli.get(c.satir).push({ ...y, sutun: c.sutun });
  });

  satirBazli.forEach((liste, satirNo) => {
    const rx = new RegExp('<row\\b[^>]*\\sr="' + satirNo + '"[^>]*>[\\s\\S]*?</row>');
    const m = rx.exec(xml);
    if (!m) return;
    let satir = m[0];
    liste.forEach((y) => {
      const stilOz = y.stil != null ? ' s="' + y.stil + '"' : '';
      const yeniHucre =
        '<c r="' +
        y.ref +
        '"' +
        stilOz +
        ' t="inlineStr"><is><t xml:space="preserve">' +
        kacisXml(y.deger) +
        '</t></is></c>';
      const varRx = new RegExp('<c\\b[^>]*\\sr="' + y.ref + '"(?:\\s*/>|[^>]*>[\\s\\S]*?</c>)');
      if (varRx.test(satir)) {
        satir = satir.replace(varRx, yeniHucre);
        return;
      }
      // Yok: sütun sırasına göre araya sok.
      const hedef = sutunIndeksi(y.sutun);
      const hucreler = [...satir.matchAll(/<c\b[^>]*\/>|<c\b[^>]*>[\s\S]*?<\/c>/g)];
      const sonraki = hucreler.find((h) => {
        const r = (/\sr="([A-Z]+)\d+"/.exec(h[0]) || [])[1];
        return r && sutunIndeksi(r) > hedef;
      });
      if (sonraki) {
        satir = satir.slice(0, sonraki.index) + yeniHucre + satir.slice(sonraki.index);
      } else {
        satir = satir.replace(/<\/row>$/, yeniHucre + '</row>');
      }
    });
    xml = xml.slice(0, m.index) + satir + xml.slice(m.index + m[0].length);
  });
  return xml;
}

/**
 * Izgara işaretçilerinin YAZDIRILACAK karşılıkları.
 *
 * `{{Gün}}` ve `{{Ders Saati}}` şablonda yapıyı bulmak için durur; çıktıda
 * yer tutucu olarak kalmamalı, sütun başlığı olarak okunmalıdır. Künyeyle
 * birlikte doldurulur, yoksa başlık satırı boş çıkar.
 */
export const IZGARA_BASLIKLARI = { Gün: 'Gün', 'Ders Saati': 'Ders Saati' };

/**
 * Yer tutucuları (künye) şablonda değiştirir.
 * Yalnız paylaşılan metin tablosuna dokunur; ızgara hücreleri etkilenmez.
 * Karşılığı verilmeyen yer tutucu SİLİNİR — doldurulmamış alan belgede
 * "{{Hazırlayan}}" diye görünmesin.
 */
export function kunyeDoldur(sharedXml, degerler) {
  const d = { ...IZGARA_BASLIKLARI, ...(degerler || {}) };
  return String(sharedXml || '').replace(/<t([^>]*)>([\s\S]*?)<\/t>/g, (tam, oz, ic) => {
    const duz = cozEntity(ic);
    if (duz.indexOf('{{') < 0) return tam;
    const yeni = duz.replace(/\{\{([^{}\n]+)\}\}/g, (tk, ad) => {
      const anahtar = sadeAd(ad);
      const bulunan = Object.keys(d).find((k) => sadeAd(k) === anahtar);
      return bulunan ? String(d[bulunan] == null ? '' : d[bulunan]) : '';
    });
    return (
      '<t' +
      (/xml:space/.test(oz) ? oz : oz + ' xml:space="preserve"') +
      '>' +
      kacisXml(yeni) +
      '</t>'
    );
  });
}
