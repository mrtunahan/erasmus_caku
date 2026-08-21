// ══════════════════════════════════════════════════════════════
// KVKK AYDINLATMA METNİ VE ONAY KAYDI
//
// ── ÖNEMLİ: BU BİR "RIZA" KUTUCUĞU DEĞİLDİR ──
// Üniversitenin öğrenci verisini işlemesinin hukuki sebebi açık rıza
// DEĞİLDİR. KVKK m.5/2 uyarınca işleme; kanunlarda açıkça öngörülmesi
// (2547 sayılı Yükseköğretim Kanunu, 5510 sayılı Kanun), veri sorumlusunun
// hukuki yükümlülüğü ve sözleşmenin ifası sebeplerine dayanır.
//
// Bunu bir rıza kutucuğu yapmak iki yönden yanlış olurdu:
//   • Rıza her zaman GERİ ALINABİLİR (m.7). Geri alındığında öğrencilik
//     kaydını silmek gerekirdi — oysa kurum bu kayıtları saklamakla
//     yükümlü. Yerine getirilemeyecek bir söz verilmiş olurdu.
//   • Rıza vermeyen öğrenci sisteme giremezdi; "özgür iradeyle" verilmemiş
//     bir rıza zaten geçersizdir.
//
// Kurumun buradaki yükümlülüğü AYDINLATMADIR (m.10): kişi ne işlendiğini,
// niçin, hangi hukuki sebeple ve kime aktarıldığını öğrenmelidir. Kutucuk
// bu yüzden "kabul ediyorum" değil, "okudum ve bilgilendirildim" der; kayıt
// da rızayı değil, aydınlatmanın YAPILDIĞINI ispatlar.
//
// ── AÇIK RIZA NEREDE GEREKİR ──
// Gerçekten seçimlik olan işlemler için ayrı ayrı ve o işlemin yapıldığı
// yerde alınır — kayıt formuna yığılmaz. Rıza "belirli bir konuya ilişkin"
// olmak zorundadır (m.3); her şeyi tek kutucukta toplamak onu geçersiz
// kılar. Bu sistemde en belirgin örnek Erasmus kapsamında verilerin YURT
// DIŞINDAKİ ortak yükseköğretim kurumuna aktarılmasıdır (m.9) ve rızası
// Erasmus başvurusu adımında alınmalıdır, kayıt sırasında değil.
//
// ── SÜRÜM ──
// Metin değişirse sürüm artar. Eski sürümü onaylamış kullanıcıya yeni metin
// yeniden gösterilir; "onayladı" demek, HANGİ metni gördüğünü bilmeden bir
// şey ifade etmez.
//
// ── HUKUKİ ONAY ──
// Aşağıdaki metin, sistemin fiilen topladığı alanlardan türetilmiş bir
// TASLAKTIR. Yayımlanmadan önce kurumun KVKK birimi/veri sorumlusu
// tarafından gözden geçirilmelidir; iletişim ve saklama süresi alanları
// kurum tarafından doldurulmadan metin eksiktir.
// ══════════════════════════════════════════════════════════════

export const KVKK_SURUM = '2026-01';

const DOLDURULACAK = '[kurum tarafından doldurulacak]';

/**
 * Aydınlatma metni, bölüm bölüm.
 * @param {object} kurum { universityName, kvkkAdres, kvkkEposta, kvkkKep }
 */
