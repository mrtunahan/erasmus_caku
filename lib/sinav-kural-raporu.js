// ══════════════════════════════════════════════════════════════
// SINAV KURAL RAPORU — yeni kurallar canlıya alınmadan önce ne etkilenir?
//
// YALNIZ HESAPLAR, HİÇBİR ŞEY YAZMAZ. Girdi veritabanından okunmuş ham
// kayıtlardır (server/sinav-kural-raporu.js okur ve bu işlevi çağırır).
//
// Bölümler:
//   1) salonOrtusmeleri    aynı salonda saatleri örtüşen iki ayrı oturum
//                          (artık ENGEL: düzeltilmeden çıktı/gönderim yok)
//   2) gecersizKabuller    aynı salon çakışması için verilmiş şartlı kabuller
//                          (kural değişti, artık geçersiz)
//   3) gonderilmemisler    programı fakülteye gönderilmemiş (ya da iade
//                          edilmiş) bölüm/dönem grupları — öğrenciler Ders
//                          Odası'nda bu sınavların tarihini GÖRMEZ
//   4) degisenler          gönderildikten sonra değişmiş programlar
//   5) digerFakulteGozetmenleri  başka fakültedeki kişiyi gözetmen olarak
//                          kullanan bölümler (otomatik havuzdan çıkarlar)
// ══════════════════════════════════════════════════════════════

import {
  fakulteOturumlari,
  salonCakisanOturumlar,
  donemGrubu,
  gonderimKimlikleri,
  programImzasi,
  fakulteListesi,
  fakulteAkademisyeniMi,
} from './sinav-fakulte.js';
import { bolumGozetmeniMi, adAnahtari } from './gozetmen.js';

const metin = (v) => String(v == null ? '' : v).trim();
const kimligi = (d) => metin(d && (d._docId || d.id || (d._id && String(d._id))));

/**
 * @param {object} p
 * @param {object[]} p.sinavlar      sinav_programi
 * @param {object[]} p.donemler      sinav_donemler
 * @param {object[]} p.gonderimler   sinav_gonderimleri
 * @param {object[]} p.kabuller      sinav_cakisma_kabul
 * @param {object[]} p.bolumler      [{ id, name, facultyId, kimlikler[] }]
 * @param {object[]} p.fakulteler    faculties
 * @param {object[]} p.akademisyenler professors
 * @param {string}   p.bugun         YYYY-AA-GG; bu tarihten önceki sınavlar
 *                                   (tum=false iken) rapora girmez
 * @param {boolean}  [p.tum]         geçmiş sınavlar da
 */
