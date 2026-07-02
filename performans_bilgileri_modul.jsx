import { useState, useMemo, useEffect } from 'react';

// ═══════════════════════════════════════════════════════════════
// ÇAKÜ — PERFORMANS BİLGİLERİ MODÜLÜ
// 3 Katmanlı: Akademisyen → Bölüm Yetkilisi → Fakülte Yetkilisi
// Sadece Gösterge İzleme: Yıl bazlı, 12 ay yan yana
// ═══════════════════════════════════════════════════════════════

const GOSTERGELER = [
  {
    kategori: 'YÜKSEKÖĞRETİMDE BİLİMSEL ARAŞTIRMA GELİŞTİRME',
    hedef: 'Yükseköğretim Kurumlarında inovasyon amaçlı bilimsel çalışmaların arttırılması',
    gostergeler: [
      { id: 'g1', ad: 'Öğretim elemanı sayısı', birim: 'Sayı', aggType: 'sum' },
      { id: 'g2', ad: 'Ar-ge proje sayısı', birim: 'Sayı', aggType: 'sum' },
      {
        id: 'g3',
        ad: 'Uluslararası endekslerde yer alan bilimsel yayın sayısı',
        birim: 'Sayı',
        aggType: 'sum',
      },
    ],
  },
  {
    kategori: 'YÜKSEKÖĞRETİM KURUMLARI SÜREKLİ EĞİTİM FAALİYETLERİ',
    hedef: 'Toplumun tüm kesimlerine ihtiyaç duyduğu alanlarda eğitimler verilmesi',
    gostergeler: [
      {
        id: 'g4',
        ad: 'Dezavantajlı gruplara yönelik sosyal entegrasyon ve kapsayıcılığa ilişkin yapılan faaliyet sayısı',
        birim: 'Sayı',
        aggType: 'sum',
      },
    ],
  },
  {
    kategori: 'ÖĞRETİM ELEMANLARININ MESLEKİ GELİŞİMİ',
    hedef: 'Alanında yetkin araştırmacı bilgi üreten ve aktaran akademisyenler yetiştirilmesi',
    gostergeler: [
      {
        id: 'g5',
        ad: 'SCI, SCI-Expanded, SSCI ve AHCI kapsamındaki dergilerdeki yayın sayısı',
        birim: 'Sayı',
        aggType: 'sum',
      },
    ],
  },
  {
    kategori: 'ÖNLİSANS EĞİTİMİ LİSANS EĞİTİMİ VE LİSANSÜSTÜ EĞİTİMİ',
    hedef: 'Mesleki yeterlilik sahibi ve gelişime açık mezunlar yetiştirilmesi',
    gostergeler: [
      { id: 'g6', ad: 'Lisansüstü öğrenci sayısı', birim: 'Sayı', aggType: 'sum' },
      { id: 'g7', ad: 'Öğrenci başına düşen eğitim alanı', birim: 'm²', aggType: 'fixed' },
      { id: 'g8', ad: 'Öğrenci başına düşen kapalı alan', birim: 'm²', aggType: 'fixed' },
      {
        id: 'g9',
        ad: 'Öğrenci değişim programlarından yararlanan öğrencilerin oranı',
        birim: 'Oran',
        aggType: 'fixed',
      },
      { id: 'g10', ad: 'Öğrenci sayısı', birim: 'Sayı', aggType: 'sum' },
      { id: 'g11', ad: 'Öğretim üyesi sayısı', birim: 'Sayı', aggType: 'sum' },
      { id: 'g12', ad: 'Yabancı uyruklu öğrenci sayısı', birim: 'Sayı', aggType: 'sum' },
    ],
  },
  {
    kategori: 'YÜKSEKÖĞRETİMDE ÖĞRENCİ YAŞAMI',
    hedef: 'Öğrencilere sunulan beslenme ve barınma hizmetlerinin kalitesinin arttırılması',
    gostergeler: [
      { id: 'g13', ad: 'Öğrenci kulüp ve topluluk sayısı', birim: 'Sayı', aggType: 'sum' },
    ],
  },
];

// 12 ay — tabloda sütun olarak yan yana
const AYLAR = [
  'OCAK',
  'ŞUBAT',
  'MART',
  'NİSAN',
  'MAYIS',
  'HAZİRAN',
  'TEMMUZ',
  'AĞUSTOS',
  'EYLÜL',
  'EKİM',
  'KASIM',
  'ARALIK',
];

// Yıl seçici için sabit aralık: 2026–2031
const YILLAR = ['2026', '2027', '2028', '2029', '2030', '2031'];

// Toplama tipleri — bölüm/fakülte özetinde her gösterge için ayarlanabilir
const AGG_TYPES = [
  { id: 'sum', label: 'Topla' },
  { id: 'fixed', label: 'Sabit' },
  { id: 'avg', label: 'Ortalama' },
  { id: 'max', label: 'Maks.' },
];

const findGosterge = (id) => {
  for (const k of GOSTERGELER) for (const g of k.gostergeler) if (g.id === id) return g;
  return null;
};

// Sayısal değeri göstergenin birimine göre biçimlendir.
// Örn birim='Oran' → "%15", birim='m²' → "15 m²"
function formatValue(v, birim) {
  if (v == null || v === '—' || v === '') return '—';
  const num = typeof v === 'number' ? v : parseFloat(v);
  if (isNaN(num)) return v;
  const rounded = Number.isInteger(num) ? num : Math.round(num * 100) / 100;
  if (birim === 'Oran') return `%${rounded}`;
  if (birim === 'm²') return `${rounded} m²`;
  return rounded;
}

// Aggregation uygulaması — sum/fixed/avg/max
function aggregate(vals, aggType) {
  if (!vals || vals.length === 0) return null;
  if (aggType === 'fixed') return vals[0];
  if (aggType === 'avg') return vals.reduce((a, b) => a + b, 0) / vals.length;
  if (aggType === 'max') return Math.max(...vals);
  return vals.reduce((a, b) => a + b, 0); // sum
}

// ── Akademisyen verileri 'professors' koleksiyonundan yüklenir ──

