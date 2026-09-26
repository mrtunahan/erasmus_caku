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

# ⚠ BURADA `git pull` KULLANILMIYOR. Sunucudaki kopya bir dalda (ör. main)
# parked hâlde dururken başka bir dal (ör. özellik dalı) istenince git
# "You have divergent branches ... fatal: Need to specify how to reconcile"
# deyip DURUYOR: hiçbir şey çekilmiyor, derleme olmuyor, dağıtım yarım kalıyor.
# main'deki birleştirme commit'leri özellik dalında bulunmadığı için bu, iki
# dal aynı içeriği taşısa bile oluyor. Onun yerine açıkça çekip üç durumu
# ayırıyoruz: ileri sarılabilir / güvenle dalı değiştirilebilir / elle bakılmalı.
echo "▸ Kaynak çekiliyor…"
git fetch origin "$DAL"
HEDEF="$(git rev-parse FETCH_HEAD)"
ONCEKI="$(git rev-parse HEAD)"

# İzlenen dosyalarda kaydedilmemiş değişiklik varsa hiçbir şeye dokunmayız;
# sunucuda elle yapılmış bir düzeltmeyi sessizce ezmek en kötü sonuç olurdu.
if ! git diff --quiet || ! git diff --cached --quiet; then
  echo "✖ Sunucudaki kopyada kaydedilmemiş değişiklikler var — dağıtım durdu."
  git status --short --untracked-files=no
  echo
  echo "  Saklamak için : git stash"
  echo "  Atmak için    : git checkout -- ."
  exit 1
fi

if git merge-base --is-ancestor HEAD "$HEDEF"; then
  git merge --ff-only "$HEDEF"
elif [ -n "$(git branch -r --contains HEAD 2>/dev/null)" ]; then
  # Kopyanın kendine ait commit'i yok; yalnız BAŞKA bir yayınlanmış dalda
  # duruyor. İstenen dalın ucuna geçmek veri kaybettirmez.
  echo "▸ Kopya '$(git rev-parse --abbrev-ref HEAD)' dalındaydı, '$DAL' ucuna geçiliyor…"
  git checkout -B "$DAL" "$HEDEF"
else
  echo "✖ Sunucudaki kopyada yalnız burada duran commit'ler var — dağıtım durdu."
  echo "  Bunlar '$DAL' dalında yok:"
  # --not --remotes: yalnız hiçbir uzak dalda bulunmayanlar. Yoksa main'in
  # birleştirme commit'leri de "yalnız burada" gibi görünüyordu.
  git log --oneline "$HEDEF"..HEAD --not --remotes
  echo
  echo "  Gerekiyorsa önce gönderin, gerekmiyorsa:"
  echo "    git checkout -B \"$DAL\" $HEDEF"
  exit 1
fi

# Bağımlılıklar yalnız gerçekten değiştiyse kurulur; her dağıtımda
# npm install çalıştırmak dakikalarca sürüyor ve çoğu zaman gereksiz.
# (HEAD@{1} yerine çekimden ÖNCE saklanan sha kullanılıyor: reflog dal
# değiştirince yanlış noktayı gösteriyor ve kurulum atlanabiliyordu.)
if ! git diff --quiet "$ONCEKI" HEAD -- package.json package-lock.json 2>/dev/null; then
  echo "▸ Bağımlılıklar değişmiş, kuruluyor…"
  npm install
else
  echo "▸ Bağımlılıklar değişmemiş, atlanıyor."
fi

echo "▸ Derleniyor…"
npm run build

# Hangi sürümün yayında olduğunu dağıtımın sonunda yazdırırız: "güncelledim
# ama değişmedi" sorusunun ilk cevabı budur. Tarayıcıda görünen sürüm
# (uygulamanın altındaki damga) buradakinden eskiyse sorun sunucuda değil,
# tarayıcının önbelleğindedir — uygulama da bu durumda "yenileyin" şeridini
# gösterir.
echo "▸ Yayındaki sürüm: $(cat dist/surum.json 2>/dev/null || echo 'surum.json yok')"

echo "▸ Sunucu yeniden başlatılıyor…"
pm2 restart "$PM2_AD" --update-env

echo
echo "✓ Dağıtım tamam — $(git rev-parse --short HEAD) ($(git log -1 --format=%s))"
