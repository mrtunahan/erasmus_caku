// ══════════════════════════════════════════════════════════════
// TTO TALEPLERİ → TTO OTOMASYONU (ödeme defteri) OTOMATİK EŞLEME
//
// Offline Asistan'daki işbirliği talebinde girilen bilgiler, TTO
// Otomasyonu'na elle yeniden yazılmasın diye buradan aktarılır:
//
//   • Akademisyen  — talep TTO tarafından onaylandığında: ad (talep sahibi),
//                    bölüm ve fakülte (personel kaydından), IBAN (akademisyenin
//                    proformayla girdiği ödeme bilgilerinden).
//   • Firma        — TTO proformayı gönderirken girdiği firma bilgilerinden.
//   • İş kaydı     — yönetim kurulu kararı onaylandığında: firma, akademisyen,
//                    proforma tutarı (fatura tutarı), talep tarihi, IBAN.
//                    Bir talepten yalnız bir iş kaydı oluşur (talepId).
//
// Her talebin her parçası (akademisyen, IBAN, firma, iş kaydı) BİR KEZ
// aktarılır; yapılanlar `tto_ayarlar/esleme` kaydında tutulur. Böylece
// yöneticinin otomasyonda sildiği kayıt bir sonraki açılışta geri gelmez.
//
// Var olan kayıt EZİLMEZ: yalnız boş alanlar doldurulur. Eşleme ad
// üzerinden yapılır (Türkçe harf ve unvan duyarsız: "Prof. Dr. Ali VELİ" =
// "Ali Veli"). Bu dosya yalnız PLANI çıkarır; yazmayı çağıran yapar ve her
// yazma sunucuda lib/tto-odeme.js kurallarıyla yeniden denetlenir.
// ══════════════════════════════════════════════════════════════
import { trAnahtar } from './tr-metin.js';
import { unvaniAyir } from './akademik-unvan.js';
import { ibanGecerliMi, ibanSadele } from './tto-odeme.js';
import { talepBasligi, firmaBilgisiTemizle } from './tto-talep.js';

const metin = (v) => String(v == null ? '' : v).trim();

/** Kişi adı anahtarı: unvan atılır, Türkçe harfler katlanır. */
export function kisiAnahtari(ad) {
  const a = metin(ad);
  return trAnahtar(unvaniAyir(a).ad || a);
}

// Akademisyen ve firma bu durumlardan itibaren aktarılır (TTO onayı sonrası).
export const TTO_ESLENEN_DURUMLAR = [
  'onaylandi',
  'proforma_gonderildi',
  'proforma_dondu',
  'genel_sekreterlikte',
  'gorevlendirildi',
  'tamamlandi',
];
// İş kaydı yönetim kurulu kararı onaylandıktan sonra açılır.
export const TTO_IS_KAYDI_DURUMLARI = ['gorevlendirildi', 'tamamlandi'];

function yilBul(t) {
  for (const a of [t.yonetimKarariTarihi, t.talepTarihi, t.gonderimTarihi]) {
    const m = /^(\d{4})-/.exec(metin(a));
    if (m) return Number(m[1]);
  }
  return null;
}

/**
 * @param {object} p
 * @param {Array} p.talepler        tto_talepleri
 * @param {Array} p.akademisyenler  tto_akademisyenler ({id, ad, iban, bolum, fakulte})
 * @param {Array} p.firmalar        tto_firmalar ({id, ad, vergiNo, vergiDairesi, eposta})
 * @param {Array} p.kayitlar        tto_is_kayitlari ({talepId})
 * @param {Array} [p.personel]      [{ad, bolum, fakulte}] Offline Asistan personel kaydı
 * @param {Array} [p.oranYillari]   oranı tanımlı yıllar
 * @param {object} [p.yapilanlar]   { talepId: { akademisyen, iban, firma, kayit } } önceki aktarımlar
 * @returns {{akademisyenEkle, akademisyenGuncelle, firmaEkle, firmaGuncelle, kayitEkle, atlanan,
 *            isaretler}}  isaretler: bu aktarımla yapılmış sayılacak parçalar
 *   kayitEkle öğeleri kimlik yerine `akademisyenAnahtari` / `firmaAnahtari`
 *   taşır: kişiler yazıldıktan sonra çağıran kimliğe çevirir.
 */
