import { describe, it, expect } from 'vitest';
import * as w from '../lib/word-belge.js';
import {
  talepHatalari,
  bosTalep,
  projeBilgisiGerekliMi,
  sahipYazmaKarari,
  sahipGecisiGecerliMi,
  ttoSablonVerisi,
  ttoAyarlari,
  ttoWordGovdesi,
  ttoDosyaAdi,
  profildenGenelBilgi,
  TTO_AYAR_VARSAYILAN,
  TTO_SABLON_DEGISKENLERI,
  ttoBirimAdiMi,
  ttoBirimUyesiMi,
  yoneticiYazmaKarari,
  ttoBildirimPlani,
} from '../lib/tto-talep.js';

function tamTalep(ek) {
  const t = bosTalep({ name: 'Dr. Ayşe Yılmaz', title: 'Dr. Öğr. Üyesi', email: 'ayse@x.edu.tr' });
  t.genel.gsm = '05550000000';
  t.nitelik = ['danismanlik'];
  t.ozet = 'Danışmanlık talebi.';
  t.beyan = true;
  return Object.assign(t, ek || {});
}

describe('TTO talep denetimi', () => {
  it('eksiksiz talep hatasızdır', () => {
    expect(talepHatalari(tamTalep())).toEqual([]);
  });

  it('boş talep zorunlu alanları sayar', () => {
    const h = talepHatalari(bosTalep({}));
    expect(h.some((x) => x.includes('Adı Soyadı'))).toBe(true);
    expect(h.some((x) => x.includes('niteliğinden'))).toBe(true);
    expect(h.some((x) => x.includes('özeti'))).toBe(true);
    expect(h.some((x) => x.includes('Beyan'))).toBe(true);
  });

  it('proje seçilince proje bilgileri zorunlu olur', () => {
    const t = tamTalep({ nitelik: ['projeDestegi'] });
    expect(projeBilgisiGerekliMi(t)).toBe(true);
    const h = talepHatalari(t);
    expect(h.some((x) => x.includes('Proje bilgileri 1.'))).toBe(true);
    expect(h.some((x) => x.includes('7. soru yanıtlanmalıdır'))).toBe(true);
  });

  it('benzer proje "evet" ise açıklama ister', () => {
    const t = tamTalep({
      nitelik: ['projeOrtagi'],
      proje: {
        ad: 'A',
        destekProgrami: 'TÜBİTAK',
        konu: 'K',
        butce: '1',
        sure: '12 ay',
        ortaklar: 'X',
        ticarilesme: 'evet',
        patent: 'hayir',
        benzer: 'evet',
        benzerAciklama: '',
      },
    });
    expect(talepHatalari(t)).toEqual(['Benzer proje varsa ne olduğunu yazın (9. soru).']);
  });

  it('geçersiz e-posta ve telefonsuz talep yakalanır', () => {
    const t = tamTalep();
    t.genel.email = 'bozuk';
    t.genel.gsm = '';
    const h = talepHatalari(t);
    expect(h).toContain('E-posta adresi geçerli değil.');
    expect(h.some((x) => x.includes('telefon'))).toBe(true);
  });
});

describe('TTO durum geçişleri (talep sahibi)', () => {
  it('taslak gönderilir, gönderilen geri çekilir', () => {
    expect(sahipGecisiGecerliMi('taslak', 'gonderildi')).toBe(true);
    expect(sahipGecisiGecerliMi('gonderildi', 'taslak')).toBe(true);
    expect(sahipGecisiGecerliMi('iade', 'gonderildi')).toBe(true);
  });
  it('sahip kendi talebini onaylayamaz, incelemedeki talebi geri çekemez', () => {
    expect(sahipGecisiGecerliMi('gonderildi', 'onaylandi')).toBe(false);
    expect(sahipGecisiGecerliMi('taslak', 'onaylandi')).toBe(false);
    expect(sahipGecisiGecerliMi('incelemede', 'taslak')).toBe(false);
  });
});

