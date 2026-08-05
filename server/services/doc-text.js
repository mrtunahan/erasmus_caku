// ══════════════════════════════════════════════════════════════
// Belge → model girdisi dönüştürücü.
//
// Üç yol vardır ve seçim uzantıya göredir:
//   PDF   → base64 `document` bloğu (modelin kendi PDF okuyucusu; taranmış
//           belgelerde de çalışır, düzen/tablo yapısı korunur)
//   DOCX  → mammoth ile düz metin
//   XLSX  → SheetJS ile sayfa başına CSV metni
//
// Uzun belgeler bölümlenir (chunk). PDF'ler bölümlenmez: sayfa sınırını aşan
// PDF reddedilir (sunucuda PDF kesme kütüphanesi yok — sessizce yarısını
// göndermektense açıkça hata vermek doğrusu).
// ══════════════════════════════════════════════════════════════
const fs = require('fs');
const path = require('path');

// 200K bağlam penceresine sahip modellerde PDF sayfa sınırı 100'dür.
const PDF_MAX_PAGES = 100;
// İstek gövdesi sınırı 32 MB; base64 ~%33 şişirdiği için ham dosyada ~22 MB.
const PDF_MAX_BYTES = 22 * 1024 * 1024;

// Bir parçaya sığdırılacak karakter bütçesi. Türkçe metin ~2.5 karakter/token
// olduğundan 120.000 karakter ≈ 48K token — önbelleğe alınan önek ve çıktı
// için 200K pencerede bolca yer bırakır.
const CHUNK_CHARS = 120000;
const CHUNK_OVERLAP = 2000;

const TEXT_EXT = new Set(['txt', 'csv', 'md', 'json']);

function extOf(nameOrPath) {
  return path
    .extname(String(nameOrPath || ''))
    .replace('.', '')
    .toLowerCase();
}

// PDF sayfa sayısı — sayfa ağacındaki `/Type /Page` düğümlerini sayar.
// Kesin değil ama sınır kontrolü için yeterli; hata durumunda 0 döner
// (0 = "bilinmiyor", sınır kontrolünü atlatır, model zaten reddeder).
function pdfSayfaSayisi(buf) {
  try {
    const s = buf.toString('latin1');
    const m = s.match(/\/Type\s*\/Page[^s]/g);
    return m ? m.length : 0;
  } catch (_) {
    return 0;
  }
}

async function docxMetin(buf) {
  const mammoth = require('mammoth');
  const res = await mammoth.extractRawText({ buffer: buf });
  return String(res && res.value ? res.value : '').trim();
}

function xlsxMetin(buf) {
  const XLSX = require('xlsx');
  const wb = XLSX.read(buf, { type: 'buffer' });
  const parcalar = [];
  (wb.SheetNames || []).forEach((ad) => {
    const sheet = wb.Sheets[ad];
    if (!sheet) return;
    const csv = XLSX.utils.sheet_to_csv(sheet, { blankrows: false });
    if (csv && csv.trim()) parcalar.push('## Sayfa: ' + ad + '\n' + csv.trim());
  });
  return parcalar.join('\n\n').trim();
}

// Metni parçalara böler. Bölme noktası satır sonuna hizalanır ki tablo
// satırları ortadan ikiye ayrılmasın.
function parcala(metin, limit = CHUNK_CHARS, bindirme = CHUNK_OVERLAP) {
  const s = String(metin || '');
  if (s.length <= limit) return [s];
  const out = [];
  let i = 0;
  while (i < s.length) {
    let son = Math.min(i + limit, s.length);
    if (son < s.length) {
      const nl = s.lastIndexOf('\n', son);
      if (nl > i + limit * 0.5) son = nl;
    }
    out.push(s.slice(i, son));
    if (son >= s.length) break;
    i = Math.max(son - bindirme, i + 1);
  }
  return out;
}

/**
 * Bir dosyayı model içerik bloklarına çevirir.
 *
 * @param {{path?:string, buffer?:Buffer, name:string}} dosya
 * @returns {Promise<{ok:boolean, reason?:string, tur:'pdf'|'text',
 *   bloklar?:Array<object>, metin?:string, sayfa?:number}>}
 */
