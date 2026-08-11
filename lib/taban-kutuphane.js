// ══════════════════════════════════════════════════════════════
// TABAN PUAN KÜTÜPHANESİ — yıl ve liste türü başına saklanan tablolar
//
// Puanlar önce her modülün kendi panelinde tutuluyordu. Bu üç şeyi
// bozuyordu:
//   • Aynı tablo her modülde (dikey, yatay-merkezi) ve her bölümde yeniden
//     yapıştırılmak zorundaydı.
//   • Geçmiş yıl saklanamıyordu; yeni tablo eskisinin üzerine yazıyordu.
//   • Puanlar başka bir modülden kullanılamıyordu.
//
// Artık tablolar tek bir yerde durur (koleksiyon: taban_tablolari) ve her
// modül İSTEDİĞİ tablo(ları) seçip kullanır. Bir kayıt = bir kurumun bir
// yılına ait bir liste (ör. "2025 · DGS").
//
// ⚠ YIL SEÇİMİ NEDEN ÖNEMLİ: adayın şartı, YERLEŞTİĞİ YILIN taban puanına
// göre değerlendirilir. 2023'te yerleşen bir adayı 2025 tablosuyla ölçmek
// yanlış sonuç verir. Bu yüzden birden çok tablo seçildiğinde bu dosya
// hangi değerin nereden geldiğini KAYBETMEZ; her eşleşme kaynağını taşır.
// ══════════════════════════════════════════════════════════════

import { tabanKaydiBul } from './taban-puan.js';

export const LISTE_TURLERI = [
  { id: 'dgs', label: 'DGS (Dikey Geçiş)' },
  { id: 'lisans', label: 'Lisans (YKS/ÖSYS)' },
  { id: 'onlisans', label: 'Ön Lisans (YKS/ÖSYS)' },
  { id: 'diger', label: 'Diğer' },
];

export function listeTuruEtiketi(id) {
  const t = LISTE_TURLERI.find((x) => x.id === id);
  return t ? t.label : id || 'Liste';
}

/** Kütüphane kaydının görünen adı: "2025 · DGS (Dikey Geçiş)" */
export function tabloEtiketi(t) {
  if (!t) return '';
  if (t.ad) return t.ad;
  return [t.yil, listeTuruEtiketi(t.tur)].filter(Boolean).join(' · ');
}

/** Doc id: yıl + tür başına tek kayıt. Aynı yıl-tür ikinci kez eklenirse üzerine yazar. */
export function tabloAnahtari(yil, tur) {
  return String(yil || 'yilsiz') + '__' + String(tur || 'diger');
}

/**
 * Tabloları yeniden → eskiye sıralar. Yıl sayısal karşılaştırılır; yılı
 * olmayan kayıtlar sona düşer (silinmez — kullanıcı yılı sonradan girebilir).
 */
export function tablolariSirala(tablolar) {
  return (tablolar || []).slice().sort((a, b) => {
    const ya = parseInt(a && a.yil, 10);
    const yb = parseInt(b && b.yil, 10);
    if (Number.isFinite(ya) && Number.isFinite(yb) && ya !== yb) return yb - ya;
    if (Number.isFinite(ya) !== Number.isFinite(yb)) return Number.isFinite(ya) ? -1 : 1;
    return String((a && a.tur) || '').localeCompare(String((b && b.tur) || ''), 'tr');
  });
}

/**
 * Bir programı SEÇİLİ tabloların hepsinde arar.
 *
 * Her tablo için ayrı bir sonuç döner — birleştirip tek sayıya indirmiyoruz:
 * hangi yılın puanı olduğu, karşılaştırmanın kendisi kadar önemli.
 *
 * @param {Array} tablolar kütüphane kayıtları (seçili olanlar)
 * @param {string} programAd aranan program
 * @returns {Array<{tabloId:string, yil:string, tur:string, etiket:string,
 *   taban:string, tabanSira:string, bulunanAd:string, puansiz:boolean}>}
 */
export function programuTablolardaBul(tablolar, programAd) {
  const out = [];
  tablolariSirala(tablolar).forEach((t) => {
    if (!t) return;
    const satirlar = Array.isArray(t.satirlar) ? t.satirlar : [];
    const bulunan = tabanKaydiBul(satirlar, programAd);
    if (bulunan) {
      out.push({
        tabloId: String(t.id || t._docId || ''),
        yil: String(t.yil || ''),
        tur: String(t.tur || ''),
        etiket: tabloEtiketi(t),
        taban: String(bulunan.taban || ''),
        tabanSira: String(bulunan.tabanSira || ''),
        bulunanAd: String(bulunan.ad || ''),
        puansiz: false,
      });
      return;
    }
    // Puanı yayımlanmamış programlar ayrı listede duruyor; "bulunamadı" ile
    // "puanı yok" farklı şeyler ve akademisyene farklı şey söyler.
    const puansiz = tabanKaydiBul(Array.isArray(t.puansizlar) ? t.puansizlar : [], programAd);
    if (puansiz) {
      out.push({
        tabloId: String(t.id || t._docId || ''),
        yil: String(t.yil || ''),
        tur: String(t.tur || ''),
        etiket: tabloEtiketi(t),
        taban: '',
        tabanSira: '',
        bulunanAd: String(puansiz.ad || ''),
        puansiz: true,
      });
    }
  });
  return out;
}

/**
 * Birden çok tablo seçiliyken hangi değer kullanılsın?
 *
 * Kural: adayın yılı biliniyorsa O YILIN tablosu; yoksa değeri olan EN YENİ
 * tablo. Değeri olmayan (yayımlanmamış) eşleşmeler asla varsayılan seçilmez —
 * boş bir taban, karşılaştırmayı sessizce "belirsiz" yapardı.
 *
 * @param {Array} eslesmeler programuTablolardaBul çıktısı
 * @param {string} [adayYili] adayın yerleştiği yıl
 */
