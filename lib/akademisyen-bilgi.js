/**
 * AKADEMİSYEN BİLGİLERİ — tek kayıt, iki ekran.
 *
 * ⚠ AYNI ALANLAR İKİ YERDE DÜZENLENİYOR:
 *   • Bölüm Yönetimi → Akademisyenler (bölüm yetkilisi, herkes için)
 *   • Benim Sayfam → akademisyen kartı (kişinin kendisi)
 *
 * İkisi de `professors` dokümanının AYNI alanlarını yazar: e-posta, dahili,
 * fotoğraf. Ayrı alan adları kullanılsaydı bölüm yetkilisinin girdiği dahili
 * ile akademisyenin kendi girdiği farklı iki değer olur, öğrenci hangisini
 * gördüğünü bilemezdi. Alan listesi bu yüzden tek yerde ve testli.
 *
 * ⚠ BU ALANLAR YETKİ TAŞIMAZ. isUniversityAdmin / isFacultyManager /
 * isDeptManager burada YOKTUR ve olmamalıdır: akademisyenin kendi kaydını
 * düzenleyebilmesi, kendini yetkili yapabilmesi anlamına gelmez (sunucu da
 * ayrıca engeller).
 */

const metin = (v) => String(v == null ? '' : v).trim();

/** Kişinin kendi düzenleyebileceği alanlar — sıraları ekrandaki sıradır. */
export const BILGI_ALANLARI = [
  {
    anahtar: 'email',
    etiket: 'E-posta',
    tur: 'eposta',
    ipucu: 'ad.soyad@karatekin.edu.tr',
    aciklama: 'Öğrenciler danışman bilgilerinde bu adresi görür.',
  },
  {
    anahtar: 'dahili',
    etiket: 'Dahili',
    tur: 'dahili',
    ipucu: '1234',
    aciklama: 'Kurum santralindeki dahili numaranız.',
  },
  {
    anahtar: 'photoURL',
    etiket: 'Fotoğraf',
    tur: 'gorsel',
    ipucu: '',
    aciklama: 'Öğrencinin gördüğü danışman fotoğrafı.',
  },
];

/** Alan tanımını anahtarından bulur. */
export function alanBul(anahtar) {
  return BILGI_ALANLARI.find((a) => a.anahtar === metin(anahtar)) || null;
}

/**
 * Alan hatası; hata yoksa ''.
 * Hiçbir alan ZORUNLU değildir: boş bırakmak hata sayılmaz — kayıt eksik
 * olabilir, yanlış olmamalıdır.
 */
export function alanHatasi(alanVeyaAnahtar, deger) {
  const a = typeof alanVeyaAnahtar === 'string' ? alanBul(alanVeyaAnahtar) : alanVeyaAnahtar;
  const v = metin(deger);
  if (!a || !v) return '';
  if (a.tur === 'eposta') {
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v) ? '' : 'Geçerli bir e-posta adresi yazın.';
  }
  if (a.tur === 'dahili') {
    if (!/^[0-9\s-]+$/.test(v)) return 'Dahili yalnız rakamlardan oluşur.';
    const rakam = v.replace(/\D/g, '');
    if (rakam.length < 3 || rakam.length > 6) return 'Dahili 3–6 haneli olmalı.';
    return '';
  }
  return '';
}

/** Yazarken uygulanan süzgeç (dahiliye harf yazılmasın). */
export function alanSuzgeci(anahtar, deger) {
  const a = alanBul(anahtar);
  const v = String(deger == null ? '' : deger);
  if (a && a.tur === 'dahili') return v.replace(/[^0-9\s-]/g, '').slice(0, 12);
  return v;
}

/** Kayda yazılacak temiz nesne — bilinmeyen alan geçmez, boşlar kırpılır. */
export function bilgiNormalle(ham) {
  const g = ham || {};
  const cikti = {};
  BILGI_ALANLARI.forEach((a) => {
    const v = metin(g[a.anahtar]);
    if (v) cikti[a.anahtar] = v;
  });
  return cikti;
}

/** Alan → hata eşlemesi; hatasızsa boş nesne. */
export function bilgiHatalari(ham) {
  const g = ham || {};
  const h = {};
  BILGI_ALANLARI.forEach((a) => {
    const e = alanHatasi(a, g[a.anahtar]);
    if (e) h[a.anahtar] = e;
  });
  return h;
}

/** Form kaydedilmeye değer mi (bir şey değişti mi)? */
export function bilgiDegisti(form, kayit) {
  const f = bilgiNormalle(form);
  const k = bilgiNormalle(kayit);
  return BILGI_ALANLARI.some((a) => (f[a.anahtar] || '') !== (k[a.anahtar] || ''));
}

/** Kartın altındaki tek cümlelik durum. */
export function bilgiOzetMetni(kayit) {
  const k = bilgiNormalle(kayit);
  const eksik = BILGI_ALANLARI.filter((a) => !k[a.anahtar]);
  if (eksik.length === 0) return 'Bilgileriniz tam.';
  if (eksik.length === BILGI_ALANLARI.length) {
    return 'Bilgileriniz girilmemiş — öğrenciler size ulaşamaz.';
  }
  return 'Eksik: ' + eksik.map((a) => a.etiket).join(' · ');
}
