import { describe, it, expect } from 'vitest';
import {
  alanEksikleri,
  alanEksikMi,
  ekEksikleri,
  formDurumu,
  ozetMetni,
  zorunluAlanlar,
} from '../lib/yatay-form-durumu.js';

const KURUMICI = { id: 'kurumici', puanIster: false, notIster: false };
const KURUMLARARASI = { id: 'kurumlararasi', puanIster: true, notIster: true };
const MERKEZI = { id: 'merkezi', puanIster: true, notIster: false, ekMadde1: true };

const DOLU = {
  adayAdSoyad: 'AYŞE YILMAZ',
  aktifUniversite: 'ANKARA ÜNİVERSİTESİ',
  aktifBolum: 'BİLGİSAYAR MÜHENDİSLİĞİ',
  basvurduguFakulte: 'MÜHENDİSLİK FAKÜLTESİ',
  basvurduguBolum: 'BİLGİSAYAR MÜHENDİSLİĞİ',
  basvurduguSinif: '2',
  yksYerlesmeYili: '2024',
  yksPuanTuru: 'say',
  yksPuani: '355,29843',
  yksBasariSirasi: '245.678',
  notOrtalamasi: '76,50',
};

const EKLER = [
  { id: 'transkript', title: 'Öğrenci Not Çizelgesi', zorunlu: true },
  { id: 'ogrenci_belgesi', title: 'Öğrenci Belgesi', zorunlu: true },
  { id: 'ders_icerik', title: 'Ders İçerikleri', zorunlu: false },
];

describe('zorunluAlanlar', () => {
  // Kurum içi geçişte karar bölüm kurulunun; puan/AGNO hiç istenmez.
  it('kurum içi geçişte puan ve not alanları YOK', () => {
    const a = zorunluAlanlar(KURUMICI).map((x) => x.anahtar);
    expect(a).toEqual([
      'aktifUniversite',
      'aktifBolum',
      'basvurduguFakulte',
      'basvurduguBolum',
      'basvurduguSinif',
    ]);
  });

  it('kurumlararasında puan + not alanları da zorunlu', () => {
    const a = zorunluAlanlar(KURUMLARARASI).map((x) => x.anahtar);
    expect(a).toContain('yksPuani');
    expect(a).toContain('yksBasariSirasi');
    expect(a).toContain('notOrtalamasi');
  });

  it('merkezi geçişte not ortalaması istenmez', () => {
    const a = zorunluAlanlar(MERKEZI).map((x) => x.anahtar);
    expect(a).toContain('yksPuani');
    expect(a).not.toContain('notOrtalamasi');
  });

  // Aday numarası henüz yokken açılan kayıt: ad zorunlu, numara değil.
  it('vekâleten kayıtta aday adı eklenir, numara eklenmez', () => {
    const a = zorunluAlanlar(KURUMICI, { vekaleten: true }).map((x) => x.anahtar);
    expect(a[0]).toBe('adayAdSoyad');
    expect(a).not.toContain('adayOgrNo');
  });

  it('tür bilinmiyorsa ortak alanlar yine döner — ekran boşa düşmez', () => {
    expect(zorunluAlanlar(null).length).toBe(5);
  });
});

describe('alanEksikleri', () => {
  it('dolu formda eksik yok', () => {
    expect(alanEksikleri(KURUMLARARASI, DOLU)).toEqual([]);
  });

  it('boş alanlar etiketleriyle sayılır', () => {
    const e = alanEksikleri(KURUMLARARASI, { ...DOLU, yksPuani: '', basvurduguSinif: '  ' });
    expect(e.map((x) => x.anahtar).sort()).toEqual(['basvurduguSinif', 'yksPuani']);
    expect(e[0].sebep).toBe('bos');
  });

  // "Girildi ama okunamıyor" da eksiktir: aday hiçbir kritere göre
  // değerlendirilemez.
  it('okunamayan başarı sıralaması BİÇİM eksiği sayılır', () => {
    const e = alanEksikleri(KURUMLARARASI, { ...DOLU, yksBasariSirasi: 'yok' });
    expect(e).toHaveLength(1);
    expect(e[0].anahtar).toBe('yksBasariSirasi');
    expect(e[0].sebep).toBe('bicim');
  });

  it("4'lük sistemden girilen AGNO hata değil — uyarıdır, eksik saymaz", () => {
    expect(alanEksikleri(KURUMLARARASI, { ...DOLU, notOrtalamasi: '3,80' })).toEqual([]);
  });

  it('100 üstü AGNO biçim eksiği', () => {
    const e = alanEksikleri(KURUMLARARASI, { ...DOLU, notOrtalamasi: '380' });
    expect(e[0].anahtar).toBe('notOrtalamasi');
    expect(e[0].sebep).toBe('bicim');
  });

  it('kurum içi geçişte puan alanları boş olsa da eksik değil', () => {
    const bos = { ...DOLU, yksPuani: '', yksBasariSirasi: '', notOrtalamasi: '' };
    expect(alanEksikleri(KURUMICI, bos)).toEqual([]);
  });
});

