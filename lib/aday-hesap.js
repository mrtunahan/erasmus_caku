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
      'hesabınız kapanır. Kayıt yaptırmazsanız verileriniz ilgili mevzuatın öngördüğü süre ' +
      'sonunda silinir veya anonim hâle getirilir.',
    'KVKK m.11 kapsamındaki haklarınız için başvurduğunuz bölüme yazılı olarak başvurabilirsiniz.',
  ];
}
