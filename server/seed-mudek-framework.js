/**
 * Akreditasyon çerçevesi seed: MÜDEK Genel Ölçütler.
 *
 * MİMARİ İLKE: Ölçütler KOD değil VERİ'dir — akreditasyon modülü bu
 * koleksiyondan okur. Yeni çerçeve (YÖKAK, FEDEK…) veya yeni MÜDEK sürümü
 * eklemek = yeni doküman eklemek; kod değişikliği gerekmez.
 *
 * Alt ölçüt metinleri MÜDEK Genel Ölçütleri esas alınarak ÖZETLENMİŞTİR;
 * resmî başvuru öncesi güncel MÜDEK belgesiyle karşılaştırıp gerekirse bu
 * kayıt üzerinden düzenleyin (koleksiyon düzenlenebilir).
 *
 * evidenceKeys: KanıtSağlayıcı adaptörünün sorgu adları — modül bu anahtarlarla
 * sistemden otomatik kanıt özeti çeker (akreditasyon-modulu.jsx).
 *
 * Idempotent: _docId 'mudek-genel' zaten varsa üzerine YAZMAZ (elle yapılan
 * düzenlemeler korunur). Yeniden yüklemek için: FORCE=1.
 *
 * Kullanım:
 *   DRY_RUN=1 node server/seed-mudek-framework.js
 *   node server/seed-mudek-framework.js
 *   FORCE=1 node server/seed-mudek-framework.js   (mevcut kaydı değiştirir)
 */
