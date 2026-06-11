// ══════════════════════════════════════════════════════════════
// ÇAKÜ — Anket Modülü
//   • Yönetici (admin / bolum_yetkilisi): anket oluştur, role/gruba ata,
//     sonuçları gör. bolum_yetkilisi kendi bölümüne, admin seçtiği bölüme.
//   • Katılımcı (professor / student): kendisine atanan anketleri doldurur.
//   • Veriler gerçek DB'de tutulur: surveys / survey_assignments /
//     survey_responses (proje apiRead + DBWrite katmanı).
// ══════════════════════════════════════════════════════════════

const { useState, useEffect, useMemo, useCallback } = React;

const ANK = {
  primary: '#1B2A4A',
  accent: '#7C3AED',
  accentPale: '#F5F3FF',
  bg: '#FAFAFA',
  text: '#1F2937',
  textMuted: '#6B7280',
  border: '#E5E7EB',
  green: '#059669',
  greenLight: '#D1FAE5',
  red: '#DC2626',
  redLight: '#FEE2E2',
  amber: '#B45309',
  amberLight: '#FEF3C7',
  teal: '#0F766E',
  tealLight: '#CCFBF1',
  blue: '#2563EB',
  blueLight: '#DBEAFE',
};

const AIcon = ({ path, size = 18, color = 'currentColor' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    {Array.isArray(path) ? path.map((d, i) => <path key={i} d={d} />) : <path d={path} />}
  </svg>
);

// ─── Hazır anket şablonları ───────────────────────────────────────────────
const PRESET_SURVEYS = {
  akts: {
    title: 'AKTS İşyükü Değerlendirme Anketi',
    description: 'Derslerin kredi değerlerinin belirlenmesi amacıyla hazırlanmıştır.',
    infoFields: [
      { key: 'bolum', label: 'Bölüm' },
      { key: 'dersAdi', label: 'Dersin Adı' },
      { key: 'dersKodu', label: 'Dersin Kodu' },
    ],
    questions: [
      { id: 'q1a', type: 'yesno', text: 'Bu derse dönem içinde devam ettiniz mi?' },
      { id: 'q1b', type: 'hours0to5', text: 'Haftada kaç saat devam ettiniz?' },
      {
        id: 'q2a',
        type: 'yesno',
        text: 'Öğretim üyesi ya da araştırma görevlileriyle görüşerek yardım aldınız mı?',
      },
      { id: 'q2b', type: 'hours0to5', text: 'Haftada yaklaşık kaç saat görüştünüz?' },
      { id: 'q3a', type: 'yesno', text: 'Bu ders kapsamında ödev hazırladınız mı?' },
      { id: 'q3b', type: 'hours0to5', text: 'Kaç ödev hazırladınız?' },
      {
        id: 'q3c',
        type: 'hoursRange',
        text: 'Her bir ödevi hazırlamak için ortalama kaç saat harcadınız?',
      },
      { id: 'q4a', type: 'yesno', text: 'Bu ders kapsamında proje hazırladınız mı?' },
      { id: 'q4b', type: 'hours0to5', text: 'Kaç proje hazırladınız?' },
      {
        id: 'q4c',
        type: 'hoursRange',
        text: 'Her bir projeyi hazırlamak için ortalama kaç saat harcadınız?',
      },
      { id: 'q5a', type: 'yesno', text: 'Laboratuvar/atölye çalışmasına katıldınız mı?' },
      { id: 'q5b', type: 'hours0to5', text: 'Kaç laboratuvar/atölye çalışmasına katıldınız?' },
      {
        id: 'q5c',
        type: 'hoursRange',
        text: 'Her bir laboratuvar için ortalama kaç saat harcadınız?',
      },
      { id: 'q6a', type: 'yesno', text: 'Kısa sınav (quiz) yapıldı mı?' },
      { id: 'q6b', type: 'hours0to5', text: 'Kaç quize girdiniz?' },
      { id: 'q6c', type: 'hoursRange', text: 'Her bir quiz için ortalama kaç saat çalıştınız?' },
      { id: 'q7a', type: 'yesno', text: 'Birinci ara sınava katıldınız mı?' },
      {
        id: 'q7b',
        type: 'hoursExam',
        text: 'Birinci ara sınava hazırlanmak için yaklaşık kaç saat harcadınız?',
      },
      { id: 'q8a', type: 'yesno', text: 'İkinci ara sınav yapıldı mı ve katıldınız mı?' },
      {
        id: 'q8b',
        type: 'hoursExam',
        text: 'İkinci ara sınava hazırlanmak için yaklaşık kaç saat harcadınız?',
      },
      { id: 'q9a', type: 'yesno', text: 'Final sınavına katıldınız mı?' },
      {
        id: 'q9b',
        type: 'hoursExam',
        text: 'Final sınavına hazırlanmak için yaklaşık kaç saat harcadınız?',
      },
    ],
  },
  bolum: {
    title: 'Bölüm Memnuniyet Anketi',
    description: 'Eğitim ve öğretim faaliyetlerinin iyileştirilmesi amacıyla hazırlanmıştır.',
    infoFields: [
      { key: 'cinsiyet', label: 'Cinsiyet' },
      { key: 'sinif', label: 'Sınıf' },
    ],
    questions: [
      'Bölüm derslerinin içeriklerinin yeterli olduğunu düşünüyorum.',
      'Bölüm dersleriyle ilgili dokümanların yeterli olduğunu düşünüyorum.',
      'Bölüm içi seçmeli derslerin sayı ve içeriklerinin yeterli olduğunu düşünüyorum.',
      'Bölüm dışı seçmeli derslerin yeterli olduğunu düşünüyorum.',
      'Yabancı dil derslerinin yeterli olduğunu düşünüyorum.',
      'Bölüm derslerinde öğretilen bilgisayar programlarının yeterli olduğunu düşünüyorum.',
      'Bölüm akademik kadrosunun eğitim ve öğretim açısından yeterli olduğunu düşünüyorum.',
      'Bölüm öğretim elemanlarının öğrencilere karşı tutum ve yaklaşımlarının olumlu olduğunu düşünüyorum.',
      'Bölüm yöneticilerinin öğrencilere karşı tutum ve yaklaşımlarının olumlu olduğunu düşünüyorum.',
      'Bölüm idari personelinin öğrencilere karşı tutum ve yaklaşımlarının olumlu olduğunu düşünüyorum.',
      'Akademik danışmanımın yönlendirme ve sorun çözme konusunda yeterli olduğunu düşünüyorum.',
      'Bölüm dersliklerinin fiziksel donanımının yeterli olduğunu düşünüyorum.',
      'Bölüm dersliklerinin öğrenci kapasitesi yeterlidir.',
      'Bölüm bilgisayar laboratuvarının donanım açısından yeterli olduğunu düşünüyorum.',
      'Bölümümde aldığım derslerin iş yaşamımda beni öne çıkartacağını düşünüyorum.',
      'Bölüm haftalık ders programı ve ders saatlerinin uygun olduğunu düşünüyorum.',
      'Bölümün yurt dışı eğitim ve staj olanaklarının yeterli olduğunu düşünüyorum.',
      'Öğrenci topluluklarının gelişim açısından yeterli olduğunu düşünüyorum.',
      'Fakülte çevre düzenlemelerinin ders aralarında vakit geçirmek için yeterli olduğunu düşünüyorum.',
      'Mevcut sınav sistemi ve sınavların öğrenciyi ölçme gücünün yeterli olduğunu düşünüyorum.',
      'Fakültenin engelli öğrencilere yönelik hizmetlerini yeterli buluyorum.',
      'Uzaktan eğitim sistemlerinin kalitesini yeterli buluyorum.',
      'Genel olarak bölümümden memnunum.',
    ],
  },
  ders: {
    title: 'Ders Değerlendirme Anketi',
    description:
      'Ders ve öğretim elemanına yönelik eğitim faaliyetlerinin iyileştirilmesi amacıyla hazırlanmıştır.',
    infoFields: [
      { key: 'cinsiyet', label: 'Cinsiyet' },
      { key: 'sinif', label: 'Sınıf' },
    ],
    questions: [
      'Ders içerik, kapsam ve amaç yönü ile dönem başında ayrıntılı olarak anlatılmıştır.',
      'Ders için tanımlanmış öğrenme çıktıları yeterli ölçüde açık ve ders hedefleriyle uyumludur.',
      'Ders bir yarıyıl için yeterli kapsam ve zenginliktedir.',
      'Ders ile ilgili kaynak ve dokümanlar yeterlidir.',
      'Ders içeriği ile bu ders için ayrılan zaman uygundur.',
      'Ders önceden ilan edilen programa uygun olarak yürütülmektedir.',
      'Derslere öğrencilerin aktif katılımını sağlayan yöntem ve teknikler kullanılmaktadır.',
      'Derslerde verilen ödevler derslere büyük katkı sağlamaktadır.',
      'Sorduğum soruların cevabını ders öğretim elemanından yeterince alabiliyorum.',
      'Sınavlar dışında quiz, proje, ödev gibi çalışmalara önem verilmektedir.',
      'Öğretim elemanı dersi amaçlarına ve haftalık konu dağılımına uygun olarak yürütmüştür.',
      'Dersin öğretim elemanının öğrencilere karşı tutum ve yaklaşımı olumludur.',
      'Öğretim elemanına görüşme saatleri sırasında dersle ilgili sorularım için erişilebilmekteyim.',
      'Öğretim elemanı derse hazırlıklı gelmektedir.',
      'Öğretim elemanının derse hâkimiyeti yeterlidir.',
      'Öğretim elemanı öğrencinin seviyesine inebilmektedir.',
      'Öğretim elemanının öğrenciler ile sınıf içinde ve dışında iletişimi çok iyidir.',
      'Sınavlarda sorulan sorular ders içeriğine uygun şekilde hazırlanmıştır.',
      'Sınav için verilen süre yeterlidir.',
      'Sınav sonrası sınav soru ve cevap kâğıdıma ulaşabilmekteyim.',
      'Ölçme ve değerlendirmede öğretim elemanı objektif davranmaktadır.',
      'Öğretim elemanının bu ders ile ilgili genel performansını çok başarılı buluyorum.',
      'Bu dersin gelecekteki meslek hayatıma olumlu katkılarının olacağını düşünüyorum.',
      'Genel olarak dersten çok yararlandım ve diğer öğrencilere tavsiye ederim.',
    ],
  },
};

// Likert tabanlı preset'lerin sorularını {id,type,text} formuna çevir + sonuna textarea
function expandPreset(preset) {
  const out = {
    title: preset.title,
    description: preset.description,
    infoFields: preset.infoFields,
    questions: [],
  };
  preset.questions.forEach((q, i) => {
    if (typeof q === 'string') out.questions.push({ id: 'q' + (i + 1), type: 'likert', text: q });
    else out.questions.push(q);
  });
  // Memnuniyet/ders anketlerine serbest yorum alanı ekle
  if (preset.questions.every((q) => typeof q === 'string')) {
    out.questions.push({
      id: 'yorum',
      type: 'textarea',
      text: 'Paylaşmak istediğiniz başka düşünceleriniz var ise belirtiniz.',
    });
  }
  return out;
}

// Katılımcı hedef rolleri (proje rolleri)
const TARGET_ROLES = [
  {
    id: 'student',
    label: 'Öğrenci',
    sub: 'Lisans / ön lisans',
    icon: 'M12 14l9-5-9-5-9 5 9 5z M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z',
  },
  {
    id: 'professor',
    label: 'Akademisyen',
    sub: 'Öğretim üyesi / görevli',
    icon: 'M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25',
  },
];
const TARGET_GROUPS = {
  student: ['1. sınıf', '2. sınıf', '3. sınıf', '4. sınıf', 'Tüm öğrenciler'],
  professor: [
    'Öğretim üyeleri',
    'Araştırma görevlileri',
    'Öğretim görevlileri',
    'Tüm akademik personel',
  ],
};
const ROLE_LABEL = { student: 'Öğrenci', professor: 'Akademisyen' };

// ══════════════════════════════════════════════════════════════
// Ana bileşen — role göre yönetici / katılımcı görünümü
// ══════════════════════════════════════════════════════════════
function AnketModulu({ currentUser, activeDepartment, departmentInfo }) {
  const role = currentUser?.role;
  const isManager = role === 'admin' || role === 'bolum_yetkilisi';
  const responsive = window.useResponsive ? window.useResponsive() : { val: (_a, _b, c) => c };

  return isManager ? (
    <YoneticiGorunumu
      currentUser={currentUser}
      activeDepartment={activeDepartment}
      departmentInfo={departmentInfo}
      responsive={responsive}
    />
  ) : (
    <KatilimciGorunumu
      currentUser={currentUser}
      activeDepartment={activeDepartment}
      responsive={responsive}
    />
  );
}

// ─── Ortak: küçük mesaj barı ───────────────────────────────────────────────
function useToast() {
  const [msg, setMsg] = useState({ text: '', kind: '' });
  const show = (text, kind = 'success') => {
    setMsg({ text, kind });
    setTimeout(() => setMsg({ text: '', kind: '' }), 2800);
  };
  const node = msg.text ? (
    <div
      style={{
        position: 'fixed',
        bottom: 20,
        right: 20,
        zIndex: 1200,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '11px 18px',
        borderRadius: 10,
        background: msg.kind === 'error' ? ANK.red : ANK.accent,
        color: 'white',
        fontSize: 13,
        fontWeight: 600,
        boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
      }}
    >
      <AIcon path="M5 13l4 4L19 7" size={15} /> {msg.text}
    </div>
  ) : null;
  return { show, node };
}

// ══════════════════════════════════════════════════════════════
// YÖNETİCİ
// ══════════════════════════════════════════════════════════════
function YoneticiGorunumu({ currentUser, activeDepartment, departmentInfo, responsive }) {
  const [tab, setTab] = useState('anketler');
  const [surveys, setSurveys] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  const isAdmin = currentUser?.role === 'admin';
  const FACULTY_DEPARTMENTS = window.DEPARTMENTS || [];

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [s, a] = await Promise.all([
        window.apiRead('surveys'),
        window.apiRead('survey_assignments'),
      ]);
      setSurveys(
        (s || []).slice().sort((x, y) => (x.title || '').localeCompare(y.title || '', 'tr'))
      );
      setAssignments(a || []);
    } catch (e) {
      console.error('Anketler yüklenemedi:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);
  useEffect(() => {
    const h = () => load();
    ['surveys', 'survey_assignments', 'survey_responses'].forEach((c) =>
      window.addEventListener('realtime:' + c, h)
    );
    return () =>
      ['surveys', 'survey_assignments', 'survey_responses'].forEach((c) =>
        window.removeEventListener('realtime:' + c, h)
      );
  }, [load]);

  const addSurvey = async (survey) => {
    await window.DBWrite.add('surveys', { ...survey, createdBy: currentUser?.name || '' });
    await load();
    toast.show(survey.title + ' yüklendi');
  };
  const removeSurvey = async (id) => {
    if (!confirm('Bu anket ve atamaları silinecek. Emin misiniz?')) return;
    await window.DBWrite.remove('surveys', id);
    // İlgili atamaları da temizle
    const rel = assignments.filter((a) => a.surveyId === id);
    for (const a of rel) await window.DBWrite.remove('survey_assignments', a.id);
    await load();
    toast.show('Anket silindi');
  };
  const saveAssignment = async (data) => {
    await window.DBWrite.add('survey_assignments', {
      ...data,
      assignedBy: currentUser?.name || '',
      assignedByRole: currentUser?.role || '',
    });
    await load();
    toast.show('Anket atandı');
  };
  const removeAssignment = async (id) => {
    await window.DBWrite.remove('survey_assignments', id);
    await load();
    toast.show('Atama kaldırıldı');
  };

  const tabs = [
    {
      key: 'anketler',
      label: 'Anketler',
      icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
    },
    { key: 'atama', label: 'Rol Atama', icon: 'M12 19l9 2-9-18-9 18 9-2zm0 0v-8' },
    {
      key: 'sonuclar',
      label: 'Sonuçlar',
      icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
    },
  ];

  return (
    <div style={{ fontFamily: "'Inter', sans-serif" }}>
      <div style={{ marginBottom: 16 }}>
        <h1
          style={{
            fontSize: responsive.val(20, 24, 28),
            fontWeight: 700,
            color: ANK.primary,
            margin: 0,
          }}
        >
          Anketler
        </h1>
        <p style={{ fontSize: 13, color: ANK.textMuted, marginTop: 4 }}>
          {isAdmin ? 'Fakülte' : departmentInfo?.name || 'Bölüm'} yönetici paneli — anket oluştur,
          ata ve sonuçları izle
        </p>
      </div>

      {/* Tabs */}
      <div
        style={{
          display: 'flex',
          gap: 4,
          borderBottom: '1px solid ' + ANK.border,
          marginBottom: 20,
          flexWrap: 'wrap',
        }}
      >
        {tabs.map((t) => {
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 7,
                padding: '10px 16px',
                border: 'none',
                background: 'transparent',
                borderBottom: '2px solid ' + (active ? ANK.accent : 'transparent'),
                color: active ? ANK.primary : ANK.textMuted,
                marginBottom: -1,
                fontSize: 13,
                fontWeight: active ? 600 : 500,
                cursor: 'pointer',
                fontFamily: "'Inter', sans-serif",
              }}
            >
              <AIcon path={t.icon} size={16} /> {t.label}
            </button>
          );
        })}
      </div>

      {loading ? (
        <Spinner />
      ) : (
        <>
          {tab === 'anketler' && (
            <AnketlerPaneli
              surveys={surveys}
              assignments={assignments}
              onAdd={addSurvey}
              onRemove={removeSurvey}
            />
          )}
          {tab === 'atama' && (
            <AtamaPaneli
              surveys={surveys}
              assignments={assignments}
              onAssign={saveAssignment}
              onRemoveAssignment={removeAssignment}
              isAdmin={isAdmin}
              activeDepartment={activeDepartment}
              departmentInfo={departmentInfo}
              departments={FACULTY_DEPARTMENTS}
            />
          )}
          {tab === 'sonuclar' && <SonuclarPaneli surveys={surveys} />}
        </>
      )}

      {toast.node}
    </div>
  );
}

