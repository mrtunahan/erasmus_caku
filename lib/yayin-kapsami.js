// ══════════════════════════════════════════════════════════════
// YAYIN KAPSAMI — bir duyuru/anket kime ulaşır
//
// Kural tek: bir yayın, YAYIMLAYANIN yetki alanının dışına çıkamaz.
//   • Bölüm yetkilisi    → yalnız kendi bölüm(ler)i
//   • Fakülte yetkilisi  → kendi fakültesindeki TÜM bölümler
//   • Üniversite yetkilisi → tüm fakülteler
//
// ⚠ BU KURAL BİR HATADAN DOĞDU (önce duyurularda, sonra anketlerde):
// kapsam bilgisi kaydın üzerinde durmuyordu ve okuma tarafı "alan boşsa
// herkese göster" diye yorumluyordu. Sonuç: Bilgisayar Mühendisliği'ne
// atanan anket Orman Mühendisliği'nde de çıkıyordu.
//
// İki taraflı çözüm:
//   1) YAZARKEN kapsam kaydın kendisine yazılır (kapsamTuru +
//      kapsamDepartmentIds). Yayımcının o anki ekranı, rolü, aktif bölümü
//      sonradan değişse bile kaydın kapsamı sabit kalır.
//   2) OKURKEN kapsam ZORUNLU olarak uygulanır. Boş kapsam listesi "herkes"
//      değildir — kimse demektir.
//
// Hedef/grup listeleri kapsamı yalnız DARALTIR, asla genişletmez.
// ══════════════════════════════════════════════════════════════

import { universiteYetkilisiMi } from './yetki.js';

const dizi = (v) => (Array.isArray(v) ? v.filter(Boolean).map(String) : []);

/** Kullanıcının bağlı olduğu bölümler (ana + çapraz atamalar). */
export function kullaniciBolumleri(user) {
  return dizi([user && user.departmentId].concat(dizi(user && user.additionalDepartments)));
}

/** Türkçe duyarlı ad anahtarı — iki bölüm listesini eşleştirmek için. */
function adAnahtari(ad) {
  return String(ad == null ? '' : ad)
    .replace(/İ/g, 'i')
    .replace(/I/g, 'ı')
    .toLocaleLowerCase('tr-TR')
    .replace(/[^0-9a-zçğıöşü]/g, '');
}

/**
 * Kapsam çözümü için bölüm listesi hazırlar.
 *
 * ── NEDEN GEREKLİ ──
 * Sistemde bölüm listesi İKİ YERDEN geliyor ve kimlikleri tutmuyor:
 *   • `departments` koleksiyonu → kimlik ObjectId, `facultyId` GERÇEK fakülte
 *     kimliği (ör. '6a2efa1e…')
 *   • koda gömülü çekirdek 6 bölüm → kimlik slug ('bilgisayar'), `facultyId`
 *     ise sabit yazılmış 'muhendislik' metni
 *
 * Fakülte yetkilisinin `facultyId`'si profilden, yani DB'den gelir. Gömülü
 * listeyle kapsam çözülünce `d.facultyId === 'muhendislik'` hiçbir zaman
 * kullanıcının ObjectId'sine eşit olmuyor ve fakülte yetkilisinin kapsamı
 * BOŞ çıkıyordu. Boş kapsam okuma tarafında "kimse" demek olduğu için atanan
 * anket hiç kimseye ulaşmıyor, üstelik yönetim listesinde de görünmüyordu.
 *
 * Çözüm: DB kaydı esas alınır (gerçek `facultyId` ondadır) ve o bölümün TÜM
 * kimlik biçimleri kapsama girer — kullanıcıların `departmentId`'si kimi
 * kayıtta slug, kimi kayıtta ObjectId olduğu için ikisi de gerekir.
 *
 * @param {Array} dbBolumler     `departments` koleksiyonu
 * @param {Array} gomuluBolumler `window.DEPARTMENTS`
 * @returns {Array<{id:string, facultyId:string}>} her kimlik biçimi için bir satır
 */
