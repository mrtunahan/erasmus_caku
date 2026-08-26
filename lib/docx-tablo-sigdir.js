// ══════════════════════════════════════════════════════════════
// ÜRETİLEN .docx TABLOLARINI SAYFAYA SIĞDIR
//
// Şablonlardaki ders tabloları çoğu zaman sayfanın yazım alanından geniş
// hazırlanıyor: iki kurumun dersleri yan yana konunca 8–9 sütun oluyor ve
// tablo kâğıdın sağ kenarından taşıyor. Taşan sütunlar önizlemede kırpılıyor,
// Word'de ve yazıcıda da sayfa dışında kalıyordu.
//
// Uyarı yazmak çözüm değil: belgeyi ÜRETEN biziz, sığdırmak da bize düşer.
// Burada Word'ün "Otomatik Sığdır → Pencereye Sığdır" davranışının aynısı
// yapılır: sütun genişlikleri ORANTILI olarak küçültülür, toplam yazım
// alanına eşitlenir. Metin dar sütunda alt satıra kayar — satır yükselir ama
// hiçbir sütun sayfa dışında kalmaz.
//
// ── NEDEN ORANTILI ──
// Tek bir sütunu daraltmak tabloyu çarpıtır: "Adı" sütunu ile "AKTS" sütunu
// aynı oranda daralınca tablo şablondaki görünümünü korur.
//
// ── DOKUNULMAYANLAR ──
//   • Sayfaya SIĞAN tablo — hiç ellenmez (belgelerin çoğu böyle).
//   • Yüzde (`pct`) genişlikli hücreler — zaten sayfaya göreli.
//   • İç içe tablolar — genişlikleri dış hücreye göredir, dış tablo
//     küçülünce onlar da küçülür.
// ══════════════════════════════════════════════════════════════

/** Bir XML parçasındaki ilk `<etiket … w:w="N" …/>` değerini sayı olarak verir. */
function nitelikSayisi(parca, desen) {
  const m = String(parca || '').match(desen);
  if (!m) return null;
  const n = parseInt(m[1], 10);
  return Number.isFinite(n) ? n : null;
}

/**
 * Belgenin yazım alanı genişliği (twip): sayfa genişliği − sol/sağ kenar.
 *
 * Gövde bölümünün ayarı `</w:body>` öncesindeki SON `w:sectPr`dir; bölüm
 * sonu olan belgelerde önceki sectPr'ler ara bölümleri anlatır.
 * Bulunamazsa A4 dikey varsayılır (11906 twip, 1440 kenar) — uydurma değil,
 * Word'ün kendi varsayılanı.
 */
export function sayfaYazimGenisligi(xml) {
  const metin = String(xml || '');
  const sectPrler = metin.match(/<w:sectPr\b[\s\S]*?<\/w:sectPr>/g) || [];
  const sect = sectPrler.length ? sectPrler[sectPrler.length - 1] : '';
  const genislik = nitelikSayisi(sect, /<w:pgSz\b[^>]*\sw:w="(\d+)"/) || 11906;
  const sol = nitelikSayisi(sect, /<w:pgMar\b[^>]*\sw:left="(\d+)"/);
  const sag = nitelikSayisi(sect, /<w:pgMar\b[^>]*\sw:right="(\d+)"/);
  const kullanilabilir = genislik - (sol === null ? 1440 : sol) - (sag === null ? 1440 : sag);
  return kullanilabilir > 0 ? kullanilabilir : 0;
}

/** Tablonun ızgara genişliği ve sol girintisi (twip). */
export function tabloOlculeri(tabloXml) {
  const metin = String(tabloXml || '');
  // Yalnız BU tablonun ızgarası: iç içe tabloların gridCol'ları sayılmasın.
  const izgara = metin.match(/<w:tblGrid\b[\s\S]*?<\/w:tblGrid>/);
  let toplam = 0;
  if (izgara) {
    const sutunlar = izgara[0].match(/<w:gridCol\b[^>]*\sw:w="(\d+)"/g) || [];
    sutunlar.forEach((s) => {
      const n = nitelikSayisi(s, /w:w="(\d+)"/);
      if (n) toplam += n;
    });
  }
  const girinti = nitelikSayisi(metin, /<w:tblInd\b[^>]*\sw:w="(-?\d+)"[^>]*w:type="dxa"/) || 0;
  return { izgara: toplam, girinti: girinti > 0 ? girinti : 0 };
}

