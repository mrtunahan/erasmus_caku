// ══════════════════════════════════════════════════════════════
// Yapay Zekâ — yönetim paneli (yalnız üniversite yetkilisi).
//
// Belge işleme katmanının TEK görünür yüzü. Buradan hiçbir model çağrısı
// başlatılmaz; panel yalnızca durumu, nerede çalıştığını ve maliyeti gösterir.
//
// Veri kaynakları:
//   GET /api/ai/ozet   → model, önek/önbellek durumu, toplam + gün/modül kırılımı
//   GET /api/ai/usage  → seçilen kırılıma göre tablo (öğrenci/modül/bölüm/gün)
// ══════════════════════════════════════════════════════════════
const { useState, useEffect, useCallback } = React;

const YZ = {
  navy: '#1E3A5F',
  text: '#111827',
  textMuted: '#6B7280',
  border: '#E5E7EB',
  bg: '#F9FAFB',
  green: '#047857',
  greenBg: '#ECFDF5',
  amber: '#B45309',
  amberBg: '#FFFBEB',
  red: '#B91C1C',
  redBg: '#FEF2F2',
  indigo: '#4338CA',
  indigoBg: '#EEF2FF',
};

const yzKart = {
  background: 'white',
  border: '1px solid ' + YZ.border,
  borderRadius: 12,
  padding: 16,
};

// ── Bağlantı haritası ─────────────────────────────────────────
// Hangi modülde hangi işlevin bağlı olduğu. Bu bir DURUM tablosudur:
// yeni bir modül bağlandığında burası da güncellenmelidir, aksi halde
// panel gerçeği yansıtmaz.
const BAGLANTILAR = [
  {
    modul: 'Yatay Geçiş',
    yer: 'Öğrenci · yeni başvuru · başvuru ekleri',
    islev: 'Alan çıkarımı',
    durum: 'bagli',
  },
  {
    modul: 'Yatay Geçiş',
    yer: 'Akademisyen · başvuru kartı (açınca)',
    islev: 'Kıyaslama',
    durum: 'bagli',
  },
  {
    modul: 'Ders Muafiyet',
    yer: 'Öğrenci · transkript alanı',
    islev: 'Satır çıkarımı (ders listesi) + karşı kurum bilgisi',
    durum: 'bagli',
  },
  {
    modul: 'Ders Muafiyet',
    yer: 'Öğrenci · talep gönderimi · akademisyen eşleştirme sihirbazı',
    islev: 'İçerik kapsam değerlendirmesi (ders ↔ ders)',
    durum: 'bagli',
  },
  { modul: 'Dikey Geçiş', yer: '—', islev: 'Alan çıkarımı', durum: 'bekliyor' },
  { modul: 'ÇAP / Yandal', yer: '—', islev: 'Alan çıkarımı', durum: 'bekliyor' },
  { modul: 'Erasmus', yer: '—', islev: 'Satır çıkarımı (Learning Agreement)', durum: 'bekliyor' },
  { modul: 'Benim Sayfam', yer: '—', islev: 'Alan çıkarımı (kimlik belgesi)', durum: 'bekliyor' },
  {
    modul: '(tüm modüller)',
    yer: 'Uç hazır, hiçbir ekrana bağlı değil',
    islev: 'Web ile doğrulama',
    durum: 'bekliyor',
  },
  {
    modul: '(tüm modüller)',
    yer: 'Uç hazır, ekranı yok',
    islev: 'Toplu işlem (batch, %50 indirim)',
    durum: 'bekliyor',
  },
];

const KIRILIMLAR = [
  { id: 'student', label: 'Öğrenci' },
  { id: 'module', label: 'Modül' },
  { id: 'department', label: 'Bölüm' },
  { id: 'day', label: 'Gün' },
];

function usd(n) {
  const v = Number(n) || 0;
  return '$' + v.toFixed(v < 1 ? 4 : 2);
}
function sayi(n) {
  return (Number(n) || 0).toLocaleString('tr-TR');
}

