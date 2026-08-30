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
const MODUL_KOLEKSIYON = 'tanitim_modulleri';
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
  // Modüller (sekmeler) de yönetiliyor: koda gömülü değiller.
  const [moduller, setModuller] = useState([]);
  const [bolum, setBolum] = useState('slayt'); // 'slayt' | 'modul'
  const [modulDuzenlenen, setModulDuzenlenen] = useState(null);

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
      const [slaytlar, modulKayitlari] = await Promise.all([
        window.apiRead(KOLEKSIYON),
        window.apiRead(MODUL_KOLEKSIYON),
      ]);
      setKayitlar(Array.isArray(slaytlar) ? slaytlar : []);
      setModuller(Array.isArray(modulKayitlari) ? modulKayitlari : []);
    } catch (e) {
      bildir('Yüklenemedi: ' + (e.message || ''), 'hata');
    } finally {
      setYukleniyor(false);
    }
  }, []);

  useEffect(() => {
    yukle();
  }, [yukle]);

  // Yönetim listesi ziyaretçinin gördüğü sırayla aynı olsun; yayından
  // kaldırılanlar da görünür ama işaretli.
  // Sekmeler ziyaretçinin gördüğü sırayla; yayından kaldırılan da listede
  // ama işaretli (yönetim tarafı hepsini görmeli).
  const sekmeler = useMemo(
    () =>
      [...moduller]
        .map((m) => window.tanitimModulNormalize(m))
        .sort((a, b) => a.sira - b.sira || a.ad.localeCompare(b.ad, 'tr')),
    [moduller]
  );

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
    // Modülsüz slayt hiçbir sekmede görünmez; sessizce kaybolmasın.
    if (!String(d.modul || '').trim()) {
      bildir(
        sekmeler.length
          ? 'Bir modül sekmesi seçin: slayt yalnız seçtiğiniz sekmede görünür.'
          : 'Önce Modüller bölümünden en az bir sekme ekleyin.',
        'hata'
      );
      return;
    }
    const veri = {
      baslik: String(d.baslik || '').trim(),
      metin: String(d.metin || '').trim(),
      // Slaydın bağlı olduğu sekme. Yazılmazsa slayt hiçbir sekmede çıkmaz.
      modul: String(d.modul || '').trim(),
      // Görseller DİZİ olarak yazılır. Eski tek alan (`gorsel`) yazılmaz:
      // okuma tarafı ikisini de kabul ediyor, yeni kayıtta tek biçim kalsın.
      gorseller: Array.isArray(d.gorseller) ? d.gorseller : d.gorsel ? [d.gorsel] : [],
      // YouTube bağlantısı — girildiğinde tanıtım sayfasında görsellerin
      // YERİNE video gösterilir. Adres burada doğrulanmaz; sayfa çözemezse
      // sessizce görsellere düşer (boş iframe basılmaz).
      video: String(d.video || '').trim(),
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

  // ── MODÜL (SEKME) İŞLEMLERİ ──
  const modulKaydet = async () => {
    const d = modulDuzenlenen || {};
    const ad = String(d.ad || '').trim();
    if (!ad) {
      bildir('Modül adı gerekli.', 'hata');
      return;
    }
    // Anahtar bir kez üretilir ve DEĞİŞMEZ: slaytlar ona bağlı. Adı sonradan
    // düzeltmek slaytları koparmamalı.
    const anahtar = String(d.anahtar || '').trim() || window.tanitimModulKimligi(ad);
    if (!anahtar) {
      bildir('Bu addan bir kimlik türetilemedi; farklı bir ad deneyin.', 'hata');
      return;
    }
    const cakisma = sekmeler.find((m) => m.anahtar === anahtar && m.id !== d.id);
    if (cakisma) {
      bildir(`"${cakisma.ad}" modülü aynı kimliği kullanıyor; adı farklılaştırın.`, 'hata');
      return;
    }
    const veri = {
      ad,
      anahtar,
      ozet: String(d.ozet || '').trim(),
      sira: Number.isFinite(Number(d.sira)) ? Number(d.sira) : sekmeler.length + 1,
      yayinda: d.yayinda !== false,
    };
    try {
      if (d.id) await window.DBWrite.set(MODUL_KOLEKSIYON, d.id, veri, true);
      else await window.DBWrite.add(MODUL_KOLEKSIYON, veri);
      setModulDuzenlenen(null);
      await yukle();
      bildir('Modül kaydedildi.', 'basari');
    } catch (e) {
      bildir('Kaydedilemedi: ' + (e.message || ''), 'hata');
    }
  };

  const modulSil = async (m) => {
    const bagli = kayitlar.filter((k) => window.tanitimSlaytNormalize(k).modul === m.anahtar);
    const uyari = bagli.length
      ? `"${m.ad}" silinecek. Bu modüle bağlı ${bagli.length} slayt hiçbir sekmede görünmez olur (silinmez). Devam edilsin mi?`
      : `"${m.ad}" silinsin mi?`;
    if (!window.confirm(uyari)) return;
    try {
      await window.DBWrite.remove(MODUL_KOLEKSIYON, m.id);
      await yukle();
      bildir('Modül silindi.', 'basari');
    } catch (e) {
      bildir('Silinemedi: ' + (e.message || ''), 'hata');
    }
  };

  const modulTasi = async (indeks, yon) => {
    const hedef = indeks + yon;
    if (hedef < 0 || hedef >= sekmeler.length) return;
    const a = sekmeler[indeks];
    const b = sekmeler[hedef];
    try {
      await window.DBWrite.set(MODUL_KOLEKSIYON, a.id, { sira: b.sira }, true);
      await window.DBWrite.set(MODUL_KOLEKSIYON, b.id, { sira: a.sira }, true);
      await yukle();
    } catch (e) {
      bildir('Sıra değiştirilemedi: ' + (e.message || ''), 'hata');
    }
  };

  // İlk kurulumda on bir modülü tek tek yazdırmak yerine öneri listesi.
  const onerilenleriEkle = async () => {
    const varOlan = new Set(sekmeler.map((m) => m.anahtar));
    const eklenecek = window.TANITIM_ONERILEN_MODULLER.filter((m) => !varOlan.has(m.id));
    if (!eklenecek.length) {
      bildir('Önerilen modüllerin hepsi zaten tanımlı.', 'bilgi');
      return;
    }
    try {
      let sira = sekmeler.length;
      for (const m of eklenecek) {
        sira += 1;
        await window.DBWrite.add(MODUL_KOLEKSIYON, {
          ad: m.ad,
          anahtar: m.id,
          ozet: '',
          sira,
          yayinda: true,
        });
      }
      await yukle();
      bildir(`${eklenecek.length} modül eklendi.`, 'basari');
    } catch (e) {
      bildir('Eklenemedi: ' + (e.message || ''), 'hata');
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

      {/* Bölüm seçici: slaytlar ve onları taşıyan sekmeler ayrı ayrı yönetilir.
          Sekme listesi de veritabanında — yeni bir modül eklemek için dağıtım
          beklemek gerekmiyor. */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
        {[
          ['slayt', 'Slaytlar'],
          ['modul', 'Modüller'],
        ].map(([anahtar, ad]) => (
          <button
            key={anahtar}
            onClick={() => {
              setBolum(anahtar);
              setDuzenlenen(null);
              setModulDuzenlenen(null);
            }}
            style={{
              padding: '8px 18px',
              borderRadius: 999,
              border: '1px solid ' + (bolum === anahtar ? C.navy || '#1B2A4A' : '#D1D5DB'),
              background: bolum === anahtar ? C.navy || '#1B2A4A' : 'white',
              color: bolum === anahtar ? 'white' : '#374151',
              fontSize: 13,
              fontWeight: 700,
              fontFamily: 'inherit',
              cursor: 'pointer',
            }}
          >
            {ad}
            {anahtar === 'modul' && sekmeler.length ? ` (${sekmeler.length})` : ''}
          </button>
        ))}
      </div>

      {bolum === 'slayt' && (
        <React.Fragment>
          {!duzenlenen && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <span style={{ fontSize: 12.5, color: C.textMuted || '#64748B' }}>Modül:</span>
              <select
                value={suzgec}
                onChange={(e) => setSuzgec(e.target.value)}
                style={{ ...girdi, width: 'auto', minWidth: 200, padding: '7px 10px' }}
              >
                <option value="">Tümü</option>
                {sekmeler.map((m) => (
                  <option key={m.anahtar} value={m.anahtar}>
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
                  video: '',
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
                  {sekmeler.map((m) => (
                    <option key={m.anahtar} value={m.anahtar}>
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
              {/* ── YouTube videosu ──
                  Ekran görüntüsü çekip yüklemek yerine, zaten YouTube'a
                  konmuş tanıtım videosunun bağlantısı yapıştırılabilir.
                  Video girildiğinde sağ panoda GÖRSELLERİN YERİNE o gösterilir:
                  ikisini yan yana koymak panoyu bölüp ikisini de küçültürdü. */}
              <div style={{ marginBottom: 12 }}>
                <label style={etiket}>YouTube videosu (isteğe bağlı)</label>
                <input
                  style={girdi}
                  value={duzenlenen.video || ''}
                  onChange={(e) => setDuzenlenen({ ...duzenlenen, video: e.target.value })}
                  placeholder="https://youtu.be/… veya https://www.youtube.com/watch?v=…"
                />
                {(function () {
                  var ham = String(duzenlenen.video || '').trim();
                  if (!ham) {
                    return (
                      <div
                        style={{ fontSize: 11.5, color: C.textMuted || '#64748B', marginTop: 4 }}
                      >
                        Bağlantı girilirse sağ panoda görseller yerine video görünür.
                      </div>
                    );
                  }
                  var gecerli = window.youtubeMu ? window.youtubeMu(ham) : true;
                  return (
                    <div
                      style={{
                        fontSize: 11.5,
                        marginTop: 4,
                        fontWeight: 600,
                        color: gecerli ? '#059669' : '#DC2626',
                      }}
                    >
                      {gecerli
                        ? 'Bağlantı tanındı — sağ panoda video gösterilecek.'
                        : 'Bu bir YouTube bağlantısı değil; sayfada görseller gösterilir.'}
                    </div>
                  );
                })()}
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={etiket}>Görseller (video yoksa gösterilir)</label>
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
              {suzgec
                ? 'Bu modülde henüz slayt yok.'
                : 'Henüz slayt yok. Tanıtım sayfasında bir sekmenin içi, ancak o modüle slayt eklendiğinde dolar.'}
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
                        {(sekmeler.find((m) => m.anahtar === s.modul) || {}).ad || 'MODÜLSÜZ'}
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
        </React.Fragment>
      )}

      {bolum === 'modul' && (
        <React.Fragment>
          <p style={{ margin: '0 0 14px', fontSize: 13, color: C.textMuted || '#64748B' }}>
            Tanıtım sayfasındaki sekmeler. Sekmeye tıklayan ziyaretçi o modüle bağlı slaytları
            görür. Sıra, sayfadaki sekme sırasıdır.
          </p>

          {!modulDuzenlenen && (
            <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
              <button
                onClick={() => setModulDuzenlenen({ sira: sekmeler.length + 1, yayinda: true })}
                style={dugme(C.navy || '#1B2A4A')}
              >
                + Yeni Modül
              </button>
              <button
                onClick={onerilenleriEkle}
                style={{ ...dugme('#F3F4F6'), color: '#374151' }}
                title="Otomasyondaki modüllerden hazır bir liste ekler; sonra düzenleyebilirsiniz."
              >
                Önerilen modülleri ekle
              </button>
            </div>
          )}

          {modulDuzenlenen && (
            <div style={{ ...kart, border: '2px solid ' + (C.navy || '#1B2A4A') }}>
              <div style={{ marginBottom: 12 }}>
                <label style={etiket}>Modül adı</label>
                <input
                  style={girdi}
                  value={modulDuzenlenen.ad || ''}
                  onChange={(e) => setModulDuzenlenen({ ...modulDuzenlenen, ad: e.target.value })}
                  placeholder="Örn: Ders Programı"
                />
                <div style={{ fontSize: 11.5, color: C.textMuted || '#64748B', marginTop: 4 }}>
                  {modulDuzenlenen.id
                    ? `Kimlik: ${modulDuzenlenen.anahtar} — adı değiştirseniz de sabit kalır, slaytlar buna bağlı.`
                    : `Kimlik addan üretilir: ${window.tanitimModulKimligi(modulDuzenlenen.ad || '') || '—'}`}
                </div>
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={etiket}>Özet (isteğe bağlı)</label>
                <input
                  style={girdi}
                  value={modulDuzenlenen.ozet || ''}
                  onChange={(e) => setModulDuzenlenen({ ...modulDuzenlenen, ozet: e.target.value })}
                  placeholder="Sekmenin altında görünecek kısa açıklama"
                />
              </div>
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  fontSize: 13,
                  marginBottom: 14,
                }}
              >
                <input
                  type="checkbox"
                  checked={modulDuzenlenen.yayinda !== false}
                  onChange={(e) =>
                    setModulDuzenlenen({ ...modulDuzenlenen, yayinda: e.target.checked })
                  }
                />
                Yayında
              </label>
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={modulKaydet} style={dugme('#10B981')}>
                  Kaydet
                </button>
                <button onClick={() => setModulDuzenlenen(null)} style={dugme('#6B7280')}>
                  İptal
                </button>
              </div>
            </div>
          )}

          {yukleniyor ? (
            <div style={{ padding: 30, textAlign: 'center', color: C.textMuted || '#64748B' }}>
              Yükleniyor…
            </div>
          ) : sekmeler.length === 0 ? (
            <div
              style={{
                ...kart,
                textAlign: 'center',
                color: C.textMuted || '#64748B',
                fontSize: 13.5,
              }}
            >
              Henüz modül yok. Modül eklenmeden tanıtım sayfasında sekme ve slayt görünmez.
            </div>
          ) : (
            sekmeler.map((m, i) => {
              const slaytSayisi = kayitlar.filter(
                (k) => window.tanitimSlaytNormalize(k).modul === m.anahtar
              ).length;
              return (
                <div key={m.id} style={{ ...kart, opacity: m.yayinda ? 1 : 0.55 }}>
                  <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}
                      >
                        <strong style={{ fontSize: 14.5 }}>{m.ad}</strong>
                        <span
                          style={{
                            fontSize: 10.5,
                            fontWeight: 700,
                            padding: '2px 8px',
                            borderRadius: 10,
                            background: slaytSayisi ? '#EEF6F5' : '#FEF3C7',
                            color: slaytSayisi ? '#0A7D72' : '#92400E',
                          }}
                        >
                          {slaytSayisi ? `${slaytSayisi} SLAYT` : 'SLAYT YOK'}
                        </span>
                        {!m.yayinda && (
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
                        style={{ fontSize: 12.5, color: C.textMuted || '#64748B', marginTop: 4 }}
                      >
                        {m.ozet || <span style={{ color: '#9CA3AF' }}>(özet yok)</span>}
                      </div>
                    </div>
                    <div
                      style={{ display: 'flex', flexDirection: 'column', gap: 4, flexShrink: 0 }}
                    >
                      <button
                        onClick={() => modulTasi(i, -1)}
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
                        onClick={() => modulTasi(i, 1)}
                        disabled={i === sekmeler.length - 1}
                        title="Aşağı taşı"
                        style={{
                          ...dugme('#F3F4F6'),
                          color: '#374151',
                          padding: '4px 10px',
                          opacity: i === sekmeler.length - 1 ? 0.4 : 1,
                        }}
                      >
                        ↓
                      </button>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                    <button
                      onClick={() => setModulDuzenlenen({ ...m })}
                      style={{ ...dugme('#2563EB'), padding: '6px 14px', fontSize: 12.5 }}
                    >
                      Düzenle
                    </button>
                    <button
                      onClick={() => {
                        setBolum('slayt');
                        setSuzgec(m.anahtar);
                      }}
                      style={{
                        ...dugme('#F3F4F6'),
                        color: '#374151',
                        padding: '6px 14px',
                        fontSize: 12.5,
                      }}
                    >
                      Slaytları
                    </button>
                    <button
                      onClick={() => modulSil(m)}
                      style={{ ...dugme('#DC2626'), padding: '6px 14px', fontSize: 12.5 }}
                    >
                      Sil
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </React.Fragment>
      )}
    </div>
  );
}

window.TanitimYonetimiApp = TanitimYonetimiApp;