export function kapsamBolumListesi(dbBolumler, gomuluBolumler) {
  const db = Array.isArray(dbBolumler) ? dbBolumler : [];
  const gomulu = Array.isArray(gomuluBolumler) ? gomuluBolumler : [];
  const satirlar = [];
  const eklendi = new Set();
  const ekle = (id, facultyId) => {
    const k = String(id || '');
    if (!k || eklendi.has(k)) return;
    eklendi.add(k);
    satirlar.push({ id: k, facultyId: String(facultyId || '') });
  };

  db.forEach((d) => {
    if (!d) return;
    const fak = String(d.facultyId || '');
    [d.id, d._id, d._docId, d.code].forEach((v) => ekle(v, fak));
    // Gömülü listedeki eşi (ad bazlı) aynı fakülteye bağlanır: o kayıtların
    // kimliği slug'dır ve kullanıcıların bir kısmı o slug'ı taşır.
    const anahtar = adAnahtari(d.name);
    gomulu.forEach((g) => {
      if (g && anahtar && adAnahtari(g.name) === anahtar) ekle(g.id, fak);
    });
  });

  // DB'de karşılığı bulunmayan gömülü bölümler kendi (sabit) fakültesiyle
  // kalır — hiç listelenmemeleri onları kapsam dışı bırakırdı.
  gomulu.forEach((g) => {
    if (!g) return;
    const anahtar = adAnahtari(g.name);
    const dbEsi = db.some((d) => d && anahtar && adAnahtari(d.name) === anahtar);
    if (!dbEsi) ekle(g.id, g.facultyId);
  });

  return satirlar;
}

/**
 * Kullanıcının yayın yapabileceği alan.
 *
 * @param {object} user
 * @param {Array}  tumBolumler [{id, facultyId}]
 * @returns {{kapsamTuru:'universite'|'fakulte'|'bolum', facultyId:string,
 *   departmentIds:string[]}} `universite` kapsamında departmentIds boştur —
 *   liste tutmanın anlamı yok, sonradan açılan bölüm de kapsama girer.
 */
export function yayinKapsamCoz(user, tumBolumler) {
  const hepsi = Array.isArray(tumBolumler) ? tumBolumler : [];
  if (!user) return { kapsamTuru: 'bolum', facultyId: '', departmentIds: [] };

  // ── ROLE BAKMAK YETMEZ ──
  // Burada `user.role === 'admin'` yazıyordu. Fakülte yetkilisi de giriş
  // sırasında 'admin' rolüne YÜKSELTİLİYOR (shared-components → attachProfile),
  // dolayısıyla bu koşul onu üniversite yetkilisi sayıyordu. İki sonucu vardı:
  //   • Fakülte yetkilisinin attığı anket TÜM üniversiteye gidiyordu.
  //   • Yönetim listesinde -kapsamı 'universite' olan herkes her şeyi
  //     yönetebildiği için- BAŞKA fakültenin ve üniversite yetkilisinin
  //     atamalarını görüp SİLEBİLİYORDU.
  // Ayırt eden alan `isUniversityAdmin` bayrağı; kural lib/yetki.js'te.
  if (universiteYetkilisiMi(user)) {
    return { kapsamTuru: 'universite', facultyId: '', departmentIds: [] };
  }

  const fak = String(user.facultyId || '');
  if (user.isFacultyManager && fak) {
    return {
      kapsamTuru: 'fakulte',
      facultyId: fak,
      departmentIds: hepsi
        .filter((d) => String(d.facultyId || '') === fak)
        .map((d) => String(d.id)),
    };
  }

  return { kapsamTuru: 'bolum', facultyId: fak, departmentIds: kullaniciBolumleri(user) };
}

/**
 * Bir fakültenin bölümleri — yayımcının kapsamıyla KESİŞTİRİLMİŞ hâlde.
 *
 * Üniversite yetkilisi için bu fakültenin tamamıdır. Fakülte yetkilisi kendi
 * fakültesini seçerse yine kendi bölümleridir; başka fakülteyi seçmesi
 * durumunda kesişim boş çıkar ve seçim yok sayılır (aşağıda).
 */
function fakulteBolumleri(kapsam, fakulteId, tumBolumler) {
  const fak = String(fakulteId || '');
  if (!fak) return [];
  const hepsi = (Array.isArray(tumBolumler) ? tumBolumler : [])
    .filter((d) => d && String(d.facultyId || '') === fak)
    .map((d) => String(d.id));
  if (kapsam && kapsam.kapsamTuru === 'universite') return [...new Set(hepsi)];
  const benim = dizi(kapsam && kapsam.departmentIds);
  return [...new Set(hepsi.filter((x) => benim.includes(x)))];
}

/**
 * Kayda yazılacak kapsam alanları.
 *
 * ── SEÇİM YALNIZ DARALTIR ──
 * Yayımcı kapsamının bir alt kümesini seçebilir; kapsamı AŞAN bir seçim yok
 * sayılır ve kayıt yayımcının tam kapsamıyla yazılır. Yani seçim kutusu bir
 * yetki genişletme aracı değildir — istemciden ne gelirse gelsin.
 *
 * @param {object} kapsam  yayinKapsamCoz çıktısı
 * @param {string|{tur:'hepsi'|'fakulte'|'bolum', id:string}} [secim]
 *   Düz metin verilirse BÖLÜM kimliği sayılır (eski çağrılar bozulmasın).
 * @param {Array} [tumBolumler] [{id, facultyId}] — fakülte seçimi için gerekli
 */