describe('TTO sahip yazma kararı (sunucu)', () => {
  const simdi = new Date('2026-09-29T10:00:00Z');

  it('yeni taslak: sahip damgalanır, yönetici alanları düşer', () => {
    const veri = Object.assign(tamTalep(), { talepNo: '99', karar: 'onay', sahip: 'baskasi' });
    const k = sahipYazmaKarari({ tur: 'add', mevcut: null, veri, kimlik: 'Dr. Ayşe', simdi });
    expect(k.izin).toBe(true);
    expect(veri.sahip).toBe('Dr. Ayşe');
    expect(veri.talepNo).toBeUndefined();
    expect(veri.karar).toBeUndefined();
    expect(veri.gecmis[0].olay).toBe('olusturuldu');
  });

  it('başkasının talebine yazılamaz', () => {
    const k = sahipYazmaKarari({
      tur: 'update',
      mevcut: { sahip: 'Dr. Başka', durum: 'taslak' },
      veri: { ozet: 'x' },
      kimlik: 'Dr. Ayşe',
    });
    expect(k.izin).toBe(false);
  });

  it('eksik talep gönderilemez, tam talep gönderilir ve tarih sunucudan gelir', () => {
    const eksik = sahipYazmaKarari({
      tur: 'update',
      mevcut: { sahip: 'Dr. Ayşe', durum: 'taslak' },
      veri: { durum: 'gonderildi' },
      kimlik: 'Dr. Ayşe',
    });
    expect(eksik.izin).toBe(false);

    const veri = { durum: 'gonderildi', gonderimTarihi: '2000-01-01' };
    const tam = sahipYazmaKarari({
      tur: 'update',
      mevcut: Object.assign(tamTalep(), { sahip: 'Dr. Ayşe', durum: 'taslak' }),
      veri,
      kimlik: 'Dr. Ayşe',
      simdi,
    });
    expect(tam.izin).toBe(true);
    expect(veri.gonderimTarihi).toBe(simdi.toISOString());
    expect(veri.gecmis.slice(-1)[0].olay).toBe('gonderildi');
  });

  it('gönderilmiş talebin içeriği değişmez; yalnız geri çekilebilir', () => {
    const mevcut = Object.assign(tamTalep(), { sahip: 'Dr. Ayşe', durum: 'gonderildi' });
    expect(
      sahipYazmaKarari({ tur: 'update', mevcut, veri: { ozet: 'yeni' }, kimlik: 'Dr. Ayşe' }).izin
    ).toBe(false);
    expect(
      sahipYazmaKarari({ tur: 'update', mevcut, veri: { durum: 'taslak' }, kimlik: 'Dr. Ayşe' })
        .izin
    ).toBe(true);
  });

  it('sahip onay damgası vuramaz', () => {
    const k = sahipYazmaKarari({
      tur: 'update',
      mevcut: Object.assign(tamTalep(), { sahip: 'Dr. Ayşe', durum: 'gonderildi' }),
      veri: { durum: 'onaylandi' },
      kimlik: 'Dr. Ayşe',
    });
    expect(k.izin).toBe(false);
  });

  it('yalnız taslak silinir', () => {
    expect(
      sahipYazmaKarari({
        tur: 'delete',
        mevcut: { sahip: 'Dr. Ayşe', durum: 'gonderildi' },
        kimlik: 'Dr. Ayşe',
      }).izin
    ).toBe(false);
    expect(
      sahipYazmaKarari({
        tur: 'delete',
        mevcut: { sahip: 'Dr. Ayşe', durum: 'taslak' },
        kimlik: 'Dr. Ayşe',
      }).izin
    ).toBe(true);
  });

  it('noktalı alan yolu reddedilir', () => {
    const k = sahipYazmaKarari({
      tur: 'update',
      mevcut: { sahip: 'Dr. Ayşe', durum: 'taslak' },
      veri: { 'genel.email': 'x@y.z' },
      kimlik: 'Dr. Ayşe',
    });
    expect(k.izin).toBe(false);
  });
});

