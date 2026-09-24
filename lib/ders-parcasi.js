// ══════════════════════════════════════════════════════════════
// DERSİN PARÇALARI — TEORİ VE UYGULAMA
//
// Bazı dersler tek bir şey değildir: "Bilgisayar Programlama I" haftada iki
// saat TEORİ (amfide, tüm sınıf) ve iki saat UYGULAMA (laboratuvarda) olarak
// yürür. İkisinin yoklaması AYRI alınır, devamsızlık hakkı AYRI işler
// (yönetmelik teori ve uygulama için farklı oran koyabilir) ve dönem sonunda
// AYRI liste imzalanır.
//
// Sistem bugüne dek dersi bölünmez sayıyordu: tek yoklama, tek devamsızlık
// sayacı, tek liste. Laboratuvara gelmeyen öğrenci teoriye geldiği için
// "devamlı" görünüyordu.
//
// ── ÇÖZÜM: DERS AYNI KALIR, PARÇA EKLENİR ──
// Ders kaydı (`sinav_dersler`) bölünmez. Yalnız bir bayrak eklenir:
//
//     uygulamaVar: true            → bu dersin ayrıca uygulaması var
//     teoriSaati / uygulamaSaati   → parçaların haftalık saatleri
//
// Yoklama tarafında her kayıt hangi parçaya ait olduğunu söyler (`parca`).
//
// ⚠ VERİ KAYBI OLMAMASI İÇİN ÜÇ KURAL:
//
//   1) `parca` alanı OLMAYAN her eski kayıt TEORİ sayılır. Bugüne kadar
//      alınmış bütün yoklamalar, devamsızlıklar ve ayarlar oldukları yerde
//      kalır; hiçbir şey taşınmaz.
//   2) Uygulaması OLMAYAN derste parça sorulmaz: ekranlar tek listeyle
//      çalışmaya devam eder, kayıtlara yine 'teori' yazılır ama kimse
//      bunu görmez.
//   3) Ayar belgesinin kimliği teoride DERSİN KİMLİĞİDİR (değişmedi);
//      yalnız uygulama için ikinci bir belge açılır: `<dersId>__uygulama`.
//      Böylece mevcut devamsızlık sınırları olduğu gibi çalışır.
//
// Uygulama bayrağı SONRADAN açılıp kapanabilir: kapatıldığında uygulama
// kayıtları SİLİNMEZ, yalnız ekranlarda görünmez olur. Yeniden açılırsa
// eski kayıtlar yerli yerinde çıkar.
// ══════════════════════════════════════════════════════════════

const metin = (v) => String(v == null ? '' : v).trim();

/** Parça tanımları — ekranlar etiketleri buradan okur. */
export const DERS_PARCALARI = [
  { id: 'teori', ad: 'Teori', kisa: 'T', renk: '#1B2A4A' },
  { id: 'uygulama', ad: 'Uygulama', kisa: 'U', renk: '#7C3AED' },
];

/** Uygulama parçasının ayar/belge eki. */
export const UYGULAMA_EKI = '__uygulama';

/**
 * Ham değeri parçaya çevirir.
 * ⚠ BOŞ DEĞER 'teori'DİR — eski kayıtların tamamı bu daldan geçer.
 */
export function parcaCoz(ham) {
  return metin(ham).toLocaleLowerCase('tr') === 'uygulama' ? 'uygulama' : 'teori';
}

/** Bu dersin uygulaması var mı? */
export function uygulamaliMi(ders) {
  return !!(ders && (ders.uygulamaVar === true || ders.uygulamaVar === 'true'));
}

/**
 * Dersin parçaları.
 * Uygulaması yoksa TEK parça döner ('teori') — ekran parça sormaz.
 */
export function dersinParcalari(ders) {
  return uygulamaliMi(ders) ? ['teori', 'uygulama'] : ['teori'];
}

/** Parçanın adı: 'uygulama' → 'Uygulama'. */
export function parcaAdi(parca) {
  const p = parcaCoz(parca);
  const t = DERS_PARCALARI.find((x) => x.id === p);
  return t ? t.ad : 'Teori';
}

/**
 * Ekranda görünecek ders etiketi.
 * Uygulaması olmayan derste parça yazılmaz — kimse "BİL111 Teori" görmesin.
 */
