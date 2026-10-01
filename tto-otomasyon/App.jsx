// ══════════════════════════════════════════════════════════════
// TTO Otomasyonu — Offline Asistan içindeki giriş bileşeni
//
// Orijinal uygulamanın App.jsx'inin karşılığı: aynı rotalar, aynı sayfalar,
// aynı bildirim (toast) sistemi. Farklar:
//   • Giriş ekranı yok — oturumu Offline Asistan açar; yetki sunucudadır
//     (yalnız TTO birimine kayıtlı akademisyen, server/routes/db.js).
//   • Tarayıcı adres çubuğu yerine bellekte yönlendirme (router.jsx).
//   • Ekran tam sayfa açılır (orijinaldeki gibi); "Offline Asistan'a dön"
//     düğmesi ya da "İşbirliği Talepleri" bağlantısıyla çıkılır.
// ══════════════════════════════════════════════════════════════
import { useEffect, useMemo, useRef } from 'react';
import './tto.css';
import { BellekYonlendirici, Rotalar } from './router.jsx';
import { oturumAyarla } from './api.js';
import { KabukBaglami } from './kabuk.js';
import { useToast, ToastContainer } from './components/Toast.jsx';
import RecordsList from './pages/RecordsList.jsx';
import RecordForm from './pages/RecordForm.jsx';
import AcademiciansList from './pages/AcademiciansList.jsx';
import AcademicianDetail from './pages/AcademicianDetail.jsx';
import FirmsList from './pages/FirmsList.jsx';
import FirmDetail from './pages/FirmDetail.jsx';
import Settings from './pages/Settings.jsx';

export default function TtoOtomasyon({ currentUser, onDon, onTalepler, bekleyenTalep }) {
  const { toasts, showToast, dismissToast } = useToast();
  const kok = useRef(null);
  oturumAyarla(currentUser);

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

  const rotalar = [
    { yol: '/', eleman: <RecordsList showToast={showToast} /> },
    { yol: '/records/new', eleman: <RecordForm showToast={showToast} /> },
    { yol: '/records/:id/edit', eleman: <RecordForm showToast={showToast} /> },
    { yol: '/academicians', eleman: <AcademiciansList showToast={showToast} /> },
    { yol: '/academicians/:id', eleman: <AcademicianDetail showToast={showToast} /> },
    { yol: '/firms', eleman: <FirmsList showToast={showToast} /> },
    { yol: '/firms/:id', eleman: <FirmDetail showToast={showToast} /> },
    { yol: '/settings', eleman: <Settings showToast={showToast} /> },
  ];

  return (
    <div
      ref={kok}
      className="tto-kok"
      style={{ position: 'fixed', inset: 0, zIndex: 2000, overflowY: 'auto' }}
    >
      <KabukBaglami.Provider value={{ onDon, onTalepler, bekleyenTalep }}>
        <BellekYonlendirici baslangic="/" onDegis={sayfaDegisti}>
          <Rotalar rotalar={rotalar} varsayilan="/" />
        </BellekYonlendirici>
      </KabukBaglami.Provider>
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
