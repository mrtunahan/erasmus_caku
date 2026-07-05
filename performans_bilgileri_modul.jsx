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

  // Kullanıcının kendi fakültesi — üniversite yetkilisi hariç herkesin
  // kapsamı buraya sınırlıdır (fakülte yetkilisi kendi fakültesinin dışını
  // göremez, bölüm yetkilisi zaten kendi bölümüne sıkışıktır).
  const userFacultyName = useMemo(
    () => matchedAkademisyen?.fakulte || FAKULTELER[0] || '',
    [matchedAkademisyen, FAKULTELER]
  );

  const fakulteBolumleri = useMemo(() => {
    if (!capFaculty) return [];
    // Fakülte yetkilisi yalnızca kendi fakültesinin bölümlerini görür.
    // Üniversite yetkilisi tüm bölümleri görebilir.
    if (isUniAdmin) {
      const allDepts =
        typeof window !== 'undefined' && Array.isArray(window.DEPARTMENTS)
          ? window.DEPARTMENTS
          : [];
      if (allDepts.length > 0) return allDepts.map((d) => d.name);
    }
    // AKADEMISYENLER'in fakulte alanı bölüm adları için tek gerçek kaynağıdır
    return [
      ...new Set(AKADEMISYENLER.filter((a) => a.fakulte === userFacultyName).map((a) => a.bolum)),
    ].filter(Boolean);
  }, [capFaculty, isUniAdmin, AKADEMISYENLER, userFacultyName]);

  // Fakülte scope id'si — fakülte adı stabil bir kimlik olarak kullanılır.
  // Faculty yetkilisi/üniversite yetkilisi kendi fakültesi için kural belirler.
  const facultyIdForSummary = useMemo(() => userFacultyName, [userFacultyName]);

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
  // NOT: Yalnızca kullanıcının kendi fakültesindeki bölümler dâhil edilir;
  // fakülte yetkilisi başka fakülteden veri göremez.
  const calcFakulteToplam = (gostergeId, ay) => {
    const g = findGosterge(gostergeId);
    const aggType = getAggType(gostergeId, 'faculty', facultyIdForSummary);
    const fak = userFacultyName;
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
      {(capOwn ? 1 : 0) + (capDept ? 1 : 0) + (capFaculty ? 1 : 0) + (capDept || capOwn ? 1 : 0) >
        1 && (
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
            { id: 'strateji', label: 'Stratejik Plan İzleme', enabled: capDept || capOwn },
            { id: 'strateji-fac', label: 'Fakülte Özeti — Stratejik Plan', enabled: capFaculty },
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

        {activeView === 'strateji' && (
          <StratejikPlanIzleme
            deptId={deptForSummary}
            deptName={
              (typeof window !== 'undefined' && Array.isArray(window.DEPARTMENTS)
                ? window.DEPARTMENTS.find((d) => d.id === deptForSummary)?.name
                : '') ||
              selectedBolum ||
              ''
            }
            yil={selectedYil}
            isManager={capDept}
            akademisyenler={bolumAkademisyenleri}
            currentAkademisyenId={matchedAkademisyen?.id || ''}
          />
        )}

        {activeView === 'strateji-fac' && (
          <StratejikPlanFakulteOzeti
            yil={selectedYil}
            facultyName={userFacultyName}
            departments={AKADEMISYENLER}
            isUniAdmin={isUniAdmin}
          />
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

// ═════════════ Stratejik Plan İzleme ═════════════
// Şablonlar'a yüklenmiş (performans / strateji-izleme) belgeden göstergeleri
// ayrıştırır, AKADEMİK birim sorumlu olanları amaç/hedef ağacında gösterir,
// Değer + Açıklama girişini DB'de saklar; belge üretiminde TÜM şablonu
// doldurur (motor produceByRowKey — PG koduna göre).
function blockKeyOf(code) {
  const m = String(code || '').match(/(\d+)\.(\d+)\.\d+/);
  return m ? m[1] + '.' + m[2] : '';
}

function StratejikPlanIzleme({
  deptId,
  deptName,
  yil,
  isManager,
  akademisyenler,
  currentAkademisyenId,
}) {
  const [loading, setLoading] = useState(true);
  const [noTemplate, setNoTemplate] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [indicators, setIndicators] = useState([]);
  const [values, setValues] = useState({});
  const [baseline, setBaseline] = useState({});
  const [assignments, setAssignments] = useState({}); // { blockKey: akademisyenId }
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [toast, setToast] = useState('');
  const akadList = Array.isArray(akademisyenler) ? akademisyenler : [];
  // Sadece akademisyen (yetkili değil) → yalnız kendine atanmış bloklar
  const academicianOnly = !isManager && !!currentAkademisyenId;
  const showToast = (m) => {
    setToast(m);
    setTimeout(() => setToast(''), 3500);
  };

  // 1) Şablonu çöz + göstergeleri ayrıştır
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setNoTemplate(false);
      setErrorMsg('');
      try {
        const token = localStorage.getItem('caku_auth_token');
        const headers = token ? { Authorization: 'Bearer ' + token } : {};
        const rr = await fetch(
          '/api/templates/resolve?module=performans&docType=strateji-izleme&departmentId=' +
            encodeURIComponent(deptId || ''),
          { headers, credentials: 'include' }
        );
        const rd = await rr.json().catch(() => ({}));
        const tpl = rd.template;
        if (!tpl || !tpl.file || tpl.file.extension !== 'docx') {
          if (!cancelled) {
            setNoTemplate(true);
            setLoading(false);
          }
          return;
        }
        const fr = await fetch('/api/templates/' + tpl._id + '/download', {
          headers,
          credentials: 'include',
        });
        if (!fr.ok) throw new Error('Şablon dosyası indirilemedi');
        const buf = await fr.arrayBuffer();
        const inds = await window.TemplateEngine.parseRowIndicators(buf);
        if (!cancelled) setIndicators(inds.filter((i) => i.isAcademic));
      } catch (e) {
        if (!cancelled) setErrorMsg(e.message || 'Şablon yüklenemedi');
      }
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [deptId]);

  // 2) Kayıtlı değerleri yükle (yıl + bölüm)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const rows = await window.apiRead('strateji_izleme').catch(() => []);
        const map = {};
        (Array.isArray(rows) ? rows : []).forEach((r) => {
          if (!r || !r.code) return;
          if (String(r.yil) !== String(yil)) return;
          if ((r.departmentId || '') !== (deptId || '')) return;
          map[r.code] = {
            deger: r.deger == null ? '' : String(r.deger),
            aciklama: r.aciklama == null ? '' : String(r.aciklama),
          };
        });
        if (!cancelled) {
          setValues(map);
          setBaseline(map);
        }
      } catch (_) {
        /* yut */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [deptId, yil]);

  // 3) Başlık→akademisyen atamalarını yükle (yıl + bölüm)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const rows = await window.apiRead('strateji_atama').catch(() => []);
        const map = {};
        (Array.isArray(rows) ? rows : []).forEach((r) => {
          if (!r || !r.blockKey) return;
          if (String(r.yil) !== String(yil)) return;
          if ((r.departmentId || '') !== (deptId || '')) return;
          map[r.blockKey] = r.akademisyenId || '';
        });
        if (!cancelled) setAssignments(map);
      } catch (_) {
        /* yut */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [deptId, yil]);

  const setField = (code, field, val) =>
    setValues((prev) => ({ ...prev, [code]: { ...(prev[code] || {}), [field]: val } }));

  // Bir bloğu (hedef) bir akademisyene ata → anında kaydet
  const assignBlock = async (blockKey, akademisyenId) => {
    setAssignments((prev) => ({ ...prev, [blockKey]: akademisyenId }));
    try {
      const docId = (yil + '_' + (deptId || 'x') + '_' + blockKey).replace(/[^\w]/g, '_');
      await window.DBWrite.set(
        'strateji_atama',
        docId,
        {
          yil: String(yil),
          departmentId: deptId || '',
          blockKey,
          akademisyenId: akademisyenId || '',
          updatedAt: new Date().toISOString(),
        },
        false
      );
      window.apiInvalidate && window.apiInvalidate('strateji_atama');
    } catch (e) {
      showToast('Atama kaydedilemedi: ' + e.message);
    }
  };

  // Akademisyen ise yalnız kendine atanmış blokların göstergeleri görünür
  const visibleIndicators = useMemo(() => {
    if (!academicianOnly) return indicators;
    return indicators.filter((i) => assignments[blockKeyOf(i.code)] === currentAkademisyenId);
  }, [indicators, academicianOnly, assignments, currentAkademisyenId]);

  const canEdit = isManager || academicianOnly;

  // Amaç → Hedef (blok) gruplama
  const grouped = useMemo(() => {
    const order = [];
    const byAmac = {};
    visibleIndicators.forEach((i) => {
      const amac = i.amac || 'Diğer';
      if (!byAmac[amac]) {
        byAmac[amac] = { amac, hedefOrder: [], hedefler: {} };
        order.push(byAmac[amac]);
      }
      const a = byAmac[amac];
      const hedef = i.hedef || '';
      if (!a.hedefler[hedef]) {
        a.hedefler[hedef] = { hedef, blockKey: blockKeyOf(i.code), items: [] };
        a.hedefOrder.push(hedef);
      }
      a.hedefler[hedef].items.push(i);
    });
    return order;
  }, [visibleIndicators]);

  const dirtyCount = useMemo(() => {
    let n = 0;
    visibleIndicators.forEach((i) => {
      const c = values[i.code] || {};
      const b = baseline[i.code] || {};
      if ((c.deger || '') !== (b.deger || '') || (c.aciklama || '') !== (b.aciklama || '')) n++;
    });
    return n;
  }, [visibleIndicators, values, baseline]);

  const handleSave = async () => {
    if (!canEdit) return;
    setSaving(true);
    try {
      const ops = [];
      visibleIndicators.forEach((i) => {
        const c = values[i.code] || {};
        const b = baseline[i.code] || {};
        if ((c.deger || '') === (b.deger || '') && (c.aciklama || '') === (b.aciklama || ''))
          return;
        const docId = (yil + '_' + (deptId || 'x') + '_' + i.code).replace(/[^\w]/g, '_');
        ops.push({
          collection: 'strateji_izleme',
          type: 'set',
          docId,
          data: {
            yil: String(yil),
            departmentId: deptId || '',
            code: i.code,
            deger: c.deger || '',
            aciklama: c.aciklama || '',
            updatedAt: new Date().toISOString(),
          },
        });
      });
      if (!ops.length) {
        showToast('Değişiklik yok.');
        setSaving(false);
        return;
      }
      for (let k = 0; k < ops.length; k += 20) await window.DBWrite.batch(ops.slice(k, k + 20));
      window.apiInvalidate && window.apiInvalidate('strateji_izleme');
      setBaseline(JSON.parse(JSON.stringify(values)));
      showToast(ops.length + ' gösterge kaydedildi.');
    } catch (e) {
      showToast('Kayıt hatası: ' + e.message);
    }
    setSaving(false);
  };

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const dataByKey = {};
      visibleIndicators.forEach((i) => {
        const c = values[i.code] || {};
        if ((c.deger || '') !== '' || (c.aciklama || '') !== '')
          dataByKey[i.code] = { deger: c.deger || '', aciklama: c.aciklama || '' };
      });
      const res = await window.TemplateEngine.produceByRowKey({
        module: 'performans',
        docType: 'strateji-izleme',
        departmentId: deptId || '',
        dataByKey,
        filename:
          'Stratejik_Plan_Izleme_' +
          (deptName || 'bolum').replace(/[^\wğüşıöçĞÜŞİÖÇ]/g, '_') +
          '_' +
          yil +
          '.docx',
      });
      if (!res.ok) {
        if (res.reason === 'no-template')
          showToast('Şablon bulunamadı. Şablonlar modülüne yükleyin.');
        else if (res.reason === 'invalid-output')
          showToast('Belge üretilemedi: ' + (res.message || 'yapı desteklenmiyor'));
        else showToast('Belge üretilemedi (' + res.reason + ').');
      }
    } catch (e) {
      showToast('Hata: ' + e.message);
    }
    setGenerating(false);
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '50px 20px', color: C.textMuted, fontSize: 14 }}>
        Stratejik plan şablonu yükleniyor…
      </div>
    );
  }
  if (noTemplate) {
    return (
      <div>
        <Hdr title="Stratejik Plan İzleme" sub={`${yil} yılı — ${deptName || 'bölüm'}`} />
        <InfoBar
          color={C.warning}
          text="Bu alan için Şablonlar modülüne bir 'Stratejik Plan İzleme' belgesi (modül: Performans) yüklenmemiş. Yükledikten sonra göstergeler burada otomatik listelenecek."
        />
      </div>
    );
  }
  if (errorMsg) {
    return (
      <div>
        <Hdr title="Stratejik Plan İzleme" sub={`${yil} yılı — ${deptName || 'bölüm'}`} />
        <InfoBar color={C.danger} text={'Şablon okunamadı: ' + errorMsg} />
      </div>
    );
  }

  const inpStyle = {
    width: '100%',
    padding: '6px 8px',
    borderRadius: 6,
    border: `1px solid ${C.border}`,
    fontSize: 12.5,
    fontFamily: F,
    boxSizing: 'border-box',
    background: canEdit ? C.white : C.surfaceAlt,
  };

  return (
    <div>
      <Hdr
        title="Stratejik Plan İzleme"
        sub={`${yil} yılı — ${deptName || 'bölüm'} · ${
          academicianOnly
            ? `size atanmış ${visibleIndicators.length} gösterge`
            : `akademik birim sorumlu ${indicators.length} gösterge`
        }`}
      />
      <InfoBar
        color={C.purple}
        text={
          academicianOnly
            ? 'Yalnızca size atanmış başlıkların göstergeleri görünür. Değer + Açıklama girip kaydedin.'
            : "Akademik birim sorumlu göstergeler listelenir. Her başlığı bir akademisyene atayabilir, değerleri girip kaydedebilirsiniz. 'Belge Üret' TÜM stratejik plan şablonunu üretir, girilen göstergeler dolu gelir."
        }
      />

      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        {canEdit && (
          <button
            onClick={handleSave}
            disabled={saving || dirtyCount === 0}
            style={{
              padding: '9px 18px',
              borderRadius: 8,
              border: 'none',
              background: dirtyCount ? C.success : C.border,
              color: '#fff',
              fontSize: 12.5,
              fontWeight: 600,
              cursor: dirtyCount ? 'pointer' : 'default',
              fontFamily: F,
            }}
          >
            {saving ? 'Kaydediliyor…' : dirtyCount ? `Kaydet (${dirtyCount})` : 'Kaydet'}
          </button>
        )}
        {!academicianOnly && (
          <button
            onClick={handleGenerate}
            disabled={generating}
            style={{
              padding: '9px 18px',
              borderRadius: 8,
              border: 'none',
              background: C.accent,
              color: '#fff',
              fontSize: 12.5,
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: F,
            }}
          >
            {generating ? 'Üretiliyor…' : '📄 Belge Üret (tüm şablon)'}
          </button>
        )}
      </div>

      {visibleIndicators.length === 0 ? (
        <InfoBar
          color={C.textMuted}
          text={
            academicianOnly
              ? 'Size atanmış bir stratejik plan başlığı bulunmuyor. Bölüm yetkilisi başlık atadığında burada görünecek.'
              : 'Şablonda akademik birim sorumlu gösterge bulunamadı.'
          }
        />
      ) : (
        grouped.map((a, ai) => (
          <div key={ai} style={{ marginBottom: 20 }}>
            <div
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: C.accent,
                padding: '8px 10px',
                background: C.accentGlow,
                borderRadius: 6,
                marginBottom: 8,
              }}
            >
              {a.amac}
            </div>
            {a.hedefOrder.map((hk, hi) => {
              const h = a.hedefler[hk];
              const assignedId = assignments[h.blockKey] || '';
              const assignedAkad = akadList.find((x) => x.id === assignedId);
              return (
                <div key={hi} style={{ marginBottom: 10, paddingLeft: 4 }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 10,
                      flexWrap: 'wrap',
                      margin: '4px 0 6px',
                    }}
                  >
                    {h.hedef && (
                      <div style={{ fontSize: 12, fontWeight: 600, color: C.textMuted, flex: 1 }}>
                        {h.hedef}
                      </div>
                    )}
                    {isManager ? (
                      <select
                        value={assignedId}
                        onChange={(e) => assignBlock(h.blockKey, e.target.value)}
                        title="Bu başlığı bir akademisyene ata"
                        style={{
                          padding: '5px 8px',
                          borderRadius: 6,
                          border: `1px solid ${assignedId ? C.success : C.border}`,
                          background: assignedId ? C.successDim : C.white,
                          fontSize: 11.5,
                          fontFamily: F,
                          color: C.text,
                          maxWidth: 260,
                        }}
                      >
                        <option value="">— Atanmadı —</option>
                        {akadList.map((x) => (
                          <option key={x.id} value={x.id}>
                            {x.ad || x.id}
                          </option>
                        ))}
                      </select>
                    ) : (
                      assignedAkad && (
                        <span style={{ fontSize: 11, color: C.success, fontWeight: 600 }}>
                          👤 {assignedAkad.ad}
                        </span>
                      )
                    )}
                  </div>
                  {h.items.map((it) => {
                    const v = values[it.code] || {};
                    return (
                      <div
                        key={it.code}
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'minmax(0,1fr) 110px minmax(0,1fr)',
                          gap: 8,
                          alignItems: 'start',
                          padding: '8px 10px',
                          border: `1px solid ${C.borderLight}`,
                          borderRadius: 8,
                          marginBottom: 6,
                          background: C.surface,
                        }}
                      >
                        <div style={{ fontSize: 12, color: C.text, lineHeight: 1.4 }}>
                          <span style={{ fontWeight: 700, color: C.accent }}>{it.code}</span>{' '}
                          {it.desc.replace(/^PG\s*\d+\.\d+\.\d+\.?\s*/i, '')}
                          {it.unit && (
                            <div style={{ fontSize: 10.5, color: C.textDim, marginTop: 2 }}>
                              🏛 {it.unit}
                            </div>
                          )}
                        </div>
                        <input
                          value={v.deger || ''}
                          onChange={(e) => setField(it.code, 'deger', e.target.value)}
                          disabled={!canEdit}
                          placeholder="Değer"
                          style={{ ...inpStyle, textAlign: 'center' }}
                        />
                        <input
                          value={v.aciklama || ''}
                          onChange={(e) => setField(it.code, 'aciklama', e.target.value)}
                          disabled={!canEdit}
                          placeholder="Açıklama"
                          style={inpStyle}
                        />
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        ))
      )}

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

// ═════════════ Stratejik Plan — Fakülte Özeti ═════════════
// Fakültedeki tüm bölümlerin girdiği değerleri gösterge bazında toplar
// (toplam / sabit) ve tek belge olarak çıktı alır. Yalnız fakülte/üni
// yetkilisi görür.
function StratejikPlanFakulteOzeti({ yil, facultyName, departments, isUniAdmin }) {
  const [loading, setLoading] = useState(true);
  const [noTemplate, setNoTemplate] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [indicators, setIndicators] = useState([]);
  const [rows, setRows] = useState([]); // strateji_izleme kayıtları (yıl)
  const [aggMode, setAggMode] = useState({}); // { code: 'sum'|'fixed' }
  const [generating, setGenerating] = useState(false);
  const [toast, setToast] = useState('');
  const showToast = (m) => {
    setToast(m);
    setTimeout(() => setToast(''), 3500);
  };

  // Fakültedeki bölümler (deptId → ad)
  const deptMap = useMemo(() => {
    const m = {};
    (Array.isArray(departments) ? departments : []).forEach((a) => {
      if (!a || !a.departmentId) return;
      if (!isUniAdmin && facultyName && a.fakulte !== facultyName) return;
      if (!m[a.departmentId]) m[a.departmentId] = a.bolum || a.departmentId;
    });
    return m;
  }, [departments, facultyName, isUniAdmin]);
  const deptIds = useMemo(() => Object.keys(deptMap), [deptMap]);

  // Şablonu çöz + göstergeleri ayrıştır (genel kapsam)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setNoTemplate(false);
      setErrorMsg('');
      try {
        const token = localStorage.getItem('caku_auth_token');
        const headers = token ? { Authorization: 'Bearer ' + token } : {};
        const rr = await fetch(
          '/api/templates/resolve?module=performans&docType=strateji-izleme&departmentId=',
          { headers, credentials: 'include' }
        );
        const rd = await rr.json().catch(() => ({}));
        const tpl = rd.template;
        if (!tpl || !tpl.file || tpl.file.extension !== 'docx') {
          if (!cancelled) {
            setNoTemplate(true);
            setLoading(false);
          }
          return;
        }
        const fr = await fetch('/api/templates/' + tpl._id + '/download', {
          headers,
          credentials: 'include',
        });
        if (!fr.ok) throw new Error('Şablon indirilemedi');
        const buf = await fr.arrayBuffer();
        const inds = await window.TemplateEngine.parseRowIndicators(buf);
        if (!cancelled) setIndicators(inds.filter((i) => i.isAcademic));
      } catch (e) {
        if (!cancelled) setErrorMsg(e.message || 'Şablon yüklenemedi');
      }
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Tüm bölümlerin değerlerini yükle
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const all = await window.apiRead('strateji_izleme').catch(() => []);
        const list = (Array.isArray(all) ? all : []).filter(
          (r) => r && String(r.yil) === String(yil)
        );
        if (!cancelled) setRows(list);
      } catch (_) {
        /* yut */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [yil]);

  // Gösterge bazında bölüm kırılımı + toplu değer
  const byCode = useMemo(() => {
    const map = {};
    rows.forEach((r) => {
      if (!r.code || !deptMap[r.departmentId]) return;
      if (!map[r.code]) map[r.code] = [];
      map[r.code].push({ dept: deptMap[r.departmentId], deger: r.deger, aciklama: r.aciklama });
    });
    return map;
  }, [rows, deptMap]);

  const aggValue = (code) => {
    const parts = byCode[code] || [];
    const nums = parts
      .map((p) => parseFloat(String(p.deger).replace(',', '.')))
      .filter((n) => !isNaN(n));
    const mode = aggMode[code] || 'sum';
    if (mode === 'fixed') {
      // sabit: dolu ilk değer
      const first = parts.find((p) => (p.deger || '') !== '');
      return first ? String(first.deger) : '';
    }
    // toplam: sayısalların toplamı; hiç sayısal yoksa dolu değerleri birleştir
    if (nums.length) return String(nums.reduce((a, b) => a + b, 0));
    const filled = parts.map((p) => p.deger).filter((x) => (x || '') !== '');
    return filled.join(' | ');
  };

  const grouped = useMemo(() => {
    const order = [];
    const byAmac = {};
    indicators.forEach((i) => {
      const amac = i.amac || 'Diğer';
      if (!byAmac[amac]) {
        byAmac[amac] = { amac, items: [] };
        order.push(byAmac[amac]);
      }
      byAmac[amac].items.push(i);
    });
    return order;
  }, [indicators]);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const dataByKey = {};
      indicators.forEach((i) => {
        const val = aggValue(i.code);
        if (val !== '') dataByKey[i.code] = { deger: val, aciklama: '' };
      });
      const res = await window.TemplateEngine.produceByRowKey({
        module: 'performans',
        docType: 'strateji-izleme',
        departmentId: '',
        dataByKey,
        filename:
          'Stratejik_Plan_Fakulte_' +
          (facultyName || 'fakulte').replace(/[^\wğüşıöçĞÜŞİÖÇ]/g, '_') +
          '_' +
          yil +
          '.docx',
      });
      if (!res.ok) showToast('Belge üretilemedi (' + res.reason + ').');
    } catch (e) {
      showToast('Hata: ' + e.message);
    }
    setGenerating(false);
  };

  if (loading)
    return (
      <div style={{ textAlign: 'center', padding: '50px 20px', color: C.textMuted, fontSize: 14 }}>
        Yükleniyor…
      </div>
    );
  if (noTemplate)
    return (
      <div>
        <Hdr title="Fakülte Özeti — Stratejik Plan" sub={`${yil} yılı`} />
        <InfoBar
          color={C.warning}
          text="Şablonlar modülüne bir 'Stratejik Plan İzleme' belgesi (modül: Performans) yüklenmemiş."
        />
      </div>
    );
  if (errorMsg)
    return (
      <div>
        <Hdr title="Fakülte Özeti — Stratejik Plan" sub={`${yil} yılı`} />
        <InfoBar color={C.danger} text={'Şablon okunamadı: ' + errorMsg} />
      </div>
    );

  return (
    <div>
      <Hdr
        title="Fakülte Özeti — Stratejik Plan"
        sub={`${yil} yılı — ${isUniAdmin ? 'tüm bölümler' : facultyName || 'fakülte'} · ${deptIds.length} bölüm · ${indicators.length} gösterge`}
      />
      <InfoBar
        color={C.success}
        text="Bölümlerin girdiği değerler gösterge bazında toplanır (toplam/sabit seçilebilir). 'Belge Üret' toplu değerlerle tek stratejik plan çıktısı verir."
      />
      <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
        <button
          onClick={handleGenerate}
          disabled={generating}
          style={{
            padding: '9px 18px',
            borderRadius: 8,
            border: 'none',
            background: C.accent,
            color: '#fff',
            fontSize: 12.5,
            fontWeight: 600,
            cursor: 'pointer',
            fontFamily: F,
          }}
        >
          {generating ? 'Üretiliyor…' : '📄 Toplu Belge Üret'}
        </button>
      </div>

      {grouped.map((a, ai) => (
        <div key={ai} style={{ marginBottom: 18 }}>
          <div
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: C.accent,
              padding: '8px 10px',
              background: C.accentGlow,
              borderRadius: 6,
              marginBottom: 8,
            }}
          >
            {a.amac}
          </div>
          {a.items.map((it) => {
            const parts = byCode[it.code] || [];
            const mode = aggMode[it.code] || 'sum';
            return (
              <div
                key={it.code}
                style={{
                  padding: '8px 10px',
                  border: `1px solid ${C.borderLight}`,
                  borderRadius: 8,
                  marginBottom: 6,
                  background: C.surface,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 10,
                    flexWrap: 'wrap',
                  }}
                >
                  <div style={{ fontSize: 12, color: C.text, flex: 1, minWidth: 200 }}>
                    <span style={{ fontWeight: 700, color: C.accent }}>{it.code}</span>{' '}
                    {it.desc.replace(/^PG\s*\d+\.\d+\.\d+\.?\s*/i, '').slice(0, 90)}
                  </div>
                  <select
                    value={mode}
                    onChange={(e) => setAggMode((p) => ({ ...p, [it.code]: e.target.value }))}
                    style={{
                      padding: '4px 6px',
                      borderRadius: 6,
                      border: `1px solid ${C.border}`,
                      fontSize: 11,
                      fontFamily: F,
                    }}
                  >
                    <option value="sum">Toplam</option>
                    <option value="fixed">Sabit</option>
                  </select>
                  <span
                    style={{
                      fontSize: 14,
                      fontWeight: 700,
                      color: C.success,
                      minWidth: 70,
                      textAlign: 'right',
                    }}
                  >
                    {aggValue(it.code) || '—'}
                  </span>
                </div>
                {parts.length > 0 && (
                  <div style={{ fontSize: 10.5, color: C.textDim, marginTop: 4 }}>
                    {parts.map((p, k) => (
                      <span key={k} style={{ marginRight: 10 }}>
                        {p.dept}: <b style={{ color: C.textMuted }}>{p.deger || '—'}</b>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ))}

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
