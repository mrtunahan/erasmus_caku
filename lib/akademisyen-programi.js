// ══════════════════════════════════════════════════════════════
// AKADEMİSYEN HAFTALIK DERS PROGRAMI
//
// Ders programı bölüm + sınıf başına ayrı bir dokümanda tutulur
// (course_schedules/<bolum>_<donem>_<sinif>[_<seviye>]). Bir akademisyen
// birden çok bölümde, birden çok sınıfta ve iki seviyede birden ders
// verebildiği için "bu hocanın haftalık programı" hiçbir dokümanda hazır
// DURMAZ: tüm dokümanlar taranıp o adın düştüğü slotlar tek ızgarada
// birleştirilmelidir. Kapsam üniversite genelidir — hocanın kendi bölümü
// dışında verdiği dersler de bu programın parçasıdır.
//
// Dört incelik:
//   1) Eşleşme ADLA yapılır; slot.instructor bir metindir, kimlik değil.
//      Unvan ("Prof. Dr.", "Öğr. Gör.") ve büyük/küçük harf farkı ayıklanır.
//   2) Bölünmüş hücrenin (bir slotta iki ders) İKİNCİ dersi de ayrı bir ders
//      saatidir; dersliği yoksa birincininkini paylaşır.
//   3) Bölümün eski kimliğiyle kaydedilmiş bayat kopyalar aynı dersi iki kez
//      gösterirdi; bölüm kimliği kanonik biçime indirgenerek tekilleştirilir
//      (ders-programi.jsx'teki çakışma taramasıyla aynı kural).
//   4) Aynı gün+saatte iki farklı ders, hocanın kendi çakışmasıdır. Bölüm
//      içi çakışma taraması bunu göremez (dersler farklı bölümlerde olabilir),
//      bu yüzden burada ayrıca hesaplanır.
// ══════════════════════════════════════════════════════════════

export const PROGRAM_GUNLERI = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma'];

// İlk 9 satır lisans, sonrası akşam (lisansüstü) saatleridir. Slot anahtarı
// saat İNDEKSİ olduğu için bu dizinin sırası veri sözleşmesinin parçasıdır.
export const PROGRAM_SAATLERI = [
  '08:30-09:15',
  '09:30-10:15',
  '10:30-11:15',
  '11:30-12:15',
  '12:30-13:15',
  '13:30-14:15',
  '14:30-15:15',
  '15:30-16:15',
  '16:15-17:00',
  '17:15-18:00',
  '18:15-19:00',
  '19:15-20:00',
  '20:15-21:00',
  '21:15-22:00',
];

// Bölüm ayrımı programda renkle okunur (akademisyen programında "sınıf" değil
// "hangi bölümde" bilgisi ayırt edicidir).
export const PROGRAM_BOLUM_RENKLERI = [
  { bg: '#DBEAFE', text: '#1E3A8A' },
  { bg: '#DCFCE7', text: '#14532D' },
  { bg: '#FEF3C7', text: '#78350F' },
  { bg: '#FCE7F3', text: '#831843' },
  { bg: '#EDE9FE', text: '#4C1D95' },
  { bg: '#CFFAFE', text: '#164E63' },
  { bg: '#FFE4E6', text: '#881337' },
  { bg: '#ECFCCB', text: '#365314' },
];

// Ad eşleşmesinde atılan unvan/sıfat kelimeleri. Nokta ayrıldıktan sonra
// karşılaştırıldığı için "Prof.", "Dr." gibi kısaltmalar da bu listeyle eşleşir.
const UNVAN_KELIMELERI = new Set([
  'prof',
  'profesör',
  'doç',
  'doc',
  'doçent',
  'docent',
  'dr',
  'doktor',
  'yrd',
  'yardımcı',
  'öğr',
  'ogr',
  'öğretim',
  'ogretim',
  'gör',
  'gor',
  'görevlisi',
  'gorevlisi',
  'üyesi',
  'uyesi',
  'arş',
  'ars',
  'araş',
  'araştırma',
  'arastirma',
  'uzm',
  'uzman',
  'okt',
  'okutman',
]);

/**
 * Adı eşleştirmeye uygun anahtara indirger: unvanlar atılır, noktalama
 * boşluğa çevrilir, Türkçe küçük harfe geçilir.
 *   "Prof. Dr. Ayşe YILMAZ" → "ayşe yılmaz"
 */