export function sinavKuralRaporu(p) {
  const o = p || {};
  const bolumler = (o.bolumler || []).filter((d) => d && metin(d.id));
  const bolumBul = (id) => {
    const k = metin(id);
    return k ? bolumler.find((d) => d.id === k || (d.kimlikler || []).includes(k)) || null : null;
  };
  const kanon = (id) => {
    const b = bolumBul(id);
    return b ? b.id : metin(id);
  };
  const bolumAdi = (id) => {
    const b = bolumBul(id);
    return (b && b.name) || metin(id) || '(bölümsüz)';
  };
  const varyantlar = (id) => {
    const b = bolumBul(id);
    return b ? [...new Set([b.id, ...(b.kimlikler || [])])] : [metin(id)].filter(Boolean);
  };
  const donemOf = new Map((o.donemler || []).map((d) => [kimligi(d), d]));
  const bugun = metin(o.bugun);
  const kapsamda = (e) => e && metin(e.date) && (o.tum || !bugun || metin(e.date) >= bugun);
  const sinavlar = (o.sinavlar || [])
    .filter(kapsamda)
    .map((e) => ({ ...e, id: kimligi(e) || e.id }));
  const sinavBolumu = (e) => {
    const d = donemOf.get(metin(e.periodId));
    return kanon(metin(e.departmentId) || (d && d.departmentId));
  };

  // ── 1) Aynı salonda örtüşme ──
  const oturumlar = fakulteOturumlari(sinavlar);
  const salonOrtusmeleri = [];
  const gorulen = new Set();
  oturumlar.forEach((a) => {
    salonCakisanOturumlar(a, oturumlar).forEach((c) => {
      const k = [a.anahtar, c.anahtar].sort().join('#');
      if (gorulen.has(k)) return;
      gorulen.add(k);
      const b = oturumlar.find((x) => x.anahtar === c.anahtar) || c;
      const yaz = (x) => ({
        kod: x.kodSatiri,
        saat: x.timeSlot,
        sure: x.sure,
        bolumler: [...new Set((x.uyeler || []).map((u) => bolumAdi(sinavBolumu(u))))],
      });
      salonOrtusmeleri.push({ tarih: a.date, salonlar: c.salonlar, a: yaz(a), b: yaz(b) });
    });
  });
  salonOrtusmeleri.sort((x, y) => (x.tarih + x.a.saat).localeCompare(y.tarih + y.a.saat));

  // ── 2) Geçersiz kalan şartlı kabuller (aynı salon) ──
  const gecersizKabuller = (o.kabuller || [])
    .filter((k) => k && metin(k.anahtar).startsWith('salon|'))
    .map((k) => ({
      salon: metin(k.anahtar).split('|')[1] || '',
      sebep: metin(k.sebep),
      kabulEden: metin(k.kabulEden),
      tarih: metin(k.tarih),
      bolumler: [...new Set((k.bolumler || []).map(bolumAdi))],
    }));

  // ── 3–4) Gönderim durumu (bölüm × dönem grubu) ──
  const gonderimOf = new Map();
  (o.gonderimler || []).forEach((g) => {
    [g && g._docId, g && g._id && String(g._id), g && g.id]
      .filter(Boolean)
      .forEach((k) => gonderimOf.set(String(k), g));
  });
  const gruplar = new Map(); // bolum|grup → { bolum, grup, etiket, sinavlar }
  let donemsiz = 0;
  sinavlar.forEach((e) => {
    const d = donemOf.get(metin(e.periodId));
    if (!d) {
      donemsiz++;
      return;
    }
    const bolum = sinavBolumu(e);
    const grup = donemGrubu(d);
    const k = bolum + '¦' + grup;
    if (!gruplar.has(k))
      gruplar.set(k, { bolum, grup, etiket: metin(d.label) || grup, sinavlar: [] });
    gruplar.get(k).sinavlar.push(e);
  });
  const gonderilmemisler = [];
  const degisenler = [];
  gruplar.forEach((x) => {
    let kayit = null;
    for (const v of varyantlar(x.bolum)) {
      for (const id of gonderimKimlikleri(v, x.grup)) {
        if (gonderimOf.has(id)) {
          kayit = gonderimOf.get(id);
          break;
        }
      }
      if (kayit) break;
    }
    const ilkTarih = x.sinavlar.map((e) => metin(e.date)).sort()[0] || '';
    const satir = {
      bolum: bolumAdi(x.bolum),
      donem: x.etiket,
      sinavSayisi: x.sinavlar.length,
      ilkSinav: ilkTarih,
      durum: (kayit && metin(kayit.durum)) || 'gönderilmedi',
    };
    if (!kayit || metin(kayit.durum) !== 'gonderildi') {
      gonderilmemisler.push(satir);
    } else if (metin(kayit.imza) && metin(kayit.imza) !== programImzasi(x.sinavlar)) {
      degisenler.push({ ...satir, durum: 'gönderimden sonra değişti' });
    }
  });
  const sirala = (l) =>
    l.sort((a, b) => a.bolum.localeCompare(b.bolum, 'tr') || a.donem.localeCompare(b.donem, 'tr'));
  sirala(gonderilmemisler);
  sirala(degisenler);

  // ── 5) Başka fakülteden gözetmen ──
  const gomulu = bolumler.map((d) => ({
    id: d.id,
    name: d.name,
    kimlikler: d.kimlikler || [],
    facultyId: metin(d.facultyId) || 'muhendislik',
  }));
  const birimler = fakulteListesi(o.fakulteler || [], gomulu);
  const fakulteBolumleri = (d) => {
    const birim = birimler.find((f) => f.kimlikler.includes(metin(d.facultyId) || 'muhendislik'));
    const ids = new Set(birim ? birim.kimlikler : [metin(d.facultyId) || 'muhendislik']);
    return gomulu.filter((x) => ids.has(x.facultyId));
  };
  const digerFakulteGozetmenleri = [];
  gomulu.forEach((d) => {
    const fb = fakulteBolumleri(d);
    const kisiler = (o.akademisyenler || []).filter(
      (k) =>
        k &&
        metin(k.name) &&
        bolumGozetmeniMi(k, d.id, gomulu, d.name) &&
        !fakulteAkademisyeniMi(k, fb, gomulu)
    );
    if (kisiler.length === 0) return;
    const bolumSinavlari = sinavlar.filter((e) => sinavBolumu(e) === d.id);
    digerFakulteGozetmenleri.push({
      bolum: d.name || d.id,
      kisiler: kisiler.map((k) => {
        const anahtar = adAnahtari(k.name);
        const gorev = bolumSinavlari.filter((e) =>
          metin(e.supervisor)
            .split(',')
            .some((g) => adAnahtari(g) === anahtar)
        ).length;
        return { ad: metin(k.name), anaBolum: bolumAdi(k.departmentId), kayitliGorev: gorev };
      }),
    });
  });
  digerFakulteGozetmenleri.sort((a, b) => a.bolum.localeCompare(b.bolum, 'tr'));

  return {
    kapsam: o.tum ? 'tüm sınavlar' : 'bugünden itibaren (' + (bugun || '—') + ')',
    sinavSayisi: sinavlar.length,
    donemsiz,
    salonOrtusmeleri,
    gecersizKabuller,
    gonderilmemisler,
    degisenler,
    digerFakulteGozetmenleri,
  };
}

