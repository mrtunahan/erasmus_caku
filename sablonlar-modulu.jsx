// ══════════════════════════════════════════════════════════════
// ÇAKÜ — Şablonlar Modülü
//   Bölüm yetkilisi: yalnızca kendi bölüm şablonları
//   Fakülte yetkilisi: fakültesindeki bölüm + fakülte-geneli
//   Üni yetkilisi: tüm şablonlar (+ üniversite-geneli ekleyebilir)
// ══════════════════════════════════════════════════════════════

const { useState, useEffect, useCallback, useMemo } = React;

const SB_Modal = window.Modal;
const SB_Input = window.Input;
const SB_FormField = window.FormField;
const SB_Btn = window.Btn;

const SB_MODULES = [
  { id: 'erasmus', label: 'Erasmus', color: '#3B82F6' },
  { id: 'muafiyet', label: 'Ders Muafiyet', color: '#10B981' },
  { id: 'capyandal', label: 'ÇAP / Yandal', color: '#6D28D9' },
  { id: 'yataygecis', label: 'Yatay Geçiş', color: '#B45309' },
  { id: 'staj', label: 'Staj', color: '#0EA5E9' },
  { id: 'sinav', label: 'Sınav Otomasyonu', color: '#DC2626' },
  { id: 'dersprogrami', label: 'Ders Programı', color: '#F59E0B' },
  { id: 'projeler', label: 'Proje Performans', color: '#8B5CF6' },
  { id: 'formlar', label: 'Formlar', color: '#64748B' },
  { id: 'performans', label: 'Performans', color: '#0D9488' },
  { id: 'akreditasyon', label: 'Akreditasyon', color: '#0F766E' },
  { id: 'anket', label: 'Anketler', color: '#06B6D4' },
];
// ══════════════════════════════════════════════════════════════
// GÖRÜNÜM BELİRTECLERİ
//
// Modül boyunca aynı gri, aynı kenarlık, aynı köşe yarıçapı onlarca yerde
// elle yazılıydı (~90 renk kodu, 76 satır içi stil nesnesi). Bir rengi
// değiştirmek dosyayı taramak demekti ve aynı işi gören iki öğe farklı
// tonlarda kalıyordu. Diğer modüllerdeki (YG, ANK, DS) düzenle aynı: renk ve
// ölçü TEK yerde tanımlanır, bileşenler buradan okur.
// ══════════════════════════════════════════════════════════════
// Uygulamanın paleti (design-tokens.json → window.C). Modül kendi gri ve
// vurgu tonlarını uyduruyordu; sonuç, aynı işi gören öğelerin ekranda farklı
// renklerde durmasıydı. Palet burada TÜRETİLİR, tanımlanmaz.
const SBC = (typeof window !== 'undefined' && window.C) || {};
const SB = {
  navy: SBC.navy || '#1B2A4A',
  metin: SBC.text || '#1F2937',
  soluk: SBC.textMuted || '#64748B',
  soluk2: '#94A3B8',
  koyu: '#334155',
  kenar: SBC.border || '#E5E7EB',
  kenarGiris: '#D1D5DB',
  yuzey: SBC.card || '#FFFFFF',
  yuzey2: '#FAFAFA',
  cipZemin: '#F1F5F9',
  cipMetin: '#475569',
  vurgu: SBC.gold || '#C4973B',
  birincil: '#0891B2',
  birincilSolgun: '#ECFEFF',
  basari: SBC.green || '#059669',
  uyari: '#D97706',
  uyariSolgun: '#FEF3C7',
  tehlike: '#DC2626',
  tehlikeSolgun: '#FEE2E2',
  yaricap: 10,
  yaricapKucuk: 8,
};
SB.baslik = SB.navy;

// Durum bildirimi renkleri — tek sözlük, üç durum.
const SB_MESAJ = {
  error: { bg: SB.tehlikeSolgun, fg: '#991B1B', bd: '#FECACA' },
  ok: { bg: '#D1FAE5', fg: '#065F46', bd: '#A7F3D0' },
  info: { bg: '#DBEAFE', fg: '#1E40AF', bd: '#BFDBFE' },
};

// ── EYLEM BİÇİMLERİ: ÜÇ TON, DAHA FAZLASI DEĞİL ──
// Kart üzerindeki altı düğme altı ayrı renkteydi (turkuaz, yeşil, amber,
// mavi, mor, kırmızı). Hepsi aynı ağırlıkta bağırınca hiçbiri öne çıkmıyor,
// kart da alacalı görünüyordu. Hiyerarşi üç tonla kurulur:
//   birincil → o kartta yapılması gereken iş (alan eşleme)
//   sessiz   → sıradan eylemler; ekranda gürültü yapmaz
//   tehlike  → geri alınamayan eylem
const SB_BICIM = {
  birincil: { fg: SB.birincil, bg: SB.birincilSolgun, bd: '#A5F0FA' },
  sessiz: { fg: SB.koyu, bg: SB.yuzey, bd: SB.kenarGiris },
  tehlike: { fg: SB.tehlike, bg: SB.yuzey, bd: '#FCA5A5' },
  // Etkin (basılı) durum: aynı sessiz düğme, vurgu rengiyle işaretli.
  etkin: { fg: SB.vurgu, bg: '#FBF6EC', bd: '#E8D5A8' },
};

// Eşleme durumu şeridi.
const SB_ESLEME = {
  var: { bg: SB.birincilSolgun, fg: '#0E7490', bd: '#A5F0FA' },
  yok: { bg: SB.uyariSolgun, fg: '#92400E', bd: '#FDE68A' },
};

// ══════════════════════════════════════════════════════════════
// İKONLAR
//
// Emoji kullanılıyordu (📄 🧩 ⚠️ ✏️ ⬇ ★ ✓ ✕). Emoji her işletim sisteminde
// başka çizilir, boyu satır yüksekliğini bozar, rengi metne uymaz ve kurumsal
// bir ekranda oyuncak gibi durur. Yerine tek çizgi kalınlığında SVG: rengini
// `currentColor` ile düğmeden alır, ölçüsü sabittir.
// ══════════════════════════════════════════════════════════════
const SB_IKON_YOLU = {
  dosya: 'M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z M14 2v6h6',
  esleme: 'M4 7h7v10H4z M13 10h7 M13 14h7',
  uyari:
    'M12 9v4 M12 17h.01 M10.3 3.9L1.8 18a2 2 0 001.7 3h17a2 2 0 001.7-3L14.7 3.9a2 2 0 00-3.4 0z',
  duzenle: 'M12 20h9 M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z',
  indir: 'M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4 M7 10l5 5 5-5 M12 15V3',
  yildiz: 'M12 2l3.1 6.3 6.9 1-5 4.9 1.2 6.9L12 17.8 5.8 21l1.2-6.9-5-4.9 6.9-1z',
  onay: 'M20 6L9 17l-5-5',
  daire: 'M12 3a9 9 0 100 18 9 9 0 000-18z',
  sil: 'M3 6h18 M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2 M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6',
  ekle: 'M12 5v14 M5 12h14',
};

function SbIkon({ ad, boyut = 15, dolgu = false }) {
  const yol = SB_IKON_YOLU[ad];
  if (!yol) return null;
  return (
    <svg
      width={boyut}
      height={boyut}
      viewBox="0 0 24 24"
      fill={dolgu ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ flexShrink: 0 }}
      aria-hidden="true"
    >
      {yol.split(' M').map((d, i) => (
        <path key={i} d={i === 0 ? d : 'M' + d} />
      ))}
    </svg>
  );
}

const sbKart = {
  background: SB.yuzey,
  border: '1px solid ' + SB.kenar,
  borderRadius: SB.yaricap,
  padding: 16,
};

const sbGiris = {
  padding: '8px 12px',
  border: '1px solid ' + SB.kenarGiris,
  borderRadius: SB.yaricapKucuk,
  fontSize: 13,
  fontFamily: 'inherit',
};

/** Yuvarlak rozet — modül etiketi, kapsam, durum. */
function sbRozet(zemin, yazi, kalin = 700) {
  return {
    fontSize: 10.5,
    fontWeight: kalin,
    padding: '2px 9px',
    borderRadius: 999,
    background: zemin,
    color: yazi,
  };
}

