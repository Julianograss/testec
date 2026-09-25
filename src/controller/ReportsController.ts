import { useMemo } from 'react';
import { useOrders, formatMoney, type OrderView } from '../store/Orders';
import { useCatalog } from './CatalogController';

const DAY = 24 * 60 * 60 * 1000;
export type ReportPeriod = 'Hoje' | 'Esta semana' | 'Este mês' | 'Personalizado';
export interface PeriodRange { start: number; end: number; days: number; }
const startOfDay = (timestamp: number) => { const date = new Date(timestamp); date.setHours(0, 0, 0, 0); return date.getTime(); };
export const periodRange = (period: ReportPeriod, now = Date.now()): PeriodRange => {
  const today = startOfDay(now);
  switch (period) {
    case 'Hoje': return { start: today, end: now, days: 1 };
    case 'Este mês': { const date = new Date(now); return { start: startOfDay(new Date(date.getFullYear(), date.getMonth(), 1).getTime()), end: now, days: date.getDate() }; }
    case 'Personalizado': return { start: today - 89 * DAY, end: now, days: 90 };
    default: return { start: today - 6 * DAY, end: now, days: 7 };
  }
};
const inRange = (order: OrderView, start: number, end: number) => order.createdAt >= start && order.createdAt <= end;
const percent = (part: number, total: number) => total > 0 ? `${Math.round((part / total) * 100)}%` : '0%';
const aggregateProducts = (orders: OrderView[]) => {
  const map = new Map<string, { nome: string; qtd: number; receita: number }>();
  orders.forEach(order => order.itemList.forEach(item => { const current = map.get(item.name) || { nome: item.name, qtd: 0, receita: 0 }; current.qtd += item.qty; current.receita += item.qty * item.price; map.set(item.name, current); }));
  return [...map.values()].sort((a, b) => b.receita - a.receita);
};

export function useDashboard() {
  const { orders } = useOrders();
  return useMemo(() => {
    const today = startOfDay(Date.now()); const yesterday = today - DAY;
    const concluded = orders.filter(order => order.status === 'Entregue');
    const todayOrders = concluded.filter(order => order.createdAt >= today);
    const yesterdayOrders = concluded.filter(order => order.createdAt >= yesterday && order.createdAt < today);
    const sum = (list: OrderView[]) => list.reduce((total, order) => total + order.totalValue, 0);
    const todayRevenue = sum(todayOrders); const yesterdayRevenue = sum(yesterdayOrders);
    const growth = yesterdayRevenue > 0 ? `${todayRevenue >= yesterdayRevenue ? '+' : ''}${Math.round(((todayRevenue - yesterdayRevenue) / yesterdayRevenue) * 100)}%` : '—';
    return {
      faturamento: `R$ ${formatMoney(todayRevenue)}`, crescimentoFaturamento: growth, pedidos: String(todayOrders.length), ticketMedio: `R$ ${formatMoney(todayOrders.length ? todayRevenue / todayOrders.length : 0)}`,
      produtosDestaque: aggregateProducts(todayOrders).slice(0, 3).map((item, index) => ({ id: `${index}-${item.nome}`, nome: item.nome, vendas: item.qtd, valor: `R$ ${formatMoney(item.receita)}` })),
      pedidosRecentes: [...orders].sort((a, b) => b.createdAt - a.createdAt).slice(0, 3).map(order => ({ id: `#${order.id}`, mesa: order.table ? `Mesa ${order.table}` : order.type, valor: `R$ ${order.total}`, status: order.status, time: order.time })),
    };
  }, [orders]);
}

export function useReports(period: ReportPeriod) {
  const { orders } = useOrders(); const { products } = useCatalog();
  return useMemo(() => {
    const { start, end } = periodRange(period); const windowOrders = orders.filter(order => inRange(order, start, end));
    const concluded = windowOrders.filter(order => order.status === 'Entregue'); const canceled = windowOrders.filter(order => order.status === 'Cancelado');
    const revenue = concluded.reduce((total, order) => total + order.totalValue, 0); const ranking = aggregateProducts(concluded); const best = ranking.slice(0, 2);
    const unsold = products.filter(product => product.active && !ranking.some(item => item.nome === product.name)).map(product => ({ nome: product.name, qtd: 0, receita: 0 }));
    const worst = unsold[0] || ranking[ranking.length - 1]; const topRevenue = ranking[0]?.receita || 1;
    const toProductRow = (item: { nome: string; qtd: number; receita: number }, type: string, index: number) => ({ id: `${type}-${index}-${item.nome}`, nome: item.nome, qtd: item.qtd, receita: `R$ ${formatMoney(item.receita)}`, fill: percent(item.receita, topRevenue), type });
    const produtos = best.map((item, index) => toProductRow(item, 'top', index)); if (worst && !best.some(item => item.nome === worst.nome)) produtos.push(toProductRow(worst, 'bottom', 0));
    const countByType = (type: string) => concluded.filter(order => order.type === type).length; const mesa = countByType('Local'); const delivery = countByType('Delivery'); const retirada = countByType('Retirada'); const totalTypes = mesa + delivery + retirada;
    const staffMap = new Map<string, { nome: string; pedidos: number; vendas: number }>();
    concluded.forEach(order => { const name = order.attendant || 'Não informado'; const current = staffMap.get(name) || { nome: name, pedidos: 0, vendas: 0 }; current.pedidos += 1; current.vendas += order.totalValue; staffMap.set(name, current); });
    const staffRanking = [...staffMap.values()].sort((a, b) => b.vendas - a.vendas); const topStaffSales = staffRanking[0]?.vendas || 1;
    return { financeiro: { faturamento: `R$ ${formatMoney(revenue)}`, totalVendas: concluded.length, ticketMedio: `R$ ${formatMoney(concluded.length ? revenue / concluded.length : 0)}` }, produtos, pedidos: { concluidos: concluded.length, cancelados: canceled.length, tipos: { mesa: { qtd: mesa, pct: percent(mesa, totalTypes) }, delivery: { qtd: delivery, pct: percent(delivery, totalTypes) }, retirada: { qtd: retirada, pct: percent(retirada, totalTypes) } } }, equipe: staffRanking.map((item, index) => ({ id: `${index}-${item.nome}`, nome: item.nome, pedidos: item.pedidos, vendas: `R$ ${formatMoney(item.vendas)}`, fill: percent(item.vendas, topStaffSales) })) };
  }, [orders, products, period]);
}
