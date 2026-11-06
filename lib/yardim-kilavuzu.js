// ══════════════════════════════════════════════════════════════
// YARDIM KILAVUZU
//
// Giriş ekranındaki "Yardım Kılavuzu" düğmesi bu içeriği gösterir; kılavuz
// PDF olarak da indirilebilir. İçerik Markdown'dır ve iki kaynaktan gelir:
//
//   1. `yardim_kilavuzlari/<id>` kaydı — üniversite yetkilisinin sistem
//      içinden (Yardım Kılavuzu modülü) yazdığı güncel metin.
//   2. Kayıt yoksa bu depodaki varsayılan metin (yardim-kilavuzu-ogrenci.md).
//      Sistem değiştikçe bu dosya da güncellenir; yetkili "Varsayılana dön"
//      ile en son varsayılanı alabilir.
//
// Okuma anonimdir (giriş öncesi gösterilir; kişisel veri taşımaz), yazma
// yalnız üniversite yetkilisinindir — sunucu kuralı server/routes/db.js.
//
// Görüntüleme için küçük, bağımlılıksız bir Markdown → HTML çevirici burada.
// Desteklenen: # ## ### başlıklar, paragraflar, 1. numaralı ve - madde
// listeleri (girintiyle bir alt düzey), | tablolar |, **kalın**, `kod`,
// [bağlantı](https://…). HTML önce kaçışlanır; istemci ayrıca DOMPurify'dan
// geçirir.
// ══════════════════════════════════════════════════════════════
import varsayilanOgrenci from './yardim-kilavuzu-ogrenci.md?raw';

export const YARDIM_KOLEKSIYONU = 'yardim_kilavuzlari';

/** Tanımlı kılavuzlar. Şimdilik yalnız öğrenci kılavuzu var. */
export const KILAVUZLAR = [
  { id: 'ogrenci', baslik: 'Öğrenci Kılavuzu', varsayilan: varsayilanOgrenci },
];

export const EN_UZUN_ICERIK = 200000; // karakter

export function kilavuzTanimi(id) {
  return KILAVUZLAR.find((k) => k.id === id) || KILAVUZLAR[0];
}

