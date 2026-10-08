// ══════════════════════════════════════════════════════════════
// ANKETİN SAHİBİ KİM — kim görür, kim düzenler, kim siler
//
// ⚠ ANKET KAYDININ KAPSAMI HİÇ YOKTU. `survey_assignments` (atama) kaydı
// kapsam taşıyordu, ANKETİN KENDİSİ taşımıyordu: "Anketler" sekmesi
// koleksiyonun tamamını listeliyor, her yetkili her anketi görüyor,
// düzenleyebiliyor ve SİLEBİLİYORDU. Bir fakültenin yetkilisi başka
// fakültenin anketini — hatta üniversite genelini — kaldırabiliyordu.
//
// Kural artık kaydın üzerinde durur (kapsamTuru + kapsamDepartmentIds,
// lib/yayin-kapsami.js ile aynı alanlar) ve iki soruya AYRI AYRI cevap
// verilir:
//
//   GÖRÜNÜRLÜK            DÜZENLEME / SİLME
//   ──────────            ─────────────────
//   Üniversite yetkilisi: her anket          Üniversite yetkilisi: hepsi
//   Fakülte yetkilisi: kendi fakültesindeki  Fakülte yetkilisi: YALNIZ KENDİ
//     bölümlerin anketleri + kendi fakülte      AÇTIĞI fakülte geneli anketler
//     geneli anketleri + üniversite geneli    Bölüm yetkilisi: yalnız kendi
//   Bölüm yetkilisi: kendi bölümünün +          bölümünün anketleri
//     üst kapsamdan gelenler
//
// ── NEDEN GÖRMEK VE DÜZENLEMEK AYRI ──
// Fakülte yetkilisi bölümlerin anketlerini GÖRMELİ (fakültesinde ne dönüyor
// bilmeli) ama DEĞİŞTİRMEMELİ: o anketi bölüm kurdu, yanıtları bölümün.
// Aynı mantık üst kapsam için de geçerli — üniversite geneli anket fakülte
// yetkilisine görünür, eseri değildir.
//
// ── ESKİ KAYITLAR ──
// Kapsam alanı eklenmeden önceki anketlerde bilgi yok. Bunları "üniversite
// geneli" saymak kapatmaya çalıştığımız açığın ta kendisi olurdu; hiç
// göstermemek ise bugünkü işi durdururdu. Orta yol: GÖRÜNÜRLER (liste
// çalışsın), ama yalnız üniversite yetkilisi ya da anketi AÇAN kişi
// düzenleyebilir. Kayıt bir kez kaydedildiğinde kapsam damgalanır.
// ══════════════════════════════════════════════════════════════

import { dersEgitmeniMi } from './ders-egitmenleri.js';

const metin = (v) => String(v == null ? '' : v).trim();
const dizi = (v) => (Array.isArray(v) ? v.filter(Boolean).map(String) : []);

// ══════════════════════════════════════════════════════════════
// GÖRÜNÜRLÜK — ANKETİN KİME PAYLAŞILDIĞINA BAĞLIDIR
//
// ⚠ "YALNIZ BİLGİSAYAR ÖĞRENCİLERİNE PAYLAŞILAN ANKET KİMYA BÖLÜM
// YETKİLİSİNE GÖRÜNÜYOR". Görünürlük anket kaydının KENDİ kapsamına
// bakıyordu; o kapsam ise anketi AÇANIN yetki alanıdır, paylaşıldığı kitle
// değil. Üniversite yetkilisinin açtığı anket "üniversite geneli",
// fakülte yetkilisininki "fakülte geneli" damgası taşıdığı için —yalnız
// Bilgisayar'a atanmış olsa bile— fakültedeki/üniversitedeki her bölüm
// yetkilisinin listesine (ve Sonuçlar sekmesine) düşüyordu. Kapsamsız eski
// kayıtlar da herkese açıktı.
//
// Kural artık:
//   Üniversite yetkilisi  → her anket.
//   Fakülte / bölüm yetkilisi → şunlardan biri doğruysa:
//     • anket KENDİ SEVİYESİNDE ya da altında açılmış ve kapsamı kendi
//       alanıyla kesişiyor (fakülte yetkilisi: fakültesinin fakülte ve bölüm
//       anketleri; bölüm yetkilisi: kendi bölümünün anketleri);
//     • anketin bir ATAMASI kendi alanına ulaşıyor (ör. üniversite
//       anketinin Kimya'ya yapılmış ataması Kimya'ya görünür, Bilgisayar'a
//       yapılmışı görünmez);
//     • anketi kendisi açmış.
//   Akademisyen (yönetici bayrağı yok) → yalnız kendi açtığı ve kendi
//     verdiği bir derse bağlı anketler.
// Üst seviyenin (fakülte/üniversite) anketi alt yetkiliye ancak onun
// alanına atandığında görünür.
// ══════════════════════════════════════════════════════════════

