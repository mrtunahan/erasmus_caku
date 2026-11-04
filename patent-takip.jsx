// ══════════════════════════════════════════════════════════════
// Patent & FSMH Takibi — Offline Asistan tarafındaki köprü
//
// Takip uygulaması AYRIDIR (mrtunahan/patent: FastAPI + kendi SQLite
// veritabanı) ve aynı alan adında PATENT_TAKIP_ADRESI (/patent/) altında
// yayınlanır. Veri orada kalır; Offline Asistan yalnız:
//   • uygulamayı tam sayfa bir çerçevede açar (TTO Otomasyonu gibi),
//   • kabul edilen buluş bildirimini uygulamanın KENDİ API'sine kayıt olarak
//     gönderir.
// Yetki: nginx /patent/ altındaki her isteği Offline Asistan'a sorar
// (server/routes/patent.js); oturum çerezi aynı alan adında olduğu için
// çerçeve ve API istekleri onu kendiliğinden taşır.
// ══════════════════════════════════════════════════════════════
import { PATENT_TAKIP_ADRESI, bildirimdenPortfoy, metin, normalizeTr } from './lib/patent-fsmh.js';

const { useEffect, useRef, useState } = React;

/** Çerçevedeki uygulamanın gönderdiği iletilerin kaynak adı (patent AppShell ile aynı). */
const ILETI_KAYNAGI = 'patent-takip';

// ── Uygulamanın API'si ──
class PatentApiHatasi extends Error {
  constructor(durum, mesaj, govde) {
    super(mesaj);
    this.durum = durum;
    this.govde = govde || {};
  }
}

const YETKI_MESAJI = {
  401: 'Oturum bulunamadı; lütfen yeniden giriş yapın.',
  403: 'Patent & FSMH Takibi için yönetici yetkisi gerekir.',
  404: 'Patent & FSMH Takibi uygulamasına ulaşılamadı (sunucuda kurulu değil).',
  502: 'Patent & FSMH Takibi uygulaması şu an çalışmıyor.',
  503: 'Patent & FSMH Takibi uygulaması şu an çalışmıyor.',
};

async function api(yontem, yol, govde) {
  let r;
  try {
    r = await fetch(PATENT_TAKIP_ADRESI + 'api' + yol, {
      method: yontem,
      credentials: 'same-origin',
      headers: govde ? { 'Content-Type': 'application/json' } : undefined,
      body: govde ? JSON.stringify(govde) : undefined,
    });
  } catch (_) {
    throw new PatentApiHatasi(0, 'Patent & FSMH Takibi uygulamasına ulaşılamadı.');
  }
  let veri = null;
  try {
    veri = await r.json();
  } catch (_) {
    veri = null;
  }
  if (!r.ok) {
    const detay = veri && typeof veri.detail === 'string' ? veri.detail : '';
    throw new PatentApiHatasi(
      r.status,
      detay || YETKI_MESAJI[r.status] || 'Patent & FSMH Takibi hatası (HTTP ' + r.status + ').',
      veri
    );
  }
  return veri;
}

/** Adla bul (Türkçe harf duyarsız), yoksa aç; kaydın kimliğini döner. */
async function adlaBulVeyaAc(yol, adAlani, ad, ek) {
  const liste = (await api('GET', yol)) || [];
  const hedef = normalizeTr(ad);
  const var_ = liste.find((x) => normalizeTr(x[adAlani]) === hedef);
  if (var_) return { id: var_.id, liste };
  const yeni = await api('POST', yol, { [adAlani]: metin(ad), ...(ek || {}) });
  return { id: yeni.id, liste };
}

/**
 * Kabul edilen buluş bildirimini Patent & FSMH Takibi'ne kayıt olarak ekler.
 * Başvuru sahibi, bölüm ve FSMH türü ADLA eşlenir (yoksa açılır). Aynı başlık,
 * sahip ve tarihle kayıt zaten varsa yenisi açılmaz, var olanın numarası döner.
 * @returns {Promise<number>} patent kaydının numarası
 */
