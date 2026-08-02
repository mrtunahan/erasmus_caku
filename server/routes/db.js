const express = require('express');
const rateLimit = require('express-rate-limit');
const jwt = require('jsonwebtoken');
const { getDbSafe } = require('../config/database');
const { ObjectId } = require('mongodb');
const { auditWrites } = require('../middleware/auditLog');
const { softAuth } = require('../middleware/softAuth');
const { JWT_SECRET } = require('../middleware/auth');

// Okuma rotaları için sessiz token çözümü — softAuth'tan farkı: anonim
// istekleri audit_logs'a YAZMAZ (her sayfa açılışında onlarca GET var).
function decodeUser(req) {
  let token = null;
  if (req.cookies && req.cookies.caku_auth) token = req.cookies.caku_auth;
  if (!token) {
    const h = req.headers.authorization;
    if (h && h.startsWith('Bearer ')) token = h.split(' ')[1];
  }
  if (!token) return null;
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (_e) {
    return null;
  }
}

const router = express.Router();

// Audit log middleware — /write öncesi req işaretlenir, sonrasında
// fire-and-forget olarak `audit_logs` koleksiyonuna kaydedilir.
const auditMiddleware = auditWrites(getDbSafe);
// softAuth: token varsa req.user, yoksa audit_logs'a "soft_auth_miss" — bloklamaz.
const softAuthMiddleware = softAuth(getDbSafe);