/** Kapsam türleri — kayıtta bu üç değerden biri durur. */
export const ANKET_KAPSAMLARI = ['universite', 'fakulte', 'bolum'];

/**
 * Yeni (ya da çoğaltılan) ankete yazılacak kapsam alanları.
 *
 * Kapsam yayımcının KENDİ yetki alanıdır; seçimle genişletilemez. Fakülte
 * yetkilisinin açtığı anket "fakülte geneli", bölüm yetkilisininki kendi
 * bölümü, üniversite yetkilisininki üniversite geneli olur.
 *
 * @param {{kapsamTuru:string, facultyId:string, departmentIds:string[]}} kapsam
 *        lib/yayin-kapsami.js → yayinKapsamCoz çıktısı
 * @param {object} [user] sahiplik damgası için (ad)
 */
export function anketKapsamYamasi(kapsam, user) {
  const k = kapsam || { kapsamTuru: 'bolum', facultyId: '', departmentIds: [] };
  // Akademisyenin anketi kendi bölümüne damgalanır (sahibi o olur).
  const tur = ANKET_KAPSAMLARI.includes(String(k.kapsamTuru)) ? String(k.kapsamTuru) : 'bolum';
  return {
    kapsamTuru: tur,
    kapsamFacultyId: metin(k.facultyId),
    // Üniversite kapsamında liste tutulmaz: sonradan açılan bölüm de kapsama
    // girmeli (aynı karar lib/yayin-kapsami.js'te).
    kapsamDepartmentIds: tur === 'universite' ? [] : dizi(k.departmentIds),
    sahipAd: metin(user && (user.name || user.identifier)),
  };
}

/**
 * Anketi bu kişi mi açtı?
 *
 * Ad karşılaştırması Türkçe duyarlıdır (İ/I) ve boşluklar kırpılır; kayıtta
 * `createdBy` (anketi ekleyen) ya da `sahipAd` (kapsam damgasıyla yazılan)
 * durur. Kimlik yoksa sahiplik İDDİA EDİLEMEZ.
 */
export function sahibiMi(anket, user) {
  const a = anket || {};
  const adlar = [metin(user && user.name), metin(user && user.identifier)].filter(Boolean);
  if (adlar.length === 0) return false;
  const anahtar = (v) => metin(v).toLocaleLowerCase('tr').replace(/\s+/g, ' ');
  const sahipler = [anahtar(a.createdBy), anahtar(a.sahipAd)].filter(Boolean);
  return adlar.some((ad) => sahipler.includes(anahtar(ad)));
}

/** Kayıt kapsam taşıyor mu? (eski kayıtlar taşımaz) */
export function kapsamliMi(anket) {
  return ANKET_KAPSAMLARI.includes(String((anket || {}).kapsamTuru || ''));
}

/** Anketin bağlı olduğu derslerden biri bu akademisyenin dersi mi? */
export function dersAnketiMi(anket, derslerim) {
  const bagli = Array.isArray(anket && anket.linkedCourses) ? anket.linkedCourses : [];
  const benim = Array.isArray(derslerim) ? derslerim : [];
  if (bagli.length === 0 || benim.length === 0) return false;
  const anahtar = (c) => metin(c && c.code).toLocaleUpperCase('tr') || '#' + metin(c && c.name);
  const kume = new Set(benim.map(anahtar).filter((x) => x && x !== '#'));
  return bagli.some((c) => kume.has(anahtar(c)));
}

/** Bu akademisyenin verdiği dersler (sinav_dersler kayıtlarından). */
export function akademisyenDersleri(dersler, ad) {
  return (Array.isArray(dersler) ? dersler : []).filter((d) => dersEgitmeniMi(d, ad));
}

/** Atama bu kapsama (bölümlere) ulaşıyor mu? */
function atamaUlasiyorMu(atama, benim) {
  const a = atama || {};
  if (String(a.kapsamTuru || '') === 'universite') return true;
  const ids = dizi(a.kapsamDepartmentIds);
  if (ids.length > 0) return ids.some((x) => benim.includes(x));
  // Kapsamsız eski atama: yalnız yazıldığı bölüm.
  const d = metin(a.departmentId);
  return !!d && benim.includes(d);
}

