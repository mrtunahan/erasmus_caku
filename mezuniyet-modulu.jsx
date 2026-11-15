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
  dosyaParcasi,
  gecmisKaydi,
  imzaEksikleri,
  silinecekDersleriBirlestir,
  dersAnahtari,
  silinecekleriTekille,
  dersGrupAnahtari,
} from './lib/mezuniyet-basvuru.js';
import {
  mezuniyetHesapla,
  mezKuralNormalize,
  mezGecerliNotlar,
  mezNotDuzelt,
  mezSilinmeSiniflandir,
  mezProgramlar,
  mezProgramAdi,
  mezDersProgramda,
  mezNorm,
} from './lib/mezuniyet.js';
import { mezuniyetFormunuDoldur, bolumBasligi } from './lib/mezuniyet-form-doldur.js';
import {
  onerileriNormalize,
  oneriKarari,
  oneriKimligi,
  kabulEdilenOneriler,
  eslesmeleriUygula,
} from './lib/mezuniyet-eslestirme.js';
import { R, dugme, GIRDI, BilgiNotu, GeriDon, BolumKarti } from './mezuniyet-ui.jsx';
import MezuniyetKurallari from './mezuniyet-kurallari.jsx';

const { useState, useEffect, useMemo, useCallback } = React;

const KART = {
  background: '#FFFFFF',
  border: '1px solid ' + R.kenar,
  borderRadius: 14,
  padding: 18,
  marginBottom: 16,
};
const BASLIK = { fontSize: 14.5, fontWeight: 800, color: R.navy, margin: '0 0 12px' };
const ETIKET = {
  display: 'block',
  fontSize: 11,
  fontWeight: 700,
  color: R.soluk,
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
  marginBottom: 5,
};

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

/** Statü: transkriptte yazan (Z/S…) önce, yoksa müfredattaki. */
function statuMetni(r) {
  const t = metin(r && (r.statuTranskript || r.statu)).toLocaleUpperCase('tr-TR');
  if (!t) return '';
  if (t === 'Z' || t.indexOf('ZORUNLU') === 0) return 'Zorunlu';
  if (t === 'S' || t.indexOf('SEÇMELİ') === 0 || t.indexOf('SECMELI') === 0) return 'Seçmeli';
  return metin(r.statuTranskript || r.statu);
}

// Danışmanın tiklediği ders, dilekçenin ders tablosundaki sütunlarla saklanır:
// DERSİN KODU VE ADI · EĞİTİM-ÖĞRETİM YILI · YARIYIL · AKTS · STATÜSÜ.
function silinecekDers(r) {
  return {
    kod: r.kod,
    ad: r.ad,
    akts: r.akts,
    not: r.not,
    yil: metin(r.yil),
    yariyil: metin(r.yariyil) || (r.mufredatYariyil ? r.mufredatYariyil + '. yarıyıl' : ''),
    statu: statuMetni(r),
  };
}

