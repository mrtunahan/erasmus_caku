// ══════════════════════════════════════════════════════════════
// AKADEMİK UNVAN — ADIN İÇİNDEKİ UNVANI AYIRMAK
//
// Bu sistemde akademisyenin kimliği AD METNİDİR ve unvan da o metnin
// İÇİNDEDİR: `professors.name` alanı "Öğrt. Gör. Gökalp SAYLAM" diye durur.
// Dolayısıyla unvanı değişen (ya da iki kez farklı unvanla kaydedilen) kişi
// sistemde İKİ AYRI KİŞİdir: ayrı şifre, ayrı yetki, ayrı ders ataması.
//
// ⚠ UNVAN LİSTESİ ÜÇ YERDE AYRI AYRI YAZILIYDU ve üçü de EKSİKTİ:
// giriş ekranının tekilleştirmesi (shared-components.jsx), tanı betiği
// (diagnose-professor-dedup.js) ve elle yapılan aramalar. Listede
// "Öğr. Gör." vardı ama "Öğrt. Gör." yoktu; "Dr. Öğr. Üyesi" vardı ama tek
// başına "Öğr. Üyesi" yoktu. Sonuç: aynı kişinin iki kaydı tekilleştirmeye
// takılmıyor, giriş listesinde yan yana iki "Gökalp SAYLAM" çıkıyordu.
//
// ── NEDEN SADECE GİZLEMEK ÇÖZÜM DEĞİL ──
// Giriş listesinde mükerrer kaydı gizlemek KOZMETİKtir ve tehlikelidir:
// gizlenen ad hâlâ ayrı bir kimliktir, şifresi ona bağlıysa kişi giriş
// yapamaz hâle gelir. Bu yüzden buradaki kural "hangi kaydı gizleyeyim"
// değil, "bunlar aynı kişi mi" sorusuna cevap verir; kararı insan verir ve
// kayıtlar server/birlestir-akademisyen.js ile BİRLEŞTİRİLİR.
// ══════════════════════════════════════════════════════════════

const metin = (v) => String(v == null ? '' : v).trim();

/**
 * Tanınan unvanlar. Sıra ÖNEMLİ DEĞİL — eşleştirme normalleştirilmiş hâlin
 * uzunluğuna göre uzundan kısaya yapılır ("Dr. Öğr. Üyesi", "Dr."den önce
 * denensin diye). Yeni unvan eklemek için listeye yazmak yeterlidir.
 *
 * Yazım varyantları (nokta/boşluk) ayrı ayrı yazılmaz: karşılaştırma
 * noktasız ve tek boşluklu normal biçim üzerinden yapılır, yani
 * "Prof.Dr.", "Prof. Dr." ve "Prof Dr" aynı unvandır.
 */
export const UNVANLAR = [
  // Profesör / doçent
  'Prof. Dr.',
  'Prof.',
  'Profesör',
  'Doç. Dr.',
  'Doç.',
  'Doçent',
  // Öğretim üyesi
  'Dr. Öğr. Üyesi',
  'Dr. Öğrt. Üyesi',
  'Doktor Öğretim Üyesi',
  'Öğr. Üyesi',
  'Öğrt. Üyesi',
  'Öğretim Üyesi',
  // Öğretim görevlisi — "Öğrt." varyantı listede YOKTU, asıl arıza buydu
  'Öğr. Gör. Dr.',
  'Öğrt. Gör. Dr.',
  'Dr. Öğr. Gör.',
  'Dr. Öğrt. Gör.',
  'Öğr. Gör.',
  'Öğrt. Gör.',
  'Öğretim Görevlisi',
  // Araştırma görevlisi
  'Arş. Gör. Dr.',
  'Dr. Arş. Gör.',
  'Arş. Gör.',
  'Araştırma Görevlisi',
  // Diğer
  'Okutman',
  'Uzman Dr.',
  'Uzman',
  'Uzm.',
  'Dr.',
];

/**
 * Karşılaştırma biçimi: Türkçe küçük harf, nokta yok, tek boşluk.
 * 'İ'→'i' ve 'I'→'ı' dönüşümü için locale ZORUNLU; İngilizce küçültme
 * "SAYLAM"ı doğru çevirir ama "GÖKŞENLİ"yi bozar.
 */
