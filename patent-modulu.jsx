// ══════════════════════════════════════════════════════════════
// ÇAKÜ — PATENT & FSMH Modülü
//
// TTO modülüyle aynı yapı:
//   AKADEMİSYEN tarafı
//   • Bildirimlerim — kendi buluş bildirimleri ve durumları
//   • Yeni bildirim — buluş bildirim formu (patent, faydalı model, tasarım
//     tescili, marka, telif hakkı)
//   • Yol Haritası — bildirimin akışı (akademisyen → yönetici → portföy)
//
//   PATENT & FSMH YÖNETİCİSİ (üniversite yetkilisi atar —
//   Üniversite Yönetimi → Patent & FSMH Yöneticileri)
//   • Gelen Bildirimler — karar bekleyenler; kabul (portföye alınır),
//     düzeltme isteme ya da ret
//   • "Patent & FSMH Takibi →" — ayrı uygulama (mrtunahan/patent, kendi
//     veritabanıyla /patent/ altında) tam sayfa açılır: patent listesi,
//     başvuru sahipleri, bölümler, vekil firmalar, ortaklar, Excel dışa
//     aktarma. Kabul edilen bildirim oraya kayıt olarak gönderilir
//     (patent-takip.jsx). Portföy verisi Offline Asistan'a kopyalanmaz.
//
// Kurallar (zorunlu alanlar, durum geçişleri, kimin hangi alana yazacağı)
// lib/patent-fsmh.js'te; sunucu aynı dosyayla karar verir (server/routes/db.js).
// ══════════════════════════════════════════════════════════════
import {
  BILDIRIM_DURUMLARI,
  BILDIRIM_SAHIP_ALANLARI,
  BILDIRIM_SAHIP_DUZENLER,
  BILDIRIM_YONETICIDE,
  VARSAYILAN_FSMH_TURLERI,
  bildirimHatalari,
  bosBildirim,
  patentYoneticisiMi,
} from './lib/patent-fsmh.js';
import { trIcerir } from './lib/tr-metin.js';
import { PatentTakipCercevesi, bildirimiPortfoyeAl, patentTakipYetkisi } from './patent-takip.jsx';
import {
  T,
  kart,
  giris,
  etiket,
  dugme,
  pasif,
  KartBaslik,
  Eylemler,
  metin,
  tarihTr,
} from './tto-stil.jsx';

const { useState, useEffect, useCallback, useMemo } = React;

const yeniden = (a, b) =>
  String(b.updatedAt || b.createdAt || '').localeCompare(String(a.updatedAt || a.createdAt || ''));

function DurumCipi({ durum }) {
  const d = BILDIRIM_DURUMLARI[durum] || BILDIRIM_DURUMLARI.bekliyor;
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

function Mesaj({ mesaj }) {
  if (!mesaj) return null;
  const hata = mesaj.tur === 'hata';
  return (
    <div
      role={hata ? 'alert' : 'status'}
      style={{
        padding: '10px 14px',
        borderRadius: 8,
        marginBottom: 14,
        fontSize: 13,
        background: hata ? '#FEF2F2' : '#ECFDF5',
        color: hata ? T.tehlike : T.basari,
        border: `1px solid ${hata ? '#FECACA' : '#A7F3D0'}`,
      }}
    >
      {mesaj.metin}
    </div>
  );
}

function Alan({ id, label, hata, children, genis }) {
  return (
    <div style={{ gridColumn: genis ? '1 / -1' : undefined, minWidth: 0 }}>
      <label htmlFor={id} style={etiket}>
        {label}
      </label>
      {children}
      {hata && <div style={{ fontSize: 12, color: T.tehlike, marginTop: 4 }}>{hata}</div>}
    </div>
  );
}

const izgara = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
  gap: 14,
};

