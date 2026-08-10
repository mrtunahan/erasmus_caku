import { describe, it, expect } from 'vitest';
import { tabanSatiriCoz, tabanTablosuCoz, metinKatmaniVarMi } from '../lib/taban-tablo.js';
import { tabanKaydiBul } from '../lib/taban-puan.js';

describe('tabanSatiriCoz — biçimler', () => {
  it('sekmeli (Excel/HTML kopyası)', () => {
    expect(tabanSatiriCoz('Bilgisayar Mühendisliği\t412,338')).toMatchObject({
      ad: 'Bilgisayar Mühendisliği',
      taban: '412,338',
    });
  });

  it('çok boşluklu (PDF metin katmanı)', () => {
    expect(tabanSatiriCoz('Gıda Mühendisliği      301,45')).toMatchObject({
      ad: 'Gıda Mühendisliği',
      taban: '301,45',
    });
  });

  it('noktalı virgüllü (CSV)', () => {
    expect(tabanSatiriCoz('Makine Mühendisliği;355.201')).toMatchObject({
      ad: 'Makine Mühendisliği',
      taban: '355.201',
    });
  });

  it('tek boşluklu satırı da çözer', () => {
    expect(tabanSatiriCoz('İnşaat Mühendisliği 288,90')).toMatchObject({
      ad: 'İnşaat Mühendisliği',
      taban: '288,90',
    });
  });

  it('sıra no ve kontenjan sütunlarını atar', () => {
    // 12 = sıra no, 85 = kontenjan, 85 = yerleşen, sondaki = taban
    expect(tabanSatiriCoz('12\tBilgisayar Mühendisliği\t85\t85\t412,338')).toMatchObject({
      ad: 'Bilgisayar Mühendisliği',
      taban: '412,338',
    });
  });

  it('taban-tavan satırında VARSAYILAN taban (ilk) puandır', () => {
    // En sağdaki alınsaydı TAVAN puan taban sanılır, şartı sağlayan aday
    // haksız yere elenirdi. Varsayılan daha düşük olanı seçer.
    const k = tabanSatiriCoz('Kimya Mühendisliği\t250,10\t410,55');
    expect(k.taban).toBe('250,10');
    expect(k.puanlar).toEqual(['250,10', '410,55']);
  });

  it('puan sütunu seçilebilir', () => {
    const satir = 'Kimya Mühendisliği\t250,10\t410,55';
    expect(tabanSatiriCoz(satir, 1).taban).toBe('410,55');
    // Aralık dışı seçim son sütuna kırpılır (çökmez)
    expect(tabanSatiriCoz(satir, 9).taban).toBe('410,55');
    expect(tabanSatiriCoz(satir, -3).taban).toBe('250,10');
  });

  it('kontenjan ile puanı karıştırmaz — ondalıksız sayı puan değildir', () => {
    const k = tabanSatiriCoz('7\tKimya Mühendisliği\t60\t58\t250,10');
    expect(k.puanlar).toEqual(['250,10']);
    expect(k.ad).toBe('Kimya Mühendisliği');
  });

  it('puan türü etiketini ayrı alana çıkarır', () => {
    expect(tabanSatiriCoz('Bilgisayar Mühendisliği (SAY)\t412,338')).toMatchObject({
      ad: 'Bilgisayar Mühendisliği',
      taban: '412,338',
      puanTuru: 'SAY',
    });
    expect(tabanSatiriCoz('İngiliz Dili ve Edebiyatı DİL\t320,10').puanTuru).toBe('DİL');
    expect(tabanSatiriCoz('Tarih SOZ\t280,55').puanTuru).toBe('SÖZ');
  });
});