export function kvkkMetni(kurum) {
  const k = kurum || {};
  const ad = k.universityName || DOLDURULACAK;
  const adres = k.kvkkAdres || DOLDURULACAK;
  const eposta = k.kvkkEposta || DOLDURULACAK;
  const kep = k.kvkkKep || DOLDURULACAK;

  return {
    surum: KVKK_SURUM,
    baslik: 'Kişisel Verilerin Korunması Hakkında Aydınlatma Metni',
    giris:
      `6698 sayılı Kişisel Verilerin Korunması Kanunu ("KVKK") uyarınca, ${ad} ` +
      'veri sorumlusu sıfatıyla, bu sistem üzerinden işlenen kişisel verilerinize ' +
      'ilişkin olarak sizi aşağıdaki şekilde bilgilendirir.',
    bolumler: [
      {
        baslik: 'İşlenen kişisel verileriniz',
        maddeler: [
          'Kimlik bilgileri: ad, soyad, öğrenci numarası. Staj başvurusunda ayrıca T.C. kimlik numarası, nüfus kayıt bilgileri (anne-baba adı, doğum yeri ve tarihi, cilt/aile sıra numarası), nüfus cüzdanı seri numarası.',
          'İletişim bilgileri: e-posta adresi, telefon numarası, ikametgâh adresi (staj başvurusunda).',
          'Eğitim ve öğrencilik bilgileri: bölüm, sınıf, ders programı, aldığınız dersler, notlar ve transkript bilgileri, muafiyet ve yatay geçiş başvurularınız ile bu başvurulara eklediğiniz belgeler.',
          'Erasmus hareketliliği bilgileri: karşı kurum ve program bilgileri, öğrenim anlaşması, ders eşleştirmeleri, karşı kurumdan alınan notlar ve transkript belgeleri.',
          'Staj ve sosyal güvenlik bilgileri: staj yeri bilgileri, staj tarihleri, sağlık güvencesi/SGK bilgileri.',
          'Anket yanıtlarınız.',
          'İşlem güvenliği bilgileri: hesap ve oturum kayıtları, sisteme giriş bilgileri. Şifreniz geri döndürülemez biçimde özetlenerek (hash) saklanır; kurum dâhil hiç kimse şifrenizi göremez.',
        ],
      },
      {
        baslik: 'İşleme amaçlarımız',
        maddeler: [
          'Öğrencilik işlemlerinin ve akademik süreçlerin yürütülmesi.',
          'Ders programı ve sınav programının hazırlanması, ilan edilmesi.',
          'Ders muafiyeti, yatay geçiş ve intibak başvurularının değerlendirilmesi.',
          'Erasmus/değişim hareketliliğinin yürütülmesi, ders eşleştirmesi ve not dönüşümünün yapılması.',
          'Staj süreçlerinin yürütülmesi ve mevzuat gereği sosyal güvenlik bildirimlerinin yapılması.',
          'Kurum içi istatistik, raporlama ve akreditasyon çalışmaları.',
          'Bilgi güvenliğinin sağlanması ve yetkisiz erişimin önlenmesi.',
        ],
      },
      {
        baslik: 'Hukuki sebeplerimiz',
        girisMetni:
          'Kişisel verileriniz KVKK m.5/2 kapsamında, AÇIK RIZANIZ ARANMAKSIZIN aşağıdaki ' +
          'sebeplerle işlenmektedir:',
        maddeler: [
          'Kanunlarda açıkça öngörülmesi (2547 sayılı Yükseköğretim Kanunu ve ilgili yönetmelikler, staj süreçleri bakımından 5510 sayılı Sosyal Sigortalar ve Genel Sağlık Sigortası Kanunu).',
          'Veri sorumlusunun hukuki yükümlülüğünü yerine getirebilmesi için zorunlu olması.',
          'Bir sözleşmenin kurulması veya ifasıyla doğrudan doğruya ilgili olması.',
          'Bir hakkın tesisi, kullanılması veya korunması için veri işlemenin zorunlu olması.',
        ],
        sonMetni:
          'Bu nedenle veri işlenmesine "rıza göstermeme" gibi bir seçenek sunulmamaktadır; ' +
          'yükümlülüğümüz sizi bilgilendirmektir. Buna karşılık aşağıda sayılan haklarınızı ' +
          'her zaman kullanabilirsiniz.',
      },
      {
        baslik: 'Verilerinizin aktarılması',
        maddeler: [
          'Yükseköğretim Kurulu ve mevzuat uyarınca bilgi talep etmeye yetkili kamu kurum ve kuruluşlarına.',
          'Staj süreçleri kapsamında Sosyal Güvenlik Kurumu’na ve staj yaptığınız işyerine.',
          'Sistemin barındırıldığı sunucu/altyapı hizmet sağlayıcısına, yalnızca hizmetin sunulması amacıyla ve veri işleyen sıfatıyla.',
          'Erasmus/değişim hareketliliğine katılmanız hâlinde, yurt dışındaki ortak yükseköğretim kurumuna. Bu YURT DIŞI aktarım için KVKK m.9 kapsamında ayrıca ve yalnızca başvuru aşamasında açık rızanız istenir; hareketliliğe katılmadığınız sürece böyle bir aktarım yapılmaz.',
        ],
      },
      {
        baslik: 'Saklama süresi',
        maddeler: [
          `Kişisel verileriniz, ilgili mevzuatta öngörülen süreler boyunca ve öğrencilik kaydınızın gerektirdiği süre boyunca saklanır. Sürenin dolmasının ardından silinir, yok edilir veya anonim hâle getirilir. Kuruma özgü saklama ve imha süreleri: ${DOLDURULACAK}.`,
        ],
      },
      {
        baslik: 'KVKK m.11 kapsamındaki haklarınız',
        girisMetni: 'Veri sorumlusuna başvurarak;',
        maddeler: [
          'Kişisel verinizin işlenip işlenmediğini öğrenme, işlenmişse buna ilişkin bilgi talep etme.',
          'İşlenme amacını ve amacına uygun kullanılıp kullanılmadığını öğrenme.',
          'Yurt içinde veya yurt dışında verilerin aktarıldığı üçüncü kişileri bilme.',
          'Eksik veya yanlış işlenmiş verinin düzeltilmesini isteme.',
          'Kanunda öngörülen şartlar çerçevesinde silinmesini veya yok edilmesini isteme.',
          'Düzeltme, silme ve yok etme işlemlerinin, verilerin aktarıldığı üçüncü kişilere bildirilmesini isteme.',
          'Münhasıran otomatik sistemlerle analiz edilmesi suretiyle aleyhinize bir sonucun ortaya çıkmasına itiraz etme.',
          'Kanuna aykırı işleme sebebiyle zarara uğramanız hâlinde zararın giderilmesini talep etme haklarına sahipsiniz.',
        ],
      },
      {
        baslik: 'Başvuru yolu',
        maddeler: [
          `Taleplerinizi, Veri Sorumlusuna Başvuru Usul ve Esasları Hakkında Tebliğ’e uygun olarak ${adres} adresine yazılı olarak, ${kep} kayıtlı elektronik posta adresine ya da sistemde kayıtlı e-posta adresinizden ${eposta} adresine iletebilirsiniz. Başvurunuz en geç otuz gün içinde sonuçlandırılır.`,
        ],
      },
    ],
    kutucukMetni:
      'Kişisel Verilerin Korunması Hakkında Aydınlatma Metni’ni okudum ve ' +
      'kişisel verilerimin metinde belirtilen kapsamda işleneceği konusunda ' +
      'bilgilendirildim.',
    eksikAlanVar: [ad, adres, eposta, kep].some((v) => v === DOLDURULACAK),
  };
}

