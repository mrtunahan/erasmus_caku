// ══════════════════════════════════════════════════════════════
// ORTAK SINAV (BİRLEŞTİRME) — AYNI SAATTE BİRLİKTE YAPILAN SINAVLAR
//
// Bir saate birden çok ders konabilir ve bunların bir kısmı bilerek birlikte
// yapılır:
//   • aynı dersin ŞUBELERİ (FZK181 Şube 1 ve Şube 2), hocaları farklı olabilir
//   • aynı dersin farklı sınıflardaki / müfredatlardaki karşılıkları
//     (eski müfredatta MAT101, yenisinde MAT111 — ad aynı, kod farklı)
//   • öğrenci sayıları farklı dersler, tek salona ya da ortak salonlara
//
// Takvim bunu bilmiyordu: aynı sınıf aynı saate düşünce "Çakışma!" deyip
// yerleştirmeyi reddediyordu; hücre de yalnız bir sınav gösterebiliyordu.
//
// Birlikte yapılan sınavlar aynı `birlesimId`yi taşır ve TEK OTURUM sayılır:
//   • salon toplam öğrenci sayısına göre bir kez seçilir, hepsine yazılır
//   • gözetmen sayısı toplam öğrenci ve salon üzerinden bir kez hesaplanır;
//     dersin hocası kuralı oturumdaki BÜTÜN hocalara uygulanır
//   • oturumun kendi sınavları birbirleriyle "çakışma" sayılmaz
// ══════════════════════════════════════════════════════════════

import { egitmenleriCoz } from './ders-egitmenleri.js';
import { kisiAnahtari } from './akademik-unvan.js';

const metin = (v) => String(v == null ? '' : v).trim();
const sayi = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);

/** Birleşim kimliği (boşsa sınav tek başınadır). */
export const birlesimKimligi = (s) => metin(s && s.birlesimId);

