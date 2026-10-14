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

/* ==========================================
   CÓDIGOS E IMAGEM DO QR DAS MESAS
   Só a equipe lê; só o admin altera. O cliente entra pelo RPC join_table.
========================================== */
export type TableQrInfo = { code: string; imagePath: string | null };

const QR_BUCKET = 'table-qr';
const QR_IMAGE_MAX_BYTES = 5 * 1024 * 1024;
const IMAGE_EXT: Record<string, string> = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/jpg': 'jpg', 'image/webp': 'webp' };

export const tableCodesApi = {
  /** Indexado pelo número da mesa com 2 dígitos ("05"). */
  async list(): Promise<Record<string, TableQrInfo>> {
    const { data, error } = await supabase.rpc('get_table_codes');
    if (error) throw asError(error, 'carregar os códigos das mesas');
    const map: Record<string, TableQrInfo> = {};
    (data || []).forEach((row: any) => {
      map[String(row.table_number).padStart(2, '0')] = { code: row.code, imagePath: row.qr_image_path || null };
    });
    return map;
  },

  /** Gera um novo código (invalida QR e imagem antigos) e apaga o arquivo da imagem anterior. */
  async rotate(tableNumber: string, oldImagePath?: string | null): Promise<string> {
    const { data, error } = await supabase.rpc('rotate_table_code', { p_number: Number(tableNumber) });
    if (error) throw asError(error, 'gerar um novo código');
    if (oldImagePath) await supabase.storage.from(QR_BUCKET).remove([oldImagePath]);
    return String(data);
  },

  /** Link temporário (1 h) para exibir a imagem privada. */
  async imageUrl(path: string): Promise<string | null> {
    const { data, error } = await supabase.storage.from(QR_BUCKET).createSignedUrl(path, 3600);
    return error ? null : data?.signedUrl ?? null;
  },

  /** Envia a imagem do QR (nova ou para trocar a atual). Devolve o caminho salvo. */
  async uploadImage(tableNumber: string, uri: string): Promise<string> {
    let buffer: ArrayBuffer;
    let contentType = '';
    try {
      const response = await fetch(uri);
      contentType = (response.headers.get('content-type') || '').split(';')[0];
      buffer = await response.arrayBuffer();
    } catch {
      throw new ApiError('Não foi possível ler a imagem escolhida.');
    }
    if (buffer.byteLength > QR_IMAGE_MAX_BYTES) throw new ApiError('A imagem é grande demais. Use um arquivo de até 5 MB.');
    const extFromUri = (uri.split('?')[0].match(/\.(png|jpe?g|webp)$/i)?.[1] || '').toLowerCase().replace('jpeg', 'jpg');
    const ext = IMAGE_EXT[contentType] || extFromUri || 'png';
    if (!contentType.startsWith('image/')) contentType = ext === 'jpg' ? 'image/jpeg' : `image/${ext}`;

    const path = `mesa-${tableNumber}-${Date.now()}.${ext}`;
    const { error: uploadError } = await supabase.storage.from(QR_BUCKET).upload(path, buffer, { contentType });
    if (uploadError) throw asError(uploadError, 'enviar a imagem do QR Code');

    const { data: previous, error } = await supabase.rpc('set_table_qr_image', { p_number: Number(tableNumber), p_path: path });
    if (error) {
      await supabase.storage.from(QR_BUCKET).remove([path]); // não deixa arquivo órfão
      throw asError(error, 'salvar a imagem do QR Code');
    }
    if (previous) await supabase.storage.from(QR_BUCKET).remove([previous as string]);
    return path;
  },

  /** Exclui a imagem (volta a valer o QR gerado pelo sistema). */
  async removeImage(tableNumber: string): Promise<void> {
    const { data: previous, error } = await supabase.rpc('set_table_qr_image', { p_number: Number(tableNumber), p_path: null });
    if (error) throw asError(error, 'excluir a imagem do QR Code');
    if (previous) await supabase.storage.from(QR_BUCKET).remove([previous as string]);
  },
};

/* ==========================================
   AUTENTICAÇÃO / SEGURANÇA
========================================== */
export const authApi = {
  async changePassword({ currentPassword, newPassword }: { currentPassword: string; newPassword: string }) {
    // Busca o usuário logado atualmente
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user?.email) throw asError(userError, 'Não foi possível validar sua sessão.');

    // Verifica se a senha atual está correta fazendo um "login" silencioso
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: currentPassword,
    });
    
    if (signInError) throw new ApiError('A senha atual está incorreta.');

    // Atualiza para a nova senha informada
    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword,
    });
    
    if (updateError) throw asError(updateError, 'Não foi possível alterar a senha.');
    return true;
  },

  async endOtherSessions() {
    // O Supabase possui uma função nativa para deslogar todos os outros dispositivos
    const { error } = await supabase.auth.signOut({ scope: 'others' });
    if (error) throw asError(error, 'Não foi possível encerrar as outras sessões.');
    return true;
  },
};

/* ==========================================
   RELATÓRIOS
========================================== */
export const reportsApi = {
  async exportPdf(params: { period: string; html: string }) {
    // No aplicativo nativo, a tela adminView já usa o 'expo-print' e o 'expo-sharing'
    // para gerar e compartilhar o arquivo fisicamente. Esta função fica aqui apenas 
    // para manter a compatibilidade ou para registrar o log no banco no futuro, se necessário.
    return Promise.resolve(true);
  },
};
