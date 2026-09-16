// ══════════════════════════════════════════════════════════════
// ANKET SORULARININ ŞIKLARI
//
// ⚠ ŞIKLAR KODUN İÇİNE GÖMÜLÜYDU. Soru tipi 'likert' seçilince katılımcıya
// gösterilen beş etiket ("Kesinlikle katılmıyorum" … ) doğrudan JSX'in içine
// yazılmıştı. Anketi hazırlayan kişi ne etiketi değiştirebiliyor, ne şık
// ekleyip çıkarabiliyor, ne de kendi ölçeğini ("Hiç · Nadiren · Bazen · Sık ·
// Her zaman") kurabiliyordu. Elinde başka bir ölçek olan herkes anketi
// sisteme sığdırmak zorundaydı.
//
// Artık her kapalı uçlu soru kendi şıklarını taşıyabilir:
//
//     { id:'q1', type:'secenek', secenekler:[ {deger:'1', etiket:'…'}, … ] }
//
// ── TEK KAYNAK ──
// Şık listesini ÜÇ yer birden okur: doldurma ekranı (düğmeleri çizer),
// sonuç ekranı (dağılımı sayar) ve dışa aktarma (sütun başlıkları). Üçü
// ayrı ayrı hesaplarsa biri diğerinden kayar — nitekim kayıyordu:
// `optionsForType` ham değerleri ('1'…'5') döndürüyor, doldurma ekranı
// etiketli düğmeler çiziyordu. Kural burada tek yerde durur.
//
// ── DEĞER İLE ETİKET AYRI ──
// Kayıtlı yanıt ŞIKKIN DEĞERİdir, etiketi değil. Etiket sonradan
// düzeltilebilsin (yazım hatası, ifade değişikliği) ve eski yanıtlar
// bozulmasın diye. Değer bir kez yayımlandıktan sonra değiştirilmemeli;
// editör bunu kullanıcıya söyler.
// ══════════════════════════════════════════════════════════════

const metin = (v) => String(v == null ? '' : v).trim();

/**
 * Kapalı uçlu (şıklı) tipler ve gömülü varsayılan şıkları.
 *
 * `sayisal: true` olanlar ortalama/medyan hesabına girer. Özel şıklarda
 * sayısallık şıkların değerlerinden anlaşılır (bkz. seceneklerSayisalMi).
 */
const VARSAYILAN = {
  likert: {
    sayisal: true,
    secenekler: [
      { deger: '1', etiket: 'Kesinlikle katılmıyorum' },
      { deger: '2', etiket: 'Katılmıyorum' },
      { deger: '3', etiket: 'Kararsızım' },
      { deger: '4', etiket: 'Katılıyorum' },
      { deger: '5', etiket: 'Kesinlikle katılıyorum' },
    ],
  },
  yesno: {
    sayisal: false,
    secenekler: [
      { deger: 'evet', etiket: 'Evet' },
      { deger: 'hayır', etiket: 'Hayır' },
    ],
  },
  hours0to5: {
    sayisal: true,
    secenekler: ['0', '1', '2', '3', '4', '5'].map((d) => ({ deger: d, etiket: d })),
  },
  hoursRange: {
    sayisal: false,
    secenekler: ['0', '1-2', '3-4', '5-6', '7-8', '9-10'].map((d) => ({ deger: d, etiket: d })),
  },
  hoursExam: {
    sayisal: false,
    secenekler: ['0', '1-4', '5-8', '9-12', '13-16', '17-20'].map((d) => ({
      deger: d,
      etiket: d,
    })),
  },
  // Yeni tipler: şıkları anketi hazırlayan yazar. Varsayılan boş DEĞİL —
  // boş şıklı soru katılımcıya tıklanacak hiçbir şey göstermez; yeni soru
  // iki boş şıkla açılır ki editörde ne yapılacağı belli olsun.
  secenek: { sayisal: false, secenekler: [] },
  coklu: { sayisal: false, secenekler: [], cokluSecim: true },
};

/** Şıklı tipler (metin tipleri hariç). */
export const SECENEKLI_TIPLER = Object.keys(VARSAYILAN);

