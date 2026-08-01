// ══════════════════════════════════════════════════════════════
// ÇAKÜ — Yol Haritaları (Ortak modül)
//
// Bölüm yetkilisi HERHANGİ bir modül (ve o modülün istediği sekmesi) için
// adım adım bir yol haritası yazar; oluşturur, düzenler, siler, yayınlar.
// Öğrenci tarafında salt-okunur: SAĞDA modül/sekme seçicisi (küçük sidebar),
// SOLDA stajdaki gibi adım adım açılır roadmap.
//
// Not: "Projeler" (roadmaps-module.jsx) proje DESTEK PROGRAMLARIDIR — bu modül
// onunla ilgisizdir, adı eskiden "Yol Haritaları" olduğu için karıştırılmasın.
//
// Veri: yol_haritalari koleksiyonu. Yazma yetkisi sunucuda
// DEPT_MANAGER_WRITE ile bölüm yetkilisi ve üstüne sınırlıdır.
// ══════════════════════════════════════════════════════════════

const { useState, useEffect, useMemo, useCallback } = React;

const YH = {
  navy: '#1B2A4A',
  accent: '#4F46E5',
  accentSoft: '#EEF2FF',
  accentMid: '#C7D2FE',
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

// Yol haritası bağlanabilecek modüller — kayıtlı tüm modül listelerinin
// birleşimi. Sidebar'daki adların birebir aynısı kullanılır ki öğrenci
// "hangi modülün yol haritası" sorusunu tereddütsüz yanıtlayabilsin.
function yhAllModules() {
  const lists = [
    window.DEPARTMENT_MODULES,
    window.COMMON_MODULES,
    window.ADMIN_MODULES,
    window.HIERARCHY_MODULES,
  ];
  const seen = new Set();
  const out = [];
  for (const list of lists) {
    for (const m of list || []) {
      if (!m || !m.id || seen.has(m.id)) continue;
      // Kendi kendine yol haritası yazılmasın.
      if (m.id === 'yolharitalari') continue;
      seen.add(m.id);
      out.push({ id: m.id, label: m.label });
    }
  }
  return out.sort((a, b) => a.label.localeCompare(b.label, 'tr'));
}

// Bilinen sekme adları — serbest metin alanına öneri (datalist) olarak
// verilir. Listede olmayan bir sekme de elle yazılabilir.
const YH_BILINEN_SEKMELER = {
  erasmus: ['Giden Öğrenci', 'Gelen Öğrenci', 'Başvurular', 'Ders Eşleştirme'],
  muafiyet: ['Ders Muafiyet', 'Yatay Geçiş', 'Dikey Geçiş'],
  capyandal: ['ÇAP Başvuru', 'Yandal Başvuru'],
  staj: ['Yol Haritası', 'Staj Kayıtları', 'Belgeler'],
  formlar: ['Öğrenci Formları', 'Akademisyen Formları'],
  projeler: ['Projelerim', 'Proje Grupları'],
  sinav: ['Sınav Programı', 'Sonuçlar'],
  gelenbelgeler: ['Gelen Belgeler', 'Gönderdiklerim'],
};

const yhUid = () => 's' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

function yhBosAdim() {
  return { id: yhUid(), title: '', duration: '', result: '', desc: '', links: [], note: '' };
}

function yhBosHarita(moduleId, moduleLabel, departmentId) {
  return {
    baslik: '',
    moduleId: moduleId || '',
    moduleLabel: moduleLabel || '',
    sekme: '',
    aciklama: '',
    departmentId: departmentId || '',
    yayinda: false,
    steps: [yhBosAdim()],
  };
}

const yhDocId = (r) => r?._docId || r?.id || (r?._id && String(r._id)) || null;

// ══════════════════════════════════════════════════════════════
// Adım kartı — stajdaki yol haritasının görsel dili: yol kenarında
// duran, tıklayınca açılan kart. KİLİT YOK: her adım her zaman açılabilir,
// çünkü bu haritalar bilgilendirme amaçlıdır, bir süreç durumu tutmaz.
// ══════════════════════════════════════════════════════════════
function YhAdimKarti({ step, isOpen, onToggle, isMobile }) {
  const links = Array.isArray(step.links) ? step.links.filter((l) => l && l.label) : [];
  return (
    <div
      onClick={onToggle}
      style={{
        background: isOpen ? YH.accentSoft : '#fff',
        border: `1.5px solid ${isOpen ? YH.accent + '35' : '#F1F5F9'}`,
        borderRadius: 14,
        padding: '12px 16px',
        cursor: 'pointer',
        width: '100%',
        maxWidth: isMobile ? '100%' : 290,
        boxShadow: isOpen ? `0 4px 18px ${YH.accent}18` : '0 1px 4px rgba(0,0,0,0.05)',
        transition: 'all 0.2s',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 8,
        }}
      >
        <span style={{ fontSize: 14, fontWeight: 700, color: '#1E293B', lineHeight: 1.4 }}>
          {step.title || 'Başlıksız adım'}
        </span>
        {step.duration && (
          <span
            style={{
              fontSize: 10,
              fontWeight: 600,
              padding: '3px 8px',
              borderRadius: 10,
              background: YH.amberLight,
              color: YH.amber,
              flexShrink: 0,
              whiteSpace: 'nowrap',
            }}
          >
            {step.duration}
          </span>
        )}
      </div>

      {step.result && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 6 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: YH.accent }}>→</span>
          <span style={{ fontSize: 12, color: '#64748B' }}>{step.result}</span>
        </div>
      )}

      {isOpen && (
        <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1px solid ${YH.accent}18` }}>
          {step.desc && (
            <p style={{ fontSize: 13, color: '#475569', lineHeight: 1.65, whiteSpace: 'pre-wrap' }}>
              {step.desc}
            </p>
          )}

          {links.length > 0 && (
            <div style={{ marginTop: 10, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {links.map((l, li) => (
                <a
                  key={li}
                  href={l.url || '#'}
                  target={l.url ? '_blank' : undefined}
                  rel={l.url ? 'noopener noreferrer' : undefined}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!l.url) e.preventDefault();
                  }}
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: YH.accent,
                    background: '#fff',
                    border: `1px solid ${YH.accentMid}`,
                    borderRadius: 8,
                    padding: '5px 10px',
                    textDecoration: 'none',
                  }}
                >
                  {l.label} {l.url ? '↗' : ''}
                </a>
              ))}
            </div>
          )}

          {step.note && (
            <div
              style={{
                marginTop: 10,
                background: YH.amberLight,
                border: `1px solid ${YH.amber}30`,
                borderRadius: 8,
                padding: '8px 10px',
                fontSize: 12,
                color: '#78350F',
                lineHeight: 1.5,
                whiteSpace: 'pre-wrap',
              }}
            >
              {step.note}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// Yol (asfalt şerit) — adımlar yolun iki yanında dönüşümlü dizilir.
// Stajdaki görünümün aynısı; kilit ve ilerleme durumu YOKTUR.
// ══════════════════════════════════════════════════════════════
function YhYol({ harita, isMobile }) {
  const [acik, setAcik] = useState(null);
  const steps = Array.isArray(harita?.steps) ? harita.steps : [];

  useEffect(() => {
    setAcik(null);
  }, [harita]);

  const kesikCizgi = (
    <div
      style={{
        height: 2,
        width: 32,
        background: `repeating-linear-gradient(to right, ${YH.accentMid} 0, ${YH.accentMid} 5px, transparent 5px, transparent 10px)`,
      }}
    />
  );

  return (
    <div
      style={{
        background: 'white',
        borderRadius: 16,
        padding: isMobile ? 16 : 28,
        border: `1px solid ${YH.border}`,
        position: 'relative',
      }}
    >
      {/* ── Başlık ── */}
      <div style={{ marginBottom: 24 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 12,
            marginBottom: 8,
          }}
        >
          <div
            style={{
              height: 1,
              width: 40,
              background: `linear-gradient(to right, transparent, ${YH.accent}60)`,
            }}
          />
          <span
            style={{
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: '0.15em',
              color: YH.accent,
              textAlign: 'center',
            }}
          >
            {(harita?.baslik || 'YOL HARİTASI').toLocaleUpperCase('tr-TR')}
          </span>
          <div
            style={{
              height: 1,
              width: 40,
              background: `linear-gradient(to left, transparent, ${YH.accent}60)`,
            }}
          />
        </div>

        {/* Hangi modül/sekme + yazarın açıklaması. Yönerge metni yok. */}
        {(harita?.moduleLabel || harita?.sekme) && (
          <p
            style={{
              fontSize: 12,
              color: YH.textMuted,
              margin: 0,
              textAlign: 'center',
              fontWeight: 600,
            }}
          >
            {harita.moduleLabel || ''}
            {harita.sekme ? ' · ' + harita.sekme : ''}
          </p>
        )}
        {harita?.aciklama && (
          <p
            style={{
              fontSize: 13,
              color: YH.textMuted,
              margin: '6px auto 0',
              textAlign: 'center',
              maxWidth: 560,
              lineHeight: 1.55,
            }}
          >
            {harita.aciklama}
          </p>
        )}

        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            marginTop: 10,
          }}
        >
          <span
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: YH.accent,
              background: YH.accentSoft,
              border: `1px solid ${YH.accentMid}`,
              borderRadius: 20,
              padding: '3px 12px',
            }}
          >
            {steps.length} adım
          </span>
        </div>
      </div>

      {steps.length === 0 ? (
        <div style={{ textAlign: 'center', color: YH.textMuted, fontSize: 13, padding: '20px 0' }}>
          Bu yol haritasına henüz adım eklenmemiş.
        </div>
      ) : (
        <div style={{ position: 'relative', paddingBottom: 20 }}>
          {/* ── Asfalt Yol ── */}
          <div
            style={{
              position: 'absolute',
              left: isMobile ? 28 : '50%',
              transform: isMobile ? 'none' : 'translateX(-50%)',
              width: 54,
              top: 0,
              bottom: 0,
              background:
                'linear-gradient(to right, #2D3748 0%, #374151 40%, #374151 60%, #2D3748 100%)',
              zIndex: 0,
              borderRadius: 4,
            }}
          >
            <div
              style={{
                position: 'absolute',
                left: 5,
                top: 0,
                bottom: 0,
                width: 3,
                background: 'rgba(255,255,255,0.65)',
                borderRadius: 2,
              }}
            />
            <div
              style={{
                position: 'absolute',
                right: 5,
                top: 0,
                bottom: 0,
                width: 3,
                background: 'rgba(255,255,255,0.65)',
                borderRadius: 2,
              }}
            />
            <div
              style={{
                position: 'absolute',
                left: '50%',
                transform: 'translateX(-50%)',
                width: 4,
                top: 0,
                bottom: 0,
                background:
                  'repeating-linear-gradient(to bottom, #FCD34D 0px, #FCD34D 14px, transparent 14px, transparent 28px)',
                borderRadius: 2,
              }}
            />
          </div>

          {/* ── BAŞLANGIÇ ── */}
          <div
            style={{
              display: 'flex',
              justifyContent: isMobile ? 'flex-start' : 'center',
              marginBottom: 32,
              position: 'relative',
              zIndex: 2,
            }}
          >
            <div
              style={{
                marginLeft: isMobile ? 6 : 0,
                background: YH.accent,
                color: '#fff',
                padding: '8px 22px',
                borderRadius: 8,
                fontWeight: 800,
                fontSize: 11,
                letterSpacing: '0.12em',
                boxShadow: `0 3px 12px ${YH.accent}40`,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              BAŞLANGIÇ
            </div>
          </div>

          {/* ── Adımlar ── */}
          {steps.map((step, i) => {
            const isLeft = !isMobile && i % 2 === 0;
            const isOpen = acik === i;
            const kart = (
              <YhAdimKarti
                step={step}
                isOpen={isOpen}
                isMobile={isMobile}
                onToggle={() => setAcik(isOpen ? null : i)}
              />
            );

            return (
              <div
                key={step.id || i}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  marginBottom: 40,
                  position: 'relative',
                  zIndex: 1,
                }}
              >
                {/* Sol taraf */}
                {!isMobile && (
                  <div
                    style={{
                      flex: 1,
                      display: 'flex',
                      justifyContent: 'flex-end',
                      alignItems: 'center',
                      paddingRight: 14,
                    }}
                  >
                    {isLeft ? kart : kesikCizgi}
                  </div>
                )}

                {/* Yol üzerindeki numara dairesi — tek durum, kilit yok */}
                <div
                  style={{
                    width: isMobile ? 56 : 54,
                    flexShrink: 0,
                    display: 'flex',
                    justifyContent: 'center',
                    zIndex: 2,
                  }}
                >
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      setAcik(isOpen ? null : i);
                    }}
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: '50%',
                      background: isOpen ? '#fff' : YH.accent,
                      border: `3.5px solid ${isOpen ? YH.accent : 'rgba(255,255,255,0.85)'}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      boxShadow: isOpen
                        ? `0 0 0 5px ${YH.accent}25, 0 4px 14px rgba(0,0,0,0.25)`
                        : `0 0 0 5px ${YH.accent}20, 0 4px 14px rgba(0,0,0,0.28)`,
                      fontWeight: 800,
                      fontSize: 15,
                      color: isOpen ? YH.accent : '#fff',
                      transition: 'all 0.25s',
                    }}
                  >
                    {i + 1}
                  </div>
                </div>

                {/* Sağ taraf */}
                <div style={{ flex: 1, paddingLeft: 14 }}>
                  {(!isMobile && !isLeft) || isMobile ? kart : kesikCizgi}
                </div>
              </div>
            );
          })}

          {/* ── BİTİŞ ── */}
          <div
            style={{
              display: 'flex',
              justifyContent: isMobile ? 'flex-start' : 'center',
              marginTop: 8,
              position: 'relative',
              zIndex: 2,
            }}
          >
            <div
              style={{
                marginLeft: isMobile ? 6 : 0,
                background: '#0F172A',
                color: '#fff',
                padding: '8px 22px',
                borderRadius: 8,
                fontWeight: 800,
                fontSize: 11,
                letterSpacing: '0.12em',
                boxShadow: '0 3px 10px rgba(0,0,0,0.25)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              BİTİŞ
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// Görüntüleme: solda yol haritası, sağda modül/sekme seçici
// ══════════════════════════════════════════════════════════════
function YhGoruntule({ haritalar, secili, onSec, isMobile }) {
  // Sağ liste: modüle göre gruplanmış yol haritaları
  const gruplar = useMemo(() => {
    const map = new Map();
    for (const h of haritalar) {
      const key = h.moduleId || '(diger)';
      if (!map.has(key)) map.set(key, { label: h.moduleLabel || 'Diğer', items: [] });
      map.get(key).items.push(h);
    }
    return [...map.entries()].sort((a, b) =>
      (a[1].label || '').localeCompare(b[1].label || '', 'tr')
    );
  }, [haritalar]);

  const aktif = haritalar.find((h) => yhDocId(h) === secili) || haritalar[0] || null;

  const secici = (
    <div
      style={{
        width: isMobile ? '100%' : 244,
        flexShrink: 0,
        background: '#fff',
        border: `1px solid ${YH.border}`,
        borderRadius: 14,
        padding: 12,
        alignSelf: 'flex-start',
        position: isMobile ? 'static' : 'sticky',
        top: 12,
        maxHeight: isMobile ? undefined : 'calc(100vh - 140px)',
        overflowY: 'auto',
      }}
    >
      <div
        style={{
          fontSize: 11,
          fontWeight: 700,
          color: YH.textMuted,
          textTransform: 'uppercase',
          letterSpacing: 0.4,
          padding: '2px 4px 8px',
        }}
      >
        Yol Haritaları
      </div>

      {gruplar.length === 0 && (
        <div style={{ fontSize: 12, color: YH.textMuted, padding: '8px 4px', lineHeight: 1.5 }}>
          Henüz yayınlanmış yol haritası yok.
        </div>
      )}

      {gruplar.map(([mid, grup]) => (
        <div key={mid} style={{ marginBottom: 10 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: YH.navy, padding: '6px 4px 4px' }}>
            {grup.label}
          </div>
          {grup.items.map((h) => {
            const id = yhDocId(h);
            const isActive = aktif && yhDocId(aktif) === id;
            return (
              <button
                key={id}
                onClick={() => onSec(id)}
                style={{
                  display: 'block',
                  width: '100%',
                  textAlign: 'left',
                  background: isActive ? YH.accentSoft : 'transparent',
                  border: `1px solid ${isActive ? YH.accentMid : 'transparent'}`,
                  borderRadius: 9,
                  padding: '7px 9px',
                  marginBottom: 3,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  color: isActive ? YH.accent : '#475569',
                  fontSize: 12.5,
                  fontWeight: isActive ? 700 : 500,
                  lineHeight: 1.4,
                }}
              >
                {h.baslik || 'Adsız'}
                {h.sekme && (
                  <span
                    style={{
                      display: 'block',
                      fontSize: 11,
                      fontWeight: 500,
                      color: YH.textMuted,
                      marginTop: 1,
                    }}
                  >
                    {h.sekme}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );

  const govde = (
    <div style={{ flex: 1, minWidth: 0 }}>
      {!aktif ? (
        <div
          style={{
            background: '#fff',
            border: `1px solid ${YH.border}`,
            borderRadius: 14,
            padding: '40px 24px',
            textAlign: 'center',
            color: YH.textMuted,
            fontSize: 13.5,
            lineHeight: 1.6,
          }}
        >
          Henüz bir yol haritası yayınlanmamış.
          <br />
          Bölüm yetkiliniz yayınladığında burada görünecek.
        </div>
      ) : (
        <YhYol harita={aktif} isMobile={isMobile} />
      )}
    </div>
  );

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: isMobile ? 'column-reverse' : 'row',
        gap: 16,
        alignItems: 'flex-start',
      }}
    >
      {govde}
      {secici}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// Düzenleme formu (bölüm yetkilisi)
// ══════════════════════════════════════════════════════════════
function YhDuzenle({ taslak, setTaslak, moduller }) {
  const set = (patch) => setTaslak((t) => ({ ...t, ...patch }));

  const setStep = (idx, patch) =>
    setTaslak((t) => {
      const steps = [...(t.steps || [])];
      steps[idx] = { ...steps[idx], ...patch };
      return { ...t, steps };
    });

  const addStep = () => setTaslak((t) => ({ ...t, steps: [...(t.steps || []), yhBosAdim()] }));

  const removeStep = (idx) =>
    setTaslak((t) => ({ ...t, steps: (t.steps || []).filter((_, i) => i !== idx) }));

  const moveStep = (idx, dir) =>
    setTaslak((t) => {
      const steps = [...(t.steps || [])];
      const j = idx + dir;
      if (j < 0 || j >= steps.length) return t;
      [steps[idx], steps[j]] = [steps[j], steps[idx]];
      return { ...t, steps };
    });

  const setLink = (si, li, patch) =>
    setTaslak((t) => {
      const steps = [...(t.steps || [])];
      const links = [...(steps[si].links || [])];
      links[li] = { ...links[li], ...patch };
      steps[si] = { ...steps[si], links };
      return { ...t, steps };
    });

  const addLink = (si) =>
    setTaslak((t) => {
      const steps = [...(t.steps || [])];
      steps[si] = { ...steps[si], links: [...(steps[si].links || []), { label: '', url: '' }] };
      return { ...t, steps };
    });

  const removeLink = (si, li) =>
    setTaslak((t) => {
      const steps = [...(t.steps || [])];
      steps[si] = { ...steps[si], links: (steps[si].links || []).filter((_, i) => i !== li) };
      return { ...t, steps };
    });

  const inputStyle = {
    width: '100%',
    padding: '8px 10px',
    border: `1px solid ${YH.border}`,
    borderRadius: 8,
    fontSize: 13,
    fontFamily: 'inherit',
    color: YH.text,
    background: '#fff',
  };
  const labelStyle = {
    display: 'block',
    fontSize: 11.5,
    fontWeight: 600,
    color: YH.textMuted,
    marginBottom: 4,
  };

  const sekmeOnerileri = YH_BILINEN_SEKMELER[taslak.moduleId] || [];

  return (
    <div>
      {/* Üst bilgiler */}
      <div
        style={{
          background: '#fff',
          border: `1px solid ${YH.border}`,
          borderRadius: 12,
          padding: 16,
          marginBottom: 14,
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: 12,
          }}
        >
          <div>
            <label style={labelStyle}>Modül *</label>
            <select
              value={taslak.moduleId || ''}
              onChange={(e) => {
                const m = moduller.find((x) => x.id === e.target.value);
                set({ moduleId: e.target.value, moduleLabel: m ? m.label : '', sekme: '' });
              }}
              style={inputStyle}
            >
              <option value="">— Modül seçin —</option>
              {moduller.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={labelStyle}>Sekme (opsiyonel)</label>
            <input
              list="yh-sekme-onerileri"
              value={taslak.sekme || ''}
              onChange={(e) => set({ sekme: e.target.value })}
              placeholder="ör. Giden Öğrenci"
              style={inputStyle}
            />
            <datalist id="yh-sekme-onerileri">
              {sekmeOnerileri.map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>
          </div>

          <div>
            <label style={labelStyle}>Başlık *</label>
            <input
              value={taslak.baslik || ''}
              onChange={(e) => set({ baslik: e.target.value })}
              placeholder="ör. Erasmus Başvuru Süreci"
              style={inputStyle}
            />
          </div>
        </div>

        <div style={{ marginTop: 12 }}>
          <label style={labelStyle}>Kısa açıklama</label>
          <textarea
            value={taslak.aciklama || ''}
            onChange={(e) => set({ aciklama: e.target.value })}
            rows={2}
            placeholder="Öğrencinin en başta göreceği özet."
            style={{ ...inputStyle, resize: 'vertical' }}
          />
        </div>

        <label
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginTop: 12,
            fontSize: 13,
            color: YH.text,
            cursor: 'pointer',
          }}
        >
          <input
            type="checkbox"
            checked={!!taslak.yayinda}
            onChange={(e) => set({ yayinda: e.target.checked })}
            style={{ width: 15, height: 15, cursor: 'pointer' }}
          />
          <span>
            <strong>Yayında</strong> — işaretli değilse yalnızca yetkililer görür (taslak).
          </span>
        </label>
      </div>

      {/* Adımlar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <span style={{ fontSize: 14, fontWeight: 700, color: YH.navy }}>
          Adımlar ({(taslak.steps || []).length})
        </span>
        <button
          onClick={addStep}
          style={{
            marginLeft: 'auto',
            background: YH.accent,
            color: '#fff',
            border: 'none',
            borderRadius: 8,
            padding: '7px 13px',
            fontSize: 12.5,
            fontWeight: 600,
            cursor: 'pointer',
            fontFamily: 'inherit',
          }}
        >
          + Adım Ekle
        </button>
      </div>

      {(taslak.steps || []).map((s, i) => (
        <div
          key={s.id || i}
          style={{
            background: '#fff',
            border: `1px solid ${YH.border}`,
            borderRadius: 12,
            padding: 14,
            marginBottom: 10,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <span
              style={{
                width: 24,
                height: 24,
                borderRadius: '50%',
                background: YH.accentSoft,
                color: YH.accent,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 12,
                fontWeight: 700,
                flexShrink: 0,
              }}
            >
              {i + 1}
            </span>
            <span style={{ fontSize: 12.5, fontWeight: 600, color: YH.textMuted }}>Adım</span>
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
              <button
                onClick={() => moveStep(i, -1)}
                disabled={i === 0}
                title="Yukarı taşı"
                style={{
                  background: '#fff',
                  border: `1px solid ${YH.border}`,
                  borderRadius: 7,
                  padding: '4px 8px',
                  cursor: i === 0 ? 'not-allowed' : 'pointer',
                  opacity: i === 0 ? 0.4 : 1,
                  fontSize: 12,
                  fontFamily: 'inherit',
                }}
              >
                ↑
              </button>
              <button
                onClick={() => moveStep(i, 1)}
                disabled={i === (taslak.steps || []).length - 1}
                title="Aşağı taşı"
                style={{
                  background: '#fff',
                  border: `1px solid ${YH.border}`,
                  borderRadius: 7,
                  padding: '4px 8px',
                  cursor: i === (taslak.steps || []).length - 1 ? 'not-allowed' : 'pointer',
                  opacity: i === (taslak.steps || []).length - 1 ? 0.4 : 1,
                  fontSize: 12,
                  fontFamily: 'inherit',
                }}
              >
                ↓
              </button>
              <button
                onClick={() => removeStep(i)}
                title="Adımı sil"
                style={{
                  background: YH.redLight,
                  border: `1px solid ${YH.red}30`,
                  color: YH.red,
                  borderRadius: 7,
                  padding: '4px 9px',
                  cursor: 'pointer',
                  fontSize: 12,
                  fontWeight: 600,
                  fontFamily: 'inherit',
                }}
              >
                Sil
              </button>
            </div>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: 10,
            }}
          >
            <div>
              <label style={labelStyle}>Adım başlığı *</label>
              <input
                value={s.title || ''}
                onChange={(e) => setStep(i, { title: e.target.value })}
                placeholder="ör. Başvuru & Kabul"
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Süre</label>
              <input
                value={s.duration || ''}
                onChange={(e) => setStep(i, { duration: e.target.value })}
                placeholder="ör. 1-2 Hafta"
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Sonuç</label>
              <input
                value={s.result || ''}
                onChange={(e) => setStep(i, { result: e.target.value })}
                placeholder="ör. Kabul yazısı alındı"
                style={inputStyle}
              />
            </div>
          </div>

          <div style={{ marginTop: 10 }}>
            <label style={labelStyle}>Açıklama</label>
            <textarea
              value={s.desc || ''}
              onChange={(e) => setStep(i, { desc: e.target.value })}
              rows={3}
              placeholder="Öğrencinin bu adımda ne yapması gerektiğini anlatın."
              style={{ ...inputStyle, resize: 'vertical' }}
            />
          </div>

          <div style={{ marginTop: 10 }}>
            <label style={labelStyle}>Uyarı / not (opsiyonel)</label>
            <input
              value={s.note || ''}
              onChange={(e) => setStep(i, { note: e.target.value })}
              placeholder="Sarı kutuda gösterilir."
              style={inputStyle}
            />
          </div>

          <div style={{ marginTop: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <span style={labelStyle}>Bağlantılar</span>
              <button
                onClick={() => addLink(i)}
                style={{
                  marginLeft: 'auto',
                  background: '#fff',
                  border: `1px solid ${YH.accentMid}`,
                  color: YH.accent,
                  borderRadius: 7,
                  padding: '3px 9px',
                  fontSize: 11.5,
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                + Bağlantı
              </button>
            </div>
            {(s.links || []).map((l, li) => (
              <div key={li} style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
                <input
                  value={l.label || ''}
                  onChange={(e) => setLink(i, li, { label: e.target.value })}
                  placeholder="Etiket"
                  style={{ ...inputStyle, flex: 1 }}
                />
                <input
                  value={l.url || ''}
                  onChange={(e) => setLink(i, li, { url: e.target.value })}
                  placeholder="https://… (boş bırakılabilir)"
                  style={{ ...inputStyle, flex: 1.6 }}
                />
                <button
                  onClick={() => removeLink(i, li)}
                  style={{
                    background: YH.redLight,
                    border: `1px solid ${YH.red}30`,
                    color: YH.red,
                    borderRadius: 7,
                    padding: '0 10px',
                    cursor: 'pointer',
                    fontSize: 13,
                    fontFamily: 'inherit',
                    flexShrink: 0,
                  }}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// Ana bileşen
// ══════════════════════════════════════════════════════════════
function YolHaritalariApp({ currentUser, activeDepartment }) {
  const [windowWidth, setWindowWidth] = useState(
    typeof window !== 'undefined' ? window.innerWidth : 1200
  );
  useEffect(() => {
    const onResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  const isMobile = windowWidth <= 768;

  // Yetki: bölüm yetkilisi ve üstü düzenleyebilir. Sade akademisyen ve
  // öğrenci yalnızca yayınlanmışları görür (sunucu da aynı kuralı uygular).
  const canEdit = !!(
    currentUser &&
    (currentUser.role === 'admin' ||
      currentUser.role === 'bolum_yetkilisi' ||
      currentUser.isDeptManager ||
      currentUser.isFacultyManager ||
      currentUser.isUniversityAdmin)
  );

  const [kayitlar, setKayitlar] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hata, setHata] = useState('');
  const [secili, setSecili] = useState(null);

  // Düzenleme durumu
  const [duzenlenen, setDuzenlenen] = useState(null); // docId | 'new' | null
  const [taslak, setTaslak] = useState(null);
  const [kaydediliyor, setKaydediliyor] = useState(false);
  const [silinen, setSilinen] = useState(null); // silme onayı bekleyen docId

  const moduller = useMemo(() => yhAllModules(), []);

  const yukle = useCallback(async () => {
    setLoading(true);
    setHata('');
    try {
      // Taze okuma: kaydettikten hemen sonra listenin güncel olması gerekiyor.
      const read = window.apiRead.fresh || window.apiRead;
      const list = (await read('yol_haritalari')) || [];
      setKayitlar(Array.isArray(list) ? list : []);
    } catch (e) {
      console.error('yol_haritalari okunamadı:', e);
      setHata('Yol haritaları yüklenemedi.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    yukle();
  }, [yukle]);

  // Kapsam: aktif bölümün haritaları + bölüm bilgisi olmayan (genel) haritalar.
  // Düzenleyemeyen kullanıcı yalnızca yayındakileri görür.
  const gorunen = useMemo(() => {
    return kayitlar
      .filter((h) => {
        const dep = h.departmentId || '';
        if (dep && activeDepartment && dep !== activeDepartment) return false;
        if (!canEdit && !h.yayinda) return false;
        return true;
      })
      .sort((a, b) => {
        const ml = (a.moduleLabel || '').localeCompare(b.moduleLabel || '', 'tr');
        if (ml !== 0) return ml;
        return (a.baslik || '').localeCompare(b.baslik || '', 'tr');
      });
  }, [kayitlar, activeDepartment, canEdit]);

  const yeniBaslat = () => {
    setTaslak(yhBosHarita('', '', activeDepartment || ''));
    setDuzenlenen('new');
  };

  const duzenleBaslat = (h) => {
    setTaslak({
      baslik: h.baslik || '',
      moduleId: h.moduleId || '',
      moduleLabel: h.moduleLabel || '',
      sekme: h.sekme || '',
      aciklama: h.aciklama || '',
      departmentId: h.departmentId || activeDepartment || '',
      yayinda: !!h.yayinda,
      steps:
        Array.isArray(h.steps) && h.steps.length ? h.steps.map((s) => ({ ...s })) : [yhBosAdim()],
    });
    setDuzenlenen(yhDocId(h));
  };

  const iptal = () => {
    setDuzenlenen(null);
    setTaslak(null);
    setHata('');
  };

  const kaydet = async () => {
    if (!taslak) return;
    if (!taslak.moduleId) {
      setHata('Modül seçmelisiniz.');
      return;
    }
    if (!String(taslak.baslik || '').trim()) {
      setHata('Başlık zorunludur.');
      return;
    }
    const steps = (taslak.steps || []).filter((s) => String(s.title || '').trim());
    if (steps.length === 0) {
      setHata('En az bir adım (başlıklı) eklemelisiniz.');
      return;
    }

    setKaydediliyor(true);
    setHata('');
    try {
      const payload = {
        baslik: String(taslak.baslik).trim(),
        moduleId: taslak.moduleId,
        moduleLabel: taslak.moduleLabel || '',
        sekme: String(taslak.sekme || '').trim(),
        aciklama: String(taslak.aciklama || '').trim(),
        departmentId: taslak.departmentId || activeDepartment || '',
        yayinda: !!taslak.yayinda,
        steps: steps.map((s) => ({
          id: s.id || yhUid(),
          title: String(s.title || '').trim(),
          duration: String(s.duration || '').trim(),
          result: String(s.result || '').trim(),
          desc: String(s.desc || '').trim(),
          note: String(s.note || '').trim(),
          links: (s.links || [])
            .filter((l) => String(l.label || '').trim())
            .map((l) => ({ label: String(l.label).trim(), url: String(l.url || '').trim() })),
        })),
        updatedAt: new Date().toISOString(),
        updatedBy: currentUser?.name || currentUser?.identifier || '',
      };

      if (duzenlenen === 'new') {
        payload.createdAt = payload.updatedAt;
        payload.createdBy = payload.updatedBy;
        await window.DBWrite.add('yol_haritalari', payload);
      } else {
        await window.DBWrite.set('yol_haritalari', duzenlenen, payload, true);
      }
      await yukle();
      setDuzenlenen(null);
      setTaslak(null);
    } catch (e) {
      console.error('yol haritası kaydedilemedi:', e);
      setHata(e.message || 'Kaydedilemedi.');
    } finally {
      setKaydediliyor(false);
    }
  };

  const sil = async (docId) => {
    setKaydediliyor(true);
    setHata('');
    try {
      await window.DBWrite.remove('yol_haritalari', docId);
      await yukle();
      setSilinen(null);
      if (duzenlenen === docId) iptal();
    } catch (e) {
      console.error('yol haritası silinemedi:', e);
      setHata(e.message || 'Silinemedi.');
    } finally {
      setKaydediliyor(false);
    }
  };

  // ── Render ──

  if (loading) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: YH.textMuted, fontSize: 13.5 }}>
        Yol haritaları yükleniyor…
      </div>
    );
  }

  return (
    <div
      style={{
        fontFamily: "'Inter', sans-serif",
        color: YH.text,
        maxWidth: 1400,
        margin: '0 auto',
        padding: '0 4px 40px',
      }}
    >
      {window.CakuBanner &&
        React.createElement(window.CakuBanner, {
          title: 'Yol Haritaları',
          subtitle: canEdit
            ? 'Modüller için adım adım rehberler oluşturun, düzenleyin ve yayınlayın'
            : 'Modüllerdeki süreçler için adım adım rehberler',
        })}

      {hata && (
        <div
          style={{
            background: YH.redLight,
            border: `1px solid ${YH.red}35`,
            color: '#991B1B',
            borderRadius: 10,
            padding: '10px 14px',
            fontSize: 13,
            marginBottom: 14,
          }}
        >
          {hata}
        </div>
      )}

      {/* ── Yetkili: yönetim listesi ── */}
      {canEdit && !duzenlenen && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: YH.navy }}>
              Yönetim ({gorunen.length})
            </span>
            <button
              onClick={yeniBaslat}
              style={{
                marginLeft: 'auto',
                background: YH.accent,
                color: '#fff',
                border: 'none',
                borderRadius: 9,
                padding: '9px 16px',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              + Yeni Yol Haritası
            </button>
          </div>

          {gorunen.length === 0 ? (
            <div
              style={{
                background: '#fff',
                border: `1px dashed ${YH.border}`,
                borderRadius: 12,
                padding: '28px 20px',
                textAlign: 'center',
                color: YH.textMuted,
                fontSize: 13,
                lineHeight: 1.6,
              }}
            >
              Henüz yol haritası oluşturulmadı.
              <br />
              “Yeni Yol Haritası” ile herhangi bir modül ve sekme için rehber yazabilirsiniz.
            </div>
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                gap: 10,
              }}
            >
              {gorunen.map((h) => {
                const id = yhDocId(h);
                return (
                  <div
                    key={id}
                    style={{
                      background: '#fff',
                      border: `1px solid ${YH.border}`,
                      borderRadius: 12,
                      padding: 14,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 11, color: YH.textMuted, fontWeight: 600 }}>
                          {h.moduleLabel || h.moduleId}
                          {h.sekme ? ' · ' + h.sekme : ''}
                        </div>
                        <div
                          style={{
                            fontSize: 14,
                            fontWeight: 700,
                            color: YH.navy,
                            marginTop: 2,
                            lineHeight: 1.35,
                          }}
                        >
                          {h.baslik || 'Adsız'}
                        </div>
                      </div>
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 600,
                          padding: '3px 8px',
                          borderRadius: 10,
                          background: h.yayinda ? YH.greenLight : '#F1F5F9',
                          color: h.yayinda ? YH.green : '#64748B',
                          flexShrink: 0,
                        }}
                      >
                        {h.yayinda ? 'Yayında' : 'Taslak'}
                      </span>
                    </div>

                    <div style={{ fontSize: 12, color: YH.textMuted, marginTop: 6 }}>
                      {(h.steps || []).length} adım
                    </div>

                    <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
                      <button
                        onClick={() => duzenleBaslat(h)}
                        style={{
                          background: YH.accentSoft,
                          color: YH.accent,
                          border: `1px solid ${YH.accentMid}`,
                          borderRadius: 8,
                          padding: '6px 12px',
                          fontSize: 12,
                          fontWeight: 600,
                          cursor: 'pointer',
                          fontFamily: 'inherit',
                        }}
                      >
                        Düzenle
                      </button>
                      {silinen === id ? (
                        <>
                          <button
                            onClick={() => sil(id)}
                            disabled={kaydediliyor}
                            style={{
                              background: YH.red,
                              color: '#fff',
                              border: 'none',
                              borderRadius: 8,
                              padding: '6px 12px',
                              fontSize: 12,
                              fontWeight: 600,
                              cursor: 'pointer',
                              fontFamily: 'inherit',
                            }}
                          >
                            Eminim, sil
                          </button>
                          <button
                            onClick={() => setSilinen(null)}
                            style={{
                              background: '#fff',
                              color: YH.textMuted,
                              border: `1px solid ${YH.border}`,
                              borderRadius: 8,
                              padding: '6px 12px',
                              fontSize: 12,
                              fontWeight: 600,
                              cursor: 'pointer',
                              fontFamily: 'inherit',
                            }}
                          >
                            Vazgeç
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => setSilinen(id)}
                          style={{
                            background: '#fff',
                            color: YH.red,
                            border: `1px solid ${YH.red}30`,
                            borderRadius: 8,
                            padding: '6px 12px',
                            fontSize: 12,
                            fontWeight: 600,
                            cursor: 'pointer',
                            fontFamily: 'inherit',
                          }}
                        >
                          Sil
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Yetkili: düzenleme formu ── */}
      {canEdit && duzenlenen && taslak && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: YH.navy }}>
              {duzenlenen === 'new' ? 'Yeni Yol Haritası' : 'Yol Haritasını Düzenle'}
            </span>
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
              <button
                onClick={iptal}
                style={{
                  background: '#fff',
                  color: YH.textMuted,
                  border: `1px solid ${YH.border}`,
                  borderRadius: 9,
                  padding: '9px 16px',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                İptal
              </button>
              <button
                onClick={kaydet}
                disabled={kaydediliyor}
                style={{
                  background: kaydediliyor ? '#9CA3AF' : YH.green,
                  color: '#fff',
                  border: 'none',
                  borderRadius: 9,
                  padding: '9px 18px',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: kaydediliyor ? 'not-allowed' : 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                {kaydediliyor ? 'Kaydediliyor…' : 'Kaydet'}
              </button>
            </div>
          </div>

          <YhDuzenle taslak={taslak} setTaslak={setTaslak} moduller={moduller} />
        </div>
      )}

      {/* ── Görüntüleme (herkes) ── */}
      {!duzenlenen && (
        <>
          {canEdit && gorunen.length > 0 && (
            <div
              style={{
                fontSize: 15,
                fontWeight: 700,
                color: YH.navy,
                margin: '4px 0 12px',
                paddingTop: 8,
                borderTop: `1px solid ${YH.border}`,
              }}
            >
              Öğrenci Görünümü
            </div>
          )}
          <YhGoruntule
            haritalar={canEdit ? gorunen : gorunen.filter((h) => h.yayinda)}
            secili={secili}
            onSec={setSecili}
            isMobile={isMobile}
          />
        </>
      )}
    </div>
  );
}

window.YolHaritalariApp = YolHaritalariApp;