(async () => {
  const { getDbSafe } = require('./config/database');
  const db = await getDbSafe();
  const dry = process.env.DRY_RUN === '1';
  const force = process.env.FORCE === '1';
  const col = db.collection('akreditasyon_frameworks');

  const FRAMEWORK = {
    _docId: 'mudek-genel',
    _id: 'mudek-genel',
    name: 'MÜDEK Genel Ölçütler',
    shortName: 'MÜDEK',
    version: '2.2 (özet — resmî belgeyle doğrulayın)',
    criteria: [
      {
        id: 'o1',
        no: '1',
        title: 'Öğrenciler',
        evidenceKeys: ['ogrenciler', 'muafiyet'],
        sub: [
          {
            id: 'o1-1',
            text: 'Öğrenci kabulleri, yatay/dikey geçişler ve ders sayma (muafiyet/intibak) işlemleri tanımlı süreçlerle yürütülmelidir.',
          },
          {
            id: 'o1-2',
            text: 'Öğrencilerin program çıktılarını kazanmalarını sağlayacak şekilde izlenmesi ve yönlendirilmesi (danışmanlık) sağlanmalıdır.',
          },
          {
            id: 'o1-3',
            text: 'Öğrencilere sunulan burs, değişim (Erasmus vb.) ve destek olanakları tanımlı olmalıdır.',
          },
        ],
      },
      {
        id: 'o2',
        no: '2',
        title: 'Program Eğitim Amaçları',
        evidenceKeys: [],
        sub: [
          {
            id: 'o2-1',
            text: 'Program eğitim amaçları tanımlı, yayımlanmış ve kurum misyonuyla uyumlu olmalıdır.',
          },
          {
            id: 'o2-2',
            text: 'Eğitim amaçları iç ve dış paydaş katılımıyla belirlenmeli ve periyodik olarak gözden geçirilmelidir.',
          },
        ],
      },
      {
        id: 'o3',
        no: '3',
        title: 'Program Çıktıları',
        evidenceKeys: ['anketler', 'performans'],
        sub: [
          {
            id: 'o3-1',
            text: 'Program çıktıları tanımlı olmalı ve MÜDEK çıktılarını kapsamalıdır.',
          },
          {
            id: 'o3-2',
            text: 'Program çıktılarına ulaşma düzeyini ölçen ve belgeleyen bir ölçme-değerlendirme sistemi bulunmalıdır (anketler, başarı ölçümleri vb.).',
          },
          {
            id: 'o3-3',
            text: 'Mezuniyet aşamasındaki öğrencilerin program çıktılarını sağladığı kanıtlanmalıdır.',
          },
        ],
      },
      {
        id: 'o4',
        no: '4',
        title: 'Sürekli İyileştirme',
        evidenceKeys: ['anketler', 'performans', 'sinavlar'],
        sub: [
          {
            id: 'o4-1',
            text: 'Ölçme-değerlendirme sonuçlarının programın iyileştirilmesinde kullanıldığı bir sürekli iyileştirme döngüsü kurulmalı ve kanıtlanmalıdır.',
          },
          {
            id: 'o4-2',
            text: 'İyileştirme çalışmaları, sonuçları ve alınan kararlar belgelenmeli ve izlenmelidir.',
          },
        ],
      },
      {
        id: 'o5',
        no: '5',
        title: 'Eğitim Planı',
        evidenceKeys: ['ders_programi', 'stajlar'],
        sub: [
          {
            id: 'o5-1',
            text: 'Eğitim planı; matematik-fen, mühendislik bilimleri/tasarımı ve genel eğitim bileşenlerini yeterli düzeyde içermelidir.',
          },
          {
            id: 'o5-2',
            text: 'Eğitim planının uygulanmasında kullanılan yöntemler ve ana tasarım deneyimi tanımlı olmalıdır.',
          },
          {
            id: 'o5-3',
            text: 'Staj/işyeri eğitimi gereklilikleri tanımlı olmalı ve uygulanmalıdır.',
          },
        ],
      },
      {
        id: 'o6',
        no: '6',
        title: 'Öğretim Kadrosu',
        evidenceKeys: ['kadro'],
        sub: [
          {
            id: 'o6-1',
            text: 'Öğretim kadrosu sayı ve nitelik olarak programı yürütmeye yeterli olmalıdır.',
          },
          {
            id: 'o6-2',
            text: 'Kadronun atama, yükseltme ve mesleki gelişim süreçleri tanımlı olmalıdır.',
          },
        ],
      },
      {
        id: 'o7',
        no: '7',
        title: 'Altyapı',
        evidenceKeys: [],
        sub: [
          {
            id: 'o7-1',
            text: 'Derslikler, laboratuvarlar ve donanım eğitim amaçlarına ulaşmak için yeterli olmalıdır.',
          },
          {
            id: 'o7-2',
            text: 'Öğrencilere kütüphane, bilişim ve engelsiz erişim olanakları sağlanmalıdır.',
          },
        ],
      },
      {
        id: 'o8',
        no: '8',
        title: 'Kurum Desteği ve Parasal Kaynaklar',
        evidenceKeys: [],
        sub: [
          {
            id: 'o8-1',
            text: 'Kurumun programa sağladığı bütçe, idari destek ve teknik personel sürdürülebilir olmalıdır.',
          },
        ],
      },
      {
        id: 'o9',
        no: '9',
        title: 'Organizasyon ve Karar Alma Süreçleri',
        evidenceKeys: [],
        sub: [
          {
            id: 'o9-1',
            text: 'Programın yürütülmesindeki organizasyon yapısı ve karar alma süreçleri tanımlı olmalıdır.',
          },
        ],
      },
      {
        id: 'o10',
        no: '10',
        title: 'Programa Özgü Ölçütler',
        evidenceKeys: [],
        sub: [
          { id: 'o10-1', text: 'İlgili disipline özgü MÜDEK program ölçütleri sağlanmalıdır.' },
        ],
      },
    ],
  };

  const existing = await col.findOne({ _docId: FRAMEWORK._docId });
  if (existing && !force) {
    console.log('✓ "mudek-genel" çerçevesi zaten var — dokunulmadı (değiştirmek için FORCE=1).');
    process.exit(0);
  }
  const totalSub = FRAMEWORK.criteria.reduce((a, c) => a + c.sub.length, 0);
  console.log(
    `${existing ? 'Güncellenecek' : 'Eklenecek'}: ${FRAMEWORK.name} — ${FRAMEWORK.criteria.length} ölçüt, ${totalSub} alt ölçüt.`
  );
  if (!dry) {
    await col.replaceOne(
      { _docId: FRAMEWORK._docId },
      { ...FRAMEWORK, updatedAt: new Date() },
      { upsert: true }
    );
    console.log('✓ Yazıldı.');
  } else {
    console.log('[DRY RUN] yazılmadı.');
  }
  process.exit(0);
})().catch((e) => {
  console.error('Hata:', e);
  process.exit(1);
});
