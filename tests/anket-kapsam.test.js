import { describe, it, expect } from 'vitest';
import {
  anketGorunurMu,
  anketKapsamEtiketi,
  anketKapsamYamasi,
  anketKilitSebebi,
  anketYonetilebilirMi,
  anketAtanabilirMi,
  atamaKapsamiKarari,
  anketleriSuz,
  kapsamOzetMetni,
  kapsamliMi,
  sahibiMi,
} from '../lib/anket-kapsam.js';

// ── Kapsamlar (yayinKapsamCoz çıktısı biçiminde) ──
const UNI = { kapsamTuru: 'universite', facultyId: '', departmentIds: [] };
const MUH_FAK = { kapsamTuru: 'fakulte', facultyId: 'f-muh', departmentIds: ['b-bil', 'b-ins'] };
const ORM_FAK = { kapsamTuru: 'fakulte', facultyId: 'f-orm', departmentIds: ['b-orm'] };
const BIL_BOLUM = { kapsamTuru: 'bolum', facultyId: 'f-muh', departmentIds: ['b-bil'] };

// ── Anket kayıtları ──
const uniAnketi = {
  id: 'a1',
  title: 'Üniversite memnuniyet',
  kapsamTuru: 'universite',
  kapsamDepartmentIds: [],
};
const muhFakAnketi = {
  id: 'a2',
  title: 'Mühendislik fakülte anketi',
  kapsamTuru: 'fakulte',
  kapsamFacultyId: 'f-muh',
  kapsamDepartmentIds: ['b-bil', 'b-ins'],
  createdBy: 'Prof. Dr. Dekan YILMAZ',
};
// Aynı fakültenin BAŞKA bir yetkilisi — anketi o açmadı.
const DEKAN = { name: 'Prof. Dr. Dekan YILMAZ' };
const DEKAN_YRD = { name: 'Doç. Dr. Dekan Yrd. KAYA' };
const ormFakAnketi = {
  id: 'a3',
  title: 'Orman fakülte anketi',
  kapsamTuru: 'fakulte',
  kapsamFacultyId: 'f-orm',
  kapsamDepartmentIds: ['b-orm'],
};
const bilAnketi = {
  id: 'a4',
  title: 'Bilgisayar ders değerlendirme',
  kapsamTuru: 'bolum',
  kapsamFacultyId: 'f-muh',
  kapsamDepartmentIds: ['b-bil'],
};
const ormAnketi = {
  id: 'a5',
  title: 'Orman ders değerlendirme',
  kapsamTuru: 'bolum',
  kapsamFacultyId: 'f-orm',
  kapsamDepartmentIds: ['b-orm'],
};
const eskiAnket = { id: 'a6', title: 'Eski anket', createdBy: 'Dr. Ayşe KAYA' };

describe('anketKapsamYamasi', () => {
  it('kapsam yayımcının KENDİ yetki alanıdır', () => {
    expect(anketKapsamYamasi(MUH_FAK, { name: 'Dekan' })).toEqual({
      kapsamTuru: 'fakulte',
      kapsamFacultyId: 'f-muh',
      kapsamDepartmentIds: ['b-bil', 'b-ins'],
      sahipAd: 'Dekan',
    });
  });

  // Sonradan açılan bölüm de üniversite kapsamına girmeli; liste tutmak
  // kapsamı yanlışlıkla dondurur.
  it('üniversite kapsamında bölüm listesi tutulmaz', () => {
    const y = anketKapsamYamasi(UNI, { name: 'Rektörlük' });
    expect(y.kapsamTuru).toBe('universite');
    expect(y.kapsamDepartmentIds).toEqual([]);
  });

  it('bölüm yetkilisinin anketi kendi bölümüne damgalanır', () => {
    expect(anketKapsamYamasi(BIL_BOLUM).kapsamDepartmentIds).toEqual(['b-bil']);
  });

  it('bilinmeyen kapsam türü bölüm sayılır — geniş tarafa kaçılmaz', () => {
    expect(anketKapsamYamasi({ kapsamTuru: 'saçma', departmentIds: ['x'] }).kapsamTuru).toBe(
      'bolum'
    );
  });

  it('kapsam yoksa çökmez', () => {
    expect(anketKapsamYamasi(null).kapsamTuru).toBe('bolum');
  });
});

