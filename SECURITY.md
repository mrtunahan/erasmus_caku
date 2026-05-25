# Güvenlik politikası

## Açık bildirme

Bir güvenlik açığı tespit ederseniz lütfen **kamuya açık issue oluşturmayın**.
Bunun yerine doğrudan proje sahibine e-posta gönderin (depo profilinden).

Lütfen şu bilgileri ekleyin:

- Açığın türü ve etkisi
- Yeniden üretme adımları (mümkünse PoC)
- Etkilenen sürüm / branch / commit
- Önerilen düzeltme (varsa)

## Yanıt süreci

- 72 saat içinde alındığını onaylarız.
- 7 iş günü içinde ilk değerlendirmeyi paylaşırız.
- Kritik açıklar için "out-of-band" patch yayınlanır; geri kalanlar bir
  sonraki sürüm döngüsüne dahil edilir.

## Kapsam

Aşağıdaki konuları açık olarak ele alıyoruz:

- Kimlik doğrulama / yetkilendirme atlamaları
- SQL/NoSQL injection, RCE, SSRF
- Cross-site scripting (XSS) ve CSRF
- Hassas veri sızıntısı (PII, JWT secret, DB bağlantısı)
- Yetkisiz dosya yükleme / okuma
- Bağımlılık zinciri zafiyetleri

Kapsam dışı: aktif olarak kullanıcıyı kandırmayı gerektiren ataklar
(klasik sosyal mühendislik), zararsız bilgi sızıntıları (server header
versiyonu vb.).

## Bilinen kısıtlar

- CSP `'unsafe-inline'` ve `'unsafe-eval'` içerir (Quill rich-text editor
  bağımlılığı). Sıkılaştırma planı backlog'da.
- `/api/db/*` endpoint'lerinin auth middleware ile zorunlu kılınması
  yol haritasında — şu anda istemci tarafında bearer/cookie gönderiyor
  ancak server'da enforce edilmiyor.
- Token hem `httpOnly` cookie'de hem `localStorage`'da saklanıyor;
  localStorage tarafının kaldırılması planlanıyor.

## Güvenlik testi

Pre-prod ortamlarda izinli güvenlik testlerini (pentest, fuzzing)
karşılıyoruz. Önceden e-posta ile koordine edin.
