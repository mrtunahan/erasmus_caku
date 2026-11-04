import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { isAbort } from '../api/client';
import { listApplicants, listAttorneyFirms, listDepartments, listFsmhTypes } from '../api/lookups';
const LookupsContext = createContext({ lookups: null, error: false, reload: async () => {} });
export const useLookups = () => useContext(LookupsContext);
// Dört lookup listesinin tek yükleme / yenileme noktası: filtre çubuğu, patent çekmecesi ve sayfalar aynı veriyi görür.
export function LookupsProvider({ children }) {
  const [lookups, setLookups] = useState(null);
  const [error, setError] = useState(false);
  const controller = useRef(null);
  const reload = useCallback(async () => {
    controller.current?.abort();
    const current = new AbortController();
    controller.current = current;
    try {
      const [applicants, departments, fsmhTypes, attorneyFirms] = await Promise.all([
        listApplicants(current.signal),
        listDepartments(current.signal),
        listFsmhTypes(current.signal),
        listAttorneyFirms(current.signal),
      ]);
      setLookups({ applicants, departments, fsmhTypes, attorneyFirms });
      setError(false);
    } catch (err) {
      if (!isAbort(err)) setError(true);
      throw err;
    }
  }, []);
  useEffect(() => {
    reload().catch(() => {});
    return () => controller.current?.abort();
  }, [reload]);
  const value = useMemo(() => ({ lookups, error, reload }), [lookups, error, reload]);
  return <LookupsContext.Provider value={value}>{children}</LookupsContext.Provider>;
}
