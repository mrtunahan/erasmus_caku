// ══════════════════════════════════════════════════════════════
// ÇAKÜ — Akreditasyon: Kanıt/Veri Havuzu (ilk hedef: MÜDEK ÖDR)
//
// Kullanıcı: FAKÜLTE YETKİLİSİ (isFacultyManager) — kendi fakültesindeki tüm
// programların (bölümlerin) akreditasyon belgelerini tek yerden hazırlar.
//
// FELSEFE — "HAVUZ":
//   Bu modül bir kontrol listesi DEĞİLDİR. Amaç, istenen raporu (önce MÜDEK
//   ÖDR) üretmek için gereken kanıt parçalarını NEREDEN GELİRSE GELSİN tek
//   havuzda toplamaktır:
//     • metin   — serbest açıklama / paragraf
//     • tablo   — satır/sütun tablosu (öğretim planı, kadro, vb.)
//     • dosya   — belge/görsel yükle (PDF, docx, resim…)
//     • link    — dış URL + O SAYFADAN yapıştırılan içerik/tablo (otomatik
//                 kazıma YOK; tarayıcı/sunucu güvenliği gereği kullanıcı
//                 ilgili kısmı yapıştırır ya da ekran görüntüsü/PDF yükler)
//     • sistem  — Offline Asistan verisinden anlık görüntü (KanıtSağlayıcı)
//   Her kanıt bir ÖLÇÜT'e (1..10) ve bir PROGRAM'a (veya "fakülte geneli")
//   etiketlenir. "Rapor Oluştur (ÖDR)" havuzu ölçüt ölçüt toplayıp şablonu
//   doldurur.
//
// MİMARİ İLKELER (ticarileşmeye hazırlık):
//   1. Ölçütler VERİ'dir: çerçeve 'akreditasyon_frameworks'ten okunur
//      (seed: server/seed-mudek-framework.js). Kodda ölçüt metni yok.
//   2. KanıtSağlayıcı adaptörü: sistem verisine yalnız bu adaptör üzerinden
//      bağlanılır; modül tek satılırsa aynı sorgular başka kaynağa bağlanır.
//   3. Kiracı disiplini: her kayıt universityId/facultyId taşır; kurum/bölüm/
//      kişi adı kodda SABİT değildir.
// ══════════════════════════════════════════════════════════════

const { useState, useEffect, useMemo, useCallback } = React;

const AKR = {
  navy: '#1B2A4A',
  accent: '#0F766E',
  accentPale: '#CCFBF1',
  text: '#1F2937',
  textMuted: '#6B7280',
  border: '#E5E7EB',
  green: '#059669',
  greenLight: '#D1FAE5',
  amber: '#B45309',
  amberLight: '#FEF3C7',
  red: '#DC2626',
  redLight: '#FEE2E2',
  bg: '#F8F9FB',
};

// Havuz kanıt türleri
const HAVUZ_TYPES = [
  { id: 'metin', label: 'Metin', icon: '📝', desc: 'Serbest açıklama / paragraf' },
  { id: 'tablo', label: 'Tablo', icon: '▦', desc: 'Satır/sütun tablosu' },
  { id: 'dosya', label: 'Dosya', icon: '📎', desc: 'Belge/görsel yükle' },
  { id: 'link', label: 'Bağlantı', icon: '🔗', desc: 'Dış URL + yapıştırılan içerik' },
  { id: 'sistem', label: 'Sistemden', icon: '⚙️', desc: 'Offline Asistan verisi (anlık)' },
];
const typeMeta = (t) => HAVUZ_TYPES.find((x) => x.id === t) || HAVUZ_TYPES[0];

// Dosya bağlantısı: PDF önizlenir, Office belgeleri doğrudan indirilir.
const akrFileHref = (u) => {
  const rel = String(u || '')
    .replace('/api/files/download/', '')
    .replace('/api/files/view/', '');
  if (!rel) return '#';
  return /\.pdf$/i.test(rel)
    ? '/api/files/view/' + rel
    : '/api/files/download/' + rel + '?download=true';
};

