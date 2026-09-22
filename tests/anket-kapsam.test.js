import { describe, it, expect } from 'vitest';
import {
  anketGorunurMu,
  anketKapsamEtiketi,
  anketKapsamYamasi,
  anketKilitSebebi,
  anketYonetilebilirMi,
  anketleriSuz,
  kapsamOzetMetni,
  kapsamliMi,
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
};
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

  it('üniversite geneli anket herkese görünür', () => {
    expect(anketGorunurMu(uniAnketi, MUH_FAK)).toBe(true);
    expect(anketGorunurMu(uniAnketi, BIL_BOLUM)).toBe(true);
  });

  it('bölüm yetkilisi yalnız kendi bölümünü ve üstünü görür', () => {
    expect(anketGorunurMu(bilAnketi, BIL_BOLUM)).toBe(true);
    expect(anketGorunurMu(muhFakAnketi, BIL_BOLUM)).toBe(true); // kendi bölümünü kapsıyor
    expect(anketGorunurMu(ormAnketi, BIL_BOLUM)).toBe(false);
  });

  // Liste bugünkü işi durdurmasın: eski kayıtlar görünür kalır.
  it('kapsamsız eski anket görünür', () => {
    expect(anketGorunurMu(eskiAnket, MUH_FAK)).toBe(true);
    expect(anketGorunurMu(eskiAnket, BIL_BOLUM)).toBe(true);
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

  it('fakülte yetkilisi KENDİ fakülte geneli anketini düzenler', () => {
    expect(anketYonetilebilirMi(muhFakAnketi, MUH_FAK)).toBe(true);
  });

  it('fakülte yetkilisi başka fakültenin fakülte anketini düzenleyemez', () => {
    expect(anketYonetilebilirMi(ormFakAnketi, MUH_FAK)).toBe(false);
  });

  it('fakülte yetkilisi üniversite geneli ankete dokunamaz', () => {
    expect(anketYonetilebilirMi(uniAnketi, MUH_FAK)).toBe(false);
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
    expect(anketKilitSebebi(muhFakAnketi, MUH_FAK)).toBe('');
  });

  it('bölüm anketinde fakülte yetkilisine kimin düzenleyebileceği söylenir', () => {
    expect(anketKilitSebebi(bilAnketi, MUH_FAK)).toMatch(/bölüm yetkilisindedir/i);
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
    const o = anketleriSuz(hepsi, MUH_FAK, { user: { name: 'Dekan' } });
    expect(o.liste.map((a) => a.id)).toEqual(['a1', 'a2', 'a4', 'a6']);
    expect(o.gizlenen).toBe(2);
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

  it('bölüm yetkilisi yalnız kendi anketini yönetir', () => {
    const o = anketleriSuz(hepsi, BIL_BOLUM, { user: { name: 'Bölüm Bşk.' } });
    expect(o.liste.map((a) => a.id)).toEqual(['a1', 'a2', 'a4', 'a6']);
    expect(o.yonetilebilir).toBe(1);
  });

  it('boş listede çökmez', () => {
    expect(anketleriSuz(null, MUH_FAK)).toEqual({ liste: [], gizlenen: 0, yonetilebilir: 0 });
  });
});

describe('kapsamOzetMetni', () => {
  it('fakülte yetkilisine bölüm anketlerinin kilitli olduğu söylenir', () => {
    const o = anketleriSuz([muhFakAnketi, bilAnketi], MUH_FAK, {});
    expect(kapsamOzetMetni(MUH_FAK, o)).toMatch(/Bölüm anketleri yalnız görüntülenir/);
  });

  it('üniversite yetkilisine tam yetki yazılır', () => {
    const o = anketleriSuz([muhFakAnketi], UNI, {});
    expect(kapsamOzetMetni(UNI, o)).toMatch(/tüm anketleri yönetebilirsiniz/);
  });

  it('bölüm yetkilisine kaç anketin kendisine ait olduğu yazılır', () => {
    const o = anketleriSuz([muhFakAnketi, bilAnketi], BIL_BOLUM, {});
    expect(kapsamOzetMetni(BIL_BOLUM, o)).toMatch(/1 tanesi bölümünüze ait/);
  });
});
