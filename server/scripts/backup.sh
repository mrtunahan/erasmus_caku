#!/usr/bin/env bash
# ══════════════════════════════════════════════════════════════
# ÇAKÜ Yönetim Sistemi — MongoDB yedekleme betiği
#
# Kullanım:
#   ./server/scripts/backup.sh                # varsayılan: ./backups altına
#   BACKUP_DIR=/mnt/yedek ./server/scripts/backup.sh
#   MONGODB_URI="mongodb://..." ./server/scripts/backup.sh
#
# Cron örneği (her gece 03:00, son 14 yedek tutulur):
#   0 3 * * * cd /path/to/erasmus_caku && ./server/scripts/backup.sh >> backups/backup.log 2>&1
#
# Geri yükleme:
#   mongorestore --uri="$MONGODB_URI" --gzip --archive=backups/caku_YYYYMMDD_HHMMSS.archive
# ══════════════════════════════════════════════════════════════
set -euo pipefail

# server/.env varsa MONGODB_URI'yi oradan al (env'de tanımlıysa env öncelikli)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="$SCRIPT_DIR/../.env"
if [ -z "${MONGODB_URI:-}" ] && [ -f "$ENV_FILE" ]; then
  MONGODB_URI="$(grep -E '^MONGODB_URI=' "$ENV_FILE" | head -1 | cut -d= -f2- | tr -d '"' || true)"
fi
MONGODB_URI="${MONGODB_URI:-mongodb://127.0.0.1:27017/erasmus_caku}"

BACKUP_DIR="${BACKUP_DIR:-$SCRIPT_DIR/../../backups}"
RETENTION="${RETENTION:-14}" # tutulacak yedek sayısı

mkdir -p "$BACKUP_DIR"
STAMP="$(date +%Y%m%d_%H%M%S)"
ARCHIVE="$BACKUP_DIR/caku_${STAMP}.archive"

if ! command -v mongodump >/dev/null 2>&1; then
  echo "HATA: mongodump bulunamadı. Kurulum: https://www.mongodb.com/docs/database-tools/" >&2
  exit 1
fi

echo "[backup] Başladı: $STAMP"
mongodump --uri="$MONGODB_URI" --gzip --archive="$ARCHIVE"
SIZE="$(du -h "$ARCHIVE" | cut -f1)"
echo "[backup] Tamamlandı: $ARCHIVE ($SIZE)"

# Eski yedekleri temizle — yalnızca bu betiğin ürettiği caku_*.archive
# dosyalarına dokunur, en yeni $RETENTION adet tutulur.
ls -1t "$BACKUP_DIR"/caku_*.archive 2>/dev/null | tail -n +$((RETENTION + 1)) | while read -r old; do
  echo "[backup] Eski yedek siliniyor: $old"
  rm -f "$old"
done

echo "[backup] Mevcut yedekler:"
ls -1th "$BACKUP_DIR"/caku_*.archive 2>/dev/null | head -5
