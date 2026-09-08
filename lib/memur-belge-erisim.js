// ══════════════════════════════════════════════════════════════
// MEMURUN BELGE GÖRÜNÜRLÜĞÜ
//
// Memur bir bölüme ATANARAK yetki kazanır (bkz. lib/memur-atama.js: havuz
// fakültede, atama (bölüm, memur) başına). Belge görünürlüğü bu atamayı
// izlemiyordu ve iki delik açıktı:
//
//   1) ATAMASIZ MEMUR HER ŞEYİ GÖRÜYORDU. Süzgeç "modül listesi boşsa hepsi
//      görünür" diyordu (`memurModules.length === 0 || …`). Boş liste yetki
//      YOKLUĞUdur; artık hiçbir belge görünmez. Önce atama yapılır.
//
//   2) BAŞKA BÖLÜMÜN BELGESİ GÖRÜNÜYORDU. Kapsam, memurun KAYITLI bölümü ve
//      FAKÜLTESİ ile karşılaştırılıyordu; sağdaki bölüm seçimi hesaba
//      katılmıyordu. Kimya'nın belgesi, Bilgisayar seçiliyken listeye
//      düşüyordu. Artık belge, seçili bölüme ait olmalı ve memur O BÖLÜMDE o
//      modüle atanmış olmalıdır.
//
// Ek olarak kapsamsız (kapsamId boş) belge herkese açık sayılıyordu; artık
// belgenin kendi bölümüne düşer, o da yoksa yalnız aynı fakültede ve atanmış
// modülde görünür.
//
// ⚠ memurModulleri() ile farkı: orada atama kaydı yoksa memur kaydındaki eski
// düz liste (`memurModules`) geriye dönük olarak KULLANILIR. Belge erişiminde
// bu güvenli değil — eski liste bir bölümün kararıdır, bütün fakülteye
// yayılamaz. Burada eski liste YALNIZ memurun kendi bölümünde geçerlidir.
// ══════════════════════════════════════════════════════════════

import { memurAtamasi } from './memur-atama.js';

const metin = (v) => String(v == null ? '' : v).trim();
const dizi = (v) => (Array.isArray(v) ? v.filter(Boolean).map(String) : []);

export function memurMu(kullanici) {
  return !!kullanici && (kullanici.role === 'memur' || kullanici.isMemur === true);
}

/** Memur kaydının kimliği — atama kayıtları bu kimliğe bağlıdır. */
export function memurKimligi(kullanici) {
  const k = kullanici || {};
  return metin(k.id || k._id || k._docId);
}

/**
 * Memur kaydındaki ESKİ düz modül listesi.
 *
 * app-shell, aktif bölüme göre çözülen listeyi `memurModules` üzerine yazar ve
 * özgün listeyi `memurModulesHavuz`a taşır. Geriye dönük kural özgün listeye
 * bakmalı; yoksa çözülmüş liste kendi kendini doğrular.
 */
export function memurEskiModulleri(kullanici) {
  const k = kullanici || {};
  return dizi(Array.isArray(k.memurModulesHavuz) ? k.memurModulesHavuz : k.memurModules);
}

/** Belge ile memur aynı fakültede mi? */
function ayniFakulte(doc, kullanici) {
  const a = metin(doc && doc.facultyId);
  const b = metin(kullanici && kullanici.facultyId);
  return !!a && !!b && a === b;
}

/**
 * Fakülte staj yetkilisi mi? Eski `isStajCoordinator` bayrağı ya da HERHANGİ
 * bir bölümün 'staj' ataması yeter — kural memurStajYetkilisiMi ile aynıdır.
 */
function stajYetkilisiMi(kullanici, atamalar) {
  const k = kullanici || {};
  if (k.isStajCoordinator === true) return true;
  const memurId = memurKimligi(k);
  const ad = memurAdi(k);
  if (!memurId && !ad) return false;
  return (atamalar || []).some(
    (a) => atamaBuMemurun(a, memurId, ad) && dizi(a.modules).indexOf('staj') >= 0
  );
}

/** Belgenin bağlı olduğu bölüm: yönlendirmenin kapsamı, yoksa belgenin kendi bölümü. */
export function belgeBolumu(doc, gonderim) {
  return metin(gonderim && gonderim.kapsamId) || metin(doc && doc.departmentId);
}

/**
 * Memurun BİR BÖLÜMDE göreceği modüller — belge erişimi için katı sürüm.
 * Atama kaydı varsa odur; yoksa eski düz liste yalnız memurun kendi
 * bölümünde geçerlidir. Başka bölümde atama yoksa yetki de yoktur.
 */
/** Memurun adı — atama kaydı adı da kopyalıyor (yedek eşleşme anahtarı). */
export function memurAdi(kullanici) {
  return metin(kullanici && kullanici.name).toLocaleUpperCase('tr');
}

