// ══════════════════════════════════════════════════════════════
// ÇAKÜ — TTO Modülü · YÖNETİCİ TARAFI: iş kayıtları ve akademisyen ödemeleri
//
// Yalnız TTO yöneticisi (TTO birimine kayıtlı akademisyen), üniversite
// yetkilisi ve admin görür; sunucu da aynı kapıyı uygular (server/routes/db.js
// → TTO_ODEME_KOLEKSIYONLARI). Sekmeler:
//   • İş Kayıtları   — danışmanlık işleri, hesaplama, tahsilat/ödeme, Excel
//   • Firmalar       — firma kartları ve firmaya göre toplamlar
//   • Akademisyenler — IBAN ve akademisyene göre ödenen/bekleyen
//   • Oranlar        — yıl bazında KDV, tevkifat, TTO payı, stopaj
//
// Kurallar ve hesaplama zinciri lib/tto-odeme.js'te; sunucu kaydı aynı
// dosyayla yeniden hesaplar. Buradaki önizleme yalnız kullanıcı içindir.
// ══════════════════════════════════════════════════════════════
import {
  TTO_ORAN_ALANLARI,
  TTO_HESAP_ALANLARI,
  TTO_ODEME_DURUMLARI,
  TTO_TAHSILAT_DURUMLARI,
  tlKurusa,
  kurusTl,
  yuzdeOku,
  hesapla,
  netKurus,
  ibanBicimle,
  ibanSadele,
  firmaHatalari,
  akademisyenHatalari,
  adCakisiyorMu,
  oranHatalari,
  isKaydiHatalari,
  bosIsKaydi,
  kayitlariSuz,
  kayitSirala,
  ozetHesapla,
  kayitYillari,
  adaGoreSirala,
  excelSatirlari,
} from './lib/tto-odeme.js';
import { trIcerir } from './lib/tr-metin.js';

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
  birincil: '#1D4ED8',
  tehlike: '#DC2626',
  basari: '#059669',
  uyari: '#B45309',
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
  padding: '8px 10px',
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
const izgara = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
  gap: 14,
};

function dugme(tur, kucuk) {
  const t = {
    birincil: { bg: T.navy, fg: '#fff', bd: T.navy },
    vurgu: { bg: T.birincil, fg: '#fff', bd: T.birincil },
    sessiz: { bg: T.yuzey, fg: T.metin, bd: T.kenarGiris },
    tehlike: { bg: T.yuzey, fg: T.tehlike, bd: '#FCA5A5' },
    basari: { bg: T.yuzey, fg: T.basari, bd: '#A7F3D0' },
  }[tur || 'sessiz'];
  return {
    padding: kucuk ? '5px 10px' : '9px 16px',
    borderRadius: 8,
    border: `1px solid ${t.bd}`,
    background: t.bg,
    color: t.fg,
    fontSize: kucuk ? 12 : 13,
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: "'Inter', sans-serif",
    whiteSpace: 'nowrap',
  };
}

const metin = (v) => String(v == null ? '' : v).trim();
const bugun = () => {
  const d = new Date();
  const iki = (x) => String(x).padStart(2, '0');
  return d.getFullYear() + '-' + iki(d.getMonth() + 1) + '-' + iki(d.getDate());
};
function tarihTr(iso) {
  const v = metin(iso);
  return /^\d{4}-\d{2}-\d{2}$/.test(v)
    ? v.slice(8, 10) + '.' + v.slice(5, 7) + '.' + v.slice(0, 4)
    : '—';
}
const tl = (k) => kurusTl(k) + ' ₺';

