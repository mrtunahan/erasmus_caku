/**
 * PERFORMANS VERİSİNİN KAPSAMI — kim kimin verisini görür.
 *
 * Üç katman, üç ayrı soru:
 *
 *   AKADEMİSYEN     → yalnız KENDİ girdiği değerler.
 *   BÖLÜM YETKİLİSİ → yalnız KENDİ bölümündeki akademisyenlerin değerleri.
 *   FAKÜLTE YETKİLİSİ → yalnız KENDİ fakültesindeki bölüm yetkililerinin
 *                       GÖNDERDİĞİ değerler.
 *
 * ⚠ SON MADDE ÖNEMLİ: fakülte yetkilisi bölümün taslak verisini görmez.
 * Bölüm yetkilisi ay içinde eksik/yanlış rakamlarla çalışıyor olabilir;
 * fakülte toplamı bu yarım rakamları çekerse rapor yanlış çıkar ve kimse
 * bunun taslak olduğunu bilmez. Bölüm "gönderdim" demeden fakülte toplamına
 * girmez. Gönderim ayrı bir kayıttır (bkz. gonderimAnahtari).
 *
 * ⚠ FAKÜLTE BİLİNMİYORSA KAPSAM AÇILMAZ. Eski kodda fakülte adı
 * `profil?.fakulte || FAKULTELER[0]` ile çözülüyordu: sistemde akademisyen
 * kaydı bulunmayan bir fakülte yetkilisi, listedeki İLK fakültenin verisini
 * görüyordu. Kapsam artık boş kalır ve ekran "fakülteniz çözülemedi" der —
 * yanlış fakültenin verisini göstermektense hiçbir şey göstermek doğrudur.
 */

const metin = (v) => String(v == null ? '' : v).trim();
const anahtar = (v) => metin(v).toLocaleLowerCase('tr');

/**
 * Kullanıcının kapsamı.
 *
 * @param {object} girdi
 *   profil       — eşleşen akademisyen kaydı ({id, departmentId, bolum, fakulte}) ya da null
 *   departmentId — oturumdaki bölüm kimliği (bolum_yetkilisi JWT'sinde imzalı)
 *   dept         — bölüm yetkisi var mı
 *   faculty      — fakülte yetkisi var mı
 *   uni          — üniversite yetkilisi mi
 */
export function veriKapsami(girdi) {
  const g = girdi || {};
  const p = g.profil || null;
  // ⚠ BÖLÜM YETKİLİSİNİN BÖLÜMÜ GEZİNİLEN BÖLÜM DEĞİLDİR. Kenar çubuğunda
  // başka bir bölüme geçmek, o bölümün verisini görme yetkisi vermez;
  // kapsam kendi kaydından/oturumundan gelir.
  const bolum = metin((p && p.departmentId) || g.departmentId);
  return {
    kendi: metin(p && p.id),
    departmentId: bolum,
    bolumAdi: metin(p && p.bolum),
    fakulte: metin(p && p.fakulte),
    uni: !!g.uni,
    dept: !!g.dept,
    faculty: !!g.faculty,
  };
}

/** Fakülte kapsamı gerçekten çözülebildi mi? */
export function fakulteKapsamiCozuldu(kapsam) {
  const k = kapsam || {};
  return !!k.uni || !!metin(k.fakulte);
}

/** Bölüm kapsamı gerçekten çözülebildi mi? */
export function bolumKapsamiCozuldu(kapsam) {
  const k = kapsam || {};
  return !!k.uni || !!metin(k.departmentId);
}

/**
 * Bir görünümde gösterilecek akademisyenler.
 * `gorunum`: 'own' | 'dept' | 'faculty'
 *
 * Kapsam çözülemediyse BOŞ liste döner — "hepsi" değil.
 */
export function gorunurAkademisyenler(hepsi, kapsam, gorunum) {
  const liste = Array.isArray(hepsi) ? hepsi : [];
  const k = kapsam || {};
  const g = metin(gorunum);

  if (g === 'own') {
    return k.kendi ? liste.filter((a) => a && metin(a.id) === k.kendi) : [];
  }
  if (g === 'dept') {
    if (k.uni) return liste;
    if (!k.departmentId) return [];
    return liste.filter((a) => a && metin(a.departmentId) === k.departmentId);
  }
  if (g === 'faculty') {
    if (k.uni) return liste;
    if (!k.fakulte) return [];
    return liste.filter((a) => a && anahtar(a.fakulte) === anahtar(k.fakulte));
  }
  return [];
}

/**
 * Kullanıcının seçebileceği bölümler (fakülte görünümündeki kırılım).
 * Bölüm yetkilisi yalnız kendi bölümünü seçebilir.
 */
