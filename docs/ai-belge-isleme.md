# Belge İşleme (AI) — Mimari ve Yol Haritası

Sistemdeki tüm modüller için **tek** bir belge işleme katmanı vardır.
Model tektir ve koda gömülüdür: **`claude-haiku-4-5-20251001`** (200K bağlam,
1M token başına $1 girdi / $5 çıktı).

Bu katman üç işi yapar:

| İş                        | Uç                           | Kim kullanır       |
| ------------------------- | ---------------------------- | ------------------ |
| Belgeden alan çıkarımı    | `POST /api/ai/extract`       | öğrenci + personel |
| Belgeyle kıyaslama        | `POST /api/ai/compare`       | öğrenci + personel |
| Web'den bilgi doğrulama   | `POST /api/ai/verify`        | yalnız personel    |
| Toplu işlem (%50 indirim) | `POST /api/ai/extract/batch` | yalnız personel    |
| Maliyet raporu            | `GET /api/ai/usage`          | yalnız personel    |

**Alan listesi elle yazılmaz.** Şablonlar modülünde yüklenen belge zaten bir
modüle ve o modülün alanlarına eşlenmiştir
(`document_templates.fields` → `token` ↔ `static:<id>` / `row:<id>`).
`window.aiSablonAlanlari(module, docType, departmentId)` bu eşlemeyi okuyup
çıkarım/kıyaslama alan listesine çevirir; bileşenlere `alanlar` verilmezse
otomatik bu yol kullanılır.

> ÖDR taslak yazımı (`/api/ai/accreditation-draft`) **bu katmanda değildir**.
> O, sağlayıcı seçilebilen `services/llm.js` üzerinden çalışır. İki farklı iş,
> iki farklı katman — karıştırılmamalıdır.

---

## Dosya haritası

```
server/services/claude-extract.js   TEK extraction servisi (model burada sabit)
server/services/doc-text.js         PDF → base64 blok, DOCX → mammoth, XLSX → SheetJS
server/services/ai-usage.js         usage kaydı + maliyet hesabı
server/routes/ai.js                 uçlar, yetki, rate limit, girdi temizliği
shared-components.jsx               window.aiAlanDoldur / window.AIDoldurButonu
```

---

## Akış

```
Öğrenci belgeyi zaten /api/files/upload ile yüklüyor
        │
        ▼  (yalnızca fileName gönderilir — dosya ikinci kez ağdan geçmez)
POST /api/ai/extract  { module, docType, fields[], dosyalar[] }
        │
        ├── doc-text: PDF ise base64 document bloğu, değilse metin + chunk
        ├── sistem blokları: [talimat] + [şablon few-shot]   ← cache_control
        ├── kullanıcı mesajı: alan listesi + belgeler        ← önbellek dışı
        ├── output_config.format ile katı JSON şeması
        └── parse hatasında 1 kez yeniden dene (bütçe 2×, düz JSON)
        │
        ▼
{ alanId: { deger, guven, kaynak } }        ← /extract
{ alanId: { belgeDeger, formDeger, durum } } ← /compare
        │
        ▼
İnceleme paneli → kullanıcı işaretler → forma aktarılır
```

**Otomatik doldurma yoktur.** Model çıktısı hiçbir zaman doğrudan kaydedilmez;
sistemdeki "önce görüntüle, sonra uygula" belge akışıyla aynı kuraldır.

---

## Kıyaslama nasıl karar veriyor

`POST /api/ai/compare` formdaki/sistemdeki değeri belgedekiyle karşılaştırır.
**Kararı model vermez, sunucu verir:**

1. Model belgedeki değeri okur ve bir kanaat bildirir.
2. Sunucu iki değeri normalize eder; normalize eşitse `durum` **`ayni`ye
   zorlanır**. Model yalnız normalize eşitliğin yakalayamadığı anlamsal
   durumlarda (kısaltma, farklı sözcük düzeni) belirleyici olur.

Normalize kuralları (`kiyasNormalize`):

| Girdi                                         | Sonuç  |
| --------------------------------------------- | ------ |
| `3,42` ↔ `3.42`                               | aynı   |
| `78,45` ↔ `78,450`                            | aynı   |
| `412,33812` ↔ `412.33812`                     | aynı   |
| `1.234,56` ↔ `1234.56`                        | aynı   |
| `BİLGİSAYAR MÜH.` ↔ `Bilgisayar Mühendisliği` | aynı   |
| `Mühendislik Fak.` ↔ `Mühendislik Fakültesi`  | aynı   |
| `3,42` ↔ `2,90`                               | farklı |
| `SAY` ↔ `EA`                                  | farklı |

