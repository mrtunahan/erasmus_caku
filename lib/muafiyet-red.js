// ══════════════════════════════════════════════════════════════
// MUAFİYET REDDİ — GEREKÇE ZORUNLU, ÖĞRENCİ HABERDAR
//
// Akademisyen onaya düşen bir ders eşleştirmesini reddettiğinde eskiden tek
// bir tıklama yetiyordu: karar `rejected` olarak yazılıyor, `adminNote` alanı
// BOŞ kalıyordu (çağrı zaten sabit '' geçiyordu). Öğrenci ekranında yalnız
// "Reddedildi" görünüyor, NEDEN reddedildiği hiçbir yerde yazmıyordu.
//
// Sonuç iki taraflı zarar: öğrenci itiraz mı etsin, belge mi tamamlasın,
// başka ders mi göstersin bilemiyor; akademisyen de aynı soruyu yüz yüze
// ikinci kez cevaplamak zorunda kalıyor. Üstelik red bir İDARİ KARAR —
// gerekçesi kayıtta durmalı.
//
// Bu dosya iki kuralı sabitler:
//   1) Gerekçe zorunlu ve anlamlı olmalı (boşluk ya da "x" geçmez).
//   2) Reddin öğrenciye giden bildirim metni gerekçeyi İÇERİR.
// ══════════════════════════════════════════════════════════════

/** Gerekçenin taşıması gereken en az anlamlı karakter sayısı. */
export const EN_AZ_GEREKCE = 10;

function metin(d) {
  return String(d == null ? '' : d).trim();
}

/**
 * Red gerekçesi geçerli mi?
 *
 * Uzunluk eşiği keyfî değil: "yok", "olmaz", "hayır" gibi cevaplar öğrenciye
 * hiçbir şey anlatmıyor. On karakter, en azından bir cümlecik demek.
 *
 * @returns {{gecerli: boolean, hata: string}}
 */
export function gerekceGecerliMi(gerekce) {
  const g = metin(gerekce);
  if (!g) return { gecerli: false, hata: 'Red gerekçesi zorunludur.' };
  if (g.length < EN_AZ_GEREKCE) {
    return {
      gecerli: false,
      hata: `Red gerekçesi en az ${EN_AZ_GEREKCE} karakter olmalı — öğrenci ne yapması gerektiğini anlamalı.`,
    };
  }
  return { gecerli: true, hata: '' };
}

/** Karar reddetme mi? (farklı ekranlarda farklı sözcükler kullanılıyor) */
export function redKarariMi(karar) {
  const k = metin(karar).toLowerCase();
  return k === 'rejected' || k === 'red' || k === 'on_red';
}

/**
 * Karar kaydedilebilir mi? Red ise gerekçe aranır, onayda aranmaz.
 * @returns {{gecerli: boolean, hata: string}}
 */
export function kararGecerliMi(karar, gerekce) {
  if (!redKarariMi(karar)) return { gecerli: true, hata: '' };
  return gerekceGecerliMi(gerekce);
}

/** Dersin çıktıda görünecek adı — kod varsa "KOD — Ad", yoksa yalnız ad. */
export function dersEtiketi(ders) {
  const d = ders || {};
  const kod = metin(d.code);
  const ad = metin(d.name);
  if (kod && ad) return `${kod} — ${ad}`;
  return kod || ad || 'Ders';
}

/**
 * Öğrenciye gidecek bildirim.
 *
 * Gerekçe GÖVDEDE yer alır: başlıkta "reddedildi" yazıp gerekçeyi kayda
 * gömmek, öğrencinin yine sormasına yol açardı.
 */
export function redBildirimi(secenek) {
  const s = secenek || {};
  const ders = dersEtiketi(s.ders);
  const tur = metin(s.turEtiketi) || 'Ders muafiyet';
  const kim = metin(s.karariVeren);
  return {
    studentNumber: metin(s.ogrenciNo),
    module: 'muafiyet',
    type: 'red',
    title: `${tur} talebiniz için bir ders reddedildi`,
    body:
      `${ders} dersi için muafiyet talebiniz reddedildi.\n` +
      `Gerekçe: ${metin(s.gerekce)}` +
      (kim ? `\nKararı veren: ${kim}` : ''),
    meta: {
      recordId: metin(s.kayitId),
      matchIndex: Number.isFinite(s.eslesmeIndeksi) ? s.eslesmeIndeksi : null,
      ders,
      gerekce: metin(s.gerekce),
    },
  };
}
