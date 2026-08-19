// Bölümün "açılan dersler" Word tablosunu okuma kuralları.
// Yapı, kullanıcının yüklediği gerçek belgeden (2026/2027 Güz — EEM Lisans)
// birebir alınmıştır: sınıf başlıkları tabloNUN İÇİNDE, T/U/L sütunları
// okunmaz, çok danışmanlı ders kod tekrarıyla yazılır.
import { describe, it, expect } from 'vitest';
import {
  adAnahtari,
  akademisyenEsle,
  basAnahtari,
  dersKoduMu,
  dersleriCoz,
  docxBaslikParagraflari,
  docxTablolari,
  eksikAlanlar,
  etiketBloklari,
  hucreMetni,
  iceAktarmaSatirlari,
  kunyeTahmini,
  mevcutDersBul,
  pdfSatirlari,
  sayiCoz,
  sinifCoz,
  statuCoz,
  sutunHaritasi,
  unvaniSoy,
} from '../lib/ders-listesi-ice-aktar.js';

// ── Gerçek belgenin küçültülmüş hâli ──
const tc = (t) => `<w:tc><w:tcPr/><w:p><w:r><w:t>${t}</w:t></w:r></w:p></w:tc>`;
const tr = (...h) => `<w:tr><w:trPr/>${h.map(tc).join('')}</w:tr>`;
const BELGE = `<w:document><w:body>
<w:p><w:r><w:t>ÇANKIRI KARATEKİN ÜNİVİERSİTESİ</w:t></w:r></w:p>
<w:p><w:r><w:t>202</w:t></w:r><w:r><w:t>6</w:t></w:r><w:r><w:t>/202</w:t></w:r><w:r><w:t>7</w:t></w:r><w:r><w:t> GÜZ</w:t></w:r><w:r><w:t> DÖNEMİ</w:t></w:r></w:p>
<w:tbl><w:tblPr/>
${tr('1.SINIF')}
${tr('DERS KODU', 'DERSİN ADI', 'N', 'T', 'U', 'L', 'AKTS', 'DERSİ YÜRÜTECEK ÖĞRETİM ELEMANI')}
${tr('EMU101', 'Elektrik Elektronik Mühendisliğine Giriş', 'Z', '2', '0', '0', '2', 'Dr. Öğr. Üyesi Enes Bektaş')}
${tr('EEM121', 'Bilgisayar Destekli Teknik Resim', 'Z', '3', '0', '0', '4', 'Dr. Öğr. Üyesi Mustafa Teke')}
${tr('', '', '', '', '', '', '', '')}
${tr('4.SINIF')}
${tr('EEM421', 'Lisans Araştırma Projesi', 'Z', '2', '0', '0', '10', 'Prof. Dr. Murat Arı')}
${tr('EEM421', 'Lisans Araştırma Projesi', '', '', '', '', '', 'Doç. Dr. Fatih Korkmaz')}
${tr('EEM439', 'Optoelektronik', 'S', '3', '0', '0', '4', 'Prof. Dr. Murat Arı')}
</w:tbl></w:body></w:document>`;

describe('etiketBloklari', () => {
  it('etiket adını TAM eşler — <w:trPr> satır sanılmaz', () => {
    // '<w:tr' düz araması '<w:trPr' ile de eşleşir; satır sınırı kayar ve
    // tablo hücreleri birbirine karışırdı.
    expect(etiketBloklari('<w:tr><w:trPr/><w:tc>A</w:tc></w:tr>', 'w:tr')).toEqual([
      '<w:trPr/><w:tc>A</w:tc>',
    ]);
  });

  it('iç içe blokları dıştakine katmaz', () => {
    const x = '<w:tbl>A<w:tbl>İÇ</w:tbl>B</w:tbl><w:tbl>C</w:tbl>';
    expect(etiketBloklari(x, 'w:tbl')).toEqual(['A<w:tbl>İÇ</w:tbl>B', 'C']);
  });

  it('kendini kapatan etiket boş blok sayılır', () => {
    expect(etiketBloklari('<w:tc/><w:tc>X</w:tc>', 'w:tc')).toEqual(['', 'X']);
  });

  it('boş girdide çökmez', () => {
    expect(etiketBloklari('', 'w:tbl')).toEqual([]);
    expect(etiketBloklari(null, 'w:tbl')).toEqual([]);
  });
});