describe('TTO şablon verisi ve Word çıktısı', () => {
  it('ayar kaydı boşsa formun varsayılanları kullanılır', () => {
    expect(ttoAyarlari(null).dokumanKodu).toBe('TTO-TF-001');
    expect(ttoAyarlari({ revizyonNo: '003' }).revizyonNo).toBe('003');
  });

  it('seçilen kutular ☒, diğerleri ☐', () => {
    const t = tamTalep({ nitelik: ['danismanlik', 'fikriMulkiyet'] });
    t.proje.ticarilesme = 'evet';
    const v = ttoSablonVerisi(t, null, new Date('2026-09-29T10:00:00Z'));
    expect(v.nitelik_danismanlik).toBe('☒');
    expect(v.nitelik_laboratuvar).toBe('☐');
    expect(v.nitelik_fikriMulkiyet).toBe('☒');
    expect(v.ticarilesmeEvet).toBe('☒');
    expect(v.ticarilesmeHayir).toBe('☐');
    expect(v.patentEvet).toBe('☐');
    expect(v.adSoyad).toBe('Ayşe Yılmaz');
    expect(v.belgeTarihi).toBe('29.09.2026');
  });

  it('şablon kataloğundaki her değişken veride üretilir', () => {
    const v = ttoSablonVerisi(tamTalep(), null);
    TTO_SABLON_DEGISKENLERI.forEach((d) => expect(d.id in v).toBe(true));
  });

  it('yerleşik Word gövdesi geçerli XML parçası üretir ve kaçış uygular', () => {
    const t = tamTalep({ ozet: 'A & B <test>' });
    const xml = ttoWordGovdesi(t, null, w);
    expect(xml).toContain('GENEL BİLGİLER');
    expect(xml).toContain('A &amp; B &lt;test&gt;');
    expect(xml).toContain(TTO_AYAR_VARSAYILAN.dokumanKodu);
    expect(xml).toContain('TASLAKTIR');
  });

  it('dosya adı ASCII ve güvenli karakterlerden oluşur', () => {
    expect(ttoDosyaAdi({ genel: { adSoyad: 'Dr. Ayşe / Yılmaz' } })).toBe(
      'TTO_Talep_Formu_Dr._Ayse_Yilmaz.docx'
    );
    expect(ttoDosyaAdi({ genel: { adSoyad: 'İsmail Çağrı Öztürk' } })).toBe(
      'TTO_Talep_Formu_Ismail_Cagri_Ozturk.docx'
    );
  });
});

describe('Benim Sayfam → TTO formu', () => {
  it('unvan addan ayrılır, bölüm ve dahili aktarılır', () => {
    const g = profildenGenelBilgi(
      { name: 'Arş. Gör. A. Tunahan KORKMAZ', email: 't@karatekin.edu.tr', dahili: '8383' },
      'Bilgisayar Mühendisliği'
    );
    expect(g.adSoyad).toBe('A. Tunahan KORKMAZ');
    expect(g.unvan).toBe('Arş. Gör.');
    expect(g.kurum).toBe('Çankırı Karatekin Üniversitesi – Bilgisayar Mühendisliği');
    expect(g.email).toBe('t@karatekin.edu.tr');
    expect(g.isTelefonu).toBe('Dahili: 8383');
  });

  it('kayıttaki unvan alanı önceliklidir; tanınmayan önek ada dokunmaz', () => {
    expect(profildenGenelBilgi({ name: 'Ayşe Kaya', title: 'Doç. Dr.' }).unvan).toBe('Doç. Dr.');
    const g = profildenGenelBilgi({ name: 'Mühendis Ali Veli' });
    expect(g.adSoyad).toBe('Mühendis Ali Veli');
    expect(g.unvan).toBe('');
  });
});

