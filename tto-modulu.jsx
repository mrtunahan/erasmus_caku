// ══════════════════════════════════════════════════════════════
// ÇAKÜ — TTO (Teknoloji Transfer Ofisi) Modülü
//
// 1. aşama: AKADEMİSYEN tarafı.
//   • Taleplerim   — kendi talepleri, durumları, Word çıktısı
//   • Talep formu  — Üniversite ile İşbirliği Talep Formu (TTO-TF-001)
//   • Yol Haritası — modülün uygulama adımları (1. ve 2. aşama)
//
// Kurallar (zorunlu alanlar, durum geçişleri, akademisyenin dokunamayacağı
// TTO alanları, şablon değişkenleri) lib/tto-talep.js'te; sunucu aynı
// dosyayla karar verir (server/routes/db.js).
//
// Word çıktısı: üniversite yetkilisinin Şablonlar → TTO modülüne yüklediği
// .docx şablonu varsa ondan, yoksa formun bölüm sırasını izleyen yerleşik
// biçimden üretilir.
// ══════════════════════════════════════════════════════════════
import * as W from './lib/word-belge.js';
import {
  TTO_GENEL_ALANLAR,
  TTO_NITELIKLER,
  TTO_PROJE_ALANLAR,
  TTO_DURUMLAR,
  TTO_OZET_SINIRI,
  TTO_YOL_HARITASI,
  akademisyenDuzenleyebilirMi,
  bosTalep,
  profildenGenelBilgi,
  TTO_PROFIL_ALANLARI,
  projeBilgisiGerekliMi,
  talepHatalari,
  ttoAyarlari,
  ttoDosyaAdi,
  ttoSablonVerisi,
  ttoWordGovdesi,
} from './lib/tto-talep.js';

const { useState, useEffect, useCallback, useMemo } = React;

const TC = (typeof window !== 'undefined' && window.C) || {};
const T = {
  navy: TC.navy || '#1B2A4A',
  metin: TC.text || '#1F2937',
  soluk: TC.textMuted || '#64748B',
  kenar: TC.border || '#E5E7EB',
  kenarGiris: '#D1D5DB',
  yuzey: '#FFFFFF',
  zemin: '#F8FAFC',
  vurgu: '#B45309',
  vurguSolgun: '#FEF3C7',
  birincil: '#1D4ED8',
  tehlike: '#DC2626',
  basari: '#059669',
};

const kart = {
  background: T.yuzey,
  border: `1px solid ${T.kenar}`,
  borderRadius: 12,
  padding: 20,
  marginBottom: 16,
};
const giris = {
  width: '100%',
  padding: '9px 11px',
  border: `1px solid ${T.kenarGiris}`,
  borderRadius: 8,
  fontSize: 13.5,
  fontFamily: "'Inter', sans-serif",
  color: T.metin,
  background: T.yuzey,
  boxSizing: 'border-box',
};
const etiket = {
  display: 'block',
  fontSize: 12.5,
  fontWeight: 600,
  color: T.metin,
  marginBottom: 5,
};

function dugme(tur) {
  const t = {
    birincil: { bg: T.navy, fg: '#fff', bd: T.navy },
    vurgu: { bg: T.birincil, fg: '#fff', bd: T.birincil },
    sessiz: { bg: T.yuzey, fg: T.metin, bd: T.kenarGiris },
    tehlike: { bg: T.yuzey, fg: T.tehlike, bd: '#FCA5A5' },
  }[tur || 'sessiz'];
  return {
    padding: '9px 16px',
    borderRadius: 8,
    border: `1px solid ${t.bd}`,
    background: t.bg,
    color: t.fg,
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: "'Inter', sans-serif",
  };
}

const metin = (v) => String(v == null ? '' : v).trim();

function tarihTr(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function DurumCipi({ durum }) {
  const d = TTO_DURUMLAR[durum || 'taslak'] || TTO_DURUMLAR.taslak;
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '3px 10px',
        borderRadius: 999,
        fontSize: 11.5,
        fontWeight: 700,
        color: d.renk,
        background: d.renk + '14',
        border: `1px solid ${d.renk}33`,
        whiteSpace: 'nowrap',
      }}
    >
      {d.label}
    </span>
  );
}

// Talebin listede görünen adı: proje adı, yoksa seçilen ilk nitelik.
function talepBasligi(t) {
  const p = metin(t && t.proje && t.proje.ad);
  if (p) return p;
  const n = Array.isArray(t && t.nitelik) ? t.nitelik : [];
  const ilk = TTO_NITELIKLER.find((x) => n.indexOf(x.id) >= 0);
  return ilk ? ilk.label : 'Başlıksız talep';
}