export function adAnahtari(ad) {
  if (!ad) return '';
  return String(ad)
    .replace(/[.,]/g, ' ')
    .split(/\s+/)
    .map((k) => k.trim().toLocaleLowerCase('tr-TR'))
    .filter((k) => k && !UNVAN_KELIMELERI.has(k))
    .join(' ');
}

/**
 * Bölüm kayıtlarından kimlik haritaları çıkarır.
 * Bir bölüm zamanla farklı kimlik biçimleriyle (id / _id / _docId / code)
 * kaydedilmiş olabilir; her varyant hem ada hem KANONİK kimliğe çözülür.
 * @returns {{ad: Object, kanon: Object}}
 */
export function bolumHaritasi(bolumler) {
  const ad = {};
  const kanon = {};
  (bolumler || []).forEach((b) => {
    if (!b || !b.name) return;
    const canon = String(b.id || b._docId || b._id || b.code || '');
    [b.id, b._id, b._docId, b.code].forEach((k) => {
      if (!k) return;
      const anahtar = String(k);
      if (!ad[anahtar]) ad[anahtar] = b.name;
      if (canon && !kanon[anahtar]) kanon[anahtar] = canon;
    });
  });
  return { ad, kanon };
}

/** Bir slottaki ders(ler): birinci + varsa bölünmüş ikinci ders. */
function slotDersleri(slot) {
  if (!slot || !slot.courseCode) return [];
  const liste = [
    {
      courseCode: slot.courseCode,
      courseName: slot.courseName,
      instructor: slot.instructor,
      classroom: slot.classroom,
      sinif: slot.sinif,
    },
  ];
  if (slot.ikinci && slot.ikinci.courseCode) {
    liste.push({
      courseCode: slot.ikinci.courseCode,
      courseName: slot.ikinci.courseName,
      instructor: slot.ikinci.instructor || slot.instructor,
      classroom: slot.ikinci.classroom || slot.classroom,
      sinif: slot.ikinci.sinif != null ? slot.ikinci.sinif : slot.sinif,
    });
  }
  return liste;
}

/**
 * Tüm ders programı dokümanlarından bir akademisyenin ders saatlerini toplar.
 * @param {Array} dokumanlar course_schedules kayıtları (üniversite geneli)
 * @param {Object} secenekler
 * @param {string} secenekler.ad akademisyen adı (unvanlı olabilir)
 * @param {string} [secenekler.donem] 'guz' | 'bahar' — boşsa tüm dönemler
 * @param {Array}  [secenekler.bolumler] departments kayıtları (ad çözümü için)
 * @returns {Array} gün/saat sırasına dizili ders kayıtları
 */
export function akademisyenKayitlari(dokumanlar, secenekler) {
  const { ad, donem, bolumler } = secenekler || {};
  const hedef = adAnahtari(ad);
  if (!hedef) return [];
  const { ad: bolumAdlari, kanon } = bolumHaritasi(bolumler);

  const kayitlar = [];
  const gorulen = new Set();

  (dokumanlar || []).forEach((dok) => {
    if (!dok) return;
    const parcalar = String(dok.id || '').split('_');
    const bolumId = String(dok.departmentId || parcalar[0] || '');
    const sem = dok.semester || parcalar[1] || '';
    const sinif = String(dok.year || parcalar[2] || '');
    // docId: bolum_donem_sinif (lisans) veya bolum_donem_sinif_seviye
    const seviye = dok.seviye || (parcalar.length >= 4 ? parcalar[3] : 'lisans') || 'lisans';
    if (donem && sem !== donem) return;
    const slots = dok.slots || {};

    Object.entries(slots).forEach(([anahtar, slot]) => {
      const [gun, siStr] = String(anahtar).split('_');
      const saatIndeksi = parseInt(siStr, 10);
      if (!PROGRAM_GUNLERI.includes(gun)) return;
      if (!Number.isInteger(saatIndeksi) || saatIndeksi < 0) return;

      slotDersleri(slot).forEach((ders) => {
        if (adAnahtari(ders.instructor) !== hedef) return;
        // Bayat kopya ayıklama: bölüm kimliği kanonik biçime indirgenir,
        // aynı ders aynı saatte iki kez listelenmez.
        const kanonBolum = kanon[bolumId] || bolumId;
        const tekil = [gun, saatIndeksi, ders.courseCode || '', kanonBolum, sinif, seviye].join(
          '|'
        );
        if (gorulen.has(tekil)) return;
        gorulen.add(tekil);
        kayitlar.push({
          gun,
          saatIndeksi,
          saat: PROGRAM_SAATLERI[saatIndeksi] || '',
          // Aynı slottan gelen kayıtlar (bölünmüş hücre) bu kimliği paylaşır:
          // hoca tek bir yerdedir, iki ders yan yana yürür — çakışma değildir.
          slotKimligi: [kanonBolum, sinif, seviye, gun, saatIndeksi].join('|'),
          dersKodu: ders.courseCode || '',
          dersAdi: ders.courseName || '',
          derslik: ders.classroom || '',
          bolumId: kanonBolum,
          bolumAdi: bolumAdlari[bolumId] || bolumAdlari[kanonBolum] || bolumId || 'Bölüm',
          sinif,
          seviye,
          donem: sem,
        });
      });
    });
  });

  kayitlar.sort(
    (a, b) =>
      PROGRAM_GUNLERI.indexOf(a.gun) - PROGRAM_GUNLERI.indexOf(b.gun) ||
      a.saatIndeksi - b.saatIndeksi ||
      a.dersKodu.localeCompare(b.dersKodu, 'tr')
  );
  return kayitlar;
}

