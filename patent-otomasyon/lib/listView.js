import { EMPTY_FILTERS } from '../components/FilterBar';
// Patent Listesi görünüm durumu: çekmece rotaları sayfayı yeniden kullandığından filtre/sıralama/sayfa
// modül düzeyinde de tutulur.
export const view = {
  filters: EMPTY_FILTERS,
  sortBy: 'id',
  sortDir: 'asc',
  page: 1,
  pageSize: 25,
};