describe('TTO şablon değişkenleri Şablonlar ekranında otomatik eşlenir', () => {
  // Şablonlar ekranının kuralı: {{…}} içi, değişken etiketiyle (parantezli
  // açıklama atılmış hâliyle de) harf/rakam düzeyinde eşleşirse bağlanır.
  const norm = (x) =>
    String(x)
      .replace(/İ/g, 'i')
      .replace(/I/g, 'ı')
      .toLocaleLowerCase('tr-TR')
      .replace(/[^0-9a-zçğıöşü]/g, '');
  const harita = {};
  TTO_SABLON_DEGISKENLERI.forEach((v) => {
    [norm(v.label), norm(v.label.replace(/\(.*?\)/g, ''))].forEach((k) => {
      (harita[k] = harita[k] || new Set()).add(v.id);
    });
  });

  it('iki değişken aynı yer tutucuya düşmez', () => {
    const cakisan = Object.entries(harita).filter(([, v]) => v.size > 1);
    expect(cakisan).toEqual([]);
  });

  it('formdaki kutular için önerilen yer tutucular doğru değişkene gider', () => {
    const bekle = {
      'Nitelik 1': 'nitelik_danismanlik',
      'Nitelik 6': 'nitelik_fikriMulkiyet',
      'Proje 1': 'projeAd',
      'Proje 6': 'projeOrtaklar',
      'Proje 7 Evet': 'ticarilesmeEvet',
      'Proje 8 Hayır': 'patentHayir',
      'Proje 9 Açıklama': 'benzerAciklama',
      'Adı Soyadı': 'adSoyad',
      Ünvan: 'unvan',
      'E-posta': 'email',
      'Başvuru Sahibi': 'basvuruSahibi',
    };
    Object.entries(bekle).forEach(([token, id]) => {
      expect([...(harita[norm(token)] || [])]).toEqual([id]);
    });
  });
});

describe('TTO yöneticisi = TTO birimine kayıtlı akademisyen', () => {
  const bolumler = [
    { id: 'bilgisayar', name: 'Bilgisayar Mühendisliği' },
    { _docId: 'b77', name: 'Teknoloji Transfer Ofisi', kimlikler: ['b77', 'tto-eski'] },
  ];
  it('birim adını tanır', () => {
    expect(ttoBirimAdiMi('TEKNOLOJİ TRANSFER OFİSİ')).toBe(true);
    expect(ttoBirimAdiMi('ÇAKÜ TTO A.Ş.')).toBe(true);
    expect(ttoBirimAdiMi('Otomotiv')).toBe(false);
    expect(ttoBirimAdiMi('Bilgisayar Mühendisliği')).toBe(false);
  });
  it('ana birim, ek birim ve eski kimlik ile üye sayılır', () => {
    expect(ttoBirimUyesiMi([{ departmentId: 'b77' }], bolumler)).toBe(true);
    expect(ttoBirimUyesiMi([{ departmentId: 'tto-eski' }], bolumler)).toBe(true);
    expect(
      ttoBirimUyesiMi([{ departmentId: 'bilgisayar', additionalDepartments: ['b77'] }], bolumler)
    ).toBe(true);
  });
  it('ana birimi TTO olup başka bölümlerde ders veren akademisyen yöneticidir', () => {
    expect(
      ttoBirimUyesiMi(
        [{ departmentId: 'b77', additionalDepartments: ['bilgisayar', 'makine'] }],
        bolumler
      )
    ).toBe(true);
  });
  it('aynı adlı kayıtlardan biri TTO’daysa yeterlidir', () => {
    expect(
      ttoBirimUyesiMi([{ departmentId: 'bilgisayar' }, { departmentId: 'b77' }], bolumler)
    ).toBe(true);
  });
  it('başka birimdeki akademisyen yönetici değildir; eski bayrak yetki vermez', () => {
    expect(ttoBirimUyesiMi([{ departmentId: 'bilgisayar', isTtoYoneticisi: true }], bolumler)).toBe(
      false
    );
    expect(ttoBirimUyesiMi([], bolumler)).toBe(false);
    expect(ttoBirimUyesiMi([{ departmentId: 'b77' }], [])).toBe(false);
  });
  it('kimliksiz eski kayıtta yalnız birim adına bakılır', () => {
    expect(ttoBirimUyesiMi([{ department: 'Teknoloji Transfer Ofisi' }], bolumler)).toBe(true);
    expect(ttoBirimUyesiMi([{ departmentId: 'bilgisayar', department: 'TTO' }], bolumler)).toBe(
      false
    );
  });
});

