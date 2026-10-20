// ══════════════════════════════════════════════════════════════
// YETKİ ALANI — hiyerarşideki yetkili NEREYE yazabilir
//
// ⚠ ROL SORMAK, ALAN SORMAK DEĞİLDİR. Yönetim koleksiyonlarındaki kapılar
// "bölüm yetkilisi mi / fakülte yetkilisi mi" diye soruyordu ama "HANGİ
// bölümün / fakültenin" diye sormuyordu. Somut sonuçlar (kapsam matrisiyle
// doğrulandı):
//   • Mühendislik fakülte yetkilisi Fen'in bölümlerini, Fen'in fakülte
//     kaydını, hatta üniversite kaydını ve kurum ayarlarını değiştirebiliyordu.
//   • Bilgisayar bölüm yetkilisi Kimya'nın ders programı ayarlarına,
//     mezuniyet kurallarına, memur atamalarına, yol haritalarına ve
//     akademisyen kayıtlarına yazabiliyor; ÜNİVERSİTE GENELİ duyuru
//     yayınlayabiliyordu.
//
// Kural (tek yerde):
//   üniversite yetkilisi / sistem yöneticisi → her yer
//   fakülte yetkilisi → kendi fakültesinin bölümleri + kendi fakülte kaydı
//   bölüm yetkilisi   → kendi bölüm(ler)i
// Bölüm kimliği karşılaştırması her zaman VARYANTLARLA yapılır (slug,
// ObjectId, kod, eski kimlik — bkz. bolum-kimlik.js); ham eşitlik aynı
// bölümü başka bölüm sanar.
//
// Bu dosya saftır (veritabanına dokunmaz); routes/db.js profili ve bölüm
// listesini verir.
// ══════════════════════════════════════════════════════════════

const { bolumKimlikHaritasi, bolumVaryantlari, kimlikler } = require('./bolum-kimlik');

const metin = (v) => String(v == null ? '' : v).trim();
const dizi = (v) => (Array.isArray(v) ? v : []);

// ── AD ÜZERİNDEN EŞLEŞEN KİMLİKLER ──
// İstemcinin gömülü çekirdek listesi (shared-components.jsx → DEPARTMENTS)
// bölümleri SLUG ile anar; veritabanı kayıtları ObjectId taşır ve ikisini
// bağlayan tek şey bölüm ADIDIR (istemci de böyle eşler: lib/yayin-kapsami.js
// → kapsamBolumListesi). Kimlik haritası yalnız kimlik alanlarından kurulsaydı
// profilinde 'bilgisayar' yazan bölüm yetkilisi, kendi bölümünün ObjectId'li
// kaydını yabancı sanırdı.
const GOMULU_BOLUMLER = [
  { id: 'bilgisayar', name: 'Bilgisayar Mühendisliği' },
  { id: 'elektrik', name: 'Elektrik ve Elektronik Mühendisliği' },
  { id: 'makine', name: 'Makine Mühendisliği' },
  { id: 'insaat', name: 'İnşaat Mühendisliği' },
  { id: 'gida', name: 'Gıda Mühendisliği' },
  { id: 'kimya', name: 'Kimya Mühendisliği' },
];
function adAnahtari(ad) {
  return metin(ad)
    .replace(/İ/g, 'i')
    .replace(/I/g, 'ı')
    .toLocaleLowerCase('tr-TR')
    .replace(/[^0-9a-zçğıöşü]/g, '');
}

/**
 * Kimlik haritası: aynı adlı (ve aynı fakültedeki) kayıtlar tek bölümdür;
 * gömülü slug da adı tutan kaydın varyantı sayılır.
 */
