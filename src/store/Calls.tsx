/**
 * src/store/Calls.tsx
 *
 * Chamados abertos pelas mesas (atendimento, conta, etc.).
 * Mesmo padrão do store de pedidos: estado fora do React, telas apenas consomem.
 */
import { useMemo, useSyncExternalStore } from 'react';
import { CALLS } from '../data/demoData';

export type Call = {
  id: string;
  table: string;
  reason: string;
  createdAt: number;
  resolvedAt: number | null;
};

export type CallView = Call & { title: string };

const normalize = (raw: any): Call => ({ resolvedAt: null, ...raw });

// Troque por uma chamada à API quando o back-end existir.
const loadCalls = (): Call[] => CALLS.map(normalize);

let state: Call[] = loadCalls();
let snapshot: Call[] = state;
const listeners = new Set<() => void>();

const commit = (next: Call[]) => {
  state = next;
  snapshot = state;
  listeners.forEach(listener => listener());
};

export const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

export const getCalls = () => snapshot;

export const resolveCall = (id: string) =>
  commit(state.map(call => (call.id === id ? { ...call, resolvedAt: Date.now() } : call)));

export const openCall = (table: string, reason: string) =>
  commit([...state, normalize({ id: `ch${Date.now()}`, table, reason, createdAt: Date.now() })]);

export const reloadCalls = () => commit(loadCalls());

/** Chamados pendentes, do mais antigo para o mais novo. */
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