/** Birden çok şık işaretlenebilen tipler. */
export function cokluSecimMi(soru) {
  return !!(VARSAYILAN[metin(soru && soru.type)] || {}).cokluSecim;
}

/** Soru şıklı mı (metin kutusu değil)? */
export function secenekliMi(soru) {
  return Object.prototype.hasOwnProperty.call(VARSAYILAN, metin(soru && soru.type));
}

/** Tek bir şıkkı normalleştir. Dize de kabul edilir: 'Evet' → {deger:'Evet', etiket:'Evet'} */
function secenegiNormalle(ham) {
  if (ham == null) return null;
  if (typeof ham === 'string' || typeof ham === 'number') {
    const d = metin(ham);
    return d ? { deger: d, etiket: d } : null;
  }
  const deger = metin(ham.deger != null ? ham.deger : ham.value);
  const etiket = metin(ham.etiket != null ? ham.etiket : ham.label);
  if (!deger && !etiket) return null;
  // Değeri olmayan şık etiketiyle anılır (elle yazılan listelerde sık).
  return { deger: deger || etiket, etiket: etiket || deger };
}

/**
 * Sorunun ŞIKLARI — tek kaynak.
 *
 * Soruda özel şık varsa o kullanılır; yoksa tipin gömülü varsayılanı.
 * Metin sorularında boş dizi döner (çağıran `length === 0` ile ayırt eder).
 */
export function soruSecenekleri(soru) {
  const s = soru || {};
  const ozel = Array.isArray(s.secenekler)
    ? s.secenekler
    : Array.isArray(s.options)
      ? s.options
      : null;
  if (ozel) {
    const temiz = ozel.map(secenegiNormalle).filter(Boolean);
    if (temiz.length > 0) return tekillestir(temiz);
  }
  const v = VARSAYILAN[metin(s.type)];
  return v ? v.secenekler.slice() : [];
}

/** Aynı değerli şık iki kez sayılmasın — ilki kalır. */
function tekillestir(liste) {
  const gorulen = new Set();
  const out = [];
  liste.forEach((o) => {
    if (gorulen.has(o.deger)) return;
    gorulen.add(o.deger);
    out.push(o);
  });
  return out;
}

/** Şıkların yalnız değerleri — eski `optionsForType` çağrılarının karşılığı. */
export function soruDegerleri(soru) {
  return soruSecenekleri(soru).map((o) => o.deger);
}

/**
 * Bir yanıt değerinin okunabilir etiketi.
 *
 * Şık sonradan silinmişse değer olduğu gibi gösterilir: eski yanıt kaybolmaz,
 * "(silinmiş şık)" diye boş görünmez.
 */
export function secenekEtiketi(soru, deger) {
  const d = metin(deger);
  if (!d) return '';
  const bul = soruSecenekleri(soru).find((o) => o.deger === d);
  return bul ? bul.etiket : d;
}

/**
 * Şıklar sayısal mı? Ortalama/medyan yalnız sayısal ölçekte anlamlıdır.
 *
 * ⚠ Tipe değil ŞIKLARA bakılır. 'likert' tipini alıp şıklarını "Evet/Hayır"
 * yapan bir soru sayısal değildir; tersine, özel şıkları 1..5 olan bir
 * 'secenek' sorusu sayısaldır.
 */
export function seceneklerSayisalMi(soru) {
  const ops = soruSecenekleri(soru);
  if (ops.length === 0) return false;
  return ops.every((o) => /^-?\d+([.,]\d+)?$/.test(o.deger));
}

/** Şıkkın sayısal karşılığı; sayısal değilse null. */
export function secenekSayisi(deger) {
  const d = metin(deger).replace(',', '.');
  if (!/^-?\d+(\.\d+)?$/.test(d)) return null;
  const n = Number(d);
  return Number.isFinite(n) ? n : null;
}

