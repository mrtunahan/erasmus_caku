#!/usr/bin/env bash
# ══════════════════════════════════════════════════════════════
# Patent & FSMH Takibi — sunucuda kurulum ve güncelleme
#
# Takip ekranları AYRI bir uygulamadır (mrtunahan/patent: FastAPI + kendi
# SQLite veritabanı). Offline Asistan'ın olağan dağıtımı (scripts/deploy.sh)
# onu ne kurar ne de nginx'e /patent/ yolunu ekler. Bu ikisi eksikse modüldeki
# "Patent & FSMH Takibi →" düğmesi açılmaz (eskiden çerçevede Offline
# Asistan'ın kendisi açılıyordu).
#
# Bu betik (root ya da sudo ile, Offline Asistan kopyasının içinden):
#   1) uygulamayı PATENT_DIZIN'e indirir / günceller (yalnız ileri sarma)
#   2) .env'i /patent alt yoluna göre ayarlar
#   3) veritabanını YEDEKLER, Python ortamını kurar, şemayı günceller
#   4) önyüzü /patent/ tabanıyla derler
#   5) pm2'de PATENT_PM2_AD adıyla başlatır / yeniden başlatır
#   6) nginx parçasını (ssl-setup/patent-takip.conf) koyar, site ayarına
#      include satırını ekler; `nginx -t` geçmezse ayarı GERİ ALIR
#
# Tekrar çalıştırmak güvenlidir (güncelleme için de aynı komut).
#
#   sudo bash scripts/patent-kur.sh
#
# Değiştirilebilir ayarlar (ortam değişkeni):
#   PATENT_DIZIN   /var/www/patent
#   PATENT_REPO    https://github.com/mrtunahan/patent.git
#   PATENT_DAL     main
#   PATENT_PORT    8001
#   PATENT_PM2_AD  patent
#   NGINX_SITE     /etc/nginx/sites-available/caku-erasmus
#   PYTHON         python3   (3.11+)
# ══════════════════════════════════════════════════════════════
set -euo pipefail

KOK="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PATENT_DIZIN="${PATENT_DIZIN:-/var/www/patent}"
PATENT_REPO="${PATENT_REPO:-https://github.com/mrtunahan/patent.git}"
PATENT_DAL="${PATENT_DAL:-main}"
PATENT_PORT="${PATENT_PORT:-8001}"
PM2_AD="${PATENT_PM2_AD:-patent}"
NGINX_SITE="${NGINX_SITE:-/etc/nginx/sites-available/caku-erasmus}"
PYTHON="${PYTHON:-python3}"
PARCA_KAYNAK="$KOK/ssl-setup/patent-takip.conf"
PARCA_HEDEF="/etc/nginx/snippets/patent-takip.conf"
INCLUDE_SATIRI="include snippets/patent-takip.conf;"

dur() {
  echo "✖ $*" >&2
  exit 1
}

echo "▸ Uygulama dizini : $PATENT_DIZIN ($PATENT_REPO, $PATENT_DAL)"
echo "▸ Port / pm2 adı  : $PATENT_PORT / $PM2_AD"
echo "▸ nginx sitesi    : $NGINX_SITE"
echo

for k in git "$PYTHON" npm pm2 nginx curl; do
  command -v "$k" >/dev/null 2>&1 || dur "'$k' bulunamadı."
done
"$PYTHON" -c 'import sys; sys.exit(0 if sys.version_info >= (3, 11) else 1)' ||
  dur "Python 3.11+ gerekli ($PYTHON: $("$PYTHON" --version 2>&1))."
[ -f "$PARCA_KAYNAK" ] || dur "nginx parçası yok: $PARCA_KAYNAK"
[ -f "$NGINX_SITE" ] || dur "nginx site ayarı yok: $NGINX_SITE (NGINX_SITE ile verin)."

# ── 1) Kaynak ──
if [ -d "$PATENT_DIZIN/.git" ]; then
  echo "▸ Kaynak güncelleniyor…"
  if ! git -C "$PATENT_DIZIN" diff --quiet || ! git -C "$PATENT_DIZIN" diff --cached --quiet; then
    git -C "$PATENT_DIZIN" status --short --untracked-files=no
    dur "$PATENT_DIZIN içinde kaydedilmemiş değişiklik var; kurulum durdu."
  fi
  git -C "$PATENT_DIZIN" fetch origin "$PATENT_DAL"
  git -C "$PATENT_DIZIN" checkout -q "$PATENT_DAL" 2>/dev/null ||
    git -C "$PATENT_DIZIN" checkout -q -b "$PATENT_DAL" FETCH_HEAD
  git -C "$PATENT_DIZIN" merge --ff-only FETCH_HEAD ||
    dur "$PATENT_DIZIN ileri sarılamadı (yerel commit var); elle inceleyin."