const cardStyle = {
  background: 'white',
  borderRadius: 12,
  border: '1px solid ' + ANK.border,
  padding: 20,
};
const inputStyle = {
  width: '100%',
  padding: '10px 12px',
  borderRadius: 8,
  border: '1px solid ' + ANK.border,
  fontSize: 13,
  outline: 'none',
  fontFamily: "'Inter', sans-serif",
  boxSizing: 'border-box',
  background: 'white',
};
const labelStyle = {
  display: 'block',
  fontSize: 11,
  fontWeight: 600,
  color: ANK.textMuted,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  marginBottom: 8,
};

function Spinner() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: 50 }}>
      <div
        style={{
          width: 34,
          height: 34,
          border: '3px solid ' + ANK.border,
          borderTopColor: ANK.accent,
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
        }}
      />
    </div>
  );
}

// ─── Anketler paneli ───────────────────────────────────────────────────────
function AnketlerPaneli({ surveys, assignments, onAdd, onRemove }) {
  const addPreset = async (key) => {
    if (surveys.find((s) => s.presetKey === key)) return;
    await onAdd({ ...expandPreset(PRESET_SURVEYS[key]), presetKey: key });
  };
  const presetUsed = (key) => !!surveys.find((s) => s.presetKey === key);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={cardStyle}>
        <p style={labelStyle}>Hazır anket şablonları</p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {Object.entries(PRESET_SURVEYS).map(([key, s]) => {
            const used = presetUsed(key);
            return (
              <button
                key={key}
                onClick={() => addPreset(key)}
                disabled={used}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '8px 14px',
                  borderRadius: 8,
                  border: '1px solid ' + ANK.border,
                  background: used ? '#F9FAFB' : 'white',
                  color: used ? ANK.textMuted : ANK.primary,
                  fontSize: 13,
                  fontWeight: 500,
                  cursor: used ? 'not-allowed' : 'pointer',
                  opacity: used ? 0.6 : 1,
                  fontFamily: "'Inter', sans-serif",
                }}
              >
                <AIcon path={used ? 'M5 13l4 4L19 7' : 'M12 5v14M5 12h14'} size={14} />
                {s.title.split(' ').slice(0, 2).join(' ')}
              </button>
            );
          })}
        </div>
      </div>

      <p style={labelStyle}>Yüklü anketler ({surveys.length})</p>
      {surveys.length === 0 ? (
        <EmptyState text="Henüz anket yüklenmedi. Yukarıdaki şablonlardan ekleyin." />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {surveys.map((s) => {
            const ac = assignments.filter((a) => a.surveyId === s.id).length;
            return (
              <div
                key={s.id}
                style={{
                  ...cardStyle,
                  padding: 14,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                }}
              >
                <div
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 9,
                    background: ANK.accentPale,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <AIcon
                    path="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    size={18}
                    color={ANK.accent}
                  />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p
                    style={{
                      fontSize: 14,
                      fontWeight: 600,
                      color: ANK.primary,
                      margin: 0,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {s.title}
                  </p>
                  <p style={{ fontSize: 12, color: ANK.textMuted, margin: '2px 0 0' }}>
                    {s.questions?.length || 0} soru
                    {ac > 0 && (
                      <span
                        style={{
                          marginLeft: 8,
                          padding: '1px 8px',
                          borderRadius: 10,
                          background: ANK.blueLight,
                          color: ANK.blue,
                          fontSize: 11,
                          fontWeight: 600,
                        }}
                      >
                        {ac} atama
                      </span>
                    )}
                  </p>
                </div>
                <button onClick={() => onRemove(s.id)} title="Sil" style={iconBtn(ANK.red)}>
                  <AIcon
                    path="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M1 7h22M9 7V4a1 1 0 011-1h4a1 1 0 011 1v3"
                    size={14}
                    color={ANK.red}
                  />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const iconBtn = (color) => ({
  width: 30,
  height: 30,
  borderRadius: 7,
  border: '1px solid ' + ANK.border,
  background: 'white',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  padding: 0,
  color,
});

function EmptyState({ text }) {
  return (
    <div
      style={{ ...cardStyle, textAlign: 'center', padding: 40, color: ANK.textMuted, fontSize: 13 }}
    >
      {text}
    </div>
  );
}

// ─── Atama paneli ──────────────────────────────────────────────────────────
function AtamaPaneli({
  surveys,
  assignments,
  onAssign,
  onRemoveAssignment,
  isAdmin,
  activeDepartment,
  departmentInfo,
  departments,
}) {
  const [surveyId, setSurveyId] = useState('');
  const [targetRole, setTargetRole] = useState(null);
  const [groups, setGroups] = useState([]);
  const [dueDate, setDueDate] = useState('');
  const [deptId, setDeptId] = useState(isAdmin ? '' : activeDepartment || '');

  const deptName = isAdmin
    ? departments.find((d) => d.id === deptId)?.name || ''
    : departmentInfo?.name || '';

  const toggleGroup = (g) =>
    setGroups((p) => (p.includes(g) ? p.filter((x) => x !== g) : [...p, g]));

  const canSubmit = surveyId && targetRole && groups.length && (isAdmin ? deptId : true);

  const submit = async () => {
    if (!canSubmit) return;
    const survey = surveys.find((s) => s.id === surveyId);
    // Her grup için ayrı atama kaydı
    for (const g of groups) {
      await onAssign({
        surveyId,
        surveyTitle: survey?.title || '',
        targetRole,
        targetGroup: g,
        dueDate: dueDate || '—',
        departmentId: isAdmin ? deptId : activeDepartment || '',
        departmentName: deptName,
      });
    }
    setSurveyId('');
    setTargetRole(null);
    setGroups([]);
    setDueDate('');
    if (isAdmin) setDeptId('');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ ...cardStyle, display: 'flex', flexDirection: 'column', gap: 18 }}>
        {/* Anket seç */}
        <div>
          <label style={labelStyle}>Anket seç</label>
          <select
            value={surveyId}
            onChange={(e) => setSurveyId(e.target.value)}
            style={{ ...inputStyle, cursor: 'pointer' }}
          >
            <option value="">— Anket seçin —</option>
            {surveys.map((s) => (
              <option key={s.id} value={s.id}>
                {s.title}
              </option>
            ))}
          </select>
        </div>

        {/* Bölüm */}
        <div>
          <label style={labelStyle}>{isAdmin ? 'Bölüm' : 'Bölüm (otomatik)'}</label>
          {isAdmin ? (
            <select
              value={deptId}
              onChange={(e) => setDeptId(e.target.value)}
              style={{ ...inputStyle, cursor: 'pointer' }}
            >
              <option value="">— Bölüm seçin —</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          ) : (
            <input value={deptName} disabled style={{ ...inputStyle, background: '#F3F4F6' }} />
          )}
        </div>

        {/* Hedef rol */}
        <div>
          <label style={labelStyle}>Hedef rol</label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {TARGET_ROLES.map((r) => {
              const active = targetRole === r.id;
              return (
                <button
                  key={r.id}
                  onClick={() => {
                    setTargetRole(r.id);
                    setGroups([]);
                  }}
                  style={{
                    padding: 14,
                    borderRadius: 10,
                    textAlign: 'left',
                    cursor: 'pointer',
                    border: '1px solid ' + (active ? ANK.accent : ANK.border),
                    background: active ? ANK.accentPale : 'white',
                    fontFamily: "'Inter', sans-serif",
                  }}
                >
                  <AIcon path={r.icon} size={20} color={active ? ANK.accent : ANK.textMuted} />
                  <p
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: ANK.primary,
                      margin: '6px 0 2px',
                    }}
                  >
                    {r.label}
                  </p>
                  <p style={{ fontSize: 11, color: ANK.textMuted, margin: 0 }}>{r.sub}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Hedef gruplar */}
        {targetRole && (
          <div>
            <label style={labelStyle}>Hedef grup</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {TARGET_GROUPS[targetRole].map((g) => (
                <label
                  key={g}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '9px 12px',
                    borderRadius: 8,
                    border: '1px solid ' + ANK.border,
                    cursor: 'pointer',
                    fontSize: 13,
                    color: ANK.text,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={groups.includes(g)}
                    onChange={() => toggleGroup(g)}
                  />
                  {g}
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Son tarih + ata */}
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, flexWrap: 'wrap' }}>
          <div>
            <label style={labelStyle}>Son tarih</label>
            <input
              type="text"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              placeholder="ör. 31.01.2026"
              style={{ ...inputStyle, width: 170 }}
            />
          </div>
          <button
            onClick={submit}
            disabled={!canSubmit}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 18px',
              borderRadius: 8,
              border: 'none',
              background: ANK.accent,
              color: 'white',
              fontSize: 13,
              fontWeight: 600,
              cursor: canSubmit ? 'pointer' : 'not-allowed',
              opacity: canSubmit ? 1 : 0.45,
            }}
          >
            <AIcon path="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" size={15} /> Anketi ata
          </button>
        </div>
      </div>

      {assignments.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <p style={labelStyle}>Mevcut atamalar ({assignments.length})</p>
          {assignments.map((a) => (
            <div
              key={a.id}
              style={{ ...cardStyle, padding: 14, display: 'flex', alignItems: 'center', gap: 12 }}
            >
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 9,
                  background: ANK.accentPale,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <AIcon path="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" size={18} color={ANK.accent} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p
                  style={{
                    fontSize: 14,
                    fontWeight: 600,
                    color: ANK.primary,
                    margin: 0,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {a.surveyTitle}
                </p>
                <p style={{ fontSize: 12, color: ANK.textMuted, margin: '2px 0 0' }}>
                  <span
                    style={{
                      padding: '1px 7px',
                      borderRadius: 9,
                      fontSize: 11,
                      fontWeight: 600,
                      marginRight: 6,
                      background: a.targetRole === 'student' ? ANK.accentPale : ANK.tealLight,
                      color: a.targetRole === 'student' ? ANK.accent : ANK.teal,
                    }}
                  >
                    {ROLE_LABEL[a.targetRole] || a.targetRole}
                  </span>
                  {a.targetGroup}
                  {a.departmentName ? ' · ' + a.departmentName : ''} · Son: {a.dueDate}
                </p>
              </div>
              <button onClick={() => onRemoveAssignment(a.id)} title="Sil" style={iconBtn(ANK.red)}>
                <AIcon
                  path="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M1 7h22M9 7V4a1 1 0 011-1h4a1 1 0 011 1v3"
                  size={14}
                  color={ANK.red}
                />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Sonuçlar paneli ───────────────────────────────────────────────────────
function SonuclarPaneli({ surveys }) {
  const [surveyId, setSurveyId] = useState('');
  const [responses, setResponses] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!surveyId) {
      setResponses([]);
      return;
    }
    setLoading(true);
    window
      .apiRead('survey_responses')
      .then((all) => setResponses((all || []).filter((r) => r.surveyId === surveyId)))
      .finally(() => setLoading(false));
  }, [surveyId]);

  const survey = surveys.find((s) => s.id === surveyId);
  const likertQs = (survey?.questions || []).filter((q) => q.type === 'likert');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={cardStyle}>
        <label style={labelStyle}>Anket seç</label>
        <select
          value={surveyId}
          onChange={(e) => setSurveyId(e.target.value)}
          style={{ ...inputStyle, cursor: 'pointer' }}
        >
          <option value="">— Anket seçin —</option>
          {surveys.map((s) => (
            <option key={s.id} value={s.id}>
              {s.title}
            </option>
          ))}
        </select>
      </div>

      {surveyId &&
        (loading ? (
          <Spinner />
        ) : responses.length === 0 ? (
          <EmptyState text="Bu anket için henüz yanıt yok." />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
              {[
                { label: 'Toplam yanıt', value: responses.length },
                {
                  label: 'Son yanıt',
                  value: (responses[responses.length - 1]?.submittedAt || '').slice(0, 10) || '—',
                },
              ].map((k) => (
                <div key={k.label} style={{ ...cardStyle, padding: 16 }}>
                  <p style={{ fontSize: 12, color: ANK.textMuted, margin: 0 }}>{k.label}</p>
                  <p
                    style={{ fontSize: 24, fontWeight: 700, color: ANK.primary, margin: '4px 0 0' }}
                  >
                    {k.value}
                  </p>
                </div>
              ))}
            </div>

            {likertQs.length > 0 && (
              <div style={{ ...cardStyle, display: 'flex', flexDirection: 'column', gap: 14 }}>
                <p style={labelStyle}>Likert ortalamaları (1–5)</p>
                {likertQs.map((q) => {
                  const vals = responses
                    .map((r) => parseInt(r.answers?.[q.id] || 0))
                    .filter((v) => v > 0);
                  const avg = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
                  const pct = Math.round((avg / 5) * 100);
                  return (
                    <div key={q.id}>
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          gap: 12,
                          fontSize: 12,
                          marginBottom: 4,
                        }}
                      >
                        <span style={{ color: ANK.textMuted, flex: 1 }}>
                          {q.text.length > 80 ? q.text.slice(0, 80) + '…' : q.text}
                        </span>
                        <strong style={{ color: ANK.accent }}>{avg.toFixed(1)}</strong>
                      </div>
                      <div
                        style={{
                          height: 6,
                          background: '#F3F4F6',
                          borderRadius: 4,
                          overflow: 'hidden',
                        }}
                      >
                        <div
                          style={{
                            height: '100%',
                            width: pct + '%',
                            background: ANK.accent,
                            borderRadius: 4,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ))}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// KATILIMCI
// ══════════════════════════════════════════════════════════════
function KatilimciGorunumu({ currentUser, activeDepartment, responsive }) {
  const [assignments, setAssignments] = useState([]);
  const [surveys, setSurveys] = useState([]);
  const [myResponses, setMyResponses] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  const myRole = currentUser?.role; // 'student' | 'professor'
  const myId =
    currentUser?.id || currentUser?._id || currentUser?.identifier || currentUser?.name || 'anon';

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [a, s, r] = await Promise.all([
        window.apiRead('survey_assignments'),
        window.apiRead('surveys'),
        window.apiRead('survey_responses'),
      ]);
      setAssignments(a || []);
      setSurveys(s || []);
      setMyResponses((r || []).filter((x) => x.userId === myId));
    } catch (e) {
      console.error('Anketler yüklenemedi:', e);
    } finally {
      setLoading(false);
    }
  }, [myId]);

  useEffect(() => {
    load();
  }, [load]);
  useEffect(() => {
    const h = () => load();
    ['surveys', 'survey_assignments'].forEach((c) => window.addEventListener('realtime:' + c, h));
    return () =>
      ['surveys', 'survey_assignments'].forEach((c) =>
        window.removeEventListener('realtime:' + c, h)
      );
  }, [load]);

  // Bana atanmış anketler: rolüm + (bölüm kısıtı yoksa ya da bölümüm eşleşiyorsa)
  const myAssignments = useMemo(() => {
    const seen = new Set();
    return assignments.filter((a) => {
      if (a.targetRole !== myRole) return false;
      if (a.departmentId && activeDepartment && a.departmentId !== activeDepartment) return false;
      if (seen.has(a.surveyId)) return false; // aynı anket birden fazla gruba atanmışsa tek göster
      seen.add(a.surveyId);
      return true;
    });
  }, [assignments, myRole, activeDepartment]);

  const completed = (surveyId) => myResponses.some((r) => r.surveyId === surveyId);

  const submit = async (surveyId, answers) => {
    await window.DBWrite.add('survey_responses', {
      surveyId,
      userId: myId,
      role: myRole,
      answers,
      submittedAt: new Date().toISOString(),
    });
    setActiveId(null);
    await load();
    toast.show('Anket gönderildi. Teşekkürler!');
  };

  if (loading) return <Spinner />;

  if (activeId) {
    const survey = surveys.find((s) => s.id === activeId);
    if (!survey) {
      setActiveId(null);
      return null;
    }
    return (
      <>
        <AnketDoldurma
          survey={survey}
          onSubmit={submit}
          onCancel={() => setActiveId(null)}
          responsive={responsive}
        />
        {toast.node}
      </>
    );
  }

  return (
    <div style={{ fontFamily: "'Inter', sans-serif" }}>
      <div style={{ marginBottom: 16 }}>
        <h1
          style={{
            fontSize: responsive.val(20, 24, 28),
            fontWeight: 700,
            color: ANK.primary,
            margin: 0,
          }}
        >
          Anketlerim
        </h1>
        <p style={{ fontSize: 13, color: ANK.textMuted, marginTop: 4 }}>
          Size atanan anketleri doldurun
        </p>
      </div>

      {myAssignments.length === 0 ? (
        <EmptyState text="Size atanmış anket bulunmuyor." />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {myAssignments.map((a) => {
            const survey = surveys.find((s) => s.id === a.surveyId);
            if (!survey) return null;
            const done = completed(a.surveyId);
            return (
              <div
                key={a.id}
                onClick={() => !done && setActiveId(a.surveyId)}
                style={{
                  ...cardStyle,
                  padding: 16,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 14,
                  cursor: done ? 'default' : 'pointer',
                  opacity: done ? 0.65 : 1,
                  borderColor: done ? ANK.border : ANK.border,
                }}
              >
                <div
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: 11,
                    background: ANK.accentPale,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <AIcon
                    path="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
                    size={20}
                    color={ANK.accent}
                  />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 14, fontWeight: 600, color: ANK.primary, margin: 0 }}>
                    {survey.title}
                  </p>
                  <p style={{ fontSize: 12, color: ANK.textMuted, margin: '2px 0 0' }}>
                    {survey.questions?.length || 0} soru · Son: {a.dueDate}
                  </p>
                </div>
                {done ? (
                  <span
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 5,
                      padding: '4px 10px',
                      borderRadius: 20,
                      background: ANK.tealLight,
                      color: ANK.teal,
                      fontSize: 12,
                      fontWeight: 600,
                    }}
                  >
                    <AIcon path="M5 13l4 4L19 7" size={12} /> Tamamlandı
                  </span>
                ) : (
                  <span
                    style={{
                      padding: '4px 10px',
                      borderRadius: 20,
                      background: ANK.amberLight,
                      color: ANK.amber,
                      fontSize: 12,
                      fontWeight: 600,
                    }}
                  >
                    Bekliyor
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}

      {toast.node}
    </div>
  );
}

// ─── Anket doldurma ekranı ─────────────────────────────────────────────────
function AnketDoldurma({ survey, onSubmit, onCancel }) {
  const [answers, setAnswers] = useState({});
  const [info, setInfo] = useState({});
  const [saving, setSaving] = useState(false);

  const setAns = (id, v) => setAnswers((p) => ({ ...p, [id]: v }));

  const required = survey.questions.filter((q) => q.type !== 'textarea');
  const answered = required.filter((q) => answers[q.id] != null && answers[q.id] !== '').length;
  const pct = required.length ? Math.round((answered / required.length) * 100) : 100;

  const submit = async () => {
    setSaving(true);
    try {
      await onSubmit(survey.id, { ...info, ...answers });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ fontFamily: "'Inter', sans-serif" }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
        <button
          onClick={onCancel}
          style={{
            ...iconBtn(ANK.textMuted),
            width: 'auto',
            padding: '7px 12px',
            gap: 6,
            display: 'flex',
            alignItems: 'center',
            fontSize: 13,
            fontFamily: "'Inter', sans-serif",
          }}
        >
          <AIcon path="M15 19l-7-7 7-7" size={15} color={ANK.textMuted} /> Geri
        </button>
        <span
          style={{
            fontSize: 13,
            color: ANK.textMuted,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {survey.title}
        </span>
      </div>

      <div
        style={{
          height: 5,
          background: '#F3F4F6',
          borderRadius: 4,
          overflow: 'hidden',
          marginBottom: 16,
        }}
      >
        <div
          style={{
            height: '100%',
            width: pct + '%',
            background: ANK.accent,
            borderRadius: 4,
            transition: 'width 0.3s',
          }}
        />
      </div>

      <div style={{ ...cardStyle, display: 'flex', flexDirection: 'column', gap: 24 }}>
        <div style={{ borderBottom: '1px solid #F3F4F6', paddingBottom: 16 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: ANK.primary, margin: '0 0 4px' }}>
            {survey.title}
          </h2>
          <p style={{ fontSize: 13, color: ANK.textMuted, margin: 0 }}>{survey.description}</p>
        </div>

        {survey.infoFields?.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {survey.infoFields.map((f) => (
              <div key={f.key}>
                <label
                  style={{ fontSize: 12, color: ANK.textMuted, display: 'block', marginBottom: 4 }}
                >
                  {f.label}
                </label>
                <input
                  value={info[f.key] || ''}
                  onChange={(e) => setInfo((p) => ({ ...p, [f.key]: e.target.value }))}
                  placeholder={f.label}
                  style={inputStyle}
                />
              </div>
            ))}
          </div>
        )}

        {survey.questions.map((q, i) => (
          <SoruBilesen key={q.id} soru={q} numara={i + 1} deger={answers[q.id]} onChange={setAns} />
        ))}

        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: 10,
            borderTop: '1px solid #F3F4F6',
            paddingTop: 16,
          }}
        >
          <button
            onClick={onCancel}
            style={{
              padding: '10px 18px',
              borderRadius: 8,
              border: '1px solid ' + ANK.border,
              background: 'white',
              color: ANK.text,
              fontSize: 13,
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            İptal
          </button>
          <button
            onClick={submit}
            disabled={saving}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 18px',
              borderRadius: 8,
              border: 'none',
              background: ANK.accent,
              color: 'white',
              fontSize: 13,
              fontWeight: 600,
              cursor: saving ? 'wait' : 'pointer',
              opacity: saving ? 0.7 : 1,
            }}
          >
            <AIcon path="M5 13l4 4L19 7" size={15} /> {saving ? 'Gönderiliyor…' : 'Anketi gönder'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Soru tipi render ──────────────────────────────────────────────────────
function SoruBilesen({ soru, numara, deger, onChange }) {
  const head = (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 10 }}>
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 20,
          height: 20,
          borderRadius: '50%',
          background: ANK.accentPale,
          color: ANK.accent,
          fontSize: 11,
          fontWeight: 700,
          flexShrink: 0,
          marginTop: 1,
        }}
      >
        {numara}
      </span>
      <p
        style={{ fontSize: 13.5, fontWeight: 500, color: ANK.primary, margin: 0, lineHeight: 1.4 }}
      >
        {soru.text}
      </p>
    </div>
  );

  const pill = (selected) => ({
    padding: '8px 14px',
    borderRadius: 8,
    fontSize: 13,
    cursor: 'pointer',
    border: '1px solid ' + (selected ? ANK.accent : ANK.border),
    background: selected ? ANK.accentPale : 'white',
    color: selected ? ANK.accent : ANK.text,
    fontWeight: selected ? 600 : 400,
    fontFamily: "'Inter', sans-serif",
  });

  if (soru.type === 'likert') {
    const opts = [
      { v: '1', l: 'Kesinlikle\nkatılmıyorum' },
      { v: '2', l: 'Katılmıyorum' },
      { v: '3', l: 'Kararsızım' },
      { v: '4', l: 'Katılıyorum' },
      { v: '5', l: 'Kesinlikle\nkatılıyorum' },
    ];
    return (
      <div>
        {head}
        <div style={{ display: 'flex', gap: 8 }}>
          {opts.map((o) => {
            const sel = deger === o.v;
            return (
              <button
                key={o.v}
                onClick={() => onChange(soru.id, o.v)}
                title={o.l.replace('\n', ' ')}
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 3,
                  padding: '8px 2px',
                  borderRadius: 8,
                  cursor: 'pointer',
                  border: '1px solid ' + (sel ? ANK.accent : ANK.border),
                  background: sel ? ANK.accentPale : 'white',
                  color: sel ? ANK.accent : ANK.textMuted,
                  fontFamily: "'Inter', sans-serif",
                }}
              >
                <span style={{ fontSize: 15, fontWeight: 700 }}>{o.v}</span>
                <span
                  style={{
                    fontSize: 9,
                    textAlign: 'center',
                    lineHeight: 1.15,
                    whiteSpace: 'pre-line',
                  }}
                >
                  {o.l}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  if (soru.type === 'yesno') {
    return (
      <div>
        {head}
        <div style={{ display: 'flex', gap: 8 }}>
          {['Evet', 'Hayır'].map((v) => (
            <button
              key={v}
              onClick={() => onChange(soru.id, v.toLowerCase())}
              style={{ ...pill(deger === v.toLowerCase()), borderRadius: 20, padding: '8px 20px' }}
            >
              {v}
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (soru.type === 'hours0to5') {
    return (
      <div>
        {head}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {[0, 1, 2, 3, 4, 5].map((v) => (
            <button
              key={v}
              onClick={() => onChange(soru.id, String(v))}
              style={{
                ...pill(deger === String(v)),
                width: 42,
                height: 42,
                padding: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {v}
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (soru.type === 'hoursRange' || soru.type === 'hoursExam') {
    const opts =
      soru.type === 'hoursRange'
        ? ['0', '1-2', '3-4', '5-6', '7-8', '9-10']
        : ['0', '1-4', '5-8', '9-12', '13-16', '17-20'];
    return (
      <div>
        {head}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {opts.map((v) => (
            <button key={v} onClick={() => onChange(soru.id, v)} style={pill(deger === v)}>
              {v}
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (soru.type === 'textarea') {
    return (
      <div>
        {head}
        <textarea
          rows={3}
          value={deger || ''}
          onChange={(e) => onChange(soru.id, e.target.value)}
          placeholder="Görüşlerinizi buraya yazınız…"
          style={{ ...inputStyle, resize: 'vertical' }}
        />
      </div>
    );
  }

  // text (varsayılan)
  return (
    <div>
      {head}
      <input
        value={deger || ''}
        onChange={(e) => onChange(soru.id, e.target.value)}
        style={inputStyle}
      />
    </div>
  );
}

if (typeof window !== 'undefined') {
  window.AnketModulu = AnketModulu;
}
