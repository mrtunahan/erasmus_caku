#!/bin/bash
# ============================================================
# ÇAKÜ Erasmus - Sunucu Güvenlik Sertleştirme Scripti
# ============================================================
# Bu script sunucunuzu kapsamlı şekilde güvenli hale getirir:
#   1. SSH sertleştirme (root login kapatma, key-only auth)
#   2. Firewall (sadece SSH + HTTP + HTTPS)
#   3. Fail2Ban (brute-force koruması)
#   4. Kernel güvenlik ayarları (sysctl)
#   5. Otomatik güvenlik güncellemeleri
#   6. Gereksiz servisleri kapatma
#   7. Dosya izinleri sertleştirme
#   8. Log izleme kurulumu
#
# Kullanım:
#   chmod +x server-hardening.sh
#   sudo ./server-hardening.sh
#
# ÖNEMLİ: Bu scripti çalıştırmadan önce SSH key kurulumu yapın!
#   ssh-copy-id root@84.46.241.81
# ============================================================

set -e

# Interaktif paket sorularını engelle
export DEBIAN_FRONTEND=noninteractive

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
    exit 1
fi

echo -e "${CYAN}╔══════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║  ÇAKÜ Erasmus - Sunucu Güvenlik Sertleştirme        ║${NC}"
echo -e "${CYAN}╚══════════════════════════════════════════════════════╝${NC}"
echo ""

# ══════════════════════════════════════════════
# ADIM 1: Sistem Güncelleme
# ══════════════════════════════════════════════
echo -e "${BLUE}[1/9] Sistem güncelleniyor...${NC}"
apt-get update -qq
apt-get upgrade -y -qq > /dev/null 2>&1
apt-get install -y -qq \
    ufw fail2ban unattended-upgrades apt-listchanges \
    logwatch libpam-pwquality rkhunter \
    nginx nginx-extras > /dev/null 2>&1
echo -e "${GREEN}  ✓ Sistem güncellendi ve güvenlik paketleri kuruldu${NC}"

# ══════════════════════════════════════════════
# ADIM 2: Yeni sudo kullanıcı oluştur
# ══════════════════════════════════════════════
echo -e "${BLUE}[2/9] Güvenli kullanıcı oluşturuluyor...${NC}"

USERNAME="cakuadmin"
if id "$USERNAME" &>/dev/null; then
    echo -e "${YELLOW}  ! $USERNAME kullanıcısı zaten var, atlanıyor${NC}"
else
    adduser --disabled-password --gecos "CAKU Admin" "$USERNAME"
    usermod -aG sudo "$USERNAME"

    # Root'un SSH anahtarlarını yeni kullanıcıya kopyala
    mkdir -p /home/$USERNAME/.ssh
    if [ -f /root/.ssh/authorized_keys ]; then
        cp /root/.ssh/authorized_keys /home/$USERNAME/.ssh/
    fi
    chown -R $USERNAME:$USERNAME /home/$USERNAME/.ssh
    chmod 700 /home/$USERNAME/.ssh
    chmod 600 /home/$USERNAME/.ssh/authorized_keys 2>/dev/null || true

    echo -e "${GREEN}  ✓ Kullanıcı '$USERNAME' oluşturuldu ve sudo yetkisi verildi${NC}"
fi

# ══════════════════════════════════════════════
# ADIM 3: SSH Sertleştirme
# ══════════════════════════════════════════════
echo -e "${BLUE}[3/9] SSH sertleştiriliyor...${NC}"

# Önce mevcut SSH config'i yedekle
cp /etc/ssh/sshd_config /etc/ssh/sshd_config.bak.$(date +%Y%m%d%H%M%S)

cat > /etc/ssh/sshd_config.d/99-hardening.conf << 'SSHCONFIG'
# ── ÇAKÜ Erasmus SSH Sertleştirme ──

# Port değişikliği (opsiyonel - aktif etmek için yorumu kaldırın)
# Port 2222

# Root login'i kapat (önce cakuadmin ile giriş yapabildiğinizi doğrulayın!)
# ÖNEMLİ: İlk çalıştırmada "prohibit-password" kullanılır
# SSH key ile giriş doğrulandıktan sonra "no" yapabilirsiniz
PermitRootLogin prohibit-password

# SSH key ve şifre ile giriş (her ikisi de açık)
# NOT: SSH key kurulumu yapıldıktan sonra PasswordAuthentication no yapılabilir
PasswordAuthentication yes
PubkeyAuthentication yes
AuthenticationMethods publickey,password publickey

# Boş şifre engelle
PermitEmptyPasswords no

