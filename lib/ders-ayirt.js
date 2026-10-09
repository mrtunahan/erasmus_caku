// ══════════════════════════════════════════════════════════════
// AYNI DERSİN ŞUBELERİ VE MÜFREDATLARI — AYIRT ETME VE BİRLEŞTİRME
//
// Bir ders iki ayrı müfredatta bulunabilir ve her birinde iki şubeye
// bölünebilir: aynı ad (çoğu zaman aynı kod) DÖRT ayrı ders kaydıdır
// (`sinav_dersler`). Yoklama açısından iki sorun doğuruyordu:
//
//   1) AYIRT EDİLEMİYORDU. Hoca dört kaydın ikisini veriyorsa ekranda iki
//      tane "FZK181" düğmesi çıkıyordu; hangisinin hangi şube olduğu belli
//      değildi, yanlış şubeye yoklama alınabiliyordu.
//   2) BİRLİKTE İŞLENEN DERS AYRI YOKLAMA İSTİYORDU. Eski ve yeni müfredatın
//      karşılığı aynı sınıfta, aynı saatte işlenir. Tek karekodla iki
//      kaydın öğrencileri yoklama veremiyordu: kodu açılan kayda kayıtlı
//      olmayan öğrenci "bu derse kayıtlı değilsiniz" alıyordu.
//
// (1) için etiket, aynı kodu taşıyan kayıtlar arasında FARKLI olan
// bilgiyle (şube, müfredat, sınıf, bölüm) genişletilir. (2) için
// "birlikte yoklama": hoca aynı dersin diğer kayıtlarını işaretler, sunucu
// her kayıt için ayrı ama ORTAK KODLU oturum açar (routes/yoklama.js).
// Devam listeleri yine kayıt başına ayrı kalır.
// ══════════════════════════════════════════════════════════════

const metin = (v) => String(v == null ? '' : v).trim();
const kucuk = (v) => metin(v).toLocaleLowerCase('tr-TR');

// ⚠ \b Türkçe harfte (ş) çalışmaz; sınır boşluk/satır başıyla kurulur.
const SUBE_RX =
  /\(\s*(?:şube|şb\.?|sube|grup)\s*:?\s*(\d+)\s*\)|(?:^|\s)(?:şb|sb)\.?\s*:?\s*(\d+)(?!\d)/i;

/** Dersin şubesi: `sube` alanı ya da addaki "(Şube 2)" eki. */
export function subeCoz(ders) {
  const d = ders || {};
  if (metin(d.sube)) return metin(d.sube);
  const m = SUBE_RX.exec(metin(d.name || d.ad));
  return m ? m[1] || m[2] : '';
}

/** Dersin müfredatı (kayıtta hangi alan doluysa). */
export function mufredatCoz(ders) {
  const d = ders || {};
  return metin(d.mufredat || d.mufredatYili || d.mufredatAdi || d.programYili || d.mufredatTipi);
}

/** Şube eki atılmış ad — aynı dersin kayıtlarını bulmak için. */
export function yalinDersAdi(ders) {
  return kucuk(metin((ders || {}).name || (ders || {}).ad).replace(SUBE_RX, ''))
    .replace(/\s+/g, ' ')
    .trim();
}

const dersKimligi = (d) => metin(d && (d.id || d._docId));
const dersKodu = (d) => metin(d && (d.code || d.kod)).toLocaleUpperCase('tr-TR');

/**
 * Ayırt edici etiketler: aynı kodu taşıyan kayıtlarda kod, kayıtlar
 * arasında FARKLI olan bilgiyle genişletilir. Tek kayıtlı kodda etiket
 * yalnız koddur (bugünkü görünüm değişmez).
 *
 * @param {object[]} dersler
 * @param {object} [o] { bolumAdi: (id)=>string }
 * @returns {Map<string,string>} dersId → etiket
 */
export function ayirtEdiciEtiketler(dersler, o) {
  const liste = (Array.isArray(dersler) ? dersler : []).filter(Boolean);
  const bolumAdi = (o && o.bolumAdi) || ((id) => id);
  const gruplar = new Map();
  liste.forEach((d) => {
    const k = dersKodu(d) || yalinDersAdi(d);
    if (!gruplar.has(k)) gruplar.set(k, []);
    gruplar.get(k).push(d);
  });
  const sonuc = new Map();
  gruplar.forEach((grup) => {
    grup.forEach((d, i) => {
      const temel = metin(d.code || d.kod) || metin(d.name || d.ad);
      if (grup.length === 1) {
        sonuc.set(dersKimligi(d), temel);
        return;
      }
      const ozellikler = [
        { al: subeCoz, yaz: (v) => 'Şb ' + v },
        { al: mufredatCoz, yaz: (v) => v + ' müf.' },
        { al: (x) => metin(x.sinif), yaz: (v) => v + '. sınıf' },
        { al: (x) => metin(x.departmentId), yaz: (v) => bolumAdi(v) || v },
      ];
      const ekler = [];
      ozellikler.forEach((oz) => {
        const degerler = new Set(grup.map((x) => oz.al(x)));
        const v = oz.al(d);
        if (degerler.size > 1 && v) ekler.push(oz.yaz(v));
      });
      // Hiçbir alan ayırt etmiyorsa sıra numarası: en azından iki düğme farklı.
      if (ekler.length === 0) ekler.push('#' + (i + 1));
      sonuc.set(dersKimligi(d), temel + ' (' + ekler.join(' · ') + ')');
    });
  });
  return sonuc;
}

/**
 * Bu dersle BİRLİKTE yoklaması alınabilecek (aynı dersin başka şube ya da
 * müfredat kaydı) dersler: aynı kod ya da aynı yalın ad. Kendisi hariç.
 */
export function birlikteAlinabilecekler(ders, dersler) {
  const id = dersKimligi(ders);
  const kod = dersKodu(ders);
  const ad = yalinDersAdi(ders);
  return (Array.isArray(dersler) ? dersler : []).filter((d) => {
    if (!d || dersKimligi(d) === id) return false;
    return (kod && dersKodu(d) === kod) || (ad && yalinDersAdi(d) === ad);
  });
}
