/**
 * PERSONEL YAZMASINDA BÖLÜM SINIRI — öğrenci kaydı, muafiyet, anket yanıtı
 *
 * Rol kapısı (writeDecision) personelin bu koleksiyonlara yazmasına izin
 * veriyor ama "hangi bölümün kaydına" sorusunu sormuyordu: bir bölüm
 * yetkilisi başka bölümün öğrencisini düzenleyip silebiliyor, bir akademisyen
 * başkası adına anket yanıtı yazabiliyordu. Okuma tarafı zaten yetki alanına
 * daraltılmıştı; yazma burada ona eşitlenir.
 *
 * Saf işlevler: veritabanı okumasını çağıran yapar (db.js), karar burada.
 */

const { adBuyukHarf, AD_ALANLARI } = require('./ad-bicim');

const metin = (v) => String(v == null ? '' : v).trim();
const dizi = (v) => (Array.isArray(v) ? v.map(metin).filter(Boolean) : []);

// ══════════════════════════════════════════════════════════════
// ÖĞRENCİ KAYDI (students)
//
// ⚠ Ekran kaydın TAMAMINI gönderiyor (DB.updateStudent). Alan adına bakan
// bir kural her ÇAP / Erasmus işlemini kırardı; burada DEĞER karşılaştırılır:
// yalnız gerçekten değişen alanlar sayılır.
// ══════════════════════════════════════════════════════════════

const YOKSAY = new Set(['createdAt', 'updatedAt', '_id', '_docId', 'id']);
const DUZENLEME_IZNI = ['duzenlemeAcik', 'duzenlemeAcanKisi', 'duzenlemeAcilmaTarihi'];
const ERASMUS_ALANLARI = [
  'erasmusAccess',
  'outgoingMatches',
  'returnMatches',
  'hostInstitution',
  'hostCountry',
  'hostFaculty',
  'hostDepartment',
  'semester',
];
// Ana bölümü başka olan (ÇAP / bağlı numara) öğrencide değişebilecekler.
const CAP_IZINLI = new Set(
  ['additionalDepartments', 'bagliOgrenciNolar'].concat(DUZENLEME_IZNI, ERASMUS_ALANLARI)
);
// Okuma ad alanlarını büyük harfe çevirerek döndürür (ad-bicim.js); geri gelen
// ad, kayıttaki küçük harfli adla aynı sayılır.
const BUYUK_HARF = new Set(AD_ALANLARI);

const bosMu = (v) =>
  v == null ||
  v === '' ||
  (Array.isArray(v) && v.length === 0) ||
  (typeof v === 'object' &&
    !Array.isArray(v) &&
    !(v instanceof Date) &&
    Object.keys(v).length === 0);

function kararli(v) {
  if (v instanceof Date) return JSON.stringify(v.toISOString());
  if (v && typeof v === 'object' && typeof v.toHexString === 'function')
    return JSON.stringify(v.toHexString());
  if (Array.isArray(v)) return '[' + v.map(kararli).join(',') + ']';
  if (v && typeof v === 'object') {
    return (
      '{' +
      Object.keys(v)
        .filter((k) => v[k] !== undefined)
        .sort()
        .map((k) => JSON.stringify(k) + ':' + kararli(v[k]))
        .join(',') +
      '}'
    );
  }
  return JSON.stringify(v === undefined ? null : v);
}

function esitMi(alan, a, b) {
  if (bosMu(a) && bosMu(b)) return true;
  if (BUYUK_HARF.has(alan) && typeof a === 'string' && typeof b === 'string') {
    return adBuyukHarf(a) === adBuyukHarf(b);
  }
  return kararli(a) === kararli(b);
}

/** Kayıtta GERÇEKTEN değişen üst düzey alanlar. */
function degisenAlanlar(data, mevcut) {
  const m = mevcut || {};
  const out = new Set();
  Object.keys(data || {}).forEach((k) => {
    const ust = k.split('.')[0];
    if (YOKSAY.has(ust)) return;
    if (k.includes('.') || !esitMi(k, data[k], m[k])) out.add(ust);
  });
  return [...out];
}

