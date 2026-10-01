import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Switch,
  TextInput,
  Modal,
  useWindowDimensions 
} from 'react-native';
import { Alert } from '../utils/alert';
import { 
  Flame, LogOut, LayoutDashboard, ClipboardList, 
  MenuSquare, Tags, Armchair, Users, BarChart3, 
  Settings, DollarSign, TrendingUp, ShoppingBag, 
  ChevronRight, ArrowUpRight, Plus, Edit3, QrCode,
  Search, Filter, Eye, XCircle, Trash2, Star, Image as ImageIcon,
  UserCircle2, Receipt, Calculator, UtensilsCrossed,
  Shield, KeyRound, Phone, IdCard, Calendar, PieChart, 
  TrendingDown, Award, Download, Store, Clock, 
  CreditCard, Smartphone, Lock, Bell, Moon, Image as ProductImageIcon
} from 'lucide-react-native';
import { Image as RNImage } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { useAuth } from '../controller/AuthController';
import {
  useOrders,
  updateOrderStatus,
  advanceOrder as advanceOrderStatus,
  formatMoney,
} from '../store/Orders';
import {
  useCatalog,
  buildProduct,
  buildCategory,
  buildTable,
  buildStaff,
  validateCatalogForm,
} from '../controller/CatalogController';
import { authApi, reportsApi } from '../services/api';
import { useDashboard, useReports } from '../controller/ReportsController';

const COLORS = {
  background: '#F7F4F0', white: '#FFFFFF', dark: '#2A2421', primary: '#C84325',
  grayLight: '#EBE8E2', border: '#D1CEC7', textMain: '#1A1A1A', textMuted: '#7A7571',
  success: '#2E7D32', successLight: '#E8F5E9',
};

const MENU_ITEMS = [
  { id: 'Visão Geral', icon: LayoutDashboard },
  { id: 'Pedidos', icon: ClipboardList },
  { id: 'Cardápio', icon: MenuSquare },
  { id: 'Categorias', icon: Tags },
  { id: 'Mesas', icon: Armchair },
  { id: 'Equipe', icon: Users },
  { id: 'Relatórios', icon: BarChart3 },
  { id: 'Configurações', icon: Settings },
];

