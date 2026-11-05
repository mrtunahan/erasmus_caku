// ══════════════════════════════════════════════════════════════
// MEZUNİYET — bölüm modülü
//
//   ÖĞRENCİ   transkriptini yükler → sistem tarar → dersler forma OLDUĞU
//             GİBİ aktarılır (öğrenci düzenleyemez; kurala uymayan satır
//             sarı) → danışmana gönderir → onaydan sonra mezuniyet
//             dilekçesini (silinecek dersler içinde, TEK belge) indirir,
//             imzalar, imzalı hâlini yükler → yeniden danışmana gider.
//   DANIŞMAN  (Akademisyen → Benim Sayfam → Mezuniyet Bekleyen Öğrenciler)
//             formu ve transkripti inceler, not yazar, silinecek dersleri ve
//             eksik stajları işaretler, onaylar ya da geri çevirir; imzalı
//             dilekçe gelince transkript ve dilekçeleri MEMURA iletir.
//   MEMUR     kendisine iletilen başvuruları görür ve işlemi tamamlar.
//   YETKİLİ   bölümündeki başvuruları izler.
//
// Süreç kuralları ve izinler lib/mezuniyet-basvuru.js'te; sunucu aynı
// dosyayla denetler (server/routes/db.js → a0g). Kurallar (sarı satırlar,
// staj listesi) Bölüm Yönetimi → Mezuniyet Kuralları'nda tanımlanır.
//
// ⚠ Hesap bilgilendirmedir; resmî karar öğrenci bilgi sistemindedir.
// ══════════════════════════════════════════════════════════════
import {
  MEZ_BASVURU_KOLEKSIYONU,
  MEZ_BELGE_KLASORU,
  MEZ_DURUMLAR,
  MEZ_ADIMLAR,
  adimSirasi,
  danismaniMi,
  dilekceVerisi,
  dosyaParcasi,
  gecmisKaydi,
  imzaEksikleri,
} from './lib/mezuniyet-basvuru.js';
import { mezuniyetHesapla, mezKuralNormalize } from './lib/mezuniyet.js';

const { useState, useEffect, useMemo, useCallback } = React;

const R = {
  navy: '#0B2E73',
  mavi: '#105BFF',
  turuncu: '#FE8500',
  zemin: '#F0F0F0',
  metin: '#1F2329',
  soluk: '#5F6368',
  kenar: '#E2E2E2',
  sari: '#FEF3C7',
  sariKenar: '#F59E0B',
  yesil: '#059669',
  kirmizi: '#DC2626',
};
const KART = {
  background: '#FFFFFF',
  border: '1px solid ' + R.kenar,
  borderRadius: 14,
  padding: 18,
  marginBottom: 16,
};
const BASLIK = { fontSize: 14.5, fontWeight: 800, color: R.navy, margin: '0 0 12px' };
const GIRDI = {
  width: '100%',
  padding: '8px 10px',
  border: '1px solid #CFCFCF',
  borderRadius: 8,
  fontSize: 13,
  fontFamily: 'inherit',
  boxSizing: 'border-box',
};
const ETIKET = {
  display: 'block',
  fontSize: 11,
  fontWeight: 700,
  color: R.soluk,
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
  marginBottom: 5,
};

function dugme(tur, pasif) {
  const t = {
    birincil: { background: R.mavi, color: 'white', border: 'none' },
    turuncu: { background: R.turuncu, color: 'white', border: 'none' },
    yesil: { background: R.yesil, color: 'white', border: 'none' },
    ikincil: { background: 'white', color: R.navy, border: '1px solid #CFCFCF' },
    tehlike: { background: 'white', color: R.kirmizi, border: '1px solid #FCA5A5' },
  }[tur || 'ikincil'];
  return {
    ...t,
    padding: '8px 16px',
    borderRadius: 9,
    fontSize: 13,
    fontWeight: 700,
    cursor: pasif ? 'not-allowed' : 'pointer',
    opacity: pasif ? 0.55 : 1,
    fontFamily: 'inherit',
  };
}

const metin = (v) => String(v == null ? '' : v).trim();
const trTarih = (v) => (v ? new Date(v).toLocaleDateString('tr-TR') : '—');

// ── Veri yardımcıları ──
async function basvuruOku(no) {
  const r = await window.apiReadDoc(MEZ_BASVURU_KOLEKSIYONU, String(no)).catch(() => null);
  return (r && r.exists && r.data) || null;
}

async function basvuruYaz(no, veri) {
  await window.DBWrite.set(MEZ_BASVURU_KOLEKSIYONU, String(no), veri, true);
  if (window.apiInvalidate) window.apiInvalidate(MEZ_BASVURU_KOLEKSIYONU);
}

async function dosyaYukle(dosya, klasor) {
  if (!dosya) throw new Error('Dosya seçilmedi.');
  if (!/\.pdf$/i.test(dosya.name || '') && dosya.type !== 'application/pdf') {
    throw new Error('Yalnız PDF yüklenebilir.');
  }
  const fd = new FormData();
  fd.append('file', dosya);
  const token = localStorage.getItem('caku_auth_token');
  const r = await fetch('/api/files/upload?folder=' + encodeURIComponent(klasor), {
    method: 'POST',
    headers: token ? { Authorization: 'Bearer ' + token } : {},
    credentials: 'include',
    body: fd,
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || !j.downloadURL) throw new Error(j.error || 'Yüklenemedi (HTTP ' + r.status + ').');
  return { url: j.downloadURL, ad: dosya.name, tarih: new Date().toISOString() };
}

/** Bölümün kuralı ve müfredatı (sinav_dersler, lisans). */
function useBolumVerisi(bolumId) {
  const [kural, setKural] = useState(null);
  const [mufredat, setMufredat] = useState([]);
  const [hazir, setHazir] = useState(false);
  useEffect(() => {
    let iptal = false;
    if (!bolumId) {
      setHazir(true);
      return undefined;
    }
    setHazir(false);
    (async () => {
      const [k, dersler, varyant] = await Promise.all([
        window.apiReadDoc('mezuniyet_kurallari', String(bolumId)).catch(() => null),
        window.apiRead('sinav_dersler').catch(() => []),
        window.deptIdVariants
          ? window.deptIdVariants(bolumId).catch(() => [bolumId])
          : Promise.resolve([bolumId]),
      ]);
      if (iptal) return;
      const vset = new Set((varyant || [bolumId]).map(String));
      setKural((k && k.exists && k.data) || null);
      setMufredat(
        (Array.isArray(dersler) ? dersler : []).filter(
          (c) => (c.seviye || 'lisans') === 'lisans' && vset.has(String(c.departmentId || ''))
        )
      );
      setHazir(true);
    })();
    return () => {
      iptal = true;
    };
  }, [bolumId]);
  return { kural, mufredat, hazir };
}

function hesapla(basvuru, mufredat, kural) {
  const dersler = (basvuru && Array.isArray(basvuru.dersler) ? basvuru.dersler : []).map((d) => ({
    kod: d.kod,
    ad: d.ad,
    akts: d.akts,
    not: d.not,
  }));
  if (dersler.length === 0) return null;
  return mezuniyetHesapla(mufredat, dersler, kural, { agno: basvuru.agno });
}

function ozetCikar(sonuc) {
  if (!sonuc) return null;
  return {
    gecilenAkts: sonuc.gecilenAkts,
    toplamAkts: sonuc.kural.toplamAkts,
    ihlalSayisi: sonuc.ihlalSayisi,
    kalanZorunlu: sonuc.kalanZorunlu.length,
    mezunOlabilir: sonuc.mezunOlabilir,
  };
}

// ── Dilekçe üretimi: kurum şablonu → (PDF'e çevir) ; yoksa yerleşik PDF ──
function blobIndir(blob, ad) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = ad;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 10000);
}