function hesapla(basvuru, mufredat, kural) {
  const ham = (basvuru && Array.isArray(basvuru.dersler) ? basvuru.dersler : []).map((d) => ({
    kod: d.kod,
    ad: d.ad,
    akts: d.akts,
    not: mezNotDuzelt(d.not, d.puan, kural).not,
    yil: d.yil,
    yariyil: d.yariyil,
    statu: d.statu,
    esdeger: d.esdeger,
  }));
  // Danışmanın kabul ettiği eşleştirme önerileri (kodu/adı farklı dersler).
  const dersler = eslesmeleriUygula(ham, kabulEdilenOneriler(basvuru));
  if (dersler.length === 0) return null;
  return mezuniyetHesapla(mufredat, dersler, kural, {
    agno: basvuru.agno,
    transkriptAkts: basvuru.transkriptAkts,
    // Öğrencinin müfredatı: yalnız o müfredatın dersleri aranır.
    program: basvuru.program,
  });
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

// ── DİLEKÇE ÜRETİMİ ──
// 1) Formlar'daki kurumun mezuniyet dilekçesi (.docx) OLDUĞU GİBİ doldurulur
//    (lib/mezuniyet-form-doldur.js — satır/sütun eklenmez).
// 2) Form yoksa ya da Word değilse yerleşik PDF (lib/mezuniyet-pdf.js).
// Sonuç önce ÖNİZLENİR, öğrenci onaylayınca iner.
function formVerisi(b) {
  const il = b.iletisim || {};
  const bolum = metin(il.bolum) || metin(b.bolumAdi);
  return {
    adSoyad: metin(il.adSoyad) || metin(b.ogrenciAd),
    ogrenciNo: metin(b.ogrenciNo),
    bolum,
    telefon: metin(il.telefon),
    adres: metin(il.adres),
    eposta: metin(il.eposta),
    bolumBaslik: bolumBasligi(bolum),
    silmeBeyani: metin(b.silmeBeyani),
    ogretimYili: metin(b.mezuniyetDonemi && b.mezuniyetDonemi.ogretimYili),
    donem: metin(b.mezuniyetDonemi && b.mezuniyetDonemi.donem),
    dersler: b.silmeBeyani === 'var' ? silinecekDersleriBirlestir(b) : [],
  };
}

const ALAN_ADLARI = {
  adSoyad: 'Adı ve Soyadı',
  ogrenciNo: 'Öğrenci No',
  bolum: 'Bölümü',
  telefon: 'Telefon',
  adres: 'Adres',
  eposta: 'e-posta',
  beyan: 'beyan kutusu',
  donem: '“… öğretim yılı … dönemi” boşlukları',
};

function yetkiBasligi() {
  const token = localStorage.getItem('caku_auth_token');
  return token ? { Authorization: 'Bearer ' + token } : {};
}

export async function dilekceUret(basvuru, kurumFormu) {
  const b = basvuru || {};
  const ad = 'Mezuniyet_Dilekcesi_' + dosyaParcasi(b.ogrenciNo + '_' + b.ogrenciAd);
  const uyarilar = [];
  const v = formVerisi(b);
  const docxMi = kurumFormu && /\.docx$/i.test(metin(kurumFormu.dosyaAdi) || metin(kurumFormu.url));
  if (docxMi) {
    try {
      const r = await fetch(kurumFormu.url, { credentials: 'include', headers: yetkiBasligi() });
      if (!r.ok) throw new Error('form indirilemedi (HTTP ' + r.status + ')');
      // Word dosyası (zip) tarayıcıda açılır; sistemin geri kalanıyla aynı JSZip.
      if (!window.JSZip) {
        await new Promise((tamam, hata) => {
          const sc = document.createElement('script');
          sc.src = 'https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js';
          sc.onload = tamam;
          sc.onerror = () => hata(new Error('Word okuyucu yüklenemedi'));
          document.head.appendChild(sc);
        });
      }
      const zip = await window.JSZip.loadAsync(await r.arrayBuffer());
      const dosya = zip.file('word/document.xml');
      if (!dosya) throw new Error('Word belgesi okunamadı');
      const s = mezuniyetFormunuDoldur(await dosya.async('string'), v);
      zip.file('word/document.xml', s.xml);
      const docx = await zip.generateAsync({
        type: 'blob',
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      });
      // Dilekçe YALNIZ salt okunur PDF olarak çıkar: sunucu (LibreOffice)
      // düzenleme ve kopyalama izni kapalı PDF üretir. Word inmez.
      const y = await fetch('/api/files/docx-pdf?saltOkunur=1', {
        method: 'POST',
        credentials: 'include',
        headers: Object.assign(
          {
            'Content-Type':
              'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          },
          yetkiBasligi()
        ),
        body: docx,
      });
      if (!y.ok) {
        const j = await y.json().catch(() => ({}));
        throw new Error(j.error || 'sunucu PDF üretemedi (HTTP ' + y.status + ')');
      }
      const blob = await y.blob();
      if (s.bulunamayan.length) {
        uyarilar.push(
          'Formda şu alanların yeri bulunamadı, çıktıda elle doldurun: ' +
            s.bulunamayan.map((k) => ALAN_ADLARI[k] || k).join(', ') +
            '.'
        );
      }
      if (v.dersler.length && !s.dersTablosu) {
        uyarilar.push('Formda “DERSİN KODU VE ADI” tablosu bulunamadı; dersleri elle yazın.');
      }
      if (s.sigmayan.length) {
        uyarilar.push(
          'Formun ders tablosunda yeterli boş satır yok; şu dersleri elle ekleyin: ' +
            s.sigmayan.map((d) => metin(d.kod) + ' ' + metin(d.ad)).join(', ') +
            '.'
        );
      }
      return { blob, ad: ad + '.pdf', tur: 'pdf', kaynak: 'form', uyarilar };
    } catch (e) {
      uyarilar.push(
        'Kurumun formu doldurulamadı (' +
          ((e && e.message) || 'Word okuyucu yüklenemedi; bağlantınızı kontrol edin') +
          '); yerleşik dilekçe hazırlandı.'
      );
    }
  } else if (kurumFormu) {
    uyarilar.push(
      'Formlar’daki mezuniyet dilekçesi Word (.docx) değil, doldurulamıyor; yerleşik dilekçe hazırlandı.'
    );
  } else {
    uyarilar.push('Formlar’da mezuniyet dilekçesi bulunamadı; yerleşik dilekçe hazırlandı.');
  }
  const [PDFLib, fontkitMod, P, fN, fK] = await Promise.all([
    import('pdf-lib'),
    import('@pdf-lib/fontkit'),
    import('./lib/mezuniyet-pdf.js'),
    fetch('/yazitipi/DejaVuSans-tr.ttf').then((r) => r.arrayBuffer()),
    fetch('/yazitipi/DejaVuSans-Bold-tr.ttf').then((r) => r.arrayBuffer()),
  ]);
  const bayt = await P.mezuniyetPdfOlustur({
    basvuru: b,
    PDFLib,
    fontkit: fontkitMod.default || fontkitMod,
    fontNormal: fN,
    fontKalin: fK,
  });
  // Yerleşik PDF de salt okunur iner: sunucu düzenleme iznini kapatır.
  // Kilitlenemezse dilekçe verilmez — düzenlenebilir belge çıkmasın.
  const k = await fetch('/api/files/pdf-kilitle', {
    method: 'POST',
    credentials: 'include',
    headers: Object.assign({ 'Content-Type': 'application/pdf' }, yetkiBasligi()),
    body: new Blob([bayt], { type: 'application/pdf' }),
  });
  if (!k.ok) {
    const j = await k.json().catch(() => ({}));
    throw new Error(
      'Dilekçe salt okunur PDF olarak hazırlanamadı' +
        (j.error ? ' (' + j.error + ')' : '') +
        '. Bölüm sekreterliğine ya da sistem yöneticisine bildirin.'
    );
  }
  return {
    blob: await k.blob(),
    ad: ad + '.pdf',
    tur: 'pdf',
    kaynak: 'yerlesik',
    uyarilar,
  };
}

/** Önizleme penceresi: inecek PDF'in KENDİSİ gösterilir, sonra indirilir. */
function DilekceOnizleme({ sonuc, onKapat }) {
  const [pdfUrl, setPdfUrl] = useState('');

  useEffect(() => {
    const url = URL.createObjectURL(sonuc.blob);
    setPdfUrl(url);
    const once = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = once;
      URL.revokeObjectURL(url);
    };
  }, [sonuc]);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 3000,
        background: 'rgba(15,23,42,0.55)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
    >
      <div
        style={{
          background: 'white',
          borderRadius: 16,
          width: 'min(980px, 100%)',
          maxHeight: '94vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            padding: '14px 18px',
            borderBottom: '1px solid ' + R.kenar,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <b style={{ fontSize: 15, color: R.navy, flex: 1 }}>Dilekçe önizlemesi</b>
          <span style={{ fontSize: 12, color: R.soluk }}>
            {sonuc.kaynak === 'form' ? 'Kurumun formu · salt okunur PDF' : 'Yerleşik dilekçe · PDF'}
          </span>
        </div>
        {sonuc.uyarilar.length > 0 && (
          <div style={{ padding: '10px 18px 0' }}>
            {sonuc.uyarilar.map((u) => (
              <BilgiKutusu key={u} tur="uyari">
                {u}
              </BilgiKutusu>
            ))}
          </div>
        )}
        <div style={{ flex: 1, overflow: 'auto', background: '#E5E7EB', minHeight: 320 }}>
          {pdfUrl && (
            <iframe
              title="Dilekçe önizlemesi"
              src={pdfUrl}
              style={{ width: '100%', height: '75vh', border: 0 }}
            />
          )}
        </div>
        <div
          style={{
            padding: '12px 18px',
            borderTop: '1px solid ' + R.kenar,
            display: 'flex',
            gap: 8,
            justifyContent: 'flex-end',
            flexWrap: 'wrap',
          }}
        >
          <button type="button" onClick={onKapat} style={dugme('ikincil')}>
            Kapat
          </button>
          <button
            type="button"
            onClick={() => blobIndir(sonuc.blob, sonuc.ad)}
            style={dugme('birincil')}
          >
            PDF olarak indir
          </button>
        </div>
      </div>
    </div>
  );
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
  const aktif = durum ? adimSirasi(durum) : 0;
  const bitti = durum === 'tamamlandi';
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        background: 'white',
        border: '1px solid ' + R.kenar,
        borderRadius: 14,
        padding: '16px 12px',
        marginBottom: 16,
        overflowX: 'auto',
      }}
    >
      {MEZ_ADIMLAR.map((a, i) => {
        const gecildi = i < aktif || bitti;
        const simdi = i === aktif && !bitti;
        const renk = gecildi ? R.yesil : simdi ? R.turuncu : '#B6BBC2';
        return (
          <div
            key={a.id}
            style={{ flex: '1 1 0', minWidth: 96, position: 'relative', textAlign: 'center' }}
          >
            {i > 0 && (
              <span
                style={{
                  position: 'absolute',
                  top: 14,
                  right: '50%',
                  width: '100%',
                  height: 2,
                  background: i <= aktif || bitti ? R.yesil : R.kenar,
                }}
              />
            )}
            <span
              style={{
                position: 'relative',
                zIndex: 1,
                width: 30,
                height: 30,
                margin: '0 auto',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 13,
                fontWeight: 800,
                color: gecildi || simdi ? 'white' : R.soluk,
                background: gecildi ? R.yesil : simdi ? R.turuncu : 'white',
                border: '2px solid ' + renk,
                boxShadow: simdi ? '0 0 0 4px ' + R.turuncuAcik : 'none',
              }}
            >
              {gecildi ? '✓' : i + 1}
            </span>
            <div
              style={{
                marginTop: 7,
                fontSize: 12,
                fontWeight: simdi ? 800 : 600,
                color: simdi ? R.navy : gecildi ? R.yesil : R.soluk,
                padding: '0 4px',
              }}
            >
              {a.etiket}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** Öğrencinin şu an ne yapması gerektiği — tek cümle. */
const OGRENCI_SIRADAKI = {
  '': 'Transkriptinizi yükleyin; sistem dersleri forma aktarsın.',
  taslak: 'Formunuzu kontrol edin ve danışmanınıza gönderin.',
  iade: 'Danışmanınızın notunu okuyun, gerekiyorsa transkriptinizi yeniden yükleyip tekrar gönderin.',
  danismanda: 'Danışmanınız formunuzu inceliyor; onaylayınca bildirim alacaksınız.',
  dilekce: 'Dilekçenizi hazırlayın, imzalayın ve imzalı hâlini yükleyin.',
  imzali: 'İmzalı dilekçeniz danışmanınızda; belgeleriniz memura iletilecek.',
  memurda: 'Belgeleriniz bölüm memurunda işleniyor.',
  tamamlandi: 'Mezuniyet başvurunuz tamamlandı.',
};
/** Danışmandan beklenen — tek cümle. */
const DANISMAN_SIRADAKI = {
  danismanda:
    'Formu transkriptle karşılaştırın; silinecek dersleri ve eksik stajları işaretleyip onaylayın ya da düzeltme isteyin.',
  dilekce:
    'Öğrenci dilekçesini hazırlıyor. Gerekirse işaretleri güncelleyebilir, not gönderebilirsiniz.',
  imzali: 'İmzalı dilekçeyi kontrol edin; uygunsa transkript ve dilekçeyi memura iletin.',
  iade: 'Öğrencinin düzeltip yeniden göndermesi bekleniyor.',
  memurda: 'Belgeler memura iletildi.',
  tamamlandi: 'Memur işlemi tamamladı.',
};

function SiradakiAdim({ metin: m, rol }) {
  if (!m) return null;
  return (
    <div
      style={{
        display: 'flex',
        gap: 12,
        alignItems: 'center',
        padding: '12px 16px',
        borderRadius: 12,
        background: R.turuncuAcik,
        border: '1px solid #FFD3A6',
        marginBottom: 16,
      }}
    >
      <span
        style={{
          fontSize: 11,
          fontWeight: 800,
          color: 'white',
          background: R.turuncu,
          borderRadius: 999,
          padding: '3px 10px',
          whiteSpace: 'nowrap',
        }}
      >
        {rol === 'danisman' ? 'Sizden beklenen' : 'Sıradaki adım'}
      </span>
      <span style={{ fontSize: 13.5, color: R.metin, fontWeight: 600 }}>{m}</span>
    </div>
  );
}

const BilgiKutusu = BilgiNotu;

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
          <span style={{ fontSize: 11.5, fontWeight: 600, color: R.soluk, marginLeft: 8 }}>
            {sonuc.aktsKaynagi === 'transkript'
              ? 'transkriptteki birikimli tamamlanan AKTS'
              : sonuc.aktsKaynagi === 'hesap-okuma-hatasi'
                ? 'geçilen derslerden hesaplandı — transkriptten okunan toplam (' +
                  sonuc.okunanTranskriptAkts +
                  ') derslerin toplamından küçük, okuma hatası sayıldı'
                : 'geçilen derslerden hesaplandı — transkriptin toplamı okunamadı'}
          </span>
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
          <b>Kalan zorunlu dersler ({sonuc.kalanZorunlu.length}):</b>{' '}
          {sonuc.kalanZorunlu
            .map(
              (c) =>
                c.code +
                ' ' +
                c.name +
                ((c.digerKodlar || []).length
                  ? ' (diğer kodu: ' + c.digerKodlar.join(', ') + ')'
                  : '')
            )
            .join(', ')}
        </div>
      )}
      {(sonuc.benzerleSaglanan || []).length > 0 && (
        <div style={{ marginTop: 6, fontSize: 12, color: R.soluk }} data-benzerle-saglanan>
          <b style={{ color: R.metin }}>Benzer adlı dersle karşılanan zorunlular:</b>{' '}
          {sonuc.benzerleSaglanan
            .map(
              (b) => b.code + ' ' + b.name + ' ← ' + [b.ileKod, b.ileAd].filter(Boolean).join(' ')
            )
            .join('; ')}
          . Danışmanınız bu eşleşmeyi kontrol eder.
        </div>
      )}
      {(sonuc.stajDurumlari || []).length > 0 && (
        <div style={{ marginTop: 6, fontSize: 12, color: R.soluk }} data-staj-durumu>
          <b style={{ color: R.metin }}>Staj durumu:</b>{' '}
          {sonuc.stajDurumlari.map((st) => (
            <span key={st.kod} style={{ marginRight: 12, whiteSpace: 'nowrap' }}>
              <b style={{ color: st.tamam ? R.yesil : '#991B1B' }}>{st.tamam ? '✓' : '✕'}</b>{' '}
              {st.kod} {st.ad} — {st.durumMetni}
            </span>
          ))}
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
function TranskriptTablosu({ sonuc, secim, onSecim, secimKilitli }) {
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
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 820 }}>
          <thead>
            <tr style={{ background: '#F7F7F7', position: 'sticky', top: 0 }}>
              {(secim ? ['Silinecek'] : [])
                .concat([
                  'Kod',
                  'Ders Adı',
                  'Eğitim-Öğretim Yılı',
                  'Yarıyıl',
                  'Statü',
                  'AKTS',
                  'Not',
                  'Durum',
                ])
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
                    // Sonradan geçilen dersin eski denemesi: soluk, sarı değil.
                    color: r.sonradanGecildi && !silinecek ? '#9AA0A6' : undefined,
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
                    {r.sonradanGecildi && (
                      <div style={{ fontSize: 11, color: R.yesil, marginTop: 2 }}>
                        ✓ Sonradan geçildi — önceki deneme
                      </div>
                    )}
                  </td>
                  <td style={{ ...h, width: 96, color: r.yil ? R.metin : '#B6BBC2' }}>
                    {r.yil || '—'}
                  </td>
                  <td style={{ ...h, width: 74, color: r.yariyil ? R.metin : '#B6BBC2' }}>
                    {r.yariyil || '—'}
                  </td>
                  <td style={{ ...h, width: 74 }}>{statuMetni(r) || '—'}</td>
                  <td style={{ ...h, width: 50 }}>{r.akts}</td>
                  <td style={{ ...h, width: 50, fontWeight: 700 }}>{r.not}</td>
                  <td
                    style={{
                      ...h,
                      width: 70,
                      color: r.sonradanGecildi ? '#9AA0A6' : durumRenk[r.durum],
                      fontWeight: 700,
                    }}
                  >
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

/**
 * Mezuniyet formu — SADE görünüm. Transkriptin tamamı yerine yalnız karar
 * gerektiren dersler (lib/mezuniyet.js → mezSilinmeSiniflandir):
 *   silinmesi önerilen · mezuniyete engel · kontrol gerekir.
 * Tam transkript altta kapalı bölümde durur.
 *
 * rol: 'danisman' (işaretler + "önerilenleri işaretle"), 'ogrenci' (bilgi),
 *      'memur' (yalnız tam transkript; işaretlenenler IsaretOzeti'nde).
 */
/** Başvurudaki öneriler, danışman kararıyla birlikte. */
function oneriListesi(b) {
  return onerileriNormalize(b && b.eslesmeOnerileri).map((o) => ({
    ...o,
    karar: oneriKarari(b, o),
  }));
}

const KARAR_ROZETI = {
  bekliyor: { yazi: 'Danışman kararı bekleniyor', renk: '#92400E', zemin: '#FEF3C7' },
  kabul: { yazi: 'Kabul edildi', renk: '#166534', zemin: '#DCFCE7' },
  red: { yazi: 'Reddedildi', renk: '#B91C1C', zemin: '#FEE2E2' },
};

function KararRozeti({ karar }) {
  const k = KARAR_ROZETI[karar] || KARAR_ROZETI.bekliyor;
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '2px 8px',
        borderRadius: 999,
        background: k.zemin,
        color: k.renk,
        fontSize: 11,
        fontWeight: 700,
        whiteSpace: 'nowrap',
      }}
    >
      {k.yazi}
    </span>
  );
}

const dersYazisi = (kod, ad) => [metin(kod), metin(ad)].filter(Boolean).join(' — ');

/**
 * Öğrencinin eşleştirme önerileri. Öğrenci (form aşamasında) geri alabilir,
 * danışman kabul/red eder, diğerleri yalnız görür.
 */
function EslesmeOnerileri({ oneriler, rol, onSil, onKarar, kilitli }) {
  if (!oneriler || oneriler.length === 0) return null;
  const h = { padding: '8px 10px', fontSize: 12.5, borderBottom: '1px solid #EDEDED' };
  const th = { ...h, textAlign: 'left', fontSize: 10.5, color: R.soluk, background: '#F7F7F7' };
  return (
    <div
      data-eslesme-onerileri
      style={{
        border: '1px solid ' + R.kenar,
        borderLeft: '4px solid ' + R.mavi,
        borderRadius: 10,
        marginTop: 12,
        overflow: 'hidden',
      }}
    >
      <div style={{ padding: '10px 14px', background: '#FAFAFA' }}>
        <div style={{ fontWeight: 800, fontSize: 13.5, color: R.metin }}>
          {rol === 'ogrenci' ? 'Eşleştirme önerilerim' : 'Öğrencinin eşleştirme önerileri'} (
          {oneriler.length})
        </div>
        <div style={{ fontSize: 12, color: R.soluk, marginTop: 2 }}>
          {rol === 'danisman'
            ? 'Öğrenci, transkriptindeki bu derslerin müfredatta farklı kod/adla yer aldığını söylüyor. Kabul ettiğiniz eşleşme hesaba hemen yansır.'
            : 'Transkriptteki ders müfredatta farklı kod ya da adla yer alıyor. Hesaba yalnız danışmanın kabul ettiği eşleşmeler girer.'}
        </div>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 640 }}>
          <thead>
            <tr>
              {['Transkriptteki ders', 'Müfredattaki karşılığı', 'Açıklama', 'Durum', ''].map(
                (t, i) => (
                  <th key={i} style={th}>
                    {t}
                  </th>
                )
              )}
            </tr>
          </thead>
          <tbody>
            {oneriler.map((o) => (
              <tr key={o.id}>
                <td style={{ ...h, fontWeight: 600 }}>
                  {dersYazisi(o.transkriptKod, o.transkriptAd)}
                </td>
                <td style={{ ...h, fontWeight: 600, color: R.mavi }}>
                  → {dersYazisi(o.mufredatKod, o.mufredatAd)}
                </td>
                <td style={{ ...h, color: R.soluk, fontSize: 12 }}>{o.aciklama || '—'}</td>
                <td style={h}>
                  <KararRozeti karar={o.karar} />
                </td>
                <td style={{ ...h, whiteSpace: 'nowrap', textAlign: 'right' }}>
                  {rol === 'ogrenci' && onSil && !kilitli && (
                    <button
                      type="button"
                      onClick={() => onSil(o)}
                      style={{ ...dugme('ikincil'), padding: '4px 10px', fontSize: 12 }}
                    >
                      Geri al
                    </button>
                  )}
                  {rol === 'danisman' && onKarar && !kilitli && (
                    <span style={{ display: 'inline-flex', gap: 6 }}>
                      <button
                        type="button"
                        data-eslesme-kabul
                        disabled={o.karar === 'kabul'}
                        onClick={() => onKarar(o, 'kabul')}
                        style={{
                          ...dugme('yesil', o.karar === 'kabul'),
                          padding: '4px 10px',
                          fontSize: 12,
                        }}
                      >
                        Kabul
                      </button>
                      <button
                        type="button"
                        disabled={o.karar === 'red'}
                        onClick={() => onKarar(o, 'red')}
                        style={{
                          ...dugme('tehlike', o.karar === 'red'),
                          padding: '4px 10px',
                          fontSize: 12,
                        }}
                      >
                        Reddet
                      </button>
                    </span>
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

/**
 * Öğrencinin bir satırı eşleştirdiği küçük form.
 *  hedef.tur === 'satir'    → transkript satırı verildi, müfredat dersi seçilir
 *  hedef.tur === 'mufredat' → müfredat dersi verildi, transkript satırı seçilir
 */
function EslestirmeFormu({ hedef, sonuc, mufredat, onKaydet, onIptal }) {
  const [secilen, setSecilen] = useState('');
  const [aciklama, setAciklama] = useState(hedef.aciklama || '');
  const [kaydediliyor, setKaydediliyor] = useState(false);
  const satirMi = hedef.tur === 'satir';

  // Seçenekler: önce en olası olanlar.
  const gruplar = useMemo(() => {
    if (satirMi) {
      const kalan = new Set(
        ((sonuc && sonuc.kalanZorunlu) || []).map((c) => metin(c.code) + '|' + metin(c.name))
      );
      const liste = (mufredat || [])
        .filter((c) => metin(c.code) || metin(c.name))
        .map((c) => ({
          deger: metin(c.code) + '|' + metin(c.name),
          kod: metin(c.code),
          ad: metin(c.name),
        }))
        .sort((a, b) => a.kod.localeCompare(b.kod, 'tr'));
      return [
        ['Geçilmemiş zorunlu dersler', liste.filter((x) => kalan.has(x.deger))],
        ['Diğer müfredat dersleri', liste.filter((x) => !kalan.has(x.deger))],
      ];
    }
    const gorulen = new Set();
    const liste = [];
    ((sonuc && sonuc.kayitlar) || []).forEach((r) => {
      const d = metin(r.kod) + '|' + metin(r.ad);
      if (gorulen.has(d)) return;
      gorulen.add(d);
      liste.push({ deger: d, kod: metin(r.kod), ad: metin(r.ad), disarida: !r.mufredatta });
    });
    return [
      ['Müfredatla eşleşmeyen transkript dersleri', liste.filter((x) => x.disarida)],
      ['Diğer transkript dersleri', liste.filter((x) => !x.disarida)],
    ];
  }, [satirMi, sonuc, mufredat]);

  const kaydet = async () => {
    if (!secilen) return;
    const i = secilen.indexOf('|');
    const kod = secilen.slice(0, i);
    const ad = secilen.slice(i + 1);
    setKaydediliyor(true);
    try {
      await onKaydet(
        satirMi
          ? {
              transkriptKod: hedef.kod,
              transkriptAd: hedef.ad,
              mufredatKod: kod,
              mufredatAd: ad,
              aciklama,
            }
          : {
              transkriptKod: kod,
              transkriptAd: ad,
              mufredatKod: hedef.kod,
              mufredatAd: hedef.ad,
              aciklama,
            }
      );
    } finally {
      setKaydediliyor(false);
    }
  };

  return (
    <div
      data-eslestirme-formu
      style={{
        marginTop: 10,
        padding: 14,
        borderRadius: 10,
        border: '1.5px solid ' + R.mavi,
        background: '#F5F8FF',
      }}
    >
      <div style={{ fontSize: 13, fontWeight: 800, color: R.navy, marginBottom: 4 }}>
        {satirMi ? 'Müfredattaki karşılığını seçin' : 'Transkriptinizdeki karşılığını seçin'}
      </div>
      <div style={{ fontSize: 12.5, color: R.metin, marginBottom: 10 }}>
        {satirMi ? 'Transkriptteki ders: ' : 'Müfredattaki ders: '}
        <b>{dersYazisi(hedef.kod, hedef.ad)}</b>
      </div>
      <select
        value={secilen}
        onChange={(e) => setSecilen(e.target.value)}
        style={{ ...GIRDI, marginBottom: 8 }}
        aria-label="Karşılık gelen ders"
      >
        <option value="">— Ders seçin —</option>
        {gruplar
          .filter((g) => g[1].length > 0)
          .map(([baslik, liste]) => (
            <optgroup key={baslik} label={baslik}>
              {liste.map((x) => (
                <option key={x.deger} value={x.deger}>
                  {dersYazisi(x.kod, x.ad)}
                </option>
              ))}
            </optgroup>
          ))}
      </select>
      <textarea
        value={aciklama}
        onChange={(e) => setAciklama(e.target.value.slice(0, 500))}
        placeholder="Danışmanınıza kısa açıklama (isteğe bağlı) — örn. dersin kodu 2023'te değişti"
        rows={2}
        style={{ ...GIRDI, resize: 'vertical', marginBottom: 10 }}
        aria-label="Açıklama"
      />
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button type="button" onClick={onIptal} style={dugme('ikincil')}>
          Vazgeç
        </button>
        <button
          type="button"
          disabled={!secilen || kaydediliyor}
          onClick={kaydet}
          style={dugme('birincil', !secilen || kaydediliyor)}
          data-eslestirme-oner
        >
          {kaydediliyor ? 'Kaydediliyor…' : 'Danışmana öner'}
        </button>
      </div>
    </div>
  );
}

function TranskriptFormu({
  sonuc,
  secim,
  onSecim,
  onTopluSecim,
  secimKilitli,
  rol,
  oneriler,
  mufredat,
  onOneri,
  onOneriSil,
  onKarar,
  kararKilitli,
}) {
  // Açık eşleştirme formu: { bolum, tur, kod, ad }.
  const [eslestir, setEslestir] = useState(null);
  const [tumuAcik, setTumuAcik] = useState(false);
  const sinif = useMemo(() => (sonuc ? mezSilinmeSiniflandir(sonuc) : null), [sonuc]);
  if (!sonuc || !sinif) return null;
  const oneriVar = (oneriler || []).length > 0;
  const eslestirebilir = rol === 'ogrenci' && !!onOneri;
  // Satırın (transkript) ya da müfredat dersinin önerisi.
  const satirOnerisi = (kod, ad) => (oneriler || []).find((o) => o.id === oneriKimligi(kod, ad));
  const mufredatOnerisi = (kod, ad) =>
    (oneriler || []).find(
      (o) =>
        (metin(kod) && mezNorm(o.mufredatKod) === mezNorm(kod)) ||
        (!metin(kod) && mezNorm(o.mufredatAd) === mezNorm(ad))
    );
  const eslesmeHucresi = (bolum, tur, kod, ad) => {
    const o = tur === 'satir' ? satirOnerisi(kod, ad) : mufredatOnerisi(kod, ad);
    const acik = eslestir && eslestir.bolum === bolum && eslestir.kod === kod && eslestir.ad === ad;
    return (
      <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
        {o && <KararRozeti karar={o.karar} />}
        {eslestirebilir && (
          <button
            type="button"
            data-eslestir
            onClick={() => setEslestir(acik ? null : { bolum, tur, kod, ad })}
            title="Bu ders müfredatta farklı kod ya da adla mı? Eşleştirip danışmanınıza önerin."
            style={{
              ...dugme(acik ? 'birincil' : 'ikincil'),
              padding: '3px 10px',
              fontSize: 11.5,
            }}
          >
            {o ? 'Değiştir' : 'Eşleştir'}
          </button>
        )}
      </span>
    );
  };
  // Eşleştirme sütunu: öğrencide her zaman, diğerlerinde öneri olan tabloda.
  const engelOnerisi = (x) =>
    x.r && !x.r.mufredatta ? satirOnerisi(x.r.kod, x.r.ad) : mufredatOnerisi(x.kod, x.ad);
  const sutunVar = (liste, bul) => eslestirebilir || (oneriVar && liste.some((x) => !!bul(x)));
  const formuGoster = (bolum) =>
    eslestir &&
    eslestir.bolum === bolum && (
      <EslestirmeFormu
        key={bolum + eslestir.kod + eslestir.ad}
        hedef={eslestir}
        sonuc={sonuc}
        mufredat={mufredat}
        onIptal={() => setEslestir(null)}
        onKaydet={async (o) => {
          await onOneri(o);
          setEslestir(null);
        }}
      />
    );
  const anahtar = (r, i) => metin(r.kod) + '|' + metin(r.ad) + '|' + i;
  const danisman = rol === 'danisman' && !!secim;
  const isaretli = (x) => danisman && secim.has(anahtar(x.r, x.i));
  const isaretsizOneri = sinif.silinmeli.filter((x) => !isaretli(x));
  // Danışmanın önerilerin dışında, tam transkriptten işaretledikleri.
  const oneriAnahtarlari = new Set(
    sinif.silinmeli.concat(sinif.kontrol).map((x) => dersGrupAnahtari(x.r))
  );
  const ekIsaretli = danisman
    ? silinecekleriTekille(
        sonuc.kayitlar
          .filter((r, i) => secim.has(anahtar(r, i)) && !oneriAnahtarlari.has(dersGrupAnahtari(r)))
          .map(silinecekDers)
      )
    : [];

  const h = { padding: '8px 10px', fontSize: 12.5, borderBottom: '1px solid #EDEDED' };
  const th = { ...h, textAlign: 'left', fontSize: 10.5, color: R.soluk, background: '#F7F7F7' };
  const Rozet = ({ renk, zemin, children }) => (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '5px 11px',
        borderRadius: 999,
        background: zemin,
        color: renk,
        fontSize: 12.5,
        fontWeight: 700,
      }}
    >
      {children}
    </span>
  );
  const Bolum = ({ baslik, aciklama, renk, children }) => (
    <div
      style={{
        border: '1px solid ' + R.kenar,
        borderLeft: '4px solid ' + renk,
        borderRadius: 10,
        marginTop: 12,
        overflow: 'hidden',
      }}
    >
      <div style={{ padding: '10px 14px', background: '#FAFAFA' }}>
        <div style={{ fontWeight: 800, fontSize: 13.5, color: R.metin }}>{baslik}</div>
        {aciklama && <div style={{ fontSize: 12, color: R.soluk, marginTop: 2 }}>{aciklama}</div>}
      </div>
      <div style={{ overflowX: 'auto' }}>{children}</div>
    </div>
  );
  const DersTablosu = ({ liste, isaretKutusu, bolum }) => {
    const eslesmeSutunu = sutunVar(liste, (x) => satirOnerisi(x.r.kod, x.r.ad));
    return (
      <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 640 }}>
        <thead>
          <tr>
            {(isaretKutusu ? ['Sil'] : [])
              .concat(['Kod', 'Ders Adı', 'Yıl / Yarıyıl', 'Statü', 'AKTS', 'Not', 'Neden'])
              .concat(eslesmeSutunu ? ['Eşleştirme'] : [])
              .map((t) => (
                <th key={t} style={th}>
                  {t}
                </th>
              ))}
          </tr>
        </thead>
        <tbody>
          {liste.map((x) => {
            const r = x.r;
            const k = anahtar(r, x.i);
            const sec = isaretli(x);
            return (
              <tr key={k} style={{ background: sec ? '#FEE2E2' : 'white' }} data-silinme-satiri>
                {isaretKutusu && (
                  <td style={{ ...h, width: 34 }}>
                    <input
                      type="checkbox"
                      checked={sec}
                      disabled={secimKilitli}
                      onChange={(e) => onSecim && onSecim(k, r, e.target.checked)}
                      title="Silinecek olarak işaretle"
                    />
                  </td>
                )}
                <td style={{ ...h, width: 88, fontWeight: 700 }}>{r.kod}</td>
                <td style={{ ...h, textDecoration: sec ? 'line-through' : 'none' }}>{r.ad}</td>
                <td style={{ ...h, width: 130, color: R.soluk }}>
                  {[r.yil, r.yariyil].filter(Boolean).join(' · ') || '—'}
                </td>
                <td style={{ ...h, width: 70 }}>{statuMetni(r) || '—'}</td>
                <td style={{ ...h, width: 44 }}>{r.akts}</td>
                <td style={{ ...h, width: 44, fontWeight: 700, color: R.kirmizi }}>{r.not}</td>
                <td style={{ ...h, color: '#92400E', fontSize: 12 }}>{x.neden}</td>
                {eslesmeSutunu && (
                  <td style={{ ...h, width: 150 }}>
                    {eslesmeHucresi(bolum, 'satir', r.kod, r.ad)}
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    );
  };

  const hicYok =
    sinif.silinmeli.length === 0 && sinif.engel.length === 0 && sinif.kontrol.length === 0;

  return (
    <div data-silinme-ozeti>
      {rol !== 'memur' && (
        <>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <Rozet renk="#B91C1C" zemin="#FEE2E2">
              {sinif.silinmeli.length} ders silinmeli
            </Rozet>
            <Rozet renk="#92400E" zemin="#FEF3C7">
              {sinif.engel.length} zorunlu eksik
            </Rozet>
            <Rozet renk="#475569" zemin="#F1F5F9">
              {sinif.kontrol.length} kontrol gerekir
            </Rozet>
            {danisman && !secimKilitli && isaretsizOneri.length > 0 && onTopluSecim && (
              <button
                type="button"
                style={{ ...dugme('birincil'), marginLeft: 'auto' }}
                onClick={() => onTopluSecim(isaretsizOneri.map((x) => [anahtar(x.r, x.i), x.r]))}
                data-onerileri-isaretle
              >
                Önerilenlerin hepsini işaretle ({isaretsizOneri.length})
              </button>
            )}
          </div>

          {eslestirebilir && !hicYok && (
            <div style={{ fontSize: 12, color: R.soluk, marginTop: 10, lineHeight: 1.5 }}>
              Aşağıdaki bir ders aslında müfredatınızda <b>farklı kod ya da adla</b> yer alıyorsa
              (örn. kodu değişmiş ders) satırdaki <b>Eşleştir</b> düğmesiyle müfredattaki
              karşılığını seçip danışmanınıza önerin. Hesaba danışman kabul edince girer.
            </div>
          )}

          <EslesmeOnerileri
            oneriler={oneriler}
            rol={rol}
            onSil={onOneriSil}
            onKarar={onKarar}
            kilitli={rol === 'danisman' ? kararKilitli : !onOneriSil}
          />

          {hicYok && (
            <div
              style={{
                marginTop: 12,
                padding: '12px 14px',
                borderRadius: 10,
                background: R.yesilAcik,
                color: R.yesil,
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              Silinmesi gereken ders yok; zorunlu derslerin tamamı geçilmiş görünüyor.
            </div>
          )}

          {sinif.silinmeli.length > 0 && (
            <Bolum
              renk={R.kirmizi}
              baslik="Silinmesi önerilen dersler"
              aciklama={
                danisman
                  ? 'Başarısız ve sonradan geçilmemiş seçmeli dersler ile yerine kodu/adı değişmiş benzer bir dersin geçildiği dersler. Karar sizindir; işaretlediğiniz dersler dilekçeye gider.'
                  : 'Başarısız ve sonradan geçilmemiş seçmeli dersler ile yerine benzer bir dersin geçildiği dersler. Hangilerinin silineceğine danışmanınız karar verir.'
              }
            >
              <DersTablosu liste={sinif.silinmeli} isaretKutusu={danisman} bolum="silinmeli" />
            </Bolum>
          )}
          {formuGoster('silinmeli')}

          {sinif.engel.length > 0 && (
            <Bolum
              renk={R.sariKenar}
              baslik="Mezuniyete engel — zorunlu dersler"
              aciklama="Zorunlu ders silinemez; geçilmesi gerekir."
            >
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 480 }}>
                <thead>
                  <tr>
                    {['Kod', 'Ders Adı', 'Durum']
                      .concat(sutunVar(sinif.engel, engelOnerisi) ? ['Eşleştirme'] : [])
                      .map((t) => (
                        <th key={t} style={th}>
                          {t}
                        </th>
                      ))}
                  </tr>
                </thead>
                <tbody>
                  {sinif.engel.map((x) => (
                    <tr key={'e' + x.kod + x.ad}>
                      <td style={{ ...h, width: 88, fontWeight: 700 }}>{x.kod}</td>
                      <td style={h}>{x.ad}</td>
                      <td style={{ ...h, color: '#92400E', fontWeight: 600 }}>{x.neden}</td>
                      {sutunVar(sinif.engel, engelOnerisi) && (
                        <td style={{ ...h, width: 150 }}>
                          {/* Müfredatta olmayan kalınmış zorunlu ders bir transkript
                              satırıdır; diğerleri müfredat dersidir. */}
                          {x.r && !x.r.mufredatta
                            ? eslesmeHucresi('engel', 'satir', x.r.kod, x.r.ad)
                            : eslesmeHucresi('engel', 'mufredat', x.kod, x.ad)}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </Bolum>
          )}
          {formuGoster('engel')}

          {sinif.kontrol.length > 0 && (
            <Bolum
              renk="#94A3B8"
              baslik="Kontrol gerekir"
              aciklama="Notu tanınmayan ya da zorunlu/seçmeli olduğu bilinmeyen başarısız dersler. Transkript PDF’iyle karşılaştırın."
            >
              <DersTablosu liste={sinif.kontrol} isaretKutusu={danisman} bolum="kontrol" />
            </Bolum>
          )}
          {formuGoster('kontrol')}

          {ekIsaretli.length > 0 && (
            <Bolum
              renk={R.navy}
              baslik="Ayrıca işaretlediğiniz dersler"
              aciklama="Önerilerin dışında, tam transkriptten işaretlendi."
            >
              <div style={{ padding: '8px 14px', fontSize: 13 }}>
                {ekIsaretli.map((d) => (
                  <div key={dersAnahtari(d)} style={{ padding: '3px 0' }}>
                    <b>{d.kod}</b> {d.ad}
                  </div>
                ))}
              </div>
            </Bolum>
          )}
        </>
      )}

      <div style={{ marginTop: rol === 'memur' ? 0 : 14 }}>
        <button
          type="button"
          onClick={() => setTumuAcik((v) => !v)}
          style={{ ...dugme('ikincil'), width: '100%', justifyContent: 'space-between' }}
          aria-expanded={tumuAcik}
          data-tum-transkript
        >
          <span>
            {tumuAcik ? 'Tam transkripti gizle' : 'Tam transkripti göster'} ({sonuc.kayitlar.length}{' '}
            ders)
          </span>
          <span>{tumuAcik ? '▴' : '▾'}</span>
        </button>
        {tumuAcik && (
          <div style={{ marginTop: 10 }}>
            <TranskriptTablosu
              sonuc={sonuc}
              secim={danisman ? secim : undefined}
              onSecim={onSecim}
              secimKilitli={secimKilitli}
            />
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Başvuru özeti — durum, danışman, önemli tarihler, belgeler ve geçmiş tek
 * kartta. Öğrenci ve danışman aynı kartı görür (danışmanda öğrencinin adı
 * başlıktadır).
 */
function BasvuruOzeti({ b, rol }) {
  const [gecmisAcik, setGecmisAcik] = useState(false);
  if (!b) return null;
  const durum = b.durum || 'taslak';
  const sil = silinecekleriTekille(b.silinecekDersler);
  const staj = b.eksikStajlar || [];
  const akts = metin(b.transkriptAkts) || metin(b.ozet && b.ozet.gecilenAkts);
  const bilgiler = [
    rol === 'danisman' ? null : ['Danışman', metin(b.danisman) || '—'],
    ['Tamamlanan AKTS', akts ? akts + ' AKTS' : '—'],
    b.program ? ['Müfredat', mezProgramAdi(b.program) || b.program] : null,
    ['GNO', metin(b.agno) || '—'],
    ['Silinecek ders', sil.length ? sil.length + ' ders' : 'yok'],
    ['Eksik staj', staj.length ? staj.join(', ') : 'yok'],
  ].filter(Boolean);
  const tarihler = [
    ['Danışmana gönderildi', b.gonderimTarihi],
    ['Danışman kararı', b.danismanKarariTarihi],
    ['İmzalı dilekçe gönderildi', b.imzaTarihi],
    ['Memura iletildi', b.memuraIletim && b.memuraIletim.tarih],
    ['İşlem tamamlandı', b.tamamlanmaTarihi],
  ].filter((x) => x[1]);
  const gecmis = (b.gecmis || []).slice().reverse();
  const etiket = { fontSize: 11, color: R.soluk, fontWeight: 600, marginBottom: 2 };
  const deger = { fontSize: 13.5, color: R.metin, fontWeight: 700 };
  return (
    <div style={{ ...KART, padding: 0, overflow: 'hidden' }}>
      <div
        style={{
          display: 'flex',
          gap: 12,
          alignItems: 'center',
          flexWrap: 'wrap',
          padding: '16px 20px',
          borderBottom: '1px solid ' + R.kenar,
        }}
      >
        <div style={{ flex: '1 1 260px', minWidth: 0 }}>
          <div style={{ fontSize: 16, fontWeight: 800, color: R.navy }}>
            {rol === 'danisman' ? b.ogrenciAd || b.ogrenciNo : 'Mezuniyet başvurum'}
          </div>
          <div style={{ fontSize: 12.5, color: R.soluk, marginTop: 2 }}>
            {rol === 'danisman'
              ? [b.ogrenciNo, b.bolumAdi, b.sinif ? 'Sınıf ' + b.sinif : '']
                  .filter(Boolean)
                  .join(' · ')
              : 'Son güncelleme: ' + trTarih(b.updatedAt)}
          </div>
        </div>
        <DurumRozeti durum={durum} />
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
          gap: 14,
          padding: '14px 20px',
        }}
      >
        {bilgiler.map(([e, v]) => (
          <div key={e}>
            <div style={etiket}>{e}</div>
            <div style={deger}>{v}</div>
          </div>
        ))}
      </div>

      {tarihler.length > 0 && (
        <div
          style={{
            display: 'flex',
            gap: 8,
            flexWrap: 'wrap',
            padding: '0 20px 14px',
          }}
        >
          {tarihler.map(([e, t]) => (
            <span
              key={e}
              style={{
                fontSize: 12,
                padding: '4px 10px',
                borderRadius: 999,
                background: '#F5F6F7',
                color: R.soluk,
              }}
            >
              {e}: <b style={{ color: R.metin }}>{trTarih(t)}</b>
            </span>
          ))}
        </div>
      )}

      {durum === 'tamamlandi' && metin(b.memurNotu) && (
        <div style={{ padding: '0 20px 14px' }}>
          <BilgiKutusu tur="basari">Memur notu: {b.memurNotu}</BilgiKutusu>
        </div>
      )}

      <div
        style={{
          display: 'flex',
          gap: 8,
          flexWrap: 'wrap',
          alignItems: 'center',
          padding: '12px 20px',
          background: '#FAFAFB',
          borderTop: '1px solid ' + R.kenar,
        }}
      >
        <span style={{ fontSize: 12, fontWeight: 700, color: R.soluk, marginRight: 4 }}>
          Belgeler
        </span>
        {b.transkriptUrl ? (
          <BelgeSatiri etiket="Transkript" belge={{ url: b.transkriptUrl }} />
        ) : (
          <span style={{ fontSize: 12, color: R.soluk }}>Transkript yüklenmedi</span>
        )}
        <BelgeSatiri etiket="İmzalı mezuniyet dilekçesi" belge={b.imzaliDilekce} />
        <BelgeSatiri etiket="İmzalı ders sildirme dilekçesi" belge={b.imzaliSildirme} />
        {gecmis.length > 0 && (
          <button
            type="button"
            onClick={() => setGecmisAcik((v) => !v)}
            style={{
              marginLeft: 'auto',
              border: 'none',
              background: 'transparent',
              color: R.mavi,
              fontWeight: 700,
              fontSize: 12.5,
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            {gecmisAcik ? 'Geçmişi gizle' : 'Başvuru geçmişi (' + gecmis.length + ')'}
          </button>
        )}
      </div>

      {gecmisAcik && (
        <div style={{ padding: '10px 20px 16px', borderTop: '1px solid ' + R.kenar }}>
          {gecmis.map((g, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                gap: 12,
                fontSize: 12.5,
                padding: '6px 0',
                borderBottom: i < gecmis.length - 1 ? '1px dashed #E5E7EB' : 'none',
              }}
            >
              <span style={{ color: R.soluk, minWidth: 130 }}>
                {g.tarih ? new Date(g.tarih).toLocaleString('tr-TR') : ''}
              </span>
              <span style={{ flex: 1, color: R.metin }}>{g.olay}</span>
              <span style={{ color: R.soluk }}>
                {g.yapan}
                {g.rol
                  ? ' · ' +
                    ({ ogrenci: 'öğrenci', danisman: 'danışman', memur: 'memur' }[g.rol] || g.rol)
                  : ''}
              </span>
            </div>
          ))}
        </div>
      )}
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
  const sil = silinecekleriTekille(basvuru && basvuru.silinecekDersler);
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
// Notun ipucu bölümün ölçeğinden kurulur: "AA/BA/CC gibi" yazan sabit ipucu
// okuyucuyu eski iki harfli sisteme yöneltiyor, "B2"yi "B" diye getiriyordu.
function transkriptSutunlari(kural) {
  const notlar = mezGecerliNotlar(kural);
  return [
    { id: 'kod', label: 'Ders Kodu', hint: 'örn. BLM101; transkriptte yazdığı gibi' },
    { id: 'ad', label: 'Ders Adı' },
    {
      id: 'akts',
      label: 'AKTS',
      hint: 'yalnız sayı; "Kredi | AKTS" sütununda "6 | 5" yazıyorsa çizgiden SONRAKİ sayı (5)',
    },
    {
      id: 'not',
      label: 'Harf Notu (HBN)',
      hint: (
        'Harf notu (HBN sütunu), RAKAMIYLA ve yazdığı gibi: B2, C3, F1, BŞ ("B2"yi "B" yapma). ' +
        'Geçerli: ' +
        notlar.join(', ')
      ).slice(0, 240),
    },
    {
      id: 'puan',
      label: 'Yüzlük Not',
      hint: 'dersin 0-100 arası sayısal notu (başarı puanı) varsa; yoksa boş bırak',
    },
    {
      id: 'yil',
      label: 'Eğitim-Öğretim Yılı',
      hint: 'dersin alındığı dönemin başlığındaki yıl, örn. 2022-2023',
    },
    { id: 'yariyil', label: 'Yarıyıl', hint: 'dersin alındığı dönem: Güz, Bahar ya da Yaz' },
    {
      id: 'statu',
      label: 'Statü',
      hint: 'Zorunlu ya da Seçmeli (transkriptte Z/S); yoksa boş bırak',
    },
    {
      // Kodu değişmiş ders: "BM498 … Açıklama: 2025 - Bahar : BİL494".
      id: 'esdeger',
      label: 'Yerine Sayılan Ders Kodu',
      hint: 'Açıklama sütununda bir ders kodu varsa yalnız o kod (örn. "2025 - Bahar : BİL494" → BİL494); yoksa boş',
    },
  ];
}
const TRANSKRIPT_UST_BILGI = [
  {
    id: 'agno',
    label: 'GNO / AGNO',
    hint: 'genel not ortalaması; EN SON dönemin "Birikimli" satırındaki GNO, örn. 2,39',
  },
  { id: 'sinif', label: 'Sınıf', hint: 'yalnız rakam' },
  {
    id: 'tamamlananAkts',
    label: 'Birikimli Tamamlanan AKTS',
    hint: 'EN SON dönemin (yaz okulu dahil, belgenin en altındaki) "Birikimli" satırındaki "Tamamlanan Kredi | AKTS" değerinin AKTS kısmı ("145 | 238" ise 238). "Yıllık" satırını ALMA; yalnız sayı',
  },
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
  // Dilekçenin kimlik bilgileri: sistemden gelir, gelmeyeni öğrenci yazar.
  const [iletisim, setIletisim] = useState({
    adSoyad: '',
    bolum: '',
    telefon: '',
    eposta: '',
    adres: '',
  });
  // Dilekçedeki iki kutudan hangisi: 'yok' (silinecek dersim yok) | 'var'.
  const [silmeBeyani, setSilmeBeyani] = useState('');
  // "… öğretim yılı … dönemi" ve silinecek dersin eksik yıl/yarıyıl/statüsü.
  const [donemBilgisi, setDonemBilgisi] = useState({ ogretimYili: '', donem: '' });
  const [silinecekEk, setSilinecekEk] = useState({});
  // Form aşaması geçtikten sonra transkript formu katlı durur (dilekçe öne çıksın).
  const [formAcik, setFormAcik] = useState(false);
  const [onizleme, setOnizleme] = useState(null);
  const [kurumFormu, setKurumFormu] = useState(null);
  const [eskiKayit, setEskiKayit] = useState(null);
  // Öğrencinin müfredatı (bölümde birden çok müfredat varsa seçilir).
  const [program, setProgram] = useState('');
  const programlar = useMemo(() => mezProgramlar(kural || {}), [kural]);
  const programSecimiGerekli = programlar.length > 1;

  const yenile = useCallback(async () => {
    const b = await basvuruOku(ogrNo);
    setBasvuru(b);
    if (b && b.program) setProgram(b.program);
    if (b && b.iletisim) setIletisim((x) => ({ ...x, ...b.iletisim }));
    if (b && b.mezuniyetDonemi) setDonemBilgisi((x) => ({ ...x, ...b.mezuniyetDonemi }));
    if (b && b.silinecekEk) setSilinecekEk(b.silinecekEk);
    if (b) {
      setSilmeBeyani(
        (s) => metin(b.silmeBeyani) || s || ((b.silinecekDersler || []).length > 0 ? 'var' : '')
      );
    }
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
          adSoyad: x.adSoyad || metin(currentUser?.name || ben.name || ben.adSoyad),
          bolum: x.bolum || bolumAdi,
          telefon: x.telefon || metin(ben.phone || ben.telefon),
          eposta: x.eposta || metin(ben.email || currentUser?.email),
          adres: x.adres || metin(ben.address || ben.adres),
        }));
        // Kurumun mezuniyet dilekçesi (Formlar). Öğrencinin bölümüne ait ve
        // Word (.docx) olan öncelikli: doldurulabilen yalnız odur.
        const adaylar = (formlar || []).filter(
          (x) =>
            (x.dosyaURL || x.url) &&
            /mezuniyet/.test(String(x.baslik || x.title || '').toLocaleLowerCase('tr-TR'))
        );
        const puan = (x) =>
          (/\.docx$/i.test(metin(x.dosyaAdi) || metin(x.dosyaURL || x.url)) ? 2 : 0) +
          (vset.has(String(x.departmentId || '')) ? 1 : 0);
        const f = adaylar.sort((a, c) => puan(c) - puan(a))[0];
        if (f) {
          setKurumFormu({
            url: f.dosyaURL || f.url,
            ad: f.baslik || f.title,
            dosyaAdi: f.dosyaAdi || '',
          });
        }
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
          sutunlar: transkriptSutunlari(kural),
          satirTanimi:
            'transkriptte yer alan her ders satırı — bütün dönemler (yaz okulu dahil) ve son sayfa dahil',
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
      const kesildi = ((satirSonuc && satirSonuc.hatalar) || []).some(
        (h) => h && h.reason === 'satir-tavani'
      );
      const ust = (ustSonuc && ustSonuc.data) || {};
      const dersler = satirlar
        .map((s) => ({
          kod: metin(s.kod),
          ad: metin(s.ad),
          akts: metin(s.akts).replace(/[^\d]/g, ''),
          // Bozuk okunan not ("C-3", rakamı düşmüş "B") ölçeğe oturtulur;
          // yüzlük puan okunduysa harf ondan hesaplanır (lib/mezuniyet.js).
          not: mezNotDuzelt(s.not, s.puan, kural).not,
          puan: metin(s.puan),
          yil: metin(s.yil),
          yariyil: metin(s.yariyil),
          statu: metin(s.statu),
          esdeger: metin(s.esdeger).toLocaleUpperCase('tr-TR'),
        }))
        .filter((d) => d.kod || d.ad);
      const taslak = {
        dersler,
        agno: metin(ust.agno && ust.agno.deger),
        // Transkriptin resmî birikimli tamamlanan AKTS'i (hesap bunu esas alır).
        transkriptAkts: metin(ust.tamamlananAkts && ust.tamamlananAkts.deger).replace(
          /[^\d,.]/g,
          ''
        ),
        sinif: metin(ust.sinif && ust.sinif.deger),
        transkriptUrl: yuklenen.url,
        transkriptAdi: yuklenen.ad,
        transkriptTarihi: yuklenen.tarih,
        ...(program ? { program } : {}),
      };
      const s = hesapla(taslak, mufredat, kural);
      await formuKaydet({ ...taslak, ozet: ozetCikar(s) }, 'Transkript yüklendi ve tarandı');
      setDosya(null);
      setMesaj({
        tur: kesildi ? 'uyari' : 'basari',
        metin: kesildi
          ? dersler.length +
            ' ders forma aktarıldı, ancak transkript çok uzun olduğu için bazı satırlar alınamadı. Danışmanınıza bildirin.'
          : dersler.length + ' ders forma aktarıldı. Kontrol edip danışmanınıza gönderin.',
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
        ...(program ? { program } : {}),
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

  const programSec = async (id) => {
    setProgram(id);
    if (!basvuru) return; // transkript yüklenince taslakla birlikte yazılır
    setCalisiyor('program');
    setMesaj({ tur: '', metin: '' });
    try {
      const yeni = { ...basvuru, program: id };
      await formuKaydet(
        { program: id, ozet: ozetCikar(hesapla(yeni, mufredat, kural)) },
        'Müfredat seçildi: ' + (mezProgramAdi(id) || id)
      );
    } catch (e) {
      setMesaj({ tur: 'hata', metin: e.message });
    } finally {
      setCalisiyor('');
    }
  };

  // Öğrencinin eşleştirme önerisi: transkript satırı ↔ müfredat dersi.
  const oneriKaydet = async (o) => {
    setMesaj({ tur: '', metin: '' });
    try {
      const id = oneriKimligi(o.transkriptKod, o.transkriptAd);
      const yeni = onerileriNormalize(
        onerileriNormalize(basvuru && basvuru.eslesmeOnerileri)
          .filter((x) => x.id !== id)
          .concat([{ ...o, tarih: new Date().toISOString() }])
      );
      await formuKaydet(
        { eslesmeOnerileri: yeni },
        'Eşleştirme önerildi: ' +
          [o.transkriptKod || o.transkriptAd, o.mufredatKod || o.mufredatAd].join(' → ')
      );
      setMesaj({
        tur: 'basari',
        metin: 'Eşleştirme öneriniz kaydedildi; formu gönderdiğinizde danışmanınız karar verir.',
      });
    } catch (e) {
      setMesaj({ tur: 'hata', metin: e.message });
      throw e;
    }
  };
  const oneriSil = async (o) => {
    try {
      await formuKaydet(
        {
          eslesmeOnerileri: onerileriNormalize(basvuru && basvuru.eslesmeOnerileri).filter(
            (x) => x.id !== o.id
          ),
        },
        'Eşleştirme önerisi geri alındı: ' + (o.transkriptKod || o.transkriptAd)
      );
    } catch (e) {
      setMesaj({ tur: 'hata', metin: e.message });
    }
  };
  const ogrenciMufredati = useMemo(
    () => (mufredat || []).filter((c) => mezDersProgramda(c, basvuru && basvuru.program)),
    [mufredat, basvuru && basvuru.program]
  );

  const danismanaGonder = async () => {
    if (programSecimiGerekli && !(basvuru && basvuru.program)) {
      setMesaj({ tur: 'hata', metin: 'Önce müfredatınızı seçin.' });
      return;
    }
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
        silmeBeyani,
        // Önizlemeden sonra değiştirilmiş olabilir; memura giden kayıt
        // dilekçeyle aynı bilgileri taşısın.
        mezuniyetDonemi: donemBilgisi,
        silinecekEk,
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

  const onizle = async () => {
    // Sistemden gelmeyen kimlik bilgisi öğrenciden istenir; boş dilekçe inmez.
    const eksikAlan = [
      ['adSoyad', 'Adı ve Soyadı'],
      ['bolum', 'Bölümü'],
      ['telefon', 'Telefon'],
      ['adres', 'Adres'],
      ['eposta', 'e-posta'],
    ].filter(([k]) => !metin(iletisim[k]));
    if (eksikAlan.length) {
      setMesaj({
        tur: 'hata',
        metin: 'Kimlik bilgilerinde eksik var: ' + eksikAlan.map((x) => x[1]).join(', ') + '.',
      });
      return;
    }
    if (!metin(donemBilgisi.ogretimYili) || !metin(donemBilgisi.donem)) {
      setMesaj({ tur: 'hata', metin: 'Mezuniyet dönemini (öğretim yılı ve dönem) girin.' });
      return;
    }
    if (!silmeBeyani) {
      setMesaj({ tur: 'hata', metin: 'Beyan kutularından birini işaretleyin.' });
      return;
    }
    setCalisiyor('indir');
    setMesaj({ tur: '', metin: '' });
    try {
      // Kimlik/iletişim bilgileri ve beyan dilekçeye basılır; önce kaydedilir.
      const yama = {};
      if (JSON.stringify(iletisim) !== JSON.stringify(basvuru.iletisim || {}))
        yama.iletisim = iletisim;
      if (silmeBeyani !== metin(basvuru.silmeBeyani)) yama.silmeBeyani = silmeBeyani;
      if (JSON.stringify(donemBilgisi) !== JSON.stringify(basvuru.mezuniyetDonemi || {})) {
        yama.mezuniyetDonemi = donemBilgisi;
      }
      if (JSON.stringify(silinecekEk) !== JSON.stringify(basvuru.silinecekEk || {})) {
        yama.silinecekEk = silinecekEk;
      }
      if (Object.keys(yama).length) {
        await basvuruYaz(ogrNo, { ...yama, updatedAt: new Date().toISOString() });
      }
      const b = (await yenile()) || basvuru;
      setOnizleme(await dilekceUret(b, kurumFormu));
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

  const eksikler = basvuru ? imzaEksikleri({ ...basvuru, silmeBeyani }) : [];

  return (
    <div>
      <AdimSeridi durum={durum || 'taslak'} />
      <SiradakiAdim metin={OGRENCI_SIRADAKI[durum || '']} />
      {/* Dilekçe aşamasında mesaj, öğrencinin baktığı yerde (düğmenin altında) çıkar. */}
      {mesaj.metin && durum !== 'dilekce' && (
        <BilgiKutusu tur={mesaj.tur || 'bilgi'}>{mesaj.metin}</BilgiKutusu>
      )}

      {basvuru && <BasvuruOzeti b={basvuru} rol="ogrenci" />}

      {durum === 'iade' && (
        <BilgiKutusu tur="uyari">
          <b>Danışmanınız düzeltme istedi.</b> {metin(basvuru.danismanNotu)} Gerekirse güncel
          transkriptinizi yeniden yükleyin ve formu tekrar gönderin.
        </BilgiKutusu>
      )}

      {/* ── 0) MÜFREDAT ── bölümde birden çok müfredat varsa (8+0, 7+1 …) */}
      {formAsamasi && programSecimiGerekli && (
        <div style={KART}>
          <h3 style={BASLIK}>Müfredatım</h3>
          <div style={{ fontSize: 12.5, color: R.soluk, marginBottom: 10, lineHeight: 1.55 }}>
            Bölümünüzde birden çok müfredat okutuluyor. Kayıtlı olduğunuz müfredatı seçin; mezuniyet
            hesabı yalnız bu müfredatın dersleriyle yapılır (örneğin 8+0 öğrencisi 7+1
            müfredatındaki dersleri almadı diye eksik görünmez).
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {programlar.map((p) => {
              const on = program === p.id;
              return (
                <label
                  key={p.id}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '8px 14px',
                    borderRadius: 10,
                    border: '1.5px solid ' + (on ? R.mavi : R.kenar),
                    background: on ? '#E8F0FF' : 'white',
                    color: on ? R.mavi : R.metin,
                    fontWeight: 700,
                    fontSize: 13,
                    cursor: calisiyor ? 'wait' : 'pointer',
                  }}
                >
                  <input
                    type="radio"
                    name="mez-program"
                    checked={on}
                    disabled={!!calisiyor}
                    onChange={() => programSec(p.id)}
                  />
                  {p.ad}
                </label>
              );
            })}
          </div>
          {!program && (
            <div style={{ fontSize: 12, color: '#B45309', marginTop: 8 }}>
              Müfredat seçilmeden form danışmana gönderilemez.
            </div>
          )}
        </div>
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
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              marginBottom: formAsamasi || formAcik ? 12 : 0,
            }}
          >
            <h3 style={{ ...BASLIK, margin: 0, flex: 1 }}>Mezuniyet formu</h3>
            {!formAsamasi && (
              <button
                type="button"
                onClick={() => setFormAcik((v) => !v)}
                style={{ ...dugme('ikincil'), padding: '6px 12px', fontSize: 12.5 }}
              >
                {formAcik ? 'Gizle' : 'Formu göster (' + sonuc.kayitlar.length + ' ders)'}
              </button>
            )}
          </div>
          {(formAsamasi || formAcik) && (
            <>
              <BilgiKutusu tur="uyari">
                Bu hesap <b>bilgilendirme amaçlıdır</b>; resmî karar öğrenci bilgi sistemindedir.
              </BilgiKutusu>
              <div
                style={{
                  display: 'flex',
                  gap: 18,
                  flexWrap: 'wrap',
                  fontSize: 13,
                  marginBottom: 12,
                }}
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
              <TranskriptFormu
                sonuc={sonuc}
                rol="ogrenci"
                oneriler={oneriListesi(basvuru)}
                mufredat={ogrenciMufredati}
                onOneri={formAsamasi ? oneriKaydet : undefined}
                onOneriSil={formAsamasi ? oneriSil : undefined}
              />
            </>
          )}
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

      {/* ── 2) DİLEKÇE ── numaralı adımlar */}
      {durum === 'dilekce' && (
        <div>
          <IsaretOzeti basvuru={basvuru} />

          <BolumKarti
            no={1}
            baslik="Kimlik bilgileri"
            aciklama="Sistemden geldi; eksik olanları tamamlayın. Dilekçeye olduğu gibi basılır."
          >
            <div style={IZGARA}>
              {[
                ['adSoyad', 'Adı ve Soyadı'],
                ['ogrenciNo', 'Öğrenci No'],
                ['bolum', 'Bölümü'],
                ['telefon', 'Telefon'],
                ['adres', 'Adres'],
                ['eposta', 'e-posta'],
              ].map(([k, l]) => {
                const sabit = k === 'ogrenciNo';
                const deger = sabit ? ogrNo : iletisim[k] || '';
                return (
                  <Girdi
                    key={k}
                    etiket={l}
                    eksik={!sabit && !deger}
                    value={deger}
                    readOnly={sabit}
                    onChange={(v) => setIletisim({ ...iletisim, [k]: v })}
                  />
                );
              })}
            </div>
          </BolumKarti>

          <BolumKarti
            no={2}
            baslik="Mezuniyet dönemi"
            aciklama="Dilekçedeki “… öğretim yılı … dönemi sonu itibariyle” cümlesine yazılır."
          >
            <div style={IZGARA}>
              <Girdi
                etiket="Öğretim yılı"
                eksik={!donemBilgisi.ogretimYili}
                value={donemBilgisi.ogretimYili}
                placeholder="örn. 2025-2026"
                onChange={(v) => setDonemBilgisi({ ...donemBilgisi, ogretimYili: v })}
              />
              <label style={{ display: 'block' }}>
                <span style={ALAN_ETIKETI}>
                  Dönem
                  {!donemBilgisi.donem && <span style={{ color: R.kirmizi }}> · seçilmeli</span>}
                </span>
                <select
                  value={donemBilgisi.donem}
                  onChange={(e) => setDonemBilgisi({ ...donemBilgisi, donem: e.target.value })}
                  style={{ ...GIRDI, borderColor: donemBilgisi.donem ? '#D5D7DB' : '#FCA5A5' }}
                >
                  <option value="">Seçin</option>
                  {['Güz', 'Bahar', 'Yaz'].map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </BolumKarti>

          <BolumKarti no={3} baslik="Beyan" aciklama="Dilekçedeki iki kutudan birini işaretleyin.">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                [
                  'yok',
                  'Mezuniyet için transkriptimden silinmesi gereken seçmeli başarısız dersim bulunmamaktadır.',
                ],
                [
                  'var',
                  'Mezuniyet için aşağıda bildirdiğim seçmeli derslerin transkriptimden silinmesini istiyorum.',
                ],
              ].map(([k, t]) => (
                <label
                  key={k}
                  style={{
                    display: 'flex',
                    gap: 10,
                    alignItems: 'flex-start',
                    fontSize: 13,
                    padding: '11px 14px',
                    borderRadius: 10,
                    cursor: 'pointer',
                    border: '1px solid ' + (silmeBeyani === k ? R.mavi : R.kenar),
                    background: silmeBeyani === k ? R.maviAcik : 'white',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={silmeBeyani === k}
                    onChange={(e) => setSilmeBeyani(e.target.checked ? k : '')}
                    style={{ marginTop: 2 }}
                  />
                  <span>{t}</span>
                </label>
              ))}
            </div>
            {silmeBeyani === 'yok' && (basvuru.silinecekDersler || []).length > 0 && (
              <div style={{ marginTop: 10 }}>
                <BilgiKutusu tur="uyari">
                  Danışmanınız {silinecekleriTekille(basvuru.silinecekDersler).length} dersin
                  silinmesini istedi; ikinci kutu işaretlenmelidir.
                </BilgiKutusu>
              </div>
            )}
            {silmeBeyani === 'var' && (
              <div style={{ marginTop: 14 }}>
                <div style={{ fontSize: 12.5, fontWeight: 700, color: R.navy, marginBottom: 6 }}>
                  Dilekçedeki ders tablosu
                </div>
                {(basvuru.silinecekDersler || []).length === 0 ? (
                  <BilgiKutusu tur="uyari">
                    Danışmanınız silinecek ders işaretlemedi; tablo boş kalır.
                  </BilgiKutusu>
                ) : (
                  <SilinecekTablosu
                    dersler={silinecekleriTekille(basvuru.silinecekDersler)}
                    ek={silinecekEk}
                    onEk={setSilinecekEk}
                  />
                )}
              </div>
            )}
          </BolumKarti>

          <BolumKarti
            no={4}
            baslik="Dilekçeyi indirin, imzalayın, yükleyin"
            aciklama="Dilekçe salt okunur PDF olarak iner. İmzaladıktan sonra taranmış hâlini PDF olarak yükleyin."
          >
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
              <button
                type="button"
                onClick={onizle}
                disabled={!!calisiyor}
                style={dugme('birincil', !!calisiyor)}
              >
                {calisiyor === 'indir' ? 'Hazırlanıyor…' : 'Dilekçeyi önizle ve indir'}
              </button>
              <label style={{ cursor: calisiyor ? 'not-allowed' : 'pointer' }}>
                <input
                  type="file"
                  accept=".pdf,application/pdf"
                  style={{ display: 'none' }}
                  disabled={!!calisiyor}
                  onChange={(e) => {
                    const f = (e.target.files && e.target.files[0]) || null;
                    e.target.value = '';
                    if (f) imzaliYukle('imzaliDilekce', f);
                  }}
                />
                <span style={dugme('ikincil', !!calisiyor)}>
                  {calisiyor === 'imzaliDilekce'
                    ? 'Yükleniyor…'
                    : basvuru.imzaliDilekce
                      ? 'İmzalı PDF’i değiştir'
                      : 'İmzalı PDF’i yükle'}
                </span>
              </label>
              {basvuru.imzaliDilekce && basvuru.imzaliDilekce.url && (
                <a
                  href={basvuru.imzaliDilekce.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ fontSize: 12.5, color: R.yesil, fontWeight: 700 }}
                >
                  ✓ {basvuru.imzaliDilekce.ad || 'yüklendi'}
                </a>
              )}
            </div>
            {kurumFormu && (
              <div style={{ marginTop: 10, fontSize: 12, color: R.soluk }}>
                Dilekçe kurumun formundan hazırlanır:{' '}
                <span style={{ color: R.metin }}>{kurumFormu.ad || 'Mezuniyet dilekçesi'}</span>
              </div>
            )}
          </BolumKarti>

          <BolumKarti no={5} baslik="Danışmana gönderin">
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
              <button
                type="button"
                disabled={eksikler.length > 0 || !!calisiyor}
                onClick={imzaliGonder}
                style={dugme('turuncu', eksikler.length > 0 || !!calisiyor)}
              >
                {calisiyor === 'imza' ? 'Gönderiliyor…' : 'İmzalı dilekçeyi danışmana gönder'}
              </button>
              {eksikler.length > 0 && (
                <span style={{ fontSize: 12.5, color: R.soluk }}>{eksikler.join(' ')}</span>
              )}
            </div>
          </BolumKarti>

          {mesaj.metin && <BilgiKutusu tur={mesaj.tur || 'bilgi'}>{mesaj.metin}</BilgiKutusu>}
          {onizleme && <DilekceOnizleme sonuc={onizleme} onKapat={() => setOnizleme(null)} />}
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

const DUZ_H = {
  padding: '7px 9px',
  fontSize: 12.5,
  borderBottom: '1px solid #EDEDED',
  textAlign: 'left',
  color: R.soluk,
};

const IZGARA = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
  gap: 12,
};
const ALAN_ETIKETI = {
  display: 'block',
  fontSize: 12.5,
  fontWeight: 600,
  color: R.metin,
  marginBottom: 5,
};

function Girdi({ etiket, eksik, value, onChange, readOnly, placeholder }) {
  return (
    <label style={{ display: 'block' }}>
      <span style={ALAN_ETIKETI}>
        {etiket}
        {eksik && <span style={{ color: R.kirmizi }}> · girilmeli</span>}
      </span>
      <input
        value={value}
        readOnly={readOnly}
        placeholder={placeholder}
        onChange={(e) => onChange && onChange(e.target.value)}
        style={{
          ...GIRDI,
          background: readOnly ? '#F5F6F7' : 'white',
          color: readOnly ? R.soluk : R.metin,
          borderColor: eksik ? '#FCA5A5' : '#D5D7DB',
        }}
      />
    </label>
  );
}

/**
 * Dilekçedeki ders tablosunun önizlemesi. Transkriptten okunamayan
 * eğitim-öğretim yılı / yarıyıl / statü öğrenci tarafından tamamlanır
 * (danışmanın ders listesi değişmez; ek bilgi ayrı saklanır).
 */
function SilinecekTablosu({ dersler, ek, onEk }) {
  const h = {
    padding: '7px 9px',
    fontSize: 12.5,
    borderBottom: '1px solid #EDEDED',
    textAlign: 'left',
  };
  const hucre = (d, alan, ipucu) => {
    if (metin(d[alan])) return metin(d[alan]);
    const k = dersAnahtari(d);
    const e = ek[k] || {};
    return (
      <input
        value={e[alan] || ''}
        placeholder={ipucu}
        onChange={(ev) => onEk({ ...ek, [k]: { ...e, [alan]: ev.target.value } })}
        style={{
          ...GIRDI,
          padding: '5px 8px',
          fontSize: 12.5,
          borderColor: e[alan] ? '#D5D7DB' : '#FCA5A5',
        }}
      />
    );
  };
  return (
    <div style={{ border: '1px solid ' + R.kenar, borderRadius: 10, overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 640 }}>
        <thead>
          <tr style={{ background: '#F7F7F7' }}>
            {['Dersin kodu ve adı', 'Eğitim-öğretim yılı', 'Yarıyıl', 'AKTS', 'Statüsü'].map(
              (t) => (
                <th key={t} style={{ ...h, fontSize: 11, color: R.soluk }}>
                  {t}
                </th>
              )
            )}
          </tr>
        </thead>
        <tbody>
          {dersler.map((d) => (
            <tr key={dersAnahtari(d)}>
              <td style={{ ...h, fontWeight: 600 }}>
                {d.kod} {d.ad}
              </td>
              <td style={{ ...h, width: 150 }}>{hucre(d, 'yil', 'örn. 2023-2024')}</td>
              <td style={{ ...h, width: 120 }}>{hucre(d, 'yariyil', 'Güz/Bahar')}</td>
              <td style={{ ...h, width: 60 }}>{d.akts}</td>
              <td style={{ ...h, width: 120 }}>{hucre(d, 'statu', 'Seçmeli')}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div style={{ fontSize: 11.5, color: R.soluk, padding: '7px 10px' }}>
        Kırmızı kenarlı alanlar transkriptten okunamadı; transkriptinize bakarak doldurun.
      </div>
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
  const [secim, setSecim] = useState(new Map()); // satır anahtarı → ders
  // Dilekçeye gidecek dersin danışmanca düzeltilen yıl/yarıyıl/statüsü
  // (ders grup anahtarı → alanlar). Okuma hatalarına karşı.
  const [duzeltme, setDuzeltme] = useState({});
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
    const kayitli = silinecekleriTekille(b.silinecekDersler);
    const gruplar = new Set(kayitli.map(dersGrupAnahtari));
    // Bir dersin işaretli olması, o dersin BÜTÜN denemelerinin işaretli
    // görünmesi demektir; kayda yine tek satır gider.
    sonuc.kayitlar.forEach((r, i) => {
      if (gruplar.has(dersGrupAnahtari(r)) && r.durum !== 'gecti') {
        m.set(metin(r.kod) + '|' + metin(r.ad) + '|' + i, silinecekDers(r));
      }
    });
    setSecim(m);
    // Yalnız danışmanın ELLE düzelttiği dersler düzeltme sayılır; aksi hâlde
    // eski kayıttaki ilk deneme dönemi en son dönemi ezerdi.
    const d = {};
    kayitli
      .filter((x) => x.duzeltildi)
      .forEach((x) => {
        d[dersGrupAnahtari(x)] = {
          yil: metin(x.yil),
          yariyil: metin(x.yariyil),
          statu: metin(x.statu),
        };
      });
    setDuzeltme(d);
  }, [sonuc, b && JSON.stringify(b.silinecekDersler || [])]);

  // Transkriptte bulunamayan / BŞ olmayan stajlar ilk incelemede eksik
  // olarak işaretli gelir (danışman değiştirebilir).
  useEffect(() => {
    if (!sonuc || !b || b.durum !== 'danismanda') return;
    if ((b.eksikStajlar || []).length === 0 && (sonuc.stajEksik || []).length > 0) {
      setStajlar(sonuc.stajEksik);
    }
  }, [sonuc, b && b.durum]);

  if (!b || !hazir) return <div style={{ padding: 24, color: R.soluk }}>Yükleniyor…</div>;

  const durum = b.durum;
  const isaretAcik = durum === 'danismanda' || durum === 'dilekce';
  // Ders bir bütün olarak işaretlenir: aynı dersin başarısız bütün denemeleri
  // birlikte açılır/kapanır. Verilen Map'i değiştirip döndürür.
  const grupIsaretle = (m, k, r, acik) => {
    const g = dersGrupAnahtari(r);
    (sonuc ? sonuc.kayitlar : []).forEach((x, i) => {
      if (dersGrupAnahtari(x) !== g) return;
      const xk = metin(x.kod) + '|' + metin(x.ad) + '|' + i;
      if (acik && (x.durum !== 'gecti' || xk === k)) m.set(xk, silinecekDers(x));
      if (!acik) m.delete(xk);
    });
    return m;
  };
  const stajSecenekleri = Array.from(
    new Set((mezKuralNormalize(kural).stajlar || []).concat(b.eksikStajlar || []))
  );
  // Her ders bir kez, en son kalınan dönemiyle; danışmanın düzeltmesi üstüne.
  const silinecekler = silinecekleriTekille(Array.from(secim.values())).map((d) => {
    const z = duzeltme[dersGrupAnahtari(d)];
    if (!z) return d;
    return {
      ...d,
      yil: metin(z.yil) || metin(d.yil),
      yariyil: metin(z.yariyil) || metin(d.yariyil),
      statu: metin(z.statu) || metin(d.statu),
      duzeltildi: true,
    };
  });

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

  // Öğrencinin eşleştirme önerisine karar: kabul edilen hesaba hemen girer.
  const oneriKarariVer = async (o, karar) => {
    setCalisiyor('eslesme');
    await yaz(
      {
        eslesmeKararlari: {
          ...(b.eslesmeKararlari || {}),
          [o.id]: {
            karar,
            mufredatKod: o.mufredatKod,
            mufredatAd: o.mufredatAd,
            tarih: new Date().toISOString(),
            yazan: kimlik,
          },
        },
      },
      'Eşleştirme önerisi ' +
        (karar === 'kabul' ? 'kabul edildi: ' : 'reddedildi: ') +
        [o.transkriptKod || o.transkriptAd, o.mufredatKod || o.mufredatAd].join(' → '),
      karar === 'kabul'
        ? 'Eşleştirme kabul edildi; hesap güncellendi.'
        : 'Eşleştirme önerisi reddedildi.'
    );
    setCalisiyor('');
  };

  const isaretler = () => ({
    silinecekDersler: silinecekler,
    eksikStajlar: stajlar,
    danismanNotu: not.trim(),
  });

  const onayla = async () => {
    const bekleyen = oneriListesi(b).filter((o) => o.karar === 'bekliyor').length;
    if (
      bekleyen > 0 &&
      !window.confirm(
        bekleyen +
          ' eşleştirme önerisine henüz karar vermediniz; bunlar hesaba girmez. Yine de onaylansın mı?'
      )
    )
      return;
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

  const basvuruyuSil = async () => {
    const ad = b.ogrenciAd || b.ogrenciNo;
    if (
      !window.confirm(
        ad +
          ' adlı öğrencinin mezuniyet başvurusu silinsin mi?\n\nForm, işaretler ve notlar silinir; memura iletilmiş belgeler de kalkar. Öğrenci baştan başlar. Bu işlem geri alınamaz.'
      )
    ) {
      return;
    }
    setCalisiyor('sil');
    setMesaj({ tur: '', metin: '' });
    try {
      await window.DBWrite.remove(MEZ_BASVURU_KOLEKSIYONU, String(no));
      if (window.apiInvalidate) window.apiInvalidate(MEZ_BASVURU_KOLEKSIYONU);
      onGeri();
    } catch (e) {
      setMesaj({ tur: 'hata', metin: 'Silinemedi: ' + e.message });
      setCalisiyor('');
    }
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
      <GeriDon onClick={onGeri} />
      <AdimSeridi durum={durum} />
      <SiradakiAdim rol="danisman" metin={DANISMAN_SIRADAKI[durum]} />
      {mesaj.metin && <BilgiKutusu tur={mesaj.tur || 'bilgi'}>{mesaj.metin}</BilgiKutusu>}

      <BasvuruOzeti b={b} rol="danisman" />

      <div style={KART}>
        <h3 style={BASLIK}>Mezuniyet formu</h3>
        <div style={{ fontSize: 12.5, color: R.soluk, marginBottom: 10 }}>
          Form öğrencinin transkriptinden olduğu gibi aktarıldı; transkript PDF’iyle karşılaştırın.{' '}
          {isaretAcik
            ? 'Aşağıda yalnız karar gerektiren dersler var. Silinmesi gerekenleri işaretleyin ya da “Önerilenlerin hepsini işaretle”yi kullanın; bir dersin bütün denemeleri birlikte işaretlenir.'
            : ''}
        </div>
        <KosulOzeti sonuc={sonuc} />
        <TranskriptFormu
          sonuc={sonuc}
          rol="danisman"
          oneriler={oneriListesi(b)}
          onKarar={oneriKarariVer}
          kararKilitli={!isaretAcik || !!calisiyor}
          secim={secim}
          secimKilitli={!isaretAcik}
          onSecim={(k, r, acik) => setSecim(grupIsaretle(new Map(secim), k, r, acik))}
          onTopluSecim={(liste) => {
            // "Önerilenlerin hepsini işaretle": tek seferde, tek durum güncellemesi.
            const m = new Map(secim);
            liste.forEach(([k, r]) => grupIsaretle(m, k, r, true));
            setSecim(m);
          }}
        />
      </div>

      {silinecekler.length > 0 && (
        <div style={KART}>
          <h3 style={BASLIK}>Dilekçeye gidecek dersler ({silinecekler.length})</h3>
          <div style={{ fontSize: 12.5, color: R.soluk, marginBottom: 10 }}>
            Her ders bir kez, en son kalındığı dönemle gider. Dönem ya da statü yanlış okunduysa
            transkripte bakarak düzeltin.
          </div>
          <div style={{ border: '1px solid ' + R.kenar, borderRadius: 10, overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 640 }}>
              <thead>
                <tr style={{ background: '#F7F7F7' }}>
                  {['Dersin kodu ve adı', 'Eğitim-öğretim yılı', 'Yarıyıl', 'AKTS', 'Statüsü'].map(
                    (t) => (
                      <th key={t} style={DUZ_H}>
                        {t}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody>
                {silinecekler.map((d) => {
                  const g = dersGrupAnahtari(d);
                  const alan = (ad, ipucu, gen) => (
                    <input
                      value={(duzeltme[g] && duzeltme[g][ad]) ?? metin(d[ad])}
                      placeholder={ipucu}
                      disabled={!isaretAcik}
                      onChange={(e) =>
                        setDuzeltme({
                          ...duzeltme,
                          [g]: { ...(duzeltme[g] || {}), [ad]: e.target.value },
                        })
                      }
                      style={{ ...GIRDI, padding: '5px 8px', fontSize: 12.5, width: gen }}
                    />
                  );
                  return (
                    <tr key={g}>
                      <td style={{ ...DUZ_H, fontWeight: 600, color: R.metin }}>
                        {d.kod} {d.ad}
                      </td>
                      <td style={DUZ_H}>{alan('yil', 'örn. 2024-2025', 130)}</td>
                      <td style={DUZ_H}>
                        <select
                          value={(duzeltme[g] && duzeltme[g].yariyil) ?? metin(d.yariyil)}
                          disabled={!isaretAcik}
                          onChange={(e) =>
                            setDuzeltme({
                              ...duzeltme,
                              [g]: { ...(duzeltme[g] || {}), yariyil: e.target.value },
                            })
                          }
                          style={{ ...GIRDI, padding: '5px 8px', fontSize: 12.5, width: 110 }}
                        >
                          {Array.from(
                            new Set(
                              ['', 'Güz', 'Bahar', 'Yaz', metin(d.yariyil)].concat(
                                duzeltme[g] && duzeltme[g].yariyil ? [duzeltme[g].yariyil] : []
                              )
                            )
                          ).map((v) => (
                            <option key={v} value={v}>
                              {v || '—'}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td style={{ ...DUZ_H, color: R.metin }}>{d.akts}</td>
                      <td style={DUZ_H}>{alan('statu', 'Seçmeli', 120)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {isaretAcik && (
            <div style={{ fontSize: 12, color: R.soluk, marginTop: 8 }}>
              Düzeltmeler “Onayla” ya da “İşaretleri ve notu kaydet” ile kaydedilir.
            </div>
          )}
        </div>
      )}

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
              {(() => {
                const d = ((sonuc && sonuc.stajDurumlari) || []).find((x) => x.ad === s);
                if (!d) return null;
                return (
                  <span
                    style={{
                      fontSize: 11.5,
                      fontWeight: 700,
                      color: d.tamam ? R.yesil : R.kirmizi,
                    }}
                  >
                    · {d.kod}:{' '}
                    {d.tamam
                      ? 'transkriptte başarılı'
                      : d.alindi
                        ? 'başarılı değil'
                        : 'transkriptte yok'}
                  </span>
                );
              })()}
            </label>
          ))}
          {stajSecenekleri.length === 0 && (
            <span style={{ fontSize: 12, color: R.soluk }}>
              Bölümün staj listesi tanımlı değil (Mezuniyet → Mezuniyet kuralları).
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
      </div>

      <div style={KART}>
        <h3 style={BASLIK}>Notlar</h3>
        <Notlar basvuru={b} />
        {['danismanda', 'dilekce', 'imzali'].indexOf(durum) >= 0 && (
          <NotYaz onGonder={notGonder} yer="Öğrenciye not gönderin…" />
        )}
      </div>

      {/* İŞLEM ÇUBUĞU — aşamanın kararı her zaman görünür (ekranın altında). */}
      {['danismanda', 'dilekce', 'imzali'].indexOf(durum) >= 0 && (
        <div
          style={{
            position: 'sticky',
            bottom: 12,
            zIndex: 5,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            flexWrap: 'wrap',
            padding: '12px 16px',
            marginBottom: 16,
            borderRadius: 14,
            background: 'white',
            border: '1px solid ' + R.kenar,
            boxShadow: '0 8px 24px rgba(16,24,40,0.12)',
          }}
        >
          <span style={{ flex: '1 1 220px', fontSize: 12.5, color: R.soluk }}>
            <b style={{ color: R.metin }}>{silinecekler.length}</b> ders silinecek ·{' '}
            <b style={{ color: R.metin }}>{stajlar.length}</b> staj eksik
            {not.trim() ? ' · not yazıldı' : ''}
          </span>
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
      )}

      {/* Danışman başvuruyu her aşamada silebilir. */}
      {
        <div
          style={{
            ...KART,
            borderColor: '#FECACA',
            display: 'flex',
            gap: 12,
            alignItems: 'center',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ flex: '1 1 260px' }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: R.kirmizi }}>Başvuruyu sil</div>
            <div style={{ fontSize: 12.5, color: R.soluk, marginTop: 2 }}>
              Form, işaretler, notlar ve yüklenen imzalı dilekçe kaydı silinir; memura iletilmiş
              belgeler de Gelen Belgeler’den kalkar. Öğrenciye bildirim gider ve öğrenci başvuruya
              baştan başlar. Geri alınamaz.
            </div>
          </div>
          <button
            type="button"
            disabled={!!calisiyor}
            onClick={basvuruyuSil}
            style={dugme('tehlike', !!calisiyor)}
          >
            {calisiyor === 'sil' ? 'Siliniyor…' : 'Başvuruyu sil'}
          </button>
        </div>
      }
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
  const [taslakAcik, setTaslakAcik] = useState(false);
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

  const taslakMi = (b) => !metin(b.durum) || b.durum === 'taslak';
  const gonderilenler = liste.filter((b) => !taslakMi(b));
  const taslaklar = memur ? [] : liste.filter(taslakMi);

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
          : 'Bölümünüzdeki, danışmana gönderilmiş mezuniyet başvuruları.'}
      </BilgiKutusu>
      {/* ⚠ TASLAK DANIŞMANA GİTMEMİŞTİR. Sunucu taslakları yalnız tam erişimli
          kullanıcıya (sistem/üniversite yetkilisi) verir; eskiden gönderilmiş
          başvurularla karışık listeleniyordu ve "bu hangi danışmana gitti"
          sorusu doğuyordu. Ayrı ve kapalı durur. */}
      {gonderilenler.length === 0 ? (
        <div style={{ ...KART, color: R.soluk, fontSize: 13 }}>Gösterilecek başvuru yok.</div>
      ) : (
        <BasvuruListesi liste={gonderilenler} onSec={setSecili} />
      )}
      {taslaklar.length > 0 && (
        <div style={{ marginTop: 14 }}>
          <button
            type="button"
            onClick={() => setTaslakAcik((v) => !v)}
            style={{ ...dugme('ikincil'), width: '100%', justifyContent: 'space-between' }}
            aria-expanded={taslakAcik}
            data-taslaklar
          >
            <span>Danışmana henüz gönderilmemiş taslaklar ({taslaklar.length})</span>
            <span>{taslakAcik ? '▴' : '▾'}</span>
          </button>
          {taslakAcik && (
            <div style={{ marginTop: 10 }}>
              <BilgiKutusu tur="uyari">
                Bu öğrenciler transkriptini yüklemiş ama formu danışmana göndermemiş. Hiçbir
                danışman bu başvuruları görmez.
              </BilgiKutusu>
              <BasvuruListesi liste={taslaklar} onSec={setSecili} />
            </div>
          )}
        </div>
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
      <GeriDon onClick={onGeri} />
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
          <TranskriptFormu
            sonuc={sonuc}
            rol={memur ? 'memur' : 'personel'}
            oneriler={oneriListesi(b)}
          />
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
  const SekmeSeridi = window.SayfaSekmeSeridi;
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
    // Akademisyen: danışmanlık; yetkili ayrıca bölümdeki başvurular ve
    // Mezuniyet Kuralları (eskiden Bölüm Yönetimi'ndeydi).
    const sekmeler = [
      {
        id: 'danismanlik',
        baslik: 'Danışmanlığım',
        ikon: 'kisi',
        ozet: 'Danışmanı olduğunuz öğrenciler',
      },
    ].concat(
      yonetici
        ? [
            {
              id: 'bolum',
              baslik: 'Bölüm başvuruları',
              ikon: 'pano',
              ozet: 'Bölümdeki tüm mezuniyet başvuruları',
            },
            {
              id: 'kurallar',
              baslik: 'Mezuniyet kuralları',
              ikon: 'kitap',
              ozet: 'AKTS, AGNO, not ölçeği, sarı satırlar',
            },
          ]
        : []
    );
    govde = (
      <div>
        {sekmeler.length > 1 && SekmeSeridi && (
          <SekmeSeridi sekmeler={sekmeler} aktif={sekme} onSec={setSekme} />
        )}
        {sekme === 'bolum' && yonetici ? (
          <PersonelListesi currentUser={currentUser} activeDepartment={activeDepartment} />
        ) : sekme === 'kurallar' && yonetici ? (
          <MezuniyetKurallari activeDepartment={activeDepartment} currentUser={currentUser} />
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
              : 'Mezuniyet formları, dilekçeler, memura iletim ve mezuniyet kuralları'
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
