// ══════════════════════════════════════════════════════════════
// TALEBİ YETKİLİ ELİYLE DÜZELTME
//
// Öğrenci muafiyet talebini gönderdiğinde satırlar akademisyenin önüne
// düşüyor ve tek yapılabilecek şey ONAY ya da RED oluyordu. Oysa hataların
// çoğu karar gerektirmiyor: öğrenci ÇAKÜ dersini yanlış müfredattan seçmiş,
// karşı kurumun ders kodunu yanlış yazmış, tek satırı fazladan eklemiş.
// Bunlar için talebi reddedip öğrenciye "yeniden gönder" demek, günlerce
// süren bir gidiş-geliş üretiyordu.
//
// Bu dosya, ÜNİVERSİTE YETKİLİSİNİN bekleyen bir satırı yerinde düzeltmesinin
// kurallarını taşır. Üç şey bilinçli olarak sabittir:
//
//   1) YALNIZ ÜNİVERSİTE YETKİLİSİ. Kararı veren akademisyenin aynı zamanda
//      kararın konusunu değiştirebilmesi, onayı anlamsız kılardı.
//   2) KARAR VERİLMİŞ SATIR DA DÜZELTİLEBİLİR — ama sessizce değil. Sahada
//      yanlış ders kodlu, süreci bitmiş kayıtlar var ve bunları yalnız
//      "yeni talep açtır" diyerek düzeltmek işi öğrenciye yıkmak olurdu.
//      Onaylanmış satır muafiyet geçmişine (muafiyet_history) de yazılmıştır;
//      çağıran taraf düzeltmeyi oraya da işlemek zorundadır, yoksa geçmişteki
//      kayıt ile talepteki kayıt birbirinden ayrılır (`kararliMi` bunu söyler).
//   3) BAŞARI NOTUNU ÖĞRENCİ DEĞİL, YETKİLİ GİRER. Not normalde transkriptten
//      okunur; öğrenci dersleri elle girdiyse ya da okuma o satırı bulamadıysa
//      kayıtta not YOK ve memur yazısında iki not sütunu da boş çıkıyor.
//      Notu buradan yalnız üniversite yetkilisi yazabilir (öğrenci hiçbir
//      alanı düzeltemez) ve yazdığı değer ize geçer.
//
// Her düzeltme satırın içinde iz bırakır (`duzenlemeler`): kararı verecek
// akademisyen, önüne gelen satırın öğrencinin gönderdiğinden farklı olduğunu
// görmek zorundadır.
// ══════════════════════════════════════════════════════════════

/**
 * Düzeltilebilir alanlar ve ekrandaki adları.
 *
 * `localCourse` = ÇAKÜ dersi, `sourceCourse` = karşı kurumun dersi.
 * Liste dar tutulur: burada olmayan bir alan yamada sessizce yok sayılır.
 */
export const DUZENLENEBILIR_ALANLAR = [
  { yol: 'localCourse.code', etiket: 'ÇAKÜ ders kodu' },
  { yol: 'localCourse.name', etiket: 'ÇAKÜ ders adı' },
  { yol: 'localCourse.akts', etiket: 'ÇAKÜ AKTS' },
  { yol: 'localCourse.statu', etiket: 'ÇAKÜ statü' },
  { yol: 'localCourse.donem', etiket: 'ÇAKÜ yarıyıl' },
  { yol: 'localCourse.weeklyContent', etiket: 'ÇAKÜ ders içeriği' },
  { yol: 'localCourse.bolognaLink', etiket: 'ÇAKÜ Bologna bağlantısı' },
  { yol: 'sourceCourse.code', etiket: 'Karşı kurum ders kodu' },
  { yol: 'sourceCourse.name', etiket: 'Karşı kurum ders adı' },
  { yol: 'sourceCourse.akts', etiket: 'Karşı kurum AKTS' },
  // Memur yazısının iki not sütunu bu iki alandan doluyor.
  { yol: 'sourceCourse.grade', etiket: 'Karşı kurum başarı notu' },
  { yol: 'convertedGrade', etiket: 'ÇAKÜ karşılığı (harf notu)' },
];

const YOL_KUMESI = new Set(DUZENLENEBILIR_ALANLAR.map((a) => a.yol));

/**
 * Değiştirilmesi YASAK alanlar — istek gövdesinde gelseler bile düşer.
 *
 * `gradeHarf`/`gradePuan` doğrudan yazılamaz: ikisi `grade`den TÜRETİLİR
 * (bkz. notTurevleri). Ayrı ayrı yazılabilseydi harf ile puan birbirini
 * tutmayan bir kayıt oluşabilirdi. Karar alanları da burada: düzeltme
 * kararın kendisi değildir.
 */
