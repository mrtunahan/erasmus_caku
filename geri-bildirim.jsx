// ══════════════════════════════════════════════════════════════
// HATA / ÖNERİ BİLDİR — üst çubuktan açılan panel
//
// Herkes (öğrenci, akademisyen, memur, bölüm yetkilisi) bir modül seçip
// bildirim gönderir; kayıt bölümünün FAKÜLTE yetkilisine düşer. Fakülte
// yetkilisi yanıtlar ya da bölüm yetkilisine YÖNLENDİRİR. Yetki ve
// görünürlük sunucuda (server/routes/geri-bildirim.js); burası yalnız ekran.
// ══════════════════════════════════════════════════════════════

const { useState, useEffect, useCallback, useMemo } = React;

const R = {
  navy: '#1B2A4A',
  accent: '#0F766E',
  pale: '#F0FDFA',
  border: '#E2E8F0',
  text: '#1E293B',
  muted: '#64748B',
  danger: '#B91C1C',
};
const TURLER = [
  ['hata', 'Hata'],
  ['oneri', 'Öneri'],
  ['soru', 'Soru'],
];
const DURUM_RENK = {
  yeni: ['#FEF3C7', '#92400E'],
  incelemede: ['#DBEAFE', '#1E40AF'],
  yonlendirildi: ['#EDE9FE', '#5B21B6'],
  cozuldu: ['#DCFCE7', '#166534'],
  kapatildi: ['#F1F5F9', '#475569'],
};

