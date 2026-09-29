/**
 * TTO OTOMASYONU (FastAPI + SQLite) VERİSİNİ TTO MODÜLÜNE AKTARIR.
 *
 * Danışmanlık iş kayıtları ve akademisyen ödemeleri eskiden ayrı bir
 * uygulamada (TTO Otomasyonu, `backend/data/tto.db`) tutuluyordu. Bu betik o
 * dosyayı okur ve TTO modülünün yönetici tarafındaki koleksiyonlara yazar:
 *
 *   firms         → tto_firmalar
 *   academicians  → tto_akademisyenler
 *   settings      → tto_oranlar          (doc id = yıl; oranlar yüzdeye çevrilir)
 *   work_records  → tto_is_kayitlari     (tutarlar kuruşa çevrilir)
 *   projects      → tto_projeler
 *
 * ── TEKRAR ÇALIŞTIRILABİLİR ──
 * Aktarılan her kayıt `aktarim: { kaynak, eskiId }` taşır; ikinci çalıştırmada
 * aynı kayıt yeniden yazılmaz. Adı zaten kayıtlı firma/akademisyen (elle
 * açılmış olabilir) yeniden açılmaz, mevcut kayda bağlanır. Aynı yıl ve sıra
 * numarasıyla elle girilmiş bir iş kaydı varsa eski kayıt ATLANIR ve raporda
 * gösterilir — kimse sessizce üzerine yazılmaz.
 *
 * ── TUTARLAR YENİDEN HESAPLANMAZ ──
 * Eski kayıtlar elle düzeltilmiş olabilir; defterdeki değer neyse o taşınır.
 *
 * Kullanım (önce deneme, sonra gerçek yazma):
 *   node server/tto-odeme-aktar.js /yol/tto.db
 *   UYGULA=1 node server/tto-odeme-aktar.js /yol/tto.db
 *
 * Node 22.13+ gerekir (yerleşik `node:sqlite`; ek bağımlılık yok).
 */
const path = require('path');
const { connect, disconnect } = require('./config/database');

const KAYNAK = 'tto-otomasyon';
const UYGULA = process.env.UYGULA === '1';

function sqliteAc(dosya) {
  if (!require('fs').existsSync(dosya)) {
    throw new Error(
      'Dosya bulunamadı: ' +
        dosya +
        '\nTTO Otomasyonu veritabanının (backend/data/tto.db) bu sunucudaki gerçek yolunu verin.'
    );
  }
  let DatabaseSync;
  try {
    ({ DatabaseSync } = require('node:sqlite'));
  } catch (_) {
    throw new Error('Bu betik Node 22.13+ ister (node:sqlite bulunamadı).');
  }
  return new DatabaseSync(dosya, { readOnly: true });
}

// Tablo yoksa ya da eski şemada sütun eksikse boş/undefined döner: yedeklerin
// bir kısmı "modül 2" sütunlarından (vergi no, tahsilat…) önce alınmıştır.
function satirlar(sq, tablo) {
  const var_ = sq
    .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name = ?")
    .get(tablo);
  return var_ ? sq.prepare('SELECT * FROM "' + tablo + '"').all() : [];
}

const metin = (v) => String(v == null ? '' : v).trim();

function tarihMetni(v) {
  const s = metin(v);
  return /^\d{4}-\d{2}-\d{2}/.test(s) ? s.slice(0, 10) : '';
}

function zaman(v) {
  const s = metin(v);
  if (!s) return new Date();
  const d = new Date(s.replace(' ', 'T') + (/[zZ]|[+-]\d\d:?\d\d$/.test(s) ? '' : 'Z'));
  return isNaN(d.getTime()) ? new Date() : d;
}

