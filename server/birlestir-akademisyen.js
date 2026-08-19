/**
 * AYNI KİŞİNİN İKİ FARKLI ADLA AÇILMIŞ KAYDINI BİRLEŞTİRİR.
 *
 * dedupe-professors.js yalnız ADI BİREBİR AYNI olan kayıtları görür. Ama aynı
 * kişi unvanı değiştiği için iki ayrı adla da kaydedilmiş olabiliyor:
 *
 *     "Arş. Gör. Dr. Merve DURMAZ"   ve   "Dr. Merve Durmaz"
 *
 * Sistem bunları İKİ AYRI KİŞİ sayar: ayrı şifre kaydı, ayrı yetki bayrağı,
 * ayrı bölüm, ayrı ders ataması.
 *
 * ── BU İŞ NEDEN DEDUPE'DAN RİSKLİ ──
 * Kişi kimliği AD METNİDİR ve ad, veritabanında yabancı anahtar gibi
 * kullanılır:
 *   • professor_passwords  → şifreler adın kendisiyle ANAHTARLANIR
 *   • departments.managerNames / managerName → ad dizisi (giriş bununla
 *     sorgulanıyor, routes/auth.js)
 *   • sinav_dersler.professor · course_schedules slot `instructor`
 *   • commissions.members[].name · kulüp danışmanı · komisyon üyeliği
 *
 * Yani iki kayıttan birini silip ötekinin adını korumak YETMEZ: silinen adı
 * kullanan her atıf boşa düşer — dersin hocası kaybolur, kişi şifresiyle
 * giriş yapamaz. Bu yüzden burada önce TÜM ATIFLAR yeni ada çevrilir, sonra
 * kayıtlar birleştirilir.
 *
 * ── NE YAPILMAZ ──
 * `audit_logs` yeniden yazılmaz. Denetim kaydı olayın O ANDA nasıl
 * gerçekleştiğinin belgesidir; geçmişteki adı değiştirmek kaydı düzeltmek
 * değil, tahrif etmek olurdu.
 *
 * Kullanım:
 *   ESKI_AD="Dr. Merve Durmaz" YENI_AD="Arş. Gör. Dr. Merve DURMAZ" \
 *     DRY_RUN=1 node server/birlestir-akademisyen.js
 *   … DRY_RUN'suz çalıştırınca yedek alır, atıfları çevirir, kayıtları birleştirir.
 */
const fs = require('fs');
const path = require('path');
const { profilBirlestir, adAtiflariniCevir } = require('./lib/akademisyen-kimlik');

// Geçmişin belgesi olan koleksiyonlar yeniden yazılmaz.
const DOKUNULMAZ = new Set(['audit_logs']);

