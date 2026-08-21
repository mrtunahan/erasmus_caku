import { describe, it, expect } from 'vitest';
import {
  dersKodEtiketi,
  slotBirlestir,
  slotDersCikar,
  slotDersEkle,
  slotDersGuncelle,
  slotDersSayisi,
  slotDersVarMi,
  slotDersleri,
  slotEkDersler,
  slotKodVarMi,
  sonrakiSube,
  yilSlotlariniGuncelle,
} from '../lib/ders-slot.js';

const birinci = {
  courseCode: 'KML312',
  courseName: 'Kimya',
  instructor: 'Ayşe Yılmaz',
  classroom: 'D-101',
  sinif: 3,
};
const ders = (kod, o) => ({ courseCode: kod, ...(o || {}) });

describe('slotDersleri — okuma', () => {
  it('tek dersli slotu okur', () => {
    const d = slotDersleri({ ...birinci });
    expect(d).toHaveLength(1);
    expect(d[0].courseCode).toBe('KML312');
  });

  it('boş slot boş liste verir', () => {
    expect(slotDersleri(null)).toEqual([]);
    expect(slotDersleri({})).toEqual([]);
    expect(slotDersleri({ courseCode: '' })).toEqual([]);
  });

  it('ESKİ `ikinci` biçimi okunur (veri taşımaya gerek yok)', () => {
    const d = slotDersleri({
      ...birinci,
      ikinci: { courseCode: 'TLK543', instructor: 'Mehmet Demir', classroom: 'D-205' },
    });
    expect(d.map((x) => x.courseCode)).toEqual(['KML312', 'TLK543']);
    expect(d[1].instructor).toBe('Mehmet Demir');
    expect(d[1].classroom).toBe('D-205');
  });

  it('eski biçimde boş alanlar birinciden devralınır', () => {
    const d = slotDersleri({ ...birinci, ikinci: { courseCode: 'TLK543' } });
    expect(d[1].instructor).toBe('Ayşe Yılmaz');
    expect(d[1].classroom).toBe('D-101');
    expect(d[1].sinif).toBe(3);
  });

  it('ÜÇ VE DAHA FAZLA ders okunur', () => {
    const d = slotDersleri({
      ...birinci,
      dersler: [
        ders('TLK543', { instructor: 'Mehmet Demir', classroom: 'D-205' }),
        ders('FZK101', { instructor: 'Zeynep Ak', classroom: 'F-3' }),
        ders('MAT201', { instructor: 'Can Su', classroom: 'M-1' }),
      ],
    });
    expect(d.map((x) => x.courseCode)).toEqual(['KML312', 'TLK543', 'FZK101', 'MAT201']);
    expect(d.map((x) => x.classroom)).toEqual(['D-101', 'D-205', 'F-3', 'M-1']);
    expect(slotDersSayisi({ ...birinci, dersler: [ders('A'), ders('B')] })).toBe(3);
  });

  it('kodu olmayan yarım ek kayıt yok sayılır', () => {
    const d = slotDersleri({ ...birinci, dersler: [{ instructor: 'X' }, ders('OK1')] });
    expect(d.map((x) => x.courseCode)).toEqual(['KML312', 'OK1']);
  });

  it('`dersler` varsa eski `ikinci` alanı dikkate ALINMAZ', () => {
    // İki kaynak bir arada durmaz: yeni biçim yazılmışsa o geçerlidir.
    const d = slotDersleri({ ...birinci, dersler: [ders('YENI')], ikinci: ders('ESKI') });
    expect(d.map((x) => x.courseCode)).toEqual(['KML312', 'YENI']);
  });

  it('slotEkDersler yalnız ek dersleri verir', () => {
    expect(slotEkDersler({ ...birinci })).toEqual([]);
    expect(slotEkDersler({ ...birinci, ikinci: ders('X') })).toHaveLength(1);
    expect(slotEkDersler({ ...birinci, dersler: [ders('X'), ders('Y')] })).toHaveLength(2);
  });
});

describe('slotDersVarMi', () => {
  it('slottaki her dersi tarar', () => {
    const s = { ...birinci, dersler: [ders('TLK543'), ders('FZK101')] };
    expect(slotDersVarMi(s, 'KML312')).toBe(true);
    expect(slotDersVarMi(s, 'FZK101')).toBe(true);
    expect(slotDersVarMi(s, 'YOK999')).toBe(false);
    expect(slotDersVarMi(s, '')).toBe(false);
  });
});

