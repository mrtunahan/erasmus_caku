var MongoClient = require('mongodb').MongoClient;
var fs = require('fs');
var path = require('path');

var MONGO_URI = 'mongodb://localhost:27017';
var DB_NAME = 'caku_erasmus';
var BACKUP_DIR = path.join(__dirname, '..', 'mongo-backups');
var MAX_BACKUPS = 10;

var now = new Date();
var date = now.getFullYear() + '-' +
  String(now.getMonth()+1).padStart(2,'0') + '-' +
  String(now.getDate()).padStart(2,'0') + '_' +
  String(now.getHours()).padStart(2,'0') + '-' +
  String(now.getMinutes()).padStart(2,'0') + '-' +
  String(now.getSeconds()).padStart(2,'0');

var backupPath = path.join(BACKUP_DIR, date);

if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, {recursive: true});

var c = new MongoClient(MONGO_URI);
c.connect().then(async function() {
  var db = c.db(DB_NAME);

  // Yedek klasörü oluştur
  if (!fs.existsSync(backupPath)) fs.mkdirSync(backupPath, {recursive: true});

  var cols = await db.listCollections().toArray();
  var totalDocs = 0;

  for (var i = 0; i < cols.length; i++) {
    var colName = cols[i].name;
    var docs = await db.collection(colName).find({}).toArray();
    var filePath = path.join(backupPath, colName + '.json');
    fs.writeFileSync(filePath, JSON.stringify(docs, null, 2), 'utf8');
    totalDocs += docs.length;
    console.log('  ' + colName + ': ' + docs.length + ' belge');
  }

  // Özet dosyası
  fs.writeFileSync(path.join(backupPath, '_summary.json'), JSON.stringify({
    date: date,
    db: DB_NAME,
    collections: cols.length,
    totalDocs: totalDocs
  }, null, 2));

  console.log('\nBASARILI - ' + cols.length + ' koleksiyon, ' + totalDocs + ' belge yedeklendi');
  console.log('Konum: ' + backupPath);

  // Eski yedekleri temizle (max 10)
  var allBackups = fs.readdirSync(BACKUP_DIR)
    .filter(function(f) { return fs.statSync(path.join(BACKUP_DIR, f)).isDirectory() && f !== '.'; })
    .sort()
    .reverse();

  if (allBackups.length > MAX_BACKUPS) {
    for (var j = MAX_BACKUPS; j < allBackups.length; j++) {
      var old = path.join(BACKUP_DIR, allBackups[j]);
      fs.rmSync(old, {recursive: true, force: true});
      console.log('Eski yedek silindi: ' + allBackups[j]);
    }
  }

  c.close();
  process.exit(0);
}).catch(function(err) {
  console.error('HATA:', err);
  c.close();
  process.exit(1);
});
