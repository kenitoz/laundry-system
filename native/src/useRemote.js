import { useCallback, useEffect, useRef, useState } from 'react';

// Loads data for a screen. Results from an older load (deps changed, or the
// screen unmounted) are dropped so they can't overwrite newer data.
export function useRemote(loader, deps) {
  const [state, setState] = useState({ data: undefined, error: null, loading: true, refreshing: false });
  const run = useRef(0);
  const loaderRef = useRef(loader);
  loaderRef.current = loader;

  const load = useCallback(async (mode) => {
    const id = ++run.current;
    setState((s) => ({ ...s, loading: mode === 'load', refreshing: mode === 'refresh' }));
    try {
      const data = await loaderRef.current();
      if (id === run.current) setState({ data, error: null, loading: false, refreshing: false });
    } catch (error) {
      if (id === run.current) setState((s) => ({ ...s, error, loading: false, refreshing: false }));
    }
  }, []);

  useEffect(() => {
    load('load');
    return () => { run.current++; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  const reload = useCallback(() => load('reload'), [load]);
  const refresh = useCallback(() => load('refresh'), [load]);
  return { ...state, reload, refresh };
}
