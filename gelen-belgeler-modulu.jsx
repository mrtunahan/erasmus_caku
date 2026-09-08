// ══════════════════════════════════════════════════════════════
// ÇAKÜ — Gelen Belgeler (Evrak Akışı)
//
// TEK bileşen, DÖRT rol: memur · bölüm yetkilisi · akademisyen · öğrenci.
// Hangi belgenin kime düştüğüne shared-components'teki window.belgeGelenKutusu
// karar verir (rol + kapsam eşleşmesi) — böylece bu ekran ve sidebar rozeti
// aynı mantığı kullanır.
//
// Yönlendirme GÖREVE yapılır (kişiye değil): personel değişse de akış bozulmaz.
// Alıcı işlemi: Görüldü / Tamamlandı.
//
// Faz 2: "Gönderdiklerim" sekmesi — gönderen, belgesini kimin görüp
// tamamladığını takip eder.
// ══════════════════════════════════════════════════════════════

const { useState, useEffect, useMemo, useCallback } = React;

const GB = {
  navy: '#1B2A4A',
  accent: '#0F766E',
  accentPale: '#CCFBF1',
  text: '#1F2937',
  textMuted: '#6B7280',
  border: '#E5E7EB',
  green: '#059669',
  greenLight: '#D1FAE5',
  amber: '#B45309',
  amberLight: '#FEF3C7',
  red: '#DC2626',
  bg: '#F8F9FB',
};

const GB_DURUM = {
  bekliyor: { label: 'Bekliyor', color: GB.amber, bg: GB.amberLight },
  goruldu: { label: 'Görüldü', color: '#1D4ED8', bg: '#DBEAFE' },
  // İşleme alındı: belgeyi gönderen taraf, işin başladığını buradan görür.
  islemde: { label: 'İşleme Alındı', color: '#7C3AED', bg: '#EDE9FE' },
  tamamlandi: { label: 'Tamamlandı', color: GB.green, bg: GB.greenLight },
};

// Belge türü adları — muafiyet ve ÇAP/Yandal modülleri birden çok tür
// üretir; alt sekmelerde bunlar ayrı gösterilir ki belgeler karışmasın.
const GB_TUR_ADI = {
  muafiyet: 'Ders Muafiyet',
  intibak: 'Yaz Dönemi İntibak',
  dikey: 'Dikey Geçiş',
  kurumici: 'Kurum İçi',
  kurumlararasi: 'Kurumlararası',
  merkezi: 'Merkezi Yerleştirme',
  cap: 'ÇAP',
  yandal: 'Yandal',
  gidis: 'Gidiş',
  donus: 'Dönüş',
};
// Alt sekmeye ayrılan modüller
const GB_ALT_SEKMELI = new Set(['muafiyet', 'capyandal', 'yataygecis']);

const GB_MODUL_ADI = {
  muafiyet: 'Ders Muafiyet',
  yataygecis: 'Yatay Geçiş',
  capyandal: 'ÇAP / Yandal',
  erasmus: 'Erasmus',
  staj: 'Staj',
  akreditasyon: 'Akreditasyon',
  performans: 'Performans',
  sinav: 'Sınav',
};

// Görüntüle: tarayıcıda aç (PDF önizlenir, Office belgeleri Word'e açılır)
const gbViewHref = (u) => {
  const rel = String(u || '')
    .replace('/api/files/download/', '')
    .replace('/api/files/view/', '');
  return rel ? '/api/files/view/' + rel : '#';
};
// İndir: her zaman dosya olarak indirir
const gbDownloadHref = (u) => {
  const rel = String(u || '')
    .replace('/api/files/download/', '')
    .replace('/api/files/view/', '');
  return rel ? '/api/files/download/' + rel + '?download=true' : '#';
};

const gbFileHref = (u) => {
  const rel = String(u || '')
    .replace('/api/files/download/', '')
    .replace('/api/files/view/', '');
  if (!rel) return '#';
  return /\.pdf$/i.test(rel)
    ? '/api/files/view/' + rel
    : '/api/files/download/' + rel + '?download=true';
};