export function parcaEtiketi(ders, parca) {
  const kod = metin(ders && (ders.code || ders.kod)) || metin(ders && (ders.name || ders.ad));
  if (!uygulamaliMi(ders)) return kod;
  return kod + ' — ' + parcaAdi(parca);
}

/** Ders adının parçalı hâli: "Programlama I (Uygulama)". */
export function parcaliDersAdi(ders, parca) {
  const ad = metin(ders && (ders.name || ders.ad));
  if (!uygulamaliMi(ders)) return ad;
  return ad + ' (' + parcaAdi(parca) + ')';
}

/**
 * Ayar belgesinin kimliği.
 * ⚠ TEORİ İÇİN DEĞİŞMEZ: eski `yoklama_ayarlari/<dersId>` belgeleri olduğu
 * yerde kalır ve okunmaya devam eder.
 */
export function parcaAnahtari(dersId, parca) {
  const id = metin(dersId);
  if (!id) return '';
  return parcaCoz(parca) === 'uygulama' ? id + UYGULAMA_EKI : id;
}

/** Ayar kimliğini ders + parçaya geri çözer. */
export function anahtarCoz(anahtar) {
  const a = metin(anahtar);
  if (a.endsWith(UYGULAMA_EKI)) {
    return { dersId: a.slice(0, -UYGULAMA_EKI.length), parca: 'uygulama' };
  }
  return { dersId: a, parca: 'teori' };
}

/**
 * Bir yoklama kaydı/oturumu bu parçaya mı ait?
 * ⚠ `parca` taşımayan eski kayıtlar TEORİ sayılır (bkz. dosya başı).
 */
export function kayitParcasi(kayit) {
  return parcaCoz(kayit && kayit.parca);
}

/** Kayıt bu ders + parçaya mı ait? */
export function kayitUyarMi(kayit, dersId, parca) {
  if (!kayit) return false;
  if (metin(kayit.dersId) !== metin(dersId)) return false;
  return kayitParcasi(kayit) === parcaCoz(parca);
}

/** Kayıtları ders + parçaya göre süzer. */
export function parcaKayitlari(kayitlar, dersId, parca) {
  return (Array.isArray(kayitlar) ? kayitlar : []).filter((k) => kayitUyarMi(k, dersId, parca));
}

/**
 * Parçanın haftalık ders saati.
 * Sıra: ayardaki değer → dersteki parça saati → dersin toplam saati → 1.
 * Ayar hocanın kendi düzeltmesidir, her zaman üstündür.
 */
export function parcaSaati(ders, parca, ayar) {
  const a = ayar || {};
  if (Number(a.dersSaati) > 0) return Number(a.dersSaati);
  const d = ders || {};
  const p = parcaCoz(parca);
  const alan = p === 'uygulama' ? d.uygulamaSaati : d.teoriSaati;
  if (Number(alan) > 0) return Number(alan);
  if (Number(d.saat) > 0) return Number(d.saat);
  return 1;
}

/**
 * Yoklama ekranının ders listesi: her ders, parçası kadar satır.
 * Uygulaması olmayan ders tek satır kalır (bugünkü davranış).
 */
export function parcaliDersler(dersler) {
  const liste = [];
  (Array.isArray(dersler) ? dersler : []).forEach((d) => {
    if (!d) return;
    const dersId = metin(d.id || d._docId);
    dersinParcalari(d).forEach((p) => {
      liste.push({
        ders: d,
        dersId,
        parca: p,
        // Ekranda seçimi tutan anahtar; ayar belgesiyle aynı kimlik.
        anahtar: parcaAnahtari(dersId, p),
        etiket: parcaEtiketi(d, p),
        ad: parcaliDersAdi(d, p),
        uygulamali: uygulamaliMi(d),
      });
    });
  });
  return liste;
}

/** Ders kaydına yazılacak parça alanları (Ders Yönetimi formu). */
export function parcaAlanlari(form) {
  const f = form || {};
  const acik = !!(f.uygulamaVar === true || f.uygulamaVar === 'true');
  const sayi = (v, yedek) => {
    const n = Number(v);
    return Number.isFinite(n) && n > 0 ? Math.floor(n) : yedek;
  };
  return {
    uygulamaVar: acik,
    // Kapatılsa bile saatler KORUNUR: bayrak yeniden açıldığında hoca
    // değerleri baştan yazmak zorunda kalmasın.
    teoriSaati: sayi(f.teoriSaati, 0),
    uygulamaSaati: sayi(f.uygulamaSaati, 0),
  };
}