describe('anketGorunurMu', () => {
  it('üniversite yetkilisi HER anketi görür', () => {
    [uniAnketi, muhFakAnketi, ormFakAnketi, bilAnketi, ormAnketi, eskiAnket].forEach((a) =>
      expect(anketGorunurMu(a, UNI), a.title).toBe(true)
    );
  });

  // Asıl istek: fakülte yetkilisi yalnız kendi fakültesini görsün.
  it('fakülte yetkilisi BAŞKA fakültenin anketlerini görmez', () => {
    expect(anketGorunurMu(ormFakAnketi, MUH_FAK)).toBe(false);
    expect(anketGorunurMu(ormAnketi, MUH_FAK)).toBe(false);
  });

  it('fakülte yetkilisi kendi fakültesindeki bölüm anketlerini görür', () => {
    expect(anketGorunurMu(bilAnketi, MUH_FAK)).toBe(true);
    expect(anketGorunurMu(muhFakAnketi, MUH_FAK)).toBe(true);
  });

  // Üst seviyenin anketi alt yetkiliye yalnız ONUN alanına atandığında görünür.
  it('üniversite geneli anket alt yetkiliye yalnız atamayla görünür', () => {
    expect(anketGorunurMu(uniAnketi, MUH_FAK)).toBe(false);
    expect(anketGorunurMu(uniAnketi, BIL_BOLUM)).toBe(false);
    const atamalar = [{ surveyId: 'a1', kapsamTuru: 'bolum', kapsamDepartmentIds: ['b-bil'] }];
    expect(anketGorunurMu(uniAnketi, BIL_BOLUM, { atamalar })).toBe(true);
    expect(anketGorunurMu(uniAnketi, MUH_FAK, { atamalar })).toBe(true);
    const geneli = [{ surveyId: 'a1', kapsamTuru: 'universite', kapsamDepartmentIds: [] }];
    expect(anketGorunurMu(uniAnketi, BIL_BOLUM, { atamalar: geneli })).toBe(true);
  });

  it('bölüm yetkilisi kendi bölümünün anketini görür; fakülte anketini atamayla', () => {
    expect(anketGorunurMu(bilAnketi, BIL_BOLUM)).toBe(true);
    expect(anketGorunurMu(muhFakAnketi, BIL_BOLUM)).toBe(false);
    const atamalar = [{ surveyId: 'a2', kapsamTuru: 'bolum', kapsamDepartmentIds: ['b-bil'] }];
    expect(anketGorunurMu(muhFakAnketi, BIL_BOLUM, { atamalar })).toBe(true);
    expect(anketGorunurMu(ormAnketi, BIL_BOLUM)).toBe(false);
  });

  // ŞİKÂYETİN KENDİSİ: yalnız Bilgisayar öğrencilerine paylaşılan anket.
  it('Bilgisayar’a atanan anket Kimya bölüm yetkilisine görünmez', () => {
    const KIM_BOLUM = { kapsamTuru: 'bolum', facultyId: 'f-muh', departmentIds: ['b-kim'] };
    const atamalar = [{ surveyId: 'a1', kapsamTuru: 'bolum', kapsamDepartmentIds: ['b-bil'] }];
    const fakAtama = [{ surveyId: 'a2', kapsamTuru: 'bolum', kapsamDepartmentIds: ['b-bil'] }];
    expect(anketGorunurMu(uniAnketi, KIM_BOLUM, { atamalar })).toBe(false);
    expect(anketGorunurMu(muhFakAnketi, KIM_BOLUM, { atamalar: fakAtama })).toBe(false);
    expect(anketGorunurMu(bilAnketi, KIM_BOLUM)).toBe(false);
    // Eski (kapsamsız) atama yalnız yazıldığı bölüme ulaşır.
    const eskiAtama = [{ surveyId: 'a1', departmentId: 'b-bil' }];
    expect(anketGorunurMu(uniAnketi, KIM_BOLUM, { atamalar: eskiAtama })).toBe(false);
    expect(anketGorunurMu(uniAnketi, BIL_BOLUM, { atamalar: eskiAtama })).toBe(true);
  });

  it('kapsamsız eski anket yalnız sahibine ya da atandığı alana görünür', () => {
    expect(anketGorunurMu(eskiAnket, MUH_FAK)).toBe(false);
    expect(anketGorunurMu(eskiAnket, BIL_BOLUM)).toBe(false);
    expect(anketGorunurMu(eskiAnket, BIL_BOLUM, { user: { name: 'Dr. Ayşe KAYA' } })).toBe(true);
  });

  it('akademisyen yalnız kendi açtığı ve kendi dersine bağlı anketleri görür', () => {
    const AKAD = { kapsamTuru: 'akademisyen', facultyId: 'f-muh', departmentIds: ['b-bil'] };
    const derslerim = [{ code: 'BLM445', name: 'Yapay Zekâ' }];
    const dersli = { ...bilAnketi, id: 'a7', linkedCourses: [{ code: 'blm445', name: 'X' }] };
    const baskaDers = { ...bilAnketi, id: 'a8', linkedCourses: [{ code: 'BLM101' }] };
    expect(anketGorunurMu(dersli, AKAD, { derslerim })).toBe(true);
    expect(anketGorunurMu(baskaDers, AKAD, { derslerim })).toBe(false);
    expect(anketGorunurMu(bilAnketi, AKAD, { derslerim })).toBe(false);
    expect(anketGorunurMu(eskiAnket, AKAD, { user: { name: 'Dr. Ayşe Kaya' } })).toBe(true);
    // Paylaşma: yalnız dersine bağlı olan; düzenleme: yalnız kendi açtığı.
    expect(anketAtanabilirMi(dersli, AKAD, { derslerim })).toBe(true);
    expect(anketAtanabilirMi(eskiAnket, AKAD, { user: { name: 'Dr. Ayşe Kaya' } })).toBe(false);
    expect(anketYonetilebilirMi(dersli, AKAD, { name: 'Dr. Başka' })).toBe(false);
    expect(
      anketYonetilebilirMi({ ...dersli, createdBy: 'Dr. Ali Veli' }, AKAD, { name: 'Dr. Ali Veli' })
    ).toBe(true);
  });

  it('bölüm listesi boşalmış kayıt fakülte kimliğiyle çözülür', () => {
    const bos = { kapsamTuru: 'fakulte', kapsamFacultyId: 'f-muh', kapsamDepartmentIds: [] };
    expect(anketGorunurMu(bos, MUH_FAK)).toBe(true);
    expect(anketGorunurMu(bos, ORM_FAK)).toBe(false);
  });

  it('anket yoksa görünür de değil', () => {
    expect(anketGorunurMu(null, UNI)).toBe(false);
  });
});

