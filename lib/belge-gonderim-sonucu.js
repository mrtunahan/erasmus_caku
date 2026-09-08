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
