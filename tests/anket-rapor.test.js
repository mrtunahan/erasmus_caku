import { describe, it, expect } from 'vitest';
import {
  anketRaporu,
  hucreMetni,
  raporDosyaAdi,
  raporExcelSayfalari,
  raporWordGovdesi,
  sayiTr,
  tarihTr,
  yanitTablosu,
  yuzdeTr,
  zamanTr,
} from '../lib/anket-rapor.js';

const LIKERT = {
  id: 'q1',
  type: 'likert',
  text: 'Ders içeriği yeterliydi',
};
const COKLU = {
  id: 'q2',
  type: 'coklu',
  text: 'Hangi kaynakları kullandınız?',
  secenekler: [
    { deger: 'kitap', etiket: 'Kitap' },
    { deger: 'video', etiket: 'Video' },
    { deger: 'not', etiket: 'Ders notu' },
  ],
};
const METIN = { id: 'q3', type: 'textarea', text: 'Eklemek istedikleriniz' };

const ANKET = {
  title: 'Ders Değerlendirme',
  description: 'Güz dönemi',
  infoFields: [{ key: 'dersKodu', label: 'Ders Kodu', source: 'courseCode' }],
  questions: [LIKERT, COKLU, METIN],
};

const yanit = (i, q1, q2, q3) => ({
  submittedAt: '2026-03-0' + i + 'T09:30:00.000Z',
  role: 'student',
  answers: { dersKodu: 'MAT101', q1, q2, q3 },
});

const YANITLAR = [
  yanit(1, '5', ['kitap', 'video'], 'Çok iyiydi'),
  yanit(2, '4', ['kitap'], ''),
  yanit(3, '4', ['not'], 'Saat erkendi'),
  yanit(4, '2', [], null),
];

describe('sayı ve tarih biçimi', () => {
  it('ondalık ayracı virgül', () => {
    expect(sayiTr(4.2058)).toBe('4,21');
    expect(sayiTr(3, 1)).toBe('3,0');
  });

  it('sayı olmayan değerde boş dize', () => {
    expect(sayiTr(null)).toBe('');
    expect(sayiTr('abc')).toBe('');
  });

  it('oran yüzdeye çevrilir', () => {
    expect(yuzdeTr(0.6423)).toBe('%64');
    expect(yuzdeTr(0.5, 1)).toBe('%50,0');
    expect(yuzdeTr(0)).toBe('%0');
  });

  it('ISO tarih gün.ay.yıl olur', () => {
    expect(tarihTr('2026-09-18T07:14:00.000Z')).toBe('18.09.2026');
    expect(tarihTr('2026-09-18')).toBe('18.09.2026');
  });

  it('tanınmayan tarih olduğu gibi kalır', () => {
    expect(tarihTr('yakında')).toBe('yakında');
    expect(tarihTr('')).toBe('');
  });

  it('zaman damgasında saat de yazılır', () => {
    expect(zamanTr('2026-09-18T07:14:00.000Z')).toBe('18.09.2026 07:14');
    expect(zamanTr('2026-09-18')).toBe('18.09.2026');
  });
});

describe('hucreMetni', () => {
  // Raporu açanın elinde kod cetveli yok: '4' değil 'Katılıyorum' yazılır.
  it('şıklı soruda ham değer değil ETİKET', () => {
    expect(hucreMetni(LIKERT, '4')).toBe('Katılıyorum');
  });

  it('çoklu seçim virgülle birleşir', () => {
    expect(hucreMetni(COKLU, ['kitap', 'not'])).toBe('Kitap, Ders notu');
  });

  it('metin sorusu olduğu gibi', () => {
    expect(hucreMetni(METIN, 'güzeldi')).toBe('güzeldi');
  });

  it('boş yanıt boş hücre', () => {
    expect(hucreMetni(LIKERT, null)).toBe('');
    expect(hucreMetni(COKLU, [])).toBe('');
  });

  it('silinmiş şıkkın değeri kaybolmaz', () => {
    expect(hucreMetni(LIKERT, '9')).toBe('9');
  });
});

