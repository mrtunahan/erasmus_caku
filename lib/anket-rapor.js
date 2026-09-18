// ══════════════════════════════════════════════════════════════
// ANKET SONUÇ RAPORU — ekranın, Excel'in ve Word'ün ORTAK kaynağı
//
// ⚠ ÜÇ ÇIKTI ÜÇ FARKLI SAYI SÖYLEMEMELİ. Excel dosyası yanıtları kendi
// sayıyor, ekran başka bir hesap yapıyor, Word ise hiç yoktu: aynı anketin
// üç ayrı "sonucu" ortaya çıkabiliyordu. Burada rapor BİR KEZ kurulur
// (lib/anket-istatistik.js hesaplarıyla), üç çıktı da aynı modeli çizer.
//
// ── MODEL NEYİ İÇERİR ──
//   • künye      — kim, kaç yanıt, hangi süzgeç, ne zaman
//   • kıyas      — sorular ortalamaya göre sıralı (hangisi zayıf?)
//   • soru soru  — şık dağılımı + ortalama/medyan/sapma + uç oranları
//   • katılım    — gün gün yanıt sayısı
//   • ham tablo  — her satır bir yanıtlayıcı (Excel/CSV'nin 1. sayfası)
//
// ── ETİKET, DEĞER DEĞİL ──
// Tabloya '4' değil 'Katılıyorum' yazılır. Raporu açan kişinin elinde kod
// cetveli yok; ham değerler yalnız veri sayfasında işe yarardı, orada da
// etiket daha okunur.
//
// ── SAYI BİÇİMİ ──
// Türkçe ondalık ayracı virgüldür. `toLocaleString` yerine elle biçimlendirilir:
// sunucuda/tarayıcıda farklı ICU kurulumları aynı raporu iki türlü yazmasın.
// ══════════════════════════════════════════════════════════════

import {
  cokluSecimMi,
  secenekEtiketi,
  secenekliMi,
  seceneklerSayisalMi,
  soruSecenekleri,
} from './anket-secenek.js';
import {
  anketOzeti,
  dagilim,
  gunlukKatilim,
  kutuplasmaVarMi,
  metinYanitlari,
  olcekSiraliMi,
  sayisalOzet,
  soruKarsilastirmasi,
  ucOranlari,
  yanitDegerleri,
} from './anket-istatistik.js';
import {
  belgeDosyaAdi,
  wordBaslik,
  wordMaddeler,
  wordParagraf,
  wordSayfaSonu,
  wordTablo,
} from './word-belge.js';

const metin = (v) => String(v == null ? '' : v).trim();

const TIP_ETIKETI = {
  likert: 'Likert / derecelendirme',
  secenek: 'Çoktan seçmeli (tek yanıt)',
  coklu: 'Çoktan seçmeli (çok yanıt)',
  yesno: 'Evet / Hayır',
  hours0to5: 'Saat (0-5)',
  hoursRange: 'Saat aralığı',
  hoursExam: 'Sınav saati',
  textarea: 'Uzun metin',
  text: 'Kısa metin',
};

const ROL_ETIKETI = { student: 'Öğrenci', professor: 'Akademisyen', alumni: 'Mezun' };

/** 4.2058 → '4,21'. Sayı değilse boş dize (tabloya '-' yazmak çağırana kalsın). */
export function sayiTr(deger, basamak = 2) {
  if (deger == null || deger === '') return '';
  const n = Number(deger);
  if (!Number.isFinite(n)) return '';
  return n.toFixed(basamak).replace('.', ',');
}

/** 0.6423 → '%64'. */
export function yuzdeTr(oran, basamak = 0) {
  if (oran == null || oran === '') return '';
  const n = Number(oran);
  if (!Number.isFinite(n)) return '';
  return '%' + (n * 100).toFixed(basamak).replace('.', ',');
}

/** '2026-09-18T07:14:00.000Z' → '18.09.2026'. Tanınmayan değer olduğu gibi döner. */
export function tarihTr(deger) {
  const g = metin(deger).slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(g)) return metin(deger);
  const [y, a, gun] = g.split('-');
  return gun + '.' + a + '.' + y;
}

