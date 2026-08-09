import { describe, it, expect } from 'vitest';
import { tabanSatiriCoz, tabanTablosuCoz, metinKatmaniVarMi } from '../lib/taban-tablo.js';

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

  it('ondalıksız sayı taban puan sayılmaz (kontenjan / "dolmadı")', () => {
    // Taban puanlar her zaman ondalıklı yayımlanıyor; "85" kontenjandır.
    expect(tabanSatiriCoz('Bilgisayar Mühendisliği\t85')).toBeNull();
    expect(tabanSatiriCoz('Maden Mühendisliği\tDolmadı')).toBeNull();
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

  it('çözülemeyen satırları saklar — sessizce yutmaz', () => {
    const r = tabanTablosuCoz(yapistirilan);
    expect(r.okunamayan.some((s) => s.includes('Maden'))).toBe(true);
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