async function yzGet(url) {
  const token = localStorage.getItem('caku_auth_token');
  const res = await fetch(url, {
    headers: token ? { Authorization: 'Bearer ' + token } : {},
    credentials: 'include',
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'İstek başarısız (HTTP ' + res.status + ')');
  return data;
}

function Rozet({ renk, bg, children }) {
  return (
    <span
      style={{
        fontSize: 11,
        fontWeight: 700,
        padding: '3px 9px',
        borderRadius: 999,
        color: renk,
        background: bg,
        whiteSpace: 'nowrap',
      }}
    >
      {children}
    </span>
  );
}

function DurumKarti({ ozet }) {
  const acik = !!(ozet && ozet.configured);
  const onek = (ozet && ozet.onek) || null;
  return (
    <div style={{ ...yzKart, marginBottom: 14 }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: YZ.navy, marginBottom: 12 }}>Durum</div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
          gap: 14,
        }}
      >
        <div>
          <div style={{ fontSize: 11.5, color: YZ.textMuted, marginBottom: 4 }}>Belge işleme</div>
          {acik ? (
            <Rozet renk={YZ.green} bg={YZ.greenBg}>
              AÇIK
            </Rozet>
          ) : (
            <Rozet renk={YZ.red} bg={YZ.redBg}>
              KAPALI — anahtar tanımsız
            </Rozet>
          )}
        </div>
        <div>
          <div style={{ fontSize: 11.5, color: YZ.textMuted, marginBottom: 4 }}>Model</div>
          <div style={{ fontSize: 12.5, fontWeight: 600, color: YZ.text, wordBreak: 'break-all' }}>
            {(ozet && ozet.model) || '—'}
          </div>
        </div>
        <div>
          <div style={{ fontSize: 11.5, color: YZ.textMuted, marginBottom: 4 }}>
            Prompt önbelleği
          </div>
          {onek ? (
            onek.aktif ? (
              <Rozet renk={YZ.green} bg={YZ.greenBg}>
                Devrede · {sayi(onek.token)} token
              </Rozet>
            ) : (
              <Rozet renk={YZ.amber} bg={YZ.amberBg}>
                Devre dışı · {sayi(onek.token)}/{sayi(onek.esik)} token
              </Rozet>
            )
          ) : (
            <span style={{ fontSize: 12.5, color: YZ.textMuted }}>—</span>
          )}
        </div>
      </div>
      {onek && !onek.aktif && (
        <div style={{ fontSize: 11.5, color: YZ.textMuted, marginTop: 12, lineHeight: 1.6 }}>
          Sabit prompt önekinin {sayi(onek.esik)} token&apos;ı aşması gerekiyor, aşmıyor.{' '}
          <b>Bu bilinçli bir tercihtir</b>: eşiği aşmak için prompt&apos;u şişirmek, 5 dakikalık
          önbellek penceresinde 12&apos;den az çağrı olduğunda net zarardır. Doğruluğa etkisi
          yoktur.
        </div>
      )}
    </div>
  );
}

