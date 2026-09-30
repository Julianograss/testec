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
  'juliano.admin': { id: 4, name: 'Juliano Grass', role: 'ADMIN', email: 'juliano.admin' },
  'juliano.admin@gmail.com': { id: 4, name: 'Juliano Grass', role: 'ADMIN', email: 'juliano.admin@gmail.com' },
};

export function normalizeUserRole(value: unknown): UserRole {
  const role = String(value || '').trim().toUpperCase();
  if (role === 'ADMIN' || role.includes('ADMINISTRADOR') || role.includes('GERENTE') || role.includes('CAIXA')) return 'ADMIN';
  if (role === 'ATTENDANT' || role.includes('ATEND') || role.includes('GARÇOM') || role.includes('GARCON')) return 'ATTENDANT';
  if (role === 'KITCHEN' || role.includes('COZIN')) return 'KITCHEN';
  return 'CLIENT';
}

function roleForIdentifier(email: string, fallback: unknown): UserRole {
  const normalized = email.trim().toLowerCase();
  if (normalized === 'admin@gmail.com' || normalized === 'juliano.admin' || normalized === 'juliano.admin@gmail.com') return 'ADMIN';
  if (normalized === 'joao@gmail.com') return 'ATTENDANT';
  if (normalized === 'augusto@gmail.com') return 'KITCHEN';
  return normalizeUserRole(fallback);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => { const saved = readJson(SESSION_KEY, null); if (saved?.id) setUser({ ...saved, role: roleForIdentifier(saved.email || '', saved.role) }); setLoading(false); }, []);
  const login = async (email: string, password: string): Promise<AuthUser> => new Promise((resolve, reject) => {
    setTimeout(() => {
      const profiles = readJson(PROFILE_KEY, {});
      const accounts = { ...defaultAccounts, ...profiles };
      const normalized = email.trim().toLowerCase();
      const storedPassword = readJson(PASSWORD_KEY, {})[normalized] || '123456';
      const rawUser = accounts[normalized];
      const loggedUser = password === storedPassword && rawUser ? { ...rawUser, role: roleForIdentifier(normalized, rawUser.role) } : undefined;
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
