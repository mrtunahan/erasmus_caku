// ══════════════════════════════════════════════════════════════
// HATA / ÖNERİ BİLDİRİMİ — KURALLAR (saf; okuma/yazma routes/geri-bildirim.js)
//
// Akış:
//   1) Giriş yapmış herkes (öğrenci, akademisyen, memur, bölüm yetkilisi) bir
//      modül seçip bildirim gönderir. Gönderenin BÖLÜMÜNÜ sunucu bulur.
//   2) Kayıt o bölümün FAKÜLTE yetkilisine düşer (hedef: 'fakulte'). Fakülte
//      yetkilisi yoksa ya da gönderen zaten fakülte yetkilisiyse üniversite
//      yetkilisine (hedef: 'universite').
//   3) Fakülte / üniversite yetkilisi yanıtlar, durum değiştirir ya da kaydı
//      kendi alanındaki bir BÖLÜMÜN yetkilisine yönlendirir.
//   4) Bölüm yetkilisi yalnız kendisine yönlendirilenleri görür; yanıtlar ve
//      durumunu değiştirir, başka yere yönlendiremez.
//   5) Gönderen kendi kayıtlarını ve yazışmayı görür, cevap yazabilir.
//
// Yetki alanı (alan) routes/db.js → kullaniciAlani(db, user, false) çıktısıdır:
//   { tur: 'universite'|'fakulte'|'bolum'|'yok', bolumler: Set }
// ══════════════════════════════════════════════════════════════

const metin = (v) => String(v == null ? '' : v).trim();

const TURLER = { hata: 'Hata', oneri: 'Öneri', soru: 'Soru' };
const DURUMLAR = {
  yeni: 'Yeni',
  incelemede: 'İnceleniyor',
  yonlendirildi: 'Bölüme yönlendirildi',
  cozuldu: 'Çözüldü',
  kapatildi: 'Kapatıldı',
};
// Yetkilinin elle seçebileceği durumlar ('yeni' ve 'yonlendirildi' sistemin).
const ELLE_DURUMLAR = ['incelemede', 'cozuldu', 'kapatildi'];
const SINIR = { konu: 150, metin: 4000, mesaj: 3000, gunluk: 10, modul: 60 };

/**
 * İstemciden gelen yeni bildirimi temizler.
 * @returns {{hata?:string, veri?:object}}
 */
function girdiTemizle(govde) {
  const g = govde && typeof govde === 'object' ? govde : {};
  const tur = metin(g.tur);
  if (!TURLER[tur]) return { hata: 'Bildirim türünü seçin.' };
  const modul = metin(g.modul).slice(0, SINIR.modul);
  if (!modul) return { hata: 'Sorunun yaşandığı modülü seçin.' };
  const konu = metin(g.konu).replace(/\s+/g, ' ');
  if (konu.length < 3) return { hata: 'Kısa bir konu yazın.' };
  if (konu.length > SINIR.konu)
    return { hata: 'Konu en çok ' + SINIR.konu + ' karakter olabilir.' };
  const aciklama = metin(g.metin);
  if (aciklama.length < 10) return { hata: 'Sorunu ya da önerinizi biraz daha açıklayın.' };
  if (aciklama.length > SINIR.metin) {
    return { hata: 'Açıklama en çok ' + SINIR.metin + ' karakter olabilir.' };
  }
  return {
    veri: {
      tur,
      modul,
      modulAd: metin(g.modulAd).slice(0, 80) || modul,
      konu,
      metin: aciklama,
      // Hata ayıklamaya yardımcı bağlam: hangi ekranda, hangi tarayıcıda.
      sayfa: metin(g.sayfa).slice(0, 120),
      tarayici: metin(g.tarayici).slice(0, 300),
    },
  };
}

/** Mesaj metni (yanıt / ek bilgi). */
function mesajTemizle(v) {
  const m = metin(v);
  if (m.length < 2) return { hata: 'Mesaj boş olamaz.' };
  if (m.length > SINIR.mesaj)
    return { hata: 'Mesaj en çok ' + SINIR.mesaj + ' karakter olabilir.' };
  return { metin: m };
}

/** Kişinin bu kaydın göndereni olup olmadığı. */
function gonderenMi(kayit, kim) {
  const g = (kayit && kayit.gonderen) || {};
  return !!kim && metin(g.kimlik) === metin(kim.kimlik) && metin(g.rol) === metin(kim.rol);
}

const alanda = (alan, bolum) =>
  !!alan && !!bolum && alan.bolumler && alan.bolumler.has(metin(bolum));

/**
 * Yetkili olarak bu kaydı görebilir mi? (gönderen olarak görmek ayrı)
 * @returns {'universite'|'fakulte'|'bolum'|''}  hangi sıfatla
 */
