// ══════════════════════════════════════════════════════════════
// TAM EKRAN YOKLAMANIN YERLEŞİM KURALI
//
// ⚠ BU DOSYA BİR HATADAN DOĞDU. Karekod sütunu ile öğrenci listesi, orta
// satırda `flex-wrap: wrap` ile yan yana duruyordu. Sarmalı bir esnek kutuda
// satırın yüksekliği kapsayıcıdan DEĞİL, en uzun öğeden hesaplanır: 54
// kişilik bir sınıfta liste sütunu 2941 piksele çıkıyor, karekod sütunu ona
// eşitleniyor ve `justify-content: center` karekodu o sütunun ortasına —
// ekranın 1263. pikseline, görünür alanın dışına — koyuyordu. Karekod
// çiziliyordu; kimse göremiyordu.
//
// Az öğrencili derste ekran doğru görünüyordu, kalabalıkta kayboluyordu.
// Elle denemelerde tek öğrenci olduğu için günlerce yakalanamadı ve sırayla
// önbellek, eski paket, tarayıcı uzantısı sanıldı.
//
// Kural: orta satır boyunu EKRANDAN alır (flex-basis 0), sarma yoktur, yön
// açıkça seçilir. Liste kendi içinde kaydırılır.
// ══════════════════════════════════════════════════════════════

/** Dar ekran eşiği: altında karekod ve liste alt alta durur. */
export const DAR_ESIK = 900;

/** Verilen pencere genişliği dar mı? */
export function darMi(genislik) {
  const g = Number(genislik);
  return !Number.isFinite(g) || g < DAR_ESIK;
}

/**
 * Orta satır (karekod + liste) stili.
 * Yüksekliğini içeriğinden ASLA almaz; `flexBasis: 0` bunu garanti eder.
 */
export function satirStili(dar) {
  return {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 0,
    display: 'flex',
    flexDirection: dar ? 'column' : 'row',
    flexWrap: 'nowrap',
    minHeight: 0,
    overflowY: dar ? 'auto' : 'hidden',
  };
}

/** Karekod sütununun esneme değerleri (görsel stiller JSX'te kalır). */
export function karekodSutunuStili(dar) {
  return {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: dar ? 'auto' : 480,
    minWidth: 0,
    minHeight: 0,
    overflowY: 'auto',
    // ⚠ DAR EKRANDA DİKEY ORTALAMA YOK. İçerik sütundan uzun olduğunda
    // `center` onu iki uçtan birden taşırır ve ÜST kısım (karekodun kendisi)
    // ekranın yukarısında kalır — telefonda ölçtüğümüzde y=-47 idi.
    justifyContent: dar ? 'flex-start' : 'center',
  };
}

/** Öğrenci listesi sütununun esneme değerleri. */
export function listeSutunuStili(dar) {
  return {
    flexGrow: dar ? 1 : 0,
    flexShrink: 1,
    flexBasis: dar ? 'auto' : 380,
    minWidth: dar ? 0 : 300,
    minHeight: 0,
  };
}

/**
 * Karekodun kenar uzunluğu.
 *
 * ⚠ GENİŞLİK DE HESABA KATILIR. Önce yalnız yüksekliğe bakılıyordu; dar bir
 * telefonda karekod 440 piksel kalıp ekranın dışına taşıyordu. Alt sınır,
 * projeksiyonda okunabilirliği korur.
 */
export function karekodBoyutu(genislik, yukseklik) {
  const g = Number.isFinite(Number(genislik)) ? Number(genislik) : 800;
  const y = Number.isFinite(Number(yukseklik)) ? Number(yukseklik) : 800;
  return Math.max(200, Math.min(440, y - 380, g - 96));
}
