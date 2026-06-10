/**
 * Tek seferlik migration: 130 öğrenci kulübünü `student_clubs` koleksiyonuna ekler.
 * Idempotent — aynı `name` ile kayıt varsa atlar, yoksa ekler.
 *
 * Kullanım:
 *   node server/migrate-clubs.js [SERVER_URL]
 *   varsayılan: http://localhost:3001
 */
const http = require('http');
const https = require('https');

const BASE = process.argv[2] || 'http://localhost:3001';
const isHttps = BASE.startsWith('https');
const transport = isHttps ? https : http;

function request(url, options = {}) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const reqOpts = {
      method: options.method || 'GET',
      hostname: u.hostname,
      port: u.port || (isHttps ? 443 : 80),
      path: u.pathname + u.search,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
    };
    const req = transport.request(reqOpts, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch {
          resolve(data);
        }
      });
    });
    req.on('error', reject);
    if (options.body) req.write(options.body);
    req.end();
  });
}

// Veri: her kayıt [topluluk adı, akademik danışman, başkan, bölüm]
const CLUBS = [
  [
    'Ada Gezi Durağı Topluluğu',
    'Dr. Öğrt. Üyesi Emine ULUĞ',
    'Umutcan ADA',
    'Bankacılık ve Sigortacılık',
  ],
  [
    'Afet ve Acil Durum Yönetimi Yangın Güvenliği ve Söndürme Topluluğu',
    'Öğrt. Gör. Murat ERCAN',
    'Ahmet ÇEVİK',
    'Sivil Savunma ve İtfaiyecilik',
  ],
  [
    'Afetlere İnsani Yardım Topluluğu',
    'Öğrt. Gör. Murat ERCAN',
    'Maruf ÇAKIRGÖZ',
    'Sivil Savunma ve İtfaiyecilik',
  ],
  [
    'Akademik Düşünce Eğitim Medeniyet Topluluğu',
    'Arş. Gör Salih YILDIZ',
    'Mehmet Fevzi ULUSOY',
    'İşletme',
  ],
  [
    'Anadolu Yakutu Tuz Topluluğu',
    'Dr. Öğrt. Gör. Sevinç BAKAN',
    'Ceren BOZDAĞ',
    'Beslenme ve Diyetetik',
  ],
  [
    'Arama Kurtarma ve İlk Yardım Topluluğu',
    'Öğrt. Gör. Sedat BARUTÇU',
    'Eser Berk SEVİNÇ',
    'Sivil Savunma ve İtfaiyecilik',
  ],
  [
    'Ar-ge ve İnovasyon Çalışmaları Topluluğu',
    'Dr. Öğrt. Üyesi Zehra Gülten YALÇIN',
    'Sıla ÇERKEZ',
    'Kimya Mühendisliği',
  ],
  ['Astronomi Topluluğu', 'Arş. Gör. Dr. Gülsüm DEVECİ', 'Zeynep GÜL', 'Beslenme ve Diyetetik'],
  [
    'Atatürkçü Düşünce Topluluğu',
    'Dr. İsa YILDIRIM',
    'Mert Ramazan SERAY',
    'Fizyoterapi ve Rehabilitasyon',
  ],
  ['Bağımsız Genç Adımlar Topluluğu', 'Öğrt. Gör. İsmail ÖZCAN', 'Gülsena BALCI', 'Çocuk Gelişimi'],
  [
    'Beslenme ve Diyetetik Topluluğu',
    'Arş. Gör. Şeymanur ERCAN',
    'Tuana AKDOĞAN',
    'Beslenme ve Diyetetik',
  ],
  [
    'Beyaz Önlüklü Sağlık Elçileri Topluluğu',
    'Dr. Öğr. Üyesi Gözde EDE İLERİ',
    'Azize SORKİM',
    'Beslenme ve Diyetetik',
  ],
  ['Biyoloji Topluluğu', 'Prof. Dr. Tamer KEÇELİ', 'Naciye Aslı ÇINAR', 'Biyoloji'],
  ['Bozkır Teknoloji Topluluğu', 'Doç. Dr. Emine ÇELİKSOY', 'Metehan PINARBAŞI', 'Hukuk'],
  ['Cansağlığı Topluluğu', 'Dr. Öğrt. Üyesi Tahsin Barış DEĞER', 'Nurşan GÜNEK', 'Ergoterapi'],
  ['Coğrafya Topluluğu', 'Doç. Dr. Nazan KARAKAŞ ÖZÜR', 'Sıla SARIÇİMEN', 'Coğrafya'],
  [
    'Çankırı Yaran Kültürü Topluluğu',
    'Öğrt. Gör. Murat KORKMAZ',
    'Ziya Burak BOZTEPE',
    'Muhasebe ve Vergi Uygulamaları',
  ],
  ['Çocuk Gelişimi Topluluğu', 'Doç. Dr. Nazan KAYTEZ', 'Zeliha Nur KUTUCUOĞLU', 'Çocuk Gelişimi'],
  [
    'Deniz, Kutup ve İklim Hukuk Araştırmaları Topluluğu',
    'Arş. Gör. Ümit Melih METİNTAŞ',
    'Sıla ÖZEN',
    'Hukuk',
  ],
  [
    'Doğa ve Kampçılık Topluluğu',
    'Doç. Dr. Meriç ÇAKIR',
    'Sefa HACIKERİMOĞLU',
    'Orman Mühendisliği',
  ],
  [
    'Eğitim ve Topluma Hizmet Topluluğu',
    'Dr. Öğrt. Üyesi Sümeyya TATLI HARMANCI',
    'Elif Nisa KARAASLAN',
    'Çocuk Gelişimi',
  ],
  ['Eko Denge Topluluğu', 'Doç Dr. Okan ÜRKER', 'İbrahim KARAPOLAT', 'Tıbbi Laboratuvar ŞABANÖZÜ'],
  ['Eko-Art-Geri Dönüşüm Topluluğu', 'Doç. Dilek ÖCALAN', 'Erhan YILDIRIM', 'Resim'],
  ['Ekoloji Topluluğu', 'Dr. Arş. Gör. Ali EGİ', 'Seda Nur ÖZTÜRK', 'Sosyoloji'],
  ['Ekonomi ve Kariyer Topluluğu', 'Dr. Öğrt. Üyesi Mehmet Ali DEMİR', 'Emirhan DEMİR', 'İktisat'],
  ['Ergoterapi Topluluğu', 'Dr. Öğrt. Gör. Ayşenur KARAKUŞ', 'Zeynep Nida YİĞİT', 'Ergoterapi'],
  ['Etik Hukuk Topluluğu', 'Arş. Gör. Vasıf İnanç DUYGULU', 'Abdulbaki AY', 'Hukuk'],
  [
    'Evde Hasta ve Yaşlı BAKIM topluluğu',
    'Öğrt. Gör. Mesut ULUDAĞ',
    'Fatmanur YILDIZ',
    'Evde Hasta Bakım ÇERKEŞ',
  ],
  ['Felsefe Topluluğu', 'Arş. Gör. Dr. Sinem ÖNDEŞ', 'Sezai GÜVEN', 'Felsefe'],
  [
    'Finansal Yatırım ve Araştırma Topluluğu',
    'Dr. Öğrt. Üyesi Yusuf GÖR',
    'Gizem ÖZTÜRKMEN',
    'Finans ve Bankacılık',
  ],
  ['Fizik ve İnovasyon Topluluğu', 'Prof. Dr. Olcay GENÇYILMAZ', 'Tuğba BADEM', 'Fizik'],
  [
    'Fiziksel Aktivite ve Egzersiz Topluluğu',
    'Öğrt. Gör. Dr. Kutay KAŞLI',
    'Günser CEYLAN',
    'Evde Hasta Bakım ÇERKEŞ',
  ],
  [
    'Fizyoterapi ve Rehabilitasyon Topluluğu',
    'Öğr. Gör. Furkan ÖZDEMİR',
    'Merve SARI',
    'Fizyoterapi ve Rehabilitasyon',
  ],
  ['Genç Düşünürler Platformu Topluluğu', 'Dr. Nazım ÇETİN', 'Kader KARAKOYUN', 'İslami İlimler'],
  ['Genç İnfak Topluluğu', 'Dr. Öğrt. Üyesi Hatice POLAT', 'Emine ERTAŞ', 'Hukuk'],
  [
    'Genç Kızılay Topluluğu',
    'Dr. Öğrt. Üyesi Hakkı KALAYCI',
    'Hayrunnisa KIRTEKE',
    'Çocuk Gelişimi',
  ],
  [
    'Genç Turizmciler Topluluğu',
    'Doç. Dr. Ayhan DAĞDEVİREN',
    'Ramazan SAĞLAM',
    'Turizm İşletmeciliği',
  ],
  [
    'Genç Yeryüzü Doktorları Topluluğu',
    'Prof. Dr. Özcan ÖZKAN',
    'Fatma Bengisu GENÇ',
    'Diş Hekimliği',
  ],
  ['Genç Yeşilay Topluluğu', 'Dr. Öğrt. Üyesi Hilal ALTUNDAL DURU', 'Kardelen AYDOĞAN', 'Ebelik'],
  [
    'Girişimcilik Topluluğu',
    'Arş. Gör. Dr. Derya ÖZARSLAN',
    'Sevgi BULUT',
    'Çalışma Ekonomisi ve Endüstri İlişkiler',
  ],
  [
    'Glütensiz Yaşam Topluluğu',
    'Arş. Gör. Gülsüm DEVECİ',
    'Makbule ŞENER',
    'Beslenme ve Diyetetik',
  ],
  [
    'Google Geliştirici Öğrenci Topluluğu',
    'Prof. Dr. Selim BUYRUKOĞLU',
    'Gökçe Nur COŞGUN',
    'İstatistik',
  ],
  ['Grafik Tasarım Topluluğu', 'Doç. Dr. Uğur DEMİRBAĞ', 'Hatice Esra BULUT', 'Grafik Tasarım'],
  ['Güsart Topluluğu', 'Doç. Dr. Esra Ertuğrul TOMSUK', 'Emrecan DEMİR', 'Müzik Teknolojisi'],
  ['Hak Topluluğu', 'Arş. Gör. Barış Can ÖZTÜRK', 'Hatice Tuana YILMAZ', 'Hukuk'],
  ['Hakikatin Pusulası Topluluğu', 'Arş. Gör. Ali KEREM', 'Emrecan ŞEKER', 'İslami İlimler'],
  ['Halkoyunları Topluluğu', 'Öğrt. Gör. Ahmet KOCADAĞ', 'Esma Esra CİHAN', 'Psikoloji'],
  ['Huawei Student Developers Topluluğu', 'Doç. Dr. Tuba KOÇ', 'Fatma Ayben COŞKUN', 'İstatistik'],
  ['Hukuk Parlamento Topluluğu', 'Dr. Öğrt. Üyesi Özge ÇELEBİ', 'Furkan ÖZKUL', 'Hukuk'],
  ['Hukuk Topluluğu', 'Arş. Gör Salih YILDIZ', 'Ömer Kaan KÜRKLÜ', 'Hukuk'],
  ['Hukuk ve Yapay Zeka Topluluğu', 'Dr. Öğrt. Üyesi Özge ÇELEBİ', 'Mustafa Batın YİĞİT', 'Hukuk'],
  [
    'IEEE Topluluğu (The Institute of Electrial and Electronics Engineers)(Elektrik ve Elektronik Mühendisleri Enstitüsü) Topluluğu',
    'Arş. Gör. Selim SÜRÜCÜ',
    'Yiğit BAYRAK',
    'Bilgisayar Mühendisliği',
  ],
  ['İdeal Hukuk Topluluğu', 'Arş. Gör. İsmail DEMEZ', 'Ali Taha BULUT', 'Hukuk'],
  ['İlahinet Topluluğu', 'Dr. Nazım ÇETİN', 'Mehmet Sami TAŞKIN', 'İslami İlimler'],
  [
    'İnsan Hak ve Hürriyetleri Topluluğu',
    'Dr. Öğrt. Üyesi Pınar PORTAKAL',
    'Nuseybe ATEŞ',
    'İslami İlimler',
  ],
  [
    'İnşaat Mühendisliği Topluluğu',
    'Dr. Öğr. Üyesi Pembe Merve KARABULUT',
    'Mehmet Hasan BALLICA',
    'İnşaat Mühendisliği',
  ],
  ['İstatistik ve Veri Bilimi Topluluğu', 'Dr. Öğrt. Üyesi Pelin AKIN', 'Baki KAYA', 'İstatistik'],
  [
    'İstiklal Yolu Topluluğu',
    'Doç. Dr. Tunç BORAN',
    'Muhammed Yusuf KÖROĞLU',
    'Sinema ve Televizyon',
  ],
  [
    'Kadın Kanserleri Farkındalığı Topluluğu',
    'Dr. Öğrt. Üyesi Gökçe Banu ACAR GÜL',
    'Tuğba KAYACAN',
    'Ebelik',
  ],
  ['Kalite Topluluğu', 'Dr. Öğrt. Üyesi Müzeyyen ÖZ', 'Mustafa SÜSLÜ', 'Hemşirelik'],
  [
    'Karatekin Travel Topluluğu',
    'Arş. Gör. Ahmet Tunahan KORKMAZ',
    'Tuğçe EĞİ',
    'Bilgisayar Mühendisliği',
  ],
  [
    'Kariyer Topluluğu',
    'Prof. Dr. Barış ÖZTUNA',
    'Hüsamettin Emre AKIN',
    'Çalışma Ekonomisi ve Endüstri İlişkiler',
  ],
  ['Kimya Topluluğu', 'Dr. Öğrt. Üyesi Zeliha ERBAŞ', 'Şahin TOPARLI', 'Kimya'],
  [
    'Kooperatifçilik Topluluğu',
    'Dr. Kübra AŞIK AKDEMİR',
    'Sevgi EROVA',
    'Siyaset Bilimi ve Kamu Yönetimi',
  ],
  [
    'Kültür Elçileri Topluluğu',
    'Doç. Dr. Yakup ÖZTÜRK',
    'Abdulkadir YILDIZ',
    'Turizm Rehberliği ILGAZ',
  ],
  [
    'Kültür ve Keşif Akademisi Topluluğu',
    'Dr. Öğrt. Üyesi Ertuğrul Burak EROĞLU',
    'Hatice ÇAKIRCA',
    'Bilgi ve Belge Yönetimi',
  ],
  ['Kültür ve Sanat Topluluğu', 'Dr. Öğrt. Üyesi Gönül GÖKER', 'Rabia ŞEN', 'Turizm Rehberliği'],
  [
    'Lezzet Keşifçileri',
    'Öğr. Gör. Dr. Mustafa TECİMEN',
    'Şeyma Nur Yanız',
    'Turizm ve Otel İşletmeciliği',
  ],
  ['Lösev Fayda Topluluğu', 'Dr. Öğrt. Gör. Ayşe ÇİFTÇİ', 'Beyza Hatice İLERİ', 'Çocuk Gelişimi'],
  ['Matematik Ve Bilim Topluluğu', 'Doç. Dr. Gülsüm ULUSOY ADA', 'Damla Yudum KAYA', 'Matematik'],
  [
    'Mavi Serçeler Engelsiz Yaşam Topluluğu',
    'Doç. Dr. Ceyhun TÜRKMEN',
    'Elif Nur GÜNDOĞAN',
    'Ergoterapi',
  ],
  ['Mavi Yelekliler Topluluğu', 'Doç. Dr. Serdar AYKUT', 'Merve KARAKOÇ', 'Sosyal Hizmet'],
  [
    'Mekatronik Topluluğu',
    'Dr. Öğrt. Üyesi Mustafa TEKE',
    'Sudenaz KURTYEMEZ',
    'Elektrik ve Elektronik Mühendisliği',
  ],
  [
    'Mesleki Gelişim ve Kariyer Planlama',
    'Doç. Dr. Sinan BULUT',
    'Recep GÖKBUDAK',
    'Sağlık Yönetimi',
  ],
  [
    'Milli Yetkinlik Hamlesi Topluluğu',
    'Prof. Dr. Barış ÖZTUNA',
    'Yusuf Esad ASLAN',
    'Bilgisayar Mühendisliği',
  ],
  [
    'Moda ve Tekstil Topluluğu',
    'Dr. Öğrt. Üyesi Emine KETENCİOĞLU',
    'Irmak TOK',
    'Tekstil ve Moda Tasarımı',
  ],
  ['Mucizevi Dokunuş Ebelik Topluluğu', 'Dr. Öğrt. Üyesi Sakine YILMAZ', 'Behice AYKIN', 'Ebelik'],
  ['Müzik Topluluğu', 'Doç. Dr. Tuğba ÇAĞLAK EKER', 'Tansel BAYDEMİR', 'Müzik Teknolojisi'],
  ['Namütenahi Hukuk Topluluğu', 'Arş. Gör. Salih YILDIZ', 'Kübra KAÇAN', 'Hukuk'],
  ['Nev Ahenk Genç Musiki Topluluğu', 'Doç. Dr. Fatih GÜZEL', 'Rümeysa YILMAZ', 'İslami İlimler'],
  [
    'Nutrispor Topluluğu',
    'Dr. Öğrt. Üyesi Fatma TAYHAN KARTAL',
    'Ayça ERYILMAZ',
    'Beslenme ve Diyetetik',
  ],
  ['Nütrivizyon Topluluğu', 'Arş. Gör. Dr. Gülsüm DEVECİ', 'Tuğba MARAZ', 'Beslenme ve Diyetetik'],
  [
    'Ombudsmanlık Topluluğu',
    'Dr. Öğrt. Üyesi Hediye Şirin AK',
    'Erdem KOÇ',
    'Siyaset Bilimi ve Kamu Yönetimi',
  ],
  [
    'Oyun Tasarımı ve Geliştirme Topluluğu',
    'Arş. Gör. Oğuz BALAS',
    'Emirhan BAL',
    'Grafik Tasarım',
  ],
  [
    'Önder Genç Topluluğu',
    'Doç. Dr. Fatih GÜZEL',
    'Aslıhan ÜNÜVAR',
    'Siyaset Bilimi ve Kamu Yönetimi',
  ],
  ['Örgü Topluluğu', 'Dr. Arş. Gör. Yeliz Kendir GÖK', 'Ayşe Sena AĞAÇ', 'Sosyoloji'],
  ['Paramedik Topluluğu', 'Dr. Öğrt. Üyesi Muhammed ALTUN', 'Berna YOLCU', 'Paramedik'],
  ['Psikoloji Topluluğu', 'Prof. Dr. Deniz İlkiz DİKMEER', 'Mükremin Yiğit AÇIKYÜREK', 'Psikoloji'],
  ['Robotik Topluluğu', 'Dr. Öğrt. Üyesi Çağatay ERSİN', 'Hasan KAYA', 'Elektronik'],
  [
    'Rotamız Tarih Kültür ve Gezi Topluluğu',
    'Arş. Gör. Ali KEREM',
    'Mehmet Fatih BİLGİLİ',
    'Tarih',
  ],
  ['Sağlık Yönetimi Topluluğu', 'Dr. Arş. Gör. Emine DOĞAN ÇULHA', 'Elif BAŞ', 'Sağlık Yönetimi'],
  [
    'Sağlıklı Aktivite ve Keşif Topluluğu',
    'Dr. Öğrt. Üyesi Gözde EDE İLERİ',
    'Yunus Emre ŞİMŞEK',
    'Beslenme ve Diyetetik',
  ],
  [
    'Sağlıklı Yaşam ve Egzersiz Topluluğu',
    'Dr. Öğr. Üyesi Burak ULUSOY',
    'Rukiye İlayda TAŞKIN',
    'Fizyoterapi ve Rehabilitasyon',
  ],
  [
    'Sağlıkta Kalite ve Akreditasyon Topluluğu',
    'Dr. Arş. Gör. Gülsüm ÇONOĞLU',
    'Nisa Nur YALÇINÖZ',
    'Hemşirelik',
  ],
  ['Salt Mehteran Topluluğu', 'Öğrt. Gör. Dr. Ayşe ÇİFTÇİ', 'Ahmet Selçuk ÇAPTIR', 'Hukuk'],
  [
    'Salt Müzik ve Sanat Topluluğu',
    'Dr. Öğrt. Gör. Ayşe ÇİFTÇİ',
    'Abdullah Talha NECİPOĞLU',
    'Müzik Teknolojisi',
  ],
  ['SALT Spor Topluluğu', 'Dr. Öğrt. Gör. Ayşe ÇİFTÇİ', 'İlayda Nur BAŞBUĞ', 'Matematik'],
  ['SALT Tiyatro Topluluğu', 'Dr. Öğrt .Gör. Ayşe ÇİFTÇİ', 'Murat GÜNDÜZ', 'Uluslararası Ticaret'],
  [
    'Sanat Tarihi ve Gezi Topluluğu',
    'Doç. Dr. Mehmet SÖYLER',
    'Nergiz KILINÇ',
    'Özel Güvenlik ve Koruma',
  ],
  [
    'Sesiniz Biziz Sosyal Hizmet Topluluğu',
    'Prof. Dr. Azize Serap TUNCER',
    'İrem TEKE',
    'Sosyal Hizmet',
  ],
  ['Sıfır Atık Topluluğu', 'Prof. Dr. Alpaslan KUŞVURAN', 'Elif Ezgi BALABAN', 'Hukuk'],
  [
    'Siber Güvenlik Topluluğu',
    'Dr. Öğrt. Üyesi Taha ETEM',
    'Enes Taha KURNAZ',
    'Bilgisayar Mühendisliği',
  ],
  ['Sinema Topluluğu', 'Öğr. Gör. Salih KÖSE', 'Yaşar Batuhan UĞURLU', 'Sinema ve Televizyon'],
  ['Sosyoloji Topluluğu', 'Doç. Dr. Şahin DOĞAN', 'İlaysu ÖZER', 'Sosyoloji'],
  [
    'Söz Sende Hukuk Topluluğu',
    'Dr. Öğrt. Üyesi Gülen SOYASLAN AKDEMİR',
    'Altay Orhun TAŞ',
    'Hukuk',
  ],
  ['Spor ve E-Spor Topluluğu', 'Arş. Gör. Furkan Alperen DEMİR', 'Ahmet BAKAR', 'Sinema'],
  [
    'Spor ve Zekâ Oyunları Topluluğu',
    'Öğrt. Gör. Hasan ÇERÇİOĞLU',
    'Gökhan ÇOLAK',
    'Evde Hasta Bakım ÇERKEŞ',
  ],
  [
    'Sürdürülebilir Beslenme ve Yaşam Topluluğu',
    'Dr. Öğrt. Üyesi Gülsüm ŞAHİN BODUR',
    'Sümeyye ÇAVDAR',
    'Beslenme ve Diyetetik',
  ],
  [
    'Şakayla Karışık Kültür Sanat ve Tiyatro Topluluğu',
    'Doç. Dr. Ahmet DÖNMEZ',
    'Hasan GÜLER',
    'Sinema ve Televizyon',
  ],
  ['Taraftarlar Birliği Topluluğu', 'Arş. Gör. Dr. Sezgin YAŞA', 'Emre ÇAYLAK', 'Grafik Tasarım'],
  ['Tarf Teknoloji Topluluğu', 'Öğr. Gör. Dr. Enis SERT', 'Serap PAK', 'Fizik'],
  ['Tarih Topluluğu', 'Dr. Arş. Gör. Seren ÇELEBİ', 'İbrahim ÜLKER', 'Tarih'],
  [
    'Taşmescit Mevlevihane Öğrenci Topluluğu',
    'Doç. Dr. Fatih GÜZEL',
    'Hüseyin GÜNEYSU',
    'İslami İlimler',
  ],
  [
    'TED x Karatekin University Topluluğu',
    'Doç. Dr. Haydar KOÇ',
    'Onur ŞEYRANLIOĞLU',
    'İstatistik',
  ],
  ['Teknofest Topluluğu', 'Öğrt. Gör. Derya DAĞ', 'Metin DAĞ', 'Elektrik-Elektronik Mühendisliği'],
  ['Themıs Hukuk Topluluğu', 'Dr. Öğrt. Üyesi Gülen SOYASLAN', 'Selenay ÇAĞLAR', 'Hukuk'],
  [
    'Türk Dünyası Araştırmaları Topluluğu',
    'Doç. Dr. Emine ÇELİKSOY',
    'Kürşat YILDIRIM',
    'Siyaset Bilimi ve Kamu Yönetimi',
  ],
  ['Türk Edebiyatı Topluluğu', 'Doç. Dr. Fatih SONA', 'Fatih YAVUZ', 'Türk Dili ve Edebiyatı'],
  [
    'Türkiyat Araştırmaları Öğrenci Topluluğu',
    'Dr. Öğrt. Üyesi Alperen Yalçın BOZNA',
    'Sabri AKÇA',
    'Tarih',
  ],
  ['Ultraslan Uni Topluluğu', 'Dr. Arş. Gör. Kübra Aşık AKDEMİR', 'Esat AKGÜL', 'Grafik Tasarım'],
  [
    'Uluslararası ilişkiler Topluluğu',
    'Arş. Gör. Fahrettin GÖK',
    'Menekşe YILDIZ',
    'Uluslararsı İlişkiler',
  ],
  [
    'Uluslararası Ticaret ve Finansman Topluluğu',
    'Arş. Gör. Dr. Hilal ABACI ÖZDEMİR',
    'Yasin EREN',
    'Uluslararası Ticaret ve Finansman',
  ],
  ['Üniversiteli Aktif Gençlik Topluluğu', 'Doç. Dr. Mehmet SÖYLER', 'Gülsena KÖKMEN', 'Ebelik'],
  [
    'Vital-Link Topluluğu',
    'Öğrt. Gör. Dr. Gülşah KAYSERİLİOĞLU',
    'Betül ERDEM',
    'İlk ve Acil Yardım ELDİVAN',
  ],
  [
    'Yapay Zekâ Topluluğu',
    'Dr. Öğrt. Üyesi Seda ŞAHİN',
    'Ahmet Ata KURT',
    'Bilgisayar Mühendisliği',
  ],
  [
    'Yaratıcı ve Sosyal Atölye Topluluğu',
    'Doç. Dr. Gözde ÖZARAS ÖZ',
    'Nisanur KİRİK',
    'Hemşirelik',
  ],
  [
    'Yaşam Boyu Öğrenme Topluluğu',
    'Arş. Gör. Dr. Pelin Karcı KANDEMİR',
    'Nagi SAYAN',
    'Bilgi ve Belge Yönetimi',
  ],
  ['Yeniler Topluluğu', 'Dr. Öğr. Üyesi Gönül GÜL', 'Recep Yasin SÜT', 'İslami İlimler'],
  [
    'Yeşil Ay Gençlik ve Spor Topluluğu',
    'Doç. Dr. Mehmet Sedat UĞUR',
    'Bulut ACAR',
    'Finans ve Bankacılık',
  ],
  ['Yeşil Enerji Topluluğu', 'Öğrt. Gör. Baran ARAS', 'Hatice İRİŞİK', 'Diş Hekimliği'],
];

