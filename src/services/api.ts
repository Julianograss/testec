import { PRODUCTS, CATEGORIES, TABLES, STAFF, RESTAURANT } from '../data/demoData';
import MockDatabase from '../data/mockDatabase';

export const API_BASE_URL = 'https://api.fogoefumaca.com.br';
export const USE_MOCK_API = true;
const MOCK_LATENCY_MS = 180;

export class ApiError extends Error {
  constructor(message: string, public status = 0) { super(message); this.name = 'ApiError'; }
}

type MockDb = { products: any[]; categories: any[]; tables: any[]; staff: any[]; settings: any };
const memoryDb: MockDb = {
  products: PRODUCTS.map(item => ({ ...item })),
  categories: CATEGORIES.map(item => ({ ...item })),
  tables: TABLES.map(item => ({ ...item })),
  staff: STAFF.map(item => ({ ...item })),
  settings: { ...RESTAURANT, payments: { ...RESTAURANT.payments }, system: { ...RESTAURANT.system } },
};
const STORAGE_KEY = 'fogo-fumaca-api-db-v1';
const storage = () => (globalThis as any)?.localStorage as any;
const readDb = (): MockDb => {
  try { const saved = storage()?.getItem(STORAGE_KEY); if (saved) return JSON.parse(saved); } catch { /* usa memória */ }
  return memoryDb;
};
const writeDb = (db: MockDb) => {
  Object.assign(memoryDb, db);
  try { storage()?.setItem(STORAGE_KEY, JSON.stringify(db)); } catch { /* usa memória */ }
};
const wait = (ms = MOCK_LATENCY_MS) => new Promise(resolve => setTimeout(resolve, ms));
const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value));

async function request(method: string, path: string, body?: unknown): Promise<any> {
  if (USE_MOCK_API) { await wait(); return clone(body ?? { ok: true }); }
  let response: any;
  try { response = await fetch(`${API_BASE_URL}${path}`, { method, headers: { 'Content-Type': 'application/json' }, body: body !== undefined ? JSON.stringify(body) : undefined }); }
  catch (error: any) { throw new ApiError(error?.message || 'Falha de conexão com o servidor.'); }
  if (!response.ok) throw new ApiError(await response.text().catch(() => '') || `Erro ${response.status} ao acessar ${path}.`, response.status);
  if (response.status === 204) return null;
  return response.json().catch(() => null);
}

export const apiGet = (path: string) => request('GET', path);
export const apiPost = (path: string, body?: unknown) => request('POST', path, body);
export const apiPut = (path: string, body?: unknown) => request('PUT', path, body);
export const apiPatch = (path: string, body?: unknown) => request('PATCH', path, body);
export const apiDelete = (path: string) => request('DELETE', path);

type CollectionName = 'products' | 'categories' | 'tables' | 'staff';
const mockCollection = async (name: CollectionName) => { await wait(); return MockDatabase.get(name); };
const mockCreate = async (name: CollectionName, item: any) => { await wait(); return MockDatabase.insert(name, item); };
const mockUpdate = async (name: CollectionName, id: string, patch: any) => { await wait(); return MockDatabase.update(name, id, patch); };
const mockRemove = async (name: CollectionName, id: string) => { await wait(); return MockDatabase.remove(name, id); };

export const productsApi = { list: () => USE_MOCK_API ? mockCollection('products') : apiGet('/products'), create: (item: any) => USE_MOCK_API ? mockCreate('products', item) : apiPost('/products', item), update: (id: string, patch: any) => USE_MOCK_API ? mockUpdate('products', id, patch) : apiPut(`/products/${id}`, patch), remove: (id: string) => USE_MOCK_API ? mockRemove('products', id) : apiDelete(`/products/${id}`) };
export const categoriesApi = { list: () => USE_MOCK_API ? mockCollection('categories') : apiGet('/categories'), create: (item: any) => USE_MOCK_API ? mockCreate('categories', item) : apiPost('/categories', item), update: (id: string, patch: any) => USE_MOCK_API ? mockUpdate('categories', id, patch) : apiPut(`/categories/${id}`, patch), remove: (id: string) => USE_MOCK_API ? mockRemove('categories', id) : apiDelete(`/categories/${id}`) };
export const tablesApi = { list: () => USE_MOCK_API ? mockCollection('tables') : apiGet('/tables'), create: (item: any) => USE_MOCK_API ? mockCreate('tables', item) : apiPost('/tables', item), update: (id: string, patch: any) => USE_MOCK_API ? mockUpdate('tables', id, patch) : apiPut(`/tables/${id}`, patch), remove: (id: string) => USE_MOCK_API ? mockRemove('tables', id) : apiDelete(`/tables/${id}`) };
export const staffApi = { list: () => USE_MOCK_API ? mockCollection('staff') : apiGet('/staff'), create: (item: any) => USE_MOCK_API ? mockCreate('staff', item) : apiPost('/staff', item), update: (id: string, patch: any) => USE_MOCK_API ? mockUpdate('staff', id, patch) : apiPut(`/staff/${id}`, patch), remove: (id: string) => USE_MOCK_API ? mockRemove('staff', id) : apiDelete(`/staff/${id}`) };
export const settingsApi = { get: () => USE_MOCK_API ? MockDatabase.get('settings') : apiGet('/settings'), update: (settings: any) => USE_MOCK_API ? MockDatabase.replace('settings', settings) : apiPut('/settings', settings) };
export const ordersApi = { list: () => apiGet('/orders'), create: (order: any) => apiPost('/orders', order), updateStatus: (id: string, status: string, extra?: any) => apiPatch(`/orders/${id}/status`, { status, ...extra }), updateNotes: (id: string, notes: string) => apiPatch(`/orders/${id}/notes`, { notes }) };
export const authApi = { login: (email: string, password: string) => apiPost('/auth/login', { email, password }), changePassword: (payload: { currentPassword: string; newPassword: string }) => apiPost('/account/change-password', payload), endOtherSessions: () => apiPost('/account/end-other-sessions') };
export const reportsApi = { exportPdf: (payload: { period: string; html: string }) => apiPost('/reports/export-pdf', payload) };