/** '2026-09-18T07:14:00Z' → '18.09.2026 07:14'. */
export function zamanTr(deger) {
  const s = metin(deger);
  const saat = s.slice(11, 16);
  const tarih = tarihTr(s);
  return saat && /^\d{2}:\d{2}$/.test(saat) ? tarih + ' ' + saat : tarih;
}

/** Bir yanıt hücresinin okunur karşılığı: şıklı soruda etiket(ler), yoksa metin. */
export function hucreMetni(soru, deger) {
  if (deger == null || deger === '') return '';
  if (!secenekliMi(soru)) return Array.isArray(deger) ? deger.join(', ') : String(deger);
  return yanitDegerleri(deger)
    .map((d) => secenekEtiketi(soru, d))
    .join(', ');
}

/**
 * HAM YANIT TABLOSU — her satır bir katılımcı.
 *
 * Excel'in 1. sayfası ve CSV budur. Kimlik alanı yoktur: anket anonimdir,
 * rapora kimlik açacak bir sütun eklemek ayrı bir karardır.
 */
export function yanitTablosu(survey, yanitlar) {
  const s = survey || {};
  const bilgiAlanlari = s.infoFields || [];
  const sorular = s.questions || [];
  const basliklar = [
    '#',
    'Tarih',
    'Rol',
    ...bilgiAlanlari.map((f) => metin(f.label) || metin(f.key)),
    ...sorular.map((q, i) => 'S' + (i + 1) + '. ' + metin(q.text)),
  ];
  const satirlar = (yanitlar || []).map((r, i) => [
    i + 1,
    zamanTr(r && r.submittedAt),
    ROL_ETIKETI[r && r.role] || metin(r && r.role),
    ...bilgiAlanlari.map((f) => {
      const v = r && r.answers ? r.answers[f.key] : null;
      return v == null ? '' : Array.isArray(v) ? v.join(', ') : String(v);
    }),
    ...sorular.map((q) => hucreMetni(q, r && r.answers ? r.answers[q.id] : null)),
  ]);
  return { basliklar, satirlar };
}

/** Bir sorunun rapor parçası: dağılım tablosu + okunur notlar. */
function soruRaporu(soru, yanitlar, sira) {
  const q = soru || {};
  const secenekli = secenekliMi(q);
  const sayisal = seceneklerSayisalMi(q);
  const sirali = olcekSiraliMi(q);
  const taban = {
    id: q.id,
    sira,
    metin: metin(q.text),
    baslik: 'S' + sira + '. ' + metin(q.text),
    tip: metin(q.type),
    tipEtiketi: TIP_ETIKETI[metin(q.type)] || metin(q.type),
    secenekli,
    sayisal,
    sirali,
    coklu: cokluSecimMi(q),
  };

  if (!secenekli || soruSecenekleri(q).length === 0) {
    const metinler = metinYanitlari(yanitlar, q);
    return {
      ...taban,
      yanitlayan: metinler.length,
      yanitsiz: Math.max(0, (yanitlar || []).length - metinler.length),
      tablo: null,
      notlar: [metinler.length + ' metin yanıtı'],
      metinler,
    };
  }

  const d = dagilim(yanitlar, q);
  const ozet = sayisalOzet(yanitlar, q);
  const uc = ucOranlari(yanitlar, q);
  const notlar = [];
  if (sayisal && ozet.n > 0) {
    notlar.push(
      'Ortalama ' +
        sayiTr(ozet.ortalama) +
        ' / ' +
        ozet.olcekUst +
        ' · medyan ' +
        sayiTr(ozet.medyan, 1) +
        ' · standart sapma ' +
        sayiTr(ozet.stdSapma)
    );
  }
  if (sirali && d.yanitlayan > 0) {
    notlar.push(
      'Olumlu uç ' +
        yuzdeTr(uc.olumlu) +
        ' · nötr ' +
        yuzdeTr(uc.notr) +
        ' · olumsuz uç ' +
        yuzdeTr(uc.olumsuz)
    );
  }
  if (taban.coklu) {
    notlar.push(
      'Çok yanıtlı soru: ' + d.yanitlayan + ' kişi toplam ' + d.toplamIsaret + ' şık işaretledi.'
    );
  }
  if (kutuplasmaVarMi(yanitlar, q)) {
    // ⚠ Ortalamanın gizlediği durum: iki uç da kalabalık. Raporda YAZILI
    // olmazsa "ortalama 3, demek ki kararsızlar" diye okunur.
    notlar.push('Dikkat: yanıtlar kutuplaşmış — iki uçta da belirgin yığılma var.');
  }
  if (d.yanitsiz > 0) notlar.push(d.yanitsiz + ' kişi bu soruyu boş bıraktı.');

  return {
    ...taban,
    yanitlayan: d.yanitlayan,
    yanitsiz: d.yanitsiz,
    dagilim: d,
    ozet,
    uc,
    tablo: {
      basliklar: ['Şık', 'Kişi', 'Oran'],
      oranlar: [6, 1, 1],
      hizalar: ['left', 'right', 'right'],
      satirlar: d.secenekler.map((o) => [o.etiket, o.sayi, yuzdeTr(o.oran)]),
    },
    notlar,
    metinler: [],
  };
}