// İçerikten biçim tespiti — dosya adı/yolu uzantı taşımadığında.
// `name` çoğu çağrıda insan-okur bir etikettir ("Transkript", "Öğrenci Not
// Çizelgesi"), uzantı içermez; bu yüzden asla tek kaynak olarak kullanılamaz.
function magicUzanti(buf) {
  if (!buf || buf.length < 4) return '';
  if (buf.slice(0, 5).toString('latin1') === '%PDF-') return 'pdf';
  // ZIP kabı: docx ve xlsx aynı imzayı taşır, içeriğe bakarak ayrılır.
  if (buf[0] === 0x50 && buf[1] === 0x4b) {
    const bas = buf.slice(0, Math.min(buf.length, 4096)).toString('latin1');
    const son = buf.slice(Math.max(0, buf.length - 65536)).toString('latin1');
    const hepsi = bas + son;
    if (hepsi.includes('word/')) return 'docx';
    if (hepsi.includes('xl/')) return 'xlsx';
  }
  return '';
}

async function dosyaBloklari(dosya) {
  let buf = dosya.buffer;
  if (!buf && dosya.path) {
    if (!fs.existsSync(dosya.path)) return { ok: false, reason: 'not-found', tur: 'text' };
    buf = fs.readFileSync(dosya.path);
  }
  if (!buf) return { ok: false, reason: 'empty', tur: 'text' };

  // Uzantı sırası: DİSKTEKİ YOL → görünen ad → içerik imzası.
  // Yol gerçek dosya adını taşır; `name` yalnızca etiket olabilir.
  const uzanti = extOf(dosya.path) || extOf(dosya.name) || magicUzanti(buf);

  if (uzanti === 'pdf') {
    if (buf.length > PDF_MAX_BYTES) return { ok: false, reason: 'pdf-too-large', tur: 'pdf' };
    const sayfa = pdfSayfaSayisi(buf);
    if (sayfa > PDF_MAX_PAGES)
      return { ok: false, reason: 'pdf-too-many-pages', tur: 'pdf', sayfa };
    return {
      ok: true,
      tur: 'pdf',
      sayfa,
      bloklar: [
        {
          type: 'document',
          source: { type: 'base64', media_type: 'application/pdf', data: buf.toString('base64') },
        },
      ],
    };
  }

  let metin = '';
  if (uzanti === 'docx') metin = await docxMetin(buf);
  else if (uzanti === 'xlsx' || uzanti === 'xls') metin = xlsxMetin(buf);
  else if (TEXT_EXT.has(uzanti)) metin = buf.toString('utf8').trim();
  else return { ok: false, reason: 'unsupported-type:' + (uzanti || '?'), tur: 'text' };

  if (!metin) return { ok: false, reason: 'no-text', tur: 'text' };
  return { ok: true, tur: 'text', metin };
}

/**
 * Birden çok dosyayı tek bir "istek grubu" listesine çevirir. Metin dosyaları
 * birleştirilip parçalanır; PDF'ler kendi bloklarını korur. Dönen her eleman
 * tek bir model çağrısının `content` dizisidir.
 */
async function istekGruplari(dosyalar) {
  const hatalar = [];
  const pdfBloklari = [];
  const metinler = [];

  for (const d of dosyalar) {
    const r = await dosyaBloklari(d);
    if (!r.ok) {
      hatalar.push({ name: d.name, reason: r.reason, sayfa: r.sayfa });
      continue;
    }
    if (r.tur === 'pdf') pdfBloklari.push({ name: d.name, blok: r.bloklar[0] });
    else metinler.push('===== BELGE: ' + (d.name || 'belge') + ' =====\n' + r.metin);
  }

  const gruplar = [];
  // PDF'ler tek çağrıda gider (her biri ayrı blok; model hepsini görür).
  if (pdfBloklari.length > 0) {
    const icerik = [];
    pdfBloklari.forEach((p) => {
      icerik.push({ type: 'text', text: 'BELGE: ' + (p.name || 'belge') });
      icerik.push(p.blok);
    });
    gruplar.push(icerik);
  }
  // Metinler birleştirilip gerekiyorsa parçalanır.
  if (metinler.length > 0) {
    parcala(metinler.join('\n\n')).forEach((p, i, arr) => {
      const baslik = arr.length > 1 ? '(Bölüm ' + (i + 1) + '/' + arr.length + ')\n' : '';
      gruplar.push([{ type: 'text', text: baslik + p }]);
    });
  }

  return { gruplar, hatalar };
}

module.exports = {
  dosyaBloklari,
  istekGruplari,
  parcala,
  extOf,
  PDF_MAX_PAGES,
  PDF_MAX_BYTES,
  CHUNK_CHARS,
};
