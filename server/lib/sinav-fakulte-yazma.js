/**
 * FAKÜLTE SINAV PROGRAMI — YAZMA KURALLARI
 *
 *   sinav_fakulte_ayarlari  (belge kimliği = fakülte kimliği)
 *     Fakültenin ortak salon listesi, bölüm kısa adları/renkleri, gözetmen
 *     kısaltmaları. Yalnız O FAKÜLTENİN yetkilisi (ve üniversite yetkilisi /
 *     admin) yazar. Bölüm yetkilisi ve sade akademisyen yazamaz.
 *
 *   sinav_gonderimleri  (belge kimliği = bölüm__dönemGrubu)
 *     Bölümün programını fakülteye göndermesi. Bölüm yetkilisi YALNIZ kendi
 *     bölümünün kaydını "gonderildi" / "geri_cekildi" yapar; "iade" diyemez.
 *     Fakülte yetkilisi kendi fakültesindeki bölümün kaydını İADE eder
 *     (yalnız durum + iade notu; gönderen, tarih ve parmak izi bölümün
 *     beyanıdır) ya da bölüm adına baştan gönderir.
 *
 * `alan` server/lib/yetki-alani.js → yetkiAlani çıktısıdır.
 */
const { bolumAlanda, fakulteAlanda } = require('./yetki-alani');

const SINAV_FAKULTE_KOLEKSIYONLARI = new Set(['sinav_fakulte_ayarlari', 'sinav_gonderimleri']);

const metin = (v) => String(v == null ? '' : v).trim();
const ret = (hata) => ({ izin: false, hata });
const IZIN = { izin: true, hata: '' };

const BOLUM_DURUMLARI = new Set(['gonderildi', 'geri_cekildi']);
const IADE_ALANLARI = new Set(['durum', 'iadeNotu', 'iadeEden', 'iadeTarihi', 'updatedAt']);

function ayarKarari(op, alan) {
  if (alan.tur === 'universite') return IZIN;
  if (alan.tur !== 'fakulte')
    return ret('Fakülte sınav ayarlarını yalnız fakülte yetkilisi düzenler.');
  if (op.type === 'delete') return ret('Fakülte sınav ayarları silinemez.');
  if (op.type === 'add' || !metin(op.docId)) {
    return ret('Fakülte sınav ayarı fakülte kimliğiyle kaydedilir.');
  }
  if (!fakulteAlanda(alan, op.docId))
    return ret('Yalnız kendi fakültenizin ayarlarını düzenleyebilirsiniz.');
  return IZIN;
}

