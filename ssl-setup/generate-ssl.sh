#!/bin/bash
# ============================================================
# Self-Signed SSL Sertifikası Oluşturma (IP Adresi İçin)
# Domain olmadan, sadece IP adresi ile HTTPS kullanmak için
# ============================================================
#
# Kullanım:
#   chmod +x generate-ssl.sh
#   sudo ./generate-ssl.sh 192.168.1.100
#
# Parametreler:
#   $1 = Sunucu IP adresi (zorunlu)
#
# ============================================================

set -e

# Renk kodları
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# IP adresi kontrolü
if [ -z "$1" ]; then
    echo -e "${RED}Hata: IP adresi belirtilmedi!${NC}"
    echo ""
    echo "Kullanım: sudo ./generate-ssl.sh <IP_ADRESI>"
    echo "Örnek:    sudo ./generate-ssl.sh 192.168.1.100"
    exit 1
fi

SERVER_IP="$1"
SSL_DIR="/etc/ssl/caku-erasmus"
DAYS_VALID=365

# IP adresi formatı doğrulama
if ! echo "$SERVER_IP" | grep -qE '^[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}$'; then
    echo -e "${RED}Hata: Geçersiz IP adresi formatı: $SERVER_IP${NC}"
    exit 1
fi

echo -e "${BLUE}============================================${NC}"
echo -e "${BLUE}  ÇAKÜ Erasmus - SSL Sertifika Oluşturucu  ${NC}"
echo -e "${BLUE}============================================${NC}"
echo ""
echo -e "${YELLOW}Sunucu IP: $SERVER_IP${NC}"
echo -e "${YELLOW}Geçerlilik: $DAYS_VALID gün${NC}"
echo ""

# SSL dizini oluştur
echo -e "${GREEN}[1/4] SSL dizini oluşturuluyor...${NC}"
mkdir -p "$SSL_DIR"

# OpenSSL konfigürasyon dosyası oluştur (IP için SAN gerekli)
echo -e "${GREEN}[2/4] OpenSSL konfigürasyonu hazırlanıyor...${NC}"
cat > "$SSL_DIR/openssl.cnf" << EOF
[req]
default_bits       = 2048
prompt             = no
default_md         = sha256
distinguished_name = dn
x509_extensions    = v3_req

[dn]
C  = TR
ST = Cankiri
L  = Cankiri
O  = Cankiri Karatekin Universitesi
OU = Erasmus Koordinatorlugu
CN = $SERVER_IP

[v3_req]
subjectAltName = @alt_names
basicConstraints = CA:FALSE
keyUsage = digitalSignature, keyEncipherment
extendedKeyUsage = serverAuth

[alt_names]
IP.1 = $SERVER_IP
IP.2 = 127.0.0.1
DNS.1 = localhost
EOF

# Sertifika ve özel anahtar oluştur
echo -e "${GREEN}[3/4] SSL sertifikası ve anahtar oluşturuluyor...${NC}"
openssl req -x509 -nodes -days "$DAYS_VALID" -newkey rsa:2048 \
    -keyout "$SSL_DIR/server.key" \
    -out "$SSL_DIR/server.crt" \
    -config "$SSL_DIR/openssl.cnf" \
    2>/dev/null

# Dosya izinlerini ayarla
echo -e "${GREEN}[4/4] Dosya izinleri ayarlanıyor...${NC}"
chmod 600 "$SSL_DIR/server.key"
chmod 644 "$SSL_DIR/server.crt"

echo ""
echo -e "${GREEN}============================================${NC}"
echo -e "${GREEN}  SSL Sertifikası Başarıyla Oluşturuldu!    ${NC}"
echo -e "${GREEN}============================================${NC}"
echo ""
echo -e "Sertifika: ${YELLOW}$SSL_DIR/server.crt${NC}"
echo -e "Anahtar:   ${YELLOW}$SSL_DIR/server.key${NC}"
echo -e "Konfig:    ${YELLOW}$SSL_DIR/openssl.cnf${NC}"
echo ""
echo -e "${YELLOW}NOT: Bu kendinden imzalı (self-signed) bir sertifikadır.${NC}"
echo -e "${YELLOW}Tarayıcılar güvenlik uyarısı gösterecektir.${NC}"
echo -e "${YELLOW}Uyarıyı geçmek için 'Gelişmiş > Devam Et' seçeneğini kullanın.${NC}"
echo ""

# Sertifika bilgilerini göster
echo -e "${BLUE}Sertifika Bilgileri:${NC}"
openssl x509 -in "$SSL_DIR/server.crt" -noout -subject -dates -ext subjectAltName 2>/dev/null || true
echo ""
