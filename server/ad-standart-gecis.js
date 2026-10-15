/**
 * MEVCUT ADLARI STANDART BİÇİME GETİRİR — BÜYÜK HARF AD SOYAD + STANDART UNVAN.
 *
 *   Öğrenci : "Ali Veli"                    → "ALİ VELİ"
 *   Akademisyen / memur:
 *             "Öğrt. Gör. Gökalp Saylam"    → "Öğr. Gör. GÖKALP SAYLAM"
 *
 * ── NEDEN DÜZ BİR "UPDATE" DEĞİL ──
 * Öğrencide kimlik numaradır; ad alanları doğrudan güncellenir.
 * Akademisyen ve memurda ise kimlik AD METNİNİN KENDİSİDİR: şifreler adla
 * anahtarlanır (professor_passwords, department_manager_passwords), bölüm
 * yetkilileri ad dizisidir, ders/program/komisyon atamaları ad metnidir.
 * Yalnız `professors.name` değişseydi kişi giriş yapamaz, dersleri sahipsiz
 * kalırdı. Bu yüzden her ad, server/birlestir-akademisyen.js ile AYNI kuralla
 * (lib/akademisyen-kimlik.js → tam eşleşen her metin VE her anahtar)
 * bütün koleksiyonlarda birlikte çevrilir. audit_logs yeniden yazılmaz.
 *
 * ── GÜVENLİK ──
 *   • Varsayılan KURU ÇALIŞMADIR: hiçbir şey yazılmaz, yalnız rapor verir.
 *     Yazmak için UYGULA=1 verilmelidir.
 *   • Yazmadan önce değişecek bütün belgelerin eski hâli yedeklenir; yedek
 *     yazılamazsa hiçbir şey değiştirilmez.
 *   • Hedef adı zaten BAŞKA bir kayıt taşıyorsa (ya da iki farklı ad aynı
 *     standart ada iniyorsa) o kişi ATLANIR — bu bir birleştirmedir ve
 *     birlestir-akademisyen.js ile, insan kararıyla yapılmalıdır.
 *   • Oturumu açık akademisyen/memur dönüşümden sonra yeniden giriş yapar
 *     (oturum eski adı taşır). Mesai dışında çalıştırın.
 *
 * Kullanım:
 *   node server/ad-standart-gecis.js                         # kuru, hepsi
 *   KAPSAM=ogrenci node server/ad-standart-gecis.js          # yalnız öğrenciler
 *   KAPSAM=akademisyen node server/ad-standart-gecis.js      # akademisyen + memur
 *   UYGULA=1 node server/ad-standart-gecis.js                # yedek al + yaz
 */
const fs = require('fs');
const path = require('path');
const {
  ogrenciAdlariniBuyut,
  ogrenciAdKopyalariniBuyut,
  cevir,
  adHaritasiPlanla,
} = require('./lib/ad-bicim');

const DOKUNULMAZ = new Set(['audit_logs']);

