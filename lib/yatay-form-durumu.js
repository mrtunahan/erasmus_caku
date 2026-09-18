// ══════════════════════════════════════════════════════════════
// YATAY GEÇİŞ BAŞVURU FORMU — NE EKSİK?
//
// ⚠ ESKİDEN EKSİKLER YALNIZ "GÖNDER"E BASINCA GÖRÜNÜYORDU: aday formu
// doldurup gönderiyor, karşısına bir liste çıkıyor, yukarı çıkıp arıyordu.
// Hangi alanın neden istendiği de yalnız o listede yazıyordu.
//
// Kural buraya alındı: ekran artık her tuşta "neyin eksik olduğunu" bilir,
// ilerlemeyi gösterebilir ve gönder düğmesinin yanında eksikleri sayabilir.
// Kural TEK yerde durduğu için de form ile gönderim aynı şeyi söyler.
//
// ── ZORUNLU OLAN VE OLMAYAN ──
// Zorunluluk geçiş türüne göre değişir: kurum içi geçişte YKS puanı ve not
// ortalaması hiç istenmez (karar bölüm kurulunundur), kurumlararasında
// ikisi de şarttır. Ek Madde-1 beyanı hiçbir türde zorunlu DEĞİLDİR —
// bilinmeyen bir şart, başvuru engeli değil personelin tespit edeceği bir
// açıktır.
// ══════════════════════════════════════════════════════════════

import { gnoDogrula, siraOku } from './yatay-kriter.js';

const metin = (v) => String(v == null ? '' : v).trim();

/**
 * Geçiş türüne göre zorunlu METİN alanları.
 * @param {{id:string, puanIster?:boolean, notIster?:boolean}} tur
 * @param {{vekaleten?:boolean}} [secenek]
 * @returns {{anahtar:string, etiket:string}[]} formdaki sırasıyla
 */
export function zorunluAlanlar(tur, secenek) {
  const t = tur || {};
  const o = secenek || {};
  const liste = [];
  // Vekâleten açılan kayıtta adayın ADI zorunlu; NUMARA değil — bu akış
  // zaten "numarası henüz yok" diye var, boşsa geçici numara üretilir.
  if (o.vekaleten) liste.push({ anahtar: 'adayAdSoyad', etiket: 'Aday adı soyadı' });
  liste.push({ anahtar: 'aktifUniversite', etiket: 'Aktif üniversite' });
  liste.push({ anahtar: 'aktifBolum', etiket: 'Aktif bölüm' });
  liste.push({ anahtar: 'basvurduguFakulte', etiket: 'Başvurulan fakülte' });
  liste.push({ anahtar: 'basvurduguBolum', etiket: 'Başvurulan bölüm' });
  liste.push({ anahtar: 'basvurduguSinif', etiket: 'Başvurduğu sınıf' });
  if (t.puanIster) {
    liste.push({ anahtar: 'yksYerlesmeYili', etiket: 'YKS yerleşme yılı' });
    liste.push({ anahtar: 'yksPuanTuru', etiket: 'Puan türü' });
    liste.push({ anahtar: 'yksPuani', etiket: 'YKS puanı' });
    liste.push({ anahtar: 'yksBasariSirasi', etiket: 'Yerleştirme başarı sıralaması' });
  }
  if (t.notIster) liste.push({ anahtar: 'notOrtalamasi', etiket: 'Not ortalaması' });
  return liste;
}

/**
 * Boş kalan ya da BİÇİMİ BOZUK alanlar.
 *
 * Biçim denetimi buraya ait: "girildi ama okunamıyor" da eksiktir. Başarı
 * sıralaması okunamazsa aday hiçbir kritere göre değerlendirilemez, 4'lük
 * sistemden girilen AGNO ise sıralama puanını sessizce bozar.
 */