Sayısal ayıraç kuralı: iki ayıraç varsa sonuncusu ondalıktır; tek ayıraç bir
kez geçiyorsa ondalık, birden çok geçiyorsa binliktir.

`durum` değerleri: `ayni` · `farkli` · `belgede_yok` · `formda_bos`.
Yanıttaki `farkliSayisi` doğrudan uyuşmazlık sayısını verir.

Bu bir **ön denetimdir**, otomatik ret/kabul değildir; nihai karar
değerlendiricinindir.

---

## Prompt önbelleği — dikkat edilmesi gereken tek şey

Önbellek bir **önek eşleşmesidir**: sabit blokta tek bayt değişirse sonrası
komple geçersiz olur. Bu yüzden:

- Sabit blok = talimat + şablon few-shot örnekleri, **süreç içinde memoize**
  edilir (10 dk) ve alan listesi deterministik sıralanır.
- Alan listesi ve belgeler **kullanıcı mesajına** konur — çağrıdan çağrıya
  değiştikleri için önbelleği bozmasınlar diye.
- Sabit blokta zaman damgası / UUID / rastgele sıra **yoktur**.

> ⚠️ **Haiku 4.5'te önbelleğe alınabilen en küçük önek 4096 token'dır.**
> Bunun altındaki önekler hata vermez — **sessizce önbelleğe alınmaz.**
> Şu anki talimat bloğu tek başına bu eşiğin altındadır; önbelleğin gerçekten
> çalışması için `ai_ornekler` koleksiyonuna modül başına 1-2 doldurulmuş
> örnek girilmelidir.
>
> Ölçmek için: `/api/ai/extract` yanıtındaki `onbellek` alanına bakın.
> `minimumAltinda: true` ise önbellek çalışmıyor demektir.

`ai_ornekler` kayıt biçimi (Bölüm Yetkilisi ve üstü yazabilir):

```json
{
  "module": "yataygecis",
  "docType": "kurumici",
  "sira": 1,
  "aktif": true,
  "belgeMetni": "…gerçek bir transkriptin düz metni (kişisel veri temizlenmiş)…",
  "cikti": { "notOrtalamasi": "78,45", "yksPuani": "412,338" }
}
```

---

## Maliyet

Her model çağrısı `ai_usage_logs` koleksiyonuna yazılır. Koleksiyon generic DB
API'sinden **yazılamaz** (`WRITE_DENY`) — maliyet defteri tahrif edilemesin.

Öğrenci başına maliyet: `GET /api/ai/usage?groupBy=student`
(ayrıca `module`, `department`, `day`).

Öğrenci rolünde `studentNo` **daima token'dan** alınır; gövdeden gelen değer
yok sayılır — maliyetin başka bir öğrenciye yazılması engellenir.

Kaba büyüklük: tek sayfalık bir transkript ≈ 1.500–2.500 token girdi,
~500 token çıktı → çağrı başına **~$0.005**. Önbellek çalışırsa sabit blok
maliyeti 1/10'una düşer. Batch API tüm kalemlerde %50 indirimlidir.

---

## Sınırlar

| Konu            | Sınır                                                 |
| --------------- | ----------------------------------------------------- |
| PDF sayfa       | 100 (200K bağlamlı modeller için). Aşarsa reddedilir. |
| PDF boyut       | ~22 MB ham (base64 sonrası 32 MB istek sınırı)        |
| Metin bölümleme | 120.000 karakter/parça, 2.000 karakter bindirme       |
| Alan sayısı     | istek başına 80                                       |
| Belge sayısı    | istek başına 8                                        |
| Web arama       | çağrı başına **3** (`max_uses`)                       |
| Rate limit      | öğrenci 6/dk, personel 30/dk                          |

Batch ucunda çok parçalı (chunk gerektiren) belgeler kabul edilmez —
her batch isteği bağımsız sonuç döndüğü için parçalar birleştirilemez.
Bu işler senkron uca yönlendirilir.

---

## Yeni bir modülü bağlama (3 adım)

```jsx
// Hangi yüklü belgelerden okunacak?
const dosyalar = [{ fileName: window.aiDosyaAdi(transkriptUrl), name: 'Transkript' }];

// ÇIKARIM — alan listesi verilmezse şablon eşlemesinden çözülür.
<window.AIDoldurButonu
  module="muafiyet"
  docType="intibak"
  departmentId={activeDepartment}
  dosyalar={dosyalar}
  onUygula={(degerler) => setForm((f) => ({ ...f, ...degerler }))}
/>

// KIYASLAMA — beyan edilen değerleri belgeyle denetler.
<window.AIBelgeKontrol
  module="muafiyet"
  docType="intibak"
  departmentId={activeDepartment}
  mevcutDegerler={form}
  dosyalar={dosyalar}
/>;
```