/**
 * Bir hücredeki kayıtlar hocayı iki yere birden mi koyuyor?
 * İki durum çakışma DEĞİLDİR:
 *   • bölünmüş hücre — aynı slotta yürüyen iki eşdeğer ders (KML312/TLK543),
 *   • ortak ders — aynı kodlu ders iki bölümde aynı saatte veriliyor.
 * Izgara, yazdırma çıktısı ve ekran önizlemesi aynı kuralı kullansın diye
 * tek yerde durur.
 */
export function hucreCakisiyor(liste) {
  if (!liste || liste.length <= 1) return false;
  if (new Set(liste.map((k) => k.slotKimligi)).size <= 1) return false;
  return new Set(liste.map((k) => k.dersKodu)).size > 1;
}

/**
 * Kayıtları haftalık ızgaraya yerleştirir; dolu saat satırlarını, hocanın
 * kendi çakışmalarını ve özet sayıları çıkarır.
 */
export function programIzgarasi(kayitlar) {
  const izgara = {};
  PROGRAM_GUNLERI.forEach((gun) => {
    izgara[gun] = {};
  });

  (kayitlar || []).forEach((k) => {
    if (!izgara[k.gun]) return;
    if (!izgara[k.gun][k.saatIndeksi]) izgara[k.gun][k.saatIndeksi] = [];
    izgara[k.gun][k.saatIndeksi].push(k);
  });

  const doluSaatler = [];
  PROGRAM_SAATLERI.forEach((_, si) => {
    const var_ = PROGRAM_GUNLERI.some((gun) => (izgara[gun][si] || []).length > 0);
    if (var_) doluSaatler.push(si);
  });

  const cakismalar = [];
  PROGRAM_GUNLERI.forEach((gun) => {
    Object.entries(izgara[gun]).forEach(([siStr, liste]) => {
      if (!hucreCakisiyor(liste)) return;
      const si = parseInt(siStr, 10);
      cakismalar.push({
        gun,
        saatIndeksi: si,
        saat: PROGRAM_SAATLERI[si] || '',
        dersler: liste.map((k) => `${k.dersKodu} (${k.bolumAdi})`),
        mesaj:
          `${gun} ${PROGRAM_SAATLERI[si] || ''} — ` +
          liste.map((k) => `${k.dersKodu} / ${k.bolumAdi}`).join(' & '),
      });
    });
  });

  const bolumler = [];
  const dersKodlari = new Set();
  // Ders saati = fiilen derse girilen slot sayısı. Bölünmüş hücrede iki ders
  // aynı saatte yürür; hoca o saatte bir kez derstedir, iki kez sayılmaz.
  const slotlar = new Set();
  (kayitlar || []).forEach((k) => {
    if (k.dersKodu) dersKodlari.add(k.dersKodu);
    if (k.bolumAdi && !bolumler.includes(k.bolumAdi)) bolumler.push(k.bolumAdi);
    slotlar.add(k.slotKimligi || `${k.gun}|${k.saatIndeksi}|${k.dersKodu}`);
  });
  bolumler.sort((a, b) => a.localeCompare(b, 'tr'));

  return {
    izgara,
    doluSaatler,
    cakismalar,
    ozet: {
      dersSaati: slotlar.size,
      dersSayisi: dersKodlari.size,
      bolumSayisi: bolumler.length,
      bolumler,
    },
  };
}

