#!/bin/bash
# ============================================================
# ÇAKÜ Erasmus - Tam Kurulum Scripti
# Nginx + SSL (Self-Signed) + Proje Dağıtımı
# ============================================================
#
# Kullanım:
#   chmod +x deploy.sh
#   sudo ./deploy.sh <IP_ADRESI>
#
# Bu script şunları yapar:
#   1. Nginx kurulumu (yoksa)
#   2. SSL sertifikası oluşturma (IP adresi için)
#   3. Proje dosyalarını kopyalama
#   4. Nginx konfigürasyonu
#   5. Firewall ayarları (ufw)
#   6. Servisleri başlatma
# ============================================================

set -e

# Renk kodları
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# Root kontrolü
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}Bu script root olarak çalıştırılmalıdır!${NC}"
    echo "Kullanım: sudo ./deploy.sh <IP_ADRESI>"
    exit 1
fi

# IP adresi kontrolü
if [ -z "$1" ]; then
    echo -e "${RED}Hata: IP adresi belirtilmedi!${NC}"
    echo "Kullanım: sudo ./deploy.sh <IP_ADRESI>"
    exit 1
fi

SERVER_IP="$1"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
WEB_ROOT="/var/www/caku-erasmus"
SSL_DIR="/etc/ssl/caku-erasmus"

echo -e "${CYAN}╔══════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║  ÇAKÜ Erasmus - Sunucu Kurulum Scripti       ║${NC}"
echo -e "${CYAN}╚══════════════════════════════════════════════╝${NC}"
echo ""
echo -e "Sunucu IP:    ${YELLOW}$SERVER_IP${NC}"
echo -e "Proje Dizini: ${YELLOW}$PROJECT_DIR${NC}"
echo -e "Web Dizini:   ${YELLOW}$WEB_ROOT${NC}"
echo ""

# ── Adım 1: Sistem Güncelleme & Nginx Kurulumu ──
echo -e "${BLUE}[1/6] Sistem güncelleniyor ve Nginx kuruluyor...${NC}"
apt-get update -qq
apt-get install -y -qq nginx openssl ufw > /dev/null 2>&1
echo -e "${GREEN}  ✓ Nginx ve bağımlılıklar kuruldu${NC}"

# ── Adım 2: SSL Sertifikası Oluştur ──
echo -e "${BLUE}[2/6] SSL sertifikası oluşturuluyor...${NC}"
bash "$SCRIPT_DIR/generate-ssl.sh" "$SERVER_IP"
echo -e "${GREEN}  ✓ SSL sertifikası oluşturuldu${NC}"

# ── Adım 3: Proje Dosyalarını Kopyala ──
echo -e "${BLUE}[3/6] Proje dosyaları kopyalanıyor...${NC}"
mkdir -p "$WEB_ROOT"

# Ana dosyaları kopyala
cp "$PROJECT_DIR/index.html" "$WEB_ROOT/"
cp "$PROJECT_DIR"/*.jsx "$WEB_ROOT/" 2>/dev/null || true
cp "$PROJECT_DIR"/*.png "$WEB_ROOT/" 2>/dev/null || true
cp "$PROJECT_DIR"/*.ico "$WEB_ROOT/" 2>/dev/null || true
cp "$PROJECT_DIR"/*.json "$WEB_ROOT/" 2>/dev/null || true

# duyurular dizinini kopyala
if [ -d "$PROJECT_DIR/duyurular" ]; then
    cp -r "$PROJECT_DIR/duyurular" "$WEB_ROOT/"
fi

# Dosya sahipliğini ayarla
chown -R www-data:www-data "$WEB_ROOT"
chmod -R 755 "$WEB_ROOT"
echo -e "${GREEN}  ✓ Proje dosyaları kopyalandı${NC}"

# ── Adım 4: Nginx Konfigürasyonu ──
echo -e "${BLUE}[4/6] Nginx yapılandırılıyor...${NC}"
cp "$SCRIPT_DIR/nginx-ssl.conf" /etc/nginx/sites-available/caku-erasmus

# Default site'ı kaldır (varsa)
rm -f /etc/nginx/sites-enabled/default

# Sembolik link oluştur
ln -sf /etc/nginx/sites-available/caku-erasmus /etc/nginx/sites-enabled/

# Nginx konfigürasyonunu test et
nginx -t
echo -e "${GREEN}  ✓ Nginx yapılandırması tamamlandı${NC}"

# ── Adım 5: Firewall Ayarları ──
echo -e "${BLUE}[5/6] Firewall yapılandırılıyor...${NC}"
ufw allow 'Nginx Full' > /dev/null 2>&1 || true
ufw allow 22/tcp > /dev/null 2>&1 || true
echo -e "${GREEN}  ✓ Firewall kuralları eklendi (80, 443, 22)${NC}"

# ── Adım 6: Servisleri Başlat ──
echo -e "${BLUE}[6/6] Servisler başlatılıyor...${NC}"
systemctl enable nginx
systemctl restart nginx
echo -e "${GREEN}  ✓ Nginx başlatıldı${NC}"

echo ""
echo -e "${CYAN}╔══════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║       Kurulum Başarıyla Tamamlandı!          ║${NC}"
echo -e "${CYAN}╚══════════════════════════════════════════════╝${NC}"
echo ""
echo -e "Sitenize şu adreslerden erişebilirsiniz:"
echo ""
echo -e "  HTTP:  ${YELLOW}http://$SERVER_IP${NC}  (otomatik HTTPS'e yönlendirilir)"
echo -e "  HTTPS: ${GREEN}https://$SERVER_IP${NC}"
echo ""
echo -e "${YELLOW}ÖNEMLİ NOTLAR:${NC}"
echo -e "  1. Self-signed sertifika kullanıldığı için tarayıcılar uyarı gösterecektir."
echo -e "     'Gelişmiş' > 'Siteye devam et' seçeneğini kullanın."
echo -e ""
echo -e "  2. Proje dosyalarını güncellemek için:"
echo -e "     ${CYAN}sudo cp -r /path/to/project/* $WEB_ROOT/${NC}"
echo -e "     ${CYAN}sudo systemctl reload nginx${NC}"
echo ""
