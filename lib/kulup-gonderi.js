// ══════════════════════════════════════════════════════════════
// TOPLULUK GÖNDERİLERİ — DUYURU · ETKİNLİK · ANKET
//
// Akışta üç tür vardı ama üçü de AYNI şeydi: seçilen tür kaydın üstünde
// renkli bir etiketten ibaretti. "Etkinlik" işaretlenen gönderinin tarihi
// yoktu, takvime eklenemiyordu; "Anket" işaretlenen gönderide oy verilecek
// bir şey yoktu. Tür seçmek kullanıcıya bir şey vadediyor, karşılığını
// vermiyordu.
//
// Buradaki kurallar o karşılığı tanımlar: bir etkinliğin ne zaman ve nerede
// olduğu, bir anketin seçenekleri ve oyların nasıl sayıldığı. Kural ekranda
// değil burada durur; ekran yalnız çizer.
// ══════════════════════════════════════════════════════════════

/** Akıştaki gönderi türleri. Sıra ekrandaki sekme sırasıdır. */
export const GONDERI_TURLERI = [
  { id: 'duyuru', ad: 'Duyuru', renk: '#2563EB', zemin: '#DBEAFE' },
  { id: 'etkinlik', ad: 'Etkinlik', renk: '#059669', zemin: '#D1FAE5' },
  { id: 'anket', ad: 'Anket', renk: '#7C3AED', zemin: '#EDE9FE' },
];

/** Bilinmeyen tür duyuru sayılır: eski kayıtlar tür alanı taşımıyor. */
export function turBilgisi(tur) {
  return GONDERI_TURLERI.find((t) => t.id === tur) || GONDERI_TURLERI[0];
}

// ══════════════════════════════════════════════
// ETKİNLİK
// ══════════════════════════════════════════════

const TARIH_KALIBI = /^\d{4}-\d{2}-\d{2}$/;
const SAAT_KALIBI = /^([01]\d|2[0-3]):[0-5]\d$/;

/**
 * Etkinlik alanlarını temizler.
 *
 * Saat İSTEĞE BAĞLI: "15 Mart'ta tanışma çayı" diyen bir topluluk saati
 * sonra netleştirebilir; saat zorunlu olsaydı uydurma bir saat yazılırdı.
 */
export function etkinlikNormalle(ham) {
  const e = ham || {};
  const tarih = String(e.tarih || '').trim();
  const baslangic = String(e.baslangic || '').trim();
  const bitis = String(e.bitis || '').trim();
  return {
    tarih: TARIH_KALIBI.test(tarih) ? tarih : '',
    baslangic: SAAT_KALIBI.test(baslangic) ? baslangic : '',
    bitis: SAAT_KALIBI.test(bitis) ? bitis : '',
    yer: String(e.yer || '')
      .trim()
      .slice(0, 160),
  };
}

/**
 * Etkinlik yayına hazır mı?
 *
 * Tarih zorunludur — tarihsiz bir "etkinlik" duyurudan farksızdır ve
 * yaklaşan etkinlikler listesinde yerini alamaz.
 */
export function etkinlikGecerliMi(ham) {
  const e = etkinlikNormalle(ham);
  if (!e.tarih) return { tamam: false, hata: 'Etkinlik tarihi seçin.' };
  if (e.baslangic && e.bitis && e.bitis <= e.baslangic) {
    return { tamam: false, hata: 'Bitiş saati başlangıçtan sonra olmalı.' };
  }
  return { tamam: true, hata: '' };
}

/**
 * Etkinliğin başlangıç anı.
 *
 * Saat yoksa günün başı alınır: böylece "bugün" olan saatsiz bir etkinlik,
 * gün bitene kadar geçmişe düşmez.
 */
export function etkinlikBaslangici(etkinlik) {
  const e = etkinlikNormalle(etkinlik);
  if (!e.tarih) return null;
  const [y, a, g] = e.tarih.split('-').map(Number);
  const [sa, dk] = (e.baslangic || '00:00').split(':').map(Number);
  const d = new Date(y, a - 1, g, sa || 0, dk || 0, 0, 0);
  return isNaN(d.getTime()) ? null : d;
}