/** Yeni birleşim kimliği. */
export function yeniBirlesimId() {
  return 'B' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

/** Ders kodu karşılaştırma anahtarı: "fzk 181" → "FZK181". */
export function kodAnahtari(kod) {
  return metin(kod).toLocaleUpperCase('tr-TR').replace(/[\s*]/g, '');
}

/**
 * Ders adının şube/grup ekinden arındırılmış kökü:
 * "Fizik I (Şube 2)" → "fizik i", "Matematik I - Gr. 3" → "matematik i".
 */
export function dersAdiKoku(ad) {
  // `\b` Türkçe harfleri (ş, ğ…) kelime harfi saymadığı için sınırlar elle
  // yazıldı; yoksa "Şube 2" eki adda kalıyor ve şubeler eşleşmiyordu.
  return metin(ad)
    .toLocaleLowerCase('tr-TR')
    .replace(/\(([^)]*)\)/g, (m, ic) => (/(şube|sube|grup|gr\.?|ş)\s*\d/.test(ic) ? ' ' : m))
    .replace(/(^|[\s\-–])(şube|sube|grup|gr\.?)\s*\d+(\s*[-–,]\s*\d+)*/g, ' ')
    .replace(/(^|[\s\-–])ş\s*\d+(?=\s|$)/g, ' ')
    .replace(/[()\-–,.]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export const ILISKILER = {
  sube: {
    etiket: 'Aynı dersin şubeleri',
    aciklama: 'Aynı ders kodu; şubeler birlikte sınav olabilir (hocaları farklı olabilir).',
  },
  mufredat: {
    etiket: 'Aynı ders, farklı kod',
    aciklama:
      'Ders adı aynı, kodu farklı — farklı sınıf ya da müfredattaki karşılığı. ' +
      'Birlikte yapılabilir.',
  },
  farkli: {
    etiket: 'Farklı dersler',
    aciklama: 'Farklı dersler aynı salonu/oturumu paylaşabilir.',
  },
};
const ILISKI_SIRASI = { sube: 0, mufredat: 1, farkli: 2 };

/** İki ders arasındaki ilişki: 'sube' | 'mufredat' | 'farkli'. */
export function birlesimIliskisi(a, b) {
  const ka = kodAnahtari(a && a.code);
  const kb = kodAnahtari(b && b.code);
  if (ka && ka === kb) return 'sube';
  const ada = dersAdiKoku(a && a.name);
  const adb = dersAdiKoku(b && b.name);
  if (ada && ada === adb) return 'mufredat';
  return 'farkli';
}

const secmeliMi = (s) => sayi(s && s.sinif) === 5;

/** Aynı sınıfın öğrencileri mi? (seçmeli dersler öğrenci kümesi olarak ayrışabilir) */
export function ayniSinifMi(a, b) {
  const x = sayi(a && a.sinif);
  return x > 0 && x === sayi(b && b.sinif) && !secmeliMi(a) && !secmeliMi(b);
}

const dakikaya = (saat) => {
  const m = /^(\d{1,2}):(\d{2})$/.exec(metin(saat));
  return m ? Number(m[1]) * 60 + Number(m[2]) : -1;
};

/** Aynı gün ve örtüşen saat mi? */
export function zamanOrtusur(a, b) {
  if (!a || !b || !metin(a.date) || metin(a.date) !== metin(b.date)) return false;
  const x = dakikaya(a.timeSlot);
  const y = dakikaya(b.timeSlot);
  if (x < 0 || y < 0) return false;
  return x < y + (sayi(b.duration) || 60) && y < x + (sayi(a.duration) || 60);
}

const sinavAnahtari = (s) =>
  metin(s && (s.id || metin(s.code) + (s.date || '') + (s.timeSlot || '')));

/** Oturum anahtarı: birleşiktse ortak, değilse sınavın kendisi. */
export function oturumAnahtari(s) {
  const b = birlesimKimligi(s);
  return b ? 'B:' + b : sinavAnahtari(s);
}

/** Sınavları oturumlara böler (birleşik olanlar tek oturum). */
export function oturumlar(sinavlar) {
  const harita = new Map();
  (Array.isArray(sinavlar) ? sinavlar : []).filter(Boolean).forEach((s) => {
    const k = oturumAnahtari(s);
    if (!harita.has(k)) harita.set(k, []);
    harita.get(k).push(s);
  });
  return [...harita.entries()].map(([anahtar, uyeler]) => ({ anahtar, uyeler }));
}

/** Bu sınavla birlikte yapılan sınavlar (kendisi dahil). */
export function grupUyeleri(sinav, sinavlar) {
  const b = birlesimKimligi(sinav);
  if (!b) return sinav ? [sinav] : [];
  const l = (Array.isArray(sinavlar) ? sinavlar : []).filter((x) => birlesimKimligi(x) === b);
  return l.length ? l : [sinav];
}

/**
 * Oturumun tek sınav gibi özeti: toplam öğrenci, bütün hocalar, en uzun süre,
 * elle girilmiş salon/gözetmen (üyelerden birinde varsa).
 */
export function oturumOzeti(uyeler) {
  const l = (Array.isArray(uyeler) ? uyeler : []).filter(Boolean);
  const tekil = (dizi) => [...new Set(dizi.map(metin).filter(Boolean))];
  // Saat metin olarak değil dakikaya göre sıralanır ("9:30" < "10:00").
  const saatler = l
    .map((s) => metin(s.timeSlot))
    .filter(Boolean)
    .sort((x, y) => dakikaya(x) - dakikaya(y));
  return {
    kodlar: tekil(l.map((s) => s.code)),
    hocalar: tekil(l.map((s) => s.professor)),
    siniflar: [...new Set(l.map((s) => sayi(s.sinif)).filter((x) => x > 0))].sort(),
    toplamOgrenci: l.reduce((t, s) => t + (sayi(s.studentCount) || 0), 0),
    sure: l.reduce((m, s) => Math.max(m, sayi(s.duration) || 60), 0) || 60,
    date: metin(l[0] && l[0].date),
    timeSlot: saatler[0] || '',
    room: (l.find((s) => metin(s.room)) || {}).room || '',
    supervisor: (l.find((s) => metin(s.supervisor)) || {}).supervisor || '',
  };
}

/**
 * Oturum başına salon: elle girilmiş salon varsa o, yoksa TOPLAM öğrenci
 * sayısına göre bir kez seçilen salon. Sınav anahtarı → salon.
 *
 * Otomatik seçim AYNI SAATTE DOLU salonları atlar: `salonBul(ogrenci,
 * doluSalonlar)` dolu salonları hariç tutmalıdır. Eskiden her sınav salonu
 * tek başına seçiyordu ve aynı saatteki iki ayrı sınav aynı salona
 * yazılabiliyordu. Önce elle salonu olan oturumlar yerleşir, sonra diğerleri
 * zaman sırasıyla.
 *
 * `disarida`: BAŞKA bölümlerin salonu belli sınavları. Fakültenin salonları
 * ortak; onların o saatte kullandığı salon bu bölüm için de doludur.
 *
 * `kapasite(salonAdi) → sayı` (isteğe bağlı): salonu girilmiş oturumun
 * salon(lar)ı toplam öğrenciye YETMİYORSA (ör. bölüm küçük salon girmiş ya
 * da birleştirme öğrenciyi artırmış) eksik kapasite için boş salon EKLENİR;
 * girilen salon korunur. Kapasitesi bilinmeyen salonu olan oturuma dokunulmaz.
 */
export function oturumSalonlari(sinavlar, salonBul, disarida, kapasite) {
  // " - " ya da eski virgüllü yazım ("D1, D2"); "A-101" tek salondur.
  const parca = (salon) =>
    metin(salon)
      .split(/\s+-\s+|,/)
      .map(metin)
      .filter(Boolean);
  const birimler = oturumlar(sinavlar).map(({ uyeler }) => {
    const o = oturumOzeti(uyeler);
    return { uyeler, o, zaman: { date: o.date, timeSlot: o.timeSlot, duration: o.sure } };
  });
  const yerlesen = (Array.isArray(disarida) ? disarida : [])
    .filter((s) => s && metin(s.room) && metin(s.date))
    .map((s) => ({
      zaman: { date: s.date, timeSlot: s.timeSlot, duration: sayi(s.duration) || 60 },
      salonlar: parca(s.room),
    }));
  const salonluBirimler = birimler.filter((b) => metin(b.o.room));
  salonluBirimler.forEach((b) => {
    b.salon = metin(b.o.room);
    b.kayit = { zaman: b.zaman, salonlar: parca(b.salon) };
    yerlesen.push(b.kayit);
  });
  if (typeof kapasite === 'function' && typeof salonBul === 'function') {
    salonluBirimler
      .slice()
      .sort((a, b) => (a.o.date + a.o.timeSlot).localeCompare(b.o.date + b.o.timeSlot))
      .forEach((b) => {
        const mevcut = parca(b.salon);
        const kap = mevcut.map((x) => sayi(kapasite(x)));
        if (kap.some((c) => !(c > 0))) return;
        const eksik = sayi(b.o.toplamOgrenci) - kap.reduce((t, c) => t + c, 0);
        if (eksik <= 0) return;
        const dolu = [
          ...new Set([
            ...mevcut,
            ...yerlesen.filter((y) => zamanOrtusur(y.zaman, b.zaman)).flatMap((y) => y.salonlar),
          ]),
        ];
        const ek = parca(salonBul(eksik, dolu)).filter((x) => x !== 'TBD' && !mevcut.includes(x));
        if (ek.length === 0) return;
        b.salon = [...mevcut, ...ek].join(' - ');
        b.kayit.salonlar = parca(b.salon);
      });
  }
  birimler
    .filter((b) => !metin(b.o.room))
    .sort((a, b) =>
      (a.o.date + a.o.timeSlot + a.o.kodlar.join()).localeCompare(
        b.o.date + b.o.timeSlot + b.o.kodlar.join()
      )
    )
    .forEach((b) => {
      const dolu = [
        ...new Set(
          yerlesen.filter((y) => zamanOrtusur(y.zaman, b.zaman)).flatMap((y) => y.salonlar)
        ),
      ];
      b.salon = typeof salonBul === 'function' ? metin(salonBul(b.o.toplamOgrenci, dolu)) : '';
      if (b.salon && b.salon !== 'TBD') yerlesen.push({ zaman: b.zaman, salonlar: parca(b.salon) });
    });
  const h = {};
  birimler.forEach((b) => b.uyeler.forEach((s) => (h[sinavAnahtari(s)] = b.salon)));
  return h;
}

/**
 * Bir ders bu gün ve saate bırakıldığında ne yapılabilir?
 *
 * @param {object} ders   yerleştirilecek ders (code, name, sinif, duration, …)
 * @param {string} tarih  YYYY-AA-GG
 * @param {string} saat   "10:00"
 * @param {object[]} sinavlar  bölümün bu dönemdeki sınavları
 * @returns {{
 *   oturumlar: Array<{anahtar, uyeler, ozet, iliski, ayniSinif, ayniHoca, zatenVar}>,
 *   ayriEklenebilir: boolean,
 *   engel: string
 * }}
 */
export function yerlestirmeSecenekleri(ders, tarih, saat, sinavlar) {
  const aday = {
    ...(ders || {}),
    date: tarih,
    timeSlot: saat,
    duration: sayi(ders && ders.duration) || 60,
  };
  const ortusen = (Array.isArray(sinavlar) ? sinavlar : []).filter((s) => zamanOrtusur(aday, s));
  // Oturumun bir üyesi örtüşüyorsa bütün oturum ilgilidir.
  const ilgiliAnahtarlar = new Set(ortusen.map(oturumAnahtari));
  const ilgili = (Array.isArray(sinavlar) ? sinavlar : []).filter((s) =>
    ilgiliAnahtarlar.has(oturumAnahtari(s))
  );
  // Dersin SORUMLU öğretim elemanı (professor; yoksa listedeki ilk) —
  // unvan/harf farkı önemsenmez. Çok hocalı derste (ör. bitirme projesi)
  // listedeki herkes bloklanmaz; o durum çakışma panelinde uyarı olarak kalır.
  const hocaHaritasi = (x) => {
    const h = new Map();
    const birincil =
      metin(x && x.professor) || metin(x && Array.isArray(x.professors) ? x.professors[0] : '');
    egitmenleriCoz(birincil).forEach((ad) => {
      const k = kisiAnahtari(ad);
      if (k && !h.has(k)) h.set(k, ad);
    });
    return h;
  };
  const dersHocalari = hocaHaritasi(ders);
  const secenekler = oturumlar(ilgili).map(({ anahtar, uyeler }) => {
    const iliski = uyeler
      .map((u) => birlesimIliskisi(ders, u))
      .sort((x, y) => ILISKI_SIRASI[x] - ILISKI_SIRASI[y])[0];
    const dersKimligi = metin(ders && ders.id);
    return {
      anahtar,
      uyeler,
      ozet: oturumOzeti(uyeler),
      iliski,
      ayniSinif: uyeler.some((u) => ayniSinifMi(ders, u)),
      // Aynı öğretim elemanının sınavı: hoca iki sınavda birden bulunamaz;
      // aynı sınıf gibi ayrı sınav olarak eklenemez, birleştirilir.
      ayniHoca:
        [...dersHocalari.keys()]
          .filter((k) => uyeler.some((u) => hocaHaritasi(u).has(k)))
          .map((k) => dersHocalari.get(k))[0] || '',
      // Aynı ders kaydı zaten bu oturumda (aynı şube iki kez konmasın)
      zatenVar:
        !!dersKimligi &&
        uyeler.some(
          (u) =>
            metin(u.courseId) === dersKimligi &&
            metin(u.name) === metin(ders.name) &&
            kodAnahtari(u.code) === kodAnahtari(ders.code)
        ),
    };
  });
  secenekler.sort(
    (a, b) =>
      ILISKI_SIRASI[a.iliski] - ILISKI_SIRASI[b.iliski] || a.anahtar.localeCompare(b.anahtar)
  );
  const sinifEngeli = secenekler.filter((o) => o.ayniSinif);
  const hocaEngeli = secenekler.filter((o) => !o.ayniSinif && o.ayniHoca);
  const kodlar = (l) => l.map((o) => o.ozet.kodlar.join(' + ')).join(', ');
  const mesajlar = [
    sinifEngeli.length
      ? `${sayi(ders && ders.sinif)}. sınıfın öğrencileri bu saatte ${kodlar(sinifEngeli)} sınavında.`
      : '',
    hocaEngeli.length
      ? `${hocaEngeli[0].ayniHoca} bu saatte ${kodlar(hocaEngeli)} sınavında; öğretim elemanı iki sınavda birden bulunamaz.`
      : '',
  ].filter(Boolean);
  return {
    oturumlar: secenekler,
    ayriEklenebilir: mesajlar.length === 0,
    engel: mesajlar.length
      ? mesajlar.join(' ') + ' Ayrı sınav olarak eklenemez; birlikte yapılacaksa birleştirin.'
      : '',
  };
}

/**
 * Birleşimden çıkarma: kalan üye tek kalırsa onun da bağı kopar.
 * Yazılacak yamaları döner: [{ id, birlesimId }].
 */
export function birlesimdenCikarYamalari(sinav, sinavlar) {
  const uyeler = grupUyeleri(sinav, sinavlar);
  if (uyeler.length <= 1) return birlesimKimligi(sinav) ? [{ id: sinav.id, birlesimId: '' }] : [];
  const yamalar = [{ id: sinav.id, birlesimId: '' }];
  const kalan = uyeler.filter((u) => u.id !== sinav.id);
  if (kalan.length === 1) yamalar.push({ id: kalan[0].id, birlesimId: '' });
  return yamalar;
}

// ══════════════════════════════════════════════════════════════
// ÇIKTI SATIRLARI — AYNI DERSİN İKİ MÜFREDAT KODU TEK SATIRDA
//
// Aynı ders iki müfredatta farklı kodla durur (ör. BIL345 ve BLM445
// "İnovasyon, Patent ve Teknoloji Ticarileşme"). Sınavı tek oturumda yapılır
// ama bölüm ve dekanlık çıktılarında iki ayrı satır olarak görünüyordu:
// aynı ders, aynı saat, aynı salon iki kez yazılıyor ve öğrenci sayısı
// bölünüyordu. Bu kayıtlar artık tek satırdır:
//   • kod: "BIL345 / BLM445"   • öğrenci sayısı: toplam
//   • salon ve gözetmen: birleşim (tekrarsız)   • bitiş: en geç biten
//
// Birleştirme şartı: aynı gün + aynı başlangıç saati + aynı ders adı kökü +
// AYNI OTURUM (birlesimId aynı ya da — birleştirilmemişse — aynı salon).
// Farklı salondaki aynı adlı sınavlar ayrı kalır; salon bilgisi kaybolmaz.
// Aynı KODU taşıyan şubeler bu kuralın dışındadır (ayrı satır kalırlar):
// istenen, müfredat karşılıklarının birleşmesidir.
// ══════════════════════════════════════════════════════════════

const tekrarsiz = (dizi) => {
  const out = [];
  dizi.forEach((x) => {
    const v = metin(x);
    if (v && !out.includes(v)) out.push(v);
  });
  return out;
};

/**
 * @param {object[]} satirlar çıktıya hazırlanmış sınavlar (sıralı). Kullanılan
 *   alanlar: name, code, date, timeSlot, birlesimId, studentCount, duration
 *   ve isteğe bağlı salon/gözetmen/bitiş alanları (o.salonAlani vb.).
 * @param {object} [o] { salonAlani='assignedRoom', gozetmenAlani='assignedSupervisors',
 *   bitisAlani='endStr', sureAlani='durationStr' }
 * @returns {object[]} birleşik satırlar; birleşen satırda `birlesikKodlar` dolu
 */
export function ciktiSatirlariniBirlestir(satirlar, o) {
  const op = {
    salonAlani: 'assignedRoom',
    gozetmenAlani: 'assignedSupervisors',
    bitisAlani: 'endStr',
    sureAlani: 'durationStr',
    ...(o || {}),
  };
  const liste = (Array.isArray(satirlar) ? satirlar : []).filter(Boolean);
  const anahtar = (s) => {
    const kok = dersAdiKoku(s.name);
    if (!kok) return '';
    const oturum = birlesimKimligi(s) ? 'B:' + birlesimKimligi(s) : 'S:' + metin(s[op.salonAlani]);
    return [metin(s.date), metin(s.timeSlot), kok, oturum].join('|');
  };
  const gruplar = new Map();
  liste.forEach((s, i) => {
    const k = anahtar(s) || '#' + i;
    if (!gruplar.has(k)) gruplar.set(k, []);
    gruplar.get(k).push(s);
  });
  const islenen = new Set();
  const out = [];
  liste.forEach((s, i) => {
    const k = anahtar(s) || '#' + i;
    if (islenen.has(k)) return;
    const uyeler = gruplar.get(k);
    const kodlar = tekrarsiz(uyeler.map((u) => kodAnahtari(u.code) && metin(u.code)));
    // Tek kod (tek kayıt ya da yalnız şubeler): satırlar olduğu gibi kalır.
    // Şubeler grupta kalsa da her biri kendi sırasında, kendi satırıyla yazılır.
    if (uyeler.length < 2 || kodlar.length < 2) {
      out.push(s);
      return;
    }
    islenen.add(k);
    const enGecBiten = uyeler.reduce((m, u) =>
      (sayi(u.duration) || 60) > (sayi(m.duration) || 60) ? u : m
    );
    const salonlar = tekrarsiz(uyeler.flatMap((u) => metin(u[op.salonAlani]).split(' - ')));
    const gozetmenler = tekrarsiz(uyeler.flatMap((u) => metin(u[op.gozetmenAlani]).split(',')));
    const ogrenci = uyeler.reduce((t, u) => t + (sayi(u.studentCount) || 0), 0);
    out.push({
      ...s,
      code: kodlar.join(' / '),
      birlesikKodlar: kodlar,
      studentCount: ogrenci || s.studentCount,
      duration: sayi(enGecBiten.duration) || s.duration,
      [op.bitisAlani]:
        enGecBiten[op.bitisAlani] != null ? enGecBiten[op.bitisAlani] : s[op.bitisAlani],
      [op.sureAlani]: enGecBiten[op.sureAlani] != null ? enGecBiten[op.sureAlani] : s[op.sureAlani],
      [op.salonAlani]: salonlar.join(' - '),
      [op.gozetmenAlani]: gozetmenler.join(', '),
      siniflar: [...new Set(uyeler.map((u) => sayi(u.sinif)).filter((x) => x > 0))].sort(),
    });
  });
  return out;
}
