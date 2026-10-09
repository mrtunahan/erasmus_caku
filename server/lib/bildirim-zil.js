// ══════════════════════════════════════════════════════════════
// BİLDİRİM ZİLİ — kimin hangi bildirimi gördüğü, okuduğu, sildiği
//
// ⚠ ZİL ESKİDEN BÜTÜN `notifications` KOLEKSİYONUNU İSTEMCİYE ÇEKİYOR,
// süzmeyi tarayıcıda yapıyordu; "sil" düğmesi de kaydı DOĞRUDAN siliyordu.
// Bölüme ya da role giden bir yayını bir kişi silince o bildirim BÜTÜN
// bölümden gidiyordu; öğrencinin `notifications` yazma yetkisi olmadığı için
// öğrenci tarafında "okundu" ve "sil" hiç çalışmıyordu.
//
// Artık karar sunucuda ve bu dosyada:
//   • kişiye giden bildirim (recipientType 'user') silinince KAYIT silinir;
//   • yayın (bölüm / bölüm personeli / rol / hedef kitle) silinince kayıt
//     yerinde kalır, yalnız o kişi `gizleyenler` listesine eklenir;
//   • okundu kişi başınadır (`readBy`).
//
// Kaynak modül eşitlemesi (staj paneli, öğrenci bildirimleri, portal) için
// `kaynakHedefi` bildirimin hangi kayda bağlı olduğunu söyler.
// Bu dosya saftır: veritabanına dokunmaz (bkz. routes/bildirim.js).
// ══════════════════════════════════════════════════════════════

const metin = (v) => String(v == null ? '' : v).trim();
const dizi = (v) => (Array.isArray(v) ? v : []);

/** Varsayılan ad sadeleştirici: Türkçe küçük harf + tek boşluk. */
function varsayilanSadele(v) {
  return metin(v).toLocaleLowerCase('tr-TR').replace(/\s+/g, ' ');
}

/**
 * Zilin kişi kimliği.
 * @param {object} p
 * @param {object} p.user        JWT yükü { role, identifier, departmentId }
 * @param {string[]} [p.bolumler] kullanıcının bölümleri
 * @param {string[]} [p.numaralar] öğrencinin (ÇAP dahil) numaraları
 * @param {function} [p.sadele]  ad → karşılaştırma anahtarı (unvansız)
 */
function zilKimligi(p) {
  const o = p || {};
  const user = o.user || {};
  const sadele = typeof o.sadele === 'function' ? o.sadele : varsayilanSadele;
  const rol = metin(user.role);
  const anahtar = metin(user.identifier) || rol || 'anon';
  const ham = [anahtar].concat(dizi(o.numaralar)).map(metin).filter(Boolean);
  const anahtarlar = new Set(ham.map((v) => sadele(v)));
  return {
    rol,
    ogrenci: rol === 'student',
    anahtar,
    hamAnahtarlar: new Set(ham),
    anahtarlar,
    bolumler: new Set(dizi(o.bolumler).map(metin).filter(Boolean)),
    sadele,
  };
}

/** Bu kişiye giden bir 'user' bildirimi mi? */
function kisiyeMi(n, k) {
  const id = metin(n && n.recipientId);
  if (!id) return false;
  return k.hamAnahtarlar.has(id) || k.anahtarlar.has(k.sadele(id));
}

/**
 * Bildirim bu kişinin ziline düşer mi?
 * `kapsamdaMi(hedef, bolumler)` hedef kitleli (anket) bildirimin kapsam
 * kararını verir; verilmezse hedefin bölüm listesine bakılır.
 */
function bildirimBenimMi(n, k, secenek) {
  if (!n || !k) return false;
  const tur = metin(n.recipientType) || 'user';
  const id = metin(n.recipientId);
  switch (tur) {
    case 'user':
      return kisiyeMi(n, k);
    case 'department':
      return k.bolumler.has(id);
    case 'department-staff':
      return !k.ogrenci && k.bolumler.has(id);
    case 'role':
      return id === k.rol;
    case 'hedef': {
      // Hedef kitle (ör. anket ataması): rol + kapsam sunucuda, grup
      // (sınıf / unvan) istemcide kişinin profiline göre süzülür.
      if (id !== k.rol) return false;
      const hedef = (n.meta && n.meta.hedef) || {};
      const kapsamdaMi = secenek && secenek.kapsamdaMi;
      if (typeof kapsamdaMi === 'function') return !!kapsamdaMi(hedef, [...k.bolumler]);
      const liste = dizi(hedef.kapsamDepartmentIds).map(metin);
      if (metin(hedef.kapsamTuru) === 'universite') return true;
      return liste.some((b) => k.bolumler.has(b));
    }
    default:
      return false;
  }
}