// TEK dilekçe: silinecek dersler (şablonda satırlar) ve eksik stajlar
// mezuniyet dilekçesinin içindedir.
export async function dilekceIndir(basvuru) {
  const b = basvuru || {};
  const tur = 'dilekce';
  const ad = 'Mezuniyet_Dilekcesi_' + dosyaParcasi(b.ogrenciNo + '_' + b.ogrenciAd);
  const TE = window.TemplateEngine;
  if (TE && TE.produceFromTemplate) {
    const satirlar = (b.silinecekDersler || []).map((d) => ({
      kod: metin(d.kod),
      ad: metin(d.ad),
      akts: metin(d.akts),
      not: metin(d.not),
    }));
    const r = await TE.produceFromTemplate({
      module: 'mezuniyet',
      docType: tur,
      departmentId: b.departmentId || '',
      staticData: dilekceVerisi(b),
      rows: satirlar,
      filename: ad + '.docx',
      noDownload: true,
    });
    if (r && r.ok && r.blob) {
      try {
        const token = localStorage.getItem('caku_auth_token');
        const y = await fetch('/api/files/docx-pdf', {
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
        if (y.ok) {
          blobIndir(await y.blob(), ad + '.pdf');
          return { ok: true, kaynak: 'sablon' };
        }
      } catch (_) {
        /* çeviri yoksa Word iner */
      }
      blobIndir(r.blob, ad + '.docx');
      return {
        ok: true,
        kaynak: 'sablon-word',
        uyari: 'Dilekçe Word olarak indi; Word’de açıp çıktısını alın ve imzalayın.',
      };
    }
  }
  const [PDFLib, fontkitMod, P, fN, fK] = await Promise.all([
    import('pdf-lib'),
    import('@pdf-lib/fontkit'),
    import('./lib/mezuniyet-pdf.js'),
    fetch('/yazitipi/DejaVuSans-tr.ttf').then((r) => r.arrayBuffer()),
    fetch('/yazitipi/DejaVuSans-Bold-tr.ttf').then((r) => r.arrayBuffer()),
  ]);
  const bayt = await P.mezuniyetPdfOlustur({
    tur,
    basvuru: b,
    PDFLib,
    fontkit: fontkitMod.default || fontkitMod,
    fontNormal: fN,
    fontKalin: fK,
  });
  blobIndir(new Blob([bayt], { type: 'application/pdf' }), ad + '.pdf');
  return { ok: true, kaynak: 'yerlesik' };
}

// ══════════════════════════════════════════════════════════════
// ORTAK PARÇALAR
// ══════════════════════════════════════════════════════════════
function DurumRozeti({ durum }) {
  const d = MEZ_DURUMLAR[durum] || MEZ_DURUMLAR.taslak;
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '3px 10px',
        borderRadius: 999,
        fontSize: 11.5,
        fontWeight: 700,
        color: d.renk,
        background: d.zemin,
        whiteSpace: 'nowrap',
      }}
    >
      {d.etiket}
    </span>
  );
}

function AdimSeridi({ durum }) {
  const aktif = durum ? adimSirasi(durum) : -1;
  const bitti = durum === 'tamamlandi';
  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
      {MEZ_ADIMLAR.map((a, i) => {
        const gecildi = i < aktif || bitti;
        const simdi = i === aktif && !bitti;
        return (
          <div
            key={a.id}
            style={{
              flex: '1 1 140px',
              padding: '9px 12px',
              borderRadius: 10,
              border: '1px solid ' + (simdi ? R.turuncu : gecildi ? '#A7F3D0' : R.kenar),
              background: simdi ? '#FFF3E6' : gecildi ? '#ECFDF5' : 'white',
              fontSize: 12.5,
              fontWeight: 700,
              color: simdi ? '#B45309' : gecildi ? R.yesil : R.soluk,
            }}
          >
            {gecildi ? '✓ ' : i + 1 + '. '}
            {a.etiket}
          </div>
        );
      })}
    </div>
  );
}

function BilgiKutusu({ tur, children }) {
  const t = {
    bilgi: { bg: '#E8F0FF', kenar: '#BFD3FF', renk: R.navy },
    uyari: { bg: '#FFFBEB', kenar: '#FCD34D', renk: '#92400E' },
    hata: { bg: '#FEF2F2', kenar: '#FCA5A5', renk: '#B91C1C' },
    basari: { bg: '#ECFDF5', kenar: '#A7F3D0', renk: '#065F46' },
  }[tur || 'bilgi'];
  return (
    <div
      style={{
        padding: '10px 13px',
        borderRadius: 10,
        background: t.bg,
        border: '1px solid ' + t.kenar,
        color: t.renk,
        fontSize: 12.5,
        lineHeight: 1.55,
        marginBottom: 12,
      }}
    >
      {children}
    </div>
  );
}

function KosulOzeti({ sonuc }) {
  if (!sonuc) return null;
  return (
    <div style={{ marginBottom: 14 }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          marginBottom: 6,
          flexWrap: 'wrap',
          gap: 6,
        }}
      >
        <span style={{ fontSize: 13.5, fontWeight: 800, color: R.navy }}>
          {sonuc.gecilenAkts} / {sonuc.kural.toplamAkts} AKTS
        </span>
        <span style={{ fontSize: 12, color: R.soluk }}>
          {sonuc.kalanAkts} AKTS kaldı · {sonuc.modelEtiketi}
        </span>
      </div>
      <div style={{ height: 8, borderRadius: 999, background: R.kenar, overflow: 'hidden' }}>
        <div
          style={{
            width: sonuc.yuzde + '%',
            height: '100%',
            background: sonuc.mezunOlabilir ? R.yesil : R.mavi,
          }}
        />
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 6,
          marginTop: 12,
        }}
      >
        {sonuc.kosullar.map((k) => (
          <div
            key={k.id}
            style={{
              display: 'flex',
              gap: 8,
              alignItems: 'center',
              fontSize: 12.5,
              padding: '6px 10px',
              borderRadius: 8,
              background:
                k.saglandi === true ? '#ECFDF5' : k.saglandi === false ? '#FEF2F2' : '#F7F7F7',
            }}
          >
            <b
              style={{
                width: 14,
                color: k.saglandi === true ? R.yesil : k.saglandi === false ? R.kirmizi : '#80858E',
              }}
            >
              {k.saglandi === true ? '✓' : k.saglandi === false ? '✕' : '?'}
            </b>
            <span style={{ flex: 1 }}>{k.label}</span>
            <span style={{ color: R.soluk, fontSize: 11.5 }}>{k.mevcut}</span>
          </div>
        ))}
      </div>
      {sonuc.kalanZorunlu.length > 0 && (
        <div style={{ marginTop: 10, fontSize: 12, color: '#991B1B' }}>
          <b>Kalan zorunlu dersler:</b>{' '}
          {sonuc.kalanZorunlu.map((c) => c.code + ' ' + c.name).join(', ')}
        </div>
      )}
    </div>
  );
}

/**
 * Transkript formu — SALT OKUNUR. Kurala uymayan satır sarı zeminle
 * görünür, nedeni satırın altında yazar. `secim` verilirse (danışman) her
 * satırda "silinecek" kutusu çıkar.
 */