describe('anketYonetilebilirMi', () => {
  it('üniversite yetkilisi hepsini düzenler ve siler', () => {
    [uniAnketi, muhFakAnketi, ormFakAnketi, bilAnketi, ormAnketi, eskiAnket].forEach((a) =>
      expect(anketYonetilebilirMi(a, UNI), a.title).toBe(true)
    );
  });

  // Asıl istek: fakülte yetkilisi bölüm anketine DOKUNAMAZ.
  it('fakülte yetkilisi kendi fakültesindeki BÖLÜM anketini düzenleyemez', () => {
    expect(anketGorunurMu(bilAnketi, MUH_FAK)).toBe(true);
    expect(anketYonetilebilirMi(bilAnketi, MUH_FAK)).toBe(false);
  });

  it('fakülte yetkilisi KENDİ AÇTIĞI fakülte geneli anketini düzenler', () => {
    expect(anketYonetilebilirMi(muhFakAnketi, MUH_FAK, DEKAN)).toBe(true);
  });

  // ⚠ Aynı fakültede birden çok yetkili olabiliyor; birinin hazırladığı
  // anketi ötekinin silmesi, sahibinin haberi olmadan veri kaybıdır.
  it('AYNI fakültenin başka yetkilisi o anketi düzenleyemez', () => {
    expect(anketGorunurMu(muhFakAnketi, MUH_FAK)).toBe(true);
    expect(anketYonetilebilirMi(muhFakAnketi, MUH_FAK, DEKAN_YRD)).toBe(false);
  });

  it('kimlik verilmezse sahiplik iddia edilemez', () => {
    expect(anketYonetilebilirMi(muhFakAnketi, MUH_FAK)).toBe(false);
  });

  it('fakülte yetkilisi başka fakültenin fakülte anketini düzenleyemez', () => {
    expect(anketYonetilebilirMi(ormFakAnketi, MUH_FAK, DEKAN)).toBe(false);
  });

  it('fakülte yetkilisi üniversite geneli ankete dokunamaz', () => {
    expect(anketYonetilebilirMi(uniAnketi, MUH_FAK, DEKAN)).toBe(false);
  });

  it('bölüm yetkilisi yalnız kendi bölüm anketini düzenler', () => {
    expect(anketYonetilebilirMi(bilAnketi, BIL_BOLUM)).toBe(true);
    expect(anketYonetilebilirMi(muhFakAnketi, BIL_BOLUM)).toBe(false);
    expect(anketYonetilebilirMi(ormAnketi, BIL_BOLUM)).toBe(false);
  });

  it('eski kayıtta yalnız anketi AÇAN kişi yönetebilir', () => {
    expect(anketYonetilebilirMi(eskiAnket, MUH_FAK, { name: 'Dr. Ayşe KAYA' })).toBe(true);
    expect(anketYonetilebilirMi(eskiAnket, MUH_FAK, { name: 'Başka Biri' })).toBe(false);
    expect(anketYonetilebilirMi(eskiAnket, MUH_FAK)).toBe(false);
  });

  it('kapsam bilinmiyorsa yetki verilmez', () => {
    expect(anketYonetilebilirMi(bilAnketi, null)).toBe(false);
    expect(anketYonetilebilirMi(null, UNI)).toBe(false);
  });
});