export const YASAK_ALANLAR = [
  'sourceCourse.gradeHarf',
  'sourceCourse.gradePuan',
  'adminDecision',
  'adminNote',
  'tier',
  'recommendation',
];

export function alanEtiketi(yol) {
  const a = DUZENLENEBILIR_ALANLAR.find((x) => x.yol === yol);
  return a ? a.etiket : yol;
}

function oku(nesne, yol) {
  const parcalar = String(yol).split('.');
  // Tek parçalı yol satırın KENDİ alanıdır (ör. convertedGrade); iki parçalı
  // yol iç nesneye iner (localCourse.code).
  if (parcalar.length === 1) return nesne ? nesne[parcalar[0]] : undefined;
  const k = nesne && nesne[parcalar[0]];
  return k && typeof k === 'object' ? k[parcalar[1]] : undefined;
}

/**
 * Başarı notundan türeyen alanlar.
 *
 * Kayıtta not üç alanda duruyor: `grade` belgeye giden değer, `gradeHarf` ve
 * `gradePuan` ayrıştırılmış hâli. Yetkili tek kutuya yazıyor; üçünün
 * birbirini tutması bu işin görevi — sayı ise puan, değilse harf.
 */
export function notTurevleri(deger) {
  const not = metin(deger).toLocaleUpperCase('tr');
  if (!not) return { grade: '', gradeHarf: '', gradePuan: '' };
  return /^\d/.test(not)
    ? { grade: not, gradeHarf: '', gradePuan: not }
    : { grade: not, gradeHarf: not, gradePuan: '' };
}

function metin(v) {
  return v == null ? '' : String(v).trim();
}

/**
 * Bu satır şu anda düzeltilebilir mi?
 *
 * @returns { izin: boolean, neden: string }
 */
export function duzenleyebilirMi(kullanici, kayit, eslesme) {
  if (!kullanici || kullanici.isUniversityAdmin !== true) {
    return { izin: false, neden: 'Talebi yalnızca üniversite yetkilisi düzeltebilir.' };
  }
  if (!eslesme) {
    return { izin: false, neden: 'Satır bulunamadı.' };
  }
  if (kayit && kayit.status === 'iptal') {
    return { izin: false, neden: 'İptal edilmiş talep düzeltilemez.' };
  }
  // `kararli`: satır onaylanmış/reddedilmiş. Düzeltme yine yapılabilir —
  // sahada yanlış ders kodlu, süreci bitmiş kayıtlar var — ama sonucu
  // taşıyan iki yer daha vardır: muafiyet geçmişi ve öğrencinin gördüğü
  // belge. Çağıran taraf ikisini de tazelemek zorunda.
  const kararli = !!eslesme.adminDecision;
  return {
    izin: true,
    neden: '',
    kararli,
    uyari: kararli
      ? 'Bu satırın kararı verilmiş. Düzeltme muafiyet geçmişine de işlenir ve öğrenciye bildirilir.'
      : '',
  };
}

/**
 * Satırı çıkarmak (öğrencinin fazladan eklediği ders) da bir düzeltmedir;
 * aynı kurallara tabidir.
 */
export function satirCikarilabilirMi(kullanici, kayit, eslesme, toplamSatir) {
  const k = duzenleyebilirMi(kullanici, kayit, eslesme);
  if (!k.izin) return k;
  if (Number(toplamSatir) <= 1) {
    return { izin: false, neden: 'Talebin tek satırı çıkarılamaz; talebi reddedin.' };
  }
  return { izin: true, neden: '' };
}

/**
 * İstenen değişikliklerden GERÇEKTEN değişenleri süzer.
 *
 * Formdan her alan geri gelir; hiçbiri değişmemişse kayıt yazılmamalı ve
 * "düzenlendi" izi bırakılmamalıdır — yoksa yetkilinin paneli açıp kapatması
 * bile satırı değiştirilmiş gösterirdi.
 */
export function degisiklikleriCoz(eslesme, istenen) {
  const gelen = istenen && typeof istenen === 'object' ? istenen : {};
  const liste = [];
  Object.keys(gelen).forEach((yol) => {
    if (!YOL_KUMESI.has(yol)) return; // yasak/bilinmeyen alan sessizce düşer
    const eski = degeriDuzelt(yol, oku(eslesme, yol));
    const yeni = degeriDuzelt(yol, gelen[yol]);
    if (eski === yeni) return;
    liste.push({ yol, etiket: alanEtiketi(yol), eski, yeni });
  });
  return liste;
}

/**
 * Alanın kayda gireceği son hâli.
 *
 * Notlar BÜYÜK harfe çevrilir; yoksa "cb" yazan yetkilinin izinde "cb",
 * kayıtta "CB" görünür ve ikisi birbirini tutmazdı. Ayrıca "bb" ile "BB"
 * farklı sanılıp gereksiz bir düzeltme kaydı üretilirdi.
 */
