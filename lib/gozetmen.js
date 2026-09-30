// ══════════════════════════════════════════════════════════════
// SINAV GÖZETMENLERİ — KİM, HANGİ BÖLÜMDE, HANGİ SINAVA, KAÇ KİŞİ
//
// Bölüm Yönetimi → Gözetmenler ekranı ile Sınav Otomasyonu'nun otomatik
// ataması (dekanlık çıktısı) aynı kuralları buradan okur. Kural ekranda bir
// şey, atamada başka bir şey söylemesin diye tek yerde ve test altında.
//
// ── BULUNAN TUTARSIZLIKLAR ──
// 1. "Zorunlu" kuralı "Tercihli" ile aynı çalışıyordu: hoca havuzda değilse
//    ya da o gün müsait değilse sessizce atanmıyordu. Artık hoca havuzda
//    olmasa da kendi sınavına yazılır; yazılamıyorsa UYARI üretilir.
// 2. Gözetmenlik kişiye bağlıydı (roles:['gozetmen']): bir bölümde gözetmen
//    yapılan kişi kendi ana bölümünün havuzuna da giriyordu. Ek bölümden
//    atanan akademisyen ise Bölüm Yönetimi'nde görünüp sınav atamasında
//    kullanılmıyordu. Artık gözetmenlik BÖLÜME bağlıdır: `gozetmenBolumleri`.
// 3. Gözetmen sayısı koda gömülüydü ve kendi içinde tutarsızdı (iki salona
//    3, üç salona da 3 gözetmen). Artık bölüm kuralıdır ve salon başına
//    hesaplanır.
// 4. Dersin hocası adla aranıyordu: ders kaydındaki ad ile akademisyen
//    kaydındaki ad unvan farkıyla yazılmışsa hoca tanınmıyordu. Ad artık
//    unvanlar atılarak karşılaştırılır.
// 5. Gözetmen sayısı, sınava ELLE salon atanmış olsa bile otomatik salona
//    göre hesaplanıyordu. Elle salon varsa o esas alınır.
// 6. Atanamayan gözetmen, havuzu boş bölüm, müsait olmayan zorunlu hoca
//    sessiz geçiyordu; çıktı eksik üretiliyordu. Artık uyarı listesi döner.
// ══════════════════════════════════════════════════════════════

import { bolumKimlikleri } from './bolum-kimlik.js';
import { akademisyenBolumdeMi } from './akademisyen-bolum.js';
import { gozetmenMusaitMi } from './sinav-cakisma.js';

const metin = (v) => String(v == null ? '' : v).trim();
const dizi = (v) => (Array.isArray(v) ? v.map(metin).filter(Boolean) : []);

// ── 1) GÖZETMENLİK BÖLÜME BAĞLI ──

/**
 * Kişinin gözetmen olduğu bölümler kayıtta AÇIKÇA tutuluyor mu?
 * Tutulmuyorsa kayıt eski biçimdedir (yalnız roles:['gozetmen']).
 */
export function gozetmenlikAcikMi(prof) {
  return !!prof && Array.isArray(prof.gozetmenBolumleri);
}

/**
 * Bu akademisyen bu bölümün gözetmeni mi?
 *
 * Eski kayıt (roles:['gozetmen'], bölüm listesi yok): kişinin kendi
 * bölümlerinde (ana + ek bölümler) gözetmen sayılır — Bölüm Yönetimi eskiden
 * de onları bu bölümlerin listesinde gösteriyordu.
 */
export function bolumGozetmeniMi(prof, bolumId, bolumler, bolumAdi) {
  if (!prof || !bolumId || prof.isMemur) return false;
  if (gozetmenlikAcikMi(prof)) {
    const kimlikler = bolumKimlikleri(bolumler, bolumId);
    return dizi(prof.gozetmenBolumleri).some((b) => kimlikler.includes(b));
  }
  if (!dizi(prof.roles).includes('gozetmen')) return false;
  return akademisyenBolumdeMi(prof, bolumId, bolumler, bolumAdi);
}

/**
 * Kişinin şu an gözetmen olduğu bölümler (kimlik listesi). Eski kayıtta
 * kişinin kendi bölümleri döner; açık listeye geçişte bunlar korunur.
 */
export function gozetmenBolumListesi(prof) {
  if (!prof) return [];
  if (gozetmenlikAcikMi(prof)) return [...new Set(dizi(prof.gozetmenBolumleri))];
  if (!dizi(prof.roles).includes('gozetmen')) return [];
  return [...new Set(dizi([prof.departmentId].concat(dizi(prof.additionalDepartments))))];
}