// ══════════════════════════════════════════════════════════════
// 2. aşama: TTO yöneticisinin inceleme ve kararı
// ══════════════════════════════════════════════════════════════
describe('yoneticiYazmaKarari', () => {
  const SIMDI = new Date('2026-10-01T10:00:00Z');
  const gelen = (ek) => ({
    sahip: 'Dr. Ali Veli',
    durum: 'gonderildi',
    genel: { adSoyad: 'Ali Veli' },
    gecmis: [{ olay: 'gonderildi' }],
    ...ek,
  });
  const k = (mevcut, veri, kimlik = 'Dr. Ayşe Yılmaz', tur = 'update') => {
    const r = yoneticiYazmaKarari({ tur, mevcut, veri, kimlik, simdi: SIMDI });
    return { ...r, veri };
  };

  it('incelemeye alır, başlangıcı damgalar', () => {
    const r = k(gelen(), { durum: 'incelemede' });
    expect(r.izin).toBe(true);
    expect(r.veri.incelemeBaslangic).toBe(SIMDI.toISOString());
    expect(r.veri.gecmis.at(-1)).toMatchObject({ kim: 'Dr. Ayşe Yılmaz', olay: 'incelemede' });
  });

  it('onay talep no ve alan kişi ister; karar sunucuda damgalanır', () => {
    expect(k(gelen(), { durum: 'onaylandi' }).hata).toMatch(/Talep No.*Alan Kişi/);
    const r = k(gelen(), {
      durum: 'onaylandi',
      talepNo: '2026/014',
      alanKisi: 'Ayşe Yılmaz',
      kararVeren: 'sahte',
      onayliBelgeUrl: '/api/files/download/tto/x.pdf',
    });
    expect(r.izin).toBe(true);
    expect(r.veri).toMatchObject({
      karar: 'onaylandi',
      kararVeren: 'Dr. Ayşe Yılmaz',
      kararTarihi: SIMDI.toISOString(),
      talepTarihi: '2026-10-01',
      onayliBelgeUrl: '/api/files/download/tto/x.pdf',
    });
  });

  it('iade ve ret gerekçe ister', () => {
    expect(k(gelen(), { durum: 'iade' }).izin).toBe(false);
    expect(k(gelen(), { durum: 'reddedildi', yoneticiNotu: ' ' }).izin).toBe(false);
    expect(k(gelen(), { durum: 'iade', yoneticiNotu: 'Bütçe eksik' }).izin).toBe(true);
  });

  it('içeriğe dokunamaz', () => {
    const r = k(gelen(), { genel: { adSoyad: 'Başka' } });
    expect(r.izin).toBe(false);
    expect(r.hata).toMatch(/yalnız sahibi/);
  });

  it('taslağa ve iade edilmişe karar veremez; kararı incelemeye geri alabilir', () => {
    expect(k(gelen({ durum: 'taslak' }), { durum: 'incelemede' }).izin).toBe(false);
    expect(
      k(gelen({ durum: 'iade' }), { durum: 'onaylandi', talepNo: '1', alanKisi: 'x' }).izin
    ).toBe(false);
    const r = k(gelen({ durum: 'onaylandi', karar: 'onaylandi' }), { durum: 'incelemede' });
    expect(r.izin).toBe(true);
    expect(r.veri.karar).toBe('');
  });

  it('başkasının talebini silemez; kendi talebinde sahip kuralı geçerli', () => {
    expect(k(gelen(), {}, 'Dr. Ayşe Yılmaz', 'delete').izin).toBe(false);
    expect(k(gelen({ sahip: 'Dr. Ayşe Yılmaz' }), { durum: 'taslak' }).sahipKurali).toBe(true);
    expect(k(null, { genel: {} }, 'Dr. Ayşe Yılmaz', 'add').sahipKurali).toBe(true);
  });
});

