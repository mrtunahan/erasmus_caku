/**
 * Tek seferlik temizlik: professors koleksiyonundaki duplicate kayıtları
 * birleştirir. Aynı ad ile birden fazla kayıt varsa, en uygun olanı
 * (bayraklı + departmentId dolu + en eski) canonical kabul edip diğerlerini
 * siler. Canonical'a eksik alanlar duplicate'lerden kopyalanır; bayraklar
 * OR'lanır.
 *
 * Idempotent: aynı isimden tek kayıt varsa dokunmaz.
 *
 * ── BİRLEŞTİRME KURALI ARTIK TEK YERDE ──
 * Kural burada elle YAZILMIYOR; lib/akademisyen-kimlik.js'teki
 * `profilBirlestir` kullanılıyor — uygulamanın çalışma anında (giriş, yazma
 * koruması, şablon erişimi) okuduğu birleşimin AYNISI.
 *
 * Sebebi somut bir veri kaybı riskiydi: betiğin kendi alan listesi
 * uygulamanınkinden DARDI. `isMemur`, `external`, `additionalDepartments` ve
 * `memurModules` hiç taşınmıyordu; `roles` ise birleştirilmiyor, yalnız
 * canonical'ınki boşsa dolduruluyordu. Yani memur bayrağı taşıyan ya da
 * çapraz-bölüm ataması olan bir duplicate silindiğinde o bilgi geri
 * dönüşsüz gidiyordu. İki kural tek kaynakta olunca bu ayrışma bir daha
 * oluşamaz.
 *
 * ── SİLMEDEN ÖNCE YEDEK ──
 * Silme geri alınamaz. Betik, dokunacağı TÜM grupları (canonical dahil) ham
 * hâliyle bir JSON dosyasına yazar; dosya yazılamazsa hiçbir şey silinmez.
 * Yedek olmadan silmek, "birleştirme bir alanı atladı" ihtimalini kalıcı
 * hataya çevirirdi.
 *
 * Kullanım:
 *   DRY_RUN=1 node server/dedupe-professors.js      # hiçbir şey yazmaz
 *   node server/dedupe-professors.js                # yedek alır, birleştirir, siler
 *   YEDEK_DIZIN=/root/yedek node server/dedupe-professors.js
 */
const fs = require('fs');
const path = require('path');
const { profilBirlestir } = require('./lib/akademisyen-kimlik');

(async () => {
  const { getDbSafe } = require('./config/database');
  const db = await getDbSafe();
  const dry = process.env.DRY_RUN === '1';

  const profsCol = db.collection('professors');
  const profs = await profsCol.find({}).toArray();
  console.log(`Toplam professors kaydı: ${profs.length}`);

  const norm = (s) =>
    (s || '')
      .toString()
      .toLocaleLowerCase('tr-TR')
      .replace(/[.,]/g, '')
      .replace(/\s+/g, ' ')
      .trim();

  const groups = new Map();
  profs.forEach((p) => {
    const k = norm(p.name);
    if (!k) return;
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(p);
  });

  const duplicateGroups = [];
  for (const [k, arr] of groups) {
    if (arr.length > 1) duplicateGroups.push({ key: k, items: arr });
  }
  console.log(`Duplicate gruplar: ${duplicateGroups.length}`);

  if (duplicateGroups.length === 0) {
    console.log('Temizlenecek bir şey yok.');
    process.exit(0);
  }

  // ── Yedek ──
  // Yalnız gerçekten yazacaksak alınır; DRY_RUN'da dosya kirletmeyiz.
  if (!dry) {
    const dizin = process.env.YEDEK_DIZIN || path.join(__dirname, '..', 'yedek');
    const damga = new Date().toISOString().replace(/[:.]/g, '-');
    const dosya = path.join(dizin, `professors-dedupe-${damga}.json`);
    try {
      fs.mkdirSync(dizin, { recursive: true });
      fs.writeFileSync(
        dosya,
        JSON.stringify(
          duplicateGroups.map((g) => ({ ad: g.key, kayitlar: g.items })),
          null,
          2
        ),
        'utf8'
      );
      console.log(`\n💾 Yedek yazıldı: ${dosya}`);
    } catch (e) {
      console.error(`\n✗ YEDEK YAZILAMADI (${e.message}) — hiçbir şey silinmedi.`);
      console.error('  YEDEK_DIZIN ile yazılabilir bir dizin verip yeniden deneyin.');
      process.exit(1);
    }
  }

  let removed = 0;
  let mergedFields = 0;

  for (const g of duplicateGroups) {
    // Uygulamanın okuduğu birleşimin aynısı: canonical seçimi de, OR'lanan
    // bayraklar da, birleştirilen liste alanları da orada tanımlı.
    const birlesik = profilBirlestir(g.items);
    const canonical = g.items.find((x) => String(x._id) === String(birlesik._id));
    const dupes = g.items.filter((x) => String(x._id) !== String(canonical._id));

    console.log(`\n• "${canonical.name}" — ${g.items.length} kayıt`);
    console.log(`  ↳ canonical: _id=${canonical._id} (deptId=${canonical.departmentId || '-'})`);

    // Canonical'da olmayan ya da farklı olan her alan yamaya girer.
    const patch = {};
    Object.keys(birlesik).forEach((alan) => {
      if (alan === '_id' || alan === '_mukerrerSayisi') return;
      const yeni = birlesik[alan];
      const eski = canonical[alan];
      const farkli = Array.isArray(yeni)
        ? JSON.stringify([...yeni].sort()) !== JSON.stringify([...(eski || [])].sort())
        : yeni !== eski;
      if (farkli) patch[alan] = yeni;
    });

    if (Object.keys(patch).length > 0) {
      console.log(`  ↳ canonical'a aktarılan alanlar:`, patch);
      if (!dry) {
        await profsCol.updateOne(
          { _id: canonical._id },
          { $set: { ...patch, updatedAt: new Date() } }
        );
        mergedFields += Object.keys(patch).length;
      }
    }

    for (const d of dupes) {
      console.log(`  ✗ silinecek: _id=${d._id} (deptId=${d.departmentId || '-'})`);
      if (!dry) {
        await profsCol.deleteOne({ _id: d._id });
        removed++;
      }
    }
  }

  console.log(
    `\n${dry ? '[DRY RUN] yazılmadı.' : '✓ Tamamlandı.'} Silinen duplicate: ${removed}, canonical'a aktarılan alan: ${mergedFields}`
  );
  process.exit(0);
})().catch((e) => {
  console.error('Hata:', e);
  process.exit(1);
});
