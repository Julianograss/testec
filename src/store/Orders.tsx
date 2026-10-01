/**
 * src/store/Orders.tsx
 *
 * Fonte única de verdade dos pedidos — agora lendo e gravando no Supabase.
 * Cozinha, atendimento, admin e cliente consomem o MESMO estado, e o
 * Realtime do Supabase atualiza todos os aparelhos quando algo muda.
 *
 * A interface pública é a mesma de antes (useOrders, useKitchenOrders,
 * addOrder, advanceOrder…), então as telas quase não mudam.
 */
import { useCallback, useMemo, useSyncExternalStore } from 'react';
import { Alert } from '../utils/alert';
import { supabase, newUuid } from '../services/supabase';
import { onTablesChange } from '../services/realtime';

/* ==========================================
   TIPOS
========================================== */
export type OrderStatus = 'Recebido' | 'Em preparo' | 'Pronto' | 'Entregue' | 'Cancelado';
export type OrderType = 'Local' | 'Delivery' | 'Retirada';
export type OrderItem = { name: string; qty: number; price: number };

export type Order = {
  /** Número exibido nas telas (orders.number). */
  id: string;
  /** uuid real da linha em orders. */
  uuid: string;
  type: OrderType;
  customer: string;
  /** Número da mesa (tables.number) como texto. */
  table: string | null;
  attendant: string | null;
  payment: string;
  status: OrderStatus;
  itemList: OrderItem[];
  createdAt: number;
  startedAt: number | null;
  readyAt: number | null;
  closedAt: number | null;
  paymentStatus?: 'Pago' | 'Pendente' | 'Estornado';
  paidAt?: number | null;
  notes?: string;
  /** profiles.id do cliente dono do pedido. */
  ownerId?: string;
};

export type OrderView = Order & {
  items: string;
  total: string;
  totalValue: number;
  time: string;
};

export const ORDER_FLOW: OrderStatus[] = ['Recebido', 'Em preparo', 'Pronto', 'Entregue'];

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

export const elapsedMinutes = (from: number, now: number = Date.now()) =>
  Math.max(0, Math.floor((now - from) / 60000));

export const formatElapsed = (from: number, now: number = Date.now()) => {
  const total = elapsedMinutes(from, now);
  if (total < 1) return 'agora';
  if (total < 60) return `${String(total).padStart(2, '0')} min`;
  return `${Math.floor(total / 60)}h ${String(total % 60).padStart(2, '0')}min`;
};

/** Pedido que ainda pesa na conta da mesa (não cancelado e não pago). */
export const isUnpaid = (order: Order) =>
  order.status !== 'Cancelado' && order.paymentStatus !== 'Pago';

/* ==========================================
   MAPEAMENTO BANCO <-> TELA
========================================== */
const ts = (value: string | null | undefined) => (value ? Date.parse(value) : null);

const normalize = (raw: any): Order => ({
  table: null,
  attendant: null,
  payment: 'Não informado',
  status: 'Recebido',
  itemList: [],
  startedAt: null,
  readyAt: null,
  closedAt: null,
  paymentStatus: 'Pendente',
  paidAt: null,
  notes: '',
  ...raw,
});

