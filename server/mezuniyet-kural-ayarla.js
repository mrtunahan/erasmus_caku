/**
 * Mezuniyet kuralı — bir bölümün STAJ ve ÖĞRETİM MODELİ ayarını yazar.
 *
 * Varsayılan: Bilgisayar Mühendisliği, 7+1 program, zorunlu stajlar
 *   Staj I  → BİL200, Staj II → BİL300, başarı notu BŞ.
 * Yalnız bu alanlar değişir; not ölçeği, AKTS, AGNO vb. olduğu gibi kalır.
 *
 * Bölüm, adından bulunur (BOLUM ile değiştirilebilir). Kural kaydının
 * kimliği uygulamanın kullandığı bölüm kimliği olmalıdır: önce o bölüm için
 * var olan kural kaydı, yoksa mevcut mezuniyet başvurularının bölüm
 * kimliği, o da yoksa bölüm kaydının kendi kimliği kullanılır.
 *
 * Kullanım (sunucuda, proje kökünden):
 *   node server/mezuniyet-kural-ayarla.js            # yalnız gösterir
 *   UYGULA=1 node server/mezuniyet-kural-ayarla.js   # yazar
 *   BOLUM="Elektrik" UYGULA=1 node server/mezuniyet-kural-ayarla.js
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
require('dotenv').config({ path: path.join(__dirname, '.env') });

const AYAR = {
  toplamYariyil: 8,
  isyeriYariyilSayisi: 1, // 7+1
  stajZorunlu: true,
  stajDersleri: [
    { ad: 'Staj I', kod: 'BİL200' },
    { ad: 'Staj II', kod: 'BİL300' },
  ],
  stajlar: ['Staj I', 'Staj II'],
  stajBasariNotu: 'BŞ',
};

const sade = (s) =>
  String(s || '')
    .toLocaleLowerCase('tr-TR')
    .replace(/[çğıöşü]/g, (c) => ({ ç: 'c', ğ: 'g', ı: 'i', ö: 'o', ş: 's', ü: 'u' })[c])
    .replace(/[^a-z0-9]/g, '');

(async () => {
  const { getDbSafe } = require('./config/database');
  const { kimlikler } = require('./lib/bolum-kimlik');
  const db = await getDbSafe();
  const uygula = process.env.UYGULA === '1';
  const aranan = sade(process.env.BOLUM || 'Bilgisayar Mühendisliği');

  const bolumler = (await db.collection('departments').find({}).toArray()).filter(
    (d) => sade(d.name).indexOf(aranan) >= 0
  );
  const varyant = new Set();
  bolumler.forEach((d) => kimlikler(d).forEach((k) => varyant.add(String(k))));
  if (!bolumler.length && aranan.indexOf('bilgisayar') === 0) varyant.add('bilgisayar');
  if (!varyant.size) {
    console.error('Bölüm bulunamadı:', process.env.BOLUM || 'Bilgisayar Mühendisliği');
    process.exit(1);
  }
  console.log('Bölüm:', bolumler.map((d) => d.name).join(', ') || '(yerleşik liste)');
  console.log('Kimlikler:', [...varyant].join(', '));

  const col = db.collection('mezuniyet_kurallari');
  const mevcut = await col
    .find({ $or: [{ _docId: { $in: [...varyant] } }, { departmentId: { $in: [...varyant] } }] })
    .toArray();
  let hedefler = mevcut.map((k) => String(k._docId || k.departmentId));
  if (!hedefler.length) {
    const basvuru = await db
      .collection('mezuniyet_basvurulari')
      .findOne({ departmentId: { $in: [...varyant] } });
    hedefler = [String((basvuru && basvuru.departmentId) || [...varyant][0])];
  }

  for (const id of hedefler) {
    const once = mevcut.find((k) => String(k._docId || k.departmentId) === id) || {};
    console.log('\nKural kaydı:', id, once._docId ? '(var)' : '(yeni)');
    console.log(
      '  önce :',
      JSON.stringify({
        toplamYariyil: once.toplamYariyil,
        isyeriYariyilSayisi: once.isyeriYariyilSayisi,
        stajZorunlu: once.stajZorunlu,
        stajDersleri: once.stajDersleri,
        stajlar: once.stajlar,
        stajBasariNotu: once.stajBasariNotu,
      })
    );
    console.log('  sonra:', JSON.stringify(AYAR));
    if (uygula) {
      await col.updateOne(
        { _docId: id },
        {
          $set: {
            ...AYAR,
            departmentId: id,
            updatedAt: new Date().toISOString(),
            updatedBy: 'mezuniyet-kural-ayarla',
          },
          $setOnInsert: { _docId: id },
        },
        { upsert: true }
      );
      console.log('  ✓ yazıldı');
    }
  }
  if (!uygula)
    console.log(
      '\nHiçbir şey yazılmadı. Yazmak için: UYGULA=1 node server/mezuniyet-kural-ayarla.js'
    );
  process.exit(0);
})().catch((e) => {
  console.error('Hata:', e && e.message);
  process.exit(1);
});