export function secilebilirBolumler(akademisyenler, kapsam) {
  const liste = Array.isArray(akademisyenler) ? akademisyenler : [];
  const k = kapsam || {};
  const bolumler = new Map();
  const ekle = (a) => {
    const id = metin(a.departmentId);
    const ad = metin(a.bolum);
    if (!id && !ad) return;
    const key = id || ad;
    if (!bolumler.has(key)) bolumler.set(key, { id, ad: ad || id });
  };

  if (k.uni) liste.forEach(ekle);
  else if (k.faculty && k.fakulte) {
    liste.filter((a) => anahtar(a.fakulte) === anahtar(k.fakulte)).forEach(ekle);
  } else if (k.dept && k.departmentId) {
    liste.filter((a) => metin(a.departmentId) === k.departmentId).forEach(ekle);
  }
  return [...bolumler.values()].sort((a, b) => a.ad.localeCompare(b.ad, 'tr'));
}

// ══════════════════════════════════════════════════════════════
// GÖNDERİM (bölüm → fakülte)
// ══════════════════════════════════════════════════════════════

/** Gönderim kaydının belge kimliği. */
export function gonderimAnahtari(bolumId, yil) {
  return 'bolum_' + metin(bolumId) + '_' + metin(yil);
}

/** Bu bölüm bu yıl için gönderdi mi? */
export function gonderimVarMi(gonderimler, bolumId, yil) {
  const a = gonderimAnahtari(bolumId, yil);
  return (Array.isArray(gonderimler) ? gonderimler : []).some(
    (g) =>
      g &&
      (metin(g.id) === a || (metin(g.bolumId) === metin(bolumId) && metin(g.yil) === metin(yil)))
  );
}

/** Bu bölümün gönderim kaydı (yoksa null). */
export function gonderimKaydi(gonderimler, bolumId, yil) {
  const a = gonderimAnahtari(bolumId, yil);
  return (
    (Array.isArray(gonderimler) ? gonderimler : []).find(
      (g) =>
        g &&
        (metin(g.id) === a || (metin(g.bolumId) === metin(bolumId) && metin(g.yil) === metin(yil)))
    ) || null
  );
}

/**
 * Fakülte toplamına GİREN akademisyenler.
 *
 * ⚠ Yalnız gönderim yapmış bölümlerin akademisyenleri. Gönderilmemiş bölüm
 * toplamdan tamamen düşer; "eksik veriyle toplam" diye bir şey yoktur.
 */
export function fakulteyeGirenAkademisyenler(akademisyenler, kapsam, gonderimler, yil) {
  return gorunurAkademisyenler(akademisyenler, kapsam, 'faculty').filter((a) =>
    gonderimVarMi(gonderimler, a.departmentId, yil)
  );
}

/**
 * Fakülte görünümünün gönderim durumu: hangi bölüm gönderdi, hangisi bekliyor.
 * Fakülte yetkilisi toplamın neyi kapsadığını görmeden ona güvenemez.
 */
export function gonderimDurumu(akademisyenler, kapsam, gonderimler, yil) {
  const bolumler = secilebilirBolumler(
    gorunurAkademisyenler(akademisyenler, kapsam, 'faculty'),
    Object.assign({}, kapsam, { dept: false })
  );
  const gonderen = [];
  const bekleyen = [];
  bolumler.forEach((b) => {
    const kayit = gonderimKaydi(gonderimler, b.id, yil);
    (kayit ? gonderen : bekleyen).push(Object.assign({}, b, { gonderim: kayit }));
  });
  return { toplam: bolumler.length, gonderen, bekleyen };
}

/** Fakülte ekranındaki tek cümlelik gönderim özeti. */
export function gonderimOzetMetni(durum) {
  const d = durum || { toplam: 0, gonderen: [], bekleyen: [] };
  if (d.toplam === 0) return 'Fakültenizde bölüm bulunamadı.';
  if (d.bekleyen.length === 0) return d.toplam + ' bölümün tamamı verilerini gönderdi.';
  if (d.gonderen.length === 0) {
    return 'Hiçbir bölüm henüz göndermedi; toplam boş görünür.';
  }
  return (
    d.gonderen.length +
    ' / ' +
    d.toplam +
    ' bölüm gönderdi. Toplama girmeyenler: ' +
    d.bekleyen.map((b) => b.ad).join(' · ')
  );
}

/** Kapsamın kullanıcıya gösterilecek açıklaması. */
export function kapsamOzetMetni(kapsam, gorunum) {
  const k = kapsam || {};
  const g = metin(gorunum);
  if (g === 'own') return 'Yalnız kendi girdiğiniz değerler.';
  if (g === 'dept') {
    if (k.uni) return 'Üniversite yetkilisi: seçtiğiniz bölüm.';
    if (!k.departmentId) return 'Bölümünüz çözülemedi; veri gösterilemiyor.';
    return 'Yalnız ' + (k.bolumAdi || 'kendi bölümünüz') + ' akademisyenlerinin değerleri.';
  }
  if (g === 'faculty') {
    if (k.uni) return 'Üniversite yetkilisi: tüm fakülteler.';
    if (!k.fakulte) return 'Fakülteniz çözülemedi; veri gösterilemiyor.';
    return 'Yalnız ' + k.fakulte + ' bölümlerinin GÖNDERDİĞİ değerler.';
  }
  return '';
}
