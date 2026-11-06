// ══════════════════════════════════════════════════════════════
// YARDIM KILAVUZU — görüntüleyici (giriş ekranı) ve düzenleyici (yetkili)
//
//   • YardimKilavuzuPenceresi: giriş ekranındaki "Yardım Kılavuzu"
//     düğmesinin açtığı pencere. Kılavuz A4 sayfa görünümünde okunur ve
//     "PDF olarak indir" ile tarayıcının yazdırma penceresinden PDF'e
//     kaydedilir (Türkçe karakterler ve tablolar olduğu gibi kalır).
//   • YardimKilavuzuApp: üniversite yetkilisinin kılavuzu sistem içinden
//     düzenlediği modül. Metin Markdown'dır; yanında canlı önizleme vardır.
//
// İçerik kuralları lib/yardim-kilavuzu.js'tedir (varsayılan metin, kayıt
// önceliği, Markdown çevirici). Okuma anonim, yazma üniversite yetkilisinde
// (server/routes/db.js → YARDIM_YAZ).
// ══════════════════════════════════════════════════════════════
import {
  YARDIM_KOLEKSIYONU,
  KILAVUZLAR,
  EN_UZUN_ICERIK,
  kilavuzCoz,
  kilavuzHtml,
  metinOzeti,
} from './lib/yardim-kilavuzu.js';

const { useState, useEffect, useMemo, useCallback } = React;

const temizle = (html) => (window.DOMPurify ? window.DOMPurify.sanitize(html) : html);
const trTarih = (v) =>
  v
    ? new Date(v).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })
    : '';

async function kilavuzOku(id) {
  const r = await window.apiReadDoc(YARDIM_KOLEKSIYONU, id).catch(() => null);
  return kilavuzCoz((r && r.exists && r.data) || null, id);
}

// Kılavuzun hem ekranda hem PDF'te kullanılan biçimi.
const SAYFA_CSS = `
.yk-sayfa { font-family: Inter, 'Segoe UI', Arial, sans-serif; color: #1f2937; font-size: 14px; line-height: 1.62; }
.yk-sayfa h1 { font-size: 26px; color: #0b2341; margin: 0 0 10px; letter-spacing: -.02em; }
.yk-sayfa h2 { font-size: 19px; color: #0b2341; margin: 30px 0 8px; padding-bottom: 6px; border-bottom: 2px solid #e5edf5; }
.yk-sayfa h3 { font-size: 15.5px; color: #12408a; margin: 20px 0 6px; }
.yk-sayfa h4 { font-size: 14px; margin: 16px 0 4px; }
.yk-sayfa p { margin: 0 0 10px; }
.yk-sayfa ol, .yk-sayfa ul { margin: 0 0 12px; padding-left: 24px; }
.yk-sayfa li { margin: 3px 0; }
.yk-sayfa li > ul, .yk-sayfa li > ol { margin: 4px 0 2px; }
.yk-sayfa table { width: 100%; border-collapse: collapse; margin: 6px 0 16px; font-size: 13px; }
.yk-sayfa th { text-align: left; background: #f1f5f9; color: #334155; font-weight: 700; }
.yk-sayfa th, .yk-sayfa td { border: 1px solid #dbe3ea; padding: 7px 9px; vertical-align: top; }
.yk-sayfa code { background: #f1f5f9; padding: 1px 5px; border-radius: 4px; font-size: .92em; }
.yk-sayfa a { color: #12408a; }
`;