// Bir modülün belge türleri (shared TEMPLATE_VARS'tan)
function docTypesOf(moduleId) {
  return typeof window !== 'undefined' && window.templateDocTypes
    ? window.templateDocTypes(moduleId)
    : [{ id: 'default', label: 'Belge' }];
}
function docTypeLabel(moduleId, docType) {
  const dt = docTypesOf(moduleId).find((d) => d.id === (docType || 'default'));
  return dt ? dt.label : docType || 'Belge';
}
const SB_SCOPE_LABEL = {
  university: 'Üniversite Geneli',
  faculty: 'Fakülte Geneli',
  department: 'Bölüm',
};
const SB_ALLOWED_EXT = ['.docx', '.doc', '.pdf', '.xlsx', '.xls'];

// Yer tutucu eşlemesi yapılabilen biçimler. .docx (Word) ve .xlsx (Excel)
// içinde {{alan}} yer tutucuları okunabildiği için ikisi de eşlenebilir.
const SB_ESLENEBILIR_EXT = ['docx', 'xlsx'];
const sbEslenebilir = (file) =>
  !!file && SB_ESLENEBILIR_EXT.indexOf(String(file.extension || '').toLowerCase()) >= 0;

function fmtBytes(b) {
  if (!b) return '—';
  if (b < 1024) return b + ' B';
  if (b < 1024 * 1024) return Math.round(b / 1024) + ' KB';
  return (b / 1024 / 1024).toFixed(2) + ' MB';
}
function fmtDate(d) {
  try {
    return new Date(d).toLocaleDateString('tr-TR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch (_) {
    return '';
  }
}
function moduleMeta(id) {
  return SB_MODULES.find((m) => m.id === id) || { id, label: id, color: SB.soluk };
}

function SablonlarApp({ currentUser, activeDepartment, departmentInfo }) {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  // Belirli bir yükleme alanından açılan "yeni şablon" penceresi
  const [addBaslangic, setAddBaslangic] = useState(null);
  const [editTpl, setEditTpl] = useState(null); // düzenlenen şablon (meta/dosya)
  const [mapping, setMapping] = useState(null); // { tpl, file? } — alan eşleme sihirbazı
  const [filter, setFilter] = useState({ module: 'all', search: '' });
  const [msg, setMsg] = useState({ text: '', kind: '' });

  const isUniAdmin = !!currentUser?.isUniversityAdmin;
  const isFacMgr = !isUniAdmin && !!currentUser?.isFacultyManager;
  const isDeptMgr =
    !isUniAdmin &&
    !isFacMgr &&
    (currentUser?.role === 'bolum_yetkilisi' || !!currentUser?.isDeptManager);
  const canManage = isUniAdmin || isFacMgr || isDeptMgr;

  const showMsg = (text, kind = 'info') => {
    setMsg({ text, kind });
    setTimeout(() => setMsg({ text: '', kind: '' }), 3500);
  };

  const headers = useCallback(() => {
    const t = localStorage.getItem('caku_auth_token');
    return t ? { Authorization: 'Bearer ' + t } : {};
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch('/api/templates', { headers: headers() });
      const d = await r.json();
      setTemplates(Array.isArray(d) ? d : []);
    } catch (e) {
      showMsg('Şablonlar yüklenemedi: ' + e.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [headers]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = (filter.search || '').toLocaleLowerCase('tr');
    return templates.filter((t) => {
      if (filter.module !== 'all' && t.module !== filter.module) return false;
      if (!q) return true;
      return (
        (t.name || '').toLocaleLowerCase('tr').indexOf(q) >= 0 ||
        (t.description || '').toLocaleLowerCase('tr').indexOf(q) >= 0
      );
    });
  }, [templates, filter]);

  const handleDelete = async (tpl) => {
    if (!confirm('"' + tpl.name + '" şablonu silinsin mi?')) return;
    try {
      // POST takma rotası — bazı nginx yapılandırmaları DELETE'e 405 döner
      const r = await fetch('/api/templates/' + tpl._id + '/delete', {
        method: 'POST',
        headers: headers(),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || 'Silinemedi');
      showMsg('Şablon silindi.', 'ok');
      load();
    } catch (e) {
      showMsg('Silinemedi: ' + e.message, 'error');
    }
  };

  const handleToggle = async (tpl, field) => {
    try {
      // POST takma rotası — bazı nginx yapılandırmaları PATCH'e 405 döner
      const r = await fetch('/api/templates/' + tpl._id + '/update', {
        method: 'POST',
        headers: { ...headers(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: !tpl[field] }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || 'Güncellenemedi');
      showMsg(
        field === 'isDefault'
          ? tpl.isDefault
            ? 'Varsayılan kaldırıldı.'
            : 'Varsayılan olarak işaretlendi.'
          : tpl.isActive
            ? 'Pasifleştirildi.'
            : 'Aktifleştirildi.',
        'ok'
      );
      load();
    } catch (e) {
      showMsg('Güncellenemedi: ' + e.message, 'error');
    }
  };

  if (!canManage) {
    return (
      <div style={{ padding: 40, textAlign: 'center', fontFamily: "'Inter', sans-serif" }}>
        <h2 style={{ color: '#DC2626', fontSize: 20, marginBottom: 8 }}>Erişim Reddedildi</h2>
        <p style={{ color: SB.soluk }}>
          Şablonlar modülüne yalnızca bölüm/fakülte/üniversite yetkilileri erişebilir.
        </p>
      </div>
    );
  }

  const scopeHint = isUniAdmin
    ? 'Tüm şablonları yönetebilirsiniz.'
    : isFacMgr
      ? 'Fakültenizdeki bölümlerin ve fakülte geneli şablonları yönetirsiniz.'
      : 'Yalnızca kendi bölümünüzün şablonlarını yönetirsiniz.';

  return (
    <div
      style={{
        fontFamily: "'Inter', sans-serif",
        color: SB.metin,
        maxWidth: 1400,
        margin: '0 auto',
        padding: '0 4px 40px',
      }}
    >
      {/* Başlık */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 14,
          gap: 12,
          flexWrap: 'wrap',
        }}
      >
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0, color: SB.baslik }}>Şablonlar</h2>
          <p style={{ fontSize: 13, color: SB.soluk, margin: '4px 0 0' }}>{scopeHint}</p>
        </div>
        <SB_Btn onClick={() => setShowAdd(true)}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <SbIkon ad="ekle" boyut={14} />
            Yeni Şablon Ekle
          </span>
        </SB_Btn>
      </div>

      {/* Mesaj */}
      {msg.text && <DurumMesaji text={msg.text} kind={msg.kind} />}

      {/* ── DERS PROGRAMI YÜKLEME ALANLARI ──
          Ders programı modülünün DÖRT çıktısı var ve her biri ayrı bir belge:
          bölüm/fakülte × Excel/PDF. Bir belge türüne tek dosya bağlanabildiği
          için dördü ayrı ayrı yüklenir. Aşağıdaki dört alan hangisinin yüklü
          hangisinin boş olduğunu tek bakışta gösterir — türü açılır listeden
          aramak gerekmiyor. */}
      <DersProgramiYuklemeAlanlari
        templates={templates}
        onYukle={(slot) => setAddBaslangic(slot)}
        onDuzenle={(tpl) => setEditTpl(tpl)}
      />

      <SablonSuzgeci filter={filter} onChange={setFilter} sayi={filtered.length} />

      {/* Liste */}
      {loading ? (
        <p style={{ padding: 24, textAlign: 'center', color: SB.soluk }}>Yükleniyor…</p>
      ) : filtered.length === 0 ? (
        <div
          style={{
            ...sbKart,
            border: '1px dashed ' + SB.kenarGiris,
            padding: '40px 24px',
            textAlign: 'center',
            color: SB.soluk,
          }}
        >
          Henüz bir şablon eklenmedi. Yukarıdaki butonla başlayın.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {filtered.map((t) => (
            <SablonKarti
              key={t._id}
              tpl={t}
              onEsle={() => setMapping({ tpl: t, file: null })}
              onDuzenle={() => setEditTpl(t)}
              onDegistir={(alan) => handleToggle(t, alan)}
              onSil={() => handleDelete(t)}
            />
          ))}
        </div>
      )}

      {(showAdd || addBaslangic) && (
        <AddTemplateModal
          baslangic={addBaslangic}
          onClose={() => {
            setShowAdd(false);
            setAddBaslangic(null);
          }}
          onSaved={(tpl, file) => {
            setShowAdd(false);
            setAddBaslangic(null);
            load();
            // .docx / .xlsx ise yer tutucu eşleme sihirbazını otomatik aç
            if (tpl && sbEslenebilir(tpl.file)) {
              showMsg('Şablon eklendi — şimdi anahtar alanları eşleyin.', 'ok');
              setMapping({ tpl, file });
            } else {
              showMsg('Şablon eklendi.', 'ok');
            }
          }}
          currentUser={currentUser}
          activeDepartment={activeDepartment}
          departmentInfo={departmentInfo}
          isUniAdmin={isUniAdmin}
          isFacMgr={isFacMgr}
          isDeptMgr={isDeptMgr}
        />
      )}

      {editTpl && (
        <AddTemplateModal
          editTemplate={editTpl}
          onClose={() => setEditTpl(null)}
          onSaved={(tpl, needsRemap) => {
            setEditTpl(null);
            load();
            if (needsRemap && tpl && sbEslenebilir(tpl.file)) {
              showMsg('Şablon güncellendi — eşleme sıfırlandı, yeniden eşleyin.', 'ok');
              setMapping({ tpl, file: null });
            } else {
              showMsg('Şablon güncellendi.', 'ok');
            }
          }}
          currentUser={currentUser}
          activeDepartment={activeDepartment}
          departmentInfo={departmentInfo}
          isUniAdmin={isUniAdmin}
          isFacMgr={isFacMgr}
          isDeptMgr={isDeptMgr}
        />
      )}

      {mapping && (
        <FieldMappingModal
          tpl={mapping.tpl}
          localFile={mapping.file}
          headers={headers}
          onClose={() => setMapping(null)}
          onSaved={() => {
            setMapping(null);
            showMsg('Alan eşlemesi kaydedildi.', 'ok');
            load();
          }}
        />
      )}
    </div>
  );
}

/** Kısa süreli durum bildirimi (hata / başarı / bilgi). */
function DurumMesaji({ text, kind }) {
  const c = SB_MESAJ[kind] || SB_MESAJ.info;
  return (
    <div
      style={{
        background: c.bg,
        color: c.fg,
        border: '1px solid ' + c.bd,
        padding: '8px 14px',
        borderRadius: SB.yaricapKucuk,
        fontSize: 13,
        marginBottom: 12,
      }}
    >
      {text}
    </div>
  );
}

/** Modüle göre daraltma + serbest arama. */
function SablonSuzgeci({ filter, onChange, sayi }) {
  return (
    <div
      style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12, flexWrap: 'wrap' }}
    >
      <select
        value={filter.module}
        onChange={(e) => onChange({ ...filter, module: e.target.value })}
        style={{ ...sbGiris, padding: '8px 10px', background: SB.yuzey, cursor: 'pointer' }}
      >
        <option value="all">Tüm Modüller</option>
        {SB_MODULES.map((m) => (
          <option key={m.id} value={m.id}>
            {m.label}
          </option>
        ))}
      </select>
      <input
        value={filter.search}
        onChange={(e) => onChange({ ...filter, search: e.target.value })}
        placeholder="Şablon ara..."
        style={{ ...sbGiris, flex: 1, minWidth: 180 }}
      />
      <div style={{ fontSize: 12, color: SB.soluk }}>{sayi} şablon</div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// TEK ŞABLON KARTI
//
// Ana bileşenin içinde 280 satırlık satır içi JSX olarak duruyordu; kartın
// neye benzediğini görmek için listeleme, süzgeç ve modal mantığının arasından
// geçmek gerekiyordu. Kart kendi başına bir şey: bir şablonun kimliği,
// dosyası, eşleme durumu ve üzerinde yapılabilecekler.
//
// Eylemler geri çağrı olarak alınır — kart neyin nasıl yapıldığını bilmez,
// yalnız hangi eylemin istendiğini bildirir.
// ══════════════════════════════════════════════════════════════
function SablonKarti({ tpl, onEsle, onDuzenle, onDegistir, onSil }) {
  const m = moduleMeta(tpl.module);
  const eslenebilir = sbEslenebilir(tpl.file);
  const eslenenSayisi = (tpl.fields || []).filter((f) => f.variable).length;
  const esleme = eslenenSayisi > 0 ? SB_ESLEME.var : SB_ESLEME.yok;

  return (
    <div
      style={{
        ...sbKart,
        borderLeft: '4px solid ' + m.color,
        opacity: tpl.isActive ? 1 : 0.72,
      }}
    >
      {/* Üst satır: başlık + rozetler */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 15.5, fontWeight: 700, color: SB.baslik }}>{tpl.name}</span>
        <span style={sbRozet(m.color + '18', m.color)}>{m.label}</span>
        {/* Belge türü rozeti yalnız çok türlü modüllerde anlamlı. */}
        {docTypesOf(tpl.module).length > 1 && (
          <span style={sbRozet('#EEF2FF', '#4338CA')}>{docTypeLabel(tpl.module, tpl.docType)}</span>
        )}
        <span style={sbRozet(SB.cipZemin, SB.cipMetin, 600)}>
          {SB_SCOPE_LABEL[tpl.scope] || tpl.scope}
        </span>
        {tpl.isDefault && (
          <span style={{ ...sbRozet('#FBF6EC', '#8A6A29'), display: 'inline-flex', gap: 4 }}>
            <SbIkon ad="yildiz" boyut={11} dolgu />
            VARSAYILAN
          </span>
        )}
        {!tpl.isActive && <span style={sbRozet(SB.kenar, SB.koyu)}>PASİF</span>}
      </div>

      {tpl.description && (
        <div style={{ fontSize: 12.5, color: SB.soluk, marginTop: 5 }}>{tpl.description}</div>
      )}

      {/* Dosya + meta satırı */}
      <div
        style={{
          fontSize: 12,
          color: SB.soluk,
          marginTop: 8,
          display: 'flex',
          gap: 8,
          alignItems: 'center',
          flexWrap: 'wrap',
        }}
      >
        {tpl.file && (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              background: SB.yuzey2,
              border: '1px solid ' + SB.kenar,
              borderRadius: 7,
              padding: '4px 10px',
              maxWidth: '100%',
            }}
          >
            <SbIkon ad="dosya" boyut={14} />
            <span
              style={{
                maxWidth: 340,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                fontWeight: 600,
                color: SB.koyu,
              }}
              title={tpl.file.originalName}
            >
              {tpl.file.originalName}
            </span>
            <span style={{ color: SB.soluk2 }}>
              {(tpl.file.extension || '').toUpperCase()} · {fmtBytes(tpl.file.size)}
            </span>
          </span>
        )}
        <span style={{ color: SB.soluk2 }}>
          {fmtDate(tpl.createdAt)}
          {tpl.createdByName ? ' · ' + tpl.createdByName : ''}
        </span>
      </div>

      {/* Eşleme durum şeridi — yalnız doldurulabilir dosyalarda (.docx/.xlsx).
          Eşleme yoksa şablon yüklü olsa bile çıktı üretilemez; bu yüzden
          kartın üzerinde duruyor, aksiyonların arasında kaybolmuyor. */}
      {eslenebilir && (
        <div
          style={{
            marginTop: 10,
            padding: '8px 12px',
            borderRadius: SB.yaricapKucuk,
            fontSize: 12,
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            background: esleme.bg,
            color: esleme.fg,
            border: '1px solid ' + esleme.bd,
          }}
        >
          <SbIkon ad={eslenenSayisi > 0 ? 'esleme' : 'uyari'} boyut={14} />
          <span>
            {eslenenSayisi > 0
              ? eslenenSayisi + ' anahtar alan eşlendi — belge üretimine hazır'
              : 'Anahtar alanlar henüz eşlenmedi. Çıktı üretmek için eşleme gerekli.'}
          </span>
        </div>
      )}

      {/* Aksiyonlar */}
      <div
        style={{
          marginTop: 12,
          display: 'flex',
          gap: 8,
          flexWrap: 'wrap',
          justifyContent: 'flex-end',
        }}
      >
        {eslenebilir && (
          // Eşleme yapılmamışsa o kartta yapılması gereken iş budur; birincil
          // biçimle öne çıkar. Yapılmışsa sıradan bir düzenleme eylemidir.
          <button onClick={onEsle} style={textBtn(eslenenSayisi > 0 ? 'sessiz' : 'birincil')}>
            <SbIkon ad="esleme" />
            {eslenenSayisi > 0 ? 'Eşlemeyi Düzenle' : 'Alanları Eşle'}
          </button>
        )}
        <button onClick={onDuzenle} style={textBtn('sessiz')}>
          <SbIkon ad="duzenle" />
          Düzenle
        </button>
        <a
          href={'/api/templates/' + tpl._id + '/download'}
          style={{ ...textBtn('sessiz'), textDecoration: 'none' }}
        >
          <SbIkon ad="indir" />
          İndir
        </a>
        <button
          onClick={() => onDegistir('isDefault')}
          style={textBtn(tpl.isDefault ? 'etkin' : 'sessiz')}
        >
          <SbIkon ad="yildiz" dolgu={!!tpl.isDefault} />
          {tpl.isDefault ? 'Varsayılanı Kaldır' : 'Varsayılan Yap'}
        </button>
        <button
          onClick={() => onDegistir('isActive')}
          style={textBtn(tpl.isActive ? 'etkin' : 'sessiz')}
        >
          <SbIkon ad={tpl.isActive ? 'onay' : 'daire'} />
          {tpl.isActive ? 'Aktif' : 'Pasif'}
        </button>
        <button onClick={onSil} style={textBtn('tehlike')}>
          <SbIkon ad="sil" />
          Sil
        </button>
      </div>
    </div>
  );
}

