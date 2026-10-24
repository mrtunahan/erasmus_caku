/**
 * ÖĞRENCİNİN YAZDIĞI KAYITTA KARAR ALANLARI
 *
 * Öğrenci kendi başvurusunu (staj, ÇAP, yatay geçiş, proje…) yazabiliyor;
 * sahiplik denetimi "kimin kaydı" sorusunu çözüyor ama "hangi alan" sorusunu
 * çözmüyordu. Onay/ret durumu, kararı verenin adı, red gerekçesi aynı
 * kaydın içinde durduğu için isteği elle kuran bir öğrenci kendi başvurusunu
 * "onaylandı" yazabiliyordu.
 *
 * ── İSTEK REDDEDİLMEZ, ALAN GERİ YÜKLENİR ──
 * Kimi ekranlar kaydın TAMAMINI geri gönderiyor (staj başvurusu düzenleme,
 * yol haritası adımı, belge değişiklik talebi). Bilinmeyen alanı reddeden
 * bir liste bu ekranları kırardı. Bunun yerine karar alanı kayıttaki
 * değerine döndürülür; kayıtta yoksa gelen değer düşürülür. Öğrencinin
 * kendi koyabildiği tek değerler (ör. staj adımında 'pending_approval')
 * aşağıda tek tek yazılıdır.
 *
 * Saf işlev: `op.data` yerinde düzeltilir. Dönüş `{ izin, hata? }`.
 */

const metin = (v) => String(v == null ? '' : v).trim();
const nesneMi = (v) => !!v && typeof v === 'object' && !Array.isArray(v);

/**
 * Alanı kayıttaki değerine döndürür; kayıtta yoksa düşürür.
 * Tam değiştirmede (set, merge yok) gelen veride olmasa da kayıttaki değer
 * geri yazılır, yoksa karar silinmiş olurdu.
 */
function geriYukle(data, mevcut, alanlar, tamDegistir) {
  alanlar.forEach((a) => {
    const kayitta = mevcut && mevcut[a] !== undefined;
    if (a in data) {
      if (kayitta) data[a] = mevcut[a];
      else delete data[a];
    } else if (tamDegistir && kayitta) {
      data[a] = mevcut[a];
    }
  });
}

/** Öğrencinin koyabileceği değer değilse ve kayıttakiyle aynı değilse geri yükler. */
function degerSinirla(data, mevcut, alan, izinli) {
  if (!(alan in data)) return;
  const v = data[alan];
  if (izinli.includes(v)) return;
  if (mevcut && mevcut[alan] !== undefined && v === mevcut[alan]) return;
  if (mevcut && mevcut[alan] !== undefined) data[alan] = mevcut[alan];
  else delete data[alan];
}

// ── STAJ YOL HARİTASI ──
const ADIM_KARAR = [
  'approvedBy',
  'approvedAt',
  'rejectedBy',
  'rejectedAt',
  'rejectGerekce',
  'redGecmisi',
  'onayGecmisi',
];

function adimTemizle(adim, eski) {
  if (!nesneMi(adim)) return adim;
  // Onaylanmış adım öğrencide değişmez (onay geri alınamaz).
  if (nesneMi(eski) && eski.status === 'completed') return { ...eski };
  const c = { ...adim };
  ADIM_KARAR.forEach((a) => {
    if (nesneMi(eski) && eski[a] !== undefined) c[a] = eski[a];
    else delete c[a];
  });
  degerSinirla(c, nesneMi(eski) ? eski : null, 'status', ['pending_approval']);
  return c;
}

function yolHaritasi(data, mevcut) {
  const eskiAdimlar = (mevcut && mevcut.steps) || {};
  Object.keys(data).forEach((k) => {
    const m = /^steps\.(\d{1,2})(?:\.([a-zA-Z_][a-zA-Z0-9_]*))?$/.exec(k);
    if (m) {
      const eski = eskiAdimlar[m[1]];
      if (!m[2]) {
        data[k] = adimTemizle(data[k], eski);
        return;
      }
      const alan = m[2];
      if (nesneMi(eski) && eski.status === 'completed') {
        delete data[k];
        return;
      }
      const tek = { [alan]: data[k] };
      if (ADIM_KARAR.includes(alan)) geriYukle(tek, nesneMi(eski) ? eski : null, [alan]);
      else if (alan === 'status')
        degerSinirla(tek, nesneMi(eski) ? eski : null, 'status', ['pending_approval']);
      if (alan in tek) data[k] = tek[alan];
      else delete data[k];
      return;
    }
    if (k === 'steps' && data.steps && typeof data.steps === 'object') {
      const yeni = Array.isArray(data.steps) ? [...data.steps] : { ...data.steps };
      Object.keys(yeni).forEach((i) => {
        yeni[i] = adimTemizle(yeni[i], eskiAdimlar[i]);
      });
      // Haritanın tamamı yazılıyorsa gönderilmeyen adımlar kaybolmasın.
      Object.keys(eskiAdimlar).forEach((i) => {
        if (yeni[i] === undefined) yeni[i] = eskiAdimlar[i];
      });
      data.steps = yeni;
    }
  });
}

