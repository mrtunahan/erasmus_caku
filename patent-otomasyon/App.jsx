// ══════════════════════════════════════════════════════════════
// Patent & FSMH Takibi — Offline Asistan içindeki giriş bileşeni
//
// Orijinal uygulamanın (mrtunahan/patent) App.tsx + main.tsx karşılığı: aynı
// rotalar, aynı sayfalar, aynı bildirim (toast) sistemi. Farklar (TTO
// Otomasyonu ile aynı):
//   • Giriş ekranı yok — oturumu Offline Asistan açar; yetki sunucudadır
//     (yalnız üniversite yetkilisinin atadığı Patent & FSMH yöneticisi,
//     server/routes/db.js → PATENT_PORTFOY_KOLEKSIYONLARI).
//   • Tarayıcı adres çubuğu yerine bellekte yönlendirme (router.jsx).
//   • Ekran tam sayfa açılır; "Offline Asistan'a dön" düğmesiyle ya da
//     "Buluş Bildirimleri" bağlantısıyla çıkılır.
// ══════════════════════════════════════════════════════════════
import { useEffect, useMemo, useRef } from 'react';
import './patent.css';
import { BellekYonlendirici, Rotalar } from './router.jsx';
import { KabukBaglami } from './kabuk.js';
import AppShell from './components/AppShell.jsx';
import Applicants from './pages/Applicants.jsx';
import AttorneyFirms from './pages/AttorneyFirms.jsx';
import Departments from './pages/Departments.jsx';
import NotFound from './pages/NotFound.jsx';
import Partners from './pages/Partners.jsx';
import PatentList from './pages/PatentList.jsx';

const IKON_YAZI_TIPI =
  'https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap';

function ikonYaziTipiniYukle() {
  if (document.querySelector('link[data-patent-ikon]')) return;
  const el = document.createElement('link');
  el.rel = 'stylesheet';
  el.href = IKON_YAZI_TIPI;
  el.setAttribute('data-patent-ikon', '');
  document.head.appendChild(el);
}

// Liste ve çekmece rotaları aynı anahtarı paylaşır: çekmece açılıp kapanırken
// liste (filtre, sayfa) yeniden kurulmaz — orijinaldeki iç içe rota davranışı.
const ROTALAR = [
  { yol: '/', anahtar: 'liste', eleman: <PatentList /> },
  { yol: '/patents/new', anahtar: 'liste', eleman: <PatentList /> },
  { yol: '/patents/:id', anahtar: 'liste', eleman: <PatentList /> },
  { yol: '/applicants', eleman: <Applicants /> },
  { yol: '/departments', eleman: <Departments /> },
  { yol: '/attorney-firms', eleman: <AttorneyFirms /> },
  { yol: '/partners', eleman: <Partners /> },
];

export default function PatentOtomasyon({
  currentUser,
  baslangic,
  onDon,
  onBildirimler,
  bekleyenBildirim,
}) {
  const kok = useRef(null);

  useEffect(ikonYaziTipiniYukle, []);

  // Sayfa değişince orijinaldeki gibi en üstten başlasın.
  const sayfaDegisti = useMemo(
    () => () => {
      if (kok.current) kok.current.scrollTop = 0;
    },
    []
  );

  // Arkadaki Offline Asistan sayfası kaymasın.
  useEffect(() => {
    const onceki = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = onceki;
    };
  }, []);

  const kabuk = useMemo(
    () => ({
      onDon,
      onBildirimler,
      bekleyenBildirim: bekleyenBildirim || 0,
      kullanici: (currentUser && currentUser.name) || '',
    }),
    [onDon, onBildirimler, bekleyenBildirim, currentUser]
  );

  return (
    <div
      ref={kok}
      className="patent-kok"
      style={{ position: 'fixed', inset: 0, zIndex: 2000, overflowY: 'auto' }}
    >
      <KabukBaglami.Provider value={kabuk}>
        <BellekYonlendirici baslangic={baslangic || '/'} onDegis={sayfaDegisti}>
          <AppShell>
            <Rotalar rotalar={ROTALAR} bulunamadi={<NotFound />} />
          </AppShell>
        </BellekYonlendirici>
      </KabukBaglami.Provider>
    </div>
  );
}