function gonderimKarari(op, mevcut, alan) {
  if (alan.tur === 'universite') return IZIN;
  if (op.type === 'delete') return ret('Gönderim kaydı silinemez; geri çekin.');
  const veri = op.data && typeof op.data === 'object' ? op.data : {};
  // Belgeyi baştan yazan işlem (ekleme ya da birleştirmesiz set) bölümü
  // AÇIKÇA taşımalı: yoksa bölüm alanı silinir ve kayıt sahipsiz kalır.
  const tumdenYazim = op.type === 'add' || (op.type === 'set' && !op.merge);
  if (tumdenYazim && !metin(veri.bolumId)) return ret('Gönderim kaydında bölüm yok.');
  const bolumId = metin((mevcut && mevcut.bolumId) || veri.bolumId);
  if (!bolumId) return ret('Gönderim kaydında bölüm yok.');
  if (mevcut && metin(veri.bolumId) && metin(veri.bolumId) !== metin(mevcut.bolumId)) {
    return ret('Gönderim kaydının bölümü değiştirilemez.');
  }
  // Kayıt kimliği bölümün kendisiyle başlar (bölüm__dönem): başka bölümün
  // kimliğine kendi bölümüyle yazıp onun gönderim yerini kapatmak engellenir.
  const kimlikBolumu = metin(op.docId).split('__')[0];
  if (!metin(op.docId) || kimlikBolumu !== metin(veri.bolumId || bolumId)) {
    return ret('Gönderim kaydının kimliği bölümüyle uyuşmuyor.');
  }

  if (alan.tur === 'bolum') {
    if (!bolumAlanda(alan, bolumId))
      return ret('Yalnız kendi bölümünüzün programını gönderebilirsiniz.');
    if (veri.durum !== undefined && !BOLUM_DURUMLARI.has(metin(veri.durum))) {
      return ret('Bölüm programı gönderebilir ya da geri çekebilir; iade fakültenin kararıdır.');
    }
    if (['iadeNotu', 'iadeEden', 'iadeTarihi'].some((k) => veri[k] !== undefined)) {
      return ret('İade bilgisini yalnız fakülte yetkilisi yazar.');
    }
    // Gönderilmiş program yalnız fakültenin İADESİYLE bölüme döner: bölüm
    // kendisi geri çekemez, durumu başka bir değere çeviremez ve belgeyi
    // "durum" alanı olmadan baştan yazıp silemez (kilit böyle açılıyordu).
    if (mevcut && metin(mevcut.durum) === 'gonderildi') {
      const sonDurum =
        veri.durum !== undefined ? metin(veri.durum) : tumdenYazim ? '' : 'gonderildi';
      if (sonDurum !== 'gonderildi') {
        return ret('Gönderilen program yalnız fakülte yetkilisinin iadesiyle bölüme döner.');
      }
    }
    // Fakültenin düzenleme damgası bölümce yazılamaz.
    if (['fakulteDuzenleyen', 'fakulteDuzenlemeTarihi'].some((k) => veri[k] !== undefined)) {
      return ret('Fakülte düzenleme bilgisini yalnız fakülte yetkilisi yazar.');
    }
    return IZIN;
  }

  if (alan.tur === 'fakulte') {
    if (!bolumAlanda(alan, bolumId)) return ret('Bu bölüm fakültenizde değil.');
    // Fakülte yetkilisi bölüm adına da gönderebilir (kendi bölümü ya da
    // yetkilisi olmayan bölüm); gönderimde iade bilgisi taşınamaz.
    if (BOLUM_DURUMLARI.has(metin(veri.durum))) {
      if (['iadeNotu', 'iadeEden', 'iadeTarihi'].some((k) => veri[k] !== undefined)) {
        return ret('Gönderim kaydına iade bilgisi yazılmaz.');
      }
      return IZIN;
    }
    if (!mevcut) return ret('Gönderilmemiş program iade edilemez.');
    // İade belgeyi baştan yazamaz (gönderen, tarih, parmak izi korunur).
    if (!(op.type === 'update' || (op.type === 'set' && op.merge))) {
      return ret('İade yalnız güncelleme olarak yazılır.');
    }
    const fazla = Object.keys(veri).filter((k) => !IADE_ALANLARI.has(k));
    if (fazla.length > 0)
      return ret('Fakülte yetkilisi gönderim kaydında yalnız iade bilgisi yazar.');
    if (metin(veri.durum) !== 'iade')
      return ret('Fakülte yetkilisi programı yalnız iade edebilir.');
    return IZIN;
  }

  return ret('Sınav programını fakülteye yalnız bölüm yetkilisi gönderir.');
}

/**
 * @param {object} op  yazma işlemi
 * @param {object|null} mevcut  belgenin şimdiki hâli
 * @param {object} alan  yetkiAlani çıktısı
 * @returns {{izin:boolean, hata:string}}
 */
function sinavFakulteYazmaKarari(op, mevcut, alan) {
  if (!op || !SINAV_FAKULTE_KOLEKSIYONLARI.has(op.collection)) return IZIN;
  const a = alan || { tur: 'yok' };
  if (op.collection === 'sinav_fakulte_ayarlari') return ayarKarari(op, a);
  return gonderimKarari(op, mevcut, a);
}

module.exports = { SINAV_FAKULTE_KOLEKSIYONLARI, sinavFakulteYazmaKarari };
