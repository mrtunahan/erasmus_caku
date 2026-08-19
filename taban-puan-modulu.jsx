// ══════════════════════════════════════════════════════════════
// ÇAKÜ — Taban Puan Kütüphanesi
//
// Taban puan tabloları burada, MODÜLDEN BAĞIMSIZ olarak tutulur. Bir kayıt =
// bir yılın bir listesi (ör. "2025 · DGS"). Dikey Geçiş ve Yatay Geçiş
// modülleri bu kütüphaneden istedikleri tabloyu (ya da birden çok yılı)
// seçip kullanır; puanlar bir daha modül modül yapıştırılmaz.
//
// Geçmiş yıllar SİLİNMEZ: adayın şartı yerleştiği yılın taban puanına göre
// değerlendirilir, o yüzden eski tablolar da kullanımda kalır.
//
// Okuma tamamen istemcide ve deterministiktir (lib/taban-tablo.js) — model
// çağrısı yok. Yapıştırılan tabloyu ya da PDF'in metin katmanını çözer.
// ══════════════════════════════════════════════════════════════

const { useState, useEffect, useCallback, useMemo, useRef } = React;

const TP = {
  navy: '#1B2A4A',
  accent: '#0F766E',
  accentPale: '#CCFBF1',
  text: '#1F2937',
  textMuted: '#6B7280',
  border: '#E5E7EB',
  bg: '#F8F9FB',
  green: '#059669',
  greenLight: '#D1FAE5',
  red: '#DC2626',
  redLight: '#FEE2E2',
  amber: '#B45309',
  amberLight: '#FEF3C7',
};

const TP_KOLEKSIYON = 'taban_tablolari';

const tpInput = {
  width: '100%',
  padding: '9px 12px',
  borderRadius: 8,
  border: '1px solid ' + TP.border,
  fontSize: 13,
  fontFamily: "'Inter', sans-serif",
  boxSizing: 'border-box',
  background: 'white',
};
const tpLabel = {
  display: 'block',
  fontSize: 11,
  fontWeight: 700,
  color: TP.textMuted,
  marginBottom: 5,
};
const tpBtn = (bg, renk, kenar) => ({
  padding: '9px 16px',
  borderRadius: 8,
  border: kenar ? '1px solid ' + kenar : 'none',
  background: bg,
  color: renk,
  fontSize: 12.5,
  fontWeight: 700,
  fontFamily: 'inherit',
  cursor: 'pointer',
});