/**
 * Anket bu yetkilinin listesinde GÖRÜNÜR mü?
 *
 * @param {object} anket
 * @param {object} kapsam  yayinKapsamCoz çıktısı ('akademisyen' de olabilir)
 * @param {object} [secenek] { atamalar, user, derslerim }
 */
export function anketGorunurMu(anket, kapsam, secenek) {
  if (!anket) return false;
  const k = kapsam || { kapsamTuru: 'bolum', facultyId: '', departmentIds: [] };
  if (k.kapsamTuru === 'universite') return true;
  const o = secenek || {};
  if (sahibiMi(anket, o.user)) return true;

  if (k.kapsamTuru === 'akademisyen') return dersAnketiMi(anket, o.derslerim);

  const benim = dizi(k.departmentIds);
  const tur = String(anket.kapsamTuru || '');
  const anketBolumleri = dizi(anket.kapsamDepartmentIds);
  const kendiSeviyesi =
    k.kapsamTuru === 'fakulte' ? tur === 'fakulte' || tur === 'bolum' : tur === 'bolum';
  if (kendiSeviyesi) {
    if (anketBolumleri.length > 0) {
      if (anketBolumleri.some((x) => benim.includes(x))) return true;
    } else if (
      // Bölüm listesi boşalmış fakülte kaydı: fakülte kimliğiyle.
      k.kapsamTuru === 'fakulte' &&
      metin(anket.kapsamFacultyId) &&
      metin(anket.kapsamFacultyId) === metin(k.facultyId)
    ) {
      return true;
    }
  }

  const id = metin(anket.id);
  return (Array.isArray(o.atamalar) ? o.atamalar : []).some(
    (a) => a && metin(a.surveyId) === id && atamaUlasiyorMu(a, benim)
  );
}

/**
 * Bu yetkili bu anketi PAYLAŞABİLİR (atayabilir) mi?
 * Akademisyen yalnız kendi verdiği bir derse bağlı anketi paylaşır; diğer
 * yetkililer listelerinde görünen her anketi kendi alanlarına paylaşır.
 */
export function anketAtanabilirMi(anket, kapsam, secenek) {
  if (!anketGorunurMu(anket, kapsam, secenek)) return false;
  const k = kapsam || {};
  if (k.kapsamTuru === 'akademisyen') return dersAnketiMi(anket, (secenek || {}).derslerim);
  return true;
}

/**
 * Atamanın yazılacak kapsamı — yetkilinin alanıyla KESİŞTİRİLMİŞ.
 * İstenen alan yetkilinin dışındaysa null (atama reddedilir).
 *
 * @param {object} kapsam  yetkilinin kapsamı
 * @param {object} istenen { kapsamTuru, kapsamFacultyId, kapsamDepartmentIds }
 * @returns {{kapsamTuru, kapsamFacultyId, kapsamDepartmentIds}|null}
 */
export function atamaKapsamiKarari(kapsam, istenen) {
  const k = kapsam || { kapsamTuru: 'bolum', departmentIds: [] };
  const i = istenen || {};
  const tur = String(i.kapsamTuru || '');
  const ids = dizi(i.kapsamDepartmentIds);
  if (k.kapsamTuru === 'universite') {
    if (tur === 'universite' || ids.length === 0) {
      return { kapsamTuru: 'universite', kapsamFacultyId: '', kapsamDepartmentIds: [] };
    }
    return {
      kapsamTuru: tur === 'fakulte' ? 'fakulte' : 'bolum',
      kapsamFacultyId: metin(i.kapsamFacultyId),
      kapsamDepartmentIds: [...new Set(ids)],
    };
  }
  const benim = dizi(k.departmentIds);
  // Üniversite geneli ya da boş istek: yetkilinin tam alanı.
  const hedef =
    tur === 'universite' || ids.length === 0 ? benim : ids.filter((x) => benim.includes(x));
  if (hedef.length === 0) return null;
  const tamFakulte = k.kapsamTuru === 'fakulte' && benim.every((x) => hedef.includes(x));
  return {
    kapsamTuru: tamFakulte ? 'fakulte' : 'bolum',
    kapsamFacultyId: metin(k.facultyId),
    kapsamDepartmentIds: [...new Set(hedef)],
  };
}