(async () => {
  const { getDbSafe } = require('./config/database');
  const { standartAd } = await import('../lib/akademik-unvan.js');
  const uygula = process.env.UYGULA === '1';
  const kapsam = (process.env.KAPSAM || 'hepsi').toLowerCase();
  const db = await getDbSafe();
  const yedek = { tarih: new Date().toISOString(), ogrenciler: [], atiflar: [] };
  console.log(
    uygula ? '▶ UYGULA: yedek alınıp yazılacak.' : '▶ KURU ÇALIŞMA: hiçbir şey yazılmaz.'
  );

  // ── 1) ÖĞRENCİLER ──
  const ogrenciGuncelle = [];
  if (kapsam === 'hepsi' || kapsam === 'ogrenci') {
    const ogrenciler = await db.collection('students').find({}).toArray();
    ogrenciler.forEach((o) => {
      const y = ogrenciAdlariniBuyut(o);
      if (y === o) return;
      const set = {};
      ['firstName', 'lastName', 'name'].forEach((a) => {
        if (y[a] !== o[a]) set[a] = y[a];
      });
      ogrenciGuncelle.push({ _id: o._id, no: o.studentNumber, oncesi: o, set });
    });
    console.log(`\nÖğrenci: ${ogrenciler.length} kayıt, değişecek: ${ogrenciGuncelle.length}`);
    ogrenciGuncelle
      .slice(0, 10)
      .forEach((g) => console.log(`  • ${g.no}: ${JSON.stringify(g.set)}`));
  }

  // ── 2) AKADEMİSYEN / MEMUR ──
  const harita = new Map();
  const atlanan = [];
  if (kapsam === 'hepsi' || kapsam === 'akademisyen') {
    const profs = await db.collection('professors').find({}).project({ name: 1 }).toArray();
    const plan = adHaritasiPlanla(
      profs.map((p) => p.name),
      standartAd
    );
    plan.harita.forEach((y, e) => harita.set(e, y));
    atlanan.push(...plan.atlanan);
    console.log(
      `\nAkademisyen/memur: ${plan.adSayisi} ad, çevrilecek: ${harita.size}, atlanan: ${atlanan.length}`
    );
    [...harita].slice(0, 20).forEach(([e, y]) => console.log(`  • "${e}" → "${y}"`));
    if (harita.size > 20) console.log(`  … ve ${harita.size - 20} ad daha`);
    atlanan.forEach((a) => console.log('  ⚠ ATLANDI: ' + a));
  }

  // Atıf taşıyan belgeler (bütün koleksiyonlar; audit_logs hariç):
  //   • akademisyen/memur adı atıfları (harita)
  //   • öğrenci adının başka kayıtlardaki kopyaları (studentName, ogrenciAdSoyad…)
  // İkisi aynı belgede olabilir; tek geçişte birlikte uygulanır ki biri
  // ötekinin üstüne eski hâli yazmasın.
  const atiflar = [];
  const ogrenciKopyasi = kapsam === 'hepsi' || kapsam === 'ogrenci';
  if (harita.size || ogrenciKopyasi) {
    const koleksiyonlar = (await db.listCollections().toArray()).map((c) => c.name);
    for (const ad of koleksiyonlar) {
      if (DOKUNULMAZ.has(ad)) continue;
      const dokumanlar = await db.collection(ad).find({}).toArray();
      for (const d of dokumanlar) {
        const { _id, ...govde } = d;
        let sonrasi = govde;
        if (harita.size) {
          const s = cevir(govde, harita);
          if (s.degisti) sonrasi = s.deger;
        }
        if (ad === 'students') {
          // Yalnız adı değişen öğrenci 1. adımda $set ile yazılır; akademisyen
          // atfı da taşıyorsa tek belgede ikisi birlikte uygulanır.
          if (sonrasi !== govde && ogrenciKopyasi) sonrasi = ogrenciAdlariniBuyut(sonrasi);
        } else if (ogrenciKopyasi) {
          sonrasi = ogrenciAdKopyalariniBuyut(sonrasi);
        }
        if (sonrasi !== govde) atiflar.push({ koleksiyon: ad, _id, oncesi: govde, sonrasi });
      }
    }
    const ozet = {};
    atiflar.forEach((a) => (ozet[a.koleksiyon] = (ozet[a.koleksiyon] || 0) + 1));
    console.log(`\nAd atfı / öğrenci adı kopyası taşıyan belge: ${atiflar.length}`);
    Object.entries(ozet).forEach(([k, n]) => console.log(`  • ${k}: ${n}`));
  }

  if (!uygula) {
    console.log(
      '\n[KURU ÇALIŞMA] Yazılmadı. Uygulamak için: UYGULA=1 node server/ad-standart-gecis.js'
    );
    process.exit(0);
  }

  // Hem akademisyen atfı hem ad değişikliği olan öğrenci kaydı tek seferde
  // (replaceOne ile) yazılır; ayrıca $set edilmez ki eski hâl geri gelmesin.
  const tumdenYazilan = new Set(
    atiflar.filter((a) => a.koleksiyon === 'students').map((a) => String(a._id))
  );
  const ogrenciSet = ogrenciGuncelle.filter((g) => !tumdenYazilan.has(String(g._id)));

  // ── 3) YEDEK ──
  yedek.ogrenciler = ogrenciGuncelle.map((g) => ({ _id: g._id, oncesi: g.oncesi }));
  yedek.atiflar = atiflar.map((a) => ({ koleksiyon: a.koleksiyon, _id: a._id, oncesi: a.oncesi }));
  yedek.harita = [...harita];
  const dizin = process.env.YEDEK_DIZIN || path.join(__dirname, '..', 'yedek');
  const dosya = path.join(dizin, `ad-standart-${yedek.tarih.replace(/[:.]/g, '-')}.json`);
  try {
    fs.mkdirSync(dizin, { recursive: true });
    fs.writeFileSync(dosya, JSON.stringify(yedek, null, 2), 'utf8');
    console.log(`\n💾 Yedek: ${dosya}`);
  } catch (e) {
    console.error(`\n✗ YEDEK YAZILAMADI (${e.message}) — hiçbir şey değiştirilmedi.`);
    process.exit(1);
  }

  // ── 4) YAZ ──
  for (const g of ogrenciSet) {
    await db.collection('students').updateOne({ _id: g._id }, { $set: g.set });
  }
  for (const a of atiflar) {
    await db.collection(a.koleksiyon).replaceOne({ _id: a._id }, a.sonrasi);
  }
  console.log(
    `\n✓ Tamamlandı. Öğrenci: ${ogrenciGuncelle.length}, ad atfı çevrilen belge: ${atiflar.length}.`
  );
  console.log('Oturumu açık akademisyen/memurlar yeniden giriş yapmalı.');
  process.exit(0);
})().catch((e) => {
  console.error('Hata:', e);
  process.exit(1);
});