describe('ekEksikleri', () => {
  it('yüklenmemiş zorunlu ekler sayılır', () => {
    const e = ekEksikleri(EKLER, { transkript: { url: 'x' } });
    expect(e.map((x) => x.anahtar)).toEqual(['ogrenci_belgesi']);
    expect(e[0].etiket).toBe('Öğrenci Belgesi');
  });

  it('isteğe bağlı ek hiç sayılmaz', () => {
    const e = ekEksikleri(EKLER, { transkript: { url: 'x' }, ogrenci_belgesi: { url: 'y' } });
    expect(e).toEqual([]);
  });

  it('ek listesi boşsa eksik de yok', () => {
    expect(ekEksikleri([], {})).toEqual([]);
    expect(ekEksikleri(null, null)).toEqual([]);
  });
});

describe('formDurumu', () => {
  const tamGirdi = {
    tur: KURUMLARARASI,
    form: DOLU,
    ekTanimlari: EKLER,
    ekler: { transkript: { url: 'a' }, ogrenci_belgesi: { url: 'b' } },
  };

  it('her şey tamamsa gönderilebilir ve oran 1', () => {
    const d = formDurumu(tamGirdi);
    expect(d.gonderilebilir).toBe(true);
    expect(d.oran).toBe(1);
    expect(d.tamam).toBe(d.gerekli);
    expect(d.ozet).toMatch(/Tüm zorunlu alanlar tamam/);
  });

  it('eksik varken gönderilemez', () => {
    const d = formDurumu({ ...tamGirdi, ekler: {} });
    expect(d.gonderilebilir).toBe(false);
    expect(d.ekEksigi).toBe(2);
    expect(d.ozet).toBe('2 belge eksik');
  });

  it('alan ve belge eksiği birlikte sayılır', () => {
    const d = formDurumu({ ...tamGirdi, form: { ...DOLU, yksPuani: '' }, ekler: {} });
    expect(d.ozet).toBe('1 alan · 2 belge eksik');
    expect(d.eksikler).toHaveLength(3);
  });

  // ⚠ İlerleme çubuğu GERİYE gitmemeli: biçimi bozuk bir alan hem "boş değil"
  // hem "hatalı" diye iki kez sayılırsa tamamlanan sayısı düşerdi.
  it('biçim hatası alanı iki kez saymaz', () => {
    const d = formDurumu({ ...tamGirdi, form: { ...DOLU, yksBasariSirasi: 'abc' } });
    expect(d.alanEksigi).toBe(1);
    expect(d.tamam).toBe(d.gerekli - 1);
  });

  it('kurum içi geçişte gerekli alan sayısı daha az', () => {
    const ic = formDurumu({ ...tamGirdi, tur: KURUMICI });
    const arasi = formDurumu(tamGirdi);
    expect(ic.gerekli).toBeLessThan(arasi.gerekli);
  });

  it('boş girdide çökmez', () => {
    const d = formDurumu({});
    expect(d.gonderilebilir).toBe(false);
    expect(d.gerekli).toBe(5);
  });

  it('vekâleten kayıtta aday adı da sayılır', () => {
    const d = formDurumu({ ...tamGirdi, vekaleten: true, form: { ...DOLU, adayAdSoyad: '' } });
    expect(d.eksikler.map((e) => e.anahtar)).toContain('adayAdSoyad');
  });
});

describe('ozetMetni', () => {
  it('eksik yokken sayıyı da yazar', () => {
    expect(ozetMetni([], 8, 8)).toBe('Tüm zorunlu alanlar tamam (8/8)');
  });

  it('yalnız alan eksiği', () => {
    expect(ozetMetni([{ tur: 'alan', anahtar: 'a' }], 3, 2)).toBe('1 alan eksik');
  });

  it('hiç zorunlu alanı olmayan formda "Hazır"', () => {
    expect(ozetMetni([], 0, 0)).toBe('Hazır');
  });
});

describe('alanEksikMi', () => {
  it('eksik alanı işaretler', () => {
    const d = formDurumu({ tur: KURUMICI, form: {}, ekTanimlari: [] });
    expect(alanEksikMi(d, 'aktifUniversite')).toBe(true);
    expect(alanEksikMi(d, 'telefon')).toBe(false);
  });

  it('durum yoksa işaret de yok', () => {
    expect(alanEksikMi(null, 'x')).toBe(false);
  });
});