describe('yanitTablosu', () => {
  const t = yanitTablosu(ANKET, YANITLAR);

  it('sabit sütunlar + bilgi alanları + sorular', () => {
    expect(t.basliklar).toEqual([
      '#',
      'Tarih',
      'Rol',
      'Ders Kodu',
      'S1. Ders içeriği yeterliydi',
      'S2. Hangi kaynakları kullandınız?',
      'S3. Eklemek istedikleriniz',
    ]);
  });

  it('her yanıt bir satır, sıra numaralı', () => {
    expect(t.satirlar).toHaveLength(4);
    expect(t.satirlar[0][0]).toBe(1);
    expect(t.satirlar[0][1]).toBe('01.03.2026 09:30');
  });

  it('rol Türkçeye çevrilir', () => {
    expect(t.satirlar[0][2]).toBe('Öğrenci');
  });

  it('şıklar etiketle yazılır', () => {
    expect(t.satirlar[0][4]).toBe('Kesinlikle katılıyorum');
    expect(t.satirlar[0][5]).toBe('Kitap, Video');
  });

  it('yanıtsız hücre boş kalır, satır kaymaz', () => {
    expect(t.satirlar[3]).toHaveLength(t.basliklar.length);
    expect(t.satirlar[3][5]).toBe('');
    expect(t.satirlar[3][6]).toBe('');
  });

  it('yanıt yoksa yalnız başlık', () => {
    expect(yanitTablosu(ANKET, []).satirlar).toEqual([]);
  });
});

describe('anketRaporu', () => {
  const r = anketRaporu(ANKET, YANITLAR, { uretimTarihi: '2026-09-18T10:00:00Z' });

  it('künyede anket adı, yanıt sayısı ve rapor tarihi var', () => {
    const k = Object.fromEntries(r.kunye.map((x) => [x.etiket, x.deger]));
    expect(k['Anket']).toBe('Ders Değerlendirme');
    expect(k['Toplam yanıt']).toBe('4');
    expect(k['Soru sayısı']).toBe('3');
    expect(k['Rapor tarihi']).toBe('18.09.2026');
    expect(k['Son yanıt']).toBe('04.03.2026');
  });

  it('süzgeç yalnız verilmişse künyeye girer', () => {
    expect(r.kunye.some((x) => x.etiket === 'Süzgeç')).toBe(false);
    const s = anketRaporu(ANKET, YANITLAR, { suzgec: 'MAT101 — Matematik' });
    expect(s.kunye.find((x) => x.etiket === 'Süzgeç').deger).toBe('MAT101 — Matematik');
    expect(s.suzgec).toBe('MAT101 — Matematik');
  });

  it('genel ortalama beşlik gösterimde', () => {
    const k = r.kunye.find((x) => x.etiket === 'Genel ortalama (5 üzerinden)');
    expect(k.deger).toBe('3,75');
  });

  it('sayısal ölçekli soru yoksa ortalama yerine tire ve GEREKÇESİ', () => {
    const y = anketRaporu({ title: 'x', questions: [METIN] }, [
      { submittedAt: '2026-01-01T00:00:00Z', answers: { q3: 'merhaba' } },
    ]);
    const k = y.kunye.find((x) => x.etiket === 'Genel ortalama (5 üzerinden)');
    expect(k.deger).toBe('—');
    expect(k.not).toMatch(/Sayısal ölçekli soru yok/);
  });

  it('kıyas tablosu yalnız sayısal soruları, ortalamaya göre sıralı verir', () => {
    expect(r.kiyas.satirlar).toHaveLength(1);
    expect(r.kiyas.satirlar[0][0]).toBe('S1. Ders içeriği yeterliydi');
    expect(r.kiyas.satirlar[0][1]).toBe('3,75');
    expect(r.kiyas.satirlar[0][2]).toBe('1–5');
  });

  it('kıyaslanacak soru yoksa kıyas bölümü hiç yok', () => {
    expect(anketRaporu({ title: 'x', questions: [METIN] }, []).kiyas).toBe(null);
  });

  it('her soru için bir bölüm — sıralı ve başlıklı', () => {
    expect(r.sorular.map((q) => q.baslik)).toEqual([
      'S1. Ders içeriği yeterliydi',
      'S2. Hangi kaynakları kullandınız?',
      'S3. Eklemek istedikleriniz',
    ]);
  });

  it('şıklı soruda dağılım tablosu etiket + kişi + oran', () => {
    const q1 = r.sorular[0];
    expect(q1.tablo.basliklar).toEqual(['Şık', 'Kişi', 'Oran']);
    expect(q1.tablo.satirlar).toEqual([
      ['Kesinlikle katılmıyorum', 0, '%0'],
      ['Katılmıyorum', 1, '%25'],
      ['Kararsızım', 0, '%0'],
      ['Katılıyorum', 2, '%50'],
      ['Kesinlikle katılıyorum', 1, '%25'],
    ]);
  });

  it('sayısal ölçekte ortalama/medyan/sapma notu yazılır', () => {
    expect(r.sorular[0].notlar[0]).toMatch(/^Ortalama 3,75 \/ 5 · medyan 4,0 · standart sapma /);
  });

  it('sıralı ölçekte uç oranları da yazılır', () => {
    expect(r.sorular[0].notlar[1]).toBe('Olumlu uç %75 · nötr %0 · olumsuz uç %25');
  });

  // Sırasız bir listede "olumlu/olumsuz uç" anlamsızdır: şıkların sırası
  // bir yön anlatmıyor (ör. "Programı nereden duydunuz?").
  it('sırasız şıklarda uç oranı YAZILMAZ', () => {
    const q2 = r.sorular[1];
    expect(q2.sirali).toBe(false);
    expect(q2.notlar.join(' ')).not.toMatch(/Olumlu uç/);
    expect(q2.notlar.join(' ')).not.toMatch(/Ortalama/);
  });

  it('çok yanıtlı soruda işaret sayısı ayrıca söylenir', () => {
    expect(r.sorular[1].notlar.join(' ')).toMatch(/3 kişi toplam 4 şık işaretledi/);
  });

  it('boş bırakanlar sayılır', () => {
    expect(r.sorular[1].yanitsiz).toBe(1);
    expect(r.sorular[1].notlar.join(' ')).toMatch(/1 kişi bu soruyu boş bıraktı/);
  });

  it('metin sorusunda tablo yok, yanıtlar listelenir', () => {
    const q3 = r.sorular[2];
    expect(q3.tablo).toBe(null);
    expect(q3.metinler).toEqual(['Çok iyiydi', 'Saat erkendi']);
    expect(q3.yanitlayan).toBe(2);
  });

  it('kutuplaşma raporda yazılı uyarıya dönüşür', () => {
    const uclar = [
      ...Array.from({ length: 4 }, () => yanit(1, '1', [], '')),
      ...Array.from({ length: 4 }, () => yanit(2, '5', [], '')),
    ];
    const k = anketRaporu({ title: 'x', questions: [LIKERT] }, uclar);
    expect(k.sorular[0].notlar.join(' ')).toMatch(/kutuplaşmış/);
  });

  it('günlük katılım aradaki boş günlerle birlikte', () => {
    expect(r.katilim.satirlar).toEqual([
      ['01.03.2026', 1],
      ['02.03.2026', 1],
      ['03.03.2026', 1],
      ['04.03.2026', 1],
    ]);
  });

  it('yanıt yoksa çökmez — boş ama geçerli rapor', () => {
    const bos = anketRaporu(ANKET, []);
    expect(bos.katilim).toBe(null);
    expect(bos.kiyas).toBe(null);
    expect(bos.sorular).toHaveLength(3);
    expect(bos.yanitTablosu.satirlar).toEqual([]);
  });

  it('anket olmasa bile çökmez', () => {
    const y = anketRaporu(null, null);
    expect(y.baslik).toBe('Adsız anket');
    expect(y.sorular).toEqual([]);
  });
});

