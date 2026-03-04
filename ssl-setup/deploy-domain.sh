#!/bin/bash
# ============================================================
# ÇAKÜ Erasmus - Alan Adı ile Kurulum Scripti
# Nginx + Let's Encrypt SSL + Proje Dağıtımı
# ============================================================
#
# Ön koşul: DNS kaydında offlineasistan.com.tr -> sunucu IP'si
#            ayarlanmış olmalıdır.
#
# Kullanım:
#   chmod +x deploy-domain.sh
#   sudo ./deploy-domain.sh
#
# Bu script şunları yapar:
#   1. Nginx kurulumu
#   2. Certbot (Let's Encrypt) kurulumu
#   3. Proje dosyalarını kopyalama
#   4. Nginx konfigürasyonu
#   5. SSL sertifikası alma (Let's Encrypt)
#   6. Otomatik yenileme ayarı
#   7. Firewall ayarları
# ============================================================

set -e

DOMAIN="offlineasistan.com.tr"

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
    echo "Kullanım: sudo ./deploy-domain.sh"
    exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
WEB_ROOT="/var/www/caku-erasmus"

echo -e "${CYAN}╔══════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║  ÇAKÜ Erasmus - Domain Kurulum Scripti       ║${NC}"
echo -e "${CYAN}╚══════════════════════════════════════════════╝${NC}"
echo ""
echo -e "Alan Adı:     ${YELLOW}$DOMAIN${NC}"
echo -e "Proje Dizini: ${YELLOW}$PROJECT_DIR${NC}"
echo -e "Web Dizini:   ${YELLOW}$WEB_ROOT${NC}"
echo ""

# ── DNS kontrolü ──
echo -e "${BLUE}[0/7] DNS kaydı kontrol ediliyor...${NC}"
RESOLVED_IP=$(dig +short "$DOMAIN" 2>/dev/null || true)
if [ -z "$RESOLVED_IP" ]; then
    echo -e "${RED}  ✗ $DOMAIN için DNS kaydı bulunamadı!${NC}"
    echo -e "${YELLOW}  DNS sağlayıcınızda A kaydı eklemeniz gerekiyor:${NC}"
    echo -e "    Tür: A"
    echo -e "    Ad:  @ (veya $DOMAIN)"
    echo -e "    IP:  $(curl -s ifconfig.me 2>/dev/null || echo '<SUNUCU_IP>')"
    echo ""
    echo -e "${YELLOW}  www alt alan adı için de:${NC}"
    echo -e "    Tür: A (veya CNAME)"
    echo -e "    Ad:  www"
    echo -e "    IP:  $(curl -s ifconfig.me 2>/dev/null || echo '<SUNUCU_IP>')"
    echo ""
    read -p "DNS ayarını yaptıysanız devam etmek için Enter'a basın (Ctrl+C ile iptal)... "
else
    echo -e "${GREEN}  ✓ $DOMAIN -> $RESOLVED_IP${NC}"
fi

# ── Adım 1: Sistem Güncelleme & Nginx Kurulumu ──
echo -e "${BLUE}[1/7] Sistem güncelleniyor ve Nginx kuruluyor...${NC}"
apt-get update -qq
apt-get install -y -qq nginx ufw > /dev/null 2>&1
echo -e "${GREEN}  ✓ Nginx kuruldu${NC}"

# ── Adım 2: Certbot (Let's Encrypt) Kurulumu ──
echo -e "${BLUE}[2/7] Certbot kuruluyor...${NC}"
apt-get install -y -qq certbot python3-certbot-nginx > /dev/null 2>&1
echo -e "${GREEN}  ✓ Certbot kuruldu${NC}"

# ── Adım 3: Proje Dosyalarını Kopyala ──
echo -e "${BLUE}[3/7] Proje dosyaları kopyalanıyor...${NC}"
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