/** Kişi bu bildirimi okumuş mu? (eski kayıtlar adla, yenileri kimlikle) */
function okunduMu(n, k) {
  return dizi(n && n.readBy).some((r) => {
    const v = metin(r);
    return v && (k.hamAnahtarlar.has(v) || k.anahtarlar.has(k.sadele(v)));
  });
}

/** Kişi bu (yayın) bildirimi kendi zilinden kaldırmış mı? */
function gizliMi(n, k) {
  return dizi(n && n.gizleyenler).some((r) => metin(r) === k.anahtar);
}

/** Silme kişiye özel mi (kaydın kendisi silinir) yoksa yayın mı (gizlenir)? */
function silmeTuru(n) {
  return (metin(n && n.recipientType) || 'user') === 'user' ? 'sil' : 'gizle';
}

// Modül adı → rota. Bağlantısı yazılmamış eski bildirimler de tıklanınca
// ilgili modülü açsın.
const MODUL_ROTALARI = {
  staj: 'staj',
  portal: 'portal',
  tto: 'tto',
  muafiyet: 'muafiyet',
  erasmus: 'erasmus',
  anket: 'anket',
  anketler: 'anket',
  kulup: 'kulupler',
  kulupler: 'kulupler',
  projeler: 'projeler',
  proje: 'projeler',
  sinav: 'sinav',
  capyandal: 'capyandal',
  yataygecis: 'yataygecis',
  dikeygecis: 'dikeygecis',
  lisansustu: 'lisansustu',
  formlar: 'formlar',
  komisyonlar: 'komisyonlar',
};

/**
 * Bildirime tıklanınca gidilecek rota (başında # olmadan).
 * Yoklama öğrencide "Benim Sayfam"da, akademisyende "Sayfam"dadır.
 */
function bildirimBaglantisi(n, rol) {
  const yazili = metin(n && n.link).replace(/^#+/, '');
  if (yazili) return yazili;
  const modul = metin(n && n.module).toLocaleLowerCase('tr-TR');
  if (modul === 'yoklama') return rol === 'student' ? 'benim' : 'benimakademik';
  return MODUL_ROTALARI[modul] || '';
}

// Zil kaydının bağlı olduğu kaynak kayıt. Kaynak koleksiyon adı veritabanı
// adıdır (portal alt koleksiyonu `portal_notifications_items`).
const KAYNAK_TABLOSU = {
  internship_notifications: 'internship_notifications',
  student_notifications: 'student_notifications',
  portal_notifications: 'portal_notifications_items',
};

function kaynakHedefi(n) {
  const m = (n && n.meta) || {};
  const koleksiyon = KAYNAK_TABLOSU[metin(m.kaynak)];
  const id = metin(m.kaynakId);
  if (!koleksiyon || !id) return null;
  return { kaynak: metin(m.kaynak), koleksiyon, id };
}

/**
 * Zilden silinen bildirimin kaynağı da silinsin mi?
 * Yalnız kaynak TEK KİŞİNİNSE: öğrenciye giden staj bildirimi, öğrenci
 * bildirimi, portal bildirimi. Komisyona/bölüme giden staj bildirimi ortak
 * kayıttır; bir üyenin silmesi ötekilerin panelinden de silmek olurdu —
 * onun yerine kaynak o kişi için "okundu" yapılır.
 */
function kaynakSilinirMi(n, kaynakKaydi, k) {
  const h = kaynakHedefi(n);
  if (!h || !kaynakKaydi || silmeTuru(n) !== 'sil') return false;
  if (h.kaynak === 'internship_notifications') {
    const hedefNo = metin(kaynakKaydi.targetStudentNo);
    return !!hedefNo && k.hamAnahtarlar.has(hedefNo);
  }
  if (h.kaynak === 'student_notifications') {
    return k.hamAnahtarlar.has(metin(kaynakKaydi.studentNumber));
  }
  return h.kaynak === 'portal_notifications';
}

/** Zilin istemciye döndürdüğü hâl (iç alanlar dışarı çıkmaz). */
function zilGorunumu(n, k) {
  const id = metin(n.id || n._docId || (n._id && n._id.toString()));
  return {
    id,
    module: metin(n.module),
    type: metin(n.type),
    title: metin(n.title),
    body: metin(n.body),
    link: bildirimBaglantisi(n, k.rol),
    meta: n.meta && typeof n.meta === 'object' ? n.meta : {},
    recipientType: metin(n.recipientType) || 'user',
    createdAt: n.createdAt instanceof Date ? n.createdAt.toISOString() : metin(n.createdAt),
    okundu: okunduMu(n, k),
  };
}

module.exports = {
  zilKimligi,
  bildirimBenimMi,
  okunduMu,
  gizliMi,
  silmeTuru,
  bildirimBaglantisi,
  kaynakHedefi,
  kaynakSilinirMi,
  zilGorunumu,
  MODUL_ROTALARI,
};
