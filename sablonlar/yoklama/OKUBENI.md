# Ders Devam (Yoklama) Listesi Şablonu

`ders-devam-listesi.docx`, **Şablonlar** modülüne yüklenmeye hazır örnek devam
listesi şablonudur. Kendi antetinizi, logonuzu ve imza bloğunuzu ekleyip
kullanabilirsiniz — **yer tutucuları ({{…}}) bozmadığınız sürece** her şey
çalışır.

Şablon yüklemek zorunlu değildir: yüklenmezse akademisyen aynı listeyi
modülün yerleşik yazdırma biçiminde alır.

---

## 1. Şablon nasıl yüklenir

1. **Şablonlar** modülü → **Ders Devam Listesi** kartı → **Yeni Şablon**.
2. **Belge Türü**: `Ders Devam (Yoklama) Listesi`.
3. **Kapsam**: bölüm / fakülte / üniversite. Çıktı üretilirken sırayla
   **bölüm → fakülte → üniversite** aranır.
4. Yükleme bitince eşleme sihirbazı (🧩) kendiliğinden açılır. Bu dosyadaki
   yer tutucu adları değişken etiketleriyle birebir olduğu için **29 alanın
   tamamı otomatik eşlenir**; yapmanız gereken tek şey **Kaydet**'e basmaktır.

Çıktı: akademisyen **Benim Sayfam → Dijital Yoklama → Devam listesi** sekmesinde
**"Şablondan Word indir"** düğmesine basar.

## 2. Hafta sayısı sabit değildir

Şablondaki tablo 15 hafta sütunuyla gelir (örnek belgedeki gibi). Dönem daha
kısa ya da uzunsa iki yol var:

- **Word'de sütun silin/ekleyin.** Sildiğiniz hafta sütunu çıktıda da olmaz.
  Eklediğiniz sütuna `{{16.Hafta}}` … `{{20.Hafta}}` yazıp sihirbazda eşleyin.
- **Şablonu yeniden üretin:** `python3 scripts/yoklama-sablonu.py 14`

Sistem `hafta1 … hafta20` değişkenlerini üretir; şablonda kaç hafta sütunu
varsa o kadarı dolar, fazlası boş kalır. Üst sınır 20'dir
(`lib/yoklama-listesi.js` → `HAFTA_SINIRI`).

Bir yoklamanın hangi haftaya düştüğü **dönem başlangıç tarihinden** hesaplanır
(akademisyen bunu Dijital Yoklama → Ayarlar'da girer). Girilmezse yoklamalar
sırayla numaralanır ve çıktıya bunu söyleyen bir uyarı düşer.

## 3. Yer tutucular

**Künye (belgede bir kez geçer)**

| Yer tutucu                                  | Ne gelir                                                    |
| ------------------------------------------- | ----------------------------------------------------------- |
| `{{Başlık}}`                                | 2026-2027 Yıl Güz Dönemi Ders Öğrenci Listesi               |
| `{{Ders Kodu ve Adı}}`                      | BİL111.1 - Bilgisayar Programlama I (Birleştirilmiş Ders:…) |
| `{{Öğretim Üyesi / Görevlisi}}`             | Unvanıyla birlikte akademisyenin adı                        |
| `{{Fakülte Bilgisi}}` · `{{Bölüm Adı}}`     | Dersin bağlı olduğu birim                                   |
| `{{Tarih}}`                                 | 22 Eylül 2026 Salı                                          |
| `{{Dersi Alan Kadın/Erkek Öğrenci Sayısı}}` | 43 / 53                                                     |

Şablona istenirse şu künye alanları da eklenebilir (sihirbazda listelenir):
`{{Akademik Yıl}}`, `{{Dönem}}`, `{{Ders Kodu}}`, `{{Ders Adı}}`,
`{{Birleştirilmiş Ders}}`, `{{Üniversite Adı}}`, `{{Kadın Öğrenci Sayısı}}`,
`{{Erkek Öğrenci Sayısı}}`, `{{Toplam Öğrenci Sayısı}}`, `{{Hafta Sayısı}}`,
`{{Devamsızlık Sınırı}}`, `{{Alınan Yoklama Sayısı}}`.

**Veri satırı (her öğrenci için bir kez tekrarlanır)**

`{{No}}` · `{{Öğrenci No}}` · `{{Adı}}` · `{{Soyadı}}` · `{{Sınıfı}}` ·
`{{Devam}}` · `{{1.Hafta}}` … `{{15.Hafta}}`

İstenirse eklenebilir: `{{Adı Soyadı}}`, `{{Katıldığı Yoklama Sayısı}}`,
`{{Devamsızlık}}`, `{{Kalan Devamsızlık Hakkı}}`.

Hafta hücresi: `+` katıldı · `-` katılmadı · `İ` izinli · **boş** = o hafta
yoklama alınmadı.

`{{Devam}}` sütunu devamsızlık sınırını aşan öğrencide `Yok`, aşmayanda `Var`
yazar. **Sınır girilmemişse boş kalır** — sistem uydurma bir karar yazmaz.

## 4. Tabloyu değiştirirken tek kural

> **Veri satırında yer tutucudan başka kelime bulunmamalıdır.**

Motor, satır değişkenlerini taşıyan satırı öğrenci sayısı kadar çoğaltır. O
satıra "Öğrenci:" gibi sabit bir kelime yazarsanız motor onu sütun başlığı
sanar ve listeyi ALTINDAKİ satıra doldurmaya çalışır. Başlık satırlarına,
künyeye ve imza bloğuna istediğiniz metni yazabilirsiniz.
