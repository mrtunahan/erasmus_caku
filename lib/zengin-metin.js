// ══════════════════════════════════════════════════════════════
// ZENGİN METİN — duyuru içeriğinin güvenli ayrıştırılması
//
// Duyuru metni artık biçimlendirilebiliyor (kalın, başlık, liste, bağlantı…)
// ve bu metin HTML olarak saklanıyor. HTML'i ekrana basmanın kolay yolu
// `dangerouslySetInnerHTML`; burada BİLEREK kullanılmıyor.
//
// Sebebi şu: duyuru yazma yetkisi onlarca kişide ve içerik SİSTEMDEKİ HERKESE
// pop-up olarak açılıyor. innerHTML kullanılsaydı, tek bir sanitizasyon açığı
// doğrudan uygulama içinde script çalıştırmaya dönerdi. Bunun yerine HTML
// burada bir AĞACA ayrıştırılıyor ve yalnız izin verilen etiketler React
// elemanı olarak üretiliyor. Tanınmayan her şey düz metne düşer — yani en
// kötü ihtimalde kullanıcı biçimsiz metin görür, asla kod çalışmaz.
// ══════════════════════════════════════════════════════════════

// İzinli etiketler. Liste dar: duyuruya biçim katmaya yeter, sayfa düzenini
// ele geçirmeye yetmez. (img/iframe yok — görsel ve video duyurunun kendi
// alanlarından, doğrulanmış adreslerle geliyor.)
export const ZENGIN_ETIKETLER = new Set([
  'p',
  'br',
  'b',
  'strong',
  'i',
  'em',
  'u',
  's',
  'h3',
  'h4',
  'ul',
  'ol',
  'li',
  'blockquote',
  'a',
  'code',
  'mark',
  'span',
]);

// Kendi kendine kapanan etiketler.
const BOS_ETIKETLER = new Set(['br']);

// Yalnız bu renkler — serbest `style` bir CSS enjeksiyon yüzeyidir
// (position/background ile sahte arayüz çizilebilir).
export const ZENGIN_RENKLER = [
  { id: '', ad: 'Varsayılan', deger: '' },
  { id: 'kirmizi', ad: 'Kırmızı', deger: '#B91C1C' },
  { id: 'yesil', ad: 'Yeşil', deger: '#047857' },
  { id: 'mavi', ad: 'Mavi', deger: '#1D4ED8' },
  { id: 'turuncu', ad: 'Turuncu', deger: '#B45309' },
  { id: 'mor', ad: 'Mor', deger: '#6D28D9' },
];
const IZINLI_RENK_DEGERLERI = new Set(
  ZENGIN_RENKLER.map((r) => r.deger.toLowerCase()).filter(Boolean)
);

const KACIS = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'",
  '&nbsp;': ' ',
};

// HTML varlıklarını çöz. Sayısal varlıklar da çözülür ki "&#60;script" gibi
// bir yazım ayrıştırmadan sonra metin olarak kalsın, etiket olarak değil.
export function zenginKacisCoz(s) {
  return String(s == null ? '' : s)
    .replace(/&(amp|lt|gt|quot|#39|nbsp);/g, (m) => KACIS[m] || m)
    .replace(/&#(\d{1,7});/g, (_m, n) => {
      const k = parseInt(n, 10);
      return k > 0 && k < 0x110000 ? String.fromCodePoint(k) : '';
    })
    .replace(/&#x([0-9a-fA-F]{1,6});/g, (_m, n) => {
      const k = parseInt(n, 16);
      return k > 0 && k < 0x110000 ? String.fromCodePoint(k) : '';
    });
}

// Bağlantı adresi: yalnız http/https/mailto. javascript:, data: ve
// protokolsüz `//host` biçimi reddedilir.
export function zenginBaglantiGuvenli(ham) {
  // Kontrol karakterleri BİLEREK ayıklanıyor: tarayıcılar "java&#9;script:"
  // yazımını çalıştırılabilir şema olarak kabul ediyor. Bu satır olmasaydı
  // araya sekme/satır sonu serpiştirilerek javascript: filtresi atlatılırdı.
  // eslint-disable-next-line no-control-regex
  const KONTROL_RX = new RegExp('[\\u0000-\\u001F\\s]', 'g');
  const s = zenginKacisCoz(ham).trim().replace(KONTROL_RX, '');
  if (!s) return '';
  if (/^https?:\/\/[^/]/i.test(s)) return s;
  if (/^mailto:[^@\s]+@[^@\s]+$/i.test(s)) return s;
  return '';
}

