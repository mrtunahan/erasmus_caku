// ══════════════════════════════════════════════════════════════
// ÇAKÜ — TTO (Teknoloji Transfer Ofisi) Modülü
//
// AKADEMİSYEN tarafı (1. aşama) ve TTO YÖNETİCİSİNİN gelen talepleri (2. aşama).
//   • Taleplerim   — kendi talepleri, durumları, PDF çıktısı
//   • Talep formu  — Üniversite ile İşbirliği Talep Formu (TTO-TF-001)
//   • Yol Haritası — talebin akışı (akademisyen → TTO birimi → karar)
//
// TTO birimine kayıtlı akademisyen (TTO yöneticisi) modülü açınca TTO
// Otomasyonu ekranları gelir (iş kayıtları, akademisyen ödemeleri, firmalar,
// oranlar — tto-otomasyon/). Kendi talepleri için oradan buraya geçer.
//
// Kurallar (zorunlu alanlar, durum geçişleri, akademisyenin dokunamayacağı
// TTO alanları, şablon değişkenleri) lib/tto-talep.js'te; sunucu aynı
// dosyayla karar verir (server/routes/db.js).
//
// Süreç (başvuru → onay → proforma → firma → Genel Sekreterlik →
// görevlendirme → fatura), belge yükleme ve PDF çıktısı tto-surec.jsx'te.
// ══════════════════════════════════════════════════════════════
import {
  TTO_GENEL_ALANLAR,
  TTO_NITELIKLER,
  TTO_PROJE_ALANLAR,
  TTO_OZET_SINIRI,
  akademisyenDuzenleyebilirMi,
  bosTalep,
  profildenGenelBilgi,
  TTO_PROFIL_ALANLARI,
  projeBilgisiGerekliMi,
  talepHatalari,
  ttoAyarlari,
  talepBasligi,
  TTO_YONETICIDE_BEKLEYEN,
  TTO_AKADEMISYENDE_BEKLEYEN,
} from './lib/tto-talep.js';
import TtoOtomasyon from './tto-otomasyon/App.jsx';
import {
  T,
  kart,
  giris,
  etiket,
  dugme,
  pasif,
  KartBaslik,
  metin,
  tarihTr,
  DurumCipi,
} from './tto-stil.jsx';
import {
  formIndir,
  GonderimKarti,
  AkademisyenSurecKarti,
  BelgeListesi,
  YoneticiSurecPaneli,
} from './tto-surec.jsx';

const { useState, useEffect, useCallback, useMemo } = React;

// ══════════════════════════════════════════════════════════════
// TALEP FORMU
// ══════════════════════════════════════════════════════════════
function Bolum({ baslik, aciklama, children, uyari }) {
  return (
    <div style={kart}>
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 14, fontWeight: 800, color: T.navy, letterSpacing: 0.2 }}>
          {baslik}
        </div>
        {aciklama && (
          <div
            style={{
              fontSize: 12.5,
              color: uyari ? T.vurgu : T.soluk,
              marginTop: 3,
              lineHeight: 1.5,
            }}
          >
            {aciklama}
          </div>
        )}
      </div>
      {children}
    </div>
  );
}

function EvetHayir({ ad, deger, onChange, kilitli }) {
  return (
    <div style={{ display: 'flex', gap: 18 }}>
      {[
        ['evet', 'Evet'],
        ['hayir', 'Hayır'],
      ].map(([v, l]) => (
        <label
          key={v}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            fontSize: 13.5,
            cursor: 'pointer',
          }}
        >
          <input
            type="radio"
            name={ad}
            checked={deger === v}
            disabled={kilitli}
            onChange={() => onChange(v)}
          />
          {l}
        </label>
      ))}
    </div>
  );
}

// Akademisyenin bölüm adı (profil kaydındaki kimlik; bölüm birden çok
// kimlikle anılabildiği için `kimlikler` de denenir).
function bolumAdiBul(profil) {
  const id = metin(profil && profil.departmentId);
  if (!id) return '';
  const d = (window.DEPARTMENTS || []).find(
    (x) => metin(x.id) === id || (Array.isArray(x.kimlikler) && x.kimlikler.indexOf(id) >= 0)
  );
  return d ? metin(d.name) : '';
}

