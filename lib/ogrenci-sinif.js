// ══════════════════════════════════════════════════════════════
// ÖĞRENCİNİN SINIFI
//
// ⚠ SİSTEM BUGÜN SINIFI BİLMİYOR — VE BİLMEDİĞİNDE HERKESE GÖNDERİYOR.
// Sınıf bilgisi yalnız `students.sinif` alanında duruyor; oraya da öğrencinin
// KENDİSİ, portaldaki profil ekranından yazıyor. Yazmayan öğrencide alan boş
// kalıyor ve anket eşleşmesi şöyleydi:
//
//     if (!myClass) return true;   // sınıf bilinmiyorsa göster
//
// Yani "1. sınıf anketi", sınıfını hiç girmemiş BÜTÜN öğrencilere düşüyordu.
// Oryantasyon anketini dördüncü sınıflar da dolduruyor, sonuçlar kirleniyor
// ve kimse bunu fark etmiyordu — ekranda hiçbir uyarı yok.
//
// ── ÇÖZÜM: NUMARA ZATEN SÖYLÜYOR ──
// Öğrenci numarasının ilk iki hanesi GİRİŞ YILIdır:
//
//     26 0905 037
//     ──  ────  ───
//      │    │     └─ sıra numarası
//      │    └─────── program/bölüm kodu
//      └──────────── giriş yılı (2026)
//
// Sınıf = içinde bulunulan akademik yıl − giriş yılı + 1. Akademik yıl
// EYLÜL'de başlar (lib/akademik-donem.js), yani 16 Eylül 2026'da 2026-2027
// yılındayız: 26 ile başlayan numara 1. sınıf, 25 ikinci, 24 üçüncü…
//
// ── BU BİR TAHMİNDİR, KAYIT DEĞİL ──
// Numaradan çıkan sınıf NOMİNAL sınıftır: öğrencinin kaçıncı yılında olduğunu
// söyler, kaç dersi kaldığını söylemez. Kayıt dondurmuş, sınıf tekrarına
// kalmış ya da erken mezun olmuş öğrencide tutmaz. Bu yüzden:
//
//   • Elle girilmiş sınıf (öğrenci işleri ya da öğrencinin kendisi) HER ZAMAN
//     numaradan çıkana ÜSTÜN gelir.
//   • Her sonuç, nereden geldiğini (`kaynak`) söyler; ekran "tahmin" ile
//     "kayıt"ı ayırt edebilsin.
//   • Program süresini aşan numaralar sınıfa değil "uzayan/mezun durumda"ya
//     düşer; kimse otomatik olarak mezun İLAN EDİLMEZ.
//
// ⚠ NUMARA BİÇİMİ KURUMA GÖRE DEĞİŞİR. Buradaki kural ÇAKÜ'nün bugünkü
// biçimine göre yazıldı ve `secenekler` ile ayarlanabilir; biçim değişirse
// tek yerden düzeltilir. Tanınmayan numarada sessizce bir sınıf UYDURULMAZ,
// `kaynak: 'yok'` döner.
// ══════════════════════════════════════════════════════════════

import { akademikYilBul } from './akademik-donem.js';

const metin = (v) => String(v == null ? '' : v).trim();

/** Varsayılan program süresi (lisans). Ön lisans 2, tıp 6. */
export const VARSAYILAN_PROGRAM_YILI = 4;

/**
 * Numaranın rakamları. Boşluk, tire ve harf ayıklanır: listelerden gelen
 * "2609 05037" ya da "260905037-1" gibi yazımlar da çözülsün.
 */
export function numaraRakamlari(no) {
  return metin(no).replace(/\D/g, '');
}

/**
 * Numaradan GİRİŞ YILI (4 haneli). Çözülemezse null.
 *
 * İlk iki hane yıldır. İki haneli yıl hangi yüzyıla ait? Kural: gelecek yıla
 * düşen bir numara olamaz — "99" 2099 değil 1999'dur. Bu yüzden ikinci hane
 * çifti, referans yılın son iki hanesinden BÜYÜKSE bir önceki yüzyıla konur.
 *
 * @param {string|number} no    öğrenci numarası
 * @param {object} [secenekler] { referansYil, enAzHane }
 */
export function girisYili(no, secenekler) {
  const s = secenekler || {};
  const rakam = numaraRakamlari(no);
  const enAz = Number.isFinite(s.enAzHane) ? s.enAzHane : 8;
  if (rakam.length < enAz) return null;
  const yy = Number(rakam.slice(0, 2));
  if (!Number.isFinite(yy)) return null;
  const referans = Number.isFinite(s.referansYil) ? s.referansYil : new Date().getFullYear();
  const yuzyil = Math.floor(referans / 100) * 100;
  const aday = yuzyil + yy;
  // Gelecekte bir giriş yılı olamaz (kayıt yılı en fazla bu yıldır).
  return aday > referans ? aday - 100 : aday;
}

