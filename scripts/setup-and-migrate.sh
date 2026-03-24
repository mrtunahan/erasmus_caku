#!/bin/bash
# ═══════════════════════════════════════════════════════════════
# Firebase Firestore → MongoDB Tam Yedekleme & Aktarma
# Proje: caku-erasmus
# ═══════════════════════════════════════════════════════════════

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
BACKUP_DIR="$PROJECT_DIR/firestore-backup"
MONGO_CONTAINER="caku-mongodb"
MONGO_PORT=27017
MONGO_DB="caku_erasmus"
MONGO_DATA_DIR="/var/lib/caku-mongodb-data"

echo ""
echo "╔══════════════════════════════════════════════════════════╗"
echo "║   Firebase → MongoDB Yedekleme & Aktarma                ║"
echo "║   Proje: caku-erasmus                                   ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""

# ── 1. Service Account Key kontrolü ──
KEY_FILE="$SCRIPT_DIR/serviceAccountKey.json"
if [ ! -f "$KEY_FILE" ]; then
    echo "❌ Service account key dosyası bulunamadı!"
    echo ""
    echo "Adımlar:"
    echo "  1. https://console.firebase.google.com/project/caku-erasmus/settings/serviceaccounts/adminsdk"
    echo "  2. 'Generate New Private Key' butonuna tıklayın"
    echo "  3. İndirilen JSON dosyasını şu konuma koyun:"
    echo "     $KEY_FILE"
    echo ""
    exit 1
fi
echo "✓ Service account key bulundu"

# ── 2. Node.js ve npm kontrolü ──
if ! command -v node &> /dev/null; then
    echo "❌ Node.js bulunamadı! Lütfen Node.js kurun."
    exit 1
fi
echo "✓ Node.js: $(node --version)"

# ── 3. Gerekli npm paketlerini yükle ──
echo ""
echo "📦 Gerekli paketler yükleniyor..."
cd "$SCRIPT_DIR"

if [ ! -f "$SCRIPT_DIR/package.json" ]; then
    cat > "$SCRIPT_DIR/package.json" << 'PKGJSON'
{
  "name": "firebase-mongodb-migration",
  "version": "1.0.0",
  "private": true,
  "dependencies": {
    "firebase-admin": "^13.7.0",
    "mongodb": "^6.12.0"
  }
}
PKGJSON
fi

npm install --production 2>&1 | tail -1
echo "✓ Paketler yüklendi"

# ── 4. Docker MongoDB kurulumu ──
echo ""
echo "🐳 MongoDB Docker container kuruluyor..."

# Mevcut container varsa durdur (veriyi koruyarak)
if docker ps -a --format '{{.Names}}' | grep -q "^${MONGO_CONTAINER}$"; then
    echo "  Mevcut container bulundu, kontrol ediliyor..."
    if docker ps --format '{{.Names}}' | grep -q "^${MONGO_CONTAINER}$"; then
        echo "  ✓ Container zaten çalışıyor"
    else
        echo "  Container durdurulmuş, başlatılıyor..."
        docker start "$MONGO_CONTAINER"
        echo "  ✓ Container başlatıldı"
    fi
else
    # Data dizini oluştur (kalıcı veri için)
    mkdir -p "$MONGO_DATA_DIR"

    docker run -d \
        --name "$MONGO_CONTAINER" \
        --restart unless-stopped \
        -p ${MONGO_PORT}:27017 \
        -v ${MONGO_DATA_DIR}:/data/db \
        -e MONGO_INITDB_DATABASE="$MONGO_DB" \
        mongo:7

    echo "  ✓ MongoDB container oluşturuldu ve başlatıldı"
fi

# MongoDB'nin hazır olmasını bekle
echo "  MongoDB başlatılıyor..."
for i in $(seq 1 15); do
    if docker exec "$MONGO_CONTAINER" mongosh --quiet --eval "db.runCommand({ping:1})" &>/dev/null; then
        echo "  ✓ MongoDB hazır!"
        break
    fi
    if [ "$i" -eq 15 ]; then
        echo "  ❌ MongoDB başlatılamadı!"
        exit 1
    fi
    sleep 2
done

# ── 5. Firebase export + MongoDB import ──
echo ""
echo "🔄 Firebase Firestore export başlıyor..."
echo ""

cd "$PROJECT_DIR"
node scripts/firebase-to-mongodb.js \
    --key="$KEY_FILE" \
    --mongo-uri="mongodb://localhost:${MONGO_PORT}" \
    --db-name="$MONGO_DB" \
    --output-dir="$BACKUP_DIR"

# ── 6. Doğrulama ──
echo ""
echo "🔍 MongoDB verilerini doğruluyor..."
echo ""

COLLECTIONS=$(docker exec "$MONGO_CONTAINER" mongosh "$MONGO_DB" --quiet --eval '
    const cols = db.getCollectionNames();
    let total = 0;
    cols.forEach(c => {
        const count = db.getCollection(c).countDocuments();
        total += count;
        print("  " + c + ": " + count + " belge");
    });
    print("");
    print("TOPLAM: " + cols.length + " koleksiyon, " + total + " belge");
')

echo "$COLLECTIONS"

echo ""
echo "╔══════════════════════════════════════════════════════════╗"
echo "║   ✅ AKTARIM TAMAMLANDI!                                ║"
echo "╠══════════════════════════════════════════════════════════╣"
echo "║                                                          ║"
echo "║   MongoDB Bağlantı Bilgileri:                            ║"
echo "║   URI: mongodb://localhost:${MONGO_PORT}                      ║"
echo "║   Veritabanı: ${MONGO_DB}                          ║"
echo "║   Container: ${MONGO_CONTAINER}                           ║"
echo "║                                                          ║"
echo "║   JSON Yedekler: ${BACKUP_DIR}             ║"
echo "║                                                          ║"
echo "║   Faydalı komutlar:                                      ║"
echo "║   docker exec -it ${MONGO_CONTAINER} mongosh ${MONGO_DB}  ║"
echo "║   docker logs ${MONGO_CONTAINER}                          ║"
echo "║   docker stop ${MONGO_CONTAINER}                          ║"
echo "║   docker start ${MONGO_CONTAINER}                         ║"
echo "║                                                          ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""
