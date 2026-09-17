/**
 * AYNI KİŞİ, İKİ KAYIT — salt okunur tarama.
 *
 * Bu sistemde akademisyenin kimliği AD METNİDİR ve unvan da o metnin
 * içindedir (`professors.name` = "Öğrt. Gör. Gökalp SAYLAM"). Unvanı değişen
 * ya da iki kez farklı unvanla girilen kişi sistemde İKİ AYRI KİŞİ olur:
 * ayrı şifre, ayrı yetki bayrağı, ayrı ders ataması. Giriş listesinde yan
 * yana iki aynı isim görünmesinin sebebi budur.
 *
 * ⚠ HANGİSİNİN DOĞRU OLDUĞUNA BETİK KARAR VEREMEZ. Unvan yükselmiş de
 * olabilir, yanlış girilmiş de. Bu yüzden betik hiçbir şey yazmaz; her kayıt
 * için KARAR VERDİRECEK KANITI yan yana koyar:
 *
 *   • şifresi var mı   → yoksa o kimlikle kimse giriş yapamıyor demektir
 *   • kaç atıf taşıyor → ders, komisyon, yetki, program… kaç yerde geçiyor
 *   • yetki bayrakları → yönetici kaydı hangisi
 *   • bölüm/fakülte    → hangisi dolu
 *
 * Kararı verdikten sonra birleştirme ayrı ve açık bir adımdır:
 *
 *   ESKI_AD="<silinecek>" YENI_AD="<kalacak>" DRY_RUN=1 \
 *     node server/birlestir-akademisyen.js
 *
 * (O betik önce TÜM ATIFLARI yeni ada çevirir, sonra kayıtları birleştirir —
 * yalnız birini silmek, silinen adı kullanan her atıfı boşa düşürürdü.)
 *
 * Kullanım:
 *   node server/akademisyen-mukerrer-tara.js           # hepsi
 *   node server/akademisyen-mukerrer-tara.js gökalp    # ada göre süz
 */
