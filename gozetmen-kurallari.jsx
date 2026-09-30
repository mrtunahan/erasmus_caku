// ══════════════════════════════════════════════════════════════
// GÖZETMEN KURALLARI PANELİ
//
// Bölüm Yönetimi → Gözetmenler ve Sınav Otomasyonu aynı paneli gösterir;
// kural bölüm kaydında durur (departments.gozetmenKurali ve
// departments.gozetmenSayiKurali) ve dekanlık çıktısındaki otomatik atama
// buradan okur. Kuralların anlamı ve hesabı lib/gozetmen.js'te.
// ══════════════════════════════════════════════════════════════

import {
  HOCA_KURALLARI,
  hocaKuraliOku,
  sayiKuraliOku,
  sayiKuraliOrnekleri,
  SAYI_KURALI_VARSAYILAN,
  bolumKaydiniBul,
} from './lib/gozetmen.js';

const { useState, useEffect } = React;

const R = {
  navy: '#1F2937',
  muted: '#6B7280',
  blue: '#2563EB',
  bluePale: '#EFF6FF',
  border: '#E5E7EB',
  green: '#059669',
  red: '#DC2626',
};

const SAYI_ALANLARI = [
  { id: 'salonBasina', label: 'Salon başına gözetmen', min: 1, max: 10 },
  { id: 'kalabalikEsik', label: 'Kalabalık salon eşiği (öğrenci)', min: 0, max: 1000 },
  { id: 'kalabalikEk', label: 'Kalabalık salona ek gözetmen', min: 0, max: 10 },
  { id: 'enAz', label: 'Sınav başına en az', min: 0, max: 50 },
  { id: 'enCok', label: 'Sınav başına en çok (0 = sınırsız)', min: 0, max: 50 },
];

const baslik = { fontSize: 13.5, fontWeight: 700, color: R.navy, marginBottom: 4 };
const aciklama = { fontSize: 12.5, color: R.muted, marginBottom: 12, lineHeight: 1.55 };

