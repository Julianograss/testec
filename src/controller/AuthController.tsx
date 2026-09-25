import React, { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

export type UserRole = 'CLIENT' | 'ATTENDANT' | 'KITCHEN' | 'ADMIN';
export interface AuthUser { id: number; name: string; role: UserRole; email: string; address?: string; }
interface AuthContextValue { user: AuthUser | null; loading: boolean; login: (email: string, password: string) => Promise<AuthUser>; logout: () => void; updateProfile: (patch: Partial<Pick<AuthUser, 'name' | 'email' | 'address'>>) => Promise<AuthUser>; changePassword: (currentPassword: string, newPassword: string) => Promise<void>; }
const AuthContext = createContext<AuthContextValue | undefined>(undefined);
const SESSION_KEY = 'fogo-fumaca-auth-session-v1';
const PROFILE_KEY = 'fogo-fumaca-auth-profiles-v1';
const PASSWORD_KEY = 'fogo-fumaca-auth-passwords-v1';
const getStorage = () => (globalThis as any)?.localStorage as any;
const readJson = (key: string, fallback: any) => { try { const raw = getStorage()?.getItem(key); return raw ? JSON.parse(raw) : fallback; } catch { return fallback; } };
const writeJson = (key: string, value: any) => { try { getStorage()?.setItem(key, JSON.stringify(value)); } catch { /* memória */ } };

const defaultAccounts: Record<string, AuthUser> = {
  'lucas@gmail.com': { id: 1, name: 'Lucas', role: 'CLIENT', email: 'lucas@gmail.com', address: 'Não informado' },
  'joao@gmail.com': { id: 2, name: 'João', role: 'ATTENDANT', email: 'joao@gmail.com' },
  'augusto@gmail.com': { id: 3, name: 'Augusto', role: 'KITCHEN', email: 'augusto@gmail.com' },
  'admin@gmail.com': { id: 4, name: 'Admin', role: 'ADMIN', email: 'admin@gmail.com' },
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => { const saved = readJson(SESSION_KEY, null); if (saved?.id) setUser(saved); setLoading(false); }, []);
  const login = async (email: string, password: string): Promise<AuthUser> => new Promise((resolve, reject) => {
    setTimeout(() => {
      const profiles = readJson(PROFILE_KEY, {});
      const accounts = { ...defaultAccounts, ...profiles };
      const normalized = email.trim().toLowerCase();
      const loggedUser = password === (readJson(PASSWORD_KEY, {})[normalized] || '123456') ? accounts[normalized] : undefined;
      if (!loggedUser) { reject(new Error('Credenciais inválidas. Tente usar as contas de demonstração.')); return; }
      setUser(loggedUser); writeJson(SESSION_KEY, loggedUser); resolve(loggedUser);
    }, 250);
  });
  const logout = () => { setUser(null); try { getStorage()?.removeItem(SESSION_KEY); } catch { /* memória */ } };
  const updateProfile = async (patch: Partial<Pick<AuthUser, 'name' | 'email' | 'address'>>): Promise<AuthUser> => {
    if (!user) throw new Error('Faça login para editar sua conta.');
    const next = { ...user, ...patch, email: String(patch.email || user.email).trim().toLowerCase() };
    const profiles = readJson(PROFILE_KEY, {}); delete profiles[user.email]; profiles[next.email] = next; writeJson(PROFILE_KEY, profiles); setUser(next); writeJson(SESSION_KEY, next); return next;
  };
  const changePassword = async (currentPassword: string, newPassword: string) => {
    if (!user) throw new Error('Faça login para alterar sua senha.');
    const passwords = readJson(PASSWORD_KEY, {}); const current = passwords[user.email] || '123456';
    if (current !== currentPassword) throw new Error('A senha atual está incorreta.');
    if (newPassword.length < 6) throw new Error('A nova senha precisa ter pelo menos 6 caracteres.');
    passwords[user.email] = newPassword; writeJson(PASSWORD_KEY, passwords);
  };
  const value = useMemo(() => ({ user, loading, login, logout, updateProfile, changePassword }), [user, loading]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
export function useAuth(): AuthContextValue { const context = useContext(AuthContext); if (!context) throw new Error('useAuth precisa estar dentro de <AuthProvider>.'); return context; }