function Cip({ tanim }) {
  const d = tanim || { label: '—', renk: T.soluk };
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '2px 9px',
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

function Mesaj({ mesaj }) {
  if (!mesaj) return null;
  const hata = mesaj.tur === 'hata';
  return (
    <div
      role={hata ? 'alert' : 'status'}
      style={{
        ...kart,
        padding: 12,
        fontSize: 13,
        background: hata ? '#FEF2F2' : '#ECFDF5',
        borderColor: hata ? '#FECACA' : '#A7F3D0',
        color: hata ? '#991B1B' : '#065F46',
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
  );
}

// Tutar kutusu: kullanıcı "10.000,50" yazar, değer kuruş olarak tutulur.
function ParaGirdisi({ id, kurus, onChange, disabled }) {
  const [yazi, setYazi] = useState(kurus ? kurusTl(kurus) : '');
  const [hatali, setHatali] = useState(false);
  useEffect(() => {
    setYazi(kurus ? kurusTl(kurus) : '');
    setHatali(false);
  }, [kurus]);
  const bitir = () => {
    if (!metin(yazi)) {
      setHatali(false);
      onChange(0);
      return;
    }
    const k = tlKurusa(yazi);
    if (k == null) {
      setHatali(true);
      return;
    }
    setHatali(false);
    onChange(k);
    setYazi(k ? kurusTl(k) : '');
  };
  return (
    <input
      id={id}
      inputMode="decimal"
      value={yazi}
      disabled={disabled}
      placeholder="0,00"
      onChange={(e) => setYazi(e.target.value)}
      onBlur={bitir}
      onKeyDown={(e) => e.key === 'Enter' && bitir()}
      aria-invalid={hatali}
      style={{
        ...giris,
        textAlign: 'right',
        borderColor: hatali ? T.tehlike : T.kenarGiris,
        background: disabled ? T.zemin : T.yuzey,
      }}
    />
  );
}

const hataMetni = (e) => (e && e.message) || 'İşlem yapılamadı.';

// ══════════════════════════════════════════════════════════════
// HIZLI FİRMA / AKADEMİSYEN EKLEME (kayıt formunun içinden)
// ══════════════════════════════════════════════════════════════
function HizliEkle({ tur, liste, onEklendi, onVazgec, onerilenAdlar }) {
  const firma = tur === 'firma';
  const [f, setF] = useState({ ad: '' });
  const [mesaj, setMesaj] = useState(null);
  const [mesgul, setMesgul] = useState(false);
  const kaydet = async () => {
    const hatalar = firma ? firmaHatalari(f) : akademisyenHatalari(f);
    if (adCakisiyorMu(liste, f.ad)) hatalar.push('Bu adla kayıt zaten var.');
    if (hatalar.length) {
      setMesaj({ tur: 'hata', metin: hatalar.join(' ') });
      return;
    }
    setMesgul(true);
    try {
      const veri = firma
        ? { ad: metin(f.ad), vergiNo: metin(f.vergiNo), vergiDairesi: metin(f.vergiDairesi) }
        : { ad: metin(f.ad), iban: ibanSadele(f.iban), bolum: metin(f.bolum) };
      const r = await window.DBWrite.add(firma ? 'tto_firmalar' : 'tto_akademisyenler', veri);
      const id = r && (r.id || (r.ids && r.ids[0]));
      await onEklendi(id);
    } catch (e) {
      setMesaj({ tur: 'hata', metin: hataMetni(e) });
    } finally {
      setMesgul(false);
    }
  };
  return (
    <div style={{ ...kart, background: T.zemin, padding: 14, marginTop: 8, marginBottom: 0 }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: T.navy, marginBottom: 10 }}>
        {firma ? 'Yeni firma' : 'Yeni akademisyen'}
      </div>
      <div style={izgara}>
        <input
          aria-label={firma ? 'Firma adı' : 'Ad soyad'}
          placeholder={firma ? 'Firma adı *' : 'Ad soyad *'}
          list={!firma && onerilenAdlar ? 'tto-prof-adlari' : undefined}
          value={f.ad}
          onChange={(e) => setF({ ...f, ad: e.target.value })}
          style={giris}
        />
        {firma ? (
          <>
            <input
              aria-label="Vergi no"
              placeholder="Vergi no / TCKN"
              value={f.vergiNo || ''}
              onChange={(e) => setF({ ...f, vergiNo: e.target.value })}
              style={giris}
            />
            <input
              aria-label="Vergi dairesi"
              placeholder="Vergi dairesi"
              value={f.vergiDairesi || ''}
              onChange={(e) => setF({ ...f, vergiDairesi: e.target.value })}
              style={giris}
            />
          </>
        ) : (
          <>
            <input
              aria-label="IBAN"
              placeholder="IBAN (TR…)"
              value={f.iban || ''}
              onChange={(e) => setF({ ...f, iban: e.target.value })}
              style={giris}
            />
            <input
              aria-label="Bölüm"
              placeholder="Bölüm"
              value={f.bolum || ''}
              onChange={(e) => setF({ ...f, bolum: e.target.value })}
              style={giris}
            />
          </>
        )}
      </div>
      <Mesaj mesaj={mesaj} />
      <div style={{ display: 'flex', gap: 8, marginTop: 10, justifyContent: 'flex-end' }}>
        <button type="button" style={dugme('sessiz', true)} onClick={onVazgec}>
          Vazgeç
        </button>
        <button type="button" style={dugme('birincil', true)} onClick={kaydet} disabled={mesgul}>
          {mesgul ? 'Ekleniyor…' : 'Ekle ve seç'}
        </button>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// İŞ KAYDI FORMU
// ══════════════════════════════════════════════════════════════
function KayitFormu({ kayit, veri, onKapat, onYenile, profAdlari }) {
  const [form, setForm] = useState(kayit);
  const [mesaj, setMesaj] = useState(null);
  const [mesgul, setMesgul] = useState(false);
  const [hizli, setHizli] = useState(''); // 'firma' | 'akademisyen' | ''
  const yeni = !form.id;
  const ayarla = (alan, v) => setForm((f) => ({ ...f, [alan]: v }));

  const oran = useMemo(
    () => veri.oranlar.find((o) => Number(o.yil) === Number(form.yil)) || null,
    [veri.oranlar, form.yil]
  );
  const hesap = useMemo(
    () => (oran ? hesapla(form.faturaKurus, oran, form.digerFonKurus) : null),
    [oran, form.faturaKurus, form.digerFonKurus]
  );
  // Manuel düzeltme kapalıyken hesaplanan alanlar her değişimde güncellenir.
  const goster = !form.manuelDuzeltme && hesap ? { ...form, ...hesap } : form;
  const akademisyen = veri.akademisyenler.find((a) => String(a.id) === String(form.akademisyenId));

  const odemeDegistir = (v) =>
    setForm((f) => ({
      ...f,
      odeme: v,
      odemeTarihi: v === 'odendi' ? f.odemeTarihi || bugun() : f.odemeTarihi,
      // Ödeme anındaki IBAN saklanır: akademisyen sonradan IBAN değiştirse de
      // ödemenin hangi hesaba yapıldığı kayıtta kalır.
      ibanAnlik:
        v === 'odendi' && !f.ibanAnlik && akademisyen ? ibanSadele(akademisyen.iban) : f.ibanAnlik,
    }));

  const manuelDegistir = (acik) =>
    setForm((f) =>
      acik && hesap ? { ...f, ...hesap, manuelDuzeltme: true } : { ...f, manuelDuzeltme: acik }
    );

  const kaydet = async () => {
    const hatalar = isKaydiHatalari(goster);
    if (!form.manuelDuzeltme && !oran) {
      hatalar.unshift(
        form.yil +
          ' yılı için oran tanımlı değil. Oranlar sekmesinden girin ya da tutarları elle düzeltin.'
      );
    }
    if (hatalar.length) {
      setMesaj({ tur: 'hata', metin: 'Kaydedilmeden önce şunları düzeltin:', liste: hatalar });
      return;
    }
    const govde = {};
    Object.keys(bosIsKaydi()).forEach((a) => {
      govde[a] = goster[a];
    });
    govde.yil = Number(govde.yil);
    setMesgul(true);
    setMesaj(null);
    try {
      if (yeni) await window.DBWrite.add('tto_is_kayitlari', govde);
      else await window.DBWrite.update('tto_is_kayitlari', String(form.id), govde);
      await onYenile();
      onKapat();
    } catch (e) {
      const m = hataMetni(e);
      setMesaj({
        tur: 'hata',
        metin: /zaten var/.test(m)
          ? 'Aynı anda başka bir kayıt eklendi ve sıra numarası çakıştı. Lütfen yeniden kaydedin.'
          : m,
      });
    } finally {
      setMesgul(false);
    }
  };

  const yillar = useMemo(() => {
    const s = new Set(kayitYillari(veri.kayitlar, veri.oranlar));
    s.add(new Date().getFullYear());
    s.add(Number(form.yil));
    return Array.from(s).sort((a, b) => b - a);
  }, [veri.kayitlar, veri.oranlar, form.yil]);

  const secim = (tur) => {
    const firma = tur === 'firma';
    const liste = adaGoreSirala(firma ? veri.firmalar : veri.akademisyenler);
    const alan = firma ? 'firmaId' : 'akademisyenId';
    return (
      <div>
        <label style={etiket} htmlFor={'tto-k-' + alan}>
          {firma ? 'Firma' : 'Akademisyen'} <span style={{ color: T.tehlike }}>*</span>
        </label>
        <div style={{ display: 'flex', gap: 6 }}>
          <select
            id={'tto-k-' + alan}
            value={form[alan] || ''}
            onChange={(e) => ayarla(alan, e.target.value)}
            style={giris}
          >
            <option value="">Seçin…</option>
            {liste.map((x) => (
              <option key={x.id} value={x.id}>
                {x.ad}
              </option>
            ))}
          </select>
          <button
            type="button"
            title={firma ? 'Yeni firma ekle' : 'Yeni akademisyen ekle'}
            style={dugme('sessiz', true)}
            onClick={() => setHizli(hizli === tur ? '' : tur)}
          >
            + Yeni
          </button>
        </div>
        {hizli === tur && (
          <HizliEkle
            tur={tur}
            liste={firma ? veri.firmalar : veri.akademisyenler}
            onerilenAdlar={profAdlari}
            onVazgec={() => setHizli('')}
            onEklendi={async (id) => {
              await onYenile();
              if (id) ayarla(alan, String(id));
              setHizli('');
            }}
          />
        )}
      </div>
    );
  };

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
        <div style={{ fontSize: 18, fontWeight: 800, color: T.navy }}>
          {yeni ? 'Yeni iş kaydı' : 'İş kaydı ' + form.yil + ' / ' + (form.siraNo || '—')}
        </div>
        <button style={dugme('sessiz')} onClick={onKapat}>
          ← İş Kayıtları
        </button>
      </div>

      <div style={kart}>
        <div style={{ fontSize: 14, fontWeight: 800, color: T.navy, marginBottom: 12 }}>İŞ</div>
        <div style={izgara}>
          <div>
            <label style={etiket} htmlFor="tto-k-yil">
              Yıl <span style={{ color: T.tehlike }}>*</span>
            </label>
            <select
              id="tto-k-yil"
              value={form.yil}
              onChange={(e) => ayarla('yil', Number(e.target.value))}
              style={giris}
            >
              {yillar.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label style={etiket} htmlFor="tto-k-talep">
              Talep tarihi
            </label>
            <input
              id="tto-k-talep"
              type="date"
              value={form.talepTarihi || ''}
              onChange={(e) => ayarla('talepTarihi', e.target.value)}
              style={giris}
            />
          </div>
          <div>
            <label style={etiket} htmlFor="tto-k-proje">
              Proje
            </label>
            <input
              id="tto-k-proje"
              value={form.proje || ''}
              onChange={(e) => ayarla('proje', e.target.value)}
              style={giris}
            />
          </div>
        </div>
        <div style={{ ...izgara, marginTop: 14 }}>
          {secim('firma')}
          {secim('akademisyen')}
        </div>
        <div style={{ marginTop: 14 }}>
          <label style={etiket} htmlFor="tto-k-is">
            Yapılan iş <span style={{ color: T.tehlike }}>*</span>
          </label>
          <textarea
            id="tto-k-is"
            rows={2}
            value={form.yapilanIs || ''}
            onChange={(e) => ayarla('yapilanIs', e.target.value)}
            style={{ ...giris, resize: 'vertical' }}
          />
        </div>
      </div>

      <div style={kart}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 10,
            flexWrap: 'wrap',
            marginBottom: 12,
          }}
        >
          <div style={{ fontSize: 14, fontWeight: 800, color: T.navy }}>FATURA VE HESAP</div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5 }}>
            <input
              type="checkbox"
              checked={!!form.manuelDuzeltme}
              onChange={(e) => manuelDegistir(e.target.checked)}
            />
            Tutarları elle düzelt
          </label>
        </div>
        {!oran && !form.manuelDuzeltme && (
          <div style={{ fontSize: 12.5, color: T.uyari, marginBottom: 10 }}>
            {form.yil} yılı için oran tanımlı değil; hesaplama yapılamıyor. Oranlar sekmesinden
            ekleyin ya da tutarları elle girin.
          </div>
        )}
        {oran && !form.manuelDuzeltme && (
          <div style={{ fontSize: 12, color: T.soluk, marginBottom: 10 }}>
            {form.yil} oranları: KDV %{oran.kdv} · Tevkifat %{oran.tevkifat} (KDV üzerinden) · TTO
            payı %{oran.ttoPayi} · Stopaj %{oran.stopaj}
          </div>
        )}
        <div style={izgara}>
          <div>
            <label style={etiket} htmlFor="tto-k-fatura">
              Fatura tutarı (KDV hariç) <span style={{ color: T.tehlike }}>*</span>
            </label>
            <ParaGirdisi
              id="tto-k-fatura"
              kurus={form.faturaKurus}
              onChange={(k) => ayarla('faturaKurus', k)}
            />
          </div>
          {TTO_HESAP_ALANLARI.map((a) => (
            <div key={a.id}>
              <label style={etiket} htmlFor={'tto-k-' + a.id}>
                {a.label}
              </label>
              <ParaGirdisi
                id={'tto-k-' + a.id}
                kurus={goster[a.id]}
                disabled={!form.manuelDuzeltme}
                onChange={(k) => ayarla(a.id, k)}
              />
            </div>
          ))}
          <div>
            <label style={etiket} htmlFor="tto-k-fon">
              Diğer fon ve harçlar
            </label>
            <ParaGirdisi
              id="tto-k-fon"
              kurus={form.digerFonKurus}
              onChange={(k) => ayarla('digerFonKurus', k)}
            />
          </div>
        </div>
        <div
          style={{
            marginTop: 14,
            padding: 12,
            borderRadius: 8,
            background: '#EFF6FF',
            display: 'flex',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 8,
            fontSize: 13.5,
          }}
        >
          <span>
            KDV dahil fatura: <b>{tl((goster.faturaKurus || 0) + (goster.kdvKurus || 0))}</b>
          </span>
          <span>
            Akademisyene net: <b style={{ color: T.basari }}>{tl(netKurus(goster))}</b>
          </span>
        </div>
      </div>

      <div style={kart}>
        <div style={{ fontSize: 14, fontWeight: 800, color: T.navy, marginBottom: 12 }}>
          TAHSİLAT VE ÖDEME
        </div>
        <div style={izgara}>
          <div>
            <label style={etiket} htmlFor="tto-k-tahsilat">
              Firma → TTO tahsilatı
            </label>
            <select
              id="tto-k-tahsilat"
              value={form.tahsilat || 'edilmedi'}
              onChange={(e) => ayarla('tahsilat', e.target.value)}
              style={giris}
            >
              {Object.keys(TTO_TAHSILAT_DURUMLARI).map((k) => (
                <option key={k} value={k}>
                  {TTO_TAHSILAT_DURUMLARI[k].label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label style={etiket} htmlFor="tto-k-odeme">
              TTO → akademisyen ödemesi
            </label>
            <select
              id="tto-k-odeme"
              value={form.odeme}
              onChange={(e) => odemeDegistir(e.target.value)}
              style={giris}
            >
              {Object.keys(TTO_ODEME_DURUMLARI).map((k) => (
                <option key={k} value={k}>
                  {TTO_ODEME_DURUMLARI[k].label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label style={etiket} htmlFor="tto-k-odemetarihi">
              Ödeme tarihi
            </label>
            <input
              id="tto-k-odemetarihi"
              type="date"
              value={form.odemeTarihi || ''}
              onChange={(e) => ayarla('odemeTarihi', e.target.value)}
              style={giris}
            />
          </div>
          <div>
            <label style={etiket} htmlFor="tto-k-iban">
              Ödenen IBAN
            </label>
            <input
              id="tto-k-iban"
              value={form.ibanAnlik ? ibanBicimle(form.ibanAnlik) : ''}
              placeholder={akademisyen && akademisyen.iban ? ibanBicimle(akademisyen.iban) : ''}
              onChange={(e) => ayarla('ibanAnlik', ibanSadele(e.target.value))}
              style={giris}
            />
          </div>
        </div>
        <div style={{ marginTop: 14 }}>
          <label style={etiket} htmlFor="tto-k-not">
            Notlar
          </label>
          <textarea
            id="tto-k-not"
            rows={2}
            value={form.notlar || ''}
            onChange={(e) => ayarla('notlar', e.target.value)}
            style={{ ...giris, resize: 'vertical' }}
          />
        </div>
      </div>

      <Mesaj mesaj={mesaj} />
      <div
        style={{
          display: 'flex',
          gap: 10,
          justifyContent: 'flex-end',
          position: 'sticky',
          bottom: 0,
          background: T.zemin,
          padding: '12px 0',
          borderTop: `1px solid ${T.kenar}`,
        }}
      >
        <button style={dugme('sessiz')} onClick={onKapat} disabled={mesgul}>
          Vazgeç
        </button>
        <button style={dugme('birincil')} onClick={kaydet} disabled={mesgul}>
          {mesgul ? 'Kaydediliyor…' : 'Kaydet'}
        </button>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// İŞ KAYITLARI LİSTESİ
// ══════════════════════════════════════════════════════════════
const SAYFA_BOYU = 50;

function OzetKarti({ baslik, deger, renk }) {
  return (
    <div style={{ ...kart, padding: 14, marginBottom: 0 }}>
      <div style={{ fontSize: 11.5, color: T.soluk, fontWeight: 600 }}>{baslik}</div>
      <div style={{ fontSize: 16, fontWeight: 800, color: renk || T.metin, marginTop: 4 }}>
        {deger}
      </div>
    </div>
  );
}

function IsKayitlari({ veri, suzgec, setSuzgec, onYenile, profAdlari }) {
  const [acik, setAcik] = useState(null);
  const [sayfa, setSayfa] = useState(1);
  const [mesaj, setMesaj] = useState(null);
  const [mesgulId, setMesgulId] = useState('');

  const firmaAd = useMemo(() => {
    const m = {};
    veri.firmalar.forEach((f) => (m[f.id] = f.ad));
    return m;
  }, [veri.firmalar]);
  const akadHarita = useMemo(() => {
    const m = {};
    veri.akademisyenler.forEach((a) => (m[a.id] = a));
    return m;
  }, [veri.akademisyenler]);

  const suzulmus = useMemo(
    () => kayitlariSuz(veri.kayitlar, suzgec, veri.firmalar, veri.akademisyenler).sort(kayitSirala),
    [veri, suzgec]
  );
  const ozet = useMemo(() => ozetHesapla(suzulmus), [suzulmus]);
  const yillar = useMemo(() => kayitYillari(veri.kayitlar, veri.oranlar), [veri]);
  const sayfaSayisi = Math.max(1, Math.ceil(suzulmus.length / SAYFA_BOYU));
  const gorunen = suzulmus.slice((sayfa - 1) * SAYFA_BOYU, sayfa * SAYFA_BOYU);
  useEffect(() => setSayfa(1), [suzgec]);

  const sz = (alan, v) => setSuzgec({ ...suzgec, [alan]: v });

  const sil = async (k) => {
    if (!confirm(k.yil + '/' + k.siraNo + ' numaralı kayıt kalıcı olarak silinecek. Emin misiniz?'))
      return;
    setMesgulId(k.id);
    setMesaj(null);
    try {
      await window.DBWrite.remove('tto_is_kayitlari', String(k.id));
      await onYenile();
    } catch (e) {
      setMesaj({ tur: 'hata', metin: hataMetni(e) });
    } finally {
      setMesgulId('');
    }
  };

  const odendiIsaretle = async (k) => {
    const a = akadHarita[k.akademisyenId];
    const iban = k.ibanAnlik || (a && ibanSadele(a.iban)) || '';
    if (
      !confirm(
        tl(netKurus(k)) +
          ' tutarındaki ödeme bugünün tarihiyle "Ödendi" olarak işaretlenecek.' +
          (iban ? '\nIBAN: ' + ibanBicimle(iban) : '\nAkademisyenin IBAN kaydı yok.') +
          '\n\nDevam edilsin mi?'
      )
    )
      return;
    setMesgulId(k.id);
    setMesaj(null);
    try {
      await window.DBWrite.update('tto_is_kayitlari', String(k.id), {
        odeme: 'odendi',
        odemeTarihi: bugun(),
        ibanAnlik: iban,
      });
      await onYenile();
    } catch (e) {
      setMesaj({ tur: 'hata', metin: hataMetni(e) });
    } finally {
      setMesgulId('');
    }
  };

  const excel = () => {
    const ad = 'TTO_Is_Kayitlari' + (suzgec.yil ? '_' + suzgec.yil : '');
    window.xlsxIndir(ad, {
      sayfaAdi: 'İş Kayıtları',
      satirlar: excelSatirlari(suzulmus, veri.firmalar, veri.akademisyenler),
      dondurSatir: 1,
    });
  };

  if (acik) {
    return (
      <KayitFormu
        key={acik.id || 'yeni'}
        kayit={acik}
        veri={veri}
        profAdlari={profAdlari}
        onYenile={onYenile}
        onKapat={() => setAcik(null)}
      />
    );
  }

  const yeniKayit = () => {
    const yil = Number(suzgec.yil) || new Date().getFullYear();
    setAcik({
      ...bosIsKaydi(yil),
      firmaId: suzgec.firmaId || '',
      akademisyenId: suzgec.akademisyenId || '',
    });
  };

  return (
    <div>
      <div style={{ ...kart, padding: 14 }}>
        <div style={izgara}>
          <select
            aria-label="Yıl"
            value={suzgec.yil || ''}
            onChange={(e) => sz('yil', e.target.value)}
            style={giris}
          >
            <option value="">Tüm yıllar</option>
            {yillar.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
          <select
            aria-label="Firma"
            value={suzgec.firmaId || ''}
            onChange={(e) => sz('firmaId', e.target.value)}
            style={giris}
          >
            <option value="">Tüm firmalar</option>
            {adaGoreSirala(veri.firmalar).map((f) => (
              <option key={f.id} value={f.id}>
                {f.ad}
              </option>
            ))}
          </select>
          <select
            aria-label="Akademisyen"
            value={suzgec.akademisyenId || ''}
            onChange={(e) => sz('akademisyenId', e.target.value)}
            style={giris}
          >
            <option value="">Tüm akademisyenler</option>
            {adaGoreSirala(veri.akademisyenler).map((a) => (
              <option key={a.id} value={a.id}>
                {a.ad}
              </option>
            ))}
          </select>
          <select
            aria-label="Tahsilat"
            value={suzgec.tahsilat || ''}
            onChange={(e) => sz('tahsilat', e.target.value)}
            style={giris}
          >
            <option value="">Tahsilat: hepsi</option>
            {Object.keys(TTO_TAHSILAT_DURUMLARI).map((k) => (
              <option key={k} value={k}>
                {TTO_TAHSILAT_DURUMLARI[k].label}
              </option>
            ))}
          </select>
          <select
            aria-label="Ödeme"
            value={suzgec.odeme || ''}
            onChange={(e) => sz('odeme', e.target.value)}
            style={giris}
          >
            <option value="">Ödeme: hepsi</option>
            {Object.keys(TTO_ODEME_DURUMLARI).map((k) => (
              <option key={k} value={k}>
                {TTO_ODEME_DURUMLARI[k].label}
              </option>
            ))}
          </select>
          <input
            aria-label="Ara"
            placeholder="Ara: iş, proje, firma, akademisyen…"
            value={suzgec.arama || ''}
            onChange={(e) => sz('arama', e.target.value)}
            style={giris}
          />
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
          gap: 10,
          marginBottom: 16,
        }}
      >
        <OzetKarti baslik="Kayıt" deger={ozet.adet} />
        <OzetKarti baslik="Fatura (KDV hariç)" deger={tl(ozet.faturaKurus)} />
        <OzetKarti baslik="KDV dahil fatura" deger={tl(ozet.kdvDahilKurus)} />
        <OzetKarti baslik="Tevkifat" deger={tl(ozet.tevkifatKurus)} />
        <OzetKarti baslik="TTO payı" deger={tl(ozet.ttoPayiKurus)} renk={T.navy} />
        <OzetKarti baslik="Stopaj" deger={tl(ozet.stopajKurus)} />
        <OzetKarti baslik="Akademisyene ödenen" deger={tl(ozet.odenenKurus)} renk={T.basari} />
        <OzetKarti baslik="Ödeme bekleyen" deger={tl(ozet.bekleyenKurus)} renk={T.uyari} />
      </div>

      {ozet.tahsilEdilipOdenmeyenKurus > 0 && (
        <div
          style={{
            ...kart,
            padding: 12,
            fontSize: 13,
            background: '#FFFBEB',
            borderColor: '#FDE68A',
            color: '#92400E',
          }}
        >
          Firmadan tahsil edilmiş ama akademisyene henüz ödenmemiş{' '}
          <b>{tl(ozet.tahsilEdilipOdenmeyenKurus)}</b> var.{' '}
          <button
            type="button"
            style={{ ...dugme('sessiz', true), marginLeft: 6 }}
            onClick={() => setSuzgec({ ...suzgec, tahsilat: 'edildi', odeme: 'odenmedi' })}
          >
            Bu kayıtları göster
          </button>
        </div>
      )}

      <Mesaj mesaj={mesaj} />

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 10,
          gap: 10,
          flexWrap: 'wrap',
        }}
      >
        <div style={{ fontSize: 12.5, color: T.soluk }}>
          {suzulmus.length} kayıt
          {Object.keys(suzgec).some((k) => metin(suzgec[k])) && (
            <button
              type="button"
              style={{ ...dugme('sessiz', true), marginLeft: 8 }}
              onClick={() => setSuzgec({})}
            >
              Süzgeci temizle
            </button>
          )}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button style={dugme('sessiz')} onClick={excel} disabled={suzulmus.length === 0}>
            Excel indir
          </button>
          <button style={dugme('birincil')} onClick={yeniKayit}>
            + Yeni kayıt
          </button>
        </div>
      </div>

      {suzulmus.length === 0 ? (
        <div style={{ ...kart, textAlign: 'center', padding: 36, color: T.soluk, fontSize: 13 }}>
          {veri.kayitlar.length === 0
            ? 'Henüz iş kaydı yok. İlk kaydı eklemeden önce Oranlar sekmesinden bu yılın oranlarını girin.'
            : 'Süzgece uyan kayıt yok.'}
        </div>
      ) : (
        <div style={{ ...kart, padding: 0, overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr
                style={{ background: T.zemin, textAlign: 'left', color: T.soluk, fontSize: 11.5 }}
              >
                {['No', 'Firma / İş', 'Akademisyen', 'Fatura', 'Net', 'Tahsilat', 'Ödeme', ''].map(
                  (b, i) => (
                    <th
                      key={i}
                      style={{
                        padding: '10px 12px',
                        fontWeight: 700,
                        borderBottom: `1px solid ${T.kenar}`,
                        textAlign: b === 'Fatura' || b === 'Net' ? 'right' : 'left',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {b}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody>
              {gorunen.map((k) => {
                const a = akadHarita[k.akademisyenId];
                const mesgul = mesgulId === k.id;
                return (
                  <tr key={k.id} style={{ borderBottom: `1px solid ${T.kenar}` }}>
                    <td style={{ padding: '10px 12px', whiteSpace: 'nowrap', color: T.soluk }}>
                      {k.yil}/{k.siraNo || '—'}
                      {k.manuelDuzeltme && (
                        <span title="Tutarlar elle düzeltildi" style={{ color: T.uyari }}>
                          {' '}
                          ✎
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '10px 12px', minWidth: 200 }}>
                      <div style={{ fontWeight: 700 }}>{firmaAd[k.firmaId] || '—'}</div>
                      <div style={{ fontSize: 12, color: T.soluk }}>
                        {k.yapilanIs}
                        {k.proje ? ' · ' + k.proje : ''}
                      </div>
                    </td>
                    <td style={{ padding: '10px 12px' }}>{a ? a.ad : '—'}</td>
                    <td style={{ padding: '10px 12px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                      {kurusTl(k.faturaKurus)}
                    </td>
                    <td
                      style={{
                        padding: '10px 12px',
                        textAlign: 'right',
                        whiteSpace: 'nowrap',
                        fontWeight: 700,
                      }}
                    >
                      {kurusTl(netKurus(k))}
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <Cip tanim={TTO_TAHSILAT_DURUMLARI[k.tahsilat || 'edilmedi']} />
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <Cip tanim={TTO_ODEME_DURUMLARI[k.odeme]} />
                      {k.odeme === 'odendi' && (
                        <div style={{ fontSize: 11.5, color: T.soluk, marginTop: 2 }}>
                          {tarihTr(k.odemeTarihi)}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '10px 12px', whiteSpace: 'nowrap', textAlign: 'right' }}>
                      {k.odeme !== 'odendi' && (
                        <button
                          style={{ ...dugme('basari', true), marginRight: 6 }}
                          disabled={mesgul}
                          onClick={() => odendiIsaretle(k)}
                        >
                          Ödeme yapıldı
                        </button>
                      )}
                      <button
                        style={{ ...dugme('sessiz', true), marginRight: 6 }}
                        onClick={() => setAcik({ ...bosIsKaydi(k.yil), ...k })}
                      >
                        Düzenle
                      </button>
                      <button
                        style={dugme('tehlike', true)}
                        disabled={mesgul}
                        onClick={() => sil(k)}
                      >
                        Sil
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {sayfaSayisi > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, alignItems: 'center' }}>
          <button
            style={dugme('sessiz', true)}
            disabled={sayfa <= 1}
            onClick={() => setSayfa(sayfa - 1)}
          >
            ‹ Önceki
          </button>
          <span style={{ fontSize: 12.5, color: T.soluk }}>
            {sayfa} / {sayfaSayisi}
          </span>
          <button
            style={dugme('sessiz', true)}
            disabled={sayfa >= sayfaSayisi}
            onClick={() => setSayfa(sayfa + 1)}
          >
            Sonraki ›
          </button>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// FİRMALAR / AKADEMİSYENLER (ortak liste + form)
// ══════════════════════════════════════════════════════════════
const FIRMA_ALANLARI = [
  { id: 'ad', label: 'Firma adı', zorunlu: true },
  { id: 'vergiNo', label: 'Vergi no / TCKN' },
  { id: 'vergiDairesi', label: 'Vergi dairesi' },
  { id: 'eposta', label: 'İrtibat e-postası', tip: 'email' },
];
const AKADEMISYEN_ALANLARI = [
  { id: 'ad', label: 'Ad soyad', zorunlu: true },
  { id: 'iban', label: 'IBAN' },
  { id: 'bolum', label: 'Bölüm' },
  { id: 'fakulte', label: 'Fakülte' },
];

function KartListesi({ tur, veri, onYenile, onKayitlariGor, profAdlari }) {
  const firma = tur === 'firma';
  const koleksiyon = firma ? 'tto_firmalar' : 'tto_akademisyenler';
  const alanlar = firma ? FIRMA_ALANLARI : AKADEMISYEN_ALANLARI;
  const liste = firma ? veri.firmalar : veri.akademisyenler;
  const bag = firma ? 'firmaId' : 'akademisyenId';
  const [arama, setArama] = useState('');
  const [acik, setAcik] = useState(null);
  const [mesaj, setMesaj] = useState(null);
  const [mesgul, setMesgul] = useState(false);

  const istatistik = useMemo(() => {
    const m = {};
    veri.kayitlar.forEach((k) => {
      const id = String(k[bag]);
      if (!m[id]) m[id] = [];
      m[id].push(k);
    });
    const out = {};
    Object.keys(m).forEach((id) => (out[id] = ozetHesapla(m[id])));
    return out;
  }, [veri.kayitlar, bag]);

  const gorunen = adaGoreSirala(liste).filter(
    (x) => !metin(arama) || trIcerir([x.ad, x.vergiNo, x.bolum, x.fakulte].join(' '), arama)
  );

  const kaydet = async () => {
    const hatalar = firma ? firmaHatalari(acik) : akademisyenHatalari(acik);
    if (adCakisiyorMu(liste, acik.ad, acik.id)) hatalar.push('Bu adla kayıt zaten var.');
    if (hatalar.length) {
      setMesaj({ tur: 'hata', metin: hatalar.join(' ') });
      return;
    }
    const govde = {};
    alanlar.forEach(
      (a) => (govde[a.id] = a.id === 'iban' ? ibanSadele(acik.iban) : metin(acik[a.id]))
    );
    setMesgul(true);
    setMesaj(null);
    try {
      if (acik.id) await window.DBWrite.update(koleksiyon, String(acik.id), govde);
      else await window.DBWrite.add(koleksiyon, govde);
      await onYenile();
      setAcik(null);
    } catch (e) {
      setMesaj({ tur: 'hata', metin: hataMetni(e) });
    } finally {
      setMesgul(false);
    }
  };

  const sil = async (x) => {
    if (!confirm('"' + x.ad + '" silinecek. Emin misiniz?')) return;
    setMesaj(null);
    try {
      await window.DBWrite.remove(koleksiyon, String(x.id));
      await onYenile();
    } catch (e) {
      setMesaj({ tur: 'hata', metin: hataMetni(e) });
    }
  };

  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          gap: 10,
          flexWrap: 'wrap',
          marginBottom: 12,
        }}
      >
        <input
          aria-label="Ara"
          placeholder={firma ? 'Firma ara…' : 'Akademisyen ara…'}
          value={arama}
          onChange={(e) => setArama(e.target.value)}
          style={{ ...giris, maxWidth: 320 }}
        />
        <button style={dugme('birincil')} onClick={() => setAcik({ ad: '' })}>
          {firma ? '+ Yeni firma' : '+ Yeni akademisyen'}
        </button>
      </div>

      {acik && (
        <div style={kart}>
          <div style={{ fontSize: 14, fontWeight: 800, color: T.navy, marginBottom: 12 }}>
            {acik.id ? acik.ad : firma ? 'Yeni firma' : 'Yeni akademisyen'}
          </div>
          <div style={izgara}>
            {alanlar.map((a) => (
              <div key={a.id}>
                <label style={etiket} htmlFor={'tto-' + tur + '-' + a.id}>
                  {a.label}
                  {a.zorunlu && <span style={{ color: T.tehlike }}> *</span>}
                </label>
                <input
                  id={'tto-' + tur + '-' + a.id}
                  type={a.tip || 'text'}
                  list={!firma && a.id === 'ad' && profAdlari ? 'tto-prof-adlari' : undefined}
                  value={a.id === 'iban' && acik.iban ? ibanBicimle(acik.iban) : acik[a.id] || ''}
                  onChange={(e) => setAcik({ ...acik, [a.id]: e.target.value })}
                  style={giris}
                />
              </div>
            ))}
          </div>
          <Mesaj mesaj={mesaj} />
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 12 }}>
            <button
              style={dugme('sessiz')}
              onClick={() => {
                setAcik(null);
                setMesaj(null);
              }}
            >
              Vazgeç
            </button>
            <button style={dugme('birincil')} onClick={kaydet} disabled={mesgul}>
              {mesgul ? 'Kaydediliyor…' : 'Kaydet'}
            </button>
          </div>
        </div>
      )}
      {!acik && <Mesaj mesaj={mesaj} />}

      {gorunen.length === 0 ? (
        <div style={{ ...kart, textAlign: 'center', padding: 36, color: T.soluk, fontSize: 13 }}>
          {liste.length === 0 ? 'Henüz kayıt yok.' : 'Aramaya uyan kayıt yok.'}
        </div>
      ) : (
        <div style={{ ...kart, padding: 0, overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr
                style={{ background: T.zemin, textAlign: 'left', color: T.soluk, fontSize: 11.5 }}
              >
                {(firma
                  ? ['Firma', 'Vergi', 'İş', 'Fatura toplamı', 'Tahsil edilmeyen', '']
                  : ['Akademisyen', 'IBAN', 'İş', 'Ödenen', 'Bekleyen', '']
                ).map((b, i) => (
                  <th
                    key={i}
                    style={{
                      padding: '10px 12px',
                      fontWeight: 700,
                      borderBottom: `1px solid ${T.kenar}`,
                      whiteSpace: 'nowrap',
                      textAlign: i >= 3 && i <= 4 ? 'right' : 'left',
                    }}
                  >
                    {b}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {gorunen.map((x) => {
                const o = istatistik[String(x.id)] || ozetHesapla([]);
                const tahsilEdilmeyen = (veri.kayitlar || [])
                  .filter((k) => String(k.firmaId) === String(x.id) && k.tahsilat !== 'edildi')
                  .reduce(
                    (t, k) => t + (Number(k.faturaKurus) || 0) + (Number(k.kdvKurus) || 0),
                    0
                  );
                return (
                  <tr key={x.id} style={{ borderBottom: `1px solid ${T.kenar}` }}>
                    <td style={{ padding: '10px 12px', minWidth: 180 }}>
                      <div style={{ fontWeight: 700 }}>{x.ad}</div>
                      <div style={{ fontSize: 12, color: T.soluk }}>
                        {firma ? x.eposta || '' : [x.bolum, x.fakulte].filter(Boolean).join(' · ')}
                      </div>
                    </td>
                    <td style={{ padding: '10px 12px', fontSize: 12, color: T.soluk }}>
                      {firma
                        ? [x.vergiNo, x.vergiDairesi].filter(Boolean).join(' · ') || '—'
                        : x.iban
                          ? ibanBicimle(x.iban)
                          : '—'}
                    </td>
                    <td style={{ padding: '10px 12px' }}>{o.adet}</td>
                    <td style={{ padding: '10px 12px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                      {firma ? kurusTl(o.faturaKurus) : kurusTl(o.odenenKurus)}
                    </td>
                    <td
                      style={{
                        padding: '10px 12px',
                        textAlign: 'right',
                        whiteSpace: 'nowrap',
                        color: T.uyari,
                      }}
                    >
                      {firma ? kurusTl(tahsilEdilmeyen) : kurusTl(o.bekleyenKurus)}
                    </td>
                    <td style={{ padding: '10px 12px', whiteSpace: 'nowrap', textAlign: 'right' }}>
                      <button
                        style={{ ...dugme('sessiz', true), marginRight: 6 }}
                        disabled={o.adet === 0}
                        onClick={() => onKayitlariGor({ [bag]: String(x.id) })}
                      >
                        Kayıtlar
                      </button>
                      <button
                        style={{ ...dugme('sessiz', true), marginRight: 6 }}
                        onClick={() => {
                          setMesaj(null);
                          setAcik({ ...x });
                        }}
                      >
                        Düzenle
                      </button>
                      <button
                        style={dugme('tehlike', true)}
                        disabled={o.adet > 0}
                        title={o.adet > 0 ? 'İş kaydında geçtiği için silinemez' : ''}
                        onClick={() => sil(x)}
                      >
                        Sil
                      </button>
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

// ══════════════════════════════════════════════════════════════
// ORANLAR
// ══════════════════════════════════════════════════════════════
function Oranlar({ veri, onYenile }) {
  const [acik, setAcik] = useState(null);
  const [mesaj, setMesaj] = useState(null);
  const [mesgul, setMesgul] = useState(false);
  const sirali = veri.oranlar.slice().sort((a, b) => Number(b.yil) - Number(a.yil));
  const kayitSayisi = (yil) => veri.kayitlar.filter((k) => Number(k.yil) === Number(yil)).length;

  const yeni = () => {
    const son = sirali[0];
    const yil = son ? Number(son.yil) + 1 : new Date().getFullYear();
    // Yeni yıl önceki yılın oranlarıyla açılır; çoğu yıl değişmez.
    setAcik({
      yeni: true,
      yil,
      kdv: son ? son.kdv : '',
      tevkifat: son ? son.tevkifat : '',
      ttoPayi: son ? son.ttoPayi : '',
      stopaj: son ? son.stopaj : '',
    });
    setMesaj(null);
  };

  const kaydet = async () => {
    const govde = { yil: Number(acik.yil) };
    TTO_ORAN_ALANLARI.forEach((a) => (govde[a.id] = yuzdeOku(acik[a.id])));
    const hatalar = oranHatalari(govde);
    if (acik.yeni && veri.oranlar.some((o) => Number(o.yil) === govde.yil)) {
      hatalar.push(govde.yil + ' yılının oranı zaten var; listeden düzenleyin.');
    }
    if (hatalar.length) {
      setMesaj({ tur: 'hata', metin: hatalar.join(' ') });
      return;
    }
    setMesgul(true);
    setMesaj(null);
    try {
      await window.DBWrite.set('tto_oranlar', String(govde.yil), govde, true);
      await onYenile();
      setAcik(null);
    } catch (e) {
      setMesaj({ tur: 'hata', metin: hataMetni(e) });
    } finally {
      setMesgul(false);
    }
  };

  const sil = async (o) => {
    if (!confirm(o.yil + ' yılının oranları silinecek. Emin misiniz?')) return;
    try {
      await window.DBWrite.remove('tto_oranlar', String(o.yil));
      await onYenile();
    } catch (e) {
      setMesaj({ tur: 'hata', metin: hataMetni(e) });
    }
  };

  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 12,
          flexWrap: 'wrap',
          marginBottom: 12,
        }}
      >
        <div style={{ fontSize: 12.5, color: T.soluk, maxWidth: 620, lineHeight: 1.55 }}>
          Her yılın oranları ayrı tutulur. Oran değişikliği o yıla daha önce girilmiş kayıtların
          tutarlarını <b>değiştirmez</b>; yalnız sonra kaydedilen ya da yeniden kaydedilen kayıtlar
          yeni oranla hesaplanır.
        </div>
        <button style={dugme('birincil')} onClick={yeni}>
          + Yeni yıl
        </button>
      </div>

      {acik && (
        <div style={kart}>
          <div style={{ fontSize: 14, fontWeight: 800, color: T.navy, marginBottom: 12 }}>
            {acik.yeni ? 'Yeni yıl oranları' : acik.yil + ' oranları'}
          </div>
          <div style={izgara}>
            <div>
              <label style={etiket} htmlFor="tto-o-yil">
                Yıl
              </label>
              <input
                id="tto-o-yil"
                type="number"
                value={acik.yil}
                disabled={!acik.yeni}
                onChange={(e) => setAcik({ ...acik, yil: e.target.value })}
                style={giris}
              />
            </div>
            {TTO_ORAN_ALANLARI.map((a) => (
              <div key={a.id}>
                <label style={etiket} htmlFor={'tto-o-' + a.id}>
                  {a.label} (%)
                </label>
                <input
                  id={'tto-o-' + a.id}
                  inputMode="decimal"
                  value={acik[a.id] == null ? '' : String(acik[a.id])}
                  onChange={(e) => setAcik({ ...acik, [a.id]: e.target.value })}
                  style={giris}
                />
                <div style={{ fontSize: 11.5, color: T.soluk, marginTop: 3 }}>{a.ipucu}</div>
              </div>
            ))}
          </div>
          <Mesaj mesaj={mesaj} />
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 12 }}>
            <button style={dugme('sessiz')} onClick={() => setAcik(null)}>
              Vazgeç
            </button>
            <button style={dugme('birincil')} onClick={kaydet} disabled={mesgul}>
              {mesgul ? 'Kaydediliyor…' : 'Kaydet'}
            </button>
          </div>
        </div>
      )}
      {!acik && <Mesaj mesaj={mesaj} />}

      {sirali.length === 0 ? (
        <div style={{ ...kart, textAlign: 'center', padding: 36, color: T.soluk, fontSize: 13 }}>
          Henüz oran girilmedi. İş kaydı eklemeden önce yılın oranlarını girin.
        </div>
      ) : (
        <div style={{ ...kart, padding: 0, overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr
                style={{ background: T.zemin, textAlign: 'left', color: T.soluk, fontSize: 11.5 }}
              >
                {['Yıl']
                  .concat(
                    TTO_ORAN_ALANLARI.map((a) => a.label),
                    ['İş kaydı', '']
                  )
                  .map((b, i) => (
                    <th
                      key={i}
                      style={{
                        padding: '10px 12px',
                        fontWeight: 700,
                        borderBottom: `1px solid ${T.kenar}`,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {b}
                    </th>
                  ))}
              </tr>
            </thead>
            <tbody>
              {sirali.map((o) => {
                const adet = kayitSayisi(o.yil);
                return (
                  <tr key={o.id || o.yil} style={{ borderBottom: `1px solid ${T.kenar}` }}>
                    <td style={{ padding: '10px 12px', fontWeight: 700 }}>{o.yil}</td>
                    {TTO_ORAN_ALANLARI.map((a) => (
                      <td key={a.id} style={{ padding: '10px 12px' }}>
                        %{o[a.id]}
                      </td>
                    ))}
                    <td style={{ padding: '10px 12px' }}>{adet}</td>
                    <td style={{ padding: '10px 12px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <button
                        style={{ ...dugme('sessiz', true), marginRight: 6 }}
                        onClick={() => {
                          setMesaj(null);
                          setAcik({ ...o, yeni: false });
                        }}
                      >
                        Düzenle
                      </button>
                      <button
                        style={dugme('tehlike', true)}
                        disabled={adet > 0}
                        title={adet > 0 ? 'Bu yılın iş kayıtları var' : ''}
                        onClick={() => sil(o)}
                      >
                        Sil
                      </button>
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

// ══════════════════════════════════════════════════════════════
// PANEL
// ══════════════════════════════════════════════════════════════
export const TTO_YONETIM_SEKMELERI = [
  { id: 'kayitlar', label: 'İş Kayıtları' },
  { id: 'firmalar', label: 'Firmalar' },
  { id: 'akademisyenler', label: 'Akademisyenler' },
  { id: 'oranlar', label: 'Oranlar' },
];

const KOLEKSIYONLAR = {
  firmalar: 'tto_firmalar',
  akademisyenler: 'tto_akademisyenler',
  oranlar: 'tto_oranlar',
  kayitlar: 'tto_is_kayitlari',
};

export function TtoOdemeYonetimi({ sekme, setSekme }) {
  const [veri, setVeri] = useState({ firmalar: [], akademisyenler: [], oranlar: [], kayitlar: [] });
  const [yukleniyor, setYukleniyor] = useState(true);
  const [hata, setHata] = useState('');
  const [suzgec, setSuzgec] = useState({});
  const [profAdlari, setProfAdlari] = useState([]);

  const yukle = useCallback(async () => {
    try {
      const anahtarlar = Object.keys(KOLEKSIYONLAR);
      const sonuc = await Promise.all(
        anahtarlar.map((a) => window.apiRead.strict(KOLEKSIYONLAR[a]))
      );
      const yeni = {};
      anahtarlar.forEach((a, i) => (yeni[a] = Array.isArray(sonuc[i]) ? sonuc[i] : []));
      setVeri(yeni);
      setHata('');
    } catch (e) {
      setHata('Kayıtlar yüklenemedi: ' + hataMetni(e));
    } finally {
      setYukleniyor(false);
    }
  }, []);

  useEffect(() => {
    yukle();
    // Akademisyen adı önerisi: sistemdeki profesör kayıtları (IBAN burada
    // tutulmaz; ödeme defterindeki akademisyen kaydı ayrıdır).
    window
      .apiRead('professors')
      .then((l) =>
        setProfAdlari(
          Array.from(new Set((l || []).map((p) => metin(p.name)).filter(Boolean))).sort((a, b) =>
            a.localeCompare(b, 'tr')
          )
        )
      )
      .catch(() => {});
    const tazele = () => yukle();
    const olaylar = Object.values(KOLEKSIYONLAR).map((c) => 'realtime:' + c);
    olaylar.forEach((o) => window.addEventListener(o, tazele));
    return () => olaylar.forEach((o) => window.removeEventListener(o, tazele));
  }, [yukle]);

  const kayitlariGor = (s) => {
    setSuzgec(s);
    setSekme('kayitlar');
  };

  if (yukleniyor) {
    return <div style={{ padding: 40, textAlign: 'center', color: T.soluk }}>Yükleniyor…</div>;
  }

  return (
    <div>
      {hata && <Mesaj mesaj={{ tur: 'hata', metin: hata }} />}
      <datalist id="tto-prof-adlari">
        {profAdlari.map((a) => (
          <option key={a} value={a} />
        ))}
      </datalist>
      {sekme === 'kayitlar' && (
        <IsKayitlari
          veri={veri}
          suzgec={suzgec}
          setSuzgec={setSuzgec}
          onYenile={yukle}
          profAdlari={profAdlari.length > 0}
        />
      )}
      {sekme === 'firmalar' && (
        <KartListesi tur="firma" veri={veri} onYenile={yukle} onKayitlariGor={kayitlariGor} />
      )}
      {sekme === 'akademisyenler' && (
        <KartListesi
          tur="akademisyen"
          veri={veri}
          onYenile={yukle}
          onKayitlariGor={kayitlariGor}
          profAdlari={profAdlari.length > 0}
        />
      )}
      {sekme === 'oranlar' && <Oranlar veri={veri} onYenile={yukle} />}
    </div>
  );
}
