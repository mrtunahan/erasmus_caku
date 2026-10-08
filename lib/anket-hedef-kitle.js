// ══════════════════════════════════════════════════════════════
// ANKET KİMLERE GİDİYOR?
//
// ⚠ ATAMA EKRANI KARANLIKTA ÇALIŞIYORDU. Yetkili anketi seçiyor, rolü ve
// hedef grubu işaretliyor, "Anketi ata" diyordu — ve kaç kişiye gittiğini
// HİÇBİR YERDE görmüyordu. Yanlış bölüm, yanlış sınıf ya da hiç kimseye
// ulaşmayan bir seçim, ancak günler sonra "anket gelmedi" diye geri
// dönüyordu. Zorunlu ankette bedeli daha ağır: yanlış kitleye açılan tam
// ekran kapı, ilgisiz insanları uygulamanın dışında bırakıyor.
//
// Bu dosya, atama YAPILMADAN ÖNCE kitleyi sayar. Sayım, anketin karşı
// tarafta gösterilme kuralının AYNISINI kullanır (lib/ogrenci-sinif.js);
// yoksa önizleme bir şey, gerçek başka şey söylerdi.
//
// ── SAYI BİR TAHMİNDİR, GARANTİ DEĞİL ──
// Kayıtlardaki bölüm/numara eksikse kitle olduğundan küçük ya da büyük
// görünür. Bu yüzden `cozulemeyen` ayrı raporlanır: "84 kişiye gidecek,
// 12 kişinin sınıfı çözülemediği için onlara GİTMEYECEK" cümlesi
// kurulabilsin.
// ══════════════════════════════════════════════════════════════

import { ogrenciSinifi, grupSinifi } from './ogrenci-sinif.js';
import { unvaniAyir } from './akademik-unvan.js';

const metin = (v) => String(v == null ? '' : v).trim();

/** Öğrencinin bütün bölümleri: ana bölüm + ÇAP/yandal ikinci bölümleri. */
export function ogrenciBolumleri(ogrenci) {
  const o = ogrenci || {};
  const liste = [metin(o.departmentId)];
  if (Array.isArray(o.additionalDepartments)) {
    o.additionalDepartments.forEach((d) => liste.push(metin(d)));
  }
  return liste.filter(Boolean);
}

/**
 * Öğrenci bu kapsamda mı?
 * @param {string[]|null} bolumler  null/boş = kapsam sınırsız (hepsi)
 */
export function ogrenciKapsamda(ogrenci, bolumler) {
  if (!Array.isArray(bolumler) || bolumler.length === 0) return true;
  const kume = new Set(bolumler.map(metin).filter(Boolean));
  if (kume.size === 0) return true;
  return ogrenciBolumleri(ogrenci).some((b) => kume.has(b));
}

/** Kayıt mezun mu? (anket hedef grubu 'Mezun' için) */
export function mezunMu(ogrenci) {
  const o = ogrenci || {};
  return !!(o.isAlumni || o.mezun || metin(o.status) === 'mezun');
}

/** Kişiyi tekilleştiren anahtar — aynı öğrenci iki grupta iki kez sayılmasın. */
function kisiAnahtari(o, i) {
  const k = o || {};
  return (
    metin(k.studentNumber) || metin(k.studentNo) || metin(k._docId) || metin(k.id) || 'satir-' + i
  );
}

/**
 * Bir öğrenci bu hedef gruba giriyor mu?
 * @returns {{uyar:boolean, sebep:string}}
 *   sebep: 'hepsi' | 'mezun' | 'sinif' | 'baska-sinif' | 'mezun-degil'
 *        | 'mezun-sinif-gormez' | 'sinif-bilinmiyor'
 */
