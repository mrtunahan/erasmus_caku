# Ders Programı Şablonları

Bu klasördeki dosyalar, **Şablonlar** modülüne yüklenmeye hazır örnek ders
programı şablonlarıdır. Kendi antetinizi, logonuzu ve imza bloğunuzu ekleyip
kullanabilirsiniz — yer tutucuları bozmadığınız sürece her şey çalışır.

| Dosya                        | Belge Türü                     | Ne için                                |
| ---------------------------- | ------------------------------ | -------------------------------------- |
| `bolum-ders-programi.xlsx`   | Bölüm Haftalık Ders Programı   | Excel çıktısı (üzerinde çalışılabilir) |
| `bolum-ders-programi.docx`   | Bölüm Haftalık Ders Programı   | Word çıktısı (yazdır / PDF)            |
| `fakulte-ders-programi.xlsx` | Fakülte Birleşik Ders Programı | Excel çıktısı                          |
| `fakulte-ders-programi.docx` | Fakülte Birleşik Ders Programı | Word çıktısı                           |

---

## 1. Şablon nasıl yüklenir

1. **Şablonlar** modülünü açın → **Ders Programı** kartı.
2. **Yeni Şablon** → dosyayı seçin.
3. **Belge Türü**: dosya adının söylediği tür — `Bölüm Programı — Excel (.xlsx)`,
   `Bölüm Programı — Yazdırma / PDF (Word)`, `Fakülte Programı — Excel (.xlsx)`
   ya da `Fakülte Programı — Yazdırma / PDF (Word)`.
4. **Kapsam**: bölüm / fakülte / üniversite. Çıktı üretilirken sırayla
   **bölüm → fakülte → üniversite** aranır; bölümün kendi şablonu yoksa
   fakültenin, o da yoksa üniversitenin şablonu kullanılır.
5. Yükleme bitince eşleme sihirbazı (🧩) kendiliğinden açılır. Bu dosyalardaki
   yer tutucu adları değişken etiketleriyle birebir olduğu için **alanlar
   otomatik eşlenir**; yapmanız gereken tek şey **Kaydet**'e basmaktır.

Şablon yüklenmezse hiçbir şey bozulmaz: modül eskiden olduğu gibi kendi
yerleşik çıktısını üretmeye devam eder.

## 2. Çıktı hangi düğmeden alınır

| Düğme                                | Ne yapar                                                                      |
| ------------------------------------ | ----------------------------------------------------------------------------- |
| **Bölüm Çıktısı** / **Yazdır / PDF** | Önce şablonu dener (Word ya da Excel), yoksa yerleşik yazdırma sayfasını açar |
| **Bölüm .xlsx** / **.xlsx indir**    | Yalnız **.xlsx** şablonu dener, yoksa yerleşik Excel dosyasını üretir         |

## 3. Excel şablonunun yapısı — derslik sütunlu ızgara

Excel şablonu, fakültenin elle tuttuğu tablonun **aynısıdır**:

|     | `{{Gün}}` | `{{Ders Saati}}` | M10Z04 | M11101 | Bilgisayar Kat1 |
| --- | --------- | ---------------- | ------ | ------ | --------------- |
|     | Pazartesi | 08:30 - 09:15    |        | FZK181 |                 |
|     |           | 09:30 - 10:15    | MAT242 |        | BLM307          |

- **Sütun = derslik**, **satır = gün + ders saati**, hücre = **ders kodu**.
- Dersin hangi bölüme ait olduğu **zemin renginden** okunur (fakülte çıktısı).
- Sistem tabloyu şu iki yer tutucudan bulur:
  - `{{Gün}}` → gün sütunu
  - `{{Ders Saati}}` → ders saati sütunu; **sağında kalan her dolu başlık bir
    dersliktir**
- Derslik başlığı iki biçimde de yazılabilir; ikisi de eşleşir:
  `M10Z04` + `(T45 - S25)` ya da `Bilgisayar Kat1` + `(M111BL)`.

### Dolu ve boyalı alanlara dokunulmaz

Şablonda elle doldurduğunuz alanlar korunur — sistem üzerlerine **yazmaz**:

- **Sarı** ortak zorunlu ders satırları (`OZD-…`)
- **Yeşil** öğle arası satırı
- İçinde metin olan her hücre

Bir ders bu yüzden yerleştirilemezse çıktı alındığında **sebebiyle bildirilir**
(“şablonda o hücre dolu ya da boyalı”, “o gün/saat satırı yok”, “o derslik
sütunu yok”, “derse derslik atanmamış”). Eksik bir programı sessizce vermek,
yanlış program vermektir.

### Bölüm ve fakülte çıktısı aynı şablonu kullanır

- **Bölüm çıktısı** → yalnız o bölümün ders kodları, hepsi bölümün renginde.
- **Fakülte çıktısı** → tüm bölümlerin ders kodları tek tabloda, her biri kendi
  bölümünün renginde.

Çakışma önlemi programda alınıyor; şablona temiz veri gelir. Aynı hücreye iki
ders düşerse ikincisi yazılmaz ve bildirilir.

### Ders saatleri

Sistemin **varsayılan saatleri bu şablonla birebir aynıdır** — hiçbir ayar
yapmadan eşleşir:

| Öğleden önce  | Öğleden sonra |
| ------------- | ------------- |
| 08:30 - 09:15 | 13:15 - 14:00 |
| 09:30 - 10:15 | 14:15 - 15:00 |
| 10:30 - 11:15 | 15:15 - 16:00 |
| 11:30 - 12:15 | 16:15 - 17:00 |
| 12:30 - 13:15 | 17:15 - 18:00 |

Gün **iki bloktan** oluşur ve ritimleri bağımsızdır: sabah dersleri yarım
saatte (`:30`), öğleden sonrakiler çeyrek geçe (`:15`) başlar. Ders 45 dakika,
teneffüs 15 dakikadır.

Bölüm farklı çalışıyorsa Ders Programı'ndaki **Ders Saatleri** düğmesinden
**iki bloğu da ayrı ayrı** değiştirebilir (sabahı 09:00'da başlatıp öğleden
sonrayı 13:15'te bırakmak gibi). Öğleden sonra bloğu tamamen kaldırılabilir —
yalnız sabah ders yapan bölümün programı boş satırla uzamaz.

Şablonun saat satırlarıyla bölümün ayarı **aynı saatleri** göstermelidir;
sistem ikisini boşluk farkını yok sayarak eşleştirir (`08:30 - 09:15` ile
`08:30-09:15` aynıdır).

## 4. Kullanılabilir yer tutucular

Yer tutucu yazımı **yalnızca** `{{...}}` biçimidir.

### Excel şablonunda

| Yer tutucu             | Ne işe yarar                                                     |
| ---------------------- | ---------------------------------------------------------------- |
| `{{Gün}}`              | **Zorunlu** — ızgaranın gün sütununu işaretler                   |
| `{{Ders Saati}}`       | **Zorunlu** — saat sütununu işaretler, sağı derslik sütunları    |
| `{{Kurum Adı}}`        | Üniversite adı                                                   |
| `{{Fakülte Adı}}`      | Programın ait olduğu fakülte                                     |
| `{{Bölüm Adı}}`        | Bölüm adı — _fakülte çıktısında boştur_                          |
| `{{Dönem}}`            | `Güz` / `Bahar`                                                  |
| `{{Akademik Yıl}}`     | Örn. `2025-2026`                                                 |
| `{{Öğretim Seviyesi}}` | `Lisans` / `Lisansüstü`                                          |
| `{{Kapsam}}`           | Bölüm çıktısında sınıf bilgisi, fakülte çıktısında bölüm listesi |
| `{{Tarih}}`            | Belgenin oluşturulduğu gün                                       |
| `{{Hazırlayan}}`       | Çıktıyı alan yetkilinin adı                                      |

`{{Gün}}` ve `{{Ders Saati}}` çıktıda **sütun başlığı olarak** yazılır
(“Gün”, “Ders Saati”); yer tutucu görünmez. Karşılığı verilmeyen diğer
yer tutucular silinir.

### Word (PDF) şablonunda

Word şablonu satır çoğaltmayla çalışır: tabloda **tek veri satırı** bırakın,
o satır dolu saat sayısı kadar kopyalanır.

`{{Saat}}` · `{{Pazartesi}}` · `{{Salı}}` · `{{Çarşamba}}` · `{{Perşembe}}` ·
`{{Cuma}}` — künye alanları yukarıdaki listeyle aynıdır.

## 5. Kendi şablonunuzu hazırlarken

- Yer tutucuyu **tek parça** yazın. Word bir kelimeyi biçimlendirme yüzünden
  parçalara bölebilir; `{{Kurum Adı}}` yazdıktan sonra üzerinden geçip tek
  biçimde (aynı yazı tipi/punto) olduğundan emin olun.
- Excel şablonunda **derslik sütunu ekleyip çıkarabilirsiniz**; sistem sütunları
  başlıklarından bulur. Aynı şey saat satırları için de geçerlidir.
- Aynı yer tutucuyu birden çok yerde kullanabilirsiniz; hepsi aynı değeri alır.
- Sayfa yönü **yatay** olsun — beş gün yan yana ancak öyle okunur.
- Tablonun altına imza, tarih, onay bloğu ekleyebilirsiniz; veri satırının
  altındaki satırlar korunur.
- Antet/logo eklemek için dosyayı Word ya da Excel'de açıp düzenlemeniz yeterli.

## 6. Dosyalar nasıl yeniden üretilir

Excel şablonları **sıfırdan çizilmedi**: fakültenin kendi tablosu
(`kaynak/fakulte-cikti-ham.xlsx`) korunup üzerine yalnız `{{ }}` yer tutucuları
işlendi. Kenarlıklar, birleşik hücreler, sütun genişlikleri ve baskı ayarları
kurumun bıraktığı gibidir.

```bash
python3 scripts/ders-programi-sablonlari.py
```

Betik hiçbir bağımlılık istemez. Yer tutucu adları
`shared-components.jsx` içindeki `DERSPROGRAMI_STATIC` / `DERSPROGRAMI_ROWS`
etiketleriyle aynı olmak zorundadır; `tests/ders-programi-sablon-yertutucu.test.js`
bu sözleşmeyi denetler.