describe('ttoBildirimPlani', () => {
  const YON = ['Dr. Ayşe Yılmaz', 'Dr. Mehmet TTO'];
  const kayit = (ek) => ({
    id: 'tt-1',
    sahip: 'Dr. Ali Veli',
    genel: { adSoyad: 'Ali Veli' },
    nitelik: ['laboratuvar'],
    ...ek,
  });
  const plan = (eski, yeni, yapan) =>
    ttoBildirimPlani({ eski: kayit(eski), yeni: kayit(yeni), yapan, yoneticiler: YON });

  it('akademisyen gönderince bütün TTO yöneticilerine gider', () => {
    const p = plan({ durum: 'taslak' }, { durum: 'gonderildi' }, 'Dr. Ali Veli');
    expect(p.map((x) => x.recipientId)).toEqual(YON);
    expect(p[0].body).toMatch(/Ali Veli yeni bir işbirliği talebi gönderdi/);
    expect(p[0].title).toBe('TTO · Laboratuvar – test analiz hizmetleri');
    expect(p[0].meta).toEqual({ talepId: 'tt-1', durum: 'gonderildi' });
  });

  it('iade sonrası yeniden gönderim ve geri çekme de bildirilir', () => {
    expect(plan({ durum: 'iade' }, { durum: 'gonderildi' }, 'Dr. Ali Veli')[0].body).toMatch(
      /yeniden gönderdi/
    );
    expect(plan({ durum: 'gonderildi' }, { durum: 'taslak' }, 'Dr. Ali Veli')[0].body).toMatch(
      /geri çekti/
    );
  });

  it('yöneticinin kendi talebi kendisine bildirilmez', () => {
    const p = ttoBildirimPlani({
      eski: kayit({ sahip: 'Dr. Ayşe Yılmaz', durum: 'taslak' }),
      yeni: kayit({ sahip: 'Dr. Ayşe Yılmaz', durum: 'gonderildi' }),
      yapan: 'Dr. Ayşe Yılmaz',
      yoneticiler: YON,
    });
    expect(p.map((x) => x.recipientId)).toEqual(['Dr. Mehmet TTO']);
  });

  it('yöneticinin kararı talep sahibine gider', () => {
    const on = plan(
      { durum: 'incelemede' },
      { durum: 'onaylandi', talepNo: '2026/1' },
      'Dr. Ayşe Yılmaz'
    );
    expect(on).toHaveLength(1);
    expect(on[0]).toMatchObject({ recipientId: 'Dr. Ali Veli', type: 'basari' });
    expect(on[0].body).toMatch(/2026\/1/);
    const iade = plan(
      { durum: 'gonderildi' },
      { durum: 'iade', yoneticiNotu: 'Bütçe' },
      'Dr. Ayşe Yılmaz'
    );
    expect(iade[0].body).toMatch(/iade edildi: Bütçe/);
  });

  it('durum değişmediyse bildirim yok', () => {
    expect(plan({ durum: 'incelemede' }, { durum: 'incelemede' }, 'Dr. Ayşe Yılmaz')).toEqual([]);
    expect(plan({ durum: 'taslak' }, { durum: 'taslak' }, 'Dr. Ali Veli')).toEqual([]);
  });
});
