var MongoClient = require('mongodb').MongoClient;
var fs = require('fs');
var path = require('path');

var BACKUP_DIR = path.join(__dirname, '..', 'firestore-backup');
var MONGO_URI = 'mongodb://localhost:27017';
var DB_NAME = 'caku_erasmus';

// Koleksiyon adı mapping (dosya adı -> MongoDB koleksiyon adı)
var FILE_TO_COLLECTION = {
  'portal_posts__comments.json': 'portal_posts_comments',
  'portal_notifications__items.json': 'portal_notifications_items'
};

function getCollectionName(filename) {
  if (FILE_TO_COLLECTION[filename]) return FILE_TO_COLLECTION[filename];
  return filename.replace('.json', '');
}

var c = new MongoClient(MONGO_URI);
c.connect().then(async function() {
  var db = c.db(DB_NAME);
  var files = fs.readdirSync(BACKUP_DIR).filter(function(f) { return f.endsWith('.json') && f !== '_backup_summary.json'; });

  var totalRestored = 0;
  var skipped = [];
  var restored = [];

  for (var i = 0; i < files.length; i++) {
    var file = files[i];
    var colName = getCollectionName(file);
    var filePath = path.join(BACKUP_DIR, file);

    try {
      var data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      if (!Array.isArray(data) || data.length === 0) {
        console.log('  ATLA ' + colName + ': bos dosya');
        continue;
      }

      // Mevcut koleksiyondaki belge sayısı
      var existingCount = await db.collection(colName).countDocuments();

      if (existingCount >= data.length) {
        skipped.push(colName + ' (' + existingCount + ' mevcut, yedekte ' + data.length + ')');
        continue;
      }

      // Mevcut veriyi koru, sadece eksik olanları ekle
      if (existingCount > 0 && existingCount < data.length) {
        // Mevcut ID'leri al
        var existingIds = await db.collection(colName).find({}, {projection: {_id: 1}}).toArray();
        var existingIdSet = {};
        existingIds.forEach(function(doc) { existingIdSet[String(doc._id)] = true; });

        // Sadece eksik olanları ekle
        var newDocs = data.filter(function(doc) { return !existingIdSet[String(doc._id)]; });
        if (newDocs.length > 0) {
          await db.collection(colName).insertMany(newDocs, {ordered: false}).catch(function() {});
          restored.push(colName + ': +' + newDocs.length + ' eklendi (' + existingCount + ' mevcut korundu)');
          totalRestored += newDocs.length;
        }
      } else if (existingCount === 0) {
        // Koleksiyon boş, tamamını yükle
        await db.collection(colName).insertMany(data, {ordered: false}).catch(function() {});
        restored.push(colName + ': ' + data.length + ' belge yuklendi');
        totalRestored += data.length;
      }
    } catch (e) {
      console.log('  HATA ' + colName + ': ' + e.message);
    }
  }

  console.log('\n========================================');
  console.log('  RESTORE TAMAMLANDI');
  console.log('========================================');
  console.log('\nGeri yuklenen:');
  restored.forEach(function(r) { console.log('  + ' + r); });
  console.log('\nAtlanan (veri zaten mevcut):');
  skipped.forEach(function(s) { console.log('  - ' + s); });
  console.log('\nToplam: ' + totalRestored + ' belge geri yuklendi');
  console.log('========================================\n');

  // Sonuc kontrolu
  var cols = await db.listCollections().toArray();
  console.log('Koleksiyon sayilari:');
  for (var j = 0; j < cols.length; j++) {
    var count = await db.collection(cols[j].name).countDocuments();
    console.log('  ' + cols[j].name + ': ' + count);
  }

  c.close();
  process.exit(0);
}).catch(function(err) {
  console.error('HATA:', err);
  c.close();
  process.exit(1);
});
