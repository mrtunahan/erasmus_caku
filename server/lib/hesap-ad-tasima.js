/**
 * ESKİ ADLA KALMIŞ E-POSTA HESABINI YENİ ADA TAŞI
 *
 * Akademisyende hesap anahtarı adın kendisidir: `hesap_epostalari` kaydının
 * kimliği "professor:<ad>". Ad standardı (büyük harf + standart unvan,
 * server/ad-standart-gecis.js) belgelerin İÇİNDEKİ adları çevirdi ama belge
 * KİMLİKLERİNİ çeviremedi. Sonuç:
 *   • "Şifremi unuttum" bağlantı gönderiyor, ama yeni şifre ESKİ adın şifre
 *     kaydına yazılıyordu — kişi yeni adla girdiği için şifresi değişmiyordu.
 *   • Doğrulanmış e-posta görünmüyor, doğrulama yeniden isteniyordu.
 *
 * Kural: eski ad artık hiçbir akademisyenin adı DEĞİLSE ve unvan/harf farkı
 * yok sayıldığında TEK bir akademisyene uyuyorsa kayıt o kişinin anahtarına
 * taşınır. Birden çok kişiye uyuyorsa (aynı adlı iki kişi) dokunulmaz.
 */
const { kisiAnahtari } = require('./sinav-programi-yazma');

const ONEK = 'professor:';
const KOLEKSIYONLAR = ['hesap_epostalari', 'eposta_dogrulama'];
const SIFIRLAMA = 'sifre_sifirlama';

/**
 * Saf karar: eski adın bugünkü karşılığı.
 * @param {string} eskiAd
 * @param {string[]} adlar  bugünkü akademisyen adları
 * @returns {string} yeni ad; değişmemişse ya da belirsizse ''
 */
function yeniAdBul(eskiAd, adlar) {
  const eski = String(eskiAd || '').trim();
  if (!eski) return '';
  const liste = [...new Set((adlar || []).map((a) => String(a || '').trim()).filter(Boolean))];
  if (liste.includes(eski)) return '';
  const k = kisiAnahtari(eski);
  if (!k) return '';
  const aday = liste.filter((a) => kisiAnahtari(a) === k);
  return aday.length === 1 ? aday[0] : '';
}

async function profesorAdlari(db) {
  const p = await db
    .collection('professors')
    .find({}, { projection: { name: 1 } })
    .toArray();
  return p.map((x) => x && x.name);
}

/** Kaydı (varsa) eski anahtardan yeni anahtara taşır; hedef doluysa dokunmaz. */
async function kayitlariTasi(db, eski, yeni) {
  for (const kol of KOLEKSIYONLAR) {
    const d = await db.collection(kol).findOne({ _id: eski });
    if (!d) continue;
    if (await db.collection(kol).findOne({ _id: yeni })) continue;
    const { _id, ...govde } = d;
    await db.collection(kol).insertOne({ _id: yeni, ...govde });
    await db.collection(kol).deleteOne({ _id: eski });
  }
  await db.collection(SIFIRLAMA).updateMany({ hesap: eski }, { $set: { hesap: yeni } });
}

/**
 * Anahtar eski adla kalmışsa yeni adın anahtarını döndürür (kayıtları taşır).
 * Akademisyen dışı hesaplar ve değişmemiş adlar olduğu gibi döner.
 */
async function guncelHesap(db, hesap) {
  const h = String(hesap || '');
  if (!h.startsWith(ONEK)) return h;
  const yeniAd = yeniAdBul(h.slice(ONEK.length), await profesorAdlari(db));
  if (!yeniAd) return h;
  const yeni = ONEK + yeniAd;
  await kayitlariTasi(db, h, yeni);
  return yeni;
}

/**
 * Oturum açmış akademisyenin (yeni adıyla) kaydı yoksa, eski adla kalmış
 * kaydını bulup taşır. Eşleşme tek değilse dokunmaz.
 */
async function eskiAdliHesabiTasi(db, hesap) {
  const h = String(hesap || '');
  if (!h.startsWith(ONEK)) return;
  if (await db.collection(KOLEKSIYONLAR[0]).findOne({ _id: h })) return;
  const k = kisiAnahtari(h.slice(ONEK.length));
  if (!k) return;
  const adaylar = new Set();
  for (const kol of KOLEKSIYONLAR) {
    const liste = await db
      .collection(kol)
      .find({ _id: { $regex: '^' + ONEK } }, { projection: { _id: 1 } })
      .toArray();
    liste.forEach((d) => {
      const id = String(d._id);
      if (id !== h && kisiAnahtari(id.slice(ONEK.length)) === k) adaylar.add(id);
    });
  }
  if (adaylar.size !== 1) return;
  const [eski] = [...adaylar];
  // Eski anahtar yalnız bu kişiye çözülüyorsa taşınır.
  const yeniAd = yeniAdBul(eski.slice(ONEK.length), await profesorAdlari(db));
  if (yeniAd && ONEK + yeniAd === h) await kayitlariTasi(db, eski, h);
}

module.exports = { yeniAdBul, guncelHesap, eskiAdliHesabiTasi };
