// ══════════════════════════════════════════════════════════════
// ÇAKÜ — BENİM SAYFAM (AKADEMİSYEN)
//
// Akademisyenin kendi sayfası. Öğrenci tarafıyla aynı yerleşim mantığı:
//   SOL   · kendi bilgileri, verdiği dersler (devamsızlık sınırıyla)
//   ORTA  · haftalık ders programı (lisans · yüksek lisans · doktora)
//   SAĞ   · öğrencilerden gelen randevu talepleri, bugünün dersleri
//
// Sütunların DIŞINDA, sayfanın ortasına açılan iki panel:
//   • Dijital Yoklama     — dersi seç, tam ekran dönen karekodu aç
//   • Görüşme Saatlerim   — ders programındaki boş saatleri randevuya aç
//
// ⚠ BU DOSYA KARAR VERMEZ, ÇİZER. Yoklama kodunun üretimi ve penceresi
// lib/yoklama.js'te, randevu kuralları lib/randevu.js'te, haftalık program
// lib/akademisyen-programi.js'tedir; hepsi test altındadır.
// ══════════════════════════════════════════════════════════════

import qrOlustur from 'qrcode-generator';

const { useState, useEffect, useMemo, useCallback, useRef } = React;

const AS_NAVY = '#1B2A4A';
const AS_GREEN = '#059669';
const AS_KART = {
  background: '#FFFFFF',
  border: '1px solid #E5E7EB',
  borderRadius: 12,
  padding: 18,
  boxShadow: '0 1px 3px rgba(16,24,40,0.06)',
};
const AS_BASLIK = {
  margin: '0 0 14px',
  fontSize: 16,
  fontWeight: 700,
  color: AS_NAVY,
  display: 'flex',
  alignItems: 'center',
  gap: 8,
};

const SEVIYELER = [
  { id: 'hepsi', etiket: 'Tümü' },
  { id: 'lisans', etiket: 'Lisans' },
  { id: 'yukseklisans', etiket: 'Yüksek Lisans' },
  { id: 'doktora', etiket: 'Doktora' },
];

const metin = (v) => String(v == null ? '' : v).trim();

/** Ders programı kaydının seviyesi hangi sekmeye düşer. */
function seviyeKovasi(seviye) {
  const s = metin(seviye).toLocaleLowerCase('tr');
  if (s === 'doktora') return 'doktora';
  if (s === 'yukseklisans' || s === 'yüksek lisans' || s === 'yl') return 'yukseklisans';
  if (s === 'lisansustu' || s === 'lisansüstü') return 'yukseklisans';
  return 'lisans';
}

/** Karekodu SVG olarak çizer — resim dosyası üretmeye gerek yok. */
function KarekodSVG({ veri, boyut }) {
  const yol = useMemo(() => {
    if (!veri) return null;
    // Tip 0 = otomatik sürüm; 'M' düzeltme seviyesi projeksiyonda yeterli
    // ve kodu gereksiz kalabalıklaştırmaz.
    const qr = qrOlustur(0, 'M');
    qr.addData(String(veri));
    qr.make();
    const n = qr.getModuleCount();
    const parcalar = [];
    for (let s = 0; s < n; s++) {
      for (let x = 0; x < n; x++) {
        if (qr.isDark(s, x)) parcalar.push('M' + x + ' ' + s + 'h1v1h-1z');
      }
    }
    return { d: parcalar.join(''), n };
  }, [veri]);

  if (!yol) return null;
  const kenar = boyut || 320;
  return (
    <svg
      width={kenar}
      height={kenar}
      viewBox={'0 0 ' + yol.n + ' ' + yol.n}
      shapeRendering="crispEdges"
      role="img"
      aria-label="Yoklama karekodu"
      style={{ display: 'block', background: '#fff' }}
    >
      <rect width={yol.n} height={yol.n} fill="#fff" />
      <path d={yol.d} fill="#0B1220" />
    </svg>
  );
}

// ══════════════════════════════════════════════════════════════
// TAM EKRAN YOKLAMA — projeksiyona yansıtılan ekran
//
// ⚠ KOD HER `ADIM_MS` MİLİSANİYEDE DEĞİŞİR. Ekran görüntüsünü alıp
// WhatsApp'a atan öğrencinin arkadaşının elinde kalan süre `TOLERANS_MS`
// kadardır. Geri sayım çubuğu bunu sınıfa da görünür kılar.
//
// ⚠ SAAT DÜZELTMESİ: kod, hocanın bilgisayarının saatiyle değil, oturum
// açılırken sunucudan gelen saate göre düzeltilmiş zamanla üretilir. Hocanın
// makinesi yirmi saniye ileriyse aksi hâlde sınıftaki HİÇBİR öğrenci yoklama
// veremezdi.
// ══════════════════════════════════════════════════════════════
function TamEkranYoklama({ oturum, saatFarki, ogrenciler, onKapat }) {
  const Y = window.YoklamaKurali || {};
  const [simdi, setSimdi] = useState(() => Date.now());
  const [katilimlar, setKatilimlar] = useState([]);
  const [elleDurumlar, setElleDurumlar] = useState({});
  const [listeAcik, setListeAcik] = useState(true);
  const [kapatiliyor, setKapatiliyor] = useState(false);

  // Kodun yeniden çizimi: saniyenin onda biri yeterli (geri sayım çubuğu
  // akıcı görünsün ama gereksiz iş yapmasın).
  useEffect(() => {
    const t = setInterval(() => setSimdi(Date.now()), 100);
    return () => clearInterval(t);
  }, []);

  // Canlı liste: kim okuttu. Üç saniyede bir yenilenir.
  useEffect(() => {
    if (!oturum?.id) return;
    let canli = true;
    const cek = async () => {
      try {
        const r = await fetch('/api/yoklama/oturum/' + encodeURIComponent(oturum.id), {
          credentials: 'include',
          headers: window.yoklamaBasliklari ? window.yoklamaBasliklari() : {},
        });
        if (!r.ok) return;
        const d = await r.json();
        if (canli && Array.isArray(d.katilimlar)) setKatilimlar(d.katilimlar);
      } catch (_) {
        /* ağ dalgalanması ekranı bozmasın */
      }
    };
    cek();
    const t = setInterval(cek, 3000);
    return () => {
      canli = false;
      clearInterval(t);
    };
  }, [oturum?.id]);

  // ESC ile çıkış — tam ekranda başka çıkış yolu görünmeyebilir.
  useEffect(() => {
    const esc = (e) => {
      if (e.key === 'Escape') onKapat(false);
    };
    document.addEventListener('keydown', esc);
    const eski = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', esc);
      document.body.style.overflow = eski;
    };
  }, [onKapat]);

  const duzeltilmis = Y.duzeltilmisZaman ? Y.duzeltilmisZaman(simdi, saatFarki) : simdi;
  const kod = Y.anlikKod ? Y.anlikKod(oturum.sirr, oturum.id, duzeltilmis, Y.ADIM_MS) : '';
  const kalan = Y.kalanOran ? Y.kalanOran(duzeltilmis, Y.ADIM_MS) : 1;

  const satirlar = useMemo(
    () =>
      Y.satirlariSirala
        ? Y.satirlariSirala(Y.yoklamaSatirlari(ogrenciler, katilimlar, elleDurumlar), true)
        : [],
    [Y, ogrenciler, katilimlar, elleDurumlar]
  );
  const ozet = Y.yoklamaOzeti ? Y.yoklamaOzeti(satirlar) : { toplam: 0, var: 0, yok: 0 };

  const durumDegistir = (no) => {
    setElleDurumlar((o) => {
      const sira = ['var', 'yok', 'izinli'];
      const suan = o[no] || (katilimlar.some((k) => metin(k.studentNumber) === no) ? 'var' : 'yok');
      const sonraki = sira[(sira.indexOf(suan) + 1) % sira.length];
      return { ...o, [no]: sonraki };
    });
  };

  const bitir = async () => {
    setKapatiliyor(true);
    try {
      await fetch('/api/yoklama/kapat', {
        method: 'POST',
        credentials: 'include',
        headers: Object.assign(
          { 'Content-Type': 'application/json' },
          window.yoklamaBasliklari ? window.yoklamaBasliklari() : {}
        ),
        body: JSON.stringify({ oturumId: oturum.id, elleDurumlar }),
      });
    } catch (e) {
      alert('Yoklama kapatılamadı: ' + (e.message || 'bilinmeyen hata'));
      setKapatiliyor(false);
      return;
    }
    onKapat(true);
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 6000,
        background: '#0B1220',
        color: '#fff',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: "'Inter', sans-serif",
      }}
    >
      {/* Üst şerit: ders adı · sayaç · çıkış */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
          padding: '14px 22px',
          borderBottom: '1px solid rgba(255,255,255,0.12)',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 18, fontWeight: 700 }}>
            {oturum.dersKodu ? oturum.dersKodu + ' — ' : ''}
            {oturum.dersAdi || 'Yoklama'}
          </div>
          <div style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.6)', marginTop: 2 }}>
            Karekod her {Math.round((Y.ADIM_MS || 6000) / 1000)} saniyede yenileniyor · ekran
            görüntüsü işe yaramaz
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <span
            style={{
              padding: '8px 16px',
              borderRadius: 999,
              background: 'rgba(16,185,129,0.16)',
              border: '1px solid rgba(16,185,129,0.4)',
              fontSize: 15,
              fontWeight: 800,
            }}
          >
            {ozet.var} / {ozet.toplam} okuttu
          </span>
          <button
            onClick={() => setListeAcik((a) => !a)}
            style={{
              padding: '8px 14px',
              borderRadius: 10,
              border: '1px solid rgba(255,255,255,0.24)',
              background: 'transparent',
              color: '#fff',
              fontSize: 13,
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            {listeAcik ? 'Listeyi gizle' : 'Listeyi göster'}
          </button>
          <button
            onClick={bitir}
            disabled={kapatiliyor}
            style={{
              padding: '8px 18px',
              borderRadius: 10,
              border: 'none',
              background: kapatiliyor ? '#4B5563' : '#DC2626',
              color: '#fff',
              fontSize: 13,
              fontWeight: 700,
              cursor: kapatiliyor ? 'default' : 'pointer',
              fontFamily: 'inherit',
            }}
          >
            {kapatiliyor ? 'Kapatılıyor…' : 'Yoklamayı Bitir'}
          </button>
        </div>
      </div>

      <div style={{ flex: 1, display: 'flex', minHeight: 0, flexWrap: 'wrap' }}>
        {/* Karekod — projeksiyonda okunacak kadar büyük */}
        <div
          style={{
            flex: '1 1 480px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 22,
            padding: 24,
            minWidth: 0,
          }}
        >
          <div style={{ padding: 18, background: '#fff', borderRadius: 18 }}>
            <KarekodSVG veri={kod} boyut={Math.min(440, Math.max(240, window.innerHeight - 320))} />
          </div>

          {/* Geri sayım: kodun ne kadar ömrü kaldı */}
          <div style={{ width: 'min(440px, 80vw)' }}>
            <div
              style={{
                height: 10,
                borderRadius: 999,
                background: 'rgba(255,255,255,0.14)',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  height: '100%',
                  width: Math.round(kalan * 100) + '%',
                  background: kalan > 0.3 ? '#10B981' : '#F59E0B',
                  transition: 'width 120ms linear',
                }}
              />
            </div>
            <p
              style={{
                margin: '10px 0 0',
                textAlign: 'center',
                fontSize: 13,
                color: 'rgba(255,255,255,0.6)',
              }}
            >
              Öğrenciler: <b style={{ color: '#fff' }}>Benim Sayfam → Dijital Yoklama</b> →
              &quot;Karekodu Okut&quot;
            </p>
          </div>
        </div>

        {/* Canlı liste */}
        {listeAcik && (
          <div
            style={{
              flex: '0 1 380px',
              minWidth: 300,
              borderLeft: '1px solid rgba(255,255,255,0.12)',
              display: 'flex',
              flexDirection: 'column',
              minHeight: 0,
            }}
          >
            <div
              style={{
                padding: '12px 18px',
                borderBottom: '1px solid rgba(255,255,255,0.1)',
                fontSize: 12.5,
                color: 'rgba(255,255,255,0.65)',
              }}
            >
              Okutmayanlar üstte. Bir satıra tıklayınca{' '}
              <b style={{ color: '#fff' }}>Var → Yok → İzinli</b> sırasıyla elle işaretlenir.
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '8px 10px' }}>
              {satirlar.length === 0 && (
                <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, padding: 12 }}>
                  Bu derse kayıtlı öğrenci listesi bulunamadı. Yoklama yine de alınır; okutan
                  öğrenciler burada görünür.
                </p>
              )}
              {satirlar.map((s) => {
                const g = (Y.YOKLAMA_DURUMLARI || {})[s.durum] || {};
                return (
                  <button
                    key={s.ogrenciNo}
                    type="button"
                    onClick={() => durumDegistir(s.ogrenciNo)}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      textAlign: 'left',
                      padding: '9px 12px',
                      marginBottom: 6,
                      borderRadius: 10,
                      border:
                        '1px solid ' +
                        (s.durum === 'yok' ? 'rgba(220,38,38,0.45)' : 'rgba(255,255,255,0.12)'),
                      background:
                        s.durum === 'yok' ? 'rgba(220,38,38,0.14)' : 'rgba(255,255,255,0.05)',
                      color: '#fff',
                      cursor: 'pointer',
                      fontFamily: 'inherit',
                    }}
                  >
                    <span
                      aria-hidden="true"
                      style={{
                        width: 24,
                        height: 24,
                        flexShrink: 0,
                        borderRadius: 7,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 800,
                        fontSize: 13,
                        background: g.renk || '#6B7280',
                      }}
                    >
                      {g.isaret || '?'}
                    </span>
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ display: 'block', fontSize: 13.5, fontWeight: 600 }}>
                        {s.ad}
                        {/* ⚠ Kayıtlı olmayan bir cihazdan verilen yoklama:
                            "arkadaşımın telefonundan verdim" tam olarak
                            böyle görünür. Engellenmez — sahibi telefon da
                            değiştirmiş olabilir — ama hoca görür. */}
                        {s.yeniCihaz && (
                          <span
                            title="Yoklama kayıtlı olmayan bir cihazdan verildi"
                            style={{
                              marginLeft: 7,
                              padding: '1px 7px',
                              borderRadius: 999,
                              background: 'rgba(245,158,11,0.22)',
                              border: '1px solid rgba(245,158,11,0.55)',
                              color: '#FCD34D',
                              fontSize: 10,
                              fontWeight: 800,
                            }}
                          >
                            yeni cihaz
                          </span>
                        )}
                      </span>
                      <span
                        style={{ display: 'block', fontSize: 11, color: 'rgba(255,255,255,0.5)' }}
                      >
                        {s.ogrenciNo}
                        {s.elle ? ' · elle işaretlendi' : ''}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

