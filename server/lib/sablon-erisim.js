const { ayniBolum } = require('./bolum-kimlik');

// Fakülte kimliği de tek biçimli değil: bir fakülte `_docId` slug'ıyla
// ('muhendislik') ve ObjectId'siyle anılabiliyor. Şablonun `facultyId`'si
// YÜKLEYENİN profilinden, kullanıcının fakültesi ise çoğu zaman BÖLÜM
// dokümanından gelir; ham eşitlik ikisini farklı fakülte sanıyordu.
// Harita verilmezse davranış ham eşitliktir — eski çağrılar bozulmaz.
function ayniFakulte(a, b, fakulteHaritasi) {
  return ayniBolum(a, b, fakulteHaritasi);
}

// ══════════════════════════════════════════════════════════════
// ŞABLON ERİŞİM KURALLARI (document_templates)
//
// Saf fonksiyonlar — veritabanı yok, req yok. Böylece kural değiştiğinde
// testle sabitlenebiliyor. `templates.js` yalnız kapsamı (scope) çözüp
// buradaki kararı uygular.
//
// YÖNETME (canManage) ≠ GÖRME (canView):
//   yönetme → şablonu yükleyen/silen/eşleyen yetkili
//   görme   → şablondan belge ÜRETEN herkes (akademisyen, öğrenci)
// ══════════════════════════════════════════════════════════════

// Öğrencinin kendi doldurup teslim edeceği belgeler — modül + BELGE TÜRÜ
// düzeyinde. Şablon dosyası boş bir formdur (içinde başka öğrencinin verisi
// yoktur), ama yine de yalnız öğrenci akışında çıktısı alınan belge açılır:
//   muafiyet/intibak_dilekce → yaz okulu ders alma dilekçesi (öğrenci, bölüm
//   sekreterliğine teslim eder). Aynı modüldeki 'intibak' AKADEMİSYENİN nihai
//   belgesidir ve öğrenciye açılmaz.
const STUDENT_TEMPLATE_DOCTYPES = {
  muafiyet: new Set(['intibak_dilekce']),
};

function ogrenciBelgesiMi(tpl) {
  const izinli = STUDENT_TEMPLATE_DOCTYPES[tpl.module];
  return !!izinli && izinli.has(tpl.docType || 'default');
}

/**
 * Şablonu düzenleme/silme yetkisi.
 * @param {{isUniversityAdmin?:boolean,isFacultyManager?:boolean,isDeptManager?:boolean,facultyId?:string,departmentId?:string}} scope
 * @param {{scope?:string,departmentId?:string,facultyId?:string,module?:string}} tpl
 * @param {Record<string,string>} deptFacMap bölüm id → fakülte id
 */
function canManageTemplate(scope, tpl, deptFacMap, kimlikHaritasi, fakulteHaritasi) {
  const s = scope || {};
  const t = tpl || {};
  const map = deptFacMap || {};
  const ayniFak = (a, b) => ayniFakulte(a, b, fakulteHaritasi);
  // Aynı bölüm birden çok kimlikle anılabiliyor (id / _docId / code / _id ve
  // istemcideki slug). Harita verilmezse davranış ham eşitliktir — eski
  // çağrılar bozulmaz (bkz. server/lib/bolum-kimlik.js).
  const ayni = (a, b) => ayniBolum(a, b, kimlikHaritasi);
  if (s.isUniversityAdmin) return true;
  if (s.isFacultyManager) {
    if (t.scope === 'faculty' && ayniFak(t.facultyId, s.facultyId)) return true;
    if (t.scope === 'department') {
      const facOfDept = map[t.departmentId];
      return !!facOfDept && ayniFak(facOfDept, s.facultyId);
    }
    return false;
  }
  if (s.isDeptManager) {
    return t.scope === 'department' && !!t.departmentId && ayni(t.departmentId, s.departmentId);
  }
  return false;
}

/**
 * Şablonu indirme/belge üretme yetkisi.
 * @param {object} scope resolveActorScope çıktısı
 * @param {object} tpl document_templates kaydı
 * @param {Record<string,string>} deptFacMap bölüm id → fakülte id
 */
function canViewTemplate(scope, tpl, deptFacMap, kimlikHaritasi, fakulteHaritasi) {
  const s = scope || {};
  const t = tpl || {};
  const map = deptFacMap || {};
  const ayni = (a, b) => ayniBolum(a, b, kimlikHaritasi);
  const ayniFak = (a, b) => ayniFakulte(a, b, fakulteHaritasi);
  if (canManageTemplate(s, t, map, kimlikHaritasi, fakulteHaritasi)) return true;
  // Üniversite geneli herkes okur
  if (t.scope === 'university') return true;
  // Öğrenci: yalnız STUDENT_TEMPLATE_DOCTYPES belgelerinde ve yalnız KENDİ
  // bölümünün / fakültesinin şablonunu indirir. Bölümü, girişte sunucunun
  // imzaladığı JWT'den gelir — istemci değiştiremez.
  if (s.isStudent) {
    if (!ogrenciBelgesiMi(t)) return false;
    if (!s.departmentId) return false;
    if (t.scope === 'department') return ayni(t.departmentId, s.departmentId);
    if (t.scope === 'faculty') return !!t.facultyId && ayniFak(t.facultyId, map[s.departmentId]);
    return false;
  }
  // OKUMA erişimi: kullanıcı, şablonun kapsamına giriyorsa (yönetici olmasa
  // da) indirebilir — örn. akademisyen kendi bölümüne/fakültesine ait şablonu
  // görüp belge üretebilir. (canManage yalnız DÜZENLEME içindir.)
  if (t.scope === 'department' && t.departmentId && ayni(t.departmentId, s.departmentId)) {
    return true;
  }
  // ── FAKÜLTE ŞABLONU BÖLÜMDEKİ AKADEMİSYENE GÖRÜNMÜYORDU ──
  // Burada yalnız `s.facultyId` karşılaştırılıyordu. O alan profilde SADECE
  // fakülte yetkililerinde dolu; sıradan bir akademisyenin kaydında yok.
  // Sonuç: fakülte düzeyinde yüklenen şablon, o fakültenin bölümlerindeki
  // akademisyenlerin hiçbirinde "yüklü" görünmüyordu — yalnız fakülte
  // yetkilisinin kendi ekranında duruyordu. Öğrenci dalı (yukarıda) fakülteyi
  // zaten bölümden türetiyor; personel dalı bunu yapmıyordu.
  if (t.scope === 'faculty' && t.facultyId) {
    // İKİ kaynak da denenir: profilde yazan fakülte ve bölümden türetilen
    // fakülte. Bunlar aynı fakültenin farklı biçimleri olabilir; kullanıcının
    // yalnız birini taşıması şablonu erişilemez kılmamalı.
    const adaylar = [s.facultyId, map[s.departmentId]].filter(Boolean);
    if (adaylar.some((f) => ayniFak(t.facultyId, f))) return true;
  }
  return false;
}

module.exports = { STUDENT_TEMPLATE_DOCTYPES, canManageTemplate, canViewTemplate };
