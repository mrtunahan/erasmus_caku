#!/usr/bin/env bash
# ══════════════════════════════════════════════════════════════
# ÇAKÜ 2026-2027 akademik takvim PDF'lerini indirir ve METNE çevirir.
# SUNUCUDA çalıştırın (üniversite sitesine erişimi olan makinede):
#     bash server/extract-akademik-takvim.sh > takvim-metin.txt
# Sonra takvim-metin.txt içeriğini bana yapıştırın; tarihleri teyit
# edip seed JSON'u dolduracağım.
#
# Gereksinim: poppler-utils (pdftotext). Kurulu değilse:
#     sudo apt-get update && sudo apt-get install -y poppler-utils
# ══════════════════════════════════════════════════════════════
set -u

BASE="https://krtknadmn.karatekin.edu.tr/files/oidb/2026"

# PDF dosya adları (URL'de boşluk %20; Türkçe harfler literal)
FILES=(
  "2026-2027%20AKADEMİK%20TAKVİM%20-%20Akademik%20TakvimTR%20%20İngilizce.pdf"
  "2026-2027%20Yılı%20Yurt%20Dışındaan%20Öğrenci%20Kabül%20Takvimi%2023.06.2026.pdf"
  "2026-2027%20AKADEMİK%20TAKVİM%20-%20Yaz%20Dönemi.pdf"
  "2026-2027%20AKADEMİK%20TAKVİM%20-%20Özel%20Yetenek.pdf"
  "2026-2027%20AKADEMİK%20TAKVİM%20-%20Merkezi%20Yerleştirme%20Puanı%20(Ek%20Madde-1)%20ile%20Yatay%20Geçiş.pdf"
  "2026-2027%20AKADEMİK%20TAKVİM%20-%20Kurumlararası%20Yatay%20Geçiş.pdf"
  "2026-2027%20AKADEMİK%20TAKVİM%20-%20Kurumiçi%20Yatay%20Geçiş.pdf"
  "2026-2027%20AKADEMİK%20TAKVİM%20-%20Çiftanadal.pdf"
)

if ! command -v pdftotext >/dev/null 2>&1; then
  echo "HATA: pdftotext bulunamadı. Kurun:  sudo apt-get install -y poppler-utils" >&2
  exit 1
fi

WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

i=0
for f in "${FILES[@]}"; do
  i=$((i + 1))
  out="$WORK/doc_$i.pdf"
  echo "════════════════════════════════════════════════════════════"
  echo "### DOSYA $i: $f"
  echo "════════════════════════════════════════════════════════════"
  if curl -fsSL "$BASE/$f" -o "$out" 2>/dev/null; then
    pdftotext -layout "$out" - 2>/dev/null || echo "(pdftotext çıkaramadı)"
  else
    echo "(indirilemedi — URL'yi tarayıcıda kontrol edin)"
  fi
  echo
done
