# Sistem Kontrol Raporu

> Kapsam: öğrenci ve akademisyen tarafı, bütün modüller ve sekmeler + sunucu
> yetki katmanı. Tarih: 25 Eylül 2026. Dal: `claude/ders-programi-sablon-duzeltme-obso5r`.

## Nasıl kontrol edildi

1. **Tarayıcıda gezildi.** Uygulamanın tamamı (`main.jsx` → `app-shell.jsx` →
   tembel yüklenen 34 modül) gerçek tarayıcıda, sahte bir API katmanıyla
   çalıştırıldı; öğrenci ve akademisyen olarak her modüle girilip her sekmeye
   tıklandı, konsol hataları ve çöken ekranlar toplandı.
2. **Kaynak tarandı.** 128.000 satır istemci + 9.000 satır sunucu kodu, daha
   önce canlıda ortaya çıkmış hata SINIFLARI üzerinden tarandı: kör yazma
   (kaybolan onay), bayat önbellekten okuma, Türkçe harf duyarlılığı, sunucu
   yetki boşlukları, sessizce yutulan yazma hataları, efekt bağımlılığı
   yüzünden silinen form girdisi.
3. **Testler ve derleme.** 116 test dosyası / 2988 test geçiyor, `npm run build`
   temiz, eslint 0 hata.

**Bu raporun sınırı:** canlı veritabanına bağlanılmadı; bulgular kodun kendisinden
ve tarayıcı denemesinden çıkarıldı. "Doğrulandı" yazan maddeler kod okumasıyla
kesinleşmiştir, tahmin değildir.

---

## Özet

| #   | Bulgu                                                                                     | Etki                                                        | Önem      |
| --- | ----------------------------------------------------------------------------------------- | ----------------------------------------------------------- | --------- |
| 1   | Başka öğrencinin staj belgeleri indirilebiliyor                                           | Kişisel veri (kimlik fotokopisi, SGK)                       | 🔴 Yüksek |
| 2   | Kişisel kayıtlar öğrenciye tümüyle açık (`muafiyet_history`, `trip_history`, bildirimler) | Ad-soyad, numara, not, gerekçe                              | 🔴 Yüksek |
| 3   | Anket yanıtları kimlikli ve herkese okunur                                                | KVKK / anket güvenilirliği                                  | 🔴 Yüksek |
| 4   | Staj yol haritasında kör yazma → verilen onay siliniyor                                   | "Onayladım, geri onaya düştü" (muafiyetteki hatanın aynısı) | 🔴 Yüksek |
| 5   | Komisyon üyeliği Türkçe harfte tutmuyor                                                   | Akademisyen yetkisini alamıyor                              | 🟠 Orta   |
| 6   | Yetki hâlâ isimle veriliyor ("Ergün ÇINAR")                                               | Adaş riski + bakım tuzağı                                   | 🟠 Orta   |
| 7   | Ders bildirimi eski alandan okuyor                                                        | Bildirim hiç gitmiyor (sessiz)                              | 🟠 Orta   |
| 8   | Aramalarda Türkçe harf sorunu (~200 yer)                                                  | "IŞIL" / "İstatistik" aranınca bulunmuyor                   | 🟠 Orta   |
| 9   | Portalda beğeni/oy/yorum sayacı kör yazma                                                 | Eşzamanlı beğeni kayboluyor                                 | 🟡 Düşük  |
| 10  | 10 dakikada otomatik çıkış + kaydedilmemiş form koruması yok                              | Uzun formda emek kaybı                                      | 🟠 Orta   |
| 11  | Muafiyet not ekranında memolanmamış dizi (bilinen hata deseni)                            | Yazarken değerin ezilmesi riski                             | 🟡 Düşük  |
| 12  | Büyük modüllerde kural dosyası/test yok                                                   | Değişiklikte sessiz bozulma                                 | 🟡 Düşük  |

---

## 1. 🔴 Başka öğrencinin staj belgeleri indirilebiliyor

**Ne oluyor.** Üç halka arka arkaya geliyor:

