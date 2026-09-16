// ══════════════════════════════════════════════════════════════
// BELGE GÖNDERİM SONUCUNUN OKUNABİLİR HÂLİ
//
// ⚠ BU DOSYA SESSİZ BİR KAYIPTAN DOĞDU. Önizleme penceresi, gönderim işi
// hata FIRLATMADIĞI sürece düğmeyi "Gönderildi" yapıyordu. Oysa
// `belgeYonlendir` başarısızlığı fırlatmaz, `{ ok:false, reason }` döner:
// kapsam çözülemediğinde belge hiçbir bölüme bağlanmıyor, hiçbir memurun
// atamasıyla eşleşmiyor ve kullanıcı "gönderildi" yazısını görüp geçiyordu.
// Yetkili günler sonra "memura düşmemiş" diye geri geliyordu.
//
// Sebep artık metne dönüşür ve düğme "Gönderildi" olmaz.
// ══════════════════════════════════════════════════════════════

const MESAJLAR = {
  'kapsam-yok':
    'Belge bir bölüme bağlanamadı, bu yüzden gönderilmedi. Başvuru kaydında bölüm ' +
    'bilgisi yok ve ekranda seçili bir bölüm de yok. Kaydı düzenleyip bölümünü ' +
    'girin ya da sağdan doğru bölümü seçip yeniden deneyin.',
  'kural-yok':
    'Bu belge türü için otomatik yönlendirme kuralı tanımlı değil; belge kimseye ' +
    'gönderilmedi.',
  'eksik-parametre': 'Belge bilgileri eksik olduğu için gönderilemedi.',
};

/** Gönderim başarılı mı? (Sonuç yoksa başarılı sayılır — eski çağrılar.) */
export function gonderimBasarili(sonuc) {
  return !sonuc || sonuc.ok !== false;
}

/** Kullanıcıya gösterilecek hata metni. Başarılıysa boş dize. */
export function gonderimHataMetni(sonuc) {
  if (gonderimBasarili(sonuc)) return '';
  const s = sonuc || {};
  const sebep = String(s.reason || '').trim();
  return MESAJLAR[sebep] || 'Belge gönderilemedi' + (sebep ? ' (' + sebep + ')' : '') + '.';
}

// ══════════════════════════════════════════════════════════════
// AYNI HEDEFE YENİDEN GÖNDERİM
//
// ⚠ BU KURAL BİR TEŞHİSTEN DOĞDU. Bir Erasmus belgesi "gönderildi" diyordu
// ama memurun ekranında yoktu. Belge yerindeydi, kapsamı doğruydu, memurun
// ataması da vardı — yönlendirmenin DURUMU "tamamlandi" idi. Memur işi bir
// kez bitirmiş, gelen kutusunun varsayılan süzgeci ("Açık") tamamlananları
// gizliyor.
//
// Asıl kusur şurada: aynı hedefe ikinci gönderim SESSİZCE HİÇBİR ŞEY
// YAPMIYORDU (`if (ayni) return {ok:true, zatenVar:true}`). Belgeyi düzeltip
// yeniden gönderen kişi "Gönderildi" görüyor, memur tarafında ise kapanmış
// bir kayıt duruyordu.
//
// Doğrusu: kapanmış bir yönlendirme yeniden gönderildiğinde AÇILIR. Gönderen
// bilerek tekrar gönderiyor; demek ki bakılacak yeni bir şey var. Açık bir
// yönlendirme ise ikinci kez gönderilince çoğaltılmaz, sadece söylenir.
// ══════════════════════════════════════════════════════════════

/**
 * Aynı hedefe yeniden gönderimde ne yapılmalı?
 *
 * @param {object} mevcut  var olan gönderim satırı
 * @returns {{islem:'yeniden-ac'|'zaten-var', yama?:object}}
 */