describe('tabanSatiriCoz — reddedilenler', () => {
  it('boş ve ayraç satırları', () => {
    expect(tabanSatiriCoz('')).toBeNull();
    expect(tabanSatiriCoz('   ')).toBeNull();
    expect(tabanSatiriCoz('--------')).toBeNull();
    expect(tabanSatiriCoz('=====')).toBeNull();
  });

  it('başlık satırları', () => {
    expect(tabanSatiriCoz('Program Adı\tTaban Puan')).toBeNull();
    expect(tabanSatiriCoz('Sıra No  Program  Kontenjan')).toBeNull();
    expect(tabanSatiriCoz('Sayfa 3')).toBeNull();
  });

  it('ÖSYM ilanının çok satıra bölünmüş başlığı', () => {
    // Gerçek dosyada başlık dört ayrı satıra dağılıyordu ve hepsi
    // "çözülemedi" diye raporlanıyordu.
    expect(
      tabanSatiriCoz('2025 DGS Yerleştirme Sonuçlarına İlişkin En Küçük ve En Büyük Puanlar')
    ).toBeNull();
    expect(tabanSatiriCoz('PROGRAM\tEN KÜÇÜK\tEN BÜYÜK')).toBeNull();
    expect(tabanSatiriCoz('Fakülte Program PUAN TÜRÜ')).toBeNull();
    expect(tabanSatiriCoz('KODU \tPUAN\tPUAN')).toBeNull();
  });

  it('ondalıksız sayı taban puan sayılmaz — "85" kontenjandır', () => {
    expect(tabanSatiriCoz('Bilgisayar Mühendisliği\t85')).toBeNull();
  });

  it('adı olmayan / yalnız sayıdan ibaret satır', () => {
    expect(tabanSatiriCoz('412,338')).toBeNull();
    expect(tabanSatiriCoz('12\t85\t412,338')).toBeNull();
  });

  it('çok kısa ad gürültü sayılır', () => {
    expect(tabanSatiriCoz('A 412,3')).toBeNull();
  });

  it('sıfır ve negatif değer kabul edilmez', () => {
    expect(tabanSatiriCoz('Bir Program\t0,00')).toBeNull();
  });
});

describe('tabanTablosuCoz', () => {
  const yapistirilan = [
    'ÇANKIRI KARATEKİN ÜNİVERSİTESİ 2025 LİSANS TABAN PUANLAR',
    'Sıra No\tProgram Adı\tKontenjan\tTaban Puan',
    '',
    '1\tBilgisayar Mühendisliği\t85\t412,338',
    '2\tElektrik ve Elektronik Mühendisliği\t70\t388,120',
    '3\tMakine Mühendisliği\t70\t355,201',
    '4\tMaden Mühendisliği\t50\tDolmadı',
    '--------',
    'Sayfa 1',
    'TOPLAM\t275',
  ].join('\n');

  it('yapıştırılan tam tabloyu çözer', () => {
    const r = tabanTablosuCoz(yapistirilan);
    expect(r.kayitlar).toHaveLength(3);
    expect(r.kayitlar.map((k) => k.ad)).toEqual([
      'Bilgisayar Mühendisliği',
      'Elektrik ve Elektronik Mühendisliği',
      'Makine Mühendisliği',
    ]);
    expect(r.kayitlar[0].taban).toBe('412,338');
  });

  it('puanı olmayan programı ayrı kümeye koyar, çözülemeyene değil', () => {
    // "Dolmadı" bir okuma hatası değil, bilgi: o programa yerleşen olmamış.
    const r = tabanTablosuCoz(yapistirilan);
    expect(r.okunamayan).toEqual([]);
    expect(r.puansizlar.map((k) => k.ad)).toEqual(['Maden Mühendisliği']);
  });

  it('gerçekten anlaşılmayan satır çözülemeyene düşer', () => {
    const r = tabanTablosuCoz('lorem ipsum dolor sit');
    expect(r.okunamayan).toHaveLength(1);
  });

  it('tekrar eden programı bir kez alır', () => {
    const r = tabanTablosuCoz(
      ['Bilgisayar Mühendisliği\t412,338', 'Bilgisayar Mühendisliği\t412,338'].join('\n')
    );
    expect(r.kayitlar).toHaveLength(1);
  });

  it('tekrarda Türkçe kasa farkı da aynı sayılır', () => {
    const r = tabanTablosuCoz(
      ['BİLGİSAYAR MÜHENDİSLİĞİ\t412,338', 'Bilgisayar Mühendisliği\t400,00'].join('\n')
    );
    expect(r.kayitlar).toHaveLength(1);
    expect(r.kayitlar[0].taban).toBe('412,338');
  });

  it('boş girdide boş sonuç', () => {
    expect(tabanTablosuCoz('').kayitlar).toEqual([]);
    expect(tabanTablosuCoz(null).kayitlar).toEqual([]);
    expect(tabanTablosuCoz(undefined).toplamSatir).toBe(0);
  });

  it('gerçek PDF metin katmanı düzeni (hizalama boşluklu)', () => {
    const pdfMetni = [
      'PROGRAM ADI                          KONT.   TABAN',
      'Bilgisayar Mühendisliği                 85   412,338',
      'Gıda Mühendisliği                       50   301,450',
    ].join('\n');
    const r = tabanTablosuCoz(pdfMetni);
    expect(r.kayitlar).toHaveLength(2);
    expect(r.kayitlar[1]).toMatchObject({ ad: 'Gıda Mühendisliği', taban: '301,450' });
  });
});

