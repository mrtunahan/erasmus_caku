// ══════════════════════════════════════════════════════════════
// ADAY HESABI — öğrenci numarası olmadan sisteme giren başvuran
//
// Dikey geçiş, kurumlararası (yurt içi) yatay geçiş ve merkezi yerleştirme
// puanıyla (Ek Madde 1) yatay geçiş adayının başvuru sırasında öğrenci
// numarası YOKTUR; numara kesin kayıtta verilir. Bu adaylar önceden sisteme
// hiç giremiyor, işlemlerini akademisyen onların adına yürütüyordu.
//
// Aday artık kendi hesabını açar: T.C. kimlik no + şifre ile girer, sistem
// ona geçici aday numarası verir ("ADAY-2026-0007", bkz. lib/aday-kimlik.js).
// Aday ÖĞRENCİ DEĞİLDİR: yalnız başvurduğu türlerin modüllerini görür.
// Yetki sunucuda: server/lib/aday-yetki.js.
//
// Bu dosya istemci ile sunucunun ORTAK kuralıdır (form denetimi aynı).
// ══════════════════════════════════════════════════════════════

import { tcKimlikGecerliMi } from './tto-talep.js';

const metin = (v) => String(v == null ? '' : v).trim();

/**
 * Adayın seçebileceği başvuru türleri ve her birinin bağlı olduğu modül.
 * Kurum içi yatay geçiş BURADA YOK: o öğrencinin zaten numarası vardır.
 */
export const ADAY_TURLERI = [
  {
    id: 'dikey',
    ad: 'Dikey Geçiş',
    aciklama: 'DGS ile yerleşen aday — ders muafiyet ve intibak talebi',
    modul: 'dikeygecis',
  },
  {
    id: 'kurumlararasi',
    ad: 'Kurumlararası (Yurt İçi) Yatay Geçiş',
    aciklama: 'Başka bir üniversiteden başarı düzeyi ile geçiş',
    modul: 'yataygecis',
  },
  {
    id: 'merkezi',
    ad: 'Merkezi Yerleştirme Puanı ile Yatay Geçiş (Ek Madde 1)',
    aciklama: 'Yerleştiği yılın puanıyla geçiş',
    modul: 'yataygecis',
  },
];
export const ADAY_TUR_IDLERI = ADAY_TURLERI.map((t) => t.id);

/** Adayın türlerinden açılacak modüller (sırası korunur, tekrarsız). */
export function adayModulleri(turler) {
  const secili = new Set((Array.isArray(turler) ? turler : []).map(metin));
  const out = [];
  ADAY_TURLERI.forEach((t) => {
    if (secili.has(t.id) && !out.includes(t.modul)) out.push(t.modul);
  });
  return out;
}

/** Yatay geçiş modülünde adayın görebileceği türler. */
export function adayYatayTurleri(turler) {
  const secili = new Set((Array.isArray(turler) ? turler : []).map(metin));
  return ['kurumlararasi', 'merkezi'].filter((t) => secili.has(t));
}

/**
 * ── NUMARALI ÖĞRENCİ ve ADAY TÜRLERİ ──
 * Dikey geçiş, kurumlararası ve merkezi yerleştirme puanıyla yatay geçiş
 * başvurusunu yapan kişinin henüz öğrenci numarası yoktur; bu başvurular
 * YALNIZ aday hesabından açılır. Numaralı öğrenci bu türleri görmez ve yeni
 * başvuru açamaz.
 *
 * İSTİSNA: kesin kaydı yapılıp başvurusu numarasına aktarılan öğrenci
 * (numara-aktar) kendi eski başvurusunun sonucunu görmeye devam eder —
 * yalnız GÖRÜR, yenisini açamaz. `kendiKayitlari` bu yüzden verilir.
 */
export const ADAY_YATAY_TUR_IDLERI = ['kurumlararasi', 'merkezi'];

/** Numaralı öğrencinin yatay geçişte göreceği türler: kurum içi + aktarılmış kayıtlarının türleri. */
export function ogrenciYatayTurleri(kendiKayitlari) {
  const var_ = new Set(
    (Array.isArray(kendiKayitlari) ? kendiKayitlari : []).map((r) => metin(r && r.turu))
  );
  return ['kurumici'].concat(ADAY_YATAY_TUR_IDLERI.filter((t) => var_.has(t)));
}

/** Numaralı öğrenci bu yatay geçiş türünde YENİ başvuru açabilir mi? */
export function ogrenciYatayYeniBasvuruAcabilirMi(tur) {
  return !ADAY_YATAY_TUR_IDLERI.includes(metin(tur) || 'kurumici');
}

/** Numaralı öğrencinin menüsünde Dikey Geçiş: yalnız aktarılmış dikey kaydı varsa (salt görüntüleme). */
export function ogrenciDikeyKaydiVarMi(kendiKayitlari) {
  return (Array.isArray(kendiKayitlari) ? kendiKayitlari : []).some(
    (r) => metin(r && r.basvuruTuru) === 'dikey'
  );
}