/** Aydınlatmanın yapıldığını ispatlayan kayıt. */
export function aydinlatmaKaydi(surum, tarih) {
  return {
    surum: String(surum || KVKK_SURUM),
    tarih: (tarih instanceof Date ? tarih : new Date(tarih || Date.now())).toISOString(),
    tur: 'aydinlatma', // rıza DEĞİL — bkz. dosya başı
  };
}

/**
 * Kullanıcıya metin yeniden gösterilmeli mi?
 * Kaydı yoksa ya da onayladığı sürüm eskiyse: evet.
 */
export function yenidenGosterilmeli(kayit, surum) {
  const guncel = String(surum || KVKK_SURUM);
  if (!kayit || !kayit.surum) return true;
  return String(kayit.surum) !== guncel;
}

/** Metnin düz yazı hâli (yazdırma/arşiv için). */
export function kvkkDuzMetin(metin) {
  const m = metin || kvkkMetni(null);
  const satirlar = [m.baslik, '', m.giris, ''];
  (m.bolumler || []).forEach((b) => {
    satirlar.push(b.baslik.toLocaleUpperCase('tr'));
    if (b.girisMetni) satirlar.push(b.girisMetni);
    (b.maddeler || []).forEach((x) => satirlar.push('• ' + x));
    if (b.sonMetni) satirlar.push(b.sonMetni);
    satirlar.push('');
  });
  satirlar.push(`Sürüm: ${m.surum}`);
  return satirlar.join('\n');
}