describe('metinKatmaniVarMi', () => {
  it('gerçek metinli PDF', () => {
    expect(metinKatmaniVarMi('x'.repeat(2000), 3)).toBe(true);
  });

  it('taranmış PDF — metin katmanı yok', () => {
    expect(metinKatmaniVarMi('', 5)).toBe(false);
    expect(metinKatmaniVarMi('   \n  \n ', 5)).toBe(false);
    // Sayfa başına birkaç karakterlik çöp
    expect(metinKatmaniVarMi('a b c d', 5)).toBe(false);
  });

  it('sayfa sayısı verilmezse tek sayfa varsayar', () => {
    expect(metinKatmaniVarMi('x'.repeat(100))).toBe(true);
    expect(metinKatmaniVarMi('kısa')).toBe(false);
  });
});

describe('tabanTablosuCoz — puan sütunu seçimi', () => {
  const tabanTavan = [
    'Bilgisayar Mühendisliği\t412,338\t455,120',
    'Makine Mühendisliği\t355,201\t399,400',
  ].join('\n');

  it('varsayılan ilk sütun (taban)', () => {
    const r = tabanTablosuCoz(tabanTavan);
    expect(r.kayitlar.map((k) => k.taban)).toEqual(['412,338', '355,201']);
  });

  it('ikinci sütun seçilebilir (tavan sırası ters yayımlanmışsa)', () => {
    const r = tabanTablosuCoz(tabanTavan, 1);
    expect(r.kayitlar.map((k) => k.taban)).toEqual(['455,120', '399,400']);
  });

  it('kaç puan sütunu olduğunu bildirir — panel soruyu ona göre sorar', () => {
    expect(tabanTablosuCoz(tabanTavan).enCokPuanSutunu).toBe(2);
    expect(tabanTablosuCoz('Gıda Mühendisliği\t301,45').enCokPuanSutunu).toBe(1);
    expect(tabanTablosuCoz('').enCokPuanSutunu).toBe(0);
  });
});

// ── Gerçek dosya: 2025 DGS Taban ve Tavan ilanı (ÇAKÜ) ──
// Bu düzen kodu iki yerden kırdı: başlık dört satıra bölünmüştü ve puanı
// yayımlanmamış programlar ("-- --") "çözülemedi" diye raporlanıyordu.
describe('ÖSYM DGS ilanı düzeni', () => {
  const gercek = [
    '2025 DGS Yerleştirme Sonuçlarına İlişkin En Küçük ve En Büyük Puanlar',
    'PROGRAM\tEN KÜÇÜK\tEN BÜYÜK',
    'Fakülte Program PUAN TÜRÜ',
    'KODU \tPUAN\tPUAN',
    '102810138 Fen Fakültesi Biyoloji SAY 245,38197 263,26446',
    '102890200 Fen Fakültesi Fizik SAY -- --',
    '102890059 Mühendislik Fakültesi Bilgisayar Mühendisliği SAY 307,84423 311,79782',
    '102890070 Mühendislik Fakültesi Makine Mühendisliği SAY 283,62244 283,62244',
  ].join('\n');

  it('program kodunu addan ayırır', () => {
    const k = tabanSatiriCoz(
      '102890059 Mühendislik Fakültesi Bilgisayar Mühendisliği SAY 307,84423 311,79782'
    );
    expect(k.kod).toBe('102890059');
    expect(k.ad).toBe('Mühendislik Fakültesi Bilgisayar Mühendisliği');
    expect(k.puanTuru).toBe('SAY');
  });

  it('EN KÜÇÜK puanı taban alır — EN BÜYÜK değil', () => {
    // Tavan alınsaydı 307,84 yerine 311,79 taban sanılır, aradaki adaylar
    // haksız yere elenirdi.
    const k = tabanSatiriCoz(
      '102890059 Mühendislik Fakültesi Bilgisayar Mühendisliği SAY 307,84423 311,79782'
    );
    expect(k.taban).toBe('307,84423');
  });

  it('"-- --" satırı HATA değil, puanı yayımlanmamış programdır', () => {
    const k = tabanSatiriCoz('102890200 Fen Fakültesi Fizik SAY -- --');
    expect(k.puansiz).toBe(true);
    expect(k.ad).toBe('Fen Fakültesi Fizik');
    expect(k.taban).toBe('');
  });

  it('"Dolmadı" da puansız sayılır', () => {
    const k = tabanSatiriCoz('Maden Mühendisliği\tDolmadı');
    expect(k.puansiz).toBe(true);
    expect(k.ad).toBe('Maden Mühendisliği');
  });

  it('tam dosyada başlık ve puansız satırlar çözülemeyene düşmez', () => {
    const r = tabanTablosuCoz(gercek);
    expect(r.kayitlar).toHaveLength(3);
    expect(r.puansizlar).toHaveLength(1);
    expect(r.okunamayan).toEqual([]); // ← asıl şikâyet buydu
  });

  it('istenen program tablodan eşleşir (kod ve fakülte adına rağmen)', () => {
    const r = tabanTablosuCoz(gercek);
    const bulunan = tabanKaydiBul(r.kayitlar, 'Bilgisayar Mühendisliği');
    expect(bulunan).not.toBeNull();
    expect(bulunan.taban).toBe('307,84423');
  });
});

