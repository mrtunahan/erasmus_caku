// ══════════════════════════════════════════════════════════════
// TTO TALEP SÜRECİ — belgeler, aşamalar, akademisyen ve yönetici panelleri
//
// Süreç (kurallar lib/tto-talep.js'te, sunucu aynı dosyayla karar verir):
//   1. Akademisyen formu doldurur, PDF indirir, imzalayıp kaşeler, imzalı
//      PDF'i yükleyerek TTO'ya gönderir.
//   2. TTO inceler; iade eder, reddeder ya da talep no ve TTO ONAYLI
//      (imzalı) başvuru formunu yükleyerek onaylar.
//   3. TTO proformayı hazırlar, imzalar, kaşeler ve yükler; proformanın
//      kesildiği firmayı ve tutarı girer → akademisyene gider.
//   4. Akademisyen proformayı firmaya onaylatır, imzalatıp kaşeletir ve TTO'ya
//      geri gönderir.
//   5. TTO Genel Sekreterliğe gönderir.
//   6. Yönetim kurulu kararı çıkınca TTO karar tarihini girip onaylar (belge
//      yüklenmez) → akademisyene bildirilir.
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
  ttoDosyaAdi,
  ttoSablonVerisi,
  ttoEtiketDegerleri,
  tcKimlikGecerliMi,
  ibanGecerliMi,
  ibanGoster,
  ibanNormalle,
  odemeBilgisiHatalari,
  TTO_FIRMA_ALANLARI,
} from './lib/tto-talep.js';
import { kurusTl } from './lib/tto-odeme.js';
import {
  T,
  kart,
  giris,
  etiket,
  dugme,
  pasif,
  KartBaslik,
  Eylemler,
  metin,
  tarihTr,
  tarihSaatTr,
  DurumCipi,
} from './tto-stil.jsx';

const { useState, useEffect } = React;

// Yerel bugün (YYYY-MM-DD); toISOString UTC'dir, gece yarısından sonra bir gün geri kalır.
function bugunIso() {
  const d = new Date();
  const iki = (x) => String(x).padStart(2, '0');
  return d.getFullYear() + '-' + iki(d.getMonth() + 1) + '-' + iki(d.getDate());
}

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

function blobIndir(blob, ad) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = ad;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 10000);
}

export const WORD_UYARISI =
  'Form, kurumun Şablonlar modülüne yüklenen Word şablonundan üretildi ve Word (.docx) olarak indirildi; sunucu bu belgeyi PDF’e çeviremedi. Lütfen Word’de açıp “Farklı Kaydet → PDF” ile PDF’e çevirin, çıktısını imzalayıp kaşeleyin ve PDF olarak yükleyin.';

/**
 * Başvuru formunu indirir.
 *
 *   1) Kurum Şablonlar → TTO modülüne Word şablonu yüklediyse belge ONDAN
 *      üretilir (kurumun biçimi birebir korunur) ve sunucuda PDF'e çevrilir
 *      (LibreOffice — server/lib/docx-pdf.js).
 *   2) Sunucu çeviremezse belge Word olarak iner; akademisyenden PDF'e
 *      çevirmesi istenir (`uyari`).
 *   3) Şablon yoksa yerleşik PDF (lib/tto-pdf.js).
 *
 * @returns {Promise<{ok:boolean, kaynak?:string, uyari?:string, hata?:string}>}
 */
