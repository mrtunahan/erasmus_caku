// ══════════════════════════════════════════════════════════════
// ŞABLON ALAN EŞLEMESİ — aynı yer tutucunun FARKLI YERLERDE farklı anlamı
//
// Şablon eşlemesi `{token, tokenOccurrence, variable}` üçlüsüyle saklanır ve
// arayüz her geçişi ayrı satır olarak (#1, #2 …) gösterir. Ne var ki xlsx
// üreticisi eşlemeyi YALNIZ token metnine göre indeksliyordu: aynı yer tutucu
// iki kez geçtiğinde ikinci eşleme birincinin üzerine yazılıyor, kullanıcının
// #2 için yaptığı seçim hiç uygulanmıyordu.
//
// Bu gerçek bir şablonda şöyle patlıyor:
//
//   Başlık :  "… ÇANKIRI KARATEKİN … {{başvurduğu_bölüm}} MÜHENDİSLİĞİ BÖLÜMÜ …"
//   Sütun  :  "{{başvurduğu_bölüm}} / {{başvurduğu_SINIF}}"
//
// Başlık ÇIPLAK dal adını ister ("Bilgisayar"), çünkü "MÜHENDİSLİĞİ BÖLÜMÜ"
// zaten metinde yazılı. Sütun ise programın TAM adını ister ("Bilgisayar
// Mühendisliği"). Tek eşleme ikisine birden yetmez; sütunda "bilgisayar"
// yazıyordu.
//
// Burada iki kural var:
//   1) Geçiş numarası birebir eşleşiyorsa kullanıcının seçimi uygulanır.
//   2) Eşleşmiyorsa KONUM karar verir: veri satırının içindeki bir geçiş
//      satır (`row:`) değişkenini, dışındaki bir geçiş künye (`static:`)
//      değişkenini tercih eder. Böylece kullanıcı her geçişi tek tek
//      eşlemek zorunda kalmadan da doğru sonuç çıkar.
// ══════════════════════════════════════════════════════════════

import { yerTutucuDeseni } from './xlsx-satir.js';

/**
 * Eşleme kayıtlarını aranabilir hâle getirir.
 *
 * @param {Array<{token:string, tokenOccurrence:number, variable:string}>} alanlar
 * @returns {{tam:Object, tokenlar:Object, ozet:Object}}
 *   tam      → 'token#geçiş' → {tip,id}   (birebir eşleşme)
 *   tokenlar → token → [{gecis,tip,id}]   (o token'ın tüm eşlemeleri)
 *   ozet     → token → {tip,id}           (token bazlı özet; `row` önceliklidir
 *              çünkü veri satırı seçimi "kaç satır değişkeni var" diye sorar)
 */
export function eslesmeHaritasi(alanlar) {
  const tam = {};
  const tokenlar = {};
  const ozet = {};
  (alanlar || []).forEach((f) => {
    if (!f || !f.token || !f.variable) return;
    const parcalar = String(f.variable).split(':');
    const kayit = {
      gecis: Number(f.tokenOccurrence) > 0 ? Number(f.tokenOccurrence) : 1,
      tip: parcalar[0],
      id: parcalar[1],
    };
    tam[f.token + '#' + kayit.gecis] = kayit;
    (tokenlar[f.token] = tokenlar[f.token] || []).push(kayit);
    // Özet: `row` her zaman kazanır. Aksi hâlde başlıkta static'e eşlenmiş bir
    // token yüzünden veri satırı "hiç satır değişkeni yok" sayılabilirdi.
    if (!ozet[f.token] || (ozet[f.token].tip !== 'row' && kayit.tip === 'row')) {
      ozet[f.token] = { tip: kayit.tip, id: kayit.id };
    }
  });
  return { tam, tokenlar, ozet };
}

/**
 * Belirli bir geçiş için hangi değişkenin yazılacağını çözer.
 *
 * @param {object} harita  eslesmeHaritasi çıktısı
 * @param {string} token   yer tutucu metni
 * @param {number} gecis   bu token'ın kaçıncı geçişi (1 tabanlı)
 * @param {boolean} satirIci geçiş, çoğaltılan VERİ satırının içinde mi
 * @returns {{tip:string,id:string}|null} eşleme yoksa null (yer tutucu olduğu gibi kalır)
 */
export function tokenCoz(harita, token, gecis, satirIci) {
  const h = harita || { tam: {}, tokenlar: {} };
  const birebir = h.tam[token + '#' + gecis];
  if (birebir) return { tip: birebir.tip, id: birebir.id };

  const liste = h.tokenlar[token];
  if (!liste || liste.length === 0) return null;
  if (liste.length === 1) return { tip: liste[0].tip, id: liste[0].id };

  // Birden çok eşleme var ama bu geçiş için birebir kayıt yok → konuma bak.
  const istenen = satirIci ? 'row' : 'static';
  const uygun = liste.find((k) => k.tip === istenen);
  if (uygun) return { tip: uygun.tip, id: uygun.id };
  return { tip: liste[0].tip, id: liste[0].id };
}

/**
 * Her paylaşılan metin (sharedStrings <si>) için, içindeki her token'ın
 * DOSYA GENELİNDEKİ ilk geçiş numarasını çıkarır.
 *
 * Numaralandırma, eşlemeyi üreten `detectPlaceholdersXlsx` ile birebir aynı
 * sırayı izler: <si> girdileri dosya sırasıyla, her <si> içinde soldan sağa.
 * Aksi hâlde arayüzde "#2" diye görünen alan, üretimde başka bir geçişe
 * denk gelirdi.
 *
 * @param {string[]} metinler sharedStrings metinleri (dosya sırasıyla)
 * @returns {Array<Object>} indeks → { token: ilkGeçişNumarası }
 */
export function ilkGecisIndeksi(metinler) {
  const sayac = {};
  return (metinler || []).map((s) => {
    const harita = {};
    const rx = yerTutucuDeseni();
    let m;
    while ((m = rx.exec(String(s == null ? '' : s))) !== null) {
      const t = m[0];
      sayac[t] = (sayac[t] || 0) + 1;
      if (harita[t] == null) harita[t] = sayac[t];
    }
    return harita;
  });
}