/**
 * Anket bu yetkili tarafından DÜZENLENEBİLİR / SİLİNEBİLİR mi?
 *
 * ⚠ Görünürlükten daha dardır. Fakülte yetkilisi kendi fakültesindeki bölüm
 * anketlerini görür ama dokunamaz; yalnız kendi açtığı FAKÜLTE GENELİ
 * anketleri yönetir.
 *
 * @param {object} anket
 * @param {object} kapsam  yayinKapsamCoz çıktısı
 * @param {object} [user]  eski kayıtlarda "anketi açan kişi" denetimi için
 */
export function anketYonetilebilirMi(anket, kapsam, user) {
  if (!anket) return false;
  const k = kapsam || { kapsamTuru: 'bolum', facultyId: '', departmentIds: [] };
  if (k.kapsamTuru === 'universite') return true;

  const tur = String(anket.kapsamTuru || '');

  // Akademisyen yalnız KENDİ açtığı anketi düzenler/siler.
  if (k.kapsamTuru === 'akademisyen') return sahibiMi(anket, user);

  // Kapsamsız (eski) kayıt: yalnız anketi açan kişi. Başkasının eski
  // anketini silmek, sahibi belirsiz bir kaydı yok etmek olurdu.
  if (!kapsamliMi(anket)) return sahibiMi(anket, user);

  // Üst kapsam (üniversite geneli) alt yetkiliye görünür, eseri değildir.
  if (tur === 'universite') return false;

  if (k.kapsamTuru === 'fakulte') {
    // YALNIZ fakülte geneli, KENDİ fakültesi ve KENDİ AÇTIĞI anket.
    //
    // ⚠ Sahiplik şartı bilerek konuldu: aynı fakültede birden çok yetkili
    // olabiliyor ve birinin hazırladığı anketi ötekinin silmesi, sahibinin
    // haberi olmadan veri kaybı demek. Yetkili değişirse anketin yönetimi
    // üniversite yetkilisinden devralınır (kilit sebebinde yazar).
    if (tur !== 'fakulte') return false;
    const anketFak = metin(anket.kapsamFacultyId);
    const fakulteUyuyor = anketFak
      ? anketFak === metin(k.facultyId)
      : dizi(anket.kapsamDepartmentIds).some((x) => dizi(k.departmentIds).includes(x));
    return fakulteUyuyor && sahibiMi(anket, user);
  }

  // Bölüm yetkilisi: yalnız kendi bölümünün anketi. Fakülte geneli bir anket
  // kendi bölümünü kapsasa bile onun eseri değildir.
  if (tur !== 'bolum') return false;
  const benim = dizi(k.departmentIds);
  return dizi(anket.kapsamDepartmentIds).some((x) => benim.includes(x));
}

/**
 * Düzenleme/silme kapalıysa SEBEBİ — düğmenin neden çalışmadığı yazılmadan
 * kapatılması, kullanıcıya "sistem bozuk" dedirtir.
 * @returns {string} boş dize: yetki var
 */
export function anketKilitSebebi(anket, kapsam, user) {
  if (anketYonetilebilirMi(anket, kapsam, user)) return '';
  const k = kapsam || {};
  const tur = String((anket || {}).kapsamTuru || '');
  if (k.kapsamTuru === 'akademisyen') {
    return 'Bu anketi başkası oluşturdu; yalnız paylaşabilirsiniz. Değişiklik için kendi kopyanızı “Çoğalt” ile alın.';
  }
  if (!kapsamliMi(anket)) {
    return 'Bu anket kapsam bilgisi olmayan eski bir kayıt; yalnız anketi oluşturan kişi ya da üniversite yetkilisi düzenleyebilir. Kendi kopyanızı almak için “Çoğalt”ı kullanabilirsiniz.';
  }
  if (tur === 'universite') {
    return 'Üniversite geneli anket — düzenleme ve silme yetkisi üniversite yetkilisindedir.';
  }
  if (tur === 'fakulte') {
    if (k.kapsamTuru === 'bolum') {
      return 'Fakülte geneli anket — düzenleme ve silme yetkisi fakülte yetkilisindedir.';
    }
    // Kendi fakültesi ama anketi başkası açmış: sahibi yazılır ki kime
    // başvuracağı belli olsun.
    const anketFak = metin((anket || {}).kapsamFacultyId);
    if (!anketFak || anketFak === metin(k.facultyId)) {
      const sahip = metin((anket || {}).createdBy) || metin((anket || {}).sahipAd);
      return (
        'Bu fakülte anketini ' +
        (sahip ? sahip + ' oluşturdu' : 'başka bir yetkili oluşturdu') +
        '; düzenleme ve silme yetkisi ona aittir. Devir gerekiyorsa üniversite yetkilisine başvurun.'
      );
    }
    return 'Başka bir fakültenin anketi.';
  }
  return k.kapsamTuru === 'fakulte'
    ? 'Bölüm anketi — düzenleme ve silme yetkisi ilgili bölüm yetkilisindedir. Fakülte geneli bir anket için kendi anketinizi oluşturabilirsiniz.'
    : 'Bu anket sizin yetki alanınızda değil.';
}

