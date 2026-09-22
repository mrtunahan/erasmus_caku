/**
 * RANDEVU & DANIŞMAN GÖRÜŞME SİSTEMİ (Office Hours) — kural dosyası.
 *
 * Akademisyenin haftalık ders programı zaten sistemde duruyor. Görüşme
 * saatleri bu programın ÜSTÜNE işaretlenir: hoca boş bir saate tıklar,
 * o saat "görüşmeye açık" olur. Öğrenci kendi aldığı derslerin
 * akademisyenlerinin programını görür ve açık saatlerden birine randevu
 * ister.
 *
 * ⚠ DERS SAATİ GÖRÜŞMEYE AÇILAMAZ. Hoca yanlışlıkla ders saatini işaretlese
 * bile o slot öğrenciye kapalı görünür: açık saat listesi her zaman güncel
 * ders programıyla kesiştirilir. Ders programı sonradan değişip bir saat
 * dolduğunda, o saate verilmiş randevu da "çakışmalı" diye işaretlenir —
 * sessizce kaybolmaz, hoca görür ve karar verir.
 *
 * ⚠ RANDEVU BİR SLOTA DEĞİL, BİR TARİHE VERİLİR. "Salı 13:15" haftanın her
 * salısıdır; kayıt tarihsiz tutulsaydı geçen haftanın randevusu bu hafta da
 * görünürdü.
 */

import { birlesikEksen } from './ders-saatleri.js';

const metin = (v) => String(v == null ? '' : v).trim();

export const GUNLER = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma'];

export const RANDEVU_DURUMLARI = {
  bekliyor: { etiket: 'Bekliyor', renk: '#B45309', bg: '#FFFBEB', kenar: '#FCD34D' },
  onaylandi: { etiket: 'Onaylandı', renk: '#047857', bg: '#ECFDF5', kenar: '#6EE7B7' },
  reddedildi: { etiket: 'Reddedildi', renk: '#B91C1C', bg: '#FEF2F2', kenar: '#FCA5A5' },
  iptal: { etiket: 'İptal edildi', renk: '#6B7280', bg: '#F9FAFB', kenar: '#E5E7EB' },
};

/** Açık durumlar — slotu meşgul eden randevular. */
export const MESGUL_DURUMLAR = ['bekliyor', 'onaylandi'];

/**
 * Akademisyen adından belge kimliği üretir.
 *
 * Görüşme saatleri kişi başına tek belgede durur; belge kimliği adın
 * kendisi olamaz (boşluk, nokta, Türkçe harf). Unvan da ayıklanır: aynı kişi
 * bir yerde "Dr. Öğr. Üyesi Ayşe İnan", başka yerde "Ayşe İnan" yazıyorsa
 * iki ayrı belge açılır ve hocanın saatleri ikiye bölünürdü.
 */