// ── Word çıktısı ──
// Önce üniversite şablonu denenir; şablon yoksa (ya da eşlenmemişse) yerleşik
// biçime düşülür ve kullanıcıya hangisinin kullanıldığı söylenir.
async function wordAktar(talep, ayarKaydi) {
  const dosya = ttoDosyaAdi(talep);
  const TE = window.TemplateEngine;
  if (TE && TE.produceFromTemplate) {
    const r = await TE.produceFromTemplate({
      module: 'tto',
      docType: 'talep',
      // Kurum geneli şablon: bölümden bağımsız çözülür (üniversite kapsamı).
      departmentId: '',
      staticData: ttoSablonVerisi(talep, ayarKaydi),
      rows: [],
      filename: dosya,
    });
    if (r && r.ok) return { ok: true, kaynak: 'sablon' };
    const sablonYok = r && ['no-template', 'no-mapping', 'not-docx'].indexOf(r.reason) >= 0;
    if (r && !sablonYok && r.reason !== 'network') {
      return {
        ok: false,
        hata: 'Şablondan belge üretilemedi: ' + (r.message || r.reason),
      };
    }
  }
  const ok = await window.wordIndir(dosya, ttoWordGovdesi(talep, ayarKaydi, W));
  return ok
    ? { ok: true, kaynak: 'yerlesik' }
    : { ok: false, hata: 'Word dosyası oluşturulamadı.' };
}

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

