import { useCallback, useEffect, useState } from 'react';
import { ApiError, isAbort } from '../api/client';
import { useToast } from '../components/Toast';
// Küçük liste yükleyici (fetcher modül düzeyinde sabit bir fonksiyon olmalı).
export function useList(fetcher) {
  const [items, setItems] = useState(null);
  const [status, setStatus] = useState('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setStatus('loading');
    fetcher(controller.signal)
      .then((result) => {
        setItems(result);
        setStatus('ready');
      })
      .catch((err) => {
        if (isAbort(err)) return;
        setErrorMessage(err instanceof ApiError ? err.detail : 'Liste yüklenemedi.');
        setStatus('error');
      });
    return () => controller.abort();
  }, [tick]);
  const reload = useCallback(() => setTick((n) => n + 1), []);
  return { items, status, errorMessage, reload };
}
export function describeError(err) {
  if (err instanceof ApiError)
    return { message: err.detail, fieldErrors: err.fieldErrors, notFound: err.status === 404 };
  return { message: 'Beklenmeyen bir hata oluştu.', fieldErrors: {}, notFound: false };
}
// Tablodaki sil ikonu: onay -> DELETE -> toast -> liste yenile (409 dahil backend mesajı toast'ta).
export function useRowDelete(remove, onDone) {
  const toast = useToast();
  const [target, setTarget] = useState(null);
  const [busy, setBusy] = useState(false);
  const confirm = async () => {
    if (!target) return;
    setBusy(true);
    try {
      await remove(target.id);
      toast('Kayıt silindi.');
    } catch (err) {
      const { message, notFound } = describeError(err);
      toast(notFound ? 'Kayıt bulunamadı.' : message);
    }
    setBusy(false);
    setTarget(null);
    onDone();
  };
  return { target, setTarget, busy, confirm };
}
// İstemci tarafı arama: Türkçe büyük/küçük harf duyarsız.
export const matchesQuery = (q, ...texts) => {
  const needle = q.trim().toLocaleLowerCase('tr');
  return !needle || texts.some((text) => (text ?? '').toLocaleLowerCase('tr').includes(needle));
};
