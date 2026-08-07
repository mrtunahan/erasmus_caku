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
import { dosyaBloklari, extOf, istekGruplari } from '../server/services/doc-text.js';

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

// ── Görsel desteği ──
// Öğrenci başarı belgesini çoğu zaman telefonla fotoğraflıyor. "Yalnız PDF"
// demek işi yapılamaz kılmak yerine insanları dönüştürücü sitelere yöneltirdi.
describe('görsel bloklari', () => {
  const jpg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46]);
  const png = Buffer.concat([
    Buffer.from([0x89]),
    Buffer.from('PNG\r\n\x1a\n', 'latin1'),
    Buffer.alloc(8),
  ]);

  it('JPEG ve PNG icin image blogu uretir', async () => {
    const r = await dosyaBloklari({ buffer: jpg, name: 'belge.jpg' });
    expect(r.ok).toBe(true);
    expect(r.tur).toBe('gorsel');
    expect(r.bloklar[0].type).toBe('image');
    expect(r.bloklar[0].source.media_type).toBe('image/jpeg');

    const p = await dosyaBloklari({ buffer: png, name: 'belge.png' });
    expect(p.bloklar[0].source.media_type).toBe('image/png');
  });

  it('uzantisi yanlis olsa da icerik imzasindan tanir', async () => {
    // Telefon "IMG_0042" gibi uzantisiz ad verebiliyor.
    const r = await dosyaBloklari({ buffer: jpg, name: 'IMG_0042' });
    expect(r.tur).toBe('gorsel');
  });

  it('gorsel de PDF ile ayni gruba girer (metne cevrilmez)', async () => {
    const { gruplar } = await istekGruplari([{ buffer: jpg, name: 'a.jpg' }]);
    expect(gruplar).toHaveLength(1);
    expect(gruplar[0].some((b) => b.type === 'image')).toBe(true);
  });

  it('cok buyuk gorseli reddeder', async () => {
    const buyuk = Buffer.concat([jpg, Buffer.alloc(6 * 1024 * 1024)]);
    const r = await dosyaBloklari({ buffer: buyuk, name: 'buyuk.jpg' });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe('image-too-large');
  });
});