// Metin etiketli aksiyon butonu (kart alt satırı)
/**
 * Kart eylem düğmesi. Renk çifti değil, ANLAM alır (SB_BICIM anahtarı):
 * birincil | sessiz | tehlike | etkin. Çağrı yerinde çıplak renk durmaz ve
 * hiyerarşi tek yerden değişir.
 */
function textBtn(bicim) {
  const c = SB_BICIM[bicim] || SB_BICIM.sessiz;
  return {
    padding: '7px 12px',
    borderRadius: SB.yaricapKucuk,
    border: '1px solid ' + c.bd,
    background: c.bg,
    color: c.fg,
    cursor: 'pointer',
    fontSize: 12.5,
    fontWeight: 600,
    fontFamily: "'Inter', sans-serif",
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    lineHeight: 1,
    whiteSpace: 'nowrap',
  };
}

// ══════════════════════════════════════════════════════════════
// DERS PROGRAMI — DÖRT YÜKLEME ALANI
//
// Ders programı modülü dört belge üretir: bölüm ve fakülte programının
// Excel ve yazdırma (PDF) hâlleri. Bunlar AYRI belge türleridir çünkü bir
// belge türüne tek dosya bağlanabilir, oysa Excel çıktısı .xlsx şablonundan,
// yazdırma çıktısı Word şablonundan doldurulur.
//
// Hiçbiri zorunlu değildir: yüklenmeyen tür için modül kendi yerleşik
// çıktısını üretir. Bu panel hangisinin yüklü olduğunu tek bakışta gösterir.
// ══════════════════════════════════════════════════════════════
const DP_SABLON_ALANLARI = [
  {
    docType: 'bolum-xlsx',
    baslik: 'Bölüm Programı — Excel',
    uzanti: '.xlsx',
    ipucu: 'Bölümün ders kodları, derslik sütunlu ızgaraya yazılır',
  },
  {
    docType: 'bolum-pdf',
    baslik: 'Bölüm Programı — Yazdırma / PDF',
    uzanti: '.docx',
    ipucu: 'Yazdırılan/asılan bölüm programı',
  },
  {
    docType: 'fakulte-xlsx',
    baslik: 'Fakülte Programı — Excel',
    uzanti: '.xlsx',
    ipucu: 'Tüm bölümlerin ders kodları tek ızgarada, bölüm renkleriyle',
  },
  {
    docType: 'fakulte-pdf',
    baslik: 'Fakülte Programı — Yazdırma / PDF',
    uzanti: '.docx',
    ipucu: 'Yazdırılan/asılan fakülte birleşik programı',
  },
];

