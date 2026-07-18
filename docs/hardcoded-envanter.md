# Hardcoded ÇAKÜ Kalıntıları — Envanter ve Taşıma Planı (Yol Haritası Adım 2)

Amaç: Sistemin farklı üniversite/fakültelere satılabilmesi için koda gömülü
kuruma-özgü değerlerin **veriye/config'e** taşınması. Bu doküman envanterin
kaydıdır; her dalga tamamlandıkça işaretlenir.

Merkezî mekanizma: **`tenant_config` koleksiyonu → `window.TENANT`**
(shared-components.jsx içinde yüklenir; kayıt yoksa mevcut değerler varsayılan
olarak kalır — sıfır regresyon). Seed: `server/seed-tenant-config.js`.

## Dalga 1 — Kimlik / marka (✅ bu commit'te yapıldı)

| Yer                                      | İçerik                                                                  | Çözüm                                                  |
| ---------------------------------------- | ----------------------------------------------------------------------- | ------------------------------------------------------ |
| `shared-components.jsx` `FACULTY` sabiti | "Mühendislik Fakültesi", "Çankırı Karatekin Üniversitesi"               | `TENANT.facultyName/universityName` ile senkronlanıyor |
| LoginModal marka + footer                | "Offline Asistan", "© ÇAKÜ Bilgisayar Mühendisliği", geliştirici satırı | `TENANT.appName/unitName/developerNote`                |
| `app-shell.jsx` TopHeader                | `FACULTY.name` / `FACULTY.university`                                   | `TENANT` öncelikli okunuyor                            |

## Dalga 2 — Yapısal varsayılanlar

| Yer                                    | İçerik                                                 | Durum / Not                                                                                                                                                                                  |
| -------------------------------------- | ------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `index.html` başlık                    | `<title>ÇAKÜ Yönetim Sistemi</title>`                  | ✅ Statik başlık ürün adına çevrildi; uygulama açılınca `document.title` TENANT'tan senkronlanıyor                                                                                           |
| `index.html` yükleme alt yazısı        | "Çankırı Karatekin Üniversitesi" (JS öncesi anlık)     | ⏸ Bilinçli bırakıldı — yalnız ilk yükleme anında görünür; kurulum paketinde tek satır `sed` ile değiştirilecek                                                                               |
| `shared-components.jsx` `DEPARTMENTS`  | 6 Mühendislik bölümü sabit listesi (renk/ikon dahil)   | ⏸ **Bilinçli ertelendi (satış netleşince):** DB `departments` merge mekanizması bugünkü ihtiyacı karşılıyor; tam devir TÜM modüllerin açılış sırasını etkiler — canlı sistemde gereksiz risk |
| `app-shell.jsx`                        | `useState('bilgisayar')` varsayılan aktif bölüm        | ⏸ Ertelendi — mevcut "erişilemeyen bölümde isen ilk erişilebilire geç" düzeltici effect'i bu varsayılanı zaten telafi ediyor (kendi kendini onarır)                                          |
| `shared-components.jsx` öğrenci girişi | `departmentId \|\| 'bilgisayar'` fallback'leri (3 yer) | ⏸ Ertelendi — kayıt akışında bölüm seçimi zorunlu; fallback yalnız eski/bozuk kayıtlar için                                                                                                  |

## Dalga 3 — Kişi / veri kalıntıları (düşük öncelik)

| Yer                                                | İçerik                                                       | Not                                                                                          |
| -------------------------------------------------- | ------------------------------------------------------------ | -------------------------------------------------------------------------------------------- |
| `staj-modulu.jsx` öğrenci akış metinleri           | "Ergün ÇINAR" onaylayıcı metinleri                           | ✅ "Fakülte Staj Yetkilisi" yapıldı (kişi-bağımsız)                                          |
| `benim-sayfam.jsx`                                 | `@ogrenci.karatekin.edu.tr` e-posta placeholder'ı            | ✅ `TENANT.studentEmailDomain`'e bağlandı                                                    |
| `app-shell.jsx` `isErgunCinarUser`                 | "Ergün Çınar" isim eşleştirmesi (geriye dönük)               | ⏸ Migration (migrate-memur-ergun.js) prod'da çalışıp tüm kayıtlar bayrağa geçince kaldırılır |
| `shared-components.jsx` `SEED_PROFESSORS`          | ÇAKÜ akademisyen listesi (login fallback)                    | ⏸ DB erişilemezse kullanılan yedek; kurulum paketinde boşaltılır                             |
| `shared-components.jsx` müfredat sabitleri (~596+) | Bilgisayar Müh. ders listesi                                 | ⏸ Ders yönetimi DB'sine devir (satış öncesi)                                                 |
| LoginModal admin dalı                              | "A. Tunahan KORKMAZ" sabit admin adı                         | ⏸ Ölü kod (admin sekmesi kaldırıldı); ayrı temizlik PR'ında                                  |
| `ders-muafiyet.jsx` yerleşik Word biçimi           | "Çankırı Karatekin Üniversitesi..." başlık + yönetmelik atfı | ⏸ Şablon sistemi ({{...}}) yerleşik biçimin yerini alıyor; şablonla çözülür                  |

## Kural (yeni kod için)

Yeni modüllerde kurum adı / bölüm listesi / kişi adı **kodda sabitlenmez**;
`TENANT`, `departments/faculties/universities` koleksiyonları veya ilgili
bayraklar kullanılır. (Akreditasyon modülü bu kurala göre yazıldı.)
