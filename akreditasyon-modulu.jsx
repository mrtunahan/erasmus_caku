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

const { useState, useEffect, useMemo, useCallback, useRef } = React;

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

// Sekmeyle ayrılmış metni (Excel/web tablosu Ctrl+C) tabloya ayrıştır.
// İlk satır başlık kabul edilir; sütun sayısı en geniş satıra hizalanır.
function parseTabularText(text) {
  const lines = String(text || '')
    .replace(/\r/g, '')
    .split('\n')
    .filter((l) => l.trim() !== '');
  if (lines.length === 0) return null;
  const matrix = lines.map((l) => l.split('\t'));
  const cols = matrix.reduce((m, r) => Math.max(m, r.length), 0);
  const pad = (r) => {
    const c = r.slice(0, cols);
    while (c.length < cols) c.push('');
    return c.map((x) => x.trim());
  };
  const headers = pad(matrix[0]).map((h, i) => h || 'Sütun ' + (i + 1));
  const rows = matrix.slice(1).map(pad);
  return { headers, rows: rows.length ? rows : [headers.map(() => '')] };
}

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

// Tabloyu düz metne çevir (önizleme + yedek)
function tableToText(table) {
  if (!table || !Array.isArray(table.headers)) return '';
  const lines = [table.headers.join(' | ')];
  (table.rows || []).forEach((r) =>
    lines.push(table.headers.map((_h, i) => r[i] || '').join(' | '))
  );
  return lines.join('\n');
}

// ══════════════════════════════════════════════════════════════
// Yerel .docx üretimi — GERÇEK Word tabloları. ÖDR şablon gerektirmeden
// havuzdaki kanıtlardan (metin/link/dosya/tablo/sistem) doğrudan belge üretir.
// WordprocessingML el ile kurulur, JSZip ile paketlenir.
// ══════════════════════════════════════════════════════════════
const wEsc = (s) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

// Paragraf — çok satırlı metin <w:br/> ile bölünür.
function wP(text, opts = {}) {
  const { bold, size, italic, center, color } = opts;
  let rpr = '';
  if (bold) rpr += '<w:b/>';
  if (italic) rpr += '<w:i/>';
  if (color) rpr += '<w:color w:val="' + color + '"/>';
  if (size) rpr += '<w:sz w:val="' + size + '"/><w:szCs w:val="' + size + '"/>';
  const ppr = center ? '<w:pPr><w:jc w:val="center"/></w:pPr>' : '';
  if (text == null || text === '') return '<w:p>' + ppr + '</w:p>';
  const runs = String(text)
    .split('\n')
    .map(
      (line, i) => (i > 0 ? '<w:br/>' : '') + '<w:t xml:space="preserve">' + wEsc(line) + '</w:t>'
    )
    .join('');
  return '<w:p>' + ppr + '<w:r><w:rPr>' + rpr + '</w:rPr>' + runs + '</w:r></w:p>';
}

function wCell(text, header) {
  const shade = header ? '<w:shd w:val="clear" w:color="auto" w:fill="F1F5F9"/>' : '';
  return (
    '<w:tc><w:tcPr><w:tcW w:w="0" w:type="auto"/>' +
    shade +
    '</w:tcPr>' +
    wP(text, { bold: !!header, size: 18 }) +
    '</w:tc>'
  );
}

function wTable(headers, rows) {
  const borders =
    '<w:tblBorders>' +
    ['top', 'left', 'bottom', 'right', 'insideH', 'insideV']
      .map((s) => '<w:' + s + ' w:val="single" w:sz="4" w:space="0" w:color="CBD5E1"/>')
      .join('') +
    '</w:tblBorders>';
  const grid = '<w:tblGrid>' + headers.map(() => '<w:gridCol/>').join('') + '</w:tblGrid>';
  const headRow = '<w:tr>' + headers.map((h) => wCell(h, true)).join('') + '</w:tr>';
  const bodyRows = (rows || [])
    .map((r) => '<w:tr>' + headers.map((_h, i) => wCell(r[i] || '', false)).join('') + '</w:tr>')
    .join('');
  return (
    '<w:tbl><w:tblPr><w:tblW w:w="5000" w:type="pct"/>' +
    borders +
    '</w:tblPr>' +
    grid +
    headRow +
    bodyRows +
    '</w:tbl>'
  );
}

async function akrEnsureJSZip() {
  if (window.JSZip) return window.JSZip;
  await new Promise((res, rej) => {
    const s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js';
    s.onload = res;
    s.onerror = () => rej(new Error('JSZip yüklenemedi'));
    document.head.appendChild(s);
  });
  return window.JSZip;
}

// docx-preview — .docx'i BİREBİR (tablolar, kenarlıklar, yazı tipleri, sayfa
// düzeni) HTML'e render eder. mammoth'un aksine biçimi korur.
async function akrEnsureDocxPreview() {
  if (window.docx && window.docx.renderAsync) return window.docx;
  await akrEnsureJSZip();
  await new Promise((res, rej) => {
    const s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/docx-preview@0.3.5/dist/docx-preview.min.js';
    s.onload = res;
    s.onerror = () => rej(new Error('docx-preview yüklenemedi'));
    document.head.appendChild(s);
  });
  return window.docx;
}

// docx-preview A4 sayfası kapsayıcıdan genişse, kapsayıcıya SIĞDIR (zoom ile
// küçült — zoom layout'u da daraltır, yatay kaydırma/sola taşma olmaz).
function akrFitDocx(container) {
  if (!container) return;
  const wrap = container.querySelector('.docx-wrapper');
  const page = wrap && wrap.querySelector('section');
  if (!wrap || !page) return;
  wrap.style.zoom = '';
  wrap.style.padding = '0';
  const pageW = page.offsetWidth;
  const availW = container.clientWidth;
  if (pageW && availW && pageW > availW) {
    wrap.style.zoom = (availW / pageW).toFixed(3);
  }
}

// .docx blob'unu ayrı pencerede render edip yazdır (PDF'e aktarma).
async function printDocxBlob(blob, filename) {
  const w = window.open('', '_blank');
  if (!w) {
    alert('Yazdırma penceresi açılamadı (açılır pencere engelleyici olabilir).');
    return;
  }
  w.document.title = filename || 'ODR';
  try {
    const docx = await akrEnsureDocxPreview();
    await docx.renderAsync(blob, w.document.body, null, { inWrapper: true });
    setTimeout(() => w.print(), 600);
  } catch (e) {
    w.document.body.innerHTML = 'Önizleme oluşturulamadı: ' + (e.message || '');
  }
}