// ── Yeni tablo ekleme formu ──
function TabloEkle({ currentUser, mevcutlar, onKaydedildi, onIptal }) {
  const [yil, setYil] = useState(String(new Date().getFullYear()));
  const [tur, setTur] = useState('dgs');
  const [kurum, setKurum] = useState(window.TENANT?.universityName || '');
  const [ham, setHam] = useState('');
  const [cozum, setCozum] = useState(null);
  const [puanSutunu, setPuanSutunu] = useState(0);
  // Taban BAŞARI SIRASI hangi sayı sütununda? -1: okunmuyor.
  // Tahmin edilmiyor, soruluyor: "185.432" hem bir puan hem bir sıra olabilir
  // ve biçime bakarak ayırmak mümkün değil.
  const [siraSutunu, setSiraSutunu] = useState(-1);
  const [busy, setBusy] = useState('');
  const [hata, setHata] = useState('');
  const [taranmis, setTaranmis] = useState(false);
  const dosyaRef = useRef(null);

  const coz = (metin, sutun, sira) => {
    const c = window.tabanTablosuCoz(metin, sutun, sira == null ? siraSutunu : sira);
    setCozum(c);
    if (c.kayitlar.length === 0 && c.puansizlar.length === 0) {
      setHata(
        'Bu metinde program satırı bulunamadı. Tabloyu program adı ve puan yan yana ' +
          'olacak şekilde kopyaladığınızdan emin olun.'
      );
    } else {
      setHata('');
    }
    return c;
  };

  const dosyaSec = async (e) => {
    const f = (e.target.files && e.target.files[0]) || null;
    e.target.value = '';
    if (!f) return;
    setHata('');
    setTaranmis(false);
    setBusy('dosya');
    try {
      if (/\.pdf$/i.test(f.name) || f.type === 'application/pdf') {
        const { metin, sayfaSayisi } = await window.pdfMetniCikar(f);
        if (!window.metinKatmaniVarMi(metin, sayfaSayisi)) {
          // Taranmış PDF: sayfalar GÖRÜNTÜ, metin katmanı yok. Bunu "tablo
          // bulunamadı" diye söylemek yanıltıcı olurdu — çözümü bambaşka.
          setTaranmis(true);
          setHata('Bu PDF taranmış görüntülerden oluşuyor; içinde seçilebilir metin yok.');
          return;
        }
        setHam(metin);
        coz(metin, puanSutunu, siraSutunu);
      } else {
        const metin = await f.text();
        setHam(metin);
        coz(metin, puanSutunu, siraSutunu);
      }
    } catch (err) {
      setHata('Dosya okunamadı: ' + err.message);
    } finally {
      setBusy('');
    }
  };

  const sutunDegistir = (i) => {
    setPuanSutunu(i);
    if (ham) coz(ham, i, siraSutunu);
  };

  const siraSutunDegistir = (i) => {
    const yeni = siraSutunu === i ? -1 : i; // aynı sütuna tekrar basmak kapatır
    setSiraSutunu(yeni);
    if (ham) coz(ham, puanSutunu, yeni);
  };

  const kaydet = async () => {
    if (!cozum || (cozum.kayitlar.length === 0 && cozum.puansizlar.length === 0)) {
      setHata('Önce bir tablo okutun.');
      return;
    }
    const docId = window.tabloAnahtari(yil, tur);
    const var_ = (mevcutlar || []).find((t) => t.id === docId);
    if (
      var_ &&
      !confirm(
        window.tabloEtiketi(var_) +
          ' tablosu zaten kayıtlı (' +
          (var_.satirlar || []).length +
          ' program).\n\nÜzerine yazılsın mı?'
      )
    ) {
      return;
    }
    setBusy('kayit');
    try {
      await window.DBWrite.set(
        TP_KOLEKSIYON,
        docId,
        {
          yil: String(yil || ''),
          tur,
          kurum: String(kurum || ''),
          satirlar: cozum.kayitlar,
          puansizlar: cozum.puansizlar,
          kaynakAdi: '',
          ekleyen: String(currentUser?.name || currentUser?.identifier || ''),
          eklenmeZamani: new Date().toISOString(),
        },
        true
      );
      onKaydedildi();
    } catch (e) {
      setHata('Kaydedilemedi: ' + e.message);
    } finally {
      setBusy('');
    }
  };

  return (
    <div
      style={{
        background: 'white',
        border: '1px solid ' + TP.border,
        borderRadius: 12,
        padding: 18,
        marginBottom: 18,
      }}
    >
      <div style={{ fontSize: 15, fontWeight: 700, color: TP.navy, marginBottom: 14 }}>
        Yeni taban puan tablosu
      </div>

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 12 }}>
        <div style={{ width: 110 }}>
          <label style={tpLabel}>YIL *</label>
          <input
            value={yil}
            onChange={(e) => setYil(e.target.value.replace(/\D/g, '').slice(0, 4))}
            placeholder="2025"
            style={tpInput}
          />
        </div>
        <div style={{ width: 210 }}>
          <label style={tpLabel}>LİSTE TÜRÜ *</label>
          <select value={tur} onChange={(e) => setTur(e.target.value)} style={tpInput}>
            {window.TABAN_LISTE_TURLERI.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
        <div style={{ flex: '1 1 220px' }}>
          <label style={tpLabel}>KURUM</label>
          <input
            value={kurum}
            onChange={(e) => setKurum(e.target.value)}
            placeholder="Çankırı Karatekin Üniversitesi"
            style={tpInput}
          />
        </div>
      </div>

      <label style={tpLabel}>TABLO</label>
      <textarea
        value={ham}
        onChange={(e) => setHam(e.target.value)}
        placeholder={
          'Tabloyu buraya yapıştırın. Örnek:\n' +
          '102890059 Mühendislik Fakültesi Bilgisayar Mühendisliği SAY 307,84423 311,79782'
        }
        rows={6}
        style={{ ...tpInput, fontFamily: 'monospace', fontSize: 12, resize: 'vertical' }}
      />

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
        <button
          onClick={() => coz(ham, puanSutunu, siraSutunu)}
          disabled={!!busy || !ham.trim()}
          style={{ ...tpBtn(TP.navy, '#fff'), opacity: busy || !ham.trim() ? 0.5 : 1 }}
        >
          Tabloyu Oku
        </button>
        <button
          onClick={() => dosyaRef.current && dosyaRef.current.click()}
          disabled={!!busy}
          style={tpBtn('#fff', TP.navy, TP.border)}
        >
          {busy === 'dosya' ? 'Okunuyor…' : 'PDF / CSV Yükle'}
        </button>
        <input
          ref={dosyaRef}
          type="file"
          accept=".pdf,.csv,.txt,application/pdf,text/csv,text/plain"
          style={{ display: 'none' }}
          onChange={dosyaSec}
        />
        <span style={{ flex: 1 }} />
        <button onClick={onIptal} style={tpBtn('#fff', TP.textMuted, TP.border)}>
          Vazgeç
        </button>
        <button
          onClick={kaydet}
          disabled={!!busy || !cozum}
          style={{ ...tpBtn(TP.green, '#fff'), opacity: busy || !cozum ? 0.5 : 1 }}
        >
          {busy === 'kayit' ? 'Kaydediliyor…' : 'Kütüphaneye Kaydet'}
        </button>
      </div>

      {/* Birden çok puan sütunu varsa hangisinin taban olduğunu SOR — en
          sağdakini varsaymak tavan puanı taban sanmaya yol açıyordu. */}
      {cozum && cozum.enCokPuanSutunu > 1 && (
        <div
          style={{
            marginTop: 12,
            padding: '9px 12px',
            borderRadius: 8,
            background: TP.bg,
            fontSize: 12,
            display: 'flex',
            gap: 8,
            alignItems: 'center',
            flexWrap: 'wrap',
          }}
        >
          <span style={{ fontWeight: 600, color: TP.text }}>
            Satırlarda {cozum.enCokPuanSutunu} puan sütunu var. Taban puan hangisi?
          </span>
          {Array.from({ length: cozum.enCokPuanSutunu }).map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => sutunDegistir(i)}
              style={{
                padding: '4px 12px',
                borderRadius: 16,
                border: '1px solid ' + (puanSutunu === i ? TP.navy : TP.border),
                background: puanSutunu === i ? TP.navy : '#fff',
                color: puanSutunu === i ? '#fff' : TP.textMuted,
                fontSize: 11.5,
                fontWeight: 700,
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              {i + 1}. sütun
            </button>
          ))}
        </div>
      )}

      {/* Taban BAŞARI SIRASI sütunu — yatay geçişteki uygunluk şartı puanla
          değil sırayla konur, o yüzden tablodan sıra da okunabilmeli. Hangi
          sütun olduğu SORULUR: "185.432" biçimsel olarak hem puan hem sıra
          olabilir, tahmin etmek yanlış kriterle eleme demektir. */}
      {cozum && cozum.enCokSayiSutunu > 0 && (
        <div
          style={{
            marginTop: 8,
            padding: '9px 12px',
            borderRadius: 8,
            background: TP.bg,
            fontSize: 12,
            display: 'flex',
            gap: 8,
            alignItems: 'center',
            flexWrap: 'wrap',
          }}
        >
          <span style={{ fontWeight: 600, color: TP.text }}>
            Taban başarı sıralaması hangi sütunda?
          </span>
          {Array.from({ length: cozum.enCokSayiSutunu }).map((_, i) => {
            const ornek = (cozum.kayitlar.find((k) => (k.sayilar || [])[i]) || {}).sayilar;
            return (
              <button
                key={i}
                type="button"
                onClick={() => siraSutunDegistir(i)}
                style={{
                  padding: '4px 12px',
                  borderRadius: 16,
                  border: '1px solid ' + (siraSutunu === i ? TP.navy : TP.border),
                  background: siraSutunu === i ? TP.navy : '#fff',
                  color: siraSutunu === i ? '#fff' : TP.textMuted,
                  fontSize: 11.5,
                  fontWeight: 700,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                {i + 1}. sütun{ornek && ornek[i] ? ' · ' + ornek[i] : ''}
              </button>
            );
          })}
          <span style={{ color: TP.textMuted, fontSize: 11 }}>
            {siraSutunu < 0
              ? 'Seçilmedi — bu tablodan sıralama okunmaz.'
              : 'Tekrar tıklayınca seçim kalkar.'}
          </span>
        </div>
      )}

      {hata && (
        <div
          style={{
            marginTop: 12,
            padding: '9px 12px',
            borderRadius: 8,
            background: TP.amberLight,
            color: TP.amber,
            fontSize: 12,
            fontWeight: 600,
            lineHeight: 1.55,
          }}
        >
          {hata}
          {taranmis && (
            <div style={{ marginTop: 6, fontWeight: 500 }}>
              PDF'i tarayıcıda açıp tabloyu <b>fareyle seçmeyi</b> deneyin; seçilebiliyorsa
              kopyalayıp yukarıya yapıştırın. Seçilemiyorsa belge gerçekten görüntüdür.
            </div>
          )}
        </div>
      )}

      {cozum && (cozum.kayitlar.length > 0 || cozum.puansizlar.length > 0) && (
        <div
          style={{
            marginTop: 12,
            padding: '9px 12px',
            borderRadius: 8,
            background: TP.greenLight,
            color: TP.green,
            fontSize: 12,
            fontWeight: 600,
          }}
        >
          {cozum.kayitlar.length} programın puanı okundu
          {cozum.puansizlar.length > 0
            ? ' · ' + cozum.puansizlar.length + ' programda puan yayımlanmamış'
            : ''}
          {cozum.okunamayan.length > 0 ? ' · ' + cozum.okunamayan.length + ' satır çözülemedi' : ''}
        </div>
      )}

      {cozum && cozum.kayitlar.length > 0 && (
        <div style={{ marginTop: 10, maxHeight: 260, overflowY: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <tbody>
              {cozum.kayitlar.map((k, i) => (
                <tr key={i} style={{ borderTop: '1px solid ' + TP.border }}>
                  <td style={{ padding: '5px 8px', color: TP.textMuted, width: 90 }}>
                    {k.kod || '—'}
                  </td>
                  <td style={{ padding: '5px 8px', color: TP.text }}>{k.ad}</td>
                  <td style={{ padding: '5px 8px', width: 60, color: TP.textMuted }}>
                    {k.puanTuru}
                  </td>
                  <td style={{ padding: '5px 8px', fontWeight: 700, width: 100 }}>{k.taban}</td>
                  <td
                    style={{ padding: '5px 8px', width: 100, color: TP.textMuted }}
                    title="Taban başarı sıralaması"
                  >
                    {k.tabanSira || ''}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Tek tablonun ayrıntısı ──
function TabloKarti({ tablo, onSil, arama, silebilir }) {
  const [acik, setAcik] = useState(false);
  const kucuk = (x) =>
    String(x || '')
      .replace(/İ/g, 'i')
      .replace(/I/g, 'ı')
      .toLocaleLowerCase('tr-TR');
  const q = kucuk(arama).trim();
  const satirlar = (tablo.satirlar || []).filter((s) => !q || kucuk(s.ad).includes(q));

  return (
    <div
      style={{
        background: 'white',
        border: '1px solid ' + TP.border,
        borderRadius: 12,
        padding: '14px 16px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14.5, fontWeight: 700, color: TP.navy }}>
            {window.tabloEtiketi(tablo)}
          </div>
          <div style={{ fontSize: 11.5, color: TP.textMuted, marginTop: 3 }}>
            {(tablo.satirlar || []).length} program
            {(tablo.puansizlar || []).length > 0
              ? ' · ' + tablo.puansizlar.length + ' puanı yayımlanmamış'
              : ''}
            {tablo.kurum ? ' · ' + tablo.kurum : ''}
            {tablo.eklenmeZamani
              ? ' · ' + new Date(tablo.eklenmeZamani).toLocaleDateString('tr-TR')
              : ''}
            {tablo.ekleyen ? ' · ' + tablo.ekleyen : ''}
          </div>
        </div>
        <button onClick={() => setAcik(!acik)} style={tpBtn('#fff', TP.navy, TP.border)}>
          {acik ? 'Gizle' : 'Puanları Gör'}
        </button>
        {silebilir && (
          <button
            onClick={() => onSil(tablo)}
            style={tpBtn(TP.redLight, TP.red, TP.red + '33')}
            title="Tabloyu kütüphaneden kaldırır"
          >
            Sil
          </button>
        )}
      </div>

      {acik && (
        <div style={{ marginTop: 12, maxHeight: 420, overflowY: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ background: TP.bg }}>
                <th style={{ textAlign: 'left', padding: '6px 8px', color: TP.textMuted }}>Kod</th>
                <th style={{ textAlign: 'left', padding: '6px 8px', color: TP.textMuted }}>
                  Program
                </th>
                <th style={{ textAlign: 'left', padding: '6px 8px', color: TP.textMuted }}>Tür</th>
                <th style={{ textAlign: 'left', padding: '6px 8px', color: TP.textMuted }}>
                  Taban
                </th>
              </tr>
            </thead>
            <tbody>
              {satirlar.map((s, i) => (
                <tr key={i} style={{ borderTop: '1px solid ' + TP.border }}>
                  <td style={{ padding: '5px 8px', color: TP.textMuted }}>{s.kod || '—'}</td>
                  <td style={{ padding: '5px 8px', color: TP.text }}>{s.ad}</td>
                  <td style={{ padding: '5px 8px', color: TP.textMuted }}>{s.puanTuru || '—'}</td>
                  <td style={{ padding: '5px 8px', fontWeight: 700 }}>{s.taban}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {satirlar.length === 0 && (
            <div style={{ padding: 16, textAlign: 'center', color: TP.textMuted, fontSize: 12.5 }}>
              Bu tabloda aramanızla eşleşen program yok.
            </div>
          )}
          {(tablo.puansizlar || []).length > 0 && (
            <details style={{ marginTop: 8 }}>
              <summary
                style={{ fontSize: 11.5, color: TP.textMuted, cursor: 'pointer', fontWeight: 600 }}
              >
                {tablo.puansizlar.length} programın puanı yayımlanmamış
              </summary>
              <ul style={{ margin: '6px 0 0', paddingLeft: 18, fontSize: 11.5, lineHeight: 1.7 }}>
                {tablo.puansizlar.map((s, i) => (
                  <li key={i} style={{ color: TP.textMuted }}>
                    {s.ad}
                  </li>
                ))}
              </ul>
            </details>
          )}
        </div>
      )}
    </div>
  );
}

function TabanPuanModuluApp({ currentUser }) {
  // ── SİLME YALNIZ ÜNİVERSİTE YETKİLİSİNDE ──
  // Taban puan tablosu kurum geneli bir referanstır: Dikey ve Yatay Geçiş
  // modülleri adayın şartını BURADAN okur ve aday, YERLEŞTİĞİ YILIN tablosuna
  // göre değerlendirilir. Bir fakültenin sildiği tablo yalnız o fakülteyi
  // değil, o yılın tablosunu kullanan tüm bölümlerin değerlendirmesini
  // sessizce bozar — geçmiş yıl tabloları bu yüzden silinmiyor zaten.
  // Yükleme ve görüntüleme herkese açık kalır; kaldıran tek merci üniversite.
  const silebilir = !!(window.isUniversiteYetkilisi && window.isUniversiteYetkilisi(currentUser));
  const [tablolar, setTablolar] = useState(null);
  const [ekleAcik, setEkleAcik] = useState(false);
  const [arama, setArama] = useState('');
  const [msg, setMsg] = useState('');

  const yukle = useCallback(async () => {
    try {
      const read = window.apiRead.fresh || window.apiRead;
      const liste = await read(TP_KOLEKSIYON);
      setTablolar((liste || []).map(window.tabanTabloNormalize));
    } catch (_e) {
      setTablolar([]);
    }
  }, []);

  useEffect(() => {
    yukle();
  }, [yukle]);

  const sirali = useMemo(() => window.tabanTablolariSirala(tablolar || []), [tablolar]);

  const sil = async (t) => {
    // Düğme gizli olsa da kapı burada da kapalı: arayüz tek başına yetki
    // denetimi değildir (sunucu tarafı da ayrıca reddeder).
    if (!silebilir) return;
    if (
      !confirm(
        window.tabloEtiketi(t) +
          ' tablosu kütüphaneden silinecek.\n\nBu tabloyu kullanan modüllerde puanlar ' +
          'artık görünmez. Devam edilsin mi?'
      )
    )
      return;
    try {
      await window.DBWrite.remove(TP_KOLEKSIYON, t.id);
      setMsg('Tablo silindi.');
      setTimeout(() => setMsg(''), 3000);
      yukle();
    } catch (e) {
      alert('Silinemedi: ' + e.message);
    }
  };

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto' }}>
      <div style={{ marginBottom: 18 }}>
        <div style={{ fontSize: 20, fontWeight: 700, color: TP.navy }}>Taban Puan Kütüphanesi</div>
        <div style={{ fontSize: 12.5, color: TP.textMuted, marginTop: 5, lineHeight: 1.6 }}>
          Taban puan tabloları burada, modülden bağımsız durur. Dikey Geçiş ve Yatay Geçiş modülleri
          buradan <b>istediğiniz yılın</b> (ya da birden çok yılın) tablosunu seçip kullanır. Geçmiş
          yıllar silinmez — adayın şartı <b>yerleştiği yılın</b> taban puanına göre değerlendirilir.
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 14 }}>
        <input
          value={arama}
          onChange={(e) => setArama(e.target.value)}
          placeholder="Program ara (açık tablolarda süzer)…"
          style={{ ...tpInput, flex: '1 1 260px', minWidth: 200 }}
        />
        {!ekleAcik && (
          <button onClick={() => setEkleAcik(true)} style={tpBtn(TP.navy, '#fff')}>
            + Tablo Ekle
          </button>
        )}
      </div>

      {msg && (
        <div
          style={{
            marginBottom: 12,
            padding: '9px 12px',
            borderRadius: 8,
            background: TP.greenLight,
            color: TP.green,
            fontSize: 12.5,
            fontWeight: 600,
          }}
        >
          {msg}
        </div>
      )}

      {ekleAcik && (
        <TabloEkle
          currentUser={currentUser}
          mevcutlar={sirali}
          onIptal={() => setEkleAcik(false)}
          onKaydedildi={() => {
            setEkleAcik(false);
            setMsg('Tablo kütüphaneye eklendi.');
            setTimeout(() => setMsg(''), 3000);
            yukle();
          }}
        />
      )}

      {tablolar === null ? (
        <div style={{ padding: 40, textAlign: 'center', color: TP.textMuted }}>Yükleniyor…</div>
      ) : sirali.length === 0 ? (
        <div
          style={{
            background: 'white',
            border: '1px dashed ' + TP.border,
            borderRadius: 12,
            padding: 36,
            textAlign: 'center',
            color: TP.textMuted,
            fontSize: 13.5,
            lineHeight: 1.6,
          }}
        >
          Kütüphanede henüz tablo yok. <b>“+ Tablo Ekle”</b> ile kurumun taban puan listesini
          yapıştırın ya da PDF olarak yükleyin.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {sirali.map((t) => (
            <TabloKarti key={t.id} tablo={t} onSil={sil} arama={arama} silebilir={silebilir} />
          ))}
        </div>
      )}
    </div>
  );
}

window.TabanPuanModuluApp = TabanPuanModuluApp;