describe('anketKilitSebebi', () => {
  it('yetki varsa sebep yok', () => {
    expect(anketKilitSebebi(muhFakAnketi, MUH_FAK, DEKAN)).toBe('');
  });

  it('başkasının fakülte anketinde SAHİBİNİN ADI yazılır', () => {
    const sebep = anketKilitSebebi(muhFakAnketi, MUH_FAK, DEKAN_YRD);
    expect(sebep).toMatch(/Prof. Dr. Dekan YILMAZ oluşturdu/);
    expect(sebep).toMatch(/üniversite yetkilisine başvurun/);
  });

  it('bölüm anketinde fakülte yetkilisine kimin düzenleyebileceği söylenir', () => {
    expect(anketKilitSebebi(bilAnketi, MUH_FAK, DEKAN)).toMatch(/bölüm yetkilisindedir/i);
  });

  it('üniversite geneli ankette üst merci söylenir', () => {
    expect(anketKilitSebebi(uniAnketi, MUH_FAK)).toMatch(/üniversite yetkilisindedir/i);
  });

  it('bölüm yetkilisine fakülte anketi için sebep', () => {
    expect(anketKilitSebebi(muhFakAnketi, BIL_BOLUM)).toMatch(/fakülte yetkilisindedir/i);
  });

  it('eski kayıtta çoğaltma yolu gösterilir', () => {
    expect(anketKilitSebebi(eskiAnket, MUH_FAK, { name: 'X' })).toMatch(/Çoğalt/);
  });
});

