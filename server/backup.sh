#!/bin/bash
# ⚠ İKİ YEDEK BETİĞİ VAR. Bu dosya sunucudaki crontab'da bu yolla
# (server/backup.sh) çağrıldığı için YERİNDE bırakıldı. Daha yeni ve
# ayarlanabilir sürüm: server/scripts/backup.sh (MONGODB_URI'yi .env'den
# okur, --gzip arşiv). Crontab ona taşındığında bu dosya kaldırılabilir.
# Bu betik server/uploads (yüklenen belgeler) için ayrıca bir ayna da tutar.
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

# ── YÜKLENEN BELGELER (server/uploads) ──
# Veritabanı yedeği belgelerin YOLUNU tutar, dosyanın kendisini değil: staj
# defteri, dilekçe, transkript gibi yüklemeler hiç yedeklenmiyordu.
# Her gece tam arşiv almak diski hızla doldururdu; bunun yerine tek bir AYNA
# tutulur ve yalnız yeni/değişen dosyalar kopyalanır. Aynadan HİÇBİR ŞEY
# SİLİNMEZ (--delete yok): uygulamada yanlışlıkla silinen belge burada kalır.
UPLOADS_DIR="$(cd "$(dirname "$0")" && pwd)/uploads"
UPLOADS_AYNA="$BACKUP_DIR/uploads-ayna"
if [ -d "$UPLOADS_DIR" ]; then
  mkdir -p "$UPLOADS_AYNA"
  if command -v rsync >/dev/null 2>&1; then
    rsync -a "$UPLOADS_DIR/" "$UPLOADS_AYNA/"
  else
    cp -a -u "$UPLOADS_DIR/." "$UPLOADS_AYNA/"
  fi
  echo "[$(date)] Yüklenen belgeler aynalandı: $UPLOADS_AYNA ($(du -sh "$UPLOADS_AYNA" | cut -f1))"
fi

# Eski yedekleri temizle (yalnız veritabanı arşivleri; aynaya dokunulmaz)
find "$BACKUP_DIR" -maxdepth 1 -name "*.tar.gz" -mtime +$RETENTION_DAYS -delete
echo "[$(date)] ${RETENTION_DAYS} günden eski yedekler temizlendi."