export function ogrenciGrubaUyarMi(ogrenci, grup, secenekler) {
  const g = metin(grup);
  if (!g || g === 'Tüm öğrenciler') return { uyar: true, sebep: 'hepsi' };
  if (g === 'Mezun') {
    return mezunMu(ogrenci)
      ? { uyar: true, sebep: 'mezun' }
      : { uyar: false, sebep: 'mezun-degil' };
  }
  const hedef = grupSinifi(g);
  if (hedef == null) return { uyar: true, sebep: 'hepsi' };
  // Mezun, sınıf gruplarına girmez — ekrandaki kuralla aynı.
  if (mezunMu(ogrenci)) return { uyar: false, sebep: 'mezun-sinif-gormez' };
  const c = ogrenciSinifi(ogrenci, secenekler);
  if (c.sinif == null) return { uyar: false, sebep: 'sinif-bilinmiyor' };
  return c.sinif === hedef ? { uyar: true, sebep: 'sinif' } : { uyar: false, sebep: 'baska-sinif' };
}

/**
 * Seçilen kapsam + gruplar kaç öğrenciye ulaşır?
 *
 * @param {object[]} ogrenciler
 * @param {object} o  { bolumler, gruplar, secenekler }
 * @returns {{
 *   kapsamdaki: number,        // kapsamdaki toplam öğrenci
 *   ulasilan: number,          // en az bir gruba giren (tekil kişi)
 *   gruplar: {grup, sayi}[],   // grup başına (kişi birden çok grupta olabilir)
 *   sinifiBilinmeyen: number,  // sınıf hedefli grup var ve sınıfı çözülemiyor
 *   sinifiNumaradan: number    // sınıfı numaradan türetilmiş (tahmin)
 * }}
 */
export function ogrenciKitlesi(ogrenciler, o) {
  const ayar = o || {};
  const gruplar = Array.isArray(ayar.gruplar) ? ayar.gruplar.filter(Boolean) : [];
  const kapsamdakiler = (ogrenciler || []).filter((x) => ogrenciKapsamda(x, ayar.bolumler));
  const sinifHedefiVar = gruplar.some((g) => grupSinifi(g) != null);

  const ulasan = new Set();
  const grupSayilari = gruplar.map((g) => ({ grup: g, sayi: 0 }));
  let sinifiBilinmeyen = 0;
  let sinifiNumaradan = 0;

  kapsamdakiler.forEach((x, i) => {
    if (sinifHedefiVar && !mezunMu(x)) {
      const c = ogrenciSinifi(x, ayar.secenekler);
      if (c.sinif == null) sinifiBilinmeyen++;
      else if (c.kaynak === 'numara') sinifiNumaradan++;
    }
    grupSayilari.forEach((satir) => {
      if (!ogrenciGrubaUyarMi(x, satir.grup, ayar.secenekler).uyar) return;
      satir.sayi++;
      ulasan.add(kisiAnahtari(x, i));
    });
  });

  return {
    kapsamdaki: kapsamdakiler.length,
    ulasilan: ulasan.size,
    gruplar: grupSayilari,
    sinifiBilinmeyen,
    sinifiNumaradan,
  };
}

// ── AKADEMİSYEN GRUPLARI UNVANDAN ──
// Eskiden akademisyen grupları süzmüyordu ("unvan verisi yok"). Unvan
// kayıttaki `title`/`unvan` alanında ya da ADIN BAŞINDA durur ("Arş. Gör.
// Ali Veli"); lib/akademik-unvan.js onu ayırır. Grup:
//   Öğretim üyeleri       → Prof., Doç., Dr. Öğr. Üyesi
//   Araştırma görevlileri → Arş. Gör. (Dr. dahil)
//   Öğretim görevlileri   → Öğr. Gör. (Dr. dahil), Okutman, Uzman
// Unvanı çözülemeyen (ör. yalnız "Dr.") kişi DIŞARIDA BIRAKILMAZ: her
// gruba girer ve önizlemede ayrıca sayılır — anketin ulaşmaması, fazladan
// birine ulaşmasından daha zor fark edilir.
const AKADEMISYEN_GRUPLARI = {
  'Öğretim üyeleri': 'ogretim-uyesi',
  'Araştırma görevlileri': 'arastirma-gorevlisi',
  'Öğretim görevlileri': 'ogretim-gorevlisi',
};

