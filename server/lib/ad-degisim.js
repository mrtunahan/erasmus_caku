/**
 * AKADEMİSYEN AD DEĞİŞİKLİĞİ — HANGİ BELGEDE NE DEĞİŞİR?
 *
 * Akademisyende kimlik AD METNİNİN KENDİSİDİR: şifreler adla anahtarlanır
 * (professor_passwords), bölüm yetkilileri ad dizisidir, ders/sınav/ders
 * programı/komisyon atamaları ad metnidir. Yalnız `professors.name`
 * değişirse kişi giriş yapamaz, dersleri ve sınavları eski adda kalır.
 *
 * Kural iki katmanlıdır:
 *   1) HER koleksiyonda TAM eşleşen her metin ve her nesne anahtarı çevrilir
 *      (lib/akademisyen-kimlik.js → adAtiflariniCevir; birleştirme ve ad
 *      standardı betikleriyle aynı kural). Cümle içindeki ad değişmez.
 *   2) Sınav ve ders kayıtlarında ad LİSTE ya da farklı unvanla yazılmış
 *      olabilir ("Dr. A, Arş. Gör. B", "A / B", "Doç. Dr. A" yerine "Dr. A"):
 *      bu koleksiyonlarda liste parçaları KİŞİ ANAHTARIYLA (unvan ve harf
 *      farkı yok sayılarak) eşlenir ve yeni ada çevrilir.
 *
 * `audit_logs` yeniden yazılmaz: denetim kaydı geçmişin belgesidir.
 */
const { adAtiflariniCevir } = require('./akademisyen-kimlik');
const { kisiAnahtari } = require('./sinav-programi-yazma');

const DOKUNULMAZ = new Set(['audit_logs', 'ad_degisim_yedekleri', 'oturum_iptalleri']);
const LISTELI = new Set(['sinav_programi', 'sinav_dersler', 'course_schedules']);

const metin = (v) => String(v == null ? '' : v).trim();

/** "A, B" ya da "A / B" metninde kişiyi (anahtarla) çevirir. */
function listeMetniCevir(deger, eskiK, yeni) {
  if (typeof deger !== 'string' || deger.length > 300 || !eskiK) return null;
  const ayrac = deger.includes(',') ? ',' : deger.includes(' / ') ? ' / ' : null;
  const parcalar = ayrac ? deger.split(ayrac) : [deger];
  let degisti = false;
  const yeniParcalar = parcalar.map((p) => {
    if (kisiAnahtari(p) === eskiK && metin(p) !== yeni) {
      degisti = true;
      return yeni;
    }
    return metin(p);
  });
  if (!degisti) return null;
  return yeniParcalar.join(ayrac === ',' ? ', ' : ayrac || '');
}

function listeliCevir(deger, eskiK, yeni) {
  if (typeof deger === 'string') {
    const c = listeMetniCevir(deger, eskiK, yeni);
    return c == null ? { deger, degisti: false } : { deger: c, degisti: true };
  }
  if (Array.isArray(deger)) {
    let degisti = false;
    const d = deger.map((x) => {
      const s = listeliCevir(x, eskiK, yeni);
      if (s.degisti) degisti = true;
      return s.deger;
    });
    return { deger: d, degisti };
  }
  if (deger && typeof deger === 'object' && deger.constructor === Object) {
    let degisti = false;
    const n = {};
    Object.keys(deger).forEach((k) => {
      const s = listeliCevir(deger[k], eskiK, yeni);
      if (s.degisti) degisti = true;
      n[k] = s.deger;
    });
    return { deger: n, degisti };
  }
  return { deger, degisti: false };
}

/**
 * @param {Object<string, object[]>} koleksiyonlar  { ad: belgeler }
 * @param {string} eski
 * @param {string} yeni
 * @returns {{koleksiyon:string, _id:*, once:object, sonra:object}[]}
 */
function adDegisimPlani(koleksiyonlar, eski, yeni) {
  const e = metin(eski);
  const y = metin(yeni);
  const plan = [];
  if (!e || !y || e === y) return plan;
  const eskiK = kisiAnahtari(e);
  Object.entries(koleksiyonlar || {}).forEach(([ad, belgeler]) => {
    if (DOKUNULMAZ.has(ad)) return;
    (belgeler || []).forEach((b) => {
      if (!b) return;
      const { _id, ...govde } = b;
      let s = adAtiflariniCevir(govde, e, y);
      let sonra = s.deger;
      let degisti = s.degisti;
      if (LISTELI.has(ad)) {
        const l = listeliCevir(sonra, eskiK, y);
        if (l.degisti) {
          sonra = l.deger;
          degisti = true;
        }
      }
      if (degisti) plan.push({ koleksiyon: ad, _id, once: b, sonra: { _id, ...sonra } });
    });
  });
  return plan;
}

/** Plan özeti: koleksiyon → belge sayısı. */
function planOzeti(plan) {
  const o = {};
  (plan || []).forEach((p) => {
    o[p.koleksiyon] = (o[p.koleksiyon] || 0) + 1;
  });
  return o;
}

module.exports = { adDegisimPlani, planOzeti, listeMetniCevir, DOKUNULMAZ };
