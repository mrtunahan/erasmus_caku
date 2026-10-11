// ══════════════════════════════════════════════════════════════
// ADAY HESABI EKRANLARI
//
//   AdayGirisPaneli      → giriş ekranındaki "Aday" sekmesi (giriş + kayıt)
//   AdaySifreDegistir    → geçici şifreyle girene zorunlu şifre değişimi
//   AdayHesaplariPaneli  → personel: aday listesi, şifre sıfırlama,
//                          öğrenci numarasına aktarma, hesap kapatma
//
// Kural: lib/aday-hesap.js · Sunucu: server/routes/aday.js
// ══════════════════════════════════════════════════════════════
import {
  adayModulleri,
  adayYatayTurleri,
  ADAY_TURLERI,
  ADAY_KVKK_SURUM,
  adayAydinlatmaMetni,
  adayKayitHatalari,
  adayKaydiSadele,
} from './lib/aday-hesap.js';

const { useEffect, useMemo, useState } = React;

const metin = (v) => String(v == null ? '' : v).trim();

async function adayIstek(yol, govde) {
  const r = await fetch('/api/aday' + yol, {
    method: govde ? 'POST' : 'GET',
    credentials: 'include',
    headers: Object.assign(
      govde ? { 'Content-Type': 'application/json' } : {},
      window.yoklamaBasliklari ? window.yoklamaBasliklari() : {}
    ),
    body: govde ? JSON.stringify(govde) : undefined,
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok && !j.error) j.error = 'Sunucu hatası (' + r.status + ').';
  return { ok: r.ok, status: r.status, ...j };
}

/** Sunucunun döndürdüğü aday → uygulamanın oturum kullanıcısı. */
export function adayOturumKullanicisi(a) {
  return {
    // Arayüzde aday ÖĞRENCİ görünümünü kullanır (kendi başvurusu, kendi
    // talebi); `aday: true` menüyü ve modül türlerini daraltır. Yetki
    // kararını sunucu verir (server/lib/aday-yetki.js).
    role: 'student',
    aday: true,
    name: (metin(a.ad) + ' ' + metin(a.soyad)).trim(),
    identifier: a.adayNo,
    studentNumber: a.adayNo,
    adayNo: a.adayNo,
    departmentId: a.departmentId,
    departmentName: a.departmentName || '',
    turler: Array.isArray(a.turler) ? a.turler : [],
    sifreDegistirmeli: !!a.sifreDegistirmeli,
  };
}

const kutu = {
  display: 'flex',
  flexDirection: 'column',
  gap: 14,
};

function Alan({ etiket, hata, children }) {
  return (
    <div>
      <label className="lg-label">{etiket}</label>
      {children}
      {hata && (
        <div style={{ color: '#B91C1C', fontSize: 12.5, marginTop: 5 }} data-aday-hata>
          {hata}
        </div>
      )}
    </div>
  );
}

// ── Giriş ekranı: Aday sekmesi ──
export function AdayGirisPaneli({ onLogin }) {
  const [mod, setMod] = useState('giris'); // giris | kayit
  const [hata, setHata] = useState('');
  const [mesgul, setMesgul] = useState(false);
  const [tc, setTc] = useState('');
  const [sifre, setSifre] = useState('');
  const [f, setF] = useState({
    ad: '',
    soyad: '',
    tc: '',
    eposta: '',
    telefon: '',
    turler: [],
    departmentId: '',
    sifre: '',
    sifre2: '',
    kvkk: false,
  });
  const [denendi, setDenendi] = useState(false);
  const [bolumler, setBolumler] = useState([]);
  const [metinAcik, setMetinAcik] = useState(false);
  const set = (k, v) => setF((o) => ({ ...o, [k]: v }));

  useEffect(() => {
    if (mod !== 'kayit' || bolumler.length) return;
    fetch('/api/db/departments')
      .then((r) => r.json())
      .then((d) =>
        setBolumler(
          (Array.isArray(d) ? d : [])
            .map((b) => ({ id: metin(b._docId || b.id), ad: metin(b.name) }))
            .filter((b) => b.id && b.ad)
            .sort((a, b) => a.ad.localeCompare(b.ad, 'tr'))
        )
      )
      .catch(() => setBolumler([]));
  }, [mod, bolumler.length]);

  const hatalar = useMemo(() => adayKayitHatalari(f), [f]);

  const tamamla = (j) => {
    if (window.oturumBilgisiniYaz && j.token) window.oturumBilgisiniYaz(j.token);
    onLogin(adayOturumKullanicisi(j.aday));
  };

  const girisYap = async (e) => {
    e.preventDefault();
    setHata('');
    if (!/^\d{11}$/.test(tc.trim()) || !sifre) {
      setHata('T.C. kimlik numaranızı (11 hane) ve şifrenizi girin.');
      return;
    }
    setMesgul(true);
    try {
      const j = await adayIstek('/giris', { tc: tc.trim(), sifre });
      if (!j.success) setHata(j.error || 'Giriş yapılamadı.');
      else tamamla(j);
    } catch (_e) {
      setHata('Sunucuya ulaşılamadı.');
    } finally {
      setMesgul(false);
    }
  };

  const kayitOl = async (e) => {
    e.preventDefault();
    setDenendi(true);
    setHata('');
    if (Object.keys(hatalar).length) {
      setHata('Lütfen işaretli alanları düzeltin.');
      return;
    }
    setMesgul(true);
    try {
      const j = await adayIstek('/kayit', {
        ...adayKaydiSadele(f),
        sifre: f.sifre,
        kvkk: f.kvkk === true,
        kvkkSurum: ADAY_KVKK_SURUM,
      });
      if (!j.success) setHata(j.error || 'Kayıt yapılamadı.');
      else tamamla(j);
    } catch (_e) {
      setHata('Sunucuya ulaşılamadı.');
    } finally {
      setMesgul(false);
    }
  };

  const h = (k) => (denendi ? hatalar[k] : '');
  const turSec = (id) =>
    set('turler', f.turler.includes(id) ? f.turler.filter((t) => t !== id) : f.turler.concat(id));

  const bilgi = (
    <div
      style={{
        background: '#F0FDFA',
        border: '1px solid #99F6E4',
        borderRadius: 10,
        padding: '10px 12px',
        fontSize: 12.5,
        color: '#115E59',
        lineHeight: 1.5,
        marginBottom: 14,
      }}
    >
      Henüz öğrenci numaranız yoksa (dikey geçiş, kurumlararası yatay geçiş ya da merkezi
      yerleştirme puanıyla yatay geçiş adayı) buradan hesap açıp başvurunuzu yapabilirsiniz. Kesin
      kaydınız yapılınca başvurularınız öğrenci numaranıza aktarılır.
    </div>
  );

  if (mod === 'giris') {
    return (
      <form onSubmit={girisYap} style={kutu} data-aday-giris>
        {bilgi}
        {hata && <div className="lg-error">{hata}</div>}
        <Alan etiket="T.C. Kimlik No">
          <input
            className="lg-input"
            value={tc}
            onChange={(e) => setTc(e.target.value.replace(/\D/g, '').slice(0, 11))}
            placeholder="11 haneli T.C. kimlik numaranız"
            inputMode="numeric"
            autoComplete="username"
            data-aday-tc
          />
        </Alan>
        <Alan etiket="Şifre">
          <input
            className="lg-input"
            type="password"
            value={sifre}
            onChange={(e) => setSifre(e.target.value)}
            placeholder="Şifreniz"
            autoComplete="current-password"
            data-aday-sifre
          />
        </Alan>
        <button type="submit" className="lg-btn-primary" disabled={mesgul} data-aday-giris-btn>
          {mesgul ? 'Giriş yapılıyor…' : 'Aday Girişi'}
        </button>
        <button
          type="button"
          onClick={() => {
            setMod('kayit');
            setHata('');
          }}
          style={{
            background: 'none',
            border: 'none',
            color: '#0D9B8E',
            fontWeight: 600,
            cursor: 'pointer',
            fontSize: 13.5,
          }}
          data-aday-kayit-ac
        >
          Hesabım yok — aday hesabı oluştur
        </button>
        <div style={{ fontSize: 12, color: '#64748B', textAlign: 'center' }}>
          Şifrenizi unuttuysanız başvurduğunuz bölümün sekreterliğinden sıfırlatın.
        </div>
      </form>
    );
  }

  return (
    <form onSubmit={kayitOl} style={kutu} data-aday-kayit>
      {bilgi}
      {hata && <div className="lg-error">{hata}</div>}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <Alan etiket="Ad" hata={h('ad')}>
          <input
            className="lg-input"
            value={f.ad}
            onChange={(e) => set('ad', e.target.value)}
            data-k="ad"
          />
        </Alan>
        <Alan etiket="Soyad" hata={h('soyad')}>
          <input
            className="lg-input"
            value={f.soyad}
            onChange={(e) => set('soyad', e.target.value)}
            data-k="soyad"
          />
        </Alan>
      </div>
      <Alan etiket="T.C. Kimlik No" hata={h('tc')}>
        <input
          className="lg-input"
          value={f.tc}
          onChange={(e) => set('tc', e.target.value.replace(/\D/g, '').slice(0, 11))}
          inputMode="numeric"
          data-k="tc"
        />
      </Alan>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <Alan etiket="E-posta" hata={h('eposta')}>
          <input
            className="lg-input"
            type="email"
            value={f.eposta}
            onChange={(e) => set('eposta', e.target.value)}
            data-k="eposta"
          />
        </Alan>
        <Alan etiket="Cep telefonu" hata={h('telefon')}>
          <input
            className="lg-input"
            value={f.telefon}
            onChange={(e) => set('telefon', e.target.value)}
            placeholder="5XX XXX XX XX"
            inputMode="tel"
            data-k="telefon"
          />
        </Alan>
      </div>
      <Alan etiket="Başvuru türü" hata={h('turler')}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {ADAY_TURLERI.map((t) => (
            <label
              key={t.id}
              style={{
                display: 'flex',
                gap: 8,
                alignItems: 'flex-start',
                fontSize: 13.5,
                cursor: 'pointer',
                padding: '8px 10px',
                borderRadius: 8,
                border: '1px solid ' + (f.turler.includes(t.id) ? '#0D9B8E' : '#E2E8F0'),
                background: f.turler.includes(t.id) ? '#F0FDFA' : 'white',
              }}
            >
              <input
                type="checkbox"
                checked={f.turler.includes(t.id)}
                onChange={() => turSec(t.id)}
                data-tur={t.id}
                style={{ marginTop: 3 }}
              />
              <span>
                <b>{t.ad}</b>
                <span style={{ display: 'block', color: '#64748B', fontSize: 12 }}>
                  {t.aciklama}
                </span>
              </span>
            </label>
          ))}
        </div>
      </Alan>
      <Alan etiket="Başvurduğunuz / yerleştiğiniz bölüm" hata={h('departmentId')}>
        <select
          className="lg-input"
          value={f.departmentId}
          onChange={(e) => set('departmentId', e.target.value)}
          data-k="bolum"
        >
          <option value="">Bölüm seçin…</option>
          {bolumler.map((b) => (
            <option key={b.id} value={b.id}>
              {b.ad}
            </option>
          ))}
        </select>
      </Alan>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <Alan etiket="Şifre" hata={h('sifre')}>
          <input
            className="lg-input"
            type="password"
            value={f.sifre}
            onChange={(e) => set('sifre', e.target.value)}
            autoComplete="new-password"
            data-k="sifre"
          />
        </Alan>
        <Alan etiket="Şifre (tekrar)" hata={h('sifre2')}>
          <input
            className="lg-input"
            type="password"
            value={f.sifre2}
            onChange={(e) => set('sifre2', e.target.value)}
            autoComplete="new-password"
            data-k="sifre2"
          />
        </Alan>
      </div>
      <div style={{ fontSize: 12.5, color: '#475569' }}>
        <label style={{ display: 'flex', gap: 8, alignItems: 'flex-start', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={f.kvkk}
            onChange={(e) => set('kvkk', e.target.checked)}
            data-k="kvkk"
            style={{ marginTop: 2 }}
          />
          <span>
            <button
              type="button"
              onClick={() => setMetinAcik((v) => !v)}
              style={{
                background: 'none',
                border: 'none',
                padding: 0,
                color: '#0D9B8E',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Aday aydınlatma metnini
            </button>{' '}
            okudum.
          </span>
        </label>
        {h('kvkk') && <div style={{ color: '#B91C1C', marginTop: 4 }}>{h('kvkk')}</div>}
        {metinAcik && (
          <div
            style={{
              marginTop: 8,
              padding: 10,
              background: '#F8FAFC',
              border: '1px solid #E2E8F0',
              borderRadius: 8,
              lineHeight: 1.5,
            }}
          >
            {adayAydinlatmaMetni(window.TENANT && window.TENANT.universityName).map((p, i) => (
              <p key={i} style={{ margin: '0 0 6px' }}>
                {p}
              </p>
            ))}
          </div>
        )}
      </div>
      <button type="submit" className="lg-btn-primary" disabled={mesgul} data-aday-kayit-btn>
        {mesgul ? 'Hesap açılıyor…' : 'Aday hesabı oluştur'}
      </button>
      <button
        type="button"
        onClick={() => {
          setMod('giris');
          setHata('');
        }}
        style={{
          background: 'none',
          border: 'none',
          color: '#0D9B8E',
          fontWeight: 600,
          cursor: 'pointer',
          fontSize: 13.5,
        }}
      >
        Hesabım var — giriş yap
      </button>
    </form>
  );
}

// ── Geçici şifreyle giren aday şifresini değiştirmeden devam edemez ──
export function AdaySifreDegistir({ onTamam, onKapat, zorunlu = true }) {
  const [eski, setEski] = useState('');
  const [yeni, setYeni] = useState('');
  const [yeni2, setYeni2] = useState('');
  const [hata, setHata] = useState('');
  const [mesgul, setMesgul] = useState(false);
  const kaydet = async (e) => {
    e.preventDefault();
    const h = adayKayitHatalari({ sifre: yeni, sifre2: yeni2 });
    if (h.sifre || h.sifre2) {
      setHata(h.sifre || h.sifre2);
      return;
    }
    setMesgul(true);
    const j = await adayIstek('/sifre-degistir', { eski, yeni }).catch(() => ({}));
    setMesgul(false);
    if (!j.success) setHata(j.error || 'Şifre değiştirilemedi.');
    else onTamam();
  };
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15,23,42,0.55)',
        zIndex: 10000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
    >
      <form
        onSubmit={kaydet}
        style={{
          background: 'white',
          borderRadius: 14,
          padding: 22,
          width: '100%',
          maxWidth: 380,
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
        }}
        data-aday-sifre-degistir
      >
        <div style={{ fontWeight: 700, fontSize: 16, color: '#0F172A' }}>
          {zorunlu ? 'Şifrenizi belirleyin' : 'Şifre değiştir'}
        </div>
        {zorunlu && (
          <div style={{ fontSize: 13, color: '#475569' }}>
            Bölümünüzün verdiği geçici şifreyle giriş yaptınız. Devam etmek için kendi şifrenizi
            belirleyin.
          </div>
        )}
        {hata && <div style={{ color: '#B91C1C', fontSize: 13 }}>{hata}</div>}
        <input
          type="password"
          placeholder={zorunlu ? 'Geçici şifre' : 'Mevcut şifre'}
          value={eski}
          onChange={(e) => setEski(e.target.value)}
          style={inp}
        />
        <input
          type="password"
          placeholder="Yeni şifre (en az 8, harf ve rakam)"
          value={yeni}
          onChange={(e) => setYeni(e.target.value)}
          style={inp}
        />
        <input
          type="password"
          placeholder="Yeni şifre (tekrar)"
          value={yeni2}
          onChange={(e) => setYeni2(e.target.value)}
          style={inp}
        />
        <button type="submit" disabled={mesgul} style={dugme('#0D9B8E')}>
          {mesgul ? 'Kaydediliyor…' : 'Kaydet'}
        </button>
        {!zorunlu && onKapat && (
          <button type="button" onClick={onKapat} style={dugme('#64748B', false)}>
            Vazgeç
          </button>
        )}
      </form>
    </div>
  );
}

const inp = {
  padding: '10px 12px',
  borderRadius: 8,
  border: '1px solid #CBD5E1',
  fontSize: 14,
  fontFamily: 'inherit',
};
const dugme = (renk, dolu = true) => ({
  padding: '7px 12px',
  borderRadius: 8,
  border: '1px solid ' + renk,
  background: dolu ? renk : 'white',
  color: dolu ? 'white' : renk,
  fontSize: 12.5,
  fontWeight: 600,
  cursor: 'pointer',
  fontFamily: 'inherit',
  whiteSpace: 'nowrap',
});

const TUR_KISA = { dikey: 'Dikey', kurumlararasi: 'Kurumlararası', merkezi: 'Merkezi (Ek M.1)' };
const DURUM = {
  aktif: ['Aktif', '#047857', '#ECFDF5'],
  aktarildi: ['Öğrenciye aktarıldı', '#1D4ED8', '#EFF6FF'],
  kapali: ['Kapalı', '#6B7280', '#F3F4F6'],
};

// ── Personel: aday hesapları ──
export function AdayHesaplariPaneli({ activeDepartment, turler }) {
  const [liste, setListe] = useState([]);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [hata, setHata] = useState('');
  const [mesaj, setMesaj] = useState('');
  const [ara, setAra] = useState('');
  const [aktarilan, setAktarilan] = useState({}); // adayNo → girilen no

  const yukle = async () => {
    setYukleniyor(true);
    const j = await adayIstek(
      '/liste' + (activeDepartment ? '?bolum=' + encodeURIComponent(activeDepartment) : '')
    ).catch(() => ({ error: 'Sunucuya ulaşılamadı.' }));
    setYukleniyor(false);
    if (j.error) setHata(j.error);
    else {
      setHata('');
      setListe(j.adaylar || []);
    }
  };
  useEffect(() => {
    yukle();
  }, [activeDepartment]); // yukle her render'da yeniden kurulur; bölüm değişimi yeter

  const gorunen = liste.filter((a) => {
    if (Array.isArray(turler) && turler.length && !a.turler.some((t) => turler.includes(t)))
      return false;
    const q = ara.trim().toLocaleLowerCase('tr-TR');
    if (!q) return true;
    return (a.ad + ' ' + a.soyad + ' ' + a.adayNo + ' ' + a.eposta)
      .toLocaleLowerCase('tr-TR')
      .includes(q);
  });

  const sifirla = async (a) => {
    if (!window.confirm(a.ad + ' ' + a.soyad + ' için geçici şifre üretilsin mi?')) return;
    const j = await adayIstek('/sifre-sifirla', { adayNo: a.adayNo });
    if (j.success) {
      window.prompt(
        'Geçici şifre (adaya iletin; bir daha gösterilmez). Aday ilk girişte kendi şifresini belirler:',
        j.geciciSifre
      );
    } else alert(j.error || 'Sıfırlanamadı.');
  };
  const aktar = async (a) => {
    const no = metin(aktarilan[a.adayNo]);
    if (!/^\d{9}$/.test(no)) {
      alert('Kesin kayıtta verilen 9 haneli öğrenci numarasını girin.');
      return;
    }
    if (
      !window.confirm(
        a.adayNo +
          ' (' +
          a.ad +
          ' ' +
          a.soyad +
          ') adayının bütün başvuruları ' +
          no +
          ' numarasına aktarılacak ve aday hesabı kapanacak. Devam edilsin mi?'
      )
    )
      return;
    const j = await adayIstek('/numara-aktar', { adayNo: a.adayNo, ogrenciNo: no });
    if (j.success) {
      const t = j.tasinan || {};
      setMesaj(
        'Aktarıldı: ' +
          (t.yatay_gecis_basvurular || 0) +
          ' yatay geçiş, ' +
          (t.muafiyet_records || 0) +
          ' dikey geçiş kaydı.'
      );
      yukle();
    } else alert(j.error || 'Aktarılamadı.');
  };
  const kapat = async (a) => {
    if (!window.confirm(a.adayNo + ' aday hesabı kapatılsın mı? Aday bir daha giriş yapamaz.'))
      return;
    const j = await adayIstek('/kapat', { adayNo: a.adayNo });
    if (j.success) yukle();
    else alert(j.error || 'Kapatılamadı.');
  };

  return (
    <div
      style={{ background: 'white', borderRadius: 12, border: '1px solid #E5E7EB', padding: 16 }}
      data-aday-hesaplari
    >
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 220 }}>
          <div style={{ fontWeight: 700, color: '#0F172A' }}>Aday hesapları</div>
          <div style={{ fontSize: 12.5, color: '#64748B' }}>
            Öğrenci numarası olmadan kendi hesabını açan adaylar. Kesin kayıttan sonra numarasını
            girip aktarın; başvuruları öğrenci hesabına geçer.
          </div>
        </div>
        <input
          value={ara}
          onChange={(e) => setAra(e.target.value)}
          placeholder="Ad, aday no, e-posta…"
          style={{ ...inp, minWidth: 200 }}
        />
      </div>
      {hata && <div style={{ color: '#B91C1C', marginTop: 10 }}>{hata}</div>}
      {mesaj && (
        <div style={{ color: '#047857', marginTop: 10, fontSize: 13 }} data-aday-mesaj>
          {mesaj}
        </div>
      )}
      {yukleniyor ? (
        <div style={{ padding: 20, color: '#64748B' }}>Yükleniyor…</div>
      ) : gorunen.length === 0 ? (
        <div style={{ padding: 20, color: '#64748B' }}>Kayıtlı aday yok.</div>
      ) : (
        <div style={{ overflowX: 'auto', marginTop: 12 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ textAlign: 'left', color: '#64748B', fontSize: 11.5 }}>
                <th style={th}>Aday</th>
                <th style={th}>T.C.</th>
                <th style={th}>İletişim</th>
                <th style={th}>Türler</th>
                <th style={th}>Durum</th>
                <th style={th}>İşlem</th>
              </tr>
            </thead>
            <tbody>
              {gorunen.map((a) => {
                const d = DURUM[a.durum] || DURUM.aktif;
                return (
                  <tr
                    key={a.adayNo}
                    style={{ borderTop: '1px solid #F1F5F9' }}
                    data-aday-satir={a.adayNo}
                  >
                    <td style={td}>
                      <b>
                        {a.ad} {a.soyad}
                      </b>
                      <div style={{ color: '#64748B', fontSize: 12 }}>{a.adayNo}</div>
                    </td>
                    <td style={td}>{a.tcMaske}</td>
                    <td style={td}>
                      {a.eposta}
                      <div style={{ color: '#64748B', fontSize: 12 }}>{a.telefon}</div>
                    </td>
                    <td style={td}>{a.turler.map((t) => TUR_KISA[t] || t).join(', ')}</td>
                    <td style={td}>
                      <span
                        style={{
                          padding: '2px 8px',
                          borderRadius: 999,
                          fontSize: 11.5,
                          fontWeight: 600,
                          color: d[1],
                          background: d[2],
                        }}
                      >
                        {d[0]}
                        {a.durum === 'aktarildi' ? ' · ' + a.ogrenciNo : ''}
                      </span>
                    </td>
                    <td style={td}>
                      {a.durum === 'aktif' && (
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          <input
                            value={aktarilan[a.adayNo] || ''}
                            onChange={(e) =>
                              setAktarilan((o) => ({
                                ...o,
                                [a.adayNo]: e.target.value.replace(/\D/g, '').slice(0, 9),
                              }))
                            }
                            placeholder="Öğrenci no"
                            inputMode="numeric"
                            style={{ ...inp, width: 110, padding: '6px 8px', fontSize: 12.5 }}
                            data-aday-no-gir
                          />
                          <button style={dugme('#1D4ED8')} onClick={() => aktar(a)} data-aday-aktar>
                            Numaraya aktar
                          </button>
                          <button style={dugme('#0D9B8E', false)} onClick={() => sifirla(a)}>
                            Şifre sıfırla
                          </button>
                          <button style={dugme('#B91C1C', false)} onClick={() => kapat(a)}>
                            Kapat
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
const th = { padding: '6px 8px', fontWeight: 600 };
const td = { padding: '8px', verticalAlign: 'top' };

window.AdayGirisPaneli = AdayGirisPaneli;
window.AdaySifreDegistir = AdaySifreDegistir;
window.AdayHesaplariPaneli = AdayHesaplariPaneli;
window.adayOturumKullanicisi = adayOturumKullanicisi;
window.adayModulleri = adayModulleri;
window.adayYatayTurleri = adayYatayTurleri;
