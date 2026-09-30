import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Platform,
  Modal,
  TextInput,
  Alert,
  KeyboardAvoidingView,
} from 'react-native';
import {
  Flame,
  Clock,
  BellRing,
  Truck,
  MapPin,
  ChefHat,
  Plus,
  Minus,
  X,
} from 'lucide-react-native';
import { useAuth } from '../controller/AuthController';
import { useCatalog } from '../controller/CatalogController';
import { useOrders, formatMoney, formatElapsed, OrderView } from '../store/Orders';
import { useCalls } from '../store/Calls';

const COLORS = {
  background: '#F7F4F0', // Fundo bege claro
  white: '#FFFFFF',
  dark: '#2A2421',       // Marrom escuro da central de atenção
  primary: '#C84325',    // Vermelho/Laranja dos botões
  primaryHover: '#A6331A',
  grayLight: '#EBE8E2',
  grayCardBg: '#F3F1EC', // Fundo dos cards de pedidos
  border: '#E0DDD6',
  textMain: '#1A1A1A',
  textMuted: '#7A7571',

  // Cores de Status das Mesas
  statusLivre: '#E0E0E0',     // Cinza
  statusOcupada: '#2E7D32',   // Verde
  statusAguardando: '#F57F17', // Amarelo
  statusChamado: '#C62828',    // Vermelho
};

const STATUS_COLORS: Record<string, string> = {
  Livre: COLORS.statusLivre,
  Ocupada: COLORS.statusOcupada,
  Reservada: COLORS.statusAguardando,
  'Aguardando pagamento': COLORS.statusAguardando,
  'Chamar garçom': COLORS.statusChamado,
};

const ORDER_TYPES = ['Local', 'Delivery', 'Retirada'] as const;

/** Converte o preço do cardápio ("54,90") para número. */
const parsePrice = (price: string) => Number(String(price).replace(/\./g, '').replace(',', '.')) || 0;

const isActive = (order: OrderView) => order.status !== 'Entregue' && order.status !== 'Cancelado';

type Props = {
  navigation: { replace: (route: string) => void };
};

type Composer = {
  type: (typeof ORDER_TYPES)[number];
  customer: string;
  table: string;
  items: Record<string, number>;
};

const emptyComposer: Composer = { type: 'Local', customer: '', table: '', items: {} };

