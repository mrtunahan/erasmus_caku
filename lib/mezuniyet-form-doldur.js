// ══════════════════════════════════════════════════════════════
// KURUMUN MEZUNİYET FORMUNU DOLDURMA (Formlar'daki .docx)
//
// Form OLDUĞU GİBİ doldurulur: satır, sütun ya da paragraf EKLENMEZ.
//   • Kimlik tablosu: "Adı ve Soyadı", "Öğrenci No", "Bölümü", "Telefon",
//     "Adres", "e-posta" etiketli satırların yanındaki BOŞ hücre doldurulur.
//   • "………… MÜHENDİSLİĞİ BÖLÜM BAŞKANLIĞINA" başlığındaki noktalar bölüm
//     adıyla değiştirilir.
//   • "☐ … bulunmamaktadır" / "☐ … silinmesini istiyorum" kutularından
//     öğrencinin seçtiği işaretlenir (☐ → ☒; Word onay kutusu denetimi de).
//   • Başlığı "DERSİN KODU VE ADI" olan tablonun BOŞ satırları sırayla
//     silinecek derslerle dolar. Boş satırdan fazla ders varsa sığmayanlar
//     `sigmayan` olarak döner — form büyütülmez.
//
// Saf metin işlemidir (word/document.xml); tarayıcıda ve testte aynı çalışır.
// ══════════════════════════════════════════════════════════════

const metin = (v) => String(v == null ? '' : v).trim();

const xmlKacis = (s) =>
  String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
const xmlCoz = (s) =>
  String(s || '')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&');

/** Karşılaştırma anahtarı: Türkçe harf sadeleşir, harf/rakam dışı düşer. */
export function anahtar(s) {
  const h = { ç: 'c', ğ: 'g', ı: 'i', ö: 'o', ş: 's', ü: 'u', â: 'a', î: 'i', û: 'u' };
  return String(s || '')
    .replace(/İ/g, 'i')
    .replace(/I/g, 'ı')
    .toLocaleLowerCase('tr-TR')
    .replace(/[çğıöşüâîû]/g, (c) => h[c] || c)
    .replace(/[^a-z0-9]/g, '');
}

/** Bir XML parçasının görünen metni. */
export function gorunenMetin(xml) {
  const out = [];
  const re = /<w:t(?:\s[^>]*)?>([^<]*)<\/w:t>/g;
  let m;
  while ((m = re.exec(xml))) out.push(xmlCoz(m[1]));
  return out.join('');
}

/**
 * Üst düzey (iç içe olmayan) <tag>…</tag> bloklarını konumlarıyla bulur.
 * İç içe tablo/satır olabileceği için açılış/kapanış sayılarak eşlenir.
 */
function bloklar(xml, tag, bas, son) {
  // Kendiliğinden kapanan etiket (<w:p/>, <w:p w:rsidR="…"/>) tek başına bir
  // bloktur: Word boş paragrafı ve boş hücreyi böyle yazar. Bunu açılış
  // sanmak bir sonraki paragrafın kapanışıyla eşleştirip yapıyı bozardı.
  const acRe = new RegExp('<' + tag + '(?=[\\s>/])[^>]*?(/?)>', 'g');
  const kapa = '</' + tag + '>';
  const sonuc = [];
  const bitis = son == null ? xml.length : son;
  let i = bas || 0;
  while (i < bitis) {
    acRe.lastIndex = i;
    const a = acRe.exec(xml);
    if (!a || a.index >= bitis) break;
    if (a[1] === '/') {
      sonuc.push({ bas: a.index, son: a.index + a[0].length });
      i = a.index + a[0].length;
      continue;
    }
    let derinlik = 1;
    let j = a.index + a[0].length;
    while (derinlik > 0) {
      acRe.lastIndex = j;
      const ac = acRe.exec(xml);
      const kp = xml.indexOf(kapa, j);
      if (kp < 0) return sonuc;
      if (ac && ac.index < kp) {
        if (ac[1] !== '/') derinlik += 1;
        j = ac.index + ac[0].length;
      } else {
        derinlik -= 1;
        j = kp + kapa.length;
      }
    }
    sonuc.push({ bas: a.index, son: j });
    i = j;
  }
  return sonuc;
}

/**
 * Paragraftaki NOKTALI BOŞLUKLARI ("…………", "......") sırayla doldurur.
 * Word bir boşluğu birden çok run'a bölebilir ("……" + "….."); art arda
 * gelen nokta parçaları TEK boşluk sayılır, değer ilk parçaya yazılır,
 * kalan parçalar silinir. `degerler[i]` boşsa o boşluğa dokunulmaz.
 * @returns {{xml:string, doldurulan:number}}
 */
