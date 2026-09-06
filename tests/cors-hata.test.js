// ══════════════════════════════════════════════════════════════
// CORS REDDİ BİR SUNUCU HATASI DEĞİLDİR
//
// Ham IP'den gelen her tarama CORS'a takılıyor, hata nesnesinde durum
// olmadığı için merkezi yakalayıcı 500 sayıyor ve loglara 15 satırlık
// Express yığın izi düşüyordu. Oysa o istek bir arıza değil, doğru çalışan
// bir reddir.
// ══════════════════════════════════════════════════════════════
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { corsOrigin } from '../server/middleware/security.js';
import { errorHandler } from '../server/middleware/errorHandler.js';

function cagir(fn, origin) {
  return new Promise((coz) => fn(origin, (hata, izin) => coz({ hata, izin })));
}

describe('corsOrigin — allowlist tanımlıyken', () => {
  const eski = process.env.ALLOWED_ORIGINS;
  beforeEach(() => {
    process.env.ALLOWED_ORIGINS = 'https://offlineasistan.com.tr, https://x.tr';
  });
  afterEach(() => {
    if (eski === undefined) delete process.env.ALLOWED_ORIGINS;
    else process.env.ALLOWED_ORIGINS = eski;
  });

  it('izinli origin geçer', async () => {
    const r = await cagir(corsOrigin(), 'https://offlineasistan.com.tr');
    expect(r.hata).toBe(null);
    expect(r.izin).toBe(true);
  });

  it('origin yoksa (same-origin/curl/health) geçer', async () => {
    const r = await cagir(corsOrigin(), undefined);
    expect(r.hata).toBe(null);
  });

  it('BİLDİRİLEN HATA: reddedilen origin 500 değil 403 döner', async () => {
    const r = await cagir(corsOrigin(), 'http://84.46.241.81:80');
    expect(r.hata).toBeInstanceOf(Error);
    expect(r.hata.status).toBe(403);
    expect(r.hata.message).toContain('84.46.241.81');
  });

  it('red beklenen olarak işaretlenir (yığın izi basılmasın)', async () => {
    const r = await cagir(corsOrigin(), 'http://kotu.example');
    expect(r.hata.beklenen).toBe(true);
  });
});

describe('corsOrigin — allowlist boşken', () => {
  const eskiOrigins = process.env.ALLOWED_ORIGINS;
  const eskiNode = process.env.NODE_ENV;
  afterEach(() => {
    if (eskiOrigins === undefined) delete process.env.ALLOWED_ORIGINS;
    else process.env.ALLOWED_ORIGINS = eskiOrigins;
    if (eskiNode === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = eskiNode;
  });

  it('üretimde cross-origin 403 ile reddedilir', async () => {
    process.env.ALLOWED_ORIGINS = '';
    process.env.NODE_ENV = 'production';
    const r = await cagir(corsOrigin(), 'https://baska.example');
    expect(r.hata.status).toBe(403);
  });

  it('geliştirmede eski davranış korunur', () => {
    process.env.ALLOWED_ORIGINS = '';
    process.env.NODE_ENV = 'development';
    expect(corsOrigin()).toBe(true);
  });
});

describe('errorHandler', () => {
  function sahteYanit() {
    const y = { kod: 0, govde: null, headersSent: false };
    y.status = (k) => {
      y.kod = k;
      return y;
    };
    y.json = (g) => {
      y.govde = g;
      return y;
    };
    return y;
  }
  const istek = { method: 'GET', path: '/api/preview' };

  it('4xx tek satır loglanır, yığın izi basılmaz', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    const hata = Object.assign(new Error('CORS reddedildi: http://1.2.3.4'), {
      status: 403,
      beklenen: true,
    });
    const res = sahteYanit();
    errorHandler(hata, istek, res, () => {});
    expect(res.kod).toBe(403);
    expect(error).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalledTimes(1);
    expect(String(warn.mock.calls[0][0])).toContain('[API 403]');
    warn.mockRestore();
    error.mockRestore();
  });

  it('gerçek sunucu hatası tam yığın iziyle loglanır', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    const res = sahteYanit();
    errorHandler(new Error('patladı'), istek, res, () => {});
    expect(res.kod).toBe(500);
    expect(error).toHaveBeenCalledTimes(1);
    expect(error.mock.calls[0][1]).toHaveProperty('stack');
    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
    error.mockRestore();
  });

  it('durum kodu olmayan 4xx de tek satırdır', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    const res = sahteYanit();
    errorHandler(Object.assign(new Error('yok'), { status: 404 }), istek, res, () => {});
    expect(warn).toHaveBeenCalledTimes(1);
    expect(error).not.toHaveBeenCalled();
    warn.mockRestore();
    error.mockRestore();
  });
});