function birlesikHarita(bolumler) {
  const liste = dizi(bolumler).filter(Boolean);
  const gruplar = new Map(); // ad|fakülte → birleşik sahte kayıt
  liste.forEach((d) => {
    const ad = adAnahtari(d.name);
    const anahtar = ad ? ad + '|' + metin(d.facultyId) : '#' + kimlikler(d)[0];
    const g = gruplar.get(anahtar) || {
      _docId: kimlikler(d)[0],
      facultyId: metin(d.facultyId),
      name: d.name,
      eskiKimlikler: [],
    };
    g.eskiKimlikler.push(...kimlikler(d));
    gruplar.set(anahtar, g);
  });
  // Slug yalnız adı TEK bir bölüme denk geliyorsa bağlanır: aynı adlı bölüm
  // iki fakültede varsa slug hangisini kastettiğini söylemez; ikisine birden
  // bağlamak iki ayrı bölümü birbirine karıştırırdı.
  GOMULU_BOLUMLER.forEach((gb) => {
    const ad = adAnahtari(gb.name);
    const eslesen = [...gruplar.entries()].filter(([anahtar]) => anahtar.split('|')[0] === ad);
    if (eslesen.length === 1) eslesen[0][1].eskiKimlikler.push(gb.id);
  });
  return bolumKimlikHaritasi([...gruplar.values()]);
}

/**
 * Yetkilinin alanı.
 * @param {object} p { user, flags, profil, bolumler }
 * @returns {{ tur: 'universite'|'fakulte'|'bolum'|'yok', fakulteler:Set, bolumler:Set, harita }}
 */
// Aynı fakülte slug ('muhendislik'), veritabanı kimliği ve (çekirdek
// bölümlerde) boş facultyId ile anılabiliyor; istemci bunları ada göre
// birleştiriyor (lib/sinav-fakulte.js → fakulteListesi). Sunucu da aynı
// birimi tek alan sayar. Çekirdek bölümler fakültesizse Mühendislik'tir.
const VARSAYILAN_FAKULTE_ADLARI = { muhendislik: 'Mühendislik Fakültesi' };
const adNormal = (v) => metin(v).toLocaleLowerCase('tr-TR').replace(/\s+/g, ' ');
function fakulteKimlikleri(fakId, fakulteKayitlari) {
  const hedef = metin(fakId);
  const out = new Set(hedef ? [hedef] : []);
  if (!hedef) return out;
  const kayitKimlikleri = (f) =>
    [f && f._docId, f && f.id, f && f._id && f._id.toString()].map(metin).filter(Boolean);
  const kayitlar = dizi(fakulteKayitlari).filter(Boolean);
  // Hedefin adı: kayıttan ya da bilinen slug'dan.
  const kayit = kayitlar.find((f) => kayitKimlikleri(f).includes(hedef));
  const ad = adNormal((kayit && kayit.name) || VARSAYILAN_FAKULTE_ADLARI[hedef]);
  if (ad) {
    kayitlar
      .filter((f) => adNormal(f.name) === ad)
      .forEach((f) => kayitKimlikleri(f).forEach((k) => out.add(k)));
    Object.entries(VARSAYILAN_FAKULTE_ADLARI).forEach(([slug, varsayilanAd]) => {
      if (adNormal(varsayilanAd) === ad) out.add(slug);
    });
  }
  return out;
}

function yetkiAlani(p) {
  const o = p || {};
  const user = o.user || {};
  const flags = o.flags || {};
  const profil = o.profil || {};
  const harita = birlesikHarita(o.bolumler);
  const bolumler = new Set();
  const fakulteler = new Set();
  const ekle = (id) => bolumVaryantlari(harita, id).forEach((v) => bolumler.add(v));

  if (user.role === 'admin' || flags.admin || flags.uniAdmin) {
    return { tur: 'universite', fakulteler, bolumler, harita };
  }
  if (user.role === 'bolum_yetkilisi') {
    ekle(user.departmentId);
    bolumler.delete('');
    return { tur: bolumler.size ? 'bolum' : 'yok', fakulteler, bolumler, harita };
  }
  if (flags.facManager && metin(profil.facultyId)) {
    const fakKimlik = fakulteKimlikleri(profil.facultyId, o.fakulteler);
    fakKimlik.forEach((k) => fakulteler.add(k));
    dizi(o.bolumler).forEach((d) => {
      // Fakültesi boş bölüm istemcide Mühendislik sayılır.
      const df = metin(d && d.facultyId) || 'muhendislik';
      if (d && fakKimlik.has(df)) {
        bolumVaryantlari(harita, metin(d._docId || d.id || (d._id && d._id.toString()))).forEach(
          (v) => bolumler.add(v)
        );
      }
    });
    // Kendi bölümü fakültenin dışında kayıtlı olsa bile kendi alanıdır.
    ekle(profil.departmentId);
    bolumler.delete('');
    return { tur: 'fakulte', fakulteler, bolumler, harita };
  }
  if (flags.deptManager) {
    // YAZMA alanı yalnız ana bölüm: ek bölümünde (ders verdiği) yetkili orada
    // sade akademisyendir (arayüz de öyle davranır: app-shell isOnExtraDept).
    // Okumada ek bölümler de alanındadır.
    ekle(profil.departmentId);
    if (o.okuma) dizi(profil.additionalDepartments).forEach(ekle);
    bolumler.delete('');
    return { tur: bolumler.size ? 'bolum' : 'yok', fakulteler, bolumler, harita };
  }
  // OKUMA için sade akademisyenin de bir alanı vardır: kendi bölüm(ler)i.
  // (Yazmada yoktur — yönetim kayıtlarına zaten rol kapısı izin vermez.)
  if (o.okuma && user.role === 'professor') {
    ekle(profil.departmentId);
    dizi(profil.additionalDepartments).forEach(ekle);
    bolumler.delete('');
    return { tur: bolumler.size ? 'bolum' : 'yok', fakulteler, bolumler, harita };
  }
  return { tur: 'yok', fakulteler, bolumler, harita };
}