// ══════════════════════════════════════════════════════════════
// HAZIR ÖLÇEKLER
//
// Elle şık yazmak zahmetli ve hataya açık; anketlerin çoğu zaten birkaç
// standart ölçekten birini kullanıyor. Seçilen ölçek soruya KOPYALANIR —
// bağlı kalmaz, çünkü kullanıcı hemen ardından bir şıkkı düzeltebilmeli.
// ══════════════════════════════════════════════════════════════

const olcek = (etiketler, baslangic = 1) =>
  etiketler.map((e, i) => ({ deger: String(baslangic + i), etiket: e }));

export const ANKET_OLCEKLERI = [
  {
    id: 'katilim5',
    ad: '5’li katılım',
    ornek: 'Kesinlikle katılmıyorum → Kesinlikle katılıyorum',
    secenekler: olcek([
      'Kesinlikle katılmıyorum',
      'Katılmıyorum',
      'Kararsızım',
      'Katılıyorum',
      'Kesinlikle katılıyorum',
    ]),
  },
  {
    id: 'katilim3',
    ad: '3’lü katılım',
    ornek: 'Katılmıyorum · Kararsızım · Katılıyorum',
    secenekler: olcek(['Katılmıyorum', 'Kararsızım', 'Katılıyorum']),
  },
  {
    id: 'memnuniyet5',
    ad: '5’li memnuniyet',
    ornek: 'Hiç memnun değilim → Çok memnunum',
    secenekler: olcek([
      'Hiç memnun değilim',
      'Memnun değilim',
      'Kararsızım',
      'Memnunum',
      'Çok memnunum',
    ]),
  },
  {
    id: 'yeterlilik5',
    ad: '5’li yeterlilik',
    ornek: 'Çok yetersiz → Çok yeterli',
    secenekler: olcek(['Çok yetersiz', 'Yetersiz', 'Orta', 'Yeterli', 'Çok yeterli']),
  },
  {
    id: 'siklik5',
    ad: '5’li sıklık',
    ornek: 'Hiçbir zaman → Her zaman',
    secenekler: olcek(['Hiçbir zaman', 'Nadiren', 'Bazen', 'Sık sık', 'Her zaman']),
  },
  {
    id: 'onem5',
    ad: '5’li önem',
    ornek: 'Hiç önemli değil → Çok önemli',
    secenekler: olcek(['Hiç önemli değil', 'Önemli değil', 'Kararsızım', 'Önemli', 'Çok önemli']),
  },
  {
    id: 'evethayir',
    ad: 'Evet / Hayır',
    ornek: 'İki şık',
    secenekler: [
      { deger: 'evet', etiket: 'Evet' },
      { deger: 'hayır', etiket: 'Hayır' },
    ],
  },
  {
    id: 'evethayirkararsiz',
    ad: 'Evet / Hayır / Kararsızım',
    ornek: 'Üç şık',
    secenekler: [
      { deger: 'evet', etiket: 'Evet' },
      { deger: 'kararsız', etiket: 'Kararsızım' },
      { deger: 'hayır', etiket: 'Hayır' },
    ],
  },
];

/** Hazır ölçeğin şıklarının KOPYASI (bağlı kalmaz, düzenlenebilir). */
export function olcekSecenekleri(id) {
  const o = ANKET_OLCEKLERI.find((x) => x.id === metin(id));
  return o ? o.secenekler.map((s) => ({ ...s })) : [];
}

/**
 * Sorunun şıkları hangi hazır ölçekle birebir aynı? (Editör "5'li katılım"
 * yazsın diye.) Eşleşme yoksa '' döner.
 */
export function olcekKimligi(soru) {
  const ops = soruSecenekleri(soru);
  if (ops.length === 0) return '';
  const imza = (liste) => liste.map((o) => o.deger + ' ' + o.etiket).join('');
  const benim = imza(ops);
  const bul = ANKET_OLCEKLERI.find((o) => imza(o.secenekler) === benim);
  return bul ? bul.id : '';
}

// ══════════════════════════════════════════════════════════════
// DÜZENLEME VE DOĞRULAMA
// ══════════════════════════════════════════════════════════════

