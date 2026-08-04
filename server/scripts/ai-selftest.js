#!/usr/bin/env node
// ══════════════════════════════════════════════════════════════
// Belge işleme katmanı — uçtan uca kendini sınama.
//
// Gerçek model çağrıları yapar. ANTHROPIC_API_KEY server/.env içinde
// tanımlı olmalıdır. MongoDB gerekmez (yoksa few-shot bloğu boş kalır,
// test yine çalışır — ve zaten önbellek eşiği uyarısını bu ortaya çıkarır).
//
// Çalıştırma:
//   cd server && node scripts/ai-selftest.js
//
// Yaklaşık maliyet: 5 çağrı, toplam ~$0.02.
// Çıkış kodu 0 = tüm testler geçti.
// ══════════════════════════════════════════════════════════════
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const fs = require('fs');
const os = require('os');
const path = require('path');

const cx = require('../services/claude-extract');
const { maliyetHesapla } = require('../services/ai-usage');

const AnthropicPkg = require('@anthropic-ai/sdk');
const Anthropic = AnthropicPkg.Anthropic || AnthropicPkg.default || AnthropicPkg;

let gecen = 0;
let kalan = 0;
let atlanan = 0;
const toplamUsage = {
  input_tokens: 0,
  output_tokens: 0,
  cache_creation_input_tokens: 0,
  cache_read_input_tokens: 0,
};

function ok(baslik, detay) {
  gecen += 1;
  console.log('  \x1b[32m✓\x1b[0m ' + baslik + (detay ? '  — ' + detay : ''));
}
function fail(baslik, detay) {
  kalan += 1;
  console.log('  \x1b[31m✗\x1b[0m ' + baslik + (detay ? '  — ' + detay : ''));
}
function atla(baslik, detay) {
  atlanan += 1;
  console.log('  \x1b[33m−\x1b[0m ' + baslik + (detay ? '  — ' + detay : ''));
}
function bilgi(metin) {
  console.log('    \x1b[90m' + metin + '\x1b[0m');
}

// Kredi/faturalandırma hatası bir KOD hatası değildir; testi erken bitirip
// tek ve net bir mesaj vermek, aynı hatayı beş kez farklı kılıkta
// göstermekten iyidir.
function hesapHatasi(e) {
  const m = String((e && e.message) || e || '');
  if (/credit balance is too low|insufficient_quota|billing/i.test(m)) {
    return 'Hesapta kredi yok. console.anthropic.com → Plans & Billing üzerinden kredi yükleyin.';
  }
  if (/authentication_error|invalid x-api-key/i.test(m)) {
    return 'API anahtarı geçersiz. server/.env içindeki ANTHROPIC_API_KEY değerini kontrol edin.';
  }
  if (/permission_error|not have access/i.test(m)) {
    return 'Bu anahtarın modele erişim izni yok. Konsoldan anahtar izinlerini kontrol edin.';
  }
  return '';
}
function baslik(metin) {
  console.log('\n\x1b[1m' + metin + '\x1b[0m');
}
function usageTopla(u) {
  if (!u) return;
  toplamUsage.input_tokens += u.input_tokens || 0;
  toplamUsage.output_tokens += u.output_tokens || 0;
  toplamUsage.cache_creation_input_tokens += u.cache_creation_input_tokens || 0;
  toplamUsage.cache_read_input_tokens += u.cache_read_input_tokens || 0;
}

// ── Sentetik test belgesi ─────────────────────────────────────
// Gerçek bir transkriptin yapısını taklit eder. Kişisel veri yoktur.
const ORNEK_TRANSKRIPT = `T.C.
ÇANKIRI KARATEKİN ÜNİVERSİTESİ
MÜHENDİSLİK FAKÜLTESİ
ÖĞRENCİ NOT ÇİZELGESİ (TRANSKRİPT)

Öğrenci No      : 202312345
Adı Soyadı      : AYŞE ÇINAR
Fakülte         : Mühendislik Fakültesi
Bölüm / Program : Bilgisayar Mühendisliği
Sınıf           : 2
Kayıt Tarihi    : 15.09.2023

DERSLER
Kod        Ders Adı                        AKTS   Not
BLM101     Programlamaya Giriş               6    AA
BLM103     Ayrık Matematik                   5    BA
MAT101     Matematik I                       6    BB
FIZ101     Fizik I                           5    CB
TUR101     Türk Dili I                       2    AA

Genel Not Ortalaması (AGNO) : 78,45 / 100
Tamamlanan AKTS             : 24

YERLEŞME BİLGİLERİ
YKS Yerleşme Yılı  : 2023
Yerleştiği Puan Türü : SAY
YKS Yerleştirme Puanı : 412,33812

Bu belge elektronik ortamda üretilmiştir.
`;