export function alanEksikleri(tur, form, secenek) {
  const f = form || {};
  const eksik = [];
  zorunluAlanlar(tur, secenek).forEach((a) => {
    if (!metin(f[a.anahtar])) {
      eksik.push({ tur: 'alan', anahtar: a.anahtar, etiket: a.etiket, sebep: 'bos' });
    }
  });
  const doluMu = (k) => !!metin(f[k]);
  if ((tur || {}).notIster && doluMu('notOrtalamasi')) {
    const g = gnoDogrula(f.notOrtalamasi);
    if (g.hata) {
      eksik.push({
        tur: 'alan',
        anahtar: 'notOrtalamasi',
        etiket: 'Not ortalaması (100’lük, 0-100)',
        sebep: 'bicim',
      });
    }
  }
  if ((tur || {}).puanIster && doluMu('yksBasariSirasi') && siraOku(f.yksBasariSirasi) == null) {
    eksik.push({
      tur: 'alan',
      anahtar: 'yksBasariSirasi',
      etiket: 'Yerleştirme başarı sıralaması (yalnız rakam, ör. 245.678)',
      sebep: 'bicim',
    });
  }
  return eksik;
}

/** Yüklenmemiş ZORUNLU ekler. İsteğe bağlı ekler eksik sayılmaz. */
export function ekEksikleri(ekTanimlari, ekler) {
  const yuklu = ekler || {};
  return (ekTanimlari || [])
    .filter((e) => e && e.zorunlu)
    .filter((e) => !yuklu[e.id])
    .map((e) => ({ tur: 'ek', anahtar: e.id, etiket: e.title || e.id, sebep: 'bos' }));
}

/**
 * Formun bütün durumu — ilerleme çubuğu, eksik listesi ve gönder düğmesi
 * hep bunu okur.
 *
 * `ekTanimlari` bu türde istenen ekler: `{id, title, zorunlu}` — zorunluluğun
 * türe göre çözülmesi çağıranın işi (modülde ygEkZorunlu).
 *
 * @returns {{eksikler:Array, alanEksigi:number, ekEksigi:number,
 *   gerekli:number, tamam:number, oran:number, gonderilebilir:boolean,
 *   ozet:string}}
 */
export function formDurumu(girdi) {
  const g = girdi || {};
  const alanlar = zorunluAlanlar(g.tur, g);
  const zorunluEkler = (g.ekTanimlari || []).filter((e) => e && e.zorunlu);
  const alanEksik = alanEksikleri(g.tur, g.form, g);
  const ekEksik = ekEksikleri(g.ekTanimlari, g.ekler);
  const gerekli = alanlar.length + zorunluEkler.length;
  // Biçimi bozuk alan iki kez sayılmasın: eksik SAYISI değil, eksik ALAN
  // sayısı ölçülür — aksi hâlde ilerleme çubuğu geriye gidebilirdi.
  const eksikAnahtarlar = new Set(alanEksik.map((e) => e.anahtar));
  const tamam = Math.max(0, gerekli - eksikAnahtarlar.size - ekEksik.length);
  const eksikler = [...alanEksik, ...ekEksik];
  return {
    eksikler,
    alanEksigi: eksikAnahtarlar.size,
    ekEksigi: ekEksik.length,
    gerekli,
    tamam,
    oran: gerekli > 0 ? tamam / gerekli : 1,
    gonderilebilir: eksikler.length === 0,
    ozet: ozetMetni(eksikler, gerekli, tamam),
  };
}

/** "3 alan · 1 belge eksik" / "Tüm zorunlu alanlar tamam". */
export function ozetMetni(eksikler, gerekli, tamam) {
  const liste = eksikler || [];
  if (liste.length === 0) {
    return gerekli ? 'Tüm zorunlu alanlar tamam (' + tamam + '/' + gerekli + ')' : 'Hazır';
  }
  const alan = new Set(liste.filter((e) => e.tur === 'alan').map((e) => e.anahtar)).size;
  const ek = liste.filter((e) => e.tur === 'ek').length;
  const parca = [];
  if (alan) parca.push(alan + ' alan');
  if (ek) parca.push(ek + ' belge');
  return parca.join(' · ') + ' eksik';
}

/** Bir alan şu an eksik mi? Etiketin yanında kırmızı işaret için. */
export function alanEksikMi(durum, anahtar) {
  return !!(durum && (durum.eksikler || []).some((e) => e.anahtar === anahtar));
}
