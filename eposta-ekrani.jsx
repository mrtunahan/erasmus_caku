// ══════════════════════════════════════════════════════════════
// HESAP E-POSTASI ve ŞİFREMİ UNUTTUM — arayüz
//
//   EpostaPenceresi       → adres ekle/değiştir (kodla doğrulama). Girişte
//                           doğrulanmış adresi olmayan kullanıcıya ZORUNLU
//                           açılır; sol menüdeki "E-posta Adresim"den de açılır.
//   SifremiUnuttumPaneli  → giriş ekranında e-posta ile yenileme bağlantısı
//   SifreYenilePaneli     → e-postadaki bağlantının açtığı yeni şifre ekranı
//
// Sunucu: server/routes/eposta.js · Kural: server/lib/eposta-kurali.js
//
// ⚠ BAĞLANTI JETONU ADRES ÇUBUĞUNDA KALMAZ. E-postadaki bağlantı
// `/panel/#sifre-yenile=<jeton>` biçimindedir (# sonrası sunucuya hiç
// gitmez). Bu dosya uygulama kabuğundan ÖNCE yüklenir: jetonu alır, adresten
// siler ve tarayıcıdaki eski oturumu kapatır — yeni şifre belirlenince eski
// oturumlar zaten geçersiz olacaktır.
// ══════════════════════════════════════════════════════════════

const { useEffect, useState, useCallback } = React;

(function jetonuAl() {
  try {
    const m = /^#sifre-yenile=([A-Za-z0-9_-]{40,64})$/.exec(window.location.hash || '');
    if (!m) return;
    window.__sifreYenileJetonu = m[1];
    window.history.replaceState(null, '', window.location.pathname + window.location.search);
    ['caku_auth_token', 'caku_oturum', 'caku_current_user'].forEach((k) => {
      try {
        localStorage.removeItem(k);
      } catch (_) {
        /* depolama kapalı */
      }
    });
    fetch('/api/auth/logout', { method: 'POST', credentials: 'include' }).catch(() => {});
  } catch (_) {
    /* adres okunamadıysa normal açılış */
  }
})();

const metin = (v) => String(v == null ? '' : v).trim();
const EPOSTA_KALIBI = /^[A-Za-z0-9._%+-]{1,64}@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,24}$/;

