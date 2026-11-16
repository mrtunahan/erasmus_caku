/**
 * MEZUNİYET — GEÇMİŞ BAŞVURULARI GÜNCEL NOT KURALLARIYLA TAZELE.
 * Kuru çalışma varsayılan, yedekli. Ayrıntı: server/lib/mezuniyet-yeniden-hesap.js
 *
 *   node server/mezuniyet-yeniden-hesapla.js            # kuru: yalnız rapor
 *   UYGULA=1 node server/mezuniyet-yeniden-hesapla.js   # yedek al + yaz
 * Tekrar çalıştırmak güvenlidir: değişmeyen kayda dokunmaz.
 */
require('dotenv').config();
require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const fs = require('fs');
const path = require('path');
const { mezuniyetYenidenHesapla } = require('./lib/mezuniyet-yeniden-hesap');

(async () => {
  const { getDbSafe } = require('./config/database');
  const uygula = process.env.UYGULA === '1';
  const db = await getDbSafe();
  console.log(
    uygula ? '▶ UYGULA: yedek alınıp yazılacak.' : '▶ KURU ÇALIŞMA: hiçbir şey yazılmaz.'
  );
  const yedekler = [];
  const r = await mezuniyetYenidenHesapla(db, {
    uygula,
    yedek: (koleksiyon, belge) => yedekler.push({ koleksiyon, belge }),
  });
  if (uygula && yedekler.length) {
    const dizin = process.env.YEDEK_DIZIN || path.join(__dirname, '..', 'yedek');
    fs.mkdirSync(dizin, { recursive: true });
    const dosya = path.join(
      dizin,
      'mezuniyet-yeniden-' + new Date().toISOString().replace(/[:.]/g, '-') + '.json'
    );
    fs.writeFileSync(dosya, JSON.stringify(yedekler, null, 2));
    console.log('Yedek:', dosya);
  }
  console.log('');
  console.log(
    'Not ölçeği onarılan bölüm      :',
    r.kuralOnarildi.length,
    r.kuralOnarildi.join(', ')
  );
  console.log('Başvuru                        :', r.basvuruSayisi);
  console.log('Özeti (AKTS/sarı satır) yenilenen:', r.ozetGuncellendi);
  console.log('FF1/FF2/FF3 notlu başvuru       :', r.ekHarfliBasvuru);
  if (r.hesaplanamadi.length) {
    console.log('Hesaplanamayan                 :', r.hesaplanamadi.length);
    r.hesaplanamadi.forEach((x) => console.log('   ', x.no, '—', x.hata));
  }
  if (r.incelenmeli.length) {
    console.log('');
    console.log('Danışman kararı verilmiş, FF notlu — danışman yeniden bakmalı:');
    r.incelenmeli.forEach((x) =>
      console.log(
        '   ',
        x.no,
        x.ad,
        '·',
        x.durum,
        '· danışman:',
        x.danisman,
        '·',
        x.dersler.join(', ')
      )
    );
  }
  process.exit(0);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
