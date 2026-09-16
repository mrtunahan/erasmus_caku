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

/** Başarılı gönderimde kullanıcıya verilecek bilgi. Yeni gönderimde boş. */
export function gonderimBilgiMetni(sonuc) {
  const s = sonuc || {};
  if (s.ok === false) return '';
  if (s.yenidenAcildi) {
    return (
      'Belge zaten gönderilmişti ve memur tamamlandı olarak işaretlemişti. ' +
      'Yeniden gönderildiği için kayıt AÇILDI; memurun bekleyen listesine döndü.'
    );
  }
  if (s.zatenVar) {
    return (
      'Bu belge aynı göreve zaten gönderilmiş ve hâlâ bekliyor. ' +
      'Yeni bir gönderim oluşturulmadı.'
    );
  }
  return '';
}