(async () => {
  const { getDbSafe } = require('./config/database');
  const { adAtiflariniCevir } = require('./lib/akademisyen-kimlik');

  // Unvan kuralı istemciyle ORTAK (lib/akademik-unvan.js). Sunucu CJS,
  // kütüphane ESM; Node 22 modül sözdizimini görüp dosyayı ESM olarak
  // çözdüğü için dinamik import çalışır. Kuralın bir de CJS ikizini yazmak
  // iki tarafın sessizce ayrışması demekti — tek kaynak korunuyor.
  const { mukerrerGruplar, unvaniAyir, unvanKidemi } = await import('../lib/akademik-unvan.js');

  const aranan = String(process.argv[2] || '')
    .trim()
    .toLocaleLowerCase('tr');

  const db = await getDbSafe();
  const profiller = await db.collection('professors').find({}).toArray();
  let gruplar = mukerrerGruplar(profiller);
  if (aranan) {
    gruplar = gruplar.filter((g) => g.anahtar.includes(aranan));
  }

  console.log('');
  console.log('════════════════════════════════════════════');
  console.log(`professors kaydı : ${profiller.length}`);
  console.log(`mükerrer kişi    : ${gruplar.length}${aranan ? '  (süzgeç: ' + aranan + ')' : ''}`);
  console.log('════════════════════════════════════════════');

  if (gruplar.length === 0) {
    console.log('\nAynı kişiye ait ikinci bir kayıt bulunamadı.\n');
    process.exit(0);
  }

  // ── Şifre kayıtları ──
  // Şifreler `passwords` koleksiyonunda tek dokümanda, AD anahtarıyla durur.
  const sifreDok = (await db.collection('passwords').findOne({ _id: 'professor_passwords' })) || {};
  const sifresiVar = (ad) => Object.prototype.hasOwnProperty.call(sifreDok, ad);

  // ── Atıf sayımı ──
  // Sayım, birlestir-akademisyen.js'in taradığı yöntemin AYNISI: orada hangi
  // dokümanlar değişecekse burada da o sayılır, yoksa rapor ile gerçek iş
  // ayrışırdı. `audit_logs` dışarıda: geçmiş kaydı hiçbir zaman çevrilmiyor.
  const adaylar = [...new Set(gruplar.flatMap((g) => g.adlar))];
  const sayac = Object.fromEntries(adaylar.map((a) => [a, { toplam: 0, koleksiyonlar: {} }]));
  const koleksiyonlar = (await db.listCollections().toArray()).map((c) => c.name);
  for (const ad of koleksiyonlar) {
    if (ad === 'audit_logs' || ad === 'professors') continue;
    const dokumanlar = await db.collection(ad).find({}).toArray();
    for (const d of dokumanlar) {
      const { _id, ...govde } = d;
      // Ucuz eleme: adın metni dokümanda hiç geçmiyorsa ayrıntılı tarama yok.
      let json = '';
      try {
        json = JSON.stringify(govde);
      } catch (_) {
        continue;
      }
      for (const aday of adaylar) {
        if (!json.includes(aday)) continue;
        // Kesin denetim: yalnız TAM EŞLEŞEN atıflar sayılır (cümle içinde
        // geçen ad bir atıf değil, metindir). Hedef ad önemli değil, yalnız
        // "değişir miydi" sorusunun cevabı sayılıyor; '~' çakışmayan bir
        // nöbetçi değer.
        if (!adAtiflariniCevir(govde, aday, aday + '~').degisti) continue;
        sayac[aday].toplam++;
        sayac[aday].koleksiyonlar[ad] = (sayac[aday].koleksiyonlar[ad] || 0) + 1;
      }
    }
  }

  const bayraklar = (p) =>
    [
      p.isUniversityAdmin && 'üni yetkilisi',
      p.isFacultyManager && 'fakülte yetkilisi',
      p.isDeptManager && 'bölüm yetkilisi',
      p.isStajCoordinator && 'staj yetkilisi',
      p.isMemur && 'memur',
    ].filter(Boolean);

  gruplar.forEach((g) => {
    console.log('\n════════════════════════════════════════════');
    console.log(`KİŞİ: ${g.ad}`);
    if (!g.farkliYazim) {
      console.log(`  ${g.kayitlar.length} kayıt, adı BİREBİR AYNI.`);
      console.log('  → Bunu dedupe-professors.js çözer (ad değişmiyor):');
      console.log('      DRY_RUN=1 node server/dedupe-professors.js');
      return;
    }

    console.log(`  ${g.adlar.length} farklı ad yazımı — sistem bunları AYRI KİŞİ sayıyor.`);
    const satirlar = g.adlar.map((ad) => {
      const kayitlar = g.kayitlar.filter((k) => k.name === ad);
      const p = kayitlar[0] || {};
      const { unvan } = unvaniAyir(ad);
      return {
        ad,
        unvan,
        kidem: unvanKidemi(unvan),
        kayitSayisi: kayitlar.length,
        sifre: sifresiVar(ad),
        atif: sayac[ad] ? sayac[ad].toplam : 0,
        koleksiyonlar: sayac[ad] ? sayac[ad].koleksiyonlar : {},
        bolum: p.departmentId || p.department || '',
        bayrak: bayraklar(p),
      };
    });

    satirlar.forEach((s) => {
      console.log(`\n  • "${s.ad}"`);
      console.log(
        `      unvan: ${s.unvan || '(tanınmadı)'}` +
          `   kayıt: ${s.kayitSayisi}` +
          `   bölüm: ${s.bolum || '(boş)'}`
      );
      console.log(
        `      şifre: ${s.sifre ? 'VAR — bu adla giriş yapılıyor' : 'yok'}` +
          `   ·   atıf: ${s.atif}`
      );
      const ks = Object.entries(s.koleksiyonlar);
      if (ks.length > 0) {
        console.log(`      geçtiği yerler: ${ks.map(([k, n]) => k + ' (' + n + ')').join(', ')}`);
      }
      if (s.bayrak.length > 0) console.log(`      yetki: ${s.bayrak.join(', ')}`);
    });

    // ⚠ KIDEM DOĞRULUK DEĞİLDİR. Unvan yükselmiş olabilir ama yanlış da
    // girilmiş olabilir; kıdemli olanı "yeni" saymak sessiz bir varsayım
    // olurdu. Yalnız bilgi olarak yazılır.
    const kidemli = satirlar.reduce((en, x) => (x.kidem > (en ? en.kidem : -1) ? x : en), null);
    if (kidemli && kidemli.kidem >= 0 && satirlar.some((x) => x.kidem !== kidemli.kidem)) {
      console.log(`\n  Kıdemce en yüksek unvan: ${kidemli.unvan} — ama bu, doğru olduğu`);
      console.log('  anlamına GELMEZ; yanlış girilmiş de olabilir.');
    }

    // ── Öneri ── Kanıta dayanır, unvana DEĞİL.
    const puan = (s) => (s.sifre ? 1000 : 0) + s.atif;
    const sirali = satirlar.slice().sort((a, b) => puan(b) - puan(a));
    const kalan = sirali[0];
    const digerleri = sirali.slice(1);
    const berabere = digerleri.some((s) => puan(s) === puan(kalan));

    console.log('\n  ── Öneri ──');
    if (berabere) {
      console.log('  Kayıtlar arasında ayırt edici kanıt YOK (şifre/atıf eşit).');
      console.log('  Hangi unvanın doğru olduğunu siz biliyorsunuz; kalacak adı siz seçin.');
    } else {
      console.log(`  Kanıta göre KALMASI önerilen: "${kalan.ad}"`);
      console.log(
        `    (${kalan.sifre ? 'şifresi var' : 'şifresi yok'}, ${kalan.atif} atıf taşıyor)`
      );
      console.log('  ⚠ Bu bir tahmindir: unvan yükselmiş olabilir, yanlış girilmiş de.');
      console.log('    Doğru unvanı siz biliyorsanız kalacak adı siz seçin — atıflar');
      console.log('    zaten kalan ada çevrilecek, kaybolmayacak.');
    }
    digerleri.forEach((s) => {
      console.log(`\n  Birleştirmek için (önce DRY_RUN ile bakın):`);
      console.log(`      ESKI_AD="${s.ad}" \\`);
      console.log(`      YENI_AD="${kalan.ad}" \\`);
      console.log(`      DRY_RUN=1 node server/birlestir-akademisyen.js`);
    });
  });

  console.log('\n────────────────────────────────────────────');
  console.log('Hiçbir şey YAZILMADI (salt okunur çalışma).');
  console.log('');
  process.exit(0);
})().catch((e) => {
  console.error('Hata:', e.message);
  process.exit(1);
});
