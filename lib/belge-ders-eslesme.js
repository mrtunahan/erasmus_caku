// ══════════════════════════════════════════════════════════════
// BELGEDEN OKUNAN DERS SATIRLARINI KAYITTAKİ DERSLERLE EŞLEME
//
// Yaz okulu intibakında öğrenci, karşı kurumdan aldığı başarı belgesini
// yükler; belgeden okunan ders satırları başvurudaki derslerle eşleştirilir
// ve notlar oradan doldurulur.
//
// ── ESKİ KURALIN İKİ KUSURU ──
// 1. Türkçe büyük I. Normalize şöyleydi: `I` → `ı`, ardından `ı` HARİÇ bir
//    beyaz liste (`[^a-z0-9ğüşöç]`) ile temizlik. Yani her büyük I sessizce
//    SİLİNİYORDU: "BIL101" → "bl101", ama belgedeki "BİL101" → "bil101".
//    Aynı ders, iki farklı anahtar; kod eşleşmesi hiç tutmuyordu.
// 2. Tam eşitlik. "Matematik I" ile "Matematik-1" aynı derstir; eski kural
//    ikisini de birbirine yabancı sayıyordu.
//
// ── YANLIŞ EŞLEŞME, EŞLEŞMEMEKTEN KÖTÜDÜR ──
// Eşleşme bir derse NOT yazıyor. Yanlış satırı bağlamak, öğrencinin
// transkriptine başka dersin notunu taşır ve kimse fark etmez. Bu yüzden
// gevşek ölçütler (ada göre içerme) yalnızca TEK aday varken kabul edilir;
// birden çok satır uyuyorsa eşleşme yapılmaz.
// ══════════════════════════════════════════════════════════════

const TR_ASCII = {
  ı: 'i',
  İ: 'i',
  I: 'i',
  ş: 's',
  Ş: 's',
  ğ: 'g',
  Ğ: 'g',
  ü: 'u',
  Ü: 'u',
  ö: 'o',
  Ö: 'o',
  ç: 'c',
  Ç: 'c',
  â: 'a',
  Â: 'a',
  î: 'i',
  Î: 'i',
  û: 'u',
  Û: 'u',
};

/**
 * Karşılaştırma anahtarı: Türkçe harfler ASCII'ye iner, harf/rakam dışı her
 * şey atılır. I ve İ'nin ikisi de 'i' olur — belge hangisini yazarsa yazsın
 * aynı anahtar çıkar.
 */
function asciiye(deger) {
  const ham = String(deger == null ? '' : deger);
  let s = '';
  for (const h of ham) s += TR_ASCII[h] || h;
  return s.toLowerCase();
}

export function metinAnahtari(deger) {
  return asciiye(deger).replace(/[^a-z0-9]/g, '');
}

/**
 * Ders kodunun çekirdeği: baştaki harf öbeği + ilk sayı öbeği.
 * "BİL 101", "BIL-101", "BIL101/A", "BIL101 (Yaz)" → hepsi "bil101".
 * Şube/dönem eki taşıyan belgelerde kodun kendisi bu kadarıdır.
 */
export function kodCekirdegi(kod) {
  // Ayraçlar KORUNARAK aranır. Önce silinseydi "BIL-101-2" → "bil1012"
  // olur, ders numarası ile şube numarası tek sayıya yapışırdı.
  const m = asciiye(kod).match(/^[^a-z0-9]*([a-z]+)[^a-z0-9]*(\d+)/);
  return m ? m[1] + m[2] : metinAnahtari(kod);
}

// Ders adlarındaki roma rakamı sonekleri: "Matematik I" ile "Matematik 1"
// aynı derstir. Yalnız SONDAKİ rakam çevrilir; ad içindeki "I" harfine
// dokunulmaz.
const ROMA = { i: '1', ii: '2', iii: '3', iv: '4', v: '5', vi: '6', vii: '7', viii: '8' };

/** Ders adı anahtarı — sondaki roma rakamı sayıya çevrilir. */
export function adAnahtari(ad) {
  const parcalar = String(ad == null ? '' : ad)
    .trim()
    .split(/[\s\-_.]+/)
    .filter(Boolean);
  if (parcalar.length > 1) {
    const son = metinAnahtari(parcalar[parcalar.length - 1]);
    if (ROMA[son]) parcalar[parcalar.length - 1] = ROMA[son];
  }
  return metinAnahtari(parcalar.join(''));
}

// Ada göre "içerme" eşleşmesinin altına inemeyeceği uzunluk. Kısa adlarda
// ("fizik", "kimya") içerme rastgele derslere denk gelirdi.
const EN_KISA_AD = 6;

/**
 * Bir dersi belgeden okunan satırlarla eşleştirir.
 *
 * @param satirlar belgeden okunan satırlar: [{kod, ad, not}]
 * @param ders     kayıttaki ders: {code, name}
 * @returns {satir, yontem} — yöntem: 'kod' | 'kod-cekirdek' | 'ad' | 'ad-icerme'
 *          Eşleşme yoksa {satir: null, yontem: ''}
 */
export function dersEslestir(satirlar, ders) {
  const liste = Array.isArray(satirlar) ? satirlar : [];
  const d = ders || {};
  const kod = metinAnahtari(d.code);
  const kodCekirdek = kodCekirdegi(d.code);
  const ad = adAnahtari(d.name);

  const yok = { satir: null, yontem: '' };
  if (!kod && !ad) return yok;

  // 1. Kodun tamamı birebir.
  let bulunan = liste.find((s) => kod && metinAnahtari(s.kod) === kod);
  if (bulunan) return { satir: bulunan, yontem: 'kod' };

  // 2. Kod çekirdeği: şube/dönem eki taşıyan belgeler için.
  bulunan = liste.find((s) => kodCekirdek && kodCekirdegi(s.kod) === kodCekirdek);
  if (bulunan) return { satir: bulunan, yontem: 'kod-cekirdek' };

  // 3. Ders adı birebir (roma rakamı sonekleri denkleştirilmiş).
  bulunan = liste.find((s) => ad && adAnahtari(s.ad) === ad);
  if (bulunan) return { satir: bulunan, yontem: 'ad' };

  // 4. Ada göre içerme — YALNIZ tek aday varsa. Belgedeki ad kayıttakinden
  //    uzun olabilir ("Genel Matematik I" / "Matematik I") ya da tersi.
  if (ad.length >= EN_KISA_AD) {
    const adaylar = liste.filter((s) => {
      const sa = adAnahtari(s.ad);
      return sa.length >= EN_KISA_AD && (sa.indexOf(ad) >= 0 || ad.indexOf(sa) >= 0);
    });
    if (adaylar.length === 1) return { satir: adaylar[0], yontem: 'ad-icerme' };
  }

  return yok;
}

/**
 * Belgeden okunan satırların özeti — kullanıcıya "0/1 bulundu" derken
 * BELGEDEN NE OKUNDUĞUNU da göstermek için. Eskiden bu bilgi hiç verilmiyor,
 * eşleşmeyince kimse nedenini göremiyordu.
 */
export function okunanlarOzeti(satirlar, enFazla = 6) {
  const liste = (Array.isArray(satirlar) ? satirlar : [])
    .map((s) => {
      const kod = String((s && s.kod) || '').trim();
      const ad = String((s && s.ad) || '').trim();
      return kod || ad;
    })
    .filter(Boolean);
  if (!liste.length) return '';
  const gosterilen = liste.slice(0, enFazla);
  return gosterilen.join(', ') + (liste.length > enFazla ? ` (+${liste.length - enFazla})` : '');
}