function TalepFormu({
  talep,
  ayarKaydi,
  onKapat,
  onKaydedildi,
  kimlik,
  profil,
  saltOkunur,
  kayitliOdeme,
}) {
  const [form, setForm] = useState(talep);
  const [mesgul, setMesgul] = useState('');
  const [mesaj, setMesaj] = useState(null); // { tur: 'hata'|'bilgi', metin, liste? }
  // Gönderim için yüklenen imzalı ve kaşeli başvuru formu (PDF).
  const [imzali, setImzali] = useState(null);
  // Gönderilmiş (kilitli) talepte form içeriği katlanır: ekran süreç ve
  // belgelerle başlar, form istenince açılır.
  const [formAcik, setFormAcik] = useState(!saltOkunur && akademisyenDuzenleyebilirMi(talep.durum));
  // Gönder düğmesi neden pasif? (beyan → imzalı form)
  const eksikGonderim =
    form.beyan !== true
      ? 'Beyan kutusunu onaylayın.'
      : !imzali
        ? 'İmzalı ve kaşeli başvuru formunu (PDF) yükleyin.'
        : '';
  // `saltOkunur`: TTO yöneticisi başkasının talebini inceliyor — form
  // akademisyenin beyanıdır, yönetici içeriğe dokunmaz (lib/tto-talep.js).
  const kilitli = !!saltOkunur || !akademisyenDuzenleyebilirMi(form.durum);
  // Form değişince eski eksik/uyarı listesi ekranda kalmasın (düzeltilmiş
  // bir alan hâlâ eksik görünüyordu).
  useEffect(() => {
    setMesaj((m) => (m && m.tur === 'hata' ? null : m));
  }, [form.genel, form.nitelik, form.proje, form.ozet, form.beyan]);
  const projeZorunlu = projeBilgisiGerekliMi(form);
  const a = ttoAyarlari(ayarKaydi);

  const genelAyarla = (alan, v) => setForm((f) => ({ ...f, genel: { ...f.genel, [alan]: v } }));
  // Benim Sayfam kaydındaki güncel bilgileri forma yeniden aktarır (eski
  // taslaklarda adın içinde unvan kalmış olabilir; bu düğme onu da düzeltir).
  // Profilde boş olan alan formdaki değeri silmez.
  const benimSayfamdanAl = () => {
    const pg = profildenGenelBilgi(profil, bolumAdiBul(profil));
    setForm((f) => {
      const g = { ...f.genel };
      TTO_PROFIL_ALANLARI.forEach((a) => {
        if (metin(pg[a])) g[a] = pg[a];
      });
      return { ...f, genel: g };
    });
  };
  const projeAyarla = (alan, v) => setForm((f) => ({ ...f, proje: { ...f.proje, [alan]: v } }));
  const nitelikDegistir = (id) =>
    setForm((f) => {
      const n = Array.isArray(f.nitelik) ? f.nitelik.slice() : [];
      const i = n.indexOf(id);
      if (i >= 0) n.splice(i, 1);
      else n.push(id);
      return { ...f, nitelik: n };
    });

  // Sunucuya yalnız formun içerik alanları gider; TTO alanları ve sunucu
  // damgaları (sahip, geçmiş, gönderim tarihi) sunucuda belirlenir.
  const govde = (durum) => ({
    genel: form.genel,
    nitelik: form.nitelik,
    proje: form.proje,
    ozet: form.ozet,
    beyan: form.beyan === true,
    durum,
  });

  const yaz = async (durum, ekBelgeler) => {
    const g = govde(durum);
    if (ekBelgeler && ekBelgeler.length > 0) g.ekBelgeler = ekBelgeler;
    if (form.id) {
      await window.DBWrite.set('tto_talepleri', String(form.id), g, true);
      return form.id;
    }
    const r = await window.DBWrite.add('tto_talepleri', g);
    const id = r && (r.id || (r.ids && r.ids[0]));
    if (id) setForm((f) => ({ ...f, id }));
    return id;
  };

  const kaydet = async () => {
    setMesgul('kaydet');
    setMesaj(null);
    try {
      await yaz('taslak');
      setMesaj({ tur: 'bilgi', metin: 'Taslak kaydedildi.' });
      onKaydedildi && onKaydedildi();
    } catch (e) {
      setMesaj({ tur: 'hata', metin: e.message || 'Kaydedilemedi.' });
    } finally {
      setMesgul('');
    }
  };

  const gonder = async () => {
    const hatalar = talepHatalari(form);
    if (hatalar.length > 0) {
      setMesaj({ tur: 'hata', metin: 'Gönderilmeden önce şunları tamamlayın:', liste: hatalar });
      return;
    }
    if (!imzali) {
      setMesaj({
        tur: 'hata',
        metin:
          'Göndermeden önce formu indirip imzalayın, kaşeleyin ve imzalı hâlini PDF olarak yükleyin (aşağıdaki “TTO’ya gönderim” bölümü).',
      });
      return;
    }
    if (
      !confirm(
        'Talebiniz TTO yöneticisine gönderilecek.\n\nTTO incelemeye alana kadar geri çekip düzenleyebilirsiniz. Devam edilsin mi?'
      )
    )
      return;
    setMesgul('gonder');
    setMesaj(null);
    try {
      await yaz('gonderildi', [imzali]);
      onKaydedildi && onKaydedildi();
      onKapat('gonderildi');
    } catch (e) {
      setMesaj({ tur: 'hata', metin: e.message || 'Gönderilemedi.' });
    } finally {
      setMesgul('');
    }
  };

  const pdf = async () => {
    setMesgul('pdf');
    setMesaj(null);
    try {
      const r = await formIndir(form, ayarKaydi);
      if (!r.ok) setMesaj({ tur: 'hata', metin: r.hata });
      else if (r.uyari) setMesaj({ tur: 'bilgi', metin: r.uyari });
    } finally {
      setMesgul('');
    }
  };

  // Akademisyen bir aşama belgesi gönderince formdaki kayıt da tazelensin.
  const tazele = async (id) => {
    try {
      const r = await window.apiReadDoc('tto_talepleri', String(id || form.id));
      if (r && r.exists) setForm((f) => ({ ...f, ...r.data, id: r.id || f.id }));
    } catch (_e) {
      /* liste tazelemesi yine çalışır */
    }
    if (onKaydedildi) onKaydedildi();
  };

  const ikili = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
    gap: 14,
  };

  return (
    <div>
      {/* Yönetici incelemesinde başlık ve geri düğmesi süreç panelinde. */}
      {!saltOkunur && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: 12,
            flexWrap: 'wrap',
            marginBottom: 14,
          }}
        >
          <div>
            <div style={{ fontSize: 11.5, color: T.soluk, fontWeight: 600 }}>
              {a.dokumanKodu} · Rev. {a.revizyonNo} · {a.revizyonTarihi}
            </div>
            <div style={{ fontSize: 18, fontWeight: 800, color: T.navy, marginTop: 2 }}>
              {a.formAdi}
            </div>
            <div style={{ fontSize: 12.5, color: T.soluk, marginTop: 2 }}>{a.kurumAdi}</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <DurumCipi durum={form.durum} />
            <button style={dugme('sessiz')} onClick={() => onKapat()}>
              ← Taleplerim
            </button>
          </div>
        </div>
      )}

      {kilitli && !saltOkunur && (
        <AkademisyenSurecKarti talep={form} onDegisti={tazele} kayitliOdeme={kayitliOdeme} />
      )}
      {!saltOkunur && form.durum === 'iade' && metin(form.yoneticiNotu) && (
        <div
          style={{
            ...kart,
            background: '#FEF2F2',
            borderColor: '#FECACA',
            color: '#991B1B',
            fontSize: 13,
            padding: 14,
          }}
        >
          <b>TTO’nun iade notu:</b> {form.yoneticiNotu}
          <div style={{ marginTop: 6, color: '#7F1D1D' }}>
            Formu düzeltip yeniden “TTO’ya gönder”in.
          </div>
        </div>
      )}

      {/* Kilitli talepte form katlanır kart olarak durur (indirme de burada). */}
      {kilitli && (
        <div style={kart} data-form-karti>
          <KartBaslik
            baslik="Başvuru formu"
            aciklama={
              (form.genel && form.genel.adSoyad ? form.genel.adSoyad + ' · ' : '') +
              talepBasligi(form)
            }
            sag={
              <>
                <button style={dugme('sessiz')} onClick={pdf} disabled={!!mesgul}>
                  {mesgul === 'pdf' ? 'Hazırlanıyor…' : 'Formu indir'}
                </button>
                <button
                  style={{ ...dugme('sessiz'), minWidth: 112 }}
                  onClick={() => setFormAcik((a) => !a)}
                >
                  {formAcik ? 'Formu gizle' : 'Formu göster'}
                </button>
              </>
            }
          />
        </div>
      )}
      {formAcik && (
        <>
          <Bolum
            baslik="GENEL BİLGİLER"
            aciklama="İşaretli alanlar Benim Sayfam’daki bilgilerinizden gelir; değişiklik için orayı güncelleyin ya da burada düzeltin."
          >
            {!kilitli && profil && (
              <button
                type="button"
                style={{ ...dugme('sessiz'), marginBottom: 14 }}
                onClick={benimSayfamdanAl}
              >
                Bilgilerimi Benim Sayfam’dan al
              </button>
            )}
            <div style={ikili}>
              {TTO_GENEL_ALANLAR.map((f) => (
                <div key={f.id} style={f.cokSatir ? { gridColumn: '1 / -1' } : undefined}>
                  <label style={etiket} htmlFor={'tto-' + f.id}>
                    {f.label}
                    {f.zorunlu && <span style={{ color: T.tehlike }}> *</span>}
                    {TTO_PROFIL_ALANLARI.indexOf(f.id) >= 0 && (
                      <span
                        title="Benim Sayfam’daki bilgilerinizden"
                        style={{
                          marginLeft: 6,
                          fontSize: 10.5,
                          fontWeight: 600,
                          color: T.birincil,
                          background: '#EFF6FF',
                          borderRadius: 4,
                          padding: '1px 5px',
                        }}
                      >
                        Benim Sayfam
                      </span>
                    )}
                  </label>
                  {f.cokSatir ? (
                    <textarea
                      id={'tto-' + f.id}
                      rows={2}
                      value={form.genel[f.id] || ''}
                      disabled={kilitli}
                      onChange={(e) => genelAyarla(f.id, e.target.value)}
                      style={{ ...giris, resize: 'vertical' }}
                    />
                  ) : (
                    <input
                      id={'tto-' + f.id}
                      type={f.tip || 'text'}
                      value={form.genel[f.id] || ''}
                      disabled={kilitli}
                      onChange={(e) => genelAyarla(f.id, e.target.value)}
                      style={giris}
                    />
                  )}
                </div>
              ))}
            </div>
            <div style={{ fontSize: 12, color: T.soluk, marginTop: 10 }}>
              GSM ya da iş telefonundan en az biri gereklidir. Vergi bilgileri yalnız firma adına
              yapılan taleplerde doldurulur.
            </div>
          </Bolum>

          <Bolum baslik="TALEBİN NİTELİĞİ" aciklama="Birden fazla seçebilirsiniz.">
            <div style={{ display: 'grid', gap: 8 }}>
              {TTO_NITELIKLER.map((n) => {
                const secili = (form.nitelik || []).indexOf(n.id) >= 0;
                return (
                  <label
                    key={n.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '10px 12px',
                      borderRadius: 8,
                      border: `1px solid ${secili ? '#93C5FD' : T.kenar}`,
                      background: secili ? '#EFF6FF' : T.yuzey,
                      cursor: kilitli ? 'default' : 'pointer',
                      fontSize: 13.5,
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={secili}
                      disabled={kilitli}
                      onChange={() => nitelikDegistir(n.id)}
                    />
                    <span style={{ color: T.soluk, fontWeight: 700, width: 16 }}>{n.no}</span>
                    {n.label}
                    {n.proje && (
                      <span
                        style={{
                          marginLeft: 'auto',
                          fontSize: 11,
                          color: T.vurgu,
                          fontWeight: 600,
                        }}
                      >
                        proje bilgileri gerekir
                      </span>
                    )}
                  </label>
                );
              })}
            </div>
          </Bolum>

          <Bolum
            baslik="PROJE BİLGİLERİ"
            uyari={projeZorunlu}
            aciklama={
              projeZorunlu
                ? 'Talebiniz proje ile ilgili: bu bölümün tamamı zorunludur.'
                : 'Talep proje ile ilgili ise kesinlikle doldurulması gerekmektedir (Talebin niteliği 3 ve 4).'
            }
          >
            <div style={{ display: 'grid', gap: 14 }}>
              {TTO_PROJE_ALANLAR.map((f) => (
                <div key={f.id}>
                  <label style={etiket} htmlFor={'tto-p-' + f.id}>
                    {f.no}. {f.label}
                    {f.ipucu && (
                      <span style={{ fontWeight: 400, color: T.soluk }}> ({f.ipucu})</span>
                    )}
                    {projeZorunlu && <span style={{ color: T.tehlike }}> *</span>}
                  </label>
                  {f.evetHayir ? (
                    <EvetHayir
                      ad={'tto-p-' + f.id}
                      deger={form.proje[f.id]}
                      kilitli={kilitli}
                      onChange={(v) => projeAyarla(f.id, v)}
                    />
                  ) : f.cokSatir ? (
                    <textarea
                      id={'tto-p-' + f.id}
                      rows={3}
                      value={form.proje[f.id] || ''}
                      disabled={kilitli}
                      onChange={(e) => projeAyarla(f.id, e.target.value)}
                      style={{ ...giris, resize: 'vertical' }}
                    />
                  ) : (
                    <input
                      id={'tto-p-' + f.id}
                      value={form.proje[f.id] || ''}
                      disabled={kilitli}
                      onChange={(e) => projeAyarla(f.id, e.target.value)}
                      style={giris}
                    />
                  )}
                  {f.id === 'benzer' && form.proje.benzer === 'evet' && (
                    <textarea
                      aria-label="Benzer proje varsa nedir?"
                      placeholder="Varsa nedir?"
                      rows={2}
                      value={form.proje.benzerAciklama || ''}
                      disabled={kilitli}
                      onChange={(e) => projeAyarla('benzerAciklama', e.target.value)}
                      style={{ ...giris, marginTop: 8, resize: 'vertical' }}
                    />
                  )}
                </div>
              ))}
            </div>
          </Bolum>

          <Bolum baslik="TALEP ÖZETİ" aciklama="Talebinizi kısaca açıklayınız.">
            <textarea
              aria-label="Talep özeti"
              rows={7}
              maxLength={TTO_OZET_SINIRI}
              value={form.ozet || ''}
              disabled={kilitli}
              onChange={(e) => setForm((f) => ({ ...f, ozet: e.target.value }))}
              style={{ ...giris, resize: 'vertical', lineHeight: 1.55 }}
            />
            <div style={{ fontSize: 11.5, color: T.soluk, textAlign: 'right', marginTop: 4 }}>
              {(form.ozet || '').length} / {TTO_OZET_SINIRI}
            </div>
          </Bolum>

          {/* BEYAN ZORUNLU: onaylanmadan form indirilemez ve gönderilemez
          (sunucu da talepHatalari ile reddeder). */}
          <div
            data-beyan
            style={{
              ...kart,
              ...(!kilitli && form.beyan !== true
                ? { borderColor: '#FCA5A5', background: '#FFFBFB' }
                : {}),
            }}
          >
            <label
              style={{
                display: 'flex',
                gap: 10,
                alignItems: 'flex-start',
                fontSize: 13.5,
                lineHeight: 1.55,
                cursor: kilitli ? 'default' : 'pointer',
              }}
            >
              <input
                type="checkbox"
                checked={form.beyan === true}
                disabled={kilitli}
                onChange={(e) => setForm((f) => ({ ...f, beyan: e.target.checked }))}
                style={{ marginTop: 3 }}
              />
              <span>
                {a.beyanMetni} <span style={{ color: T.tehlike, fontWeight: 700 }}>*</span>
              </span>
            </label>
            <div style={{ fontSize: 12, color: T.soluk, marginTop: 10 }}>
              Başvuru sahibi: <b>{metin(form.genel.adSoyad) || kimlik}</b> · Kaşe/imza alanı
              indirilen formda yer alır. “Başvuruyu alan kişi” ve talep numarasını TTO doldurur.
            </div>
          </div>
        </>
      )}

      {/* Gönderim: PDF indir → imzala, kaşele → imzalı PDF'i yükle. İade
          edilen talepte önceki belgeler de görünür. */}
      {!kilitli && (
        <GonderimKarti
          talep={form}
          ayarKaydi={ayarKaydi}
          imzali={imzali}
          onImzali={setImzali}
          onMesaj={setMesaj}
          beyan={form.beyan === true}
        />
      )}
      {!kilitli && form.durum === 'iade' && <BelgeListesi talep={form} baslik="Önceki belgeler" />}

      {mesaj && (
        <div
          role={mesaj.tur === 'hata' ? 'alert' : 'status'}
          style={{
            ...kart,
            padding: 14,
            fontSize: 13,
            background: mesaj.tur === 'hata' ? '#FEF2F2' : '#ECFDF5',
            borderColor: mesaj.tur === 'hata' ? '#FECACA' : '#A7F3D0',
            color: mesaj.tur === 'hata' ? '#991B1B' : '#065F46',
          }}
        >
          {mesaj.metin}
          {mesaj.liste && (
            <ul style={{ margin: '8px 0 0', paddingLeft: 18 }}>
              {mesaj.liste.map((h) => (
                <li key={h}>{h}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      {!kilitli && (
        <div
          style={{
            display: 'flex',
            gap: 10,
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            position: 'sticky',
            bottom: 0,
            background: T.zemin,
            padding: '12px 0',
            borderTop: `1px solid ${T.kenar}`,
          }}
        >
          {/* Solda: göndermek için eksik olan; sağda: düğmeler. */}
          <span style={{ fontSize: 12.5, color: T.soluk }}>
            {!kilitli && eksikGonderim ? eksikGonderim : ''}
          </span>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {/* İndirme "TTO’ya gönderim" kartındadır (1. adım); kilitli talepte
              "Başvuru formu" kartında. */}
            {!kilitli && (
              <>
                <button style={dugme('sessiz')} onClick={kaydet} disabled={!!mesgul}>
                  {mesgul === 'kaydet' ? 'Kaydediliyor…' : 'Taslak olarak kaydet'}
                </button>
                <button
                  style={{ ...dugme('birincil'), ...(eksikGonderim ? pasif : {}) }}
                  onClick={gonder}
                  disabled={!!mesgul || !!eksikGonderim}
                  title={eksikGonderim}
                >
                  {mesgul === 'gonder' ? 'Gönderiliyor…' : 'TTO’ya gönder'}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Liste satırları (Taleplerim ve Gelen Talepler aynı düzeni kullanır):
// solda bilgi, sağda sabit genişlikte düğmeler.
const satirKarti = {
  ...kart,
  marginBottom: 0,
  padding: '14px 16px',
  display: 'grid',
  gridTemplateColumns: 'minmax(0, 1fr) auto',
  alignItems: 'center',
  gap: 16,
};
const satirEylemleri = {
  display: 'flex',
  gap: 8,
  flexWrap: 'wrap',
  justifyContent: 'flex-end',
};

/** Listede talebin tek satırlık durum notu (sıra kimde, TTO ne dedi). */
function talepDurumSatiri(t) {
  const d = t.durum || 'taslak';
  if (d === 'iade') {
    return {
      renk: '#991B1B',
      metin:
        'Sıra sizde: düzeltip imzalı hâliyle yeniden gönderin' +
        (metin(t.yoneticiNotu) ? ' — TTO notu: ' + t.yoneticiNotu : '.'),
    };
  }
  if (d === 'proforma_gonderildi') {
    return {
      renk: '#7C3AED',
      metin: 'Sıra sizde: proformayı firmaya onaylatıp ödeme bilgilerinizle geri gönderin.',
    };
  }
  if (d === 'reddedildi') {
    return {
      renk: '#991B1B',
      metin: 'Reddedildi' + (metin(t.yoneticiNotu) ? ': ' + t.yoneticiNotu : '.'),
    };
  }
  return null;
}

// ══════════════════════════════════════════════════════════════
// TALEPLERİM
// ══════════════════════════════════════════════════════════════
function Taleplerim({ talepler, yukleniyor, hata, onAc, onYeni, onYenile, ayarKaydi }) {
  const [mesgulId, setMesgulId] = useState('');
  const [bilgi, setBilgi] = useState('');

  const islem = async (t, tur) => {
    setMesgulId(t.id + ':' + tur);
    setBilgi('');
    try {
      if (tur === 'geri') {
        if (!confirm('Talep geri çekilip taslağa dönecek. Devam edilsin mi?')) return;
        await window.DBWrite.update('tto_talepleri', String(t.id), { durum: 'taslak' });
        await onYenile();
      } else if (tur === 'sil') {
        if (!confirm('Taslak kalıcı olarak silinecek. Emin misiniz?')) return;
        await window.DBWrite.remove('tto_talepleri', String(t.id));
        await onYenile();
      } else if (tur === 'pdf') {
        const r = await formIndir(t, ayarKaydi);
        if (!r.ok) setBilgi(r.hata);
        else if (r.uyari) setBilgi(r.uyari);
      }
    } catch (e) {
      setBilgi(e.message || 'İşlem yapılamadı.');
    } finally {
      setMesgulId('');
    }
  };

  if (yukleniyor) {
    return <div style={{ padding: 40, textAlign: 'center', color: T.soluk }}>Yükleniyor…</div>;
  }

  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 14,
          gap: 12,
          flexWrap: 'wrap',
        }}
      >
        <div style={{ fontSize: 13, color: T.soluk }}>
          Üniversite ile işbirliği talepleriniz. Taslakları istediğiniz zaman düzenleyebilir, hazır
          olduğunda TTO’ya gönderebilirsiniz.
        </div>
        <button style={dugme('birincil')} onClick={onYeni}>
          + Yeni talep
        </button>
      </div>

      {(hata || bilgi) && (
        <div
          role="alert"
          style={{
            ...kart,
            padding: 12,
            fontSize: 13,
            background: '#FEF2F2',
            borderColor: '#FECACA',
            color: '#991B1B',
          }}
        >
          {hata || bilgi}
        </div>
      )}

      {talepler.length === 0 ? (
        <div style={{ ...kart, textAlign: 'center', padding: 40, color: T.soluk }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: T.metin, marginBottom: 6 }}>
            Henüz talebiniz yok
          </div>
          <div style={{ fontSize: 13, marginBottom: 16 }}>
            Danışmanlık, laboratuvar, proje desteği, fikri mülkiyet gibi konularda TTO’dan hizmet
            talep etmek için formu doldurun.
          </div>
          <button style={dugme('birincil')} onClick={onYeni}>
            Talep formunu doldur
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 10 }}>
          {talepler.map((t) => {
            const d = t.durum || 'taslak';
            const m = (tur) => mesgulId === t.id + ':' + tur;
            const not = talepDurumSatiri(t);
            return (
              <div key={t.id} data-talep-satiri={t.id} style={satirKarti}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 14.5, fontWeight: 700, color: T.metin }}>
                      {talepBasligi(t)}
                    </span>
                    <DurumCipi durum={d} />
                  </div>
                  <div style={{ fontSize: 12, color: T.soluk, marginTop: 4 }}>
                    {[
                      t.gonderimTarihi
                        ? 'Gönderim: ' + tarihTr(t.gonderimTarihi)
                        : 'Son düzenleme: ' + tarihTr(t.updatedAt || t.createdAt),
                      t.talepNo && 'Talep No: ' + t.talepNo,
                      Array.isArray(t.belgeler) &&
                        t.belgeler.length > 0 &&
                        t.belgeler.length + ' belge',
                    ]
                      .filter(Boolean)
                      .join('  ·  ')}
                  </div>
                  {not && (
                    <div style={{ fontSize: 12.5, fontWeight: 600, color: not.renk, marginTop: 6 }}>
                      {not.metin}
                    </div>
                  )}
                </div>
                {/* Düğmeler sağa hizalı; "Aç" her satırda en sağda. */}
                <div style={satirEylemleri}>
                  {d === 'gonderildi' && (
                    <button
                      style={{ ...dugme('sessiz'), minWidth: 104 }}
                      disabled={m('geri')}
                      onClick={() => islem(t, 'geri')}
                    >
                      Geri çek
                    </button>
                  )}
                  {d === 'taslak' && (
                    <button
                      style={{ ...dugme('tehlike'), minWidth: 104 }}
                      disabled={m('sil')}
                      onClick={() => islem(t, 'sil')}
                    >
                      Sil
                    </button>
                  )}
                  <button
                    style={{ ...dugme('sessiz'), minWidth: 128 }}
                    disabled={m('pdf')}
                    onClick={() => islem(t, 'pdf')}
                  >
                    {m('pdf') ? 'Hazırlanıyor…' : 'Formu indir'}
                  </button>
                  <button style={{ ...dugme('birincil'), minWidth: 104 }} onClick={() => onAc(t)}>
                    {akademisyenDuzenleyebilirMi(d) ? 'Düzenle' : 'Aç'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// GELEN TALEPLER (TTO YÖNETİCİSİ — 2. aşama)
//
// Akademisyenin gönderdiği talepler buraya düşer. Yönetici talebi açar,
// "TTO tarafından doldurulacaktır" alanlarını doldurur ve karar verir:
// onay, düzeltme için iade ya da ret. Karar talebin kaydına yazılır;
// akademisyen "Taleplerim"de durumu, notu ve onaylı belgeyi görür.
// Bildirimleri sunucu gönderir (lib/tto-talep.js → ttoBildirimPlani);
// yazma kuralları yoneticiYazmaKarari'nde.
// ══════════════════════════════════════════════════════════════
const GELEN_SUZGECLERI = [
  // Sıradaki iş TTO'da (başvuru, proforma hazırlama, Genel Sekreterlik,
  // görevlendirme, fatura).
  { id: 'bekleyen', label: 'Sizde bekleyen', durumlar: TTO_YONETICIDE_BEKLEYEN },
  // Sıra akademisyende (iade edilen form, firma proforması).
  { id: 'akademisyende', label: 'Akademisyende', durumlar: TTO_AKADEMISYENDE_BEKLEYEN },
  { id: 'tamamlandi', label: 'Tamamlanan', durumlar: ['tamamlandi'] },
  { id: 'reddedildi', label: 'Reddedilen', durumlar: ['reddedildi'] },
  { id: 'tumu', label: 'Tümü', durumlar: null },
];

function GelenTalepler({ talepler, yukleniyor, hata, onIncele, onYenile }) {
  const [suzgec, setSuzgec] = useState('bekleyen');
  const [ara, setAra] = useState('');
  const sayi = (s) =>
    s.durumlar ? talepler.filter((t) => s.durumlar.indexOf(t.durum) >= 0).length : talepler.length;
  const secili = GELEN_SUZGECLERI.find((x) => x.id === suzgec) || GELEN_SUZGECLERI[0];
  const q = metin(ara).toLocaleLowerCase('tr');
  const liste = talepler
    .filter((t) => !secili.durumlar || secili.durumlar.indexOf(t.durum) >= 0)
    .filter(
      (t) =>
        !q ||
        [t.sahip, t.talepNo, talepBasligi(t), t.genel && t.genel.kurum]
          .map((x) => metin(x).toLocaleLowerCase('tr'))
          .some((x) => x.indexOf(q) >= 0)
    )
    .sort((a, b) =>
      String(b.gonderimTarihi || b.updatedAt || '').localeCompare(
        String(a.gonderimTarihi || a.updatedAt || '')
      )
    );

  if (yukleniyor) {
    return <div style={{ padding: 40, textAlign: 'center', color: T.soluk }}>Yükleniyor…</div>;
  }
  return (
    <div>
      <div style={{ fontSize: 13, color: T.soluk, marginBottom: 12 }}>
        Akademisyenlerin TTO’ya gönderdiği işbirliği talepleri. Talebi açıp TTO alanlarını doldurun
        ve karar verin; karar akademisyenin “Taleplerim” listesine ve bildirimlerine düşer.
      </div>
      {hata && (
        <div role="alert" style={{ ...kart, padding: 12, fontSize: 13, color: '#991B1B' }}>
          {hata}
        </div>
      )}
      <div
        style={{
          display: 'flex',
          gap: 8,
          flexWrap: 'wrap',
          alignItems: 'center',
          marginBottom: 14,
        }}
      >
        {GELEN_SUZGECLERI.map((x) => {
          const aktif = x.id === suzgec;
          return (
            <button
              key={x.id}
              data-suzgec={x.id}
              onClick={() => setSuzgec(x.id)}
              style={{
                ...dugme(aktif ? 'birincil' : 'sessiz'),
                height: 34,
                padding: '0 12px',
                fontSize: 12.5,
              }}
            >
              {x.label} ({sayi(x)})
            </button>
          );
        })}
        <input
          value={ara}
          onChange={(e) => setAra(e.target.value)}
          placeholder="Akademisyen, talep no, kurum…"
          style={{ ...giris, width: 240, height: 34, marginLeft: 'auto' }}
        />
        <button style={{ ...dugme('sessiz'), height: 34 }} onClick={onYenile}>
          Yenile
        </button>
      </div>
      {liste.length === 0 ? (
        <div style={{ ...kart, textAlign: 'center', padding: 36, color: T.soluk }}>
          {suzgec === 'bekleyen' ? 'Bekleyen talep yok.' : 'Bu grupta talep yok.'}
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 10 }}>
          {liste.map((t) => (
            <div key={t.id} data-talep={t.id} style={satirKarti}>
              <div style={{ minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 14.5, fontWeight: 700, color: T.metin }}>
                    {talepBasligi(t)}
                  </span>
                  <DurumCipi durum={t.durum} />
                </div>
                <div style={{ fontSize: 12.5, color: T.metin, marginTop: 4 }}>
                  {metin(t.genel && t.genel.adSoyad) || t.sahip}
                  {metin(t.genel && t.genel.kurum) ? ' · ' + t.genel.kurum : ''}
                </div>
                <div style={{ fontSize: 12, color: T.soluk, marginTop: 2 }}>
                  Gönderim: {tarihTr(t.gonderimTarihi)}
                  {t.talepNo ? ' · Talep No: ' + t.talepNo : ''}
                  {t.kararTarihi ? ' · Karar: ' + tarihTr(t.kararTarihi) : ''}
                </div>
              </div>
              <div style={satirEylemleri}>
                <button
                  style={{
                    ...dugme(TTO_YONETICIDE_BEKLEYEN.indexOf(t.durum) >= 0 ? 'birincil' : 'sessiz'),
                    minWidth: 112,
                  }}
                  onClick={() => onIncele(t)}
                >
                  {TTO_YONETICIDE_BEKLEYEN.indexOf(t.durum) >= 0 ? 'İşlem yap' : 'Aç'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// YOL HARİTASI
// ══════════════════════════════════════════════════════════════
function YolHaritasi() {
  const akis = [
    [
      '1',
      'Akademisyen formu doldurur',
      'Bilgiler Benim Sayfam’dan gelir. Taslak olarak saklanabilir.',
      'Akademisyen',
    ],
    [
      '2',
      'Formu indirir, imzalar ve kaşeler',
      'Form, kurumun Şablonlar’a yüklediği Word şablonundan PDF olarak üretilir (şablon yoksa yerleşik PDF). Sunucu PDF’e çeviremezse Word iner; akademisyen Word’de “Farklı Kaydet → PDF” ile çevirir. “Başvuru sahibinin kaşe ve imza” alanı doldurulup belge taranır.',
      'Akademisyen',
    ],
    [
      '3',
      'İmzalı ve kaşeli formu yükleyip TTO’ya gönderir',
      'İmzalı PDF yüklenmeden gönderilemez. TTO incelemeye alana kadar geri çekilebilir.',
      'Akademisyen',
    ],
    [
      '4',
      'TTO inceler ve karar verir',
      'Talep no ve başvuruyu alan kişiyi girer. Onay için TTO onaylı (imzalı) başvuru formu PDF olarak yüklenmesi zorunludur. Düzeltme gerekiyorsa gerekçeyle iade eder ya da reddeder.',
      'TTO yöneticisi',
    ],
    [
      '5',
      'TTO proformayı hazırlar, imzalar ve kaşeler',
      'Proformanın kesildiği firma ve tutar (KDV hariç) girilir; imzalı ve kaşeli proforma PDF olarak sisteme yüklenip akademisyene gönderilir.',
      'TTO yöneticisi',
    ],
    [
      '6',
      'Akademisyen proformayı firmaya onaylatır, imzalatır ve kaşeletir',
      'Firma onaylı, imzalı ve kaşeli proforma PDF olarak yüklenir; akademisyen ödeme bilgilerini (açık adres, T.C. kimlik no, IBAN) girer ve TTO yöneticisine geri gönderir. Bilgiler sonraki başvurular için kaydedilebilir. Uygun değilse TTO gerekçeyle yeniden gönderir.',
      'Akademisyen',
    ],
    [
      '7',
      'TTO Genel Sekreterliğe gönderir',
      'TTO talebi yönetim kararı için Genel Sekreterliğe gönderildi olarak işaretler.',
      'TTO yöneticisi',
    ],
    [
      '8',
      'Yönetim kurulu kararı onaylanır',
      'Karar çıktığında TTO karar tarihini girip “olumlu çıktı” kutusunu işaretleyerek onaylar (belge yüklenmez); akademisyene bildirilir ve fatura aşamasına geçilir.',
      'TTO yöneticisi',
    ],
    ['9', 'Fatura kesilir', 'TTO faturayı yükler; süreç tamamlanır.', 'TTO yöneticisi'],
    [
      '10',
      'TTO Otomasyonu’na aktarılır',
      'Akademisyen (bölüm, fakülte, IBAN) ve firma TTO onayından sonra, iş kaydı yönetim kurulu kararı onaylanınca TTO Otomasyonu’na otomatik eklenir. Tahsilat ve akademisyen ödemesi orada tarihleriyle izlenir.',
      'TTO yöneticisi',
    ],
  ];
  return (
    <div>
      <div style={kart}>
        <div style={{ fontSize: 14, fontWeight: 800, color: T.navy, marginBottom: 12 }}>Süreç</div>
        <div style={{ display: 'grid', gap: 10 }}>
          {akis.map(([no, b, a, kim]) => (
            <div key={no} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <span
                style={{
                  flex: '0 0 26px',
                  height: 26,
                  borderRadius: '50%',
                  background: T.navy,
                  color: '#fff',
                  fontSize: 12,
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {no}
              </span>
              <div>
                <div style={{ fontSize: 13.5, fontWeight: 700, color: T.metin }}>
                  {b}
                  <span
                    style={{
                      marginLeft: 8,
                      fontSize: 11,
                      fontWeight: 700,
                      padding: '1px 7px',
                      borderRadius: 999,
                      color: kim === 'Akademisyen' ? '#7C3AED' : '#1D4ED8',
                      background: kim === 'Akademisyen' ? '#F5F3FF' : '#EFF6FF',
                    }}
                  >
                    {kim}
                  </span>
                </div>
                <div style={{ fontSize: 12.5, color: T.soluk }}>{a}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div style={{ ...kart, fontSize: 13, color: T.metin, lineHeight: 1.6 }}>
        <div style={{ fontSize: 14, fontWeight: 800, color: T.navy, marginBottom: 6 }}>
          Belgeler
        </div>
        Süreçteki bütün belgeler (imzalı başvuru formu, TTO onaylı form, proformalar, fatura ve ek
        belgeler) <b>yalnız PDF</b> olarak yüklenir. Akademisyen ve TTO yöneticisi talebe yüklenen
        her belgeyi görüntüleyip indirebilir. Her aşamada karşı tarafa bildirim gider.
      </div>
    </div>
  );
}

/** Kayıttaki talebi formun beklediği tam biçime getirir (eksik alt alanlar boş). */
function formaHazirla(t) {
  const bos = bosTalep({});
  return {
    ...bos,
    ...t,
    genel: { ...bos.genel, ...(t.genel || {}) },
    proje: { ...bos.proje, ...(t.proje || {}) },
    nitelik: Array.isArray(t.nitelik) ? t.nitelik : [],
  };
}

// ══════════════════════════════════════════════════════════════
// MODÜL
// ══════════════════════════════════════════════════════════════
function TtoApp({ currentUser }) {
  const kimlik = metin(currentUser && (currentUser.identifier || currentUser.name));
  // TTO yöneticisi modülü açınca önce talepler gelir ("Gelen Talepler");
  // TTO Otomasyonu'na başlıktaki düğmeyle geçer. Bayrak aşağıda hesaplanır;
  // ilk değer onunla aynı kuralı kullanır.
  const [sekme, setSekme] = useState(() =>
    currentUser &&
    (currentUser.isTtoYoneticisi ||
      (currentUser.role === 'admin' &&
        !currentUser.isUniversityAdmin &&
        !currentUser.isFacultyManager &&
        currentUser.baseRole !== 'professor'))
      ? 'gelen'
      : 'talepler'
  );
  const [talepler, setTalepler] = useState([]);
  // TTO yöneticisinin gördüğü bütün gönderilmiş talepler (Gelen Talepler).
  const [gelenler, setGelenler] = useState([]);
  const [incelenen, setIncelenen] = useState(null);
  const [kayitliOdeme, setKayitliOdeme] = useState(null);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [hata, setHata] = useState('');
  const [acik, setAcik] = useState(null); // düzenlenen / görüntülenen talep
  const [profil, setProfil] = useState(null);
  const [ayarKaydi, setAyarKaydi] = useState(null);
  // TTO Otomasyonu yalnız TTO birimine kayıtlı akademisyene (ve sistem
  // yöneticisine) görünür. Bu yalnız görünürlüktür; asıl kapı sunucudadır
  // (bayrak girişte birim üyeliğinden hesaplanır — server/lib/tto-birim.js).
  // ⚠ role === 'admin' TEK BAŞINA YETMEZ: üniversite ve fakülte yetkilileri
  // istemcide 'admin' rolüyle açılır (yönetim kabuğu). Onlar TTO yöneticisi
  // değildir; talepleri göremez (sunucu da vermez). Yalnız sistem yöneticisi.
  const sistemYoneticisi = !!(
    currentUser &&
    currentUser.role === 'admin' &&
    !currentUser.isUniversityAdmin &&
    !currentUser.isFacultyManager &&
    currentUser.baseRole !== 'professor'
  );
  const yonetici = !!(currentUser && (currentUser.isTtoYoneticisi || sistemYoneticisi));
  const [otomasyonAcik, setOtomasyonAcik] = useState(false);

  const yukle = useCallback(async () => {
    setHata('');
    try {
      const oku = window.apiRead.strict || window.apiRead;
      const liste = (await oku('tto_talepleri')) || [];
      // Sunucu akademisyene yalnız kendi taleplerini verir; TTO yöneticisi
      // bunlara ek olarak GÖNDERİLMİŞ bütün talepleri alır. "Taleplerim"
      // yalnız kendisininkini, "Gelen Talepler" gönderilmiş olanları gösterir.
      const benim = liste.filter((t) => metin(t.sahip) === kimlik);
      setGelenler(liste.filter((t) => t.durum && t.durum !== 'taslak'));
      benim.sort((a, b) =>
        String(b.updatedAt || b.createdAt || '').localeCompare(
          String(a.updatedAt || a.createdAt || '')
        )
      );
      setTalepler(benim);
      // "Sonraki başvurularımda kullan" seçilmiş en son ödeme bilgileri:
      // yeni proformada form bunlarla dolu açılır.
      const kayitli = benim
        .filter((t) => t.odemeBilgileri && t.odemeBilgileri.kaydet === true)
        .sort((a, b) => String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')))[0];
      setKayitliOdeme(kayitli ? kayitli.odemeBilgileri : null);
    } catch (e) {
      setHata(
        e && e.status === 401
          ? 'Oturumunuzun süresi dolmuş; lütfen yeniden giriş yapın.'
          : 'Talepler yüklenemedi: ' + ((e && e.message) || '')
      );
    } finally {
      setYukleniyor(false);
    }
  }, [kimlik]);

  useEffect(() => {
    yukle();
    (async () => {
      try {
        const [profs, ayar] = await Promise.all([
          window.apiRead('professors').catch(() => []),
          window.apiReadDoc('tto_ayarlar', 'genel').catch(() => null),
        ]);
        const p = (profs || []).find((x) => metin(x.name) === kimlik) || null;
        setProfil(p);
        setAyarKaydi((ayar && ayar.exists && ayar.data) || null);
      } catch (_e) {
        /* profil/ayar okunamazsa form boş başlar, varsayılan ayarlar kullanılır */
      }
    })();
    const tazele = () => yukle();
    window.addEventListener('realtime:tto_talepleri', tazele);
    return () => window.removeEventListener('realtime:tto_talepleri', tazele);
  }, [yukle, kimlik]);

  const yeniTalep = () => {
    const bos = bosTalep(
      profil || { name: (currentUser && currentUser.name) || kimlik },
      bolumAdiBul(profil)
    );
    setAcik(bos);
    setSekme('form');
  };

  const talepAc = (t) => {
    setAcik(formaHazirla(t));
    setSekme('form');
  };

  const formuKapat = () => {
    setAcik(null);
    setSekme('talepler');
    yukle();
  };

  // Sıradaki işi TTO'da olan talepler (menü rozeti ve sekme sayısı).
  const bekleyenSayisi = gelenler.filter(
    (t) => TTO_YONETICIDE_BEKLEYEN.indexOf(t.durum) >= 0
  ).length;

  // Kararın ardından listeyi tazele ve incelenen talebi güncel hâliyle tut.
  const incelemeDegisti = async (id) => {
    try {
      const r = await window.apiReadDoc('tto_talepleri', String(id));
      if (r && r.exists) setIncelenen({ ...r.data, id: r.id || id });
    } catch (_e) {
      /* liste tazelemesi yine çalışır */
    }
    await yukle();
  };

  const sekmeler = useMemo(
    () =>
      [
        yonetici && {
          id: 'gelen',
          label: 'Gelen Talepler' + (bekleyenSayisi > 0 ? ' (' + bekleyenSayisi + ')' : ''),
        },
        incelenen && sekme === 'incele' && { id: 'incele', label: 'İnceleme' },
        { id: 'talepler', label: 'Taleplerim' },
        { id: 'form', label: acik ? (acik.id ? 'Talep' : 'Yeni talep') : 'Yeni talep' },
        { id: 'yol', label: 'Yol Haritası' },
      ].filter(Boolean),
    [acik, yonetici, bekleyenSayisi, incelenen, sekme]
  );

  if (yonetici && otomasyonAcik) {
    return (
      <TtoOtomasyon
        currentUser={currentUser}
        bekleyenTalep={bekleyenSayisi}
        onTalepler={() => {
          setOtomasyonAcik(false);
          setSekme('gelen');
        }}
        // Modül seçimi hash ile yapılır; boş hash kabuğun varsayılan sayfasıdır.
        onDon={() => {
          window.location.hash = '';
        }}
      />
    );
  }

  return (
    <div style={{ maxWidth: 980, margin: '0 auto', padding: '8px 4px 40px' }}>
      <div
        style={{
          marginBottom: 16,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 12,
          flexWrap: 'wrap',
        }}
      >
        <div>
          <div style={{ fontSize: 22, fontWeight: 800, color: T.navy }}>
            Teknoloji Transfer Ofisi
          </div>
          <div style={{ fontSize: 13, color: T.soluk, marginTop: 2 }}>
            ÇAKÜ TTO A.Ş. ile üniversite işbirliği talepleri
          </div>
        </div>
        {yonetici && (
          <button style={dugme('birincil')} onClick={() => setOtomasyonAcik(true)}>
            TTO Otomasyonu →
          </button>
        )}
      </div>

      <div
        role="tablist"
        style={{
          display: 'flex',
          gap: 4,
          borderBottom: `1px solid ${T.kenar}`,
          marginBottom: 18,
          overflowX: 'auto',
        }}
      >
        {sekmeler.map((s) => {
          const aktif = sekme === s.id;
          return (
            <button
              key={s.id}
              role="tab"
              aria-selected={aktif}
              onClick={() => {
                if (s.id === 'form' && !acik) yeniTalep();
                else setSekme(s.id);
              }}
              style={{
                padding: '10px 16px',
                border: 'none',
                borderBottom: `2px solid ${aktif ? T.navy : 'transparent'}`,
                background: 'transparent',
                color: aktif ? T.navy : T.soluk,
                fontWeight: aktif ? 700 : 500,
                fontSize: 13.5,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                fontFamily: "'Inter', sans-serif",
              }}
            >
              {s.label}
            </button>
          );
        })}
      </div>

      {sekme === 'gelen' && yonetici && (
        <GelenTalepler
          talepler={gelenler}
          yukleniyor={yukleniyor}
          hata={hata}
          onYenile={yukle}
          onIncele={(t) => {
            setIncelenen(t);
            setSekme('incele');
          }}
        />
      )}
      {sekme === 'incele' && incelenen && (
        <div>
          <button
            style={{ ...dugme('sessiz'), marginBottom: 12 }}
            onClick={() => {
              setIncelenen(null);
              setSekme('gelen');
            }}
          >
            ← Gelen talepler
          </button>
          <YoneticiSurecPaneli
            // Kimlikle anahtarlanır: karardan sonra panel yeniden kurulmasın,
            // "akademisyene iletildi" mesajı ve girilen alanlar kalsın.
            key={incelenen.id}
            talep={incelenen}
            kimlik={kimlik}
            onDegisti={incelemeDegisti}
            onSilindi={async () => {
              setIncelenen(null);
              setSekme('gelen');
              await yukle();
            }}
          />
          <TalepFormu
            key={'incele-' + incelenen.id + ':' + (incelenen.updatedAt || '')}
            talep={formaHazirla(incelenen)}
            ayarKaydi={ayarKaydi}
            kimlik={kimlik}
            profil={null}
            saltOkunur
            onKapat={() => {
              setIncelenen(null);
              setSekme('gelen');
            }}
            onKaydedildi={yukle}
          />
        </div>
      )}
      {sekme === 'talepler' && (
        <Taleplerim
          talepler={talepler}
          yukleniyor={yukleniyor}
          hata={hata}
          ayarKaydi={ayarKaydi}
          onAc={talepAc}
          onYeni={yeniTalep}
          onYenile={yukle}
        />
      )}
      {sekme === 'form' && acik && (
        <TalepFormu
          key={acik.id || 'yeni'}
          kayitliOdeme={kayitliOdeme}
          talep={acik}
          ayarKaydi={ayarKaydi}
          kimlik={kimlik}
          profil={profil}
          onKapat={formuKapat}
          onKaydedildi={yukle}
        />
      )}
      {sekme === 'yol' && <YolHaritasi />}
    </div>
  );
}

window.TtoApp = TtoApp;