async function epostaIstek(yol, govde) {
  const r = await fetch('/api/eposta' + yol, {
    method: govde ? 'POST' : 'GET',
    credentials: 'include',
    headers: Object.assign(
      govde ? { 'Content-Type': 'application/json' } : {},
      window.yoklamaBasliklari ? window.yoklamaBasliklari() : {}
    ),
    body: govde ? JSON.stringify(govde) : undefined,
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) {
    const e = new Error(j.error || 'İşlem yapılamadı (' + r.status + ').');
    e.status = r.status;
    throw e;
  }
  return j;
}

/** Oturumdaki kullanıcının e-posta durumu (kabuk zorunlu pencereyi buna göre açar). */
export function useEpostaDurumu(currentUser) {
  const [durum, setDurum] = useState(null);
  const anahtar = currentUser
    ? (currentUser.aday ? 'aday' : currentUser.role) + ':' + (currentUser.identifier || '')
    : '';
  const yenile = useCallback(() => {
    if (!anahtar) {
      setDurum(null);
      return Promise.resolve(null);
    }
    return epostaIstek('/durum')
      .then((d) => {
        setDurum(d);
        return d;
      })
      .catch((e) => {
        // Oturum sunucuda sonlandırıldıysa (şifre başka yerden yenilendi)
        // ekran bozuk veriyle açık kalmasın: kabuk giriş ekranına döner.
        if (e && e.status === 401 && window.__oturumSonlandi) window.__oturumSonlandi();
        // Başka bir hatada kullanıcı engellenmez (sunucu tarafı sorun olabilir).
        setDurum(null);
        return null;
      });
  }, [anahtar]);
  useEffect(() => {
    yenile();
    if (!anahtar) return undefined;
    // Sekme öne gelince ve 5 dakikada bir yeniden bakılır: şifresi başka
    // cihazdan yenilenen hesabın açık kalmış sekmesi böylece kapanır.
    const odak = () => {
      if (document.visibilityState === 'visible') yenile();
    };
    document.addEventListener('visibilitychange', odak);
    const t = setInterval(yenile, 5 * 60 * 1000);
    return () => {
      document.removeEventListener('visibilitychange', odak);
      clearInterval(t);
    };
  }, [yenile, anahtar]);
  return [durum, yenile];
}

// ── ortak görünüm (açık zemin pencere) ──
const R = {
  navy: '#1B2A4A',
  teal: '#0F766E',
  tealKoyu: '#115E59',
  tealSolgun: '#F0FDFA',
  metin: '#1E293B',
  soluk: '#64748B',
  kenar: '#E2E8F0',
  hata: '#B91C1C',
  hataZemin: '#FEF2F2',
};
const girdi = {
  width: '100%',
  boxSizing: 'border-box',
  padding: '11px 14px',
  borderRadius: 10,
  border: '1px solid #CBD5E1',
  fontSize: 15,
  outline: 'none',
  fontFamily: 'inherit',
  color: R.metin,
  background: '#FFFFFF',
};
const birincil = (pasif) => ({
  width: '100%',
  padding: '12px 16px',
  borderRadius: 10,
  border: 'none',
  background: pasif ? '#CBD5E1' : R.teal,
  color: '#FFFFFF',
  fontSize: 14.5,
  fontWeight: 700,
  cursor: pasif ? 'not-allowed' : 'pointer',
  fontFamily: 'inherit',
});
const bagDugme = {
  background: 'none',
  border: 'none',
  padding: 0,
  color: R.teal,
  fontWeight: 600,
  fontSize: 13,
  cursor: 'pointer',
  fontFamily: 'inherit',
};

function Hata({ mesaj }) {
  if (!mesaj) return null;
  return (
    <div
      role="alert"
      data-eposta-hata
      style={{
        background: R.hataZemin,
        border: '1px solid #FECACA',
        color: R.hata,
        borderRadius: 10,
        padding: '9px 12px',
        fontSize: 13,
        lineHeight: 1.45,
      }}
    >
      {mesaj}
    </div>
  );
}

/**
 * Adres ekleme / değiştirme penceresi.
 * zorunlu: kapatılamaz; yalnız "Çıkış yap" vardır.
 */
export function EpostaPenceresi({ durum, zorunlu, onTamam, onKapat, onCikis }) {
  const dogrulu = !!(durum && durum.dogrulandi);
  const [adim, setAdim] = useState(() =>
    durum && durum.bekleyen ? 'kod' : dogrulu ? 'ozet' : 'adres'
  );
  const [eposta, setEposta] = useState(() => (durum && (durum.bekleyen || durum.oneri)) || '');
  const [kod, setKod] = useState('');
  const [hata, setHata] = useState('');
  const [mesgul, setMesgul] = useState(false);
  const [bekle, setBekle] = useState(0);

  useEffect(() => {
    if (bekle <= 0) return undefined;
    const t = setTimeout(() => setBekle((b) => b - 1), 1000);
    return () => clearTimeout(t);
  }, [bekle]);

  const kodGonder = async (e) => {
    if (e) e.preventDefault();
    setHata('');
    const adres = metin(eposta).toLowerCase();
    if (!EPOSTA_KALIBI.test(adres)) {
      setHata('Geçerli bir e-posta adresi yazın (ör. ad.soyad@karatekin.edu.tr ya da Gmail).');
      return;
    }
    setMesgul(true);
    try {
      await epostaIstek('/kod-gonder', { eposta: adres });
      setEposta(adres);
      setKod('');
      setAdim('kod');
      setBekle(60);
    } catch (err) {
      setHata(err.message);
    } finally {
      setMesgul(false);
    }
  };

  const dogrula = async (e) => {
    e.preventDefault();
    setHata('');
    if (!/^\d{6}$/.test(kod)) {
      setHata('Kod 6 haneli bir sayıdır.');
      return;
    }
    setMesgul(true);
    try {
      const j = await epostaIstek('/dogrula', { kod });
      setEposta(j.eposta);
      setAdim('tamam');
    } catch (err) {
      setHata(err.message);
    } finally {
      setMesgul(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="E-posta adresi"
      data-eposta-pencere
      data-zorunlu={zorunlu ? '1' : '0'}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100000,
        background: 'rgba(15,23,42,0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        fontFamily: "'Inter', sans-serif",
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 460,
          background: '#FFFFFF',
          borderRadius: 16,
          boxShadow: '0 24px 60px rgba(15,23,42,0.3)',
          overflow: 'hidden',
        }}
      >
        <div style={{ background: R.navy, padding: '18px 22px', color: '#FFFFFF' }}>
          <div style={{ fontSize: 17, fontWeight: 700 }}>
            {adim === 'ozet' ? 'E-posta adresim' : 'E-posta adresinizi doğrulayın'}
          </div>
          <div style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.72)', marginTop: 3 }}>
            Şifrenizi unutursanız yenileme bağlantısı bu adrese gönderilir.
          </div>
        </div>

        <div style={{ padding: 22, display: 'flex', flexDirection: 'column', gap: 14 }}>
          {adim === 'ozet' && (
            <>
              <div
                style={{
                  padding: '12px 14px',
                  borderRadius: 10,
                  background: R.tealSolgun,
                  border: '1px solid #99F6E4',
                  color: R.tealKoyu,
                  fontSize: 14,
                  fontWeight: 600,
                  wordBreak: 'break-all',
                }}
                data-eposta-mevcut
              >
                ✓ {durum.eposta}
              </div>
              <button
                type="button"
                style={birincil(false)}
                onClick={() => {
                  setEposta('');
                  setAdim('adres');
                }}
              >
                Adresi değiştir
              </button>
            </>
          )}

          {adim === 'adres' && (
            <form
              onSubmit={kodGonder}
              noValidate
              style={{ display: 'flex', flexDirection: 'column', gap: 14 }}
            >
              {zorunlu && (
                <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.55, color: R.metin }}>
                  Devam etmeden önce hesabınıza bir e-posta adresi bağlamanız gerekiyor. Kurumsal
                  adresinizi (@karatekin.edu.tr) ya da Gmail, Outlook gibi kişisel adresinizi
                  kullanabilirsiniz.
                </p>
              )}
              <label style={{ fontSize: 12.5, fontWeight: 600, color: R.soluk }}>
                E-posta adresi
                <input
                  type="email"
                  value={eposta}
                  onChange={(e) => setEposta(e.target.value)}
                  placeholder="ornek@karatekin.edu.tr"
                  autoComplete="email"
                  style={{ ...girdi, marginTop: 6 }}
                  data-eposta-adres
                />
              </label>
              <Hata mesaj={hata} />
              <button
                type="submit"
                style={birincil(mesgul)}
                disabled={mesgul}
                data-eposta-kod-gonder
              >
                {mesgul ? 'Gönderiliyor…' : 'Doğrulama kodu gönder'}
              </button>
              {dogrulu && (
                <button type="button" style={bagDugme} onClick={() => setAdim('ozet')}>
                  Vazgeç
                </button>
              )}
            </form>
          )}

          {adim === 'kod' && (
            <form onSubmit={dogrula} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.55, color: R.metin }}>
                <b style={{ wordBreak: 'break-all' }}>{eposta}</b> adresine 6 haneli bir kod
                gönderdik. Gelmediyse istenmeyen (spam) klasörüne bakın.
              </p>
              <input
                value={kod}
                onChange={(e) => setKod(e.target.value.replace(/\D/g, '').slice(0, 6))}
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="••••••"
                aria-label="Doğrulama kodu"
                style={{
                  ...girdi,
                  textAlign: 'center',
                  fontSize: 26,
                  letterSpacing: 10,
                  fontWeight: 700,
                }}
                data-eposta-kod
              />
              <Hata mesaj={hata} />
              <button type="submit" style={birincil(mesgul)} disabled={mesgul} data-eposta-dogrula>
                {mesgul ? 'Doğrulanıyor…' : 'Doğrula'}
              </button>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                <button
                  type="button"
                  style={{ ...bagDugme, color: bekle > 0 ? R.soluk : R.teal }}
                  disabled={bekle > 0 || mesgul}
                  onClick={() => kodGonder()}
                >
                  {bekle > 0 ? 'Yeniden gönder (' + bekle + ' sn)' : 'Kodu yeniden gönder'}
                </button>
                <button
                  type="button"
                  style={bagDugme}
                  onClick={() => {
                    setHata('');
                    setAdim('adres');
                  }}
                >
                  Adresi değiştir
                </button>
              </div>
            </form>
          )}

          {adim === 'tamam' && (
            <>
              <div
                style={{
                  padding: '14px',
                  borderRadius: 10,
                  background: '#ECFDF5',
                  border: '1px solid #A7F3D0',
                  color: '#047857',
                  fontSize: 14,
                  lineHeight: 1.5,
                }}
                data-eposta-tamam
              >
                <b>E-posta adresiniz doğrulandı.</b>
                <br />
                <span style={{ wordBreak: 'break-all' }}>{eposta}</span>
              </div>
              <button type="button" style={birincil(false)} onClick={() => onTamam && onTamam()}>
                Devam et
              </button>
            </>
          )}

          <div
            style={{
              borderTop: `1px solid ${R.kenar}`,
              paddingTop: 12,
              display: 'flex',
              justifyContent: 'center',
            }}
          >
            {zorunlu ? (
              adim !== 'tamam' && (
                <button type="button" style={{ ...bagDugme, color: R.soluk }} onClick={onCikis}>
                  Çıkış yap
                </button>
              )
            ) : (
              <button
                type="button"
                style={{ ...bagDugme, color: R.soluk }}
                onClick={() => (adim === 'tamam' ? onTamam && onTamam() : onKapat && onKapat())}
              >
                Kapat
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Giriş ekranı panelleri (koyu cam kart; lg-* sınıfları LoginModal'da) ──

function LgHata({ mesaj }) {
  if (!mesaj) return null;
  return (
    <div className="lg-error" style={{ marginBottom: 0 }} data-eposta-hata>
      {mesaj}
    </div>
  );
}

const lgBilgi = {
  background: 'rgba(46, 196, 182, 0.10)',
  border: '1px solid rgba(46, 196, 182, 0.30)',
  borderRadius: 10,
  padding: '12px 14px',
  fontSize: 13,
  color: 'rgba(255, 255, 255, 0.85)',
  lineHeight: 1.55,
};

export function SifremiUnuttumPaneli({ onGeri }) {
  const [eposta, setEposta] = useState('');
  const [hata, setHata] = useState('');
  const [mesaj, setMesaj] = useState('');
  const [mesgul, setMesgul] = useState(false);

  const gonder = async (e) => {
    e.preventDefault();
    setHata('');
    const adres = metin(eposta).toLowerCase();
    if (!EPOSTA_KALIBI.test(adres)) {
      setHata('Hesabınıza bağlı e-posta adresini yazın.');
      return;
    }
    setMesgul(true);
    try {
      const j = await epostaIstek('/sifremi-unuttum', { eposta: adres });
      setMesaj(j.mesaj || 'Bağlantı gönderildi.');
    } catch (err) {
      setHata(err.message);
    } finally {
      setMesgul(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }} data-sifremi-unuttum-panel>
      <div style={{ color: '#FFFFFF', fontSize: 17, fontWeight: 700, textAlign: 'center' }}>
        Şifremi unuttum
      </div>
      {mesaj ? (
        <div style={lgBilgi} data-sifremi-unuttum-mesaj>
          {mesaj}
        </div>
      ) : (
        <form
          onSubmit={gonder}
          noValidate
          style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
        >
          <div style={lgBilgi}>
            Hesabınıza bağladığınız e-posta adresini yazın; şifrenizi yenilemeniz için bir bağlantı
            gönderelim. Öğrenci, akademisyen, personel ve aday hesapları için aynıdır. Yalnız
            uygulamada kodla doğruladığınız adrese gönderilir; adresinizi hiç doğrulamadıysanız
            şifrenizi bölüm yetkilinize veya yöneticiye sıfırlatın.
          </div>
          <div>
            <label className="lg-label">E-posta adresi</label>
            <input
              className="lg-input"
              type="email"
              value={eposta}
              onChange={(e) => setEposta(e.target.value)}
              placeholder="ornek@karatekin.edu.tr"
              autoComplete="email"
              data-sifremi-unuttum-eposta
            />
          </div>
          <LgHata mesaj={hata} />
          <button
            type="submit"
            className="lg-btn lg-btn-primary"
            disabled={mesgul}
            data-sifremi-unuttum-gonder
          >
            {mesgul ? 'Gönderiliyor…' : 'Yenileme bağlantısı gönder'}
          </button>
        </form>
      )}
      <div className="lg-hint" style={{ textAlign: 'center', marginTop: 0 }}>
        Hesabınıza e-posta bağlamadıysanız şifrenizi bölüm sekreterliği sıfırlar.
      </div>
      <button
        type="button"
        className="lg-btn lg-btn-secondary"
        style={{ padding: '10px 16px', fontSize: 13 }}
        onClick={onGeri}
        data-sifremi-unuttum-geri
      >
        ← Girişe dön
      </button>
    </div>
  );
}

export function SifreYenilePaneli({ jeton, onBitti }) {
  const [kontrol, setKontrol] = useState({ yukleniyor: true });
  const [sifre, setSifre] = useState('');
  const [sifre2, setSifre2] = useState('');
  const [hata, setHata] = useState('');
  const [mesgul, setMesgul] = useState(false);
  const [tamam, setTamam] = useState(false);

  useEffect(() => {
    let canli = true;
    epostaIstek('/sifre-yenile/kontrol', { jeton })
      .then((j) => canli && setKontrol(j))
      .catch(() => canli && setKontrol({ gecerli: false }));
    return () => {
      canli = false;
    };
  }, [jeton]);

  const kaydet = async (e) => {
    e.preventDefault();
    setHata('');
    if (sifre.length < 6) {
      setHata('Şifre en az 6 karakter olmalıdır.');
      return;
    }
    if (sifre !== sifre2) {
      setHata('Şifreler eşleşmiyor.');
      return;
    }
    setMesgul(true);
    try {
      await epostaIstek('/sifre-yenile', { jeton, sifre, sifre2 });
      window.__sifreYenileJetonu = null;
      setTamam(true);
    } catch (err) {
      setHata(err.message);
    } finally {
      setMesgul(false);
    }
  };

  const bitir = () => {
    window.__sifreYenileJetonu = null;
    onBitti && onBitti();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }} data-sifre-yenile-panel>
      <div style={{ color: '#FFFFFF', fontSize: 17, fontWeight: 700, textAlign: 'center' }}>
        Yeni şifre belirleyin
      </div>
      {kontrol.yukleniyor ? (
        <div className="lg-hint" style={{ textAlign: 'center' }}>
          Bağlantı denetleniyor…
        </div>
      ) : tamam ? (
        <>
          <div style={lgBilgi} data-sifre-yenile-tamam>
            Şifreniz yenilendi. Açık oturumlarınız kapatıldı; yeni şifrenizle giriş yapabilirsiniz.
          </div>
          <button type="button" className="lg-btn lg-btn-primary" onClick={bitir}>
            Giriş ekranına dön
          </button>
        </>
      ) : !kontrol.gecerli ? (
        <>
          <LgHata mesaj="Bu bağlantının süresi dolmuş ya da daha önce kullanılmış. Giriş ekranındaki “Şifremi unuttum” ile yeni bağlantı isteyin." />
          <button type="button" className="lg-btn lg-btn-primary" onClick={bitir}>
            Giriş ekranına dön
          </button>
        </>
      ) : (
        <form onSubmit={kaydet} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={lgBilgi}>
            Hesap: <b data-sifre-yenile-hesap>{kontrol.hesap}</b>
          </div>
          <div>
            <label className="lg-label">Yeni şifre</label>
            <input
              className="lg-input"
              type="password"
              value={sifre}
              onChange={(e) => setSifre(e.target.value)}
              autoComplete="new-password"
              placeholder="En az 6 karakter"
              data-sifre-yenile-1
            />
          </div>
          <div>
            <label className="lg-label">Yeni şifre tekrar</label>
            <input
              className="lg-input"
              type="password"
              value={sifre2}
              onChange={(e) => setSifre2(e.target.value)}
              autoComplete="new-password"
              placeholder="Şifrenizi tekrar girin"
              data-sifre-yenile-2
            />
          </div>
          <LgHata mesaj={hata} />
          <button
            type="submit"
            className="lg-btn lg-btn-primary"
            disabled={mesgul}
            data-sifre-yenile-kaydet
          >
            {mesgul ? 'Kaydediliyor…' : 'Şifremi kaydet'}
          </button>
          <button
            type="button"
            className="lg-btn lg-btn-secondary"
            style={{ padding: '10px 16px', fontSize: 13 }}
            onClick={bitir}
          >
            Vazgeç
          </button>
        </form>
      )}
    </div>
  );
}

window.useEpostaDurumu = useEpostaDurumu;
window.EpostaPenceresi = EpostaPenceresi;
window.SifremiUnuttumPaneli = SifremiUnuttumPaneli;
window.SifreYenilePaneli = SifreYenilePaneli;