/** Kılavuzu gizli bir çerçevede açıp yazdırma penceresini getirir (PDF olarak kaydet). */
function pdfOlarakIndir(kilavuz) {
  const { html } = kilavuzHtml(kilavuz.icerik);
  const baslik = (/^#\s+(.+)$/m.exec(kilavuz.icerik) || [])[1] || kilavuz.baslik;
  const guncel = kilavuz.updatedAt ? 'Son güncelleme: ' + trTarih(kilavuz.updatedAt) : '';
  const belge =
    '<!doctype html><html lang="tr"><head><meta charset="utf-8"><title>' +
    baslik.replace(/[<>&"]/g, '') +
    '</title><style>@page{size:A4;margin:18mm 16mm}body{margin:0}' +
    SAYFA_CSS +
    '.yk-sayfa h2{break-after:avoid}.yk-sayfa h3{break-after:avoid}.yk-sayfa table,.yk-sayfa li{break-inside:avoid}' +
    '.yk-alt{margin-top:24px;font-size:11px;color:#64748b;border-top:1px solid #e2e8f0;padding-top:8px}' +
    '</style></head><body><div class="yk-sayfa">' +
    temizle(html) +
    (guncel ? '<div class="yk-alt">' + guncel + '</div>' : '') +
    '</div></body></html>';
  const cerceve = document.createElement('iframe');
  cerceve.setAttribute('aria-hidden', 'true');
  cerceve.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;';
  document.body.appendChild(cerceve);
  const d = cerceve.contentWindow.document;
  d.open();
  d.write(belge);
  d.close();
  setTimeout(() => {
    try {
      cerceve.contentWindow.focus();
      cerceve.contentWindow.print();
    } finally {
      setTimeout(() => cerceve.remove(), 1500);
    }
  }, 250);
}

/** Kılavuzun sayfa görünümü (ekranda). */
function KilavuzSayfasi({ icerik }) {
  const html = useMemo(() => temizle(kilavuzHtml(icerik).html), [icerik]);
  return <div className="yk-sayfa" dangerouslySetInnerHTML={{ __html: html }} />;
}

// ── Giriş ekranındaki pencere ────────────────────────────────────
export function YardimKilavuzuPenceresi({ onKapat, id = 'ogrenci' }) {
  const [kilavuz, setKilavuz] = useState(null);
  const [hata, setHata] = useState('');
  useEffect(() => {
    let iptal = false;
    kilavuzOku(id)
      .then((k) => !iptal && setKilavuz(k))
      .catch((e) => !iptal && setHata(e.message || 'Kılavuz yüklenemedi.'));
    return () => {
      iptal = true;
    };
  }, [id]);
  useEffect(() => {
    const h = (e) => e.key === 'Escape' && onKapat();
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onKapat]);

  const basliklar = useMemo(
    () => (kilavuz ? kilavuzHtml(kilavuz.icerik).basliklar.filter((b) => b.duzey === 2) : []),
    [kilavuz]
  );
  const git = (bid) => {
    const el = document.getElementById(bid);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Yardım Kılavuzu"
      data-yardim-kilavuzu
      onClick={(e) => e.target === e.currentTarget && onKapat()}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 2000,
        background: 'rgba(11,35,65,.55)',
        backdropFilter: 'blur(3px)',
        display: 'flex',
        alignItems: 'stretch',
        justifyContent: 'center',
        padding: 'min(4vh, 28px) 12px',
      }}
    >
      <style>{SAYFA_CSS + YK_PENCERE_CSS}</style>
      <div className="yk-pencere">
        <div className="yk-ust">
          <div style={{ minWidth: 0 }}>
            <div className="yk-ust-baslik">Yardım Kılavuzu</div>
            {kilavuz && kilavuz.updatedAt && (
              <div className="yk-ust-alt">Son güncelleme: {trTarih(kilavuz.updatedAt)}</div>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
            <button
              type="button"
              className="yk-dugme yk-dugme-ana"
              disabled={!kilavuz}
              onClick={() => kilavuz && pdfOlarakIndir(kilavuz)}
              data-yardim-pdf
              title="Yazdırma penceresinde hedef olarak “PDF olarak kaydet”i seçin"
            >
              PDF olarak indir
            </button>
            <button type="button" className="yk-dugme" onClick={onKapat} aria-label="Kapat">
              Kapat
            </button>
          </div>
        </div>
        <div className="yk-govde">
          {basliklar.length > 1 && (
            <nav className="yk-icindekiler" aria-label="İçindekiler">
              <div className="yk-icindekiler-baslik">İçindekiler</div>
              {basliklar.map((b) => (
                <button key={b.id} type="button" onClick={() => git(b.id)}>
                  {b.metin}
                </button>
              ))}
            </nav>
          )}
          <div className="yk-kagit-alani">
            {hata ? (
              <div style={{ padding: 30, color: '#b91c1c' }}>{hata}</div>
            ) : !kilavuz ? (
              <div style={{ padding: 30, color: '#64748b' }}>Yükleniyor…</div>
            ) : (
              <article className="yk-kagit">
                <KilavuzSayfasi icerik={kilavuz.icerik} />
              </article>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const YK_PENCERE_CSS = `
.yk-pencere { width: min(1120px, 100%); background: #eef2f6; border-radius: 16px; overflow: hidden;
  display: flex; flex-direction: column; box-shadow: 0 30px 80px rgba(0,0,0,.35); }
.yk-ust { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 12px 18px;
  background: linear-gradient(90deg,#0B2341,#0E2F63 60%,#12408A); color: #fff; border-bottom: 3px solid #FE8500; }
.yk-ust-baslik { font-weight: 800; font-size: 16px; }
.yk-ust-alt { font-size: 11.5px; opacity: .75; margin-top: 2px; }
.yk-dugme { font: inherit; font-size: 13px; font-weight: 700; padding: 8px 14px; border-radius: 9px; cursor: pointer;
  border: 1px solid rgba(255,255,255,.35); background: rgba(255,255,255,.1); color: #fff; }
.yk-dugme-ana { background: #FE8500; border-color: #FE8500; }
.yk-dugme:disabled { opacity: .5; cursor: default; }
.yk-govde { flex: 1; min-height: 0; display: flex; }
.yk-icindekiler { width: 230px; flex-shrink: 0; overflow: auto; padding: 18px 10px 18px 16px; border-right: 1px solid #dbe3ea; background: #f8fafc; }
.yk-icindekiler-baslik { font-size: 11px; font-weight: 800; letter-spacing: .08em; color: #64748b; text-transform: uppercase; margin: 0 0 8px 6px; }
.yk-icindekiler button { display: block; width: 100%; text-align: left; font: inherit; font-size: 13px; color: #1e3a5f;
  background: none; border: 0; padding: 7px 8px; border-radius: 7px; cursor: pointer; }
.yk-icindekiler button:hover { background: #e6eef7; }
.yk-kagit-alani { flex: 1; min-width: 0; overflow: auto; padding: 22px; }
.yk-kagit { max-width: 794px; margin: 0 auto; background: #fff; padding: 48px 56px; border-radius: 4px;
  box-shadow: 0 2px 14px rgba(15,23,42,.12); }
@media (max-width: 760px) {
  .yk-icindekiler { display: none; }
  .yk-kagit-alani { padding: 10px; }
  .yk-kagit { padding: 22px 18px; }
  .yk-ust { flex-wrap: wrap; }
}
`;

// ── Yetkilinin düzenleme modülü ──────────────────────────────────
export function YardimKilavuzuApp({ currentUser }) {
  const id = KILAVUZLAR[0].id;
  const [kilavuz, setKilavuz] = useState(null);
  const [metin, setMetin] = useState('');
  const [ilk, setIlk] = useState('');
  const [kaydediliyor, setKaydediliyor] = useState(false);
  const [mesaj, setMesaj] = useState({ tur: '', metin: '' });
  const [gorunum, setGorunum] = useState('ikisi'); // ikisi | metin | onizleme

  const yetkili = !!(
    currentUser &&
    (currentUser.role === 'admin' || currentUser.isUniversityAdmin)
  );

  const yukle = useCallback(async () => {
    if (window.apiInvalidate) window.apiInvalidate(YARDIM_KOLEKSIYONU);
    const k = await kilavuzOku(id);
    setKilavuz(k);
    setMetin(k.icerik);
    setIlk(k.icerik);
  }, [id]);
  useEffect(() => {
    yukle();
  }, [yukle]);

  const degisti = metin !== ilk;
  const tanim = KILAVUZLAR[0];

  const kaydet = async (yeniMetin) => {
    const icerik = typeof yeniMetin === 'string' ? yeniMetin : metin;
    if (icerik.length > EN_UZUN_ICERIK) {
      setMesaj({
        tur: 'hata',
        metin: 'Kılavuz çok uzun (en çok ' + EN_UZUN_ICERIK + ' karakter).',
      });
      return;
    }
    setKaydediliyor(true);
    setMesaj({ tur: '', metin: '' });
    try {
      await window.DBWrite.set(
        YARDIM_KOLEKSIYONU,
        id,
        {
          icerik,
          // Kaydedilen anın varsayılan metni: sonradan sistem kılavuzu
          // güncellenirse yetkili uyarılır (lib/yardim-kilavuzu.js).
          varsayilanOzeti: metinOzeti(tanim.varsayilan),
          updatedAt: new Date().toISOString(),
          updatedBy: (currentUser && (currentUser.name || currentUser.identifier)) || '',
        },
        true
      );
      await yukle();
      setMesaj({
        tur: 'basari',
        metin: icerik
          ? 'Kılavuz kaydedildi; giriş ekranında hemen görünür.'
          : 'Sistemin varsayılan kılavuzuna dönüldü.',
      });
    } catch (e) {
      setMesaj({ tur: 'hata', metin: 'Kaydedilemedi: ' + e.message });
    } finally {
      setKaydediliyor(false);
    }
  };

  const varsayilanaDon = () => {
    if (
      !window.confirm(
        'Kendi düzenlemeniz silinip sistemin güncel varsayılan kılavuzu kullanılacak. Devam edilsin mi?'
      )
    )
      return;
    kaydet('');
  };

  if (!yetkili) {
    return (
      <div style={{ padding: 30, color: '#64748b' }}>
        Yardım kılavuzunu yalnız üniversite yetkilisi düzenleyebilir.
      </div>
    );
  }
  if (!kilavuz) return <div style={{ padding: 30, color: '#64748b' }}>Yükleniyor…</div>;

  const Banner = window.CakuBanner;
  const kutu = {
    background: '#fff',
    border: '1px solid #e2e8f0',
    borderRadius: 12,
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    minWidth: 0,
  };
  const kutuBasi = {
    padding: '9px 14px',
    borderBottom: '1px solid #e2e8f0',
    background: '#f8fafc',
    fontSize: 12,
    fontWeight: 700,
    color: '#475569',
  };
  const dugme = (ana, pasif) => ({
    font: 'inherit',
    fontSize: 13,
    fontWeight: 700,
    padding: '9px 16px',
    borderRadius: 9,
    cursor: pasif ? 'default' : 'pointer',
    opacity: pasif ? 0.5 : 1,
    border: '1px solid ' + (ana ? '#12408A' : '#cbd5e1'),
    background: ana ? '#12408A' : '#fff',
    color: ana ? '#fff' : '#1e293b',
  });

  return (
    <div style={{ fontFamily: "'Inter', sans-serif", color: '#1f2937', paddingBottom: 40 }}>
      <style>{SAYFA_CSS}</style>
      {Banner ? (
        <Banner
          title="Yardım Kılavuzu"
          subtitle="Giriş ekranındaki “Yardım Kılavuzu”nun içeriği — öğrencilere gösterilir, PDF olarak indirilebilir"
        />
      ) : (
        <h1>Yardım Kılavuzu</h1>
      )}

      <div
        style={{
          background: kilavuz.ozel ? '#eff6ff' : '#f0fdf4',
          border: '1px solid ' + (kilavuz.ozel ? '#bfdbfe' : '#bbf7d0'),
          borderRadius: 10,
          padding: '10px 14px',
          fontSize: 13,
          marginBottom: 12,
          lineHeight: 1.55,
        }}
      >
        {kilavuz.ozel ? (
          <>
            Giriş ekranında <b>sizin düzenlediğiniz</b> metin gösteriliyor
            {kilavuz.updatedAt ? ' (son kayıt ' + trTarih(kilavuz.updatedAt) : ''}
            {kilavuz.updatedBy ? ', ' + kilavuz.updatedBy : ''}
            {kilavuz.updatedAt ? ')' : ''}.
          </>
        ) : (
          <>
            Giriş ekranında <b>sistemin varsayılan</b> kılavuzu gösteriliyor. Düzenleyip
            kaydettiğinizde sizin metniniz geçerli olur.
          </>
        )}
      </div>

      {kilavuz.varsayilanGuncellendi && (
        <div
          data-varsayilan-guncellendi
          style={{
            background: '#fffbeb',
            border: '1px solid #fde68a',
            borderRadius: 10,
            padding: '10px 14px',
            fontSize: 13,
            marginBottom: 12,
            display: 'flex',
            gap: 12,
            alignItems: 'center',
            flexWrap: 'wrap',
          }}
        >
          <span style={{ flex: '1 1 320px' }}>
            Siz kaydettikten sonra <b>sistemin varsayılan kılavuzu güncellendi</b> (yeni özellikler
            anlatıldı). Yeni metni düzenleyiciye alıp kendi eklerinizle birleştirebilirsiniz.
          </span>
          <button
            type="button"
            style={dugme(false)}
            onClick={() => {
              if (
                !degisti ||
                window.confirm('Düzenleyicideki kaydedilmemiş değişiklikler kaybolacak. Devam?')
              )
                setMetin(tanim.varsayilan);
            }}
          >
            Yeni varsayılanı düzenleyiciye al
          </button>
        </div>
      )}

      <div
        style={{
          display: 'flex',
          gap: 8,
          alignItems: 'center',
          flexWrap: 'wrap',
          marginBottom: 10,
        }}
      >
        <div
          style={{
            display: 'flex',
            border: '1px solid #cbd5e1',
            borderRadius: 9,
            overflow: 'hidden',
          }}
        >
          {[
            ['ikisi', 'Yan yana'],
            ['metin', 'Yalnız metin'],
            ['onizleme', 'Yalnız önizleme'],
          ].map(([k, ad]) => (
            <button
              key={k}
              type="button"
              onClick={() => setGorunum(k)}
              style={{
                font: 'inherit',
                fontSize: 12.5,
                fontWeight: 600,
                padding: '7px 12px',
                border: 0,
                cursor: 'pointer',
                background: gorunum === k ? '#12408A' : '#fff',
                color: gorunum === k ? '#fff' : '#334155',
              }}
            >
              {ad}
            </button>
          ))}
        </div>
        <span style={{ flex: 1 }} />
        <button
          type="button"
          style={dugme(false)}
          onClick={() => pdfOlarakIndir({ ...kilavuz, icerik: metin })}
        >
          PDF önizle
        </button>
        {kilavuz.ozel && (
          <button
            type="button"
            style={dugme(false, kaydediliyor)}
            disabled={kaydediliyor}
            onClick={varsayilanaDon}
          >
            Varsayılana dön
          </button>
        )}
        <button
          type="button"
          style={dugme(true, !degisti || kaydediliyor)}
          disabled={!degisti || kaydediliyor}
          onClick={() => kaydet()}
          data-yardim-kaydet
        >
          {kaydediliyor ? 'Kaydediliyor…' : 'Kaydet ve yayınla'}
        </button>
      </div>

      {mesaj.metin && (
        <div
          style={{
            padding: '9px 14px',
            borderRadius: 9,
            marginBottom: 10,
            fontSize: 13,
            background: mesaj.tur === 'hata' ? '#fef2f2' : '#f0fdf4',
            color: mesaj.tur === 'hata' ? '#b91c1c' : '#166534',
          }}
        >
          {mesaj.metin}
        </div>
      )}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns:
            gorunum === 'ikisi' ? 'minmax(0,1fr) minmax(0,1fr)' : 'minmax(0,1fr)',
          gap: 12,
          height: 'calc(100vh - 330px)',
          minHeight: 420,
        }}
      >
        {gorunum !== 'onizleme' && (
          <div style={kutu}>
            <div style={kutuBasi}>
              Metin (Markdown) · {metin.length.toLocaleString('tr-TR')} karakter
              {degisti ? ' · kaydedilmedi' : ''}
            </div>
            <textarea
              value={metin}
              onChange={(e) => setMetin(e.target.value)}
              spellCheck={false}
              aria-label="Kılavuz metni"
              data-yardim-metin
              style={{
                flex: 1,
                border: 0,
                outline: 'none',
                resize: 'none',
                padding: 14,
                fontFamily: "ui-monospace, 'SFMono-Regular', Menlo, Consolas, monospace",
                fontSize: 13,
                lineHeight: 1.6,
                color: '#0f172a',
              }}
            />
            <div
              style={{
                ...kutuBasi,
                borderTop: '1px solid #e2e8f0',
                borderBottom: 0,
                fontWeight: 500,
              }}
            >
              <b># Başlık</b>, <b>## Bölüm</b>, <b>### Alt başlık</b> · <b>**kalın**</b> · satır
              başında <b>1.</b> numaralı, <b>-</b> madde · tablo: <b>| A | B |</b> +{' '}
              <b>| --- | --- |</b> · <b>[metin](https://adres)</b>
            </div>
          </div>
        )}
        {gorunum !== 'metin' && (
          <div style={kutu}>
            <div style={kutuBasi}>Önizleme — öğrencinin göreceği hâl</div>
            <div style={{ flex: 1, overflow: 'auto', padding: '20px 26px' }}>
              <KilavuzSayfasi icerik={metin || tanim.varsayilan} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

window.YardimKilavuzuPenceresi = YardimKilavuzuPenceresi;
window.YardimKilavuzuApp = YardimKilavuzuApp;
export default YardimKilavuzuApp;