function yetkiliSifati(kayit, alan) {
  if (!kayit || !alan) return '';
  if (alan.tur === 'universite') return 'universite';
  if (alan.tur === 'fakulte' && kayit.hedef === 'fakulte' && alanda(alan, kayit.bolumId)) {
    return 'fakulte';
  }
  // Bölüm yetkilisi: yalnız kendisine yönlendirilen. (Fakülte yetkilisi de
  // kendi bölümüne yönlendirilmiş bir kaydı zaten fakülte sıfatıyla görür.)
  if ((alan.tur === 'bolum' || alan.tur === 'fakulte') && alanda(alan, kayit.yonlendirilenBolum)) {
    return 'bolum';
  }
  return '';
}

/** Görme kararı: gönderen ya da yetkili. */
function gorebilirMi(kayit, kim, alan) {
  return gonderenMi(kayit, kim) || !!yetkiliSifati(kayit, alan);
}

/** Durum değiştirme: yalnız yetkili; seçilebilir durumlar sınırlı. */
function durumKarari(kayit, alan, yeniDurum) {
  if (!yetkiliSifati(kayit, alan)) return { izin: false, hata: 'Bu kayıtta yetkiniz yok.' };
  if (!ELLE_DURUMLAR.includes(metin(yeniDurum))) return { izin: false, hata: 'Geçersiz durum.' };
  return { izin: true };
}

/**
 * Yönlendirme: fakülte / üniversite yetkilisi, kendi alanındaki bir bölüme.
 * Bölüm yetkilisi yönlendiremez (kayıt ona zaten yönlendirilmiştir).
 */
function yonlendirmeKarari(kayit, alan, hedefBolum) {
  const sifat = yetkiliSifati(kayit, alan);
  if (sifat !== 'universite' && sifat !== 'fakulte') {
    return { izin: false, hata: 'Yalnız fakülte ya da üniversite yetkilisi yönlendirebilir.' };
  }
  const b = metin(hedefBolum);
  if (!b) return { izin: false, hata: 'Yönlendirilecek bölümü seçin.' };
  if (sifat === 'fakulte' && !alanda(alan, b)) {
    return { izin: false, hata: 'Yalnız fakültenizdeki bir bölüme yönlendirebilirsiniz.' };
  }
  if (['cozuldu', 'kapatildi'].includes(metin(kayit.durum))) {
    return { izin: false, hata: 'Kapanmış kayıt yönlendirilemez; önce yeniden açın.' };
  }
  return { izin: true };
}

/** Mesaj yazma: gönderen (kayıt kapanmamışsa) ya da yetkili. */
function mesajKarari(kayit, kim, alan) {
  if (yetkiliSifati(kayit, alan)) return { izin: true, rol: 'yetkili' };
  if (gonderenMi(kayit, kim)) {
    if (metin(kayit.durum) === 'kapatildi') {
      return { izin: false, hata: 'Kayıt kapatıldı; yeni bir bildirim açabilirsiniz.' };
    }
    return { izin: true, rol: 'gonderen' };
  }
  return { izin: false, hata: 'Bu kayıtta yetkiniz yok.' };
}

/** İstemciye giden hâl. Gönderen iç notları, sayfa/tarayıcı ve geçmişi görmez. */
function gorunum(kayit, kim, alan) {
  const sifat = yetkiliSifati(kayit, alan);
  const k = kayit || {};
  return {
    id: metin(k._id),
    tur: k.tur,
    turAd: TURLER[k.tur] || k.tur,
    modul: k.modul,
    modulAd: k.modulAd,
    konu: k.konu,
    metin: k.metin,
    sayfa: sifat ? k.sayfa : undefined,
    tarayici: sifat ? k.tarayici : undefined,
    gonderen: k.gonderen,
    bolumId: k.bolumId,
    bolumAd: k.bolumAd,
    hedef: k.hedef,
    durum: k.durum,
    durumAd: DURUMLAR[k.durum] || k.durum,
    yonlendirilenBolum: k.yonlendirilenBolum || '',
    yonlendirilenBolumAd: k.yonlendirilenBolumAd || '',
    // Yönlendirme notu yetkililer arasıdır; gönderen görmez.
    mesajlar: (Array.isArray(k.mesajlar) ? k.mesajlar : []).filter((m) => sifat || !m.ic),
    gecmis: sifat ? (Array.isArray(k.gecmis) ? k.gecmis : []) : undefined,
    olusturuldu: k.olusturuldu,
    guncellendi: k.guncellendi,
    benim: gonderenMi(k, kim),
    sifat,
    yonlendirebilir: sifat === 'universite' || sifat === 'fakulte',
  };
}

module.exports = {
  TURLER,
  DURUMLAR,
  ELLE_DURUMLAR,
  SINIR,
  girdiTemizle,
  mesajTemizle,
  gonderenMi,
  yetkiliSifati,
  gorebilirMi,
  durumKarari,
  yonlendirmeKarari,
  mesajKarari,
  gorunum,
};
