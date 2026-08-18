// ══════════════════════════════════════════════════════════════
// ÇAKÜ Mühendislik Fakültesi - Ders Programı Otomasyonu
// Sınav otomasyonundaki ders/hoca/derslik verilerini kullanır
// ══════════════════════════════════════════════════════════════

const { useState, useEffect, useMemo, useCallback } = React;

// Akademisyenin üniversite geneli haftalık programı — Bölüm Yönetimi ile ortak
// bileşen (shared-components.jsx), tek belge biçimi.
const AkademisyenProgramModal = window.AkademisyenProgramModal;

const DP = {
  primary: '#7C3AED',
  primaryLight: '#A78BFA',
  primaryPale: '#EDE9FE',
  text: '#1F2937',
  textMuted: '#6B7280',
  border: '#E5E7EB',
  green: '#059669',
  navy: '#1B2A4A',
};

const DPIcon = ({ path, size = 18, color = 'currentColor' }) => (
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
    <path d={path} />
  </svg>
);

// Gün ve saat dizileri lib/akademisyen-programi.js'te tanımlıdır (akademisyen
// programı da aynı ızgarayı kullanır); slot anahtarı saat İNDEKSİ olduğu için
// bu sıralama veri sözleşmesidir ve tek yerden gelmelidir.
const DAYS = window.PROGRAM_GUNLERI;
// Saat ETİKETLERİ artık bölüme özeldir (başlangıç/bitiş bölüm yetkilisince
// seçilir; ritim sabit: 45 dk ders + 15 dk teneffüs — bkz. lib/ders-saatleri.js).
// Aşağıdaki liste yalnız GERİYE DÜŞÜŞTÜR: ayar okunamadığında ve bölümü
// bilinmeyen bir kayıt için etiket lazım olduğunda kullanılır.
const HOURS = window.PROGRAM_SAATLERI;
const saatEtiketi = (saatler, hi) => (saatler || HOURS)[hi] || HOURS[hi] || '';

const SLOT_COLORS = [
  '#3B82F6',
  '#EF4444',
  '#10B981',
  '#F59E0B',
  '#8B5CF6',
  '#EC4899',
  '#06B6D4',
  '#F97316',
  '#6366F1',
  '#14B8A6',
  '#84CC16',
  '#F43F5E',
];

const GRADE_COLORS = {
  1: { bg: '#B2EBF2', text: '#006064' },
  2: { bg: '#C8E6C9', text: '#1B5E20' },
  3: { bg: '#FFE0B2', text: '#E65100' },
  4: { bg: '#F8BBD0', text: '#880E4F' },
  5: { bg: '#E1BEE7', text: '#4A148C' },
};

// Bir slottaki dersler — TEK kaynak lib/ders-slot.js. Burada ayrı bir kopya
// vardı ve yalnız iki dersi biliyordu; hücrede üçüncü ders varken çakışma
// taraması onu hiç görmezdi.
const slotCourses = window.slotDersleri;

// ── Çakışma Tespit Fonksiyonu ──
// deptAllYearsSlots: bölüm içi tüm sınıfların slotları [{year, slots}]
// allFacultySlots: fakülte geneli tüm bölüm/sınıf slotları [{deptId, deptName, year, slots}]
// `bolumSaatleri` bölümün kendi ızgarası, `fakulteSaatleri` ise fakülte
// kümesinin ORTAK ekseni. İkisi ayrı verilir: bölüm içi çakışma bölümün
// saatiyle, fakülte çakışması ortak eksenin saatiyle raporlanmalı, yoksa
// yetkiliye yanlış saat gösterilir.
function detectConflicts(deptAllYearsSlots, allFacultySlots, bolumSaatleri, fakulteSaatleri) {
  const conflicts = [];
  const seen = new Set();

  // 1) Bölüm içi: tüm sınıflar arası derslik + saat çakışması
  if (deptAllYearsSlots && deptAllYearsSlots.length > 0) {
    // day_hourIndex -> [{year, slot}]
    const timeMap = {};
    deptAllYearsSlots.forEach(({ year: yr, slots }) => {
      Object.entries(slots).forEach(([key, slot]) => {
        if (!timeMap[key]) timeMap[key] = [];
        // Hücredeki her ders ayrı kayıt olarak çakışmaya girer. `hucre`,
        // kaydın HANGİ hücreden geldiğini söyler: aynı hücredeki dersler
        // birbiriyle çakışmaz — bölme kasıtlıdır (aynı saatte yürüyen iki
        // eşdeğer ders, ya da iki ayrı derslikteki iki grup).
        const hucre = yr + '|' + key;
        slotCourses(slot).forEach((c) => timeMap[key].push({ year: yr, hucre, ...c }));
      });
    });
    Object.entries(timeMap).forEach(([key, entries]) => {
      if (entries.length <= 1) return;
      const [day, hiStr] = key.split('_');
      const hi = parseInt(hiStr);
      const hour = saatEtiketi(bolumSaatleri, hi) || key;
      // Aynı derslik kullanan farklı dersler
      const classroomMap = {};
      entries.forEach((e) => {
        if (!e.classroom) return;
        if (!classroomMap[e.classroom]) classroomMap[e.classroom] = [];
        classroomMap[e.classroom].push(e);
      });
      Object.entries(classroomMap).forEach(([room, roomEntries]) => {
        if (roomEntries.length <= 1) return;
        const uniqueCourses = new Set(roomEntries.map((e) => e.courseCode));
        if (uniqueCourses.size <= 1) return;
        // Hepsi AYNI hücrede duruyorsa çakışma yoktur (kasıtlı bölme).
        if (new Set(roomEntries.map((e) => e.hucre)).size <= 1) return;
        const cKey = `dept_${day}_${hi}_${room}`;
        if (seen.has(cKey)) return;
        seen.add(cKey);
        conflicts.push({
          type: 'dept_classroom',
          day,
          hour,
          classroom: room,
          courses: roomEntries.map((e) => `${e.year}. Sınıf: ${e.courseCode} - ${e.courseName}`),
          message: `Bölüm derslik çakışması: ${room} — ${day} ${hour} — ${roomEntries.map((e) => e.courseCode + ' (' + e.year + '. Sınıf)').join(' & ')}`,
        });
      });
      // Aynı hoca aynı saatte farklı derslerde
      const profMap = {};
      entries.forEach((e) => {
        if (!e.instructor) return;
        if (!profMap[e.instructor]) profMap[e.instructor] = [];
        profMap[e.instructor].push(e);
      });
      Object.entries(profMap).forEach(([prof, profEntries]) => {
        if (profEntries.length <= 1) return;
        const uniqueCourses = new Set(profEntries.map((e) => e.courseCode));
        if (uniqueCourses.size <= 1) return;
        // Aynı hücrede iki dersi olan hoca iki yerde değildir — çakışma değil.
        if (new Set(profEntries.map((e) => e.hucre)).size <= 1) return;
        const cKey = `prof_${day}_${hi}_${prof}`;
        if (seen.has(cKey)) return;
        seen.add(cKey);
        conflicts.push({
          type: 'dept_professor',
          day,
          hour,
          instructor: prof,
          courses: profEntries.map((e) => `${e.year}. Sınıf: ${e.courseCode}`),
          message: `Hoca çakışması: ${prof} — ${day} ${hour} — ${profEntries.map((e) => e.courseCode + ' (' + e.year + '. Sınıf)').join(' & ')}`,
        });
      });
    });
  }

  // 2) Fakülte geneli: tüm bölümler arası derslik çakışması
  if (allFacultySlots && allFacultySlots.length > 0) {
    const globalMap = {};
    allFacultySlots.forEach(({ deptId, deptName, year: yr, slots }) => {
      Object.entries(slots).forEach(([key, slot]) => {
        slotCourses(slot).forEach((c) => {
          if (!c.classroom) return;
          const gKey = `${key}__${c.classroom}`;
          if (!globalMap[gKey]) globalMap[gKey] = [];
          globalMap[gKey].push({
            deptId,
            deptName,
            year: yr,
            courseCode: c.courseCode,
            courseName: c.courseName,
          });
        });
      });
    });
    Object.entries(globalMap).forEach(([gKey, entries]) => {
      if (entries.length <= 1) return;
      const deptSet = new Set(entries.map((e) => e.deptId));
      if (deptSet.size <= 1) return;
      // Ortak (aynı kodlu) ders farklı bölümlerde aynı amfide veriliyorsa
      // bu gerçek çakışma değildir — yanlış pozitifi ele (Y7).
      const uniqueCodes = new Set(entries.map((e) => e.courseCode));
      if (uniqueCodes.size <= 1) return;
      const parts = gKey.split('__');
      const classroom = parts[1];
      const [day, hiStr] = parts[0].split('_');
      const hi = parseInt(hiStr);
      const cKey = `fac_${day}_${hi}_${classroom}`;
      if (seen.has(cKey)) return;
      seen.add(cKey);
      conflicts.push({
        type: 'cross_dept',
        day,
        hour: saatEtiketi(fakulteSaatleri, hi),
        classroom,
        courses: entries.map((e) => `${e.deptName} (${e.year}. Sınıf): ${e.courseCode}`),
        message: `Fakülte çakışması: ${classroom} — ${day} ${saatEtiketi(fakulteSaatleri, hi)} — ${entries.map((e) => e.deptName + ':' + e.courseCode).join(' & ')}`,
      });
    });
  }
  return conflicts;
}

// ── Slot ekleme öncesi anlık çakışma kontrolü ──
function checkSlotConflict(
  day,
  hourIndex,
  classroom,
  instructor,
  deptAllYearsSlots,
  allFacultySlots,
  saatler,
  // Aynı saatin FAKÜLTE ekseni'ndeki indeksi. Bölümlerin başlangıç saatleri
  // farklı olabildiği için bölüm indeksi doğrudan fakülte kümesinde
  // aranamaz; -1 ise bu saatin ortak eksende karşılığı yoktur.
  fakulteIndeksi
) {
  const warnings = [];
  const key = `${day}_${hourIndex}`;
  const fakulteKey = `${day}_${fakulteIndeksi == null ? hourIndex : fakulteIndeksi}`;
  const hour = saatEtiketi(saatler, hourIndex);

  // Bölüm içi: aynı saat + aynı derslik (bölünmüş ikinci ders dahil)
  if (deptAllYearsSlots && classroom) {
    deptAllYearsSlots.forEach(({ year: yr, slots }) => {
      Object.entries(slots).forEach(([slotKey, slot]) => {
        if (slotKey !== key) return;
        slotCourses(slot).forEach((c) => {
          if (c.classroom === classroom && c.courseCode) {
            warnings.push(
              `Derslik çakışması: ${classroom} bu saatte ${yr}. Sınıf'ta "${c.courseCode}" dersi için kullanılıyor.`
            );
          }
        });
      });
    });
  }
  // Bölüm içi: aynı saat + aynı hoca (bölünmüş ikinci ders dahil)
  if (deptAllYearsSlots && instructor) {
    deptAllYearsSlots.forEach(({ year: yr, slots }) => {
      Object.entries(slots).forEach(([slotKey, slot]) => {
        if (slotKey !== key) return;
        slotCourses(slot).forEach((c) => {
          if (c.instructor === instructor && c.courseCode) {
            warnings.push(
              `Hoca çakışması: ${instructor} bu saatte ${yr}. Sınıf'ta "${c.courseCode}" dersinde.`
            );
          }
        });
      });
    });
  }
  // Fakülte geneli: aynı saat + aynı derslik (farklı bölüm). Boş kod ve aynı
  // kodlu (ortak) ders yanlış-pozitif üretmesin (Y7).
  if (allFacultySlots && classroom && fakulteIndeksi !== -1) {
    allFacultySlots.forEach(({ deptName, year: yr, slots }) => {
      Object.entries(slots).forEach(([slotKey, slot]) => {
        if (slotKey !== fakulteKey) return;
        slotCourses(slot).forEach((c) => {
          if (c.classroom === classroom && c.courseCode) {
            warnings.push(
              `Fakülte çakışması: ${classroom} bu saatte ${deptName} (${yr}. Sınıf) "${c.courseCode}" için kullanılıyor.`
            );
          }
        });
      });
    });
  }
  return warnings;
}

// ══════════════════════════════════════════════════════════════
// ÇIKTILAR — bir düğme, iki belge
//
// Bölüm ve fakülte programının İKİ okuru var ve iki ayrı belge istiyorlar:
//
//   .xlsx → üzerinde çalışılan belge. Hücrede YALNIZ DERS KODU yazar; ders
//           adı, hoca ve derslik yazılmaz. Kalabalık olmayan bu biçim
//           fakültenin bugün elle tuttuğu programın karşılığıdır.
//           Dersin hangi bölüme ait olduğu RENKTEN okunur.
//   PDF   → yazdırılan/asılan belge. Ders adı, hoca ve derslik ile birlikte,
//           sınıf renkleriyle. Biçim değişmedi.
//
// Tek düğme ikisini birden üretir: yetkili "çıktı al" der, hem Excel dosyası
// iner hem yazdırma sayfası açılır. İki ayrı düğme, iki ayrı belgenin aynı
// programdan üretildiğini gizliyordu.
//
// ── RENK NEDEN İKİ FARKLI YOLLA VERİLİYOR ──
// Bölüm çıktısında bir hücredeki tüm dersler AYNI bölümündür; hücre o
// bölümün renginde boyanır (fakültenin basılı programındaki görüntü).
// Fakülte çıktısında ise bir hücrede birden çok bölümün dersi olabilir —
// zemin tek renk olamaz, bu yüzden her ders kodu KENDİ renginde yazılır.
// ══════════════════════════════════════════════════════════════

// Bölünmüş hücreyi (tek slotta N ders) çıktı/görünüm için TEK karta
// birleştirir. Kural ve gerekçesi lib/ders-slot.js'te: her alanda tüm
// değerler yazılır ama tekrar yazılmaz.
const mergeSplitSlot = window.slotBirlestir;

// ── Izgara ──
// Üç çıktı da (xlsx, PDF, şablon) AYNI ızgaradan üretilir: hangi saatte
// hangi dersin göründüğü belgeler arasında ayrışmasın.
function programIzgarasiKur(kaynaklar, hucreYaz, saatler) {
  return window.dpCiktiIzgarasi(kaynaklar, DAYS, (saatler || HOURS).length, hucreYaz);
}

// Izgarayı xlsx satırlarına çevirir: başlık + yalnız DOLU saat satırları.
function programSatirlari(grid, saatler) {
  return window.dpTabloSatirlari(grid, DAYS, saatler || HOURS, (window.XLSX_STIL || {}).vurgu || 3);
}

// PDF ve şablon hücresi — bölüm çıktısı: kod (sınıf) / ad / hoca / derslik
function bolumHucresi(slot, kaynak) {
  const e = mergeSplitSlot(slot, { year: kaynak.year });
  return [
    e.courseCode + (e.year ? ' (' + e.year + '. Sınıf)' : ''),
    e.courseName,
    e.instructor,
    e.classroom,
  ]
    .filter(Boolean)
    .join('\n');
}

// PDF ve şablon hücresi — fakülte çıktısı: kod / bölüm — sınıf / hoca / derslik
function fakulteHucresi(slot, kaynak) {
  const e = mergeSplitSlot(slot, { deptName: kaynak.deptName, year: kaynak.year });
  return [
    e.courseCode,
    (e.deptName || '') + (e.year ? ' — ' + e.year + '. Sınıf' : ''),
    e.instructor,
    e.classroom,
  ]
    .filter(Boolean)
    .join('\n');
}

// .xlsx hücresi — YALNIZ ders kodu. Bölünmüş hücrede kodlar ' / ' ile
// birleşir (aynı saatte yürüyen eşdeğer dersler tek satırda okunur).
function kodMetni(slot) {
  return window
    .slotDersleri(slot)
    .map((d) => d.courseCode)
    .filter(Boolean)
    .join(' / ');
}

// ── Yazdırma (PDF) ──
function yazdirmaAc(html) {
  const w = window.open('', '_blank');
  if (!w) {
    alert('Yazdırma penceresi açılamadı. Tarayıcının açılır pencere engelini kaldırın.');
    return false;
  }
  w.document.write(html);
  w.document.close();
  setTimeout(() => w.print(), 500);
  return true;
}

