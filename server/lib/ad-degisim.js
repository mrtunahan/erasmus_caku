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

// ══════════════════════════════════════════════════════════════
// LİSTEDE KALMIŞ ESKİ AD BİÇİMLERİ (ad standardı sonrası onarım)
//
// Ad standardı (server/ad-standart-gecis.js) yalnız adın TAMAMINA eşit
// metinleri çevirdi; "A, B" gözetmen listesi, "A / B" ortak ders hocası ya
// da program slotundaki liste olduğu gibi kaldı. Eşleştirme kişi anahtarıyla
// yapıldığı için iş akışı bozulmadı, ama çıktılarda aynı kişi iki biçimde
// ("Öğrt. Gör. Gökalp Saylam" / "Öğr. Gör. GÖKALP SAYLAM") görünüyor.
// Yalnız KİŞİ ALANLARINDAKİ parçalar, TEK bir akademisyene uyuyorsa onun
// bugünkü adıyla değiştirilir; ayraçlar ve boşluklar korunur.
// ══════════════════════════════════════════════════════════════

const KISI_ALANLARI = new Set([
  'supervisor',
  'professor',
  'professors',
  'instructor',
  'instructors',
  'gozetmen',
  'gozetmenler',
  'hoca',
  'hocalar',
]);

/** Kişi anahtarı → bugünkü ad (yalnız tek kişiye çözülen anahtarlar). */
function anahtarHaritasi(adlar) {
  const say = new Map();
  [...new Set((adlar || []).map(metin).filter(Boolean))].forEach((ad) => {
    const k = kisiAnahtari(ad);
    if (!k) return;
    if (!say.has(k)) say.set(k, []);
    say.get(k).push(ad);
  });
  const h = new Map();
  say.forEach((liste, k) => {
    if (liste.length === 1) h.set(k, liste[0]);
  });
  return h;
}

function kisiMetniStandartla(deger, harita, degisimler) {
  if (typeof deger !== 'string' || deger.length > 300) return deger;
  return deger
    .split(/(\s*[,;/]\s*)/)
    .map((parca, i) => {
      if (i % 2 === 1) return parca; // ayraç
      const t = metin(parca);
      const yeni = t && harita.get(kisiAnahtari(t));
      if (!yeni || yeni === t) return parca;
      degisimler.push([t, yeni]);
      return parca.replace(t, yeni);
    })
    .join('');
}

/**
 * @param {*} belge
 * @param {Map<string,string>} harita  anahtarHaritasi çıktısı
 * @returns {{deger:*, degisimler:Array<[string,string]>}}
 */
function listeAdlariniStandartla(belge, harita) {
  const degisimler = [];
  const yuru = (v, kisiAlani) => {
    if (kisiAlani && typeof v === 'string') return kisiMetniStandartla(v, harita, degisimler);
    if (Array.isArray(v)) return v.map((x) => yuru(x, kisiAlani));
    if (v && typeof v === 'object' && v.constructor === Object) {
      const n = {};
      Object.keys(v).forEach((k) => {
        n[k] = yuru(v[k], KISI_ALANLARI.has(k));
      });
      return n;
    }
    return v;
  };
  const deger = yuru(belge, false);
  return { deger, degisimler };
}

module.exports = {
  adDegisimPlani,
  planOzeti,
  listeMetniCevir,
  DOKUNULMAZ,
  anahtarHaritasi,
  listeAdlariniStandartla,
  KISI_ALANLARI,
};
