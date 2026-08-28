// ══════════════════════════════════════════════════════════════
// ÇAP / YANDAL — İMZALI DİLEKÇE KİLİDİ
//
// Süreç beş adım: başvuru → akademisyen onayı → dilekçe indirme → İMZALI
// dilekçe yükleme → bölüm sekreterine elden teslim.
//
// ⚠ 4. ADIMDAN SONRA ÖĞRENCİ DOSYAYI DEĞİŞTİREMEZ. İmzalı dilekçe yüklendiği
// anda akademisyenin gördüğü belge ile öğrencinin elindeki çıktı aynı olmak
// zorundadır; öğrenci sessizce başka bir dosya yükleyebilseydi, sekretere
// teslim edilen ıslak imzalı kâğıt ile sistemdeki kayıt birbirini tutmazdı.
// Bu yüzden yükleme alanı kilitlenir.
//
// Kilit mutlak değil — insan hata yapar (yanlış sayfa taranır, ters çekilir).
// Öğrenci DEĞİŞİKLİK İZNİ ister, akademisyen açar, öğrenci bir kez yükler ve
// kilit kendiliğinden geri kapanır. İzin TEK SEFERLİKTİR: bir kez açılan izin
// kalıcı olsaydı kilit fiilen kalkardı (aynı ders `students.duzenlemeAcik`
// akışında öğrenilmişti).
//
// İzni yalnız akademisyen açar; kararı sunucu da doğrular
// (server/routes/db.js) — istemciye güvenilmez.
// ══════════════════════════════════════════════════════════════

function metin(d) {
  return String(d == null ? '' : d).trim();
}

/** Kayıt onaylandı mı? */
export function onaylandiMi(rec) {
  return !!rec && rec.status === 'approved';
}

/** İmzalı dilekçe yüklenmiş mi? */
export function imzaliVarMi(rec) {
  return !!(rec && metin(rec.imzaliDilekceUrl));
}

/** Akademisyen değişiklik iznini açmış mı? (tek seferlik) */
export function duzenlemeAcikMi(rec) {
  return !!(rec && rec.duzenlemeAcik === true);
}

/**
 * Değişiklik talebinin durumu.
 *   'yok'        → talep edilmemiş
 *   'bekliyor'   → öğrenci istedi, akademisyen karar vermedi
 *   'acik'       → izin verildi, öğrenci bir kez yükleyebilir
 *   'reddedildi' → akademisyen reddetti
 */
export function talepDurumu(rec) {
  if (duzenlemeAcikMi(rec)) return 'acik';
  const t = (rec && rec.degisiklikTalebi) || null;
  if (!t) return 'yok';
  const d = metin(t.durum);
  if (d === 'bekliyor' || d === 'reddedildi') return d;
  return 'yok';
}

/**
 * Öğrenci ŞU AN imzalı dilekçe yükleyebilir mi?
 *   • onay yoksa hayır (süreç oraya gelmemiş)
 *   • ilk yükleme serbest
 *   • yüklenmişse yalnız izin açıkken
 */
export function yuklemeIzniVar(rec) {
  if (!onaylandiMi(rec)) return false;
  if (!imzaliVarMi(rec)) return true;
  return duzenlemeAcikMi(rec);
}

/** Alan kilitli mi — yani yüklenmiş ve izin yok. */
export function kilitliMi(rec) {
  return imzaliVarMi(rec) && !duzenlemeAcikMi(rec);
}

/** Öğrenci değişiklik isteyebilir mi? (kilitli ve bekleyen talebi yoksa) */
export function talepEdebilirMi(rec) {
  return kilitliMi(rec) && talepDurumu(rec) !== 'bekliyor';
}

/** Yükleme düğmesinin etiketi ve etkinliği. */
export function yuklemeDugmesi(rec) {
  if (!onaylandiMi(rec)) {
    return { etkin: false, etiket: 'Onay sonrası yüklenebilir' };
  }
  if (!imzaliVarMi(rec)) {
    return { etkin: true, etiket: 'İmzalı Dilekçe Yükle' };
  }
  if (duzenlemeAcikMi(rec)) {
    return { etkin: true, etiket: 'Yeni dosya yükle (izin açık)' };
  }
  return { etkin: false, etiket: 'Değiştirilemez' };
}

/** Kilit durumunun kullanıcıya açıklaması. */
export function kilitAciklamasi(rec) {
  if (!imzaliVarMi(rec)) return '';
  const d = talepDurumu(rec);
  if (d === 'acik') {
    return 'Akademisyen değişiklik izni verdi. Yeni dosyayı yükleyebilirsiniz; yükleme sonrası alan yeniden kilitlenir.';
  }
  if (d === 'bekliyor') {
    return 'Değişiklik talebiniz akademisyene iletildi. Onay verilene kadar dosya değiştirilemez.';
  }
  if (d === 'reddedildi') {
    const t = (rec && rec.degisiklikTalebi) || {};
    return (
      'Değişiklik talebiniz reddedildi.' + (metin(t.redNedeni) ? ' Gerekçe: ' + t.redNedeni : '')
    );
  }
  return 'Yüklediğiniz imzalı dilekçe kilitlendi. Değiştirmeniz gerekiyorsa akademisyenden izin isteyin.';
}

/** Öğrencinin yazacağı talep kaydı. */
export function talepKaydi(gerekce, kullanici) {
  return {
    durum: 'bekliyor',
    gerekce: metin(gerekce),
    isteyen: metin(kullanici && (kullanici.name || kullanici.identifier)),
    istekAt: new Date().toISOString(),
  };
}

/** Akademisyenin kararı — izin açma / reddetme yaması. */
export function kararYamasi(karar, kullanici, redNedeni) {
  const kim = metin(kullanici && (kullanici.name || kullanici.identifier));
  const now = new Date().toISOString();
  if (karar === 'onayla') {
    return {
      duzenlemeAcik: true,
      duzenlemeAcanKisi: kim,
      duzenlemeAcilmaTarihi: now,
      degisiklikTalebi: { durum: 'onaylandi', karariVeren: kim, kararAt: now },
    };
  }
  return {
    duzenlemeAcik: false,
    degisiklikTalebi: {
      durum: 'reddedildi',
      karariVeren: kim,
      kararAt: now,
      redNedeni: metin(redNedeni),
    },
  };
}

/**
 * Beş adımın durumu: 'ok' | 'now' | 'wait' | 'stop'
 * ('stop' yalnız reddedilen başvuruda, sürecin durduğu adım.)
 */
export function adimDurumlari(rec) {
  const reddedildi = !!rec && rec.status === 'rejected';
  const onay = onaylandiMi(rec);
  const dilekce = onay && !!metin(rec && rec.dilekceUrl);
  const imzali = imzaliVarMi(rec);
  if (reddedildi) return ['ok', 'stop', 'wait', 'wait', 'wait'];
  // 4. adım DİLEKÇE HAZIR OLMADAN sıraya girmez. Eski kod yalnız onaya
  // bakıyordu; onay verilip dilekçe henüz üretilmemişken 3. ve 4. adım aynı
  // anda "Şimdi" görünüyor, öğrenci hangisini yapacağını bilemiyordu.
  return [
    'ok',
    onay ? 'ok' : 'now',
    !onay ? 'wait' : dilekce ? 'ok' : 'now',
    !dilekce ? 'wait' : imzali ? 'ok' : 'now',
    !imzali ? 'wait' : 'now',
  ];
}

/** Tamamlanan adım sayısı — ilerleme göstergesi için. */
export function tamamlananAdim(rec) {
  return adimDurumlari(rec).filter((d) => d === 'ok').length;
}