const SINIF_LEJANTI = `
  <div class="legend">
    <div class="legend-item"><div class="legend-box" style="background:#B2EBF2"></div>1. Sınıf</div>
    <div class="legend-item"><div class="legend-box" style="background:#C8E6C9"></div>2. Sınıf</div>
    <div class="legend-item"><div class="legend-box" style="background:#FFE0B2"></div>3. Sınıf</div>
    <div class="legend-item"><div class="legend-box" style="background:#F8BBD0"></div>4. Sınıf</div>
    <div class="legend-item"><div class="legend-box" style="background:#E1BEE7"></div>Seçmeli</div>
  </div>`;

const YAZDIRMA_STILI = `
  @media print { body { margin: 0; } @page { size: A4 landscape; margin: 0.8cm; } }
  body { font-family: 'Times New Roman', serif; background: #e8e8e8; }
  .page { max-width: 1100px; margin: 20px auto; background: white; padding: 30px; box-shadow: 0 2px 8px rgba(0,0,0,0.15); }
  h1 { text-align: center; font-size: 16px; color: #1B2A4A; margin-bottom: 4px; border-bottom: 3px solid #1B2A4A; padding-bottom: 8px; }
  h2 { text-align: center; font-size: 12px; color: #C00; margin-bottom: 6px; letter-spacing: 0.5px; }
  .info { text-align: center; font-size: 11px; color: #666; margin-bottom: 12px; }
  table { width: 100%; border-collapse: collapse; font-size: 11px; }
  th { padding: 8px 6px; border: 1px solid #999; background: #1B2A4A; color: white; font-weight: 700; text-align: center; font-size: 11px; }
  .legend { display: flex; gap: 12px; justify-content: center; margin-top: 12px; flex-wrap: wrap; }
  .legend-item { display: flex; align-items: center; gap: 4px; font-size: 10px; }
  .legend-box { width: 14px; height: 14px; border-radius: 3px; border: 1px solid #ccc; }
  .footer { text-align: center; font-size: 9px; color: #999; margin-top: 14px; }`;

// Izgaradan yazdırma tablosunun satırlarını üretir (yalnız dolu saatler).
function yazdirmaSatirlari(grid, saatler, hucreHTML) {
  let out = '';
  (saatler || HOURS).forEach((hour, hi) => {
    if (!DAYS.some((day) => (grid[day][hi] || []).length > 0)) return;
    let row = `<tr><td style="padding:6px 8px;border:1px solid #999;font-weight:600;text-align:center;background:#F9FAFB;white-space:nowrap">${hour}</td>`;
    DAYS.forEach((day) => {
      const entries = grid[day][hi] || [];
      row += entries.length
        ? `<td style="padding:2px;border:1px solid #ddd;vertical-align:top">${entries.map(hucreHTML).join('')}</td>`
        : `<td style="padding:4px;border:1px solid #ddd"></td>`;
    });
    out += row + '</tr>';
  });
  return out;
}

function belgeHTML(baslik, ustBaslik, altBaslik, bilgi, tableRows) {
  return `<!DOCTYPE html>
<html lang="tr">
<head><meta charset="utf-8"><title>${baslik}</title>
<style>${YAZDIRMA_STILI}</style>
</head>
<body>
<div class="page">
  <h1>${ustBaslik}</h1>
  <h2>${altBaslik}</h2>
  <div class="info">${bilgi}</div>
  <table>
    <thead><tr>
      <th style="width:90px">Saat</th>
      ${DAYS.map((d) => `<th>${d}</th>`).join('')}
    </tr></thead>
    <tbody>${tableRows}</tbody>
  </table>
  ${SINIF_LEJANTI}
  <div class="footer">Oluşturulma: ${new Date().toLocaleDateString('tr-TR')} — ÇAKÜ Ders Programı Otomasyonu</div>
</div>
</body></html>`;
}

// Türkçe BÜYÜK harf: düz toUpperCase 'i' harfini 'I' yapıyor ve başlıkta
// "BILGISAYAR MÜHENDISLIĞI" yazıyordu.
const buyuk = (metin) => String(metin == null ? '' : metin).toLocaleUpperCase('tr-TR');

// Antet artık koda gömülü değil: kurum ve fakülte adı bağlamdan gelir
// (üniversite ayarı + programın kapsam fakültesi). Yeni bir fakülte açıldığında
// çıktının başında başka bir fakültenin adı yazmıyor.
function antetUst(baglam) {
  const b = baglam || {};
  return [b.kurumAd, b.fakulteAd].filter(Boolean).join(' — ') || 'DERS PROGRAMI';
}

// ── Bölüm PDF ──
function bolumYazdir(deptAllYearsSlots, deptName, semester, baglam) {
  const b = baglam || {};
  const saatler = b.saatler || HOURS;
  const donem = window.dpDonemAdi(semester);
  const grid = programIzgarasiKur(
    deptAllYearsSlots,
    (slot, kaynak) => mergeSplitSlot(slot, { year: kaynak.year }),
    saatler
  );
  const ozet = window.dpProgramOzeti(deptAllYearsSlots);
  const tableRows = yazdirmaSatirlari(grid, saatler, (e) => {
    const bg = GRADE_COLORS[e.sinif]?.bg || '#F3F4F6';
    return `<div style="padding:4px 6px;margin:1px 0;border-radius:4px;background:${bg}">
      <div style="font-weight:700;font-size:11px">${e.courseCode} <span style="font-weight:400;color:#666">(${e.year}. Sınıf)</span></div>
      <div style="font-size:10px;color:#444">${e.courseName}</div>
      ${e.instructor ? `<div style="font-size:9px;color:#666">${e.instructor}</div>` : ''}
      ${e.classroom ? `<div style="font-size:9px;color:#7C3AED;font-weight:600">${e.classroom}</div>` : ''}
    </div>`;
  });
  return yazdirmaAc(
    belgeHTML(
      'Ders Programı - ' + deptName,
      antetUst(b) + ' — HAFTALIK DERS PROGRAMI',
      `${buyuk(deptName)} — ${buyuk(donem)} DÖNEMİ — TÜM SINIFLAR`,
      `${b.akademikYil || ''} ${b.seviyeAd || ''} · ${ozet.dersSayisi} ders, ${ozet.dersSaati} ders saati`,
      tableRows
    )
  );
}

// ── Fakülte PDF ──
function fakulteYazdir(allFacultySlots, semester, baglam) {
  const b = baglam || {};
  const saatler = b.saatler || HOURS;
  const donem = window.dpDonemAdi(semester);
  const grid = programIzgarasiKur(
    allFacultySlots,
    (slot, kaynak) => mergeSplitSlot(slot, { deptName: kaynak.deptName, year: kaynak.year }),
    saatler
  );
  const ozet = window.dpProgramOzeti(allFacultySlots);
  const tableRows = yazdirmaSatirlari(grid, saatler, (e) => {
    const bg = GRADE_COLORS[e.sinif]?.bg || '#F3F4F6';
    return `<div style="padding:3px 6px;margin:2px 0;border-radius:4px;background:${bg};font-size:9px;line-height:1.3">
      <strong>${e.courseCode}</strong>
      <span style="color:#555;margin-left:3px">${e.deptName} ${e.year}.Sınıf</span>
      ${e.classroom ? `<br/><span style="color:#7C3AED;font-weight:600">${e.classroom}</span>` : ''}
    </div>`;
  });
  return yazdirmaAc(
    belgeHTML(
      'Fakülte Ders Programı',
      antetUst(b) + ' — BİRLEŞİK DERS PROGRAMI',
      `${buyuk(donem)} DÖNEMİ — ${ozet.bolumler.join(', ')}`,
      `${b.akademikYil || ''} ${b.seviyeAd || ''} · ${ozet.dersSayisi} ders, ${ozet.dersSaati} ders saati`,
      tableRows
    )
  );
}

// ── .xlsx ortak gövdesi ──
// Antet satırları tablonun ÜSTÜNDE durur ve tamamı bağlamdan gelir; hiçbiri
// koda gömülü değildir.
function antetSatirlari(baglam, altBaslik) {
  const b = baglam || {};
  const bos = new Array(DAYS.length).fill('');
  const satir = (metin) => [{ v: metin, stil: (window.XLSX_STIL || {}).vurgu || 3 }].concat(bos);
  return [
    satir(b.kurumAd || ''),
    satir(b.fakulteAd || ''),
    satir(altBaslik),
    satir(
      [b.akademikYil, b.donemAd && b.donemAd + ' Dönemi', b.seviyeAd, b.kapsamAd]
        .filter(Boolean)
        .join(' · ')
    ),
    new Array(DAYS.length + 1).fill(''),
  ];
}

function altBilgiSatirlari(baglam, ozet, renkler) {
  const b = baglam || {};
  const bos = new Array(DAYS.length).fill('');
  const satirlar = [
    new Array(DAYS.length + 1).fill(''),
    [`Toplam ${ozet.dersSayisi} ders · ${ozet.dersSaati} ders saati`].concat(bos),
    [`Belge Tarihi: ${new Date().toLocaleDateString('tr-TR')}`].concat(bos),
  ];
  if (b.hazirlayan) satirlar.push([`Hazırlayan: ${b.hazirlayan}`].concat(bos));
  // Renk lejantı: fakülte çıktısında kodun rengi hangi bölümü gösteriyor?
  const liste = Object.entries(renkler || {});
  if (liste.length > 1) {
    satirlar.push(new Array(DAYS.length + 1).fill(''));
    satirlar.push(['Bölüm renkleri:'].concat(bos));
    liste.forEach(([ad, renk]) => {
      satirlar.push([{ v: ad, renk }].concat(bos));
    });
  }
  return satirlar;
}

// ── Bölüm .xlsx — yalnız ders kodu, bölümün renginde ──
function bolumXlsx(deptAllYearsSlots, deptName, semester, baglam) {
  const b = baglam || {};
  const saatler = b.saatler || HOURS;
  const donem = window.dpDonemAdi(semester);
  const renk = b.bolumRengi || window.bolumRengiCoz({ bolumAdi: deptName });
  const grid = programIzgarasiKur(deptAllYearsSlots, (slot) => kodMetni(slot), saatler);
  const govde = programSatirlari(grid, saatler).map((satir, i) =>
    i === 0 ? satir : satir.map((h, j) => (j === 0 || !h ? h : { v: h, renk }))
  );
  const antet = antetSatirlari(
    { ...b, donemAd: donem },
    buyuk(deptName) + ' — HAFTALIK DERS PROGRAMI'
  );
  window.xlsxIndir(window.dpCiktiDosyaAdi([deptName, donem, b.akademikYil, 'ders programi']), {
    sayfaAdi: donem + ' Dönemi',
    satirlar: antet.concat(
      govde,
      altBilgiSatirlari(b, window.dpProgramOzeti(deptAllYearsSlots), {})
    ),
    sutunGenislikleri: [15].concat(new Array(DAYS.length).fill(26)),
    baslikIndeksi: antet.length,
  });
}

// ── Fakülte .xlsx — yalnız ders kodu, her kod KENDİ bölümünün renginde ──
function fakulteXlsx(allFacultySlots, semester, baglam) {
  const b = baglam || {};
  const saatler = b.saatler || HOURS;
  const donem = window.dpDonemAdi(semester);
  const renkler = b.renkHaritasi || {};
  // Hücre içeriği zengin metindir: her ders kodu ayrı bir parça, kendi
  // rengiyle. Bir hücrede birden çok bölüm olabildiği için zemin rengi
  // kullanılamaz (bkz. dosya başındaki açıklama).
  const grid = programIzgarasiKur(
    allFacultySlots,
    (slot, kaynak) => ({
      kod: kodMetni(slot),
      renk: window.renkKoyuMetin(
        renkler[kaynak.deptName] || window.bolumRengiCoz({ bolumAdi: kaynak.deptName })
      ),
    }),
    saatler
  );
  const basliklar = ['Saat'].concat(DAYS);
  const govde = [basliklar];
  saatler.forEach((hour, hi) => {
    if (!DAYS.some((day) => (grid[day][hi] || []).length > 0)) return;
    govde.push(
      [{ v: hour, stil: (window.XLSX_STIL || {}).vurgu || 3 }].concat(
        DAYS.map((day) => {
          const hucreler = (grid[day][hi] || []).filter((x) => x && x.kod);
          if (hucreler.length === 0) return '';
          const parcalar = [];
          hucreler.forEach((x, i) => {
            if (i > 0) parcalar.push({ t: '\n' });
            parcalar.push({ t: x.kod, renk: x.renk });
          });
          return { parcalar, v: hucreler.map((x) => x.kod).join('\n') };
        })
      )
    );
  });
  const antet = antetSatirlari({ ...b, donemAd: donem }, 'BİRLEŞİK HAFTALIK DERS PROGRAMI');
  window.xlsxIndir(
    window.dpCiktiDosyaAdi([b.fakulteAd || 'Fakulte', donem, b.akademikYil, 'ders programi']),
    {
      sayfaAdi: 'Fakülte ' + donem,
      satirlar: antet.concat(
        govde,
        altBilgiSatirlari(b, window.dpProgramOzeti(allFacultySlots), renkler)
      ),
      sutunGenislikleri: [15].concat(new Array(DAYS.length).fill(30)),
      baslikIndeksi: antet.length,
    }
  );
}

// ══════════════════════════════════════════════════════════════
// ŞABLON KÖPRÜSÜ
//
// Dört çıktının her biri Şablonlar modülünden AYRI bir şablon alabilir:
//   bolum-xlsx · bolum-pdf · fakulte-xlsx · fakulte-pdf
// Şablon yüklenmemişse yukarıdaki gömülü çıktı üretilir — şablon yüklemeyen
// bölüm hiçbir şey kaybetmez.
// ══════════════════════════════════════════════════════════════
async function sablondanUret(secenek) {
  const TE = window.TemplateEngine;
  if (!TE) return { ok: false, reason: 'no-engine' };
  const { bicim, dosyaAdi, ...ortak } = secenek;
  if (bicim === 'xlsx') {
    if (!TE.produceRowsXlsx) return { ok: false, reason: 'no-engine' };
    return await TE.produceRowsXlsx({ ...ortak, filename: dosyaAdi + '.xlsx' });
  }
  if (!TE.produceFromTemplate) return { ok: false, reason: 'no-engine' };
  return await TE.produceFromTemplate({ ...ortak, filename: dosyaAdi + '.docx' });
}

// Şablon denemesi başarısızsa kullanıcıya YALNIZ düzeltebileceği durumlarda
// haber verilir; "şablon yüklenmemiş" normal bir durumdur, uyarı değil.
function sablonUyarisi(sonuc, belgeAdi) {
  if (sonuc.reason === 'no-mapping') {
    alert(
      belgeAdi +
        ' şablonunun alan eşlemesi yapılmamış. Şablonlar modülünden şablonu açıp 🧩 ile alanları eşleyin. Şimdilik yerleşik çıktı kullanılacak.'
    );
  } else if (sonuc.reason === 'invalid-output') {
    alert(
      'Yüklü ' +
        belgeAdi.toLocaleLowerCase('tr-TR') +
        ' şablonundan geçerli belge üretilemedi (şablonda {{Saat}} satırı bulunamadı ya da yapı desteklenmiyor). Yerleşik çıktı kullanılacak.'
    );
  } else if (sonuc.reason === 'not-xlsx' || sonuc.reason === 'not-docx') {
    alert(
      belgeAdi +
        ' için yüklenen şablonun biçimi bu çıktıya uymuyor (.xlsx çıktısı için Excel, PDF çıktısı için Word şablonu gerekir). Yerleşik çıktı kullanılacak.'
    );
  }
}

/** Şablon çıktısı için ortak veri: künye + saat satırları. */
function sablonVerisi(kaynaklar, hucreYaz, baglam) {
  const b = baglam || {};
  const saatler = b.saatler || HOURS;
  const izgara = programIzgarasiKur(kaynaklar, hucreYaz, saatler);
  return {
    staticData: window.dpSablonKunyesi({ ...b, ozet: window.dpProgramOzeti(kaynaklar) }),
    rows: window.dpSablonSatirlari(izgara, DAYS, saatler),
  };
}

