// ══════════════════════════════════════════════════════════════
// AKTİF BÖLÜM KAPSAMI
//
// Uygulama tek bir "aktif bölüm" üzerinden çalışır: modüller hangi bölümün
// verisini okuyacağını bu değerden alır. Bölüm listesi ise İKİ KAYNAKTAN
// gelir — koda gömülü liste (Mühendislik Fakültesi bölümleri) ve `departments`
// koleksiyonu. İkincisi AÇILIŞTAN SONRA, asenkron yükleniyor ve `facultyId`
// bilgisini yalnız o taşıyor.
//
// ⚠ ORTAYA ÇIKAN HATA: yeni bir fakültenin yetkilisi giriş yaptığında, kapsam
// denetimi kendi fakültesinin bölümleri daha listeye girmeden çalışıyordu.
// O anda "erişebildiği bölümler" listesi BOŞ oluyor, boş liste de "kısıt yok"
// sayılıp önceki/varsayılan bölüm (ör. Makine Mühendisliği) aktif kalıyordu.
// Bölümler yüklendiğinde yan menü doğru fakülteyi gösteriyor ama aktif bölüm
// düzeltilmiyordu: yetkili, başka bir fakültenin bölümünün TÜM verisini
// görüyordu.
//
// Buradaki kural bu yüzden üç durumludur: boş liste "kısıt yok" DEĞİLDİR.
// Kapsamı fakülteye bağlı bir kullanıcı için liste boşsa cevap "bekle"dir —
// modül render edilmez, çünkü yanlış fakültenin verisini okumak, hiçbir şey
// göstermemekten kötüdür.
// ══════════════════════════════════════════════════════════════

/**
 * Şu an HANGİ FAKÜLTEDEYİZ?
 *
 * Üst banttaki fakülte adı kurum geneli tek bir ayardan (TENANT.facultyName)
 * geliyordu; çok fakülteli kurumda bu, Orman Fakültesi'ni yöneten yetkiliye
 * "Mühendislik Fakültesi" yazıyordu. Doğru cevap bakılan BAĞLAMDIR:
 *
 *   1) Aktif bölümün fakültesi — ekranda o bölümün verisi duruyor. Üniversite
 *      yetkilisi başka fakültenin bölümüne geçtiğinde bant da onu göstermeli.
 *   2) Kullanıcının kendi fakültesi — aktif bölüm yoksa ya da bölüm hiçbir
 *      fakülteye bağlı değilse (koda gömülü eski kayıtlar facultyId taşımaz).
 *   3) Hiçbiri yoksa çağıran, kurum varsayılanına düşer.
 *
 * @returns {string} fakülte kimliği ('' → çözülemedi)
 */
export function aktifFakulteId(secenek) {
  const { aktifBolum, bolumler, kullanici } = secenek || {};
  const suan = String(aktifBolum == null ? '' : aktifBolum);
  if (suan) {
    const bolum = (bolumler || []).find((d) => d && String(d.id) === suan);
    if (bolum && bolum.facultyId) return String(bolum.facultyId);
  }
  const k = kullanici || {};
  return k.facultyId ? String(k.facultyId) : '';
}

/**
 * Üst bantta yazılacak fakülte adı.
 *
 * @param {Object} secenek
 * @param {string} secenek.aktifBolum   aktif bölüm kimliği
 * @param {Array}  secenek.bolumler     bilinen bölümler (facultyId taşıyanlar)
 * @param {Object} secenek.kullanici    oturumdaki kullanıcı
 * @param {Object} secenek.fakulteAdlari  fakülte kimliği → ad
 * @param {string} secenek.varsayilan   kurum geneli ad (TENANT.facultyName)
 * @returns {string}
 */
export function fakulteBasligi(secenek) {
  const { fakulteAdlari, varsayilan } = secenek || {};
  const id = aktifFakulteId(secenek);
  // Ad çözülemiyorsa ham kimlik BASILMAZ ("7gwPii..." gibi bir dize bant
  // başlığında anlamsızdır); kurum varsayılanına düşülür.
  const ad = id && fakulteAdlari ? fakulteAdlari[id] : '';
  return String(ad || varsayilan || '');
}

