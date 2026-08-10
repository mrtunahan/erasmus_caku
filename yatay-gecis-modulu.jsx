// ══════════════════════════════════════════════════════════════
// ÇAKÜ — Yatay Geçiş Modülü
//
// Üç geçiş türü ayrı sekmelerde yürür:
//   kurumici      → Kurum İçi Yatay Geçiş
//   kurumlararasi → Kurumlararası (Yurt İçi) Yatay Geçiş  [%40 YKS + %60 AGNO]
//   merkezi       → Merkezi Yerleştirme Puanı ile Yatay Geçiş (Ek Madde 1)
//
// Öğrenci tarafı : başvuru formu (sistemde olan alanlar dolu ve salt-okunur)
//                  + üç zorunlu ek.
// Akademisyen    : başvuruları görür, her satır için DEĞERLENDİRME seçer;
//                  tüm başvurular değerlendirilince "Belge Oluştur" açılır ve
//                  bölümün tüm başvuranlarını içeren değerlendirme raporu
//                  üretilir (şablon: Şablonlar → Yatay Geçiş → ilgili tür).
//
// Veri: yatay_gecis_basvurular
// ══════════════════════════════════════════════════════════════

const { useState, useEffect, useMemo, useCallback } = React;

import { puanaGoreSirala, asilYedekOner } from './lib/yatay-siralama.js';

const YG = {
  navy: '#1B2A4A',
  accent: '#B45309',
  accentPale: '#FEF3C7',
  text: '#1F2937',
  textMuted: '#6B7280',
  border: '#E5E7EB',
  green: '#059669',
  greenLight: '#D1FAE5',
  red: '#DC2626',
  redLight: '#FEE2E2',
  bg: '#F8F9FB',
};

// ── Geçiş türleri ──
// `alanlar`: o türde öğrenciden istenen ek alanlar (ortak alanlar hepsinde var)
const YG_TURLER = [
  {
    id: 'kurumici',
    label: 'Kurum İçi Yatay Geçiş',
    tamAd: 'Kurum İçi Yatay Geçiş',
    color: '#B45309',
    bg: '#FEF3C7',
    aciklama: 'Üniversite içindeki başka bir bölümden aynı üniversitenin bölümüne geçiş',
    // Kurum içi geçişte YKS puanı ve not ortalaması istenmez — şablonunda
    // bu sütunlar yok, karar bölüm kurulunun değerlendirmesiyle verilir.
    puanIster: false,
    notIster: false,
  },
  {
    id: 'kurumlararasi',
    label: 'Kurumlararası Yatay Geçiş',
    tamAd: 'Başarı Düzeyi ile Kurumlararası (Yurt İçi) Yatay Geçiş',
    color: '#0F766E',
    bg: '#CCFBF1',
    aciklama: "Başka bir üniversiteden geçiş — YKS puanının %40'ı + not ortalamasının %60'ı",
    puanIster: true,
    notIster: true,
    hesapla: true, // yerleştirmeye esas puan sistemce hesaplanır
  },
  {
    id: 'merkezi',
    label: 'Merkezi Yerleştirme Puanı ile Yatay Geçiş',
    tamAd: 'Merkezi Yerleştirme Puanı ile Yatay Geçiş (Ek Madde 1)',
    color: '#6D28D9',
    bg: '#F3E8FF',
    aciklama: 'ÖSYS/YKS yerleştirme puanı, başvurulan programın taban puanına eşit veya üstü ise',
    puanIster: true,
    notIster: false,
  },
];

// ── Zorunlu ekler ──
// `turler` verilmezse ek TÜM geçiş türlerinde istenir; verilirse yalnız
// sayılan türlerde görünür ve yalnız orada zorunluluk denetimine girer.
const YG_EKLER = [
  {
    id: 'transkript',
    title: 'Öğrenci Not Çizelgesi (Transkript)',
    zorunlu: true,
  },
  {
    // Adayın BAŞKA bir kurumda hâlen kayıtlı olduğunu kanıtlar. Kurum içi
    // geçişte istenmez: öğrenci zaten bizim kaydımızda, belgeyi kendi
    // kurumundan istemek anlamsız olurdu.
    id: 'ogrenci_belgesi',
    title: 'Öğrenci Belgesi',
    aciklama: 'Hâlen kayıtlı olduğunuz kurumdan alınan, güncel tarihli öğrenci belgesi',
    zorunlu: true,
    turler: ['kurumlararasi', 'merkezi'],
  },
  {
    id: 'yks_sonuc',
    title: 'YKS/YGS/LYS/DGS Sonuç Belgesi',
    aciklama: 'Yerleştirme puanları ve başarı sıralamaları dâhil',
    zorunlu: true,
  },
  {
    id: 'ozel_yetenek',
    title: 'Özel Yetenek Sınavı Başarı Belgesi',
    aciklama: 'Yalnızca özel yetenek sınavı ile öğrenci alan programlar için',
    zorunlu: false,
  },
];

// Bir geçiş türünde istenen ekler. Tür bilinmiyorsa (eski kayıt) tümü
// döner — mevcut kayıtların ekleri gizlenmesin diye.
function ygEkler(turId) {
  const t = String(turId || '');
  if (!t) return YG_EKLER;
  return YG_EKLER.filter((e) => !e.turler || e.turler.includes(t));
}
// Kural testten görülebilsin diye dışa veriliyor (bkz. tests/yatay-ekler.test.js).
if (typeof window !== 'undefined') {
  window.YG_EKLER = YG_EKLER;
  window.ygEkler = ygEkler;
}

// ── Akademisyenin seçtiği değerlendirme sonuçları ──
// Belgeye yazılan metin bu listeden üretilir: "UYGUN 2. Sınıf (1. ASİL)".
// NOT: "ASİL" (asil/yedek listesi) doğru sözcüktür; "ASIL" değil.
const YG_DEGERLENDIRME = [
  { id: '', label: '— Seçilmedi —' },
  { id: 'uygun_asil', label: 'UYGUN (ASİL)', sinifSorar: true, siraSorar: true },
  { id: 'uygun_yedek', label: 'UYGUN (YEDEK)', sinifSorar: true, siraSorar: true },
  { id: 'uygun_degil', label: 'UYGUN DEĞİL' },
  { id: 'sartlari_tasimiyor', label: 'BAŞVURU ŞARTLARINI TAŞIMIYOR' },
  { id: 'eksik_belge', label: 'EKSİK BELGE' },
  { id: 'basvuru_geri', label: 'BAŞVURUDAN VAZGEÇTİ' },
];

const YG_DURUMLAR = {
  beklemede: { label: 'Değerlendirilmedi', color: YG.accent, bg: YG.accentPale },
  degerlendirildi: { label: 'Değerlendirildi', color: YG.green, bg: YG.greenLight },
};

const ygCard = {
  background: 'white',
  border: '1px solid ' + YG.border,
  borderRadius: 12,
};
const ygBtn = (primary) => ({
  padding: '8px 15px',
  borderRadius: 8,
  border: '1px solid ' + (primary ? YG.navy : YG.border),
  background: primary ? YG.navy : 'white',
  color: primary ? 'white' : YG.navy,
  fontSize: 12.5,
  fontWeight: 600,
  cursor: 'pointer',
  fontFamily: 'inherit',
});
const ygPill = (color, bg) => ({
  padding: '2px 10px',
  borderRadius: 12,
  background: bg,
  color,
  fontSize: 11,
  fontWeight: 700,
  whiteSpace: 'nowrap',
});
const ygInput = {
  width: '100%',
  padding: '9px 11px',
  border: '1px solid ' + YG.border,
  borderRadius: 8,
  fontSize: 13,
  fontFamily: 'inherit',
  color: YG.text,
  outline: 'none',
};
const ygLabel = {
  display: 'block',
  fontSize: 11.5,
  fontWeight: 600,
  color: YG.textMuted,
  marginBottom: 4,
};

const ygFileHref = (u) => {
  const rel = String(u || '')
    .replace('/api/files/download/', '')
    .replace('/api/files/view/', '');
  return rel ? '/api/files/download/' + rel + '?download=true' : '#';
};

// Not ortalaması yalnızca 100'lük sistemde girilir — dönüşüm yapılmaz.
function ygYuzluk(not) {
  const n = parseFloat(String(not || '').replace(',', '.'));
  return isNaN(n) ? null : n;
}

// Kurumlararası yerleştirmeye esas puan: YKS×0.40 + AGNO(100)×0.60
function ygYerlesmePuani(yksPuani, notOrt) {
  const p = parseFloat(String(yksPuani || '').replace(',', '.'));
  const n = ygYuzluk(notOrt);
  if (isNaN(p) || n == null) return null;
  const p40 = Math.round(p * 0.4 * 100) / 100;
  const n60 = Math.round(n * 0.6 * 100) / 100;
  return { p40, n60, toplam: Math.round((p40 + n60) * 100) / 100 };
}

// Ekranda puan yazımı — Türkçe ondalık ayracı virgüldür ("412,338").
function ygPuanYaz(n) {
  if (n == null || !isFinite(n)) return '—';
  return String(n).replace('.', ',');
}

// İki puan yazımı aynı sayıyı mı gösteriyor? ("412,338" ile "412.338" aynıdır)
// "Sayfadan okunanı yaz" düğmesi, zaten yazılmış bir değeri tekrar önermesin.
function ygAyniPuan(a, b) {
  const oku = (v) => {
    const s = String(v == null ? '' : v)
      .trim()
      .replace(',', '.');
    const x = parseFloat(s);
    return isNaN(x) ? null : x;
  };
  const x = oku(a);
  const y = oku(b);
  return x != null && y != null && Math.abs(x - y) < 1e-9;
}

// Bölüm adının "çıplak" hâli — sondaki "Mühendisliği" / "Bölümü" eki atılır.
// {{basvurulanBolumKisa}} değişkenini besler. Kural lib/bolum-ad.js'te;
// muafiyet dilekçesi de aynı kuralı kullanıyor (bkz. cakuBolumKisa).
const ygBolumKisa = (ad) => window.bolumKisaAd(ad);

// Değerlendirme sonucunu belgeye yazılacak metne çevir.
//   uygun_asil  + sınıf 2 + sıra 1  →  "UYGUN 2. Sınıf (1. ASİL)"
//   uygun_yedek + sınıf 3 + sıra 4  →  "UYGUN 3. Sınıf (4. YEDEK)"
//   diğerleri                       →  listedeki etiket ("UYGUN DEĞİL" vb.)
//
// Sınıf alanı "2", "2." ya da "2. Sınıf" olarak girilmiş olabilir; hangisi
// yazılırsa yazılsın çıktı tek biçime indirgenir.
function ygSinifMetni(ham) {
  const s = String(ham || '').trim();
  if (!s) return '';
  const n = s.match(/\d+/);
  return n ? n[0] + '. Sınıf' : s;
}

// Kayıtta saklı sonuç yerine GEÇERLİ sonuç okunur: taban puan şartını
// karşılamayan aday, kayıtta eski bir sıralamadan "3. YEDEK" kalmış olsa bile
// uygun değildir (bkz. lib/yatay-kriter.js → gecerliDegerlendirme).
function ygEtkinSonuc(rec, esik) {
  if (window.gecerliDegerlendirme) return window.gecerliDegerlendirme(rec, esik);
  return {
    degerlendirme: rec?.degerlendirme || '',
    degerlendirmeSinif: rec?.degerlendirmeSinif || '',
    degerlendirmeSira: rec?.degerlendirmeSira || '',
    sebep: '',
    cakisma: false,
  };
}

function ygDegerlendirmeMetni(rec, esik) {
  const e = ygEtkinSonuc(rec, esik);
  const d = YG_DEGERLENDIRME.find((x) => x.id === e.degerlendirme);
  if (!d || !d.id) return '';
  // Sınıf/sıra soran sonuçlarda gövde "UYGUN"dur; asil/yedek ayrımı zaten
  // parantez içinde yazılıyor. Etiketi ("UYGUN (ASİL)") olduğu gibi bırakmak,
  // sınıf boş kaldığında "UYGUN (ASİL) (1. ASİL)" gibi tekrara yol açıyordu.
  let m = d.sinifSorar || d.siraSorar ? 'UYGUN' : d.label;
  const sinif = d.sinifSorar ? ygSinifMetni(e.degerlendirmeSinif) : '';
  if (sinif) m += ' ' + sinif;
  if (d.siraSorar && e.degerlendirmeSira) {
    m += ' (' + e.degerlendirmeSira + (d.id === 'uygun_yedek' ? '. YEDEK)' : '. ASİL)');
  }
  return m;
}

async function ygDosyaYukle(file) {
  if (!file) return '';
  try {
    if (window.uploadGeneratedDoc) {
      return (await window.uploadGeneratedDoc(file, file.name, 'yatay_gecis')) || '';
    }
  } catch (e) {
    console.warn('yatay geçiş dosya yükleme hatası:', e && e.message);
  }
  return '';
}

