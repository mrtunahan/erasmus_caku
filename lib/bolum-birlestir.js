// ══════════════════════════════════════════════════════════════
// GÖMÜLÜ BÖLÜM LİSTESİ + DB BÖLÜMLERİ
//
// Uygulamada iki bölüm kaynağı var: koda gömülü çekirdek liste (renk/ikon ve
// slug kimliği taşır) ve veritabanı (gerçek `facultyId` ve ObjectId kimliği
// taşır). Açılışta bunlar birleştirilir.
//
// ── BU BİRLEŞTİRME ÜÇ ARIZANIN KAYNAĞIYDI ──
//  1. Ad bazlı dedup, aynı adlı DB kaydını listeye HİÇ almıyordu; gömülü
//     kayıt sabit yazılmış `facultyId` ile kalıyor, fakülte kapsamı hiçbir
//     zaman eşleşmiyordu (fakülte yetkilisinin anket ataması kimseye
//     ulaşmıyor, fakülte şablonu bölüme çözülmüyordu).
//  2. Kimliği zaten bilinen kayıtta döngü erken çıkıyordu. Çekirdek
//     bölümlerde DB'nin `_docId`'si slug olduğu için gelen kimlik gömülü
//     kimlikle AYNI çıkar — yani çekirdek bölümler HİÇ zenginleşmiyordu ve
//     ObjectId biçimleri `kimlikler`e girmiyordu.
//  3. Kimlik biçimleri yalnız `id`/`_docId`/`code`'dan toplanıyordu; oysa
//     okuma projeksiyonu `_id`'yi siliyor. ObjectId biçimi istemciye ancak
//     sunucunun açıkça gönderdiği `kimlikler` alanıyla ulaşır.
//
// Gömülü kayıt SİLİNMEZ (renk/ikon ve slug kimliği başka yerlerde kullanılır),
// DB'deki gerçekle ZENGİNLEŞTİRİLİR.
// ══════════════════════════════════════════════════════════════

const VARSAYILAN_IKON =
  'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4';
const VARSAYILAN_RENK = '#64748B';

/** Türkçe-locale duyarlı ad anahtarı (dedup için). */
export function adAnahtari(s) {
  return (s || '').toString().toLocaleLowerCase('tr-TR').replace(/\s+/g, ' ').trim();
}

/**
 * Bir DB bölüm kaydının taşıdığı tüm kimlik biçimleri.
 * Sunucunun gönderdiği `kimlikler` ÖNCE gelir: okuma projeksiyonu `_id` ve
 * `_docId`'yi sildiği için ObjectId biçimi yalnız oradan gelebilir.
 */
export function dbKimlikleri(dbKaydi) {
  if (!dbKaydi) return [];
  const hepsi = [
    ...(Array.isArray(dbKaydi.kimlikler) ? dbKaydi.kimlikler : []),
    dbKaydi.id,
    dbKaydi._docId,
    dbKaydi.code,
  ];
  return [...new Set(hepsi.filter(Boolean).map(String))];
}

/** Gömülü kaydı DB gerçeğiyle zenginleştirir (yerinde değiştirir). */
export function gomuluyuZenginlestir(gomulu, dbKaydi) {
  const mevcut = Array.isArray(gomulu.kimlikler) ? gomulu.kimlikler : [String(gomulu.id)];
  gomulu.kimlikler = [...new Set([...mevcut.map(String), ...dbKimlikleri(dbKaydi)])];
  // DB'nin fakültesi ESAS: gömülü değer bir varsayımdı.
  if (dbKaydi.facultyId) gomulu.facultyId = String(dbKaydi.facultyId);
  return gomulu;
}

/**
 * DB bölümlerini gömülü listeye katar. Liste YERİNDE değiştirilir (uygulama
 * her yerde aynı diziye başvuruyor). İdempotenttir: aynı veriyle yeniden
 * çağrılmak listeyi büyütmez.
 *
 * @returns {{eklenen:number, zenginlesen:number}}
 */
export function bolumleriBirlestir(bolumler, dbKayitlari) {
  const liste = Array.isArray(bolumler) ? bolumler : [];
  let eklenen = 0;
  let zenginlesen = 0;

  (Array.isArray(dbKayitlari) ? dbKayitlari : []).forEach((d) => {
    if (!d) return;
    const id = d.id || d._docId;
    if (!id) return;

    // Karşılığı önce KİMLİKTEN, bulunamazsa ADDAN aranır. Kimlik eşleşmesi
    // erken çıkış SEBEBİ DEĞİL, zenginleştirme sebebidir (bkz. arıza 2).
    const es =
      liste.find(
        (x) =>
          String(x.id) === String(id) ||
          (Array.isArray(x.kimlikler) && x.kimlikler.map(String).includes(String(id)))
      ) || liste.find((x) => adAnahtari(x.name) === adAnahtari(d.name));

    if (es) {
      gomuluyuZenginlestir(es, d);
      zenginlesen++;
      return; // ayrı satır olarak EKLENMEZ (mükerrer görünürdü)
    }

    liste.push({
      id: String(id),
      name: d.name || String(id),
      shortName: d.shortName || d.name || String(id),
      color: d.color || VARSAYILAN_RENK,
      icon: d.icon || VARSAYILAN_IKON,
      facultyId: d.facultyId ? String(d.facultyId) : '',
      kimlikler: dbKimlikleri(d),
    });
    eklenen++;
  });

  return { eklenen, zenginlesen };
}
