// ══════════════════════════════════════════════════════════════
// ÇAKÜ — Yatay Geçiş Modülü
//
// Üç geçiş türü ayrı sekmelerde yürür:
//   kurumici      → Kurum İçi Yatay Geçiş
//   kurumlararasi → Kurumlararası (Yurt İçi) Yatay Geçiş  [%40 YKS + %60 AGNO]
//   merkezi       → Merkezi Yerleştirme Puanı ile Yatay Geçiş (Ek Madde 1)
//
// Öğrenci tarafı : başvuru formu (sistemde olan alanlar dolu ve salt-okunur)
//                  + üç zorunlu ek.
// Akademisyen    : başvuruları görür, her satır için DEĞERLENDİRME seçer;
//                  tüm başvurular değerlendirilince "Belge Oluştur" açılır ve
//                  bölümün tüm başvuranlarını içeren değerlendirme raporu
//                  üretilir (şablon: Şablonlar → Yatay Geçiş → ilgili tür).
//
// Veri: yatay_gecis_basvurular
// ══════════════════════════════════════════════════════════════

const { useState, useEffect, useMemo, useCallback } = React;

const YG = {
  navy: '#1B2A4A',
  accent: '#B45309',
  accentPale: '#FEF3C7',
  text: '#1F2937',
  textMuted: '#6B7280',
  border: '#E5E7EB',
  green: '#059669',
  greenLight: '#D1FAE5',
  red: '#DC2626',
  redLight: '#FEE2E2',
  bg: '#F8F9FB',
};

// ── Geçiş türleri ──
// `alanlar`: o türde öğrenciden istenen ek alanlar (ortak alanlar hepsinde var)
const YG_TURLER = [
  {
    id: 'kurumici',
    label: 'Kurum İçi Yatay Geçiş',
    tamAd: 'Kurum İçi Yatay Geçiş',
    color: '#B45309',
    bg: '#FEF3C7',
    aciklama: 'Üniversite içindeki başka bir bölümden aynı üniversitenin bölümüne geçiş',
    // Kurum içi geçişte YKS puanı ve not ortalaması istenmez — şablonunda
    // bu sütunlar yok, karar bölüm kurulunun değerlendirmesiyle verilir.
    puanIster: false,
    notIster: false,
  },
  {
    id: 'kurumlararasi',
    label: 'Kurumlararası Yatay Geçiş',
    tamAd: 'Başarı Düzeyi ile Kurumlararası (Yurt İçi) Yatay Geçiş',
    color: '#0F766E',
    bg: '#CCFBF1',
    aciklama: "Başka bir üniversiteden geçiş — YKS puanının %40'ı + not ortalamasının %60'ı",
    puanIster: true,
    notIster: true,
    hesapla: true, // yerleştirmeye esas puan sistemce hesaplanır
  },
  {
    id: 'merkezi',
    label: 'Merkezi Yerleştirme Puanı ile Yatay Geçiş',
    tamAd: 'Merkezi Yerleştirme Puanı ile Yatay Geçiş (Ek Madde 1)',
    color: '#6D28D9',
    bg: '#F3E8FF',
    aciklama: 'ÖSYS/YKS yerleştirme puanı, başvurulan programın taban puanına eşit veya üstü ise',
    puanIster: true,
    notIster: false,
  },
];

// ── Zorunlu ekler ──
const YG_EKLER = [
  {
    id: 'transkript',
    title: 'Öğrenci Not Çizelgesi (Transkript)',
    zorunlu: true,
  },
  {
    id: 'yks_sonuc',
    title: 'YKS/YGS/LYS/DGS Sonuç Belgesi',
    aciklama: 'Yerleştirme puanları ve başarı sıralamaları dâhil',
    zorunlu: true,
  },
  {
    id: 'ozel_yetenek',
    title: 'Özel Yetenek Sınavı Başarı Belgesi',
    aciklama: 'Yalnızca özel yetenek sınavı ile öğrenci alan programlar için',
    zorunlu: false,
  },
];

// ── Akademisyenin seçtiği değerlendirme sonuçları ──
// Şablondaki örnek "UYGUN 1. SINIF (1. ASIL)" bu listeden üretilir.
const YG_DEGERLENDIRME = [
  { id: '', label: '— Seçilmedi —' },
  { id: 'uygun_asil', label: 'UYGUN (ASIL)', sinifSorar: true, siraSorar: true },
  { id: 'uygun_yedek', label: 'UYGUN (YEDEK)', sinifSorar: true, siraSorar: true },
  { id: 'uygun_degil', label: 'UYGUN DEĞİL' },
  { id: 'sartlari_tasimiyor', label: 'BAŞVURU ŞARTLARINI TAŞIMIYOR' },
  { id: 'eksik_belge', label: 'EKSİK BELGE' },
  { id: 'basvuru_geri', label: 'BAŞVURUDAN VAZGEÇTİ' },
];

const YG_DURUMLAR = {
  beklemede: { label: 'Değerlendirilmedi', color: YG.accent, bg: YG.accentPale },
  degerlendirildi: { label: 'Değerlendirildi', color: YG.green, bg: YG.greenLight },
};

const ygCard = {
  background: 'white',
  border: '1px solid ' + YG.border,
  borderRadius: 12,
};
const ygBtn = (primary) => ({
  padding: '8px 15px',
  borderRadius: 8,
  border: '1px solid ' + (primary ? YG.navy : YG.border),
  background: primary ? YG.navy : 'white',
  color: primary ? 'white' : YG.navy,
  fontSize: 12.5,
  fontWeight: 600,
  cursor: 'pointer',
  fontFamily: 'inherit',
});
const ygPill = (color, bg) => ({
  padding: '2px 10px',
  borderRadius: 12,
  background: bg,
  color,
  fontSize: 11,
  fontWeight: 700,
  whiteSpace: 'nowrap',
});
const ygInput = {
  width: '100%',
  padding: '9px 11px',
  border: '1px solid ' + YG.border,
  borderRadius: 8,
  fontSize: 13,
  fontFamily: 'inherit',
  color: YG.text,
  outline: 'none',
};
const ygLabel = {
  display: 'block',
  fontSize: 11.5,
  fontWeight: 600,
  color: YG.textMuted,
  marginBottom: 4,
};