/** Metnin kısa özeti (djb2) — varsayılan metnin değişip değişmediğini anlamak için. */
export function metinOzeti(metin) {
  let h = 5381;
  const m = String(metin || '');
  for (let i = 0; i < m.length; i += 1) h = ((h << 5) + h + m.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}

/**
 * Kayıt + varsayılan → gösterilecek kılavuz.
 * @param {object|null} kayit  yardim_kilavuzlari kaydı ({icerik, updatedAt, updatedBy})
 * @param {string} id
 */
export function kilavuzCoz(kayit, id) {
  const t = kilavuzTanimi(id);
  const icerik = kayit && typeof kayit.icerik === 'string' ? kayit.icerik.trim() : '';
  return {
    id: t.id,
    baslik: t.baslik,
    icerik: icerik || t.varsayilan,
    ozel: !!icerik,
    updatedAt: (icerik && kayit.updatedAt) || '',
    updatedBy: (icerik && kayit.updatedBy) || '',
    varsayilanOzeti: metinOzeti(t.varsayilan),
    // Yetkili kendi metnini kaydettikten SONRA sistemin varsayılan kılavuzu
    // güncellendiyse (yeni özellik anlatıldıysa) düzenleme ekranı uyarır.
    varsayilanGuncellendi:
      !!icerik && !!kayit.varsayilanOzeti && kayit.varsayilanOzeti !== metinOzeti(t.varsayilan),
  };
}

function kacis(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Satır içi biçim: kalın, kod, bağlantı (yalnız http/https/mailto). */
export function satirIci(metin) {
  let s = kacis(metin);
  s = s.replace(/`([^`]+)`/g, '<code>$1</code>');
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/\[([^\]]+)\]\(((?:https?:\/\/|mailto:)[^\s)]+)\)/g, (m, t, u) => {
    return '<a href="' + u + '" target="_blank" rel="noopener noreferrer">' + t + '</a>';
  });
  return s;
}

function tabloSatiri(satir) {
  return satir
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((h) => h.trim());
}

const LISTE = /^(\s*)(\d+\.|[-*])\s+(.*)$/;

/**
 * Markdown → HTML. Başlıklara `id` verilir (içindekiler için).
 * @returns {{html: string, basliklar: {id:string, metin:string, duzey:number}[]}}
 */
export function kilavuzHtml(md) {
  const satirlar = String(md || '')
    .replace(/\r\n?/g, '\n')
    .split('\n');
  const out = [];
  const basliklar = [];
  let paragraf = [];
  let i = 0;

  const paragrafKapat = () => {
    if (paragraf.length) out.push('<p>' + satirIci(paragraf.join(' ')) + '</p>');
    paragraf = [];
  };

  while (i < satirlar.length) {
    const satir = satirlar[i];
    const bos = !satir.trim();
    if (bos) {
      paragrafKapat();
      i += 1;
      continue;
    }

    const b = /^(#{1,4})\s+(.*)$/.exec(satir);
    if (b) {
      paragrafKapat();
      const duzey = b[1].length;
      const id = 'b' + (basliklar.length + 1);
      basliklar.push({ id, metin: b[2].replace(/\*\*/g, ''), duzey });
      out.push('<h' + duzey + ' id="' + id + '">' + satirIci(b[2]) + '</h' + duzey + '>');
      i += 1;
      continue;
    }

    // Tablo: başlık satırı + ayraç satırı (| --- |)
    if (/^\s*\|/.test(satir) && /^\s*\|?\s*:?-{3,}/.test(satirlar[i + 1] || '')) {
      paragrafKapat();
      const baslik = tabloSatiri(satir);
      i += 2;
      const govde = [];
      while (i < satirlar.length && /^\s*\|/.test(satirlar[i])) {
        govde.push(tabloSatiri(satirlar[i]));
        i += 1;
      }
      out.push(
        '<table><thead><tr>' +
          baslik.map((h) => '<th>' + satirIci(h) + '</th>').join('') +
          '</tr></thead><tbody>' +
          govde
            .map(
              (r) =>
                '<tr>' +
                baslik.map((_, k) => '<td>' + satirIci(r[k] || '') + '</td>').join('') +
                '</tr>'
            )
            .join('') +
          '</tbody></table>'
      );
      continue;
    }

    const l = LISTE.exec(satir);
    if (l && l[1].length < 2) {
      paragrafKapat();
      const sirali = /\d/.test(l[2]);
      const ogeler = [];
      while (i < satirlar.length) {
        const m = LISTE.exec(satirlar[i]);
        if (!m) break;
        if (m[1].length >= 2 && ogeler.length) {
          // Alt düzey: bir önceki ögenin altına
          const son = ogeler[ogeler.length - 1];
          son.alt.push({ sirali: /\d/.test(m[2]), metin: m[3] });
        } else if (m[1].length < 2 && /\d/.test(m[2]) === sirali) {
          ogeler.push({ metin: m[3], alt: [] });
        } else break;
        i += 1;
      }
      const etiket = sirali ? 'ol' : 'ul';
      out.push(
        '<' +
          etiket +
          '>' +
          ogeler
            .map((o) => {
              let alt = '';
              if (o.alt.length) {
                const at = o.alt[0].sirali ? 'ol' : 'ul';
                alt =
                  '<' +
                  at +
                  '>' +
                  o.alt.map((a) => '<li>' + satirIci(a.metin) + '</li>').join('') +
                  '</' +
                  at +
                  '>';
              }
              return '<li>' + satirIci(o.metin) + alt + '</li>';
            })
            .join('') +
          '</' +
          etiket +
          '>'
      );
      continue;
    }

    paragraf.push(satir.trim());
    i += 1;
  }
  paragrafKapat();
  return { html: out.join('\n'), basliklar };
}