// ══════════════════════════════════════════════════════════════
// Öğrenci — Başvuru Formu
// Sistemde karşılığı olan alanlar DOLU ve salt-okunur gelir; kalanlar
// öğrenciden istenir. Hangi alanların istendiği geçiş türüne göre değişir.
// ══════════════════════════════════════════════════════════════
// `vekaleten`: akademisyen, HENÜZ ÖĞRENCİ NUMARASI OLMAYAN bir aday adına
// dolduruyor. Yatay/dikey geçişle gelen aday kesin kayıt yapılana kadar
// numarasız oluyor ama değerlendirme (ders eşleştirme, taban puan kıyası,
// belge üretimi) daha önce başlıyor. Bu modda ad-soyad ve numara sistemden
// değil formdan gelir; numara boş bırakılırsa geçici aday no üretilir.
function YgBasvuruFormu({ tur, currentUser, departmentInfo, onSaved, vekaleten, mevcutKayitlar }) {
  // Sistemden gelenler — vekâleten doldurulurken personelin kendi kimliği
  // adayın yerine geçmemeli, o yüzden boş başlar.
  const sysAdSoyad = vekaleten ? '' : currentUser?.name || '';
  const sysOgrNo = vekaleten ? '' : currentUser?.studentNumber || currentUser?.identifier || '';
  const sysFakulte = window.TENANT?.facultyName || 'Mühendislik Fakültesi';
  const sysBolum = departmentInfo?.name || currentUser?.departmentName || '';

  // Kurum içi geçişte öğrencinin AKTİF programı sistemden bilinir.
  const icGecis = tur.id === 'kurumici';

  const [form, setForm] = useState({
    // Aktif program — kurum içinde sistemden dolu gelir
    aktifUniversite: icGecis ? window.TENANT?.universityName || '' : '',
    aktifFakulte: icGecis ? sysFakulte : '',
    aktifBolum: icGecis ? sysBolum : '',
    aktifSinif: '',
    // Başvurulan program — öğrenci seçer
    basvurduguFakulteId: '',
    basvurduguFakulte: '',
    basvurduguBolum: '',
    basvurduguSinif: '',
    // Yerleştirme
    yksYerlesmeYili: '',
    yksPuanTuru: '',
    yksPuani: '',
    notOrtalamasi: '',
    // İletişim
    telefon: '',
    eposta: '',
    // Vekâleten: adayın kimliği (sistemde kaydı yok)
    adayAdSoyad: '',
    adayOgrNo: '',
  });
  const [ekler, setEkler] = useState({});
  const [yukleniyor, setYukleniyor] = useState('');
  const [kaydediliyor, setKaydediliyor] = useState(false);
  const [mesaj, setMesaj] = useState({ text: '', kind: '' });

  // Başvurulacak program için fakülte + bölüm listeleri
  const [bolumler, setBolumler] = useState([]);
  const [fakulteler, setFakulteler] = useState([]);
  useEffect(() => {
    let alive = true;
    Promise.all([
      window.apiRead('departments').catch(() => []),
      window.apiRead('faculties').catch(() => []),
    ]).then(([d, f]) => {
      if (!alive) return;
      setBolumler(d || []);
      // Aynı adlı mükerrer fakülte kayıtlarını tekille
      const gorulen = new Set();
      const temiz = [];
      (f || []).forEach((x) => {
        const anahtar = String(x.name || '')
          .toLocaleLowerCase('tr-TR')
          .replace(/\s+/g, '');
        if (!anahtar || gorulen.has(anahtar)) return;
        gorulen.add(anahtar);
        temiz.push(x);
      });
      setFakulteler(temiz.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'tr')));
    });
    return () => {
      alive = false;
    };
  }, []);

  // Seçili fakültenin bölümleri
  const hedefBolumler = useMemo(() => {
    const fid = form.basvurduguFakulteId;
    if (!fid) return [];
    return bolumler
      .filter((b) => String(b.facultyId || '') === String(fid))
      .sort((a, b) => (a.name || '').localeCompare(b.name || '', 'tr'));
  }, [bolumler, form.basvurduguFakulteId]);

  // ── Belgeden alan doldurma ──
  // Yalnız öğrencinin ELLE girdiği alanlar istenir. Kurum içi geçişte
  // üniversite/fakülte/bölüm sistemden gelir; onları modele sordurmak
  // hem gereksiz maliyet hem de yanlış doldurma riskidir.
  const aiAlanlari = useMemo(() => {
    const liste = [];
    if (!icGecis) {
      liste.push(
        { id: 'aktifUniversite', label: 'Aktif üniversite', hint: 'Belgeyi düzenleyen üniversite' },
        { id: 'aktifFakulte', label: 'Aktif fakülte / yüksekokul' },
        { id: 'aktifBolum', label: 'Aktif bölüm / program' }
      );
    }
    liste.push({ id: 'aktifSinif', label: 'Sınıf', hint: 'Örn. 2' });
    if (tur.notIster) {
      liste.push({
        id: 'notOrtalamasi',
        label: 'Not ortalaması (AGNO)',
        hint: 'Transkriptteki genel not ortalaması; 100’lük değeri tercih et',
      });
    }
    if (tur.puanIster) {
      liste.push(
        {
          id: 'yksYerlesmeYili',
          label: 'YKS yerleşme yılı',
          hint: 'Adayın bir yükseköğretim programına YERLEŞTİĞİ yıl. Örn. 2023',
        },
        {
          id: 'yksPuanTuru',
          label: 'Yerleştiği puan türü',
          // Liste tam verilmezse YÖS ve DGS ile gelen adaylar SAY/EA/SÖZ'e
          // sıkıştırılıyor ya da boş bırakılıyordu.
          hint:
            'Yerleştiği sınavın puan türü. Şunlardan BİRİ olmalı: ' +
            'SAY, EA, SÖZ, DİL, TYT, DGS SAY, DGS EA, DGS SÖZ, YÖS, ÖZEL YETENEK. ' +
            'Belgede "DGS" tek başına geçiyorsa DGS SAY yaz; "YÖS"/"Yurt Dışından Öğrenci" ' +
            'geçiyorsa YÖS yaz.',
        },
        {
          id: 'yksPuani',
          label: 'YKS yerleştirme puanı',
          // Sonuç belgesinde birden çok puan var (ham/yerleştirme/OBP...).
          // Hangisinin alınacağı söylenmezse yanlış sütun okunuyordu.
          hint:
            'Sonuç belgesindeki "YERLEŞTİRME PUANLARI VE BAŞARI SIRALARI" bölümünden, ' +
            'adayın YERLEŞTİĞİ puan türüne ait YERLEŞTİRME PUANI. Ham puanı, OBP’yi ya da ' +
            'başarı sırasını ALMA. Birden çok tür varsa yalnız yerleştiği türün satırını al.',
        }
      );
    }
    return liste;
  }, [icGecis, tur.notIster, tur.puanIster]);

  // AGNO denetimi — 100'lük sistem şartı (bkz. lib/yatay-kriter.js).
  const gnoKontrol = useMemo(
    () => (window.gnoDogrula ? window.gnoDogrula(form.notOrtalamasi) : { uyari: '', hata: '' }),
    [form.notOrtalamasi]
  );

  const aiDosyalari = useMemo(() => {
    const cikar = window.aiDosyaAdi;
    if (!cikar) return [];
    return ygEkler(tur.id)
      .map((ek) => {
        const y = ekler[ek.id];
        const fileName = y && y.url ? cikar(y.url) : '';
        return fileName ? { fileName, name: ek.title } : null;
      })
      .filter(Boolean);
  }, [ekler, tur.id]);

  // Benim Sayfam iletişim bilgileri — varsa forma önden doldur
  useEffect(() => {
    if (!sysOgrNo) return;
    let alive = true;
    window
      .apiReadDoc('student_profiles', String(sysOgrNo))
      .then((r) => {
        if (!alive || !r || !r.exists) return;
        const p = r.data || {};
        setForm((f) => ({
          ...f,
          telefon: f.telefon || p.phone || '',
          eposta: f.eposta || p.email || '',
        }));
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [sysOgrNo]);

  // Yatay geçiş raporlarında metin alanları BÜYÜK HARF yazılır.
  const buyuk = (v) => String(v == null ? '' : v).toLocaleUpperCase('tr-TR');
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const setBuyuk = (k, v) => setForm((f) => ({ ...f, [k]: buyuk(v) }));

  const hesap = tur.hesapla ? ygYerlesmePuani(form.yksPuani, form.notOrtalamasi) : null;

  const ekYukle = async (ekId, file) => {
    setYukleniyor(ekId);
    try {
      const url = await ygDosyaYukle(file);
      if (!url) {
        setMesaj({ text: 'Dosya yüklenemedi, tekrar deneyin.', kind: 'error' });
        return;
      }
      setEkler((e) => ({ ...e, [ekId]: { url, ad: file.name } }));
      setMesaj({ text: '', kind: '' });
    } finally {
      setYukleniyor('');
    }
  };

  const eksikler = () => {
    const eksik = [];
    // Vekâleten kayıtta adayın adı ZORUNLU; numara zorunlu DEĞİL — bu akış
    // zaten "numarası henüz yok" diye var. Numara boşsa geçici üretilir.
    if (vekaleten && !form.adayAdSoyad.trim()) eksik.push('Aday adı soyadı');
    if (!form.aktifUniversite.trim()) eksik.push('Aktif üniversite');
    if (!form.basvurduguFakulte.trim()) eksik.push('Başvurulan fakülte');
    if (!form.basvurduguBolum.trim()) eksik.push('Başvurulan bölüm');
    if (!form.aktifBolum.trim()) eksik.push('Aktif bölüm');
    if (!form.basvurduguSinif.trim()) eksik.push('Başvurduğu sınıf');
    if (tur.notIster) {
      if (!form.notOrtalamasi.trim()) eksik.push('Not ortalaması');
      else if (gnoKontrol.hata) eksik.push('Not ortalaması (100’lük, 0-100)');
    }
    if (tur.puanIster) {
      if (!form.yksPuani.trim()) eksik.push('YKS puanı');
      if (!form.yksYerlesmeYili.trim()) eksik.push('YKS yerleşme yılı');
      if (!form.yksPuanTuru.trim()) eksik.push('Puan türü');
    }
    ygEkler(tur.id)
      .filter((e) => e.zorunlu)
      .forEach((e) => {
        if (!ekler[e.id]) eksik.push(e.title);
      });
    return eksik;
  };

  const gonder = async () => {
    const eksik = eksikler();
    if (eksik.length > 0) {
      setMesaj({ text: 'Eksik alanlar:\n• ' + eksik.join('\n• '), kind: 'error' });
      return;
    }
    setKaydediliyor(true);
    try {
      // Vekâleten: numara girilmişse o, girilmemişse çakışmayan geçici aday
      // numarası. Geçici numara harf önekli olduğu için hiçbir öğrencinin
      // numarasına eşit olamaz — kayıt yanlış kişiye görünmez.
      const kimlikNo = vekaleten
        ? form.adayOgrNo.trim() || window.adayNoUret(mevcutKayitlar || [])
        : String(sysOgrNo);
      const kayit = {
        turu: tur.id,
        ogrenciNo: kimlikNo,
        adSoyad: vekaleten ? form.adayAdSoyad.trim() : sysAdSoyad,
        // Kaydı kimin, kimin adına açtığı kaybolmamalı: belge üretimi ve
        // denetim bu bilgiyi ister.
        vekaleten: !!vekaleten,
        girenPersonel: vekaleten ? String(currentUser?.name || currentUser?.identifier || '') : '',
        departmentId: currentUser?.departmentId || '',
        // Aktif
        aktifUniversite: form.aktifUniversite.trim(),
        aktifFakulte: form.aktifFakulte.trim(),
        aktifBolum: form.aktifBolum.trim(),
        aktifSinif: form.aktifSinif.trim(),
        // Başvurulan
        basvurduguFakulte: form.basvurduguFakulte.trim(),
        basvurduguBolum: form.basvurduguBolum.trim(),
        basvurduguSinif: form.basvurduguSinif.trim(),
        // Yerleştirme
        yksYerlesmeYili: form.yksYerlesmeYili.trim(),
        yksPuanTuru: form.yksPuanTuru.trim(),
        yksPuani: form.yksPuani.trim(),
        notOrtalamasi: form.notOrtalamasi.trim(),
        // İletişim
        telefon: form.telefon.trim(),
        eposta: form.eposta.trim(),
        // Ekler
        ekler,
        // Durum
        degerlendirme: '',
        degerlendirmeSinif: '',
        degerlendirmeSira: '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await window.DBWrite.add('yatay_gecis_basvurular', kayit);
      setMesaj({
        text: vekaleten ? 'Aday başvurusu kaydedildi (' + kimlikNo + ').' : 'Başvurunuz alındı.',
        kind: 'ok',
      });
      if (onSaved) onSaved();
    } catch (e) {
      setMesaj({ text: 'Gönderilemedi: ' + e.message, kind: 'error' });
    } finally {
      setKaydediliyor(false);
    }
  };

  const sistemAlani = (etiket, deger) => (
    <div>
      <label style={ygLabel}>{etiket}</label>
      <input value={deger || '—'} disabled style={{ ...ygInput, background: '#F3F4F6' }} />
    </div>
  );

  return (
    <div>
      {/* Vekâleten: adayın kimliği. Sistemde kaydı olmadığı için elle girilir. */}
      {vekaleten && (
        <div style={{ ...ygCard, padding: 16, marginBottom: 14 }}>
          <div style={{ fontSize: 12.5, fontWeight: 700, color: YG.navy, marginBottom: 4 }}>
            Adayın kimliği
          </div>
          <div style={{ fontSize: 12, color: YG.textMuted, marginBottom: 10, lineHeight: 1.55 }}>
            Bu başvuruyu <b>aday adına siz</b> dolduruyorsunuz. Öğrenci numarası henüz verilmediyse
            boş bırakın — sistem geçici bir aday numarası üretir. Numara belli olunca kayıt
            kartından tanımlayabilirsiniz; o an başvuru öğrencinin kendi ekranında görünür hâle
            gelir.
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: 12,
            }}
          >
            <div>
              <label style={ygLabel}>Adı Soyadı *</label>
              <input
                value={form.adayAdSoyad}
                onChange={(e) => setBuyuk('adayAdSoyad', e.target.value)}
                placeholder="Adayın adı soyadı"
                style={ygInput}
              />
            </div>
            <div>
              <label style={ygLabel}>Öğrenci Numarası (varsa)</label>
              <input
                value={form.adayOgrNo}
                onChange={(e) => set('adayOgrNo', e.target.value.replace(/\D/g, ''))}
                placeholder="Henüz yoksa boş bırakın"
                style={ygInput}
              />
            </div>
          </div>
        </div>
      )}

      {/* Öğrenciden istenenler */}
      <div style={{ ...ygCard, padding: 16, marginBottom: 14 }}>
        <div style={{ fontSize: 12.5, fontWeight: 700, color: YG.navy, marginBottom: 4 }}>
          {vekaleten ? 'Adayın aktif öğrenim gördüğü program' : 'Aktif öğrenim gördüğünüz program'}
        </div>
        <div style={{ fontSize: 12, color: YG.textMuted, marginBottom: 10 }}>{tur.aciklama}</div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: 12,
          }}
        >
          <div>
            <label style={ygLabel}>Üniversite{icGecis ? '' : ' *'}</label>
            <input
              value={form.aktifUniversite}
              onChange={(e) => setBuyuk('aktifUniversite', e.target.value)}
              disabled={icGecis}
              style={{ ...ygInput, background: icGecis ? '#F3F4F6' : 'white' }}
            />
          </div>
          <div>
            <label style={ygLabel}>Fakülte / Yüksekokul</label>
            <input
              value={form.aktifFakulte}
              onChange={(e) => setBuyuk('aktifFakulte', e.target.value)}
              disabled={icGecis}
              style={{ ...ygInput, background: icGecis ? '#F3F4F6' : 'white' }}
            />
          </div>
          <div>
            <label style={ygLabel}>Bölüm / Program{icGecis ? '' : ' *'}</label>
            <input
              value={form.aktifBolum}
              onChange={(e) => setBuyuk('aktifBolum', e.target.value)}
              disabled={icGecis}
              style={{ ...ygInput, background: icGecis ? '#F3F4F6' : 'white' }}
            />
          </div>
          <div>
            <label style={ygLabel}>Sınıfınız</label>
            <input
              value={form.aktifSinif}
              onChange={(e) => set('aktifSinif', e.target.value)}
              placeholder="ör. 2"
              style={ygInput}
            />
          </div>
        </div>
      </div>

      {/* Başvurmak istediğiniz program */}
      <div style={{ ...ygCard, padding: 16, marginBottom: 14 }}>
        <div style={{ fontSize: 12.5, fontWeight: 700, color: YG.navy, marginBottom: 10 }}>
          Başvurmak istediğiniz program
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: 12,
          }}
        >
          <div>
            <label style={ygLabel}>Fakülte *</label>
            <select
              value={form.basvurduguFakulteId}
              onChange={(e) => {
                const fid = e.target.value;
                const fak = fakulteler.find((f) => String(f.id || f._docId) === fid);
                setForm((f) => ({
                  ...f,
                  basvurduguFakulteId: fid,
                  basvurduguFakulte: buyuk(fak?.name || ''),
                  // Fakülte değişince bölüm seçimi sıfırlanır
                  basvurduguBolum: '',
                }));
              }}
              style={{ ...ygInput, cursor: 'pointer' }}
            >
              <option value="">— Fakülte seçin —</option>
              {fakulteler.map((f) => (
                <option key={f.id || f._docId} value={f.id || f._docId}>
                  {f.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label style={ygLabel}>Bölüm / Program *</label>
            <select
              value={form.basvurduguBolum}
              onChange={(e) => setBuyuk('basvurduguBolum', e.target.value)}
              disabled={!form.basvurduguFakulteId}
              style={{
                ...ygInput,
                cursor: form.basvurduguFakulteId ? 'pointer' : 'not-allowed',
                background: form.basvurduguFakulteId ? 'white' : '#F3F4F6',
              }}
            >
              <option value="">
                {form.basvurduguFakulteId ? '— Bölüm seçin —' : 'Önce fakülte seçin'}
              </option>
              {/* Değer büyük harfe çevrilerek saklandığından option değeri de
                  büyük harf olmalı — aksi halde seçim state'e yazılır ama
                  <select> hiçbir option'la eşleşmediği için boş görünür. */}
              {hedefBolumler.map((b) => (
                <option key={b.id || b._docId} value={buyuk(b.name)}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label style={ygLabel}>Başvurduğunuz sınıf *</label>
            <input
              value={form.basvurduguSinif}
              onChange={(e) => set('basvurduguSinif', e.target.value)}
              placeholder="ör. 2"
              style={ygInput}
            />
          </div>
        </div>
      </div>

      {/* Yerleştirme / başarı bilgileri */}
      {(tur.puanIster || tur.notIster) && (
        <div style={{ ...ygCard, padding: 16, marginBottom: 14 }}>
          <div style={{ fontSize: 12.5, fontWeight: 700, color: YG.navy, marginBottom: 10 }}>
            Yerleştirme ve başarı bilgileri
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: 12,
            }}
          >
            {tur.puanIster && (
              <>
                <div>
                  <label style={ygLabel}>YKS yerleşme yılı *</label>
                  <input
                    value={form.yksYerlesmeYili}
                    onChange={(e) => set('yksYerlesmeYili', e.target.value)}
                    placeholder="ör. 2024"
                    style={ygInput}
                  />
                </div>
                <div>
                  <label style={ygLabel}>Yerleştiği puan türü *</label>
                  {/* Serbest metindi ve YÖS / DGS gibi türler ya yanlış
                      yazılıyor ya da hiç girilmiyordu. Liste kapalı olunca
                      belge okuma tarafı da aynı kanonik değerleri görüyor. */}
                  <select
                    value={form.yksPuanTuru}
                    onChange={(e) => set('yksPuanTuru', e.target.value)}
                    style={ygInput}
                  >
                    <option value="">— Seçiniz —</option>
                    {(window.YKS_PUAN_TURLERI || []).map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={ygLabel}>YKS puanı *</label>
                  <input
                    value={form.yksPuani}
                    onChange={(e) => set('yksPuani', e.target.value)}
                    placeholder="ör. 385,412"
                    style={ygInput}
                  />
                </div>
              </>
            )}
            {tur.notIster && (
              <div>
                <label style={ygLabel}>Not ortalaması (AGNO) — 100&apos;lük *</label>
                <input
                  value={form.notOrtalamasi}
                  onChange={(e) => set('notOrtalamasi', e.target.value.replace(/[^\d.,]/g, ''))}
                  placeholder="ör. 76,50"
                  style={ygInput}
                />
                <div style={{ fontSize: 11, color: YG.textMuted, marginTop: 3 }}>
                  Yalnızca 100&apos;lük sistemde girilir (0-100).
                </div>
                {/* 4'lük AGNO sessizce geçerse sıralama puanı
                    (YKS×0,40 + AGNO×0,60) saçmalar ve aday listenin dibine
                    düşer — hata değil, uyarı: 4,00 teoride geçerli bir
                    100'lük değer. */}
                {gnoKontrol.uyari && (
                  <div
                    style={{
                      fontSize: 11.5,
                      color: '#7c4a03',
                      background: YG.accentPale,
                      border: '1px solid ' + YG.accent + '55',
                      borderRadius: 8,
                      padding: '7px 10px',
                      marginTop: 6,
                      lineHeight: 1.5,
                    }}
                  >
                    {gnoKontrol.uyari}
                  </div>
                )}
                {gnoKontrol.hata && form.notOrtalamasi.trim() && (
                  <div style={{ fontSize: 11.5, color: YG.red, marginTop: 6, fontWeight: 600 }}>
                    {gnoKontrol.hata}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Kurumlararası: yerleştirmeye esas puan canlı hesaplanır */}
          {tur.hesapla && hesap && (
            <div
              style={{
                marginTop: 12,
                padding: '10px 12px',
                background: YG.accentPale,
                border: '1px solid ' + YG.accent + '44',
                borderRadius: 8,
                fontSize: 12.5,
                color: '#7c4a03',
                lineHeight: 1.6,
              }}
            >
              Yerleştirmeye esas puanınız otomatik hesaplanır:{' '}
              <b>
                {hesap.p40} (YKS %40) + {hesap.n60} (AGNO %60) = {hesap.toplam}
              </b>
              <br />
              Nihai değeri komisyon doğrular.
            </div>
          )}
        </div>
      )}

      {/* Zorunlu ekler */}
      <div style={{ ...ygCard, padding: 16, marginBottom: 14 }}>
        <div style={{ fontSize: 12.5, fontWeight: 700, color: YG.navy, marginBottom: 10 }}>
          Başvuru ekleri
        </div>
        <div style={{ fontSize: 11.5, color: YG.textMuted, marginBottom: 10 }}>
          Tüm ekler <b>PDF</b> olarak yüklenir.
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {ygEkler(tur.id).map((ek) => {
            const yuklu = ekler[ek.id];
            return (
              <div
                key={ek.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  flexWrap: 'wrap',
                  padding: '10px 12px',
                  border: '1px ' + (yuklu ? 'solid ' + YG.green : 'dashed ' + YG.border),
                  borderRadius: 10,
                  background: yuklu ? YG.greenLight + '55' : 'white',
                }}
              >
                <div style={{ flex: '1 1 240px', minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: YG.text }}>
                    {ek.title}
                    {ek.zorunlu ? ' *' : ''}
                  </div>
                  {ek.aciklama && (
                    <div style={{ fontSize: 11.5, color: YG.textMuted, marginTop: 2 }}>
                      {ek.aciklama}
                    </div>
                  )}
                  {yuklu && (
                    <div style={{ fontSize: 11.5, color: YG.green, marginTop: 3, fontWeight: 600 }}>
                      {yuklu.ad}
                    </div>
                  )}
                </div>
                <label style={{ ...ygBtn(false), cursor: 'pointer' }}>
                  <input
                    type="file"
                    accept=".pdf,application/pdf"
                    style={{ display: 'none' }}
                    onChange={(e) => {
                      const f = (e.target.files && e.target.files[0]) || null;
                      e.target.value = '';
                      if (!f) return;
                      // Yalnız PDF: akademisyen belgeleri yan panelde
                      // görüntüleyebilsin diye tek biçim kabul edilir.
                      if (f.type !== 'application/pdf' && !/\.pdf$/i.test(f.name)) {
                        setMesaj({
                          text: 'Yalnızca PDF dosyası yükleyebilirsiniz.',
                          kind: 'error',
                        });
                        return;
                      }
                      ekYukle(ek.id, f);
                    }}
                  />
                  {yukleniyor === ek.id ? 'Yükleniyor…' : yuklu ? 'Değiştir' : 'Dosya Seç'}
                </label>
              </div>
            );
          })}
        </div>

        {/* Yüklenen belgelerden alan doldurma — sonuç önce incelenir,
            kullanıcı işaretlediklerini forma aktarır. Otomatik yazma yok. */}
        {window.AIDoldurButonu && (
          <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px dashed ' + YG.border }}>
            {React.createElement(window.AIDoldurButonu, {
              module: 'yataygecis',
              docType: tur.id,
              alanlar: aiAlanlari,
              dosyalar: aiDosyalari,
              onUygula: (degerler) => {
                setForm((f) => {
                  const y = { ...f };
                  Object.keys(degerler).forEach((k) => {
                    // Kurum içi geçişte sistemden gelen alanlar kilitlidir;
                    // model çıktısı onları ezmemeli.
                    if (icGecis && ['aktifUniversite', 'aktifFakulte', 'aktifBolum'].includes(k)) {
                      return;
                    }
                    y[k] = ['aktifUniversite', 'aktifFakulte', 'aktifBolum'].includes(k)
                      ? buyuk(degerler[k])
                      : degerler[k];
                  });
                  return y;
                });
                setMesaj({ text: 'Seçilen bilgiler forma aktarıldı — kontrol edin.', kind: 'ok' });
              },
            })}
          </div>
        )}
      </div>

      {mesaj.text && (
        <div
          style={{
            padding: '10px 14px',
            borderRadius: 10,
            marginBottom: 12,
            whiteSpace: 'pre-wrap',
            fontSize: 13,
            background: mesaj.kind === 'ok' ? YG.greenLight : YG.redLight,
            color: mesaj.kind === 'ok' ? '#065F46' : '#991B1B',
            border: '1px solid ' + (mesaj.kind === 'ok' ? YG.green : YG.red) + '44',
          }}
        >
          {mesaj.text}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button onClick={gonder} disabled={kaydediliyor} style={ygBtn(true)}>
          {kaydediliyor ? 'Gönderiliyor…' : 'Başvuruyu Gönder'}
        </button>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// Başvuru satırı — öğrencide bilgi kartı, akademisyende değerlendirme
// ══════════════════════════════════════════════════════════════
function YgBasvuruKarti({
  rec,
  tur,
  isStaff,
  onDegerlendir,
  onNumaraTanimla,
  onDuzenle,
  onEkYukle,
  osymEsik,
  busy,
  currentUser,
  onSilindi,
  tabanKayitlari,
}) {
  const [acik, setAcik] = useState(false);
  // Akademisyende yan panelde açılan ek (PDF)
  const [acikEk, setAcikEk] = useState('');
  // Taban puan şartı — kurum eşiği VE programın kendi taban puanı.
  const elemeSebebi = window.elemeNedeni ? window.elemeNedeni(rec, osymEsik) : '';
  const esikDurumu = window.osymEsikDurumu ? window.osymEsikDurumu(rec.yksPuani, osymEsik) : null;
  // Vekâleten açılmış kayda sonradan tanımlanacak gerçek öğrenci numarası.
  const [yeniNo, setYeniNo] = useState('');
  // Gönderilmiş başvurunun beyan alanlarını düzenleme kipi.
  const [duzenle, setDuzenle] = useState(false);
  const [duzForm, setDuzForm] = useState({});
  // Akademisyenin eksik eki yerine yüklemesi.
  const [ekYukleniyor, setEkYukleniyor] = useState('');
  const deg = YG_DEGERLENDIRME.find((d) => d.id === rec.degerlendirme);
  // Rozette ve belgede geçerli sonuç görünür; "Sonuç" kutusu ise personelin
  // kendi seçimini gösterir (düzenlenebilir kalması gerekiyor).
  const etkin = ygEtkinSonuc(rec, osymEsik);
  const st = etkin.degerlendirme ? YG_DURUMLAR.degerlendirildi : YG_DURUMLAR.beklemede;
  const hesap = tur?.hesapla ? ygYerlesmePuani(rec.yksPuani, rec.notOrtalamasi) : null;

  // ── Taban puan: sayfadan okunan öneri + karşılaştırma ──
  // `tabanOneri` yalnız ÖNERİDİR — kayda giren değer akademisyenin alandaki
  // girdisidir (`basvurduguBolumOsysPuani`), karşılaştırma da onun üzerinden
  // yapılır. Böylece elle düzeltilen bir taban puan, ekrandaki kararı da
  // hemen düzeltir.
  const tabanOneri = useMemo(() => {
    if (tur?.id !== 'merkezi' || !window.tabanKaydiBul) return null;
    const k = window.tabanKaydiBul(tabanKayitlari || [], rec.basvurduguBolum || '');
    return k && k.taban ? k : null;
  }, [tabanKayitlari, rec.basvurduguBolum, tur]);

  const tabanKiyas = useMemo(() => {
    if (tur?.id !== 'merkezi' || !window.tabanKarsilastir) return null;
    return window.tabanKarsilastir(rec.yksPuani, rec.basvurduguBolumOsysPuani);
  }, [rec.yksPuani, rec.basvurduguBolumOsysPuani, tur]);

  // ── Belge kıyaslaması için alan/değer/dosya üçlüsü ──
  // Öğrencinin BEYAN ETTİĞİ, yani belgeden doğrulanabilir alanlar. Sistemin
  // kendi ürettiği alanlar (hesaplanan puanlar, tarih damgaları) kıyaslanmaz.
  const kiyasAlanlari = useMemo(
    () =>
      [
        { id: 'adSoyad', label: 'Adı Soyadı' },
        { id: 'aktifUniversite', label: 'Aktif üniversite' },
        { id: 'aktifFakulte', label: 'Aktif fakülte' },
        { id: 'aktifBolum', label: 'Aktif bölüm' },
        { id: 'aktifSinif', label: 'Sınıfı' },
        { id: 'notOrtalamasi', label: 'Not ortalaması (AGNO)' },
        { id: 'yksYerlesmeYili', label: 'YKS yerleşme yılı' },
        { id: 'yksPuanTuru', label: 'Yerleştiği puan türü' },
        { id: 'yksPuani', label: 'YKS puanı' },
      ].filter((a) => {
        if (['yksYerlesmeYili', 'yksPuanTuru', 'yksPuani'].includes(a.id)) return !!tur?.puanIster;
        if (a.id === 'notOrtalamasi') return !!tur?.notIster;
        return true;
      }),
    [tur]
  );

  const kiyasDegerleri = useMemo(() => {
    const o = {};
    kiyasAlanlari.forEach((a) => {
      o[a.id] = rec[a.id] == null ? '' : String(rec[a.id]);
    });
    return o;
  }, [kiyasAlanlari, rec]);

  const kiyasDosyalari = useMemo(() => {
    const cikar = window.aiDosyaAdi;
    if (!cikar) return [];
    return ygEkler(rec.turu)
      .map((ek) => {
        const f = (rec.ekler || {})[ek.id];
        const fileName = f && f.url ? cikar(f.url) : '';
        return fileName ? { fileName, name: ek.title } : null;
      })
      .filter(Boolean);
  }, [rec]);

  // Etiket üstte, değer altta — sütunlar eşit genişlikte, satırlar hizalı.
  // `alanId` verilirse ve değer adayın beyanından farklıysa "düzeltildi"
  // rozeti çıkar: personelin düzeltmesi, adayın beyanı gibi görünmemeli.
  const satir = (k, v, alanId) =>
    v ? (
      <div key={k} style={{ minWidth: 0 }}>
        <div
          style={{
            fontSize: 10.5,
            fontWeight: 600,
            color: YG.textMuted,
            textTransform: 'uppercase',
            letterSpacing: 0.3,
            marginBottom: 2,
          }}
        >
          {k}
          {alanId && window.beyandanFarkliMi && window.beyandanFarkliMi(rec, alanId) && (
            <span
              title={'Adayın beyanı: ' + ((rec.ilkBeyan || {})[alanId] || '—')}
              style={{
                marginLeft: 6,
                padding: '1px 7px',
                borderRadius: 20,
                background: YG.accentPale,
                color: YG.accent,
                fontSize: 9.5,
                fontWeight: 800,
                textTransform: 'none',
                letterSpacing: 0,
              }}
            >
              düzeltildi
            </span>
          )}
        </div>
        <div
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: YG.text,
            wordBreak: 'break-word',
          }}
        >
          {v}
        </div>
      </div>
    ) : null;

  return (
    <div style={{ ...ygCard, padding: 0, overflow: 'hidden' }}>
      <div
        onClick={() => setAcik(!acik)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '14px 18px',
          cursor: 'pointer',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: YG.navy }}>
            {rec.adSoyad || '—'}
            {rec.ogrenciNo ? '  ·  ' + rec.ogrenciNo : ''}
            {/* Geçici numaralı kayıt açıkça işaretlenir: bu başvurunun sahibi
                henüz sisteme giremiyor, öğrenci ekranında görünmüyor. */}
            {window.adayNoMu && window.adayNoMu(rec.ogrenciNo) && (
              <span style={{ ...ygPill(YG.accent, YG.accentPale), marginLeft: 8 }}>
                numarası bekleniyor
              </span>
            )}
          </div>
          <div style={{ fontSize: 11.5, color: YG.textMuted, marginTop: 3 }}>
            {[rec.aktifUniversite, rec.aktifBolum].filter(Boolean).join(' / ')}
            {rec.basvurduguSinif ? '  →  ' + rec.basvurduguSinif + '. sınıf' : ''}
          </div>
        </div>
        {/* Taban ÖSYM puanının altında kalan aday, sıralamaya girmeden
            elenir; bunu kartta görmek değerlendirmenin gerekçesidir. */}
        {isStaff && elemeSebebi && (
          <span
            style={ygPill(YG.red, YG.redLight)}
            title={
              elemeSebebi === 'program_taban'
                ? 'Programın taban puanı: ' +
                  (rec.basvurduguBolumOsysPuani || '—') +
                  ' · adayın puanı: ' +
                  (rec.yksPuani || '—')
                : 'Taban ÖSYM puanı: ' +
                  (osymEsik || '—') +
                  ' · adayın puanı: ' +
                  (rec.yksPuani || '—')
            }
          >
            {(window.ELEME_ETIKET || {})[elemeSebebi] || 'Taban puan şartını karşılamıyor'}
          </span>
        )}
        {isStaff && !elemeSebebi && esikDurumu && esikDurumu.durum === 'belirsiz' && (
          <span style={ygPill(YG.accent, YG.accentPale)} title="ÖSYM puanı okunamadı">
            ÖSYM puanı yok
          </span>
        )}
        {hesap && <span style={ygPill(YG.navy, YG.bg)}>Yerleşme puanı: {hesap.toplam}</span>}
        <span style={ygPill(st.color, st.bg)}>
          {etkin.degerlendirme ? ygDegerlendirmeMetni(rec, osymEsik) || st.label : st.label}
        </span>
        <span style={{ color: YG.textMuted, fontSize: 11.5, fontWeight: 600 }}>
          {acik ? 'Gizle' : 'Detaylar'}
        </span>
      </div>

      {acik && (
        <div style={{ padding: '0 18px 16px', borderTop: '1px solid ' + YG.border }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
              gap: '14px 18px',
              margin: '16px 0',
              padding: '14px 16px',
              background: YG.bg,
              borderRadius: 10,
            }}
          >
            {satir('Aktif üniversite', rec.aktifUniversite, 'aktifUniversite')}
            {satir('Aktif fakülte', rec.aktifFakulte, 'aktifFakulte')}
            {satir('Aktif bölüm', rec.aktifBolum, 'aktifBolum')}
            {satir('Sınıfı', rec.aktifSinif, 'aktifSinif')}
            {satir('Başvurduğu fakülte', rec.basvurduguFakulte, 'basvurduguFakulte')}
            {satir('Başvurduğu bölüm', rec.basvurduguBolum, 'basvurduguBolum')}
            {satir('Başvurduğu sınıf', rec.basvurduguSinif, 'basvurduguSinif')}
            {satir('YKS yerleşme yılı', rec.yksYerlesmeYili, 'yksYerlesmeYili')}
            {satir('Puan türü', rec.yksPuanTuru, 'yksPuanTuru')}
            {satir('YKS puanı', rec.yksPuani, 'yksPuani')}
            {satir('Not ortalaması', rec.notOrtalamasi, 'notOrtalamasi')}
            {hesap && satir('YKS %40', hesap.p40)}
            {hesap && satir('AGNO %60', hesap.n60)}
            {satir('Telefon', rec.telefon, 'telefon')}
            {satir('E-posta', rec.eposta, 'eposta')}
          </div>

          {/* Ekler — akademisyende seçilen belge YAN PANELDE açılır (PDF) */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: isStaff && acikEk ? 'minmax(0,260px) minmax(0,1fr)' : '1fr',
              gap: 12,
              marginBottom: 14,
              alignItems: 'start',
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {ygEkler(rec.turu).map((ek) => {
                const f = (rec.ekler || {})[ek.id];
                if (!f) {
                  // Eksik ek — akademisyen yerine yükleyebilir. Öğrenci
                  // Belgesi gibi sonradan zorunlu olan belgeler eski
                  // kayıtlarda hep eksik kalıyor; başvuruyu geri göndermek
                  // yerine burada tamamlanabilmeli.
                  return (
                    <div key={ek.id} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      <span
                        style={{ ...ygPill(YG.textMuted, YG.bg), flex: 1, textAlign: 'center' }}
                      >
                        {ek.title} — yok
                      </span>
                      {isStaff && onEkYukle && (
                        <label style={{ cursor: ekYukleniyor ? 'wait' : 'pointer' }}>
                          <input
                            type="file"
                            style={{ display: 'none' }}
                            onChange={async (e) => {
                              const dosya = (e.target.files || [])[0];
                              e.target.value = '';
                              if (!dosya) return;
                              setEkYukleniyor(ek.id);
                              try {
                                await onEkYukle(rec, ek.id, dosya);
                              } finally {
                                setEkYukleniyor('');
                              }
                            }}
                          />
                          <span
                            style={{
                              display: 'inline-block',
                              fontSize: 11.5,
                              fontWeight: 700,
                              color: YG.navy,
                              border: '1px solid ' + YG.border,
                              background: 'white',
                              borderRadius: 8,
                              padding: '5px 10px',
                              whiteSpace: 'nowrap',
                              opacity: ekYukleniyor ? 0.6 : 1,
                            }}
                          >
                            {ekYukleniyor === ek.id ? 'Yükleniyor…' : 'Yükle'}
                          </span>
                        </label>
                      )}
                    </div>
                  );
                }
                const secili = acikEk === ek.id;
                return (
                  <div key={ek.id} style={{ display: 'flex', gap: 6 }}>
                    {isStaff && (
                      <button
                        type="button"
                        onClick={() => setAcikEk(secili ? '' : ek.id)}
                        style={{
                          flex: 1,
                          textAlign: 'left',
                          fontSize: 12,
                          fontWeight: 600,
                          color: secili ? '#7c4a03' : YG.accent,
                          border: '1px solid ' + YG.accent + (secili ? '' : '55'),
                          background: secili ? YG.accentPale : 'white',
                          borderRadius: 8,
                          padding: '6px 10px',
                          cursor: 'pointer',
                          fontFamily: 'inherit',
                        }}
                      >
                        {ek.title}
                      </button>
                    )}
                    <a
                      href={ygFileHref(f.url)}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        fontSize: 12,
                        fontWeight: 600,
                        color: YG.navy,
                        border: '1px solid ' + YG.border,
                        background: 'white',
                        borderRadius: 8,
                        padding: '6px 10px',
                        textDecoration: 'none',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {isStaff ? 'İndir' : ek.title}
                    </a>
                  </div>
                );
              })}
            </div>

            {isStaff && acikEk && (rec.ekler || {})[acikEk] && (
              <div
                style={{
                  border: '1px solid ' + YG.border,
                  borderRadius: 10,
                  overflow: 'hidden',
                  background: YG.bg,
                }}
              >
                <div
                  style={{
                    padding: '7px 12px',
                    background: 'white',
                    borderBottom: '1px solid ' + YG.border,
                    fontSize: 12,
                    fontWeight: 700,
                    color: YG.navy,
                  }}
                >
                  {(YG_EKLER.find((e) => e.id === acikEk) || {}).title}
                </div>
                <iframe
                  title="ek-onizleme"
                  src={String((rec.ekler || {})[acikEk].url || '')
                    .replace('/api/files/download/', '/api/files/view/')
                    .replace(/\?download=true$/, '')}
                  style={{ width: '100%', height: 420, border: 'none', background: 'white' }}
                />
              </div>
            )}
          </div>

          {/* Bölüm yetkilisi: değerlendirmesi tamamlanmış kaydı kalıcı silebilir.
              Süren başvurularda buton hiç görünmez. */}
          {isStaff && !!rec.degerlendirme && window.BasvuruSilButonu && (
            <div style={{ marginBottom: 14 }}>
              {React.createElement(window.BasvuruSilButonu, {
                koleksiyon: 'yatay_gecis_basvurular',
                docId: rec.id || rec._docId,
                currentUser,
                tamamlandi: true,
                ogrenciAdi: rec.adSoyad,
                onSilindi,
              })}
            </div>
          )}

          {/* Gönderilmiş başvurunun beyan alanlarını düzenle.
              Adayın özgün beyanı `ilkBeyan` altında saklanır ve bir daha
              üzerine yazılmaz — belge-beyan denetimi anlamını yitirmesin. */}
          {isStaff && onDuzenle && (
            <div style={{ marginBottom: 14 }}>
              {!duzenle ? (
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setDuzForm(window.duzenlemeFormu(rec));
                      setDuzenle(true);
                    }}
                    style={ygBtn(false)}
                  >
                    Başvuruyu Düzenle
                  </button>
                  {rec.duzenleyen && (
                    <span style={{ fontSize: 11.5, color: YG.textMuted }}>
                      Son düzenleme: {rec.duzenleyen}
                      {rec.duzenlenmeZamani
                        ? ' · ' + new Date(rec.duzenlenmeZamani).toLocaleDateString('tr-TR')
                        : ''}
                    </span>
                  )}
                </div>
              ) : (
                <div
                  style={{
                    border: '1px solid ' + YG.border,
                    borderRadius: 10,
                    padding: 14,
                    background: 'white',
                  }}
                >
                  <div style={{ fontSize: 12.5, fontWeight: 700, color: YG.navy, marginBottom: 4 }}>
                    Başvuruyu düzenle
                  </div>
                  <div
                    style={{
                      fontSize: 11.5,
                      color: YG.textMuted,
                      marginBottom: 12,
                      lineHeight: 1.55,
                    }}
                  >
                    Değiştirdiğiniz alanlar &quot;düzeltildi&quot; olarak işaretlenir; adayın özgün
                    beyanı kayıtta saklı kalır. Kim neyi ne zaman değiştirdiği günlüğe yazılır.
                  </div>
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
                      gap: 10,
                      marginBottom: 12,
                    }}
                  >
                    {(window.BASVURU_DUZENLENEBILIR_ALANLAR || []).map((a) => (
                      <div key={a.id}>
                        <label style={ygLabel}>{a.label}</label>
                        <input
                          value={duzForm[a.id] || ''}
                          onChange={(e) => setDuzForm((f) => ({ ...f, [a.id]: e.target.value }))}
                          style={ygInput}
                        />
                      </div>
                    ))}
                  </div>
                  <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                    <button type="button" onClick={() => setDuzenle(false)} style={ygBtn(false)}>
                      Vazgeç
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={async () => {
                        const ok = await onDuzenle(rec, duzForm);
                        if (ok) setDuzenle(false);
                      }}
                      style={ygBtn(!busy)}
                    >
                      Değişiklikleri Kaydet
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Adayın özgün beyanından ayrılan alanlar — tek bakışta görünsün. */}
          {isStaff && window.beyanFarklari && window.beyanFarklari(rec).length > 0 && !duzenle && (
            <details style={{ marginBottom: 14 }}>
              <summary
                style={{
                  fontSize: 11.5,
                  color: YG.accent,
                  cursor: 'pointer',
                  fontWeight: 700,
                }}
              >
                {window.beyanFarklari(rec).length} alan adayın beyanından farklı
              </summary>
              <ul style={{ margin: '6px 0 0', paddingLeft: 18, fontSize: 11.5, lineHeight: 1.8 }}>
                {window.beyanFarklari(rec).map((f) => (
                  <li key={f.id} style={{ color: YG.textMuted }}>
                    <b>{f.label}:</b> {f.beyan || '—'} → <b>{f.guncel || '—'}</b>
                  </li>
                ))}
              </ul>
            </details>
          )}

          {/* Aday numarası tanımlama — kesin kayıt yapılınca. Numara girildiği
              an başvuru öğrencinin KENDİ ekranında görünür hâle gelir; liste
              zaten ogrenciNo eşitliğiyle süzülüyor. */}
          {isStaff && window.vekaletenMi && window.vekaletenMi(rec) && onNumaraTanimla && (
            <div
              style={{
                border: '1px solid ' + YG.accent + '55',
                background: YG.accentPale,
                borderRadius: 10,
                padding: 12,
                marginBottom: 14,
              }}
            >
              <div style={{ fontSize: 12.5, fontWeight: 700, color: '#7c4a03', marginBottom: 4 }}>
                Bu başvuruyu aday adına {rec.girenPersonel || 'bir akademisyen'} açtı
              </div>
              <div style={{ fontSize: 11.5, color: '#7c4a03', marginBottom: 10, lineHeight: 1.55 }}>
                Kesin kayıt yapılıp öğrenci numarası verildiğinde buraya yazın. O andan itibaren
                başvuru öğrencinin kendi ekranında görünür.
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                <input
                  value={yeniNo}
                  onChange={(e) => setYeniNo(e.target.value.replace(/\D/g, ''))}
                  placeholder="Öğrenci numarası"
                  style={{ ...ygInput, width: 190 }}
                />
                <button
                  type="button"
                  disabled={busy || !yeniNo.trim()}
                  onClick={() => onNumaraTanimla(rec, yeniNo.trim(), () => setYeniNo(''))}
                  style={ygBtn(!!yeniNo.trim() && !busy)}
                >
                  Numarayı Tanımla
                </button>
              </div>
            </div>
          )}

          {/* Akademisyen: öğrencinin BEYANINI yüklediği belgelerle denetle.
              Karar değerlendiricinindir; bu yalnız uyuşmazlıkları işaretler. */}
          {isStaff && window.AIBelgeKontrol && (
            <div style={{ marginBottom: 14 }}>
              {React.createElement(window.AIBelgeKontrol, {
                module: 'yataygecis',
                docType: tur?.id || 'default',
                departmentId: rec.departmentId || '',
                alanlar: kiyasAlanlari,
                mevcutDegerler: kiyasDegerleri,
                dosyalar: kiyasDosyalari,
              })}
            </div>
          )}

          {/* Akademisyen: DEĞERLENDİRME (belgedeki son sütun) */}
          {isStaff && (
            <div
              style={{
                border: '1px solid ' + YG.border,
                borderRadius: 10,
                padding: 14,
                background: YG.bg,
              }}
            >
              <div style={{ fontSize: 12.5, fontWeight: 700, color: YG.navy, marginBottom: 10 }}>
                Değerlendirme — belgedeki &quot;Değerlendirme Sonucu&quot; sütununa yazılır
              </div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
                  gap: 10,
                }}
              >
                <div>
                  <label style={ygLabel}>Sonuç</label>
                  <select
                    value={rec.degerlendirme || ''}
                    disabled={busy}
                    onChange={(e) => onDegerlendir(rec, { degerlendirme: e.target.value })}
                    style={{ ...ygInput, cursor: 'pointer' }}
                  >
                    {YG_DEGERLENDIRME.map((d) => (
                      <option key={d.id || 'bos'} value={d.id}>
                        {d.label}
                      </option>
                    ))}
                  </select>
                </div>
                {deg && deg.sinifSorar && (
                  <div>
                    <label style={ygLabel}>Sınıf</label>
                    <input
                      value={rec.degerlendirmeSinif || ''}
                      disabled={busy}
                      onChange={(e) => onDegerlendir(rec, { degerlendirmeSinif: e.target.value })}
                      placeholder="ör. 2"
                      style={ygInput}
                    />
                  </div>
                )}
                {deg && deg.siraSorar && (
                  <div>
                    <label style={ygLabel}>Sıra</label>
                    <input
                      value={rec.degerlendirmeSira || ''}
                      disabled={busy}
                      onChange={(e) => onDegerlendir(rec, { degerlendirmeSira: e.target.value })}
                      placeholder="ör. 1"
                      style={ygInput}
                    />
                  </div>
                )}
                {/* Merkezi yerleştirmede karar ölçütü: öğrencinin YKS puanı,
                    BAŞVURDUĞU programın o yılki taban puanına eşit ya da
                    üstünde mi (Ek Madde 1). Taban puan yıldan yıla ve programa
                    göre değiştiği için başvuru başına burada girilir; öğrenci
                    formunda sorulmaz, çünkü bu bilgi öğrencide değil bölümde.

                    Yukarıdaki panelde bir adres verildiyse, o programın taban
                    puanı oradan gelir ve tek tıkla bu alana yazılır. */}
                {tur?.id === 'merkezi' && (
                  <div>
                    <label style={ygLabel}>Başvurulan bölümün ÖSYS/YKS taban puanı</label>
                    <input
                      value={rec.basvurduguBolumOsysPuani || ''}
                      disabled={busy}
                      onChange={(e) =>
                        onDegerlendir(rec, {
                          basvurduguBolumOsysPuani: e.target.value.replace(/[^\d.,]/g, ''),
                        })
                      }
                      placeholder="ör. 412,338"
                      style={ygInput}
                    />
                    {tabanOneri && !ygAyniPuan(tabanOneri.taban, rec.basvurduguBolumOsysPuani) && (
                      <button
                        onClick={() =>
                          onDegerlendir(rec, { basvurduguBolumOsysPuani: tabanOneri.taban })
                        }
                        disabled={busy}
                        style={{
                          marginTop: 5,
                          padding: '4px 9px',
                          borderRadius: 6,
                          border: '1px solid ' + YG.border,
                          background: '#fff',
                          color: YG.navy,
                          fontSize: 11,
                          fontWeight: 700,
                          fontFamily: 'inherit',
                          cursor: busy ? 'not-allowed' : 'pointer',
                        }}
                      >
                        Sayfadan okunanı yaz: {tabanOneri.taban}
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Taban puan karşılaştırması — kararı model değil bu satır verir.
                  Yalnız bilgilendirir: "Sonuç" alanını kendiliğinden
                  DEĞİŞTİRMEZ, son söz akademisyenindir. */}
              {tur?.id === 'merkezi' && tabanKiyas && tabanKiyas.durum !== 'belirsiz' && (
                <div
                  style={{
                    marginTop: 10,
                    padding: '8px 12px',
                    borderRadius: 8,
                    fontSize: 12,
                    fontWeight: 600,
                    background:
                      tabanKiyas.durum === 'uygun' ? YG.greenLight + '66' : YG.accent + '18',
                    color: tabanKiyas.durum === 'uygun' ? '#065F46' : YG.accent,
                  }}
                >
                  {tabanKiyas.durum === 'uygun'
                    ? 'Adayın puanı taban puanı karşılıyor'
                    : 'Adayın puanı taban puanının ALTINDA'}
                  {' — ' +
                    ygPuanYaz(tabanKiyas.aday) +
                    (tabanKiyas.durum === 'uygun' ? ' ≥ ' : ' < ') +
                    ygPuanYaz(tabanKiyas.taban) +
                    ' (fark ' +
                    ygPuanYaz(tabanKiyas.fark) +
                    ')'}
                </div>
              )}

              {/* Kayıttaki sonuç taban puan şartıyla çelişiyorsa sessizce
                  düzeltmek yetmez: personel, listede neden bir isim eksildiğini
                  görebilmeli. Veriye dokunulmaz — "Sıralamayı Uygula" yazar. */}
              {etkin.cakisma && (
                <div
                  style={{
                    marginTop: 10,
                    padding: '8px 12px',
                    borderRadius: 8,
                    fontSize: 12,
                    fontWeight: 600,
                    background: YG.redLight,
                    color: YG.red,
                  }}
                >
                  Kayıtta önceki sıralamadan kalan sonuç:{' '}
                  <b>
                    {(YG_DEGERLENDIRME.find((d) => d.id === rec.degerlendirme) || {}).label ||
                      rec.degerlendirme}
                  </b>
                  . {(window.ELEME_ETIKET || {})[etkin.sebep] || 'Taban puan şartı karşılanmıyor'}{' '}
                  olduğu için aday <b>UYGUN DEĞİL</b> sayılır ve belgeye böyle yazılır. Listeyi
                  kalıcı düzeltmek için “Sıralamayı Uygula”yı yeniden çalıştırın.
                </div>
              )}

              {etkin.degerlendirme && (
                <div style={{ fontSize: 12, color: YG.textMuted, marginTop: 8 }}>
                  Belgeye yazılacak:{' '}
                  <b style={{ color: YG.navy }}>{ygDegerlendirmeMetni(rec, osymEsik)}</b>
                </div>
              )}
            </div>
          )}

          {/* Öğrenci: kendi değerlendirme sonucu */}
          {!isStaff && etkin.degerlendirme && (
            <div
              style={{
                padding: '10px 12px',
                borderRadius: 10,
                background: YG.greenLight + '66',
                border: '1px solid ' + YG.green + '44',
                fontSize: 13,
                color: '#065F46',
              }}
            >
              Değerlendirme sonucunuz: <b>{ygDegerlendirmeMetni(rec, osymEsik)}</b>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// Ana bileşen
// ══════════════════════════════════════════════════════════════
function YatayGecisApp({ currentUser, activeDepartment, departmentInfo }) {
  const isStudent = currentUser?.role === 'student';
  const isStaff = !isStudent;

  const [turId, setTurId] = useState('kurumici');
  const tur = YG_TURLER.find((t) => t.id === turId) || YG_TURLER[0];
  const [sekme, setSekme] = useState(isStudent ? 'yeni' : 'basvurular');

  const [kayitlar, setKayitlar] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  // Üretilen raporun belge kimliği — "Memura Gönder" düğmesi bununla çalışır.
  const [uretilenBelge, setUretilenBelge] = useState(null);
  const [belgeUretiliyor, setBelgeUretiliyor] = useState(false);

  const yukle = useCallback(async () => {
    setLoading(true);
    try {
      const read = window.apiRead.fresh || window.apiRead;
      const list = (await read('yatay_gecis_basvurular')) || [];
      setKayitlar(Array.isArray(list) ? list : []);
    } catch (e) {
      console.error('yatay geçiş kayıtları okunamadı:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    yukle();
  }, [yukle]);

  // Kapsam: öğrenci yalnız kendi başvurularını, personel bölümünün
  // başvurularını görür. Seçili geçiş türüne göre süzülür.
  //
  // SIRALAMA: puanlı türlerde (kurumlararası · merkezi) liste yerleştirmeye
  // esas puana göre yüksekten düşüğe dizilir — belge de bu sırayla üretilir,
  // yani ekranda gördüğünüz sıra çıktıdaki sıradır. Kurum içi geçişte puan
  // ölçütü olmadığı için kayıt sırası (yeniden eskiye) korunur.
  const gorunen = useMemo(() => {
    const myNo = String(currentUser?.studentNumber || currentUser?.identifier || '');
    const liste = kayitlar
      .filter((r) => (r.turu || 'kurumici') === turId)
      .filter((r) => {
        if (isStudent) return String(r.ogrenciNo || '') === myNo;
        if (!activeDepartment) return true;
        return !r.departmentId || r.departmentId === activeDepartment;
      })
      .sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
    return turId === 'kurumici' ? liste : puanaGoreSirala(liste, turId);
  }, [kayitlar, turId, isStudent, currentUser, activeDepartment]);

  const degerlendirilmemis = gorunen.filter((r) => !r.degerlendirme).length;
  const belgeHazir = gorunen.length > 0 && degerlendirilmemis === 0;

  // ── Kontenjan → puana göre asil/yedek önerisi ──
  // Akademisyen sınıf başına kaç asil kaç yedek alınacağını girer; sistem
  // yerleştirmeye esas puana göre sıralayıp öneriyi kayıtlara uygular.
  // Uygulandıktan sonra her satır tek tek değiştirilebilir — son karar
  // akademisyenindir, bu yalnız elle doldurmayı ortadan kaldırır.
  // Kontenjan SINIF BAŞINA ilan edilir (2. sınıfa 5, 3. sınıfa 3 gibi).
  // Tek bir sayı bütün sınıflara uygulanıyordu ve gerçek ilanla uyuşmuyordu.
  const [kontenjanlar, setKontenjanlar] = useState({});
  // Kurumun elle belirlediği taban ÖSYM yerleştirme puanı. Altında kalan
  // aday, sıralamada nerede olursa olsun "uygun değil"dir.
  const [osymEsik, setOsymEsik] = useState('');
  const [kriterKaydediliyor, setKriterKaydediliyor] = useState(false);

  // ── Taban puanlar (yalnız merkezi yerleştirme) ──
  // Aranacak programlar = başvurulardaki farklı "başvurduğu bölüm" değerleri.
  // Bölümün adı da eklenir: henüz başvuru yokken bile adres girilip puan
  // çekilebilsin diye.
  const [tabanKayitlari, setTabanKayitlari] = useState([]);
  const tabanProgramlari = useMemo(() => {
    if (turId !== 'merkezi') return [];
    const adlar = new Map(); // anahtar → görünen ad (ilk yazım korunur)
    const ekle = (ad) => {
      const t = String(ad || '').trim();
      if (!t) return;
      const k = window.programAnahtari ? window.programAnahtari(t) : t.toLowerCase();
      if (k && !adlar.has(k)) adlar.set(k, t);
    };
    ekle(departmentInfo?.name);
    gorunen.forEach((r) => ekle(r.basvurduguBolum));
    return Array.from(adlar.entries()).map(([k, ad]) => ({ id: 'p_' + k.slice(0, 50), ad }));
  }, [turId, gorunen, departmentInfo]);

  // Başvurulan sınıflar — kontenjan alanları bunlara göre çıkar.
  const basvuruSiniflari = useMemo(() => {
    const set = new Set();
    gorunen.forEach((r) => {
      const s2 = String(r.basvurduguSinif || '').trim();
      if (s2) set.add(s2);
    });
    return Array.from(set).sort((a, b) => Number(a) - Number(b) || a.localeCompare(b, 'tr'));
  }, [gorunen]);

  // Kriterler (taban ÖSYM puanı + sınıf kontenjanları) bölüm ve tür başına
  // saklanır — mevcut taban_puanlar koleksiyonundaki aynı kapsam anahtarı.
  const kriterDocId = (activeDepartment || 'genel') + ':yatay-kriter-' + turId;
  useEffect(() => {
    let iptal = false;
    window
      .apiRead('taban_puanlar')
      .then((liste) => {
        if (iptal) return;
        const d = (liste || []).find((x) => (x.id || x._docId) === kriterDocId);
        setOsymEsik(d && d.osymEsik ? String(d.osymEsik) : '');
        setKontenjanlar(
          d && d.kontenjanlar && typeof d.kontenjanlar === 'object' ? d.kontenjanlar : {}
        );
      })
      .catch(() => {});
    return () => {
      iptal = true;
    };
  }, [kriterDocId]);

  const kriterKaydet = async () => {
    setKriterKaydediliyor(true);
    try {
      await window.DBWrite.set(
        'taban_puanlar',
        kriterDocId,
        {
          modul: 'yatay-kriter-' + turId,
          departmentId: activeDepartment || '',
          osymEsik: String(osymEsik || '').trim(),
          kontenjanlar,
          guncelleyen: String(currentUser?.name || currentUser?.identifier || ''),
          guncellemeZamani: new Date().toISOString(),
        },
        true
      );
      setMsg('Kriterler kaydedildi.');
      setTimeout(() => setMsg(''), 3000);
    } catch (e) {
      alert('Kaydedilemedi: ' + e.message);
    } finally {
      setKriterKaydediliyor(false);
    }
  };

  const kontenjanYaz = (sinif, alan, deger) =>
    setKontenjanlar((k) => ({
      ...k,
      [sinif]: { ...(k[sinif] || {}), [alan]: deger.replace(/\D/g, '') },
    }));

  // Taban puan şartını karşılamayanlar — İKİ ayrı şart var:
  //   • kurumun elle girdiği asgari ÖSYM puanı (osymEsik)
  //   • adayın BAŞVURDUĞU PROGRAMIN kendi ÖSYM taban puanı
  // İkincisi kartta gösteriliyordu ama sıralamaya girmiyordu; taban puanın
  // altındaki aday yine sıraya alınıp YEDEK yazılıyordu. Artık ikisi de
  // kontenjana sayılmadan eliyor.
  const esikDisi = useMemo(
    () => (window.elenecekler ? window.elenecekler(gorunen, osymEsik) : new Map()),
    [gorunen, osymEsik]
  );

  // Hiç kontenjan girilmemişse sıralama uygulanmaz — herkesi "uygun değil"
  // yapmak, kontenjanı unutmuş bir bölümde tüm başvuruları elemek olurdu.
  const kontenjanBos = !Object.values(kontenjanlar || {}).some(
    (k) => (parseInt(k && k.asil, 10) || 0) > 0 || (parseInt(k && k.yedek, 10) || 0) > 0
  );

  const siralamayiUygula = async () => {
    const oneri = asilYedekOner(gorunen, turId, kontenjanlar, null, { esikDisi });
    const uygulanacak = oneri.filter((o) => o.degerlendirme);
    if (uygulanacak.length === 0) {
      setMsg('Sıralanacak başvuru yok (puan bilgisi eksik olabilir).');
      setTimeout(() => setMsg(''), 6000);
      return;
    }
    const puansiz = oneri.length - uygulanacak.length;
    const asilAdet = uygulanacak.filter((o) => o.degerlendirme === 'uygun_asil').length;
    const yedekAdet = uygulanacak.filter((o) => o.degerlendirme === 'uygun_yedek').length;
    const disarida = uygulanacak.filter((o) => o.degerlendirme === 'uygun_degil').length;
    const esikNedeniyle = uygulanacak.filter(
      (o) => o.sebep === 'taban_osym' || o.sebep === 'program_taban'
    ).length;
    if (
      !confirm(
        'Yerleştirmeye esas puana göre sıralanıp değerlendirme sonuçları yazılacak:\n\n' +
          '  • ' +
          asilAdet +
          ' asil\n' +
          '  • ' +
          yedekAdet +
          ' yedek\n' +
          '  • ' +
          disarida +
          ' kontenjan dışı (UYGUN DEĞİL)' +
          (esikNedeniyle > 0
            ? ' — bunların ' + esikNedeniyle + ' tanesi taban puan şartını karşılamıyor'
            : '') +
          '\n' +
          (puansiz > 0 ? '  • ' + puansiz + ' başvuru puansız — dokunulmayacak\n' : '') +
          '\nDaha önce girilmiş değerlendirmeler bu kayıtlarda değişecek. ' +
          'Uygulandıktan sonra her satırı tek tek düzeltebilirsiniz.\n\nDevam edilsin mi?'
      )
    ) {
      return;
    }
    setBusy(true);
    try {
      for (const o of uygulanacak) {
        await window.DBWrite.set(
          'yatay_gecis_basvurular',
          String(o.id),
          {
            degerlendirme: o.degerlendirme,
            degerlendirmeSinif: o.degerlendirmeSinif,
            degerlendirmeSira: o.degerlendirmeSira,
            updatedAt: new Date().toISOString(),
          },
          true
        );
      }
      setKayitlar((prev) =>
        prev.map((r) => {
          const o = uygulanacak.find((x) => String(x.id) === String(r.id || r._docId));
          return o
            ? {
                ...r,
                degerlendirme: o.degerlendirme,
                degerlendirmeSinif: o.degerlendirmeSinif,
                degerlendirmeSira: o.degerlendirmeSira,
              }
            : r;
        })
      );
      setMsg(
        'Sıralama uygulandı: ' +
          asilAdet +
          ' asil, ' +
          yedekAdet +
          ' yedek' +
          (disarida > 0 ? ', ' + disarida + ' kontenjan dışı' : '') +
          (puansiz > 0 ? ' · ' + puansiz + ' puansız başvuruya dokunulmadı' : '') +
          '. Gerekirse satırları tek tek düzeltin.'
      );
      setTimeout(() => setMsg(''), 12000);
    } catch (e) {
      alert('Sıralama uygulanamadı: ' + e.message);
    } finally {
      setBusy(false);
    }
  };

  const kaydetDegerlendirme = async (rec, patch) => {
    setBusy(true);
    try {
      const docId = rec.id || rec._docId;
      await window.DBWrite.set(
        'yatay_gecis_basvurular',
        String(docId),
        { ...patch, updatedAt: new Date().toISOString() },
        true
      );
      setKayitlar((prev) =>
        prev.map((r) => ((r.id || r._docId) === docId ? { ...r, ...patch } : r))
      );
    } catch (e) {
      alert('Kaydedilemedi: ' + e.message);
    } finally {
      setBusy(false);
    }
  };

  // Vekâleten açılmış kayda gerçek öğrenci numarasını tanımla.
  //
  // Kural lib/aday-kimlik.js'te: numara yalnız rakam olmalı, geçici numara
  // kalıcı sayılmaz ve ZATEN numarası olan bir kaydın sahibi değiştirilemez —
  // aksi hâlde başvuru sessizce başka bir öğrenciye devredilirdi.
  const numaraTanimla = async (rec, no, temizle) => {
    const kontrol = window.numaraTanimlanabilirMi(rec, no);
    if (!kontrol.ok) {
      alert(kontrol.sebep);
      return;
    }
    if (
      !confirm(
        (rec.adSoyad || 'Aday') +
          ' başvurusuna ' +
          no +
          ' numarası tanımlanacak.\n\nBu andan sonra başvuru öğrencinin kendi ' +
          'ekranında görünür. Devam edilsin mi?'
      )
    )
      return;
    await kaydetDegerlendirme(rec, { ogrenciNo: no, vekaleten: false });
    if (temizle) temizle();
    setMsg('Öğrenci numarası tanımlandı.');
    setTimeout(() => setMsg(''), 3000);
  };

  // Gönderilmiş başvurunun beyan alanlarını düzenle.
  //
  // Yama lib/basvuru-duzenle.js'te üretilir: yalnız izinli alanlar geçer
  // (değerlendirme ve kimlik alanlarının kendi akışları var), adayın özgün
  // beyanı ilk düzenlemede saklanır ve her düzenleme günlüğe yazılır.
  const basvuruDuzenle = async (rec, yeniDegerler) => {
    const kim = String(currentUser?.name || currentUser?.identifier || '');
    const { patch, degisenler } = window.duzenlemeYamasi(rec, yeniDegerler, kim);
    if (!patch) {
      setMsg('Değişiklik yok.');
      setTimeout(() => setMsg(''), 2500);
      return true;
    }
    if (
      !confirm(
        degisenler.length +
          ' alan değişecek:\n\n' +
          degisenler
            .map((d) => '• ' + d.label + ': ' + (d.eski || '—') + ' → ' + d.yeni)
            .join('\n') +
          '\n\nAdayın özgün beyanı kayıtta saklı kalacak. Devam edilsin mi?'
      )
    ) {
      return false;
    }
    await kaydetDegerlendirme(rec, patch);
    setMsg(degisenler.length + ' alan güncellendi.');
    setTimeout(() => setMsg(''), 3000);
    return true;
  };

  // Akademisyen eksik eki adayın yerine yükler. Ek listesi kaydın kendi
  // ekleriyle BİRLEŞTİRİLİR — mevcut dosyalar silinmez.
  const ekYukle = async (rec, ekId, dosya) => {
    try {
      const url = await ygDosyaYukle(dosya);
      if (!url) {
        alert('Dosya yüklenemedi, tekrar deneyin.');
        return;
      }
      const ekler = { ...(rec.ekler || {}), [ekId]: { url, ad: dosya.name } };
      await kaydetDegerlendirme(rec, {
        ekler,
        duzenleyen: String(currentUser?.name || currentUser?.identifier || ''),
        duzenlenmeZamani: new Date().toISOString(),
      });
      setMsg('Belge yüklendi.');
      setTimeout(() => setMsg(''), 3000);
    } catch (e) {
      alert('Yüklenemedi: ' + e.message);
    }
  };

  // ── Değerlendirme raporu (tüm başvuranlar tek belgede) ──
  const belgeOlustur = async () => {
    if (!window.TemplateEngine || !window.TemplateEngine.produceFromTemplate) {
      alert('Şablon motoru yüklenemedi.');
      return;
    }
    setBelgeUretiliyor(true);
    try {
      const bolumAd = departmentInfo?.name || '';
      const bugun = new Date();
      const yil = bugun.getMonth() >= 7 ? bugun.getFullYear() : bugun.getFullYear() - 1;
      const egitimYili = yil + '-' + (yil + 1);
      const donem = bugun.getMonth() >= 7 || bugun.getMonth() <= 0 ? 'GÜZ' : 'BAHAR';

      const rows = gorunen.map((r) => {
        const h = tur.hesapla ? ygYerlesmePuani(r.yksPuani, r.notOrtalamasi) : null;
        return {
          adSoyad: r.adSoyad || '',
          aktifUniversite: r.aktifUniversite || '',
          aktifFakulte: r.aktifFakulte || '',
          aktifBolum: r.aktifBolum || '',
          aktifSinif: r.aktifSinif || '',
          basvurduguFakulte: r.basvurduguFakulte || '',
          basvurduguBolum: r.basvurduguBolum || bolumAd,
          basvurduguSinif: r.basvurduguSinif || '',
          basvurduguYariyil: egitimYili + ' ' + donem,
          yksYerlesmeYili: r.yksYerlesmeYili || '',
          yksPuanTuru: r.yksPuanTuru || '',
          yksPuani: r.yksPuani || '',
          notOrtalamasi: r.notOrtalamasi || '',
          yksPuaniYuzde40: h ? String(h.p40) : '',
          notOrtYuzde60: h ? String(h.n60) : '',
          yerlesmePuani: h ? String(h.toplam) : '',
          basvurduguBolumOsysPuani: r.basvurduguBolumOsysPuani || '',
          // Taban puan şartı burada da uygulanır: rapor, kayıtta artakalmış
          // eski bir sıralamanın sonucunu değil GEÇERLİ sonucu yazar.
          degerlendirme: ygDegerlendirmeMetni(r, osymEsik),
        };
      });

      // Şablonlar .xlsx — satır çoğaltmalı xlsx üreticisi kullanılır.
      const res = await window.TemplateEngine.produceRowsXlsx({
        module: 'yataygecis',
        docType: turId,
        departmentId: activeDepartment || '',
        staticData: {
          egitimYili,
          donem,
          basvurulanBolum: bolumAd,
          basvurulanBolumKisa: ygBolumKisa(bolumAd),
          fakulteAd: window.TENANT?.facultyName || 'Mühendislik Fakültesi',
          tarih: bugun.toLocaleDateString('tr-TR'),
        },
        rows,
        filename:
          'Yatay_Gecis_' + turId + '_' + (bolumAd || 'bolum').replace(/\s+/g, '_') + '.xlsx',
        noDownload: true,
      });

      if (!res.ok) {
        if (res.reason === 'not-xlsx') {
          alert('Bu geçiş türüne atanan şablon .xlsx değil. Şablonu .xlsx olarak yükleyin.');
        } else if (res.reason === 'no-template') {
          alert(
            'Bu geçiş türü için şablon atanmamış.\n\nŞablonlar → Yatay Geçiş → "' +
              tur.tamAd +
              '" altına şablonu yükleyip alanları eşleyin.'
          );
        } else if (res.reason === 'no-mapping') {
          alert('Şablonun alan eşlemesi yapılmamış (Şablonlar → Alanlar).');
        } else if (res.reason === 'no-row-token') {
          // Eskiden bu durumda boş bir dosya üretiliyordu ve sebebi
          // görünmüyordu. En sık nedeni: eşleme yapıldıktan SONRA şablonun
          // yeniden yüklenmesi ya da yer tutucu satırının silinmesi.
          alert(
            'Belge üretilemedi: şablonda satır yer tutucusu bulunamadı.\n\n' +
              'Eşlemede ' +
              (res.eslenenSatirTokenlari || []).length +
              ' satır alanı tanımlı ama bu alanların hiçbiri şablon dosyasında yok. ' +
              'Genellikle eşleme yapıldıktan sonra şablon yeniden yüklenmiş demektir.\n\n' +
              'Şablonlar → "' +
              tur.tamAd +
              '" → Eşlemeyi Düzenle adımını dosyanın güncel hâliyle tekrarlayın.'
          );
        } else {
          alert('Belge üretilemedi: ' + (res.message || res.reason));
        }
        return;
      }

      // Üretim başarılı ama bazı eşlenmiş yer tutucular dosyada yoksa
      // o sütunlar sessizce boş kalır — kullanıcıya söyle.
      if (Array.isArray(res.dosyadaOlmayan) && res.dosyadaOlmayan.length > 0) {
        console.warn('Şablonda bulunamayan yer tutucular:', res.dosyadaOlmayan);
      }

      // Aynı yer tutucu şablonda birden çok yerde geçiyor ama tek eşlemesi
      // varsa hepsi aynı değeri alır. Bu, "{{başvurduğu_bölüm}}" gibi hem rapor
      // başlığında (kısa ad) hem sütunda (tam ad) geçen alanlarda yanlış çıktı
      // verir; sessiz kalmak yerine hangi alanı eşlemek gerektiğini söyle.
      if (Array.isArray(res.eksikGecisler) && res.eksikGecisler.length > 0) {
        setMsg(
          'Belge üretildi. Not: ' +
            res.eksikGecisler
              .map((e) => e.token + ' şablonda ' + e.dosyada + ' yerde geçiyor')
              .join(', ') +
            ' — her geçiş için ayrı alan eşlemesi yapılmazsa hepsi aynı değeri taşır ' +
            '(Şablonlar → Eşlemeyi Düzenle → #1, #2 …).'
        );
        setTimeout(() => setMsg(''), 15000);
      }

      // Snapshot sakla ve önizlemeyi aç
      let url = '';
      try {
        if (window.uploadGeneratedDoc && window.recordMemurOutput) {
          url = (await window.uploadGeneratedDoc(res.blob, res.filename, 'yatay_gecis')) || '';
          if (url) {
            await window.recordMemurOutput({
              module: 'yataygecis',
              sourceId: turId + ':' + (activeDepartment || 'bolum') + ':' + egitimYili + donem,
              title: tur.tamAd + ' — ' + (bolumAd || 'Bölüm'),
              subtitle: egitimYili + ' ' + donem + ' · ' + gorunen.length + ' başvuru',
              url,
              departmentId: activeDepartment || '',
            });
          }
        }
      } catch (e) {
        console.warn('Yatay geçiş snapshot kaydedilemedi:', e && e.message);
      }

      // .xlsx docx önizleyici ile gösterilemez; dosya doğrudan indirilir ve
      // gönderim için belge kimliği saklanır.
      window.TemplateEngine.downloadBlob(res.blob, res.filename);
      setUretilenBelge(
        url
          ? {
              module: 'yataygecis',
              docType: turId,
              sourceId: turId + ':' + (activeDepartment || 'bolum') + ':' + egitimYili + donem,
              title: tur.tamAd + ' — ' + (bolumAd || 'Bölüm'),
              subtitle: egitimYili + ' ' + donem,
              url,
              departmentId: activeDepartment || '',
            }
          : null
      );
      const eksikUyari =
        Array.isArray(res.dosyadaOlmayan) && res.dosyadaOlmayan.length > 0
          ? ' · Uyarı: ' +
            res.dosyadaOlmayan.length +
            ' eşlenmiş alan şablonda bulunamadı, o sütunlar boş kaldı.'
          : '';
      setMsg('Rapor indirildi (' + (res.rowCount || 0) + ' satır).' + eksikUyari);
      setTimeout(() => setMsg(''), eksikUyari ? 12000 : 5000);
    } catch (e) {
      alert('Belge üretilemedi: ' + e.message);
    } finally {
      setBelgeUretiliyor(false);
    }
  };

  const sekmeler = isStudent
    ? [
        { id: 'yeni', label: 'Yeni Başvuru' },
        { id: 'basvurular', label: 'Başvurularım' },
      ]
    : [
        { id: 'basvurular', label: 'Başvurular' },
        // Yatay/dikey geçişle gelen adayın kesin kaydı yapılana kadar öğrenci
        // numarası olmuyor; sisteme giremediği için başvurusunu da açamıyor.
        // Bu sekmede akademisyen aday adına tüm işlemi yürütür.
        { id: 'aday', label: 'Aday Adına Başvuru' },
      ];

  if (loading) {
    return <div style={{ padding: 60, textAlign: 'center', color: YG.textMuted }}>Yükleniyor…</div>;
  }

  return (
    <div
      style={{
        fontFamily: "'Inter', sans-serif",
        color: YG.text,
        maxWidth: 1400,
        margin: '0 auto',
        padding: '0 4px 40px',
      }}
    >
      {window.CakuBanner &&
        React.createElement(window.CakuBanner, {
          title: 'Yatay Geçiş',
          subtitle: tur.tamAd,
        })}

      {/* Başvuru türü seçici — ÇAP/Yandal ile aynı desen */}
      <div style={{ display: 'flex', gap: 10, margin: '18px 0 20px', flexWrap: 'wrap' }}>
        {YG_TURLER.map((t) => {
          const sel = turId === t.id;
          const cnt = kayitlar.filter((r) => (r.turu || 'kurumici') === t.id).length;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => {
                setTurId(t.id);
                setSekme(isStudent ? 'yeni' : 'basvurular');
              }}
              style={{
                flex: '1 1 300px',
                textAlign: 'left',
                padding: '16px 18px',
                borderRadius: 12,
                cursor: 'pointer',
                border: (sel ? '2px solid ' : '1px solid ') + (sel ? t.color : YG.border),
                borderLeft: '3px solid ' + (sel ? t.color : YG.border),
                background: sel ? t.bg : 'white',
                fontFamily: 'inherit',
              }}
            >
              {/* Yalnız ana başlık — tür açıklamaları kaldırıldı; kayıt
                  sayısı bilgi olarak kaldı. */}
              <span
                style={{
                  display: 'block',
                  fontSize: 15.5,
                  fontWeight: 700,
                  color: sel ? t.color : YG.text,
                }}
              >
                {t.label}
              </span>
              {cnt ? (
                <span
                  style={{ fontSize: 11.5, color: YG.textMuted, display: 'block', marginTop: 4 }}
                >
                  {cnt} kayıt
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      {/* Alt sekmeler */}
      {sekmeler.length > 1 && (
        <div
          style={{
            display: 'flex',
            gap: 4,
            marginBottom: 16,
            borderBottom: '1px solid ' + YG.border,
          }}
        >
          {sekmeler.map((s) => {
            const on = sekme === s.id;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => setSekme(s.id)}
                style={{
                  padding: '10px 16px',
                  background: 'none',
                  border: 'none',
                  borderBottom: '2px solid ' + (on ? YG.accent : 'transparent'),
                  color: on ? YG.accent : YG.textMuted,
                  fontWeight: on ? 700 : 500,
                  fontSize: 13.5,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                {s.label}
              </button>
            );
          })}
        </div>
      )}

      {msg && (
        <div style={{ fontSize: 12.5, color: YG.green, fontWeight: 600, marginBottom: 10 }}>
          {msg}
        </div>
      )}

      {/* Öğrenci: yeni başvuru */}
      {isStudent && sekme === 'yeni' && (
        <YgBasvuruFormu
          key={turId}
          tur={tur}
          currentUser={currentUser}
          departmentInfo={departmentInfo}
          onSaved={() => {
            setMsg('Başvurunuz alındı.');
            setSekme('basvurular');
            yukle();
            setTimeout(() => setMsg(''), 3000);
          }}
        />
      )}

      {/* Akademisyen: numarası olmayan aday adına başvuru */}
      {isStaff && sekme === 'aday' && (
        <YgBasvuruFormu
          key={'aday-' + turId}
          tur={tur}
          currentUser={currentUser}
          departmentInfo={departmentInfo}
          vekaleten
          mevcutKayitlar={kayitlar}
          onSaved={() => {
            setMsg('Aday başvurusu kaydedildi.');
            setSekme('basvurular');
            yukle();
            setTimeout(() => setMsg(''), 3000);
          }}
        />
      )}

      {/* Başvuru listesi */}
      {sekme === 'basvurular' && (
        <>
          {/* Akademisyen: taban puan tablosunu yapıştır ya da yükle.
              Yalnız merkezi yerleştirmede — kurum içi/kurumlararası geçişte
              taban puan şartı yoktur, ölçüt AGNO ve yerleştirme puanıdır. */}
          {isStaff &&
            turId === 'merkezi' &&
            window.TabanPuanPaneli &&
            tabanProgramlari.length > 0 && (
              <window.TabanPuanPaneli
                currentUser={currentUser}
                departmentId={activeDepartment || ''}
                modul="yatay-merkezi"
                programlar={tabanProgramlari}
                onKayitlar={setTabanKayitlari}
                // Liste türü ŞART: kurumlar aynı yıl için ÖNLİSANS, LİSANS ve
                // DGS listelerini AYRI AYRI yayımlıyor; bir program hepsinde
                // geçebiliyor ama puanları bambaşka. Panel hangisini beklediğini
                // yazsın ki yetkili doğru tabloyu kopyalasın.
                puanTuru="LİSANS (ÖSYS/YKS merkezi yerleştirme listesi)"
                varsayilanTur="lisans"
                baslik="Taban puan (ÖSYS/YKS)"
                aciklama={
                  'Merkezi yerleştirme puanıyla geçişte adayın YKS puanı, başvurduğu programın ' +
                  'taban puanından küçük olamaz. Kütüphaneden lisans tablosunu seçin; ' +
                  tabanProgramlari.length +
                  ' program otomatik eşleştirilir.'
                }
              />
            )}

          {/* Akademisyen: kontenjan → puana göre asil/yedek önerisi.
              Yalnız puan ölçütü olan türlerde (kurum içinde puan yoktur). */}
          {isStaff && turId !== 'kurumici' && gorunen.length > 0 && (
            <div style={{ ...ygCard, padding: '12px 16px', marginBottom: 14 }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-end',
                  gap: 12,
                  flexWrap: 'wrap',
                }}
              >
                <div style={{ flex: '1 1 240px' }}>
                  <div style={{ fontSize: 12.5, fontWeight: 700, color: YG.navy, marginBottom: 3 }}>
                    Kontenjan ile sıralama
                  </div>
                  <div style={{ fontSize: 11.5, color: YG.textMuted, lineHeight: 1.5 }}>
                    Başvurular{' '}
                    {turId === 'kurumlararasi'
                      ? 'yerleştirmeye esas puana (YKS %40 + AGNO %60)'
                      : 'YKS yerleştirme puanına'}{' '}
                    göre sıralanır; sınıf başına ilk sıradakiler asil, sonrakiler yedek yazılır.
                  </div>
                </div>
                <button
                  onClick={siralamayiUygula}
                  disabled={busy || kontenjanBos}
                  style={{
                    ...ygBtn(true),
                    opacity: busy || kontenjanBos ? 0.5 : 1,
                    cursor: busy || kontenjanBos ? 'not-allowed' : 'pointer',
                  }}
                >
                  {busy ? 'Uygulanıyor…' : 'Sıralamayı Uygula'}
                </button>
              </div>

              {/* Taban ÖSYM puanı — kurumun elle belirlediği asgari şart.
                  Altında kalan aday, sıralamada nerede olursa olsun
                  "uygun değil"dir ve kontenjanı işgal etmez. */}
              <div
                style={{
                  marginTop: 12,
                  paddingTop: 12,
                  borderTop: '1px solid ' + YG.border,
                  display: 'flex',
                  gap: 12,
                  flexWrap: 'wrap',
                  alignItems: 'flex-end',
                }}
              >
                <div style={{ width: 190 }}>
                  <label style={ygLabel}>Taban ÖSYM başarı puanı</label>
                  <input
                    value={osymEsik}
                    disabled={busy}
                    onChange={(e) => setOsymEsik(e.target.value.replace(/[^\d.,]/g, ''))}
                    placeholder="ör. 300"
                    style={ygInput}
                  />
                </div>
                <div
                  style={{
                    flex: '1 1 260px',
                    fontSize: 11.5,
                    color: YG.textMuted,
                    lineHeight: 1.5,
                  }}
                >
                  Adayın ÖSYM yerleştirme puanı bu değerin altındaysa başvuru <b>UYGUN DEĞİL</b>{' '}
                  olur ve kontenjana sayılmaz. Boş bırakılırsa bu kriter uygulanmaz.
                  {esikDisi.size > 0 && (
                    <>
                      {' '}
                      Şu an <b>{esikDisi.size}</b> başvuru bu eşiğin altında.
                    </>
                  )}
                </div>
              </div>

              {/* Kontenjan SINIF BAŞINA — 2. ve 3. sınıf için ayrı ilan edilir. */}
              <div style={{ marginTop: 12 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: YG.navy, marginBottom: 6 }}>
                  Sınıf başına kontenjan
                </div>
                {basvuruSiniflari.length === 0 ? (
                  <div style={{ fontSize: 11.5, color: YG.textMuted }}>
                    Henüz sınıf bilgisi olan başvuru yok.
                  </div>
                ) : (
                  <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                    {basvuruSiniflari.map((sf) => (
                      <div
                        key={sf}
                        style={{
                          border: '1px solid ' + YG.border,
                          borderRadius: 10,
                          padding: '10px 12px',
                          background: YG.bg,
                        }}
                      >
                        <div
                          style={{
                            fontSize: 11.5,
                            fontWeight: 800,
                            color: YG.navy,
                            marginBottom: 6,
                          }}
                        >
                          {sf}. sınıf
                          <span style={{ fontWeight: 600, color: YG.textMuted, marginLeft: 6 }}>
                            (
                            {
                              gorunen.filter((r) => String(r.basvurduguSinif || '').trim() === sf)
                                .length
                            }{' '}
                            başvuru)
                          </span>
                        </div>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <div style={{ width: 92 }}>
                            <label style={ygLabel}>Asil</label>
                            <input
                              value={(kontenjanlar[sf] || {}).asil || ''}
                              disabled={busy}
                              onChange={(e) => kontenjanYaz(sf, 'asil', e.target.value)}
                              placeholder="0"
                              style={ygInput}
                            />
                          </div>
                          <div style={{ width: 92 }}>
                            <label style={ygLabel}>Yedek</label>
                            <input
                              value={(kontenjanlar[sf] || {}).yedek || ''}
                              disabled={busy}
                              onChange={(e) => kontenjanYaz(sf, 'yedek', e.target.value)}
                              placeholder="0"
                              style={ygInput}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <div style={{ marginTop: 10, display: 'flex', justifyContent: 'flex-end' }}>
                  <button onClick={kriterKaydet} disabled={kriterKaydediliyor} style={ygBtn(false)}>
                    {kriterKaydediliyor ? 'Kaydediliyor…' : 'Kriterleri Kaydet'}
                  </button>
                </div>
              </div>
              <div style={{ fontSize: 11.5, color: YG.textMuted, marginTop: 8 }}>
                Bu bir <b>öneridir</b>: uygulandıktan sonra her satırın değerlendirmesini tek tek
                değiştirebilirsiniz. Puanı okunamayan başvurulara dokunulmaz.
              </div>
            </div>
          )}

          {/* Akademisyen: belge üretimi — tüm başvurular değerlendirilince açılır */}
          {isStaff && gorunen.length > 0 && (
            <div
              style={{
                ...ygCard,
                padding: '12px 16px',
                marginBottom: 14,
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                flexWrap: 'wrap',
              }}
            >
              <div style={{ flex: '1 1 260px', fontSize: 12.5, color: YG.textMuted }}>
                {belgeHazir ? (
                  <>
                    Tüm başvurular değerlendirildi.{' '}
                    <b style={{ color: YG.navy }}>{gorunen.length} başvuru</b> için değerlendirme
                    raporu üretilebilir.
                  </>
                ) : (
                  <>
                    <b style={{ color: YG.accent }}>{degerlendirilmemis} başvuru</b> henüz
                    değerlendirilmedi. Belge, tüm başvurular değerlendirildiğinde üretilebilir.
                  </>
                )}
              </div>
              <button
                onClick={belgeOlustur}
                disabled={!belgeHazir || belgeUretiliyor}
                title={belgeHazir ? '' : 'Önce tüm başvuruları değerlendirin'}
                style={{
                  ...ygBtn(belgeHazir),
                  opacity: belgeHazir ? 1 : 0.5,
                  cursor: belgeHazir ? 'pointer' : 'not-allowed',
                }}
              >
                {belgeUretiliyor ? 'Üretiliyor…' : 'Belge Oluştur'}
              </button>
              {uretilenBelge && (
                <button
                  onClick={async () => {
                    try {
                      if (window.belgeOtoYonlendir) await window.belgeOtoYonlendir(uretilenBelge);
                      setMsg('Rapor memura gönderildi.');
                      setTimeout(() => setMsg(''), 4000);
                    } catch (e) {
                      alert('Gönderilemedi: ' + e.message);
                    }
                  }}
                  style={ygBtn(false)}
                >
                  Memura Gönder
                </button>
              )}
            </div>
          )}

          {gorunen.length === 0 ? (
            <div
              style={{
                ...ygCard,
                border: '1px dashed ' + YG.border,
                padding: 44,
                textAlign: 'center',
                color: YG.textMuted,
                fontSize: 13.5,
                lineHeight: 1.6,
              }}
            >
              {isStudent
                ? 'Bu geçiş türünde henüz başvurunuz yok.'
                : 'Bu geçiş türünde başvuru bulunmuyor.'}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {gorunen.map((r) => (
                <YgBasvuruKarti
                  key={r.id || r._docId}
                  rec={r}
                  tur={tur}
                  isStaff={isStaff}
                  busy={busy}
                  currentUser={currentUser}
                  onDegerlendir={kaydetDegerlendirme}
                  onNumaraTanimla={numaraTanimla}
                  onDuzenle={basvuruDuzenle}
                  onEkYukle={ekYukle}
                  osymEsik={osymEsik}
                  onSilindi={yukle}
                  tabanKayitlari={tabanKayitlari}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

window.YatayGecisApp = YatayGecisApp;
