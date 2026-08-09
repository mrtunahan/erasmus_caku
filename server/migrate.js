// ══════════════════════════════════════════════════════════════
// Migration Runner
// ──────────────────────────────────────────────────────────────
// Çalıştırma:
//   node server/migrate.js          # Bekleyen migration'ları uygular
//   node server/migrate.js --status # Sadece durum gösterir, çalıştırmaz
//   node server/migrate.js --dry    # Hangileri çalışacak listeler
//
// Migration dosyaları: server/migrations/<TIMESTAMP>_<isim>.js
// Şema (her dosya):
//   module.exports = {
//     description: "Kısa açıklama",
//     up: async (db) => { /* mongo işlemleri */ },
//   };
//
// Uygulanan migration'lar `_migrations` koleksiyonunda tutulur,
// aynı dosya iki kez çalıştırılmaz.
// ══════════════════════════════════════════════════════════════
const fs = require('fs');
const path = require('path');
const { connect, disconnect, getDb } = require('./config/database');

const MIGRATIONS_DIR = path.join(__dirname, 'migrations');
const COLLECTION = '_migrations';

const args = process.argv.slice(2);
const flags = {
  status: args.includes('--status'),
  dry: args.includes('--dry') || args.includes('--dry-run'),
};

function color(c, s) {
  const codes = {
    reset: '\x1b[0m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    grey: '\x1b[90m',
  };
  return (codes[c] || '') + s + codes.reset;
}

function listMigrationFiles() {
  if (!fs.existsSync(MIGRATIONS_DIR)) return [];
  return fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.js') && !f.startsWith('_'))
    .sort();
}

async function run() {
  console.log(color('blue', '→ Migration runner başlıyor...'));
  await connect();
  const db = getDb();
  const coll = db.collection(COLLECTION);
  await coll.createIndex({ name: 1 }, { unique: true }).catch(() => {});

  const files = listMigrationFiles();
  if (files.length === 0) {
    console.log(color('yellow', '  Migration dosyası bulunamadı (server/migrations/)'));
    await disconnect();
    return;
  }

  const applied = new Set((await coll.find({}).project({ name: 1 }).toArray()).map((d) => d.name));
  const pending = files.filter((f) => !applied.has(f));

  console.log(
    color(
      'grey',
      `  Toplam: ${files.length} dosya, uygulanmış: ${applied.size}, bekleyen: ${pending.length}`
    )
  );

  if (flags.status || flags.dry) {
    for (const f of files) {
      const mark = applied.has(f) ? color('green', '✓') : color('yellow', '•');
      console.log(`  ${mark} ${f}`);
    }
    if (flags.status) {
      await disconnect();
      return;
    }
  }

  if (pending.length === 0) {
    console.log(color('green', "✓ Tüm migration'lar uygulanmış."));
    await disconnect();
    return;
  }

  for (const file of pending) {
    const full = path.join(MIGRATIONS_DIR, file);
    let mod;
    try {
      mod = require(full);
    } catch (e) {
      console.log(color('red', `✗ ${file} yüklenemedi: ${e.message}`));
      await disconnect();
      process.exit(1);
    }
    if (typeof mod.up !== 'function') {
      console.log(color('red', `✗ ${file} 'up' fonksiyonu yok, atlanıyor.`));
      continue;
    }
    console.log(color('blue', `→ ${file} ${mod.description ? '— ' + mod.description : ''}`));
    if (flags.dry) {
      console.log(color('grey', '  (dry-run: çalıştırılmadı)'));
      continue;
    }

    const startedAt = new Date();
    try {
      await mod.up(db);
      await coll.insertOne({
        name: file,
        description: mod.description || '',
        appliedAt: new Date(),
        durationMs: Date.now() - startedAt.getTime(),
      });
      console.log(color('green', `  ✓ tamamlandı (${Date.now() - startedAt.getTime()} ms)`));
    } catch (e) {
      console.log(color('red', `  ✗ HATA: ${e.message}`));
      console.error(e);
      await disconnect();
      process.exit(1);
    }
  }

  await disconnect();
  console.log(color('green', '✓ Bitti.'));
}

run().catch(async (e) => {
  console.error(color('red', 'Migration runner hatası: ' + e.message));
  console.error(e);
  try {
    await disconnect();
  } catch (_) {}
  process.exit(1);
});