// ══════════════════════════════════════════════════════════════
// BULUŞ BİLDİRİM FORMU
// ══════════════════════════════════════════════════════════════
function BildirimFormu({ bildirim, kimlik, onKapat, onKaydedildi }) {
  const [form, setForm] = useState(() => ({
    ...bildirim,
    ortaklarMetin: (bildirim.ortaklar || []).join(', '),
  }));
  const [hatalar, setHatalar] = useState({});
  const [mesgul, setMesgul] = useState('');
  const [mesaj, setMesaj] = useState(null);
  const duzenlenebilir = !bildirim.id || BILDIRIM_SAHIP_DUZENLER.indexOf(bildirim.durum) >= 0;
  const set = (alan, deger) => setForm((f) => ({ ...f, [alan]: deger }));
  const kilit = !duzenlenebilir || !!mesgul;

  const veri = () => {
    const v = {};
    BILDIRIM_SAHIP_ALANLARI.forEach((a) => {
      if (a === 'ortaklar') {
        v.ortaklar = String(form.ortaklarMetin || '')
          .split(',')
          .map(metin)
          .filter(Boolean);
      } else v[a] = typeof form[a] === 'string' ? form[a].trim() : form[a];
    });
    if (v.basvuruYapildi !== 'evet') v.basvuruTarihi = '';
    return v;
  };

  const gonder = async () => {
    const v = veri();
    const h = bildirimHatalari(v);
    setHatalar(h);
    if (Object.keys(h).length) {
      setMesaj({ tur: 'hata', metin: 'Zorunlu alanları doldurun.' });
      return;
    }
    setMesgul('gonder');
    setMesaj(null);
    try {
      if (bildirim.id) {
        await window.DBWrite.update('patent_bildirimleri', String(bildirim.id), {
          ...v,
          durum: 'bekliyor',
        });
      } else {
        await window.DBWrite.add('patent_bildirimleri', { ...v, sahip: kimlik, durum: 'bekliyor' });
      }
      onKaydedildi(
        bildirim.id ? 'Bildirim düzeltilip yeniden gönderildi.' : 'Bildiriminiz gönderildi.'
      );
    } catch (e) {
      setMesaj({ tur: 'hata', metin: 'Gönderilemedi: ' + ((e && e.message) || '') });
      setMesgul('');
    }
  };

  const sil = async () => {
    if (!bildirim.id || !confirm('Bu bildirim silinsin mi?')) return;
    setMesgul('sil');
    try {
      await window.DBWrite.remove('patent_bildirimleri', String(bildirim.id));
      onKaydedildi('Bildirim silindi.');
    } catch (e) {
      setMesaj({ tur: 'hata', metin: 'Silinemedi: ' + ((e && e.message) || '') });
      setMesgul('');
    }
  };

  return (
    <div>
      {bildirim.id && (
        <div style={{ ...kart, display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <DurumCipi durum={bildirim.durum} />
          <span style={{ fontSize: 12.5, color: T.soluk }}>
            Gönderim: {tarihTr(bildirim.createdAt)} · Son güncelleme: {tarihTr(bildirim.updatedAt)}
          </span>
          {metin(bildirim.yoneticiNotu) && (
            <div
              style={{
                flexBasis: '100%',
                fontSize: 13,
                color: T.metin,
                background: T.zemin,
                border: `1px solid ${T.kenar}`,
                borderRadius: 8,
                padding: '8px 12px',
              }}
            >
              <strong>Yönetici notu:</strong> {bildirim.yoneticiNotu}
            </div>
          )}
        </div>
      )}
      <Mesaj mesaj={mesaj} />
      <div style={kart}>
        <KartBaslik
          baslik="Buluş sahibi"
          aciklama="Profilinizden dolduruldu; gerekiyorsa düzeltin."
        />
        <div style={izgara}>
          <Alan id="pbAd" label="Adı Soyadı *" hata={hatalar.adSoyad}>
            <input
              id="pbAd"
              style={giris}
              value={form.adSoyad}
              disabled={kilit}
              onChange={(e) => set('adSoyad', e.target.value)}
            />
          </Alan>
          <Alan id="pbUnvan" label="Ünvan">
            <input
              id="pbUnvan"
              style={giris}
              value={form.unvan}
              disabled={kilit}
              onChange={(e) => set('unvan', e.target.value)}
            />
          </Alan>
          <Alan id="pbBolum" label="Bölüm / Birim">
            <input
              id="pbBolum"
              style={giris}
              value={form.bolum}
              disabled={kilit}
              onChange={(e) => set('bolum', e.target.value)}
            />
          </Alan>
          <Alan id="pbEposta" label="E-posta">
            <input
              id="pbEposta"
              style={giris}
              value={form.eposta}
              disabled={kilit}
              onChange={(e) => set('eposta', e.target.value)}
            />
          </Alan>
        </div>
      </div>
      <div style={kart}>
        <KartBaslik
          baslik="Buluş"
          aciklama="Yönetici bildirimi inceler; kabul edilirse üniversitenin fikri mülkiyet portföyüne alınır."
        />
        <div style={izgara}>
          <Alan id="pbBaslik" label="Buluş Başlığı *" hata={hatalar.baslik} genis>
            <input
              id="pbBaslik"
              style={giris}
              maxLength={500}
              value={form.baslik}
              disabled={kilit}
              onChange={(e) => set('baslik', e.target.value)}
            />
          </Alan>
          <Alan id="pbTur" label="FSMH Türü *" hata={hatalar.tur}>
            <select
              id="pbTur"
              style={giris}
              value={form.tur}
              disabled={kilit}
              onChange={(e) => set('tur', e.target.value)}
            >
              {VARSAYILAN_FSMH_TURLERI.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </Alan>
          <Alan id="pbOrtak" label="Ortak buluşçular / kurumlar">
            <input
              id="pbOrtak"
              style={giris}
              placeholder="Virgülle ayırın (örn. Ankara Üni., Ali Kaya)"
              value={form.ortaklarMetin}
              disabled={kilit}
              onChange={(e) => set('ortaklarMetin', e.target.value)}
            />
          </Alan>
          <Alan id="pbOzet" label="Kısa açıklama *" hata={hatalar.ozet} genis>
            <textarea
              id="pbOzet"
              rows={5}
              maxLength={4000}
              style={{ ...giris, resize: 'vertical' }}
              placeholder="Buluşun çözdüğü problem, yeniliği ve uygulama alanı"
              value={form.ozet}
              disabled={kilit}
              onChange={(e) => set('ozet', e.target.value)}
            />
          </Alan>
          <Alan id="pbBasvuru" label="TÜRKPATENT'e başvuru yapıldı mı?">
            <div style={{ display: 'flex', gap: 18, alignItems: 'center', height: 38 }}>
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
                    name="pbBasvuru"
                    checked={form.basvuruYapildi === v}
                    disabled={kilit}
                    onChange={() => set('basvuruYapildi', v)}
                  />
                  {l}
                </label>
              ))}
            </div>
          </Alan>
          {form.basvuruYapildi === 'evet' && (
            <Alan id="pbTarih" label="Başvuru tarihi" hata={hatalar.basvuruTarihi}>
              <input
                id="pbTarih"
                type="date"
                style={giris}
                value={form.basvuruTarihi || ''}
                disabled={kilit}
                onChange={(e) => set('basvuruTarihi', e.target.value)}
              />
            </Alan>
          )}
          <Alan id="pbNot" label="Ek not" genis>
            <textarea
              id="pbNot"
              rows={2}
              style={{ ...giris, resize: 'vertical' }}
              value={form.notlar}
              disabled={kilit}
              onChange={(e) => set('notlar', e.target.value)}
            />
          </Alan>
        </div>
        <Eylemler
          sol={
            bildirim.id &&
            duzenlenebilir && (
              <button
                style={{ ...dugme('tehlike'), ...(mesgul ? pasif : {}) }}
                disabled={!!mesgul}
                onClick={sil}
              >
                {mesgul === 'sil' ? 'Siliniyor…' : 'Sil'}
              </button>
            )
          }
        >
          <button style={dugme('sessiz')} onClick={onKapat} disabled={!!mesgul}>
            {duzenlenebilir ? 'Vazgeç' : 'Kapat'}
          </button>
          {duzenlenebilir && (
            <button
              style={{ ...dugme('birincil'), ...(mesgul ? pasif : {}) }}
              disabled={!!mesgul}
              onClick={gonder}
            >
              {mesgul === 'gonder'
                ? 'Gönderiliyor…'
                : bildirim.durum === 'iade'
                  ? 'Düzeltip yeniden gönder'
                  : bildirim.id
                    ? 'Güncelle'
                    : 'Bildirimi gönder'}
            </button>
          )}
        </Eylemler>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// LİSTELER
// ══════════════════════════════════════════════════════════════
function BosKart({ children }) {
  return (
    <div
      style={{ ...kart, textAlign: 'center', color: T.soluk, fontSize: 13.5, padding: '34px 20px' }}
    >
      {children}
    </div>
  );
}

function BildirimSatiri({ b, sag, yonetici }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        padding: '14px 16px',
        borderBottom: `1px solid ${T.kenar}`,
        flexWrap: 'wrap',
      }}
    >
      <div style={{ flex: '1 1 280px', minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: T.navy, overflowWrap: 'anywhere' }}>
          {b.baslik || 'Başlıksız bildirim'}
        </div>
        <div style={{ fontSize: 12.5, color: T.soluk, marginTop: 3 }}>
          {[yonetici ? b.adSoyad : null, yonetici ? b.bolum : null, b.tur, tarihTr(b.createdAt)]
            .filter(Boolean)
            .join(' · ')}
        </div>
      </div>
      <DurumCipi durum={b.durum} />
      {sag}
    </div>
  );
}

