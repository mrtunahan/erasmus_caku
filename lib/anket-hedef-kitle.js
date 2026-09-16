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

/**
 * Akademisyen kitlesi.
 *
 * ⚠ AKADEMİSYEN GRUPLARI BUGÜN SÜZMÜYOR. "Öğretim üyeleri" / "Araştırma
 * görevlileri" ayrımını yapacak UNVAN verisi kayıtlarda yok; anket eşleşmesi
 * de akademisyende grubu hiç bakmadan geçiyor (`if (role !== 'student')
 * return true`). Yani hangi grup seçilirse seçilsin anket kapsamdaki TÜM
 * akademisyenlere gider. Sayım bunu gizlemez, `grupSuzulmuyor: true` ile
 * söyler — ekran da kullanıcıya söyler.
 */
export function akademisyenKitlesi(akademisyenler, o) {
  const ayar = o || {};
  const kapsamdakiler = (akademisyenler || []).filter((p) => {
    if (!p) return false;
    if (p.isMemur === true) return false; // memur akademisyen değildir
    if (!Array.isArray(ayar.bolumler) || ayar.bolumler.length === 0) return true;
    const kume = new Set(ayar.bolumler.map(metin).filter(Boolean));
    const kendi = [metin(p.departmentId)];
    if (Array.isArray(p.departmentIds)) p.departmentIds.forEach((d) => kendi.push(metin(d)));
    return kendi.filter(Boolean).some((b) => kume.has(b));
  });
  return {
    kapsamdaki: kapsamdakiler.length,
    ulasilan: kapsamdakiler.length,
    grupSuzulmuyor: true,
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
