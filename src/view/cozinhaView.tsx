import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Alert,
} from 'react-native';
import { ChefHat, Clock, Flame } from 'lucide-react-native';
import { useAuth } from '../controller/AuthController';
import { useKitchenOrders, formatElapsed, elapsedMinutes, OrderView } from '../store/Orders';

const COLORS = {
  background: '#F7F4F0', // Fundo bege claro
  white: '#FFFFFF',
  primary: '#C84325',    // Laranja/Vermelho principal
  primaryLight: '#FBE9E7', // Fundo do banner de alerta
  grayCard: '#EBE8E2',   // Fundo dos cartões de pedido
  border: '#E0DDD6',
  textMain: '#1A1A1A',
  textMuted: '#7A7571',

  // Tags e Botões Específicos
  deliveryBg: '#F57F17',
  deliveryText: '#FFFFFF',
  localBg: '#E0DDD6',
  localText: '#1A1A1A',
  btnReadyBg: '#D7E5D5', // Fundo verde claro do botão "Pronto para retirada"
  btnReadyText: '#2E7D32', // Texto verde escuro
};

const LATE_AFTER_MINUTES = 20; // a partir daqui o pedido é destacado como atrasado

type Props = {
  navigation: { replace: (route: string) => void };
};

export default function KitchenDisplayScreen({ navigation }: Props) {
  const { user, logout } = useAuth();
  const { queue, preparing, completed, advanceOrder, revertOrder, deliverOrder } = useKitchenOrders();

  // Relógio da tela: mantém os cronômetros dos cartões atualizados.
  const [now, setNow] = useState<number>(Date.now());
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 10 * 1000);
    return () => clearInterval(interval);
  }, []);

  const handleLogout = useCallback(() => {
    // O Alert da web pode ignorar callbacks de botões; o logout é direto e confiável.
    logout();
    navigation.replace('loginView');
  }, [logout, navigation]);

  const confirmDelivery = useCallback(
    (order: OrderView) => {
      const label = order.type === 'Delivery' ? 'saiu para entrega' : 'foi para a mesa';
      Alert.alert('Confirmar saída', `O pedido #${order.id} ${label}?`, [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Confirmar', onPress: () => deliverOrder(order.id) },
      ]);
    },
    [deliverOrder],
  );

  /* ==========================================
     CARTÃO DE PEDIDO
  ========================================== */
  const OrderCard = ({ order }: { order: OrderView }) => {
    const isLate = order.status !== 'Pronto' && elapsedMinutes(order.createdAt, now) >= LATE_AFTER_MINUTES;

    return (
      <View style={[styles.orderCard, isLate && styles.orderCardLate]}>
        <View style={styles.orderHeader}>
          <Text style={styles.orderId}>#{order.id}</Text>
          <View
            style={[
              styles.typeBadge,
              order.type === 'Delivery' ? styles.typeDelivery : styles.typeLocal,
            ]}>
            <Text
              style={[
                styles.typeText,
                order.type === 'Delivery' ? styles.typeTextDelivery : styles.typeTextLocal,
              ]}>
              {order.type}
            </Text>
          </View>
        </View>

        <Text style={styles.orderTable}>{order.customer}</Text>
        <Text style={styles.orderItems}>{order.items}</Text>

        <View style={styles.timeRow}>
          <Clock color={isLate ? COLORS.primary : COLORS.textMuted} size={14} />
          <Text style={[styles.timeText, isLate && styles.timeTextLate]}>
            {formatElapsed(order.createdAt, now)}
          </Text>
          {order.status === 'Em preparo' && order.startedAt && (
            <Text style={styles.timeSecondary}>· preparo {formatElapsed(order.startedAt, now)}</Text>
          )}
          {order.status === 'Pronto' && order.readyAt && (
            <Text style={styles.timeSecondary}>· pronto há {formatElapsed(order.readyAt, now)}</Text>
          )}
        </View>

        {order.status === 'Recebido' && (
          <TouchableOpacity style={styles.actionButton} onPress={() => advanceOrder(order.id)}>
            <Text style={styles.actionButtonText}>Iniciar preparo</Text>
          </TouchableOpacity>
        )}

        {order.status === 'Em preparo' && (
          <>
            <TouchableOpacity style={styles.actionButton} onPress={() => advanceOrder(order.id)}>
              <Text style={styles.actionButtonText}>Marcar como completo</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.linkButton} onPress={() => revertOrder(order.id)}>
              <Text style={styles.linkButtonText}>Voltar para a fila</Text>
            </TouchableOpacity>
          </>
        )}

        {order.status === 'Pronto' && (
          <>
            <View style={styles.readyBadge}>
              <Text style={styles.readyBadgeText}>✓ Pronto para retirada</Text>
            </View>
            <TouchableOpacity style={styles.secondaryButton} onPress={() => confirmDelivery(order)}>
              <Text style={styles.secondaryButtonText}>
                {order.type === 'Delivery' ? 'Saiu para entrega' : 'Entregue na mesa'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.linkButton} onPress={() => revertOrder(order.id)}>
              <Text style={styles.linkButtonText}>Voltar para o preparo</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    );
  };

  /* ==========================================
     COLUNA
  ========================================== */
  const Column = ({
    title,
    subtitle,
    emptyText,
    data,
  }: {
    title: string;
    subtitle: string;
    emptyText: string;
    data: OrderView[];
  }) => (
    <View style={styles.column}>
      <View style={styles.columnHeader}>
        <View>
          <Text style={styles.columnTitle}>{title}</Text>
          <Text style={styles.columnSubtitle}>{subtitle}</Text>
        </View>
        <View style={styles.countBadge}>
          <Text style={styles.countText}>{data.length}</Text>
        </View>
      </View>

      <ScrollView
        style={styles.columnScroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.columnList}>
        {data.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>{emptyText}</Text>
          </View>
        ) : (
          data.map(order => <OrderCard key={order.id} order={order} />)
        )}
      </ScrollView>
    </View>
  );

  const activeCount = queue.length + preparing.length;

  return (
    <SafeAreaView style={styles.safeArea}>

      {/* ==========================================
          CABEÇALHO
      ========================================== */}
      <View style={styles.headerContainer}>
        <View style={styles.headerTopRow}>
          <View style={styles.logoRow}>
            <View style={styles.logoIcon}>
              <ChefHat color="#FFF" size={14} />
            </View>
            <Text style={styles.logoText}>Fogo &amp; Fumaça</Text>
            <View style={styles.badge}><Text style={styles.badgeText}>Cozinha</Text></View>
          </View>

          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Text style={styles.logoutText}>Sair</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.pageTitle}>Painel da cozinha</Text>
        <Text style={styles.pageSubtitle}>
          {activeCount === 0
            ? 'Nenhum pedido em andamento no momento.'
            : `${activeCount} ${activeCount === 1 ? 'pedido em andamento' : 'pedidos em andamento'}.`}
        </Text>

        {/* Banner de Alerta */}
        <View style={styles.alertBanner}>
          <Flame color={COLORS.primary} size={16} />
          <Text style={styles.alertText}>
            {user?.name
              ? `${user.name}, os pedidos chegam direto do atendimento.`
              : 'Os pedidos chegam direto do atendimento.'}
          </Text>
        </View>
      </View>

      {/* ==========================================
          COLUNAS KANBAN (Horizontal Scroll)
      ========================================== */}
      <ScrollView
        horizontal
        style={styles.kanbanScroll}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.kanbanContainer}>

        <Column
          title="Na fila"
          subtitle="Aguardando início"
          emptyText="Sem pedidos aguardando."
          data={queue}
        />

        <Column
          title="Em preparo"
          subtitle="Sendo produzido"
          emptyText="Nada na chapa agora."
          data={preparing}
        />

        <Column
          title="Completo"
          subtitle="Aguardando retirada"
          emptyText="Nenhum pedido pronto."
          data={completed}
        />

      </ScrollView>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  // -- Header & Títulos --
  headerContainer: {
    padding: 24,
    paddingBottom: 16,
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logoIcon: {
    backgroundColor: COLORS.primary,
    padding: 6,
    borderRadius: 6,
  },
  logoText: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.textMain,
  },
  badge: {
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.textMuted,
  },
  logoutButton: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  logoutText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textMain,
  },
  pageTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.textMain,
    marginBottom: 4,
  },
  pageSubtitle: {
    fontSize: 14,
    color: COLORS.textMuted,
    marginBottom: 20,
  },

  // -- Banner de Alerta --
  alertBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primaryLight,
    padding: 12,
    borderRadius: 8,
    gap: 10,
  },
  alertText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.primary,
  },

  // -- Kanban Board --
  kanbanScroll: {
    flex: 1,
  },
  kanbanContainer: {
    flexGrow: 1, // faz as colunas ocuparem toda a altura disponível
    paddingHorizontal: 24,
    paddingBottom: 24,
    gap: 16,
  },
  column: {
    width: 320, // Largura fixa para manter o visual de cardápio nas colunas
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 16,
    padding: 16,
  },
  columnHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  columnTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.textMain,
    marginBottom: 2,
  },
  columnSubtitle: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  countBadge: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    width: 24,
    height: 24,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  countText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: COLORS.textMain,
  },
  columnScroll: {
    flex: 1,
  },
  columnList: {
    gap: 12,
    paddingBottom: 4,
  },

  // -- Estado vazio --
  emptyState: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingVertical: 28,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 13,
    color: COLORS.textMuted,
  },

  // -- Order Card --
  orderCard: {
    backgroundColor: COLORS.grayCard,
    borderRadius: 12,
    padding: 16,
  },
  orderCardLate: {
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  orderId: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.textMain,
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  typeDelivery: { backgroundColor: COLORS.deliveryBg },
  typeLocal: { backgroundColor: COLORS.localBg },
  typeText: { fontSize: 11, fontWeight: '800' },
  typeTextDelivery: { color: COLORS.deliveryText },
  typeTextLocal: { color: COLORS.localText },
  orderTable: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.textMain,
    marginBottom: 4,
  },
  orderItems: {
    fontSize: 13,
    color: COLORS.textMuted,
    lineHeight: 18,
    marginBottom: 16,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 16,
  },
  timeText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  timeTextLate: {
    color: COLORS.primary,
  },
  timeSecondary: {
    fontSize: 12,
    color: COLORS.textMuted,
  },

  // -- Botões dos Cards --
  actionButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  actionButtonText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: 'bold',
  },
  secondaryButton: {
    marginTop: 8,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: COLORS.textMain,
    fontSize: 14,
    fontWeight: 'bold',
  },
  linkButton: {
    paddingVertical: 10,
    alignItems: 'center',
  },
  linkButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  readyBadge: {
    backgroundColor: COLORS.btnReadyBg,
    paddingVertical: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  readyBadgeText: {
    color: COLORS.btnReadyText,
    fontSize: 14,
    fontWeight: 'bold',
  },
});
