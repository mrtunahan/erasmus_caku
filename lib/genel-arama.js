// ══════════════════════════════════════════════════════════════
// GENEL ARAMA (üst bant) — modül ve işlem eşleştirme
//
// Arama YETKİ TAŞIMAZ:
//   • Modül sonuçları yalnız kullanıcının menüsünde GÖRÜNEN modüllerden
//     üretilir (app-shell Sidebar'ın hesapladığı liste). Anahtar kelime
//     tablosu bir modül adını yalnız o modül zaten görünürse öne çıkarır;
//     kendi başına modül eklemez.
//   • İşlemler (şifre değiştir, bölüme geç…) çağıran tarafın verdiği
//     listedir; kullanıcıya sunulmayan işlem listeye hiç girmez.
//   • Öğrenci sonuçları sunucudan gelir (/api/db/genel-arama/ogrenci) ve
//     orada okumanın kapsam kuralıyla süzülür.
// ══════════════════════════════════════════════════════════════
import { trAnahtar } from './tr-metin.js';

/**
 * Modüllerin içinde yapılan işlerin aranabilir adları. Kullanıcı "dilekçe"
 * ya da "transkript" yazınca ilgili modülü bulabilsin. Yalnız GÖRÜNEN
 * modüllere uygulanır.
 */
export const MODUL_ANAHTARLARI = {
  mezuniyet: [
    'mezuniyet başvurusu',
    'transkript',
    'mezuniyet dilekçesi',
    'mezuniyet kuralları',
    'akts',
    'silinecek ders',
  ],
  muafiyet: ['muafiyet başvurusu', 'intibak', 'ders sayma', 'not dönüşümü'],
  staj: ['staj defteri', 'staj başvurusu', 'işyeri', 'staj değerlendirme', 'iş yeri eğitimi'],
  erasmus: ['learning agreement', 'öğrenim anlaşması', 'hareketlilik', 'yurt dışı'],
  dikeygecis: ['dikey geçiş başvurusu', 'dgs'],
  yataygecis: ['yatay geçiş başvurusu', 'kurumlararası', 'merkezi yerleştirme'],
  capyandal: ['çift anadal', 'yandal', 'çap başvurusu'],
  sinav: ['sınav programı', 'gözetmen', 'ara sınav', 'final', 'bütünleme'],
  dersprogrami: ['haftalık program', 'ders saatleri', 'derslik'],
  dersodalari: ['ders odası', 'duyuru', 'ödev', 'yoklama'],
  formlar: ['dilekçe', 'form', 'belge şablonu'],
  performans: ['akademik performans', 'yayın', 'teşvik'],
  benim: ['profil', 'derslerim', 'ders seçimi', 'not durumu'],
  benimakademik: ['profil', 'derslerim', 'danışmanlık', 'görüşme saatleri', 'randevu'],
  gelenbelgeler: ['gelen belgeler', 'giden belgeler', 'evrak', 'işleme al'],
  portal: ['öğrenci listesi', 'öğrenciler'],
  anket: ['anket', 'değerlendirme', 'form doldur'],
  kulupler: ['kulüp', 'etkinlik'],
  kullanici: ['kullanıcı ekle', 'şifre sıfırla', 'yetki'],
  dersyonetimi: ['müfredat', 'ders ekle', 'akts'],
  bolumyonetimi: ['bölüm ayarları', 'memur ataması'],
  akademiktakvim: ['takvim', 'son başvuru tarihi', 'tatil'],
  sablonlar: ['şablon', 'belge şablonu'],
  komisyonlar: ['komisyon', 'üyeler'],
  lisansustu: ['yüksek lisans', 'doktora', 'tez'],
};

/**
 * Bir metnin aramayla ne kadar eşleştiği. 0 = eşleşmiyor.
 * Baştan eşleşme > kelime başında eşleşme > içinde geçme.
 */
export function eslesmePuani(metin, aranan) {
  const q = trAnahtar(aranan);
  const m = trAnahtar(metin);
  if (!q || !m) return 0;
  if (m === q) return 100;
  if (m.startsWith(q)) return 80;
  if (m.split(' ').some((k) => k.startsWith(q))) return 60;
  if (m.includes(q)) return 40;
  // Çok kelimeli aramada her kelime geçiyorsa ("ders muaf" → "Ders Muafiyet").
  const kelimeler = q.split(' ').filter(Boolean);
  if (kelimeler.length > 1 && kelimeler.every((k) => m.includes(k))) return 30;
  return 0;
}

/**
 * Görünen modüllerden sonuç listesi.
 * @param {{id:string, ad:string}[]} gorunur  menüde görünen modüller
 * @param {string} aranan
 * @returns {{tur:'modul', id:string, ad:string, ipucu?:string, puan:number}[]}
 */
export function modulSonuclari(gorunur, aranan) {
  const q = trAnahtar(aranan);
  const liste = Array.isArray(gorunur) ? gorunur.filter((m) => m && m.id) : [];
  if (!q) return liste.map((m) => ({ tur: 'modul', id: m.id, ad: m.ad || m.id, puan: 1 }));
  const out = [];
  liste.forEach((m) => {
    const ad = m.ad || m.id;
    let puan = eslesmePuani(ad, q);
    let ipucu;
    (MODUL_ANAHTARLARI[m.id] || []).forEach((anahtar) => {
      const p = eslesmePuani(anahtar, q);
      // Anahtar kelime eşleşmesi doğrudan ad eşleşmesinin bir tık altında.
      if (p > 0 && p - 5 > puan) {
        puan = p - 5;
        ipucu = anahtar;
      }
    });
    if (puan > 0) out.push({ tur: 'modul', id: m.id, ad, ipucu, puan });
  });
  return out.sort((a, b) => b.puan - a.puan);
}

/**
 * Sunulan işlemlerden sonuç listesi.
 * @param {{id:string, ad:string, anahtarlar?:string[]}[]} islemler
 */
export function islemSonuclari(islemler, aranan) {
  const q = trAnahtar(aranan);
  const liste = Array.isArray(islemler) ? islemler.filter((i) => i && i.id) : [];
  if (!q) return liste.map((i) => ({ ...i, tur: 'islem', puan: 1 }));
  return liste
    .map((i) => ({
      ...i,
      tur: 'islem',
      puan: Math.max(
        eslesmePuani(i.ad, q),
        ...(i.anahtarlar || []).map((a) => eslesmePuani(a, q) - 5)
      ),
    }))
    .filter((i) => i.puan > 0)
    .sort((a, b) => b.puan - a.puan);
}

/** Öğrenci araması yapılabilir mi? Öğrenci ve aday başka öğrenci aramaz. */
export function ogrenciAramasiAcikMi(kullanici) {
  if (!kullanici) return false;
  if (kullanici.aday) return false;
  return kullanici.role !== 'student';
}
