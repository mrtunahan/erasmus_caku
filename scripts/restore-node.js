var MongoClient = require('mongodb').MongoClient;
var fs = require('fs');
var path = require('path');

var MONGO_URI = 'mongodb://localhost:27017';
var DB_NAME = 'caku_erasmus';
var BACKUP_DIR = path.join(__dirname, '..', 'mongo-backups');

var arg = process.argv[2] || '';

// --list: yedekleri listele
if (arg === '--list') {
  if (!fs.existsSync(BACKUP_DIR)) { console.log('Yedek yok'); process.exit(0); }
  var dirs = fs.readdirSync(BACKUP_DIR)
    .filter(function(f) { return fs.statSync(path.join(BACKUP_DIR, f)).isDirectory(); })
    .sort().reverse();
  console.log('=== Mevcut Yedekler ===');
  dirs.forEach(function(d) {
    var summary = path.join(BACKUP_DIR, d, '_summary.json');
    if (fs.existsSync(summary)) {
      var s = JSON.parse(fs.readFileSync(summary, 'utf8'));
      console.log('  ' + d + '  (' + s.collections + ' koleksiyon, ' + s.totalDocs + ' belge)');
    } else {
      console.log('  ' + d);
    }
  });
  process.exit(0);
}

// Yedek seç
var backups = fs.existsSync(BACKUP_DIR) ? fs.readdirSync(BACKUP_DIR)
  .filter(function(f) { return fs.statSync(path.join(BACKUP_DIR, f)).isDirectory(); })
  .sort().reverse() : [];

var selected;
if (arg) {
  selected = backups.find(function(b) { return b.indexOf(arg) >= 0; });
} else {
  selected = backups[0];
}

if (!selected) {
  console.log('Yedek bulunamadi! Firestore yedeğinden yuklemek icin:');
  console.log('  node scripts/restore-from-firestore.js');
  process.exit(1);
}

var restorePath = path.join(BACKUP_DIR, selected);
console.log('Geri yuklenecek yedek: ' + selected);

var c = new MongoClient(MONGO_URI);
c.connect().then(async function() {
  var db = c.db(DB_NAME);
  var files = fs.readdirSync(restorePath).filter(function(f) { return f.endsWith('.json') && f !== '_summary.json'; });

  var total = 0;
  for (var i = 0; i < files.length; i++) {
    var colName = files[i].replace('.json', '');
    var data = JSON.parse(fs.readFileSync(path.join(restorePath, files[i]), 'utf8'));
    if (!Array.isArray(data) || data.length === 0) continue;

    await db.collection(colName).deleteMany({});
    await db.collection(colName).insertMany(data, {ordered: false}).catch(function(){});
    console.log('  ' + colName + ': ' + data.length + ' belge');
    total += data.length;
  }

  console.log('\nBASARILI - ' + total + ' belge geri yuklendi');
  console.log('API sunucusunu yeniden baslat: sudo systemctl restart caku-api');
  c.close();
  process.exit(0);
}).catch(function(err) {
  console.error('HATA:', err);
  c.close();
  process.exit(1);
});