export function noktaliBosluklariDoldur(pXml, degerler) {
  const re = /(<w:t(?:\s[^>]*)?>)([^<]*)(<\/w:t>)/g;
  const parcalar = [];
  let m;
  while ((m = re.exec(pXml))) {
    parcalar.push({
      bas: m.index,
      son: m.index + m[0].length,
      ac: m[1],
      metin: xmlCoz(m[2]),
      kapa: m[3],
    });
  }
  // Karakter karakter: her karakterin hangi parçada olduğu ve nokta mı olduğu.
  const NOKTA = /[.…]/;
  const gruplar = []; // {karakterler: [{p, i}]}
  let acik = null;
  parcalar.forEach((pr, pi) => {
    for (let i = 0; i < pr.metin.length; i += 1) {
      const ch = pr.metin[i];
      if (NOKTA.test(ch)) {
        if (!acik) acik = { karakterler: [] };
        acik.karakterler.push({ p: pi, i });
      } else {
        if (acik) gruplar.push(acik);
        acik = null;
      }
    }
  });
  if (acik) gruplar.push(acik);
  // En az üç noktalı gruplar boşluktur (cümle sonu noktası değil).
  const bosluklar = gruplar.filter((g) => g.karakterler.length >= 3);
  const yeniMetin = parcalar.map((pr) => pr.metin.split(''));
  let doldurulan = 0;
  bosluklar.forEach((g, gi) => {
    const deger = metin((degerler || [])[gi]);
    if (!deger) return;
    g.karakterler.forEach((k, j) => {
      yeniMetin[k.p][k.i] = j === 0 ? deger : '';
    });
    doldurulan += 1;
  });
  if (!doldurulan) return { xml: pXml, doldurulan: 0 };
  let out = '';
  let son = 0;
  parcalar.forEach((pr, pi) => {
    out +=
      pXml.slice(son, pr.bas) +
      '<w:t xml:space="preserve">' +
      xmlKacis(yeniMetin[pi].join('')) +
      pr.kapa;
    son = pr.son;
  });
  out += pXml.slice(son);
  return { xml: out, doldurulan };
}

/** Hücrenin metnini değiştirir (ilk paragrafa yazar, diğer metinleri boşaltır). */
export function hucreyiDoldur(hucreXmlHam, deger) {
  const d = xmlKacis(deger);
  // Boş hücredeki kısa paragraf (<w:p/>) açılır ki içine yazılabilsin.
  const hucreXml = String(hucreXmlHam).replace(/<w:p((?:\s[^>]*?)?)\/>/, '<w:p$1></w:p>');
  const pBas = hucreXml.search(/<w:p[\s>]/);
  if (pBas < 0) return hucreXml;
  const pSon = hucreXml.indexOf('</w:p>', pBas);
  const p = hucreXml.slice(pBas, pSon);
  let yeniP;
  if (/<w:t(?:\s[^>]*)?>/.test(p)) {
    let ilk = true;
    yeniP = p.replace(/<w:t(?:\s[^>]*)?>[^<]*<\/w:t>/g, () => {
      const r = ilk ? '<w:t xml:space="preserve">' + d + '</w:t>' : '<w:t></w:t>';
      ilk = false;
      return r;
    });
  } else {
    // Boş paragraf: paragrafın yazı biçimi (pPr içindeki rPr) korunur.
    const rPr =
      (p.match(/<w:pPr>[\s\S]*?(<w:rPr>[\s\S]*?<\/w:rPr>)[\s\S]*?<\/w:pPr>/) || [])[1] || '';
    yeniP = p + '<w:r>' + rPr + '<w:t xml:space="preserve">' + d + '</w:t></w:r>';
  }
  let sonuc = hucreXml.slice(0, pBas) + yeniP + hucreXml.slice(pSon);
  // Değer hücrede DİKEYDE ORTALANIR: etiket hücresi ortalıyken değer üstte
  // kalınca satırda "yukarı kaymış" görünüyordu.
  if (/<w:tcPr>/.test(sonuc)) {
    sonuc = /<w:vAlign\b[^>]*\/>/.test(sonuc)
      ? sonuc.replace(/<w:vAlign\b[^>]*\/>/, '<w:vAlign w:val="center"/>')
      : sonuc.replace('</w:tcPr>', '<w:vAlign w:val="center"/></w:tcPr>');
  } else if (/<w:tcPr\/>/.test(sonuc)) {
    sonuc = sonuc.replace('<w:tcPr/>', '<w:tcPr><w:vAlign w:val="center"/></w:tcPr>');
  } else {
    sonuc = sonuc.replace(
      /^<w:tc((?:\s[^>]*)?)>/,
      '<w:tc$1><w:tcPr><w:vAlign w:val="center"/></w:tcPr>'
    );
  }
  return sonuc;
}

