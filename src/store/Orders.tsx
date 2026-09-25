/**
 * src/store/Orders.tsx
 *
 * Fonte única de verdade dos pedidos — usada pela cozinha, pelo atendimento e pelo admin.
 * Funciona como o AuthController: concentra o estado e as regras num lugar só,
 * e as telas apenas consomem.
 *
 * Diferença: aqui o estado vive fora do React (padrão "external store"), para que
 * funções como `updateOrderStatus` possam ser chamadas de qualquer lugar,
 * inclusive fora de um componente.
 *
 * Para plugar a API: troque `loadOrders()` por um fetch e chame `setOrders(...)`.
 */
import { useCallback, useMemo, useSyncExternalStore } from 'react';
import { ORDERS } from '../data/demoData';
import MockDatabase from '../data/mockDatabase';

/* ==========================================
   TIPOS
========================================== */
export type OrderStatus = 'Recebido' | 'Em preparo' | 'Pronto' | 'Entregue' | 'Cancelado';
export type OrderType = 'Local' | 'Delivery' | 'Retirada';

export type OrderItem = { name: string; qty: number; price: number };

export type Order = {
  id: string;
  type: OrderType;
  customer: string;
  table: string | null;
  attendant: string | null;
  payment: string;
  status: OrderStatus;
  itemList: OrderItem[];
  createdAt: number;
  startedAt: number | null;
  readyAt: number | null;
  closedAt: number | null;
  ownerId?: number;
  ownerEmail?: string;
};

/** Pedido com os campos prontos para exibição (itens em texto, total e hora formatados). */
export type OrderView = Order & {
  items: string;
  total: string;
  totalValue: number;
  time: string;
};

export const ORDER_FLOW: OrderStatus[] = ['Recebido', 'Em preparo', 'Pronto', 'Entregue'];

/** Tradução do status para as colunas do painel da cozinha. */
export const KITCHEN_COLUMNS = {
  queue: 'Recebido' as OrderStatus,
  preparing: 'Em preparo' as OrderStatus,
  completed: 'Pronto' as OrderStatus,
};

/* ==========================================
   FORMATAÇÃO
========================================== */
export const formatMoney = (value: number) =>
  value.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.');

