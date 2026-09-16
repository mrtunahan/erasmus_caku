/**
 * ÖĞRENCİNİN SINIFI — sunucu tarafı (CommonJS).
 *
 * İstemci kuralının aynısı: lib/ogrenci-sinif.js. Proje ESM istemci / CJS
 * sunucu ayrımında olduğu için kural iki dosyada duruyor (aynı ayrım
 * memur-kapsam.js ve cap-aday-eslestirme.js için de var).
 *
 * ⚠ İKİ DOSYA AYRIŞIRSA ORTAYA SESSİZ BİR HATA ÇIKAR: tarama betiği bir
 * sınıf yazar, ekran başka bir sınıf gösterir. Bu yüzden ikisinin aynı
 * sonucu verdiği TESTLE bağlanmıştır (tests/ogrenci-sinif-esitlik.test.js);
 * birini değiştiren öteki de değiştirmek zorundadır.
 */

const VARSAYILAN_PROGRAM_YILI = 4;
const BASLANGIC_AYI = 9; // Akademik yıl eylülde başlar.

const metin = (v) => String(v == null ? '' : v).trim();

function numaraRakamlari(no) {
  return metin(no).replace(/\D/g, '');
}

function girisYili(no, secenekler) {
  const s = secenekler || {};
  const rakam = numaraRakamlari(no);
  const enAz = Number.isFinite(s.enAzHane) ? s.enAzHane : 8;
  if (rakam.length < enAz) return null;
  const yy = Number(rakam.slice(0, 2));
  if (!Number.isFinite(yy)) return null;
  const referans = Number.isFinite(s.referansYil) ? s.referansYil : new Date().getFullYear();
  const yuzyil = Math.floor(referans / 100) * 100;
  const aday = yuzyil + yy;
  return aday > referans ? aday - 100 : aday;
}

function akademikYilBasi(tarih, baslangicAyi) {
  const d = tarih ? new Date(tarih) : new Date();
  const gecerli = isNaN(d.getTime()) ? new Date() : d;
  const ay0 = Number(baslangicAyi);
  const bas = ay0 >= 1 && ay0 <= 12 ? ay0 : BASLANGIC_AYI;
  return gecerli.getMonth() + 1 >= bas ? gecerli.getFullYear() : gecerli.getFullYear() - 1;
}

function nominalSinif(no, secenekler) {
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

function sinifSayisi(v) {
  if (v == null || v === '') return null;
  const m = /(\d+)/.exec(metin(v));
  if (!m) return null;
  const n = Number(m[1]);
  return Number.isFinite(n) && n >= 1 && n <= 8 ? n : null;
}

function elleGirilenSinif(ogrenci) {
  const o = ogrenci || {};
  if (metin(o.sinifKaynagi) === 'numara') return null;
  return sinifSayisi(o.sinif != null ? o.sinif : o.class);
}

function ogrenciSinifi(ogrenci, secenekler) {
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
  const n = nominalSinif(o.studentNumber || o.studentNo || o.girisNumarasi, {
    ...s,
    programYili,
  });
  if (n.sinif == null)
    return { sinif: null, kaynak: 'yok', durum: n.durum, girisYili: n.girisYili };
  return { sinif: n.sinif, kaynak: 'numara', durum: n.durum, girisYili: n.girisYili };
}

function sinifTaramasi(ogrenciler, secenekler) {
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
    const onbellek = sinifSayisi(o && (o.sinif != null ? o.sinif : o.class));
    if (onbellek === n.sinif) {
      out.dokunulmayan++;
      return;
    }
    out.yazilacak.push({ ogrenci: o, mevcut: onbellek, yeni: n.sinif, girisYili: n.girisYili });
  });
  return out;
}

module.exports = {
  VARSAYILAN_PROGRAM_YILI,
  akademikYilBasi,
  girisYili,
  nominalSinif,
  numaraRakamlari,
  ogrenciSinifi,
  sinifSayisi,
  sinifTaramasi,
};