export default function AttendantDashboardScreen({ navigation }: Props) {
  const { user, logout } = useAuth();
  const { orders, addOrder, updateOrderStatus, cancelOrder } = useOrders();
  const { pending: calls, resolveCall } = useCalls();
  const { tables, activeProducts } = useCatalog();

  // Relógio da tela: mantém os tempos dos chamados e dos pedidos atualizados.
  const [now, setNow] = useState<number>(Date.now());
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 10 * 1000);
    return () => clearInterval(interval);
  }, []);

  const [composer, setComposer] = useState<Composer | null>(null);

  /* ==========================================
     DADOS DERIVADOS
  ========================================== */
  const activeOrders = useMemo(
    () => orders.filter(isActive).sort((a, b) => a.createdAt - b.createdAt),
    [orders],
  );

  const kpis = useMemo(() => {
    const startOfToday = new Date().setHours(0, 0, 0, 0);
    const ready = activeOrders.filter(order => order.status === 'Pronto');
    const deliveryToday = orders.filter(
      order => order.type === 'Delivery' && order.createdAt >= startOfToday,
    );
    const readyDelivery = deliveryToday.filter(order => order.status === 'Pronto').length;
    const oldestCall = calls[0];

    return {
      openOrders: activeOrders.length,
      readyLabel: `${ready.length} aguardando despacho`,
      calls: calls.length,
      callLabel: oldestCall
        ? `Mesa ${oldestCall.table} há ${formatElapsed(oldestCall.createdAt, now)}`
        : 'Nenhum chamado aberto',
      delivery: deliveryToday.length,
      deliveryLabel: readyDelivery
        ? `${readyDelivery} pronto(s) para sair`
        : 'Nenhum pronto para sair',
    };
  }, [activeOrders, orders, calls, now]);

  const tableCards = useMemo(
    () =>
      tables.map(table => {
        const call = calls.find(item => item.table === table.number);
        const open = activeOrders.filter(order => order.table === table.number);
        const total = open.reduce((sum, order) => sum + order.totalValue, 0);
        const status = call ? 'Chamar garçom' : open.length > 0 ? 'Ocupada' : table.status;

        return { ...table, status, call, open, total, color: STATUS_COLORS[status] || COLORS.statusLivre };
      }),
    [tables, calls, activeOrders],
  );

  /* ==========================================
     AÇÕES
  ========================================== */
  const handleLogout = useCallback(() => {
    // No Expo Web, os callbacks dos botões de Alert podem não ser executados.
    // O botão Sair deve sempre limpar a sessão e retornar ao login.
    logout();
    navigation.replace('loginView');
  }, [logout, navigation]);

  const dispatchOrder = useCallback(
    (order: OrderView) => {
      const label =
        order.type === 'Delivery'
          ? 'Chamar motoboy'
          : order.type === 'Retirada'
          ? 'Entregar no balcão'
          : 'Entregar na mesa';
      Alert.alert(label, `Confirmar a saída do pedido #${order.id}?`, [
        { text: 'Agora não', style: 'cancel' },
        { text: 'Confirmar', onPress: () => updateOrderStatus(order.id, 'Entregue') },
      ]);
    },
    [updateOrderStatus],
  );

  const confirmCancel = useCallback(
    (order: OrderView) => {
      Alert.alert('Cancelar pedido', `Cancelar o pedido #${order.id}?`, [
        { text: 'Não', style: 'cancel' },
        { text: 'Cancelar pedido', style: 'destructive', onPress: () => cancelOrder(order.id) },
      ]);
    },
    [cancelOrder],
  );

  const handleTablePress = useCallback(
    (table: any) => {
      if (table.call) {
        Alert.alert(`Mesa ${table.number}`, table.call.reason, [
          { text: 'Depois', style: 'cancel' },
          { text: 'Atender', onPress: () => resolveCall(table.call.id) },
        ]);
        return;
      }

      if (table.open.length > 0) {
        const resumo = table.open.map((order: OrderView) => `#${order.id} — ${order.items}`).join('\n');
        Alert.alert(
          `Mesa ${table.number}`,
          `${resumo}\n\nTotal parcial: R$ ${formatMoney(table.total)}`,
          [
            { text: 'Fechar', style: 'cancel' },
            {
              text: 'Novo pedido',
              onPress: () => setComposer({ ...emptyComposer, table: table.number, customer: `Mesa ${table.number}` }),
            },
          ],
        );
        return;
      }

      setComposer({ ...emptyComposer, table: table.number, customer: `Mesa ${table.number}` });
    },
    [resolveCall],
  );

  /* ==========================================
     NOVO PEDIDO
  ========================================== */
  const composerItems = useMemo(() => {
    if (!composer) return [];
    return activeProducts
      .filter((product: any) => composer.items[product.id] > 0)
      .map((product: any) => ({
        name: product.name,
        qty: composer.items[product.id],
        price: parsePrice(product.price),
      }));
  }, [composer, activeProducts]);

  const composerTotal = composerItems.reduce((sum, item) => sum + item.qty * item.price, 0);

  const changeQty = (productId: string, delta: number) =>
    setComposer(current => {
      if (!current) return current;
      const qty = Math.max(0, (current.items[productId] || 0) + delta);
      const items = { ...current.items };
      if (qty === 0) delete items[productId];
      else items[productId] = qty;
      return { ...current, items };
    });

  const saveOrder = () => {
    if (!composer) return;
    if (composerItems.length === 0) {
      return Alert.alert('Pedido vazio', 'Adicione pelo menos um item ao pedido.');
    }
    const customer = composer.customer.trim() || (composer.table ? `Mesa ${composer.table}` : 'Balcão');

    addOrder({
      type: composer.type,
      customer,
      table: composer.type === 'Local' ? composer.table.trim() || null : null,
      attendant: user?.name || null,
      payment: 'A definir',
      itemList: composerItems,
    });

    setComposer(null);
    Alert.alert('Pedido enviado', 'O pedido já aparece na fila da cozinha.');
  };

  /* ==========================================
     RENDER
  ========================================== */
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

        {/* ==========================================
            CABEÇALHO
        ========================================== */}
        <View style={styles.header}>
          <View>
            <View style={styles.logoRow}>
              <View style={styles.logoIcon}><Flame color="#FFF" size={12} /></View>
              <Text style={styles.logoText}>Fogo &amp; Fumaça</Text>
              <View style={styles.badge}><Text style={styles.badgeText}>Modo operação</Text></View>
            </View>
            <Text style={styles.greetingTitle}>Bom turno{user?.name ? `, ${user.name}` : ''}.</Text>
            <Text style={styles.greetingSubtitle}>Visão geral do salão e dos pedidos.</Text>
          </View>

          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Text style={styles.logoutText}>Sair</Text>
          </TouchableOpacity>
        </View>

        {/* ==========================================
            INDICADORES (Esquerda) + CENTRAL (Direita)
        ========================================== */}
        <View style={styles.topSectionRow}>

          {/* COLUNA ESQUERDA: Cards Empilhados */}
          <View style={styles.kpiColumn}>
            <View style={styles.kpiCard}>
              <View style={styles.kpiHeader}>
                <Text style={styles.kpiTitle}>Pedidos em aberto</Text>
                <Clock color={COLORS.primary} size={18} />
              </View>
              <Text style={styles.kpiValue}>{String(kpis.openOrders).padStart(2, '0')}</Text>
              <Text style={styles.kpiSub}>{kpis.readyLabel}</Text>
            </View>

            <View style={styles.kpiCard}>
              <View style={styles.kpiHeader}>
                <Text style={styles.kpiTitle}>Chamados ativos</Text>
                <BellRing color={COLORS.primary} size={18} />
              </View>
              <Text style={styles.kpiValue}>{String(kpis.calls).padStart(2, '0')}</Text>
              <Text style={styles.kpiSub}>{kpis.callLabel}</Text>
            </View>

            <View style={styles.kpiCard}>
              <View style={styles.kpiHeader}>
                <Text style={styles.kpiTitle}>Delivery hoje</Text>
                <Truck color={COLORS.primary} size={18} />
              </View>
              <Text style={styles.kpiValue}>{String(kpis.delivery).padStart(2, '0')}</Text>
              <Text style={styles.kpiSub}>{kpis.deliveryLabel}</Text>
            </View>
          </View>

          {/* COLUNA DIREITA: Central de Atenção */}
          <View style={styles.attentionPanel}>
            <View style={styles.attentionHeader}>
              <View>
                <Text style={styles.attentionOverline}>Central de atenção</Text>
                <Text style={styles.attentionTitle}>Chamados agora</Text>
              </View>
              <BellRing color={COLORS.primary} size={20} />
            </View>

            <View style={styles.attentionList}>
              {calls.length === 0 ? (
                <View style={styles.attentionEmpty}>
                  <Text style={styles.attentionEmptyText}>Nenhum chamado aberto. Salão tranquilo.</Text>
                </View>
              ) : (
                calls.map(call => (
                  <TouchableOpacity
                    key={call.id}
                    style={styles.attentionCard}
                    activeOpacity={0.8}
                    onPress={() =>
                      Alert.alert(call.title, call.reason, [
                        { text: 'Depois', style: 'cancel' },
                        { text: 'Atender', onPress: () => resolveCall(call.id) },
                      ])
                    }>
                    <View style={styles.attentionCardHeader}>
                      <Text style={styles.attentionCardTitle}>{call.title}</Text>
                      <Text style={styles.attentionCardTime}>há {formatElapsed(call.createdAt, now)}</Text>
                    </View>
                    <Text style={styles.attentionCardAction}>{call.reason}</Text>
                  </TouchableOpacity>
                ))
              )}
            </View>

            <TouchableOpacity
              style={styles.attentionButton}
              onPress={() =>
                Alert.alert(
                  'Rota de delivery',
                  kpis.delivery === 0
                    ? 'Nenhum delivery registrado hoje.'
                    : `${kpis.delivery} entrega(s) hoje. ${kpis.deliveryLabel}.`,
                )
              }>
              <MapPin color={COLORS.textMain} size={16} />
              <Text style={styles.attentionButtonText}>Abrir rota de delivery</Text>
            </TouchableOpacity>
          </View>

        </View>

        {/* ==========================================
            MAPA DE MESAS
        ========================================== */}
        <View style={styles.fullWidthSection}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>Mapa de mesas</Text>
              <Text style={styles.sectionSubtitle}>Toque para abrir a comanda.</Text>
            </View>
            <Text style={styles.sectionCount}>{tableCards.length} mesas</Text>
          </View>

          <View style={styles.tablesGrid}>
            {tableCards.map(table => (
              <TouchableOpacity
                key={table.id}
                style={styles.tableCard}
                activeOpacity={0.7}
                onPress={() => handleTablePress(table)}>
                <View style={[styles.tableDot, { backgroundColor: table.color }]} />
                <Text style={styles.tableNumber}>Mesa {table.number}</Text>
                <Text style={styles.tableStatus}>{table.status}</Text>
                {table.total > 0 && (
                  <Text style={styles.tableTotal}>R$ {formatMoney(table.total)}</Text>
                )}
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.legendRow}>
            <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: COLORS.statusLivre }]} /><Text style={styles.legendText}>Livre</Text></View>
            <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: COLORS.statusOcupada }]} /><Text style={styles.legendText}>Ocupada</Text></View>
            <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: COLORS.statusAguardando }]} /><Text style={styles.legendText}>Aguardando</Text></View>
            <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: COLORS.statusChamado }]} /><Text style={styles.legendText}>Chamado</Text></View>
          </View>
        </View>

        {/* ==========================================
            CENTRAL DE PEDIDOS
        ========================================== */}
        <View style={styles.fullWidthSection}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>Central de pedidos</Text>
              <Text style={styles.sectionSubtitle}>
                Acompanhe a cozinha e libere a saída quando estiver pronto.
              </Text>
            </View>
            <ChefHat color={COLORS.primary} size={20} />
          </View>

          <TouchableOpacity style={styles.newOrderButton} onPress={() => setComposer(emptyComposer)}>
            <Plus color={COLORS.white} size={18} />
            <Text style={styles.newOrderButtonText}>Novo pedido</Text>
          </TouchableOpacity>

          {activeOrders.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>Nenhum pedido em aberto agora.</Text>
            </View>
          ) : (
            <View style={styles.ordersGrid}>
              {activeOrders.map(order => (
                <View key={order.id} style={styles.orderCard}>
                  <View style={styles.orderHeader}>
                    <Text style={styles.orderId}>#{order.id}</Text>
                    <View style={[styles.orderTypeBadge, order.type === 'Delivery' && styles.orderTypeDelivery]}>
                      <Text style={[styles.orderTypeText, order.type === 'Delivery' && styles.orderTypeTextDelivery]}>
                        {order.type}
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.orderTable}>{order.customer}</Text>
                  <Text style={styles.orderItems}>{order.items}</Text>
                  <Text style={styles.orderMeta}>
                    R$ {order.total} · {formatElapsed(order.createdAt, now)}
                  </Text>

                  <View style={styles.orderFooter}>
                    <View style={[styles.orderStatusBadge, order.status === 'Pronto' && styles.orderStatusReady]}>
                      <Text style={[styles.orderStatusText, order.status === 'Pronto' && styles.orderStatusReadyText]}>{order.status === 'Pronto' ? 'Pronto pela cozinha' : order.status === 'Em preparo' ? 'Em preparo na cozinha' : order.status}</Text>
                    </View>

                    {order.status === 'Pronto' ? (
                      <TouchableOpacity
                        style={[styles.actionButton, { backgroundColor: COLORS.statusOcupada }]}
                        onPress={() => dispatchOrder(order)}>
                        <Text style={styles.actionButtonText}>
                          {order.type === 'Delivery'
                            ? 'Chamar motoboy'
                            : order.type === 'Retirada'
                            ? 'Entregar no balcão'
                            : 'Entregar na mesa'}
                        </Text>
                      </TouchableOpacity>
                    ) : (
                      <TouchableOpacity style={styles.linkButton} onPress={() => confirmCancel(order)}>
                        <Text style={styles.linkButtonText}>Cancelar</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>

      </ScrollView>

      {/* ==========================================
          MODAL: NOVO PEDIDO
      ========================================== */}
      <Modal visible={!!composer} transparent animationType="slide" onRequestClose={() => setComposer(null)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Novo pedido</Text>
              <TouchableOpacity onPress={() => setComposer(null)}>
                <X color={COLORS.textMuted} size={22} />
              </TouchableOpacity>
            </View>

            <View style={styles.typeRow}>
              {ORDER_TYPES.map(type => (
                <TouchableOpacity
                  key={type}
                  style={[styles.typeOption, composer?.type === type && styles.typeOptionActive]}
                  onPress={() => setComposer(current => (current ? { ...current, type } : current))}>
                  <Text style={[styles.typeOptionText, composer?.type === type && styles.typeOptionTextActive]}>
                    {type}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {composer?.type === 'Local' && (
              <>
                <Text style={styles.modalLabel}>Mesa</Text>
                <TextInput
                  style={styles.modalInput}
                  value={composer?.table}
                  onChangeText={value =>
                    setComposer(current =>
                      current ? { ...current, table: value, customer: `Mesa ${value}` } : current,
                    )
                  }
                  placeholder="Ex.: 05"
                  keyboardType="numeric"
                  placeholderTextColor={COLORS.textMuted}
                />
              </>
            )}

            <Text style={styles.modalLabel}>{composer?.type === 'Local' ? 'Identificação' : 'Cliente'}</Text>
            <TextInput
              style={styles.modalInput}
              value={composer?.customer}
              onChangeText={value =>
                setComposer(current => (current ? { ...current, customer: value } : current))
              }
              placeholder="Nome do cliente ou da mesa"
              placeholderTextColor={COLORS.textMuted}
            />

            <Text style={styles.modalLabel}>Itens do cardápio</Text>
            <ScrollView style={styles.productList} showsVerticalScrollIndicator={false}>
              {activeProducts.map((product: any) => {
                const qty = composer?.items[product.id] || 0;
                return (
                  <View key={product.id} style={styles.productRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.productName}>{product.name}</Text>
                      <Text style={styles.productPrice}>R$ {product.price}</Text>
                    </View>
                    <View style={styles.qtyRow}>
                      <TouchableOpacity
                        style={[styles.qtyButton, qty === 0 && styles.qtyButtonDisabled]}
                        disabled={qty === 0}
                        onPress={() => changeQty(product.id, -1)}>
                        <Minus color={qty === 0 ? COLORS.border : COLORS.textMain} size={16} />
                      </TouchableOpacity>
                      <Text style={styles.qtyValue}>{qty}</Text>
                      <TouchableOpacity style={styles.qtyButton} onPress={() => changeQty(product.id, 1)}>
                        <Plus color={COLORS.textMain} size={16} />
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}
            </ScrollView>

            <View style={styles.modalFooter}>
              <Text style={styles.modalTotal}>Total: R$ {formatMoney(composerTotal)}</Text>
              <TouchableOpacity style={styles.modalSave} onPress={saveOrder}>
                <Text style={styles.modalSaveText}>Enviar à cozinha</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

// A webview de celular também é `web`; considerar somente tablets como largos
// evita que o atendimento force colunas lado a lado em telas estreitas.
const isWide = Platform.OS !== 'web' && Platform.isPad;

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.background },
  scrollContent: { padding: 24, paddingBottom: 60 },

  // --- Header ---
  header: { marginBottom: 30, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  logoIcon: { backgroundColor: COLORS.primary, padding: 4, borderRadius: 4 },
  logoText: { fontSize: 14, fontWeight: '700', color: COLORS.textMain },
  badge: { borderWidth: 1, borderColor: COLORS.border, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  badgeText: { fontSize: 10, fontWeight: '600', color: COLORS.textMuted },
  greetingTitle: { fontSize: 26, fontWeight: 'bold', color: COLORS.textMain, letterSpacing: -0.5 },
  greetingSubtitle: { fontSize: 14, color: COLORS.textMuted, marginTop: 4 },
  logoutButton: { backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.border, paddingVertical: 8, paddingHorizontal: 16, borderRadius: 8 },
  logoutText: { fontSize: 13, fontWeight: '600', color: COLORS.textMain },

  // --- Indicadores e Central (Lado a Lado) ---
  topSectionRow: {
    flexDirection: isWide ? 'row' : 'column',
    gap: 20,
    marginBottom: 24,
  },

  // Coluna Esquerda: KPIs
  kpiColumn: { flex: 1, gap: 16 },
  kpiCard: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 16,
    padding: 20,
  },
  kpiHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  kpiTitle: { fontSize: 13, fontWeight: '600', color: COLORS.textMuted },
  kpiValue: { fontSize: 32, fontWeight: 'bold', color: COLORS.textMain, marginBottom: 4 },
  kpiSub: { fontSize: 12, color: COLORS.textMuted },

  // Coluna Direita: Central Escura
  attentionPanel: {
    flex: 1.2,
    backgroundColor: COLORS.dark,
    borderRadius: 16,
    padding: 20,
    justifyContent: 'space-between',
  },
  attentionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  attentionOverline: { fontSize: 11, color: '#96908B', marginBottom: 2 },
  attentionTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.white },
  attentionList: { gap: 12, marginBottom: 20, flex: 1 },
  attentionCard: { backgroundColor: '#3A322D', padding: 16, borderRadius: 12 },
  attentionCardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  attentionCardTitle: { fontSize: 14, fontWeight: 'bold', color: COLORS.white },
  attentionCardTime: { fontSize: 12, color: COLORS.primary },
  attentionCardAction: { fontSize: 13, color: '#B3ACA5' },
  attentionEmpty: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#4A423D',
    borderRadius: 12,
    padding: 16,
  },
  attentionEmptyText: { fontSize: 13, color: '#B3ACA5' },
  attentionButton: { backgroundColor: COLORS.grayLight, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, paddingVertical: 14, borderRadius: 8 },
  attentionButtonText: { fontSize: 14, fontWeight: 'bold', color: COLORS.textMain },

  // --- Seções Full Width (Mesas e Pedidos) ---
  fullWidthSection: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 16,
    padding: 24,
    marginBottom: 24,
  },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.textMain, marginBottom: 4 },
  sectionSubtitle: { fontSize: 13, color: COLORS.textMuted, maxWidth: 420 },
  sectionCount: { fontSize: 12, fontWeight: '600', color: COLORS.textMuted },

  // --- Grid de Mesas ---
  tablesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, marginBottom: 24 },
  tableCard: {
    width: isWide ? '23%' : '47%',
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 16,
  },
  tableDot: { width: 10, height: 10, borderRadius: 5, marginBottom: 12 },
  tableNumber: { fontSize: 16, fontWeight: 'bold', color: COLORS.textMain, marginBottom: 4 },
  tableStatus: { fontSize: 13, color: COLORS.textMuted },
  tableTotal: { fontSize: 13, fontWeight: '700', color: COLORS.textMain, marginTop: 6 },

  legendRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: 16 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 12, color: COLORS.textMuted, fontWeight: '500' },

  // --- Pedidos ---
  newOrderButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 20,
  },
  newOrderButtonText: { color: COLORS.white, fontSize: 14, fontWeight: 'bold' },
  emptyState: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingVertical: 28,
    alignItems: 'center',
  },
  emptyStateText: { fontSize: 13, color: COLORS.textMuted },
  ordersGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  orderCard: {
    width: isWide ? '48%' : '100%',
    backgroundColor: COLORS.grayCardBg,
    borderRadius: 12,
    padding: 20,
  },
  orderHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  orderId: { fontSize: 14, fontWeight: 'bold', color: COLORS.textMain },
  orderTypeBadge: { backgroundColor: COLORS.grayLight, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
  orderTypeText: { fontSize: 11, fontWeight: 'bold', color: COLORS.textMain },
  orderTypeDelivery: { backgroundColor: '#F57F17' },
  orderTypeTextDelivery: { color: COLORS.white },

  orderTable: { fontSize: 16, fontWeight: 'bold', color: COLORS.textMain, marginBottom: 4 },
  orderItems: { fontSize: 13, color: COLORS.textMuted, marginBottom: 8 },
  orderMeta: { fontSize: 12, fontWeight: '600', color: COLORS.textMuted, marginBottom: 20 },

  orderFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  orderStatusBadge: { backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.border, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6 },
  orderStatusText: { fontSize: 12, fontWeight: '600', color: COLORS.textMuted },
  orderStatusReady: { backgroundColor: '#E8F5E9', borderColor: '#A5D6A7' },
  orderStatusReadyText: { color: COLORS.statusOcupada, fontWeight: '800' },
  actionButton: { backgroundColor: COLORS.primary, paddingVertical: 10, paddingHorizontal: 16, borderRadius: 6 },
  actionButtonText: { color: COLORS.white, fontSize: 13, fontWeight: 'bold' },
  linkButton: { paddingVertical: 10, paddingHorizontal: 8 },
  linkButtonText: { fontSize: 13, fontWeight: '600', color: COLORS.textMuted },

  // --- Modal de novo pedido ---
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', padding: 20 },
  modalCard: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: 22,
    width: '100%',
    maxWidth: 520,
    maxHeight: '90%',
    alignSelf: 'center',
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 },
  modalTitle: { fontSize: 20, fontWeight: '800', color: COLORS.textMain },
  typeRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  typeOption: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  typeOptionActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  typeOptionText: { fontSize: 13, fontWeight: '600', color: COLORS.textMuted },
  typeOptionTextActive: { color: COLORS.white },
  modalLabel: { fontSize: 12, fontWeight: '700', color: COLORS.textMain, marginBottom: 6, marginTop: 12 },
  modalInput: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, padding: 12, color: COLORS.textMain, fontSize: 15 },
  productList: { maxHeight: 220, marginTop: 4 },
  productRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.grayLight,
    gap: 12,
  },
  productName: { fontSize: 14, fontWeight: '600', color: COLORS.textMain },
  productPrice: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  qtyRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  qtyButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  qtyButtonDisabled: { opacity: 0.5 },
  qtyValue: { fontSize: 15, fontWeight: '700', color: COLORS.textMain, minWidth: 18, textAlign: 'center' },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 20,
    gap: 12,
  },
  modalTotal: { fontSize: 16, fontWeight: '800', color: COLORS.textMain },
  modalSave: { backgroundColor: COLORS.primary, paddingVertical: 12, paddingHorizontal: 22, borderRadius: 8 },
  modalSaveText: { color: COLORS.white, fontWeight: '800' },
});