// Kapsam önceliği: EN ÖZEL kazanır. Sunucudaki çözüm (`/api/templates/resolve`)
// bölüm → fakülte → üniversite sırasıyla arar ve ilk bulduğunu kullanır.
const SB_KAPSAM_ONCELIK = { department: 0, faculty: 1, university: 2 };

/**
 * Bir belge türü için GERÇEKTEN kullanılacak şablon.
 *
 * Bu panel eskiden listeden gelen İLK kaydı alıyordu; liste ise güncellenme
 * tarihine göre sıralı. Bölümün kendi şablonu varken üniversite şablonu daha
 * yeni güncellenmişse panel onu "yüklü" gösteriyor, modül ise bölümünkini
 * kullanıyordu — gösterilen ile kullanılan farklı olabiliyordu.
 * Sıralama artık sunucudaki çözümle aynı: önce kapsam özgüllüğü, sonra
 * varsayılan işareti, sonra güncellik.
 */
function sbEtkinSablon(adaylar) {
  return (adaylar || []).slice().sort((a, b) => {
    const ka = SB_KAPSAM_ONCELIK[a.scope] ?? 9;
    const kb = SB_KAPSAM_ONCELIK[b.scope] ?? 9;
    if (ka !== kb) return ka - kb;
    if (!!b.isDefault !== !!a.isDefault) return b.isDefault ? 1 : -1;
    return new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0);
  })[0];
}

