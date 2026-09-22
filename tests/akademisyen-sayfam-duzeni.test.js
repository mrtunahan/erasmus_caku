import { describe, it, expect } from 'vitest';
import {
  AKADEMISYEN_SEKMELERI,
  AKADEMISYEN_SUTUNLARI,
  acikSekmeler,
  kartinSutunu,
  sekmeDuzelt,
  sekmeOzeti,
  sekmeSeridi,
  sekmeVarMi,
} from '../lib/akademisyen-sayfam-duzeni.js';

const TAM = { ders: true, akademisyen: true };
const DERSSIZ = { ders: false, akademisyen: true };
const YETKISIZ = { ders: false, akademisyen: false };

describe('sütunlar', () => {
  it('üç sütun: sol · orta · sağ', () => {
    expect(AKADEMISYEN_SUTUNLARI.map((s) => s.id)).toEqual(['sol', 'orta', 'sag']);
  });

  it('kartlar istenen sütunlarda', () => {
    expect(kartinSutunu('bilgiler')).toBe('sol');
    expect(kartinSutunu('dersler')).toBe('sol');
    expect(kartinSutunu('program')).toBe('orta');
    expect(kartinSutunu('randevular')).toBe('sag');
    expect(kartinSutunu('bugun')).toBe('sag');
  });

  // Aynı kart iki sütuna yazılırsa ekranda iki kere çizilir.
  it('hiçbir kart iki sütunda değil', () => {
    const hepsi = AKADEMISYEN_SUTUNLARI.flatMap((s) => s.kartlar);
    expect(new Set(hepsi).size).toBe(hepsi.length);
  });

  it('bilinmeyen kart boş döner', () => {
    expect(kartinSutunu('yok')).toBe('');
    expect(kartinSutunu(null)).toBe('');
  });
});

describe('sekmeler', () => {
  it('dört sekme, sırası ekrandaki sıra', () => {
    expect(AKADEMISYEN_SEKMELERI.map((s) => s.id)).toEqual(['genel', 'yoklama', 'gorusme', 'veri']);
  });

  it('tam yetkide hepsi açık', () => {
    expect(acikSekmeler(TAM).map((s) => s.id)).toEqual(['genel', 'yoklama', 'gorusme', 'veri']);
  });

  // Adına tanımlı dersi olmayan kişi yoklama açamaz; sekme boş bir ekrana
  // götürürdü.
  it('dersi olmayanda yoklama sekmesi yok', () => {
    expect(acikSekmeler(DERSSIZ).map((s) => s.id)).toEqual(['genel', 'gorusme', 'veri']);
  });

  it('akademisyen kaydı olmayanda veri girişi yok', () => {
    expect(acikSekmeler(YETKISIZ).map((s) => s.id)).toEqual(['genel', 'gorusme']);
  });

  // ⚠ Sayfa hiçbir zaman sekmesiz açılmamalı.
  it('yetki bilgisi hiç yoksa bile en az bir sekme kalır', () => {
    expect(acikSekmeler(null).length).toBeGreaterThan(0);
    expect(acikSekmeler(null)[0].id).toBe('genel');
  });

  it('sekmeVarMi açık/kapalıyı ayırır', () => {
    expect(sekmeVarMi('yoklama', TAM)).toBe(true);
    expect(sekmeVarMi('yoklama', DERSSIZ)).toBe(false);
    expect(sekmeVarMi('yok', TAM)).toBe(false);
  });
});

describe('sekmeDuzelt', () => {
  it('açık sekmeye dokunmaz', () => {
    expect(sekmeDuzelt('gorusme', TAM)).toBe('gorusme');
  });

  it('kapalı sekmeden ilk açık sekmeye iner', () => {
    expect(sekmeDuzelt('yoklama', DERSSIZ)).toBe('genel');
    expect(sekmeDuzelt('veri', YETKISIZ)).toBe('genel');
  });

  it('bilinmeyen sekme de düzeltilir', () => {
    expect(sekmeDuzelt('saçma', TAM)).toBe('genel');
    expect(sekmeDuzelt('', TAM)).toBe('genel');
  });
});

describe('sekmeOzeti', () => {
  it('genel bakışta ders saati', () => {
    expect(sekmeOzeti('genel', { dersSaati: 12 })).toBe('12 ders saati');
    expect(sekmeOzeti('genel', {})).toMatch(/bilgileriniz/i);
  });

  it('yoklamada ders sayısı', () => {
    expect(sekmeOzeti('yoklama', { dersSayisi: 4 })).toBe('4 ders · karekodla');
    expect(sekmeOzeti('yoklama', {})).toBe('Ders bulunamadı');
  });

  it('görüşmede açık saat sayısı', () => {
    expect(sekmeOzeti('gorusme', { acikSaat: 3 })).toBe('3 saat açık');
    expect(sekmeOzeti('gorusme', {})).toMatch(/açmadınız/);
  });

  it('veri girişinde yıl', () => {
    expect(sekmeOzeti('veri', { yil: 2026 })).toBe('2026 göstergeleri');
    expect(sekmeOzeti('veri', {})).toBe('Performans göstergeleri');
  });

  it('bilinmeyen sekmede boş', () => {
    expect(sekmeOzeti('yok', {})).toBe('');
  });
});

describe('sekmeSeridi', () => {
  it('her sekme başlık ve özetiyle döner', () => {
    const s = sekmeSeridi(TAM, { dersSayisi: 2, acikSaat: 1, dersSaati: 8, yil: 2026 });
    expect(s).toHaveLength(4);
    expect(s[1]).toMatchObject({
      id: 'yoklama',
      baslik: 'Dijital Yoklama',
      ozet: '2 ders · karekodla',
    });
  });

  it('veri olmadan da çöker değil', () => {
    expect(sekmeSeridi(TAM).every((s) => typeof s.ozet === 'string')).toBe(true);
  });
});
