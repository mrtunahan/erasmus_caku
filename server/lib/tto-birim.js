// TTO yöneticisi = TTO birimine kayıtlı akademisyen.
// Kural lib/tto-talep.js → ttoBirimUyesiMi (istemciyle ortak, test altında);
// burada yalnız veritabanından okunur. Aynı adlı TÜM profesör kayıtlarına
// bakılır: profilBul'un birleşik profili tek bir departmentId taşır, kişinin
// TTO kaydı öteki kayıtta olabilir.
let kuralSozu = null;
function kural() {
  if (!kuralSozu) kuralSozu = import('../../lib/tto-talep.js');
  return kuralSozu;
}

async function ttoBirimUyesi(db, ad) {
  const isim = String(ad == null ? '' : ad);
  if (!isim) return false;
  const [T, kayitlar, bolumler] = await Promise.all([
    kural(),
    db
      .collection('professors')
      .find(
        { name: isim },
        { projection: { departmentId: 1, additionalDepartments: 1, department: 1 } }
      )
      .toArray(),
    db
      .collection('departments')
      .find(
        {},
        {
          projection: {
            id: 1,
            _docId: 1,
            code: 1,
            name: 1,
            shortName: 1,
            kimlikler: 1,
            eskiKimlikler: 1,
          },
        }
      )
      .toArray(),
  ]);
  return T.ttoBirimUyesiMi(kayitlar, bolumler);
}

/**
 * TTO yöneticilerinin (TTO birimine kayıtlı akademisyenlerin) adları.
 * Gelen talep bildirimi bunlara gider. Aynı adlı birden çok kayıt tek kişi
 * sayılır; kural ttoBirimUyesi ile aynıdır.
 */
async function ttoYoneticileri(db) {
  const [T, kayitlar, bolumler] = await Promise.all([
    kural(),
    db
      .collection('professors')
      .find(
        {},
        { projection: { name: 1, departmentId: 1, additionalDepartments: 1, department: 1 } }
      )
      .toArray(),
    db
      .collection('departments')
      .find(
        {},
        {
          projection: {
            id: 1,
            _docId: 1,
            code: 1,
            name: 1,
            shortName: 1,
            kimlikler: 1,
            eskiKimlikler: 1,
          },
        }
      )
      .toArray(),
  ]);
  const kisiler = new Map();
  kayitlar.forEach((k) => {
    const ad = String((k && k.name) || '').trim();
    if (!ad) return;
    if (!kisiler.has(ad)) kisiler.set(ad, []);
    kisiler.get(ad).push(k);
  });
  return [...kisiler.entries()]
    .filter(([, liste]) => T.ttoBirimUyesiMi(liste, bolumler))
    .map(([ad]) => ad);
}

module.exports = { ttoBirimUyesi, ttoYoneticileri };
