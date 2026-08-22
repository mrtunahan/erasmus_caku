// ══════════════════════════════════════════════════════════════
// TANITIM SAYFASI YÖNETİMİ
//
// Kök adresteki tanıtım sayfasının (dist/tanitim.html) "Öne çıkanlar"
// slider'ını yönetir: başlık, metin ve görsel taşıyan slaytlar eklenir,
// sıralanır, yayından kaldırılır.
//
// ── İKİ TARAF, TEK KURAL ──
// Slaytları burası ve tanıtım sayfası ayrı ayrı okur (tanıtım sayfası saf
// HTML, React yüklemez). Sıralama ve "yayında mı" kararı lib/tanitim-slayt.js
// içinde tek yerde; iki taraf da onu kullanır, yoksa yetkilinin gördüğü sıra
// ile ziyaretçininki ayrışırdı.
//
// ── GÖRSEL AKIŞI ──
// Yükleme mevcut kimlikli uçtan yapılır (/api/files/upload?folder=tanitim).
// Gösterim ise anonim uçtan (/api/tanitim/gorsel/:ad), çünkü tanıtım sayfası
// oturum taşımaz. Kayda yalnızca DOSYA ADI yazılır; tam adres iki tarafta da
// addan türetilir.
// ══════════════════════════════════════════════════════════════
const { useState, useEffect, useCallback, useMemo } = React;

const KOLEKSIYON = 'tanitim_slaytlari';
const KLASOR = 'tanitim';
const IZINLI_TUR = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'];
const EN_BUYUK_MB = 5;

