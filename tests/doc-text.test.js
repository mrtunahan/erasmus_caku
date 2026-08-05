// Belge → model girdisi dönüştürücüsünün biçim tespiti.
//
// Bu testler somut bir regresyondan doğdu: Ders Muafiyet transkript
// yüklemesinde çağrı `{ path: '/.../abc.pdf', name: 'Transkript' }` şeklinde
// geliyordu. Uzantı `name` üzerinden okunduğu için boş çıkıyor, PDF
// "desteklenmeyen biçim" sayılıp reddediliyordu. `name` çoğu çağrıda
// insan-okur bir ETİKETTİR; uzantı taşımaz.
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { dosyaBloklari, extOf } from '../server/services/doc-text.js';

function gecici(ad, buf) {
  const p = path.join(os.tmpdir(), 'doctext-test-' + Date.now() + '-' + ad);
  fs.writeFileSync(p, buf);
  return p;
}

const PDF = Buffer.concat([
  Buffer.from('%PDF-1.4\n'),
  Buffer.from('/Type /Page x\n'),
  Buffer.from('%%EOF'),
]);

describe('extOf', () => {
  it('etiket görünümlü adlarda uzantı bulmaz', () => {
    expect(extOf('Transkript')).toBe('');
    expect(extOf('Öğrenci Not Çizelgesi (Transkript)')).toBe('');
  });
  it('gerçek dosya adında uzantıyı bulur', () => {
    expect(extOf('17641713336_Transkript.pdf')).toBe('pdf');
    expect(extOf('/var/uploads/muafiyet/a.XLSX')).toBe('xlsx');
  });
});

describe('dosyaBloklari — biçim tespiti', () => {
  it('ad uzantısız olsa da yoldaki uzantıyı kullanır (regresyon)', async () => {
    const p = gecici('t.pdf', PDF);
    const r = await dosyaBloklari({ path: p, name: 'Transkript' });
    fs.unlinkSync(p);
    expect(r.ok).toBe(true);
    expect(r.tur).toBe('pdf');
  });

  it('hiç uzantı yoksa içerik imzasından PDF anlar', async () => {
    const p = gecici('uzantisiz', PDF);
    const r = await dosyaBloklari({ path: p, name: 'Transkript' });
    fs.unlinkSync(p);
    expect(r.ok).toBe(true);
    expect(r.tur).toBe('pdf');
  });

  it('desteklenmeyen biçimi hâlâ reddeder', async () => {
    const p = gecici('resim.bin', Buffer.from([0x89, 0x50, 0x4e, 0x47, 0, 0, 0, 0]));
    const r = await dosyaBloklari({ path: p, name: 'Resim' });
    fs.unlinkSync(p);
    expect(r.ok).toBe(false);
    expect(String(r.reason)).toContain('unsupported-type');
  });

  it('düz metni okur', async () => {
    const p = gecici('a.txt', Buffer.from('BLM101 Programlamaya Giriş 6 AA', 'utf8'));
    const r = await dosyaBloklari({ path: p, name: 'Ders Listesi' });
    fs.unlinkSync(p);
    expect(r.ok).toBe(true);
    expect(r.metin).toContain('BLM101');
  });
});
