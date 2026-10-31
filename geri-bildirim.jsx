// ══════════════════════════════════════════════════════════════
// HATA / ÖNERİ BİLDİR — sol menüden açılan panel
//
// Herkes yalnız GÖRDÜĞÜ modüller için bildirim gönderir; kayıt bölümünün
// FAKÜLTE yetkilisine düşer. Fakülte yetkilisi yanıtlar ya da bölüm
// yetkilisine YÖNLENDİRİR. Yetki ve görünürlük sunucuda
// (server/routes/geri-bildirim.js); burası yalnız ekran.
//
// Görsel dil uygulamanın teması: lacivert başlık bandı (CakuBanner ile aynı
// geçiş), turkuaz birincil renk, beyaz kartlar, yumuşak gölge.
// ══════════════════════════════════════════════════════════════

const { useState, useEffect, useCallback, useMemo } = React;

const T = {
  navy: '#1B2A4A',
  navy2: '#2D4A7A',
  primary: '#0F766E',
  primaryStrong: '#115E59',
  primaryPale: '#F0FDFA',
  bg: '#F5F7FA',
  surface: '#FFFFFF',
  muted: '#F8FAFC',
  border: '#E2E8F0',
  borderSoft: '#EEF2F6',
  text: '#1E293B',
  textMuted: '#64748B',
  danger: '#DC2626',
  dangerPale: '#FEF2F2',
  warning: '#D97706',
  warningPale: '#FFFBEB',
  success: '#059669',
  successPale: '#ECFDF5',
};
const FONT = "'Inter', sans-serif";

const TURLER = [
  {
    id: 'hata',
    ad: 'Hata',
    aciklama: 'Bir şey çalışmıyor ya da yanlış görünüyor',
    renk: T.danger,
    zemin: T.dangerPale,
    ikon: 'M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z',
  },
  {
    id: 'oneri',
    ad: 'Öneri',
    aciklama: 'Bir iyileştirme ya da yeni özellik fikri',
    renk: T.primary,
    zemin: T.primaryPale,
    ikon: 'M9 18h6M10 22h4M12 2a7 7 0 00-4 12.7V17h8v-2.3A7 7 0 0012 2z',
  },
  {
    id: 'soru',
    ad: 'Soru',
    aciklama: 'Bir işlemin nasıl yapıldığını sorun',
    renk: '#2563EB',
    zemin: '#EFF6FF',
    ikon: 'M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3M12 17h.01M12 22a10 10 0 100-20 10 10 0 000 20z',
  },
];
const DURUM = {
  yeni: { ad: 'Yeni', renk: '#92400E', zemin: '#FEF3C7', serit: '#F59E0B' },
  incelemede: { ad: 'İnceleniyor', renk: '#1E40AF', zemin: '#DBEAFE', serit: '#3B82F6' },
  yonlendirildi: {
    ad: 'Bölüme yönlendirildi',
    renk: '#5B21B6',
    zemin: '#EDE9FE',
    serit: '#8B5CF6',
  },
  cozuldu: { ad: 'Çözüldü', renk: '#166534', zemin: '#DCFCE7', serit: '#22C55E' },
  kapatildi: { ad: 'Kapatıldı', renk: '#475569', zemin: '#F1F5F9', serit: '#94A3B8' },
};
const turBilgisi = (id) => TURLER.find((t) => t.id === id) || TURLER[0];

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

/**
 * Seçilebilir modüller. `gorunen` sol menünün o an gösterdiği modüllerdir
 * (app-shell → Sidebar): herkes yalnız gördüğü modül için bildirim gönderir.
 * Verilmezse (ör. test) uygulamanın modül listesi kullanılır.
 */
function modulSecenekleri(gorunen) {
  const gorulen = new Set(['genel', 'diger']);
  const kaynak =
    Array.isArray(gorunen) && gorunen.length
      ? gorunen
      : []
          .concat(
            window.DEPARTMENT_MODULES || [],
            window.COMMON_MODULES || [],
            window.ADMIN_MODULES || []
          )
          .map((m) => ({ id: m.id, ad: m.label || m.id }));
  return [{ id: 'genel', ad: 'Genel (giriş, hesap, şifre)' }]
    .concat(kaynak.filter((m) => m && m.id && !gorulen.has(m.id) && gorulen.add(m.id)))
    .concat([{ id: 'diger', ad: 'Diğer' }]);
}