/**
 * RAPOR MODELİ. Excel, Word ve ekran bunu çizer.
 *
 * @param {object} survey
 * @param {object[]} yanitlar  süzülmüş yanıtlar (ders süzgeci uygulanmış hâli)
 * @param {{suzgec?:string, uretimTarihi?:string}} [secenekler]
 */
export function anketRaporu(survey, yanitlar, secenekler) {
  const s = survey || {};
  const opt = secenekler || {};
  const liste = yanitlar || [];
  const sorular = s.questions || [];
  const ozet = anketOzeti(s, liste);
  const kiyasSatirlari = soruKarsilastirmasi(sorular, liste);
  const katilim = gunlukKatilim(liste);

  const kunye = [
    { etiket: 'Anket', deger: metin(s.title) || 'Adsız anket' },
    { etiket: 'Toplam yanıt', deger: String(ozet.yanitSayisi) },
    { etiket: 'Soru sayısı', deger: String(sorular.length) },
    {
      etiket: 'Genel ortalama (5 üzerinden)',
      deger: ozet.genelOrtalama != null ? sayiTr(ozet.genelOrtalama) : '—',
      not:
        ozet.genelOrtalama != null
          ? 'Ölçekleri farklı sorular kendi ölçeğinde ölçülüp birleştirildi'
          : 'Sayısal ölçekli soru yok',
    },
    { etiket: 'Metin yanıtı', deger: String(ozet.yorumSayisi) },
    { etiket: 'Son yanıt', deger: ozet.sonTarih ? tarihTr(ozet.sonTarih) : '—' },
  ];
  if (metin(opt.suzgec)) kunye.push({ etiket: 'Süzgeç', deger: metin(opt.suzgec) });
  kunye.push({
    etiket: 'Rapor tarihi',
    deger: tarihTr(opt.uretimTarihi || new Date().toISOString()),
  });

  return {
    baslik: metin(s.title) || 'Adsız anket',
    altBaslik: 'Anket Sonuç Raporu',
    aciklama: metin(s.description),
    suzgec: metin(opt.suzgec),
    tarih: tarihTr(opt.uretimTarihi || new Date().toISOString()),
    ozet,
    kunye,
    kiyas:
      kiyasSatirlari.length > 0
        ? {
            basliklar: ['Soru', 'Ortalama', 'Ölçek', 'Yanıt'],
            oranlar: [6, 1.4, 1.2, 1],
            hizalar: ['left', 'right', 'center', 'right'],
            satirlar: kiyasSatirlari.map((k) => [
              'S' + k.sira + '. ' + k.metin,
              sayiTr(k.ortalama),
              k.olcekAlt + '–' + k.olcekUst,
              k.n,
            ]),
          }
        : null,
    katilim:
      katilim.length > 0
        ? {
            basliklar: ['Gün', 'Yanıt'],
            oranlar: [3, 1],
            hizalar: ['left', 'right'],
            satirlar: katilim.map((g) => [tarihTr(g.gun), g.sayi]),
          }
        : null,
    sorular: sorular.map((q, i) => soruRaporu(q, liste, i + 1)),
    yanitTablosu: yanitTablosu(s, liste),
  };
}