- `internship_uploads` koleksiyonu öğrenci okumasına **tümüyle açık**
  (`server/routes/db.js` → READABLE listesinde var, `STUDENT_READ_SCOPED`'da yok).
  Bu kayıtlar her başvurunun yüklediği dosyaların adını ve sunucu yolunu taşıyor
  (`staj-modulu.jsx:3369-3395`).
- Dosya klasörü tahmin edilebilir: `staj_belgeler/<öğrenciNo>` (`staj-modulu.jsx:3382`).
- `GET /api/files/download/*` yalnız **giriş yapmış olmayı** arıyor, dosyanın
  sahibine bakmıyor (`server/routes/files.js:247`).

Yani giriş yapmış herhangi bir öğrenci, tarayıcı adres çubuğundan
`/api/db/internship_uploads` diyip bütün başvuruların dosya yollarını alabilir ve
`/api/files/download/...` ile indirebilir. Nüfus cüzdanı fotokopisi, SGK belgesi,
sağlık raporu bu dosyaların içinde.

**Nasıl düzelir.**

1. `internship_uploads` ve `internship_roadmap`'i sahibine daraltın. Belge kimliği
   başvuru id'si olduğu için `STUDENT_READ_SCOPED` yetmez; `APP_OWNED` yazmada
   yaptığı gibi (`db.js:1652`) okumada da başvurunun öğrencisi çözülmeli.
2. `/api/files/download/*`'a sahiplik denetimi ekleyin: yol `staj_belgeler/<no>/`
   ile başlıyorsa yalnız o numaranın sahibi ya da personel indirebilsin.
   (`/merge-pdf` ucunda benzeri zaten var: `files.js:417` "sunucu kaydı okur,
   sahipliğini doğrular".)

---

## 2. 🔴 Kişisel kayıtlar öğrenciye tümüyle açık

Sunucu, giriş yapmış herkesin okuyabildiği 70 koleksiyon tutuyor; öğrenci için
yalnız 4 koleksiyon kendi kaydına daraltılmış (`students`,
`internship_applications`, `muafiyet_records`, `ogrenci_akademik_kayit`) ve yalnız
`randevu_talepleri` maskeli. Açıkta kalan ve **başka öğrencilerin kimliğini
taşıyan** koleksiyonlar:

| Koleksiyon                                  | İçinde ne var                                              |
| ------------------------------------------- | ---------------------------------------------------------- |
| `muafiyet_history`                          | ad, numara, bölüm, karşı kurum dersi, **not**, onaylayan   |
| `trip_history`                              | Erasmus ders eşleştirmeleri, ad, numara                    |
| `student_notifications`, `notifications`    | kişiye özel bildirim metinleri (**red gerekçeleri** dahil) |
| `internship_notifications`                  | ad, numara, hangi adımda, kim reddetti                     |
| `internship_uploads` / `internship_roadmap` | belge adları ve süreç durumu                               |
| `exam_results`                              | sınav sonuçları                                            |

**Tuhaflık şurada:** `muafiyet_records` kendi kaydına daraltılmış ama aynı
bilgiyi taşıyan `muafiyet_history` bomboş duruyor. Ön kapı kilitli, arka kapı açık.

**Nasıl düzelir.** İki mekanizma zaten var ve çalışıyor; sadece bu koleksiyonlara
uygulanmamış:

- Kendi kaydına daraltma: `STUDENT_READ_SCOPED`'a `muafiyet_history: 'studentNo'`,
  `trip_history: 'studentNumber'`, `student_notifications: 'studentNumber'`,
  `internship_notifications: 'targetStudentNo'` eklenmesi.
- Alan maskesi: `server/lib/ogrenci-maske.js` (randevu talepleri için yazılan
  desen) `survey_responses` ve `notifications` için de kullanılabilir.

---

## 3. 🔴 Anket yanıtları kimlikli ve herkese okunur

`anket-modulu.jsx:4338` her yanıtı `userId` ile birlikte `survey_responses`
koleksiyonuna yazıyor; koleksiyon öğrenci okumasına açık. Yani bir öğrenci,
"hoca değerlendirme anketi"nde kimin ne yazdığını okuyabilir.

İki karardan biri verilmeli, ikisi de kod değişikliği ister:

- **Anket kimlikliyse:** koleksiyon öğrenciye kapatılmalı (`STUDENT_READ_DENY`),
  sonuçları yalnız yetkili görür.
- **Anket anonimse:** yanıta `userId` yazılmamalı; "bu kişi yanıtladı mı"
  bilgisi ayrı bir kayıtta (`survey_completions`) tutulmalı. Mükerrer gönderim
  koruması o kayıttan çalışır.

---

## 4. 🔴 Staj yol haritasında kör yazma — verilen onay siliniyor

Muafiyet modülünde bu hafta düzelttiğimiz hatanın **aynısı** staj modülünde duruyor,
üstelik penceresi çok daha geniş:

- **Öğrenci** "Adımı Tamamla" dediğinde (`staj-modulu.jsx:376-388`) sayfa
  açıldığında yüklenmiş `roadmapData` state'inin **tamamı** geri yazılıyor
  (`steps` haritasının hepsi). Öğrenci sayfayı açtıktan sonra akademisyen başka
  bir adımı onayladıysa, öğrencinin bu tıklaması o onayı **siler**. Pencere
  sayfanın açık kaldığı süre kadardır — dakikalar.
- **Akademisyen** onay (`5202-5215`) ve red (`5282-5295`) verirken kaydı
  15 saniyelik önbellekten okuyup yine bütün `steps` haritasını yazıyor. İki
  yetkili ya da öğrenci+yetkili aynı anda işlem yaparsa biri kayboluyor.
- Red yolu ayrıca adımın eski alanlarını (kim onaylamıştı, ne zaman) tümden
  siliyor — iz kalmıyor.

**Nasıl düzelir.** Muafiyette uyguladığımız çözümün aynısı:
`window.apiReadDocFresh` ile taze oku ve diziyi/haritayı değil **tek adımı** yaz
(`{ 'steps.3.status': 'completed', 'steps.3.approvedBy': ... }`). Sunucu noktalı
yolu zaten yazabiliyor (`server/routes/db.js` → `addTimestamps`); muafiyet için
yazdığımız `lib/muafiyet-satir-yaz.js` bunun kural/test örneğidir.

---

## 5. 🟠 Komisyon üyeliği Türkçe harfte tutmuyor

`staj-modulu.jsx:4510` üyeliği düz `toLowerCase()` ile karşılaştırıyor:

```
"İBRAHİM ÖZTÜRK".toLowerCase() → "i̇brahi̇m öztürk"
"İbrahim Öztürk".toLowerCase() → "i̇brahim öztürk"   ← eşit değil
```

Komisyon listesine adı BÜYÜK harfle girilmiş bir akademisyen, profilinde adı
normal yazıldığı için **komisyon üyesi sayılmıyor**: staj onay ekranını hiç
göremiyor ve sebebini de anlayamıyor.

Projede bunun doğrusu zaten var: `lib/komisyon-modul.js` → `uyeMi()` unvanı ayıklar
ve `adAnahtari` ile Türkçe-duyarlı karşılaştırır. Staj modülü kendi kopyasını
kullanmayı bırakıp o fonksiyonu çağırmalı.

---

## 6. 🟠 Yetki hâlâ isimle veriliyor

`staj-modulu.jsx:4480` ve `app-shell.jsx:2583`: adında "ergün/ergun" **ve**
"çınar/cinar" geçen herkes fakülte geneli staj yetkisi ve SGK onayı alıyor.
`isStajCoordinator` bayrağı eklenmiş ve göç betiği (`server/migrate-staj-coordinator.js`)
bayrağı yazmış durumda; isim kuralı geriye dönük uyumluluk için bırakılmış.

Adaş bir akademisyen sisteme girdiği gün bu yetkiyi kimse vermeden alır. Bayrak
yazıldığına göre isim kuralı artık silinebilir — bir kişiye ait özel durumun
kodda kalması her okuyanı yanıltıyor (`docs/hardcoded-envanter.md` bunu zaten
listeliyor).

---

## 7. 🟠 Ders bildirimi eski alandan okuyor — hiç gitmiyor

`shared-components.jsx:12497` — `notifyCourseStudents` öğrencileri yalnız
`students.myCourseIds` (eski tek-liste seçim) üzerinden süzüyor. Benim Sayfam
artık seçimi `student_courses` koleksiyonuna yazıyor; yeni yoldan ders seçen
öğrenci bu süzgeçten **hiç geçmiyor**.

Sonuç: proje grubu açıldığında (`proje-modulu.jsx:2899`) dersi alan öğrencilere
bildirim gitmiyor, hata da vermiyor. Yoklama listesinde aynı hatayı düzeltmiştik;
kararın tek yeri `lib/ogrenci-ders-secimi.js` → `secilenDersIdleri`. Bu çağrı da
oradan geçmeli.

---

## 8. 🟠 Aramalarda Türkçe harf sorunu

Yaklaşık 200 yerde arama/filtre düz `toLowerCase()` kullanıyor
(`ogrenci-portali.jsx:6833`, `kullanici-yonetimi.jsx:789`,
`komisyonlar-modulu.jsx:254`, `ders-yonetimi-modulu.jsx:918`,
`staj-modulu.jsx:4793` …). Türkçede bu şu demek:

```
"IŞIK" içinde "ışık" aranıyor → düz toLowerCase: bulunamadı
                               → toLocaleLowerCase('tr'): bulundu
```

Öğrenci "ışıl" yazdığında "IŞIL" adlı kaydı bulamıyor; "İstatistik" ile
"istatistik" aynı listede buluşmuyor. Projede `formatCaseTr` ve
`toLocaleLowerCase('tr')` kuralı zaten benimsenmiş — arama kutuları bu kurala
çekilmeli. Tek bir yardımcı (`trKucuk(metin)`) yazıp hepsini ona bağlamak en
temizi.

---

## 9. 🟡 Portalda beğeni/oy/yorum sayacı kör yazma

`ogrenci-portali.jsx:689` (tepki), `707` (oy), `756`/`820` (yorum sayısı):
kayıt **önbellekli** okunup dizinin tamamı geri yazılıyor. Aynı gönderiyi 15 saniye
içinde beğenen iki öğrenciden biri kaybolur; yorum sayısı gerçek yorum sayısından
sapar.

Sunucu `__increment:N` ile atomik artırmayı zaten destekliyor
(`server/routes/db.js` → `addTimestamps`): `commentCount` için doğrudan
`'__increment:1'` gönderilmeli; beğeni/oy içinse taze okuma + tek alan yazımı.

---

## 10. 🟠 10 dakikada otomatik çıkış, kaydedilmemiş form koruması yok

`app-shell.jsx:22` — 10 dakika fare/klavye hareketi olmazsa oturum kapanıyor.
Projede hiçbir yerde `beforeunload` uyarısı ya da taslak saklama yok (arandı,
sıfır sonuç). Uzun bir staj/muafiyet formunu doldururken telefona bakan
kullanıcı geri döndüğünde giriş ekranını ve boş formu buluyor.

En az biri yapılmalı: süreyi uzatmak (30 dk), çıkmadan 1 dakika önce uyarmak,
ya da form taslaklarını `localStorage`'a yazmak.

---

## 11. 🟡 Muafiyet not ekranında memolanmamış dizi

`ders-muafiyet.jsx:5121` — `notluDersler` her render'da yeniden üretiliyor ve iki
`useEffect`'in bağımlılık listesinde duruyor (`5347`, `5370`); yani efektler her
render çalışıyor ve `setNotlar` çağırıyor. "Devamsızlık hakkı girilmiyor"
şikâyetinin kök sebebi tam olarak bu desendi. Şu an kullanıcı girdisini ezdiğine
dair kanıt yok (elle girilen satır korunuyor) ama aynı tuzak duruyor:
`useMemo` ile sarılmalı.

---

## 12. 🟡 Büyük modüllerde kural dosyası ve test yok

`sinav-otomasyonu.jsx` (4.937 satır), `anket-modulu.jsx` (5.323),
`proje-modulu.jsx` (4.395), `ogrenci-kulupleri-modulu.jsx` (4.071),
`akreditasyon-modulu.jsx` (3.078) için `lib/` altında kural dosyası ve test yok
(sınav çakışması hariç: `lib/sinav-cakisma.js`). Bu modüllerdeki kararlar
doğrudan JSX içinde; değiştiğinde hiçbir test uyarmıyor.

---

## Sorun bulunmayan / iyi durumda olanlar

Bunları da yazıyorum ki neyin denendiği belli olsun:

- **Tarayıcı taraması temiz.** Öğrenci rolüyle 15 modül / 262 sekme, akademisyen
  rolüyle 14 modül / 233 sekme gezildi: tek bir JavaScript hatası, tek bir çöken
  ekran, tek bir boş sekme yok.
- **Rota koruması çalışıyor.** Adres çubuğundan erişilmeye çalışılan her yetkisiz
  modül geri atıldı: öğrenci → Öğrenci Portalı (18 modül denendi), akademisyen →
  Sınav Otomasyonu (19 modül denendi). Menüde olmayan modül adresten de açılmıyor.
- **Rol–modül dağılımı tasarımla uyumlu** (`app-shell.jsx:2811`): sade akademisyen
  Benim Sayfam (akademik), Sınav, Formlar, Ders Programı, Lisansüstü, Projeler,
  Staj ve Performans görüyor; Ders Muafiyet / Erasmus / Yatay Geçiş bölüm
  yetkilisinde ve komisyon üyeliğiyle açılıyor. Bir akademisyen "muafiyet
  ekranını göremiyorum" derse sebebi budur — hata değil, yetkilendirme.
- **Sunucu yazma katmanı sağlam.** Öğrencinin kendi notunu/kararını yazması, yetki
  bayrağı yükseltmesi, moderatör olması, başkasının kaydını güncellemesi ayrı ayrı
  engellenmiş ve gerekçesi kodda yazılı. Yoklama yazma kapısı genel API'ye kapalı.
- **Yoklama kod güvenliği** (dönen karekod + cihaz bağı + sunucu saati) tutarlı.
- **Muafiyet kör yazma hatası** bu hafta kapatıldı; sayaçlar artık sunucuda
  kaydın kendisinden hesaplanıyor.

---

## Önerilen sıra

1. **Bugün:** 1, 2, 3 (kişisel veri sızıntıları — sunucu tarafında birkaç satır).
2. **Bu hafta:** 4 (staj kör yazma), 5 ve 7 (sessizce çalışmayan yetki/bildirim).
3. **Sonra:** 6, 8, 10 (bakım ve kullanılabilirlik), 9, 11.
4. **Zamanla:** 12 — her dokunulan modülün kuralını `lib/`e taşımak.
