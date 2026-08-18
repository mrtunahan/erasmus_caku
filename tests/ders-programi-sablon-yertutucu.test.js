// ══════════════════════════════════════════════════════════════
// HAZIR ŞABLONLARIN YER TUTUCULARI ↔ DEĞİŞKEN ETİKETLERİ
//
// sablonlar/ders-programi/ altındaki hazır şablonlar, Şablonlar modülüne
// yüklendiğinde ELLE EŞLEME GEREKTİRMEDEN çalışsın diye tasarlandı: modül,
// yer tutucu adı bir değişken ETİKETİYLE eşleşiyorsa alanı kendiliğinden
// bağlar (bkz. sablonlar-modulu.jsx otomatik eşleme).
//
// Bu sözleşme sessizce bozulabilir: shared-components.jsx'te bir etiket
// değişince şablonlar hâlâ açılır, hâlâ yüklenir — ama alanlar boş çıkar ve
// bunu ancak belge üreten yetkili fark eder. Test, iki dosyayı METİN olarak
// okuyup eşleşmeyi doğrular.
// ══════════════════════════════════════════════════════════════
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const oku = (yol) => readFileSync(new URL('../' + yol, import.meta.url), 'utf8');

// sablonlar-modulu.jsx'teki normalleştirmenin birebir aynısı.
const normTr = (s) =>
  (s || '')
    .replace(/İ/g, 'i')
    .replace(/I/g, 'ı')
    .toLocaleLowerCase('tr-TR')
    .replace(/[^0-9a-zçğıöşü]/g, '');

/** shared-components.jsx'ten bir değişken dizisinin etiketlerini çıkarır. */
function etiketler(kaynak, dizeAdi) {
  const bas = kaynak.indexOf('const ' + dizeAdi + ' = [');
  expect(bas, dizeAdi + ' bulunamadı').toBeGreaterThan(-1);
  const son = kaynak.indexOf('\n];', bas);
  expect(son, dizeAdi + ' kapanışı bulunamadı').toBeGreaterThan(bas);
  const blok = kaynak.slice(bas, son);
  return [...blok.matchAll(/label:\s*'((?:[^'\\]|\\.)*)'/g)].map((m) => m[1].replace(/\\'/g, "'"));
}

const paylasilan = oku('shared-components.jsx');
const uretici = oku('scripts/ders-programi-sablonlari.py');

const STATIK = etiketler(paylasilan, 'DERSPROGRAMI_STATIC');
const SATIR = etiketler(paylasilan, 'DERSPROGRAMI_ROWS');

// byNorm kuralı: tam etiket VE parantez içi atılmış hâli.
const bilinen = new Set();
[...STATIK, ...SATIR].forEach((e) => {
  bilinen.add(normTr(e));
  bilinen.add(normTr(e.replace(/\(.*?\)/g, '')));
});

// Gün yer tutucuları üreticide DİZİDEN kurulur ('{{' + gun + '}}'), metinde
// düz geçmez; GUNLER listesi okunup türetilir.
const uretilenGunler = (() => {
  const m = uretici.match(/^GUNLER = \[([^\]]+)\]/m);
  expect(m, 'GUNLER listesi bulunamadı').toBeTruthy();
  return [...m[1].matchAll(/'([^']+)'/g)].map((x) => x[1]);
})();

const yerTutucular = [
  ...new Set(
    [...uretici.matchAll(/\{\{([^{}\n]+)\}\}/g)]
      .map((m) => m[1])
      // "'{{' + g + '}}'" gibi dize BİRLEŞTİRMELERİ gerçek yer tutucu değil.
      .filter((t) => !/['+]/.test(t))
      .concat(uretilenGunler)
  ),
];

describe('hazır ders programı şablonları', () => {
  it('üretici gerçekten yer tutucu içeriyor', () => {
    expect(yerTutucular.length).toBeGreaterThanOrEqual(15);
  });

  it('HER yer tutucu bir değişken etiketiyle eşleşir (elle eşleme gerekmez)', () => {
    const eslesmeyen = yerTutucular.filter((y) => !bilinen.has(normTr(y)));
    expect(eslesmeyen).toEqual([]);
  });

  it('kullanıcının istediği künye alanları şablonda var: kurum, tarih, fakülte, dönem', () => {
    ['Kurum Adı', 'Tarih', 'Fakülte Adı', 'Dönem'].forEach((alan) =>
      expect(yerTutucular).toContain(alan)
    );
  });

  it('tablo satırı beş günün TAMAMINI taşır (bir satır = bir saat)', () => {
    ['Saat', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma'].forEach((g) =>
      expect(yerTutucular).toContain(g)
    );
  });

  it('gün değişkenlerinin sırası ızgaranınkiyle aynı', () => {
    const gunler = oku('lib/akademisyen-programi.js').match(
      /export const PROGRAM_GUNLERI = \[([^\]]+)\]/
    );
    expect(gunler).toBeTruthy();
    const sirali = [...gunler[1].matchAll(/'([^']+)'/g)].map((m) => m[1]);
    expect(SATIR.slice(1)).toEqual(sirali);
  });
});
