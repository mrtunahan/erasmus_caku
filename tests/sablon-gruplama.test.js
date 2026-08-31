import { describe, it, expect } from 'vitest';
import {
  ESLENEBILIR_UZANTILAR,
  eslenebilirMi,
  eslenenAlanSayisi,
  sablonDurumu,
  grupSiralamasi,
  sablonlariGrupla,
  bosModuller,
} from '../lib/sablon-gruplama.js';

const MODULLER = [
  { id: 'erasmus', label: 'Erasmus', color: '#3B82F6' },
  { id: 'staj', label: 'Staj', color: '#0EA5E9' },
  { id: 'muafiyet', label: 'Ders Muafiyet', color: '#10B981' },
];

function sablon(ek) {
  return Object.assign(
    { _id: 'x', name: 'Şablon', module: 'staj', isActive: true, file: { extension: 'docx' } },
    ek
  );
}

describe('eslenebilirMi', () => {
  it('docx ve xlsx doldurulabilir', () => {
    expect(eslenebilirMi({ extension: 'docx' })).toBe(true);
    expect(eslenebilirMi({ extension: 'xlsx' })).toBe(true);
  });

  it('pdf doldurulamaz', () => {
    expect(eslenebilirMi({ extension: 'pdf' })).toBe(false);
  });

  it('nokta ve büyük harf takılmaz', () => {
    expect(eslenebilirMi({ extension: '.DOCX' })).toBe(true);
  });

  it('dosya yoksa false', () => {
    expect(eslenebilirMi(null)).toBe(false);
    expect(eslenebilirMi({})).toBe(false);
  });

  it('listede iki biçim var', () => {
    expect(ESLENEBILIR_UZANTILAR).toEqual(['docx', 'xlsx']);
  });
});

describe('eslenenAlanSayisi', () => {
  it('değişkene bağlı alanları sayar', () => {
    expect(eslenenAlanSayisi({ fields: [{ variable: 'a' }, { variable: '' }, {}] })).toBe(1);
  });

  it('alan yoksa sıfır', () => {
    expect(eslenenAlanSayisi({})).toBe(0);
    expect(eslenenAlanSayisi(null)).toBe(0);
  });

  it('dizi olmayan alan listesi sıfır sayılır', () => {
    expect(eslenenAlanSayisi({ fields: 'bozuk' })).toBe(0);
  });
});

describe('sablonDurumu', () => {
  it('doldurulabilir ama eşlemesiz şablon eksiktir', () => {
    expect(sablonDurumu(sablon({ fields: [] })).eksik).toBe(true);
  });

  it('eşlemesi olan şablon eksik değildir', () => {
    const d = sablonDurumu(sablon({ fields: [{ variable: 'ad' }] }));
    expect(d.eksik).toBe(false);
    expect(d.eslenen).toBe(1);
  });

  it('pdf için eşleme eksikliği rapor edilmez', () => {
    const d = sablonDurumu(sablon({ file: { extension: 'pdf' }, fields: [] }));
    expect(d.eslenebilir).toBe(false);
    expect(d.eksik).toBe(false);
  });

  it('pasif durumu taşınır', () => {
    expect(sablonDurumu(sablon({ isActive: false })).pasif).toBe(true);
  });
});

describe('grupSiralamasi', () => {
  it('varsayılan en başta durur', () => {
    const s = grupSiralamasi([
      sablon({ name: 'Ahmet' }),
      sablon({ name: 'Zeynep', isDefault: true }),
    ]);
    expect(s.map((x) => x.name)).toEqual(['Zeynep', 'Ahmet']);
  });

  it('pasifler en sona düşer', () => {
    const s = grupSiralamasi([
      sablon({ name: 'Ahmet', isActive: false }),
      sablon({ name: 'Zeynep' }),
    ]);
    expect(s.map((x) => x.name)).toEqual(['Zeynep', 'Ahmet']);
  });

  it('kalanlar Türkçe ada göre sıralanır', () => {
    const s = grupSiralamasi([sablon({ name: 'Şablon' }), sablon({ name: 'Sablon' })]);
    expect(s.map((x) => x.name)).toEqual(['Sablon', 'Şablon']);
  });

  it('girdi dizisi değiştirilmez', () => {
    const girdi = [sablon({ name: 'B' }), sablon({ name: 'A' })];
    grupSiralamasi(girdi);
    expect(girdi.map((x) => x.name)).toEqual(['B', 'A']);
  });
});

describe('sablonlariGrupla', () => {
  it('modül tanım sırasını korur', () => {
    const g = sablonlariGrupla(
      [sablon({ module: 'muafiyet' }), sablon({ module: 'erasmus' })],
      MODULLER
    );
    expect(g.map((x) => x.modul)).toEqual(['erasmus', 'muafiyet']);
  });

  it('boş modül için grup üretmez', () => {
    const g = sablonlariGrupla([sablon({ module: 'staj' })], MODULLER);
    expect(g).toHaveLength(1);
    expect(g[0].modul).toBe('staj');
  });

  it('tanımsız modüldeki şablon kaybolmaz, sona eklenir', () => {
    const g = sablonlariGrupla(
      [sablon({ module: 'bilinmeyen' }), sablon({ module: 'erasmus' })],
      MODULLER
    );
    expect(g.map((x) => x.modul)).toEqual(['erasmus', 'bilinmeyen']);
    expect(g[1].meta.label).toBe('bilinmeyen');
  });

  it('modül alanı boş kayıt da bir gruba düşer', () => {
    const g = sablonlariGrupla([sablon({ module: '' })], MODULLER);
    expect(g).toHaveLength(1);
    expect(g[0].modul).toBe('tanimsiz');
  });

  it('grup sayıları hesaplanır', () => {
    const g = sablonlariGrupla(
      [
        sablon({ module: 'staj', fields: [] }),
        sablon({ module: 'staj', fields: [{ variable: 'a' }] }),
        sablon({ module: 'staj', isActive: false, fields: [{ variable: 'a' }] }),
      ],
      MODULLER
    );
    expect(g[0].toplam).toBe(3);
    expect(g[0].eksikEsleme).toBe(1);
    expect(g[0].pasif).toBe(1);
  });

  it('grup içi sıralama uygulanır', () => {
    const g = sablonlariGrupla(
      [
        sablon({ module: 'staj', name: 'B' }),
        sablon({ module: 'staj', name: 'A', isDefault: true }),
      ],
      MODULLER
    );
    expect(g[0].kayitlar.map((x) => x.name)).toEqual(['A', 'B']);
  });

  it('boş girdiler çökmez', () => {
    expect(sablonlariGrupla(null, null)).toEqual([]);
    expect(sablonlariGrupla([], MODULLER)).toEqual([]);
  });

  it('listedeki boşluklar elenir', () => {
    const g = sablonlariGrupla([null, sablon({ module: 'staj' })], MODULLER);
    expect(g).toHaveLength(1);
    expect(g[0].toplam).toBe(1);
  });
});

describe('bosModuller', () => {
  it('şablonu olmayan modülleri döner', () => {
    const b = bosModuller([sablon({ module: 'staj' })], MODULLER);
    expect(b.map((m) => m.id)).toEqual(['erasmus', 'muafiyet']);
  });

  it('hepsi doluysa boş liste', () => {
    const b = bosModuller(
      MODULLER.map((m) => sablon({ module: m.id })),
      MODULLER
    );
    expect(b).toEqual([]);
  });

  it('girdi yoksa tüm modüller boştur', () => {
    expect(bosModuller(null, MODULLER).map((m) => m.id)).toEqual(['erasmus', 'staj', 'muafiyet']);
  });
});