// ── STAJ BELGELERİ ──
const BELGE_KARAR = [
  'approvedBy',
  'approvedAt',
  'rejectedBy',
  'rejectedAt',
  'rejectReason',
  'rejectGerekce',
];
const META = new Set(['updatedAt', 'createdAt', '_owner', 'id', '_id', '_docId']);

// Belgenin bağlı olduğu yol haritası adımı (staj-modulu.jsx → BELGE_ALANLARI).
const BELGE_ADIMI = {
  zorunlu_staj_formu: 2,
  staj_basvuru_formu_ek1: 2,
  kimlik_fotokopisi: 2,
  staj_defteri: 6,
  staj_teslim_belgesi: 6,
  turnitin_raporu: 6,
};
const DOSYA_ALANLARI = ['fileName', 'serverPath', 'downloadURL', 'path', 'url'];
const dosyaVar = (b) => nesneMi(b) && DOSYA_ALANLARI.some((a) => metin(b[a]));
const dosyaDegisiyor = (yeni, eski) =>
  nesneMi(yeni) &&
  DOSYA_ALANLARI.some((a) => a in yeni && metin(yeni[a]) !== metin(eski && eski[a]));

/**
 * Yükleme kilidi (ekrandaki canUploadDocument kuralının sunucu karşılığı):
 *   • Adım 6 belgeleri ancak adım 4 (SGK) tamamlandıktan sonra yüklenir.
 *   • Yüklenmiş belgenin adımı onaya gönderildiyse dosya ancak ONAYLANMIŞ
 *     değişiklik talebiyle değişir. Talep açmak (dosya aynı) serbesttir.
 * @returns {string} hata metni ya da ''
 */
function yuklemeKilidi(belgeId, yeni, eski, yolHaritasi) {
  const adim = BELGE_ADIMI[belgeId];
  if (!adim || !dosyaDegisiyor(yeni, eski)) return '';
  const adimlar = (yolHaritasi && yolHaritasi.steps) || {};
  const durum = (i) => metin(adimlar[i] && adimlar[i].status);
  if (adim === 6 && durum(3) !== 'completed') {
    return 'Bu belge, SGK adımı tamamlandıktan sonra yüklenebilir.';
  }
  if (!dosyaVar(eski)) return '';
  const gonderildi = ['pending_approval', 'completed'].includes(durum(adim - 1));
  const izin = nesneMi(eski.changeRequest) && eski.changeRequest.status === 'approved';
  if (gonderildi && !izin) {
    return 'Bu belgenin adımı onaya gönderildi; değiştirmek için önce değişiklik talebi açın ve onay bekleyin.';
  }
  return '';
}

function stajBelgeleri(data, mevcut, yolHaritasi) {
  let hata = '';
  Object.keys(data).forEach((k) => {
    if (META.has(k) || !nesneMi(data[k])) return;
    const eski = mevcut && nesneMi(mevcut[k]) ? mevcut[k] : null;
    hata = hata || yuklemeKilidi(k, data[k], eski, yolHaritasi);
    const b = { ...data[k] };
    geriYukle(b, eski, BELGE_KARAR);
    degerSinirla(b, eski, 'status', ['yuklendi']);
    if (nesneMi(b.changeRequest)) {
      const crEski = eski && nesneMi(eski.changeRequest) ? eski.changeRequest : null;
      const cr = { ...b.changeRequest };
      geriYukle(cr, crEski, BELGE_KARAR);
      degerSinirla(cr, crEski, 'status', ['pending']);
      b.changeRequest = cr;
    }
    data[k] = b;
  });
  return hata;
}

// ── KOLEKSİYON KURALLARI ──
const STAJ_BASVURU_KARAR = ['status', 'statusUpdatedBy', 'statusUpdatedAt', 'rejectionReason'];
const CAP_KARAR = ['decidedBy', 'decidedAt'];
const YATAY_KARAR_BOS = ['degerlendirme', 'degerlendirmeSinif', 'degerlendirmeSira'];
const YATAY_KARAR = YATAY_KARAR_BOS.concat([
  'degerlendirmeSebebi',
  'degerlendirmeKaynak',
  'ekMadde1Dogrulama',
  'ekMadde1Kaynak',
  'ekMadde1Gerekce',
  'sonuc',
  'karar',
  'yerlestirmePuani',
]);
const PROJE_KARAR = ['status', 'scheduleDate', 'scheduleTime'];
const PROJELER = new Set(['projects', 'unides_projects', 'tubitak2209_projects']);
const BILDIRIM_KARAR = ['cozuldu', 'cozulmeTarihi'];
// Portal: gönderinin onayı, reddi ve sabitlenmesi moderatörün işidir. İstemci
// "moderatör müyüm?" kararını tarayıcıda verip gönderiyi 'approved' açıyordu.
const PORTAL_KARAR = ['status', 'reviewedBy', 'reviewedAt', 'rejectionReason', 'pinned'];