const gbPill = (color, bg) => ({
  padding: '2px 10px',
  borderRadius: 12,
  background: bg,
  color,
  fontSize: 11,
  fontWeight: 700,
  whiteSpace: 'nowrap',
});
const gbBtn = (color) => ({
  padding: '7px 14px',
  borderRadius: 8,
  border: '1px solid ' + (color || GB.border),
  background: 'white',
  color: color || GB.textMuted,
  fontSize: 12.5,
  fontWeight: 600,
  cursor: 'pointer',
  textDecoration: 'none',
  display: 'inline-block',
});

// ── Gelen belge kartı ──
function GbKart({ item, onDurum, onSil, busy }) {
  const { doc, gonderim, index } = item;
  const st = GB_DURUM[gonderim.durum || 'bekliyor'] || GB_DURUM.bekliyor;
  const tarih = gonderim.gonderilmeTarihi
    ? new Date(gonderim.gonderilmeTarihi).toLocaleDateString('tr-TR')
    : '';
  const docId = doc.id || doc._docId || doc.module + '__' + doc.sourceId;

  return (
    <div
      style={{
        background: 'white',
        border: '1px solid ' + GB.border,
        borderLeft: '3px solid ' + st.color,
        borderRadius: 12,
        padding: 16,
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={gbPill(GB.accent, GB.accentPale)}>
              {GB_MODUL_ADI[doc.module] || doc.module}
            </span>
            <span style={{ fontSize: 14, fontWeight: 700, color: GB.navy }}>
              {doc.title || '(başlıksız belge)'}
            </span>
          </div>
          {doc.subtitle && (
            <div style={{ fontSize: 12, color: GB.textMuted, marginTop: 4 }}>{doc.subtitle}</div>
          )}
          <div style={{ fontSize: 11.5, color: GB.textMuted, marginTop: 6 }}>
            {gonderim.gonderenAd ? 'Gönderen: ' + gonderim.gonderenAd : ''}
            {tarih ? '  ·  ' + tarih : ''}
            {gonderim.hedefAd ? '  ·  Hedef: ' + gonderim.hedefAd : ''}
          </div>
          {gonderim.not && (
            <div
              style={{
                marginTop: 8,
                padding: '7px 10px',
                background: GB.bg,
                borderRadius: 8,
                fontSize: 12,
                color: GB.text,
              }}
            >
              📝 {gonderim.not}
            </div>
          )}
        </div>
        <span style={gbPill(st.color, st.bg)}>{st.label}</span>
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <a
          href={gbViewHref(doc.url)}
          target="_blank"
          rel="noopener noreferrer"
          style={gbBtn(GB.accent)}
        >
          Görüntüle
        </a>
        <a href={gbDownloadHref(doc.url)} style={gbBtn(GB.navy)}>
          İndir
        </a>
        {gonderim.durum !== 'goruldu' &&
          gonderim.durum !== 'islemde' &&
          gonderim.durum !== 'tamamlandi' && (
            <button
              type="button"
              disabled={busy}
              onClick={() => onDurum(docId, index, 'goruldu')}
              style={gbBtn('#1D4ED8')}
            >
              Görüldü
            </button>
          )}
        {gonderim.durum !== 'islemde' && gonderim.durum !== 'tamamlandi' && (
          <button
            type="button"
            disabled={busy}
            onClick={() => onDurum(docId, index, 'islemde')}
            style={gbBtn('#7C3AED')}
          >
            İşleme Al
          </button>
        )}
        {gonderim.durum !== 'tamamlandi' && (
          <button
            type="button"
            disabled={busy}
            onClick={() => onDurum(docId, index, 'tamamlandi')}
            style={gbBtn(GB.green)}
          >
            Tamamlandı
          </button>
        )}
        {gonderim.durum === 'tamamlandi' && gonderim.durumBy && (
          <span style={{ fontSize: 11.5, color: GB.textMuted, alignSelf: 'center' }}>
            {gonderim.durumBy} tarafından tamamlandı
          </span>
        )}
        {onSil && (
          <button
            type="button"
            disabled={busy}
            onClick={() => onSil(docId, doc.title)}
            style={{ ...gbBtn(GB.red), marginLeft: 'auto' }}
          >
            Sil
          </button>
        )}
      </div>
    </div>
  );
}

// ── Faz 2: Gönderdiklerim (takip) kartı ──
function GbGonderdigimKart({ doc }) {
  const gs = doc.gonderimler || [];
  return (
    <div
      style={{
        background: 'white',
        border: '1px solid ' + GB.border,
        borderRadius: 12,
        padding: 16,
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
      }}
    >
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <span style={gbPill(GB.accent, GB.accentPale)}>
          {GB_MODUL_ADI[doc.module] || doc.module}
        </span>
        <span style={{ fontSize: 14, fontWeight: 700, color: GB.navy }}>
          {doc.title || '(başlıksız belge)'}
        </span>
        <span style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
          <a
            href={gbViewHref(doc.url)}
            target="_blank"
            rel="noopener noreferrer"
            style={{ ...gbBtn(GB.accent), padding: '5px 11px', fontSize: 12 }}
          >
            Görüntüle
          </a>
          <a
            href={gbDownloadHref(doc.url)}
            style={{ ...gbBtn(GB.navy), padding: '5px 11px', fontSize: 12 }}
          >
            İndir
          </a>
        </span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {gs.map((g, i) => {
          const st = GB_DURUM[g.durum || 'bekliyor'] || GB_DURUM.bekliyor;
          return (
            <div
              key={i}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                flexWrap: 'wrap',
                padding: '7px 10px',
                background: GB.bg,
                borderRadius: 8,
                fontSize: 12,
              }}
            >
              <span style={{ fontWeight: 700, color: GB.navy }}>{g.hedefAd || g.hedefRol}</span>
              <span style={gbPill(st.color, st.bg)}>{st.label}</span>
              {g.durumBy && <span style={{ color: GB.textMuted }}>· {g.durumBy}</span>}
              {g.durumTarihi && (
                <span style={{ color: GB.textMuted }}>
                  · {new Date(g.durumTarihi).toLocaleDateString('tr-TR')}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
function GelenBelgelerApp({ currentUser, activeDepartment }) {
  const [docs, setDocs] = useState([]);
  // Memur atamaları (bölüm, memur) başına tutulur; gelen kutusu hangi belgenin
  // görüneceğine buna bakarak karar verir. AppShell oturum açılışında okuyup
  // global'e koyuyor — burada da okunur ki ekran doğrudan açıldığında
  // (yenileme, derin bağlantı) atamalar gelmeden liste yanlış kurulmasın.
  const [atamalar, setAtamalar] = useState(() => window.__memurAtamalari || []);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState('gelen');
  const [filtre, setFiltre] = useState('acik'); // 'acik' | 'hepsi'
  const [modulFiltre, setModulFiltre] = useState('hepsi'); // modül sekmesi
  // Fakülte genelinde çalışan memurun kutusu kalabalıklaşıyor; ad/no ile arar.
  const [arama, setArama] = useState('');
  const [msg, setMsg] = useState('');

  const isStudent = currentUser?.role === 'student';
  const myId = String(currentUser?.identifier || '');

  const load = useCallback(async () => {
    try {
      const read = window.apiRead.fresh || window.apiRead;
      const list = await read('memur_outputs');
      setDocs(list || []);
    } catch (_e) {
      setDocs([]);
    }
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      await load();
      if (alive) setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, [load]);

  const isMemur = currentUser?.role === 'memur' || !!currentUser?.isMemur;
  useEffect(() => {
    if (!isMemur || !window.apiRead) return;
    let iptal = false;
    window
      .apiRead(window.MEMUR_ATAMA_KOLEKSIYONU || 'memur_bolum_modulleri')
      .then((list) => {
        if (iptal) return;
        const arr = Array.isArray(list) ? list : [];
        window.__memurAtamalari = arr;
        setAtamalar(arr);
      })
      .catch(() => {
        /* okunamazsa global'deki liste kullanılır */
      });
    return () => {
      iptal = true;
    };
  }, [isMemur]);

  // Tüm gelen belgeler (sekme sayaçları bunun üzerinden hesaplanır)
  // Belge türü alt sekmesi (yalnız muafiyet / ÇAP-Yandal'da anlamlı)
  const [turFiltre, setTurFiltre] = useState('hepsi');
  useEffect(() => {
    setTurFiltre('hepsi');
  }, [modulFiltre]);

  const gelenTum = useMemo(
    () =>
      window.belgeGelenKutusu
        ? window.belgeGelenKutusu(docs, currentUser, { atamalar, aktifBolum: activeDepartment })
        : [],
    [docs, currentUser, atamalar, activeDepartment]
  );
  // Modül bazlı sekmeler — hangi modüllerden belge gelmişse o sekme çıkar
  const modulSekmeleri = useMemo(() => {
    const m = {};
    gelenTum.forEach((i) => {
      const k = i.doc.module || 'diger';
      if (!m[k]) m[k] = 0;
      if (i.gonderim.durum === 'bekliyor') m[k]++;
    });
    return Object.keys(m).map((k) => ({ id: k, label: GB_MODUL_ADI[k] || k, bekleyen: m[k] }));
  }, [gelenTum]);

  // Seçili modülün belge TÜRÜ alt sekmeleri (muafiyet, ÇAP/Yandal)
  const turSekmeleri = useMemo(() => {
    if (!GB_ALT_SEKMELI.has(modulFiltre)) return [];
    const m = {};
    gelenTum
      .filter((i) => (i.doc.module || 'diger') === modulFiltre)
      .forEach((i) => {
        const k = i.doc.docType || 'diger';
        if (!m[k]) m[k] = 0;
        if (i.gonderim.durum === 'bekliyor') m[k]++;
      });
    return Object.keys(m).map((k) => ({ id: k, label: GB_TUR_ADI[k] || k, bekleyen: m[k] }));
  }, [gelenTum, modulFiltre]);

  // Türkçe-duyarlı arama: İ/I önce eşlenir, yoksa "ISMAIL" yazan kullanıcı
  // "İsmail" kaydını bulamıyor (JS'in küçültmesi bu iki harfi ayırıyor).
  const gbKucuk = (x) =>
    String(x || '')
      .replace(/İ/g, 'i')
      .replace(/I/g, 'ı')
      .toLocaleLowerCase('tr-TR');

  const gelen = useMemo(() => {
    let all = gelenTum;
    if (modulFiltre !== 'hepsi') all = all.filter((i) => (i.doc.module || 'diger') === modulFiltre);
    if (GB_ALT_SEKMELI.has(modulFiltre) && turFiltre !== 'hepsi') {
      all = all.filter((i) => (i.doc.docType || 'diger') === turFiltre);
    }
    const q = gbKucuk(arama).trim();
    if (q) {
      all = all.filter((i) =>
        gbKucuk(
          (i.doc.title || '') + ' ' + (i.doc.subtitle || '') + ' ' + (i.doc.ogrenciNo || '')
        ).includes(q)
      );
    }
    return filtre === 'acik' ? all.filter((i) => i.gonderim.durum !== 'tamamlandi') : all;
  }, [gelenTum, filtre, modulFiltre, turFiltre, arama]);

  // ── Yeni belge bildirimi ──
  // Bekleyen sayısı bir öncekine göre arttıysa ekranda bildirim gösterilir.
  const [bildirim, setBildirim] = useState('');
  useEffect(() => {
    if (loading) return;
    const key = 'gb_son_bekleyen_' + (currentUser?.identifier || 'x');
    const simdi = gelenTum.filter((i) => i.gonderim.durum === 'bekliyor').length;
    let onceki = null;
    try {
      const v = localStorage.getItem(key);
      onceki = v == null ? null : parseInt(v, 10);
    } catch (_e) {
      onceki = null;
    }
    if (onceki != null && simdi > onceki) {
      setBildirim(simdi - onceki + ' yeni belge geldi');
      setTimeout(() => setBildirim(''), 6000);
    }
    try {
      localStorage.setItem(key, String(simdi));
    } catch (_e) {
      /* localStorage yoksa yut */
    }
  }, [gelenTum, loading, currentUser]);

  // Faz 2 — gönderen takibi: bu kullanıcının gönderdiği belgeler
  // "Giden Belgeler": kendi gönderdiklerim + KENDİ BÖLÜMÜMDEN çıkan belgeler.
  // Belgeyi kim ürettiyse ürettiği önemli değil; o modülden sorumlu
  // akademisyenler/komisyon üyeleri belgenin işleme alınıp alınmadığını
  // görebilmeli. Öğrenciye bu sekme zaten açılmıyor.
  const gonderdiklerim = useMemo(() => {
    if (isStudent) return [];
    const myDept = String(currentUser?.departmentId || '');
    const myFac = String(currentUser?.facultyId || '');
    return (docs || []).filter((d) => {
      const gs = d.gonderimler || [];
      if (gs.length === 0) return false;
      if (gs.some((g) => String(g.gonderen || '') === myId)) return true;
      // Memur bu ekranda belge üretmez; kendi gönderdikleri dışında ancak
      // GÖREBİLDİĞİ belgeleri takip eder. Kayıtlı bölümü çoğu memurda boş
      // olduğu için eski kural fakültenin kapsamsız belgelerini açıyordu.
      if (isMemur) {
        return window.memurBelgeyiGorurMu
          ? window.memurBelgeyiGorurMu({
              doc: d,
              kullanici: currentUser,
              atamalar,
              aktifBolum: activeDepartment,
            })
          : false;
      }
      if (myDept && String(d.departmentId || '') === myDept) return true;
      if (myFac && !d.departmentId && String(d.facultyId || '') === myFac) return true;
      return false;
    });
  }, [docs, myId, currentUser, isStudent, isMemur, atamalar, activeDepartment]);

  const setDurum = async (docId, idx, durum) => {
    setBusy(true);
    try {
      const r = await window.belgeDurumGuncelle(docId, idx, durum);
      if (!r || !r.ok) throw new Error((r && r.reason) || 'güncellenemedi');
      await load();
      setMsg(
        durum === 'tamamlandi'
          ? 'Tamamlandı olarak işaretlendi.'
          : durum === 'islemde'
            ? 'İşleme alındı — gönderen tarafta görünecek.'
            : 'Görüldü olarak işaretlendi.'
      );
      setTimeout(() => setMsg(''), 2500);
    } catch (e) {
      alert('İşaretlenemedi: ' + e.message);
    } finally {
      setBusy(false);
    }
  };

  // Belgeyi YALNIZ kendi listemden kaldır — kayıt ve gönderim geçmişi durur,
  // gönderenin takibi ve diğer alıcıların kutusu bozulmaz. (Memur ekranıyla
  // aynı davranış; bir kişinin listesini toplaması kaydı yok etmemeli.)
  const silBelge = async (docId, baslik) => {
    if (
      !confirm(
        'Bu belge yalnızca SİZİN listenizden kaldırılacak:\n\n' +
          (baslik || '(başlıksız belge)') +
          '\n\nBelge sistemden silinmez; gönderen ve diğer alıcılar görmeye devam eder.' +
          '\n\nDevam edilsin mi?'
      )
    )
      return;
    setBusy(true);
    try {
      const r = await window.belgeListedenKaldir('memur_outputs', docId);
      if (!r || !r.ok) throw new Error((r && r.reason) || 'kaldırılamadı');
      await load();
      setMsg('Belge listenizden kaldırıldı.');
      setTimeout(() => setMsg(''), 2500);
    } catch (e) {
      alert('Kaldırılamadı: ' + e.message);
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return <div style={{ padding: 60, textAlign: 'center', color: GB.textMuted }}>Yükleniyor…</div>;
  }

  const bekleyen = gelen.filter((i) => i.gonderim.durum === 'bekliyor').length;
  // Süzgeç seçili bölüme bağlı (istenen davranış), ama sessiz: kendisine
  // gönderilmiş bir belge yanlış bölüm seçiliyken hiç görünmüyor ve memur
  // "bana gelmedi" sanıyordu. Kayıp artık söyleniyor.
  const baskaBolumler =
    isMemur && window.memurBaskaBolumOzeti
      ? window.memurBaskaBolumOzeti(docs, currentUser, { atamalar, aktifBolum: activeDepartment })
      : [];
  const bolumAdi = (id) => ((window.DEPARTMENTS || []).find((d) => d.id === id) || {}).name || id;

  // Memur seçili bölümde hiçbir modüle atanmamışsa liste zorunlu olarak boştur.
  const atamasizBolum =
    isMemur &&
    !!window.memurBelgeModulleri &&
    window.memurBelgeModulleri(atamalar, activeDepartment, currentUser).length === 0;
  const tabs = isStudent
    ? [{ id: 'gelen', label: 'Gelen Belgeler' }]
    : [
        { id: 'gelen', label: 'Gelen Belgeler' },
        { id: 'giden', label: 'Giden Belgeler' },
      ];

  const bosKutu = (metin) => (
    <div
      style={{
        background: 'white',
        border: '1px dashed ' + GB.border,
        borderRadius: 12,
        padding: 44,
        textAlign: 'center',
        color: GB.textMuted,
      }}
    >
      <div style={{ fontSize: 28, marginBottom: 8 }}>📭</div>
      <div style={{ fontSize: 13.5, fontWeight: 600, color: GB.navy, marginBottom: 4 }}>
        Belge yok
      </div>
      <div style={{ fontSize: 12 }}>{metin}</div>
    </div>
  );

  return (
    <div
      style={{
        fontFamily: "'Inter', sans-serif",
        color: GB.text,
        maxWidth: 1400,
        margin: '0 auto',
        padding: '0 4px 40px',
      }}
    >
      {window.CakuBanner &&
        React.createElement(window.CakuBanner, {
          title: 'Gelen / Giden Belgeler',
          subtitle: 'Size yönlendirilen belgeler — indirin, işleyin, durumunu işaretleyin',
        })}

      <div
        style={{
          display: 'flex',
          gap: 4,
          borderBottom: '1px solid ' + GB.border,
          margin: '18px 0',
          flexWrap: 'wrap',
          alignItems: 'center',
        }}
      >
        {tabs.map((t) => {
          const on = tab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              style={{
                padding: '10px 16px',
                border: 'none',
                background: 'none',
                borderBottom: '2px solid ' + (on ? GB.navy : 'transparent'),
                color: on ? GB.navy : GB.textMuted,
                fontSize: 13.5,
                fontWeight: on ? 700 : 600,
                cursor: 'pointer',
              }}
            >
              {t.label}
              {t.id === 'gelen' && bekleyen > 0 && (
                <span style={{ ...gbPill(GB.amber, GB.amberLight), marginLeft: 8 }}>
                  {bekleyen}
                </span>
              )}
            </button>
          );
        })}
        {tab === 'gelen' && (
          <button
            type="button"
            onClick={() => setFiltre(filtre === 'acik' ? 'hepsi' : 'acik')}
            style={{
              marginLeft: 'auto',
              ...gbBtn(GB.border),
              color: GB.textMuted,
              padding: '5px 12px',
              fontSize: 12,
            }}
          >
            {filtre === 'acik' ? 'Tamamlananları da göster' : 'Yalnız açık olanlar'}
          </button>
        )}
        {msg && (
          <span style={{ marginLeft: 10, fontSize: 12, color: GB.green, fontWeight: 600 }}>
            {msg}
          </span>
        )}
      </div>

      {/* Yeni belge bildirimi */}
      {bildirim && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '10px 14px',
            marginBottom: 14,
            background: GB.amberLight,
            border: '1px solid ' + GB.amber + '55',
            borderRadius: 10,
            color: '#7c4a03',
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          🔔 {bildirim}
        </div>
      )}

      {/* Arama — fakülte genelinde çalışan memurun kutusu uzun olur */}
      {tab === 'gelen' && gelenTum.length > 5 && (
        <input
          value={arama}
          onChange={(e) => setArama(e.target.value)}
          placeholder="Ad soyad, öğrenci no veya kurum ara…"
          style={{
            width: '100%',
            padding: '9px 13px',
            marginBottom: 12,
            borderRadius: 9,
            border: '1px solid ' + GB.border,
            fontSize: 13,
            fontFamily: 'inherit',
            boxSizing: 'border-box',
          }}
        />
      )}

      {/* Modül sekmeleri — hangi modülden geldiyse ayrı sekme */}
      {tab === 'gelen' && modulSekmeleri.length > 1 && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
          {[{ id: 'hepsi', label: 'Tümü', bekleyen: 0 }].concat(modulSekmeleri).map((m) => {
            const on = modulFiltre === m.id;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => setModulFiltre(m.id)}
                style={{
                  padding: '6px 13px',
                  borderRadius: 20,
                  border: '1px solid ' + (on ? GB.navy : GB.border),
                  background: on ? GB.navy : 'white',
                  color: on ? 'white' : GB.textMuted,
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                {m.label}
                {m.bekleyen > 0 && (
                  <span
                    style={{
                      marginLeft: 6,
                      background: on ? 'rgba(255,255,255,0.25)' : GB.amberLight,
                      color: on ? 'white' : GB.amber,
                      borderRadius: 9,
                      padding: '0 6px',
                      fontSize: 10.5,
                    }}
                  >
                    {m.bekleyen}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Belge türü alt sekmeleri — muafiyet ve ÇAP/Yandal birden çok tür
          ürettiği için belgeler burada ayrılır, karışmaz. */}
      {tab === 'gelen' && turSekmeleri.length > 1 && (
        <div
          style={{
            display: 'flex',
            gap: 6,
            flexWrap: 'wrap',
            marginBottom: 14,
            paddingLeft: 2,
          }}
        >
          {[{ id: 'hepsi', label: 'Tümü', bekleyen: 0 }].concat(turSekmeleri).map((t) => {
            const on = turFiltre === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTurFiltre(t.id)}
                style={{
                  padding: '5px 12px',
                  borderRadius: 16,
                  border: '1px solid ' + (on ? GB.accent : GB.border),
                  background: on ? GB.accentPale : 'white',
                  color: on ? GB.accent : GB.textMuted,
                  fontSize: 11.5,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                {t.label}
                {t.bekleyen > 0 && (
                  <span
                    style={{
                      marginLeft: 6,
                      background: GB.amberLight,
                      color: GB.amber,
                      borderRadius: 9,
                      padding: '0 6px',
                      fontSize: 10.5,
                    }}
                  >
                    {t.bekleyen}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Başka bölümde bekleyen belge var mı? Sağdaki bölüm seçimi yüzünden
          kaybolmuş gibi görünen işler burada sayılır. */}
      {tab === 'gelen' && baskaBolumler.length > 0 && (
        <div
          style={{
            marginBottom: 14,
            padding: '10px 14px',
            borderRadius: 10,
            background: '#EFF6FF',
            border: '1px solid #BFDBFE',
            color: '#1E40AF',
            fontSize: 12.5,
            lineHeight: 1.55,
          }}
        >
          <strong>Başka bölümlerde bekleyen belge var:</strong>{' '}
          {baskaBolumler.map((b, i) => (
            <span key={b.bolum}>
              {i > 0 ? ' · ' : ''}
              {bolumAdi(b.bolum)} ({b.sayi})
            </span>
          ))}
          . Görmek için sağdaki bölüm listesinden o bölümü seçin.
        </div>
      )}

      {tab === 'gelen' &&
        (gelen.length === 0 ? (
          bosKutu(
            // Atamasız memur boş listenin SEBEBİNİ görsün: eskiden yetkisi
            // olmadığı bölümün belgeleri listeleniyordu, şimdi liste boş
            // kalıyor — nedeni söylenmezse "belge kayboldu" sanılır.
            atamasizBolum
              ? 'Bu bölümde size atanmış modül yok. Bölüm yetkilisi sizi ' +
                  'Bölüm Yönetimi → Memurlar ekranından ilgili modüle atadığında ' +
                  'belgeler burada görünür. Başka bir bölüme atandıysanız sağ ' +
                  'taraftan o bölümü seçin.'
              : filtre === 'acik'
                ? 'Bekleyen belgeniz yok. Tamamlananları görmek için sağ üstteki düğmeyi kullanın.'
                : 'Size yönlendirilmiş belge bulunmuyor.'
          )
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {gelen.map((it, i) => (
              <GbKart
                key={(it.doc.id || i) + '_' + it.index}
                item={it}
                onDurum={setDurum}
                onSil={isStudent ? null : silBelge}
                busy={busy}
              />
            ))}
          </div>
        ))}

      {tab === 'giden' &&
        !isStudent &&
        (gonderdiklerim.length === 0 ? (
          bosKutu('Bölümünüzden yönlendirilmiş belge bulunmuyor.')
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {gonderdiklerim.map((d, i) => (
              <GbGonderdigimKart key={d.id || i} doc={d} />
            ))}
          </div>
        ))}
    </div>
  );
}

window.GelenBelgelerApp = GelenBelgelerApp;
