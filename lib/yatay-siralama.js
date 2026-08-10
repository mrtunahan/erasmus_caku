// ══════════════════════════════════════════════════════════════
// YATAY GEÇİŞ — puana göre sıralama ve asil/yedek önerisi
//
//   Kurumlararası geçişte sıra, yerleştirmeye esas puana (YKS×0,40 +
//   AGNO×0,60) göre belirlenir; merkezi yerleştirmede YKS puanına göre.
//   Akademisyen kaç asil kaç yedek alınacağını girer, sistem sıralayıp
//   ÖNERİYİ üretir.
//
//   ⚠ Bu bir ÖNERİDİR. Üretilen değerler doğrudan belgeye yazılmaz;
//   akademisyenin kaydına uygulanır ve akademisyen her satırı tek tek
//   değiştirebilir. Son karar her zaman insanındır.
// ══════════════════════════════════════════════════════════════

// "412,338" / "412.338" → 412.338 ; okunamıyorsa null
export function puanOku(v) {
  const s = String(v == null ? '' : v)
    .trim()
    .replace(',', '.');
  if (!s) return null;
  const n = parseFloat(s);
  return Number.isNaN(n) ? null : n;
}

// Sıralamaya esas puan, geçiş türüne göre değişir.
//   kurumlararası → yerleştirmeye esas puan (hesaplanmış)
//   merkezi       → YKS yerleştirme puanı
//   kurum içi     → puan yok (sıralama yapılmaz)
export function siralamaPuani(kayit, turId) {
  if (!kayit) return null;
  if (turId === 'kurumlararasi') {
    const yks = puanOku(kayit.yksPuani);
    const not = puanOku(kayit.notOrtalamasi);
    if (yks == null || not == null) return null;
    // Yuvarlama sırası, belgeye yazılan hesapla (ygYerlesmePuani) BİREBİR
    // aynı olmalı: önce her bileşen ayrı ayrı 2 haneye yuvarlanır, sonra
    // toplanır. Tek adımda yuvarlasaydık sıralama puanı ile belgedeki puan
    // kenar durumlarda ayrışır ve "141,33 neden 141,34'ün üstünde" gibi
    // açıklanamayan bir sıra çıkardı.
    const p40 = Math.round(yks * 0.4 * 100) / 100;
    const n60 = Math.round(not * 0.6 * 100) / 100;
    return Math.round((p40 + n60) * 100) / 100;
  }
  if (turId === 'merkezi') return puanOku(kayit.yksPuani);
  return null;
}

/**
 * Başvuruları puana göre sıralar (yüksekten düşüğe).
 *
 * Puanı okunamayan kayıtlar EN SONA atılır — sıfır puan sayılıp listenin
 * altına doğal olarak düşmeleri yanlış olurdu; eksik veriyle "en düşük
 * puanlı" muamelesi görmek, başvuruyu sessizce elemek demektir. Sona
 * atılıp puansız oldukları belli olur.
 *
 * Eşit puanda kayıt sırası (createdAt) korunur — kararlı sonuç.
 */
export function puanaGoreSirala(kayitlar, turId) {
  const liste = (kayitlar || []).map((k, i) => ({ k, i, p: siralamaPuani(k, turId) }));
  liste.sort((a, b) => {
    if (a.p == null && b.p == null) return a.i - b.i;
    if (a.p == null) return 1;
    if (b.p == null) return -1;
    if (b.p !== a.p) return b.p - a.p;
    return a.i - b.i;
  });
  return liste.map((x) => x.k);
}

/**
 * Sınıf başına kontenjanı çözer.
 *
 * Kontenjan SINIF BAŞINA ilan edilir: 2. sınıfa 5 asil, 3. sınıfa 3 asil
 * gibi. Önceden tek bir sayı bütün sınıflara uygulanıyordu ve gerçek ilanla
 * uyuşmuyordu.
 *
 * Kabul edilen biçimler:
 *   { '2': {asil:5, yedek:5}, '3': {asil:3, yedek:3} }   → sınıf başına
 *   { asil: 5, yedek: 5 }                                 → tüm sınıflara
 *   (asilSayisi, yedekSayisi) iki ayrı sayı               → eski çağrı biçimi
 */