function TanitimYonetimiApp({ currentUser }) {
  const C = window.C || {};
  const [kayitlar, setKayitlar] = useState([]);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [mesaj, setMesaj] = useState({ metin: '', tur: '' });
  const [duzenlenen, setDuzenlenen] = useState(null); // {} yeni, {...} düzenle
  const [gorselYukleniyor, setGorselYukleniyor] = useState(false);
  // Liste süzgeci: modül sayısı on bir, hepsi bir arada listelenince
  // yetkili aradığını bulamıyor.
  const [suzgec, setSuzgec] = useState('');

  const yetkili = window.universiteYetkilisiMi
    ? window.universiteYetkilisiMi(currentUser)
    : !!(currentUser && currentUser.isUniversityAdmin);

  const bildir = (metin, tur) => {
    setMesaj({ metin, tur: tur || 'bilgi' });
    setTimeout(() => setMesaj({ metin: '', tur: '' }), 4000);
  };

  const yukle = useCallback(async () => {
    setYukleniyor(true);
    try {
      const veri = await window.apiRead(KOLEKSIYON);
      setKayitlar(Array.isArray(veri) ? veri : []);
    } catch (e) {
      bildir('Slaytlar yüklenemedi: ' + (e.message || ''), 'hata');
    } finally {
      setYukleniyor(false);
    }
  }, []);

  useEffect(() => {
    yukle();
  }, [yukle]);

  // Yönetim listesi ziyaretçinin gördüğü sırayla aynı olsun; yayından
  // kaldırılanlar da görünür ama işaretli.
  const sirali = useMemo(() => {
    return [...kayitlar]
      .map((k) => window.tanitimSlaytNormalize(k))
      .filter((s) => !suzgec || s.modul === suzgec)
      .sort((a, b) => a.sira - b.sira || a.id.localeCompare(b.id, 'tr'));
  }, [kayitlar, suzgec]);

  const kaydet = async () => {
    const d = duzenlenen || {};
    const gorselVar = (Array.isArray(d.gorseller) ? d.gorseller : []).length > 0;
    if (!String(d.baslik || '').trim() && !String(d.metin || '').trim() && !gorselVar) {
      bildir('Slayt boş olamaz: başlık, metin ya da görselden en az biri gerekli.', 'hata');
      return;
    }
    const veri = {
      baslik: String(d.baslik || '').trim(),
      metin: String(d.metin || '').trim(),
      // Görseller DİZİ olarak yazılır. Eski tek alan (`gorsel`) yazılmaz:
      // okuma tarafı ikisini de kabul ediyor, yeni kayıtta tek biçim kalsın.
      gorseller: Array.isArray(d.gorseller) ? d.gorseller : d.gorsel ? [d.gorsel] : [],
      sira: Number.isFinite(Number(d.sira)) ? Number(d.sira) : window.tanitimSonrakiSira(kayitlar),
      yayinda: d.yayinda !== false,
    };
    try {
      if (d.id) await window.DBWrite.set(KOLEKSIYON, d.id, veri, true);
      else await window.DBWrite.add(KOLEKSIYON, veri);
      setDuzenlenen(null);
      await yukle();
      bildir('Slayt kaydedildi. Tanıtım sayfasında görünmesi birkaç dakika alabilir.', 'basari');
    } catch (e) {
      bildir('Kaydedilemedi: ' + (e.message || ''), 'hata');
    }
  };

  const sil = async (id, baslik) => {
    if (!window.confirm(`"${baslik || 'Bu slayt'}" silinsin mi?`)) return;
    try {
      await window.DBWrite.remove(KOLEKSIYON, id);
      await yukle();
      bildir('Slayt silindi.', 'basari');
    } catch (e) {
      bildir('Silinemedi: ' + (e.message || ''), 'hata');
    }
  };

  // Sırayı bir üste/alta taşı. İki slaytın sıra numarası takas edilir —
  // "sırayı 3 yap" demek yerine komşuyla yer değiştirmek, yetkilinin
  // numaraları elle yönetmesini gerektirmez.
  const tasi = async (indeks, yon) => {
    const hedef = indeks + yon;
    if (hedef < 0 || hedef >= sirali.length) return;
    const a = sirali[indeks];
    const b = sirali[hedef];
    try {
      await window.DBWrite.set(KOLEKSIYON, a.id, { sira: b.sira }, true);
      await window.DBWrite.set(KOLEKSIYON, b.id, { sira: a.sira }, true);
      await yukle();
    } catch (e) {
      bildir('Sıra değiştirilemedi: ' + (e.message || ''), 'hata');
    }
  };

  const gorselSec = async (dosya) => {
    if (!dosya) return;
    if (!IZINLI_TUR.includes(dosya.type)) {
      bildir('Yalnız JPG, PNG, WEBP, GIF ve AVIF yüklenebilir.', 'hata');
      return;
    }
    if (dosya.size > EN_BUYUK_MB * 1024 * 1024) {
      bildir(`Görsel ${EN_BUYUK_MB} MB'ı aşamaz.`, 'hata');
      return;
    }
    setGorselYukleniyor(true);
    try {
      const url = await window.uploadGeneratedDoc(dosya, dosya.name, KLASOR);
      if (!url) throw new Error('adres alınamadı');
      // Kayda yalnız DOSYA ADI yazılır: tanıtım sayfası onu anonim uçtan
      // çeker, tam adresi iki taraf da addan türetir.
      const ad = String(url).split('/').pop();
      if (!window.tanitimGorselGuvenliMi(ad)) {
        throw new Error('dosya adı beklenen biçimde değil');
      }
      setDuzenlenen((p) => {
        const onceki = (p && Array.isArray(p.gorseller) ? p.gorseller : []).slice();
        if (onceki.indexOf(ad) < 0) onceki.push(ad);
        return { ...(p || {}), gorseller: onceki };
      });
      bildir('Görsel eklendi.', 'basari');
    } catch (e) {
      bildir('Görsel yüklenemedi: ' + (e.message || ''), 'hata');
    } finally {
      setGorselYukleniyor(false);
    }
  };

  if (!yetkili) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: C.textMuted || '#64748B' }}>
        Bu bölüm yalnızca üniversite yetkilisine açıktır.
      </div>
    );
  }

  const kart = {
    background: 'white',
    border: '1px solid #E5E7EB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  };
  const etiket = {
    fontSize: 11.5,
    fontWeight: 700,
    color: C.textMuted || '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    marginBottom: 6,
    display: 'block',
  };
  const girdi = {
    width: '100%',
    padding: '9px 12px',
    borderRadius: 8,
    border: '1px solid #D1D5DB',
    fontSize: 13.5,
    fontFamily: 'inherit',
  };
  const dugme = (renk) => ({
    padding: '8px 16px',
    borderRadius: 8,
    border: 'none',
    background: renk,
    color: 'white',
    fontSize: 13,
    fontWeight: 700,
    fontFamily: 'inherit',
    cursor: 'pointer',
  });

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      <div style={{ marginBottom: 18 }}>
        <h2
          style={{ margin: '0 0 4px', fontSize: 20, fontWeight: 800, color: C.navy || '#1B2A4A' }}
        >
          Tanıtım Sayfası
        </h2>
        <p style={{ margin: 0, fontSize: 13, color: C.textMuted || '#64748B' }}>
          Kök adreste (giriş öncesi) görünen sayfanın “Öne çıkanlar” bölümü. Eklediğiniz slaytlar
          kitap sayfası gibi çevrilerek gösterilir.{' '}
          <a href="/" target="_blank" rel="noreferrer" style={{ color: '#1D4ED8' }}>
            Sayfayı aç
          </a>
        </p>
      </div>

      {mesaj.metin && (
        <div
          style={{
            padding: '10px 14px',
            borderRadius: 8,
            marginBottom: 14,
            fontSize: 13,
            background:
              mesaj.tur === 'hata' ? '#FEE2E2' : mesaj.tur === 'basari' ? '#D1FAE5' : '#EFF6FF',
            color:
              mesaj.tur === 'hata' ? '#991B1B' : mesaj.tur === 'basari' ? '#065F46' : '#1E40AF',
          }}
        >
          {mesaj.metin}
        </div>
      )}

      {!duzenlenen && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
          <span style={{ fontSize: 12.5, color: C.textMuted || '#64748B' }}>Modül:</span>
          <select
            value={suzgec}
            onChange={(e) => setSuzgec(e.target.value)}
            style={{ ...girdi, width: 'auto', minWidth: 200, padding: '7px 10px' }}
          >
            <option value="">Tümü</option>
            {window.TANITIM_MODULLERI.map((m) => (
              <option key={m.id} value={m.id}>
                {m.ad}
              </option>
            ))}
          </select>
        </div>
      )}

      {!duzenlenen && (
        <button
          onClick={() =>
            setDuzenlenen({
              sira: window.tanitimSonrakiSira(kayitlar),
              yayinda: true,
              modul: suzgec || '',
              gorseller: [],
            })
          }
          style={{ ...dugme(C.navy || '#1B2A4A'), marginBottom: 16 }}
        >
          + Yeni Slayt
        </button>
      )}

      {duzenlenen && (
        <div style={{ ...kart, border: '2px solid ' + (C.navy || '#1B2A4A') }}>
          <div style={{ marginBottom: 12 }}>
            <label style={etiket}>Modül sekmesi</label>
            <select
              style={girdi}
              value={duzenlenen.modul || ''}
              onChange={(e) => setDuzenlenen({ ...duzenlenen, modul: e.target.value })}
            >
              <option value="">— seçiniz —</option>
              {window.TANITIM_MODULLERI.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.ad}
                </option>
              ))}
            </select>
            <div style={{ fontSize: 11.5, color: C.textMuted || '#64748B', marginTop: 4 }}>
              Slayt yalnızca bu sekmede görünür.
            </div>
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={etiket}>Başlık</label>
            <input
              style={girdi}
              value={duzenlenen.baslik || ''}
              onChange={(e) => setDuzenlenen({ ...duzenlenen, baslik: e.target.value })}
              placeholder="Örn: Yeni dönem başvuruları açıldı"
            />
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={etiket}>Metin</label>
            <textarea
              style={{ ...girdi, minHeight: 90, resize: 'vertical' }}
              value={duzenlenen.metin || ''}
              onChange={(e) => setDuzenlenen({ ...duzenlenen, metin: e.target.value })}
              placeholder="Slaytta görünecek açıklama"
            />
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={etiket}>Görseller (sağ sayfa)</label>
            {/* Sağ sayfaya en çok dört görsel basılır; fazlası ızgarayı
                okunmaz kılıyor. Sıralama eklenme sırasıdır. */}
            {(duzenlenen.gorseller || []).length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 10 }}>
                {(duzenlenen.gorseller || []).map((g, gi) => (
                  <div key={g + gi} style={{ position: 'relative' }}>
                    <img
                      src={window.tanitimGorselUrl(g)}
                      alt=""
                      style={{
                        width: 110,
                        height: 70,
                        objectFit: 'cover',
                        borderRadius: 8,
                        border: '1px solid #E5E7EB',
                        opacity: gi < 4 ? 1 : 0.4,
                      }}
                    />
                    <button
                      title="Kaldır"
                      onClick={() =>
                        setDuzenlenen({
                          ...duzenlenen,
                          gorseller: (duzenlenen.gorseller || []).filter((_, j) => j !== gi),
                        })
                      }
                      style={{
                        position: 'absolute',
                        top: -6,
                        right: -6,
                        width: 22,
                        height: 22,
                        borderRadius: '50%',
                        border: 'none',
                        background: '#DC2626',
                        color: 'white',
                        fontSize: 13,
                        lineHeight: 1,
                        cursor: 'pointer',
                        fontFamily: 'inherit',
                      }}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
            {(duzenlenen.gorseller || []).length > 4 && (
              <div style={{ fontSize: 11.5, color: '#92400E', marginBottom: 8 }}>
                Sayfaya yalnız ilk dört görsel basılır; soluk olanlar gösterilmez.
              </div>
            )}
            <input
              type="file"
              accept={IZINLI_TUR.join(',')}
              disabled={gorselYukleniyor}
              onChange={(e) => {
                gorselSec(e.target.files && e.target.files[0]);
                e.target.value = '';
              }}
              style={{ fontSize: 13 }}
            />
            <div style={{ fontSize: 11.5, color: C.textMuted || '#64748B', marginTop: 4 }}>
              {gorselYukleniyor
                ? 'Yükleniyor…'
                : `JPG, PNG, WEBP, GIF veya AVIF · en çok ${EN_BUYUK_MB} MB · birden çok eklenebilir · görselsiz slayt da olur`}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 14 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
              <input
                type="checkbox"
                checked={duzenlenen.yayinda !== false}
                onChange={(e) => setDuzenlenen({ ...duzenlenen, yayinda: e.target.checked })}
              />
              Yayında
            </label>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={kaydet} style={dugme('#10B981')}>
              Kaydet
            </button>
            <button onClick={() => setDuzenlenen(null)} style={dugme('#6B7280')}>
              İptal
            </button>
          </div>
        </div>
      )}

      {yukleniyor ? (
        <div style={{ padding: 30, textAlign: 'center', color: C.textMuted || '#64748B' }}>
          Yükleniyor…
        </div>
      ) : sirali.length === 0 ? (
        <div
          style={{
            ...kart,
            textAlign: 'center',
            color: C.textMuted || '#64748B',
            fontSize: 13.5,
          }}
        >
          Henüz slayt yok. Tanıtım sayfası şu an gömülü varsayılan metinleri gösteriyor; ilk slaytı
          eklediğinizde onların yerini alır.
        </div>
      ) : (
        sirali.map((s, i) => (
          <div key={s.id} style={{ ...kart, opacity: s.yayinda ? 1 : 0.55 }}>
            <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
              {s.gorseller.length ? (
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  <img
                    src={window.tanitimGorselUrl(s.gorseller[0])}
                    alt=""
                    style={{
                      width: 110,
                      height: 70,
                      objectFit: 'cover',
                      borderRadius: 8,
                      border: '1px solid #E5E7EB',
                      display: 'block',
                    }}
                  />
                  {s.gorseller.length > 1 && (
                    <span
                      style={{
                        position: 'absolute',
                        right: 4,
                        bottom: 4,
                        background: 'rgba(15,23,42,0.82)',
                        color: 'white',
                        fontSize: 10.5,
                        fontWeight: 700,
                        padding: '2px 7px',
                        borderRadius: 10,
                      }}
                    >
                      +{s.gorseller.length - 1}
                    </span>
                  )}
                </div>
              ) : (
                <div
                  style={{
                    width: 110,
                    height: 70,
                    borderRadius: 8,
                    background: '#F3F4F6',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 11,
                    color: '#9CA3AF',
                    flexShrink: 0,
                  }}
                >
                  görselsiz
                </div>
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <strong style={{ fontSize: 14.5 }}>{s.baslik || '(başlıksız)'}</strong>
                  <span
                    style={{
                      fontSize: 10.5,
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: 10,
                      background: s.modul ? '#EEF6F5' : '#FEE2E2',
                      color: s.modul ? '#0A7D72' : '#991B1B',
                    }}
                  >
                    {(window.TANITIM_MODULLERI.find((m) => m.id === s.modul) || {}).ad ||
                      'MODÜLSÜZ'}
                  </span>
                  {!s.yayinda && (
                    <span
                      style={{
                        fontSize: 10.5,
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: 10,
                        background: '#F3F4F6',
                        color: '#6B7280',
                      }}
                    >
                      YAYINDA DEĞİL
                    </span>
                  )}
                </div>
                <div
                  style={{
                    fontSize: 12.5,
                    color: C.textMuted || '#64748B',
                    marginTop: 4,
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                  }}
                >
                  {s.metin}
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flexShrink: 0 }}>
                <button
                  onClick={() => tasi(i, -1)}
                  disabled={i === 0}
                  title="Yukarı taşı"
                  style={{
                    ...dugme('#F3F4F6'),
                    color: '#374151',
                    padding: '4px 10px',
                    opacity: i === 0 ? 0.4 : 1,
                  }}
                >
                  ↑
                </button>
                <button
                  onClick={() => tasi(i, 1)}
                  disabled={i === sirali.length - 1}
                  title="Aşağı taşı"
                  style={{
                    ...dugme('#F3F4F6'),
                    color: '#374151',
                    padding: '4px 10px',
                    opacity: i === sirali.length - 1 ? 0.4 : 1,
                  }}
                >
                  ↓
                </button>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <button
                onClick={() => setDuzenlenen({ ...s })}
                style={{ ...dugme('#2563EB'), padding: '6px 14px', fontSize: 12.5 }}
              >
                Düzenle
              </button>
              <button
                onClick={() => sil(s.id, s.baslik)}
                style={{ ...dugme('#DC2626'), padding: '6px 14px', fontSize: 12.5 }}
              >
                Sil
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

window.TanitimYonetimiApp = TanitimYonetimiApp;
