// ══════════════════════════════════════════════════════════════
// ÇAP ADAY ÇİFTLERİ — MEVCUT KAYITLARDAN
//
// Çift numaralı ÇAP öğrencisinin iki `students` kaydı vardır ve bağ
// `bagliOgrenciNolar` alanıyla kurulur (bkz. lib/cap-numara-baglama.js).
// Bu alan yeni; eski kayıtlarda boştur. Yüzlerce kaydı elle bağlamak yerine
// aday çiftler burada çıkarılır.
//
// ⚠ ELDEKİ TEK İŞARET AD-SOYADDIR. `students` kaydında TC, doğum tarihi ya da
// e-posta yok. Ad benzerliği kimlik DEĞİLDİR: farklı bölümlerde aynı adlı iki
// AYRI kişi olabilir ve onları bağlamak, birinin muafiyet/staj kayıtlarını
// ötekine açar. Bu yüzden kural ikiye ayrılır:
//
//   • KESİN   — o adla sistemde tam İKİ kayıt var, farklı bölümlerde,
//               ikisinin de numarası var ve aralarında bağ yok.
//   • ŞÜPHELİ — adı ikiden çok kayıtta geçiyor (hangi çift?), ya da iki kayıt
//               AYNI bölümde (bu ÇAP değil, mükerrer kayıttır).
//
// Şüpheli olanlar asla kendiliğinden bağlanmaz; listelenir, insan karar verir.
// ══════════════════════════════════════════════════════════════

const metin = (v) => String(v == null ? '' : v).trim();

/** Türkçe-duyarlı ad anahtarı: "AYŞE DEMİR". Boşsa eşleştirmeye girmez. */
function adAnahtari(kayit) {
  const k = kayit || {};
  const parca = [k.firstName, k.lastName].map((x) => metin(x)).filter(Boolean);
  if (parca.length === 0) return '';
  return parca.join(' ').replace(/\s+/g, ' ').toLocaleUpperCase('tr');
}

function numara(kayit) {
  return metin(kayit && (kayit.studentNumber || kayit.ogrenciNo));
}

function bagliMi(a, b) {
  const na = numara(a);
  const nb = numara(b);
  const liste = (k) =>
    Array.isArray(k && k.bagliOgrenciNolar) ? k.bagliOgrenciNolar.map(metin) : [];
  return liste(a).includes(nb) || liste(b).includes(na);
}

/**
 * Aday çiftleri çıkarır.
 *
 * @returns {{kesin: Array, supheli: Array, zatenBagli: Array}}
 *   kesin      → [{ad, a, b}] bağlanmaya hazır
 *   supheli    → [{ad, sebep, kayitlar}] insan bakmalı
 *   zatenBagli → [{ad, a, b}] işlem yok, sayım için
 */
function adaylariBul(kayitlar) {
  const gruplar = new Map();
  (Array.isArray(kayitlar) ? kayitlar : []).forEach((k) => {
    const ad = adAnahtari(k);
    if (!ad || !numara(k)) return;
    if (!gruplar.has(ad)) gruplar.set(ad, []);
    gruplar.get(ad).push(k);
  });

  const kesin = [];
  const supheli = [];
  const zatenBagli = [];

  gruplar.forEach((liste, ad) => {
    if (liste.length < 2) return;
    if (liste.length > 2) {
      supheli.push({
        ad,
        sebep: 'Bu adla ' + liste.length + ' kayıt var; hangi ikisinin aynı kişi olduğu belirsiz.',
        kayitlar: liste,
      });
      return;
    }
    const [a, b] = liste;
    if (bagliMi(a, b)) {
      zatenBagli.push({ ad, a, b });
      return;
    }
    if (numara(a) === numara(b)) {
      supheli.push({
        ad,
        sebep: 'İki kaydın numarası aynı; bu mükerrer kayıttır.',
        kayitlar: liste,
      });
      return;
    }
    const ba = metin(a.departmentId);
    const bb = metin(b.departmentId);
    if (!ba || !bb) {
      supheli.push({ ad, sebep: 'Kayıtlardan birinin bölümü boş.', kayitlar: liste });
      return;
    }
    if (ba === bb) {
      supheli.push({
        ad,
        sebep: 'İki kayıt da aynı bölümde. Bu ÇAP değil, mükerrer kayıttır.',
        kayitlar: liste,
      });
      return;
    }
    kesin.push({ ad, a, b });
  });

  const sirala = (x, y) => String(x.ad).localeCompare(String(y.ad), 'tr');
  return {
    kesin: kesin.sort(sirala),
    supheli: supheli.sort(sirala),
    zatenBagli: zatenBagli.sort(sirala),
  };
}

module.exports = { adAnahtari, adaylariBul };
