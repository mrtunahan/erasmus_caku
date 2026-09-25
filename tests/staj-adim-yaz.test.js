// "Onayladım, geri onaya düştü" hatasının staj karşılığı: adım yazarken
// haritayı değil ADIMI yaz (bkz. lib/staj-adim-yaz.js).
import { describe, it, expect } from 'vitest';
import {
  adimOzeti,
  adimYamasi,
  adimYolu,
  adimYoluMu,
  onayAdimi,
  redAdimi,
  tamamlandiAdimi,
  yolIndeksi,
} from '../lib/staj-adim-yaz.js';

describe('adım yolları', () => {
  it('yol üretilir', () => {
    expect(adimYolu(0)).toBe('steps.0');
    expect(adimYolu(3)).toBe('steps.3');
    expect(adimYolu(-1)).toBe('');
    expect(adimYolu('x')).toBe('');
  });

  it('yama tek adımı taşır', () => {
    expect(adimYamasi(2, { status: 'completed' })).toEqual({ 'steps.2': { status: 'completed' } });
    expect(adimYamasi(2, null)).toBeNull();
    expect(adimYamasi(-1, {})).toBeNull();
  });

  it('yalnız adım yolları kabul edilir', () => {
    expect(adimYoluMu('steps.0')).toBe(true);
    expect(adimYoluMu('steps.3.status')).toBe(true);
    expect(adimYoluMu('steps.3.__proto__')).toBe(false);
    expect(adimYoluMu('updatedAt.x')).toBe(false);
    expect(adimYoluMu('steps')).toBe(false);
    expect(adimYoluMu('steps.a')).toBe(false);
    expect(yolIndeksi('steps.4.status')).toBe(4);
    expect(yolIndeksi('baska')).toBe(-1);
  });
});

describe('adım kararları eski izi silmez', () => {
  const SIMDI = new Date('2026-09-25T10:00:00Z');

  it('öğrenci tamamlar', () => {
    const a = tamamlandiAdimi({ not: 'x' }, '2021001', SIMDI);
    expect(a.status).toBe('pending_approval');
    expect(a.completedByStudent).toBe('2021001');
    expect(a.not).toBe('x');
  });

  it('onay, öğrencinin tamamlama izini korur', () => {
    const tamam = tamamlandiAdimi({}, '2021001', SIMDI);
    const onay = onayAdimi(tamam, 'Dr. Mehmet Demir', SIMDI);
    expect(onay.status).toBe('completed');
    expect(onay.approvedBy).toBe('Dr. Mehmet Demir');
    expect(onay.completedByStudent).toBe('2021001');
  });

  it('red, önceki onayı geçmişe taşır — silmez', () => {
    const onay = onayAdimi({}, 'Hoca A', SIMDI);
    const red = redAdimi(onay, 'Hoca B', SIMDI, 'belge eksik');
    expect(red.status).toBe('rejected');
    expect(red.rejectedBy).toBe('Hoca B');
    expect(red.rejectGerekce).toBe('belge eksik');
    expect(red.approvedBy).toBeUndefined();
    expect(red.onayGecmisi).toEqual([{ kim: 'Hoca A', tarih: SIMDI.toISOString() }]);
  });

  it('red sonrası onay da izi tutar', () => {
    const red = redAdimi({}, 'Hoca B', SIMDI);
    const onay = onayAdimi(red, 'Hoca A', SIMDI);
    expect(onay.status).toBe('completed');
    expect(onay.rejectedBy).toBeUndefined();
    expect(onay.redGecmisi).toHaveLength(1);
  });
});

// ── HATANIN KENDİSİ ──
// Aşağıdaki iki senaryo MongoDB'nin yaptığını taklit eder: `steps` anahtarı
// haritayı tümden değiştirir, `steps.<n>` yalnız o adımı.
function yaz(kayit, yama) {
  const yeni = { ...kayit, steps: { ...(kayit.steps || {}) } };
  Object.entries(yama).forEach(([anahtar, deger]) => {
    if (!anahtar.startsWith('steps.')) {
      yeni[anahtar] = deger;
      return;
    }
    const i = yolIndeksi(anahtar);
    const alan = anahtar.split('.')[2];
    if (alan) yeni.steps[i] = { ...(yeni.steps[i] || {}), [alan]: deger };
    else yeni.steps[i] = deger;
  });
  return yeni;
}

describe('öğrenci ve akademisyen aynı anda', () => {
  const SIMDI = new Date('2026-09-25T10:00:00Z');

  it('HARİTAYI yazmak akademisyenin onayını siler (eski davranış)', () => {
    let kayit = { steps: { 0: { status: 'completed' }, 1: {} } };
    const ogrenciEkrani = { ...kayit.steps }; // öğrencinin sayfası açıldığındaki hâl
    // akademisyen 1. adımı onayladı
    kayit = yaz(kayit, { 'steps.1': onayAdimi(kayit.steps[1], 'Hoca', SIMDI) });
    // öğrenci BAYAT haritasıyla 2. adımı tamamlıyor
    kayit = yaz(kayit, {
      steps: { ...ogrenciEkrani, 2: tamamlandiAdimi({}, '2021001', SIMDI) },
    });
    expect(kayit.steps[1].status).toBeUndefined(); // ← onay kayboldu
  });

  it('ADIMI yazmak iki işlemi de korur (yeni davranış)', () => {
    let kayit = { steps: { 0: { status: 'completed' }, 1: {} } };
    kayit = yaz(kayit, adimYamasi(1, onayAdimi(kayit.steps[1], 'Hoca', SIMDI)));
    kayit = yaz(kayit, adimYamasi(2, tamamlandiAdimi({}, '2021001', SIMDI)));
    expect(kayit.steps[1].status).toBe('completed');
    expect(kayit.steps[2].status).toBe('pending_approval');
    expect(adimOzeti(kayit.steps)).toEqual({ tamam: 2, bekleyen: 1, red: 0 });
  });
});
