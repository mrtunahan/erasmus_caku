#!/bin/bash
# ============================================
# MongoDB Otomatik Yedekleme Scripti
# Her çalıştığında tarihli yedek alır
# En fazla 10 yedek tutar (eski olanları siler)
# ============================================

BACKUP_DIR="/var/www/erasmus_caku/mongo-backups"
DB_NAME="caku_erasmus"
MAX_BACKUPS=10
DATE=$(date +"%Y-%m-%d_%H-%M-%S")
BACKUP_PATH="$BACKUP_DIR/$DATE"

# Yedek dizini oluştur
mkdir -p "$BACKUP_DIR"

echo "[$DATE] MongoDB yedekleme başlıyor..."

# mongodump ile tam yedek al
mongodump --db "$DB_NAME" --out "$BACKUP_PATH" 2>/dev/null

if [ $? -eq 0 ]; then
  # Koleksiyon sayısını kontrol et
  COLLECTION_COUNT=$(ls "$BACKUP_PATH/$DB_NAME/"*.bson 2>/dev/null | wc -l)
  echo "[$DATE] BAŞARILI - $COLLECTION_COUNT koleksiyon yedeklendi -> $BACKUP_PATH"

  # Sıkıştır (yer kazanmak için)
  cd "$BACKUP_DIR"
  tar -czf "$DATE.tar.gz" "$DATE" && rm -rf "$DATE"
  echo "[$DATE] Sıkıştırıldı -> $BACKUP_DIR/$DATE.tar.gz"

  # Eski yedekleri temizle (en fazla MAX_BACKUPS tut)
  BACKUP_COUNT=$(ls -1t "$BACKUP_DIR"/*.tar.gz 2>/dev/null | wc -l)
  if [ "$BACKUP_COUNT" -gt "$MAX_BACKUPS" ]; then
    ls -1t "$BACKUP_DIR"/*.tar.gz | tail -n +$((MAX_BACKUPS + 1)) | xargs rm -f
    echo "[$DATE] Eski yedekler temizlendi (max $MAX_BACKUPS)"
  fi
else
  echo "[$DATE] HATA - Yedekleme başarısız!"
  exit 1
fi

echo "[$DATE] Tamamlandı."
