import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  useWindowDimensions
} from 'react-native';
import { ChefHat, Clock, Flame } from 'lucide-react-native';

const COLORS = {
  background: '#F7F4F0',
  white: '#FFFFFF',
  primary: '#C84325',
  primaryLight: '#FBE9E7',
  grayCard: '#EBE8E2',
  border: '#E0DDD6',
  textMain: '#1A1A1A',
  textMuted: '#7A7571',
  deliveryBg: '#F57F17',
  deliveryText: '#FFFFFF',
  localBg: '#E0DDD6',
  localText: '#1A1A1A',
  btnReadyBg: '#D7E5D5',
  btnReadyText: '#2E7D32',
};

export default function KitchenDisplayScreen({ navigation }: any) {
  // ==========================================
  // RESPONSIVIDADE EM TEMPO REAL
  // ==========================================
  const { width } = useWindowDimensions();
  const isLargeScreen = width > 768; // Define se é tablet/desktop ou celular
  const styles = useMemo(() => getStyles(isLargeScreen), [isLargeScreen]);
  
  // ==========================================
  // ESTADOS GERAIS (INICIALIZADOS VAZIOS)
  // ==========================================
  const [queueOrders, setQueueOrders] = useState<any[]>([]);
  const [preparingOrders, setPreparingOrders] = useState<any[]>([]);
  const [completedOrders, setCompletedOrders] = useState<any[]>([]);

  // Exemplo de onde os dados devem ser carregados
  useEffect(() => {
    // Aqui entraria a chamada para a MockDatabase ou API Real
    // Exemplo:
    // async function loadKitchenOrders() {
    //   const ordersData = await MockDatabase.getOrders();
    //   
    //   setQueueOrders(ordersData.filter(o => o.status === 'Na fila'));
    //   setPreparingOrders(ordersData.filter(o => o.status === 'Em preparo'));
    //   setCompletedOrders(ordersData.filter(o => o.status === 'Pronto' || o.status === 'Completo'));
    // }
    // loadKitchenOrders();
  }, []);

  // Componente reutilizável para o Cartão de Pedido
  const OrderCard = ({ order, status }: any) => (
    <View style={styles.orderCard}>
      <View style={styles.orderHeader}>
        <Text style={styles.orderId}>{order.id}</Text>
        <View style={[styles.typeBadge, order.type === 'Delivery' ? styles.typeDelivery : styles.typeLocal]}>
          <Text style={[styles.typeText, order.type === 'Delivery' ? styles.typeTextDelivery : styles.typeTextLocal]}>
            {order.type}
          </Text>
        </View>
      </View>

      <Text style={styles.orderTable}>{order.customer || order.table}</Text>
      <Text style={styles.orderItems}>{order.items}</Text>

      <View style={styles.timeRow}>
        <Clock color={COLORS.textMuted} size={14} />
        <Text style={styles.timeText}>{order.time || order.queueTime}</Text>
      </View>

      {status === 'queue' && (
        <TouchableOpacity style={styles.actionButton}>
          <Text style={styles.actionButtonText}>Iniciar preparo</Text>
        </TouchableOpacity>
      )}
      {status === 'preparing' && (
        <TouchableOpacity style={styles.actionButton}>
          <Text style={styles.actionButtonText}>Marcar como completo</Text>
        </TouchableOpacity>
      )}
      {status === 'completed' && (
        <View style={styles.readyBadge}>
          <Text style={styles.readyBadgeText}>✓ Pronto para retirada</Text>
        </View>
      )}
    </View>
  );

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
            <Text style={styles.logoText}>Fogo & Fumaça</Text>
            <View style={styles.badge}><Text style={styles.badgeText}>Cozinha</Text></View>
          </View>
          
          <TouchableOpacity style={styles.logoutButton} onPress={() => navigation.replace('LoginScreen')}>
            <Text style={styles.logoutText}>Sair</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.pageTitle}>Painel da cozinha</Text>
        <Text style={styles.pageSubtitle}>Pedidos encaminhados pelo atendimento.</Text>

        <View style={styles.alertBanner}>
          <Flame color={COLORS.primary} size={16} />
          <Text style={styles.alertText}>Integração em tempo real com o salão e delivery.</Text>
        </View>
      </View>

      {/* ==========================================
          COLUNAS KANBAN (Responsivo)
      ========================================== */}
      <ScrollView 
        horizontal={!isLargeScreen} // Desativa a rolagem horizontal em telas grandes
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.kanbanContainer}
      >
        
        {/* COLUNA 1: Na Fila */}
        <View style={styles.column}>
          <View style={styles.columnHeader}>
            <View>
              <Text style={styles.columnTitle}>Na fila</Text>
              <Text style={styles.columnSubtitle}>Aguardando início</Text>
            </View>
            <View style={styles.countBadge}><Text style={styles.countText}>{queueOrders.length}</Text></View>
          </View>
          
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.columnList}>
            {queueOrders.length === 0 ? (
              <Text style={{ color: COLORS.textMuted, textAlign: 'center', marginTop: 20 }}>Fila vazia</Text>
            ) : (
              queueOrders.map(order => <OrderCard key={order.id} order={order} status="queue" />)
            )}
          </ScrollView>
        </View>

        {/* COLUNA 2: Em Preparo */}
        <View style={styles.column}>
          <View style={styles.columnHeader}>
            <View>
              <Text style={styles.columnTitle}>Em preparo</Text>
              <Text style={styles.columnSubtitle}>Sendo produzido</Text>
            </View>
            <View style={styles.countBadge}><Text style={styles.countText}>{preparingOrders.length}</Text></View>
          </View>
          
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.columnList}>
            {preparingOrders.length === 0 ? (
               <Text style={{ color: COLORS.textMuted, textAlign: 'center', marginTop: 20 }}>Nenhum preparo ativo</Text>
            ) : (
              preparingOrders.map(order => <OrderCard key={order.id} order={order} status="preparing" />)
            )}
          </ScrollView>
        </View>

        {/* COLUNA 3: Completo */}
        <View style={styles.column}>
          <View style={styles.columnHeader}>
            <View>
              <Text style={styles.columnTitle}>Completo</Text>
              <Text style={styles.columnSubtitle}>Aguardando retirada</Text>
            </View>
            <View style={styles.countBadge}><Text style={styles.countText}>{completedOrders.length}</Text></View>
          </View>
          
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.columnList}>
            {completedOrders.length === 0 ? (
               <Text style={{ color: COLORS.textMuted, textAlign: 'center', marginTop: 20 }}>Nenhum pedido finalizado</Text>
            ) : (
              completedOrders.map(order => <OrderCard key={order.id} order={order} status="completed" />)
            )}
          </ScrollView>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