export default function adminView({ navigation }: any) {
  const { logout } = useAuth();
  // ==========================================
  // RESPONSIVIDADE EM TEMPO REAL
  // ==========================================
  const { width } = useWindowDimensions();
  const isLargeScreen = width > 768;
  const styles = useMemo(() => getStyles(isLargeScreen), [isLargeScreen]);

  const [activeTab, setActiveTab] = useState<string>('Visão Geral');
  const [reportPeriod, setReportPeriod] = useState<any>('Esta semana');
  const [orderSearch, setOrderSearch] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState('Todos');
  const [productSearch, setProductSearch] = useState('');
  const [productCategoryFilter, setProductCategoryFilter] = useState('Todas');
  const [advancedFilterOpen, setAdvancedFilterOpen] = useState(false);
  const [advancedMinPrice, setAdvancedMinPrice] = useState('');
  const [advancedMaxPrice, setAdvancedMaxPrice] = useState('');
  const [advancedFromDate, setAdvancedFromDate] = useState('');
  const [advancedToDate, setAdvancedToDate] = useState('');
  const [detailOrder, setDetailOrder] = useState<any | null>(null);
  const [tableAction, setTableAction] = useState<{ type: 'manage' | 'close' | 'split' | 'receive'; table: any } | null>(null);
  const [paymentMethod, setPaymentMethod] = useState('Pix');
  const [receivedAmount, setReceivedAmount] = useState('');
  const [passwordModal, setPasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  
  // ==========================================
  // DADOS VINDOS DOS CONTROLLERS (nenhum dado fixo nesta tela)
  // ==========================================
  const { orders } = useOrders();
  const {
    products,
    setProducts,
    categories,
    setCategories,
    tables,
    setTables,
    createProduct,
    updateProduct,
    deleteProduct,
    createCategory,
    updateCategory,
    deleteCategory,
    createTable,
    updateTable,
    deleteTable,
    createStaff,
    updateStaff,
    deleteStaff,
    staff,
    setStaff,
    settings,
    setSettings,
    saveSettings,
  } = useCatalog();
  const dashboardData = useDashboard();
  const reportsData = useReports(reportPeriod);

  // Consumo de cada mesa calculado a partir dos pedidos em aberto.
  const tablesWithConsumption = useMemo(
    () =>
      tables.map((table: any) => {
        const open = orders.filter(
          order =>
            order.table === table.number &&
            order.status !== 'Entregue' &&
            order.status !== 'Cancelado',
        );
        return {
          ...table,
          consumption: {
            items: open.flatMap(order => order.itemList.map(item => `${item.qty}x ${item.name}`)),
            total: formatMoney(open.reduce((sum, order) => sum + order.totalValue, 0)),
          },
        };
      }),
    [tables, orders],
  );
  const [modalType, setModalType] = useState<string | null>(null);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ name: '', description: '', price: '', category: 'Carnes', number: '', role: 'Garçom', phone: '', cpf: '', image: '' });

  const openForm = (type: string, item: any = {}) => {
    setModalType(type); setEditingId(item.id || null);
    setForm({ name: item.name || item.nome || '', description: item.description || item.descricao || '', price: item.price || '', category: item.category || 'Carnes', number: item.number || '', role: item.role || 'Garçom', phone: item.phone || '', cpf: item.cpf || '', image: item.image || '' });
  };
  const closeForm = () => { setModalType(null); setEditingId(null); };
  
  const saveForm = async () => {
    const validationError = validateCatalogForm(modalType, form, { tables, editingId });
    if (validationError) return Alert.alert('Verifique os campos', validationError);
    if (modalType === 'product') {
      const item: any = buildProduct(form, editingId);
      const ok = editingId ? await updateProduct(editingId, item) : await createProduct(item);
      if (!ok) return;
    } else if (modalType === 'category') {
      const item: any = buildCategory(form, editingId);
      const ok = editingId ? await updateCategory(editingId, item) : await createCategory(item);
      if (!ok) return;
    } else if (modalType === 'table') {
      const item: any = buildTable(form, editingId);
      const ok = editingId ? await updateTable(editingId, item) : await createTable(item);
      if (!ok) return;
    } else if (modalType === 'staff') {
      const item: any = buildStaff(form, editingId);
      const ok = editingId ? await updateStaff(editingId, item) : await createStaff(item);
      if (!ok) return;
    }
    closeForm(); Alert.alert('Salvo', 'As alterações foram persistidas com sucesso.');
  };
  
  const advanceOrder = (order: any) => advanceOrderStatus(order.id);

  const filteredOrders = useMemo(() => orders.filter(order => {
    const query = orderSearch.trim().toLowerCase();
    const matchesSearch = !query || `${order.id} ${order.customer} ${order.items} ${order.type}`.toLowerCase().includes(query);
    const from = advancedFromDate ? new Date(`${advancedFromDate}T00:00:00`).getTime() : 0;
    const to = advancedToDate ? new Date(`${advancedToDate}T23:59:59`).getTime() : Number.MAX_SAFE_INTEGER;
    return matchesSearch && (orderStatusFilter === 'Todos' || order.status === orderStatusFilter) && order.createdAt >= from && order.createdAt <= to;
  }), [orders, orderSearch, orderStatusFilter, advancedFromDate, advancedToDate]);

  const filteredProducts = useMemo(() => products.filter(product => {
    const query = productSearch.trim().toLowerCase();
    const price = Number(String(product.price).replace('.', '').replace(',', '.'));
    const min = advancedMinPrice ? Number(advancedMinPrice.replace(',', '.')) : 0;
    const max = advancedMaxPrice ? Number(advancedMaxPrice.replace(',', '.')) : Number.MAX_SAFE_INTEGER;
    return (!query || `${product.name} ${product.description}`.toLowerCase().includes(query)) && (productCategoryFilter === 'Todas' || product.category === productCategoryFilter) && price >= min && price <= max;
  }), [products, productSearch, productCategoryFilter, advancedMinPrice, advancedMaxPrice]);

  const pickProductImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return Alert.alert('Permissão necessária', 'Permita acesso à galeria para anexar uma imagem.');
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.8 });
    if (!result.canceled && result.assets[0]?.uri) setForm(current => ({ ...current, image: result.assets[0].uri }));
  };

  const handleTableAction = async () => {
    if (!tableAction) return;
    const { type, table } = tableAction;
    if (type === 'receive') {
      const total = Number(String(table.consumption.total).replace('.', '').replace(',', '.'));
      const received = Number(String(receivedAmount).replace('.', '').replace(',', '.'));
      if (paymentMethod === 'Dinheiro' && (!received || received < total)) return Alert.alert('Valor insuficiente', 'O valor recebido precisa ser igual ou maior que o total da conta.');
      await updateTable(table.id, { status: 'Livre', waiter: null });
      setTableAction(null);
      setReceivedAmount('');
      return Alert.alert('Pagamento recebido', paymentMethod === 'Dinheiro' ? `Troco: R$ ${(received - total).toFixed(2).replace('.', ',')}` : 'A mesa foi liberada e o pagamento foi registrado.');
    }
    if (type === 'close') {
      await updateTable(table.id, { status: 'Aguardando pagamento' });
      setTableAction(null);
      return Alert.alert('Conta fechada', 'A mesa agora aguarda o recebimento.');
    }
    if (type === 'manage') { setTableAction(null); return Alert.alert('Comanda atualizada', 'A comanda está pronta para receber novos itens pelo atendimento.'); }
    if (type === 'split') { setTableAction(null); return Alert.alert('Divisão da conta', `Total: R$ ${table.consumption.total}.`); }
  };

  const exportPdf = async () => {
    try {
      const html = `<h1>Fogo & Fumaça</h1><h2>Relatório ${reportPeriod}</h2><p>Faturamento: ${reportsData.financeiro.faturamento}</p><p>Pedidos concluídos: ${reportsData.financeiro.totalVendas}</p>`;
      await reportsApi.exportPdf({ period: reportPeriod, html });
      const file = await Print.printToFileAsync({ html });
      if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(file.uri, { mimeType: 'application/pdf', dialogTitle: 'Compartilhar relatório' });
      else Alert.alert('Relatório exportado', `PDF gerado em ${file.uri}`);
    } catch (error: any) { Alert.alert('Erro ao exportar', error?.message || 'Não foi possível gerar o PDF.'); }
  };

  const changePassword = async () => {
    if (!currentPassword || newPassword.length < 6) return Alert.alert('Senha inválida', 'Informe a senha atual e uma nova senha com pelo menos 6 caracteres.');
    try { await authApi.changePassword({ currentPassword, newPassword }); setPasswordModal(false); setCurrentPassword(''); setNewPassword(''); Alert.alert('Senha alterada', 'Sua senha foi atualizada.'); }
    catch (error: any) { Alert.alert('Erro de segurança', error?.message || 'Não foi possível alterar a senha.'); }
  };

  const endOtherSessions = async () => {
    try { await authApi.endOtherSessions(); Alert.alert('Sessões encerradas', 'As outras sessões foram encerradas.'); }
    catch (error: any) { Alert.alert('Erro de segurança', error?.message || 'Não foi possível encerrar as sessões.'); }
  };

  // ==========================================
  // RENDERIZAÇÕES DAS TELAS
  // ==========================================
  
  const renderVisaoGeral = () => (
    <View style={styles.contentArea}>
      <Text style={styles.pageTitle}>Visão Geral</Text>
      <Text style={styles.pageSubtitle}>Acompanhamento em tempo real do seu negócio.</Text>
      
      <View style={styles.kpiGrid}>
        <View style={styles.kpiCard}>
          <View style={styles.kpiHeader}>
            <Text style={styles.kpiLabel}>Faturamento do dia</Text>
            <View style={styles.iconBox}><DollarSign color={COLORS.primary} size={18} /></View>
          </View>
          <View style={styles.kpiRow}>
            <Text style={styles.kpiValue}>{dashboardData.faturamento}</Text>
            <View style={styles.kpiBadge}><ArrowUpRight color={COLORS.success} size={14} /><Text style={styles.kpiBadgeText}>{dashboardData.crescimentoFaturamento}</Text></View>
          </View>
        </View>

        <View style={styles.kpiCard}>
          <View style={styles.kpiHeader}>
            <Text style={styles.kpiLabel}>Pedidos concluídos</Text>
            <View style={styles.iconBox}><ShoppingBag color={COLORS.primary} size={18} /></View>
          </View>
          <Text style={styles.kpiValue}>{dashboardData.pedidos}</Text>
        </View>

        <View style={styles.kpiCard}>
          <View style={styles.kpiHeader}>
            <Text style={styles.kpiLabel}>Ticket médio</Text>
            <View style={styles.iconBox}><TrendingUp color={COLORS.primary} size={18} /></View>
          </View>
          <Text style={styles.kpiValue}>{dashboardData.ticketMedio}</Text>
        </View>
      </View>

      <View style={styles.splitGrid}>
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>Mais vendidos hoje</Text></View>
          {dashboardData.produtosDestaque.map((item, index) => (
            <View key={item.id} style={[styles.listItem, index === dashboardData.produtosDestaque.length - 1 && styles.noBorder]}>
              <View><Text style={styles.itemTitle}>{item.nome}</Text><Text style={styles.itemSub}>{item.vendas} unidades vendidas</Text></View>
              <Text style={styles.itemValue}>{item.valor}</Text>
            </View>
          ))}
        </View>

        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>Pedidos recentes</Text><TouchableOpacity onPress={() => setActiveTab('Pedidos')}><Text style={styles.linkText}>Ver todos</Text></TouchableOpacity></View>
          {dashboardData.pedidosRecentes.map((pedido, index) => (
            <View key={pedido.id} style={[styles.listItem, index === dashboardData.pedidosRecentes.length - 1 && styles.noBorder]}>
              <View style={styles.orderInfo}>
                <View style={styles.orderAvatar}><Text style={styles.orderAvatarText}>{pedido.id.replace('#', '')}</Text></View>
                <View><Text style={styles.itemTitle}>{pedido.mesa}</Text><Text style={styles.itemSub}>{pedido.time} • {pedido.status}</Text></View>
              </View>
              <Text style={styles.itemValue}>{pedido.valor}</Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );

  const renderPedidos = () => (
    <View style={styles.contentArea}>
      <View style={styles.sectionHeaderRow}>
        <View><Text style={styles.pageTitle}>Pedidos</Text><Text style={styles.pageSubtitle}>Acompanhe e gerencie o fluxo de pedidos de todos os canais.</Text></View>
      </View>
      <View style={styles.searchFilterRow}>
        <View style={styles.searchBar}>
          <Search color={COLORS.textMuted} size={18} />
          <TextInput value={orderSearch} onChangeText={setOrderSearch} placeholder="Buscar por número do pedido ou mesa..." style={styles.searchInput} placeholderTextColor={COLORS.textMuted}/>
        </View>
        <TouchableOpacity style={styles.filterButton} onPress={() => setAdvancedFilterOpen(true)}><Filter color={COLORS.textMain} size={18} />{isLargeScreen && <Text style={styles.filterButtonText}>Filtros</Text>}</TouchableOpacity>
      </View>
      <View style={styles.statusTabsWrapper}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.statusTabsContainer}>
          {['Todos', 'Recebido', 'Em preparo', 'Pronto', 'Entregue', 'Cancelado'].map((status) => (
            <TouchableOpacity key={status} onPress={() => setOrderStatusFilter(status)} style={[styles.statusPill, orderStatusFilter === status && styles.statusPillActive]}>
              <Text style={[styles.statusPillText, orderStatusFilter === status && styles.statusPillTextActive]}>{status}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
      <View style={styles.listContainer}>
        {filteredOrders.map(order => (
          <View key={order.id} style={styles.orderAdminCard}>
            <View style={styles.orderAdminHeader}>
              <View style={styles.orderAdminIdBox}>
                <Text style={styles.orderAdminId}>{order.id}</Text>
                <View style={[styles.roleBadge, { backgroundColor: order.type === 'Delivery' ? '#FFF3E0' : COLORS.grayLight }]}><Text style={[styles.roleBadgeText, { color: order.type === 'Delivery' ? '#E65100' : COLORS.textMain }]}>{order.type}</Text></View>
              </View>
              <View style={[styles.statusBadge, order.status === 'Entregue' && styles.statusBadgeSuccess]}><Text style={[styles.statusBadgeText, order.status === 'Entregue' && styles.statusBadgeTextSuccess]}>{order.status}</Text></View>
            </View>
            <View style={styles.orderAdminBody}>
              <View style={{ flex: 1, paddingRight: 16 }}><Text style={styles.orderAdminCustomer}>{order.customer}</Text><Text style={styles.orderAdminItems} numberOfLines={2}>{order.items}</Text></View>
              <View style={{ alignItems: 'flex-end' }}><Text style={styles.orderAdminTotal}>R$ {order.total}</Text><Text style={styles.orderAdminTime}>{order.time} • {order.payment}</Text></View>
            </View>
            <View style={styles.orderAdminFooter}>
              <TouchableOpacity style={styles.actionBtnOutline} onPress={() => setDetailOrder(order)}><Eye size={16} color={COLORS.textMain} /><Text style={styles.actionBtnOutlineText}>Detalhes</Text></TouchableOpacity>
              <View style={styles.orderAdminFooterRight}>
                {order.status !== 'Entregue' && order.status !== 'Cancelado' && (
                  <TouchableOpacity style={styles.actionBtnPrimary} onPress={() => advanceOrder(order)}><Text style={styles.actionBtnPrimaryText}>Avançar Status</Text></TouchableOpacity>
                )}
                <TouchableOpacity style={styles.cancelButton} onPress={() => Alert.alert('Cancelar pedido', `Deseja cancelar o pedido ${order.id}?`, [{ text: 'Não', style: 'cancel' }, { text: 'Cancelar pedido', style: 'destructive', onPress: () => updateOrderStatus(order.id, 'Cancelado') }])}><XCircle size={20} color="#D32F2F" /></TouchableOpacity>
              </View>
            </View>
          </View>
        ))}
      </View>
    </View>
  );

  const renderCardapio = () => (
    <View style={styles.contentArea}>
      <View style={styles.sectionHeaderRow}>
        <View><Text style={styles.pageTitle}>Cardápio</Text><Text style={styles.pageSubtitle}>Cadastre, edite e controle a disponibilidade dos produtos.</Text></View>
        <TouchableOpacity style={styles.actionBtnPrimary} onPress={() => openForm('product')}><Plus color={COLORS.white} size={18} /><Text style={styles.actionBtnPrimaryText}>Novo Produto</Text></TouchableOpacity>
      </View>
      <View style={styles.searchFilterRow}>
        <View style={styles.searchBar}><Search color={COLORS.textMuted} size={18} /><TextInput value={productSearch} onChangeText={setProductSearch} placeholder="Buscar por nome do produto..." style={styles.searchInput} placeholderTextColor={COLORS.textMuted}/></View>
        <TouchableOpacity style={styles.filterButton} onPress={() => setAdvancedFilterOpen(true)}><Filter color={COLORS.textMain} size={18} /></TouchableOpacity>
      </View>
      <View style={styles.statusTabsWrapper}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.statusTabsContainer}>
          {['Todas', 'Carnes', 'Lanches', 'Porções', 'Bebidas'].map((cat) => (
            <TouchableOpacity key={cat} onPress={() => setProductCategoryFilter(cat)} style={[styles.statusPill, productCategoryFilter === cat && styles.statusPillActive]}><Text style={[styles.statusPillText, productCategoryFilter === cat && styles.statusPillTextActive]}>{cat}</Text></TouchableOpacity>
          ))}
        </ScrollView>
      </View>
      <View style={styles.listContainer}>
        {filteredProducts.map((item) => (
          <View key={item.id} style={[styles.menuItemCard, !item.active && styles.menuItemCardInactive]}>
            <TouchableOpacity style={styles.menuItemImagePlaceholder} onPress={() => openForm('product', item)}>{item.image ? <RNImage source={{ uri: item.image }} style={styles.productImage} /> : <ProductImageIcon color={COLORS.textMuted} size={24} />}</TouchableOpacity>
            <View style={styles.menuItemInfo}>
              <View style={styles.menuItemTitleRow}>
                <Text style={styles.itemTitle}>{item.name}</Text>
                {item.highlight && (<View style={styles.highlightBadge}><Star color="#F57F17" size={12} fill="#F57F17" /><Text style={styles.highlightBadgeText}>Destaque</Text></View>)}
              </View>
              <Text style={styles.menuItemDesc} numberOfLines={2}>{item.description}</Text>
              <View style={styles.menuItemFooter}><Text style={styles.itemSub}>{item.category}</Text><Text style={styles.itemValue}>R$ {item.price}</Text></View>
            </View>
            <View style={styles.menuItemActions}>
              <View style={styles.switchWrapper}>
                <Text style={styles.switchLabel}>{item.active ? 'Disponível' : 'Indisponível'}</Text>
                <Switch value={item.active} onValueChange={() => updateProduct(item.id, { active: !item.active })} trackColor={{ false: COLORS.border, true: '#FBE9E7' }} thumbColor={item.active ? COLORS.primary : COLORS.grayLight}/>
              </View>
              <View style={styles.actionButtonsCol}>
                <TouchableOpacity style={styles.iconButton} onPress={() => openForm('product', item)}><Edit3 color={COLORS.textMain} size={18} /></TouchableOpacity>
                <TouchableOpacity style={[styles.iconButton, { backgroundColor: '#FFEBEE' }]} onPress={() => Alert.alert('Excluir produto', `Excluir ${item.name}?`, [{ text: 'Cancelar', style: 'cancel' }, { text: 'Excluir', style: 'destructive', onPress: () => deleteProduct(item.id) }])}><Trash2 color="#D32F2F" size={18} /></TouchableOpacity>
              </View>
            </View>
          </View>
        ))}
      </View>
    </View>
  );

  const renderCategorias = () => {
    const handleDeleteCategory = (category: any) => {
      if (category.count > 0) {
        Alert.alert('Ação não permitida', `A categoria "${category.name}" possui ${category.count} produto(s) vinculado(s).\n\nTransfira os produtos ou exclua-os antes de apagar a categoria.`);
      } else {
        Alert.alert('Excluir categoria', `Excluir a categoria "${category.name}"?`, [{ text: 'Cancelar', style: 'cancel' }, { text: 'Excluir', style: 'destructive', onPress: () => deleteCategory(category.id) }]);
      }
    };

    return (
      <View style={styles.contentArea}>
        <View style={styles.sectionHeaderRow}>
          <View><Text style={styles.pageTitle}>Categorias</Text><Text style={styles.pageSubtitle}>Organize o cardápio e facilite a busca dos clientes.</Text></View>
          <TouchableOpacity style={styles.actionBtnPrimary} onPress={() => openForm('category')}><Plus color={COLORS.white} size={18} /><Text style={styles.actionBtnPrimaryText}>Nova Categoria</Text></TouchableOpacity>
        </View>
        <View style={styles.listContainer}>
          {categories.map((cat) => (
            <View key={cat.id} style={[styles.listItemBase, !cat.active && styles.menuItemCardInactive]}>
              <View style={styles.listInfo}>
                <View style={styles.menuItemTitleRow}><Text style={styles.itemTitle}>{cat.name}</Text><View style={styles.countBadge}><Text style={styles.countBadgeText}>{cat.count} produtos</Text></View></View>
                <Text style={styles.itemSub}>{cat.description}</Text>
              </View>
              <View style={styles.listActions}>
                <View style={styles.switchWrapper}><Text style={styles.switchLabel}>{cat.active ? 'Ativa' : 'Inativa'}</Text><Switch value={cat.active} onValueChange={() => updateCategory(cat.id, { active: !cat.active })} trackColor={{ false: COLORS.border, true: '#FBE9E7' }} thumbColor={cat.active ? COLORS.primary : COLORS.grayLight}/></View>
                <View style={styles.actionButtonsCol}>
                  <TouchableOpacity style={styles.iconButton} onPress={() => openForm('category', cat)}><Edit3 color={COLORS.textMain} size={18} /></TouchableOpacity>
                  <TouchableOpacity style={[styles.iconButton, { backgroundColor: cat.count > 0 ? COLORS.grayLight : '#FFEBEE' }]} onPress={() => handleDeleteCategory(cat)}>
                    <Trash2 color={cat.count > 0 ? COLORS.textMuted : "#D32F2F"} size={18} />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ))}
        </View>
      </View>
    );
  };

  const renderMesas = () => {
    const getStatusStyle = (status: string) => {
      switch(status) {
        case 'Livre': return { bg: '#E8F5E9', text: '#2E7D32' };
        case 'Ocupada': return { bg: '#E3F2FD', text: '#1565C0' };
        case 'Reservada': return { bg: '#FFF3E0', text: '#E65100' };
        case 'Aguardando pagamento': return { bg: '#FFEBEE', text: '#C62828' };
        default: return { bg: COLORS.grayLight, text: COLORS.textMuted };
      }
    };
    return (
      <View style={styles.contentArea}>
        <View style={styles.sectionHeaderRow}>
          <View><Text style={styles.pageTitle}>Mesas e Consumo</Text><Text style={styles.pageSubtitle}>Gerencie o salão, adicione produtos e feche contas.</Text></View>
          <TouchableOpacity style={styles.actionBtnPrimary} onPress={() => openForm('table')}><Plus color={COLORS.white} size={18} /><Text style={styles.actionBtnPrimaryText}>Nova Mesa</Text></TouchableOpacity>
        </View>
        <View style={styles.gridContainer}>
          {tablesWithConsumption.map((table: any) => {
            const statusStyle = getStatusStyle(table.status);
            return (
              <View key={table.id} style={[styles.gridCard, table.status === 'Ocupada' && { borderColor: '#BBDEFB', borderWidth: 2 }]}>
                <View style={styles.gridCardHeader}>
                  <Text style={styles.gridCardTitle}>Mesa {table.number}</Text>
                  <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}><Text style={[styles.statusBadgeText, { color: statusStyle.text }]}>{table.status}</Text></View>
                </View>
                <View style={styles.tableBody}>
                  {table.status === 'Livre' && (<View style={styles.tableEmptyState}><UtensilsCrossed color={COLORS.border} size={32} /><Text style={styles.tableEmptyText}>Pronta para uso</Text></View>)}
                  {table.status === 'Reservada' && (<View style={styles.tableEmptyState}><UserCircle2 color="#FFB74D" size={32} /><Text style={[styles.tableEmptyText, { color: '#E65100' }]}>Reserva para 20:00</Text></View>)}
                  {(table.status === 'Ocupada' || table.status === 'Aguardando pagamento') && (
                    <>
                      <View style={styles.tableWaiterRow}><UserCircle2 color={COLORS.textMuted} size={16} /><Text style={styles.tableWaiterText}>Atendida por: <Text style={{fontWeight: 'bold', color: COLORS.textMain}}>{table.waiter}</Text></Text></View>
                      <View style={styles.tableConsumptionBox}>
                        {table.consumption.items.map((item: string, idx: number) => (<Text key={idx} style={styles.tableItemText} numberOfLines={1}>• {item}</Text>))}
                      </View>
                      <View style={styles.tableTotalRow}><Text style={styles.tableTotalLabel}>Total Parcial:</Text><Text style={styles.tableTotalValue}>R$ {table.consumption.total}</Text></View>
                    </>
                  )}
                </View>
                <View style={styles.tableFooter}>
                  {table.status === 'Livre' && (<TouchableOpacity style={styles.actionBtnPrimary} onPress={() => updateTable(table.id, { status: 'Ocupada', waiter: 'Admin' })}><Text style={styles.actionBtnPrimaryText}>Abrir Mesa</Text></TouchableOpacity>)}
                  {table.status === 'Reservada' && (<TouchableOpacity style={styles.actionBtnOutline} onPress={() => updateTable(table.id, { status: 'Livre', waiter: null })}><Text style={styles.actionBtnOutlineText}>Cancelar Reserva</Text></TouchableOpacity>)}
                  {table.status === 'Ocupada' && (
                    <View style={styles.tableActionRow}>
                      <TouchableOpacity style={[styles.actionBtnOutline, { flex: 1, paddingHorizontal: 0, justifyContent: 'center' }]} onPress={() => setTableAction({ type: 'manage', table })}><Text style={styles.actionBtnOutlineText}>Gerenciar Comanda</Text></TouchableOpacity>
                      <TouchableOpacity style={[styles.actionBtnPrimary, { flex: 1, paddingHorizontal: 0, alignItems: 'center' }]} onPress={() => setTableAction({ type: 'close', table })}><Text style={styles.actionBtnPrimaryText}>Fechar Conta</Text></TouchableOpacity>
                    </View>
                  )}
                  {table.status === 'Aguardando pagamento' && (
                    <View style={styles.tableActionRow}>
                      <TouchableOpacity style={[styles.secondaryButton, { flex: 1, marginTop: 0 }]} onPress={() => setTableAction({ type: 'split', table })}><Calculator color={COLORS.textMain} size={16} /><Text style={styles.secondaryButtonText}>Dividir</Text></TouchableOpacity>
                      <TouchableOpacity style={[styles.actionBtnPrimary, { flex: 1, backgroundColor: COLORS.success, paddingHorizontal: 0, alignItems: 'center' }]} onPress={() => setTableAction({ type: 'receive', table })}><Text style={styles.actionBtnPrimaryText}>Receber</Text></TouchableOpacity>
                      </View>
                  )}
                  {table.status === 'Livre' && <TouchableOpacity style={[styles.iconButton, { alignSelf: 'flex-end', marginTop: 10, backgroundColor: '#FFEBEE' }]} onPress={() => Alert.alert('Excluir mesa', `Excluir a mesa ${table.number}?`, [{ text: 'Cancelar', style: 'cancel' }, { text: 'Excluir', style: 'destructive', onPress: () => deleteTable(table.id) }])}><Trash2 color="#D32F2F" size={18} /></TouchableOpacity>}
                </View>
              </View>
            );
          })}
        </View>
      </View>
    );
  };

  const renderEquipe = () => {
    const getRoleConfig = (role: string) => {
      switch(role) {
        case 'Administrador': case 'Gerente': return { color: '#512DA8', bg: '#EDE7F6', perms: 'Acesso completo (Cardápio, Mesas, Equipe, Relatórios)' };
        case 'Garçom': return { color: '#0288D1', bg: '#E1F5FE', perms: 'Visualiza mesas, cria pedidos e altera pedidos.' };
        case 'Cozinheiro': return { color: '#E65100', bg: '#FFF3E0', perms: 'Visualiza fila de pedidos e altera status (Preparo/Pronto).' };
        case 'Caixa': return { color: '#2E7D32', bg: '#E8F5E9', perms: 'Visualiza pedidos, realiza pagamentos e fecha mesas.' };
        default: return { color: COLORS.textMuted, bg: COLORS.grayLight, perms: 'Permissões não definidas.' };
      }
    };
    return (
      <View style={styles.contentArea}>
        <View style={styles.sectionHeaderRow}>
          <View><Text style={styles.pageTitle}>Equipe</Text><Text style={styles.pageSubtitle}>Gerencie os funcionários, dados de acesso e permissões.</Text></View>
          <TouchableOpacity style={styles.actionBtnPrimary} onPress={() => openForm('staff')}><Plus color={COLORS.white} size={18} /><Text style={styles.actionBtnPrimaryText}>Novo Funcionário</Text></TouchableOpacity>
        </View>
        <View style={styles.listContainer}>
          {staff.map((user) => {
            const roleConfig = getRoleConfig(user.role);
            return (
              <View key={user.id} style={[styles.staffCard, !user.active && styles.menuItemCardInactive]}>
                <View style={styles.staffHeader}>
                  <View style={styles.staffNameRow}>
                    <View style={[styles.staffAvatar, { backgroundColor: roleConfig.bg }]}><Text style={[styles.staffAvatarText, { color: roleConfig.color }]}>{user.name.charAt(0)}</Text></View>
                    <View><Text style={styles.itemTitle}>{user.name}</Text><View style={[styles.roleBadge, { backgroundColor: roleConfig.bg, marginTop: 4, alignSelf: 'flex-start' }]}><Text style={[styles.roleBadgeText, { color: roleConfig.color }]}>{user.role}</Text></View></View>
                  </View>
                  <View style={styles.switchWrapper}><Text style={styles.switchLabel}>{user.active ? 'Ativo' : 'Inativo'}</Text><Switch value={user.active} onValueChange={() => updateStaff(user.id, { active: !user.active })} trackColor={{ false: COLORS.border, true: '#FBE9E7' }} thumbColor={user.active ? COLORS.primary : COLORS.grayLight}/></View>
                </View>
                <View style={styles.staffDetailsGrid}>
                  <View style={styles.staffDetailItem}><IdCard color={COLORS.textMuted} size={14} /><Text style={styles.staffDetailText}>{user.cpf}</Text></View>
                  <View style={styles.staffDetailItem}><Phone color={COLORS.textMuted} size={14} /><Text style={styles.staffDetailText}>{user.phone}</Text></View>
                  <View style={styles.staffDetailItem}><Users color={COLORS.textMuted} size={14} /><Text style={styles.staffDetailText}>Login: <Text style={{fontWeight: 'bold', color: COLORS.textMain}}>{user.login}</Text></Text></View>
                </View>
                <View style={styles.staffPermissionsBox}><Shield color={roleConfig.color} size={16} /><Text style={styles.staffPermissionsText}>{roleConfig.perms}</Text></View>
                <View style={styles.staffActions}>
                  <TouchableOpacity style={styles.actionBtnOutline} onPress={() => Alert.alert('Senha redefinida', 'Um link demonstrativo de redefinição foi enviado.')}><KeyRound color={COLORS.textMain} size={16} /><Text style={styles.actionBtnOutlineText}>Redefinir Senha</Text></TouchableOpacity>
                  <TouchableOpacity style={[styles.iconButton, { marginLeft: 'auto' }]} onPress={() => openForm('staff', user)}><Edit3 color={COLORS.textMain} size={18} /></TouchableOpacity>
                  <TouchableOpacity style={[styles.iconButton, { backgroundColor: '#FFEBEE' }]} onPress={() => Alert.alert('Excluir funcionário', `Excluir ${user.name}?`, [{ text: 'Cancelar', style: 'cancel' }, { text: 'Excluir', style: 'destructive', onPress: () => deleteStaff(user.id) }])}><Trash2 color="#D32F2F" size={18} /></TouchableOpacity>
                </View>
              </View>
            );
          })}
        </View>
      </View>
    );
  };

  const renderRelatorios = () => (
    <View style={styles.contentArea}>
      <View style={styles.sectionHeaderRow}>
        <View><Text style={styles.pageTitle}>Relatórios</Text><Text style={styles.pageSubtitle}>Analise o desempenho e o financeiro do restaurante.</Text></View>
        <TouchableOpacity style={styles.actionBtnOutline} onPress={exportPdf}><Download color={COLORS.textMain} size={18} /><Text style={styles.actionBtnOutlineText}>Exportar PDF</Text></TouchableOpacity>
      </View>
      <View style={styles.statusTabsWrapper}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.statusTabsContainer}>
          {['Hoje', 'Esta semana', 'Este mês', 'Personalizado'].map((period) => (
            <TouchableOpacity key={period} style={[styles.statusPill, reportPeriod === period && styles.statusPillActive]} onPress={() => setReportPeriod(period)}>
              {period === 'Personalizado' && <Calendar color={reportPeriod === period ? COLORS.white : COLORS.textMuted} size={14} style={{marginRight: 6}} />}
              <Text style={[styles.statusPillText, reportPeriod === period && styles.statusPillTextActive]}>{period}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
      <View style={styles.splitGrid}>
        <View style={{ flex: 1, gap: 24 }}>
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Resumo Financeiro</Text>
            <View style={styles.reportHighlightBox}>
              <Text style={styles.reportHighlightLabel}>Faturamento Total</Text>
              <Text style={styles.reportHighlightValue}>{reportsData.financeiro.faturamento}</Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 16, marginTop: 16 }}>
              <View style={styles.reportStatBox}><Text style={styles.kpiLabel}>Pedidos</Text><Text style={styles.itemValue}>{reportsData.financeiro.totalVendas}</Text></View>
              <View style={styles.reportStatBox}><Text style={styles.kpiLabel}>Ticket Médio</Text><Text style={styles.itemValue}>{reportsData.financeiro.ticketMedio}</Text></View>
            </View>
          </View>
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Análise de Pedidos</Text>
            <View style={styles.chartBarContainer}>
              <View style={styles.multiBarWrapper}>
                <View style={[styles.multiBarSegment, { width: reportsData.pedidos.tipos.mesa.pct as any, backgroundColor: COLORS.primary }]} />
                <View style={[styles.multiBarSegment, { width: reportsData.pedidos.tipos.delivery.pct as any, backgroundColor: '#FF9800' }]} />
                <View style={[styles.multiBarSegment, { width: reportsData.pedidos.tipos.retirada.pct as any, backgroundColor: '#4CAF50' }]} />
              </View>
              <View style={styles.multiBarLegend}>
                <Text style={styles.legendText}><View style={[styles.legendDot, {backgroundColor: COLORS.primary}]} /> Mesa ({reportsData.pedidos.tipos.mesa.pct})</Text>
                <Text style={styles.legendText}><View style={[styles.legendDot, {backgroundColor: '#FF9800'}]} /> Delivery</Text>
                <Text style={styles.legendText}><View style={[styles.legendDot, {backgroundColor: '#4CAF50'}]} /> Retirada</Text>
              </View>
            </View>
            <View style={{ flexDirection: 'row', gap: 16, marginTop: 16 }}>
              <View style={[styles.reportStatBox, { borderColor: '#E8F5E9', backgroundColor: '#F1F8E9' }]}><Text style={styles.kpiLabel}>Concluídos</Text><Text style={[styles.itemValue, { color: COLORS.success }]}>{reportsData.pedidos.concluidos}</Text></View>
              <View style={[styles.reportStatBox, { borderColor: '#FFEBEE', backgroundColor: '#FFEBEE' }]}><Text style={styles.kpiLabel}>Cancelados</Text><Text style={[styles.itemValue, { color: '#C62828' }]}>{reportsData.pedidos.cancelados}</Text></View>
            </View>
          </View>
        </View>
        <View style={{ flex: 1, gap: 24 }}>
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Desempenho de Produtos</Text>
            {reportsData.produtos.map((prod) => (
              <View key={prod.id} style={styles.reportListItem}>
                <View style={styles.reportListHeader}><Text style={styles.itemTitle}>{prod.nome}</Text><Text style={styles.itemValue}>{prod.receita}</Text></View>
                <View style={styles.reportListSub}>
                  <Text style={styles.itemSub}>{prod.qtd} vendidos</Text>
                  {prod.type === 'bottom' && (<View style={styles.alertBadge}><TrendingDown size={12} color="#C62828" /><Text style={styles.alertBadgeText}>Baixa saída</Text></View>)}
                </View>
                <View style={styles.progressBarBg}><View style={[styles.progressBarFill, { width: prod.fill as any, backgroundColor: prod.type === 'bottom' ? '#EF5350' : COLORS.primary }]} /></View>
              </View>
            ))}
          </View>
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Ranking da Equipe</Text>
            {reportsData.equipe.map((func, index) => (
              <View key={func.id} style={styles.reportListItem}>
                <View style={styles.reportListHeader}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>{index === 0 && <Award size={16} color="#F57F17" />}<Text style={styles.itemTitle}>{func.nome}</Text></View>
                  <Text style={styles.itemValue}>{func.vendas}</Text>
                </View>
                <Text style={styles.itemSub}>{func.pedidos} pedidos realizados</Text>
                <View style={styles.progressBarBg}><View style={[styles.progressBarFill, { width: func.fill as any, backgroundColor: '#F57F17' }]} /></View>
              </View>
            ))}
          </View>
        </View>
      </View>
    </View>
  );

  const renderConfiguracoes = () => (
    <View style={styles.contentArea}>
      <View style={styles.sectionHeaderRow}>
        <View><Text style={styles.pageTitle}>Configurações</Text><Text style={styles.pageSubtitle}>Personalize as regras de negócio, operação e segurança do sistema.</Text></View>
        <TouchableOpacity style={styles.actionBtnPrimary} onPress={() => saveSettings(settings)}><Text style={styles.actionBtnPrimaryText}>Salvar Alterações</Text></TouchableOpacity>
      </View>
      <View style={styles.splitGrid}>
        <View style={{ flex: 1, gap: 24 }}>
          <View style={styles.sectionCard}>
            <View style={styles.settingsHeader}><Store color={COLORS.textMain} size={20} /><Text style={styles.sectionTitle}>Dados do Restaurante</Text></View>
            <Text style={styles.inputLabel}>Nome do Estabelecimento</Text><TextInput style={styles.input} value={settings.name} onChangeText={(value: string) => setSettings((current: any) => ({ ...current, name: value }))} />
            <Text style={styles.inputLabel}>Endereço Completo</Text><TextInput style={styles.input} value={settings.address} onChangeText={(value: string) => setSettings((current: any) => ({ ...current, address: value }))} />
            <Text style={styles.inputLabel}>Telefone / WhatsApp</Text><TextInput style={styles.input} value={settings.phone} onChangeText={(value: string) => setSettings((current: any) => ({ ...current, phone: value }))} />
            <Text style={styles.inputLabel}>Horário de Funcionamento</Text><TextInput style={[styles.input, { marginBottom: 0 }]} value={settings.hours} onChangeText={(value: string) => setSettings((current: any) => ({ ...current, hours: value }))} />
          </View>
          <View style={styles.sectionCard}>
            <View style={styles.settingsHeader}><Clock color={COLORS.textMain} size={20} /><Text style={styles.sectionTitle}>Operação e Pedidos</Text></View>
            <Text style={styles.inputLabel}>Tempo Médio de Preparo (minutos)</Text><TextInput style={styles.input} value={settings.averagePrepMinutes} onChangeText={(value: string) => setSettings((current: any) => ({ ...current, averagePrepMinutes: value }))} keyboardType="numeric" />
            <View style={styles.formGroupRow}><View><Text style={styles.itemTitle}>Habilitar Delivery</Text><Text style={styles.itemSub}>Aceitar pedidos para entrega externa</Text></View><Switch value={settings.delivery} onValueChange={(value: boolean) => setSettings((current: any) => ({ ...current, delivery: value }))} trackColor={{ false: COLORS.border, true: '#FBE9E7' }} thumbColor={COLORS.primary} /></View>
            <View style={[styles.formGroupRow, { borderBottomWidth: 0, paddingBottom: 0, marginBottom: 0 }]}><View><Text style={styles.itemTitle}>Habilitar Retirada</Text><Text style={styles.itemSub}>Cliente retira o pedido no balcão</Text></View><Switch value={settings.takeaway} onValueChange={(value: boolean) => setSettings((current: any) => ({ ...current, takeaway: value }))} trackColor={{ false: COLORS.border, true: '#FBE9E7' }} thumbColor={COLORS.primary} /></View>
          </View>
        </View>
        <View style={{ flex: 1, gap: 24 }}>
          <View style={styles.sectionCard}>
            <View style={styles.settingsHeader}><CreditCard color={COLORS.textMain} size={20} /><Text style={styles.sectionTitle}>Formas de Pagamento</Text></View>
            <View style={styles.formGroupRow}><Text style={styles.itemTitle}>Pix</Text><Switch value={settings.payments.pix} onValueChange={(value: boolean) => setSettings((current: any) => ({ ...current, payments: { ...current.payments, pix: value } }))} trackColor={{ false: COLORS.border, true: '#FBE9E7' }} thumbColor={COLORS.primary} /></View>
            <View style={styles.formGroupRow}><Text style={styles.itemTitle}>Dinheiro</Text><Switch value={settings.payments.cash} onValueChange={(value: boolean) => setSettings((current: any) => ({ ...current, payments: { ...current.payments, cash: value } }))} trackColor={{ false: COLORS.border, true: '#FBE9E7' }} thumbColor={COLORS.primary} /></View>
            <View style={styles.formGroupRow}><Text style={styles.itemTitle}>Cartão de Crédito</Text><Switch value={settings.payments.credit} onValueChange={(value: boolean) => setSettings((current: any) => ({ ...current, payments: { ...current.payments, credit: value } }))} trackColor={{ false: COLORS.border, true: '#FBE9E7' }} thumbColor={COLORS.primary} /></View>
            <View style={[styles.formGroupRow, { borderBottomWidth: 0, paddingBottom: 0, marginBottom: 0 }]}><Text style={styles.itemTitle}>Cartão de Débito</Text><Switch value={settings.payments.debit} onValueChange={(value: boolean) => setSettings((current: any) => ({ ...current, payments: { ...current.payments, debit: value } }))} trackColor={{ false: COLORS.border, true: '#FBE9E7' }} thumbColor={COLORS.primary} /></View>
          </View>
          <View style={styles.sectionCard}>
            <View style={styles.settingsHeader}><Smartphone color={COLORS.textMain} size={20} /><Text style={styles.sectionTitle}>Sistema e Interface</Text></View>
            <View style={styles.formGroupRow}><View style={{flexDirection: 'row', alignItems: 'center', gap: 8}}><Bell size={16} color={COLORS.textMuted}/><Text style={styles.itemTitle}>Notificações Sonoras</Text></View><Switch value={settings.system.sound} onValueChange={(value: boolean) => setSettings((current: any) => ({ ...current, system: { ...current.system, sound: value } }))} trackColor={{ false: COLORS.border, true: '#FBE9E7' }} thumbColor={COLORS.primary} /></View>
            <View style={[styles.formGroupRow, { borderBottomWidth: 0, paddingBottom: 0, marginBottom: 0 }]}><View style={{flexDirection: 'row', alignItems: 'center', gap: 8}}><Moon size={16} color={COLORS.textMuted}/><Text style={styles.itemTitle}>Modo Escuro (Dark Mode)</Text></View><Switch value={settings.system.darkMode} onValueChange={(value: boolean) => setSettings((current: any) => ({ ...current, system: { ...current.system, darkMode: value } }))} trackColor={{ false: COLORS.border, true: '#EBE8E2' }} thumbColor={COLORS.grayLight} /></View>
          </View>
          <View style={styles.sectionCard}>
            <View style={styles.settingsHeader}><Lock color={COLORS.textMain} size={20} /><Text style={styles.sectionTitle}>Segurança</Text></View>
            <TouchableOpacity style={styles.actionBtnOutline} onPress={() => setPasswordModal(true)}><Text style={styles.actionBtnOutlineText}>Alterar Senha de Acesso</Text></TouchableOpacity>
            <TouchableOpacity style={[styles.actionBtnOutline, { marginTop: 12, borderColor: '#FFEBEE', backgroundColor: '#FFEBEE' }]} onPress={endOtherSessions}><Text style={[styles.actionBtnOutlineText, { color: '#D32F2F' }]}>Encerrar Outras Sessões</Text></TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        
        {/* MENU LATERAL */}
        <View style={styles.sidebar}>
          <View style={styles.sidebarHeader}>
            <View style={styles.logoRow}><View style={styles.logoIcon}><Flame color={COLORS.white} size={16} /></View><Text style={styles.logoText}>Fogo & Fumaça</Text></View>
            <View style={styles.badge}><Text style={styles.badgeText}>Administração</Text></View>
          </View>

          <ScrollView horizontal={!isLargeScreen} showsHorizontalScrollIndicator={false} showsVerticalScrollIndicator={false} style={styles.menuScroll} contentContainerStyle={styles.menuContent}>
            {MENU_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <TouchableOpacity key={item.id} style={[styles.menuItem, isActive && styles.menuItemActive]} onPress={() => setActiveTab(item.id)}>
                  <Icon color={isActive ? COLORS.white : COLORS.textMuted} size={20} />
                  <Text style={[styles.menuItemText, isActive && styles.menuItemTextActive]}>{item.id}</Text>
                  {isLargeScreen && isActive && <ChevronRight color={COLORS.white} size={16} style={{ marginLeft: 'auto' }} />}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
          <TouchableOpacity style={[styles.logoutButton, !isLargeScreen && { paddingVertical: 10, paddingHorizontal: 20 }]} onPress={() => { logout(); navigation.replace('loginView'); }}><LogOut color={COLORS.textMain} size={20} /><Text style={styles.logoutText}>Sair do sistema</Text></TouchableOpacity>
        </View>

        {/* ÁREA DE CONTEÚDO */}
        <ScrollView style={styles.mainContent} showsVerticalScrollIndicator={false}>
          {activeTab === 'Visão Geral' && renderVisaoGeral()}
          {activeTab === 'Pedidos' && renderPedidos()}
          {activeTab === 'Cardápio' && renderCardapio()}
          {activeTab === 'Categorias' && renderCategorias()}
          {activeTab === 'Mesas' && renderMesas()}
          {activeTab === 'Equipe' && renderEquipe()}
          {activeTab === 'Relatórios' && renderRelatorios()}
          {activeTab === 'Configurações' && renderConfiguracoes()}
        </ScrollView>
        <Modal visible={!!modalType} transparent animationType="slide" onRequestClose={closeForm}>
          <View style={styles.modalOverlay}><View style={styles.formModal}>
            <View style={styles.modalHeader}><Text style={styles.modalTitle}>{editingId ? 'Editar' : 'Novo'} {modalType === 'product' ? 'produto' : modalType === 'category' ? 'categoria' : modalType === 'table' ? 'mesa' : 'funcionário'}</Text><TouchableOpacity onPress={closeForm}><Text style={styles.modalClose}>×</Text></TouchableOpacity></View>
            {(modalType === 'product' || modalType === 'category' || modalType === 'staff') && <><Text style={styles.modalLabel}>Nome</Text><TextInput style={styles.modalInput} value={form.name} onChangeText={(value: string) => setForm(x => ({ ...x, name: value }))} placeholder="Digite o nome" placeholderTextColor={COLORS.textMuted}/></>}
            {modalType === 'table' && <><Text style={styles.modalLabel}>Número da mesa</Text><TextInput style={styles.modalInput} value={form.number} onChangeText={(value: string) => setForm(x => ({ ...x, number: value }))} placeholder="Ex.: 05" keyboardType="numeric" placeholderTextColor={COLORS.textMuted}/></>}
            {(modalType === 'product' || modalType === 'category') && <><Text style={styles.modalLabel}>Descrição</Text><TextInput style={styles.modalInput} value={form.description} onChangeText={(value: string) => setForm(x => ({ ...x, description: value }))} placeholder="Descrição" placeholderTextColor={COLORS.textMuted}/></>}
            {modalType === 'product' && <><Text style={styles.modalLabel}>Preço</Text><TextInput style={styles.modalInput} value={form.price} onChangeText={(value: string) => setForm(x => ({ ...x, price: value.replace(/[^0-9,\.]/g, '') }))} placeholder="Ex.: 32,90" keyboardType="decimal-pad" placeholderTextColor={COLORS.textMuted}/><TouchableOpacity style={styles.imagePickerButton} onPress={pickProductImage}><ProductImageIcon size={16} color={COLORS.textMain}/><Text style={styles.actionBtnOutlineText}>{form.image ? 'Trocar imagem' : 'Escolher imagem'}</Text></TouchableOpacity></>}
            {modalType === 'staff' && <><Text style={styles.modalLabel}>CPF</Text><TextInput style={styles.modalInput} value={form.cpf} onChangeText={(value: string) => setForm(x => ({ ...x, cpf: value }))} placeholder="000.000.000-00" keyboardType="numeric" placeholderTextColor={COLORS.textMuted}/><Text style={styles.modalLabel}>Telefone</Text><TextInput style={styles.modalInput} value={form.phone} onChangeText={(value: string) => setForm(x => ({ ...x, phone: value }))} placeholder="(00) 00000-0000" keyboardType="phone-pad" placeholderTextColor={COLORS.textMuted}/><Text style={styles.modalLabel}>Cargo</Text><TextInput style={styles.modalInput} value={form.role} onChangeText={(value: string) => setForm(x => ({ ...x, role: value }))} placeholder="Cargo" placeholderTextColor={COLORS.textMuted}/></>}
            <View style={styles.modalActions}><TouchableOpacity style={styles.modalCancel} onPress={closeForm}><Text>Cancelar</Text></TouchableOpacity><TouchableOpacity style={styles.modalSave} onPress={saveForm}><Text style={styles.modalSaveText}>Salvar</Text></TouchableOpacity></View>
          </View></View>
        </Modal>
        <Modal visible={!!detailOrder} transparent animationType="slide" onRequestClose={() => setDetailOrder(null)}>
          <View style={styles.modalOverlay}><View style={styles.formModal}>
            <View style={styles.modalHeader}><Text style={styles.modalTitle}>Detalhes do pedido</Text><TouchableOpacity onPress={() => setDetailOrder(null)}><Text style={styles.modalClose}>×</Text></TouchableOpacity></View>
            {detailOrder && <><Text style={styles.detailLabel}>Pedido</Text><Text style={styles.detailValue}>{detailOrder.id} • {detailOrder.type}</Text><Text style={styles.detailLabel}>Cliente / mesa</Text><Text style={styles.detailValue}>{detailOrder.customer}</Text><Text style={styles.detailLabel}>Itens</Text><Text style={styles.detailValue}>{detailOrder.items}</Text><Text style={styles.detailLabel}>Pagamento e total</Text><Text style={styles.detailValue}>{detailOrder.payment} • R$ {detailOrder.total}</Text><Text style={styles.detailLabel}>Histórico</Text><Text style={styles.detailValue}>Recebido às {detailOrder.time}{detailOrder.status !== 'Recebido' ? `\nStatus atual: ${detailOrder.status}` : ''}</Text><Text style={styles.detailLabel}>Observações</Text><Text style={styles.detailValue}>{detailOrder.notes || 'Nenhuma observação registrada para este pedido.'}</Text><TouchableOpacity style={styles.actionBtnOutline} onPress={() => Print.printAsync({ html: `<h1>Pedido ${detailOrder.id}</h1><p>${detailOrder.customer}</p><p>${detailOrder.items}</p><strong>R$ ${detailOrder.total}</strong>` })}><Receipt size={16} color={COLORS.textMain}/><Text style={styles.actionBtnOutlineText}>Imprimir pedido</Text></TouchableOpacity></>}
          </View></View>
        </Modal>
        <Modal visible={!!tableAction} transparent animationType="slide" onRequestClose={() => setTableAction(null)}>
          <View style={styles.modalOverlay}><View style={styles.formModal}>
            <View style={styles.modalHeader}><Text style={styles.modalTitle}>{tableAction?.type === 'receive' ? 'Receber pagamento' : tableAction?.type === 'close' ? 'Fechar conta' : tableAction?.type === 'manage' ? 'Gerenciar comanda' : 'Dividir conta'}</Text><TouchableOpacity onPress={() => setTableAction(null)}><Text style={styles.modalClose}>×</Text></TouchableOpacity></View>
            {tableAction && <><Text style={styles.detailValue}>Mesa {tableAction.table.number} • Total R$ {tableAction.table.consumption.total}</Text>{tableAction.type === 'manage' && <Text style={styles.detailValue}>Itens: {tableAction.table.consumption.items.join(', ') || 'Nenhum item'}</Text>}{tableAction.type === 'split' && <TextInput style={styles.modalInput} placeholder="Número de pessoas" keyboardType="numeric" placeholderTextColor={COLORS.textMuted}/>} {tableAction.type === 'receive' && <><Text style={styles.modalLabel}>Forma de pagamento</Text><View style={styles.paymentRow}>{['Pix', 'Cartão', 'Dinheiro'].map(method => <TouchableOpacity key={method} style={[styles.statusPill, paymentMethod === method && styles.statusPillActive]} onPress={() => setPaymentMethod(method)}><Text style={[styles.statusPillText, paymentMethod === method && styles.statusPillTextActive]}>{method}</Text></TouchableOpacity>)}</View><Text style={styles.modalLabel}>Valor recebido</Text><TextInput style={styles.modalInput} value={receivedAmount} onChangeText={value => setReceivedAmount(value.replace(/[^0-9,\.]/g, ''))} keyboardType="decimal-pad" placeholder="Ex.: 100,00" placeholderTextColor={COLORS.textMuted}/></>}<TouchableOpacity style={styles.modalSave} onPress={handleTableAction}><Text style={styles.modalSaveText}>{tableAction.type === 'receive' ? 'Confirmar recebimento' : tableAction.type === 'close' ? 'Fechar conta' : 'Confirmar'}</Text></TouchableOpacity></>}
          </View></View>
        </Modal>
        <Modal visible={passwordModal} transparent animationType="slide" onRequestClose={() => setPasswordModal(false)}>
          <View style={styles.modalOverlay}><View style={styles.formModal}><View style={styles.modalHeader}><Text style={styles.modalTitle}>Alterar senha</Text><TouchableOpacity onPress={() => setPasswordModal(false)}><Text style={styles.modalClose}>×</Text></TouchableOpacity></View><Text style={styles.modalLabel}>Senha atual</Text><TextInput style={styles.modalInput} secureTextEntry value={currentPassword} onChangeText={setCurrentPassword}/><Text style={styles.modalLabel}>Nova senha</Text><TextInput style={styles.modalInput} secureTextEntry value={newPassword} onChangeText={setNewPassword}/><TouchableOpacity style={styles.modalSave} onPress={changePassword}><Text style={styles.modalSaveText}>Atualizar senha</Text></TouchableOpacity></View></View>
        </Modal>
        <Modal visible={advancedFilterOpen} transparent animationType="slide" onRequestClose={() => setAdvancedFilterOpen(false)}>
          <View style={styles.modalOverlay}><View style={styles.formModal}><View style={styles.modalHeader}><Text style={styles.modalTitle}>Filtros avançados</Text><TouchableOpacity onPress={() => setAdvancedFilterOpen(false)}><Text style={styles.modalClose}>×</Text></TouchableOpacity></View><Text style={styles.modalLabel}>Preço mínimo (cardápio)</Text><TextInput style={styles.modalInput} value={advancedMinPrice} onChangeText={value => setAdvancedMinPrice(value.replace(/[^0-9,\.]/g, ''))} keyboardType="decimal-pad" placeholder="Ex.: 20,00" placeholderTextColor={COLORS.textMuted}/><Text style={styles.modalLabel}>Preço máximo (cardápio)</Text><TextInput style={styles.modalInput} value={advancedMaxPrice} onChangeText={value => setAdvancedMaxPrice(value.replace(/[^0-9,\.]/g, ''))} keyboardType="decimal-pad" placeholder="Ex.: 80,00" placeholderTextColor={COLORS.textMuted}/><Text style={styles.modalLabel}>Data inicial dos pedidos (AAAA-MM-DD)</Text><TextInput style={styles.modalInput} value={advancedFromDate} onChangeText={setAdvancedFromDate} placeholder="2026-09-01" placeholderTextColor={COLORS.textMuted}/><Text style={styles.modalLabel}>Data final dos pedidos (AAAA-MM-DD)</Text><TextInput style={styles.modalInput} value={advancedToDate} onChangeText={setAdvancedToDate} placeholder="2026-09-30" placeholderTextColor={COLORS.textMuted}/><View style={styles.modalActions}><TouchableOpacity style={styles.modalCancel} onPress={() => { setAdvancedMinPrice(''); setAdvancedMaxPrice(''); setAdvancedFromDate(''); setAdvancedToDate(''); }}><Text>Limpar</Text></TouchableOpacity><TouchableOpacity style={styles.modalSave} onPress={() => setAdvancedFilterOpen(false)}><Text style={styles.modalSaveText}>Aplicar filtros</Text></TouchableOpacity></View></View></View>
        </Modal>
      </View>
    </SafeAreaView>
  );
}

// ==========================================
// FUNÇÃO QUE GERA OS ESTILOS DINAMICAMENTE
// ==========================================
const getStyles = (isLargeScreen: boolean) => StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.background },
  container: { flex: 1, flexDirection: isLargeScreen ? 'row' : 'column' },
  
  sidebar: { width: isLargeScreen ? 280 : '100%', backgroundColor: COLORS.white, borderRightWidth: isLargeScreen ? 1 : 0, borderBottomWidth: isLargeScreen ? 0 : 1, borderColor: COLORS.border, paddingTop: 24, paddingBottom: isLargeScreen ? 24 : 0, justifyContent: 'space-between' },
  sidebarHeader: { paddingHorizontal: 20, marginBottom: 24, flexDirection: isLargeScreen ? 'column' : 'row', justifyContent: 'space-between', alignItems: isLargeScreen ? 'flex-start' : 'center' },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: isLargeScreen ? 12 : 0 },
  logoIcon: { backgroundColor: COLORS.primary, padding: 6, borderRadius: 6 },
  logoText: { fontSize: 18, fontWeight: '800', color: COLORS.textMain },
  badge: { borderWidth: 1, borderColor: COLORS.border, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  badgeText: { fontSize: 11, fontWeight: '700', color: COLORS.textMuted, textTransform: 'uppercase' },
  
  menuScroll: { flexGrow: 0 },
  menuContent: { paddingHorizontal: isLargeScreen ? 16 : 20, paddingBottom: isLargeScreen ? 20 : 16, gap: isLargeScreen ? 8 : 12 },
  menuItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 16, borderRadius: 12 },
  menuItemActive: { backgroundColor: COLORS.primary },
  menuItemText: { fontSize: 15, fontWeight: '600', color: COLORS.textMuted },
  menuItemTextActive: { color: COLORS.white },
  logoutButton: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 16, paddingHorizontal: 32, borderTopWidth: 1, borderTopColor: COLORS.border },
  logoutText: { fontSize: 15, fontWeight: '600', color: COLORS.textMain },

  mainContent: { flex: 1, backgroundColor: COLORS.background },
  contentArea: { padding: isLargeScreen ? 40 : 20, paddingBottom: 60 },
  pageTitle: { fontSize: 28, fontWeight: 'bold', color: COLORS.textMain, letterSpacing: -0.5, marginBottom: 4 },
  pageSubtitle: { fontSize: 15, color: COLORS.textMuted, marginBottom: 32 },
  
  sectionHeaderRow: { flexDirection: isLargeScreen ? 'row' : 'column', justifyContent: 'space-between', alignItems: isLargeScreen ? 'center' : 'flex-start', marginBottom: 24, gap: 16 },
  actionBtnPrimary: { backgroundColor: COLORS.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, paddingHorizontal: 20, borderRadius: 12 },
  actionBtnPrimaryText: { color: COLORS.white, fontSize: 14, fontWeight: 'bold' },
  actionBtnOutline: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 12, paddingHorizontal: 20, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, justifyContent: 'center' },
  actionBtnOutlineText: { fontSize: 14, fontWeight: '600', color: COLORS.textMain },
  
  // Grid
  splitGrid: { flexDirection: isLargeScreen ? 'row' : 'column', gap: 24 },
  sectionCard: { flex: 1, backgroundColor: COLORS.white, borderRadius: 16, padding: 24, borderWidth: 1, borderColor: '#EFECE7' },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.textMain },
  linkText: { fontSize: 14, fontWeight: '600', color: COLORS.primary },
  
  // Dashboard / KPIs
  kpiGrid: { flexDirection: isLargeScreen ? 'row' : 'column', gap: 16, marginBottom: 32 },
  kpiCard: { flex: 1, backgroundColor: COLORS.white, borderRadius: 16, padding: 20, borderWidth: 1, borderColor: '#EFECE7' },
  kpiHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  kpiLabel: { fontSize: 14, fontWeight: '600', color: COLORS.textMuted },
  iconBox: { backgroundColor: COLORS.grayLight, padding: 8, borderRadius: 8 },
  kpiRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  kpiValue: { fontSize: 28, fontWeight: 'bold', color: COLORS.textMain, letterSpacing: -0.5 },
  kpiBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.successLight, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, gap: 4 },
  kpiBadgeText: { color: COLORS.success, fontSize: 12, fontWeight: 'bold' },

  // Listas Gerais
  listContainer: { gap: 12 },
  listItemBase: { backgroundColor: COLORS.white, borderWidth: 1, borderColor: '#EFECE7', borderRadius: 12, padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  listItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: COLORS.grayLight },
  listInfo: { flex: 1 },
  listActions: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  noBorder: { borderBottomWidth: 0, paddingBottom: 0 },
  itemTitle: { fontSize: 15, fontWeight: 'bold', color: COLORS.textMain, marginBottom: 4 },
  itemSub: { fontSize: 13, color: COLORS.textMuted },
  itemValue: { fontSize: 15, fontWeight: 'bold', color: COLORS.textMain },
  iconButton: { padding: 8, backgroundColor: COLORS.grayLight, borderRadius: 8 },
  
  // Buscas e Filtros
  searchFilterRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  searchBar: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, paddingHorizontal: 12 },
  searchInput: { flex: 1, paddingVertical: 12, paddingHorizontal: 8, fontSize: 14, color: COLORS.textMain },
  filterButton: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12 },
  filterButtonText: { fontSize: 14, fontWeight: '600', color: COLORS.textMain },
  statusTabsWrapper: { marginBottom: 24, borderBottomWidth: 1, borderBottomColor: COLORS.grayLight, paddingBottom: 12 },
  statusTabsContainer: { gap: 8 },
  statusPill: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.border, flexDirection: 'row', alignItems: 'center' },
  statusPillActive: { backgroundColor: COLORS.dark, borderColor: COLORS.dark },
  statusPillText: { fontSize: 13, fontWeight: '600', color: COLORS.textMuted },
  statusPillTextActive: { color: COLORS.white },

  // Pedidos 
  orderAdminCard: { backgroundColor: COLORS.white, borderWidth: 1, borderColor: '#EFECE7', borderRadius: 12, padding: 16 },
  orderAdminHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: COLORS.grayLight },
  orderAdminIdBox: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  orderAdminId: { fontSize: 16, fontWeight: '900', color: COLORS.textMain },
  orderAdminBody: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  orderAdminCustomer: { fontSize: 15, fontWeight: 'bold', color: COLORS.textMain, marginBottom: 4 },
  orderAdminItems: { fontSize: 13, color: COLORS.textMuted, lineHeight: 18 },
  orderAdminTotal: { fontSize: 16, fontWeight: 'bold', color: COLORS.textMain, marginBottom: 4 },
  orderAdminTime: { fontSize: 12, color: COLORS.textMuted, fontWeight: '500' },
  orderAdminFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 12, borderTopWidth: 1, borderTopColor: COLORS.grayLight },
  orderAdminFooterRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  cancelButton: { padding: 4 },
  orderInfo: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  orderAvatar: { width: 40, height: 40, borderRadius: 8, backgroundColor: COLORS.background, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: COLORS.border },
  orderAvatarText: { fontSize: 13, fontWeight: 'bold', color: COLORS.textMain },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, backgroundColor: '#FFF9C4' },
  statusBadgeText: { fontSize: 12, fontWeight: 'bold', color: '#F57F17' },
  statusBadgeSuccess: { backgroundColor: COLORS.successLight },
  statusBadgeTextSuccess: { color: COLORS.success },

  // Cardápio & Categorias
  menuItemCard: { flexDirection: isLargeScreen ? 'row' : 'column', backgroundColor: COLORS.white, borderWidth: 1, borderColor: '#EFECE7', borderRadius: 16, padding: 16, gap: 16 },
  menuItemCardInactive: { opacity: 0.6, backgroundColor: '#FAFAFA' },
  menuItemImagePlaceholder: { width: isLargeScreen ? 80 : '100%', height: 80, backgroundColor: COLORS.grayLight, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  productImage: { width: '100%', height: '100%', borderRadius: 8 },
  imagePickerButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, padding: 10, marginTop: 10 },
  menuItemInfo: { flex: 1, justifyContent: 'space-between' },
  menuItemTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  highlightBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#FFF9C4', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  highlightBadgeText: { fontSize: 10, fontWeight: 'bold', color: '#F57F17', textTransform: 'uppercase' },
  menuItemDesc: { fontSize: 13, color: COLORS.textMuted, lineHeight: 18, marginBottom: 8 },
  menuItemFooter: { flexDirection: 'row', gap: 16, alignItems: 'center' },
  menuItemActions: { flexDirection: isLargeScreen ? 'row' : 'row-reverse', alignItems: 'center', justifyContent: 'space-between', gap: 16, borderTopWidth: isLargeScreen ? 0 : 1, borderTopColor: COLORS.grayLight, paddingTop: isLargeScreen ? 0 : 12 },
  switchWrapper: { alignItems: isLargeScreen ? 'center' : 'flex-start', gap: 4 },
  switchLabel: { fontSize: 11, fontWeight: '600', color: COLORS.textMuted },
  actionButtonsCol: { flexDirection: 'row', gap: 8 },
  countBadge: { backgroundColor: COLORS.grayLight, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12 },
  countBadgeText: { fontSize: 11, fontWeight: 'bold', color: COLORS.textMuted },

  // Mesas
  gridContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  gridCard: { width: isLargeScreen ? '31%' : '100%', backgroundColor: COLORS.white, borderWidth: 1, borderColor: '#EFECE7', borderRadius: 12, padding: 16 },
  gridCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  gridCardTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.textMain },
  secondaryButton: { marginTop: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, backgroundColor: COLORS.background, borderWidth: 1, borderColor: COLORS.border, borderRadius: 8 },
  secondaryButtonText: { fontSize: 13, fontWeight: '600', color: COLORS.textMain },
  tableBody: { minHeight: 120, justifyContent: 'center', marginBottom: 16 },
  tableEmptyState: { alignItems: 'center', justifyContent: 'center', gap: 8 },
  tableEmptyText: { fontSize: 13, color: COLORS.textMuted, fontWeight: '500' },
  tableWaiterRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
  tableWaiterText: { fontSize: 13, color: COLORS.textMuted },
  tableConsumptionBox: { backgroundColor: '#F9F9F9', padding: 12, borderRadius: 8, gap: 4, marginBottom: 12, borderWidth: 1, borderColor: '#F0F0F0' },
  tableItemText: { fontSize: 13, color: COLORS.textMuted },
  tableTotalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  tableTotalLabel: { fontSize: 14, fontWeight: '600', color: COLORS.textMain },
  tableTotalValue: { fontSize: 18, fontWeight: 'bold', color: COLORS.textMain },
  tableFooter: { borderTopWidth: 1, borderTopColor: COLORS.grayLight, paddingTop: 16 },
  tableActionRow: { flexDirection: 'row', gap: 8 },

  // Equipe
  staffCard: { backgroundColor: COLORS.white, borderWidth: 1, borderColor: '#EFECE7', borderRadius: 12, padding: 16 },
  staffHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  staffNameRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  staffAvatar: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  staffAvatarText: { fontSize: 18, fontWeight: 'bold' },
  staffDetailsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, marginBottom: 16, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: COLORS.grayLight },
  staffDetailItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  staffDetailText: { fontSize: 13, color: COLORS.textMuted },
  staffPermissionsBox: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FAFAFA', padding: 12, borderRadius: 8, marginBottom: 16, borderWidth: 1, borderColor: '#F0F0F0' },
  staffPermissionsText: { flex: 1, fontSize: 12, color: COLORS.textMuted, lineHeight: 16 },
  staffActions: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  roleBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  roleBadgeText: { fontSize: 12, fontWeight: 'bold' },

  // Relatórios
  reportHighlightBox: { backgroundColor: COLORS.dark, padding: 20, borderRadius: 12, marginTop: 8 },
  reportHighlightLabel: { color: COLORS.grayLight, fontSize: 14, marginBottom: 8 },
  reportHighlightValue: { color: COLORS.white, fontSize: 32, fontWeight: 'bold' },
  reportStatBox: { flex: 1, backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, padding: 16 },
  reportListItem: { marginBottom: 20 },
  reportListHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  reportListSub: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 },
  progressBarBg: { height: 8, backgroundColor: COLORS.grayLight, borderRadius: 4, overflow: 'hidden' },
  progressBarFill: { height: '100%', borderRadius: 4 },
  alertBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#FFEBEE', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  alertBadgeText: { fontSize: 10, fontWeight: 'bold', color: '#C62828' },
  chartBarContainer: { marginTop: 12 },
  multiBarWrapper: { flexDirection: 'row', height: 16, borderRadius: 8, overflow: 'hidden', marginBottom: 12 },
  multiBarSegment: { height: '100%' },
  multiBarLegend: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  legendText: { flexDirection: 'row', alignItems: 'center', fontSize: 12, color: COLORS.textMuted },
  legendDot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },

  // Configurações
  settingsHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 20, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: COLORS.grayLight },
  formGroupRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: COLORS.grayLight, marginBottom: 16 },
  inputLabel: { fontSize: 13, fontWeight: '600', color: COLORS.textMuted, marginBottom: 8 },
  input: { backgroundColor: COLORS.background, borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, padding: 14, fontSize: 15, color: COLORS.textMain, marginBottom: 20 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', padding: 20 },
  formModal: { backgroundColor: COLORS.white, borderRadius: 20, padding: 22, maxWidth: 520, width: '100%', alignSelf: 'center' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 },
  modalTitle: { fontSize: 20, fontWeight: '800', color: COLORS.textMain }, modalClose: { fontSize: 28, color: COLORS.textMuted },
  modalLabel: { fontSize: 12, fontWeight: '700', color: COLORS.textMain, marginBottom: 6, marginTop: 8 },
  modalInput: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, padding: 12, color: COLORS.textMain, fontSize: 15 },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 22 },
  modalCancel: { borderWidth: 1, borderColor: COLORS.border, paddingVertical: 12, paddingHorizontal: 18, borderRadius: 8 },
  modalSave: { backgroundColor: COLORS.primary, paddingVertical: 12, paddingHorizontal: 22, borderRadius: 8 }, modalSaveText: { color: COLORS.white, fontWeight: '800' }
  ,detailLabel: { fontSize: 12, fontWeight: '700', color: COLORS.textMuted, marginTop: 10 },
  detailValue: { fontSize: 15, color: COLORS.textMain, lineHeight: 22, marginTop: 3 },
  paymentRow: { flexDirection: 'row', gap: 8, marginBottom: 10 }
});