const ALANLAR = [
  { id: 'adSoyad', label: 'Adı Soyadı', format: 'name' },
  { id: 'aktifUniversite', label: 'Aktif üniversite' },
  { id: 'aktifFakulte', label: 'Aktif fakülte' },
  { id: 'aktifBolum', label: 'Aktif bölüm / program' },
  { id: 'aktifSinif', label: 'Sınıfı' },
  { id: 'notOrtalamasi', label: 'Not ortalaması (AGNO)', hint: '100 üzerinden' },
  { id: 'yksYerlesmeYili', label: 'YKS yerleşme yılı' },
  { id: 'yksPuanTuru', label: 'Yerleştiği puan türü' },
  { id: 'yksPuani', label: 'YKS yerleştirme puanı' },
];

// Belgede gerçekten yazan doğru değerler.
const BEKLENEN = {
  adSoyad: 'ayşe çınar',
  aktifBolum: 'bilgisayar mühendisliği',
  aktifSinif: '2',
  notOrtalamasi: '78.45',
  yksYerlesmeYili: '2023',
  yksPuanTuru: 'say',
  yksPuani: '412.33812',
};

async function main() {
  console.log('\n\x1b[1m═══ Belge İşleme Kendini Sınama ═══\x1b[0m');
  console.log('Model: ' + cx.MODEL);

  // ── 1. Yapılandırma ve erişim ──
  baslik('1) Yapılandırma');
  if (!cx.yapilandirildiMi()) {
    fail('ANTHROPIC_API_KEY', 'tanımlı değil — server/.env dosyasına ekleyin');
    return sonuc();
  }
  ok('ANTHROPIC_API_KEY tanımlı');

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  try {
    const m = await client.models.retrieve(cx.MODEL);
    ok('Model erişilebilir', m.display_name + ' · bağlam ' + m.max_input_tokens.toLocaleString());
    if (m.max_input_tokens < 190000) {
      bilgi('UYARI: beklenen bağlam 200K, gelen ' + m.max_input_tokens);
    }
  } catch (e) {
    fail('Model erişimi', e.message);
    return sonuc();
  }

  // ── 2. Önbellek eşiği ──
  baslik('2) Prompt önbelleği eşiği (' + cx.CACHE_MIN_TOKENS + ' token)');
  let onekToken = 0;
  try {
    const sistem = await cx.sistemBloklari('yataygecis', 'kurumici');
    const bos = await client.messages.countTokens({
      model: cx.MODEL,
      messages: [{ role: 'user', content: 'x' }],
    });
    const dolu = await client.messages.countTokens({
      model: cx.MODEL,
      system: sistem,
      messages: [{ role: 'user', content: 'x' }],
    });
    onekToken = dolu.input_tokens - bos.input_tokens;
    if (onekToken >= cx.CACHE_MIN_TOKENS) {
      ok('Sabit önek önbelleğe alınabilir', onekToken + ' token');
    } else {
      // HATA DEĞİL: doğruluğu etkilemez, yalnız girdi maliyeti biraz yüksek.
      atla('Prompt önbelleği devre dışı', onekToken + ' / ' + cx.CACHE_MIN_TOKENS + ' token');
      bilgi('Doğruluğa etkisi YOK; yalnız girdi maliyeti çağrı başına ~$0.0008 fazla.');
      bilgi('Eşiği aşmak için prompt şişirmeye genelde DEĞMEZ: 4096 token önek yazımı');
      bilgi('~$0.005, kazanç çağrı başına ~$0.0004 — 5 dakikalık pencerede 12+ çağrı');
      bilgi('gerekir. Yoğun dönem dışında bu eşik aşılmaz ve şişirme net zarardır.');
      bilgi('ai_ornekler örneklerini yalnız DOĞRULUK yetersizse ekleyin (önbellek yan etki).');
    }
  } catch (e) {
    const hesap = hesapHatasi(e);
    if (hesap) {
      fail('Model çağrısı yapılamıyor', hesap);
      bilgi('Anahtar ve model erişimi doğrulandı; sorun kodda değil, hesapta.');
      bilgi('Kredi yüklendikten sonra bu testi tekrar çalıştırın.');
      return sonuc();
    }
    fail('Token sayımı', e.message);
  }

  // ── 3. Çıkarım ──
  baslik('3) Alan çıkarımı');
  const tmp = path.join(os.tmpdir(), 'ai-selftest-transkript.txt');
  fs.writeFileSync(tmp, ORNEK_TRANSKRIPT, 'utf8');

  let cikarim = null;
  try {
    cikarim = await cx.alanCikar({
      module: 'yataygecis',
      docType: 'kurumici',
      fields: ALANLAR,
      dosyalar: [{ path: tmp, name: 'transkript.txt' }],
      baglam: { studentNo: 'SELFTEST', actorId: 'selftest' },
    });
    usageTopla(cikarim.usage);
  } catch (e) {
    const hesap = hesapHatasi(e);
    if (hesap) {
      fail('Model çağrısı yapılamıyor', hesap);
      return sonuc();
    }
    fail('Çıkarım çağrısı', e.message);
  }

  if (cikarim && cikarim.ok) {
    ok('Çıkarım tamamlandı');
    let dogru = 0;
    Object.keys(BEKLENEN).forEach((id) => {
      const c = cikarim.data[id] || {};
      const esit = cx.kiyasNormalize(c.deger) === cx.kiyasNormalize(BEKLENEN[id]);
      if (esit) dogru += 1;
      console.log(
        '      ' +
          (esit ? '\x1b[32m✓\x1b[0m' : '\x1b[31m✗\x1b[0m') +
          ' ' +
          id.padEnd(18) +
          JSON.stringify(c.deger || '') +
          (esit ? '' : '   (beklenen: ' + BEKLENEN[id] + ')') +
          '  [güven ' +
          (c.guven == null ? '?' : c.guven) +
          ']'
      );
    });
    const toplam = Object.keys(BEKLENEN).length;
    if (dogru === toplam) ok('Tüm alanlar doğru okundu', dogru + '/' + toplam);
    else fail('Bazı alanlar yanlış', dogru + '/' + toplam + ' doğru');
  } else if (cikarim) {
    const hesap = (cikarim.hatalar || []).map((h) => hesapHatasi(h && h.message)).find(Boolean);
    if (hesap) {
      fail('Model çağrısı yapılamıyor', hesap);
      bilgi('Anahtar ve model erişimi doğrulandı; sorun kodda değil, hesapta.');
      bilgi('Kredi yüklendikten sonra bu testi tekrar çalıştırın.');
      return sonuc();
    }
    fail('Çıkarım', cikarim.reason + ' ' + JSON.stringify(cikarim.hatalar || []));
  }

  // ── 4. Önbellek gerçekten okunuyor mu ──
  baslik('4) İkinci çağrıda önbellek okuması');
  try {
    const ikinci = await cx.alanCikar({
      module: 'yataygecis',
      docType: 'kurumici',
      fields: ALANLAR,
      dosyalar: [{ path: tmp, name: 'transkript.txt' }],
      baglam: { studentNo: 'SELFTEST', actorId: 'selftest' },
    });
    usageTopla(ikinci.usage);
    const okunan = (ikinci.usage && ikinci.usage.cache_read_input_tokens) || 0;
    if (okunan > 0) {
      ok('Önbellek okundu', okunan + ' token (~%90 daha ucuz)');
    } else if (!onekToken) {
      // Adım 2 ölçemediyse burada bir şey iddia edemeyiz.
      atla('Önbellek okuması', 'değerlendirilemedi — adım 2 tamamlanamadı');
    } else if (onekToken < cx.CACHE_MIN_TOKENS) {
      atla('Önbellek okunmadı', 'beklenen davranış — önek eşiğin altında (adım 2)');
    } else {
      fail('Önbellek okunmadı', 'önek eşiği aşıyor ama okuma yok — önek kararlılığını denetleyin');
    }
  } catch (e) {
    fail('İkinci çağrı', e.message);
  }

  // ── 5. Kıyaslama ──
  baslik('5) Kıyaslama');
  // Üç senaryo tek çağrıda: biçim farkı (aynı sayılmalı), gerçek fark, boş alan.
  const formDegerleri = {
    adSoyad: 'Ayşe Çınar',
    aktifUniversite: 'Çankırı Karatekin Üniversitesi',
    aktifFakulte: 'Mühendislik Fak.', // kısaltma → AYNI olmalı
    aktifBolum: 'Bilgisayar Mühendisliği',
    aktifSinif: '2',
    notOrtalamasi: '78.45', // nokta/virgül farkı → AYNI olmalı
    yksYerlesmeYili: '2023',
    yksPuanTuru: 'EA', // belgede SAY → FARKLI olmalı
    yksPuani: '', // boş → FORMDA_BOS olmalı
  };
  const beklenenDurum = {
    aktifFakulte: 'ayni',
    notOrtalamasi: 'ayni',
    yksPuanTuru: 'farkli',
    yksPuani: 'formda_bos',
  };

  try {
    const kiyas = await cx.karsilastir({
      module: 'yataygecis',
      docType: 'kurumici',
      fields: ALANLAR,
      mevcutDegerler: formDegerleri,
      dosyalar: [{ path: tmp, name: 'transkript.txt' }],
      baglam: { studentNo: 'SELFTEST', actorId: 'selftest' },
    });
    usageTopla(kiyas.usage);

    if (!kiyas.ok) {
      fail('Kıyaslama', kiyas.reason);
    } else {
      ok('Kıyaslama tamamlandı', kiyas.farkliSayisi + ' uyuşmazlık');
      let dogru = 0;
      Object.keys(beklenenDurum).forEach((id) => {
        const c = kiyas.data[id] || {};
        const esit = c.durum === beklenenDurum[id];
        if (esit) dogru += 1;
        console.log(
          '      ' +
            (esit ? '\x1b[32m✓\x1b[0m' : '\x1b[31m✗\x1b[0m') +
            ' ' +
            id.padEnd(18) +
            'form=' +
            JSON.stringify(c.formDeger || '') +
            ' belge=' +
            JSON.stringify(c.belgeDeger || '') +
            ' → ' +
            c.durum +
            (esit ? '' : '   (beklenen: ' + beklenenDurum[id] + ')')
        );
      });
      const toplam = Object.keys(beklenenDurum).length;
      if (dogru === toplam) ok('Kıyaslama kararları doğru', dogru + '/' + toplam);
      else fail('Bazı kıyas kararları yanlış', dogru + '/' + toplam + ' doğru');

      if (kiyas.farkliSayisi === 1) ok('Sahte uyuşmazlık yok', 'yalnız gerçek fark işaretlendi');
      else fail('Uyuşmazlık sayısı beklenmedik', 'beklenen 1, gelen ' + kiyas.farkliSayisi);
    }
  } catch (e) {
    fail('Kıyaslama çağrısı', e.message);
  }

  try {
    fs.unlinkSync(tmp);
  } catch (_) {
    /* yok say */
  }
  return sonuc();
}

function sonuc() {
  baslik('Maliyet');
  const usd = maliyetHesapla(toplamUsage, { model: cx.MODEL });
  console.log(
    '  girdi ' +
      toplamUsage.input_tokens +
      ' · çıktı ' +
      toplamUsage.output_tokens +
      ' · önbellek yaz ' +
      toplamUsage.cache_creation_input_tokens +
      ' · önbellek oku ' +
      toplamUsage.cache_read_input_tokens
  );
  console.log('  Bu testin maliyeti: \x1b[1m$' + usd.toFixed(4) + '\x1b[0m');

  baslik(
    kalan === 0 ? '\x1b[32mTÜM TESTLER GEÇTİ\x1b[0m' : '\x1b[31m' + kalan + ' TEST BAŞARISIZ\x1b[0m'
  );
  console.log(
    '  ' +
      gecen +
      ' geçti, ' +
      kalan +
      ' kaldı' +
      (atlanan ? ', ' + atlanan + ' atlandı' : '') +
      '\n'
  );
  process.exit(kalan === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error('\n\x1b[31mBeklenmeyen hata:\x1b[0m', e && e.message);
  process.exit(1);
});
