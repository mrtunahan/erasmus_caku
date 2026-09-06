// ══════════════════════════════════════════════════════════════
// ÇAP — İKİ ÖĞRENCİ NUMARASINI BAĞLAMA
//
// ÇAKÜ'de çift ana dal iki biçimde yürüyor ve ikisi de aynı anda kayıtlarda
// duruyor:
//   • AYNI NUMARA — öğrencinin tek kaydı vardır, ikinci program
//     `additionalDepartments` dizisindedir (bkz. lib/cap-ogrenci.js).
//   • ÇİFT NUMARA — öğrencinin İKİ ayrı `students` kaydı vardır, her
//     programın kendi numarası, kendi transkripti, kendi muafiyet kaydı olur.
//
// İkinci durumda sistem bu iki kaydı iki AYRI KİŞİ sayıyordu: öğrenci iki kez
// giriş yapmak zorundaydı ve bir numarayla girince öbür programını hiç
// göremiyordu. Dahası, iki kayıttan birine ayrıca `additionalDepartments`
// yazıldığında aynı kişi ikinci bölümün listesinde İKİ KEZ görünüyordu —
// biri kendi kaydı, biri ÇAP satırı, farklı numaralarla.
//
// Çözüm bağdır, birleştirme DEĞİL: kayıtlar ayrı kalır (transkript ve krediler
// programa özeldir), aralarına karşılıklı bir `bagliOgrenciNolar` alanı konur.
// Öğrenci tek girişle iki programa da ulaşır; hangi programdaysa o programın
// numarası geçerlidir.
//
// ⚠ BAĞ KARŞILIKLIDIR. Tek yönlü yazılırsa öğrenci bir yönden öbürünü görür,
// ters yönden göremez — ve sunucudaki okuma kapsamı hangi numarayla giriş
// yapıldığına göre değişir. Yamalar bu yüzden hep ÇİFT üretilir.
// ══════════════════════════════════════════════════════════════

const metin = (v) => String(v == null ? '' : v).trim();

/** Kaydın öğrenci numarası. */
export function kayitNumarasi(kayit) {
  return metin(kayit && (kayit.studentNumber || kayit.ogrenciNo));
}

/** Kayda bağlı DİĞER numaralar — tekilleştirilmiş, kendisi hariç. */
export function bagliNolar(kayit) {
  const ham = kayit && Array.isArray(kayit.bagliOgrenciNolar) ? kayit.bagliOgrenciNolar : [];
  const kendi = kayitNumarasi(kayit);
  const out = [];
  ham.forEach((n) => {
    const k = metin(n);
    if (k && k !== kendi && !out.includes(k)) out.push(k);
  });
  return out;
}

/** Bu kayıt şu numaraya bağlı mı? */
export function baglantiliMi(kayit, no) {
  return bagliNolar(kayit).includes(metin(no));
}

/**
 * İki kayıt bağlanabilir mi?
 *
 * Aynı bölümde iki numara ÇAP değildir (mükerrer kayıttır) — bağlamak hatayı
 * kalıcılaştırır, o yüzden reddedilir.
 */
export function baglamaGecerliMi(a, b) {
  const na = kayitNumarasi(a);
  const nb = kayitNumarasi(b);
  if (!na || !nb) return { olur: false, sebep: 'Her iki kaydın da öğrenci numarası olmalı.' };
  if (na === nb) return { olur: false, sebep: 'Aynı numara kendine bağlanamaz.' };
  if (baglantiliMi(a, nb)) return { olur: false, sebep: 'Bu iki numara zaten bağlı.' };
  const ba = metin(a.departmentId);
  const bb = metin(b.departmentId);
  if (ba && bb && ba === bb) {
    return {
      olur: false,
      sebep: 'İki kayıt da aynı bölümde. Bu ÇAP değil, mükerrer kayıttır; önce birini silin.',
    };
  }
  return { olur: true, sebep: '' };
}

/** Bağı kuran KARŞILIKLI yamalar. Çağıran ikisini de yazmalıdır. */
export function baglamaYamalari(a, b) {
  const na = kayitNumarasi(a);
  const nb = kayitNumarasi(b);
  return [
    { no: na, bagliOgrenciNolar: bagliNolar(a).concat(nb) },
    { no: nb, bagliOgrenciNolar: bagliNolar(b).concat(na) },
  ];
}

/** Bağı koparan karşılıklı yamalar. */
export function koparmaYamalari(a, b) {
  const na = kayitNumarasi(a);
  const nb = kayitNumarasi(b);
  return [
    { no: na, bagliOgrenciNolar: bagliNolar(a).filter((n) => n !== nb) },
    { no: nb, bagliOgrenciNolar: bagliNolar(b).filter((n) => n !== na) },
  ];
}

/**
 * Bir numaradan başlayarak AYNI KİŞİYE ait bütün kayıtlar.
 *
 * Geçişli izlenir: A–B ve B–C bağlıysa A'dan C'ye de ulaşılır. Bağ tek yönlü
 * kalmış olsa bile (eski veri) her iki yön de taranır — yoksa öğrenci bir
 * numarayla girince programını görüp öbürüyle göremezdi.
 */
