// ══════════════════════════════════════════════════════════════
// Akademik takvim tohumlama (seed) — ÇAKÜ 2026-2027
//   server/data/akademik-takvim-2026-2027.json içindeki etkinlikleri
//   'akademik_takvim' koleksiyonuna ÜNİVERSİTE GENELİ kapsamla ekler
//   (tüm öğrenciler ve takvim modülü görür).
//
//   JSON formatı (dizi):
//     { "title": "Güz dönemi ders kayıtları",
//       "date": "2026-09-21",            // GG değil → YYYY-MM-DD
//       "endDate": "2026-09-25",         // opsiyonel (aralık)
//       "kind": "takvim",                // takvim|duyuru|etkinlik|sinav|tatil
//       "category": "Lisans" }           // opsiyonel etiket (açıklamaya eklenir)
//
//   İdempotent: aynı (scope+title+date) varsa GÜNCELLER, yoksa ekler —
//   tekrar çalıştırınca mükerrer oluşmaz.
//
//   GÜVENLİ: önce DRY_RUN. Uygulamak için:
//     APPLY=1 node server/seed-akademik-takvim.js
// ══════════════════════════════════════════════════════════════
const path = require('path');
const fs = require('fs');
const { disconnect, getDbSafe } = require('./config/database');

const APPLY = process.env.APPLY === '1';
const FILE =
  process.env.SEED_FILE || path.join(__dirname, 'data', 'akademik-takvim-2026-2027.json');

function fmtTR(iso) {
  try {
    return new Date(iso).toLocaleDateString('tr-TR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  } catch (_) {
    return iso;
  }
}

(async () => {
  if (!fs.existsSync(FILE)) {
    console.error(`Veri dosyası bulunamadı: ${FILE}`);
    process.exit(1);
  }
  const raw = JSON.parse(fs.readFileSync(FILE, 'utf8'));
  if (!Array.isArray(raw) || raw.length === 0) {
    console.error('Veri dosyası boş veya dizi değil. Önce etkinlikleri doldurun.');
    process.exit(1);
  }

  // Normalize + açıklama kur
  const events = raw
    .filter((e) => e && e.title && e.date)
    .map((e) => {
      const descParts = [];
      if (e.endDate && e.endDate !== e.date) {
        descParts.push(`${fmtTR(e.date)} – ${fmtTR(e.endDate)}`);
      }
      if (e.category) descParts.push(e.category);
      if (e.description) descParts.push(e.description);
      return {
        title: String(e.title).trim(),
        date: String(e.date).trim(),
        endDate: e.endDate ? String(e.endDate).trim() : '',
        kind: e.kind || 'takvim',
        scope: 'university',
        facultyId: '',
        departmentId: '',
        description: descParts.join(' · '),
      };
    });

  console.log(`\n${events.length} etkinlik (üniversite geneli) işlenecek:\n`);
  events
    .slice()
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .forEach((e) =>
      console.log(`  ${e.date}${e.endDate ? '→' + e.endDate : ''}  [${e.kind}]  ${e.title}`)
    );

  const db = await getDbSafe();
  const col = db.collection('akademik_takvim');

  let willInsert = 0;
  let willUpdate = 0;
  for (const e of events) {
    const existing = await col.findOne({ scope: 'university', title: e.title, date: e.date });
    if (existing) willUpdate++;
    else willInsert++;
  }
  console.log(`\nÖzet: ${willInsert} yeni eklenecek, ${willUpdate} güncellenecek.`);

  if (!APPLY) {
    console.log(
      '\n[DRY_RUN] Hiçbir şey yazılmadı. Uygulamak için: APPLY=1 node server/seed-akademik-takvim.js\n'
    );
    await disconnect();
    return;
  }

  const now = new Date();
  let ins = 0;
  let upd = 0;
  for (const e of events) {
    const existing = await col.findOne({ scope: 'university', title: e.title, date: e.date });
    if (existing) {
      await col.updateOne(
        { _id: existing._id },
        { $set: { ...e, createdByName: 'Akademik Takvim (sistem)', updatedAt: now } }
      );
      upd++;
    } else {
      await col.insertOne({
        ...e,
        createdByName: 'Akademik Takvim (sistem)',
        createdAt: now,
        updatedAt: now,
      });
      ins++;
    }
  }
  console.log(`\n✓ Tamamlandı. ${ins} eklendi, ${upd} güncellendi.\n`);
  await disconnect();
})().catch(async (e) => {
  console.error('HATA:', e.message);
  try {
    await disconnect();
  } catch (_) {
    /* yok say */
  }
  process.exit(1);
});