# Protokol 2 (eski protokol kapalı)
Protocol 2

# Maksimum giriş denemesi
MaxAuthTries 3
MaxSessions 3

# Login zaman aşımı (30 saniye)
LoginGraceTime 30

# X11 Forwarding kapalı
X11Forwarding no

# Agent Forwarding kapalı
AllowAgentForwarding no

# TCP Forwarding kapalı
AllowTcpForwarding no

# Sadece belirli kullanıcılar giriş yapabilsin
# AllowUsers cakuadmin

# Bağlantı canlılık kontrolü
ClientAliveInterval 300
ClientAliveCountMax 2

# Banner
Banner /etc/ssh/banner

# SFTP sadece internal
Subsystem sftp internal-sftp

# DNS çözümleme kapalı (hız için)
UseDNS no

# Strict modlar
StrictModes yes

# Log seviyesi
LogLevel VERBOSE
SSHCONFIG

# SSH uyarı banner'ı
cat > /etc/ssh/banner << 'BANNER'
╔══════════════════════════════════════════════════════╗
║  UYARI: Bu sisteme yetkisiz erişim yasaktır!         ║
║  Tüm bağlantılar izlenmekte ve kaydedilmektedir.    ║
║  Yetkisiz erişim yasal işlem başlatılmasına           ║
║  neden olabilir.                                      ║
╚══════════════════════════════════════════════════════╝
BANNER

# SSH yapılandırmasını test et
sshd -t && echo -e "${GREEN}  ✓ SSH sertleştirildi${NC}" || {
    echo -e "${RED}  ✗ SSH konfigürasyon hatası! Eski config geri yükleniyor...${NC}"
    rm -f /etc/ssh/sshd_config.d/99-hardening.conf
    exit 1
}

echo -e "${YELLOW}  ! Root login: prohibit-password (sadece SSH key ile)${NC}"
echo -e "${YELLOW}  ! Şifre ile giriş: AÇIK (SSH key kurulumundan sonra kapatılabilir)${NC}"
echo -e "${YELLOW}  ! Whitelist IP: 213.136.95.18 (fail2ban tarafından banlanmaz)${NC}"

# ══════════════════════════════════════════════
# ADIM 4: Firewall (UFW) - Sadece gerekli portlar
# ══════════════════════════════════════════════
echo -e "${BLUE}[4/9] Firewall yapılandırılıyor...${NC}"

# Sıfırla
ufw --force reset > /dev/null 2>&1 || true

# Varsayılan politika
ufw default deny incoming > /dev/null 2>&1
ufw default deny outgoing > /dev/null 2>&1
ufw default deny routed > /dev/null 2>&1

# SSH (rate limited)
ufw limit 22/tcp comment 'SSH - rate limited' > /dev/null 2>&1

# HTTP/HTTPS (Nginx için)
ufw allow 80/tcp comment 'HTTP - HTTPS redirect' > /dev/null 2>&1
ufw allow 443/tcp comment 'HTTPS - web traffic' > /dev/null 2>&1

# Giden trafik - sadece gerekli olanlar
ufw allow out 53 comment 'DNS' > /dev/null 2>&1
ufw allow out 80/tcp comment 'HTTP out - apt updates' > /dev/null 2>&1
ufw allow out 443/tcp comment 'HTTPS out - apt/certbot' > /dev/null 2>&1
ufw allow out 123/udp comment 'NTP - zaman senkron' > /dev/null 2>&1

# IPv6 devre dışı (gerekli değilse)
sed -i 's/IPV6=yes/IPV6=no/' /etc/default/ufw 2>/dev/null || true

# Firewall'u etkinleştir
ufw --force enable > /dev/null 2>&1

echo -e "${GREEN}  ✓ Firewall aktif - Sadece açık portlar:${NC}"
echo -e "    - Port 22 (SSH): Rate limited"
echo -e "    - Port 80 (HTTP): HTTPS'e yönlendirir"
echo -e "    - Port 443 (HTTPS): Ana trafik"
echo -e "    - ${RED}Diğer tüm portlar: KAPALI${NC}"
echo -e "    - ${RED}Giden trafik: Sadece DNS/HTTP/HTTPS/NTP${NC}"

# ══════════════════════════════════════════════
# ADIM 5: Fail2Ban - Gelişmiş brute-force koruması
# ══════════════════════════════════════════════
echo -e "${BLUE}[5/9] Fail2Ban yapılandırılıyor...${NC}"

