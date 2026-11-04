import { download, request } from './client';
export function listPatents(params, signal) {
  return request('GET', '/patents', { query: params, signal });
}
export function getPatent(id, signal) {
  return request('GET', `/patents/${id}`, { signal });
}
export function createPatent(body, confirmDuplicate = false) {
  return request('POST', '/patents', {
    body,
    query: { confirm_duplicate: confirmDuplicate ? true : undefined },
  });
}
export function updatePatent(id, body, confirmDuplicate = false) {
  return request('PUT', `/patents/${id}`, {
    body,
    query: { confirm_duplicate: confirmDuplicate ? true : undefined },
  });
}
export function removePatent(id) {
  return request('DELETE', `/patents/${id}`);
}
// Liste ucuyla aynı filtre / sıralama parametreleri; sayfalama yok.
export function exportPatents(params) {
  return download('/patents/export', params);
}