describe('anketKapsamEtiketi', () => {
  const bolumler = [
    { id: 'b-bil', name: 'Bilgisayar Mühendisliği' },
    { id: 'b-ins', name: 'İnşaat Mühendisliği' },
  ];

  it('kapsam türüne göre rozet', () => {
    expect(anketKapsamEtiketi(uniAnketi).etiket).toBe('Üniversite geneli');
    expect(anketKapsamEtiketi(muhFakAnketi).etiket).toBe('Fakülte geneli');
  });

  it('bölüm anketinde bölüm adı yazılır', () => {
    expect(anketKapsamEtiketi(bilAnketi, bolumler).etiket).toBe('Bilgisayar Mühendisliği');
  });

  it('çok bölümlü kayıtta ilk ad + sayı', () => {
    const cok = { kapsamTuru: 'bolum', kapsamDepartmentIds: ['b-bil', 'b-ins'] };
    expect(anketKapsamEtiketi(cok, bolumler).etiket).toBe('Bilgisayar Mühendisliği +1');
  });

  it('adı çözülemeyen bölümde genel etiket', () => {
    expect(
      anketKapsamEtiketi({ kapsamTuru: 'bolum', kapsamDepartmentIds: ['yok'] }, bolumler).etiket
    ).toBe('Bölüm anketi');
  });

  it('eski kayıt açıkça işaretlenir', () => {
    expect(anketKapsamEtiketi(eskiAnket).etiket).toMatch(/eski kayıt/);
    expect(kapsamliMi(eskiAnket)).toBe(false);
  });
});

describe('anketleriSuz', () => {
  const hepsi = [uniAnketi, muhFakAnketi, ormFakAnketi, bilAnketi, ormAnketi, eskiAnket];

  it('fakülte yetkilisi: başka fakülte gizlenir, bölüm anketi kilitli görünür', () => {
    const o = anketleriSuz(hepsi, MUH_FAK, { user: DEKAN });
    expect(o.liste.map((a) => a.id)).toEqual(['a2', 'a4']);
    expect(o.gizlenen).toBe(4);
    expect(o.yonetilebilir).toBe(1);
    const bil = o.liste.find((a) => a.id === 'a4');
    expect(bil._yonetilebilir).toBe(false);
    expect(bil._kilitSebebi).toBeTruthy();
  });

  it('üniversite yetkilisinde hiçbir şey gizlenmez ve hepsi yönetilebilir', () => {
    const o = anketleriSuz(hepsi, UNI, { user: { name: 'Rektörlük' } });
    expect(o.gizlenen).toBe(0);
    expect(o.yonetilebilir).toBe(hepsi.length);
  });

  it('fakülte yetkilisi BAŞKASININ açtığı fakülte anketini yönetemez', () => {
    const o = anketleriSuz(hepsi, MUH_FAK, { user: DEKAN_YRD });
    expect(o.liste.map((a) => a.id)).toEqual(['a2', 'a4']);
    expect(o.yonetilebilir).toBe(0);
  });

  it('bölüm yetkilisi yalnız kendi anketini yönetir', () => {
    const o = anketleriSuz(hepsi, BIL_BOLUM, { user: { name: 'Bölüm Bşk.' } });
    expect(o.liste.map((a) => a.id)).toEqual(['a4']);
    expect(o.yonetilebilir).toBe(1);
  });

  it('boş listede çökmez', () => {
    expect(anketleriSuz(null, MUH_FAK)).toEqual({ liste: [], gizlenen: 0, yonetilebilir: 0 });
  });
});

describe('kapsamOzetMetni', () => {
  it('fakülte yetkilisine neyi düzenleyebileceği söylenir', () => {
    const o = anketleriSuz([muhFakAnketi, bilAnketi], MUH_FAK, { user: DEKAN });
    const m = kapsamOzetMetni(MUH_FAK, o);
    expect(m).toMatch(/kendi oluşturduğunuz fakülte geneli anketler/);
    expect(m).toMatch(/^2 anket görünüyor · 1 tanesini/);
  });

  it('üniversite yetkilisine tam yetki yazılır', () => {
    const o = anketleriSuz([muhFakAnketi], UNI, {});
    expect(kapsamOzetMetni(UNI, o)).toMatch(/tüm anketleri yönetebilirsiniz/);
  });

  it('bölüm yetkilisine kaç anketin kendisine ait olduğu yazılır', () => {
    const atamalar = [{ surveyId: 'a2', kapsamTuru: 'bolum', kapsamDepartmentIds: ['b-bil'] }];
    const o = anketleriSuz([muhFakAnketi, bilAnketi], BIL_BOLUM, { atamalar });
    expect(kapsamOzetMetni(BIL_BOLUM, o)).toMatch(/1 tanesi bölümünüze ait/);
  });
});

