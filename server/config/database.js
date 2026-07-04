require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { MongoClient } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/erasmus_caku';

let client = null;
let db = null;
let isConnecting = false;

// students.studentNumber indeksini güvenli şekilde unique'e yükselt.
// KURAL: hiçbir koşulda veri silinmez. Mükerrer numara varsa mevcut
// non-unique indeks korunur ve mükerrerler log'a dökülür.
async function upgradeStudentNumberIndex(database) {
  const students = database.collection('students');
  try {
    // Zaten unique indeks var mı?
    const indexes = await students.indexes();
    const existing = indexes.find(
      (ix) => ix.key && ix.key.studentNumber === 1 && Object.keys(ix.key).length === 1
    );
    if (existing && existing.unique) return; // yapılacak iş yok

    // Mükerrer kontrolü — silme YOK, yalnızca sayım
    const dups = await students
      .aggregate([
        { $group: { _id: '$studentNumber', n: { $sum: 1 } } },
        { $match: { n: { $gt: 1 } } },
        { $limit: 20 },
      ])
      .toArray();

    if (dups.length > 0) {
      console.warn(
        `[indexes] students.studentNumber unique'e YÜKSELTİLMEDİ — ${dups.length}+ mükerrer numara var. ` +
          `Örnekler: ${dups
            .slice(0, 5)
            .map((d) => d._id + ' (x' + d.n + ')')
            .join(', ')}. Mükerrerler elle birleştirilince otomatik yükseltilecek.`
      );
      // non-unique indeks garanti edilsin
      await students.createIndex({ studentNumber: 1 }, { background: true });
      return;
    }

    // Mükerrer yok → eski non-unique indeksi bırakıp unique oluştur
    if (existing) {
      await students.dropIndex(existing.name);
    }
    await students.createIndex({ studentNumber: 1 }, { unique: true, background: true });
    console.log('[indexes] students.studentNumber UNIQUE indekse yükseltildi.');
  } catch (err) {
    // İndeks yükseltme hatası açılışı engellemesin — non-unique'e geri düş
    console.warn('[indexes] studentNumber unique yükseltme hatası:', err.message);
    try {
      await students.createIndex({ studentNumber: 1 }, { background: true });
    } catch (_e) {
      /* sessiz */
    }
  }
}

// Veritabanı indekslerini oluştur (varsa atlar, veri kaybı yapmaz)
async function setupIndexes(database) {
  try {
    // Öğrenci girişi ve sorguları — mükerrer kayıt YOKSA unique indekse
    // yükseltilir; mükerrer varsa VERİ SİLİNMEZ, uyarı loglanır ve
    // non-unique indeksle devam edilir (temizlik manuel yapılmalı).
    await upgradeStudentNumberIndex(database);
    await database.collection('students').createIndex({ departmentId: 1 }, { background: true });

    // Bölüm yetkilisi girişi
    await database.collection('departments').createIndex({ managerName: 1 }, { background: true });
    await database.collection('departments').createIndex({ managerNames: 1 }, { background: true });

    // Staj modülü
    await database
      .collection('internship_applications')
      .createIndex({ ogrenciNo: 1, status: 1 }, { background: true });
    await database
      .collection('internship_applications')
      .createIndex({ departmentId: 1 }, { background: true });
    await database
      .collection('internship_notifications')
      .createIndex({ targetStudentNo: 1 }, { background: true });
    await database
      .collection('internship_notifications')
      .createIndex({ departmentId: 1 }, { background: true });

    // Portal
    await database
      .collection('portal_posts')
      .createIndex({ departmentId: 1, createdAt: -1 }, { background: true });
    await database.collection('portal_posts').createIndex({ authorId: 1 }, { background: true });

    // Sınav modülü
    await database
      .collection('sinav_dersler')
      .createIndex({ departmentId: 1 }, { background: true });
    await database
      .collection('sinav_programi')
      .createIndex({ departmentId: 1 }, { background: true });

    // Öğrenci bildirimleri (Benim Sayfam)
    await database
      .collection('student_notifications')
      .createIndex({ studentNumber: 1, createdAt: -1 }, { background: true });

    // Eşleştirme geçmişi — mükerrer yazmaya karşı fiziksel bariyer.
    // sigKey: studentNumber|hostInstitution|matchKey imzası (istemci yazar).
    // Partial: yalnızca sigKey'i olan (yeni) kayıtlara uygulanır — temizlik
    // öncesi eski kayıtlar sigKey taşımadığından indeks onları etkilemez.
    try {
      await database.collection('trip_history').createIndex(
        { sigKey: 1 },
        {
          unique: true,
          partialFilterExpression: { sigKey: { $type: 'string' } },
          background: true,
        }
      );
    } catch (err) {
      if (!/already exists|equivalent index/i.test(err.message)) {
        console.warn('[indexes] trip_history sigKey unique:', err.message);
      }
    }

    // Muafiyet eşleştirme geçmişi (Erasmus trip_history'den BAĞIMSIZ) —
    // onaylanan her ders eşleştirmesi bir kez yazılır; sigKey unique bariyeri
    // mükerrer onay yazımını fiziksel olarak engeller.
    try {
      await database.collection('muafiyet_history').createIndex(
        { sigKey: 1 },
        {
          unique: true,
          partialFilterExpression: { sigKey: { $type: 'string' } },
          background: true,
        }
      );
    } catch (err) {
      if (!/already exists|equivalent index/i.test(err.message)) {
        console.warn('[indexes] muafiyet_history sigKey unique:', err.message);
      }
    }
    await database
      .collection('muafiyet_history')
      .createIndex({ departmentId: 1, approvedAt: -1 }, { background: true });

    // Performans modülü — akademisyen gösterge değerleri
    await database
      .collection('performance_data')
      .createIndex({ akademisyenId: 1, yil: 1 }, { background: true });
    await database
      .collection('performance_data')
      .createIndex({ departmentId: 1, yil: 1 }, { background: true });
    // Performans modülü — bölüm/fakülte yetkilisi toplama kuralları
    await database
      .collection('performance_agg_rules')
      .createIndex({ scope: 1, scopeId: 1 }, { background: true });

    // Audit log koleksiyonu (yazma denetimi)
    // - at: -1 → kronolojik sorgular için
    // - actor.userId + at → kullanıcı bazlı tarama
    // - operations.collection + at → koleksiyon bazlı tarama
    // - TTL: 90 gün (PII retention politikası)
    await database.collection('audit_logs').createIndex({ at: -1 }, { background: true });
    await database
      .collection('audit_logs')
      .createIndex({ 'actor.userId': 1, at: -1 }, { background: true });
    await database
      .collection('audit_logs')
      .createIndex({ 'operations.collection': 1, at: -1 }, { background: true });
    try {
      await database
        .collection('audit_logs')
        .createIndex(
          { at: 1 },
          { expireAfterSeconds: 60 * 60 * 24 * 90, name: 'audit_ttl_90d', background: true }
        );
    } catch (err) {
      // TTL indeksi farklı süreyle önceden tanımlıysa idempotent değildir;
      // değiştirilmek istenirse manuel `dropIndex` gerekir — burada sessiz geç.
      if (!/already exists|equivalent index/i.test(err.message)) {
        console.warn('[indexes] audit_logs TTL:', err.message);
      }
    }

    console.log('Veritabanı indeksleri hazır.');
  } catch (err) {
    // Index zaten varsa hata vermez, başka bir hata varsa logla
    if (!err.message.includes('already exists')) {
      console.warn('İndeks oluşturma uyarısı:', err.message);
    }
  }
}