async function istek(yol, govde) {
  let token = '';
  try {
    token = localStorage.getItem('caku_auth_token') || '';
  } catch (_) {
    token = '';
  }
  const r = await fetch('/api/geri-bildirim' + yol, {
    method: govde ? 'POST' : 'GET',
    credentials: 'include',
    headers: Object.assign(
      { 'Content-Type': 'application/json' },
      token ? { Authorization: 'Bearer ' + token } : {}
    ),
    body: govde ? JSON.stringify(govde) : undefined,
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || 'İşlem yapılamadı (HTTP ' + r.status + ').');
  return j;
}

/** Seçilebilir modüller: uygulamanın modül listeleri + genel başlıklar. */
function modulSecenekleri() {
  const gorulen = new Set();
  const out = [{ id: 'genel', ad: 'Genel (giriş, hesap, şifre)' }];
  []
    .concat(
      window.DEPARTMENT_MODULES || [],
      window.COMMON_MODULES || [],
      window.ADMIN_MODULES || []
    )
    .forEach((m) => {
      if (!m || !m.id || gorulen.has(m.id)) return;
      gorulen.add(m.id);
      out.push({ id: m.id, ad: m.label || m.id });
    });
  out.push({ id: 'diger', ad: 'Diğer' });
  return out;
}

const tarih = (iso) => {
  const d = new Date(iso);
  return isNaN(d) ? '' : d.toLocaleString('tr-TR', { dateStyle: 'short', timeStyle: 'short' });
};

const kutu = {
  width: '100%',
  padding: '9px 11px',
  border: '1px solid ' + R.border,
  borderRadius: 8,
  fontSize: 14,
  fontFamily: 'inherit',
  boxSizing: 'border-box',
  background: 'white',
};
const etiket = {
  display: 'block',
  fontSize: 12,
  fontWeight: 600,
  color: R.muted,
  margin: '0 0 4px',
};
const dugme = (ana) => ({
  padding: '9px 16px',
  borderRadius: 8,
  border: ana ? 'none' : '1px solid ' + R.border,
  background: ana ? R.accent : 'white',
  color: ana ? 'white' : R.text,
  fontWeight: 600,
  fontSize: 13,
  cursor: 'pointer',
  fontFamily: 'inherit',
});

function DurumRozeti({ durum, ad }) {
  const [bg, fg] = DURUM_RENK[durum] || DURUM_RENK.kapatildi;
  return (
    <span
      style={{
        background: bg,
        color: fg,
        borderRadius: 999,
        padding: '2px 9px',
        fontSize: 11.5,
        fontWeight: 700,
        whiteSpace: 'nowrap',
      }}
    >
      {ad || durum}
    </span>
  );
}

function YeniBildirim({ currentRoute, onGonderildi }) {
  const moduller = useMemo(modulSecenekleri, []);
  const [tur, setTur] = useState('hata');
  const [modul, setModul] = useState(() =>
    moduller.some((m) => m.id === currentRoute) ? currentRoute : 'genel'
  );
  const [konu, setKonu] = useState('');
  const [metin, setMetin] = useState('');
  const [gonderiliyor, setGonderiliyor] = useState(false);
  const [hata, setHata] = useState('');

  const gonder = async () => {
    setHata('');
    setGonderiliyor(true);
    try {
      await istek('', {
        tur,
        modul,
        modulAd: (moduller.find((m) => m.id === modul) || {}).ad || modul,
        konu,
        metin,
        sayfa: currentRoute || '',
        tarayici: navigator.userAgent,
      });
      setKonu('');
      setMetin('');
      onGonderildi();
    } catch (e) {
      setHata(e.message);
    } finally {
      setGonderiliyor(false);
    }
  };

  return (
    <div style={{ display: 'grid', gap: 14 }} data-geri-bildirim-yeni>
      <div style={{ fontSize: 13, color: R.muted, lineHeight: 1.5 }}>
        Bildiriminiz fakültenizin yetkilisine iletilir; gerekirse ilgili bölüm yetkilisine
        yönlendirilir. Yanıtları ve durumu <b>Bildirimlerim</b> sekmesinden ve zilden takip
        edebilirsiniz.
      </div>
      <div>
        <span style={etiket}>Tür</span>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {TURLER.map(([id, ad]) => (
            <button
              key={id}
              type="button"
              onClick={() => setTur(id)}
              style={{
                ...dugme(false),
                background: tur === id ? R.pale : 'white',
                borderColor: tur === id ? R.accent : R.border,
                color: tur === id ? R.accent : R.text,
              }}
            >
              {ad}
            </button>
          ))}
        </div>
      </div>
      <label>
        <span style={etiket}>İlgili modül</span>
        <select value={modul} onChange={(e) => setModul(e.target.value)} style={kutu}>
          {moduller.map((m) => (
            <option key={m.id} value={m.id}>
              {m.ad}
            </option>
          ))}
        </select>
      </label>
      <label>
        <span style={etiket}>Konu</span>
        <input
          value={konu}
          maxLength={150}
          onChange={(e) => setKonu(e.target.value)}
          placeholder="Ör. Staj defteri yüklenmiyor"
          style={kutu}
        />
      </label>
      <label>
        <span style={etiket}>Açıklama</span>
        <textarea
          value={metin}
          maxLength={4000}
          rows={6}
          onChange={(e) => setMetin(e.target.value)}
          placeholder={
            tur === 'hata'
              ? 'Ne yapmaya çalışıyordunuz, ne oldu? Gördüğünüz hata mesajını da yazın.'
              : 'Önerinizi ya da sorunuzu yazın.'
          }
          style={{ ...kutu, resize: 'vertical' }}
        />
      </label>
      {hata && <div style={{ color: R.danger, fontSize: 13 }}>{hata}</div>}
      <div>
        <button
          type="button"
          disabled={gonderiliyor}
          onClick={gonder}
          style={{ ...dugme(true), opacity: gonderiliyor ? 0.6 : 1 }}
          data-geri-bildirim-gonder
        >
          {gonderiliyor ? 'Gönderiliyor…' : 'Gönder'}
        </button>
      </div>
    </div>
  );
}

function KayitListesi({ kayitlar, onSec, bos, yetkiliGorunumu }) {
  if (!kayitlar.length) {
    return <div style={{ color: R.muted, fontSize: 13, padding: '18px 0' }}>{bos}</div>;
  }
  return (
    <div style={{ display: 'grid', gap: 8 }}>
      {kayitlar.map((k) => (
        <button
          key={k.id}
          type="button"
          onClick={() => onSec(k.id)}
          style={{
            textAlign: 'left',
            border: '1px solid ' + R.border,
            borderRadius: 10,
            background: 'white',
            padding: '10px 12px',
            cursor: 'pointer',
            fontFamily: 'inherit',
          }}
        >
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <DurumRozeti durum={k.durum} ad={k.durumAd} />
            <span style={{ fontSize: 12, color: R.muted }}>
              {k.turAd} · {k.modulAd}
            </span>
            <span style={{ marginLeft: 'auto', fontSize: 11.5, color: R.muted }}>
              {tarih(k.guncellendi || k.olusturuldu)}
            </span>
          </div>
          <div style={{ fontWeight: 600, color: R.text, marginTop: 4, fontSize: 14 }}>{k.konu}</div>
          {yetkiliGorunumu && (
            <div style={{ fontSize: 12, color: R.muted, marginTop: 2 }}>
              {(k.gonderen && k.gonderen.ad) || ''} · {k.bolumAd || ''}
              {k.yonlendirilenBolumAd ? ' → ' + k.yonlendirilenBolumAd : ''}
            </div>
          )}
        </button>
      ))}
    </div>
  );
}

function KayitAyrinti({ kayit, bolumler, onGeri, onGuncellendi }) {
  const [mesaj, setMesaj] = useState('');
  const [bolum, setBolum] = useState('');
  const [not, setNot] = useState('');
  const [mesgul, setMesgul] = useState(false);
  const [hata, setHata] = useState('');
  const yetkili = !!kayit.sifat;

  const islem = async (yol, govde) => {
    setHata('');
    setMesgul(true);
    try {
      const r = await istek('/' + encodeURIComponent(kayit.id) + yol, govde);
      onGuncellendi(r.kayit);
      return true;
    } catch (e) {
      setHata(e.message);
      return false;
    } finally {
      setMesgul(false);
    }
  };

  return (
    <div style={{ display: 'grid', gap: 12 }} data-geri-bildirim-ayrinti>
      <button type="button" onClick={onGeri} style={{ ...dugme(false), justifySelf: 'start' }}>
        ← Listeye dön
      </button>
      <div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <DurumRozeti durum={kayit.durum} ad={kayit.durumAd} />
          <span style={{ fontSize: 12, color: R.muted }}>
            {kayit.turAd} · {kayit.modulAd} · {tarih(kayit.olusturuldu)}
          </span>
        </div>
        <h3 style={{ margin: '6px 0 4px', fontSize: 17, color: R.navy }}>{kayit.konu}</h3>
        {yetkili && (
          <div style={{ fontSize: 12.5, color: R.muted }}>
            Gönderen: <b>{kayit.gonderen && kayit.gonderen.ad}</b>
            {kayit.gonderen && kayit.gonderen.etiket
              ? ' (' + kayit.gonderen.etiket + ')'
              : ''} · {kayit.bolumAd}
            {kayit.yonlendirilenBolumAd ? ' · Yönlendirilen: ' + kayit.yonlendirilenBolumAd : ''}
          </div>
        )}
        <div
          style={{
            whiteSpace: 'pre-wrap',
            marginTop: 8,
            padding: 12,
            background: '#F8FAFC',
            borderRadius: 8,
            fontSize: 14,
            color: R.text,
          }}
        >
          {kayit.metin}
        </div>
        {yetkili && kayit.tarayici && (
          <div style={{ fontSize: 11, color: R.muted, marginTop: 4 }}>
            Ekran: {kayit.sayfa || '—'} · Tarayıcı: {kayit.tarayici}
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gap: 8 }}>
        <div style={etiket}>Yazışma</div>
        {kayit.mesajlar.length === 0 && (
          <div style={{ fontSize: 13, color: R.muted }}>Henüz yanıt yok.</div>
        )}
        {kayit.mesajlar.map((m, i) => (
          <div
            key={i}
            style={{
              padding: '8px 11px',
              borderRadius: 8,
              background: m.ic ? '#FFFBEB' : m.rol === 'yetkili' ? R.pale : '#F1F5F9',
              fontSize: 13.5,
            }}
          >
            <div style={{ fontSize: 11.5, color: R.muted, marginBottom: 2 }}>
              <b>{m.ad}</b> · {tarih(m.zaman)}
              {m.ic ? ' · yalnız yetkililer görür' : ''}
            </div>
            <div style={{ whiteSpace: 'pre-wrap', color: R.text }}>{m.metin}</div>
          </div>
        ))}
        {kayit.durum !== 'kapatildi' || yetkili ? (
          <div style={{ display: 'grid', gap: 6 }}>
            <textarea
              rows={3}
              value={mesaj}
              maxLength={3000}
              onChange={(e) => setMesaj(e.target.value)}
              placeholder={yetkili ? 'Gönderene yanıt yazın…' : 'Ek bilgi ya da yanıt yazın…'}
              style={{ ...kutu, resize: 'vertical' }}
            />
            <button
              type="button"
              disabled={mesgul || !mesaj.trim()}
              onClick={async () => {
                if (await islem('/mesaj', { metin: mesaj })) setMesaj('');
              }}
              style={{ ...dugme(true), justifySelf: 'start', opacity: mesgul ? 0.6 : 1 }}
            >
              Gönder
            </button>
          </div>
        ) : null}
      </div>

      {yetkili && (
        <div
          style={{
            display: 'grid',
            gap: 10,
            borderTop: '1px solid ' + R.border,
            paddingTop: 12,
          }}
        >
          <div style={etiket}>Durum</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {[
              ['incelemede', 'İnceleniyor'],
              ['cozuldu', 'Çözüldü'],
              ['kapatildi', 'Kapat'],
            ].map(([d, ad]) => (
              <button
                key={d}
                type="button"
                disabled={mesgul || kayit.durum === d}
                onClick={() => islem('/durum', { durum: d })}
                style={{ ...dugme(false), opacity: kayit.durum === d ? 0.5 : 1 }}
              >
                {ad}
              </button>
            ))}
          </div>
          {kayit.yonlendirebilir && (
            <div style={{ display: 'grid', gap: 6 }}>
              <div style={etiket}>Bölüm yetkilisine yönlendir</div>
              <select value={bolum} onChange={(e) => setBolum(e.target.value)} style={kutu}>
                <option value="">— Bölüm seçin —</option>
                {bolumler.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.ad}
                  </option>
                ))}
              </select>
              <input
                value={not}
                maxLength={3000}
                onChange={(e) => setNot(e.target.value)}
                placeholder="Bölüm yetkilisine not (isteğe bağlı, gönderen görmez)"
                style={kutu}
              />
              <button
                type="button"
                disabled={mesgul || !bolum}
                onClick={async () => {
                  if (await islem('/yonlendir', { bolumId: bolum, not })) {
                    setBolum('');
                    setNot('');
                  }
                }}
                style={{ ...dugme(true), justifySelf: 'start', opacity: !bolum ? 0.6 : 1 }}
              >
                Yönlendir
              </button>
            </div>
          )}
          {Array.isArray(kayit.gecmis) && kayit.gecmis.length > 0 && (
            <div style={{ fontSize: 11.5, color: R.muted, lineHeight: 1.6 }}>
              {kayit.gecmis.map((g, i) => (
                <div key={i}>
                  {tarih(g.zaman)} · {g.kim} ·{' '}
                  {g.olay === 'olusturuldu'
                    ? 'oluşturdu'
                    : g.olay === 'yonlendirildi'
                      ? g.detay + ' bölümüne yönlendirdi'
                      : 'durumu değiştirdi: ' + g.detay}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      {hata && <div style={{ color: R.danger, fontSize: 13 }}>{hata}</div>}
    </div>
  );
}

function GeriBildirimPaneli({ currentRoute, acilacakKayit, onKapat, onDegisti }) {
  const [sekme, setSekme] = useState(acilacakKayit ? 'liste' : 'yeni');
  const [veri, setVeri] = useState({ benim: [], gelen: [], yetkili: false, bolumler: [] });
  const [secili, setSecili] = useState(acilacakKayit || '');
  const [hata, setHata] = useState('');
  const [tesekkur, setTesekkur] = useState(false);

  const yukle = useCallback(async () => {
    try {
      const j = await istek('');
      setVeri(j);
      setHata('');
      if (onDegisti) onDegisti();
    } catch (e) {
      setHata(e.message);
    }
  }, [onDegisti]);
  useEffect(() => {
    yukle();
  }, [yukle]);
  useEffect(() => {
    if (acilacakKayit) setSecili(acilacakKayit);
  }, [acilacakKayit]);

  const tum = veri.gelen.concat(veri.benim);
  const seciliKayit = secili ? tum.find((k) => k.id === secili) : null;
  const guncelle = (yeni) => {
    if (!yeni) return;
    setVeri((v) => ({
      ...v,
      benim: v.benim.map((k) => (k.id === yeni.id ? yeni : k)),
      gelen: v.gelen.map((k) => (k.id === yeni.id ? yeni : k)),
    }));
    if (onDegisti) onDegisti();
  };

  const sekmeler = [
    ['yeni', 'Yeni bildirim'],
    ['liste', 'Bildirimlerim (' + veri.benim.length + ')'],
  ].concat(veri.yetkili ? [['gelen', 'Gelen kutusu (' + veri.gelen.length + ')']] : []);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Hata / öneri bildir"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onKapat();
      }}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15,23,42,0.45)',
        zIndex: 3000,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'flex-start',
        padding: '40px 16px',
        overflowY: 'auto',
        fontFamily: "'Inter', sans-serif",
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 720,
          background: 'white',
          borderRadius: 14,
          boxShadow: '0 20px 50px rgba(0,0,0,0.25)',
          padding: 20,
          boxSizing: 'border-box',
        }}
        data-geri-bildirim-paneli
      >
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
          <h2 style={{ margin: 0, fontSize: 18, color: R.navy }}>Hata / Öneri Bildir</h2>
          <button
            type="button"
            onClick={onKapat}
            aria-label="Kapat"
            style={{
              marginLeft: 'auto',
              border: 'none',
              background: 'transparent',
              fontSize: 22,
              cursor: 'pointer',
              color: R.muted,
            }}
          >
            ×
          </button>
        </div>
        <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap' }}>
          {sekmeler.map(([id, ad]) => (
            <button
              key={id}
              type="button"
              onClick={() => {
                setSekme(id);
                setSecili('');
                setTesekkur(false);
              }}
              style={{
                ...dugme(false),
                padding: '7px 12px',
                background: sekme === id && !seciliKayit ? R.pale : 'white',
                borderColor: sekme === id && !seciliKayit ? R.accent : R.border,
                color: sekme === id && !seciliKayit ? R.accent : R.text,
              }}
            >
              {ad}
            </button>
          ))}
        </div>
        {hata && <div style={{ color: R.danger, fontSize: 13, marginBottom: 8 }}>{hata}</div>}
        {seciliKayit ? (
          <KayitAyrinti
            kayit={seciliKayit}
            bolumler={veri.bolumler || []}
            onGeri={() => setSecili('')}
            onGuncellendi={guncelle}
          />
        ) : sekme === 'yeni' ? (
          tesekkur ? (
            <div style={{ padding: '20px 0', color: R.text }}>
              <b>Teşekkürler, bildiriminiz iletildi.</b>
              <div style={{ fontSize: 13, color: R.muted, marginTop: 6 }}>
                Yanıt geldiğinde zilden haber verilecek.
              </div>
              <button
                type="button"
                onClick={() => setTesekkur(false)}
                style={{ ...dugme(false), marginTop: 12 }}
              >
                Yeni bildirim
              </button>
            </div>
          ) : (
            <YeniBildirim
              currentRoute={currentRoute}
              onGonderildi={() => {
                setTesekkur(true);
                yukle();
              }}
            />
          )
        ) : sekme === 'gelen' ? (
          <KayitListesi
            kayitlar={veri.gelen}
            onSec={setSecili}
            bos="Size gelen bildirim yok."
            yetkiliGorunumu
          />
        ) : (
          <KayitListesi
            kayitlar={veri.benim}
            onSec={setSecili}
            bos="Henüz bildirim göndermediniz."
          />
        )}
      </div>
    </div>
  );
}

if (typeof window !== 'undefined') window.GeriBildirimPaneli = GeriBildirimPaneli;
export default GeriBildirimPaneli;
