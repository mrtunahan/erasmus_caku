import { request } from './client';
export const listApplicants = (signal) => request('GET', '/applicants', { signal });
export const listDepartments = (signal) => request('GET', '/departments', { signal });
export const listFsmhTypes = (signal) => request('GET', '/fsmh_types', { signal });
export const listAttorneyFirms = (signal) => request('GET', '/attorney_firms', { signal });
// --- yazma uçları (create / update tam değiştirme / remove) ---
export const createApplicant = (body) => request('POST', '/applicants', { body });
export const updateApplicant = (id, body) => request('PUT', `/applicants/${id}`, { body });
export const removeApplicant = (id) => request('DELETE', `/applicants/${id}`);
export const createDepartment = (body) => request('POST', '/departments', { body });
export const updateDepartment = (id, body) => request('PUT', `/departments/${id}`, { body });
export const removeDepartment = (id) => request('DELETE', `/departments/${id}`);
export const createAttorneyFirm = (body) => request('POST', '/attorney_firms', { body });
export const updateAttorneyFirm = (id, body) => request('PUT', `/attorney_firms/${id}`, { body });
export const removeAttorneyFirm = (id) => request('DELETE', `/attorney_firms/${id}`);
export const createFsmhType = (body) => request('POST', '/fsmh_types', { body });
// --- salt okunur özetler (aktif patent sayıları ve başlıkları) ---
export const listPartners = (signal) => request('GET', '/partners', { signal });
export const listDepartmentSummary = (signal) => request('GET', '/departments/summary', { signal });
export const listAttorneyFirmSummary = (signal) =>
  request('GET', '/attorney_firms/summary', { signal });
export const listApplicantSummary = (signal) => request('GET', '/applicants/summary', { signal });
