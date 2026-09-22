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

const metin = (v) => String(v == null ? '' : v).trim();
const dizi = (v) => (Array.isArray(v) ? v.filter(Boolean).map(String) : []);

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

/**
 * Anket bu yetkilinin listesinde GÖRÜNÜR mü?
 *
 * Üst kapsamdan gelen (üniversite geneli) anket görünür; kendi kapsamıyla
 * kesişen anketler görünür; başka fakültenin anketi görünmez.
 */
export function anketGorunurMu(anket, kapsam) {
  if (!anket) return false;
  const k = kapsam || { kapsamTuru: 'bolum', facultyId: '', departmentIds: [] };
  if (k.kapsamTuru === 'universite') return true;

  const tur = String(anket.kapsamTuru || '');
  // Kapsamsız (eski) anket herkese görünür — liste çalışmaya devam etsin.
  if (!kapsamliMi(anket)) return true;
  if (tur === 'universite') return true;

  const benim = dizi(k.departmentIds);
  const anketBolumleri = dizi(anket.kapsamDepartmentIds);
  if (anketBolumleri.length > 0) return anketBolumleri.some((x) => benim.includes(x));

  // Kapsamı 'fakulte'/'bolum' ama listesi boşalmış kayıt (bölüm silinmiş
  // olabilir): fakülte kimliği tutuyorsa göster, tutmuyorsa gösterme.
  const anketFak = metin(anket.kapsamFacultyId);
  return !!anketFak && anketFak === metin(k.facultyId);
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
    if (!anketGorunurMu(a, kapsam)) {
      gizlenen++;
      return;
    }
    const yonet = anketYonetilebilirMi(a, kapsam, o.user);
    if (yonet) yonetilebilir++;
    liste.push({
      ...a,
      _yonetilebilir: yonet,
      _kilitSebebi: yonet ? '' : anketKilitSebebi(a, kapsam, o.user),
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
