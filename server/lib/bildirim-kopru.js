// ══════════════════════════════════════════════════════════════
// BİLDİRİM KÖPRÜSÜ — modül bildirimleri navbar ziline
//
// ⚠ Navbar'daki zil yalnız merkezi `notifications` koleksiyonunu okuyor.
// Oysa modüller tarihsel olarak kendi koleksiyonlarına yazıyor:
//   internship_notifications  → staj (öğrenciye ve komisyona)
//   student_notifications     → muafiyet, Erasmus, sistem (öğrenciye)
//   portal_notifications/items→ öğrenci portalı (bahsetme vb.)
// Bu bildirimler zile hiç düşmüyor ya da (student_notifications) yalnız
// istemci ayrıca kopyalarsa düşüyordu. Her yazan yeri değiştirmek yerine
// SUNUCU, bu koleksiyonlara eklenen her kaydın zil karşılığını üretir:
// gelecekte eklenen bir modül de kendiliğinden bağlanır.
//
// Bu dosya yalnız PLANI çıkarır (saf); yazmayı routes/db.js yapar.
// `recipientType: 'staj-komisyonu'` çağıran tarafından komisyon üyelerine
// (kişi bildirimine) çözülür; üye bulunamazsa bölüm personeline gider.
// ══════════════════════════════════════════════════════════════

const metin = (v) => String(v == null ? '' : v).trim();

// Köprülenen koleksiyon → modül adı (zildeki etiket/ikon).
const KOPRU_KOLEKSIYONLARI = {
  internship_notifications: 'staj',
  student_notifications: 'ogrenci',
  portal_notifications: 'portal',
};

function stajMetni(d) {
  const adim = metin(d.stepTitle);
  const ogr = metin(d.studentName) || metin(d.studentNo);
  const etap = metin(d.stajEtapLabel);
  const ek = etap ? ' (' + etap + ')' : '';
  switch (metin(d.type)) {
    case 'step_submitted':
      return {
        title: 'Staj · adım gönderildi',
        body: ogr + ' “' + adim + '” adımını gönderdi' + ek + '.',
      };
    case 'new_application':
      return {
        title: 'Staj · yeni başvuru',
        body:
          ogr +
          ' staj başvurusu yaptı' +
          (metin(d.stajYeriAdi) ? ': ' + d.stajYeriAdi : '') +
          ek +
          '.',
      };
    case 'step_approved':
      return {
        title: 'Staj · adımınız onaylandı',
        body: '“' + adim + '” adımınız onaylandı' + ek + '.',
      };
    case 'step_rejected':
      return {
        title: 'Staj · adımınız reddedildi',
        body:
          '“' +
          adim +
          '” adımınız reddedildi' +
          (metin(d.rejectionReason) ? ': ' + d.rejectionReason : '.'),
      };
    case 'application_rejected':
      return {
        title: 'Staj · başvurunuz reddedildi',
        body:
          'Staj başvurunuz reddedildi' +
          (metin(d.rejectionReason) ? ': ' + d.rejectionReason : '.'),
      };
    case 'step_approved_commission':
      return {
        title: 'Staj · adım onaylandı',
        body: metin(d.approvedBy) + ', ' + ogr + ' için “' + adim + '” adımını onayladı.',
      };
    case 'step_rejected_commission':
      return {
        title: 'Staj · adım reddedildi',
        body: metin(d.rejectedBy) + ', ' + ogr + ' için “' + adim + '” adımını reddetti.',
      };
    case 'new_period':
      return {
        title: 'Staj · yeni staj dönemi',
        body:
          metin(d.periodLabel) +
          (metin(d.baslangic) ? ' (' + d.baslangic + ' – ' + metin(d.bitis) + ')' : '') +
          ' açıldı.',
      };
    default:
      return {
        title: 'Staj bildirimi',
        body: metin(d.message || d.body || d.title) || 'Staj modülünde yeni bir gelişme var.',
      };
  }
}

/**
 * Bir kaynak kaydın zil bildirimleri.
 * @param {string} koleksiyon
 * @param {object} veri        eklenen kayıt
 * @param {object} [baglam]    { id, parentDocId, simdi }
 * @returns {Array<object>}    notifications kayıtları (staj-komisyonu çözülmemiş olabilir)
 */
function kopruPlani(koleksiyon, veri, baglam) {
  const modul = KOPRU_KOLEKSIYONLARI[koleksiyon];
  const d = veri && typeof veri === 'object' ? veri : null;
  if (!modul || !d) return [];
  const b = baglam || {};
  const zaman = metin(d.createdAt) || (b.simdi || new Date()).toISOString();
  const meta = { kaynak: koleksiyon, kaynakId: metin(b.id) };
  const kayit = (recipientType, recipientId, alanlar) => ({
    recipientType,
    recipientId: metin(recipientId),
    module: alanlar.module || modul,
    type: metin(d.type) || 'bilgi',
    title: alanlar.title,
    body: alanlar.body,
    link: metin(d.link) || alanlar.link || '',
    meta: { ...meta, ...(alanlar.meta || {}) },
    readBy: Array.isArray(d.readBy) ? d.readBy.map(metin).filter(Boolean) : [],
    createdAt: zaman,
  });

  if (koleksiyon === 'internship_notifications') {
    const m = stajMetni(d);
    const ek = { link: 'staj', meta: { appId: metin(d.appId) } };
    if (metin(d.targetStudentNo)) return [kayit('user', d.targetStudentNo, { ...m, ...ek })];
    if (!metin(d.departmentId)) return [];
    if (metin(d.target) === 'department')
      return [kayit('department', d.departmentId, { ...m, ...ek })];
    return [kayit('staj-komisyonu', d.departmentId, { ...m, ...ek })];
  }

  if (koleksiyon === 'student_notifications') {
    const no = metin(d.studentNumber);
    if (!no) return [];
    return [
      kayit('user', no, {
        module: metin(d.module) || 'sistem',
        title: metin(d.title) || 'Bildirim',
        body: metin(d.body || d.message),
      }),
    ];
  }

  if (koleksiyon === 'portal_notifications') {
    const kisi = metin(b.parentDocId);
    if (!kisi) return [];
    return [
      kayit('user', kisi, {
        title: metin(d.title) || 'Öğrenci Portalı',
        body: metin(d.message || d.body || d.text),
        link: 'portal',
      }),
    ];
  }
  return [];
}

module.exports = { KOPRU_KOLEKSIYONLARI, kopruPlani, stajMetni };