describe('raporWordGovdesi', () => {
  const r = anketRaporu(ANKET, YANITLAR, { uretimTarihi: '2026-09-18T10:00:00Z' });
  const govde = raporWordGovdesi(r);

  it('başlık, künye, kıyas, soru ve katılım bölümleri var', () => {
    [
      'Ders Değerlendirme',
      'Künye',
      'Sorular arası kıyas',
      'Soru sonuçları',
      'Günlük katılım',
    ].forEach((b) => expect(govde).toContain(b));
  });

  it('şık etiketleri ve sayıları belgede geçer', () => {
    expect(govde).toContain('Kesinlikle katılıyorum');
    expect(govde).toContain('%50');
  });

  it('metin yanıtları belgede tek tek yazılı', () => {
    expect(govde).toContain('1. Çok iyiydi');
    expect(govde).toContain('2. Saat erkendi');
  });

  // Ham tablo kâğıda sığmaz; Excel'in işi. İstenirse eklenir.
  it('ham yanıt tablosu varsayılan olarak YOK', () => {
    expect(govde).not.toContain('Ham yanıtlar');
    expect(raporWordGovdesi(r, { hamTablo: true })).toContain('Ham yanıtlar');
  });

  it('üretilen gövde geçerli XML — etiketler dengeli', () => {
    const ac = (govde.match(/<w:p>|<w:p [^>]*>/g) || []).length;
    const kapa = (govde.match(/<\/w:p>/g) || []).length;
    expect(ac).toBe(kapa);
    expect((govde.match(/<w:tbl>/g) || []).length).toBe((govde.match(/<\/w:tbl>/g) || []).length);
  });

  it('boş raporda bile gövde üretir', () => {
    expect(raporWordGovdesi(anketRaporu(ANKET, []))).toContain('Künye');
    expect(raporWordGovdesi(null)).toContain('<w:p');
  });
});

