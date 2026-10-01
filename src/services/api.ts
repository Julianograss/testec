/**
 * src/services/api.ts
 *
 * Camada de acesso a dados do catálogo (produtos, categorias, mesas,
 * equipe e configurações), agora falando direto com o Supabase.
 * Mantém a MESMA interface pública de antes (productsApi.list/create/...)
 * para que o CatalogController e as telas não precisem mudar.
 */
import { supabase } from './supabase';

export class ApiError extends Error {
  constructor(message: string, public status = 0) { super(message); this.name = 'ApiError'; }
}

const asError = (error: { message: string } | null, fallback: string) => {
  if (!error) return null;
  return new ApiError(error.message || fallback);
};

const parsePrice = (value: string | number) => {
  if (typeof value === 'number') return value;
  const normalized = String(value).trim().replace(/\./g, '').replace(',', '.');
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
};
const formatPrice = (value: number) => value.toFixed(2).replace('.', ',');

/* ==========================================
   PRODUTOS
========================================== */
const fromProductRow = (row: any) => ({
  id: row.id,
  name: row.name,
  description: row.description || '',
  category: row.categories?.name || '',
  categoryId: row.category_id || null,
  price: formatPrice(Number(row.price)),
  image: row.image_url || null,
  active: row.active,
  highlight: row.highlight,
});

async function resolveCategoryId(categoryName: string): Promise<string | null> {
  if (!categoryName) return null;
  const { data } = await supabase.from('categories').select('id').eq('name', categoryName).maybeSingle();
  return data?.id ?? null;
}

export const productsApi = {
  async list() {
    const { data, error } = await supabase.from('products').select('*, categories(name)').order('created_at');
    if (error) throw asError(error, 'carregar os produtos');
    return (data || []).map(fromProductRow);
  },
  async create(item: any) {
    const categoryId = await resolveCategoryId(item.category);
    const { data, error } = await supabase
      .from('products')
      .insert({
        name: item.name,
        description: item.description || null,
        category_id: categoryId,
        price: parsePrice(item.price),
        image_url: item.image || null,
        active: item.active ?? true,
        highlight: item.highlight ?? false,
      })
      .select('*, categories(name)')
      .single();
    if (error) throw asError(error, 'criar o produto');
    return fromProductRow(data);
  },
  async update(id: string, patch: any) {
    const payload: Record<string, any> = {};
    if (patch.name !== undefined) payload.name = patch.name;
    if (patch.description !== undefined) payload.description = patch.description;
    if (patch.price !== undefined) payload.price = parsePrice(patch.price);
    if (patch.image !== undefined) payload.image_url = patch.image;
    if (patch.active !== undefined) payload.active = patch.active;
    if (patch.highlight !== undefined) payload.highlight = patch.highlight;
    if (patch.category !== undefined) payload.category_id = await resolveCategoryId(patch.category);
    const { error } = await supabase.from('products').update(payload).eq('id', id);
    if (error) throw asError(error, 'atualizar o produto');
    return true;
  },
  async remove(id: string) {
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) throw asError(error, 'excluir o produto');
    return true;
  },
};

/* ==========================================
   CATEGORIAS
========================================== */
export const categoriesApi = {
  async list() {
    const { data, error } = await supabase.from('categories').select('*').order('created_at');
    if (error) throw asError(error, 'carregar as categorias');
    return (data || []).map((row: any) => ({ id: row.id, name: row.name, description: row.description || '', active: row.active }));
  },
  async create(item: any) {
    const { data, error } = await supabase
      .from('categories')
      .insert({ name: item.name, description: item.description || null, active: item.active ?? true })
      .select()
      .single();
    if (error) throw asError(error, 'criar a categoria');
    return { id: data.id, name: data.name, description: data.description || '', active: data.active };
  },
  async update(id: string, patch: any) {
    const { error } = await supabase.from('categories').update(patch).eq('id', id);
    if (error) throw asError(error, 'atualizar a categoria');
    return true;
  },
  async remove(id: string) {
    const { error } = await supabase.from('categories').delete().eq('id', id);
    if (error) throw asError(error, 'excluir a categoria (verifique se ela ainda tem produtos)');
    return true;
  },
};

/* ==========================================
   MESAS
========================================== */
const fromTableRow = (row: any) => ({
  id: row.id,
  number: String(row.number).padStart(2, '0'),
  status: row.status,
  waiter: row.profiles?.name || null,
});