async function migrate() {
  console.log(`Migration başlıyor (server: ${BASE}) — ${CLUBS.length} kulüp hedeflendi.`);

  console.log('Mevcut kulüpler okunuyor...');
  const existing = await request(`${BASE}/api/db/student_clubs`);
  if (!Array.isArray(existing)) {
    console.error('Kulüp listesi okunamadı:', existing);
    process.exit(1);
  }
  console.log(`Veritabanında ${existing.length} kulüp var.`);

  const existingNames = new Set(existing.map((c) => (c.name || '').trim().toLowerCase()));

  const toAdd = CLUBS.filter(([name]) => !existingNames.has(name.trim().toLowerCase()));
  console.log(`Eklenecek: ${toAdd.length} kulüp (atlanan: ${CLUBS.length - toAdd.length}).`);

  if (toAdd.length === 0) {
    console.log('Atlanacak hiçbir şey yok. Çıkılıyor.');
    return;
  }

  // /api/db/write tek istekte en fazla 50 yazma kabul ediyor — 30'lu gruplar
  const BATCH = 30;
  let added = 0;
  for (let i = 0; i < toAdd.length; i += BATCH) {
    const batch = toAdd.slice(i, i + BATCH);
    const operations = batch.map(([name, advisor, president, department]) => ({
      type: 'add',
      collection: 'student_clubs',
      data: { name, advisor, president, department, logoURL: '' },
    }));
    const res = await request(`${BASE}/api/db/write`, {
      method: 'POST',
      body: JSON.stringify({ operations }),
    });
    if (res && res.error) {
      console.error(`Batch ${i / BATCH + 1} hatası:`, res.error);
      process.exit(1);
    }
    added += batch.length;
    console.log(`  → ${added}/${toAdd.length} eklendi`);
  }

  console.log(`✓ Migration tamamlandı. ${added} kulüp eklendi.`);
}

migrate().catch((e) => {
  console.error('Migration hatası:', e);
  process.exit(1);
});