function Bildirimlerim({ liste, yukleniyor, hata, onAc, onYeni, onYenile }) {
  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 12,
          flexWrap: 'wrap',
          marginBottom: 14,
        }}
      >
        <div style={{ fontSize: 13, color: T.soluk, lineHeight: 1.5, maxWidth: 640 }}>
          Buluşunuzu bildirin; Patent &amp; FSMH yöneticisi inceler ve kabul ederse üniversitenin
          fikri mülkiyet portföyüne alınır. Karar ve notlar burada ve bildirimlerinizde görünür.
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button style={dugme('sessiz')} onClick={onYenile}>
            Yenile
          </button>
          <button style={dugme('birincil')} onClick={onYeni}>
            + Yeni bildirim
          </button>
        </div>
      </div>
      {hata && <Mesaj mesaj={{ tur: 'hata', metin: hata }} />}
      {yukleniyor ? (
        <BosKart>Yükleniyor…</BosKart>
      ) : liste.length === 0 ? (
        <BosKart>Henüz buluş bildiriminiz yok.</BosKart>
      ) : (
        <div style={{ ...kart, padding: 0, overflow: 'hidden' }}>
          {liste.map((b) => (
            <BildirimSatiri
              key={b.id}
              b={b}
              sag={
                <button style={dugme('sessiz')} onClick={() => onAc(b)}>
                  {BILDIRIM_SAHIP_DUZENLER.indexOf(b.durum) >= 0 ? 'Aç / Düzenle' : 'Görüntüle'}
                </button>
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}

const SUZGECLER = [
  {
    id: 'bekleyen',
    label: 'Sizde bekleyen',
    uyar: (b) => BILDIRIM_YONETICIDE.indexOf(b.durum) >= 0,
  },
  { id: 'iade', label: 'Akademisyende', uyar: (b) => b.durum === 'iade' },
  { id: 'kabul', label: 'Portföye alınan', uyar: (b) => b.durum === 'kabul' },
  { id: 'ret', label: 'Reddedilen', uyar: (b) => b.durum === 'ret' },
  { id: 'tumu', label: 'Tümü', uyar: () => true },
];

function GelenBildirimler({ liste, yukleniyor, hata, onIncele, onYenile }) {
  const [suzgec, setSuzgec] = useState('bekleyen');
  const [ara, setAra] = useState('');
  const aktif = SUZGECLER.find((s) => s.id === suzgec) || SUZGECLER[0];
  const gorunen = liste.filter(
    (b) =>
      aktif.uyar(b) &&
      (!ara.trim() || [b.baslik, b.adSoyad, b.bolum, b.tur].some((x) => trIcerir(x || '', ara)))
  );
  return (
    <div>
      <div style={{ fontSize: 13, color: T.soluk, lineHeight: 1.5, marginBottom: 14 }}>
        Akademisyenlerin gönderdiği buluş bildirimleri. Bildirimi açıp karar verin: kabul edilen
        bildirim portföye (Patent &amp; FSMH Takibi) kayıt olarak eklenir; karar akademisyenin
        “Bildirimlerim” listesine ve bildirimlerine düşer.
      </div>
      <div
        style={{
          display: 'flex',
          gap: 8,
          flexWrap: 'wrap',
          alignItems: 'center',
          marginBottom: 14,
        }}
      >
        {SUZGECLER.map((s) => {
          const sec = s.id === suzgec;
          return (
            <button
              key={s.id}
              aria-pressed={sec}
              onClick={() => setSuzgec(s.id)}
              style={{
                ...dugme(sec ? 'birincil' : 'sessiz'),
                height: 34,
                padding: '0 12px',
                fontSize: 12.5,
              }}
            >
              {s.label} ({liste.filter(s.uyar).length})
            </button>
          );
        })}
        <div style={{ flex: '1 1 200px', display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <input
            style={{ ...giris, maxWidth: 260 }}
            placeholder="Akademisyen, başlık, bölüm…"
            aria-label="Bildirimlerde ara"
            value={ara}
            onChange={(e) => setAra(e.target.value)}
          />
          <button style={dugme('sessiz')} onClick={onYenile}>
            Yenile
          </button>
        </div>
      </div>
      {hata && <Mesaj mesaj={{ tur: 'hata', metin: hata }} />}
      {yukleniyor ? (
        <BosKart>Yükleniyor…</BosKart>
      ) : gorunen.length === 0 ? (
        <BosKart>{suzgec === 'bekleyen' ? 'Bekleyen bildirim yok.' : 'Bildirim yok.'}</BosKart>
      ) : (
        <div style={{ ...kart, padding: 0, overflow: 'hidden' }}>
          {gorunen.map((b) => (
            <BildirimSatiri
              key={b.id}
              b={b}
              yonetici
              sag={
                <button
                  style={dugme(BILDIRIM_YONETICIDE.indexOf(b.durum) >= 0 ? 'birincil' : 'sessiz')}
                  onClick={() => onIncele(b)}
                >
                  İncele
                </button>
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// YÖNETİCİ İNCELEME PANELİ
// ══════════════════════════════════════════════════════════════
function Bilgi({ label, children, genis }) {
  return (
    <div style={{ gridColumn: genis ? '1 / -1' : undefined, minWidth: 0 }}>
      <div
        style={{
          fontSize: 11.5,
          fontWeight: 600,
          color: T.soluk,
          textTransform: 'uppercase',
          letterSpacing: 0.3,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 13.5,
          color: T.metin,
          marginTop: 3,
          whiteSpace: 'pre-wrap',
          overflowWrap: 'anywhere',
        }}
      >
        {children || '—'}
      </div>
    </div>
  );
}

function IncelemePaneli({ b, onDegisti, onPortfoydeAc }) {
  const [not, setNot] = useState(b.yoneticiNotu || '');
  const [mesgul, setMesgul] = useState('');
  const [mesaj, setMesaj] = useState(null);
  const karar = async (durum) => {
    if ((durum === 'ret' || durum === 'iade') && !metin(not)) {
      setMesaj({
        tur: 'hata',
        metin:
          durum === 'ret' ? 'Reddetmek için gerekçe yazın.' : 'Düzeltme istemek için not yazın.',
      });
      return;
    }
    setMesgul(durum);
    setMesaj(null);
    try {
      const veri = { durum, yoneticiNotu: metin(not) };
      if (durum === 'kabul') veri.patentNo = await bildirimiPortfoyeAl(b);
      await window.DBWrite.update('patent_bildirimleri', String(b.id), veri);
      setMesaj({
        tur: 'bilgi',
        metin:
          durum === 'kabul'
            ? 'Bildirim kabul edildi ve portföye eklendi; akademisyene iletildi.'
            : durum === 'ret'
              ? 'Bildirim reddedildi; akademisyene iletildi.'
              : 'Düzeltme istendi; akademisyene iletildi.',
      });
      await onDegisti(b.id);
    } catch (e) {
      setMesaj({
        tur: 'hata',
        metin: 'İşlem yapılamadı: ' + ((e && (e.detail || e.message)) || ''),
      });
    } finally {
      setMesgul('');
    }
  };
  const karariBekliyor = BILDIRIM_YONETICIDE.indexOf(b.durum) >= 0;
  return (
    <div>
      <div style={kart}>
        <KartBaslik
          baslik={b.baslik || 'Buluş bildirimi'}
          aciklama={`${b.adSoyad || ''}${b.unvan ? ' · ' + b.unvan : ''}${b.bolum ? ' · ' + b.bolum : ''} — gönderim ${tarihTr(b.createdAt)}`}
          sag={<DurumCipi durum={b.durum} />}
        />
        <div style={izgara}>
          <Bilgi label="FSMH Türü">{b.tur}</Bilgi>
          <Bilgi label="E-posta">{b.eposta}</Bilgi>
          <Bilgi label="Ortak buluşçular / kurumlar">{(b.ortaklar || []).join(', ')}</Bilgi>
          <Bilgi label="TÜRKPATENT başvurusu">
            {b.basvuruYapildi === 'evet'
              ? 'Yapıldı' + (b.basvuruTarihi ? ' (' + tarihTr(b.basvuruTarihi) + ')' : '')
              : 'Yapılmadı'}
          </Bilgi>
          <Bilgi label="Kısa açıklama" genis>
            {b.ozet}
          </Bilgi>
          {metin(b.notlar) && (
            <Bilgi label="Ek not" genis>
              {b.notlar}
            </Bilgi>
          )}
        </div>
      </div>
      <div style={kart}>
        <KartBaslik
          baslik="Karar"
          aciklama="Kabul edilen bildirim portföye “Süreç Devam Ediyor” durumuyla eklenir; başvuru sahibi, bölüm ve tür adla eşlenir (yoksa açılır)."
        />
        <Mesaj mesaj={mesaj} />
        <label htmlFor="pbYoneticiNotu" style={etiket}>
          Yönetici notu{' '}
          {karariBekliyor && (
            <span style={{ color: T.soluk, fontWeight: 400 }}>(ret ve düzeltme için zorunlu)</span>
          )}
        </label>
        <textarea
          id="pbYoneticiNotu"
          rows={3}
          style={{ ...giris, resize: 'vertical' }}
          value={not}
          disabled={!karariBekliyor || !!mesgul}
          onChange={(e) => setNot(e.target.value)}
        />
        <Eylemler
          sol={
            b.durum === 'kabul' &&
            b.patentNo && (
              <button style={dugme('vurgu')} onClick={() => onPortfoydeAc(b.patentNo)}>
                Portföyde aç →
              </button>
            )
          }
        >
          {karariBekliyor && (
            <>
              <button
                style={{ ...dugme('tehlike'), ...(mesgul ? pasif : {}) }}
                disabled={!!mesgul}
                onClick={() => karar('ret')}
              >
                {mesgul === 'ret' ? 'Kaydediliyor…' : 'Reddet'}
              </button>
              <button
                style={{ ...dugme('sessiz'), ...(mesgul ? pasif : {}) }}
                disabled={!!mesgul}
                onClick={() => karar('iade')}
              >
                {mesgul === 'iade' ? 'Kaydediliyor…' : 'Düzeltme iste'}
              </button>
              <button
                style={{ ...dugme('basari'), ...(mesgul ? pasif : {}) }}
                disabled={!!mesgul}
                onClick={() => karar('kabul')}
              >
                {mesgul === 'kabul' ? 'Portföye alınıyor…' : 'Kabul et ve portföye al'}
              </button>
            </>
          )}
        </Eylemler>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// YOL HARİTASI
// ══════════════════════════════════════════════════════════════
const ADIMLAR = [
  [
    'Buluş bildirimi',
    'Akademisyen “Yeni bildirim” formunu doldurur: başlık, FSMH türü, kısa açıklama, ortaklar.',
  ],
  [
    'Yönetici incelemesi',
    'Üniversite yetkilisinin atadığı Patent & FSMH yöneticisi bildirimi “Gelen Bildirimler”de inceler.',
  ],
  [
    'Düzeltme (gerekirse)',
    'Yönetici not yazarak düzeltme isteyebilir; akademisyen bildirimi düzeltip yeniden gönderir.',
  ],
  ['Karar', 'Kabul edilen bildirim portföye eklenir; ret gerekçesiyle akademisyene bildirilir.'],
  [
    'Portföy takibi',
    'Başvuru, vekil firma, tescil tarihi ve durum Patent & FSMH Takibi ekranlarında izlenir; Excel’e aktarılabilir.',
  ],
];

function YolHaritasi() {
  return (
    <div style={kart}>
      <KartBaslik baslik="Buluş bildiriminden portföye" aciklama="Bildirimin izlediği adımlar." />
      <ol style={{ listStyle: 'none', margin: 0, padding: 0 }}>
        {ADIMLAR.map(([b, a], i) => (
          <li
            key={b}
            style={{
              display: 'flex',
              gap: 14,
              padding: '12px 0',
              borderTop: i ? `1px solid ${T.kenar}` : 'none',
            }}
          >
            <span
              style={{
                width: 28,
                height: 28,
                borderRadius: 999,
                background: T.navy,
                color: '#fff',
                fontSize: 13,
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              {i + 1}
            </span>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: T.navy }}>{b}</div>
              <div style={{ fontSize: 13, color: T.soluk, marginTop: 2, lineHeight: 1.5 }}>{a}</div>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// MODÜL
// ══════════════════════════════════════════════════════════════
function PatentApp({ currentUser }) {
  const kimlik = metin(currentUser && (currentUser.identifier || currentUser.name));
  // Patent & FSMH yöneticisi yalnız görünürlüktür; asıl kapı sunucudadır.
  const yonetici = patentYoneticisiMi(currentUser);
  const [sekme, setSekme] = useState(yonetici ? 'gelen' : 'benim');
  const [tumu, setTumu] = useState([]);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [hata, setHata] = useState('');
  const [acik, setAcik] = useState(null);
  const [incelenen, setIncelenen] = useState(null);
  const [profil, setProfil] = useState(null);
  const [bilgi, setBilgi] = useState('');
  // Tam sayfa Patent & FSMH Takibi: null kapalı, değilse açılış yolu.
  const [otomasyon, setOtomasyon] = useState(null);
  const [takipHatasi, setTakipHatasi] = useState('');

  // Uygulamayı açmadan önce yetki sorulur: yetkisizse çerçevede nginx'in
  // çıplak hata sayfası yerine burada anlaşılır bir mesaj görünür.
  const takibiAc = async (yol) => {
    setTakipHatasi('');
    const y = await patentTakipYetkisi();
    if (!y.izin) {
      setTakipHatasi(y.mesaj);
      return;
    }
    setOtomasyon('/' + yol);
  };

  const yukle = useCallback(async () => {
    setHata('');
    try {
      const oku = window.apiRead.strict || window.apiRead;
      // Sunucu akademisyene yalnız kendi bildirimlerini verir; yöneticiye hepsini.
      const liste = ((await oku('patent_bildirimleri')) || []).slice().sort(yeniden);
      setTumu(liste);
    } catch (e) {
      setHata(
        e && e.status === 401
          ? 'Oturumunuzun süresi dolmuş; lütfen yeniden giriş yapın.'
          : 'Bildirimler yüklenemedi: ' + ((e && e.message) || '')
      );
    } finally {
      setYukleniyor(false);
    }
  }, []);

  useEffect(() => {
    yukle();
    window
      .apiRead('professors')
      .then((l) => setProfil((l || []).find((x) => metin(x.name) === kimlik) || null))
      .catch(() => {});
    const tazele = () => yukle();
    window.addEventListener('realtime:patent_bildirimleri', tazele);
    return () => window.removeEventListener('realtime:patent_bildirimleri', tazele);
  }, [yukle, kimlik]);

  const benim = useMemo(() => tumu.filter((b) => metin(b.sahip) === kimlik), [tumu, kimlik]);
  const bekleyen = tumu.filter((b) => BILDIRIM_YONETICIDE.indexOf(b.durum) >= 0).length;

  // Zilden gelindiyse bildirimin kaydını aç.
  const [hedef, setHedef] = useState('');
  (window.useBildirimHedefi || (() => {}))('patent', (h) => {
    const id = metin(h.meta && h.meta.bildirimId);
    if (id) setHedef(id);
  });
  useEffect(() => {
    if (!hedef || yukleniyor) return;
    const b = tumu.find((x) => metin(x.id) === hedef);
    if (b && metin(b.sahip) === kimlik) {
      setOtomasyon(null);
      setAcik(b);
      setSekme('form');
    } else if (b && yonetici) {
      setOtomasyon(null);
      setIncelenen(b);
      setSekme('incele');
    }
    setHedef('');
  }, [hedef, yukleniyor, tumu, kimlik, yonetici]);

  const yeni = () => {
    setBilgi('');
    setAcik(bosBildirim(profil || { name: (currentUser && currentUser.name) || kimlik }));
    setSekme('form');
  };

  const incelemeDegisti = async (id) => {
    try {
      const r = await window.apiReadDoc('patent_bildirimleri', String(id));
      if (r && r.exists) setIncelenen({ ...r.data, id: r.id || id });
    } catch (_e) {
      /* liste tazelemesi yine çalışır */
    }
    await yukle();
  };

  const sekmeler = [
    yonetici && {
      id: 'gelen',
      label: 'Gelen Bildirimler' + (bekleyen > 0 ? ' (' + bekleyen + ')' : ''),
    },
    incelenen && sekme === 'incele' && { id: 'incele', label: 'İnceleme' },
    { id: 'benim', label: 'Bildirimlerim' },
    { id: 'form', label: acik && acik.id ? 'Bildirim' : 'Yeni bildirim' },
    { id: 'yol', label: 'Yol Haritası' },
  ].filter(Boolean);

  if (yonetici && otomasyon) {
    return (
      <PatentTakipCercevesi
        yol={otomasyon}
        onBildirimler={() => {
          setOtomasyon(null);
          setSekme('gelen');
          yukle();
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
          <div style={{ fontSize: 22, fontWeight: 800, color: T.navy }}>Patent &amp; FSMH</div>
          <div style={{ fontSize: 13, color: T.soluk, marginTop: 2 }}>
            Buluş bildirimleri ve üniversitenin fikri ve sınai mülkiyet portföyü
          </div>
        </div>
        {yonetici && (
          <button style={dugme('birincil')} onClick={() => takibiAc('')}>
            Patent &amp; FSMH Takibi →
          </button>
        )}
      </div>
      {takipHatasi && <Mesaj mesaj={{ tur: 'hata', metin: takipHatasi }} />}

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
                if (s.id === 'form' && !acik) yeni();
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

      {bilgi && sekme === 'benim' && <Mesaj mesaj={{ tur: 'bilgi', metin: bilgi }} />}

      {sekme === 'gelen' && yonetici && (
        <GelenBildirimler
          liste={tumu}
          yukleniyor={yukleniyor}
          hata={hata}
          onYenile={yukle}
          onIncele={(b) => {
            setIncelenen(b);
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
            ← Gelen bildirimler
          </button>
          <IncelemePaneli
            key={incelenen.id}
            b={incelenen}
            onDegisti={incelemeDegisti}
            onPortfoydeAc={(no) => takibiAc('patents/' + no)}
          />
        </div>
      )}
      {sekme === 'benim' && (
        <Bildirimlerim
          liste={benim}
          yukleniyor={yukleniyor}
          hata={hata}
          onYenile={yukle}
          onYeni={yeni}
          onAc={(b) => {
            setBilgi('');
            setAcik(b);
            setSekme('form');
          }}
        />
      )}
      {sekme === 'form' && acik && (
        <BildirimFormu
          key={acik.id || 'yeni'}
          bildirim={acik}
          kimlik={kimlik}
          onKapat={() => {
            setAcik(null);
            setSekme('benim');
          }}
          onKaydedildi={(m) => {
            setBilgi(m);
            setAcik(null);
            setSekme('benim');
            yukle();
          }}
        />
      )}
      {sekme === 'yol' && <YolHaritasi />}
    </div>
  );
}

window.PatentApp = PatentApp;
