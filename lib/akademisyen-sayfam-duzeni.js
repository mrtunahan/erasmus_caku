/**
 * AKADEMİSYEN "BENİM SAYFAM" — SAYFA DÜZENİ
 *
 * Sayfa üstte bir SEKME ŞERİDİ, altında o sekmenin içeriği:
 *
 *   Genel Bakış      · üç sütun (bilgiler · ders programı · randevu)
 *   Dijital Yoklama  · karekod oturumu ve devamsızlık
 *   Görüşme Saatlerim· ders programı üzerinde randevuya açık saatler
 *   Veri Girişi      · performans göstergeleri (performans modülünden taşındı)
 *
 * ⚠ SEKMELER AÇILIR PENCERE DEĞİL. Öğrenci tarafında Derslerim ve Mezuniyet
 * pencere olarak açılıyor; orada içerik okunup kapatılan bir şey. Burada ise
 * Veri Girişi on iki aylık bir tablo ve Görüşme Saatleri haftalık bir ızgara:
 * ikisi de üzerinde ÇALIŞILAN ekranlar, pencereye sıkıştırılmaz. Bu yüzden
 * sekme tıklanınca içerik yerinde değişir.
 *
 * Genel Bakış'ın sütunları:
 *   SOL   · akademisyen bilgileri, verdiği dersler
 *   ORTA  · haftalık ders programı
 *   SAĞ   · randevu talepleri, bugünün dersleri
 */

const metin = (v) => String(v == null ? '' : v).trim();

/** Genel Bakış'ın sütunları — sıra ekrandaki sırayla aynıdır. */
export const AKADEMISYEN_SUTUNLARI = [
  { id: 'sol', etiket: 'Akademisyen', kartlar: ['bilgiler', 'dersler'] },
  { id: 'orta', etiket: 'Ders programı', kartlar: ['program'] },
  { id: 'sag', etiket: 'Randevu ve bugün', kartlar: ['randevular', 'bugun'] },
];

/**
 * Sekmeler.
 *
 * `yetki`:
 *   ''      → herkese açık
 *   'ders'  → adına tanımlı dersi olan akademisyen
 *   'akad'  → sistemde akademisyen kaydı bulunan kişi
 */
export const AKADEMISYEN_SEKMELERI = [
  { id: 'genel', baslik: 'Genel Bakış', ikon: 'pano', yetki: '' },
  { id: 'yoklama', baslik: 'Dijital Yoklama', ikon: 'karekod', yetki: 'ders' },
  { id: 'gorusme', baslik: 'Görüşme Saatlerim', ikon: 'saat', yetki: '' },
  { id: 'veri', baslik: 'Veri Girişi', ikon: 'kalem', yetki: 'akad' },
];

/** Bir sekmenin yetki koşulu sağlanıyor mu? */
function sekmeAcikMi(sekme, yetkiler) {
  const y = yetkiler || {};
  switch (metin(sekme && sekme.yetki)) {
    case 'ders':
      return !!y.ders;
    case 'akad':
      return !!y.akademisyen;
    default:
      return true;
  }
}

/**
 * Kullanıcının görebildiği sekmeler.
 *
 * ⚠ GENEL BAKIŞ HER ZAMAN AÇIKTIR. Yetki listesi boş gelse bile en az bir
 * sekme kalmalı; aksi hâlde sayfa sekmesiz ve içeriksiz açılırdı.
 */
export function acikSekmeler(yetkiler) {
  const liste = AKADEMISYEN_SEKMELERI.filter((s) => sekmeAcikMi(s, yetkiler));
  return liste.length > 0 ? liste : [AKADEMISYEN_SEKMELERI[0]];
}

/** Sekme açık mı? */
export function sekmeVarMi(sekmeId, yetkiler) {
  return acikSekmeler(yetkiler).some((s) => s.id === metin(sekmeId));
}

/**
 * Kapalı bir sekmede kalınmaz.
 * Ders listesi asenkron geliyor: kullanıcı "Dijital Yoklama"dayken yetki
 * kısa süreliğine kapalı görünürse ekran altından kaymasın diye düzeltme
 * yalnız GERÇEKTEN kapalı sekme için yapılır, yoksa gelen değer korunur.
 */
export function sekmeDuzelt(sekmeId, yetkiler) {
  const s = metin(sekmeId);
  if (sekmeVarMi(s, yetkiler)) return s;
  return acikSekmeler(yetkiler)[0].id;
}

/** Bir kartın hangi sütunda olduğu — bilinmiyorsa ''. */
export function kartinSutunu(kartId) {
  const k = metin(kartId);
  const s = AKADEMISYEN_SUTUNLARI.find((x) => x.kartlar.includes(k));
  return s ? s.id : '';
}

/**
 * Sekme başlığının altındaki tek satırlık özet.
 * Sekmeye tıklamadan önce orada ne olduğu görünsün diye.
 */
export function sekmeOzeti(sekmeId, veri) {
  const d = veri || {};
  switch (metin(sekmeId)) {
    case 'genel': {
      const n = Number(d.dersSaati) || 0;
      return n > 0 ? n + ' ders saati' : 'Programınız ve bilgileriniz';
    }
    case 'yoklama': {
      const n = Number(d.dersSayisi) || 0;
      return n > 0 ? n + ' ders · karekodla' : 'Ders bulunamadı';
    }
    case 'gorusme': {
      const n = Number(d.acikSaat) || 0;
      return n > 0 ? n + ' saat açık' : 'Henüz saat açmadınız';
    }
    case 'veri': {
      const y = metin(d.yil);
      return y ? y + ' göstergeleri' : 'Performans göstergeleri';
    }
    default:
      return '';
  }
}

/** Sekme şeridinin tamamı: tanım + o anki özet. */
export function sekmeSeridi(yetkiler, veri) {
  return acikSekmeler(yetkiler).map((s) => ({ ...s, ozet: sekmeOzeti(s.id, veri) }));
}
