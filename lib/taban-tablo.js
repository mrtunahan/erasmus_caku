// ══════════════════════════════════════════════════════════════
// TABAN PUAN TABLOSU — yapıştırılan/çıkarılan metni satırlara ayırır
//
// NEDEN AI DEĞİL: taban puanlar yılda BİR kez yayımlanan, ~50 satırlık,
// insanın gözüyle doğrulayabileceği küçük bir tablo. Her seferinde web'e
// çıkan bir model çalıştırmak hem pahalı hem kırılgandı — kurumlar aynı yıl
// için ÖNLİSANS / LİSANS / DGS listelerini ayrı ayrı yayımlıyor ve model
// yanlış listeyi açabiliyordu. Tabloyu İNSAN seçtiğinde o hata sınıfı
// tamamen ortadan kalkar; geriye kalan iş (satırı ikiye bölmek) düz koddur.
//
// Kabul edilen biçimler — hepsi tek bir kuralla çözülür:
//   "Bilgisayar Mühendisliği\t412,338"      (Excel / HTML tablo kopyası)
//   "Bilgisayar Mühendisliği    412,338"    (PDF metin katmanı kopyası)
//   "12  Bilgisayar Mühendisliği  85  412,338  380,125"  (sıra no + kontenjan)
//   "Bilgisayar Mühendisliği;412.338"       (CSV)
//
// KURAL: baştaki metin program adıdır; ONDALIKLI sayılar puan sütunlarıdır.
// Ondalıksız sayılar (sıra no, kontenjan, yerleşen) atılır.
//
// ⚠ HANGİ PUAN SÜTUNU TABAN? Kurumların çoğu "Taban | Tavan" sırasıyla
// yayımlıyor, ama hepsi değil. En sağdaki sayıyı almak TAVAN puanı taban
// sanmaya yol açıyordu; tavan daha yüksek olduğu için şartı sağlayan aday
// haksız yere elenirdi. Bu yüzden satırdaki TÜM puan sütunları saklanır,
// hangisinin taban olduğunu panel kullanıcıya sorar (tek seçim, tüm tabloya
// uygulanır). Varsayılan ilk sütundur: "Taban-Tavan" sıralaması yaygın
// olduğu için hem çoğunlukla doğru, hem de yanılırsa DAHA DÜŞÜK değeri
// seçmiş olur — sınırdaki adayı sessizce elemek yerine incelemeye bırakır.
//
// ⚠ Çıktı bir ÖNERİDİR. Panel satırları düzenlenebilir tabloda gösterir,
// kaydedilen değer yetkilinin onayladığıdır.
// ══════════════════════════════════════════════════════════════

// Puan gibi görünen belirteç: 412,338 · 412.338 · 85 · 380,12
// Binlik ayırıcı beklenmiyor — YKS puanları 4 basamağı geçmiyor.
const PUAN_KALIBI = /^\d{1,4}(?:[.,]\d{1,6})?$/;

// Satır atlanacak mı? Başlık, toplam, sayfa numarası, ayraç…
const ATLA_KALIPLARI = [
  /^[\s\-–—_=.·•|]*$/, // boş / yalnız ayraç
  /^(sayfa|page)\b/i,
  /^toplam\b/i,
  /taban\s*puan/i, // başlık satırı
  /program\s*ad/i,
  /^kontenjan\b/i,
  /^s(ıra|ira)\s*(no)?\b/i,
];

const PUAN_TURLERI = ['SAY', 'EA', 'SÖZ', 'SOZ', 'DİL', 'DIL', 'TYT', 'DGS'];