describe('slotDersEkle', () => {
  it('boş slota eklenen ders birinci olur', () => {
    const s = slotDersEkle(null, ders('KML312', { classroom: 'D-101' }));
    expect(s.courseCode).toBe('KML312');
    expect(s.dersler).toBeUndefined();
  });

  it('üçüncü ve dördüncü ders eklenebilir', () => {
    let s = { ...birinci };
    s = slotDersEkle(s, ders('TLK543', { classroom: 'D-205' }));
    s = slotDersEkle(s, ders('FZK101', { classroom: 'F-3' }));
    s = slotDersEkle(s, ders('MAT201', { classroom: 'M-1' }));
    expect(slotDersSayisi(s)).toBe(4);
    expect(s.dersler).toHaveLength(3);
  });

  it('eski `ikinci` kaydına ekleme yapılınca yeni biçime geçer', () => {
    const eski = { ...birinci, ikinci: ders('TLK543', { classroom: 'D-205' }) };
    const s = slotDersEkle(eski, ders('FZK101'));
    expect(s.ikinci).toBeUndefined();
    expect(s.dersler.map((d) => d.courseCode)).toEqual(['TLK543', 'FZK101']);
    expect(slotDersSayisi(s)).toBe(3);
  });

  it('girdi slotu DEĞİŞTİRİLMEZ', () => {
    const s = { ...birinci };
    slotDersEkle(s, ders('YENI'));
    expect(s.dersler).toBeUndefined();
  });

  it('kodsuz ders eklenmez', () => {
    const s = { ...birinci };
    expect(slotDersEkle(s, { instructor: 'X' })).toBe(s);
  });
});

describe('slotDersCikar', () => {
  const uclu = { ...birinci, dersler: [ders('TLK543'), ders('FZK101')] };

  it('ortadaki dersi çıkarır', () => {
    const s = slotDersCikar(uclu, 1);
    expect(slotDersleri(s).map((d) => d.courseCode)).toEqual(['KML312', 'FZK101']);
  });

  it('BİRİNCİ ders çıkarılınca sıradaki birinciliğe geçer', () => {
    const s = slotDersCikar(uclu, 0);
    expect(s.courseCode).toBe('TLK543');
    expect(slotDersleri(s).map((d) => d.courseCode)).toEqual(['TLK543', 'FZK101']);
  });

  it('son ders de çıkarılınca slot null olur (hücre boşalır)', () => {
    expect(slotDersCikar({ ...birinci }, 0)).toBe(null);
  });

  it('geçersiz indekste slot değişmez', () => {
    expect(slotDersCikar(uclu, 9)).toBe(uclu);
    expect(slotDersCikar(uclu, -1)).toBe(uclu);
  });

  it('iki dersten biri çıkınca `dersler` alanı temizlenir', () => {
    const iki = { ...birinci, dersler: [ders('TLK543')] };
    const s = slotDersCikar(iki, 1);
    expect(s.dersler).toBeUndefined();
    expect(slotDersSayisi(s)).toBe(1);
  });
});

describe('slotDersGuncelle', () => {
  it('yalnız hedef dersin dersliğini değiştirir', () => {
    const s0 = { ...birinci, dersler: [ders('TLK543', { classroom: 'D-205' })] };
    const s = slotDersGuncelle(s0, 1, { classroom: 'Z-9' });
    const d = slotDersleri(s);
    expect(d[0].classroom).toBe('D-101');
    expect(d[1].classroom).toBe('Z-9');
  });

  it('birinci dersin dersliği ek dersi etkilemez', () => {
    const s0 = { ...birinci, dersler: [ders('TLK543', { classroom: 'D-205' })] };
    const s = slotDersGuncelle(s0, 0, { classroom: 'A-1' });
    const d = slotDersleri(s);
    expect(d[0].classroom).toBe('A-1');
    expect(d[1].classroom).toBe('D-205');
  });

  it('geçersiz indekste slot değişmez', () => {
    const s = { ...birinci };
    expect(slotDersGuncelle(s, 5, { classroom: 'X' })).toBe(s);
  });
});