/**
 * Kullanıcının bölüm kapsamı FAKÜLTESİNE bağlı mı?
 *
 * Fakülte yetkilisi ve memur yalnız kendi fakültesinin bölümlerini görür;
 * üniversite yetkilisi ancak kapsamı 'faculty' iken fakültesine kısıtlıdır.
 * Fakülte geneli staj koordinatörü (tüm bölümlere erişir) kapsam dışıdır.
 */
export function fakulteKapsamli(kullanici, adminScope) {
  const k = kullanici || {};
  if (!k.facultyId) return false;
  if (k.isStajCoordinator) return false;
  if (k.isUniversityAdmin) return adminScope === 'faculty';
  if (k.isFacultyManager) return true;
  if (k.role === 'memur' || k.isMemur) return true;
  return false;
}

/**
 * Kullanıcının kapsamı neye bağlı?
 *   'fakulte' → yalnız kendi fakültesinin bölümleri
 *   'bolum'   → kendi bölümü (+ ek bölümleri)
 *   'yok'     → tanımlı bir kapsamı yok (üniversite yetkilisi, kapsamsız hesap)
 *
 * Ayrım şunun için gerekli: kapsamı OLAN bir kullanıcının erişebildiği bölüm
 * listesi boş çıkıyorsa bu "kısıtsız" demek değil, "kapsamı henüz çözemedik"
 * demektir — bölüm listesi (DB'den, asenkron) tamamlanmamış olabilir.
 */
export function bolumKapsami(kullanici, adminScope) {
  const k = kullanici || {};
  if (fakulteKapsamli(k, adminScope)) return 'fakulte';
  const ekler = Array.isArray(k.additionalDepartments) ? k.additionalDepartments : [];
  if (k.departmentId || ekler.length > 0) return 'bolum';
  return 'yok';
}

/**
 * Aktif bölüm bu kullanıcı için geçerli mi, değiştirilmeli mi, yoksa bölüm
 * listesi henüz güvenilir değil mi?
 *
 * @param {Object} secenek
 * @param {Array}  secenek.izinliler       kullanıcının erişebildiği bölümler
 * @param {string} secenek.aktif           şu anki aktif bölüm kimliği
 * @param {'fakulte'|'bolum'|'yok'} secenek.kapsam bkz. bolumKapsami
 * @param {boolean} secenek.bolumlerYuklendi DB bölümleri yüklendi mi
 * @returns {{durum:'gecerli'|'degistir'|'bekle', bolumId:string, sebep:string}}
 */
export function aktifBolumKarari(secenek) {
  const { izinliler, aktif, kapsam, bolumlerYuklendi } = secenek || {};
  const liste = Array.isArray(izinliler) ? izinliler.filter(Boolean) : [];
  const suan = String(aktif == null ? '' : aktif);

  if (liste.length > 0) {
    if (suan && liste.some((d) => String(d.id) === suan)) {
      return { durum: 'gecerli', bolumId: suan, sebep: '' };
    }
    return {
      durum: 'degistir',
      bolumId: String(liste[0].id),
      sebep: suan ? 'kapsam_disi' : 'bos',
    };
  }

  // Liste boş: kapsamı OLAN bir kullanıcıda bu "kısıt yok" demek DEĞİLDİR.
  // Bölümler henüz yüklenmemiş olabilir (fakülte/bölüm kimliğini taşıyan
  // kayıtlar DB'den sonradan geliyor); yüklendiyse de kullanıcının bölümü
  // gerçekten yok demektir. İki durumda da BAŞKA bir bölümde kalınmaz.
  if (kapsam === 'fakulte' || kapsam === 'bolum') {
    if (!bolumlerYuklendi) {
      return { durum: 'bekle', bolumId: '', sebep: 'bolumler_yuklenmedi' };
    }
    return {
      durum: 'bekle',
      bolumId: '',
      sebep: kapsam === 'fakulte' ? 'fakultede_bolum_yok' : 'bolum_bulunamadi',
    };
  }

  // Tanımlı kapsamı olmayan kullanıcı (üniversite yetkilisi gibi) için boş
  // liste eskiden beri "kısıt yok" anlamına gelir.
  return { durum: 'gecerli', bolumId: suan, sebep: 'kapsamsiz' };
}
