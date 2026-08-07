// Smoke testleri: build/config tutarlılığı için minimum kontroller.
// Asıl modüller window globals üzerinden çalıştığı için JSDOM olmadan
// component testi anlamlı değil; bu yüzden statik dosya doğrulaması yapılır.

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(__dirname, '..');

function readJson(p) {
  return JSON.parse(readFileSync(resolve(root, p), 'utf8'));
}

describe('proje altyapısı', () => {
  it("frontend package.json gerekli script'leri içerir", () => {
    const pkg = readJson('package.json');
    expect(pkg.scripts.dev).toBeDefined();
    expect(pkg.scripts.build).toBeDefined();
    expect(pkg.scripts.preview).toBeDefined();
  });

  it("server package.json gerekli script'leri içerir", () => {
    const pkg = readJson('server/package.json');
    expect(pkg.scripts.start).toBeDefined();
    expect(pkg.scripts.migrate).toBeDefined();
  });

  it('main.jsx kayıtlı tüm lazy modüller dosya sisteminde mevcut', () => {
    const main = readFileSync(resolve(root, 'main.jsx'), 'utf8');
    const importRegex = /import\(['"]\.\/([^'"]+\.jsx)['"]\)/g;
    const seen = new Set();
    let m;
    while ((m = importRegex.exec(main)) !== null) seen.add(m[1]);
    expect(seen.size).toBeGreaterThan(0);
    for (const file of seen) {
      expect(existsSync(resolve(root, file)), `eksik modül: ${file}`).toBe(true);
    }
  });

  it('.env.example dosyaları senkron', () => {
    expect(existsSync(resolve(root, '.env.example'))).toBe(true);
    expect(existsSync(resolve(root, 'server/.env.example'))).toBe(true);
  });
});