/**
 * Atama bu memura mı ait?
 *
 * ⚠ AD YEDEĞİ BİR HATADAN DOĞDU. Oturum nesnesinde memurun KAYIT KİMLİĞİ hiç
 * taşınmıyordu (giriş yanıtı `id` döndürmüyordu). Kimlik boş kalınca hiçbir
 * atama eşleşmiyor ve memur, kendisine GÖNDERİLEN belgeleri bile
 * göremiyordu. Kimlik artık taşınıyor; ama açık oturumlar ve tarayıcıda
 * saklanmış kullanıcılar onu içermiyor. Ad, bu sistemde zaten kimliktir
 * (şifreler ada göre saklanır — bkz. server/lib/akademisyen-kimlik.js) ve
 * atama kaydı adı kopyalar, bu yüzden güvenli bir ikinci anahtardır.
 */
function atamaBuMemurun(atama, memurId, ad) {
  if (!atama) return false;
  const aid = metin(atama.memurId);
  if (memurId && aid === memurId) return true;
  if (memurId && aid) return false; // ikisi de var ve tutmuyor → başkasının
  return !!ad && metin(atama.memurName).toLocaleUpperCase('tr') === ad;
}

export function memurBelgeModulleri(atamalar, bolumId, kullanici) {
  const b = metin(bolumId);
  if (!b || !memurMu(kullanici)) return [];
  const memurId = memurKimligi(kullanici);
  const ad = memurAdi(kullanici);
  const atama =
    memurAtamasi(atamalar, b, memurId) ||
    (atamalar || []).find(
      (a) => a && metin(a.departmentId) === b && atamaBuMemurun(a, memurId, ad)
    );
  if (atama) return dizi(atama.modules);
  if (b === metin(kullanici.departmentId)) return memurEskiModulleri(kullanici);
  return [];
}

/**
 * Memur bu belgeyi görebilir mi?
 *
 * @param {object} o.doc        belge/kayıt (module, departmentId, facultyId)
 * @param {object} [o.gonderim] yönlendirme satırı (kapsamId)
 * @param {object} o.kullanici  oturumdaki memur
 * @param {Array}  [o.atamalar] memur_bolum_modulleri kayıtları
 * @param {string} [o.aktifBolum] sağdaki bölüm seçimi
 * @param {string} [o.modul]    belge `module` taşımıyorsa (ör. muafiyet_records)
 */
export function memurBelgeyiGorurMu(o) {
  const { doc, gonderim, kullanici, atamalar, aktifBolum } = o || {};
  if (!doc || !memurMu(kullanici)) return false;
  const modul = metin((o && o.modul) || doc.module);
  if (!modul) return false;
  const aktif = metin(aktifBolum);
  const bolum = belgeBolumu(doc, gonderim);

  // STAJ İSTİSNASI — bilerek fakülte çapındadır: SGK onayı tek elden verilir
  // (bkz. lib/memur-atama.js → memurStajYetkilisiMi). Staj yetkilisi, staj
  // belgesini bölüm ataması aranmadan görür; şart yalnız aynı fakülte.
  if (modul === 'staj' && stajYetkilisiMi(kullanici, atamalar)) {
    return ayniFakulte(doc, kullanici);
  }

  if (bolum) {
    // Sağdaki seçim neyin görüntülendiğini söyler: başka bölümün belgesi
    // bu seçimle listelenmez.
    if (aktif && bolum !== aktif) return false;
    return memurBelgeModulleri(atamalar, bolum, kullanici).indexOf(modul) >= 0;
  }

  // Bölümsüz belge = fakülte geneli. Fakülte eşleşmeli ve memur SEÇİLİ
  // bölümde o modüle atanmış olmalı. (Eskiden kapsamsız belge herkese açıktı.)
  const belgeFak = metin(doc.facultyId);
  const memurFak = metin(kullanici.facultyId);
  if (!belgeFak || !memurFak || belgeFak !== memurFak) return false;
  if (!aktif) return false;
  return memurBelgeModulleri(atamalar, aktif, kullanici).indexOf(modul) >= 0;
}

/** Belgenin MEMURA yapılmış yönlendirmeleri. */
export function memurYonlendirmeleri(doc) {
  const gs = (doc && doc.gonderimler) || [];
  return Array.isArray(gs) ? gs.filter((g) => g && g.hedefRol === 'memur') : [];
}

/**
 * Belge bu memura GÖNDERİLMİŞ mi?
 *
 * ⚠ memurBelgeyiGorurMu()'dan farkı: orada belgenin kendi bölümü de yeter,
 * burada GERÇEK bir yönlendirme aranır. Memurun çıktı ekranı, üretilmiş ama
 * kimseye gönderilmemiş belgeleri (recordMemurOutput anlık görüntüleri ve
 * doğrudan başvuru kayıtları) listeliyordu: akademisyen belgeyi daha
 * göndermeden memur tarafında görünüyordu. Artık gönderim şart.
 */