export async function formIndir(talep, ayarKaydi) {
  const TE = window.TemplateEngine;
  let not = '';
  if (TE && TE.produceFromTemplate) {
    const veri = ttoSablonVerisi(talep, ayarKaydi);
    const r = await TE.produceFromTemplate({
      module: 'tto',
      docType: 'talep',
      // Kurum geneli şablon: bölümden bağımsız çözülür (üniversite kapsamı).
      departmentId: '',
      staticData: veri,
      rows: [],
      // Doküman kodu, revizyon, TTO adres/telefon üst-alt bilgide durur.
      ustAltBilgi: ttoEtiketDegerleri(veri),
      filename: ttoDosyaAdi(talep),
      noDownload: true,
    });
    if (r && r.ok && r.blob) {
      try {
        const token = localStorage.getItem('caku_auth_token');
        const yanit = await fetch('/api/files/docx-pdf', {
          method: 'POST',
          credentials: 'include',
          headers: Object.assign(
            {
              'Content-Type':
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            },
            token ? { Authorization: 'Bearer ' + token } : {}
          ),
          body: r.blob,
        });
        if (yanit.ok) {
          blobIndir(await yanit.blob(), ttoPdfDosyaAdi(talep));
          return { ok: true, kaynak: 'sablon-pdf' };
        }
      } catch (_e) {
        /* çeviri yoksa Word'e düşülür */
      }
      blobIndir(r.blob, ttoDosyaAdi(talep));
      return { ok: true, kaynak: 'sablon-word', uyari: WORD_UYARISI };
    }
    const sablonYok =
      r && ['no-template', 'no-mapping', 'not-docx', 'network'].indexOf(r.reason) >= 0;
    if (r && !sablonYok) {
      not =
        'Kurum şablonundan belge üretilemedi (' +
        (r.message || r.reason) +
        '); form yerleşik biçimle PDF olarak indirildi.';
    }
  }
  const p = await pdfAktar(talep, ayarKaydi);
  if (!p.ok) return p;
  return { ok: true, kaynak: 'yerlesik', uyari: not };
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
 * çağıran `deger`i işlemin `ekBelgeler`ine koyar. Tek satır: solda belge
 * adı ve açıklama, sağda seçim düğmesi (tarayıcının çıplak dosya kutusu
 * yerine — her yerde aynı görünsün).
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
        border: `1px ${deger ? 'solid' : 'dashed'} ${deger ? '#86EFAC' : T.kenarGiris}`,
        background: deger ? '#F0FDF4' : '#FFFFFF',
        borderRadius: 10,
        padding: '12px 14px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 220px', minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: T.metin }}>
            {tanim.label} {zorunlu && <span style={{ color: T.tehlike }}>*</span>}
          </div>
          <div style={{ fontSize: 12, color: T.soluk, marginTop: 2, lineHeight: 1.5 }}>
            {deger ? (
              <a href={deger.url} target="_blank" rel="noreferrer" style={{ color: T.basari }}>
                ✓ {deger.ad || 'Yüklenen belge'}
              </a>
            ) : (
              aciklama || 'Yalnız PDF.'
            )}
          </div>
        </div>
        {deger ? (
          !kilitli && (
            <button type="button" style={dugme('sessiz')} onClick={() => onDegis(null)}>
              Kaldır
            </button>
          )
        ) : (
          <label
            style={{
              ...dugme('sessiz'),
              ...(kilitli || yukleniyor ? pasif : {}),
              minWidth: 120,
            }}
          >
            {yukleniyor ? 'Yükleniyor…' : 'PDF seç'}
            <input
              type="file"
              accept="application/pdf,.pdf"
              disabled={kilitli || yukleniyor}
              onChange={sec}
              style={{ display: 'none' }}
            />
          </label>
        )}
      </div>
      {hata && (
        <div role="alert" style={{ fontSize: 12.5, color: T.tehlike, marginTop: 8 }}>
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

/** Talebe en son yüklenen belirli türdeki belge. */
export function sonBelge(t, tur) {
  const l = talepBelgeleri(t).filter((b) => b.tur === tur);
  return l.length ? l[l.length - 1] : null;
}

const ROL_CIP = {
  tto: { metin: 'TTO', renk: '#1D4ED8', zemin: '#EFF6FF' },
  akademisyen: { metin: 'Akademisyen', renk: '#7C3AED', zemin: '#F5F3FF' },
};

/** Belge listesi — iki taraf da görür, açar, indirir. */
export function BelgeListesi({ talep, baslik = 'Belgeler' }) {
  const liste = talepBelgeleri(talep);
  return (
    <div style={kart} data-belge-listesi>
      <KartBaslik
        baslik={baslik + ' (' + liste.length + ')'}
        aciklama="Akademisyen ve TTO’nun yüklediği bütün belgeler (PDF)."
      />
      {liste.length === 0 ? (
        <div style={{ fontSize: 13, color: T.soluk }}>Henüz belge yüklenmedi.</div>
      ) : (
        <div style={{ display: 'grid', gap: 8 }}>
          {liste.map((b) => {
            const c = ROL_CIP[b.rol] || ROL_CIP.akademisyen;
            return (
              <div
                key={b.id || b.url}
                data-belge={b.tur}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '96px minmax(0, 1fr) auto',
                  alignItems: 'center',
                  gap: 12,
                  padding: '10px 12px',
                  borderRadius: 10,
                  background: T.zemin,
                  border: `1px solid ${T.kenar}`,
                }}
              >
                <span
                  style={{
                    justifySelf: 'start',
                    fontSize: 11,
                    fontWeight: 800,
                    padding: '3px 9px',
                    borderRadius: 999,
                    color: c.renk,
                    background: c.zemin,
                  }}
                >
                  {c.metin}
                </span>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: T.metin }}>
                    {(TTO_BELGE_TURLERI[b.tur] || {}).label || b.tur}
                  </div>
                  <div
                    style={{
                      fontSize: 11.5,
                      color: T.soluk,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                    title={b.ad}
                  >
                    {b.ad} · {b.yukleyen} · {tarihSaatTr(b.tarih)}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <a
                    href={b.url}
                    target="_blank"
                    rel="noreferrer"
                    style={{ ...dugme('sessiz'), minWidth: 104 }}
                  >
                    Görüntüle
                  </a>
                  <a href={b.url + '?download=true'} style={{ ...dugme('vurgu'), minWidth: 104 }}>
                    İndir
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/** Aşama çizgisi: eşit aralıklı yedi adım; tamamlanan, şu anki, sıradaki. */
export function SurecCizgisi({ durum }) {
  const d = durum || 'taslak';
  const sira = asamaSirasi(d);
  const tamamlandi = d === 'tamamlandi';
  const n = TTO_ASAMALAR.length;
  return (
    <div
      data-surec
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))`,
        margin: '2px 0 16px',
      }}
    >
      {TTO_ASAMALAR.map((a, i) => {
        const no = i + 1;
        const bitti = no < sira || tamamlandi;
        const simdi = no === sira && !tamamlandi;
        const renk = bitti ? T.basari : simdi ? T.birincil : '#CBD5E1';
        return (
          <div
            key={a.durum}
            title={TTO_DURUMLAR[a.durum].label}
            style={{ position: 'relative', textAlign: 'center', padding: '0 2px' }}
          >
            {i > 0 && (
              <span
                style={{
                  position: 'absolute',
                  top: 13,
                  left: 0,
                  width: '50%',
                  height: 2,
                  background: no <= sira || tamamlandi ? T.basari : '#E2E8F0',
                }}
              />
            )}
            {i < n - 1 && (
              <span
                style={{
                  position: 'absolute',
                  top: 13,
                  right: 0,
                  width: '50%',
                  height: 2,
                  background: no < sira || tamamlandi ? T.basari : '#E2E8F0',
                }}
              />
            )}
            <span
              style={{
                position: 'relative',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 28,
                height: 28,
                borderRadius: '50%',
                fontSize: 12,
                fontWeight: 800,
                color: bitti || simdi ? '#fff' : T.soluk,
                background: bitti || simdi ? renk : '#F1F5F9',
                border: `2px solid ${bitti || simdi ? renk : '#E2E8F0'}`,
                boxSizing: 'border-box',
              }}
            >
              {bitti ? '✓' : no}
            </span>
            <div
              style={{
                marginTop: 6,
                fontSize: 11.5,
                lineHeight: 1.3,
                fontWeight: simdi ? 800 : 600,
                color: simdi ? T.birincil : bitti ? T.metin : T.soluk,
              }}
            >
              {a.kisa}
            </div>
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
        marginTop: 12,
        fontSize: 13,
        fontWeight: 600,
        color: mesaj.ok ? T.basari : T.tehlike,
      }}
    >
      {mesaj.metin}
    </div>
  );
}

// Numaralı adım hücresi (gönderim kartı ve proforma kartı aynı biçimi kullanır).
function Adim({ no, baslik, children }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        padding: 14,
        borderRadius: 10,
        background: T.yuzey,
        border: `1px solid ${T.kenar}`,
        minWidth: 0,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span
          style={{
            flex: '0 0 24px',
            height: 24,
            borderRadius: '50%',
            background: T.navy,
            color: '#fff',
            fontSize: 12,
            fontWeight: 800,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {no}
        </span>
        <div style={{ fontSize: 13.5, fontWeight: 700, color: T.metin }}>{baslik}</div>
      </div>
      {children}
    </div>
  );
}

const ADIM_IZGARASI = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
  gap: 12,
};

// ══════════════════════════════════════════════════════════════
// AKADEMİSYEN — gönderim kartı (taslak / iade)
// Formu indir → imzala, kaşele → imzalı PDF'i yükle. Beyan onaylanmadan
// form indirilemez; gönder düğmesi formun altındadır.
// ══════════════════════════════════════════════════════════════
export function GonderimKarti({ talep, ayarKaydi, imzali, onImzali, onMesaj, beyan }) {
  const [hazirlaniyor, setHazirlaniyor] = useState(false);
  const [uyari, setUyari] = useState('');
  const indir = async () => {
    setHazirlaniyor(true);
    setUyari('');
    const r = await formIndir(talep, ayarKaydi);
    setHazirlaniyor(false);
    if (!r.ok && onMesaj) onMesaj({ tur: 'hata', metin: r.hata });
    if (r.ok && r.uyari) setUyari(r.uyari);
  };
  return (
    <div style={{ ...kart, borderColor: '#BFDBFE', background: '#F8FAFF' }} data-gonderim>
      <KartBaslik
        baslik="TTO’ya gönderim"
        aciklama="Formu indirip imzalayın ve kaşeleyin; imzalı hâlini PDF olarak yükleyin. Formda değişiklik yaparsanız formu yeniden indirip imzalı hâlini yeniden yükleyin."
      />
      <div style={ADIM_IZGARASI}>
        <Adim no={1} baslik="Başvuru formunu indirin">
          <div style={{ fontSize: 12.5, color: T.soluk, lineHeight: 1.5 }}>
            {beyan
              ? 'Form doldurduğunuz bilgilerle hazırlanır.'
              : 'Önce yukarıdaki beyan kutusunu onaylayın.'}
          </div>
          <button
            type="button"
            style={{
              ...dugme('sessiz'),
              ...(!beyan || hazirlaniyor ? pasif : {}),
              alignSelf: 'flex-start',
            }}
            onClick={indir}
            disabled={!beyan || hazirlaniyor}
          >
            {hazirlaniyor ? 'Hazırlanıyor…' : 'Başvuru formunu indir'}
          </button>
        </Adim>
        <Adim no={2} baslik="İmzalayın ve kaşeleyin">
          <div style={{ fontSize: 12.5, color: T.soluk, lineHeight: 1.5 }}>
            “Başvuru sahibinin kaşe ve imza” alanını doldurup belgeyi tarayın (PDF).
          </div>
        </Adim>
        <Adim no={3} baslik="İmzalı formu yükleyin">
          <BelgeSecici
            tur="basvuru_imzali"
            zorunlu
            deger={imzali}
            onDegis={onImzali}
            aciklama="Taranmış, imzalı ve kaşeli form."
          />
        </Adim>
      </div>
      {uyari && (
        <div
          role="alert"
          data-form-uyari
          style={{
            marginTop: 12,
            padding: '10px 12px',
            borderRadius: 8,
            background: '#FFFBEB',
            border: '1px solid #FCD34D',
            color: '#92400E',
            fontSize: 12.5,
            lineHeight: 1.55,
          }}
        >
          {uyari}
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// AKADEMİSYEN — ödeme bilgileri (adres, TC, IBAN)
// Firma onaylı proformayla birlikte ZORUNLU; kurallar lib/tto-talep.js.
// ══════════════════════════════════════════════════════════════
function OdemeBilgileriFormu({ deger, onDegis }) {
  const d = deger || {};
  const yaz_ = (k, v) => onDegis({ ...d, [k]: v });
  const hata = (alan) => {
    const v = metin(d[alan]);
    if (!v) return '';
    if (alan === 'tcKimlikNo' && !tcKimlikGecerliMi(v)) return 'Geçerli bir T.C. kimlik no değil.';
    if (alan === 'iban' && !ibanGecerliMi(v)) return 'Geçerli bir TR IBAN değil.';
    return '';
  };
  const alan = (id, label, props, zorunlu = true) => (
    <label style={{ display: 'block', minWidth: 0 }}>
      <span style={etiket}>
        {label} {zorunlu && <span style={{ color: T.tehlike }}>*</span>}
      </span>
      <input
        data-odeme={id}
        style={{ ...giris, borderColor: hata(id) ? '#FCA5A5' : T.kenarGiris }}
        value={d[id] || ''}
        onChange={(e) => yaz_(id, e.target.value)}
        {...props}
      />
      <span
        style={{ display: 'block', minHeight: 16, fontSize: 11.5, color: T.tehlike, marginTop: 3 }}
      >
        {hata(id)}
      </span>
    </label>
  );
  return (
    <div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: 12,
        }}
      >
        {alan('tcKimlikNo', 'T.C. kimlik numarası', {
          inputMode: 'numeric',
          maxLength: 11,
          placeholder: '11 hane',
        })}
        {alan('iban', 'IBAN', {
          placeholder: 'TR00 0000 0000 0000 0000 0000 00',
          maxLength: 34,
          onBlur: () => ibanGecerliMi(d.iban) && yaz_('iban', ibanGoster(d.iban)),
        })}
        {alan('bankaAdi', 'Banka adı', { placeholder: 'İsteğe bağlı' }, false)}
      </div>
      <label style={{ display: 'block' }}>
        <span style={etiket}>
          Açık adres <span style={{ color: T.tehlike }}>*</span>
        </span>
        <textarea
          data-odeme="adres"
          rows={2}
          style={{ ...giris, resize: 'vertical' }}
          value={d.adres || ''}
          onChange={(e) => yaz_('adres', e.target.value)}
        />
      </label>
      <label
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          marginTop: 10,
          fontSize: 13,
          color: T.metin,
          cursor: 'pointer',
        }}
      >
        <input
          type="checkbox"
          data-odeme="kaydet"
          checked={d.kaydet === true}
          onChange={(e) => yaz_('kaydet', e.target.checked)}
        />
        Bu bilgileri sonraki başvurularımda kullanmak üzere kaydet
      </label>
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
    '. TTO proformayı hazırlıyor.',
  proforma_gonderildi: () =>
    'Sıra sizde: TTO’nun imzalayıp kaşelediği proformayı firmaya onaylatıp imzalatın ve kaşeletin; ödeme bilgilerinizi girip TTO’ya geri gönderin.',
  proforma_dondu: () =>
    'Firma onaylı proforma TTO’da. TTO talebinizi yönetim kararı için Genel Sekreterliğe gönderecek.',
  genel_sekreterlikte: () => 'Talebiniz yönetim kararı için Genel Sekreterlikte.',
  gorevlendirildi: (t) =>
    'Yönetim kurulu kararı olumlu çıktı' +
    (t.yonetimKarariTarihi ? ' (' + tarihTr(t.yonetimKarariTarihi) + ')' : '') +
    '. Fatura kesildiğinde süreç tamamlanır.',
  tamamlandi: (t) =>
    'Fatura kesildi' + (t.faturaNo ? ' (No: ' + t.faturaNo + ')' : '') + '. Süreç tamamlandı.',
  reddedildi: () => 'Talebiniz reddedildi.',
};

export function AkademisyenSurecKarti({ talep, onDegisti, kayitliOdeme }) {
  const t = talep || {};
  const d = t.durum || 'taslak';
  const [firma, setFirma] = useState(null);
  // Kayıtlı ödeme bilgileri (önceki başvuruda "kaydet" seçildiyse) dolu gelir.
  const [odeme, setOdeme] = useState(() => {
    const k = kayitliOdeme || {};
    return {
      adres: k.adres || '',
      tcKimlikNo: k.tcKimlikNo || '',
      iban: k.iban ? ibanGoster(k.iban) : '',
      bankaAdi: k.bankaAdi || '',
      kaydet: !!kayitliOdeme,
    };
  });
  const [mesgul, setMesgul] = useState(false);
  const [mesaj, setMesaj] = useState(null);
  const metinFn = AKADEMISYEN_METNI[d];
  if (!metinFn) return null;
  const renk =
    d === 'reddedildi'
      ? ['#FEF2F2', '#FECACA', '#991B1B']
      : d === 'proforma_gonderildi'
        ? ['#F5F3FF', '#DDD6FE', '#5B21B6']
        : d === 'tamamlandi' || d === 'gorevlendirildi' || d === 'onaylandi'
          ? ['#ECFDF5', '#A7F3D0', '#065F46']
          : ['#EFF6FF', '#BFDBFE', '#1E40AF'];
  const proforma = sonBelge(t, 'proforma_tto');
  const odemeHatalari = odemeBilgisiHatalari(odeme);
  const hazir = !!firma && odemeHatalari.length === 0;

  const gonder = async () => {
    setMesgul(true);
    setMesaj(null);
    try {
      await yaz(t.id, {
        durum: 'proforma_dondu',
        ekBelgeler: [firma],
        odemeBilgileri: { ...odeme, iban: ibanNormalle(odeme.iban) },
      });
      setFirma(null);
      setMesaj({ ok: true, metin: 'Firma onaylı proforma ve ödeme bilgileri TTO’ya gönderildi.' });
      if (onDegisti) await onDegisti(t.id);
    } catch (e) {
      setMesaj({ ok: false, metin: (e && e.message) || 'Gönderilemedi.' });
    } finally {
      setMesgul(false);
    }
  };

  return (
    <>
      <div style={kart} data-akademisyen-surec>
        <KartBaslik baslik="Süreç" />
        <SurecCizgisi durum={d} />
        <div
          style={{
            padding: '12px 14px',
            borderRadius: 10,
            background: renk[0],
            border: `1px solid ${renk[1]}`,
            color: renk[2],
            fontSize: 13.5,
            lineHeight: 1.6,
          }}
        >
          {metinFn(t)}
          {metin(t.yoneticiNotu) &&
            (d === 'reddedildi' || d === 'proforma_gonderildi' || d === 'onaylandi') && (
              <div style={{ marginTop: 6 }}>
                <b>TTO notu:</b> {t.yoneticiNotu}
              </div>
            )}
        </div>
        <Mesaj mesaj={mesaj} />
      </div>

      {d === 'proforma_gonderildi' && (
        <div style={{ ...kart, borderColor: '#DDD6FE', background: '#FBFAFF' }} data-proforma>
          <KartBaslik
            baslik="Proformayı firmaya onaylatın"
            aciklama="Üç adımı tamamlayınca proformayı ve ödeme bilgilerinizi TTO’ya gönderin."
          />
          <div style={ADIM_IZGARASI}>
            <Adim no={1} baslik="TTO proformasını indirin">
              <div style={{ fontSize: 12.5, color: T.soluk, lineHeight: 1.5 }}>
                TTO tarafından hazırlanmış, imzalı ve kaşeli proforma.
              </div>
              {proforma && (
                <a
                  href={proforma.url + '?download=true'}
                  style={{ ...dugme('sessiz'), alignSelf: 'flex-start' }}
                >
                  Proformayı indir
                </a>
              )}
            </Adim>
            <Adim no={2} baslik="Firmaya onaylatıp yükleyin">
              <BelgeSecici
                tur="proforma_firma"
                zorunlu
                deger={firma}
                onDegis={setFirma}
                aciklama="Firmanın onayladığı, imzaladığı ve kaşelediği proforma."
              />
            </Adim>
          </div>
          <div style={{ marginTop: 12 }}>
            <Adim no={3} baslik="Ödeme bilgileriniz">
              {kayitliOdeme && (
                <div style={{ fontSize: 12.5, color: T.soluk }}>
                  Kayıtlı bilgileriniz dolduruldu; gerekirse düzeltin.
                </div>
              )}
              <OdemeBilgileriFormu deger={odeme} onDegis={setOdeme} />
            </Adim>
          </div>
          <Eylemler
            sol={
              !hazir && (
                <span style={{ fontSize: 12.5, color: T.soluk }}>
                  {!firma ? 'Firma onaylı proformayı yükleyin.' : odemeHatalari[0]}
                </span>
              )
            }
          >
            <button
              style={{ ...dugme('birincil'), ...(!hazir || mesgul ? pasif : {}) }}
              disabled={!hazir || mesgul}
              onClick={gonder}
            >
              {mesgul ? 'Gönderiliyor…' : 'Proformayı TTO’ya gönder'}
            </button>
          </Eylemler>
        </div>
      )}

      <BelgeListesi talep={t} />
    </>
  );
}

/** Yönetici panelinde: akademisyenin girdiği ödeme bilgileri. */
function OdemeBilgileriKarti({ odeme }) {
  if (!odeme) return null;
  const satir = (k, v) => (
    <div style={{ minWidth: 0 }}>
      <div style={{ fontSize: 11.5, fontWeight: 700, color: T.soluk }}>{k}</div>
      <div style={{ fontSize: 13.5, color: T.metin, marginTop: 2, wordBreak: 'break-word' }}>
        {v || '—'}
      </div>
    </div>
  );
  return (
    <div style={kart} data-odeme-karti>
      <KartBaslik baslik="Akademisyenin ödeme bilgileri" />
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 14,
        }}
      >
        {satir('T.C. kimlik no', odeme.tcKimlikNo)}
        {satir('IBAN', ibanGoster(odeme.iban))}
        {satir('Banka', odeme.bankaAdi)}
        {satir('Adres', odeme.adres)}
      </div>
    </div>
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
    yonetimKarariTarihi: metin(t.yonetimKarariTarihi) || bugunIso(),
    firma: { ad: '', vergiDairesi: '', vergiNo: '', eposta: '', ...(t.firma || {}) },
    proformaTutari: Number(t.proformaKurus) > 0 ? kurusTl(t.proformaKurus) : '',
  }));
  const [kararTiki, setKararTiki] = useState(false);
  // Proforma adımında firma adı önerileri (TTO Otomasyonu'ndaki firmalar).
  const [firmalar, setFirmalar] = useState([]);
  useEffect(() => {
    if (d !== 'onaylandi' || !window.apiRead) return;
    let iptal = false;
    Promise.resolve(window.apiRead('tto_firmalar'))
      .then((l) => !iptal && setFirmalar(Array.isArray(l) ? l : []))
      .catch(() => {});
    return () => {
      iptal = true;
    };
  }, [d]);
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

  // İlk aşamanın alanları (talep no, tarih, alan kişi, not). Firma/tutar ve
  // karar tarihi yalnız kendi aşamalarında gönderilir.
  const ttoAlanlari = {
    talepNo: alan.talepNo,
    talepTarihi: alan.talepTarihi,
    alanKisi: alan.alanKisi,
    yoneticiNotu: alan.yoneticiNotu,
  };
  // Geçiş düğmesi (bileşen değil, düz işlev: her çizimde yeniden kurulmasın).
  const dg = ({
    yeni,
    tur = 'birincil',
    etiketi,
    onay,
    alanlar,
    belgeGerek = true,
    kosul = true,
    kosulMetni = '',
  }) => {
    const eks = belgeGerek && yeni ? eksik(yeni) : [];
    const kapali = !!mesgul || eks.length > 0 || !kosul;
    return (
      <button
        key={(yeni || 'kaydet') + etiketi}
        style={{ ...dugme(tur), ...(kapali ? pasif : {}) }}
        disabled={kapali}
        title={eks.length ? 'Önce yükleyin: ' + eks.join(', ') : !kosul ? kosulMetni : ''}
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
        rows={2}
        style={{ ...giris, resize: 'vertical' }}
        value={alan.yoneticiNotu}
        onChange={(e) => yazAlan('yoneticiNotu', e.target.value)}
      />
    </label>
  );
  const izgara = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: 12,
  };
  const bilgi = (m) => <div style={{ fontSize: 13, color: T.metin, lineHeight: 1.6 }}>{m}</div>;

  let govde = null;
  let eylemler = null;
  if (ilkAsama) {
    govde = (
      <>
        <div style={izgara}>
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
            aciklama="Akademisyenin imzalı formunu TTO adına imzalayıp yükleyin. Onay için zorunludur."
          />
        </div>
        {not('Akademisyene not (iade ve ret için zorunlu)')}
      </>
    );
    eylemler = (
      <>
        {dg({
          yeni: 'reddedildi',
          tur: 'tehlike',
          etiketi: 'Reddet',
          onay: 'Talep reddedilecek. Emin misiniz?',
          alanlar: ttoAlanlari,
        })}
        {dg({
          yeni: 'iade',
          tur: 'sessiz',
          etiketi: 'Düzeltme için iade et',
          onay: 'Talep düzeltme için akademisyene iade edilecek. Devam edilsin mi?',
          alanlar: ttoAlanlari,
        })}
        {d === 'gonderildi' &&
          dg({
            yeni: 'incelemede',
            tur: 'sessiz',
            etiketi: 'İncelemeye al',
            belgeGerek: false,
            alanlar: ttoAlanlari,
          })}
        {dg({ yeni: null, tur: 'sessiz', etiketi: 'Kaydet', alanlar: ttoAlanlari })}
        {dg({
          yeni: 'onaylandi',
          tur: 'basari',
          etiketi: 'Onayla',
          onay: 'Başvuru onaylanıp akademisyene iletilecek. Devam edilsin mi?',
          alanlar: ttoAlanlari,
        })}
      </>
    );
  } else if (d === 'onaylandi') {
    govde = (
      <>
        <div style={izgara} data-proforma-firma>
          {TTO_FIRMA_ALANLARI.map((a) => (
            <label key={a.id}>
              <span style={etiket}>
                {a.id === 'ad' ? 'Proformanın kesildiği firma' : a.label}
                {a.zorunlu && ' *'}
              </span>
              <input
                data-alan={'firma.' + a.id}
                style={giris}
                type={a.id === 'eposta' ? 'email' : 'text'}
                list={a.id === 'ad' ? 'tto-firma-adlari' : undefined}
                value={alan.firma[a.id] || ''}
                onChange={(e) => {
                  const v = e.target.value;
                  setAlan((x) => {
                    const firma = { ...x.firma, [a.id]: v };
                    // Kayıtlı bir firma seçildiyse diğer alanları ondan doldur.
                    const kayitli = a.id === 'ad' && firmalar.find((f) => metin(f.ad) === metin(v));
                    if (kayitli) {
                      ['vergiDairesi', 'vergiNo', 'eposta'].forEach((k) => {
                        if (!metin(firma[k])) firma[k] = metin(kayitli[k]);
                      });
                    }
                    return { ...x, firma };
                  });
                }}
              />
            </label>
          ))}
          <label>
            <span style={etiket}>Proforma tutarı (KDV hariç, ₺) *</span>
            <input
              data-alan="proformaTutari"
              style={giris}
              inputMode="decimal"
              placeholder="ör. 25.000,00"
              value={alan.proformaTutari}
              onChange={(e) => yazAlan('proformaTutari', e.target.value)}
            />
          </label>
        </div>
        <datalist id="tto-firma-adlari">
          {firmalar.map((f) => (
            <option key={f.id} value={f.ad} />
          ))}
        </datalist>
        <div style={{ fontSize: 12, color: T.soluk, margin: '6px 0 12px' }}>
          Firma ve tutar, yönetim kurulu kararı onaylanınca TTO Otomasyonu’na iş kaydı olarak
          aktarılır.
        </div>
        <BelgeSecici
          tur="proforma_tto"
          zorunlu
          deger={belge.proforma_tto}
          onDegis={belgeAyarla('proforma_tto')}
          aciklama="Hazırladığınız, imzalayıp kaşelediğiniz proforma. Akademisyen firmaya onaylatıp geri gönderecek."
        />
      </>
    );
    eylemler = (
      <>
        {dg({
          yeni: 'incelemede',
          tur: 'sessiz',
          etiketi: 'Onayı geri al',
          onay: 'Onay geri alınıp talep yeniden incelemeye alınacak. Emin misiniz?',
          belgeGerek: false,
        })}
        {dg({
          yeni: 'proforma_gonderildi',
          etiketi: 'Proformayı akademisyene gönder',
          alanlar: { firma: alan.firma, proformaTutari: alan.proformaTutari },
          kosul: !!metin(alan.firma.ad) && !!metin(alan.proformaTutari),
          kosulMetni: 'Önce firma adını ve proforma tutarını girin.',
        })}
      </>
    );
  } else if (d === 'proforma_gonderildi') {
    govde = bilgi(
      'Proforma akademisyende. Firmanın onaylayıp imzaladığı ve kaşelediği proforma ile akademisyenin ödeme bilgileri bekleniyor.'
    );
  } else if (d === 'proforma_dondu') {
    govde = (
      <>
        {bilgi(
          'Firma onaylı proforma ve ödeme bilgileri geldi. Uygunsa yönetim kararı için Genel Sekreterliğe gönderin; eksikse gerekçeyle akademisyene geri gönderin.'
        )}
        {not('Akademisyene not (proformayı geri gönderirken zorunlu)')}
      </>
    );
    eylemler = (
      <>
        {dg({
          yeni: 'proforma_gonderildi',
          tur: 'sessiz',
          etiketi: 'Akademisyene geri gönder',
          alanlar: { yoneticiNotu: alan.yoneticiNotu },
          belgeGerek: false,
        })}
        {dg({
          yeni: 'genel_sekreterlikte',
          etiketi: 'Genel Sekreterliğe gönderildi',
          onay: 'Talep Genel Sekreterliğe gönderildi olarak işaretlenecek. Devam edilsin mi?',
          alanlar: { yoneticiNotu: alan.yoneticiNotu },
        })}
      </>
    );
  } else if (d === 'genel_sekreterlikte') {
    govde = (
      <>
        {bilgi(
          'Yönetim kurulu kararı çıktığında karar tarihini girip onaylayın; akademisyene bildirilir ve fatura aşamasına geçilir. Belge yüklenmez.'
        )}
        <div
          style={{
            ...izgara,
            gridTemplateColumns: 'minmax(180px, 240px) minmax(0, 1fr)',
            alignItems: 'center',
            marginTop: 12,
          }}
        >
          <label>
            <span style={etiket}>Karar tarihi *</span>
            <input
              type="date"
              data-alan="yonetimKarariTarihi"
              style={giris}
              max={bugunIso()}
              value={alan.yonetimKarariTarihi}
              onChange={(e) => yazAlan('yonetimKarariTarihi', e.target.value)}
            />
          </label>
          <label
            style={{
              display: 'flex',
              gap: 8,
              alignItems: 'center',
              fontSize: 13.5,
              fontWeight: 600,
              color: T.metin,
              cursor: 'pointer',
              marginTop: 18,
            }}
          >
            <input
              type="checkbox"
              data-alan="yonetimKarariOnay"
              checked={kararTiki}
              onChange={(e) => setKararTiki(e.target.checked)}
            />
            Yönetim kurulu kararı olumlu çıktı
          </label>
        </div>
        {not('Akademisyene not (olumsuz kararda zorunlu)')}
      </>
    );
    eylemler = (
      <>
        {dg({
          yeni: 'reddedildi',
          tur: 'tehlike',
          etiketi: 'Olumsuz karar — reddet',
          onay: 'Yönetim kararı olumsuz: talep reddedilecek. Emin misiniz?',
          alanlar: { yoneticiNotu: alan.yoneticiNotu },
          belgeGerek: false,
        })}
        {dg({
          yeni: 'gorevlendirildi',
          tur: 'basari',
          etiketi: 'Kararı onayla ve bildir',
          onay: 'Yönetim kurulu kararı onaylanıp akademisyene bildirilecek. Devam edilsin mi?',
          alanlar: {
            yoneticiNotu: alan.yoneticiNotu,
            yonetimKarariTarihi: alan.yonetimKarariTarihi,
          },
          kosul: kararTiki && !!alan.yonetimKarariTarihi,
          kosulMetni:
            'Önce karar tarihini girip “Yönetim kurulu kararı olumlu çıktı” kutusunu işaretleyin.',
        })}
      </>
    );
  } else if (d === 'gorevlendirildi') {
    govde = (
      <div
        style={{
          ...izgara,
          gridTemplateColumns: 'minmax(180px, 240px) minmax(0, 1fr)',
          alignItems: 'end',
        }}
      >
        <label>
          <span style={etiket}>Fatura No</span>
          <input
            data-alan="faturaNo"
            style={giris}
            value={alan.faturaNo}
            onChange={(e) => yazAlan('faturaNo', e.target.value)}
          />
        </label>
        <BelgeSecici tur="fatura" zorunlu deger={belge.fatura} onDegis={belgeAyarla('fatura')} />
      </div>
    );
    eylemler = dg({
      yeni: 'tamamlandi',
      tur: 'basari',
      etiketi: 'Fatura kesildi — tamamla',
      alanlar: { faturaNo: alan.faturaNo },
    });
  } else if (d === 'reddedildi') {
    govde = bilgi('Talep reddedildi' + (t.yoneticiNotu ? ': ' + t.yoneticiNotu : '.'));
    eylemler = dg({
      yeni: 'incelemede',
      tur: 'sessiz',
      etiketi: 'Kararı geri al',
      onay: 'Ret geri alınıp talep yeniden incelemeye alınacak. Emin misiniz?',
      belgeGerek: false,
    });
  } else if (d === 'iade') {
    govde = bilgi(
      'Talep düzeltme için akademisyene iade edildi; yeniden gönderildiğinde “Sizde bekleyen” listesine düşer.'
    );
  } else if (d === 'tamamlandi') {
    govde = bilgi('Süreç tamamlandı' + (t.faturaNo ? ' · Fatura No: ' + t.faturaNo : '') + '.');
  }

  const meta = [
    t.talepNo && 'Talep No: ' + t.talepNo,
    t.kararVeren && 'Karar: ' + t.kararVeren + ' · ' + tarihTr(t.kararTarihi),
    t.firma && metin(t.firma.ad) && 'Firma: ' + t.firma.ad,
    Number(t.proformaKurus) > 0 && 'Proforma: ₺' + kurusTl(t.proformaKurus),
    t.yonetimKarariTarihi && 'Yönetim kurulu kararı: ' + tarihTr(t.yonetimKarariTarihi),
  ]
    .filter(Boolean)
    .join('  ·  ');

  return (
    <>
      <div style={{ ...kart, borderColor: '#C7D2FE' }} data-yonetici-surec>
        <KartBaslik baslik="TTO süreci" aciklama={meta || null} sag={<DurumCipi durum={d} />} />
        <SurecCizgisi durum={d} />
        {govde}
        <Mesaj mesaj={mesaj} />
        <Eylemler
          sol={
            <button
              style={{ ...dugme('tehlike'), ...(mesgul ? pasif : {}) }}
              disabled={!!mesgul}
              onClick={sil}
            >
              {mesgul === 'sil' ? 'Siliniyor…' : 'Talebi sil'}
            </button>
          }
        >
          {eylemler}
        </Eylemler>
      </div>
      {t.odemeBilgileri && <OdemeBilgileriKarti odeme={t.odemeBilgileri} />}
      <BelgeListesi talep={t} />
    </>
  );
}