/** Etkinliğin bittiği an — bitiş saati yoksa günün sonu. */
export function etkinlikBitisi(etkinlik) {
  const e = etkinlikNormalle(etkinlik);
  if (!e.tarih) return null;
  const [y, a, g] = e.tarih.split('-').map(Number);
  if (e.bitis) {
    const [sa, dk] = e.bitis.split(':').map(Number);
    return new Date(y, a - 1, g, sa, dk, 0, 0);
  }
  return new Date(y, a - 1, g, 23, 59, 59, 999);
}

/**
 * Etkinliğin durumu: 'bugun' | 'yaklasan' | 'gecmis' | 'tarihsiz'.
 *
 * Bugünkü etkinlik ayrı bir durumdur: listede öne çekilir ve ekranda
 * "BUGÜN" yazar — kaçırılmaması gereken tek durum odur.
 */
export function etkinlikDurumu(etkinlik, simdi) {
  const bas = etkinlikBaslangici(etkinlik);
  if (!bas) return 'tarihsiz';
  const an = simdi instanceof Date ? simdi : new Date();
  const bit = etkinlikBitisi(etkinlik);
  if (bit && bit.getTime() < an.getTime()) return 'gecmis';
  const ayniGun =
    bas.getFullYear() === an.getFullYear() &&
    bas.getMonth() === an.getMonth() &&
    bas.getDate() === an.getDate();
  return ayniGun ? 'bugun' : 'yaklasan';
}

/**
 * Yaklaşan etkinlikler — en yakın tarih başta.
 *
 * Akış tersine kronolojiktir (en yeni paylaşım üstte); etkinlikler için
 * doğru sıra bu DEĞİL: iki hafta önce duyurulan yarınki etkinlik, dün
 * duyurulan gelecek aylıktan önce gelmeli.
 */
export function yaklasanEtkinlikler(gonderiler, simdi, adet) {
  const an = simdi instanceof Date ? simdi : new Date();
  const liste = (Array.isArray(gonderiler) ? gonderiler : [])
    .filter((p) => p && p.type === 'etkinlik' && etkinlikDurumu(p.etkinlik, an) !== 'gecmis')
    .filter((p) => etkinlikBaslangici(p.etkinlik))
    .sort((a, b) => etkinlikBaslangici(a.etkinlik) - etkinlikBaslangici(b.etkinlik));
  return typeof adet === 'number' && adet > 0 ? liste.slice(0, adet) : liste;
}

function icsKacis(s) {
  return String(s == null ? '' : s)
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

function icsZaman(d) {
  if (!d) return '';
  const p = (n) => String(n).padStart(2, '0');
  return (
    d.getFullYear() +
    p(d.getMonth() + 1) +
    p(d.getDate()) +
    'T' +
    p(d.getHours()) +
    p(d.getMinutes()) +
    '00'
  );
}

/**
 * Takvim dosyası (.ics).
 *
 * Etkinliği görmek yetmez; öğrencinin kendi takvimine koyabilmesi gerekir.
 * Saat dilimi YAZILMAZ (kayan zaman): etkinlik kampüste, okuyan da kampüste
 * — UTC'ye çevirmek yaz saati geçişlerinde bir saat kaydırma riski getirirdi.
 */
export function icsBelgesi(gonderi, kulupAdi, baslik) {
  const p = gonderi || {};
  const bas = etkinlikBaslangici(p.etkinlik);
  if (!bas) return '';
  const bit = etkinlikBitisi(p.etkinlik);
  const e = etkinlikNormalle(p.etkinlik);
  const ad = String(baslik || '').trim() || (kulupAdi ? kulupAdi + ' etkinliği' : 'Etkinlik');
  const satirlar = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//CAKU//Ogrenci Topluluklari//TR',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    'UID:' + (p.id || 'etkinlik-' + bas.getTime()) + '@caku',
    'DTSTAMP:' + icsZaman(new Date()),
    'DTSTART:' + icsZaman(bas),
    'DTEND:' + icsZaman(bit || bas),
    'SUMMARY:' + icsKacis(ad),
  ];
  if (e.yer) satirlar.push('LOCATION:' + icsKacis(e.yer));
  if (kulupAdi) satirlar.push('DESCRIPTION:' + icsKacis(kulupAdi));
  satirlar.push('END:VEVENT', 'END:VCALENDAR');
  // ICS satır sonu CRLF'tir; \n ile yazılan dosyayı bazı takvimler okumaz.
  return satirlar.join('\r\n') + '\r\n';
}