export const formatTime = (timestamp: number) =>
  new Date(timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

export const orderTotal = (order: Order) =>
  order.itemList.reduce((sum, item) => sum + item.qty * item.price, 0);

export const orderItemsLabel = (order: Order) =>
  order.itemList.map(item => `${item.qty}x ${item.name}`).join(', ');

/** Minutos decorridos desde um instante (usado nos cronômetros da cozinha). */
export const elapsedMinutes = (from: number, now: number = Date.now()) =>
  Math.max(0, Math.floor((now - from) / 60000));

export const formatElapsed = (from: number, now: number = Date.now()) => {
  const total = elapsedMinutes(from, now);
  if (total < 1) return 'agora';
  if (total < 60) return `${String(total).padStart(2, '0')} min`;
  return `${Math.floor(total / 60)}h ${String(total % 60).padStart(2, '0')}min`;
};

/* ==========================================
   ESTADO
========================================== */
const normalize = (raw: any): Order => ({
  table: null,
  attendant: null,
  payment: 'Não informado',
  status: 'Recebido',
  itemList: [],
  startedAt: null,
  readyAt: null,
  closedAt: null,
  ...raw,
});

const decorate = (order: Order): OrderView => {
  const totalValue = orderTotal(order);
  return {
    ...order,
    items: orderItemsLabel(order),
    totalValue,
    total: formatMoney(totalValue),
    time: formatTime(order.createdAt),
  };
};

// Troque esta linha por uma chamada à API quando o back-end existir.
const loadOrders = (): Order[] => ORDERS.map(normalize);

let state: Order[] = loadOrders();
let snapshot: OrderView[] = state.map(decorate);
const listeners = new Set<() => void>();

const commit = (next: Order[]) => {
  state = next;
  snapshot = state.map(decorate);
  void MockDatabase.replace('orders', state);
  listeners.forEach(listener => listener());
};

export const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

export const getOrders = (): OrderView[] => snapshot;

void MockDatabase.get('orders').then(savedOrders => {
  if (Array.isArray(savedOrders) && savedOrders.length > 0) {
    state = savedOrders.map(normalize);
    snapshot = state.map(decorate);
    listeners.forEach(listener => listener());
  }
});

/* ==========================================
   AÇÕES (podem ser chamadas de qualquer lugar)
========================================== */
const stamp = (order: Order, status: OrderStatus): Order => {
  const now = Date.now();
  switch (status) {
    case 'Recebido':
      return { ...order, status, startedAt: null, readyAt: null, closedAt: null };
    case 'Em preparo':
      return { ...order, status, startedAt: order.startedAt ?? now, readyAt: null, closedAt: null };
    case 'Pronto':
      return { ...order, status, startedAt: order.startedAt ?? now, readyAt: now, closedAt: null };
    case 'Entregue':
    case 'Cancelado':
      return { ...order, status, closedAt: now };
    default:
      return order;
  }
};

export const updateOrderStatus = (id: string, status: OrderStatus) => {
  commit(state.map(order => (order.id === id ? stamp(order, status) : order)));
};

export const advanceOrder = (id: string) => {
  const order = state.find(item => item.id === id);
  if (!order || order.status === 'Cancelado') return;
  const next = ORDER_FLOW[Math.min(ORDER_FLOW.indexOf(order.status) + 1, ORDER_FLOW.length - 1)];
  updateOrderStatus(id, next);
};

export const revertOrder = (id: string) => {
  const order = state.find(item => item.id === id);
  if (!order) return;
  const index = ORDER_FLOW.indexOf(order.status);
  if (index <= 0) return;
  updateOrderStatus(id, ORDER_FLOW[index - 1]);
};

export const cancelOrder = (id: string) => updateOrderStatus(id, 'Cancelado');

export const addOrder = (input: Partial<Order> & { itemList: OrderItem[] }) => {
  const order = normalize({
    id: input.id ?? String(Date.now()).slice(-4),
    type: 'Local',
    customer: 'Balcão',
    createdAt: Date.now(),
    ...input,
  });
  commit([...state, order]);
  return order;
};

export const getOrdersForUser = (user: { id: number; email: string; name?: string } | null): OrderView[] => {
  if (!user) return [];
  return snapshot.filter(order => order.ownerId === user.id || order.ownerEmail === user.email || order.customer.toLowerCase().includes((user.name || '').toLowerCase()));
};

export const removeOrder = (id: string) => commit(state.filter(order => order.id !== id));

/** Descarta as alterações locais e recarrega a origem dos dados. */
export const reloadOrders = () => commit(loadOrders());

/* ==========================================
   HOOKS
========================================== */
export function useOrders() {
  const orders = useSyncExternalStore(subscribe, getOrders, getOrders);

  const counts = useMemo(
    () =>
      orders.reduce<Record<string, number>>((acc, order) => {
        acc[order.status] = (acc[order.status] || 0) + 1;
        return acc;
      }, {}),
    [orders],
  );

  return {
    orders,
    counts,
    updateOrderStatus,
    advanceOrder,
    revertOrder,
    cancelOrder,
    addOrder,
    removeOrder,
  };
}

/** Pedidos já separados nas colunas do painel da cozinha, do mais antigo para o mais novo. */
export function useKitchenOrders() {
  const { orders, advanceOrder: advance, revertOrder: revert, updateOrderStatus: setStatus } = useOrders();

  const columns = useMemo(() => {
    const pick = (status: OrderStatus) =>
      orders.filter(order => order.status === status).sort((a, b) => a.createdAt - b.createdAt);
    return {
      queue: pick(KITCHEN_COLUMNS.queue),
      preparing: pick(KITCHEN_COLUMNS.preparing),
      completed: pick(KITCHEN_COLUMNS.completed),
    };
  }, [orders]);

  const deliver = useCallback((id: string) => setStatus(id, 'Entregue'), [setStatus]);

  return { ...columns, advanceOrder: advance, revertOrder: revert, deliverOrder: deliver };
}