export function yayinKapsamYamasi(kapsam, secim, tumBolumler) {
  const k = kapsam || { kapsamTuru: 'bolum', facultyId: '', departmentIds: [] };
  const tam = {
    kapsamTuru: k.kapsamTuru,
    kapsamFacultyId: String(k.facultyId || ''),
    kapsamDepartmentIds: dizi(k.departmentIds),
  };

  const s = typeof secim === 'string' || secim == null ? { tur: 'bolum', id: secim } : secim;
  const tur = String(s.tur || 'bolum');
  const id = String(s.id || '');
  if (!id || tur === 'hepsi') return tam;

  if (tur === 'fakulte') {
    const ids = fakulteBolumleri(k, id, tumBolumler);
    if (ids.length === 0) return tam; // kapsam dışı fakülte — seçim yok sayılır
    return { kapsamTuru: 'fakulte', kapsamFacultyId: id, kapsamDepartmentIds: ids };
  }

  const icinde = k.kapsamTuru === 'universite' || dizi(k.departmentIds).includes(id);
  if (!icinde) return tam; // kapsam dışı bölüm — seçim yok sayılır
  return {
    kapsamTuru: 'bolum',
    kapsamFacultyId: String(k.facultyId || ''),
    kapsamDepartmentIds: [id],
  };
}

/**
 * Yayın bu kullanıcının bölümüne ULAŞABİLİR Mİ?
 *
 * ── Eski kayıtlar ──
 * `kapsamTuru` alanı eklenmeden önce yazılmış kayıtlarda kapsam bilgisi yok.
 * Bunları körlemesine "üniversite geneli" saymak, düzeltmeye çalıştığımız
 * sızıntıyı olduğu gibi bırakırdı; bu yüzden DAR tarafa düşülür: kayıtta
 * yazanın bölümü (departmentId) varsa yalnız o bölüm. Gerçekten genel olması
 * gereken eski bir kayıt, yetkilisi bir kez açıp yeniden kaydettiğinde doğru
 * kapsamla işaretlenir.
 *
 * @param {object} kayit
 * @param {object} user
 * @param {object} [secenek] { hedefAlan } eski kayıtlardaki hedef listesi alanı
 */
export function yayinKapsamdaMi(kayit, user, secenek) {
  if (!kayit) return false;
  const benim = kullaniciBolumleri(user);
  const kapsamTuru = String(kayit.kapsamTuru || '');

  if (kapsamTuru === 'universite') return true;
  if (kapsamTuru === 'fakulte' || kapsamTuru === 'bolum') {
    // Kapsam listesi boş kalmış kayıt (bölüm silinmiş olabilir) kimseye
    // açılmaz — "boş liste = herkes" yorumu bu hatanın ta kendisiydi.
    return dizi(kayit.kapsamDepartmentIds).some((x) => benim.includes(x));
  }

  // ── Kapsamsız (eski) kayıt ──
  const hedefAlan = (secenek && secenek.hedefAlan) || '';
  if (hedefAlan) {
    const hedefler = dizi(kayit[hedefAlan]);
    if (hedefler.length > 0) return hedefler.some((h) => benim.includes(h));
  }
  const yazanBolum = String(kayit.departmentId || '');
  if (yazanBolum) return benim.includes(yazanBolum);
  return true; // yazanın bölümü de yoksa gerçekten genel bir kayıttır
}

/**
 * Yayımcının YÖNETİM ekranında göreceği kayıtlar: kendi kapsamına giren ya da
 * kendi kapsamıyla kesişen yayınlar. Bir bölüm yetkilisi başka bölümün
 * atamasını görüp silememeli.
 */
export function yayinYonetilebilirMi(kayit, kapsam) {
  if (!kayit) return false;
  const k = kapsam || { kapsamTuru: 'bolum', departmentIds: [] };
  if (k.kapsamTuru === 'universite') return true;
  const benim = dizi(k.departmentIds);
  const kayitKapsam = dizi(kayit.kapsamDepartmentIds);
  if (String(kayit.kapsamTuru || '') === 'universite') {
    // Üniversite geneli bir yayın alt yetkiliye GÖRÜNÜR ama onun eseri
    // değildir; yönetimini (silme) üst yetkiliye bırakmak gerekir.
    return false;
  }
  if (kayitKapsam.length > 0) return kayitKapsam.some((x) => benim.includes(x));
  // Eski kayıt: yazanın bölümü kapsamımızda mı?
  const yazanBolum = String(kayit.departmentId || '');
  if (yazanBolum) return benim.includes(yazanBolum);
  return false;
}
