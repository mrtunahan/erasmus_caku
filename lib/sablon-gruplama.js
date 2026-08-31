// ══════════════════════════════════════════════════════════════
// ŞABLON GRUPLAMA
//
// Şablonlar listesi düz bir şerit hâlinde geliyordu: on altı kayıt alt alta,
// aralarındaki tek fark kartın solundaki dört piksellik renk. Hangi modüle
// kaç şablon yüklendiğini görmek için bütün listeyi okumak gerekiyordu.
//
// Ekran artık MODÜL MODÜL bölünüyor. Bölme kuralı — sıra, grup içi sıralama,
// "kaç tanesi eşleme bekliyor" sayımı — burada duruyor: sayfada değil, çünkü
// bu kurallar sınanabilir ve sayfadan bağımsız.
//
// Sayfa yalnız çizer; ne çizeceğini buradan okur.
// ══════════════════════════════════════════════════════════════

/**
 * Yer tutucu eşlemesi yapılabilen biçimler.
 *
 * .docx ve .xlsx içinde {{alan}} yer tutucuları okunabildiği için ikisi
 * doldurulabilir. .pdf yüklenebilir ama doldurulamaz: onun için "eşleme
 * eksik" uyarısı yanlış olurdu.
 */
export const ESLENEBILIR_UZANTILAR = ['docx', 'xlsx'];

/** Şablon dosyası yer tutucu eşlemesi kaldırıyor mu? */
export function eslenebilirMi(dosya) {
  if (!dosya) return false;
  const uzanti = String(dosya.extension || '')
    .trim()
    .replace(/^\./, '')
    .toLowerCase();
  return ESLENEBILIR_UZANTILAR.indexOf(uzanti) >= 0;
}

/** Bir değişkene bağlanmış alan sayısı. */
export function eslenenAlanSayisi(sablon) {
  const alanlar = (sablon && sablon.fields) || [];
  if (!Array.isArray(alanlar)) return 0;
  return alanlar.filter((a) => a && a.variable).length;
}

/**
 * Tek şablonun durumu — kart bunu okuyup çizer.
 *
 * `eksik`: dosya doldurulabilir ama hiçbir alan eşlenmemiş. Bu durumda
 * şablon "yüklü" görünür ama çıktı üretilemez; ekranda ayrıca söylenmesi
 * gereken tek durum budur.
 */
export function sablonDurumu(sablon) {
  const eslenebilir = eslenebilirMi(sablon && sablon.file);
  const eslenen = eslenenAlanSayisi(sablon);
  return {
    eslenebilir,
    eslenen,
    eksik: eslenebilir && eslenen === 0,
    pasif: !!sablon && sablon.isActive === false,
  };
}

/**
 * Grup içi sıralama: önce varsayılan, sonra aktifler, sonra ada göre.
 *
 * Sunucudan gelen sıra güncellenme tarihine göre; kullanıcı için anlamı yok.
 * Varsayılan şablon o modülde fiilen kullanılan şablondur, listenin başında
 * durması gerekir; pasifler en sona düşer.
 */
export function grupSiralamasi(kayitlar) {
  return (kayitlar || []).slice().sort((a, b) => {
    if (!!b.isDefault !== !!a.isDefault) return b.isDefault ? 1 : -1;
    const ap = a.isActive === false;
    const bp = b.isActive === false;
    if (ap !== bp) return ap ? 1 : -1;
    return String(a.name || '').localeCompare(String(b.name || ''), 'tr');
  });
}

/**
 * Şablonları modüle göre böler.
 *
 * @param sablonlar süzülmüş şablon listesi
 * @param modulSirasi ekrandaki modül tanımları ([{id,label,color}…]) —
 *        gruplar bu SIRAYLA döner, yoksa modül sırası kayıttan kayda değişir
 *        ve ekran her yenilemede başka görünürdü.
 * @returns [{ modul, meta, kayitlar, toplam, eksikEsleme, pasif }]
 *
 * Tanımsız bir modül kimliği taşıyan kayıt kaybolmaz: listenin sonuna kendi
 * grubuyla eklenir. Sessizce düşürmek, yüklenmiş bir şablonu görünmez yapardı.
 */
export function sablonlariGrupla(sablonlar, modulSirasi) {
  const liste = Array.isArray(sablonlar) ? sablonlar.filter(Boolean) : [];
  const tanimli = Array.isArray(modulSirasi) ? modulSirasi.filter(Boolean) : [];
  const sira = tanimli.map((m) => String(m.id));
  const kova = new Map();

  liste.forEach((s) => {
    const anahtar = String((s && s.module) || '') || 'tanimsiz';
    if (!kova.has(anahtar)) kova.set(anahtar, []);
    kova.get(anahtar).push(s);
  });

  const anahtarlar = sira
    .filter((id) => kova.has(id))
    .concat(Array.from(kova.keys()).filter((id) => sira.indexOf(id) < 0));

  return anahtarlar.map((id) => {
    const kayitlar = grupSiralamasi(kova.get(id));
    const meta = tanimli.find((m) => String(m.id) === id) || { id, label: id, color: null };
    return {
      modul: id,
      meta,
      kayitlar,
      toplam: kayitlar.length,
      eksikEsleme: kayitlar.filter((k) => sablonDurumu(k).eksik).length,
      pasif: kayitlar.filter((k) => k.isActive === false).length,
    };
  });
}

/**
 * Hiç şablonu olmayan modüller.
 *
 * Boş modül için bölüm çizmek ekranı on iki boş kutuyla doldururdu; ama
 * hangi modülde şablon OLMADIĞI da bilgidir — tek satırda söylenir.
 */
export function bosModuller(sablonlar, modulSirasi) {
  const dolu = new Set(
    (Array.isArray(sablonlar) ? sablonlar : [])
      .filter(Boolean)
      .map((s) => String((s && s.module) || ''))
  );
  return (Array.isArray(modulSirasi) ? modulSirasi : [])
    .filter(Boolean)
    .filter((m) => !dolu.has(String(m.id)));
}