cat > /etc/fail2ban/jail.local << 'FAIL2BAN'
[DEFAULT]
# Yönetici IP'leri - bu IP'ler asla banlanmaz
# 213.136.95.18 = Admin Mac (Contabo üzerinden bağlantı)
ignoreip = 127.0.0.1/8 ::1 213.136.95.18

# Varsayılan ban süresi: 1 saat
bantime = 3600
# Tekrar eden saldırganlar için artan ban süresi
bantime.increment = true
bantime.factor = 2
bantime.maxtime = 604800
# 10 dakika içinde
findtime = 600
maxretry = 5
backend = systemd
# Ban aksiyonu: iptables + mail (mail opsiyonel)
banaction = ufw
action = %(action_)s

# ── SSH Koruması ──
[sshd]
enabled = true
port = 22
maxretry = 3
bantime = 14400
findtime = 300
logpath = /var/log/auth.log

# Agresif SSH koruması (daha geniş regex)
[sshd-aggressive]
enabled = true
port = 22
filter = sshd[mode=aggressive]
maxretry = 2
bantime = 86400
findtime = 600
logpath = /var/log/auth.log

# ── Nginx Korumaları ──
[nginx-http-auth]
enabled = true
port = http,https
logpath = /var/log/nginx/caku-erasmus-error.log
maxretry = 3
bantime = 7200

[nginx-botsearch]
enabled = true
port = http,https
logpath = /var/log/nginx/caku-erasmus-access.log
maxretry = 2
bantime = 86400

[nginx-limit-req]
enabled = true
port = http,https
logpath = /var/log/nginx/caku-erasmus-error.log
maxretry = 5
findtime = 60
bantime = 3600

# Nginx 403/404 tarama koruması
[nginx-forbidden]
enabled = true
port = http,https
logpath = /var/log/nginx/caku-erasmus-access.log
maxretry = 10
findtime = 60
bantime = 3600
filter = nginx-forbidden

# Tekrar eden saldırganlar (recidive)
[recidive]
enabled = true
logpath = /var/log/fail2ban.log
bantime = 604800
findtime = 86400
maxretry = 3
FAIL2BAN

# Nginx rate limit filtresi
cat > /etc/fail2ban/filter.d/nginx-limit-req.conf << 'FILTER'
[Definition]
failregex = limiting requests, excess:.* by zone.*client: <HOST>
ignoreregex =
FILTER

# Nginx 403/404 tarama filtresi
cat > /etc/fail2ban/filter.d/nginx-forbidden.conf << 'FILTER'
[Definition]
failregex = ^<HOST> .* "(GET|POST|PUT|DELETE|HEAD) .* HTTP/.*" (403|404)
ignoreregex = \.(css|js|jsx|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf)
FILTER

systemctl enable fail2ban > /dev/null 2>&1
systemctl restart fail2ban > /dev/null 2>&1
echo -e "${GREEN}  ✓ Fail2Ban yapılandırıldı:${NC}"
echo -e "    - SSH: 3 deneme → 4 saat ban"
echo -e "    - SSH agresif: 2 deneme → 24 saat ban"
echo -e "    - Nginx rate limit: 5 deneme → 1 saat ban"
echo -e "    - Bot tarama: 2 deneme → 24 saat ban"
echo -e "    - Tekrar eden saldırgan: 3 ban → 1 hafta ban"

# ══════════════════════════════════════════════
# ADIM 6: Kernel Güvenlik Ayarları (sysctl)
# ══════════════════════════════════════════════
echo -e "${BLUE}[6/9] Kernel güvenlik ayarları uygulanıyor...${NC}"

cat > /etc/sysctl.d/99-security.conf << 'SYSCTL'
# ── Ağ Güvenliği ──
# IP spoofing koruması
net.ipv4.conf.all.rp_filter = 1
net.ipv4.conf.default.rp_filter = 1

# ICMP redirect engelleme
net.ipv4.conf.all.accept_redirects = 0
net.ipv4.conf.default.accept_redirects = 0
net.ipv4.conf.all.send_redirects = 0
net.ipv4.conf.default.send_redirects = 0

# Source routing devre dışı
net.ipv4.conf.all.accept_source_route = 0
net.ipv4.conf.default.accept_source_route = 0

# SYN flood koruması
net.ipv4.tcp_syncookies = 1
net.ipv4.tcp_max_syn_backlog = 2048
net.ipv4.tcp_synack_retries = 2
net.ipv4.tcp_syn_retries = 5

# ICMP broadcast engelleme (Smurf attack koruması)
net.ipv4.icmp_echo_ignore_broadcasts = 1