async function sablonDene(secenek) {
  const { kaynaklar, hucreYaz, baglam, docType, bicim, belgeAdi, dosyaParcalari } = secenek;
  const veri = sablonVerisi(kaynaklar, hucreYaz, baglam);
  const sonuc = await sablondanUret({
    module: 'dersprogrami',
    docType,
    departmentId: (baglam || {}).departmentId || '',
    staticData: veri.staticData,
    rows: veri.rows,
    stripRowBold: true,
    bicim,
    dosyaAdi: window.dpCiktiDosyaAdi(dosyaParcalari),
  });
  if (!sonuc.ok) sablonUyarisi(sonuc, belgeAdi);
  return sonuc;
}

// ══════════════════════════════════════════════════════════════
// DIŞA AÇILAN İKİ GİRİŞ — her biri .xlsx ve PDF üretir
// ══════════════════════════════════════════════════════════════
async function exportDeptSchedule(deptAllYearsSlots, deptName, semester, baglam) {
  const b = { ...(baglam || {}), bolumAd: deptName, donem: semester, kapsamAd: 'Tüm Sınıflar' };
  const kunye = window.dpSablonKunyesi({ ...b, ozet: window.dpProgramOzeti(deptAllYearsSlots) });
  const ortak = { ...b, akademikYil: kunye.akademikYil, seviyeAd: kunye.seviyeAd };
  const dosya = [deptName, window.dpDonemAdi(semester), kunye.akademikYil, 'ders programi'];

  const xls = await sablonDene({
    kaynaklar: deptAllYearsSlots,
    hucreYaz: bolumHucresi,
    baglam: ortak,
    docType: 'bolum-xlsx',
    bicim: 'xlsx',
    belgeAdi: 'Bölüm Excel çıktısı',
    dosyaParcalari: dosya,
  });
  if (!xls.ok) bolumXlsx(deptAllYearsSlots, deptName, semester, ortak);

  const pdf = await sablonDene({
    kaynaklar: deptAllYearsSlots,
    hucreYaz: bolumHucresi,
    baglam: ortak,
    docType: 'bolum-pdf',
    bicim: 'docx',
    belgeAdi: 'Bölüm PDF çıktısı',
    dosyaParcalari: dosya,
  });
  if (!pdf.ok) bolumYazdir(deptAllYearsSlots, deptName, semester, ortak);
}

async function exportFacultySchedule(allFacultySlots, semester, baglam) {
  const ozet = window.dpProgramOzeti(allFacultySlots);
  // Fakülte çıktısı tek bölüme ait değildir: bölüm alanı boş kalır, kapsanan
  // bölümler künyeye yazılır.
  const b = {
    ...(baglam || {}),
    bolumAd: '',
    donem: semester,
    kapsamAd: (baglam || {}).kapsamAd || ozet.bolumler.join(', '),
  };
  const kunye = window.dpSablonKunyesi({ ...b, ozet });
  const ortak = { ...b, akademikYil: kunye.akademikYil, seviyeAd: kunye.seviyeAd };
  const dosya = [
    ortak.fakulteAd || 'Fakulte',
    window.dpDonemAdi(semester),
    kunye.akademikYil,
    'ders programi',
  ];

  const xls = await sablonDene({
    kaynaklar: allFacultySlots,
    hucreYaz: fakulteHucresi,
    baglam: ortak,
    docType: 'fakulte-xlsx',
    bicim: 'xlsx',
    belgeAdi: 'Fakülte Excel çıktısı',
    dosyaParcalari: dosya,
  });
  if (!xls.ok) fakulteXlsx(allFacultySlots, semester, ortak);

  const pdf = await sablonDene({
    kaynaklar: allFacultySlots,
    hucreYaz: fakulteHucresi,
    baglam: ortak,
    docType: 'fakulte-pdf',
    bicim: 'docx',
    belgeAdi: 'Fakülte PDF çıktısı',
    dosyaParcalari: dosya,
  });
  if (!pdf.ok) fakulteYazdir(allFacultySlots, semester, ortak);
}

