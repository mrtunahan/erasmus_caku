/**
 * OdemeAkisi.jsx — İş kaydının iki aşamalı ödeme akışı.
 *
 *   1. aşama: Firma → TTO tahsilatı        (tahsil edildi / edilmedi + tarih)
 *   2. aşama: TTO → akademisyen ödemesi    (ödendi / ödenmedi + tarih)
 *
 * Yeni kayıt formunda değil, İş Kayıtları'nda kayda tıklayınca açılan
 * panelde gösterilir; yönetici durumları ve tarihleri buradan değiştirir.
 * Kural sunucudadır (lib/tto-odeme.js): tahsilat yapılmadan ödeme
 * işaretlenemez, tarih verilmezse bugün yazılır, geri alınınca silinir.
 */
import { useEffect, useState } from 'react';
import { apiFetch, ApiError } from '../api.js';

const INSET_SM =
  'shadow-[inset_2px_2px_4px_rgba(0,0,0,0.05),inset_-2px_-2px_4px_rgba(255,255,255,0.6)]';
const RAISED = 'shadow-[4px_4px_10px_rgba(0,0,0,0.04),-4px_-4px_10px_rgba(255,255,255,0.6)]';

function bugun() {
  const d = new Date();
  const iki = (x) => String(x).padStart(2, '0');
  return d.getFullYear() + '-' + iki(d.getMonth() + 1) + '-' + iki(d.getDate());
}

export function trTarih(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso || ''));
  return m ? `${m[3]}.${m[2]}.${m[1]}` : '';
}

const ASAMALAR = [
  {
    no: 1,
    baslik: 'Firma → TTO Tahsilatı',
    durumAlani: 'firm_collection_status',
    tarihAlani: 'collected_date',
    yapildi: 'Tahsil Edildi',
    yapilmadi: 'Tahsil Edilmedi',
    tarihEtiketi: 'Tahsil tarihi',
  },
  {
    no: 2,
    baslik: 'TTO → Akademisyen Hakediş Ödemesi',
    durumAlani: 'payment_status',
    tarihAlani: 'paid_date',
    yapildi: 'Ödendi',
    yapilmadi: 'Ödenmedi',
    tarihEtiketi: 'Ödeme tarihi',
  },
];

export default function OdemeAkisi({ kayit, onGuncellendi, showToast }) {
  const [tarih, setTarih] = useState({});
  const [mesgul, setMesgul] = useState('');

  useEffect(() => {
    setTarih({
      collected_date: kayit.collected_date || bugun(),
      paid_date: kayit.paid_date || bugun(),
    });
  }, [kayit.id, kayit.collected_date, kayit.paid_date]);

  const tahsilEdildi = kayit.firm_collection_status === 'Tahsil Edildi';

  async function kaydet(a, durum, anahtar) {
    setMesgul(anahtar);
    try {
      const govde = { [a.durumAlani]: durum };
      if (durum === a.yapildi) govde[a.tarihAlani] = tarih[a.tarihAlani] || bugun();
      const guncel = await apiFetch(`/api/records/${kayit.id}`, {
        method: 'PUT',
        body: JSON.stringify(govde),
      });
      showToast?.(
        durum === a.yapildi
          ? `${a.baslik}: ${durum} (${trTarih(guncel[a.tarihAlani])})`
          : `${a.baslik}: ${durum}`,
        'success'
      );
      onGuncellendi?.(guncel);
    } catch (e) {
      if (e instanceof ApiError && e.status !== 401) showToast?.(e.message, 'error');
    } finally {
      setMesgul('');
    }
  }

  return (
    <div className="flex flex-col gap-3" data-odeme-akisi>
      <div className="text-xs font-semibold text-on-surface">Süreç / İki Aşamalı Ödeme Akışı</div>
      {ASAMALAR.map((a) => {
        const yapildi = kayit[a.durumAlani] === a.yapildi;
        const kilitli = a.no === 2 && !tahsilEdildi && !yapildi;
        const kayitliTarih = kayit[a.tarihAlani];
        return (
          <div
            key={a.no}
            data-asama={a.no}
            className={`flex flex-col gap-2.5 p-3 rounded-xl bg-surface ${INSET_SM}`}
          >
            <div className="flex items-center justify-between gap-2 text-xs">
              <span className="font-semibold text-on-surface flex items-center gap-1.5">
                <span
                  className={`w-1.5 h-1.5 rounded-full ${a.no === 1 ? 'bg-primary' : 'bg-secondary-fixed-dim'}`}
                />
                {a.no}. Aşama: {a.baslik}
              </span>
              <span
                data-asama-durum
                className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                  yapildi ? 'bg-tertiary/10 text-tertiary' : 'bg-primary/10 text-primary'
                }`}
              >
                {yapildi
                  ? `${a.yapildi}${kayitliTarih ? ' · ' + trTarih(kayitliTarih) : ''}`
                  : kayit[a.durumAlani] || a.yapilmadi}
              </span>
            </div>
            {kilitli ? (
              <div className="text-[11px] text-on-surface-variant">
                Akademisyene ödeme, firmadan tahsilat yapıldıktan sonra işaretlenebilir.
              </div>
            ) : (
              <div className="flex flex-wrap items-end gap-2">
                <label className="flex flex-col gap-1 text-[10px] text-on-surface-variant">
                  {a.tarihEtiketi}
                  <input
                    type="date"
                    data-tarih={a.tarihAlani}
                    max={bugun()}
                    value={tarih[a.tarihAlani] || ''}
                    onChange={(e) => setTarih((t) => ({ ...t, [a.tarihAlani]: e.target.value }))}
                    className={`px-2.5 py-1.5 rounded-lg bg-surface text-xs text-on-surface ${INSET_SM} focus:outline-none`}
                  />
                </label>
                <button
                  type="button"
                  disabled={!!mesgul}
                  data-isaretle={a.no}
                  onClick={() => kaydet(a, a.yapildi, a.no + 'e')}
                  className="px-3 py-2 rounded-lg bg-primary text-on-primary text-[11px] font-semibold disabled:opacity-50"
                >
                  {mesgul === a.no + 'e'
                    ? 'Kaydediliyor…'
                    : yapildi
                      ? 'Tarihi güncelle'
                      : `${a.yapildi} olarak işaretle`}
                </button>
                {yapildi && (
                  <button
                    type="button"
                    disabled={!!mesgul}
                    data-geri-al={a.no}
                    onClick={() => kaydet(a, a.yapilmadi, a.no + 'h')}
                    className={`px-3 py-2 rounded-lg bg-surface ${RAISED} text-[11px] font-semibold text-on-surface-variant hover:text-error disabled:opacity-50`}
                  >
                    {mesgul === a.no + 'h' ? 'Kaydediliyor…' : `Geri al (${a.yapilmadi})`}
                  </button>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
