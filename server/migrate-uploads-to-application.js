/**
 * Tek seferlik geçiş: internship_uploads koleksiyonu artık ÖĞRENCİ NO yerine
 * BAŞVURU (etap) id'si ile anahtarlanır. Böylece her staj etabının belgeleri
 * bağımsız olur. Bu script eski {ogrenciNo: {...belgeler}} dokümanlarını
 * ilgili başvuru id'sine taşır.
 *
 * Mantık:
 *  - internship_uploads dokümanları arasından _id'si SAYISAL (ogrenciNo) olanları bul.
 *  - O öğrencinin başvurularını (internship_applications.ogrenciNo) getir.
 *  - Hedef başvuru = en eski (createdAt) başvuru (orijinal etap).
 *  - Hedef başvuru id'sinde zaten belge dokümanı varsa atla (idempotent).
 *  - Belge alanlarını internship_uploads/{appId} olarak yaz, eski dokümanı sil.
 *  - Başvurusu olmayan öğrencilerin belgeleri olduğu gibi bırakılır (uyarı).
 *
 * Kullanım:
 *   DRY_RUN=1 node server/migrate-uploads-to-application.js
 *   node server/migrate-uploads-to-application.js
 */
(async () => {
  const { getDbSafe } = require('./config/database');
  const db = await getDbSafe();
  const dry = process.env.DRY_RUN === '1';

  const uploadsCol = db.collection('internship_uploads');
  const appsCol = db.collection('internship_applications');

  const apps = await appsCol.find({}).toArray();
  const appsByOgrNo = new Map();
  apps.forEach((a) => {
    const k = String(a.ogrenciNo || '');
    if (!k) return;
    if (!appsByOgrNo.has(k)) appsByOgrNo.set(k, []);
    appsByOgrNo.get(k).push(a);
  });
  // Her öğrenci için başvuruları createdAt'e göre sırala (en eski ilk)
  for (const arr of appsByOgrNo.values()) {
    arr.sort((a, b) => String(a.createdAt || '').localeCompare(String(b.createdAt || '')));
  }

  const appIdSet = new Set(apps.map((a) => String(a._docId || a._id)));
  const uploads = await uploadsCol.find({}).toArray();
  console.log(`internship_uploads doküman: ${uploads.length}, başvuru: ${apps.length}`);

  const isOgrenciNo = (id) => /^\d{6,12}$/.test(String(id));

  let migrated = 0;
  let skippedExisting = 0;
  let noApp = 0;
  let alreadyAppKeyed = 0;

  for (const doc of uploads) {
    const id = String(doc._docId || doc._id);
    if (!isOgrenciNo(id)) {
      alreadyAppKeyed++;
      continue; // zaten başvuru id'si ile anahtarlı
    }
    const studentApps = appsByOgrNo.get(id);
    if (!studentApps || studentApps.length === 0) {
      noApp++;
      console.log(`  ⚠ ogrenciNo=${id} için başvuru yok — belge dokümanı bırakıldı`);
      continue;
    }
    const target = studentApps[0]; // en eski etap
    const targetId = String(target._docId || target._id);

    // Hedefte zaten belge dokümanı var mı?
    const existing = await uploadsCol.findOne({ _id: targetId });
    if (existing) {
      skippedExisting++;
      console.log(`  • ogrenciNo=${id} → appId=${targetId} zaten mevcut, atlandı`);
      continue;
    }

    const { _id, _docId, ...fields } = doc;
    console.log(
      `  ✓ ogrenciNo=${id} → appId=${targetId} (etap: ${target.stajEtapLabel || '-'}), ${Object.keys(fields).length} alan` +
        (studentApps.length > 1
          ? ` [DİKKAT: ${studentApps.length} başvuru var, en eskiye taşındı]`
          : '')
    );
    if (!dry) {
      await uploadsCol.insertOne({ _id: targetId, _docId: targetId, ...fields });
      await uploadsCol.deleteOne({ _id: doc._id });
    }
    migrated++;
  }

  console.log(
    `\n${dry ? '[DRY RUN] yazılmadı.' : '✓ Tamamlandı.'} Taşınan: ${migrated}, zaten app-keyed: ${alreadyAppKeyed}, hedefte mevcut: ${skippedExisting}, başvurusuz: ${noApp}`
  );
  process.exit(0);
})().catch((e) => {
  console.error('Hata:', e);
  process.exit(1);
});