// ══════════════════════════════════════════════════════════════
// DERS SAATİ AYARI (bölüme özel)
//
// Bölüm yetkilisi programın günün kaçında başlayıp kaçında biteceğini seçer.
// Ders 45 dakika, teneffüs 15 dakikadır ve ritim buradan değiştirilemez —
// değişen yalnız pencerenin iki ucudur. Lisans ve lisansüstü ayrı ayarlanır
// (lisansüstü akşam saatlerine taşar).
//
// ⚠ Kayıtlı program saat İNDEKSİYLE durur. Başlangıç saati değişince tüm
// ızgara birlikte kayar: ders "günün 4. saati" olmaya devam eder, yalnız o
// saatin adı değişir. Ders SAYISI azalırsa (bitiş öne çekilirse) sona düşen
// dersler ızgarada görünmez olur — bu yüzden modal kaç dersin dışarıda
// kalacağını önceden söyler.
// ══════════════════════════════════════════════════════════════
const SaatAyariModal = ({ acik, kapat, bolumId, bolumAdi, kayit, kaydedildi }) => {
  const [lisans, setLisans] = useState(() => window.bolumSaatAyari(kayit, 'lisans'));
  const [lisansustu, setLisansustu] = useState(() => window.bolumSaatAyari(kayit, 'doktora'));
  const [kaydediyor, setKaydediyor] = useState(false);
  const [hata, setHata] = useState('');

  useEffect(() => {
    if (!acik) return;
    setLisans(window.bolumSaatAyari(kayit, 'lisans'));
    setLisansustu(window.bolumSaatAyari(kayit, 'doktora'));
    setHata('');
  }, [acik, kayit]);

  if (!acik) return null;

  const kaydet = async () => {
    setKaydediyor(true);
    setHata('');
    try {
      await window.DBWrite.set(
        window.BOLUM_AYAR_KOLEKSIYONU || 'bolum_program_ayarlari',
        String(bolumId),
        {
          id: String(bolumId),
          departmentId: String(bolumId),
          // Normalize edilmiş hâli yazılır: bozuk aralık kaydedilmez, ekranda
          // gördüğü ile dosyada duran aynı olur.
          lisans: window.saatAyarNormalize(lisans, 'lisans'),
          lisansustu: window.saatAyarNormalize(lisansustu, 'doktora'),
          guncelleyen: new Date().toISOString(),
        },
        true
      );
      kaydedildi();
      kapat();
    } catch (e) {
      setHata(e && e.message ? e.message : 'Ayar kaydedilemedi.');
    } finally {
      setKaydediyor(false);
    }
  };

  const Bolme = ({ baslik, aciklama, deger, degistir }) => {
    const saatler = window.saatEtiketleri(deger);
    return (
      <div
        style={{
          border: '1px solid ' + DP.border,
          borderRadius: 10,
          padding: 14,
          background: '#FAFAFA',
        }}
      >
        <div style={{ fontSize: 13, fontWeight: 700, color: DP.text }}>{baslik}</div>
        <div style={{ fontSize: 11, color: DP.textMuted, marginTop: 2 }}>{aciklama}</div>
        <div style={{ display: 'flex', gap: 12, marginTop: 10, flexWrap: 'wrap' }}>
          <label style={{ fontSize: 11, color: DP.textMuted, fontWeight: 600 }}>
            Başlangıç
            <input
              type="time"
              value={deger.baslangic}
              onChange={(e) => degistir({ ...deger, baslangic: e.target.value })}
              style={{
                display: 'block',
                marginTop: 4,
                padding: '6px 8px',
                borderRadius: 6,
                border: '1px solid ' + DP.border,
                fontSize: 13,
              }}
            />
          </label>
          <label style={{ fontSize: 11, color: DP.textMuted, fontWeight: 600 }}>
            Bitiş
            <input
              type="time"
              value={deger.bitis}
              onChange={(e) => degistir({ ...deger, bitis: e.target.value })}
              style={{
                display: 'block',
                marginTop: 4,
                padding: '6px 8px',
                borderRadius: 6,
                border: '1px solid ' + DP.border,
                fontSize: 13,
              }}
            />
          </label>
        </div>
        <div style={{ marginTop: 10, fontSize: 11, color: DP.textMuted }}>
          {saatler.length} ders saati:
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 5 }}>
          {saatler.map((h) => (
            <span
              key={h}
              style={{
                fontSize: 10,
                fontWeight: 600,
                padding: '3px 7px',
                borderRadius: 5,
                background: DP.primaryPale,
                color: DP.primary,
              }}
            >
              {h}
            </span>
          ))}
        </div>
      </div>
    );
  };

  // Ders saati azalıyorsa uyar: sondaki satırlara yerleşmiş dersler ızgarada
  // görünmez olur (kayıttan silinmez, ayar geri alınınca geri gelir).
  const oncekiLisans = window.saatEtiketleri(window.bolumSaatAyari(kayit, 'lisans')).length;
  const yeniLisans = window.saatEtiketleri(lisans).length;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15,23,42,0.45)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
      onClick={kapat}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'white',
          borderRadius: 14,
          padding: 22,
          width: 'min(560px, 100%)',
          maxHeight: '90vh',
          overflowY: 'auto',
          boxShadow: '0 20px 50px rgba(0,0,0,0.25)',
        }}
      >
        <div style={{ fontSize: 17, fontWeight: 700, color: DP.navy }}>Ders Saati Ayarı</div>
        <div style={{ fontSize: 12, color: DP.textMuted, marginTop: 4 }}>
          {bolumAdi} — bu ayar yalnız bu bölüm içindir. Ders 45 dakika, teneffüs 15 dakikadır;
          başlangıç ve bitiş saatini siz seçersiniz.
        </div>

        <div style={{ display: 'grid', gap: 12, marginTop: 16 }}>
          <Bolme baslik="Lisans" aciklama="Gündüz programı" deger={lisans} degistir={setLisans} />
          <Bolme
            baslik="Lisansüstü"
            aciklama="Yüksek lisans / doktora — genelde akşam saatlerini de kapsar"
            deger={lisansustu}
            degistir={setLisansustu}
          />
        </div>

        {yeniLisans < oncekiLisans && (
          <div
            style={{
              marginTop: 14,
              padding: '10px 12px',
              borderRadius: 8,
              background: '#FEF3C7',
              border: '1px solid #FCD34D',
              fontSize: 11,
              color: '#92400E',
              lineHeight: 1.5,
            }}
          >
            Lisans programı {oncekiLisans} saatten {yeniLisans} saate iniyor. Son{' '}
            {oncekiLisans - yeniLisans} satıra yerleştirilmiş dersler ızgarada görünmez olur —
            kayıttan silinmezler, ayarı geri alırsanız geri gelirler.
          </div>
        )}

        {hata && <div style={{ marginTop: 12, fontSize: 12, color: '#B91C1C' }}>{hata}</div>}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 18 }}>
          <button
            onClick={kapat}
            style={{
              padding: '8px 14px',
              borderRadius: 8,
              border: '1px solid ' + DP.border,
              background: 'white',
              color: DP.textMuted,
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Vazgeç
          </button>
          <button
            onClick={kaydet}
            disabled={kaydediyor}
            style={{
              padding: '8px 16px',
              borderRadius: 8,
              border: 'none',
              background: DP.primary,
              color: 'white',
              fontSize: 12,
              fontWeight: 700,
              cursor: kaydediyor ? 'default' : 'pointer',
              opacity: kaydediyor ? 0.6 : 1,
            }}
          >
            {kaydediyor ? 'Kaydediliyor…' : 'Kaydet'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Sürüklenebilir Ders Kartı (havuzdan tabloya bırakma) ──
const CourseChip = ({ course, color }) => {
  const handleDragStart = (e) => {
    e.dataTransfer.setData(
      'application/json',
      JSON.stringify({
        id: course.id,
        code: course.code,
        name: course.name,
        professor: course.professor || '',
        sinif: course.sinif || 0,
      })
    );
    e.dataTransfer.effectAllowed = 'copy';
    e.currentTarget.style.opacity = '0.45';
  };
  const handleDragEnd = (e) => {
    e.currentTarget.style.opacity = '1';
  };
  const c = color || '#6B7280';
  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      title={`${course.code} - ${course.name}${course.professor ? ' (' + course.professor + ')' : ''}`}
      style={{
        padding: '7px 9px',
        borderRadius: 7,
        cursor: 'grab',
        userSelect: 'none',
        background: `${c}12`,
        borderLeft: `3px solid ${c}`,
        border: `1px solid ${c}30`,
        marginBottom: 6,
        transition: 'all 0.15s',
      }}
    >
      <div style={{ fontSize: 11, fontWeight: 700, color: c }}>{course.code}</div>
      <div style={{ fontSize: 10, color: '#374151', lineHeight: 1.3, marginTop: 1 }}>
        {course.name}
      </div>
      {course.professor && (
        <div style={{ fontSize: 9, color: '#9CA3AF', marginTop: 2 }}>{course.professor}</div>
      )}
    </div>
  );
};

function DersProgramiApp({
  currentUser,
  activeDepartment,
  departmentInfo,
  seviye = 'lisans',
  // Lisansüstü gibi bir sarmalayıcı içinde gömülü: kendi büyük başlık/ikon
  // bloğu gizlenir (çifte başlık olmasın), işlevsel butonlar kalır.
  embedded = false,
}) {
  // Seviye eki: lisans geriye-uyumlu (eksiz), lisansüstü ayrı belge uzayı.
  const seviyeSuffix = seviye && seviye !== 'lisans' ? '_' + seviye : '';
  // Program ayarları (saat aralığı + bölüm rengi) — bölüm başına bir kayıt.
  // `surum` artınca yeniden okunur: ayar kaydedilince ızgara hemen değişsin.
  const [ayarSurumu, setAyarSurumu] = useState(0);
  const bolumAyarlari = window.useBolumAyarlari(ayarSurumu);
  const bolumAyarKaydi = bolumAyarlari[String(activeDepartment || '')] || null;
  const [showSaatAyari, setShowSaatAyari] = useState(false);

  // ── Bu bölümün ders saatleri ──
  // Başlangıç/bitiş bölümün kendi kararıdır; ritim sabittir (45 dk ders +
  // 15 dk teneffüs). Ayar yoksa varsayılan bugünkü ızgaranın aynısıdır, yani
  // hiçbir bölüm ayar yapmadan da eskisi gibi çalışır.
  const visibleHours = useMemo(
    () => window.bolumSaatleri(bolumAyarKaydi, seviye),
    [bolumAyarKaydi, seviye]
  );
  // Fakülte görünümünün ORTAK saat ekseni: bölümler farklı saatte başlıyorsa
  // tek ızgarada buluşabilmeleri için (bkz. lib/ders-saatleri.js).
  const [fakulteSaatleri, setFakulteSaatleri] = useState(visibleHours);
  const [scheduleData, setScheduleData] = useState({});
  const [loading, setLoading] = useState(true);
  const [semester, setSemester] = useState('guz');
  const [year, setYear] = useState('1');
  const [editMode, setEditMode] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const responsive = window.useResponsive();

  // Sınav otomasyonundan paylaşılan veriler
  const [courses, setCourses] = useState([]);
  const [professors, setProfessors] = useState([]);
  const [classrooms, setClassrooms] = useState([]);

  // Modal form state
  const [modalCourseId, setModalCourseId] = useState('');
  const [modalClassroom, setModalClassroom] = useState('');

  // Fakülte birleşik görünüm & çakışma state
  const [showFacultyView, setShowFacultyView] = useState(false);
  const [allSchedules, setAllSchedules] = useState([]);
  const [conflicts, setConflicts] = useState([]);
  const [showConflicts, setShowConflicts] = useState(false);
  const [loadingFaculty, setLoadingFaculty] = useState(false);

  // Bölüm içi tüm sınıfların programlarını yükle (çakışma kontrolü için)
  const [deptAllYearsSlots, setDeptAllYearsSlots] = useState([]);
  // Fakülte geneli tüm bölüm/sınıf slotları
  const [allFacultySlots, setAllFacultySlots] = useState([]);
  // Slot ekleme esnasında çakışma uyarıları
  const [addSlotWarnings, setAddSlotWarnings] = useState([]);
  // Akademisyenin kendi üniversite geneli haftalık programı (ortak bileşen)
  const [showMyProgram, setShowMyProgram] = useState(false);
  // Fakülte kapsamı için tek ihtiyaç duyulan alan (nesne değil — bkz.
  // loadAllSchedules bağımlılıkları).
  const kullaniciFakultesi = currentUser?.facultyId || '';
  // Çıktı künyesi için fakülte adı: kimlikten ada çeviren ortak önbellek.
  const fakulteAdlari = window.useFakulteAdlari();
  // Programın ait olduğu fakülte — loadAllSchedules'ta hesaplanan kapsam
  // fakültesidir (aktif bölümün fakültesi, yoksa kullanıcınınki).
  const [ciktiFakultesi, setCiktiFakultesi] = useState('');

  const isAdmin = currentUser?.role === 'admin';
  const isDeptManager = currentUser?.role === 'bolum_yetkilisi';
  const isProfessor = currentUser?.role === 'professor';
  const canManage = isAdmin || isDeptManager || isProfessor;

  // ── Çıktı bağlamı ──
  // Şablona basılacak künye: kurum · fakülte · seviye · hazırlayan. Bölüm adı,
  // dönem ve tarih çıktı fonksiyonunda eklenir (düğmeye göre değişir).
  // `departmentId` şablon çözümünde kullanılır: bölümün kendi şablonu varsa o,
  // yoksa fakültenin, o da yoksa üniversitenin şablonu (bkz. /templates/resolve).
  const ciktiBaglami = useMemo(
    () => ({
      kurumAd: (window.TENANT && window.TENANT.universityName) || '',
      fakulteAd: ciktiFakultesi ? fakulteAdlari[ciktiFakultesi] || '' : '',
      departmentId: activeDepartment || '',
      seviye,
      hazirlayan: currentUser?.name || '',
      saatler: visibleHours,
      // Bölüm çıktısında hücreler bu tek renkte boyanır.
      bolumRengi: window.bolumRengiCoz({
        ayarRengi: bolumAyarKaydi && bolumAyarKaydi.renk,
        bolumAdi: departmentInfo?.name || '',
      }),
    }),
    [
      ciktiFakultesi,
      fakulteAdlari,
      activeDepartment,
      seviye,
      currentUser?.name,
      visibleHours,
      bolumAyarKaydi,
      departmentInfo?.name,
    ]
  );

  // Bölümün saat indeksini FAKÜLTE ekseninin indeksine çevirir. Bölümler
  // farklı saatte başlayabildiği için indeksler bire bir değildir; karşılığı
  // yoksa -1 döner ve fakülte taraması o saat için atlanır.
  const eksenHaritam = useMemo(
    () => window.saatEksenHaritasi(visibleHours, fakulteSaatleri),
    [visibleHours, fakulteSaatleri]
  );
  const fakulteSaatIndeksi = useCallback(
    (hi) => (eksenHaritam[hi] == null ? -1 : eksenHaritam[hi]),
    [eksenHaritam]
  );

  // Fakülte çıktısının bağlamı: ortak saat ekseni + bölüm renk haritası.
  // Renk, bölümün kendi ayarından gelir; ayarı yoksa adından ya da paletten
  // (lib/bolum-renkleri.js) — böylece aynı bölüm her çıktıda aynı renkte.
  const fakulteBaglami = useMemo(() => {
    const adlar = [...new Set(allSchedules.map((s) => s.deptName).filter(Boolean))].sort((a, b) =>
      a.localeCompare(b, 'tr')
    );
    const kimlikler = {};
    allSchedules.forEach((s) => {
      if (s.deptName && s.deptId && !kimlikler[s.deptName])
        kimlikler[s.deptName] = String(s.deptId);
    });
    return {
      ...ciktiBaglami,
      saatler: fakulteSaatleri,
      renkHaritasi: window.bolumRenkHaritasi(
        adlar.map((ad) => ({
          ad,
          renk: (bolumAyarlari[kimlikler[ad]] || {}).renk,
        }))
      ),
    };
  }, [ciktiBaglami, fakulteSaatleri, allSchedules, bolumAyarlari]);

  // Sınav otomasyonundaki dersleri, hocaları ve derslikleri yükle (bölüm bazlı)
  useEffect(() => {
    const loadSharedData = async () => {
      if (!activeDepartment) {
        setCourses([]);
        setProfessors([]);
        setClassrooms([]);
        return;
      }
      try {
        // Bölümün tüm kimlik varyantları — eski kimlikle kaydedilmiş ders/
        // derslik kayıtları da bulunsun (ham eşitlik filtresi onları kaçırır)
        const deptVariants = window.deptIdVariants
          ? await window.deptIdVariants(activeDepartment)
          : [activeDepartment];

        // Dersler (sinav_dersler) - sadece aktif bölüm + bu modülün SEVİYESİ
        const courseChunks = await Promise.all(
          deptVariants.map((v) =>
            window.apiRead('sinav_dersler', { where: `departmentId:eq:${v}` }).catch(() => [])
          )
        );
        const seenCourseIds = new Set();
        const rawCourses = [];
        courseChunks.flat().forEach((c) => {
          const cid = c && (c.id || c._docId);
          if (!c || (cid && seenCourseIds.has(cid))) return;
          if (cid) seenCourseIds.add(cid);
          rawCourses.push(c);
        });
        const courseList = (rawCourses || [])
          .filter((c) => (c.seviye || 'lisans') === seviye)
          .slice();
        courseList.sort(
          (a, b) => (a.sinif || 0) - (b.sinif || 0) || (a.code || '').localeCompare(b.code || '')
        );
        setCourses(courseList);

        // Akademisyenler (professors) — aktif bölümün ana akademisyenleri +
        // çapraz-bölüm (additionalDepartments) ile eklenenler. window.profMatchesDept
        // her iki durumu da kontrol eder; veri küçük olduğu için tüm liste çekilip
        // client-side filtrelenir.
        const allProfs = await window.apiRead('professors');
        const deptInfoForFilter = (window.DEPARTMENTS || []).find((x) => x.id === activeDepartment);
        // Eski kimlikli akademisyen kayıtları da eşleşsin diye tüm varyantlar denenir
        const rawProfs = (allProfs || []).filter((p) =>
          deptVariants.some((v) =>
            window.profMatchesDept
              ? window.profMatchesDept(p, v, deptInfoForFilter?.name)
              : p.departmentId === v
          )
        );
        const profMap = {};
        rawProfs.forEach((p) => {
          const key = (p.name || '').trim();
          if (!key || profMap[key]) return;
          profMap[key] = p;
        });
        const profList = Object.values(profMap);
        profList.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'tr'));
        setProfessors(profList);

        // Derslikler (department_classrooms) - sadece aktif bölüm (tüm varyantlar)
        const roomChunks = await Promise.all(
          deptVariants.map((v) =>
            window
              .apiRead('department_classrooms', { where: `departmentId:eq:${v}` })
              .catch(() => [])
          )
        );
        const seenRoomIds = new Set();
        const roomList = [];
        roomChunks.flat().forEach((r) => {
          const rid = r && (r.id || r._docId);
          if (!r || (rid && seenRoomIds.has(rid))) return;
          if (rid) seenRoomIds.add(rid);
          roomList.push(r);
        });
        roomList.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        setClassrooms(roomList);
      } catch (e) {
        console.error('Paylaşılan veriler yüklenirken hata:', e);
      }
    };
    loadSharedData();
  }, [activeDepartment]);

  // Ders programını yükle
  // Bölüm değiştiğinde mevcut verileri ve düzenleme modunu sıfırla
  useEffect(() => {
    setScheduleData({});
    setEditMode(false);
    setAllSchedules([]);
    setConflicts([]);
  }, [activeDepartment]);

  useEffect(() => {
    const loadSchedule = async () => {
      setLoading(true);
      try {
        if (activeDepartment) {
          const docId = `${activeDepartment}_${semester}_${year}${seviyeSuffix}`;
          const result = await window.apiReadDoc('course_schedules', docId);
          setScheduleData(result.exists ? result.data?.slots || {} : {});
        } else {
          setScheduleData({});
        }
      } catch (e) {
        console.error('Ders programı yüklenirken hata:', e);
        setScheduleData({});
      } finally {
        setLoading(false);
      }
    };
    loadSchedule();
  }, [activeDepartment, semester, year]);

  // Slot bazlı kaydet (oku-değiştir-yaz): tüm slots haritasını körlemesine
  // ezmek yerine en güncel dokümanı okuyup yalnızca ilgili slotu değiştirir.
  // Böylece eşzamanlı düzenlemede veri kaybı en aza iner.
  const commitSlots = useCallback(
    async (mutator) => {
      if (!activeDepartment) {
        alert('Lütfen önce bir bölüm seçin.');
        return null;
      }
      const docId = `${activeDepartment}_${semester}_${year}${seviyeSuffix}`;
      try {
        // Yazmadan önce TAZE sunucu durumunu al: cache'i geçersiz kıl ki
        // başka bir kullanıcının son 15 sn içindeki değişikliği (ekleme/silme)
        // görünsün. Aksi halde bayat cache üzerinden yazmak eşzamanlı
        // düzenlemede kayıp güncelleme / silineni diriltme üretiyordu.
        let base = null; // null = okuma BAŞARISIZ (yerel duruma düş)
        try {
          if (window.apiInvalidate) window.apiInvalidate('course_schedules');
          const res = await window.apiReadDoc('course_schedules', docId);
          base = res && res.exists && res.data?.slots ? res.data.slots : {};
        } catch (_) {
          base = null;
        }
        // Taze okuma başarılıysa sunucu durumu tek doğruluk kaynağıdır
        // (silinen slotlar yerelden geri EKLENMEZ). Okuma başarısızsa veri
        // kaybını önlemek için yerel scheduleData'ya düşülür.
        const next = base !== null ? { ...base } : { ...scheduleData };
        mutator(next);
        await window.DBWrite.set(
          'course_schedules',
          docId,
          {
            slots: next,
            departmentId: activeDepartment,
            semester,
            year,
            seviye,
            updatedAt: new Date().toISOString(),
          },
          true
        );
        setScheduleData(next);
        return next;
      } catch (e) {
        console.error('Program kaydedilirken hata:', e);
        alert('Program kaydedilirken hata: ' + e.message);
        return null;
      }
    },
    [activeDepartment, semester, year, scheduleData]
  );

  // Sürükle-bırak / modal ortak yerleştirme mantığı
  const placeCourse = useCallback(
    ({ course, day, hi, classroom = '', forceAdd = false }) => {
      if (!course) return false;
      if (
        isProfessor &&
        currentUser?.name &&
        course.professor &&
        course.professor !== currentUser.name
      ) {
        alert('Sadece kendi derslerinizi programa ekleyebilirsiniz.');
        return false;
      }
      const key = `${day}_${hi}`;
      const existing = scheduleData[key];
      // Hücre BÖLME: dolu hücreye FARKLI bir ders bırakılırsa hücreye EKLENİR
      // (KML312 & TLK543 gibi eşdeğer dersler, ya da ayrı dersliklerdeki
      // gruplar). Ders sayısında sınır yok — her dersin kendi dersliği olur.
      const splitting = window.slotDersSayisi(existing) > 0;
      if (!forceAdd) {
        const otherYearsSlots = deptAllYearsSlots.filter((s) => s.year !== year);
        const warnings = checkSlotConflict(
          day,
          hi,
          // Çakışma EKLENEN dersin dersliğine bakar; hücredeki diğer dersin
          // dersliğini devralmak, sürükle-bırakta derslik seçilmediği hâlde
          // "derslik çakışması" uyarısı üretiyordu.
          classroom || '',
          course.professor || '',
          otherYearsSlots,
          allFacultySlots,
          visibleHours,
          fakulteSaatIndeksi(hi)
        );
        // Aynı dersi ikinci kez eklemek anlamsız — hücredeki TÜM dersler
        // taranır (eskiden yalnız birinci derse bakılıyordu).
        if (window.slotDersVarMi(existing, course.code)) {
          alert('Bu ders bu saatte zaten var.');
          return false;
        }
        // splitting durumunda "zaten ders var" uyarısı VERİLMEZ — bölme kasıtlıdır.
        if (warnings.length > 0) {
          if (isAdmin) {
            if (
              !window.confirm(
                (splitting ? 'Hücre bölünüyor. ' : '') +
                  'Çakışma tespit edildi:\n\n• ' +
                  warnings.join('\n• ') +
                  '\n\nYine de yerleştirilsin mi?'
              )
            )
              return false;
          } else {
            alert('Çakışma nedeniyle yerleştirilemedi:\n\n• ' + warnings.join('\n• '));
            return false;
          }
        }
      }
      commitSlots((s) => {
        // Her dersin KENDİ dersliği var: bölünen hücrede dersler ayrı
        // dersliklerde olabilir. Sürükle-bırakta derslik seçilmediği için boş
        // başlar; hücredeki satır içi seçiciden girilir.
        s[key] = window.slotDersEkle(s[key], {
          courseCode: course.code || '',
          courseName: course.name || '',
          instructor: course.professor || '',
          classroom: classroom || '',
          courseId: course.id,
          sinif: course.sinif || 0,
        });
      });
      return true;
    },
    [
      deptAllYearsSlots,
      allFacultySlots,
      scheduleData,
      year,
      isProfessor,
      isAdmin,
      currentUser,
      commitSlots,
    ]
  );

  // Tablodaki boş hücreye ders bırakıldığında
  const handleDropCourse = useCallback(
    (course, day, hi) => {
      placeCourse({ course, day, hi, classroom: '' });
    },
    [placeCourse]
  );

  // Hücredeki BİR dersin dersliğini satır içi değiştir (indeks: 0 = birinci).
  // Her dersin KENDİ dersliği vardır: aynı saatte kaç ders varsa o kadar
  // derslik girilebilir.
  const handleSlotClassroom = useCallback(
    (key, classroom, indeks = 0) => {
      const dersler = window.slotDersleri(scheduleData[key]);
      const ders = dersler[indeks];
      // Akademisyen yalnız kendi dersinin dersliğini değiştirebilir
      if (isProfessor && currentUser?.name && ders && ders.instructor !== currentUser.name) {
        alert('Sadece kendi derslerinizin dersliğini değiştirebilirsiniz.');
        return;
      }
      commitSlots((s) => {
        if (s[key]) s[key] = window.slotDersGuncelle(s[key], indeks, { classroom });
      });
    },
    [commitSlots, scheduleData, isProfessor, currentUser]
  );

  // Slot ekle — otomatik çakışma önleme (admin hariç herkes engellenir)
  const handleAddSlot = useCallback(
    (forceAdd) => {
      if (!selectedSlot || !modalCourseId) return;
      const course = courses.find((c) => c.id === modalCourseId);
      if (!course) return;

      // Akademisyen kontrolü: sadece kendi derslerini ekleyebilir
      if (isProfessor && currentUser?.name && course.professor !== currentUser.name) {
        alert('Sadece kendi derslerinizi programa ekleyebilirsiniz.');
        return;
      }

      const day = selectedSlot.day;
      const hi = selectedSlot.hourIndex;
      const key = `${day}_${hi}`;
      const existing = scheduleData[key];
      const instructor = course.professor || '';
      // Derslik EKLENEN derse aittir; bölünen hücrede ikinci ders birincinin
      // dersliğini devralmaz (iki ders iki ayrı derslikte olabilir).
      const classroom = modalClassroom || '';

      // Aynı dersi ikinci kez eklemek anlamsız — hücredeki TÜM dersler taranır.
      // Hücre kapasitesi SINIRSIZ: aynı saatte kaç ders varsa o kadar derslik.
      if (window.slotDersVarMi(existing, course.code)) {
        alert('Bu ders bu saatte zaten var.');
        return;
      }

      // Çakışma kontrolü (farklı yıl/fakülte) — hücre bölme "zaten var" saymaz
      if (!forceAdd) {
        const otherYearsSlots = deptAllYearsSlots.filter((s) => s.year !== year);
        const warnings = checkSlotConflict(
          day,
          hi,
          classroom,
          instructor,
          otherYearsSlots,
          allFacultySlots,
          visibleHours,
          fakulteSaatIndeksi(hi)
        );
        if (warnings.length > 0) {
          setAddSlotWarnings(warnings);
          return; // Çakışma var — admin ise "Geçersiz Kıl" gösterilecek, diğerleri engellenecek
        }
      }

      commitSlots((s) => {
        s[key] = window.slotDersEkle(s[key], {
          courseCode: course.code || '',
          courseName: course.name || '',
          instructor: course.professor || '',
          classroom,
          courseId: course.id,
          sinif: course.sinif || 0,
        });
      });
      setShowAddModal(false);
      setModalCourseId('');
      setModalClassroom('');
      setAddSlotWarnings([]);
    },
    [
      selectedSlot,
      modalCourseId,
      modalClassroom,
      scheduleData,
      courses,
      commitSlots,
      deptAllYearsSlots,
      allFacultySlots,
      year,
      isProfessor,
      currentUser,
    ]
  );

  // Akademisyen yalnız KENDİ dersinin slotuna müdahale edebilir (ekleme
  // yolundaki kısıtın silme/derslik değiştirme yollarında da karşılığı).
  const canEditInstructor = useCallback(
    (instructor) => {
      if (!isProfessor) return true; // admin / bölüm yetkilisi kısıtsız
      if (!currentUser?.name) return true;
      return instructor === currentUser.name;
    },
    [isProfessor, currentUser]
  );

  // Hücreden BİR dersi kaldır (indeks: 0 = birinci ders).
  // Birinci ders kaldırılırsa sıradaki birinciliğe terfi eder; son ders de
  // kaldırılınca hücre boşalır. (Eskiden iki ayrı işlev vardı: handleRemoveSlot
  // ve handleRemoveSecond — hücre yalnız iki ders tutabildiği için.)
  const handleRemoveDers = useCallback(
    (key, indeks = 0) => {
      const dersler = window.slotDersleri(scheduleData[key]);
      const ders = dersler[indeks];
      if (ders && !canEditInstructor(ders.instructor)) {
        alert('Sadece kendi derslerinizi kaldırabilirsiniz.');
        return;
      }
      commitSlots((s) => {
        const sonraki = window.slotDersCikar(s[key], indeks);
        if (sonraki) s[key] = sonraki;
        else delete s[key];
      });
    },
    [commitSlots, scheduleData, canEditInstructor]
  );

  // Tüm ders programlarını TEK bir koleksiyon okumasıyla yükle
  // (önceki N+1 okuma: bölüm×4 + diğer bölümler×4 ayrı istek yerine 1 istek).
  // Aktif bölüm = deptAllYearsSlots, diğer bölümler = allFacultySlots.
  const loadAllSchedules = useCallback(async () => {
    if (!activeDepartment) {
      setDeptAllYearsSlots([]);
      setAllFacultySlots([]);
      return { deptYears: [], faculty: [] };
    }
    setLoadingFaculty(true);
    try {
      const [allDocs, depts, ayarlarSimdiki] = await Promise.all([
        window.apiRead('course_schedules'),
        window.apiRead('departments'),
        // Bölümlerin saat ayarları — ortak eksen bunlardan kurulur. Önbellekli
        // okuma, her yüklemede yeni istek atmaz.
        window.bolumAyarlariniYukle(),
      ]);
      // Bölüm adı haritası — bölüm TÜM kimlik varyantlarıyla (id, _id, _docId,
      // code) anahtarlanır ki şablon belgesindeki departmentId hangi biçimde
      // olursa olsun ada çözülsün (aksi halde ham "7gwPii..." id'si basılıyordu).
      const deptNameMap = {};
      const validDeptIds = new Set();
      // Her kimlik varyantı → bölümün KANONİK kimliği (uygulama genelinde
      // kullanılan biçim: d.id || d._docId — app-shell ile aynı öncelik).
      // Kanonik olmayan kimlikle kaydedilmiş program dokümanları bayat
      // yinelenendir; fakülte kümesine alınmaz (hayalet ders + sahte çakışma).
      const variantToCanon = {};
      // Her kimlik varyantı → bölümün FAKÜLTESİ. Yalnız değeri olan kayıt
      // yazar: `facultyId` yalnız DB kayıtlarında var, koda gömülü listede
      // yok — gömülü kayıt DB'dekini silmemeli.
      const deptFacultyMap = {};
      const allDeptSources = Array.isArray(depts) ? depts : [];
      (window.DEPARTMENTS || []).forEach((d) => allDeptSources.push(d));
      allDeptSources.forEach((d) => {
        const nm = d && d.name;
        if (!nm) return;
        const canon = String(d.id || d._docId || d._id || d.code || '');
        const fac = String((d && d.facultyId) || '');
        [d.id, d._id, d._docId, d.code].forEach((k) => {
          if (k) {
            deptNameMap[String(k)] = nm;
            validDeptIds.add(String(k));
            if (canon && !variantToCanon[String(k)]) variantToCanon[String(k)] = canon;
            if (fac) deptFacultyMap[String(k)] = fac;
          }
        });
      });
      // Aktif bölümün TÜM kimlik varyantları: bölümün ESKİ kimlikle (örn.
      // _docId) kaydedilmiş program dokümanları "başka bölüm" sanılırsa hem
      // fakülte görünümünde hayalet ders gösterir hem de aynı derslik/saatte
      // SAHTE fakülte çakışması üretip hücre bölmeyi engeller (Bilgisayar
      // Müh.'te bölme çalışmıyordu; Elektrik'te eski kayıt yoktu, çalışıyordu).
      const activeRec = allDeptSources.find(
        (d) => d && [d.id, d._id, d._docId, d.code].some((k) => k && String(k) === activeDepartment)
      );
      const activeVariants = new Set(
        activeRec
          ? [activeRec.id, activeRec._id, activeRec._docId, activeRec.code]
              .filter(Boolean)
              .map(String)
          : [String(activeDepartment)]
      );
      // ── Fakülte kapsamı ──
      // Fakülte birleşik programı ve çıktıları YALNIZ kendi fakültesini
      // içerir. Önceden "geçerli bir bölüme bağlanabilen" her program fakülte
      // kümesine giriyordu; kullanıcının fakültesi hiç sorulmadığı için
      // Mühendislik'te Orman Fakültesi'nin dersleri de görünüyordu (çakışma
      // taraması da onlarla derslik çakışması üretiyordu).
      //
      // Ölçüt aktif bölümün fakültesidir; bilinmiyorsa kullanıcının fakültesi.
      // İkisi de yoksa (koda gömülü eski bölümler facultyId taşımaz) kapsam
      // "fakültesi bilinmeyen bölümler" olur — bu, gömülü Mühendislik
      // listesini bir arada tutar ve yeni fakültelerin verisini içeri almaz.
      const kapsamFakulte = String(
        deptFacultyMap[String(activeDepartment)] || kullaniciFakultesi || ''
      );
      // Çıktı künyesinde "hangi fakültenin programı" yazacak; kapsamla aynı
      // olmalı ki belge, içindeki verinin kapsamını doğru bildirsin.
      setCiktiFakultesi(kapsamFakulte);
      const deptYears = [];
      const faculty = [];
      const orphans = [];
      const digerFakulte = [];
      (allDocs || []).forEach((d) => {
        const parts = String(d.id || '').split('_');
        const deptId = d.departmentId || parts[0] || '';
        const sem = d.semester || parts[1] || '';
        const yr = String(d.year || parts[2] || '');
        // docId: dept_sem_year (lisans) veya dept_sem_year_seviye (lisansüstü)
        const docSeviye = d.seviye || (parts.length >= 4 ? parts[3] : 'lisans');
        const slots = d.slots || {};
        if (sem !== semester || !slots || Object.keys(slots).length === 0) return;
        // Yalnız bu modülün seviyesindeki programlar (çakışma kendi seviyesi içinde)
        if ((docSeviye || 'lisans') !== seviye) return;
        if (deptId === activeDepartment) {
          deptYears.push({ year: yr, slots });
        } else if (activeVariants.has(String(deptId))) {
          // Aktif bölümün eski kimlikli (yinelenen/bayat) kaydı: ne bölüm-içi
          // ne fakülte kümesine alınır — sahte çakışma ve hayalet ders kaynağı.
          orphans.push({ docId: d.id, deptId, not: 'aktif bölümün eski kimlikli kaydı' });
        } else if (validDeptIds.has(String(deptId))) {
          // DİĞER bölümler için de aynı kural: kanonik olmayan (eski) kimlikle
          // kaydedilmiş doküman bayat yinelenendir — fakülte kümesine alınmaz.
          const canon = variantToCanon[String(deptId)] || String(deptId);
          if (canon !== String(deptId)) {
            orphans.push({
              docId: d.id,
              deptId,
              not: `${deptNameMap[String(deptId)] || 'bölüm'} — eski kimlikli kayıt (kanonik: ${canon})`,
            });
            return;
          }
          // BAŞKA FAKÜLTENİN bölümü: fakülte programı fakülteye özeldir.
          const docFakulte = String(deptFacultyMap[String(deptId)] || '');
          if (docFakulte !== kapsamFakulte) {
            digerFakulte.push({
              docId: d.id,
              bolum: deptNameMap[String(deptId)] || deptId,
              fakulte: docFakulte || '(bilinmiyor)',
            });
            return;
          }
          faculty.push({ deptId, deptName: deptNameMap[String(deptId)], year: yr, slots });
        } else {
          // Yetim/eski kayıt: hiçbir canlı bölüme bağlanamıyor. Fakülte
          // programına eklenmez (aksi halde "BIL421Bölüm" gibi hayalet dersler
          // ve boş bölümde ders görünürdü). Temizlik için konsola raporla.
          orphans.push({ docId: d.id, deptId, codes: Object.keys(slots).length });
        }
      });
      if (orphans.length) {
        console.warn(
          '[ders-programi] Fakülte programına eklenmeyen yetim kayıtlar ' +
            '(hiçbir bölüme bağlanamıyor):',
          orphans
        );
      }
      if (digerFakulte.length) {
        console.info(
          '[ders-programi] Başka fakültenin programı olduğu için kapsam dışı ' +
            'bırakılan kayıtlar (kapsam: ' +
            (kapsamFakulte || '(fakültesi bilinmeyen bölümler)') +
            '):',
          digerFakulte
        );
      }
      // ── ORTAK SAAT EKSENİ ──
      // Bölümler farklı saatte başlayabildiği için slot indeksi bölümden
      // bölüme aynı saati göstermez. Fakülte kümesi tek ızgarada
      // gösterileceğinden her bölümün slotları ortak eksene çevrilir;
      // çevrilmeseydi 08:15'teki ders 08:30'daki dersle aynı satıra düşer,
      // olmayan bir derslik çakışması raporlanırdı.
      const bolumSaatHaritasi = {};
      const saatListesi = (dept) => {
        const anahtar = String(dept || '');
        if (!bolumSaatHaritasi[anahtar]) {
          bolumSaatHaritasi[anahtar] = window.bolumSaatleri(ayarlarSimdiki[anahtar], seviye);
        }
        return bolumSaatHaritasi[anahtar];
      };
      const kendiSaatleri = saatListesi(activeDepartment);
      const eksen = window.saatBirlesikEksen(
        [kendiSaatleri].concat(faculty.map((f) => saatListesi(f.deptId)))
      );
      const eksende = faculty.map((f) => ({
        ...f,
        slots: window.slotlariEksene
          ? window.slotlariEksene(f.slots, window.saatEksenHaritasi(saatListesi(f.deptId), eksen))
          : f.slots,
      }));

      setFakulteSaatleri(eksen);
      setDeptAllYearsSlots(deptYears);
      setAllFacultySlots(eksende);
      return { deptYears, faculty: eksende, eksen, kendiSaatleri };
    } catch (e) {
      console.error('Programlar yüklenirken hata:', e);
      return { deptYears: [], faculty: [] };
    } finally {
      setLoadingFaculty(false);
    }
    // ⚠ Bağımlılık kullanıcı NESNESİ değil, yalnız ihtiyaç duyulan ilkel
    // değer: app-shell çapraz bölümde `effectiveUser`i her render'da yeniden
    // kuruyor, nesneye bağlanmak sonsuz okuma döngüsü olurdu.
  }, [activeDepartment, semester, seviye, kullaniciFakultesi, ayarSurumu]);

  // Yalnızca bölüm/dönem değişince yeniden yükle (scheduleData YOK → döngü
  // ve her düzenlemede N+1 yeniden okuma sorunu giderildi).
  useEffect(() => {
    loadAllSchedules();
  }, [loadAllSchedules]);

  // Çakışma tespiti — kalıcı veriye ek olarak DÜZENLENEN sınıfın canlı
  // scheduleData'sı yansıtılır (yeniden ağ okuması yapmadan).
  useEffect(() => {
    const merged = deptAllYearsSlots.filter((s) => String(s.year) !== String(year));
    merged.push({ year: String(year), slots: scheduleData });
    const c = detectConflicts(merged, allFacultySlots, visibleHours, fakulteSaatleri);
    setConflicts(c);
  }, [deptAllYearsSlots, allFacultySlots, scheduleData, year, visibleHours, fakulteSaatleri]);

  // Seçili döneme ait tüm dersler — akademisyen sadece kendi derslerini görebilir
  const yearCourses = useMemo(() => {
    let filtered = courses.filter((c) => c.donem === semester);
    if (isProfessor && currentUser?.name) {
      filtered = filtered.filter((c) => c.professor === currentUser.name);
    }
    // Sınıfa göre sırala, sonra ders koduna göre
    filtered.sort((a, b) => {
      if ((a.sinif || 0) !== (b.sinif || 0)) return (a.sinif || 0) - (b.sinif || 0);
      return (a.code || '').localeCompare(b.code || '');
    });
    return filtered;
  }, [courses, semester, isProfessor, currentUser]);

  // Renk ataması
  const courseColors = useMemo(() => {
    const map = {};
    let idx = 0;
    const addCode = (code) => {
      if (code && !map[code]) {
        map[code] = SLOT_COLORS[idx % SLOT_COLORS.length];
        idx++;
      }
    };
    Object.values(scheduleData).forEach((slot) => {
      // Hücredeki HER derse renk atanır (yalnız ilk ikisine değil).
      window.slotDersleri(slot).forEach((d) => addCode(d.courseCode));
    });
    return map;
  }, [scheduleData]);

  // İstatistikler
  const stats = useMemo(() => {
    const slotCount = Object.keys(scheduleData).length;
    const uniqueCourses = new Set(Object.values(scheduleData).map((s) => s.courseCode)).size;
    const uniqueProfs = new Set(
      Object.values(scheduleData)
        .map((s) => s.instructor)
        .filter(Boolean)
    ).size;
    return { slotCount, uniqueCourses, uniqueProfs };
  }, [scheduleData]);

  // Bugünün günü (sütun vurgulama)
  const todayName = useMemo(() => {
    const dayMap = { 1: 'Pazartesi', 2: 'Salı', 3: 'Çarşamba', 4: 'Perşembe', 5: 'Cuma' };
    return dayMap[new Date().getDay()] || '';
  }, []);

  // Renk efsanesi
  const courseColorList = useMemo(() => {
    return Object.entries(courseColors).map(([code, color]) => {
      const slot = Object.values(scheduleData).find((s) => s.courseCode === code);
      return { code, color, name: slot?.courseName || code };
    });
  }, [courseColors, scheduleData]);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
        <div style={{ textAlign: 'center' }}>
          <div
            style={{
              width: 36,
              height: 36,
              border: '3px solid #E5E1D8',
              borderTopColor: DP.primary,
              borderRadius: '50%',
              animation: 'spin 0.8s linear infinite',
              margin: '0 auto 16px',
            }}
          />
          <p style={{ color: '#666', fontSize: 14 }}>Ders programı yükleniyor...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* Edit mode banner */}
      {editMode && (
        <div
          style={{
            background: 'linear-gradient(135deg, #059669, #10B981)',
            borderRadius: 10,
            padding: '10px 16px',
            marginBottom: 16,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'white' }}>
            <DPIcon
              path="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"
              size={16}
              color="white"
            />
            <span style={{ fontSize: 13, fontWeight: 600 }}>Düzenleme Modu</span>
            <span style={{ fontSize: 12, opacity: 0.85 }}>
              —{' '}
              {responsive.isMobile
                ? 'Boş hücreye tıklayarak ders ekleyin'
                : 'Soldaki dersleri tabloya sürükleyip bırakın'}
              , X ile silin
            </span>
          </div>
          <button
            onClick={() => setEditMode(false)}
            style={{
              padding: '5px 14px',
              borderRadius: 6,
              border: '1px solid rgba(255,255,255,0.4)',
              background: 'rgba(255,255,255,0.15)',
              color: 'white',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Kapat
          </button>
        </div>
      )}

      {/* Header */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          marginBottom: 16,
        }}
      >
        {embedded ? (
          <div style={{ fontSize: 13, color: DP.textMuted }}>
            {semester === 'guz' ? 'Güz' : 'Bahar'}
            {seviye === 'lisans' ? ` — ${year}. Sınıf` : ''}
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div>
              <h1
                style={{
                  fontSize: responsive.val(18, 22, 26),
                  fontWeight: 700,
                  color: DP.navy,
                  margin: 0,
                  lineHeight: 1.2,
                }}
              >
                Ders Programı
              </h1>
              <p style={{ fontSize: 12, color: DP.textMuted, margin: 0 }}>
                {departmentInfo?.name || 'Bölüm'} — {semester === 'guz' ? 'Güz' : 'Bahar'} — {year}.
                Sınıf
              </p>
            </div>
          </div>
        )}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
          {conflicts.length > 0 && (
            <button
              onClick={() => setShowConflicts(!showConflicts)}
              style={{
                padding: '7px 12px',
                borderRadius: 8,
                border: '1px solid #FCA5A5',
                background: '#FEF2F2',
                color: '#DC2626',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 5,
              }}
            >
              <DPIcon
                path="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z"
                size={13}
                color="#DC2626"
              />
              {conflicts.length} Çakışma
            </button>
          )}
          {/* Akademisyenin ÜNİVERSİTE GENELİ kendi haftalık programı: hangi
              bölümde ders verdiği fark etmeksizin tüm saatleri tek belgede
              toplar (bu ekran yalnız aktif bölüm+sınıfı gösterir). Bölüm
              yetkilisi aynı belgeye Bölüm Yönetimi → Akademisyen Bilgileri'nden
              ulaşır. */}
          {isProfessor && currentUser?.name && (
            <button
              onClick={() => setShowMyProgram(true)}
              style={{
                padding: '7px 12px',
                borderRadius: 8,
                border: '1px solid #C4B5FD',
                background: '#F5F3FF',
                color: DP.primary,
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 5,
              }}
            >
              <DPIcon
                path="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                size={13}
                color={DP.primary}
              />
              Benim Ders Programım
            </button>
          )}
          {/* Fakülte birleşik programı (ve Yazdır/PDF dekanlık çıktısı) yalnızca
              bölüm/fakülte/üniversite yetkililerinde; sıradan akademisyende gizli. */}
          {(isAdmin || isDeptManager) && (
            <button
              onClick={async () => {
                const { deptYears, faculty, eksen, kendiSaatleri } = await loadAllSchedules();
                // Kendi bölümümüzün slotları da ORTAK eksene çevrilir: fakülte
                // görünümü tek ızgaradır, iki farklı saat düzeni yan yana
                // konursa dersler yanlış satırda görünür.
                const kendiHarita = window.saatEksenHaritasi(kendiSaatleri || [], eksen || []);
                const ownDeptSlots = (deptYears || []).map((s) => ({
                  deptId: activeDepartment,
                  deptName: departmentInfo?.name || 'Bölüm',
                  year: s.year,
                  slots: window.slotlariEksene(s.slots, kendiHarita),
                }));
                const combined = [...ownDeptSlots, ...(faculty || [])];
                if (combined.length > 0) {
                  setAllSchedules(combined);
                  setShowFacultyView(true);
                } else {
                  alert('Fakülte genelinde bu dönem için ders programı bulunamadı.');
                }
              }}
              disabled={loadingFaculty}
              style={{
                padding: '7px 12px',
                borderRadius: 8,
                border: '1px solid #C4B5FD',
                background: '#EDE9FE',
                color: DP.primary,
                fontSize: 12,
                fontWeight: 600,
                cursor: loadingFaculty ? 'wait' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                opacity: loadingFaculty ? 0.6 : 1,
              }}
            >
              <DPIcon
                path="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                size={13}
                color={DP.primary}
              />
              {loadingFaculty ? 'Yükleniyor...' : 'Fakülte Programı'}
            </button>
          )}
          {/* Tek düğme, iki belge: .xlsx (yalnız ders kodları, bölümün
              renginde) iner ve yazdırma/PDF sayfası açılır. */}
          {(isAdmin || isDeptManager) && deptAllYearsSlots.length > 0 && (
            <button
              onClick={() =>
                exportDeptSchedule(
                  deptAllYearsSlots,
                  departmentInfo?.name || 'Bölüm',
                  semester,
                  ciktiBaglami
                )
              }
              title="Bölüm programını .xlsx olarak indirir ve yazdırma sayfasını açar"
              style={{
                padding: '7px 12px',
                borderRadius: 8,
                border: '1px solid #6EE7B7',
                background: '#ECFDF5',
                color: '#059669',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 5,
              }}
            >
              <DPIcon
                path="M12 10v6m0 0l-3-3m3 3l3-3M4 6a2 2 0 012-2h12a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V6z"
                size={13}
                color="#059669"
              />
              Bölüm Çıktısı (.xlsx + PDF)
            </button>
          )}
          {canManage && activeDepartment && !editMode && (
            <button
              onClick={() => setEditMode(true)}
              style={{
                padding: '7px 14px',
                borderRadius: 8,
                border: '1px solid #D1D5DB',
                background: 'white',
                color: DP.textMuted,
                fontSize: 12,
                fontWeight: 500,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 5,
              }}
            >
              <DPIcon
                path="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"
                size={13}
              />
              Düzenle
            </button>
          )}
        </div>
      </div>

      {/* Controls strip: Semester + Year + Stats */}
      <div
        style={{
          background: 'white',
          borderRadius: 10,
          border: '1px solid #E5E7EB',
          padding: responsive.val(10, 12, 14),
          marginBottom: 16,
          display: 'flex',
          flexWrap: 'wrap',
          gap: responsive.val(10, 16, 20),
          alignItems: 'center',
        }}
      >
        {/* Semester toggle */}
        <div style={{ display: 'flex', background: '#F3F4F6', borderRadius: 8, padding: 2 }}>
          {[
            { id: 'guz', label: 'Güz' },
            { id: 'bahar', label: 'Bahar' },
          ].map((s) => (
            <button
              key={s.id}
              onClick={() => setSemester(s.id)}
              style={{
                padding: '6px 16px',
                borderRadius: 6,
                fontSize: 12,
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.15s',
                background: semester === s.id ? DP.primary : 'transparent',
                color: semester === s.id ? 'white' : DP.textMuted,
                boxShadow: semester === s.id ? '0 1px 3px rgba(124,58,237,0.3)' : 'none',
              }}
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* Year pills — lisansüstünde sınıf ayrımı yok, hiçbir şey gösterilmez */}
        {seviye === 'lisans' && (
          <div style={{ display: 'flex', background: '#F3F4F6', borderRadius: 8, padding: 2 }}>
            {['1', '2', '3', '4'].map((y) => (
              <button
                key={y}
                onClick={() => setYear(y)}
                style={{
                  padding: '6px 14px',
                  borderRadius: 6,
                  fontSize: 12,
                  fontWeight: 600,
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                  background: year === y ? DP.navy : 'transparent',
                  color: year === y ? 'white' : DP.textMuted,
                  boxShadow: year === y ? '0 1px 3px rgba(27,42,74,0.3)' : 'none',
                }}
              >
                {y}. Sınıf
              </button>
            ))}
          </div>
        )}

        {/* Divider */}
        {seviye === 'lisans' && (
          <div
            style={{
              width: 1,
              height: 24,
              background: '#E5E7EB',
              display: responsive.val('none', 'block', 'block'),
            }}
          />
        )}

        {/* Inline stats */}
        <div style={{ display: 'flex', gap: 16, fontSize: 12, color: DP.textMuted }}>
          <span>
            <strong style={{ color: DP.primary, fontSize: 15 }}>{stats.slotCount}</strong> saat
          </span>
          <span>
            <strong style={{ color: '#3B82F6', fontSize: 15 }}>{stats.uniqueCourses}</strong> ders
          </span>
          <span>
            <strong style={{ color: '#059669', fontSize: 15 }}>{stats.uniqueProfs}</strong> hoca
          </span>
        </div>

        {courses.length > 0 && (
          <div style={{ fontSize: 11, color: '#9CA3AF', marginLeft: 'auto' }}>
            Havuz: {courses.length} ders, {professors.length} hoca, {classrooms.length} derslik
          </div>
        )}
      </div>

      {/* Professor bilgilendirme */}
      {isProfessor && editMode && (
        <div
          style={{
            background: '#DBEAFE',
            border: '1px solid #93C5FD',
            borderRadius: 10,
            padding: 12,
            marginBottom: 12,
            fontSize: 12,
            color: '#1E40AF',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <DPIcon
            path="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            size={16}
            color="#1E40AF"
          />
          Akademisyen olarak sadece kendi derslerinizi programa ekleyebilirsiniz.
        </div>
      )}

      {!activeDepartment && (
        <div
          style={{
            background: '#EDE9FE',
            border: '1px solid #C4B5FD',
            borderRadius: 10,
            padding: 16,
            marginBottom: 20,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <DPIcon
            path="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
            size={20}
            color={DP.primary}
          />
          <div style={{ fontSize: 13, color: '#5B21B6' }}>
            Lütfen bir bölüm seçin. Ders programı bölüm bazlı çalışmaktadır.
          </div>
        </div>
      )}

      {activeDepartment && courses.length === 0 && (
        <div
          style={{
            background: '#FEF3C7',
            border: '1px solid #F59E0B',
            borderRadius: 10,
            padding: 16,
            marginBottom: 20,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <DPIcon
            path="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z"
            size={20}
            color="#F59E0B"
          />
          <div style={{ fontSize: 13, color: '#92400E' }}>
            Bu bölüm için henüz ders tanımlanmamış. Önce <strong>Sınav Otomasyonu</strong>{' '}
            modülünden ders ve akademisyen ekleyin.
          </div>
        </div>
      )}

      {/* Schedule Grid + Sürüklenebilir Ders Havuzu */}
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        {editMode && !responsive.isMobile && (
          <div
            style={{
              width: 220,
              flexShrink: 0,
              background: 'white',
              borderRadius: 12,
              border: '1px solid #E5E7EB',
              padding: 12,
              maxHeight: 620,
              overflowY: 'auto',
              position: 'sticky',
              top: 8,
            }}
          >
            <div style={{ fontSize: 12, fontWeight: 700, color: DP.navy, marginBottom: 4 }}>
              Dersler
            </div>
            <div style={{ fontSize: 10, color: DP.textMuted, marginBottom: 10 }}>
              Tabloya sürükleyip bırakın
            </div>
            {yearCourses.length === 0 ? (
              <div
                style={{
                  fontSize: 11,
                  color: DP.textMuted,
                  padding: '12px 0',
                  textAlign: 'center',
                }}
              >
                Bu dönem için ders yok.
              </div>
            ) : (
              (() => {
                const groups = {};
                yearCourses.forEach((c) => {
                  const k = c.sinif || 0;
                  (groups[k] = groups[k] || []).push(c);
                });
                return Object.keys(groups)
                  .sort((a, b) => a - b)
                  .map((sinif) => {
                    const gc = GRADE_COLORS[sinif] || GRADE_COLORS[1];
                    return (
                      <div key={sinif} style={{ marginBottom: 12 }}>
                        <div
                          style={{
                            fontSize: 10,
                            fontWeight: 700,
                            color: gc.text,
                            background: gc.bg,
                            padding: '3px 8px',
                            borderRadius: 5,
                            marginBottom: 6,
                            display: 'inline-block',
                          }}
                        >
                          {sinif === '5' || sinif === 5 ? 'Seçmeli' : `${sinif}. Sınıf`}
                        </div>
                        {groups[sinif].map((c) => (
                          <CourseChip
                            key={c.id}
                            course={c}
                            color={courseColors[c.code] || gc.text}
                          />
                        ))}
                      </div>
                    );
                  });
              })()
            )}
          </div>
        )}
        <div
          style={{
            flex: 1,
            minWidth: 0,
            background: 'white',
            borderRadius: 12,
            border: '1px solid #E5E7EB',
            overflow: 'auto',
          }}
        >
          {responsive.isMobile ? (
            // Mobile: Card-based view
            <div style={{ padding: 12 }}>
              {DAYS.map((day) => {
                const daySlots = visibleHours
                  .map((hour, hi) => {
                    const key = `${day}_${hi}`;
                    return scheduleData[key]
                      ? { ...scheduleData[key], hour, hourIndex: hi, key }
                      : null;
                  })
                  .filter(Boolean);

                if (daySlots.length === 0 && !editMode) return null;
                const isToday = day === todayName;

                return (
                  <div key={day} style={{ marginBottom: 16 }}>
                    <div
                      style={{
                        fontSize: 14,
                        fontWeight: 700,
                        color: isToday ? DP.primary : DP.navy,
                        padding: '8px 0',
                        borderBottom: `2px solid ${isToday ? DP.primary : '#E5E7EB'}`,
                        marginBottom: 8,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                      }}
                    >
                      {day}
                      {isToday && (
                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 500,
                            background: DP.primaryPale,
                            color: DP.primary,
                            padding: '2px 8px',
                            borderRadius: 10,
                          }}
                        >
                          Bugün
                        </span>
                      )}
                    </div>
                    {daySlots.map((slot, i) => (
                      <div
                        key={i}
                        style={{
                          padding: '10px 12px',
                          marginBottom: 6,
                          borderRadius: 10,
                          background: `${courseColors[slot.courseCode] || '#6B7280'}10`,
                          borderLeft: `4px solid ${courseColors[slot.courseCode] || '#6B7280'}`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                        }}
                      >
                        <div style={{ flex: 1 }}>
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 8,
                              marginBottom: 2,
                            }}
                          >
                            <span
                              style={{
                                fontSize: 10,
                                fontWeight: 600,
                                color: 'white',
                                background: courseColors[slot.courseCode] || '#6B7280',
                                padding: '1px 6px',
                                borderRadius: 4,
                              }}
                            >
                              {slot.hour}
                            </span>
                            {slot.classroom && (
                              <span
                                style={{
                                  fontSize: 10,
                                  fontWeight: 600,
                                  color: DP.primary,
                                  background: DP.primaryPale,
                                  padding: '1px 6px',
                                  borderRadius: 4,
                                }}
                              >
                                {slot.classroom}
                              </span>
                            )}
                          </div>
                          {/* Hücredeki TÜM dersler: her biri kendi hocası ve
                              dersliğiyle. Eskiden yalnız birinci ve ikinci ders
                              elle yazılmıştı, üçüncüsü listede görünmezdi. */}
                          {window.slotDersleri(slot).map((ders, di) => (
                            <div
                              key={di}
                              style={
                                di === 0
                                  ? {}
                                  : {
                                      marginTop: 4,
                                      paddingTop: 4,
                                      borderTop: '1px dashed #E5E7EB',
                                    }
                              }
                            >
                              <div style={{ fontSize: 13, fontWeight: 600, color: DP.text }}>
                                {ders.courseCode}
                                {ders.courseName ? ' — ' + ders.courseName : ''}
                              </div>
                              {ders.instructor && (
                                <div style={{ fontSize: 11, color: DP.textMuted, marginTop: 1 }}>
                                  {ders.instructor}
                                </div>
                              )}
                              {di > 0 && ders.classroom && (
                                <span
                                  style={{
                                    display: 'inline-block',
                                    marginTop: 3,
                                    fontSize: 10,
                                    fontWeight: 600,
                                    color: DP.primary,
                                    background: DP.primaryPale,
                                    padding: '1px 6px',
                                    borderRadius: 4,
                                  }}
                                >
                                  {ders.classroom}
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                        {editMode && (
                          <button
                            onClick={() => handleRemoveDers(slot.key, 0)}
                            style={{
                              background: '#FEF2F2',
                              border: '1px solid #FECACA',
                              borderRadius: 6,
                              cursor: 'pointer',
                              padding: '4px 6px',
                              marginLeft: 8,
                            }}
                          >
                            <DPIcon path="M18 6L6 18M6 6l12 12" size={14} color="#EF4444" />
                          </button>
                        )}
                      </div>
                    ))}
                    {editMode && (
                      <button
                        onClick={() => {
                          setSelectedSlot({ day, hourIndex: 0, hour: visibleHours[0] });
                          setAddSlotWarnings([]);
                          setShowAddModal(true);
                        }}
                        style={{
                          width: '100%',
                          padding: 10,
                          border: '2px dashed #C4B5FD',
                          borderRadius: 10,
                          background: DP.primaryPale + '60',
                          cursor: 'pointer',
                          fontSize: 12,
                          color: DP.primary,
                          fontWeight: 500,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 6,
                          marginTop: 4,
                        }}
                      >
                        <DPIcon path="M12 5v14M5 12h14" size={14} color={DP.primary} /> Ders Ekle
                      </button>
                    )}
                  </div>
                );
              })}
              {Object.keys(scheduleData).length === 0 && !editMode && (
                <div style={{ textAlign: 'center', padding: 48, color: DP.textMuted }}>
                  <DPIcon
                    path="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                    size={48}
                    color="#D1D5DB"
                  />
                  <p style={{ marginTop: 12, fontSize: 14, fontWeight: 500 }}>
                    Bu dönem için ders programı henüz oluşturulmamış.
                  </p>
                  {canManage && (
                    <p style={{ fontSize: 12, color: '#9CA3AF', marginTop: 4 }}>
                      Düzenle butonuna tıklayarak program oluşturmaya başlayın.
                    </p>
                  )}
                </div>
              )}
            </div>
          ) : (
            // Desktop: Table grid
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 700 }}>
              <thead>
                <tr>
                  <th
                    style={{
                      padding: '10px 8px',
                      fontSize: 11,
                      fontWeight: 700,
                      color: 'white',
                      textAlign: 'center',
                      background: DP.navy,
                      borderBottom: '2px solid #E5E7EB',
                      width: 85,
                    }}
                  >
                    Saat
                  </th>
                  {DAYS.map((day) => {
                    const isToday = day === todayName;
                    return (
                      <th
                        key={day}
                        style={{
                          padding: '10px 8px',
                          fontSize: 12,
                          fontWeight: 700,
                          color: 'white',
                          textAlign: 'center',
                          background: isToday ? DP.primary : DP.navy,
                          borderBottom: '2px solid #E5E7EB',
                          position: 'relative',
                        }}
                      >
                        {day}
                        {isToday && (
                          <div
                            style={{
                              position: 'absolute',
                              bottom: 0,
                              left: '20%',
                              right: '20%',
                              height: 3,
                              background: '#F59E0B',
                              borderRadius: '3px 3px 0 0',
                            }}
                          />
                        )}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {visibleHours.map((hour, hi) => (
                  <tr key={hi}>
                    <td
                      style={{
                        padding: '6px 6px',
                        fontSize: 10,
                        fontWeight: 600,
                        color: DP.textMuted,
                        textAlign: 'center',
                        borderBottom: '1px solid #F3F4F6',
                        background: '#FAFAFA',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {hour}
                    </td>
                    {DAYS.map((day) => {
                      const key = `${day}_${hi}`;
                      const slot = scheduleData[key];
                      const isToday = day === todayName;
                      // Boş hücreye ya da BİRİNCİSİ dolu-İKİNCİSİ boş hücreye
                      // (bölme için) ders bırakılabilir.
                      // Hücre kapasitesi sınırsız: dolu hücreye de ders
                      // bırakılabilir (eskiden ikinci dersten sonra kapanıyordu).
                      const canDrop = editMode;
                      return (
                        <td
                          key={day}
                          onDragOver={
                            canDrop
                              ? (e) => {
                                  e.preventDefault();
                                  e.dataTransfer.dropEffect = 'copy';
                                }
                              : undefined
                          }
                          onDragEnter={
                            canDrop
                              ? (e) => {
                                  e.currentTarget.style.outline = '2px dashed #7C3AED';
                                }
                              : undefined
                          }
                          onDragLeave={
                            canDrop
                              ? (e) => {
                                  e.currentTarget.style.outline = 'none';
                                }
                              : undefined
                          }
                          onDrop={
                            canDrop
                              ? (e) => {
                                  e.preventDefault();
                                  e.currentTarget.style.outline = 'none';
                                  try {
                                    const c = JSON.parse(
                                      e.dataTransfer.getData('application/json')
                                    );
                                    handleDropCourse(c, day, hi);
                                  } catch (err) {
                                    console.error('Bırakma hatası:', err);
                                  }
                                }
                              : undefined
                          }
                          style={{
                            padding: 3,
                            borderBottom: '1px solid #F3F4F6',
                            background:
                              editMode && !slot
                                ? isToday
                                  ? '#EDE9FE'
                                  : '#F5F3FF'
                                : isToday
                                  ? '#FAFAFE'
                                  : hi % 2 === 0
                                    ? 'transparent'
                                    : '#FCFCFD',
                            transition: 'background 0.15s',
                            borderLeft: isToday ? '1px solid #EDE9FE' : 'none',
                            borderRight: isToday ? '1px solid #EDE9FE' : 'none',
                          }}
                        >
                          {slot ? (
                            /* ── HÜCREDEKİ DERSLER ──
                               Hücrede kaç ders varsa hepsi listelenir; her
                               dersin KENDİ dersliği, hocası ve kaldırma
                               düğmesi vardır. Sayı sınırı yok: eskiden yalnız
                               "birinci" ve "ikinci" ders elle yazılmıştı. */
                            <div
                              style={{
                                padding: '5px 7px',
                                borderRadius: 6,
                                background: `${courseColors[slot.courseCode] || '#6B7280'}12`,
                                borderLeft: `3px solid ${courseColors[slot.courseCode] || '#6B7280'}`,
                                minHeight: 44,
                                position: 'relative',
                              }}
                            >
                              {window.slotDersleri(slot).map((ders, di) => (
                                <div
                                  key={di}
                                  style={
                                    di === 0
                                      ? { position: 'relative' }
                                      : {
                                          marginTop: 5,
                                          paddingTop: 5,
                                          borderTop: '1px dashed #D1D5DB',
                                          position: 'relative',
                                        }
                                  }
                                >
                                  <div
                                    style={{
                                      fontSize: 11,
                                      fontWeight: 700,
                                      color: courseColors[ders.courseCode] || DP.text,
                                      letterSpacing: 0.3,
                                    }}
                                  >
                                    {ders.courseCode}
                                  </div>
                                  {ders.courseName && (
                                    <div
                                      style={{
                                        fontSize: 10,
                                        color: DP.text,
                                        lineHeight: 1.3,
                                        marginTop: 1,
                                      }}
                                    >
                                      {ders.courseName}
                                    </div>
                                  )}
                                  {ders.instructor && (
                                    <div style={{ fontSize: 9, color: DP.textMuted, marginTop: 2 }}>
                                      {ders.instructor}
                                    </div>
                                  )}
                                  {editMode ? (
                                    <select
                                      value={ders.classroom || ''}
                                      onChange={(e) => handleSlotClassroom(key, e.target.value, di)}
                                      onClick={(e) => e.stopPropagation()}
                                      style={{
                                        marginTop: 3,
                                        width: '100%',
                                        fontSize: 9,
                                        padding: '2px 4px',
                                        borderRadius: 4,
                                        border: '1px solid #E5E7EB',
                                        outline: 'none',
                                        background: 'white',
                                        color: DP.primary,
                                        fontWeight: 600,
                                      }}
                                    >
                                      <option value="">Derslik seç...</option>
                                      {classrooms.map((r) => (
                                        <option key={r.id} value={r.name}>
                                          {r.name}
                                        </option>
                                      ))}
                                    </select>
                                  ) : (
                                    ders.classroom && (
                                      <div
                                        style={{
                                          fontSize: 9,
                                          color: DP.primary,
                                          fontWeight: 600,
                                          marginTop: 1,
                                        }}
                                      >
                                        {ders.classroom}
                                      </div>
                                    )
                                  )}
                                  {editMode && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleRemoveDers(key, di);
                                      }}
                                      title={ders.courseCode + ' dersini bu saatten kaldır'}
                                      style={{
                                        position: 'absolute',
                                        top: di === 0 ? 2 : 4,
                                        right: 2,
                                        background: '#FEF2F2',
                                        border: '1px solid #FECACA',
                                        borderRadius: 4,
                                        cursor: 'pointer',
                                        padding: '1px 3px',
                                        opacity: 0.8,
                                      }}
                                    >
                                      <DPIcon
                                        path="M18 6L6 18M6 6l12 12"
                                        size={10}
                                        color="#EF4444"
                                      />
                                    </button>
                                  )}
                                </div>
                              ))}
                            </div>
                          ) : editMode ? (
                            <div
                              style={{
                                minHeight: 44,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                borderRadius: 6,
                                border: '2px dashed #C4B5FD',
                                background: 'rgba(255,255,255,0.5)',
                                transition: 'border-color 0.15s, background 0.15s',
                                pointerEvents: 'none',
                              }}
                            >
                              <DPIcon path="M12 5v14M5 12h14" size={14} color="#C4B5FD" />
                            </div>
                          ) : null}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Color legend */}
      {courseColorList.length > 0 && (
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 8,
            marginTop: 10,
            padding: '8px 12px',
            background: '#F9FAFB',
            borderRadius: 8,
            border: '1px solid #F3F4F6',
          }}
        >
          <span
            style={{
              fontSize: 10,
              color: '#9CA3AF',
              fontWeight: 600,
              marginRight: 4,
              lineHeight: '20px',
            }}
          >
            DERSLER:
          </span>
          {courseColorList.map((c) => (
            <span
              key={c.code}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                fontSize: 10,
                color: DP.text,
              }}
            >
              <span
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 3,
                  background: c.color,
                  display: 'inline-block',
                }}
              />
              {c.code}
            </span>
          ))}
        </div>
      )}

      {/* Add Slot Modal */}
      {showAddModal && selectedSlot && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(15,23,42,0.5)',
            backdropFilter: 'blur(4px)',
            zIndex: 2000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
          }}
          onClick={() => setShowAddModal(false)}
        >
          <div
            style={{
              background: 'white',
              borderRadius: 20,
              width: '100%',
              maxWidth: 520,
              boxShadow: '0 25px 60px rgba(0,0,0,0.25), 0 0 0 1px rgba(0,0,0,0.05)',
              overflow: 'hidden',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: '20px 24px 16px',
                background: `linear-gradient(135deg, ${DP.primary}, #6D28D9)`,
                position: 'relative',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 12,
                    background: 'rgba(255,255,255,0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <DPIcon
                    path="M12 6v6l4 2M12 2a10 10 0 100 20 10 10 0 000-20z"
                    size={20}
                    color="white"
                  />
                </div>
                <div>
                  <h3
                    style={{
                      fontSize: 17,
                      fontWeight: 700,
                      color: 'white',
                      margin: 0,
                      lineHeight: 1.2,
                    }}
                  >
                    Ders Programına Ekle
                  </h3>
                  <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.75)', margin: '3px 0 0' }}>
                    {selectedSlot.day} &middot; {selectedSlot.hour}
                    {/* Hücrede zaten ders varsa kaç tane olduğu görünsün:
                        ekleme yapan kişi "boş sanıp" üstüne ders koymasın.
                        Kapasite sınırı YOK, bilgi amaçlı. */}
                    {(() => {
                      const mevcut = window.slotDersleri(
                        scheduleData[`${selectedSlot.day}_${selectedSlot.hourIndex}`]
                      );
                      return mevcut.length > 0
                        ? ' · bu saatte ' +
                            mevcut.length +
                            ' ders var (' +
                            mevcut.map((d) => d.courseCode).join(', ') +
                            ')'
                        : '';
                    })()}
                  </p>
                </div>
              </div>
              {/* Close button */}
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setAddSlotWarnings([]);
                }}
                style={{
                  position: 'absolute',
                  top: 14,
                  right: 14,
                  width: 30,
                  height: 30,
                  borderRadius: 8,
                  border: 'none',
                  background: 'rgba(255,255,255,0.15)',
                  color: 'white',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 18,
                  lineHeight: 1,
                  transition: 'all 0.15s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.3)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.15)')}
              >
                &times;
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: responsive.val(16, 20, 24) }}>
              {/* Saat seçimi (mobilde) */}
              {responsive.isMobile && (
                <div style={{ marginBottom: 16 }}>
                  <label
                    style={{
                      display: 'block',
                      fontSize: 12,
                      fontWeight: 600,
                      color: DP.text,
                      marginBottom: 6,
                    }}
                  >
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                      <DPIcon
                        path="M12 6v6l4 2M12 2a10 10 0 100 20 10 10 0 000-20z"
                        size={14}
                        color={DP.primary}
                      />
                      Saat
                    </span>
                  </label>
                  <select
                    value={selectedSlot.hourIndex}
                    onChange={(e) =>
                      setSelectedSlot({
                        ...selectedSlot,
                        hourIndex: parseInt(e.target.value),
                        hour: visibleHours[parseInt(e.target.value)],
                      })
                    }
                    style={{
                      width: '100%',
                      padding: '11px 14px',
                      borderRadius: 10,
                      border: `1.5px solid ${DP.border}`,
                      fontSize: 13,
                      outline: 'none',
                      background: 'white',
                      transition: 'border-color 0.2s',
                    }}
                    onFocus={(e) => (e.target.style.borderColor = DP.primary)}
                    onBlur={(e) => (e.target.style.borderColor = DP.border)}
                  >
                    {visibleHours.map((h, i) => (
                      <option key={i} value={i}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Ders seçimi */}
              <div style={{ marginBottom: 16 }}>
                <label
                  style={{
                    display: 'block',
                    fontSize: 12,
                    fontWeight: 600,
                    color: DP.text,
                    marginBottom: 6,
                  }}
                >
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                    <DPIcon
                      path="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                      size={14}
                      color={DP.primary}
                    />
                    Ders Seçimi
                  </span>
                  <span style={{ fontWeight: 400, color: '#9CA3AF', fontSize: 11, marginLeft: 6 }}>
                    ({yearCourses.length} ders)
                  </span>
                </label>
                {yearCourses.length > 0 ? (
                  <select
                    value={modalCourseId}
                    onChange={(e) => setModalCourseId(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '11px 14px',
                      borderRadius: 10,
                      border: `1.5px solid ${modalCourseId ? DP.primary : DP.border}`,
                      fontSize: 13,
                      outline: 'none',
                      background: 'white',
                      transition: 'border-color 0.2s',
                      boxShadow: modalCourseId ? `0 0 0 3px ${DP.primary}15` : 'none',
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = DP.primary;
                      e.target.style.boxShadow = `0 0 0 3px ${DP.primary}15`;
                    }}
                    onBlur={(e) => {
                      if (!modalCourseId) {
                        e.target.style.borderColor = DP.border;
                        e.target.style.boxShadow = 'none';
                      }
                    }}
                  >
                    <option value="">Ders seçin...</option>
                    {(() => {
                      let lastSinif = null;
                      const options = [];
                      yearCourses.forEach((c) => {
                        if (c.sinif !== lastSinif) {
                          lastSinif = c.sinif;
                          options.push(
                            <optgroup
                              key={`g-${c.sinif}`}
                              label={c.sinif === 5 ? 'Seçmeli Dersler' : `${c.sinif}. Sınıf`}
                            />
                          );
                        }
                        options.push(
                          <option key={c.id} value={c.id}>
                            {c.code} - {c.name} {c.professor ? `(${c.professor})` : ''}
                          </option>
                        );
                      });
                      return options;
                    })()}
                  </select>
                ) : (
                  <div
                    style={{
                      padding: '12px 14px',
                      borderRadius: 10,
                      border: '1px solid #FCD34D',
                      background: '#FFFBEB',
                      fontSize: 12,
                      color: '#92400E',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                    }}
                  >
                    <DPIcon
                      path="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z"
                      size={16}
                      color="#D97706"
                    />
                    Bu dönem için ders bulunamadı. Ders Yönetimi'nden ders ekleyin.
                  </div>
                )}
              </div>

              {/* Derslik seçimi */}
              <div style={{ marginBottom: 16 }}>
                <label
                  style={{
                    display: 'block',
                    fontSize: 12,
                    fontWeight: 600,
                    color: DP.text,
                    marginBottom: 6,
                  }}
                >
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                    <DPIcon
                      path="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                      size={14}
                      color={DP.primary}
                    />
                    Derslik
                  </span>
                  <span style={{ fontWeight: 400, color: '#9CA3AF', fontSize: 11, marginLeft: 6 }}>
                    (opsiyonel)
                  </span>
                </label>
                {classrooms.length > 0 ? (
                  <select
                    value={modalClassroom}
                    onChange={(e) => setModalClassroom(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '11px 14px',
                      borderRadius: 10,
                      border: `1.5px solid ${DP.border}`,
                      fontSize: 13,
                      outline: 'none',
                      background: 'white',
                      transition: 'border-color 0.2s',
                    }}
                    onFocus={(e) => (e.target.style.borderColor = DP.primary)}
                    onBlur={(e) => (e.target.style.borderColor = DP.border)}
                  >
                    <option value="">Derslik seçin...</option>
                    {classrooms.map((r) => (
                      <option key={r.id} value={r.name}>
                        {r.name} ({r.capacity} kişi)
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    value={modalClassroom}
                    onChange={(e) => setModalClassroom(e.target.value)}
                    placeholder="Derslik adı (ör: D-201)"
                    style={{
                      width: '100%',
                      padding: '11px 14px',
                      borderRadius: 10,
                      border: `1.5px solid ${DP.border}`,
                      fontSize: 13,
                      outline: 'none',
                      transition: 'border-color 0.2s',
                    }}
                    onFocus={(e) => (e.target.style.borderColor = DP.primary)}
                    onBlur={(e) => (e.target.style.borderColor = DP.border)}
                  />
                )}
              </div>

              {/* Seçili ders önizleme */}
              {modalCourseId &&
                (() => {
                  const c = courses.find((x) => x.id === modalCourseId);
                  if (!c) return null;
                  return (
                    <div
                      style={{
                        padding: 14,
                        borderRadius: 12,
                        background: `linear-gradient(135deg, ${DP.primaryPale}, #F5F3FF)`,
                        border: `1px solid ${DP.primaryLight}30`,
                        marginBottom: 16,
                      }}
                    >
                      <div
                        style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}
                      >
                        <div
                          style={{
                            padding: '3px 8px',
                            borderRadius: 6,
                            background: DP.primary,
                            color: 'white',
                            fontSize: 11,
                            fontWeight: 700,
                            letterSpacing: '0.02em',
                          }}
                        >
                          {c.code}
                        </div>
                        <span style={{ fontSize: 13, fontWeight: 600, color: DP.text }}>
                          {c.name}
                        </span>
                      </div>
                      <div
                        style={{
                          display: 'flex',
                          flexWrap: 'wrap',
                          gap: 12,
                          fontSize: 12,
                          color: DP.textMuted,
                        }}
                      >
                        {c.professor && (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                            <DPIcon
                              path="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                              size={12}
                              color={DP.textMuted}
                            />
                            {c.professor}
                          </span>
                        )}
                        {c.sinif && (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                            <DPIcon
                              path="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16"
                              size={12}
                              color={DP.textMuted}
                            />
                            {c.sinif === 5 ? 'Seçmeli' : c.sinif + '. Sınıf'}
                          </span>
                        )}
                        {c.studentCount > 0 && (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                            <DPIcon
                              path="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
                              size={12}
                              color={DP.textMuted}
                            />
                            {c.studentCount} kişi
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })()}

              {/* Çakışma uyarıları */}
              {addSlotWarnings.length > 0 && (
                <div
                  style={{
                    padding: 14,
                    borderRadius: 12,
                    background: '#FEF2F2',
                    border: '1px solid #FECACA',
                    marginBottom: 16,
                  }}
                >
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: '#991B1B',
                      marginBottom: 8,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                    }}
                  >
                    <DPIcon
                      path="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z"
                      size={16}
                      color="#DC2626"
                    />
                    Çakışma Tespit Edildi
                  </div>
                  {addSlotWarnings.map((w, i) => (
                    <div
                      key={i}
                      style={{ fontSize: 12, color: '#7F1D1D', marginBottom: 3, paddingLeft: 22 }}
                    >
                      • {w}
                    </div>
                  ))}
                  <div
                    style={{
                      fontSize: 11,
                      color: '#991B1B',
                      marginTop: 8,
                      fontStyle: 'italic',
                      paddingLeft: 22,
                    }}
                  >
                    {isAdmin
                      ? 'Fakülte yöneticisi olarak çakışmayı geçersiz kılabilirsiniz.'
                      : 'Lütfen farklı bir saat veya derslik seçin.'}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div
              style={{
                padding: '14px 24px 18px',
                borderTop: `1px solid ${DP.border}`,
                display: 'flex',
                justifyContent: 'flex-end',
                gap: 10,
                background: '#FAFAFA',
              }}
            >
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setAddSlotWarnings([]);
                }}
                style={{
                  padding: '10px 22px',
                  borderRadius: 10,
                  border: `1.5px solid ${DP.border}`,
                  background: 'white',
                  color: DP.textMuted,
                  fontSize: 13,
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#F3F4F6';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'white';
                }}
              >
                İptal
              </button>
              {addSlotWarnings.length > 0 ? (
                isAdmin ? (
                  <button
                    onClick={() => handleAddSlot(true)}
                    style={{
                      padding: '10px 22px',
                      borderRadius: 10,
                      border: 'none',
                      background: '#DC2626',
                      color: 'white',
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                      boxShadow: '0 2px 8px rgba(220,38,38,0.3)',
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.boxShadow = '0 4px 12px rgba(220,38,38,0.4)')
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.boxShadow = '0 2px 8px rgba(220,38,38,0.3)')
                    }
                  >
                    Çakışmayı Geçersiz Kıl
                  </button>
                ) : null
              ) : (
                <button
                  onClick={() => handleAddSlot(false)}
                  disabled={!modalCourseId}
                  style={{
                    padding: '10px 22px',
                    borderRadius: 10,
                    border: 'none',
                    background: modalCourseId
                      ? `linear-gradient(135deg, ${DP.primary}, #6D28D9)`
                      : '#D1D5DB',
                    color: 'white',
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: modalCourseId ? 'pointer' : 'default',
                    transition: 'all 0.15s',
                    boxShadow: modalCourseId ? `0 2px 8px ${DP.primary}40` : 'none',
                  }}
                  onMouseEnter={(e) => {
                    if (modalCourseId)
                      e.currentTarget.style.boxShadow = `0 4px 14px ${DP.primary}50`;
                  }}
                  onMouseLeave={(e) => {
                    if (modalCourseId)
                      e.currentTarget.style.boxShadow = `0 2px 8px ${DP.primary}40`;
                  }}
                >
                  Programa Ekle
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Çakışma Paneli */}
      {showConflicts && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.4)',
            zIndex: 2000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
          }}
          onClick={() => setShowConflicts(false)}
        >
          <div
            style={{
              background: 'white',
              borderRadius: 16,
              padding: 24,
              width: '100%',
              maxWidth: 560,
              maxHeight: '80vh',
              overflow: 'auto',
              boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 16,
              }}
            >
              <h3 style={{ fontSize: 18, fontWeight: 700, color: DP.navy, margin: 0 }}>
                Çakışma Kontrolü
              </h3>
              <button
                onClick={() => setShowConflicts(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 4,
                }}
              >
                <DPIcon path="M18 6L6 18M6 6l12 12" size={18} color="#9CA3AF" />
              </button>
            </div>

            {conflicts.length === 0 ? (
              <div
                style={{
                  textAlign: 'center',
                  padding: 32,
                  color: DP.green,
                }}
              >
                <DPIcon
                  path="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  size={48}
                  color={DP.green}
                />
                <p style={{ marginTop: 12, fontSize: 14, fontWeight: 600 }}>Çakışma bulunamadı!</p>
                <p style={{ fontSize: 12, color: DP.textMuted, marginTop: 4 }}>
                  Tüm derslikler ve saatler uyumlu görünüyor.
                </p>
              </div>
            ) : (
              <div>
                <div
                  style={{
                    background: '#FEF2F2',
                    border: '1px solid #FECACA',
                    borderRadius: 8,
                    padding: 12,
                    marginBottom: 16,
                    fontSize: 13,
                    color: '#991B1B',
                  }}
                >
                  <strong>{conflicts.length}</strong> adet çakışma tespit edildi.
                </div>
                {conflicts.map((c, i) => (
                  <div
                    key={i}
                    style={{
                      padding: 12,
                      marginBottom: 8,
                      borderRadius: 8,
                      border: '1px solid ' + (c.type === 'cross_dept' ? '#FDE68A' : '#FECACA'),
                      background: c.type === 'cross_dept' ? '#FFFBEB' : '#FFF5F5',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                      <DPIcon
                        path="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z"
                        size={14}
                        color={c.type === 'cross_dept' ? '#D97706' : '#DC2626'}
                      />
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 600,
                          textTransform: 'uppercase',
                          color: c.type === 'cross_dept' ? '#D97706' : '#DC2626',
                        }}
                      >
                        {c.type === 'cross_dept'
                          ? 'Fakülte Çakışması'
                          : c.type === 'dept_professor'
                            ? 'Hoca Çakışması'
                            : 'Derslik Çakışması'}
                      </span>
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: DP.text }}>{c.message}</div>
                    <div style={{ fontSize: 11, color: DP.textMuted, marginTop: 4 }}>
                      {c.courses.map((course, ci) => (
                        <div key={ci}>• {course}</div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Fakülte Birleşik Görünüm Modal */}
      {showFacultyView && allSchedules.length > 0 && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.5)',
            zIndex: 2000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
          }}
          onClick={() => setShowFacultyView(false)}
        >
          <div
            style={{
              background: 'white',
              borderRadius: 16,
              padding: 24,
              width: '100%',
              maxWidth: 1100,
              maxHeight: '90vh',
              overflow: 'auto',
              boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 16,
              }}
            >
              <div>
                <h3 style={{ fontSize: 18, fontWeight: 700, color: DP.navy, margin: 0 }}>
                  Fakülte Birleşik Ders Programı
                </h3>
                <p style={{ fontSize: 12, color: DP.textMuted, marginTop: 4 }}>
                  {semester === 'guz' ? 'Güz' : 'Bahar'} Dönemi — Tüm Sınıflar —{' '}
                  {[...new Set(allSchedules.map((s) => s.deptName))].length} bölüm
                </p>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                {/* Tek düğme, iki belge: Excel dosyası iner ve yazdırma
                    sayfası açılır (bkz. dosya başındaki ÇIKTILAR bölümü). */}
                <button
                  onClick={() => exportFacultySchedule(allSchedules, semester, fakulteBaglami)}
                  title="Fakülte birleşik programını .xlsx olarak indirir ve yazdırma sayfasını açar"
                  style={{
                    padding: '8px 16px',
                    borderRadius: 8,
                    border: 'none',
                    background: DP.primary,
                    color: 'white',
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <DPIcon
                    path="M12 10v6m0 0l-3-3m3 3l3-3M4 6a2 2 0 012-2h12a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V6z"
                    size={14}
                    color="white"
                  />
                  Fakülte Çıktısı (.xlsx + PDF)
                </button>
                <button
                  onClick={() => setShowFacultyView(false)}
                  style={{
                    background: 'none',
                    border: '1px solid #D1D5DB',
                    borderRadius: 8,
                    padding: '8px 12px',
                    cursor: 'pointer',
                  }}
                >
                  <DPIcon path="M18 6L6 18M6 6l12 12" size={14} color="#9CA3AF" />
                </button>
              </div>
            </div>

            {/* Legend */}
            <div style={{ display: 'flex', gap: 12, marginBottom: 12, flexWrap: 'wrap' }}>
              {[...new Set(allSchedules.map((s) => s.deptName))].map((name, i) => (
                <span
                  key={i}
                  style={{
                    fontSize: 11,
                    padding: '2px 8px',
                    borderRadius: 4,
                    background: '#F3F4F6',
                    color: DP.text,
                    fontWeight: 500,
                  }}
                >
                  {name}
                </span>
              ))}
            </div>

            {/* Combined Grid */}
            <div style={{ overflow: 'auto' }}>
              <table
                style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11, minWidth: 800 }}
              >
                <thead>
                  <tr>
                    <th
                      style={{
                        padding: '10px 6px',
                        background: DP.navy,
                        color: 'white',
                        fontWeight: 700,
                        textAlign: 'center',
                        border: '1px solid #334155',
                        width: 80,
                      }}
                    >
                      Saat
                    </th>
                    {DAYS.map((day) => (
                      <th
                        key={day}
                        style={{
                          padding: '10px 6px',
                          background: DP.navy,
                          color: 'white',
                          fontWeight: 700,
                          textAlign: 'center',
                          border: '1px solid #334155',
                        }}
                      >
                        {day}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {/* Fakülte tablosu ORTAK eksende çizilir — bölümlerin
                      başlangıç saatleri farklı olabilir. */}
                  {fakulteSaatleri.map((hour, hi) => {
                    // Check if this hour has any slots
                    let hasAny = false;
                    DAYS.forEach((day) => {
                      allSchedules.forEach((s) => {
                        if (s.slots[`${day}_${hi}`]) hasAny = true;
                      });
                    });
                    if (!hasAny) return null;

                    return (
                      <tr key={hi}>
                        <td
                          style={{
                            padding: '6px',
                            fontWeight: 600,
                            textAlign: 'center',
                            background: '#F9FAFB',
                            border: '1px solid #E5E7EB',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {hour}
                        </td>
                        {DAYS.map((day) => {
                          const entries = allSchedules
                            .filter((s) => s.slots[`${day}_${hi}`])
                            .map((s) =>
                              mergeSplitSlot(s.slots[`${day}_${hi}`], {
                                deptName: s.deptName,
                                year: s.year,
                              })
                            );
                          return (
                            <td
                              key={day}
                              style={{
                                padding: 2,
                                border: '1px solid #E5E7EB',
                                verticalAlign: 'top',
                              }}
                            >
                              {entries.map((e, ei) => {
                                const bg = GRADE_COLORS[e.sinif]?.bg || '#F3F4F6';
                                return (
                                  <div
                                    key={ei}
                                    style={{
                                      padding: '3px 6px',
                                      margin: '2px 0',
                                      borderRadius: 4,
                                      background: bg,
                                      fontSize: 10,
                                      lineHeight: 1.3,
                                    }}
                                  >
                                    <strong>{e.courseCode}</strong>
                                    <span style={{ color: '#555', marginLeft: 3 }}>
                                      {e.deptName} {e.year}.Sınıf
                                    </span>
                                    {e.instructor && (
                                      <div style={{ color: '#777', fontSize: 9 }}>
                                        {e.instructor}
                                      </div>
                                    )}
                                    {e.classroom && (
                                      <div style={{ color: DP.primary, fontWeight: 500 }}>
                                        {e.classroom}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Conflict summary in faculty view */}
            {conflicts.length > 0 && (
              <div
                style={{
                  marginTop: 16,
                  padding: 12,
                  background: '#FEF2F2',
                  border: '1px solid #FECACA',
                  borderRadius: 8,
                }}
              >
                <div style={{ fontSize: 13, fontWeight: 600, color: '#991B1B', marginBottom: 8 }}>
                  ⚠ {conflicts.length} çakışma tespit edildi:
                </div>
                {conflicts.slice(0, 5).map((c, i) => (
                  <div key={i} style={{ fontSize: 11, color: '#7F1D1D', marginBottom: 4 }}>
                    • {c.message}
                  </div>
                ))}
                {conflicts.length > 5 && (
                  <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 4 }}>
                    ... ve {conflicts.length - 5} daha fazla
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Akademisyenin kendi programı — Bölüm Yönetimi'ndeki görüntüleyicinin
          aynısı (ortak bileşen, tek belge biçimi). */}
      <SaatAyariModal
        acik={showSaatAyari}
        kapat={() => setShowSaatAyari(false)}
        bolumId={activeDepartment}
        bolumAdi={departmentInfo?.name || 'Bölüm'}
        kayit={bolumAyarKaydi}
        kaydedildi={() => setAyarSurumu((n) => n + 1)}
      />
      {showMyProgram && AkademisyenProgramModal && (
        <AkademisyenProgramModal
          open={showMyProgram}
          onClose={() => setShowMyProgram(false)}
          ad={currentUser?.name || ''}
          unvan={currentUser?.title || currentUser?.unvan || ''}
          birim={departmentInfo?.name || ''}
        />
      )}
    </div>
  );
}

window.DersProgramiApp = DersProgramiApp;
