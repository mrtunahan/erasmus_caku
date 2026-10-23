/**
 * SINAV KURAL RAPORU — yalnız okur, HİÇBİR ŞEY YAZMAZ.
 *
 * Yeni sınav kuralları (aynı salonda örtüşme engeli, gönderim kilidi,
 * öğrenciye yalnız gönderilmiş program, gözetmen havuzu süzgeci) canlıya
 * alınmadan önce neyin etkileneceğini listeler. Hesap lib/sinav-kural-raporu.js
 * içindedir (testli).
 *
 * Kullanım (proje kökünden):
 *   node server/sinav-kural-raporu.js                 # bugünden itibaren
 *   node server/sinav-kural-raporu.js --tum           # geçmiş sınavlar da
 *   node server/sinav-kural-raporu.js --json rapor.json   # ayrıca JSON dosyası
 */
require('dotenv').config();
require('dotenv').config({ path: require('path').join(__dirname, '.env') });

(async () => {
  const { getDbSafe, disconnect } = require('./config/database');
  const { kimlikler } = require('./lib/bolum-kimlik');
  const { sinavKuralRaporu, raporMetni } = await import('../lib/sinav-kural-raporu.js');

  const argv = process.argv.slice(2);
  const tum = argv.includes('--tum');
  const jsonIdx = argv.indexOf('--json');
  const jsonYolu = jsonIdx >= 0 ? argv[jsonIdx + 1] : '';

  let kod = 0;
  try {
    const db = await getDbSafe();
    const oku = (ad) => db.collection(ad).find({}).toArray();
    const [sinavlar, donemler, gonderimler, kabuller, depts, fakulteler, akademisyenler] =
      await Promise.all([
        oku('sinav_programi'),
        oku('sinav_donemler'),
        oku('sinav_gonderimleri'),
        oku('sinav_cakisma_kabul'),
        oku('departments'),
        oku('faculties'),
        db
          .collection('professors')
          .find(
            {},
            {
              projection: {
                name: 1,
                departmentId: 1,
                department: 1,
                roles: 1,
                gozetmenBolumleri: 1,
                gozetmenlik: 1,
                additionalDepartments: 1,
                isMemur: 1,
              },
            }
          )
          .toArray(),
      ]);
    const bolumler = depts.map((d) => {
      const k = kimlikler(d);
      return {
        id: String(d._docId || d.id || (d._id && d._id.toString()) || k[0] || ''),
        name: d.name || '',
        facultyId: d.facultyId || '',
        kimlikler: k,
      };
    });
    const bugun = new Date().toISOString().slice(0, 10);
    const rapor = sinavKuralRaporu({
      sinavlar,
      donemler,
      gonderimler,
      kabuller,
      bolumler,
      fakulteler,
      akademisyenler,
      bugun,
      tum,
    });
    console.log(raporMetni(rapor));
    if (jsonYolu) {
      require('fs').writeFileSync(jsonYolu, JSON.stringify(rapor, null, 2));
      console.log('\nJSON yazıldı: ' + jsonYolu);
    }
  } catch (e) {
    console.error('Rapor üretilemedi:', e && e.message);
    kod = 1;
  } finally {
    try {
      if (disconnect) await disconnect();
    } catch (_) {
      /* bağlantı zaten kapalı */
    }
    process.exit(kod);
  }
})();
