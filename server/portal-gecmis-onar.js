/**
 * ÖĞRENCİ PORTALI — GEÇMİŞ ETKİLEŞİMLERİN ONARIMI. Kuru çalışma varsayılan, yedekli.
 *
 * Denetim kaydından (audit_logs) geri kazanır (ayrıntı:
 * server/lib/portal-gecmis-onarim.js):
 *   • gönderisi bilinmeyen yorumları gönderilerine, alıcısı bilinmeyen portal
 *     bildirimlerini alıcılarına bağlar;
 *   • reddedilmiş tepkileri ve yorum beğenilerini (son niyet "ekle" ise) işler;
 *   • yorum sayılarını yeniden sayar.
 * Yukarı/aşağı oyların yönü kayıtta olmadığı için onlar işlenmez, sayılır.
 *
 * Kullanım (proje kökünden):
 *   node server/portal-gecmis-onar.js            # kuru: yalnız rapor
 *   UYGULA=1 node server/portal-gecmis-onar.js   # yedek al + yaz
 * Tekrar çalıştırmak güvenlidir: işlenmiş kayda ikinci kez dokunmaz.
 */
require('dotenv').config();
require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const fs = require('fs');
const path = require('path');
const { portalGecmisiOnar } = require('./lib/portal-gecmis-onarim');

(async () => {
  const { getDbSafe } = require('./config/database');
  const uygula = process.env.UYGULA === '1';
  const db = await getDbSafe();
  console.log(
    uygula ? '▶ UYGULA: yedek alınıp yazılacak.' : '▶ KURU ÇALIŞMA: hiçbir şey yazılmaz.'
  );
  const yedekler = [];
  const rapor = await portalGecmisiOnar(db, {
    uygula,
    yedek: (koleksiyon, belge) => yedekler.push({ koleksiyon, belge }),
  });
  if (uygula && yedekler.length) {
    const dizin = process.env.YEDEK_DIZIN || path.join(__dirname, '..', 'yedek');
    fs.mkdirSync(dizin, { recursive: true });
    const dosya = path.join(
      dizin,
      'portal-gecmis-' + new Date().toISOString().replace(/[:.]/g, '-') + '.json'
    );
    fs.writeFileSync(dosya, JSON.stringify(yedekler, null, 2));
    console.log('Yedek:', dosya);
  }
  console.log('');
  console.log('Yorum gönderisine bağlandı      :', rapor.yorumBaglandi);
  console.log('Yorum bağlanamadı (eşi yok)     :', rapor.yorumBaglanamadi);
  console.log('Portal bildirimi alıcıya bağlandı:', rapor.bildirimBaglandi);
  console.log('Portal bildirimi bağlanamadı    :', rapor.bildirimBaglanamadi);
  console.log('Tepki işlendi                   :', rapor.tepkiEklendi);
  console.log('Yorum beğenisi işlendi          :', rapor.yorumBegeniEklendi);
  console.log('Yorum sayısı düzeltilen gönderi :', rapor.yorumSayaciGuncellendi);
  console.log('Oy denemesi (yönü bilinmiyor)   :', rapor.oyDenemesiKurtarilamadi);
  process.exit(0);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
