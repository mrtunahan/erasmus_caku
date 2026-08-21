// KVKK aydınlatma metni ve onay kaydı.
//
// Kutucuk bir RIZA kutucuğu değildir: üniversitenin öğrenci verisini
// işlemesinin hukuki sebebi kanun ve hukuki yükümlülüktür (KVKK m.5/2),
// açık rıza değil. Kayıt, rızayı değil aydınlatmanın YAPILDIĞINI ispatlar.
import { describe, it, expect } from 'vitest';
import {
  KVKK_SURUM,
  kvkkMetni,
  aydinlatmaKaydi,
  yenidenGosterilmeli,
  kvkkDuzMetin,
} from '../lib/kvkk.js';

const KURUM = {
  universityName: 'Çankırı Karatekin Üniversitesi',
  kvkkAdres: 'Uluyazı Kampüsü, Çankırı',
  kvkkEposta: 'kvkk@karatekin.edu.tr',
  kvkkKep: 'karatekin@hs01.kep.tr',
};

describe('kvkkMetni', () => {
  it('kurum bilgileri metne işlenir', () => {
    const m = kvkkMetni(KURUM);
    expect(m.giris).toContain('Çankırı Karatekin Üniversitesi');
    const basvuru = m.bolumler.find((b) => b.baslik === 'Başvuru yolu');
    expect(basvuru.maddeler[0]).toContain('kvkk@karatekin.edu.tr');
    expect(basvuru.maddeler[0]).toContain('karatekin@hs01.kep.tr');
  });

  it('EKSİK KURUM BİLGİSİ gizlenmez, işaretlenir', () => {
    // Sessizce boş bırakılan iletişim alanı, metni hukuken eksik bırakır.
    // Arayüz bunu yetkiliye gösterebilsin diye bayrak taşınır.
    expect(kvkkMetni(null).eksikAlanVar).toBe(true);
    expect(kvkkMetni(KURUM).eksikAlanVar).toBe(false);
    expect(kvkkDuzMetin(kvkkMetni(null))).toContain('[kurum tarafından doldurulacak]');
  });

  it('kutucuk metni RIZA değil BİLGİLENDİRME der', () => {
    const t = kvkkMetni(KURUM).kutucukMetni;
    expect(t).toContain('okudum');
    expect(t).toContain('bilgilendirildim');
    // "Rıza gösteriyorum / onaylıyorum" demez: rıza hukuki sebep değildir.
    expect(t).not.toMatch(/rıza|onaylıyorum/i);
  });

  it('hukuki sebep bölümü açık rızaya DAYANMADIĞINI söyler', () => {
    const b = kvkkMetni(KURUM).bolumler.find((x) => x.baslik === 'Hukuki sebeplerimiz');
    expect(b.girisMetni).toContain('AÇIK RIZANIZ ARANMAKSIZIN');
    expect(b.maddeler.join(' ')).toContain('2547');
  });

  it('yurt dışı aktarım için rızanın AYRICA alınacağını söyler', () => {
    const b = kvkkMetni(KURUM).bolumler.find((x) => x.baslik === 'Verilerinizin aktarılması');
    const yurtDisi = b.maddeler.find((m) => m.includes('YURT DIŞI'));
    expect(yurtDisi).toContain('m.9');
    expect(yurtDisi).toContain('başvuru aşamasında');
  });

  it('m.11 haklarının sekizi de sayılır', () => {
    const b = kvkkMetni(KURUM).bolumler.find((x) => x.baslik.includes('m.11'));
    expect(b.maddeler).toHaveLength(8);
  });

  it('şifrenin görülemediği açıkça yazılır', () => {
    const b = kvkkMetni(KURUM).bolumler[0];
    expect(b.maddeler.join(' ')).toContain('hash');
  });
});

describe('aydinlatmaKaydi', () => {
  it('sürüm ve tarih ile birlikte, RIZA olmadığı işaretli kayıt üretir', () => {
    const k = aydinlatmaKaydi(KVKK_SURUM, new Date('2026-03-01T10:00:00Z'));
    expect(k).toEqual({
      surum: KVKK_SURUM,
      tarih: '2026-03-01T10:00:00.000Z',
      tur: 'aydinlatma',
    });
  });

  it('sürüm verilmezse güncel sürüm yazılır', () => {
    expect(aydinlatmaKaydi().surum).toBe(KVKK_SURUM);
  });
});

describe('yenidenGosterilmeli', () => {
  it('hiç kaydı olmayan kullanıcıya gösterilir', () => {
    expect(yenidenGosterilmeli(null, KVKK_SURUM)).toBe(true);
    expect(yenidenGosterilmeli({}, KVKK_SURUM)).toBe(true);
  });

  it('ESKİ SÜRÜMÜ onaylamış kullanıcıya yeniden gösterilir', () => {
    // "Onayladı" demek, hangi metni gördüğünü bilmeden bir şey ifade etmez.
    expect(yenidenGosterilmeli({ surum: '2024-01' }, '2026-01')).toBe(true);
  });

  it('güncel sürümü onaylamış kullanıcıya gösterilmez', () => {
    expect(yenidenGosterilmeli({ surum: '2026-01' }, '2026-01')).toBe(false);
  });
});
