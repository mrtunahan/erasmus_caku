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
  primary: '#0F172A',
  // Modül teması turkuaz-beyaz (Google Forms şablon galerisiyle uyumlu).
  accent: '#0D9488',
  accentDark: '#0F766E',
  accentPale: '#CCFBF1',
  bg: '#F6F7F9',
  surface: '#FFFFFF',
  surfaceAlt: '#F5FDFB',
  text: '#1F2937',
  textMuted: '#64748B',
  textDim: '#94A3B8',
  border: '#EAECF0',
  borderStrong: '#D9DEE6',
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
  // tasarım token'ları
  radius: 14,
  shadowSm: '0 1px 2px rgba(16,24,40,0.05), 0 1px 3px rgba(16,24,40,0.04)',
  shadow: '0 4px 12px rgba(16,24,40,0.06), 0 2px 4px rgba(16,24,40,0.04)',
  shadowLg: '0 12px 32px rgba(16,24,40,0.10)',
  headerGrad: 'linear-gradient(135deg, #2DD4BF 0%, #0D9488 100%)',
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
      { key: 'bolum', label: 'Bölüm', source: 'department' },
      { key: 'dersAdi', label: 'Dersin Adı', source: 'course', codeKey: 'dersKodu' },
      { key: 'dersKodu', label: 'Dersin Kodu', source: 'courseCode' },
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
// NOT: "Mezun" ayrı bir rol değil — öğrenci rolü içinde bir hedef gruptur.
const TARGET_ROLES = [
  {
    id: 'student',
    label: 'Öğrenci',
    sub: 'Lisans / ön lisans / mezun',
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
  student: ['1. sınıf', '2. sınıf', '3. sınıf', '4. sınıf', 'Mezun', 'Tüm öğrenciler'],
  professor: [
    'Öğretim üyeleri',
    'Araştırma görevlileri',
    'Öğretim görevlileri',
    'Tüm akademik personel',
  ],
};
// alumni: eski atama kayıtlarının rozetleri için geriye dönük etiket
const ROLE_LABEL = { student: 'Öğrenci', alumni: 'Mezun Öğrenci', professor: 'Akademisyen' };

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
  const updateSurvey = async (id, survey) => {
    await window.DBWrite.set(
      'surveys',
      id,
      { ...survey, updatedBy: currentUser?.name || '' },
      true
    );
    await load();
    toast.show('Anket güncellendi');
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
  // Anketi kopyala — sorular ve ders eşleştirmesiyle; atamalar kopyalanmaz
  const duplicateSurvey = async (s) => {
    const copy = {
      title: (s.title || 'Anket') + ' (Kopya)',
      description: s.description || '',
      infoFields: s.infoFields || [],
      questions: s.questions || [],
      linkedCourses: s.linkedCourses || [],
      // presetKey korunur — şablon kartındaki "N yüklü" sayacı kopyaları da sayar
      ...(s.presetKey ? { presetKey: s.presetKey } : {}),
      createdBy: currentUser?.name || '',
    };
    await window.DBWrite.add('surveys', copy);
    await load();
    toast.show('Anket çoğaltıldı');
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

  // Üç sekme, üç farklı tasarım: dolgu (turkuaz) · yumuşak çip (amber) ·
  // çerçeveli (mavi). Hover efekti yok — sabit, temiz görünüm.
  const tabs = [
    {
      key: 'anketler',
      label: 'Anketler',
      variant: 'solid',
      color: '#0D9488',
      pale: '#CCFBF1',
      icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
    },
    {
      key: 'atama',
      label: 'Rol Atama',
      variant: 'soft',
      color: '#B45309',
      pale: '#FEF3C7',
      icon: 'M12 19l9 2-9-18-9 18 9-2zm0 0v-8',
    },
    {
      key: 'sonuclar',
      label: 'Sonuçlar',
      variant: 'outline',
      color: '#2563EB',
      pale: '#DBEAFE',
      icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
    },
  ];

  return (
    <div className="ank-root" style={{ fontFamily: "'Inter', sans-serif" }}>
      <AnkStyles />
      <PageHeader
        icon="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
        title="Anketler"
        subtitle={`${isAdmin ? 'Fakülte' : departmentInfo?.name || 'Bölüm'} yönetici paneli — anket oluştur, ata ve sonuçları izle`}
        responsive={responsive}
        grad="linear-gradient(135deg, #2DD4BF 0%, #0D9488 100%)"
        glow="rgba(13,148,136,0.28)"
      />
      <SegTabs tabs={tabs} active={tab} onChange={setTab} />

      {loading ? (
        <Spinner />
      ) : (
        <>
          {tab === 'anketler' && (
            <AnketlerPaneli
              surveys={surveys}
              assignments={assignments}
              onAdd={addSurvey}
              onUpdate={updateSurvey}
              onRemove={removeSurvey}
              onDuplicate={duplicateSurvey}
              activeDepartment={activeDepartment}
              isAdmin={isAdmin}
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
  background: ANK.surface,
  borderRadius: ANK.radius,
  border: '1px solid ' + ANK.border,
  boxShadow: ANK.shadowSm,
  padding: 20,
};
const inputStyle = {
  width: '100%',
  padding: '10px 12px',
  borderRadius: 10,
  border: '1px solid ' + ANK.borderStrong,
  fontSize: 13,
  outline: 'none',
  fontFamily: "'Inter', sans-serif",
  boxSizing: 'border-box',
  background: ANK.surface,
  transition: 'border-color 0.15s, box-shadow 0.15s',
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

// ─── Modern çerçeve bileşenleri (temiz görünüm) ───────────────────────────
// Modül köküne bir kez enjekte edilen stil: focus halkaları, kart hover,
// segment sekme geçişleri. Root'a .ank-root sınıfı ile kapsanır.
function AnkStyles() {
  return (
    <style>{`
      .ank-root input:focus, .ank-root select:focus, .ank-root textarea:focus {
        border-color: ${ANK.accent} !important;
        box-shadow: 0 0 0 3px rgba(13,148,136,0.14) !important;
      }
      .ank-card { transition: box-shadow .18s ease, transform .18s ease, border-color .18s ease; }
      .ank-card-hover:hover { box-shadow: ${ANK.shadow}; transform: translateY(-1px); border-color: ${ANK.borderStrong}; }
      .ank-seg { display:inline-flex; gap:2px; padding:4px; background:${ANK.surface}; border:1px solid ${ANK.border}; border-radius:12px; box-shadow:${ANK.shadowSm}; flex-wrap:wrap; }
      .ank-seg-btn { display:flex; align-items:center; gap:7px; padding:8px 15px; border:none; background:transparent; color:${ANK.textMuted}; font-size:13px; font-weight:600; cursor:pointer; border-radius:9px; font-family:'Inter',sans-serif; transition:all .15s ease; white-space:nowrap; }
      .ank-seg-btn:hover { color:${ANK.primary}; background:${ANK.bg}; }
      .ank-seg-btn.active { color:#fff; background:${ANK.headerGrad}; box-shadow:0 2px 6px rgba(13,148,136,0.30); }
      .ank-btn { transition: filter .15s ease, box-shadow .15s ease, transform .05s ease; }
      .ank-btn:hover { filter: brightness(1.05); }
      .ank-btn:active { transform: translateY(1px); }
      /* Şablon galerisi — Google Forms tarzı yatay şerit (turkuaz-beyaz) */
      .ank-tpl-strip { display:flex; gap:18px; overflow-x:auto; padding:2px 2px 14px; }
      .ank-tpl-strip::-webkit-scrollbar { height:8px; }
      .ank-tpl-strip::-webkit-scrollbar-thumb { background:#B8EDE5; border-radius:8px; }
      .ank-tpl-strip::-webkit-scrollbar-thumb:hover { background:#0D9488; }
      .ank-tpl-card { position:relative; display:block; width:172px; border:1px solid #DBEFEB; border-radius:8px; background:#fff; cursor:pointer; overflow:hidden; box-shadow:0 1px 2px rgba(13,148,136,0.06); transition:border-color .15s ease, box-shadow .15s ease; padding:0; }
      .ank-tpl-card:hover { border-color:#0D9488; box-shadow:0 2px 10px rgba(13,148,136,0.16); }
      .ank-tpl-upload { border-style:dashed; border-color:#9FE3D8; }
      .ank-tpl-name { font-size:12.5px; font-weight:700; color:#134E4A; margin:9px 2px 0; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; width:172px; }
      .ank-tpl-sub { font-size:11px; color:#5B8C86; margin:2px 2px 0; }
      .ank-tpl-edit { position:absolute; top:8px; right:8px; width:26px; height:26px; border-radius:7px; background:rgba(255,255,255,0.94); border:1px solid #DBEFEB; display:flex; align-items:center; justify-content:center; cursor:pointer; box-shadow:0 1px 3px rgba(13,148,136,0.14); }
      .ank-tpl-edit:hover { background:#CCFBF1; }
      .ank-tpl-badge { position:absolute; top:8px; left:8px; min-width:20px; height:20px; padding:0 6px; border-radius:10px; background:#0D9488; color:#fff; font-size:11px; font-weight:700; display:flex; align-items:center; justify-content:center; box-shadow:0 1px 3px rgba(13,148,136,0.3); }
      /* Anket ızgarası — kart hover yükselmesi */
      .ank-grid { display:grid; grid-template-columns:repeat(auto-fill, minmax(280px, 1fr)); gap:12px; }
      /* Düzenleyici soru kartları — odaklanınca yükselir (elevation) */
      .ank-qcard { transition:box-shadow .18s ease, border-color .18s ease; }
      .ank-qcard:focus-within { border-color:${ANK.accent} !important; box-shadow:0 0 0 3px rgba(13,148,136,0.10), ${ANK.shadow}; }
    `}</style>
  );
}

// Sayfa başlığı — gradyan ikon rozeti + başlık/alt başlık.
// grad/glow opsiyonel: yönetici görünümünde turkuaz rozet için geçilir.
function PageHeader({ icon, title, subtitle, right, responsive, grad, glow }) {
  const rv = responsive || { val: (_a, _b, c) => c };
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        marginBottom: 22,
        flexWrap: 'wrap',
      }}
    >
      <div
        style={{
          width: 46,
          height: 46,
          borderRadius: 13,
          background: grad || ANK.headerGrad,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          boxShadow: '0 6px 16px ' + (glow || 'rgba(13,148,136,0.28)'),
        }}
      >
        <AIcon path={icon} size={22} color="#fff" />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <h1
          style={{
            fontSize: rv.val(19, 22, 25),
            fontWeight: 800,
            color: ANK.primary,
            margin: 0,
            letterSpacing: '-0.02em',
          }}
        >
          {title}
        </h1>
        {subtitle && (
          <p style={{ fontSize: 13, color: ANK.textMuted, margin: '3px 0 0' }}>{subtitle}</p>
        )}
      </div>
      {right}
    </div>
  );
}

// Sekme kontrolü — her sekme farklı bir tasarım taşır (dolgu / yumuşak çip /
// çerçeveli). Hover efekti yoktur; aktif/pasif durumu renkle ayrışır.
function SegTabs({ tabs, active, onChange }) {
  const base = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    padding: '9px 18px',
    fontSize: 13,
    fontWeight: 700,
    cursor: 'pointer',
    fontFamily: "'Inter', sans-serif",
    whiteSpace: 'nowrap',
  };
  const tabStyle = (t, on) => {
    const c = t.color || ANK.accent;
    if (t.variant === 'solid') {
      // Dolgu pill — aktifken tam turkuaz
      return on
        ? {
            ...base,
            borderRadius: 12,
            background: c,
            color: '#fff',
            border: '1px solid ' + c,
            boxShadow: '0 2px 8px rgba(13,148,136,0.30)',
          }
        : {
            ...base,
            borderRadius: 12,
            background: '#fff',
            color: ANK.textMuted,
            border: '1px solid ' + ANK.border,
          };
    }
    if (t.variant === 'soft') {
      // Yumuşak çip — aktifken açık amber zemin, hafif köşe
      return on
        ? {
            ...base,
            borderRadius: 9,
            background: t.pale,
            color: c,
            border: '1px solid ' + t.pale,
          }
        : {
            ...base,
            borderRadius: 9,
            background: '#fff',
            color: ANK.textMuted,
            border: '1px dashed ' + ANK.borderStrong,
          };
    }
    // outline — aktifken beyaz zemin + kalın mavi çerçeve, tam yuvarlak
    return on
      ? {
          ...base,
          borderRadius: 22,
          background: '#fff',
          color: c,
          border: '2px solid ' + c,
          padding: '8px 17px',
        }
      : {
          ...base,
          borderRadius: 22,
          background: '#fff',
          color: ANK.textMuted,
          border: '1px solid ' + ANK.border,
        };
  };
  return (
    <div
      style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 22, overflowX: 'auto' }}
    >
      {tabs.map((t) => {
        const on = active === t.key;
        return (
          <button key={t.key} onClick={() => onChange(t.key)} style={tabStyle(t, on)}>
            <AIcon
              path={t.icon}
              size={16}
              color={on ? (t.variant === 'solid' ? '#fff' : t.color) : ANK.textDim}
            />
            {t.label}
          </button>
        );
      })}
    </div>
  );
}

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
// Soru tipini metne göre sezgi: "?" yesno; "Görüş"/uzun cümle textarea;
// "düşünüyorum/katılıyorum" Likert; diğerleri text.
function inferType(text) {
  const t = (text || '').toLocaleLowerCase('tr');
  if (!t) return 'text';
  if (
    t.includes('katılıyorum') ||
    t.includes('düşünüyorum') ||
    t.includes('yeterli') ||
    t.includes('memnun')
  )
    return 'likert';
  if (/(görüş|paylaşmak|belirt|düşünce|öner)/.test(t)) return 'textarea';
  if (t.trim().endsWith('?')) return 'yesno';
  return 'likert';
}

// DOCX dosyasını parse et → metin satırları → soru dizisi.
// JSZip dinamik CDN'den yüklenir (CSP zaten jsdelivr'ı izinli).
async function loadJSZip() {
  if (window.JSZip) return window.JSZip;
  await new Promise((res, rej) => {
    const s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js';
    s.onload = res;
    s.onerror = rej;
    document.head.appendChild(s);
  });
  return window.JSZip;
}
async function extractTextFromDocx(file) {
  const JSZip = await loadJSZip();
  const buf = await file.arrayBuffer();
  const zip = await JSZip.loadAsync(buf);
  const xml = await zip.file('word/document.xml').async('string');
  // Paragrafları satıra çevir: <w:p> → satır; içindeki <w:t> içerikleri birleştir
  const paragraphs = [];
  const pRegex = /<w:p\b[^>]*>([\s\S]*?)<\/w:p>/g;
  const tRegex = /<w:t[^>]*>([\s\S]*?)<\/w:t>/g;
  let pm;
  while ((pm = pRegex.exec(xml)) !== null) {
    const inner = pm[1];
    let line = '';
    let tm;
    while ((tm = tRegex.exec(inner)) !== null) {
      line += tm[1].replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
    }
    line = line.trim();
    if (line) paragraphs.push(line);
  }
  return paragraphs;
}
// Satır dizisinden anket oluştur: ilk satır = başlık; geri kalanı sorulara çevir.
function buildSurveyFromLines(lines, fallbackTitle) {
  const title = (lines[0] || fallbackTitle || 'Yeni Anket').slice(0, 200);
  let description = '';
  let bodyStart = 1;
  if (lines[1] && lines[1].length > 0 && lines[1].length < 200 && !/^\d+[\.\)]/.test(lines[1])) {
    description = lines[1];
    bodyStart = 2;
  }
  const questions = [];
  for (let i = bodyStart; i < lines.length; i++) {
    const raw = lines[i].replace(/^\s*(?:\d+[\.\)]|[-•·])\s*/, '').trim();
    if (raw.length < 4) continue;
    questions.push({ id: 'q' + (questions.length + 1), type: inferType(raw), text: raw });
  }
  if (questions.length === 0) {
    questions.push({ id: 'c1', type: 'textarea', text: 'Görüşlerinizi belirtiniz.' });
  }
  return { title, description, infoFields: [], questions };
}

