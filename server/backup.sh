#!/bin/bash
# ⚠ İKİ YEDEK BETİĞİ VAR. Bu dosya sunucudaki crontab'da bu yolla
# (server/backup.sh) çağrıldığı için YERİNDE bırakıldı. Daha yeni ve
# ayarlanabilir sürüm: server/scripts/backup.sh (MONGODB_URI'yi .env'den
# okur, --gzip arşiv). Crontab ona taşındığında bu dosya kaldırılabilir.
# İkisi de YALNIZ veritabanını yedekler; server/uploads (yüklenen belgeler)
# ayrıca yedeklenmelidir.
# MongoDB günlük yedekleme scripti
# Kullanım: crontab -e ile ekleyin:
# 0 3 * * * /var/www/erasmus_caku/server/backup.sh

BACKUP_DIR="/var/backups/mongodb"
DB_NAME="erasmus_caku"
DATE=$(date +%Y%m%d_%H%M)
RETENTION_DAYS=30

# Yedek dizini oluştur
mkdir -p "$BACKUP_DIR"

# Yedekleme al
mongodump --db "$DB_NAME" --out "$BACKUP_DIR/$DATE" 2>&1

if [ $? -eq 0 ]; then
  # Sıkıştır
  cd "$BACKUP_DIR" && tar -czf "${DATE}.tar.gz" "$DATE" && rm -rf "$DATE"
  echo "[$(date)] Yedekleme başarılı: ${BACKUP_DIR}/${DATE}.tar.gz"
else
  echo "[$(date)] HATA: Yedekleme başarısız!"
  exit 1
fi

# Eski yedekleri temizle
find "$BACKUP_DIR" -name "*.tar.gz" -mtime +$RETENTION_DAYS -delete
echo "[$(date)] ${RETENTION_DAYS} günden eski yedekler temizlendi."