/**
 * İçinde bulunulan akademik yılın BAŞLADIĞI takvim yılı.
 * 16.09.2026 → 2026 · 05.03.2026 → 2025
 */
export function akademikYilBasi(tarih, baslangicAyi) {
  return Number(akademikYilBul(tarih, baslangicAyi).slice(0, 4));
}

/**
 * Numaradan NOMİNAL sınıf.
 *
 * @returns {{sinif:number|null, girisYili:number|null, durum:string}}
 *   durum: 'normal'   → 1..programYili arası, olağan
 *          'uzayan'   → program süresini aşmış (mezun ya da uzatmalı)
 *          'gelecek'  → henüz başlamamış (yanlış numara ya da erken kayıt)
 *          'cozülemedi' → numara tanınmadı
 */
export function nominalSinif(no, secenekler) {
  const s = secenekler || {};
  const programYili = Number.isFinite(s.programYili) ? s.programYili : VARSAYILAN_PROGRAM_YILI;
  const yil = girisYili(no, s);
  if (yil == null) return { sinif: null, girisYili: null, durum: 'cozulemedi' };
  const simdi = Number.isFinite(s.akademikYilBasi)
    ? s.akademikYilBasi
    : akademikYilBasi(s.tarih, s.baslangicAyi);
  const sinif = simdi - yil + 1;
  if (sinif < 1) return { sinif: null, girisYili: yil, durum: 'gelecek' };
  if (sinif > programYili) return { sinif: null, girisYili: yil, durum: 'uzayan' };
  return { sinif, girisYili: yil, durum: 'normal' };
}

/**
 * Kayıttaki sınıf ELLE mi girilmiş?
 *
 * ⚠ TARAMA BETİĞİ KENDİ YAZDIĞINI "ELLE GİRİLMİŞ" SANMAMALI. Betik boş
 * sınıfları numaradan doldurup `sinifKaynagi: 'numara'` işaretler. Bu işaret
 * olmasaydı yazılan değer kalıcı bir KAYDA dönüşür, gelecek eylülde sınıf
 * artmaz, herkes sonsuza dek aynı sınıfta kalırdı. İşaretli değer bir
 * ÖNBELLEKtir: her okumada numaradan yeniden hesaplanır.
 */
function elleGirilenSinif(ogrenci) {
  const o = ogrenci || {};
  if (metin(o.sinifKaynagi) === 'numara') return null;
  return sinifSayisi(o.sinif != null ? o.sinif : o.class);
}

/**
 * Öğrencinin sınıfı — KAYIT önce, numara sonra.
 *
 * @param {object} ogrenci  students kaydı ({studentNumber, sinif, programYili…})
 * @param {object} [secenekler]
 * @returns {{sinif:number|null, kaynak:'kayit'|'numara'|'yok', durum:string, girisYili:number|null}}
 *   kaynak: 'kayit'  → elle girilmiş, kesin sayılır
 *           'numara' → numaradan türetildi, TAHMİNdir
 *           'yok'    → bilinmiyor; çağıran "herkese göster" DEMEMELİ
 */
export function ogrenciSinifi(ogrenci, secenekler) {
  const o = ogrenci || {};
  const s = secenekler || {};
  const elle = elleGirilenSinif(o);
  if (elle != null) {
    return {
      sinif: elle,
      kaynak: 'kayit',
      durum: 'normal',
      girisYili: girisYili(o.studentNumber || o.studentNo, s),
    };
  }
  const programYili = Number.isFinite(s.programYili)
    ? s.programYili
    : sinifSayisi(o.programYili) || VARSAYILAN_PROGRAM_YILI;
  const n = nominalSinif(o.studentNumber || o.studentNo || o.girisNumarasi, { ...s, programYili });
  if (n.sinif == null)
    return { sinif: null, kaynak: 'yok', durum: n.durum, girisYili: n.girisYili };
  return { sinif: n.sinif, kaynak: 'numara', durum: n.durum, girisYili: n.girisYili };
}

/**
 * Elle girilmiş sınıfı sayıya çevirir. "3", "3. sınıf", "3.Sınıf", 3 → 3
 * Anlamsız/boş değerlerde null.
 */
export function sinifSayisi(v) {
  if (v == null || v === '') return null;
  const m = /(\d+)/.exec(metin(v));
  if (!m) return null;
  const n = Number(m[1]);
  // 1..8 dışındaki bir "sınıf" veri hatasıdır (yıl yazılmış olabilir: 2023).
  return Number.isFinite(n) && n >= 1 && n <= 8 ? n : null;
}

