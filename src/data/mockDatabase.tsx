import { PRODUCTS, CATEGORIES, TABLES, STAFF, RESTAURANT, ORDERS } from './demoData';

export type MockDatabaseState = {
  products: any[];
  categories: any[];
  tables: any[];
  staff: any[];
  settings: any;
  orders: any[];
};

const STORAGE_KEY = 'fogo-fumaca-mock-database-v1';
const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value));

const initialState = (): MockDatabaseState => ({
  products: PRODUCTS.map(item => ({ ...item })),
  categories: CATEGORIES.map(item => ({ ...item })),
  tables: TABLES.map(item => ({ ...item })),
  staff: STAFF.map(item => ({ ...item })),
  settings: { ...RESTAURANT, payments: { ...RESTAURANT.payments }, system: { ...RESTAURANT.system } },
  orders: ORDERS.map(item => ({ ...item, itemList: item.itemList.map(line => ({ ...line })) })),
});

let state: MockDatabaseState = initialState();

const getStorage = () => (globalThis as any)?.localStorage as any;
const hydrate = () => {
  try {
    const saved = getStorage()?.getItem(STORAGE_KEY);
    if (saved) state = { ...state, ...JSON.parse(saved) };
  } catch {
    // Em ambientes nativos sem localStorage, o estado da sessão permanece em memória.
  }
};
const persist = () => {
  try { getStorage()?.setItem(STORAGE_KEY, JSON.stringify(state)); } catch { /* fallback em memória */ }
};

hydrate();

export const MockDatabase = {
  async get<T extends keyof MockDatabaseState>(collection: T): Promise<MockDatabaseState[T]> {
    return clone(state[collection]);
  },
  async replace<T extends keyof MockDatabaseState>(collection: T, value: MockDatabaseState[T]) {
    state[collection] = clone(value) as never;
    persist();
    return clone(state[collection]);
  },
  async insert<T extends 'products' | 'categories' | 'tables' | 'staff'>(collection: T, value: any) {
    const saved = { ...value, id: value.id || `${collection}-${Date.now()}` };
    state[collection] = [...state[collection], saved] as never;
    persist();
    return clone(saved);
  },
  async update<T extends 'products' | 'categories' | 'tables' | 'staff'>(collection: T, id: string, patch: any) {
    state[collection] = state[collection].map(item => item.id === id ? { ...item, ...patch } : item) as never;
    persist();
    return clone(state[collection].find(item => item.id === id));
  },
  async remove<T extends 'products' | 'categories' | 'tables' | 'staff'>(collection: T, id: string) {
    state[collection] = state[collection].filter(item => item.id !== id) as never;
    persist();
    return { ok: true };
  },
  reset() {
    state = initialState();
    persist();
  },
};

export default MockDatabase;