/**
 * Kart üzerindeki kapsam rozeti.
 * @param {Array} [bolumler] [{id, name}] — bölüm adını yazabilmek için
 */
export function anketKapsamEtiketi(anket, bolumler) {
  const a = anket || {};
  const tur = String(a.kapsamTuru || '');
  if (tur === 'universite') return { etiket: 'Üniversite geneli', ton: 'universite' };
  if (tur === 'fakulte') return { etiket: 'Fakülte geneli', ton: 'fakulte' };
  if (tur === 'bolum') {
    const ids = dizi(a.kapsamDepartmentIds);
    const liste = Array.isArray(bolumler) ? bolumler : [];
    const adlar = [
      ...new Set(
        ids
          .map((id) => {
            const b = liste.find((x) => x && String(x.id) === String(id));
            return b ? metin(b.name) : '';
          })
          .filter(Boolean)
      ),
    ];
    if (adlar.length === 1) return { etiket: adlar[0], ton: 'bolum' };
    if (adlar.length > 1) return { etiket: adlar[0] + ' +' + (adlar.length - 1), ton: 'bolum' };
    return { etiket: 'Bölüm anketi', ton: 'bolum' };
  }
  return { etiket: 'Kapsamsız (eski kayıt)', ton: 'eski' };
}

/**
 * Listeyi süz ve her ankete kararları iliştir — ekran yalnız çizsin.
 *
 * @returns {{liste:Array, gizlenen:number, yonetilebilir:number}}
 *   `liste` öğeleri: {...anket, _gorunur, _yonetilebilir, _kilitSebebi, _etiket}
 */
export function anketleriSuz(anketler, kapsam, secenek) {
  const hepsi = Array.isArray(anketler) ? anketler : [];
  const o = secenek || {};
  const liste = [];
  let gizlenen = 0;
  let yonetilebilir = 0;
  hepsi.forEach((a) => {
    if (!anketGorunurMu(a, kapsam, o)) {
      gizlenen++;
      return;
    }
    const yonet = anketYonetilebilirMi(a, kapsam, o.user);
    if (yonet) yonetilebilir++;
    liste.push({
      ...a,
      _yonetilebilir: yonet,
      _kilitSebebi: yonet ? '' : anketKilitSebebi(a, kapsam, o.user),
      _atanabilir: anketAtanabilirMi(a, kapsam, o),
      _etiket: anketKapsamEtiketi(a, o.bolumler),
    });
  });
  return { liste, gizlenen, yonetilebilir };
}

/** Kapsam şeridinin cümlesi — yetkili neyi gördüğünü bilsin. */
export function kapsamOzetMetni(kapsam, ozet) {
  const k = kapsam || {};
  const o = ozet || { liste: [], gizlenen: 0, yonetilebilir: 0 };
  const sayi = (o.liste || []).length;
  if (k.kapsamTuru === 'universite') {
    return sayi + ' anket · üniversite genelindeki tüm anketleri yönetebilirsiniz.';
  }
  if (k.kapsamTuru === 'akademisyen') {
    return (
      sayi +
      ' anket · verdiğiniz derslere bağlı anketleri bölümünüzün öğrencilerine paylaşabilirsiniz; ' +
      o.yonetilebilir +
      ' tanesini siz oluşturdunuz ve düzenleyebilirsiniz.'
    );
  }
  if (k.kapsamTuru === 'fakulte') {
    return (
      sayi +
      ' anket görünüyor · ' +
      o.yonetilebilir +
      ' tanesini düzenleyebilirsiniz (kendi oluşturduğunuz fakülte geneli anketler). Bölüm anketleri ve başkasının açtığı anketler yalnız görüntülenir.'
    );
  }
  return (
    sayi + ' anket görünüyor · ' + o.yonetilebilir + ' tanesi bölümünüze ait ve düzenlenebilir.'
  );
}