function normal(v) {
  return (
    metin(v)
      .toLocaleLowerCase('tr')
      // Nokta SİLİNMEZ, boşluğa çevrilir: "Prof.Dr." tek kelimeye
      // ("profdr") dönüşürse "Prof. Dr." ile eşleşmezdi.
      .replace(/[.]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
  );
}

// Unvanlar normalleştirilip UZUNDAN KISAYA sıralanır: "dr öğr üyesi",
// "dr"den önce denenmeli, yoksa "Dr. Öğr. Üyesi Ali" adının unvanı "Dr."
// sanılıp geriye "Öğr. Üyesi Ali" kalırdı.
const NORMAL_UNVANLAR = UNVANLAR.map((u) => ({ unvan: u, n: normal(u) })).sort(
  (a, b) => b.n.length - a.n.length
);

/**
 * Addaki unvanı ayırır.
 *
 * @param {string} adSoyad "Öğrt. Gör. Gökalp SAYLAM"
 * @returns {{unvan:string, ad:string}} { unvan: 'Öğrt. Gör.', ad: 'Gökalp SAYLAM' }
 *   Unvan tanınmazsa unvan '' döner ve ad olduğu gibi kalır — uydurma yapılmaz.
 */
export function unvaniAyir(adSoyad) {
  const ham = metin(adSoyad);
  if (!ham) return { unvan: '', ad: '' };
  const n = normal(ham);
  for (const { n: nu } of NORMAL_UNVANLAR) {
    if (n !== nu && !n.startsWith(nu + ' ')) continue;
    if (n === nu) return { unvan: ham, ad: '' }; // yalnız unvan yazılmış
    const kesim = unvanSonu(ham, nu);
    if (kesim < 0) continue;
    return { unvan: ham.slice(0, kesim).trim(), ad: ham.slice(kesim).trim() };
  }
  return { unvan: '', ad: ham };
}

/**
 * Ham metinde unvanın bittiği indeks.
 *
 * ⚠ KELİME SAYARAK BULUNAMAZ: "Prof.Dr. Gökhan" ham metinde İKİ kelimedir
 * ama unvan normal biçimde ("prof dr") iki kelimedir — kelime sayısı tutmaz
 * ve ilk hâli adın başını yiyordu. Bunun yerine, normalleştirilmiş hâli
 * unvana eşit olan EN UZUN önek aranır.
 *
 * Sınır şartı da gerekli: "Dr." unvanı "Drahşan"ın başını kesmemeli. Kesim
 * ya metnin sonunda olmalı, ya sonrası boşlukla başlamalı, ya da kesimden
 * önceki karakter boşluk/nokta olmalı.
 */
function unvanSonu(ham, nu) {
  let bulunan = -1;
  for (let i = 1; i <= ham.length; i++) {
    if (normal(ham.slice(0, i)) === nu) bulunan = i;
  }
  if (bulunan < 0) return -1;
  if (bulunan === ham.length) return bulunan;
  const sonraki = ham[bulunan];
  const onceki = ham[bulunan - 1];
  const sinir = /\s/.test(sonraki) || /\s/.test(onceki) || onceki === '.';
  return sinir ? bulunan : -1;
}

/** Unvanı atılmış ad. Unvan tanınmazsa ad aynen döner. */
export function unvansizAd(adSoyad) {
  return unvaniAyir(adSoyad).ad;
}

/**
 * Aynı kişiyi gösteren anahtar: unvansız adın normal biçimi.
 * "Öğrt. Gör. Gökalp SAYLAM" ve "Öğr. Üyesi Gökalp Saylam" → "gökalp saylam"
 */
export function kisiAnahtari(adSoyad) {
  return normal(unvansizAd(adSoyad));
}

/** İki kayıt aynı kişi mi? (unvan farkı önemsenmez) */
export function ayniKisiMi(a, b) {
  const ka = kisiAnahtari(a);
  return !!ka && ka === kisiAnahtari(b);
}

/**
 * Ad listesini kişiye göre gruplar.
 *
 * ⚠ YALNIZ ÇAKIŞANLARI döndürür: tek kaydı olan kişi listeye girmez, çünkü
 * bu fonksiyonun işi "kim mükerrer" sorusudur. Aynı adın birebir tekrarı da
 * (iki kayıt, aynı metin) çakışmadır — `farkliYazim` ile ayırt edilir.
 *
 * @param {Array<string|object>} kayitlar  ad dizisi ya da {name} nesneleri
 * @returns {{anahtar:string, ad:string, adlar:string[], kayitlar:object[],
 *            farkliYazim:boolean}[]}
 */
export function mukerrerGruplar(kayitlar) {
  const gruplar = new Map();
  (kayitlar || []).forEach((k) => {
    const tamAd = typeof k === 'string' ? k : metin(k && k.name);
    const anahtar = kisiAnahtari(tamAd);
    if (!anahtar) return;
    if (!gruplar.has(anahtar)) gruplar.set(anahtar, { anahtar, kayitlar: [] });
    gruplar.get(anahtar).kayitlar.push(typeof k === 'string' ? { name: k } : k);
  });
  return [...gruplar.values()]
    .filter((g) => g.kayitlar.length > 1)
    .map((g) => {
      const adlar = [...new Set(g.kayitlar.map((x) => metin(x.name)))];
      return {
        anahtar: g.anahtar,
        ad: unvansizAd(metin(g.kayitlar[0].name)),
        adlar,
        kayitlar: g.kayitlar,
        // İki kayıt AYNI metinse dedupe-professors.js çözer; metinler
        // FARKLIYSA (unvan değişmiş) birlestir-akademisyen.js gerekir.
        farkliYazim: adlar.length > 1,
      };
    })
    .sort((a, b) => a.ad.localeCompare(b.ad, 'tr'));
}

/**
 * Unvan "daha kıdemli" mi? Sıralama yalnız RAPORLAMA içindir; hangi kaydın
 * doğru olduğuna sistem KARAR VERMEZ — unvan yükselmiş de olabilir, yanlış
 * girilmiş de. Tarama betiği kıdemliyi "muhtemelen yeni" diye işaretler,
 * kararı insan verir.
 */
const KIDEM = [
  'Arş. Gör.',
  'Okutman',
  'Uzm.',
  'Uzman',
  'Öğr. Gör.',
  'Öğrt. Gör.',
  'Öğretim Görevlisi',
  'Arş. Gör. Dr.',
  'Dr. Arş. Gör.',
  'Uzman Dr.',
  'Dr.',
  'Öğr. Gör. Dr.',
  'Öğrt. Gör. Dr.',
  'Dr. Öğr. Gör.',
  'Dr. Öğrt. Gör.',
  'Öğr. Üyesi',
  'Öğrt. Üyesi',
  'Öğretim Üyesi',
  'Dr. Öğr. Üyesi',
  'Dr. Öğrt. Üyesi',
  'Doktor Öğretim Üyesi',
  'Doç.',
  'Doçent',
  'Doç. Dr.',
  'Prof.',
  'Profesör',
  'Prof. Dr.',
].map(normal);

/** Unvanın kıdem sırası; tanınmayan unvan -1. */
export function unvanKidemi(unvan) {
  return KIDEM.indexOf(normal(unvan));
}

/**
 * Giriş ekranının akademisyen listesi.
 *
 * ⚠ ESKİ SÜRÜM MÜKERRERLERİ GİZLİYORDU ve bu tehlikeliydi: unvanı farklı iki
 * kayıt AYRI KİMLİKTİR (ayrı şifre, ayrı yetki). Gizlenen kimliğe bu ekrandan
 * ulaşılamıyor — ad elle yazılamıyor, yalnız listeden seçiliyor — yani şifresi
 * gizlenen kayda bağlı olan kişi GİRİŞ YAPAMAZ hâle geliyordu. Üstelik hangi
 * kaydın kalacağı "daha uzun ad kazanır" kuralına bağlıydı; iki ad aynı
 * uzunluktaysa sonuç veritabanının sırasına göre değişiyordu.
 *
 * Kural:
 *   • BİREBİR AYNI ad tek satıra iner (aynı kimliğin ikinci satırı bilgi
 *     taşımaz),
 *   • unvanı farklı kayıtlar GÖRÜNÜR kalır,
 *   • sıralama KİŞİYE göredir; aynı kişinin varyantları yan yana gelir ki
 *     yetkili durumu fark etsin ve birleştirsin.
 */
export function girisListesi(profiller) {
  const gorulen = new Set();
  return (profiller || [])
    .filter((p) => {
      const ad = metin(p && p.name);
      if (!ad || gorulen.has(ad)) return false;
      gorulen.add(ad);
      return true;
    })
    .sort((a, b) => {
      const k = kisiAnahtari(a.name).localeCompare(kisiAnahtari(b.name), 'tr');
      return k !== 0 ? k : metin(a.name).localeCompare(metin(b.name), 'tr');
    });
}