/** Raporu okunur metne çevirir (konsol çıktısı). */
export function raporMetni(r) {
  const t = (d) => (d ? new Date(d + 'T00:00:00').toLocaleDateString('tr-TR') : '—');
  const s = [];
  s.push('SINAV KURAL RAPORU — ' + r.kapsam + ' · ' + r.sinavSayisi + ' sınav');
  if (r.donemsiz)
    s.push('(Dönemi bulunamayan ' + r.donemsiz + ' sınav gönderim hesabına girmedi.)');
  s.push('');
  s.push('1) AYNI SALONDA ÖRTÜŞEN OTURUMLAR (' + r.salonOrtusmeleri.length + ') — artık ENGEL');
  r.salonOrtusmeleri.forEach((x) =>
    s.push(
      '   ' +
        t(x.tarih) +
        ' · ' +
        x.salonlar.join(' - ') +
        ' · ' +
        x.a.kod +
        ' ' +
        x.a.saat +
        ' [' +
        x.a.bolumler.join(', ') +
        ']  ↔  ' +
        x.b.kod +
        ' ' +
        x.b.saat +
        ' [' +
        x.b.bolumler.join(', ') +
        ']'
    )
  );
  s.push('');
  s.push('2) GEÇERSİZ KALAN ŞARTLI KABULLER — aynı salon (' + r.gecersizKabuller.length + ')');
  r.gecersizKabuller.forEach((x) =>
    s.push(
      '   ' +
        x.salon +
        ' · ' +
        x.bolumler.join(', ') +
        ' · "' +
        x.sebep +
        '" — ' +
        (x.kabulEden || '?') +
        (x.tarih ? ' (' + t(x.tarih.slice(0, 10)) + ')' : '')
    )
  );
  s.push('');
  s.push(
    '3) GÖNDERİLMEMİŞ PROGRAMLAR (' +
      r.gonderilmemisler.length +
      ') — öğrenciler bu sınavların tarihini Ders Odası’nda görmez'
  );
  r.gonderilmemisler.forEach((x) =>
    s.push(
      '   ' +
        x.bolum +
        ' · ' +
        x.donem +
        ' · ' +
        x.sinavSayisi +
        ' sınav · ilk ' +
        t(x.ilkSinav) +
        ' · durum: ' +
        x.durum
    )
  );
  s.push('');
  s.push('4) GÖNDERİMDEN SONRA DEĞİŞENLER (' + r.degisenler.length + ')');
  r.degisenler.forEach((x) =>
    s.push('   ' + x.bolum + ' · ' + x.donem + ' · ' + x.sinavSayisi + ' sınav')
  );
  s.push('');
  s.push(
    '5) BAŞKA FAKÜLTEDEN GÖZETMEN KULLANAN BÖLÜMLER (' +
      r.digerFakulteGozetmenleri.length +
      ') — bu kişiler otomatik havuzdan çıkar'
  );
  r.digerFakulteGozetmenleri.forEach((x) => {
    s.push('   ' + x.bolum + ':');
    x.kisiler.forEach((k) =>
      s.push(
        '      - ' + k.ad + ' (ana bölüm: ' + k.anaBolum + ') · kayıtlı görev: ' + k.kayitliGorev
      )
    );
  });
  return s.join('\n');
}