const ygFileHref = (u) => {
  const rel = String(u || '')
    .replace('/api/files/download/', '')
    .replace('/api/files/view/', '');
  return rel ? '/api/files/download/' + rel + '?download=true' : '#';
};

// Not ortalaması yalnızca 100'lük sistemde girilir — dönüşüm yapılmaz.
function ygYuzluk(not) {
  const n = parseFloat(String(not || '').replace(',', '.'));
  return isNaN(n) ? null : n;
}

// Kurumlararası yerleştirmeye esas puan: YKS×0.40 + AGNO(100)×0.60
function ygYerlesmePuani(yksPuani, notOrt) {
  const p = parseFloat(String(yksPuani || '').replace(',', '.'));
  const n = ygYuzluk(notOrt);
  if (isNaN(p) || n == null) return null;
  const p40 = Math.round(p * 0.4 * 100) / 100;
  const n60 = Math.round(n * 0.6 * 100) / 100;
  return { p40, n60, toplam: Math.round((p40 + n60) * 100) / 100 };
}

// Değerlendirme sonucunu belgeye yazılacak metne çevir.
function ygDegerlendirmeMetni(rec) {
  const d = YG_DEGERLENDIRME.find((x) => x.id === rec.degerlendirme);
  if (!d || !d.id) return '';
  let m = d.label;
  if (d.sinifSorar && rec.degerlendirmeSinif) m = 'UYGUN ' + rec.degerlendirmeSinif;
  if (d.siraSorar && rec.degerlendirmeSira) {
    m += ' (' + rec.degerlendirmeSira + (d.id === 'uygun_yedek' ? '. YEDEK)' : '. ASIL)');
  }
  return m;
}

async function ygDosyaYukle(file) {
  if (!file) return '';
  try {
    if (window.uploadGeneratedDoc) {
      return (await window.uploadGeneratedDoc(file, file.name, 'yatay_gecis')) || '';
    }
  } catch (e) {
    console.warn('yatay geçiş dosya yükleme hatası:', e && e.message);
  }
  return '';
}