else
  [ -e "$PATENT_DIZIN" ] && [ -n "$(ls -A "$PATENT_DIZIN" 2>/dev/null)" ] &&
    dur "$PATENT_DIZIN dolu ama git kopyası değil; elle inceleyin."
  echo "▸ Kaynak indiriliyor…"
  git clone --branch "$PATENT_DAL" "$PATENT_REPO" "$PATENT_DIZIN"
fi
echo "  sürüm: $(git -C "$PATENT_DIZIN" log --oneline -1)"

# ── 2) .env (yalnız bu anahtarlar yazılır; diğerleri korunur) ──
ENV="$PATENT_DIZIN/.env"
[ -f "$ENV" ] || cp "$PATENT_DIZIN/.env.example" "$ENV"
ayarla() {
  local anahtar="$1" deger="$2"
  if grep -qE "^${anahtar}=" "$ENV"; then
    sed -i "s|^${anahtar}=.*|${anahtar}=${deger}|" "$ENV"
  else
    printf '%s=%s\n' "$anahtar" "$deger" >>"$ENV"
  fi
}
ayarla HOST 127.0.0.1 # dışarıya açılmaz; yalnız nginx ulaşır
ayarla PORT "$PATENT_PORT"
ayarla ROOT_PATH /patent
ayarla VITE_BASE_PATH /patent/
ayarla CORS_ORIGINS ""
ayarla FRAME_ANCESTORS "\"'self'\""
echo "▸ .env ayarlandı."

# ── 3) Veritabanı yedeği + Python ortamı + şema ──
cd "$PATENT_DIZIN/backend"
[ -x .venv/bin/python ] || "$PYTHON" -m venv .venv
DB="$PATENT_DIZIN/data/patent.db"
if [ -f "$DB" ]; then
  YEDEK="$PATENT_DIZIN/data/patent-yedek-$(date +%Y%m%d-%H%M%S).db"
  # Çalışan uygulamada da tutarlı kopya (SQLite backup API'si).
  .venv/bin/python -c 'import sqlite3,sys; s=sqlite3.connect(sys.argv[1]); d=sqlite3.connect(sys.argv[2]); s.backup(d); d.close(); s.close()' "$DB" "$YEDEK"
  echo "▸ Veritabanı yedeklendi: $YEDEK"
fi
.venv/bin/pip install -q --upgrade pip
.venv/bin/pip install -q -r requirements.txt
.venv/bin/alembic upgrade head
echo "▸ Şema güncel."

# ── 4) Önyüz (/patent/ tabanıyla; VITE_BASE_PATH kök .env'den okunur) ──
cd "$PATENT_DIZIN/frontend"
npm ci --no-audit --no-fund
npm run build
echo "▸ Önyüz derlendi."

# ── 5) pm2 ──
cd "$PATENT_DIZIN/backend"
if pm2 describe "$PM2_AD" >/dev/null 2>&1; then
  pm2 restart "$PM2_AD" --update-env
else
  pm2 start "$PATENT_DIZIN/backend/.venv/bin/python" --name "$PM2_AD" \
    --cwd "$PATENT_DIZIN/backend" --interpreter none -- -m app.main
fi
pm2 save >/dev/null
for _ in $(seq 1 30); do
  curl -fsS "http://127.0.0.1:$PATENT_PORT/api/health" >/dev/null 2>&1 && break
  sleep 1
done
curl -fsS "http://127.0.0.1:$PATENT_PORT/api/health" >/dev/null 2>&1 ||
  dur "Uygulama 30 sn içinde ayağa kalkmadı. Günlük: pm2 logs $PM2_AD --lines 100"
echo "▸ Uygulama çalışıyor (127.0.0.1:$PATENT_PORT)."

# ── 6) nginx: parça + include; denetim geçmezse geri al ──
ZAMAN="$(date +%Y%m%d-%H%M%S)"
mkdir -p /etc/nginx/snippets
[ -f "$PARCA_HEDEF" ] && cp "$PARCA_HEDEF" "$PARCA_HEDEF.yedek-$ZAMAN"
sed "s|127.0.0.1:8001|127.0.0.1:$PATENT_PORT|" "$PARCA_KAYNAK" >"$PARCA_HEDEF"
SITE_YEDEK="$NGINX_SITE.yedek-$ZAMAN"
cp "$NGINX_SITE" "$SITE_YEDEK"
if grep -qF "$INCLUDE_SATIRI" "$NGINX_SITE"; then
  echo "▸ nginx site ayarında include zaten var."
