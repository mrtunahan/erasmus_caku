// ══════════════════════════════════════════════════════════════
// MEZUNİYET BAŞVURUSUNUN HESABI — ekran (mezuniyet-modulu.jsx) ve sunucu
// betiği (server/mezuniyet-yeniden-hesapla.js) AYNI işlevi kullanır.
//
// Başvuruda transkriptin HAM satırları saklanır; durum (geçti/kaldı/belirsiz)
// her açılışta bölümün GÜNCEL kurallarıyla yeniden hesaplanır. Kayıtta
// saklanan tek türev `ozet`tir (listedeki AKTS ve sarı satır sayısı,
// dilekçedeki AKTS yedeği); kurallar değişince o bayatlar ve sunucu
// betiğiyle tazelenir.
// ══════════════════════════════════════════════════════════════
import { mezuniyetHesapla, mezNotDuzelt } from './mezuniyet.js';
import { kabulEdilenOneriler, eslesmeleriUygula } from './mezuniyet-eslestirme.js';

export function basvuruHesapla(basvuru, mufredat, kural) {
  const ham = (basvuru && Array.isArray(basvuru.dersler) ? basvuru.dersler : []).map((d) => ({
    kod: d.kod,
    ad: d.ad,
    akts: d.akts,
    not: mezNotDuzelt(d.not, d.puan, kural).not,
    yil: d.yil,
    yariyil: d.yariyil,
    statu: d.statu,
    esdeger: d.esdeger,
  }));
  // Danışmanın kabul ettiği eşleştirme önerileri (kodu/adı farklı dersler).
  const dersler = eslesmeleriUygula(ham, kabulEdilenOneriler(basvuru));
  if (dersler.length === 0) return null;
  return mezuniyetHesapla(mufredat, dersler, kural, {
    agno: basvuru.agno,
    transkriptAkts: basvuru.transkriptAkts,
    // Öğrencinin müfredatı: yalnız o müfredatın dersleri aranır.
    program: basvuru.program,
  });
}

export function basvuruOzeti(sonuc) {
  if (!sonuc) return null;
  return {
    gecilenAkts: sonuc.gecilenAkts,
    toplamAkts: sonuc.kural.toplamAkts,
    ihlalSayisi: sonuc.ihlalSayisi,
    kalanZorunlu: sonuc.kalanZorunlu.length,
    mezunOlabilir: sonuc.mezunOlabilir,
  };
}