describe('hucreMetni', () => {
  it('parçalanmış metni ARALIKSIZ birleştirir', () => {
    // Word bir kelimeyi biçimlendirme yüzünden bölüyor; araya boşluk koymak
    // 'Elektronik'i 'Elek tronik' yapardı.
    expect(hucreMetni('<w:r><w:t>Elek</w:t></w:r><w:r><w:t>tronik</w:t></w:r>')).toBe('Elektronik');
  });

  it('paragraf sonu ve satır sonu boşluk olur', () => {
    expect(hucreMetni('<w:p><w:t>A</w:t></w:p><w:p><w:t>B</w:t></w:p>')).toBe('A B');
    expect(hucreMetni('<w:t>A</w:t><w:br/><w:t>B</w:t>')).toBe('A B');
  });

  it('XML kaçışlarını çözer', () => {
    expect(hucreMetni('<w:t>Devre &amp; Sistem</w:t>')).toBe('Devre & Sistem');
  });
});

describe('unvaniSoy', () => {
  it('unvanı ve ardındaki noktalamayı birlikte atar', () => {
    // 'Doç. Dr.' sade hâli 'doçdr'; sayaç 'r'de dolduğu için SON NOKTA
    // kalıyor ve ad '. Fatih Korkmaz' diye çıkıyordu.
    expect(unvaniSoy('Doç. Dr. Fatih Korkmaz')).toBe('Fatih Korkmaz');
    expect(unvaniSoy('Prof. Dr. Murat Arı')).toBe('Murat Arı');
    expect(unvaniSoy('Dr. Öğr. Üyesi Enes Bektaş')).toBe('Enes Bektaş');
    expect(unvaniSoy('Arş. Gör. Dr. Ayşe Yılmaz')).toBe('Ayşe Yılmaz');
  });

  it('unvansız adı olduğu gibi bırakır', () => {
    expect(unvaniSoy('Enes Bektaş')).toBe('Enes Bektaş');
    expect(unvaniSoy('')).toBe('');
  });
});

describe('basAnahtari — başlık eşleştirmesi', () => {
  it('BÜYÜK harf Türkçe kuralını ("ADI" → "adı") yok sayar', () => {
    expect(basAnahtari('DERSİN ADI')).toBe(basAnahtari('DERSIN ADI'));
    expect(basAnahtari('ÖĞRETİM ELEMANI')).toBe(basAnahtari('OGRETIM ELEMANI'));
  });

  it('ad eşleştirmesinde bu daraltma YAPILMAZ — ı ile i ayrı harftir', () => {
    expect(adAnahtari('Arı')).not.toBe(adAnahtari('Ari'));
  });
});

describe('sutunHaritasi', () => {
  it('sütunları başlık ADINDAN bulur, sıraya güvenmez', () => {
    expect(sutunHaritasi(['DERSİ VEREN', 'AKTS', 'DERS KODU', 'DERSİN ADI', 'N'])).toEqual({
      ogretimElemani: 0,
      akts: 1,
      kod: 2,
      ad: 3,
      statu: 4,
    });
  });

  it('kod ve ad yoksa başlık sayılmaz', () => {
    expect(sutunHaritasi(['AKTS', 'N'])).toBe(null);
    expect(sutunHaritasi(['EMU101', 'Devre Analizi'])).toBe(null);
  });
});

describe('küçük çözücüler', () => {
  it('sinifCoz', () => {
    expect(sinifCoz('1.SINIF')).toBe(1);
    expect(sinifCoz('4. SINIF')).toBe(4);
    expect(sinifCoz('SEÇMELİ DERSLER')).toBe(5);
    expect(sinifCoz('EMU101')).toBe(null);
  });
  it('statuCoz', () => {
    expect(statuCoz('Z')).toBe('Z');
    expect(statuCoz('Seçmeli')).toBe('S');
    expect(statuCoz('')).toBe('');
  });
  it('sayiCoz — 0 ile "boş" karışmaz', () => {
    expect(sayiCoz('10')).toBe(10);
    expect(sayiCoz('0')).toBe(0);
    expect(sayiCoz('')).toBe(null);
  });
  it('dersKoduMu', () => {
    expect(dersKoduMu('EMU101')).toBe(true);
    expect(dersKoduMu('MAT-161')).toBe(true);
    expect(dersKoduMu('1.SINIF')).toBe(false);
    expect(dersKoduMu('Lisans Araştırma Projesi')).toBe(false);
  });
});