/** Liste farkı: eklenen ve çıkarılan değerler. */
function listeFarki(eski, yeni) {
  const e = new Set(dizi(eski));
  const y = new Set(dizi(yeni));
  return [...[...y].filter((x) => !e.has(x)), ...[...e].filter((x) => !y.has(x))];
}

const anaBolum = (r) => metin(r && r.departmentId) || 'bilgisayar';

/** bagliOgrenciNolar değişikliğinde sorgulanacak numaralar. */
function bagliNoFarki(op, mevcut) {
  if (!op || !op.data || !('bagliOgrenciNolar' in op.data)) return [];
  return listeFarki(mevcut && mevcut.bagliOgrenciNolar, op.data.bagliOgrenciNolar);
}

/**
 * @param {object} p
 * @param {object} p.op
 * @param {object|null} p.mevcut
 * @param {boolean} p.yonetici  bölüm/fakülte yetkilisi (kayıt açar, siler, taşır)
 * @param {object} p.yazmaAlani  kullaniciAlani(..., false)
 * @param {object} p.okumaAlani  kullaniciAlani(..., true)
 * @param {(alan, bolumId) => boolean} p.alanda  bolumAlanda
 * @param {Object<string,string>} [p.bagliBolumleri]  numara → ana bölüm
 * @returns {{izin:boolean, hata?:string}}
 */
function ogrenciKaydiKarari(p) {
  const { op, mevcut, yonetici, alanda } = p;
  const A = yonetici ? p.yazmaAlani : p.okumaAlani;
  const icinde = (b) => !!metin(b) && alanda(A, metin(b));
  const data = (op && op.data) || {};

  // Sade akademisyen (Erasmus/komisyon): yalnız öğrencinin düzenleme iznini
  // açıp kapatır, yalnız okuyabildiği bölümün öğrencisinde.
  if (!yonetici) {
    if (op.type === 'add' || op.type === 'delete' || !mevcut) {
      return { izin: false, hata: 'Öğrenci kaydını yalnız bölüm yetkilisi açıp silebilir.' };
    }
    const d = degisenAlanlar(data, mevcut);
    const fazla = d.filter((k) => !DUZENLEME_IZNI.includes(k));
    if (fazla.length) {
      return {
        izin: false,
        hata: 'Öğrenci kaydında bu alanları değiştirme yetkiniz yok: ' + fazla.join(', '),
      };
    }
    const bolumler = [anaBolum(mevcut)].concat(dizi(mevcut.additionalDepartments));
    if (d.length && !bolumler.some(icinde)) {
      return { izin: false, hata: 'Bu öğrenci sizin bölümünüzde değil.' };
    }
    return { izin: true };
  }

  if (op.type === 'add' || (!mevcut && op.type !== 'delete')) {
    if (!icinde(data.departmentId)) {
      return {
        izin: false,
        hata: 'Öğrenciyi yalnız yetki alanınızdaki bir bölüme kaydedebilirsiniz.',
      };
    }
    return { izin: true };
  }
  if (op.type === 'delete') {
    if (!mevcut || icinde(anaBolum(mevcut))) return { izin: true };
    return {
      izin: false,
      hata: 'Bu öğrencinin ana bölümü sizin yetki alanınızda değil; kaydı silemezsiniz.',
    };
  }

  const d = degisenAlanlar(data, mevcut);
  if (d.length === 0) return { izin: true };
  // Yalnız düzenleme izni: komisyon işidir, ek bölümde de yapılır (okuma alanı).
  if (d.every((k) => DUZENLEME_IZNI.includes(k))) {
    const bolumler = [anaBolum(mevcut)].concat(dizi(mevcut.additionalDepartments));
    if (bolumler.some((b) => alanda(p.okumaAlani, b))) return { izin: true };
  }
  const yeniAna = 'departmentId' in data ? metin(data.departmentId) : anaBolum(mevcut);
  if (d.includes('departmentId') && !icinde(yeniAna)) {
    return {
      izin: false,
      hata: 'Öğrenciyi yetki alanınız dışındaki bir bölüme taşıyamazsınız.',
    };
  }
  // Ana bölüm (değişiklikten sonra) alanda: kayıt bu yetkilinin.
  if (icinde(yeniAna)) return { izin: true };

  // ── ÇAP / BAĞLI NUMARA: ana bölüm başka ──
  if (op.type === 'set' && !op.merge) {
    return { izin: false, hata: 'Başka bölümün öğrenci kaydı bütünüyle değiştirilemez.' };
  }
  const fazla = d.filter((k) => !CAP_IZINLI.has(k));
  if (fazla.length) {
    return {
      izin: false,
      hata:
        'Bu öğrencinin ana bölümü başka; yalnız ÇAP/ek bölüm bağlantısını ve Erasmus ' +
        'bilgilerini değiştirebilirsiniz. Değiştirilemeyen: ' +
        fazla.join(', '),
    };
  }
  if (d.includes('additionalDepartments')) {
    const fark = listeFarki(mevcut.additionalDepartments, data.additionalDepartments);
    if (!fark.every(icinde)) {
      return {
        izin: false,
        hata: 'Öğrenciye yalnız kendi bölümünüzü ek bölüm olarak ekleyip çıkarabilirsiniz.',
      };
    }
  }
  let bagliIzinli = false;
  if (d.includes('bagliOgrenciNolar')) {
    const fark = listeFarki(mevcut.bagliOgrenciNolar, data.bagliOgrenciNolar);
    const harita = p.bagliBolumleri || {};
    if (!fark.every((no) => icinde(harita[no]))) {
      return {
        izin: false,
        hata: 'Yalnız kendi bölümünüzdeki öğrenci numarasını bu kayda bağlayabilirsiniz.',
      };
    }
    bagliIzinli = fark.length > 0;
  }
  const digerleri = d.filter((k) => k !== 'additionalDepartments' && k !== 'bagliOgrenciNolar');
  if (digerleri.length) {
    // Erasmus / düzenleme izni: öğrenci bu bölümün ÇAP öğrencisi olmalı.
    const ek = dizi(mevcut.additionalDepartments).concat(dizi(data.additionalDepartments));
    if (!ek.some(icinde)) {
      return { izin: false, hata: 'Bu öğrenci sizin bölümünüzde değil.' };
    }
  } else if (!d.includes('additionalDepartments') && !bagliIzinli) {
    return { izin: false, hata: 'Bu öğrenci sizin bölümünüzde değil.' };
  }
  return { izin: true };
}