function TalepFormu({ talep, ayarKaydi, onKapat, onKaydedildi, kimlik, profil }) {
  const [form, setForm] = useState(talep);
  const [mesgul, setMesgul] = useState('');
  const [mesaj, setMesaj] = useState(null); // { tur: 'hata'|'bilgi', metin, liste? }
  const kilitli = !akademisyenDuzenleyebilirMi(form.durum);
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

  const yaz = async (durum) => {
    if (form.id) {
      await window.DBWrite.set('tto_talepleri', String(form.id), govde(durum), true);
      return form.id;
    }
    const r = await window.DBWrite.add('tto_talepleri', govde(durum));
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
    if (
      !confirm(
        'Talebiniz TTO yöneticisine gönderilecek.\n\nTTO incelemeye alana kadar geri çekip düzenleyebilirsiniz. Devam edilsin mi?'
      )
    )
      return;
    setMesgul('gonder');
    setMesaj(null);
    try {
      await yaz('gonderildi');
      onKaydedildi && onKaydedildi();
      onKapat('gonderildi');
    } catch (e) {
      setMesaj({ tur: 'hata', metin: e.message || 'Gönderilemedi.' });
    } finally {
      setMesgul('');
    }
  };

  const word = async () => {
    setMesgul('word');
    setMesaj(null);
    try {
      const r = await wordAktar(form, ayarKaydi);
      if (!r.ok) setMesaj({ tur: 'hata', metin: r.hata });
      else if (r.kaynak === 'yerlesik')
        setMesaj({
          tur: 'bilgi',
          metin:
            'Belge yerleşik biçimle üretildi. Üniversite yetkilisi Şablonlar → TTO modülüne resmî şablonu yüklediğinde çıktı o şablondan alınır.',
        });
    } finally {
      setMesgul('');
    }
  };

  const ikili = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
    gap: 14,
  };

  return (
    <div>
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

      {kilitli && (
        <div
          style={{
            ...kart,
            background: '#EFF6FF',
            borderColor: '#BFDBFE',
            color: '#1E40AF',
            fontSize: 13,
            padding: 14,
          }}
        >
          Bu talep TTO’ya gönderildi ve değiştirilemez. Değişiklik yapmak için “Taleplerim”
          listesinden geri çekin (TTO incelemeye almadıysa).
        </div>
      )}
      {form.durum === 'iade' && metin(form.yoneticiNotu) && (
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
        </div>
      )}

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
                    style={{ marginLeft: 'auto', fontSize: 11, color: T.vurgu, fontWeight: 600 }}
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
                {f.ipucu && <span style={{ fontWeight: 400, color: T.soluk }}> ({f.ipucu})</span>}
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

      <div style={kart}>
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
          <span>{a.beyanMetni}</span>
        </label>
        <div style={{ fontSize: 12, color: T.soluk, marginTop: 10 }}>
          Başvuru sahibi: <b>{metin(form.genel.adSoyad) || kimlik}</b> · Kaşe/imza alanı Word
          çıktısında yer alır. “Başvuruyu alan kişi” ve talep numarasını TTO doldurur.
        </div>
      </div>

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

      <div
        style={{
          display: 'flex',
          gap: 10,
          flexWrap: 'wrap',
          justifyContent: 'flex-end',
          position: 'sticky',
          bottom: 0,
          background: T.zemin,
          padding: '12px 0',
          borderTop: `1px solid ${T.kenar}`,
        }}
      >
        <button style={dugme('sessiz')} onClick={word} disabled={!!mesgul}>
          {mesgul === 'word' ? 'Hazırlanıyor…' : 'Word olarak indir'}
        </button>
        {!kilitli && (
          <>
            <button style={dugme('sessiz')} onClick={kaydet} disabled={!!mesgul}>
              {mesgul === 'kaydet' ? 'Kaydediliyor…' : 'Taslak olarak kaydet'}
            </button>
            <button style={dugme('birincil')} onClick={gonder} disabled={!!mesgul}>
              {mesgul === 'gonder' ? 'Gönderiliyor…' : 'TTO’ya gönder'}
            </button>
          </>
        )}
      </div>
    </div>
  );
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
      } else if (tur === 'word') {
        const r = await wordAktar(t, ayarKaydi);
        if (!r.ok) setBilgi(r.hata);
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
            return (
              <div
                key={t.id}
                style={{
                  ...kart,
                  marginBottom: 0,
                  padding: 16,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 14,
                  flexWrap: 'wrap',
                }}
              >
                <div style={{ flex: '1 1 260px', minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 14.5, fontWeight: 700, color: T.metin }}>
                      {talepBasligi(t)}
                    </span>
                    <DurumCipi durum={d} />
                  </div>
                  <div style={{ fontSize: 12, color: T.soluk, marginTop: 4 }}>
                    {(t.nitelik || [])
                      .map((id) => (TTO_NITELIKLER.find((x) => x.id === id) || {}).label)
                      .filter(Boolean)
                      .join(' · ') || 'Nitelik seçilmedi'}
                  </div>
                  <div style={{ fontSize: 12, color: T.soluk, marginTop: 2 }}>
                    {t.gonderimTarihi
                      ? 'Gönderim: ' + tarihTr(t.gonderimTarihi)
                      : 'Son düzenleme: ' + tarihTr(t.updatedAt || t.createdAt)}
                    {t.talepNo ? ' · Talep No: ' + t.talepNo : ''}
                  </div>
                  {d === 'iade' && metin(t.yoneticiNotu) && (
                    <div style={{ fontSize: 12.5, color: '#991B1B', marginTop: 6 }}>
                      İade notu: {t.yoneticiNotu}
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button style={dugme('sessiz')} onClick={() => onAc(t)}>
                    {akademisyenDuzenleyebilirMi(d) ? 'Düzenle' : 'Görüntüle'}
                  </button>
                  <button
                    style={dugme('sessiz')}
                    disabled={m('word')}
                    onClick={() => islem(t, 'word')}
                  >
                    {m('word') ? 'Hazırlanıyor…' : 'Word'}
                  </button>
                  {d === 'onaylandi' && t.onayliBelgeUrl && (
                    <a
                      href={t.onayliBelgeUrl + '?download=true'}
                      style={{ ...dugme('vurgu'), textDecoration: 'none' }}
                    >
                      Onaylı belge
                    </a>
                  )}
                  {d === 'gonderildi' && (
                    <button
                      style={dugme('sessiz')}
                      disabled={m('geri')}
                      onClick={() => islem(t, 'geri')}
                    >
                      Geri çek
                    </button>
                  )}
                  {d === 'taslak' && (
                    <button
                      style={dugme('tehlike')}
                      disabled={m('sil')}
                      onClick={() => islem(t, 'sil')}
                    >
                      Sil
                    </button>
                  )}
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
// YOL HARİTASI
// ══════════════════════════════════════════════════════════════
function YolHaritasi() {
  const akis = [
    ['1', 'Akademisyen formu doldurur', 'Taslak olarak saklar, Word çıktısı alabilir.'],
    ['2', 'TTO’ya gönderir', 'İnceleme başlayana kadar geri çekip düzenleyebilir.'],
    ['3', 'TTO yöneticisi inceler', 'Talep no ve başvuruyu alan kişiyi girer.'],
    ['4', 'Karar', 'Onay, düzeltme için iade ya da ret.'],
    ['5', 'Onaylı belge akademisyene döner', 'Taleplerim listesinden indirilir.'],
  ];
  return (
    <div>
      <div style={kart}>
        <div style={{ fontSize: 14, fontWeight: 800, color: T.navy, marginBottom: 12 }}>Süreç</div>
        <div style={{ display: 'grid', gap: 10 }}>
          {akis.map(([no, b, a]) => (
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
                <div style={{ fontSize: 13.5, fontWeight: 700, color: T.metin }}>{b}</div>
                <div style={{ fontSize: 12.5, color: T.soluk }}>{a}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
      {TTO_YOL_HARITASI.map((asama) => {
        const biten = asama.adimlar.filter((x) => x.durum === 'tamam').length;
        return (
          <div key={asama.asama} style={kart}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 12,
              }}
            >
              <div style={{ fontSize: 14, fontWeight: 800, color: T.navy }}>{asama.asama}</div>
              <span style={{ fontSize: 12, color: T.soluk, fontWeight: 600 }}>
                {biten} / {asama.adimlar.length}
              </span>
            </div>
            <div style={{ display: 'grid', gap: 8 }}>
              {asama.adimlar.map((x) => {
                const tamam = x.durum === 'tamam';
                return (
                  <div
                    key={x.baslik}
                    style={{ display: 'flex', gap: 10, alignItems: 'center', fontSize: 13.5 }}
                  >
                    <span
                      aria-hidden="true"
                      style={{
                        flex: '0 0 20px',
                        height: 20,
                        borderRadius: '50%',
                        border: `2px solid ${tamam ? T.basari : T.kenarGiris}`,
                        background: tamam ? T.basari : 'transparent',
                        color: '#fff',
                        fontSize: 11,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 800,
                      }}
                    >
                      {tamam ? '✓' : ''}
                    </span>
                    <span style={{ color: tamam ? T.metin : T.soluk }}>{x.baslik}</span>
                    <span
                      style={{
                        marginLeft: 'auto',
                        fontSize: 11,
                        fontWeight: 700,
                        color: tamam ? T.basari : T.soluk,
                      }}
                    >
                      {tamam ? 'Tamamlandı' : 'Sırada'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// MODÜL
// ══════════════════════════════════════════════════════════════
function TtoApp({ currentUser }) {
  const kimlik = metin(currentUser && (currentUser.identifier || currentUser.name));
  const [sekme, setSekme] = useState('talepler');
  const [talepler, setTalepler] = useState([]);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [hata, setHata] = useState('');
  const [acik, setAcik] = useState(null); // düzenlenen / görüntülenen talep
  const [profil, setProfil] = useState(null);
  const [ayarKaydi, setAyarKaydi] = useState(null);

  const yukle = useCallback(async () => {
    setHata('');
    try {
      const oku = window.apiRead.strict || window.apiRead;
      const liste = (await oku('tto_talepleri')) || [];
      // Sunucu akademisyene zaten yalnız kendi taleplerini verir; TTO
      // yöneticisi bütün listeyi alır — "Taleplerim" yine yalnız kendisininkini
      // gösterir (yönetici paneli 2. aşamada).
      const benim = liste.filter((t) => metin(t.sahip) === kimlik);
      benim.sort((a, b) =>
        String(b.updatedAt || b.createdAt || '').localeCompare(
          String(a.updatedAt || a.createdAt || '')
        )
      );
      setTalepler(benim);
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
    const bos = bosTalep({});
    setAcik({
      ...bos,
      ...t,
      genel: { ...bos.genel, ...(t.genel || {}) },
      proje: { ...bos.proje, ...(t.proje || {}) },
      nitelik: Array.isArray(t.nitelik) ? t.nitelik : [],
    });
    setSekme('form');
  };

  const formuKapat = () => {
    setAcik(null);
    setSekme('talepler');
    yukle();
  };

  const sekmeler = useMemo(
    () => [
      { id: 'talepler', label: 'Taleplerim' },
      { id: 'form', label: acik ? (acik.id ? 'Talep' : 'Yeni talep') : 'Yeni talep' },
      { id: 'yol', label: 'Yol Haritası' },
    ],
    [acik]
  );

  return (
    <div style={{ maxWidth: 980, margin: '0 auto', padding: '8px 4px 40px' }}>
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 22, fontWeight: 800, color: T.navy }}>Teknoloji Transfer Ofisi</div>
        <div style={{ fontSize: 13, color: T.soluk, marginTop: 2 }}>
          ÇAKÜ TTO A.Ş. ile üniversite işbirliği talepleri
        </div>
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
