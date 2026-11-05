// ══════════════════════════════════════════════════════════════
// MEZUNİYET KURALLARI — bölüm başına (mezuniyet_kurallari, doc id = bölüm)
//
// Mezuniyet modülünün yetkili alt sekmesidir (eskiden Bölüm Yönetimi'nde
// tek uzun sayfaydı). Kayıt biçimi DEĞİŞMEDİ; yalnız düzen sadeleşti:
//   1 Program yapısı      · öğretim modeli (kalıp ya da iki sayı)
//   2 Mezuniyet koşulları · AKTS, AGNO, seçmeli, staj
//   3 Mezuniyet formu     · sarı işaretlenecek dersler, staj listesi
//   4 Not ölçeği          · yüzlük puan → harf → katsayı, diğer harfler
//   5 Gelişmiş            · ek geçer/kalır notlar, öğrenciye açıklama
// Kayıt yoksa lib/mezuniyet.js → MEZUNIYET_VARSAYILAN geçerlidir.
// ══════════════════════════════════════════════════════════════
import {
  MEZUNIYET_VARSAYILAN,
  MEZUNIYET_KALIPLARI,
  NOT_OLCEGI_VARSAYILAN,
  EK_HARFLER_VARSAYILAN,
  mezKuralNormalize,
  mezOlcekDogrula,
} from './lib/mezuniyet.js';
import { R, dugme, GIRDI, Anahtar, BolumKarti, BilgiNotu } from './mezuniyet-ui.jsx';

const { useState, useEffect, useMemo } = React;

const sayiAl = (v) => {
  const n = parseFloat(String(v == null ? '' : v).replace(',', '.'));
  return Number.isFinite(n) ? n : null;
};
const notAyristir = (m) =>
  String(m || '')
    .split(/[,\s]+/)
    .map((s) => s.trim().toLocaleUpperCase('tr-TR'))
    .filter(Boolean);
const harf = (v) =>
  String(v || '')
    .trim()
    .toLocaleUpperCase('tr-TR');

const SATIR_KURALLARI = [
  { id: 'kalanNot', ad: 'Başarısız (kalır) notu olan ders' },
  { id: 'belirsizNot', ad: 'Notu ölçekte tanınmayan ders' },
  { id: 'mufredatDisi', ad: 'Bölüm müfredatında olmayan ders' },
  { id: 'aktsFarki', ad: 'AKTS’i müfredattakinden farklı ders' },
  { id: 'tekrar', ad: 'Transkriptte birden çok kez geçen ders' },
];

function Alan({ etiket, ipucu, children, genis }) {
  return (
    <label style={{ display: 'block', gridColumn: genis ? '1 / -1' : 'auto' }}>
      <span
        style={{
          display: 'block',
          fontSize: 12.5,
          fontWeight: 600,
          color: R.metin,
          marginBottom: 5,
        }}
      >
        {etiket}
      </span>
      {children}
      {ipucu && (
        <span style={{ display: 'block', fontSize: 11.5, color: R.soluk, marginTop: 4 }}>
          {ipucu}
        </span>
      )}
    </label>
  );
}

const IZGARA = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
  gap: 14,
};

