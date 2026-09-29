// Word üst bilgi (header) / alt bilgi (footer) yer tutucularını doldurur.
//
// Şablon motoru alan eşlemesini yalnızca word/document.xml üzerinde yapar;
// üst/alt bilgideki {{…}} yer tutucular olduğu gibi kalırdı. Bu yardımcı,
// çağıranın verdiği { "Etiket": "değer" } sözlüğüyle onları doldurur.
// Eşleşme büyük/küçük harf, boşluk ve noktalama duyarsızdır; sözlükte
// karşılığı olmayan yer tutucuya dokunulmaz. Yer tutucunun tek bir <w:t>
// içinde durması gerekir (Word'de tek seferde yazıldığında böyledir).

export function ustAltAnahtar(s) {
  return String(s == null ? '' : s)
    .replace(/İ/g, 'i')
    .replace(/I/g, 'ı')
    .toLocaleLowerCase('tr-TR')
    .replace(/[^0-9a-zçğıöşü]/g, '');
}

const xmlKacir = (s) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** degerler: { etiket: değer } → normalize anahtarlı sözlük */
export function ustAltSozluk(degerler) {
  const s = {};
  Object.keys(degerler || {}).forEach((k) => {
    const a = ustAltAnahtar(k);
    if (a && !(a in s)) s[a] = degerler[k] == null ? '' : String(degerler[k]);
  });
  return s;
}

/** Tek bir header/footer XML'indeki yer tutucuları doldurur. */
export function ustAltBilgiDoldur(xml, sozluk) {
  return String(xml).replace(/(<w:t(?:\s[^>]*)?>)([^<]*)(<\/w:t>)/g, (tam, ac, metin, kapa) => {
    if (metin.indexOf('{{') < 0) return tam;
    const yeni = metin.replace(/\{\{([^{}]+)\}\}/g, (yt, ic) => {
      const a = ustAltAnahtar(ic);
      return a in sozluk ? xmlKacir(sozluk[a]) : yt;
    });
    if (yeni === metin) return tam;
    const acPreserve = /xml:space=/.test(ac) ? ac : ac.replace('<w:t', '<w:t xml:space="preserve"');
    return acPreserve + yeni + kapa;
  });
}

export const UST_ALT_PARCA_RX = /^word\/(header|footer)\d*\.xml$/;