// Kimlik tablosu etiketleri → veri alanı.
const ETIKETLER = [
  { alan: 'adSoyad', anahtarlar: ['adivesoyadi', 'adisoyadi', 'adsoyad', 'adivesoyad'] },
  { alan: 'ogrenciNo', anahtarlar: ['ogrencino', 'ogrencinumarasi', 'numarasi', 'okulno'] },
  { alan: 'bolum', anahtarlar: ['bolumu', 'bolum', 'programi', 'bolumuprogrami'] },
  {
    alan: 'telefon',
    anahtarlar: ['telefon', 'telefonu', 'tel', 'cepTelefonu'.toLowerCase(), 'gsm'],
  },
  { alan: 'adres', anahtarlar: ['adres', 'adresi', 'ikametadresi'] },
  { alan: 'eposta', anahtarlar: ['eposta', 'epostaadresi', 'email', 'mail'] },
];

// Ders tablosu sütunları (başlık hücresi anahtarına göre).
function sutunAlani(a) {
  if (a.indexOf('kod') >= 0 || a.indexOf('dersinadi') >= 0 || a === 'dersadi') return 'kodAd';
  if (a.indexOf('yil') >= 0 && a.indexOf('yariyil') < 0) return 'yil';
  if (a.indexOf('yariyil') >= 0 || a.indexOf('donem') >= 0) return 'yariyil';
  if (a.indexOf('akts') >= 0 || a.indexOf('kredi') >= 0) return 'akts';
  if (a.indexOf('statu') >= 0 || a.indexOf('turu') >= 0) return 'statu';
  if (a.indexOf('not') === 0 || a.indexOf('harfnotu') >= 0) return 'not';
  return '';
}

const KUTU_DOLU = '☒';

/** Paragraftaki onay kutusunu işaretler (metin glifi, Word denetimi, Wingdings). */
function kutuyuIsaretle(pXml) {
  let p = pXml.replace(/(<w14:checked\s+w14:val=")(0|false)(")/g, '$11$3');
  p = p.replace(/(<w:t(?:\s[^>]*)?>[^<]*?)☐/, '$1' + KUTU_DOLU);
  // Wingdings kutusu (o / ¨) → işaretli kutu (þ)
  p = p.replace(
    /(<w:sym\s+w:font="Wingdings[^"]*"\s+w:char=")(F06F|F0A8|006F|00A8)(")/i,
    '$1F0FE$3'
  );
  return p;
}

/**
 * @param {string} xml   word/document.xml
 * @param {object} v
 * @param {string} v.adSoyad, v.ogrenciNo, v.bolum, v.telefon, v.adres, v.eposta
 * @param {string} v.bolumBaslik   başlıktaki noktaların yerine (örn. "BİLGİSAYAR")
 * @param {'yok'|'var'|''} v.silmeBeyani
 * @param {string} v.ogretimYili, v.donem   "… öğretim yılı … dönemi" boşlukları
 * @param {Array<{kod,ad,yil,yariyil,akts,statu,not}>} v.dersler
 * @returns {{xml:string, dolan:string[], bulunamayan:string[], sigmayan:Array, dersTablosu:boolean}}
 */