function DersProgramiYuklemeAlanlari({ templates, onYukle, onDuzenle }) {
  const adaylar = {};
  (templates || []).forEach((t) => {
    if (t && t.module === 'dersprogrami' && t.isActive !== false) {
      const d = t.docType || 'default';
      (adaylar[d] = adaylar[d] || []).push(t);
    }
  });
  const yuklu = {};
  Object.keys(adaylar).forEach((d) => (yuklu[d] = sbEtkinSablon(adaylar[d])));
  const renk = moduleMeta('dersprogrami').color;

  return (
    <div
      style={{
        background: 'white',
        border: '1px solid #E5E7EB',
        borderLeft: '4px solid ' + renk,
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 15, fontWeight: 700, color: SB.baslik }}>
          Ders Programı Şablonları
        </span>
        <span style={{ fontSize: 12, color: SB.soluk }}>
          Dört çıktı, dört ayrı dosya — hiçbiri zorunlu değil
        </span>
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: 10,
          marginTop: 12,
        }}
      >
        {DP_SABLON_ALANLARI.map((alan) => {
          const tpl = yuklu[alan.docType];
          return (
            <div
              key={alan.docType}
              style={{
                // Dolu yuva ile boş yuva ARASINDAKİ fark bir kenarlık kadar;
                // modül renginin geniş yıkaması paneli alacalı gösteriyordu.
                border: '1px solid ' + (tpl ? SB.kenarGiris : SB.kenar),
                background: tpl ? SB.yuzey : SB.yuzey2,
                borderRadius: SB.yaricap,
                padding: 12,
                display: 'flex',
                flexDirection: 'column',
                gap: 6,
              }}
            >
              <div style={{ fontSize: 13, fontWeight: 700, color: SB.baslik }}>{alan.baslik}</div>
              <div style={{ fontSize: 11, color: SB.soluk, lineHeight: 1.4 }}>{alan.ipucu}</div>
              {tpl ? (
                <>
                  <div
                    style={{
                      fontSize: 11.5,
                      color: SB.basari,
                      fontWeight: 600,
                      wordBreak: 'break-word',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 5,
                      flexWrap: 'wrap',
                    }}
                  >
                    <SbIkon ad="onay" boyut={13} />
                    {tpl.name}
                    {/* Şablon bu bölüme ait olmayabilir: fakülte ya da üniversite
                        düzeyinde yüklenmiş bir şablon da buraya düşer. Kapsamı
                        yazmazsak "bu bölüme yüklenmiş" sanılıyor ve fakülte
                        şablonunu bölümde ayrıca yüklemeye çalışılıyor. */}
                    {tpl.scope && tpl.scope !== 'department' ? (
                      <span
                        style={{
                          ...sbRozet(SB.cipZemin, SB.cipMetin, 600),
                          marginLeft: 6,
                          display: 'inline-block',
                        }}
                      >
                        {SB_SCOPE_LABEL[tpl.scope] || tpl.scope}
                      </span>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    onClick={() => onDuzenle(tpl)}
                    style={{ ...textBtn('sessiz'), marginTop: 2, alignSelf: 'flex-start' }}
                  >
                    <SbIkon ad="duzenle" boyut={13} />
                    Değiştir / Düzenle
                  </button>
                </>
              ) : (
                <>
                  <div style={{ fontSize: 11.5, color: SB.soluk2, fontWeight: 600 }}>
                    Yüklenmedi — yerleşik çıktı kullanılıyor
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      onYukle({
                        module: 'dersprogrami',
                        docType: alan.docType,
                        ad: alan.baslik,
                      })
                    }
                    style={{ ...textBtn('birincil'), marginTop: 2, alignSelf: 'flex-start' }}
                  >
                    <SbIkon ad="ekle" boyut={13} />
                    {alan.uzanti} yükle
                  </button>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function AddTemplateModal(props) {
  const {
    onClose,
    onSaved,
    isUniAdmin,
    isFacMgr,
    isDeptMgr,
    activeDepartment,
    currentUser,
    editTemplate,
    // Belirli bir yükleme alanından açıldıysa modül ve belge türü hazır gelir
    // (ör. Ders Programı → "Fakülte Programı — Excel"), kullanıcı listeden
    // doğru türü kendi aramak zorunda kalmaz.
    baslangic,
  } = props;
  const isEdit = !!editTemplate;
  const [name, setName] = useState(editTemplate?.name || (baslangic && baslangic.ad) || '');
  const [description, setDescription] = useState(editTemplate?.description || '');
  const [module_, setModule] = useState(
    editTemplate?.module || (baslangic && baslangic.module) || 'erasmus'
  );
  const [docType, setDocType] = useState(
    editTemplate?.docType || (baslangic && baslangic.docType) || (isEdit ? 'default' : 'gidis')
  );
  const [file, setFile] = useState(null);
  const [isDefault, setIsDefault] = useState(!!editTemplate?.isDefault);
  const [isActive, setIsActive] = useState(editTemplate ? editTemplate.isActive !== false : true);
  const [scope, setScope] = useState(
    editTemplate?.scope || (isUniAdmin ? 'university' : 'department')
  );
  const [scopeDeptId, setScopeDeptId] = useState(
    editTemplate?.departmentId || activeDepartment || ''
  );
  const [scopeFacId, setScopeFacId] = useState(
    editTemplate?.facultyId || currentUser?.facultyId || ''
  );
  const [departments, setDepartments] = useState([]);
  const [faculties, setFaculties] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const [d, f] = await Promise.all([
          window.apiRead('departments'),
          window.apiRead('faculties').catch(() => []),
        ]);
        setDepartments(Array.isArray(d) ? d : []);
        setFaculties(Array.isArray(f) ? f : []);
      } catch (_) {
        /* yok say */
      }
    })();
  }, []);

  // Düzenlemede modül veya belge türü değişimi eşlemeyi sıfırlar — kullanıcıyı uyar
  const mappingWillReset =
    isEdit &&
    (module_ !== editTemplate.module ||
      (docType || 'default') !== (editTemplate.docType || 'default'));
  const hadMapping = isEdit && (editTemplate.fields || []).some((f) => f.variable);

  const authHeaders = () => {
    const t = localStorage.getItem('caku_auth_token');
    return t ? { Authorization: 'Bearer ' + t } : {};
  };

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (name.trim().length < 2) return setError('Şablon adı en az 2 karakter.');
    if (!isEdit && !file) return setError('Bir dosya seçin.');
    if (file) {
      const ext = '.' + (file.name.split('.').pop() || '').toLocaleLowerCase('tr');
      if (!SB_ALLOWED_EXT.includes(ext))
        return setError('Sadece şu uzantılar destekleniyor: ' + SB_ALLOWED_EXT.join(', '));
    }

    setSaving(true);
    try {
      if (isEdit) {
        // 1) Dosya değiştirilmişse önce onu yükle (fields sıfırlanır)
        let replacedFile = null;
        if (file) {
          const ffd = new FormData();
          ffd.append('file', file);
          const fr = await fetch('/api/templates/' + editTemplate._id + '/replace-file', {
            method: 'POST',
            headers: authHeaders(),
            credentials: 'include',
            body: ffd,
          });
          replacedFile = await fr.json().catch(() => ({}));
          if (!fr.ok) throw new Error(replacedFile.error || 'Dosya değiştirilemedi');
        }
        // 2) Meta güncelle
        const body = {
          name: name.trim(),
          description: description.trim(),
          module: module_,
          docType: docType || 'default',
          isDefault: !!isDefault,
          isActive: !!isActive,
          scope,
        };
        if (scope === 'department') body.departmentId = scopeDeptId;
        if (scope === 'faculty') body.facultyId = scopeFacId;
        const r = await fetch('/api/templates/' + editTemplate._id + '/update', {
          method: 'POST',
          headers: { ...authHeaders(), 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(body),
        });
        const d = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(d.error || 'Güncellenemedi');
        // Eşleme sıfırlandıysa (modül/tür/dosya değişti) sihirbazı aç
        const cleared = d.clearedMapping || !!file;
        onSaved(d, cleared && sbEslenebilir(d.file) ? true : false);
        return;
      }

      // Oluşturma akışı
      const fd = new FormData();
      fd.append('file', file);
      fd.append('name', name.trim());
      fd.append('description', description.trim());
      fd.append('module', module_);
      fd.append('docType', docType || 'default');
      fd.append('isDefault', String(!!isDefault));
      fd.append('isActive', String(!!isActive));
      fd.append('scope', scope);
      if (scope === 'department') fd.append('departmentId', scopeDeptId);
      if (scope === 'faculty') fd.append('facultyId', scopeFacId);
      const r = await fetch('/api/templates', {
        method: 'POST',
        headers: authHeaders(),
        body: fd,
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || 'Yüklenemedi');
      onSaved(d, file);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <SB_Modal
      open={true}
      onClose={onClose}
      title={isEdit ? 'Şablonu Düzenle' : 'Yeni Şablon'}
      width={560}
    >
      <form onSubmit={submit}>
        <SB_FormField label="Şablon Adı *">
          <SB_Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Örn: Bilgisayar Müh. Erasmus Çıktı Şablonu"
          />
        </SB_FormField>
        <SB_FormField label="Modül *">
          <select
            value={module_}
            onChange={(e) => {
              const mod = e.target.value;
              setModule(mod);
              // Modül değişince belge türünü o modülün ilk türüne çek
              const types = docTypesOf(mod);
              setDocType(types[0] ? types[0].id : 'default');
            }}
            style={{
              width: '100%',
              padding: '10px 14px',
              borderRadius: 8,
              border: '1px solid #D1D5DB',
              fontSize: 14,
              fontFamily: "'Inter', sans-serif",
              boxSizing: 'border-box',
            }}
          >
            {SB_MODULES.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
              </option>
            ))}
          </select>
        </SB_FormField>
        {docTypesOf(module_).length > 1 && (
          <SB_FormField label="Belge Türü *">
            <select
              value={docType}
              onChange={(e) => setDocType(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: 8,
                border: '1px solid #D1D5DB',
                fontSize: 14,
                fontFamily: "'Inter', sans-serif",
                boxSizing: 'border-box',
              }}
            >
              {docTypesOf(module_).map((d) => (
                <option key={d.id} value={d.id}>
                  {d.label}
                </option>
              ))}
            </select>
            <div style={{ fontSize: 11.5, color: SB.soluk, marginTop: 4 }}>
              Aynı modüle birden çok belge atanabilir (örn. Erasmus gidiş ve dönüş ayrı
              belgelerdir). Her belge türü için ayrı şablon yükleyin.
            </div>
          </SB_FormField>
        )}
        {(isUniAdmin || isFacMgr) && (
          <SB_FormField label="Kapsam *">
            <select
              value={scope}
              onChange={(e) => setScope(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: 8,
                border: '1px solid #D1D5DB',
                fontSize: 14,
                boxSizing: 'border-box',
              }}
            >
              {isUniAdmin && <option value="university">Üniversite Geneli</option>}
              {(isUniAdmin || isFacMgr) && <option value="faculty">Fakülte Geneli</option>}
              <option value="department">Bölüm</option>
            </select>
          </SB_FormField>
        )}
        {scope === 'department' && (
          <SB_FormField label={isDeptMgr ? 'Bölüm (otomatik)' : 'Bölüm *'}>
            {isDeptMgr ? (
              <SB_Input
                value={
                  (departments.find((d) => (d._docId || d.id) === (activeDepartment || '')) || {})
                    .name || activeDepartment
                }
                disabled
              />
            ) : (
              <select
                value={scopeDeptId}
                onChange={(e) => setScopeDeptId(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: 8,
                  border: '1px solid #D1D5DB',
                  fontSize: 14,
                  boxSizing: 'border-box',
                }}
              >
                <option value="">Bölüm seçin…</option>
                {departments
                  .filter((d) => !isFacMgr || d.facultyId === currentUser?.facultyId)
                  .map((d) => (
                    <option key={d._docId || d.id} value={d._docId || d.id}>
                      {d.name}
                    </option>
                  ))}
              </select>
            )}
          </SB_FormField>
        )}
        {scope === 'faculty' && isUniAdmin && (
          <SB_FormField label="Fakülte *">
            <select
              value={scopeFacId}
              onChange={(e) => setScopeFacId(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: 8,
                border: '1px solid #D1D5DB',
                fontSize: 14,
                boxSizing: 'border-box',
              }}
            >
              <option value="">Fakülte seçin…</option>
              {faculties.map((f) => (
                <option key={f._docId || f.id} value={f._docId || f.id}>
                  {f.name}
                </option>
              ))}
            </select>
          </SB_FormField>
        )}
        <SB_FormField label="Açıklama">
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            placeholder="İsteğe bağlı kısa açıklama"
            style={{
              width: '100%',
              padding: '10px 14px',
              borderRadius: 8,
              border: '1px solid #D1D5DB',
              fontSize: 14,
              fontFamily: "'Inter', sans-serif",
              resize: 'vertical',
              boxSizing: 'border-box',
            }}
          />
        </SB_FormField>
        <SB_FormField
          label={
            isEdit
              ? 'Dosyayı Değiştir (isteğe bağlı — .docx, .doc, .pdf, .xlsx, .xls)'
              : 'Dosya * (.docx, .doc, .pdf, .xlsx, .xls — maks 10 MB)'
          }
        >
          {isEdit && editTemplate.file && (
            <div style={{ fontSize: 12, color: SB.soluk, marginBottom: 6 }}>
              Mevcut: <b>{editTemplate.file.originalName}</b> (
              {(editTemplate.file.extension || '').toUpperCase()}). Değiştirmek için yeni dosya
              seçin; bırakırsanız aynı kalır.
            </div>
          )}
          <input
            type="file"
            accept={SB_ALLOWED_EXT.join(',')}
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            style={{
              width: '100%',
              padding: 8,
              border: '1px dashed #9CA3AF',
              borderRadius: 8,
              fontSize: 13,
              background: SB.yuzey2,
              boxSizing: 'border-box',
            }}
          />
          {isEdit && (file || mappingWillReset) && hadMapping && (
            <div
              style={{
                marginTop: 8,
                padding: '8px 12px',
                borderRadius: SB.yaricapKucuk,
                background: SB_ESLEME.yok.bg,
                color: SB_ESLEME.yok.fg,
                border: '1px solid ' + SB_ESLEME.yok.bd,
                fontSize: 12,
                fontWeight: 600,
                display: 'flex',
                alignItems: 'flex-start',
                gap: 8,
                lineHeight: 1.5,
              }}
            >
              <SbIkon ad="uyari" boyut={14} />
              <span>
                {file ? 'Yeni dosya' : 'Modül/belge türü değişimi'} nedeniyle mevcut alan eşlemeniz
                sıfırlanacak — kaydettikten sonra “Alanları Eşle” ile yeniden eşlemeniz gerekir.
              </span>
            </div>
          )}
        </SB_FormField>
        <div style={{ display: 'flex', gap: 16, marginBottom: 12 }}>
          <label style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
            <input
              type="checkbox"
              checked={isDefault}
              onChange={(e) => setIsDefault(e.target.checked)}
            />
            Varsayılan yap
          </label>
          <label style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
            />
            Aktif
          </label>
        </div>
        {error && (
          <div
            style={{
              background: '#FEE2E2',
              color: '#991B1B',
              padding: '8px 12px',
              borderRadius: 8,
              fontSize: 13,
              marginBottom: 12,
            }}
          >
            {error}
          </div>
        )}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <SB_Btn type="button" variant="secondary" onClick={onClose} disabled={saving}>
            İptal
          </SB_Btn>
          <SB_Btn type="submit" disabled={saving}>
            {saving
              ? isEdit
                ? 'Kaydediliyor…'
                : 'Yükleniyor…'
              : isEdit
                ? 'Değişiklikleri Kaydet'
                : 'Şablonu Kaydet'}
          </SB_Btn>
        </div>
      </form>
    </SB_Modal>
  );
}

// ══════════════════════════════════════════════════════════════
// Alan Eşleme Sihirbazı — .docx / .xlsx şablonundaki yer tutucuları
// ({{Alan Adı}} biçiminde) tespit eder; yükleyen yetkili
// her birini modülün değişkenlerine ya da sabit metne eşler. Eşleme
// document_templates.fields'a kaydedilir; hedef modül çıktı üretirken
// window.TemplateEngine.generateDocx bu eşlemeyi kullanır.
// ══════════════════════════════════════════════════════════════
function FieldMappingModal({ tpl, localFile, headers, onClose, onSaved }) {
  const [fields, setFields] = useState(null); // null=yükleniyor
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [autoCount, setAutoCount] = useState(0); // etiketten otomatik eşlenen alan sayısı

  const vars = window.templateVarsFor
    ? window.templateVarsFor(tpl.module, tpl.docType)
    : { static: [], row: [] };
  // Şablonun yapısını işaretleyen yer tutucular (ders programı ızgarasında
  // {{Gün}} ve {{Ders Saati}}): eşlenmez, çıktıda sütun başlığı olarak basılır.
  const yapisal = (token) =>
    !!window.templateYapisalToken && window.templateYapisalToken(tpl.module, token);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        let buf;
        if (localFile) {
          buf = await localFile.arrayBuffer();
        } else {
          const r = await fetch('/api/templates/' + tpl._id + '/download', {
            headers: headers(),
          });
          if (!r.ok) throw new Error('Şablon dosyası indirilemedi.');
          buf = await r.arrayBuffer();
        }
        const detected = await window.TemplateEngine.detectPlaceholders(buf);
        // Kayıtlı eşlemeleri (token + sıra) üzerine bindir
        const saved = tpl.fields || [];
        let merged = detected.map((d) => {
          const s = saved.find(
            (x) => x.token === d.token && x.tokenOccurrence === d.tokenOccurrence
          );
          return s ? { ...d, variable: s.variable || '', value: s.value || '' } : d;
        });

        // ── OTOMATİK EŞLEME ──
        // Yer tutucu adı ({{...}} içi) bir değişken ETİKETİYLE eşleşiyorsa
        // otomatik bağla — kullanıcı yalnızca kontrol edip Kaydet'e basar.
        // Kural: normalize edilmiş (küçük harf, yalnız harf/rakam) tam eşleşme;
        // yoksa etiketin parantezli açıklaması atılarak eşleşme; yoksa etiket
        // yer tutucuyla başlıyorsa (>=4 karakter) öneki kabul et.
        const normTr = (s) =>
          (s || '')
            .replace(/İ/g, 'i')
            .replace(/I/g, 'ı')
            .toLocaleLowerCase('tr-TR')
            .replace(/[^0-9a-zçğıöşü]/g, '');
        const candidates = [
          ...(vars.static || []).map((v) => ({ key: 'static:' + v.id, label: v.label })),
          ...(vars.row || []).map((v) => ({ key: 'row:' + v.id, label: v.label })),
        ];
        const candKeys = new Set(candidates.map((c) => c.key));
        const byNorm = {};
        candidates.forEach((c) => {
          const full = normTr(c.label);
          const base = normTr(c.label.replace(/\(.*?\)/g, ''));
          if (full && !byNorm[full]) byNorm[full] = c.key;
          if (base && !byNorm[base]) byNorm[base] = c.key;
        });
        // Yaygın Türkçe yer-tutucu adları → değişken TAKMA ADLARI. Etiketle birebir
        // eşleşmeyen ama anlamı belli tokenlar (Erasmus/muafiyet şablonları) için.
        // Yalnız hedef değişken bu modülde geçerliyse uygulanır (candKeys kontrolü).
        const TOKEN_ALIASES = {
          öğrencino: 'static:ogrenciNo',
          öğrencinumarası: 'static:ogrenciNo',
          öğrenciadsoyad: 'static:ogrenciAdSoyad',
          adsoyad: 'static:ogrenciAdSoyad',
          öğrenciadsoyadtamlanan: 'static:ogrenciAdSoyadTamlanan',
          adsoyadtamlanan: 'static:ogrenciAdSoyadTamlanan',
          eğitimyılı: 'static:akademikYil',
          akademikyıl: 'static:akademikYil',
          karşıülke: 'static:hostUlke',
          gidilenülke: 'static:hostUlke',
          karşıkurum: 'static:kaynakUniversite',
          gidilenkurum: 'static:hostKurum',
          karşıüniversite: 'static:kaynakUniversite',
          karşıfakülte: 'static:kaynakFakulte',
          karşıbölüm: 'static:kaynakBolum',
          çakübölüm: 'static:cakuBolum',
          karşıderskodu: 'row:kDersKod',
          karşıdersadı: 'row:kDersAd',
          karşıdersakts: 'row:kDersAkts',
          karşıdersdönemi: 'row:kDersDonem',
          dönem: 'static:donem',
          çaküderskodu: 'row:cDersKod',
          çaküdersadı: 'row:cDersAd',
          çaküdersakts: 'row:cDersAkts',
          çaküdersdönemi: 'row:cDersDonem',
          çaküdersstatü: 'row:cDersStatu',
          çaküdersstatüsü: 'row:cDersStatu',
          karşıtoplamakts: 'static:kaynakToplamAkts',
          çakütoplamakts: 'static:cakuToplamAkts',
          // ── Yaz okulu dilekçesi yer tutucuları ──
          // Dilekçede sütun başlıkları yalın: "KODU / ADI / KREDİSİ" ve iki
          // taraf ayrı tablolarda. Kredi = AKTS olarak eşlenir; belgede ayrı
          // bir kredi alanı yok, sistemde tutulan değer AKTS.
          telefon: 'static:ogrenciTelefon',
          eposta: 'static:ogrenciEposta',
          öğrencitelefon: 'static:ogrenciTelefon',
          öğrencieposta: 'static:ogrenciEposta',
          öğrenciadres: 'static:ogrenciAdres',
          bölümü: 'static:cakuBolum',
          çaküfakülte: 'static:cakuFakulte',
          çakübölümkısa: 'static:cakuBolumKisa',
          çaküfakültesi: 'static:cakuFakulte',
          çaküüniversite: 'static:cakuUniversite',
          alınacaküniversite: 'static:kaynakUniversite',
          alınacakfakülte: 'static:kaynakFakulte',
          alınacakbölüm: 'static:kaynakBolum',
          alınacakderskodu: 'row:kDersKod',
          alınacakdersadı: 'row:kDersAd',
          alınacakderskredisi: 'row:kDersAkts',
          karşıderskredisi: 'row:kDersAkts',
          çaküderskredisi: 'row:cDersAkts',
          sayılacakderskodu: 'row:cDersKod',
          sayılacakdersadı: 'row:cDersAd',
          sayılacakderskredisi: 'row:cDersAkts',
          karşıtoplamkredi: 'static:kaynakToplamAkts',
          çakütoplamkredi: 'static:cakuToplamAkts',
          // ÇAP/Yandal dilekçe yer tutucuları
          gününtarihi: 'static:tarih',
          uyruğu: 'static:uyruk',
          doğumtarihi: 'static:dogumTarihi',
          telcep: 'static:telCep',
          telev: 'static:telEv',
          email: 'static:eposta',
          adres: 'static:adres',
          fakülte: 'static:fakulte',
          bölüm: 'static:bolum',
          öğrno: 'static:ogrenciNo',
          bitirdiğisınıf: 'static:bitirdigiSinif',
          genelnotort: 'static:genelNotOrt',
          okuduğudönem: 'static:okudugiDonem',
          tercih1: 'static:tercih1',
          tercih2: 'static:tercih2',
          // ── Ders programı yer tutucuları ──
          // Değişken etiketleri zaten yer tutucu adlarıyla birebir seçildi
          // (Kurum Adı / Fakülte Adı / Saat / Pazartesi …); buradakiler yaygın
          // ALTERNATİF yazımlar. candKeys kontrolü sayesinde yalnız ders
          // programı şablonlarında devreye girer.
          kurum: 'static:kurumAd',
          üniversite: 'static:kurumAd',
          üniversiteadı: 'static:kurumAd',
          tarih: 'static:tarih',
          belgetarihi: 'static:tarih',
          eğitimöğretimyılı: 'static:akademikYil',
          yarıyıl: 'static:donem',
          seviye: 'static:seviyeAd',
          saati: 'row:saat',
          pzt: 'row:pazartesi',
          çrş: 'row:carsamba',
          prş: 'row:persembe',
          // ── Yatay Geçiş değerlendirme raporu yer tutucuları ──
          // (şablonlardaki adlar birebir; normTr boşluk/işaret/kasa siler)
          adısoyadı: 'row:adSoyad',
          öğrencininşuankifakültesi: 'row:aktifFakulte',
          öğrencininşuankibölümü: 'row:aktifBolum',
          halenöğrenimgördüğüüni: 'row:aktifUniversite',
          halenöğrenimgördüğüfakülte: 'row:aktifFakulte',
          halenöğrenimgördüğübölüm: 'row:aktifBolum',
          halenöğrenimgördüğüsınıf: 'row:aktifSinif',
          öğrencininşuankisınıfı: 'row:aktifSinif',
          aktifsınıf: 'row:aktifSinif',
          başvurduğufakülte: 'row:basvurduguFakulte',
          başvurduğubölüm: 'row:basvurduguBolum',
          başvurduğusınıf: 'row:basvurduguSinif',
          başvurduğuyarıyıl: 'row:basvurduguYariyil',
          yksyerleşmeyılı: 'row:yksYerlesmeYili',
          yerleştiğipuantürü: 'row:yksPuanTuru',
          ykspuanı: 'row:yksPuani',
          notortalaması: 'row:notOrtalamasi',
          ykspuanıyüzde40: 'row:yksPuaniYuzde40',
          notortalamasıyüzde60: 'row:notOrtYuzde60',
          yerleşmepuanı: 'row:yerlesmePuani',
          başvurduğubölümösyspuanı: 'row:basvurduguBolumOsysPuani',
          başarısırası: 'row:yksBasariSirasi',
          sınavpuanı: 'row:sinavPuani',
          sınavbaşarısırası: 'row:sinavBasariSirasi',
          yksbaşarısırası: 'row:yksBasariSirasi',
          yerleştirmebaşarısırası: 'row:yksBasariSirasi',
          yerleştirmebaşarısıralaması: 'row:yksBasariSirasi',
          başvurduğubölümtabansırası: 'row:basvurduguBolumTabanSirasi',
          eğitimyılı2: 'static:egitimYili',
        };
        let auto = 0;
        merged = merged.map((f) => {
          // Yapısal token (ızgaranın {{Gün}} / {{Ders Saati}} işaretçileri):
          // künye alanı değildir, değişkene bağlanmaz. Kayıtlı bir eşleme
          // varsa da temizlenir — eskiden '{{Ders Saati}}' adı benzediği için
          // "Ders Saati Sayısı"na kendiliğinden bağlanıyordu.
          if (yapisal(f.token)) return { ...f, variable: '', value: '' };
          if (f.variable) return f;
          const inner = normTr(String(f.token).replace(/^\{\{|\}\}$/g, ''));
          if (!inner) return f;
          let hit = byNorm[inner];
          if (!hit && inner.length >= 4) {
            const cand = candidates.find((c) => normTr(c.label).startsWith(inner));
            hit = cand && cand.key;
          }
          if (!hit && TOKEN_ALIASES[inner] && candKeys.has(TOKEN_ALIASES[inner])) {
            hit = TOKEN_ALIASES[inner];
          }
          if (!hit) return f;
          auto++;
          return { ...f, variable: hit };
        });
        if (alive) {
          setAutoCount(auto);
          setFields(merged);
        }
      } catch (e) {
        if (alive) {
          setError(e.message);
          setFields([]);
        }
      }
    })();
    return () => {
      alive = false;
    };
  }, [tpl._id]);

  const update = (i, patch) =>
    setFields((prev) => prev.map((f, idx) => (idx === i ? { ...f, ...patch } : f)));

  // Aynı token'ın (örn. aynı sayının) diğer tekrarlarına da bu eşlemeyi uygula
  const applyToAll = (i) =>
    setFields((prev) => {
      const src = prev[i];
      return prev.map((f) =>
        f.token === src.token ? { ...f, variable: src.variable, value: src.value } : f
      );
    });

  const save = async () => {
    setSaving(true);
    setError('');
    try {
      const r = await fetch('/api/templates/' + tpl._id + '/update', {
        method: 'POST',
        headers: { ...headers(), 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fields: fields.map(({ token, tokenOccurrence, context, variable, value }) => ({
            token,
            tokenOccurrence,
            context,
            variable,
            value,
          })),
        }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || 'Kaydedilemedi');
      onSaved();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  // Yapısal işaretçiler "eşlenecek alan" değildir; sayaç onları saymaz, yoksa
  // "4 / 5 eşlendi" diye eksik kalmış izlenimi verirdi.
  const eslenebilir = (fields || []).filter((f) => !yapisal(f.token));
  const mappedCount = eslenebilir.filter((f) => f.variable).length;
  const selStyle = {
    width: '100%',
    padding: '7px 10px',
    borderRadius: 7,
    border: '1px solid #D1D5DB',
    fontSize: 12.5,
    fontFamily: "'Inter', sans-serif",
    boxSizing: 'border-box',
  };

  return (
    <SB_Modal open={true} onClose={onClose} title={'Alan Eşleme — ' + tpl.name} width={760}>
      <p style={{ fontSize: 12.5, color: SB.soluk, margin: '0 0 12px', lineHeight: 1.6 }}>
        Belgede tespit edilen yer tutucular aşağıda. Her birini{' '}
        <b>{moduleMeta(tpl.module).label}</b> modülünün değişkenlerine eşleyin — çıktı üretilirken
        bu alanlar gerçek verilerle doldurulur. <b>Satır değişkenleri</b> tablo satırındaki alanlar
        içindir: o satır, ders sayısı kadar çoğaltılır. Eşlemek istemediklerinizi "Atla" bırakın;
        sabit bir metin yazmak için "Sabit metin" seçin.
      </p>

      {autoCount > 0 && (
        <div
          style={{
            padding: '9px 12px',
            marginBottom: 12,
            borderRadius: 8,
            background: '#ECFDF5',
            border: '1px solid #A7F3D0',
            color: '#047857',
            fontSize: 12.5,
            fontWeight: 600,
          }}
        >
          ⚡ {autoCount} alan, yer tutucu adı değişken etiketiyle eşleştiği için otomatik eşlendi —
          kontrol edip Kaydet'e basmanız yeterli.
        </div>
      )}

      {fields === null ? (
        <p style={{ padding: 24, textAlign: 'center', color: SB.soluk }}>Belge inceleniyor…</p>
      ) : fields.length === 0 ? (
        <div
          style={{
            padding: 20,
            background: '#FEF3C7',
            border: '1px solid #FCD34D',
            borderRadius: 10,
            fontSize: 13,
            color: '#92400E',
          }}
        >
          Belgede yer tutucu bulunamadı. Şablonda değişken alanları çift süslü parantez içinde{' '}
          <b>{'{{Ders Kodu}}'}</b>, <b>{'{{Öğrenci No}}'}</b> biçiminde yazın (içinde boşluk ve
          Türkçe harf serbest) ve şablonu yeniden yükleyin.
        </div>
      ) : (
        <div
          style={{
            maxHeight: 420,
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
            marginBottom: 12,
          }}
        >
          {fields.map((f, i) => (
            <div
              key={i}
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 220px',
                gap: 10,
                alignItems: 'center',
                padding: '9px 12px',
                borderRadius: 9,
                border: '1px solid ' + (f.variable ? '#C4B5FD' : SB.kenar),
                background: f.variable ? '#F5F3FF' : 'white',
              }}
            >
              <div style={{ minWidth: 0 }}>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    padding: '1px 7px',
                    borderRadius: 8,
                    background: '#1F2937',
                    color: 'white',
                    fontFamily: "'JetBrains Mono', monospace",
                  }}
                >
                  {f.token}
                </span>
                <span style={{ fontSize: 10.5, color: SB.soluk2, marginLeft: 6 }}>
                  #{f.tokenOccurrence}
                </span>
                <div
                  style={{
                    fontSize: 11.5,
                    color: SB.soluk,
                    marginTop: 3,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                  title={f.context}
                >
                  …{f.context}…
                </div>
              </div>
              <div>
                {yapisal(f.token) ? (
                  <div
                    style={{
                      ...selStyle,
                      background: '#F3F4F6',
                      color: '#4B5563',
                      border: '1px dashed #D1D5DB',
                      fontWeight: 600,
                    }}
                    title={
                      'Bu yer tutucu tablonun kendisini işaretler; çıktıda sütun ' +
                      'başlığı olarak basılır. Eşleme gerekmez.'
                    }
                  >
                    🔒 Tablo işareti — otomatik
                  </div>
                ) : (
                  <select
                    value={f.variable}
                    onChange={(e) => update(i, { variable: e.target.value })}
                    style={selStyle}
                  >
                    <option value="">— Atla —</option>
                    {vars.static.length > 0 && (
                      <optgroup label="Belge alanları">
                        {vars.static.map((v) => (
                          <option key={v.id} value={'static:' + v.id}>
                            {v.label}
                          </option>
                        ))}
                      </optgroup>
                    )}
                    {vars.row.length > 0 && (
                      <optgroup label="Tablo satırı (ders başına)">
                        {vars.row.map((v) => (
                          <option key={v.id} value={'row:' + v.id}>
                            {v.label}
                          </option>
                        ))}
                      </optgroup>
                    )}
                    <option value="const">Sabit metin…</option>
                  </select>
                )}
                {!yapisal(f.token) && f.variable === 'const' && (
                  <input
                    value={f.value}
                    onChange={(e) => update(i, { value: e.target.value })}
                    placeholder="Yazılacak sabit metin"
                    style={{ ...selStyle, marginTop: 5 }}
                  />
                )}
                {!yapisal(f.token) &&
                  f.variable &&
                  fields.filter((x) => x.token === f.token).length > 1 &&
                  fields.some((x) => x.token === f.token && x.variable !== f.variable) && (
                    <button
                      type="button"
                      onClick={() => applyToAll(i)}
                      style={{
                        marginTop: 5,
                        border: 'none',
                        background: 'transparent',
                        color: '#7C3AED',
                        fontSize: 11,
                        fontWeight: 600,
                        cursor: 'pointer',
                        padding: 0,
                      }}
                    >
                      ⧉ "{f.token}" tekrarlarının tümüne uygula
                    </button>
                  )}
              </div>
            </div>
          ))}
        </div>
      )}

      {error && (
        <div
          style={{
            background: '#FEE2E2',
            color: '#991B1B',
            padding: '8px 12px',
            borderRadius: 8,
            fontSize: 12.5,
            marginBottom: 10,
          }}
        >
          {error}
        </div>
      )}

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 8,
        }}
      >
        <span style={{ fontSize: 12, color: SB.soluk }}>
          {mappedCount} alan eşlendi{fields ? ' / ' + eslenebilir.length + ' tespit' : ''}
        </span>
        <div style={{ display: 'flex', gap: 8 }}>
          <SB_Btn type="button" variant="secondary" onClick={onClose} disabled={saving}>
            İptal
          </SB_Btn>
          <SB_Btn type="button" onClick={save} disabled={saving || fields === null}>
            {saving ? 'Kaydediliyor…' : 'Eşlemeyi Kaydet'}
          </SB_Btn>
        </div>
      </div>
    </SB_Modal>
  );
}

window.SablonlarApp = SablonlarApp;