function kontenjanCoz(a, b, sinif) {
  const say = (v) => Math.max(0, parseInt(v, 10) || 0);
  // Eski imza: (kayitlar, turId, asilSayisi, yedekSayisi)
  if (a == null || typeof a === 'number' || typeof a === 'string') {
    return { asil: say(a), yedek: say(b) };
  }
  const s = String(sinif || '').trim();
  if (a[s] && typeof a[s] === 'object') return { asil: say(a[s].asil), yedek: say(a[s].yedek) };
  // Sınıf anahtarı yoksa genel değer varsa o kullanılır; o da yoksa sıfır —
  // "belirtilmemiş kontenjan" sessizce sınırsız olmamalı.
  if ('asil' in a || 'yedek' in a) return { asil: say(a.asil), yedek: say(a.yedek) };
  return { asil: 0, yedek: 0 };
}

/**
 * Asil/yedek önerisi üretir.
 *
 * Sıralama BAŞVURULAN SINIF içinde yapılır: kontenjan sınıf başınadır,
 * 2. sınıfa başvuranla 3. sınıfa başvuran aynı sırada yarışmaz.
 *
 * @param {Array}  kayitlar
 * @param {string} turId
 * @param {object|number} kontenjan sınıf başına kontenjan (bkz. kontenjanCoz)
 * @param {number} [yedekSayisi]    eski imza için ikinci sayı
 * @param {object} [secenek]        { esikDisi:Set|Map } şartı karşılamayanlar
 * @returns {Array} [{ id, degerlendirme, degerlendirmeSinif, degerlendirmeSira, puan }]
 *   `degerlendirme` boş dize ise: kontenjan dışı — dokunulmaması gereken kayıt.
 */
export function asilYedekOner(kayitlar, turId, kontenjan, yedekSayisi, secenek) {
  // Taban BAŞARI SIRALAMASI şartını (kurum eşiği ya da programın kendi taban
  // sırası) karşılamayanlar sıralamaya girmez: şartı taşımıyorlar, kontenjanı
  // işgal etmemeliler ve YEDEK bile olamazlar. Sıranın kendisi yine PUANA göre
  // yapılır — değişen, kimin yarışa girebileceğidir.
  // Set (yalnız id) ya da Map (id → eleme nedeni) kabul edilir.
  const esikDisi = (secenek && secenek.esikDisi) || new Set();
  const elendiMi = (id) => (esikDisi.has ? esikDisi.has(String(id)) : false);
  const elenmeNedeni = (id) =>
    typeof esikDisi.get === 'function' ? esikDisi.get(String(id)) || 'taban_sira' : 'taban_sira';

  // Sınıfa göre grupla (boş sınıf da kendi grubudur).
  const gruplar = new Map();
  (kayitlar || []).forEach((k) => {
    const sinif = String((k && k.basvurduguSinif) || '').trim();
    if (!gruplar.has(sinif)) gruplar.set(sinif, []);
    gruplar.get(sinif).push(k);
  });

  const oneri = [];
  gruplar.forEach((grup, sinif) => {
    const { asil, yedek } = kontenjanCoz(kontenjan, yedekSayisi, sinif);
    const sirali = puanaGoreSirala(grup, turId);
    let asilNo = 0;
    let yedekNo = 0;
    sirali.forEach((k) => {
      const puan = siralamaPuani(k, turId);
      const id = k.id || k._docId;
      // Taban sıralamasının gerisindeki aday kontenjana SAYILMADAN elenir.
      if (elendiMi(id)) {
        oneri.push({
          id,
          degerlendirme: 'uygun_degil',
          degerlendirmeSinif: sinif,
          degerlendirmeSira: '',
          puan,
          sebep: elenmeNedeni(id),
        });
        return;
      }
      // Puanı okunamayan kayda öneri üretilmez: sırası güvenilir değil,
      // akademisyen eksik veriyi görüp kendisi karar vermeli.
      if (puan == null) {
        oneri.push({
          id,
          degerlendirme: '',
          degerlendirmeSinif: sinif,
          degerlendirmeSira: '',
          puan,
        });
        return;
      }
      if (asilNo < asil) {
        asilNo += 1;
        oneri.push({
          id,
          degerlendirme: 'uygun_asil',
          degerlendirmeSinif: sinif,
          degerlendirmeSira: String(asilNo),
          puan,
        });
      } else if (yedekNo < yedek) {
        yedekNo += 1;
        oneri.push({
          id,
          degerlendirme: 'uygun_yedek',
          degerlendirmeSinif: sinif,
          degerlendirmeSira: String(yedekNo),
          puan,
        });
      } else {
        // Kontenjan doldu → sıraya girdi ama yerleşemedi.
        oneri.push({
          id,
          degerlendirme: 'uygun_degil',
          degerlendirmeSinif: sinif,
          degerlendirmeSira: '',
          puan,
        });
      }
    });
  });
  return oneri;
}