function TranskriptFormu({ sonuc, secim, onSecim, secimKilitli }) {
  if (!sonuc) return null;
  const durumRenk = { gecti: R.yesil, kaldi: R.kirmizi, belirsiz: '#B45309' };
  const durumEtiket = { gecti: 'Geçti', kaldi: 'Kaldı', belirsiz: 'Belirsiz' };
  const h = { padding: '7px 9px', fontSize: 12.5, borderBottom: '1px solid #EDEDED' };
  const anahtar = (r, i) => metin(r.kod) + '|' + metin(r.ad) + '|' + i;
  return (
    <div>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', fontSize: 12, marginBottom: 8 }}>
        <span>
          <span
            style={{
              display: 'inline-block',
              width: 12,
              height: 12,
              borderRadius: 3,
              background: R.sari,
              border: '1px solid ' + R.sariKenar,
              verticalAlign: 'middle',
              marginRight: 5,
            }}
          />
          Bölüm kurallarına uymayan ders ({sonuc.ihlalSayisi})
        </span>
        <span style={{ color: R.soluk }}>
          Form transkriptten olduğu gibi aktarıldı; düzenlenemez.
        </span>
      </div>
      <div
        style={{
          border: '1px solid ' + R.kenar,
          borderRadius: 10,
          overflow: 'auto',
          maxHeight: 460,
        }}
      >
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 560 }}>
          <thead>
            <tr style={{ background: '#F7F7F7', position: 'sticky', top: 0 }}>
              {(secim ? ['Sil'] : [])
                .concat(['Kod', 'Ders Adı', 'AKTS', 'Not', 'Durum'])
                .map((t) => (
                  <th
                    key={t}
                    style={{ ...h, textAlign: 'left', fontSize: 10.5, color: R.soluk, zIndex: 1 }}
                  >
                    {t}
                  </th>
                ))}
            </tr>
          </thead>
          <tbody>
            {sonuc.kayitlar.map((r, i) => {
              const k = anahtar(r, i);
              const sari = r.ihlaller && r.ihlaller.length > 0;
              const silinecek = secim && secim.has(k);
              return (
                <tr
                  key={k}
                  style={{
                    background: silinecek ? '#FEE2E2' : sari ? R.sari : 'white',
                    boxShadow: sari ? 'inset 3px 0 0 ' + R.sariKenar : 'none',
                  }}
                >
                  {secim && (
                    <td style={{ ...h, width: 34 }}>
                      <input
                        type="checkbox"
                        checked={!!silinecek}
                        disabled={secimKilitli}
                        onChange={(e) => onSecim && onSecim(k, r, e.target.checked)}
                        title="Silinmesi gereken ders"
                      />
                    </td>
                  )}
                  <td style={{ ...h, width: 90, fontWeight: 700 }}>{r.kod}</td>
                  <td style={h}>
                    <div style={{ textDecoration: silinecek ? 'line-through' : 'none' }}>
                      {r.ad}
                    </div>
                    {sari && (
                      <div style={{ fontSize: 11, color: '#92400E', marginTop: 2 }}>
                        ⚠ {r.ihlaller.map((x) => x.etiket).join(' · ')}
                      </div>
                    )}
                  </td>
                  <td style={{ ...h, width: 55 }}>{r.akts}</td>
                  <td style={{ ...h, width: 55, fontWeight: 700 }}>{r.not}</td>
                  <td style={{ ...h, width: 70, color: durumRenk[r.durum], fontWeight: 700 }}>
                    {durumEtiket[r.durum]}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function BelgeSatiri({ etiket, belge }) {
  if (!belge || !belge.url) return null;
  return (
    <a
      href={belge.url}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        display: 'inline-flex',
        gap: 6,
        alignItems: 'center',
        padding: '7px 12px',
        borderRadius: 9,
        border: '1px solid #BFD3FF',
        background: '#E8F0FF',
        color: R.mavi,
        fontSize: 12.5,
        fontWeight: 700,
        textDecoration: 'none',
      }}
    >
      📄 {etiket}
    </a>
  );
}

function Notlar({ basvuru }) {
  const liste = (basvuru && basvuru.mesajlar) || [];
  if (!liste.length && !metin(basvuru && basvuru.danismanNotu)) return null;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {liste.map((m, i) => (
        <div
          key={i}
          style={{
            alignSelf: m.rol === 'danisman' ? 'flex-start' : 'flex-end',
            maxWidth: '85%',
            padding: '8px 12px',
            borderRadius: 12,
            background: m.rol === 'danisman' ? '#E8F0FF' : '#FFF3E6',
            fontSize: 12.5,
            lineHeight: 1.5,
          }}
        >
          <div style={{ fontSize: 10.5, color: R.soluk, marginBottom: 2 }}>
            {m.rol === 'danisman' ? 'Danışman' : 'Öğrenci'} · {m.yazan} ·{' '}
            {m.tarih ? new Date(m.tarih).toLocaleString('tr-TR') : ''}
          </div>
          {m.metin}
        </div>
      ))}
    </div>
  );
}

function NotYaz({ onGonder, yer }) {
  const [t, setT] = useState('');
  const [mesgul, setMesgul] = useState(false);
  return (
    <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
      <textarea
        value={t}
        onChange={(e) => setT(e.target.value)}
        rows={2}
        placeholder={yer || 'Not yazın…'}
        style={{ ...GIRDI, resize: 'vertical' }}
      />
      <button
        type="button"
        disabled={!t.trim() || mesgul}
        style={dugme('birincil', !t.trim() || mesgul)}
        onClick={async () => {
          setMesgul(true);
          try {
            await onGonder(t.trim());
            setT('');
          } finally {
            setMesgul(false);
          }
        }}
      >
        Gönder
      </button>
    </div>
  );
}

function IsaretOzeti({ basvuru }) {
  const sil = (basvuru && basvuru.silinecekDersler) || [];
  const staj = (basvuru && basvuru.eksikStajlar) || [];
  if (!sil.length && !staj.length) return null;
  return (
    <BilgiKutusu tur="uyari">
      {sil.length > 0 && (
        <div>
          <b>Danışmanınızın silinmesini istediği dersler ({sil.length}):</b>{' '}
          {sil.map((d) => d.kod + ' ' + d.ad).join(', ')}
        </div>
      )}
      {staj.length > 0 && (
        <div style={{ marginTop: sil.length ? 6 : 0 }}>
          <b>Eksik stajlar:</b> {staj.join(', ')}
        </div>
      )}
    </BilgiKutusu>
  );
}

// ══════════════════════════════════════════════════════════════
// ÖĞRENCİ
// ══════════════════════════════════════════════════════════════
const TRANSKRIPT_SUTUNLARI = [
  { id: 'kod', label: 'Ders Kodu', hint: 'örn. BLM101' },
  { id: 'ad', label: 'Ders Adı' },
  { id: 'akts', label: 'AKTS', hint: 'yalnız sayı; kredi sütunuyla karıştırma' },
  { id: 'not', label: 'Harf Notu', hint: 'AA/BA/CC/FF gibi; yoksa boş bırak' },
];
const TRANSKRIPT_UST_BILGI = [
  { id: 'agno', label: 'AGNO / GANO', hint: 'genel not ortalaması, örn. 3,42' },
  { id: 'sinif', label: 'Sınıf', hint: 'yalnız rakam' },
];

function OgrenciMezuniyet({ currentUser, activeDepartment, departmentInfo }) {
  const ogrNo = metin(currentUser?.studentNumber || currentUser?.identifier);
  const bolumId = window.ogrenciAktifBolumu
    ? window.ogrenciAktifBolumu(currentUser, activeDepartment)
    : currentUser?.departmentId || activeDepartment;
  const { kural, mufredat, hazir } = useBolumVerisi(bolumId);
  const [basvuru, setBasvuru] = useState(null);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [danismanlar, setDanismanlar] = useState([]);
  const [danisman, setDanisman] = useState('');
  const [aiVar, setAiVar] = useState(false);
  const [dosya, setDosya] = useState(null);
  const [calisiyor, setCalisiyor] = useState('');
  const [mesaj, setMesaj] = useState({ tur: '', metin: '' });
  const [iletisim, setIletisim] = useState({ telefon: '', eposta: '', adres: '' });
  const [kurumFormu, setKurumFormu] = useState(null);
  const [eskiKayit, setEskiKayit] = useState(null);

  const yenile = useCallback(async () => {
    const b = await basvuruOku(ogrNo);
    setBasvuru(b);
    if (b && b.iletisim) setIletisim((x) => ({ ...x, ...b.iletisim }));
    if (b && b.danisman) setDanisman(b.danisman);
    return b;
  }, [ogrNo]);

  (window.useBildirimHedefi || (() => {}))('mezuniyet', () => {
    yenile();
  });

  useEffect(() => {
    let iptal = false;
    (async () => {
      try {
        await yenile();
        // Danışman: ders seçiminde seçilen en son danışman öntanımlı gelir.
        const [secimler, hocalar, varyant, ogrenciler, formlar, akademik] = await Promise.all([
          window.apiRead('student_courses').catch(() => []),
          window.apiRead('professors').catch(() => []),
          window.deptIdVariants
            ? window.deptIdVariants(bolumId).catch(() => [bolumId])
            : Promise.resolve([bolumId]),
          window.apiRead('students').catch(() => []),
          window.apiRead('forms').catch(() => []),
          window.apiReadDoc('ogrenci_akademik_kayit', ogrNo).catch(() => null),
        ]);
        if (iptal) return;
        const benimSecimler = (secimler || [])
          .filter((s) => metin(s.id || s._docId).indexOf(ogrNo + '__') === 0 && metin(s.advisor))
          .sort((a, b) => metin(b.id || b._docId).localeCompare(metin(a.id || a._docId)));
        const vset = new Set((varyant || [bolumId]).map(String));
        const adlar = Array.from(
          new Set(
            (hocalar || [])
              .filter(
                (p) =>
                  vset.has(String(p.departmentId || '')) ||
                  (p.additionalDepartments || []).some((x) => vset.has(String(x)))
              )
              .map((p) => metin(p.name))
              .filter(Boolean)
          )
        ).sort((a, b) => a.localeCompare(b, 'tr'));
        setDanismanlar(adlar);
        setDanisman((d) => d || (benimSecimler[0] && metin(benimSecimler[0].advisor)) || '');
        const ben = (ogrenciler || []).find((s) => metin(s.studentNumber) === ogrNo) || {};
        setIletisim((x) => ({
          telefon: x.telefon || metin(ben.phone || ben.telefon),
          eposta: x.eposta || metin(ben.email || currentUser?.email),
          adres: x.adres || metin(ben.address || ben.adres),
        }));
        // Kurumun boş mezuniyet dilekçesi Formlar'da duruyorsa bağlantısı.
        const f = (formlar || []).find((x) =>
          /mezuniyet/i.test(String(x.baslik || x.title || '').toLocaleLowerCase('tr-TR'))
        );
        if (f && (f.dosyaURL || f.url)) setKurumFormu({ url: f.dosyaURL || f.url, ad: f.baslik });
        if (akademik && akademik.exists && Array.isArray(akademik.data.dersler)) {
          setEskiKayit(akademik.data);
        }
      } finally {
        if (!iptal) setYukleniyor(false);
      }
    })();
    if (window.aiBelgeDurumu) {
      window
        .aiBelgeDurumu()
        .then((d) => !iptal && setAiVar(!!(d && d.configured)))
        .catch(() => {});
    }
    return () => {
      iptal = true;
    };
  }, [ogrNo, bolumId]);

  const sonuc = useMemo(() => hesapla(basvuru, mufredat, kural), [basvuru, mufredat, kural]);
  const durum = (basvuru && basvuru.durum) || '';
  const formAsamasi = !basvuru || durum === 'taslak' || durum === 'iade';
  const kimlik = metin(currentUser?.name || ogrNo);

  const bolumAdi =
    metin(departmentInfo && departmentInfo.name) ||
    metin(((window.DEPARTMENTS || []).find((d) => d.id === bolumId) || {}).name);

  const temelVeri = (ek) => ({
    ogrenciNo: ogrNo,
    ogrenciAd: metin(currentUser?.name),
    departmentId: String(bolumId || ''),
    facultyId: metin(currentUser?.facultyId || (departmentInfo && departmentInfo.facultyId)),
    bolumAdi,
    fakulteAdi: metin(departmentInfo && departmentInfo.facultyName),
    updatedAt: new Date().toISOString(),
    ...ek,
  });

  const formuKaydet = async (veri, olay) => {
    const gecmis = ((basvuru && basvuru.gecmis) || []).concat(
      olay ? [gecmisKaydi(olay, kimlik, 'ogrenci')] : []
    );
    await basvuruYaz(
      ogrNo,
      temelVeri({
        ...(basvuru ? {} : { createdAt: new Date().toISOString(), durum: 'taslak' }),
        ...veri,
        gecmis,
      })
    );
    return yenile();
  };

  const transkriptiTara = async () => {
    if (!dosya) return;
    setCalisiyor('tara');
    setMesaj({ tur: '', metin: '' });
    try {
      const yuklenen = await dosyaYukle(dosya, 'transkriptler');
      const dosyalar = [{ fileName: window.aiDosyaAdi(yuklenen.url), name: 'Transkript' }];
      const [satirSonuc, ustSonuc] = await Promise.all([
        window.aiSatirCikar({
          module: 'benim',
          docType: 'transkript',
          sutunlar: TRANSKRIPT_SUTUNLARI,
          satirTanimi: 'transkriptte yer alan her ders satırı',
          dosyalar,
        }),
        window
          .aiAlanDoldur({
            module: 'benim',
            docType: 'transkript',
            alanlar: TRANSKRIPT_UST_BILGI,
            dosyalar,
          })
          .catch(() => null),
      ]);
      const satirlar = (satirSonuc && satirSonuc.satirlar) || [];
      if (satirlar.length === 0) throw new Error('Transkriptten ders satırı çıkarılamadı.');
      const ust = (ustSonuc && ustSonuc.data) || {};
      const dersler = satirlar
        .map((s) => ({
          kod: metin(s.kod),
          ad: metin(s.ad),
          akts: metin(s.akts).replace(/[^\d]/g, ''),
          not: metin(s.not).toLocaleUpperCase('tr-TR'),
        }))
        .filter((d) => d.kod || d.ad);
      const taslak = {
        dersler,
        agno: metin(ust.agno && ust.agno.deger),
        sinif: metin(ust.sinif && ust.sinif.deger),
        transkriptUrl: yuklenen.url,
        transkriptAdi: yuklenen.ad,
        transkriptTarihi: yuklenen.tarih,
      };
      const s = hesapla(taslak, mufredat, kural);
      await formuKaydet({ ...taslak, ozet: ozetCikar(s) }, 'Transkript yüklendi ve tarandı');
      setDosya(null);
      setMesaj({
        tur: 'basari',
        metin: dersler.length + ' ders forma aktarıldı. Kontrol edip danışmanınıza gönderin.',
      });
    } catch (e) {
      setMesaj({ tur: 'hata', metin: e.message });
    } finally {
      setCalisiyor('');
    }
  };

  const eskiKaydiKullan = async () => {
    if (!eskiKayit) return;
    setCalisiyor('eski');
    try {
      const taslak = {
        dersler: eskiKayit.dersler,
        agno: metin(eskiKayit.agno),
        sinif: metin(eskiKayit.sinif),
        transkriptUrl: metin(eskiKayit.transkriptUrl),
        transkriptAdi: 'Transkript',
        transkriptTarihi: eskiKayit.transkriptTarihi || new Date().toISOString(),
      };
      await formuKaydet(
        { ...taslak, ozet: ozetCikar(hesapla(taslak, mufredat, kural)) },
        'Kayıtlı transkript forma aktarıldı'
      );
    } catch (e) {
      setMesaj({ tur: 'hata', metin: e.message });
    } finally {
      setCalisiyor('');
    }
  };

  const danismanaGonder = async () => {
    if (!danisman) {
      setMesaj({ tur: 'hata', metin: 'Önce danışmanınızı seçin.' });
      return;
    }
    setCalisiyor('gonder');
    try {
      await formuKaydet(
        {
          danisman,
          durum: 'danismanda',
          gonderimTarihi: new Date().toISOString(),
          ozet: ozetCikar(sonuc),
        },
        'Form danışmana gönderildi'
      );
      setMesaj({ tur: 'basari', metin: 'Formunuz danışmanınıza gönderildi.' });
    } catch (e) {
      setMesaj({ tur: 'hata', metin: e.message });
    } finally {
      setCalisiyor('');
    }
  };

  const imzaliYukle = async (alan, f) => {
    setCalisiyor(alan);
    setMesaj({ tur: '', metin: '' });
    try {
      const y = await dosyaYukle(f, MEZ_BELGE_KLASORU);
      await basvuruYaz(ogrNo, { [alan]: y, updatedAt: new Date().toISOString() });
      await yenile();
    } catch (e) {
      setMesaj({ tur: 'hata', metin: e.message });
    } finally {
      setCalisiyor('');
    }
  };

  const imzaliGonder = async () => {
    setCalisiyor('imza');
    try {
      await basvuruYaz(ogrNo, {
        iletisim,
        durum: 'imzali',
        imzaTarihi: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        gecmis: (basvuru.gecmis || []).concat([
          gecmisKaydi('İmzalı dilekçe danışmana gönderildi', kimlik, 'ogrenci'),
        ]),
      });
      await yenile();
      setMesaj({ tur: 'basari', metin: 'İmzalı dilekçeniz danışmanınıza gönderildi.' });
    } catch (e) {
      setMesaj({ tur: 'hata', metin: e.message });
    } finally {
      setCalisiyor('');
    }
  };

  const indir = async () => {
    setCalisiyor('indir');
    try {
      // İletişim bilgileri dilekçeye basılır; önce kaydedilir.
      if (JSON.stringify(iletisim) !== JSON.stringify(basvuru.iletisim || {})) {
        await basvuruYaz(ogrNo, { iletisim, updatedAt: new Date().toISOString() });
      }
      const b = (await yenile()) || basvuru;
      const r = await dilekceIndir(b);
      if (r && r.uyari) setMesaj({ tur: 'uyari', metin: r.uyari });
    } catch (e) {
      setMesaj({ tur: 'hata', metin: 'Dilekçe oluşturulamadı: ' + e.message });
    } finally {
      setCalisiyor('');
    }
  };

  const notGonder = async (t) => {
    await basvuruYaz(ogrNo, {
      mesajlar: (basvuru.mesajlar || []).concat([
        { rol: 'ogrenci', yazan: kimlik, metin: t, tarih: new Date().toISOString() },
      ]),
      updatedAt: new Date().toISOString(),
    });
    await yenile();
  };

  if (yukleniyor || !hazir) {
    return <div style={{ padding: 40, textAlign: 'center', color: R.soluk }}>Yükleniyor…</div>;
  }

  const eksikler = basvuru ? imzaEksikleri(basvuru) : [];

  return (
    <div>
      <AdimSeridi durum={durum || 'taslak'} />
      {mesaj.metin && <BilgiKutusu tur={mesaj.tur || 'bilgi'}>{mesaj.metin}</BilgiKutusu>}

      {basvuru && (
        <div style={{ ...KART, display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <DurumRozeti durum={durum} />
          {basvuru.danisman && (
            <span style={{ fontSize: 13, color: R.soluk }}>
              Danışman: <b style={{ color: R.metin }}>{basvuru.danisman}</b>
            </span>
          )}
          <span style={{ fontSize: 12, color: R.soluk, marginLeft: 'auto' }}>
            Son güncelleme: {trTarih(basvuru.updatedAt)}
          </span>
        </div>
      )}

      {durum === 'iade' && (
        <BilgiKutusu tur="uyari">
          <b>Danışmanınız düzeltme istedi.</b> {metin(basvuru.danismanNotu)} Gerekirse güncel
          transkriptinizi yeniden yükleyin ve formu tekrar gönderin.
        </BilgiKutusu>
      )}

      {/* ── 1) TRANSKRİPT VE FORM ── */}
      {formAsamasi && (
        <div style={KART}>
          <h3 style={BASLIK}>Transkript</h3>
          <div style={{ fontSize: 12.5, color: R.soluk, marginBottom: 10, lineHeight: 1.55 }}>
            e-Devlet’ten aldığınız karekodlu transkript PDF’inizi yükleyin. Sistem transkripti tarar
            ve dersleri forma <b>olduğu gibi</b> aktarır. Formdaki dersler elle değiştirilemez;
            hatalı okunan bir satır varsa danışmanınız transkriptle karşılaştırarak düzeltme ister.
          </div>
          {!aiVar && (
            <BilgiKutusu tur="uyari">
              Belge işleme şu anda kapalı — transkript taranamıyor.
            </BilgiKutusu>
          )}
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <label style={{ cursor: 'pointer' }}>
              <input
                type="file"
                accept=".pdf,application/pdf"
                style={{ display: 'none' }}
                onChange={(e) => {
                  const f = (e.target.files && e.target.files[0]) || null;
                  e.target.value = '';
                  if (f) setDosya(f);
                }}
              />
              <span style={dugme('ikincil')}>Transkript seç (PDF)</span>
            </label>
            {dosya && <span style={{ fontSize: 12, color: R.yesil }}>{dosya.name}</span>}
            <button
              type="button"
              disabled={!dosya || !!calisiyor || !aiVar}
              onClick={transkriptiTara}
              style={dugme('birincil', !dosya || !!calisiyor || !aiVar)}
            >
              {calisiyor === 'tara' ? 'Taranıyor…' : 'Yükle ve tara'}
            </button>
            {!basvuru && eskiKayit && (
              <button
                type="button"
                disabled={!!calisiyor}
                onClick={eskiKaydiKullan}
                style={dugme('ikincil', !!calisiyor)}
              >
                Daha önce taranan transkriptimi kullan
              </button>
            )}
          </div>
          {basvuru && basvuru.transkriptUrl && (
            <div style={{ marginTop: 12 }}>
              <BelgeSatiri
                etiket={'Yüklü transkript (' + trTarih(basvuru.transkriptTarihi) + ')'}
                belge={{ url: basvuru.transkriptUrl }}
              />
            </div>
          )}
        </div>
      )}

      {sonuc && (
        <div style={KART}>
          <h3 style={BASLIK}>Mezuniyet formu</h3>
          <BilgiKutusu tur="uyari">
            Bu hesap <b>bilgilendirme amaçlıdır</b>; resmî karar öğrenci bilgi sistemindedir.
          </BilgiKutusu>
          <div
            style={{ display: 'flex', gap: 18, flexWrap: 'wrap', fontSize: 13, marginBottom: 12 }}
          >
            <span>
              Öğrenci: <b>{metin(currentUser?.name)}</b> ({ogrNo})
            </span>
            <span>
              AGNO: <b>{metin(basvuru.agno) || '—'}</b>
            </span>
            <span>
              Sınıf: <b>{metin(basvuru.sinif) || '—'}</b>
            </span>
          </div>
          <KosulOzeti sonuc={sonuc} />
          <TranskriptFormu sonuc={sonuc} />
        </div>
      )}

      {formAsamasi && basvuru && sonuc && (
        <div style={KART}>
          <h3 style={BASLIK}>Danışman onayına gönder</h3>
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 260px' }}>
              <label style={ETIKET}>Akademik danışmanınız</label>
              <select value={danisman} onChange={(e) => setDanisman(e.target.value)} style={GIRDI}>
                <option value="">Danışman seçin</option>
                {Array.from(new Set(danismanlar.concat(danisman ? [danisman] : []))).map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="button"
              disabled={!danisman || !!calisiyor}
              onClick={danismanaGonder}
              style={dugme('turuncu', !danisman || !!calisiyor)}
            >
              {calisiyor === 'gonder' ? 'Gönderiliyor…' : 'Danışmana gönder'}
            </button>
          </div>
        </div>
      )}

      {durum === 'danismanda' && (
        <BilgiKutusu>
          Formunuz ve transkriptiniz danışmanınızın onayında. Onaylandığında bildirim alacak ve
          mezuniyet dilekçenizi oluşturabileceksiniz.
        </BilgiKutusu>
      )}

      {/* ── 2) DİLEKÇE ── */}
      {durum === 'dilekce' && (
        <div style={KART}>
          <h3 style={BASLIK}>Mezuniyet dilekçesi</h3>
          <BilgiKutusu tur="basari">
            Danışmanınız formunuzu onayladı. İletişim bilgilerinizi kontrol edin, dilekçenizi
            indirin, imzalayın ve imzalı hâlini PDF olarak yükleyin.
          </BilgiKutusu>
          <IsaretOzeti basvuru={basvuru} />
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: 10,
              marginBottom: 14,
            }}
          >
            {[
              ['telefon', 'Telefon'],
              ['eposta', 'E-posta'],
              ['adres', 'Adres'],
            ].map(([k, l]) => (
              <div key={k}>
                <label style={ETIKET}>{l}</label>
                <input
                  value={iletisim[k] || ''}
                  onChange={(e) => setIletisim({ ...iletisim, [k]: e.target.value })}
                  style={GIRDI}
                />
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <BelgeAdimi
              baslik="Mezuniyet dilekçesi"
              indirMetni={calisiyor === 'indir' ? 'Hazırlanıyor…' : 'Dilekçeyi indir'}
              onIndir={indir}
              yuklenen={basvuru.imzaliDilekce}
              yukleniyor={calisiyor === 'imzaliDilekce'}
              onYukle={(f) => imzaliYukle('imzaliDilekce', f)}
              mesgul={!!calisiyor}
            />
          </div>
          {(basvuru.silinecekDersler || []).length > 0 && (
            <div style={{ marginTop: 8, fontSize: 12, color: R.soluk }}>
              Danışmanınızın silinmesini istediği dersler dilekçenin içine işlenir; ayrı bir ders
              sildirme dilekçesi gerekmez.
            </div>
          )}
          {kurumFormu && (
            <div style={{ marginTop: 10, fontSize: 12, color: R.soluk }}>
              Kurumun boş formu (Formlar):{' '}
              <a
                href={kurumFormu.url}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: R.mavi }}
              >
                {kurumFormu.ad || 'Mezuniyet dilekçesi'}
              </a>
            </div>
          )}
          <div
            style={{
              marginTop: 14,
              display: 'flex',
              gap: 10,
              alignItems: 'center',
              flexWrap: 'wrap',
            }}
          >
            <button
              type="button"
              disabled={eksikler.length > 0 || !!calisiyor}
              onClick={imzaliGonder}
              style={dugme('turuncu', eksikler.length > 0 || !!calisiyor)}
            >
              {calisiyor === 'imza' ? 'Gönderiliyor…' : 'İmzalı dilekçeyi danışmana gönder'}
            </button>
            {eksikler.length > 0 && (
              <span style={{ fontSize: 12, color: R.soluk }}>{eksikler.join(' ')}</span>
            )}
          </div>
        </div>
      )}

      {durum === 'imzali' && (
        <BilgiKutusu>
          İmzalı dilekçeniz danışmanınızda. Danışmanınız belgelerinizi bölüm memuruna iletecek.
        </BilgiKutusu>
      )}
      {durum === 'memurda' && (
        <BilgiKutusu tur="basari">
          Transkriptiniz ve dilekçeniz {trTarih(basvuru.memuraIletim && basvuru.memuraIletim.tarih)}{' '}
          tarihinde bölüm memuruna iletildi.
        </BilgiKutusu>
      )}
      {durum === 'tamamlandi' && (
        <BilgiKutusu tur="basari">
          Mezuniyet başvurunuz bölüm memuru tarafından işlendi. {metin(basvuru.memurNotu)}
        </BilgiKutusu>
      )}

      {basvuru && ['dilekce', 'imzali', 'memurda', 'tamamlandi'].indexOf(durum) >= 0 && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
          <BelgeSatiri etiket="İmzalı mezuniyet dilekçesi" belge={basvuru.imzaliDilekce} />
          <BelgeSatiri etiket="İmzalı ders sildirme dilekçesi" belge={basvuru.imzaliSildirme} />
        </div>
      )}

      {basvuru &&
        ((basvuru.mesajlar || []).length > 0 ||
          ['taslak', 'iade', 'dilekce'].indexOf(durum) >= 0) &&
        durum !== 'taslak' && (
          <div style={KART}>
            <h3 style={BASLIK}>Danışman notları</h3>
            <Notlar basvuru={basvuru} />
            {['iade', 'dilekce'].indexOf(durum) >= 0 && (
              <NotYaz onGonder={notGonder} yer="Danışmanınıza not yazın…" />
            )}
          </div>
        )}
    </div>
  );
}

function BelgeAdimi({ baslik, indirMetni, onIndir, yuklenen, yukleniyor, onYukle, mesgul }) {
  return (
    <div
      style={{
        display: 'flex',
        gap: 10,
        alignItems: 'center',
        flexWrap: 'wrap',
        padding: '10px 12px',
        border: '1px solid ' + R.kenar,
        borderRadius: 10,
        background: '#FAFAFA',
      }}
    >
      <b style={{ fontSize: 13, color: R.navy, flex: '1 1 180px' }}>{baslik}</b>
      <button type="button" onClick={onIndir} disabled={mesgul} style={dugme('birincil', mesgul)}>
        {indirMetni}
      </button>
      <label style={{ cursor: mesgul ? 'not-allowed' : 'pointer' }}>
        <input
          type="file"
          accept=".pdf,application/pdf"
          style={{ display: 'none' }}
          disabled={mesgul}
          onChange={(e) => {
            const f = (e.target.files && e.target.files[0]) || null;
            e.target.value = '';
            if (f) onYukle(f);
          }}
        />
        <span style={dugme('ikincil', mesgul)}>
          {yukleniyor ? 'Yükleniyor…' : yuklenen ? 'İmzalıyı değiştir' : 'İmzalı PDF yükle'}
        </span>
      </label>
      {yuklenen && yuklenen.url && (
        <a
          href={yuklenen.url}
          target="_blank"
          rel="noopener noreferrer"
          style={{ fontSize: 12, color: R.yesil, fontWeight: 700 }}
        >
          ✓ {yuklenen.ad || 'yüklendi'}
        </a>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// DANIŞMAN — Akademisyen → Benim Sayfam → Mezuniyet Bekleyen Öğrenciler
// ══════════════════════════════════════════════════════════════
const DANISMAN_GRUPLARI = [
  { id: 'onay', baslik: 'Onayınızı bekleyen formlar', durumlar: ['danismanda'] },
  { id: 'imza', baslik: 'İmzalı dilekçesi gelenler', durumlar: ['imzali'] },
  { id: 'dilekce', baslik: 'Dilekçe aşamasındakiler', durumlar: ['dilekce'] },
  { id: 'iade', baslik: 'Düzeltme istenenler', durumlar: ['iade'] },
  { id: 'memur', baslik: 'Memura iletilenler', durumlar: ['memurda', 'tamamlandi'] },
];

export function MezuniyetDanismanPaneli({ currentUser, baslangic }) {
  const kimlik = metin(currentUser?.identifier || currentUser?.name);
  const [liste, setListe] = useState([]);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [secili, setSecili] = useState(metin(baslangic));
  const [hata, setHata] = useState('');

  const yukle = useCallback(async () => {
    try {
      const l = await window.apiRead(MEZ_BASVURU_KOLEKSIYONU);
      setListe((l || []).filter((b) => danismaniMi(b, kimlik) && b.durum !== 'taslak'));
      setHata('');
    } catch (e) {
      setHata('Başvurular okunamadı: ' + e.message);
    } finally {
      setYukleniyor(false);
    }
  }, [kimlik]);

  useEffect(() => {
    yukle();
  }, [yukle]);

  // Mezuniyet modülünün içinden açıldıysa zil bildirimi buraya düşer.
  (window.useBildirimHedefi || (() => {}))('mezuniyet', (h) => {
    const id = h && h.meta && h.meta.basvuruId;
    yukle();
    if (id) setSecili(String(id));
  });

  if (yukleniyor) return <div style={{ padding: 24, color: R.soluk }}>Yükleniyor…</div>;
  if (secili) {
    return (
      <DanismanDetay
        no={secili}
        kimlik={kimlik}
        onGeri={() => {
          setSecili('');
          yukle();
        }}
      />
    );
  }
  return (
    <div>
      {hata && <BilgiKutusu tur="hata">{hata}</BilgiKutusu>}
      {liste.length === 0 && (
        <BilgiKutusu>
          Danışmanı olduğunuz öğrencilerden gönderilmiş bir mezuniyet başvurusu yok. Öğrenci
          Mezuniyet modülünden formunu gönderdiğinde burada görünür.
        </BilgiKutusu>
      )}
      {DANISMAN_GRUPLARI.map((g) => {
        const ogeler = liste.filter((b) => g.durumlar.indexOf(b.durum) >= 0);
        if (!ogeler.length) return null;
        return (
          <div key={g.id} style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: R.soluk, margin: '0 0 6px' }}>
              {g.baslik.toLocaleUpperCase('tr-TR')} ({ogeler.length})
            </div>
            <BasvuruListesi liste={ogeler} onSec={(b) => setSecili(metin(b.ogrenciNo))} />
          </div>
        );
      })}
    </div>
  );
}

function BasvuruListesi({ liste, onSec }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {liste.map((b) => (
        <button
          key={b.ogrenciNo}
          type="button"
          onClick={() => onSec(b)}
          style={{
            display: 'flex',
            gap: 12,
            alignItems: 'center',
            flexWrap: 'wrap',
            textAlign: 'left',
            padding: '11px 14px',
            borderRadius: 12,
            border: '1px solid ' + R.kenar,
            background: 'white',
            cursor: 'pointer',
            fontFamily: 'inherit',
          }}
        >
          <div style={{ flex: '1 1 220px' }}>
            <div style={{ fontWeight: 800, color: R.navy, fontSize: 13.5 }}>
              {b.ogrenciAd || b.ogrenciNo}
            </div>
            <div style={{ fontSize: 12, color: R.soluk }}>
              {b.ogrenciNo} · {b.bolumAdi || ''} · AGNO {b.agno || '—'}
              {b.ozet ? ' · ' + b.ozet.gecilenAkts + '/' + b.ozet.toplamAkts + ' AKTS' : ''}
            </div>
          </div>
          {b.ozet && b.ozet.ihlalSayisi > 0 && (
            <span
              style={{
                fontSize: 11.5,
                fontWeight: 700,
                color: '#92400E',
                background: R.sari,
                border: '1px solid ' + R.sariKenar,
                borderRadius: 999,
                padding: '2px 9px',
              }}
            >
              {b.ozet.ihlalSayisi} sarı satır
            </span>
          )}
          <DurumRozeti durum={b.durum} />
          <span style={{ fontSize: 11.5, color: R.soluk }}>{trTarih(b.updatedAt)}</span>
        </button>
      ))}
    </div>
  );
}

function DanismanDetay({ no, kimlik, onGeri }) {
  const [b, setB] = useState(null);
  const [mesaj, setMesaj] = useState({ tur: '', metin: '' });
  const [calisiyor, setCalisiyor] = useState('');
  const [secim, setSecim] = useState(new Map()); // anahtar → ders
  const [stajlar, setStajlar] = useState([]);
  const [not, setNot] = useState('');
  const { kural, mufredat, hazir } = useBolumVerisi(b && b.departmentId);

  const oku = useCallback(async () => {
    const x = await basvuruOku(no);
    setB(x);
    setStajlar((x && x.eksikStajlar) || []);
    setNot((x && x.danismanNotu) || '');
    return x;
  }, [no]);
  useEffect(() => {
    oku();
  }, [oku]);

  const sonuc = useMemo(() => (b ? hesapla(b, mufredat, kural) : null), [b, mufredat, kural]);

  // Kayıtlı "silinecek" dersleri tablodaki satırlarla eşle.
  useEffect(() => {
    if (!sonuc || !b) return;
    const m = new Map();
    const kayitli = b.silinecekDersler || [];
    sonuc.kayitlar.forEach((r, i) => {
      const k = metin(r.kod) + '|' + metin(r.ad) + '|' + i;
      if (kayitli.some((d) => metin(d.kod) === metin(r.kod) && metin(d.ad) === metin(r.ad))) {
        m.set(k, { kod: r.kod, ad: r.ad, akts: r.akts, not: r.not });
      }
    });
    setSecim(m);
  }, [sonuc, b && JSON.stringify(b.silinecekDersler || [])]);

  if (!b || !hazir) return <div style={{ padding: 24, color: R.soluk }}>Yükleniyor…</div>;

  const durum = b.durum;
  const isaretAcik = durum === 'danismanda' || durum === 'dilekce';
  const stajSecenekleri = Array.from(
    new Set((mezKuralNormalize(kural).stajlar || []).concat(b.eksikStajlar || []))
  );
  const silinecekler = Array.from(secim.values());

  const yaz = async (veri, olay, basariMetni) => {
    setMesaj({ tur: '', metin: '' });
    try {
      await basvuruYaz(no, {
        ...veri,
        updatedAt: new Date().toISOString(),
        gecmis: (b.gecmis || []).concat(olay ? [gecmisKaydi(olay, kimlik, 'danisman')] : []),
      });
      await oku();
      if (basariMetni) setMesaj({ tur: 'basari', metin: basariMetni });
    } catch (e) {
      setMesaj({ tur: 'hata', metin: e.message });
    }
  };

  const isaretler = () => ({
    silinecekDersler: silinecekler,
    eksikStajlar: stajlar,
    danismanNotu: not.trim(),
  });

  const onayla = async () => {
    setCalisiyor('onay');
    await yaz(
      { ...isaretler(), durum: 'dilekce', danismanKarariTarihi: new Date().toISOString() },
      'Danışman formu onayladı',
      'Form onaylandı; öğrenci dilekçe aşamasına geçti.'
    );
    setCalisiyor('');
  };
  const iadeEt = async () => {
    if (!not.trim()) {
      setMesaj({
        tur: 'hata',
        metin: 'Geri çevirirken öğrenciye ne düzelteceğini not olarak yazın.',
      });
      return;
    }
    setCalisiyor('iade');
    await yaz(
      {
        ...isaretler(),
        durum: 'iade',
        danismanKarariTarihi: new Date().toISOString(),
        mesajlar: (b.mesajlar || []).concat([
          { rol: 'danisman', yazan: kimlik, metin: not.trim(), tarih: new Date().toISOString() },
        ]),
      },
      'Danışman düzeltme istedi',
      'Form öğrenciye geri çevrildi.'
    );
    setCalisiyor('');
  };
  const isaretKaydet = async () => {
    setCalisiyor('isaret');
    await yaz(
      isaretler(),
      'Danışman işaretleri güncelledi',
      'İşaretler kaydedildi; öğrenciye bildirildi.'
    );
    setCalisiyor('');
  };
  const notGonder = (t) =>
    yaz(
      {
        mesajlar: (b.mesajlar || []).concat([
          { rol: 'danisman', yazan: kimlik, metin: t, tarih: new Date().toISOString() },
        ]),
      },
      '',
      'Not öğrenciye gönderildi.'
    );
  const imzaIade = async () => {
    setCalisiyor('imza-iade');
    await yaz(
      { durum: 'dilekce' },
      'İmzalı dilekçe geri çevrildi',
      'İmzalı dilekçe öğrenciye geri çevrildi.'
    );
    setCalisiyor('');
  };

  const memuraIlet = async () => {
    setCalisiyor('memur');
    setMesaj({ tur: '', metin: '' });
    try {
      if (!window.belgeYonlendir) throw new Error('Belge yönlendirme bu sayfada yüklü değil.');
      const ortak = {
        module: 'mezuniyet',
        ogrenciNo: b.ogrenciNo,
        departmentId: b.departmentId,
        facultyId: b.facultyId,
        hedefRol: 'memur',
        subtitle: (b.ogrenciAd || '') + ' (' + b.ogrenciNo + ') · danışman: ' + kimlik,
        not: 'Danışman onaylı mezuniyet başvurusu',
      };
      const belgeler = [
        { docType: 'transkript', url: b.transkriptUrl, title: 'Mezuniyet — Transkript' },
        {
          docType: 'dilekce',
          url: b.imzaliDilekce && b.imzaliDilekce.url,
          title: 'Mezuniyet Dilekçesi (imzalı)',
        },
      ].filter((x) => x.url);
      for (const x of belgeler) {
        const r = await window.belgeYonlendir({
          ...ortak,
          ...x,
          sourceId: b.ogrenciNo + '_' + x.docType,
        });
        if (!r || !r.ok) {
          throw new Error(
            r && r.reason === 'kapsam-yok'
              ? 'Başvurunun bölümü belli değil; memura iletilemedi.'
              : 'Belge memura iletilemedi (' + ((r && r.reason) || 'bilinmeyen') + ').'
          );
        }
      }
      await yaz(
        {
          durum: 'memurda',
          memuraIletim: {
            tarih: new Date().toISOString(),
            yapan: kimlik,
            belgeSayisi: belgeler.length,
          },
        },
        'Transkript ve dilekçeler memura iletildi',
        belgeler.length + ' belge bölüm memuruna iletildi (Gelen Belgeler).'
      );
    } catch (e) {
      setMesaj({ tur: 'hata', metin: e.message });
    } finally {
      setCalisiyor('');
    }
  };

  return (
    <div>
      <button type="button" onClick={onGeri} style={{ ...dugme('ikincil'), marginBottom: 12 }}>
        ← Listeye dön
      </button>
      <AdimSeridi durum={durum} />
      {mesaj.metin && <BilgiKutusu tur={mesaj.tur || 'bilgi'}>{mesaj.metin}</BilgiKutusu>}

      <div style={{ ...KART, display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ flex: '1 1 260px' }}>
          <div style={{ fontSize: 16, fontWeight: 800, color: R.navy }}>{b.ogrenciAd}</div>
          <div style={{ fontSize: 12.5, color: R.soluk }}>
            {b.ogrenciNo} · {b.bolumAdi} · Sınıf {b.sinif || '—'} · AGNO {b.agno || '—'}
          </div>
        </div>
        <DurumRozeti durum={durum} />
        <BelgeSatiri etiket="Transkript (PDF)" belge={{ url: b.transkriptUrl }} />
        <BelgeSatiri etiket="İmzalı mezuniyet dilekçesi" belge={b.imzaliDilekce} />
        <BelgeSatiri etiket="İmzalı ders sildirme dilekçesi" belge={b.imzaliSildirme} />
      </div>

      <div style={KART}>
        <h3 style={BASLIK}>Mezuniyet formu</h3>
        <div style={{ fontSize: 12.5, color: R.soluk, marginBottom: 10 }}>
          Form öğrencinin transkriptinden olduğu gibi aktarıldı; transkript PDF’iyle karşılaştırın.{' '}
          {isaretAcik ? 'Silinmesi gereken dersleri “Sil” sütunundan işaretleyin.' : ''}
        </div>
        <KosulOzeti sonuc={sonuc} />
        <TranskriptFormu
          sonuc={sonuc}
          secim={secim}
          secimKilitli={!isaretAcik}
          onSecim={(k, r, acik) => {
            const m = new Map(secim);
            if (acik) m.set(k, { kod: r.kod, ad: r.ad, akts: r.akts, not: r.not });
            else m.delete(k);
            setSecim(m);
          }}
        />
      </div>

      <div style={KART}>
        <h3 style={BASLIK}>Eksik stajlar ve not</h3>
        <div style={{ display: 'flex', gap: '6px 18px', flexWrap: 'wrap', marginBottom: 12 }}>
          {stajSecenekleri.map((s) => (
            <label key={s} style={{ display: 'flex', gap: 7, alignItems: 'center', fontSize: 13 }}>
              <input
                type="checkbox"
                disabled={!isaretAcik}
                checked={stajlar.indexOf(s) >= 0}
                onChange={(e) =>
                  setStajlar(
                    e.target.checked ? stajlar.concat([s]) : stajlar.filter((x) => x !== s)
                  )
                }
              />
              {s} eksik
            </label>
          ))}
          {stajSecenekleri.length === 0 && (
            <span style={{ fontSize: 12, color: R.soluk }}>
              Bölümün staj listesi tanımlı değil (Bölüm Yönetimi → Mezuniyet Kuralları).
            </span>
          )}
        </div>
        <label style={ETIKET}>Öğrenciye not (dilekçeye ve bildirime gider)</label>
        <textarea
          value={not}
          disabled={!isaretAcik}
          onChange={(e) => setNot(e.target.value)}
          rows={3}
          style={{ ...GIRDI, resize: 'vertical' }}
        />
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
          {durum === 'danismanda' && (
            <>
              <button
                type="button"
                disabled={!!calisiyor}
                onClick={onayla}
                style={dugme('yesil', !!calisiyor)}
              >
                {calisiyor === 'onay' ? 'Kaydediliyor…' : 'Onayla — dilekçe aşamasına geç'}
              </button>
              <button
                type="button"
                disabled={!!calisiyor}
                onClick={iadeEt}
                style={dugme('tehlike', !!calisiyor)}
              >
                Düzeltme iste
              </button>
            </>
          )}
          {durum === 'dilekce' && (
            <button
              type="button"
              disabled={!!calisiyor}
              onClick={isaretKaydet}
              style={dugme('birincil', !!calisiyor)}
            >
              {calisiyor === 'isaret' ? 'Kaydediliyor…' : 'İşaretleri ve notu kaydet'}
            </button>
          )}
          {durum === 'imzali' && (
            <>
              <button
                type="button"
                disabled={!!calisiyor}
                onClick={memuraIlet}
                style={dugme('turuncu', !!calisiyor)}
              >
                {calisiyor === 'memur' ? 'İletiliyor…' : 'Transkript ve dilekçeyi memura ilet'}
              </button>
              <button
                type="button"
                disabled={!!calisiyor}
                onClick={imzaIade}
                style={dugme('tehlike', !!calisiyor)}
              >
                İmzalı dilekçeyi geri çevir
              </button>
            </>
          )}
        </div>
      </div>

      <div style={KART}>
        <h3 style={BASLIK}>Notlar</h3>
        <Notlar basvuru={b} />
        {['danismanda', 'dilekce', 'imzali'].indexOf(durum) >= 0 && (
          <NotYaz onGonder={notGonder} yer="Öğrenciye not gönderin…" />
        )}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// MEMUR ve YETKİLİ — bölümdeki başvurular
// ══════════════════════════════════════════════════════════════
function PersonelListesi({ currentUser, activeDepartment, memur }) {
  const [liste, setListe] = useState([]);
  const [secili, setSecili] = useState(null);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [mesaj, setMesaj] = useState({ tur: '', metin: '' });
  const kimlik = metin(currentUser?.name || currentUser?.identifier);

  const yukle = useCallback(async () => {
    const [l, varyant] = await Promise.all([
      window.apiRead(MEZ_BASVURU_KOLEKSIYONU).catch(() => []),
      window.deptIdVariants
        ? window.deptIdVariants(activeDepartment).catch(() => [activeDepartment])
        : Promise.resolve([activeDepartment]),
    ]);
    const vset = new Set((varyant || [activeDepartment]).map(String));
    setListe(
      (l || [])
        .filter((b) => !activeDepartment || vset.has(String(b.departmentId || '')))
        .filter((b) => (memur ? ['memurda', 'tamamlandi'].indexOf(b.durum) >= 0 : true))
        .sort((a, b) => metin(b.updatedAt).localeCompare(metin(a.updatedAt)))
    );
    setYukleniyor(false);
  }, [activeDepartment, memur]);
  useEffect(() => {
    yukle();
  }, [yukle]);

  const tamamla = async (b, notMetni) => {
    try {
      await basvuruYaz(b.ogrenciNo, {
        durum: 'tamamlandi',
        memurNotu: metin(notMetni),
        tamamlanmaTarihi: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        gecmis: (b.gecmis || []).concat([gecmisKaydi('Memur işlemi tamamladı', kimlik, 'memur')]),
      });
      setMesaj({ tur: 'basari', metin: 'İşlem tamamlandı; öğrenciye bildirildi.' });
      setSecili(null);
      yukle();
    } catch (e) {
      setMesaj({ tur: 'hata', metin: e.message });
    }
  };

  if (yukleniyor) return <div style={{ padding: 24, color: R.soluk }}>Yükleniyor…</div>;
  if (secili) {
    return (
      <PersonelDetay b={secili} memur={memur} onGeri={() => setSecili(null)} onTamamla={tamamla} />
    );
  }
  return (
    <div>
      {mesaj.metin && <BilgiKutusu tur={mesaj.tur}>{mesaj.metin}</BilgiKutusu>}
      <BilgiKutusu>
        {memur
          ? 'Danışmanların size ilettiği mezuniyet başvuruları. Belgeler Gelen Belgeler’de de görünür.'
          : 'Bölümünüzdeki mezuniyet başvuruları (taslaklar yalnız öğrenciye görünür).'}
      </BilgiKutusu>
      {liste.length === 0 ? (
        <div style={{ ...KART, color: R.soluk, fontSize: 13 }}>Gösterilecek başvuru yok.</div>
      ) : (
        <BasvuruListesi liste={liste} onSec={setSecili} />
      )}
    </div>
  );
}

function PersonelDetay({ b, memur, onGeri, onTamamla }) {
  const { kural, mufredat, hazir } = useBolumVerisi(b.departmentId);
  const sonuc = useMemo(() => hesapla(b, mufredat, kural), [b, mufredat, kural]);
  const [not, setNot] = useState('');
  return (
    <div>
      <button type="button" onClick={onGeri} style={{ ...dugme('ikincil'), marginBottom: 12 }}>
        ← Listeye dön
      </button>
      <AdimSeridi durum={b.durum} />
      <div style={{ ...KART, display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ flex: '1 1 260px' }}>
          <div style={{ fontSize: 16, fontWeight: 800, color: R.navy }}>{b.ogrenciAd}</div>
          <div style={{ fontSize: 12.5, color: R.soluk }}>
            {b.ogrenciNo} · Danışman: {b.danisman || '—'} · AGNO {b.agno || '—'}
          </div>
        </div>
        <DurumRozeti durum={b.durum} />
        <BelgeSatiri etiket="Transkript" belge={{ url: b.transkriptUrl }} />
        <BelgeSatiri etiket="İmzalı mezuniyet dilekçesi" belge={b.imzaliDilekce} />
        <BelgeSatiri etiket="İmzalı ders sildirme dilekçesi" belge={b.imzaliSildirme} />
      </div>
      <IsaretOzeti basvuru={b} />
      {hazir && sonuc && (
        <div style={KART}>
          <KosulOzeti sonuc={sonuc} />
          <TranskriptFormu sonuc={sonuc} />
        </div>
      )}
      {memur && b.durum === 'memurda' && (
        <div style={KART}>
          <h3 style={BASLIK}>İşlemi tamamla</h3>
          <textarea
            value={not}
            onChange={(e) => setNot(e.target.value)}
            rows={2}
            placeholder="Öğrenciye not (isteğe bağlı)"
            style={{ ...GIRDI, resize: 'vertical', marginBottom: 10 }}
          />
          <button type="button" onClick={() => onTamamla(b, not)} style={dugme('yesil')}>
            İşlem tamamlandı
          </button>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// MODÜL
// ══════════════════════════════════════════════════════════════
function MezuniyetApp({ currentUser, activeDepartment, departmentInfo }) {
  const Banner = window.CakuBanner;
  const ogrenci = currentUser?.role === 'student';
  const memur = !ogrenci && !!(currentUser?.isMemur || currentUser?.role === 'memur');
  const yonetici =
    !ogrenci &&
    !memur &&
    !!(
      currentUser?.role === 'admin' ||
      currentUser?.role === 'bolum_yetkilisi' ||
      currentUser?.isDeptManager ||
      currentUser?.isFacultyManager ||
      currentUser?.isUniversityAdmin
    );
  const [sekme, setSekme] = useState('danismanlik');

  let govde;
  if (ogrenci) {
    govde = (
      <OgrenciMezuniyet
        currentUser={currentUser}
        activeDepartment={activeDepartment}
        departmentInfo={departmentInfo}
      />
    );
  } else if (memur) {
    govde = <PersonelListesi currentUser={currentUser} activeDepartment={activeDepartment} memur />;
  } else {
    const sekmeler = [{ id: 'danismanlik', ad: 'Danışmanı olduğum öğrenciler' }].concat(
      yonetici ? [{ id: 'bolum', ad: 'Bölümdeki başvurular' }] : []
    );
    govde = (
      <div>
        {sekmeler.length > 1 && (
          <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
            {sekmeler.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setSekme(s.id)}
                style={dugme(sekme === s.id ? 'birincil' : 'ikincil')}
              >
                {s.ad}
              </button>
            ))}
          </div>
        )}
        {sekme === 'bolum' && yonetici ? (
          <PersonelListesi currentUser={currentUser} activeDepartment={activeDepartment} />
        ) : (
          <MezuniyetDanismanPaneli currentUser={currentUser} />
        )}
      </div>
    );
  }

  return (
    <div style={{ fontFamily: "'Inter', sans-serif", color: R.metin }}>
      {Banner ? (
        <Banner
          title="Mezuniyet"
          subtitle={
            ogrenci
              ? 'Transkript formu, danışman onayı ve mezuniyet dilekçesi'
              : 'Mezuniyet formları, dilekçeler ve memura iletim'
          }
        />
      ) : (
        <h1 style={{ color: R.navy }}>Mezuniyet</h1>
      )}
      {govde}
    </div>
  );
}

window.MezuniyetApp = MezuniyetApp;
window.MezuniyetDanismanPaneli = MezuniyetDanismanPaneli;
export default MezuniyetApp;