/**
 * @param {string} koleksiyon
 * @param {{type:string, merge?:boolean, data?:object}} op
 * @param {object|null} mevcut  kaydın şimdiki hâli (yeni kayıtta null)
 * @param {{ident?:string, simdi?:Date, yolHaritasi?:object, moderator?:boolean}} [s]
 *        yolHaritasi: staj belgesinde başvurunun yol haritası (yükleme kilidi)
 * @returns {{izin:boolean, hata?:string}}
 */
function ogrenciAlanSuzgeci(koleksiyon, op, mevcut, s) {
  const o = s || {};
  if (!op || op.type === 'delete' || !nesneMi(op.data)) return { izin: true };
  const data = op.data;
  const yeni = op.type === 'add' || !mevcut;
  const tam = op.type === 'set' && !op.merge;

  switch (koleksiyon) {
    case 'internship_applications':
      if (yeni) {
        data.status = 'beklemede';
        ['statusUpdatedBy', 'statusUpdatedAt', 'rejectionReason'].forEach((a) => delete data[a]);
      } else {
        // Staj başladıktan/bittikten sonra başvuru formu öğrencide kapanır
        // (ekrandaki kuralın sunucu karşılığı).
        if (['devam', 'tamamlandi'].includes(metin(mevcut.status))) {
          return {
            izin: false,
            hata: 'Stajınız başladığı için başvuru bilgileri artık değiştirilemez.',
          };
        }
        geriYukle(data, mevcut, STAJ_BASVURU_KARAR, tam);
      }
      break;
    case 'internship_roadmap':
      yolHaritasi(data, mevcut);
      break;
    case 'internship_uploads': {
      const hata = stajBelgeleri(data, mevcut, o.yolHaritasi);
      if (hata) return { izin: false, hata };
      break;
    }
    case 'cap_yandal_basvurular':
      if (yeni) {
        data.status = 'pending';
        CAP_KARAR.concat(['redNedeni', 'dilekceUrl', 'dilekceAt']).forEach((a) => delete data[a]);
      } else geriYukle(data, mevcut, CAP_KARAR.concat(['dilekceAt']), tam);
      break;
    case 'yatay_gecis_basvurular':
      if (yeni) {
        YATAY_KARAR.forEach((a) => {
          if (YATAY_KARAR_BOS.includes(a)) {
            if (a in data) data[a] = '';
          } else delete data[a];
        });
      } else geriYukle(data, mevcut, YATAY_KARAR, tam);
      break;
    case 'portal_posts':
      if (o.moderator) break;
      if (yeni) {
        data.status = 'pending';
        PORTAL_KARAR.filter((a) => a !== 'status').forEach((a) => delete data[a]);
      } else geriYukle(data, mevcut, PORTAL_KARAR, tam);
      break;
    case 'portal_reports':
      if (o.moderator) break;
      if (yeni) data.status = 'pending';
      else geriYukle(data, mevcut, ['status'], tam);
      break;
    case 'student_notifications':
      if (yeni) {
        if ('cozuldu' in data) data.cozuldu = false;
        delete data.cozulmeTarihi;
      } else geriYukle(data, mevcut, BILDIRIM_KARAR, tam);
      break;
    case 'muafiyet_records':
      if (!yeni) muafiyetFaz(data, mevcut, o);
      break;
    case 'students':
      if (!yeni) degerSinirla(data, mevcut, 'erasmusNotDurumu', ['onay-bekliyor']);
      break;
    default:
      if (PROJELER.has(koleksiyon)) {
        if (yeni) {
          data.status = 'pending';
          delete data.scheduleDate;
          delete data.scheduleTime;
        } else geriYukle(data, mevcut, PROJE_KARAR, tam);
      }
  }
  return { izin: true };
}

/**
 * Muafiyet: not dönüşüm bağlantısı akademisyenin; faz geçmişi öğrencide
 * yalnız on_onay → belge_teslim geçişiyle ve SUNUCUNUN yazdığı tek satırla
 * uzar (geçmişi yeniden yazmak kapalı).
 */
function muafiyetFaz(data, mevcut, o) {
  delete data.notDonusumLink;
  if (!('stageHistory' in data)) return;
  const gecis = mevcut.stage === 'on_onay' && data.stage === 'belge_teslim';
  if (!gecis) {
    delete data.stageHistory;
    return;
  }
  const eski = Array.isArray(mevcut.stageHistory) ? mevcut.stageHistory : [];
  data.stageHistory = eski.concat([
    {
      from: 'on_onay',
      to: 'belge_teslim',
      by: metin(o.ident),
      at: (o.simdi instanceof Date ? o.simdi : new Date()).toISOString(),
    },
  ]);
}

module.exports = { ogrenciAlanSuzgeci, ADIM_KARAR, STAJ_BASVURU_KARAR, YATAY_KARAR };