/**
 * Bir bölümde gözetmenlik ekler ya da kaldırır; kayda yazılacak YAMAYI döner.
 * `roles` içindeki 'gozetmen' işareti listeyle birlikte tutulur (başka
 * ekranlar hâlâ ona bakıyor): en az bir bölümde gözetmense vardır.
 */
export function gozetmenlikYamasi(prof, bolumId, ekle, bolumler) {
  const kimlikler = bolumKimlikleri(bolumler, bolumId);
  const hedef = metin(bolumId);
  let liste = gozetmenBolumListesi(prof).filter((b) => !kimlikler.includes(b));
  if (ekle && hedef) liste = [...liste, hedef];
  const digerRoller = dizi(prof && prof.roles).filter((r) => r !== 'gozetmen');
  return {
    gozetmenBolumleri: liste,
    roles: liste.length > 0 ? [...digerRoller, 'gozetmen'] : digerRoller,
  };
}

// ── 2) DERSİN HOCASI KURALI ──

export const HOCA_KURALLARI = [
  {
    id: 'tercihli',
    label: 'Tercihli',
    desc:
      'Dersin hocası bu bölümün gözetmen listesindeyse ve o saatte boşsa kendi sınavına ' +
      'ilk sırada atanır. Değilse başka gözetmen atanır, uyarı verilmez.',
  },
  {
    id: 'zorunlu',
    label: 'Zorunlu',
    desc:
      'Dersin hocası gözetmen listesinde olmasa da kendi sınavına her zaman atanır. ' +
      'O gün müsait değil ya da aynı saatte başka sınavdaysa çıktı öncesi uyarı verilir.',
  },
  {
    id: 'haric',
    label: 'Hariç',
    desc: 'Dersin hocası kendi sınavına hiç atanmaz; gözetmenlik tamamen bağımsız yürütülür.',
  },
];
export const HOCA_KURALI_VARSAYILAN = 'tercihli';

export function hocaKuraliOku(v) {
  const k = metin(v);
  return HOCA_KURALLARI.some((x) => x.id === k) ? k : HOCA_KURALI_VARSAYILAN;
}

/**
 * Bölümün veritabanı kaydı (kurallar burada durur). Önce kimliği birebir
 * tutan kayıt, yoksa kimlik biçimlerinden (`kimlikler`) biri tutan kayıt.
 * Ada göre eşlemek yanlıştı: aynı adlı iki bölüm kaydı varsa ilki seçiliyor,
 * kural diğerine yazılmışsa çıktıda hiç uygulanmıyordu.
 */
export function bolumKaydiniBul(bolumKayitlari, bolumId) {
  const k = metin(bolumId);
  if (!k) return null;
  const l = Array.isArray(bolumKayitlari) ? bolumKayitlari : [];
  return (
    l.find((d) => d && metin(d.id) === k) ||
    l.find((d) => d && dizi(d.kimlikler).includes(k)) ||
    null
  );
}

// ── 3) KAÇ GÖZETMEN? ──
//
// Salon başına hesaplanır: her salona `salonBasina` gözetmen; salondaki
// öğrenci sayısı `kalabalikEsik`e ulaşırsa o salona `kalabalikEk` kadar
// fazladan. Toplam en az `enAz`, `enCok` > 0 ise en çok `enCok`.
// Varsayılanlar eski davranışın tek salonlu hâliyle aynıdır (30'dan az
// öğrenci → 1, 30 ve üstü → 2).
export const SAYI_KURALI_VARSAYILAN = Object.freeze({
  salonBasina: 1,
  kalabalikEsik: 30,
  kalabalikEk: 1,
  enAz: 1,
  enCok: 0,
});

const tamsayi = (v, varsayilan, enKucuk, enBuyuk) => {
  const n = Math.floor(Number(v));
  if (!Number.isFinite(n)) return varsayilan;
  return Math.min(enBuyuk, Math.max(enKucuk, n));
};

