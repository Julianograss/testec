/**
 * src/store/Calls.tsx
 *
 * Chamados abertos pelas mesas — gravados na tabela `calls` do Supabase,
 * com tempo real para o atendimento ver o chamado assim que a mesa fizer.
 */
import { useMemo, useSyncExternalStore } from 'react';
import { supabase, newUuid } from '../services/supabase';
import { onTablesChange } from '../services/realtime';

export type Call = {
  id: string;
  table: string;
  reason: string;
  createdAt: number;
  resolvedAt: number | null;
};

export type CallView = Call & { title: string };

let state: Call[] = [];
const listeners = new Set<() => void>();

const commit = (next: Call[]) => {
  state = next;
  listeners.forEach(listener => listener());
};

export const reloadCalls = async () => {
  const { data, error } = await supabase
    .from('calls')
    .select('id, reason, created_at, resolved_at, tables(number)')
    .order('created_at', { ascending: false })
    .limit(200);
  if (error) {
    console.warn('[Calls] falha ao carregar chamados:', error.message);
    return;
  }
  commit(
    (data || []).map((row: any) => ({
      id: row.id,
      table: String(row.tables?.number ?? ''),
      reason: row.reason,
      createdAt: Date.parse(row.created_at),
      resolvedAt: row.resolved_at ? Date.parse(row.resolved_at) : null,
    })),
  );
};

let stopRealtime: (() => void) | null = null;
let stopAuth: (() => void) | null = null;

export const subscribe = (listener: () => void) => {
  listeners.add(listener);
  if (listeners.size === 1) {
    void reloadCalls();
    stopRealtime = onTablesChange(['calls'], () => void reloadCalls());
    const { data } = supabase.auth.onAuthStateChange(() => {
      setTimeout(() => void reloadCalls(), 0);
    });
    stopAuth = () => data.subscription.unsubscribe();
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      stopRealtime?.();
      stopAuth?.();
      stopRealtime = stopAuth = null;
    }
  };
};

export const getCalls = () => state;

export const resolveCall = (id: string) => {
  commit(state.map(call => (call.id === id ? { ...call, resolvedAt: Date.now() } : call)));
  void supabase
    .from('calls')
    .update({ resolved_at: new Date().toISOString() })
    .eq('id', id)
    .then(({ error }) => {
      if (error) void reloadCalls();
    });
};

export const openCall = (table: string, reason: string) => {
  const id = newUuid();
  commit([...state, { id, table, reason, createdAt: Date.now(), resolvedAt: null }]);
  void (async () => {
    const { data } = await supabase.from('tables').select('id').eq('number', Number(table)).maybeSingle();
    const { error } = await supabase.from('calls').insert({ id, table_id: data?.id ?? null, reason });
    if (error) console.warn('[Calls] falha ao abrir chamado:', error.message);
    void reloadCalls();
  })();
};

export function useCalls() {
  const calls = useSyncExternalStore(subscribe, getCalls, getCalls);

  const pending: CallView[] = useMemo(
    () =>
      calls
        .filter(call => !call.resolvedAt)
        .sort((a, b) => a.createdAt - b.createdAt)
        .map(call => ({ ...call, title: `Mesa ${call.table}` })),
    [calls],
  );

  return { calls, pending, resolveCall, openCall };
}