/** Rapordaki dosya adı çekirdeği. */
export function raporDosyaAdi(rapor, uzanti) {
  return belgeDosyaAdi((rapor && rapor.baslik) || 'anket', 'sonuc-raporu', uzanti);
}

// ══════════════════════════════════════════════════════════════
// WORD GÖVDESİ
// ══════════════════════════════════════════════════════════════

/**
 * Raporun Word gövdesi (document.xml içine giren parça).
 *
 * Ham yanıt tablosu Word'e KONMAZ: 300 katılımcı × 20 soru bir kâğıt belgede
 * okunmaz, oraya taşan sütunlar zaten kırpılır. Ham veri Excel'in işidir;
 * Word "okunacak rapor"dur. `hamTablo: true` denirse yine de eklenir.
 */
export function raporWordGovdesi(rapor, secenekler) {
  const r = rapor || {};
  const opt = secenekler || {};
  const parcalar = [];

  parcalar.push(wordBaslik(r.baslik, 1));
  parcalar.push(wordParagraf(r.altBaslik + ' · ' + r.tarih, { italik: true, boyut: 20 }));
  if (r.aciklama) parcalar.push(wordParagraf(r.aciklama, { boyut: 20 }));

  parcalar.push(wordBaslik('Künye', 2));
  parcalar.push(
    wordTablo({
      basliklar: ['Bilgi', 'Değer'],
      oranlar: [2, 3],
      satirlar: (r.kunye || []).map((k) => [
        k.etiket,
        k.deger + (k.not ? '\n(' + k.not + ')' : ''),
      ]),
    })
  );

  if (r.kiyas) {
    parcalar.push(wordBaslik('Sorular arası kıyas (ortalamaya göre)', 2));
    parcalar.push(
      wordParagraf('Yalnız sayısal ölçekli sorular listelenir; en yüksek ortalama üstte.', {
        italik: true,
        boyut: 18,
      })
    );
    parcalar.push(wordTablo(r.kiyas));
  }

  parcalar.push(wordBaslik('Soru sonuçları', 2));
  (r.sorular || []).forEach((q) => {
    parcalar.push(wordBaslik(q.baslik, 3));
    parcalar.push(
      wordParagraf(q.tipEtiketi + ' · ' + q.yanitlayan + ' yanıt', { boyut: 18, italik: true })
    );
    if (q.tablo) parcalar.push(wordTablo(q.tablo));
    if ((q.notlar || []).length > 0) parcalar.push(wordMaddeler(q.notlar));
    if ((q.metinler || []).length > 0) {
      // Metin yanıtları tabloya değil ALINTI paragraflarına konur: bir cümle
      // de olabilir bir sayfa da, tablo hücresi ikincisini yamultur.
      q.metinler.forEach((m, i) =>
        parcalar.push(wordParagraf(i + 1 + '. ' + m, { boyut: 19, sonrasi: 60 }))
      );
    }
  });

  if (r.katilim) {
    parcalar.push(wordBaslik('Günlük katılım', 2));
    parcalar.push(wordTablo(r.katilim));
  }

  if (opt.hamTablo && r.yanitTablosu) {
    parcalar.push(wordSayfaSonu());
    parcalar.push(wordBaslik('Ham yanıtlar', 2));
    parcalar.push(wordTablo(r.yanitTablosu));
  }

  return parcalar.join('');
}

// ══════════════════════════════════════════════════════════════
// EXCEL SAYFALARI
//
// Sayfalar veriyi PARÇALAYARAK verir: tek bir dev sayfada pivot kurmak
// kullanıcının işi olmasın. Her sayfa kendi başına süzülüp sıralanabilir.
// ══════════════════════════════════════════════════════════════