/**
 * Bir tablonun sütunlarını orantılı küçülterek yazım alanına sığdırır.
 * Sığıyorsa XML AYNEN döner (dokunulmaz).
 */
export function tabloyuSigdir(tabloXml, kullanilabilir) {
  const metin = String(tabloXml || '');
  if (!(kullanilabilir > 0)) return metin;
  const { izgara, girinti } = tabloOlculeri(metin);
  const toplam = izgara + girinti;
  if (!(izgara > 0) || toplam <= kullanilabilir) return metin;

  const oran = kullanilabilir / izgara;
  const olcekle = (n) => Math.max(1, Math.floor(n * oran));

  let out = metin;
  // 1) Izgara sütunları
  out = out.replace(/(<w:gridCol\b[^>]*\sw:w=")(\d+)(")/g, (_, a, n, c) => a + olcekle(+n) + c);
  // 2) Hücre genişlikleri — yalnız `dxa` (twip) olanlar; `pct` zaten göreli.
  out = out.replace(
    /(<w:tcW\b[^>]*\sw:w=")(\d+)("[^>]*\sw:type="dxa")/g,
    (_, a, n, c) => a + olcekle(+n) + c
  );
  out = out.replace(
    /(<w:tcW\b[^>]*\sw:type="dxa"[^>]*\sw:w=")(\d+)(")/g,
    (_, a, n, c) => a + olcekle(+n) + c
  );
  // 3) Tablo genişliği
  out = out.replace(
    /(<w:tblW\b[^>]*\sw:w=")(\d+)("[^>]*\sw:type="dxa")/g,
    () => '<w:tblW w:w="' + kullanilabilir + '" w:type="dxa"'
  );
  // 4) Sol girinti sıfırlanır: taşmanın bir kısmı girintiden geliyordu ve
  //    daraltılmış tablonun ayrıca içeri kaydırılmasının anlamı yok.
  out = out.replace(/<w:tblInd\b[^>]*\/>/g, '<w:tblInd w:w="0" w:type="dxa"/>');
  // 5) Genişlikler artık kesin: Word'ün içeriğe göre yeniden hesaplayıp
  //    tabloyu tekrar genişletmesini engelle.
  if (!/<w:tblLayout\b/.test(out)) {
    out = out.replace(/(<w:tblPr\b[^>]*>)/, '$1<w:tblLayout w:type="fixed"/>');
  } else {
    out = out.replace(/<w:tblLayout\b[^>]*\/>/g, '<w:tblLayout w:type="fixed"/>');
  }
  return out;
}

/**
 * Belgedeki ÜST DÜZEY tabloların hepsini sayfaya sığdırır.
 * İç içe tablolara dokunulmaz: genişlikleri dış hücreye göredir ve dış tablo
 * küçülünce onlar da küçülür.
 */
export function tablolariSayfayaSigdir(xml) {
  const metin = String(xml || '');
  const kullanilabilir = sayfaYazimGenisligi(metin);
  if (!(kullanilabilir > 0)) return metin;

  const AC = /<w:tbl(?=[\s>])/g;
  const parcalar = [];
  let imlec = 0;
  let m;
  AC.lastIndex = 0;
  while ((m = AC.exec(metin)) !== null) {
    const bas = m.index;
    if (bas < imlec) continue; // iç içe tablo — dış tabloyla birlikte işlendi
    const son = tabloSonu(metin, bas);
    if (son < 0) break;
    parcalar.push(metin.slice(imlec, bas));
    parcalar.push(tabloyuSigdir(metin.slice(bas, son), kullanilabilir));
    imlec = son;
    AC.lastIndex = son;
  }
  if (!parcalar.length) return metin;
  parcalar.push(metin.slice(imlec));
  return parcalar.join('');
}

/** `<w:tbl>` bloğunun bittiği indeks (iç içe tabloları sayarak). */
function tabloSonu(metin, bas) {
  const RX = /<w:tbl(?=[\s>])|<\/w:tbl>/g;
  RX.lastIndex = bas;
  let derinlik = 0;
  let m;
  while ((m = RX.exec(metin)) !== null) {
    if (m[0] === '</w:tbl>') {
      derinlik -= 1;
      if (derinlik === 0) return m.index + '</w:tbl>'.length;
    } else {
      derinlik += 1;
    }
  }
  return -1;
}
