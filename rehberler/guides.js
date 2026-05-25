// ══════════════════════════════════════════════════════════════
// ÇAKÜ Yönetim Sistemi - Modül Rehberleri (içerik)
// generate.js bu listeyi okur ve her modül için PDF üretir.
// kullanici-rehberi-modulu.jsx aynı listenin meta bilgilerini gösterir.
// ══════════════════════════════════════════════════════════════

const REHBERLER = [
  // ── Öğrenci modülleri ──
  {
    id: "benim",
    baslik: "Benim Sayfam",
    ozet: "Kişisel öğrenci ana sayfası: ders seçimi, dönem bilgileri, akademik özet.",
    roller: ["student"],
    kategori: "ogrenci",
    bolumler: [
      {
        baslik: "Bu modül ne işe yarar?",
        icerik: "Öğrenci için kişisel kontrol paneli. Aktif dönem dersleri, alınması gereken dersler, GANO/AGNO özetleri ve hızlı erişim kartları burada toplanır. Sisteme ilk girişte öğrenci yalnızca bu modülü görür; ders seçimini tamamlayana kadar diğer modüller kilitli kalır.",
      },
      {
        baslik: "Kimler kullanır?",
        icerik: "Sadece öğrenciler. Akademisyen, bölüm yetkilisi ve admin rolünde olanlar bu modülü göremez.",
      },
      {
        baslik: "Ana ekranlar",
        liste: [
          "Üst karşılama: ad, bölüm, sınıf ve dönem özeti.",
          "Aktif dönem dersleri: kayıtlı olduğunuz derslerin listesi.",
          "Akademik özet: GANO, AGNO, toplam kredi.",
          "Hızlı erişim: en sık kullandığınız modüllere (Staj, Formlar, Erasmus, Proje) kısayollar.",
        ],
      },
      {
        baslik: "Sık yapılan işlemler",
        liste: [
          "Ders seçimi: ilk girişte 'Ders Seçimini Tamamla' butonu çıkar; tıklayıp dönem derslerinizi onaylayın. Bu adım tamamlanana kadar diğer modüller açılmaz.",
          "Bilgilerinizi güncelleme: profil ikonundan iletişim ve bölüm bilgilerinizi düzenleyebilirsiniz.",
          "Bildirimleri okuma: sağ üstte zil ikonundan size gelen onay/red/duyurular görüntülenir.",
        ],
      },
      {
        baslik: "İpuçları",
        liste: [
          "Eğer modüllere giremiyorsanız ders seçimini tamamlamadığınız içindir; ana sayfadaki uyarıya tıklayın.",
          "Ders programınızı görmek için 'Ders Programı' modülüne geçin.",
        ],
      },
    ],
  },
  {
    id: "erasmus",
    baslik: "Erasmus Learning Agreement",
    ozet: "Erasmus giden öğrenciler için ders eşleştirme ve LA onay süreci.",
    roller: ["student", "professor", "admin"],
    kategori: "ogrenci",
    bolumler: [
      {
        baslik: "Bu modül ne işe yarar?",
        icerik: "Erasmus programıyla yurtdışına gidecek öğrencinin Learning Agreement (LA) sürecini yönetir. Öğrenci, gideceği üniversitedeki dersleri ÇAKÜ derslerine eşleştirir; danışman ve Erasmus komisyonu inceleyip onaylar.",
      },
      {
        baslik: "Kimler kullanır?",
        icerik: "Erasmus için seçilmiş öğrenciler, danışman akademisyenler, Erasmus komisyonu üyeleri ve admin.",
      },
      {
        baslik: "Ana ekranlar",
        liste: [
          "Outgoing (Giden) eşleştirme: yurtdışındaki dersi ÇAKÜ dersiyle eşleştirme ekranı.",
          "Return (Dönüş) eşleştirme: değişim sonrası alınan notların ÇAKÜ karşılığına aktarılması.",
          "Onay durumu: her LA'nın taslak / danışman onayı / komisyon onayı / reddedildi durumları.",
          "LA PDF çıktısı: imza için hazırlanmış belge.",
        ],
      },
      {
        baslik: "Sık yapılan işlemler",
        liste: [
          "Yeni LA oluştur: 'Yeni Eşleştirme' butonu → gideceğiniz dersi ve eşleneceği ÇAKÜ dersini seçin → kredi/AKTS kontrol edin → kaydedin.",
          "Onaya gönder: eşleştirmeniz tamamlandığında 'Onaya Gönder' tuşu ile danışmana iletilir.",
          "Red gelen LA'yı düzeltme: kırmızı uyarıyla işaretli kalemleri açıp düzenleme yapın, tekrar gönderin.",
          "Komisyon (akademisyen): bekleyen LA listesinden başvuruyu açın, satır satır 'Onayla' ya da 'Reddet' (sebebiyle birlikte).",
        ],
      },
      {
        baslik: "İpuçları",
        liste: [
          "AKTS toplamı genelde 30'a yakın olmalı; sapma varsa sistem uyarır.",
          "Aynı dersi birden fazla yabancı dersle eşleştirebilirsiniz (grup eşleştirme).",
          "Onaylanmış LA'lar kilitlenir; değişiklik için 'Yeni Sürüm' açmanız gerekir.",
        ],
      },
    ],
  },
  {
    id: "staj",
    baslik: "Staj",
    ozet: "Staj başvuru, defter teslimi, değerlendirme ve onay süreçleri.",
    roller: ["student", "professor", "admin"],
    kategori: "ogrenci",
    bolumler: [
      {
        baslik: "Bu modül ne işe yarar?",
        icerik: "Öğrencinin zorunlu/isteğe bağlı staj sürecini baştan sona yönetir: kurum başvurusu, sigorta formu, staj defteri yüklemesi, komisyon değerlendirmesi ve nihai onay.",
      },
      {
        baslik: "Kimler kullanır?",
        icerik: "Öğrenciler (kendi stajları), staj komisyonu akademisyenleri, bölüm yetkilisi, admin.",
      },
      {
        baslik: "Ana ekranlar",
        liste: [
          "Başvuru: kurum bilgisi, tarih aralığı, EK-1/EK-3 formları yüklenir.",
          "Defter ve raporlar: staj sırasında doldurulan günlük defter sayfaları ve raporlar yüklenir.",
          "Komisyon: bekleyen başvuruları akademisyenler inceler, kabul/red verir.",
          "Geçmiş stajlar: tamamlanmış staj kayıtları ve notları.",
        ],
      },
      {
        baslik: "Sık yapılan işlemler (öğrenci)",
        liste: [
          "Yeni staj başvurusu: 'Başvuru Oluştur' → kurum/tarih/zorunlu mu? → EK-1, EK-3 dosyalarını yükleyin.",
          "Defter yükleme: staj bitince 'Staj Defteri' bölümünden PDF/Word dosyanızı yükleyin.",
          "Değerlendirme: işyeri yetkilisi formu (EK-2) yükleyin.",
          "Durumu izleme: 'Bekliyor / Onaylandı / Reddedildi' rozetinden ilerlemeyi takip edin.",
        ],
      },
      {
        baslik: "Sık yapılan işlemler (komisyon)",
        liste: [
          "Bekleyen başvurular listesinden başvuruyu açın.",
          "Yüklenmiş tüm belgeleri sırasıyla inceleyin (önizleme açılır).",
          "'Kabul Et' veya 'Reddet (sebep yaz)' butonu ile karar verin.",
          "Toplu onay: birden fazla başvuruyu seçip tek tuşla onaylayabilirsiniz.",
        ],
      },
      {
        baslik: "İpuçları",
        liste: [
          "Form şablonlarını (EK-1, EK-2, EK-3) 'Formlar' modülünden indirebilirsiniz.",
          "Reddedilen başvurularda sebep açıkça yazılır; düzeltip yeniden gönderebilirsiniz.",
        ],
      },
    ],
  },
  {
    id: "muafiyet",
    baslik: "Ders Muafiyet",
    ozet: "Önceden alınan derslerin muafiyet başvurusu ve değerlendirme süreci.",
    roller: ["student", "professor", "admin"],
    kategori: "ogrenci",
    bolumler: [
      {
        baslik: "Bu modül ne işe yarar?",
        icerik: "Başka bir üniversite/bölümde alınmış derslerin ÇAKÜ'deki karşılığından muafiyet için başvuru ve değerlendirme sürecini yönetir.",
      },
      {
        baslik: "Kimler kullanır?",
        icerik: "Yatay/dikey geçişle gelen veya çift anadal/yandal yapan öğrenciler, muafiyet komisyonu akademisyenleri, admin.",
      },
      {
        baslik: "Ana ekranlar",
        liste: [
          "Başvuru formu: önceki ders adı, kredi/AKTS, alındığı kurum.",
          "Eşleştirme: önceki ders → ÇAKÜ dersi karşılığı.",
          "Belge yükleme: transkript, ders içeriği.",
          "Komisyon değerlendirme paneli.",
        ],
      },
      {
        baslik: "Sık yapılan işlemler",
        liste: [
          "Yeni başvuru: önceki üniversitedeki dersi ekleyin → ÇAKÜ karşılığını seçin → transkript yükleyin → onaya gönderin.",
          "Komisyon: bekleyen muafiyet talebini açın, ders içeriklerini karşılaştırın, kabul/red verin.",
          "Sonucu görüntüleme: kabul edilen muafiyetler transkripte 'M' (muaf) notuyla yansıtılır.",
        ],
      },
      {
        baslik: "İpuçları",
        liste: [
          "Eşdeğerlik için ders içeriğinin en az %70 örtüşmesi beklenir.",
          "Transkriptiniz onaylı PDF olmalı (mühürlü/elektronik imzalı).",
        ],
      },
    ],
  },
  {
    id: "sinav",
    baslik: "Sınav Otomasyonu",
    ozet: "Sınav takvimi, sınıf dağıtımı, gözetmen atama ve sınav sonuç girişi.",
    roller: ["professor", "admin"],
    kategori: "akademisyen",
    bolumler: [
      {
        baslik: "Bu modül ne işe yarar?",
        icerik: "Vize, final, bütünleme dönemlerinde sınav planlamasını otomatikleştirir: derslere göre tarih, salon, kapasite ve gözetmen atamaları; çakışma kontrolü; sınav sonucu girişi.",
      },
      {
        baslik: "Kimler kullanır?",
        icerik: "Sınavı olan akademisyenler, sınav koordinatörü/komisyonu, bölüm yetkilisi, admin.",
      },
      {
        baslik: "Ana ekranlar",
        liste: [
          "Sınav dönemi: aktif dönem (vize/final/büt) ve tarih aralığı tanımı.",
          "Takvim: günlere göre planlanmış sınavlar.",
          "Salon yönetimi: salonlar, kapasiteleri ve müsait saatler.",
          "Gözetmen havuzu: akademisyenler ve atama saatleri.",
          "Sonuç girişi: akademisyen sınavın notlarını girer/yükler.",
        ],
      },
      {
        baslik: "Sık yapılan işlemler",
        liste: [
          "Sınav ekle: 'Yeni Sınav' → ders → tarih/saat → salon seçimi. Sistem çakışma uyarısı verir.",
          "Otomatik dağıtım: 'Otomatik Planla' butonu derslerin tamamını boş salonlara optimum dağıtır.",
          "Gözetmen atama: tek tıkla veya manuel sürükle-bırak.",
          "Sonuç girişi: sınav satırına tıklayın, Excel'den yapıştırarak veya tek tek not girin, 'Kaydet'.",
          "İlan: 'Yayınla' tuşu ile sınav planı/sonucu öğrencilere açılır.",
        ],
      },
      {
        baslik: "İpuçları",
        liste: [
          "Otomatik dağıtım sonrası mutlaka manuel kontrol yapın (özel durumlar).",
          "Sınav sonucu girildikten sonra düzenleme audit log'a kaydedilir.",
        ],
      },
    ],
  },
  {
    id: "dersprogrami",
    baslik: "Ders Programı",
    ozet: "Haftalık ders programı görüntüleme, çakışma kontrolü, dönem değişiklikleri.",
    roller: ["student", "professor", "admin"],
    kategori: "ortak",
    bolumler: [
      {
        baslik: "Bu modül ne işe yarar?",
        icerik: "Bölümün aktif dönem ders programını haftalık tablo olarak gösterir. Öğrenci kendi derslerini, akademisyen verdiği dersleri, bölüm yetkilisi ise tüm programı görür ve düzenleyebilir.",
      },
      {
        baslik: "Kimler kullanır?",
        icerik: "Öğrenciler (kendi programı), akademisyenler (verdikleri dersler), bölüm yetkilisi, admin.",
      },
      {
        baslik: "Ana ekranlar",
        liste: [
          "Haftalık tablo: gün × saat ızgarası.",
          "Filtreler: sınıf, akademisyen, sınıf seviyesi (1, 2, 3, 4).",
          "Düzenleme modu (yetkili): tıkla-sürükle ile ders saatleri değiştirilebilir.",
          "Dışa aktarma: PDF/Excel çıktısı.",
        ],
      },
      {
        baslik: "Sık yapılan işlemler",
        liste: [
          "Programı görüntüleme: sınıf seviyesine veya kendi derslerinize filtreleyin.",
          "Çakışma kontrolü: yetkili kullanıcıda kırmızı işaretli hücreler çakışmayı gösterir.",
          "Ders ekle/sil: yönetici modu açıkken boş hücreye tıklayın → ders bilgisi girin.",
          "Yayınla: 'Programı Yayınla' ile öğrenci ve akademisyenlere kesinleşmiş program açılır.",
        ],
      },
      {
        baslik: "İpuçları",
        liste: [
          "Programınızı PDF olarak indirip telefonunuza kaydedebilirsiniz.",
          "Yetkili kullanıcılarda 'Geri Al' butonu son değişikliği iptal eder.",
        ],
      },
    ],
  },
  {
    id: "projeler",
    baslik: "Proje",
    ozet: "Bitirme projesi, dönem projesi ve proje danışmanlık süreci.",
    roller: ["student", "professor", "admin"],
    kategori: "ogrenci",
    bolumler: [
      {
        baslik: "Bu modül ne işe yarar?",
        icerik: "Bitirme projesi ve dönem projeleri için başvuru, danışman seçimi, ara/final rapor yükleme, jüri değerlendirmesi süreçlerini yönetir.",
      },
      {
        baslik: "Kimler kullanır?",
        icerik: "Bitirme/dönem projesi alan öğrenciler, proje danışmanı akademisyenler, jüri üyeleri, bölüm yetkilisi.",
      },
      {
        baslik: "Ana ekranlar",
        liste: [
          "Proje başvurusu: konu, kısa özet, tercih edilen danışman.",
          "Danışmanlık: akademisyenin kendisine gelen önerileri kabul/red ettiği panel.",
          "Rapor yükleme: ara rapor, final rapor, sunum dosyaları.",
          "Jüri değerlendirmesi: puanlama ve sözlü/yazılı not girişi.",
        ],
      },
      {
        baslik: "Sık yapılan işlemler",
        liste: [
          "Yeni proje başvurusu (öğrenci): 'Proje Başlat' → başlık ve özet yazın → danışman tercih edin → gönderin.",
          "Danışman cevabı (akademisyen): gelen önerilerden 'Kabul' veya 'Reddet (sebep)'.",
          "Rapor yükle: dönem ortasında ara rapor, dönem sonunda final ve sunum dosyalarını yükleyin.",
          "Jüri puanlaması: jüri üyesi 0-100 puan ve yorum girer; sistem ortalamayı hesaplar.",
        ],
      },
      {
        baslik: "İpuçları",
        liste: [
          "Danışman kontenjanları sınırlıdır; birden fazla tercih yazmak şansınızı artırır.",
          "Final raporu hem PDF hem kaynak kodla (.zip) yüklemeniz beklenir.",
        ],
      },
    ],
  },
  {
    id: "formlar",
    baslik: "Formlar",
    ozet: "Öğrenci işleri, bölüm ve üniversite formlarının indirme arşivi.",
    roller: ["student", "professor", "admin"],
    kategori: "ortak",
    bolumler: [
      {
        baslik: "Bu modül ne işe yarar?",
        icerik: "Sık kullanılan dilekçe ve form şablonlarını (staj formları, mezuniyet dilekçesi, kayıt sildirme, askerlik yazısı vb.) merkezi olarak indirilebilir hale getirir.",
      },
      {
        baslik: "Kimler kullanır?",
        icerik: "Tüm kullanıcılar (öğrenci, akademisyen, yetkili) formları indirebilir. Yalnızca admin/bölüm yetkilisi yeni form ekleyebilir veya değiştirebilir.",
      },
      {
        baslik: "Ana ekranlar",
        liste: [
          "Kategori sekmeleri: Öğrenci İşleri, Bölüm, Üniversite.",
          "Form kartları: başlık, açıklama, dosya tipi/boyutu, 'İndir' butonu.",
          "Arama kutusu: ad veya açıklama içinde anlık filtre.",
          "Admin ekstra: 'Yeni Form Ekle' ve her kartta 'Dosyayı Değiştir' butonu.",
        ],
      },
      {
        baslik: "Sık yapılan işlemler",
        liste: [
          "Form indirme: kart üzerindeki 'İndir' butonuna tıklayın.",
          "Arama: üst kutuya form adı yazın, sonuçlar anlık filtrelenir.",
          "Yeni form ekleme (admin): 'Yeni Form' → başlık, açıklama, kategori ve dosya seçin.",
          "Dosyayı değiştirme (admin): kart üzerinde 'Dosyayı Değiştir' → yeni dosya seçin (başlık/açıklama korunur).",
        ],
      },
      {
        baslik: "İpuçları",
        liste: [
          "Bir formun yanında sarı 'Güncellenmeyi bekliyor' rozeti varsa o dosya geçici olarak erişilemez; yöneticiye bildirin.",
          "Öğrenci İşleri formları tüm bölümlerde ortaktır; Bölüm/Üniversite formları sadece ilgili bölümde görünür.",
        ],
      },
    ],
  },
  {
    id: "akademisyen",
    baslik: "Akademisyenler",
    ozet: "Bölüm akademisyenlerinin profilleri, ders yükleri, iletişim bilgileri.",
    roller: ["professor", "admin"],
    kategori: "akademisyen",
    bolumler: [
      {
        baslik: "Bu modül ne işe yarar?",
        icerik: "Bölümdeki tüm akademisyenlerin profilini, unvan, oda, dahili, e-posta ve verdikleri dersleri tek ekranda gösterir. Aynı zamanda bölüm içi akademik kadronun web sitesinde gösterilecek formatı için kaynaktır.",
      },
      {
        baslik: "Kimler kullanır?",
        icerik: "Bölüm akademisyenleri (kendi profilini düzenler), bölüm yetkilisi (tüm profili düzenler), admin.",
      },
      {
        baslik: "Ana ekranlar",
        liste: [
          "Akademisyen kartları: foto, unvan/ad, e-posta, oda, dahili.",
          "Detay sayfası: özgeçmiş, dersler, projeler, yayınlar.",
          "Filtre: unvan (Prof., Doç., Dr.), arama.",
          "Düzenleme paneli (yetkili).",
        ],
      },
      {
        baslik: "Sık yapılan işlemler",
        liste: [
          "Kendi profilini güncelle (akademisyen): kartınızdaki kalem ikonuna tıklayın → bilgilerinizi düzenleyin.",
          "Fotoğraf yükle: profilde 'Resim Yükle' → kare formatta dosya seçin.",
          "Akademisyen ekle (yetkili): 'Yeni Akademisyen' → temel bilgiler.",
          "İletişim listesi dışa aktar: bölüm yetkilisi listeyi Excel/CSV olarak indirebilir.",
        ],
      },
      {
        baslik: "İpuçları",
        liste: [
          "E-posta adresini açıkça yazmak, öğrencilerin doğrudan iletişim kurmasını kolaylaştırır.",
          "Verdiğiniz dersler 'Ders Yönetimi'ndeki kayıttan otomatik çekilir.",
        ],
      },
    ],
  },
  {
    id: "performans",
    baslik: "Performans Modülü",
    ozet: "Akademisyen performans göstergeleri: yayın, proje, ders yükü, mezun öğrenci sayıları.",
    roller: ["professor", "admin"],
    kategori: "akademisyen",
    bolumler: [
      {
        baslik: "Bu modül ne işe yarar?",
        icerik: "Akademisyenlerin yıllık performans özetini (yayınlar, atıflar, projeler, ders yükü, danışmanlıklar) görselleştirir; bölüm yetkilisi karşılaştırmalı analiz yapabilir.",
      },
      {
        baslik: "Kimler kullanır?",
        icerik: "Akademisyenler (kendi metriklerini), bölüm yetkilisi (tüm akademisyenleri), admin.",
      },
      {
        baslik: "Ana ekranlar",
        liste: [
          "Bireysel pano: yayın sayısı, atıf, ders sayısı, danışmanlık.",
          "Karşılaştırma: bölüm genelinde sıralama (yetkili).",
          "Yıllık trend grafikleri.",
          "Dışa aktarma: PDF/Excel rapor.",
        ],
      },
      {
        baslik: "Sık yapılan işlemler",
        liste: [
          "Yıl seçimi: pano üstündeki yıl filtresinden istediğiniz dönemi seçin.",
          "Yeni yayın/proje ekleme: 'Veri Ekle' → tür seçin (makale, proje, tez vb.) → bilgileri girin.",
          "Rapor üret: 'PDF Çıktısı' ile yıllık performans dosyanızı indirin.",
        ],
      },
      {
        baslik: "İpuçları",
        liste: [
          "Veri eksikse 'Performans/Atama' başvurularında geç kalabilirsiniz; yıl sonu öncesi güncelleyin.",
          "Bölüm yetkilisi karşılaştırma görünümünde anonim modu açabilir.",
        ],
      },
    ],
  },

  // ── Ortak modüller ──
  {
    id: "portal",
    baslik: "Öğrenci Portalı",
    ozet: "Duyuru, tartışma, etkinlik akışı ve sosyal etkileşim platformu.",
    roller: ["student", "professor", "admin"],
    kategori: "ortak",
    bolumler: [
      {
        baslik: "Bu modül ne işe yarar?",
        icerik: "Bölüm/fakülte içi duyuruların, tartışmaların, etkinliklerin paylaşıldığı sosyal akış. Beğeni, yorum, mention (@kullanıcı), reaksiyon, takip ve liderlik tablosu özelliklerini içerir.",
      },
      {
        baslik: "Kimler kullanır?",
        icerik: "Tüm kullanıcılar yazabilir/yorum yapabilir. Moderatör ve admin uygunsuz içerikleri silebilir.",
      },
      {
        baslik: "Ana ekranlar",
        liste: [
          "Akış: en yeni → en eski gönderiler, kategoriye göre filtre.",
          "Gönderi detayı: yorumlar, beğeniler, reaksiyonlar.",
          "Profil: kullanıcı kendi seviyesini, rozetlerini, gönderilerini görür.",
          "Liderlik tablosu: en aktif kullanıcılar, en çok beğenilen gönderiler.",
        ],
      },
      {
        baslik: "Sık yapılan işlemler",
        liste: [
          "Gönderi paylaş: '+' butonu → metin yaz, görsel ekle, kategori seç, paylaş.",
          "Yorum/mention: gönderi altında yorum yaz; @ ile başlayıp kullanıcı arayın.",
          "Reaksiyon: gönderi/yorum üzerindeki emoji ikonuna tıklayın.",
          "Takip: kullanıcı kartında 'Takip Et' tuşu; gönderileri ana akışınızda öncelikli görünür.",
          "Bildirim: birisi sizden bahsederse zil ikonunda bildirim çıkar.",
        ],
      },
      {
        baslik: "İpuçları",
        liste: [
          "Beğeni/yorum aldıkça seviye atlayıp rozet kazanırsınız.",
          "Spam/uygunsuz içerik için gönderiye sağ tıklayıp 'Bildir'i kullanın.",
        ],
      },
    ],
  },
  {
    id: "roadmaps",
    baslik: "Yol Haritaları",
    ozet: "Bölüm bazlı kariyer/öğrenim yol haritaları (örn. yazılım geliştirici, akademisyen).",
    roller: ["student", "professor", "admin"],
    kategori: "ortak",
    bolumler: [
      {
        baslik: "Bu modül ne işe yarar?",
        icerik: "Belirli bir kariyer hedefine (frontend, backend, ML mühendisi, akademisyen vb.) ulaşmak için adım adım izlenecek konuları görsel bir ağaç olarak sunar. Her düğüm: kaynaklar, sertifikalar, projeler.",
      },
      {
        baslik: "Kimler kullanır?",
        icerik: "Öğrenciler (kişisel ilerleme), akademisyenler (yönlendirme), admin (içerik yönetimi).",
      },
      {
        baslik: "Ana ekranlar",
        liste: [
          "Yol haritası galerisi: kategoriye göre kartlar.",
          "Yol haritası detayı: zorunlu/seçimlik adımlar, ilerleme yüzdesi.",
          "Adım detayı: önerilen kaynaklar, projeler, süresi.",
        ],
      },
      {
        baslik: "Sık yapılan işlemler",
        liste: [
          "Yol haritası başlat: kart üzerinde 'Bu Yola Gir' → ilerlemeniz kaydedilir.",
          "Adımı tamamla: konu detayında 'Tamamlandı' işaretleyin → genel yüzdeniz artar.",
          "Yeni yol haritası ekle (admin): JSON şablonu veya görsel editörle.",
        ],
      },
      {
        baslik: "İpuçları",
        liste: [
          "Birden fazla yol haritasını paralel takip edebilirsiniz.",
          "Tamamladığınız adımlar 'Benim Sayfam' altındaki başarı rozetlerine yansır.",
        ],
      },
    ],
  },

  // ── Admin modülleri ──
  {
    id: "kullanici",
    baslik: "Kullanıcı Yönetimi",
    ozet: "Tüm kullanıcıların oluşturulması, rol/bölüm atanması, parola sıfırlama.",
    roller: ["admin"],
    kategori: "admin",
    bolumler: [
      {
        baslik: "Bu modül ne işe yarar?",
        icerik: "Sistemdeki tüm kullanıcıları (öğrenci, akademisyen, bölüm yetkilisi, admin) listeler; yeni kullanıcı oluşturma, rol değiştirme, bölüm atama, parola sıfırlama, hesap dondurma işlemleri burada yapılır.",
      },
      {
        baslik: "Kimler kullanır?",
        icerik: "Yalnızca admin rolündeki kullanıcılar görür ve düzenler.",
      },
      {
        baslik: "Ana ekranlar",
        liste: [
          "Kullanıcı listesi: ad, e-posta, rol, bölüm, son giriş.",
          "Filtreler: rol, bölüm, aktif/pasif.",
          "Detay paneli: profil bilgileri ve eylemler.",
          "Toplu içe aktarma: Excel/CSV ile.",
        ],
      },
      {
        baslik: "Sık yapılan işlemler",
        liste: [
          "Yeni kullanıcı: 'Ekle' → ad, e-posta, rol, bölüm. Sistem geçici parola e-postalar.",
          "Rol değişikliği: kullanıcıya tıklayın → 'Rol' alanını değiştirin → kaydedin.",
          "Parola sıfırlama: kullanıcıya tıklayın → 'Parolayı Sıfırla'.",
          "Toplu import: Excel şablonu indirin, doldurup yükleyin.",
          "Hesap dondurma: 'Pasifleştir' (kayıt silinmez, giriş engellenir).",
        ],
      },
      {
        baslik: "İpuçları",
        liste: [
          "Rol değişiklikleri Audit Log'a kaydedilir.",
          "Bir kullanıcıyı kalıcı silmek yerine pasifleştirin (veri bütünlüğü için).",
        ],
      },
    ],
  },
  {
    id: "bolumyonetimi",
    baslik: "Bölüm Yönetimi",
    ozet: "Bölümler, bölüm yetkilileri, sınıf/program yapısı ayarları.",
    roller: ["admin"],
    kategori: "admin",
    bolumler: [
      {
        baslik: "Bu modül ne işe yarar?",
        icerik: "Üniversite/fakülte altındaki bölümlerin tanımı, bölüm yetkilisi ataması, sınıf yapısı, danışman atamaları gibi yapısal ayarları yönetir.",
      },
      {
        baslik: "Kimler kullanır?",
        icerik: "Sadece admin.",
      },
      {
        baslik: "Ana ekranlar",
        liste: [
          "Bölüm listesi.",
          "Bölüm detayı: kod, ad, kısaltma, renk, ikon.",
          "Yetkili atamaları.",
          "Sınıf yapısı (1, 2, 3, 4. sınıf, yan dal vb.).",
        ],
      },
      {
        baslik: "Sık yapılan işlemler",
        liste: [
          "Yeni bölüm ekleme: 'Bölüm Ekle' → kod, ad, renk seçimi.",
          "Bölüm yetkilisi atama: bölüm detayı → 'Yetkili Ekle' → kullanıcı seçin.",
          "Danışman atama: sınıf bazında akademisyenleri danışman olarak işaretleyin.",
        ],
      },
      {
        baslik: "İpuçları",
        liste: [
          "Bölüm renk/ikonu app-shell sol menüde aktif bölüm rozetinde kullanılır.",
          "Bölüm silmek yerine 'Pasif' yapın; tarihsel veriler korunur.",
        ],
      },
    ],
  },
  {
    id: "dersyonetimi",
    baslik: "Ders Yönetimi",
    ozet: "Bölüm ders katalogları, kredi/AKTS, dönem tanımları.",
    roller: ["admin"],
    kategori: "admin",
    bolumler: [
      {
        baslik: "Bu modül ne işe yarar?",
        icerik: "Bölümün ders kataloğunu yönetir: ders kodları, adları, kredileri, AKTS değerleri, hangi dönem/yılda alındığı, ön koşullar.",
      },
      {
        baslik: "Kimler kullanır?",
        icerik: "Admin (tüm bölümler), bölüm yetkilisi (kendi bölümü).",
      },
      {
        baslik: "Ana ekranlar",
        liste: [
          "Ders listesi: kod, ad, kredi/AKTS, dönem, yıl.",
          "Detay: ön koşullar, açıklama, akademisyen.",
          "Toplu işlemler: Excel'den içe/dışa aktarma.",
        ],
      },
      {
        baslik: "Sık yapılan işlemler",
        liste: [
          "Yeni ders ekleme: 'Ders Ekle' → kod, ad, kredi, AKTS, dönem.",
          "Ön koşul tanımlama: ders detayı → 'Ön Koşullar' bölümünden ekleyin.",
          "Toplu güncelleme: Excel şablonu ile katalogu toptan güncelleyin.",
        ],
      },
      {
        baslik: "İpuçları",
        liste: [
          "Aktif öğrencisi olan dersi silmeyin; 'Pasif' işaretleyip yeni dönemde kullanılmamasını sağlayın.",
          "Ders kodu standardı: ZORUNLU-XXX, SECMELI-XXX gibi tutmak filtrelemeyi kolaylaştırır.",
        ],
      },
    ],
  },
  {
    id: "komisyonlar",
    baslik: "Komisyonlar",
    ozet: "Bölüm komisyonları (staj, erasmus, sınav, müfredat) ve üye yönetimi.",
    roller: ["admin"],
    kategori: "admin",
    bolumler: [
      {
        baslik: "Bu modül ne işe yarar?",
        icerik: "Bölüm içi komisyonları (Staj, Erasmus, Sınav, Müfredat, Bitirme Projesi vb.) tanımlar; üye akademisyenleri atar. Komisyon üyeliği akademisyene ilgili modüllere otomatik yetki verir.",
      },
      {
        baslik: "Kimler kullanır?",
        icerik: "Sadece admin.",
      },
      {
        baslik: "Ana ekranlar",
        liste: [
          "Komisyon listesi.",
          "Komisyon detayı: ad, sorumlu modül, üyeler.",
          "Üye ekleme/çıkarma.",
        ],
      },
      {
        baslik: "Sık yapılan işlemler",
        liste: [
          "Yeni komisyon: 'Komisyon Ekle' → ad → bağlı modül (örn. 'staj').",
          "Üye atama: komisyona tıklayın → 'Üye Ekle' → akademisyen seçin.",
          "Üye çıkarma: üye satırında 'X' butonu.",
        ],
      },
      {
        baslik: "İpuçları",
        liste: [
          "Erasmus komisyonu üyesi olan akademisyenler Erasmus modülünü otomatik görür.",
          "Staj komisyonu üyeliği staj başvurularını onaylama yetkisi verir.",
        ],
      },
    ],
  },
  {
    id: "audit",
    baslik: "Audit Log",
    ozet: "Sistemdeki kritik işlemlerin (silme, rol değişikliği, onay) zaman damgalı kaydı.",
    roller: ["admin"],
    kategori: "admin",
    bolumler: [
      {
        baslik: "Bu modül ne işe yarar?",
        icerik: "Sistemde yapılan kritik işlemlerin (kullanıcı silme, rol değiştirme, sınav sonucu düzenleme, LA onaylama, staj kabul/red vb.) kim tarafından, ne zaman, hangi kaynak üzerinden yapıldığını tutar.",
      },
      {
        baslik: "Kimler kullanır?",
        icerik: "Sadece admin görüntüleyebilir; kayıtları silemez (sadece okunabilir).",
      },
      {
        baslik: "Ana ekranlar",
        liste: [
          "Zaman çizelgesi: son işlemler önce.",
          "Filtreler: kullanıcı, modül, eylem tipi (create/update/delete), tarih aralığı.",
          "Detay: işlemin önceki/sonraki hâli (varsa diff).",
        ],
      },
      {
        baslik: "Sık yapılan işlemler",
        liste: [
          "Tarihsel arama: 'Tarih' filtresi ile belirli bir aralığı tarayın.",
          "Kullanıcı izleme: 'Kullanıcı' filtresinden bir hesabın yaptığı tüm eylemleri görün.",
          "Dışa aktarma: CSV indirme ile harici denetim için kayıt çıkarın.",
        ],
      },
      {
        baslik: "İpuçları",
        liste: [
          "Audit Log salt-okunurdur; silinemez.",
          "Bir kullanıcı 'eylemim ben yapmadım' diyorsa öncelikle IP ve oturum bilgisini kontrol edin.",
        ],
      },
    ],
  },

  // ── Yeni modül ──
  {
    id: "rehber",
    baslik: "Kullanıcı Rehberi",
    ozet: "Tüm modüllerin nasıl kullanılacağına dair PDF rehberleri.",
    roller: ["student", "professor", "admin"],
    kategori: "ortak",
    bolumler: [
      {
        baslik: "Bu modül ne işe yarar?",
        icerik: "Sistemdeki her modülün ne işe yaradığını ve nasıl kullanılacağını anlatan PDF rehberlerinin merkezi arşividir. Rolünüze göre size hitap eden rehberler listelenir.",
      },
      {
        baslik: "Kimler kullanır?",
        icerik: "Tüm kullanıcılar. Listelenen rehberler kullanıcının rolüne göre filtrelenir.",
      },
      {
        baslik: "Ana ekranlar",
        liste: [
          "Rehber kartları: her modül için bir kart (başlık, kısa özet, hedef rol).",
          "Önizleme: kart üzerinde 'Önizle' tuşu → tarayıcı içinde PDF açılır.",
          "İndir: PDF'i bilgisayarınıza kaydedin.",
          "Kategori sekmeleri: Öğrenci, Akademisyen, Admin, Ortak.",
        ],
      },
      {
        baslik: "Sık yapılan işlemler",
        liste: [
          "Rehber okuma: ilgili karta tıklayın → tam ekran önizleme açılır.",
          "İndirme: kart altındaki 'İndir' butonu PDF'i kaydeder.",
          "Arama: üst kutuya modül adı yazın, sonuçlar anlık filtrelenir.",
        ],
      },
      {
        baslik: "İpuçları",
        liste: [
          "Rehberler güncellendikçe sürüm tarihi PDF başlığında görünür.",
          "Yazdırmak isterseniz PDF'in sağ üst köşesindeki yazdır ikonunu kullanın.",
        ],
      },
    ],
  },
];

module.exports = REHBERLER;