/**
 * BİÇİMSEL DÜZELTME SONRASI GÖNDERİM İMZALARI
 *
 * Gönderim imzası gözetmen metnini de kapsar (programImzasi). Ad standardı
 * onarımı gibi yalnız BİÇİM değiştiren bir düzeltme, fakülteye gönderilmiş
 * programları "gönderimden sonra değişti" gösterirdi. Düzeltmeden ÖNCE imzası
 * tutan gönderimin imzası düzeltilmiş sınavlarla yeniden hesaplanır; zaten
 * değişmiş (imzası tutmayan) gönderime dokunulmaz.
 *
 * @param {object} p { once, sonra, donemler, gonderimler, bolumler } — once/sonra
 *        sinav_programi kayıtlarının düzeltme öncesi/sonrası hâli
 * @returns {{kayit:object, eskiImza:string, yeniImza:string}[]}
 */
export function imzaTazelemeleri(p) {
  const o = p || {};
  const bolumler = (o.bolumler || []).filter((d) => d && metin(d.id));
  const bolumBul = (id) => {
    const k = metin(id);
    return k ? bolumler.find((d) => d.id === k || (d.kimlikler || []).includes(k)) || null : null;
  };
  const kanon = (id) => {
    const b = bolumBul(id);
    return b ? b.id : metin(id);
  };
  const varyantlar = (id) => {
    const b = bolumBul(id);
    return b ? [...new Set([b.id, ...(b.kimlikler || [])])] : [metin(id)].filter(Boolean);
  };
  const donemOf = new Map((o.donemler || []).map((d) => [kimligi(d), d]));
  const grupla = (sinavlar) => {
    const g = new Map();
    (sinavlar || []).forEach((e) => {
      const d = e && donemOf.get(metin(e.periodId));
      if (!d) return;
      const bolum = kanon(metin(e.departmentId) || d.departmentId);
      const grup = donemGrubu(d);
      const k = bolum + '¦' + grup;
      if (!g.has(k)) g.set(k, { bolum, grup, sinavlar: [] });
      g.get(k).sinavlar.push(e);
    });
    return g;
  };
  const gonderimOf = new Map();
  (o.gonderimler || []).forEach((g) => {
    [g && g._docId, g && g._id && String(g._id), g && g.id]
      .filter(Boolean)
      .forEach((k) => gonderimOf.set(String(k), g));
  });
  const kayitBul = (x) => {
    for (const v of varyantlar(x.bolum)) {
      for (const id of gonderimKimlikleri(v, x.grup)) {
        if (gonderimOf.has(id)) return gonderimOf.get(id);
      }
    }
    return null;
  };
  const sonra = grupla(o.sonra);
  const out = [];
  grupla(o.once).forEach((x, k) => {
    const kayit = kayitBul(x);
    if (!kayit || metin(kayit.durum) !== 'gonderildi') return;
    const eskiImza = programImzasi(x.sinavlar);
    if (metin(kayit.imza) !== eskiImza) return;
    const yeniImza = programImzasi((sonra.get(k) || { sinavlar: [] }).sinavlar);
    if (yeniImza !== eskiImza) out.push({ kayit, eskiImza, yeniImza });
  });
  return out;
}