export default function MezuniyetKurallari({ activeDepartment, currentUser }) {
  const [form, setForm] = useState(null);
  const [ilk, setIlk] = useState('');
  const [yukleniyor, setYukleniyor] = useState(true);
  const [kaydediliyor, setKaydediliyor] = useState(false);
  const [mesaj, setMesaj] = useState({ tur: '', metin: '' });
  // Virgüllü/satırlı listelerin HAM metni: her tuşta ayrıştırmak yazılan
  // virgülü siliyordu; ayrıştırma kayıtta yapılır.
  const [metinler, setMetinler] = useState({ gecer: '', kalir: '', uyari: '', staj: '' });
  const [gelismis, setGelismis] = useState(false);

  useEffect(() => {
    let iptal = false;
    setYukleniyor(true);
    setMesaj({ tur: '', metin: '' });
    window
      .apiReadDoc('mezuniyet_kurallari', String(activeDepartment || ''))
      .then((r) => (r && r.exists && r.data) || {})
      .catch(() => ({}))
      .then((d) => {
        if (iptal) return;
        const k = mezKuralNormalize(d);
        const m = {
          gecer: (Array.isArray(d.gecerNotlar) ? d.gecerNotlar : []).join(', '),
          kalir: (Array.isArray(d.kalirNotlar) ? d.kalirNotlar : []).join(', '),
          uyari: (k.satirKurallari.uyariNotlari || []).join(', '),
          staj: (k.stajlar || []).join('\n'),
        };
        setForm(k);
        setMetinler(m);
        setIlk(JSON.stringify([k, m]));
        setYukleniyor(false);
      });
    return () => {
      iptal = true;
    };
  }, [activeDepartment]);

  const degisti = form && JSON.stringify([form, metinler]) !== ilk;
  const olcekSorunlari = useMemo(
    () => (form ? mezOlcekDogrula(form.notOlcegi || []).sorunlar : []),
    [form]
  );

  if (yukleniyor || !form) {
    return <div style={{ padding: 40, textAlign: 'center', color: R.soluk }}>Yükleniyor…</div>;
  }
  if (!activeDepartment) {
    return <BilgiNotu tur="uyari">Kuralları düzenlemek için soldan bir bölüm seçin.</BilgiNotu>;
  }

  const set = (yama) => setForm((f) => ({ ...f, ...yama }));
  const satirKurali = { ...MEZUNIYET_VARSAYILAN.satirKurallari, ...(form.satirKurallari || {}) };
  const toplamY = parseInt(form.toplamYariyil, 10) || 0;
  const isyeriY = Math.max(0, Math.min(toplamY, parseInt(form.isyeriYariyilSayisi, 10) || 0));
  const modelEtiketi = toplamY - isyeriY + '+' + isyeriY;
  const isyeriAralik =
    isyeriY === 1 ? toplamY + '. yarıyıl' : toplamY - isyeriY + 1 + '–' + toplamY + '. yarıyıllar';

  const satir = (liste, i, alan, deger) =>
    setForm((f) => {
      const y = (f[liste] || []).slice();
      y[i] = { ...y[i], [alan]: deger };
      return { ...f, [liste]: y };
    });
  const satirSil = (liste, i) =>
    setForm((f) => ({ ...f, [liste]: (f[liste] || []).filter((_, j) => j !== i) }));
  const satirEkle = (liste, bos) =>
    setForm((f) => ({ ...f, [liste]: (f[liste] || []).concat(bos) }));

  const kaydet = async () => {
    if (olcekSorunlari.length) {
      setMesaj({ tur: 'hata', metin: 'Not ölçeğinde düzeltilmesi gereken satırlar var.' });
      return;
    }
    setKaydediliyor(true);
    setMesaj({ tur: '', metin: '' });
    try {
      await window.DBWrite.set(
        'mezuniyet_kurallari',
        String(activeDepartment),
        {
          departmentId: String(activeDepartment),
          toplamYariyil: parseInt(form.toplamYariyil, 10) || 8,
          isyeriYariyilSayisi: parseInt(form.isyeriYariyilSayisi, 10) || 0,
          toplamAkts: parseInt(form.toplamAkts, 10) || 240,
          minAgno: sayiAl(form.minAgno) || 2,
          minSecmeliAkts: parseInt(form.minSecmeliAkts, 10) || 0,
          isyeriEgitimiAkts: parseInt(form.isyeriEgitimiAkts, 10) || 0,
          stajZorunlu: form.stajZorunlu !== false,
          notOlcegi: (form.notOlcegi || []).map((r) => ({
            min: sayiAl(r.min),
            max: sayiAl(r.max),
            harf: harf(r.harf),
            katsayi: sayiAl(r.katsayi),
            gecer: !!r.gecer,
          })),
          ekHarfler: (form.ekHarfler || []).map((r) => ({
            harf: harf(r.harf),
            aciklama: String(r.aciklama || '').slice(0, 300),
            sayilanHarf: harf(r.sayilanHarf),
            gecer: !!r.gecer,
          })),
          gecerNotlar: notAyristir(metinler.gecer),
          kalirNotlar: notAyristir(metinler.kalir),
          satirKurallari: { ...satirKurali, uyariNotlari: notAyristir(metinler.uyari) },
          stajlar: metinler.staj
            .split(/\n+/)
            .map((x) => x.trim())
            .filter(Boolean)
            .slice(0, 20),
          aciklama: form.aciklama || '',
          updatedAt: new Date().toISOString(),
          updatedBy: currentUser?.name || currentUser?.identifier || '',
        },
        true
      );
      setIlk(JSON.stringify([form, metinler]));
      setMesaj({ tur: 'basari', metin: 'Kurallar kaydedildi.' });
    } catch (e) {
      setMesaj({ tur: 'hata', metin: 'Kaydedilemedi: ' + e.message });
    } finally {
      setKaydediliyor(false);
    }
  };

  const hucre = { ...GIRDI, padding: '6px 8px', fontSize: 12.5 };
  const kucukDugme = { ...dugme('ikincil'), padding: '6px 12px', fontSize: 12.5 };

  return (
    <div style={{ paddingBottom: 80 }}>
      <BilgiNotu>
        Bu kurallar öğrencinin mezuniyet hesabında ve danışmana giden mezuniyet formunda kullanılır.
        Kural kaydedilmezse varsayılanlar geçerlidir.
      </BilgiNotu>

      {/* 1 ── PROGRAM YAPISI */}
      <BolumKarti
        no={1}
        baslik="Program yapısı"
        aciklama="Programın kaç yarıyıl sürdüğü ve sonundaki kaç yarıyılın işyeri eğitimi olduğu."
        sag={
          <span style={{ fontSize: 13, fontWeight: 800, color: R.mavi }}>
            {modelEtiketi} · {toplamY ? String(toplamY / 2).replace('.', ',') + ' yıl' : '—'}
          </span>
        }
      >
        <div style={{ fontSize: 12.5, fontWeight: 600, marginBottom: 8 }}>Hazır kalıplar</div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
          {MEZUNIYET_KALIPLARI.map((k) => {
            const on = k.toplamYariyil === toplamY && k.isyeriYariyilSayisi === isyeriY;
            return (
              <button
                key={k.id}
                type="button"
                onClick={() =>
                  set({
                    toplamYariyil: k.toplamYariyil,
                    isyeriYariyilSayisi: k.isyeriYariyilSayisi,
                    toplamAkts: k.toplamAkts,
                  })
                }
                style={{
                  padding: '7px 14px',
                  borderRadius: 999,
                  border: '1px solid ' + (on ? R.mavi : R.kenar),
                  background: on ? '#E8F0FF' : 'white',
                  color: on ? R.mavi : R.metin,
                  fontWeight: 600,
                  fontSize: 12.5,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                {k.ad}
              </button>
            );
          })}
        </div>
        <div style={IZGARA}>
          <Alan etiket="Toplam yarıyıl" ipucu="Hazırlık hariç, örn. lisans için 8">
            <input
              value={form.toplamYariyil}
              onChange={(e) =>
                set({ toplamYariyil: e.target.value.replace(/\D/g, '').slice(0, 2) })
              }
              style={GIRDI}
            />
          </Alan>
          <Alan
            etiket="Bunun kaçı işyeri eğitimi"
            ipucu={isyeriY > 0 ? isyeriAralik + ' ders sayılmaz' : '0 = işyeri eğitimi yok'}
          >
            <input
              value={form.isyeriYariyilSayisi}
              onChange={(e) =>
                set({ isyeriYariyilSayisi: e.target.value.replace(/\D/g, '').slice(0, 2) })
              }
              style={GIRDI}
            />
          </Alan>
        </div>
      </BolumKarti>

      {/* 2 ── MEZUNİYET KOŞULLARI */}
      <BolumKarti
        no={2}
        baslik="Mezuniyet koşulları"
        aciklama="Öğrencinin mezun sayılması için sağlaması gerekenler."
      >
        <div style={IZGARA}>
          <Alan
            etiket="Toplam AKTS"
            ipucu={
              toplamY > 0 && form.toplamAkts
                ? 'Yarıyıl başına ≈ ' + Math.round(form.toplamAkts / toplamY) + ' AKTS'
                : ''
            }
          >
            <input
              value={form.toplamAkts}
              onChange={(e) => set({ toplamAkts: e.target.value.replace(/\D/g, '') })}
              style={GIRDI}
            />
          </Alan>
          <Alan etiket="Asgari AGNO" ipucu="örn. 2,00">
            <input
              value={form.minAgno}
              onChange={(e) => set({ minAgno: e.target.value })}
              style={GIRDI}
            />
          </Alan>
          <Alan etiket="Asgari seçmeli AKTS" ipucu="0 = aranmaz">
            <input
              value={form.minSecmeliAkts}
              onChange={(e) => set({ minSecmeliAkts: e.target.value.replace(/\D/g, '') })}
              style={GIRDI}
            />
          </Alan>
          {isyeriY > 0 && (
            <Alan etiket="İşyeri eğitimi AKTS">
              <input
                value={form.isyeriEgitimiAkts}
                onChange={(e) => set({ isyeriEgitimiAkts: e.target.value.replace(/\D/g, '') })}
                style={GIRDI}
              />
            </Alan>
          )}
        </div>
        <div style={{ marginTop: 14 }}>
          <Anahtar
            acik={form.stajZorunlu !== false}
            onDegis={(v) => set({ stajZorunlu: v })}
            etiket="Mezuniyet için staj zorunlu"
          />
        </div>
      </BolumKarti>

      {/* 3 ── MEZUNİYET FORMU */}
      <BolumKarti
        no={3}
        baslik="Mezuniyet formu"
        aciklama="Transkript forma olduğu gibi aktarılır; açık olan kurallara uymayan dersler sarı görünür."
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
          {SATIR_KURALLARI.map((k) => (
            <Anahtar
              key={k.id}
              acik={satirKurali[k.id] !== false}
              onDegis={(v) => set({ satirKurallari: { ...satirKurali, [k.id]: v } })}
              etiket={k.ad}
            />
          ))}
        </div>
        <div style={IZGARA}>
          <Alan etiket="Ayrıca sarı işaretlenecek notlar" ipucu="Virgülle ayırın, örn. DD, DC">
            <input
              value={metinler.uyari}
              onChange={(e) => setMetinler({ ...metinler, uyari: e.target.value })}
              style={GIRDI}
            />
          </Alan>
          <Alan etiket="Stajlar" ipucu="Her satıra bir staj; danışman eksik olanı işaretler">
            <textarea
              rows={3}
              value={metinler.staj}
              onChange={(e) => setMetinler({ ...metinler, staj: e.target.value })}
              style={{ ...GIRDI, resize: 'vertical' }}
            />
          </Alan>
        </div>
      </BolumKarti>

      {/* 4 ── NOT ÖLÇEĞİ */}
      <BolumKarti
        no={4}
        baslik="Not ölçeği"
        aciklama="Yüzlük puanın harf notu ve katsayı karşılığı. Hangi harfin geçer sayıldığını belirler; yaz okulu intibakında da kullanılır."
        sag={
          <button
            type="button"
            onClick={() =>
              set({
                notOlcegi: NOT_OLCEGI_VARSAYILAN.map((r) => ({ ...r })),
                ekHarfler: EK_HARFLER_VARSAYILAN.map((r) => ({ ...r })),
              })
            }
            style={kucukDugme}
          >
            Varsayılana dön
          </button>
        }
      >
        {olcekSorunlari.length > 0 && (
          <BilgiNotu tur="hata">
            {olcekSorunlari.map((s) => (
              <div key={s}>{s}</div>
            ))}
          </BilgiNotu>
        )}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 520 }}>
            <thead>
              <tr>
                {['Puan aralığı', 'Harf', 'Katsayı', 'Geçer', ''].map((t) => (
                  <th key={t} style={THS}>
                    {t}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(form.notOlcegi || []).map((r, i) => (
                <tr key={i}>
                  <td style={TDS}>
                    <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
                      <input
                        value={r.min ?? ''}
                        onChange={(e) => satir('notOlcegi', i, 'min', e.target.value)}
                        style={{ ...hucre, width: 64 }}
                      />
                      –
                      <input
                        value={r.max ?? ''}
                        onChange={(e) => satir('notOlcegi', i, 'max', e.target.value)}
                        style={{ ...hucre, width: 64 }}
                      />
                    </span>
                  </td>
                  <td style={TDS}>
                    <input
                      value={r.harf ?? ''}
                      onChange={(e) => satir('notOlcegi', i, 'harf', e.target.value)}
                      style={{ ...hucre, width: 70, fontWeight: 700 }}
                    />
                  </td>
                  <td style={TDS}>
                    <input
                      value={r.katsayi ?? ''}
                      onChange={(e) => satir('notOlcegi', i, 'katsayi', e.target.value)}
                      style={{ ...hucre, width: 70 }}
                    />
                  </td>
                  <td style={TDS}>
                    <Anahtar acik={!!r.gecer} onDegis={(v) => satir('notOlcegi', i, 'gecer', v)} />
                  </td>
                  <td style={{ ...TDS, textAlign: 'right' }}>
                    <SilDugmesi onClick={() => satirSil('notOlcegi', i)} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <button
          type="button"
          style={{ ...kucukDugme, marginTop: 10 }}
          onClick={() =>
            satirEkle('notOlcegi', { min: '', max: '', harf: '', katsayi: '', gecer: true })
          }
        >
          + Satır ekle
        </button>

        <div style={{ fontSize: 13, fontWeight: 700, color: R.navy, margin: '22px 0 4px' }}>
          Puan aralığı olmayan notlar
        </div>
        <div style={{ fontSize: 12, color: R.soluk, marginBottom: 8 }}>
          Devamsızlık, muafiyet gibi durumlar (FF1, M, G…). “Sayılan harf” doluysa ortalamaya o
          harfin katsayısıyla girer.
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 560 }}>
            <thead>
              <tr>
                {['Harf', 'Açıklama', 'Sayılan harf', 'Geçer', ''].map((t) => (
                  <th key={t} style={THS}>
                    {t}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(form.ekHarfler || []).map((r, i) => (
                <tr key={i}>
                  <td style={TDS}>
                    <input
                      value={r.harf ?? ''}
                      onChange={(e) => satir('ekHarfler', i, 'harf', e.target.value)}
                      style={{ ...hucre, width: 70, fontWeight: 700 }}
                    />
                  </td>
                  <td style={TDS}>
                    <input
                      value={r.aciklama ?? ''}
                      onChange={(e) => satir('ekHarfler', i, 'aciklama', e.target.value)}
                      style={hucre}
                    />
                  </td>
                  <td style={TDS}>
                    <input
                      value={r.sayilanHarf ?? ''}
                      onChange={(e) => satir('ekHarfler', i, 'sayilanHarf', e.target.value)}
                      style={{ ...hucre, width: 80 }}
                    />
                  </td>
                  <td style={TDS}>
                    <Anahtar acik={!!r.gecer} onDegis={(v) => satir('ekHarfler', i, 'gecer', v)} />
                  </td>
                  <td style={{ ...TDS, textAlign: 'right' }}>
                    <SilDugmesi onClick={() => satirSil('ekHarfler', i)} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <button
          type="button"
          style={{ ...kucukDugme, marginTop: 10 }}
          onClick={() =>
            satirEkle('ekHarfler', { harf: '', aciklama: '', sayilanHarf: '', gecer: false })
          }
        >
          + Not ekle
        </button>
      </BolumKarti>

      {/* 5 ── GELİŞMİŞ */}
      <BolumKarti
        no={5}
        baslik="Gelişmiş"
        aciklama="Eski harf sistemi (AA/BA…) için ek notlar ve öğrenciye gösterilecek açıklama."
        sag={
          <button type="button" onClick={() => setGelismis((v) => !v)} style={kucukDugme}>
            {gelismis ? 'Gizle' : 'Göster'}
          </button>
        }
      >
        {gelismis && (
          <div style={IZGARA}>
            <Alan etiket="Ek geçer notlar" ipucu="Ölçeği tamamlar; virgülle ayırın">
              <input
                value={metinler.gecer}
                onChange={(e) => setMetinler({ ...metinler, gecer: e.target.value })}
                style={GIRDI}
              />
            </Alan>
            <Alan etiket="Ek kalır notlar" ipucu="Ölçeği tamamlar; virgülle ayırın">
              <input
                value={metinler.kalir}
                onChange={(e) => setMetinler({ ...metinler, kalir: e.target.value })}
                style={GIRDI}
              />
            </Alan>
            <Alan etiket="Öğrenciye not (isteğe bağlı)" genis>
              <textarea
                rows={2}
                value={form.aciklama || ''}
                onChange={(e) => set({ aciklama: e.target.value })}
                style={{ ...GIRDI, resize: 'vertical' }}
              />
            </Alan>
          </div>
        )}
      </BolumKarti>

      {/* Kaydet çubuğu — her zaman görünür */}
      <div
        style={{
          position: 'sticky',
          bottom: 12,
          zIndex: 5,
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          flexWrap: 'wrap',
          padding: '12px 16px',
          borderRadius: 14,
          background: 'white',
          border: '1px solid ' + (degisti ? R.turuncu : R.kenar),
          boxShadow: '0 8px 24px rgba(16,24,40,0.12)',
        }}
      >
        <span
          style={{
            flex: 1,
            fontSize: 13,
            color: mesaj.tur === 'hata' ? R.kirmizi : mesaj.tur === 'basari' ? R.yesil : R.soluk,
            fontWeight: 600,
          }}
        >
          {mesaj.metin ||
            (degisti ? 'Kaydedilmemiş değişiklikler var.' : 'Tüm değişiklikler kayıtlı.')}
        </span>
        <button
          type="button"
          onClick={kaydet}
          disabled={kaydediliyor || !degisti}
          style={dugme('birincil', kaydediliyor || !degisti)}
        >
          {kaydediliyor ? 'Kaydediliyor…' : 'Kuralları kaydet'}
        </button>
      </div>
    </div>
  );
}

const THS = {
  textAlign: 'left',
  fontSize: 11,
  fontWeight: 700,
  color: R.soluk,
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
  padding: '8px 8px',
  borderBottom: '1px solid ' + R.kenar,
};
const TDS = { padding: '6px 8px', borderBottom: '1px solid #F1F1F1', verticalAlign: 'middle' };

function SilDugmesi({ onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title="Satırı sil"
      style={{
        border: 'none',
        background: 'transparent',
        color: R.soluk,
        cursor: 'pointer',
        fontSize: 16,
        lineHeight: 1,
        padding: 6,
        borderRadius: 6,
      }}
    >
      ×
    </button>
  );
}
