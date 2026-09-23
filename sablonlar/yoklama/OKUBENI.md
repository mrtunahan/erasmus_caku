# Ders Devam (Yoklama) Listesi Şablonu

Bu klasördeki dosyalar **Şablonlar** modülüne yüklenmeye hazır devam listesi
şablonlarıdır. Kendi antetinizi, logonuzu ve imza bloğunuzu ekleyip
kullanabilirsiniz — **yer tutucuları ({{…}}) bozmadığınız sürece** her şey
çalışır.

| Dosya                     | Ne için                                |
| ------------------------- | -------------------------------------- |
| `ders-devam-listesi.xlsx` | Excel çıktısı (üzerinde çalışılabilir) |
| `ders-devam-listesi.docx` | Word çıktısı (yazdır / PDF)            |

İkisi de aynı yer tutucuları taşır; **hangisini yüklerseniz çıktı o biçimde
gelir.** Şablon yüklemek zorunlu değildir: yüklenmezse akademisyen aynı
listeyi modülün yerleşik yazdırma biçiminde alır.

---

## 1. Şablon nasıl yüklenir

1. **Şablonlar** modülü → **Ders Devam Listesi** kartı → **Yeni Şablon**.
2. **Belge Türü**: `Ders Devam (Yoklama) Listesi`.
3. **Kapsam**: bölüm / fakülte / üniversite. Çıktı üretilirken sırayla
   **bölüm → fakülte → üniversite** aranır.
4. Yükleme bitince eşleme sihirbazı (🧩) kendiliğinden açılır. Bu dosyalardaki
   yer tutucu adları değişken etiketleriyle birebir olduğu için **alanların
   tamamı otomatik eşlenir**; yapmanız gereken tek şey **Kaydet**'e basmaktır.

Çıktı: akademisyen **Benim Sayfam → Dijital Yoklama → Devam listesi** sekmesinde
**"Şablondan indir (Excel / Word)"** düğmesine basar.

## 2. Hafta sayısı sabit değildir

Şablon 15 hafta sütunuyla gelir. Dönem daha kısa ya da uzunsa:

- **Excel/Word'de sütun silin ya da ekleyin.** Sildiğiniz hafta çıktıda da
  olmaz. Eklediğiniz sütuna `{{16.Hafta}}` … `{{20.Hafta}}` yazıp sihirbazda
  eşleyin.
- **Ya da şablonu yeniden üretin:** `python3 scripts/yoklama-sablonu.py 14`

Sistem `hafta1 … hafta20` değişkenlerini üretir; şablonda kaç hafta sütunu
varsa o kadarı dolar. Üst sınır 20'dir (`lib/yoklama-listesi.js` →
`HAFTA_SINIRI`).

Bir yoklamanın hangi haftaya düştüğü **dönem başlangıç tarihinden** hesaplanır
(akademisyen bunu Dijital Yoklama → Ayarlar'da girer). Girilmezse yoklamalar
sırayla numaralanır ve çıktıya bunu söyleyen bir uyarı düşer.

## 3. Yer tutucular

**Künye (belgede bir kez geçer)**

| Yer tutucu                              | Ne gelir                                                    |
| --------------------------------------- | ----------------------------------------------------------- |
| `{{Başlık}}`                            | 2026-2027 Yıl Güz Dönemi Ders Öğrenci Listesi               |
| `{{Ders Kodu ve Adı}}`                  | BİL111.1 - Bilgisayar Programlama I (Birleştirilmiş Ders:…) |
| `{{Öğretim Üyesi / Görevlisi}}`         | Unvanıyla birlikte akademisyenin adı                        |
| `{{Fakülte Bilgisi}}` · `{{Bölüm Adı}}` | Dersin bağlı olduğu birim                                   |
| `{{Tarih}}`                             | 22 Eylül 2026 Salı                                          |

İstenirse eklenebilir: `{{Akademik Yıl}}`, `{{Dönem}}`, `{{Ders Kodu}}`,
`{{Ders Adı}}`, `{{Birleştirilmiş Ders}}`, `{{Üniversite Adı}}`,
`{{Toplam Öğrenci Sayısı}}`, `{{Hafta Sayısı}}`, `{{Alınan Yoklama Sayısı}}`.

**Veri satırı (her öğrenci için bir kez tekrarlanır)**

`{{No}}` · `{{Öğrenci No}}` · `{{Adı}}` · `{{Soyadı}}` · `{{Sınıfı}}` ·
`{{1.Hafta}}` … `{{15.Hafta}}`

İstenirse eklenebilir: `{{Adı Soyadı}}`, `{{Katıldığı Yoklama Sayısı}}`,
`{{Devamsızlık}}`, `{{Kalan Devamsızlık Hakkı}}`.

Hafta hücresi: `+` katıldı · `-` katılmadı · `İ` izinli · **boş** = o hafta
yoklama alınmadı.

## 4. Sistemin bilmediği sütun şablonda yok

- **"Devam" (Var/Yok) sütunu yoktur.** Bu karar ancak dersin devamsızlık
  sınırı girilmişse verilebilir. Sınırı Dijital Yoklama → Ayarlar'dan
  giriyorsanız `{{Devam}}` hücresini şablona elle ekleyebilirsiniz; sınır
  girilmemişken sistem Var/Yok yazmaz (boş sütun basıp imzalayanı yanıltmak
  yerine sütunu hiç çıkarmaz).
- **"Dersi alan kadın/erkek öğrenci sayısı" yoktur.** Öğrenci kaydında
  cinsiyet tutulmuyor; sayılamayan bir şey için "0 / 0" yazmak yanlış bilgi
  olurdu. Kayıtlara cinsiyet alanı eklenirse `{{Dersi Alan Kadın/Erkek
Öğrenci Sayısı}}` yer tutucusu kendiliğinden dolmaya başlar.

## 5. Tabloyu değiştirirken tek kural

> **Veri satırında yer tutucudan başka kelime bulunmamalıdır.**

Motor, satır değişkenlerini taşıyan satırı öğrenci sayısı kadar çoğaltır. O
satıra "Öğrenci:" gibi sabit bir kelime yazarsanız motor onu sütun başlığı
sanar ve listeyi ALTINDAKİ satıra doldurmaya çalışır. Başlık satırlarına,
künyeye ve imza bloğuna istediğiniz metni yazabilirsiniz.

Excel şablonunda ek bir kural daha var: **yer tutucuları Excel'de yazın**
(hücreye elle girin). Kopyala-yapıştır ya da formülle üretilen metinler
paylaşılan metin tablosuna girmediğinde motor onları göremez.
