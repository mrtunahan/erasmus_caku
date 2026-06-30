import { useState, useMemo, useEffect } from 'react';

// ═══════════════════════════════════════════════════════════════
// ÇAKÜ ERASMUS+ — PERFORMANS BİLGİLERİ MODÜLÜ
// 3 Katmanlı: Akademisyen → Bölüm Yetkilisi → Fakülte Yetkilisi
// Sarı göstergeler (13 adet) + 4 çıktı formatı entegrasyonu
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

const HEDEFLER = [
  {
    hedef: 'YÜKSEKÖĞRETİMDE BİLİMSEL ARAŞTIRMA VE GELİŞTİRME',
    alt: 'Yükseköğretim Kurumlarında inovasyon amaçlı bilimsel çalışmaların arttırılması',
  },
  {
    hedef: 'YÜKSEKÖĞRETİM KURUMLARI SÜREKLİ EĞİTİM FAALİYETLERİ',
    alt: 'Toplumun tüm kesimlerine ihtiyaç duyduğu alanlarda eğitimler verilmesi',
  },
  {
    hedef: 'ÖĞRETİM ELEMANLARINA SAĞLANAN BURS VE DESTEKLER',
    alt: 'Alanında yetkin araştırmacı bilgi üreten ve aktaran akademisyenler yetiştirilmesi',
  },
  {
    hedef: 'ÖNLİSANS EĞİTİMİ LİSANS EĞİTİMİ VE LİSANSÜSTÜ EĞİTİMİ',
    alt: 'Mesleki yeterlilik sahibi ve gelişime açık mezunlar yetiştirilmesi',
  },
  {
    hedef: 'YÜKSEKÖĞRETİMDE ÖĞRENCİ YAŞAMI',
    alt: 'Öğrencilere sunulan beslenme ve barınma hizmetlerinin kalitesinin arttırılması',
  },
];

const DONEMLER_DETAY = [
  { id: 'I', label: 'I. Dönem', aylar: ['OCAK', 'ŞUBAT', 'MART'] },
  { id: 'II', label: 'II. Dönem', aylar: ['NİSAN', 'MAYIS', 'HAZİRAN'] },
  { id: 'III', label: 'III. Dönem', aylar: ['TEMMUZ', 'AĞUSTOS', 'EYLÜL'] },
  { id: 'IV', label: 'IV. Dönem', aylar: ['EKİM', 'KASIM', 'ARALIK'] },
];
const DONEMLER = DONEMLER_DETAY.map((d) => d.label);
const monthToDonemId = (m) => (m <= 3 ? 'I' : m <= 6 ? 'II' : m <= 9 ? 'III' : 'IV');
const GOSTERGE_TURLERI = ['Girdi', 'Çıktı', 'Verimlilik', 'Ekonomiklik', 'Etkililik', 'Sonuç'];

