/**
 * Sessão da mesa deste aparelho.
 *
 *  - O cliente entra com o CÓDIGO da mesa (lido do QR ou digitado). Vários
 *    aparelhos podem entrar na mesma mesa ao mesmo tempo: cada um tem a sua
 *    sessão, todos pedem para a mesma mesa e enxergam a mesma conta.
 *  - A sessão é conferida no banco a cada poucos segundos e sempre que a mesa
 *    muda: se a mesa foi liberada pelo caixa (ou o código foi trocado), o
 *    aparelho sai da mesa sozinho e mostra um aviso.
 */
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../services/supabase';
import { onTablesChange } from '../services/realtime';
import { getTableCodeFromInput } from '../utils/tableLinks';

export type JoinResult = { ok: true; number: string } | { ok: false; error: string };

interface TableSessionValue {
  /** Número da mesa com 2 dígitos ("05"). */
  tableNumber: string | null;
  tableCode: string | null;
  sessionActive: boolean;
  source: 'qr' | 'manual' | null;
  joining: boolean;
  /** Aviso quando a mesa foi encerrada/trocada enquanto o cliente estava nela. */
  endedNotice: string | null;
  dismissEndedNotice: () => void;
  /** Entra na mesa a partir do link do QR ou do código digitado. */
  joinTable: (codeOrLink: string, source?: 'qr' | 'manual') => Promise<JoinResult>;
  closeTableSession: () => void;
}

type Saved = { tableNumber: string; tableCode: string; sessionId: string; source: 'qr' | 'manual' };

const STORAGE_KEY = 'fogo-fumaca-table-session-v2';
const CHECK_EVERY_MS = 20 * 1000;
const pad = (n: number | string) => String(n).padStart(2, '0');

const TableSessionContext = createContext<TableSessionValue | undefined>(undefined);

export function TableSessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Saved | null>(null);
  const [joining, setJoining] = useState(false);
  const [endedNotice, setEndedNotice] = useState<string | null>(null);
  const sessionRef = useRef<Saved | null>(null);
  sessionRef.current = session;

  const persist = useCallback(async (next: Saved | null) => {
    setSession(next);
    try {
      if (next) await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      else await AsyncStorage.removeItem(STORAGE_KEY);
    } catch {
      /* segue só em memória */
    }
  }, []);

  // Confere no banco se a sessão guardada ainda vale.
  const validate = useCallback(async () => {
    const current = sessionRef.current;
    if (!current) return;
    const { data, error } = await supabase.rpc('validate_table', { p_code: current.tableCode });
    if (error) return; // sem internet: não derruba o cliente
    const row = Array.isArray(data) ? data[0] : null;
    if (!row) {
      setEndedNotice('O código desta mesa foi trocado. Escaneie o QR Code da mesa novamente.');
      await persist(null);
    } else if (row.session_id !== current.sessionId || row.table_status === 'Livre') {
      setEndedNotice('A conta da mesa foi encerrada. Para fazer um novo pedido, escaneie o QR Code da mesa.');
      await persist(null);
    }
  }, [persist]);

  // Restaura a sessão guardada neste aparelho.
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (!raw) return;
        const saved = JSON.parse(raw) as Saved;
        if (saved?.tableCode && saved?.tableNumber) {
          setSession(saved);
          sessionRef.current = saved;
          void validate();
        }
      } catch {
        /* ignora */
      }
    })();
  }, [validate]);

  // Enquanto estiver numa mesa: confere periodicamente e quando a mesa mudar.
  const active = !!session;
  useEffect(() => {
    if (!active) return;
    const interval = setInterval(() => void validate(), CHECK_EVERY_MS);
    const stop = onTablesChange(['tables'], () => void validate());
    return () => {
      clearInterval(interval);
      stop();
    };
  }, [active, validate]);

  const joinTable = useCallback(
    async (codeOrLink: string, source: 'qr' | 'manual' = 'manual'): Promise<JoinResult> => {
      const code = getTableCodeFromInput(codeOrLink);
      if (!code) {
        return { ok: false, error: 'Código inválido. Digite os 6 caracteres impressos abaixo do QR Code da mesa.' };
      }
      setJoining(true);
      try {
        const { data, error } = await supabase.rpc('join_table', { p_code: code });
        if (error) return { ok: false, error: 'Não foi possível entrar na mesa. Verifique sua conexão e tente de novo.' };
        const row = Array.isArray(data) ? data[0] : null;
        if (!row) return { ok: false, error: 'Código não encontrado. Confira o código impresso embaixo do QR Code.' };
        const number = pad(row.table_number);
        setEndedNotice(null);
        await persist({ tableNumber: number, tableCode: code, sessionId: row.session_id, source });
        return { ok: true, number };
      } finally {
        setJoining(false);
      }
    },
    [persist],
  );

  const closeTableSession = useCallback(() => {
    void persist(null);
  }, [persist]);

  const value = useMemo<TableSessionValue>(
    () => ({
      tableNumber: session?.tableNumber ?? null,
      tableCode: session?.tableCode ?? null,
      sessionActive: !!session,
      source: session?.source ?? null,
      joining,
      endedNotice,
      dismissEndedNotice: () => setEndedNotice(null),
      joinTable,
      closeTableSession,
    }),
    [session, joining, endedNotice, joinTable, closeTableSession],
  );

  return <TableSessionContext.Provider value={value}>{children}</TableSessionContext.Provider>;
}

export function useTableSession(): TableSessionValue {
  const context = useContext(TableSessionContext);
  if (!context) throw new Error('useTableSession precisa estar dentro de <TableSessionProvider>.');
  return context;
}

/* ==========================================
   CONTA COMPARTILHADA DA MESA
   Todos os aparelhos da mesa enxergam os mesmos pedidos.
========================================== */
export type TableOrderRow = {
  number: string;
  status: string;
  customer: string;
  total: number;
  paymentStatus: string;
  createdAt: number;
  items: string;
};

export function useTableOrders() {
  const { tableCode } = useTableSession();
  const [orders, setOrders] = useState<TableOrderRow[]>([]);

  useEffect(() => {
    if (!tableCode) {
      setOrders([]);
      return;
    }
    let mounted = true;
    const load = async () => {
      const { data, error } = await supabase.rpc('table_orders', { p_code: tableCode });
      if (!mounted || error) return;
      setOrders(
        (data || []).map((row: any) => ({
          number: String(row.order_number),
          status: row.status,
          customer: row.customer_name || 'Mesa',
          total: Number(row.total),
          paymentStatus: row.payment_status,
          createdAt: Date.parse(row.created_at),
          items: row.items,
        })),
      );
    };
    void load();
    const interval = setInterval(load, 10 * 1000);
    const stop = onTablesChange(['orders', 'order_items'], () => void load());
    return () => {
      mounted = false;
      clearInterval(interval);
      stop();
    };
  }, [tableCode]);

  const total = useMemo(() => orders.reduce((sum, order) => sum + order.total, 0), [orders]);
  return { orders, total };
}
