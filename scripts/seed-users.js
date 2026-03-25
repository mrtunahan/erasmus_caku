const {MongoClient} = require('mongodb');
const c = new MongoClient('mongodb://localhost:27017');
c.connect().then(async function() {
  const db = c.db('caku_erasmus');
  const depts = [
    {_id:'bilgisayar',name:'Bilgisayar Mühendisliği',managerName:'Tunahan KORKMAZ'},
    {_id:'makine',name:'Makine Mühendisliği',managerName:'Makine Yetkilisi'},
    {_id:'elektrik',name:'Elektrik-Elektronik Mühendisliği',managerName:'Elektrik Yetkilisi'},
    {_id:'insaat',name:'İnşaat Mühendisliği',managerName:'İnşaat Yetkilisi'},
    {_id:'gida',name:'Gıda Mühendisliği',managerName:'Gıda Yetkilisi'},
    {_id:'cevre',name:'Çevre Mühendisliği',managerName:'Çevre Yetkilisi'}
  ];
  for (var i = 0; i < depts.length; i++) {
    var d = depts[i];
    await db.collection('departments').updateOne({_id: d._id}, {$set: d}, {upsert: true});
  }
  console.log('Bolumler:', await db.collection('departments').countDocuments());
  await db.collection('passwords').updateOne({_id:'admin_password'}, {$set:{password:'160525'}}, {upsert:true});
  await db.collection('passwords').updateOne({_id:'defaults'}, {$set:{professorDefault:'132333'}}, {upsert:true});
  await db.collection('passwords').updateOne({_id:'department_manager_passwords'}, {$set:{}}, {upsert:true});
  console.log('Sifreler:', await db.collection('passwords').countDocuments());
  console.log('TAMAM - Giris yapabilirsin');
  c.close();
}).catch(function(err) {
  console.error('HATA:', err);
  c.close();
});
