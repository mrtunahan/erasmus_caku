// ══════════════════════════════════════════════════════════════
// PROJE GRUBU DAVETİNE YANIT — davet edilen öğrenci kendi satırını yazar
//
// ⚠ Proje kaydının sahibi grubu kuran öğrencidir (createdBy). Davet edilen
// üye "Kabul et / Reddet"e basınca aynı kayda `memberStatus` yazılıyor;
// sahiplik denetimi bunu "başkasının kaydı" sayıp reddediyordu:
//   "Yanıt gönderilemedi: Bu kayıt üzerinde işlem yetkiniz yok: projects/…"
// Davet hiçbir zaman kabul edilemiyordu.
//
// İzin DAR tutulur: üye listesinde ADIYLA (Türkçe harf/büyüklük farkı yok
// sayılır) bulunan öğrenci yalnız `memberStatus` dizisinde KENDİ sırasını,
// yalnız "bekliyor" durumundan "kabul" ya da "ret"e çevirebilir. Başka hiçbir
// alan, başka hiçbir üyenin durumu, lider satırı değişemez.
// ══════════════════════════════════════════════════════════════

const YANITLAR = new Set(['accepted', 'rejected']);
const metin = (v) => String(v == null ? '' : v).trim();

/**
 * @param {object} p
 * @param {{type:string, merge?:boolean, data?:object}} p.op
 * @param {object} p.mevcut       proje kaydı
 * @param {string} p.ogrenciAdi   öğrencinin kayıttaki adı (Ad Soyad)
 * @param {(s:string)=>string} p.anahtar  ad karşılaştırma anahtarı (trAnahtar)
 * @returns {{izin:boolean, hata?:string}}
 */
function davetYanitiKarari(p) {
  const { op, mevcut, anahtar } = p || {};
  const red = (hata) => ({ izin: false, hata });
  if (!op || !mevcut || typeof anahtar !== 'function') return red('Davet bulunamadı.');
  const birlesik = op.type === 'update' || (op.type === 'set' && op.merge === true);
  const data = op.data || {};
  const alanlar = Object.keys(data);
  if (!birlesik || alanlar.length !== 1 || alanlar[0] !== 'memberStatus') {
    return red('Davette yalnız kendi yanıtınızı verebilirsiniz.');
  }
  const uyeler = Array.isArray(mevcut.members) ? mevcut.members : [];
  const ben = anahtar(metin(p.ogrenciAdi));
  const sira = ben ? uyeler.findIndex((m, i) => i > 0 && anahtar(metin(m)) === ben) : -1;
  if (sira < 0) return red('Bu proje grubuna davetli değilsiniz.');
  const eski = Array.isArray(mevcut.memberStatus) ? mevcut.memberStatus : [];
  const yeni = data.memberStatus;
  if (!Array.isArray(yeni) || yeni.length > uyeler.length) {
    return red('Geçersiz davet yanıtı.');
  }
  for (let i = 0; i < Math.max(eski.length, yeni.length); i++) {
    if (i === sira) continue;
    if (metin(eski[i]) !== metin(yeni[i])) return red('Başka üyenin durumu değiştirilemez.');
  }
  const onceki = metin(eski[sira]) || 'pending';
  if (onceki !== 'pending') return red('Bu davete zaten yanıt verdiniz.');
  if (!YANITLAR.has(metin(yeni[sira]))) return red('Geçersiz davet yanıtı.');
  return { izin: true };
}

module.exports = { davetYanitiKarari };