// Atanan ÖDR şablonunu çöz (Şablonlar sistemi).
async function akrResolveTemplate(departmentId) {
  const token = localStorage.getItem('caku_auth_token');
  const headers = token ? { Authorization: 'Bearer ' + token } : {};
  const url =
    '/api/templates/resolve?module=akreditasyon&docType=odr&departmentId=' +
    encodeURIComponent(departmentId || '');
  const r = await fetch(url, { headers, credentials: 'include' });
  const d = await r.json().catch(() => ({}));
  return d.template || null;
}
async function akrDownloadTemplateBuf(id) {
  const token = localStorage.getItem('caku_auth_token');
  const headers = token ? { Authorization: 'Bearer ' + token } : {};
  const fr = await fetch('/api/templates/' + id + '/download', { headers, credentials: 'include' });
  if (!fr.ok) throw new Error('Şablon indirilemedi (HTTP ' + fr.status + ')');
  return fr.arrayBuffer();
}

async function buildAndDownloadDocx(bodyXml, filename) {
  const JSZip = await akrEnsureJSZip();
  const docXml =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">' +
    '<w:body>' +
    bodyXml +
    '<w:sectPr/></w:body></w:document>';
  const CT =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
    '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
    '<Default Extension="xml" ContentType="application/xml"/>' +
    '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>' +
    '</Types>';
  const RELS =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
    '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>' +
    '</Relationships>';
  const zip = new JSZip();
  zip.file('[Content_Types].xml', CT);
  zip.file('_rels/.rels', RELS);
  zip.file('word/document.xml', docXml);
  const blob = await zip.generateAsync({
    type: 'blob',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

// ══════════════════════════════════════════════════════════════
// ÖDR HTML önizleme — belge görünümü (aynı havuz verisinden). Hem canlı
// önizleme panelinde hem "Yazdır / PDF" penceresinde kullanılır.
// ══════════════════════════════════════════════════════════════
function htmlTable(t) {
  if (!t || !Array.isArray(t.headers)) return '';
  const th = t.headers
    .map(
      (h) =>
        '<th style="border:1px solid #334155;padding:5px 7px;background:#eef2f7;text-align:left;font-weight:700;">' +
        wEsc(h) +
        '</th>'
    )
    .join('');
  const tb = (t.rows || [])
    .map(
      (r) =>
        '<tr>' +
        t.headers
          .map(
            (_h, i) =>
              '<td style="border:1px solid #334155;padding:5px 7px;">' + wEsc(r[i] || '') + '</td>'
          )
          .join('') +
        '</tr>'
    )
    .join('');
  return (
    '<table style="border-collapse:collapse;width:100%;margin:8px 0;font-size:11px;">' +
    '<thead><tr>' +
    th +
    '</tr></thead><tbody>' +
    tb +
    '</tbody></table>'
  );
}

function reportItemHTML(it, origin) {
  let h = '<div style="font-weight:700;margin:12px 0 3px;">' + wEsc(it.title) + '</div>';
  if (it.type === 'metin') {
    if (it.content)
      h +=
        '<p style="margin:0 0 6px;white-space:pre-wrap;line-height:1.6;">' +
        wEsc(it.content) +
        '</p>';
  } else if (it.type === 'link') {
    if (it.content)
      h +=
        '<p style="margin:0 0 4px;white-space:pre-wrap;line-height:1.6;">' +
        wEsc(it.content) +
        '</p>';
    if (it.sourceUrl)
      h +=
        '<p style="margin:0 0 6px;font-style:italic;color:#475569;font-size:11px;">Kaynak: ' +
        wEsc(it.sourceUrl) +
        '</p>';
  } else if (it.type === 'dosya') {
    const href = it.fileUrl ? origin + akrFileHref(it.fileUrl) : '';
    h +=
      '<p style="margin:0 0 6px;">📎 <a href="' +
      wEsc(href) +
      '" style="color:#0F766E;">' +
      wEsc(it.fileLabel || 'Dosya') +
      '</a></p>';
  } else if (it.type === 'tablo' || it.type === 'sistem') {
    h += htmlTable(it.table);
  }
  return h;
}

// Belge gövdesi (başlık bloğu + ölçüt bölümleri) — HTML string.
function buildReportBodyHTML({ scopeLabel, identity, criteria, pool, origin }) {
  const H = [];
  H.push(
    '<div style="text-align:center;border-bottom:2px solid #1B2A4A;padding-bottom:16px;margin-bottom:22px;">' +
      '<div style="font-size:22px;font-weight:800;color:#1B2A4A;letter-spacing:0.5px;">ÖZ DEĞERLENDİRME RAPORU</div>' +
      (identity.universiteAd
        ? '<div style="font-size:15px;font-weight:700;margin-top:8px;">' +
          wEsc(identity.universiteAd) +
          '</div>'
        : '') +
      (identity.fakulteAd
        ? '<div style="font-size:13px;color:#475569;">' + wEsc(identity.fakulteAd) + '</div>'
        : '') +
      '<div style="font-size:14px;font-weight:700;color:#0F766E;margin-top:4px;">' +
      wEsc(scopeLabel) +
      '</div>' +
      '</div>'
  );
  H.push(
    '<div style="font-size:11.5px;color:#334155;margin-bottom:20px;line-height:1.7;">' +
      'Çerçeve: ' +
      wEsc(identity.cerceve) +
      '<br/>' +
      'Rapor Tarihi: ' +
      wEsc(identity.tarih) +
      '<br/>' +
      'Hazırlayan: ' +
      wEsc(identity.hazirlayan) +
      '<br/>' +
      'Havuzdaki kanıt sayısı: ' +
      pool.length +
      '</div>'
  );
  for (let n = 1; n <= 10; n++) {
    const c = criteria.find((x) => x.no === n);
    const forCrit = pool.filter((it) => (it.olcutNo || 0) === n);
    H.push(
      '<h2 style="font-size:15px;font-weight:800;color:#1B2A4A;margin:22px 0 6px;border-bottom:1px solid #cbd5e1;padding-bottom:4px;">' +
        'ÖLÇÜT ' +
        n +
        '. ' +
        wEsc(String(c?.title || '').toUpperCase()) +
        '</h2>'
    );
    if (forCrit.length === 0) {
      H.push(
        '<p style="font-style:italic;color:#94a3b8;font-size:12px;margin:4px 0 10px;">Bu ölçüt için havuzda henüz kanıt girilmemiştir.</p>'
      );
    } else {
      forCrit.forEach((it) => H.push(reportItemHTML(it, origin)));
    }
  }
  return H.join('');
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
  // Bağlam, sayfa filtresi DEĞİL, bu modaldaki Program seçimidir — böylece
  // "Tüm programlar" görünümünde bile doğru programın verisi çekilir.
  const fillFromSystem = async () => {
    if (!preset?.systemTableKey) return;
    if (!departmentId) {
      setErr('Bu tablo bir programa özgüdür. Lütfen yukarıdan bir Program seçin.');
      return;
    }
    setTblSysBusy(true);
    setErr('');
    try {
      const dObj = departments.find((d) => d.id === departmentId);
      const ctx = {
        departmentId,
        departmentName: dObj?.name || '',
        facultyId: ctxForSystem?.facultyId || '',
      };
      const res = await KanitSaglayici.fetchTable(preset.systemTableKey, ctx);
      if (!res || !res.rows || res.rows.length === 0) {
        setErr(
          'Seçili program (' +
            (dObj?.name || departmentId) +
            ') için sistemde bu tabloya ait veri bulunamadı. Kayıtların bu bölüme bağlı olduğundan emin olun.'
        );
        return;
      }
      setTable(res);
    } finally {
      setTblSysBusy(false);
    }
  };

  const uploadFile = async (f) => {
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
      return true;
    } catch (e2) {
      setErr('Dosya yüklenemedi: ' + e2.message);
      return false;
    } finally {
      setUploading(false);
    }
  };

  const pickFile = async (e) => {
    const f = (e.target.files && e.target.files[0]) || null;
    e.target.value = '';
    if (f) await uploadFile(f);
  };

  // Ctrl+V yakala: pano bir GÖRSEL içeriyorsa (ekran görüntüsü) → dosya olarak
  // yükle + tür 'dosya'. Pano SEKMELİ/çok satırlı METİN içeriyorsa (Excel/web
  // tablosu) → tablo olarak ayrıştır + tür 'tablo'. Not: tarayıcı güvenliği
  // gereği bir web LİNKİNDEN içerik otomatik ÇEKİLEMEZ; kopyalanan içeriği
  // yapıştırmak bu işi güvenli biçimde yapmanın yoludur.
  const handlePaste = async (e) => {
    if (preset) return; // hazır tabloda yapıştırma tabloyu bozmasın
    const cd = e.clipboardData;
    if (!cd) return;
    // 1) Görsel var mı?
    const imgItem = Array.from(cd.items || []).find(
      (it) => it.type && it.type.startsWith('image/')
    );
    if (imgItem) {
      const blob = imgItem.getAsFile();
      if (blob) {
        e.preventDefault();
        const ext = (blob.type.split('/')[1] || 'png').replace('jpeg', 'jpg');
        const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        const file = new File([blob], 'ekran-goruntusu-' + stamp + '.' + ext, { type: blob.type });
        setType('dosya');
        await uploadFile(file);
      }
      return;
    }
    // 2) Tablo gibi metin mi? Güvenilir sinyal = SEKME (Excel/web tablosu
    //    kopyalayınca hücreler sekmeyle gelir). Yalnız çok satırlı düz metin
    //    (paragraf) tabloya ÇEVRİLMEZ — kullanıcının metnini bozmamak için.
    const text = cd.getData('text/plain') || '';
    if (/\t/.test(text)) {
      const parsed = parseTabularText(text);
      if (parsed && parsed.rows.length > 0) {
        e.preventDefault();
        setType('tablo');
        setTable(parsed);
        if (!title) setTitle('Yapıştırılan tablo');
      }
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
      const dObj = departments.find((d) => d.id === departmentId);
      const ctx = {
        departmentId,
        departmentName: dObj?.name || '',
        facultyId: ctxForSystem?.facultyId || '',
      };
      const rows = [];
      for (const key of sysKeys) {
        const r = await KanitSaglayici.fetch(key, ctx);
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
        onPaste={handlePaste}
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

          {!preset && (
            <div
              style={{
                fontSize: 11.5,
                color: AKR.textMuted,
                background: AKR.bg,
                borderRadius: 8,
                padding: '7px 10px',
              }}
            >
              💡 İpucu: Buraya <b>Ctrl+V</b> ile bir <b>ekran görüntüsü</b> yapıştırırsanız dosya
              olarak eklenir; Excel/web'den kopyaladığınız bir <b>tablo</b> yapıştırırsanız otomatik
              tabloya dönüşür.
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

// Belge HTML'ini ayrı pencerede yazdır (PDF'e aktarma).
function printHTML(bodyHTML, filename) {
  const w = window.open('', '_blank');
  if (!w) {
    alert('Yazdırma penceresi açılamadı (açılır pencere engelleyici olabilir).');
    return;
  }
  w.document.write(
    '<html><head><meta charset="utf-8"><title>' +
      wEsc(filename || 'ODR') +
      '</title><style>@page{margin:20mm;}body{font-family:Inter,Arial,sans-serif;color:#0f172a;line-height:1.5;}table{page-break-inside:avoid;}h2{page-break-after:avoid;}</style></head><body>' +
      bodyHTML +
      '</body></html>'
  );
  w.document.close();
  w.focus();
  setTimeout(() => w.print(), 350);
}

// ══════════════════════════════════════════════════════════════
// ÖDR canlı önizleme — tam ekran belge görünümü + araç çubuğu
// ══════════════════════════════════════════════════════════════
function ODRPreview({ bodyHTML, blob, filename, onDownloadDocx, onClose }) {
  const fsRef = useRef(null);
  const printReport = () => (blob ? printDocxBlob(blob, filename) : printHTML(bodyHTML, filename));

  // Blob varsa docx-preview ile BİREBİR render et.
  useEffect(() => {
    if (!blob || !fsRef.current) return;
    let cancelled = false;
    (async () => {
      try {
        const docx = await akrEnsureDocxPreview();
        if (cancelled || !fsRef.current) return;
        fsRef.current.innerHTML = '';
        await docx.renderAsync(blob, fsRef.current, null, {
          inWrapper: true,
          ignoreLastRenderedPageBreak: true,
        });
        if (!cancelled) requestAnimationFrame(() => akrFitDocx(fsRef.current));
      } catch (e) {
        if (!cancelled && fsRef.current)
          fsRef.current.innerHTML =
            '<div style="color:#991b1b;padding:20px">Önizleme oluşturulamadı: ' +
            (e.message || '') +
            '</div>';
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [blob]);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: '#cbd5e1',
        zIndex: 1100,
        display: 'flex',
        flexDirection: 'column',
        fontFamily: "'Inter', sans-serif",
      }}
    >
      <div
        style={{
          height: 56,
          flexShrink: 0,
          background: 'white',
          borderBottom: '1px solid ' + AKR.border,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 20px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 15, fontWeight: 800, color: AKR.navy }}>ÖDR Önizleme</span>
          <span style={{ fontSize: 12, color: AKR.textMuted }}>{filename}</span>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            type="button"
            onClick={printReport}
            style={{
              padding: '8px 16px',
              borderRadius: 8,
              border: '1px solid ' + AKR.border,
              background: 'white',
              color: AKR.navy,
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            🖨️ Yazdır / PDF
          </button>
          <button
            type="button"
            onClick={onDownloadDocx}
            style={{
              padding: '8px 16px',
              borderRadius: 8,
              border: 'none',
              background: AKR.accent,
              color: 'white',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            ⬇️ Word (.docx) İndir
          </button>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '8px 16px',
              borderRadius: 8,
              border: '1px solid ' + AKR.border,
              background: 'white',
              color: AKR.textMuted,
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Kapat
          </button>
        </div>
      </div>
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '32px 16px',
          display: 'flex',
          justifyContent: 'center',
        }}
      >
        {blob ? (
          <div ref={fsRef} style={{ width: '100%', maxWidth: 900 }} />
        ) : (
          <div
            style={{
              width: '100%',
              maxWidth: 820,
              background: 'white',
              padding: '56px 64px',
              boxShadow: '0 10px 30px rgba(0,0,0,0.15)',
              color: '#0f172a',
              fontSize: 13,
              height: 'fit-content',
            }}
            dangerouslySetInnerHTML={{ __html: bodyHTML }}
          />
        )}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// AI taslak modalı — üretilen metni DÜZENLE + onayla (insan-onaylı).
// ══════════════════════════════════════════════════════════════
function AiDraftModal({ draft, criteria, onSave, onRetry, onClose }) {
  const [text, setText] = useState(draft.text || '');
  useEffect(() => {
    setText(draft.text || '');
  }, [draft.text]);
  const c = criteria.find((x) => x.no === draft.criterionNo);
  const title = 'Ölçüt ' + draft.criterionNo + (c ? ' — ' + c.title : '');

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15,23,42,0.45)',
        zIndex: 1050,
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
          maxWidth: 680,
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
          <div>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#6D28D9' }}>
              ✨ AI Taslak — {title}
            </h3>
            <p style={{ margin: '3px 0 0', fontSize: 11.5, color: AKR.textMuted }}>
              Yapay zekâ taslağıdır — düzenleyip onaylayın. Kanıtta olmayan yerler <b>[EKSİK: …]</b>{' '}
              ile işaretlenir.
            </p>
          </div>
          <span
            onClick={onClose}
            style={{ cursor: 'pointer', color: AKR.textMuted, fontSize: 20, lineHeight: 1 }}
          >
            ×
          </span>
        </div>

        <div style={{ padding: 20 }}>
          {draft.loading ? (
            <div style={{ padding: 40, textAlign: 'center', color: AKR.textMuted }}>
              Taslak üretiliyor… (birkaç saniye)
            </div>
          ) : draft.error ? (
            <div style={{ color: AKR.red, fontSize: 13, lineHeight: 1.6 }}>
              Taslak üretilemedi: {draft.error}
              <div style={{ marginTop: 12 }}>
                <button
                  type="button"
                  onClick={onRetry}
                  style={{ ...miniBtn, borderColor: '#7C3AED' }}
                >
                  Tekrar dene
                </button>
              </div>
            </div>
          ) : (
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={16}
              style={{
                width: '100%',
                padding: '12px 14px',
                borderRadius: 10,
                border: '1px solid ' + AKR.border,
                fontSize: 13,
                lineHeight: 1.6,
                outline: 'none',
                resize: 'vertical',
                boxSizing: 'border-box',
                fontFamily: "'Inter', sans-serif",
                color: AKR.text,
              }}
            />
          )}
        </div>

        {!draft.loading && !draft.error && (
          <div
            style={{
              padding: '14px 20px',
              borderTop: '1px solid ' + AKR.border,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 8,
              flexWrap: 'wrap',
            }}
          >
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="button"
                onClick={() => {
                  try {
                    navigator.clipboard.writeText(text);
                  } catch (_e) {
                    /* pano yok */
                  }
                }}
                style={{ ...miniBtn, color: AKR.textMuted }}
              >
                Panoya kopyala
              </button>
              <button
                type="button"
                onClick={onRetry}
                style={{ ...miniBtn, color: '#6D28D9', borderColor: '#7C3AED' }}
              >
                ↻ Yeniden üret
              </button>
            </div>
            <button
              type="button"
              onClick={() => onSave(text)}
              disabled={!text.trim()}
              style={{
                padding: '9px 20px',
                borderRadius: 8,
                border: 'none',
                background: text.trim() ? AKR.navy : AKR.border,
                color: text.trim() ? 'white' : AKR.textMuted,
                fontSize: 13,
                fontWeight: 700,
                cursor: text.trim() ? 'pointer' : 'default',
              }}
            >
              Havuza “metin” olarak ekle
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

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
  const [aiStatus, setAiStatus] = useState({ configured: false, provider: null });
  const [aiDraft, setAiDraft] = useState(null); // {loading,text,error,criterionNo,departmentId}

  // AI yapılandırma durumu (buton buna göre etkinleşir)
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const token = localStorage.getItem('caku_auth_token');
        const r = await fetch('/api/ai/status', {
          headers: token ? { Authorization: 'Bearer ' + token } : {},
          credentials: 'include',
        });
        const d = await r.json().catch(() => ({}));
        if (alive) setAiStatus({ configured: !!d.configured, provider: d.provider || null });
      } catch (_e) {
        /* durum alınamadı */
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const criteria = useMemo(
    () => (framework?.criteria || []).map((c) => ({ no: c.no, title: c.title })),
    [framework]
  );

  const loadItems = useCallback(async () => {
    if (!myFacultyId) return;
    // Yazma sonrası bayat cache'i atla — yeni kanıt refresh gerekmeden görünsün.
    const read = window.apiRead.fresh || window.apiRead;
    const list = await read('akreditasyon_havuz', {
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
  // Şablon token'ları (TEMPLATE_VARS) ile:
  //   olcut{n}Durum / olcut{n}Not / olcut{n}Kanit  ← havuz kanıtlarından üretilir.
  // Rapora girecek kanıt havuzu — filtre durumuna göre:
  //   "Tüm programlar" → HER kayıt (hiçbir şey düşmez; test/genel bakış).
  //   "Fakülte geneli" → yalnız programsız (genel) kayıtlar.
  //   Belirli program  → o programın kayıtları + fakülte-geneli kayıtlar.
  const selectReportPool = () => {
    const isAll = progDept === '__all';
    const targetDept = !isAll && progDept !== '' ? progDept : '';
    const deptObj = departments.find((d) => d.id === targetDept);
    const pool = items.filter((it) => {
      if (isAll) return true;
      if (targetDept === '') return !it.departmentId;
      return !it.departmentId || it.departmentId === targetDept;
    });
    return { isAll, targetDept, deptObj, pool };
  };

  // Havuzdan ÖDR şablon verisini (staticData + rows) üret — hem "Şablona
  // Doldur" indirmesi hem sağ paneldeki şablon önizlemesi aynı veriyi kullanır.
  const buildOdrData = () => {
    const { targetDept, deptObj, pool } = selectReportPool();
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
    const filename =
      'ODR_' + (deptObj?.name || 'fakulte').replace(/[^\wğüşıöçĞÜŞİÖÇ]/g, '_') + '.docx';
    return { targetDept, deptObj, staticData, rows, filename };
  };

  const [genBusy, setGenBusy] = useState(false);
  const generateReport = async () => {
    if (!framework) return;
    const { targetDept, staticData, rows, filename } = buildOdrData();
    setGenBusy(true);
    try {
      const res = await window.TemplateEngine.produceFromTemplate({
        module: 'akreditasyon',
        docType: 'odr',
        departmentId: targetDept || undefined,
        staticData,
        rows,
        filename,
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

  // ── Yerel ÖDR üretimi — GERÇEK Word tabloları, şablon gerektirmez ──
  // Havuzdaki her kanıt türüne göre belgeye basılır: metin→paragraf,
  // link→paragraf+kaynak, dosya→bağlantı satırı, tablo/sistem→Word tablosu.
  const [nativeBusy, setNativeBusy] = useState(false);
  const [preview, setPreview] = useState(null); // { bodyHTML, filename }

  const openPreview = () => {
    if (!framework) return;
    const { isAll, deptObj, pool } = selectReportPool();
    const scopeLabel = deptObj?.name || (isAll ? 'Tüm Programlar' : 'Fakülte Geneli');
    const identity = {
      universiteAd: window.TENANT?.universityName || '',
      fakulteAd: window.TENANT?.facultyName || '',
      cerceve: ((framework.name || '') + ' ' + (framework.version || '')).trim(),
      tarih: new Date().toLocaleDateString('tr-TR'),
      hazirlayan: currentUser?.name || currentUser?.identifier || '',
    };
    const bodyHTML = buildReportBodyHTML({
      scopeLabel,
      identity,
      criteria,
      pool,
      origin: window.location.origin,
    });
    const filename =
      'ODR_' + (deptObj?.name || 'fakulte').replace(/[^\wğüşıöçĞÜŞİÖÇ]/g, '_') + '.docx';
    setPreview({ bodyHTML, filename });
  };

  // Sağ panel canlı önizleme — havuz/kapsam değiştikçe yeniden üretilir.
  const livePreview = useMemo(() => {
    if (!framework) return { bodyHTML: '', filename: 'ODR.docx' };
    const isAll = progDept === '__all';
    const targetDept = !isAll && progDept !== '' ? progDept : '';
    const deptObj = departments.find((d) => d.id === targetDept);
    const scopeLabel = deptObj?.name || (isAll ? 'Tüm Programlar' : 'Fakülte Geneli');
    const pool = items.filter((it) => {
      if (isAll) return true;
      if (targetDept === '') return !it.departmentId;
      return !it.departmentId || it.departmentId === targetDept;
    });
    const identity = {
      universiteAd: window.TENANT?.universityName || '',
      fakulteAd: window.TENANT?.facultyName || '',
      cerceve: ((framework.name || '') + ' ' + (framework.version || '')).trim(),
      tarih: new Date().toLocaleDateString('tr-TR'),
      hazirlayan: currentUser?.name || currentUser?.identifier || '',
    };
    const bodyHTML = buildReportBodyHTML({
      scopeLabel,
      identity,
      criteria,
      pool,
      origin: window.location.origin,
    });
    const filename =
      'ODR_' + (deptObj?.name || 'fakulte').replace(/[^\wğüşıöçĞÜŞİÖÇ]/g, '_') + '.docx';
    return { bodyHTML, filename };
  }, [framework, items, progDept, criteria, departments, currentUser]);

  // Yüklü ÖDR şablonlarını listele (kullanıcı hangisini önizleyeceğini SEÇER —
  // "Hazır Şablonu Kur" ile gelen iskelet varsayılan olsa bile senin yüklediğin
  // belgeyi seçebilirsin). En yeni yüklenen varsayılan seçilir.
  const [tplList, setTplList] = useState([]);
  const [tplChoiceId, setTplChoiceId] = useState('');
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const token = localStorage.getItem('caku_auth_token');
        const r = await fetch('/api/templates', {
          headers: token ? { Authorization: 'Bearer ' + token } : {},
          credentials: 'include',
        });
        const all = await r.json().catch(() => []);
        const odr = (all || []).filter(
          (t) => t.module === 'akreditasyon' && (t.docType || 'default') === 'odr'
        );
        if (!alive) return;
        setTplList(odr);
        setTplChoiceId((prev) => prev || (odr[0] ? odr[0]._id : ''));
      } catch (_e) {
        /* liste alınamadı */
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  // Şablon önizlemesi — SEÇİLİ ÖDR .docx'ini üretir (blob). Eşlenmişse havuz
  // verisiyle DOLU, değilse ham. docx-preview ile BİREBİR render edilir (aşağıda).
  // Havuz/kapsam/seçim değiştikçe (debounce) yeniden üretilir → interaktif.
  const [tplPreview, setTplPreview] = useState({ status: 'loading' });
  useEffect(() => {
    if (!framework) return;
    let alive = true;
    const timer = setTimeout(async () => {
      if (alive) setTplPreview((p) => ({ ...p, status: p.blob ? 'refreshing' : 'loading' }));
      try {
        const { staticData, rows } = buildOdrData();
        let tpl = tplChoiceId ? tplList.find((t) => t._id === tplChoiceId) : null;
        if (!tpl) tpl = await akrResolveTemplate('');
        if (!alive) return;
        if (!tpl) {
          setTplPreview({ status: 'none' });
          return;
        }
        if (!tpl.file || tpl.file.extension !== 'docx') {
          setTplPreview({ status: 'error', message: 'Seçili şablon .docx değil.' });
          return;
        }
        const buf = await akrDownloadTemplateBuf(tpl._id);
        let blob = null;
        let filled = false;
        let note = '';
        const mapped = (tpl.fields || []).some((f) => f.variable);
        if (mapped) {
          try {
            blob = await window.TemplateEngine.generateDocx(buf, tpl.fields, staticData, rows, {});
            filled = true;
          } catch (_e) {
            note = 'Şablon dolduruldu ama yapısı bozuk — ham gösteriliyor.';
          }
        } else {
          note =
            'Bu şablon eşlenmemiş — belge HAM gösteriliyor. Kanıtların otomatik dolması için Şablonlar modülünde 🧩 ile {{...}} alanlarını değişkenlere eşleyin.';
        }
        if (!blob) blob = new Blob([buf]);
        if (!alive) return;
        setTplPreview({ status: 'ok', blob, filled, note, tplName: tpl.name || '' });
      } catch (e) {
        if (alive) setTplPreview({ status: 'error', message: e.message });
      }
    }, 400);
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [framework, items, progDept, tplChoiceId, tplList]);

  // docx-preview ile blob'u sağ panele BİREBİR render et.
  const panelRef = useRef(null);
  useEffect(() => {
    if (tplPreview.status !== 'ok' || !tplPreview.blob) return;
    let cancelled = false;
    (async () => {
      try {
        const docx = await akrEnsureDocxPreview();
        if (cancelled || !panelRef.current) return;
        panelRef.current.innerHTML = '';
        await docx.renderAsync(tplPreview.blob, panelRef.current, null, {
          inWrapper: true,
          ignoreLastRenderedPageBreak: true,
        });
        if (!cancelled) requestAnimationFrame(() => akrFitDocx(panelRef.current));
      } catch (e) {
        if (!cancelled && panelRef.current)
          panelRef.current.innerHTML =
            '<div style="color:#991b1b;padding:20px">Önizleme oluşturulamadı: ' +
            (e.message || '') +
            '</div>';
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tplPreview.blob, tplPreview.status]);

  // Seçili şablonu havuz verisiyle doldurup indir (Word butonu).
  const downloadWordChosen = async () => {
    const tpl = tplChoiceId ? tplList.find((t) => t._id === tplChoiceId) : null;
    if (!tpl || !(tpl.fields || []).some((f) => f.variable)) return generateNativeODR();
    setGenBusy(true);
    try {
      const { staticData, rows, filename } = buildOdrData();
      const buf = await akrDownloadTemplateBuf(tpl._id);
      const blob = await window.TemplateEngine.generateDocx(buf, tpl.fields, staticData, rows, {});
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
    } catch (e) {
      alert('İndirilemedi: ' + e.message);
    } finally {
      setGenBusy(false);
    }
  };

  // ── AI: bir ölçüt için ÖDR taslak metni yaz (insan-onaylı) ──
  const requestAiDraft = async (criterionNo) => {
    const c = criteria.find((x) => x.no === criterionNo);
    const isAll = progDept === '__all';
    const scopedDept = !isAll && progDept !== '' ? progDept : '';
    const deptObj = departments.find((d) => d.id === scopedDept);
    const forCrit = items.filter((it) => {
      if ((it.olcutNo || 0) !== criterionNo) return false;
      if (isAll) return true;
      if (scopedDept === '') return !it.departmentId;
      return !it.departmentId || it.departmentId === scopedDept;
    });
    const evidence = forCrit.map((it) => ({
      type: it.type,
      title: it.title,
      content:
        it.type === 'metin'
          ? it.content || ''
          : it.type === 'link'
            ? (it.content || '') + (it.sourceUrl ? '\nKaynak: ' + it.sourceUrl : '')
            : it.type === 'dosya'
              ? 'Ekli dosya: ' + (it.fileLabel || '')
              : it.type === 'tablo' || it.type === 'sistem'
                ? tableToText(it.table)
                : '',
    }));
    setAiDraft({ loading: true, text: '', error: '', criterionNo, departmentId: scopedDept });
    try {
      const token = localStorage.getItem('caku_auth_token');
      const r = await fetch('/api/ai/accreditation-draft', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: 'Bearer ' + token } : {}),
        },
        credentials: 'include',
        body: JSON.stringify({
          frameworkName: framework?.name || 'MÜDEK',
          criterionNo,
          criterionTitle: c?.title || '',
          programName: deptObj?.name || (isAll ? 'Tüm programlar' : 'Fakülte geneli'),
          evidence,
        }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || 'HTTP ' + r.status);
      setAiDraft((prev) =>
        prev && prev.criterionNo === criterionNo
          ? { ...prev, loading: false, text: d.text || '', provider: d.provider }
          : prev
      );
    } catch (e) {
      setAiDraft((prev) => (prev ? { ...prev, loading: false, error: e.message } : prev));
    }
  };

  const saveAiDraftAsEvidence = async (text) => {
    if (!aiDraft) return;
    const cno = aiDraft.criterionNo;
    const c = criteria.find((x) => x.no === cno);
    try {
      await window.DBWrite.add('akreditasyon_havuz', {
        type: 'metin',
        title: 'AI Taslak — Ölçüt ' + cno + (c ? ' (' + c.title + ')' : ''),
        content: text,
        olcutNo: cno,
        departmentId: aiDraft.departmentId || '',
        facultyId: myFacultyId,
        universityId: myUniversityId,
        createdBy: currentUser?.name || currentUser?.identifier || '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      await loadItems();
      setAiDraft(null);
      setMsg('AI taslağı havuza eklendi ✓');
      setTimeout(() => setMsg(''), 2500);
    } catch (e) {
      alert('Eklenemedi: ' + e.message);
    }
  };

  const generateNativeODR = async () => {
    if (!framework) return;
    const { isAll, deptObj, pool } = selectReportPool();
    const origin = window.location.origin;
    const scopeLabel = deptObj?.name || (isAll ? 'Tüm Programlar' : 'Fakülte Geneli');

    setNativeBusy(true);
    try {
      const parts = [];
      parts.push(wP('ÖZ DEĞERLENDİRME RAPORU', { bold: true, size: 36, center: true }));
      parts.push(wP(''));
      if (window.TENANT?.universityName)
        parts.push(wP(window.TENANT.universityName, { bold: true, size: 28, center: true }));
      if (window.TENANT?.facultyName)
        parts.push(wP(window.TENANT.facultyName, { size: 24, center: true }));
      parts.push(wP(scopeLabel, { bold: true, size: 26, center: true }));
      parts.push(wP(''));
      parts.push(
        wP('Çerçeve: ' + ((framework.name || '') + ' ' + (framework.version || '')).trim())
      );
      parts.push(wP('Rapor Tarihi: ' + new Date().toLocaleDateString('tr-TR')));
      parts.push(wP('Hazırlayan: ' + (currentUser?.name || currentUser?.identifier || '')));
      parts.push(wP('Havuzdaki kanıt sayısı: ' + pool.length));
      parts.push(wP(''));

      for (let n = 1; n <= 10; n++) {
        const c = criteria.find((x) => x.no === n);
        const forCrit = pool.filter((it) => (it.olcutNo || 0) === n);
        parts.push(
          wP('ÖLÇÜT ' + n + '. ' + String(c?.title || '').toUpperCase(), { bold: true, size: 24 })
        );
        if (forCrit.length === 0) {
          parts.push(
            wP('Bu ölçüt için havuzda henüz kanıt girilmemiştir.', {
              italic: true,
              color: '6B7280',
            })
          );
          parts.push(wP(''));
          continue;
        }
        forCrit.forEach((it) => {
          parts.push(wP(it.title, { bold: true, size: 22 }));
          if (it.type === 'metin') {
            if (it.content) parts.push(wP(it.content));
          } else if (it.type === 'link') {
            if (it.content) parts.push(wP(it.content));
            if (it.sourceUrl) parts.push(wP('Kaynak: ' + it.sourceUrl, { italic: true }));
          } else if (it.type === 'dosya') {
            const href = it.fileUrl ? origin + akrFileHref(it.fileUrl) : '';
            parts.push(wP('📎 ' + (it.fileLabel || 'Dosya') + (href ? ' — ' + href : '')));
          } else if (it.type === 'tablo' || it.type === 'sistem') {
            if (it.table && Array.isArray(it.table.headers)) {
              parts.push(wTable(it.table.headers, it.table.rows));
              parts.push(wP(''));
            }
          }
        });
        parts.push(wP(''));
      }

      const filename =
        'ODR_' + (deptObj?.name || 'fakulte').replace(/[^\wğüşıöçĞÜŞİÖÇ]/g, '_') + '.docx';
      await buildAndDownloadDocx(parts.join(''), filename);
    } catch (e) {
      alert('ÖDR üretilemedi: ' + e.message);
    } finally {
      setNativeBusy(false);
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
  const coveredCount = criteria.filter((c) => perOlcutCount[c.no]).length;
  const selCrit = criteria.find((c) => c.no === filterOlcut);
  const selTitle =
    filterOlcut === 'all'
      ? 'Tüm Kanıtlar'
      : filterOlcut === 0
        ? 'Genel / Etiketsiz'
        : selCrit
          ? 'Ölçüt ' + selCrit.no + ': ' + selCrit.title
          : 'Ölçüt ' + filterOlcut;

  const navItem = (active, label, count, done) => (
    <button
      type="button"
      onClick={label.onClick}
      title={label.title || ''}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        width: '100%',
        textAlign: 'left',
        padding: '8px 12px',
        border: 'none',
        borderLeft: '3px solid ' + (active ? AKR.navy : 'transparent'),
        background: active ? AKR.accentPale : 'transparent',
        color: active ? AKR.navy : AKR.text,
        fontSize: 12.5,
        fontWeight: active ? 700 : 500,
        cursor: 'pointer',
      }}
      onMouseEnter={(e) => {
        if (!active) e.currentTarget.style.background = AKR.bg;
      }}
      onMouseLeave={(e) => {
        if (!active) e.currentTarget.style.background = 'transparent';
      }}
    >
      <span
        style={{
          width: 7,
          height: 7,
          borderRadius: '50%',
          flexShrink: 0,
          background: done ? AKR.green : count ? AKR.accent : AKR.border,
        }}
      />
      <span style={{ flex: 1, minWidth: 0 }}>{label.text}</span>
      {count ? (
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: active ? AKR.navy : AKR.textMuted,
            background: active ? 'white' : AKR.bg,
            borderRadius: 10,
            padding: '1px 7px',
          }}
        >
          {count}
        </span>
      ) : null}
    </button>
  );

  return (
    <div
      style={{
        fontFamily: "'Inter', sans-serif",
        color: AKR.text,
        display: 'grid',
        gridTemplateColumns: '248px minmax(0,1fr) minmax(0,1fr)',
        gap: 0,
        height: 'calc(100vh - 150px)',
        minHeight: 540,
        border: '1px solid ' + AKR.border,
        borderRadius: 12,
        overflow: 'hidden',
        background: 'white',
      }}
    >
      {/* ── SOL: Ölçüt gezinme ── */}
      <div
        style={{
          borderRight: '1px solid ' + AKR.border,
          background: AKR.bg,
          display: 'flex',
          flexDirection: 'column',
          minHeight: 0,
        }}
      >
        <div style={{ padding: '14px 14px 10px' }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: AKR.navy }}>
            {framework ? framework.shortName || framework.name : 'Kanıt Havuzu'}
          </div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: 11,
              color: AKR.textMuted,
              margin: '8px 0 4px',
            }}
          >
            <span>Kanıtlı ölçüt</span>
            <span style={{ fontWeight: 700, color: AKR.navy }}>{coveredCount}/10</span>
          </div>
          <div style={{ height: 6, borderRadius: 3, background: AKR.border, overflow: 'hidden' }}>
            <div
              style={{
                width: coveredCount * 10 + '%',
                height: '100%',
                background: AKR.green,
                transition: 'width .3s',
              }}
            />
          </div>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', minHeight: 0, paddingBottom: 8 }}>
          {navItem(
            filterOlcut === 'all',
            { text: 'Tüm Kanıtlar', onClick: () => setFilterOlcut('all') },
            totalCount,
            false
          )}
          <div
            style={{
              padding: '10px 14px 4px',
              fontSize: 10.5,
              fontWeight: 700,
              letterSpacing: '.05em',
              color: AKR.textMuted,
            }}
          >
            ÖLÇÜTLER
          </div>
          {criteria.map((c) =>
            navItem(
              filterOlcut === c.no,
              {
                text: c.no + '. ' + c.title,
                title: c.title,
                onClick: () => setFilterOlcut(c.no),
              },
              perOlcutCount[c.no] || 0,
              !!perOlcutCount[c.no]
            )
          )}
          {navItem(
            filterOlcut === 0,
            { text: 'Genel / Etiketsiz', onClick: () => setFilterOlcut(0) },
            perOlcutCount[0] || 0,
            false
          )}
        </div>
        <div style={{ borderTop: '1px solid ' + AKR.border, padding: 10 }}>
          <select
            value={progDept}
            onChange={(e) => setProgDept(e.target.value)}
            style={{ ...selectStyle, marginTop: 0, fontSize: 12 }}
          >
            <option value="__all">Tüm programlar</option>
            <option value="">Fakülte geneli</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ── ORTA: Kanıt düzenleme ── */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          minHeight: 0,
          borderRight: '1px solid ' + AKR.border,
        }}
      >
        <div
          style={{
            padding: '14px 18px',
            borderBottom: '1px solid ' + AKR.border,
            background: AKR.bg,
          }}
        >
          <div style={{ fontSize: 15, fontWeight: 800, color: AKR.navy }}>{selTitle}</div>
          <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() =>
                setEditor({
                  mode: 'new',
                })
              }
              style={{
                padding: '8px 14px',
                borderRadius: 8,
                border: 'none',
                background: AKR.navy,
                color: 'white',
                fontSize: 12.5,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              + Kanıt Ekle
            </button>
            <div style={{ position: 'relative' }}>
              <button
                type="button"
                onClick={() => setPresetMenu((v) => !v)}
                title="MÜDEK ÖDR'nin standart tablolarını hazır ekler"
                style={{
                  padding: '8px 12px',
                  borderRadius: 8,
                  border: '1px solid ' + AKR.border,
                  background: 'white',
                  color: AKR.navy,
                  fontSize: 12.5,
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
                      maxHeight: 320,
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
                          {ps.systemTableKey ? ' · sistemden' : ''}
                        </span>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              style={{
                ...selectStyle,
                width: 'auto',
                marginTop: 0,
                fontSize: 12,
                padding: '7px 10px',
              }}
            >
              <option value="all">Tüm türler</option>
              {HAVUZ_TYPES.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.icon} {t.label}
                </option>
              ))}
            </select>
            {(() => {
              const critSel = typeof filterOlcut === 'number' && filterOlcut >= 1;
              const enabled = aiStatus.configured && critSel && !(aiDraft && aiDraft.loading);
              const tip = !aiStatus.configured
                ? 'AI yapılandırılmamış — sunucu .env dosyasına bir sağlayıcı anahtarı eklenmeli'
                : !critSel
                  ? 'Önce soldan bir ölçüt (1–10) seçin; AI o ölçütün kanıtlarından taslak yazar'
                  : 'Bu ölçütün kanıtlarından AI ile ÖDR taslak metni yaz (düzenleyip onaylarsınız)';
              return (
                <button
                  type="button"
                  onClick={() => critSel && requestAiDraft(filterOlcut)}
                  disabled={!enabled}
                  title={tip}
                  style={{
                    padding: '8px 12px',
                    borderRadius: 8,
                    border: '1px solid ' + (enabled ? '#7C3AED' : AKR.border),
                    background: enabled ? '#F5F3FF' : '#F3F4F6',
                    color: enabled ? '#6D28D9' : AKR.textMuted,
                    fontSize: 12.5,
                    fontWeight: 700,
                    cursor: enabled ? 'pointer' : 'not-allowed',
                  }}
                >
                  ✨ AI Taslak{aiDraft && aiDraft.loading ? ' …' : ''}
                </button>
              );
            })()}
            {msg && (
              <span
                style={{ fontSize: 12, color: AKR.green, fontWeight: 600, alignSelf: 'center' }}
              >
                {msg}
              </span>
            )}
          </div>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', minHeight: 0, padding: 16 }}>
          {visible.length === 0 ? (
            <div
              style={{
                border: '1px dashed ' + AKR.border,
                borderRadius: 12,
                padding: 40,
                textAlign: 'center',
                color: AKR.textMuted,
              }}
            >
              <div style={{ fontSize: 28, marginBottom: 8 }}>🗂️</div>
              <div style={{ fontSize: 13.5, fontWeight: 600, color: AKR.navy, marginBottom: 4 }}>
                {totalCount === 0 ? 'Havuz boş' : 'Bu bölümde kanıt yok'}
              </div>
              <div style={{ fontSize: 12 }}>
                “+ Kanıt Ekle” ile metin, tablo, dosya, bağlantı veya sistem verisi ekleyin.
                <br />
                İpucu: ekran görüntüsünü ya da bir tabloyu <b>Ctrl+V</b> ile doğrudan
                yapıştırabilirsiniz.
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
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
        </div>
      </div>

      {/* ── SAĞ: ÖDR önizleme (öncelik: yüklediğin şablon) ── */}
      {(() => {
        const templateMode = tplPreview.status === 'ok';
        const busyPrev = tplPreview.status === 'loading' || tplPreview.status === 'refreshing';
        const headerLabel = templateMode
          ? tplPreview.filled
            ? 'ŞABLONDAN · kanıtlarla dolu'
            : 'ŞABLONDAN · ham (eşleme gerekli)'
          : 'JENERİK ÖNİZLEME';
        const downloadWord = () => (templateMode ? downloadWordChosen() : generateNativeODR());
        const doPrint = () =>
          templateMode && tplPreview.blob
            ? printDocxBlob(tplPreview.blob, livePreview.filename)
            : printHTML(livePreview.bodyHTML, livePreview.filename);
        const doFullscreen = () =>
          templateMode && tplPreview.blob
            ? setPreview({ blob: tplPreview.blob, filename: livePreview.filename })
            : openPreview();
        return (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              minHeight: 0,
              background: '#525659',
            }}
          >
            <div
              style={{
                padding: '10px 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 8,
                flexShrink: 0,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                {tplList.length > 0 && (
                  <select
                    value={tplChoiceId}
                    onChange={(e) => setTplChoiceId(e.target.value)}
                    title="Önizlenecek ÖDR şablonu"
                    style={{
                      maxWidth: 240,
                      padding: '5px 8px',
                      borderRadius: 7,
                      border: 'none',
                      background: 'rgba(255,255,255,0.9)',
                      color: '#1B2A4A',
                      fontSize: 11.5,
                      fontWeight: 600,
                      fontFamily: "'Inter', sans-serif",
                    }}
                  >
                    {tplList.map((t) => (
                      <option key={t._id} value={t._id}>
                        {t.name || t.file?.originalName || 'Şablon'}
                      </option>
                    ))}
                  </select>
                )}
                <span
                  style={{
                    fontSize: 10.5,
                    fontWeight: 700,
                    color: 'rgba(255,255,255,0.75)',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {headerLabel}
                  {busyPrev ? ' · güncelleniyor…' : ''}
                </span>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button type="button" onClick={doPrint} title="PDF olarak yazdır" style={rpBtn}>
                  🖨️ PDF
                </button>
                <button
                  type="button"
                  onClick={downloadWord}
                  disabled={nativeBusy || genBusy}
                  title="Word (.docx) indir"
                  style={rpBtn}
                >
                  {nativeBusy || genBusy ? '…' : '⬇️ Word'}
                </button>
                <button
                  type="button"
                  onClick={doFullscreen}
                  title="Tam ekran önizleme"
                  style={rpBtn}
                >
                  ⛶
                </button>
              </div>
            </div>

            {/* Durum şeridi */}
            {tplPreview.status === 'none' && (
              <div style={prevBanner('#fef3c7', '#92400e')}>
                ÖDR şablonu atanmadı. Kendi ÖDR <b>.docx</b>'inizi Şablonlar → Akreditasyon/ÖDR
                türüne yükleyin. Şimdilik jenerik önizleme.
              </div>
            )}
            {tplPreview.status === 'error' && (
              <div style={prevBanner('#fee2e2', '#991b1b')}>
                Şablon önizlenemedi: {tplPreview.message}. Jenerik önizleme gösteriliyor.
              </div>
            )}
            {templateMode && tplPreview.note && (
              <div style={prevBanner('#fef3c7', '#92400e')}>{tplPreview.note}</div>
            )}

            <div
              style={{
                flex: 1,
                overflowY: 'auto',
                overflowX: 'hidden',
                minHeight: 0,
                padding: '12px 16px 24px',
              }}
            >
              {templateMode ? (
                <div ref={panelRef} style={{ minHeight: 0 }} />
              ) : busyPrev ? (
                <div style={{ color: 'rgba(255,255,255,0.7)', textAlign: 'center', padding: 40 }}>
                  Şablon önizlemesi hazırlanıyor…
                </div>
              ) : (
                <div
                  style={{
                    background: 'white',
                    padding: '40px 44px',
                    boxShadow: '0 6px 20px rgba(0,0,0,0.3)',
                    color: '#0f172a',
                    fontSize: 12.5,
                    lineHeight: 1.5,
                    borderRadius: 2,
                  }}
                  dangerouslySetInnerHTML={{ __html: livePreview.bodyHTML }}
                />
              )}
            </div>
          </div>
        );
      })()}

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

      {preview && (
        <ODRPreview
          bodyHTML={preview.bodyHTML}
          blob={preview.blob}
          filename={preview.filename}
          onDownloadDocx={() => (preview.blob ? downloadWordChosen() : generateNativeODR())}
          onClose={() => setPreview(null)}
        />
      )}

      {aiDraft && (
        <AiDraftModal
          draft={aiDraft}
          criteria={criteria}
          onSave={saveAiDraftAsEvidence}
          onRetry={() => requestAiDraft(aiDraft.criterionNo)}
          onClose={() => setAiDraft(null)}
        />
      )}
    </div>
  );
}

// Sağ (önizleme) panel araç çubuğu butonları
const rpBtn = {
  padding: '5px 10px',
  borderRadius: 7,
  border: 'none',
  background: 'rgba(255,255,255,0.9)',
  color: '#1B2A4A',
  fontSize: 11.5,
  fontWeight: 700,
  cursor: 'pointer',
};
const prevBanner = (bg, color) => ({
  margin: '0 16px 8px',
  padding: '8px 12px',
  borderRadius: 8,
  background: bg,
  color,
  fontSize: 11.5,
  lineHeight: 1.5,
  flexShrink: 0,
});

window.AkreditasyonApp = AkreditasyonApp;