/** Yeni şık eklerken çakışmayan bir değer üret ('1','2',… ya da 'secenek4'). */
export function yeniSecenekDegeri(mevcut) {
  const kullanilan = new Set((mevcut || []).map((o) => metin(o && o.deger)));
  // Liste tamamen sayısalsa sayıyı sürdür — ölçek bozulmasın.
  const sayilar = [...kullanilan].map(secenekSayisi).filter((n) => n != null);
  if (kullanilan.size > 0 && sayilar.length === kullanilan.size) {
    let n = Math.floor(Math.max(...sayilar)) + 1;
    while (kullanilan.has(String(n))) n++;
    return String(n);
  }
  let i = kullanilan.size + 1;
  while (kullanilan.has('secenek' + i)) i++;
  return 'secenek' + i;
}

/** Şıkkı listede taşı (yön: -1 yukarı, +1 aşağı). Sınır dışıysa liste aynen döner. */
export function secenegiTasi(secenekler, index, yon) {
  const liste = Array.isArray(secenekler) ? secenekler.slice() : [];
  const hedef = index + yon;
  if (index < 0 || index >= liste.length || hedef < 0 || hedef >= liste.length) return liste;
  const [alinan] = liste.splice(index, 1);
  liste.splice(hedef, 0, alinan);
  return liste;
}

/**
 * Anket kaydedilmeden önceki şık denetimi.
 *
 * ⚠ Bunlar kozmetik değil: etiketsiz şık katılımcıya boş bir düğme olarak
 * çıkar, aynı değerli iki şık sonuçlarda tek satırda toplanır ve oy kaybolur,
 * şıksız kapalı uçlu soru ise hiç yanıtlanamaz.
 */
export function secenekHatalari(soru) {
  const s = soru || {};
  if (!secenekliMi(s)) return [];
  const ozel = Array.isArray(s.secenekler) ? s.secenekler : null;
  const hatalar = [];
  const ops = soruSecenekleri(s);
  if (ops.length === 0) {
    hatalar.push('Bu soruda hiç şık yok; katılımcı yanıtlayamaz.');
    return hatalar;
  }
  if (ops.length === 1) hatalar.push('Tek şıklı soru anlamlı değil; en az iki şık gerekir.');
  if (ozel) {
    if (ozel.some((o) => !metin(o && (o.etiket != null ? o.etiket : o.label)))) {
      hatalar.push('Etiketi boş şık var.');
    }
    const degerler = ozel.map((o) => metin(o && (o.deger != null ? o.deger : o.value)));
    const dolu = degerler.filter(Boolean);
    if (new Set(dolu).size !== dolu.length) hatalar.push('Aynı değere sahip iki şık var.');
  }
  return hatalar;
}

/** Anketin tamamı için şık denetimi → [{ index, soru, hatalar }] */
export function anketSecenekHatalari(sorular) {
  const out = [];
  (sorular || []).forEach((q, i) => {
    const h = secenekHatalari(q);
    if (h.length > 0) out.push({ index: i, soru: q, hatalar: h });
  });
  return out;
}

/**
 * Tip değişince şıklara ne olmalı?
 *
 * ⚠ Sessizce korumak da sessizce silmek de yanlış olurdu. Kullanıcı
 * "Likert"ten "Kısa metin"e geçerse şıkların anlamı kalmaz; "Likert"ten
 * "Çoktan seçmeli"ye geçerse elindeki ölçeği kaybetmek istemez. Kural:
 *   • metin tipine geçişte şıklar DÜŞER,
 *   • şıklı tipler arasında geçişte ÖZEL şıklar korunur,
 *   • gömülü varsayılanla çalışan soru yeni tipin varsayılanına geçer.
 */
export function tipDegisiminde(soru, yeniTip) {
  const s = soru || {};
  const sonraki = { ...s, type: metin(yeniTip) };
  if (!secenekliMi(sonraki)) {
    delete sonraki.secenekler;
    return sonraki;
  }
  const ozel = Array.isArray(s.secenekler) && s.secenekler.length > 0;
  if (!ozel) delete sonraki.secenekler;
  return sonraki;
}