export function varsayilanEslesme(eslesmeler, adayYili) {
  // Değeri olan eşleşmeler: taban puan ya da taban başarı sırası. Yatay
  // geçişte şart sıra üzerinden işlediği için yalnız sırası olan bir tablo da
  // kullanılabilir olmalı.
  const liste = (eslesmeler || []).filter((e) => e && (e.taban || e.tabanSira));
  if (liste.length === 0) return null;
  const yil = String(adayYili || '').trim();
  if (yil) {
    const tam = liste.find((e) => e.yil === yil);
    if (tam) return tam;
  }
  // programuTablolardaBul zaten yeniden eskiye sıralı döndürüyor.
  return liste[0];
}

/**
 * BİR BAŞVURU için geçerli taban değerlerini çözer.
 *
 * ⚠ Yıl eşlemesi başvuru başınadır: aday, YERLEŞTİĞİ YILIN tablosuyla
 * ölçülür. 2023'te yerleşenle 2025'te yerleşen aynı programa başvursa bile
 * farklı yılların taban puanına bakılır; program başına tek bir değer bu
 * ayrımı taşıyamaz.
 *
 * ⚠ ELLE GİRİLEN DEĞER HER ZAMAN KAZANIR. Kütüphaneden gelen değer bir
 * okumadır; personelin kayda yazdığı değer bir karardır. Otomatik çözüm,
 * insanın düzelttiği bir sayıyı sessizce geri almamalı.
 *
 * @param {object} kayit başvuru (basvurduguBolum, yksYerlesmeYili ve varsa
 *   elle girilmiş basvurduguBolumOsysPuani / basvurduguBolumTabanSirasi)
 * @param {Array} tablolar seçili kütüphane tabloları
 * @returns {{taban:string, tabanSira:string, kaynak:'elle'|'tablo'|'yok',
 *   yil:string, etiket:string, yilUyuyor:boolean, bulunanAd:string}}
 */
export function basvuruTabani(kayit, tablolar) {
  const k = kayit || {};
  const elleTaban = String(k.basvurduguBolumOsysPuani || '').trim();
  const elleSira = String(k.basvurduguBolumTabanSirasi || '').trim();
  const bos = {
    taban: elleTaban,
    tabanSira: elleSira,
    kaynak: elleTaban || elleSira ? 'elle' : 'yok',
    yil: '',
    etiket: '',
    yilUyuyor: true,
    bulunanAd: '',
  };
  if (elleTaban && elleSira) return bos;

  const eslesmeler = programuTablolardaBul(tablolar || [], k.basvurduguBolum || '');
  const adayYili = String(k.yksYerlesmeYili || '').trim();
  const secilen = varsayilanEslesme(eslesmeler, adayYili);
  if (!secilen) return bos;

  return {
    // Elle girilen alan doluysa o kalır; boş olan alan tablodan dolar.
    taban: elleTaban || String(secilen.taban || ''),
    tabanSira: elleSira || String(secilen.tabanSira || ''),
    kaynak: elleTaban && elleSira ? 'elle' : 'tablo',
    yil: String(secilen.yil || ''),
    etiket: String(secilen.etiket || ''),
    // Adayın yılı biliniyor ama o yılın tablosu seçili değilse, kullanılan
    // değer BAŞKA bir yıla ait demektir. Sessizce geçilmemeli.
    yilUyuyor: !adayYili || String(secilen.yil) === adayYili,
    bulunanAd: String(secilen.bulunanAd || ''),
  };
}

/**
 * Başvuruyu, çözülen taban değerleriyle zenginleştirir. Kriter hesabı
 * (elemeNedeni / asilYedekOner) bu kopya üzerinden yapılır; KAYDA yazılmaz.
 * Kaydetmek ayrı bir karardır ve personelin onayına bağlıdır.
 */
export function tabanUygula(kayit, cozum) {
  if (!kayit || !cozum) return kayit;
  return {
    ...kayit,
    basvurduguBolumOsysPuani: cozum.taban || '',
    basvurduguBolumTabanSirasi: cozum.tabanSira || '',
  };
}

/**
 * Kütüphane kaydını normalize eder — eski/eksik alanlı kayıtlar da okunabilsin.
 */
export function tabloNormalize(ham) {
  const t = ham || {};
  const satir = (s) => ({
    kod: String((s && s.kod) || ''),
    ad: String((s && s.ad) || ''),
    taban: String((s && s.taban) || ''),
    puanlar: Array.isArray(s && s.puanlar) ? s.puanlar.map(String) : [],
    // Taban başarı sırası — yatay geçişteki uygunluk şartı bunun üzerinden
    // işler. Eski kayıtlarda yok; boş kalır ve o şart uygulanmaz.
    tabanSira: String((s && s.tabanSira) || ''),
    sayilar: Array.isArray(s && s.sayilar) ? s.sayilar.map(String) : [],
    puanTuru: String((s && s.puanTuru) || ''),
  });
  return {
    id: String(t.id || t._docId || ''),
    ad: String(t.ad || ''),
    yil: String(t.yil || ''),
    tur: String(t.tur || 'diger'),
    kurum: String(t.kurum || ''),
    satirlar: (Array.isArray(t.satirlar) ? t.satirlar : []).map(satir),
    puansizlar: (Array.isArray(t.puansizlar) ? t.puansizlar : []).map(satir),
    kaynakAdi: String(t.kaynakAdi || ''),
    ekleyen: String(t.ekleyen || ''),
    eklenmeZamani: String(t.eklenmeZamani || ''),
  };
}
