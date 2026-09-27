# ÇAKÜ Yönetim Sistemi (erasmus_caku)

Çankırı Karatekin Üniversitesi için Erasmus ders eşleştirme, muafiyet, staj,
yatay/dikey geçiş, ÇAP/yandal, sınav ve ders programı, anket, yoklama ve
bölüm yönetimi modüllerini içeren web uygulaması.

## Yapı

| Klasör / dosya          | İçerik                                                                 |
| ----------------------- | ---------------------------------------------------------------------- |
| `*.jsx` (kök)           | React arayüz modülleri; `main.jsx` giriş, `app-shell.jsx` kabuk        |
| `shared-components.jsx` | Ortak bileşenler ve API katmanı (`apiRead`, `DBWrite`, `DB`, `Auth`)   |
| `lib/`                  | İstemci ve sunucunun **birlikte** kullandığı kural dosyaları (ESM)     |
| `server/`               | Express API (`index.js`), rotalar, ara katmanlar, MongoDB bağlantısı   |
| `server/lib/`           | Sunucuya özgü kurallar (yetki kapsamı, dosya sahipliği…)               |
| `tests/`                | Vitest birim testleri (`lib/` ve `server/lib/` kuralları)              |
| `ssl-setup/`            | nginx yapılandırması (canlı: `nginx-domain.conf`) ve kurulum betikleri |
| `scripts/deploy.sh`     | Canlı sunucuda güncelleme (`npm run deploy`)                           |
| `dagitim/DAGITIM.md`    | Dağıtım notları ve bilinen tuzaklar                                    |

## Geliştirme

Node 22 (`.nvmrc`) ve yerel bir MongoDB gerekir.

```bash
npm ci
(cd server && npm ci)
cp server/.env.example server/.env   # JWT_SECRET vb. doldurun
npm run server:dev                   # API: http://localhost:3001
npm run dev                          # Arayüz: http://localhost:5173 (/api → 3001 proxy)
```

## Kontroller

```bash
npm run lint          # ESLint (tanımsız global HATA'dır)
npm run format:check  # Prettier
npm test -- --run     # Vitest
npm run build         # Vite üretim derlemesi
```

## Güvenlik modeli (özet)

- Oturum httpOnly `caku_auth` çerezindedir; jeton tarayıcı belleğine yazılmaz.
- Veri erişimi `server/routes/db.js` içindeki rol/kapsam kurallarından geçer
  (`DB_AUTH_MODE=off` yalnız acil geri dönüş içindir).
- Öğrenci yalnız kendi kayıtlarını okur/yazar; kişisel belgeler sahiplik
  denetiminden geçer (`server/lib/dosya-sahiplik.js`).
- Güvenlik açığı bildirimi: `public/.well-known/security.txt`.
