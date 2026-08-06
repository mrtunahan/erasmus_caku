// ══════════════════════════════════════════════════════════════
// ÇAKÜ Yönetim Sistemi - Ders Muafiyet Modülü (Redesigned)
// Belge yükleme, otomatik içerik eşleştirme, Word çıktısı
// ══════════════════════════════════════════════════════════════

const { useState, useEffect, useRef, useCallback, useMemo } = React;

// Bir muafiyet/dikey geçiş kaydı silinebilir mi?
// Tek koşul: kullanıcı bölüm yetkilisi (ve üstü) olmalı. Tamamlanma şartı
// BİLEREK yok — hatalı/eksik yüklenmiş talepler onay kuyruğunda takılı
// kalmasın diye süren kayıt da silinebiliyor. Sunucudaki kuralın
// (routes/db.js → BASVURU_SIL_DEPT_MANAGER) arayüz karşılığıdır; ikisi
// birlikte değişmelidir.
const silinebilirMi = (rec, user) => {
  if (!rec || !user) return false;
  if (window.basvuruSilebilirMi && !window.basvuruSilebilirMi(user)) return false;
  return true;
};

// Kaydın süreci bitti mi? Silme uyarısının tonunu belirler.
const muafiyetTamamlandiMi = (rec) =>
  !!rec && (rec.stage === 'tamamlandi' || rec.status === 'tamamlandi' || rec.status === 'rejected');

// Türkçe-duyarlı görüntüleme biçimlendirmesi (ekranlarda; shared-components'ten).
// Veriyi değiştirmez — yalnız gösterimi düzeltir; eşleştirme küçük-harfe
// duyarsız olduğundan güvenlidir. Geçmiş (BÜYÜK harf) kayıtlar da düzelir.
const fmtName = (v) => (window.formatCaseTr ? window.formatCaseTr(v, 'name') : v || '');
const fmtTitle = (v) => (window.formatCaseTr ? window.formatCaseTr(v, 'title') : v || '');

// Dosya bağlantısı: PDF tarayıcıda önizlenir (/view); Office belgeleri
// (.docx/.xlsx) Office Online ile açılamadığından doğrudan indirilir.
const fileHref = (u) => {
  const rel = String(u || '')
    .replace('/api/files/download/', '')
    .replace('/api/files/view/', '');
  if (!rel) return '#';
  return /\.pdf$/i.test(rel)
    ? '/api/files/view/' + rel
    : '/api/files/download/' + rel + '?download=true';
};

// ── Shared bileşenlerden import ──
const _C = window.C;
const _Card = window.Card;
const _Btn = window.Btn;
const _Input = window.Input;
const _Select = window.Select;
const _FormField = window.FormField;
const _Modal = window.Modal;
const _Badge = window.Badge;
const _convertGrade = window.convertGrade;

// ══════════════════════════════════════════════════════════════
// SABİTLER
// ══════════════════════════════════════════════════════════════

// Sekmeler role göre belirlenir (DersMuafiyetApp içinde):
//   Öğrenci   → Yeni Muafiyet, Taleplerim, Eşleştirme Geçmişi
//   Akademisyen → Onay Bekleyenler, Geçmiş Kayıtlar, Eşleştirme Geçmişi, Ayarlar
const STUDENT_TABS = [
  { id: 'yeni', label: 'Yeni Talep', icon: 'plus' },
  { id: 'gecmis', label: 'Taleplerim', icon: 'history' },
  { id: 'esgecmis', label: 'Eşleştirme Geçmişi', icon: 'history' },
];
const STAFF_TABS = [
  { id: 'onay', label: 'Onay Bekleyenler', icon: 'plus' },
  { id: 'gecmis', label: 'Geçmiş Kayıtlar', icon: 'history' },
  { id: 'esgecmis', label: 'Eşleştirme Geçmişi', icon: 'history' },
  { id: 'ayarlar', label: 'Ayarlar', icon: 'settings' },
];

// Türkçe stopwords
const TR_STOPWORDS = new Set([
  've',
  'ile',
  'bir',
  'bu',
  'da',
  'de',
  'den',
  'dan',
  'için',
  'olan',
  'gibi',
  'kadar',
  'sonra',
  'önce',
  'üzere',
  'olarak',
  'veya',
  'ya',
  'hem',
  'ise',
  'nin',
  'nın',
  'nun',
  'nün',
  'dir',
  'dır',
  'dür',
  'dur',
  'ler',
  'lar',
  'tir',
  'tır',
  'tur',
  'tür',
  'ki',
  'mi',
  'mu',
  'mü',
  'ama',
  'fakat',
  'ancak',
  'yani',
  'çünkü',
  'zira',
  'dolayı',
  'daha',
  'çok',
  'bazı',
  'her',
  'hiç',
  'şu',
  'ne',
  'neden',
  'nasıl',
  'olan',
  'olma',
  'olur',
  'oldu',
  'olan',
  'oluş',
  'etmek',
  'etme',
  'yapma',
  'yapmak',
  'yapıl',
  'edilir',
  'edilecek',
  'edilen',
  'aynı',
  'diğer',
  'başka',
  'arası',
  'arasında',
  'üzerinde',
  'altında',
  'yanı',
  'sıra',
  'hakkında',
  'ilgili',
  'göre',
  'karşı',
  'doğru',
  'the',
  'and',
  'of',
  'in',
  'to',
  'for',
  'on',
  'with',
  'at',
  'by',
  'an',
  'are',
  'is',
  'as',
  'from',
  'that',
  'which',
  'or',
  'be',
  'it',
  'its',
  'has',
  'have',
  'this',
  'these',
  'those',
  'such',
  'will',
  'can',
  'may',
  'would',
  'should',
  'could',
  'been',
  'being',
  'was',
  'were',
  'not',
  'but',
  'also',
  'more',
  'than',
  'each',
  'about',
  'into',
  'through',
  'between',
  'their',
  'other',
  'ders',
  'konu',
  'hafta',
  'week',
  'topic',
  'lecture',
  'course',
  'saat',
  'hour',
  'lab',
  'laboratuvar',
  'uygulama',
  'teori',
]);

// Alan-Spesifik Eşanlamlılar Sözlüğü
const DOMAIN_SYNONYMS = {
  programlama: ['programming', 'kodlama', 'coding', 'yazılım geliştirme'],
  programming: ['programlama', 'kodlama', 'coding'],
  kodlama: ['programlama', 'programming', 'coding'],
  algoritma: ['algorithm', 'algorithms'],
  algorithm: ['algoritma'],
  'veri yapıları': ['data structures', 'veri yapısı'],
  'data structures': ['veri yapıları', 'veri yapısı'],
  'veri yapısı': ['data structure', 'veri yapıları'],
  veritabanı: ['database', 'veritaban', 'veri tabanı', 'db'],
  database: ['veritabanı', 'veri tabanı'],
  'veri tabanı': ['veritabanı', 'database'],
  'işletim sistemi': ['operating system', 'os'],
  'işletim sistemleri': ['operating systems'],
  'operating system': ['işletim sistemi', 'işletim sistemleri'],
  'operating systems': ['işletim sistemleri'],
  'bilgisayar ağları': ['computer networks', 'ağ', 'network'],
  'computer networks': ['bilgisayar ağları'],
  ağ: ['network', 'bilgisayar ağları'],
  network: ['ağ', 'bilgisayar ağları'],
  'yazılım mühendisliği': ['software engineering'],
  'software engineering': ['yazılım mühendisliği'],
  yazılım: ['software'],
  software: ['yazılım'],
  'yapay zeka': ['artificial intelligence', 'ai'],
  'artificial intelligence': ['yapay zeka'],
  'makine öğrenmesi': ['machine learning', 'ml'],
  'machine learning': ['makine öğrenmesi', 'makine öğrenme'],
  'derin öğrenme': ['deep learning'],
  'deep learning': ['derin öğrenme'],
  'sinir ağı': ['neural network', 'sinir ağları'],
  'neural network': ['sinir ağı', 'sinir ağları'],
  matematik: ['mathematics', 'math', 'calculus'],
  mathematics: ['matematik'],
  'doğrusal cebir': ['linear algebra', 'lineer cebir'],
  'linear algebra': ['doğrusal cebir', 'lineer cebir'],
  'lineer cebir': ['doğrusal cebir', 'linear algebra'],
  'ayrık matematik': ['discrete mathematics', 'discrete math'],
  'discrete mathematics': ['ayrık matematik'],
  diferansiyel: ['differential', 'differansiyel'],
  differential: ['diferansiyel', 'differansiyel'],
  olasılık: ['probability'],
  probability: ['olasılık'],
  istatistik: ['statistics', 'statistik'],
  statistics: ['istatistik'],
  fizik: ['physics'],
  physics: ['fizik'],
  elektronik: ['electronics', 'electronic'],
  electronics: ['elektronik'],
  devre: ['circuit', 'devreler'],
  circuit: ['devre', 'devreler'],
  web: ['internet', 'web programlama', 'web tasarım'],
  mobil: ['mobile'],
  mobile: ['mobil'],
  güvenlik: ['security', 'siber güvenlik'],
  security: ['güvenlik', 'siber güvenlik'],
  'siber güvenlik': ['cybersecurity', 'cyber security', 'güvenlik'],
  'bilgisayar mimarisi': ['computer architecture'],
  'computer architecture': ['bilgisayar mimarisi'],
  mikroişlemci: ['microprocessor', 'mikroişlemciler'],
  microprocessor: ['mikroişlemci', 'mikroişlemciler'],
  'nesne yönelimli': ['object oriented', 'oop', 'nesnesel'],
  'object oriented': ['nesne yönelimli', 'nesnesel'],
  nesnesel: ['nesne yönelimli', 'object oriented'],
  otomata: ['automata', 'otomat'],
  automata: ['otomata'],
  'formal diller': ['formal languages'],
  'formal languages': ['formal diller'],
  'görüntü işleme': ['image processing'],
  'image processing': ['görüntü işleme'],
  'doğal dil işleme': ['natural language processing', 'nlp'],
  'natural language processing': ['doğal dil işleme'],
  'bulut bilişim': ['cloud computing'],
  'cloud computing': ['bulut bilişim'],
  'gömülü sistem': ['embedded system', 'gömülü sistemler'],
  'embedded system': ['gömülü sistem', 'gömülü sistemler'],
  'veri madenciliği': ['data mining'],
  'data mining': ['veri madenciliği'],
  blokzincir: ['blockchain'],
  blockchain: ['blokzincir', 'blok zincir'],
};

// Türkçe Kök Bulma
const TR_SUFFIXES = [
  'leyebilir',
  'layabilir',
  'leştiril',
  'laştırıl',
  'lıkları',
  'likleri',
  'lukları',
  'lükleri',
  'lerden',
  'lardan',
  'lerini',
  'larını',
  'leyerek',
  'layarak',
  'leştir',
  'laştır',
  'lerin',
  'ların',
  'lerde',
  'larda',
  'lığı',
  'liği',
  'luğu',
  'lüğü',
  'lıkl',
  'likl',
  'lukl',
  'lükl',
  'ında',
  'inde',
  'ünde',
  'unde',
  'ıyla',
  'iyle',
  'arak',
  'erek',
  'mesi',
  'ması',
  'mesi',
  'ması',
  'ler',
  'lar',
  'lik',
  'lık',
  'luk',
  'lük',
  'nin',
  'nın',
  'nün',
  'nun',
  'den',
  'dan',
  'ten',
  'tan',
  'ini',
  'ını',
  'ünü',
  'unu',
  'ine',
  'ına',
  'üne',
  'una',
  'ile',
  'yla',
  'yle',
  'dır',
  'dir',
  'dur',
  'dür',
  'tır',
  'tir',
  'tur',
  'tür',
  'mak',
  'mek',
  'yor',
  'miş',
  'mış',
  'muş',
  'müş',
  'cak',
  'cek',
  'ler',
  'lar',
  'li',
  'lı',
  'lu',
  'lü',
  'ci',
  'cı',
  'cu',
  'cü',
  'si',
  'sı',
  'su',
  'sü',
  'ca',
  'ce',
  'da',
  'de',
  'ta',
  'te',
  'ya',
  'ye',
  'im',
  'ım',
  'um',
  'üm',
  'ın',
  'in',
  'un',
  'ün',
  'ek',
  'ak',
  'ma',
  'me',
  'an',
  'en',
];

function turkishStem(word) {
  if (!word || word.length < 4) return word;
  var stemmed = word;
  for (var i = 0; i < TR_SUFFIXES.length; i++) {
    var suffix = TR_SUFFIXES[i];
    if (stemmed.length > suffix.length + 2 && stemmed.endsWith(suffix)) {
      stemmed = stemmed.slice(0, stemmed.length - suffix.length);
      break;
    }
  }
  return stemmed;
}

// ── KARAR KURALLARI ──
// İsim benzerliği ŞART DEĞİL — muafiyet kararı yalnızca iki kritere bakar:
//   1. AKTS uyumu: kaynak dersin AKTS'si hedefin en az %70'i olmalı
//   2. İçerik uyumu: ders içerikleri en az %70 benzeşmeli
// %60–69 arası sınır bölgesi akademisyen onayına düşer (PDF metin
// çıkarma gürültüsüne tampon), %60 altı otomatik red.
const THRESHOLD_AUTO_APPROVE = 0.7; // içerik ≥ %70 → Otomatik Muaf (varsayılan)
const THRESHOLD_REVIEW = 0.6; // %60–69 → Akademisyen onayı bekliyor (varsayılan)
const AKTS_CHECK_ENABLED = true;
const AKTS_MIN_RATIO = 0.7; // kaynak AKTS ≥ hedef AKTS × 0.7

// Yaz dönemi AKTS tavanı — ÇAKÜ Ön Lisans/Lisans Eğitim-Öğretim Yönetmeliği
// MADDE 9(1): yaz döneminde toplam 21 AKTS kredi yükü aşılamaz. Yalnız yaz
// intibak (basvuruTuru === 'intibak') başvurularında uygulanır.
const YAZ_AKTS_CAP = 21;

// Kalibre edilebilir eşikler — muafiyet_settings/thresholds dokümanından
// yüklenir (Ayarlar → Eşik Kalibrasyonu). Yüklenmezse varsayılanlar geçerli.
// decideTier ve tüm UI metinleri bu objeyi okur; modül genelinde tek kaynak.
var CALIBRATION = { autoApprove: THRESHOLD_AUTO_APPROVE, review: THRESHOLD_REVIEW };

function applyCalibration(t) {
  if (t && typeof t.autoApprove === 'number' && t.autoApprove > 0 && t.autoApprove < 1) {
    CALIBRATION.autoApprove = t.autoApprove;
  }
  if (t && typeof t.review === 'number' && t.review > 0 && t.review < CALIBRATION.autoApprove) {
    CALIBRATION.review = t.review;
  }
}

// AKTS kapısı — kaynak dersin kredisi hedefin en az %70'i mi?
// Hedef AKTS bilinmiyorsa (0) kapı geçilir; kaynak bilinmiyorsa geçilmez.
function aktsCompatible(srcAkts, tgtAkts) {
  if (!AKTS_CHECK_ENABLED) return true;
  var tgt = parseInt(tgtAkts, 10) || 0;
  if (tgt === 0) return true;
  var src = parseInt(srcAkts, 10) || 0;
  return src >= tgt * AKTS_MIN_RATIO;
}

// ══════════════════════════════════════════════════════════════
// KÜTÜPHANELERİ YÜKLEME
// ══════════════════════════════════════════════════════════════

function loadScript(url) {
  return new Promise(function (resolve, reject) {
    if (document.querySelector('script[src="' + url + '"]')) {
      resolve();
      return;
    }
    var s = document.createElement('script');
    s.src = url;
    s.onload = resolve;
    s.onerror = function () {
      reject(new Error('Script yüklenemedi: ' + url));
    };
    document.head.appendChild(s);
  });
}

var _libsLoaded = false;
async function ensureLibsLoaded() {
  if (_libsLoaded) return;
  await loadScript('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js');
  window.pdfjsLib.GlobalWorkerOptions.workerSrc =
    'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  await loadScript('https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.6.0/mammoth.browser.min.js');
  if (!window.XLSX) {
    await loadScript('https://cdn.jsdelivr.net/npm/xlsx-js-style@1.2.0/dist/xlsx.bundle.js');
  }
  _libsLoaded = true;
}

// ══════════════════════════════════════════════════════════════
// DOSYA OKUMA & METİN ÇIKARMA
// ══════════════════════════════════════════════════════════════

async function extractTextFromPDF(file) {
  var arrayBuffer = await file.arrayBuffer();
  var pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  var allText = [];
  for (var i = 1; i <= pdf.numPages; i++) {
    var page = await pdf.getPage(i);
    var content = await page.getTextContent();
    var pageText = content.items
      .map(function (item) {
        return item.str;
      })
      .join(' ');
    allText.push(pageText);
  }
  return allText.join('\n');
}

async function extractTextFromDOCX(file) {
  var arrayBuffer = await file.arrayBuffer();
  var result = await mammoth.extractRawText({ arrayBuffer: arrayBuffer });
  return result.value;
}