describe('sahibiMi', () => {
  it('createdBy ile eşleşen kişi sahiptir', () => {
    expect(sahibiMi(muhFakAnketi, DEKAN)).toBe(true);
    expect(sahibiMi(muhFakAnketi, DEKAN_YRD)).toBe(false);
  });

  // Türkçe büyük/küçük harf (İ/I) ve fazladan boşluk ad eşleşmesini bozmamalı.
  it('ad karşılaştırması Türkçe duyarlı ve boşluğa toleranslı', () => {
    const a = { createdBy: 'Öğrt. Gör.  İNCİ  YILDIZ' };
    expect(sahibiMi(a, { name: 'öğrt. gör. inci yildiz' })).toBe(false);
    expect(sahibiMi(a, { name: 'Öğrt. Gör. İNCİ YILDIZ' })).toBe(true);
  });

  it('kimlik yoksa sahiplik yok', () => {
    expect(sahibiMi(muhFakAnketi, null)).toBe(false);
    expect(sahibiMi(null, DEKAN)).toBe(false);
  });

  it('sahipAd alanı da tanınır (kapsam damgasıyla yazılan)', () => {
    expect(sahibiMi({ sahipAd: 'Dekan X' }, { identifier: 'Dekan X' })).toBe(true);
  });
});

describe('atamaKapsamiKarari (paylaşım kapsamı)', () => {
  const MUH = { kapsamTuru: 'fakulte', facultyId: 'f-muh', departmentIds: ['b-bil', 'b-kim'] };
  const BIL = { kapsamTuru: 'bolum', facultyId: 'f-muh', departmentIds: ['b-bil'] };
  it('üniversite yetkilisi her yere paylaşır', () => {
    expect(atamaKapsamiKarari(UNI, { kapsamTuru: 'universite' })).toEqual({
      kapsamTuru: 'universite',
      kapsamFacultyId: '',
      kapsamDepartmentIds: [],
    });
    expect(
      atamaKapsamiKarari(UNI, { kapsamTuru: 'bolum', kapsamDepartmentIds: ['b-orm'] })
        .kapsamDepartmentIds
    ).toEqual(['b-orm']);
  });
  it('fakülte yetkilisi yalnız kendi fakültesine; başka fakülte reddedilir', () => {
    expect(atamaKapsamiKarari(MUH, { kapsamTuru: 'universite' })).toEqual({
      kapsamTuru: 'fakulte',
      kapsamFacultyId: 'f-muh',
      kapsamDepartmentIds: ['b-bil', 'b-kim'],
    });
    expect(
      atamaKapsamiKarari(MUH, { kapsamTuru: 'bolum', kapsamDepartmentIds: ['b-kim'] })
    ).toMatchObject({ kapsamTuru: 'bolum', kapsamDepartmentIds: ['b-kim'] });
    expect(atamaKapsamiKarari(MUH, { kapsamTuru: 'bolum', kapsamDepartmentIds: ['b-orm'] })).toBe(
      null
    );
    expect(
      atamaKapsamiKarari(MUH, { kapsamTuru: 'bolum', kapsamDepartmentIds: ['b-kim', 'b-orm'] })
        .kapsamDepartmentIds
    ).toEqual(['b-kim']);
  });
  it('bölüm yetkilisi ve akademisyen yalnız kendi bölümüne', () => {
    expect(atamaKapsamiKarari(BIL, { kapsamTuru: 'universite' }).kapsamDepartmentIds).toEqual([
      'b-bil',
    ]);
    expect(atamaKapsamiKarari(BIL, { kapsamTuru: 'bolum', kapsamDepartmentIds: ['b-kim'] })).toBe(
      null
    );
    const AKAD = { ...BIL, kapsamTuru: 'akademisyen' };
    expect(atamaKapsamiKarari(AKAD, {}).kapsamDepartmentIds).toEqual(['b-bil']);
  });
});
