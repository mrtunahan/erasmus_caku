import { describe, it, expect } from 'vitest';
import K from '../server/lib/eposta-kurali.js';
import posta from '../server/lib/posta.js';
import oturumIptal from '../server/lib/oturum-iptal.js';

describe('e-posta kuralı', () => {
  it('adres biçimi: kurumsal, Gmail, Outlook kabul; hatalılar ret', () => {
    expect(K.epostaGecerliMi('ahmet.yilmaz@karatekin.edu.tr')).toBe(true);
    expect(K.epostaGecerliMi('  Ali.Veli+okul@Gmail.com ')).toBe(true);
    expect(K.epostaGecerliMi('x@outlook.com')).toBe(true);
    expect(K.epostaGecerliMi('ahmet@')).toBe(false);
    expect(K.epostaGecerliMi('ahmet yılmaz@gmail.com')).toBe(false);
    expect(K.epostaGecerliMi('a..b@gmail.com')).toBe(false);
    expect(K.epostaGecerliMi('şule@gmail.com')).toBe(false);
    expect(K.epostaSadele('  Ali@Gmail.COM ')).toBe('ali@gmail.com');
  });
  it('maskeleme', () => {
    expect(K.epostaMaskele('ayse@gmail.com')).toBe('ay***@gmail.com');
    expect(K.epostaMaskele('a@x.com')).toBe('a***@x.com');
  });
  it('hesap anahtarı: rol + kimlik; aday ayrı', () => {
    expect(K.hesapAnahtari({ role: 'student', identifier: '240905002' })).toBe('student:240905002');
    expect(K.hesapAnahtari({ role: 'student', aday: true, identifier: 'ADAY-2026-0001' })).toBe(
      'aday:ADAY-2026-0001'
    );
    expect(K.hesapAnahtari({ role: 'professor', identifier: 'Dr. Ali Veli' })).toBe(
      'professor:Dr. Ali Veli'
    );
    expect(K.hesapAnahtari({ role: 'admin' })).toBe('admin:admin');
    expect(K.hesapAnahtari({ role: 'memur' })).toBe('');
    expect(K.jetonAnahtari({ role: 'aday', identifier: 'ADAY-2026-0001' })).toBe(
      'aday:ADAY-2026-0001'
    );
    expect(K.hesapEtiketi('professor:Dr. Ali Veli')).toBe('Akademisyen · Dr. Ali Veli');
  });
  it('kod ve jeton', () => {
    for (let i = 0; i < 50; i++) expect(K.kodBicimiGecerliMi(K.kodUret())).toBe(true);
    const j = K.jetonUret();
    expect(K.jetonBicimiGecerliMi(j)).toBe(true);
    expect(K.jetonBicimiGecerliMi('kisa')).toBe(false);
    expect(K.ozet('123456', 'a')).not.toBe(K.ozet('123456', 'b'));
  });
  it('süre ve şifre kuralı', () => {
    const s = new Date('2026-01-01T10:00:00Z');
    expect(K.suresiDolduMu(K.dakikaSonra(30, s), new Date('2026-01-01T10:29:00Z'))).toBe(false);
    expect(K.suresiDolduMu(K.dakikaSonra(30, s), new Date('2026-01-01T10:31:00Z'))).toBe(true);
    expect(K.sifreHatasi('12345')).toMatch(/en az 6/);
    expect(K.sifreHatasi('123456', '123457')).toMatch(/eşleşmiyor/);
    expect(K.sifreHatasi('123456', '123456')).toBe('');
  });
});

describe('posta şablonu', () => {
  it('içerik kaçışlanır, düğme ve kod görünür', () => {
    const h = posta.sablon({
      baslik: 'Başlık <b>',
      paragraflar: ['Merhaba <script>'],
      kod: '012345',
      dugme: { metin: 'Aç', url: 'https://offlineasistan.com.tr/panel/#x="1"' },
    });
    expect(h).toContain('Başlık &lt;b&gt;');
    expect(h).not.toContain('<script>');
    expect(h).toContain('012345');
    expect(h).toContain('#x=&quot;1&quot;');
    expect(posta.duzMetin({ baslik: 'B', paragraflar: ['p'], kod: '1' })).toContain('Kod: 1');
  });
  it('anahtar yoksa gönderim hazır değil', () => {
    const eski = process.env.RESEND_API_KEY;
    delete process.env.RESEND_API_KEY;
    expect(posta.postaHazirMi()).toBe(false);
    process.env.RESEND_API_KEY = 're_abcdefgh12345';
    expect(posta.postaHazirMi()).toBe(true);
    if (eski === undefined) delete process.env.RESEND_API_KEY;
    else process.env.RESEND_API_KEY = eski;
  });
});

describe('oturum iptali', () => {
  it('iptalden önce verilen jeton reddedilir, sonra verilen geçer', () => {
    const t = Date.now();
    oturumIptal._iptaller.set('student:240905002', t);
    expect(() =>
      oturumIptal.denetle({
        role: 'student',
        identifier: '240905002',
        iat: Math.floor(t / 1000) - 60,
      })
    ).toThrow();
    expect(
      oturumIptal.denetle({ role: 'student', identifier: '240905002', iat: Math.floor(t / 1000) })
    ).toBeTruthy();
    expect(oturumIptal.denetle({ role: 'student', identifier: '240905003', iat: 1 })).toBeTruthy();
    oturumIptal._iptaller.clear();
  });
});