// ══════════════════════════════════════════════════════════════
// KanıtSağlayıcı — kaynak-bağımsız sistem sorguları ('sistem' türü kullanır).
// Sözleşme: fetch(key, ctx) → { label, count, detail } | null
//   ctx: { departmentId, departmentName, facultyId }
// ══════════════════════════════════════════════════════════════
const KanitSaglayici = {
  source: 'offline-asistan',
  async fetch(key, ctx) {
    const q = this.queries[key];
    if (!q) return null;
    try {
      return await q(ctx);
    } catch (_e) {
      return null;
    }
  },
  // Kullanıcıya gösterilecek insan-okur etiketler (sistem kaynağı seçimi)
  catalog: [
    { key: 'ogrenciler', label: 'Kayıtlı öğrenci sayısı' },
    { key: 'kadro', label: 'Öğretim elemanı sayısı' },
    { key: 'muafiyet', label: 'Muafiyet/intibak dosyası' },
    { key: 'ders_programi', label: 'Ders programı kaydı' },
    { key: 'sinavlar', label: 'Sınav kaydı' },
    { key: 'anketler', label: 'Anket (ölçme aracı)' },
    { key: 'performans', label: 'Performans göstergesi / veri' },
    { key: 'stajlar', label: 'Staj başvurusu' },
  ],
  queries: {
    ogrenciler: async ({ departmentId }) => {
      const list = await window.apiRead('students', {
        where: 'departmentId:eq:s:' + departmentId,
      });
      return { label: 'Kayıtlı öğrenci', count: (list || []).length };
    },
    muafiyet: async ({ departmentId }) => {
      const list = await window.apiRead('muafiyet_records', {
        where: 'departmentId:eq:s:' + departmentId,
      });
      return { label: 'Muafiyet/intibak dosyası', count: (list || []).length };
    },
    anketler: async ({ departmentId }) => {
      const list = await window.apiRead('surveys');
      const mine = (list || []).filter((s) => !s.departmentId || s.departmentId === departmentId);
      return { label: 'Anket (ölçme aracı)', count: mine.length };
    },
    performans: async ({ departmentId }) => {
      const inds = await window.apiRead('performance_indicators');
      const data = await window.apiRead('performance_data', {
        where: 'departmentId:eq:s:' + departmentId,
      });
      return {
        label: 'Performans göstergesi / veri',
        count: (inds || []).length,
        detail: (data || []).length + ' veri kaydı',
      };
    },
    sinavlar: async ({ departmentId }) => {
      const list = await window.apiRead('exams', { where: 'departmentId:eq:s:' + departmentId });
      return { label: 'Sınav kaydı', count: (list || []).length };
    },
    ders_programi: async ({ departmentId }) => {
      const list = await window.apiRead('course_schedules', {
        where: 'departmentId:eq:s:' + departmentId,
      });
      return { label: 'Ders programı kaydı', count: (list || []).length };
    },
    stajlar: async ({ departmentId }) => {
      const list = await window.apiRead('internship_applications');
      const mine = (list || []).filter((s) => !s.departmentId || s.departmentId === departmentId);
      return { label: 'Staj başvurusu', count: mine.length };
    },
    kadro: async ({ departmentId, departmentName }) => {
      const list = await window.apiRead('professors');
      const mine = (list || []).filter(
        (p) =>
          !p.isMemur &&
          (window.profMatchesDept
            ? window.profMatchesDept(p, departmentId, departmentName)
            : p.departmentId === departmentId)
      );
      return { label: 'Öğretim elemanı', count: mine.length };
    },
  },
  // Gerçek satır üreten sorgular — ÖDR'nin ağır tablolarını (kadro, eğitim
  // planı) sistemden hazır DOLDURMAK için. { headers:[], rows:[[]] } döner.
  tables: {
    kadro: async ({ departmentId, departmentName }) => {
      const list = await window.apiRead('professors');
      const mine = (list || []).filter(
        (p) =>
          !p.isMemur &&
          (window.profMatchesDept
            ? window.profMatchesDept(p, departmentId, departmentName)
            : p.departmentId === departmentId)
      );
      mine.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'tr'));
      return {
        headers: ['Unvan', 'Ad Soyad', 'E-posta', 'Uzmanlık / Alan', 'Kadro'],
        rows: mine.map((p) => [
          p.title || p.unvan || '',
          p.name || '',
          p.email || '',
          p.field || p.uzmanlik || p.expertise || '',
          p.tamZamanli === false ? 'Yarı zamanlı' : 'Tam zamanlı',
        ]),
      };
    },
    egitim_plani: async ({ departmentId }) => {
      const list = await window.apiRead('course_schedules', {
        where: 'departmentId:eq:s:' + departmentId,
      });
      const rows = (list || [])
        .slice()
        .sort(
          (a, b) =>
            (Number(a.yariyil || a.semester || 0) || 0) -
              (Number(b.yariyil || b.semester || 0) || 0) ||
            String(a.code || a.dersKodu || '').localeCompare(
              String(b.code || b.dersKodu || ''),
              'tr'
            )
        )
        .map((c) => [
          String(c.yariyil || c.semester || ''),
          c.code || c.dersKodu || '',
          c.name || c.dersAdi || c.title || '',
          String(c.teori ?? c.T ?? ''),
          String(c.uygulama ?? c.U ?? ''),
          String(c.kredi ?? c.credit ?? ''),
          String(c.akts ?? c.ects ?? ''),
          c.zorunlu === false || c.secmeli ? 'S' : 'Z',
        ]);
      return {
        headers: ['Yarıyıl', 'Ders Kodu', 'Ders Adı', 'T', 'U', 'Kredi', 'AKTS', 'Z/S'],
        rows,
      };
    },
  },
  async fetchTable(key, ctx) {
    const q = this.tables[key];
    if (!q) return null;
    try {
      return await q(ctx);
    } catch (_e) {
      return null;
    }
  },
};
window.KanitSaglayici = KanitSaglayici;

// Boş tablo yapısı
const emptyTable = () => ({ headers: ['Sütun 1', 'Sütun 2'], rows: [['', '']] });

// ══════════════════════════════════════════════════════════════
// ÖDR hazır tablo şablonları — MÜDEK ÖDR'nin ağır/standart tabloları için
// başlıkları doğru kurulu boş iskeletler. Bazıları sistemden doldurulabilir
// (systemTableKey → KanıtSağlayıcı.tables). Kullanıcı tek tıkla ekler, doldurur.
// ══════════════════════════════════════════════════════════════
const ODR_TABLE_PRESETS = [
  {
    id: 'pea',
    olcutNo: 2,
    title: 'Program Eğitim Amaçları (PEA)',
    table: {
      headers: ['No', 'Program Eğitim Amacı'],
      rows: [
        ['1', ''],
        ['2', ''],
        ['3', ''],
      ],
    },
  },
  {
    id: 'pea-misyon',
    olcutNo: 2,
    title: 'PEA — Kurum/Fakülte Misyonu İlişkisi',
    table: {
      headers: ['Program Eğitim Amacı', 'İlgili Misyon Unsuru'],
      rows: [
        ['', ''],
        ['', ''],
      ],
    },
  },
  {
    id: 'pc',
    olcutNo: 3,
    title: 'Program Çıktıları (PÇ)',
    table: {
      headers: ['No', 'Program Çıktısı'],
      rows: [
        ['1', ''],
        ['2', ''],
        ['3', ''],
      ],
    },
  },
  {
    id: 'pc-pea',
    olcutNo: 3,
    title: 'Program Çıktısı – Program Eğitim Amacı İlişkisi',
    table: {
      headers: ['Program Çıktısı', 'PEA 1', 'PEA 2', 'PEA 3'],
      rows: [
        ['PÇ 1', '', '', ''],
        ['PÇ 2', '', '', ''],
      ],
    },
  },
  {
    id: 'pc-ders',
    olcutNo: 5,
    title: 'Program Çıktısı – Ders İlişki Matrisi',
    table: {
      headers: ['Ders', 'PÇ1', 'PÇ2', 'PÇ3', 'PÇ4', 'PÇ5'],
      rows: [['', '', '', '', '', '']],
    },
  },
  {
    id: 'egitim-plani',
    olcutNo: 5,
    title: 'Eğitim Planı (Öğretim Planı)',
    systemTableKey: 'egitim_plani',
    table: {
      headers: ['Yarıyıl', 'Ders Kodu', 'Ders Adı', 'T', 'U', 'Kredi', 'AKTS', 'Z/S'],
      rows: [['', '', '', '', '', '', '', '']],
    },
  },
  {
    id: 'kadro',
    olcutNo: 6,
    title: 'Öğretim Kadrosu',
    systemTableKey: 'kadro',
    table: {
      headers: ['Unvan', 'Ad Soyad', 'E-posta', 'Uzmanlık / Alan', 'Kadro'],
      rows: [['', '', '', '', '']],
    },
  },
];