/** Anket hedef grubu etiketi ('1. sınıf') → sayı. Diğer gruplar null. */
export function grupSinifi(grup) {
  const g = metin(grup);
  const m = /^(\d+)\.\s*sınıf$/i.exec(g);
  return m ? Number(m[1]) : null;
}

/**
 * Bu öğrenci, bu hedef gruba giriyor mu?
 *
 * ⚠ BİLİNMEYEN SINIF "EVET" DEĞİLDİR. Eski kural sınıfı bilinmeyen öğrenciye
 * her sınıf anketini gösteriyordu. Doğrusu: sınıf ÇÖZÜLEMİYORSA sınıf hedefli
 * anket o öğrenciye GÖSTERİLMEZ; ama bu sessiz bir kayıp olmasın diye
 * `sebep: 'sinif-bilinmiyor'` döner ve ekran öğrenciye "sınıfını gir" der.
 *
 * @returns {{uyar:boolean, sebep:string, sinif:number|null, kaynak:string}}
 */
export function sinifGrubunaUyarMi(ogrenci, grup, secenekler) {
  const hedef = grupSinifi(grup);
  if (hedef == null) return { uyar: true, sebep: 'sinif-hedefi-degil', sinif: null, kaynak: '' };
  const c = ogrenciSinifi(ogrenci, secenekler);
  if (c.sinif == null) {
    return { uyar: false, sebep: 'sinif-bilinmiyor', sinif: null, kaynak: c.kaynak };
  }
  return {
    uyar: c.sinif === hedef,
    sebep: c.sinif === hedef ? 'uyuyor' : 'baska-sinif',
    sinif: c.sinif,
    kaynak: c.kaynak,
  };
}

/** Ekranda gösterilecek kısa etiket: "3. sınıf (numaradan)" */
export function sinifEtiketi(sonuc) {
  const c = sonuc || {};
  if (c.sinif == null) {
    if (c.durum === 'uzayan') return 'Program süresini aşmış';
    if (c.durum === 'gelecek') return 'Numara ileri tarihli';
    return 'Sınıf bilinmiyor';
  }
  return c.sinif + '. sınıf' + (c.kaynak === 'numara' ? ' (numaradan)' : '');
}

// ══════════════════════════════════════════════════════════════
// TOPLU TARAMA
//
// Kullanıcının istediği "tek seferlik tüm öğrencilerin sınıflarını
// numaralardan kontrol et" işi. Betik bunu ÖNCE RAPOR EDER, yazmaz: bir kez
// yanlış yazılan sınıf, herkesin profilinde yanlış durur ve geri alınamaz.
// ══════════════════════════════════════════════════════════════

/**
 * Bir öğrenci listesini sınıf açısından inceler.
 *
 * @returns {{
 *   yazilacak: {ogrenci, mevcut, yeni, girisYili}[],  // sınıfı boş, numaradan çözüldü
 *   celiskili: {ogrenci, mevcut, numaradan}[],        // elle girilmiş ≠ numaradan
 *   cozulemeyen: {ogrenci, durum}[],                  // numara tanınmadı / uzayan
 *   dokunulmayan: number                              // zaten doğru
 * }}
 */
export function sinifTaramasi(ogrenciler, secenekler) {
  const out = { yazilacak: [], celiskili: [], cozulemeyen: [], dokunulmayan: 0 };
  (ogrenciler || []).forEach((o) => {
    const elle = elleGirilenSinif(o);
    const n = nominalSinif(o && (o.studentNumber || o.studentNo), {
      ...(secenekler || {}),
      programYili:
        (secenekler || {}).programYili ||
        sinifSayisi(o && o.programYili) ||
        VARSAYILAN_PROGRAM_YILI,
    });
    if (elle != null) {
      if (n.sinif != null && n.sinif !== elle) {
        out.celiskili.push({ ogrenci: o, mevcut: elle, numaradan: n.sinif });
      } else {
        out.dokunulmayan++;
      }
      return;
    }
    if (n.sinif == null) {
      out.cozulemeyen.push({ ogrenci: o, durum: n.durum });
      return;
    }
    // Önceden betiğin yazdığı (önbellek) değer varsa ve artık eskimişse
    // tazelenir; aynıysa dokunulmaz — betik idempotent kalsın.
    const onbellek = sinifSayisi(o && (o.sinif != null ? o.sinif : o.class));
    if (onbellek === n.sinif) {
      out.dokunulmayan++;
      return;
    }
    out.yazilacak.push({ ogrenci: o, mevcut: onbellek, yeni: n.sinif, girisYili: n.girisYili });
  });
  return out;
}