export function GozetmenKurallariPaneli({ departmentId, duzenlenebilir = true, onKaydedildi }) {
  const [hoca, setHoca] = useState('tercihli');
  const [sayi, setSayi] = useState({ ...SAYI_KURALI_VARSAYILAN });
  const [kayitli, setKayitli] = useState(null);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [kaydediliyor, setKaydediliyor] = useState(false);
  const [mesaj, setMesaj] = useState(null);
  // Kuralın yazılacağı bölüm KAYDININ kimliği (bkz. bolumKaydiniBul)
  const [kayitId, setKayitId] = useState(String(departmentId));

  useEffect(() => {
    let canli = true;
    setYukleniyor(true);
    window
      .apiRead('departments')
      .then((liste) => {
        if (!canli) return;
        const d = bolumKaydiniBul(liste, departmentId) || {};
        setKayitId(String(d.id || departmentId));
        const h = hocaKuraliOku(d.gozetmenKurali);
        const s = sayiKuraliOku(d.gozetmenSayiKurali);
        setHoca(h);
        setSayi(s);
        setKayitli(JSON.stringify({ h, s }));
      })
      .catch(() => {})
      .finally(() => canli && setYukleniyor(false));
    return () => {
      canli = false;
    };
  }, [departmentId]);

  if (yukleniyor) return null;

  const temiz = sayiKuraliOku(sayi);
  const degisti = kayitli !== JSON.stringify({ h: hoca, s: temiz });
  const ornekler = sayiKuraliOrnekleri(temiz);

  const kaydet = async () => {
    setKaydediliyor(true);
    setMesaj(null);
    try {
      const alanlar = { gozetmenKurali: hoca, gozetmenSayiKurali: temiz };
      await window.DBWrite.set('departments', kayitId, alanlar, true);
      if (window.apiInvalidate) window.apiInvalidate('departments');
      setSayi(temiz);
      setKayitli(JSON.stringify({ h: hoca, s: temiz }));
      setMesaj({ ok: true, metin: 'Kaydedildi. Dekanlık çıktısı bu kurallarla üretilecek.' });
      if (onKaydedildi) onKaydedildi(alanlar);
    } catch (e) {
      setMesaj({ ok: false, metin: 'Kaydedilemedi: ' + ((e && e.message) || '') });
    } finally {
      setKaydediliyor(false);
    }
  };

  return (
    <div
      style={{
        background: '#F8FAFC',
        border: '1px solid ' + R.border,
        borderRadius: 12,
        padding: 16,
        marginBottom: 14,
        display: 'grid',
        gap: 18,
      }}
    >
      <div>
        <div style={baslik}>Dersin hocası kendi sınavında gözetmen olsun mu?</div>
        <div style={aciklama}>
          Bölümden bölüme değişir. Seçim, sınav otomasyonundaki otomatik gözetmen atamasında ve
          dekanlık çıktısında uygulanır.
        </div>
        <div style={{ display: 'grid', gap: 8 }}>
          {HOCA_KURALLARI.map((s) => {
            const secili = hoca === s.id;
            return (
              <label
                key={s.id}
                style={{
                  display: 'flex',
                  gap: 10,
                  alignItems: 'flex-start',
                  padding: '10px 12px',
                  border: '1.5px solid ' + (secili ? R.blue : R.border),
                  background: secili ? R.bluePale : 'white',
                  borderRadius: 10,
                  cursor: duzenlenebilir ? 'pointer' : 'default',
                }}
              >
                <input
                  type="radio"
                  name={'gozetmen-hoca-kurali-' + departmentId}
                  checked={secili}
                  disabled={!duzenlenebilir || kaydediliyor}
                  onChange={() => setHoca(s.id)}
                  style={{ marginTop: 3 }}
                />
                <span>
                  <span
                    style={{ fontSize: 13, fontWeight: 700, color: secili ? '#1D4ED8' : R.navy }}
                  >
                    {s.label}
                  </span>
                  <span
                    style={{
                      display: 'block',
                      fontSize: 12.5,
                      color: R.muted,
                      lineHeight: 1.5,
                      marginTop: 2,
                    }}
                  >
                    {s.desc}
                  </span>
                </span>
              </label>
            );
          })}
        </div>
      </div>

      <div>
        <div style={baslik}>Bir sınava kaç gözetmen?</div>
        <div style={aciklama}>
          Salon başına hesaplanır: her salona belirlenen sayıda gözetmen; salondaki öğrenci sayısı
          eşiğe ulaşırsa o salona ek gözetmen. Sınavlar birden çok salona bölündüğünde öğrenciler
          salonlara eşit dağılmış sayılır. Sınava elle salon girildiyse o salonlar esas alınır.
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
            gap: 10,
          }}
        >
          {SAYI_ALANLARI.map((a) => (
            <label key={a.id} style={{ fontSize: 12, color: R.navy, fontWeight: 600 }}>
              {a.label}
              <input
                type="number"
                min={a.min}
                max={a.max}
                value={sayi[a.id]}
                disabled={!duzenlenebilir || kaydediliyor}
                onChange={(e) => setSayi({ ...sayi, [a.id]: e.target.value })}
                data-alan={a.id}
                style={{
                  display: 'block',
                  width: '100%',
                  boxSizing: 'border-box',
                  marginTop: 4,
                  padding: '7px 10px',
                  border: '1px solid ' + R.border,
                  borderRadius: 8,
                  fontSize: 13,
                }}
              />
            </label>
          ))}
        </div>

        <table
          style={{
            marginTop: 12,
            borderCollapse: 'collapse',
            fontSize: 12.5,
            background: 'white',
            border: '1px solid ' + R.border,
            borderRadius: 8,
            overflow: 'hidden',
          }}
        >
          <thead>
            <tr style={{ background: '#F1F5F9', color: R.muted, textAlign: 'left' }}>
              <th style={{ padding: '6px 12px' }}>Örnek sınav</th>
              <th style={{ padding: '6px 12px' }}>Gözetmen</th>
            </tr>
          </thead>
          <tbody>
            {ornekler.map((o) => (
              <tr key={o.salon + '-' + o.ogrenci} style={{ borderTop: '1px solid ' + R.border }}>
                <td style={{ padding: '6px 12px' }}>
                  {o.salon} salon, {o.ogrenci} öğrenci
                </td>
                <td style={{ padding: '6px 12px', fontWeight: 700 }}>{o.gozetmen}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {duzenlenebilir && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={kaydet}
            disabled={!degisti || kaydediliyor}
            style={{
              padding: '8px 16px',
              borderRadius: 8,
              border: 'none',
              background: R.blue,
              color: 'white',
              fontWeight: 700,
              fontSize: 13,
              cursor: !degisti || kaydediliyor ? 'default' : 'pointer',
              opacity: !degisti || kaydediliyor ? 0.5 : 1,
            }}
          >
            {kaydediliyor ? 'Kaydediliyor…' : 'Kuralları Kaydet'}
          </button>
          {mesaj && (
            <span style={{ fontSize: 12, fontWeight: 600, color: mesaj.ok ? R.green : R.red }}>
              {mesaj.metin}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
