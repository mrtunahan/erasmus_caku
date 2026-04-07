var MongoClient = require('mongodb').MongoClient;
async function run() {
  var client = new MongoClient('mongodb://localhost:27017');
  await client.connect();
  var db = client.db('erasmus_caku');

  var dersler = await db.collection('sinav_dersler').find().toArray();
  console.log('Mevcut: ' + dersler.length);

  // code + name + donem bazında grupla
  var groups = {};
  dersler.forEach(function(d) {
    var key = (d.code||'') + '|' + (d.name||'') + '|' + (d.donem||'');
    if (groups[key] === undefined) groups[key] = [];
    groups[key].push(d);
  });

  var toRemove = [];
  Object.keys(groups).forEach(function(key) {
    var g = groups[key];
    if (g.length <= 1) return;
    // Akademisyeni olan kaydı tercih et
    g.sort(function(a, b) {
      var aHas = a.professor && a.professor.length > 0 ? 1 : 0;
      var bHas = b.professor && b.professor.length > 0 ? 1 : 0;
      return bHas - aHas;
    });
    // İlkini koru, gerisini sil
    for (var i = 1; i < g.length; i++) {
      toRemove.push(g[i]._id);
    }
    console.log(key + ': ' + g.length + ' kayit -> ' + (g.length-1) + ' silinecek (tutulan: ' + (g[0].professor || 'Bilinmiyor') + ')');
  });

  if (toRemove.length > 0) {
    await db.collection('sinav_dersler').deleteMany({ _id: { $in: toRemove } });
  }
  var remaining = await db.collection('sinav_dersler').countDocuments();
  console.log('\nSilinen: ' + toRemove.length + ', Kalan: ' + remaining);

  await client.close();
  process.exit(0);
}
run().catch(function(e) { console.error(e); process.exit(1); });