export async function bildirimiPortfoyeAl(bildirim) {
  const a = bildirimdenPortfoy(bildirim);
  if (!a.baslik || !a.basvuruSahibiAd) {
    throw new PatentApiHatasi(422, 'Bildirimde başlık ve ad soyad olmalı.');
  }
  const bolum = a.bolumAd
    ? await adlaBulVeyaAc('/departments', 'name', a.bolumAd.slice(0, 200))
    : null;
  const sahip = await adlaBulVeyaAc('/applicants', 'full_name', a.basvuruSahibiAd.slice(0, 200), {
    department_id: bolum ? bolum.id : null,
    email: metin(bildirim && bildirim.eposta).slice(0, 200) || null,
    is_active: true,
  });
  const tur = await adlaBulVeyaAc('/fsmh_types', 'name', (a.turAd || 'Patent').slice(0, 100));
  // Ortak adları tekilleştirilir (uygulama aynı adı ikinci kez kabul etmez).
  const goruldu = new Set();
  const ortaklar = a.ortaklar
    .map((o) => o.slice(0, 200))
    .filter((o) => {
      const k = normalizeTr(o);
      if (!k || goruldu.has(k)) return false;
      goruldu.add(k);
      return true;
    });
  try {
    const kayit = await api('POST', '/patents', {
      title: a.baslik.slice(0, 500),
      applicant_id: sahip.id,
      fsmh_type_id: tur.id,
      department_id: bolum ? bolum.id : null,
      attorney_firm_id: null,
      application_date: a.basvuruTarihi,
      registration_date: null,
      status: a.durum,
      notes: a.notlar || null,
      partners: ortaklar,
    });
    return kayit.id;
  } catch (e) {
    // Mükerrer uyarısı (409): kayıt zaten portföyde — var olanı kullan.
    if (e instanceof PatentApiHatasi && e.durum === 409 && e.govde.duplicate) {
      return (e.govde.existing_ids || [])[0];
    }
    throw e;
  }
}

/** Kullanıcının takip uygulamasına girip giremeyeceği (açmadan önce sorulur). */
export async function patentTakipYetkisi() {
  try {
    const r = await fetch('/api/patent/yetki', { credentials: 'same-origin' });
    if (r.status === 204 || r.ok) return { izin: true };
    return { izin: false, mesaj: YETKI_MESAJI[r.status] || 'Yetki denetlenemedi.' };
  } catch (_) {
    return { izin: false, mesaj: 'Yetki denetlenemedi; bağlantınızı kontrol edin.' };
  }
}

// ══════════════════════════════════════════════════════════════
// Tam sayfa çerçeve (TTO Otomasyonu gibi ekranı kaplar)
// ══════════════════════════════════════════════════════════════
export function PatentTakipCercevesi({ yol, onDon, onBildirimler }) {
  const cerceve = useRef(null);
  const [yuklendi, setYuklendi] = useState(false);
  const adres = PATENT_TAKIP_ADRESI + String(yol || '').replace(/^\/+/, '');

  // Arkadaki Offline Asistan sayfası kaymasın.
  useEffect(() => {
    const onceki = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = onceki;
    };
  }, []);

  // Uygulamanın düğmeleri ("Offline Asistan'a dön", "Buluş Bildirimleri")
  // iletiyle gelir. Yalnız AYNI kökenden ve bu çerçeveden gelen ileti dinlenir.
  useEffect(() => {
    const dinle = (e) => {
      if (e.origin !== window.location.origin) return;
      if (!cerceve.current || e.source !== cerceve.current.contentWindow) return;
      const d = e.data || {};
      if (d.kaynak !== ILETI_KAYNAGI) return;
      if (d.tip === 'don' && onDon) onDon();
      if (d.tip === 'bildirimler' && onBildirimler) onBildirimler();
    };
    window.addEventListener('message', dinle);
    return () => window.removeEventListener('message', dinle);
  }, [onDon, onBildirimler]);

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 2000, background: '#F0F0F0' }}>
      {!yuklendi && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#5F6368',
            fontSize: 14,
            fontFamily: "'Inter', sans-serif",
          }}
        >
          Patent &amp; FSMH Takibi açılıyor…
        </div>
      )}
      <iframe
        ref={cerceve}
        title="Patent & FSMH Takibi"
        src={adres}
        onLoad={() => setYuklendi(true)}
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 0 }}
      />
    </div>
  );
}
