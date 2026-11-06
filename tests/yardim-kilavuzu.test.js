import { describe, it, expect } from 'vitest';
import { kilavuzHtml, kilavuzCoz, satirIci } from '../lib/yardim-kilavuzu.js';

describe('yardım kılavuzu', () => {
  it('kayıt yoksa varsayılan öğrenci kılavuzu gelir', () => {
    const k = kilavuzCoz(null, 'ogrenci');
    expect(k.ozel).toBe(false);
    expect(k.icerik).toContain('# Offline Asistan Öğrenci Kılavuzu');
    expect(k.icerik).toContain('## 5. Mezuniyet başvurusu');
  });

  it('yetkilinin yazdığı içerik varsayılanın yerine geçer; boş içerik geçmez', () => {
    expect(kilavuzCoz({ icerik: '# Yeni', updatedBy: 'X' }, 'ogrenci')).toMatchObject({
      icerik: '# Yeni',
      ozel: true,
      updatedBy: 'X',
    });
    expect(kilavuzCoz({ icerik: '   ' }, 'ogrenci').ozel).toBe(false);
  });

  it('başlık, liste, alt liste ve tablo üretir', () => {
    const { html, basliklar } = kilavuzHtml(
      '# Başlık\n\nMetin **kalın**.\n\n1. Bir\n2. İki\n   - alt\n\n| A | B |\n| --- | --- |\n| x | y |\n\n- madde'
    );
    expect(basliklar).toEqual([{ id: 'b1', metin: 'Başlık', duzey: 1 }]);
    expect(html).toContain('<p>Metin <strong>kalın</strong>.</p>');
    expect(html).toContain('<ol><li>Bir</li><li>İki<ul><li>alt</li></ul></li></ol>');
    expect(html).toContain('<th>A</th>');
    expect(html).toContain('<td>y</td>');
    expect(html).toContain('<ul><li>madde</li></ul>');
  });

  it('HTML kaçışlanır, yalnız güvenli bağlantılar çalışır', () => {
    expect(satirIci('<script>x</script>')).toBe('&lt;script&gt;x&lt;/script&gt;');
    expect(satirIci('[a](javascript:alert(1))')).not.toContain('<a');
    expect(satirIci('[a](https://ornek.edu.tr)')).toContain('href="https://ornek.edu.tr"');
  });

  it('varsayılan kılavuz eksiksiz çevrilir (7 bölüm)', () => {
    const { basliklar } = kilavuzHtml(kilavuzCoz(null, 'ogrenci').icerik);
    expect(basliklar.filter((b) => b.duzey === 2)).toHaveLength(7);
  });
});

describe('varsayılan güncellemesi', () => {
  it('yetkili kaydettikten sonra varsayılan değiştiyse uyarı bayrağı kalkar', () => {
    const v = kilavuzCoz(null, 'ogrenci');
    expect(
      kilavuzCoz({ icerik: '# X', varsayilanOzeti: v.varsayilanOzeti }, 'ogrenci')
        .varsayilanGuncellendi
    ).toBe(false);
    expect(
      kilavuzCoz({ icerik: '# X', varsayilanOzeti: 'eski' }, 'ogrenci').varsayilanGuncellendi
    ).toBe(true);
  });
});