/** Bölüm (herhangi bir kimlik biçimiyle) alanın içinde mi? */
function bolumAlanda(alan, id) {
  if (!alan) return false;
  if (alan.tur === 'universite') return true;
  const v = bolumVaryantlari(alan.harita, metin(id));
  return v.some((x) => alan.bolumler.has(x));
}

function fakulteAlanda(alan, facultyId) {
  if (!alan) return false;
  if (alan.tur === 'universite') return true;
  return alan.fakulteler.has(metin(facultyId));
}

// Belgesi bir bölüme ait yönetim koleksiyonları ve bölümün nerede durduğu.
// `docId: true` → belge kimliği bölüm kimliğidir.
const BOLUM_KAYITLARI = {
  bolum_program_ayarlari: { alan: 'departmentId', docId: true },
  mezuniyet_kurallari: { alan: 'departmentId', docId: true },
  memur_bolum_modulleri: { alan: 'departmentId' },
  yol_haritalari: { alan: 'departmentId' },
  professors: { alan: 'departmentId' },
};

/** Kaydın bağlı olduğu bölüm(ler). */
function kaydinBolumleri(koleksiyon, op, mevcut) {
  const k = BOLUM_KAYITLARI[koleksiyon];
  if (!k) return [];
  const out = [];
  const veri = (op && op.data) || {};
  if (mevcut && metin(mevcut[k.alan])) out.push(metin(mevcut[k.alan]));
  if (metin(veri[k.alan])) out.push(metin(veri[k.alan]));
  if (k.docId && metin(op && op.docId) && !mevcut) out.push(metin(op.docId));
  return [...new Set(out)];
}

/**
 * Yönetim kaydına yazma kararı (yalnız yetkili rollerde çağrılır).
 * @returns {{izin:boolean, hata?:string}}
 */
function bolumKaydiKarari(koleksiyon, op, mevcut, alan) {
  if (!BOLUM_KAYITLARI[koleksiyon]) return { izin: true };
  if (alan && alan.tur === 'universite') return { izin: true };
  const bolumler = kaydinBolumleri(koleksiyon, op, mevcut);
  // Bölümü olmayan kayıt (eski, bölümsüz) yalnız üniversite düzeyinde.
  if (bolumler.length === 0) {
    return {
      izin: false,
      hata: 'Bu kaydın bölümü belli değil; yalnız üniversite yetkilisi düzenler.',
    };
  }
  const disarida = bolumler.filter((b) => !bolumAlanda(alan, b));
  if (disarida.length) {
    return {
      izin: false,
      hata:
        alan && alan.tur === 'fakulte'
          ? 'Yalnız kendi fakültenizin bölümlerinde işlem yapabilirsiniz.'
          : 'Yalnız kendi bölümünüzde işlem yapabilirsiniz.',
    };
  }
  return { izin: true };
}