async function connect() {
  // Eşzamanlı connect çağrılarını engelle
  if (isConnecting) {
    // Bağlantı kurulana kadar bekle
    while (isConnecting) {
      await new Promise((r) => setTimeout(r, 100));
    }
    if (db) return db;
  }

  isConnecting = true;

  try {
    // Eski client varsa temizle
    if (client) {
      try {
        await client.close();
      } catch (_) {}
      client = null;
      db = null;
    }

    client = new MongoClient(MONGODB_URI, {
      maxPoolSize: 10,
      minPoolSize: 2,
      socketTimeoutMS: 30000,
      serverSelectionTimeoutMS: 5000,
      heartbeatFrequencyMS: 10000,
      retryWrites: true,
      retryReads: true,
    });

    // Bağlantı olaylarını dinle
    client.on('close', () => {
      console.warn('[MongoDB] Bağlantı kapandı, yeniden bağlanma gerekecek.');
      db = null;
    });

    client.on('error', (err) => {
      console.error('[MongoDB] Bağlantı hatası:', err.message);
      db = null;
    });

    client.on('timeout', () => {
      console.warn('[MongoDB] Bağlantı zaman aşımı.');
      db = null;
    });

    client.on('serverHeartbeatFailed', (event) => {
      console.warn('[MongoDB] Heartbeat başarısız:', event.failure?.message || 'bilinmiyor');
    });

    await client.connect();

    // Veritabanı adını URI'den çıkar (son / sonrası, ? öncesi)
    const dbName = MONGODB_URI.split('/').pop().split('?')[0] || 'erasmus_caku';
    db = client.db(dbName);

    // Loglarken URI'deki credential'ı maskeleme — username:password kısmını gizle
    const safeUri = MONGODB_URI.replace(/(mongodb(?:\+srv)?:\/\/)([^@]+)@/i, '$1***@');
    console.log(`[MongoDB] Bağlantı kuruldu (db: ${dbName}, uri: ${safeUri})`);

    // İndeksleri arka planda oluştur
    setupIndexes(db);

    return db;
  } catch (err) {
    client = null;
    db = null;
    console.error('[MongoDB] Başlatılamadı:', err.message);
    throw new Error("MongoDB'ye bağlanılamadı: " + err.message);
  } finally {
    isConnecting = false;
  }
}

function getDb() {
  if (!db) {
    throw new Error('Veritabanı bağlantısı henüz kurulmadı. Önce connect() çağrılmalı.');
  }
  return db;
}

let lastPingOk = 0;
const PING_INTERVAL = 30000; // 30 saniyede bir ping at

async function getDbSafe() {
  if (!db || !client) {
    return await connect();
  }

  // Son başarılı ping 30 saniyeden eski ise bağlantıyı kontrol et
  const now = Date.now();
  if (now - lastPingOk > PING_INTERVAL) {
    try {
      await client.db('admin').command({ ping: 1 });
      lastPingOk = now;
    } catch (err) {
      console.warn('[MongoDB] Ping başarısız, yeniden bağlanılıyor:', err.message);
      db = null;
      return await connect();
    }
  }

  return db;
}

async function disconnect() {
  if (client) {
    await client.close();
    client = null;
    db = null;
    console.log('[MongoDB] Bağlantı kapatıldı.');
  }
}

module.exports = { connect, getDb, getDbSafe, disconnect };