export function akademisyenAnahtari(ad) {
  const harita = { ç: 'c', ğ: 'g', ı: 'i', ö: 'o', ş: 's', ü: 'u', â: 'a', î: 'i', û: 'u' };
  return metin(ad)
    .replace(/(prof\.?|doç\.?|dr\.?|öğr\.?|gör\.?|arş\.?|üyesi)/gi, ' ')
    .toLocaleLowerCase('tr')
    .replace(/[çğıöşüâîû]/g, (c) => harita[c] || c)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Haftalık slotun anahtarı. */
export function slotAnahtari(gun, saat) {
  return metin(gun) + '|' + metin(saat);
}

/** Anahtarı gün ve saate ayırır. */
export function anahtarCoz(anahtar) {
  const p = metin(anahtar).split('|');
  if (p.length !== 2 || !p[0] || !p[1]) return null;
  return { gun: p[0], saat: p[1] };
}

/**
 * Programın bir saatinde ders var mı?
 * Izgara `{ gun: { saat: [kayit, ...] } }` biçimindedir (bkz.
 * lib/akademisyen-programi.js).
 */
export function derstesMi(izgara, gun, saat) {
  const g = (izgara || {})[gun];
  if (!g) return false;
  const liste = g[saat];
  return Array.isArray(liste) && liste.length > 0;
}

/**
 * Akademisyenin haftalık görüşme ızgarası: her hücrenin ne olduğu.
 *
 * `durum`:
 *   'ders'   → o saatte dersi var, görüşmeye açılamaz
 *   'acik'   → görüşmeye açık işaretlenmiş
 *   'bos'    → boş, işaretlenmemiş
 */
export function gorusmeIzgarasi(izgara, saatler, musaitlikler) {
  const acik = new Set(
    (Array.isArray(musaitlikler) ? musaitlikler : []).map((m) =>
      typeof m === 'string' ? m : slotAnahtari(m && m.gun, m && m.saat)
    )
  );
  const satirlar = (Array.isArray(saatler) ? saatler : []).map((saat) => ({
    saat,
    hucreler: GUNLER.map((gun) => {
      const anahtar = slotAnahtari(gun, saat);
      const ders = derstesMi(izgara, gun, saat);
      return {
        gun,
        saat,
        anahtar,
        // Ders saati her zaman kazanır: yanlışlıkla işaretlenmiş olsa bile
        // öğrenciye açık görünmez.
        durum: ders ? 'ders' : acik.has(anahtar) ? 'acik' : 'bos',
        dersler: ders ? (izgara[gun] || {})[saat] : [],
      };
    }),
  }));
  return { satirlar, gunler: GUNLER };
}

/**
 * GÖRÜŞME IZGARASININ SAAT EKSENİ.
 *
 * ⚠ BURADA DOLU SAATLERİ KULLANMAK İŞE YARAMAZ. programIzgarasi'nın
 * `doluSaatler`i yalnız DERS OLAN saatleri verir; görüşme saati ise
 * tanımı gereği BOŞ bir saattir. Eksen doluSaatler'den kurulsaydı, hafta
 * boyunca hiç dersi olmayan bir saat (ör. 15:15) ızgarada hiç satır
 * açmaz, hoca o saati görüşmeye açamazdı.
 *
 * Eksen, hocanın DERS VERDİĞİ bölüm/seviyelerin kendi saat listelerinden
 * kurulur (her bölüm programını farklı saatte başlatır) ve dolu saatlerle
 * birleştirilir. Hiçbiri bulunamazsa `yedek` listesi kullanılır.
 */
export function gorusmeEkseni(kayitlar, bolumSaatleri, doluSaatler, yedek) {
  const listeler = [];
  const gorulen = new Set();
  (Array.isArray(kayitlar) ? kayitlar : []).forEach((k) => {
    if (!k) return;
    const anahtarlar = [metin(k.bolumId) + '|' + metin(k.seviye), metin(k.bolumId)];
    anahtarlar.forEach((a) => {
      if (gorulen.has(a)) return;
      gorulen.add(a);
      const l = bolumSaatleri && bolumSaatleri[a];
      if (Array.isArray(l) && l.length > 0) listeler.push(l);
    });
  });
  if (Array.isArray(doluSaatler) && doluSaatler.length > 0) listeler.push(doluSaatler);
  if (listeler.length === 0 && Array.isArray(yedek)) listeler.push(yedek);
  return birlesikEksen(listeler);
}

/**
 * Bugünkü programda karşılığı kalmamış işaretler.
 *
 * ⚠ SLOT ANAHTARI SAAT ETİKETİDİR ('Salı|13:15-14:00'). Bölüm ders
 * saatlerini değiştirdiğinde etiketler de değişir ve eski işaret hiçbir
 * satıra düşmez. Sessizce yok sayılırsa hoca "saatlerimi açmıştım" der,
 * öğrenci hiçbir saat göremez. Bunlar ayrı toplanır ki ekranda söylensin.
 */
export function yetimSlotlar(musaitlikler, saatler) {
  const liste = Array.isArray(saatler) ? saatler.map(metin) : null;
  if (!liste || liste.length === 0) return [];
  return (Array.isArray(musaitlikler) ? musaitlikler : []).filter((m) => {
    const a = typeof m === 'string' ? anahtarCoz(m) : m && { gun: m.gun, saat: m.saat };
    if (!a || !a.gun || !a.saat) return true;
    return !GUNLER.includes(a.gun) || !liste.includes(metin(a.saat));
  });
}

/**
 * Öğrenciye gösterilecek açık saatler (ders saatleri ayıklanmış).
 * `saatler` verilirse programda artık bulunmayan eski etiketler de elenir.
 */
export function acikSlotlar(izgara, musaitlikler, saatler) {
  const liste = [];
  (Array.isArray(musaitlikler) ? musaitlikler : []).forEach((m) => {
    const a = typeof m === 'string' ? anahtarCoz(m) : m && { gun: m.gun, saat: m.saat };
    if (!a || !a.gun || !a.saat) return;
    if (!GUNLER.includes(a.gun)) return;
    if (Array.isArray(saatler) && saatler.length > 0 && !saatler.map(metin).includes(metin(a.saat)))
      return;
    if (derstesMi(izgara, a.gun, a.saat)) return;
    liste.push({ gun: a.gun, saat: a.saat, anahtar: slotAnahtari(a.gun, a.saat) });
  });
  // Tekilleştir + gün/saat sırasına diz.
  const gorulen = new Set();
  return liste
    .filter((s) => (gorulen.has(s.anahtar) ? false : gorulen.add(s.anahtar)))
    .sort(
      (a, b) =>
        GUNLER.indexOf(a.gun) - GUNLER.indexOf(b.gun) || String(a.saat).localeCompare(b.saat, 'tr')
    );
}

/**
 * Bir haftalık slotun sıradaki takvim tarihi (YYYY-AA-GG).
 * Bugün o günse bugünü verir; geçmişe randevu verdirmemek için saat
 * karşılaştırması çağırana bırakılır.
 */
export function sonrakiTarih(gun, bugun) {
  const i = GUNLER.indexOf(metin(gun));
  if (i < 0) return '';
  const d = bugun instanceof Date ? new Date(bugun.getTime()) : new Date();
  if (Number.isNaN(d.getTime())) return '';
  d.setHours(0, 0, 0, 0);
  // JS: Pazar 0 … Cumartesi 6. Programda Pazartesi 0.
  const bugunIndeks = (d.getDay() + 6) % 7;
  let fark = i - bugunIndeks;
  if (fark < 0) fark += 7;
  d.setDate(d.getDate() + fark);
  const p = (n) => String(n).padStart(2, '0');
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
}

/** Tarihi "4 Mart 2026 Çarşamba" gibi yazar. */
export function tarihMetni(iso) {
  const s = metin(iso);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const [y, a, g] = s.split('-').map(Number);
  const aylar = [
    'Ocak',
    'Şubat',
    'Mart',
    'Nisan',
    'Mayıs',
    'Haziran',
    'Temmuz',
    'Ağustos',
    'Eylül',
    'Ekim',
    'Kasım',
    'Aralık',
  ];
  const d = new Date(y, a - 1, g);
  if (Number.isNaN(d.getTime())) return s;
  return g + ' ' + aylar[a - 1] + ' ' + y + ' ' + GUNLER[(d.getDay() + 6) % 7];
}

/** Bir slot+tarih o an meşgul mü (bekleyen ya da onaylı randevu var mı)? */
export function slotMesgulMu(randevular, gun, saat, tarih) {
  const a = slotAnahtari(gun, saat);
  return (Array.isArray(randevular) ? randevular : []).some(
    (r) =>
      r &&
      MESGUL_DURUMLAR.includes(metin(r.durum) || 'bekliyor') &&
      slotAnahtari(r.gun, r.saat) === a &&
      metin(r.tarih) === metin(tarih)
  );
}

/**
 * Öğrenci bu slota randevu isteyebilir mi?
 * Dönüş: { olur, sebep }
 */
export function randevuVerilebilirMi(girdi) {
  const g = girdi || {};
  const gun = metin(g.gun);
  const saat = metin(g.saat);
  if (!gun || !saat) return { olur: false, sebep: 'slot_yok' };
  if (derstesMi(g.izgara, gun, saat)) return { olur: false, sebep: 'ders_var' };
  const acik = acikSlotlar(g.izgara, g.musaitlikler, g.saatler).some(
    (s) => s.gun === gun && s.saat === saat
  );
  if (!acik) return { olur: false, sebep: 'kapali' };
  if (slotMesgulMu(g.randevular, gun, saat, g.tarih)) return { olur: false, sebep: 'dolu' };
  // Aynı öğrenci aynı akademisyende bekleyen bir talebi varken ikincisini
  // açamaz; aksi hâlde hocanın listesi tek öğrencinin talepleriyle dolar.
  const ogrenci = metin(g.ogrenciNo);
  if (ogrenci) {
    const bekleyen = (Array.isArray(g.randevular) ? g.randevular : []).some(
      (r) => r && metin(r.studentNumber) === ogrenci && metin(r.durum || 'bekliyor') === 'bekliyor'
    );
    if (bekleyen) return { olur: false, sebep: 'bekleyen_var' };
  }
  return { olur: true, sebep: '' };
}

/** Reddin/engelin öğrenciye yazılacak karşılığı. */
export function engelMesaji(sebep) {
  switch (sebep) {
    case 'slot_yok':
      return 'Bir gün ve saat seçin.';
    case 'ders_var':
      return 'Akademisyenin o saatte dersi var.';
    case 'kapali':
      return 'Bu saat görüşmeye açık değil.';
    case 'dolu':
      return 'Bu saat için başka bir randevu var. Başka bir saat seçin.';
    case 'bekleyen_var':
      return 'Bu akademisyende yanıt bekleyen bir talebiniz var. Önce onun sonuçlanmasını bekleyin.';
    default:
      return 'Randevu oluşturulamadı.';
  }
}

/** Randevu kayıtlarını süzer. */
export function randevulariSuz(randevular, olcut) {
  const o = olcut || {};
  const akademisyen = metin(o.akademisyen).toLocaleLowerCase('tr');
  const ogrenci = metin(o.ogrenciNo);
  const durumlar = Array.isArray(o.durumlar) ? o.durumlar : null;
  return (Array.isArray(randevular) ? randevular : []).filter((r) => {
    if (!r) return false;
    if (akademisyen && metin(r.akademisyen).toLocaleLowerCase('tr') !== akademisyen) return false;
    if (ogrenci && metin(r.studentNumber) !== ogrenci) return false;
    if (durumlar && !durumlar.includes(metin(r.durum) || 'bekliyor')) return false;
    return true;
  });
}

/** Randevuları tarihe (sonra saate) göre dizer; yaklaşan önce. */
export function randevulariSirala(randevular) {
  return (Array.isArray(randevular) ? randevular : []).slice().sort((a, b) => {
    const t = metin(a.tarih).localeCompare(metin(b.tarih));
    if (t !== 0) return t;
    return metin(a.saat).localeCompare(metin(b.saat), 'tr');
  });
}

/** Talep listesinin özeti — hocanın sayfasındaki rozetler. */
export function talepOzeti(randevular) {
  const liste = Array.isArray(randevular) ? randevular : [];
  const say = (d) => liste.filter((r) => (metin(r.durum) || 'bekliyor') === d).length;
  return {
    toplam: liste.length,
    bekliyor: say('bekliyor'),
    onaylandi: say('onaylandi'),
    reddedildi: say('reddedildi'),
    iptal: say('iptal'),
  };
}

/**
 * Onaylı bir randevu ders programındaki bir değişiklikle çakıştı mı?
 * Program sonradan değişip o saate ders konduğunda randevu sessizce
 * kaybolmamalı; hoca uyarıyı görüp öğrenciyle konuşabilmeli.
 */
export function cakisanRandevular(randevular, izgara) {
  return (Array.isArray(randevular) ? randevular : []).filter(
    (r) =>
      r &&
      MESGUL_DURUMLAR.includes(metin(r.durum) || 'bekliyor') &&
      derstesMi(izgara, metin(r.gun), metin(r.saat))
  );
}

/** Durum rozetinin görünümü. */
export function durumGorunumu(durum) {
  return RANDEVU_DURUMLARI[metin(durum) || 'bekliyor'] || RANDEVU_DURUMLARI.bekliyor;
}