// ══════════════════════════════════════════════
// ANKET
// ══════════════════════════════════════════════

/** En az iki, en çok altı seçenek. Fazlası akışta okunmaz hâle geliyor. */
export const ANKET_EN_AZ = 2;
export const ANKET_EN_COK = 6;

/**
 * Ham seçenek listesini temizler.
 *
 * Kimlikler İÇERİKTEN bağımsızdır (s1, s2…): seçenek metni sonradan
 * düzeltilirse (yazım hatası) verilmiş oylar başka seçeneğe kaymasın.
 */
export function anketSecenekleri(ham) {
  const dizi = Array.isArray(ham) ? ham : [];
  return dizi
    .map((x, i) => {
      const metin = String((x && x.metin != null ? x.metin : x) || '').trim();
      const id = String((x && x.id) || '') || 's' + (i + 1);
      return { id, metin: metin.slice(0, 120) };
    })
    .filter((x) => x.metin)
    .slice(0, ANKET_EN_COK);
}

/** Anket yayına hazır mı? */
export function anketGecerliMi(ham) {
  const anket = ham || {};
  const secenekler = anketSecenekleri(anket.secenekler);
  if (secenekler.length < ANKET_EN_AZ) {
    return { tamam: false, hata: 'Ankette en az ' + ANKET_EN_AZ + ' seçenek olmalı.' };
  }
  const benzersiz = new Set(secenekler.map((s) => s.metin.toLocaleLowerCase('tr')));
  if (benzersiz.size !== secenekler.length) {
    return { tamam: false, hata: 'Aynı seçenek iki kez yazılmış.' };
  }
  if (anket.bitis && !TARIH_KALIBI.test(String(anket.bitis))) {
    return { tamam: false, hata: 'Anket bitiş tarihi geçersiz.' };
  }
  return { tamam: true, hata: '' };
}

/**
 * Anket kapandı mı?
 *
 * Bitiş tarihi olan bir anket O GÜNÜN SONUNDA kapanır; "26 Mart'a kadar"
 * denince 26 Mart günü oy verilebilmeli.
 */
export function anketKapandiMi(anket, simdi) {
  const bitis = anket && anket.bitis ? String(anket.bitis) : '';
  if (!TARIH_KALIBI.test(bitis)) return false;
  const [y, a, g] = bitis.split('-').map(Number);
  const son = new Date(y, a - 1, g, 23, 59, 59, 999);
  const an = simdi instanceof Date ? simdi : new Date();
  return an.getTime() > son.getTime();
}

/**
 * Bir kullanıcının bu ankete verdiği oy.
 *
 * Oylar ayrı bir koleksiyonda tutulur (club_post_votes) — gönderinin içine
 * yazılsaydı oy vermek için gönderiyi güncellemek gerekirdi, yani her
 * öğrenciye başkasının paylaşımını yazma yetkisi.
 */
export function kullaniciOyu(oylar, kimlik) {
  const k = String(kimlik || '').trim();
  if (!k) return null;
  return (Array.isArray(oylar) ? oylar : []).find((o) => o && String(o.voter) === k) || null;
}

/**
 * Oy dağılımı — sayı ve yüzde.
 *
 * Yüzdeler oy verilmemişken 0'dır (0/0 = NaN ekrana "NaN%" olarak
 * düşüyordu). Aynı kişinin birden çok kaydı varsa en sonuncusu sayılır:
 * oyunu değiştiren biri iki kez sayılmamalı.
 */