/** "412,338" → 412.338 ; okunamıyorsa null */
function puanSayi(s) {
  const n = parseFloat(String(s).replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

/**
 * Bir satırı belirteçlere ayırır. Sekme veya noktalı virgül varsa onlar
 * kullanılır (sütun sınırı kesin); yoksa 2+ boşluk, o da yoksa tek boşluk.
 */
function belirtecler(satir) {
  if (satir.includes('\t')) return satir.split('\t');
  if (satir.includes(';')) return satir.split(';');
  if (/ {2,}/.test(satir)) return satir.split(/ {2,}/);
  return satir.split(' ');
}

/**
 * Tek satırı çözer; çözemezse null.
 * @param {string} ham
 * @param {number} [puanSutunu=0] satırda birden çok puan varsa hangisi taban
 * @returns {{ad:string, taban:string, puanlar:string[], puanTuru:string}|null}
 */
export function tabanSatiriCoz(ham, puanSutunu) {
  const satir = String(ham == null ? '' : ham).trim();
  if (!satir) return null;
  if (ATLA_KALIPLARI.some((k) => k.test(satir))) return null;

  const parcalar = belirtecler(satir)
    .map((p) => p.trim())
    .filter((p) => p !== '');
  if (parcalar.length < 2) return null;

  // Puan sütunları: ONDALIKLI sayılar. Ondalıksızlar (sıra no, kontenjan,
  // yerleşen sayısı) puan değildir — taban puanlar her zaman ondalıklı
  // yayımlanıyor. "Dolmadı" gibi satırlar da böylece eleniyor.
  const puanIndeksleri = [];
  parcalar.forEach((p, i) => {
    if (PUAN_KALIBI.test(p) && /[.,]/.test(p)) {
      const n = puanSayi(p);
      if (n != null && n > 0) puanIndeksleri.push(i);
    }
  });
  if (puanIndeksleri.length === 0) return null;

  const ilkPuanIdx = puanIndeksleri[0];
  if (ilkPuanIdx === 0) return null; // satır puanla başlıyor → ad yok

  const puanlar = puanIndeksleri.map((i) => parcalar[i]);
  const sutun = Math.min(Math.max(0, Number(puanSutunu) || 0), puanlar.length - 1);
  const taban = puanlar[sutun];

  // Ad: İLK puandan önceki, sayı olmayan belirteçler. Baştaki sıra numarası
  // böylece düşer.
  const adParcalari = parcalar.slice(0, ilkPuanIdx).filter((p) => !PUAN_KALIBI.test(p));
  let ad = adParcalari.join(' ').replace(/\s+/g, ' ').trim();

  // Ad içine karışmış puan türü etiketi ayrı alana çıkar ("… (SAY)" / "… SAY")
  let puanTuru = '';
  const turEsleme = ad.match(/[([]?\b(SAY|EA|SÖZ|SOZ|DİL|DIL|TYT|DGS)\b[)\]]?\s*$/i);
  if (turEsleme) {
    const bulunan = turEsleme[1].toLocaleUpperCase('tr-TR');
    if (PUAN_TURLERI.includes(bulunan)) {
      puanTuru = bulunan === 'SOZ' ? 'SÖZ' : bulunan === 'DIL' ? 'DİL' : bulunan;
      ad = ad.slice(0, turEsleme.index).trim();
    }
  }

  // Ad sonundaki ayraç/noktalama artıkları
  ad = ad.replace(/[\s.:;,|·•\-–—]+$/, '').trim();
  if (ad.length < 3) return null; // "A 412,3" gibi gürültü

  return { ad, taban, puanlar, puanTuru };
}

/**
 * Serbest metinden (yapıştırma ya da PDF metin katmanı) taban puan satırları.
 *
 * @param {string} metin
 * @param {number} [puanSutunu=0] satırda birden çok puan varsa hangisi taban
 * @returns {{kayitlar:Array<{ad:string,taban:string,puanlar:string[],puanTuru:string}>,
 *            okunamayan:string[], toplamSatir:number, enCokPuanSutunu:number}}
 */
export function tabanTablosuCoz(metin, puanSutunu) {
  const satirlar = String(metin == null ? '' : metin).split(/\r?\n/);
  const kayitlar = [];
  const okunamayan = [];
  let toplamSatir = 0;
  // Aynı program iki kez geçerse (ör. tabloda tekrar eden başlık bloğu) ilki
  // kalır — sonrakini eklemek panelde ikizler oluşturuyordu.
  const gorulen = new Set();

  satirlar.forEach((s) => {
    const satir = s.trim();
    if (!satir) return;
    if (ATLA_KALIPLARI.some((k) => k.test(satir))) return;
    toplamSatir += 1;
    const k = tabanSatiriCoz(satir, puanSutunu);
    if (!k) {
      okunamayan.push(satir.slice(0, 120));
      return;
    }
    const anahtar = k.ad.toLocaleLowerCase('tr-TR');
    if (gorulen.has(anahtar)) return;
    gorulen.add(anahtar);
    kayitlar.push(k);
  });

  // Panel "hangi sütun taban?" sorusunu yalnız gerçekten birden çok puan
  // sütunu varsa sorar.
  const enCokPuanSutunu = kayitlar.reduce((m, k) => Math.max(m, (k.puanlar || []).length), 0);

  return { kayitlar, okunamayan, toplamSatir, enCokPuanSutunu };
}

/**
 * PDF'ten çıkarılan metin kullanılabilir mi, yoksa belge TARANMIŞ GÖRÜNTÜ mü?
 *
 * Taranmış PDF'te metin katmanı ya hiç yoktur ya da sayfa başına birkaç
 * karakterlik çöp bulunur. Bunu erken anlamak önemli: kullanıcıya "tablo
 * bulunamadı" demek yerine "bu PDF görüntüden oluşuyor" diyebilmek gerekiyor,
 * çünkü çözümü bambaşka.
 *
 * @param {string} metin çıkarılan metin
 * @param {number} sayfaSayisi
 */
export function metinKatmaniVarMi(metin, sayfaSayisi) {
  const s = String(metin == null ? '' : metin)
    .replace(/\s+/g, ' ')
    .trim();
  const sayfa = Math.max(1, Number(sayfaSayisi) || 1);
  // Sayfa başına 40 karakterin altı: metin katmanı yok sayılır. Gerçek bir
  // puan tablosunda sayfa başına yüzlerce karakter olur.
  return s.length / sayfa >= 40;
}