# ── Adım 4: Geçici Nginx Konfigürasyonu (HTTP, SSL öncesi) ──
echo -e "${BLUE}[4/7] Nginx yapılandırılıyor (HTTP)...${NC}"
cat > /etc/nginx/sites-available/caku-erasmus << 'NGINX_TEMP'
server {
    listen 80;
    listen [::]:80;
    server_name offlineasistan.com.tr www.offlineasistan.com.tr;
    root /var/www/caku-erasmus;
    index index.html;

    location /.well-known/acme-challenge/ {
        root /var/www/caku-erasmus;
    }

    location / {
        try_files $uri $uri/ /index.html;
    }
}
NGINX_TEMP

rm -f /etc/nginx/sites-enabled/default
ln -sf /etc/nginx/sites-available/caku-erasmus /etc/nginx/sites-enabled/
nginx -t
systemctl restart nginx
echo -e "${GREEN}  ✓ Geçici HTTP konfigürasyonu hazır${NC}"

# ── Adım 5: Firewall Ayarları ──
echo -e "${BLUE}[5/7] Firewall yapılandırılıyor...${NC}"
ufw allow 'Nginx Full' > /dev/null 2>&1 || true
ufw allow 22/tcp > /dev/null 2>&1 || true
echo -e "${GREEN}  ✓ Firewall kuralları eklendi (80, 443, 22)${NC}"

# ── Adım 6: Let's Encrypt SSL Sertifikası Al ──
echo -e "${BLUE}[6/7] SSL sertifikası alınıyor (Let's Encrypt)...${NC}"
certbot --nginx \
    -d "$DOMAIN" \
    -d "www.$DOMAIN" \
    --non-interactive \
    --agree-tos \
    --redirect \
    --email admin@"$DOMAIN" \
    || {
        echo -e "${YELLOW}  ! Otomatik sertifika alınamadı. Manuel olarak deneyin:${NC}"
        echo -e "    sudo certbot --nginx -d $DOMAIN -d www.$DOMAIN"
        echo ""
        echo -e "${YELLOW}  Şimdilik HTTP ile devam ediliyor...${NC}"
    }

# ── Adım 7: Tam HTTPS Nginx Konfigürasyonu ──
echo -e "${BLUE}[7/7] Son Nginx konfigürasyonu uygulanıyor...${NC}"
if [ -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ]; then
    cp "$SCRIPT_DIR/nginx-domain.conf" /etc/nginx/sites-available/caku-erasmus
    nginx -t && systemctl restart nginx
    echo -e "${GREEN}  ✓ HTTPS konfigürasyonu aktif${NC}"
else
    echo -e "${YELLOW}  ! SSL sertifikası bulunamadı, HTTP konfigürasyonu kullanılıyor${NC}"
fi

# ── Otomatik Yenileme Kontrolü ──
echo -e "${BLUE}Certbot otomatik yenileme test ediliyor...${NC}"
certbot renew --dry-run 2>/dev/null && echo -e "${GREEN}  ✓ Otomatik yenileme çalışıyor${NC}" || true

echo ""
echo -e "${CYAN}╔══════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║       Kurulum Başarıyla Tamamlandı!          ║${NC}"
echo -e "${CYAN}╚══════════════════════════════════════════════╝${NC}"
echo ""
echo -e "Sitenize şu adresten erişebilirsiniz:"
echo -e "  ${GREEN}https://$DOMAIN${NC}"
echo ""
echo -e "${YELLOW}ÖNEMLİ: Firebase Console'da şu ayarları yapın:${NC}"
echo -e "  1. Firebase Console > Authentication > Settings > Authorized domains"
echo -e "     ${CYAN}$DOMAIN${NC} ekleyin"
echo ""
echo -e "  2. Proje dosyalarını güncellemek için:"
echo -e "     ${CYAN}sudo cp -r $PROJECT_DIR/* $WEB_ROOT/${NC}"
echo -e "     ${CYAN}sudo systemctl reload nginx${NC}"
echo ""
echo -e "  3. SSL sertifikası otomatik olarak yenilenir (90 günde bir)"
echo ""
