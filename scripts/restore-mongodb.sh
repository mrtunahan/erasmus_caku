#!/bin/bash
# ============================================
# MongoDB Geri Yükleme Scripti
# Kullanım:
#   ./restore-mongodb.sh              → Son yedeği geri yükler
#   ./restore-mongodb.sh 2025-03-25   → Belirli tarihteki yedeği geri yükler
#   ./restore-mongodb.sh --list       → Mevcut yedekleri listeler
# ============================================

BACKUP_DIR="/var/www/erasmus_caku/mongo-backups"
DB_NAME="caku_erasmus"

# Yedekleri listele
if [ "$1" == "--list" ]; then
  echo "=== Mevcut Yedekler ==="
  ls -1t "$BACKUP_DIR"/*.tar.gz 2>/dev/null | while read f; do
    SIZE=$(du -h "$f" | cut -f1)
    echo "  $(basename "$f" .tar.gz)  ($SIZE)"
  done
  exit 0
fi

# Yedek seç
if [ -n "$1" ]; then
  BACKUP_FILE=$(ls -1 "$BACKUP_DIR"/*"$1"*.tar.gz 2>/dev/null | head -1)
else
  BACKUP_FILE=$(ls -1t "$BACKUP_DIR"/*.tar.gz 2>/dev/null | head -1)
fi

if [ -z "$BACKUP_FILE" ] || [ ! -f "$BACKUP_FILE" ]; then
  echo "HATA: Yedek bulunamadı!"
  echo "Mevcut yedekler:"
  ls -1t "$BACKUP_DIR"/*.tar.gz 2>/dev/null
  exit 1
fi

BACKUP_NAME=$(basename "$BACKUP_FILE" .tar.gz)

echo "========================================"
echo "  GERİ YÜKLEME: $BACKUP_NAME"
echo "========================================"
echo ""
echo "DİKKAT: Bu işlem mevcut veritabanını tamamen silip"
echo "yedeği geri yükleyecek!"
echo ""
read -p "Devam etmek istiyor musunuz? (evet/hayir): " CONFIRM

if [ "$CONFIRM" != "evet" ]; then
  echo "İptal edildi."
  exit 0
fi

# Önce mevcut durumun yedeğini al
echo "Mevcut durumun güvenlik yedeği alınıyor..."
PRE_RESTORE_DIR="$BACKUP_DIR/pre-restore-$(date +%Y-%m-%d_%H-%M-%S)"
mongodump --db "$DB_NAME" --out "$PRE_RESTORE_DIR" 2>/dev/null
echo "Güvenlik yedeği: $PRE_RESTORE_DIR"

# Tar'ı aç
TEMP_DIR=$(mktemp -d)
tar -xzf "$BACKUP_FILE" -C "$TEMP_DIR"

# Yedek klasörünü bul
RESTORE_PATH=$(find "$TEMP_DIR" -name "$DB_NAME" -type d | head -1)

if [ -z "$RESTORE_PATH" ]; then
  echo "HATA: Yedek içinde $DB_NAME veritabanı bulunamadı!"
  rm -rf "$TEMP_DIR"
  exit 1
fi

# Geri yükle
echo "Geri yükleniyor: $BACKUP_NAME ..."
mongorestore --db "$DB_NAME" --drop "$RESTORE_PATH" 2>/dev/null

if [ $? -eq 0 ]; then
  COLLECTION_COUNT=$(ls "$RESTORE_PATH/"*.bson 2>/dev/null | wc -l)
  echo ""
  echo "BAŞARILI! $COLLECTION_COUNT koleksiyon geri yüklendi."
  echo ""
  echo "API sunucusunu yeniden başlatmayı unutma:"
  echo "  sudo systemctl restart caku-api"
else
  echo "HATA: Geri yükleme başarısız!"
  echo "Güvenlik yedeğinden geri dönebilirsin:"
  echo "  mongorestore --db $DB_NAME --drop $PRE_RESTORE_DIR/$DB_NAME"
fi

# Temizlik
rm -rf "$TEMP_DIR"
