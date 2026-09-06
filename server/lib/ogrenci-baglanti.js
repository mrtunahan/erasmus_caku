// ══════════════════════════════════════════════════════════════
// BAĞLI ÖĞRENCİ NUMARALARI — SUNUCU TARAFI OKUMA KAPSAMI
//
// Çift numaralı ÇAP öğrencisinin iki `students` kaydı vardır ve bağ,
// karşılıklı `bagliOgrenciNolar` alanıyla kurulur (bkz.
// lib/cap-numara-baglama.js).
//
// Sunucu öğrenci okumalarını jetondaki numaraya daraltıyor
// (STUDENT_READ_SCOPED): muafiyet kaydı, staj başvurusu, akademik kayıt hep
// `identifier` ile eşleşir. Bağ yalnız istemcide kurulsaydı, öğrenci ikinci
// programına geçtiğinde sunucu yine GİRİŞ YAPTIĞI numaranın kayıtlarını
// döndürürdü — yani ekran ikinci programı gösterir, veri birinci programdan
// gelirdi. Kapsam bu yüzden burada da genişletilir.
//
// ⚠ Bağı yalnız personel yazabilir. `bagliOgrenciNolar` öğrencinin kendi
// kaydında yazamayacağı alanlar arasındadır (routes/db.js →
// STUDENT_SELF_PROTECTED); aksi halde öğrenci kendini bir başkasına bağlayıp
// onun kayıtlarını okuyabilirdi.
// ══════════════════════════════════════════════════════════════

const metin = (v) => String(v == null ? '' : v).trim();

function numara(kayit) {
  return metin(kayit && (kayit.studentNumber || kayit.ogrenciNo));
}

function bagliNolar(kayit) {
  const ham = kayit && Array.isArray(kayit.bagliOgrenciNolar) ? kayit.bagliOgrenciNolar : [];
  const kendi = numara(kayit);
  const out = [];
  ham.forEach((n) => {
    const k = metin(n);
    if (k && k !== kendi && !out.includes(k)) out.push(k);
  });
  return out;
}

/**
 * Bir numaranın okuma kapsamı: kendisi + bağlı bütün numaralar.
 *
 * Bağ tek yönlü kalmış olsa bile (eski veri) iki yön de taranır; geçişli
 * bağlar da izlenir. Kayıt bulunamazsa kapsam yalnız numaranın kendisidir —
 * boş dönerse öğrenci kendi verisini bile göremezdi.
 */
function kapsamNumaralari(kayitlar, no) {
  const baslangic = metin(no);
  if (!baslangic) return [];
  const liste = Array.isArray(kayitlar) ? kayitlar : [];
  const kapsam = [baslangic];
  const gorulen = new Set();
  const kuyruk = [baslangic];
  while (kuyruk.length) {
    const sira = kuyruk.shift();
    if (gorulen.has(sira)) continue;
    gorulen.add(sira);
    liste.forEach((k) => {
      const kn = numara(k);
      const bagli = bagliNolar(k);
      if (kn !== sira && !bagli.includes(sira)) return;
      [kn].concat(bagli).forEach((n) => {
        if (!n) return;
        if (!kapsam.includes(n)) kapsam.push(n);
        if (!gorulen.has(n)) kuyruk.push(n);
      });
    });
  }
  return kapsam;
}

module.exports = { numara, bagliNolar, kapsamNumaralari };
