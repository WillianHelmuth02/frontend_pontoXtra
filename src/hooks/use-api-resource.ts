import { useCallback, useEffect, useRef, useState } from 'react';

/** Consulta reutilizável para páginas autenticadas. O loader deve ser estável
 * (useCallback). Respostas ultrapassadas são ignoradas, inclusive após desmontar.
 * fresh=false impede gravar usando uma consulta que falhou ou está desatualizada.
 */
export function useApiResource<T>(loader: () => Promise<T>, enabled: boolean) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [fresh, setFresh] = useState(false);
  const sequence = useRef(0);
  const run = useCallback(() => {
    const request = ++sequence.current;
    return loader().then((value) => {
      if (request === sequence.current) { setData(value); setFresh(true); }
      return value;
    }).catch((cause: unknown) => {
      if (request === sequence.current) { setFresh(false); setError(cause instanceof Error ? cause.message : 'Não foi possível consultar a API.'); }
      return null;
    }).finally(() => { if (request === sequence.current) setLoading(false); });
  }, [loader]);
  useEffect(() => {
    const requests = sequence;
    if (enabled) void run();
    return () => { requests.current++; };
  }, [enabled, run]);
  const reload = useCallback(() => {
    setLoading(true); setFresh(false); setError('');
    return run();
  }, [run]);
  return { data, loading, error, fresh, reload };
}