/** Kayıttaki kuralı güvenli değerlere çevirir (eksik alan → varsayılan). */
export function sayiKuraliOku(v) {
  const k = v && typeof v === 'object' ? v : {};
  const d = SAYI_KURALI_VARSAYILAN;
  const kural = {
    salonBasina: tamsayi(k.salonBasina, d.salonBasina, 1, 10),
    kalabalikEsik: tamsayi(k.kalabalikEsik, d.kalabalikEsik, 0, 1000),
    kalabalikEk: tamsayi(k.kalabalikEk, d.kalabalikEk, 0, 10),
    enAz: tamsayi(k.enAz, d.enAz, 0, 50),
    enCok: tamsayi(k.enCok, d.enCok, 0, 50),
  };
  if (kural.enCok > 0 && kural.enCok < kural.enAz) kural.enCok = kural.enAz;
  return kural;
}

/** Salon metni ("M101 - M102") → salon sayısı. Salon yoksa 1 sayılır. */
export function salonSayisi(salon) {
  const s = metin(salon);
  if (!s || s === 'TBD') return 1;
  return s.split(' - ').map(metin).filter(Boolean).length || 1;
}

/** Bu sınava kaç gözetmen gerekir? */
export function gerekenGozetmenSayisi(salonAdedi, ogrenciSayisi, kuralHam) {
  const kural = sayiKuraliOku(kuralHam);
  const salon = Math.max(1, Math.floor(Number(salonAdedi)) || 1);
  const ogrenci = Math.max(0, Math.floor(Number(ogrenciSayisi)) || 0);
  const salonBasinaOgrenci = Math.ceil(ogrenci / salon);
  const kalabalik = kural.kalabalikEsik > 0 && salonBasinaOgrenci >= kural.kalabalikEsik;
  let toplam = salon * (kural.salonBasina + (kalabalik ? kural.kalabalikEk : 0));
  toplam = Math.max(toplam, kural.enAz);
  if (kural.enCok > 0) toplam = Math.min(toplam, kural.enCok);
  return toplam;
}

/** Kural panelindeki örnek tablo: bu kuralla birkaç tipik sınav. */
export function sayiKuraliOrnekleri(kuralHam) {
  const kural = sayiKuraliOku(kuralHam);
  const esik = kural.kalabalikEsik || 30;
  const ornekler = [
    [1, Math.max(1, esik - 5)],
    [1, esik],
    [2, esik * 2 - 10],
    [2, esik * 2],
    [3, esik * 3],
  ];
  return ornekler.map(([salon, ogrenci]) => ({
    salon,
    ogrenci,
    gozetmen: gerekenGozetmenSayisi(salon, ogrenci, kural),
  }));
}

// ── 4) AD EŞLEŞMESİ ──

const UNVAN =
  /(^|\s)(prof|doç|doc|dr|öğr|ogr|gör|gor|arş|ars|üyesi|uyesi|öğretim|görevlisi)\.?(?=\s|$)/g;

