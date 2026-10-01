// ══════════════════════════════════════════════════════════════
// TTO TALEP SÜRECİ — belgeler, aşamalar, akademisyen ve yönetici panelleri
//
// Süreç (kurallar lib/tto-talep.js'te, sunucu aynı dosyayla karar verir):
//   1. Akademisyen formu doldurur, PDF indirir, imzalayıp kaşeler, imzalı
//      PDF'i yükleyerek TTO'ya gönderir.
//   2. TTO inceler; iade eder, reddeder ya da talep no ve TTO ONAYLI
//      (imzalı) başvuru formunu yükleyerek onaylar.
//   3. TTO proformayı hazırlar, imzalar, kaşeler ve yükler → akademisyene gider.
//   4. Akademisyen proformayı firmaya onaylatır, imzalatıp kaşeletir ve TTO'ya
//      geri gönderir.
//   5. TTO Genel Sekreterliğe gönderir.
//   6. Yönetim kararı çıkınca TTO kararı ve görevlendirme yazısını yükler →
//      akademisyene iletilir.
//   7. TTO faturayı keser ve yükler → süreç tamamlanır.
//
// Her belge PDF'tir ve iki taraf da hepsini görür, açar, indirir.
// ══════════════════════════════════════════════════════════════
import {
  TTO_ASAMALAR,
  TTO_BELGE_TURLERI,
  TTO_BELGE_KLASORU,
  TTO_DURUMLAR,
  asamaSirasi,
  eksikGecisBelgeleri,
  ttoPdfDosyaAdi,
} from './lib/tto-talep.js';
import {
  T,
  kart,
  giris,
  etiket,
  dugme,
  metin,
  tarihTr,
  tarihSaatTr,
  DurumCipi,
} from './tto-stil.jsx';

const { useState } = React;