describe('slotBirlestir — çıktı', () => {
  it('tek ders olduğu gibi kalır', () => {
    const k = slotBirlestir({ ...birinci });
    expect(k.courseCode).toBe('KML312');
    expect(k.instructor).toBe('Ayşe Yılmaz');
    expect(k.classroom).toBe('D-101');
    expect(k.sinif).toBe(3);
  });

  it('ÜÇ dersin kodu, hocası ve dersliği sırayla yazılır', () => {
    const k = slotBirlestir({
      ...birinci,
      dersler: [
        ders('TLK543', { courseName: 'Türk Dili', instructor: 'Mehmet Demir', classroom: 'D-205' }),
        ders('FZK101', { courseName: 'Fizik', instructor: 'Zeynep Ak', classroom: 'F-3' }),
      ],
    });
    expect(k.courseCode).toBe('KML312 / TLK543 / FZK101');
    expect(k.instructor).toBe('Ayşe Yılmaz / Mehmet Demir / Zeynep Ak');
    expect(k.classroom).toBe('D-101 / D-205 / F-3');
    expect(k.courseName).toBe('Kimya / Türk Dili / Fizik');
  });

  it('aynı hoca/derslik tekrar yazılmaz', () => {
    const k = slotBirlestir({
      ...birinci,
      dersler: [ders('TLK543', { instructor: 'Ayşe Yılmaz', classroom: 'D-101' })],
    });
    expect(k.instructor).toBe('Ayşe Yılmaz');
    expect(k.classroom).toBe('D-101');
  });

  it('ek bağlam alanları karta eklenir', () => {
    const k = slotBirlestir({ ...birinci }, { deptName: 'Kimya', year: '3' });
    expect(k.deptName).toBe('Kimya');
    expect(k.year).toBe('3');
  });

  it('boş slotta çökmez', () => {
    expect(slotBirlestir(null).courseCode).toBe('');
  });
});