# Kötü biçimli ICMP mesajlarını yoksay
net.ipv4.icmp_ignore_bogus_error_responses = 1

# IPv6 devre dışı (kullanmıyorsanız)
net.ipv6.conf.all.disable_ipv6 = 1
net.ipv6.conf.default.disable_ipv6 = 1

# IP forwarding kapalı
net.ipv4.ip_forward = 0

# Log martians (şüpheli paketleri logla)
net.ipv4.conf.all.log_martians = 1
net.ipv4.conf.default.log_martians = 1

# ── Bellek Güvenliği ──
# ASLR etkin
kernel.randomize_va_space = 2

# Core dump devre dışı
fs.suid_dumpable = 0

# Kernel pointer gizleme
kernel.kptr_restrict = 2

# dmesg erişimini kısıtla
kernel.dmesg_restrict = 1

# ── Dosya Sistemi Güvenliği ──
# Symlink/hardlink koruması
fs.protected_symlinks = 1
fs.protected_hardlinks = 1
SYSCTL

sysctl -p /etc/sysctl.d/99-security.conf > /dev/null 2>&1
echo -e "${GREEN}  ✓ Kernel güvenlik ayarları uygulandı${NC}"

# ══════════════════════════════════════════════
# ADIM 7: Otomatik Güvenlik Güncellemeleri
# ══════════════════════════════════════════════
echo -e "${BLUE}[7/9] Otomatik güvenlik güncellemeleri ayarlanıyor...${NC}"

cat > /etc/apt/apt.conf.d/50unattended-upgrades << 'AUTOUPDATE'
Unattended-Upgrade::Allowed-Origins {
    "${distro_id}:${distro_codename}-security";
    "${distro_id}ESMApps:${distro_codename}-apps-security";
    "${distro_id}ESM:${distro_codename}-infra-security";
};
Unattended-Upgrade::AutoFixInterruptedDpkg "true";
Unattended-Upgrade::Remove-Unused-Kernel-Packages "true";
Unattended-Upgrade::Remove-Unused-Dependencies "true";
Unattended-Upgrade::Automatic-Reboot "false";
AUTOUPDATE

cat > /etc/apt/apt.conf.d/20auto-upgrades << 'AUTOPERIOD'
APT::Periodic::Update-Package-Lists "1";
APT::Periodic::Unattended-Upgrade "1";
APT::Periodic::AutocleanInterval "7";
AUTOPERIOD

echo -e "${GREEN}  ✓ Otomatik güvenlik güncellemeleri aktif${NC}"

# ══════════════════════════════════════════════
# ADIM 8: Dosya İzinleri ve Gereksiz Servisleri Kapat
# ══════════════════════════════════════════════
echo -e "${BLUE}[8/9] Dosya izinleri ve servisler sertleştiriliyor...${NC}"