export function mezuniyetFormunuDoldur(xml, v) {
  const veri = v || {};
  let x = String(xml || '');
  const dolan = [];
  const sigmayan = [];
  let dersTablosu = false;

  // ── Tablolar (sondan başa: konumlar kaymasın) ──
  const tablolar = bloklar(x, 'w:tbl');
  for (let t = tablolar.length - 1; t >= 0; t -= 1) {
    const tb = tablolar[t];
    let tablo = x.slice(tb.bas, tb.son);
    const satirlar = bloklar(tablo, 'w:tr');
    const hucreler = satirlar.map((s) =>
      bloklar(tablo, 'w:tc', s.bas, s.son).map((h) => ({
        ...h,
        metin: gorunenMetin(tablo.slice(h.bas, h.son)),
      }))
    );
    const baslikSira = hucreler.findIndex((hs) =>
      hs.some((h) => anahtar(h.metin).indexOf('dersinkodu') >= 0)
    );
    const degisiklik = []; // {bas, son, yeni}
    if (baslikSira >= 0) {
      dersTablosu = true;
      const alanlar = hucreler[baslikSira].map((h) => sutunAlani(anahtar(h.metin)));
      const dersler = (veri.dersler || []).slice();
      for (let r = baslikSira + 1; r < hucreler.length && dersler.length; r += 1) {
        const hs = hucreler[r];
        if (hs.some((h) => metin(h.metin))) continue; // dolu satır (alt başlık vb.)
        const d = dersler.shift();
        hs.forEach((h, c) => {
          const alan = alanlar[c];
          if (!alan) return;
          const deger =
            alan === 'kodAd'
              ? [metin(d.kod), metin(d.ad)].filter(Boolean).join(' ')
              : metin(d[alan]);
          if (deger) degisiklik.push({ bas: h.bas, son: h.son, deger });
        });
      }
      dersler.forEach((d) => sigmayan.push(d));
      if (veri.dersler && veri.dersler.length) dolan.push('dersler');
    } else {
      hucreler.forEach((hs) => {
        for (let c = 0; c + 1 < hs.length; c += 1) {
          const a = anahtar(hs[c].metin);
          const e = ETIKETLER.find((k) => k.anahtarlar.indexOf(a) >= 0);
          if (!e) continue;
          const hedef = hs[c + 1];
          const deger = metin(veri[e.alan]);
          if (!deger || metin(hedef.metin)) continue;
          degisiklik.push({ bas: hedef.bas, son: hedef.son, deger });
          dolan.push(e.alan);
        }
      });
    }
    degisiklik
      .sort((a, b) => b.bas - a.bas)
      .forEach((dg) => {
        tablo =
          tablo.slice(0, dg.bas) +
          hucreyiDoldur(tablo.slice(dg.bas, dg.son), dg.deger) +
          tablo.slice(dg.son);
      });
    x = x.slice(0, tb.bas) + tablo + x.slice(tb.son);
  }

  // ── Paragraflar: başlıktaki noktalar ve onay kutuları ──
  const paragraflar = bloklar(x, 'w:p');
  for (let i = paragraflar.length - 1; i >= 0; i -= 1) {
    const pb = paragraflar[i];
    let p = x.slice(pb.bas, pb.son);
    const a = anahtar(gorunenMetin(p));
    let degisti = false;
    if (a.indexOf('baskanligina') >= 0 && metin(veri.bolumBaslik)) {
      const r = noktaliBosluklariDoldur(p, [veri.bolumBaslik]);
      if (r.doldurulan) {
        p = r.xml;
        dolan.push('bolumBaslik');
        degisti = true;
      }
    }
    // "………… öğretim yılı ……… dönemi sonu itibariyle …" — öğrencinin girdiği
    // öğretim yılı ve dönem.
    if (a.indexOf('ogretimyili') >= 0 && a.indexOf('donem') >= 0) {
      const r = noktaliBosluklariDoldur(p, [veri.ogretimYili, veri.donem]);
      if (r.doldurulan) {
        p = r.xml;
        dolan.push('donem');
        degisti = true;
      }
    }
    const yok = a.indexOf('bulunmamaktadir') >= 0 && a.indexOf('silinmesi') >= 0;
    const var_ = a.indexOf('silinmesiniistiyorum') >= 0;
    if ((yok && veri.silmeBeyani === 'yok') || (var_ && veri.silmeBeyani === 'var')) {
      const once = p;
      p = kutuyuIsaretle(p);
      if (p !== once) {
        dolan.push('beyan');
        degisti = true;
      }
    }
    if (degisti) x = x.slice(0, pb.bas) + p + x.slice(pb.son);
  }

  const beklenen = ['adSoyad', 'ogrenciNo', 'bolum', 'telefon', 'adres', 'eposta'].filter((k) =>
    metin(veri[k])
  );
  const bulunamayan = beklenen.filter((k) => dolan.indexOf(k) < 0);
  if (veri.silmeBeyani && dolan.indexOf('beyan') < 0) bulunamayan.push('beyan');
  if ((metin(veri.ogretimYili) || metin(veri.donem)) && dolan.indexOf('donem') < 0) {
    bulunamayan.push('donem');
  }
  return { xml: x, dolan, bulunamayan, sigmayan, dersTablosu };
}

/** "Bilgisayar Mühendisliği" → başlıktaki noktaların yerine "BİLGİSAYAR". */
export function bolumBasligi(bolumAdi, baslikMuhendislikIceriyor) {
  let s = metin(bolumAdi).toLocaleUpperCase('tr-TR');
  if (baslikMuhendislikIceriyor !== false) s = s.replace(/\s*MÜHENDİSLİĞİ\s*$/u, '');
  return s;
}