export function talepEslemePlani(p) {
  const talepler = (p && p.talepler) || [];
  const personel = new Map();
  ((p && p.personel) || []).forEach((x) => {
    const k = kisiAnahtari(x && x.ad);
    if (k && !personel.has(k)) personel.set(k, x);
  });
  const oranYillari = new Set(((p && p.oranYillari) || []).map(Number));
  const kayitliTalepler = new Set(
    ((p && p.kayitlar) || []).map((k) => metin(k && k.talepId)).filter(Boolean)
  );

  const plan = {
    akademisyenEkle: [],
    akademisyenGuncelle: [],
    firmaEkle: [],
    firmaGuncelle: [],
    kayitEkle: [],
    atlanan: [],
    isaretler: {},
  };
  const yapilanlar = (p && p.yapilanlar) || {};
  const yapildiMi = (id, parca) => !!(yapilanlar[id] && yapilanlar[id][parca]);
  const isaretle = (id, parca) => {
    if (!id) return;
    plan.isaretler[id] = plan.isaretler[id] || {};
    plan.isaretler[id][parca] = true;
  };

  // Mevcut + bu planda eklenecek kayıtlar (aynı kişi iki talepte geçerse bir kez).
  const akademisyen = new Map();
  ((p && p.akademisyenler) || []).forEach((a) => {
    const k = kisiAnahtari(a.ad);
    if (k && !akademisyen.has(k)) akademisyen.set(k, { mevcut: a, veri: {} });
  });
  const firma = new Map();
  ((p && p.firmalar) || []).forEach((f) => {
    const k = trAnahtar(f.ad);
    if (k && !firma.has(k)) firma.set(k, { mevcut: f, veri: {} });
  });

  // Boş alanları doldur (var olan değeri ezme).
  const doldur = (kayit, alan, deger) => {
    const d = metin(deger);
    if (!d) return;
    const eski = kayit.mevcut ? metin(kayit.mevcut[alan]) : metin(kayit.veri[alan]);
    if (!eski && !metin(kayit.veri[alan])) kayit.veri[alan] = d;
  };

  const sirali = talepler
    .filter((t) => t && TTO_ESLENEN_DURUMLAR.indexOf(t.durum) >= 0)
    .slice()
    .sort((a, b) => metin(a.gonderimTarihi).localeCompare(metin(b.gonderimTarihi)));

  sirali.forEach((t) => {
    const talepId = metin(t.id);
    const ad = metin(t.sahip) || metin(t.genel && t.genel.adSoyad);
    const aKey = kisiAnahtari(ad);
    if (!aKey) return;
    const iban = ibanSadele(t.odemeBilgileri && t.odemeBilgileri.iban);
    const ibanVar = !!iban && ibanGecerliMi(iban);
    const akademisyenSirasi = !yapildiMi(talepId, 'akademisyen');
    const ibanSirasi = ibanVar && !yapildiMi(talepId, 'iban');
    let a = akademisyen.get(aKey);
    // Akademisyen bu talepten daha önce aktarılıp sonra silindiyse IBAN için
    // yeniden oluşturulmaz.
    if (!a && akademisyenSirasi) {
      a = { mevcut: null, veri: { ad } };
      akademisyen.set(aKey, a);
    }
    if (a) {
      if (akademisyenSirasi) {
        const kisi = personel.get(aKey) || {};
        doldur(a, 'bolum', kisi.bolum);
        doldur(a, 'fakulte', kisi.fakulte);
        isaretle(talepId, 'akademisyen');
      }
      if (ibanSirasi) {
        doldur(a, 'iban', iban);
        isaretle(talepId, 'iban');
      }
    }

    const f = firmaBilgisiTemizle(t.firma);
    const fKey = trAnahtar(f.ad);
    if (fKey && !yapildiMi(talepId, 'firma')) {
      isaretle(talepId, 'firma');
      let fk = firma.get(fKey);
      if (!fk) {
        fk = { mevcut: null, veri: { ad: f.ad } };
        firma.set(fKey, fk);
      }
      doldur(fk, 'vergiNo', f.vergiNo);
      doldur(fk, 'vergiDairesi', f.vergiDairesi);
      doldur(fk, 'eposta', f.eposta);
    }

    if (TTO_IS_KAYDI_DURUMLARI.indexOf(t.durum) < 0) return;
    if (!talepId || kayitliTalepler.has(talepId) || yapildiMi(talepId, 'kayit')) return;
    const tutar = Number(t.proformaKurus) || 0;
    const yil = yilBul(t);
    let sebep = '';
    if (!fKey) sebep = 'Proformanın kesildiği firma girilmemiş.';
    else if (!(tutar > 0)) sebep = 'Proforma tutarı girilmemiş.';
    else if (!yil) sebep = 'Talep tarihi yok.';
    else if (!oranYillari.has(yil)) sebep = yil + ' yılı için oran tanımlı değil (Ayarlar).';
    if (sebep) {
      plan.atlanan.push({ talepId, talepNo: metin(t.talepNo), sebep });
      return;
    }
    kayitliTalepler.add(talepId);
    isaretle(talepId, 'kayit');
    const tarih = metin(t.talepTarihi).slice(0, 10);
    plan.kayitEkle.push({
      talepId,
      akademisyenAnahtari: aKey,
      firmaAnahtari: fKey,
      veri: {
        yil,
        yapilanIs: talepBasligi(t),
        talepTarihi: /^\d{4}-\d{2}-\d{2}$/.test(tarih) ? tarih : '',
        faturaKurus: tutar,
        digerFonKurus: 0,
        manuelDuzeltme: false,
        tahsilat: 'edilmedi',
        odeme: 'odenmedi',
        ibanAnlik: ibanVar ? iban : '',
        notlar: 'TTO işbirliği talebinden' + (metin(t.talepNo) ? ' (No: ' + t.talepNo + ')' : ''),
        talepId,
      },
    });
  });

  akademisyen.forEach((a) => {
    if (!a.mevcut) plan.akademisyenEkle.push(a.veri);
    else if (Object.keys(a.veri).length > 0) {
      plan.akademisyenGuncelle.push({ id: a.mevcut.id, veri: a.veri });
    }
  });
  firma.forEach((f) => {
    if (!f.mevcut) plan.firmaEkle.push(f.veri);
    else if (Object.keys(f.veri).length > 0) {
      plan.firmaGuncelle.push({ id: f.mevcut.id, veri: f.veri });
    }
  });
  return plan;
}

/** Eşleme anahtarı → kimlik sözlüğü (kişiler yazıldıktan sonra). */
export function anahtarKimlikleri(akademisyenler, firmalar) {
  const a = new Map();
  (akademisyenler || []).forEach((x) => {
    const k = kisiAnahtari(x.ad);
    if (k && !a.has(k)) a.set(k, x.id);
  });
  const f = new Map();
  (firmalar || []).forEach((x) => {
    const k = trAnahtar(x.ad);
    if (k && !f.has(k)) f.set(k, x.id);
  });
  return { akademisyen: a, firma: f };
}