function degeriDuzelt(yol, deger) {
  const d = metin(deger);
  if (!d) return '';
  return yol === 'sourceCourse.grade' || yol === 'convertedGrade' ? d.toLocaleUpperCase('tr') : d;
}

/** Değişiklikler geçerli mi? (boş bırakılamayacak alanlar, sayısal AKTS) */
export function degisiklikGecerliMi(degisiklikler) {
  const liste = Array.isArray(degisiklikler) ? degisiklikler : [];
  if (liste.length === 0) {
    return { gecerli: false, hata: 'Değişiklik yok.' };
  }
  for (const d of liste) {
    if ((d.yol === 'localCourse.name' || d.yol === 'sourceCourse.name') && !d.yeni) {
      return { gecerli: false, hata: alanEtiketi(d.yol) + ' boş bırakılamaz.' };
    }
    if (d.yol.endsWith('.akts') && d.yeni) {
      const n = Number(String(d.yeni).replace(',', '.'));
      if (!isFinite(n) || n < 0 || n > 60) {
        return { gecerli: false, hata: alanEtiketi(d.yol) + ' sayı olmalı (0–60).' };
      }
    }
  }
  return { gecerli: true, hata: '' };
}

/**
 * Yamalanmış satırı üretir.
 *
 * Değişiklikler `duzenlemeler` dizisine EKLENİR, üzerine yazılmaz: bir satır
 * iki kez düzeltilmişse ikisi de görünür. `duzenleyen`/`duzenlemeTarihi`
 * en son düzeltmeyi işaret eder (rozet bunu yazar).
 *
 * `puanBayat`: ÇAKÜ dersi ya da karşı ders değiştiyse eski içerik benzerlik
 * puanı ARTIK BAŞKA BİR ÇİFTE aittir. Puanı olduğu gibi bırakmak, kararı
 * verecek akademisyene yanlış bir dayanak gösterirdi.
 */
export function eslesmeYamasi(eslesme, degisiklikler, kim, simdi) {
  const liste = Array.isArray(degisiklikler) ? degisiklikler : [];
  const yeni = Object.assign({}, eslesme);
  const zaman = (simdi instanceof Date ? simdi : new Date()).toISOString();

  liste.forEach((d) => {
    const parcalar = String(d.yol).split('.');
    if (parcalar.length === 1) {
      yeni[parcalar[0]] = d.yeni;
      return;
    }
    const [ust, alt] = parcalar;
    yeni[ust] = Object.assign({}, yeni[ust] || {});
    yeni[ust][alt] = d.yeni;
    // Başarı notu yazıldıysa harf/puan alanları da onunla birlikte gider;
    // üçü birbirini tutmayan bir kayıt sonraki hesapları yanıltırdı.
    if (d.yol === 'sourceCourse.grade') {
      Object.assign(yeni[ust], notTurevleri(d.yeni));
    }
  });

  const iz = (Array.isArray(eslesme && eslesme.duzenlemeler) ? eslesme.duzenlemeler : []).concat(
    liste.map((d) => ({
      alan: d.yol,
      etiket: d.etiket,
      eski: d.eski,
      yeni: d.yeni,
      kim: String((kim && (kim.name || kim.identifier)) || ''),
      tarih: zaman,
    }))
  );

  yeni.duzenlemeler = iz;
  yeni.duzenleyen = String((kim && (kim.name || kim.identifier)) || '');
  yeni.duzenlemeTarihi = zaman;

  const dersDegisti = liste.some(
    (d) =>
      d.yol === 'localCourse.code' ||
      d.yol === 'localCourse.name' ||
      d.yol === 'sourceCourse.code' ||
      d.yol === 'sourceCourse.name'
  );
  if (dersDegisti) yeni.puanBayat = true;

  return yeni;
}

/** Rozet ve denetim kaydı için tek satırlık özet. */
export function duzenlemeOzeti(degisiklikler) {
  const liste = Array.isArray(degisiklikler) ? degisiklikler : [];
  if (!liste.length) return '';
  return liste.map((d) => d.etiket + ': ' + (d.eski || '—') + ' → ' + (d.yeni || '—')).join('; ');
}

/**
 * Satır düzeltilmiş mi ve kim tarafından?
 *
 * Kararı verecek akademisyen bunu görmek ZORUNDA: önüne gelen satır
 * öğrencinin gönderdiğinden farklıysa, farkı bilerek karar vermeli.
 */
export function duzenlendiMi(eslesme) {
  const iz = eslesme && Array.isArray(eslesme.duzenlemeler) ? eslesme.duzenlemeler : [];
  if (!iz.length) return null;
  const son = iz[iz.length - 1];
  return { adet: iz.length, kim: son.kim || '', tarih: son.tarih || '', kayitlar: iz };
}