// Etiket özniteliklerinden yalnız işimize yarayanları al.
function ozellikleriCoz(ad, ham) {
  const out = {};
  const oku = (isim) => {
    const m = new RegExp(isim + '\\s*=\\s*("([^"]*)"|\'([^\']*)\')', 'i').exec(ham || '');
    return m ? (m[2] != null ? m[2] : m[3]) : '';
  };
  if (ad === 'a') {
    const href = zenginBaglantiGuvenli(oku('href'));
    if (!href) return null; // güvensiz adresli bağlantı etiketi hiç üretilmez
    out.href = href;
  }
  if (ad === 'span') {
    // style'dan YALNIZ color, o da izinli listeden.
    const stil = zenginKacisCoz(oku('style')).toLowerCase();
    const m = /(?:^|;)\s*color\s*:\s*([^;]+)/.exec(stil);
    const renk = m ? m[1].trim() : '';
    if (renk && IZINLI_RENK_DEGERLERI.has(renk)) out.renk = renk;
  }
  return out;
}

/**
 * HTML'i güvenli bir ağaca çevirir.
 *
 * Düğümler: { tip:'metin', deger } | { tip:'etiket', ad, ozellikler, cocuklar }
 * İzinsiz etiketin KENDİSİ atılır ama İÇERİĞİ korunur — bir `<div>` yüzünden
 * duyurunun yazısı kaybolmasın diye. `<script>`/`<style>` ise içeriğiyle
 * birlikte tamamen silinir.
 */
export function zenginAyristir(html) {
  const ham = String(html == null ? '' : html);
  const kok = { tip: 'etiket', ad: '#kok', ozellikler: {}, cocuklar: [] };
  const yigin = [kok];
  const ekle = (d) => yigin[yigin.length - 1].cocuklar.push(d);
  const metinEkle = (s) => {
    if (!s) return;
    const c = zenginKacisCoz(s);
    if (c) ekle({ tip: 'metin', deger: c });
  };

  const ETIKET_RX = /<\/?([a-zA-Z][a-zA-Z0-9]*)((?:"[^"]*"|'[^']*'|[^'">])*)\/?>/g;
  let son = 0;
  let m;
  while ((m = ETIKET_RX.exec(ham)) !== null) {
    metinEkle(ham.slice(son, m.index));
    son = ETIKET_RX.lastIndex;
    const tam = m[0];
    const ad = m[1].toLowerCase();
    const kapanis = tam.charAt(1) === '/';

    // script/style: içeriğiyle birlikte at.
    if (ad === 'script' || ad === 'style') {
      const kapat = new RegExp('</\\s*' + ad + '\\s*>', 'i');
      const kalan = ham.slice(son);
      const k = kapat.exec(kalan);
      son = k ? son + k.index + k[0].length : ham.length;
      ETIKET_RX.lastIndex = son;
      continue;
    }

    if (!ZENGIN_ETIKETLER.has(ad)) continue; // etiketi at, içeriği kalsın

    if (kapanis) {
      // En yakın eşleşen açık etikete kadar kapat; eşleşme yoksa yok say.
      for (let i = yigin.length - 1; i > 0; i -= 1) {
        if (yigin[i].ad === ad) {
          yigin.length = i;
          break;
        }
      }
      continue;
    }

    const ozellikler = ozellikleriCoz(ad, m[2]);
    if (ozellikler === null) continue; // ör. javascript: href'li <a>

    const dugum = { tip: 'etiket', ad, ozellikler, cocuklar: [] };
    ekle(dugum);
    if (!BOS_ETIKETLER.has(ad) && !/\/>$/.test(tam)) yigin.push(dugum);
  }
  metinEkle(ham.slice(son));
  return kok.cocuklar;
}

// Ağacı düz metne indirger — liste/önizleme ve "boş mu" kontrolü için.
export function zenginDuzMetin(html) {
  const gez = (dugumler) =>
    dugumler
      .map((d) => {
        if (d.tip === 'metin') return d.deger;
        if (d.ad === 'br') return '\n';
        const ic = gez(d.cocuklar);
        return d.ad === 'p' || d.ad === 'li' || d.ad === 'h3' || d.ad === 'h4' ? ic + '\n' : ic;
      })
      .join('');
  return gez(zenginAyristir(html))
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// Görünür içerik var mı? Boş `<p><br></p>` gibi editör artıkları "dolu"
// sayılmamalı, aksi hâlde boş duyuru kaydedilebilirdi.
export function zenginBosMu(html) {
  return zenginDuzMetin(html).replace(/\s/g, '') === '';
}
