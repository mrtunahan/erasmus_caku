# Ders Odaları — Ödev Not Çizelgesi Şablonu

Bu klasördeki dosyalar **Şablonlar** modülüne yüklenmeye hazır not çizelgesi
şablonlarıdır. Kendi antetinizi, logonuzu ve imza bloğunuzu ekleyebilirsiniz.
**Yer tutucuları ({{…}}) bozmadığınız sürece** her şey çalışır.

| Dosya                     | Belge türü                                 | Ne için                |
| ------------------------- | ------------------------------------------ | ---------------------- |
| `odev-not-cizelgesi.xlsx` | Ödev Not Çizelgesi — Excel (.xlsx)         | "Excel indir" düğmesi  |
| `odev-not-cizelgesi.docx` | Ödev Not Çizelgesi — Yazdırma / PDF (Word) | "PDF / Yazdır" düğmesi |

Word şablonu sunucuda PDF'e çevrilir. Şablon yüklemek zorunlu değildir:
yüklenmezse akademisyen aynı çizelgeyi modülün yerleşik Excel ve yazdırma
biçiminde alır.

---

## 1. Şablon nasıl yüklenir

1. **Şablonlar** modülü → **Ders Odaları (Not Çizelgesi)** kartı → **Yeni Şablon**.
2. **Belge Türü**: Excel dosyası için `Ödev Not Çizelgesi — Excel`, Word
   dosyası için `Ödev Not Çizelgesi — Yazdırma / PDF (Word)`.
3. **Kapsam**: bölüm / fakülte / üniversite. Çıktı üretilirken sırayla
   **bölüm → fakülte → üniversite** aranır.
4. Eşleme sihirbazı kendiliğinden açılır. Yer tutucu adları değişken
   etiketleriyle aynı olduğu için **alanların tamamı otomatik eşlenir**;
   yalnızca **Kaydet**'e basın.

Çıktı: akademisyen (ya da yetkili) **Ders Odaları → ders → Notlar** sekmesinde
**Excel indir** ya da **PDF / Yazdır** düğmesine basar. Süzgeç (ad, soyad,
numara, not durumu) ve sıralama çıktıya da uygulanır.

## 2. Ödev sayısı sabit değildir

Şablon 10 ödev sütunuyla gelir. Daha az ya da çok ödev için:

- **Sütun silin ya da ekleyin.** Eklediğiniz sütuna `{{11.Ödev}}` …
  `{{20.Ödev}}` yazın.
- **Ya da şablonu yeniden üretin:** `python3 scripts/ders-odasi-sablonu.py 6`

Sistem `1.Ödev … 20.Ödev` değerlerini üretir; ödevler **yayınlanma sırasıyla**
numaralanır. 20'den fazla ödev varsa ilk 20'si yazılır ve ekranda uyarı çıkar.

## 3. Yer tutucular

**Künye (belgede bir kez geçer)**

| Yer tutucu                      | Ne gelir                                           |
| ------------------------------- | -------------------------------------------------- |
| `{{Üniversite Adı}}`            | Çankırı Karatekin Üniversitesi                     |
| `{{Fakülte Bilgisi}}`           | Dersin bölümünün fakültesi                         |
| `{{Bölüm Adı}}`                 | Dersin bölümü                                      |
| `{{Başlık}}`                    | 2026-2027 Güz Dönemi Ödev Not Çizelgesi            |
| `{{Ders Kodu ve Adı}}`          | BLM103 - Bilgisayar Mühendisliğine Giriş           |
| `{{Öğretim Üyesi / Görevlisi}}` | Dersin akademisyen(ler)i                           |
| `{{Öğrenci Sayısı}}`            | Çizelgedeki öğrenci sayısı                         |
| `{{Ödevler}}`                   | 1.Ödev: ÖDEV-1 / 20 puan; 2.Ödev: ÖDEV-2 / 20 puan |
| `{{Tarih}}`                     | 14 Ekim 2026 Çarşamba                              |

İstenirse eklenebilir: `{{Akademik Yıl}}`, `{{Dönem}}`, `{{Ders Kodu}}`,
`{{Ders Adı}}`, `{{Ödev Sayısı}}`.

**Veri satırı (her öğrenci için bir kez tekrarlanır)**

`{{No}}` · `{{Öğrenci No}}` · `{{Adı}}` · `{{Soyadı}}` · `{{1.Ödev}}` …
`{{10.Ödev}}` · `{{Teslim Ettiği Ödev Sayısı}}` · `{{Toplam Puan}}` ·
`{{Ortalama}}`

İstenirse eklenebilir: `{{Adı Soyadı}}`.

- Ödev hücresi: verilen not (virgüllü ondalık). Not verilmemişse **boş**.
- **Toplam Puan**: notu verilmiş ödevlerin toplamı.
- **Ortalama**: notu verilmiş ödevlerde alınan puanın, o ödevlerin en yüksek
  puanına oranı, 100 üzerinden. Hiç notu olmayan öğrencide boş.
- Çizelgeye akademisyenin girdiği **bütün notlar** yazılır (öğrenciye henüz
  "geri verilmemiş" taslak notlar da). Öğrenci kendi notunu yalnız geri
  verildikten sonra görür.

## 4. Tabloyu değiştirirken tek kural

> **Veri satırında yer tutucudan başka kelime bulunmamalıdır.**

Motor bu satırı öğrenci sayısı kadar çoğaltır. O satıra sabit bir kelime
yazarsanız motor onu sütun başlığı sanar. Başlık satırlarına, künyeye ve
imza bloğuna istediğiniz metni yazabilirsiniz.

Excel şablonunda yer tutucuları **hücreye elle yazın**; formülle üretilen
metinleri motor göremez.