export function kisininKayitlari(kayitlar, no) {
  const baslangic = metin(no);
  if (!baslangic) return [];
  const liste = Array.isArray(kayitlar) ? kayitlar : [];
  const bulunan = [];
  const gorulen = new Set();
  const kuyruk = [baslangic];
  while (kuyruk.length) {
    const sira = kuyruk.shift();
    if (gorulen.has(sira)) continue;
    gorulen.add(sira);
    liste.forEach((k) => {
      const kn = kayitNumarasi(k);
      // Ya numarası sıradaki numaradır, ya da sıradakine bağ vermiştir.
      if (kn !== sira && !baglantiliMi(k, sira)) return;
      if (!bulunan.includes(k)) bulunan.push(k);
      if (kn && !gorulen.has(kn)) kuyruk.push(kn);
      bagliNolar(k).forEach((b) => {
        if (!gorulen.has(b)) kuyruk.push(b);
      });
    });
  }
  return bulunan;
}

/** Okuma kapsamı: kendi numarası + bağlı bütün numaralar. */
export function kapsamNumaralari(kayitlar, no) {
  const baslangic = metin(no);
  if (!baslangic) return [];
  const out = [baslangic];
  kisininKayitlari(kayitlar, baslangic).forEach((k) => {
    const kn = kayitNumarasi(k);
    if (kn && !out.includes(kn)) out.push(kn);
    bagliNolar(k).forEach((b) => {
      if (!out.includes(b)) out.push(b);
    });
  });
  return out;
}

/**
 * Kişinin programları — bölüm şeridi ve etkin numara buradan çözülür.
 *
 * Giriş yapılan numaranın programı BAŞTA durur (varsayılan aktif bölüm odur).
 * Aynı-numara ÇAP'ı da kapsanır: o kaydın `additionalDepartments` bölümleri
 * kendi numarasıyla listelenir.
 */
export function kisininProgramlari(kayitlar, no, ekBolumler) {
  const giris = metin(no);
  const kayitlarListesi = kisininKayitlari(kayitlar, giris);
  const out = [];
  const ekle = (bolum, numara, ana) => {
    const b = metin(bolum);
    if (!b || out.some((p) => p.departmentId === b)) return;
    out.push({ departmentId: b, no: metin(numara), ana: !!ana });
  };
  // Önce giriş yapılan kaydın kendi bölümü.
  const girisKaydi = kayitlarListesi.find((k) => kayitNumarasi(k) === giris);
  if (girisKaydi) ekle(girisKaydi.departmentId, giris, true);
  // Sonra aynı kaydın ek bölümleri (aynı numara ÇAP'ı).
  (typeof ekBolumler === 'function' ? ekBolumler(girisKaydi) || [] : []).forEach((b) =>
    ekle(b, giris, false)
  );
  // Sonra bağlı diğer kayıtlar, kendi numaralarıyla.
  kayitlarListesi.forEach((k) => {
    const kn = kayitNumarasi(k);
    if (!kn || kn === giris) return;
    ekle(k.departmentId, kn, false);
    (typeof ekBolumler === 'function' ? ekBolumler(k) || [] : []).forEach((b) =>
      ekle(b, kn, false)
    );
  });
  return out;
}

/** Aktif bölümde geçerli olan öğrenci numarası. Bulunamazsa giriş numarası. */
export function etkinNumara(programlar, aktifBolum, girisNo) {
  const aktif = metin(aktifBolum);
  const p = (programlar || []).find((x) => x && metin(x.departmentId) === aktif);
  return (p && metin(p.no)) || metin(girisNo);
}

/**
 * ÇAP eklenmek istenen bölümde bu kişinin ZATEN bir kaydı var mı?
 *
 * Varsa `additionalDepartments` yazmak yanlış: aynı kişi o bölümün listesinde
 * iki kez görünür (biri kendi kaydı, biri ÇAP satırı). Doğrusu iki numarayı
 * bağlamaktır.
 */
export function cakisanKayit(kayitlar, kayit, bolum) {
  const b = metin(bolum);
  if (!b) return null;
  const kendi = kayitNumarasi(kayit);
  const kapsam = kapsamNumaralari(kayitlar, kendi);
  return (
    (Array.isArray(kayitlar) ? kayitlar : []).find((k) => {
      const kn = kayitNumarasi(k);
      if (!kn || kn === kendi) return false;
      if (metin(k.departmentId) !== b) return false;
      return kapsam.includes(kn) || ayniKisi(k, kayit);
    }) || null
  );
}

/** Ad-soyad eşleşmesi — bağ kurulmamış mükerrer kaydı yakalamak için. */
function ayniKisi(a, b) {
  const ad = (k) =>
    [k && k.firstName, k && k.lastName]
      .map((x) => metin(x).toLocaleUpperCase('tr'))
      .filter(Boolean)
      .join(' ');
  const x = ad(a);
  return !!x && x === ad(b);
}