// ── Renk Paleti (site ile uyumlu — açık tema) ──
const C = {
  bg: '#F7F5F0',
  surface: '#FFFFFF',
  surfaceAlt: '#F8F6F1',
  border: '#E5E1D8',
  borderLight: '#F0EDE6',
  accent: '#1B2A4A',
  accentDark: '#152238',
  accentGlow: 'rgba(27,42,74,0.06)',
  text: '#2C2C2C',
  textMuted: '#6B7280',
  textDim: '#9CA3AF',
  white: '#FFFFFF',
  success: '#2E7D52',
  successDim: 'rgba(46,125,82,0.08)',
  warning: '#C4973B',
  danger: '#8B2635',
  yellow: '#C4973B',
  yellowDim: 'rgba(196,151,59,0.08)',
  yellowBorder: 'rgba(196,151,59,0.30)',
  purple: '#6366F1',
  purpleDim: 'rgba(99,102,241,0.06)',
  orange: '#D97706',
  orangeDim: 'rgba(217,119,6,0.06)',
  headerBg: 'linear-gradient(135deg, #1B2A4A 0%, #2D4A7A 100%)',
};
const F = "'Inter', 'Segoe UI', -apple-system, sans-serif";

// ════════════════ ANA MODÜL ════════════════
export default function PerformansBilgileri({ currentUser, activeDepartment, departmentInfo }) {
  // Akademisyen listesi (API'den yüklenir)
  const [akademisyenlerList, setAkademisyenlerList] = useState([]);
  const [loadingAkad, setLoadingAkad] = useState(true);

  // ── YETKİ MANTIĞI ──
  // Bir kullanıcı AYNI ANDA akademisyen + bölüm yetkilisi + fakülte yetkilisi
  // olabilir. Her yetki katmanı için ayrı bayrak; görünüm sekmesi buna göre.
  const isUniAdmin = !!currentUser?.isUniversityAdmin;
  const isFacMgr = !!currentUser?.isFacultyManager;
  const isDeptMgr = currentUser?.role === 'bolum_yetkilisi' || !!currentUser?.isDeptManager;

  // Rol etiketi (header rozeti için)
  const roleLabel = isUniAdmin
    ? 'Üniversite Yetkilisi'
    : isFacMgr
      ? 'Fakülte Yetkilisi'
      : isDeptMgr
        ? 'Bölüm Yetkilisi'
        : 'Akademisyen';

  const [selectedBolum, setSelectedBolum] = useState('');

  // Yıl seçimi (dönem YOK — 12 ay yan yana)
  const _thisYear = String(new Date().getFullYear());
  const [selectedYil, setSelectedYil] = useState(
    YILLAR.includes(_thisYear) ? _thisYear : YILLAR[0]
  );
  // periodKey: yalnızca Yıl + Ay
  const pKey = (yil, gId, ay) => `${yil}_${gId}_${ay}`;

  // Akademisyen verileri: { [akademisyenId]: { [yil_gostergeId_AY]: value } }
  const [akademisyenData, setAkademisyenData] = useState({});

  // Bölüm yetkilisi: toplama kuralları (sum/fixed override)
  const [aggOverrides, setAggOverrides] = useState({}); // { [gostergeId]: "sum" | "fixed" }

  const [toast, setToast] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  // Sunucudan yüklenen "temel" durum — kaydet öncesi diff için karşılaştırma zemini.
  // Kaydet çağrıldığında sadece değişen hücreler backend'e yazılır.
  const [baselineData, setBaselineData] = useState({});
  const flash = (m) => {
    setToast(m);
    setTimeout(() => setToast(''), 3000);
  };

  // ── Backend'den veri yükle (performance_data + performance_agg_rules) ──
  // localStorage yerine artık MongoDB'de saklanıyor. Bir akademisyenin girdiği
  // değeri bölüm/fakülte yetkilisi kendi tarayıcısında görebilsin diye
  // her kullanıcı tüm ilgili veriyi çeker.
  useEffect(() => {
    const load = async () => {
      try {
        const [rows, rules] = await Promise.all([
          window.apiRead('performance_data').catch(() => []),
          window.apiRead('performance_agg_rules').catch(() => []),
        ]);
        // Rows → akademisyenData şekline dönüştür
        const nested = {};
        (Array.isArray(rows) ? rows : []).forEach((r) => {
          if (!r || !r.akademisyenId || !r.gostergeId || !r.yil || !r.ay) return;
          const k = `${r.yil}_${r.gostergeId}_${r.ay}`;
          if (!nested[r.akademisyenId]) nested[r.akademisyenId] = {};
          nested[r.akademisyenId][k] = r.value == null ? '' : String(r.value);
        });
        setAkademisyenData(nested);
        setBaselineData(nested);

        // Kurallar → aggOverrides (şu an kullanıcının aktif scope'una göre)
        // NOT: view değiştiğinde ayrıca override map yeniden hesaplanır.
        const flat = {};
        (Array.isArray(rules) ? rules : []).forEach((r) => {
          if (!r || !r.gostergeId || !r.aggType) return;
          // Basit indeks: scope+scopeId+gostergeId → aggType.
          // Runtime'da scopeKey ile filtreleyip aggregate uygulanır.
          flat[`${r.scope}::${r.scopeId}::${r.gostergeId}`] = r.aggType;
        });
        setAggOverrides(flat);
      } catch (e) {
        console.error('Performans verileri yüklenemedi:', e);
      }
    };
    load();
  }, []);

  // Diff hesapla — sadece değişen (akademisyenId, gostergeId, yil, ay) hücrelerini yaz
  const collectChangedOps = () => {
    if (!selectedAkademisyen) return [];
    const ops = [];
    const own = akademisyenData[selectedAkademisyen] || {};
    const base = baselineData[selectedAkademisyen] || {};
    const keys = new Set([...Object.keys(own), ...Object.keys(base)]);
    keys.forEach((k) => {
      const v = (own[k] || '').toString().trim();
      const b = (base[k] || '').toString().trim();
      if (v === b) return;
      const [yil, gostergeId, ay] = k.split('_');
      if (!yil || !gostergeId || !ay) return;
      const g = findGosterge(gostergeId);
      const docId = `${selectedAkademisyen}_${yil}_${gostergeId}_${ay}`;
      ops.push({
        collection: 'performance_data',
        type: 'set',
        docId,
        merge: true,
        data: {
          akademisyenId: selectedAkademisyen,
          departmentId: matchedAkademisyen?.departmentId || '',
          gostergeId,
          birim: g?.birim || '',
          yil,
          ay,
          value: v,
        },
      });
    });
    return ops;
  };

  // ── Kaydet: değişen değerleri backend'e yaz ──
  const handleSave = async () => {
    if (saving) return;
    const ops = collectChangedOps();
    if (ops.length === 0) {
      flash('Kaydedilecek değişiklik yok');
      return;
    }
    setSaving(true);
    try {
      // 50 kayıt sınırı aşılırsa gruplandırarak gönder
      for (let i = 0; i < ops.length; i += 40) {
        const chunk = ops.slice(i, i + 40);
        await window.DBWrite.batch(chunk);
      }
      // Baseline güncelle — yeniden diff için
      setBaselineData((prev) => ({
        ...prev,
        [selectedAkademisyen]: { ...(akademisyenData[selectedAkademisyen] || {}) },
      }));
      window.apiInvalidate && window.apiInvalidate('performance_data');
      flash(`${ops.length} değer kaydedildi`);
    } catch (e) {
      console.error('Kaydetme hatası:', e);
      flash('Kaydetme sırasında hata oluştu');
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async () => {
    await handleSave();
    setSubmitted(true);
    flash('Gösterge verileri gönderildi');
  };

  // ── Toplama kuralını backend'e yaz (bölüm/fakülte yetkilisi ayarı) ──
  const persistAggRule = async (scope, scopeId, gostergeId, aggType) => {
    if (!scope || !scopeId || !gostergeId || !aggType) return;
    const docId = `${scope}_${scopeId}_${gostergeId}`;
    try {
      await window.DBWrite.set(
        'performance_agg_rules',
        docId,
        { scope, scopeId, gostergeId, aggType },
        true
      );
      window.apiInvalidate && window.apiInvalidate('performance_agg_rules');
    } catch (e) {
      console.error('Kural kaydedilemedi:', e);
      flash('Kural kaydedilemedi');
    }
  };

  // ── Akademisyen listesini API'den yükle ──
  useEffect(() => {
    const load = async () => {
      setLoadingAkad(true);
      try {
        const [profs, depts, facs] = await Promise.all([
          window.apiRead('professors'),
          window.apiRead('departments').catch(() => []),
          window.apiRead('faculties').catch(() => []),
        ]);
        const deptById = {};
        (Array.isArray(depts) ? depts : []).forEach((d) => {
          const id = d._docId || d.id || (d._id && d._id.toString());
          if (id) deptById[id] = d;
        });
        const facById = {};
        (Array.isArray(facs) ? facs : []).forEach((f) => {
          const id = f._docId || f.id || (f._id && f._id.toString());
          if (id) facById[id] = f.name || id;
        });
        const list = (Array.isArray(profs) ? profs : [])
          .map((p) => {
            const dep = deptById[p.departmentId];
            const fakId = p.facultyId || (dep && dep.facultyId) || '';
            return {
              id: p._id ? p._id.toString() : p.name || '',
              ad: p.name || '',
              bolum: (dep && dep.name) || p.department || '',
              departmentId: p.departmentId || '',
              fakulte: facById[fakId] || '',
            };
          })
          .filter((a) => a.ad);
        setAkademisyenlerList(list);
        const bolumler = [...new Set(list.map((a) => a.bolum))].filter(Boolean);
        if (bolumler.length > 0) {
          const initialBolum =
            currentUser?.role === 'bolum_yetkilisi' && departmentInfo?.name
              ? departmentInfo.name
              : bolumler[0];
          setSelectedBolum(initialBolum);
        }
      } catch (err) {
        console.error('Akademisyen listesi yüklenemedi:', err);
      } finally {
        setLoadingAkad(false);
      }
    };
    load();
  }, []);

  // Uyumlu referanslar
  const AKADEMISYENLER = akademisyenlerList;
  const BOLUMLER = useMemo(
    () => [...new Set(akademisyenlerList.map((a) => a.bolum))].filter(Boolean),
    [akademisyenlerList]
  );
  const FAKULTELER = useMemo(
    () => [...new Set(akademisyenlerList.map((a) => a.fakulte))].filter(Boolean),
    [akademisyenlerList]
  );

  // Giriş yapan akademisyeni bul (professor rolü için)
  const TITLES = [
    'Prof. Dr.',
    'Prof.Dr.',
    'Doç. Dr.',
    'Doç.Dr.',
    'Dr. Öğr. Üyesi',
    'Dr.Öğr.Üyesi',
    'Öğr. Gör. Dr.',
    'Öğr.Gör.Dr.',
    'Arş. Gör. Dr.',
    'Arş.Gör.Dr.',
    'Öğr. Gör.',
    'Öğr.Gör.',
    'Arş. Gör.',
    'Arş.Gör.',
    'Dr.',
  ];
  const stripTitle = (name) => {
    if (!name) return '';
    let n = name.trim();
    for (const t of TITLES) {
      if (n.toLocaleLowerCase('tr').startsWith(t.toLocaleLowerCase('tr'))) {
        n = n.slice(t.length).trim();
        break;
      }
    }
    return n;
  };
  const toAsciiSlug = (s) => {
    if (!s) return '';
    return s
      .replace(/İ/g, 'i')
      .replace(/I/g, 'ı')
      .replace(/\s+/g, '')
      .toLocaleLowerCase('tr')
      .replace(/ı/g, 'i')
      .replace(/ü/g, 'u')
      .replace(/ö/g, 'o')
      .replace(/ş/g, 's')
      .replace(/ç/g, 'c')
      .replace(/ğ/g, 'g');
  };
  const matchedAkademisyen = useMemo(() => {
    if (!currentUser?.name) return null;
    const bare = stripTitle(currentUser.name);
    if (!bare) return null;

    // 1) Tam isim eşleme
    const nameKey = bare.replace(/\s+/g, ' ').trim().toLocaleLowerCase('tr');
    const nameMatch = AKADEMISYENLER.find((a) => {
      const aKey = stripTitle(a.ad).replace(/\s+/g, ' ').trim().toLocaleLowerCase('tr');
      return aKey === nameKey;
    });
    if (nameMatch) return nameMatch;

    // 2) Username türetme
    const fullSlug = toAsciiSlug(bare);
    const slugMatch = AKADEMISYENLER.find((a) => a.id === fullSlug);
    if (slugMatch) return slugMatch;

    // 3) Soyadı + ad baş harfi eşleme
    const parts = bare.trim().split(/\s+/);
    if (parts.length >= 2) {
      const surname = toAsciiSlug(parts[parts.length - 1]);
      const firstInitial = toAsciiSlug(parts[0]).charAt(0);
      if (surname.length >= 3) {
        const partialMatch = AKADEMISYENLER.find(
          (a) => a.id.endsWith(surname) || (a.id.includes(surname) && a.id.startsWith(firstInitial))
        );
        if (partialMatch) return partialMatch;
      }
    }
    return null;
  }, [AKADEMISYENLER, currentUser?.name]);
  const selectedAkademisyen = matchedAkademisyen?.id || '';
  const currentAkad = matchedAkademisyen;

  // ── YETKİLER ──
  // Yetkiler artık matched akademisyen ve rol bayraklarına göre çoklu.
  const capOwn = !!matchedAkademisyen; // sistemde akademisyen olarak varsa
  const capDept = isDeptMgr || isFacMgr || isUniAdmin; // bölüm özeti
  const capFaculty = isFacMgr || isUniAdmin; // fakülte özeti

  // Aktif görünüm: 'own' | 'dept' | 'faculty'
  const [activeView, setActiveView] = useState(() =>
    capOwn ? 'own' : capDept ? 'dept' : 'faculty'
  );
  useEffect(() => {
    // Kullanıcı sistemde akademisyen değilse 'own' sekmesinden kaç.
    if (activeView === 'own' && !capOwn) {
      setActiveView(capDept ? 'dept' : 'faculty');
    }
  }, [capOwn, capDept, activeView]);

  // Bölüm özeti için hangi bölüm gösterilecek:
  //   - Bölüm yetkilisi: activeDepartment (kendi bölümü)
  //   - Fakülte/Üni yetkilisi: dropdown ile kendi seçtiği
  //   - Akademisyen (sadece): matched akademisyenin bölümü
  const deptForSummary = useMemo(() => {
    if (isDeptMgr && activeDepartment) return activeDepartment;
    if (selectedBolum) {
      // selectedBolum bir bölüm ADI — id'ye çevir
      const first = AKADEMISYENLER.find((a) => a.bolum === selectedBolum);
      return first?.departmentId || '';
    }
    return matchedAkademisyen?.departmentId || activeDepartment || '';
  }, [isDeptMgr, activeDepartment, selectedBolum, AKADEMISYENLER, matchedAkademisyen]);

  const bolumAkademisyenleri = useMemo(() => {
    if (deptForSummary) {
      return AKADEMISYENLER.filter((a) => a.departmentId === deptForSummary);
    }
    if (selectedBolum) return AKADEMISYENLER.filter((a) => a.bolum === selectedBolum);
    return [];
  }, [AKADEMISYENLER, deptForSummary, selectedBolum]);

  const fakulteBolumleri = useMemo(() => {
    if (!capFaculty) return [];
    const allDepts =
      typeof window !== 'undefined' && Array.isArray(window.DEPARTMENTS) ? window.DEPARTMENTS : [];
    if (allDepts.length > 0) return allDepts.map((d) => d.name);
    if (FAKULTELER.length === 0) return [];
    const fak = FAKULTELER[0];
    return [...new Set(AKADEMISYENLER.filter((a) => a.fakulte === fak).map((a) => a.bolum))];
  }, [capFaculty, AKADEMISYENLER, FAKULTELER]);

  // Fakülte scope id'si — fakülte adı stabil bir kimlik olarak kullanılır
  const facultyIdForSummary = useMemo(
    () => matchedAkademisyen?.fakulte || FAKULTELER[0] || '',
    [matchedAkademisyen, FAKULTELER]
  );

  // Kurallara scope-aware erişim: önce ilgili scope'ta ayar ara, bulamazsa default
  const getAggType = (gostergeId, scope, scopeId) => {
    const g = findGosterge(gostergeId);
    if (scope && scopeId) {
      const v = aggOverrides[`${scope}::${scopeId}::${gostergeId}`];
      if (v) return v;
    }
    return g?.aggType || 'sum';
  };

  // Bölüm toplamı (seçili yıl + ay) — birim ile formatlanmış
  const calcBolumToplam = (gostergeId, ay) => {
    const g = findGosterge(gostergeId);
    const aggType = getAggType(gostergeId, 'department', deptForSummary);
    const vals = bolumAkademisyenleri
      .map((a) => {
        const v = akademisyenData[a.id]?.[pKey(selectedYil, gostergeId, ay)];
        return v ? parseFloat(v) : null;
      })
      .filter((v) => v !== null && !isNaN(v));
    if (vals.length === 0) return '—';
    const out = aggregate(vals, aggType);
    return formatValue(out, g?.birim);
  };

  // Fakülte toplamı — birim ile formatlanmış.
  // Fakülte içindeki her bölümün "bölüm toplamı"nı hesaplayıp onları toplama
  // kuralına göre birleştirir (topla/sabit/ortalama/maks.).
  const calcFakulteToplam = (gostergeId, ay) => {
    const g = findGosterge(gostergeId);
    const aggType = getAggType(gostergeId, 'faculty', facultyIdForSummary);
    const fak = FAKULTELER[0];
    if (!fak) return '—';

    // Fakültedeki bölümleri gruplandır ve her bölümün toplamını al
    const akadsInFak = AKADEMISYENLER.filter((a) => a.fakulte === fak);
    const byDept = new Map();
    akadsInFak.forEach((a) => {
      if (!byDept.has(a.departmentId || a.bolum)) byDept.set(a.departmentId || a.bolum, []);
      byDept.get(a.departmentId || a.bolum).push(a);
    });

    const deptTotals = [];
    for (const [deptKey, akads] of byDept.entries()) {
      const dv = akads
        .map((a) => {
          const v = akademisyenData[a.id]?.[pKey(selectedYil, gostergeId, ay)];
          return v ? parseFloat(v) : null;
        })
        .filter((v) => v !== null && !isNaN(v));
      if (dv.length > 0) {
        // Bölüm içi toplama o bölümün kendi kuralı ile → fakülte için hazır ara toplam
        const deptAgg = getAggType(gostergeId, 'department', deptKey);
        deptTotals.push(aggregate(dv, deptAgg));
      }
    }
    if (deptTotals.length === 0) return '—';
    const out = aggregate(deptTotals, aggType);
    return formatValue(out, g?.birim);
  };

  // ═══════════════════════════════════════════════════════
  return (
    <div style={{ fontFamily: F, background: C.bg, color: C.text, minHeight: '100vh' }}>
      {/* ── Header ── */}
      <div
        style={{
          background: C.headerBg,
          borderBottom: `2px solid ${C.border}`,
          padding: '20px 24px 14px',
          position: 'relative',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 3,
            background: `linear-gradient(90deg, ${C.warning}, ${C.success}, ${C.purple})`,
          }}
        />
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 12,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 9,
                background: `linear-gradient(135deg, ${C.warning}, #D4AF37)`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 16,
                fontWeight: 800,
                color: '#fff',
              }}
            >
              ÇÜ
            </div>
            <div>
              <h1 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: '#fff' }}>
                Performans Modülü
              </h1>
              <p style={{ margin: '2px 0 0', fontSize: 11, color: 'rgba(255,255,255,0.6)' }}>
                Gösterge İzleme
              </p>
            </div>
          </div>
          <div
            style={{
              padding: '6px 14px',
              borderRadius: 6,
              background: 'rgba(255,255,255,0.15)',
              border: '1px solid rgba(255,255,255,0.2)',
              color: '#fff',
              fontSize: 11.5,
              fontWeight: 600,
              fontFamily: F,
            }}
          >
            {roleLabel}
          </div>
        </div>

        {/* Akademisyen bilgisi — bölüm/fakülte yetkilisi olsa bile gösterilir */}
        {matchedAkademisyen && (
          <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>Giriş yapan:</span>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#fff' }}>
              {matchedAkademisyen.ad} — {matchedAkademisyen.bolum}
            </span>
          </div>
        )}
      </div>

      {/* ── Görünüm Sekmesi (yetkiye göre) ── */}
      {(capOwn ? 1 : 0) + (capDept ? 1 : 0) + (capFaculty ? 1 : 0) > 1 && (
        <div
          style={{
            display: 'flex',
            background: C.surface,
            borderBottom: `1px solid ${C.border}`,
            padding: '0 16px',
            gap: 4,
          }}
        >
          {[
            { id: 'own', label: 'Verilerim', enabled: capOwn },
            { id: 'dept', label: 'Bölüm Özeti', enabled: capDept },
            { id: 'faculty', label: 'Fakülte Özeti', enabled: capFaculty },
          ]
            .filter((v) => v.enabled)
            .map((v) => (
              <button
                key={v.id}
                onClick={() => setActiveView(v.id)}
                style={{
                  padding: '11px 20px',
                  border: 'none',
                  background: activeView === v.id ? C.bg : 'transparent',
                  color: activeView === v.id ? C.accent : C.textMuted,
                  fontSize: 12,
                  fontWeight: activeView === v.id ? 700 : 500,
                  cursor: 'pointer',
                  borderBottom:
                    activeView === v.id ? `3px solid ${C.accent}` : '3px solid transparent',
                  transition: 'all 0.2s',
                  fontFamily: F,
                }}
              >
                {v.label}
              </button>
            ))}
        </div>
      )}

      {/* ── Content ── */}
      <div style={{ padding: '20px 16px 40px', maxWidth: 1400, margin: '0 auto' }}>
        {loadingAkad ? (
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              padding: '60px 20px',
            }}
          >
            <span style={{ color: C.textMuted, fontSize: 14 }}>
              Akademisyen listesi yükleniyor...
            </span>
          </div>
        ) : !capOwn && !capDept && !capFaculty ? (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 12,
                background: C.yellowDim,
                border: `2px solid ${C.yellowBorder}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px',
              }}
            >
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke={C.warning}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0110 0v4" />
              </svg>
            </div>
            <div style={{ fontSize: 16, fontWeight: 700, color: C.accent, marginBottom: 8 }}>
              Erişim Kısıtlaması
            </div>
            <div
              style={{
                fontSize: 13,
                color: C.textMuted,
                maxWidth: 420,
                margin: '0 auto',
                lineHeight: 1.6,
              }}
            >
              Bu modülü kullanabilmek için sistemde akademisyen olarak kayıtlı olmanız veya bölüm/
              fakülte yetkilisi olmanız gerekmektedir.
            </div>
          </div>
        ) : (
          <div>
            {/* ── Yıl Seçici ── */}
            <YearSelector yil={selectedYil} setYil={setSelectedYil} />

            {/* ── VERİLERİM: kullanıcı sistemde akademisyense değer girer ── */}
            {activeView === 'own' && (
              <>
                <Hdr
                  title="Gösterge Verilerini Girin"
                  sub={`${currentAkad?.ad} — ${currentAkad?.bolum} • ${selectedYil} yılı`}
                />
                <InfoBar
                  color={C.yellow}
                  text={`Seçili yılın (${selectedYil}) 12 aylık gösterge verilerinizi giriniz. Her yıl ayrı kaydedilir.`}
                />
                <ScrollWrap>
                  {GOSTERGELER.map((kat, ki) => (
                    <GostergeTable
                      key={ki}
                      kat={kat}
                      aylar={AYLAR}
                      getValue={(gId, ay) =>
                        akademisyenData[selectedAkademisyen]?.[pKey(selectedYil, gId, ay)] || ''
                      }
                      setValue={(gId, ay, val) =>
                        setAkademisyenData((p) => ({
                          ...p,
                          [selectedAkademisyen]: {
                            ...(p[selectedAkademisyen] || {}),
                            [pKey(selectedYil, gId, ay)]: val,
                          },
                        }))
                      }
                      editable
                      inputStyle={inp}
                    />
                  ))}
                </ScrollWrap>
                <SaveSubmitBar onSave={handleSave} onSubmit={handleSubmit} submitted={submitted} />
              </>
            )}

            {/* ── BÖLÜM ÖZETİ ── */}
            {activeView === 'dept' && (
              <>
                {/* Fakülte/Üni yetkilisi için bölüm seçici */}
                {(isFacMgr || isUniAdmin) && (
                  <div
                    style={{
                      background: C.surface,
                      border: `1px solid ${C.border}`,
                      borderRadius: 8,
                      padding: '10px 14px',
                      marginBottom: 14,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      flexWrap: 'wrap',
                    }}
                  >
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        color: C.textMuted,
                        textTransform: 'uppercase',
                        letterSpacing: 0.4,
                      }}
                    >
                      Bölüm
                    </span>
                    <select
                      value={selectedBolum}
                      onChange={(e) => setSelectedBolum(e.target.value)}
                      style={{
                        padding: '6px 12px',
                        borderRadius: 6,
                        border: `1px solid ${C.border}`,
                        background: C.surfaceAlt,
                        color: C.accent,
                        fontSize: 12.5,
                        fontWeight: 600,
                        fontFamily: F,
                        outline: 'none',
                        cursor: 'pointer',
                      }}
                    >
                      {(fakulteBolumleri.length ? fakulteBolumleri : BOLUMLER).map((b) => (
                        <option key={b} value={b}>
                          {b}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                <Hdr
                  title="Bölüm Gösterge Özeti"
                  sub={`${departmentInfo?.name || selectedBolum || bolumAkademisyenleri[0]?.bolum || ''} — ${selectedYil} yılı`}
                />
                <InfoBar
                  color={C.warning}
                  text="Bölümdeki tüm akademisyenlerin girdiği değerler toplanır. Her gösterge için toplama kuralını (Topla / Sabit / Ortalama / Maks.) ayarlayabilirsiniz."
                />

                {/* Akademisyen bazlı detay */}
                <ScrollWrap>
                  {bolumAkademisyenleri.map((akad) => (
                    <div key={akad.id} style={{ marginBottom: 18 }}>
                      <div
                        style={{
                          fontSize: 12,
                          fontWeight: 600,
                          color: C.accent,
                          padding: '8px 12px',
                          background: C.accentGlow,
                          borderRadius: 8,
                          marginBottom: 4,
                        }}
                      >
                        {akad.ad}
                      </div>
                      {GOSTERGELER.map((kat, ki) => (
                        <GostergeTable
                          key={ki}
                          kat={kat}
                          aylar={AYLAR}
                          compact
                          getValue={(gId, ay) =>
                            akademisyenData[akad.id]?.[pKey(selectedYil, gId, ay)] || ''
                          }
                          editable={false}
                        />
                      ))}
                    </div>
                  ))}
                </ScrollWrap>

                {/* Toplam satırı */}
                <div style={{ marginTop: 20, borderTop: `2px solid ${C.warning}`, paddingTop: 16 }}>
                  <div
                    style={{
                      fontSize: 14,
                      fontWeight: 700,
                      color: C.warning,
                      marginBottom: 12,
                    }}
                  >
                    BÖLÜM TOPLAM DEĞERLERİ — {selectedYil}
                  </div>
                  <ScrollWrap>
                    {GOSTERGELER.map((kat, ki) => (
                      <div key={ki} style={{ marginBottom: 16 }}>
                        <div
                          style={{
                            fontSize: 11,
                            fontWeight: 700,
                            color: C.accent,
                            textTransform: 'uppercase',
                            marginBottom: 4,
                            padding: '6px 10px',
                            background: C.accentGlow,
                            borderRadius: 6,
                          }}
                        >
                          {kat.kategori}
                        </div>
                        <table
                          style={{
                            width: '100%',
                            borderCollapse: 'collapse',
                            fontSize: 12,
                            minWidth: 1100,
                          }}
                        >
                          <thead>
                            <tr>
                              <th style={{ ...th, minWidth: 220 }}>Gösterge</th>
                              <th style={{ ...th, width: 50, textAlign: 'center' }}>Birim</th>
                              <th style={{ ...th, width: 75, textAlign: 'center' }}>Kural</th>
                              {AYLAR.map((a) => (
                                <th key={a} style={{ ...th, width: 62, textAlign: 'center' }}>
                                  {a.slice(0, 3)}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {kat.gostergeler.map((g) => {
                              const currentAgg = getAggType(g.id, 'department', deptForSummary);
                              return (
                                <tr key={g.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                                  <td style={{ ...td, paddingLeft: 8 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                                      <span
                                        style={{
                                          width: 7,
                                          height: 7,
                                          borderRadius: 2,
                                          background: C.yellow,
                                          display: 'inline-block',
                                          flexShrink: 0,
                                        }}
                                      />
                                      {g.ad}
                                    </div>
                                  </td>
                                  <td
                                    style={{
                                      ...td,
                                      textAlign: 'center',
                                      fontSize: 10,
                                      color: C.textDim,
                                    }}
                                  >
                                    {g.birim}
                                  </td>
                                  <td style={{ ...td, textAlign: 'center', padding: 3 }}>
                                    <select
                                      value={currentAgg}
                                      onChange={(e) => {
                                        const newAgg = e.target.value;
                                        setAggOverrides((p) => ({
                                          ...p,
                                          [`department::${deptForSummary}::${g.id}`]: newAgg,
                                        }));
                                        persistAggRule('department', deptForSummary, g.id, newAgg);
                                      }}
                                      style={{
                                        ...inpF,
                                        padding: '3px 4px',
                                        fontSize: 10,
                                        width: '100%',
                                        textAlign: 'center',
                                      }}
                                    >
                                      {AGG_TYPES.map((t) => (
                                        <option key={t.id} value={t.id}>
                                          {t.label}
                                        </option>
                                      ))}
                                    </select>
                                  </td>
                                  {AYLAR.map((a) => (
                                    <td
                                      key={a}
                                      style={{
                                        ...td,
                                        textAlign: 'center',
                                        fontWeight: 700,
                                        color: C.warning,
                                        fontSize: 12,
                                      }}
                                    >
                                      {calcBolumToplam(g.id, a)}
                                    </td>
                                  ))}
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    ))}
                  </ScrollWrap>
                </div>
              </>
            )}

            {/* ── FAKÜLTE ÖZETİ ── */}
            {activeView === 'faculty' && (
              <>
                <Hdr
                  title="Fakülte Genel Toplam"
                  sub={`Tüm bölümlerden gelen toplam değerler — ${selectedYil} yılı`}
                />
                <InfoBar
                  color={C.purple}
                  text="Her bölümden gelen toplam değerler fakülte düzeyinde birleştirilmiştir. Bölüm özetinde ayarladığınız toplama kuralı burada da geçerlidir."
                />

                <div style={{ marginTop: 16, borderTop: `2px solid ${C.purple}`, paddingTop: 14 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: C.purple, marginBottom: 10 }}>
                    FAKÜLTE GENEL TOPLAM — {selectedYil}
                  </div>
                  <ScrollWrap>
                    {GOSTERGELER.map((kat, ki) => (
                      <div key={ki} style={{ marginBottom: 10 }}>
                        <div
                          style={{
                            fontSize: 10.5,
                            fontWeight: 700,
                            color: C.accent,
                            textTransform: 'uppercase',
                            marginBottom: 3,
                            padding: '5px 8px',
                            background: C.accentGlow,
                            borderRadius: 5,
                          }}
                        >
                          {kat.kategori}
                        </div>
                        <table
                          style={{
                            width: '100%',
                            borderCollapse: 'collapse',
                            fontSize: 12,
                            minWidth: 1100,
                          }}
                        >
                          <thead>
                            <tr>
                              <th style={{ ...th, minWidth: 220 }}>Gösterge</th>
                              <th style={{ ...th, width: 75, textAlign: 'center' }}>Kural</th>
                              {AYLAR.map((a) => (
                                <th key={a} style={{ ...th, width: 62, textAlign: 'center' }}>
                                  {a.slice(0, 3)}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {kat.gostergeler.map((g) => {
                              const currentAgg = getAggType(g.id, 'faculty', facultyIdForSummary);
                              return (
                                <tr key={g.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                                  <td style={{ ...td, paddingLeft: 8 }}>{g.ad}</td>
                                  <td style={{ ...td, textAlign: 'center', padding: 3 }}>
                                    <select
                                      value={currentAgg}
                                      onChange={(e) => {
                                        const newAgg = e.target.value;
                                        setAggOverrides((p) => ({
                                          ...p,
                                          [`faculty::${facultyIdForSummary}::${g.id}`]: newAgg,
                                        }));
                                        persistAggRule(
                                          'faculty',
                                          facultyIdForSummary,
                                          g.id,
                                          newAgg
                                        );
                                      }}
                                      style={{
                                        ...inpF,
                                        padding: '3px 4px',
                                        fontSize: 10,
                                        width: '100%',
                                        textAlign: 'center',
                                      }}
                                    >
                                      {AGG_TYPES.map((t) => (
                                        <option key={t.id} value={t.id}>
                                          {t.label}
                                        </option>
                                      ))}
                                    </select>
                                  </td>
                                  {AYLAR.map((a) => (
                                    <td
                                      key={a}
                                      style={{
                                        ...td,
                                        textAlign: 'center',
                                        fontWeight: 700,
                                        color: C.purple,
                                        fontSize: 12,
                                      }}
                                    >
                                      {calcFakulteToplam(g.id, a)}
                                    </td>
                                  ))}
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    ))}
                  </ScrollWrap>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Toast */}
      {toast && (
        <div
          style={{
            position: 'fixed',
            bottom: 20,
            left: '50%',
            transform: 'translateX(-50%)',
            background: C.accent,
            color: '#fff',
            padding: '10px 22px',
            borderRadius: 8,
            fontSize: 12.5,
            fontWeight: 600,
            zIndex: 1000,
            fontFamily: F,
            boxShadow: '0 6px 20px rgba(0,0,0,0.15)',
          }}
        >
          {toast}
        </div>
      )}
    </div>
  );
}

// ═════════════ Alt Bileşenler ═════════════

function Hdr({ title, sub }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: C.accent }}>{title}</h2>
      {sub && <p style={{ margin: '2px 0 0', fontSize: 12, color: C.textMuted }}>{sub}</p>}
    </div>
  );
}

function InfoBar({ color, text }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 7,
        marginBottom: 16,
        padding: '9px 12px',
        background: `${color}18`,
        border: `1px solid ${color}40`,
        borderRadius: 7,
      }}
    >
      <span
        style={{
          width: 12,
          height: 12,
          borderRadius: 3,
          background: color,
          display: 'inline-block',
          flexShrink: 0,
        }}
      />
      <span style={{ fontSize: 11.5, color, fontWeight: 600 }}>{text}</span>
    </div>
  );
}

// 12 sütun geniş olduğu için tabloları saran yatay-scroll kutusu
function ScrollWrap({ children }) {
  return (
    <div
      style={{
        overflowX: 'auto',
        border: `1px solid ${C.borderLight}`,
        borderRadius: 8,
        background: C.surface,
        padding: 10,
      }}
    >
      <div style={{ minWidth: 1100 }}>{children}</div>
    </div>
  );
}

function GostergeTable({
  kat,
  aylar,
  getValue,
  setValue,
  editable = true,
  inputStyle,
  compact = false,
}) {
  return (
    <div style={{ marginBottom: compact ? 6 : 20 }}>
      {!compact && (
        <div
          style={{
            background: C.accentGlow,
            border: `1px solid ${C.borderLight}`,
            borderRadius: 8,
            padding: '9px 12px',
            marginBottom: 4,
          }}
        >
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: C.accent,
              textTransform: 'uppercase',
              letterSpacing: 0.5,
            }}
          >
            {kat.kategori}
          </div>
          {kat.hedef && (
            <div style={{ fontSize: 10.5, color: C.textMuted, marginTop: 1 }}>{kat.hedef}</div>
          )}
        </div>
      )}
      <table
        style={{
          width: '100%',
          borderCollapse: 'collapse',
          fontSize: compact ? 11 : 12,
          tableLayout: 'fixed',
        }}
      >
        <colgroup>
          <col style={{ width: compact ? 260 : 240 }} />
          {!compact && <col style={{ width: 55 }} />}
          {aylar.map((a) => (
            <col key={a} style={{ width: 62 }} />
          ))}
        </colgroup>
        {!compact && (
          <thead>
            <tr>
              <th style={th}>Gösterge</th>
              <th style={{ ...th, textAlign: 'center' }}>Birim</th>
              {aylar.map((a) => (
                <th key={a} style={{ ...th, textAlign: 'center' }}>
                  {a.slice(0, 3)}
                </th>
              ))}
            </tr>
          </thead>
        )}
        <tbody>
          {kat.gostergeler.map((g) => (
            <tr key={g.id} style={{ borderBottom: `1px solid ${C.border}` }}>
              <td
                style={{
                  ...td,
                  paddingLeft: 8,
                  fontSize: compact ? 11 : 12,
                  overflow: 'hidden',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <span
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: 2,
                      background: C.yellow,
                      display: 'inline-block',
                      flexShrink: 0,
                    }}
                  />
                  <span style={{ whiteSpace: 'normal', lineHeight: 1.3 }}>{g.ad}</span>
                </div>
              </td>
              {!compact && (
                <td style={{ ...td, textAlign: 'center', color: C.textDim, fontSize: 10 }}>
                  {g.birim}
                </td>
              )}
              {aylar.map((a) => (
                <td key={a} style={{ ...td, textAlign: 'center', padding: 3 }}>
                  {editable ? (
                    <input
                      type="text"
                      value={getValue(g.id, a)}
                      onChange={(e) => setValue(g.id, a, e.target.value)}
                      style={inputStyle || inp}
                      placeholder="—"
                    />
                  ) : (
                    <span
                      style={{
                        color: getValue(g.id, a) ? C.text : C.textDim,
                        fontWeight: getValue(g.id, a) ? 600 : 400,
                      }}
                    >
                      {getValue(g.id, a) || '—'}
                    </span>
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function YearSelector({ yil, setYil }) {
  return (
    <div
      style={{
        background: C.surface,
        border: `1px solid ${C.border}`,
        borderRadius: 10,
        padding: '12px 14px',
        marginBottom: 16,
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        flexWrap: 'wrap',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: C.textMuted,
            textTransform: 'uppercase',
            letterSpacing: 0.4,
          }}
        >
          Yıl
        </span>
        <select
          value={yil}
          onChange={(e) => setYil(e.target.value)}
          style={{
            padding: '6px 12px',
            borderRadius: 6,
            border: `1px solid ${C.border}`,
            background: C.surfaceAlt,
            color: C.accent,
            fontSize: 13,
            fontWeight: 700,
            fontFamily: F,
            outline: 'none',
            cursor: 'pointer',
          }}
        >
          {YILLAR.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
      </div>
      <div style={{ marginLeft: 'auto', fontSize: 11, color: C.textDim, fontStyle: 'italic' }}>
        12 aylık gösterge tablosu ({AYLAR.map((a) => a.slice(0, 3)).join(' • ')})
      </div>
    </div>
  );
}

function SaveSubmitBar({ onSave, onSubmit, submitted }) {
  return (
    <div
      style={{
        marginTop: 20,
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        justifyContent: 'flex-end',
        flexWrap: 'wrap',
      }}
    >
      {submitted && (
        <span style={{ fontSize: 11.5, color: C.success, fontWeight: 600, marginRight: 'auto' }}>
          Gönderildi
        </span>
      )}
      <button
        onClick={onSave}
        style={{
          padding: '10px 24px',
          borderRadius: 8,
          border: `1px solid ${C.border}`,
          background: C.surface,
          color: C.accent,
          fontSize: 12.5,
          fontWeight: 600,
          cursor: 'pointer',
          fontFamily: F,
          transition: 'all 0.15s',
        }}
      >
        Kaydet
      </button>
      <button
        onClick={onSubmit}
        style={{
          padding: '10px 24px',
          borderRadius: 8,
          border: 'none',
          background: submitted
            ? C.success
            : `linear-gradient(135deg, ${C.accent}, ${C.accentDark})`,
          color: '#fff',
          fontSize: 12.5,
          fontWeight: 600,
          cursor: 'pointer',
          fontFamily: F,
          transition: 'all 0.15s',
        }}
      >
        {submitted ? 'Gönderildi' : 'Gönder'}
      </button>
    </div>
  );
}

// ── Stiller ──
const th = {
  padding: '8px 6px',
  textAlign: 'left',
  fontSize: 11,
  fontWeight: 600,
  color: C.textMuted,
  borderBottom: `2px solid ${C.border}`,
  background: C.surface,
};
const td = { padding: '6px', fontSize: 12, color: C.text, lineHeight: 1.3 };
const inp = {
  width: '100%',
  padding: '5px 4px',
  borderRadius: 5,
  border: `1px solid ${C.yellowBorder}`,
  background: C.yellowDim,
  color: C.text,
  fontSize: 12,
  fontFamily: F,
  textAlign: 'center',
  outline: 'none',
  boxSizing: 'border-box',
};
const inpF = {
  width: '100%',
  padding: '8px 10px',
  borderRadius: 6,
  border: `1px solid ${C.border}`,
  background: C.surfaceAlt,
  color: C.text,
  fontSize: 12,
  fontFamily: F,
  outline: 'none',
  boxSizing: 'border-box',
};

// ── Global window export (app-shell lazy loader için) ──
window.PerformansBilgileriApp = PerformansBilgileri;