describe('raporExcelSayfalari', () => {
  const r = anketRaporu(ANKET, YANITLAR, { uretimTarihi: '2026-09-18T10:00:00Z' });
  const sayfalar = raporExcelSayfalari(r);
  const bul = (ad) => sayfalar.find((s) => s.ad === ad);

  it('sayfalar: künye, ham yanıt, özet, dağılım, metin, katılım', () => {
    expect(sayfalar.map((s) => s.ad)).toEqual([
      'Rapor',
      'Yanıtlar',
      'Soru Özeti',
      'Şık Dağılımı',
      'Metin Yanıtları',
      'Günlük Katılım',
    ]);
  });

  it('Excel sayfa adı 31 karakteri aşmaz — aşarsa dosya açılmaz', () => {
    sayfalar.forEach((s) => expect(s.ad.length).toBeLessThanOrEqual(31));
  });

  it('her sayfanın ilk satırı başlık, genişlikler sütun sayısıyla uyumlu', () => {
    sayfalar.forEach((s) => {
      expect(s.satirlar.length).toBeGreaterThan(0);
      expect(s.genislikler).toHaveLength(s.satirlar[0].length);
    });
  });

  it('ham yanıt sayfası ekrandaki tabloyla AYNI', () => {
    expect(bul('Yanıtlar').satirlar).toEqual([
      r.yanitTablosu.basliklar,
      ...r.yanitTablosu.satirlar,
    ]);
  });

  it('soru özetinde ortalama SAYI olarak yazılır — Excel hesaplayabilsin', () => {
    const satir = bul('Soru Özeti').satirlar[1];
    expect(satir[1]).toBe('Ders içeriği yeterliydi');
    expect(satir[5]).toBe(3.75);
    expect(typeof satir[5]).toBe('number');
  });

  it('sayısal olmayan soruda ortalama hücresi boş bırakılır', () => {
    const satir = bul('Soru Özeti').satirlar[2];
    expect(satir[5]).toBe('');
    expect(satir[8]).toBe('');
  });

  it('şık dağılımında her şık ayrı satır — pivot/grafik kurulabilsin', () => {
    const s = bul('Şık Dağılımı').satirlar;
    expect(s[0]).toEqual(['#', 'Soru', 'Şık', 'Kişi', 'Oran']);
    expect(s).toHaveLength(1 + 5 + 3);
    expect(s[4]).toEqual([1, 'Ders içeriği yeterliydi', 'Katılıyorum', 2, 0.5]);
  });

  it('metin yanıtları sayfası soru ve sırayla', () => {
    expect(bul('Metin Yanıtları').satirlar[1]).toEqual([
      3,
      'Eklemek istedikleriniz',
      1,
      'Çok iyiydi',
    ]);
  });

  it('boş kalan sayfalar hiç açılmaz', () => {
    const bos = raporExcelSayfalari(anketRaporu({ title: 'x', questions: [LIKERT] }, []));
    expect(bos.map((s) => s.ad)).toEqual(['Rapor', 'Yanıtlar', 'Soru Özeti', 'Şık Dağılımı']);
  });
});

describe('raporDosyaAdi', () => {
  it('anket adından dosya adı', () => {
    const r = anketRaporu(ANKET, YANITLAR);
    expect(raporDosyaAdi(r, 'docx')).toBe('Ders Değerlendirme_sonuc-raporu.docx');
    expect(raporDosyaAdi(r, 'xlsx')).toBe('Ders Değerlendirme_sonuc-raporu.xlsx');
  });

  it('rapor yoksa da bir ad döner', () => {
    expect(raporDosyaAdi(null, 'docx')).toBe('anket_sonuc-raporu.docx');
  });
});
