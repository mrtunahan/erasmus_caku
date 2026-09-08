// ══════════════════════════════════════════════════════════════
// KAYIT DURUMU — "BU TALEPTE EKSİK BİR İŞ VAR MI?"
//
// Yaz dönemi intibakı dört aşamada yürüyor (Ön Onay → Yaz Okulu → Belge →
// Tamamlandı) ve her aşamada topu tutan taraf değişiyor. Liste ekranı bunu
// hiç göstermiyordu: bütün kartlar aynı görünüyor, sıralama da kaydın
// geldiği rastgele düzendi. Yetkili hangi öğrencide ne beklediğini kartı
// açmadan göremiyordu.
//
// Durum kaydın kendisinden ÇIKARILIR, ayrı bir alanda tutulmaz — ikinci bir
// alan tutmak, aşama değiştikçe eskiyen bir kopya demek olurdu.
//
// ⚠ "Not eksik" TAMAMLANMIŞ kayıtlarda da işaretlenir. Sebebi somut: belgede
// başarı notu yer tutucuları `ogrenciNotlari`den doluyor; not okunamamışsa
// memur yazısı BOŞ sütunla üretiliyor ve kimse fark etmiyordu.
// ══════════════════════════════════════════════════════════════

import { notsuzSatirlar } from './muafiyet-belge-notu.js';

const metin = (v) => String(v == null ? '' : v).trim();

/** Sıralama ve renk için durum tanımları. `sira` küçükse listede yukarıda. */
export const KAYIT_DURUMLARI = {
  karar_bekliyor: {
    id: 'karar_bekliyor',
    etiket: 'Karar bekliyor',
    kimde: 'Akademisyen',
    renk: '#B45309',
    bg: '#FEF3C7',
    sira: 0,
    eksik: true,
  },
  not_eksik: {
    id: 'not_eksik',
    etiket: 'Not eksik',
    kimde: 'Akademisyen',
    renk: '#ba1a1a',
    bg: '#ffdad6',
    sira: 1,
    eksik: true,
  },
  belge_bekleniyor: {
    id: 'belge_bekleniyor',
    etiket: 'Belge bekleniyor',
    kimde: 'Öğrenci',
    renk: '#1D4ED8',
    bg: '#DBEAFE',
    sira: 2,
    eksik: true,
  },
  tamam: {
    id: 'tamam',
    etiket: 'Tamamlandı',
    kimde: '',
    renk: '#047857',
    bg: '#ECFDF5',
    sira: 3,
    eksik: false,
  },
};

export function intibakMi(kayit) {
  return metin(kayit && kayit.basvuruTuru) === 'intibak';
}

export function intibakAsamasi(kayit) {
  return metin(kayit && kayit.stage) || 'on_inceleme';
}

/** Karar bekleyen ders satırı sayısı. */
export function bekleyenSatirSayisi(kayit) {
  const k = kayit || {};
  if (Number.isFinite(k.pendingReviewCount)) return Math.max(0, k.pendingReviewCount);
  return (k.matches || []).filter((m) => m && !m.adminDecision).length;
}

/**
 * Kaydın durumu — kart rengi ve sıralama buradan gelir.
 *
 * Sıra bilinçli: önce AKADEMİSYENİN yapacağı işler (karar, not), sonra
 * ÖĞRENCİDEN beklenenler, en sonda tamamlananlar. Yetkili ekranı açtığında
 * kendi kuyruğunu en üstte görür.
 */
export function kayitDurumu(kayit) {
  if (!kayit) return KAYIT_DURUMLARI.tamam;
  if (bekleyenSatirSayisi(kayit) > 0) return KAYIT_DURUMLARI.karar_bekliyor;
  if (!intibakMi(kayit)) return KAYIT_DURUMLARI.tamam;

  const asama = intibakAsamasi(kayit);
  // Yaz okulu sürüyor: top öğrencide, başarı belgesini yüklemesi bekleniyor.
  if (asama === 'on_inceleme' || asama === 'on_onay') return KAYIT_DURUMLARI.belge_bekleniyor;
  // Belge geldi ya da süreç bitti: notu okunamayan satır varsa belge boş
  // sütunla üretilir — bu yüzden 'tamamlandi' aşamasında da işaretlenir.
  if (notsuzSatirlar(kayit).length > 0) return KAYIT_DURUMLARI.not_eksik;
  if (asama === 'belge_teslim') return KAYIT_DURUMLARI.karar_bekliyor;
  return KAYIT_DURUMLARI.tamam;
}

/** Kartta gösterilecek kısa açıklama — ne eksik, kimde? */
export function durumAciklamasi(kayit) {
  const d = kayitDurumu(kayit);
  if (!d.eksik) return '';
  if (d.id === 'karar_bekliyor') {
    const n = bekleyenSatirSayisi(kayit);
    return n > 0 ? n + ' ders kararı bekliyor' : 'Belge onayı bekliyor';
  }
  if (d.id === 'not_eksik') {
    const n = notsuzSatirlar(kayit).length;
    return n + ' derste başarı notu okunamadı';
  }
  return 'Öğrencinin başarı belgesi bekleniyor';
}

const trAd = (k) => metin(k && (k.studentName || k.studentNo)).toLocaleUpperCase('tr');

/**
 * Liste sırası: önce eksik işler (kendi aciliyetlerine göre), sonra
 * tamamlananlar; her grup içinde ad-soyada göre Türkçe sıralama.
 *
 * Girdi dizisi DEĞİŞTİRİLMEZ — çağıran aynı diziyi başka yerde de kullanıyor.
 */
export function kayitlariSirala(kayitlar) {
  return (Array.isArray(kayitlar) ? kayitlar.slice() : []).sort((a, b) => {
    const fark = kayitDurumu(a).sira - kayitDurumu(b).sira;
    if (fark !== 0) return fark;
    const ad = trAd(a).localeCompare(trAd(b), 'tr');
    if (ad !== 0) return ad;
    return metin(a && a.studentNo).localeCompare(metin(b && b.studentNo), 'tr');
  });
}

/** Sekme başlığında gösterilecek sayaç: kaç kayıtta eksik iş var? */
export function eksikSayisi(kayitlar) {
  return (Array.isArray(kayitlar) ? kayitlar : []).filter((k) => kayitDurumu(k).eksik).length;
}
