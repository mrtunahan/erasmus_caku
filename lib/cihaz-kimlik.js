/**
 * CİHAZ KİMLİĞİ — "arkadaşımın hesabına girip yoklama verdim" saldırısı.
 *
 * Tehdit: A öğrencisi şifresini B'ye verir; B kendi telefonundan A'nın
 * hesabına girip karekodu okutur, A evdeyken yoklamada görünür. Dönen
 * karekod bunu engellemez — kod gerçekten o sınıftan, o anda okunmuştur.
 *
 * ── İKİ AYRI KONTROL, İKİ AYRI GÜCÜ VAR ──
 *
 * 1) OTURUM İÇİ TEKİLLİK (güçlü, yanlış alarmı düşük)
 *    Bir yoklama oturumunda BİR CİHAZ BİR ÖĞRENCİ. B kendi yoklamasını
 *    verip sonra A'nın hesabına geçse de, aynı cihaz aynı oturumda ikinci
 *    bir öğrenci için kod okutamaz.
 *    ⚠ Bu kontrolün doğru çalışması için parmak izinin evrensel olarak
 *    benzersiz olması GEREKMEZ — yalnız bir ders saati boyunca kararlı
 *    olması yeter. Parmak izi tam da bunu iyi yapar.
 *
 * 2) HESABA CİHAZ BAĞLAMA (zayıf ama caydırıcı + iz bırakır)
 *    Öğrencinin hesabı ilk yoklamada kullandığı cihaza bağlanır. Başka bir
 *    cihazdan yoklama verilirse dönemlik kota düşer ve kayıt "yeni cihaz"
 *    diye işaretlenir; akademisyen listede bunu görür.
 *    ⚠ Bu kontrol tek başına GÜVENLİK DEĞİLDİR: telefon değiştiren,
 *    tarayıcı verisini silen, gizli sekme kullanan öğrenci de "yeni cihaz"
 *    görünür. Bu yüzden kilitlemez, kotayla esner ve akademisyen sıfırlar.
 *
 * ── NE YAPMAZ ──
 * Parmak izi tarayıcıdan gelir; geliştirici konsolunu açabilen biri onu
 * değiştirebilir. Bu katman "şifreni ver" kolaylığını ortadan kaldırır,
 * kararlı ve teknik bir saldırganı durdurmaz. Son söz her zaman
 * akademisyenin canlı listesindedir (orada elle Var/Yok yapılabiliyor).
 */

import { onaltilik, sha256 } from './hmac-sha256.js';

/** Tarayıcıda saklanan cihaz kimliğinin anahtarı. */
export const CIHAZ_ANAHTARI = 'caku_cihaz_kimligi';

/** Dönem başına cihaz değiştirme hakkı. */
export const DEGISIM_KOTASI = 2;

const metin = (v) => String(v == null ? '' : v).trim();

/**
 * Tarayıcı kimliğinden SÜRÜM NUMARALARINI atar.
 *
 * ⚠ Ham `userAgent` her tarayıcı güncellemesinde değişir. Olduğu gibi
 * kullanılsaydı Chrome güncellenen her öğrenci "cihaz değiştirdi" sayılır,
 * kota bir haftada tükenirdi. Sürümler silinince geriye cihazın kendisini
 * anlatan kısım kalır.
 */
