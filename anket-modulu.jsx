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

  // ── Kapsam çözümü için bölümler DB'DEN okunur ──
  // Gömülü `window.DEPARTMENTS` listesindeki çekirdek 6 bölümün `facultyId`
  // alanı sabit 'muhendislik' metnidir; fakülte yetkilisinin profilindeki
  // facultyId ise DB kimliğidir (ObjectId). Kapsam yalnız gömülü listeyle
  // çözülünce hiçbiri eşleşmiyor, fakülte yetkilisinin kapsamı BOŞ çıkıyor ve
  // atadığı anket kimseye ulaşmıyordu (boş kapsam = kimse).
  const [dbBolumler, setDbBolumler] = useState([]);
  useEffect(() => {
    let alive = true;
    window
      .apiRead('departments')
      .catch(() => [])
      .then((d) => {
        if (alive) setDbBolumler(d || []);
      });
    return () => {
      alive = false;
    };
  }, []);

  // Bu yetkilinin yayın kapsamı (bölüm / fakülte / üniversite) — atama yazarken
  // kayda geçer, atama listesini süzerken de kullanılır.
  const kapsamBolumleriTum = useMemo(
    () =>
      window.kapsamBolumListesi
        ? window.kapsamBolumListesi(dbBolumler, FACULTY_DEPARTMENTS)
        : FACULTY_DEPARTMENTS,
    [dbBolumler, FACULTY_DEPARTMENTS]
  );
  const yayinKapsami = useMemo(
    () =>
      window.yayinKapsamCoz
        ? window.yayinKapsamCoz(currentUser, kapsamBolumleriTum)
        : { kapsamTuru: 'bolum', facultyId: '', departmentIds: [] },
    [currentUser, kapsamBolumleriTum]
  );

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

  // Yetkilinin yönetebileceği atamalar. Koleksiyonun tamamı okunuyor (atama
  // sayısı küçük), ama listede yalnız kendi kapsamına girenler görünür: bir
  // bölüm yetkilisi başka bölümün — hele başka fakültenin — atamasını
  // görmemeli, kaldıramamalı.
  const yonetilebilirAtamalar = useMemo(() => {
    // Kural yüklenemediyse liste BOŞ kalır, tamamı DEĞİL. Bir yetki kararında
    // "kural yoksa hepsini göster" yanlış taraftır: eksik gösterim fark
    // edilip bildirilir, fazla gösterim sessizce yetki genişletir.
    if (!window.yayinYonetilebilirMi) {
      console.warn('Yayın kapsamı kuralı yüklenemedi — atama listesi gösterilmiyor.');
      return [];
    }
    return (assignments || []).filter((a) => window.yayinYonetilebilirMi(a, yayinKapsami));
  }, [assignments, yayinKapsami]);

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

  // ── ANKETİN KENDİSİNİN KAPSAMI ──
  // ⚠ Kapsam yalnız ATAMA kaydında vardı; anketin kendisinde yoktu ve
  // "Anketler" sekmesi koleksiyonun tamamını listeliyordu: her yetkili her
  // anketi görüyor, düzenliyor ve SİLEBİLİYORDU. Kural artık kaydın üzerinde
  // (lib/anket-kapsam.js) ve iki ayrı soruya cevap veriyor: görünür mü,
  // yönetilebilir mi?
  // Rozette bölüm ADI yazabilmek için kimlik→ad listesi: kapsam listesi
  // yalnız {id, facultyId} taşır, ad ondan çıkmaz.
  const bolumAdListesi = useMemo(() => {
    const out = [];
    const ekle = (id, name) => {
      const k = String(id || '');
      if (k && name && !out.some((x) => x.id === k)) out.push({ id: k, name: String(name) });
    };
    (dbBolumler || []).forEach((d) => {
      if (!d) return;
      [d.id, d._id, d._docId, d.code].forEach((v) => ekle(v, d.name));
    });
    (FACULTY_DEPARTMENTS || []).forEach((d) => d && ekle(d.id, d.name));
    return out;
  }, [dbBolumler, FACULTY_DEPARTMENTS]);

  const anketOzeti = useMemo(() => {
    if (!window.anketleriSuz) {
      // Kural yüklenemediyse liste BOŞ kalır. Yetki kararında "kural yoksa
      // hepsini göster" yanlış taraftır.
      console.warn('Anket kapsam kuralı yüklenemedi — liste gösterilmiyor.');
      return { liste: [], gizlenen: 0, yonetilebilir: 0 };
    }
    return window.anketleriSuz(surveys, yayinKapsami, {
      user: currentUser,
      bolumler: bolumAdListesi,
    });
  }, [surveys, yayinKapsami, currentUser, bolumAdListesi]);
  const gorunenAnketler = anketOzeti.liste;

  const addSurvey = async (survey) => {
    // Kapsam yayımcının KENDİ yetki alanıdır; ekrandan genişletilemez.
    const kapsamYamasi = window.anketKapsamYamasi
      ? window.anketKapsamYamasi(yayinKapsami, currentUser)
      : {};
    await window.DBWrite.add('surveys', {
      ...survey,
      ...kapsamYamasi,
      createdBy: currentUser?.name || '',
    });
    await load();
    toast.show(survey.title + ' yüklendi');
  };
  const updateSurvey = async (id, survey) => {
    const mevcut = surveys.find((x) => String(x.id) === String(id));
    if (mevcut && window.anketYonetilebilirMi) {
      if (!window.anketYonetilebilirMi(mevcut, yayinKapsami, currentUser)) {
        alert(window.anketKilitSebebi(mevcut, yayinKapsami, currentUser));
        return;
      }
    }
    // Kapsamsız (eski) kayıt ilk kaydedişte damgalanır — sahibi belirsiz
    // kayıtlar zamanla eriyip gitsin.
    const kapsamYamasi =
      mevcut &&
      window.anketKapsamliMi &&
      !window.anketKapsamliMi(mevcut) &&
      window.anketKapsamYamasi
        ? window.anketKapsamYamasi(yayinKapsami, currentUser)
        : {};
    await window.DBWrite.set(
      'surveys',
      id,
      { ...survey, ...kapsamYamasi, updatedBy: currentUser?.name || '' },
      true
    );
    await load();
    toast.show('Anket güncellendi');
  };
  const removeSurvey = async (id) => {
    const mevcut = surveys.find((x) => String(x.id) === String(id));
    if (mevcut && window.anketYonetilebilirMi) {
      if (!window.anketYonetilebilirMi(mevcut, yayinKapsami, currentUser)) {
        alert(window.anketKilitSebebi(mevcut, yayinKapsami, currentUser));
        return;
      }
    }
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
      // Kopya KOPYALAYANIN kapsamına yazılır: başka bir bölümün anketini
      // çoğaltan fakülte yetkilisi, kopyanın sahibi olur.
      ...(window.anketKapsamYamasi ? window.anketKapsamYamasi(yayinKapsami, currentUser) : {}),
      createdBy: currentUser?.name || '',
    };
    await window.DBWrite.add('surveys', copy);
    await load();
    toast.show('Anket çoğaltıldı');
  };
  // Atamanın KAPSAMI kayda yazılır: bölüm yetkilisi → kendi bölüm(ler)i,
  // fakülte yetkilisi → fakültesinin tüm bölümleri, üniversite yetkilisi →
  // tüm fakülteler. Önceden yalnız `departmentId` yazılıyordu ve okuma tarafı
  // "alan boşsa herkese göster" diyordu; Bilgisayar'a atanan anket Orman'da
  // görünüyordu. Kapsam artık kaydın üzerinde durur ve okumada zorunludur.
  const saveAssignment = async (data) => {
    const { kapsamSecimi, ...kayit } = data;
    // Kapsam, bileşen genelinde çözülmüş olanla AYNI olmalı: burada yeniden
    // gömülü listeyle çözmek, yönetim listesinin gördüğüyle kayda yazılanı
    // ayrıştırırdı.
    const kapsam = yayinKapsami;
    // Seçim yalnız DARALTIR: kapsamı aşan bir seçim (ör. başka fakülte)
    // yok sayılır ve kayıt yayımcının tam kapsamıyla yazılır.
    const kapsamYamasi =
      kapsam && window.yayinKapsamYamasi
        ? window.yayinKapsamYamasi(kapsam, kapsamSecimi, kapsamBolumleriTum)
        : {};
    await window.DBWrite.add('survey_assignments', {
      ...kayit,
      ...kapsamYamasi,
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
        title="Anketler"
        subtitle={
          (yayinKapsami.kapsamTuru === 'universite'
            ? 'Üniversite'
            : yayinKapsami.kapsamTuru === 'fakulte'
              ? window.useFakulteAdlari
                ? (window.useFakulteAdlari() || {})[yayinKapsami.facultyId] || 'Fakülte'
                : 'Fakülte'
              : departmentInfo?.name || 'Bölüm') +
          ' yönetici paneli — anket oluştur, ata ve sonuçları izle'
        }
        responsive={responsive}
      />
      <SegTabs tabs={tabs} active={tab} onChange={setTab} />

      {loading ? (
        <Spinner />
      ) : (
        <>
          {tab === 'anketler' && (
            <AnketlerPaneli
              surveys={gorunenAnketler}
              kapsam={yayinKapsami}
              kapsamOzeti={anketOzeti}
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
              surveys={gorunenAnketler}
              // Yetkili yalnız KENDİ kapsamındaki atamaları görür ve kaldırır —
              // bir bölüm yetkilisinin başka bölümün atamasını silmesi olmaz.
              assignments={yonetilebilirAtamalar}
              onAssign={saveAssignment}
              onRemoveAssignment={removeAssignment}
              activeDepartment={activeDepartment}
              departmentInfo={departmentInfo}
              departments={FACULTY_DEPARTMENTS}
              kapsam={yayinKapsami}
            />
          )}
          {tab === 'sonuclar' && <SonuclarPaneli surveys={gorunenAnketler} />}
        </>
      )}

      {toast.node}
    </div>
  );
}

// Kapsam rozetinin renkleri — ton adı kuraldan (lib/anket-kapsam.js) gelir,
// renk buraya aittir.
const KAPSAM_RENK = {
  universite: { zemin: '#EDE9FE', renk: '#5B21B6' },
  fakulte: { zemin: '#DBEAFE', renk: '#1D4ED8' },
  bolum: { zemin: '#CCFBF1', renk: '#0F766E' },
  eski: { zemin: '#F3F4F6', renk: '#6B7280' },
};

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
      /* Öğrenci Likert seçenek kartları — hover'da vurgulanır */
      .ank-likert:hover { border-color:${ANK.accent} !important; background:${ANK.accentPale}; }
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
      {icon && (
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
      )}
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
  kapsam,
  kapsamOzeti,
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

      {/* Kapsam şeridi: yetkili neyi gördüğünü ve neye dokunabildiğini bilsin.
          Düğmeyi sessizce kapatmak "sistem bozuk" izlenimi veriyor. */}
      <div
        style={{
          ...cardStyle,
          padding: '12px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          flexWrap: 'wrap',
          background: ANK.bluePale || '#F8FAFF',
        }}
      >
        <AIcon
          path="M12 11c0-3.5 2.5-6 6-6v6c0 3.5-2.5 6-6 6s-6-2.5-6-6V5c3.5 0 6 2.5 6 6z"
          size={16}
          color={ANK.blue}
        />
        <span style={{ fontSize: 12.5, color: ANK.text, flex: '1 1 260px', lineHeight: 1.5 }}>
          {window.anketKapsamOzetMetni
            ? window.anketKapsamOzetMetni(kapsam, kapsamOzeti)
            : surveys.length + ' anket'}
        </span>
        {kapsamOzeti && kapsamOzeti.gizlenen > 0 && (
          <span
            title="Başka fakültelerin anketleri listede gösterilmez."
            style={{
              padding: '3px 10px',
              borderRadius: 10,
              background: ANK.border,
              color: ANK.textMuted,
              fontSize: 11,
              fontWeight: 600,
              whiteSpace: 'nowrap',
            }}
          >
            {kapsamOzeti.gizlenen} anket kapsam dışı
          </span>
        )}
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
                  {/* Kapsam rozeti: anket kimin? Fakülte yetkilisi listede
                      hem kendi fakülte anketlerini hem bölümlerinkini görür;
                      hangisinin hangisi olduğu yazmazsa liste okunmaz. */}
                  {s._etiket && (
                    <span
                      title={s._kilitSebebi || 'Bu anketi düzenleyebilirsiniz'}
                      style={{
                        padding: '2px 9px',
                        borderRadius: 10,
                        background: KAPSAM_RENK[s._etiket.ton].zemin,
                        color: KAPSAM_RENK[s._etiket.ton].renk,
                        fontSize: 11,
                        fontWeight: 700,
                      }}
                    >
                      {s._etiket.etiket}
                    </span>
                  )}
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
                  {/* Yetki yoksa düğme "Görüntüle"ye döner: anket kilitli
                      olsa da içeriğine bakabilmek gerekir. */}
                  <button
                    onClick={() =>
                      setEditing({ ...s, _isNew: false, _saltOkunur: !s._yonetilebilir })
                    }
                    className="ank-btn"
                    title={s._kilitSebebi || 'Anketi düzenle'}
                    style={{
                      flex: 1,
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                      padding: '8px 10px',
                      borderRadius: 8,
                      border: '1px solid ' + ANK.border,
                      background: s._yonetilebilir ? ANK.accentPale : ANK.surfaceAlt || '#F3F4F6',
                      color: s._yonetilebilir ? ANK.accent : ANK.textMuted,
                      fontSize: 12.5,
                      fontWeight: 600,
                      cursor: 'pointer',
                      fontFamily: "'Inter', sans-serif",
                    }}
                  >
                    <AIcon
                      path={
                        s._yonetilebilir
                          ? 'M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z'
                          : 'M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z'
                      }
                      size={13}
                      color={s._yonetilebilir ? ANK.accent : ANK.textMuted}
                    />
                    {s._yonetilebilir ? 'Düzenle' : 'Görüntüle'}
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
                  {/* Silme yetkisi yoksa düğme HİÇ ÇİZİLMEZ: tıklanan ama
                      her seferinde reddedilen bir düğme, kullanıcıya yetkisi
                      varmış gibi görünür. Sebep rozette yazılı. */}
                  {s._yonetilebilir && (
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
                  )}
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
  { v: 'likert', label: 'Likert / derecelendirme' },
  { v: 'secenek', label: 'Çoktan seçmeli (tek yanıt)' },
  { v: 'coklu', label: 'Çoktan seçmeli (çok yanıt)' },
  { v: 'yesno', label: 'Evet / Hayır' },
  { v: 'hours0to5', label: 'Saat (0-5)' },
  { v: 'hoursRange', label: 'Saat aralığı (0, 1-2…)' },
  { v: 'hoursExam', label: 'Sınav saati (0, 1-4…)' },
  { v: 'textarea', label: 'Uzun metin' },
  { v: 'text', label: 'Kısa metin' },
];
// ─── Bir sorunun şıklarını düzenleme ────────────────────────────────────
// ⚠ BU EKRAN HİÇ YOKTU. Şıklar koda gömülü olduğu için anketi hazırlayan
// kişi ne etiketi değiştirebiliyor ne şık ekleyebiliyordu; elinde başka bir
// ölçek olan herkes anketi sisteme uydurmak zorundaydı.
//
// İki yol sunulur: hazır bir ölçek seç (tek tıkla beş şık) ya da tek tek
// yaz. Seçilen ölçek KOPYALANIR — hemen ardından bir etiketi düzeltmek
// serbesttir.
//
// ── DEĞER AYRI, ETİKET AYRI ──
// Kayıtlı yanıt şıkkın DEĞERİdir. Etiket sonradan düzeltilebilsin ve eski
// yanıtlar bozulmasın diye ikisi ayrı tutulur; değer alanı "gelişmiş"
// olduğu için ikinci planda, küçük ve isteğe bağlı gösterilir.
function SecenekDuzenleyici({ soru, onChange }) {
  const [degerleriGoster, setDegerleriGoster] = useState(false);
  const secenekler = soruSecenekleri(soru);
  const ozelMi = Array.isArray(soru.secenekler) && soru.secenekler.length > 0;
  const olcekId = window.anketOlcekKimligi ? window.anketOlcekKimligi(soru) : '';
  const hatalar = window.anketSecenekHatalari ? window.anketSecenekHatalari(soru) : [];
  const sirali = window.anketOlcekSiraliMi ? window.anketOlcekSiraliMi(soru) : false;

  // Gömülü ölçekle çalışan soruya ilk dokunuşta liste soruya KOPYALANIR:
  // kullanıcı "varsayılanı düzenliyorum" sanıp başka soruları bozmasın.
  const yaz = (liste) => onChange({ secenekler: liste.map((o) => ({ ...o })) });
  const duzenle = (i, yama) => yaz(secenekler.map((o, idx) => (idx === i ? { ...o, ...yama } : o)));
  const sil = (i) => yaz(secenekler.filter((_, idx) => idx !== i));
  const tasi = (i, yon) =>
    yaz(window.anketSecenegiTasi ? window.anketSecenegiTasi(secenekler, i, yon) : secenekler);
  const ekle = () =>
    yaz([
      ...secenekler,
      {
        deger: window.anketYeniSecenekDegeri ? window.anketYeniSecenekDegeri(secenekler) : '',
        etiket: '',
      },
    ]);

  const kucukBtn = (renk) => ({
    width: 24,
    height: 24,
    borderRadius: 6,
    border: '1px solid ' + ANK.border,
    background: 'white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    padding: 0,
    color: renk || ANK.textMuted,
    flexShrink: 0,
  });

  return (
    <div
      style={{
        border: '1px dashed ' + ANK.border,
        borderRadius: 9,
        padding: 10,
        background: 'white',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 11.5, fontWeight: 700, color: ANK.textMuted }}>
          ŞIKLAR ({secenekler.length})
        </span>
        <select
          value={olcekId}
          onChange={(e) => {
            const v = e.target.value;
            if (!v) return;
            yaz(window.anketOlcekSecenekleri ? window.anketOlcekSecenekleri(v) : []);
          }}
          style={{
            ...inputStyle,
            width: 'auto',
            minWidth: 170,
            padding: '5px 8px',
            fontSize: 12,
            marginLeft: 'auto',
          }}
          title="Hazır bir ölçek seçin; şıklar kopyalanır ve düzenlenebilir kalır"
        >
          <option value="">Hazır ölçek uygula…</option>
          {(window.ANKET_OLCEKLERI || []).map((o) => (
            <option key={o.id} value={o.id}>
              {o.ad} — {o.ornek}
            </option>
          ))}
        </select>
      </div>

      {!ozelMi && (
        <p style={{ fontSize: 11, color: ANK.textMuted, margin: 0, lineHeight: 1.5 }}>
          Şu an bu tipin varsayılan ölçeği kullanılıyor. Aşağıdan düzenlerseniz şıklar bu soruya
          özel hâle gelir.
        </p>
      )}

      {secenekler.map((o, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span
            style={{
              width: 20,
              fontSize: 11,
              fontWeight: 700,
              color: ANK.textMuted,
              textAlign: 'right',
              flexShrink: 0,
            }}
          >
            {i + 1}.
          </span>
          <input
            value={o.etiket}
            onChange={(e) => duzenle(i, { etiket: e.target.value })}
            placeholder="Şık metni — ör. Kesinlikle katılmıyorum"
            style={{ ...inputStyle, flex: 1, padding: '6px 9px', fontSize: 12.5 }}
          />
          {degerleriGoster && (
            <input
              value={o.deger}
              onChange={(e) => duzenle(i, { deger: e.target.value })}
              placeholder="değer"
              title="Yanıtlarda saklanan değer. Anket yayımlandıktan sonra değiştirmeyin — eski yanıtlar bu değere bağlıdır."
              style={{ ...inputStyle, width: 74, padding: '6px 8px', fontSize: 12 }}
            />
          )}
          <button
            onClick={() => tasi(i, -1)}
            disabled={i === 0}
            title="Yukarı"
            style={{ ...kucukBtn(), opacity: i === 0 ? 0.35 : 1 }}
          >
            <AIcon path="M5 15l7-7 7 7" size={11} />
          </button>
          <button
            onClick={() => tasi(i, +1)}
            disabled={i === secenekler.length - 1}
            title="Aşağı"
            style={{ ...kucukBtn(), opacity: i === secenekler.length - 1 ? 0.35 : 1 }}
          >
            <AIcon path="M19 9l-7 7-7-7" size={11} />
          </button>
          <button onClick={() => sil(i)} title="Şıkkı sil" style={kucukBtn(ANK.red)}>
            <AIcon path="M6 18L18 6M6 6l12 12" size={11} color={ANK.red} />
          </button>
        </div>
      ))}

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <button
          onClick={ekle}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 5,
            padding: '5px 11px',
            borderRadius: 7,
            border: '1px dashed ' + ANK.accent,
            background: 'white',
            color: ANK.accent,
            fontSize: 12,
            fontWeight: 600,
            cursor: 'pointer',
            fontFamily: "'Inter', sans-serif",
          }}
        >
          <AIcon path="M12 4v16m8-8H4" size={12} color={ANK.accent} />
          Şık ekle
        </button>
        {/* ⚠ SIRA BİR VERİDİR. "Üst uç / alt uç", kutuplaşma uyarısı ve ırak
            yığılmış çubuk yalnız SIRALI ölçekte anlamlıdır; "yarısı web
            sitesi, yarısı sosyal medya dedi" kutuplaşma değildir. Sayısal
            şıklarda sıra kendiliğinden anlaşılır, metin şıklarda anlaşılmaz —
            bu yüzden sorulur. */}
        <label
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 5,
            fontSize: 11.5,
            color: ANK.textMuted,
            cursor: 'pointer',
          }}
          title="İşaretliyse sonuçlarda ortalama/uç payları hesaplanır ve şıklar sıralı ölçek grafiğiyle çizilir."
        >
          <input
            type="checkbox"
            checked={sirali}
            onChange={(e) => onChange({ sirali: e.target.checked })}
          />
          Sıralı ölçek (az → çok)
        </label>
        <label
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 5,
            fontSize: 11.5,
            color: ANK.textMuted,
            cursor: 'pointer',
          }}
        >
          <input
            type="checkbox"
            checked={degerleriGoster}
            onChange={(e) => setDegerleriGoster(e.target.checked)}
          />
          Kayıt değerlerini göster
        </label>
        {ozelMi && (
          <button
            onClick={() => onChange({ secenekler: undefined })}
            style={{
              padding: '5px 10px',
              borderRadius: 7,
              border: '1px solid ' + ANK.border,
              background: 'white',
              color: ANK.textMuted,
              fontSize: 11.5,
              cursor: 'pointer',
              fontFamily: "'Inter', sans-serif",
            }}
            title="Bu sorunun özel şıklarını kaldırıp tipin varsayılan ölçeğine dön"
          >
            Varsayılana dön
          </button>
        )}
      </div>

      {hatalar.length > 0 && (
        <p style={{ fontSize: 11.5, color: ANK.red, margin: 0, lineHeight: 1.5 }}>
          {hatalar.join(' ')}
        </p>
      )}
    </div>
  );
}

