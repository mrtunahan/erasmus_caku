#!/bin/bash
# ============================================================
# ÇAKÜ Duyuru Güncelleme Scripti
# Üniversite duyurularını çeker ve web sitesini günceller
# ============================================================
#
# Kullanım:
#   chmod +x duyuru-guncelle.sh
#   ./duyuru-guncelle.sh              # Tüm kaynaklar
#   ./duyuru-guncelle.sh bmu          # Sadece BMU
#   ./duyuru-guncelle.sh bmu univ     # BMU + Üniversite
#   ./duyuru-guncelle.sh --debug      # Debug modunda çalıştır
#   ./duyuru-guncelle.sh --check      # Sadece bağlantı kontrolü
#
# ============================================================

set -e

# Renk kodları
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# Proje dizini (bu script'in bulunduğu yer)
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
WEB_ROOT="/var/www/caku-erasmus"
OUTPUT_FILE="$SCRIPT_DIR/duyurular/duyurular.json"

echo -e "${CYAN}╔══════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║   ÇAKÜ Duyuru Güncelleme                     ║${NC}"
echo -e "${CYAN}╚══════════════════════════════════════════════╝${NC}"
echo ""

# Python kontrolü
if ! command -v python3 &> /dev/null; then
    echo -e "${RED}Hata: python3 bulunamadı!${NC}"
    echo "Kurulum: sudo apt install python3 python3-pip"
    exit 1
fi

# Bağımlılık kontrolü
python3 -c "import requests, bs4" 2>/dev/null || {
    echo -e "${YELLOW}Bağımlılıklar kuruluyor...${NC}"
    pip3 install requests beautifulsoup4 lxml --quiet
    echo -e "${GREEN}  ✓ Bağımlılıklar kuruldu${NC}"
}

# Argümanları ayır: kaynaklar ve flagler
KAYNAKLAR=()
FLAGS=()
for arg in "$@"; do
    case "$arg" in
        --debug|--verbose|--check|--no-onbellek)
            FLAGS+=("$arg")
            ;;
        bmu|mf|univ|oidb)
            KAYNAKLAR+=("$arg")
            ;;
        *)
            echo -e "${RED}Bilinmeyen argüman: $arg${NC}"
            echo "Kullanım: $0 [bmu|mf|univ|oidb] [--debug] [--check]"
            exit 1
            ;;
    esac
done

# Komut oluştur
CMD="python3 $SCRIPT_DIR/scraper.py --output $OUTPUT_FILE --verbose"
if [ ${#KAYNAKLAR[@]} -gt 0 ]; then
    CMD="$CMD --kaynaklar ${KAYNAKLAR[*]}"
fi
for flag in "${FLAGS[@]}"; do
    CMD="$CMD $flag"
done

# Mevcut durumu göster
if [ -f "$OUTPUT_FILE" ]; then
    echo -e "${BLUE}Mevcut durum:${NC}"
    python3 -c "
import json
with open('$OUTPUT_FILE') as f:
    d = json.load(f)
m = d.get('meta', {})
print(f'  Son güncelleme: {m.get(\"son_guncelleme\", \"?\")}')
print(f'  Toplam duyuru:  {m.get(\"toplam_duyuru\", 0)}')
for k, v in m.get('kaynaklar', {}).items():
    durum = m.get('kaynak_durumlari', {}).get(k, '')
    extra = f' ({durum})' if durum else ''
    print(f'    {k}: {v} duyuru{extra}')
" 2>/dev/null || true
    echo ""
fi

# Scraper'ı çalıştır
echo -e "${BLUE}Duyurular çekiliyor...${NC}"
echo -e "${YELLOW}  \$ $CMD${NC}"
echo ""

eval "$CMD"
RESULT=$?

echo ""

if [ $RESULT -eq 0 ]; then
    echo -e "${GREEN}✓ Scraper başarıyla tamamlandı${NC}"
else
    echo -e "${YELLOW}⚠ Scraper bazı hatalarla tamamlandı (çıkış kodu: $RESULT)${NC}"
fi

# Web sunucusunu güncelle
if [ -d "$WEB_ROOT" ] && [ -f "$OUTPUT_FILE" ]; then
    echo ""
    echo -e "${BLUE}Web sunucusu güncelleniyor...${NC}"
    sudo mkdir -p "$WEB_ROOT/duyurular"
    sudo cp "$OUTPUT_FILE" "$WEB_ROOT/duyurular/duyurular.json"
    sudo chown www-data:www-data "$WEB_ROOT/duyurular/duyurular.json"
    echo -e "${GREEN}  ✓ $WEB_ROOT/duyurular/duyurular.json güncellendi${NC}"
elif [ ! -d "$WEB_ROOT" ]; then
    echo ""
    echo -e "${YELLOW}ℹ Web dizini ($WEB_ROOT) bulunamadı, sadece lokal dosya güncellendi.${NC}"
fi

# Sonuç özeti
echo ""
echo -e "${CYAN}═══════════════════════════════════════════════${NC}"
if [ -f "$OUTPUT_FILE" ]; then
    python3 -c "
import json
with open('$OUTPUT_FILE') as f:
    d = json.load(f)
m = d.get('meta', {})
print(f'Güncelleme: {m.get(\"son_guncelleme\", \"?\")[:19]}')
print(f'Toplam:     {m.get(\"toplam_duyuru\", 0)} duyuru')
for k, v in m.get('kaynaklar', {}).items():
    durum = m.get('kaynak_durumlari', {}).get(k, '')
    icon = '✓' if v > 0 else '✗'
    extra = f' [{durum}]' if durum else ''
    print(f'  {icon} {k}: {v}{extra}')
" 2>/dev/null || true
fi
echo -e "${CYAN}═══════════════════════════════════════════════${NC}"