export function oyDagilimi(anket, oylar) {
  const secenekler = anketSecenekleri(anket && anket.secenekler);
  const sonOylar = new Map();
  (Array.isArray(oylar) ? oylar : []).forEach((o) => {
    if (!o || !o.voter || !o.optionId) return;
    const onceki = sonOylar.get(String(o.voter));
    if (!onceki || String(o.createdAt || '') >= String(onceki.createdAt || '')) {
      sonOylar.set(String(o.voter), o);
    }
  });
  const sayaç = new Map();
  sonOylar.forEach((o) => {
    const id = String(o.optionId);
    sayaç.set(id, (sayaç.get(id) || 0) + 1);
  });
  const toplam = Array.from(sayaç.values()).reduce((t, n) => t + n, 0);
  return {
    toplam,
    satirlar: secenekler.map((s) => {
      const sayi = sayaç.get(s.id) || 0;
      return {
        id: s.id,
        metin: s.metin,
        sayi,
        yuzde: toplam > 0 ? Math.round((sayi / toplam) * 100) : 0,
      };
    }),
  };
}

/** Oy verilebilir mi? Kapanmış ankete ve kimliksiz kullanıcıya kapalıdır. */
export function oyVerilebilirMi(anket, kimlik, simdi) {
  if (!kimlik) return false;
  if (!anketSecenekleri(anket && anket.secenekler).length) return false;
  return !anketKapandiMi(anket, simdi);
}

// ══════════════════════════════════════════════
// ORTAK
// ══════════════════════════════════════════════

/**
 * Paylaş düğmesi basılabilir mi, basılamazsa NEDEN?
 *
 * Eskiden tek denetim vardı: "metin veya dosya". Tür seçilip alanları boş
 * bırakılınca gönderi yine kaydediliyor, ekranda tarihsiz bir "etkinlik" ya
 * da seçeneksiz bir "anket" olarak duruyordu.
 */
export function gonderiHazirMi(tur, veri) {
  const d = veri || {};
  const bosMetin = !!d.metinBos;
  const dosyaSayisi = Number(d.dosyaSayisi || 0);
  if (tur === 'etkinlik') {
    const e = etkinlikGecerliMi(d.etkinlik);
    if (!e.tamam) return e;
  }
  if (tur === 'anket') {
    const a = anketGecerliMi(d.anket);
    if (!a.tamam) return a;
    // Anket kendi başına içeriktir; ayrıca metin istemek gereksiz.
    return { tamam: true, hata: '' };
  }
  if (bosMetin && dosyaSayisi === 0) {
    return { tamam: false, hata: 'Bir metin yazın veya dosya ekleyin.' };
  }
  return { tamam: true, hata: '' };
}

/** Akışı türe göre süzer; 'tumu' hepsini döner. */
export function gonderileriSuz(gonderiler, tur) {
  const liste = Array.isArray(gonderiler) ? gonderiler.filter(Boolean) : [];
  if (!tur || tur === 'tumu') return liste;
  return liste.filter((p) => (p.type || 'duyuru') === tur);
}

/**
 * Bildirim gövdesi.
 *
 * Etkinlikte tarih, ankette soru/seçenek sayısı yazar: çan menüsünde
 * "Yeni paylaşım" demek, bildirimi açmadan hiçbir şey söylemiyordu.
 */
export function gonderiOzeti(gonderi, duzMetin) {
  const p = gonderi || {};
  const metin = String(duzMetin || '').trim();
  const kisa = metin.length > 90 ? metin.slice(0, 90) + '…' : metin;
  if (p.type === 'etkinlik') {
    const e = etkinlikNormalle(p.etkinlik);
    const parcalar = [];
    if (e.tarih) {
      const [y, a, g] = e.tarih.split('-');
      parcalar.push(g + '.' + a + '.' + y + (e.baslangic ? ' ' + e.baslangic : ''));
    }
    if (e.yer) parcalar.push(e.yer);
    const bilgi = parcalar.join(' · ');
    return kisa ? (bilgi ? bilgi + ' — ' + kisa : kisa) : bilgi || 'Yeni etkinlik';
  }
  if (p.type === 'anket') {
    const s = anketSecenekleri(p.anket && p.anket.secenekler);
    const bilgi = s.length ? s.length + ' seçenekli anket' : 'Yeni anket';
    return kisa ? kisa + ' (' + bilgi + ')' : bilgi;
  }
  const dosya = Array.isArray(p.files) ? p.files.length : 0;
  return kisa || (dosya ? dosya + ' dosya paylaşıldı' : 'Yeni paylaşım');
}