/**
 * Başka bölümün akademisyenini KENDİ bölümüne ek bölüm olarak bağlama
 * (Kullanıcı Yönetimi → "Var Olan Akademisyenden Ekle") ya da bu bağı
 * kaldırma. Akademisyen kaydı ana bölümüne aittir; bölüm yetkilisi o kayda
 * genel olarak yazamaz. Ama yalnız `additionalDepartments` listesinde KENDİ
 * alanındaki bölümü ekleyip çıkarıyorsa izin verilir: başka bölümlerin
 * bağlarına ve kaydın diğer alanlarına dokunamaz.
 * @returns {{izin:boolean, hata?:string}}
 */
function ekBolumKarari(op, mevcut, alan) {
  if (alan && alan.tur === 'universite') return { izin: true };
  const veri = (op && op.data) || {};
  const birlesik = op && (op.type === 'update' || (op.type === 'set' && op.merge));
  if (!birlesik || !mevcut) {
    return { izin: false, hata: 'Ek bölüm ataması yalnız mevcut kayda güncelleme olarak yazılır.' };
  }
  const fazla = Object.keys(veri).filter((k) => k !== 'additionalDepartments' && k !== 'updatedAt');
  if (fazla.length) return { izin: false, hata: 'Yalnız kendi bölümünüzde işlem yapabilirsiniz.' };
  const yeni = veri.additionalDepartments;
  if (!Array.isArray(yeni) || yeni.some((x) => typeof x !== 'string')) {
    return { izin: false, hata: 'Ek bölüm listesi geçersiz.' };
  }
  const eski = Array.isArray(mevcut.additionalDepartments)
    ? mevcut.additionalDepartments.map(metin)
    : [];
  const yeniM = yeni.map(metin);
  const degisen = [
    ...yeniM.filter((x) => !eski.includes(x)),
    ...eski.filter((x) => !yeniM.includes(x)),
  ];
  if (degisen.some((b) => !bolumAlanda(alan, b))) {
    return { izin: false, hata: 'Yalnız kendi bölümünüze ek bölüm ataması yapabilirsiniz.' };
  }
  return { izin: true };
}

/**
 * Yapısal kayıtlar: bölüm, fakülte, üniversite, kurum ayarı.
 * Rol kapısı (kim yazabilir) routes/db.js'te; burada YER denetlenir.
 */
function yapisalKarar(koleksiyon, op, mevcut, alan) {
  if (alan && alan.tur === 'universite') return { izin: true };
  const veri = (op && op.data) || {};
  if (koleksiyon === 'universities' || koleksiyon === 'tenant_config') {
    return { izin: false, hata: 'Bu kaydı yalnız üniversite yetkilisi düzenleyebilir.' };
  }
  if (koleksiyon === 'faculties') {
    if (op.type === 'add' || op.type === 'delete') {
      return { izin: false, hata: 'Fakülte ekleme/silme yalnız üniversite yetkilisindedir.' };
    }
    const fak = metin(mevcut && (mevcut._docId || mevcut.id)) || metin(op.docId);
    if (!fakulteAlanda(alan, fak) && !fakulteAlanda(alan, metin(op.docId))) {
      return { izin: false, hata: 'Yalnız kendi fakültenizin kaydını düzenleyebilirsiniz.' };
    }
    return { izin: true };
  }
  if (koleksiyon === 'departments') {
    if (alan && alan.tur === 'fakulte') {
      // Mevcut bölüm kendi fakültesinde olmalı; yeni/taşınan bölüm de.
      if (mevcut && !fakulteAlanda(alan, mevcut.facultyId)) {
        return { izin: false, hata: 'Bu bölüm sizin fakültenizde değil.' };
      }
      if (op.type === 'add' && !fakulteAlanda(alan, veri.facultyId)) {
        return { izin: false, hata: 'Bölümü yalnız kendi fakültenize ekleyebilirsiniz.' };
      }
      if ('facultyId' in veri && !fakulteAlanda(alan, veri.facultyId)) {
        return { izin: false, hata: 'Bölümü başka bir fakülteye taşıyamazsınız.' };
      }
      return { izin: true };
    }
    // Bölüm düzeyi kural yapisal-yazma.js'te (yalnız kendi bölüm kaydı).
    return { izin: true };
  }
  return { izin: true };
}

