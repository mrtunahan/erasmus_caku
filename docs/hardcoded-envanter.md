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

## Dalga 2 — Yapısal varsayılanlar (orta risk, planlı)

| Yer                                    | İçerik                                                           | Not                                                                                                                                               |
| -------------------------------------- | ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `shared-components.jsx` `DEPARTMENTS`  | 6 Mühendislik bölümü sabit listesi (renk/ikon dahil)             | DB `departments` zaten birleşiyor (merge); sabit listeyi tamamen DB'ye devretmek TÜM modüllerin başlangıç sırasına bağlı — dikkatli geçiş gerekir |
| `app-shell.jsx:1557`                   | `useState('bilgisayar')` varsayılan aktif bölüm                  | `TENANT.defaultDepartmentId` veya "ilk erişilebilir bölüm" mantığı                                                                                |
| `shared-components.jsx` öğrenci girişi | `departmentId \|\| 'bilgisayar'` fallback'leri (3 yer)           | Bölüm zorunlu hale getirilince kaldırılabilir                                                                                                     |
| `index.html`                           | `<title>ÇAKÜ Yönetim Sistemi</title>`, yükleme ekranı alt yazısı | Build-time; `VITE_APP_NAME` env'e bağlanabilir                                                                                                    |

## Dalga 3 — Kişi / veri kalıntıları (düşük öncelik)

| Yer                                                | İçerik                                                       | Not                                                                       |
| -------------------------------------------------- | ------------------------------------------------------------ | ------------------------------------------------------------------------- |
| `app-shell.jsx` `isErgunCinarUser`                 | "Ergün Çınar" isim eşleştirmesi (geriye dönük)               | Tüm kayıtlar `isStajCoordinator`/`isMemur` bayrağına geçince kaldırılır   |
| `staj-modulu.jsx`                                  | "Ergün ÇINAR" onaylayıcı metinleri                           | Metni "Fakülte Staj Yetkilisi" + atanan kişinin adı yap                   |
| `shared-components.jsx` `SEED_PROFESSORS`          | ÇAKÜ akademisyen listesi (login fallback)                    | DB erişilemezse kullanılan yedek; kurulum paketinde boşaltılır            |
| `shared-components.jsx` müfredat sabitleri (~596+) | Bilgisayar Müh. ders listesi                                 | Ders yönetimi DB'sine devir                                               |
| LoginModal admin dalı                              | "A. Tunahan KORKMAZ" sabit admin adı                         | Admin sekmesi zaten kaldırıldı; ölü kod, temizlenebilir                   |
| `ders-muafiyet.jsx` yerleşik Word biçimi           | "Çankırı Karatekin Üniversitesi..." başlık + yönetmelik atfı | Şablon sistemi ({{...}}) yerleşik biçimin yerini alıyor; şablonla çözülür |
| `benim-sayfam.jsx`                                 | `@ogrenci.karatekin.edu.tr` e-posta placeholder'ı            | `TENANT.studentEmailDomain`                                               |

## Kural (yeni kod için)

Yeni modüllerde kurum adı / bölüm listesi / kişi adı **kodda sabitlenmez**;
`TENANT`, `departments/faculties/universities` koleksiyonları veya ilgili
bayraklar kullanılır. (Akreditasyon modülü bu kurala göre yazıldı.)
