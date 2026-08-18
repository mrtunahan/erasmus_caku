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
3. **Belge Türü**: `Bölüm Haftalık Ders Programı` ya da
   `Fakülte Birleşik Ders Programı`.
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

## 3. Şablonun yapısı — tek veri satırı kuralı

Ders programı bir ızgaradır (5 gün × 14 saat) ama şablon motoru **satır
çoğaltarak** çalışır. Bu yüzden şablondaki tablo şu iki satırdan ibarettir:

| Saat       | Pazartesi       | Salı       | Çarşamba       | Perşembe       | Cuma       |
| ---------- | --------------- | ---------- | -------------- | -------------- | ---------- |
| `{{Saat}}` | `{{Pazartesi}}` | `{{Salı}}` | `{{Çarşamba}}` | `{{Perşembe}}` | `{{Cuma}}` |

- **Bir satır = bir SAAT**, **bir sütun = bir GÜN**.
- Yer tutuculu satır, programda **dolu olan saat sayısı kadar** kopyalanır.
  Şablona 14 satır çizmeyin; **tek satır** bırakın.
- Boş saatler (o hafta hiç ders olmayan saatler) çıktıya yazılmaz.
- Bir hücrede birden çok ders varsa (bölünmüş hücre, farklı sınıflar veya
  bölümler) hepsi **alt alta** yazılır. Excel'de hücrenin _Metni Kaydır_
  ayarını açık bırakın.

Hücre içeriği şu düzendedir:

```
BLM301 (3. Sınıf)      ← ders kodu (fakülte çıktısında bölüm/sınıf ayrı satırda)
Bilgisayar Ağları      ← ders adı
Prof. Dr. Ayşe YILMAZ  ← öğretim üyesi
D-205                  ← derslik
```

## 4. Kullanılabilir yer tutucular

Yer tutucu yazımı **yalnızca** `{{...}}` biçimidir. Adlar aşağıdakilerle
birebir yazılırsa eşleme otomatik olur.

### Künye (belgede bir kez geçer)

| Yer tutucu              | Değeri                                                           |
| ----------------------- | ---------------------------------------------------------------- |
| `{{Kurum Adı}}`         | Üniversite adı (sistem ayarından)                                |
| `{{Fakülte Adı}}`       | Programın ait olduğu fakülte                                     |
| `{{Bölüm Adı}}`         | Bölüm adı — _fakülte birleşik çıktısında boştur_                 |
| `{{Dönem}}`             | `Güz` / `Bahar`                                                  |
| `{{Akademik Yıl}}`      | Örn. `2025-2026` (Eylül'de yeni yıl başlar)                      |
| `{{Öğretim Seviyesi}}`  | `Lisans` / `Lisansüstü`                                          |
| `{{Kapsam}}`            | Bölüm çıktısında sınıf bilgisi, fakülte çıktısında bölüm listesi |
| `{{Tarih}}`             | Belgenin oluşturulduğu gün                                       |
| `{{Hazırlayan}}`        | Çıktıyı alan yetkilinin adı                                      |
| `{{Ders Sayısı}}`       | Programdaki farklı ders sayısı                                   |
| `{{Ders Saati Sayısı}}` | Dolu hücre sayısı (bölünmüş hücre bir saat sayılır)              |

### Tablo satırı (her dolu saat için bir kez)

`{{Saat}}` · `{{Pazartesi}}` · `{{Salı}}` · `{{Çarşamba}}` · `{{Perşembe}}` · `{{Cuma}}`

## 5. Kendi şablonunuzu hazırlarken

- Yer tutucuyu **tek parça** yazın. Word bir kelimeyi biçimlendirme yüzünden
  parçalara bölebilir; `{{Kurum Adı}}` yazdıktan sonra üzerinden geçip tek
  biçimde (aynı yazı tipi/punto) olduğundan emin olun.
- Aynı yer tutucuyu birden çok yerde kullanabilirsiniz; hepsi aynı değeri alır.
- Sayfa yönü **yatay** olsun — beş gün yan yana ancak öyle okunur.
- Tablonun altına imza, tarih, onay bloğu ekleyebilirsiniz; veri satırının
  altındaki satırlar korunur.
- Antet/logo eklemek için dosyayı Word ya da Excel'de açıp düzenlemeniz yeterli.

## 6. Dosyalar nasıl yeniden üretilir

Bu dosyalar elle çizilmedi, bir betikle üretildi:

```bash
python3 scripts/ders-programi-sablonlari.py
```

Betik hiçbir bağımlılık istemez. Yer tutucu adları
`shared-components.jsx` içindeki `DERSPROGRAMI_STATIC` / `DERSPROGRAMI_ROWS`
etiketleriyle aynı olmak zorundadır; `tests/ders-programi-sablon-yertutucu.test.js`
bu sözleşmeyi denetler.
