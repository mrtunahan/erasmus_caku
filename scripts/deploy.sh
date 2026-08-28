#!/usr/bin/env bash
# ══════════════════════════════════════════════════════════════
# SUNUCUYA DAĞITIM
#
# ⚠ BU BETİK BİR HATADAN DOĞDU. Dağıtım elle üç komutla yapılıyordu:
#   git pull && npm run build && pm2 restart erasmus_caku
# Kabuk proje dizininde DEĞİLKEN (ör. /root) çalıştırıldığında ilk iki komut
# sessizce başarısız oluyor —
#   fatal: not a git repository
#   npm error path /root/package.json
# ama `pm2 restart` cwd'ye bakmadığı için BAŞARILI oluyor ve "[PM2] ✓"
# yazıyordu. Sonuç: hiçbir şey çekilmemiş, hiçbir şey derlenmemiş, ama
# dağıtım olmuş gibi görünüyordu. Değişikliklerin "yansımaması" buydu.
#
# Betik kendi dizinini bulur (nereden çağrılırsa çağrılsın doğru yerde
# çalışır) ve ilk hatada durur — yarım dağıtım olmaz.
# ══════════════════════════════════════════════════════════════
set -euo pipefail

# Betiğin bulunduğu yerin bir üstü = proje kökü. cwd'nin önemi yok.
KOK="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$KOK"

PM2_AD="${PM2_AD:-erasmus_caku}"
DAL="${1:-$(git rev-parse --abbrev-ref HEAD)}"

echo "▸ Proje    : $KOK"
echo "▸ Dal      : $DAL"
echo "▸ PM2 adı  : $PM2_AD"
echo

echo "▸ Kaynak çekiliyor…"
git pull origin "$DAL"

# Bağımlılıklar yalnız gerçekten değiştiyse kurulur; her dağıtımda
# npm install çalıştırmak dakikalarca sürüyor ve çoğu zaman gereksiz.
if ! git diff --quiet HEAD@{1} HEAD -- package.json package-lock.json 2>/dev/null; then
  echo "▸ Bağımlılıklar değişmiş, kuruluyor…"
  npm install
else
  echo "▸ Bağımlılıklar değişmemiş, atlanıyor."
fi

echo "▸ Derleniyor…"
npm run build

echo "▸ Sunucu yeniden başlatılıyor…"
pm2 restart "$PM2_AD" --update-env

echo
echo "✓ Dağıtım tamam — $(git rev-parse --short HEAD) ($(git log -1 --format=%s))"