// ── PDF çıktısı ──
// pdf-lib ve yazı tipi yalnız indirme anında yüklenir (ana pakete girmez).
export async function pdfAktar(talep, ayarKaydi) {
  try {
    const [PDFLib, fontkitMod, tto, fN, fK] = await Promise.all([
      import('pdf-lib'),
      import('@pdf-lib/fontkit'),
      import('./lib/tto-pdf.js'),
      fetch('/yazitipi/DejaVuSans-tr.ttf').then((r) => {
        if (!r.ok) throw new Error('Yazı tipi yüklenemedi (HTTP ' + r.status + ').');
        return r.arrayBuffer();
      }),
      fetch('/yazitipi/DejaVuSans-Bold-tr.ttf').then((r) => {
        if (!r.ok) throw new Error('Yazı tipi yüklenemedi (HTTP ' + r.status + ').');
        return r.arrayBuffer();
      }),
    ]);
    const bayt = await tto.ttoPdfOlustur({
      talep,
      ayarKaydi,
      PDFLib,
      fontkit: fontkitMod.default || fontkitMod,
      fontNormal: fN,
      fontKalin: fK,
    });
    const blob = new Blob([bayt], { type: 'application/pdf' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = ttoPdfDosyaAdi(talep);
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 10000);
    return { ok: true };
  } catch (e) {
    return { ok: false, hata: 'PDF oluşturulamadı: ' + ((e && e.message) || e) };
  }
}

// ── Dosya yükleme (yalnız PDF) ──
export async function belgeDosyasiYukle(dosya) {
  if (!dosya) throw new Error('Dosya seçilmedi.');
  if (!/\.pdf$/i.test(dosya.name || '')) {
    throw new Error('Yalnız PDF yüklenebilir. İmzalı belgeyi tarayıp PDF olarak kaydedin.');
  }
  const fd = new FormData();
  fd.append('folder', TTO_BELGE_KLASORU);
  fd.append('file', dosya);
  const r = await fetch('/api/files/upload?folder=' + TTO_BELGE_KLASORU, {
    method: 'POST',
    body: fd,
    credentials: 'include',
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || 'Yüklenemedi (HTTP ' + r.status + ').');
  return { url: j.downloadURL, ad: dosya.name };
}

/**
 * Tek belge seçici: PDF seçilince hemen yüklenir; kayda geçmesi için
 * çağıran `deger`i işlemin `ekBelgeler`ine koyar.
 */
export function BelgeSecici({ tur, deger, onDegis, zorunlu, aciklama, kilitli }) {
  const [yukleniyor, setYukleniyor] = useState(false);
  const [hata, setHata] = useState('');
  const tanim = TTO_BELGE_TURLERI[tur] || { label: tur };
  const sec = async (e) => {
    const dosya = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!dosya) return;
    setHata('');
    setYukleniyor(true);
    try {
      const r = await belgeDosyasiYukle(dosya);
      onDegis({ tur, url: r.url, ad: r.ad });
    } catch (err) {
      setHata((err && err.message) || 'Yüklenemedi.');
    } finally {
      setYukleniyor(false);
    }
  };
  return (
    <div
      data-belge-secici={tur}
      style={{
        border: `1px dashed ${deger ? '#86EFAC' : zorunlu ? '#FCA5A5' : T.kenarGiris}`,
        background: deger ? '#F0FDF4' : '#FFFFFF',
        borderRadius: 10,
        padding: '10px 12px',
      }}
    >
      <div style={{ fontSize: 13, fontWeight: 700, color: T.metin }}>
        {tanim.label} {zorunlu && <span style={{ color: T.tehlike }}>*</span>}
        <span style={{ fontSize: 11.5, fontWeight: 500, color: T.soluk }}> · yalnız PDF</span>
      </div>
      {aciklama && <div style={{ fontSize: 12, color: T.soluk, marginTop: 2 }}>{aciklama}</div>}
      <div
        style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginTop: 8 }}
      >
        {deger ? (
          <>
            <a href={deger.url} target="_blank" rel="noreferrer" style={{ fontSize: 13 }}>
              {deger.ad || 'Yüklenen belge'}
            </a>
            {!kilitli && (
              <button
                type="button"
                style={{ ...dugme('sessiz'), padding: '4px 10px', fontSize: 12 }}
                onClick={() => onDegis(null)}
              >
                Kaldır
              </button>
            )}
          </>
        ) : (
          <input
            type="file"
            accept="application/pdf,.pdf"
            disabled={kilitli || yukleniyor}
            onChange={sec}
            style={{ fontSize: 12.5 }}
          />
        )}
        {yukleniyor && <span style={{ fontSize: 12, color: T.soluk }}>Yükleniyor…</span>}
      </div>
      {hata && (
        <div role="alert" style={{ fontSize: 12.5, color: T.tehlike, marginTop: 6 }}>
          {hata}
        </div>
      )}
    </div>
  );
}

/** Talebin bütün belgeleri (eski kayıtlardaki tek onaylı belge dahil). */
export function talepBelgeleri(t) {
  const liste = Array.isArray(t && t.belgeler) ? t.belgeler.slice() : [];
  if (t && t.onayliBelgeUrl && !liste.some((b) => b.tur === 'onayli_basvuru')) {
    liste.push({
      id: 'eski-onayli',
      tur: 'onayli_basvuru',
      ad: t.onayliBelgeAdi || 'Onaylı belge',
      url: t.onayliBelgeUrl,
      rol: 'tto',
      yukleyen: t.kararVeren || 'TTO',
      tarih: t.kararTarihi || '',
    });
  }
  return liste;
}