// ══════════════════════════════════════════════════════════════
// ANKET YANITI (survey_responses)
//
// Yanıt YANITLAYANINDIR: personel yalnız kendi adına yanıt ekler. Var olan
// yanıtı değiştirmek/silmek yalnız üniversite düzeyindedir.
// ══════════════════════════════════════════════════════════════

/**
 * @param {object} p
 * @param {object} p.op
 * @param {object|null} p.mevcut
 * @param {string} p.ident  jeton kimliği (akademisyende ad)
 * @param {string[]} [p.kimlikler]  yazanın tanınan diğer kimlikleri (profil kaydı id'leri)
 * @param {boolean} p.ustYetki  sistem yöneticisi / üniversite yetkilisi
 */
function anketYanitiKarari(p) {
  const { op, mevcut, ustYetki } = p;
  const ident = metin(p.ident);
  if (op.type === 'add' || (!mevcut && op.type !== 'delete')) {
    if (!op.data || typeof op.data !== 'object') return { izin: true };
    const tanidik = new Set([ident].concat(dizi(p.kimlikler)));
    // Ekran akademisyende profil kaydı id'sini yazıyor; o da kabul. Tanınmayan
    // kimlik reddedilmez, yazanın kendi kimliğiyle değiştirilir.
    if (!tanidik.has(metin(op.data.userId))) op.data.userId = ident;
    delete op.data.studentNumber;
    if (['student', 'aday'].includes(metin(op.data.role))) op.data.role = 'professor';
    op.data.yanitlayanKimlik = ident;
    return { izin: true };
  }
  if (ustYetki) return { izin: true };
  return {
    izin: false,
    hata: 'Başkasının anket yanıtı değiştirilemez ya da silinemez.',
  };
}

module.exports = {
  ogrenciKaydiKarari,
  anketYanitiKarari,
  bagliNoFarki,
  degisenAlanlar,
  CAP_IZINLI,
  DUZENLEME_IZNI,
};
