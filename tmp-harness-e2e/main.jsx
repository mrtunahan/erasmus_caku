import React from 'react';
import ReactDOM from 'react-dom/client';
import veri from './data.json';
window.React = React;
window.ReactDOM = ReactDOM;
window.__hatalar = [];
window.__yazilan = [];
window.addEventListener('error', (e) => window.__hatalar.push('error: ' + (e.message || e)));
window.addEventListener('unhandledrejection', (e) =>
  window.__hatalar.push(
    'rejection: ' + ((e.reason && (e.reason.stack || e.reason.message)) || e.reason)
  )
);
const data = JSON.parse(JSON.stringify(veri));
window.__data = data;
(async () => {
  await import('../shared-components.jsx');
  if (!window.DEPARTMENTS.some((d) => d.id === 'matematik'))
    window.DEPARTMENTS.push({
      id: 'matematik',
      name: 'Matematik',
      shortName: 'Matematik',
      color: '#333',
      facultyId: 'fen',
      kimlikler: ['matematik'],
    });
  const kopya = (x) => JSON.parse(JSON.stringify(x));
  window.apiRead = async (col, params) => {
    let l = data[col] || [];
    const w = params && params.where ? [].concat(params.where) : [];
    w.forEach((s) => {
      const [f, op, ...v] = String(s).split(':');
      const val = v.join(':');
      l = l.filter((d) => String(d[f]) === val);
    });
    return kopya(l);
  };
  window.apiReadDoc = async () => ({ exists: false });
  window.apiInvalidate = () => {};
  let n = 0;
  window.DBWrite._apiCall = async (ops) => {
    window.__yazilan.push(...kopya(ops));
    let id = null;
    ops.forEach((op) => {
      const c = (data[op.collection] = data[op.collection] || []);
      if (op.type === 'add') {
        id = 'yeni' + ++n;
        c.push({ ...kopya(op.data), id });
      } else if (op.type === 'update') {
        const d = c.find((x) => x.id === op.docId);
        if (d) Object.assign(d, kopya(op.data));
        else window.__hatalar.push('update missing doc ' + op.collection + '/' + op.docId);
      } else if (op.type === 'set') {
        const i = c.findIndex((x) => x.id === op.docId);
        const nd = { ...(op.merge && i >= 0 ? c[i] : {}), ...kopya(op.data), id: op.docId };
        if (i >= 0) c[i] = nd;
        else c.push(nd);
      } else if (op.type === 'delete') {
        const i = c.findIndex((x) => x.id === op.docId);
        if (i >= 0) c.splice(i, 1);
        else window.__hatalar.push('delete missing ' + op.collection + '/' + op.docId);
      }
    });
    return { success: true, id: id || 'yeni' + ++n };
  };
  // makine gonderildi with matching signature
  const SF = window.SinavFakulte;
  const mak = data.sinav_programi.filter((e) => e.departmentId === 'makine');
  const grup = SF.donemGrubu(data.sinav_donemler.find((d) => d.id === 'p_mak'));
  data.sinav_gonderimleri.push({
    id: SF.gonderimKimligi('makine', grup),
    bolumId: 'makine',
    facultyId: 'muhendislik',
    donemGrubu: grup,
    periodId: 'p_mak',
    durum: 'gonderildi',
    imza: SF.programImzasi(mak),
    sinavSayisi: mak.length,
    gonderen: 'Makine Yetkili',
  });
  await import('../sinav-otomasyonu.jsx');
  const q = new URLSearchParams(location.search);
  const currentUser = JSON.parse(q.get('u') || '{"role":"admin","name":"Admin"}');
  ReactDOM.createRoot(document.getElementById('root')).render(
    React.createElement(window.SinavOtomasyonuApp, {
      currentUser,
      activeDepartment: q.get('d') || 'bilgisayar',
    })
  );
})().catch((e) => window.__hatalar.push('boot: ' + e.stack));