describe('şube — aynı ders kodunun birden çok kaydı', () => {
  // Bir ders iki müfredatta olabiliyor, her müfredatın iki şubesi olabiliyor:
  // tek slotta aynı kodun DÖRT kaydı yürüyebilir.
  const subeli = (kod, sube, o) => ({ courseCode: kod, sube, ...(o || {}) });

  it('aynı kodun dört şubesi tek slota sığar', () => {
    let s = slotDersEkle(null, subeli('FZK181', '1', { classroom: 'D-1' }));
    s = slotDersEkle(s, subeli('FZK181', '2', { classroom: 'D-2' }));
    s = slotDersEkle(s, subeli('FİZ161', '1', { classroom: 'D-3' }));
    s = slotDersEkle(s, subeli('FİZ161', '2', { classroom: 'D-4' }));
    expect(slotDersSayisi(s)).toBe(4);
    expect(slotDersleri(s).map((d) => d.classroom)).toEqual(['D-1', 'D-2', 'D-3', 'D-4']);
  });

  it('kod aynı + ŞUBE aynı → zaten var', () => {
    const s = slotDersEkle(null, subeli('FZK181', '2'));
    expect(slotDersVarMi(s, 'FZK181', '2')).toBe(true);
    expect(slotDersVarMi(s, 'FZK181', '1')).toBe(false);
    expect(slotDersVarMi(s, 'FZK181', '')).toBe(false);
  });

  it('şubesiz ders eskisi gibi kodla eşleşir', () => {
    const s = slotDersEkle(null, ders('KML312'));
    expect(slotDersVarMi(s, 'KML312')).toBe(true);
    expect(slotDersVarMi(s, 'KML312', '')).toBe(true);
    expect(slotDersVarMi(s, 'KML312', '2')).toBe(false);
  });

  it('slotKodVarMi şubeye bakmadan tarar', () => {
    const s = slotDersEkle(null, subeli('FZK181', '1'));
    expect(slotKodVarMi(s, 'FZK181')).toBe(true);
    expect(slotKodVarMi(s, 'YOK999')).toBe(false);
    expect(slotKodVarMi(s, '')).toBe(false);
  });

  it('ŞUBE devralınmaz — ikinci ders birincinin şubesini kopyalamaz', () => {
    const s = {
      courseCode: 'FZK181',
      sube: '1',
      classroom: 'D-1',
      dersler: [{ courseCode: 'MAT101' }],
    };
    const d = slotDersleri(s);
    expect(d[0].sube).toBe('1');
    expect(d[1].sube).toBe('');
    // Derslik ise devralınır (eski davranış korunur).
    expect(d[1].classroom).toBe('D-1');
  });

  it('sonrakiSube boştaki ilk numarayı verir', () => {
    expect(sonrakiSube(null, 'FZK181')).toBe('1');
    let s = slotDersEkle(null, ders('FZK181')); // şubesiz = 1. şube sayılır
    expect(sonrakiSube(s, 'FZK181')).toBe('2');
    s = slotDersEkle(s, subeli('FZK181', '2'));
    expect(sonrakiSube(s, 'FZK181')).toBe('3');
    // Başka kod etkilenmez
    expect(sonrakiSube(s, 'MAT101')).toBe('1');
  });

  it('sonrakiSube kullanılmış numarayı tekrar vermez', () => {
    let s = slotDersEkle(null, subeli('FZK181', '2'));
    s = slotDersEkle(s, subeli('FZK181', '3'));
    // İki kayıt var → aday 3, ama 3 dolu → 4
    expect(sonrakiSube(s, 'FZK181')).toBe('4');
  });

  it('dersKodEtiketi şubeyi koda ekler, şubesizi yalın bırakır', () => {
    expect(dersKodEtiketi({ courseCode: 'FZK181', sube: '2' })).toBe('FZK181 (Şb:2)');
    expect(dersKodEtiketi({ courseCode: 'FZK181' })).toBe('FZK181');
    expect(dersKodEtiketi({ courseCode: '', sube: '2' })).toBe('');
    expect(dersKodEtiketi(null)).toBe('');
  });

  it('ÇIKTIDA dört şube de ayrı ayrı görünür', () => {
    let s = slotDersEkle(
      null,
      subeli('FZK181', '1', { instructor: 'Ayşe Yılmaz', classroom: 'D-1' })
    );
    s = slotDersEkle(s, subeli('FZK181', '2', { instructor: 'Can Su', classroom: 'D-2' }));
    s = slotDersEkle(s, subeli('FİZ161', '1', { instructor: 'Ayşe Yılmaz', classroom: 'D-3' }));
    s = slotDersEkle(s, subeli('FİZ161', '2', { instructor: 'Can Su', classroom: 'D-4' }));
    const k = slotBirlestir(s);
    // Tekrarsız birleştirme iki şubeyi TEK koda indirgemez.
    expect(k.courseCode).toBe('FZK181 (Şb:1) / FZK181 (Şb:2) / FİZ161 (Şb:1) / FİZ161 (Şb:2)');
    expect(k.classroom).toBe('D-1 / D-2 / D-3 / D-4');
    // Hocalar tekrarsız: aynı hoca iki dersi veriyorsa bir kez yazılır.
    expect(k.instructor).toBe('Ayşe Yılmaz / Can Su');
  });

  it('şube kayda yalnız VARSA yazılır (eski program değişmez)', () => {
    const s = slotDersEkle(null, ders('KML312'));
    expect(s.sube).toBeUndefined();
    const t = slotDersEkle(s, subeli('KML312', '2'));
    expect(t.dersler[0].sube).toBe('2');
  });

  it('şube güncellenebilir', () => {
    let s = slotDersEkle(null, ders('KML312'));
    s = slotDersEkle(s, ders('KML312'));
    s = slotDersGuncelle(s, 1, { sube: '2' });
    expect(slotDersleri(s)[1].sube).toBe('2');
    expect(slotDersVarMi(s, 'KML312', '2')).toBe(true);
  });
});

