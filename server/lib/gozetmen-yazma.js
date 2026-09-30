// ══════════════════════════════════════════════════════════════
// GÖZETMENLİK ATAMASI KİMDE? (SUNUCU)
//
// Gözetmenlik artık BÖLÜME bağlıdır: akademisyen kaydındaki
// `gozetmenBolumleri` hangi bölümlerin sınavlarında gözetmen olduğunu tutar
// (istemci kuralı lib/gozetmen.js). Listeyi kimin hangi bölüm için
// değiştirebileceği istemciye bırakılamaz:
//
//   • üniversite yetkilisi / admin  → her bölüm, her akademisyen
//   • fakülte yetkilisi             → fakültesinin bölümleri; akademisyen
//                                     başka bölümden de olabilir (bir bölümün
//                                     gözetmen açığını diğerinden kapatır)
//   • bölüm yetkilisi               → YALNIZ kendi bölümü ve yalnız kendi
//                                     bölümünün akademisyenleri
//
// Karar yalnız DEĞİŞEN bölümlere bakar: bölüm yetkilisi, başka bölümlerdeki
// gözetmenliğe dokunmadan kendi bölümünü ekleyip çıkarabilir.
//
// `roles` içindeki 'gozetmen' işareti listeyle birlikte SUNUCUDA hesaplanır
// (en az bir bölümde gözetmense vardır); istemcinin gönderdiğine güvenilmez.
// ══════════════════════════════════════════════════════════════

const metin = (v) => String(v == null ? '' : v).trim();
const dizi = (v) => (Array.isArray(v) ? v.map(metin).filter(Boolean) : []);

/** Kaydın şu anki gözetmen bölümleri (eski kayıtta kendi bölümleri). */
function oncekiListe(kayit) {
  if (!kayit) return [];
  if (Array.isArray(kayit.gozetmenBolumleri)) return [...new Set(dizi(kayit.gozetmenBolumleri))];
  if (!dizi(kayit.roles).includes('gozetmen')) return [];
  return [...new Set(dizi([kayit.departmentId].concat(dizi(kayit.additionalDepartments))))];
}

/**
 * @param {object} p
 * @param {object} p.op        yazma işlemi (YERİNDE düzeltilir)
 * @param {object} p.mevcut    değiştirilen kayıt (add'de null)
 * @param {object} p.flags     getActorFlags sonucu
 * @param {boolean} p.bolumYetkilisi  işlemi yapan bölüm yetkilisi mi (her iki giriş türü)
 * @param {{kapsamTuru:string, departmentIds:string[]}} p.kapsam  aktorKapsami
 * @returns {{izin:boolean, hata?:string}}
 */
function gozetmenYazmaKarari({ op, mevcut, flags, bolumYetkilisi, kapsam }) {
  if (!op || op.collection !== 'professors') return { izin: true };
  const veri = op.data;
  if (!veri || typeof veri !== 'object' || !('gozetmenBolumleri' in veri)) return { izin: true };

  const yeni = [...new Set(dizi(veri.gozetmenBolumleri))];
  veri.gozetmenBolumleri = yeni;

  // roles: gönderilen (ya da mevcut) diğer roller korunur, 'gozetmen' listeden.
  const tabanRoller = Array.isArray(veri.roles) ? veri.roles : (mevcut && mevcut.roles) || [];
  const digerleri = dizi(tabanRoller).filter((r) => r !== 'gozetmen');
  veri.roles = yeni.length > 0 ? [...digerleri, 'gozetmen'] : digerleri;

  const f = flags || {};
  if (f.admin || f.uniAdmin) return { izin: true };

  const once = oncekiListe(mevcut);
  const eklenen = yeni.filter((b) => !once.includes(b));
  const cikan = once.filter((b) => !yeni.includes(b));
  if (eklenen.length === 0 && cikan.length === 0) return { izin: true };

  const k = kapsam || { departmentIds: [] };
  const alanim = dizi(k.departmentIds);
  const disarida = [...eklenen, ...cikan].filter((b) => !alanim.includes(b));
  const fakulte = !!f.facManager && k.kapsamTuru === 'fakulte';

  if (!fakulte && !bolumYetkilisi && !f.deptManager) {
    return {
      izin: false,
      hata: 'Gözetmen atamasını yalnız bölüm ya da fakülte yetkilisi yapabilir.',
    };
  }
  if (disarida.length > 0) {
    return {
      izin: false,
      hata: fakulte
        ? 'Yalnız kendi fakültenizin bölümlerine gözetmen atayabilirsiniz.'
        : 'Yalnız kendi bölümünüzün gözetmen listesini değiştirebilirsiniz.',
    };
  }
  // Bölüm yetkilisi başka bölümün akademisyenini kendi listesine ekleyemez.
  if (!fakulte && eklenen.length > 0) {
    const kisi = mevcut || veri;
    const kisininBolumleri = dizi([kisi.departmentId].concat(dizi(kisi.additionalDepartments)));
    if (!kisininBolumleri.some((b) => alanim.includes(b))) {
      return {
        izin: false,
        hata: 'Başka bölümden bir akademisyeni gözetmen olarak yalnız fakülte yetkilisi atayabilir.',
      };
    }
  }
  return { izin: true };
}

module.exports = { gozetmenYazmaKarari, oncekiListe };