const ALL_GOSTERGE_IDS = GOSTERGELER.flatMap((k) => k.gostergeler.map((g) => g.id));
const findGosterge = (id) => {
  for (const k of GOSTERGELER) for (const g of k.gostergeler) if (g.id === id) return g;
  return null;
};

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

  // Rol currentUser'dan otomatik belirlenir
  const role =
    currentUser?.role === 'professor'
      ? 'akademisyen'
      : currentUser?.role === 'bolum_yetkilisi'
        ? 'bolumYetkilisi'
        : currentUser?.role === 'admin'
          ? 'fakulteYetkilisi'
          : 'akademisyen';

  const [selectedBolum, setSelectedBolum] = useState('');
  const [tab, setTab] = useState(0);

  // Yıl ve dönem seçimi (gösterge verileri için)
  const _now = new Date();
  const [selectedYil, setSelectedYil] = useState(String(_now.getFullYear()));
  const [selectedDonem, setSelectedDonem] = useState(monthToDonemId(_now.getMonth() + 1));
  const currentDonemDetay = DONEMLER_DETAY.find((d) => d.id === selectedDonem) || DONEMLER_DETAY[0];
  const currentAylar = currentDonemDetay.aylar;
  const periodKey = `${selectedYil}_${selectedDonem}`;

  // Akademisyen verileri: { [akademisyenId]: { [gostergeId_AY]: value } }
  const [akademisyenData, setAkademisyenData] = useState({});
  // Hedef verileri: { [akademisyenId]: { [hedefIdx]: text } }
  const [hedefData, setHedefData] = useState({});
  // Performans formu: { [akademisyenId]: { ...fields } }
  const [perfData, setPerfData] = useState({});
  // Rapor: { [akademisyenId]: { ...fields } }
  const [raporData, setRaporData] = useState({});

  // Bölüm yetkilisi: toplama kuralları (sum/fixed override)
  const [aggOverrides, setAggOverrides] = useState({}); // { [gostergeId]: "sum" | "fixed" }

  // Gönderim durumu: { [tabIndex]: true }
  const [submittedTabs, setSubmittedTabs] = useState({});

  const [toast, setToast] = useState('');
  const flash = (m) => {
    setToast(m);
    setTimeout(() => setToast(''), 3000);
  };

  // ── localStorage'dan veri yükle ──
  useEffect(() => {
    try {
      const saved = localStorage.getItem('performans_saved_data');
      if (saved) {
        const d = JSON.parse(saved);
        if (d.akademisyenData) setAkademisyenData(d.akademisyenData);
        if (d.hedefData) setHedefData(d.hedefData);
        if (d.perfData) setPerfData(d.perfData);
        if (d.raporData) setRaporData(d.raporData);
        if (d.submittedTabs) setSubmittedTabs(d.submittedTabs);
      }
    } catch (e) {
      console.error('Veri yüklenemedi:', e);
    }
  }, []);

  // ── Kaydet (localStorage) ──
  const handleSave = () => {
    try {
      const d = { akademisyenData, hedefData, perfData, raporData, submittedTabs };
      localStorage.setItem('performans_saved_data', JSON.stringify(d));
      flash('Veriler kaydedildi');
    } catch (e) {
      console.error('Kaydetme hatası:', e);
      flash('Kaydetme sırasında hata oluştu');
    }
  };

  // ── Gönder ──
  const handleSubmit = (tabIdx) => {
    handleSave();
    setSubmittedTabs((p) => ({ ...p, [tabIdx]: true }));
    try {
      const d = {
        akademisyenData,
        hedefData,
        perfData,
        raporData,
        submittedTabs: { ...submittedTabs, [tabIdx]: true },
      };
      localStorage.setItem('performans_saved_data', JSON.stringify(d));
    } catch (e) {
      /* ignore */
    }
    const tabNames = [
      'Gösterge İzleme',
      'Hedef Değerlendirme',
      'Performans Formu',
      'Rapor Formatı',
    ];
    flash(`${tabNames[tabIdx]} verileri gönderildi`);
  };

  // ── Akademisyen listesini API'den yükle ──
  useEffect(() => {
    const load = async () => {
      setLoadingAkad(true);
      try {
        // Akademisyenler modülü kaldırıldı — veriyi doğrudan 'professors'
        // koleksiyonundan çekiyoruz. Bölüm/fakülte adları için departments
        // + faculties koleksiyonlarıyla zenginleştirilir.
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

  // Uyumlu referanslar (mevcut kodla uyum için)
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
  // Çoklu strateji: isim eşleme → username türetme → soyadı eşleme
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

    // 1) Tam isim eşleme (unvan/harf toleranslı)
    const nameKey = bare.replace(/\s+/g, ' ').trim().toLocaleLowerCase('tr');
    const nameMatch = AKADEMISYENLER.find((a) => {
      const aKey = stripTitle(a.ad).replace(/\s+/g, ' ').trim().toLocaleLowerCase('tr');
      return aKey === nameKey;
    });
    if (nameMatch) return nameMatch;

    // 2) Username türetme (tam ad birleşik → "selimbuyrukoglu")
    const fullSlug = toAsciiSlug(bare);
    const slugMatch = AKADEMISYENLER.find((a) => a.id === fullSlug);
    if (slugMatch) return slugMatch;

    // 3) Soyadı + ad baş harfi eşleme ("sbuyrukoglu", "sbuyrukoğlu" vb.)
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

  // ── Hesaplamalar ──
  const currentAkad = matchedAkademisyen;

  const bolumAkademisyenleri = useMemo(() => {
    if (role === 'bolumYetkilisi' && activeDepartment) {
      return AKADEMISYENLER.filter((a) => a.departmentId === activeDepartment);
    }
    return AKADEMISYENLER.filter((a) => a.bolum === selectedBolum);
  }, [AKADEMISYENLER, role, activeDepartment, selectedBolum]);

  const fakulteBolumleri = useMemo(() => {
    if (role !== 'fakulteYetkilisi') return [];
    // Tüm Mühendislik Fakültesi bölümlerini window.DEPARTMENTS'tan al (6 bölüm)
    const allDepts =
      typeof window !== 'undefined' && Array.isArray(window.DEPARTMENTS) ? window.DEPARTMENTS : [];
    if (allDepts.length > 0) return allDepts.map((d) => d.name);
    if (FAKULTELER.length === 0) return [];
    const fak = FAKULTELER[0];
    return [...new Set(AKADEMISYENLER.filter((a) => a.fakulte === fak).map((a) => a.bolum))];
  }, [role, AKADEMISYENLER, FAKULTELER]);

  // Bölüm toplamı hesapla (seçili yıl/dönem)
  const calcBolumToplam = (gostergeId, ay) => {
    const g = findGosterge(gostergeId);
    const aggType = aggOverrides[gostergeId] || g?.aggType || 'sum';
    const vals = bolumAkademisyenleri
      .map((a) => {
        const v = akademisyenData[a.id]?.[`${periodKey}_${gostergeId}_${ay}`];
        return v ? parseFloat(v) : 0;
      })
      .filter((v) => !isNaN(v));
    if (vals.length === 0) return '—';
    if (aggType === 'fixed') return vals[0] || '—';
    return vals.reduce((a, b) => a + b, 0);
  };

  // Fakülte toplamı (tüm bölümlerden — seçili yıl/dönem)
  const calcFakulteToplam = (gostergeId, ay) => {
    const g = findGosterge(gostergeId);
    const aggType = aggOverrides[gostergeId] || g?.aggType || 'sum';
    const allAkads = AKADEMISYENLER.filter((a) => a.fakulte === FAKULTELER[0]);
    const vals = allAkads
      .map((a) => {
        const v = akademisyenData[a.id]?.[`${periodKey}_${gostergeId}_${ay}`];
        return v ? parseFloat(v) : 0;
      })
      .filter((v) => !isNaN(v));
    if (vals.length === 0) return '—';
    if (aggType === 'fixed') return vals[0] || '—';
    return vals.reduce((a, b) => a + b, 0);
  };

  // ── Export yardımcıları ──
  const downloadFile = (content, filename, mimeType) => {
    const b = new Blob([content], { type: mimeType });
    const u = URL.createObjectURL(b);
    Object.assign(document.createElement('a'), { href: u, download: filename }).click();
    URL.revokeObjectURL(u);
  };

  // SheetJS dinamik yükleyici (gerçek .xlsx üretmek için)
  const loadSheetJS = () =>
    new Promise((resolve, reject) => {
      if (window.XLSX) {
        resolve(window.XLSX);
        return;
      }
      const s = document.createElement('script');
      s.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
      s.onload = () => resolve(window.XLSX);
      s.onerror = () => reject(new Error('SheetJS yüklenemedi'));
      document.head.appendChild(s);
    });

  // Verilen HTML tablosunu geçici DOM'a yerleştirip gerçek xlsx olarak indir
  const downloadTableAsXlsx = async (tableHtml, filename, sheetName = 'Sayfa1') => {
    try {
      const XLSX = await loadSheetJS();
      const wrap = document.createElement('div');
      wrap.style.cssText = 'position:absolute;left:-99999px;top:-99999px;visibility:hidden';
      wrap.innerHTML = tableHtml;
      document.body.appendChild(wrap);
      const tableEl = wrap.querySelector('table');
      const wb = XLSX.utils.table_to_book(tableEl, { sheet: sheetName.slice(0, 31), raw: false });
      XLSX.writeFile(wb, filename);
      document.body.removeChild(wrap);
    } catch (e) {
      alert('XLSX oluşturulamadı: ' + e.message);
    }
  };

  const xlsxStyles = `<style>
    body{font-family:Calibri,Arial,sans-serif;font-size:10pt}
    table{border-collapse:collapse;width:100%;table-layout:fixed}
    td,th{border:1px solid #000;padding:6px 8px;vertical-align:middle;word-wrap:break-word}
    .sec{background:#1F3864;color:#fff;font-weight:bold;text-align:center;font-size:11pt}
    .sub{background:#D9E1F2;color:#1F3864;font-weight:bold;font-size:10pt}
    .lbl{background:#F2F2F2;font-weight:bold}
    .val{background:#FFF2CC;text-align:center;font-weight:bold}
    .month{background:#1F3864;color:#fff;font-weight:bold;text-align:center}
    .center{text-align:center}
    .title{background:#1F3864;color:#fff;font-weight:bold;font-size:14pt;text-align:center;padding:10px}
  </style>`;

  const xlsxWrap = (
    tableHtml
  ) => `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
<head><meta charset="utf-8">${xlsxStyles}<!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>Sayfa1</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]--></head><body>${tableHtml}</body></html>`;

  const docxWrap = (
    bodyHtml
  ) => `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
<head><meta charset="utf-8"><style>body{font-family:Calibri,sans-serif;font-size:11pt}table{border-collapse:collapse;width:100%}th,td{border:1px solid #999;padding:6px 8px}th{background:#1B2A4A;color:#fff}</style><!--[if gte mso 9]><xml><w:WordDocument><w:View>Print</w:View></w:WordDocument></xml><![endif]--></head><body>${bodyHtml}</body></html>`;

  // 1) Gösterge_İzleme.xlsx — Resmi format: Bölüm/Alt-hedef başlıkları + aylık değer matrisi
  const exportGostergeIzleme = () => {
    const akadId = role === 'akademisyen' ? selectedAkademisyen : null;
    const totalCols = currentAylar.length + 3; // Gösterge + Birim + Plan + aylar
    let rows = '';
    // Üst başlık
    rows += `<tr><td colspan="${totalCols}" class="title">GÖSTERGE İZLEME TABLOSU — ${selectedYil} / ${currentDonemDetay.label}</td></tr>`;
    // Sütun başlıkları
    rows += `<tr><th class="month" style="width:42%">GÖSTERGE</th><th class="month" style="width:8%">BİRİM</th><th class="month" style="width:10%">PLAN/HEDEF</th>`;
    currentAylar.forEach((a) => {
      rows += `<th class="month">${a}</th>`;
    });
    rows += `</tr>`;

    GOSTERGELER.forEach((kat) => {
      rows += `<tr><td colspan="${totalCols}" class="sec">${kat.kategori}</td></tr>`;
      if (kat.hedef) rows += `<tr><td colspan="${totalCols}" class="sub">${kat.hedef}</td></tr>`;
      kat.gostergeler.forEach((g) => {
        rows += `<tr><td>${g.ad}</td><td class="center">${g.birim}</td><td class="center"></td>`;
        currentAylar.forEach((a) => {
          let v = '';
          if (role === 'akademisyen')
            v = akademisyenData[akadId]?.[`${periodKey}_${g.id}_${a}`] || '';
          else {
            const t = calcBolumToplam(g.id, a);
            v = t === '—' ? '' : t;
          }
          rows += `<td class="${v ? 'val' : 'center'}">${v}</td>`;
        });
        rows += `</tr>`;
      });
    });
    const html = `<table>${rows}</table>`;
    downloadTableAsXlsx(
      html,
      `Gösterge_İzleme_${selectedYil}_${selectedDonem}.xlsx`,
      'Gosterge Izleme'
    );
    flash('Gösterge_İzleme.xlsx indirildi');
  };

  // 2) Hedef_Değerlendirmeler.xlsx — 2 sütun: HEDEF | DÖNEM DEĞERLENDİRMESİ
  const exportHedefDegerlendirmeler = () => {
    const akadId = role === 'akademisyen' ? selectedAkademisyen : null;
    const donemAdi = raporData[akadId]?.donem || 'VI. Dönem';
    let rows = '';
    rows += `<tr><td colspan="2" class="title">HEDEF DEĞERLENDİRMELERİ</td></tr>`;
    rows += `<tr><th class="month" style="width:50%">HEDEF</th><th class="month" style="width:50%">${donemAdi.toLocaleUpperCase('tr')} DEĞERLENDİRMESİ</th></tr>`;
    HEDEFLER.forEach((h, i) => {
      // Hedef başlık satırı (koyu)
      rows += `<tr><td class="sub" style="vertical-align:top"><div style="font-weight:bold;color:#1F3864">${h.hedef}</div><div style="font-size:9pt;color:#444;margin-top:4px;font-weight:normal">${h.alt}</div></td>`;
      let val = '';
      if (role === 'akademisyen') {
        val = hedefData[akadId]?.[i] || '';
      } else {
        const akads =
          role === 'bolumYetkilisi'
            ? bolumAkademisyenleri
            : AKADEMISYENLER.filter((a) => a.fakulte === FAKULTELER[0]);
        const parts = akads
          .map((a) => {
            const v = hedefData[a.id]?.[i];
            return v ? `<div style="margin-bottom:6px"><strong>${a.ad}:</strong> ${v}</div>` : '';
          })
          .filter(Boolean);
        val = parts.join('');
      }
      rows += `<td style="vertical-align:top;min-height:60px">${val}</td></tr>`;
    });
    const html = `<table>${rows}</table>`;
    downloadTableAsXlsx(
      html,
      `Hedef_Değerlendirmeler_${selectedYil}_${selectedDonem}.xlsx`,
      'Hedef Degerlendirmeler'
    );
    flash('Hedef_Değerlendirmeler.xlsx indirildi');
  };

  // 3) Performans_Göstergesi_Tablosu.xlsx — Performans Göstergesi Nitelikleri Formu
  const exportPerformansTablosu = () => {
    const akadId = role === 'akademisyen' ? selectedAkademisyen : null;
    let rows = '';
    const renderForm = (d) => {
      let s = '';
      // Performans Göstergesi
      s += `<tr><td class="lbl" style="width:35%">Performans Göstergesi</td><td colspan="6">${d.gosterge || ''}</td></tr>`;
      // Stratejik Yapılandırma (Dönem)
      s += `<tr><td class="lbl">Stratejik Yapılandırma</td><td colspan="6">${d.donem || ''}</td></tr>`;
      // Gösterge Türü (6 hücre tek satır)
      s += `<tr><td class="lbl" rowspan="2">Performans Göstergesinin Hangi Yönünü Açıkladığı</td>`;
      GOSTERGE_TURLERI.forEach((t) => {
        s += `<td class="lbl center" style="font-size:9pt">${t}</td>`;
      });
      s += `</tr><tr>`;
      GOSTERGE_TURLERI.forEach((t) => {
        s += `<td class="${d.tur === t ? 'val' : ''} center">${d.tur === t ? '✓' : ''}</td>`;
      });
      s += `</tr>`;
      // Diğer alanlar
      s += `<tr><td class="lbl">Performans Göstergesini Oluşturmak Esas Tahminler İçin Önemli Olduğu Bilinen Dışsal Unsurlar</td><td colspan="6">${d.dissal || ''}</td></tr>`;
      s += `<tr><td class="lbl">Performans Göstergesinin İzlenmesinde Karşılaşılan Sorunlar</td><td colspan="6">${d.sorunlar || ''}</td></tr>`;
      s += `<tr><td class="lbl">Performans Göstergesinin Maliyetleri</td><td colspan="6">${d.maliyetler || ''}</td></tr>`;
      s += `<tr><td class="lbl">Performans Göstergesinin Kıyaslama Kaynakları</td><td colspan="6">${d.kiyaslama || ''}</td></tr>`;
      s += `<tr><td class="lbl">Ölçüm Tarihi</td><td colspan="6">${d.olcumTarihi || ''}</td></tr>`;
      s += `<tr><td class="lbl">Sonra Ölçüm Tarihi</td><td colspan="6">${d.sonrakiOlcum || ''}</td></tr>`;
      s += `<tr><td class="lbl">Ölçüm Yapılmadıysa Gerekçeleri</td><td colspan="6">${d.gerekceler || ''}</td></tr>`;
      return s;
    };
    rows += `<tr><td colspan="7" class="title">Performans Göstergesi Nitelikleri Formu</td></tr>`;
    if (role === 'akademisyen') {
      rows += renderForm(perfData[akadId] || {});
    } else {
      const akads =
        role === 'bolumYetkilisi'
          ? bolumAkademisyenleri
          : AKADEMISYENLER.filter((a) => a.fakulte === FAKULTELER[0]);
      akads.forEach((a) => {
        const d = perfData[a.id];
        if (d && d.gosterge) {
          rows += `<tr><td colspan="7" class="sec">${a.ad} — ${a.bolum}</td></tr>`;
          rows += renderForm(d);
        }
      });
    }
    const html = `<table>${rows}</table>`;
    downloadTableAsXlsx(
      html,
      `Performans_Göstergesi_Tablosu_${selectedYil}_${selectedDonem}.xlsx`,
      'Performans Tablosu'
    );
    flash('Performans_Göstergesi_Tablosu.xlsx indirildi');
  };

  // 4) Gösterge_Rapor_Formatı.docx
  const exportRaporFormati = () => {
    const akadId = role === 'akademisyen' ? selectedAkademisyen : null;
    let body = '';
    const renderRapor = (d, name) => {
      let s = name ? `<h2>${name}</h2>` : '';
      s += `<p><strong>Yıl:</strong> ${d.yil || ''} &nbsp; <strong>İdare:</strong> ${d.idare || ''} &nbsp; <strong>Merci:</strong> ${d.merci || ''} &nbsp; <strong>Dönem:</strong> ${d.donem || ''}</p>`;
      s += `<h3>I. Tespitler</h3>`;
      s += `<p><strong>Genel Bilgiler:</strong><br/>${(d.genelBilgiler || '').replace(/\n/g, '<br/>')}</p>`;
      s += `<p><strong>Gerçekleşme Durumu:</strong><br/>${(d.gerceklesmeDurumu || '').replace(/\n/g, '<br/>')}</p>`;
      s += `<p><strong>Değerlendirme:</strong><br/>${(d.degerlendirme || '').replace(/\n/g, '<br/>')}</p>`;
      s += `<h3>II. Sonuç ve Öneriler</h3>`;
      s += `<p>${(d.sonucOneriler || '').replace(/\n/g, '<br/>')}</p><hr/>`;
      return s;
    };
    if (role === 'akademisyen') {
      const d = raporData[akadId] || {};
      body = `<h1>Gösterge Rapor Formatı</h1>` + renderRapor(d);
    } else {
      body = `<h1>Gösterge Rapor Formatı — ${role === 'bolumYetkilisi' ? 'Bölüm Özeti' : 'Fakülte Özeti'}</h1>`;
      const akads =
        role === 'bolumYetkilisi'
          ? bolumAkademisyenleri
          : AKADEMISYENLER.filter((a) => a.fakulte === FAKULTELER[0]);
      akads.forEach((a) => {
        const d = raporData[a.id];
        if (d && d.genelBilgiler) body += renderRapor(d, a.ad);
      });
    }
    downloadFile(docxWrap(body), 'Gösterge_Rapor_Formatı.docx', 'application/msword');
    flash('Gösterge_Rapor_Formatı.docx indirildi');
  };

  const tabs = [
    { label: 'Gösterge İzleme' },
    { label: 'Hedef Değerlendirme' },
    { label: 'Performans Formu' },
    { label: 'Rapor Formatı' },
  ];

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
                Performans Bilgileri
              </p>
            </div>
          </div>
          {/* Rol Göstergesi */}
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
            {role === 'akademisyen'
              ? 'Akademisyen'
              : role === 'bolumYetkilisi'
                ? 'Bölüm Yetkilisi'
                : 'Fakülte Yetkilisi'}
          </div>
        </div>

        {/* Akademisyen bilgisi */}
        {role === 'akademisyen' && matchedAkademisyen && (
          <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>Giriş yapan:</span>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#fff' }}>
              {matchedAkademisyen.ad} — {matchedAkademisyen.bolum}
            </span>
          </div>
        )}

        {/* Bölüm bilgisi (bölüm yetkilisi rolünde) */}
        {role === 'bolumYetkilisi' && (
          <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>Bölüm:</span>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#fff' }}>
              {departmentInfo?.name || selectedBolum}
            </span>
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginLeft: 8 }}>
              ({bolumAkademisyenleri.length} akademisyen)
            </span>
          </div>
        )}

        {role === 'fakulteYetkilisi' && (
          <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>
              Tüm bölümlerden gelen toplam değerler gösterilmektedir
            </span>
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>
              ({FAKULTELER[0]} — {fakulteBolumleri.length} bölüm)
            </span>
          </div>
        )}
      </div>

      {/* ── Tab Bar ── */}
      <div
        style={{
          display: 'flex',
          background: C.surface,
          borderBottom: `1px solid ${C.border}`,
          overflowX: 'auto',
        }}
      >
        {tabs.map((t, i) => (
          <button
            key={i}
            onClick={() => setTab(i)}
            style={{
              flex: '1 1 0',
              padding: '12px 8px',
              border: 'none',
              background: tab === i ? C.bg : 'transparent',
              color: tab === i ? C.accent : C.textMuted,
              fontSize: 11.5,
              fontWeight: tab === i ? 700 : 500,
              cursor: 'pointer',
              borderBottom: tab === i ? `3px solid ${C.accent}` : '3px solid transparent',
              transition: 'all 0.2s',
              fontFamily: F,
              whiteSpace: 'nowrap',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 4,
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Content ── */}
      <div style={{ padding: '20px 16px 40px', maxWidth: 1200, margin: '0 auto' }}>
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
        ) : role === 'akademisyen' && !matchedAkademisyen ? (
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
              Bu modülü kullanabilmek için öncelikle{' '}
              <span style={{ color: C.accent, fontWeight: 600 }}>Akademisyenler</span> modülüne
              kayıtlı olmanız gerekmektedir. Lütfen bölüm yetkilinizle iletişime geçin.
            </div>
          </div>
        ) : (
          <>
            {/* ════════ TAB 0: GÖSTERGE İZLEME ════════ */}
            {tab === 0 && (
              <div>
                {/* ── Yıl ve Dönem Seçici (tüm roller) ── */}
                <PeriodSelector
                  yil={selectedYil}
                  setYil={setSelectedYil}
                  donem={selectedDonem}
                  setDonem={setSelectedDonem}
                  aylar={currentAylar}
                />

                {/* ── AKADEMİSYEN GÖRÜNÜMÜ ── */}
                {role === 'akademisyen' && (
                  <>
                    <Hdr
                      title="Gösterge Verilerini Girin"
                      sub={`${currentAkad?.ad} — ${currentAkad?.bolum} • ${selectedYil} / ${currentDonemDetay.label}`}
                    />
                    <InfoBar
                      color={C.yellow}
                      text={`Seçili dönemin (${currentDonemDetay.label}) aylık gösterge verilerinizi giriniz. Her dönem ayrı kaydedilir.`}
                    />
                    {GOSTERGELER.map((kat, ki) => (
                      <GostergeTable
                        key={ki}
                        kat={kat}
                        aylar={currentAylar}
                        getValue={(gId, ay) =>
                          akademisyenData[selectedAkademisyen]?.[`${periodKey}_${gId}_${ay}`] || ''
                        }
                        setValue={(gId, ay, val) =>
                          setAkademisyenData((p) => ({
                            ...p,
                            [selectedAkademisyen]: {
                              ...(p[selectedAkademisyen] || {}),
                              [`${periodKey}_${gId}_${ay}`]: val,
                            },
                          }))
                        }
                        editable
                        inputStyle={inp}
                      />
                    ))}
                    <SaveSubmitBar
                      onSave={handleSave}
                      onSubmit={() => handleSubmit(0)}
                      submitted={submittedTabs[0]}
                    />
                  </>
                )}

                {/* ── BÖLÜM YETKİLİSİ GÖRÜNÜMÜ ── */}
                {role === 'bolumYetkilisi' && (
                  <>
                    <Hdr
                      title="Bölüm Gösterge Özeti"
                      sub={`${selectedBolum} — ${selectedYil} / ${currentDonemDetay.label}`}
                    />
                    <InfoBar
                      color={C.warning}
                      text="Akademisyenlerin girdiği değerler toplanarak gösterilmektedir. Her gösterge için toplama kuralını (Topla/Sabit) ayarlayabilirsiniz."
                    />

                    {/* Akademisyen bazlı detay */}
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
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                          }}
                        >
                          {akad.ad}
                        </div>
                        {GOSTERGELER.map((kat, ki) => (
                          <GostergeTable
                            key={ki}
                            kat={kat}
                            aylar={currentAylar}
                            compact
                            getValue={(gId, ay) =>
                              akademisyenData[akad.id]?.[`${periodKey}_${gId}_${ay}`] || ''
                            }
                            editable={false}
                          />
                        ))}
                      </div>
                    ))}

                    {/* Toplam satırı */}
                    <div
                      style={{ marginTop: 20, borderTop: `2px solid ${C.warning}`, paddingTop: 16 }}
                    >
                      <div
                        style={{
                          fontSize: 14,
                          fontWeight: 700,
                          color: C.warning,
                          marginBottom: 12,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                        }}
                      >
                        BÖLÜM TOPLAM DEĞERLERİ
                      </div>
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
                            style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}
                          >
                            <thead>
                              <tr>
                                <th style={th}>Gösterge</th>
                                <th style={{ ...th, width: 50, textAlign: 'center' }}>Birim</th>
                                <th style={{ ...th, width: 75, textAlign: 'center' }}>Kural</th>
                                {currentAylar.map((a) => (
                                  <th key={a} style={{ ...th, width: 90, textAlign: 'center' }}>
                                    {a}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {kat.gostergeler.map((g) => {
                                const currentAgg = aggOverrides[g.id] || g.aggType;
                                return (
                                  <tr key={g.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                                    <td style={{ ...td, paddingLeft: 8 }}>
                                      <div
                                        style={{ display: 'flex', alignItems: 'center', gap: 5 }}
                                      >
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
                                        onChange={(e) =>
                                          setAggOverrides((p) => ({ ...p, [g.id]: e.target.value }))
                                        }
                                        style={{
                                          ...inpF,
                                          padding: '3px 4px',
                                          fontSize: 10,
                                          width: '100%',
                                          textAlign: 'center',
                                        }}
                                      >
                                        <option value="sum">Topla</option>
                                        <option value="fixed">Sabit</option>
                                      </select>
                                    </td>
                                    {currentAylar.map((a) => (
                                      <td
                                        key={a}
                                        style={{
                                          ...td,
                                          textAlign: 'center',
                                          fontWeight: 700,
                                          color: C.warning,
                                          fontSize: 13,
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
                    </div>
                  </>
                )}

                {/* ── FAKÜLTE YETKİLİSİ GÖRÜNÜMÜ ── */}
                {role === 'fakulteYetkilisi' && (
                  <>
                    <Hdr
                      title="Fakülte Genel Toplam"
                      sub={`Tüm bölümlerden gelen toplam değerler — ${selectedYil} / ${currentDonemDetay.label}`}
                    />
                    <InfoBar
                      color={C.purple}
                      text="Her bölümden gelen toplam değerler fakülte düzeyinde birleştirilmiştir."
                    />

                    {/* Fakülte toplam */}
                    <div
                      style={{ marginTop: 16, borderTop: `2px solid ${C.purple}`, paddingTop: 14 }}
                    >
                      <div
                        style={{ fontSize: 14, fontWeight: 700, color: C.purple, marginBottom: 10 }}
                      >
                        FAKÜLTE GENEL TOPLAM
                      </div>
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
                            style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}
                          >
                            <thead>
                              <tr>
                                <th style={th}>Gösterge</th>
                                {currentAylar.map((a) => (
                                  <th key={a} style={{ ...th, width: 90, textAlign: 'center' }}>
                                    {a}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {kat.gostergeler.map((g) => (
                                <tr key={g.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                                  <td style={{ ...td, paddingLeft: 8 }}>{g.ad}</td>
                                  {currentAylar.map((a) => (
                                    <td
                                      key={a}
                                      style={{
                                        ...td,
                                        textAlign: 'center',
                                        fontWeight: 700,
                                        color: C.purple,
                                        fontSize: 13,
                                      }}
                                    >
                                      {calcFakulteToplam(g.id, a)}
                                    </td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* ════════ TAB 1: HEDEF DEĞERLENDİRME ════════ */}
            {tab === 1 && (
              <div>
                {role === 'akademisyen' && (
                  <>
                    <Hdr title="Hedef Değerlendirmeleri" sub={`${currentAkad?.ad}`} />
                    {HEDEFLER.map((h, i) => (
                      <div
                        key={i}
                        style={{
                          background: C.surface,
                          border: `1px solid ${C.border}`,
                          borderRadius: 10,
                          padding: 16,
                          marginBottom: 12,
                        }}
                      >
                        <div
                          style={{
                            fontSize: 11.5,
                            fontWeight: 700,
                            color: C.accent,
                            textTransform: 'uppercase',
                          }}
                        >
                          {h.hedef}
                        </div>
                        <div
                          style={{
                            fontSize: 11,
                            color: C.textMuted,
                            marginBottom: 10,
                            marginTop: 2,
                          }}
                        >
                          {h.alt}
                        </div>
                        <textarea
                          value={hedefData[selectedAkademisyen]?.[i] || ''}
                          onChange={(e) =>
                            setHedefData((p) => ({
                              ...p,
                              [selectedAkademisyen]: {
                                ...(p[selectedAkademisyen] || {}),
                                [i]: e.target.value,
                              },
                            }))
                          }
                          rows={3}
                          placeholder="Değerlendirmenizi yazınız..."
                          style={txa}
                        />
                      </div>
                    ))}
                    <SaveSubmitBar
                      onSave={handleSave}
                      onSubmit={() => handleSubmit(1)}
                      submitted={submittedTabs[1]}
                    />
                  </>
                )}
                {(role === 'bolumYetkilisi' || role === 'fakulteYetkilisi') && (
                  <>
                    <Hdr
                      title={`Hedef Değerlendirmeleri — ${role === 'bolumYetkilisi' ? 'Bölüm Özeti' : 'Fakülte Özeti'}`}
                      sub="Akademisyenlerin girdiği değerlendirmeler"
                    />
                    {HEDEFLER.map((h, i) => {
                      const akads =
                        role === 'bolumYetkilisi'
                          ? bolumAkademisyenleri
                          : AKADEMISYENLER.filter((a) => a.fakulte === FAKULTELER[0]);
                      return (
                        <div
                          key={i}
                          style={{
                            background: C.surface,
                            border: `1px solid ${C.border}`,
                            borderRadius: 10,
                            padding: 16,
                            marginBottom: 12,
                          }}
                        >
                          <div
                            style={{
                              fontSize: 11.5,
                              fontWeight: 700,
                              color: C.accent,
                              textTransform: 'uppercase',
                            }}
                          >
                            {h.hedef}
                          </div>
                          {akads.map((a) => {
                            const val = hedefData[a.id]?.[i];
                            if (!val) return null;
                            return (
                              <div
                                key={a.id}
                                style={{
                                  marginTop: 8,
                                  padding: '8px 10px',
                                  background: C.surfaceAlt,
                                  borderRadius: 6,
                                  border: `1px solid ${C.border}`,
                                }}
                              >
                                <div
                                  style={{
                                    fontSize: 11,
                                    fontWeight: 600,
                                    color: C.accent,
                                    marginBottom: 3,
                                  }}
                                >
                                  {a.ad}
                                </div>
                                <div style={{ fontSize: 12, color: C.text, lineHeight: 1.4 }}>
                                  {val}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })}
                  </>
                )}
              </div>
            )}

            {/* ════════ TAB 2: PERFORMANS FORMU ════════ */}
            {tab === 2 && (
              <div>
                {role === 'akademisyen' && (
                  <>
                    <Hdr title="Performans Göstergesi Nitelikleri" sub={`${currentAkad?.ad}`} />
                    <PerfForm
                      data={perfData[selectedAkademisyen] || {}}
                      setData={(d) => setPerfData((p) => ({ ...p, [selectedAkademisyen]: d }))}
                    />
                    <SaveSubmitBar
                      onSave={handleSave}
                      onSubmit={() => handleSubmit(2)}
                      submitted={submittedTabs[2]}
                    />
                  </>
                )}
                {(role === 'bolumYetkilisi' || role === 'fakulteYetkilisi') && (
                  <>
                    <Hdr
                      title={`Performans Formları — ${role === 'bolumYetkilisi' ? 'Bölüm' : 'Fakülte'}`}
                      sub="Akademisyenlerin doldurduğu formlar"
                    />
                    {(role === 'bolumYetkilisi'
                      ? bolumAkademisyenleri
                      : AKADEMISYENLER.filter((a) => a.fakulte === FAKULTELER[0])
                    ).map((a) => {
                      const d = perfData[a.id];
                      if (!d || !d.gosterge) return null;
                      return (
                        <div
                          key={a.id}
                          style={{
                            background: C.surface,
                            border: `1px solid ${C.border}`,
                            borderRadius: 10,
                            padding: 16,
                            marginBottom: 12,
                          }}
                        >
                          <div
                            style={{
                              fontSize: 12,
                              fontWeight: 600,
                              color: C.accent,
                              marginBottom: 8,
                            }}
                          >
                            {a.ad} — {a.bolum}
                          </div>
                          <div
                            style={{
                              display: 'grid',
                              gridTemplateColumns: '1fr 1fr',
                              gap: 8,
                              fontSize: 12,
                            }}
                          >
                            <div>
                              <span style={{ color: C.textDim }}>Gösterge:</span> {d.gosterge}
                            </div>
                            <div>
                              <span style={{ color: C.textDim }}>Dönem:</span> {d.donem}
                            </div>
                            <div>
                              <span style={{ color: C.textDim }}>Tür:</span> {d.tur}
                            </div>
                            <div>
                              <span style={{ color: C.textDim }}>Ölçüm Tarihi:</span>{' '}
                              {d.olcumTarihi}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </>
                )}
              </div>
            )}

            {/* ════════ TAB 3: RAPOR FORMATI ════════ */}
            {tab === 3 && (
              <div>
                {role === 'akademisyen' && (
                  <>
                    <Hdr title="Rapor Formatı" sub={`${currentAkad?.ad}`} />
                    <RaporForm
                      data={raporData[selectedAkademisyen] || { yil: '2026', donem: 'I. Dönem' }}
                      setData={(d) => setRaporData((p) => ({ ...p, [selectedAkademisyen]: d }))}
                    />
                    <SaveSubmitBar
                      onSave={handleSave}
                      onSubmit={() => handleSubmit(3)}
                      submitted={submittedTabs[3]}
                    />
                  </>
                )}
                {(role === 'bolumYetkilisi' || role === 'fakulteYetkilisi') && (
                  <>
                    <Hdr
                      title={`Raporlar — ${role === 'bolumYetkilisi' ? 'Bölüm' : 'Fakülte'}`}
                      sub="Akademisyenlerin doldurduğu raporlar"
                    />
                    {(role === 'bolumYetkilisi'
                      ? bolumAkademisyenleri
                      : AKADEMISYENLER.filter((a) => a.fakulte === FAKULTELER[0])
                    ).map((a) => {
                      const d = raporData[a.id];
                      if (!d || !d.genelBilgiler) return null;
                      return (
                        <div
                          key={a.id}
                          style={{
                            background: C.surface,
                            border: `1px solid ${C.border}`,
                            borderRadius: 10,
                            padding: 16,
                            marginBottom: 12,
                          }}
                        >
                          <div
                            style={{
                              fontSize: 12,
                              fontWeight: 600,
                              color: C.accent,
                              marginBottom: 6,
                            }}
                          >
                            {a.ad} — {a.bolum}
                          </div>
                          <div style={{ fontSize: 11, color: C.textDim }}>
                            Yıl: {d.yil} | Dönem: {d.donem} | İdare: {d.idare}
                          </div>
                          <div
                            style={{
                              marginTop: 6,
                              fontSize: 12,
                              color: C.text,
                              lineHeight: 1.4,
                              maxHeight: 80,
                              overflow: 'hidden',
                            }}
                          >
                            {d.genelBilgiler?.substring(0, 200)}
                            {d.genelBilgiler?.length > 200 ? '...' : ''}
                          </div>
                        </div>
                      );
                    })}
                  </>
                )}
              </div>
            )}

            {/* Export bar — yalnızca bölüm/fakülte yetkililerine açık */}
            {(role === 'bolumYetkilisi' || role === 'fakulteYetkilisi') && (
              <div style={{ marginTop: 24, padding: '16px 0', borderTop: `1px solid ${C.border}` }}>
                {toast && (
                  <div
                    style={{
                      fontSize: 12,
                      color: C.success,
                      fontWeight: 600,
                      marginBottom: 10,
                      textAlign: 'center',
                    }}
                  >
                    {toast}
                  </div>
                )}
                <div
                  style={{
                    fontSize: 11.5,
                    fontWeight: 600,
                    color: C.textMuted,
                    marginBottom: 10,
                    textTransform: 'uppercase',
                    letterSpacing: 0.3,
                  }}
                >
                  Dışa Aktar
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <button onClick={exportGostergeIzleme} style={exportBtn}>
                    Gösterge_İzleme.xlsx
                  </button>
                  <button onClick={exportHedefDegerlendirmeler} style={exportBtn}>
                    Hedef_Değerlendirmeler.xlsx
                  </button>
                  <button onClick={exportPerformansTablosu} style={exportBtn}>
                    Performans_Göstergesi_Tablosu.xlsx
                  </button>
                  <button
                    onClick={exportRaporFormati}
                    style={{
                      ...exportBtn,
                      background: `linear-gradient(135deg, ${C.success}, #1B5E3B)`,
                    }}
                  >
                    Gösterge_Rapor_Formatı.docx
                  </button>
                </div>
              </div>
            )}
            {/* Akademisyen için sadece toast bildirimi */}
            {role === 'akademisyen' && toast && (
              <div
                style={{
                  marginTop: 16,
                  padding: '10px 14px',
                  background: C.successDim,
                  border: `1px solid ${C.success}`,
                  borderRadius: 8,
                  fontSize: 12,
                  color: C.success,
                  fontWeight: 600,
                  textAlign: 'center',
                }}
              >
                {toast}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ── Alt Bileşenler ──
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

function GostergeTable({
  kat,
  aylar,
  getValue,
  setValue,
  editable = true,
  inputStyle,
  compact = false,
}) {
  // Sabit sütun genişlikleri — tüm akademisyenlerde aynı hizalama için
  const adW = compact ? '60%' : '55%';
  const birimW = compact ? null : '70px';
  const ayW = compact ? `${Math.floor(40 / aylar.length)}%` : '100px';
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
          <col style={{ width: adW }} />
          {!compact && <col style={{ width: birimW }} />}
          {aylar.map((a) => (
            <col key={a} style={{ width: ayW }} />
          ))}
        </colgroup>
        {!compact && (
          <thead>
            <tr>
              <th style={th}>Gösterge</th>
              <th style={{ ...th, textAlign: 'center' }}>Birim</th>
              {aylar.map((a) => (
                <th key={a} style={{ ...th, textAlign: 'center' }}>
                  {a}
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
                  textOverflow: 'ellipsis',
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
                  <span
                    style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                  >
                    {g.ad}
                  </span>
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
                        display: 'inline-block',
                        minWidth: 30,
                        textAlign: 'center',
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

function PerfForm({ data, setData }) {
  const up = (k, v) => setData({ ...data, [k]: v });
  return (
    <div
      style={{
        background: C.surface,
        border: `1px solid ${C.border}`,
        borderRadius: 10,
        padding: 20,
      }}
    >
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
        <div>
          <label style={lbl}>Performans Göstergesi</label>
          <input
            type="text"
            value={data.gosterge || ''}
            onChange={(e) => up('gosterge', e.target.value)}
            style={inpF}
            placeholder="Gösterge adını yazın"
          />
        </div>
        <div>
          <label style={lbl}>Değerlendirme Dönemi</label>
          <select
            value={data.donem || ''}
            onChange={(e) => up('donem', e.target.value)}
            style={inpF}
          >
            <option value="">Seçiniz</option>
            {DONEMLER.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>
      </div>
      <label style={lbl}>Gösterge Türü</label>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 14 }}>
        {GOSTERGE_TURLERI.map((t) => (
          <button
            key={t}
            onClick={() => up('tur', t)}
            style={{
              padding: '6px 12px',
              borderRadius: 6,
              border: `1px solid ${data.tur === t ? C.accent : C.border}`,
              background: data.tur === t ? C.accentGlow : 'transparent',
              color: data.tur === t ? C.accent : C.textMuted,
              fontSize: 11.5,
              cursor: 'pointer',
              fontFamily: F,
              fontWeight: data.tur === t ? 600 : 400,
            }}
          >
            {t}
          </button>
        ))}
      </div>
      {[
        { k: 'dissal', l: 'Dışsal Unsurlar' },
        { k: 'sorunlar', l: 'Sorunlar/Zorluklar' },
        { k: 'maliyetler', l: 'Maliyetler' },
        { k: 'kiyaslama', l: 'Kıyaslama Kaynakları' },
      ].map((f) => (
        <div key={f.k} style={{ marginBottom: 12 }}>
          <label style={lbl}>{f.l}</label>
          <textarea
            value={data[f.k] || ''}
            onChange={(e) => up(f.k, e.target.value)}
            rows={2}
            style={txa}
            placeholder="Bilgi giriniz..."
          />
        </div>
      ))}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
        <div>
          <label style={lbl}>Ölçüm Tarihi</label>
          <input
            type="date"
            value={data.olcumTarihi || ''}
            onChange={(e) => up('olcumTarihi', e.target.value)}
            style={inpF}
          />
        </div>
        <div>
          <label style={lbl}>Sonraki Ölçüm</label>
          <input
            type="date"
            value={data.sonrakiOlcum || ''}
            onChange={(e) => up('sonrakiOlcum', e.target.value)}
            style={inpF}
          />
        </div>
      </div>
      <label style={lbl}>Ölçüm Yapılmadıysa Gerekçeleri</label>
      <textarea
        value={data.gerekceler || ''}
        onChange={(e) => up('gerekceler', e.target.value)}
        rows={2}
        style={txa}
        placeholder="Gerekçeleri yazınız..."
      />
    </div>
  );
}

function RaporForm({ data, setData }) {
  const up = (k, v) => setData({ ...data, [k]: v });
  return (
    <div
      style={{
        background: C.surface,
        border: `1px solid ${C.border}`,
        borderRadius: 10,
        padding: 20,
      }}
    >
      <div
        style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 16 }}
      >
        <div>
          <label style={lbl}>Yıl</label>
          <input
            type="text"
            value={data.yil || '2026'}
            onChange={(e) => up('yil', e.target.value)}
            style={inpF}
          />
        </div>
        <div>
          <label style={lbl}>İdare Adı</label>
          <input
            type="text"
            value={data.idare || ''}
            onChange={(e) => up('idare', e.target.value)}
            style={inpF}
            placeholder="İdare adı"
          />
        </div>
        <div>
          <label style={lbl}>Merci</label>
          <input
            type="text"
            value={data.merci || ''}
            onChange={(e) => up('merci', e.target.value)}
            style={inpF}
            placeholder="Merci"
          />
        </div>
      </div>
      <label style={lbl}>Dönem</label>
      <div style={{ display: 'flex', gap: 5, marginBottom: 18 }}>
        {DONEMLER.map((d) => (
          <button
            key={d}
            onClick={() => up('donem', d)}
            style={{
              padding: '6px 14px',
              borderRadius: 6,
              border: `1px solid ${data.donem === d ? C.accent : C.border}`,
              background: data.donem === d ? C.accentGlow : 'transparent',
              color: data.donem === d ? C.accent : C.textMuted,
              fontSize: 11.5,
              cursor: 'pointer',
              fontFamily: F,
              fontWeight: data.donem === d ? 600 : 400,
            }}
          >
            {d}
          </button>
        ))}
      </div>
      <div style={{ borderLeft: `3px solid ${C.accent}`, paddingLeft: 12, marginBottom: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: C.accent, marginBottom: 10 }}>
          I. Tespitler
        </div>
        {[
          { k: 'genelBilgiler', l: 'Genel Bilgiler' },
          { k: 'gerceklesmeDurumu', l: 'Gerçekleşme Durumu' },
          { k: 'degerlendirme', l: 'Değerlendirme' },
        ].map((f) => (
          <div key={f.k} style={{ marginBottom: 10 }}>
            <label style={lbl}>{f.l}</label>
            <textarea
              value={data[f.k] || ''}
              onChange={(e) => up(f.k, e.target.value)}
              rows={3}
              style={txa}
              placeholder="Bilgi giriniz..."
            />
          </div>
        ))}
      </div>
      <div style={{ borderLeft: `3px solid ${C.success}`, paddingLeft: 12 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: C.accent, marginBottom: 8 }}>
          II. Sonuç ve Öneriler
        </div>
        <textarea
          value={data.sonucOneriler || ''}
          onChange={(e) => up('sonucOneriler', e.target.value)}
          rows={4}
          style={txa}
          placeholder="Sonuç ve önerilerinizi yazınız..."
        />
      </div>
    </div>
  );
}

function PeriodSelector({ yil, setYil, donem, setDonem, aylar }) {
  const currentYear = new Date().getFullYear();
  const yillar = [];
  for (let y = currentYear - 2; y <= currentYear + 2; y++) yillar.push(String(y));
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
            padding: '6px 10px',
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
          {yillar.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: C.textMuted,
            textTransform: 'uppercase',
            letterSpacing: 0.4,
            marginRight: 4,
          }}
        >
          Dönem
        </span>
        {DONEMLER_DETAY.map((d) => (
          <button
            key={d.id}
            onClick={() => setDonem(d.id)}
            style={{
              padding: '6px 12px',
              borderRadius: 6,
              border: `1px solid ${donem === d.id ? C.accent : C.border}`,
              background: donem === d.id ? C.accent : 'transparent',
              color: donem === d.id ? '#fff' : C.textMuted,
              fontSize: 11.5,
              fontWeight: donem === d.id ? 700 : 500,
              cursor: 'pointer',
              fontFamily: F,
              transition: 'all 0.15s',
            }}
          >
            {d.label}
          </button>
        ))}
      </div>
      <div style={{ marginLeft: 'auto', fontSize: 11, color: C.textDim, fontStyle: 'italic' }}>
        {aylar.join(' • ')}
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
const lbl = {
  display: 'block',
  fontSize: 11,
  fontWeight: 600,
  color: C.textMuted,
  marginBottom: 4,
  textTransform: 'uppercase',
  letterSpacing: 0.3,
};
const inp = {
  width: '100%',
  padding: '5px 6px',
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
const txa = {
  width: '100%',
  padding: '8px 10px',
  borderRadius: 6,
  border: `1px solid ${C.border}`,
  background: C.surfaceAlt,
  color: C.text,
  fontSize: 12,
  fontFamily: F,
  outline: 'none',
  resize: 'vertical',
  boxSizing: 'border-box',
  lineHeight: 1.5,
};
const exportBtn = {
  padding: '9px 16px',
  borderRadius: 8,
  border: 'none',
  background: `linear-gradient(135deg, ${C.accent}, ${C.accentDark})`,
  color: '#fff',
  fontSize: 11.5,
  fontWeight: 600,
  cursor: 'pointer',
  fontFamily: F,
  whiteSpace: 'nowrap',
};

// ── Global window export (app-shell lazy loader için) ──
window.PerformansBilgileriApp = PerformansBilgileri;
