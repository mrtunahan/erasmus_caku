#!/bin/bash
# ============================================
# Otomatik yedekleme cron job kurulumu
# Bu scripti VPS'de bir kez çalıştır:
#   bash scripts/setup-backup-cron.sh
# ============================================

SCRIPT_PATH="/var/www/erasmus_caku/scripts/backup-mongodb.sh"
LOG_PATH="/var/www/erasmus_caku/mongo-backups/backup.log"

# Script'i çalıştırılabilir yap
chmod +x "$SCRIPT_PATH"
chmod +x /var/www/erasmus_caku/scripts/restore-mongodb.sh

# Cron job ekle (her 6 saatte bir + her restart'ta)
CRON_LINE="0 */6 * * * $SCRIPT_PATH >> $LOG_PATH 2>&1"
REBOOT_LINE="@reboot sleep 60 && $SCRIPT_PATH >> $LOG_PATH 2>&1"

# Mevcut cron'u al, duplicate önle
(crontab -l 2>/dev/null | grep -v "backup-mongodb.sh") | {
  cat
  echo "$CRON_LINE"
  echo "$REBOOT_LINE"
} | crontab -

echo "Cron job kuruldu!"
echo "  - Her 6 saatte bir otomatik yedek alınacak"
echo "  - Her sunucu restart'ında da yedek alınacak"
echo "  - Yedekler: /var/www/erasmus_caku/mongo-backups/"
echo "  - Log: $LOG_PATH"
echo ""
echo "İlk yedeği hemen al:"
echo "  bash $SCRIPT_PATH"
echo ""
echo "Geri yüklemek için:"
echo "  bash /var/www/erasmus_caku/scripts/restore-mongodb.sh --list"
echo "  bash /var/www/erasmus_caku/scripts/restore-mongodb.sh"