/** Kişinin unvan sınıfı: 'ogretim-uyesi' | 'arastirma-gorevlisi' | 'ogretim-gorevlisi' | '' */
export function akademisyenUnvanSinifi(kisi) {
  const k = kisi || {};
  const ham = metin(k.title) || metin(k.unvan) || unvaniAyir(metin(k.name || k.adSoyad)).unvan;
  const u = ham.toLocaleLowerCase('tr-TR').replace(/\./g, ' ').replace(/\s+/g, ' ');
  if (!u) return '';
  if (/(^| )arş( |$)|araştırma/.test(u)) return 'arastirma-gorevlisi';
  if (/(öğr|öğrt) gör|öğretim görevlisi|okutman|uzm/.test(u)) return 'ogretim-gorevlisi';
  if (/prof|doç|(öğr|öğrt) üyesi|öğretim üyesi/.test(u)) return 'ogretim-uyesi';
  return '';
}

/**
 * Akademisyen bu hedef gruba giriyor mu?
 * @returns {{uyar:boolean, sebep:'hepsi'|'unvan'|'baska-unvan'|'unvan-bilinmiyor'}}
 */
export function akademisyenGrubaUyarMi(kisi, grup) {
  const g = metin(grup);
  const hedef = AKADEMISYEN_GRUPLARI[g];
  if (!hedef) return { uyar: true, sebep: 'hepsi' };
  const sinif = akademisyenUnvanSinifi(kisi);
  if (!sinif) return { uyar: true, sebep: 'unvan-bilinmiyor' };
  return sinif === hedef ? { uyar: true, sebep: 'unvan' } : { uyar: false, sebep: 'baska-unvan' };
}

/**
 * Akademisyen kitlesi: kapsam + unvan grupları.
 * @param {object[]} akademisyenler
 * @param {object} o { bolumler, gruplar }
 */
export function akademisyenKitlesi(akademisyenler, o) {
  const ayar = o || {};
  const gruplar = Array.isArray(ayar.gruplar) ? ayar.gruplar.filter(Boolean) : [];
  const kapsamdakiler = (akademisyenler || []).filter((p) => {
    if (!p) return false;
    if (p.isMemur === true) return false; // memur akademisyen değildir
    if (!Array.isArray(ayar.bolumler) || ayar.bolumler.length === 0) return true;
    const kume = new Set(ayar.bolumler.map(metin).filter(Boolean));
    const kendi = [metin(p.departmentId)];
    if (Array.isArray(p.departmentIds)) p.departmentIds.forEach((d) => kendi.push(metin(d)));
    return kendi.filter(Boolean).some((b) => kume.has(b));
  });
  const grupHedefli = gruplar.some((g) => AKADEMISYEN_GRUPLARI[metin(g)]);
  let unvaniBilinmeyen = 0;
  const ulasan = kapsamdakiler.filter((p) => {
    if (gruplar.length === 0) return true;
    if (grupHedefli && !akademisyenUnvanSinifi(p)) unvaniBilinmeyen++;
    return gruplar.some((g) => akademisyenGrubaUyarMi(p, g).uyar);
  });
  return {
    kapsamdaki: kapsamdakiler.length,
    ulasilan: ulasan.length,
    unvaniBilinmeyen,
  };
}

/**
 * Önizleme cümlesi — ekranda tek satır olarak yazılır.
 * Sayı belirsizse ("hesaplanmadı") boş döner.
 */
export function kitleOzetMetni(ozet, rol) {
  if (!ozet) return '';
  if (rol === 'professor') {
    return ozet.ulasilan + ' akademisyene gidecek';
  }
  const parcalar = [ozet.ulasilan + ' öğrenciye gidecek'];
  if (ozet.sinifiBilinmeyen > 0) {
    parcalar.push(ozet.sinifiBilinmeyen + ' kişinin sınıfı çözülemedi, onlara gitmeyecek');
  }
  return parcalar.join(' · ');
}