else
  # HTTPS server bloğunda ilk `location ^~ /api/ {` satırının ÖNÜNE eklenir
  # (/patent/ bloğu API bloğuyla aynı sunucuda olmalı).
  grep -qE '^\s*location \^~ /api/ \{' "$NGINX_SITE" ||
    dur "$NGINX_SITE içinde 'location ^~ /api/ {' bulunamadı; include satırını elle ekleyin: $INCLUDE_SATIRI"
  awk -v satir="    $INCLUDE_SATIRI" '
    !eklendi && /^[[:space:]]*location \^~ \/api\/ \{/ { print satir; print ""; eklendi = 1 }
    { print }
  ' "$SITE_YEDEK" >"$NGINX_SITE"
  echo "▸ nginx site ayarına include eklendi."
fi
if ! nginx -t; then
  echo "✖ nginx denetimi geçmedi — ayar geri alınıyor." >&2
  cp "$SITE_YEDEK" "$NGINX_SITE"
  if [ -f "$PARCA_HEDEF.yedek-$ZAMAN" ]; then
    cp "$PARCA_HEDEF.yedek-$ZAMAN" "$PARCA_HEDEF"
  else
    rm -f "$PARCA_HEDEF"
  fi
  nginx -t && dur "nginx eski hâline döndü; hatayı yukarıda inceleyin."
  dur "nginx eski hâliyle de denetimden geçmiyor; elle inceleyin ($SITE_YEDEK)."
fi
systemctl reload nginx
echo "▸ nginx yeniden yüklendi (önceki ayar: $SITE_YEDEK)."

# ── Denetim: oturumsuz istek yetki kapısına TAKILMALI ──
# Yalnız durum kodu yetmez: 200 hem "kapı çalışmıyor, uygulama açık" (JSON)
# hem de "include etkin blokta değil, Offline Asistan sayfası döndü" (HTML)
# demek olabilir. İstek gerçek alan adıyla (SNI dahil) yerel nginx'e yapılır.
ALAN="${PATENT_ALAN:-$(grep -oE 'server_name [^;]+' "$NGINX_SITE" | head -1 | awk '{print $2}')}"
if ! grep -RqsF "$INCLUDE_SATIRI" /etc/nginx/sites-enabled/; then
  echo "⚠ /etc/nginx/sites-enabled/ altındaki hiçbir dosyada '$INCLUDE_SATIRI' yok." >&2
  echo "  Etkin site dosyası $NGINX_SITE değil olabilir:" >&2
  ls -l /etc/nginx/sites-enabled/ >&2
fi
GOVDE="$(mktemp)"
SONUC="$(curl -s -o "$GOVDE" -w '%{http_code} %{content_type}' --max-time 15 \
  --resolve "$ALAN:443:127.0.0.1" "https://$ALAN/patent/api/health" || true)"
KOD="${SONUC%% *}"
TUR="${SONUC#* }"
echo
echo "▸ Oturumsuz https://$ALAN/patent/api/health → HTTP $KOD ($TUR)"
case "$KOD" in
  401 | 403)
    rm -f "$GOVDE"
    echo "✔ Yetki kapısı devrede. Patent & FSMH Takibi hazır; modülde \"Patent & FSMH Takibi →\" ile açılır."
    ;;
  200)
    if grep -q '"status"' "$GOVDE"; then
      rm -f "$GOVDE"
      # Uygulama oturumsuz erişime AÇIK: güvenli tarafta kal.
      pm2 stop "$PM2_AD" >/dev/null 2>&1 || true
      dur "Yetki kapısı ÇALIŞMIYOR: oturumsuz istek uygulamaya ulaştı. Güvenlik için '$PM2_AD' durduruldu. Offline Asistan'ın /api/patent/yetki ucunu denetleyin: curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:3001/api/patent/yetki (401 olmalı)."
    fi
    rm -f "$GOVDE"
    dur "/patent/ isteği Offline Asistan'ın kendi sayfasına düştü: include satırı siteyi sunan HTTPS server bloğunda değil. '$INCLUDE_SATIRI' satırını '$ALAN' için 443'ü dinleyen server bloğuna elle ekleyin, sonra: nginx -t && systemctl reload nginx (yedek: $SITE_YEDEK)."
    ;;
  *)
    rm -f "$GOVDE"
    dur "Beklenmeyen yanıt (HTTP $KOD). Denetleyin: curl -sI https://$ALAN/patent/ ve nginx günlüğü (/var/log/nginx/error.log)."
    ;;
esac