function SurveyEditorModal({ initial, isNew, onSave, onCancel, activeDepartment, isAdmin }) {
  // Yetkisi olmayan kullanıcı anketi GÖRÜNTÜLER: içeriğe bakmak yasak değil,
  // değiştirmek yasak (bkz. lib/anket-kapsam.js).
  const saltOkunur = !!initial._saltOkunur;
  const kilitSebebi = initial._kilitSebebi || '';
  const [title, setTitle] = useState(initial.title || '');
  const [description, setDescription] = useState(initial.description || '');
  // ⚠ BURASI SORUNUN GERİ KALANINI SİLİYORDU. Soru yalnız {id,type,text}
  // olarak yeniden kuruluyordu; sorunun taşıdığı her ek alan (özel şıklar,
  // ileride eklenecek ayarlar) anketi DÜZENLEMEK için açıp kaydeden herkeste
  // sessizce düşüyordu. Bilinen alanlar tamamlanır, geri kalanı korunur.
  const [questions, setQuestions] = useState(
    (initial.questions || []).map((q, i) => ({
      ...q,
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
    // ⚠ Şıksız ya da yinelenen şıklı soru sessizce kaydediliyordu: katılımcı
    // tıklanacak hiçbir şey görmüyor, yinelenen şıkta ise oylar sonuçlarda
    // tek satırda toplanıp kayboluyordu. Kayıt öncesi söylenir.
    const secenekSorunlari = window.anketTumSecenekHatalari
      ? window.anketTumSecenekHatalari(cleaned)
      : [];
    if (secenekSorunlari.length > 0) {
      alert(
        'Şıklarda düzeltilmesi gereken sorular var:\n\n' +
          secenekSorunlari.map((x) => x.index + 1 + '. soru — ' + x.hatalar.join(' ')).join('\n')
      );
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
          {isNew ? 'Yeni Anket' : saltOkunur ? 'Anketi Görüntüle' : 'Anketi Düzenle'}
        </h3>
        {saltOkunur && (
          <div
            style={{
              margin: '0 0 16px',
              padding: '10px 14px',
              borderRadius: 10,
              background: ANK.amberLight,
              border: '1px solid ' + ANK.amber + '55',
              color: '#7c4a03',
              fontSize: 12.5,
              lineHeight: 1.55,
            }}
          >
            {kilitSebebi || 'Bu anketi yalnız görüntüleyebilirsiniz.'} Kendi kopyanızı almak için
            kart üzerindeki <b>Çoğalt</b> düğmesini kullanabilirsiniz.
          </div>
        )}
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
                  onChange={(e) => {
                    // Tip değişiminde şıkların ne olacağı bir KURALDIR
                    // (lib/anket-secenek.js): metne geçişte düşer, şıklı
                    // tipler arasında özel şıklar korunur.
                    const sonraki = window.anketTipDegisiminde
                      ? window.anketTipDegisiminde(q, e.target.value)
                      : { ...q, type: e.target.value };
                    update(i, {
                      type: sonraki.type,
                      secenekler: sonraki.secenekler,
                    });
                  }}
                  style={{ ...inputStyle, width: 'auto', minWidth: 200 }}
                >
                  {QUESTION_TYPES.map((t) => (
                    <option key={t.v} value={t.v}>
                      {t.label}
                    </option>
                  ))}
                </select>
                {soruSecenekliMi(q) && (
                  <SecenekDuzenleyici soru={q} onChange={(yama) => update(i, yama)} />
                )}
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
            {saltOkunur ? 'Kapat' : 'İptal'}
          </button>
          {!saltOkunur && (
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
          )}
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
// ─── Atama akışının adım kartı ─────────────────────────────────────────────
// ⚠ ESKİ EKRAN TEK BİR UZUN FORMDU: altı alan alt alta, en altta "Anketi ata".
// Hangi alanın zorunlu olduğu, nerede kalındığı ve düğmenin neden kapalı
// olduğu görünmüyordu. Adımlar numaralanır, tamamlanan adım özetini yazar.
function AtamaAdimi({ no, baslik, ozet, tamam, children, pasif, son }) {
  return (
    <div
      style={{
        display: 'flex',
        gap: 12,
        opacity: pasif ? 0.45 : 1,
        pointerEvents: pasif ? 'none' : 'auto',
      }}
    >
      <div
        style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}
      >
        <span
          style={{
            width: 26,
            height: 26,
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 12,
            fontWeight: 800,
            background: tamam ? ANK.accent : ANK.accentPale,
            color: tamam ? 'white' : ANK.accentDark,
          }}
        >
          {tamam ? '✓' : no}
        </span>
        {/* Son adımda çizgi boşluğa sarkıyordu. */}
        {!son && <span style={{ flex: 1, width: 1, background: ANK.border, marginTop: 4 }} />}
      </div>
      <div style={{ flex: 1, minWidth: 0, paddingBottom: son ? 0 : 20 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
            gap: 10,
            flexWrap: 'wrap',
            marginBottom: 10,
          }}
        >
          <span style={{ fontSize: 13.5, fontWeight: 700, color: ANK.primary }}>{baslik}</span>
          {ozet && <span style={{ fontSize: 12, color: ANK.textMuted }}>{ozet}</span>}
        </div>
        {children}
      </div>
    </div>
  );
}

// ─── "Bu anket kaç kişiye gidecek?" ───────────────────────────────────────
// ⚠ BU SORUNUN CEVABI HİÇBİR YERDE YOKTU. Yetkili rolü ve grubu seçip "ata"
// diyordu; yanlış bölüm ya da kimseye ulaşmayan bir seçim ancak günler sonra
// "anket gelmedi" diye geri dönüyordu. Zorunlu ankette bedeli daha ağır:
// yanlış kitleye açılan tam ekran kapı insanları uygulamanın dışında bırakır.
//
// Sayım, karşı taraftaki gösterme kuralının AYNISINI kullanır
// (lib/anket-hedef-kitle.js → lib/ogrenci-sinif.js); yoksa önizleme bir şey,
// gerçek başka şey söylerdi.
function HedefKitleKutusu({ rol, bolumler, gruplar, kapsamEtiketi }) {
  const [durum, setDurum] = useState('bos'); // bos | yukleniyor | hazir | hata
  const [ozet, setOzet] = useState(null);
  const [hata, setHata] = useState('');

  // Seçim değişince eski sayı YANILTICI olur — sıfırlanır.
  const anahtar = [rol, (bolumler || []).join(','), (gruplar || []).join(',')].join('|');
  useEffect(() => {
    setDurum('bos');
    setOzet(null);
    setHata('');
  }, [anahtar]);

  const hesapla = async () => {
    setDurum('yukleniyor');
    try {
      if (rol === 'professor') {
        const liste = await window.apiRead('professors');
        setOzet(window.anketAkademisyenKitlesi(liste || [], { bolumler }));
      } else {
        const liste = await window.apiRead('students');
        setOzet(window.anketOgrenciKitlesi(liste || [], { bolumler, gruplar }));
      }
      setDurum('hazir');
    } catch (e) {
      setHata(e.message || 'Liste okunamadı');
      setDurum('hata');
    }
  };

  const kutu = {
    border: '1px solid ' + ANK.border,
    borderRadius: 10,
    padding: '12px 14px',
    background: ANK.surfaceAlt,
  };

  if (durum === 'bos' || durum === 'yukleniyor') {
    return (
      <div style={kutu}>
        <button
          onClick={hesapla}
          disabled={durum === 'yukleniyor'}
          style={{
            padding: '7px 14px',
            borderRadius: 8,
            border: '1px solid ' + ANK.accent,
            background: 'white',
            color: ANK.accent,
            fontSize: 12.5,
            fontWeight: 600,
            cursor: durum === 'yukleniyor' ? 'wait' : 'pointer',
            fontFamily: "'Inter', sans-serif",
          }}
        >
          {durum === 'yukleniyor' ? 'Sayılıyor…' : 'Kaç kişiye gidecek? Hesapla'}
        </button>
        <p style={{ fontSize: 11.5, color: ANK.textMuted, margin: '8px 0 0', lineHeight: 1.5 }}>
          Atamadan önce kitleyi görün. Sayım, öğrenci listesini okur; seçimi değiştirdiğinizde
          yeniden hesaplamanız gerekir.
        </p>
      </div>
    );
  }

  if (durum === 'hata') {
    return (
      <div style={{ ...kutu, borderColor: ANK.red, background: ANK.redLight }}>
        <p style={{ fontSize: 12.5, color: ANK.red, margin: 0 }}>
          Kitle sayılamadı: {hata}. Atama yine de yapılabilir.
        </p>
      </div>
    );
  }

  const ogrenci = rol !== 'professor';
  const sifir = ozet.ulasilan === 0;
  return (
    <div
      style={{
        ...kutu,
        borderColor: sifir ? ANK.red : ANK.accent,
        background: sifir ? ANK.redLight : ANK.accentPale,
      }}
    >
      <p
        style={{
          fontSize: 17,
          fontWeight: 800,
          color: sifir ? ANK.red : ANK.accentDark,
          margin: 0,
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {ozet.ulasilan} kişi
      </p>
      <p style={{ fontSize: 12, color: ANK.text, margin: '2px 0 0', lineHeight: 1.5 }}>
        {kapsamEtiketi} · {ozet.kapsamdaki} kişilik kapsamdan
      </p>

      {sifir && (
        <p style={{ fontSize: 12, color: ANK.red, margin: '8px 0 0', lineHeight: 1.5 }}>
          <b>Bu seçim kimseye ulaşmıyor.</b> Kapsamı ya da hedef grubu gözden geçirin — atama
          yapılsa bile hiç kimsenin listesinde görünmez.
        </p>
      )}

      {ogrenci && ozet.gruplar && ozet.gruplar.length > 1 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 12px', marginTop: 8 }}>
          {ozet.gruplar.map((g) => (
            <span key={g.grup} style={{ fontSize: 11.5, color: ANK.textMuted }}>
              {g.grup}: <b style={{ color: ANK.text }}>{g.sayi}</b>
            </span>
          ))}
        </div>
      )}

      {ogrenci && ozet.sinifiBilinmeyen > 0 && (
        <p style={{ fontSize: 11.5, color: '#92400E', margin: '8px 0 0', lineHeight: 1.5 }}>
          ⚠ {ozet.sinifiBilinmeyen} kişinin sınıfı çözülemedi (numarası eksik ya da beklenen biçimde
          değil); sınıf hedefli anket onlara <b>gitmeyecek</b>.
        </p>
      )}

      {ogrenci && ozet.sinifiNumaradan > 0 && (
        <p style={{ fontSize: 11.5, color: ANK.textMuted, margin: '6px 0 0', lineHeight: 1.5 }}>
          {ozet.sinifiNumaradan} kişinin sınıfı öğrenci numarasından türetildi; kayıtlı sınıfı
          olanlarda kayıt geçerlidir.
        </p>
      )}

      {!ogrenci && ozet.grupSuzulmuyor && (
        <p style={{ fontSize: 11.5, color: '#92400E', margin: '8px 0 0', lineHeight: 1.5 }}>
          ⚠ Akademisyen grupları (öğretim üyesi / araştırma görevlisi) <b>süzmüyor</b>: kayıtlarda
          unvan verisi yok, anket kapsamdaki tüm akademisyenlere gider.
        </p>
      )}
    </div>
  );
}

function AtamaPaneli({
  surveys,
  assignments,
  onAssign,
  onRemoveAssignment,
  activeDepartment,
  departmentInfo,
  departments,
  kapsam,
}) {
  const [surveyId, setSurveyId] = useState('');
  const [targetRole, setTargetRole] = useState(null);
  const [groups, setGroups] = useState([]);
  const [dueDate, setDueDate] = useState('');
  const [mandatory, setMandatory] = useState(false);

  // ── Atamanın kapsamı ──
  // Anket, atayanın yetki alanının dışına çıkamaz: bölüm yetkilisi kendi
  // bölümüne, fakülte yetkilisi fakültesinin tüm bölümlerine, üniversite
  // yetkilisi tüm fakültelere atar. Seçim yalnız DARALTMAK içindir.
  const kapsamTuru = (kapsam && kapsam.kapsamTuru) || 'bolum';
  const kapsamBolumleri = useMemo(
    () =>
      (departments || []).filter(
        (d) =>
          kapsamTuru === 'universite' ||
          ((kapsam && kapsam.departmentIds) || []).includes(String(d.id))
      ),
    [departments, kapsam, kapsamTuru]
  );
  // Tek bölümü olan yetkili (tipik bölüm yetkilisi) seçim yapmaz.
  const tekBolum = kapsamTuru === 'bolum' && kapsamBolumleri.length <= 1;

  // ── SEÇİM ÜÇ DÜZEYDE ──
  // Değer biçimi: '' (kapsamın tamamı) · 'fak:<fakülteId>' · 'bol:<bölümId>'.
  // Fakülte düzeyi eksikti: üniversite yetkilisi tek bir fakülteye anket
  // atayamıyor, 57 bölümü tek tek seçmek ya da tüm kuruma göndermek zorunda
  // kalıyordu.
  const [secim, setSecim] = useState('');
  const secimCoz = (v) => {
    const t = String(v || '');
    if (t.startsWith('fak:')) return { tur: 'fakulte', id: t.slice(4) };
    if (t.startsWith('bol:')) return { tur: 'bolum', id: t.slice(4) };
    return { tur: 'hepsi', id: '' };
  };
  const seciliKapsam = tekBolum
    ? { tur: 'bolum', id: String(kapsamBolumleri[0]?.id || activeDepartment || '') }
    : secimCoz(secim);
  const seciliKapsamBolumu = seciliKapsam.tur === 'bolum' ? seciliKapsam.id : '';

  // Seçilebilir fakülteler: kapsamdaki bölümlerin fakülteleri. Bölüm
  // yetkilisinde tek fakülte çıkar ve zaten seçim kutusu gösterilmez.
  const fakulteAdlari = window.useFakulteAdlari ? window.useFakulteAdlari() : {};
  const fakulteGruplari = useMemo(() => {
    const gruplar = new Map();
    kapsamBolumleri.forEach((d) => {
      const f = String(d.facultyId || '');
      if (!gruplar.has(f)) gruplar.set(f, []);
      gruplar.get(f).push(d);
    });
    const trSirala = (a, b) => String(a || '').localeCompare(String(b || ''), 'tr-TR');
    return [...gruplar.entries()]
      .map(([id, liste]) => ({
        id,
        ad: fakulteAdlari[id] || '',
        bolumler: liste.slice().sort((a, b) => trSirala(a.name, b.name)),
      }))
      .sort((a, b) => trSirala(a.ad, b.ad));
  }, [kapsamBolumleri, fakulteAdlari]);
  // Fakülte adları henüz gelmediyse başlık yazmak yerine düz liste gösterilir.
  const fakulteBasligi = fakulteGruplari.every((g) => g.ad);

  const tumEtiket =
    kapsamTuru === 'universite'
      ? 'Tüm fakülteler (üniversite geneli)'
      : kapsamTuru === 'fakulte'
        ? 'Fakültemin tüm bölümleri'
        : 'Bağlı olduğum tüm bölümler';
  const deptName =
    (departments || []).find((d) => String(d.id) === String(seciliKapsamBolumu))?.name ||
    departmentInfo?.name ||
    '';
  const kapsamEtiketi =
    seciliKapsam.tur === 'bolum' && seciliKapsamBolumu
      ? deptName
      : seciliKapsam.tur === 'fakulte'
        ? (fakulteAdlari[seciliKapsam.id] || 'Seçilen fakülte') + ' (tüm bölümleri)'
        : tumEtiket;

  const toggleGroup = (g) =>
    setGroups((p) => (p.includes(g) ? p.filter((x) => x !== g) : [...p, g]));

  // Bölüm seçimi artık zorunlu DEĞİL: seçilmezse atayanın tüm kapsamına gider.
  const canSubmit = surveyId && targetRole && groups.length;

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
        // Kapsam kaydın üzerine yazılır (onAssign çözer); aşağıdakiler
        // gösterim içindir.
        kapsamSecimi: seciliKapsam,
        departmentId: seciliKapsamBolumu,
        departmentName: seciliKapsamBolumu ? deptName : '',
        kapsamEtiketi,
      });
    }
    setSurveyId('');
    setTargetRole(null);
    setGroups([]);
    setDueDate('');
    setMandatory(false);
    setSecim('');
  };

  // Kitle sayımı için hedef bölümler. 'hepsi' seçiliyken de kapsam BELLİdir:
  // yetkilinin erişebildiği bölümler. Boş dizi "sınırsız" demek olurdu ve
  // bölüm yetkilisine bütün üniversiteyi saydırırdı.
  const hedefBolumler = useMemo(() => {
    if (seciliKapsam.tur === 'bolum') return [String(seciliKapsam.id || '')].filter(Boolean);
    if (seciliKapsam.tur === 'fakulte') {
      return kapsamBolumleri
        .filter((d) => String(d.facultyId || '') === String(seciliKapsam.id))
        .map((d) => String(d.id));
    }
    return kapsamBolumleri.map((d) => String(d.id));
  }, [seciliKapsam, kapsamBolumleri]);

  // Düğme neden kapalı? Eskiden hiçbir sebep yazmıyordu.
  const eksik = [];
  if (!surveyId) eksik.push('anket');
  if (!targetRole) eksik.push('hedef rol');
  if (!groups.length) eksik.push('hedef grup');

  const seciliAnket = surveys.find((s) => s.id === surveyId);
  const rolEtiketi = (TARGET_ROLES.find((r) => r.id === targetRole) || {}).label || '';

  // Mevcut atamalar: aynı anket dört gruba atanınca dört ayrı kart çıkıyordu.
  // Artık ankete göre toplanır ve aranabilir.
  const [atamaArama, setAtamaArama] = useState('');
  const trKucuk = (x) =>
    String(x || '')
      .replace(/İ/g, 'i')
      .replace(/I/g, 'ı')
      .toLocaleLowerCase('tr-TR');
  const atamaGruplari = useMemo(() => {
    const q = trKucuk(atamaArama).trim();
    const harita = new Map();
    (assignments || []).forEach((a) => {
      const anahtar = String(a.surveyId || a.surveyTitle || a.id);
      if (!harita.has(anahtar)) {
        harita.set(anahtar, { anahtar, baslik: a.surveyTitle || '(adsız anket)', satirlar: [] });
      }
      harita.get(anahtar).satirlar.push(a);
    });
    return [...harita.values()]
      .filter((g) => !q || trKucuk(g.baslik).includes(q))
      .sort((a, b) => a.baslik.localeCompare(b.baslik, 'tr'));
  }, [assignments, atamaArama]);

  const rozet = (metin, zemin, renk) => (
    <span
      style={{
        padding: '2px 9px',
        borderRadius: 10,
        fontSize: 11,
        fontWeight: 600,
        background: zemin,
        color: renk,
        whiteSpace: 'nowrap',
      }}
    >
      {metin}
    </span>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ ...cardStyle, padding: 20 }}>
        {/* ADIM 1 — hangi anket */}
        <AtamaAdimi
          no={1}
          baslik="Hangi anket?"
          tamam={!!surveyId}
          ozet={seciliAnket ? seciliAnket.title : ''}
        >
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
          {surveys.length === 0 && (
            <p style={{ fontSize: 11.5, color: ANK.textMuted, margin: '6px 0 0' }}>
              Henüz anket yok. Önce "Anketler" sekmesinden bir anket oluşturun.
            </p>
          )}
        </AtamaAdimi>

        {/* ADIM 2 — kimlere */}
        <AtamaAdimi
          no={2}
          baslik="Kimlere gidecek?"
          pasif={!surveyId}
          tamam={!!targetRole && groups.length > 0}
          ozet={
            targetRole && groups.length
              ? rolEtiketi + ' · ' + groups.join(', ') + ' · ' + kapsamEtiketi
              : ''
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* Kapsam */}
            <div>
              <label style={labelStyle}>{tekBolum ? 'Kapsam (otomatik)' : 'Kapsam'}</label>
              {tekBolum ? (
                <input value={deptName} disabled style={{ ...inputStyle, background: '#F3F4F6' }} />
              ) : (
                <select
                  value={secim}
                  onChange={(e) => setSecim(e.target.value)}
                  style={{ ...inputStyle, cursor: 'pointer' }}
                >
                  <option value="">{tumEtiket}</option>
                  {fakulteGruplari.map((g) => {
                    const secenekler = [
                      // Fakültenin TAMAMI — üniversite yetkilisinin 57 bölümü
                      // tek tek seçmek zorunda kalmaması için. Yalnız
                      // üniversite düzeyinde gösterilir; alt düzeylerde etiket
                      // yanıltıcı olurdu.
                      kapsamTuru === 'universite' && g.id ? (
                        <option key={'f' + g.id} value={'fak:' + g.id}>
                          {g.ad ? g.ad + ' (tüm bölümleri)' : 'Bu fakültenin tüm bölümleri'}
                        </option>
                      ) : null,
                      ...g.bolumler.map((d) => (
                        <option key={d.id} value={'bol:' + d.id}>
                          Yalnız {d.name}
                        </option>
                      )),
                    ].filter(Boolean);
                    return fakulteBasligi && g.ad ? (
                      <optgroup key={g.id || '_diger'} label={g.ad}>
                        {secenekler}
                      </optgroup>
                    ) : (
                      secenekler
                    );
                  })}
                </select>
              )}
            </div>

            {/* Rol */}
            <div>
              <label style={labelStyle}>Hedef rol</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
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
                        padding: 13,
                        borderRadius: 10,
                        textAlign: 'left',
                        cursor: 'pointer',
                        border: '1.5px solid ' + (active ? ANK.accent : ANK.border),
                        background: active ? ANK.accentPale : 'white',
                        fontFamily: "'Inter', sans-serif",
                      }}
                    >
                      <AIcon path={r.icon} size={19} color={active ? ANK.accent : ANK.textMuted} />
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

            {/* Gruplar — hap biçimi, çoklu seçim */}
            {targetRole && (
              <div>
                <label style={labelStyle}>Hedef grup (birden çok seçilebilir)</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                  {TARGET_GROUPS[targetRole].map((g) => {
                    const on = groups.includes(g);
                    return (
                      <button
                        key={g}
                        onClick={() => toggleGroup(g)}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 7,
                          padding: '7px 13px',
                          borderRadius: 20,
                          fontSize: 12.5,
                          cursor: 'pointer',
                          border: '1.5px solid ' + (on ? ANK.accent : ANK.border),
                          background: on ? ANK.accentPale : 'white',
                          color: on ? ANK.accentDark : ANK.text,
                          fontWeight: on ? 600 : 400,
                          fontFamily: "'Inter', sans-serif",
                        }}
                      >
                        <span
                          aria-hidden="true"
                          style={{
                            width: 14,
                            height: 14,
                            borderRadius: 4,
                            border: '1.5px solid ' + (on ? ANK.accent : ANK.border),
                            background: on ? ANK.accent : 'white',
                            color: 'white',
                            fontSize: 9,
                            fontWeight: 900,
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          {on ? '✓' : ''}
                        </span>
                        {g}
                      </button>
                    );
                  })}
                </div>
                {targetRole === 'student' && (
                  <p
                    style={{
                      fontSize: 11.5,
                      color: ANK.textMuted,
                      margin: '8px 0 0',
                      lineHeight: 1.5,
                    }}
                  >
                    Sınıf, kayıtlı değilse öğrenci numarasından çözülür (ilk iki hane giriş yılı).
                    Çözülemeyen öğrenciye sınıf hedefli anket gitmez.
                  </p>
                )}
              </div>
            )}
          </div>
        </AtamaAdimi>

        {/* ADIM 3 — önizleme */}
        <AtamaAdimi
          no={3}
          baslik="Önizleme"
          pasif={!targetRole || groups.length === 0}
          tamam={false}
        >
          {targetRole && groups.length > 0 ? (
            <HedefKitleKutusu
              rol={targetRole}
              bolumler={hedefBolumler}
              gruplar={groups}
              kapsamEtiketi={kapsamEtiketi}
            />
          ) : (
            <p style={{ fontSize: 12, color: ANK.textMuted, margin: 0 }}>
              Rol ve hedef grup seçilince kitle burada sayılır.
            </p>
          )}
        </AtamaAdimi>

        {/* ADIM 4 — ayarlar ve ata */}
        <AtamaAdimi no={4} baslik="Ayarlar ve atama" pasif={!surveyId} tamam={false} son>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <label
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 10,
                padding: '12px 14px',
                borderRadius: 10,
                border: '1px solid ' + (mandatory ? ANK.red : ANK.border),
                background: mandatory ? ANK.redLight : ANK.surface,
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
                    color: mandatory ? ANK.red : ANK.primary,
                    margin: 0,
                  }}
                >
                  Zorunlu anket
                </p>
                <p
                  style={{
                    fontSize: 11.5,
                    color: ANK.textMuted,
                    margin: '3px 0 0',
                    lineHeight: 1.45,
                  }}
                >
                  Hedef kişiler sisteme girdiğinde bu anket tam ekran karşılarına çıkar ve
                  tamamlamadan uygulamayı kullanamazlar. Yanlış kitleye açılan zorunlu anket,
                  ilgisiz kişileri uygulamanın dışında bırakır — önce önizlemeye bakın.
                </p>
              </div>
            </label>

            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, flexWrap: 'wrap' }}>
              <div>
                <label style={labelStyle}>Son tarih (isteğe bağlı)</label>
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
                  padding: '11px 20px',
                  borderRadius: 8,
                  border: 'none',
                  background: ANK.accent,
                  color: 'white',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: canSubmit ? 'pointer' : 'not-allowed',
                  opacity: canSubmit ? 1 : 0.45,
                  fontFamily: "'Inter', sans-serif",
                }}
              >
                <AIcon path="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" size={15} />
                {groups.length > 1 ? `Anketi ata (${groups.length} grup)` : 'Anketi ata'}
              </button>
              {eksik.length > 0 && (
                <span style={{ fontSize: 11.5, color: ANK.textMuted }}>
                  Eksik: {eksik.join(', ')}
                </span>
              )}
            </div>
          </div>
        </AtamaAdimi>
      </div>

      {/* ── Mevcut atamalar ── */}
      {assignments.length > 0 && (
        <div style={{ ...cardStyle, padding: 18 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              flexWrap: 'wrap',
              marginBottom: 14,
            }}
          >
            <p style={{ fontSize: 13.5, fontWeight: 700, color: ANK.primary, margin: 0 }}>
              Mevcut atamalar
              <span style={{ color: ANK.textMuted, fontWeight: 500 }}>
                {' '}
                · {atamaGruplari.length} anket, {assignments.length} atama
              </span>
            </p>
            {assignments.length > 4 && (
              <input
                value={atamaArama}
                onChange={(e) => setAtamaArama(e.target.value)}
                placeholder="Anket adı ara…"
                style={{
                  ...inputStyle,
                  width: 'auto',
                  minWidth: 190,
                  marginLeft: 'auto',
                  padding: '7px 11px',
                  fontSize: 12.5,
                }}
              />
            )}
          </div>

          {atamaGruplari.length === 0 ? (
            <p style={{ fontSize: 12.5, color: ANK.textMuted, margin: 0 }}>
              "{atamaArama}" ile eşleşen atama yok.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {/* ⚠ ESKİDEN aynı anket dört gruba atanınca dört ayrı kart
                  çıkıyordu ve liste okunmaz hâle geliyordu. Artık ankete göre
                  toplanır; satırlar hedefi anlatır. */}
              {atamaGruplari.map((g) => (
                <div
                  key={g.anahtar}
                  style={{
                    border: '1px solid ' + ANK.border,
                    borderRadius: 10,
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      padding: '10px 14px',
                      background: ANK.surfaceAlt,
                      borderBottom: '1px solid ' + ANK.border,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                    }}
                  >
                    <AIcon path="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" size={15} color={ANK.accent} />
                    <span
                      style={{
                        fontSize: 13.5,
                        fontWeight: 700,
                        color: ANK.primary,
                        flex: 1,
                        minWidth: 0,
                      }}
                    >
                      {g.baslik}
                    </span>
                    <span style={{ fontSize: 11.5, color: ANK.textMuted }}>
                      {g.satirlar.length} atama
                    </span>
                  </div>
                  {g.satirlar.map((a) => {
                    const isStudent = a.targetRole === 'student';
                    const kapsam =
                      a.kapsamEtiketi ||
                      a.departmentName ||
                      (a.kapsamTuru === 'universite'
                        ? 'Üniversite geneli'
                        : a.kapsamTuru === 'fakulte'
                          ? 'Fakülte geneli'
                          : '');
                    return (
                      <div
                        key={a.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          flexWrap: 'wrap',
                          padding: '10px 14px',
                          borderTop: '1px solid ' + ANK.border,
                        }}
                      >
                        {rozet(
                          ROLE_LABEL[a.targetRole] || a.targetRole,
                          isStudent ? ANK.accentPale : ANK.blueLight,
                          isStudent ? ANK.accentDark : ANK.blue
                        )}
                        {rozet(a.targetGroup || 'Tümü', '#F1F5F9', ANK.text)}
                        {kapsam && (
                          <span style={{ fontSize: 12, color: ANK.textMuted }}>{kapsam}</span>
                        )}
                        {a.mandatory && rozet('Zorunlu', ANK.redLight, ANK.red)}
                        <span
                          style={{
                            fontSize: 11.5,
                            color: ANK.textMuted,
                            marginLeft: 'auto',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          Son tarih: {fmtDueDate(a.dueDate)}
                        </span>
                        <button
                          onClick={() => onRemoveAssignment(a.id)}
                          title="Atamayı kaldır"
                          className="ank-btn"
                          style={{ ...iconBtn(ANK.red), width: 26, height: 26 }}
                        >
                          <AIcon
                            path="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M1 7h22M9 7V4a1 1 0 011-1h4a1 1 0 011 1v3"
                            size={12}
                            color={ANK.red}
                          />
                        </button>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Sonuçlar paneli — gelişmiş grafikler + CSV/Excel dışa aktarma ─────────

// Soru tipine göre seçenek kümesi (dağılım grafikleri için)
// ── Şıklar tek yerden okunur ──
// ⚠ Eskiden şıklar İKİ yerde ayrı ayrı yazılıydı: `optionsForType` ham
// değerleri ('1'…'5'), doldurma ekranı ise etiketli düğmeleri üretiyordu.
// Etiketler koda gömülü olduğu için anketi hazırlayan kişi kendi ölçeğini
// kuramıyordu. Artık soru kendi şıklarını taşır (lib/anket-secenek.js).
const soruSecenekleri = (soru) =>
  window.anketSoruSecenekleri ? window.anketSoruSecenekleri(soru) : [];
const soruSecenekliMi = (soru) => (window.anketSecenekliMi ? window.anketSecenekliMi(soru) : false);
const soruCokluMu = (soru) => (window.anketCokluSecimMi ? window.anketCokluSecimMi(soru) : false);
const secenekEtiketi = (soru, deger) =>
  window.anketSecenekEtiketi ? window.anketSecenekEtiketi(soru, deger) : String(deger ?? '');

// Çoklu seçimde yanıt bir DİZİdir; tek seçimde düz değer. Sayma, dışa
// aktarma ve önizleme üçü de aynı çözümlemeyi kullanmalı.
function yanitDegerleri(v) {
  if (v == null || v === '') return [];
  return Array.isArray(v) ? v.map(String).filter(Boolean) : [String(v)];
}

function countAnswers(responses, qid, options) {
  const counts = Object.fromEntries(options.map((o) => [o, 0]));
  responses.forEach((r) => {
    yanitDegerleri(r.answers?.[qid]).forEach((d) => {
      if (Object.prototype.hasOwnProperty.call(counts, d)) counts[d]++;
    });
  });
  return counts;
}

// ── Yatay yığılmış Likert dağılım çubuğu ──
// ══════════════════════════════════════════════════════════════
// SONUÇ GRAFİKLERİ
//
// ⚠ ESKİ EKRAN HER SORUYA HALKA GRAFİK ÇİZİYORDU ve iki ayrı şeyi birden
// yanlış yapıyordu:
//
//   1) HALKA, SIRALI ÖLÇEK İÇİN YANLIŞ BİÇİM. "Kesinlikle katılmıyorum →
//      Kesinlikle katılıyorum" bir sıradır; halka bu sırayı yok eder, iki
//      dilimin hangisinin daha büyük olduğunu göz açıyla ölçmek zordur ve
//      anketler yan yana kıyaslanamaz. Sıralı ölçeğin biçimi, nötrde
//      ortalanmış IRAK (diverging) yığılmış çubuktur: olumsuz sola, olumlu
//      sağa taşar, on soru alt alta tek bakışta okunur.
//
//   2) RAMPA KIRMIZI→YEŞİLDİ. Renk körlüğünün en yaygın türünde kırmızı ile
//      yeşil birbirine girer — ölçeğin iki UCU aynı renge düşüyordu. Yeni
//      rampa sıcak/soğuk kutupludur ve doğrulayıcıdan geçmiştir
//      (bkz. lib/anket-istatistik.js).
//
// Ortak kurallar: çubuk en çok 24px; dokunan parçalar arasında 2px ZEMİN
// RENGİNDE boşluk (çizgi değil); yüzde doğrudan parçanın üstüne, ancak
// SIĞIYORSA yazılır; gösterge her zaman var — renk tek başına anlam taşımaz.
// ══════════════════════════════════════════════════════════════

const GRAFIK = window.anketGrafikMurekkep || {
  yazi: '#1F2937',
  ikincil: '#52514e',
  soluk: '#898781',
  izgara: '#e1e0d9',
  eksen: '#c3c2b7',
  zemin: '#FFFFFF',
};

const yuzde = (o) => Math.round(o * 100);
const sayiTr = (n, basamak = 2) =>
  Number(n).toLocaleString('tr-TR', {
    minimumFractionDigits: basamak,
    maximumFractionDigits: basamak,
  });

// Parçanın içine yazı sığar mı? Sığmayanı yazmak, harfleri kırpmaktan ya da
// taşırmaktan iyi değil — sığmıyorsa yazılmaz, değer göstergeden ve tablodan
// okunur. ~7px/karakter + 10px iç boşluk kaba ama güvenli bir ölçüdür.
const icineSigarMi = (yuzdeGenislik, metinUzunluk, toplamPx = 560) =>
  (yuzdeGenislik / 100) * toplamPx >= metinUzunluk * 7 + 10;

// ── Gösterge (legend) ──
// İki ve daha çok renk olan her grafikte bulunur. Yazı hiçbir zaman veri
// rengini giymez; kimliği yanındaki renk noktası taşır.
function GrafikGosterge({ ogeler }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 14px', marginTop: 10 }}>
      {ogeler.map((o) => (
        <span
          key={o.etiket}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            fontSize: 11.5,
            color: GRAFIK.ikincil,
          }}
        >
          <span
            style={{ width: 10, height: 10, borderRadius: 3, background: o.renk, flexShrink: 0 }}
            aria-hidden="true"
          />
          {o.etiket}
          {o.sayi != null && (
            <span style={{ color: GRAFIK.soluk }}>
              {o.sayi} · %{yuzde(o.oran)}
            </span>
          )}
        </span>
      ))}
    </div>
  );
}

// ── Sıralı ölçek: nötrde ortalanmış ırak yığılmış çubuk ──
// Sol kanat olumsuz, sağ kanat olumlu; nötr ikiye bölünüp merkeze oturur, bu
// yüzden çubukların ortası hizalanır ve sorular alt alta kıyaslanabilir.
function IrakYiginCubuk({ soru, yanitlar }) {
  const d = window.anketDagilim ? window.anketDagilim(yanitlar, soru) : null;
  const renkler = window.anketSoruRenkleri ? window.anketSoruRenkleri(soru) : [];
  if (!d || d.yanitlayan === 0) {
    return <p style={{ fontSize: 12, color: GRAFIK.soluk, margin: 0 }}>Yanıt yok</p>;
  }
  const n = d.secenekler.length;
  const kanat = n <= 3 ? 1 : 2;
  const notrVar = n % 2 === 1;
  const notrIdx = notrVar ? Math.floor(n / 2) : -1;

  // ── Ortalama ve ÖLÇEK ──
  // ⚠ İlk hâli çubuğu %100 genişlikte çizip `translateX` ile kaydırıyordu:
  // kaydırılan uç kartın dışına taşıyor, "Kesinlikle katılıyorum" parçası
  // kırpılıyordu. Doğrusu, çubuğu merkeze göre ÖLÇEKLEMEK: sol ve sağ
  // kanattan hangisi genişse o yarım alanı tam dolduracak kadar küçültülür,
  // böylece çubuk hem ortalanır hem kutuya sığar.
  const olumsuzPay = d.secenekler.slice(0, kanat).reduce((a, o) => a + o.oran, 0);
  const notrPay = notrVar ? d.secenekler[notrIdx].oran : 0;
  const solPay = olumsuzPay + notrPay / 2;
  const sagPay = 1 - solPay;
  const k = 0.5 / Math.max(solPay, sagPay, 0.0001);
  const baslangic = (0.5 - solPay * k) * 100;

  return (
    <div>
      <div style={{ position: 'relative', padding: '2px 0 4px' }}>
        {/* Nötr ekseni — çubukların ortasını gösteren ince dikey çizgi */}
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            left: '50%',
            top: 0,
            bottom: 4,
            width: 1,
            background: GRAFIK.eksen,
          }}
        />
        <div
          style={{
            display: 'flex',
            height: 24,
            marginLeft: baslangic + '%',
            width: 100 - baslangic + '%',
          }}
        >
          {d.secenekler.map((o, i) => {
            if (o.oran === 0) return null;
            const g = o.oran * 100;
            const etiket = '%' + yuzde(o.oran);
            const ilk = i === 0;
            const son = i === n - 1;
            return (
              <div
                key={o.deger}
                title={o.etiket + ': ' + o.sayi + ' yanıt (%' + yuzde(o.oran) + ')'}
                style={{
                  // Ölçeklenmiş genişlik, kalan alanın yüzdesi olarak.
                  width: (g * k * 100) / (100 - baslangic) + '%',
                  background: renkler[i] || GRAFIK.eksen,
                  // Veri UCU yuvarlak, gövde kare — çubuk tek bir tabandan büyür.
                  borderRadius: (ilk ? '4px 0 0 4px' : '0') + (son ? ' 0 4px 4px 0' : ''),
                  // Dokunan parçaları ZEMİN boşluğu ayırır; kenarlık çizilmez.
                  marginRight: son ? 0 : 2,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontSize: 11,
                  fontWeight: 700,
                  whiteSpace: 'nowrap',
                }}
              >
                {icineSigarMi(g * k, etiket.length) ? etiket : ''}
              </div>
            );
          })}
        </div>
      </div>
      <GrafikGosterge
        ogeler={d.secenekler.map((o, i) => ({
          etiket: o.etiket,
          renk: renkler[i] || GRAFIK.eksen,
          sayi: o.sayi,
          oran: o.oran,
        }))}
      />
      <p style={{ fontSize: 11.5, color: GRAFIK.soluk, margin: '8px 0 0' }}>
        {d.yanitlayan} yanıt
        {d.yanitsiz > 0 ? ' · ' + d.yanitsiz + ' kişi bu soruyu boş bıraktı' : ''}
      </p>
    </div>
  );
}

// ── Sırasız liste: tek hue'lu yatay çubuk ──
// Şıkların arasında sıra yoksa rengi değere göre değiştirmek, çubuk boyunun
// zaten anlattığı şeyi ikinci kez kodlamak olur ve kimlik kanalını harcar.
// Tek hue + uçta yazılan değer yeter.
function YatayCubuk({ soru, yanitlar }) {
  const d = window.anketDagilim ? window.anketDagilim(yanitlar, soru) : null;
  if (!d || d.yanitlayan === 0) {
    return <p style={{ fontSize: 12, color: GRAFIK.soluk, margin: 0 }}>Yanıt yok</p>;
  }
  const enBuyuk = Math.max(...d.secenekler.map((o) => o.sayi), 1);
  const hue = window.anketTekHue || '#2a78d6';
  return (
    <div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
        {d.secenekler.map((o) => (
          <div key={o.deger} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span
              style={{
                width: 150,
                flexShrink: 0,
                fontSize: 12,
                color: GRAFIK.yazi,
                overflowWrap: 'anywhere',
              }}
            >
              {o.etiket}
            </span>
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  title={o.etiket + ': ' + o.sayi + ' yanıt (%' + yuzde(o.oran) + ')'}
                  style={{
                    width: Math.max(o.sayi > 0 ? 3 : 0, (o.sayi / enBuyuk) * 100) + '%',
                    height: 18,
                    background: hue,
                    borderRadius: '0 4px 4px 0',
                  }}
                />
              </div>
              <span
                style={{
                  fontSize: 11.5,
                  fontWeight: 600,
                  color: GRAFIK.ikincil,
                  whiteSpace: 'nowrap',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {o.sayi} · %{yuzde(o.oran)}
              </span>
            </div>
          </div>
        ))}
      </div>
      <p style={{ fontSize: 11.5, color: GRAFIK.soluk, margin: '10px 0 0' }}>
        {d.yanitlayan} yanıt
        {d.toplamIsaret > d.yanitlayan ? ' · ' + d.toplamIsaret + ' işaret (çok yanıtlı)' : ''}
        {d.yanitsiz > 0 ? ' · ' + d.yanitsiz + ' boş' : ''}
      </p>
    </div>
  );
}

// ── Soru kıyaslaması: hangi soru en düşük puanı aldı? ──
// ⚠ BU SORUNUN CEVABI HİÇBİR YERDE YAZMIYORDU. Yetkili yirmi halkaya tek tek
// bakıp kafasından sıralamak zorundaydı. Tek seri, tek hue, ortalamaya göre
// sıralı; okunacak şey uzunluk, kimlik değil.
function SoruKiyaslama({ sorular, yanitlar }) {
  const satirlar = window.anketSoruKarsilastirmasi
    ? window.anketSoruKarsilastirmasi(sorular, yanitlar)
    : [];
  if (satirlar.length < 2) return null;
  const hue = window.anketTekHue || '#2a78d6';
  return (
    <div style={{ ...cardStyle, padding: 18 }}>
      <p style={{ fontSize: 13, fontWeight: 700, color: ANK.primary, margin: '0 0 4px' }}>
        Sorular, ortalamaya göre
      </p>
      <p style={{ fontSize: 11.5, color: GRAFIK.soluk, margin: '0 0 14px', lineHeight: 1.5 }}>
        Çubuk, sorunun kendi ölçeğindeki konumunu gösterir; ölçekleri farklı sorular da yan yana
        okunabilsin diye. En alttaki soru en düşük puanı almıştır.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {satirlar.map((s) => (
          <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span
              style={{
                width: 22,
                flexShrink: 0,
                fontSize: 11,
                fontWeight: 700,
                color: GRAFIK.soluk,
                textAlign: 'right',
              }}
            >
              {s.sira}.
            </span>
            <span
              style={{
                flex: '1 1 180px',
                minWidth: 0,
                fontSize: 12,
                color: GRAFIK.yazi,
                overflowWrap: 'anywhere',
              }}
            >
              {s.metin}
            </span>
            <div style={{ flex: '2 1 160px', minWidth: 90 }}>
              <div
                title={
                  'Ortalama ' +
                  sayiTr(s.ortalama) +
                  ' / ' +
                  s.olcekUst +
                  ' · ' +
                  s.n +
                  ' yanıt · standart sapma ' +
                  sayiTr(s.stdSapma)
                }
                style={{
                  width: Math.max(2, s.oran * 100) + '%',
                  height: 16,
                  background: hue,
                  borderRadius: '0 4px 4px 0',
                }}
              />
            </div>
            <span
              style={{
                width: 76,
                flexShrink: 0,
                textAlign: 'right',
                fontSize: 12,
                fontWeight: 700,
                color: GRAFIK.yazi,
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {sayiTr(s.ortalama)}
              <span style={{ fontWeight: 500, color: GRAFIK.soluk }}>/{s.olcekUst}</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Günlük katılım çizgisi ──
// "Duyuru işe yaradı mı, ikinci hatırlatma gerekiyor mu?" sorusunun cevabı.
// Tek seri olduğu için gösterge kutusu yok — başlık neyin çizildiğini söylüyor.
function KatilimCizgisi({ yanitlar }) {
  const gunler = window.anketGunlukKatilim ? window.anketGunlukKatilim(yanitlar) : [];
  if (gunler.length < 2) return null;
  const hue = window.anketTekHue || '#2a78d6';
  const G = 560;
  const Y = 90;
  const enCok = Math.max(...gunler.map((g) => g.sayi), 1);
  const x = (i) => (gunler.length === 1 ? G / 2 : (i / (gunler.length - 1)) * G);
  const y = (v) => Y - (v / enCok) * (Y - 10);
  const nokta = gunler.map((g, i) => x(i) + ',' + y(g.sayi)).join(' ');
  const alan = `0,${Y} ` + nokta + ` ${G},${Y}`;
  const gunAdi = (t) => {
    const p = t.split('-');
    return p[2] + '.' + p[1];
  };
  return (
    <div style={{ ...cardStyle, padding: 18 }}>
      <p style={{ fontSize: 13, fontWeight: 700, color: ANK.primary, margin: '0 0 2px' }}>
        Günlük katılım
      </p>
      <p style={{ fontSize: 11.5, color: GRAFIK.soluk, margin: '0 0 12px' }}>
        En yoğun gün {enCok} yanıt · toplam {yanitlar.length}
      </p>
      <svg
        viewBox={`0 0 ${G} ${Y + 18}`}
        preserveAspectRatio="none"
        style={{ width: '100%', height: 128, display: 'block', overflow: 'visible' }}
        role="img"
        aria-label={'Günlük katılım grafiği, ' + gunler.length + ' gün'}
      >
        <line x1="0" y1={Y} x2={G} y2={Y} stroke={GRAFIK.eksen} strokeWidth="1" />
        <polygon points={alan} fill={hue} opacity="0.1" />
        <polyline
          points={nokta}
          fill="none"
          stroke={hue}
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
        {/* Uç nokta: zemin rengiyle 2px halka — çizgiyle kesiştiği yerde okunur kalsın */}
        <circle
          cx={x(gunler.length - 1)}
          cy={y(gunler[gunler.length - 1].sayi)}
          r="5"
          fill={hue}
          stroke={GRAFIK.zemin}
          strokeWidth="2"
        />
        {/* Üzerine gelince gün ve sayı: görünmez dikdörtgenler çizginin
            kendisinden büyük bir hedef verir (ince çizgiyi yakalamak zor). */}
        {gunler.map((g, i) => (
          <rect
            key={g.gun}
            x={Math.max(0, x(i) - G / (gunler.length * 2))}
            y="0"
            width={G / gunler.length}
            height={Y}
            fill="transparent"
          >
            <title>{g.gun + ': ' + g.sayi + ' yanıt'}</title>
          </rect>
        ))}
      </svg>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: 10.5,
          color: GRAFIK.soluk,
          marginTop: 2,
        }}
      >
        <span>{gunAdi(gunler[0].gun)}</span>
        <span>{gunAdi(gunler[gunler.length - 1].gun)}</span>
      </div>
    </div>
  );
}

// ── Tablo görünümü — rengin taşıyamadığını yazı taşır ──
// Kontrast uyarısı alan açık renkli parçalar için ZORUNLU kaçış yolu: değeri
// renkten okuyamayan (ya da çıktı alan) herkes sayıyı buradan görür.
function DagilimTablosu({ soru, yanitlar }) {
  const d = window.anketDagilim ? window.anketDagilim(yanitlar, soru) : null;
  if (!d) return null;
  const hucre = { padding: '6px 10px', fontSize: 12, borderBottom: '1px solid ' + GRAFIK.izgara };
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 10 }}>
      <thead>
        <tr>
          <th style={{ ...hucre, textAlign: 'left', color: GRAFIK.soluk, fontWeight: 600 }}>Şık</th>
          <th style={{ ...hucre, textAlign: 'right', color: GRAFIK.soluk, fontWeight: 600 }}>
            Yanıt
          </th>
          <th style={{ ...hucre, textAlign: 'right', color: GRAFIK.soluk, fontWeight: 600 }}>
            Oran
          </th>
        </tr>
      </thead>
      <tbody>
        {d.secenekler.map((o) => (
          <tr key={o.deger}>
            <td style={{ ...hucre, color: GRAFIK.yazi }}>{o.etiket}</td>
            <td style={{ ...hucre, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
              {o.sayi}
            </td>
            <td style={{ ...hucre, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
              %{yuzde(o.oran)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// ── Bir sorunun tam sonucu: grafik + sayısal özet + tablo ──
function SoruSonucu({ soru, sira, yanitlar }) {
  const [tabloAcik, setTabloAcik] = useState(false);
  const secenekli = soruSecenekliMi(soru);
  const ozet =
    secenekli && window.anketSayisalOzet ? window.anketSayisalOzet(yanitlar, soru) : null;
  const uclar = secenekli && window.anketUcOranlari ? window.anketUcOranlari(yanitlar, soru) : null;
  const kutuplasma =
    secenekli && window.anketKutuplasmaVarMi ? window.anketKutuplasmaVarMi(yanitlar, soru) : false;
  const irak = window.anketIrakCizilebilirMi ? window.anketIrakCizilebilirMi(soru) : false;

  return (
    <div style={{ ...cardStyle, padding: 18 }}>
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
          {sira}
        </span>
        {soru.text}
      </p>

      {/* Sayısal ölçekte tek satırlık künye: ortalama tek başına yanıltıcı,
          sapma ve medyan yanında durmalı. */}
      {ozet && ozet.n > 0 && (
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '4px 16px',
            fontSize: 11.5,
            color: GRAFIK.ikincil,
            margin: '0 0 12px',
          }}
        >
          <span>
            Ortalama <b style={{ color: GRAFIK.yazi }}>{sayiTr(ozet.ortalama)}</b>/{ozet.olcekUst}
          </span>
          <span>
            Medyan <b style={{ color: GRAFIK.yazi }}>{sayiTr(ozet.medyan, 1)}</b>
          </span>
          <span title="Yanıtların ortalamadan ne kadar dağıldığı. Büyükse görüşler ayrışıyor demektir.">
            Std. sapma <b style={{ color: GRAFIK.yazi }}>{sayiTr(ozet.stdSapma)}</b>
          </span>
          {uclar && uclar.yanitlayan > 0 && (
            <span>
              Üst uç <b style={{ color: GRAFIK.yazi }}>%{yuzde(uclar.olumlu)}</b> · alt uç{' '}
              <b style={{ color: GRAFIK.yazi }}>%{yuzde(uclar.olumsuz)}</b>
            </span>
          )}
        </div>
      )}

      {kutuplasma && (
        <p
          style={{
            fontSize: 11.5,
            color: '#92400E',
            background: '#FFFBEB',
            border: '1px solid #FDE68A',
            borderRadius: 8,
            padding: '7px 11px',
            margin: '0 0 12px',
            lineHeight: 1.5,
          }}
        >
          Yanıtlar iki uca ayrışmış. Ortalama burada grubu temsil etmiyor — iki ayrı görüş var.
        </p>
      )}

      {secenekli ? (
        irak ? (
          <IrakYiginCubuk soru={soru} yanitlar={yanitlar} />
        ) : (
          <YatayCubuk soru={soru} yanitlar={yanitlar} />
        )
      ) : (
        <CommentList
          texts={window.anketMetinYanitlari ? window.anketMetinYanitlari(yanitlar, soru) : []}
        />
      )}

      {secenekli && (
        <>
          <button
            onClick={() => setTabloAcik((v) => !v)}
            style={{
              marginTop: 10,
              padding: '4px 10px',
              borderRadius: 7,
              border: '1px solid ' + ANK.border,
              background: 'white',
              color: GRAFIK.ikincil,
              fontSize: 11.5,
              cursor: 'pointer',
              fontFamily: "'Inter', sans-serif",
            }}
          >
            {tabloAcik ? 'Tabloyu gizle' : 'Tablo olarak göster'}
          </button>
          {tabloAcik && <DagilimTablosu soru={soru} yanitlar={yanitlar} />}
        </>
      )}
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

// ══════════════════════════════════════════════════════════════
// DIŞA AKTARMA — CSV · Excel · Word
//
// ⚠ ESKİDEN EXCEL KENDİ HESABINI YAPIYORDU: ekranda gördüğünüz ortalama ile
// dosyadaki ortalama ayrı kodlardan geliyordu, biri düzeltilince öteki eski
// kalıyordu. Artık üçü de TEK modeli çizer (lib/anket-rapor.js): ekrandaki
// grafik, Excel sayfaları ve Word raporu aynı sayıyı söyler.
//
// İş bölümü:
//   • CSV   — tek tablo, başka programa aktarmak için
//   • Excel — ham yanıtlar + özet + şık dağılımı + metinler, ayrı sekmeler
//   • Word  — okunacak/imzalanacak rapor (ham tablo yok, kâğıda sığmaz)
// Üçü de kütüphanesiz üretilir; yalnız zip'leme için JSZip yüklenir.
// ══════════════════════════════════════════════════════════════

/** Ekrandaki süzgecin insan diliyle karşılığı — rapor künyesine yazılır. */
function suzgecMetni(courseFilter, courseOptions) {
  if (!courseFilter) return '';
  const d = courseOptions.find((c) => c.code === courseFilter);
  return 'Ders: ' + (d && d.name && d.name !== d.code ? d.code + ' — ' + d.name : courseFilter);
}

function raporModeli(survey, responses, suzgec) {
  return window.anketRaporu(survey, responses, { suzgec });
}

/** Dosya adı: anket başlığı + ne olduğu. Türkçe harfler korunur. */
const ciktiAdi = (survey, ek, uzanti) =>
  window.belgeDosyaAdi((survey && survey.title) || 'anket', ek, uzanti);

function downloadCSV(survey, responses) {
  const { basliklar, satirlar } = window.anketYanitTablosu(survey, responses);
  const esc = (v) => {
    const metin = String(v == null ? '' : v);
    return /[";\n]/.test(metin) ? '"' + metin.replace(/"/g, '""') + '"' : metin;
  };
  // Türkçe Excel için BOM + noktalı virgül ayracı
  const csv = '\ufeff' + [basliklar, ...satirlar].map((r) => r.map(esc).join(';')).join('\r\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = ciktiAdi(survey, 'yanitlar', 'csv');
  a.click();
  URL.revokeObjectURL(a.href);
}

async function downloadExcel(survey, responses, suzgec) {
  const rapor = raporModeli(survey, responses, suzgec);
  const sayfalar = window.anketRaporExcelSayfalari(rapor).map((sf) => ({
    ad: sf.ad,
    satirlar: sf.satirlar,
    sutunGenislikleri: sf.genislikler,
  }));
  // xlsxIndir dosya adını kendi sadeleştirir (ASCII); uzantısız verilir.
  await window.xlsxIndir(((survey && survey.title) || 'anket') + ' sonuc raporu', { sayfalar });
}

async function downloadWord(survey, responses, suzgec) {
  const rapor = raporModeli(survey, responses, suzgec);
  await window.wordIndir(
    ciktiAdi(survey, 'sonuc-raporu', 'docx'),
    window.anketRaporWordGovdesi(rapor)
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

  // ⚠ GENEL ORTALAMA YANLIŞ SÜZÜYORDU. Ölçüt `q.type === 'likert'` idi:
  // özel şıklarla kurulmuş sayısal bir ölçek ortalamaya HİÇ girmiyor,
  // Likert tipinde ama şıkları metin olan bir soru ise '1'/'2' sanılıp
  // giriyordu. Ölçüt tip değil ŞIKLARDIR (lib/anket-istatistik.js).
  const ozet = useMemo(
    () => (window.anketOzeti ? window.anketOzeti(survey, filtered) : null),
    [survey, filtered]
  );

  // Süzgeç raporun künyesine yazılır: "Ders: MAT101 — Matematik". Süzülmüş
  // bir çıktının hangi süzgeçle alındığı dosyanın üstünde yazmazsa, birkaç
  // gün sonra o dosya "anketin tamamı" sanılıyor.
  const suzgec = useMemo(
    () => suzgecMetni(courseFilter, courseOptions),
    [courseFilter, courseOptions]
  );

  const disaAktar = (is, ad) => async () => {
    setExporting(true);
    try {
      await is();
    } catch (e) {
      alert(ad + ' oluşturulamadı: ' + (e && e.message ? e.message : e));
    } finally {
      setExporting(false);
    }
  };
  const handleExcel = disaAktar(() => downloadExcel(survey, filtered, suzgec), 'Excel');
  const handleWord = disaAktar(() => downloadWord(survey, filtered, suzgec), 'Word');

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
                { label: 'Toplam yanıt', value: ozet ? ozet.yanitSayisi : filtered.length },
                { label: 'Son yanıt', value: (ozet && ozet.sonTarih) || '—' },
                {
                  label: 'Genel ortalama (5 üzerinden)',
                  value: ozet && ozet.genelOrtalama != null ? sayiTr(ozet.genelOrtalama) : '—',
                  alt:
                    ozet && ozet.genelOrtalama != null
                      ? 'Ölçekleri farklı sorular kendi ölçeğinde ölçülüp birleştirildi'
                      : 'Sayısal ölçekli soru yok',
                },
                { label: 'Yorum', value: ozet ? ozet.yorumSayisi : 0 },
              ].map((k) => (
                <div key={k.label} style={{ ...cardStyle, padding: 16 }}>
                  <p style={{ fontSize: 12, color: ANK.textMuted, margin: 0 }}>{k.label}</p>
                  <p
                    style={{
                      fontSize: 26,
                      fontWeight: 700,
                      color: ANK.primary,
                      margin: '4px 0 0',
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    {k.value}
                  </p>
                  {k.alt && (
                    <p
                      style={{
                        fontSize: 10.5,
                        color: ANK.textDim,
                        margin: '3px 0 0',
                        lineHeight: 1.4,
                      }}
                    >
                      {k.alt}
                    </p>
                  )}
                </div>
              ))}
            </div>

            {/* En güçlü / en zayıf soru — yetkilinin ilk bakacağı iki satır.
                Eskiden hiçbir yerde yazmıyordu. */}
            {ozet && ozet.enDusuk && ozet.enYuksek && ozet.enDusuk.id !== ozet.enYuksek.id && (
              <div
                style={{
                  ...cardStyle,
                  padding: 16,
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                  gap: 14,
                }}
              >
                {[
                  { baslik: 'En yüksek puan', s: ozet.enYuksek },
                  { baslik: 'En düşük puan', s: ozet.enDusuk },
                ].map((k) => (
                  <div key={k.baslik}>
                    <p style={{ fontSize: 11.5, color: ANK.textMuted, margin: 0 }}>{k.baslik}</p>
                    <p
                      style={{
                        fontSize: 13,
                        color: ANK.primary,
                        margin: '3px 0 0',
                        lineHeight: 1.45,
                      }}
                    >
                      <b style={{ fontVariantNumeric: 'tabular-nums' }}>
                        {sayiTr(k.s.ortalama)}/{k.s.olcekUst}
                      </b>{' '}
                      — {k.s.sira}. {k.s.metin}
                    </p>
                  </div>
                ))}
              </div>
            )}

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              {exportBtn(() => downloadCSV(survey, filtered), 'CSV indir', false)}
              {exportBtn(handleWord, exporting ? 'Hazırlanıyor…' : 'Word raporu', false)}
              {exportBtn(handleExcel, exporting ? 'Hazırlanıyor…' : 'Excel indir', true)}
            </div>

            {/* Sorular arası kıyas + günlük katılım: tek soruya bakmadan önce
                "hangi soru zayıf, katılım ne zaman geldi" cevaplanır. */}
            <SoruKiyaslama sorular={survey.questions || []} yanitlar={filtered} />
            <KatilimCizgisi yanitlar={filtered} />

            {/* Soru bazlı sonuçlar */}
            {(survey.questions || []).map((q, i) => (
              <SoruSonucu key={q.id} soru={q} sira={i + 1} yanitlar={filtered} />
            ))}
          </div>
        ))}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// KATILIMCI
// ══════════════════════════════════════════════════════════════
// ── ÖĞRENCİ HANGİ SINIFTA? ──
// ⚠ ESKİ KURAL: `if (!myClass) return true` — sınıfı bilinmiyorsa HER sınıf
// anketini göster. Sınıf yalnız öğrencinin kendi yazdığı `students.sinif`
// alanında duruyordu; yazmayan herkes 1. sınıf oryantasyon anketini de,
// 4. sınıf mezuniyet anketini de görüyor, sonuçlar kirleniyordu.
//
// Artık sınıf öncelikle KAYITTAN, yoksa ÖĞRENCİ NUMARASINDAN çözülür
// (lib/ogrenci-sinif.js: ilk iki hane giriş yılı, akademik yıl eylülde döner).
// Çözülemiyorsa anket GÖSTERİLMEZ — ve sebebi ekranda söylenir.
const sinifUyumu = (kullanici, grup) =>
  window.ogrenciSinifGrubunaUyarMi
    ? window.ogrenciSinifGrubunaUyarMi(kullanici, grup)
    : { uyar: true, sebep: 'kural-yok', sinif: null, kaynak: '' };

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
  // Sınıf artık tek yerden çözülüyor (sinifUyumu); ekranda "sınıfını gir"
  // uyarısı çıkarmak için kullanıcının çözülen sınıfı burada tutulur.
  const sinifDurumu = useMemo(
    () =>
      window.ogrenciSinifi ? window.ogrenciSinifi(currentUser) : { sinif: null, kaynak: 'yok' },
    [currentUser]
  );
  const matchesGroup = useCallback(
    (role, group) => {
      if (role !== 'student') return true; // akademisyen grupları unvan bazlı — unvan verisi yok, tümü görür
      const g = (group || '').trim();
      if (!g || g === 'Tüm öğrenciler') return true; // grupsuz eski kayıtlar herkese görünür
      if (g === 'Mezun') return isAlumni;
      if (isAlumni) return false; // mezun, sınıf gruplarına girmez
      return sinifUyumu(currentUser, g).uyar;
    },
    [isAlumni, currentUser]
  );
  // Atama bu kullanıcıya ulaşıyor mu? (bölüm/fakülte/üniversite kapsamı)
  const kapsamdaMi = useCallback(
    (a) => (window.yayinKapsamdaMi ? window.yayinKapsamdaMi(a, currentUser) : true),
    [currentUser]
  );

  const myAssignments = useMemo(() => {
    const seen = new Set();
    return assignments.filter((a) => {
      // alumni → student+'Mezun' geriye dönük eşdeğerlik
      const role = a.targetRole === 'alumni' ? 'student' : a.targetRole;
      const group = a.targetRole === 'alumni' ? 'Mezun' : a.targetGroup;
      if (role !== myRole) return false;
      // Kapsam ZORUNLU: eskiden "atamanın departmentId'si boşsa herkese göster"
      // deniyordu ve Bilgisayar'a atanan anket Orman'da çıkıyordu. Karar artık
      // atamanın kapsamına bakar; kullanıcının kendi bölümleri ölçüttür (aktif
      // bölüm değil — hoca başka bölüme geçince o bölümün anketi ona düşmez).
      if (!kapsamdaMi(a)) return false;
      if (!matchesGroup(role, group)) return false;
      if (seen.has(a.surveyId)) return false; // aynı anket birden fazla gruba atanmışsa tek göster
      seen.add(a.surveyId);
      return true;
    });
  }, [assignments, myRole, kapsamdaMi, matchesGroup]);

  // ⚠ SESSİZ ELEME OLMASIN. Sınıfı çözülemeyen öğrenci artık sınıf hedefli
  // anketleri görmüyor; bunu hiç söylemezsek "bana anket gelmedi" diye
  // kaybolur. Kapsamına giren ama sınıfı bilinmediği için elenen bir atama
  // varsa öğrenciye ne yapması gerektiği söylenir.
  const sinifiEksikAtamaVar = useMemo(() => {
    if (myRole !== 'student' || isAlumni) return false;
    if (sinifDurumu.sinif != null) return false;
    return assignments.some((a) => {
      if ((a.targetRole === 'alumni' ? 'student' : a.targetRole) !== 'student') return false;
      if (!kapsamdaMi(a)) return false;
      return sinifUyumu(currentUser, a.targetGroup).sebep === 'sinif-bilinmiyor';
    });
  }, [assignments, myRole, isAlumni, sinifDurumu, kapsamdaMi, currentUser]);

  const completed = (surveyId) => myResponses.some((r) => r.surveyId === surveyId);

  // İki sütunlu görünümde ana alan boş kalmasın: aktif anket yoksa ilk
  // tamamlanmamış anketi otomatik seç (gönderim sonrası bir sonrakine geçer).
  useEffect(() => {
    if (activeId) return;
    const firstPending = myAssignments.find((a) => !completed(a.surveyId));
    if (firstPending) setActiveId(firstPending.surveyId);
  }, [myAssignments, myResponses, activeId]);

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
      // ⚠ KİMLİK NUMARAYLA DA YAZILIR. `userId` öğrencide ADA düşüyor
      // (currentUser'da id alanı yok). Sunucu yanıtı sahibine daraltırken adı
      // kayıttan çözmek zorunda kalıyordu; yeni kayıtlar numarayı da taşır,
      // eskiler adla eşleşmeye devam eder (server/lib/ogrenci-okuma.js).
      ...(currentUser?.studentNumber ? { studentNumber: currentUser.studentNumber } : {}),
      role: myRole,
      answers,
      submittedAt: new Date().toISOString(),
    });
    setActiveId(null);
    await load();
    toast.show('Anket gönderildi. Teşekkürler!');
  };

  if (loading) return <Spinner />;

  const pendingList = myAssignments.filter((a) => !completed(a.surveyId));
  const doneList = myAssignments.filter((a) => completed(a.surveyId));
  const activeSurvey = activeId ? surveys.find((s) => s.id === activeId) : null;
  const wide = responsive ? responsive.val(false, false, true) : true;

  const ASSIGN_ICON =
    'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01';

  return (
    <div className="ank-root" style={{ fontFamily: "'Inter', sans-serif" }}>
      <AnkStyles />
      {React.createElement(window.CakuBanner, {
        title: 'Anketlerim',
        subtitle: 'Size atanan anketleri doldurun',
      })}

      {sinifiEksikAtamaVar && (
        <div
          style={{
            background: '#FFFBEB',
            border: '1px solid #FDE68A',
            borderRadius: 10,
            padding: '11px 14px',
            margin: '0 0 14px',
            fontSize: 12.5,
            color: '#92400E',
            lineHeight: 1.55,
          }}
        >
          <b>Sınıfınız kayıtlı değil.</b> Belirli bir sınıfa gönderilen anketler size ulaşmıyor.
          Öğrenci numaranız sistemde yoksa ya da beklenen biçimde değilse sınıfınız çözülemez —
          profil sayfanızdan sınıfınızı girerseniz bu anketler listenizde görünür.
        </div>
      )}

      {myAssignments.length === 0 ? (
        <EmptyState text="Size atanmış anket bulunmuyor." />
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: wide ? 'minmax(0,1fr) 340px' : '1fr',
            gap: 24,
            alignItems: 'start',
          }}
        >
          {/* Ana alan — aktif anket formu */}
          <div style={{ minWidth: 0 }}>
            {activeSurvey ? (
              <AnketDoldurma
                key={activeSurvey.id}
                survey={activeSurvey}
                onSubmit={submit}
                onCancel={null}
                responsive={responsive}
                activeDepartment={activeDepartment}
                embedded
              />
            ) : (
              <EmptyState text="Sağdaki listeden bir anket seçin." />
            )}
          </div>

          {/* Yan panel — Anketlerim */}
          <aside style={{ position: wide ? 'sticky' : 'static', top: 16, minWidth: 0 }}>
            <div style={{ ...cardStyle, padding: 18 }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  marginBottom: 16,
                  color: ANK.accent,
                }}
              >
                <AIcon path={ASSIGN_ICON} size={20} color={ANK.accent} />
                <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: ANK.primary }}>
                  Anketlerim
                </h2>
              </div>

              {/* Tamamlanmamış */}
              <div style={{ marginBottom: 18 }}>
                <h3
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: ANK.textMuted,
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    margin: '0 0 10px',
                  }}
                >
                  Tamamlanmamış Anketler
                </h3>
                {pendingList.length === 0 ? (
                  <p style={{ fontSize: 12.5, color: ANK.textDim, margin: 0 }}>
                    Bekleyen anket yok.
                  </p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {pendingList.map((a) => {
                      const s = surveys.find((x) => x.id === a.surveyId);
                      if (!s) return null;
                      const on = activeId === a.surveyId;
                      return (
                        <button
                          key={a.id}
                          onClick={() => setActiveId(a.surveyId)}
                          style={{
                            textAlign: 'left',
                            cursor: 'pointer',
                            padding: '10px 12px',
                            borderRadius: 10,
                            border: '1px solid ' + (on ? ANK.accent : ANK.border),
                            background: on ? ANK.accentPale : ANK.surface,
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 6,
                            fontFamily: "'Inter', sans-serif",
                          }}
                        >
                          <span
                            style={{
                              fontSize: 13,
                              fontWeight: 600,
                              color: ANK.primary,
                              display: 'flex',
                              alignItems: 'center',
                              gap: 6,
                              flexWrap: 'wrap',
                            }}
                          >
                            {s.title}
                            {a.mandatory && (
                              <span
                                style={{
                                  padding: '1px 7px',
                                  borderRadius: 9,
                                  background: ANK.redLight,
                                  color: ANK.red,
                                  fontSize: 10,
                                  fontWeight: 700,
                                }}
                              >
                                Zorunlu
                              </span>
                            )}
                          </span>
                          <span
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                            }}
                          >
                            <span style={{ fontSize: 11.5, color: ANK.textMuted }}>
                              {s.questions?.length || 0} soru
                            </span>
                            <span
                              style={{
                                fontSize: 12,
                                fontWeight: 600,
                                color: ANK.accent,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 3,
                              }}
                            >
                              {on ? 'Dolduruluyor' : 'Doldur'}
                              <AIcon path="M9 5l7 7-7 7" size={13} color={ANK.accent} />
                            </span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Tamamlanmış */}
              <div>
                <h3
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: ANK.textMuted,
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    margin: '0 0 10px',
                  }}
                >
                  Tamamlanmış Anketler
                </h3>
                {doneList.length === 0 ? (
                  <p style={{ fontSize: 12.5, color: ANK.textDim, margin: 0 }}>Henüz yok.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {doneList.map((a) => {
                      const s = surveys.find((x) => x.id === a.surveyId);
                      if (!s) return null;
                      return (
                        <div
                          key={a.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                            padding: '8px 10px',
                            borderRadius: 8,
                          }}
                        >
                          <AIcon
                            path="M22 11.08V12a10 10 0 11-5.93-9.14M22 4L12 14.01l-3-3"
                            size={16}
                            color={ANK.green}
                          />
                          <span style={{ fontSize: 13, color: ANK.text }}>{s.title}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </aside>
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

  // Aktif bölüm varsa "Bölüm" alanını otomatik doldur.
  // NOT: eskiden bağımlılık dizisi boştu; `fields` ilk render'da henüz
  // gelmemişse deptField bulunamıyor ve alan hiç yazılmıyordu — katılımcı
  // bölümü seçili GÖRÜYOR ama yanıt bölümsüz kaydediliyordu.
  const otoBolum = useMemo(
    () => (activeDepartment ? departments.find((x) => x.id === activeDepartment) : null),
    [activeDepartment, departments]
  );

  useEffect(() => {
    if (!otoBolum) return;
    const deptField = (fields || []).find((f) => f.source === 'department');
    if (deptField && !values[deptField.key]) onChange(deptField.key, otoBolum.name);
  }, [otoBolum, fields, values, onChange]);

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
      // Katılımcının bölümü zaten belli — seçtirmeye gerek yok, dolu ve
      // salt-okunur gösterilir. (Bölüm bilinmiyorsa açılır liste kalır.)
      if (otoBolum) {
        return (
          <input
            value={otoBolum.name}
            disabled
            style={{ ...inputStyle, background: '#F3F4F6', cursor: 'default' }}
          />
        );
      }
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

function AnketDoldurma({ survey, onSubmit, onCancel, activeDepartment, forced, embedded }) {
  const [answers, setAnswers] = useState({});
  const [info, setInfo] = useState({});
  const [saving, setSaving] = useState(false);

  const setAns = (id, v) => setAnswers((p) => ({ ...p, [id]: v }));
  const setInfoField = (key, v) => setInfo((p) => ({ ...p, [key]: v }));
  const resetForm = () => {
    setAnswers({});
    setInfo({});
  };

  const required = survey.questions.filter((q) => q.type !== 'textarea');
  // ⚠ Çoklu seçimde yanıt DİZİdir; `!== ''` denetimi boş diziyi "yanıtlanmış"
  // sayıyor, ilerleme çubuğu dolu görünüyordu. Sayım tek yerden çözülür.
  const answered = required.filter((q) =>
    soruSecenekliMi(q)
      ? yanitDegerleri(answers[q.id]).length > 0
      : answers[q.id] != null && String(answers[q.id]).trim() !== ''
  ).length;
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
      ) : embedded ? null : (
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
          <div
            style={{
              background: ANK.surfaceAlt,
              border: '1px solid ' + ANK.border,
              borderRadius: 12,
              padding: 16,
            }}
          >
            <InfoFieldsForm
              fields={survey.infoFields}
              values={info}
              onChange={setInfoField}
              activeDepartment={activeDepartment}
              linkedCourses={survey.linkedCourses}
            />
          </div>
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
          <span
            style={{
              fontSize: 12,
              fontStyle: 'italic',
              color: canSubmit ? ANK.accentDark : ANK.textMuted,
            }}
          >
            {canSubmit
              ? 'Tüm sorular yanıtlandı — gönderebilirsiniz.'
              : `${totalDone}/${totalNeeded} tamamlandı — lütfen tüm soruları cevaplayın.`}
          </span>
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={onCancel || resetForm}
              style={{
                padding: '10px 18px',
                borderRadius: 8,
                border: '1px solid ' + ANK.accent,
                background: 'white',
                color: ANK.accent,
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {onCancel ? 'İptal' : 'Formu Temizle'}
            </button>
            <button
              onClick={submit}
              disabled={saving || !canSubmit}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '10px 24px',
                borderRadius: 8,
                border: 'none',
                background: ANK.accent,
                color: 'white',
                fontSize: 13,
                fontWeight: 600,
                boxShadow: canSubmit ? '0 4px 12px rgba(13,148,136,0.25)' : 'none',
                cursor: saving ? 'wait' : canSubmit ? 'pointer' : 'not-allowed',
                opacity: saving ? 0.7 : canSubmit ? 1 : 0.45,
              }}
            >
              <AIcon path="M5 13l4 4L19 7" size={15} /> {saving ? 'Gönderiliyor…' : 'Gönder'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Soru tipi render ──────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════
// TEK SORU — KATILIMCI GÖRÜNÜMÜ
//
// ⚠ ŞIKLAR BURAYA GÖMÜLÜYDÜ. Her tip için ayrı bir dal vardı ve Likert'in
// beş etiketi ("Kesinlikle katılmıyorum" …) doğrudan bu dosyada yazılıydı.
// Anketi hazırlayan kişi şıkları göremiyor, değiştiremiyor, kendi ölçeğini
// kuramıyordu. Artık şıklar sorunun kendi verisinden gelir
// (lib/anket-secenek.js) ve bu bileşen yalnız ÇİZER.
//
// İki çizim biçimi var, ölçeğin şekline göre seçilir:
//   • sayısal ve kısa (1–5 gibi)  → büyük rakam + altında etiket (kart)
//   • diğerleri                    → tek satırlık "hap" düğmeler
// Çoklu seçimde yanıt bir DİZİdir; tek seçimde düz değer.
// ══════════════════════════════════════════════════════════════
function SoruBilesen({ soru, numara, deger, onChange }) {
  const head = (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 12 }}>
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 28,
          height: 28,
          borderRadius: '50%',
          background: ANK.green,
          color: '#fff',
          fontSize: 13,
          fontWeight: 700,
          flexShrink: 0,
          marginTop: 1,
        }}
      >
        {numara}
      </span>
      <p style={{ fontSize: 15, fontWeight: 600, color: ANK.primary, margin: 0, lineHeight: 1.4 }}>
        {soru.text}
      </p>
    </div>
  );

  if (!soruSecenekliMi(soru)) {
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

  const secenekler = soruSecenekleri(soru);
  const coklu = soruCokluMu(soru);
  const secili = yanitDegerleri(deger);
  const isaretli = (d) => secili.includes(d);

  // Tek seçimde aynı şıkka ikinci tıklama seçimi KALDIRIR: yanlış basan
  // katılımcı, zorunlu olmayan bir soruyu boşaltabilsin.
  const tikla = (d) => {
    if (!coklu) return onChange(soru.id, isaretli(d) ? '' : d);
    const sonraki = isaretli(d) ? secili.filter((x) => x !== d) : [...secili, d];
    onChange(soru.id, sonraki);
  };

  // Ölçek "1,2,3…" gibi kısa sayılardan oluşuyorsa kart biçimi kullanılır:
  // rakam görsel bir çapa, etiket altında okunur. Uzun metin şıklarında kart
  // dar kalıp metni kırpıyordu — onlar hap biçiminde çizilir.
  const sayisal = window.anketSeceneklerSayisalMi ? window.anketSeceneklerSayisalMi(soru) : false;
  const kartBicimi = sayisal && secenekler.length >= 3 && secenekler.length <= 7;

  if (kartBicimi) {
    return (
      <div>
        {head}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(auto-fit, minmax(${secenekler.length > 5 ? 82 : 96}px, 1fr))`,
            gap: 10,
          }}
        >
          {secenekler.map((o) => {
            const sel = isaretli(o.deger);
            return (
              <button
                key={o.deger}
                onClick={() => tikla(o.deger)}
                title={o.etiket}
                className="ank-likert"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  minHeight: 78,
                  padding: '12px 6px',
                  borderRadius: 10,
                  cursor: 'pointer',
                  border: '1.5px solid ' + (sel ? ANK.accent : ANK.border),
                  background: sel ? ANK.accentPale : 'white',
                  color: sel ? ANK.accentDark : ANK.textMuted,
                  fontFamily: "'Inter', sans-serif",
                  transition: 'border-color .15s, background .15s',
                }}
              >
                <span style={{ fontSize: 22, fontWeight: 800 }}>{o.deger}</span>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: sel ? 600 : 500,
                    textAlign: 'center',
                    lineHeight: 1.25,
                  }}
                >
                  {o.etiket === o.deger ? '' : o.etiket}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // Hap biçimi: metin şıkları, evet/hayır, saat aralıkları ve uzun ölçekler.
  // Çoklu seçimde kutu, tek seçimde yuvarlak işaret çizilir — katılımcı
  // "birden fazla seçebilir miyim?" diye sormasın.
  return (
    <div>
      {head}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {secenekler.map((o) => {
          const sel = isaretli(o.deger);
          return (
            <button
              key={o.deger}
              onClick={() => tikla(o.deger)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '9px 15px',
                borderRadius: coklu ? 9 : 20,
                fontSize: 13,
                cursor: 'pointer',
                border: '1.5px solid ' + (sel ? ANK.accent : ANK.border),
                background: sel ? ANK.accentPale : 'white',
                color: sel ? ANK.accentDark : ANK.text,
                fontWeight: sel ? 600 : 400,
                fontFamily: "'Inter', sans-serif",
                transition: 'border-color .15s, background .15s',
              }}
            >
              <span
                aria-hidden="true"
                style={{
                  width: 15,
                  height: 15,
                  flexShrink: 0,
                  borderRadius: coklu ? 4 : '50%',
                  border: '1.5px solid ' + (sel ? ANK.accent : ANK.border),
                  background: sel ? ANK.accent : 'white',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontSize: 10,
                  fontWeight: 900,
                  lineHeight: 1,
                }}
              >
                {sel ? '✓' : ''}
              </span>
              {o.etiket}
            </button>
          );
        })}
      </div>
      {coklu && (
        <p style={{ fontSize: 11.5, color: ANK.textMuted, margin: '8px 0 0' }}>
          Birden fazla şık işaretleyebilirsiniz.
        </p>
      )}
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
    // ⚠ ZORUNLU ANKET KAPISI tam ekran açılır ve kapatılamaz. Sınıfı yanlış
    // eşleşen bir anket, öğrenciyi kendisiyle ilgisiz bir formun arkasına
    // kilitler; bu yüzden burada da aynı katı kural geçerlidir.
    return sinifUyumu(currentUser, g).uyar;
  };

  // Atama bu kullanıcıya ulaşıyor mu? (bölüm/fakülte/üniversite kapsamı)
  // Zorunlu anket kapısı tam ekran açıldığı için burada kapsam hatası en
  // görünür yerdedir: başka bölümün anketi kullanıcıyı uygulamadan kilitler.
  const kapsamdaMi = (a) =>
    window.yayinKapsamdaMi ? window.yayinKapsamdaMi(a, currentUser) : true;

  // İlk doldurulmamış zorunlu atama
  const pending = useMemo(() => {
    if (!myRole || myId === 'anon') return null;
    const completedIds = new Set(myResponses.map((r) => r.surveyId));
    for (const a of assignments) {
      if (!a.mandatory) continue;
      const role = a.targetRole === 'alumni' ? 'student' : a.targetRole;
      const group = a.targetRole === 'alumni' ? 'Mezun' : a.targetGroup;
      if (role !== myRole) continue;
      if (!kapsamdaMi(a)) continue;
      if (!matchesGroup(role, group)) continue;
      if (completedIds.has(a.surveyId)) continue;
      const survey = surveys.find((s) => s.id === a.surveyId);
      if (survey) return { assignment: a, survey };
    }
    return null;
  }, [assignments, surveys, myResponses, myRole, myId, activeDepartment, isAlumni, currentUser]);

  const submit = async (surveyId, answers) => {
    if (!myId || myId === 'anon') return;
    await window.DBWrite.add('survey_responses', {
      surveyId,
      userId: myId,
      // ⚠ KİMLİK NUMARAYLA DA YAZILIR. `userId` öğrencide ADA düşüyor
      // (currentUser'da id alanı yok). Sunucu yanıtı sahibine daraltırken adı
      // kayıttan çözmek zorunda kalıyordu; yeni kayıtlar numarayı da taşır,
      // eskiler adla eşleşmeye devam eder (server/lib/ogrenci-okuma.js).
      ...(currentUser?.studentNumber ? { studentNumber: currentUser.studentNumber } : {}),
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