/**
 * @returns {{ad:string, satirlar:Array<Array<string|number>>, genislikler:number[]}[]}
 *          `satirlar[0]` başlık satırıdır.
 */
export function raporExcelSayfalari(rapor) {
  const r = rapor || {};
  const sayfalar = [];

  // 1) Künye — dosyayı sonradan açan "bu hangi anket, ne zaman alındı" bilsin.
  const kunye = r.kunye || [];
  const notlar = kunye.filter((k) => k.not);
  sayfalar.push({
    ad: 'Rapor',
    genislikler: [34, 46],
    satirlar: [
      ['Bilgi', 'Değer'],
      ...kunye.map((k) => [k.etiket, k.deger]),
      ...(notlar.length > 0 ? [[], ['Not', ''], ...notlar.map((k) => [k.etiket, k.not])] : []),
    ],
  });

  // 2) Ham yanıtlar
  const ham = r.yanitTablosu || { basliklar: [], satirlar: [] };
  sayfalar.push({
    ad: 'Yanıtlar',
    genislikler: ham.basliklar.map((h, i) => (i < 3 ? 14 : Math.min(46, String(h).length + 6))),
    satirlar: [ham.basliklar, ...ham.satirlar],
  });

  // 3) Soru özeti — her soru bir satır
  const ozetSatirlari = [
    [
      '#',
      'Soru',
      'Tip',
      'Yanıtlayan',
      'Boş',
      'Ortalama',
      'Ölçek',
      'Std. sapma',
      'Olumlu',
      'Olumsuz',
    ],
  ];
  (r.sorular || []).forEach((q) => {
    const o = q.ozet || {};
    const uc = q.uc || {};
    ozetSatirlari.push([
      q.sira,
      q.metin,
      q.tipEtiketi,
      q.yanitlayan,
      q.yanitsiz,
      q.sayisal && o.n ? Number(o.ortalama.toFixed(2)) : '',
      q.sayisal && o.n ? o.olcekAlt + '–' + o.olcekUst : '',
      q.sayisal && o.n ? Number(o.stdSapma.toFixed(2)) : '',
      q.sirali && uc.yanitlayan ? yuzdeTr(uc.olumlu) : '',
      q.sirali && uc.yanitlayan ? yuzdeTr(uc.olumsuz) : '',
    ]);
  });
  sayfalar.push({
    ad: 'Soru Özeti',
    genislikler: [5, 60, 26, 12, 8, 10, 10, 11, 9, 9],
    satirlar: ozetSatirlari,
  });

  // 4) Şık dağılımı — grafik kurmak isteyen buradan kurar
  const dagilimSatirlari = [['#', 'Soru', 'Şık', 'Kişi', 'Oran']];
  (r.sorular || []).forEach((q) => {
    if (!q.dagilim) return;
    q.dagilim.secenekler.forEach((o) => {
      dagilimSatirlari.push([q.sira, q.metin, o.etiket, o.sayi, Number((o.oran || 0).toFixed(4))]);
    });
  });
  if (dagilimSatirlari.length > 1) {
    sayfalar.push({
      ad: 'Şık Dağılımı',
      genislikler: [5, 50, 32, 8, 10],
      satirlar: dagilimSatirlari,
    });
  }

  // 5) Metin yanıtları
  const metinSatirlari = [['#', 'Soru', 'Sıra', 'Yanıt']];
  (r.sorular || []).forEach((q) => {
    (q.metinler || []).forEach((m, i) => metinSatirlari.push([q.sira, q.metin, i + 1, m]));
  });
  if (metinSatirlari.length > 1) {
    sayfalar.push({
      ad: 'Metin Yanıtları',
      genislikler: [5, 40, 7, 90],
      satirlar: metinSatirlari,
    });
  }

  // 6) Günlük katılım
  if (r.katilim) {
    sayfalar.push({
      ad: 'Günlük Katılım',
      genislikler: [14, 10],
      satirlar: [r.katilim.basliklar, ...r.katilim.satirlar],
    });
  }

  return sayfalar;
}
