/**
 * DİJİTAL YOKLAMA VERİSİNİ SIFIRLA — deneme kayıtlarını temizler.
 *
 * Sistem kurulurken alınan deneme yoklamaları gerçek devamsızlık gibi
 * görünüyor: öğrencinin sayfasında "kalan hak" eksik çıkıyor, devam listesi
 * olmayan bir dersin haftalarını dolduruyor. Bu betik o kayıtları siler.
 *
 * ⚠ GERİ ALINAMAZ. Silinen şeyler:
 *   yoklama_oturumlari  → açılmış bütün yoklama oturumları
 *   yoklama_kayitlari   → öğrencilerin okuttuğu kayıtlar (devamsızlığın kendisi)
 *   yoklama_uyarilari   → "başkası yerine okuttu" şüphe kayıtları
 *   student_devices     → öğrencilerin hesabına bağlı cihaz kayıtları (*)
 *
 * (*) Cihaz kayıtları SEÇİMLİDİR (`--cihazlar`): silinirse her öğrenci yeni
 *     bir cihaz bağlayabilir hâle gelir, dönemlik değişim kotası sıfırlanır.
 *
 * ⚠ AYARLAR SİLİNMEZ. `yoklama_ayarlari` (devamsızlık sınırı, hafta sayısı,
 * dönem başlangıcı, ders yapılmayan hafta notları) akademisyenin emeğidir ve
 * yoklama verisi değildir; ona dokunulmaz. Gerekirse `--ayarlar` ile o da
 * silinir.
 *
 * ⚠ VARSAYILAN DAVRANIŞ HİÇBİR ŞEY SİLMEMEKTİR. Önce rapor okunur:
 *
 *   node server/yoklama-sifirla.js                  # yalnız say, hiçbir şey silme
 *   node server/yoklama-sifirla.js --ders <dersId>  # yalnız o dersin kayıtları
 *   node server/yoklama-sifirla.js --onayla         # SİL (oturum + kayıt + uyarı)
 *   node server/yoklama-sifirla.js --onayla --cihazlar
 *   node server/yoklama-sifirla.js --onayla --cihazlar --ayarlar
 *
 * Idempotent: ikinci çalıştırmada silinecek bir şey kalmaz.
 */
(async () => {
  const { getDbSafe } = require('./config/database');

  const arg = (ad) => {
    const i = process.argv.indexOf('--' + ad);
    return i >= 0 ? String(process.argv[i + 1] || '').trim() : '';
  };
  const onayla = process.argv.includes('--onayla');
  const cihazlar = process.argv.includes('--cihazlar');
  const ayarlar = process.argv.includes('--ayarlar');
  const dersId = arg('ders');

  const db = await getDbSafe();
  // Ders süzgeci verilirse yalnız o dersin kayıtları; verilmezse tamamı.
  const suzgec = dersId ? { dersId } : {};

  const hedefler = [
    { ad: 'yoklama_oturumlari', aciklama: 'yoklama oturumu', suzgec },
    { ad: 'yoklama_kayitlari', aciklama: 'yoklama kaydı (devamsızlık)', suzgec },
    { ad: 'yoklama_uyarilari', aciklama: 'şüpheli okutma uyarısı', suzgec },
  ];
  if (cihazlar) {
    // Cihaz kaydı derse değil ÖĞRENCİYE bağlıdır; ders süzgeci uygulanamaz.
    if (dersId) {
      console.log(
        '\n⚠ --cihazlar ile --ders birlikte kullanılamaz: cihaz kaydı derse bağlı değil.'
      );
      process.exit(1);
    }
    hedefler.push({ ad: 'student_devices', aciklama: 'öğrenci cihaz kaydı', suzgec: {} });
  }
  if (ayarlar) {
    hedefler.push({
      ad: 'yoklama_ayarlari',
      aciklama: 'ders yoklama ayarı (sınır/hafta/notlar)',
      suzgec,
    });
  }

  console.log('');
  console.log('════════════════════════════════════════════');
  console.log('DİJİTAL YOKLAMA VERİSİ' + (dersId ? ' — ders: ' + dersId : ' — TÜM DERSLER'));
  console.log('════════════════════════════════════════════');

  let toplam = 0;
  for (const h of hedefler) {
    const n = await db.collection(h.ad).countDocuments(h.suzgec);
    toplam += n;
    console.log(`  ${h.ad.padEnd(20)} ${String(n).padStart(6)}  ${h.aciklama}`);
  }

  if (toplam === 0) {
    console.log('\nSilinecek kayıt yok.');
    process.exit(0);
  }

  if (!onayla) {
    console.log('\n────────────────────────────────────────────');
    console.log(`${toplam} kayıt silinecek. HİÇBİR ŞEY SİLİNMEDİ.`);
    console.log('Silmek için aynı komutu --onayla ile çalıştırın:');
    console.log(
      '  node server/yoklama-sifirla.js --onayla' +
        (dersId ? ' --ders ' + dersId : '') +
        (cihazlar ? ' --cihazlar' : '') +
        (ayarlar ? ' --ayarlar' : '')
    );
    if (!ayarlar) {
      console.log('\nAyarlar (devamsızlık sınırı, hafta düzeni, hafta notları) KORUNUYOR.');
    }
    process.exit(0);
  }

  console.log('\n────────────────────────────────────────────');
  let silinen = 0;
  for (const h of hedefler) {
    const sonuc = await db.collection(h.ad).deleteMany(h.suzgec);
    silinen += sonuc.deletedCount || 0;
    console.log(`  ${h.ad.padEnd(20)} ${String(sonuc.deletedCount || 0).padStart(6)} silindi`);
  }
  console.log(`\nToplam ${silinen} kayıt silindi.`);
  console.log('Öğrencilerin devamsızlık sayaçları kayıtlardan HESAPLANIR; ayrıca sıfırlama');
  console.log('gerekmez — kayıtlar gidince devamsızlık da sıfırlanmış olur.');
  process.exit(0);
})().catch((e) => {
  console.error('Hata:', e && e.message ? e.message : e);
  process.exit(1);
});