export function surumsuzAjan(ham) {
  return metin(ham)
    .replace(/\d+(\.\d+)+/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

/**
 * Sinyallerden parmak izi üretir (24 haneli onaltılık).
 * Sinyaller tarayıcıdan toplanır; bu dosya yalnız birleştirip özetler.
 */
export function parmakIzi(sinyaller) {
  const s = sinyaller || {};
  const parcalar = [
    surumsuzAjan(s.ajan),
    metin(s.platform).toLowerCase(),
    metin(s.dil).toLowerCase(),
    metin(s.saatDilimi),
    metin(s.ekran),
    metin(s.pikselOrani),
    metin(s.cekirdek),
    metin(s.bellek),
    metin(s.dokunma),
  ];
  // Hiç sinyal yoksa sabit bir özet üretip herkesi aynı cihaz saymak
  // felaket olurdu: boş iz döner, çağıran bunu "bilinmiyor" sayar.
  if (parcalar.every((p) => !p)) return '';
  return onaltilik(sha256(parcalar.join('|'))).slice(0, 24);
}

/** Cihaz kimliği (tarayıcıda saklanan rastgele değer). */
export function cihazKimligiUret(rastgele) {
  const r = metin(rastgele);
  return 'ch-' + (r || String(Date.now()) + Math.random().toString(36).slice(2, 10));
}

/** Kimlik ya da parmak izi tutuyorsa AYNI cihazdır. */
export function ayniCihazMi(a, b) {
  const x = a || {};
  const y = b || {};
  if (metin(x.id) && metin(x.id) === metin(y.id)) return true;
  if (metin(x.iz) && metin(x.iz) === metin(y.iz)) return true;
  return false;
}

/**
 * Bu oturumda bu cihaz BAŞKA bir öğrenci için kullanılmış mı?
 *
 * ⚠ ASIL KORUMA BURASI. "Kendi yoklamamı verdim, şimdi de arkadaşımınkini
 * vereyim" saldırısı tam olarak burada kırılır. Kimlik SİLİNSE bile parmak
 * izi eşleşir (gizli sekme / çerez temizleme bu kontrolü atlatamaz).
 */
export function oturumdaBaskasiKullandiMi(kayitlar, cihaz, ogrenciNo) {
  const no = metin(ogrenciNo);
  const bulunan = (Array.isArray(kayitlar) ? kayitlar : []).find(
    (k) =>
      k && metin(k.studentNumber) !== no && ayniCihazMi({ id: k.cihazId, iz: k.cihazIz }, cihaz)
  );
  return bulunan ? { cakisma: true, ogrenciNo: metin(bulunan.studentNumber) } : { cakisma: false };
}

/**
 * Öğrencinin kayıtlı cihazıyla karşılaştırma.
 *
 * Dönüş `durum`:
 *   'yeni'    → kayıtlı cihazı yok; bu cihaz bağlanır
 *   'ayni'    → kayıtlı cihazla aynı
 *   'degisti' → farklı cihaz, kota var; bağlanır ve kota düşer
 *   'kilitli' → farklı cihaz, kota bitti; akademisyen sıfırlamalı
 *   'bilinmiyor' → cihazdan hiçbir sinyal gelmedi
 */
export function baglamaKarari(kayit, cihaz, secenekler) {
  const c = cihaz || {};
  const s = secenekler || {};
  const kota = Number.isFinite(Number(s.kota)) ? Number(s.kota) : DEGISIM_KOTASI;
  const donem = metin(s.donem);

  if (!metin(c.id) && !metin(c.iz)) return { durum: 'bilinmiyor', kalanHak: kota };

  const k = kayit || null;
  if (!k || (!metin(k.cihazId) && !metin(k.cihazIz))) {
    return { durum: 'yeni', kalanHak: kota, baglanacak: true };
  }
  if (ayniCihazMi({ id: k.cihazId, iz: k.cihazIz }, c)) {
    return { durum: 'ayni', kalanHak: kalanDegisimHakki(k, kota, donem) };
  }
  const kalan = kalanDegisimHakki(k, kota, donem);
  if (kalan <= 0) return { durum: 'kilitli', kalanHak: 0 };
  return { durum: 'degisti', kalanHak: kalan - 1, baglanacak: true };
}

/**
 * Dönem içinde kalan cihaz değiştirme hakkı.
 * ⚠ Sayaç DÖNEM BAŞINA sıfırlanır: bir kere tükenen hak öğrenciyi
 * mezun olana kadar kilitleyemez.
 */
export function kalanDegisimHakki(kayit, kota, donem) {
  const k = kayit || {};
  const tavan = Number.isFinite(Number(kota)) ? Number(kota) : DEGISIM_KOTASI;
  if (donem && metin(k.donem) && metin(k.donem) !== metin(donem)) return tavan;
  const kullanilan = Math.max(0, Number(k.degisimSayisi) || 0);
  return Math.max(0, tavan - kullanilan);
}

/** Karardan sonra `student_devices` kaydına yazılacak gövde. */
export function baglamaYamasi(kayit, cihaz, karar, secenekler) {
  const c = cihaz || {};
  const s = secenekler || {};
  const donem = metin(s.donem);
  const k = kayit || {};
  const ayniDonem = !donem || !metin(k.donem) || metin(k.donem) === donem;
  const oncekiSayac = ayniDonem ? Math.max(0, Number(k.degisimSayisi) || 0) : 0;
  return {
    cihazId: metin(c.id),
    cihazIz: metin(c.iz),
    donem,
    degisimSayisi: karar && karar.durum === 'degisti' ? oncekiSayac + 1 : oncekiSayac,
    sonGuncelleme: metin(s.zaman) || new Date().toISOString(),
  };
}

/** Öğrenciye gösterilecek karşılık. */
export function cihazMesaji(sebep, ek) {
  const e = ek || {};
  switch (sebep) {
    case 'cihaz_paylasimi':
      return (
        'Bu cihazdan bu derste zaten başka bir öğrenci yoklama verdi. Her öğrenci kendi ' +
        'cihazından okutmalıdır.'
      );
    case 'cihaz_kilitli':
      return (
        'Bu dönem için cihaz değiştirme hakkınız doldu. Yoklamanızı akademisyeninize ' +
        'bildirin; cihaz kaydınızı sıfırlayabilir.'
      );
    case 'cihaz_degisti':
      return (
        'Yoklamanız YENİ BİR CİHAZDAN alındı ve akademisyeninize bu şekilde görünecek.' +
        (Number.isFinite(Number(e.kalanHak))
          ? ' Bu dönem kalan cihaz değiştirme hakkınız: ' + Number(e.kalanHak) + '.'
          : '')
      );
    default:
      return '';
  }
}

/** Akademisyenin listesinde satırın yanında duracak uyarı (yoksa ''). */
export function kayitUyarisi(kayit) {
  const k = kayit || {};
  if (k.cihazPaylasildi) return 'Bu cihazdan başka bir öğrenci de yoklama verdi.';
  if (k.yeniCihaz) return 'Yoklama yeni bir cihazdan verildi.';
  return '';
}
