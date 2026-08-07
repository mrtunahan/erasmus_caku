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

// Öğrencinin kendi doldurup teslim edeceği belgelerin modülleri. Şablon dosyası
// BOŞ bir formdur (içinde başka öğrencinin verisi yoktur), ama yine de her
// modülü açmıyoruz — yalnız öğrenci akışında çıktısı alınanlar:
//   muafiyet → yaz okulu ders intibak dilekçesi (bölüm sekreterliğine verilir)
const STUDENT_TEMPLATE_MODULES = new Set(['muafiyet']);

/**
 * Şablonu düzenleme/silme yetkisi.
 * @param {{isUniversityAdmin?:boolean,isFacultyManager?:boolean,isDeptManager?:boolean,facultyId?:string,departmentId?:string}} scope
 * @param {{scope?:string,departmentId?:string,facultyId?:string,module?:string}} tpl
 * @param {Record<string,string>} deptFacMap bölüm id → fakülte id
 */
function canManageTemplate(scope, tpl, deptFacMap) {
  const s = scope || {};
  const t = tpl || {};
  const map = deptFacMap || {};
  if (s.isUniversityAdmin) return true;
  if (s.isFacultyManager) {
    if (t.scope === 'faculty' && t.facultyId === s.facultyId) return true;
    if (t.scope === 'department') {
      const facOfDept = map[t.departmentId];
      return !!facOfDept && facOfDept === s.facultyId;
    }
    return false;
  }
  if (s.isDeptManager) {
    return t.scope === 'department' && !!t.departmentId && t.departmentId === s.departmentId;
  }
  return false;
}

/**
 * Şablonu indirme/belge üretme yetkisi.
 * @param {object} scope resolveActorScope çıktısı
 * @param {object} tpl document_templates kaydı
 * @param {Record<string,string>} deptFacMap bölüm id → fakülte id
 */
function canViewTemplate(scope, tpl, deptFacMap) {
  const s = scope || {};
  const t = tpl || {};
  const map = deptFacMap || {};
  if (canManageTemplate(s, t, map)) return true;
  // Üniversite geneli herkes okur
  if (t.scope === 'university') return true;
  // Öğrenci: yalnız STUDENT_TEMPLATE_MODULES modüllerinde ve yalnız KENDİ
  // bölümünün / fakültesinin şablonunu indirir. Bölümü, girişte sunucunun
  // imzaladığı JWT'den gelir — istemci değiştiremez.
  if (s.isStudent) {
    if (!STUDENT_TEMPLATE_MODULES.has(t.module)) return false;
    if (!s.departmentId) return false;
    if (t.scope === 'department') return t.departmentId === s.departmentId;
    if (t.scope === 'faculty') return !!t.facultyId && t.facultyId === map[s.departmentId];
    return false;
  }
  // OKUMA erişimi: kullanıcı, şablonun kapsamına giriyorsa (yönetici olmasa
  // da) indirebilir — örn. akademisyen kendi bölümüne/fakültesine ait şablonu
  // görüp belge üretebilir. (canManage yalnız DÜZENLEME içindir.)
  if (t.scope === 'department' && t.departmentId && t.departmentId === s.departmentId) {
    return true;
  }
  if (t.scope === 'faculty' && t.facultyId && t.facultyId === s.facultyId) {
    return true;
  }
  return false;
}

module.exports = { STUDENT_TEMPLATE_MODULES, canManageTemplate, canViewTemplate };
