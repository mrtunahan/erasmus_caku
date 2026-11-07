// ══════════════════════════════════════════════════════════════
// DERSİN KAYITLI ÖĞRENCİLERİ (sunucu) — Ders Odaları / yoklama / bildirim
//
// İçinde bulunulan dönemin seçimi (student_courses), eski liste
// (students.myCourseIds) yalnız o döneme yeni kaydı olmayan için.
// Kural istemciyle ortak: lib/ogrenci-ders-secimi.js → dersinOgrenciNolari.
// ══════════════════════════════════════════════════════════════
const metin = (v) => String(v == null ? '' : v).trim();
let secimSozu = null;
async function dersListesi(db, dersId) {
  const id = metin(dersId);
  if (!id) return [];
  if (!secimSozu) secimSozu = import('../../lib/ogrenci-ders-secimi.js');
  if (!donemSozu) donemSozu = import('../../lib/ders-odasi.js');
  const [S, D] = await Promise.all([secimSozu, donemSozu]);
  const donem = D.donemAnahtari();
  const secimler = await db
    .collection('student_courses')
    .find({ courseIds: id })
    .toArray()
    .catch(() => []);
  const adaylar = secimler
    .map((d) => metin(d.studentNumber) || metin(d._docId).split('__')[0])
    .filter(Boolean);
  const ogrenciler = await db
    .collection('students')
    .find(
      { $or: [{ studentNumber: { $in: adaylar } }, { myCourseIds: id }] },
      { projection: { studentNumber: 1, myCourseIds: 1 } }
    )
    .toArray()
    .catch(() => []);
  const eskiAdaylar = ogrenciler
    .filter((o) => (o.myCourseIds || []).map(metin).includes(id))
    .map((o) => metin(o.studentNumber))
    .filter((n) => n && !adaylar.includes(n));
  const ekSecimler = eskiAdaylar.length
    ? await db
        .collection('student_courses')
        .find({
          $or: [
            { studentNumber: { $in: eskiAdaylar }, termKey: donem },
            {
              _docId: {
                $in: eskiAdaylar.map((n) => n.replace(/[^A-Za-z0-9]/g, '') + '__' + donem),
              },
            },
          ],
        })
        .toArray()
        .catch(() => [])
    : [];
  return S.dersinOgrenciNolari({
    dersIdleri: [id],
    donem,
    donemKayitlari: secimler.concat(ekSecimler),
    ogrenciKayitlari: ogrenciler,
    eskiListe: true,
  });
}

let donemSozu = null;

module.exports = { dersListesi };