// Rate limiting — okuma ve yazma için ayrı limitler.
// SPA sayfa açılışında 30-50 paralel apiRead yapıyor, bu yüzden okumalarda
// yüksek tutuyoruz. Yazmalar daha hassas olduğu için düşük kalıyor.
const readLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 1200, // dakikada 1200 okuma — sayfa geçişleri ve refresh'lere yer bırakır
  message: { error: 'Çok fazla istek. Lütfen biraz bekleyin.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const writeLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120, // dakikada 120 yazma
  message: { error: 'Çok fazla istek. Lütfen biraz bekleyin.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// /write endpoint'i ve diğer POST'lar yazma limitine, GET'ler okuma limitine tabi
router.use((req, res, next) => {
  if (req.method === 'GET') return readLimiter(req, res, next);
  return writeLimiter(req, res, next);
});

// İzin verilen koleksiyonlar (güvenlik sınırı)
const ALLOWED_COLLECTIONS = [
  'students',
  'sinav_programi',
  'sinav_dersler',
  'sinav_donemler',
  'professors',
  'portal_posts',
  'portal_moderators',
  'portal_notifications',
  'portal_profiles',
  'portal_follows',
  'portal_reports',
  'muafiyet_settings',
  'muafiyet_records',
  'muafiyet_history',
  'projects',
  'project_courses',
  'departments',
  'department_classrooms',
  'course_schedules',
  'exams',
  'exam_results',
  'exam_periods',
  'resources',
  'forms',
  'internships',
  'internship_applications',
  'internship_uploads',
  'internship_periods',
  'internship_roadmap',
  'internship_notifications',
  'commissions',
  'portal_posts_comments',
  'portal_notifications_items',
  'trip_history',
  'course_groups',
  'course_group_posts',
  'events',
  'unides_projects',
  'unides_courses',
  'tubitak2209_projects',
  'tubitak2209_courses',
  'erasmus_universities',
  'student_notifications',
  'performance_indicators',
  'performance_targets',
  'performance_forms',
  'performance_reports',
  'performance_data',
  'performance_agg_rules',
  'strateji_izleme',
  'strateji_atama',
  'strateji_fac_ozet',
  'strateji_baglama',
  'audit_logs',
  'notifications',
  'student_clubs',
  'club_documents',
  'club_followers',
  'club_posts',
  'benim_ayarlar',
  'student_profiles',
  'surveys',
  'survey_assignments',
  'survey_responses',
  'universities',
  'faculties',
  'akademik_takvim',
  'document_templates',
  'student_courses',
  // Memur çıktı görünümü: modüllerin ürettiği belgelerin (snapshot) ortak kaydı.
  'memur_outputs',
  // Akreditasyon: çerçeve tanımları (MÜDEK vb. — ölçütler VERİ olarak) ve
  // program bazlı değerlendirme kayıtları (durum/not/kanıt).
  'akreditasyon_frameworks',
  'akreditasyon_assessments',
  // Akreditasyon Kanıt/Veri Havuzu: rapor (ÖDR) için her yerden toplanan
  // kanıt parçaları — metin, tablo, dosya, dış bağlantı+yapıştırılan içerik,
  // sistemden çekilen anlık görüntü. Ölçüt (1..10) ve program etiketli.
  'akreditasyon_havuz',
  // Kiracı (tenant) kimliği — beyaz etiket: uygulama/kurum/fakülte adları vb.
  'tenant_config',
  // ÇAP (Çift Anadal) / Yandal başvuruları — öğrenci dilekçe bilgileri + ekler.
  'cap_yandal_basvurular',
  // Yol Haritaları — bölüm yetkilisinin herhangi bir modül/sekme için
  // oluşturduğu adım adım rehberler. Öğrenci tarafında salt-okunur görünür.
  'yol_haritalari',
];

// passwords koleksiyonu yalnızca sunucu tarafında (auth.js) doğrudan okunur.
// Generic /api/db okuma API'sinden ERİŞİLEMEZ — parola hash'lerinin
// kimlik doğrulamasız sızmasını önlemek için izin listesinden çıkarıldı.
const READABLE_COLLECTIONS = [...ALLOWED_COLLECTIONS];

// ══════════════════════════════════════════════
// ERİŞİM POLİTİKASI (RBAC)
//
// DB_AUTH_MODE=off ile eski (açık) davranışa acil dönüş yapılabilir;
// varsayılan 'enforce'. Politika:
//
//   OKUMA:
//   • PUBLIC_READ           → token'sız okunabilir (org yapısı, PII yok)
//   • PUBLIC_READ_STRIPPED  → token'sız okunabilir ama yalnız listelenen
//                             alanlar döner (giriş ekranı akademisyen araması)
//   • ADMIN_READ            → yalnız admin rolü / isUniversityAdmin bayraklı
//                             akademisyen (audit kayıtları PII içerir)
//   • diğer tüm koleksiyonlar → geçerli token zorunlu
//
//   YAZMA:
//   • geçerli token zorunlu (öğrenci kaydı /api/auth/student-register'a taşındı)
//   • WRITE_DENY (audit_logs) → generic API'den kimse yazamaz
//   • student rolü → yalnız STUDENT_WRITABLE koleksiyonlarına yazabilir.
//     İSTİSNA: `students` — yalnız KENDİ kaydını günceller; kimlik/yetki
//     alanlarına dokunamaz ve başvuru kilitliyse hiç yazamaz.
//   • professor / bolum_yetkilisi / admin → tüm izinli koleksiyonlar
// ══════════════════════════════════════════════
const DB_AUTH_ENFORCED = process.env.DB_AUTH_MODE !== 'off';

// tenant_config: giriş ekranı (kimliksiz) marka/kurum adını okuyabilmeli.
const PUBLIC_READ = new Set(['universities', 'faculties', 'departments', 'tenant_config']);
// Giriş ekranındaki akademisyen adı araması için gerekli asgari alanlar
const PUBLIC_READ_STRIPPED = { professors: ['name', 'title', 'departmentId'] };
const ADMIN_READ = new Set(['audit_logs']);
const WRITE_DENY = new Set(['audit_logs']);

// Öğrencilerin işlem yapması meşru olan koleksiyonlar (kendi başvuruları,
// anket yanıtları, portal etkileşimleri, kulüpler, proje başvuruları)
const STUDENT_WRITABLE = new Set([
  'survey_responses',
  'internship_applications',
  'internship_uploads',
  'internship_notifications',
  'internship_roadmap',
  'muafiyet_records',
  'portal_posts',
  'portal_posts_comments',
  'portal_profiles',
  'portal_follows',
  'portal_reports',
  'portal_notifications',
  'portal_notifications_items',
  'portal_moderators',
  'student_notifications',
  'forms',
  'course_groups',
  'course_group_posts',
  'student_clubs',
  'club_documents',
  'club_followers',
  'club_posts',
  'student_profiles',
  'projects',
  'unides_projects',
  'tubitak2209_projects',
  // Öğrencinin dönem bazlı aldığı dersler (kendi kaydı, per (öğrenci, dönem))
  'student_courses',
  // ÇAP/Yandal başvurusu — öğrenci kendi başvurusunu oluşturur/günceller.
  'cap_yandal_basvurular',
]);

const STAFF_ROLES = new Set(['professor', 'bolum_yetkilisi', 'admin']);

// ══════════════════════════════════════════════
// EK SUNUCU KORUMALARI (DB_AUTH_ENFORCED ile birlikte devrede)
// ══════════════════════════════════════════════

// Yetki taşıyan alanlar: yalnız admin/üniversite yetkilisi değiştirebilir
// (isDeptManager'ı fakülte yetkilisi de atayabilir). Yetkisiz yazmalarda bu
// alanlar mevcut değerlerine SABİTLENİR — böylece sıradan bir akademisyenin
// kendi kaydına isUniversityAdmin:true yazarak admin'e yükselmesi engellenir,
// tam-doküman güncelleyen meşru akışlar ise bozulmaz.
const PRIV_FIELDS = ['isUniversityAdmin', 'isFacultyManager', 'isDeptManager'];

// Yapısal koleksiyonlar: bayraksız (sade) professor rolü yazamaz
const STRUCTURE_MANAGER_WRITE = new Set([
  'departments',
  'faculties',
  'universities',
  'tenant_config',
]);

// Yalnız BÖLÜM yetkilisi (ve üstü) yazabilir. STRUCTURE_MANAGER_WRITE'tan farkı:
// orası üniversite/fakülte yöneticisi ister, burası bölüm yetkilisine de açıktır.
// Sade akademisyen ve öğrenci yazamaz (öğrenci için ayrıca STUDENT_WRITABLE'da yok).
const DEPT_MANAGER_WRITE = new Set(['yol_haritalari']);

// ── Öğrencinin KENDİ `students` kaydı ──
// Öğrenci Erasmus başvurusunu (ders eşleştirmeleri, karşı kurum, dönem)
// kendisi girer; bu yüzden `students` koleksiyonuna sınırlı yazma gerekir.
// Ancak bu, blanket STUDENT_WRITABLE ile verilemez: kayıt aynı zamanda
// yetki alanlarını taşıyor. Kural:
//   • yalnız KENDİ kaydı (studentNumber === JWT identifier)
//   • yalnız güncelleme — ekleme/silme yok
//   • aşağıdaki alanlara dokunulamaz (istemci gönderse bile düşürülür)
//   • başvuru kilitliyse (eşleştirme var + düzenleme izni yok) reddedilir
const STUDENT_SELF_PROTECTED = new Set([
  'studentNumber', // kimlik
  'departmentId',
  'departmentName',
  'facultyId',
  'erasmusAccess', // kendine Erasmus yetkisi veremez
  'duzenlemeAcik', // kendi kilidini açamaz
  'duzenlemeAcanKisi',
  'duzenlemeAcilmaTarihi',
  'roles',
  'isMemur',
  '_owner',
  '_docId',
  'createdAt',
  'registeredVia',
]);

// Öğrenci sahiplik alanları — mevcut dokümanda bunlardan biri doluysa
// değeri JWT kimliğiyle eşleşmek zorundadır
const OWNER_FIELDS = [
  '_owner',
  'ogrenciNo',
  'studentNo',
  'studentNumber',
  'studentId',
  'userId',
  'authorId',
  'createdBy',
];
// Sahiplik alanı çözülemese bile öğrenci yazması REDDEDİLEN koleksiyonlar
const STUDENT_OWNED_STRICT = new Set([
  'internship_applications',
  'muafiyet_records',
  'survey_responses',
]);
// docId = staj başvuru id'si olan koleksiyonlar (sahip = başvurunun öğrencisi)
const APP_OWNED = new Set(['internship_roadmap', 'internship_uploads']);
// Öğrenci SİLMEsi sahibine (veya moderatöre) kısıtlı koleksiyonlar
const STUDENT_DELETE_OWNED = new Set(['portal_posts', 'portal_posts_comments']);

// Öğrencilerin hiç okuyamayacağı koleksiyonlar (personel modülleri)
const STUDENT_READ_DENY = new Set([
  'performance_data',
  'performance_indicators',
  'performance_targets',
  'performance_forms',
  'performance_reports',
  'performance_agg_rules',
  'strateji_izleme',
  'strateji_atama',
  'strateji_fac_ozet',
  'strateji_baglama',
]);
// Öğrenci okumalarında kendi kaydına zorlanan koleksiyonlar (alan → JWT kimliği)
const STUDENT_READ_SCOPED = {
  students: 'studentNumber',
  internship_applications: 'ogrenciNo',
  muafiyet_records: 'studentNo',
};
// Öğrenci okumalarında alan kısıtlaması (e-posta/bayrak gibi alanlar sızmasın)
const STUDENT_READ_STRIPPED = {
  // Danışman iletişim bilgileri (e-posta/dahili/foto) öğrenciye Benim Sayfam'da
  // gösterilir; bu yüzden bu alanlar da öğrenci okumasına açıktır.
  professors: [
    'name',
    'title',
    'unvan',
    'departmentId',
    'department',
    'email',
    'dahili',
    'photoURL',
  ],
};
// Tek istekte dönebilecek azami doküman sayısı (bellek/DoS koruması)
const MAX_READ_LIMIT = 20000;

// Aktör bayrakları (uniAdmin/facManager) — professors üzerinden, 60 sn cache
const actorFlagsCache = new Map(); // identifier -> { flags, ts }
async function getActorFlags(db, user) {
  if (!user) return { admin: false, uniAdmin: false, facManager: false, deptManager: false };
  if (user.role === 'admin')
    return { admin: true, uniAdmin: true, facManager: true, deptManager: true };
  if (user.role !== 'professor' || !user.identifier) {
    return { admin: false, uniAdmin: false, facManager: false, deptManager: false };
  }
  const hit = actorFlagsCache.get(user.identifier);
  if (hit && Date.now() - hit.ts < 60 * 1000) return hit.flags;
  let flags = { admin: false, uniAdmin: false, facManager: false, deptManager: false };
  try {
    const prof = await db.collection('professors').findOne({ name: user.identifier });
    if (prof) {
      flags = {
        admin: false,
        uniAdmin: !!prof.isUniversityAdmin,
        facManager: !!prof.isFacultyManager,
        deptManager: !!prof.isDeptManager,
      };
    }
  } catch (_) {
    /* profil okunamazsa yetkisiz varsay */
  }
  actorFlagsCache.set(user.identifier, { flags, ts: Date.now() });
  return flags;
}

// Doküman bulma, executeSingleOp ile aynı sırada: _id (string) → ObjectId → _docId
async function findDocByAnyId(db, collectionName, docId) {
  if (!docId) return null;
  const col = db.collection(collectionName);
  const byId = await col.findOne({ _id: docId });
  if (byId) return byId;
  if (typeof docId === 'string' && docId.length === 24) {
    try {
      const byObjId = await col.findOne({ _id: new ObjectId(docId) });
      if (byObjId) return byObjId;
    } catch (_) {
      /* ObjectId değil */
    }
  }
  return col.findOne({ _docId: docId });
}

async function findExistingDoc(db, op) {
  return findDocByAnyId(db, getCollectionName(op), op.docId);
}

// Staj başvurusu sahipliği: docId'nin işaret ettiği başvurunun öğrencisi mi?
async function ownsInternshipApp(db, docId, ident) {
  try {
    const app = await findDocByAnyId(db, 'internship_applications', docId);
    return !!app && String(app.ogrenciNo || app.studentNumber || '') === ident;
  } catch (_) {
    return false;
  }
}

// Öğrencinin portal moderatörü olup olmadığı (kayıt userId/_docId/_id ile aranır)
async function isPortalModerator(db, identifier) {
  if (!identifier) return false;
  try {
    const doc = await db.collection('portal_moderators').findOne({
      $or: [{ _id: identifier }, { _docId: identifier }, { userId: identifier }],
    });
    return !!doc;
  } catch (_) {
    return false;
  }
}

// Yazma politikaları (rol-sonrası, doküman-düzeyi). op.data'yı yerinde
// değiştirebilir (yetki alanlarını sabitleme, sahiplik damgası).
async function enforceWritePolicies(db, op, user) {
  if (!DB_AUTH_ENFORCED || !user) return { allow: true };

  // a) Yapısal koleksiyonlar: sade professor yazamaz
  if (STRUCTURE_MANAGER_WRITE.has(op.collection) && user.role === 'professor') {
    const flags = await getActorFlags(db, user);
    if (!flags.uniAdmin && !flags.facManager) {
      return {
        allow: false,
        status: 403,
        error: `Bu koleksiyonu yalnız yöneticiler düzenleyebilir: ${op.collection}`,
      };
    }
  }

  // a2) Bölüm yetkilisi koleksiyonları (yol haritaları): sade akademisyen
  // yazamaz; bölüm yetkilisi, fakülte/üniversite yöneticisi ve admin yazabilir.
  // role='bolum_yetkilisi' zaten ayrı bir roldür ve buraya düşmez.
  if (DEPT_MANAGER_WRITE.has(op.collection) && user.role === 'professor') {
    const flags = await getActorFlags(db, user);
    if (!flags.uniAdmin && !flags.facManager && !flags.deptManager) {
      return {
        allow: false,
        status: 403,
        error: `Bu koleksiyonu yalnız bölüm yetkilisi düzenleyebilir: ${op.collection}`,
      };
    }
  }

  // a3) Öğrencinin KENDİ `students` kaydı — sahiplik + alan koruması + kilit.
  if (op.collection === 'students' && user.role === 'student') {
    if (op.type !== 'update' && op.type !== 'set') {
      return { allow: false, status: 403, error: 'Öğrenci bu işlemi yapamaz.' };
    }
    const mevcut = await findExistingDoc(db, op);
    if (!mevcut) {
      return { allow: false, status: 404, error: 'Kayıt bulunamadı.' };
    }
    const ident = String(user.identifier || '');
    if (!ident || String(mevcut.studentNumber || '') !== ident) {
      return { allow: false, status: 403, error: 'Yalnızca kendi kaydınızı düzenleyebilirsiniz.' };
    }

    // Başvuru kilidi SUNUCUDA da uygulanır: eşleştirme girilmişse ve yetkili
    // düzenlemeye izin vermemişse öğrenci değiştiremez. (İstemci tarafındaki
    // kilit tek başına güvenlik değildir.)
    const eslesmeVar = Array.isArray(mevcut.outgoingMatches) && mevcut.outgoingMatches.length > 0;
    if (eslesmeVar && mevcut.duzenlemeAcik !== true) {
      return {
        allow: false,
        status: 403,
        error: 'Başvurunuz gönderildiği için düzenleme kapalı. Yetkiliden izin isteyiniz.',
      };
    }

    // Yetki/kimlik alanları istemci gönderse bile düşürülür.
    if (op.data && typeof op.data === 'object') {
      for (const alan of Object.keys(op.data)) {
        if (STUDENT_SELF_PROTECTED.has(alan)) delete op.data[alan];
      }
    }
    // `set` + merge:false dokümanı KOMPLE değiştirir; korunan alanlar silinir.
    // Bu yüzden öğrencinin replace'i birleştirmeye çevrilir.
    if (op.type === 'set') op.merge = true;

    // Düzenleme izni TEK SEFERLİKTİR: yetkili izni açar, öğrenci düzeltmesini
    // kaydeder ve kilit kendiliğinden geri kapanır. Aksi hâlde bir kez açılan
    // izin kalıcı oluyor ve "başvuru sonrası kapanma" kuralı fiilen ortadan
    // kalkıyordu. Bayrağı yalnız sunucu yönetir (öğrenci yazamaz).
    if (mevcut.duzenlemeAcik === true && op.data && typeof op.data === 'object') {
      op.data.duzenlemeAcik = false;
      op.data.duzenlemeKapanmaTarihi = new Date().toISOString();
    }
    return { allow: true };
  }

  // b) professors üzerindeki yetki bayrakları — yetkisiz aktörde sabitlenir
  if (op.collection === 'professors' && op.data && typeof op.data === 'object') {
    const touchesPriv = PRIV_FIELDS.some((f) => f in op.data);
    const isReplace = op.type === 'set' && !op.merge; // replace bayrak DÜŞÜREBİLİR de
    if (touchesPriv || isReplace) {
      const flags = await getActorFlags(db, user);
      if (!flags.admin && !flags.uniAdmin) {
        const existing = await findExistingDoc(db, op);
        for (const f of PRIV_FIELDS) {
          if (f === 'isDeptManager' && flags.facManager) continue; // fak. yetkilisi bölüm yetkilisi atayabilir
          if (existing && f in existing) op.data[f] = existing[f];
          else delete op.data[f];
        }
      }
    }
  }

  // c) Öğrenci sahiplik kuralları
  if (user.role === 'student') {
    const ident = String(user.identifier || '');
    if (!ident) {
      return { allow: false, status: 403, error: 'Kimlik çözülemedi.' };
    }

    // student_courses: sahiplik alanı her zaman JWT kimliğine sabitlenir —
    // öğrenci başkası adına dönem dersi kaydı oluşturamaz.
    if (
      op.collection === 'student_courses' &&
      op.data &&
      typeof op.data === 'object' &&
      (op.type === 'add' || op.type === 'set' || op.type === 'update')
    ) {
      op.data.studentNumber = ident;
      op.data._owner = ident;
      // Kilit: kaydedince locked=true olur. Öğrenci kilitli kaydı DEĞİŞTİREMEZ
      // ve kilidi kendisi AÇAMAZ — yalnız bölüm yetkilisi (staff) açabilir.
      if (op.type === 'set' || op.type === 'update') {
        const existing = await findExistingDoc(db, op);
        if (existing && existing.locked === true) {
          return {
            allow: false,
            status: 403,
            error: 'Ders seçiminiz kilitli. Değişiklik için bölüm yetkilinizle iletişime geçin.',
          };
        }
      }
    }

    // club_followers: takip kaydında sahiplik JWT kimliğine sabitlenir —
    // öğrenci başkası adına takip/çıkma kaydı oluşturamaz.
    if (
      op.collection === 'club_followers' &&
      op.data &&
      typeof op.data === 'object' &&
      (op.type === 'add' || op.type === 'set' || op.type === 'update')
    ) {
      op.data.studentNumber = ident;
      op.data._owner = ident;
    }

    // student_profiles: öğrencinin kendi profil kaydı (fotoğraf vb.) —
    // sahiplik JWT kimliğine sabitlenir.
    if (
      op.collection === 'student_profiles' &&
      op.data &&
      typeof op.data === 'object' &&
      (op.type === 'add' || op.type === 'set' || op.type === 'update')
    ) {
      op.data.studentNumber = ident;
      op.data._owner = ident;
    }

    // Yeni kayıt: sahiplik damgası yeterli
    if (op.type === 'add') {
      if (op.data && typeof op.data === 'object' && op.data._owner === undefined) {
        op.data._owner = ident;
      }
      // muafiyet_records: öğrenci yeni başvuruyu ONAYLI/İLERİ FAZDA gönderemez.
      // Karar ve faz alanları güvenli başlangıç değerlerine sabitlenir.
      if (op.collection === 'muafiyet_records' && op.data && typeof op.data === 'object') {
        op.data.status = 'pending';
        if (op.data.stage && op.data.stage !== 'on_inceleme') op.data.stage = 'on_inceleme';
        if (Array.isArray(op.data.matches)) {
          op.data.matches = op.data.matches.map((m) => {
            const mm = { ...m };
            delete mm.adminDecision;
            delete mm.adminDecidedBy;
            delete mm.adminUpdatedAt;
            if (mm.tier === 'approved') mm.tier = 'review';
            return mm;
          });
        }
        op.data.approvedCount = 0;
        op.data.rejectedCount = 0;
      }
      return { allow: true };
    }

    // Moderatör listesine yalnız mevcut moderatör yazabilir (öz-terfi engeli)
    if (op.collection === 'portal_moderators') {
      if (await isPortalModerator(db, ident)) return { allow: true };
      return { allow: false, status: 403, error: 'Moderatör yetkisi gerekli.' };
    }

    // roadmap/uploads: doküman VAR OLSUN OLMASIN sahip, docId'nin işaret
    // ettiği staj başvurusundan çözülür (başkasının başvurusuna önden kayıt
    // açmak da engellenir).
    if (APP_OWNED.has(op.collection)) {
      if (await ownsInternshipApp(db, op.docId, ident)) {
        if (op.data && typeof op.data === 'object' && op.data._owner === undefined) {
          op.data._owner = ident;
        }
        return { allow: true };
      }
      return {
        allow: false,
        status: 403,
        error: `Bu kayıt üzerinde işlem yetkiniz yok: ${op.collection}/${op.docId || ''}`,
      };
    }

    const existing = await findExistingDoc(db, op);
    if (!existing) {
      // Upsert ile yeni doküman: sahipliği damgala
      if (
        (op.type === 'set' || op.type === 'update') &&
        op.data &&
        typeof op.data === 'object' &&
        op.data._owner === undefined
      ) {
        op.data._owner = ident;
      }
      return { allow: true };
    }

    // Mevcut dokümanda sahiplik ara
    let ownerSeen = false;
    let owned = false;
    for (const f of OWNER_FIELDS) {
      const v = existing[f];
      if (v !== undefined && v !== null && v !== '') {
        ownerSeen = true;
        if (String(v) === ident) {
          owned = true;
          break;
        }
      }
    }
    if (owned) {
      // muafiyet_records: sahip öğrenci mevcut kaydında YALNIZ Faz-2 alanlarını
      // değiştirebilir ve stage'i yalnız on_onay → belge_teslim yönünde
      // ilerletebilir. adminDecision/tier/status/sayaçlar/matches öğrenciye
      // KAPALI (kendini onaylama / faz atlama engeli).
      if (op.collection === 'muafiyet_records' && op.type === 'set') {
        // Replace/upsert öğrenciye kapalı — diğer alanları (matches, studentNo…)
        // silip sahipliği kaybettirebilir. Faz-2 yalnız 'update' ile yapılır.
        return {
          allow: false,
          status: 403,
          error: 'Bu kayıt bu şekilde değiştirilemez.',
        };
      }
      if (
        op.collection === 'muafiyet_records' &&
        op.type === 'update' &&
        op.data &&
        typeof op.data === 'object'
      ) {
        const ALLOWED = new Set([
          'stage',
          'stageHistory',
          'notDonusumLink',
          'basariBelgesiUrl',
          'updatedAt',
          'createdAt',
          '_owner',
        ]);
        const bad = Object.keys(op.data).filter((k) => !ALLOWED.has(k));
        if (bad.length > 0) {
          return {
            allow: false,
            status: 403,
            error: `Bu kayıtta şu alanları değiştiremezsiniz: ${bad.join(', ')}`,
          };
        }
        if (
          'stage' in op.data &&
          !(existing.stage === 'on_onay' && op.data.stage === 'belge_teslim')
        ) {
          return { allow: false, status: 403, error: 'Geçersiz faz geçişi.' };
        }
      }
      return { allow: true };
    }

    // Portal içeriği silme: sahip değilse moderatör olmalı
    if (op.type === 'delete' && STUDENT_DELETE_OWNED.has(op.collection)) {
      if (await isPortalModerator(db, ident)) return { allow: true };
      return {
        allow: false,
        status: 403,
        error: 'Bu içeriği yalnız sahibi veya moderatör silebilir.',
      };
    }

    if (ownerSeen || STUDENT_OWNED_STRICT.has(op.collection)) {
      return {
        allow: false,
        status: 403,
        error: `Bu kayıt üzerinde işlem yetkiniz yok: ${op.collection}/${op.docId || ''}`,
      };
    }
    // Sahiplik alanı taşımayan legacy/serbest doküman — mevcut davranış korunur
    return { allow: true };
  }

  return { allow: true };
}

// isUniversityAdmin bayrağı JWT'de yok (role: 'professor') — audit_logs gibi
// hassas okumalar için professors koleksiyonundan bakılır, 60 sn cache'lenir.
const uniAdminCache = new Map(); // identifier -> { ok, ts }
async function isUniversityAdmin(db, identifier) {
  if (!identifier) return false;
  const hit = uniAdminCache.get(identifier);
  if (hit && Date.now() - hit.ts < 60 * 1000) return hit.ok;
  let ok = false;
  try {
    const doc = await db
      .collection('professors')
      .findOne({ name: identifier }, { projection: { isUniversityAdmin: 1 } });
    ok = !!(doc && doc.isUniversityAdmin);
  } catch (_e) {
    ok = false;
  }
  uniAdminCache.set(identifier, { ok, ts: Date.now() });
  return ok;
}

// Okuma yetkisi kararı: { allow: bool, strip?: [alanlar], status?, error? }
// getDb yalnızca gerektiğinde (audit_logs bayrak kontrolü) çağrılır —
// yetkisiz istekler DB'ye hiç dokunmadan reddedilir.
async function readDecision(collection, user, getDb) {
  if (!DB_AUTH_ENFORCED) return { allow: true };
  if (ADMIN_READ.has(collection)) {
    if (!user) return { allow: false, status: 401, error: 'Bu veri için giriş gereklidir.' };
    if (user.role === 'admin') return { allow: true };
    if (user.role === 'professor') {
      const db = await getDb();
      if (await isUniversityAdmin(db, user.identifier)) return { allow: true };
    }
    return { allow: false, status: 403, error: 'Bu veriye erişim yetkiniz yok.' };
  }
  if (user) return { allow: true };
  if (PUBLIC_READ.has(collection)) return { allow: true };
  if (PUBLIC_READ_STRIPPED[collection]) {
    return { allow: true, strip: PUBLIC_READ_STRIPPED[collection] };
  }
  return { allow: false, status: 401, error: 'Bu veri için giriş gereklidir.' };
}

// Yazma yetkisi kararı (tek işlem için)
function writeDecision(op, user) {
  if (!DB_AUTH_ENFORCED) return { allow: true };
  if (!user) return { allow: false, status: 401, error: 'Yazma işlemi için giriş gereklidir.' };
  if (WRITE_DENY.has(op.collection)) {
    return {
      allow: false,
      status: 403,
      error: `Bu koleksiyona API üzerinden yazılamaz: ${op.collection}`,
    };
  }
  if (user.role === 'student') {
    if (STUDENT_WRITABLE.has(op.collection)) return { allow: true };
    // `students`: yalnız kendi kaydını güncelleyebilir. Sahiplik, alan
    // koruması ve başvuru kilidi enforceWritePolicies'te uygulanır.
    if (op.collection === 'students' && (op.type === 'update' || op.type === 'set')) {
      return { allow: true };
    }
    return {
      allow: false,
      status: 403,
      error: `Öğrenci rolü bu koleksiyona yazamaz: ${op.collection}`,
    };
  }
  if (STAFF_ROLES.has(user.role)) return { allow: true };
  return { allow: false, status: 403, error: 'Bilinmeyen rol.' };
}

// Where/orderBy field adları için güvenlik allowlist'i —
// Mongo operatör enjeksiyonu (örn. $where) ve prototip kirletmesini engeller.
const SAFE_FIELD_NAME = /^[a-zA-Z_][a-zA-Z0-9_]*(\.[a-zA-Z_][a-zA-Z0-9_]*)*$/;
const FORBIDDEN_FIELDS = new Set(['__proto__', 'constructor', 'prototype']);

function isSafeField(name) {
  if (typeof name !== 'string' || name.length === 0 || name.length > 100) return false;
  if (FORBIDDEN_FIELDS.has(name)) return false;
  return SAFE_FIELD_NAME.test(name);
}

// Rastgele 20 karakterlik ID üret
function generateId() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let id = '';
  for (let i = 0; i < 20; i++) {
    id += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return id;
}

// Timestamp alanlarını temizle ve sunucu timestamp'i ekle
function addTimestamps(data, isNew) {
  const cleaned = {};
  const increments = {};
  for (const [key, value] of Object.entries(data || {})) {
    // Client-side FieldValue.serverTimestamp() serialize edilemez, atla
    if (value && typeof value === 'object' && value._methodName) continue;
    // __increment:N → MongoDB $inc
    if (typeof value === 'string' && value.startsWith('__increment:')) {
      const incVal = parseInt(value.split(':')[1], 10);
      increments[key] = isNaN(incVal) ? 1 : incVal;
      continue;
    }
    cleaned[key] = value;
  }
  cleaned.updatedAt = new Date();
  if (isNew) cleaned.createdAt = new Date();
  return { cleaned, increments };
}

// Koleksiyon adını çöz (subcollection desteği)
function getCollectionName(op) {
  if (op.parentDocId && op.subCollection) {
    return `${op.collection}_${op.subCollection}`;
  }
  return op.collection;
}

// Tek işlem yap
async function executeSingleOp(db, op) {
  const colName = getCollectionName(op);
  const col = db.collection(colName);

  switch (op.type) {
    case 'add': {
      const { cleaned } = addTimestamps(op.data, true);
      const result = await col.insertOne(cleaned);
      return { success: true, id: result.insertedId.toString() };
    }
    case 'set': {
      const { cleaned } = addTimestamps(op.data, true);
      if (op.docId) {
        // Priority: check string _id first (real docs), then _docId (legacy)
        const buildFilter = async () => {
          const byId = await col.findOne({ _id: op.docId });
          if (byId) return { _id: op.docId };
          if (op.docId.length === 24) {
            try {
              const byObjId = await col.findOne({ _id: new ObjectId(op.docId) });
              if (byObjId) return { _id: new ObjectId(op.docId) };
            } catch (e) {}
          }
          // Fallback to _docId (legacy)
          return { _docId: op.docId };
        };
        const filter = await buildFilter();
        if (op.merge) {
          await col.updateOne(filter, { $set: cleaned }, { upsert: true });
        } else {
          await col.replaceOne(filter, { ...cleaned, _docId: op.docId }, { upsert: true });
        }
      } else {
        await col.insertOne(cleaned);
      }
      return { success: true };
    }
    case 'update': {
      const { cleaned, increments } = addTimestamps(op.data, false);
      const updateDoc = { $set: cleaned };
      if (Object.keys(increments).length > 0) {
        updateDoc.$inc = increments;
      }
      // Priority: check string _id first (real docs), then ObjectId, then _docId (legacy)
      let filter = { _docId: op.docId }; // fallback
      const byId = await col.findOne({ _id: op.docId });
      if (byId) {
        filter = { _id: op.docId };
      } else if (op.docId && op.docId.length === 24) {
        try {
          const byObjId = await col.findOne({ _id: new ObjectId(op.docId) });
          if (byObjId) filter = { _id: new ObjectId(op.docId) };
        } catch (e) {}
      }
      await col.updateOne(filter, updateDoc, { upsert: true });
      return { success: true };
    }
    case 'delete': {
      console.log(
        `[DELETE] koleksiyon: ${colName}, docId: ${op.docId}, zaman: ${new Date().toISOString()}`
      );
      // Priority: real doc by string _id first
      let filter = { _docId: op.docId };
      const byId = await col.findOne({ _id: op.docId });
      if (byId) {
        filter = { _id: op.docId };
      } else if (op.docId && op.docId.length === 24) {
        try {
          const byObjId = await col.findOne({ _id: new ObjectId(op.docId) });
          if (byObjId) filter = { _id: new ObjectId(op.docId) };
        } catch (e) {}
      }
      const result = await col.deleteOne(filter);
      console.log(`[DELETE] sonuç: ${result.deletedCount} belge silindi (${colName}/${op.docId})`);
      return { success: true, deleted: result.deletedCount };
    }
    default:
      throw new Error(`Geçersiz işlem tipi: ${op.type}`);
  }
}

// POST /api/db/write
router.post('/write', softAuthMiddleware, auditMiddleware, async (req, res) => {
  const { operations } = req.body;

  if (!operations || !Array.isArray(operations) || operations.length === 0) {
    return res.status(400).json({ error: 'operations dizisi gerekli.' });
  }

  for (const op of operations) {
    if (!ALLOWED_COLLECTIONS.includes(op.collection)) {
      return res.status(403).json({ error: `Koleksiyon izni yok: ${op.collection}` });
    }
    // RBAC: token + rol denetimi (softAuth req.user'ı doldurdu; yoksa anonim)
    const decision = writeDecision(op, req.user);
    if (!decision.allow) {
      return res.status(decision.status || 403).json({ error: decision.error });
    }
  }

  const deleteCount = operations.filter((op) => op.type === 'delete').length;
  if (deleteCount > 20) {
    console.error(`BLOCKED: ${deleteCount} silme işlemi engellendi (max 20)`);
    return res.status(403).json({
      error: `Tek istekte en fazla 20 silme işlemi yapılabilir (istenen: ${deleteCount})`,
    });
  }

  const updateCount = operations.filter((op) => op.type === 'update' || op.type === 'set').length;
  if (updateCount > 50) {
    console.error(`BLOCKED: ${updateCount} güncelleme işlemi engellendi (max 50)`);
    return res.status(403).json({
      error: `Tek istekte en fazla 50 güncelleme işlemi yapılabilir (istenen: ${updateCount})`,
    });
  }

  try {
    const db = await getDbSafe();

    // Doküman-düzeyi politikalar: sahiplik (öğrenci IDOR), yetki bayrağı
    // sabitleme (yetki yükseltme) ve yapısal koleksiyon kısıtları.
    // Rol/koleksiyon kararı (writeDecision) yukarıda verildi; bu katman
    // hedef dokümana bakarak karar verir ve gerekirse op.data'yı düzeltir.
    for (const op of operations) {
      const pol = await enforceWritePolicies(db, op, req.user);
      if (!pol.allow) {
        return res.status(pol.status || 403).json({ error: pol.error });
      }
    }

    // Etkilenen koleksiyonları topla (gerçek zamanlı yayın için)
    const touched = new Set();
    const addTouched = (op) => {
      if (op && op.collection) touched.add(op.collection);
    };

    if (operations.length === 1) {
      const result = await executeSingleOp(db, operations[0]);
      addTouched(operations[0]);
      emitDbWrite(req, touched);
      return res.json(result);
    }

    const addedIds = [];
    for (const op of operations) {
      const result = await executeSingleOp(db, op);
      addTouched(op);
      if (result.id) addedIds.push(result.id);
    }
    emitDbWrite(req, touched);

    return res.json({ success: true, ids: addedIds });
  } catch (error) {
    console.error('mongoWrite error:', error);
    return res.status(500).json({ error: 'Yazma sırasında bir hata oluştu.' });
  }
});

// Socket.IO üzerinden değişen koleksiyonları yayınla (fire-and-forget)
function emitDbWrite(req, touchedSet) {
  try {
    const io = req.app && req.app.get && req.app.get('io');
    if (!io || !touchedSet || touchedSet.size === 0) return;
    const collections = Array.from(touchedSet);
    io.emit('db:write', { collections, at: new Date().toISOString() });
  } catch (e) {
    /* sessiz: real-time opsiyonel */
  }
}

// ══════════════════════════════════════════════
// GET /api/db/student-count - Kayıtlı öğrenci sayısı (salt sayı, herkese açık)
// Öğrenci rolü tüm `students` kaydını okuyamadığından (STUDENT_READ_SCOPED),
// portal "Kayıtlı Üyeler" için gerçek toplamı bu uç nokta döner. Hiçbir
// öğrenci verisi sızdırılmaz — yalnızca adet.
// NOT: /:collection param rotasından ÖNCE tanımlanmalı, aksi halde onunla eşleşir.
// ══════════════════════════════════════════════
router.get('/student-count', async (req, res) => {
  try {
    const db = await getDbSafe();
    const count = await db.collection('students').countDocuments({});
    return res.json({ count });
  } catch (err) {
    return res.status(500).json({ error: 'Sayı alınamadı', count: 0 });
  }
});

// ══════════════════════════════════════════════
// GET /api/db/:collection - Koleksiyon okuma
// Query params:
//   where=field:op:value (tekrarlanabilir) - op: eq, ne, gt, gte, lt, lte
//   orderBy=field:direction (asc/desc)
//   limit=N
// ══════════════════════════════════════════════
router.get('/:collection', async (req, res) => {
  const { collection } = req.params;

  if (!READABLE_COLLECTIONS.includes(collection)) {
    return res.status(403).json({ error: `Koleksiyon okuma izni yok: ${collection}` });
  }

  try {
    // RBAC: kimliksiz istekler yalnız public koleksiyonları okuyabilir.
    // Karar DB bağlantısından ÖNCE verilir (yetkisiz istek DB'ye dokunmaz).
    const user = decodeUser(req);
    const decision = await readDecision(collection, user, getDbSafe);
    if (!decision.allow) {
      return res.status(decision.status || 403).json({ error: decision.error });
    }
    // Öğrenci okuma politikası: personel koleksiyonları kapalı, hassas
    // koleksiyonlar kendi kaydına daraltılır, professors alan-kısıtlı döner.
    if (DB_AUTH_ENFORCED && user && user.role === 'student') {
      if (STUDENT_READ_DENY.has(collection)) {
        return res.status(403).json({ error: `Bu koleksiyona erişim yetkiniz yok: ${collection}` });
      }
      if (STUDENT_READ_STRIPPED[collection]) {
        decision.strip = STUDENT_READ_STRIPPED[collection];
      }
    }

    const db = await getDbSafe();
    const col = db.collection(collection);

    const mongoOps = {
      eq: '$eq',
      ne: '$ne',
      gt: '$gt',
      gte: '$gte',
      lt: '$lt',
      lte: '$lte',
    };

    const filter = {};
    const whereParams = req.query.where
      ? Array.isArray(req.query.where)
        ? req.query.where
        : [req.query.where]
      : [];

    for (const w of whereParams) {
      const parts = w.split(':');
      if (parts.length < 3) continue;
      const field = parts[0];
      const op = parts[1];
      const value = parts.slice(2).join(':');

      // Field adını sıkı doğrula — Mongo operatör enjeksiyonu önlemi
      if (!isSafeField(field)) continue;

      const mongoOp = mongoOps[op];
      if (mongoOp) {
        let convertedValue = value;
        if (value.startsWith('s:')) {
          convertedValue = value.slice(2);
        } else if (value === 'true') convertedValue = true;
        else if (value === 'false') convertedValue = false;
        else if (value !== '' && !isNaN(value)) convertedValue = Number(value);

        // Object.defineProperty yerine doğrudan atama; field adı zaten
        // allowlist'ten geçti, prototype-pollution riski yok.
        filter[field] = { [mongoOp]: convertedValue };
      }
    }

    // Öğrenci: hassas koleksiyonlarda filtre KENDİ kaydına zorlanır
    // (istemcinin where'i ne derse desin sunucu daraltır).
    if (DB_AUTH_ENFORCED && user && user.role === 'student') {
      const scopeField = STUDENT_READ_SCOPED[collection];
      if (scopeField) {
        filter[scopeField] = { $eq: String(user.identifier || '') };
      }
    }

    let cursor = col.find(filter);

    if (req.query.orderBy) {
      const [field, dir] = req.query.orderBy.split(':');
      if (isSafeField(field)) {
        cursor = cursor.sort({ [field]: dir === 'desc' ? -1 : 1 });
      }
    }

    // Sınırsız okuma yok: istenen limit tavana kırpılır, istenmemişse tavan.
    const limitVal = req.query.limit ? parseInt(req.query.limit, 10) : 0;
    cursor = cursor.limit(limitVal > 0 ? Math.min(limitVal, MAX_READ_LIMIT) : MAX_READ_LIMIT);

    const docs = await cursor.toArray();

    const result = docs.map((doc) => {
      const { _id, _docId, ...rest } = doc;
      // Anonim erişimde yalnız izinli alanları döndür (örn. giriş ekranı
      // akademisyen araması: ad/unvan/bölüm — e-posta ve bayraklar sızmasın)
      if (decision.strip) {
        const stripped = {};
        decision.strip.forEach((f) => {
          if (rest[f] !== undefined) stripped[f] = rest[f];
        });
        return { ...stripped, id: _docId || _id.toString() };
      }
      return {
        ...rest,
        id: _docId || _id.toString(),
      };
    });

    return res.json(result);
  } catch (error) {
    console.error(`Read ${collection} error:`, error);
    return res.status(500).json({ error: 'Okuma sırasında bir hata oluştu.' });
  }
});

// GET /api/db/:collection/:docId - Tek doküman okuma
router.get('/:collection/:docId', async (req, res) => {
  const { collection, docId } = req.params;

  if (!READABLE_COLLECTIONS.includes(collection)) {
    return res.status(403).json({ error: `Koleksiyon okuma izni yok: ${collection}` });
  }

  try {
    // RBAC: tek doküman okuması da aynı politikaya tabi
    const user = decodeUser(req);
    const decision = await readDecision(collection, user, getDbSafe);
    if (!decision.allow) {
      return res.status(decision.status || 403).json({ error: decision.error });
    }
    const isStudentReq = DB_AUTH_ENFORCED && user && user.role === 'student';
    if (isStudentReq) {
      if (STUDENT_READ_DENY.has(collection)) {
        return res.status(403).json({ error: `Bu koleksiyona erişim yetkiniz yok: ${collection}` });
      }
      if (STUDENT_READ_STRIPPED[collection]) {
        decision.strip = STUDENT_READ_STRIPPED[collection];
      }
    }

    const db = await getDbSafe();
    const col = db.collection(collection);

    // Önce _docId ile ara, sonra _id ile dene
    let doc = await col.findOne({ _docId: docId });

    if (!doc) {
      // ObjectId olarak dene
      try {
        doc = await col.findOne({ _id: new ObjectId(docId) });
      } catch (_) {
        // ObjectId değilse geç
      }
    }

    if (!doc) {
      return res.json({ exists: false, data: null });
    }

    // Öğrenci: hassas tek-doküman okuması yalnız KENDİ kaydı için.
    // roadmap/uploads sahibi, docId'nin işaret ettiği staj başvurusundan çözülür.
    if (isStudentReq) {
      const ident = String(user.identifier || '');
      const scopeField = STUDENT_READ_SCOPED[collection];
      if (scopeField && String(doc[scopeField] || '') !== ident) {
        return res.status(403).json({ error: 'Bu kayda erişim yetkiniz yok.' });
      }
      if (APP_OWNED.has(collection) && !(await ownsInternshipApp(db, docId, ident))) {
        return res.status(403).json({ error: 'Bu kayda erişim yetkiniz yok.' });
      }
    }

    const { _id, _docId, ...rest } = doc;
    if (decision.strip) {
      const stripped = {};
      decision.strip.forEach((f) => {
        if (rest[f] !== undefined) stripped[f] = rest[f];
      });
      return res.json({ exists: true, data: stripped, id: _docId || _id.toString() });
    }
    return res.json({ exists: true, data: rest, id: _docId || _id.toString() });
  } catch (error) {
    console.error(`Read ${collection}/${docId} error:`, error);
    return res.status(500).json({ error: 'Okuma sırasında bir hata oluştu.' });
  }
});

module.exports = router;
