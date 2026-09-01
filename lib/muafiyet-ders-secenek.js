// ══════════════════════════════════════════════════════════════
// ÇAKÜ DERS SEÇENEKLERİ
//
// Muafiyet talebinde seçilebilecek ÇAKÜ dersleri iki kaynaktan gelir:
//   1) Bölüm dersleri (`sinav_dersler`) — Ders Yönetimi'nde tanımlı; AKTS,
//      zorunlu/seçmeli ve Bologna bağlantısını taşır.
//   2) Muafiyet kataloğu (`muafiyet_settings/course_contents`) — haftalık
//      ders içeriklerini taşır; benzerlik puanı buradan hesaplanır.
//
// Bu birleştirme öğrencinin formunda yazılıydı. Üniversite yetkilisi bir
// talebi düzeltirken AYNI listeden seçmek zorunda: iki yerde iki ayrı liste
// olsaydı yetkili, öğrencinin göremediği (ya da tersi) bir dersi seçebilirdi.
// Kural tek yerde durur, iki ekran da buradan okur.
// ══════════════════════════════════════════════════════════════

/** Kod karşılaştırması boşluk ve büyük/küçük harf duyarsızdır. */
export function kodAnahtari(kod) {
  return String(kod == null ? '' : kod)
    .replace(/\s/g, '')
    .toLocaleUpperCase('tr');
}

/**
 * İki kaynağı kod bazında birleştirir.
 *
 * Öncelik DERSİN KENDİ alanlarındadır: AKTS ve zorunlu/seçmeli bilgisini
 * Ders Yönetimi'nde akademisyen giriyor; katalog yalnız eksikleri tamamlar.
 * Katalogda olmayan bölüm dersleri listede KALIR — aksi hâlde içeriği henüz
 * girilmemiş bir ders seçilemez hâle gelirdi.
 *
 * @param bolumDersleri sinav_dersler kayıtları
 * @param katalog muafiyet kataloğu kayıtları
 * @returns [{ code, name, akts, statu, bolognaLink, content, donem, key }]
 */
export function cakuDersSecenekleri(bolumDersleri, katalog) {
  const katalogKod = new Map();
  (Array.isArray(katalog) ? katalog : []).forEach((c) => {
    if (!c) return;
    const k = kodAnahtari(c.code);
    if (k) katalogKod.set(k, c);
  });

  const birlesik = new Map();
  const koy = (ders, kat) => {
    if (!ders) return;
    const code = ders.code || '';
    const name = ders.name || '';
    // Kodu olmayan ders de listeye girer: anahtar ada düşer, yoksa kodsuz
    // dersler birbirini ezerdi.
    const k = kodAnahtari(code) || 'N:' + name;
    if (birlesik.has(k)) return;
    birlesik.set(k, {
      code,
      name,
      akts: ders.akts || (kat && kat.akts) || '',
      // `sinif === 5` bölüm derslerinde seçmeli havuzunu işaretler.
      statu: ders.statu || (ders.sinif === 5 ? 'S' : '') || (kat && kat.status) || '',
      bolognaLink: ders.bolognaLink || '',
      content: (kat && (kat.weeklyContent || kat.content)) || '',
      // Yarıyıl bilgisi belgedeki {{çakü_ders_dönemi}} yer tutucusunu doldurur.
      donem: ders.donem || '',
    });
  };

  (Array.isArray(bolumDersleri) ? bolumDersleri : []).forEach((c) => {
    if (c && c.name) koy(c, katalogKod.get(kodAnahtari(c.code)));
  });
  (Array.isArray(katalog) ? katalog : []).forEach((c) => {
    if (c && c.name) {
      koy({ code: c.code, name: c.name, akts: c.akts, statu: c.status }, c);
    }
  });

  return Array.from(birlesik.values())
    .map((c) => Object.assign({}, c, { key: (c.code || '') + '::' + c.name }))
    .sort((a, b) => String(a.code || a.name).localeCompare(String(b.code || b.name), 'tr'));
}

/** Anahtarına göre seçenek bulur (açılır listeden seçim). */
export function secenekBul(secenekler, anahtar) {
  const a = String(anahtar || '');
  if (!a) return null;
  return (Array.isArray(secenekler) ? secenekler : []).find((o) => o && o.key === a) || null;
}