Şablonda olmayan ya da şablondakinden dar bir küme isteniyorsa `alanlar`
açıkça verilebilir: `[{ id, label, hint?, format? }]`.

`module` / `docType` değerleri **şablon sistemiyle aynı** olmalıdır —
few-shot bloğu `document_templates` içindeki eşlenmiş yer tutuculardan
üretildiği için.

---

## Yol haritası

**Faz 1 — tamamlandı**
Çekirdek katman, uçlar (çıkarım · kıyaslama · web doğrulama · batch), maliyet
defteri, şablon eşlemesinden otomatik alan listesi, ortak istemci bileşenleri
ve referans entegrasyon: Yatay Geçiş → öğrenci tarafında "Belgeden Doldur",
akademisyen tarafında "Belgeyle Karşılaştır".

**Faz 2 — sıradaki modüller (yüksek getiri, düşük risk)**

| Modül         | Kaynak belge             | Doldurulacak alanlar                     |
| ------------- | ------------------------ | ---------------------------------------- |
| Ders Muafiyet | transkript, ders içeriği | ders adı/kodu/AKTS/not, karşı kurum notu |
| Dikey Geçiş   | DGS sonuç belgesi        | puan, yerleşme yılı, önlisans AGNO       |
| ÇAP / Yandal  | transkript               | AGNO, sınıf, başarı sırası               |
| Erasmus       | Learning Agreement       | karşı kurum dersleri, AKTS eşleşmesi     |
| Benim Sayfam  | kimlik / öğrenci belgesi | ad-soyad, TC, doğum tarihi, adres        |

Her biri yukarıdaki 3 adımdır; sunucuda kod yazılmaz.

**Faz 3 — web doğrulama**
`POST /api/ai/verify` hazır ama hiçbir modüle bağlı değil. İlk
kullanım yeri kurumlararası yatay geçişte "karşı üniversite/bölüm gerçekten
var mı, adı doğru yazılmış mı" kontrolüdür. `izinliAlanlar` ile
`yok.gov.tr`, `osym.gov.tr` gibi resmî kaynaklara kısıtlanmalıdır.

**Faz 4 — batch**
Dönem sonu toplu işler (ör. bir bölümün tüm yatay geçiş transkriptlerini
gece boyunca işlemek). Uçlar hazır; eksik olan yalnız "gönder → bekle →
sonuçları uygula" ekranıdır.

**Faz 5 — few-shot kalitesi**
`ai_ornekler` için bir yönetim ekranı. Bu aynı zamanda 4096 token'lık
önbellek eşiğini aşmanın da yoludur; doğrudan doğruluk ve maliyet kazancı.

---

## Kurulum

```bash
cd server && npm install          # @anthropic-ai/sdk, mammoth, xlsx
echo "ANTHROPIC_API_KEY=sk-ant-..." >> server/.env
pm2 restart erasmus_caku
```

Anahtar tanımlı değilse `/api/ai/extract`, `/api/ai/compare` ve
`/api/ai/verify` **503** döner ve istemcideki butonlar hiç görünmez;
uygulamanın geri kalanı etkilenmez.

### Kurulumu doğrulama

```bash
cd server && npm run ai:selftest
```

Gerçek model çağrıları yapar (~$0.02) ve sırayla şunları denetler:

1. Anahtar tanımlı mı, model erişilebilir mi, bağlam penceresi 200K mi
2. **Sabit önek 4096 token eşiğini aşıyor mu** — aşmıyorsa önbellek sessizce
   çalışmaz; test bunu açıkça söyler
3. Sentetik bir transkriptten 7 alanı doğru okuyor mu (ad, bölüm, sınıf,
   AGNO, YKS yılı/türü/puanı)
4. İkinci çağrıda önbellek gerçekten okunuyor mu
5. Kıyaslama doğru karar veriyor mu — biçim farkı (`Mühendislik Fak.` ↔
   `Mühendislik Fakültesi`, `78,45` ↔ `78.45`) **aynı** sayılmalı, gerçek
   fark (`EA` ↔ `SAY`) **farklı**, boş alan `formda_bos`. Sahte uyuşmazlık
   üretilmediği ayrıca doğrulanır.

Çıkış kodu 0 = hepsi geçti. MongoDB gerekmez.

> Anahtar `server/.env` içindedir ve `.gitignore` ile depo dışında tutulur —
> depoya hiçbir koşulda yazılmamalıdır.