export function yenidenGonderimKarari(mevcut, kimden) {
  const durum = String((mevcut && mevcut.durum) || '').trim();
  if (durum !== 'tamamlandi') return { islem: 'zaten-var' };
  const sayi = Number((mevcut && mevcut.yenidenGonderimSayisi) || 0);
  return {
    islem: 'yeniden-ac',
    yama: {
      durum: 'bekliyor',
      gonderilmeTarihi: new Date().toISOString(),
      yenidenGonderimSayisi: (Number.isFinite(sayi) ? sayi : 0) + 1,
      // Önceki kapanışın izi korunur: kim ne zaman tamamlamıştı?
      oncekiDurum: 'tamamlandi',
      oncekiDurumBy: String((mevcut && mevcut.durumBy) || ''),
      oncekiDurumTarihi: String((mevcut && mevcut.durumTarihi) || ''),
      yenidenGonderen: String(kimden || ''),
    },
  };
}

// ══════════════════════════════════════════════════════════════
// "SİL" KALICI BİR ÖLÜM DEĞİLDİR
//
// ⚠ BU KURAL DA BİR TEŞHİSTEN DOĞDU — ve önceki teşhisin üstünü örtüyordu.
// Memurun "Sil" düğmesi belgeyi silmez; kaldıranın kimliğini belgenin
// `gizleyenler` listesine yazar ve o kişinin ekranından düşürür. Doğru
// tasarım, ama bir yeri eksikti: GİZLEME HİÇ KALKMIYORDU.
//
// Sonuç şu oluyordu: memur işi bitirip belgeyi listesinden kaldırıyor;
// akademisyen belgede bir düzeltme yapıp YENİDEN gönderiyor; gönderim
// "başarılı" dönüyor, yönlendirme bekliyor durumuna geçiyor — ama belge o
// memurun ekranında BİR DAHA ASLA görünmüyor. Sunucu "görür" diyor, tanı
// betiği "✓ GÖRÜR" diyor, kullanıcı boş ekrana bakıyor.
//
// Doğrusu: gizleme, yapıldığı ANDAKİ gönderime aittir. Belge yeniden
// gönderildiğinde bakılacak yeni bir şey var demektir; gizlemeler kalkar ve
// belge bütün alıcıların listesine döner. Gizleme yoksa hiçbir şey yazılmaz
// (boş yere kayıt güncellenmesin).
// ══════════════════════════════════════════════════════════════

/**
 * Yeniden gönderimde gizlemeler ne olmalı?
 *
 * @param {string[]} gizleyenler  belgenin mevcut `gizleyenler` listesi
 * @returns {{temizle:boolean, kaldirilan:string[]}}
 */
export function gizlemeleriTemizlemeKarari(gizleyenler) {
  const liste = Array.isArray(gizleyenler)
    ? gizleyenler.map((v) => String(v == null ? '' : v).trim()).filter(Boolean)
    : [];
  return { temizle: liste.length > 0, kaldirilan: liste };
}

/** Başarılı gönderimde kullanıcıya verilecek bilgi. Yeni gönderimde boş. */
export function gonderimBilgiMetni(sonuc) {
  const s = sonuc || {};
  if (s.ok === false) return '';
  if (s.yenidenAcildi) {
    return (
      'Belge zaten gönderilmişti ve memur tamamlandı olarak işaretlemişti. ' +
      'Yeniden gönderildiği için kayıt AÇILDI; memurun bekleyen listesine döndü.' +
      (s.gizlemeKaldirildi ? ' (Belgeyi listesinden kaldırmış olanlara da geri kondu.)' : '')
    );
  }
  if (s.zatenVar) {
    return (
      'Bu belge aynı göreve zaten gönderilmiş ve hâlâ bekliyor. ' +
      'Yeni bir gönderim oluşturulmadı.' +
      (s.gizlemeKaldirildi
        ? ' Alıcı belgeyi kendi listesinden kaldırmıştı; yeniden gönderildiği ' +
          'için listesine geri kondu.'
        : '')
    );
  }
  if (s.gizlemeKaldirildi) {
    return 'Belge, listesinden kaldırmış olan alıcıların listesine geri kondu.';
  }
  return '';
}