// Çakışma denetiminin baktığı anlık görüntü.
//
// Şikâyet: "çakışma tespit sistemi geç mi çalışıyor". Sebep buydu — kaydetmek
// bu kümeyi tazelemiyordu, dolayısıyla denetim başka sınıfların AÇILIŞTAKİ
// hâlini görüyordu ve az önce yaratılan çakışmayı fark etmiyordu.
describe('yilSlotlariniGuncelle', () => {
  const anlik = () => [
    { year: '1', slots: { Pazartesi_0: { courseCode: 'BIL101' } } },
    { year: '2', slots: { Sali_1: { courseCode: 'BIL201' } } },
  ];

  it('kaydedilen sınıfın slotları DEĞİŞİR — asıl arıza buydu', () => {
    const yeni = { Pazartesi_0: { courseCode: 'BIL105' } };
    const sonuc = yilSlotlariniGuncelle(anlik(), '1', yeni);
    expect(sonuc.find((x) => x.year === '1').slots).toEqual(yeni);
  });

  it('öteki sınıflara dokunulmaz', () => {
    const sonuc = yilSlotlariniGuncelle(anlik(), '1', {});
    expect(sonuc.find((x) => x.year === '2').slots).toEqual({
      Sali_1: { courseCode: 'BIL201' },
    });
    expect(sonuc).toHaveLength(2);
  });

  it('kümede olmayan sınıf EKLENİR', () => {
    // Henüz programı olmayan sınıfa ilk ders konduğunda küme onu tanımıyordu.
    const sonuc = yilSlotlariniGuncelle(anlik(), 3, { Carsamba_2: { courseCode: 'BIL301' } });
    expect(sonuc).toHaveLength(3);
    expect(sonuc[2]).toEqual({ year: '3', slots: { Carsamba_2: { courseCode: 'BIL301' } } });
  });

  it('sınıf numarası sayı ya da metin olabilir', () => {
    expect(yilSlotlariniGuncelle(anlik(), 1, { x: 1 })).toHaveLength(2);
    expect(yilSlotlariniGuncelle(anlik(), '1', { x: 1 })).toHaveLength(2);
  });

  it('girdi DEĞİŞTİRİLMEZ — React durumu yerinde değiştirilemez', () => {
    const girdi = anlik();
    const kopya = JSON.parse(JSON.stringify(girdi));
    yilSlotlariniGuncelle(girdi, '1', { yeni: true });
    expect(girdi).toEqual(kopya);
  });

  it('boş girdilerde çökmez', () => {
    expect(yilSlotlariniGuncelle(null, '1', null)).toEqual([{ year: '1', slots: {} }]);
    expect(yilSlotlariniGuncelle([], '1', { a: 1 })).toEqual([{ year: '1', slots: { a: 1 } }]);
  });
});

// ── ÇAKIŞMA ONAYI OKUMADA KAYBOLMAMALI ──
// Kullanıcı uyarıyı bilerek onaylayıp dersi yerleştirdiğinde işaret derse
// yazılır. Normalleştirme alanları tek tek seçtiği için taşınmayan alan ilk
// okumada silinir; o zaman "gözden kaçmış hata" ile "bilerek verilmiş karar"
// bir daha ayırt edilemez.
describe('slotDersleri — çakışma onayı', () => {
  it('birinci dersin onayı korunur', () => {
    const [d] = slotDersleri({ courseCode: 'EMU209', cakismaOnayi: true });
    expect(d.cakismaOnayi).toBe(true);
  });

  it('ek dersin onayı korunur ve birinciden DEVRALINMAZ', () => {
    const dersler = slotDersleri({
      courseCode: 'EMU209',
      cakismaOnayi: true,
      dersler: [{ courseCode: 'MAT165' }, { courseCode: 'FZK181', cakismaOnayi: true }],
    });
    expect(dersler.map((d) => d.cakismaOnayi)).toEqual([true, undefined, true]);
  });

  it('onaysız derste alan hiç yazılmaz', () => {
    const [d] = slotDersleri({ courseCode: 'EMU209' });
    expect('cakismaOnayi' in d).toBe(false);
  });
});

describe('slotDersEkle — çakışma onayı gidiş dönüş', () => {
  it('onaylı ders yazılıp geri okunduğunda işaret durur', () => {
    const slot = slotDersEkle(null, { courseCode: 'EMU209', cakismaOnayi: true });
    expect(slotDersleri(slot)[0].cakismaOnayi).toBe(true);
  });

  it('bölünmüş hücrede yalnız onaylı ders işaretli kalır', () => {
    let slot = slotDersEkle(null, { courseCode: 'MAT165' });
    slot = slotDersEkle(slot, { courseCode: 'EMU209', cakismaOnayi: true });
    const dersler = slotDersleri(slot);
    expect(dersler.map((d) => d.courseCode)).toEqual(['MAT165', 'EMU209']);
    expect(dersler.map((d) => d.cakismaOnayi)).toEqual([undefined, true]);
  });

  it('onaysız ders kaydına boş alan eklenmez', () => {
    const slot = slotDersEkle(null, { courseCode: 'MAT165' });
    expect('cakismaOnayi' in slot).toBe(false);
  });
});