// ─── Google Forms tarzı şablon önizleme küçük resmi (turkuaz-beyaz) ─────────
// Statik, veri gerektirmeyen mini form görseli: turkuaz üst bant + gri
// alan çizgileri. `blank` → boş form (+) kartı.
const TQ = {
  primary: '#0D9488',
  primaryDark: '#0F766E',
  grad: 'linear-gradient(135deg, #2DD4BF 0%, #0D9488 100%)',
  paper: '#ECFEFF',
  line: '#E2E8F0',
  name: '#134E4A',
  sub: '#5B8C86',
  border: '#CFEEE8',
};
function TplThumb({ blank }) {
  if (blank) {
    return (
      <div
        style={{
          height: 118,
          background: '#FFFFFF',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div
          style={{
            width: 46,
            height: 46,
            borderRadius: '50%',
            background: TQ.paper,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <AIcon path="M12 5v14M5 12h14" size={26} color={TQ.primary} />
        </div>
      </div>
    );
  }
  return (
    <div style={{ height: 118, background: TQ.paper, padding: 11 }}>
      <div
        style={{
          height: '100%',
          background: '#fff',
          borderRadius: 5,
          overflow: 'hidden',
          boxShadow: '0 1px 3px rgba(13,148,136,0.10)',
        }}
      >
        <div style={{ height: 24, background: TQ.grad }} />
        <div style={{ padding: '9px 10px', display: 'flex', flexDirection: 'column', gap: 7 }}>
          <div style={{ width: '58%', height: 6, borderRadius: 3, background: TQ.primary }} />
          <div style={{ width: '92%', height: 4, borderRadius: 3, background: TQ.line }} />
          <div style={{ width: '80%', height: 4, borderRadius: 3, background: TQ.line }} />
          <div style={{ width: '86%', height: 4, borderRadius: 3, background: TQ.line }} />
        </div>
      </div>
    </div>
  );
}

function AnketlerPaneli({
  surveys,
  assignments,
  onAdd,
  onUpdate,
  onRemove,
  onDuplicate,
  activeDepartment,
  isAdmin,
}) {
  // Doğrudan yükle — aynı şablon birden çok kez eklenebilir (kopya sayısı gösterilir)
  const addPreset = async (key) => {
    const count = surveys.filter((s) => s.presetKey === key).length;
    const preset = expandPreset(PRESET_SURVEYS[key]);
    await onAdd({
      ...preset,
      title: count > 0 ? preset.title + ' (' + (count + 1) + ')' : preset.title,
      presetKey: key,
    });
  };
  // Düzenleyerek yükle — şablon editörde açılır, kaydedince eklenir
  const editPreset = (key) => {
    setEditing({ ...expandPreset(PRESET_SURVEYS[key]), presetKey: key, _isNew: true });
  };
  const presetCount = (key) => surveys.filter((s) => s.presetKey === key).length;
  const [editing, setEditing] = useState(null); // düzenlenmekte olan anket
  const [importing, setImporting] = useState(false);

  const handleFile = async (file) => {
    if (!file) return;
    setImporting(true);
    try {
      const ext = (file.name.split('.').pop() || '').toLowerCase();
      let survey;
      if (ext === 'json') {
        const txt = await file.text();
        const data = JSON.parse(txt);
        survey = {
          title: data.title || data.baslik || file.name.replace(/\.[^.]+$/, ''),
          description: data.description || data.aciklama || '',
          infoFields: data.infoFields || data.bilgiAlanlari || [],
          questions: (data.questions || data.sorular || []).map((q, i) => ({
            id: q.id || 'q' + (i + 1),
            type: q.type || q.tip || inferType(q.text || q.metin),
            text: q.text || q.metin || '',
          })),
        };
      } else if (ext === 'docx') {
        const lines = await extractTextFromDocx(file);
        survey = buildSurveyFromLines(lines, file.name.replace(/\.[^.]+$/, ''));
      } else if (ext === 'txt') {
        const txt = await file.text();
        const lines = txt
          .split(/\r?\n/)
          .map((l) => l.trim())
          .filter(Boolean);
        survey = buildSurveyFromLines(lines, file.name.replace(/\.[^.]+$/, ''));
      } else {
        alert('Desteklenmeyen format. .docx / .json / .txt yükleyin.');
        return;
      }
      // Yüklemeden önce kullanıcıya editörde göster
      setEditing({ ...survey, _isNew: true });
    } catch (e) {
      console.error(e);
      alert('Dosya okunamadı: ' + e.message);
    } finally {
      setImporting(false);
    }
  };

  const saveFromEditor = async (data) => {
    if (editing && editing._isNew) {
      await onAdd({ ...data });
    } else if (editing && editing.id) {
      await onUpdate(editing.id, data);
    }
    setEditing(null);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div
        style={{
          background: '#F7FEFD',
          borderRadius: ANK.radius,
          border: '1px solid ' + TQ.border,
          boxShadow: ANK.shadowSm,
          padding: 20,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 10,
            marginBottom: 14,
          }}
        >
          <p style={{ fontSize: 14, fontWeight: 700, color: TQ.primaryDark, margin: 0 }}>
            Yeni bir anket hazırlamaya başlayın
          </p>
          <span
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: ANK.textMuted,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              whiteSpace: 'nowrap',
            }}
          >
            Şablon galerisi
            <AIcon path={['M7 15l5 5 5-5', 'M7 9l5-5 5 5']} size={14} color={ANK.textDim} />
          </span>
        </div>

        <div className="ank-tpl-strip">
          {/* Boş anket — sıfırdan başla */}
          <div style={{ flex: '0 0 172px' }}>
            <div
              role="button"
              tabIndex={0}
              className="ank-tpl-card"
              onClick={() =>
                setEditing({
                  _isNew: true,
                  title: '',
                  description: '',
                  infoFields: [],
                  questions: [],
                })
              }
            >
              <TplThumb blank />
            </div>
            <p className="ank-tpl-name">Boş anket</p>
            <p className="ank-tpl-sub">Sıfırdan başla</p>
          </div>

          {/* Özel dosyadan yükle — .docx / .json / .txt */}
          <div style={{ flex: '0 0 172px' }}>
            <label
              className="ank-tpl-card ank-tpl-upload"
              style={{ cursor: importing ? 'wait' : 'pointer' }}
            >
              <div
                style={{
                  height: 118,
                  background: '#fff',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                }}
              >
                <div
                  style={{
                    width: 46,
                    height: 46,
                    borderRadius: '50%',
                    background: TQ.paper,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <AIcon
                    path="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                    size={22}
                    color={TQ.primary}
                  />
                </div>
                <span style={{ fontSize: 11, color: TQ.sub, fontWeight: 600 }}>
                  {importing ? 'İşleniyor…' : '.docx / .json / .txt'}
                </span>
              </div>
              <input
                type="file"
                accept=".docx,.json,.txt"
                style={{ display: 'none' }}
                onChange={(e) => {
                  const f = e.target.files && e.target.files[0];
                  e.target.value = '';
                  if (f) handleFile(f);
                }}
              />
            </label>
            <p className="ank-tpl-name">Dosyadan yükle</p>
            <p className="ank-tpl-sub">İçe aktar</p>
          </div>

          {/* Hazır şablonlar */}
          {Object.entries(PRESET_SURVEYS).map(([key, s]) => {
            const count = presetCount(key);
            const qn = (expandPreset(s).questions || []).length;
            return (
              <div key={key} style={{ flex: '0 0 172px' }}>
                <div
                  role="button"
                  tabIndex={0}
                  className="ank-tpl-card"
                  title="Yükle"
                  onClick={() => addPreset(key)}
                >
                  <TplThumb />
                  <span
                    role="button"
                    tabIndex={0}
                    title="Düzenleyerek yükle"
                    onClick={(e) => {
                      e.stopPropagation();
                      editPreset(key);
                    }}
                    className="ank-tpl-edit"
                  >
                    <AIcon
                      path="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                      size={13}
                      color={TQ.primaryDark}
                    />
                  </span>
                  {count > 0 && <span className="ank-tpl-badge">{count}</span>}
                </div>
                <p className="ank-tpl-name" title={s.title}>
                  {s.title}
                </p>
                <p className="ank-tpl-sub">{qn} soru</p>
              </div>
            );
          })}
        </div>

        <p
          style={{
            fontSize: 11,
            color: ANK.textMuted,
            margin: '12px 0 0',
            paddingTop: 12,
            borderTop: '1px solid ' + TQ.border,
          }}
        >
          Bir şablona tıklayın; kalem simgesiyle düzenleyerek yükleyebilirsiniz. Word (.docx), JSON
          ya da düz metin (.txt) dosyalarındaki sorular otomatik tanınır.
        </p>
      </div>

      <p style={labelStyle}>Yüklü anketler ({surveys.length})</p>
      {surveys.length === 0 ? (
        <EmptyState text="Henüz anket yüklenmedi. Yukarıdaki şablonlardan ekleyin." />
      ) : (
        <div className="ank-grid">
          {surveys.map((s) => {
            const ac = assignments.filter((a) => a.surveyId === s.id).length;
            return (
              <div
                key={s.id}
                className="ank-card ank-card-hover"
                style={{
                  ...cardStyle,
                  padding: 16,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 10,
                      background: ANK.accentPale,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <AIcon
                      path="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      size={19}
                      color={ANK.accent}
                    />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p
                      title={s.title}
                      style={{
                        fontSize: 14.5,
                        fontWeight: 700,
                        color: ANK.primary,
                        margin: 0,
                        lineHeight: 1.35,
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                      }}
                    >
                      {s.title}
                    </p>
                    <p style={{ fontSize: 12, color: ANK.textMuted, margin: '3px 0 0' }}>
                      {s.questions?.length || 0} soru
                    </p>
                  </div>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, minHeight: 22 }}>
                  {ac > 0 && (
                    <span
                      style={{
                        padding: '2px 9px',
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
                  {(s.linkedCourses || []).slice(0, 3).map((c) => (
                    <span
                      key={c.code || c.name}
                      title={c.name}
                      style={{
                        padding: '2px 9px',
                        borderRadius: 10,
                        background: ANK.tealLight,
                        color: ANK.teal,
                        fontSize: 11,
                        fontWeight: 600,
                      }}
                    >
                      {c.code || c.name}
                    </span>
                  ))}
                  {(s.linkedCourses || []).length > 3 && (
                    <span
                      style={{
                        fontSize: 11,
                        color: ANK.teal,
                        fontWeight: 600,
                        alignSelf: 'center',
                      }}
                    >
                      +{s.linkedCourses.length - 3} ders
                    </span>
                  )}
                  {ac === 0 && (s.linkedCourses || []).length === 0 && (
                    <span style={{ fontSize: 11, color: ANK.textDim, alignSelf: 'center' }}>
                      Henüz atama yok
                    </span>
                  )}
                </div>
                <div
                  style={{
                    display: 'flex',
                    gap: 6,
                    marginTop: 'auto',
                    paddingTop: 10,
                    borderTop: '1px solid ' + ANK.border,
                  }}
                >
                  <button
                    onClick={() => setEditing({ ...s, _isNew: false })}
                    className="ank-btn"
                    style={{
                      flex: 1,
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                      padding: '8px 10px',
                      borderRadius: 8,
                      border: '1px solid ' + ANK.border,
                      background: ANK.accentPale,
                      color: ANK.accent,
                      fontSize: 12.5,
                      fontWeight: 600,
                      cursor: 'pointer',
                      fontFamily: "'Inter', sans-serif",
                    }}
                  >
                    <AIcon
                      path="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                      size={13}
                      color={ANK.accent}
                    />
                    Düzenle
                  </button>
                  <button
                    onClick={() => onDuplicate(s)}
                    title="Çoğalt"
                    className="ank-btn"
                    style={iconBtn(ANK.blue)}
                  >
                    <AIcon
                      path={[
                        'M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2',
                        'M10 8h8a2 2 0 012 2v8a2 2 0 01-2 2h-8a2 2 0 01-2-2v-8a2 2 0 012-2z',
                      ]}
                      size={13}
                      color={ANK.blue}
                    />
                  </button>
                  <button
                    onClick={() => onRemove(s.id)}
                    title="Sil"
                    className="ank-btn"
                    style={iconBtn(ANK.red)}
                  >
                    <AIcon
                      path="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M1 7h22M9 7V4a1 1 0 011-1h4a1 1 0 011 1v3"
                      size={14}
                      color={ANK.red}
                    />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {editing && (
        <SurveyEditorModal
          initial={editing}
          isNew={!!editing._isNew}
          onSave={saveFromEditor}
          onCancel={() => setEditing(null)}
          activeDepartment={activeDepartment}
          isAdmin={isAdmin}
        />
      )}
    </div>
  );
}

// ─── Anket düzenleyici modalı ─────────────────────────────────────────────
const QUESTION_TYPES = [
  { v: 'likert', label: 'Likert (1-5)' },
  { v: 'yesno', label: 'Evet / Hayır' },
  { v: 'hours0to5', label: 'Saat (0-5)' },
  { v: 'hoursRange', label: 'Saat aralığı (0, 1-2…)' },
  { v: 'hoursExam', label: 'Sınav saati (0, 1-4…)' },
  { v: 'textarea', label: 'Uzun metin' },
  { v: 'text', label: 'Kısa metin' },
];
function SurveyEditorModal({ initial, isNew, onSave, onCancel, activeDepartment, isAdmin }) {
  const [title, setTitle] = useState(initial.title || '');
  const [description, setDescription] = useState(initial.description || '');
  const [questions, setQuestions] = useState(
    (initial.questions || []).map((q, i) => ({
      id: q.id || 'q' + (i + 1),
      type: q.type || 'likert',
      text: q.text || '',
    }))
  );
  const [saving, setSaving] = useState(false);

  // ── Ders eşleştirme: anket bölümdeki mevcut derslerle ilişkilendirilebilir ──
  // linkedCourses: [{ code, name }] — katılımcı ekranındaki ders açılır
  // listesi yalnızca bu derslerle sınırlanır; sonuçlarda ders filtresi sunar.
  const [linkedCourses, setLinkedCourses] = useState(initial.linkedCourses || []);
  const [allCourses, setAllCourses] = useState([]);
  const [courseDeptId, setCourseDeptId] = useState(activeDepartment || '');
  const [courseSearch, setCourseSearch] = useState('');
  const departments = window.DEPARTMENTS || [];

  useEffect(() => {
    let alive = true;
    window
      .apiRead('sinav_dersler')
      .then((c) => {
        if (alive) setAllCourses(c || []);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  const visibleCourses = useMemo(() => {
    const q = courseSearch.trim().toLocaleLowerCase('tr');
    return allCourses
      .filter((c) => !courseDeptId || (c.departmentId || '') === courseDeptId)
      .filter(
        (c) =>
          !q ||
          (c.name || '').toLocaleLowerCase('tr').includes(q) ||
          (c.code || '').toLocaleLowerCase('tr').includes(q)
      );
  }, [allCourses, courseDeptId, courseSearch]);

  const courseKey = (c) => (c.code || '') + '::' + (c.name || '');
  const isLinked = (c) => linkedCourses.some((l) => courseKey(l) === courseKey(c));
  const toggleCourse = (c) =>
    setLinkedCourses((prev) =>
      isLinked(c)
        ? prev.filter((l) => courseKey(l) !== courseKey(c))
        : [...prev, { code: c.code || '', name: c.name || '' }]
    );

  const update = (i, patch) =>
    setQuestions((prev) => prev.map((q, idx) => (idx === i ? { ...q, ...patch } : q)));
  const remove = (i) => setQuestions((prev) => prev.filter((_, idx) => idx !== i));
  const move = (i, dir) =>
    setQuestions((prev) => {
      const j = i + dir;
      if (j < 0 || j >= prev.length) return prev;
      const arr = prev.slice();
      [arr[i], arr[j]] = [arr[j], arr[i]];
      return arr;
    });
  // Yeni soru id'si mevcut en büyük sayısal ekin +1'i — soru silindikten
  // sonra eklenen sorunun eski bir id ile çakışmasını önler (çakışan id'ler
  // doldurma ekranında iki sorunun tek cevabı paylaşmasına yol açar).
  const add = () =>
    setQuestions((prev) => {
      let maxN = 0;
      prev.forEach((q) => {
        const m = /^q(\d+)$/.exec(q.id || '');
        if (m) maxN = Math.max(maxN, parseInt(m[1], 10));
      });
      return [...prev, { id: 'q' + (maxN + 1), type: 'likert', text: '' }];
    });

  const handleSave = async () => {
    if (!title.trim()) {
      alert('Başlık zorunludur.');
      return;
    }
    const cleaned = questions
      .map((q) => ({ ...q, text: (q.text || '').trim() }))
      .filter((q) => q.text);
    if (cleaned.length === 0) {
      alert('En az 1 soru olmalı.');
      return;
    }
    setSaving(true);
    try {
      await onSave({
        title: title.trim(),
        description: description.trim(),
        infoFields: initial.infoFields || [],
        questions: cleaned,
        linkedCourses,
        ...(initial.presetKey ? { presetKey: initial.presetKey } : {}),
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      onClick={onCancel}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1200,
        padding: 16,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'white',
          borderRadius: 14,
          padding: 24,
          width: '100%',
          maxWidth: 720,
          maxHeight: '88vh',
          overflowY: 'auto',
          fontFamily: "'Inter', sans-serif",
        }}
      >
        <h3 style={{ fontSize: 18, fontWeight: 700, color: ANK.primary, margin: '0 0 16px' }}>
          {isNew ? 'Yeni Anket' : 'Anketi Düzenle'}
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 }}>
          <div>
            <label style={labelStyle}>Başlık *</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              style={inputStyle}
              autoFocus
            />
          </div>
          <div>
            <label style={labelStyle}>Açıklama</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              style={{ ...inputStyle, resize: 'vertical' }}
            />
          </div>

          {/* ── Ders eşleştirme ── */}
          <div
            style={{
              border: '1px solid ' + ANK.border,
              borderRadius: 10,
              padding: 12,
              background: '#FAFAFA',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 8,
              }}
            >
              <label style={{ ...labelStyle, marginBottom: 0 }}>
                Ders eşleştirme ({linkedCourses.length} ders)
              </label>
              {linkedCourses.length > 0 && (
                <button
                  onClick={() => setLinkedCourses([])}
                  style={{
                    border: 'none',
                    background: 'transparent',
                    color: ANK.red,
                    fontSize: 11,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Tümünü kaldır
                </button>
              )}
            </div>
            <p style={{ fontSize: 11, color: ANK.textMuted, margin: '6px 0 10px' }}>
              Anketi bölümdeki derslerle eşleştirin — katılımcı ders seçerken yalnızca bu dersler
              listelenir, sonuçlar ders bazında filtrelenebilir. Boş bırakılırsa tüm dersler
              seçilebilir.
            </p>
            {linkedCourses.length > 0 && (
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
                {linkedCourses.map((c) => (
                  <span
                    key={(c.code || '') + c.name}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 5,
                      padding: '3px 10px',
                      borderRadius: 12,
                      background: ANK.tealLight,
                      color: ANK.teal,
                      fontSize: 12,
                      fontWeight: 600,
                    }}
                  >
                    {c.code ? c.code + ' — ' : ''}
                    {c.name}
                    <button
                      onClick={() => toggleCourse(c)}
                      style={{
                        border: 'none',
                        background: 'transparent',
                        color: ANK.teal,
                        cursor: 'pointer',
                        padding: 0,
                        display: 'flex',
                      }}
                      title="Kaldır"
                    >
                      <AIcon path="M6 18L18 6M6 6l12 12" size={11} />
                    </button>
                  </span>
                ))}
              </div>
            )}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
              {isAdmin && (
                <select
                  value={courseDeptId}
                  onChange={(e) => setCourseDeptId(e.target.value)}
                  style={{ ...inputStyle, width: 'auto', minWidth: 180, cursor: 'pointer' }}
                >
                  <option value="">Tüm bölümler</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              )}
              <input
                value={courseSearch}
                onChange={(e) => setCourseSearch(e.target.value)}
                placeholder="Ders adı veya kodu ara…"
                style={{ ...inputStyle, flex: 1, minWidth: 160 }}
              />
            </div>
            <div
              style={{
                maxHeight: 160,
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
                gap: 4,
              }}
            >
              {visibleCourses.length === 0 ? (
                <p style={{ fontSize: 12, color: ANK.textMuted, margin: 6 }}>
                  {allCourses.length === 0
                    ? 'Ders bulunamadı — Sınav Otomasyonu modülünden ders tanımlayın.'
                    : 'Aramayla eşleşen ders yok.'}
                </p>
              ) : (
                visibleCourses.slice(0, 60).map((c) => (
                  <label
                    key={c.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '5px 8px',
                      borderRadius: 6,
                      fontSize: 12.5,
                      color: ANK.text,
                      cursor: 'pointer',
                      background: isLinked(c) ? ANK.tealLight : 'transparent',
                    }}
                  >
                    <input type="checkbox" checked={isLinked(c)} onChange={() => toggleCourse(c)} />
                    <span style={{ fontWeight: 600, color: ANK.teal, minWidth: 62 }}>
                      {c.code || '—'}
                    </span>
                    {c.name}
                  </label>
                ))
              )}
            </div>
          </div>
        </div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 10,
          }}
        >
          <p style={labelStyle}>Sorular ({questions.length})</p>
          <button
            onClick={add}
            style={{
              padding: '7px 14px',
              borderRadius: 7,
              border: '1px solid ' + ANK.border,
              background: 'white',
              color: ANK.accent,
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <AIcon path="M12 5v14M5 12h14" size={13} /> Soru ekle
          </button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {questions.map((q, i) => (
            <div
              key={i}
              className="ank-qcard"
              style={{
                border: '1px solid ' + ANK.border,
                borderRadius: 10,
                padding: 10,
                display: 'flex',
                gap: 8,
                alignItems: 'flex-start',
                background: ANK.surface,
              }}
            >
              <span
                style={{
                  flexShrink: 0,
                  width: 24,
                  height: 24,
                  borderRadius: '50%',
                  background: ANK.accentPale,
                  color: ANK.accent,
                  fontSize: 11,
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginTop: 4,
                }}
              >
                {i + 1}
              </span>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                <input
                  value={q.text}
                  onChange={(e) => update(i, { text: e.target.value })}
                  placeholder="Soru metni…"
                  style={inputStyle}
                />
                <select
                  value={q.type}
                  onChange={(e) => update(i, { type: e.target.value })}
                  style={{ ...inputStyle, width: 'auto', minWidth: 200 }}
                >
                  {QUESTION_TYPES.map((t) => (
                    <option key={t.v} value={t.v}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <button
                  onClick={() => move(i, -1)}
                  disabled={i === 0}
                  title="Yukarı"
                  style={{
                    ...iconBtn(),
                    width: 26,
                    height: 26,
                    opacity: i === 0 ? 0.4 : 1,
                    cursor: i === 0 ? 'not-allowed' : 'pointer',
                  }}
                >
                  <AIcon path="M5 15l7-7 7 7" size={12} />
                </button>
                <button
                  onClick={() => move(i, +1)}
                  disabled={i === questions.length - 1}
                  title="Aşağı"
                  style={{
                    ...iconBtn(),
                    width: 26,
                    height: 26,
                    opacity: i === questions.length - 1 ? 0.4 : 1,
                    cursor: i === questions.length - 1 ? 'not-allowed' : 'pointer',
                  }}
                >
                  <AIcon path="M19 9l-7 7-7-7" size={12} />
                </button>
              </div>
              <button onClick={() => remove(i)} title="Sil" style={iconBtn(ANK.red)}>
                <AIcon
                  path="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M1 7h22M9 7V4a1 1 0 011-1h4a1 1 0 011 1v3"
                  size={13}
                  color={ANK.red}
                />
              </button>
            </div>
          ))}
          {questions.length === 0 && (
            <p style={{ fontSize: 12, color: ANK.textMuted, padding: 14, textAlign: 'center' }}>
              Henüz soru yok. "Soru ekle" ile başlayın.
            </p>
          )}
        </div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: 8,
            marginTop: 20,
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
            onClick={handleSave}
            disabled={saving}
            style={{
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
            {saving ? 'Kaydediliyor…' : isNew ? 'Anketi Oluştur' : 'Değişiklikleri Kaydet'}
          </button>
        </div>
      </div>
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

// Son tarih gösterimi: ISO (yyyy-mm-dd) → gg.aa.yyyy; boş/'—' → "Belirtilmedi".
function fmtDueDate(d) {
  if (!d || d === '—') return 'Belirtilmedi';
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(d));
  if (m) return `${m[3]}.${m[2]}.${m[1]}`;
  return String(d);
}

function EmptyState({ text }) {
  return (
    <div
      style={{
        ...cardStyle,
        textAlign: 'center',
        padding: '48px 40px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 12,
        background: ANK.surfaceAlt,
        borderStyle: 'dashed',
        borderColor: ANK.borderStrong,
        boxShadow: 'none',
      }}
    >
      <div
        style={{
          width: 52,
          height: 52,
          borderRadius: 14,
          background: ANK.accentPale,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <AIcon
          path="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          size={24}
          color={ANK.accent}
        />
      </div>
      <span style={{ color: ANK.textMuted, fontSize: 13.5, maxWidth: 320, lineHeight: 1.5 }}>
        {text}
      </span>
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
  const [mandatory, setMandatory] = useState(false);
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
        // Zorunlu atamalar katılımcı sisteme girdiğinde tam-ekran kapı olarak
        // gösterilir; doldurmadan uygulamaya devam edemez.
        mandatory: !!mandatory,
        departmentId: isAdmin ? deptId : activeDepartment || '',
        departmentName: deptName,
      });
    }
    setSurveyId('');
    setTargetRole(null);
    setGroups([]);
    setDueDate('');
    setMandatory(false);
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

        {/* Zorunlu anket seçeneği */}
        <label
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 10,
            padding: '12px 14px',
            borderRadius: 10,
            border: '1px solid ' + (mandatory ? ANK.accent : ANK.border),
            background: mandatory ? ANK.accentPale : ANK.surface,
            cursor: 'pointer',
          }}
        >
          <input
            type="checkbox"
            checked={mandatory}
            onChange={(e) => setMandatory(e.target.checked)}
            style={{ marginTop: 2, width: 16, height: 16, cursor: 'pointer' }}
          />
          <div>
            <p
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: mandatory ? ANK.accentDark : ANK.primary,
                margin: 0,
              }}
            >
              Zorunlu anket
            </p>
            <p
              style={{ fontSize: 11.5, color: ANK.textMuted, margin: '3px 0 0', lineHeight: 1.45 }}
            >
              Hedef kişiler sisteme girdiğinde bu anket tam ekran karşılarına çıkar ve tamamlamadan
              uygulamayı kullanamazlar.
            </p>
          </div>
        </label>

        {/* Son tarih + ata */}
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, flexWrap: 'wrap' }}>
          <div>
            <label style={labelStyle}>Son tarih (takvimden)</label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              style={{ ...inputStyle, width: 200, cursor: 'pointer' }}
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <p style={labelStyle}>Mevcut atamalar ({assignments.length})</p>
          <div className="ank-grid">
            {assignments.map((a) => {
              const isStudent = a.targetRole === 'student';
              return (
                <div
                  key={a.id}
                  className="ank-card ank-card-hover"
                  style={{
                    ...cardStyle,
                    padding: 16,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 12,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                    <div
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 10,
                        background: ANK.accentPale,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <AIcon path="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" size={19} color={ANK.accent} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p
                        title={a.surveyTitle}
                        style={{
                          fontSize: 14.5,
                          fontWeight: 700,
                          color: ANK.primary,
                          margin: 0,
                          lineHeight: 1.35,
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                        }}
                      >
                        {a.surveyTitle}
                      </p>
                      {a.departmentName && (
                        <p style={{ fontSize: 12, color: ANK.textMuted, margin: '3px 0 0' }}>
                          {a.departmentName}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => onRemoveAssignment(a.id)}
                      title="Atamayı kaldır"
                      className="ank-btn"
                      style={iconBtn(ANK.red)}
                    >
                      <AIcon
                        path="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M1 7h22M9 7V4a1 1 0 011-1h4a1 1 0 011 1v3"
                        size={14}
                        color={ANK.red}
                      />
                    </button>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    <span
                      style={{
                        padding: '2px 9px',
                        borderRadius: 10,
                        fontSize: 11,
                        fontWeight: 600,
                        background: isStudent ? ANK.accentPale : ANK.blueLight,
                        color: isStudent ? ANK.accentDark : ANK.blue,
                      }}
                    >
                      {ROLE_LABEL[a.targetRole] || a.targetRole}
                    </span>
                    <span
                      style={{
                        padding: '2px 9px',
                        borderRadius: 10,
                        fontSize: 11,
                        fontWeight: 600,
                        background: '#F1F5F9',
                        color: ANK.text,
                      }}
                    >
                      {a.targetGroup}
                    </span>
                    {a.mandatory && (
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                          padding: '2px 9px',
                          borderRadius: 10,
                          fontSize: 11,
                          fontWeight: 700,
                          background: ANK.redLight,
                          color: ANK.red,
                        }}
                      >
                        <AIcon
                          path="M12 9v2m0 4h.01M5.07 19h13.86a2 2 0 001.75-2.98l-6.93-12a2 2 0 00-3.5 0l-6.93 12A2 2 0 005.07 19z"
                          size={11}
                          color={ANK.red}
                        />
                        Zorunlu
                      </span>
                    )}
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      marginTop: 'auto',
                      paddingTop: 10,
                      borderTop: '1px solid ' + ANK.border,
                      fontSize: 12,
                      color: ANK.textMuted,
                    }}
                  >
                    <AIcon
                      path="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                      size={14}
                      color={ANK.textDim}
                    />
                    Son tarih: <strong style={{ color: ANK.text }}>{fmtDueDate(a.dueDate)}</strong>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Sonuçlar paneli — gelişmiş grafikler + CSV/Excel dışa aktarma ─────────

// Likert 1→5 renk skalası (kırmızı → yeşil)
const LIKERT_COLORS = ['#DC2626', '#F59E0B', '#9CA3AF', '#34D399', '#059669'];
const LIKERT_LABELS = [
  'Kesinlikle katılmıyorum',
  'Katılmıyorum',
  'Kararsızım',
  'Katılıyorum',
  'Kesinlikle katılıyorum',
];

// Soru tipine göre seçenek kümesi (dağılım grafikleri için)
function optionsForType(type) {
  if (type === 'likert') return ['1', '2', '3', '4', '5'];
  if (type === 'yesno') return ['evet', 'hayır'];
  if (type === 'hours0to5') return ['0', '1', '2', '3', '4', '5'];
  if (type === 'hoursRange') return ['0', '1-2', '3-4', '5-6', '7-8', '9-10'];
  if (type === 'hoursExam') return ['0', '1-4', '5-8', '9-12', '13-16', '17-20'];
  return null; // text / textarea
}

function countAnswers(responses, qid, options) {
  const counts = Object.fromEntries(options.map((o) => [o, 0]));
  responses.forEach((r) => {
    const v = r.answers?.[qid];
    if (v != null && Object.prototype.hasOwnProperty.call(counts, String(v))) {
      counts[String(v)]++;
    }
  });
  return counts;
}

// ── Yatay yığılmış Likert dağılım çubuğu ──
function LikertStackedBar({ counts }) {
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  if (total === 0) {
    return <p style={{ fontSize: 12, color: ANK.textMuted, margin: 0 }}>Yanıt yok</p>;
  }
  return (
    <div>
      <div
        style={{
          display: 'flex',
          height: 22,
          borderRadius: 6,
          overflow: 'hidden',
          border: '1px solid ' + ANK.border,
        }}
      >
        {['1', '2', '3', '4', '5'].map((v, i) => {
          const c = counts[v] || 0;
          if (c === 0) return null;
          const pct = (c / total) * 100;
          return (
            <div
              key={v}
              title={LIKERT_LABELS[i] + ': ' + c + ' yanıt (%' + Math.round(pct) + ')'}
              style={{
                width: pct + '%',
                background: LIKERT_COLORS[i],
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: 10,
                fontWeight: 700,
                minWidth: c > 0 ? 14 : 0,
              }}
            >
              {pct >= 9 ? c : ''}
            </div>
          );
        })}
      </div>
      <div style={{ display: 'flex', gap: 10, marginTop: 5, flexWrap: 'wrap' }}>
        {['1', '2', '3', '4', '5'].map((v, i) => (
          <span
            key={v}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              fontSize: 10,
              color: ANK.textMuted,
            }}
          >
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: 2,
                background: LIKERT_COLORS[i],
                display: 'inline-block',
              }}
            />
            {v} ({counts[v] || 0})
          </span>
        ))}
      </div>
    </div>
  );
}

// ── SVG halka (donut) grafik — Evet/Hayır ──
function DonutChart({ data, size = 120 }) {
  const total = data.reduce((a, d) => a + d.value, 0);
  if (total === 0) {
    return <p style={{ fontSize: 12, color: ANK.textMuted, margin: 0 }}>Yanıt yok</p>;
  }
  const r = size / 2 - 12;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * r;
  let offset = 0;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
      <svg width={size} height={size}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#F3F4F6" strokeWidth="18" />
        {data.map((d) => {
          const frac = d.value / total;
          const dash = frac * circumference;
          const el = (
            <circle
              key={d.label}
              cx={cx}
              cy={cy}
              r={r}
              fill="none"
              stroke={d.color}
              strokeWidth="18"
              strokeDasharray={dash + ' ' + (circumference - dash)}
              strokeDashoffset={-offset}
              transform={'rotate(-90 ' + cx + ' ' + cy + ')'}
            >
              <title>
                {d.label}: {d.value} (%{Math.round(frac * 100)})
              </title>
            </circle>
          );
          offset += dash;
          return el;
        })}
        <text
          x={cx}
          y={cy + 5}
          textAnchor="middle"
          style={{ fontSize: 16, fontWeight: 700, fill: ANK.primary }}
        >
          {total}
        </text>
      </svg>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {data.map((d) => (
          <span
            key={d.label}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 12,
              color: ANK.text,
            }}
          >
            <span
              style={{
                width: 10,
                height: 10,
                borderRadius: 3,
                background: d.color,
                display: 'inline-block',
              }}
            />
            {d.label}: <strong>{d.value}</strong> (%
            {Math.round((d.value / total) * 100)})
          </span>
        ))}
      </div>
    </div>
  );
}

// ── Dikey çubuk dağılımı — saat/aralık soruları ──
function BarDist({ options, counts, color = ANK.accent }) {
  const max = Math.max(1, ...options.map((o) => counts[o] || 0));
  const total = options.reduce((a, o) => a + (counts[o] || 0), 0);
  if (total === 0) {
    return <p style={{ fontSize: 12, color: ANK.textMuted, margin: 0 }}>Yanıt yok</p>;
  }
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 90 }}>
      {options.map((o) => {
        const c = counts[o] || 0;
        const h = Math.round((c / max) * 62);
        return (
          <div
            key={o}
            title={o + ': ' + c + ' yanıt'}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: 3,
              height: '100%',
            }}
          >
            <span style={{ fontSize: 10, fontWeight: 700, color: ANK.primary }}>
              {c > 0 ? c : ''}
            </span>
            <div
              style={{
                width: '100%',
                maxWidth: 38,
                height: Math.max(c > 0 ? 4 : 2, h),
                background: c > 0 ? color : '#F3F4F6',
                borderRadius: '4px 4px 0 0',
              }}
            />
            <span style={{ fontSize: 10, color: ANK.textMuted }}>{o}</span>
          </div>
        );
      })}
    </div>
  );
}

// ── Yorum listesi — metin yanıtları ──
function CommentList({ texts }) {
  const [showAll, setShowAll] = useState(false);
  if (texts.length === 0) {
    return <p style={{ fontSize: 12, color: ANK.textMuted, margin: 0 }}>Yorum yok</p>;
  }
  const visible = showAll ? texts : texts.slice(0, 5);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {visible.map((t, i) => (
        <div
          key={i}
          style={{
            padding: '8px 12px',
            background: '#F9FAFB',
            borderRadius: 8,
            borderLeft: '3px solid ' + ANK.accent,
            fontSize: 12.5,
            color: ANK.text,
            lineHeight: 1.5,
          }}
        >
          {t}
        </div>
      ))}
      {texts.length > 5 && (
        <button
          onClick={() => setShowAll((p) => !p)}
          style={{
            border: 'none',
            background: 'transparent',
            color: ANK.accent,
            fontSize: 12,
            fontWeight: 600,
            cursor: 'pointer',
            alignSelf: 'flex-start',
            padding: '4px 0',
          }}
        >
          {showAll ? 'Daha az göster' : 'Tümünü göster (' + texts.length + ')'}
        </button>
      )}
    </div>
  );
}

// ── Dışa aktarma yardımcıları ──
function buildExportTable(survey, responses) {
  const infoFields = survey.infoFields || [];
  const questions = survey.questions || [];
  const headers = [
    '#',
    'Tarih',
    'Rol',
    ...infoFields.map((f) => f.label || f.key),
    ...questions.map((q, i) => 'S' + (i + 1) + '. ' + q.text),
  ];
  const roleTr = { student: 'Öğrenci', professor: 'Akademisyen', alumni: 'Mezun' };
  const rows = responses.map((r, idx) => [
    idx + 1,
    (r.submittedAt || '').slice(0, 16).replace('T', ' '),
    roleTr[r.role] || r.role || '',
    ...infoFields.map((f) => r.answers?.[f.key] ?? ''),
    ...questions.map((q) => {
      const v = r.answers?.[q.id];
      if (v == null) return '';
      if (q.type === 'yesno') return v === 'evet' ? 'Evet' : v === 'hayır' ? 'Hayır' : v;
      return String(v);
    }),
  ]);
  return { headers, rows };
}

function downloadCSV(survey, responses) {
  const { headers, rows } = buildExportTable(survey, responses);
  const esc = (v) => {
    const s = String(v ?? '');
    return /[";\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  };
  // Türkçe Excel için BOM + noktalı virgül ayracı
  const csv = '﻿' + [headers, ...rows].map((row) => row.map(esc).join(';')).join('\r\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = (survey.title || 'anket').replace(/[^\wçğıöşüÇĞİÖŞÜ -]/g, '') + '_yanitlar.csv';
  a.click();
  URL.revokeObjectURL(a.href);
}

async function ensureXLSX() {
  if (window.XLSX) return window.XLSX;
  await new Promise((res, rej) => {
    const s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/xlsx-js-style@1.2.0/dist/xlsx.bundle.js';
    s.onload = res;
    s.onerror = () => rej(new Error('XLSX kütüphanesi yüklenemedi'));
    document.head.appendChild(s);
  });
  return window.XLSX;
}

async function downloadExcel(survey, responses) {
  const XLSX = await ensureXLSX();
  const { headers, rows } = buildExportTable(survey, responses);
  const wb = XLSX.utils.book_new();

  // Sayfa 1: ham yanıtlar
  const ws1 = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  ws1['!cols'] = headers.map((h, i) => ({ wch: i < 3 ? 12 : Math.min(50, h.length + 4) }));
  XLSX.utils.book_append_sheet(wb, ws1, 'Yanıtlar');

  // Sayfa 2: soru bazlı özet
  const summary = [['Soru', 'Tip', 'Yanıt Sayısı', 'Özet']];
  (survey.questions || []).forEach((q, i) => {
    const opts = optionsForType(q.type);
    let n = 0;
    let text = '';
    if (opts) {
      const counts = countAnswers(responses, q.id, opts);
      n = opts.reduce((a, o) => a + counts[o], 0);
      if (q.type === 'likert') {
        const sum = opts.reduce((a, o) => a + counts[o] * parseInt(o, 10), 0);
        text = n ? 'Ortalama: ' + (sum / n).toFixed(2) : '—';
      } else {
        text = opts.map((o) => o + ': ' + counts[o]).join(' | ');
      }
    } else {
      const texts = responses.map((r) => r.answers?.[q.id]).filter((v) => v && String(v).trim());
      n = texts.length;
      text = n + ' metin yanıtı';
    }
    summary.push(['S' + (i + 1) + '. ' + q.text, q.type, n, text]);
  });
  const ws2 = XLSX.utils.aoa_to_sheet(summary);
  ws2['!cols'] = [{ wch: 70 }, { wch: 12 }, { wch: 12 }, { wch: 50 }];
  XLSX.utils.book_append_sheet(wb, ws2, 'Özet');

  XLSX.writeFile(
    wb,
    (survey.title || 'anket').replace(/[^\wçğıöşüÇĞİÖŞÜ -]/g, '') + '_sonuclar.xlsx'
  );
}

function SonuclarPaneli({ surveys }) {
  const [surveyId, setSurveyId] = useState('');
  const [responses, setResponses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [courseFilter, setCourseFilter] = useState('');
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    setCourseFilter('');
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

  // Seçili anket başka oturumda silinmişse (realtime yenileme sonrası)
  // seçim sıfırlanır — aksi halde aşağıdaki render survey.questions'ta çöker.
  useEffect(() => {
    if (surveyId && !surveys.some((s) => s.id === surveyId)) {
      setSurveyId('');
    }
  }, [surveys, surveyId]);

  // Ders filtresi: yanıtlarda ders kodu alanı varsa aktifleşir
  const courseKeyField = useMemo(() => {
    const f = (survey?.infoFields || []).find((x) => x.source === 'courseCode');
    return f?.key || 'dersKodu';
  }, [survey]);
  const courseOptions = useMemo(() => {
    const set = new Map();
    responses.forEach((r) => {
      const code = r.answers?.[courseKeyField];
      if (code) {
        const nameField = (survey?.infoFields || []).find((x) => x.source === 'course');
        const name = nameField ? r.answers?.[nameField.key] : '';
        set.set(code, name || code);
      }
    });
    return [...set.entries()].map(([code, name]) => ({ code, name }));
  }, [responses, courseKeyField, survey]);

  const filtered = useMemo(
    () =>
      courseFilter
        ? responses.filter((r) => r.answers?.[courseKeyField] === courseFilter)
        : responses,
    [responses, courseFilter, courseKeyField]
  );

  // Genel Likert ortalaması
  const overallLikert = useMemo(() => {
    const likertQs = (survey?.questions || []).filter((q) => q.type === 'likert');
    let sum = 0;
    let n = 0;
    likertQs.forEach((q) => {
      filtered.forEach((r) => {
        const v = parseInt(r.answers?.[q.id] || 0, 10);
        if (v >= 1 && v <= 5) {
          sum += v;
          n++;
        }
      });
    });
    return n ? (sum / n).toFixed(2) : null;
  }, [survey, filtered]);

  const commentCount = useMemo(() => {
    const textQs = (survey?.questions || []).filter(
      (q) => q.type === 'textarea' || q.type === 'text'
    );
    return textQs.reduce(
      (acc, q) =>
        acc + filtered.filter((r) => r.answers?.[q.id] && String(r.answers[q.id]).trim()).length,
      0
    );
  }, [survey, filtered]);

  const handleExcel = async () => {
    setExporting(true);
    try {
      await downloadExcel(survey, filtered);
    } catch (e) {
      alert('Excel oluşturulamadı: ' + e.message);
    } finally {
      setExporting(false);
    }
  };

  const exportBtn = (onClick, label, primary) => (
    <button
      onClick={onClick}
      disabled={exporting}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '8px 14px',
        borderRadius: 8,
        border: primary ? 'none' : '1px solid ' + ANK.border,
        background: primary ? ANK.green : 'white',
        color: primary ? 'white' : ANK.green,
        fontSize: 12.5,
        fontWeight: 600,
        cursor: exporting ? 'wait' : 'pointer',
        opacity: exporting ? 0.6 : 1,
        fontFamily: "'Inter', sans-serif",
      }}
    >
      <AIcon path="M12 3v12m0 0l-4-4m4 4l4-4M4 21h16" size={14} />
      {label}
    </button>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ ...cardStyle, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ flex: 2, minWidth: 220 }}>
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
        {courseOptions.length > 0 && (
          <div style={{ flex: 1, minWidth: 180 }}>
            <label style={labelStyle}>Ders filtresi</label>
            <select
              value={courseFilter}
              onChange={(e) => setCourseFilter(e.target.value)}
              style={{ ...inputStyle, cursor: 'pointer' }}
            >
              <option value="">Tüm dersler</option>
              {courseOptions.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.code} — {c.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {surveyId &&
        survey &&
        (loading ? (
          <Spinner />
        ) : filtered.length === 0 ? (
          <EmptyState
            text={courseFilter ? 'Bu ders için yanıt yok.' : 'Bu anket için henüz yanıt yok.'}
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Özet kartları + dışa aktarma */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                gap: 12,
              }}
            >
              {[
                { label: 'Toplam yanıt', value: filtered.length, color: ANK.primary },
                {
                  label: 'Son yanıt',
                  value:
                    (
                      filtered
                        .map((r) => r.submittedAt || '')
                        .sort()
                        .pop() || ''
                    ).slice(0, 10) || '—',
                  color: ANK.blue,
                },
                {
                  label: 'Genel ortalama (1–5)',
                  value: overallLikert ?? '—',
                  color: ANK.accent,
                },
                { label: 'Yorum', value: commentCount, color: ANK.teal },
              ].map((k) => (
                <div key={k.label} style={{ ...cardStyle, padding: 16 }}>
                  <p style={{ fontSize: 12, color: ANK.textMuted, margin: 0 }}>{k.label}</p>
                  <p style={{ fontSize: 24, fontWeight: 700, color: k.color, margin: '4px 0 0' }}>
                    {k.value}
                  </p>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              {exportBtn(() => downloadCSV(survey, filtered), 'CSV indir', false)}
              {exportBtn(handleExcel, exporting ? 'Hazırlanıyor…' : 'Excel indir', true)}
            </div>

            {/* Soru bazlı grafikler */}
            {(survey.questions || []).map((q, i) => {
              const opts = optionsForType(q.type);
              return (
                <div key={q.id} style={{ ...cardStyle, padding: 18 }}>
                  <p
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: ANK.primary,
                      margin: '0 0 12px',
                      lineHeight: 1.4,
                    }}
                  >
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: 22,
                        height: 22,
                        borderRadius: '50%',
                        background: ANK.accentPale,
                        color: ANK.accent,
                        fontSize: 11,
                        fontWeight: 700,
                        marginRight: 8,
                      }}
                    >
                      {i + 1}
                    </span>
                    {q.text}
                  </p>
                  {q.type === 'likert' &&
                    (() => {
                      const counts = countAnswers(filtered, q.id, opts);
                      return (
                        <DonutChart
                          data={['1', '2', '3', '4', '5'].map((v, idx) => ({
                            label: LIKERT_LABELS[idx],
                            value: counts[v] || 0,
                            color: LIKERT_COLORS[idx],
                          }))}
                        />
                      );
                    })()}
                  {q.type === 'yesno' &&
                    (() => {
                      const counts = countAnswers(filtered, q.id, opts);
                      return (
                        <DonutChart
                          data={[
                            { label: 'Evet', value: counts['evet'] || 0, color: ANK.green },
                            { label: 'Hayır', value: counts['hayır'] || 0, color: ANK.red },
                          ]}
                        />
                      );
                    })()}
                  {(q.type === 'hours0to5' ||
                    q.type === 'hoursRange' ||
                    q.type === 'hoursExam') && (
                    <BarDist options={opts} counts={countAnswers(filtered, q.id, opts)} />
                  )}
                  {(q.type === 'textarea' || q.type === 'text') && (
                    <CommentList
                      texts={filtered
                        .map((r) => r.answers?.[q.id])
                        .filter((v) => v && String(v).trim())
                        .map(String)}
                    />
                  )}
                </div>
              );
            })}
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

  // Bana atanmış anketler: rol + bölüm + hedef grup eşleşmesi.
  // Eski şemadaki targetRole='alumni' kayıtları student+'Mezun' eşdeğeri sayılır.
  const isAlumni = !!(
    currentUser?.isAlumni ||
    currentUser?.mezun ||
    currentUser?.status === 'mezun'
  );
  const myClass = String(currentUser?.sinif || currentUser?.class || '').trim();
  const matchesGroup = useCallback(
    (role, group) => {
      if (role !== 'student') return true; // akademisyen grupları unvan bazlı — unvan verisi yok, tümü görür
      const g = (group || '').trim();
      if (!g || g === 'Tüm öğrenciler') return true; // grupsuz eski kayıtlar herkese görünür
      if (g === 'Mezun') return isAlumni;
      // '1. sınıf' vb. — mezunlar sınıf gruplarını görmez;
      // kullanıcının sınıfı biliniyorsa eşleştir, bilinmiyorsa göster
      if (isAlumni) return false;
      if (!myClass) return true;
      return g.startsWith(myClass + '.');
    },
    [isAlumni, myClass]
  );
  const myAssignments = useMemo(() => {
    const seen = new Set();
    return assignments.filter((a) => {
      // alumni → student+'Mezun' geriye dönük eşdeğerlik
      const role = a.targetRole === 'alumni' ? 'student' : a.targetRole;
      const group = a.targetRole === 'alumni' ? 'Mezun' : a.targetGroup;
      if (role !== myRole) return false;
      if (a.departmentId && activeDepartment && a.departmentId !== activeDepartment) return false;
      if (!matchesGroup(role, group)) return false;
      if (seen.has(a.surveyId)) return false; // aynı anket birden fazla gruba atanmışsa tek göster
      seen.add(a.surveyId);
      return true;
    });
  }, [assignments, myRole, activeDepartment, matchesGroup]);

  const completed = (surveyId) => myResponses.some((r) => r.surveyId === surveyId);

  const submit = async (surveyId, answers) => {
    // Kimliği çözülemeyen kullanıcı ('anon') yanıt gönderemez — aksi halde
    // tüm anonim kullanıcılar tek 'anon' kaydında birbirine karışırdı.
    if (!myId || myId === 'anon') {
      toast.show('Oturum kimliğiniz çözülemedi, lütfen yeniden giriş yapın.');
      return;
    }
    // Mükerrer gönderim koruması: kart açıkken (iki sekme / geç yüklenen
    // myResponses / tekrar tıklama) sunucuya ikinci yanıt gitmesini engelle.
    if (completed(surveyId)) {
      setActiveId(null);
      toast.show('Bu anketi zaten yanıtladınız.');
      return;
    }
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
          activeDepartment={activeDepartment}
        />
        {toast.node}
      </>
    );
  }

  return (
    <div className="ank-root" style={{ fontFamily: "'Inter', sans-serif" }}>
      <AnkStyles />
      <PageHeader
        icon="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
        title="Anketlerim"
        subtitle="Size atanan anketleri doldurun"
        responsive={responsive}
      />

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
                className={'ank-card' + (done ? '' : ' ank-card-hover')}
                style={{
                  ...cardStyle,
                  padding: 16,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 14,
                  cursor: done ? 'default' : 'pointer',
                  opacity: done ? 0.7 : 1,
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
                  <p
                    style={{
                      fontSize: 14,
                      fontWeight: 600,
                      color: ANK.primary,
                      margin: 0,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      flexWrap: 'wrap',
                    }}
                  >
                    {survey.title}
                    {a.mandatory && (
                      <span
                        style={{
                          padding: '1px 8px',
                          borderRadius: 10,
                          background: ANK.redLight,
                          color: ANK.red,
                          fontSize: 10.5,
                          fontWeight: 700,
                        }}
                      >
                        Zorunlu
                      </span>
                    )}
                  </p>
                  <p style={{ fontSize: 12, color: ANK.textMuted, margin: '2px 0 0' }}>
                    {survey.questions?.length || 0} soru · Son: {fmtDueDate(a.dueDate)}
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
// ─── Bilgi alanları (DB'den dropdown'lar) ──────────────────────────────────
// source: 'department' → DEPARTMENTS açılır listesi
//         'course'     → seçili bölümün dersleri (sinav_dersler); seçince
//                        codeKey alanına ders kodunu da yazar
//         'courseCode' → ders seçimiyle otomatik dolan, salt-okunur alan
//         (tanımsız)   → düz metin girişi (cinsiyet, sınıf vb.)
function InfoFieldsForm({ fields, values, onChange, activeDepartment, linkedCourses }) {
  const departments = window.DEPARTMENTS || [];
  const [courses, setCourses] = useState([]);
  const [deptId, setDeptId] = useState(activeDepartment || '');
  const [courseId, setCourseId] = useState('');

  // Dersleri yükle (sinav_dersler)
  useEffect(() => {
    let alive = true;
    window
      .apiRead('sinav_dersler')
      .then((c) => {
        if (alive) setCourses(c || []);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  // Aktif bölüm varsa "Bölüm" alanını otomatik doldur
  useEffect(() => {
    if (!activeDepartment) return;
    const d = departments.find((x) => x.id === activeDepartment);
    const deptField = fields.find((f) => f.source === 'department');
    if (d && deptField && !values[deptField.key]) onChange(deptField.key, d.name);
  }, []);

  // Anket derslerle eşleştirilmişse yalnızca o dersler listelenir.
  // Eşleşme kod-öncelikli: ders adı sonradan değişse bile kod eşleşir;
  // kodsuz eşleştirmeler ad üzerinden bulunur. Hiçbir ders bulunamazsa
  // (ders silinmiş/yeniden adlandırılmış) katılımcıyı kilitlememek için
  // tüm derslere geri dönülür.
  const deptCourses = useMemo(() => {
    const base = courses.filter((c) => !deptId || (c.departmentId || '') === deptId);
    if (!linkedCourses || linkedCourses.length === 0) return base;
    const codeKeys = new Set(linkedCourses.filter((l) => l.code).map((l) => l.code));
    const nameKeys = new Set(linkedCourses.filter((l) => !l.code && l.name).map((l) => l.name));
    const isMatch = (c) => (c.code && codeKeys.has(c.code)) || nameKeys.has(c.name || '');
    const matched = base.filter(isMatch);
    if (matched.length > 0) return matched;
    // Bölüm filtresi dışında kalan eşleşmeler (başka bölümün dersi)
    const anyDept = courses.filter(isMatch);
    if (anyDept.length > 0) return anyDept;
    return base;
  }, [courses, deptId, linkedCourses]);

  const selectStyle = { ...inputStyle, cursor: 'pointer' };
  const fieldLabel = { fontSize: 12, color: ANK.textMuted, display: 'block', marginBottom: 4 };

  const renderField = (f) => {
    if (f.source === 'department') {
      return (
        <select
          value={deptId}
          onChange={(e) => {
            const id = e.target.value;
            setDeptId(id);
            setCourseId('');
            onChange(f.key, departments.find((d) => d.id === id)?.name || '');
            // Bölüm değişince ders alanlarını temizle
            fields
              .filter((x) => x.source === 'course' || x.source === 'courseCode')
              .forEach((x) => onChange(x.key, ''));
          }}
          style={selectStyle}
        >
          <option value="">— Bölüm seçin —</option>
          {departments.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
      );
    }
    if (f.source === 'course') {
      return (
        <select
          value={courseId}
          disabled={!deptId}
          onChange={(e) => {
            const id = e.target.value;
            setCourseId(id);
            const course = deptCourses.find((c) => c.id === id);
            onChange(f.key, course?.name || '');
            if (f.codeKey) onChange(f.codeKey, course?.code || '');
          }}
          style={{ ...selectStyle, background: deptId ? 'white' : '#F3F4F6' }}
        >
          <option value="">{deptId ? '— Ders seçin —' : 'Önce bölüm seçin'}</option>
          {deptCourses.map((c) => (
            <option key={c.id} value={c.id}>
              {c.code ? c.code + ' — ' : ''}
              {c.name}
            </option>
          ))}
        </select>
      );
    }
    if (f.source === 'courseCode') {
      return (
        <input
          value={values[f.key] || ''}
          disabled
          placeholder="Ders seçilince otomatik dolar"
          style={{ ...inputStyle, background: '#F3F4F6' }}
        />
      );
    }
    // Cinsiyet → Erkek / Kadın / Diğer açılır listesi
    if (f.key === 'cinsiyet' || f.source === 'gender') {
      return (
        <select
          value={values[f.key] || ''}
          onChange={(e) => onChange(f.key, e.target.value)}
          style={selectStyle}
        >
          <option value="">— Seçin —</option>
          <option value="Erkek">Erkek</option>
          <option value="Kadın">Kadın</option>
          <option value="Diğer">Diğer</option>
        </select>
      );
    }
    // Sınıf → yalnızca tek haneli bir sayı (1–9)
    if (f.key === 'sinif' || f.source === 'classNo') {
      return (
        <input
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={values[f.key] || ''}
          onChange={(e) => onChange(f.key, e.target.value.replace(/\D/g, '').slice(0, 1))}
          placeholder="Sınıf (tek rakam)"
          style={inputStyle}
        />
      );
    }
    return (
      <input
        value={values[f.key] || ''}
        onChange={(e) => onChange(f.key, e.target.value)}
        placeholder={f.label}
        style={inputStyle}
      />
    );
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
      {fields.map((f) => (
        <div key={f.key}>
          <label style={fieldLabel}>{f.label}</label>
          {renderField(f)}
        </div>
      ))}
    </div>
  );
}

function AnketDoldurma({ survey, onSubmit, onCancel, activeDepartment, forced }) {
  const [answers, setAnswers] = useState({});
  const [info, setInfo] = useState({});
  const [saving, setSaving] = useState(false);

  const setAns = (id, v) => setAnswers((p) => ({ ...p, [id]: v }));
  const setInfoField = (key, v) => setInfo((p) => ({ ...p, [key]: v }));

  const required = survey.questions.filter((q) => q.type !== 'textarea');
  const answered = required.filter((q) => answers[q.id] != null && answers[q.id] !== '').length;
  // Bilgi alanları (bölüm, sınıf, cinsiyet, ders…) da tamamlanmalı.
  const infoFields = survey.infoFields || [];
  const infoDone = infoFields.filter((f) => info[f.key] && String(info[f.key]).trim()).length;
  const totalNeeded = required.length + infoFields.length;
  const totalDone = answered + infoDone;
  const pct = totalNeeded ? Math.round((totalDone / totalNeeded) * 100) : 100;
  // Tüm cevaplar tamamlanmadan gönder butonu aktifleşmez.
  const canSubmit = totalDone >= totalNeeded;

  const submit = async () => {
    if (!canSubmit) return;
    setSaving(true);
    try {
      await onSubmit(survey.id, { ...info, ...answers });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ fontFamily: "'Inter', sans-serif" }}>
      {forced ? (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            marginBottom: 14,
            padding: '11px 14px',
            borderRadius: 10,
            background: ANK.amberLight,
            border: '1px solid #FDE68A',
          }}
        >
          <AIcon
            path="M12 9v2m0 4h.01M5.07 19h13.86a2 2 0 001.75-2.98l-6.93-12a2 2 0 00-3.5 0l-6.93 12A2 2 0 005.07 19z"
            size={18}
            color={ANK.amber}
          />
          <span style={{ fontSize: 13, fontWeight: 600, color: ANK.amber }}>
            Zorunlu anket — devam etmek için bu anketi doldurmanız gerekiyor.
          </span>
        </div>
      ) : (
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
      )}

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

      <div style={{ ...cardStyle, display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div style={{ borderBottom: '1px solid #F3F4F6', paddingBottom: 16 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: ANK.primary, margin: '0 0 4px' }}>
            {survey.title}
          </h2>
          <p style={{ fontSize: 13, color: ANK.textMuted, margin: 0 }}>{survey.description}</p>
        </div>

        {survey.infoFields?.length > 0 && (
          <InfoFieldsForm
            fields={survey.infoFields}
            values={info}
            onChange={setInfoField}
            activeDepartment={activeDepartment}
            linkedCourses={survey.linkedCourses}
          />
        )}

        {survey.questions.map((q, i) => (
          <SoruBilesen key={q.id} soru={q} numara={i + 1} deger={answers[q.id]} onChange={setAns} />
        ))}

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 10,
            flexWrap: 'wrap',
            borderTop: '1px solid #F3F4F6',
            paddingTop: 16,
          }}
        >
          <span style={{ fontSize: 12, color: canSubmit ? ANK.accentDark : ANK.textMuted }}>
            {canSubmit
              ? 'Tüm sorular yanıtlandı — gönderebilirsiniz.'
              : `${totalDone}/${totalNeeded} tamamlandı — tümü doldurulunca gönderilebilir.`}
          </span>
          <div style={{ display: 'flex', gap: 10 }}>
            {onCancel && (
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
            )}
            <button
              onClick={submit}
              disabled={saving || !canSubmit}
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
                cursor: saving ? 'wait' : canSubmit ? 'pointer' : 'not-allowed',
                opacity: saving ? 0.7 : canSubmit ? 1 : 0.45,
              }}
            >
              <AIcon path="M5 13l4 4L19 7" size={15} /> {saving ? 'Gönderiliyor…' : 'Anketi gönder'}
            </button>
          </div>
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
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {opts.map((o) => {
            const sel = deger === o.v;
            return (
              <button
                key={o.v}
                onClick={() => onChange(soru.id, o.v)}
                title={o.l.replace('\n', ' ')}
                style={{
                  flex: '1 1 92px',
                  maxWidth: 130,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 4,
                  padding: '9px 4px',
                  borderRadius: 9,
                  cursor: 'pointer',
                  border: '1.5px solid ' + (sel ? ANK.accent : ANK.border),
                  background: sel ? ANK.accentPale : 'white',
                  color: sel ? ANK.accentDark : ANK.textMuted,
                  fontFamily: "'Inter', sans-serif",
                }}
              >
                <span style={{ fontSize: 18, fontWeight: 800 }}>{o.v}</span>
                <span
                  style={{
                    fontSize: 10.5,
                    fontWeight: sel ? 600 : 500,
                    textAlign: 'center',
                    lineHeight: 1.2,
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
                width: 40,
                height: 40,
                padding: 0,
                fontSize: 15,
                fontWeight: 700,
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
          rows={2}
          value={deger || ''}
          onChange={(e) => onChange(soru.id, e.target.value)}
          placeholder="Görüşlerinizi buraya yazınız…"
          style={{ ...inputStyle, fontSize: 14, resize: 'vertical' }}
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
        style={{ ...inputStyle, fontSize: 14 }}
      />
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// ZORUNLU ANKET KAPISI
//   Katılımcı (öğrenci/akademisyen) sisteme girdiğinde, kendisine ZORUNLU
//   olarak atanmış ve henüz doldurmadığı bir anket varsa tam ekran olarak
//   gösterilir; doldurmadan uygulamayı kullanamaz. app-shell tarafından
//   kimlik doğrulanmış her katılımcı için mount edilir.
// ══════════════════════════════════════════════════════════════
function AnketZorunluGate({ currentUser, activeDepartment }) {
  const [ready, setReady] = useState(false);
  const [assignments, setAssignments] = useState([]);
  const [surveys, setSurveys] = useState([]);
  const [myResponses, setMyResponses] = useState([]);

  const myRole = currentUser?.role;
  const myId =
    currentUser?.id || currentUser?._id || currentUser?.identifier || currentUser?.name || 'anon';

  const isAlumni = !!(
    currentUser?.isAlumni ||
    currentUser?.mezun ||
    currentUser?.status === 'mezun'
  );
  const myClass = String(currentUser?.sinif || currentUser?.class || '').trim();

  const load = useCallback(async () => {
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
      console.error('Zorunlu anket kontrolü başarısız:', e);
    } finally {
      setReady(true);
    }
  }, [myId]);

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

  const matchesGroup = (role, group) => {
    if (role !== 'student') return true;
    const g = (group || '').trim();
    if (!g || g === 'Tüm öğrenciler') return true;
    if (g === 'Mezun') return isAlumni;
    if (isAlumni) return false;
    if (!myClass) return true;
    return g.startsWith(myClass + '.');
  };

  // İlk doldurulmamış zorunlu atama
  const pending = useMemo(() => {
    if (!myRole || myId === 'anon') return null;
    const completedIds = new Set(myResponses.map((r) => r.surveyId));
    for (const a of assignments) {
      if (!a.mandatory) continue;
      const role = a.targetRole === 'alumni' ? 'student' : a.targetRole;
      const group = a.targetRole === 'alumni' ? 'Mezun' : a.targetGroup;
      if (role !== myRole) continue;
      if (a.departmentId && activeDepartment && a.departmentId !== activeDepartment) continue;
      if (!matchesGroup(role, group)) continue;
      if (completedIds.has(a.surveyId)) continue;
      const survey = surveys.find((s) => s.id === a.surveyId);
      if (survey) return { assignment: a, survey };
    }
    return null;
  }, [assignments, surveys, myResponses, myRole, myId, activeDepartment, isAlumni, myClass]);

  const submit = async (surveyId, answers) => {
    if (!myId || myId === 'anon') return;
    await window.DBWrite.add('survey_responses', {
      surveyId,
      userId: myId,
      role: myRole,
      answers,
      submittedAt: new Date().toISOString(),
    });
    await load();
  };

  if (!ready || !pending) return null;

  return (
    <div
      className="ank-root"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 4000,
        background: 'rgba(15,23,42,0.55)',
        overflowY: 'auto',
        padding: '24px 16px',
        fontFamily: "'Inter', sans-serif",
      }}
    >
      <AnkStyles />
      <div style={{ maxWidth: 760, margin: '0 auto' }}>
        <AnketDoldurma
          survey={pending.survey}
          onSubmit={submit}
          onCancel={null}
          activeDepartment={activeDepartment}
          forced
        />
      </div>
    </div>
  );
}

if (typeof window !== 'undefined') {
  window.AnketModulu = AnketModulu;
  window.AnketZorunluGate = AnketZorunluGate;
}