// ══════════════════════════════════════════════════════════════
// Öğrenci — Başvuru Formu
// Sistemde karşılığı olan alanlar DOLU ve salt-okunur gelir; kalanlar
// öğrenciden istenir. Hangi alanların istendiği geçiş türüne göre değişir.
// ══════════════════════════════════════════════════════════════
function YgBasvuruFormu({ tur, currentUser, departmentInfo, onSaved }) {
  // Sistemden gelenler
  const sysAdSoyad = currentUser?.name || '';
  const sysOgrNo = currentUser?.studentNumber || currentUser?.identifier || '';
  const sysFakulte = window.TENANT?.facultyName || 'Mühendislik Fakültesi';
  const sysBolum = departmentInfo?.name || currentUser?.departmentName || '';

  // Kurum içi geçişte öğrencinin AKTİF programı sistemden bilinir.
  const icGecis = tur.id === 'kurumici';

  const [form, setForm] = useState({
    // Aktif program — kurum içinde sistemden dolu gelir
    aktifUniversite: icGecis ? window.TENANT?.universityName || '' : '',
    aktifFakulte: icGecis ? sysFakulte : '',
    aktifBolum: icGecis ? sysBolum : '',
    aktifSinif: '',
    // Başvurulan program — öğrenci seçer
    basvurduguFakulteId: '',
    basvurduguFakulte: '',
    basvurduguBolum: '',
    basvurduguSinif: '',
    // Yerleştirme
    yksYerlesmeYili: '',
    yksPuanTuru: '',
    yksPuani: '',
    notOrtalamasi: '',
    // İletişim
    telefon: '',
    eposta: '',
  });
  const [ekler, setEkler] = useState({});
  const [yukleniyor, setYukleniyor] = useState('');
  const [kaydediliyor, setKaydediliyor] = useState(false);
  const [mesaj, setMesaj] = useState({ text: '', kind: '' });

  // Başvurulacak program için fakülte + bölüm listeleri
  const [bolumler, setBolumler] = useState([]);
  const [fakulteler, setFakulteler] = useState([]);
  useEffect(() => {
    let alive = true;
    Promise.all([
      window.apiRead('departments').catch(() => []),
      window.apiRead('faculties').catch(() => []),
    ]).then(([d, f]) => {
      if (!alive) return;
      setBolumler(d || []);
      // Aynı adlı mükerrer fakülte kayıtlarını tekille
      const gorulen = new Set();
      const temiz = [];
      (f || []).forEach((x) => {
        const anahtar = String(x.name || '')
          .toLocaleLowerCase('tr-TR')
          .replace(/\s+/g, '');
        if (!anahtar || gorulen.has(anahtar)) return;
        gorulen.add(anahtar);
        temiz.push(x);
      });
      setFakulteler(temiz.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'tr')));
    });
    return () => {
      alive = false;
    };
  }, []);

  // Seçili fakültenin bölümleri
  const hedefBolumler = useMemo(() => {
    const fid = form.basvurduguFakulteId;
    if (!fid) return [];
    return bolumler
      .filter((b) => String(b.facultyId || '') === String(fid))
      .sort((a, b) => (a.name || '').localeCompare(b.name || '', 'tr'));
  }, [bolumler, form.basvurduguFakulteId]);

  // Benim Sayfam iletişim bilgileri — varsa forma önden doldur
  useEffect(() => {
    if (!sysOgrNo) return;
    let alive = true;
    window
      .apiReadDoc('student_profiles', String(sysOgrNo))
      .then((r) => {
        if (!alive || !r || !r.exists) return;
        const p = r.data || {};
        setForm((f) => ({
          ...f,
          telefon: f.telefon || p.phone || '',
          eposta: f.eposta || p.email || '',
        }));
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [sysOgrNo]);

  // Yatay geçiş raporlarında metin alanları BÜYÜK HARF yazılır.
  const buyuk = (v) => String(v == null ? '' : v).toLocaleUpperCase('tr-TR');
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const setBuyuk = (k, v) => setForm((f) => ({ ...f, [k]: buyuk(v) }));

  const hesap = tur.hesapla ? ygYerlesmePuani(form.yksPuani, form.notOrtalamasi) : null;

  const ekYukle = async (ekId, file) => {
    setYukleniyor(ekId);
    try {
      const url = await ygDosyaYukle(file);
      if (!url) {
        setMesaj({ text: 'Dosya yüklenemedi, tekrar deneyin.', kind: 'error' });
        return;
      }
      setEkler((e) => ({ ...e, [ekId]: { url, ad: file.name } }));
      setMesaj({ text: '', kind: '' });
    } finally {
      setYukleniyor('');
    }
  };

  const eksikler = () => {
    const eksik = [];
    if (!form.aktifUniversite.trim()) eksik.push('Aktif üniversite');
    if (!form.basvurduguFakulte.trim()) eksik.push('Başvurulan fakülte');
    if (!form.basvurduguBolum.trim()) eksik.push('Başvurulan bölüm');
    if (!form.aktifBolum.trim()) eksik.push('Aktif bölüm');
    if (!form.basvurduguSinif.trim()) eksik.push('Başvurduğu sınıf');
    if (tur.notIster && !form.notOrtalamasi.trim()) eksik.push('Not ortalaması');
    if (tur.puanIster) {
      if (!form.yksPuani.trim()) eksik.push('YKS puanı');
      if (!form.yksYerlesmeYili.trim()) eksik.push('YKS yerleşme yılı');
      if (!form.yksPuanTuru.trim()) eksik.push('Puan türü');
    }
    YG_EKLER.filter((e) => e.zorunlu).forEach((e) => {
      if (!ekler[e.id]) eksik.push(e.title);
    });
    return eksik;
  };

  const gonder = async () => {
    const eksik = eksikler();
    if (eksik.length > 0) {
      setMesaj({ text: 'Eksik alanlar:\n• ' + eksik.join('\n• '), kind: 'error' });
      return;
    }
    setKaydediliyor(true);
    try {
      const kayit = {
        turu: tur.id,
        ogrenciNo: String(sysOgrNo),
        adSoyad: sysAdSoyad,
        departmentId: currentUser?.departmentId || '',
        // Aktif
        aktifUniversite: form.aktifUniversite.trim(),
        aktifFakulte: form.aktifFakulte.trim(),
        aktifBolum: form.aktifBolum.trim(),
        aktifSinif: form.aktifSinif.trim(),
        // Başvurulan
        basvurduguFakulte: form.basvurduguFakulte.trim(),
        basvurduguBolum: form.basvurduguBolum.trim(),
        basvurduguSinif: form.basvurduguSinif.trim(),
        // Yerleştirme
        yksYerlesmeYili: form.yksYerlesmeYili.trim(),
        yksPuanTuru: form.yksPuanTuru.trim(),
        yksPuani: form.yksPuani.trim(),
        notOrtalamasi: form.notOrtalamasi.trim(),
        // İletişim
        telefon: form.telefon.trim(),
        eposta: form.eposta.trim(),
        // Ekler
        ekler,
        // Durum
        degerlendirme: '',
        degerlendirmeSinif: '',
        degerlendirmeSira: '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await window.DBWrite.add('yatay_gecis_basvurular', kayit);
      setMesaj({ text: 'Başvurunuz alındı.', kind: 'ok' });
      if (onSaved) onSaved();
    } catch (e) {
      setMesaj({ text: 'Gönderilemedi: ' + e.message, kind: 'error' });
    } finally {
      setKaydediliyor(false);
    }
  };

  const sistemAlani = (etiket, deger) => (
    <div>
      <label style={ygLabel}>{etiket}</label>
      <input value={deger || '—'} disabled style={{ ...ygInput, background: '#F3F4F6' }} />
    </div>
  );

  return (
    <div>
      {/* Öğrenciden istenenler */}
      <div style={{ ...ygCard, padding: 16, marginBottom: 14 }}>
        <div style={{ fontSize: 12.5, fontWeight: 700, color: YG.navy, marginBottom: 4 }}>
          Aktif öğrenim gördüğünüz program
        </div>
        <div style={{ fontSize: 12, color: YG.textMuted, marginBottom: 10 }}>{tur.aciklama}</div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: 12,
          }}
        >
          <div>
            <label style={ygLabel}>Üniversite{icGecis ? '' : ' *'}</label>
            <input
              value={form.aktifUniversite}
              onChange={(e) => setBuyuk('aktifUniversite', e.target.value)}
              disabled={icGecis}
              style={{ ...ygInput, background: icGecis ? '#F3F4F6' : 'white' }}
            />
          </div>
          <div>
            <label style={ygLabel}>Fakülte / Yüksekokul</label>
            <input
              value={form.aktifFakulte}
              onChange={(e) => setBuyuk('aktifFakulte', e.target.value)}
              disabled={icGecis}
              style={{ ...ygInput, background: icGecis ? '#F3F4F6' : 'white' }}
            />
          </div>
          <div>
            <label style={ygLabel}>Bölüm / Program{icGecis ? '' : ' *'}</label>
            <input
              value={form.aktifBolum}
              onChange={(e) => setBuyuk('aktifBolum', e.target.value)}
              disabled={icGecis}
              style={{ ...ygInput, background: icGecis ? '#F3F4F6' : 'white' }}
            />
          </div>
          <div>
            <label style={ygLabel}>Sınıfınız</label>
            <input
              value={form.aktifSinif}
              onChange={(e) => set('aktifSinif', e.target.value)}
              placeholder="ör. 2"
              style={ygInput}
            />
          </div>
        </div>
      </div>

      {/* Başvurmak istediğiniz program */}
      <div style={{ ...ygCard, padding: 16, marginBottom: 14 }}>
        <div style={{ fontSize: 12.5, fontWeight: 700, color: YG.navy, marginBottom: 10 }}>
          Başvurmak istediğiniz program
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: 12,
          }}
        >
          <div>
            <label style={ygLabel}>Fakülte *</label>
            <select
              value={form.basvurduguFakulteId}
              onChange={(e) => {
                const fid = e.target.value;
                const fak = fakulteler.find((f) => String(f.id || f._docId) === fid);
                setForm((f) => ({
                  ...f,
                  basvurduguFakulteId: fid,
                  basvurduguFakulte: buyuk(fak?.name || ''),
                  // Fakülte değişince bölüm seçimi sıfırlanır
                  basvurduguBolum: '',
                }));
              }}
              style={{ ...ygInput, cursor: 'pointer' }}
            >
              <option value="">— Fakülte seçin —</option>
              {fakulteler.map((f) => (
                <option key={f.id || f._docId} value={f.id || f._docId}>
                  {f.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label style={ygLabel}>Bölüm / Program *</label>
            <select
              value={form.basvurduguBolum}
              onChange={(e) => setBuyuk('basvurduguBolum', e.target.value)}
              disabled={!form.basvurduguFakulteId}
              style={{
                ...ygInput,
                cursor: form.basvurduguFakulteId ? 'pointer' : 'not-allowed',
                background: form.basvurduguFakulteId ? 'white' : '#F3F4F6',
              }}
            >
              <option value="">
                {form.basvurduguFakulteId ? '— Bölüm seçin —' : 'Önce fakülte seçin'}
              </option>
              {/* Değer büyük harfe çevrilerek saklandığından option değeri de
                  büyük harf olmalı — aksi halde seçim state'e yazılır ama
                  <select> hiçbir option'la eşleşmediği için boş görünür. */}
              {hedefBolumler.map((b) => (
                <option key={b.id || b._docId} value={buyuk(b.name)}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label style={ygLabel}>Başvurduğunuz sınıf *</label>
            <input
              value={form.basvurduguSinif}
              onChange={(e) => set('basvurduguSinif', e.target.value)}
              placeholder="ör. 2"
              style={ygInput}
            />
          </div>
        </div>
      </div>

      {/* Yerleştirme / başarı bilgileri */}
      {(tur.puanIster || tur.notIster) && (
        <div style={{ ...ygCard, padding: 16, marginBottom: 14 }}>
          <div style={{ fontSize: 12.5, fontWeight: 700, color: YG.navy, marginBottom: 10 }}>
            Yerleştirme ve başarı bilgileri
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: 12,
            }}
          >
            {tur.puanIster && (
              <>
                <div>
                  <label style={ygLabel}>YKS yerleşme yılı *</label>
                  <input
                    value={form.yksYerlesmeYili}
                    onChange={(e) => set('yksYerlesmeYili', e.target.value)}
                    placeholder="ör. 2024"
                    style={ygInput}
                  />
                </div>
                <div>
                  <label style={ygLabel}>Yerleştiği puan türü *</label>
                  <input
                    value={form.yksPuanTuru}
                    onChange={(e) => setBuyuk('yksPuanTuru', e.target.value)}
                    placeholder="ör. SAY"
                    style={ygInput}
                  />
                </div>
                <div>
                  <label style={ygLabel}>YKS puanı *</label>
                  <input
                    value={form.yksPuani}
                    onChange={(e) => set('yksPuani', e.target.value)}
                    placeholder="ör. 385,412"
                    style={ygInput}
                  />
                </div>
              </>
            )}
            {tur.notIster && (
              <div>
                <label style={ygLabel}>Not ortalaması (AGNO) — 100&apos;lük *</label>
                <input
                  value={form.notOrtalamasi}
                  onChange={(e) => set('notOrtalamasi', e.target.value.replace(/[^\d.,]/g, ''))}
                  placeholder="ör. 76,50"
                  style={ygInput}
                />
                <div style={{ fontSize: 11, color: YG.textMuted, marginTop: 3 }}>
                  Yalnızca 100&apos;lük sistemde girilir (0-100).
                </div>
              </div>
            )}
          </div>

          {/* Kurumlararası: yerleştirmeye esas puan canlı hesaplanır */}
          {tur.hesapla && hesap && (
            <div
              style={{
                marginTop: 12,
                padding: '10px 12px',
                background: YG.accentPale,
                border: '1px solid ' + YG.accent + '44',
                borderRadius: 8,
                fontSize: 12.5,
                color: '#7c4a03',
                lineHeight: 1.6,
              }}
            >
              Yerleştirmeye esas puanınız otomatik hesaplanır:{' '}
              <b>
                {hesap.p40} (YKS %40) + {hesap.n60} (AGNO %60) = {hesap.toplam}
              </b>
              <br />
              Nihai değeri komisyon doğrular.
            </div>
          )}
        </div>
      )}

      {/* Zorunlu ekler */}
      <div style={{ ...ygCard, padding: 16, marginBottom: 14 }}>
        <div style={{ fontSize: 12.5, fontWeight: 700, color: YG.navy, marginBottom: 10 }}>
          Başvuru ekleri
        </div>
        <div style={{ fontSize: 11.5, color: YG.textMuted, marginBottom: 10 }}>
          Tüm ekler <b>PDF</b> olarak yüklenir.
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {YG_EKLER.map((ek) => {
            const yuklu = ekler[ek.id];
            return (
              <div
                key={ek.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  flexWrap: 'wrap',
                  padding: '10px 12px',
                  border: '1px ' + (yuklu ? 'solid ' + YG.green : 'dashed ' + YG.border),
                  borderRadius: 10,
                  background: yuklu ? YG.greenLight + '55' : 'white',
                }}
              >
                <div style={{ flex: '1 1 240px', minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: YG.text }}>
                    {ek.title}
                    {ek.zorunlu ? ' *' : ''}
                  </div>
                  {ek.aciklama && (
                    <div style={{ fontSize: 11.5, color: YG.textMuted, marginTop: 2 }}>
                      {ek.aciklama}
                    </div>
                  )}
                  {yuklu && (
                    <div style={{ fontSize: 11.5, color: YG.green, marginTop: 3, fontWeight: 600 }}>
                      {yuklu.ad}
                    </div>
                  )}
                </div>
                <label style={{ ...ygBtn(false), cursor: 'pointer' }}>
                  <input
                    type="file"
                    accept=".pdf,application/pdf"
                    style={{ display: 'none' }}
                    onChange={(e) => {
                      const f = (e.target.files && e.target.files[0]) || null;
                      e.target.value = '';
                      if (!f) return;
                      // Yalnız PDF: akademisyen belgeleri yan panelde
                      // görüntüleyebilsin diye tek biçim kabul edilir.
                      if (f.type !== 'application/pdf' && !/\.pdf$/i.test(f.name)) {
                        setMesaj({
                          text: 'Yalnızca PDF dosyası yükleyebilirsiniz.',
                          kind: 'error',
                        });
                        return;
                      }
                      ekYukle(ek.id, f);
                    }}
                  />
                  {yukleniyor === ek.id ? 'Yükleniyor…' : yuklu ? 'Değiştir' : 'Dosya Seç'}
                </label>
              </div>
            );
          })}
        </div>
      </div>

      {mesaj.text && (
        <div
          style={{
            padding: '10px 14px',
            borderRadius: 10,
            marginBottom: 12,
            whiteSpace: 'pre-wrap',
            fontSize: 13,
            background: mesaj.kind === 'ok' ? YG.greenLight : YG.redLight,
            color: mesaj.kind === 'ok' ? '#065F46' : '#991B1B',
            border: '1px solid ' + (mesaj.kind === 'ok' ? YG.green : YG.red) + '44',
          }}
        >
          {mesaj.text}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button onClick={gonder} disabled={kaydediliyor} style={ygBtn(true)}>
          {kaydediliyor ? 'Gönderiliyor…' : 'Başvuruyu Gönder'}
        </button>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// Başvuru satırı — öğrencide bilgi kartı, akademisyende değerlendirme
// ══════════════════════════════════════════════════════════════
function YgBasvuruKarti({ rec, tur, isStaff, onDegerlendir, busy }) {
  const [acik, setAcik] = useState(false);
  // Akademisyende yan panelde açılan ek (PDF)
  const [acikEk, setAcikEk] = useState('');
  const deg = YG_DEGERLENDIRME.find((d) => d.id === rec.degerlendirme);
  const st = rec.degerlendirme ? YG_DURUMLAR.degerlendirildi : YG_DURUMLAR.beklemede;
  const hesap = tur?.hesapla ? ygYerlesmePuani(rec.yksPuani, rec.notOrtalamasi) : null;

  // Etiket üstte, değer altta — sütunlar eşit genişlikte, satırlar hizalı.
  const satir = (k, v) =>
    v ? (
      <div key={k} style={{ minWidth: 0 }}>
        <div
          style={{
            fontSize: 10.5,
            fontWeight: 600,
            color: YG.textMuted,
            textTransform: 'uppercase',
            letterSpacing: 0.3,
            marginBottom: 2,
          }}
        >
          {k}
        </div>
        <div
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: YG.text,
            wordBreak: 'break-word',
          }}
        >
          {v}
        </div>
      </div>
    ) : null;

  return (
    <div style={{ ...ygCard, padding: 0, overflow: 'hidden' }}>
      <div
        onClick={() => setAcik(!acik)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '14px 18px',
          cursor: 'pointer',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: YG.navy }}>
            {rec.adSoyad || '—'}
            {rec.ogrenciNo ? '  ·  ' + rec.ogrenciNo : ''}
          </div>
          <div style={{ fontSize: 11.5, color: YG.textMuted, marginTop: 3 }}>
            {[rec.aktifUniversite, rec.aktifBolum].filter(Boolean).join(' / ')}
            {rec.basvurduguSinif ? '  →  ' + rec.basvurduguSinif + '. sınıf' : ''}
          </div>
        </div>
        {hesap && <span style={ygPill(YG.navy, YG.bg)}>Yerleşme puanı: {hesap.toplam}</span>}
        <span style={ygPill(st.color, st.bg)}>
          {rec.degerlendirme ? ygDegerlendirmeMetni(rec) || st.label : st.label}
        </span>
        <span style={{ color: YG.textMuted, fontSize: 11.5, fontWeight: 600 }}>
          {acik ? 'Gizle' : 'Detaylar'}
        </span>
      </div>

      {acik && (
        <div style={{ padding: '0 18px 16px', borderTop: '1px solid ' + YG.border }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
              gap: '14px 18px',
              margin: '16px 0',
              padding: '14px 16px',
              background: YG.bg,
              borderRadius: 10,
            }}
          >
            {satir('Aktif üniversite', rec.aktifUniversite)}
            {satir('Aktif fakülte', rec.aktifFakulte)}
            {satir('Aktif bölüm', rec.aktifBolum)}
            {satir('Sınıfı', rec.aktifSinif)}
            {satir('Başvurduğu fakülte', rec.basvurduguFakulte)}
            {satir('Başvurduğu bölüm', rec.basvurduguBolum)}
            {satir('Başvurduğu sınıf', rec.basvurduguSinif)}
            {satir('YKS yerleşme yılı', rec.yksYerlesmeYili)}
            {satir('Puan türü', rec.yksPuanTuru)}
            {satir('YKS puanı', rec.yksPuani)}
            {satir('Not ortalaması', rec.notOrtalamasi)}
            {hesap && satir('YKS %40', hesap.p40)}
            {hesap && satir('AGNO %60', hesap.n60)}
            {satir('Telefon', rec.telefon)}
            {satir('E-posta', rec.eposta)}
          </div>

          {/* Ekler — akademisyende seçilen belge YAN PANELDE açılır (PDF) */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: isStaff && acikEk ? 'minmax(0,260px) minmax(0,1fr)' : '1fr',
              gap: 12,
              marginBottom: 14,
              alignItems: 'start',
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {YG_EKLER.map((ek) => {
                const f = (rec.ekler || {})[ek.id];
                if (!f) {
                  return (
                    <span
                      key={ek.id}
                      style={{ ...ygPill(YG.textMuted, YG.bg), textAlign: 'center' }}
                    >
                      {ek.title} — yok
                    </span>
                  );
                }
                const secili = acikEk === ek.id;
                return (
                  <div key={ek.id} style={{ display: 'flex', gap: 6 }}>
                    {isStaff && (
                      <button
                        type="button"
                        onClick={() => setAcikEk(secili ? '' : ek.id)}
                        style={{
                          flex: 1,
                          textAlign: 'left',
                          fontSize: 12,
                          fontWeight: 600,
                          color: secili ? '#7c4a03' : YG.accent,
                          border: '1px solid ' + YG.accent + (secili ? '' : '55'),
                          background: secili ? YG.accentPale : 'white',
                          borderRadius: 8,
                          padding: '6px 10px',
                          cursor: 'pointer',
                          fontFamily: 'inherit',
                        }}
                      >
                        {ek.title}
                      </button>
                    )}
                    <a
                      href={ygFileHref(f.url)}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        fontSize: 12,
                        fontWeight: 600,
                        color: YG.navy,
                        border: '1px solid ' + YG.border,
                        background: 'white',
                        borderRadius: 8,
                        padding: '6px 10px',
                        textDecoration: 'none',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {isStaff ? 'İndir' : ek.title}
                    </a>
                  </div>
                );
              })}
            </div>

            {isStaff && acikEk && (rec.ekler || {})[acikEk] && (
              <div
                style={{
                  border: '1px solid ' + YG.border,
                  borderRadius: 10,
                  overflow: 'hidden',
                  background: YG.bg,
                }}
              >
                <div
                  style={{
                    padding: '7px 12px',
                    background: 'white',
                    borderBottom: '1px solid ' + YG.border,
                    fontSize: 12,
                    fontWeight: 700,
                    color: YG.navy,
                  }}
                >
                  {(YG_EKLER.find((e) => e.id === acikEk) || {}).title}
                </div>
                <iframe
                  title="ek-onizleme"
                  src={String((rec.ekler || {})[acikEk].url || '')
                    .replace('/api/files/download/', '/api/files/view/')
                    .replace(/\?download=true$/, '')}
                  style={{ width: '100%', height: 420, border: 'none', background: 'white' }}
                />
              </div>
            )}
          </div>

          {/* Akademisyen: DEĞERLENDİRME (belgedeki son sütun) */}
          {isStaff && (
            <div
              style={{
                border: '1px solid ' + YG.border,
                borderRadius: 10,
                padding: 14,
                background: YG.bg,
              }}
            >
              <div style={{ fontSize: 12.5, fontWeight: 700, color: YG.navy, marginBottom: 10 }}>
                Değerlendirme — belgedeki &quot;Değerlendirme Sonucu&quot; sütununa yazılır
              </div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
                  gap: 10,
                }}
              >
                <div>
                  <label style={ygLabel}>Sonuç</label>
                  <select
                    value={rec.degerlendirme || ''}
                    disabled={busy}
                    onChange={(e) => onDegerlendir(rec, { degerlendirme: e.target.value })}
                    style={{ ...ygInput, cursor: 'pointer' }}
                  >
                    {YG_DEGERLENDIRME.map((d) => (
                      <option key={d.id || 'bos'} value={d.id}>
                        {d.label}
                      </option>
                    ))}
                  </select>
                </div>
                {deg && deg.sinifSorar && (
                  <div>
                    <label style={ygLabel}>Sınıf</label>
                    <input
                      value={rec.degerlendirmeSinif || ''}
                      disabled={busy}
                      onChange={(e) => onDegerlendir(rec, { degerlendirmeSinif: e.target.value })}
                      placeholder="ör. 1. SINIF"
                      style={ygInput}
                    />
                  </div>
                )}
                {deg && deg.siraSorar && (
                  <div>
                    <label style={ygLabel}>Sıra</label>
                    <input
                      value={rec.degerlendirmeSira || ''}
                      disabled={busy}
                      onChange={(e) => onDegerlendir(rec, { degerlendirmeSira: e.target.value })}
                      placeholder="ör. 1"
                      style={ygInput}
                    />
                  </div>
                )}
              </div>
              {rec.degerlendirme && (
                <div style={{ fontSize: 12, color: YG.textMuted, marginTop: 8 }}>
                  Belgeye yazılacak: <b style={{ color: YG.navy }}>{ygDegerlendirmeMetni(rec)}</b>
                </div>
              )}
            </div>
          )}

          {/* Öğrenci: kendi değerlendirme sonucu */}
          {!isStaff && rec.degerlendirme && (
            <div
              style={{
                padding: '10px 12px',
                borderRadius: 10,
                background: YG.greenLight + '66',
                border: '1px solid ' + YG.green + '44',
                fontSize: 13,
                color: '#065F46',
              }}
            >
              Değerlendirme sonucunuz: <b>{ygDegerlendirmeMetni(rec)}</b>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// Ana bileşen
// ══════════════════════════════════════════════════════════════
function YatayGecisApp({ currentUser, activeDepartment, departmentInfo }) {
  const isStudent = currentUser?.role === 'student';
  const isStaff = !isStudent;

  const [turId, setTurId] = useState('kurumici');
  const tur = YG_TURLER.find((t) => t.id === turId) || YG_TURLER[0];
  const [sekme, setSekme] = useState(isStudent ? 'yeni' : 'basvurular');

  const [kayitlar, setKayitlar] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  // Üretilen raporun belge kimliği — "Memura Gönder" düğmesi bununla çalışır.
  const [uretilenBelge, setUretilenBelge] = useState(null);
  const [belgeUretiliyor, setBelgeUretiliyor] = useState(false);

  const yukle = useCallback(async () => {
    setLoading(true);
    try {
      const read = window.apiRead.fresh || window.apiRead;
      const list = (await read('yatay_gecis_basvurular')) || [];
      setKayitlar(Array.isArray(list) ? list : []);
    } catch (e) {
      console.error('yatay geçiş kayıtları okunamadı:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    yukle();
  }, [yukle]);

  // Kapsam: öğrenci yalnız kendi başvurularını, personel bölümünün
  // başvurularını görür. Seçili geçiş türüne göre süzülür.
  const gorunen = useMemo(() => {
    const myNo = String(currentUser?.studentNumber || currentUser?.identifier || '');
    return kayitlar
      .filter((r) => (r.turu || 'kurumici') === turId)
      .filter((r) => {
        if (isStudent) return String(r.ogrenciNo || '') === myNo;
        if (!activeDepartment) return true;
        return !r.departmentId || r.departmentId === activeDepartment;
      })
      .sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
  }, [kayitlar, turId, isStudent, currentUser, activeDepartment]);

  const degerlendirilmemis = gorunen.filter((r) => !r.degerlendirme).length;
  const belgeHazir = gorunen.length > 0 && degerlendirilmemis === 0;

  const kaydetDegerlendirme = async (rec, patch) => {
    setBusy(true);
    try {
      const docId = rec.id || rec._docId;
      await window.DBWrite.set(
        'yatay_gecis_basvurular',
        String(docId),
        { ...patch, updatedAt: new Date().toISOString() },
        true
      );
      setKayitlar((prev) =>
        prev.map((r) => ((r.id || r._docId) === docId ? { ...r, ...patch } : r))
      );
    } catch (e) {
      alert('Kaydedilemedi: ' + e.message);
    } finally {
      setBusy(false);
    }
  };

  // ── Değerlendirme raporu (tüm başvuranlar tek belgede) ──
  const belgeOlustur = async () => {
    if (!window.TemplateEngine || !window.TemplateEngine.produceFromTemplate) {
      alert('Şablon motoru yüklenemedi.');
      return;
    }
    setBelgeUretiliyor(true);
    try {
      const bolumAd = departmentInfo?.name || '';
      const bugun = new Date();
      const yil = bugun.getMonth() >= 7 ? bugun.getFullYear() : bugun.getFullYear() - 1;
      const egitimYili = yil + '-' + (yil + 1);
      const donem = bugun.getMonth() >= 7 || bugun.getMonth() <= 0 ? 'GÜZ' : 'BAHAR';

      const rows = gorunen.map((r) => {
        const h = tur.hesapla ? ygYerlesmePuani(r.yksPuani, r.notOrtalamasi) : null;
        return {
          adSoyad: r.adSoyad || '',
          aktifUniversite: r.aktifUniversite || '',
          aktifFakulte: r.aktifFakulte || '',
          aktifBolum: r.aktifBolum || '',
          basvurduguBolum: r.basvurduguBolum || bolumAd,
          basvurduguSinif: r.basvurduguSinif || '',
          basvurduguYariyil: egitimYili + ' ' + donem,
          yksYerlesmeYili: r.yksYerlesmeYili || '',
          yksPuanTuru: r.yksPuanTuru || '',
          yksPuani: r.yksPuani || '',
          notOrtalamasi: r.notOrtalamasi || '',
          yksPuaniYuzde40: h ? String(h.p40) : '',
          notOrtYuzde60: h ? String(h.n60) : '',
          yerlesmePuani: h ? String(h.toplam) : '',
          basvurduguBolumOsysPuani: r.basvurduguBolumOsysPuani || '',
          degerlendirme: ygDegerlendirmeMetni(r),
        };
      });

      // Şablonlar .xlsx — satır çoğaltmalı xlsx üreticisi kullanılır.
      const res = await window.TemplateEngine.produceRowsXlsx({
        module: 'yataygecis',
        docType: turId,
        departmentId: activeDepartment || '',
        staticData: {
          egitimYili,
          donem,
          basvurulanBolum: bolumAd,
          fakulteAd: window.TENANT?.facultyName || 'Mühendislik Fakültesi',
          tarih: bugun.toLocaleDateString('tr-TR'),
        },
        rows,
        filename:
          'Yatay_Gecis_' + turId + '_' + (bolumAd || 'bolum').replace(/\s+/g, '_') + '.xlsx',
        noDownload: true,
      });

      if (!res.ok) {
        if (res.reason === 'not-xlsx') {
          alert('Bu geçiş türüne atanan şablon .xlsx değil. Şablonu .xlsx olarak yükleyin.');
        } else if (res.reason === 'no-template') {
          alert(
            'Bu geçiş türü için şablon atanmamış.\n\nŞablonlar → Yatay Geçiş → "' +
              tur.tamAd +
              '" altına şablonu yükleyip alanları eşleyin.'
          );
        } else if (res.reason === 'no-mapping') {
          alert('Şablonun alan eşlemesi yapılmamış (Şablonlar → Alanlar).');
        } else {
          alert('Belge üretilemedi: ' + (res.message || res.reason));
        }
        return;
      }

      // Snapshot sakla ve önizlemeyi aç
      let url = '';
      try {
        if (window.uploadGeneratedDoc && window.recordMemurOutput) {
          url = (await window.uploadGeneratedDoc(res.blob, res.filename, 'yatay_gecis')) || '';
          if (url) {
            await window.recordMemurOutput({
              module: 'yataygecis',
              sourceId: turId + ':' + (activeDepartment || 'bolum') + ':' + egitimYili + donem,
              title: tur.tamAd + ' — ' + (bolumAd || 'Bölüm'),
              subtitle: egitimYili + ' ' + donem + ' · ' + gorunen.length + ' başvuru',
              url,
              departmentId: activeDepartment || '',
            });
          }
        }
      } catch (e) {
        console.warn('Yatay geçiş snapshot kaydedilemedi:', e && e.message);
      }

      // .xlsx docx önizleyici ile gösterilemez; dosya doğrudan indirilir ve
      // gönderim için belge kimliği saklanır.
      window.TemplateEngine.downloadBlob(res.blob, res.filename);
      setUretilenBelge(
        url
          ? {
              module: 'yataygecis',
              docType: turId,
              sourceId: turId + ':' + (activeDepartment || 'bolum') + ':' + egitimYili + donem,
              title: tur.tamAd + ' — ' + (bolumAd || 'Bölüm'),
              subtitle: egitimYili + ' ' + donem,
              url,
              departmentId: activeDepartment || '',
            }
          : null
      );
      setMsg('Rapor indirildi (' + (res.rowCount || 0) + ' satır).');
      setTimeout(() => setMsg(''), 5000);
    } catch (e) {
      alert('Belge üretilemedi: ' + e.message);
    } finally {
      setBelgeUretiliyor(false);
    }
  };

  const sekmeler = isStudent
    ? [
        { id: 'yeni', label: 'Yeni Başvuru' },
        { id: 'basvurular', label: 'Başvurularım' },
      ]
    : [{ id: 'basvurular', label: 'Başvurular' }];

  if (loading) {
    return <div style={{ padding: 60, textAlign: 'center', color: YG.textMuted }}>Yükleniyor…</div>;
  }

  return (
    <div
      style={{
        fontFamily: "'Inter', sans-serif",
        color: YG.text,
        maxWidth: 1400,
        margin: '0 auto',
        padding: '0 4px 40px',
      }}
    >
      {window.CakuBanner &&
        React.createElement(window.CakuBanner, {
          title: 'Yatay Geçiş',
          subtitle: tur.tamAd,
        })}

      {/* Başvuru türü seçici — ÇAP/Yandal ile aynı desen */}
      <div style={{ display: 'flex', gap: 10, margin: '18px 0 20px', flexWrap: 'wrap' }}>
        {YG_TURLER.map((t) => {
          const sel = turId === t.id;
          const cnt = kayitlar.filter((r) => (r.turu || 'kurumici') === t.id).length;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => {
                setTurId(t.id);
                setSekme(isStudent ? 'yeni' : 'basvurular');
              }}
              style={{
                flex: '1 1 300px',
                textAlign: 'left',
                padding: '16px 18px',
                borderRadius: 12,
                cursor: 'pointer',
                border: (sel ? '2px solid ' : '1px solid ') + (sel ? t.color : YG.border),
                borderLeft: '3px solid ' + (sel ? t.color : YG.border),
                background: sel ? t.bg : 'white',
                fontFamily: 'inherit',
              }}
            >
              <span
                style={{
                  display: 'block',
                  fontSize: 15.5,
                  fontWeight: 700,
                  color: sel ? t.color : YG.text,
                  marginBottom: 5,
                }}
              >
                {t.label}
              </span>
              <span style={{ fontSize: 11.5, color: YG.textMuted }}>
                {t.aciklama}
                {cnt ? '  ·  ' + cnt + ' kayıt' : ''}
              </span>
            </button>
          );
        })}
      </div>

      {/* Alt sekmeler */}
      {sekmeler.length > 1 && (
        <div
          style={{
            display: 'flex',
            gap: 4,
            marginBottom: 16,
            borderBottom: '1px solid ' + YG.border,
          }}
        >
          {sekmeler.map((s) => {
            const on = sekme === s.id;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => setSekme(s.id)}
                style={{
                  padding: '10px 16px',
                  background: 'none',
                  border: 'none',
                  borderBottom: '2px solid ' + (on ? YG.accent : 'transparent'),
                  color: on ? YG.accent : YG.textMuted,
                  fontWeight: on ? 700 : 500,
                  fontSize: 13.5,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                {s.label}
              </button>
            );
          })}
        </div>
      )}

      {msg && (
        <div style={{ fontSize: 12.5, color: YG.green, fontWeight: 600, marginBottom: 10 }}>
          {msg}
        </div>
      )}

      {/* Öğrenci: yeni başvuru */}
      {isStudent && sekme === 'yeni' && (
        <YgBasvuruFormu
          key={turId}
          tur={tur}
          currentUser={currentUser}
          departmentInfo={departmentInfo}
          onSaved={() => {
            setMsg('Başvurunuz alındı.');
            setSekme('basvurular');
            yukle();
            setTimeout(() => setMsg(''), 3000);
          }}
        />
      )}

      {/* Başvuru listesi */}
      {sekme === 'basvurular' && (
        <>
          {/* Akademisyen: belge üretimi — tüm başvurular değerlendirilince açılır */}
          {isStaff && gorunen.length > 0 && (
            <div
              style={{
                ...ygCard,
                padding: '12px 16px',
                marginBottom: 14,
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                flexWrap: 'wrap',
              }}
            >
              <div style={{ flex: '1 1 260px', fontSize: 12.5, color: YG.textMuted }}>
                {belgeHazir ? (
                  <>
                    Tüm başvurular değerlendirildi.{' '}
                    <b style={{ color: YG.navy }}>{gorunen.length} başvuru</b> için değerlendirme
                    raporu üretilebilir.
                  </>
                ) : (
                  <>
                    <b style={{ color: YG.accent }}>{degerlendirilmemis} başvuru</b> henüz
                    değerlendirilmedi. Belge, tüm başvurular değerlendirildiğinde üretilebilir.
                  </>
                )}
              </div>
              <button
                onClick={belgeOlustur}
                disabled={!belgeHazir || belgeUretiliyor}
                title={belgeHazir ? '' : 'Önce tüm başvuruları değerlendirin'}
                style={{
                  ...ygBtn(belgeHazir),
                  opacity: belgeHazir ? 1 : 0.5,
                  cursor: belgeHazir ? 'pointer' : 'not-allowed',
                }}
              >
                {belgeUretiliyor ? 'Üretiliyor…' : 'Belge Oluştur'}
              </button>
              {uretilenBelge && (
                <button
                  onClick={async () => {
                    try {
                      if (window.belgeOtoYonlendir) await window.belgeOtoYonlendir(uretilenBelge);
                      setMsg('Rapor memura gönderildi.');
                      setTimeout(() => setMsg(''), 4000);
                    } catch (e) {
                      alert('Gönderilemedi: ' + e.message);
                    }
                  }}
                  style={ygBtn(false)}
                >
                  Memura Gönder
                </button>
              )}
            </div>
          )}

          {gorunen.length === 0 ? (
            <div
              style={{
                ...ygCard,
                border: '1px dashed ' + YG.border,
                padding: 44,
                textAlign: 'center',
                color: YG.textMuted,
                fontSize: 13.5,
                lineHeight: 1.6,
              }}
            >
              {isStudent
                ? 'Bu geçiş türünde henüz başvurunuz yok.'
                : 'Bu geçiş türünde başvuru bulunmuyor.'}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {gorunen.map((r) => (
                <YgBasvuruKarti
                  key={r.id || r._docId}
                  rec={r}
                  tur={tur}
                  isStaff={isStaff}
                  busy={busy}
                  onDegerlendir={kaydetDegerlendirme}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

window.YatayGecisApp = YatayGecisApp;