const fromRow = (row: any): Order =>
  normalize({
    id: String(row.number ?? row.id.slice(0, 4)),
    uuid: row.id,
    type: row.type,
    customer: row.customer_name || 'Balcão',
    table: row.tables?.number != null ? String(row.tables.number) : null,
    attendant: row.attendant_name || null,
    payment: row.payment_method || 'Não informado',
    status: row.status,
    itemList: (row.order_items || []).map((item: any) => ({
      name: item.name || 'Item',
      qty: item.quantity,
      price: Number(item.unit_price),
    })),
    createdAt: Date.parse(row.created_at),
    startedAt: ts(row.started_at),
    readyAt: ts(row.ready_at),
    closedAt: ts(row.closed_at),
    paymentStatus: row.payment_status || 'Pendente',
    paidAt: ts(row.paid_at),
    notes: row.notes || '',
    ownerId: row.customer_id || undefined,
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

/* ==========================================
   ESTADO (store externo)
========================================== */
let state: Order[] = [];
let snapshot: OrderView[] = [];
const listeners = new Set<() => void>();

const commit = (next: Order[]) => {
  state = next;
  snapshot = state.map(decorate);
  listeners.forEach(listener => listener());
};

const iso = (value: number | null) => (value ? new Date(value).toISOString() : null);

export const reloadOrders = async () => {
  const { data, error } = await supabase
    .from('orders')
    .select('*, order_items(*), tables(number)')
    .order('created_at', { ascending: false })
    .limit(1000);
  if (error) {
    console.warn('[Orders] falha ao carregar pedidos:', error.message);
    return;
  }
  commit((data || []).map(fromRow).reverse());
};

let stopRealtime: (() => void) | null = null;
let stopAuth: (() => void) | null = null;

/** Liga o carregamento + tempo real quando a primeira tela assina; desliga quando a última sai. */
export const subscribe = (listener: () => void) => {
  listeners.add(listener);
  if (listeners.size === 1) {
    void reloadOrders();
    stopRealtime = onTablesChange(['orders', 'order_items'], () => void reloadOrders());
    const { data } = supabase.auth.onAuthStateChange(() => {
      setTimeout(() => void reloadOrders(), 0);
    });
    stopAuth = () => data.subscription.unsubscribe();
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      stopRealtime?.();
      stopAuth?.();
      stopRealtime = stopAuth = null;
    }
  };
};

export const getOrders = (): OrderView[] => snapshot;

/* ==========================================
   AÇÕES
========================================== */
const reportError = (action: string, message?: string) =>
  Alert.alert('Não foi possível salvar', message || `Falha ao ${action}. Tente novamente.`);

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
  const current = state.find(order => order.id === id);
  if (!current) return;
  const next = stamp(current, status);
  commit(state.map(order => (order.id === id ? next : order))); // otimista

  void supabase
    .from('orders')
    .update({
      status: next.status,
      started_at: iso(next.startedAt),
      ready_at: iso(next.readyAt),
      closed_at: iso(next.closedAt),
    })
    .eq('id', current.uuid)
    .then(({ error }) => {
      if (error) {
        reportError('atualizar o pedido', error.message);
        void reloadOrders();
      }
    });
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

async function persistNewOrder(order: Order) {
  let tableId: string | null = null;
  if (order.table) {
    const { data } = await supabase
      .from('tables')
      .select('id')
      .eq('number', Number(order.table))
      .maybeSingle();
    tableId = data?.id ?? null;
  }

  const { error } = await supabase.from('orders').insert({
    id: order.uuid,
    customer_id: order.ownerId ?? null,
    table_id: tableId,
    type: order.type,
    status: order.status,
    total: orderTotal(order),
    payment_method: order.payment,
    payment_status: order.paymentStatus ?? 'Pendente',
    customer_name: order.customer,
    attendant_name: order.attendant,
    notes: order.notes || null,
  });
  if (error) throw error;

  const names = order.itemList.map(item => item.name);
  const { data: products } = await supabase.from('products').select('id, name').in('name', names);
  const idByName = new Map((products || []).map((product: any) => [product.name, product.id]));

  const { error: itemsError } = await supabase.from('order_items').insert(
    order.itemList.map(item => ({
      order_id: order.uuid,
      product_id: idByName.get(item.name) ?? null,
      name: item.name,
      quantity: item.qty,
      unit_price: item.price,
    })),
  );
  if (itemsError) throw itemsError;
  // A mesa vira "Ocupada" por trigger no banco (funciona até para pedido de cliente sem login).
}

export const addOrder = (input: Partial<Order> & { itemList: OrderItem[] }) => {
  const uuid = input.uuid ?? newUuid();
  const order = normalize({
    id: `tmp-${uuid.slice(0, 4)}`,
    type: 'Local',
    customer: 'Balcão',
    createdAt: Date.now(),
    ...input,
    uuid,
  });
  commit([...state, order]); // aparece na hora; o Realtime troca pelo registro oficial

  void persistNewOrder(order)
    .then(() => reloadOrders())
    .catch((error: any) => {
      reportError('enviar o pedido', error?.message);
      void reloadOrders();
    });
  return order;
};

/** Pedidos do cliente logado (só pelo id do perfil — o RLS já filtra no banco). */
export const getOrdersForUser = (user: { id: string } | null): OrderView[] => {
  if (!user) return [];
  return snapshot.filter(order => order.ownerId === user.id);
};

export const removeOrder = (id: string) => updateOrderStatus(id, 'Cancelado');

/**
 * Recebimento da conta de uma mesa: marca como pagos todos os pedidos
 * em aberto dela. É isso que faz o faturamento/relatórios enxergarem a venda.
 */
export const payTable = async (tableNumber: string, method: string): Promise<boolean> => {
  const { data: table } = await supabase
    .from('tables')
    .select('id')
    .eq('number', Number(tableNumber))
    .maybeSingle();
  if (!table) return false;
  const now = Date.now();
  commit(
    state.map(order =>
      order.table === tableNumber && isUnpaid(order)
        ? { ...order, paymentStatus: 'Pago', paidAt: now, payment: method }
        : order,
    ),
  );
  const { error } = await supabase
    .from('orders')
    .update({ payment_status: 'Pago', paid_at: new Date(now).toISOString(), payment_method: method })
    .eq('table_id', table.id)
    .neq('payment_status', 'Pago')
    .neq('status', 'Cancelado');
  if (error) {
    reportError('registrar o pagamento', error.message);
    void reloadOrders();
    return false;
  }
  return true;
};

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
    payTable,
  };
}

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