async function main() {
  const dosya = process.argv[2];
  if (!dosya) {
    console.error('Kullanım: node server/tto-odeme-aktar.js /yol/tto.db');
    process.exit(1);
  }
  const L = await import('../lib/tto-odeme.js');
  const { trAnahtar } = await import('../lib/tr-metin.js');

  // Tutar: SQLite NUMERIC sütunu sayı ya da metin dönebilir.
  const kurus = (v) => {
    if (v == null || v === '') return 0;
    const k = typeof v === 'number' ? Math.round(v * 100) : L.tlKurusa(String(v));
    return k == null ? 0 : k;
  };
  // Oran: 0.15 → 15 (yüzde, iki ondalık)
  const yuzde = (v) => Math.round(Number(v) * 10000) / 100;

  const sq = sqliteAc(path.resolve(dosya));
  const eski = {
    firmalar: satirlar(sq, 'firms'),
    akademisyenler: satirlar(sq, 'academicians'),
    projeler: satirlar(sq, 'projects'),
    oranlar: satirlar(sq, 'settings'),
    kayitlar: satirlar(sq, 'work_records'),
  };
  console.log(
    `Kaynak: ${eski.firmalar.length} firma, ${eski.akademisyenler.length} akademisyen, ` +
      `${eski.oranlar.length} yıl oranı, ${eski.kayitlar.length} iş kaydı, ${eski.projeler.length} proje`
  );

  const db = await connect();
  const rapor = { eklendi: {}, eslesti: {}, atlandi: [], uyari: [] };
  const say = (tur, alan) => (rapor[tur][alan] = (rapor[tur][alan] || 0) + 1);
  const kimlik = (d) => d._docId || d._id.toString();

  // ── Firma / akademisyen: önce aktarım izi, sonra ad eşleşmesi ──
  async function kisiAktar(koleksiyon, liste, donustur, etiket, denetle) {
    const col = db.collection(koleksiyon);
    const mevcut = await col.find({}).toArray();
    const izden = new Map();
    const addan = new Map();
    mevcut.forEach((d) => {
      if (d.aktarim && d.aktarim.kaynak === KAYNAK) izden.set(String(d.aktarim.eskiId), kimlik(d));
      addan.set(trAnahtar(d.ad), kimlik(d));
    });
    const harita = new Map();
    for (const s of liste) {
      const veri = donustur(s);
      const iz = izden.get(String(s.id));
      const ad = addan.get(trAnahtar(veri.ad));
      if (iz || ad) {
        harita.set(s.id, iz || ad);
        say('eslesti', etiket);
        continue;
      }
      const uyari = denetle ? denetle(veri) : '';
      if (uyari) rapor.uyari.push(uyari);
      let id = 'deneme-' + etiket + '-' + s.id;
      if (UYGULA) {
        const r = await col.insertOne({
          ...veri,
          aktarim: { kaynak: KAYNAK, eskiId: s.id },
          createdAt: zaman(s.created_at),
          updatedAt: new Date(),
        });
        id = r.insertedId.toString();
      }
      addan.set(trAnahtar(veri.ad), id);
      harita.set(s.id, id);
      say('eklendi', etiket);
    }
    return harita;
  }

  const firmaHaritasi = await kisiAktar(
    'tto_firmalar',
    eski.firmalar,
    (f) => ({
      ad: metin(f.name),
      vergiNo: metin(f.tax_no),
      vergiDairesi: metin(f.tax_office),
      eposta: metin(f.contact_email),
    }),
    'firma'
  );
  const akademisyenHaritasi = await kisiAktar(
    'tto_akademisyenler',
    eski.akademisyenler,
    (a) => ({
      ad: metin(a.full_name),
      iban: L.ibanSadele(a.iban),
      bolum: metin(a.department),
      fakulte: metin(a.faculty),
    }),
    'akademisyen',
    (v) =>
      v.iban && !L.ibanGecerliMi(v.iban)
        ? `Akademisyen "${v.ad}": IBAN doğrulanamadı (${v.iban}); düzenlerken düzeltin.`
        : ''
  );

  const projeHaritasi = await kisiAktar(
    'tto_projeler',
    eski.projeler,
    (p) => ({ ad: metin(p.name), aciklama: metin(p.description) }),
    'proje'
  );

  // ── Oranlar ──
  const oranCol = db.collection('tto_oranlar');
  for (const o of eski.oranlar) {
    const yil = Number(o.valid_year);
    const var_ = await oranCol.findOne({ _docId: String(yil) });
    if (var_) {
      say('eslesti', 'oran');
      continue;
    }
    const veri = {
      yil,
      kdv: yuzde(o.vat_rate),
      tevkifat: yuzde(o.invoice_withholding_rate),
      ttoPayi: yuzde(o.tto_share_rate),
      stopaj: yuzde(o.withholding_rate),
    };
    const h = L.oranHatalari(veri);
    if (h.length) {
      rapor.atlandi.push(`${yil} oranı: ${h.join(' ')}`);
      continue;
    }
    if (UYGULA) {
      await oranCol.insertOne({
        ...veri,
        _docId: String(yil),
        aktarim: { kaynak: KAYNAK, eskiId: o.id },
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }
    say('eklendi', 'oran');
  }

  // ── İş kayıtları ──
  const kayitCol = db.collection('tto_is_kayitlari');
  const mevcutKayitlar = await kayitCol.find({}).toArray();
  const aktarilmis = new Set(
    mevcutKayitlar
      .filter((k) => k.aktarim && k.aktarim.kaynak === KAYNAK)
      .map((k) => String(k.aktarim.eskiId))
  );
  const doluSira = new Set(mevcutKayitlar.map((k) => k.yil + '/' + k.siraNo));

  for (const w of eski.kayitlar) {
    const etiket = `${w.year}/${w.sira_no}`;
    if (aktarilmis.has(String(w.id))) {
      say('eslesti', 'is kaydi');
      continue;
    }
    if (doluSira.has(etiket)) {
      rapor.atlandi.push(
        `İş kaydı ${etiket}: bu yıl/sıra numarasıyla elle girilmiş bir kayıt var.`
      );
      continue;
    }
    const firmaId = firmaHaritasi.get(w.firm_id);
    const akademisyenId = akademisyenHaritasi.get(w.academician_id);
    if (!firmaId || !akademisyenId) {
      rapor.atlandi.push(`İş kaydı ${etiket}: firması ya da akademisyeni kaynakta bulunamadı.`);
      continue;
    }
    const tahsilat = metin(w.firm_collection_status) === 'Tahsil Edildi' ? 'edildi' : 'edilmedi';
    const odeme = metin(w.payment_status) === 'Ödendi' ? 'odendi' : 'odenmedi';
    const fatura = kurus(w.invoice_price);
    const ttoPayi =
      w.tto_share_amount == null
        ? fatura - kurus(w.amount_after_tto_share)
        : kurus(w.tto_share_amount);
    const veri = {
      yil: Number(w.year),
      siraNo: Number(w.sira_no),
      firmaId,
      akademisyenId,
      projeId: w.project_id ? projeHaritasi.get(w.project_id) || '' : '',
      yapilanIs: metin(w.work_done),
      talepTarihi: tarihMetni(w.request_date),
      faturaKurus: fatura,
      kdvKurus: kurus(w.invoice_vat),
      tevkifatKurus: kurus(w.withholding_tax),
      ttoPayiKurus: ttoPayi,
      ttoSonrasiKurus: kurus(w.amount_after_tto_share),
      stopajSonrasiKurus: kurus(w.amount_after_withholding),
      digerFonKurus: kurus(w.other_funds),
      manuelDuzeltme: !!w.is_manually_adjusted,
      tahsilat,
      odeme,
      odemeTarihi: tarihMetni(w.paid_date),
      ibanAnlik: L.ibanSadele(w.iban_snapshot),
      notlar: metin(w.notes),
    };
    // Eski defterdeki değer taşınır; yeni kurala uymayan alan yalnız raporlanır
    // (ör. "Ödendi" olup ödeme tarihi girilmemiş kayıt). Kayıt düzenlenirken
    // form eksiği gösterir.
    const h = L.isKaydiHatalari(veri);
    if (h.length) rapor.uyari.push(`İş kaydı ${etiket}: ${h.join(' ')}`);
    if (UYGULA) {
      await kayitCol.insertOne({
        ...veri,
        aktarim: { kaynak: KAYNAK, eskiId: w.id },
        createdAt: zaman(w.created_at),
        updatedAt: zaman(w.updated_at),
      });
    }
    doluSira.add(etiket);
    say('eklendi', 'is kaydi');
  }

  console.log('');
  console.log(
    UYGULA ? '── YAZILDI ──' : '── DENEME (hiçbir şey yazılmadı; yazmak için UYGULA=1) ──'
  );
  console.log('Eklenen      :', JSON.stringify(rapor.eklendi));
  console.log('Zaten vardı  :', JSON.stringify(rapor.eslesti));
  if (rapor.atlandi.length) {
    console.log('Atlanan (' + rapor.atlandi.length + '):');
    rapor.atlandi.forEach((s) => console.log('  - ' + s));
  }
  if (rapor.uyari.length) {
    console.log('Uyarı (' + rapor.uyari.length + ') — kayıtlar aktarıldı, gözden geçirin:');
    rapor.uyari.forEach((s) => console.log('  - ' + s));
  }
  await disconnect();
}

main().catch(async (e) => {
  console.error('Aktarım başarısız:', e.message);
  try {
    await disconnect();
  } catch (_) {
    /* yok say */
  }
  process.exit(1);
});