window.TamEkranYoklama = TamEkranYoklama;
window.KarekodSVG = KarekodSVG;
window.asSeviyeKovasi = seviyeKovasi;
window.AS_SEVIYELER = SEVIYELER;
window.AS_KART = AS_KART;
window.AS_BASLIK = AS_BASLIK;

// ══════════════════════════════════════════════════════════════
// ANA BİLEŞEN
// ══════════════════════════════════════════════════════════════
function AkademisyenSayfamApp({ currentUser, activeDepartment, departmentInfo }) {
  const R = window.RandevuKurali || {};
  const Y = window.YoklamaKurali || {};
  const SayfaDuzeni = window.AkademisyenSayfaDuzeni || {};
  const SekmeSeridi = window.SayfaSekmeSeridi;
  const Pencere = window.SayfaPenceresi;
  const benimAd = metin(currentUser?.identifier || currentUser?.name);
  const benimAnahtar = R.akademisyenAnahtari ? R.akademisyenAnahtari(benimAd) : '';

  const _resp = window.useResponsive ? window.useResponsive() : { width: 1200 };
  const sutunlar = window.sayfaSutunSablonu
    ? window.sayfaSutunSablonu(_resp.width)
    : '300px minmax(0, 1fr) 300px';
  const tekSutun = (window.sayfaSutunSayisi ? window.sayfaSutunSayisi(_resp.width) : 3) === 1;

  const [yukleniyor, setYukleniyor] = useState(true);
  const [hata, setHata] = useState('');
  const [profil, setProfil] = useState(null);
  const [dersler, setDersler] = useState([]);
  const [programDok, setProgramDok] = useState([]);
  const [bolumler, setBolumler] = useState([]);
  const [bolumAyarlari, setBolumAyarlari] = useState({});
  const [ogrenciler, setOgrenciler] = useState([]);
  const [randevular, setRandevular] = useState([]);
  const [musaitlikler, setMusaitlikler] = useState([]);
  const [yoklamaAyarlari, setYoklamaAyarlari] = useState({});
  const [oturumlar, setOturumlar] = useState([]);
  const [katilimKayitlari, setKatilimKayitlari] = useState([]);

  const [seviye, setSeviye] = useState('hepsi');
  // Aktif sekme ('genel' | 'yoklama' | 'gorusme' | 'veri'). Kural ve yetki
  // koşulları lib/akademisyen-sayfam-duzeni.js'te.
  const [sekme, setSekme] = useState('genel');
  const [tamEkran, setTamEkran] = useState(null); // { oturum, saatFarki, ogrenciler }
  const [tazele, setTazele] = useState(0);

  const donem =
    window.donemEtiketi && window.donemEtiketi(new Date()) === 'Bahar' ? 'bahar' : 'guz';

  // ── Veri yükleme ──
  const yukle = useCallback(async () => {
    if (!benimAd) {
      setYukleniyor(false);
      return;
    }
    setYukleniyor(true);
    setHata('');
    try {
      const [profs, ders, prog, bol, ogr, rnd, ayar, otr, kyt] = await Promise.all([
        window.apiRead('professors').catch(() => []),
        window.apiRead('sinav_dersler').catch(() => []),
        window.apiRead('course_schedules').catch(() => []),
        window.apiRead('departments').catch(() => []),
        window.apiRead('students').catch(() => []),
        window.apiRead('randevu_talepleri').catch(() => []),
        window.apiRead('yoklama_ayarlari').catch(() => []),
        window.apiRead('yoklama_oturumlari').catch(() => []),
        window.apiRead('yoklama_kayitlari').catch(() => []),
      ]);

      const esit = (a, b) =>
        (R.akademisyenAnahtari ? R.akademisyenAnahtari(a) : metin(a)) ===
        (R.akademisyenAnahtari ? R.akademisyenAnahtari(b) : metin(b));

      setProfil((profs || []).find((p) => esit(p.name, benimAd)) || null);
      // Derslerim: eğitmen eşleşmesi lib/ders-egitmenleri.js'te (çok
      // eğitmenli ders ve unvan farkı orada çözülür).
      setDersler(
        (ders || []).filter((d) =>
          window.dersEgitmeniMi ? window.dersEgitmeniMi(d, benimAd) : esit(d.instructor, benimAd)
        )
      );
      setProgramDok(Array.isArray(prog) ? prog : []);
      const bolListe = Array.isArray(bol) ? bol.slice() : [];
      (window.DEPARTMENTS || []).forEach((d) => bolListe.push(d));
      setBolumler(bolListe);
      setOgrenciler(Array.isArray(ogr) ? ogr : []);
      setRandevular((rnd || []).filter((r) => esit(r.akademisyen, benimAd)));

      const ayarHarita = {};
      (ayar || []).forEach((a) => {
        const k = metin(a.dersId || a.id);
        if (k) ayarHarita[k] = a;
      });
      setYoklamaAyarlari(ayarHarita);
      setOturumlar((otr || []).filter((o) => esit(o.akademisyen, benimAd)));
      setKatilimKayitlari(Array.isArray(kyt) ? kyt : []);

      if (window.apiReadDoc && benimAnahtar) {
        const res = await window.apiReadDoc('gorusme_saatleri', benimAnahtar).catch(() => null);
        const doc = res && res.exists ? res.data : null;
        setMusaitlikler(Array.isArray(doc && doc.slotlar) ? doc.slotlar : []);
      }
    } catch (e) {
      setHata(e?.message || 'Sayfa yüklenemedi.');
    } finally {
      setYukleniyor(false);
    }
  }, [benimAd, benimAnahtar, R]);

  useEffect(() => {
    yukle();
  }, [yukle, tazele]);

  // Yetkiler (ders listesi, akademisyen kaydı) asenkron geliyor; kapalı bir
  // sekmede takılı kalınmaz.
  useEffect(() => {
    if (!SayfaDuzeni.sekmeDuzelt) return;
    const hedef = SayfaDuzeni.sekmeDuzelt(sekme, {
      ders: dersler.length > 0,
      akademisyen: !!profil,
    });
    if (hedef !== sekme) setSekme(hedef);
  }, [SayfaDuzeni, sekme, dersler.length, profil]);

  useEffect(() => {
    if (window.bolumAyarlariniYukle) {
      window.bolumAyarlariniYukle().then((h) => setBolumAyarlari(h || {}));
    }
  }, []);

  // ── Haftalık program ──
  // Saat etiketi bölüme VE seviyeye göre değişir; hazır hesap
  // lib/akademisyen-programi.js'te (AkademisyenProgramModal ile aynı kural).
  const bolumSaatleri = useMemo(() => {
    const harita = {};
    (bolumler || []).forEach((b) => {
      const kimlikler = [b.id, b._id, b._docId, b.code].filter(Boolean).map(String);
      const kanon = kimlikler[0];
      const coz = window.bolumSaatleri;
      if (!coz) return;
      const lisans = coz(bolumAyarlari[kanon], 'lisans');
      const ustu = coz(bolumAyarlari[kanon], 'lisansustu');
      kimlikler.forEach((k) => {
        if (!harita[k + '|lisans']) harita[k + '|lisans'] = lisans;
        ['lisansustu', 'yukseklisans', 'doktora'].forEach((sv) => {
          if (!harita[k + '|' + sv]) harita[k + '|' + sv] = ustu;
        });
        if (!harita[k]) harita[k] = ustu.length >= lisans.length ? ustu : lisans;
      });
    });
    return harita;
  }, [bolumler, bolumAyarlari]);

  const tumKayitlar = useMemo(
    () =>
      window.akademisyenKayitlari
        ? window.akademisyenKayitlari(programDok, {
            ad: benimAd,
            donem,
            bolumler,
            bolumSaatleri,
          })
        : [],
    [programDok, benimAd, donem, bolumler, bolumSaatleri]
  );

  const kayitlar = useMemo(
    () =>
      seviye === 'hepsi'
        ? tumKayitlar
        : tumKayitlar.filter((k) => seviyeKovasi(k.seviye) === seviye),
    [tumKayitlar, seviye]
  );

  const { izgara, doluSaatler, cakismalar, ozet } = useMemo(
    () =>
      window.programIzgarasi
        ? window.programIzgarasi(kayitlar)
        : { izgara: {}, doluSaatler: [], cakismalar: [], ozet: {} },
    [kayitlar]
  );

  // Görüşme saatleri TÜM program üzerinden hesaplanır: seviye sekmesi
  // yalnız görünümü süzer, hocanın doktora dersi olan saat boş sayılmamalı.
  const { izgara: tamIzgara, doluSaatler: tamDolu } = useMemo(
    () =>
      window.programIzgarasi
        ? window.programIzgarasi(tumKayitlar)
        : { izgara: {}, doluSaatler: [] },
    [tumKayitlar]
  );

  // ⚠ Görüşme ızgarasının ekseni DOLU saatler olamaz: görüşme saati tanımı
  // gereği boş bir saattir. Hafta boyunca hiç dersi olmayan bir saat
  // (ör. 15:15) ızgarada satır bile açmaz, hoca o saati açamazdı.
  const tamSaatler = useMemo(
    () =>
      R.gorusmeEkseni
        ? R.gorusmeEkseni(tumKayitlar, bolumSaatleri, tamDolu, window.PROGRAM_SAATLERI)
        : tamDolu,
    [R, tumKayitlar, bolumSaatleri, tamDolu]
  );

  const seviyeSayilari = useMemo(() => {
    const s = { hepsi: tumKayitlar.length, lisans: 0, yukseklisans: 0, doktora: 0 };
    tumKayitlar.forEach((k) => {
      s[seviyeKovasi(k.seviye)] += 1;
    });
    return s;
  }, [tumKayitlar]);

  // ── Bugünün dersleri ──
  const bugunAdi = (window.PROGRAM_GUNLERI || [])[(new Date().getDay() + 6) % 7] || '';
  const bugunkuDersler = useMemo(
    () =>
      tumKayitlar
        .filter((k) => k.gun === bugunAdi)
        .slice()
        .sort((a, b) => metin(a.saat).localeCompare(metin(b.saat), 'tr')),
    [tumKayitlar, bugunAdi]
  );

  // ── Randevular ──
  const bekleyenler = useMemo(
    () =>
      R.randevulariSirala
        ? R.randevulariSirala(R.randevulariSuz(randevular, { durumlar: ['bekliyor'] }))
        : [],
    [R, randevular]
  );
  const onaylilar = useMemo(
    () =>
      R.randevulariSirala
        ? R.randevulariSirala(R.randevulariSuz(randevular, { durumlar: ['onaylandi'] }))
        : [],
    [R, randevular]
  );
  const randevuOzeti = R.talepOzeti ? R.talepOzeti(randevular) : { bekliyor: 0 };
  const cakisanlar = useMemo(
    () => (R.cakisanRandevular ? R.cakisanRandevular(randevular, tamIzgara) : []),
    [R, randevular, tamIzgara]
  );

  const randevuKarar = async (kayit, durum) => {
    try {
      await window.DBWriteGenel('randevu_talepleri', metin(kayit.id || kayit._docId), {
        durum,
        kararZamani: new Date().toISOString(),
      });
      setTazele((t) => t + 1);
    } catch (e) {
      alert('Randevu güncellenemedi: ' + (e.message || 'bilinmeyen hata'));
    }
  };

  // ── Bir dersin öğrencileri ──
  const dersinOgrencileri = useCallback(
    (dersId) => {
      const k = metin(dersId);
      return (ogrenciler || [])
        .filter((o) =>
          Array.isArray(o.myCourseIds) ? o.myCourseIds.map(String).includes(k) : false
        )
        .map((o) => ({
          studentNumber: metin(o.studentNumber),
          adSoyad: [o.firstName, o.lastName].filter(Boolean).join(' '),
        }));
    },
    [ogrenciler]
  );

  // ── Devamsızlık tablosu (ders başına) ──
  const dersDevamsizligi = useCallback(
    (ders) => {
      const dersId = metin(ders.id || ders._docId);
      const ayar = yoklamaAyarlari[dersId] || {};
      const limitSaat = Number(ayar.limitSaat) || 0;
      const dersSaati = Number(ayar.dersSaati) || Number(ders.saat) || 1;
      const acilan = oturumlar.filter((o) => metin(o.dersId) === dersId && !o.acik).length;
      const kendi = katilimKayitlari.filter((k) => metin(k.dersId) === dersId);
      const sayac = new Map();
      kendi.forEach((k) => {
        if (k.durum !== 'var' && k.durum !== 'izinli') return;
        const no = metin(k.studentNumber);
        sayac.set(no, (sayac.get(no) || 0) + 1);
      });
      return dersinOgrencileri(dersId)
        .map((o) => ({
          ...o,
          durum: Y.devamsizlikDurumu
            ? Y.devamsizlikDurumu({
                acilanYoklama: acilan,
                katildigi: sayac.get(o.studentNumber) || 0,
                limitSaat,
                dersSaati,
              })
            : null,
        }))
        .sort((a, b) => {
          const fa = a.durum ? a.durum.kacirilanSaat : 0;
          const fb = b.durum ? b.durum.kacirilanSaat : 0;
          return fb - fa || String(a.adSoyad).localeCompare(String(b.adSoyad), 'tr');
        });
    },
    [yoklamaAyarlari, oturumlar, katilimKayitlari, dersinOgrencileri, Y]
  );

  // ── Yoklama başlat ──
  const yoklamaBaslat = async (ders) => {
    const dersId = metin(ders.id || ders._docId);
    try {
      const r = await fetch('/api/yoklama/oturum', {
        method: 'POST',
        credentials: 'include',
        headers: Object.assign(
          { 'Content-Type': 'application/json' },
          window.yoklamaBasliklari ? window.yoklamaBasliklari() : {}
        ),
        body: JSON.stringify({
          dersId,
          dersKodu: metin(ders.code || ders.kod),
          dersAdi: metin(ders.name || ders.ad),
          dersSaati: Number((yoklamaAyarlari[dersId] || {}).dersSaati) || Number(ders.saat) || 1,
          departmentId: metin(ders.departmentId || activeDepartment),
        }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Yoklama açılamadı.');
      setTamEkran({
        oturum: d.oturum,
        // ⚠ Sunucu saatiyle aramızdaki fark. Hocanın makinesi ileri/geriyse
        // kod yine de sunucunun kabul edeceği pencerede üretilir.
        saatFarki: Number(d.sunucuZamani) - Date.now(),
        ogrenciler: dersinOgrencileri(dersId),
      });
    } catch (e) {
      alert(e.message || 'Yoklama açılamadı.');
    }
  };

  const limitKaydet = async (ders, limitSaat, dersSaati) => {
    const dersId = metin(ders.id || ders._docId);
    try {
      await window.DBWriteGenel(
        'yoklama_ayarlari',
        dersId,
        {
          dersId,
          dersKodu: metin(ders.code || ders.kod),
          dersAdi: metin(ders.name || ders.ad),
          limitSaat: Math.max(0, Number(limitSaat) || 0),
          dersSaati: Math.max(1, Number(dersSaati) || 1),
        },
        true
      );
      setTazele((t) => t + 1);
    } catch (e) {
      alert('Sınır kaydedilemedi: ' + (e.message || 'bilinmeyen hata'));
    }
  };

  /**
   * Kendi bilgilerini kaydeder.
   * ⚠ AYNI KAYIT: Bölüm Yönetimi → Akademisyenler ekranı da `professors`
   * dokümanının bu alanlarını yazıyor. Alan listesi lib/akademisyen-bilgi.js
   * içinde tek yerde; iki ekran ayrışmasın diye.
   */
  const bilgiKaydet = async (form) => {
    const B = window.AkademisyenBilgi;
    const profId = metin(profil?.id || profil?._docId);
    if (!profId) {
      alert('Akademisyen kaydınız bulunamadı; bilgileriniz kaydedilemiyor.');
      return false;
    }
    const temiz = B ? B.bilgiNormalle(form) : form;
    try {
      await window.DBWriteGenel(
        'professors',
        profId,
        // ⚠ Boşaltılan alan da YAZILMALI. `bilgiNormalle` boş alanları
        // atıyor; yalnız onu göndersek silinen dahili eski değeriyle kalırdı
        // (merge yazma alanı düşürmez).
        Object.assign({ email: '', dahili: '', photoURL: '' }, temiz, {
          updatedAt: new Date().toISOString(),
        }),
        true
      );
      setTazele((t) => t + 1);
      return true;
    } catch (e) {
      alert('Bilgiler kaydedilemedi: ' + (e.message || 'bilinmeyen hata'));
      return false;
    }
  };

  /**
   * Öğrencinin cihaz kaydını sıfırlar.
   * Telefonunu değiştiren ya da dönemlik cihaz hakkını tüketen öğrenci
   * aksi hâlde yoklama veremez hâle gelir.
   */
  const cihazSifirla = async (ogrenciNo, adSoyad) => {
    const kim = metin(adSoyad) || metin(ogrenciNo);
    if (!window.confirm(kim + ' için cihaz kaydı sıfırlansın mı? Yeni cihazdan yoklama verebilir.'))
      return;
    try {
      const r = await fetch('/api/yoklama/cihaz-sifirla', {
        method: 'POST',
        credentials: 'include',
        headers: Object.assign(
          { 'Content-Type': 'application/json' },
          window.yoklamaBasliklari ? window.yoklamaBasliklari() : {}
        ),
        body: JSON.stringify({ studentNumber: metin(ogrenciNo) }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || 'Sıfırlanamadı.');
      alert(d.mesaj || 'Cihaz kaydı sıfırlandı.');
    } catch (e) {
      alert('Cihaz kaydı sıfırlanamadı: ' + (e.message || 'bilinmeyen hata'));
    }
  };

  const musaitlikDegistir = async (anahtar) => {
    const yeni = musaitlikler.includes(anahtar)
      ? musaitlikler.filter((x) => x !== anahtar)
      : musaitlikler.concat(anahtar);
    setMusaitlikler(yeni);
    try {
      await window.DBWriteGenel(
        'gorusme_saatleri',
        benimAnahtar,
        { akademisyen: benimAd, slotlar: yeni },
        true
      );
    } catch (e) {
      setMusaitlikler(musaitlikler); // geri al
      alert('Görüşme saati kaydedilemedi: ' + (e.message || 'bilinmeyen hata'));
    }
  };

  // ══════════════════════════════════════════════════════════════
  if (!benimAd) {
    return (
      <div style={{ padding: 40, textAlign: 'center', fontFamily: "'Inter', sans-serif" }}>
        <h2 style={{ color: '#DC2626', fontSize: 20, marginBottom: 8 }}>Erişim Reddedildi</h2>
        <p style={{ color: '#6B7280' }}>Bu sayfa akademisyen hesaplarına açıktır.</p>
      </div>
    );
  }

  if (yukleniyor) {
    return (
      <div style={{ padding: 60, textAlign: 'center', fontFamily: "'Inter', sans-serif" }}>
        <div
          style={{
            width: 40,
            height: 40,
            margin: '0 auto 16px',
            border: '3px solid #E5E7EB',
            borderTopColor: AS_GREEN,
            borderRadius: '50%',
            animation: 'as-spin 0.8s linear infinite',
          }}
        />
        <p style={{ color: '#6B7280' }}>Sayfa yükleniyor…</p>
        <style>{'@keyframes as-spin { to { transform: rotate(360deg); } }'}</style>
      </div>
    );
  }

  const sekmeler = SayfaDuzeni.sekmeSeridi
    ? SayfaDuzeni.sekmeSeridi(
        { ders: dersler.length > 0, akademisyen: !!profil },
        {
          dersSaati: ozet?.dersSaati || 0,
          dersSayisi: dersler.length,
          acikSaat: musaitlikler.length,
          yil: new Date().getFullYear(),
        }
      )
    : [];

  return (
    <div style={{ fontFamily: "'Inter', sans-serif", color: '#191C1E' }}>
      {/* ══ SEKME ŞERİDİ ══
          Öğrenci tarafıyla AYNI bileşen (shared-components → SayfaSekmeSeridi);
          iki sayfa birbirine benzemeyi koddan alsın diye. Sayfanın adını ve
          kullanıcının adını yazan başlık kaldırıldı: ikisi de üst menüde ve
          soldaki kartta zaten yazıyordu. */}
      {SekmeSeridi ? (
        <SekmeSeridi
          sekmeler={sekmeler}
          aktif={sekme}
          // Açık sekmeye tekrar basmak pencereyi kapatır; Genel Bakış zaten
          // sayfanın kendisi olduğu için ona basmak yalnız pencereyi kapatır.
          onSec={(id) => setSekme(id === sekme && id !== 'genel' ? 'genel' : id)}
        />
      ) : null}

      {hata && (
        <div
          style={{
            ...AS_KART,
            borderColor: '#FCA5A5',
            background: '#FEF2F2',
            color: '#B91C1C',
            marginBottom: 16,
            fontSize: 13,
          }}
        >
          {hata}
        </div>
      )}

      {/* ══ GENEL BAKIŞ ══ */}
      {sekme === 'genel' && (
        <div
          style={{ display: 'grid', gridTemplateColumns: sutunlar, gap: 16, alignItems: 'start' }}
        >
          {/* SOL: Akademisyen bilgileri
              ⚠ "Derslerim" kartı kaldırıldı: verdiği dersler Dijital Yoklama
              penceresinde ders ders listeleniyor ve yoklama oradan
              başlatılıyor. Aynı listeyi iki yerde tutmak ikisinin
              ayrışmasına davetiye. */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, minWidth: 0 }}>
            <ASBilgiKarti
              profil={profil}
              ad={benimAd}
              ozet={ozet}
              departmentInfo={departmentInfo}
              onKaydet={bilgiKaydet}
            />
          </div>

          {/* ORTA: Ders programı */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, minWidth: 0 }}>
            <ASProgram
              seviye={seviye}
              setSeviye={setSeviye}
              sayilar={seviyeSayilari}
              izgara={izgara}
              saatler={doluSaatler}
              cakismalar={cakismalar}
              donem={donem}
              ad={benimAd}
              unvan={metin(profil?.title)}
            />
          </div>

          {/* SAĞ: Randevu talepleri · Bugün */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, minWidth: 0 }}>
            <ASRandevular
              bekleyenler={bekleyenler}
              onaylilar={onaylilar}
              ozet={randevuOzeti}
              cakisanlar={cakisanlar}
              onKarar={randevuKarar}
            />
            <ASBugun gun={bugunAdi} dersler={bugunkuDersler} />
          </div>
        </div>
      )}

      {/* ══ AÇILIR PENCERELER ══
          Öğrenci tarafındaki gibi: sekme tıklanınca sayfanın ortasına açılan
          pencere. Genişlik içeriğe göre esner ve ekranı taşmaz — geniş içerik
          pencerenin İÇİNDE kayar (bkz. shared-components → SayfaPenceresi). */}
      {Pencere && sekme === 'yoklama' && (
        <Pencere
          baslik="Dijital Yoklama"
          altBaslik="Dersi seçin, karekod tam ekran açılır"
          enCokGenislik={1080}
          onKapat={() => setSekme('genel')}
        >
          <ASYoklamaPaneli
            dersler={dersler}
            ayarlar={yoklamaAyarlari}
            oturumlar={oturumlar}
            devamsizlik={dersDevamsizligi}
            onBaslat={yoklamaBaslat}
            onLimit={limitKaydet}
            onCihazSifirla={cihazSifirla}
          />
        </Pencere>
      )}

      {Pencere && sekme === 'gorusme' && (
        <Pencere
          baslik="Görüşme Saatlerim"
          altBaslik="Boş saatlere tıklayın; öğrenciler bu saatlere randevu isteyebilir"
          enCokGenislik={1000}
          onKapat={() => setSekme('genel')}
        >
          <ASGorusmePaneli
            izgara={tamIzgara}
            saatler={tamSaatler}
            musaitlikler={musaitlikler}
            onDegistir={musaitlikDegistir}
          />
        </Pencere>
      )}

      {/* Veri Girişi performans modülünden taşındı; ekran KOPYALANMADI, aynı
          bileşen gömülü kipte çiziliyor. Modül ilk açılışta indiriliyor:
          gösterge tablosu büyük, bu sekmeye girmeyene yüklenmesinin anlamı
          yok. Tablo on iki aylık olduğu için pencere en geniş sınırı alır ve
          taşma pencerenin içinde kalır. */}
      {Pencere && sekme === 'veri' && (
        <Pencere
          baslik="Veri Girişi"
          altBaslik="Performans göstergeleri"
          enCokGenislik={1360}
          onKapat={() => setSekme('genel')}
        >
          <ASVeriGirisi
            currentUser={currentUser}
            activeDepartment={activeDepartment}
            departmentInfo={departmentInfo}
          />
        </Pencere>
      )}

      {tamEkran && (
        <TamEkranYoklama
          oturum={tamEkran.oturum}
          saatFarki={tamEkran.saatFarki}
          ogrenciler={tamEkran.ogrenciler}
          onKapat={(bitti) => {
            setTamEkran(null);
            if (bitti) setTazele((t) => t + 1);
          }}
        />
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// VERİ GİRİŞİ SEKMESİ
//
// Performans modülünün veri giriş ekranı, gömülü kipte. Modül ağır
// (gösterge tanımları + on iki aylık tablo); sekmeye girilene kadar
// indirilmiyor.
// ══════════════════════════════════════════════════════════════
function ASVeriGirisi({ currentUser, activeDepartment, departmentInfo }) {
  const [Bilesen, setBilesen] = useState(() => window.PerformansBilgileriApp || null);
  const [hata, setHata] = useState('');

  useEffect(() => {
    if (Bilesen) return;
    let canli = true;
    import('./performans_bilgileri_modul.jsx')
      .then((m) => {
        if (!canli) return;
        const c = m.default || window.PerformansBilgileriApp;
        if (c) setBilesen(() => c);
        else setHata('Performans modülü yüklendi ama bileşen bulunamadı.');
      })
      .catch((e) => canli && setHata('Veri giriş ekranı yüklenemedi: ' + (e.message || '')));
    return () => {
      canli = false;
    };
  }, [Bilesen]);

  if (hata) {
    return (
      <div style={{ ...AS_KART, borderColor: '#FCA5A5', background: '#FEF2F2', color: '#B91C1C' }}>
        {hata}
      </div>
    );
  }
  if (!Bilesen) {
    return (
      <div style={{ ...AS_KART, textAlign: 'center', color: '#6B7280', fontSize: 13 }}>
        Veri giriş ekranı yükleniyor…
      </div>
    );
  }
  return (
    <div>
      <Bilesen
        currentUser={currentUser}
        activeDepartment={activeDepartment}
        departmentInfo={departmentInfo}
        gomulu
      />
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// SOL SÜTUN — Akademisyen bilgileri
// ══════════════════════════════════════════════════════════════
function ASBilgiKarti({ profil, ad, ozet, departmentInfo, onKaydet }) {
  const B = window.AkademisyenBilgi || {};
  const p = profil || {};
  const [duzenle, setDuzenle] = useState(false);
  const [form, setForm] = useState({});
  const [hatalar, setHatalar] = useState({});
  const [kaydediliyor, setKaydediliyor] = useState(false);
  const [yukleniyor, setYukleniyor] = useState(false);
  const dosyaRef = useRef(null);

  const kipeGec = (ac) => {
    if (ac) {
      setForm({
        email: metin(p.email),
        dahili: metin(p.dahili),
        photoURL: metin(p.photoURL),
      });
      setHatalar({});
    }
    setDuzenle(ac);
  };

  const alanYaz = (anahtar, deger) => {
    const v = B.alanSuzgeci ? B.alanSuzgeci(anahtar, deger) : deger;
    setForm((f) => ({ ...f, [anahtar]: v }));
    setHatalar((h) => {
      const y = { ...h };
      delete y[anahtar];
      return y;
    });
  };

  const fotoSec = async (e) => {
    const dosya = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!dosya) return;
    if (!/^image\/(png|jpe?g)$/i.test(dosya.type)) {
      alert('Yalnızca PNG veya JPEG yükleyebilirsiniz.');
      return;
    }
    setYukleniyor(true);
    try {
      const fd = new FormData();
      fd.append('folder', 'akademisyen/foto');
      fd.append('file', dosya);
      const r = await fetch('/api/files/upload?folder=' + encodeURIComponent('akademisyen/foto'), {
        method: 'POST',
        body: fd,
        credentials: 'include',
      });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      const j = await r.json();
      alanYaz('photoURL', j.downloadURL || '');
    } catch (err) {
      alert('Fotoğraf yüklenemedi: ' + (err.message || 'bilinmeyen hata'));
    } finally {
      setYukleniyor(false);
    }
  };

  const kaydet = async () => {
    const h = B.bilgiHatalari ? B.bilgiHatalari(form) : {};
    if (Object.keys(h).length > 0) {
      setHatalar(h);
      return;
    }
    setKaydediliyor(true);
    const ok = await onKaydet(form);
    setKaydediliyor(false);
    if (ok) setDuzenle(false);
  };
  const bashar = metin(ad)
    .split(/\s+/)
    .filter((x) => !/^(prof\.?|doç\.?|dr\.?|öğr\.?|gör\.?|arş\.?|üyesi)$/i.test(x))
    .slice(0, 2)
    .map((x) => x.charAt(0))
    .join('')
    .toLocaleUpperCase('tr');

  // Adın içinde zaten geçen unvan ikinci kez yazılmaz.
  const tamAd = metin(p.name) || metin(ad);
  const unvanHam = metin(p.title) || metin(p.unvan);
  const kucuk = tamAd.toLocaleLowerCase('tr');
  const unvanSatiri = unvanHam && !kucuk.includes(unvanHam.toLocaleLowerCase('tr')) ? unvanHam : '';

  const satir = (etiket, deger) =>
    deger ? (
      <div style={{ marginBottom: 10 }}>
        <div style={{ fontSize: 11, color: '#9CA3AF', fontWeight: 600 }}>{etiket}</div>
        <div style={{ fontSize: 13, color: '#111827', fontWeight: 600, wordBreak: 'break-word' }}>
          {deger}
        </div>
      </div>
    ) : null;

  return (
    <div style={AS_KART}>
      <div
        style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 16 }}
      >
        {p.photoURL ? (
          <img
            src={p.photoURL}
            alt=""
            style={{
              width: 80,
              height: 80,
              borderRadius: '50%',
              objectFit: 'cover',
              marginBottom: 10,
            }}
          />
        ) : (
          <div
            style={{
              width: 80,
              height: 80,
              borderRadius: '50%',
              marginBottom: 10,
              background: AS_NAVY,
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 26,
              fontWeight: 700,
            }}
          >
            {bashar || '·'}
          </div>
        )}
        {/* ⚠ Unvan ada YAPIŞTIRILMAZ: kayıtlarda ad çoğu zaman zaten unvanlı
            geliyor ("Dr. Öğr. Üyesi Ayşe İnanç") ve başına bir kez daha
            eklenince "Dr. Öğr. Üyesi Dr. Öğr. Üyesi Ayşe İnanç" çıkıyordu.
            Unvan ayrı satırda, yalnız adın içinde geçmiyorsa. */}
        <div style={{ fontSize: 16, fontWeight: 700, color: AS_NAVY, textAlign: 'center' }}>
          {metin(p.name) || ad}
        </div>
        {unvanSatiri && (
          <div style={{ fontSize: 12, color: '#6B7280', marginTop: 3 }}>{unvanSatiri}</div>
        )}
      </div>

      {/* ── İletişim bilgileri ──
          ⚠ Bu alanlar Bölüm Yönetimi → Akademisyenler ekranıyla AYNI kayda
          (`professors`) yazar. Akademisyen kendi kartından günceller, bölüm
          yetkilisi de oradan; ikisi de aynı değeri görür. Öğrencinin
          "Danışman Bilgileri" kartında görünen de budur. */}
      <div style={{ borderTop: '1px solid #F3F4F6', paddingTop: 14 }}>
        {!duzenle ? (
          <>
            {satir('Birim', departmentInfo?.name || metin(p.departmentId))}
            {satir('E-posta', metin(p.email))}
            {satir('Dahili', metin(p.dahili))}
            <p style={{ margin: '4px 0 10px', fontSize: 11, color: '#9CA3AF', lineHeight: 1.6 }}>
              {B.bilgiOzetMetni ? B.bilgiOzetMetni(p) : ''}
            </p>
            <button
              onClick={() => kipeGec(true)}
              disabled={!onKaydet}
              title={
                onKaydet
                  ? 'E-posta, dahili ve fotoğrafınızı güncelleyin'
                  : 'Akademisyen kaydınız bulunamadı'
              }
              style={{
                width: '100%',
                padding: '8px 14px',
                borderRadius: 9,
                border: '1px solid #D1D5DB',
                background: '#fff',
                color: AS_NAVY,
                fontSize: 12.5,
                fontWeight: 600,
                cursor: onKaydet ? 'pointer' : 'not-allowed',
                fontFamily: 'inherit',
                opacity: onKaydet ? 1 : 0.5,
              }}
            >
              Bilgilerimi düzenle
            </button>
          </>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {satir('Birim', departmentInfo?.name || metin(p.departmentId))}
            {(B.BILGI_ALANLARI || [])
              .filter((a) => a.tur !== 'gorsel')
              .map((a) => (
                <label
                  key={a.anahtar}
                  style={{ fontSize: 11.5, color: '#6B7280', fontWeight: 600 }}
                >
                  {a.etiket}
                  <input
                    value={form[a.anahtar] || ''}
                    onChange={(e) => alanYaz(a.anahtar, e.target.value)}
                    placeholder={a.ipucu}
                    style={{
                      display: 'block',
                      width: '100%',
                      marginTop: 4,
                      padding: '8px 10px',
                      borderRadius: 8,
                      border: '1px solid ' + (hatalar[a.anahtar] ? '#FCA5A5' : '#D1D5DB'),
                      fontSize: 13,
                      fontFamily: 'inherit',
                      boxSizing: 'border-box',
                    }}
                  />
                  {hatalar[a.anahtar] ? (
                    <span
                      style={{ display: 'block', fontSize: 11, color: '#B91C1C', marginTop: 3 }}
                    >
                      {hatalar[a.anahtar]}
                    </span>
                  ) : (
                    <span
                      style={{ display: 'block', fontSize: 10.5, color: '#9CA3AF', marginTop: 3 }}
                    >
                      {a.aciklama}
                    </span>
                  )}
                </label>
              ))}

            <div>
              <span style={{ fontSize: 11.5, color: '#6B7280', fontWeight: 600 }}>Fotoğraf</span>
              <div style={{ display: 'flex', gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
                <button
                  onClick={() => dosyaRef.current && dosyaRef.current.click()}
                  disabled={yukleniyor}
                  style={{
                    padding: '7px 12px',
                    borderRadius: 8,
                    border: '1px solid #D1D5DB',
                    background: '#fff',
                    color: AS_NAVY,
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: yukleniyor ? 'default' : 'pointer',
                    fontFamily: 'inherit',
                  }}
                >
                  {yukleniyor ? 'Yükleniyor…' : metin(form.photoURL) ? 'Değiştir' : 'Yükle'}
                </button>
                {metin(form.photoURL) && (
                  <button
                    onClick={() => alanYaz('photoURL', '')}
                    style={{
                      padding: '7px 12px',
                      borderRadius: 8,
                      border: '1px solid #FCA5A5',
                      background: '#fff',
                      color: '#B91C1C',
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: 'pointer',
                      fontFamily: 'inherit',
                    }}
                  >
                    Kaldır
                  </button>
                )}
              </div>
              <input
                ref={dosyaRef}
                type="file"
                accept="image/png,image/jpeg"
                onChange={fotoSec}
                style={{ display: 'none' }}
              />
            </div>

            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
              <button
                onClick={kaydet}
                disabled={kaydediliyor}
                style={{
                  flex: 1,
                  padding: '9px 14px',
                  borderRadius: 9,
                  border: 'none',
                  background: kaydediliyor ? '#9CA3AF' : AS_GREEN,
                  color: '#fff',
                  fontSize: 12.5,
                  fontWeight: 700,
                  cursor: kaydediliyor ? 'default' : 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                {kaydediliyor ? 'Kaydediliyor…' : 'Kaydet'}
              </button>
              <button
                onClick={() => kipeGec(false)}
                style={{
                  padding: '9px 14px',
                  borderRadius: 9,
                  border: '1px solid #D1D5DB',
                  background: '#fff',
                  color: '#374151',
                  fontSize: 12.5,
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                Vazgeç
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Programın özeti — hoca kendi yükünü tek bakışta görsün */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 8,
          borderTop: '1px solid #F3F4F6',
          paddingTop: 14,
          marginTop: 4,
        }}
      >
        {[
          ['Ders saati', ozet?.dersSaati || 0],
          ['Ders', ozet?.dersSayisi || 0],
          ['Bölüm', ozet?.bolumSayisi || 0],
        ].map(([e, d]) => (
          <div key={e} style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 19, fontWeight: 800, color: AS_NAVY }}>{d}</div>
            <div style={{ fontSize: 10.5, color: '#9CA3AF', fontWeight: 600 }}>{e}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// ORTA — Haftalık ders programı (lisans · yüksek lisans · doktora)
// ══════════════════════════════════════════════════════════════
function ASProgram({ seviye, setSeviye, sayilar, izgara, saatler, cakismalar, donem, ad, unvan }) {
  const gunler = window.PROGRAM_GUNLERI || ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma'];
  // Yazdırma/indirme düğmesi shared-components'ta duruyor; burada yeniden
  // çizilmez — aynı belgeyi iki yerde üretmek ikisini ayrıştırırdı.
  const ProgramButonu = window.AkademisyenProgramButonu;
  const bolumAdlari = useMemo(() => {
    const s = new Set();
    Object.values(izgara || {}).forEach((g) =>
      Object.values(g || {}).forEach((liste) => (liste || []).forEach((k) => s.add(k.bolumAdi)))
    );
    return [...s].sort((a, b) => String(a).localeCompare(String(b), 'tr'));
  }, [izgara]);

  return (
    <div style={AS_KART}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          flexWrap: 'wrap',
          marginBottom: 14,
        }}
      >
        <h3 style={{ ...AS_BASLIK, margin: 0 }}>
          <svg
            width="19"
            height="19"
            viewBox="0 0 24 24"
            fill="none"
            stroke={AS_GREEN}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="3" y="4" width="18" height="18" rx="2" />
            <path d="M16 2v4M8 2v4M3 10h18" />
          </svg>
          Ders Programım
        </h3>
        {window.AkademisyenProgramButonu && (
          <window.AkademisyenProgramButonu ad={ad} unvan={unvan} birim="" />
        )}
      </div>

      {/* Seviye sekmeleri */}
      <div
        style={{
          display: 'inline-flex',
          padding: 3,
          borderRadius: 10,
          background: '#F3F4F6',
          gap: 2,
          marginBottom: 14,
          flexWrap: 'wrap',
        }}
      >
        {SEVIYELER.map((s) => {
          const sec = seviye === s.id;
          const n = sayilar[s.id] || 0;
          return (
            <button
              key={s.id}
              onClick={() => setSeviye(s.id)}
              style={{
                padding: '7px 13px',
                borderRadius: 8,
                border: 'none',
                background: sec ? '#fff' : 'transparent',
                color: sec ? AS_NAVY : '#6B7280',
                fontSize: 12.5,
                fontWeight: sec ? 700 : 600,
                cursor: 'pointer',
                fontFamily: 'inherit',
                boxShadow: sec ? '0 1px 2px rgba(16,24,40,0.1)' : 'none',
              }}
            >
              {s.etiket}
              <span style={{ marginLeft: 6, fontSize: 11, opacity: 0.7 }}>{n}</span>
            </button>
          );
        })}
      </div>

      {cakismalar && cakismalar.length > 0 && (
        <div
          style={{
            padding: '9px 12px',
            borderRadius: 8,
            background: '#FEF2F2',
            border: '1px solid #FCA5A5',
            color: '#B91C1C',
            fontSize: 12,
            marginBottom: 12,
            lineHeight: 1.5,
          }}
        >
          <b>Çakışma:</b> {cakismalar.length} saatte iki ayrı derse birden yazılmışsınız. Aşağıda
          kırmızı çerçeveyle işaretli.
        </div>
      )}

      {saatler.length === 0 ? (
        <p style={{ fontSize: 12.5, color: '#9CA3AF', margin: 0 }}>
          Bu dönem ({donem === 'bahar' ? 'Bahar' : 'Güz'}) için adınıza düşen ders saati bulunamadı.
        </p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 560 }}>
            <thead>
              <tr>
                <th
                  style={{
                    padding: '8px 6px',
                    fontSize: 10.5,
                    color: '#9CA3AF',
                    textAlign: 'left',
                    width: 62,
                  }}
                >
                  SAAT
                </th>
                {gunler.map((g) => (
                  <th
                    key={g}
                    style={{
                      padding: '8px 6px',
                      fontSize: 10.5,
                      color: '#6B7280',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                    }}
                  >
                    {g}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {saatler.map((saat) => (
                <tr key={saat}>
                  <td
                    style={{
                      padding: '6px',
                      fontSize: 10.5,
                      color: '#9CA3AF',
                      fontWeight: 700,
                      whiteSpace: 'nowrap',
                      verticalAlign: 'top',
                    }}
                  >
                    {saat}
                  </td>
                  {gunler.map((gun) => {
                    const liste = ((izgara || {})[gun] || {})[saat] || [];
                    const cakisiyor = window.hucreCakisiyor ? window.hucreCakisiyor(liste) : false;
                    return (
                      <td key={gun} style={{ padding: 3, verticalAlign: 'top' }}>
                        {liste.length === 0 ? (
                          <div
                            style={{
                              minHeight: 34,
                              borderRadius: 7,
                              background: '#FAFAFA',
                              border: '1px dashed #EEF0F3',
                            }}
                          />
                        ) : (
                          liste.map((k, i) => {
                            const renk = window.bolumRengi
                              ? window.bolumRengi(k.bolumAdi, bolumAdlari)
                              : { bg: '#DBEAFE', text: '#1E3A8A' };
                            return (
                              <div
                                key={i}
                                title={
                                  k.dersAdi +
                                  ' · ' +
                                  k.bolumAdi +
                                  (k.derslik ? ' · ' + k.derslik : '')
                                }
                                style={{
                                  padding: '6px 8px',
                                  borderRadius: 7,
                                  marginBottom: 3,
                                  background: renk.bg,
                                  color: renk.text,
                                  border: cakisiyor ? '2px solid #DC2626' : '1px solid transparent',
                                  fontSize: 11,
                                  lineHeight: 1.35,
                                }}
                              >
                                <div style={{ fontWeight: 800 }}>{k.dersKodu || k.dersAdi}</div>
                                <div style={{ opacity: 0.85, fontSize: 10 }}>
                                  {k.derslik || k.bolumAdi}
                                </div>
                              </div>
                            );
                          })
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {bolumAdlari.length > 1 && (
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 12 }}>
          {bolumAdlari.map((b) => {
            const renk = window.bolumRengi
              ? window.bolumRengi(b, bolumAdlari)
              : { bg: '#DBEAFE', text: '#1E3A8A' };
            return (
              <span
                key={b}
                style={{
                  fontSize: 10.5,
                  padding: '3px 9px',
                  borderRadius: 999,
                  background: renk.bg,
                  color: renk.text,
                  fontWeight: 700,
                }}
              >
                {b}
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// SAĞ — Öğrenci randevu talepleri
// ══════════════════════════════════════════════════════════════
function ASRandevular({ bekleyenler, onaylilar, ozet, cakisanlar, onKarar }) {
  const R = window.RandevuKurali || {};
  const [sekme, setSekme] = useState('bekliyor');
  const liste = sekme === 'bekliyor' ? bekleyenler : onaylilar;

  return (
    <div style={AS_KART}>
      <h3 style={AS_BASLIK}>
        <svg
          width="19"
          height="19"
          viewBox="0 0 24 24"
          fill="none"
          stroke={AS_GREEN}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M19 8v6M22 11h-6" />
        </svg>
        Randevu Talepleri
        {ozet.bekliyor > 0 && (
          <span
            style={{
              marginLeft: 'auto',
              padding: '2px 9px',
              borderRadius: 999,
              background: '#FEF3C7',
              color: '#92400E',
              fontSize: 11.5,
              fontWeight: 800,
            }}
          >
            {ozet.bekliyor} yeni
          </span>
        )}
      </h3>

      {/* ⚠ Program değişip randevunun saatine ders konduysa hoca bunu
          görmeli; randevu sessizce kaybolmamalı. */}
      {cakisanlar.length > 0 && (
        <div
          style={{
            padding: '9px 11px',
            borderRadius: 8,
            background: '#FEF2F2',
            border: '1px solid #FCA5A5',
            color: '#B91C1C',
            fontSize: 11.5,
            lineHeight: 1.5,
            marginBottom: 12,
          }}
        >
          <b>{cakisanlar.length} randevu ders saatinize düştü.</b> Ders programınız randevu
          verildikten sonra değişmiş olabilir; öğrenciyle görüşüp yeniden planlayın.
        </div>
      )}

      <div
        style={{
          display: 'inline-flex',
          padding: 3,
          borderRadius: 9,
          background: '#F3F4F6',
          gap: 2,
          marginBottom: 12,
        }}
      >
        {[
          ['bekliyor', 'Bekleyen', bekleyenler.length],
          ['onaylandi', 'Onaylı', onaylilar.length],
        ].map(([id, etiket, n]) => {
          const sec = sekme === id;
          return (
            <button
              key={id}
              onClick={() => setSekme(id)}
              style={{
                padding: '6px 12px',
                borderRadius: 7,
                border: 'none',
                background: sec ? '#fff' : 'transparent',
                color: sec ? AS_NAVY : '#6B7280',
                fontSize: 12,
                fontWeight: sec ? 700 : 600,
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              {etiket} <span style={{ opacity: 0.6 }}>{n}</span>
            </button>
          );
        })}
      </div>

      {liste.length === 0 ? (
        <p style={{ fontSize: 12.5, color: '#9CA3AF', margin: 0 }}>
          {sekme === 'bekliyor' ? 'Bekleyen randevu talebi yok.' : 'Onaylanmış randevu görünmüyor.'}
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
          {liste.map((r) => {
            const g = R.durumGorumu || R.durumGorunumu;
            const gor = g ? g(r.durum) : { bg: '#fff', kenar: '#E5E7EB', renk: '#6B7280' };
            return (
              <div
                key={metin(r.id || r._docId)}
                style={{
                  border: '1px solid ' + gor.kenar,
                  background: gor.bg,
                  borderRadius: 10,
                  padding: '10px 12px',
                }}
              >
                <div style={{ fontSize: 13, fontWeight: 700, color: AS_NAVY }}>
                  {metin(r.ogrenciAd) || metin(r.studentNumber)}
                </div>
                <div style={{ fontSize: 11, color: '#6B7280', marginTop: 2 }}>
                  {metin(r.studentNumber)}
                </div>
                <div style={{ fontSize: 12, color: '#374151', marginTop: 6, fontWeight: 600 }}>
                  {R.tarihMetni ? R.tarihMetni(r.tarih) : metin(r.tarih)} · {metin(r.saat)}
                </div>
                {metin(r.konu) && (
                  <p
                    style={{
                      margin: '6px 0 0',
                      fontSize: 11.5,
                      color: '#4B5563',
                      lineHeight: 1.5,
                      wordBreak: 'break-word',
                    }}
                  >
                    {metin(r.konu)}
                  </p>
                )}
                {(metin(r.durum) || 'bekliyor') === 'bekliyor' && (
                  <div style={{ display: 'flex', gap: 7, marginTop: 9 }}>
                    <button
                      onClick={() => onKarar(r, 'onaylandi')}
                      style={{
                        padding: '5px 12px',
                        borderRadius: 7,
                        border: 'none',
                        background: AS_GREEN,
                        color: '#fff',
                        fontSize: 11.5,
                        fontWeight: 700,
                        cursor: 'pointer',
                        fontFamily: 'inherit',
                      }}
                    >
                      Onayla
                    </button>
                    <button
                      onClick={() => onKarar(r, 'reddedildi')}
                      style={{
                        padding: '5px 12px',
                        borderRadius: 7,
                        border: '1px solid #FCA5A5',
                        background: '#fff',
                        color: '#B91C1C',
                        fontSize: 11.5,
                        fontWeight: 700,
                        cursor: 'pointer',
                        fontFamily: 'inherit',
                      }}
                    >
                      Reddet
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// SAĞ — Bugünkü dersler
// ══════════════════════════════════════════════════════════════
function ASBugun({ gun, dersler }) {
  return (
    <div style={AS_KART}>
      <h3 style={AS_BASLIK}>
        <svg
          width="19"
          height="19"
          viewBox="0 0 24 24"
          fill="none"
          stroke={AS_GREEN}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3 2" />
        </svg>
        Bugün · {gun || '—'}
      </h3>
      {dersler.length === 0 ? (
        <p style={{ fontSize: 12.5, color: '#9CA3AF', margin: 0 }}>Bugün dersiniz görünmüyor.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {dersler.map((k, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                gap: 10,
                alignItems: 'flex-start',
                paddingBottom: 8,
                borderBottom: i < dersler.length - 1 ? '1px solid #F3F4F6' : 'none',
              }}
            >
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 800,
                  color: AS_GREEN,
                  minWidth: 42,
                  paddingTop: 1,
                }}
              >
                {k.saat}
              </span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: AS_NAVY }}>
                  {k.dersKodu ? k.dersKodu + ' · ' : ''}
                  {k.dersAdi}
                </span>
                <span style={{ display: 'block', fontSize: 11, color: '#6B7280', marginTop: 1 }}>
                  {[k.derslik, k.bolumAdi].filter(Boolean).join(' · ')}
                </span>
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// PANEL — Dijital Yoklama
//
// Dersi seç → tam ekran karekod. Altında o dersin devamsızlık tablosu:
// sınırı aşanlar kırmızı alanla işaretli.
// ══════════════════════════════════════════════════════════════
function ASYoklamaPaneli({
  dersler,
  ayarlar,
  oturumlar,
  devamsizlik,
  onBaslat,
  onLimit,
  onCihazSifirla,
}) {
  const Y = window.YoklamaKurali || {};
  const [secili, setSecili] = useState(() => metin(dersler[0]?.id || dersler[0]?._docId));
  const ders = dersler.find((d) => metin(d.id || d._docId) === secili) || null;
  const ayar = ders ? ayarlar[metin(ders.id || ders._docId)] || {} : {};
  const [limit, setLimit] = useState(String(ayar.limitSaat ?? ''));
  const [dersSaati, setDersSaati] = useState(String(ayar.dersSaati ?? 1));

  useEffect(() => {
    const a = ders ? ayarlar[metin(ders.id || ders._docId)] || {} : {};
    setLimit(String(a.limitSaat ?? ''));
    setDersSaati(String(a.dersSaati ?? ders?.saat ?? 1));
  }, [secili, ders, ayarlar]);

  const satirlar = ders ? devamsizlik(ders) : [];
  const gecmis = ders
    ? oturumlar.filter((o) => metin(o.dersId) === metin(ders.id || ders._docId) && !o.acik)
    : [];
  const asanlar = satirlar.filter((s) => s.durum && s.durum.asildi);

  if (dersler.length === 0) {
    return (
      <p style={{ fontSize: 13, color: '#6B7280', margin: 0 }}>
        Adınıza tanımlı ders bulunamadı; yoklama açılamıyor. Ders kayıtlarındaki eğitmen alanı için
        bölüm yetkilinize başvurun.
      </p>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Ders seçimi */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {dersler.map((d) => {
          const id = metin(d.id || d._docId);
          const sec = id === secili;
          return (
            <button
              key={id}
              onClick={() => setSecili(id)}
              style={{
                padding: '8px 14px',
                borderRadius: 10,
                border: '1px solid ' + (sec ? AS_NAVY : '#E5E7EB'),
                background: sec ? AS_NAVY : '#fff',
                color: sec ? '#fff' : AS_NAVY,
                fontSize: 12.5,
                fontWeight: 700,
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              {metin(d.code || d.kod) || metin(d.name || d.ad)}
            </button>
          );
        })}
      </div>

      {ders && (
        <>
          <div
            style={{
              ...AS_KART,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 14,
              flexWrap: 'wrap',
            }}
          >
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: AS_NAVY }}>
                {metin(ders.name || ders.ad)}
              </div>
              <div style={{ fontSize: 12, color: '#6B7280', marginTop: 3 }}>
                {satirlar.length} öğrenci · {gecmis.length} yoklama alındı
              </div>
            </div>
            <button
              onClick={() => onBaslat(ders)}
              style={{
                padding: '11px 20px',
                borderRadius: 11,
                border: 'none',
                background: AS_GREEN,
                color: '#fff',
                fontSize: 14,
                fontWeight: 700,
                cursor: 'pointer',
                fontFamily: 'inherit',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <svg
                width="17"
                height="17"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="3" y="3" width="7" height="7" rx="1" />
                <rect x="14" y="3" width="7" height="7" rx="1" />
                <rect x="3" y="14" width="7" height="7" rx="1" />
                <path d="M14 14h3v3h-3zM18 18h3v3h-3z" />
              </svg>
              Tam ekran karekodu aç
            </button>
          </div>

          {/* Devamsızlık sınırı */}
          <div style={AS_KART}>
            <h4 style={{ ...AS_BASLIK, fontSize: 14, marginBottom: 10 }}>Devamsızlık sınırı</h4>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <label style={{ fontSize: 11.5, color: '#6B7280', fontWeight: 600 }}>
                Hak (saat)
                <input
                  type="number"
                  min="0"
                  value={limit}
                  onChange={(e) => setLimit(e.target.value)}
                  style={{
                    display: 'block',
                    width: 110,
                    marginTop: 4,
                    padding: '8px 10px',
                    borderRadius: 8,
                    border: '1px solid #D1D5DB',
                    fontSize: 13,
                    fontFamily: 'inherit',
                  }}
                />
              </label>
              <label style={{ fontSize: 11.5, color: '#6B7280', fontWeight: 600 }}>
                Haftalık ders saati
                <input
                  type="number"
                  min="1"
                  value={dersSaati}
                  onChange={(e) => setDersSaati(e.target.value)}
                  style={{
                    display: 'block',
                    width: 140,
                    marginTop: 4,
                    padding: '8px 10px',
                    borderRadius: 8,
                    border: '1px solid #D1D5DB',
                    fontSize: 13,
                    fontFamily: 'inherit',
                  }}
                />
              </label>
              <button
                onClick={() => onLimit(ders, limit, dersSaati)}
                style={{
                  padding: '9px 16px',
                  borderRadius: 9,
                  border: 'none',
                  background: AS_NAVY,
                  color: '#fff',
                  fontSize: 12.5,
                  fontWeight: 700,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                Kaydet
              </button>
            </div>
            <p style={{ margin: '10px 0 0', fontSize: 11.5, color: '#9CA3AF', lineHeight: 1.6 }}>
              Sınırı her ders için ayrı belirlersiniz. Öğrenci kendi sayfasında kalan hakkını görür.
              Sınır boş bırakılırsa sayı görünür ama &quot;kaldı&quot; kararı verilmez.
            </p>
          </div>

          {/* Devamsızlık tablosu */}
          <div style={AS_KART}>
            <h4 style={{ ...AS_BASLIK, fontSize: 14, marginBottom: 10 }}>
              Devamsızlık durumu
              {asanlar.length > 0 && (
                <span
                  style={{
                    marginLeft: 'auto',
                    padding: '2px 9px',
                    borderRadius: 999,
                    background: '#FEE2E2',
                    color: '#B91C1C',
                    fontSize: 11.5,
                    fontWeight: 800,
                  }}
                >
                  {asanlar.length} öğrenci sınırı aştı
                </span>
              )}
            </h4>

            {satirlar.length === 0 ? (
              <p style={{ fontSize: 12.5, color: '#9CA3AF', margin: 0 }}>
                Bu derse kayıtlı öğrenci bulunamadı.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {satirlar.map((s) => {
                  const d = s.durum || {};
                  const renk = Y.devamsizlikRengi ? Y.devamsizlikRengi(d.durum) : '#6B7280';
                  const kirmizi = d.asildi;
                  return (
                    <div
                      key={s.studentNumber}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        padding: '9px 12px',
                        borderRadius: 9,
                        // ⚠ Sınırı aşan öğrenci kırmızı alanla ayrılır:
                        // listeyi tarayıp hesap yapmak zorunda kalmasın.
                        background: kirmizi ? '#FEF2F2' : '#FAFAFA',
                        border: '1px solid ' + (kirmizi ? '#FCA5A5' : '#EEF0F3'),
                      }}
                    >
                      <span style={{ flex: 1, minWidth: 0 }}>
                        <span
                          style={{
                            display: 'block',
                            fontSize: 13,
                            fontWeight: 700,
                            color: kirmizi ? '#B91C1C' : AS_NAVY,
                          }}
                        >
                          {s.adSoyad || s.studentNumber}
                        </span>
                        <span style={{ display: 'block', fontSize: 11, color: '#9CA3AF' }}>
                          {s.studentNumber}
                          {/* ⚠ CİHAZ BAĞLAMA BU DÜĞME OLMADAN BİR TUZAKTIR:
                              telefonu bozulan ya da kotasını tüketen öğrenci
                              dönem boyunca yoklama veremez hâle gelir. */}
                          {' · '}
                          <button
                            onClick={() => onCihazSifirla(s.studentNumber, s.adSoyad)}
                            title="Öğrenci telefon değiştirdiyse ya da cihaz hakkı dolduysa sıfırlayın"
                            style={{
                              padding: 0,
                              border: 'none',
                              background: 'none',
                              color: '#2563EB',
                              fontSize: 11,
                              fontWeight: 600,
                              cursor: 'pointer',
                              fontFamily: 'inherit',
                              textDecoration: 'underline',
                            }}
                          >
                            cihazı sıfırla
                          </button>
                        </span>
                      </span>
                      <span style={{ width: 120, flexShrink: 0 }}>
                        <span
                          style={{
                            display: 'block',
                            height: 6,
                            borderRadius: 999,
                            background: '#E5E7EB',
                            overflow: 'hidden',
                          }}
                        >
                          <span
                            style={{
                              display: 'block',
                              height: '100%',
                              width: Math.round((d.oran || 0) * 100) + '%',
                              background: renk,
                            }}
                          />
                        </span>
                        <span
                          style={{
                            display: 'block',
                            fontSize: 10.5,
                            color: renk,
                            fontWeight: 700,
                            marginTop: 4,
                            textAlign: 'right',
                          }}
                        >
                          {d.kacirilanSaat || 0}
                          {d.limitSaat ? ' / ' + d.limitSaat : ''} saat
                        </span>
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// PANEL — Görüşme Saatlerim
//
// Hocanın KENDİ ders programı üzerinde çalışır: dolu saatler zaten dersle
// kaplıdır, tıklanamaz. Boş saate tıklamak onu öğrenciye açar.
// ══════════════════════════════════════════════════════════════
function ASGorusmePaneli({ izgara, saatler, musaitlikler, onDegistir }) {
  const R = window.RandevuKurali || {};
  const g = R.gorusmeIzgarasi ? R.gorusmeIzgarasi(izgara, saatler, musaitlikler) : null;

  if (!g || saatler.length === 0) {
    return (
      <p style={{ fontSize: 13, color: '#6B7280', margin: 0 }}>
        Haftalık ders programınız yüklenemedi; görüşme saatleri ders programının üzerine
        işaretlenir. Programınız oluşturulduktan sonra bu ekran çalışır.
      </p>
    );
  }

  const acikSayisi = g.satirlar.reduce(
    (t, s) => t + s.hucreler.filter((h) => h.durum === 'acik').length,
    0
  );
  // Bölüm ders saatlerini değiştirdiyse eski işaretler hiçbir satıra
  // düşmez; sessizce yok saymak yerine söylenir (bkz. lib/randevu.js).
  const yetimler = R.yetimSlotlar ? R.yetimSlotlar(musaitlikler, saatler) : [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', fontSize: 11.5, color: '#6B7280' }}>
        {[
          ['Görüşmeye açık', '#DCFCE7', '#166534'],
          ['Ders var', '#DBEAFE', '#1E3A8A'],
          ['Boş', '#FAFAFA', '#9CA3AF'],
        ].map(([e, bg, renk]) => (
          <span key={e} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <span
              style={{
                width: 14,
                height: 14,
                borderRadius: 4,
                background: bg,
                border: '1px solid ' + renk + '33',
              }}
            />
            {e}
          </span>
        ))}
        <span style={{ marginLeft: 'auto', fontWeight: 700, color: AS_NAVY }}>
          {acikSayisi} saat açık
        </span>
      </div>

      {yetimler.length > 0 && (
        <div
          style={{
            padding: '10px 12px',
            borderRadius: 9,
            background: '#FFFBEB',
            border: '1px solid #FCD34D',
            color: '#92400E',
            fontSize: 11.5,
            lineHeight: 1.6,
          }}
        >
          <b>{yetimler.length} eski işaret artık programda karşılık bulmuyor.</b> Bölümün ders
          saatleri değişmiş olabilir ({yetimler.join(', ').replace(/\|/g, ' ')}). Bu saatler
          öğrenciye gösterilmiyor; aşağıdan yenilerini işaretleyin.
          <button
            onClick={() => yetimler.forEach((a) => onDegistir(a))}
            style={{
              display: 'block',
              marginTop: 8,
              padding: '5px 12px',
              borderRadius: 7,
              border: '1px solid #FCD34D',
              background: '#fff',
              color: '#92400E',
              fontSize: 11.5,
              fontWeight: 700,
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            Eski işaretleri temizle
          </button>
        </div>
      )}

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 560 }}>
          <thead>
            <tr>
              <th style={{ width: 62 }} />
              {g.gunler.map((gun) => (
                <th
                  key={gun}
                  style={{
                    padding: '8px 6px',
                    fontSize: 10.5,
                    color: '#6B7280',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                  }}
                >
                  {gun}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {g.satirlar.map((satir) => (
              <tr key={satir.saat}>
                <td
                  style={{
                    padding: 6,
                    fontSize: 10.5,
                    color: '#9CA3AF',
                    fontWeight: 700,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {satir.saat}
                </td>
                {satir.hucreler.map((h) => {
                  const ders = h.durum === 'ders';
                  const acik = h.durum === 'acik';
                  return (
                    <td key={h.anahtar} style={{ padding: 3 }}>
                      <button
                        type="button"
                        disabled={ders}
                        onClick={() => !ders && onDegistir(h.anahtar)}
                        title={
                          ders
                            ? 'Bu saatte dersiniz var: ' +
                              (h.dersler || []).map((d) => d.dersKodu || d.dersAdi).join(', ')
                            : acik
                              ? 'Görüşmeye açık — kapatmak için tıklayın'
                              : 'Görüşmeye açmak için tıklayın'
                        }
                        style={{
                          width: '100%',
                          minHeight: 40,
                          borderRadius: 8,
                          border:
                            '1px ' +
                            (ders ? 'solid #BFDBFE' : acik ? 'solid #6EE7B7' : 'dashed #E5E7EB'),
                          background: ders ? '#DBEAFE' : acik ? '#DCFCE7' : '#FAFAFA',
                          color: ders ? '#1E3A8A' : acik ? '#166534' : '#9CA3AF',
                          fontSize: 10.5,
                          fontWeight: 700,
                          cursor: ders ? 'not-allowed' : 'pointer',
                          fontFamily: 'inherit',
                          padding: 4,
                        }}
                      >
                        {ders ? (h.dersler || [])[0]?.dersKodu || 'Ders' : acik ? 'Görüşme' : '+'}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p style={{ margin: 0, fontSize: 11.5, color: '#9CA3AF', lineHeight: 1.6 }}>
        Ders saatleriniz kapalıdır ve işaretlenemez. Açtığınız saatler, derslerinizi alan
        öğrencilerin &quot;Benim Sayfam&quot; ekranında görünür; öğrenci o saate randevu ister, onay
        sizdedir.
      </p>
    </div>
  );
}

window.AkademisyenSayfamApp = AkademisyenSayfamApp;