const EPOSTA = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
const GSM = /^5\d{9}$/;
const AD = /^[\p{L}][\p{L}\p{M} .'-]{0,59}$/u;

export function telefonSadele(v) {
  return metin(v)
    .replace(/[\s()-]/g, '')
    .replace(/^\+?90/, '')
    .replace(/^0/, '');
}

/** T.C. kimlik no: 11 hane + resmî denetim algoritması. */
export function adayTcGecerliMi(tc) {
  return tcKimlikGecerliMi(metin(tc));
}

/** Ekranda gösterim: 123******78 */
export function tcMaskele(tc) {
  const s = metin(tc);
  if (s.length !== 11) return s ? '***' : '';
  return s.slice(0, 3) + '******' + s.slice(9);
}

export const ADAY_SIFRE_EN_AZ = 8;

/**
 * Kayıt formunun alan hataları. Boş nesne = geçerli.
 * @param {object} f { ad, soyad, tc, eposta, telefon, turler, departmentId, sifre, sifre2, kvkk }
 * @returns {Object<string,string>}
 */
export function adayKayitHatalari(f) {
  const o = f || {};
  const h = {};
  if (!AD.test(metin(o.ad))) h.ad = 'Adınızı girin.';
  if (!AD.test(metin(o.soyad))) h.soyad = 'Soyadınızı girin.';
  if (!adayTcGecerliMi(o.tc)) h.tc = 'Geçerli bir T.C. kimlik numarası girin (11 hane).';
  if (!EPOSTA.test(metin(o.eposta))) h.eposta = 'Geçerli bir e-posta adresi girin.';
  if (!GSM.test(telefonSadele(o.telefon))) {
    h.telefon = 'Cep telefonu 5 ile başlayan 10 hane olmalı (ör. 5321234567).';
  }
  const turler = (Array.isArray(o.turler) ? o.turler : []).map(metin);
  if (turler.length === 0) h.turler = 'En az bir başvuru türü seçin.';
  else if (turler.some((t) => !ADAY_TUR_IDLERI.includes(t))) h.turler = 'Geçersiz başvuru türü.';
  if (!metin(o.departmentId)) h.departmentId = 'Başvurduğunuz bölümü seçin.';
  const sifre = String(o.sifre == null ? '' : o.sifre);
  if (sifre.length < ADAY_SIFRE_EN_AZ) {
    h.sifre = 'Şifre en az ' + ADAY_SIFRE_EN_AZ + ' karakter olmalı.';
  } else if (!/\d/.test(sifre) || !/\p{L}/u.test(sifre)) {
    h.sifre = 'Şifre harf ve rakam içermeli.';
  }
  if (o.sifre2 !== undefined && String(o.sifre2) !== sifre) h.sifre2 = 'Şifreler aynı değil.';
  if (o.kvkk !== undefined && o.kvkk !== true) h.kvkk = 'Aydınlatma metnini okuduğunuzu onaylayın.';
  return h;
}

/** Sunucuya giden kaydı tek biçime getirir (fazla alan atılır). */
export function adayKaydiSadele(f) {
  const o = f || {};
  const turler = [...new Set((Array.isArray(o.turler) ? o.turler : []).map(metin))].filter((t) =>
    ADAY_TUR_IDLERI.includes(t)
  );
  return {
    ad: metin(o.ad),
    soyad: metin(o.soyad),
    tc: metin(o.tc),
    eposta: metin(o.eposta).toLowerCase(),
    telefon: telefonSadele(o.telefon),
    turler,
    departmentId: metin(o.departmentId),
  };
}

/** Aday aydınlatma metni sürümü — metin değişince artırılır. */
export const ADAY_KVKK_SURUM = 'aday-2026-01';

export function adayAydinlatmaMetni(kurum) {
  const k = metin(kurum) || 'Üniversitemiz';
  return [
    k +
      ', geçiş başvurunuzu değerlendirmek amacıyla aşağıdaki kişisel verilerinizi işler: ' +
      'ad-soyad, T.C. kimlik numarası, iletişim bilgileri, başvuru beyanlarınız ve ' +
      'yüklediğiniz belgeler (transkript, yerleştirme belgesi, ders içerikleri vb.).',
    'Verileriniz yalnız başvurduğunuz bölümün yetkilileri ve başvuruyu değerlendiren ' +
      'kurullarca görülür; 2547 sayılı Kanun ve Yükseköğretim Kurumlarında Önlisans ve ' +
      'Lisans Düzeyindeki Programlar Arasında Geçiş Yönetmeliği kapsamında işlenir.',
    'T.C. kimlik numaranız yalnız kimliğinizi eşleştirmek (mükerrer hesabı önlemek ve kesin ' +
      'kayıtta öğrenci numaranıza aktarmak) için kullanılır ve ekranlarda maskeli gösterilir.',
    'Kesin kayıt yaptırdığınızda başvuru kayıtlarınız öğrenci numaranıza aktarılır ve aday ' +
      'hesabınız kapanır. Kayıt yaptırmazsanız (başvurunuz sonuçlanıp kazanamadıysanız ya da ' +
      'hesabınız kapatıldıysa) hesabınız, başvurularınız ve yüklediğiniz belgeler başvuru ' +
      'döneminin bitişinden (hesap kapatıldıysa kapatma tarihinden) ' +
      ADAY_SAKLAMA_GUN +
      ' gün sonra otomatik olarak silinir.',
    'Hesabınıza bağladığınız e-posta adresi, doğrulama kodu ve şifre yenileme iletileri için ' +
      'e-posta gönderim hizmeti sağlayıcısına (sunucuları İrlanda’da, Resend) veri işleyen ' +
      'sıfatıyla aktarılır.',
    'KVKK m.11 kapsamındaki haklarınız için başvurduğunuz bölüme yazılı olarak başvurabilirsiniz.',
  ];
}

// ══════════════════════════════════════════════════════════════
// BAŞVURU DÖNEMLERİ — fakülte yetkilisi tür başına tarih aralığı belirler
//
// Dönem dışında kayıt ve başvuru ALANI KAPANMAZ (kurul gecikmeli başvuru
// kabul edebilir); aday "başvuru tarihleri uygun değildir" uyarısı görür.
// Kayıt: aday_basvuru_donemleri/{facultyId} → { donemler: { tür: {baslangic, bitis} } }
// ══════════════════════════════════════════════════════════════

const TARIH = /^\d{4}-\d{2}-\d{2}$/;

/** Türkiye saatine göre bugünün tarihi (YYYY-AA-GG). */
export function bugunTr(simdi) {
  const t = simdi instanceof Date ? simdi : new Date(simdi || Date.now());
  return new Date(t.getTime() + 3 * 3600 * 1000).toISOString().slice(0, 10);
}

/**
 * Tek türün dönem durumu.
 * @returns {'tanimsiz'|'once'|'acik'|'bitti'}
 */
export function donemDurumu(donem, bugun) {
  const b = metin(donem && donem.baslangic);
  const e = metin(donem && donem.bitis);
  if (!TARIH.test(b) || !TARIH.test(e)) return 'tanimsiz';
  const g = metin(bugun) || bugunTr();
  if (g < b) return 'once';
  if (g > e) return 'bitti';
  return 'acik';
}

const trTarih = (iso) => metin(iso).split('-').reverse().join('.');

/**
 * Seçilen türler için dönem uyarıları (boş dizi = uyarı yok).
 * Tarih tanımlanmamış tür uyarı üretmez: alan açık durur.
 */
export function donemUyarilari(turler, donemler, bugun) {
  const d = (donemler && typeof donemler === 'object' && donemler) || {};
  const out = [];
  (Array.isArray(turler) ? turler : []).forEach((id) => {
    const tur = ADAY_TURLERI.find((t) => t.id === id);
    if (!tur) return;
    const durum = donemDurumu(d[id], bugun);
    if (durum === 'once' || durum === 'bitti') {
      out.push({
        tur: id,
        durum,
        mesaj:
          tur.ad +
          ': başvuru tarihleri uygun değildir (' +
          (durum === 'once'
            ? 'başvurular ' + trTarih(d[id].baslangic) + ' tarihinde başlar'
            : 'başvurular ' + trTarih(d[id].bitis) + ' tarihinde sona erdi') +
          ').',
      });
    }
  });
  return out;
}

/** Fakülte yetkilisinin girdiği dönem kaydının hataları. */
export function donemHatalari(donemler) {
  const h = {};
  const d = (donemler && typeof donemler === 'object' && donemler) || {};
  Object.keys(d).forEach((id) => {
    if (!ADAY_TUR_IDLERI.includes(id)) {
      h[id] = 'Geçersiz başvuru türü.';
      return;
    }
    const b = metin(d[id] && d[id].baslangic);
    const e = metin(d[id] && d[id].bitis);
    if (!b && !e) return; // tanımsız bırakılabilir
    if (!TARIH.test(b) || !TARIH.test(e)) h[id] = 'Başlangıç ve bitiş tarihini birlikte girin.';
    else if (e < b) h[id] = 'Bitiş tarihi başlangıçtan önce olamaz.';
  });
  return h;
}

/** Kayda yazılacak temiz dönem nesnesi (yalnız bilinen türler, ikisi dolu). */
export function donemleriSadele(donemler) {
  const d = (donemler && typeof donemler === 'object' && donemler) || {};
  const out = {};
  ADAY_TUR_IDLERI.forEach((id) => {
    const b = metin(d[id] && d[id].baslangic);
    const e = metin(d[id] && d[id].bitis);
    if (TARIH.test(b) && TARIH.test(e) && e >= b) out[id] = { baslangic: b, bitis: e };
  });
  return out;
}

// ══════════════════════════════════════════════════════════════
// OTOMATİK SİLME — kazanamayan / kayıt yaptırmayan adayın verisi
//
// Silme tarihi = referans + ADAY_SAKLAMA_GUN gün. Referans:
//   • hesap yetkilice KAPATILDIYSA → kapatma tarihi;
//   • değilse → adayın türleri için, başvurduğu bölümlerin fakültelerindeki
//     dönemlerin EN GEÇ bitiş tarihi.
// Silinmeyenler (null döner, sebebi söylenir):
//   • numarasına aktarılmış aday (veri artık öğrencinin);
//   • değerlendirmesi süren başvurusu olan aday — sonuç çıkmadan silmek
//     başvuruyu kurulun elinden almak olurdu;
//   • asil/yedek kazanmış aday ya da muafiyeti onaylanmış dikey geçiş adayı
//     (kesin kayıt / aktarım bekleniyor);
//   • türlerinden birinin dönemi tanımlanmamış aday (bitiş bilinmiyor).
// ══════════════════════════════════════════════════════════════
export const ADAY_SAKLAMA_GUN = 30;

const gunEkle = (iso, gun) => {
  const t = new Date(metin(iso).slice(0, 10) + 'T00:00:00Z');
  if (isNaN(t.getTime())) return '';
  return new Date(t.getTime() + gun * 86400000).toISOString().slice(0, 10);
};

/**
 * @param {object} aday     { durum, turler, kapatmaZamani }
 * @param {object} baglam   { donemler: [ {tur:{baslangic,bitis}} ...] (adayın fakültelerinin),
 *                            yatay: [...başvurular], dikey: [...muafiyet kayıtları] }
 * @returns {{ tarih: string|null, sebep: string }}
 */
export function adaySilmeTarihi(aday, baglam) {
  const a = aday || {};
  const b = baglam || {};
  if (a.durum === 'aktarildi') return { tarih: null, sebep: 'Öğrenci numarasına aktarıldı.' };
  if (a.durum === 'kapali') {
    const k = metin(a.kapatmaZamani).slice(0, 10);
    if (!TARIH.test(k)) return { tarih: null, sebep: 'Kapatma tarihi bilinmiyor.' };
    return { tarih: gunEkle(k, ADAY_SAKLAMA_GUN), sebep: 'Hesap kapatıldı.' };
  }
  const yatay = Array.isArray(b.yatay) ? b.yatay : [];
  const dikey = Array.isArray(b.dikey) ? b.dikey : [];
  if (yatay.some((r) => /^uygun_(asil|yedek)$/.test(metin(r.degerlendirme)))) {
    return { tarih: null, sebep: 'Asil/yedek kazandı; kesin kayıt bekleniyor.' };
  }
  // Dikey geçiş adayı ÖSYM ile yerleşmiştir; onaylanan muafiyeti kesin
  // kayıtta öğrenci numarasına taşınacak veridir — kendiliğinden silinmez.
  if (dikey.some((r) => Number(r.approvedCount) > 0)) {
    return { tarih: null, sebep: 'Onaylanan muafiyet var; numaraya aktarılmayı bekliyor.' };
  }
  if (
    yatay.some((r) => !metin(r.degerlendirme)) ||
    dikey.some((r) => Number(r.pendingReviewCount) > 0)
  ) {
    return { tarih: null, sebep: 'Değerlendirmesi süren başvuru var.' };
  }
  const donemler = Array.isArray(b.donemler) ? b.donemler : [];
  let enGec = '';
  for (const tur of Array.isArray(a.turler) ? a.turler : []) {
    const bitisler = donemler
      .map((d) => d && d[tur])
      .filter((d) => donemDurumu(d) !== 'tanimsiz')
      .map((d) => d.bitis);
    if (bitisler.length === 0) {
      return { tarih: null, sebep: 'Başvuru dönemi tanımlanmamış; otomatik silinmez.' };
    }
    bitisler.forEach((x) => {
      if (x > enGec) enGec = x;
    });
  }
  if (!enGec) return { tarih: null, sebep: 'Başvuru türü yok.' };
  return { tarih: gunEkle(enGec, ADAY_SAKLAMA_GUN), sebep: 'Başvuru dönemi bitti.' };
}

/** Bugün itibarıyla silinmeli mi? */
export function adaySilinmeliMi(aday, baglam, bugun) {
  const { tarih } = adaySilmeTarihi(aday, baglam);
  return !!tarih && (metin(bugun) || bugunTr()) >= tarih;
}