// ==========================================
// FUNÇÃO DE ESTILOS DINÂMICOS
// ==========================================
const getStyles = (isLargeScreen: boolean) => StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  headerContainer: {
    padding: isLargeScreen ? 32 : 24,
    paddingBottom: 16,
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logoIcon: { backgroundColor: COLORS.primary, padding: 6, borderRadius: 6 },
  logoText: { fontSize: 15, fontWeight: '800', color: COLORS.textMain },
  badge: { borderWidth: 1, borderColor: COLORS.border, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  badgeText: { fontSize: 10, fontWeight: '700', color: COLORS.textMuted },
  logoutButton: { backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.border, paddingVertical: 8, paddingHorizontal: 16, borderRadius: 8 },
  logoutText: { fontSize: 13, fontWeight: '600', color: COLORS.textMain },
  pageTitle: { fontSize: isLargeScreen ? 28 : 24, fontWeight: 'bold', color: COLORS.textMain, marginBottom: 4 },
  pageSubtitle: { fontSize: 14, color: COLORS.textMuted, marginBottom: 20 },
  alertBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.primaryLight, padding: 12, borderRadius: 8, gap: 10 },
  alertText: { fontSize: 13, fontWeight: '600', color: COLORS.primary },

  // -- Kanban Board Responsivo --
  kanbanContainer: {
    flexDirection: 'row', // Sempre horizontal
    paddingHorizontal: isLargeScreen ? 32 : 24,
    paddingBottom: 24,
    gap: 16,
    width: isLargeScreen ? '100%' : undefined, // Preenche a tela em displays grandes
  },
  column: {
    flex: isLargeScreen ? 1 : 0, // Se for tela grande, divide o espaço igualmente (1/3 cada)
    width: isLargeScreen ? 'auto' : 320, // Se for tela pequena, fixa em 320 para a rolagem horizontal
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 16,
    padding: 16,
  },
  columnHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  columnTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.textMain, marginBottom: 2 },
  columnSubtitle: { fontSize: 12, color: COLORS.textMuted },
  countBadge: { backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.border, width: 24, height: 24, borderRadius: 4, justifyContent: 'center', alignItems: 'center' },
  countText: { fontSize: 12, fontWeight: 'bold', color: COLORS.textMain },
  columnList: { gap: 12, paddingBottom: 20 },

  // -- Order Card --
  orderCard: { backgroundColor: COLORS.grayCard, borderRadius: 12, padding: 16 },
  orderHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  orderId: { fontSize: 15, fontWeight: '800', color: COLORS.textMain },
  typeBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
  typeDelivery: { backgroundColor: COLORS.deliveryBg },
  typeLocal: { backgroundColor: COLORS.localBg },
  typeText: { fontSize: 11, fontWeight: '800' },
  typeTextDelivery: { color: COLORS.deliveryText },
  typeTextLocal: { color: COLORS.localText },
  orderTable: { fontSize: 14, fontWeight: '800', color: COLORS.textMain, marginBottom: 4 },
  orderItems: { fontSize: 13, color: COLORS.textMuted, lineHeight: 18, marginBottom: 16 },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 16 },
  timeText: { fontSize: 12, fontWeight: '600', color: COLORS.textMuted },
  
  actionButton: { backgroundColor: COLORS.primary, paddingVertical: 12, borderRadius: 6, alignItems: 'center' },
  actionButtonText: { color: COLORS.white, fontSize: 14, fontWeight: 'bold' },
  readyBadge: { backgroundColor: COLORS.btnReadyBg, paddingVertical: 12, borderRadius: 6, alignItems: 'center' },
  readyBadgeText: { color: COLORS.btnReadyText, fontSize: 14, fontWeight: 'bold' }
});