// ══════════════════════════════════════════════════════════════
// MEZUNİYET — KURAL DEĞİŞİNCE GEÇMİŞ BAŞVURULARIN TAZELENMESİ
//
// Başvurularda transkriptin ham satırları durur; ekran durumu her açılışta
// GÜNCEL kurallarla yeniden hesaplar. Bu yüzden FF1/FF2/FF3 düzeltmesi
// (lib/mezuniyet.js → olcekOnar) açılan her başvuruya zaten yansır. Bayat
// kalanlar ve burada düzeltilenler:
//   1. Bölüm not ölçeği kaydı: geçer bayrağı olmayan satırlar ve eksik ek
//      harfler kayda kalıcı yazılır (okuma anında onarılan hâliyle aynı).
//   2. Başvurunun `ozet` alanı (listedeki AKTS / sarı satır sayısı, dilekçede
//      AKTS yedeği) güncel hesapla yeniden yazılır.
// Kararlara (danışmanın silinecek ders işaretleri, onay) DOKUNULMAZ: karar
// verilmiş ve ek harfli (FF1…) dersi olan başvurular danışmanın yeniden
// bakması için listelenir.
// ══════════════════════════════════════════════════════════════
const metin = (v) => String(v == null ? '' : v).trim();
const esit = (a, b) =>
  JSON.stringify(a == null ? null : a) === JSON.stringify(b == null ? null : b);
const KARAR_VERILMIS = ['dilekce', 'imzali', 'memurda', 'tamamlandi'];

const kimlikOf = (d) => metin(d && (d._docId || d.id || d.departmentId));

async function mezuniyetYenidenHesapla(db, { uygula = false, yedek = () => {} } = {}) {
  const M = await import('../../lib/mezuniyet.js');
  const H = await import('../../lib/mezuniyet-hesap.js');
  const BK = require('./bolum-kimlik');
  const rapor = {
    kuralOnarildi: [],
    basvuruSayisi: 0,
    ozetGuncellendi: 0,
    hesaplanamadi: [],
    ekHarfliBasvuru: 0,
    incelenmeli: [],
  };

  // ── 1) Bölüm kuralları ──
  const kurallar = await db.collection('mezuniyet_kurallari').find({}).toArray();
  for (const k of kurallar) {
    if (!Array.isArray(k.notOlcegi) || k.notOlcegi.length === 0) continue;
    const n = M.mezKuralNormalize(k);
    const yeni = { notOlcegi: n.notOlcegi, ekHarfler: n.ekHarfler };
    if (esit(k.notOlcegi, yeni.notOlcegi) && esit(k.ekHarfler, yeni.ekHarfler)) continue;
    rapor.kuralOnarildi.push(kimlikOf(k));
    if (uygula) {
      yedek('mezuniyet_kurallari', k);
      await db.collection('mezuniyet_kurallari').updateOne({ _id: k._id }, { $set: yeni });
    }
    Object.assign(k, yeni);
  }

  // ── 2) Başvurular ──
  const bolumler = await db.collection('departments').find({}).toArray();
  const harita = BK.bolumKimlikHaritasi(bolumler);
  const dersler = await db.collection('sinav_dersler').find({}).toArray();
  const bolumKimlikleri = (id) => {
    const b = bolumler.find((d) => BK.kimlikler(d).some((x) => BK.ayniBolum(x, id, harita)));
    return new Set([id].concat(b ? BK.kimlikler(b).map(String) : []).filter(Boolean));
  };

  const basvurular = await db.collection('mezuniyet_basvurulari').find({}).toArray();
  rapor.basvuruSayisi = basvurular.length;
  for (const b of basvurular) {
    const no = metin(b.ogrenciNo || b._docId);
    const set = bolumKimlikleri(metin(b.departmentId));
    const kural = kurallar.find((k) => set.has(kimlikOf(k))) || null;
    const mufredat = dersler.filter(
      (c) => (c.seviye || 'lisans') === 'lisans' && set.has(String(c.departmentId || ''))
    );
    let sonuc = null;
    try {
      sonuc = H.basvuruHesapla(b, mufredat, kural);
    } catch (e) {
      rapor.hesaplanamadi.push({ no, hata: e.message });
      continue;
    }
    if (!sonuc) continue;
    const ozet = H.basvuruOzeti(sonuc);
    if (!esit(b.ozet, ozet)) {
      rapor.ozetGuncellendi += 1;
      if (uygula) {
        yedek('mezuniyet_basvurulari', b);
        await db.collection('mezuniyet_basvurulari').updateOne({ _id: b._id }, { $set: { ozet } });
      }
    }
    // Ek harfli (FF1…; aralıksız, başka harf sayılan) ders var mı?
    const n = M.mezKuralNormalize(kural);
    const ekler = new Set(
      (n.ekHarfler || []).filter((r) => metin(r.sayilanHarf)).map((r) => metin(r.harf))
    );
    const ekliDersler = (b.dersler || []).filter((d) =>
      ekler.has(
        metin(d.not)
          .toLocaleUpperCase('tr-TR')
          .replace(/[\s.\-_]/g, '')
      )
    );
    if (ekliDersler.length) {
      rapor.ekHarfliBasvuru += 1;
      if (KARAR_VERILMIS.indexOf(metin(b.durum)) >= 0) {
        rapor.incelenmeli.push({
          no,
          ad: metin(b.ogrenciAd),
          durum: metin(b.durum),
          danisman: metin(b.danisman),
          dersler: ekliDersler.map((d) => [metin(d.kod), metin(d.not)].join(' ')),
        });
      }
    }
  }
  return rapor;
}

module.exports = { mezuniyetYenidenHesapla };