/** Unvanları atar, Türkçe küçük harfe çevirir: "Dr. Öğr. Üyesi Ali VELİ" → "ali veli". */
export function adAnahtari(ad) {
  return metin(ad)
    .toLocaleLowerCase('tr-TR')
    .replace(/\./g, '. ')
    .replace(/\s+/g, ' ')
    .replace(UNVAN, ' ')
    .replace(/[.,]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// ── 5) ATAMA ──

const sinavAnahtari = (e) => e.id || metin(e.code) + (e.date || '') + (e.timeSlot || '');

/**
 * Sınavlara gözetmen dağıtır.
 *
 * @param {string[]} havuz  bölümün gözetmenlerinin adları
 * @param {object[]} sinavlar  { id, code, name, date, timeSlot, duration,
 *                              studentCount, professor, room?, supervisor? }
 * @param {object} secenekler
 *   salonBul(ogrenciSayisi) → "M101 - M102"  (elle salon yoksa)
 *   hocaKurali, sayiKurali, musaitsizlik ({ ad: ['2026-06-01'] })
 * @returns {{ atamalar: Object<string,string[]>, uyarilar: object[] }}
 */
export function gozetmenAta(havuz, sinavlar, secenekler) {
  const s = secenekler || {};
  const kural = hocaKuraliOku(s.hocaKurali);
  const sayiKurali = sayiKuraliOku(s.sayiKurali);
  const salonBul = typeof s.salonBul === 'function' ? s.salonBul : () => '';
  const musaitsizlik = s.musaitsizlik || {};

  const adlar = [...new Set(dizi(havuz))];
  const havuzAdi = {};
  adlar.forEach((a) => {
    const k = adAnahtari(a);
    if (k && !havuzAdi[k]) havuzAdi[k] = a;
  });

  const dakika = {};
  const dolu = {};
  const yuk = (ad) => dakika[ad] || 0;
  const slot = (e) => (e.date || '') + '|' + (e.timeSlot || '');
  const saatBos = (ad, e) => !(dolu[ad] && dolu[ad].has(slot(e)));
  const gunMusait = (ad, e) => gozetmenMusaitMi(ad, e && e.date, musaitsizlik);
  const isaretle = (ad, e, sure) => {
    dakika[ad] = yuk(ad) + sure;
    (dolu[ad] = dolu[ad] || new Set()).add(slot(e));
  };

  const atamalar = {};
  const uyarilar = [];
  const uyar = (e, tur, mesaj) =>
    uyarilar.push({ sinav: sinavAnahtari(e), kod: metin(e.code), tarih: e.date || '', tur, mesaj });

  if (adlar.length === 0 && (sinavlar || []).length > 0) {
    uyarilar.push({
      sinav: '',
      kod: '',
      tarih: '',
      tur: 'havuz_bos',
      mesaj:
        'Bu bölümde tanımlı gözetmen yok; elle atanmamış sınavlara gözetmen yazılamadı. ' +
        'Bölüm Yönetimi → Gözetmenler ekranından ekleyin.',
    });
  }

  const sirali = [...(sinavlar || [])].sort((a, b) => {
    const x = (a.date || '') + (a.timeSlot || '') + (a.code || '');
    const y = (b.date || '') + (b.timeSlot || '') + (b.code || '');
    return x < y ? -1 : x > y ? 1 : 0;
  });

  sirali.forEach((e) => {
    const sure = Number(e.duration) || 60;
    const elle = metin(e.supervisor).split(',').map(metin).filter(Boolean);
    if (elle.length > 0) {
      elle.forEach((ad) => isaretle(ad, e, sure));
      atamalar[sinavAnahtari(e)] = elle;
      return;
    }

    const salon = metin(e.room) || salonBul(e.studentCount);
    const gereken = gerekenGozetmenSayisi(salonSayisi(salon), e.studentCount, sayiKurali);
    const atanan = [];

    const hocaMetni = metin(e.professor);
    const hocaKey = adAnahtari(hocaMetni);
    const hocaHavuzda = hocaKey ? havuzAdi[hocaKey] : null;
    // Zorunlu kuralda hoca havuzda olmasa da kendi adıyla yazılır.
    const hoca = hocaHavuzda || (kural === 'zorunlu' && hocaMetni ? hocaMetni : null);

    if (hoca && kural !== 'haric' && gereken > 0) {
      const gunOk = gunMusait(hoca, e);
      const saatOk = saatBos(hoca, e);
      if (gunOk && saatOk) atanan.push(hoca);
      else if (kural === 'zorunlu') {
        uyar(
          e,
          'hoca_musait_degil',
          `${hoca} kendi sınavına atanamadı: ` +
            (gunOk
              ? 'aynı saatte başka bir sınavda görevli.'
              : 'o gün müsait değil olarak işaretli.')
        );
      }
    }

    const hocaHaric = (ad) => kural === 'haric' && hocaKey && adAnahtari(ad) === hocaKey;
    const adaylar = adlar
      .filter((ad) => !atanan.includes(ad) && !hocaHaric(ad) && gunMusait(ad, e) && saatBos(ad, e))
      .sort((a, b) => yuk(a) - yuk(b) || (a < b ? -1 : a > b ? 1 : 0));
    while (atanan.length < gereken && adaylar.length > 0) atanan.push(adaylar.shift());

    if (atanan.length < gereken && adlar.length > 0) {
      uyar(
        e,
        'eksik',
        `${gereken} gözetmen gerekiyordu, ${atanan.length} atanabildi ` +
          '(müsait ya da o saatte boş gözetmen kalmadı).'
      );
    }

    atanan.forEach((ad) => isaretle(ad, e, sure));
    atamalar[sinavAnahtari(e)] = atanan;
  });

  return { atamalar, uyarilar };
}

/** Uyarıları kullanıcıya gösterilecek kısa metne çevirir. */
export function uyariMetni(uyarilar, enCok = 12) {
  const l = Array.isArray(uyarilar) ? uyarilar : [];
  const satirlar = l
    .slice(0, enCok)
    .map((u) => '• ' + (u.kod ? `${u.kod}${u.tarih ? ' (' + u.tarih + ')' : ''}: ` : '') + u.mesaj);
  if (l.length > enCok) satirlar.push(`… ve ${l.length - enCok} uyarı daha`);
  return satirlar.join('\n');
}
