// Zengin metin ayrıştırıcı.
//
// Bu içerik SİSTEMDEKİ HERKESE pop-up olarak açılıyor ve onlarca kişide yazma
// yetkisi var. Ayrıştırıcı bir etiketi kaçırırsa, duyuru yazabilen herkes
// uygulama içinde istediğini çalıştırabilir hâle gelir — o yüzden kaçış
// yolları tek tek test altında.
import { describe, it, expect } from 'vitest';
import {
  zenginAyristir,
  zenginDuzMetin,
  zenginBosMu,
  zenginBaglantiGuvenli,
  zenginKacisCoz,
} from '../lib/zengin-metin.js';

// Ağaçta belirli bir etiket var mı?
const etiketVarMi = (dugumler, ad) =>
  (dugumler || []).some((d) => d.tip === 'etiket' && (d.ad === ad || etiketVarMi(d.cocuklar, ad)));

describe('zenginAyristir — izinli biçimlendirme', () => {
  it('kalın, italik ve listeyi korur', () => {
    const a = zenginAyristir('<p><b>Kalın</b> ve <i>italik</i></p><ul><li>Madde</li></ul>');
    expect(etiketVarMi(a, 'b')).toBe(true);
    expect(etiketVarMi(a, 'i')).toBe(true);
    expect(etiketVarMi(a, 'li')).toBe(true);
  });

  it('metni doğru sırayla çıkarır', () => {
    expect(zenginDuzMetin('<p>Bir</p><p>İki</p>')).toBe('Bir\nİki');
  });

  it('iç içe etiketleri ağaç olarak kurar', () => {
    const a = zenginAyristir('<p>dış <b>iç</b></p>');
    expect(a[0].ad).toBe('p');
    expect(a[0].cocuklar.some((c) => c.tip === 'etiket' && c.ad === 'b')).toBe(true);
  });

  it('kapanmayan etiketi de toparlar', () => {
    expect(zenginDuzMetin('<p>bir <b>iki')).toContain('iki');
  });
});

describe('zenginAyristir — güvenlik', () => {
  it('script etiketini İÇERİĞİYLE birlikte siler', () => {
    const a = zenginAyristir('<p>önce</p><script>alert(1)</script><p>sonra</p>');
    expect(etiketVarMi(a, 'script')).toBe(false);
    const metin = zenginDuzMetin('<p>önce</p><script>alert(1)</script><p>sonra</p>');
    expect(metin).not.toContain('alert');
    expect(metin).toContain('önce');
    expect(metin).toContain('sonra');
  });

  it('style etiketini de içeriğiyle siler', () => {
    expect(zenginDuzMetin('<style>body{display:none}</style>Merhaba')).toBe('Merhaba');
  });

  it('img ve iframe üretmez', () => {
    const a = zenginAyristir('<img src=x onerror=alert(1)><iframe src="//kotu"></iframe>');
    expect(etiketVarMi(a, 'img')).toBe(false);
    expect(etiketVarMi(a, 'iframe')).toBe(false);
  });

  it('izinsiz etiketi atar ama İÇERİĞİNİ korur', () => {
    // Bir <div> yüzünden duyurunun yazısı kaybolmamalı.
    expect(zenginDuzMetin('<div>Duyuru metni</div>')).toBe('Duyuru metni');
  });

  it('olay öznitelikleri hiç taşınmaz', () => {
    const a = zenginAyristir('<b onclick="alert(1)" onmouseover="x()">test</b>');
    expect(JSON.stringify(a)).not.toContain('onclick');
    expect(JSON.stringify(a)).not.toContain('alert');
  });

  it('javascript: bağlantısını <a> olarak ÜRETMEZ', () => {
    const a = zenginAyristir('<a href="javascript:alert(1)">tıkla</a>');
    expect(etiketVarMi(a, 'a')).toBe(false);
    expect(zenginDuzMetin('<a href="javascript:alert(1)">tıkla</a>')).toBe('tıkla');
  });

  it('sayısal kaçışla gizlenmiş etiket metin olarak kalır', () => {
    // "&#60;script&#62;" çözülünce etiket sanılmamalı.
    const m = zenginDuzMetin('&#60;script&#62;alert(1)&#60;/script&#62;');
    expect(m).toContain('<script>');
    expect(etiketVarMi(zenginAyristir('&#60;script&#62;'), 'script')).toBe(false);
  });
});

describe('zenginBaglantiGuvenli', () => {
  it('http ve https adreslerini kabul eder', () => {
    expect(zenginBaglantiGuvenli('https://ornek.edu.tr/a')).toBe('https://ornek.edu.tr/a');
    expect(zenginBaglantiGuvenli('http://ornek.edu.tr')).toBe('http://ornek.edu.tr');
  });

  it('mailto adresini kabul eder', () => {
    expect(zenginBaglantiGuvenli('mailto:a@b.edu.tr')).toBe('mailto:a@b.edu.tr');
  });

  it('javascript, data ve protokolsüz adresi reddeder', () => {
    expect(zenginBaglantiGuvenli('javascript:alert(1)')).toBe('');
    expect(zenginBaglantiGuvenli('data:text/html,<script>')).toBe('');
    expect(zenginBaglantiGuvenli('//kotu.site/x')).toBe('');
  });

  it('boşluk ve kontrol karakteriyle gizlenmiş şemayı reddeder', () => {
    // "java\tscript:" tarayıcıda çalışır; ayıklamadan önce temizlenmeli.
    expect(zenginBaglantiGuvenli('java\tscript:alert(1)')).toBe('');
    expect(zenginBaglantiGuvenli('  javascript:alert(1)')).toBe('');
  });
});

describe('zenginBosMu', () => {
  it('editör artığını boş sayar', () => {
    expect(zenginBosMu('<p><br></p>')).toBe(true);
    expect(zenginBosMu('   ')).toBe(true);
    expect(zenginBosMu('')).toBe(true);
  });

  it('gerçek içeriği dolu sayar', () => {
    expect(zenginBosMu('<p>a</p>')).toBe(false);
  });
});

describe('zenginKacisCoz', () => {
  it('temel varlıkları çözer', () => {
    expect(zenginKacisCoz('a &amp; b &lt;c&gt;')).toBe('a & b <c>');
    expect(zenginKacisCoz('&nbsp;')).toBe(' ');
  });
});