describe('dersleriCoz — gerçek belge yapısı', () => {
  const { dersler, uyarilar } = dersleriCoz(docxTablolari(BELGE)[0]);

  it('sınıf başlığını tablonun İÇİNDEN okur', () => {
    expect(dersler.map((d) => [d.kod, d.sinif])).toEqual([
      ['EMU101', 1],
      ['EEM121', 1],
      ['EEM421', 4],
      ['EEM439', 4],
    ]);
  });

  it('T/U/L sütunları okunmaz, AKTS doğru sütundan gelir', () => {
    expect(dersler[0]).toMatchObject({ kod: 'EMU101', statu: 'Z', akts: 2 });
    expect(dersler[2]).toMatchObject({ kod: 'EEM421', statu: 'Z', akts: 10 });
  });

  it('kod tekrarlı + N/AKTS boş satır AYRI DERS DEĞİL, ikinci danışmandır', () => {
    // Ayrı ders saymak listeyi sekiz kopyayla şişirirdi.
    expect(dersler).toHaveLength(4);
    expect(dersler[2].ogretimElemanlari).toEqual(['Prof. Dr. Murat Arı', 'Doç. Dr. Fatih Korkmaz']);
  });

  it('aynı kod KENDİ AKTS’siyle yeniden geçerse ayrı kayıttır', () => {
    const { dersler: iki } = dersleriCoz([
      ['DERS KODU', 'DERSİN ADI', 'N', 'AKTS', 'ÖĞRETİM ELEMANI'],
      ['EEM101', 'Devre', 'Z', '4', 'A Hoca'],
      ['EEM101', 'Devre (eski müfredat)', 'Z', '5', 'B Hoca'],
    ]);
    expect(iki).toHaveLength(2);
    expect(iki[1].akts).toBe(5);
  });

  it('sınıf başlığı ders kodu sanılıp uyarı üretmez', () => {
    expect(uyarilar).toEqual([]);
  });

  it('koda benzemeyen satır SEBEBİYLE bildirilir — sessizce düşmez', () => {
    const { dersler: d, uyarilar: u } = dersleriCoz([
      ['DERS KODU', 'DERSİN ADI', 'AKTS'],
      ['TOPLAM', '', '30'],
    ]);
    expect(d).toEqual([]);
    expect(u[0]).toContain('ders koduna benzemiyor');
  });

  it('başlıktan önceki serbest metin satırları yok sayılır', () => {
    const { dersler: d } = dersleriCoz([
      ['ÇANKIRI KARATEKİN ÜNİVERSİTESİ'],
      ['DERS KODU', 'DERSİN ADI', 'AKTS'],
      ['EEM101', 'Devre', '4'],
    ]);
    expect(d.map((x) => x.kod)).toEqual(['EEM101']);
  });

  it('boş girdide çökmez', () => {
    expect(dersleriCoz(null)).toEqual({ dersler: [], uyarilar: [] });
  });
});

describe('docxBaslikParagraflari / kunyeTahmini', () => {
  it('paragraf parçalarını ARALIKSIZ birleştirir', () => {
    // Word yılı '202'+'6'+'/202'+'7' diye bölüyor; araya boşluk koymak
    // '2026/2027'yi tanınmaz hâle getirirdi.
    expect(docxBaslikParagraflari(BELGE)).toEqual([
      'ÇANKIRI KARATEKİN ÜNİVİERSİTESİ',
      '2026/2027 GÜZ DÖNEMİ',
    ]);
  });

  it('dönem ve akademik yılı başlıktan tahmin eder', () => {
    expect(kunyeTahmini(docxBaslikParagraflari(BELGE).join('\n'))).toEqual({
      donem: 'guz',
      seviye: '',
      akademikYil: '2026-2027',
    });
  });

  it('bulunamayan alanı UYDURMAZ', () => {
    expect(kunyeTahmini('AÇILAN DERSLER')).toEqual({
      donem: '',
      seviye: '',
      akademikYil: '',
    });
  });
});

describe('pdfSatirlari', () => {
  it('sekmeyi hücre sınırı sayar — boşluklu ders adı bölünmez', () => {
    expect(pdfSatirlari('EEM101\tDevre Analizi I\tZ\t4\n\n')).toEqual([
      ['EEM101', 'Devre Analizi I', 'Z', '4'],
    ]);
  });
});

