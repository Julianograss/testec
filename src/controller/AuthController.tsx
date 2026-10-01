/**
 * src/controller/AuthController.tsx
 *
 * Autenticação real via Supabase Auth + tabela `profiles`.
 * Ao criar a conta (signUp), o gatilho `handle_new_user` do banco já cria
 * a linha em `profiles` com role 'CUSTOMER' — aqui só completamos o endereço.
 * Promover alguém a ATTENDANT/KITCHEN/ADMIN é feito trocando `role` na
 * tabela `profiles` (tela de Equipe do admin, ou direto no Supabase).
 */
import React, { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { supabase } from '../services/supabase';

export type UserRole = 'CLIENT' | 'ATTENDANT' | 'KITCHEN' | 'ADMIN';
export interface AuthUser {
  id: string;
  name: string;
  role: UserRole;
  email: string;
  address?: string;
  phone?: string;
  cpf?: string;
  active?: boolean;
}
export interface RegisterData { name: string; email: string; password: string; address?: string; }

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<AuthUser>;
  logout: () => void;
  updateProfile: (patch: Partial<Pick<AuthUser, 'name' | 'email' | 'address'>>) => Promise<AuthUser>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  register: (data: RegisterData) => Promise<AuthUser>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

/** Traduz o texto livre de `profiles.role` para o papel usado nas rotas do app. */
export function normalizeUserRole(value: unknown): UserRole {
  const role = String(value || '').trim().toUpperCase();
  if (role === 'ADMIN' || role.includes('ADMINISTRADOR') || role.includes('GERENTE') || role.includes('CAIXA')) return 'ADMIN';
  if (role === 'ATTENDANT' || role.includes('ATEND') || role.includes('GARÇOM') || role.includes('GARCON')) return 'ATTENDANT';
  if (role === 'KITCHEN' || role.includes('COZIN')) return 'KITCHEN';
  return 'CLIENT';
}

async function fetchProfile(id: string, fallbackEmail?: string): Promise<AuthUser> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, name, role, email, phone, cpf, address, active')
    .eq('id', id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) {
    // O gatilho do banco cria o perfil no insert do auth.users; se ainda não
    // propagou (corrida rara logo após o cadastro), devolve um perfil mínimo.
    return { id, name: fallbackEmail?.split('@')[0] || 'Cliente', role: 'CLIENT', email: fallbackEmail || '' };
  }
  return {
    id: data.id,
    name: data.name,
    role: normalizeUserRole(data.role),
    email: data.email || fallbackEmail || '',
    address: data.address || undefined,
    phone: data.phone || undefined,
    cpf: data.cpf || undefined,
    active: data.active,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(async ({ data }) => {
      const authUser = data.session?.user;
      if (authUser) {
        try {
          const profile = await fetchProfile(authUser.id, authUser.email || undefined);
          if (mounted) setUser(profile);
        } catch {
          if (mounted) setUser(null);
        }
      }
      if (mounted) setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT' || !session?.user) {
        if (mounted) setUser(null);
        return;
      }
      try {
        const profile = await fetchProfile(session.user.id, session.user.email || undefined);
        if (mounted) setUser(profile);
      } catch {
        /* mantém o usuário anterior se a busca do perfil falhar momentaneamente */
      }
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string): Promise<AuthUser> => {
    const normalized = email.trim().toLowerCase();
    const { data, error } = await supabase.auth.signInWithPassword({ email: normalized, password });
    if (error) throw new Error(error.message === 'Invalid login credentials' ? 'Credenciais inválidas. Confira e-mail e senha.' : error.message);
    if (!data.user) throw new Error('Não foi possível entrar. Tente novamente.');
    const profile = await fetchProfile(data.user.id, data.user.email || normalized);
    setUser(profile);
    return profile;
  };

  const logout = () => {
    setUser(null);
    void supabase.auth.signOut();
  };

  const updateProfile = async (patch: Partial<Pick<AuthUser, 'name' | 'email' | 'address'>>): Promise<AuthUser> => {
    if (!user) throw new Error('Faça login para editar sua conta.');
    const nextEmail = patch.email ? patch.email.trim().toLowerCase() : user.email;

    // E-mail é gerenciado pelo Supabase Auth (precisa de confirmação); os
    // demais campos vivem só em `profiles`.
    if (patch.email && nextEmail !== user.email) {
      const { error: authError } = await supabase.auth.updateUser({ email: nextEmail });
      if (authError) throw new Error(authError.message);
    }

    const { error } = await supabase
      .from('profiles')
      .update({ name: patch.name ?? user.name, address: patch.address ?? user.address, email: nextEmail })
      .eq('id', user.id);
    if (error) throw new Error(error.message);

    const next: AuthUser = { ...user, name: patch.name ?? user.name, address: patch.address ?? user.address, email: nextEmail };
    setUser(next);
    return next;
  };

  const changePassword = async (currentPassword: string, newPassword: string) => {
    if (!user) throw new Error('Faça login para alterar sua senha.');
    if (newPassword.length < 6) throw new Error('A nova senha precisa ter pelo menos 6 caracteres.');
    // O Supabase não confere a senha atual sozinho: reautentica com ela antes de trocar.
    const { error: reauthError } = await supabase.auth.signInWithPassword({ email: user.email, password: currentPassword });
    if (reauthError) throw new Error('A senha atual está incorreta.');
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw new Error(error.message);
  };

  const register = async ({ name, email, password, address }: RegisterData): Promise<AuthUser> => {
    const normalized = email.trim().toLowerCase();
    if (name.trim().length < 2) throw new Error('Informe seu nome.');
    if (!/^\S+@\S+\.\S+$/.test(normalized)) throw new Error('Informe um e-mail válido.');
    if (password.length < 6) throw new Error('A senha precisa ter pelo menos 6 caracteres.');

    const { data, error } = await supabase.auth.signUp({
      email: normalized,
      password,
      options: { data: { name: name.trim() } },
    });
    if (error) throw new Error(error.message === 'User already registered' ? 'Já existe uma conta com este e-mail.' : error.message);
    if (!data.user) throw new Error('Não foi possível concluir o cadastro. Tente novamente.');

    // Se a confirmação por e-mail estiver desligada no projeto, já existe sessão aqui.
    if (address?.trim()) {
      await supabase.from('profiles').update({ address: address.trim() }).eq('id', data.user.id);
    }

    if (!data.session) {
      // Confirmação de e-mail ligada: não há sessão ainda.
      throw new Error('Cadastro realizado! Confirme seu e-mail para poder entrar.');
    }

    const profile = await fetchProfile(data.user.id, normalized);
    const finalProfile = address?.trim() ? { ...profile, address: address.trim() } : profile;
    setUser(finalProfile);
    return finalProfile;
  };

  const value = useMemo(() => ({ user, loading, login, logout, updateProfile, changePassword, register }), [user, loading]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth precisa estar dentro de <AuthProvider>.');
  return context;
}