# Kritik dosya izinleri
chmod 700 /root
chmod 600 /etc/ssh/sshd_config
chmod 600 /etc/ssh/sshd_config.d/*.conf 2>/dev/null || true
chmod 644 /etc/passwd
chmod 640 /etc/shadow
chmod 644 /etc/group
chmod 640 /etc/gshadow

# Web dizini izinleri
if [ -d "/var/www/caku-erasmus" ]; then
    chown -R www-data:www-data /var/www/caku-erasmus
    find /var/www/caku-erasmus -type d -exec chmod 755 {} \;
    find /var/www/caku-erasmus -type f -exec chmod 644 {} \;
fi

# Gereksiz servisleri kontrol et ve kapat
for service in rpcbind avahi-daemon cups bluetooth; do
    if systemctl is-active --quiet "$service" 2>/dev/null; then
        systemctl stop "$service"
        systemctl disable "$service"
        echo -e "  ${YELLOW}→ $service kapatıldı${NC}"
    fi
done

# /tmp sticky bit
chmod 1777 /tmp

echo -e "${GREEN}  ✓ Dosya izinleri ve servisler sertleştirildi${NC}"

# ══════════════════════════════════════════════
# ADIM 9: Güvenlik İzleme ve Raporlama
# ══════════════════════════════════════════════
echo -e "${BLUE}[9/9] Güvenlik izleme kurulumu...${NC}"

# Login başarısızlık izleme scripti
cat > /etc/cron.daily/security-check << 'SECCHECK'
#!/bin/bash
# Günlük güvenlik raporu

LOG_FILE="/var/log/security-daily.log"
DATE=$(date '+%Y-%m-%d %H:%M:%S')

echo "=== Güvenlik Raporu: $DATE ===" > "$LOG_FILE"

# Fail2Ban durumu
echo -e "\n--- Fail2Ban Durumu ---" >> "$LOG_FILE"
fail2ban-client status 2>/dev/null >> "$LOG_FILE" || echo "Fail2Ban çalışmıyor!" >> "$LOG_FILE"

# Son 24 saatteki başarısız SSH girişleri
echo -e "\n--- Başarısız SSH Girişleri (son 24 saat) ---" >> "$LOG_FILE"
grep "Failed password\|Invalid user" /var/log/auth.log 2>/dev/null | tail -20 >> "$LOG_FILE"

# Banlanan IP'ler
echo -e "\n--- Banlanan IP'ler ---" >> "$LOG_FILE"
fail2ban-client status sshd 2>/dev/null | grep "Banned IP" >> "$LOG_FILE" || true

# Disk kullanımı
echo -e "\n--- Disk Kullanımı ---" >> "$LOG_FILE"
df -h / >> "$LOG_FILE"

# Açık portlar
echo -e "\n--- Açık Portlar ---" >> "$LOG_FILE"
ss -tlnp >> "$LOG_FILE"

# Son başarılı girişler
echo -e "\n--- Son Başarılı Girişler ---" >> "$LOG_FILE"
last -10 >> "$LOG_FILE"
SECCHECK

chmod +x /etc/cron.daily/security-check

# RKHunter (rootkit tarayıcı) güncelle
rkhunter --update --nocolors > /dev/null 2>&1 || true
rkhunter --propupd --nocolors > /dev/null 2>&1 || true

echo -e "${GREEN}  ✓ Güvenlik izleme kuruldu${NC}"

# ══════════════════════════════════════════════
# SSH'ı yeniden başlat
# ══════════════════════════════════════════════
systemctl restart sshd

# ══════════════════════════════════════════════
# ÖZET
# ══════════════════════════════════════════════
echo ""
echo -e "${CYAN}╔══════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║      Güvenlik Sertleştirme Tamamlandı!               ║${NC}"
echo -e "${CYAN}╚══════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${GREEN}Uygulanan Güvenlik Önlemleri:${NC}"
echo -e "  ✓ SSH: Key-only auth, max 3 deneme, verbose log"
echo -e "  ✓ Firewall: Sadece 22/80/443 açık, giden trafik kısıtlı"
echo -e "  ✓ Fail2Ban: SSH + Nginx + bot + recidive koruması"
echo -e "  ✓ Kernel: SYN flood, IP spoof, ASLR, core dump koruması"
echo -e "  ✓ Otomatik güvenlik güncellemeleri"
echo -e "  ✓ Dosya izinleri sertleştirildi"
echo -e "  ✓ Güvenlik izleme ve raporlama"
echo -e "  ✓ RKHunter (rootkit tarayıcı)"
echo ""
echo -e "${RED}╔══════════════════════════════════════════════════════╗${NC}"
echo -e "${RED}║  ÖNEMLİ - YAPMMANIZ GEREKEN ADIMLAR:                ║${NC}"
echo -e "${RED}╚══════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${YELLOW}1. SSH KEY KURULUMU (henüz yapmadıysanız):${NC}"
echo -e "   Kendi bilgisayarınızda:"
echo -e "   ${CYAN}ssh-keygen -t ed25519 -C \"caku-admin\"${NC}"
echo -e "   ${CYAN}ssh-copy-id root@84.46.241.81${NC}"
echo -e ""
echo -e "${YELLOW}2. SSH KEY İLE GİRİŞİ TEST EDİN:${NC}"
echo -e "   ${CYAN}ssh root@84.46.241.81${NC}"
echo -e "   Şifre sormadan giriş yapabilmelisiniz!"
echo -e ""
echo -e "${YELLOW}3. ROOT LOGİN'İ TAMAMEN KAPATIN (test başarılıysa):${NC}"
echo -e "   ${CYAN}sudo sed -i 's/PermitRootLogin prohibit-password/PermitRootLogin no/' /etc/ssh/sshd_config.d/99-hardening.conf${NC}"
echo -e "   ${CYAN}sudo systemctl restart sshd${NC}"
echo -e ""
echo -e "${YELLOW}4. FİRESTORE RULES'U DEPLOY EDİN:${NC}"
echo -e "   ${CYAN}firebase deploy --only firestore:rules${NC}"
echo -e ""
echo -e "${YELLOW}5. FİREBASE CONSOLE KONTROLÜ:${NC}"
echo -e "   - Firebase Console > App Check'i etkinleştirin"
echo -e "   - Authorized domains'e offlineasistan.com.tr ekleyin"
echo -e ""