describe('akademisyenEsle', () => {
  const liste = [
    { id: '1', name: 'Dr. Öğr. Üyesi Enes BEKTAŞ' },
    { id: '2', name: 'Doç. Dr. Fatih Korkmaz' },
    { id: '3', name: 'Prof. Dr. Murat Arı' },
    { id: '4', name: 'Dr. Öğr. Üyesi Ahmet Yılmaz' },
    { id: '5', name: 'Öğr. Gör. Ayşe Yılmaz' },
  ];

  it('unvan farklı olsa da adı eşler', () => {
    expect(akademisyenEsle('Dr. Öğr. Üyesi Enes Bektaş', liste).id).toBe('1');
    expect(akademisyenEsle('Fatih Korkmaz', liste).id).toBe('2');
  });

  it('ad-soyad sırası değişse de eşler', () => {
    expect(akademisyenEsle('Arı Murat', liste).id).toBe('3');
  });

  it('BELİRSİZ eşleşmeyi reddeder — yanlış hocaya yazmaktansa boş kalır', () => {
    // 'A. Yılmaz' hem Ahmet hem Ayşe olabilir; seçim yetkilinindir.
    expect(akademisyenEsle('A. Yılmaz', liste)).toBe(null);
  });

  it('bulunamazsa null döner', () => {
    expect(akademisyenEsle('Bilinmeyen Kişi', liste)).toBe(null);
    expect(akademisyenEsle('', liste)).toBe(null);
  });
});

describe('mevcutDersBul', () => {
  const kayitli = [
    { id: 'a', code: 'EEM101', donem: 'guz' },
    { id: 'b', code: 'EEM101', donem: 'bahar' },
  ];
  it('aynı kod + aynı dönem aynı derstir', () => {
    expect(mevcutDersBul({ kod: 'eem101' }, 'bahar', kayitli).id).toBe('b');
  });
  it('başka dönemdeki aynı kod ayrı derstir', () => {
    expect(mevcutDersBul({ kod: 'EEM999' }, 'guz', kayitli)).toBe(null);
  });
});

describe('iceAktarmaSatirlari / eksikAlanlar', () => {
  const { dersler } = dersleriCoz(docxTablolari(BELGE)[0]);
  const akademisyenler = [
    { id: '1', name: 'Dr. Öğr. Üyesi Enes BEKTAŞ' },
    { id: '3', name: 'Prof. Dr. Murat Arı' },
  ];
  const satirlar = iceAktarmaSatirlari(dersler, {
    akademisyenler,
    mevcutDersler: [{ id: 'x', code: 'EEM439', donem: 'guz' }],
    donem: 'guz',
    seviye: 'lisans',
    bolognaLink: 'https://bologna.example/eem',
  });

  it('eşleşen akademisyenin SİSTEMDEKİ adını kullanır', () => {
    expect(satirlar[0].professor).toBe('Dr. Öğr. Üyesi Enes BEKTAŞ');
  });

  it('eşleşmeyen adı unvansız bırakır ve ayrıca bildirir', () => {
    expect(satirlar[1].professor).toBe('Mustafa Teke');
    expect(satirlar[1].eslesmeyen).toEqual(['Dr. Öğr. Üyesi Mustafa Teke']);
  });

  it('çok danışmanlı derste eşleşen İLK kişi seçili gelir, hepsi durur', () => {
    expect(satirlar[2].professor).toBe('Prof. Dr. Murat Arı');
    expect(satirlar[2].ogretimElemanlari).toHaveLength(2);
  });

  it('kayıtlı ders "güncellenecek" işaretlenir', () => {
    expect(satirlar.map((r) => r.durum)).toEqual(['yeni', 'yeni', 'yeni', 'guncelle']);
    expect(satirlar[3].mevcutId).toBe('x');
  });

  it('toplu alanlar her satıra yazılır', () => {
    satirlar.forEach((r) => {
      expect(r.donem).toBe('guz');
      expect(r.bolognaLink).toBe('https://bologna.example/eem');
    });
  });

  it('tam satırda eksik yoktur', () => {
    expect(eksikAlanlar(satirlar[0])).toEqual([]);
  });

  it('eksik alanları ADIYLA sayar — yarım ders kaydı sessizce geçmesin', () => {
    expect(eksikAlanlar({ ...satirlar[0], statu: '', bolognaLink: '', akts: null })).toEqual([
      'Z/S',
      'AKTS',
      'Bologna linki',
    ]);
  });
});
