import { useFocusEffect } from 'expo-router';
import { useCallback, useRef } from 'react';

import { api } from './api';
import { useRemote } from './useRemote';

const toRow = (r) => {
  const total = Number(r.total_amount) || 0, paid = Number(r.amount_paid) || 0;
  return { id: r.id, name: r.customer_name, total, paid, out: Math.max(0, total - paid), time: r.transaction_time || '' };
};

// One day's transactions, oldest first (the API sends newest first, as on web).
export function useDay(date) {
  const day = useRemote(
    () => (date ? api('/transactions/date/' + date).then((d) => (d.transactions || []).map(toRow).reverse()) : Promise.resolve([])),
    [date],
  );
  const { mutate, reload } = day;

  // Tabs stay mounted, so refresh when the screen comes back into view
  // (e.g. after adding a customer on another tab). The first focus is the initial load.
  const seen = useRef(false);
  useFocusEffect(useCallback(() => {
    if (seen.current) reload();
    seen.current = true;
  }, [reload]));

  const patchRow = useCallback((id, changes) => {
    mutate((rows) => (rows || []).map((r) => {
      if (r.id !== id) return r;
      const next = { ...r, ...changes };
      return { ...next, out: Math.max(0, next.total - next.paid) };
    }));
    reload();
  }, [mutate, reload]);

  const removeRow = useCallback((id) => {
    mutate((rows) => (rows || []).filter((r) => r.id !== id));
    reload();
  }, [mutate, reload]);

  return { rows: day.data || [], loading: day.loading, error: day.error, refreshing: day.refreshing, refresh: day.refresh, reload, patchRow, removeRow };
}