// ══════════════════════════════════════════════════════════════
// Küçük düzenlenebilir tablo editörü
// ══════════════════════════════════════════════════════════════
function TableEditor({ table, onChange }) {
  const t = table && Array.isArray(table.headers) ? table : emptyTable();
  const setHeader = (ci, val) => {
    const headers = t.headers.slice();
    headers[ci] = val;
    onChange({ ...t, headers });
  };
  const setCell = (ri, ci, val) => {
    const rows = t.rows.map((r) => r.slice());
    rows[ri][ci] = val;
    onChange({ ...t, rows });
  };
  const addCol = () => {
    onChange({
      headers: t.headers.concat('Sütun ' + (t.headers.length + 1)),
      rows: t.rows.map((r) => r.concat('')),
    });
  };
  const removeCol = (ci) => {
    if (t.headers.length <= 1) return;
    onChange({
      headers: t.headers.filter((_h, i) => i !== ci),
      rows: t.rows.map((r) => r.filter((_c, i) => i !== ci)),
    });
  };
  const addRow = () => onChange({ ...t, rows: t.rows.concat([t.headers.map(() => '')]) });
  const removeRow = (ri) => onChange({ ...t, rows: t.rows.filter((_r, i) => i !== ri) });

  const cellStyle = {
    border: '1px solid ' + AKR.border,
    padding: 0,
  };
  const inputStyle = {
    width: '100%',
    border: 'none',
    padding: '6px 8px',
    fontSize: 12.5,
    outline: 'none',
    fontFamily: "'Inter', sans-serif",
    background: 'transparent',
    boxSizing: 'border-box',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ overflowX: 'auto', border: '1px solid ' + AKR.border, borderRadius: 8 }}>
        <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: 320 }}>
          <thead>
            <tr>
              {t.headers.map((h, ci) => (
                <th key={ci} style={{ ...cellStyle, background: AKR.bg, position: 'relative' }}>
                  <input
                    value={h}
                    onChange={(e) => setHeader(ci, e.target.value)}
                    style={{ ...inputStyle, fontWeight: 700, color: AKR.navy }}
                  />
                  {t.headers.length > 1 && (
                    <span
                      onClick={() => removeCol(ci)}
                      title="Sütunu sil"
                      style={{
                        position: 'absolute',
                        top: 2,
                        right: 3,
                        cursor: 'pointer',
                        color: AKR.textMuted,
                        fontSize: 11,
                      }}
                    >
                      ×
                    </span>
                  )}
                </th>
              ))}
              <th style={{ ...cellStyle, background: AKR.bg, width: 30 }} />
            </tr>
          </thead>
          <tbody>
            {t.rows.map((r, ri) => (
              <tr key={ri}>
                {t.headers.map((_h, ci) => (
                  <td key={ci} style={cellStyle}>
                    <input
                      value={r[ci] || ''}
                      onChange={(e) => setCell(ri, ci, e.target.value)}
                      style={inputStyle}
                    />
                  </td>
                ))}
                <td style={{ ...cellStyle, textAlign: 'center' }}>
                  <span
                    onClick={() => removeRow(ri)}
                    title="Satırı sil"
                    style={{ cursor: 'pointer', color: AKR.textMuted, fontSize: 13 }}
                  >
                    ×
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button type="button" onClick={addRow} style={miniBtn}>
          + Satır
        </button>
        <button type="button" onClick={addCol} style={miniBtn}>
          + Sütun
        </button>
      </div>
    </div>
  );
}

const miniBtn = {
  padding: '5px 12px',
  borderRadius: 7,
  border: '1px solid ' + AKR.border,
  background: 'white',
  color: AKR.accent,
  fontSize: 12,
  fontWeight: 600,
  cursor: 'pointer',
};

// Tabloyu düz metne çevir (rapor üretimi + önizleme)
function tableToText(table) {
  if (!table || !Array.isArray(table.headers)) return '';
  const lines = [table.headers.join(' | ')];
  (table.rows || []).forEach((r) =>
    lines.push(table.headers.map((_h, i) => r[i] || '').join(' | '))
  );
  return lines.join('\n');
}

// ══════════════════════════════════════════════════════════════
// Kanıt ekle/düzenle modalı
// ══════════════════════════════════════════════════════════════
function HavuzEditor({
  initial,
  preset,
  criteria,
  departments,
  defaults,
  ctxForSystem,
  onSave,
  onClose,
}) {
  // Hazır tablo şablonu (preset) düzenleme değil, ön-doldurulmuş yeni kayıttır.
  const base = initial || preset || null;
  const [type, setType] = useState(preset ? 'tablo' : initial?.type || 'metin');
  const [title, setTitle] = useState(base?.title || '');
  const [olcutNo, setOlcutNo] = useState(
    base ? base.olcutNo || 0 : defaults.olcutNo || (criteria[0] ? criteria[0].no : 0)
  );
  const [departmentId, setDepartmentId] = useState(
    initial ? initial.departmentId || '' : defaults.departmentId || ''
  );
  const [content, setContent] = useState(initial?.content || '');
  const [sourceUrl, setSourceUrl] = useState(initial?.sourceUrl || '');
  const [table, setTable] = useState(base?.table || emptyTable());
  const [fileUrl, setFileUrl] = useState(initial?.fileUrl || '');
  const [fileLabel, setFileLabel] = useState(initial?.fileLabel || '');
  const [uploading, setUploading] = useState(false);
  const [sysKeys, setSysKeys] = useState(initial?.systemKeys || []);
  const [sysBusy, setSysBusy] = useState(false);
  const [tblSysBusy, setTblSysBusy] = useState(false);
  const [err, setErr] = useState('');

  // Preset sistemden doldurulabilir mi? (kadro / eğitim planı)
  const fillFromSystem = async () => {
    if (!preset?.systemTableKey) return;
    setTblSysBusy(true);
    setErr('');
    try {
      const res = await KanitSaglayici.fetchTable(preset.systemTableKey, ctxForSystem);
      if (!res || !res.rows || res.rows.length === 0) {
        setErr('Seçili program için sistemde bu tabloya ait veri bulunamadı.');
        return;
      }
      setTable(res);
    } finally {
      setTblSysBusy(false);
    }
  };

  const pickFile = async (e) => {
    const f = (e.target.files && e.target.files[0]) || null;
    e.target.value = '';
    if (!f) return;
    setUploading(true);
    setErr('');
    try {
      const token = localStorage.getItem('caku_auth_token');
      const fd = new FormData();
      fd.append('file', f);
      const res = await fetch('/api/files/upload?folder=akreditasyon_kanitlar', {
        method: 'POST',
        headers: token ? { Authorization: 'Bearer ' + token } : {},
        credentials: 'include',
        body: fd,
      });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const data = await res.json();
      if (!data.downloadURL) throw new Error('URL alınamadı');
      setFileUrl(data.downloadURL);
      setFileLabel(f.name);
      if (!title) setTitle(f.name);
    } catch (e2) {
      setErr('Dosya yüklenemedi: ' + e2.message);
    } finally {
      setUploading(false);
    }
  };

  // 'sistem' — seçilen göstergeleri anlık çek, tabloya yaz (snapshot)
  const snapshotSystem = async () => {
    if (sysKeys.length === 0) {
      setErr('En az bir gösterge seçin.');
      return;
    }
    setSysBusy(true);
    setErr('');
    try {
      const rows = [];
      for (const key of sysKeys) {
        const r = await KanitSaglayici.fetch(key, ctxForSystem);
        const cat = KanitSaglayici.catalog.find((c) => c.key === key);
        rows.push([
          cat ? cat.label : key,
          r ? String(r.count) + (r.detail ? ' (' + r.detail + ')' : '') : 'veri yok',
        ]);
      }
      const stamp = new Date().toLocaleString('tr-TR');
      setTable({ headers: ['Gösterge', 'Değer (' + stamp + ')'], rows });
      if (!title) setTitle('Sistem verisi — ' + stamp);
    } finally {
      setSysBusy(false);
    }
  };

  const submit = () => {
    if (!title.trim()) {
      setErr('Başlık girin.');
      return;
    }
    if (type === 'dosya' && !fileUrl) {
      setErr('Bir dosya yükleyin.');
      return;
    }
    if (type === 'link' && !/^https?:\/\/\S+$/i.test(sourceUrl)) {
      setErr('Geçerli bir URL girin (https://…).');
      return;
    }
    const rec = {
      type,
      title: title.trim(),
      olcutNo: Number(olcutNo) || 0,
      departmentId: departmentId || '',
      content: type === 'metin' || type === 'link' ? content : '',
      sourceUrl: type === 'link' ? sourceUrl.trim() : '',
      fileUrl: type === 'dosya' ? fileUrl : '',
      fileLabel: type === 'dosya' ? fileLabel : '',
      table: type === 'tablo' || type === 'sistem' ? table : null,
      systemKeys: type === 'sistem' ? sysKeys : [],
    };
    onSave(rec);
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15,23,42,0.45)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        padding: '40px 16px',
        overflowY: 'auto',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'white',
          borderRadius: 14,
          width: '100%',
          maxWidth: 620,
          boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
          fontFamily: "'Inter', sans-serif",
        }}
      >
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid ' + AKR.border,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: AKR.navy }}>
            {initial
              ? 'Kanıtı Düzenle'
              : preset
                ? 'Hazır Tablo: ' + preset.title
                : 'Havuza Kanıt Ekle'}
          </h3>
          <span
            onClick={onClose}
            style={{ cursor: 'pointer', color: AKR.textMuted, fontSize: 20, lineHeight: 1 }}
          >
            ×
          </span>
        </div>

        <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Tür seçimi — hazır tabloda sabittir (gizli) */}
          {!preset && (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {HAVUZ_TYPES.map((tp) => (
                <button
                  key={tp.id}
                  type="button"
                  onClick={() => setType(tp.id)}
                  title={tp.desc}
                  style={{
                    padding: '7px 12px',
                    borderRadius: 9,
                    border: '1px solid ' + (type === tp.id ? AKR.accent : AKR.border),
                    background: type === tp.id ? AKR.accentPale : 'white',
                    color: type === tp.id ? AKR.accent : AKR.textMuted,
                    fontSize: 12.5,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  {tp.icon} {tp.label}
                </button>
              ))}
            </div>
          )}

          {/* Ölçüt + program etiketi */}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <label
              style={{ flex: '1 1 240px', fontSize: 12, color: AKR.textMuted, fontWeight: 600 }}
            >
              Ölçüt
              <select
                value={olcutNo}
                onChange={(e) => setOlcutNo(e.target.value)}
                style={selectStyle}
              >
                <option value={0}>Genel / etiketsiz</option>
                {criteria.map((c) => (
                  <option key={c.no} value={c.no}>
                    Ölçüt {c.no} — {c.title}
                  </option>
                ))}
              </select>
            </label>
            <label
              style={{ flex: '1 1 200px', fontSize: 12, color: AKR.textMuted, fontWeight: 600 }}
            >
              Program
              <select
                value={departmentId}
                onChange={(e) => setDepartmentId(e.target.value)}
                style={selectStyle}
              >
                <option value="">Fakülte geneli (tüm programlar)</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {/* Başlık */}
          <label style={{ fontSize: 12, color: AKR.textMuted, fontWeight: 600 }}>
            Başlık
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Kanıtı tanımlayan kısa başlık"
              style={inputBox}
            />
          </label>

          {/* Türe özel alanlar */}
          {type === 'metin' && (
            <label style={{ fontSize: 12, color: AKR.textMuted, fontWeight: 600 }}>
              İçerik
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={6}
                placeholder="Rapora girecek metin / açıklama…"
                style={{ ...inputBox, resize: 'vertical' }}
              />
            </label>
          )}

          {type === 'link' && (
            <>
              <label style={{ fontSize: 12, color: AKR.textMuted, fontWeight: 600 }}>
                Kaynak URL
                <input
                  value={sourceUrl}
                  onChange={(e) => setSourceUrl(e.target.value)}
                  placeholder="https://… (kanıtın alındığı sayfa)"
                  style={inputBox}
                />
              </label>
              <label style={{ fontSize: 12, color: AKR.textMuted, fontWeight: 600 }}>
                Yapıştırılan içerik
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={5}
                  placeholder="O sayfadan ilgili metni/tabloyu buraya yapıştırın. (Otomatik çekme yapılmaz — istediğiniz kısmı siz yapıştırırsınız ya da ekran görüntüsü/PDF'yi 'Dosya' türüyle eklersiniz.)"
                  style={{ ...inputBox, resize: 'vertical' }}
                />
              </label>
            </>
          )}

          {type === 'dosya' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <label
                style={{
                  ...miniBtn,
                  alignSelf: 'flex-start',
                  cursor: uploading ? 'wait' : 'pointer',
                }}
              >
                <input type="file" style={{ display: 'none' }} onChange={pickFile} />
                {uploading ? 'Yükleniyor…' : fileUrl ? 'Dosyayı Değiştir' : '📎 Dosya Seç ve Yükle'}
              </label>
              {fileUrl && (
                <a
                  href={akrFileHref(fileUrl)}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    color: AKR.accent,
                    fontSize: 12.5,
                    fontWeight: 600,
                    textDecoration: 'none',
                  }}
                >
                  📎 {fileLabel}
                </a>
              )}
            </div>
          )}

          {type === 'tablo' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {preset?.systemTableKey && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={fillFromSystem}
                    disabled={tblSysBusy}
                    style={{ ...miniBtn, borderColor: AKR.accent }}
                  >
                    {tblSysBusy ? 'Dolduruluyor…' : '⚙️ Sistemden Doldur'}
                  </button>
                  <span style={{ fontSize: 11.5, color: AKR.textMuted }}>
                    Seçili programın güncel verisini tabloya yazar; sonra elle düzenleyebilirsiniz.
                  </span>
                </div>
              )}
              <TableEditor table={table} onChange={setTable} />
            </div>
          )}

          {type === 'sistem' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ fontSize: 11.5, color: AKR.textMuted }}>
                Seçili programın sistem verisinden anlık görüntü alınır ve tabloya yazılır. Rapor
                anındaki değeri sabitler (snapshot).
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {KanitSaglayici.catalog.map((c) => {
                  const on = sysKeys.includes(c.key);
                  return (
                    <button
                      key={c.key}
                      type="button"
                      onClick={() =>
                        setSysKeys(on ? sysKeys.filter((k) => k !== c.key) : sysKeys.concat(c.key))
                      }
                      style={{
                        padding: '5px 10px',
                        borderRadius: 14,
                        border: '1px solid ' + (on ? AKR.accent : AKR.border),
                        background: on ? AKR.accentPale : 'white',
                        color: on ? AKR.accent : AKR.textMuted,
                        fontSize: 11.5,
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      {c.label}
                    </button>
                  );
                })}
              </div>
              <button
                type="button"
                onClick={snapshotSystem}
                disabled={sysBusy}
                style={{ ...miniBtn, alignSelf: 'flex-start' }}
              >
                {sysBusy ? 'Çekiliyor…' : '⚙️ Anlık Görüntü Al'}
              </button>
              {table && table.rows && table.rows.length > 0 && (
                <div
                  style={{ overflowX: 'auto', border: '1px solid ' + AKR.border, borderRadius: 8 }}
                >
                  <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 12.5 }}>
                    <thead>
                      <tr>
                        {table.headers.map((h, i) => (
                          <th
                            key={i}
                            style={{
                              border: '1px solid ' + AKR.border,
                              padding: '6px 8px',
                              background: AKR.bg,
                              color: AKR.navy,
                              textAlign: 'left',
                            }}
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {table.rows.map((r, ri) => (
                        <tr key={ri}>
                          {r.map((c, ci) => (
                            <td
                              key={ci}
                              style={{ border: '1px solid ' + AKR.border, padding: '6px 8px' }}
                            >
                              {c}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {err && <div style={{ color: AKR.red, fontSize: 12.5 }}>{err}</div>}
        </div>

        <div
          style={{
            padding: '14px 20px',
            borderTop: '1px solid ' + AKR.border,
            display: 'flex',
            justifyContent: 'flex-end',
            gap: 8,
          }}
        >
          <button type="button" onClick={onClose} style={{ ...miniBtn, color: AKR.textMuted }}>
            Vazgeç
          </button>
          <button
            type="button"
            onClick={submit}
            style={{
              padding: '8px 20px',
              borderRadius: 8,
              border: 'none',
              background: AKR.navy,
              color: 'white',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {initial ? 'Kaydet' : 'Havuza Ekle'}
          </button>
        </div>
      </div>
    </div>
  );
}

const selectStyle = {
  display: 'block',
  width: '100%',
  marginTop: 4,
  padding: '8px 10px',
  borderRadius: 8,
  border: '1px solid ' + AKR.border,
  fontSize: 13,
  background: 'white',
  fontFamily: "'Inter', sans-serif",
  color: AKR.text,
};
const inputBox = {
  display: 'block',
  width: '100%',
  marginTop: 4,
  padding: '8px 10px',
  borderRadius: 8,
  border: '1px solid ' + AKR.border,
  fontSize: 13,
  outline: 'none',
  boxSizing: 'border-box',
  fontFamily: "'Inter', sans-serif",
  color: AKR.text,
};

// ══════════════════════════════════════════════════════════════
// Havuz kanıt kartı
// ══════════════════════════════════════════════════════════════
function HavuzCard({ item, criteria, departments, onEdit, onDelete }) {
  const tp = typeMeta(item.type);
  const crit = criteria.find((c) => c.no === (item.olcutNo || 0));
  const dept = departments.find((d) => d.id === item.departmentId);
  return (
    <div
      style={{
        background: 'white',
        border: '1px solid ' + AKR.border,
        borderRadius: 12,
        padding: 14,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <span style={{ fontSize: 18, lineHeight: 1 }}>{tp.icon}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: AKR.navy, wordBreak: 'break-word' }}>
            {item.title}
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 5 }}>
            <span style={pill(AKR.navy, AKR.bg)}>
              {item.olcutNo ? 'Ölçüt ' + item.olcutNo : 'Genel'}
            </span>
            <span style={pill(AKR.accent, AKR.accentPale)}>
              {dept ? dept.name : 'Fakülte geneli'}
            </span>
            <span style={pill(AKR.textMuted, AKR.bg)}>{tp.label}</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
          <span onClick={onEdit} title="Düzenle" style={iconBtn}>
            ✎
          </span>
          <span onClick={onDelete} title="Sil" style={{ ...iconBtn, color: AKR.red }}>
            🗑
          </span>
        </div>
      </div>

      {/* İçerik önizleme */}
      {item.type === 'metin' && item.content && <div style={previewText}>{item.content}</div>}
      {item.type === 'link' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {item.sourceUrl && (
            <a
              href={item.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: AKR.accent, fontSize: 12, fontWeight: 600, wordBreak: 'break-all' }}
            >
              🔗 {item.sourceUrl}
            </a>
          )}
          {item.content && <div style={previewText}>{item.content}</div>}
        </div>
      )}
      {item.type === 'dosya' && item.fileUrl && (
        <a
          href={akrFileHref(item.fileUrl)}
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: AKR.accent, fontSize: 12.5, fontWeight: 600, textDecoration: 'none' }}
        >
          📎 {item.fileLabel || 'Dosya'}
        </a>
      )}
      {(item.type === 'tablo' || item.type === 'sistem') && item.table && (
        <div style={{ overflowX: 'auto', border: '1px solid ' + AKR.border, borderRadius: 8 }}>
          <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 12 }}>
            <thead>
              <tr>
                {(item.table.headers || []).map((h, i) => (
                  <th
                    key={i}
                    style={{
                      border: '1px solid ' + AKR.border,
                      padding: '5px 7px',
                      background: AKR.bg,
                      color: AKR.navy,
                      textAlign: 'left',
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(item.table.rows || []).slice(0, 6).map((r, ri) => (
                <tr key={ri}>
                  {(item.table.headers || []).map((_h, ci) => (
                    <td key={ci} style={{ border: '1px solid ' + AKR.border, padding: '5px 7px' }}>
                      {r[ci] || ''}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const pill = (color, bg) => ({
  padding: '2px 9px',
  borderRadius: 12,
  background: bg,
  color,
  fontSize: 11,
  fontWeight: 700,
});
const iconBtn = {
  cursor: 'pointer',
  fontSize: 14,
  color: AKR.textMuted,
  padding: 2,
};
const previewText = {
  fontSize: 12.5,
  color: AKR.text,
  lineHeight: 1.5,
  whiteSpace: 'pre-wrap',
  maxHeight: 90,
  overflow: 'hidden',
  background: AKR.bg,
  borderRadius: 8,
  padding: '8px 10px',
};

// ══════════════════════════════════════════════════════════════
// Ana uygulama — Kanıt/Veri Havuzu
// ══════════════════════════════════════════════════════════════
function AkreditasyonApp({ currentUser }) {
  const isFacultyManager = !!currentUser?.isFacultyManager;
  const myFacultyId = currentUser?.facultyId || '';
  const myUniversityId = currentUser?.universityId || '';

  const [framework, setFramework] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const [progDept, setProgDept] = useState('__all'); // '__all' | '' (fakülte geneli) | deptId
  const [filterOlcut, setFilterOlcut] = useState('all'); // 'all' | number
  const [filterType, setFilterType] = useState('all');
  const [editor, setEditor] = useState(null); // {mode:'new'|'edit'|'preset', item?, preset?}
  const [presetMenu, setPresetMenu] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  const criteria = useMemo(
    () => (framework?.criteria || []).map((c) => ({ no: c.no, title: c.title })),
    [framework]
  );

  const loadItems = useCallback(async () => {
    if (!myFacultyId) return;
    const list = await window.apiRead('akreditasyon_havuz', {
      where: 'facultyId:eq:s:' + myFacultyId,
    });
    setItems((list || []).sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || '')));
  }, [myFacultyId]);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [fws, depts] = await Promise.all([
          window.apiRead('akreditasyon_frameworks'),
          window.apiRead('departments'),
        ]);
        if (!alive) return;
        const fw = (fws || []).find((f) => (f.id || f._docId) === 'mudek-genel') || (fws || [])[0];
        setFramework(fw || null);
        const mine = (depts || [])
          .filter((d) => (d.facultyId || '') === myFacultyId)
          .sort((a, b) => (a.name || '').localeCompare(b.name || '', 'tr'));
        setDepartments(mine);
        await loadItems();
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [myFacultyId, loadItems]);

  // Görünen kanıtlar (program + ölçüt + tür filtresi)
  const visible = useMemo(() => {
    return items.filter((it) => {
      if (progDept !== '__all') {
        if (progDept === '') {
          if (it.departmentId) return false;
        } else if (it.departmentId !== progDept) return false;
      }
      if (filterOlcut !== 'all' && (it.olcutNo || 0) !== filterOlcut) return false;
      if (filterType !== 'all' && it.type !== filterType) return false;
      return true;
    });
  }, [items, progDept, filterOlcut, filterType]);

  // Ölçüt bazlı sayaç (üst şerit)
  const perOlcutCount = useMemo(() => {
    const scoped = items.filter((it) => {
      if (progDept === '__all') return true;
      if (progDept === '') return !it.departmentId;
      return it.departmentId === progDept;
    });
    const m = {};
    scoped.forEach((it) => {
      const k = it.olcutNo || 0;
      m[k] = (m[k] || 0) + 1;
    });
    return m;
  }, [items, progDept]);

  const ctxForSystem = useMemo(() => {
    const d = departments.find((x) => x.id === (progDept !== '__all' ? progDept : ''));
    return {
      departmentId: progDept !== '__all' && progDept !== '' ? progDept : '',
      departmentName: d?.name || '',
      facultyId: myFacultyId,
    };
  }, [progDept, departments, myFacultyId]);

  const saveItem = async (rec) => {
    setBusy(true);
    try {
      if (editor?.item?.id) {
        await window.DBWrite.update('akreditasyon_havuz', String(editor.item.id), {
          ...rec,
          updatedAt: new Date().toISOString(),
        });
      } else {
        await window.DBWrite.add('akreditasyon_havuz', {
          ...rec,
          facultyId: myFacultyId,
          universityId: myUniversityId,
          createdBy: currentUser?.name || currentUser?.identifier || '',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }
      await loadItems();
      setEditor(null);
      setMsg('Kaydedildi ✓');
      setTimeout(() => setMsg(''), 2000);
    } catch (e) {
      alert('Kaydedilemedi: ' + e.message);
    } finally {
      setBusy(false);
    }
  };

  const deleteItem = async (item) => {
    if (!confirm('"' + item.title + '" havuzdan silinsin mi?')) return;
    try {
      await window.DBWrite.remove('akreditasyon_havuz', String(item.id));
      await loadItems();
    } catch (e) {
      alert('Silinemedi: ' + e.message);
    }
  };

  // ── ÖDR / rapor üretimi — havuzu ölçüt ölçüt toplar, şablonu doldurur ──
  // Şablon token'ları (odr-sablon.docx + TEMPLATE_VARS) korunur:
  //   olcut{n}Durum / olcut{n}Not / olcut{n}Kanit  ← havuz kanıtlarından üretilir.
  const [genBusy, setGenBusy] = useState(false);
  const generateReport = async () => {
    if (!framework) return;
    const targetDept = progDept !== '__all' && progDept !== '' ? progDept : '';
    const deptObj = departments.find((d) => d.id === targetDept);
    // Rapora giren kanıtlar: seçili program + fakülte geneli
    const pool = items.filter((it) => !it.departmentId || it.departmentId === targetDept);

    const staticData = {
      programAd: deptObj?.name || 'Fakülte geneli',
      fakulteAd: window.TENANT?.facultyName || '',
      universiteAd: window.TENANT?.universityName || '',
      cerceve: ((framework.name || '') + ' ' + (framework.version || '')).trim(),
      tarih: new Date().toLocaleDateString('tr-TR'),
      hazirlayan: currentUser?.name || currentUser?.identifier || '',
    };

    let totalKanit = 0;
    for (let n = 1; n <= 10; n++) {
      const forCrit = pool.filter((it) => (it.olcutNo || 0) === n);
      totalKanit += forCrit.length;
      const notes = [];
      const evid = [];
      const breakdown = {};
      forCrit.forEach((it) => {
        breakdown[it.type] = (breakdown[it.type] || 0) + 1;
        if (it.type === 'metin' && it.content) notes.push(it.title + ': ' + it.content);
        else if (it.type === 'link') {
          notes.push(it.title + (it.content ? ': ' + it.content : ''));
          if (it.sourceUrl) evid.push(it.title + ' → ' + it.sourceUrl);
        } else if (it.type === 'tablo' || it.type === 'sistem') {
          notes.push(it.title + ':\n' + tableToText(it.table));
        } else if (it.type === 'dosya') {
          evid.push(it.title + ' (' + (it.fileLabel || 'dosya') + ')');
        }
      });
      const bd = HAVUZ_TYPES.filter((t) => breakdown[t.id])
        .map((t) => breakdown[t.id] + ' ' + t.label.toLowerCase())
        .join(', ');
      staticData['olcut' + n + 'Durum'] = forCrit.length
        ? forCrit.length + ' kanıt · ' + bd
        : '— (kanıt girilmedi)';
      staticData['olcut' + n + 'Not'] = notes.join('\n\n') || '—';
      staticData['olcut' + n + 'Kanit'] = evid.join('\n') || '—';
    }
    staticData.ilerlemeOzet = totalKanit + ' kanıt havuzda';

    const rows = [];
    for (let n = 1; n <= 10; n++) {
      const c = criteria.find((x) => x.no === n);
      rows.push({
        olcutNo: n,
        olcutBaslik: c?.title || '',
        olcutDurum: staticData['olcut' + n + 'Durum'],
        olcutNot: staticData['olcut' + n + 'Not'],
        olcutKanit: staticData['olcut' + n + 'Kanit'],
      });
    }

    setGenBusy(true);
    try {
      const res = await window.TemplateEngine.produceFromTemplate({
        module: 'akreditasyon',
        docType: 'odr',
        departmentId: targetDept || undefined,
        staticData,
        rows,
        filename:
          'ODR_' + (deptObj?.name || 'fakulte').replace(/[^\wğüşıöçĞÜŞİÖÇ]/g, '_') + '.docx',
      });
      if (res.ok) return;
      const msgs = {
        'no-template':
          'ÖDR şablonu bulunamadı.\n"Hazır Şablonu Kur" ile sistemle gelen iskeleti tek tıkla kurabilir, ya da Şablonlar modülünden "Akreditasyon → ÖDR" türüne kendi .docx şablonunuzu yükleyip eşleyebilirsiniz.',
        'no-mapping':
          'Şablonun alan eşlemesi yapılmamış.\nŞablonlar modülünde 🧩 (Alanlar) ile yer tutucuları eşleyin.',
        'not-docx': 'Atanan şablon .docx değil — rapor üretimi yalnızca .docx ile çalışır.',
        'invalid-output': 'Şablondan geçerli belge üretilemedi.',
      };
      alert(msgs[res.reason] || 'Rapor üretilemedi: ' + (res.message || res.reason));
    } catch (e) {
      alert('Rapor üretilemedi: ' + e.message);
    } finally {
      setGenBusy(false);
    }
  };

  // ── Paketli ÖDR iskelet şablonunun TEK TIKLA kurulumu ──
  const ODR_TOKEN_MAP = useMemo(() => {
    const m = {
      '{{Üniversite Adı}}': 'static:universiteAd',
      '{{Fakülte Adı}}': 'static:fakulteAd',
      '{{Program (Bölüm) Adı}}': 'static:programAd',
      '{{Çerçeve}}': 'static:cerceve',
      '{{Rapor Tarihi}}': 'static:tarih',
      '{{Hazırlayan}}': 'static:hazirlayan',
      '{{İlerleme Özeti}}': 'static:ilerlemeOzet',
    };
    for (let i = 1; i <= 10; i++) {
      m['{{Ölçüt ' + i + ' — Durum Özeti}}'] = 'static:olcut' + i + 'Durum';
      m['{{Ölçüt ' + i + ' — Notlar}}'] = 'static:olcut' + i + 'Not';
      m['{{Ölçüt ' + i + ' — Kanıt Listesi}}'] = 'static:olcut' + i + 'Kanit';
    }
    return m;
  }, []);
  const [installingTpl, setInstallingTpl] = useState(false);
  const installBundledTemplate = async () => {
    if (
      !confirm(
        'Sistemle gelen hazır ÖDR iskelet şablonu Şablonlar modülüne kurulacak ve alan eşlemesi otomatik yapılacak. Devam edilsin mi?'
      )
    )
      return;
    setInstallingTpl(true);
    try {
      const fr = await fetch('/odr-sablon.docx');
      if (!fr.ok) throw new Error('Paketli şablon dosyası bulunamadı (odr-sablon.docx).');
      const blob = await fr.blob();
      const buf = await blob.arrayBuffer();
      const detected = await window.TemplateEngine.detectPlaceholders(buf);
      const fields = detected.map((d) => ({
        token: d.token,
        tokenOccurrence: d.tokenOccurrence,
        context: d.context || '',
        variable: ODR_TOKEN_MAP[d.token] || '',
        value: '',
      }));
      const token = localStorage.getItem('caku_auth_token');
      const authH = token ? { Authorization: 'Bearer ' + token } : {};
      const fd = new FormData();
      fd.append(
        'file',
        new File([blob], 'ODR_Iskelet_Sablonu.docx', {
          type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        })
      );
      fd.append('name', 'ÖDR İskelet Şablonu (hazır)');
      fd.append('module', 'akreditasyon');
      fd.append('docType', 'odr');
      fd.append('description', 'Sistemle gelen hazır ÖDR iskeleti — eşleme otomatik yapıldı.');
      const cr = await fetch('/api/templates', {
        method: 'POST',
        headers: authH,
        credentials: 'include',
        body: fd,
      });
      const created = await cr.json().catch(() => ({}));
      if (!cr.ok) throw new Error(created.error || 'Şablon yüklenemedi.');
      const ur = await fetch('/api/templates/' + created._id + '/update', {
        method: 'POST',
        headers: { ...authH, 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ fields }),
      });
      if (!ur.ok) {
        const d = await ur.json().catch(() => ({}));
        throw new Error(d.error || 'Eşleme kaydedilemedi.');
      }
      alert(
        'Hazır ÖDR şablonu kuruldu ve eşlendi ✓\n"Rapor Oluştur (ÖDR)" artık doğrudan çalışır. Dilerseniz Şablonlar modülünden iskeleti kendi ÖDR belgenizle değiştirebilirsiniz.'
      );
    } catch (e) {
      alert('Kurulum hatası: ' + e.message);
    } finally {
      setInstallingTpl(false);
    }
  };

  if (!isFacultyManager) {
    return (
      <div style={{ padding: 40, textAlign: 'center', fontFamily: "'Inter', sans-serif" }}>
        <h2 style={{ color: AKR.red, fontSize: 20, marginBottom: 8 }}>Erişim Reddedildi</h2>
        <p style={{ color: AKR.textMuted }}>
          Akreditasyon modülü yalnızca fakülte yetkililerine açıktır.
        </p>
      </div>
    );
  }
  if (loading) {
    return (
      <div style={{ padding: 60, textAlign: 'center', color: AKR.textMuted }}>Yükleniyor…</div>
    );
  }

  const totalCount = items.length;

  return (
    <div style={{ fontFamily: "'Inter', sans-serif", color: AKR.text, maxWidth: 1040 }}>
      {/* Başlık + eylemler */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          flexWrap: 'wrap',
          marginBottom: 14,
        }}
      >
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0, color: AKR.navy }}>
            Kanıt Havuzu{framework ? ' — ' + (framework.shortName || framework.name) : ''}
          </h2>
          <p style={{ fontSize: 12.5, color: AKR.textMuted, margin: '4px 0 0' }}>
            Rapor (ÖDR) için gereken kanıtları her yerden toplayın · {totalCount} kayıt
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => setEditor({ mode: 'new' })}
            style={{
              padding: '9px 18px',
              borderRadius: 8,
              border: 'none',
              background: AKR.navy,
              color: 'white',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            + Kanıt Ekle
          </button>
          <div style={{ position: 'relative' }}>
            <button
              type="button"
              onClick={() => setPresetMenu((v) => !v)}
              title="MÜDEK ÖDR'nin standart tablolarını başlıklarıyla hazır ekler"
              style={{
                padding: '9px 14px',
                borderRadius: 8,
                border: '1px solid ' + AKR.border,
                background: 'white',
                color: AKR.navy,
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              ▦ Hazır Tablo ▾
            </button>
            {presetMenu && (
              <>
                <div
                  onClick={() => setPresetMenu(false)}
                  style={{ position: 'fixed', inset: 0, zIndex: 40 }}
                />
                <div
                  style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    marginTop: 6,
                    minWidth: 300,
                    background: 'white',
                    border: '1px solid ' + AKR.border,
                    borderRadius: 10,
                    boxShadow: '0 12px 32px rgba(0,0,0,0.14)',
                    zIndex: 41,
                    padding: 6,
                    maxHeight: 360,
                    overflowY: 'auto',
                  }}
                >
                  {ODR_TABLE_PRESETS.map((ps) => (
                    <button
                      key={ps.id}
                      type="button"
                      onClick={() => {
                        setPresetMenu(false);
                        setEditor({ mode: 'preset', preset: ps });
                      }}
                      style={{
                        display: 'block',
                        width: '100%',
                        textAlign: 'left',
                        padding: '9px 11px',
                        border: 'none',
                        background: 'none',
                        borderRadius: 7,
                        cursor: 'pointer',
                        fontSize: 12.5,
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = AKR.bg)}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
                    >
                      <span style={{ fontWeight: 700, color: AKR.navy }}>{ps.title}</span>
                      <span style={{ color: AKR.textMuted, marginLeft: 6 }}>
                        · Ölçüt {ps.olcutNo}
                        {ps.systemTableKey ? ' · sistemden doldurulabilir' : ''}
                      </span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
          <button
            type="button"
            onClick={generateReport}
            disabled={genBusy}
            title="Havuzdaki kanıtlardan ÖDR şablonunu doldurur"
            style={{
              padding: '9px 18px',
              borderRadius: 8,
              border: '1px solid ' + AKR.accent,
              background: AKR.accentPale,
              color: AKR.accent,
              fontSize: 13,
              fontWeight: 600,
              cursor: genBusy ? 'wait' : 'pointer',
            }}
          >
            {genBusy ? 'Üretiliyor…' : 'Rapor Oluştur (ÖDR)'}
          </button>
          <button
            type="button"
            onClick={installBundledTemplate}
            disabled={installingTpl}
            title="Sistemle gelen hazır ÖDR iskeletini tek tıkla kurar"
            style={{
              padding: '9px 14px',
              borderRadius: 8,
              border: '1px solid ' + AKR.border,
              background: 'white',
              color: AKR.textMuted,
              fontSize: 12.5,
              fontWeight: 600,
              cursor: installingTpl ? 'wait' : 'pointer',
            }}
          >
            {installingTpl ? 'Kuruluyor…' : 'Hazır Şablonu Kur'}
          </button>
          {msg && <span style={{ fontSize: 12, color: AKR.green, fontWeight: 600 }}>{msg}</span>}
        </div>
      </div>

      {/* Filtre şeridi */}
      <div
        style={{
          background: 'white',
          border: '1px solid ' + AKR.border,
          borderRadius: 12,
          padding: '12px 14px',
          marginBottom: 14,
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
        }}
      >
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <select
            value={progDept}
            onChange={(e) => setProgDept(e.target.value)}
            style={{ ...selectStyle, width: 'auto', marginTop: 0 }}
          >
            <option value="__all">Tüm programlar</option>
            <option value="">Fakülte geneli</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            style={{ ...selectStyle, width: 'auto', marginTop: 0 }}
          >
            <option value="all">Tüm türler</option>
            {HAVUZ_TYPES.map((t) => (
              <option key={t.id} value={t.id}>
                {t.icon} {t.label}
              </option>
            ))}
          </select>
        </div>
        {/* Ölçüt sekmeleri */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => setFilterOlcut('all')}
            style={critTab(filterOlcut === 'all')}
          >
            Tümü
          </button>
          {criteria.map((c) => (
            <button
              key={c.no}
              type="button"
              onClick={() => setFilterOlcut(c.no)}
              title={c.title}
              style={critTab(filterOlcut === c.no)}
            >
              {c.no}
              {perOlcutCount[c.no] ? ' · ' + perOlcutCount[c.no] : ''}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setFilterOlcut(0)}
            style={critTab(filterOlcut === 0)}
          >
            Genel{perOlcutCount[0] ? ' · ' + perOlcutCount[0] : ''}
          </button>
        </div>
      </div>

      {/* Kanıt listesi */}
      {visible.length === 0 ? (
        <div
          style={{
            background: 'white',
            border: '1px dashed ' + AKR.border,
            borderRadius: 12,
            padding: 48,
            textAlign: 'center',
            color: AKR.textMuted,
          }}
        >
          <div style={{ fontSize: 30, marginBottom: 8 }}>🗂️</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: AKR.navy, marginBottom: 4 }}>
            {totalCount === 0 ? 'Havuz boş' : 'Bu filtreye uygun kanıt yok'}
          </div>
          <div style={{ fontSize: 12.5 }}>
            {totalCount === 0
              ? '"+ Kanıt Ekle" ile metin, tablo, dosya, dış bağlantı veya sistem verisi ekleyin.'
              : 'Filtreyi değiştirin ya da yeni kanıt ekleyin.'}
          </div>
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: 12,
          }}
        >
          {visible.map((it) => (
            <HavuzCard
              key={it.id}
              item={it}
              criteria={criteria}
              departments={departments}
              onEdit={() => setEditor({ mode: 'edit', item: it })}
              onDelete={() => deleteItem(it)}
            />
          ))}
        </div>
      )}

      {editor && (
        <HavuzEditor
          initial={editor.mode === 'edit' ? editor.item : null}
          preset={editor.mode === 'preset' ? editor.preset : null}
          criteria={criteria}
          departments={departments}
          defaults={{
            olcutNo: filterOlcut !== 'all' ? filterOlcut : criteria[0] ? criteria[0].no : 0,
            departmentId: progDept !== '__all' ? progDept : '',
          }}
          ctxForSystem={ctxForSystem}
          onSave={saveItem}
          onClose={() => !busy && setEditor(null)}
        />
      )}
    </div>
  );
}

const critTab = (active) => ({
  padding: '5px 12px',
  borderRadius: 8,
  border: '1px solid ' + (active ? AKR.navy : AKR.border),
  background: active ? AKR.navy : 'white',
  color: active ? 'white' : AKR.textMuted,
  fontSize: 12,
  fontWeight: 700,
  cursor: 'pointer',
});

window.AkreditasyonApp = AkreditasyonApp;
