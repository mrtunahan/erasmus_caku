const {MongoClient} = require('mongodb');
const c = new MongoClient('mongodb://localhost:27017');
c.connect().then(async () => {
  const db = c.db('caku_erasmus');

  // Makine'deki dersleri analiz et
  const makine = await db.collection('sinav_dersler').find({departmentId:'makine'}).toArray();
  const bilPattern = /^(BIL|BLM|BİL|MTH|OSD|OZD)/i;
  const bilCodes = makine.filter(d => bilPattern.test(d.code));
  const otherCodes = makine.filter(d => !bilPattern.test(d.code));

  console.log('Makine - Bilgisayar dersleri (silinecek):', bilCodes.length);
  console.log('Makine - Kalan dersler:');
  otherCodes.forEach(d => console.log(' ', d.code, d.name));

  // Bilgisayar derslerini makine'den sil
  const bilIds = bilCodes.map(d => d._id);
  if (bilIds.length > 0) {
    const result = await db.collection('sinav_dersler').deleteMany({
      _id: { $in: bilIds }
    });
    console.log('\nSilinen:', result.deletedCount, 'ders');
  }

  // Makine'deki ortak dersleri de temizle (MAT, FZK, FIZ, IST, ATA, TDI - bilgisayar seed'inden gelenler)
  const remaining = await db.collection('sinav_dersler').find({departmentId:'makine'}).toArray();
  console.log('\nMakine bölümünde kalan toplam ders:', remaining.length);
  remaining.forEach(d => console.log(' ', d.code, d.name));

  // Sonuç
  const depts = await db.collection('sinav_dersler').aggregate([
    { $group: { _id: '$departmentId', count: { $sum: 1 } } }
  ]).toArray();
  console.log('\nBölüm bazlı ders sayıları:');
  depts.forEach(d => console.log(' ', d._id, ':', d.count));

  c.close();
});