export const tablesApi = {
  async list() {
    const { data, error } = await supabase.from('tables').select('*, profiles(name)').order('number');
    if (error) throw asError(error, 'carregar as mesas');
    return (data || []).map(fromTableRow);
  },
  async create(item: any) {
    const { data, error } = await supabase
      .from('tables')
      .insert({ number: Number(item.number), status: item.status || 'Livre' })
      .select('*, profiles(name)')
      .single();
    if (error) throw asError(error, 'criar a mesa');
    return fromTableRow(data);
  },
  async update(id: string, patch: any) {
    const payload: Record<string, any> = {};
    if (patch.status !== undefined) payload.status = patch.status;
    if (patch.number !== undefined) payload.number = Number(patch.number);
    if ('waiter' in patch) {
      // O app trabalha com o nome do garçom; resolve para o id do perfil (melhor esforço).
      payload.waiter_id = null;
      if (patch.waiter) {
        const { data } = await supabase.from('profiles').select('id').ilike('name', patch.waiter).limit(1).maybeSingle();
        payload.waiter_id = data?.id ?? null;
      }
    }
    const { error } = await supabase.from('tables').update(payload).eq('id', id);
    if (error) throw asError(error, 'atualizar a mesa');
    return true;
  },
  async remove(id: string) {
    const { error } = await supabase.from('tables').delete().eq('id', id);
    if (error) throw asError(error, 'excluir a mesa');
    return true;
  },
};

/* ==========================================
   EQUIPE (profiles com role diferente de CUSTOMER)
========================================== */
const fromStaffRow = (row: any) => ({
  id: row.id,
  name: row.name,
  role: row.role,
  cpf: row.cpf || '',
  phone: row.phone || '',
  login: row.email || '',
  active: row.active,
});

export const staffApi = {
  async list() {
    const { data, error } = await supabase.from('profiles').select('*').neq('role', 'CUSTOMER').order('name');
    if (error) throw asError(error, 'carregar a equipe');
    return (data || []).map(fromStaffRow);
  },
  async create(_item: any): Promise<never> {
    // Criar um login novo exige a Admin API do Supabase (chave service_role),
    // que não pode ficar no app do cliente. Fluxo: a pessoa cria a própria
    // conta pela tela de Cadastro (ou você cria em Authentication > Users);
    // depois é só editar o cargo dela aqui para promovê-la à equipe.
    throw new ApiError('Para adicionar alguém à equipe, peça que a pessoa crie uma conta pela tela de Cadastro (ou crie-a em Authentication, no Supabase). Depois, edite o cargo dela aqui.');
  },
  async update(id: string, patch: any) {
    const payload: Record<string, any> = {};
    if (patch.name !== undefined) payload.name = patch.name;
    if (patch.role !== undefined) payload.role = patch.role;
    if (patch.cpf !== undefined) payload.cpf = patch.cpf;
    if (patch.phone !== undefined) payload.phone = patch.phone;
    if (patch.active !== undefined) payload.active = patch.active;
    const { error } = await supabase.from('profiles').update(payload).eq('id', id);
    if (error) throw asError(error, 'atualizar o funcionário');
    return true;
  },
  async remove(id: string) {
    // Não é possível apagar a conta de login pelo app (Admin API); desativa o
    // acesso em vez disso — a pessoa deixa de ser considerada equipe ativa.
    const { error } = await supabase.from('profiles').update({ active: false }).eq('id', id);
    if (error) throw asError(error, 'desativar o funcionário');
    return true;
  },
};

/* ==========================================
   CONFIGURAÇÕES (linha única em restaurant_settings)
========================================== */
const DEFAULT_SETTINGS = {
  name: 'Fogo & Fumaça',
  address: '',
  phone: '',
  hours: '',
  averagePrepMinutes: '25',
  delivery: true,
  takeaway: true,
  payments: { pix: true, cash: true, credit: true, debit: true },
  system: { sound: true, darkMode: false },
};

const fromSettingsRow = (row: any) => ({
  id: row.id,
  name: row.name,
  address: row.address || '',
  phone: row.phone || '',
  hours: row.hours || '',
  averagePrepMinutes: String(row.average_prep_minutes ?? 25),
  delivery: row.delivery_enabled ?? true,
  takeaway: row.takeaway_enabled ?? true,
  payments: row.payments || DEFAULT_SETTINGS.payments,
  system: row.system || DEFAULT_SETTINGS.system,
});

export const settingsApi = {
  async get() {
    const { data, error } = await supabase.from('restaurant_settings').select('*').limit(1).maybeSingle();
    if (error) throw asError(error, 'carregar as configurações');
    if (!data) return DEFAULT_SETTINGS;
    return fromSettingsRow(data);
  },
  async update(next: any) {
    const payload = {
      name: next.name,
      address: next.address,
      phone: next.phone,
      hours: next.hours,
      average_prep_minutes: Number(next.averagePrepMinutes) || 25,
      delivery_enabled: next.delivery,
      takeaway_enabled: next.takeaway,
      payments: next.payments,
      system: next.system,
    };
    const { data: existing } = await supabase.from('restaurant_settings').select('id').limit(1).maybeSingle();
    const query = existing
      ? supabase.from('restaurant_settings').update(payload).eq('id', existing.id)
      : supabase.from('restaurant_settings').insert(payload);
    const { error } = await query;
    if (error) throw asError(error, 'salvar as configurações');
    return true;
  },
};