export function memuraGonderildiMi(doc, secenekler) {
  const s = secenekler || {};
  return memurYonlendirmeleri(doc).some((g) =>
    memurBelgeyiGorurMu({
      doc,
      gonderim: g,
      kullanici: s.kullanici,
      atamalar: s.atamalar,
      aktifBolum: s.aktifBolum,
      modul: s.modul,
    })
  );
}

/** Kullanıcı belgeyi kendi listesinden kaldırmış mı? */
export function belgeGizliMi(doc, kullanici) {
  const u = kullanici || {};
  const kim = metin(u.identifier || u.name);
  if (!kim || !doc) return false;
  return dizi(doc.gizleyenler).indexOf(kim) >= 0;
}

/**
 * Bir yönlendirmenin alıcısı bu kullanıcı mı?
 *
 * Memur dalı yukarıdaki katı kuralı kullanır. Diğer rollerde kapsamsız
 * yönlendirme artık "herkes" demek değildir: belgenin kendi bölümüne düşer,
 * o da yoksa aynı fakülte şartı aranır.
 */
export function yonlendirmeBanaMi(doc, gonderim, kullanici, secenekler) {
  const u = kullanici || {};
  const g = gonderim || {};
  const s = secenekler || {};
  const isStudent = u.role === 'student';
  const isMemur = memurMu(u);
  const myDept = metin(u.departmentId);
  const myFac = metin(u.facultyId);
  const kapsam = belgeBolumu(doc, g);
  const belgeFak = metin(doc && doc.facultyId);
  // Kapsamsız belge, aynı fakülte içinde kalır (evrensel değil).
  const bolumEsler = kapsam ? kapsam === myDept : !!belgeFak && belgeFak === myFac;

  if (g.hedefRol === 'ogrenci') {
    return isStudent && metin(g.kapsamId) === metin(u.studentNumber || u.identifier);
  }
  if (isStudent) return false;
  if (g.hedefRol === 'memur') {
    return memurBelgeyiGorurMu({
      doc,
      gonderim: g,
      kullanici: u,
      atamalar: s.atamalar,
      aktifBolum: s.aktifBolum,
    });
  }
  if (g.hedefRol === 'bolum_yetkilisi') return !!u.isDeptManager && bolumEsler;
  if (g.hedefRol === 'akademisyen') return !isMemur && bolumEsler;
  return false;
}

/**
 * BAŞKA bölümlerde bekleyen belgeler — bölüm başına sayı.
 *
 * ⚠ BU SAYAÇ BİR KARIŞIKLIKTAN DOĞDU. Belge görünürlüğü seçili bölüme bağlı
 * (istenen davranış: Kimya'nın belgesi Bilgisayar seçiliyken listelenmesin).
 * Ama bu, kendisine GÖNDERİLMİŞ ve gerçekten kendi işi olan bir belgenin
 * sessizce kaybolması demek: memur listede hiçbir şey görmüyor, belgeyi
 * gönderen taraf "gitmedi" sanıyor. Oysa tek eksik, sağdaki bölüm seçimi.
 *
 * Süzgeç kalır, kayıp sessiz kalmaz: ekran "başka bölümde N belge var" der.
 * Yalnız KAPANMAMIŞ (tamamlanmamış) gönderimler sayılır — kuyruk budur.
 */
export function memurBaskaBolumOzeti(list, kullanici, secenekler) {
  const s = secenekler || {};
  const aktif = metin(s.aktifBolum);
  const sayac = new Map();
  (list || []).forEach((doc) => {
    if (belgeGizliMi(doc, kullanici)) return;
    memurYonlendirmeleri(doc).forEach((g) => {
      if (metin(g.durum) === 'tamamlandi') return;
      const bolum = belgeBolumu(doc, g);
      if (!bolum || bolum === aktif) return;
      const gorur = memurBelgeyiGorurMu({
        doc,
        gonderim: g,
        kullanici,
        atamalar: s.atamalar,
        aktifBolum: bolum,
      });
      if (!gorur) return;
      sayac.set(bolum, (sayac.get(bolum) || 0) + 1);
    });
  });
  return Array.from(sayac.entries())
    .map(([bolum, sayi]) => ({ bolum, sayi }))
    .sort((a, b) => b.sayi - a.sayi || a.bolum.localeCompare(b.bolum, 'tr'));
}

/**
 * Kullanıcıya gelen belgeler (rol + kapsam eşleşmesi). Gelen Belgeler ekranı
 * ve yan menü rozeti aynı kararı kullansın diye tek yerdedir.
 */
export function gelenKutusu(list, kullanici, secenekler) {
  const u = kullanici || {};
  const out = [];
  (list || []).forEach((doc) => {
    if (belgeGizliMi(doc, u)) return;
    (doc.gonderimler || []).forEach((g, idx) => {
      if (yonlendirmeBanaMi(doc, g, u, secenekler)) out.push({ doc, gonderim: g, index: idx });
    });
  });
  return out.sort((a, b) =>
    metin(b.gonderim.gonderilmeTarihi).localeCompare(metin(a.gonderim.gonderilmeTarihi))
  );
}