// ── Taban BAŞARI SIRASI sütunu ──
// Yatay geçişteki uygunluk şartı puanla değil sırayla konuyor; bölümler
// geçmiş yılların tablolarını bu şart için kullanmak istiyor.
describe('tabanSatiriCoz — başarı sırası sütunu', () => {
  // ÖSYM satırı: kod, ad, tür, kontenjan, yerleşen, taban puan, tavan puan,
  // taban başarı sırası, tavan başarı sırası
  const satir =
    '102890059\tBilgisayar Mühendisliği\tSAY\t60\t60\t412,33812\t456,78901\t185.432\t92.104';

  it('puandan SONRAKİ tüm sayı sütunları saklanır', () => {
    const k = tabanSatiriCoz(satir);
    // Kontenjan ve yerleşen (60, 60) puandan ÖNCE geldiği için sayılmaz.
    expect(k.sayilar).toEqual(['412,33812', '456,78901', '185.432', '92.104']);
  });

  it('seçilen sütun taban sırası olur', () => {
    expect(tabanSatiriCoz(satir, 0, 2).tabanSira).toBe('185.432');
    expect(tabanSatiriCoz(satir, 0, 3).tabanSira).toBe('92.104');
  });

  it('sütun seçilmezse sıra OKUNMAZ — tahmin edilmez', () => {
    // "185.432" biçimsel olarak hem 185 tam 432 küsurat bir puan hem de
    // yüz seksen beş binlik bir sıra olabilir. Yanlış tahmin, yanlış
    // kriterle eleme demek.
    expect(tabanSatiriCoz(satir).tabanSira).toBe('');
    expect(tabanSatiriCoz(satir, 0, -1).tabanSira).toBe('');
  });

  it('aralık dışı sütun seçimi boş bırakır, çökmez', () => {
    expect(tabanSatiriCoz(satir, 0, 99).tabanSira).toBe('');
  });

  it('taban puan seçimi sıradan bağımsızdır', () => {
    const k = tabanSatiriCoz(satir, 0, 2);
    expect(k.taban).toBe('412,33812');
    expect(k.tabanSira).toBe('185.432');
  });

  it('puansız satırda sıra da boştur', () => {
    const k = tabanSatiriCoz('102890059\tYeni Program\tSAY\t--\t--', 0, 2);
    expect(k.puansiz).toBe(true);
    expect(k.tabanSira).toBe('');
  });
});

describe('tabanTablosuCoz — sayı sütunu sayısı', () => {
  const metin = [
    '102890059\tBilgisayar Mühendisliği\tSAY\t60\t60\t412,33812\t456,78901\t185.432\t92.104',
    '102890068\tGıda Mühendisliği\tSAY\t50\t50\t298,11223\t340,55600\t420.911\t250.300',
  ].join('\n');

  it('panel kaç sütun soracağını bilir', () => {
    const c = tabanTablosuCoz(metin);
    expect(c.enCokSayiSutunu).toBe(4);
    expect(c.enCokPuanSutunu).toBe(4);
  });

  it('seçilen sıra sütunu tüm satırlara uygulanır', () => {
    const c = tabanTablosuCoz(metin, 0, 2);
    expect(c.kayitlar.map((k) => k.tabanSira)).toEqual(['185.432', '420.911']);
  });
});
