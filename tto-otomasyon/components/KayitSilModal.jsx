/**
 * KayitSilModal.jsx — Firma / akademisyen silme onayı.
 *
 * Kişi iş kayıtlarında geçiyorsa bu açıkça söylenir ve silme o iş
 * kayıtlarıyla birlikte yapılır (ödeme defterinde sahipsiz kayıt kalmasın).
 */
import { useEffect, useState } from 'react';
import { apiFetch, ApiError, kisiKullanimi } from '../api.js';

const RAISED = 'shadow-[4px_4px_10px_rgba(0,0,0,0.04),-4px_-4px_10px_rgba(255,255,255,0.6)]';

const CINS = {
  firms: { ad: 'firma', baslik: 'Firmayı sil' },
  academicians: { ad: 'akademisyen', baslik: 'Akademisyeni sil' },
};

export default function KayitSilModal({ kaynak, hedef, onClose, onDeleted, showToast }) {
  const [kullanim, setKullanim] = useState(null);
  const [siliniyor, setSiliniyor] = useState(false);
  const c = CINS[kaynak] || { ad: 'kayıt', baslik: 'Sil' };

  useEffect(() => {
    if (!hedef) return;
    let iptal = false;
    setKullanim(null);
    kisiKullanimi(kaynak, hedef.id)
      .then((n) => !iptal && setKullanim(n))
      .catch(() => !iptal && setKullanim(0));
    return () => {
      iptal = true;
    };
  }, [kaynak, hedef]);

  if (!hedef) return null;

  async function sil() {
    setSiliniyor(true);
    try {
      await apiFetch(`/api/${kaynak}/${hedef.id}${kullanim > 0 ? '?kayitlarla=1' : ''}`, {
        method: 'DELETE',
      });
      showToast?.(`${hedef.ad} silindi.`, 'success');
      onDeleted?.();
    } catch (e) {
      if (e instanceof ApiError && e.status !== 401) showToast?.(e.message, 'error');
    } finally {
      setSiliniyor(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-on-surface/20 backdrop-blur-sm p-4"
      data-kayit-sil
    >
      <div className="w-full max-w-sm rounded-2xl bg-surface shadow-[10px_10px_30px_rgba(0,0,0,0.12),-10px_-10px_30px_rgba(255,255,255,0.8)] p-6 flex flex-col gap-4">
        <h3 className="text-base font-semibold text-on-surface">{c.baslik}</h3>
        <p className="text-on-surface-variant text-sm">
          <b className="text-on-surface">{hedef.ad}</b> kalıcı olarak silinecek.
        </p>
        {kullanim === null ? (
          <p className="text-on-surface-variant text-xs">İş kayıtları denetleniyor…</p>
        ) : kullanim > 0 ? (
          <p className="text-error text-xs font-medium">
            Bu {c.ad} {kullanim} iş kaydında geçiyor. Bu iş kayıtları da birlikte silinecek. Bu
            işlem geri alınamaz.
          </p>
        ) : (
          <p className="text-on-surface-variant text-xs">Bu işlem geri alınamaz.</p>
        )}
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={siliniyor}
            className={`px-4 py-2 rounded-xl bg-surface ${RAISED} text-xs font-medium text-on-surface-variant hover:text-on-surface disabled:opacity-50`}
          >
            Vazgeç
          </button>
          <button
            type="button"
            onClick={sil}
            disabled={siliniyor || kullanim === null}
            className="px-4 py-2 rounded-xl bg-error text-on-error text-xs font-semibold disabled:opacity-50"
          >
            {siliniyor ? 'Siliniyor…' : kullanim > 0 ? 'İş kayıtlarıyla birlikte sil' : 'Evet, Sil'}
          </button>
        </div>
      </div>
    </div>
  );
}
