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
 *   taban:string, bulunanAd:string, puansiz:boolean}>}
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
 * Kural: adayın yılı biliniyorsa O YILIN tablosu; yoksa puanı olan EN YENİ
 * tablo. Puanı olmayan (yayımlanmamış) eşleşmeler asla varsayılan seçilmez —
 * boş bir taban, karşılaştırmayı sessizce "belirsiz" yapardı.
 *
 * @param {Array} eslesmeler programuTablolardaBul çıktısı
 * @param {string} [adayYili] adayın yerleştiği yıl
 */
export function varsayilanEslesme(eslesmeler, adayYili) {
  const liste = (eslesmeler || []).filter((e) => e && e.taban);
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
 * Kütüphane kaydını normalize eder — eski/eksik alanlı kayıtlar da okunabilsin.
 */
export function tabloNormalize(ham) {
  const t = ham || {};
  const satir = (s) => ({
    kod: String((s && s.kod) || ''),
    ad: String((s && s.ad) || ''),
    taban: String((s && s.taban) || ''),
    puanlar: Array.isArray(s && s.puanlar) ? s.puanlar.map(String) : [],
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