/**
 * Duyuru / yayın kapsamı yayımlayanın alanını aşamaz.
 * Kayıt: { kapsamTuru: 'universite'|'fakulte'|'bolum', kapsamDepartmentIds, facultyId }
 */
function yayinKapsamKarari(veri, alan) {
  const v = veri || {};
  if (!('kapsamTuru' in v) && !('kapsamDepartmentIds' in v)) return { izin: true };
  if (alan && alan.tur === 'universite') return { izin: true };
  const tur = metin(v.kapsamTuru);
  if (tur === 'universite') {
    return { izin: false, hata: 'Üniversite geneli yayını yalnız üniversite yetkilisi yapabilir.' };
  }
  if (tur === 'fakulte' && (!alan || alan.tur !== 'fakulte')) {
    return { izin: false, hata: 'Fakülte geneli yayını yalnız fakülte yetkilisi yapabilir.' };
  }
  if (tur === 'fakulte' && metin(v.facultyId) && !fakulteAlanda(alan, v.facultyId)) {
    return { izin: false, hata: 'Yalnız kendi fakültenize yayın yapabilirsiniz.' };
  }
  const hedef = dizi(v.kapsamDepartmentIds).map(metin).filter(Boolean);
  if ((tur === 'bolum' || tur === 'fakulte') && hedef.length === 0) {
    return { izin: false, hata: 'Yayının hedef bölümü yok.' };
  }
  const disarida = hedef.filter((b) => !bolumAlanda(alan, b));
  if (disarida.length) {
    return { izin: false, hata: 'Yalnız kendi yetki alanınızdaki bölümlere yayın yapabilirsiniz.' };
  }
  return { izin: true };
}

// ── OKUMA: başvuru kayıtları (kişisel veri) ──
// Yatay geçiş ve muafiyet başvurusu not, AGNO, iletişim, dilekçe taşır.
// Personel tarafında süzme tarayıcıdaydı: Kimya'daki bir akademisyen
// Bilgisayar öğrencisinin başvurusunu /api/db üzerinden okuyabiliyordu.
const BASVURU_BOLUMU = {
  // Başvuruyu DEĞERLENDİREN bölüm (bkz. lib/yatay-kapsam.js).
  yatay_gecis_basvurular: (r) => metin(r.basvurduguBolumId) || metin(r.departmentId),
  // Eski muafiyet kayıtlarında bölüm yok; ekran onları Bilgisayar'a sayıyordu
  // (ders-muafiyet.jsx) — sunucu aynı kuralı izler.
  muafiyet_records: (r) => metin(r.departmentId) || 'bilgisayar',
  // ÇAP/Yandal: öğrencinin bölümü (başvuruyu o bölüm karşılıyor). Bölümsüz
  // eski kayıt ekranda herkese gösteriliyordu — süzgeç onu düşürmez.
  cap_yandal_basvurular: (r) => metin(r.departmentId),
  // Staj başvurusu: öğrencinin bölümü. Fakülte staj yetkilisi istisnadır
  // (bütün bölümler) — routes/db.js onu süzgeçten geçirmez.
  internship_applications: (r) => metin(r.departmentId),
};

/**
 * Personelin okuyacağı başvurular. Bölümü çözülemeyen yatay geçiş kaydı
 * düşürülmez: ekran onu "sahipsiz" diye ayrıca bildiriyor (lib/yatay-kapsam.js);
 * düşürülseydi uyarı da kaybolurdu.
 */
function basvurulariSuz(koleksiyon, kayitlar, alan) {
  const bolumu = BASVURU_BOLUMU[koleksiyon];
  if (!bolumu || !alan || alan.tur === 'universite') return kayitlar;
  return (kayitlar || []).filter((r) => {
    const b = bolumu(r);
    if (!b) return true;
    return bolumAlanda(alan, b);
  });
}

module.exports = {
  basvurulariSuz,
  BASVURU_BOLUMU,
  yetkiAlani,
  bolumAlanda,
  fakulteAlanda,
  bolumKaydiKarari,
  ekBolumKarari,
  yapisalKarar,
  yayinKapsamKarari,
  kaydinBolumleri,
  BOLUM_KAYITLARI,
};