function extractDataFromXLSX(file) {
  return new Promise(function (resolve, reject) {
    var reader = new FileReader();
    reader.onload = function (e) {
      try {
        var wb = window.XLSX.read(e.target.result, { type: 'binary' });
        var allData = [];
        wb.SheetNames.forEach(function (name) {
          var sheet = wb.Sheets[name];
          var json = window.XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
          allData.push({ sheetName: name, rows: json });
        });
        resolve(allData);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = reject;
    reader.readAsBinaryString(file);
  });
}

async function extractFromFile(file) {
  await ensureLibsLoaded();
  var name = file.name.toLowerCase();
  if (name.endsWith('.pdf')) return { type: 'text', data: await extractTextFromPDF(file) };
  if (name.endsWith('.docx') || name.endsWith('.doc'))
    return { type: 'text', data: await extractTextFromDOCX(file) };
  if (name.endsWith('.xlsx') || name.endsWith('.xls') || name.endsWith('.csv'))
    return { type: 'table', data: await extractDataFromXLSX(file) };
  throw new Error('Desteklenmeyen dosya formatı: ' + name);
}

// ══════════════════════════════════════════════════════════════
// YAPISAL VERİ PARSE ETME
// ══════════════════════════════════════════════════════════════

function parseCoursesFromTable(sheets) {
  var courses = [];
  sheets.forEach(function (sheet) {
    var rows = sheet.rows;
    if (rows.length < 2) return;
    var headerIdx = -1;
    var colMap = {};
    for (var rH = 0; rH < Math.min(rows.length, 10); rH++) {
      var rowH = rows[rH].map(function (c) {
        return String(c).toLowerCase().trim();
      });
      var hasCode = rowH.some(function (c) {
        return c.includes('kod') || c.includes('code');
      });
      var hasName = rowH.some(function (c) {
        return (
          c.includes('adı') ||
          c.includes('adi') ||
          c.includes('ad') ||
          c.includes('name') ||
          c.includes('ders')
        );
      });
      if (hasCode || hasName) {
        headerIdx = rH;
        rowH.forEach(function (cell, idx) {
          if (cell.includes('kod') || cell.includes('code')) colMap.code = idx;
          if (
            cell.includes('adı') ||
            cell.includes('adi') ||
            (cell.includes('ders') && !cell.includes('kod'))
          )
            colMap.name = idx;
          if (
            cell.includes('akts') ||
            cell.includes('ects') ||
            cell.includes('kredi') ||
            cell.includes('credit')
          )
            colMap.akts = idx;
          if (
            cell.includes('not') ||
            cell.includes('grade') ||
            cell.includes('başarı') ||
            cell.includes('basari') ||
            cell.includes('harf')
          )
            colMap.grade = idx;
          if (cell.includes('haftalık') || cell.includes('haftalik') || cell.includes('weekly')) {
            colMap.weeklyContent = idx;
          } else if (
            cell.includes('içerik') ||
            cell.includes('icerik') ||
            cell.includes('content') ||
            cell.includes('açıklama') ||
            cell.includes('aciklama')
          ) {
            colMap.content = idx;
          }
          if (
            cell.includes('statü') ||
            cell.includes('statu') ||
            cell.includes('tür') ||
            cell.includes('tur') ||
            cell.includes('type')
          )
            colMap.status = idx;
        });
        break;
      }
    }
    if (headerIdx === -1 && rows.length > 1) {
      headerIdx = 0;
      if (rows[0].length >= 2) {
        colMap.code = 0;
        colMap.name = 1;
        if (rows[0].length >= 3) colMap.akts = 2;
        if (rows[0].length >= 4) colMap.grade = 3;
        if (rows[0].length >= 5) colMap.weeklyContent = 4;
      }
    }
    for (var r = headerIdx + 1; r < rows.length; r++) {
      var row = rows[r];
      var code = colMap.code !== undefined ? String(row[colMap.code] || '').trim() : '';
      var name = colMap.name !== undefined ? String(row[colMap.name] || '').trim() : '';
      if (!code && !name) continue;
      courses.push({
        code: code,
        name: name,
        akts: colMap.akts !== undefined ? String(row[colMap.akts] || '').trim() : '',
        grade: colMap.grade !== undefined ? String(row[colMap.grade] || '').trim() : '',
        content: colMap.content !== undefined ? String(row[colMap.content] || '').trim() : '',
        weeklyContent:
          colMap.weeklyContent !== undefined ? String(row[colMap.weeklyContent] || '').trim() : '',
        status: colMap.status !== undefined ? String(row[colMap.status] || '').trim() : '',
      });
    }
  });
  return courses;
}

function parseCoursesFromText(text) {
  var courses = [];
  var lines = text
    .split('\n')
    .map(function (l) {
      return l.trim();
    })
    .filter(Boolean);
  var codePattern = /^([A-ZÇĞİÖŞÜa-zçğıöşü]{2,5}\s?\d{3,4})(.*)$/;
  var currentCourse = null;
  for (var i = 0; i < lines.length; i++) {
    var line = lines[i];
    if (line.match(/^\d+$/) || line.includes('ÇANKIRI KARATEKİN')) continue;
    var match = line.match(codePattern);
    if (match) {
      if (currentCourse) courses.push(currentCourse);
      var code = match[1].replace(/\s/g, '');
      var rest = match[2].trim();
      var aktsMatch = rest.match(/(\d+)\s*(AKTS|ECTS|kredi|credit)/i);
      var akts = aktsMatch ? aktsMatch[1] : '';
      var gradeMatch = rest.match(/\b(AA|BA|BB|CB|CC|DC|DD|FF|FD|[A-F][+-]?)\b/);
      var grade = gradeMatch ? gradeMatch[1] : '';
      var name = rest
        .replace(/(\d+)\s*(AKTS|ECTS|kredi|credit)/gi, '')
        .replace(/\b(AA|BA|BB|CB|CC|DC|DD|FF|FD|[A-F][+-]?)\b/g, '')
        .replace(/[|,;]/g, ' ')
        .trim()
        .replace(/^[-–:\s]+|[-–:\s]+$/g, '');
      currentCourse = {
        code: code,
        name: name,
        akts: akts,
        grade: grade,
        content: '',
        weeklyContent: '',
      };
    } else if (currentCourse) {
      if (!currentCourse.akts) {
        var aktsM = line.match(/(\d+)\s*(AKTS|ECTS|kredi|credit)/i);
        if (aktsM) currentCourse.akts = aktsM[1];
      }
      currentCourse.weeklyContent += (currentCourse.weeklyContent ? ' ' : '') + line;
    }
  }
  if (currentCourse) courses.push(currentCourse);
  return courses;
}

// Dilekçeden ÇAKÜ ders kodlarını çıkarır ve targetCourses ile eşleştirir
function parsePetitionDocument(text, targetCourses) {
  // ÇAKÜ ders kodu formatları: BM*301, BM301, CSE 301 vb.
  var cakuPattern = /([A-ZÇĞİÖŞÜ]{2,5})\*?(\d{3,4})/g;
  var found = [];
  var seen = new Set();
  var match;
  while ((match = cakuPattern.exec(text)) !== null) {
    var code = match[1] + match[2];
    if (!seen.has(code)) {
      seen.add(code);
      found.push(code);
    }
  }
  // Her bulunan kodu targetCourses'ta ara
  var results = [];
  found.forEach(function (code) {
    var upper = code.toUpperCase();
    var target = targetCourses.find(function (c) {
      return c.code && c.code.replace(/\s|\*/g, '').toUpperCase() === upper;
    });
    if (target) {
      results.push({ cakuCode: code, target: target });
    }
  });
  return results;
}

// Dilekçedeki satırlardan karşı kurum kodu → ÇAKÜ kodu çiftlerini çıkarır
function parsePetitionRows(text, targetCourses) {
  var lines = text
    .split('\n')
    .map(function (l) {
      return l.trim();
    })
    .filter(Boolean);
  var rows = [];
  // Her satırda iki ders kodu varsa (sol = karşı kurum, sağ = ÇAKÜ)
  var pairPattern = /([A-ZÇĞİÖŞÜa-zçğıöşü]{2,5}\s?\d{3,4})[^\n]*?([A-ZÇĞİÖŞÜ]{2,5}\*?\s?\d{3,4})/;
  var cakuColPattern = /([A-ZÇĞİÖŞÜ]{2,5})\*?(\d{3,4})/g;
  lines.forEach(function (line) {
    var m = line.match(pairPattern);
    if (m) {
      var sourceCode = m[1].replace(/\s/g, '');
      var cakuCode = m[2].replace(/[\s*]/g, '');
      var target = targetCourses.find(function (c) {
        return c.code && c.code.replace(/\s|\*/g, '').toUpperCase() === cakuCode.toUpperCase();
      });
      rows.push({ sourceCode: sourceCode, cakuCode: cakuCode, target: target || null });
    }
  });
  return rows;
}

// ══════════════════════════════════════════════════════════════
// NLP MOTORU
// ══════════════════════════════════════════════════════════════

function normalizeText(text) {
  if (!text) return '';
  // ÖNEMLİ: JS standart .toLowerCase() Türkçe duyarlı değildir.
  //   "İ" → "i" + combining-dot (U+0307) → kelime bozulur
  //   "I" → "i" (büyük noktasız I, küçük noktalı i'ye dönüşür, bilgi kaybı)
  // Türkçe locale-aware toLocaleLowerCase kullanılır, ayrıca combining
  // diakritik işaretler temizlenir (NFD + diacritic strip değil, sadece
  // kalan combining dot above 0x0307 hedefli).
  return text
    .toLocaleLowerCase('tr-TR')
    .replace(/̇/g, '') // combining dot above (İ → i̇ kalıntısı)
    .replace(/[^a-zçğıöşü0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenize(text) {
  return normalizeText(text)
    .split(' ')
    .filter(function (w) {
      return w.length > 1 && !TR_STOPWORDS.has(w);
    });
}

function tokenizeStemmed(text) {
  return tokenize(text).map(function (w) {
    return turkishStem(w);
  });
}

function expandWithSynonyms(tokens) {
  var expanded = new Set(tokens);
  tokens.forEach(function (token) {
    if (DOMAIN_SYNONYMS[token]) {
      DOMAIN_SYNONYMS[token].forEach(function (syn) {
        normalizeText(syn)
          .split(' ')
          .forEach(function (w) {
            if (w.length > 1) expanded.add(w);
          });
      });
    }
  });
  var fullText = tokens.join(' ');
  Object.keys(DOMAIN_SYNONYMS).forEach(function (key) {
    if (key.includes(' ') && fullText.includes(key)) {
      DOMAIN_SYNONYMS[key].forEach(function (syn) {
        normalizeText(syn)
          .split(' ')
          .forEach(function (w) {
            if (w.length > 1) expanded.add(w);
          });
      });
    }
  });
  return Array.from(expanded);
}

function charNgrams(text, n) {
  if (!n) n = 2;
  var normalized = normalizeText(text);
  var grams = new Set();
  for (var i = 0; i <= normalized.length - n; i++) grams.add(normalized.substring(i, i + n));
  return grams;
}

function levenshteinDistance(a, b) {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  var matrix = [];
  var i, j;
  for (i = 0; i <= b.length; i++) matrix[i] = [i];
  for (j = 0; j <= a.length; j++) matrix[0][j] = j;
  for (i = 1; i <= b.length; i++) {
    for (j = 1; j <= a.length; j++) {
      var cost = a[j - 1] === b[i - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }
  return matrix[b.length][a.length];
}

function wordSimilarity(word1, word2) {
  if (!word1 || !word2) return 0;
  var maxLen = Math.max(word1.length, word2.length);
  return maxLen === 0 ? 1 : 1 - levenshteinDistance(word1, word2) / maxLen;
}

function jaccardSimilarity(text1, text2) {
  var tokens1 = tokenizeStemmed(text1),
    tokens2 = tokenizeStemmed(text2);
  if (tokens1.length === 0 || tokens2.length === 0) return 0;
  var exp1 = expandWithSynonyms(tokens1),
    exp2 = expandWithSynonyms(tokens2);
  var set1 = new Set(exp1),
    set2 = new Set(exp2);
  var intersection = 0;
  set1.forEach(function (t) {
    if (set2.has(t)) intersection++;
  });
  var union = new Set([...exp1, ...exp2]).size;
  return union > 0 ? intersection / union : 0;
}

function ngramSimilarity(text1, text2) {
  var grams1 = charNgrams(text1, 2),
    grams2 = charNgrams(text2, 2);
  if (grams1.size === 0 || grams2.size === 0) return 0;
  var intersection = 0;
  grams1.forEach(function (g) {
    if (grams2.has(g)) intersection++;
  });
  var union = new Set([...grams1, ...grams2]).size;
  return union > 0 ? intersection / union : 0;
}

function tfidfCosineSimilarity(text1, text2) {
  var tokens1 = expandWithSynonyms(tokenizeStemmed(text1));
  var tokens2 = expandWithSynonyms(tokenizeStemmed(text2));
  if (tokens1.length === 0 || tokens2.length === 0) return 0;
  var tf1 = {},
    tf2 = {};
  tokens1.forEach(function (t) {
    tf1[t] = (tf1[t] || 0) + 1;
  });
  tokens2.forEach(function (t) {
    tf2[t] = (tf2[t] || 0) + 1;
  });
  var max1 = Math.max.apply(null, Object.values(tf1));
  var max2 = Math.max.apply(null, Object.values(tf2));
  var ntf1 = {},
    ntf2 = {};
  Object.keys(tf1).forEach(function (t) {
    ntf1[t] = 0.5 + (0.5 * tf1[t]) / max1;
  });
  Object.keys(tf2).forEach(function (t) {
    ntf2[t] = 0.5 + (0.5 * tf2[t]) / max2;
  });
  var allTerms = new Set([...Object.keys(tf1), ...Object.keys(tf2)]);
  var idf = {};
  allTerms.forEach(function (term) {
    var df = (tf1[term] ? 1 : 0) + (tf2[term] ? 1 : 0);
    idf[term] = Math.log(2 / df) + 1;
  });
  var dotProduct = 0,
    mag1 = 0,
    mag2 = 0;
  allTerms.forEach(function (term) {
    var v1 = (ntf1[term] || 0) * idf[term],
      v2 = (ntf2[term] || 0) * idf[term];
    dotProduct += v1 * v2;
    mag1 += v1 * v1;
    mag2 += v2 * v2;
  });
  mag1 = Math.sqrt(mag1);
  mag2 = Math.sqrt(mag2);
  return mag1 > 0 && mag2 > 0 ? dotProduct / (mag1 * mag2) : 0;
}

function softJaccardSimilarity(text1, text2) {
  var tokens1 = tokenizeStemmed(text1),
    tokens2 = tokenizeStemmed(text2);
  if (tokens1.length === 0 || tokens2.length === 0) return 0;
  var matched = 0,
    used = new Set();
  tokens1.forEach(function (t1) {
    var bestScore = 0,
      bestIdx = -1;
    tokens2.forEach(function (t2, idx) {
      if (used.has(idx)) return;
      var sim = wordSimilarity(t1, t2);
      if (sim > bestScore) {
        bestScore = sim;
        bestIdx = idx;
      }
    });
    if (bestScore >= 0.85) {
      matched += bestScore;
      if (bestIdx >= 0) used.add(bestIdx);
    }
  });
  var total = Math.max(tokens1.length, tokens2.length);
  return total > 0 ? matched / total : 0;
}

function courseNameSimilarity(name1, name2) {
  if (!name1 || !name2) return 0;
  var n1 = normalizeText(name1),
    n2 = normalizeText(name2);
  if (n1 === n2) return 1.0;
  if (n1.includes(n2) || n2.includes(n1)) return 0.9;
  return (
    ngramSimilarity(name1, name2) * 0.25 +
    softJaccardSimilarity(name1, name2) * 0.35 +
    jaccardSimilarity(name1, name2) * 0.4
  );
}

function courseCodeSimilarity(code1, code2) {
  if (!code1 || !code2) return 0;
  var c1 = normalizeText(code1).replace(/\s/g, ''),
    c2 = normalizeText(code2).replace(/\s/g, '');
  if (c1 === c2) return 1.0;
  var num1 = c1.replace(/[^0-9]/g, ''),
    num2 = c2.replace(/[^0-9]/g, '');
  var prefix1 = c1.replace(/[0-9]/g, ''),
    prefix2 = c2.replace(/[0-9]/g, '');
  var score = 0;
  if (num1 && num2 && num1 === num2) score += 0.3;
  if (num1.length >= 1 && num2.length >= 1 && num1[0] === num2[0]) score += 0.2;
  score += wordSimilarity(prefix1, prefix2) * 0.5;
  return Math.min(score, 1.0);
}

function contentSimilarity(text1, text2) {
  if (!text1 || !text2) return 0;
  return (
    tfidfCosineSimilarity(text1, text2) * 0.5 +
    jaccardSimilarity(text1, text2) * 0.35 +
    ngramSimilarity(text1, text2) * 0.15
  );
}

// ── BÖLÜM-BAZLI İÇERİK ANALİZİ ──
// Ders tanıtım formları düz paragraf değil; haftalık konular, öğrenme
// çıktıları ve kaynakça blokları taşır. Her blok ayrı skorlanıp ağırlıklı
// harmanlanır — düz metin karşılaştırmasındaki gürültüyü azaltır.

// E-posta / URL / telefon gibi içerik dışı gürültüyü temizle
function cleanCourseNoise(text) {
  return (text || '')
    .replace(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi, ' ')
    .replace(/https?:\/\/\S+/gi, ' ')
    .replace(/\b0?\s*\(?\d{3}\)?[\s-]?\d{3}[\s-]?\d{2}[\s-]?\d{2}\b/g, ' ');
}

// Metni başlık kalıplarına göre bölümlere ayır.
// Başlık bulunamazsa tüm metin 'general' altında kalır.
function splitCourseSections(rawText) {
  var text = (rawText || '').replace(/\s+/g, ' ').trim();
  var out = { weekly: '', outcomes: '', resources: '', general: '' };
  if (!text) return out;
  var lower = text.toLocaleLowerCase('tr-TR');

  var markers = [
    {
      key: 'weekly',
      re: /hafta(?:lık)?\s*(?:ders\s*)?(?:içeri[kğ]i?|konular[ıi]?|plan[ıi]?|program[ıi]?)/,
    },
    { key: 'outcomes', re: /(?:öğrenme|ders(?:in)?)\s*(?:çıktı|kazanım)[a-zçğıöşü]*/ },
    { key: 'resources', re: /kaynak(?:ça|lar)?\b|ders kitab[ıi]|önerilen kaynak|textbook/ },
  ];
  var hits = [];
  markers.forEach(function (m) {
    var idx = lower.search(m.re);
    if (idx >= 0) hits.push({ key: m.key, idx: idx });
  });
  // Başlık olmasa da "1. hafta … 14. hafta" listesi haftalık bölüm sayılır
  if (
    !hits.some(function (h) {
      return h.key === 'weekly';
    })
  ) {
    var weekItems = lower.match(/\b\d{1,2}\s*\.?\s*hafta\b/g) || [];
    if (weekItems.length >= 5) {
      var firstWeek = lower.search(/\b\d{1,2}\s*\.?\s*hafta\b/);
      if (firstWeek >= 0) hits.push({ key: 'weekly', idx: firstWeek });
    }
  }
  if (hits.length === 0) {
    out.general = text;
    return out;
  }
  hits.sort(function (a, b) {
    return a.idx - b.idx;
  });
  out.general = text.slice(0, hits[0].idx).trim();
  hits.forEach(function (h, i) {
    var end = i + 1 < hits.length ? hits[i + 1].idx : text.length;
    out[h.key] = (out[h.key] ? out[h.key] + ' ' : '') + text.slice(h.idx, end).trim();
  });
  return out;
}

var SECTION_WEIGHTS = { weekly: 0.5, outcomes: 0.3, resources: 0.1, general: 0.1 };

// İki içerik metnini bölüm-bazlı karşılaştır. Her iki yanda da bulunan
// bölümler kendi ağırlığıyla skorlanır; eksik bölümlerin ağırlığı kalanlara
// dağıtılır. Ortak bölüm kapsamı zayıfsa düz karşılaştırmaya geri döner.
function sectionAwareContentSimilarity(text1, text2) {
  if (!text1 || !text2) return 0;
  var a = splitCourseSections(cleanCourseNoise(text1));
  var b = splitCourseSections(cleanCourseNoise(text2));
  var acc = 0,
    totalW = 0;
  Object.keys(SECTION_WEIGHTS).forEach(function (k) {
    if (a[k] && b[k] && a[k].length >= 30 && b[k].length >= 30) {
      acc += contentSimilarity(a[k], b[k]) * SECTION_WEIGHTS[k];
      totalW += SECTION_WEIGHTS[k];
    }
  });
  if (totalW < 0.5) return contentSimilarity(text1, text2);
  return acc / totalW;
}

// ── SKOR: yalnızca İÇERİK ──
// İsim ve kod benzerliği KARARA GİRMEZ (isim benzerliği şart değil).
// İçerik metni iki yanda da yoksa skor hesaplanamaz → noContent bayrağı
// döner; karar mekanizması bunu akademisyen incelemesine yönlendirir.
function multiFactorScore(srcCourse, tgtCourse) {
  var safe = function (v) {
    return typeof v === 'number' && !isNaN(v) ? v : 0;
  };
  var srcText = srcCourse.weeklyContent || srcCourse.content || '';
  var tgtText = tgtCourse.weeklyContent || tgtCourse.content || '';
  var hasContent = !!(srcText && tgtText);
  var contScore = hasContent ? safe(sectionAwareContentSimilarity(srcText, tgtText)) : 0;
  return {
    total: contScore,
    contentScore: contScore,
    noContent: !hasContent,
  };
}

// ── KARAR: AKTS kapısı + içerik eşiği ──
// Tek yerden karar — akademisyen sihirbazı ve öğrenci formu aynı kuralı kullanır.
function decideTier(aktsPass, scores) {
  if (!aktsPass) {
    return { tier: 'rejected', matched: false, reason: 'AKTS yetersiz (en az %70 uyum gerekli)' };
  }
  if (scores.noContent) {
    return {
      tier: 'review',
      matched: false,
      reason: 'İçerik dosyası eksik — akademisyen incelemesi gerekli',
    };
  }
  if (scores.total >= CALIBRATION.autoApprove) {
    return { tier: 'approved', matched: true, reason: '' };
  }
  if (scores.total >= CALIBRATION.review) {
    return {
      tier: 'review',
      matched: false,
      reason: 'İnceleme gerekiyor (içerik %' + Math.round(scores.total * 100) + ')',
    };
  }
  return {
    tier: 'rejected',
    matched: false,
    reason: 'İçerik uyumu düşük (%' + Math.round(scores.total * 100) + ')',
  };
}

// ── SEMANTİK SKOR (opsiyonel sunucu servisi) ──
// /api/semantic/similarity ayaktaysa içerik skoru embedding cosine ile
// yeniden hesaplanır ("retrieval sözcüksel → rerank semantik").
// Servis yoksa/ulaşılamazsa null döner ve sözcüksel skor geçerli kalır.
async function fetchSemanticScores(pairs) {
  try {
    var token = localStorage.getItem('caku_auth_token');
    var headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = 'Bearer ' + token;
    var res = await fetch('/api/semantic/similarity', {
      method: 'POST',
      headers: headers,
      credentials: 'include',
      body: JSON.stringify({ pairs: pairs }),
    });
    if (!res.ok) return null;
    var data = await res.json();
    return data && data.available && Array.isArray(data.scores) ? data.scores : null;
  } catch (_e) {
    return null;
  }
}

/**
 * Ders çiftlerini yapay zekâya kapsam değerlendirmesi için gönderir.
 *
 * Girdi: [{alinan:{ad,kod,akts,icerik}, hedef:{...}}] — çağıranın sırasıyla
 * aynı uzunlukta dizi döner; her eleman {oran(0-1), karar, gerekce} ya da null.
 * AI yapılandırılmamışsa / çağrı başarısızsa null döner (çağıran sözcüksel
 * ya da semantik katmana düşer).
 */
async function fetchAiKapsamSkorlari(ciftler) {
  try {
    if (!window.aiBelgeDurumu || !window.aiDersEslestir) return null;
    var durum = await window.aiBelgeDurumu();
    if (!durum || !durum.configured) return null;
    var yuk = ciftler.map(function (c, i) {
      return { id: 'r' + i, alinan: c.alinan, hedef: c.hedef };
    });
    if (yuk.length === 0) return null;
    var sonuc = await window.aiDersEslestir(yuk);
    if (!sonuc || !sonuc.data) return null;
    return ciftler.map(function (_c, i) {
      var g = sonuc.data['r' + i];
      if (!g) return null;
      return {
        oran: Math.max(0, Math.min(1, (Number(g.oran) || 0) / 100)),
        karar: g.karar || '',
        gerekce: g.gerekce || '',
      };
    });
  } catch (_e) {
    return null;
  }
}

// Eşleşme listesini (autoMatch çıktısı: {source, target, aktsPass, ...})
// semantik skorla yeniden derecelendir. Servis yoksa liste aynen döner.
async function refineMatchesSemantic(matches) {
  var eligible = [];
  matches.forEach(function (m, i) {
    var a = m.source && (m.source.weeklyContent || m.source.content);
    var b = m.target && (m.target.weeklyContent || m.target.content);
    if (a && b) eligible.push({ index: i, a: a, b: b });
  });
  if (eligible.length === 0) return { matches: matches, semantic: false };
  var scores = await fetchSemanticScores(
    eligible.map(function (e) {
      return { a: e.a, b: e.b };
    })
  );
  if (!scores) return { matches: matches, semantic: false };
  var updated = matches.slice();
  eligible.forEach(function (e, k) {
    var s = scores[k];
    if (typeof s !== 'number') return;
    var m = updated[e.index];
    var decision = decideTier(m.aktsPass, { total: s, contentScore: s, noContent: false });
    updated[e.index] = Object.assign({}, m, {
      contentScore: s,
      detailContentScore: s,
      matched: decision.matched,
      tier: decision.tier,
      rejectReason: decision.reason,
      scoreMethod: 'semantic',
    });
  });
  return { matches: updated, semantic: true };
}

// ── AI ile içerik kapsam değerlendirmesi ──
// Sözcüksel skor (tf-idf + jaccard + n-gram) SİMETRİK bir benzerlik ölçer:
// "iki metin birbirine benziyor mu". Muafiyetin sorusu ise ASİMETRİKTİR:
// "alınan ders, hedef dersin çıktılarını karşılıyor mu". Farklı sözcüklerle
// yazılmış aynı müfredat ya da yabancı dildeki içerik sözcüksel olarak uzak
// düşer — MATEMATİK I ↔ MATEMATİK I çiftinin %21 çıkması bu yüzdendir.
//
// Sıra: AI → embedding (semantik) → sözcüksel. Her katman bir öncekine
// düşebilir; hiçbiri zorunlu değildir.
async function refineMatchesAI(matches) {
  if (!window.aiBelgeDurumu) return { matches: matches, ai: false };
  var durum = await window.aiBelgeDurumu();
  if (!durum || !durum.configured) return { matches: matches, ai: false };

  var ciftler = [];
  matches.forEach(function (m, i) {
    var a = m.source && (m.source.weeklyContent || m.source.content);
    var b = m.target && (m.target.weeklyContent || m.target.content);
    // İki tarafta da içerik yoksa modele sormanın anlamı yok.
    if (!a && !b) return;
    ciftler.push({
      id: 'c' + i,
      index: i,
      alinan: {
        ad: m.source.name || '',
        kod: m.source.code || '',
        akts: String(m.source.akts || ''),
        icerik: a || '',
      },
      hedef: {
        ad: m.target.name || '',
        kod: m.target.code || '',
        akts: String(m.target.akts || ''),
        icerik: b || '',
      },
    });
  });
  if (ciftler.length === 0) return { matches: matches, ai: false };

  var sonuc = null;
  try {
    sonuc = await window.aiDersEslestir(
      ciftler.map(function (c) {
        return { id: c.id, alinan: c.alinan, hedef: c.hedef };
      })
    );
  } catch (_e) {
    return { matches: matches, ai: false };
  }
  if (!sonuc || !sonuc.data) return { matches: matches, ai: false };

  var updated = matches.slice();
  ciftler.forEach(function (c) {
    var g = sonuc.data[c.id];
    if (!g) return;
    var oran = Math.max(0, Math.min(1, (Number(g.oran) || 0) / 100));
    var m = updated[c.index];
    // Karar AKTS koşuluyla birlikte verilir; AKTS yetersizse AI "muaf" dese
    // bile muafiyet çıkmaz — mevcut decideTier bunu zaten uyguluyor.
    var decision = decideTier(m.aktsPass, { total: oran, contentScore: oran, noContent: false });
    // AI açıkça "red" diyorsa eşiği geçse bile öneriyi incelemeye çek.
    if (g.karar === 'red') {
      decision = { matched: false, tier: 'red', reason: g.gerekce || decision.reason };
    }
    updated[c.index] = Object.assign({}, m, {
      contentScore: oran,
      detailContentScore: oran,
      matched: decision.matched,
      tier: decision.tier,
      rejectReason: decision.reason,
      scoreMethod: 'ai',
      aiKarar: g.karar,
      aiGerekce: g.gerekce || '',
    });
  });
  return { matches: updated, ai: true };
}

// Aday sıralama skoru — SADECE hedef ders seçiminde kullanılır, karara girmez.
// İçerik varsa içerik belirleyicidir; isim/kod yalnızca içeriği olmayan veya
// eşit skorlu adayları ayırt etmek için küçük ağırlıkla eklenir.
function candidateRank(src, tgt, scores) {
  return (
    scores.total +
    courseNameSimilarity(src.name, tgt.name) * 0.05 +
    courseCodeSimilarity(src.code, tgt.code) * 0.05
  );
}

function autoMatchCourses(sourceCourses, targetCourses) {
  var matches = [];
  sourceCourses.forEach(function (src) {
    var bestMatch = null,
      bestRank = -1;
    var bestScores = { total: 0, contentScore: 0, noContent: true };
    var bestAktsPass = false;
    targetCourses.forEach(function (tgt) {
      var aktsPass = aktsCompatible(src.akts, tgt.akts);
      var scores = multiFactorScore(src, tgt);
      var rank = candidateRank(src, tgt, scores);
      var isBetter = (aktsPass && !bestAktsPass) || (aktsPass === bestAktsPass && rank > bestRank);
      if (isBetter) {
        bestRank = rank;
        bestScores = scores;
        bestAktsPass = aktsPass;
        bestMatch = tgt;
      }
    });

    // Karar: yalnızca AKTS kapısı + içerik eşiği (isim/kod karara girmez)
    var decision = decideTier(bestAktsPass, bestScores);

    matches.push({
      source: src,
      target: bestMatch,
      aktsPass: bestAktsPass,
      contentScore: bestScores.total,
      detailContentScore: bestScores.contentScore,
      matched: decision.matched,
      tier: decision.tier,
      rejectReason: decision.reason,
    });
  });
  return matches;
}

// ── Ön-hesaplanmış kurs indeksi: her hedef ders için token vektörleri saklanır ──
// NLP eşleştirme sırasında re-tokenizasyon yapılmaz; %30-50 hız kazancı sağlar
function buildCourseIndex(courses) {
  var index = new Map();
  courses.forEach(function (c) {
    var codeKey = c.code.replace(/[\s*]/g, '').toUpperCase();
    var nameTokens = expandWithSynonyms(tokenizeStemmed(c.name || ''));
    var contentText = c.weeklyContent || c.content || '';
    var contentTokens = contentText ? expandWithSynonyms(tokenizeStemmed(contentText)) : [];
    // TF vektörü önceden hesapla
    var buildTF = function (tokens) {
      var tf = {};
      tokens.forEach(function (t) {
        tf[t] = (tf[t] || 0) + 1;
      });
      return tf;
    };
    index.set(codeKey, {
      course: c,
      nameTokens: nameTokens,
      nameTF: buildTF(nameTokens),
      contentTokens: contentTokens,
      contentTF: buildTF(contentTokens),
    });
  });
  return index;
}

// İndeks tabanlı eşleştirme — targetCourses yerine pre-built index alır
function autoMatchCoursesWithIndex(sourceCourses, courseIndex) {
  // İndeksten flat array oluştur (sıra garantisi için)
  var targetEntries = Array.from(courseIndex.values());
  var matches = [];

  sourceCourses.forEach(function (src) {
    var bestMatch = null,
      bestRank = -1;
    var bestScores = { total: 0, contentScore: 0, noContent: true };
    var bestAktsPass = false;

    // Önce tam kod eşleşmesi dene (O(1)) — aday seçimi için hızlı yol
    var srcCodeKey = (src.code || '').replace(/[\s*]/g, '').toUpperCase();
    var exactEntry = courseIndex.get(srcCodeKey);
    if (exactEntry) {
      bestAktsPass = aktsCompatible(src.akts, exactEntry.course.akts);
      bestScores = multiFactorScore(src, exactEntry.course);
      bestRank = candidateRank(src, exactEntry.course, bestScores);
      bestMatch = exactEntry.course;
    }

    // Tam kod eşleşmesi yoksa veya içerik skoru eşiğin altındaysa tüm indeksi tara
    if (!bestMatch || bestScores.total < CALIBRATION.autoApprove) {
      targetEntries.forEach(function (entry) {
        if (entry === exactEntry) return; // zaten denendi
        var tgt = entry.course;
        var aktsPass = aktsCompatible(src.akts, tgt.akts);
        var scores = multiFactorScore(src, tgt);
        var rank = candidateRank(src, tgt, scores);
        var isBetter =
          (aktsPass && !bestAktsPass) || (aktsPass === bestAktsPass && rank > bestRank);
        if (isBetter) {
          bestRank = rank;
          bestScores = scores;
          bestAktsPass = aktsPass;
          bestMatch = tgt;
        }
      });
    }

    // Karar: yalnızca AKTS kapısı + içerik eşiği (isim/kod karara girmez)
    var decision = decideTier(bestAktsPass, bestScores);
    matches.push({
      source: src,
      target: bestMatch,
      aktsPass: bestAktsPass,
      contentScore: bestScores.total,
      detailContentScore: bestScores.contentScore,
      matched: decision.matched,
      tier: decision.tier,
      rejectReason: decision.reason,
    });
  });
  return matches;
}

// ÇAKÜ ders kataloğunu JSON olarak dışa aktar
function exportCourseContentsJSON(courses, department) {
  var payload = JSON.stringify(
    {
      version: '1.0',
      updatedAt: new Date().toISOString(),
      department: department || 'Bilgisayar Mühendisliği',
      courseCount: courses.length,
      courses: courses.map(function (c) {
        return {
          code: c.code,
          name: c.name,
          akts: c.akts,
          status: c.status || '',
          content: c.content || '',
          weeklyContent: c.weeklyContent || '',
        };
      }),
    },
    null,
    2
  );
  var blob = new Blob([payload], { type: 'application/json' });
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url;
  a.download = 'caku_ders_katalog.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ══════════════════════════════════════════════════════════════
// FIREBASE CRUD
// ══════════════════════════════════════════════════════════════

var MuafiyetDB = {
  async saveCourseContents(contents) {
    await window.DBWrite.set('muafiyet_settings', 'course_contents', {
      courses: contents,
      updatedAt: new Date().toISOString(),
    });
  },
  async fetchCourseContents() {
    try {
      var result = await window.apiReadDoc('muafiyet_settings', 'course_contents');
      return result.exists ? result.data.courses || [] : [];
    } catch (e) {
      return [];
    }
  },
  async saveGradingSystem(system) {
    await window.DBWrite.set('muafiyet_settings', 'grading_system', {
      grades: system,
      updatedAt: new Date().toISOString(),
    });
  },
  async fetchGradingSystem() {
    try {
      var result = await window.apiReadDoc('muafiyet_settings', 'grading_system');
      return result.exists ? result.data.grades || null : null;
    } catch (e) {
      return null;
    }
  },
  async saveThresholds(t) {
    await window.DBWrite.set('muafiyet_settings', 'thresholds', {
      autoApprove: t.autoApprove,
      review: t.review,
      updatedAt: new Date().toISOString(),
      updatedBy: t.updatedBy || '',
    });
    if (window.audit)
      window.audit('muafiyet_thresholds_update', 'muafiyet_settings', 'thresholds', {
        meta: { autoApprove: t.autoApprove, review: t.review },
      });
  },
  async fetchThresholds() {
    try {
      var result = await window.apiReadDoc('muafiyet_settings', 'thresholds');
      return result.exists ? result.data : null;
    } catch (e) {
      return null;
    }
  },
  async saveRecord(record) {
    var id = record.id;
    var data = Object.assign({}, record);
    delete data.id;
    if (id) {
      await window.DBWrite.update(
        'muafiyet_records',
        String(id),
        Object.assign({}, data, { updatedAt: new Date().toISOString() })
      );
      return record;
    } else {
      var result = await window.DBWrite.add(
        'muafiyet_records',
        Object.assign({}, data, { createdAt: new Date().toISOString() })
      );
      return Object.assign({}, record, { id: result.id });
    }
  },
  async fetchRecords() {
    try {
      var docs = await window.apiRead('muafiyet_records', { orderBy: 'createdAt:desc' });
      return docs;
    } catch (e) {
      return [];
    }
  },
  async deleteRecord(id) {
    await window.DBWrite.remove('muafiyet_records', String(id));
    if (window.audit) window.audit('muafiyet_record_delete', 'muafiyet_records', String(id), {});
  },

  // Yaz intibakı faz geçişi: stage değiştir + stageHistory'e kim-ne-zaman
  // ekle + ek alanlar (başarı belgesi, not-dönüşüm linki, çevrilen notlar) +
  // denetim kaydı. Faz akışı: on_inceleme → on_onay/on_red → belge_teslim →
  // tamamlandi.
  async setStage(recordId, newStage, actor, extra) {
    var result = await window.apiReadDoc('muafiyet_records', String(recordId));
    if (!result.exists) throw new Error('Kayıt bulunamadı');
    var data = result.data;
    var history = (data.stageHistory || []).slice();
    var from = data.stage || '';
    history.push({
      from: from,
      to: newStage,
      by: (actor && (actor.name || actor.identifier)) || '',
      at: new Date().toISOString(),
    });
    var patch = Object.assign({}, extra || {}, {
      stage: newStage,
      stageHistory: history,
      updatedAt: new Date().toISOString(),
    });
    await window.DBWrite.update('muafiyet_records', String(recordId), patch);
    if (window.audit)
      window.audit('muafiyet_stage', 'muafiyet_records', String(recordId), {
        meta: { from: from, to: newStage },
      });
    return Object.assign({}, data, patch, { id: recordId });
  },

  // Akademisyen onayı: tek bir match'in kararını günceller
  // decision: "confirmed" (muaf) | "rejected" (red)
  // ONAYDA: eşleştirme muafiyet_history koleksiyonuna yazılır (Erasmus
  // trip_history'den BAĞIMSIZ ayrı geçmiş). sigKey unique indeksi aynı
  // eşleştirmenin ikinci kez yazılmasını engeller.
  async updateMatchDecision(recordId, matchIndex, decision, adminNote, approvedBy) {
    var result = await window.apiReadDoc('muafiyet_records', String(recordId));
    if (!result.exists) throw new Error('Kayıt bulunamadı');
    var data = result.data;
    var matches = (data.matches || []).slice();
    if (!matches[matchIndex]) throw new Error('Eşleşme bulunamadı');
    matches[matchIndex] = Object.assign({}, matches[matchIndex], {
      adminDecision: decision,
      adminNote: adminNote || '',
      adminDecidedBy: approvedBy || '',
      adminUpdatedAt: new Date().toISOString(),
    });
    var pendingLeft = matches.filter(function (m) {
      return m.tier === 'review' && !m.adminDecision;
    }).length;
    await window.DBWrite.update('muafiyet_records', String(recordId), {
      matches: matches,
      pendingReviewCount: pendingLeft,
      updatedAt: new Date().toISOString(),
    });

    // Onaylanan eşleştirmeyi geçmişe işle — iki kayıt şekli de desteklenir:
    // öğrenci formu (sourceCourse/localCourse) ve eski sihirbaz (source/target)
    if (decision === 'confirmed') {
      var m = matches[matchIndex];
      var src = m.sourceCourse || m.source || {};
      var cak = m.localCourse || m.target || {};
      var entry = {
        sigKey:
          (data.studentNo || '') +
          '|' +
          (src.code || src.name || '') +
          '|' +
          (cak.code || cak.name || ''),
        studentName: data.studentName || '',
        studentNo: data.studentNo || '',
        departmentId: data.departmentId || '',
        localDept: data.localDept || '',
        basvuruTuru: data.basvuruTuru || 'muafiyet',
        sourceUniversity: data.otherUni || '',
        sourceFaculty: data.otherFaculty || '',
        sourceDept: data.otherDept || '',
        sourceCourse: { code: src.code || '', name: src.name || '', akts: src.akts || '' },
        cakuCourse: { code: cak.code || '', name: cak.name || '', akts: cak.akts || '' },
        score: typeof m.score === 'number' ? m.score : m.contentScore || 0,
        aktsPass: m.aktsPass !== false,
        approvedBy: approvedBy || '',
        approvedAt: new Date().toISOString(),
        recordId: String(recordId),
      };
      try {
        await window.DBWrite.add('muafiyet_history', entry);
      } catch (e) {
        // sigKey unique ihlali = zaten geçmişte var; sessizce geç
        if (!/duplicate|E11000/i.test(e.message || '')) throw e;
      }
    }

    if (window.audit)
      window.audit(
        decision === 'confirmed' ? 'muafiyet_approve' : 'muafiyet_reject',
        'muafiyet_records',
        String(recordId),
        { meta: { matchIndex: matchIndex, decision: decision, note: adminNote || '' } }
      );
    return matches;
  },

  async fetchMuafiyetHistory() {
    try {
      return await window.apiRead('muafiyet_history', { orderBy: 'approvedAt:desc' });
    } catch (e) {
      return [];
    }
  },
};

// ══════════════════════════════════════════════════════════════
// WORD ÇIKTISI
// ══════════════════════════════════════════════════════════════

function exportMuafiyetWord(record) {
  var studentName = record.studentName || 'xxxxx XXXXX';
  var studentNo = record.studentNo || 'xxxxx';
  var otherUni = record.otherUniversity || record.otherUni || 'xxxxx Üniversitesi';
  var otherFaculty = record.otherFaculty || 'xxxxx Fakültesi';
  var otherDept = record.otherDepartment || record.otherDept || 'xxxxx Mühendisliği';
  var matches = record.matches || [];
  var dataRows = '';
  var totalAktsSource = 0;
  var totalAktsTarget = 0;
  var rowCount = Math.max(matches.length, 8);
  for (var i = 0; i < rowCount; i++) {
    var m = matches[i] || {};
    // İki kayıt şekli: eski sihirbaz (source/target) + öğrenci formu (sourceCourse/localCourse)
    var src = m.source || m.sourceCourse || {};
    var tgt = m.target || m.localCourse || {};
    if (src.akts) totalAktsSource += parseInt(src.akts) || 0;
    if (tgt.akts) totalAktsTarget += parseInt(tgt.akts) || 0;
    dataRows +=
      '<tr>' +
      '<td style="border:1px solid black;padding:4px 6px;text-align:center;font-size:11pt;">' +
      (src.code || '') +
      '</td>' +
      '<td style="border:1px solid black;padding:4px 6px;text-align:center;font-size:11pt;">' +
      (src.name || '') +
      '</td>' +
      '<td style="border:1px solid black;padding:4px 6px;text-align:center;font-size:11pt;">' +
      (src.akts || '') +
      '</td>' +
      '<td style="border:1px solid black;padding:4px 6px;text-align:center;font-size:11pt;">' +
      (src.grade || '') +
      '</td>' +
      '<td style="border:1px solid black;padding:4px 6px;text-align:center;font-size:11pt;">' +
      (tgt.code || '') +
      '</td>' +
      '<td style="border:1px solid black;padding:4px 6px;text-align:center;font-size:11pt;">' +
      (tgt.name || '') +
      '</td>' +
      '<td style="border:1px solid black;padding:4px 6px;text-align:center;font-size:11pt;">' +
      (tgt.akts || '') +
      '</td>' +
      '<td style="border:1px solid black;padding:4px 6px;text-align:center;font-size:11pt;">' +
      (m.convertedGrade || '') +
      '</td>' +
      '<td style="border:1px solid black;padding:4px 6px;text-align:center;font-size:11pt;">' +
      (tgt.status || tgt.type || '') +
      '</td>' +
      '</tr>';
  }
  var localDept = record.localDepartment || 'Bilgisayar';
  var html =
    '\uFEFF<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="utf-8"><style>body{font-family:"Times New Roman",Times,serif;font-size:12pt;}table{border-collapse:collapse;width:100%;table-layout:fixed;}td,th{border:1px solid black;padding:4px;font-family:"Times New Roman",Times,serif;}</style></head><body>' +
    '<p style="font-family:Times New Roman;font-size:12pt;text-align:justify;line-height:1.5;margin-bottom:12pt;">Bölümümüz <b>' +
    studentNo +
    '</b> numaralı öğrencisi <b>' +
    studentName +
    "'nun</b>, ders muafiyet talebi hakkında vermiş olduğu dilekçesi incelenmiş olup, <b>Çankırı Karatekin Üniversitesi Önlisans ve Lisans Eğitim Öğretim Yönetmeliğinin 12. maddesi</b> uyarınca aşağıda tabloda verildiği gibi uygun olduğuna ve gereği için Fakültemiz ilgili kurullarında görüşülmek üzere Dekanlık Makamına sunulmasına,</p>" +
    '<table><tr><td colspan="4" style="border:1px solid black;padding:6px;text-align:center;font-weight:bold;font-size:11pt;"><u>' +
    otherUni +
    ' ' +
    otherFaculty +
    ' ' +
    otherDept +
    '<br/>Bölümünden Aldığı Dersin</u></td><td colspan="5" style="border:1px solid black;padding:6px;text-align:center;font-weight:bold;font-size:11pt;"><u>Çankırı Karatekin Üniversitesi Mühendislik Fakültesi ' +
    localDept +
    '<br/>Mühendisliği Bölümünde Muaf Olacağı Dersin</u></td></tr>' +
    '<tr><td style="width:10%;border:1px solid black;padding:4px;text-align:center;font-weight:bold;font-size:11pt;">Kodu</td><td style="width:25%;border:1px solid black;padding:4px;text-align:center;font-weight:bold;font-size:11pt;">Adı</td><td style="width:6%;border:1px solid black;padding:4px;text-align:center;font-weight:bold;font-size:11pt;">AKTS</td><td style="width:7%;border:1px solid black;padding:4px;text-align:center;font-weight:bold;font-size:11pt;">Başarı<br/>Notu</td><td style="width:10%;border:1px solid black;padding:4px;text-align:center;font-weight:bold;font-size:11pt;">Kodu</td><td style="width:25%;border:1px solid black;padding:4px;text-align:center;font-weight:bold;font-size:11pt;">Adı</td><td style="width:6%;border:1px solid black;padding:4px;text-align:center;font-weight:bold;font-size:11pt;">AKTS</td><td style="width:7%;border:1px solid black;padding:4px;text-align:center;font-weight:bold;font-size:11pt;">Başarı<br/>Notu</td><td style="width:10%;border:1px solid black;padding:4px;text-align:center;font-weight:bold;font-size:11pt;">Statüsü</td></tr>' +
    dataRows +
    '<tr><td style="border:1px solid black;"></td><td style="border:1px solid black;text-align:center;font-weight:bold;"><u>Toplam</u></td><td style="border:1px solid black;text-align:center;font-weight:bold;">' +
    (totalAktsSource || 'X') +
    '</td><td style="border:1px solid black;"></td><td style="border:1px solid black;"></td><td style="border:1px solid black;text-align:center;font-weight:bold;"><u>Toplam</u></td><td style="border:1px solid black;text-align:center;font-weight:bold;">' +
    (totalAktsTarget || 'X') +
    '</td><td style="border:1px solid black;"></td><td style="border:1px solid black;"></td></tr></table></body></html>';
  var blob = new Blob([html], { type: 'application/msword;charset=utf-8' });
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url;
  a.download = 'Ders_Muafiyet_' + studentNo + '.doc';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ══════════════════════════════════════════════════════════════
// TASARIM SİSTEMİ
// ══════════════════════════════════════════════════════════════

const DS = {
  // Renkler — Material 3 esintili lacivert + teal palet
  navy: '#00236f', // primary
  navyLight: '#1e3a8a', // primary-container
  accent: '#1e3a8a', // etkileşim (buton/sekme)
  accentLight: '#dce1ff', // focus/hafif
  tertiary: '#00658a', // teal (intibak)
  tertiaryLight: '#c9e6ff',
  tertiaryText: '#004c6e',
  green: '#059669',
  greenLight: '#D1FAE5',
  greenBg: '#ECFDF5',
  amber: '#B45309',
  amberLight: '#FEF3C7',
  red: '#ba1a1a',
  redLight: '#ffdad6',
  text: '#191c1e', // on-surface
  textSecondary: '#444651', // on-surface-variant
  textMuted: '#757682', // outline
  bg: '#f7f9fb', // surface
  bgCard: '#FFFFFF',
  surfaceContainer: '#eceef0',
  surfaceHigh: '#e6e8ea',
  border: '#c5c5d3', // outline-variant
  borderLight: '#e0e3e5',
  shadow: '0 1px 3px rgba(30,58,138,0.06), 0 1px 2px rgba(30,58,138,0.05)',
  shadowMd: '0 4px 12px rgba(30,58,138,0.08)',
  shadowLg: '0 10px 24px rgba(30,58,138,0.10)',
  radius: 12,
  radiusSm: 8,
  // tipografi
  fontHead: "'Manrope', 'Inter', sans-serif",
  fontBody: "'Inter', sans-serif",
};

// ══════════════════════════════════════════════════════════════
// UI BİLEŞENLERİ
// ══════════════════════════════════════════════════════════════

// ── SVG İkonlar ──
const Icons = {
  upload: () => (
    <svg
      width="28"
      height="28"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  ),
  check: () => (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  ),
  file: () => (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
    </svg>
  ),
  trash: () => (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  ),
  download: () => (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  ),
  arrow: () => (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke={DS.accent}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  ),
  search: () => (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  ),
  sparkle: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
    </svg>
  ),
  info: () => (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="16" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
  ),
  user: () => (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  ),
  settings: () => (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  ),
  layers: () => (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polygon points="12 2 2 7 12 12 22 7 12 2" />
      <polyline points="2 17 12 22 22 17" />
      <polyline points="2 12 12 17 22 12" />
    </svg>
  ),
  document: () => (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  ),
  fileText: () => (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
    </svg>
  ),
  listCheck: () => (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="10" y1="6" x2="21" y2="6" />
      <line x1="10" y1="12" x2="21" y2="12" />
      <line x1="10" y1="18" x2="21" y2="18" />
      <polyline points="3 6 4 7 6 5" />
      <polyline points="3 12 4 13 6 11" />
      <polyline points="3 18 4 19 6 17" />
    </svg>
  ),
  barChart: () => (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
      <line x1="2" y1="20" x2="22" y2="20" />
    </svg>
  ),
};

// ── Skor Badge ──
const ScoreBadge = ({ value, size, label }) => {
  var pct = Math.round(value * 100);
  var color = pct >= 80 ? DS.green : pct >= 60 ? DS.amber : DS.red;
  var bgColor = pct >= 80 ? DS.greenLight : pct >= 60 ? DS.amberLight : DS.redLight;
  var sz = size === 'lg' ? 42 : size === 'sm' ? 26 : 34;
  var fs = size === 'lg' ? 13 : size === 'sm' ? 9 : 11;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
      <div
        style={{
          width: sz,
          height: sz,
          borderRadius: '50%',
          background: bgColor,
          border: '2px solid ' + color,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: fs,
          fontWeight: 700,
          color: color,
          fontFamily: "'JetBrains Mono', monospace",
        }}
      >
        {pct}
      </div>
      {label && <span style={{ fontSize: 9, color: DS.textMuted, fontWeight: 500 }}>{label}</span>}
    </div>
  );
};

// ── Status Pill ──
// tier: "approved" | "review" | "rejected"  (yoksa matched boolean'a düşer)
const StatusPill = ({ matched, reason, tier }) => {
  var resolvedTier = tier || (matched ? 'approved' : 'rejected');

  if (resolvedTier === 'approved') {
    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
          padding: '4px 12px',
          borderRadius: 20,
          background: 'linear-gradient(135deg, #059669, #10B981)',
          color: 'white',
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: '0.5px',
        }}
      >
        <Icons.check /> MUAF
      </span>
    );
  }

  if (resolvedTier === 'review') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            padding: '4px 10px',
            borderRadius: 20,
            background: DS.amberLight,
            color: DS.amber,
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.5px',
            border: '1px solid #FCD34D',
          }}
        >
          ⏳ İNCELEME
        </span>
        {reason && (
          <span style={{ fontSize: 9, color: DS.amber, maxWidth: 110, textAlign: 'center' }}>
            {reason}
          </span>
        )}
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
          padding: '4px 10px',
          borderRadius: 20,
          background: DS.redLight,
          color: DS.red,
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: '0.5px',
        }}
      >
        RED
      </span>
      {reason && (
        <span style={{ fontSize: 9, color: DS.red, maxWidth: 100, textAlign: 'center' }}>
          {reason}
        </span>
      )}
    </div>
  );
};

// ── Toast / Bildirim ──
const Toast = ({ message, type, onClose }) => {
  if (!message) return null;
  var isError = type === 'error';
  var bg = isError
    ? 'linear-gradient(135deg, #FEE2E2, #FECACA)'
    : 'linear-gradient(135deg, #D1FAE5, #A7F3D0)';
  var color = isError ? '#991B1B' : '#065F46';
  var borderColor = isError ? '#FECACA' : '#6EE7B7';
  return (
    <div
      style={{
        padding: '12px 20px',
        borderRadius: DS.radiusSm,
        marginBottom: 16,
        background: bg,
        color: color,
        fontSize: 13,
        fontWeight: 500,
        border: '1px solid ' + borderColor,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        animation: 'fadeInUp 0.3s ease-out',
      }}
    >
      <span>{message}</span>
      {onClose && (
        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            color: color,
            cursor: 'pointer',
            fontSize: 16,
            fontWeight: 700,
            padding: '0 0 0 12px',
          }}
        >
          &times;
        </button>
      )}
    </div>
  );
};