/** Belge listesi — iki taraf da görür, açar, indirir. */
export function BelgeListesi({ talep, baslik = 'Belgeler' }) {
  const liste = talepBelgeleri(talep);
  return (
    <div style={kart} data-belge-listesi>
      <div style={{ fontSize: 14, fontWeight: 800, color: T.navy, marginBottom: 10 }}>
        {baslik} ({liste.length})
      </div>
      {liste.length === 0 ? (
        <div style={{ fontSize: 13, color: T.soluk }}>Henüz belge yüklenmedi.</div>
      ) : (
        <div style={{ display: 'grid', gap: 8 }}>
          {liste.map((b) => {
            const tto = b.rol === 'tto';
            return (
              <div
                key={b.id || b.url}
                data-belge={b.tur}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  flexWrap: 'wrap',
                  padding: '9px 12px',
                  borderRadius: 9,
                  background: T.zemin,
                  border: `1px solid ${T.kenar}`,
                }}
              >
                <span
                  style={{
                    fontSize: 10.5,
                    fontWeight: 800,
                    padding: '2px 7px',
                    borderRadius: 999,
                    color: tto ? '#1D4ED8' : '#7C3AED',
                    background: tto ? '#EFF6FF' : '#F5F3FF',
                  }}
                >
                  {tto ? 'TTO' : 'Akademisyen'}
                </span>
                <div style={{ flex: '1 1 240px', minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: T.metin }}>
                    {(TTO_BELGE_TURLERI[b.tur] || {}).label || b.tur}
                  </div>
                  <div style={{ fontSize: 11.5, color: T.soluk }}>
                    {b.ad} · {b.yukleyen} · {tarihSaatTr(b.tarih)}
                  </div>
                </div>
                <a
                  href={b.url}
                  target="_blank"
                  rel="noreferrer"
                  style={{ ...dugme('sessiz'), padding: '6px 12px', textDecoration: 'none' }}
                >
                  Görüntüle
                </a>
                <a
                  href={b.url + '?download=true'}
                  style={{ ...dugme('vurgu'), padding: '6px 12px', textDecoration: 'none' }}
                >
                  İndir
                </a>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/** Aşama çizgisi: tamamlanan, şu anki ve sıradaki aşamalar. */
export function SurecCizgisi({ durum }) {
  const d = durum || 'taslak';
  const sira = asamaSirasi(d);
  const tamamlandi = d === 'tamamlandi';
  return (
    <div
      data-surec
      style={{
        display: 'flex',
        gap: 4,
        flexWrap: 'wrap',
        alignItems: 'center',
        margin: '4px 0 12px',
      }}
    >
      {TTO_ASAMALAR.map((a, i) => {
        const no = i + 1;
        const bitti = no < sira || tamamlandi;
        const simdi = no === sira && !tamamlandi;
        const renk = bitti ? T.basari : simdi ? T.birincil : '#CBD5E1';
        return (
          <div key={a.durum} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span
              title={TTO_DURUMLAR[a.durum].label}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '4px 9px',
                borderRadius: 999,
                fontSize: 11.5,
                fontWeight: simdi ? 800 : 600,
                color: bitti || simdi ? '#fff' : T.soluk,
                background: bitti || simdi ? renk : '#F1F5F9',
              }}
            >
              {bitti ? '✓' : no} {a.kisa}
            </span>
            {i < TTO_ASAMALAR.length - 1 && <span style={{ color: '#CBD5E1' }}>›</span>}
          </div>
        );
      })}
    </div>
  );
}

const yaz = async (id, veri) => {
  await window.DBWrite.update('tto_talepleri', String(id), veri);
  if (window.apiInvalidate) window.apiInvalidate('tto_talepleri');
};

function Mesaj({ mesaj }) {
  if (!mesaj) return null;
  return (
    <div
      role="status"
      style={{
        marginTop: 10,
        fontSize: 13,
        fontWeight: 600,
        color: mesaj.ok ? T.basari : T.tehlike,
      }}
    >
      {mesaj.metin}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// AKADEMİSYEN — gönderim kartı (taslak / iade)
// Formu PDF indir → imzala, kaşele → imzalı PDF'i yükle → gönder.
// ══════════════════════════════════════════════════════════════
export function GonderimKarti({ talep, ayarKaydi, imzali, onImzali, onMesaj }) {
  const [hazirlaniyor, setHazirlaniyor] = useState(false);
  const indir = async () => {
    setHazirlaniyor(true);
    const r = await pdfAktar(talep, ayarKaydi);
    setHazirlaniyor(false);
    if (!r.ok && onMesaj) onMesaj({ tur: 'hata', metin: r.hata });
  };
  const adim = (no, baslik, govde) => (
    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
      <span
        style={{
          flex: '0 0 22px',
          height: 22,
          borderRadius: '50%',
          background: T.navy,
          color: '#fff',
          fontSize: 11.5,
          fontWeight: 700,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {no}
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: T.metin }}>{baslik}</div>
        {govde}
      </div>
    </div>
  );
  return (
    <div style={{ ...kart, borderColor: '#BFDBFE', background: '#F8FAFF' }} data-gonderim>
      <div style={{ fontSize: 14, fontWeight: 800, color: T.navy, marginBottom: 12 }}>
        TTO’ya gönderim
      </div>
      <div style={{ display: 'grid', gap: 12 }}>
        {adim(
          1,
          'Formu PDF olarak indirin',
          <button
            type="button"
            style={{ ...dugme('sessiz'), marginTop: 6 }}
            onClick={indir}
            disabled={hazirlaniyor}
          >
            {hazirlaniyor ? 'Hazırlanıyor…' : 'Başvuru formunu PDF indir'}
          </button>
        )}
        {adim(
          2,
          'Çıktıyı imzalayın ve kaşeleyin',
          <div style={{ fontSize: 12.5, color: T.soluk, marginTop: 2 }}>
            “Başvuru sahibinin kaşe ve imza” alanını doldurup belgeyi tarayın.
          </div>
        )}
        {adim(
          3,
          'İmzalı ve kaşeli formu yükleyin',
          <div style={{ marginTop: 6 }}>
            <BelgeSecici tur="basvuru_imzali" zorunlu deger={imzali} onDegis={onImzali} />
          </div>
        )}
      </div>
      <div style={{ fontSize: 12, color: T.soluk, marginTop: 10 }}>
        Formda değişiklik yaparsanız PDF’i yeniden indirip imzalı hâlini yeniden yükleyin.
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// AKADEMİSYEN — gönderilmiş talebin süreç kartı
// ══════════════════════════════════════════════════════════════
const AKADEMISYEN_METNI = {
  gonderildi: () =>
    'Talebiniz TTO’ya gönderildi. TTO incelemeye alana kadar “Taleplerim”den geri çekip düzenleyebilirsiniz.',
  incelemede: () =>
    'TTO talebinizi inceliyor. Karar verildiğinde burada ve bildirimlerinizde görünür.',
  onaylandi: (t) =>
    'Başvurunuz onaylandı' +
    (t.talepNo ? ' (Talep No: ' + t.talepNo + ')' : '') +
    '. TTO onaylı başvuru formu belgelerinizde. TTO proformayı hazırlıyor.',
  proforma_gonderildi: () =>
    'Sıra sizde: TTO’nun imzalayıp kaşelediği proformayı indirin; firmaya onaylatıp imzalatın ve kaşeletin, PDF olarak yükleyip TTO’ya geri gönderin.',
  proforma_dondu: () =>
    'Firma onaylı proforma TTO’da. TTO talebinizi yönetim kararı için Genel Sekreterliğe gönderecek.',
  genel_sekreterlikte: () => 'Talebiniz yönetim kararı için Genel Sekreterlikte.',
  gorevlendirildi: () =>
    'Yönetim kararı çıktı. Görevlendirme yazınız ve karar belgeleriniz aşağıda. Fatura kesildiğinde süreç tamamlanır.',
  tamamlandi: (t) =>
    'Fatura kesildi' + (t.faturaNo ? ' (No: ' + t.faturaNo + ')' : '') + '. Süreç tamamlandı.',
  reddedildi: () => 'Talebiniz reddedildi.',
};

export function AkademisyenSurecKarti({ talep, onDegisti }) {
  const t = talep || {};
  const d = t.durum || 'taslak';
  const [firma, setFirma] = useState(null);
  const [ek, setEk] = useState(null);
  const [mesgul, setMesgul] = useState('');
  const [mesaj, setMesaj] = useState(null);
  const metinFn = AKADEMISYEN_METNI[d];
  if (!metinFn) return null;
  const kapali = d === 'tamamlandi' || d === 'reddedildi';
  const renk =
    d === 'reddedildi'
      ? ['#FEF2F2', '#FECACA', '#991B1B']
      : d === 'proforma_gonderildi'
        ? ['#F5F3FF', '#DDD6FE', '#5B21B6']
        : d === 'tamamlandi' || d === 'gorevlendirildi' || d === 'onaylandi'
          ? ['#ECFDF5', '#A7F3D0', '#065F46']
          : ['#EFF6FF', '#BFDBFE', '#1E40AF'];

  const islem = async (tur, veri, basari) => {
    setMesgul(tur);
    setMesaj(null);
    try {
      await yaz(t.id, veri);
      setMesaj({ ok: true, metin: basari });
      if (tur === 'firma') setFirma(null);
      if (tur === 'ek') setEk(null);
      if (onDegisti) await onDegisti(t.id);
    } catch (e) {
      setMesaj({ ok: false, metin: (e && e.message) || 'Gönderilemedi.' });
    } finally {
      setMesgul('');
    }
  };

  return (
    <>
      <div
        data-akademisyen-surec
        style={{ ...kart, background: renk[0], borderColor: renk[1], color: renk[2] }}
      >
        <SurecCizgisi durum={d} />
        <div style={{ fontSize: 13.5, lineHeight: 1.6 }}>{metinFn(t)}</div>
        {metin(t.yoneticiNotu) &&
          (d === 'reddedildi' || d === 'proforma_gonderildi' || d === 'onaylandi') && (
            <div style={{ fontSize: 13, marginTop: 6 }}>
              <b>TTO notu:</b> {t.yoneticiNotu}
            </div>
          )}

        {d === 'proforma_gonderildi' && (
          <div style={{ marginTop: 12, color: T.metin }}>
            <BelgeSecici
              tur="proforma_firma"
              zorunlu
              deger={firma}
              onDegis={setFirma}
              aciklama="Firmanın onayladığı, imzaladığı ve kaşelediği proforma."
            />
            <button
              style={{ ...dugme('birincil'), marginTop: 10 }}
              disabled={!firma || !!mesgul}
              onClick={() =>
                islem(
                  'firma',
                  { durum: 'proforma_dondu', ekBelgeler: [firma] },
                  'Firma onaylı proforma TTO’ya gönderildi.'
                )
              }
            >
              {mesgul === 'firma' ? 'Gönderiliyor…' : 'Proformayı TTO’ya gönder'}
            </button>
          </div>
        )}
        <Mesaj mesaj={mesaj} />
      </div>

      <BelgeListesi talep={t} />

      {!kapali && (
        <div style={kart}>
          <div style={{ fontSize: 13.5, fontWeight: 700, color: T.navy, marginBottom: 8 }}>
            Ek belge gönder (isteğe bağlı)
          </div>
          <BelgeSecici tur="ek" deger={ek} onDegis={setEk} />
          <button
            style={{ ...dugme('sessiz'), marginTop: 10 }}
            disabled={!ek || !!mesgul}
            onClick={() => islem('ek', { ekBelgeler: [ek] }, 'Ek belge TTO’ya iletildi.')}
          >
            {mesgul === 'ek' ? 'Gönderiliyor…' : 'Ek belgeyi gönder'}
          </button>
        </div>
      )}
    </>
  );
}

// ══════════════════════════════════════════════════════════════
// TTO YÖNETİCİSİ — süreç paneli
// ══════════════════════════════════════════════════════════════
export function YoneticiSurecPaneli({ talep, kimlik, onDegisti, onSilindi }) {
  const t = talep || {};
  const d = t.durum || 'taslak';
  const [alan, setAlan] = useState(() => ({
    talepNo: metin(t.talepNo),
    talepTarihi: metin(t.talepTarihi).slice(0, 10) || new Date().toISOString().slice(0, 10),
    alanKisi: metin(t.alanKisi) || kimlik,
    yoneticiNotu: metin(t.yoneticiNotu),
    faturaNo: metin(t.faturaNo),
  }));
  const [belge, setBelge] = useState({}); // tür → {tur,url,ad}
  const [mesgul, setMesgul] = useState('');
  const [mesaj, setMesaj] = useState(null);
  const yazAlan = (k, v) => setAlan((a) => ({ ...a, [k]: v }));
  const belgeAyarla = (tur) => (deger) => setBelge((b) => ({ ...b, [tur]: deger }));
  const ilkAsama = d === 'gonderildi' || d === 'incelemede';

  // Bir geçiş için eksik belge var mı? (Düğme kapalı kalır, sebebi yazar.)
  const eksik = (yeni) =>
    eksikGecisBelgeleri(d, yeni, talepBelgeleri(t), Object.values(belge).filter(Boolean));

  const gecis = async (yeni, onay, alanlar) => {
    if (onay && !confirm(onay)) return;
    setMesgul(yeni || 'kaydet');
    setMesaj(null);
    try {
      const veri = { ...(alanlar || {}) };
      if (yeni) veri.durum = yeni;
      const ekler = Object.values(belge).filter(Boolean);
      if (ekler.length > 0) veri.ekBelgeler = ekler;
      await yaz(t.id, veri);
      setBelge({});
      setMesaj({
        ok: true,
        metin: yeni
          ? (TTO_DURUMLAR[yeni] || {}).label + ' — akademisyene iletildi.'
          : ekler.length > 0
            ? 'Belge yüklendi ve akademisyene iletildi.'
            : 'Kaydedildi.',
      });
      if (onDegisti) await onDegisti(t.id);
    } catch (e) {
      setMesaj({ ok: false, metin: (e && e.message) || 'Kaydedilemedi.' });
    } finally {
      setMesgul('');
    }
  };

  const sil = async () => {
    if (
      !confirm(
        'Bu talep ve süreç kaydı kalıcı olarak silinecek; akademisyene bildirim gider. Emin misiniz?'
      )
    )
      return;
    setMesgul('sil');
    try {
      await window.DBWrite.remove('tto_talepleri', String(t.id));
      if (window.apiInvalidate) window.apiInvalidate('tto_talepleri');
      if (onSilindi) await onSilindi(t.id);
    } catch (e) {
      setMesaj({ ok: false, metin: (e && e.message) || 'Silinemedi.' });
      setMesgul('');
    }
  };

  const ttoAlanlari = { ...alan };
  // Geçiş düğmesi (bileşen değil, düz işlev: her çizimde yeniden kurulmasın).
  const dg = ({ yeni, tur = 'birincil', etiketi, onay, alanlar, belgeGerek = true, stil }) => {
    const eks = belgeGerek && yeni ? eksik(yeni) : [];
    return (
      <button
        key={(yeni || 'kaydet') + etiketi}
        style={{ ...dugme(tur), ...(stil || {}) }}
        disabled={!!mesgul || eks.length > 0}
        title={eks.length ? 'Önce yükleyin: ' + eks.join(', ') : ''}
        onClick={() => gecis(yeni, onay, alanlar)}
      >
        {mesgul === (yeni || 'kaydet') ? 'Kaydediliyor…' : etiketi}
      </button>
    );
  };
  const not = (etiketMetni) => (
    <label style={{ display: 'block', marginTop: 12 }}>
      <span style={etiket}>{etiketMetni}</span>
      <textarea
        data-alan="yoneticiNotu"
        style={{ ...giris, minHeight: 64, resize: 'vertical' }}
        value={alan.yoneticiNotu}
        onChange={(e) => yazAlan('yoneticiNotu', e.target.value)}
      />
    </label>
  );
  const satir = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: 12,
  };
  const dugmeler = { display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 14 };

  let govde = null;
  if (ilkAsama) {
    govde = (
      <>
        <div style={satir}>
          <label>
            <span style={etiket}>Talep No *</span>
            <input
              data-alan="talepNo"
              style={giris}
              value={alan.talepNo}
              onChange={(e) => yazAlan('talepNo', e.target.value)}
            />
          </label>
          <label>
            <span style={etiket}>Talep Tarihi</span>
            <input
              type="date"
              style={giris}
              value={alan.talepTarihi}
              onChange={(e) => yazAlan('talepTarihi', e.target.value)}
            />
          </label>
          <label>
            <span style={etiket}>Başvuruyu Alan Kişi *</span>
            <input
              data-alan="alanKisi"
              style={giris}
              value={alan.alanKisi}
              onChange={(e) => yazAlan('alanKisi', e.target.value)}
            />
          </label>
        </div>
        <div style={{ marginTop: 12 }}>
          <BelgeSecici
            tur="onayli_basvuru"
            zorunlu
            deger={belge.onayli_basvuru}
            onDegis={belgeAyarla('onayli_basvuru')}
            aciklama="Akademisyenin imzalı ve kaşeli formunu TTO adına imzalayıp yükleyin. Onay için zorunludur."
          />
        </div>
        {not('Akademisyene not (iade ve ret için zorunlu)')}
        <div style={dugmeler}>
          {d === 'gonderildi' &&
            dg({
              yeni: 'incelemede',
              tur: 'sessiz',
              etiketi: 'İncelemeye al',
              belgeGerek: false,
              alanlar: ttoAlanlari,
            })}
          {dg({
            yeni: 'onaylandi',
            etiketi: 'Onayla ve akademisyene gönder',
            onay: 'Başvuru onaylanıp akademisyene iletilecek. Devam edilsin mi?',
            alanlar: ttoAlanlari,
            stil: { background: T.basari, borderColor: T.basari },
          })}
          {dg({
            yeni: 'iade',
            tur: 'sessiz',
            etiketi: 'Düzeltme için iade et',
            onay: 'Talep düzeltme için akademisyene iade edilecek. Devam edilsin mi?',
            alanlar: ttoAlanlari,
          })}
          {dg({
            yeni: 'reddedildi',
            tur: 'tehlike',
            etiketi: 'Reddet',
            onay: 'Talep reddedilecek. Emin misiniz?',
            alanlar: ttoAlanlari,
          })}
          {dg({ yeni: null, tur: 'sessiz', etiketi: 'Bilgileri kaydet', alanlar: ttoAlanlari })}
        </div>
      </>
    );
  } else if (d === 'onaylandi') {
    govde = (
      <>
        <BelgeSecici
          tur="proforma_tto"
          zorunlu
          deger={belge.proforma_tto}
          onDegis={belgeAyarla('proforma_tto')}
          aciklama="Hazırladığınız, TTO adına imzalayıp kaşelediğiniz proforma. Akademisyen bunu firmaya onaylatıp imzalatacak ve kaşeletecek."
        />
        <div style={dugmeler}>
          {dg({ yeni: 'proforma_gonderildi', etiketi: 'Proformayı akademisyene gönder' })}
          {dg({
            yeni: 'incelemede',
            tur: 'sessiz',
            etiketi: 'Onayı geri al',
            onay: 'Onay geri alınıp talep yeniden incelemeye alınacak. Emin misiniz?',
            belgeGerek: false,
          })}
        </div>
      </>
    );
  } else if (d === 'proforma_gonderildi') {
    govde = (
      <>
        <div style={{ fontSize: 13, color: T.metin }}>
          Proforma akademisyende: firmanın onaylayıp imzaladığı ve kaşelediği proforma bekleniyor.
          Proformayı değiştirmeniz gerekirse yenisini yükleyebilirsiniz.
        </div>
        <div style={{ marginTop: 10 }}>
          <BelgeSecici
            tur="proforma_tto"
            deger={belge.proforma_tto}
            onDegis={belgeAyarla('proforma_tto')}
          />
        </div>
        <div style={dugmeler}>
          <button
            style={dugme('sessiz')}
            disabled={!belge.proforma_tto || !!mesgul}
            onClick={() => gecis(null)}
          >
            Yeni proformayı gönder
          </button>
        </div>
      </>
    );
  } else if (d === 'proforma_dondu') {
    govde = (
      <>
        <div style={{ fontSize: 13, color: T.metin }}>
          Firma onaylı proforma geldi (belgelerde). Uygunsa yönetim kararı için Genel Sekreterliğe
          gönderin; eksikse gerekçeyle akademisyene geri gönderin.
        </div>
        <div style={{ marginTop: 10 }}>
          <BelgeSecici
            tur="ust_yazi"
            deger={belge.ust_yazi}
            onDegis={belgeAyarla('ust_yazi')}
            aciklama="İsteğe bağlı: Genel Sekreterliğe gönderilen üst yazı."
          />
        </div>
        {not('Akademisyene not (proformayı geri gönderirken zorunlu)')}
        <div style={dugmeler}>
          {dg({
            yeni: 'genel_sekreterlikte',
            etiketi: 'Genel Sekreterliğe gönderildi',
            onay: 'Talep Genel Sekreterliğe gönderildi olarak işaretlenecek. Devam edilsin mi?',
            alanlar: { yoneticiNotu: alan.yoneticiNotu },
          })}
          {dg({
            yeni: 'proforma_gonderildi',
            tur: 'sessiz',
            etiketi: 'Proformayı düzeltme için geri gönder',
            alanlar: { yoneticiNotu: alan.yoneticiNotu },
            belgeGerek: false,
          })}
        </div>
      </>
    );
  } else if (d === 'genel_sekreterlikte') {
    govde = (
      <>
        <div style={{ fontSize: 13, color: T.metin, marginBottom: 10 }}>
          Yönetim kararı çıktığında kararı ve görevlendirme yazısını yükleyin; akademisyene
          iletilir.
        </div>
        <div style={{ display: 'grid', gap: 10 }}>
          <BelgeSecici
            tur="yonetim_karari"
            zorunlu
            deger={belge.yonetim_karari}
            onDegis={belgeAyarla('yonetim_karari')}
          />
          <BelgeSecici
            tur="gorevlendirme"
            zorunlu
            deger={belge.gorevlendirme}
            onDegis={belgeAyarla('gorevlendirme')}
          />
        </div>
        {not('Akademisyene not (olumsuz kararda zorunlu)')}
        <div style={dugmeler}>
          {dg({
            yeni: 'gorevlendirildi',
            etiketi: 'Görevlendirme yazısını akademisyene ilet',
            alanlar: { yoneticiNotu: alan.yoneticiNotu },
            stil: { background: T.basari, borderColor: T.basari },
          })}
          {dg({
            yeni: 'reddedildi',
            tur: 'tehlike',
            etiketi: 'Olumsuz karar — reddet',
            onay: 'Yönetim kararı olumsuz: talep reddedilecek. Emin misiniz?',
            alanlar: { yoneticiNotu: alan.yoneticiNotu },
            belgeGerek: false,
          })}
        </div>
      </>
    );
  } else if (d === 'gorevlendirildi') {
    govde = (
      <>
        <div style={satir}>
          <label>
            <span style={etiket}>Fatura No</span>
            <input
              data-alan="faturaNo"
              style={giris}
              value={alan.faturaNo}
              onChange={(e) => yazAlan('faturaNo', e.target.value)}
            />
          </label>
        </div>
        <div style={{ marginTop: 10 }}>
          <BelgeSecici tur="fatura" zorunlu deger={belge.fatura} onDegis={belgeAyarla('fatura')} />
        </div>
        <div style={dugmeler}>
          {dg({
            yeni: 'tamamlandi',
            etiketi: 'Fatura kesildi — süreci tamamla',
            alanlar: { faturaNo: alan.faturaNo },
            stil: { background: T.basari, borderColor: T.basari },
          })}
        </div>
      </>
    );
  } else if (d === 'reddedildi') {
    govde = (
      <div style={dugmeler}>
        {dg({
          yeni: 'incelemede',
          tur: 'sessiz',
          etiketi: 'Kararı geri al',
          onay: 'Ret geri alınıp talep yeniden incelemeye alınacak. Emin misiniz?',
          belgeGerek: false,
        })}
      </div>
    );
  } else if (d === 'iade') {
    govde = (
      <div style={{ fontSize: 13, color: '#991B1B' }}>
        Talep düzeltme için akademisyene iade edildi; yeniden gönderildiğinde burada “Sizde
        bekleyen” olarak görünür.
      </div>
    );
  } else if (d === 'tamamlandi') {
    govde = (
      <div style={{ fontSize: 13, color: '#065F46' }}>
        Süreç tamamlandı{t.faturaNo ? ' · Fatura No: ' + t.faturaNo : ''}.
      </div>
    );
  }

  return (
    <>
      <div style={{ ...kart, borderColor: '#C7D2FE', background: '#F8FAFF' }} data-yonetici-surec>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            flexWrap: 'wrap',
            marginBottom: 6,
          }}
        >
          <div style={{ fontSize: 15, fontWeight: 800, color: T.navy }}>TTO süreci</div>
          <DurumCipi durum={d} />
          {t.talepNo && <span style={{ fontSize: 12, color: T.soluk }}>Talep No: {t.talepNo}</span>}
          {t.kararVeren && (
            <span style={{ fontSize: 12, color: T.soluk }}>
              Karar: {t.kararVeren} · {tarihTr(t.kararTarihi)}
            </span>
          )}
          <button
            style={{ ...dugme('tehlike'), marginLeft: 'auto', padding: '6px 12px', fontSize: 12.5 }}
            disabled={!!mesgul}
            onClick={sil}
          >
            {mesgul === 'sil' ? 'Siliniyor…' : 'Talebi sil'}
          </button>
        </div>
        <SurecCizgisi durum={d} />
        {govde}
        <Mesaj mesaj={mesaj} />
      </div>
      <BelgeListesi talep={t} />
    </>
  );
}