const tarih = (iso) => {
  const d = new Date(iso);
  return isNaN(d) ? '' : d.toLocaleString('tr-TR', { dateStyle: 'medium', timeStyle: 'short' });
};
const goreli = (iso) => {
  const d = new Date(iso);
  if (isNaN(d)) return '';
  const dk = Math.round((Date.now() - d.getTime()) / 60000);
  if (dk < 1) return 'şimdi';
  if (dk < 60) return dk + ' dk önce';
  const sa = Math.round(dk / 60);
  if (sa < 24) return sa + ' sa önce';
  const g = Math.round(sa / 24);
  return g < 7 ? g + ' gün önce' : d.toLocaleDateString('tr-TR');
};
const basHarf = (ad) =>
  String(ad || '?')
    .replace(/(prof|doç|dr|öğr|gör|arş|üyesi)\.?/gi, ' ')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p.charAt(0))
    .join('')
    .toLocaleUpperCase('tr-TR') || '?';

// ── Küçük yapı taşları ──
function Ikon({ d, boyut = 18, renk = 'currentColor', kalin = 2 }) {
  return (
    <svg
      width={boyut}
      height={boyut}
      viewBox="0 0 24 24"
      fill="none"
      stroke={renk}
      strokeWidth={kalin}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={d} />
    </svg>
  );
}
const kart = {
  background: T.surface,
  border: '1px solid ' + T.border,
  borderRadius: 12,
  boxShadow: '0 1px 2px rgba(16,24,40,0.04)',
};
const girdi = {
  width: '100%',
  padding: '10px 12px',
  border: '1px solid ' + T.border,
  borderRadius: 10,
  fontSize: 14,
  fontFamily: FONT,
  color: T.text,
  background: T.surface,
  boxSizing: 'border-box',
  outline: 'none',
};
const etiketStil = {
  display: 'block',
  fontSize: 12.5,
  fontWeight: 600,
  color: T.text,
  margin: '0 0 6px',
};
function Dugme({ ana, tehlike, kucuk, children, style, ...p }) {
  return (
    <button
      type="button"
      {...p}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        padding: kucuk ? '7px 12px' : '10px 18px',
        borderRadius: 10,
        border: ana || tehlike ? 'none' : '1px solid ' + T.border,
        background: ana ? T.primary : tehlike ? T.danger : T.surface,
        color: ana || tehlike ? '#FFFFFF' : T.text,
        fontWeight: 600,
        fontSize: kucuk ? 12.5 : 13.5,
        fontFamily: FONT,
        cursor: p.disabled ? 'not-allowed' : 'pointer',
        opacity: p.disabled ? 0.55 : 1,
        transition: 'background 0.15s',
        ...style,
      }}
    >
      {children}
    </button>
  );
}
function DurumRozeti({ durum }) {
  const d = DURUM[durum] || DURUM.kapatildi;
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        background: d.zemin,
        color: d.renk,
        borderRadius: 999,
        padding: '3px 10px',
        fontSize: 11.5,
        fontWeight: 700,
        whiteSpace: 'nowrap',
      }}
    >
      <span style={{ width: 6, height: 6, borderRadius: 3, background: d.serit }} />
      {d.ad}
    </span>
  );
}
function TurRozeti({ tur }) {
  const t = turBilgisi(tur);
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        color: t.renk,
        background: t.zemin,
        borderRadius: 999,
        padding: '3px 9px',
        fontSize: 11.5,
        fontWeight: 600,
      }}
    >
      <Ikon d={t.ikon} boyut={12} renk={t.renk} />
      {t.ad}
    </span>
  );
}
function Bilgi({ children, ton = 'bilgi' }) {
  const r =
    ton === 'uyari'
      ? [T.warningPale, '#92400E', '#FDE68A']
      : [T.primaryPale, T.primaryStrong, '#99F6E4'];
  return (
    <div
      style={{
        background: r[0],
        color: r[1],
        border: '1px solid ' + r[2],
        borderRadius: 10,
        padding: '10px 12px',
        fontSize: 13,
        lineHeight: 1.55,
      }}
    >
      {children}
    </div>
  );
}
function Bolum({ no, baslik, children }) {
  return (
    <section style={{ display: 'grid', gap: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span
          style={{
            width: 22,
            height: 22,
            borderRadius: 11,
            background: T.navy,
            color: '#FFFFFF',
            fontSize: 12,
            fontWeight: 700,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {no}
        </span>
        <span style={{ fontSize: 14, fontWeight: 700, color: T.navy }}>{baslik}</span>
      </div>
      {children}
    </section>
  );
}

// ── Yeni bildirim ──
function YeniBildirim({ currentRoute, gorunenModuller, onGonderildi }) {
  const moduller = useMemo(() => modulSecenekleri(gorunenModuller), [gorunenModuller]);
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
    <div style={{ display: 'grid', gap: 20 }} data-geri-bildirim-yeni>
      <Bilgi>
        <b>Kime gider?</b> Bildiriminiz fakültenizin yetkilisine iletilir; gerekirse ilgili bölüm
        yetkilisine yönlendirilir. Yanıt gelince zilden ve bu menüdeki rozetten haber alırsınız.
      </Bilgi>

      <Bolum no="1" baslik="Ne bildirmek istiyorsunuz?">
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
            gap: 10,
          }}
        >
          {TURLER.map((t) => {
            const secili = tur === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTur(t.id)}
                aria-pressed={secili}
                style={{
                  ...kart,
                  textAlign: 'left',
                  padding: 12,
                  cursor: 'pointer',
                  fontFamily: FONT,
                  borderColor: secili ? t.renk : T.border,
                  boxShadow: secili ? '0 0 0 3px ' + t.zemin : kart.boxShadow,
                  display: 'grid',
                  gap: 4,
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span
                    style={{
                      width: 30,
                      height: 30,
                      borderRadius: 8,
                      background: t.zemin,
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Ikon d={t.ikon} boyut={16} renk={t.renk} />
                  </span>
                  <b style={{ fontSize: 14, color: T.text }}>{t.ad}</b>
                </span>
                <span style={{ fontSize: 12, color: T.textMuted, lineHeight: 1.4 }}>
                  {t.aciklama}
                </span>
              </button>
            );
          })}
        </div>
      </Bolum>

      <Bolum no="2" baslik="Hangi modülle ilgili?">
        <select value={modul} onChange={(e) => setModul(e.target.value)} style={girdi}>
          {moduller.map((m) => (
            <option key={m.id} value={m.id}>
              {m.ad}
            </option>
          ))}
        </select>
        <div style={{ fontSize: 12, color: T.textMuted }}>
          Yalnız erişiminiz olan modüller listelenir.
        </div>
      </Bolum>

      <Bolum no="3" baslik="Ayrıntılar">
        <label>
          <span style={etiketStil}>Konu</span>
          <input
            value={konu}
            maxLength={150}
            onChange={(e) => setKonu(e.target.value)}
            placeholder="Ör. Staj defteri yüklenmiyor"
            style={girdi}
          />
        </label>
        <label>
          <span style={etiketStil}>Açıklama</span>
          <textarea
            value={metin}
            maxLength={4000}
            rows={6}
            onChange={(e) => setMetin(e.target.value)}
            placeholder={
              tur === 'hata'
                ? 'Ne yapmaya çalışıyordunuz, ne oldu? Gördüğünüz hata mesajını da yazın.'
                : tur === 'oneri'
                  ? 'Önerinizi ve neden faydalı olacağını yazın.'
                  : 'Sorunuzu yazın.'
            }
            style={{ ...girdi, resize: 'vertical', lineHeight: 1.5 }}
          />
          <span
            style={{
              display: 'block',
              textAlign: 'right',
              fontSize: 11.5,
              color: T.textMuted,
              marginTop: 4,
            }}
          >
            {metin.length} / 4000
          </span>
        </label>
      </Bolum>

      {hata && (
        <div role="alert" style={{ color: T.danger, fontSize: 13, fontWeight: 600 }}>
          {hata}
        </div>
      )}
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <Dugme ana disabled={gonderiliyor} onClick={gonder} data-geri-bildirim-gonder>
          <Ikon d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" boyut={15} />
          {gonderiliyor ? 'Gönderiliyor…' : 'Bildirimi gönder'}
        </Dugme>
      </div>
    </div>
  );
}

// ── Liste ──
function KayitListesi({ kayitlar, onSec, bos, yetkiliGorunumu }) {
  const [suzgec, setSuzgec] = useState('acik');
  const acik = (k) => !['cozuldu', 'kapatildi'].includes(k.durum);
  const gorunen = kayitlar.filter((k) =>
    suzgec === 'hepsi' ? true : suzgec === 'acik' ? acik(k) : !acik(k)
  );
  const sayi = {
    acik: kayitlar.filter(acik).length,
    kapali: kayitlar.filter((k) => !acik(k)).length,
  };

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      {kayitlar.length > 0 && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {[
            ['acik', 'Açık (' + sayi.acik + ')'],
            ['kapali', 'Çözülen / kapanan (' + sayi.kapali + ')'],
            ['hepsi', 'Tümü (' + kayitlar.length + ')'],
          ].map(([id, ad]) => (
            <button
              key={id}
              type="button"
              onClick={() => setSuzgec(id)}
              style={{
                padding: '5px 12px',
                borderRadius: 999,
                border: '1px solid ' + (suzgec === id ? T.primary : T.border),
                background: suzgec === id ? T.primaryPale : T.surface,
                color: suzgec === id ? T.primary : T.textMuted,
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: FONT,
              }}
            >
              {ad}
            </button>
          ))}
        </div>
      )}
      {gorunen.length === 0 ? (
        <div
          style={{
            ...kart,
            padding: '32px 16px',
            textAlign: 'center',
            color: T.textMuted,
            fontSize: 13.5,
            background: T.muted,
          }}
        >
          <Ikon
            d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"
            boyut={28}
            renk="#CBD5E1"
          />
          <div style={{ marginTop: 8 }}>{kayitlar.length ? 'Bu süzgeçte kayıt yok.' : bos}</div>
        </div>
      ) : (
        gorunen.map((k) => {
          const d = DURUM[k.durum] || DURUM.kapatildi;
          return (
            <button
              key={k.id}
              type="button"
              onClick={() => onSec(k.id)}
              data-geri-bildirim-kayit
              style={{
                ...kart,
                textAlign: 'left',
                padding: '12px 14px 12px 16px',
                cursor: 'pointer',
                fontFamily: FONT,
                borderLeft: '4px solid ' + d.serit,
                display: 'grid',
                gap: 6,
              }}
            >
              <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                <DurumRozeti durum={k.durum} />
                <TurRozeti tur={k.tur} />
                {k.yeniYanit && (
                  <span
                    style={{
                      background: T.danger,
                      color: '#FFFFFF',
                      borderRadius: 999,
                      padding: '3px 9px',
                      fontSize: 11,
                      fontWeight: 700,
                    }}
                  >
                    Yeni yanıt
                  </span>
                )}
                <span style={{ marginLeft: 'auto', fontSize: 11.5, color: T.textMuted }}>
                  {goreli(k.guncellendi || k.olusturuldu)}
                </span>
              </div>
              <div style={{ fontWeight: 700, color: T.text, fontSize: 14.5 }}>{k.konu}</div>
              <div style={{ fontSize: 12.5, color: T.textMuted }}>
                {k.modulAd}
                {yetkiliGorunumu && k.gonderen
                  ? ' · ' + k.gonderen.ad + ' · ' + (k.bolumAd || '—')
                  : ''}
                {k.yonlendirilenBolumAd ? ' → ' + k.yonlendirilenBolumAd : ''}
                {k.mesajlar && k.mesajlar.length ? ' · ' + k.mesajlar.length + ' mesaj' : ''}
              </div>
            </button>
          );
        })
      )}
    </div>
  );
}

// ── Durum adımları ──
function DurumAdimlari({ kayit }) {
  const adimlar = [
    ['yeni', 'Gönderildi'],
    ['incelemede', 'İnceleniyor'],
  ]
    .concat(
      kayit.yonlendirilenBolum || kayit.durum === 'yonlendirildi'
        ? [['yonlendirildi', 'Bölümde']]
        : []
    )
    .concat([
      [
        kayit.durum === 'kapatildi' ? 'kapatildi' : 'cozuldu',
        kayit.durum === 'kapatildi' ? 'Kapatıldı' : 'Çözüldü',
      ],
    ]);
  const sira = adimlar.map((a) => a[0]);
  let aktif = sira.indexOf(kayit.durum);
  if (aktif < 0) aktif = 0;
  return (
    <div
      style={{ display: 'flex', alignItems: 'center', gap: 0, margin: '4px 0' }}
      aria-label="Durum"
    >
      {adimlar.map(([id, ad], i) => {
        const tamam = i <= aktif;
        return (
          <React.Fragment key={id}>
            {i > 0 && (
              <div
                style={{
                  flex: 1,
                  height: 2,
                  background: i <= aktif ? T.primary : T.border,
                  minWidth: 12,
                }}
              />
            )}
            <div style={{ display: 'grid', justifyItems: 'center', gap: 4, minWidth: 64 }}>
              <span
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 11,
                  background: tamam ? T.primary : T.surface,
                  border: '2px solid ' + (tamam ? T.primary : T.border),
                  color: '#FFFFFF',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {tamam && <Ikon d="M20 6L9 17l-5-5" boyut={12} kalin={3} />}
              </span>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: i === aktif ? 700 : 500,
                  color: tamam ? T.text : T.textMuted,
                  textAlign: 'center',
                }}
              >
                {ad}
              </span>
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
}

function Balon({ ad, rol, zaman, ic, sag, children }) {
  return (
    <div
      style={{
        display: 'flex',
        gap: 8,
        flexDirection: sag ? 'row-reverse' : 'row',
        alignItems: 'flex-end',
      }}
    >
      <span
        style={{
          width: 30,
          height: 30,
          borderRadius: 15,
          flexShrink: 0,
          background: sag ? T.primary : T.navy,
          color: '#FFFFFF',
          fontSize: 11,
          fontWeight: 700,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {basHarf(ad)}
      </span>
      <div
        style={{
          maxWidth: '78%',
          background: ic ? T.warningPale : sag ? T.primaryPale : T.muted,
          border: '1px solid ' + (ic ? '#FDE68A' : sag ? '#99F6E4' : T.border),
          borderRadius: 12,
          borderBottomRightRadius: sag ? 4 : 12,
          borderBottomLeftRadius: sag ? 12 : 4,
          padding: '8px 12px',
        }}
      >
        <div style={{ fontSize: 11.5, color: T.textMuted, marginBottom: 3 }}>
          <b style={{ color: T.text }}>{ad}</b>
          {rol ? ' · ' + rol : ''} · {tarih(zaman)}
          {ic ? ' · yalnız yetkililer görür' : ''}
        </div>
        <div style={{ whiteSpace: 'pre-wrap', color: T.text, fontSize: 13.5, lineHeight: 1.5 }}>
          {children}
        </div>
      </div>
    </div>
  );
}

// ── Ayrıntı ──
function KayitAyrinti({ kayit, bolumler, onGeri, onGuncellendi }) {
  const [mesaj, setMesaj] = useState('');
  const [bolum, setBolum] = useState('');
  const [not, setNot] = useState('');
  const [mesgul, setMesgul] = useState(false);
  const [hata, setHata] = useState('');
  const yetkili = !!kayit.sifat;
  const gonderenAdi = (kayit.gonderen && kayit.gonderen.ad) || 'Gönderen';

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

  const yazabilir = kayit.durum !== 'kapatildi' || yetkili;
  return (
    <div style={{ display: 'grid', gap: 14 }} data-geri-bildirim-ayrinti>
      <div>
        <Dugme kucuk onClick={onGeri}>
          <Ikon d="M19 12H5M12 19l-7-7 7-7" boyut={14} /> Listeye dön
        </Dugme>
      </div>

      <div style={{ ...kart, padding: 16, display: 'grid', gap: 10 }}>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
          <DurumRozeti durum={kayit.durum} />
          <TurRozeti tur={kayit.tur} />
          <span style={{ fontSize: 12, color: T.textMuted }}>
            {kayit.modulAd} · {tarih(kayit.olusturuldu)}
          </span>
        </div>
        <h3 style={{ margin: 0, fontSize: 18, color: T.navy, lineHeight: 1.3 }}>{kayit.konu}</h3>
        {yetkili && (
          <div style={{ fontSize: 12.5, color: T.textMuted }}>
            Gönderen: <b style={{ color: T.text }}>{gonderenAdi}</b>
            {kayit.gonderen && kayit.gonderen.etiket ? ' (' + kayit.gonderen.etiket + ')' : ''}
            {kayit.bolumAd ? ' · ' + kayit.bolumAd : ''}
            {kayit.yonlendirilenBolumAd ? ' · Yönlendirilen: ' + kayit.yonlendirilenBolumAd : ''}
          </div>
        )}
        <DurumAdimlari kayit={kayit} />
      </div>

      <div style={{ ...kart, padding: 16, display: 'grid', gap: 12 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: T.navy }}>Yazışma</div>
        <Balon ad={gonderenAdi} rol={kayit.benim ? 'siz' : 'gönderen'} zaman={kayit.olusturuldu}>
          {kayit.metin}
        </Balon>
        {kayit.mesajlar.map((m, i) => (
          <Balon
            key={i}
            ad={m.ad}
            rol={m.rol === 'yetkili' ? 'yetkili' : kayit.benim ? 'siz' : 'gönderen'}
            zaman={m.zaman}
            ic={m.ic}
            sag={m.rol === 'yetkili'}
          >
            {m.metin}
          </Balon>
        ))}
        {kayit.mesajlar.length === 0 && (
          <div
            style={{ fontSize: 12.5, color: T.textMuted, textAlign: 'center', padding: '4px 0' }}
          >
            {yetkili
              ? 'Henüz yanıt yazılmadı.'
              : 'Yanıt bekleniyor. Yanıt gelince zilden haber verilecek.'}
          </div>
        )}
        {yetkili && kayit.tarayici && (
          <div
            style={{
              fontSize: 11,
              color: T.textMuted,
              borderTop: '1px dashed ' + T.border,
              paddingTop: 8,
            }}
          >
            Gönderildiği ekran: {kayit.sayfa || '—'} · Tarayıcı: {kayit.tarayici}
          </div>
        )}
        {yazabilir ? (
          <div
            style={{
              display: 'grid',
              gap: 8,
              borderTop: '1px solid ' + T.borderSoft,
              paddingTop: 12,
            }}
          >
            {yetkili && (
              <div style={{ fontSize: 12, color: T.textMuted }}>
                {kayit.gonderen && kayit.gonderen.rol === 'ziyaretci'
                  ? 'Bu talep giriş ekranından geldi; yanıtınız gönderene e-postayla iletilir' +
                    (kayit.gonderen.eposta ? ' (' + kayit.gonderen.eposta + ')' : '') +
                    '.'
                  : 'Yanıtınız gönderene zil bildirimi olarak iletilir.'}
              </div>
            )}
            <textarea
              rows={3}
              value={mesaj}
              maxLength={3000}
              onChange={(e) => setMesaj(e.target.value)}
              placeholder={yetkili ? 'Gönderene yanıt yazın…' : 'Ek bilgi ya da yanıt yazın…'}
              style={{ ...girdi, resize: 'vertical', lineHeight: 1.5 }}
              data-geri-bildirim-yanit
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Dugme
                ana
                disabled={mesgul || !mesaj.trim()}
                onClick={async () => {
                  if (await islem('/mesaj', { metin: mesaj })) setMesaj('');
                }}
                data-geri-bildirim-yanit-gonder
              >
                <Ikon d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" boyut={14} />
                {yetkili ? 'Yanıtı gönder' : 'Gönder'}
              </Dugme>
            </div>
          </div>
        ) : (
          <Bilgi>Bu kayıt kapatıldı. Yeni bir sorun için yeni bildirim açabilirsiniz.</Bilgi>
        )}
      </div>

      {yetkili && (
        <div style={{ ...kart, padding: 16, display: 'grid', gap: 14, background: T.muted }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: T.navy }}>Yetkili işlemleri</div>
          <div style={{ display: 'grid', gap: 6 }}>
            <span style={etiketStil}>Durumu güncelle</span>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {[
                ['incelemede', 'İnceleniyor'],
                ['cozuldu', 'Çözüldü'],
                ['kapatildi', 'Kapat'],
              ].map(([d, ad]) => (
                <Dugme
                  key={d}
                  kucuk
                  disabled={mesgul || kayit.durum === d}
                  onClick={() => islem('/durum', { durum: d })}
                  style={kayit.durum === d ? { borderColor: T.primary, color: T.primary } : null}
                >
                  {ad}
                </Dugme>
              ))}
            </div>
            <span style={{ fontSize: 11.5, color: T.textMuted }}>
              Durum değişince gönderene bildirim gider.
            </span>
          </div>
          {kayit.yonlendirebilir && (
            <div style={{ display: 'grid', gap: 8 }}>
              <span style={etiketStil}>Bölüm yetkilisine yönlendir</span>
              <select value={bolum} onChange={(e) => setBolum(e.target.value)} style={girdi}>
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
                style={girdi}
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <Dugme
                  ana
                  disabled={mesgul || !bolum}
                  onClick={async () => {
                    if (await islem('/yonlendir', { bolumId: bolum, not })) {
                      setBolum('');
                      setNot('');
                    }
                  }}
                >
                  <Ikon d="M5 12h14M12 5l7 7-7 7" boyut={14} /> Yönlendir
                </Dugme>
              </div>
            </div>
          )}
          {Array.isArray(kayit.gecmis) && kayit.gecmis.length > 0 && (
            <details>
              <summary style={{ fontSize: 12, color: T.textMuted, cursor: 'pointer' }}>
                İşlem geçmişi
              </summary>
              <div style={{ fontSize: 11.5, color: T.textMuted, lineHeight: 1.7, marginTop: 6 }}>
                {kayit.gecmis.map((g, i) => (
                  <div key={i}>
                    {tarih(g.zaman)} · {g.kim} ·{' '}
                    {g.olay === 'olusturuldu'
                      ? 'oluşturdu'
                      : g.olay === 'yonlendirildi'
                        ? g.detay + ' bölümüne yönlendirdi'
                        : 'durumu değiştirdi: ' + ((DURUM[g.detay] || {}).ad || g.detay)}
                  </div>
                ))}
              </div>
            </details>
          )}
        </div>
      )}
      {hata && (
        <div role="alert" style={{ color: T.danger, fontSize: 13, fontWeight: 600 }}>
          {hata}
        </div>
      )}
    </div>
  );
}

// ── Panel ──
function GeriBildirimPaneli({ currentRoute, acilacakKayit, moduller, onKapat, onDegisti }) {
  const [sekme, setSekme] = useState(acilacakKayit ? 'liste' : 'yeni');
  const [veri, setVeri] = useState({ benim: [], gelen: [], yetkili: false, bolumler: [] });
  const [secili, setSecili] = useState(acilacakKayit || '');
  const [hata, setHata] = useState('');
  const [tesekkur, setTesekkur] = useState(false);
  const dar = typeof window !== 'undefined' && window.innerWidth < 640;

  const yukle = useCallback(async () => {
    try {
      const j = await istek('');
      setVeri(j);
      setHata('');
    } catch (e) {
      setHata(e.message);
    }
  }, []);
  useEffect(() => {
    yukle();
    // Panel açıkken gelen yanıt / durum değişikliği hemen görünsün.
    const h = () => yukle();
    window.addEventListener('realtime:notifications', h);
    return () => window.removeEventListener('realtime:notifications', h);
  }, [yukle]);
  useEffect(() => {
    if (acilacakKayit) setSecili(acilacakKayit);
  }, [acilacakKayit]);

  const tum = veri.gelen.concat(veri.benim);
  const seciliKayit = secili ? tum.find((k) => k.id === secili) : null;

  // Gönderen kendi kaydını açınca "yeni yanıt" işareti söner.
  useEffect(() => {
    if (!seciliKayit || !seciliKayit.benim || !seciliKayit.yeniYanit) return;
    istek('/' + encodeURIComponent(seciliKayit.id) + '/okundu', {})
      .then(() => {
        setVeri((v) => ({
          ...v,
          benim: v.benim.map((k) => (k.id === seciliKayit.id ? { ...k, yeniYanit: false } : k)),
        }));
        if (onDegisti) onDegisti();
      })
      .catch(() => {});
  }, [seciliKayit, onDegisti]);

  const guncelle = (yeni) => {
    if (!yeni) return;
    setVeri((v) => ({
      ...v,
      benim: v.benim.map((k) => (k.id === yeni.id ? yeni : k)),
      gelen: v.gelen.map((k) => (k.id === yeni.id ? yeni : k)),
    }));
    if (onDegisti) onDegisti();
  };

  const yeniYanitSayisi = veri.benim.filter((k) => k.yeniYanit).length;
  const acikGelen = veri.gelen.filter((k) => !['cozuldu', 'kapatildi'].includes(k.durum)).length;
  const sekmeler = [
    { id: 'yeni', ad: 'Yeni bildirim' },
    { id: 'liste', ad: 'Bildirimlerim', sayi: veri.benim.length, vurgu: yeniYanitSayisi },
  ].concat(
    veri.yetkili
      ? [{ id: 'gelen', ad: 'Gelen kutusu', sayi: veri.gelen.length, vurgu: acikGelen }]
      : []
  );
  const altBaslik = seciliKayit
    ? seciliKayit.konu
    : sekme === 'yeni'
      ? 'Yaşadığınız sorunu ya da önerinizi ilgili yetkiliye iletin.'
      : sekme === 'gelen'
        ? 'Yetki alanınıza gelen bildirimleri yanıtlayın, yönlendirin.'
        : 'Gönderdiğiniz bildirimler, yanıtlar ve durumları.';

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
        background: 'rgba(15,23,42,0.5)',
        zIndex: 3000,
        display: 'flex',
        justifyContent: 'center',
        alignItems: dar ? 'stretch' : 'flex-start',
        padding: dar ? 0 : '36px 16px',
        overflowY: 'auto',
        fontFamily: FONT,
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 760,
          background: T.bg,
          borderRadius: dar ? 0 : 16,
          boxShadow: '0 24px 60px rgba(15,23,42,0.3)',
          overflow: 'hidden',
          minHeight: dar ? '100%' : undefined,
          display: 'flex',
          flexDirection: 'column',
        }}
        data-geri-bildirim-paneli
      >
        {/* Başlık bandı — uygulamanın modül bantlarıyla (CakuBanner) aynı geçiş */}
        <div
          style={{
            background: 'linear-gradient(135deg, ' + T.navy + ' 0%, ' + T.navy2 + ' 100%)',
            padding: dar ? '16px 16px 0' : '20px 24px 0',
            color: '#FFFFFF',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
            <span
              style={{
                width: 38,
                height: 38,
                borderRadius: 10,
                background: 'rgba(255,255,255,0.12)',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Ikon
                d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"
                boyut={20}
                renk="#FFFFFF"
              />
            </span>
            <div style={{ minWidth: 0, flex: 1 }}>
              <h2 style={{ margin: 0, fontSize: 19, fontWeight: 800, letterSpacing: '-0.01em' }}>
                Hata / Öneri Bildir
              </h2>
              <p
                style={{
                  margin: '3px 0 0',
                  fontSize: 13,
                  color: 'rgba(255,255,255,0.72)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {altBaslik}
              </p>
            </div>
            <button
              type="button"
              onClick={onKapat}
              aria-label="Kapat"
              style={{
                border: 'none',
                background: 'rgba(255,255,255,0.12)',
                color: '#FFFFFF',
                width: 32,
                height: 32,
                borderRadius: 8,
                cursor: 'pointer',
                fontSize: 18,
                lineHeight: 1,
                flexShrink: 0,
              }}
            >
              ×
            </button>
          </div>
          {/* Sekmeler bandın altına oturur */}
          <div role="tablist" style={{ display: 'flex', gap: 4, marginTop: 16, overflowX: 'auto' }}>
            {sekmeler.map((s) => {
              const aktif = sekme === s.id && !seciliKayit;
              return (
                <button
                  key={s.id}
                  role="tab"
                  aria-selected={aktif}
                  type="button"
                  onClick={() => {
                    setSekme(s.id);
                    setSecili('');
                    setTesekkur(false);
                  }}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '9px 14px',
                    border: 'none',
                    borderRadius: '10px 10px 0 0',
                    background: aktif ? T.bg : 'transparent',
                    color: aktif ? T.navy : 'rgba(255,255,255,0.82)',
                    fontWeight: 700,
                    fontSize: 13,
                    cursor: 'pointer',
                    fontFamily: FONT,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {s.ad}
                  {s.sayi != null && (
                    <span
                      style={{
                        minWidth: 20,
                        height: 20,
                        borderRadius: 10,
                        padding: '0 6px',
                        background: s.vurgu
                          ? T.danger
                          : aktif
                            ? T.border
                            : 'rgba(255,255,255,0.18)',
                        color: s.vurgu ? '#FFFFFF' : aktif ? T.text : '#FFFFFF',
                        fontSize: 11,
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                      title={
                        s.vurgu
                          ? s.id === 'liste'
                            ? s.vurgu + ' yeni yanıt'
                            : s.vurgu + ' açık kayıt'
                          : ''
                      }
                    >
                      {s.vurgu || s.sayi}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div style={{ padding: dar ? 16 : 24, flex: 1 }}>
          {hata && (
            <div style={{ marginBottom: 12 }}>
              <Bilgi ton="uyari">{hata}</Bilgi>
            </div>
          )}
          {seciliKayit ? (
            <KayitAyrinti
              kayit={seciliKayit}
              bolumler={veri.bolumler || []}
              onGeri={() => setSecili('')}
              onGuncellendi={guncelle}
            />
          ) : sekme === 'yeni' ? (
            tesekkur ? (
              <div
                style={{
                  ...kart,
                  padding: '32px 20px',
                  textAlign: 'center',
                  display: 'grid',
                  gap: 10,
                  justifyItems: 'center',
                }}
              >
                <span
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: 26,
                    background: T.successPale,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Ikon d="M20 6L9 17l-5-5" boyut={26} renk={T.success} kalin={3} />
                </span>
                <b style={{ fontSize: 16, color: T.text }}>Bildiriminiz iletildi</b>
                <span style={{ fontSize: 13, color: T.textMuted, maxWidth: 420 }}>
                  Yetkili yanıt verdiğinde zilden ve menüdeki rozetten haber alırsınız. Durumu
                  “Bildirimlerim” sekmesinden takip edebilirsiniz.
                </span>
                <div
                  style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}
                >
                  <Dugme onClick={() => setTesekkur(false)}>Yeni bildirim</Dugme>
                  <Dugme
                    ana
                    onClick={() => {
                      setTesekkur(false);
                      setSekme('liste');
                    }}
                  >
                    Bildirimlerime git
                  </Dugme>
                </div>
              </div>
            ) : (
              <YeniBildirim
                currentRoute={currentRoute}
                gorunenModuller={moduller}
                onGonderildi={() => {
                  setTesekkur(true);
                  yukle();
                  if (onDegisti) onDegisti();
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
    </div>
  );
}

if (typeof window !== 'undefined') window.GeriBildirimPaneli = GeriBildirimPaneli;
export default GeriBildirimPaneli;