(async () => {
  const { getDbSafe } = require('./config/database');
  const eski = process.env.ESKI_AD;
  const yeni = process.env.YENI_AD;
  const dry = process.env.DRY_RUN === '1';

  if (!eski || !yeni) {
    console.error('ESKI_AD ve YENI_AD zorunludur.');
    console.error(
      'Örnek: ESKI_AD="Dr. X" YENI_AD="Doç. Dr. X" DRY_RUN=1 node server/birlestir-akademisyen.js'
    );
    process.exit(1);
  }
  if (eski === yeni) {
    console.error('ESKI_AD ile YENI_AD aynı — yapılacak bir şey yok.');
    process.exit(1);
  }

  const db = await getDbSafe();
  const profsCol = db.collection('professors');

  const eskiKayitlar = await profsCol.find({ name: eski }).toArray();
  const yeniKayitlar = await profsCol.find({ name: yeni }).toArray();
  console.log(`"${eski}"  → ${eskiKayitlar.length} kayıt`);
  console.log(`"${yeni}"  → ${yeniKayitlar.length} kayıt`);
  if (eskiKayitlar.length === 0) {
    console.error('\nESKI_AD ile kayıt bulunamadı. Adı birebir (büyük/küçük harf dahil) yazın.');
    process.exit(1);
  }
  if (yeniKayitlar.length === 0) {
    console.error('\nYENI_AD ile kayıt bulunamadı. Kalacak adı birebir yazın.');
    process.exit(1);
  }

  // ── 1) Etkilenen her doküman taranır ──
  const koleksiyonlar = (await db.listCollections().toArray()).map((c) => c.name);
  const etkilenen = []; // { koleksiyon, _id, oncesi, sonrasi }
  for (const ad of koleksiyonlar) {
    if (DOKUNULMAZ.has(ad)) continue;
    const dokumanlar = await db.collection(ad).find({}).toArray();
    for (const d of dokumanlar) {
      const { _id, ...govde } = d;
      const s = adAtiflariniCevir(govde, eski, yeni);
      if (s.degisti) etkilenen.push({ koleksiyon: ad, _id, oncesi: govde, sonrasi: s.deger });
    }
  }

  console.log(`\nAtıf taşıyan doküman: ${etkilenen.length}`);
  const ozet = {};
  etkilenen.forEach((e) => {
    ozet[e.koleksiyon] = (ozet[e.koleksiyon] || 0) + 1;
  });
  Object.entries(ozet).forEach(([k, n]) => console.log(`  • ${k}: ${n}`));
  if (DOKUNULMAZ.size) {
    console.log(`  (dokunulmayan: ${[...DOKUNULMAZ].join(', ')} — geçmiş kaydı tahrif edilmez)`);
  }

  // ── 2) Yedek ──
  if (!dry) {
    const dizin = process.env.YEDEK_DIZIN || path.join(__dirname, '..', 'yedek');
    const damga = new Date().toISOString().replace(/[:.]/g, '-');
    const dosya = path.join(dizin, `akademisyen-birlestir-${damga}.json`);
    try {
      fs.mkdirSync(dizin, { recursive: true });
      fs.writeFileSync(
        dosya,
        JSON.stringify(
          { eski, yeni, professors: [...eskiKayitlar, ...yeniKayitlar], etkilenen },
          null,
          2
        ),
        'utf8'
      );
      console.log(`\n💾 Yedek yazıldı: ${dosya}`);
    } catch (e) {
      console.error(`\n✗ YEDEK YAZILAMADI (${e.message}) — hiçbir şey değiştirilmedi.`);
      process.exit(1);
    }
  }

  // ── 3) Atıfları çevir ──
  let yazilan = 0;
  if (!dry) {
    for (const e of etkilenen) {
      await db.collection(e.koleksiyon).replaceOne({ _id: e._id }, e.sonrasi);
      yazilan++;
    }
  }

  // ── 4) professors kayıtlarını birleştir ──
  // Atıflar çevrildiği için artık iki kayıt da YENI_AD taşıyor; birleştirme
  // kuralı dedupe ile aynı kaynaktan (akademisyen-kimlik.js) geliyor.
  const hepsi = [...eskiKayitlar.map((p) => ({ ...p, name: yeni })), ...yeniKayitlar];
  const birlesik = profilBirlestir(hepsi);
  const canonical = hepsi.find((x) => String(x._id) === String(birlesik._id));
  const digerleri = hepsi.filter((x) => String(x._id) !== String(canonical._id));

  const patch = {};
  Object.keys(birlesik).forEach((alan) => {
    if (alan === '_id' || alan === '_mukerrerSayisi') return;
    const y = birlesik[alan];
    const es = canonical[alan];
    const farkli = Array.isArray(y)
      ? JSON.stringify([...y].sort()) !== JSON.stringify([...(es || [])].sort())
      : y !== es;
    if (farkli) patch[alan] = y;
  });

  console.log(`\nKalacak kayıt: _id=${canonical._id}  ad="${yeni}"`);
  if (Object.keys(patch).length) console.log('  ↳ aktarılan alanlar:', patch);
  digerleri.forEach((d) => console.log(`  ✗ silinecek: _id=${d._id}`));

  if (!dry) {
    if (Object.keys(patch).length) {
      await profsCol.updateOne(
        { _id: canonical._id },
        { $set: { ...patch, updatedAt: new Date() } }
      );
    }
    for (const d of digerleri) await profsCol.deleteOne({ _id: d._id });
  }

  console.log(
    `\n${dry ? '[DRY RUN] yazılmadı.' : '✓ Tamamlandı.'} Güncellenen doküman: ${yazilan}, silinen kayıt: ${dry ? 0 : digerleri.length}`
  );
  console.log(
    'NOT: iki adın da şifresi varsa KALAN adınki geçerlidir; eski ad için ' +
      'tanımlı şifre düşer. Kişi giriş yapamıyorsa şifresini yeniden belirleyin.'
  );
  process.exit(0);
})().catch((e) => {
  console.error('Hata:', e);
  process.exit(1);
});