// ── Dosya Sürükle-Bırak Alanı (Yeniden Tasarlanmış) ──
const FileDropZone = ({ label, description, accept, onFile, fileName, loading, compact }) => {
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef(null);

  const handleDrop = useCallback(
    function (e) {
      e.preventDefault();
      setDragOver(false);
      if (e.dataTransfer.files.length > 0) onFile(e.dataTransfer.files[0]);
    },
    [onFile]
  );

  var isLoaded = !!fileName;
  var height = compact ? 80 : 120;

  return (
    <div
      onDrop={handleDrop}
      onDragOver={function (e) {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={function () {
        setDragOver(false);
      }}
      onClick={function () {
        inputRef.current && inputRef.current.click();
      }}
      style={{
        border: '2px dashed ' + (dragOver ? DS.accent : isLoaded ? DS.green : DS.border),
        borderRadius: DS.radius,
        padding: compact ? '12px 16px' : '20px 24px',
        textAlign: 'center',
        cursor: 'pointer',
        background: dragOver ? DS.accentLight : isLoaded ? DS.greenBg : 'white',
        transition: 'all 0.25s ease',
        minHeight: height,
        display: 'flex',
        flexDirection: compact ? 'row' : 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: compact ? 12 : 8,
        position: 'relative',
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept || '.pdf,.docx,.doc,.xlsx,.xls,.csv'}
        style={{ display: 'none' }}
        onChange={function (e) {
          if (e.target.files[0]) onFile(e.target.files[0]);
        }}
      />
      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              width: 20,
              height: 20,
              borderRadius: '50%',
              border: '2px solid ' + DS.accentLight,
              borderTopColor: DS.accent,
              animation: 'spin 0.8s linear infinite',
            }}
          />
          <span style={{ color: DS.accent, fontWeight: 600, fontSize: 13 }}>Dosya okunuyor...</span>
        </div>
      ) : isLoaded ? (
        <>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              background: DS.green,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              flexShrink: 0,
            }}
          >
            <Icons.check />
          </div>
          <div style={{ textAlign: compact ? 'left' : 'center' }}>
            <div style={{ fontWeight: 600, color: DS.green, fontSize: 13 }}>{fileName}</div>
            <div style={{ fontSize: 11, color: DS.textMuted, marginTop: 2 }}>
              Değiştirmek için tıklayın
            </div>
          </div>
        </>
      ) : (
        <>
          <div style={{ color: DS.textMuted }}>
            <Icons.upload />
          </div>
          <div>
            <div style={{ fontWeight: 600, color: DS.text, fontSize: 14 }}>{label}</div>
            {description && (
              <div style={{ fontSize: 11, color: DS.textMuted, marginTop: 4, lineHeight: 1.4 }}>
                {description}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

// ── Çoklu Dosya Yükleme Alanı (PDF, maks 25) ──
const MultiFileDropZone = ({ label, description, accept, onFiles, files, loading, maxFiles }) => {
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef(null);
  var max = maxFiles || 25;

  const handleDrop = useCallback(
    function (e) {
      e.preventDefault();
      setDragOver(false);
      if (e.dataTransfer.files.length > 0) {
        var arr = Array.from(e.dataTransfer.files).slice(0, max);
        onFiles(arr);
      }
    },
    [onFiles, max]
  );

  const handleChange = function (e) {
    if (e.target.files.length > 0) {
      var arr = Array.from(e.target.files).slice(0, max);
      onFiles(arr);
    }
  };

  var isLoaded = files && files.length > 0;

  return (
    <div>
      <div
        onDrop={handleDrop}
        onDragOver={function (e) {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={function () {
          setDragOver(false);
        }}
        onClick={function () {
          inputRef.current && inputRef.current.click();
        }}
        style={{
          border: '2px dashed ' + (dragOver ? DS.accent : isLoaded ? DS.green : DS.border),
          borderRadius: DS.radius,
          padding: '20px 24px',
          textAlign: 'center',
          cursor: 'pointer',
          background: dragOver ? DS.accentLight : isLoaded ? DS.greenBg : 'white',
          transition: 'all 0.25s ease',
          minHeight: 100,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept || '.pdf'}
          multiple
          style={{ display: 'none' }}
          onChange={handleChange}
        />
        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 20,
                height: 20,
                borderRadius: '50%',
                border: '2px solid ' + DS.accentLight,
                borderTopColor: DS.accent,
                animation: 'spin 0.8s linear infinite',
              }}
            />
            <span style={{ color: DS.accent, fontWeight: 600, fontSize: 13 }}>
              Dosyalar okunuyor...
            </span>
          </div>
        ) : isLoaded ? (
          <>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                background: DS.green,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                flexShrink: 0,
              }}
            >
              <Icons.check />
            </div>
            <div>
              <div style={{ fontWeight: 600, color: DS.green, fontSize: 13 }}>
                {files.length} dosya yüklendi
              </div>
              <div style={{ fontSize: 11, color: DS.textMuted, marginTop: 2 }}>
                Değiştirmek için tıklayın veya sürükleyin
              </div>
            </div>
          </>
        ) : (
          <>
            <div style={{ color: DS.textMuted }}>
              <Icons.upload />
            </div>
            <div>
              <div style={{ fontWeight: 600, color: DS.text, fontSize: 14 }}>{label}</div>
              {description && (
                <div style={{ fontSize: 11, color: DS.textMuted, marginTop: 4, lineHeight: 1.4 }}>
                  {description}
                </div>
              )}
              <div style={{ fontSize: 11, color: DS.accent, marginTop: 4 }}>Maks. {max} dosya</div>
            </div>
          </>
        )}
      </div>
      {/* Yüklenen dosya listesi */}
      {isLoaded && (
        <div style={{ marginTop: 10, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {files.map(function (f, i) {
            return (
              <div
                key={i}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                  padding: '4px 10px',
                  borderRadius: 20,
                  background: DS.bg,
                  border: '1px solid ' + DS.border,
                  fontSize: 11,
                  color: DS.text,
                }}
              >
                <span style={{ color: DS.accent, fontWeight: 700, fontSize: 10 }}>PDF</span>
                <span>{f.name}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ── Adım Göstergesi ──
const StepIndicator = ({ steps, currentStep }) => {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 28 }}>
      {steps.map(function (step, i) {
        var isActive = i === currentStep;
        var isCompleted = i < currentStep;
        var isLast = i === steps.length - 1;
        return (
          <React.Fragment key={i}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  background: isCompleted ? DS.green : isActive ? DS.accent : DS.borderLight,
                  color: isCompleted || isActive ? 'white' : DS.textMuted,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 13,
                  fontWeight: 700,
                  transition: 'all 0.3s ease',
                  boxShadow: isActive ? '0 0 0 4px ' + DS.accentLight : 'none',
                }}
              >
                {isCompleted ? <Icons.check /> : i + 1}
              </div>
              <span
                style={{
                  fontSize: 13,
                  fontWeight: isActive ? 700 : 500,
                  color: isActive ? DS.text : isCompleted ? DS.green : DS.textMuted,
                  transition: 'all 0.3s',
                  whiteSpace: 'nowrap',
                }}
              >
                {step}
              </span>
            </div>
            {!isLast && (
              <div
                style={{
                  flex: 1,
                  height: 2,
                  margin: '0 12px',
                  background: isCompleted ? DS.green : DS.borderLight,
                  borderRadius: 1,
                  minWidth: 32,
                  transition: 'background 0.3s',
                }}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};

// ── Section Card ──
const SectionCard = ({
  title,
  subtitle,
  icon,
  children,
  actions,
  collapsed,
  onToggle,
  headerRight,
}) => {
  return (
    <div
      style={{
        background: DS.bgCard,
        borderRadius: DS.radius,
        border: '1px solid ' + DS.border,
        boxShadow: DS.shadow,
        marginBottom: 20,
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          padding: '16px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: collapsed ? 'none' : '1px solid ' + DS.borderLight,
          cursor: onToggle ? 'pointer' : 'default',
        }}
        onClick={onToggle}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {icon && <span style={{ color: DS.accent }}>{icon}</span>}
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: DS.navy }}>{title}</div>
            {subtitle && (
              <div style={{ fontSize: 12, color: DS.textSecondary, marginTop: 2 }}>{subtitle}</div>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {headerRight}
          {actions}
        </div>
      </div>
      {!collapsed && <div style={{ padding: 20 }}>{children}</div>}
    </div>
  );
};

// ── Buton ──
const Button = ({ children, onClick, variant, disabled, small, icon, style: customStyle }) => {
  var base = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: small ? '6px 14px' : '10px 20px',
    borderRadius: DS.radiusSm,
    fontSize: small ? 12 : 13,
    fontWeight: 600,
    cursor: disabled ? 'not-allowed' : 'pointer',
    border: 'none',
    transition: 'all 0.2s ease',
    opacity: disabled ? 0.5 : 1,
    fontFamily: "'Source Sans 3', sans-serif",
  };
  var variants = {
    primary: { background: DS.accent, color: 'white' },
    success: { background: DS.green, color: 'white' },
    danger: { background: 'transparent', color: DS.red, border: '1px solid ' + DS.redLight },
    ghost: { background: DS.borderLight, color: DS.textSecondary },
    navy: { background: DS.navy, color: 'white' },
  };
  var vStyle = variants[variant || 'primary'] || variants.primary;
  return (
    <button
      onClick={disabled ? undefined : onClick}
      style={Object.assign({}, base, vStyle, customStyle || {})}
    >
      {icon}
      {children}
    </button>
  );
};

// ══════════════════════════════════════════════════════════════
// AYARLAR PANELİ
// ══════════════════════════════════════════════════════════════

const SettingsPanel = ({ courseContents, setCourseContents, gradingSystem, setGradingSystem }) => {
  const [loadingCourse, setLoadingCourse] = useState(false);
  const [loadingGrade, setLoadingGrade] = useState(false);
  const [courseFileName, setCourseFileName] = useState('');
  const [gradeFileName, setGradeFileName] = useState('');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);

  const handleCourseFile = async function (file) {
    setLoadingCourse(true);
    setMsg(null);
    try {
      var result = await extractFromFile(file);
      var courses =
        result.type === 'table'
          ? parseCoursesFromTable(result.data)
          : parseCoursesFromText(result.data);
      if (courses.length === 0) {
        setMsg({ text: 'Ders bilgisi bulunamadı. Dosya formatını kontrol edin.', type: 'error' });
      } else {
        setCourseContents(courses);
        setCourseFileName(file.name);
        setMsg({ text: courses.length + ' ders içeriği başarıyla yüklendi.', type: 'success' });
      }
    } catch (err) {
      setMsg({ text: 'Dosya okunurken hata: ' + err.message, type: 'error' });
    }
    setLoadingCourse(false);
  };

  const handleGradeFile = async function (file) {
    setLoadingGrade(true);
    setMsg(null);
    try {
      var result = await extractFromFile(file);
      var grades = [];
      if (result.type === 'table') {
        var sheet = result.data[0];
        if (sheet && sheet.rows.length > 1) {
          for (var r = 1; r < sheet.rows.length; r++) {
            var row = sheet.rows[r];
            if (row[0] && row[1])
              grades.push({ input: String(row[0]).trim(), output: String(row[1]).trim() });
          }
        }
      }
      if (grades.length === 0) {
        setMsg({
          text: 'Not tablosu bulunamadı. İlk sütun: giriş, ikinci sütun: ÇAKÜ notu olmalı.',
          type: 'error',
        });
      } else {
        setGradingSystem(grades);
        setGradeFileName(file.name);
        setMsg({ text: grades.length + ' not dönüşüm kuralı yüklendi.', type: 'success' });
      }
    } catch (err) {
      setMsg({ text: 'Dosya okunurken hata: ' + err.message, type: 'error' });
    }
    setLoadingGrade(false);
  };

  const handleSave = async function () {
    setSaving(true);
    setMsg(null);
    try {
      if (courseContents.length > 0) await MuafiyetDB.saveCourseContents(courseContents);
      if (gradingSystem && gradingSystem.length > 0)
        await MuafiyetDB.saveGradingSystem(gradingSystem);
      setMsg({ text: 'Ayarlar veritabanına kaydedildi.', type: 'success' });
    } catch (err) {
      setMsg({ text: 'Kaydetme hatası: ' + err.message, type: 'error' });
    }
    setSaving(false);
  };

  return (
    <div>
      {msg && (
        <Toast
          message={msg.text}
          type={msg.type}
          onClose={function () {
            setMsg(null);
          }}
        />
      )}

      <div
        className="responsive-grid-2"
        style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}
      >
        {/* ÇAKÜ Ders İçerikleri */}
        <SectionCard
          title="ÇAKÜ Ders İçerikleri"
          subtitle="Ders bilgilerini yükleyin (kod, ad, AKTS, haftalık içerik)"
          icon={<Icons.file />}
          headerRight={
            courseContents.length > 0 && (
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: DS.green,
                  background: DS.greenLight,
                  padding: '3px 10px',
                  borderRadius: 20,
                }}
              >
                {courseContents.length} ders
              </span>
            )
          }
        >
          <FileDropZone
            label="ÇAKÜ Ders İçerikleri"
            description="Excel veya PDF/Word formatı"
            onFile={handleCourseFile}
            fileName={courseFileName}
            loading={loadingCourse}
          />
          {courseContents.length > 0 && (
            <>
              <div style={{ marginTop: 12, display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  onClick={function () {
                    exportCourseContentsJSON(courseContents);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '6px 14px',
                    borderRadius: DS.radiusSm,
                    border: '1px solid ' + DS.border,
                    background: DS.bg,
                    fontSize: 12,
                    fontWeight: 600,
                    color: DS.accent,
                    cursor: 'pointer',
                  }}
                >
                  <Icons.download /> JSON İndir
                </button>
              </div>
              <div
                className="responsive-table-wrap"
                style={{
                  marginTop: 10,
                  maxHeight: 280,
                  overflowY: 'auto',
                  border: '1px solid ' + DS.border,
                  borderRadius: DS.radiusSm,
                }}
              >
                <table
                  style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, minWidth: 500 }}
                >
                  <thead>
                    <tr style={{ background: DS.bg, position: 'sticky', top: 0 }}>
                      <th
                        style={{
                          padding: '8px 10px',
                          textAlign: 'left',
                          borderBottom: '2px solid ' + DS.border,
                          fontWeight: 700,
                          color: DS.navy,
                        }}
                      >
                        Kod
                      </th>
                      <th
                        style={{
                          padding: '8px 10px',
                          textAlign: 'left',
                          borderBottom: '2px solid ' + DS.border,
                          fontWeight: 700,
                          color: DS.navy,
                        }}
                      >
                        Ad
                      </th>
                      <th
                        style={{
                          padding: '8px 10px',
                          textAlign: 'center',
                          borderBottom: '2px solid ' + DS.border,
                          fontWeight: 700,
                          color: DS.navy,
                        }}
                      >
                        AKTS
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {courseContents.map(function (c, i) {
                      return (
                        <tr key={i} style={{ borderBottom: '1px solid ' + DS.borderLight }}>
                          <td
                            style={{
                              padding: '6px 10px',
                              fontWeight: 600,
                              color: DS.accent,
                              fontFamily: "'JetBrains Mono', monospace",
                              fontSize: 11,
                            }}
                          >
                            {c.code}
                          </td>
                          <td style={{ padding: '6px 10px', color: DS.text }}>{c.name}</td>
                          <td style={{ padding: '6px 10px', textAlign: 'center', fontWeight: 600 }}>
                            {c.akts}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </SectionCard>

        {/* Not Sistemi */}
        <SectionCard
          title="Not Dönüşüm Tablosu"
          subtitle="Özel not sistemi (opsiyonel)"
          icon={<Icons.sparkle />}
          headerRight={
            gradingSystem &&
            gradingSystem.length > 0 && (
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: DS.green,
                  background: DS.greenLight,
                  padding: '3px 10px',
                  borderRadius: 20,
                }}
              >
                {gradingSystem.length} kural
              </span>
            )
          }
        >
          <FileDropZone
            label="Not Tablosu Yükle"
            description="Excel: Sütun 1 = giriş, Sütun 2 = ÇAKÜ notu"
            onFile={handleGradeFile}
            fileName={gradeFileName}
            loading={loadingGrade}
          />
          {gradingSystem && gradingSystem.length > 0 && (
            <div
              className="responsive-table-wrap"
              style={{
                marginTop: 16,
                maxHeight: 200,
                overflowY: 'auto',
                border: '1px solid ' + DS.border,
                borderRadius: DS.radiusSm,
              }}
            >
              <table
                style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, minWidth: 400 }}
              >
                <thead>
                  <tr style={{ background: DS.bg, position: 'sticky', top: 0 }}>
                    <th
                      style={{
                        padding: '8px 10px',
                        textAlign: 'center',
                        borderBottom: '2px solid ' + DS.border,
                        fontWeight: 700,
                      }}
                    >
                      Giriş
                    </th>
                    <th
                      style={{
                        padding: '8px 10px',
                        textAlign: 'center',
                        borderBottom: '2px solid ' + DS.border,
                        fontWeight: 700,
                      }}
                    >
                      ÇAKÜ
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {gradingSystem.map(function (g, i) {
                    return (
                      <tr key={i} style={{ borderBottom: '1px solid ' + DS.borderLight }}>
                        <td style={{ padding: '6px 10px', textAlign: 'center', fontWeight: 600 }}>
                          {g.input}
                        </td>
                        <td
                          style={{
                            padding: '6px 10px',
                            textAlign: 'center',
                            fontWeight: 600,
                            color: DS.green,
                          }}
                        >
                          {g.output}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          <div
            style={{
              marginTop: 14,
              padding: '10px 14px',
              background: DS.bg,
              borderRadius: DS.radiusSm,
              fontSize: 12,
              color: DS.textSecondary,
              display: 'flex',
              alignItems: 'flex-start',
              gap: 8,
            }}
          >
            <span style={{ color: DS.amber, marginTop: 1 }}>
              <Icons.info />
            </span>
            <span>
              <strong>Varsayılan:</strong> AA→A, BA→B1, BB→B2, CB→B3, CC→C1, DC→C2, DD→C3, FF→F1
            </span>
          </div>
        </SectionCard>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
        <Button
          onClick={handleSave}
          disabled={saving}
          variant="success"
          icon={saving ? null : <Icons.check />}
        >
          {saving ? 'Kaydediliyor...' : 'Ayarları Kaydet'}
        </Button>
      </div>
    </div>
  );
};

// ── Reducer: tüm NewExemption state'i tek yerden yönetilir ──
var EXEMPTION_INITIAL_STATE = {
  step: 0,
  // Öğrenci bilgileri
  studentName: '',
  studentNo: '',
  otherUni: '',
  otherFaculty: '',
  otherDept: '',
  localDept: 'Bilgisayar',
  // Alan 1: Ders İçerikleri
  contentFiles: [],
  loadingContentFiles: false,
  contentFilesStatus: [],
  // Alan 2: Dilekçe
  petitionFile: '',
  loadingPetition: false,
  petitionRows: [],
  // Alan 3: Not Karşılıkları
  gradeEquivFile: '',
  loadingGradeEquiv: false,
  gradeEquivText: '',
  // Birleşik öğrenci ders listesi
  studentCourses: [],
  contentMap: {}, // ÇAKÜ kodu → yüklenen içerik metni
  // Eşleştirme
  matches: [],
  matching: false,
  // UI
  msg: null,
  detailMatch: null,
};

// Türkçe duyarlı büyük harf dönüşümü — input alanlarında elle girilen
// metinleri otomatik upper-case'e çevirir. studentNo gibi sayısal alanlara
// dokunmaz (sayı string'lerde upper noop'tur zaten).
var trUpper = function (v) {
  if (typeof v !== 'string') return v;
  return v.toLocaleUpperCase('tr-TR');
};

function exemptionReducer(state, action) {
  switch (action.type) {
    case 'SET_STEP':
      return Object.assign({}, state, { step: action.payload });
    case 'SET_STUDENT_FIELD':
      return Object.assign({}, state, { [action.field]: trUpper(action.value) });
    case 'SET_LOADING':
      return Object.assign({}, state, { [action.key]: action.value });
    case 'SET_MSG':
      return Object.assign({}, state, { msg: action.payload });
    case 'SET_DETAIL_MATCH':
      return Object.assign({}, state, { detailMatch: action.payload });
    case 'SET_CONTENT_FILES':
      return Object.assign({}, state, {
        contentFiles: action.files,
        contentFilesStatus: action.statuses,
        contentMap: action.contentMap,
        loadingContentFiles: false,
        studentCourses: action.enrichedCourses,
      });
    case 'SET_PETITION':
      return Object.assign({}, state, {
        petitionFile: action.fileName,
        petitionRows: action.rows,
        studentCourses: action.courses,
        loadingPetition: false,
      });
    case 'SET_GRADE_EQUIV':
      return Object.assign({}, state, {
        gradeEquivFile: action.fileName,
        gradeEquivText: action.text,
        loadingGradeEquiv: false,
      });
    case 'SET_MATCHES':
      return Object.assign({}, state, {
        matches: action.matches,
        matching: false,
        step: 2,
      });
    case 'UPDATE_MATCH': {
      var updated = state.matches.slice();
      if (action.field === 'targetCode') {
        updated[action.index] = Object.assign({}, updated[action.index], {
          target: action.newTarget || null,
          matched: !!action.newTarget,
        });
      } else if (action.field === 'convertedGrade') {
        updated[action.index] = Object.assign({}, updated[action.index], {
          convertedGrade: action.value,
        });
      }
      return Object.assign({}, state, { matches: updated });
    }
    default:
      return state;
  }
}

// ══════════════════════════════════════════════════════════════
// YENİ MUAFİYET (Wizard Akışı)
// ══════════════════════════════════════════════════════════════

const NewExemption = ({ courseContents, gradingSystem, onSave }) => {
  const [state, dispatch] = React.useReducer(exemptionReducer, EXEMPTION_INITIAL_STATE);
  const {
    step,
    studentName,
    studentNo,
    otherUni,
    otherFaculty,
    otherDept,
    localDept,
    contentFiles,
    loadingContentFiles,
    contentFilesStatus,
    petitionFile,
    loadingPetition,
    petitionRows,
    gradeEquivFile,
    loadingGradeEquiv,
    gradeEquivText,
    studentCourses,
    contentMap,
    matches,
    matching,
    msg,
    detailMatch,
  } = state;

  var targetCourses =
    courseContents.length > 0
      ? courseContents
      : window.HOME_INSTITUTION_CATALOG
        ? window.HOME_INSTITUTION_CATALOG.courses.map(function (c) {
            return {
              code: c.code,
              name: c.name,
              akts: String(c.credits),
              content: '',
              status: c.type,
            };
          })
        : [];

  // Pre-build kurs indeksi — targetCourses değiştiğinde yeniden hesaplanır
  var courseIndex = useMemo(
    function () {
      return buildCourseIndex(targetCourses);
    },
    [targetCourses]
  );

  function convertGradeLocal(inputGrade) {
    if (!inputGrade) return '';
    if (gradingSystem && gradingSystem.length > 0) {
      var found = gradingSystem.find(function (g) {
        return g.input.toUpperCase() === inputGrade.toString().toUpperCase();
      });
      if (found) return found.output;
    }
    return _convertGrade(inputGrade);
  }

  // Alan 2: Ders İçerikleri (çoklu PDF) — dosya adı = ÇAKÜ ders kodu (örn: MTH129.pdf)
  // Öğrenci kendi dersinin içeriğini ÇAKÜ'de muaf olmak istediği dersin kodu ile adlandırır.
  // Böylece MAT123 → MTH129 eşleştirmesinde, MTH129.pdf içeriği doğrudan MTH129 ile karşılaştırılır.
  const handleContentFiles = async function (files) {
    dispatch({ type: 'SET_LOADING', key: 'loadingContentFiles', value: true });
    dispatch({ type: 'SET_MSG', payload: null });
    var statuses = [];
    var codePattern = /^([A-ZÇĞIŞÖÜ]{2,5}\*?\d{3,4})$/;
    var newContentMap = {};
    for (var i = 0; i < files.length; i++) {
      var f = files[i];
      var codeFromName = f.name
        .replace(/\.[^.]+$/, '')
        .trim()
        .toUpperCase()
        .replace(/\s/g, '');
      var codeWarning = !codePattern.test(codeFromName);
      // ÇAKÜ kataloğunda bu kod var mı?
      var inCatalog = courseIndex.has(codeFromName);
      try {
        var result = await extractFromFile(f);
        var text =
          result.type === 'table'
            ? result.data
                .map(function (s) {
                  return s.rows
                    .map(function (r) {
                      return r.join(' ');
                    })
                    .join('\n');
                })
                .join('\n')
            : result.data;
        newContentMap[codeFromName] = text;
        statuses.push({
          name: f.name,
          code: codeFromName,
          codeWarning: codeWarning,
          inCatalog: inCatalog,
          text: text,
          ok: true,
        });
      } catch (err) {
        statuses.push({
          name: f.name,
          code: codeFromName,
          codeWarning: codeWarning,
          inCatalog: inCatalog,
          text: '',
          ok: false,
          error: err.message,
        });
      }
    }
    // studentCourses'u zenginleştir: _cakuCode ile ÇAKÜ kodu eşleşen satıra içerik ata
    var enriched = studentCourses.map(function (c) {
      var cakuKey = (c._cakuCode || c.code).replace(/[\s*]/g, '').toUpperCase();
      var txt = newContentMap[cakuKey];
      return txt ? Object.assign({}, c, { weeklyContent: txt }) : c;
    });
    dispatch({
      type: 'SET_CONTENT_FILES',
      files: files,
      statuses: statuses,
      contentMap: newContentMap,
      enrichedCourses: enriched,
    });
    var okCount = statuses.filter(function (s) {
      return s.ok;
    }).length;
    var catalogCount = statuses.filter(function (s) {
      return s.ok && s.inCatalog;
    }).length;
    dispatch({
      type: 'SET_MSG',
      payload: {
        text:
          okCount +
          '/' +
          files.length +
          ' dosya okundu, ' +
          catalogCount +
          ' tanesi ÇAKÜ kataloğunda eşleşti.',
        type: okCount > 0 ? 'success' : 'error',
      },
    });
  };

  // Alan 2: Dilekçe (tek PDF/Word) — ÇAKÜ kodlarını çıkar + satır eşleştirme
  const handlePetitionFile = async function (file) {
    dispatch({ type: 'SET_LOADING', key: 'loadingPetition', value: true });
    dispatch({ type: 'SET_MSG', payload: null });
    try {
      var result = await extractFromFile(file);
      var text =
        result.type === 'table'
          ? result.data
              .map(function (s) {
                return s.rows
                  .map(function (r) {
                    return r.join(' ');
                  })
                  .join('\n');
              })
              .join('\n')
          : result.data;
      var rows = parsePetitionRows(text, targetCourses);
      if (rows.length === 0) {
        rows = parsePetitionDocument(text, targetCourses).map(function (m) {
          return { sourceCode: '', cakuCode: m.cakuCode, target: m.target };
        });
      }
      var courses = rows.map(function (r) {
        return {
          code: r.sourceCode || r.cakuCode,
          name: r.target ? r.target.name : r.cakuCode,
          akts: r.target ? r.target.akts : '',
          grade: '',
          content: r.target ? r.target.content : '',
          weeklyContent: r.target ? r.target.content : '',
          _cakuCode: r.cakuCode,
          _target: r.target,
        };
      });
      dispatch({ type: 'SET_PETITION', fileName: file.name, rows: rows, courses: courses });
      dispatch({
        type: 'SET_MSG',
        payload:
          rows.length > 0
            ? { text: rows.length + ' ders eşleştirmesi dilekçeden okundu.', type: 'success' }
            : { text: 'Dilekçeden ders kodu çıkarılamadı.', type: 'error' },
      });
    } catch (err) {
      dispatch({ type: 'SET_LOADING', key: 'loadingPetition', value: false });
      dispatch({
        type: 'SET_MSG',
        payload: { text: 'Dilekçe okunamadı: ' + err.message, type: 'error' },
      });
    }
  };

  // Alan 3: Not Karşılıkları (tek PDF)
  const handleGradeEquivFile = async function (file) {
    dispatch({ type: 'SET_LOADING', key: 'loadingGradeEquiv', value: true });
    dispatch({ type: 'SET_MSG', payload: null });
    try {
      var result = await extractFromFile(file);
      var text =
        result.type === 'table'
          ? result.data
              .map(function (s) {
                return s.rows
                  .map(function (r) {
                    return r.join(' | ');
                  })
                  .join('\n');
              })
              .join('\n')
          : result.data;
      dispatch({ type: 'SET_GRADE_EQUIV', fileName: file.name, text: text });
      dispatch({
        type: 'SET_MSG',
        payload: { text: 'Not karşılıkları belgesi yüklendi.', type: 'success' },
      });
    } catch (err) {
      dispatch({ type: 'SET_LOADING', key: 'loadingGradeEquiv', value: false });
      dispatch({
        type: 'SET_MSG',
        payload: { text: 'Not karşılıkları okunamadı: ' + err.message, type: 'error' },
      });
    }
  };

  const runAutoMatch = function () {
    if (studentCourses.length === 0 || courseIndex.size === 0) return;
    dispatch({ type: 'SET_LOADING', key: 'matching', value: true });
    dispatch({ type: 'SET_MSG', payload: null });
    setTimeout(async function () {
      // Pre-built indeks kullan — tek tek tokenizasyon yok
      var autoMatches = autoMatchCoursesWithIndex(studentCourses, courseIndex);
      // İçerik skoru için katman sırası: AI → embedding → sözcüksel.
      var aiSonuc = await refineMatchesAI(autoMatches);
      var refined = aiSonuc.ai
        ? { matches: aiSonuc.matches }
        : await refineMatchesSemantic(autoMatches);
      var enriched = refined.matches.map(function (m) {
        return Object.assign({}, m, {
          convertedGrade: m.source.grade ? convertGradeLocal(m.source.grade) : '',
        });
      });
      dispatch({ type: 'SET_MATCHES', matches: enriched });
      var matchedCount = enriched.filter(function (m) {
        return m.matched;
      }).length;
      dispatch({
        type: 'SET_MSG',
        payload: {
          text:
            matchedCount +
            '/' +
            enriched.length +
            ' ders eşleştirildi (İçerik eşiği: %' +
            Math.round(CALIBRATION.autoApprove * 100) +
            ', AKTS uyumu: %' +
            Math.round(AKTS_MIN_RATIO * 100) +
            ', ' +
            (refined.semantic ? 'semantik analiz' : 'sözcüksel analiz') +
            ')',
          type: 'success',
        },
      });
    }, 100);
  };

  const updateMatch = function (index, field, value) {
    if (field === 'targetCode') {
      var newTarget =
        targetCourses.find(function (c) {
          return c.code === value;
        }) || null;
      dispatch({ type: 'UPDATE_MATCH', index: index, field: 'targetCode', newTarget: newTarget });
    } else {
      dispatch({ type: 'UPDATE_MATCH', index: index, field: field, value: value });
    }
  };

  const handleSave = async function () {
    var allMatchesForRecord = matches.map(function (m) {
      return {
        source: {
          code: m.source.code,
          name: m.source.name,
          akts: m.source.akts,
          grade: m.source.grade,
        },
        target: m.target
          ? {
              code: m.target.code,
              name: m.target.name,
              akts: m.target.akts,
              status: m.target.status || '',
            }
          : null,
        convertedGrade: m.convertedGrade,
        score: m.contentScore,
        aktsPass: m.aktsPass,
        tier: m.tier || (m.matched ? 'approved' : 'rejected'),
        adminDecision: null,
        adminNote: '',
      };
    });
    var record = {
      studentName: studentName,
      studentNo: studentNo,
      otherUniversity: otherUni,
      otherFaculty: otherFaculty,
      otherDepartment: otherDept,
      localDepartment: localDept,
      matches: allMatchesForRecord,
      pendingReviewCount: allMatchesForRecord.filter(function (m) {
        return m.tier === 'review';
      }).length,
      approvedCount: allMatchesForRecord.filter(function (m) {
        return m.tier === 'approved';
      }).length,
    };
    try {
      var saved = await MuafiyetDB.saveRecord(record);
      dispatch({
        type: 'SET_MSG',
        payload: { text: 'Muafiyet kaydı başarıyla kaydedildi!', type: 'success' },
      });
      if (onSave) onSave(saved);
    } catch (err) {
      dispatch({
        type: 'SET_MSG',
        payload: { text: 'Kaydetme hatası: ' + err.message, type: 'error' },
      });
    }
  };

  const handleExportWord = function () {
    var exportMatches = matches
      .filter(function (m) {
        return m.tier === 'approved' || m.adminDecision === 'confirmed';
      })
      .map(function (m) {
        return { source: m.source, target: m.target, convertedGrade: m.convertedGrade };
      });
    exportMuafiyetWord({
      studentName: studentName || 'xxxxx XXXXX',
      studentNo: studentNo || 'xxxxx',
      otherUniversity: otherUni || 'xxxxx Üniversitesi',
      otherFaculty: otherFaculty || 'xxxxx Fakültesi',
      otherDepartment: otherDept || 'xxxxx Mühendisliği',
      localDepartment: localDept || 'Bilgisayar',
      matches: exportMatches,
    });
  };

  // Adım geçerlilik kontrolleri
  var step1Valid = studentName.trim().length > 0 && studentNo.trim().length > 0;
  var step2Valid = petitionFile.length > 0 || studentCourses.length > 0;
  var matchedCount = matches.filter(function (m) {
    return m.matched;
  }).length;

  const STEPS = ['Öğrenci Bilgileri', 'Belge Yükleme', 'Sonuçlar'];

  return (
    <div>
      <StepIndicator steps={STEPS} currentStep={step} />

      {msg && (
        <Toast
          message={msg.text}
          type={msg.type}
          onClose={function () {
            dispatch({ type: 'SET_MSG', payload: null });
          }}
        />
      )}

      {/* ═══ ADIM 1: Öğrenci Bilgileri ═══ */}
      {step === 0 && (
        <SectionCard
          title="Öğrenci ve Kurum Bilgileri"
          subtitle="Muafiyet talebinde bulunan öğrencinin bilgilerini girin"
          icon={<Icons.user />}
        >
          <div
            className="responsive-grid-2"
            style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}
          >
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: 12,
                  fontWeight: 600,
                  color: DS.text,
                  marginBottom: 6,
                }}
              >
                Öğrenci Adı Soyadı <span style={{ color: DS.red }}>*</span>
              </label>
              <input
                value={studentName}
                onChange={function (e) {
                  dispatch({
                    type: 'SET_STUDENT_FIELD',
                    field: 'studentName',
                    value: e.target.value,
                  });
                }}
                placeholder="Örn: Ahmet YILMAZ"
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: DS.radiusSm,
                  border: '1px solid ' + DS.border,
                  fontSize: 14,
                  fontFamily: 'inherit',
                  outline: 'none',
                  transition: 'border-color 0.2s',
                }}
              />
            </div>
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: 12,
                  fontWeight: 600,
                  color: DS.text,
                  marginBottom: 6,
                }}
              >
                Öğrenci Numarası <span style={{ color: DS.red }}>*</span>
              </label>
              <input
                value={studentNo}
                onChange={function (e) {
                  dispatch({
                    type: 'SET_STUDENT_FIELD',
                    field: 'studentNo',
                    value: e.target.value,
                  });
                }}
                placeholder="Örn: 2024001"
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: DS.radiusSm,
                  border: '1px solid ' + DS.border,
                  fontSize: 14,
                  fontFamily: 'inherit',
                  outline: 'none',
                }}
              />
            </div>
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: 12,
                  fontWeight: 600,
                  color: DS.text,
                  marginBottom: 6,
                }}
              >
                Karşı Üniversite
              </label>
              <input
                value={otherUni}
                onChange={function (e) {
                  dispatch({ type: 'SET_STUDENT_FIELD', field: 'otherUni', value: e.target.value });
                }}
                placeholder="Örn: Ankara Üniversitesi"
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: DS.radiusSm,
                  border: '1px solid ' + DS.border,
                  fontSize: 14,
                  fontFamily: 'inherit',
                  outline: 'none',
                }}
              />
            </div>
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: 12,
                  fontWeight: 600,
                  color: DS.text,
                  marginBottom: 6,
                }}
              >
                Karşı Fakülte
              </label>
              <input
                value={otherFaculty}
                onChange={function (e) {
                  dispatch({
                    type: 'SET_STUDENT_FIELD',
                    field: 'otherFaculty',
                    value: e.target.value,
                  });
                }}
                placeholder="Örn: Mühendislik Fakültesi"
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: DS.radiusSm,
                  border: '1px solid ' + DS.border,
                  fontSize: 14,
                  fontFamily: 'inherit',
                  outline: 'none',
                }}
              />
            </div>
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: 12,
                  fontWeight: 600,
                  color: DS.text,
                  marginBottom: 6,
                }}
              >
                Karşı Bölüm
              </label>
              <input
                value={otherDept}
                onChange={function (e) {
                  dispatch({
                    type: 'SET_STUDENT_FIELD',
                    field: 'otherDept',
                    value: e.target.value,
                  });
                }}
                placeholder="Örn: Bilgisayar Mühendisliği"
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: DS.radiusSm,
                  border: '1px solid ' + DS.border,
                  fontSize: 14,
                  fontFamily: 'inherit',
                  outline: 'none',
                }}
              />
            </div>
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: 12,
                  fontWeight: 600,
                  color: DS.text,
                  marginBottom: 6,
                }}
              >
                ÇAKÜ Bölümü
              </label>
              <input
                value={localDept}
                onChange={function (e) {
                  dispatch({
                    type: 'SET_STUDENT_FIELD',
                    field: 'localDept',
                    value: e.target.value,
                  });
                }}
                placeholder="Örn: Bilgisayar"
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: DS.radiusSm,
                  border: '1px solid ' + DS.border,
                  fontSize: 14,
                  fontFamily: 'inherit',
                  outline: 'none',
                }}
              />
            </div>
          </div>

          <div style={{ marginTop: 24, display: 'flex', justifyContent: 'flex-end' }}>
            <Button
              onClick={function () {
                dispatch({ type: 'SET_STEP', payload: 1 });
              }}
              disabled={!step1Valid}
              variant="primary"
            >
              Devam Et →
            </Button>
          </div>
        </SectionCard>
      )}

      {/* ═══ ADIM 2: Belge Yükleme ═══ */}
      {step === 1 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* ── Rehber Kartı ── */}
          <div
            style={{
              borderRadius: DS.radius,
              border: '1px solid ' + DS.border,
              background: DS.bgCard,
              overflow: 'hidden',
              boxShadow: DS.shadow,
            }}
          >
            {/* Başlık */}
            <div
              style={{
                padding: '14px 20px',
                background: DS.navy,
                display: 'flex',
                alignItems: 'center',
                gap: 10,
              }}
            >
              <div style={{ color: 'rgba(255,255,255,0.9)', display: 'flex' }}>
                <Icons.listCheck />
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>
                  Belge Yükleme Rehberi
                </div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', marginTop: 1 }}>
                  Hangi belgelerin nasıl hazırlanması gerektiğini inceleyin
                </div>
              </div>
            </div>
            {/* Adımlar */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)' }}>
              {[
                {
                  num: '01',
                  title: 'Dilekçe',
                  required: true,
                  lines: [
                    "Karşı kurumda aldığınız dersler ile ÇAKÜ'de muaf olmak istediğiniz derslerin listelendiği belge.",
                    'Sistem belgeden ÇAKÜ ders kodlarını otomatik olarak okur ve eşleştirme tablosunu oluşturur.',
                  ],
                  example: null,
                },
                {
                  num: '02',
                  title: 'Ders İçerikleri',
                  required: false,
                  lines: [
                    "Muaf olmak istediğiniz her ÇAKÜ dersi için, o dersin haftalık içerik PDF'ini yükleyin.",
                    'Dosyayı muaf olmak istediğiniz ÇAKÜ ders kodu ile adlandırın.',
                  ],
                  example:
                    'MTH129 için muafiyet istiyorsanız dosyayı  MTH129.pdf  olarak kaydedin.',
                },
                {
                  num: '03',
                  title: 'Not Karşılıkları',
                  required: false,
                  lines: [
                    'Karşı kurumun not sistemini gösteren belge (harf notu → puan aralığı).',
                    'Not dönüşüm tablosu eşleştirme kalitesini artırır.',
                  ],
                  example: null,
                },
              ].map(function (step, i) {
                var isLast = i === 2;
                return (
                  <div
                    key={i}
                    style={{
                      padding: '18px 20px',
                      borderRight: isLast ? 'none' : '1px solid ' + DS.borderLight,
                      borderTop: '1px solid ' + DS.borderLight,
                      position: 'relative',
                    }}
                  >
                    {/* Numara */}
                    <div
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: 28,
                        height: 28,
                        borderRadius: 8,
                        background: DS.navy + '12',
                        fontSize: 11,
                        fontWeight: 800,
                        color: DS.navy,
                        fontFamily: "'JetBrains Mono', monospace",
                        marginBottom: 10,
                      }}
                    >
                      {step.num}
                    </div>
                    {/* Başlık + zorunluluk */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: DS.text }}>
                        {step.title}
                      </span>
                      {step.required ? (
                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 700,
                            color: DS.red,
                            background: DS.redLight,
                            padding: '2px 7px',
                            borderRadius: 20,
                          }}
                        >
                          Zorunlu
                        </span>
                      ) : (
                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 600,
                            color: DS.textMuted,
                            background: DS.borderLight,
                            padding: '2px 7px',
                            borderRadius: 20,
                          }}
                        >
                          Önerilen
                        </span>
                      )}
                    </div>
                    {/* Açıklama */}
                    {step.lines.map(function (l, j) {
                      return (
                        <p
                          key={j}
                          style={{
                            fontSize: 12,
                            color: DS.textSecondary,
                            lineHeight: 1.6,
                            margin: '0 0 4px 0',
                          }}
                        >
                          {l}
                        </p>
                      );
                    })}
                    {/* Örnek */}
                    {step.example && (
                      <div
                        style={{
                          marginTop: 10,
                          padding: '8px 12px',
                          borderRadius: DS.radiusSm,
                          background: DS.accentLight,
                          border: '1px solid ' + DS.accent + '30',
                          fontSize: 11,
                          color: DS.navy,
                          lineHeight: 1.5,
                        }}
                      >
                        {step.example.split(/ {2}(.+?) {2}/).map(function (part, k) {
                          return k % 2 === 0 ? (
                            <span key={k}>{part}</span>
                          ) : (
                            <code
                              key={k}
                              style={{
                                fontFamily: "'JetBrains Mono', monospace",
                                fontWeight: 700,
                                background: DS.accent + '20',
                                padding: '1px 5px',
                                borderRadius: 4,
                              }}
                            >
                              {part}
                            </code>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── Yükleme Alanları ── */}
          {[
            {
              num: '01',
              title: 'Dilekçe',
              subtitle: 'Muafiyet talebine esas dilekçe belgesi',
              required: true,
              accentColor: DS.navy,
              content: (
                <>
                  <FileDropZone
                    label="Dilekçeyi buraya sürükleyin veya tıklayarak seçin"
                    description="PDF veya Word formatı desteklenir. Sistem belgeden ÇAKÜ ders kodlarını otomatik çıkarır."
                    accept=".pdf,.docx,.doc"
                    onFile={handlePetitionFile}
                    fileName={petitionFile}
                    loading={loadingPetition}
                  />
                  {petitionRows.length > 0 && (
                    <div style={{ marginTop: 16 }}>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          marginBottom: 8,
                        }}
                      >
                        <span style={{ fontSize: 12, fontWeight: 600, color: DS.text }}>
                          Ders Eşleştirme Tablosu
                        </span>
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 600,
                            color: DS.green,
                            background: DS.greenLight,
                            padding: '2px 10px',
                            borderRadius: 20,
                          }}
                        >
                          {
                            petitionRows.filter(function (r) {
                              return r.target;
                            }).length
                          }{' '}
                          / {petitionRows.length} eşleşti
                        </span>
                      </div>
                      <div
                        className="responsive-table-wrap"
                        style={{
                          maxHeight: 220,
                          overflowY: 'auto',
                          border: '1px solid ' + DS.border,
                          borderRadius: DS.radiusSm,
                        }}
                      >
                        <table
                          style={{
                            width: '100%',
                            borderCollapse: 'collapse',
                            fontSize: 12,
                            minWidth: 480,
                          }}
                        >
                          <thead>
                            <tr style={{ background: DS.bg, position: 'sticky', top: 0 }}>
                              <th
                                style={{
                                  padding: '8px 12px',
                                  textAlign: 'left',
                                  borderBottom: '1px solid ' + DS.border,
                                  fontWeight: 600,
                                  color: DS.textSecondary,
                                  fontSize: 11,
                                }}
                              >
                                Karşı Kurum Kodu
                              </th>
                              <th
                                style={{
                                  padding: '8px 12px',
                                  textAlign: 'left',
                                  borderBottom: '1px solid ' + DS.border,
                                  fontWeight: 600,
                                  color: DS.textSecondary,
                                  fontSize: 11,
                                }}
                              >
                                ÇAKÜ Kodu
                              </th>
                              <th
                                style={{
                                  padding: '8px 12px',
                                  textAlign: 'left',
                                  borderBottom: '1px solid ' + DS.border,
                                  fontWeight: 600,
                                  color: DS.textSecondary,
                                  fontSize: 11,
                                }}
                              >
                                ÇAKÜ Ders Adı
                              </th>
                              <th
                                style={{
                                  padding: '8px 12px',
                                  textAlign: 'center',
                                  borderBottom: '1px solid ' + DS.border,
                                  fontWeight: 600,
                                  color: DS.textSecondary,
                                  fontSize: 11,
                                }}
                              >
                                AKTS
                              </th>
                              <th
                                style={{
                                  padding: '8px 12px',
                                  textAlign: 'center',
                                  borderBottom: '1px solid ' + DS.border,
                                  fontWeight: 600,
                                  color: DS.textSecondary,
                                  fontSize: 11,
                                }}
                              >
                                Durum
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {petitionRows.map(function (r, i) {
                              return (
                                <tr key={i} style={{ borderBottom: '1px solid ' + DS.borderLight }}>
                                  <td
                                    style={{
                                      padding: '7px 12px',
                                      fontFamily: "'JetBrains Mono', monospace",
                                      fontSize: 11,
                                      fontWeight: 600,
                                      color: DS.textSecondary,
                                    }}
                                  >
                                    {r.sourceCode || '—'}
                                  </td>
                                  <td
                                    style={{
                                      padding: '7px 12px',
                                      fontFamily: "'JetBrains Mono', monospace",
                                      fontSize: 11,
                                      fontWeight: 700,
                                      color: DS.navy,
                                    }}
                                  >
                                    {r.cakuCode}
                                  </td>
                                  <td style={{ padding: '7px 12px', fontSize: 12, color: DS.text }}>
                                    {r.target ? (
                                      r.target.name
                                    ) : (
                                      <span style={{ color: DS.textMuted, fontStyle: 'italic' }}>
                                        Katalogda bulunamadı
                                      </span>
                                    )}
                                  </td>
                                  <td
                                    style={{
                                      padding: '7px 12px',
                                      textAlign: 'center',
                                      fontSize: 12,
                                      fontWeight: 600,
                                    }}
                                  >
                                    {r.target ? r.target.akts : '—'}
                                  </td>
                                  <td style={{ padding: '7px 12px', textAlign: 'center' }}>
                                    {r.target ? (
                                      <span
                                        style={{
                                          fontSize: 11,
                                          fontWeight: 600,
                                          color: DS.green,
                                          background: DS.greenLight,
                                          padding: '2px 8px',
                                          borderRadius: 20,
                                        }}
                                      >
                                        Eşleşti
                                      </span>
                                    ) : (
                                      <span
                                        style={{
                                          fontSize: 11,
                                          fontWeight: 600,
                                          color: DS.amber,
                                          background: DS.amberLight,
                                          padding: '2px 8px',
                                          borderRadius: 20,
                                        }}
                                      >
                                        Bulunamadı
                                      </span>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </>
              ),
            },
            {
              num: '02',
              title: 'Ders İçerikleri',
              subtitle: 'Her dosyayı ilgili ÇAKÜ ders kodu ile adlandırın',
              required: false,
              accentColor: DS.accent,
              content: (
                <>
                  {/* Adlandırma kuralı */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: 10,
                      marginBottom: 14,
                    }}
                  >
                    <div
                      style={{
                        padding: '12px 14px',
                        borderRadius: DS.radiusSm,
                        background: DS.accentLight,
                        border: '1px solid ' + DS.accent + '25',
                      }}
                    >
                      <div
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          color: DS.accent,
                          marginBottom: 6,
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                        }}
                      >
                        Doğru
                      </div>
                      <div style={{ fontSize: 11, color: DS.navy, lineHeight: 1.6 }}>
                        MTH129 için muafiyet talep ediyorsanız:
                        <br />
                        <code
                          style={{
                            fontFamily: "'JetBrains Mono', monospace",
                            fontWeight: 700,
                            background: DS.accent + '15',
                            padding: '2px 6px',
                            borderRadius: 4,
                            fontSize: 12,
                          }}
                        >
                          MTH129.pdf
                        </code>
                      </div>
                    </div>
                    <div
                      style={{
                        padding: '12px 14px',
                        borderRadius: DS.radiusSm,
                        background: DS.redLight,
                        border: '1px solid ' + DS.red + '25',
                      }}
                    >
                      <div
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          color: DS.red,
                          marginBottom: 6,
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                        }}
                      >
                        Yanlış
                      </div>
                      <div style={{ fontSize: 11, color: DS.text, lineHeight: 1.6 }}>
                        Karşı kurumun ders kodunu yazmayın:
                        <br />
                        <code
                          style={{
                            fontFamily: "'JetBrains Mono', monospace",
                            fontWeight: 700,
                            background: DS.red + '15',
                            padding: '2px 6px',
                            borderRadius: 4,
                            fontSize: 12,
                            textDecoration: 'line-through',
                          }}
                        >
                          MAT123.pdf
                        </code>
                      </div>
                    </div>
                  </div>
                  <MultiFileDropZone
                    label="Ders içerik dosyalarını buraya sürükleyin veya tıklayın"
                    description="PDF ve Word desteklenir. Birden fazla dosya seçilebilir (maks. 25)."
                    accept=".pdf,.docx,.doc"
                    onFiles={handleContentFiles}
                    files={contentFiles}
                    loading={loadingContentFiles}
                    maxFiles={25}
                  />
                  {contentFilesStatus.length > 0 && (
                    <div style={{ marginTop: 12 }}>
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                          gap: 8,
                        }}
                      >
                        {contentFilesStatus.map(function (s, i) {
                          var statusColor = !s.ok ? DS.red : s.inCatalog ? DS.green : DS.amber;
                          var statusBg = !s.ok
                            ? DS.redLight
                            : s.inCatalog
                              ? DS.greenBg
                              : DS.amberLight;
                          var statusLabel = !s.ok
                            ? 'Okunamadı'
                            : s.inCatalog
                              ? 'Katalogda bulundu'
                              : 'Katalogda yok';
                          return (
                            <div
                              key={i}
                              style={{
                                padding: '10px 12px',
                                borderRadius: DS.radiusSm,
                                background: statusBg,
                                border: '1px solid ' + statusColor + '40',
                              }}
                            >
                              <div
                                style={{
                                  fontFamily: "'JetBrains Mono', monospace",
                                  fontWeight: 700,
                                  fontSize: 13,
                                  color: statusColor,
                                  marginBottom: 3,
                                }}
                              >
                                {s.code}
                              </div>
                              <div
                                style={{
                                  fontSize: 10,
                                  color: DS.textSecondary,
                                  marginBottom: 4,
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                {s.name}
                              </div>
                              <div style={{ fontSize: 10, fontWeight: 600, color: statusColor }}>
                                {statusLabel}
                              </div>
                              {s.codeWarning && (
                                <div style={{ fontSize: 10, color: DS.amber, marginTop: 2 }}>
                                  Kod formatı kontrol edin
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </>
              ),
            },
            {
              num: '03',
              title: 'Not Karşılık Tablosu',
              subtitle: 'Karşı kurumun not sistemi (opsiyonel)',
              required: false,
              accentColor: DS.green,
              content: (
                <>
                  <FileDropZone
                    label="Not karşılık belgesini buraya sürükleyin veya tıklayın"
                    description="Karşı kurumun harf notu veya puan aralığını içeren PDF. Not dönüşüm kalitesini artırır."
                    accept=".pdf,.docx,.doc"
                    onFile={handleGradeEquivFile}
                    fileName={gradeEquivFile}
                    loading={loadingGradeEquiv}
                  />
                  {gradeEquivText && (
                    <div
                      style={{
                        marginTop: 12,
                        padding: '10px 14px',
                        borderRadius: DS.radiusSm,
                        background: DS.greenBg,
                        border: '1px solid ' + DS.green + '30',
                        fontSize: 11,
                        color: DS.textSecondary,
                        maxHeight: 90,
                        overflowY: 'auto',
                        whiteSpace: 'pre-wrap',
                        lineHeight: 1.6,
                        fontFamily: "'JetBrains Mono', monospace",
                      }}
                    >
                      {gradeEquivText.substring(0, 400)}
                      {gradeEquivText.length > 400 ? '\n...' : ''}
                    </div>
                  )}
                </>
              ),
            },
          ].map(function (card, ci) {
            return (
              <div
                key={ci}
                style={{
                  borderRadius: DS.radius,
                  border: '1px solid ' + DS.border,
                  background: DS.bgCard,
                  overflow: 'hidden',
                  boxShadow: DS.shadow,
                }}
              >
                {/* Kart başlığı */}
                <div
                  style={{
                    padding: '14px 20px',
                    borderBottom: '1px solid ' + DS.borderLight,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 14,
                  }}
                >
                  {/* Numara */}
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 10,
                      flexShrink: 0,
                      background: card.accentColor + '12',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 11,
                      fontWeight: 800,
                      color: card.accentColor,
                      fontFamily: "'JetBrains Mono', monospace",
                    }}
                  >
                    {card.num}
                  </div>
                  {/* Başlık */}
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 14, fontWeight: 700, color: DS.text }}>
                        {card.title}
                      </span>
                      {card.required ? (
                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 700,
                            color: DS.red,
                            background: DS.redLight,
                            padding: '2px 8px',
                            borderRadius: 20,
                          }}
                        >
                          Zorunlu
                        </span>
                      ) : (
                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 600,
                            color: DS.textMuted,
                            background: DS.borderLight,
                            padding: '2px 8px',
                            borderRadius: 20,
                          }}
                        >
                          Önerilen
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 12, color: DS.textSecondary, marginTop: 2 }}>
                      {card.subtitle}
                    </div>
                  </div>
                </div>
                {/* İçerik */}
                <div style={{ padding: '16px 20px' }}>{card.content}</div>
              </div>
            );
          })}

          {/* ── Alt Aksiyon Barı ── */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '14px 20px',
              borderRadius: DS.radius,
              border: '1px solid ' + DS.border,
              background: DS.bgCard,
              boxShadow: DS.shadow,
            }}
          >
            <button
              onClick={function () {
                dispatch({ type: 'SET_STEP', payload: 0 });
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '9px 16px',
                borderRadius: DS.radiusSm,
                border: '1px solid ' + DS.border,
                background: 'transparent',
                fontSize: 13,
                fontWeight: 600,
                color: DS.textSecondary,
                cursor: 'pointer',
              }}
            >
              ← Geri
            </button>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              {courseIndex.size === 0 && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    fontSize: 12,
                    color: DS.amber,
                    padding: '6px 12px',
                    borderRadius: DS.radiusSm,
                    background: DS.amberLight,
                    border: '1px solid ' + DS.amber + '40',
                  }}
                >
                  <Icons.info />
                  Ayarlar'dan önce ÇAKÜ ders kataloğunu yükleyin
                </div>
              )}
              <button
                onClick={runAutoMatch}
                disabled={!step2Valid || courseIndex.size === 0 || matching}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '9px 20px',
                  borderRadius: DS.radiusSm,
                  border: 'none',
                  background:
                    !step2Valid || courseIndex.size === 0 || matching ? DS.borderLight : DS.navy,
                  color: !step2Valid || courseIndex.size === 0 || matching ? DS.textMuted : '#fff',
                  fontSize: 13,
                  fontWeight: 700,
                  cursor:
                    !step2Valid || courseIndex.size === 0 || matching ? 'not-allowed' : 'pointer',
                  transition: 'background 0.2s',
                }}
              >
                {matching ? (
                  <>
                    <div
                      style={{
                        width: 14,
                        height: 14,
                        borderRadius: '50%',
                        border: '2px solid rgba(255,255,255,0.3)',
                        borderTopColor: '#fff',
                        animation: 'spin 0.8s linear infinite',
                      }}
                    />
                    Analiz yapılıyor...
                  </>
                ) : (
                  <>
                    <Icons.barChart />
                    NLP Eşleştirme Başlat
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ ADIM 3: Sonuçlar ═══ */}
      {step === 2 && matches.length > 0 && (
        <div>
          {/* Özet Kartları */}
          {(() => {
            var reviewCount = matches.filter(function (m) {
              return m.tier === 'review';
            }).length;
            var rejectedCount = matches.filter(function (m) {
              return m.tier === 'rejected';
            }).length;
            return null; // sadece değişkenleri tanımlamak için IIFE
          })()}
          <div
            className="responsive-grid-4"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: 14,
              marginBottom: 20,
            }}
          >
            {[
              { label: 'Toplam Ders', value: matches.length, color: DS.navy, bg: DS.bg },
              {
                label: 'Otomatik Muaf',
                value: matchedCount,
                color: DS.green,
                bg: DS.greenBg,
                sub: 'içerik ≥%' + Math.round(CALIBRATION.autoApprove * 100) + ' + AKTS',
              },
              {
                label: 'İnceleme Bekliyor',
                value: matches.filter(function (m) {
                  return m.tier === 'review';
                }).length,
                color: DS.amber,
                bg: DS.amberLight,
                sub:
                  'içerik %' +
                  Math.round(CALIBRATION.review * 100) +
                  '–' +
                  (Math.round(CALIBRATION.autoApprove * 100) - 1),
              },
              {
                label: 'Red',
                value: matches.filter(function (m) {
                  return m.tier === 'rejected';
                }).length,
                color: DS.red,
                bg: DS.redLight,
                sub: '<%' + Math.round(CALIBRATION.review * 100) + ' veya AKTS yetersiz',
              },
            ].map(function (stat, i) {
              return (
                <div
                  key={i}
                  style={{
                    padding: '16px 20px',
                    borderRadius: DS.radius,
                    background: stat.bg,
                    border: '1px solid ' + DS.border,
                    textAlign: 'center',
                  }}
                >
                  <div
                    style={{
                      fontSize: 26,
                      fontWeight: 800,
                      color: stat.color,
                      fontFamily: "'JetBrains Mono', monospace",
                    }}
                  >
                    {stat.value}
                  </div>
                  <div
                    style={{ fontSize: 12, color: DS.textSecondary, marginTop: 4, fontWeight: 500 }}
                  >
                    {stat.label}
                  </div>
                  {stat.sub && (
                    <div style={{ fontSize: 10, color: stat.color, marginTop: 2, opacity: 0.75 }}>
                      {stat.sub}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Eşleştirme Tablosu */}
          <SectionCard
            title="Eşleştirme Sonuçları"
            subtitle={'Her satırı inceleyip gerekirse düzeltebilirsiniz'}
            icon={<Icons.search />}
            headerRight={
              <span style={{ fontSize: 11, color: DS.textMuted }}>
                Karar: İçerik uyumu ≥ %{Math.round(CALIBRATION.autoApprove * 100)} + AKTS uyumu ≥ %
                {Math.round(AKTS_MIN_RATIO * 100)} (isim benzerliği şart değil)
              </span>
            }
          >
            <div style={{ overflowX: 'auto' }}>
              {matches.map(function (m, idx) {
                return (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: '14px 16px',
                      borderRadius: DS.radiusSm,
                      background:
                        m.tier === 'approved'
                          ? 'white'
                          : m.tier === 'review'
                            ? '#FFFBEB'
                            : '#FFF5F5',
                      border:
                        '1px solid ' +
                        (m.tier === 'approved'
                          ? DS.border
                          : m.tier === 'review'
                            ? '#FCD34D'
                            : '#FECACA'),
                      marginBottom: 10,
                      transition: 'all 0.2s',
                      flexWrap: 'wrap',
                    }}
                  >
                    {/* Kaynak Ders */}
                    <div style={{ flex: '1 1 240px', minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: 10,
                          fontWeight: 600,
                          color: DS.textMuted,
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
                          marginBottom: 4,
                        }}
                      >
                        Kaynak Ders
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span
                          style={{
                            fontFamily: "'JetBrains Mono', monospace",
                            fontSize: 11,
                            fontWeight: 600,
                            color: DS.accent,
                            background: DS.accentLight,
                            padding: '2px 8px',
                            borderRadius: 4,
                          }}
                        >
                          {m.source.code}
                        </span>
                        <span
                          style={{
                            fontSize: 13,
                            fontWeight: 500,
                            color: DS.text,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {m.source.name}
                        </span>
                      </div>
                      <div
                        style={{
                          display: 'flex',
                          gap: 12,
                          marginTop: 6,
                          fontSize: 11,
                          color: DS.textSecondary,
                        }}
                      >
                        <span>
                          AKTS: <strong>{m.source.akts || '—'}</strong>
                        </span>
                        <span>
                          Not: <strong>{m.source.grade || '—'}</strong>
                        </span>
                      </div>
                    </div>

                    {/* Ok */}
                    <div style={{ flex: '0 0 28px', display: 'flex', justifyContent: 'center' }}>
                      <Icons.arrow />
                    </div>

                    {/* Hedef Ders (Düzenlenebilir) */}
                    <div style={{ flex: '1 1 240px', minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: 10,
                          fontWeight: 600,
                          color: DS.textMuted,
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
                          marginBottom: 4,
                        }}
                      >
                        ÇAKÜ Eşleşme
                      </div>
                      <select
                        value={m.target ? m.target.code : ''}
                        onChange={function (e) {
                          updateMatch(idx, 'targetCode', e.target.value);
                        }}
                        style={{
                          width: '100%',
                          padding: '7px 10px',
                          fontSize: 12,
                          borderRadius: 6,
                          border: '1px solid ' + DS.border,
                          background: 'white',
                          cursor: 'pointer',
                          fontFamily: 'inherit',
                          color: m.target ? DS.text : DS.textMuted,
                        }}
                      >
                        <option value="">— Ders seçin —</option>
                        {targetCourses.map(function (c) {
                          return (
                            <option key={c.code} value={c.code}>
                              {c.code} — {c.name}
                            </option>
                          );
                        })}
                      </select>
                      {m.target && (
                        <div
                          style={{
                            display: 'flex',
                            gap: 12,
                            marginTop: 6,
                            fontSize: 11,
                            color: DS.textSecondary,
                            alignItems: 'center',
                          }}
                        >
                          <span>
                            AKTS: <strong>{m.target.akts || '—'}</strong>
                          </span>
                          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            Dönüşen Not:
                            <input
                              type="text"
                              value={m.convertedGrade}
                              onChange={function (e) {
                                updateMatch(idx, 'convertedGrade', e.target.value);
                              }}
                              style={{
                                width: 40,
                                padding: '2px 4px',
                                fontSize: 11,
                                fontWeight: 600,
                                border: '1px solid ' + DS.border,
                                borderRadius: 4,
                                textAlign: 'center',
                                color: DS.green,
                                fontFamily: "'JetBrains Mono', monospace",
                              }}
                            />
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Skor Göstergeleri */}
                    <div
                      style={{
                        flex: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 10,
                      }}
                    >
                      {/* AKTS */}
                      <div style={{ textAlign: 'center' }}>
                        <div
                          style={{
                            width: 24,
                            height: 24,
                            borderRadius: '50%',
                            background: m.aktsPass ? DS.greenLight : DS.redLight,
                            color: m.aktsPass ? DS.green : DS.red,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 12,
                            fontWeight: 700,
                          }}
                        >
                          {m.aktsPass ? '✓' : '✗'}
                        </div>
                        <span style={{ fontSize: 9, color: DS.textMuted }}>AKTS</span>
                      </div>
                      <ScoreBadge value={m.contentScore} size="lg" label="İçerik" />
                    </div>

                    {/* Sonuç */}
                    <div style={{ flex: '0 0 100px', display: 'flex', justifyContent: 'center' }}>
                      <StatusPill matched={m.matched} tier={m.tier} reason={m.rejectReason} />
                    </div>
                  </div>
                );
              })}
            </div>
          </SectionCard>

          {/* Aksiyon Butonları */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
            <Button
              onClick={function () {
                dispatch({ type: 'SET_STEP', payload: 1 });
              }}
              variant="ghost"
            >
              ← Geri
            </Button>
            <div style={{ display: 'flex', gap: 10 }}>
              <Button onClick={handleSave} variant="success" icon={<Icons.check />}>
                Kaydet
              </Button>
              <Button onClick={handleExportWord} variant="primary" icon={<Icons.download />}>
                Word İndir
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Eşleştirme Animasyonu */}
      {matching && (
        <div
          style={{
            padding: 60,
            textAlign: 'center',
            background: DS.bgCard,
            borderRadius: DS.radius,
            border: '1px solid ' + DS.border,
            boxShadow: DS.shadow,
          }}
        >
          <div
            style={{
              width: 48,
              height: 48,
              margin: '0 auto 16px',
              borderRadius: '50%',
              border: '3px solid ' + DS.accentLight,
              borderTopColor: DS.accent,
              animation: 'spin 0.8s linear infinite',
            }}
          />
          <div style={{ fontSize: 16, fontWeight: 700, color: DS.navy, marginBottom: 8 }}>
            NLP Analizi Yapılıyor
          </div>
          <div style={{ fontSize: 13, color: DS.textSecondary }}>
            TF-IDF, N-gram, Jaccard benzerlik hesaplanıyor...
          </div>
        </div>
      )}
    </div>
  );
};

// ══════════════════════════════════════════════════════════════
// GEÇMİŞ KAYITLAR
// ══════════════════════════════════════════════════════════════

// ── İnceleme Paneli ── (admin insan onayı)
// Akademisyen karar paneli — öğrencinin gönderdiği veri yapısıyla hizalı:
// her ders çifti için iki sütunlu karşılaştırma (Karşı Kurum ↔ ÇAKÜ), düz
// metin ölçütler (içerik %, AKTS, sistem önerisi), belge bağlantıları ve
// net Onayla/Reddet butonları. Emoji/ikon kullanılmaz.
// Standalone belge yükleyici (form dışından da kullanılır — faz-2 başarı belgesi)
async function uploadMuafiyetFile(file) {
  if (!file) return null;
  try {
    const fd = new FormData();
    fd.append('file', file);
    const token = localStorage.getItem('caku_auth_token');
    const res = await fetch('/api/files/upload?folder=muafiyet_belgeler', {
      method: 'POST',
      headers: token ? { Authorization: 'Bearer ' + token } : {},
      credentials: 'include',
      body: fd,
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.downloadURL || null;
  } catch (e) {
    console.warn('Belge yüklenemedi:', e.message);
    return null;
  }
}

const eStageBtn = {
  padding: '8px 16px',
  borderRadius: 8,
  border: '1px solid ' + DS.border,
  background: DS.card || '#fff',
  color: DS.navy,
  fontSize: 13,
  fontWeight: 600,
  cursor: 'pointer',
};

// ── Yaz İntibakı İki-Fazlı Durum Paneli ──
// Faz 1: on_inceleme → (akademisyen) on_onay / on_red
// Faz 2: on_onay → (öğrenci belge yükler) belge_teslim → (akademisyen not
//        dönüşümü) tamamlandi
const INTIBAK_STAGES = [
  { id: 'on_inceleme', label: 'Ön Onay' },
  { id: 'on_onay', label: 'Yaz Okulu' },
  { id: 'belge_teslim', label: 'Belge' },
  { id: 'tamamlandi', label: 'Tamamlandı' },
];
const IntibakStagePanel = ({ record, isStudent, currentUser, onStageChange }) => {
  const [busy, setBusy] = useState(false);
  const [link, setLink] = useState(record.notDonusumLink || '');
  const stage = record.stage || 'on_inceleme';
  const curIdx = INTIBAK_STAGES.findIndex((s) => s.id === stage);

  // ── 2. adım: başarı notları ──
  // Belgedeki {{karşı_başarı_notu}} ve {{çakü_başarı_notu}} yer tutucuları
  // ancak bu notlarla dolar; bu yüzden öğrenci not girmeden onaya gönderemez.
  // Notlar `matches` içine YAZILMAZ (o alan öğrenciye kapalı — kendini
  // onaylama engeli); ayrı `ogrenciNotlari` alanında tutulur.
  const notluDersler = (record.matches || []).filter(
    (m) => !m.adminDecision || m.adminDecision === 'confirmed'
  );
  const [notlar, setNotlar] = useState(() => {
    const mevcut = record.ogrenciNotlari || {};
    const ilk = {};
    notluDersler.forEach((m, i) => {
      const anahtar = String(m.id != null ? m.id : i);
      ilk[anahtar] = {
        kaynakNot: (mevcut[anahtar] && mevcut[anahtar].kaynakNot) || '',
        cakuNot: (mevcut[anahtar] && mevcut[anahtar].cakuNot) || '',
      };
    });
    return ilk;
  });
  const notAnahtari = (m, i) => String(m.id != null ? m.id : i);
  const setNot = (anahtar, alan, deger) =>
    setNotlar((p) => ({ ...p, [anahtar]: { ...(p[anahtar] || {}), [alan]: deger } }));
  const eksikNotVar = notluDersler.some((m, i) => {
    const n = notlar[notAnahtari(m, i)] || {};
    return !String(n.kaynakNot || '').trim() || !String(n.cakuNot || '').trim();
  });

  const act = async (newStage, extra) => {
    setBusy(true);
    try {
      await onStageChange(record.id, newStage, extra);
    } finally {
      setBusy(false);
    }
  };

  // Panel state'indeki notları kayıt biçimine çevirir (öğrenci ve akademisyen
  // aynı yapıyı yazar — belge son hâli okur).
  const derlenmisNotlar = () => {
    const cikti = {};
    notluDersler.forEach((m, i) => {
      const a = notAnahtari(m, i);
      const n = notlar[a] || {};
      cikti[a] = {
        kaynakNot: String(n.kaynakNot || '').trim(),
        cakuNot: String(n.cakuNot || '').trim(),
      };
    });
    return cikti;
  };

  const submitBelge = async () => {
    if (!/^https?:\/\/\S+$/i.test((link || '').trim())) {
      alert('Yaz okulu üniversitesinin not/döküm sistemi linki gerekli (http/https).');
      return;
    }
    // Başarı notları belgedeki yer tutucuları doldurur — eksik bırakılamaz.
    if (eksikNotVar) {
      alert('Her ders için hem karşı kurum hem ÇAKÜ başarı notunu girmelisiniz.');
      return;
    }
    setBusy(true);
    try {
      await onStageChange(record.id, 'belge_teslim', {
        notDonusumLink: link.trim(),
        ogrenciNotlari: derlenmisNotlar(),
      });
    } finally {
      setBusy(false);
    }
  };

  const chip = (text, color, bg) => (
    <span
      style={{
        fontSize: 11,
        fontWeight: 600,
        color,
        background: bg,
        padding: '2px 9px',
        borderRadius: 6,
      }}
    >
      {text}
    </span>
  );

  return (
    <div
      style={{
        border: '1px solid ' + DS.border,
        borderRadius: DS.radiusSm,
        padding: '12px 14px',
        marginBottom: 10,
        background: DS.bg,
      }}
    >
      {/* Faz göstergesi */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          flexWrap: 'wrap',
          marginBottom: 10,
        }}
      >
        <span style={{ fontSize: 12, fontWeight: 700, color: DS.navy, marginRight: 4 }}>
          Yaz İntibakı:
        </span>
        {stage === 'on_red'
          ? chip('Ön Onay Reddedildi', DS.red, DS.redLight)
          : INTIBAK_STAGES.map((s, i) => (
              <span
                key={s.id}
                style={{
                  fontSize: 11,
                  fontWeight: i === curIdx ? 700 : 500,
                  color: i < curIdx ? DS.green : i === curIdx ? DS.navy : DS.textMuted,
                }}
              >
                {i > 0 ? '→ ' : ''}
                {s.label}
              </span>
            ))}
      </div>

      {/* Faz-1: akademisyen ön onay/red */}
      {stage === 'on_inceleme' && !isStudent && onStageChange && (
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            disabled={busy}
            onClick={() => act('on_onay')}
            style={{
              padding: '7px 16px',
              borderRadius: 8,
              border: 'none',
              background: DS.green,
              color: '#fff',
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Ön Onay Ver
          </button>
          <button
            disabled={busy}
            onClick={() => {
              if (window.confirm('Ön onay reddedilsin mi? (Bölüm kurulu kararı olumsuz)'))
                act('on_red');
            }}
            style={{
              padding: '7px 16px',
              borderRadius: 8,
              border: '1px solid ' + DS.red,
              background: '#fff',
              color: DS.red,
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Ön Onay Reddet
          </button>
        </div>
      )}
      {stage === 'on_inceleme' && isStudent && (
        <div style={{ fontSize: 12.5, color: DS.textSecondary }}>
          Ön denklik onayı bekleniyor. Bölüm kurulu AKTS ve içerik uyumunu inceleyecek.
        </div>
      )}

      {/* Faz-2: öğrenci başarı belgesi + not-dönüşüm linki yükler */}
      {stage === 'on_onay' && isStudent && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ fontSize: 12.5, color: DS.textSecondary }}>
            Ön onay verildi. Yaz okulunu tamamladıktan sonra <b>her ders için başarı notlarınızı</b>{' '}
            girin ve karşı üniversitenin not/döküm sistemi bağlantısını göndererek not dönüşümü için
            onaya iletin.
          </div>

          {/* Başarı notları — belgedeki {{karşı_başarı_notu}} / {{çakü_başarı_notu}}
              yer tutucuları bu değerlerle dolar. */}
          {notluDersler.length > 0 && (
            <div
              style={{
                border: '1px solid ' + DS.border,
                borderRadius: 10,
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  padding: '8px 12px',
                  background: DS.bg || '#F8F9FB',
                  borderBottom: '1px solid ' + DS.border,
                  fontSize: 12,
                  fontWeight: 700,
                  color: DS.navy,
                }}
              >
                Başarı Notları ({notluDersler.length} ders)
              </div>
              {notluDersler.map((m, i) => {
                const src = m.sourceCourse || m.source || {};
                const cak = m.localCourse || m.target || {};
                const a = notAnahtari(m, i);
                const n = notlar[a] || {};
                const inp = {
                  width: 84,
                  padding: '6px 9px',
                  borderRadius: 7,
                  border:
                    '1px solid ' +
                    (String(n.kaynakNot || '').trim() ? DS.border : DS.amber || '#B45309'),
                  fontSize: 13,
                  outline: 'none',
                  textAlign: 'center',
                };
                return (
                  <div
                    key={a}
                    style={{
                      display: 'flex',
                      gap: 12,
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      padding: '10px 12px',
                      borderTop: i === 0 ? 'none' : '1px solid ' + DS.border,
                    }}
                  >
                    <div style={{ flex: '1 1 220px', minWidth: 0 }}>
                      <div style={{ fontSize: 12.5, fontWeight: 600, color: DS.navy }}>
                        {[src.code, src.name].filter(Boolean).join(' — ') || 'Karşı ders'}
                      </div>
                      <div style={{ fontSize: 11.5, color: DS.textMuted, marginTop: 2 }}>
                        ÇAKÜ: {[cak.code, cak.name].filter(Boolean).join(' — ') || '—'}
                      </div>
                    </div>
                    <label style={{ fontSize: 11.5, color: DS.textSecondary }}>
                      Karşı notu
                      <br />
                      <input
                        value={n.kaynakNot || ''}
                        onChange={(e) => setNot(a, 'kaynakNot', e.target.value)}
                        placeholder="ör. 8"
                        style={inp}
                      />
                    </label>
                    <label style={{ fontSize: 11.5, color: DS.textSecondary }}>
                      ÇAKÜ notu
                      <br />
                      <input
                        value={n.cakuNot || ''}
                        onChange={(e) => setNot(a, 'cakuNot', e.target.value)}
                        placeholder="ör. AA"
                        style={{
                          ...inp,
                          borderColor: String(n.cakuNot || '').trim()
                            ? DS.border
                            : DS.amber || '#B45309',
                        }}
                      />
                    </label>
                  </div>
                );
              })}
            </div>
          )}
          <input
            value={link}
            onChange={(e) => setLink(e.target.value)}
            placeholder="Yaz okulu üniversitesi not/döküm sistemi linki (https://...)"
            style={{
              padding: '9px 12px',
              borderRadius: 8,
              border: '1px solid ' + DS.border,
              fontSize: 13,
              outline: 'none',
            }}
          />
          <div>
            <button
              disabled={busy || eksikNotVar}
              onClick={submitBelge}
              title={eksikNotVar ? 'Tüm başarı notlarını girin' : ''}
              style={{
                ...eStageBtn,
                background: eksikNotVar ? '#9CA3AF' : DS.accent,
                color: '#fff',
                border: 'none',
                cursor: eksikNotVar ? 'not-allowed' : 'pointer',
              }}
            >
              Not Dönüşümü İçin Gönder
            </button>
          </div>
        </div>
      )}
      {stage === 'on_onay' && !isStudent && (
        <div style={{ fontSize: 12.5, color: DS.textSecondary }}>
          Ön onay verildi. Öğrenci yaz okulunu tamamlayıp başarı belgesini yükleyecek.
        </div>
      )}

      {/* Faz-2: akademisyen not dönüşümü + tamamla */}
      {stage === 'belge_teslim' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
            {record.notDonusumLink && (
              <a
                href={record.notDonusumLink}
                target="_blank"
                rel="noopener noreferrer"
                style={{ fontSize: 12.5, fontWeight: 600, color: DS.accent }}
              >
                Karşı üniversite not sistemi
              </a>
            )}
          </div>
          {isStudent ? (
            <div style={{ fontSize: 12.5, color: DS.textSecondary }}>
              Girdiğiniz notlar alındı. Bölüm kurulu notlarınızı inceleyip ÇAKÜ sistemine
              dönüştürecek.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {/* Öğrencinin girdiği notlar — akademisyen gözden geçirir ve
                  gerekirse DEĞİŞTİRİR. Belgeye son hâli yazılır. */}
              {notluDersler.length > 0 && (
                <div style={{ border: '1px solid ' + DS.border, borderRadius: 10 }}>
                  <div
                    style={{
                      padding: '8px 12px',
                      background: DS.bg || '#F8F9FB',
                      borderBottom: '1px solid ' + DS.border,
                      fontSize: 12,
                      fontWeight: 700,
                      color: DS.navy,
                    }}
                  >
                    Öğrencinin girdiği başarı notları — gerekirse düzeltin
                  </div>
                  {notluDersler.map((m, i) => {
                    const src = m.sourceCourse || m.source || {};
                    const cak = m.localCourse || m.target || {};
                    const a = notAnahtari(m, i);
                    const n = notlar[a] || {};
                    const inp = {
                      width: 84,
                      padding: '6px 9px',
                      borderRadius: 7,
                      border: '1px solid ' + DS.border,
                      fontSize: 13,
                      outline: 'none',
                      textAlign: 'center',
                    };
                    return (
                      <div
                        key={a}
                        style={{
                          display: 'flex',
                          gap: 12,
                          alignItems: 'center',
                          flexWrap: 'wrap',
                          padding: '10px 12px',
                          borderTop: i === 0 ? 'none' : '1px solid ' + DS.border,
                        }}
                      >
                        <div style={{ flex: '1 1 220px', minWidth: 0 }}>
                          <div style={{ fontSize: 12.5, fontWeight: 600, color: DS.navy }}>
                            {[src.code, src.name].filter(Boolean).join(' — ') || 'Karşı ders'}
                          </div>
                          <div style={{ fontSize: 11.5, color: DS.textMuted, marginTop: 2 }}>
                            ÇAKÜ: {[cak.code, cak.name].filter(Boolean).join(' — ') || '—'}
                          </div>
                        </div>
                        <label style={{ fontSize: 11.5, color: DS.textSecondary }}>
                          Karşı notu
                          <br />
                          <input
                            value={n.kaynakNot || ''}
                            onChange={(e) => setNot(a, 'kaynakNot', e.target.value)}
                            style={inp}
                          />
                        </label>
                        <label style={{ fontSize: 11.5, color: DS.textSecondary }}>
                          ÇAKÜ notu
                          <br />
                          <input
                            value={n.cakuNot || ''}
                            onChange={(e) => setNot(a, 'cakuNot', e.target.value)}
                            style={inp}
                          />
                        </label>
                      </div>
                    );
                  })}
                </div>
              )}

              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button
                  disabled={busy}
                  onClick={async () => {
                    setBusy(true);
                    try {
                      await onStageChange(record.id, 'belge_teslim', {
                        ogrenciNotlari: derlenmisNotlar(),
                      });
                      alert('Notlar kaydedildi.');
                    } finally {
                      setBusy(false);
                    }
                  }}
                  style={eStageBtn}
                >
                  Notları Kaydet
                </button>
                <button
                  disabled={busy}
                  onClick={() => {
                    if (
                      window.confirm(
                        'Notlar ÇAKÜ sistemine dönüştürülüp kaydedildi mi? İşlem tamamlanacak ve belge üretilebilir hâle gelecek.'
                      )
                    )
                      act('tamamlandi', {
                        status: 'tamamlandi',
                        ogrenciNotlari: derlenmisNotlar(),
                      });
                  }}
                  style={{ ...eStageBtn, background: DS.green, color: '#fff', border: 'none' }}
                >
                  Not Dönüşümü Yapıldı — Tamamla
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {stage === 'tamamlandi' &&
        chip('Tamamlandı — notlar ÇAKÜ sistemine işlendi', DS.green, DS.greenBg)}
      {stage === 'on_red' && (
        <div style={{ fontSize: 12.5, color: DS.textSecondary }}>
          Ön onay reddedildi (ÇAKÜ yaz okulunda aynı ders açık veya AKTS/içerik uyumsuz olabilir).
        </div>
      )}
    </div>
  );
};

const ReviewPanel = ({ record, onDecision, readOnly }) => {
  const [reviewing, setReviewing] = useState(false);
  const matches = record.matches || [];
  if (matches.length === 0) return null;
  const pendingCount = matches.filter(function (m) {
    return m.tier === 'review' && !m.adminDecision;
  }).length;

  const label = {
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: '0.06em',
    color: DS.textMuted,
    marginBottom: 4,
  };
  const chip = function (text, color, bg) {
    return (
      <span
        style={{
          fontSize: 11,
          fontWeight: 600,
          color: color,
          background: bg,
          padding: '2px 9px',
          borderRadius: 6,
        }}
      >
        {text}
      </span>
    );
  };
  const docLink = function (href, text) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          fontSize: 12,
          fontWeight: 600,
          color: DS.accent,
          textDecoration: 'underline',
          textUnderlineOffset: 3,
        }}
      >
        {text}
      </a>
    );
  };

  return (
    <div style={{ borderTop: '1px solid ' + DS.borderLight, paddingTop: 14 }}>
      {pendingCount > 0 && (
        <div style={{ fontSize: 13, fontWeight: 700, color: DS.text, marginBottom: 10 }}>
          {pendingCount} ders kararınızı bekliyor
        </div>
      )}
      {matches.map(function (m, idx) {
        // İki kayıt şekli desteklenir: öğrenci formu (sourceCourse/localCourse)
        // ve eski sihirbaz (source/target)
        var src = m.sourceCourse || m.source || {};
        var tgt = m.localCourse || m.target || null;
        var decided = m.adminDecision;
        var isPending = m.tier === 'review' && !decided;
        var score = Math.round((m.score || m.contentScore || 0) * 100);
        var aktsOk = m.aktsPass !== false;

        // Satırın durumu (sol kenar rengi + rozet)
        var durum, dColor, dBg;
        if (decided === 'confirmed') {
          durum = 'Onaylandı';
          dColor = DS.green;
          dBg = DS.greenBg;
        } else if (decided === 'rejected') {
          durum = 'Reddedildi';
          dColor = DS.red;
          dBg = DS.redLight;
        } else if (m.tier === 'approved') {
          durum = 'Otomatik muaf';
          dColor = DS.green;
          dBg = DS.greenBg;
        } else if (m.tier === 'rejected') {
          durum = 'Otomatik red';
          dColor = DS.red;
          dBg = DS.redLight;
        } else {
          durum = 'Karar bekliyor';
          dColor = DS.amber;
          dBg = DS.amberLight;
        }

        return (
          <div
            key={idx}
            style={{
              border: '1px solid ' + DS.border,
              borderLeft: '3px solid ' + dColor,
              borderRadius: DS.radiusSm,
              padding: '12px 14px',
              marginBottom: 8,
              background: 'white',
            }}
          >
            {/* Ders karşılaştırması: Karşı kurum ↔ ÇAKÜ */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'minmax(0,1fr) 20px minmax(0,1fr)',
                gap: 10,
                alignItems: 'start',
              }}
            >
              <div>
                <div style={label}>KARŞI KURUM{src.uni ? ' — ' + fmtTitle(src.uni) : ''}</div>
                <div style={{ fontSize: 13.5, color: DS.text }}>
                  <span style={{ fontWeight: 700, color: DS.navy }}>{src.code || '—'}</span>{' '}
                  {fmtTitle(src.name)}
                </div>
                <div style={{ fontSize: 12, color: DS.textSecondary, marginTop: 2 }}>
                  AKTS {src.akts || '—'}
                  {src.statu ? ' · ' + (src.statu === 'S' ? 'Seçmeli' : 'Zorunlu') : ''}
                </div>
              </div>
              <div
                style={{ textAlign: 'center', color: DS.textMuted, fontSize: 14, paddingTop: 18 }}
              >
                →
              </div>
              <div>
                <div style={label}>ÇAKÜ DERSİ</div>
                {tgt ? (
                  <>
                    <div style={{ fontSize: 13.5, color: DS.text }}>
                      <span style={{ fontWeight: 700, color: DS.navy }}>{tgt.code || '—'}</span>{' '}
                      {fmtTitle(tgt.name)}
                    </div>
                    <div style={{ fontSize: 12, color: DS.textSecondary, marginTop: 2 }}>
                      AKTS {tgt.akts || '—'}
                      {tgt.statu ? ' · ' + (tgt.statu === 'S' ? 'Seçmeli' : 'Zorunlu') : ''}
                    </div>
                  </>
                ) : (
                  <div style={{ fontSize: 13, color: DS.textMuted }}>Eşleşme yok</div>
                )}
              </div>
            </div>

            {/* Ölçütler · belgeler · karar */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 10,
                marginTop: 10,
                paddingTop: 10,
                borderTop: '1px dashed ' + DS.borderLight,
              }}
            >
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                {chip(
                  'İçerik %' + score,
                  score >= 70 ? DS.green : score >= 60 ? DS.amber : DS.red,
                  score >= 70 ? DS.greenBg : score >= 60 ? DS.amberLight : DS.redLight
                )}
                {chip(
                  aktsOk
                    ? 'AKTS uygun' +
                        (src.akts && tgt && tgt.akts ? ' (' + src.akts + '/' + tgt.akts + ')' : '')
                    : 'AKTS yetersiz' +
                        (src.akts && tgt && tgt.akts ? ' (' + src.akts + '/' + tgt.akts + ')' : ''),
                  aktsOk ? DS.green : DS.red,
                  aktsOk ? DS.greenBg : DS.redLight
                )}
                {m.recommendation &&
                  chip(
                    'Sistem önerisi: ' + m.recommendation.toLocaleUpperCase('tr'),
                    m.recommendation === 'muaf'
                      ? DS.green
                      : m.recommendation === 'red'
                        ? DS.red
                        : DS.amber,
                    m.recommendation === 'muaf'
                      ? DS.greenBg
                      : m.recommendation === 'red'
                        ? DS.redLight
                        : DS.amberLight
                  )}
              </div>
              <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'center' }}>
                {src.fileUrl &&
                  docLink(
                    '/api/files/view/' + String(src.fileUrl).replace('/api/files/download/', ''),
                    'Ders içeriği (PDF)'
                  )}
                {src.bolognaLink && docLink(src.bolognaLink, 'Bologna — karşı kurum')}
                {tgt && tgt.bolognaLink && docLink(tgt.bolognaLink, 'Bologna — ÇAKÜ')}
              </div>
              {isPending && readOnly ? (
                chip('Karar bekleniyor', DS.amber, DS.amberLight)
              ) : isPending ? (
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    disabled={reviewing}
                    onClick={async function () {
                      setReviewing(true);
                      await onDecision(record.id, idx, 'confirmed');
                      setReviewing(false);
                    }}
                    style={{
                      padding: '7px 18px',
                      borderRadius: 8,
                      border: 'none',
                      background: DS.green,
                      color: 'white',
                      fontSize: 13,
                      fontWeight: 700,
                      cursor: reviewing ? 'wait' : 'pointer',
                      opacity: reviewing ? 0.6 : 1,
                    }}
                  >
                    Onayla
                  </button>
                  <button
                    disabled={reviewing}
                    onClick={async function () {
                      setReviewing(true);
                      await onDecision(record.id, idx, 'rejected');
                      setReviewing(false);
                    }}
                    style={{
                      padding: '7px 18px',
                      borderRadius: 8,
                      border: '1px solid ' + DS.red,
                      background: 'white',
                      color: DS.red,
                      fontSize: 13,
                      fontWeight: 700,
                      cursor: reviewing ? 'wait' : 'pointer',
                      opacity: reviewing ? 0.6 : 1,
                    }}
                  >
                    Reddet
                  </button>
                </div>
              ) : (
                chip(durum, dColor, dBg)
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

// ══════════════════════════════════════════════════════════════
// BİRLEŞİK DERS İÇERİĞİ PDF'İ (akademisyen)
//   Öğrenci her ders için iki içerik dosyası yüklüyor (karşı kurum + ÇAKÜ).
//   10 derslik bir talepte bu 20 ayrı sekme demek. Burada sunucuda
//   birleştirilir.
//
//   Çıktı, öğrencinin yüklediği belgelerin BİREBİR birleşimidir: kapak ya da
//   ayraç sayfası eklenmez, belgelere hiçbir şey yazılmaz.
//
//   KURUM BAŞINA AYRI PDF üretilir — iki kurumun belgeleri tek dosyada
//   iç içe geçmez.
// ══════════════════════════════════════════════════════════════

// Kayıttaki eşleşmelerden, KURUM BAŞINA ayrı dosya listesi çıkarır.
//
// İki kurum tek PDF'te birleştirilmiyor: karşı kurumun ders içerikleri ile
// ÇAKÜ'nün ders içerikleri farklı kurumların belgeleridir; değerlendirici
// bunları yan yana açıp karşılaştırır, iç içe geçmiş tek belge bu okumayı
// zorlaştırır. Her kurum kendi PDF'ini alır, belge sırası ikisinde de aynıdır
// — böylece iki dosya aynı hizada ilerler.
//
// `baslik` PDF'e YAZILMAZ; yalnızca atlanan bir dosyayı kullanıcıya adıyla
// bildirebilmek için taşınır.
function birlesikPdfListesi(record, taraf) {
  const out = [];
  (record.matches || []).forEach(function (m, i) {
    const d = (taraf === 'caku' ? m.localCourse : m.sourceCourse) || {};
    if (!d.fileUrl) return;
    out.push({
      url: d.fileUrl,
      baslik: i + 1 + '. ' + [d.code, d.name].filter(Boolean).join(' ').trim(),
    });
  });
  return out;
}

// Tek kurumun içeriklerini birleştiren buton çifti (görüntüle + indir).
const BirlesikPdfGrubu = ({ record, taraf, etiket, dosyaOnEki }) => {
  const [busy, setBusy] = useState(false);
  const [hata, setHata] = useState('');
  const [bilgi, setBilgi] = useState('');
  // Blob URL'i bileşen sökülünce serbest bırak — aksi halde sekme kapanana
  // kadar bellekte kalır.
  const sonUrl = useRef('');
  useEffect(function () {
    return function () {
      if (sonUrl.current) URL.revokeObjectURL(sonUrl.current);
    };
  }, []);

  const dosyalar = birlesikPdfListesi(record, taraf);
  if (dosyalar.length === 0) return null;

  const dosyaAdi = dosyaOnEki + '_' + (record.studentNo || record.id || 'kayit') + '.pdf';

  const uret = async (indir) => {
    setBusy(true);
    setHata('');
    setBilgi('');
    try {
      const token = localStorage.getItem('caku_auth_token');
      const res = await fetch('/api/files/merge-pdf', {
        method: 'POST',
        headers: Object.assign(
          { 'Content-Type': 'application/json' },
          token ? { Authorization: 'Bearer ' + token } : {}
        ),
        credentials: 'include',
        body: JSON.stringify({ dosyalar: dosyalar, filename: dosyaAdi }),
      });
      if (!res.ok) {
        const j = await res.json().catch(function () {
          return {};
        });
        throw new Error(j.error || 'Birleştirilemedi (HTTP ' + res.status + ')');
      }
      // Word olarak yüklenmiş ya da bozuk dosyalar atlanır — sessizce
      // kaybolmasınlar diye kullanıcıya sayıyla bildirilir.
      const atlanan = parseInt(res.headers.get('X-Merge-Atlanan') || '0', 10) || 0;
      const eklenen = parseInt(res.headers.get('X-Merge-Eklenen') || '0', 10) || 0;
      const blob = await res.blob();
      if (sonUrl.current) URL.revokeObjectURL(sonUrl.current);
      const url = URL.createObjectURL(blob);
      sonUrl.current = url;
      if (indir) {
        const a = document.createElement('a');
        a.href = url;
        a.download = dosyaAdi;
        document.body.appendChild(a);
        a.click();
        a.remove();
      } else {
        window.open(url, '_blank', 'noopener');
      }
      setBilgi(
        eklenen +
          ' belge birleştirildi' +
          (atlanan > 0 ? ' · ' + atlanan + ' dosya atlandı (PDF değil ya da okunamadı)' : '')
      );
    } catch (e) {
      setHata(e.message);
    } finally {
      setBusy(false);
    }
  };

  const btn = (bg, renk, kenar) => ({
    padding: '6px 14px',
    borderRadius: 8,
    border: kenar ? '1px solid ' + kenar : 'none',
    background: bg,
    color: renk,
    fontSize: 12.5,
    fontWeight: 600,
    cursor: busy ? 'wait' : 'pointer',
    opacity: busy ? 0.6 : 1,
  });

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        flexWrap: 'wrap',
        fontSize: 12.5,
        color: DS.textSecondary,
      }}
    >
      <span style={{ fontWeight: 600, minWidth: 190 }}>
        {etiket} ({dosyalar.length} belge):
      </span>
      <button disabled={busy} onClick={() => uret(false)} style={btn(DS.navy, 'white')}>
        {busy ? 'Birleştiriliyor…' : 'Birleşik PDF Görüntüle'}
      </button>
      <button disabled={busy} onClick={() => uret(true)} style={btn('white', DS.navy, DS.border)}>
        İndir
      </button>
      {bilgi && <span style={{ color: DS.green }}>{bilgi}</span>}
      {hata && <span style={{ color: DS.red }}>{hata}</span>}
    </div>
  );
};

const BirlesikIcerikPdf = ({ record }) => {
  const karsiAd = record.otherUni || record.otherUniversity || 'Karşı kurum';
  const varMi =
    birlesikPdfListesi(record, 'karsi').length > 0 || birlesikPdfListesi(record, 'caku').length > 0;
  if (!varMi) return null;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <BirlesikPdfGrubu
        record={record}
        taraf="karsi"
        etiket={karsiAd + ' içerikleri'}
        dosyaOnEki="karsi_kurum_ders_icerikleri"
      />
      <BirlesikPdfGrubu
        record={record}
        taraf="caku"
        etiket="ÇAKÜ ders içerikleri"
        dosyaOnEki="caku_ders_icerikleri"
      />
    </div>
  );
};

// Muafiyet kaydı transkript alanı — öğrenci TEK SEFERLİK PDF yükler; yüklenince
// yalnız görüntüleme linki kalır. Personel (isStudent=false) yalnız görüntüler.
const TranscriptControl = ({ record, isStudent, onUploadTranscript }) => {
  const [busy, setBusy] = useState(false);
  const url = record.transcriptUrl || '';
  const viewHref = url ? '/api/files/view/' + String(url).replace('/api/files/download/', '') : '';
  const pick = async (e) => {
    const f = (e.target.files && e.target.files[0]) || null;
    e.target.value = '';
    if (!f) return;
    if (f.type !== 'application/pdf' && !/\.pdf$/i.test(f.name)) {
      alert('Transkript yalnızca PDF olabilir.');
      return;
    }
    setBusy(true);
    try {
      await onUploadTranscript(record.id, f);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        flexWrap: 'wrap',
        fontSize: 12.5,
        color: DS.textSecondary,
      }}
    >
      <span style={{ fontWeight: 600 }}>Transkript:</span>
      {url ? (
        <a
          href={viewHref}
          target="_blank"
          rel="noopener noreferrer"
          style={{ fontWeight: 600, color: DS.accent }}
        >
          Transkript (PDF)
        </a>
      ) : (
        <span style={{ color: DS.textMuted }}>Yüklenmedi</span>
      )}
      {isStudent && !url && onUploadTranscript && (
        <label style={{ cursor: busy ? 'wait' : 'pointer' }}>
          <input
            type="file"
            accept=".pdf,application/pdf"
            style={{ display: 'none' }}
            onChange={pick}
          />
          <span
            style={{
              ...eStageBtn,
              display: 'inline-block',
              padding: '5px 12px',
              fontSize: 12,
              opacity: busy ? 0.6 : 1,
            }}
          >
            {busy ? 'Yükleniyor…' : 'Transkript Yükle (PDF)'}
          </span>
        </label>
      )}
      {isStudent && url && (
        <span style={{ color: DS.textMuted, fontSize: 11.5 }}>· tek seferlik yüklendi</span>
      )}
    </div>
  );
};

const ExemptionHistory = ({
  records,
  loading,
  onDelete,
  onUpdateDecision,
  onGenerateDoc,
  emptyText,
  // Onay Bekleyenler sekmesi: karar paneli tıklamaya gerek kalmadan açık gelir
  expandAll,
  // Yaz intibakı faz paneli için
  currentUser,
  isStudent,
  onStageChange,
  // Öğrenci transkript yükleme (tek seferlik)
  onUploadTranscript,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedReview, setExpandedReview] = useState(null);

  var filtered = records.filter(function (r) {
    if (!searchTerm) return true;
    var term = searchTerm.toLowerCase();
    return (
      (r.studentName || '').toLowerCase().includes(term) ||
      (r.studentNo || '').toLowerCase().includes(term) ||
      (r.otherUniversity || r.otherUni || '').toLowerCase().includes(term)
    );
  });

  if (loading) {
    return (
      <div style={{ padding: 60, textAlign: 'center' }}>
        <div
          style={{
            width: 40,
            height: 40,
            margin: '0 auto 16px',
            borderRadius: '50%',
            border: '3px solid ' + DS.accentLight,
            borderTopColor: DS.accent,
            animation: 'spin 0.8s linear infinite',
          }}
        />
        <div style={{ color: DS.textSecondary, fontSize: 14 }}>Kayıtlar yükleniyor...</div>
      </div>
    );
  }

  if (records.length === 0) {
    return (
      <div
        style={{
          minHeight: 380,
          padding: '48px 32px',
          textAlign: 'center',
          background: DS.bgCard,
          borderRadius: 16,
          border: '1px solid ' + DS.border,
          boxShadow: '0 4px 20px rgba(30,58,138,0.05)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {/* Katmanlı belge illüstrasyonu */}
        <div
          style={{
            position: 'relative',
            width: 120,
            height: 120,
            marginBottom: 24,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: DS.surfaceContainer,
              border: '1px solid ' + DS.border,
              borderRadius: 14,
              transform: 'rotate(4deg)',
              opacity: 0.55,
            }}
          />
          <div
            style={{
              position: 'relative',
              width: 88,
              height: 116,
              background: DS.bgCard,
              border: '1px solid ' + DS.border,
              borderRadius: 12,
              boxShadow: DS.shadow,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              zIndex: 1,
            }}
          >
            <div style={{ width: 52, height: 5, borderRadius: 999, background: DS.surfaceHigh }} />
            <div style={{ width: 44, height: 4, borderRadius: 999, background: DS.surfaceHigh }} />
            <div style={{ width: 28, height: 4, borderRadius: 999, background: DS.surfaceHigh }} />
          </div>
        </div>
        <div
          style={{
            fontSize: 19,
            fontWeight: 700,
            fontFamily: DS.fontHead,
            color: DS.text,
            marginBottom: 8,
          }}
        >
          Henüz kayıt yok
        </div>
        <div
          style={{
            fontSize: 14,
            color: DS.textSecondary,
            maxWidth: 420,
            lineHeight: 1.6,
            fontFamily: DS.fontBody,
          }}
        >
          {emptyText || 'Yeni muafiyet işlemi yaparak ilk kaydınızı oluşturun.'}
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Arama */}
      <div style={{ marginBottom: 20, position: 'relative' }}>
        <div
          style={{
            position: 'absolute',
            left: 14,
            top: '50%',
            transform: 'translateY(-50%)',
            color: DS.textMuted,
          }}
        >
          <Icons.search />
        </div>
        <input
          value={searchTerm}
          onChange={function (e) {
            setSearchTerm(e.target.value);
          }}
          placeholder="İsim, numara veya üniversite ile arayın..."
          style={{
            width: '100%',
            padding: '12px 14px 12px 40px',
            borderRadius: DS.radiusSm,
            border: '1px solid ' + DS.border,
            fontSize: 14,
            fontFamily: 'inherit',
            outline: 'none',
            background: 'white',
          }}
        />
      </div>

      {/* Kayıt Kartları */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {filtered.map(function (rec) {
          var matchCount = (rec.matches || []).length;
          var dateStr = rec.createdAt
            ? (rec.createdAt._seconds
                ? new Date(rec.createdAt._seconds * 1000)
                : new Date(rec.createdAt)
              ).toLocaleDateString('tr-TR')
            : '';
          var isExpanded = expandAll || expandedReview === rec.id;
          var ms = rec.matches || [];
          // Akademisyen kararı esas alınır; eski (otomatik) kayıtlar için
          // tier bazlı sayım geriye dönük korunur
          var muafCount =
            ms.filter(function (m) {
              return m.adminDecision === 'confirmed';
            }).length ||
            (rec.approvedCount ??
              ms.filter(function (m) {
                return m.tier === 'approved';
              }).length);
          var redCount =
            ms.filter(function (m) {
              return m.adminDecision === 'rejected';
            }).length ||
            (rec.rejectedCount ??
              ms.filter(function (m) {
                return m.tier === 'rejected';
              }).length);
          var stat = function (text, color, bg) {
            return (
              <span
                style={{
                  background: bg,
                  color: color,
                  padding: '2px 9px',
                  borderRadius: 6,
                  fontWeight: 600,
                  fontSize: 11.5,
                }}
              >
                {text}
              </span>
            );
          };
          return (
            <div
              key={rec.id}
              style={{
                borderRadius: DS.radius,
                background: DS.bgCard,
                border: '1px solid ' + (rec.pendingReviewCount > 0 ? '#FCD34D' : DS.border),
                overflow: 'hidden',
              }}
            >
              {/* Kart Başlığı — düz düzen, avatar/emoji yok */}
              <div
                style={{
                  padding: '14px 20px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: 10,
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 700, color: DS.navy, fontSize: 15 }}>
                    {fmtName(rec.studentName) || 'İsimsiz'}
                    <span
                      style={{
                        fontWeight: 400,
                        color: DS.textMuted,
                        marginLeft: 8,
                        fontSize: 13,
                      }}
                    >
                      {rec.studentNo || '-'}
                    </span>
                  </div>
                  <div
                    style={{
                      fontSize: 12.5,
                      color: DS.textSecondary,
                      marginTop: 5,
                      display: 'flex',
                      gap: 8,
                      alignItems: 'center',
                      flexWrap: 'wrap',
                    }}
                  >
                    <span>{fmtTitle(rec.otherUniversity || rec.otherUni) || '—'}</span>
                    {dateStr && <span style={{ color: DS.textMuted }}>· {dateStr}</span>}
                    {stat(matchCount + ' ders', DS.textSecondary, DS.surfaceHigh)}
                    {muafCount > 0 && stat(muafCount + ' muaf', DS.green, DS.greenBg)}
                    {redCount > 0 && stat(redCount + ' red', DS.red, DS.redLight)}
                    {rec.pendingReviewCount > 0 &&
                      stat(rec.pendingReviewCount + ' onay bekliyor', DS.amber, DS.amberLight)}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  {!expandAll && (onUpdateDecision || isStudent) && matchCount > 0 && (
                    <button
                      onClick={function () {
                        setExpandedReview(isExpanded ? null : rec.id);
                      }}
                      style={{
                        padding: '7px 14px',
                        borderRadius: 8,
                        border: '1px solid ' + DS.border,
                        background: isExpanded ? DS.surfaceHigh : 'white',
                        color: DS.navy,
                        fontSize: 12.5,
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      {isExpanded ? 'Kapat' : isStudent ? 'Talebimi Gör' : 'İncele'}
                    </button>
                  )}
                  {onGenerateDoc &&
                    !(rec.basvuruTuru === 'intibak' && rec.stage !== 'tamamlandi') && (
                      <Button
                        small
                        variant="ghost"
                        onClick={function () {
                          onGenerateDoc(rec);
                        }}
                      >
                        Belge Oluştur
                      </Button>
                    )}
                  {/* Silme: yalnız bölüm yetkilisi (ve üstü). Hem onay
                      bekleyen hem tamamlanmış kayıtlarda görünür; süren bir
                      talep siliniyorsa uyarı ayrıca bunu söyler
                      (routes/db.js → BASVURU_SIL_DEPT_MANAGER). */}
                  {onDelete && silinebilirMi(rec, currentUser) && (
                    <Button
                      small
                      variant="danger"
                      onClick={function () {
                        var suruyor = !muafiyetTamamlandiMi(rec);
                        if (
                          confirm(
                            (rec.studentName || 'Bu öğrencinin') +
                              ' talebi ve tüm ekleri kalıcı olarak silinecek.\n\n' +
                              (suruyor
                                ? 'DİKKAT: Bu talep HÂLÂ SÜRÜYOR — henüz sonuçlandırılmadı. ' +
                                  'Öğrencinin yüklediği belgeler ve girdiği eşleştirmeler de ' +
                                  'silinecek; öğrenci talebi baştan oluşturmak zorunda kalır.\n\n'
                                : '') +
                              'Bu işlem geri alınamaz. Devam edilsin mi?'
                          )
                        )
                          onDelete(rec.id);
                      }}
                    >
                      Sil
                    </Button>
                  )}
                </div>
              </div>

              {/* Transkript — öğrenci tek seferlik yükler; herkes görüntüler.
                  Yaz intibakında transkript istenmez. */}
              {rec.basvuruTuru !== 'intibak' && (onUploadTranscript || rec.transcriptUrl) && (
                <div style={{ padding: '0 20px 12px' }}>
                  <TranscriptControl
                    record={rec}
                    isStudent={isStudent}
                    onUploadTranscript={onUploadTranscript}
                  />
                </div>
              )}

              {/* Öğrencinin yüklediği ders içerikleri — tek PDF olarak.
                  Akademisyen 20 ayrı sekme açmak zorunda kalmasın diye. */}
              {!isStudent && (
                <div style={{ padding: '0 20px 12px' }}>
                  <BirlesikIcerikPdf record={rec} />
                </div>
              )}

              {/* Onaylı dilekçe (snapshot) — YALNIZ ÖĞRENCİDE.
                  Akademisyende gösterilmez: "Belge Oluştur" akışı zaten
                  önizleme + indirme + Belge Akışı'na gönderme yapıyor, bu
                  şerit onun tekrarıydı. */}
              {isStudent && rec.dilekceUrl && (
                <div
                  style={{
                    padding: '0 20px 12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    flexWrap: 'wrap',
                    fontSize: 12.5,
                    color: DS.textSecondary,
                  }}
                >
                  <span style={{ fontWeight: 600 }}>Dilekçe:</span>
                  <a
                    href={fileHref(rec.dilekceUrl)}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ fontWeight: 600, color: DS.accent }}
                  >
                    Dilekçemi İndir
                  </a>
                </div>
              )}

              {/* Yaz intibakı iki-fazlı durum paneli (yalnız intibak kayıtları) */}
              {(rec.basvuruTuru || 'muafiyet') === 'intibak' && onStageChange && (
                <div style={{ padding: '0 20px 12px' }}>
                  <IntibakStagePanel
                    record={rec}
                    isStudent={isStudent}
                    currentUser={currentUser}
                    onStageChange={onStageChange}
                  />
                </div>
              )}

              {/* İnceleme/Talep Paneli — akademisyende karar verilebilir,
                  öğrencide salt-okunur (talebini nasıl yaptıysa görür) */}
              {isExpanded && (onUpdateDecision || isStudent) && (
                <div style={{ padding: '0 20px 16px' }}>
                  <ReviewPanel
                    record={rec}
                    readOnly={!onUpdateDecision}
                    onDecision={async function (recId, matchIdx, decision) {
                      if (onUpdateDecision) await onUpdateDecision(recId, matchIdx, decision);
                    }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && searchTerm && (
        <div style={{ padding: 40, textAlign: 'center', color: DS.textMuted, fontSize: 14 }}>
          "{searchTerm}" ile eşleşen kayıt bulunamadı.
        </div>
      )}
    </div>
  );
};

// ══════════════════════════════════════════════════════════════
// EŞİK KALİBRASYON PANELİ (Ayarlar sekmesi)
//   Akademisyen kararlarını (review → confirmed/rejected) etiketli veri
//   olarak toplar, skor dağılımını gösterir ve Youden-J ile optimal
//   eşik önerir. Eşikler muafiyet_settings/thresholds'a kaydedilir.
// ══════════════════════════════════════════════════════════════

const CALIB_MIN_LABELS = 20; // öneri için gereken asgari etiketli karar

// Etiketli (skor, karar) çiftleri üzerinde Youden-J (TPR - FPR) maksimize
// eden eşiği tara. labeled: [{ score: 0-1, approved: boolean }]
function suggestThreshold(labeled) {
  var best = null;
  for (var t = 0.3; t <= 0.9; t += 0.01) {
    var tp = 0,
      fp = 0,
      tn = 0,
      fn = 0;
    labeled.forEach(function (l) {
      var predicted = l.score >= t;
      if (predicted && l.approved) tp++;
      else if (predicted && !l.approved) fp++;
      else if (!predicted && !l.approved) tn++;
      else fn++;
    });
    var tpr = tp + fn > 0 ? tp / (tp + fn) : 0;
    var fpr = fp + tn > 0 ? fp / (fp + tn) : 0;
    var j = tpr - fpr;
    if (!best || j > best.j) best = { threshold: Math.round(t * 100) / 100, j: j };
  }
  return best;
}

const CalibrationPanel = ({ records, thresholds, onSaveThresholds }) => {
  const [autoPct, setAutoPct] = useState(Math.round(thresholds.autoApprove * 100));
  const [reviewPct, setReviewPct] = useState(Math.round(thresholds.review * 100));
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    setAutoPct(Math.round(thresholds.autoApprove * 100));
    setReviewPct(Math.round(thresholds.review * 100));
  }, [thresholds]);

  // ── Etiketli veri: akademisyenin karar verdiği tüm eşleşmeler ──
  const analysis = useMemo(() => {
    const labeled = [];
    let totalMatches = 0,
      approvedAuto = 0,
      reviewPending = 0,
      rejectedAuto = 0;
    (records || []).forEach((r) => {
      (r.matches || []).forEach((m) => {
        totalMatches++;
        const score = typeof m.contentScore === 'number' ? m.contentScore : m.score;
        if (m.tier === 'approved') approvedAuto++;
        else if (m.tier === 'rejected') rejectedAuto++;
        else if (m.tier === 'review' && !m.adminDecision) reviewPending++;
        if (m.adminDecision && typeof score === 'number') {
          labeled.push({ score, approved: m.adminDecision === 'confirmed' });
        }
      });
    });
    // Histogram: 10 kova (0-10, 10-20, ... 90-100)
    const bins = Array.from({ length: 10 }, (_, i) => ({
      label: i * 10 + '–' + (i + 1) * 10,
      confirmed: 0,
      rejected: 0,
    }));
    labeled.forEach((l) => {
      const bi = Math.min(9, Math.floor(l.score * 10));
      if (l.approved) bins[bi].confirmed++;
      else bins[bi].rejected++;
    });
    const suggestion = labeled.length >= CALIB_MIN_LABELS ? suggestThreshold(labeled) : null;
    return { labeled, totalMatches, approvedAuto, reviewPending, rejectedAuto, bins, suggestion };
  }, [records]);

  const handleSave = async (aPct, rPct) => {
    const a = aPct / 100,
      r = rPct / 100;
    if (!(r > 0 && a < 1 && r < a)) {
      setMsg('Geçersiz eşikler: inceleme eşiği, muafiyet eşiğinden küçük olmalı (0–100 arası).');
      return;
    }
    setSaving(true);
    setMsg('');
    try {
      await onSaveThresholds({ autoApprove: a, review: r });
      setMsg('Eşikler kaydedildi — yeni eşleştirmelerde geçerli.');
    } catch (e) {
      setMsg('Kaydedilemedi: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  const maxBin = Math.max(1, ...analysis.bins.map((b) => b.confirmed + b.rejected));

  const statCards = [
    { label: 'Toplam Eşleşme', value: analysis.totalMatches, color: DS.navy },
    { label: 'Otomatik Muaf', value: analysis.approvedAuto, color: DS.green },
    { label: 'Karar Bekleyen', value: analysis.reviewPending, color: DS.amber },
    { label: 'Etiketli Karar', value: analysis.labeled.length, color: DS.accent },
  ];

  return (
    <SectionCard
      title="Eşik Kalibrasyonu"
      subtitle="Akademisyen kararlarından öğrenilen skor dağılımı ve eşik ayarı"
      icon={<Icons.settings />}
    >
      {/* Özet istatistikler */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 10,
          marginBottom: 16,
        }}
      >
        {statCards.map((s) => (
          <div
            key={s.label}
            style={{
              background: DS.bg,
              border: '1px solid ' + DS.borderLight,
              borderRadius: 8,
              padding: '10px 12px',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: 22, fontWeight: 800, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 10, color: DS.textSecondary, fontWeight: 600, marginTop: 2 }}>
              {s.label}
            </div>
          </div>
        ))}
      </div>

      {/* Skor dağılımı — akademisyen kararı verilmiş eşleşmeler */}
      {analysis.labeled.length > 0 ? (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: DS.textSecondary, marginBottom: 8 }}>
            SKOR DAĞILIMI (yeşil: akademisyen muaf dedi, kırmızı: red dedi)
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 90 }}>
            {analysis.bins.map((b) => (
              <div
                key={b.label}
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'flex-end',
                  gap: 1,
                  height: '100%',
                }}
                title={b.label + '%: muaf ' + b.confirmed + ', red ' + b.rejected}
              >
                {b.confirmed > 0 && (
                  <div
                    style={{
                      background: DS.green,
                      borderRadius: 2,
                      height: Math.max(3, (b.confirmed / maxBin) * 70) + 'px',
                    }}
                  />
                )}
                {b.rejected > 0 && (
                  <div
                    style={{
                      background: DS.red,
                      borderRadius: 2,
                      height: Math.max(3, (b.rejected / maxBin) * 70) + 'px',
                    }}
                  />
                )}
                <div style={{ fontSize: 8, color: DS.textMuted, textAlign: 'center' }}>
                  {b.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div
          style={{
            padding: '12px 14px',
            background: DS.bg,
            borderRadius: 8,
            fontSize: 12,
            color: DS.textSecondary,
            marginBottom: 16,
          }}
        >
          Henüz etiketli karar yok. Akademisyenler "inceleme bekliyor" kayıtlarına muaf/red kararı
          verdikçe skor dağılımı burada birikir ve eşik önerisi oluşur.
        </div>
      )}

      {/* Öneri */}
      {analysis.suggestion ? (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '10px 14px',
            background: DS.greenBg,
            border: '1px solid ' + DS.greenLight,
            borderRadius: 8,
            marginBottom: 16,
            flexWrap: 'wrap',
          }}
        >
          <span style={{ fontSize: 12.5, color: DS.green, fontWeight: 600 }}>
            Önerilen muafiyet eşiği: %{Math.round(analysis.suggestion.threshold * 100)} (
            {analysis.labeled.length} karara dayalı Youden-J analizi)
          </span>
          <button
            onClick={() =>
              handleSave(
                Math.round(analysis.suggestion.threshold * 100),
                Math.max(1, Math.round(analysis.suggestion.threshold * 100) - 10)
              )
            }
            disabled={saving}
            style={{
              padding: '6px 14px',
              background: DS.green,
              color: 'white',
              border: 'none',
              borderRadius: 6,
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Öneriyi Uygula
          </button>
        </div>
      ) : (
        analysis.labeled.length > 0 && (
          <div style={{ fontSize: 11.5, color: DS.textMuted, marginBottom: 16 }}>
            Eşik önerisi için en az {CALIB_MIN_LABELS} etiketli karar gerekir (şu an{' '}
            {analysis.labeled.length}). Not: etiketler ağırlıkla inceleme bandından geldiği için
            öneri o bandın sınırlarını hassaslaştırır.
          </div>
        )
      )}

      {/* Manuel eşik ayarı */}
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <label
            style={{
              display: 'block',
              fontSize: 10,
              fontWeight: 700,
              color: DS.textSecondary,
              textTransform: 'uppercase',
              marginBottom: 4,
            }}
          >
            Otomatik Muafiyet Eşiği (%)
          </label>
          <input
            type="number"
            min={1}
            max={99}
            value={autoPct}
            onChange={(e) => setAutoPct(parseInt(e.target.value, 10) || 0)}
            style={{
              width: 110,
              padding: '8px 10px',
              borderRadius: 6,
              border: '1px solid ' + DS.border,
              fontSize: 13,
            }}
          />
        </div>
        <div>
          <label
            style={{
              display: 'block',
              fontSize: 10,
              fontWeight: 700,
              color: DS.textSecondary,
              textTransform: 'uppercase',
              marginBottom: 4,
            }}
          >
            İnceleme Alt Eşiği (%)
          </label>
          <input
            type="number"
            min={1}
            max={99}
            value={reviewPct}
            onChange={(e) => setReviewPct(parseInt(e.target.value, 10) || 0)}
            style={{
              width: 110,
              padding: '8px 10px',
              borderRadius: 6,
              border: '1px solid ' + DS.border,
              fontSize: 13,
            }}
          />
        </div>
        <button
          onClick={() => handleSave(autoPct, reviewPct)}
          disabled={saving}
          style={{
            padding: '9px 18px',
            background: DS.accent,
            color: 'white',
            border: 'none',
            borderRadius: 6,
            fontSize: 13,
            fontWeight: 600,
            cursor: saving ? 'wait' : 'pointer',
          }}
        >
          {saving ? 'Kaydediliyor…' : 'Eşikleri Kaydet'}
        </button>
        <span style={{ fontSize: 11, color: DS.textMuted }}>
          Geçerli: muaf ≥ %{Math.round(thresholds.autoApprove * 100)}, inceleme %
          {Math.round(thresholds.review * 100)}–{Math.round(thresholds.autoApprove * 100) - 1}
        </span>
      </div>

      {msg && (
        <div
          style={{
            marginTop: 12,
            padding: '8px 12px',
            borderRadius: 6,
            fontSize: 12,
            background: msg.includes('kaydedildi') ? DS.greenBg : DS.redLight,
            color: msg.includes('kaydedildi') ? DS.green : DS.red,
          }}
        >
          {msg}
        </div>
      )}
    </SectionCard>
  );
};

// ══════════════════════════════════════════════════════════════
// ANA MODÜL
// ══════════════════════════════════════════════════════════════

// ── Eşleştirme Geçmişi (muafiyet_history) ──
// Onaylanan ders eşleştirmelerinin bölüm arşivi. Erasmus eşleştirme
// geçmişinden (trip_history) TAMAMEN BAĞIMSIZDIR.
const MuafiyetGecmisi = ({ activeDepartment, basvuruTuru, turMeta, canDelete }) => {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const handleDelete = async (entry) => {
    if (
      !confirm(
        'Bu eşleştirme geçmişten silinecek:\n' +
          (entry.sourceCourse?.code || '') +
          ' → ' +
          (entry.cakuCourse?.code || '') +
          ' (' +
          (entry.studentName || '') +
          ')\nEmin misiniz?'
      )
    )
      return;
    try {
      await window.DBWrite.remove('muafiyet_history', String(entry.id));
      setEntries((prev) => prev.filter((e) => e.id !== entry.id));
    } catch (e) {
      alert('Silinemedi: ' + e.message);
    }
  };

  useEffect(() => {
    let alive = true;
    MuafiyetDB.fetchMuafiyetHistory()
      .then((all) => {
        if (!alive) return;
        const list = (all || []).filter(
          (e) =>
            (!activeDepartment || (e.departmentId || '') === activeDepartment) &&
            (e.basvuruTuru || 'muafiyet') === (basvuruTuru || 'muafiyet')
        );
        setEntries(list);
      })
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [activeDepartment, basvuruTuru]);

  const filtered = useMemo(() => {
    const t = search.trim().toLocaleLowerCase('tr');
    if (!t) return entries;
    return entries.filter((e) =>
      [
        e.studentName,
        e.studentNo,
        e.sourceUniversity,
        e.sourceCourse?.code,
        e.sourceCourse?.name,
        e.cakuCourse?.code,
        e.cakuCourse?.name,
      ]
        .filter(Boolean)
        .some((v) => String(v).toLocaleLowerCase('tr').includes(t))
    );
  }, [entries, search]);

  if (loading) {
    return (
      <div style={{ padding: 60, textAlign: 'center' }}>
        <div
          style={{
            width: 40,
            height: 40,
            margin: '0 auto 16px',
            borderRadius: '50%',
            border: '3px solid ' + DS.accentLight,
            borderTopColor: DS.accent,
            animation: 'spin 0.8s linear infinite',
          }}
        />
        <div style={{ color: DS.textSecondary, fontSize: 14 }}>Geçmiş yükleniyor...</div>
      </div>
    );
  }

  return (
    <div>
      <div
        style={{
          background: DS.greenBg,
          border: '1px solid ' + DS.greenLight,
          borderRadius: 10,
          padding: '10px 14px',
          marginBottom: 16,
          fontSize: 12,
          color: DS.green,
          fontWeight: 600,
        }}
      >
        {turMeta ? turMeta.label + ' — ' : ''}akademisyen tarafından ONAYLANAN ders
        eşleştirmelerinin arşividir ({entries.length}
        {' kayıt'}). Bu geçmiş yalnızca bu başvuru türüne aittir.
      </div>

      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Öğrenci, üniversite veya ders kodu ile ara..."
        style={{
          width: '100%',
          padding: '11px 14px',
          borderRadius: DS.radiusSm,
          border: '1px solid ' + DS.border,
          fontSize: 13,
          outline: 'none',
          marginBottom: 14,
          boxSizing: 'border-box',
          fontFamily: 'inherit',
        }}
      />

      {filtered.length === 0 ? (
        <div
          style={{
            padding: 50,
            textAlign: 'center',
            background: DS.bgCard,
            borderRadius: DS.radius,
            border: '1px solid ' + DS.border,
            color: DS.textSecondary,
            fontSize: 13,
          }}
        >
          {entries.length === 0
            ? 'Henüz onaylanmış eşleştirme yok. Akademisyen bir talebi onayladığında burada listelenir.'
            : 'Aramayla eşleşen kayıt yok.'}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filtered.map((e, i) => (
            <div
              key={e.id || i}
              style={{
                background: 'white',
                border: '1px solid ' + DS.border,
                borderLeft: '4px solid ' + DS.green,
                borderRadius: 10,
                padding: '12px 16px',
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                flexWrap: 'wrap',
              }}
            >
              <div style={{ flex: '2 1 260px', minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: DS.navy }}>
                  {e.sourceCourse?.code ? e.sourceCourse.code + ' — ' : ''}
                  {fmtTitle(e.sourceCourse?.name)}
                  <span style={{ color: DS.textMuted, fontWeight: 500, margin: '0 6px' }}>→</span>
                  <span style={{ color: DS.green }}>
                    {e.cakuCourse?.code ? e.cakuCourse.code + ' — ' : ''}
                    {fmtTitle(e.cakuCourse?.name)}
                  </span>
                </div>
                <div style={{ fontSize: 11, color: DS.textSecondary, marginTop: 3 }}>
                  {fmtTitle(e.sourceUniversity) || 'Kaynak kurum belirtilmemiş'}
                  {e.sourceCourse?.akts && e.cakuCourse?.akts
                    ? ' · AKTS ' + e.sourceCourse.akts + ' → ' + e.cakuCourse.akts
                    : ''}
                </div>
              </div>
              <div style={{ fontSize: 11, color: DS.textMuted, flex: '1 1 140px' }}>
                {e.studentName}
                <span style={{ fontFamily: "'JetBrains Mono', monospace", marginLeft: 5 }}>
                  #{e.studentNo}
                </span>
              </div>
              <div style={{ textAlign: 'right', fontSize: 11, color: DS.textMuted }}>
                <span
                  style={{
                    display: 'inline-block',
                    padding: '2px 8px',
                    borderRadius: 10,
                    background: DS.greenBg,
                    color: DS.green,
                    fontWeight: 700,
                    marginBottom: 2,
                  }}
                >
                  %{Math.round((e.score || 0) * 100)}
                </span>
                <div>
                  {(e.approvedAt || '').slice(0, 10)}
                  {e.approvedBy ? ' · ' + e.approvedBy : ''}
                </div>
              </div>
              {canDelete && (
                <button
                  onClick={() => handleDelete(e)}
                  title="Eşleştirmeyi geçmişten sil"
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: 7,
                    border: '1px solid ' + DS.border,
                    background: 'white',
                    color: DS.red,
                    cursor: 'pointer',
                    fontSize: 13,
                    flexShrink: 0,
                  }}
                >
                  🗑
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Başvuru türleri — modül iki bağımsız alana bölünür (ayrı geçmiş, ayrı çıktı)
const BASVURU_TURLERI = [
  {
    id: 'muafiyet',
    label: 'Ders Muafiyet İsteği',
    kisa: 'Muafiyet',
    aciklama: 'Başka kurumda alınan derslerin ÇAKÜ derslerine muafiyeti',
    color: '#00236f',
    bg: '#eef1ff',
  },
  {
    id: 'intibak',
    label: 'Yaz Dönemi Ders İntibak İsteği',
    kisa: 'Yaz İntibak',
    aciklama: 'Yaz döneminde başka kurumda alınan derslerin intibakı',
    color: '#00658a',
    bg: '#e2f2fb',
  },
  {
    id: 'dikey',
    label: 'Dikey Geçiş İsteği',
    kisa: 'Dikey Geçiş',
    aciklama: 'Dikey geçişle (önlisans→lisans) gelen öğrencinin derslerinin muafiyeti',
    color: '#0f766e',
    bg: '#ccfbf1',
  },
];

// `sabitTur` verilirse modül TEK başvuru türüne kilitlenir ve tür seçici
// gizlenir. Dikey Geçiş modülü bunu kullanır: ayrı bir modül olarak görünür
// ama muafiyet altyapısının (eşleştirme, skorlama, dilekçe) aynısını çalıştırır.
function DersMuafiyetApp({ currentUser, activeDepartment, departmentInfo, sabitTur }) {
  const isStudent = currentUser?.role === 'student';
  const tabs = isStudent ? STUDENT_TABS : STAFF_TABS;
  const [activeTab, setActiveTab] = useState(isStudent ? 'yeni' : 'onay');
  const [basvuruTuru, setBasvuruTuru] = useState(sabitTur || 'muafiyet');
  const [courseContents, setCourseContents] = useState([]);
  const [records, setRecords] = useState([]);
  const [recordsLoading, setRecordsLoading] = useState(true);
  // Üretilen belgenin önizlemesi: { blob, filename, baslik, belge }
  // Belge önce görüntülenir; kullanıcı sonra "İndir" veya "Gönder" der.
  const [onizleme, setOnizleme] = useState(null);
  const [thresholds, setThresholds] = useState({
    autoApprove: CALIBRATION.autoApprove,
    review: CALIBRATION.review,
  });

  useEffect(
    function () {
      async function loadData() {
        try {
          var contents = await MuafiyetDB.fetchCourseContents();
          if (contents.length > 0) setCourseContents(contents);
          // Kalibre edilmiş eşikler (varsa) — decideTier bu değerleri kullanır
          var savedThresholds = await MuafiyetDB.fetchThresholds();
          if (savedThresholds) {
            applyCalibration(savedThresholds);
            setThresholds({
              autoApprove: CALIBRATION.autoApprove,
              review: CALIBRATION.review,
            });
          }
          var allRecs = await MuafiyetDB.fetchRecords();
          // Bölüm bazlı filtreleme: departmentId'si olmayan veriler bilgisayar bölümüne ait
          var recs = allRecs.filter(function (r) {
            var deptId = r.departmentId || 'bilgisayar';
            return deptId === activeDepartment;
          });
          // Öğrenci yalnızca KENDİ taleplerini görür
          if (isStudent) {
            var myNo = currentUser?.studentNumber || currentUser?.identifier || '';
            recs = recs.filter(function (r) {
              return r.studentNo === myNo;
            });
          }
          setRecords(recs);
        } catch (err) {
          console.error('Muafiyet verileri yüklenirken hata:', err);
        }
        setRecordsLoading(false);
      }
      loadData();
    },
    [activeDepartment, isStudent, currentUser?.studentNumber]
  );

  // Seçili başvuru türüne göre kayıtlar (eski kayıtlar 'muafiyet' sayılır)
  const turRecords = useMemo(
    function () {
      return records.filter(function (r) {
        return (r.basvuruTuru || 'muafiyet') === basvuruTuru;
      });
    },
    [records, basvuruTuru]
  );
  const turMeta = BASVURU_TURLERI.find((t) => t.id === basvuruTuru) || BASVURU_TURLERI[0];

  const handleSaveThresholds = async function (t) {
    await MuafiyetDB.saveThresholds(
      Object.assign({}, t, { updatedBy: currentUser?.identifier || currentUser?.name || '' })
    );
    applyCalibration(t);
    setThresholds({ autoApprove: CALIBRATION.autoApprove, review: CALIBRATION.review });
  };

  const handleDeleteRecord = async function (id) {
    try {
      await MuafiyetDB.deleteRecord(id);
      setRecords(function (prev) {
        return prev.filter(function (r) {
          return r.id !== id;
        });
      });
    } catch (err) {
      alert('Silme hatası: ' + err.message);
    }
  };

  // Yaz intibakı faz geçişi (ön onay/red, belge teslim, tamamla) — audit'li
  const handleStageChange = async function (recordId, newStage, extra) {
    try {
      const updated = await MuafiyetDB.setStage(recordId, newStage, currentUser, extra);
      setRecords(function (prev) {
        return prev.map(function (r) {
          return r.id === recordId ? Object.assign({}, r, updated, { id: recordId }) : r;
        });
      });
    } catch (err) {
      alert('Faz güncellenemedi: ' + err.message);
    }
  };

  // Öğrenci transkript yükleme — her muafiyet kaydı için TEK SEFERLİK.
  // Kayıtta transcriptUrl varsa yükleme UI'si gösterilmez (yalnız görüntüleme).
  const handleUploadTranscript = async function (recordId, file) {
    const rec = records.find(function (r) {
      return r.id === recordId;
    });
    if (rec && rec.transcriptUrl) {
      alert(
        'Bu talep için transkript zaten yüklenmiş. Her muafiyet için yalnızca bir kez yüklenebilir.'
      );
      return;
    }
    const url = await uploadMuafiyetFile(file);
    if (!url) {
      alert('Transkript yüklenemedi. Lütfen tekrar deneyin.');
      return;
    }
    const patch = {
      transcriptUrl: url,
      transcriptUploadedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    try {
      await window.DBWrite.update('muafiyet_records', String(recordId), patch);
      setRecords(function (prev) {
        return prev.map(function (r) {
          return r.id === recordId ? Object.assign({}, r, patch) : r;
        });
      });
      if (window.audit)
        window.audit('muafiyet_transcript', 'muafiyet_records', String(recordId), {});
    } catch (err) {
      alert('Transkript kaydedilemedi: ' + err.message);
    }
  };

  // ── Şablondan belge üret ──
  // Şablonlar modülünde 'muafiyet' modülüne atanmış .docx şablonunu çözer,
  // alan eşlemesine göre kayıt verileriyle doldurur ve indirir.
  const handleGenerateDoc = async function (rec) {
    try {
      // Belge türü: kaydın başvuru türü (muafiyet | intibak); şablon buna göre çözülür
      const docType = rec.basvuruTuru || 'muafiyet';
      // Yaz intibakı çok aşamalıdır ve başarı notları ancak 2. adımda girilir.
      // Belge süreç bitmeden üretilirse {{karşı_başarı_notu}} /
      // {{çakü_başarı_notu}} boş çıkar — bu yüzden yalnız 'tamamlandi'da üretilir.
      if (docType === 'intibak' && rec.stage !== 'tamamlandi') {
        alert(
          'Yaz intibakı belgesi, tüm aşamalar tamamlandıktan sonra üretilir.\n' +
            'Başarı notları girilmeden belge boş alanlarla oluşurdu.'
        );
        return;
      }
      const turAd = (BASVURU_TURLERI.find((t) => t.id === docType) || {}).label || 'Muafiyet';

      // Belgeye yalnızca ONAYLANAN dersler girer; hiç onay yoksa tüm talepler
      const ms = rec.matches || [];
      const confirmed = ms.filter(function (m) {
        return m.adminDecision === 'confirmed';
      });
      const rowsSrc = confirmed.length > 0 ? confirmed : ms;
      // AKTS değerlerini önce sayıya normalize et — satır ile toplam AYNI kaynaktan
      const aktsNum = function (v) {
        const n = parseInt(String(v == null ? '' : v).replace(/[^\d]/g, ''), 10);
        return isNaN(n) ? 0 : n;
      };
      // Yaz intibakında başarı notlarını ÖĞRENCİ girer (2. adım) ve
      // `ogrenciNotlari` alanında tutulur. Belgedeki {{karşı_başarı_notu}} /
      // {{çakü_başarı_notu}} yer tutucuları öncelikle bu değerlerle dolar;
      // akademisyen ayrıca not dönüşümü girdiyse (convertedGrade) o kazanır.
      const ogrNot = rec.ogrenciNotlari || {};
      const rows = rowsSrc.map(function (m, i) {
        const src = m.sourceCourse || m.source || {};
        const cak = m.localCourse || m.target || {};
        const kAkts = aktsNum(src.akts);
        const cAkts = aktsNum(cak.akts);
        const notAnahtar = String(m.id != null ? m.id : i);
        const ogr = ogrNot[notAnahtar] || {};
        return {
          kDersKod: src.code || '',
          kDersAd: src.name || '',
          kDersAkts: kAkts ? String(kAkts) : '',
          kDersNot: src.grade || ogr.kaynakNot || '',
          cDersKod: cak.code || '',
          cDersAd: cak.name || '',
          cDersAkts: cAkts ? String(cAkts) : '',
          cDersNot: m.convertedGrade || cak.grade || ogr.cakuNot || '',
          cDersStatu: cak.statu || '',
          _kAkts: kAkts,
          _cAkts: cAkts,
        };
      });
      const sumBy = function (key) {
        return rows.reduce(function (a, r) {
          return a + (r[key] || 0);
        }, 0);
      };
      // Öğrencinin iletişim bilgilerini (Benim Sayfam → student_profiles)
      // belge üretimine dahil et. Kayıt yoksa alanlar boş kalır (şablon
      // eşlemesi "Sabit metin"/"Atla" ile de doldurulabilir).
      let ogrProfil = {};
      if (rec.studentNo) {
        try {
          const pr = await window.apiReadDoc('student_profiles', String(rec.studentNo));
          ogrProfil = (pr && (pr.data || (pr.exists ? pr.data : null))) || {};
        } catch (_) {
          ogrProfil = {};
        }
      }
      const staticData = {
        ogrenciNo: rec.studentNo || '',
        ogrenciAdSoyad: rec.studentName || '',
        ogrenciAdSoyadTamlanan: window.trGenitive
          ? window.trGenitive(rec.studentName || '')
          : rec.studentName || '',
        kaynakUniversite: rec.otherUni || rec.otherUniversity || '',
        kaynakFakulte: rec.otherFaculty || '',
        kaynakBolum: rec.otherDept || rec.otherDepartment || '',
        cakuBolum: rec.localDept || departmentInfo?.name || '',
        kaynakToplamAkts: String(sumBy('_kAkts')),
        cakuToplamAkts: String(sumBy('_cAkts')),
        akademikYil: rec.akademikYil || '',
        donem: rec.donem || '',
        tarih: new Date().toLocaleDateString('tr-TR'),
        // Öncelik başvuru formunda girilen değerlerdedir: öğrenci talebi
        // gönderirken bunları zorunlu olarak doldurdu ve o an geçerliydi.
        // Profil yalnızca eski (bu alanlar eklenmeden önce açılmış) kayıtlar
        // için yedektir.
        ogrenciTelefon: rec.studentPhone || ogrProfil.phone || '',
        ogrenciEposta: rec.studentEmail || ogrProfil.email || '',
        ogrenciAdres: rec.studentAddress || ogrProfil.address || '',
      };

      const res = await window.TemplateEngine.produceFromTemplate({
        module: 'muafiyet',
        docType,
        departmentId: rec.departmentId || activeDepartment || '',
        staticData,
        rows,
        filename: turAd.replace(/\s+/g, '_') + '_' + (rec.studentNo || 'kayit') + '.docx',
        // Doğrudan indirme YOK: belge önce önizlenir, kullanıcı sonra
        // "İndir" veya "Gönder" der.
        noDownload: true,
      });
      if (res.ok) {
        // Dilekçeyi snapshot olarak sakla → öğrenci ve akademisyen AYNI
        // dosyayı indirir. Dosyanın kendisi düzenlenebilir bir .docx'tir.
        // Akademisyen belgeyi zaten indirdi; snapshot başarısız olsa da akış
        // bloklanmaz.
        try {
          const docFile = new File([res.blob], res.filename || 'dilekce.docx', {
            type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          });
          const url = await uploadMuafiyetFile(docFile);
          if (url) {
            const patch = {
              dilekceUrl: url,
              dilekceUploadedAt: new Date().toISOString(),
              dilekceBy: currentUser?.name || currentUser?.identifier || '',
              updatedAt: new Date().toISOString(),
            };
            await window.DBWrite.update('muafiyet_records', String(rec.id), patch);
            // Belge Akışı artık ÖNİZLEMEDEN sonra, kullanıcı "Gönder" derse
            // uygulanır — belgeyi görmeden gönderilmiş olmaz.
            const belgeKimligi = {
              module: 'muafiyet',
              docType: docType,
              sourceId: String(rec.id),
              title:
                (window.formatCaseTr
                  ? window.formatCaseTr(rec.studentName, 'name')
                  : rec.studentName || '') + (rec.studentNo ? '  ·  ' + rec.studentNo : ''),
              subtitle: turAd,
              url: url,
              ogrenciNo: rec.studentNo || '',
              departmentId: rec.departmentId || '',
            };
            setOnizleme({
              blob: res.blob,
              filename: res.filename || 'belge.docx',
              baslik: turAd + ' — ' + (rec.studentName || ''),
              belge: belgeKimligi,
            });
            setRecords(function (prev) {
              return prev.map(function (r) {
                return r.id === rec.id ? Object.assign({}, r, patch) : r;
              });
            });
          }
        } catch (e) {
          console.warn('Dilekçe snapshot kaydedilemedi:', e && e.message);
        }
        return;
      }
      const mesajlar = {
        'no-template':
          turAd +
          ' için şablon bulunamadı.\nŞablonlar modülünden "Ders Muafiyet" modülü → "' +
          turAd +
          '" belge türüne bir .docx şablonu yükleyip 🧩 ile eşleyin.',
        'not-docx': 'Atanan şablon .docx değil — belge üretimi yalnızca .docx ile çalışır.',
        'no-mapping':
          'Şablonun alan eşlemesi yapılmamış.\nŞablonlar modülünde 🧩 (Alanlar) butonuyla ' +
          'yer tutucuları değişkenlere eşleyin.',
        'invalid-output': 'Şablondan geçerli belge üretilemedi (şablon yapısı desteklenmiyor).',
      };
      alert(mesajlar[res.reason] || 'Belge oluşturulamadı: ' + (res.message || ''));
    } catch (e) {
      console.error('Belge üretim hatası:', e);
      alert('Belge oluşturulamadı: ' + e.message);
    }
  };

  const handleUpdateDecision = async function (recordId, matchIndex, decision) {
    try {
      var updatedMatches = await MuafiyetDB.updateMatchDecision(
        recordId,
        matchIndex,
        decision,
        '',
        currentUser?.name || currentUser?.identifier || ''
      );
      // Kayıtları güncelle
      setRecords(function (prev) {
        return prev.map(function (r) {
          if (r.id !== recordId) return r;
          var pendingLeft = updatedMatches.filter(function (m) {
            return m.tier === 'review' && !m.adminDecision;
          }).length;
          return Object.assign({}, r, { matches: updatedMatches, pendingReviewCount: pendingLeft });
        });
      });
    } catch (err) {
      alert('Karar güncellenemedi: ' + err.message);
    }
  };

  return (
    <div>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        .muafiyet-tab-btn { position: relative; }
        .muafiyet-tab-btn::after {
          content: ''; position: absolute; bottom: -2px; left: 50%; width: 0; height: 3px;
          background: ${DS.accent}; border-radius: 2px; transition: all 0.25s ease;
          transform: translateX(-50%);
        }
        .muafiyet-tab-btn.active::after { width: 100%; }
        input:focus, select:focus { border-color: ${DS.accent} !important; box-shadow: 0 0 0 3px ${DS.accentLight}; }
      `}</style>

      <div style={{ maxWidth: 1400, margin: '0 auto', padding: '0 4px 40px' }}>
        {/* Başlık — ortak banner */}
        {React.createElement(window.CakuBanner, {
          title: sabitTur ? turMeta.label : 'Ders Muafiyet & İntibak',
          subtitle: turMeta.aciklama,
        })}

        {/* Başvuru türü seçici — sabit türde (ör. Dikey Geçiş modülü) gizlenir */}
        <div
          style={{
            display: sabitTur ? 'none' : 'flex',
            gap: 10,
            marginBottom: 22,
            flexWrap: 'wrap',
          }}
        >
          {BASVURU_TURLERI.filter(function (t) {
            // Dikey geçiş kendi modülünde yürüdüğü için burada listelenmez.
            return t.id !== 'dikey';
          }).map(function (t) {
            var sel = basvuruTuru === t.id;
            var cnt = records.filter(function (r) {
              return (r.basvuruTuru || 'muafiyet') === t.id;
            }).length;
            return (
              <button
                key={t.id}
                className="muafiyet-action-card"
                onClick={function () {
                  setBasvuruTuru(t.id);
                  setActiveTab(isStudent ? 'yeni' : 'onay');
                }}
                style={{
                  flex: '1 1 300px',
                  textAlign: 'left',
                  padding: '16px 18px',
                  borderRadius: 12,
                  cursor: 'pointer',
                  border: (sel ? '2px solid ' : '1px solid ') + (sel ? DS.navy : DS.border),
                  borderLeft: '3px solid ' + (sel ? DS.navy : DS.border),
                  background: sel ? DS.accentLight + '55' : DS.bgCard,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 16,
                }}
              >
                <span style={{ minWidth: 0, flex: 1 }}>
                  <span
                    style={{
                      display: 'block',
                      fontSize: 16,
                      fontWeight: 700,
                      fontFamily: DS.fontHead,
                      color: sel ? DS.navy : DS.text,
                      marginBottom: 6,
                    }}
                  >
                    {t.label}
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span
                      style={{
                        padding: '2px 10px',
                        borderRadius: 999,
                        background: sel ? DS.accentLight : DS.surfaceHigh,
                        color: sel ? DS.navy : DS.textSecondary,
                        fontSize: 11.5,
                        fontWeight: 600,
                      }}
                    >
                      {cnt} kayıt
                    </span>
                    <span style={{ fontSize: 12, color: DS.textSecondary, opacity: 0.85 }}>
                      {t.aciklama}
                    </span>
                  </span>
                </span>
              </button>
            );
          })}
        </div>

        {/* Tab Bar */}
        <div
          style={{
            display: 'flex',
            gap: 2,
            marginBottom: 28,
            borderBottom: '2px solid ' + DS.borderLight,
          }}
        >
          {tabs.map(function (tab) {
            var isActive = activeTab === tab.id;
            var pendingCount = turRecords.filter(function (r) {
              return r.pendingReviewCount > 0;
            }).length;
            return (
              <button
                key={tab.id}
                className={'muafiyet-tab-btn' + (isActive ? ' active' : '')}
                onClick={function () {
                  setActiveTab(tab.id);
                }}
                style={{
                  padding: '12px 20px',
                  border: 'none',
                  background: 'transparent',
                  color: isActive ? DS.navy : DS.textMuted,
                  fontSize: 14,
                  fontWeight: isActive ? 700 : 500,
                  cursor: 'pointer',
                  borderRadius: '8px 8px 0 0',
                  fontFamily: DS.fontBody,
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                {tab.label}
                {tab.id === 'onay' && pendingCount > 0 && (
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      background: DS.amberLight,
                      color: DS.amber,
                      padding: '1px 7px',
                      borderRadius: 10,
                      border: '1px solid #FCD34D',
                    }}
                  >
                    {pendingCount}
                  </span>
                )}
                {tab.id === 'gecmis' && turRecords.length > 0 && (
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      background: isActive ? DS.accent : DS.borderLight,
                      color: isActive ? 'white' : DS.textMuted,
                      padding: '1px 7px',
                      borderRadius: 10,
                    }}
                  >
                    {turRecords.length}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Dikey geçiş: DGS taban puan şartı — yalnız akademisyen tarafında,
            liste sekmelerinde. "Ayarlar" sekmesinde yeri yok. */}
        {sabitTur === 'dikey' && !isStudent && activeTab !== 'ayarlar' && (
          <DikeyTabanPuanPaneli
            records={turRecords}
            currentUser={currentUser}
            activeDepartment={activeDepartment}
            departmentInfo={departmentInfo}
            onKayit={function (id, patch) {
              setRecords(function (prev) {
                return prev.map(function (r) {
                  return (r.id || r._docId) === id ? Object.assign({}, r, patch) : r;
                });
              });
            }}
          />
        )}

        {/* Tab İçeriği */}
        {/* Ayarlar: yalnızca eşik kalibrasyonu (katalog/not tablosu yükleme kaldırıldı) */}
        {activeTab === 'ayarlar' && !isStudent && (
          <CalibrationPanel
            records={turRecords}
            thresholds={thresholds}
            onSaveThresholds={handleSaveThresholds}
          />
        )}
        {/* Yeni Muafiyet: yalnızca öğrenci oluşturur; akademisyen onaylar */}
        {activeTab === 'yeni' && isStudent && (
          <ManualExemptionForm
            key={basvuruTuru}
            currentUser={currentUser}
            courseContents={courseContents}
            basvuruTuru={basvuruTuru}
            turMeta={turMeta}
            onSave={function (saved) {
              setRecords(function (prev) {
                return [saved, ...prev];
              });
            }}
          />
        )}
        {/* Onay Bekleyenler: akademisyen — karar bekleyen talepler */}
        {activeTab === 'onay' && !isStudent && (
          <ExemptionHistory
            records={turRecords.filter(function (r) {
              // Karar bekleyen dersler VEYA yaz intibakında akademisyen aksiyonu
              // bekleyen faz (ön onay / belge teslim sonrası not dönüşümü).
              if (r.pendingReviewCount > 0) return true;
              return (
                (r.basvuruTuru || 'muafiyet') === 'intibak' &&
                (r.stage === 'on_inceleme' || r.stage === 'belge_teslim')
              );
            })}
            loading={recordsLoading}
            onDelete={handleDeleteRecord}
            onUpdateDecision={handleUpdateDecision}
            onGenerateDoc={handleGenerateDoc}
            onStageChange={handleStageChange}
            currentUser={currentUser}
            isStudent={isStudent}
            expandAll
            emptyText="Onay bekleyen talep yok. Öğrenciler yeni talep gönderdiğinde burada listelenir."
          />
        )}
        {activeTab === 'gecmis' && (
          <ExemptionHistory
            records={turRecords}
            loading={recordsLoading}
            onDelete={isStudent ? null : handleDeleteRecord}
            onUpdateDecision={isStudent ? null : handleUpdateDecision}
            onGenerateDoc={isStudent ? null : handleGenerateDoc}
            onStageChange={handleStageChange}
            onUploadTranscript={handleUploadTranscript}
            currentUser={currentUser}
            isStudent={isStudent}
            emptyText={
              isStudent
                ? '"' +
                  turMeta.label +
                  '" için henüz talebiniz yok. "Yeni Talep" sekmesinden oluşturabilirsiniz.'
                : turMeta.label + ' için henüz kayıt yok.'
            }
          />
        )}
        {activeTab === 'esgecmis' && (
          <MuafiyetGecmisi
            key={basvuruTuru}
            activeDepartment={activeDepartment}
            basvuruTuru={basvuruTuru}
            turMeta={turMeta}
            canDelete={!isStudent}
          />
        )}
      </div>

      {/* Belge önizleme — üretilen belge önce görüntülenir, sonra indirilir
          veya bir göreve gönderilir. */}
      {onizleme &&
        window.BelgeOnizlemeModal &&
        React.createElement(window.BelgeOnizlemeModal, {
          blob: onizleme.blob,
          filename: onizleme.filename,
          baslik: onizleme.baslik,
          onClose: function () {
            setOnizleme(null);
          },
          onSend: onizleme.belge
            ? async function () {
                if (window.belgeOtoYonlendir) await window.belgeOtoYonlendir(onizleme.belge);
              }
            : null,
        })}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// Manuel Muafiyet Formu (Öğrenci için satır-bazlı akış)
//   Her satırda iki yan: Karşı kurum dersi + ÇAKÜ dersi.
//   Her yan için: ad, kod, AKTS, statü (Z/S), içerik dosyası (PDF/DOCX).
//   Karar kuralı (akademisyen sihirbazıyla ortak — decideTier):
//     • İsim benzerliği ŞART DEĞİL
//     • AKTS kapısı: kaynak AKTS ≥ hedef AKTS × 0.7
//     • İçerik ≥ %70 → otomatik muaf, %60–69 → akademisyen onayı, <%60 → red
// ══════════════════════════════════════════════════════════════
// Transkriptten okunacak sütunlar. Dar tutuldu: her sütun her satırda
// tekrar ettiği için çıktı token'ını (ve maliyeti) doğrudan çarpar.
const AI_TRANSKRIPT_SUTUNLARI = [
  { id: 'dersKodu', label: 'Ders Kodu', hint: 'örn. BLM101' },
  { id: 'dersAdi', label: 'Ders Adı' },
  { id: 'akts', label: 'AKTS', hint: 'yalnız sayı; kredi sütunuyla karıştırma' },
  { id: 'statu', label: 'Zorunlu/Seçmeli', hint: 'Z veya S; belgede yoksa boş bırak' },
];

// Transkriptin BAŞLIK bilgisi — karşı kurumun kimliği. Her ders satırında
// aynı olduğu için sütun değil, ayrı bir alan çıkarımıdır.
const AI_TRANSKRIPT_UST_BILGI = [
  {
    id: 'karsiUniversite',
    label: 'Üniversite',
    hint: 'Transkripti düzenleyen üniversitenin tam adı',
  },
  { id: 'karsiFakulte', label: 'Fakülte / Yüksekokul' },
  { id: 'karsiBolum', label: 'Bölüm / Program' },
];

// Ders eşleştirme alanlarının yazım kuralı: her kelimenin ilk harfi büyük,
// kalanı küçük ("MATEMATİK I" → "Matematik I"). Kod ve statü bu kuralın
// DIŞINDADIR — onlar büyük harf kalır. Kural elle girişte de transkriptten
// otomatik aktarımda da aynı yerden geçer ki iki yol farklı sonuç vermesin.
const BASLIK_ALANLARI = new Set(['name', 'uni', 'faculty', 'dept']);

// Ders adlarında roma rakamı çok yaygındır (Matematik I, Fizik II, Kimya III)
// ve düz başlık düzeni onları bozar: "FİZİK II" → "Fizik Ii". Bu yüzden
// başlık düzeninden SONRA, yalnız I/V/X harflerinden oluşan ve GERÇEKTEN
// geçerli bir roma rakamı olan kelimeler tekrar büyütülür. Küme bilerek dar
// tutuldu (L/C/D/M yok) — "Dil", "Mil" gibi Türkçe kelimeler rakam sanılmasın.
const ROMEN_HARF = { ı: 'I', i: 'I', I: 'I', İ: 'I', v: 'V', V: 'V', x: 'X', X: 'X' };
const ROMEN_GECERLI = /^X{0,3}(IX|IV|V?I{0,3})$/;
function romenBuyut(kelime) {
  if (kelime.length > 4) return kelime;
  let ascii = '';
  for (const ch of kelime) {
    const m = ROMEN_HARF[ch];
    if (!m) return kelime;
    ascii += m;
  }
  return ascii && ROMEN_GECERLI.test(ascii) ? ascii : kelime;
}

const baslikYaz = (v) => {
  const s = window.formatCaseTr ? window.formatCaseTr(v, 'title') : String(v == null ? '' : v);
  return String(s == null ? '' : s).replace(/[^\s.,;:()/-]+/g, romenBuyut);
};
const bicimAlan = (field, value) =>
  BASLIK_ALANLARI.has(field) && typeof value === 'string' ? baslikYaz(value) : value;

const emptyManualRow = function () {
  return {
    id: 'r' + Math.random().toString(36).slice(2, 9),
    src: {
      uni: '',
      faculty: '',
      dept: '',
      name: '',
      code: '',
      akts: '',
      statu: 'Z',
      file: null,
      fileName: '',
      content: '',
      bolognaLink: '', // karşı kurumun ders Bologna sayfası — ZORUNLU
    },
    cak: {
      name: '',
      code: '',
      akts: '',
      statu: 'Z',
      file: null,
      fileName: '',
      content: '',
      bolognaLink: '', // Ders Yönetimi'nden otomatik gelir
      selKey: '', // dropdown'da seçili katalog dersi
      manual: false, // true → elle giriş modu (ders listede yoksa)
      fromCatalog: false, // içerik katalogdan otomatik dolduruldu
    },
  };
};

// 'Zorunlu'/'Z'/'SEÇMELİ' gibi serbest statü metnini Z/S'ye indirger
const normalizeStatu = (s) => {
  const t = String(s || '')
    .trim()
    .toLocaleLowerCase('tr');
  if (t.startsWith('s')) return 'S';
  if (t.startsWith('z')) return 'Z';
  return '';
};

const ManualExemptionForm = ({ currentUser, onSave, courseContents, basvuruTuru, turMeta }) => {
  const [studentName, setStudentName] = useState(currentUser?.name || '');
  const [studentNo, setStudentNo] = useState(
    currentUser?.studentNumber || currentUser?.identifier || ''
  );
  // İletişim bilgileri — dilekçe şablonunda {{öğrenci_telefon/eposta/adres}}
  // yer tutucuları var. Önce Benim Sayfam profilinden doldurulur; profil boşsa
  // öğrenci burada girer ve girilen değer talebe yazılır (belge üretimi kayıttan
  // okur, profile geri yazmayız — profil öğrencinin kendi ekranıdır).
  const [studentPhone, setStudentPhone] = useState('');
  const [studentEmail, setStudentEmail] = useState('');
  const [studentAddress, setStudentAddress] = useState('');
  const [rows, setRows] = useState([emptyManualRow()]);
  const [processing, setProcessing] = useState(false);
  const [msg, setMsg] = useState({ text: '', kind: '' });
  // Kayıt sonrası gösterilen sonuç paneli — özet + her ders için skor kırılımı.
  const [resultPanel, setResultPanel] = useState(null);
  // Transkript (e-Devlet karekodlu PDF) — yeni talep gönderilirken zorunlu.
  const [transcriptFile, setTranscriptFile] = useState(null);
  const [transcriptName, setTranscriptName] = useState('');

  // Benim Sayfam'daki iletişim bilgilerini bir kez oku ve BOŞ alanları doldur.
  // Öğrencinin bu formda yazdığı değerin üzerine yazmayız (geç gelen yanıt
  // yazdıklarını silmesin diye).
  useEffect(() => {
    const no = String(studentNo || '').trim();
    if (!no || !window.apiReadDoc) return undefined;
    let iptal = false;
    (async () => {
      try {
        const pr = await window.apiReadDoc('student_profiles', no);
        const p = (pr && pr.data) || {};
        if (iptal) return;
        if (p.phone) setStudentPhone((v) => v || p.phone);
        if (p.email) setStudentEmail((v) => v || p.email);
        if (p.address) setStudentAddress((v) => v || p.address);
      } catch (_e) {
        /* profil yoksa alanlar elle doldurulur */
      }
    })();
    return () => {
      iptal = true;
    };
  }, [studentNo]);

  // Yaz intibakında 21 AKTS tavanı — öğrencinin ÇAKÜ'de saydıracağı derslerin
  // (kabul edilen kredi yükü) AKTS toplamı üzerinden canlı izlenir (MADDE 9/1).
  const isIntibak = basvuruTuru === 'intibak';
  const toplamYazAkts = rows.reduce((t, r) => t + (parseInt(r.cak?.akts, 10) || 0), 0);
  const aktsTavaniAsildi = isIntibak && toplamYazAkts > YAZ_AKTS_CAP;

  const tr = (v) => (typeof v === 'string' ? v.toLocaleUpperCase('tr-TR') : v);
  const updateSide = (rowId, side, field, value) => {
    // Kod ve statü BÜYÜK; metin alanları (ders adı, üniversite, fakülte,
    // bölüm) her kelimenin ilk harfi büyük kalanı küçük. Kural elle yazımda
    // da transkriptten otomatik aktarımda da aynı uygulanır (bkz. bicimAlan).
    const v = field === 'code' || field === 'statu' ? tr(value) : bicimAlan(field, value);
    setRows((prev) =>
      prev.map((r) => (r.id === rowId ? { ...r, [side]: { ...r[side], [field]: v } } : r))
    );
  };
  const updateNumeric = (rowId, side, field, value) => {
    const v = String(value || '').replace(/\D/g, '');
    setRows((prev) =>
      prev.map((r) => (r.id === rowId ? { ...r, [side]: { ...r[side], [field]: v } } : r))
    );
  };
  const handleFile = async (rowId, side, file) => {
    if (!file) return;
    try {
      // pdfjs / mammoth CDN'leri ilk dosya yüklemede tek seferlik indirilir.
      await ensureLibsLoaded();
      let text = '';
      if (file.name.toLowerCase().endsWith('.pdf')) {
        text = await extractTextFromPDF(file);
      } else if (file.name.toLowerCase().match(/\.docx?$/)) {
        text = await extractTextFromDOCX(file);
      } else {
        setMsg({ text: 'Sadece PDF ve Word (.docx) destekleniyor.', kind: 'error' });
        return;
      }
      const cleaned = (text || '').replace(/\s+/g, ' ').trim();
      const charCount = cleaned.length;
      const tokens = tokenize(cleaned);
      // PDF font encoding tespiti: metinde Türkçe diakritik (ç ğ ı ş ö ü) oranı
      // çok düşükse veya rakam-yoğun anlamsız token'lar yüksekse bozuk font
      // varsayılır. Bu durumda kullanıcıya OCR önerisi yapılır.
      const diacriticChars = (cleaned.match(/[çğıöşüÇĞİÖŞÜ]/g) || []).length;
      const turkishRatio = charCount > 0 ? diacriticChars / charCount : 0;
      const garbageRatio = (() => {
        if (tokens.length === 0) return 1;
        // Türkçede ünlü harf içermeyen token (örn. "huvlq", "gqnr", "xox")
        const gibberish = tokens.filter((t) => !/[aeıioöuü]/.test(t)).length;
        return gibberish / tokens.length;
      })();
      const encodingBroken = charCount > 200 && turkishRatio < 0.005 && garbageRatio > 0.2;
      if (charCount < 50) {
        setMsg({
          text:
            'Dosyadan yalnızca ' +
            charCount +
            ' karakter okunabildi (' +
            file.name +
            '). Bu PDF büyük ihtimalle taranmış görüntü tabanlı — pdf.js metin çıkaramıyor. ' +
            'Lütfen seçilebilir metinli (text-based) bir PDF veya Word (.docx) dosyası yükleyin.',
          kind: 'error',
        });
      } else if (encodingBroken) {
        setMsg({
          text:
            file.name +
            " okundu ama metin OKUNABİLİR DEĞİL — PDF'in font haritası eksik " +
            '(gömülü olmayan font veya custom encoding). pdf.js ham unicode kodlarını ' +
            'döküyor (örn. "0ø.52øù"). Çözüm: bu PDF\'i Word\'e dönüştürüp .docx olarak yükleyin, ' +
            'veya kaynak kurumdan metinli bir kopya isteyin. NLP karşılaştırması yapılamaz.',
          kind: 'error',
        });
      } else {
        setMsg({
          text: file.name + ' yüklendi (' + charCount + ' karakter metin çıkarıldı).',
          kind: 'success',
        });
      }
      setRows((prev) =>
        prev.map((r) =>
          r.id === rowId
            ? {
                ...r,
                [side]: {
                  ...r[side],
                  file,
                  fileName: file.name,
                  content: cleaned,
                  contentChars: charCount,
                  encodingBroken,
                  fromCatalog: false, // elle yüklenen dosya katalog içeriğini geçersiz kılar
                },
              }
            : r
        )
      );
    } catch (e) {
      console.error('[Muafiyet] Dosya okuma hatası:', e);
      setMsg({ text: 'Dosya okunamadı: ' + e.message, kind: 'error' });
    }
  };

  // ── ÇAKÜ ders listesi: sinav_dersler (bölüm dersleri) ∪ muafiyet kataloğu.
  // Kod bazında birleştirilir — AKTS/statü/içerik katalogdan zenginleştirilir;
  // katalogda olmayan bölüm dersleri de listede kalır (AKTS elle girilir).
  const [deptCourses, setDeptCourses] = useState([]);
  useEffect(() => {
    let alive = true;
    window
      .apiRead('sinav_dersler')
      .then((all) => {
        if (!alive) return;
        const deptId = currentUser?.departmentId || '';
        const list = (all || []).filter((c) => !deptId || (c.departmentId || '') === deptId);
        setDeptCourses(list);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [currentUser?.departmentId]);

  const cakOptions = useMemo(() => {
    const normCode = (c) =>
      String(c || '')
        .replace(/\s/g, '')
        .toLocaleUpperCase('tr');
    // Katalog kayıtlarını koda göre indeksle (AKTS + statü + içerik kaynağı)
    const catalogByCode = new Map();
    (courseContents || []).forEach((c) => {
      const k = normCode(c.code);
      if (k) catalogByCode.set(k, c);
    });
    const merged = new Map(); // normCode → seçenek
    const put = (course, cat) => {
      const code = course.code || '';
      const name = course.name || '';
      const k = normCode(code) || 'N:' + name;
      if (merged.has(k)) return;
      merged.set(k, {
        code,
        name,
        // ÖNCELİK: dersin kendi alanları (Ders Yönetimi'nde akademisyen
        // AKTS + Z/S + Bologna girer); eksikse katalogdan tamamlanır
        akts: course.akts || (cat && cat.akts) || '',
        statu: course.statu || (course.sinif === 5 ? 'S' : '') || (cat && cat.status) || '',
        bolognaLink: course.bolognaLink || '',
        content: (cat && (cat.weeklyContent || cat.content)) || '',
      });
    };
    // 1) Bölüm dersleri — Ders Yönetimi kaynağı (AKTS + Z/S + Bologna linki)
    deptCourses.forEach((c) => {
      if (c.name) put(c, catalogByCode.get(normCode(c.code)));
    });
    // 2) Yalnızca katalogda olan dersler
    (courseContents || []).forEach((c) => {
      if (c.name) put({ code: c.code, name: c.name, akts: c.akts, statu: c.status }, c);
    });
    return [...merged.values()]
      .map((c) => ({ ...c, key: (c.code || '') + '::' + c.name }))
      .sort((a, b) => (a.code || a.name).localeCompare(b.code || b.name, 'tr'));
  }, [courseContents, deptCourses]);

  // Dropdown'dan ders seçimi: kod + AKTS + statü otomatik dolar;
  // katalogda yeterli içerik varsa içerik dosyası da otomatik doldurulur.
  const selectCakCourse = (rowId, key) => {
    const opt = cakOptions.find((o) => o.key === key);
    setRows((prev) =>
      prev.map((r) => {
        if (r.id !== rowId) return r;
        if (!opt) {
          // seçim temizlendi — katalogdan gelen içerik de temizlenir
          const cleared = { ...r.cak, selKey: '', name: '', code: '', akts: '', bolognaLink: '' };
          if (r.cak.fromCatalog) {
            cleared.content = '';
            cleared.contentChars = 0;
            cleared.fileName = '';
            cleared.fromCatalog = false;
          }
          return { ...r, cak: cleared };
        }
        const content = (opt.content || '').replace(/\s+/g, ' ').trim();
        const hasContent = content.length >= 50;
        return {
          ...r,
          cak: {
            ...r.cak,
            selKey: key,
            // Katalogda ders adları çoğunlukla BÜYÜK yazılı; ekranda ve
            // belgede elle girişle aynı biçimi görmek için başlık düzenine
            // çevrilir. Kod büyük kalır.
            name: baslikYaz(opt.name),
            code: tr(opt.code),
            akts: String(opt.akts || '').replace(/\D/g, ''),
            statu: normalizeStatu(opt.statu) || r.cak.statu,
            bolognaLink: opt.bolognaLink || '',
            ...(hasContent
              ? {
                  content,
                  contentChars: content.length,
                  encodingBroken: false,
                  file: null,
                  fileName: 'Ders kataloğu içeriği',
                  fromCatalog: true,
                }
              : r.cak.fromCatalog
                ? { content: '', contentChars: 0, fileName: '', fromCatalog: false }
                : {}),
          },
        };
      })
    );
  };

  const toggleCakManual = (rowId, on) =>
    setRows((prev) =>
      prev.map((r) => (r.id === rowId ? { ...r, cak: { ...r.cak, manual: on, selKey: '' } } : r))
    );

  const addRow = () => setRows((prev) => [...prev, emptyManualRow()]);
  const removeRow = (rowId) =>
    setRows((prev) => (prev.length > 1 ? prev.filter((r) => r.id !== rowId) : prev));

  // ── Transkriptten ders satırlarını okuma ──
  // Öğrencinin en çok elle veri girdiği yer burası: her ders için kod, ad,
  // AKTS, not. Transkriptte hepsi zaten yazıyor.
  const transkriptYuklendi = useRef(null);
  const transkriptSaglayici = async () => {
    if (!transcriptFile) return [];
    // Aynı dosya için tekrar yükleme yapma (kullanıcı butona iki kez basabilir).
    if (transkriptYuklendi.current && transkriptYuklendi.current.file === transcriptFile) {
      return transkriptYuklendi.current.liste;
    }
    const url = await uploadDocFile(transcriptFile);
    if (!url || !window.aiDosyaAdi) return [];
    const liste = [{ fileName: window.aiDosyaAdi(url), name: 'Transkript' }];
    transkriptYuklendi.current = { file: transcriptFile, liste };
    return liste;
  };

  // Seçilen satırlar KARŞI KURUM tarafına yazılır. ÇAKÜ karşılığı bilerek boş
  // bırakılır: muafiyet kararı bu eşleştirmeye dayandığı için öğrencinin
  // kendi seçmesi gerekir — model eşleştirmesi burada karar yerine geçemez.
  const dersleriAktar = (satirlar, ustBilgi) => {
    const kurum = ustBilgi || {};
    // Transkriptler çoğunlukla tümü BÜYÜK harf yazılır; elle girişle aynı
    // kural burada da uygulanır.
    const uni = baslikYaz(String(kurum.karsiUniversite || '').trim());
    const fak = baslikYaz(String(kurum.karsiFakulte || '').trim());
    const bol = baslikYaz(String(kurum.karsiBolum || '').trim());
    const kurumVar = !!(uni || fak || bol);
    if ((!satirlar || satirlar.length === 0) && !kurumVar) return;

    // Kurum bilgisi TÜM satırlara yazılır — hem yeni gelenlere hem de
    // öğrencinin daha önce elle eklediklerine (boş olanlara).
    const kurumUygula = (src) => ({
      ...src,
      uni: uni || src.uni,
      faculty: fak || src.faculty,
      dept: bol || src.dept,
    });

    const yeniler = (satirlar || []).map((s) => {
      const r = emptyManualRow();
      r.src.name = baslikYaz(String(s.dersAdi || '').trim());
      r.src.code = tr(String(s.dersKodu || '').trim());
      r.src.akts = String(s.akts || '').replace(/[^\d]/g, '');
      const st = normalizeStatu(s.statu);
      if (st) r.src.statu = st;
      if (kurumVar) r.src = kurumUygula(r.src);
      return r;
    });

    setRows((prev) => {
      const guncel = kurumVar ? prev.map((r) => ({ ...r, src: kurumUygula(r.src) })) : prev;
      if (yeniler.length === 0) return guncel;
      // İlk satır hiç doldurulmamışsa onu tüket, değilse listeye ekle.
      const ilkBos = guncel.length === 1 && !guncel[0].src.name && !guncel[0].cak.name;
      return ilkBos ? yeniler : [...guncel, ...yeniler];
    });

    const parcalar = [];
    if (yeniler.length > 0) parcalar.push(yeniler.length + ' ders');
    if (kurumVar) parcalar.push('karşı kurum bilgileri');
    setMsg({
      text:
        parcalar.join(' ve ') +
        ' aktarıldı. Her ders için ÇAKÜ karşılığını ve Bologna linkini siz seçmelisiniz.',
      kind: 'ok',
    });
  };

  // Öğrencinin yüklediği belgeyi sunucuya kaydet — akademisyen onay ekranında
  // PDF'i görüntüleyebilsin diye. Başarısız olursa null döner (talep yine
  // gönderilir; yalnızca görüntüleme linki olmaz).
  const uploadDocFile = async (file) => {
    if (!file) return null;
    try {
      const fd = new FormData();
      fd.append('file', file);
      const token = localStorage.getItem('caku_auth_token');
      const res = await fetch('/api/files/upload?folder=muafiyet_belgeler', {
        method: 'POST',
        headers: token ? { Authorization: 'Bearer ' + token } : {},
        credentials: 'include',
        body: fd,
      });
      if (!res.ok) return null;
      const data = await res.json();
      return data.downloadURL || null;
    } catch (e) {
      console.warn('Belge yüklenemedi:', e.message);
      return null;
    }
  };

  const validate = () => {
    if (!studentName.trim() || !studentNo.trim()) {
      setMsg({ text: 'Öğrenci adı ve numarası zorunlu.', kind: 'error' });
      return false;
    }
    // İletişim bilgileri dilekçeye basılıyor — eksik giderse belge boş
    // alanlarla üretilir, bu yüzden burada zorunlu.
    if (!studentPhone.trim() || !studentEmail.trim() || !studentAddress.trim()) {
      setMsg({
        text: 'Telefon, e-posta ve adres zorunlu — bu bilgiler dilekçenize yazılıyor.',
        kind: 'error',
      });
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(studentEmail.trim())) {
      setMsg({ text: 'Geçerli bir e-posta adresi girin.', kind: 'error' });
      return false;
    }
    if (studentPhone.replace(/\D/g, '').length < 10) {
      setMsg({ text: 'Telefon numarası en az 10 hane olmalı.', kind: 'error' });
      return false;
    }
    // Transkript yalnızca ders muafiyetinde zorunludur; yaz intibakında dersler
    // sonradan alındığından belge Faz-2'de (başarı belgesi) yüklenir.
    if (!isIntibak && !transcriptFile) {
      setMsg({
        text: "Transkript zorunlu — e-Devlet'ten alınan karekodlu (doğrulama karekodlu) PDF transkriptinizi yükleyin.",
        kind: 'error',
      });
      return false;
    }
    // Yaz intibakı: 21 AKTS kredi yükü tavanı (MADDE 9/1)
    if (isIntibak && toplamYazAkts > YAZ_AKTS_CAP) {
      setMsg({
        text:
          'Yaz döneminde toplam ' +
          YAZ_AKTS_CAP +
          ' AKTS kredi yükü aşılamaz (MADDE 9/1). Seçtiğiniz derslerin ÇAKÜ karşılığı toplamı: ' +
          toplamYazAkts +
          ' AKTS. Lütfen ders çıkarın.',
        kind: 'error',
      });
      return false;
    }
    for (const r of rows) {
      if (!r.src.name.trim() || !r.cak.name.trim()) {
        setMsg({ text: 'Her ders için iki yan da ders adı zorunlu.', kind: 'error' });
        return false;
      }
      if (!r.src.akts || !r.cak.akts) {
        setMsg({
          text: 'Her ders için iki yan da AKTS zorunlu — muafiyet kararı AKTS uyumuna bakar.',
          kind: 'error',
        });
        return false;
      }
      const srcLink = (r.src.bolognaLink || '').trim();
      if (!/^https?:\/\/\S+$/i.test(srcLink)) {
        setMsg({
          text:
            'Karşı kurum dersinin Bologna linki zorunludur (http:// veya https:// ile başlamalı). ' +
            'Dersin resmi Bologna bilgi paketi sayfasının bağlantısını girin.',
          kind: 'error',
        });
        return false;
      }
      if (!r.src.content || !r.cak.content) {
        setMsg({
          text: 'Her ders için iki yan da içerik dosyası (PDF/Word) zorunlu.',
          kind: 'error',
        });
        return false;
      }
      const srcLen = (r.src.contentChars ?? r.src.content.length) || 0;
      const cakLen = (r.cak.contentChars ?? r.cak.content.length) || 0;
      if (srcLen < 50 || cakLen < 50) {
        setMsg({
          text:
            'Bir dosyadan yeterli metin çıkarılamadı (karşı=' +
            srcLen +
            ' ks, ÇAKÜ=' +
            cakLen +
            ' ks). Taranmış görüntü tabanlı PDF olabilir — seçilebilir metinli ' +
            'PDF/Word yükleyin, aksi halde içerik karşılaştırması yapılamaz.',
          kind: 'error',
        });
        return false;
      }
      if (r.src.encodingBroken || r.cak.encodingBroken) {
        const which = [];
        if (r.src.encodingBroken) which.push('Karşı kurum');
        if (r.cak.encodingBroken) which.push('ÇAKÜ');
        setMsg({
          text:
            which.join(' + ') +
            ' dosyasının metni okunabilir değil (font haritası bozuk). ' +
            "Bu PDF'i Word/.docx olarak yükleyin veya kaynak kurumdan metinli kopya alın. " +
            'Aksi halde içerik karşılaştırması anlamlı sonuç vermez.',
          kind: 'error',
        });
        return false;
      }
    }
    return true;
  };

  const processAndSave = async () => {
    if (!validate()) return;
    setProcessing(true);
    try {
      // Yüklenen belgeleri sunucuya kaydet — akademisyen onayda görüntüler
      const fileUrls = await Promise.all(
        rows.map(async (r) => ({
          src: await uploadDocFile(r.src.file),
          cak: await uploadDocFile(r.cak.file),
        }))
      );

      // Karar katmanları (sırayla): yapay zekâ kapsam değerlendirmesi →
      // embedding cosine → sözcüksel. Muafiyet sorusu asimetriktir ("alınan
      // ders hedefin kazanımlarını karşılıyor mu"); sözcüksel benzerlik bunu
      // ölçemediği için AI ayaktaysa belirleyici olan odur.
      const aiSkorlar = await fetchAiKapsamSkorlari(
        rows.map((r) => ({
          alinan: {
            ad: r.src.name || '',
            kod: r.src.code || '',
            akts: String(r.src.akts || ''),
            icerik: r.src.content || '',
          },
          hedef: {
            ad: r.cak.name || '',
            kod: r.cak.code || '',
            akts: String(r.cak.akts || ''),
            icerik: r.cak.content || '',
          },
        }))
      );

      // Semantik servis ayaktaysa embedding cosine kullanılır; yoksa sözcüksel.
      const semScores = aiSkorlar
        ? null
        : await fetchSemanticScores(rows.map((r) => ({ a: r.src.content, b: r.cak.content })));

      const matches = rows.map((r, i) => {
        // Karar iki kritere bakar: AKTS uyumu (≥%70) + içerik uyumu (≥%70).
        // İsim benzerliği karara girmez — akademisyen sihirbazıyla aynı kural.
        const factor = multiFactorScore(
          { name: r.src.name, weeklyContent: r.src.content, content: r.src.content },
          { name: r.cak.name, weeklyContent: r.cak.content, content: r.cak.content }
        );
        const ai = aiSkorlar && aiSkorlar[i] ? aiSkorlar[i] : null;
        const sem = semScores && typeof semScores[i] === 'number' ? semScores[i] : null;
        const finalScore = ai ? ai.oran : sem != null ? sem : factor.total;
        const scoreMethod = ai ? 'ai' : sem != null ? 'semantic' : 'lexical';
        const aktsPass = aktsCompatible(r.src.akts, r.cak.akts);
        let decision = decideTier(aktsPass, {
          total: finalScore,
          contentScore: finalScore,
          noContent: factor.noContent && sem == null && !ai,
        });
        // AI açıkça "red" diyorsa eşiği geçse bile öneri redde çekilir; AKTS
        // koşulu her hâlükârda decideTier tarafından uygulanmış olur.
        if (ai && ai.karar === 'red' && decision.tier === 'approved') {
          decision = { matched: false, tier: 'rejected', reason: ai.gerekce || decision.reason };
        }
        // YENİ AKIŞ: hiçbir ders otomatik sonuçlanmaz — hepsi akademisyen
        // onayına gider. NLP kararı yalnızca akademisyene ÖNERİ olarak sunulur.
        const recommendation =
          decision.tier === 'approved' ? 'muaf' : decision.tier === 'rejected' ? 'red' : 'incele';
        const recommendReason =
          (ai && ai.gerekce) || decision.reason || 'İçerik uyumu %' + Math.round(finalScore * 100);
        return {
          localCourse: {
            code: r.cak.code,
            name: r.cak.name,
            akts: r.cak.akts,
            statu: r.cak.statu,
            weeklyContent: r.cak.content,
            bolognaLink: r.cak.bolognaLink || '',
            fileUrl: fileUrls[i]?.cak || '',
            fromCatalog: !!r.cak.fromCatalog,
          },
          sourceCourse: {
            code: r.src.code,
            name: r.src.name,
            akts: r.src.akts,
            statu: r.src.statu,
            weeklyContent: r.src.content,
            bolognaLink: r.src.bolognaLink || '',
            fileUrl: fileUrls[i]?.src || '',
            grade: '',
          },
          score: finalScore,
          contentScore: finalScore,
          scoreMethod,
          tier: 'review', // her ders akademisyen onayına düşer
          matched: false,
          recommendation,
          recommendReason,
          aktsPass,
          rejectReason: decision.reason,
          aiKarar: ai ? ai.karar : '',
          aiGerekce: ai ? ai.gerekce : '',
        };
      });

      // Tüm dersler onay beklediği için sayaçlar öneri bazlı tutulur
      const recMuaf = matches.filter((m) => m.recommendation === 'muaf').length;
      const recIncele = matches.filter((m) => m.recommendation === 'incele').length;
      const recRed = matches.filter((m) => m.recommendation === 'red').length;

      // Transkript (e-Devlet karekodlu PDF) — talebe bağlı, tek seferlik.
      // Muafiyette zorunlu (validate); intibakta dosya yoksa atlanır.
      let transcriptUrl = '';
      if (transcriptFile) {
        transcriptUrl = await uploadMuafiyetFile(transcriptFile);
        if (!transcriptUrl) {
          setMsg({ text: 'Transkript yüklenemedi. Lütfen tekrar deneyin.', kind: 'error' });
          return;
        }
      }

      const record = await MuafiyetDB.saveRecord({
        studentName,
        studentNo,
        studentPhone: studentPhone.trim(),
        studentEmail: studentEmail.trim(),
        studentAddress: studentAddress.trim(),
        otherUni: rows[0]?.src.uni || '',
        otherFaculty: rows[0]?.src.faculty || '',
        otherDept: rows[0]?.src.dept || '',
        localDept: currentUser?.departmentName || '',
        departmentId: currentUser?.departmentId || '',
        basvuruTuru: basvuruTuru || 'muafiyet',
        transcriptUrl,
        transcriptUploadedAt: new Date().toISOString(),
        matches,
        status: 'pending',
        approvedCount: 0,
        pendingReviewCount: matches.length,
        rejectedCount: 0,
        manualEntry: true,
        createdBy: currentUser?.identifier || currentUser?.name || '',
        // Yaz intibakı iki fazlıdır: başvuru Faz-1 (ön denklik onayı) ile başlar
        ...(isIntibak
          ? {
              stage: 'on_inceleme',
              yazAktsToplam: toplamYazAkts,
              stageHistory: [
                {
                  from: '',
                  to: 'on_inceleme',
                  by: currentUser?.name || currentUser?.identifier || '',
                  at: new Date().toISOString(),
                },
              ],
            }
          : {}),
      });

      // Sonuç panelini doldur — öğrenci her ders için sistem önerisini görür
      setResultPanel({
        recMuaf,
        recIncele,
        recRed,
        matches,
      });
      setMsg({ text: '', kind: '' });
      if (onSave) onSave(record);
    } catch (e) {
      setMsg({ text: 'Kayıt hatası: ' + e.message, kind: 'error' });
    } finally {
      setProcessing(false);
    }
  };

  const inputStyle = {
    width: '100%',
    padding: '8px 10px',
    borderRadius: 6,
    border: '1px solid ' + DS.border,
    fontSize: 13,
    outline: 'none',
    boxSizing: 'border-box',
  };
  const labelStyle = {
    display: 'block',
    fontSize: 10,
    fontWeight: 700,
    color: DS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    marginBottom: 4,
  };

  const renderSide = (row, side, title, color) => {
    const v = row[side];
    // ÇAKÜ dersi katalogdan seçildiyse (elle giriş değil) kod/AKTS/statü
    // kataloğa göre kilitlenir — öğrenci değiştiremez.
    const cakLocked = side === 'cak' && !v.manual && !!v.selKey;
    return (
      <div
        style={{
          flex: 1,
          background: 'white',
          border: '1px solid ' + DS.border,
          borderTop: '3px solid ' + color,
          borderRadius: 8,
          padding: 14,
        }}
      >
        <h4 style={{ margin: '0 0 12px', fontSize: 13, fontWeight: 700, color: DS.navy }}>
          {title}
        </h4>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {side === 'src' && (
            <>
              <div style={{ gridColumn: 'span 2' }}>
                <label style={labelStyle}>Üniversite</label>
                <input
                  value={v.uni}
                  onChange={(e) => updateSide(row.id, side, 'uni', e.target.value)}
                  style={inputStyle}
                  placeholder="ÖRN: BURSA ULUDAĞ ÜNİVERSİTESİ"
                />
              </div>
              <div>
                <label style={labelStyle}>Fakülte</label>
                <input
                  value={v.faculty}
                  onChange={(e) => updateSide(row.id, side, 'faculty', e.target.value)}
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Bölüm</label>
                <input
                  value={v.dept}
                  onChange={(e) => updateSide(row.id, side, 'dept', e.target.value)}
                  style={inputStyle}
                />
              </div>
            </>
          )}
          {side === 'cak' && !v.manual ? (
            <div style={{ gridColumn: 'span 2' }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <label style={labelStyle}>Muaf Olunacak Ders *</label>
                <label
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                    fontSize: 11,
                    color: DS.textSecondary,
                    cursor: 'pointer',
                    marginBottom: 4,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={false}
                    onChange={() => toggleCakManual(row.id, true)}
                  />
                  Listede yok — elle gir
                </label>
              </div>
              <select
                value={v.selKey}
                onChange={(e) => selectCakCourse(row.id, e.target.value)}
                style={{ ...inputStyle, cursor: 'pointer' }}
              >
                <option value="">
                  {cakOptions.length
                    ? '— Bölüm derslerinden seçin —'
                    : 'Ders listesi bulunamadı — elle giriş kullanın'}
                </option>
                {cakOptions.map((o) => (
                  <option key={o.key} value={o.key}>
                    {o.code ? o.code + ' — ' : ''}
                    {o.name}
                    {o.akts ? ' (' + o.akts + ' AKTS)' : ''}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div style={{ gridColumn: 'span 2' }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <label style={labelStyle}>Ders Adı *</label>
                {side === 'cak' && (
                  <label
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      fontSize: 11,
                      color: DS.textSecondary,
                      cursor: 'pointer',
                      marginBottom: 4,
                    }}
                  >
                    <input
                      type="checkbox"
                      checked
                      onChange={() => toggleCakManual(row.id, false)}
                    />
                    Listeden seç
                  </label>
                )}
              </div>
              <input
                value={v.name}
                onChange={(e) => updateSide(row.id, side, 'name', e.target.value)}
                style={inputStyle}
              />
            </div>
          )}
          <div>
            <label style={labelStyle}>Ders Kodu</label>
            <input
              value={v.code}
              onChange={(e) => updateSide(row.id, side, 'code', e.target.value)}
              style={{
                ...inputStyle,
                ...(side === 'cak' && !v.manual && v.selKey ? { background: '#F3F4F6' } : {}),
              }}
              readOnly={side === 'cak' && !v.manual && !!v.selKey}
              placeholder="ÖRN: BIL307"
            />
          </div>
          <div>
            <label style={labelStyle}>AKTS *</label>
            <input
              value={v.akts}
              onChange={(e) => updateNumeric(row.id, side, 'akts', e.target.value)}
              style={{ ...inputStyle, ...(cakLocked ? { background: '#F3F4F6' } : {}) }}
              readOnly={cakLocked}
              inputMode="numeric"
              placeholder={
                side === 'cak' && !v.manual
                  ? v.selKey
                    ? 'Katalogda yok — elle girin'
                    : 'Ders seçince dolar'
                  : ''
              }
            />
          </div>
          <div>
            <label style={labelStyle}>Statü</label>
            <select
              value={v.statu}
              onChange={(e) => updateSide(row.id, side, 'statu', e.target.value)}
              disabled={cakLocked}
              style={{
                ...inputStyle,
                cursor: cakLocked ? 'not-allowed' : 'pointer',
                ...(cakLocked ? { background: '#F3F4F6' } : {}),
              }}
            >
              <option value="Z">Z (Zorunlu)</option>
              <option value="S">S (Seçmeli)</option>
            </select>
          </div>
          {side === 'src' ? (
            <div style={{ gridColumn: 'span 2' }}>
              <label style={labelStyle}>Bologna Linki *</label>
              <input
                value={v.bolognaLink || ''}
                onChange={(e) => updateSide(row.id, side, 'bolognaLink', e.target.value)}
                style={inputStyle}
                placeholder="https://... (karşı kurumun ders bilgi paketi sayfası)"
              />
            </div>
          ) : (
            v.bolognaLink && (
              <div style={{ gridColumn: 'span 2' }}>
                <label style={labelStyle}>Bologna Linki (otomatik)</label>
                <a
                  href={v.bolognaLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'block',
                    padding: '8px 10px',
                    borderRadius: 6,
                    border: '1px solid ' + DS.greenLight,
                    background: DS.greenBg,
                    color: DS.green,
                    fontSize: 12,
                    fontWeight: 600,
                    textDecoration: 'none',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {v.bolognaLink}
                </a>
              </div>
            )
          )}
          <div>
            <label style={labelStyle}>İçerik Dosyası *</label>
            <label
              style={{
                display: 'block',
                padding: '8px 10px',
                borderRadius: 6,
                border: '1px dashed ' + (v.fromCatalog ? DS.green : color),
                background: v.fromCatalog ? DS.greenBg : v.fileName ? color + '12' : 'white',
                color: v.fromCatalog ? DS.green : v.fileName ? color : DS.textSecondary,
                fontSize: 12,
                cursor: 'pointer',
                textAlign: 'center',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {v.fromCatalog ? 'Katalogdan otomatik doldu' : v.fileName || 'PDF/DOCX seç'}
              <input
                type="file"
                accept=".pdf,.docx,.doc"
                onChange={(e) => handleFile(row.id, side, e.target.files?.[0])}
                style={{ display: 'none' }}
              />
            </label>
            {v.fromCatalog && (
              <p style={{ fontSize: 10, color: DS.textSecondary, margin: '4px 0 0' }}>
                İçerik ders kataloğundan alındı ({v.contentChars} karakter). Değiştirmek için dosya
                seçebilirsiniz.
              </p>
            )}
          </div>
        </div>
      </div>
    );
  };

  // ── Sonuç Paneli (kayıt sonrası) ──
  if (resultPanel) {
    // YENİ AKIŞ: tüm dersler akademisyen onayına gider; NLP sonucu ÖNERİDİR.
    const recMeta = {
      muaf: { label: 'Öneri: MUAF', color: DS.green, bg: DS.greenBg, border: DS.greenLight },
      incele: { label: 'Öneri: İNCELE', color: DS.amber, bg: DS.amberLight, border: '#FCD34D' },
      red: { label: 'Öneri: RED', color: DS.red, bg: DS.redLight, border: '#FECACA' },
    };
    return (
      <div>
        {/* Üst bilgi şeridi */}
        <div
          style={{
            background: 'white',
            border: '1px solid ' + DS.border,
            borderRadius: 12,
            padding: 18,
            marginBottom: 18,
          }}
        >
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: DS.navy }}>
            Talebiniz Akademisyen Onayına Gönderildi
          </h3>
          <p style={{ margin: '6px 0 0', fontSize: 13, color: DS.textSecondary, lineHeight: 1.6 }}>
            Muafiyet talebiniz kaydedildi ve bölüm akademisyeninin onayına sunuldu. Sistem her ders
            için <b>AKTS uyumu</b> ve <b>içerik uyumu</b> analizini yaptı — aşağıdaki sonuçlar
            akademisyene <b>öneri</b> olarak iletildi; nihai kararı akademisyen verir. Onaylanan
            dersler bölümün <b>Eşleştirme Geçmişi</b>'ne işlenir. Talebinizin durumunu "Taleplerim"
            sekmesinden izleyebilirsiniz.
          </p>
        </div>

        {/* Özet kartları */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 12,
            marginBottom: 18,
          }}
        >
          {[
            { key: 'muaf', label: 'Sistem Önerisi: Muaf', count: resultPanel.recMuaf },
            { key: 'incele', label: 'Sistem Önerisi: İncele', count: resultPanel.recIncele },
            { key: 'red', label: 'Sistem Önerisi: Red', count: resultPanel.recRed },
          ].map((s) => (
            <div
              key={s.key}
              style={{
                background: recMeta[s.key].bg,
                border: '1px solid ' + recMeta[s.key].border,
                borderRadius: 10,
                padding: 14,
              }}
            >
              <div
                style={{
                  fontSize: 28,
                  fontWeight: 800,
                  color: recMeta[s.key].color,
                  lineHeight: 1,
                }}
              >
                {s.count}
              </div>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: recMeta[s.key].color,
                  marginTop: 6,
                }}
              >
                {s.label}
              </div>
            </div>
          ))}
        </div>

        {/* Her ders için detaylı kart */}
        {resultPanel.matches.map((m, idx) => {
          const meta = recMeta[m.recommendation] || recMeta.incele;
          return (
            <div
              key={idx}
              style={{
                background: 'white',
                border: '1.5px solid ' + meta.border,
                borderLeft: '5px solid ' + meta.color,
                borderRadius: 10,
                padding: 16,
                marginBottom: 12,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 8,
                  marginBottom: 10,
                  flexWrap: 'wrap',
                }}
              >
                <div style={{ fontSize: 14, fontWeight: 700, color: DS.navy }}>
                  Ders {idx + 1}: {m.sourceCourse.name}{' '}
                  <span style={{ color: DS.textSecondary, fontWeight: 500 }}>
                    ↔ {m.localCourse.name}
                  </span>
                </div>
                <span
                  style={{
                    padding: '4px 10px',
                    borderRadius: 999,
                    background: meta.color,
                    color: 'white',
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: '0.05em',
                  }}
                >
                  {meta.label}
                </span>
              </div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: 10,
                  marginBottom: 10,
                }}
              >
                {[
                  {
                    label:
                      'İçerik Uyumu (' +
                      (m.scoreMethod === 'ai'
                        ? 'yapay zekâ değerlendirmesi'
                        : m.scoreMethod === 'semantic'
                          ? 'semantik analiz'
                          : 'sözcüksel analiz') +
                      ')',
                    text: '%' + Math.round((m.contentScore || 0) * 100),
                    color: meta.color,
                  },
                  {
                    label: 'AKTS Uyumu',
                    text: m.aktsPass
                      ? '✓ Uyumlu (' + m.sourceCourse.akts + ' → ' + m.localCourse.akts + ')'
                      : '✗ Yetersiz (' + m.sourceCourse.akts + ' → ' + m.localCourse.akts + ')',
                    color: m.aktsPass ? DS.green : DS.red,
                  },
                ].map((b) => (
                  <div
                    key={b.label}
                    style={{
                      background: DS.bg,
                      borderRadius: 8,
                      padding: '8px 10px',
                      border: '1px solid ' + DS.borderLight,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 10,
                        color: DS.textSecondary,
                        fontWeight: 600,
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em',
                      }}
                    >
                      {b.label}
                    </div>
                    <div
                      style={{
                        fontSize: 20,
                        fontWeight: 700,
                        color: b.color,
                        marginTop: 4,
                      }}
                    >
                      {b.text}
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ fontSize: 12, color: DS.textSecondary, lineHeight: 1.6 }}>
                {m.recommendReason} — nihai karar akademisyene aittir.
                {/* Aşağıdaki uyarılar sözcüksel/semantik skora özgüdür: düşük skor
                    orada çoğu zaman "metin çıkarılamadı" demektir. Yapay zekâ
                    değerlendirmesinde düşük oran bir okuma hatası değil, gerekçesi
                    yazılmış bir kapsam kararıdır — o yüzden gizlenir. */}
                {m.scoreMethod !== 'ai' && (m.contentScore || 0) < 0.05 && (
                  <div
                    style={{
                      marginTop: 6,
                      padding: '8px 10px',
                      background: '#FEF3C7',
                      border: '1px solid #FCD34D',
                      borderRadius: 6,
                      color: '#92400E',
                    }}
                  >
                    <b>Uyarı:</b> İçerik karşılaştırması %0'a yakın — bir veya iki PDF'ten anlamlı
                    metin çıkarılamamış olabilir (taranmış görüntü tabanlı PDF). Karar kriteri
                    içerik uyumu olduğu için bu sonuç güvenilir değil; seçilebilir metinli PDF veya
                    Word (.docx) yükleyip yeniden deneyin.
                  </div>
                )}
                {m.scoreMethod !== 'ai' &&
                  m.recommendation === 'red' &&
                  (m.contentScore || 0) >= 0.05 && (
                    <div style={{ marginTop: 6, color: DS.red }}>
                      <b>Olası nedenler:</b> içerik metinleri farklı konular içeriyor, AKTS kredisi
                      yetersiz, veya PDF'den çıkarılan metin eksik. Daha kapsamlı bir içerik dosyası
                      (haftalık konu başlıklı, kaynakça dahil) deneyebilirsiniz.
                    </div>
                  )}
              </div>
            </div>
          );
        })}

        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 18 }}>
          <button
            onClick={() => {
              setResultPanel(null);
              setRows([emptyManualRow()]);
            }}
            style={{
              padding: '11px 20px',
              background: 'white',
              color: DS.navy,
              border: '1px solid ' + DS.border,
              borderRadius: 8,
              fontWeight: 600,
              fontSize: 13,
              cursor: 'pointer',
            }}
          >
            + Yeni Muafiyet Talebi Oluştur
          </button>
          <button
            onClick={() => setResultPanel(null)}
            style={{
              padding: '11px 20px',
              background: DS.accent,
              color: 'white',
              border: 'none',
              borderRadius: 8,
              fontWeight: 600,
              fontSize: 13,
              cursor: 'pointer',
            }}
          >
            Tamam
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Aktif başvuru türü bilgi şeridi */}
      {turMeta && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '10px 14px',
            borderRadius: 10,
            marginBottom: 14,
            background: DS.bg,
            border: '1px solid ' + DS.border,
            borderLeft: '3px solid ' + DS.navy,
          }}
        >
          <span style={{ fontSize: 13, fontWeight: 700, color: DS.navy }}>{turMeta.label}</span>
          <span style={{ fontSize: 12, color: DS.textSecondary }}>— {turMeta.aciklama}</span>
        </div>
      )}
      {/* Öğrenci bilgileri */}
      <div
        style={{
          background: 'white',
          border: '1px solid ' + DS.border,
          borderRadius: 10,
          padding: 16,
          marginBottom: 18,
          display: 'flex',
          gap: 12,
        }}
      >
        <div style={{ flex: 1 }}>
          <label style={labelStyle}>Öğrenci Adı Soyadı *</label>
          <input
            value={studentName}
            onChange={(e) => setStudentName(e.target.value)}
            style={inputStyle}
          />
        </div>
        <div style={{ flex: 1 }}>
          <label style={labelStyle}>Öğrenci No *</label>
          <input
            value={studentNo}
            onChange={(e) => setStudentNo(e.target.value.replace(/\D/g, ''))}
            style={inputStyle}
          />
        </div>
      </div>

      {/* İletişim bilgileri — dilekçeye basılır. Benim Sayfam'da kayıtlıysa
          otomatik gelir; değilse öğrenci burada girer. */}
      <div
        style={{
          background: 'white',
          border: '1px solid ' + DS.border,
          borderRadius: 10,
          padding: 16,
          marginBottom: 18,
        }}
      >
        <div style={{ display: 'flex', gap: 12, marginBottom: 12, flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 200px' }}>
            <label style={labelStyle}>Telefon *</label>
            <input
              value={studentPhone}
              inputMode="tel"
              placeholder="0 5xx xxx xx xx"
              onChange={(e) => setStudentPhone(e.target.value)}
              style={inputStyle}
            />
          </div>
          <div style={{ flex: '1 1 200px' }}>
            <label style={labelStyle}>E-posta *</label>
            <input
              value={studentEmail}
              inputMode="email"
              placeholder="ornek@ogrenci.karatekin.edu.tr"
              onChange={(e) => setStudentEmail(e.target.value)}
              style={inputStyle}
            />
          </div>
        </div>
        <div>
          <label style={labelStyle}>Adres *</label>
          <textarea
            value={studentAddress}
            rows={2}
            placeholder="Yazışma adresiniz"
            onChange={(e) => setStudentAddress(e.target.value)}
            style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }}
          />
        </div>
        <div style={{ fontSize: 11.5, color: DS.textMuted, marginTop: 8 }}>
          Bu bilgiler dilekçenize yazılır. "Benim Sayfam"da kayıtlıysa otomatik gelir.
        </div>
      </div>

      {/* Transkript (e-Devlet karekodlu PDF) — yalnız ders muafiyetinde zorunlu */}
      {!isIntibak && (
        <div
          style={{
            background: 'white',
            border: '1px solid ' + DS.border,
            borderRadius: 10,
            padding: 16,
            marginBottom: 18,
          }}
        >
          <label style={labelStyle}>Transkript (e-Devlet karekodlu PDF) *</label>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              flexWrap: 'wrap',
              marginTop: 6,
            }}
          >
            <label style={{ cursor: 'pointer' }}>
              <input
                type="file"
                accept=".pdf,application/pdf"
                style={{ display: 'none' }}
                onChange={(e) => {
                  const f = (e.target.files && e.target.files[0]) || null;
                  e.target.value = '';
                  if (!f) return;
                  if (f.type !== 'application/pdf' && !/\.pdf$/i.test(f.name)) {
                    setMsg({ text: 'Transkript yalnızca PDF olabilir.', kind: 'error' });
                    return;
                  }
                  setTranscriptFile(f);
                  setTranscriptName(f.name);
                }}
              />
              <span
                style={{
                  display: 'inline-block',
                  padding: '8px 16px',
                  borderRadius: 8,
                  border: '1px solid ' + DS.border,
                  background: DS.card || '#fff',
                  color: DS.navy,
                  fontSize: 13,
                  fontWeight: 600,
                }}
              >
                {transcriptFile ? 'Transkripti Değiştir' : 'Transkript Seç (PDF)'}
              </span>
            </label>
            {transcriptName ? (
              <span style={{ fontSize: 12.5, color: DS.green, fontWeight: 600 }}>
                ✓ {transcriptName}
              </span>
            ) : (
              <span style={{ fontSize: 12.5, color: DS.textMuted }}>Henüz dosya seçilmedi</span>
            )}
          </div>
          <div style={{ fontSize: 12, color: DS.textSecondary, marginTop: 8, lineHeight: 1.5 }}>
            Transkriptinizi <b>e-Devlet</b> üzerinden alınan <b>karekodlu (doğrulama karekodlu)</b>{' '}
            PDF hâliyle yükleyin. Karekod, belgenin resmî doğrulanabilirliğini sağlar; karekodsuz
            veya taranmış nüshalar kabul edilmez. Her talep için transkript yalnızca <b>bir kez</b>{' '}
            yüklenir.
          </div>

          {/* Transkriptten ders satırlarını oku — her dersi elle girmek yerine.
              Sonuç önce tabloda gösterilir, öğrenci seçtiklerini aktarır. */}
          {window.AISatirDoldurButonu && (
            <div
              style={{ marginTop: 14, paddingTop: 12, borderTop: '1px dashed ' + DS.borderLight }}
            >
              {React.createElement(window.AISatirDoldurButonu, {
                module: 'muafiyet',
                docType: basvuruTuru,
                sutunlar: AI_TRANSKRIPT_SUTUNLARI,
                ustBilgiAlanlari: AI_TRANSKRIPT_UST_BILGI,
                satirTanimi: 'karşı kurumda alınan her ders (transkriptteki her ders satırı)',
                dosyalar: transcriptFile ? [{ fileName: '', name: 'Transkript' }] : [],
                dosyaSaglayici: transcriptFile ? transkriptSaglayici : null,
                etiket: 'Transkriptten Dersleri Oku',
                onUygula: dersleriAktar,
              })}
              <div style={{ fontSize: 11.5, color: DS.textMuted, marginTop: 8, lineHeight: 1.5 }}>
                Transkriptten <b>karşı kurumun üniversite/fakülte/bölüm bilgisi</b> ve{' '}
                <b>ders listesi</b> okunur. ÇAKÜ karşılığını ve Bologna linkini siz seçersiniz —
                muafiyet kararı buna bağlı olduğu için otomatik eşleştirilmez.
              </div>
            </div>
          )}
        </div>
      )}

      {/* Ders satırları */}
      {rows.map((row, idx) => (
        <div
          key={row.id}
          style={{
            background: DS.bg,
            border: '1px solid ' + DS.borderLight,
            borderRadius: 12,
            padding: 14,
            marginBottom: 14,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 12,
            }}
          >
            <span style={{ fontSize: 12, fontWeight: 700, color: DS.textSecondary }}>
              DERS {idx + 1}
            </span>
            {rows.length > 1 && (
              <button
                onClick={() => removeRow(row.id)}
                style={{
                  background: 'none',
                  border: '1px solid ' + DS.border,
                  color: DS.red,
                  fontSize: 11,
                  padding: '4px 10px',
                  borderRadius: 6,
                  cursor: 'pointer',
                }}
              >
                Bu dersi kaldır
              </button>
            )}
          </div>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {renderSide(row, 'src', 'KARŞI KURUM (Alınan Ders)', DS.accent)}
            {renderSide(row, 'cak', 'ÇAKÜ (Muaf Olunacak Ders)', DS.accent)}
          </div>
        </div>
      ))}

      <button
        onClick={addRow}
        style={{
          width: '100%',
          padding: 14,
          border: '2px dashed ' + DS.border,
          background: 'white',
          color: DS.accent,
          borderRadius: 10,
          fontWeight: 600,
          fontSize: 13,
          cursor: 'pointer',
          marginBottom: 16,
        }}
      >
        + Yeni Ders Eşleştirmesi Ekle
      </button>

      {msg.text && (
        <div
          style={{
            padding: '10px 14px',
            borderRadius: 8,
            marginBottom: 12,
            background: msg.kind === 'error' ? DS.redLight : DS.greenBg,
            color: msg.kind === 'error' ? DS.red : DS.green,
            fontSize: 13,
            fontWeight: 500,
          }}
        >
          {msg.text}
        </div>
      )}

      {/* Yaz intibakı: canlı AKTS tavanı göstergesi (MADDE 9/1) */}
      {isIntibak && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 10,
            padding: '10px 14px',
            borderRadius: 8,
            marginBottom: 12,
            background: aktsTavaniAsildi ? DS.redLight : DS.bg,
            border: '1px solid ' + (aktsTavaniAsildi ? '#FCA5A5' : DS.border),
          }}
        >
          <span style={{ fontSize: 13, color: aktsTavaniAsildi ? DS.red : DS.textSecondary }}>
            Yaz dönemi kredi yükü (ÇAKÜ karşılığı)
          </span>
          <span
            style={{
              fontSize: 14,
              fontWeight: 700,
              color: aktsTavaniAsildi ? DS.red : DS.navy,
            }}
          >
            {toplamYazAkts} / {YAZ_AKTS_CAP} AKTS
            {aktsTavaniAsildi ? ' — tavan aşıldı' : ''}
          </span>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
        <button
          onClick={processAndSave}
          disabled={processing || aktsTavaniAsildi}
          style={{
            padding: '11px 22px',
            background: DS.accent,
            color: 'white',
            border: 'none',
            borderRadius: 8,
            fontWeight: 600,
            fontSize: 14,
            cursor: processing ? 'wait' : aktsTavaniAsildi ? 'not-allowed' : 'pointer',
            opacity: processing || aktsTavaniAsildi ? 0.6 : 1,
          }}
        >
          {processing ? 'Eşleştiriliyor…' : 'Eşleştir ve Kaydet'}
        </button>
      </div>
    </div>
  );
};

// ══════════════════════════════════════════════════════════════
// DİKEY GEÇİŞ — DGS taban puan kontrolü
//
// Yönetmelik şartı: dikey geçişle gelen adayın DGS puanı, yerleştiği
// programın o yılki DGS TABAN PUANINDAN küçük olamaz. Taban puanlar her yıl
// değişip kurumun sayfasında yayımlandığı için elle girilmez: sayfanın adresi
// verilir, model sayfayı (ve içindeki PDF'leri) okuyup taban puanı getirir.
//
// Karşılaştırmayı model YAPMAZ — lib/taban-puan.js yapar. Sonuç bir
// BİLGİLENDİRMEDİR: muafiyet kararını kendiliğinden değiştirmez, akademisyen
// görüp kendi kararını verir.
// ══════════════════════════════════════════════════════════════
function DikeyTabanPuanPaneli({ records, currentUser, activeDepartment, departmentInfo, onKayit }) {
  const [tabanKayitlari, setTabanKayitlari] = useState([]);
  const [busyId, setBusyId] = useState('');

  // Aranacak program: bu bölümün kendisi. Dikey geçişte aday hep bu bölüme
  // yerleşmiştir; başvurularda ayrı bir "başvurduğu bölüm" alanı yoktur.
  const programlar = useMemo(
    function () {
      const ad = String(departmentInfo?.name || currentUser?.departmentName || '').trim();
      if (!ad) return [];
      const k = window.programAnahtari ? window.programAnahtari(ad) : ad.toLowerCase();
      return [{ id: 'p_' + k.slice(0, 50), ad }];
    },
    [departmentInfo, currentUser]
  );

  const taban = useMemo(
    function () {
      const ad = programlar[0] ? programlar[0].ad : '';
      const k = window.tabanKaydiBul ? window.tabanKaydiBul(tabanKayitlari, ad) : null;
      return k && k.taban ? k.taban : '';
    },
    [tabanKayitlari, programlar]
  );

  const puanYaz = async function (rec, deger) {
    const id = rec.id || rec._docId;
    setBusyId(String(id));
    try {
      await window.DBWrite.set(
        'muafiyet_records',
        String(id),
        { dgsPuani: deger, updatedAt: new Date().toISOString() },
        true
      );
      if (onKayit) onKayit(id, { dgsPuani: deger });
    } catch (e) {
      alert('Kaydedilemedi: ' + e.message);
    } finally {
      setBusyId('');
    }
  };

  if (programlar.length === 0) return null;

  return (
    <div style={{ marginBottom: 24 }}>
      {window.TabanPuanPaneli && (
        <window.TabanPuanPaneli
          currentUser={currentUser}
          departmentId={activeDepartment || ''}
          modul="dikey"
          programlar={programlar}
          // Sayfada aynı yıl için ÖNLİSANS / LİSANS / DGS listeleri ayrı ayrı
          // duruyor. Tür açıkça söylenmezse lisans listesi açılıp yanlış puan
          // okunabiliyor — dikey geçişte gereken DGS listesidir.
          puanTuru="DGS (dikey geçiş sınavı yerleştirme listesi)"
          onKayitlar={setTabanKayitlari}
          baslik="DGS taban puan sayfasının adresi"
          aciklama={
            'Dikey geçişte adayın DGS puanı, yerleştiği programın taban puanından küçük ' +
            'olamaz. Adres verilirse sayfa (ve içindeki PDF bağlantıları) okunur; ' +
            programlar[0].ad +
            ' programının DGS taban puanı aranır.'
          }
        />
      )}

      {records.length > 0 && (
        <div
          style={{
            background: DS.bgCard,
            border: '1px solid ' + DS.border,
            borderRadius: DS.radius,
            padding: '12px 16px',
          }}
        >
          <div style={{ fontSize: 13, fontWeight: 700, color: DS.navy, marginBottom: 4 }}>
            Adayların DGS puanları
          </div>
          <div style={{ fontSize: 11.5, color: DS.textMuted, marginBottom: 10, lineHeight: 1.5 }}>
            {taban ? (
              <>
                Karşılaştırma taban puanı: <b style={{ color: DS.navy }}>{taban}</b>. Puanı eşit ya
                da yüksek olan aday şartı karşılar.
              </>
            ) : (
              'Taban puan henüz belirlenmedi — yukarıdaki adresi girip getirin ya da elle yazın.'
            )}{' '}
            Bu satırlar <b>bilgilendirmedir</b>; muafiyet kararını değiştirmez.
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
              <thead>
                <tr style={{ background: DS.bg }}>
                  <th style={{ textAlign: 'left', padding: '6px 8px', color: DS.textMuted }}>
                    Öğrenci
                  </th>
                  <th
                    style={{
                      textAlign: 'left',
                      padding: '6px 8px',
                      width: 130,
                      color: DS.textMuted,
                    }}
                  >
                    DGS puanı
                  </th>
                  <th style={{ textAlign: 'left', padding: '6px 8px', color: DS.textMuted }}>
                    Taban puan şartı
                  </th>
                </tr>
              </thead>
              <tbody>
                {records.map(function (r) {
                  const id = String(r.id || r._docId);
                  const kiyas = window.tabanKarsilastir
                    ? window.tabanKarsilastir(r.dgsPuani, taban)
                    : { durum: 'belirsiz' };
                  return (
                    <tr key={id} style={{ borderTop: '1px solid ' + DS.borderLight }}>
                      <td style={{ padding: '6px 8px', fontWeight: 600, color: DS.text }}>
                        {r.studentName || '—'}
                        <span style={{ color: DS.textMuted, fontWeight: 400 }}>
                          {r.studentNo ? ' · ' + r.studentNo : ''}
                        </span>
                      </td>
                      <td style={{ padding: '6px 8px' }}>
                        <input
                          defaultValue={r.dgsPuani || ''}
                          disabled={busyId === id}
                          onBlur={function (e) {
                            const v = e.target.value.replace(/[^\d.,]/g, '');
                            if (v !== (r.dgsPuani || '')) puanYaz(r, v);
                          }}
                          placeholder="ör. 245,318"
                          style={{
                            width: '100%',
                            padding: '5px 8px',
                            border: '1px solid ' + DS.border,
                            borderRadius: 6,
                            fontSize: 12,
                            fontFamily: 'inherit',
                            boxSizing: 'border-box',
                          }}
                        />
                      </td>
                      <td style={{ padding: '6px 8px' }}>
                        {kiyas.durum === 'belirsiz' ? (
                          <span style={{ color: DS.textMuted }}>—</span>
                        ) : (
                          <span
                            style={{
                              fontWeight: 700,
                              color: kiyas.durum === 'uygun' ? DS.green : DS.red,
                            }}
                          >
                            {kiyas.durum === 'uygun' ? 'Karşılıyor' : 'Taban puanın ALTINDA'}
                            <span style={{ fontWeight: 400, color: DS.textMuted }}>
                              {' (' +
                                String(kiyas.aday).replace('.', ',') +
                                (kiyas.durum === 'uygun' ? ' ≥ ' : ' < ') +
                                String(kiyas.taban).replace('.', ',') +
                                ')'}
                            </span>
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Window'a export ──
window.DersMuafiyetApp = DersMuafiyetApp;

// ── Dikey Geçiş modülü ──
// Ders Muafiyet'ten AYRI bir modül olarak görünür; altyapı aynıdır (ders
// eşleştirme, benzerlik skoru, AKTS kapısı, dilekçe üretimi). Şablon tarafında
// da module='muafiyet', docType='dikey' olarak kalır — mevcut şablonlar ve
// üretilmiş belgeler bozulmaz.
function DikeyGecisApp(props) {
  return React.createElement(DersMuafiyetApp, { ...props, sabitTur: 'dikey' });
}
window.DikeyGecisApp = DikeyGecisApp;

// NLP motoru paylaşımı
window.MuafiyetUtils = {
  normalizeText,
  tokenize,
  tokenizeStemmed,
  turkishStem,
  expandWithSynonyms,
  jaccardSimilarity,
  softJaccardSimilarity,
  ngramSimilarity,
  tfidfCosineSimilarity,
  contentSimilarity,
  sectionAwareContentSimilarity,
  splitCourseSections,
  cleanCourseNoise,
  courseNameSimilarity,
  courseCodeSimilarity,
  multiFactorScore,
  decideTier,
  aktsCompatible,
  fetchSemanticScores,
  refineMatchesSemantic,
  levenshteinDistance,
  wordSimilarity,
  charNgrams,
  autoMatchCourses,
  autoMatchCoursesWithIndex,
  buildCourseIndex,
  exportCourseContentsJSON,
  extractFromFile,
  parseCoursesFromTable,
  parseCoursesFromText,
  ensureLibsLoaded,
  parsePetitionDocument,
  parsePetitionRows,
  FileDropZone,
  MultiFileDropZone,
  TR_STOPWORDS,
  DOMAIN_SYNONYMS,
  THRESHOLD_AUTO_APPROVE,
  THRESHOLD_REVIEW,
  AKTS_MIN_RATIO,
  CALIBRATION,
  applyCalibration,
  suggestThreshold,
};