function BaglantiTablosu() {
  const bagliSayisi = BAGLANTILAR.filter((b) => b.durum === 'bagli').length;
  const hucre = {
    padding: '9px 12px',
    borderBottom: '1px solid #F3F4F6',
    fontSize: 12.5,
    verticalAlign: 'top',
  };
  return (
    <div style={{ ...yzKart, padding: 0, marginBottom: 14, overflow: 'hidden' }}>
      <div
        style={{
          padding: '13px 16px',
          borderBottom: '1px solid ' + YZ.border,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 10,
          flexWrap: 'wrap',
        }}
      >
        <span style={{ fontSize: 13, fontWeight: 700, color: YZ.navy }}>Nerede çalışıyor</span>
        <span style={{ fontSize: 11.5, color: YZ.textMuted }}>
          {bagliSayisi} / {BAGLANTILAR.length} bağlı
        </span>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: YZ.bg, textAlign: 'left' }}>
              {['Modül', 'İşlev', 'Nerede', 'Durum'].map((h) => (
                <th
                  key={h}
                  style={{ ...hucre, fontSize: 11, color: YZ.textMuted, fontWeight: 700 }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {BAGLANTILAR.map((b, i) => (
              <tr key={i} style={{ opacity: b.durum === 'bagli' ? 1 : 0.7 }}>
                <td style={{ ...hucre, fontWeight: 600, color: YZ.text }}>{b.modul}</td>
                <td style={hucre}>{b.islev}</td>
                <td style={{ ...hucre, color: YZ.textMuted }}>{b.yer}</td>
                <td style={hucre}>
                  {b.durum === 'bagli' ? (
                    <Rozet renk={YZ.green} bg={YZ.greenBg}>
                      Bağlı
                    </Rozet>
                  ) : (
                    <Rozet renk={YZ.textMuted} bg={YZ.bg}>
                      Bekliyor
                    </Rozet>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function MaliyetTablosu() {
  const [kirilim, setKirilim] = useState('student');
  const [satirlar, setSatirlar] = useState([]);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [hata, setHata] = useState('');

  const yukle = useCallback(async (g) => {
    setYukleniyor(true);
    setHata('');
    try {
      const d = await yzGet('/api/ai/usage?groupBy=' + encodeURIComponent(g));
      setSatirlar(d.rapor || []);
    } catch (e) {
      setHata(e.message);
      setSatirlar([]);
    } finally {
      setYukleniyor(false);
    }
  }, []);

  useEffect(() => {
    yukle(kirilim);
  }, [kirilim, yukle]);

  const hucre = { padding: '9px 12px', borderBottom: '1px solid #F3F4F6', fontSize: 12.5 };
  const basligi = KIRILIMLAR.find((k) => k.id === kirilim);

  return (
    <div style={{ ...yzKart, padding: 0, overflow: 'hidden' }}>
      <div
        style={{
          padding: '13px 16px',
          borderBottom: '1px solid ' + YZ.border,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 10,
          flexWrap: 'wrap',
        }}
      >
        <span style={{ fontSize: 13, fontWeight: 700, color: YZ.navy }}>Maliyet kırılımı</span>
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {KIRILIMLAR.map((k) => (
            <button
              key={k.id}
              type="button"
              onClick={() => setKirilim(k.id)}
              style={{
                padding: '5px 12px',
                borderRadius: 999,
                border: '1px solid ' + (kirilim === k.id ? YZ.indigo : YZ.border),
                background: kirilim === k.id ? YZ.indigoBg : 'white',
                color: kirilim === k.id ? YZ.indigo : YZ.textMuted,
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              {k.label}
            </button>
          ))}
        </div>
      </div>

      {yukleniyor ? (
        <div style={{ padding: 20, fontSize: 12.5, color: YZ.textMuted }}>Yükleniyor…</div>
      ) : hata ? (
        <div style={{ padding: 20, fontSize: 12.5, color: YZ.red }}>{hata}</div>
      ) : satirlar.length === 0 ? (
        <div style={{ padding: 20, fontSize: 12.5, color: YZ.textMuted }}>
          Henüz kayıt yok — belge işleme hiç kullanılmamış.
        </div>
      ) : (
        <div style={{ overflowX: 'auto', maxHeight: 460, overflowY: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: YZ.bg, textAlign: 'left' }}>
                {[basligi.label, 'Çağrı', 'Maliyet', 'Girdi', 'Çıktı', 'Hatalı'].map((h) => (
                  <th
                    key={h}
                    style={{ ...hucre, fontSize: 11, color: YZ.textMuted, fontWeight: 700 }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {satirlar.map((r) => (
                <tr key={r._id || '(boş)'}>
                  <td style={{ ...hucre, fontWeight: 600, color: YZ.text }}>
                    {r._id || <span style={{ color: YZ.textMuted }}>(belirtilmemiş)</span>}
                  </td>
                  <td style={hucre}>{sayi(r.cagri)}</td>
                  <td style={{ ...hucre, fontWeight: 600 }}>{usd(r.costUsd)}</td>
                  <td style={{ ...hucre, color: YZ.textMuted }}>{sayi(r.inputTokens)}</td>
                  <td style={{ ...hucre, color: YZ.textMuted }}>{sayi(r.outputTokens)}</td>
                  <td style={hucre}>
                    {r.hataliCagri > 0 ? (
                      <span style={{ color: YZ.red, fontWeight: 600 }}>{sayi(r.hataliCagri)}</span>
                    ) : (
                      <span style={{ color: YZ.textMuted }}>0</span>
                    )}
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

function ToplamKartlari({ toplam }) {
  const t = toplam || { cagri: 0, costUsd: 0, hataliCagri: 0 };
  const kutular = [
    { etiket: 'Toplam çağrı', deger: sayi(t.cagri) },
    { etiket: 'Toplam maliyet', deger: usd(t.costUsd) },
    {
      etiket: 'Çağrı başına ort.',
      deger: t.cagri > 0 ? usd(t.costUsd / t.cagri) : '—',
    },
    {
      etiket: 'Hatalı çağrı',
      deger: sayi(t.hataliCagri),
      vurgu: t.hataliCagri > 0,
    },
  ];
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
        gap: 12,
        marginBottom: 14,
      }}
    >
      {kutular.map((k) => (
        <div key={k.etiket} style={yzKart}>
          <div style={{ fontSize: 11.5, color: YZ.textMuted, marginBottom: 6 }}>{k.etiket}</div>
          <div
            style={{
              fontSize: 22,
              fontWeight: 700,
              color: k.vurgu ? YZ.red : YZ.navy,
              lineHeight: 1.1,
            }}
          >
            {k.deger}
          </div>
        </div>
      ))}
    </div>
  );
}

function YapayZekaApp() {
  const [ozet, setOzet] = useState(null);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [hata, setHata] = useState('');

  useEffect(() => {
    let iptal = false;
    yzGet('/api/ai/ozet')
      .then((d) => {
        if (!iptal) setOzet(d);
      })
      .catch((e) => {
        if (!iptal) setHata(e.message);
      })
      .finally(() => {
        if (!iptal) setYukleniyor(false);
      });
    return () => {
      iptal = true;
    };
  }, []);

  return (
    <div style={{ maxWidth: 1100 }}>
      <div style={{ marginBottom: 16 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: YZ.navy, margin: 0 }}>Yapay Zekâ</h2>
        <p style={{ fontSize: 12.5, color: YZ.textMuted, margin: '6px 0 0', lineHeight: 1.6 }}>
          Sistemde yapay zekâ yalnızca <b>belge okur</b>: yüklenen bir belgeden istenen alanları
          çıkarır, satır listesi üretir ya da beyan edilen bilgiyi belgeyle karşılaştırır. Ürettiği
          hiçbir değer doğrudan kaydedilmez — kullanıcı her zaman önce görür, onaylar. Sohbet eden
          bir asistan yoktur.
        </p>
      </div>

      {yukleniyor ? (
        <div style={{ ...yzKart, fontSize: 12.5, color: YZ.textMuted }}>Yükleniyor…</div>
      ) : hata ? (
        <div style={{ ...yzKart, borderColor: '#FCA5A5', background: YZ.redBg }}>
          <div style={{ fontSize: 12.5, color: YZ.red, fontWeight: 600 }}>{hata}</div>
        </div>
      ) : (
        <>
          <DurumKarti ozet={ozet} />
          <ToplamKartlari toplam={ozet && ozet.toplam} />
          <BaglantiTablosu />
          <MaliyetTablosu />
        </>
      )}
    </div>
  );
}

window.YapayZekaApp = YapayZekaApp;
