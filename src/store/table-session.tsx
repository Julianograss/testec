import React, { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

interface TableSessionValue {
  tableNumber: string | null;
  sessionActive: boolean;
  source: 'qr' | 'manual' | null;
  openTableSession: (number: string, source?: 'qr' | 'manual') => void;
  closeTableSession: () => void;
}

const STORAGE_KEY = 'fogo-fumaca-table-session-v1';
const TableSessionContext = createContext<TableSessionValue | undefined>(undefined);
const getStorage = () => (globalThis as any)?.localStorage as any;

export function TableSessionProvider({ children }: { children: ReactNode }) {
  const [tableNumber, setTableNumber] = useState<string | null>(null);
  const [source, setSource] = useState<'qr' | 'manual' | null>(null);

  useEffect(() => {
    try {
      const saved = getStorage()?.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed?.tableNumber) {
          setTableNumber(String(parsed.tableNumber));
          setSource(parsed.source === 'qr' ? 'qr' : 'manual');
        }
      }
    } catch {
      // No celular, o estado continua válido durante a sessão do app.
    }
  }, []);

  const openTableSession = (number: string, nextSource: 'qr' | 'manual' = 'qr') => {
    const normalized = String(number).trim().replace(/^0+(?=\d)/, '');
    if (!normalized) return;
    setTableNumber(normalized);
    setSource(nextSource);
    try { getStorage()?.setItem(STORAGE_KEY, JSON.stringify({ tableNumber: normalized, source: nextSource })); } catch { /* memória */ }
  };

  const closeTableSession = () => {
    setTableNumber(null);
    setSource(null);
    try { getStorage()?.removeItem(STORAGE_KEY); } catch { /* memória */ }
  };

  return <TableSessionContext.Provider value={{ tableNumber, sessionActive: Boolean(tableNumber), source, openTableSession, closeTableSession }}>{children}</TableSessionContext.Provider>;
}

export function useTableSession(): TableSessionValue {
  const context = useContext(TableSessionContext);
  if (!context) throw new Error('useTableSession precisa estar dentro de <TableSessionProvider>.');
  return context;
}