/** Bölüm adına sabit bir renk atar (aynı ad her çıktıda aynı rengi alır). */
export function bolumRengi(bolumAdi, bolumler) {
  const sira = (bolumler || []).indexOf(bolumAdi);
  const i = sira >= 0 ? sira : 0;
  return PROGRAM_BOLUM_RENKLERI[i % PROGRAM_BOLUM_RENKLERI.length];
}

function kacis(metin) {
  return String(metin == null ? '' : metin)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Türkçe karakterleri sadeleştirip dosya adına uygun hale getirir. */
export function programDosyaAdi(ad, donem) {
  const harfler = {
    ç: 'c',
    ğ: 'g',
    ı: 'i',
    ö: 'o',
    ş: 's',
    ü: 'u',
    Ç: 'C',
    Ğ: 'G',
    İ: 'I',
    Ö: 'O',
    Ş: 'S',
    Ü: 'U',
  };
  const sade = String(ad || 'akademisyen')
    .replace(/[çğıöşüÇĞİÖŞÜ]/g, (h) => harfler[h] || h)
    .replace(/[^A-Za-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  const donemEk = donem === 'bahar' ? 'bahar' : donem === 'guz' ? 'guz' : 'tum-donemler';
  return `${sade || 'akademisyen'}-${donemEk}-ders-programi.html`;
}

/**
 * Yazdırılabilir / indirilebilir haftalık program belgesi (tek parça HTML).
 * DOM'a dokunmaz — çağıran taraf ister yeni sekmede yazdırır ister dosya
 * olarak indirir; bu sayede saf ve test edilebilir kalır.
 */
export function akademisyenProgramHTML(kayitlar, secenekler) {
  const {
    ad = '',
    unvan = '',
    donem = '',
    kurum = 'Çankırı Karatekin Üniversitesi',
    birim = '',
    akademikYil = '',
  } = secenekler || {};

  const { izgara, doluSaatler, cakismalar, ozet } = programIzgarasi(kayitlar);
  const donemEtiketi = donem === 'guz' ? 'GÜZ' : donem === 'bahar' ? 'BAHAR' : 'TÜM DÖNEMLER';
  const tamAd = [unvan, ad].filter(Boolean).join(' ');

  const satirlar = doluSaatler
    .map((si) => {
      const hucreler = PROGRAM_GUNLERI.map((gun) => {
        const liste = izgara[gun][si] || [];
        if (liste.length === 0) return '<td class="bos"></td>';
        const cakisiyor = hucreCakisiyor(liste);
        const kartlar = liste
          .map((k) => {
            const renk = bolumRengi(k.bolumAdi, ozet.bolumler);
            const sinifEtiketi = k.sinif ? `${kacis(k.sinif)}. Sınıf` : '';
            const seviyeEtiketi = k.seviye && k.seviye !== 'lisans' ? ' • Lisansüstü' : '';
            return `<div class="ders" style="background:${renk.bg};color:${renk.text}">
              <div class="kod">${kacis(k.dersKodu)}</div>
              ${k.dersAdi ? `<div class="adi">${kacis(k.dersAdi)}</div>` : ''}
              <div class="meta">${kacis(k.bolumAdi)}${sinifEtiketi ? ' — ' + sinifEtiketi : ''}${seviyeEtiketi}</div>
              ${k.derslik ? `<div class="derslik">${kacis(k.derslik)}</div>` : ''}
            </div>`;
          })
          .join('');
        return `<td class="${cakisiyor ? 'cakisma' : ''}">${kartlar}</td>`;
      }).join('');
      return `<tr><td class="saat">${kacis(PROGRAM_SAATLERI[si] || '')}</td>${hucreler}</tr>`;
    })
    .join('');

  const lejant = ozet.bolumler
    .map((b) => {
      const renk = bolumRengi(b, ozet.bolumler);
      return `<div class="lejant-oge"><span class="kutu" style="background:${renk.bg}"></span>${kacis(b)}</div>`;
    })
    .join('');

  const cakismaBloku = cakismalar.length
    ? `<div class="uyari">
        <strong>${cakismalar.length} çakışma:</strong> aynı saatte birden fazla ders atanmış.
        <ul>${cakismalar.map((c) => `<li>${kacis(c.mesaj)}</li>`).join('')}</ul>
      </div>`
    : '';

  const govde = doluSaatler.length
    ? `<table>
        <thead><tr><th class="saat-baslik">Saat</th>${PROGRAM_GUNLERI.map((g) => `<th>${g}</th>`).join('')}</tr></thead>
        <tbody>${satirlar}</tbody>
      </table>`
    : `<div class="bos-program">Bu dönem için kayıtlı ders bulunamadı.</div>`;

  return `<!DOCTYPE html>
<html lang="tr">
<head><meta charset="utf-8"><title>Ders Programı — ${kacis(tamAd)}</title>
<style>
  @media print { body { margin: 0; background: white; } .page { box-shadow: none; margin: 0; } @page { size: A4 landscape; margin: 1cm; } }
  body { font-family: 'Times New Roman', serif; background: #e8e8e8; margin: 0; }
  .page { max-width: 1050px; margin: 20px auto; background: white; padding: 34px; box-shadow: 0 2px 8px rgba(0,0,0,0.15); }
  h1 { text-align: center; font-size: 16px; color: #1B2A4A; margin: 0 0 4px; border-bottom: 3px solid #1B2A4A; padding-bottom: 8px; }
  h2 { text-align: center; font-size: 13px; color: #C00; margin: 10px 0 4px; letter-spacing: 0.5px; }
  .info { text-align: center; font-size: 11px; color: #666; margin-bottom: 12px; }
  table { width: 100%; border-collapse: collapse; font-size: 10px; table-layout: fixed; }
  th { padding: 9px 6px; border: 1px solid #999; background: #1B2A4A; color: white; font-weight: 700; text-align: center; font-size: 11px; }
  td { border: 1px solid #ddd; vertical-align: top; padding: 2px; }
  td.saat { text-align: center; font-weight: 600; background: #F9FAFB; white-space: nowrap; border: 1px solid #999; padding: 6px 8px; }
  th.saat-baslik { width: 88px; }
  td.cakisma { background: #FEF2F2; outline: 2px solid #DC2626; outline-offset: -2px; }
  .ders { padding: 4px 6px; margin: 1px 0; border-radius: 4px; }
  .kod { font-weight: 700; font-size: 11px; }
  .adi { font-size: 9.5px; }
  .meta { font-size: 8.5px; opacity: 0.85; }
  .derslik { font-size: 9px; font-weight: 700; margin-top: 1px; }
  .lejant { display: flex; gap: 12px; justify-content: center; margin-top: 14px; flex-wrap: wrap; }
  .lejant-oge { display: flex; align-items: center; gap: 4px; font-size: 10px; }
  .kutu { width: 14px; height: 14px; border-radius: 3px; border: 1px solid #ccc; display: inline-block; }
  .uyari { margin-top: 14px; padding: 10px 12px; border: 1px solid #FECACA; background: #FEF2F2; color: #991B1B; font-size: 10px; border-radius: 6px; }
  .uyari ul { margin: 6px 0 0; padding-left: 18px; }
  .bos-program { padding: 40px; text-align: center; color: #999; font-size: 12px; border: 1px dashed #ccc; }
  .imza { display: flex; justify-content: flex-end; margin-top: 28px; font-size: 11px; text-align: center; }
  .imza div { width: 220px; border-top: 1px solid #666; padding-top: 4px; }
  .footer { text-align: center; font-size: 9px; color: #999; margin-top: 14px; }
</style>
</head>
<body>
<div class="page">
  <h1>${kacis(kurum.toLocaleUpperCase('tr-TR'))} — AKADEMİSYEN HAFTALIK DERS PROGRAMI</h1>
  <h2>${kacis(tamAd.toLocaleUpperCase('tr-TR'))}${birim ? ' — ' + kacis(birim) : ''}</h2>
  <div class="info">
    ${akademikYil ? kacis(akademikYil) + ' — ' : ''}${donemEtiketi} DÖNEMİ —
    ${ozet.dersSayisi} ders, ${ozet.dersSaati} ders saati, ${ozet.bolumSayisi} bölüm (üniversite geneli)
  </div>
  ${govde}
  ${lejant ? `<div class="lejant">${lejant}</div>` : ''}
  ${cakismaBloku}
  <div class="imza"><div>${kacis(tamAd)}<br/>İmza</div></div>
  <div class="footer">Oluşturulma: ${new Date().toLocaleDateString('tr-TR')} — ÇAKÜ Ders Programı Otomasyonu</div>
</div>
</body></html>`;
}
