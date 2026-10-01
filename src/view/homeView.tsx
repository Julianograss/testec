import React, { useEffect, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Pressable,
  ScrollView,
  View,
  Text,
  StyleSheet,
  ImageBackground,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Alert } from '../utils/alert';
import {
  Utensils,
  ChefHat,
  Coffee,
  Dessert,
  ScanLine,
  MapPin,
  Bike,
  ChevronRight,
  Info,
  Menu,
  X,
  Heart,
  History,
  User,
  LogOut,
  LucideIcon,
} from 'lucide-react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import Scanner from './scannerView';
import { SideMenu } from '../components/sideMenu';
import { useTableSession } from '../store/table-session';
import { getTableNumberFromLink } from '../utils/tableLinks';
import { useAuth } from '../controller/AuthController';
import { getOrdersForUser, useOrders } from '../store/Orders';
import { useFavorites } from '../store/Favorites';

type RootStackParamList = {
  homeView: undefined;
  cardapioView: { category: string; tableNumber?: string; orderType?: 'local' | 'delivery' | 'retirada' };
  loginView: undefined; // <-- Adicione esta linha
};

type Props = NativeStackScreenProps<RootStackParamList, 'homeView'>;

interface Category {
  title: string;
  subtitle: string;
  icon: LucideIcon;
  imageUrl: string;
}

interface MenuConfig {
  eyebrow: string;
  title: string;
  description: string;
  categories: Category[];
}

const menuByService: Record<'local' | 'entrega', MenuConfig> = {
  local: {
    eyebrow: 'Atendimento no restaurante',
    title: 'Escolha para a sua mesa',
    description: 'Navegue pelo cardápio e faça seu pedido quando estiver pronto.',
    categories: [
      {
        title: 'Churrasco',
        subtitle: 'Receitas para o almoço e jantar',
        icon: Utensils,
        imageUrl: 'https://img.magnific.com/fotos-premium/churrasco-tradicional-brasileiro-perto-do-fogo_70216-3339.jpg?semt=ais_hybrid&w=740&q=80',
      },
      {
        title: 'Lanches',
        subtitle: 'Para dividir ou matar a fome',
        icon: ChefHat,
        imageUrl: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&q=80',
      },
      {
        title: 'Prato Feito',
        subtitle: 'Receitas para o almoço e jantar',
        icon: Utensils,
        imageUrl: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&q=80',
      },
      {
        title: 'Bebidas',
        subtitle: 'Geladas, quentes e sem álcool',
        icon: Coffee,
        imageUrl: 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=600&q=80',
      },
      {
        title: 'Porções',
        subtitle: 'Para dividir ou matar a fome',
        icon: ChefHat,
        imageUrl: 'https://img.magnific.com/fotos-gratis/batatas-fritas-douradas-em-uma-cesta-de-vime-com-fundo-bokeh_84443-86965.jpg?semt=ais_hybrid&w=740&q=80',
      },
      {
        title: 'Sobremesas',
        subtitle: 'Um final doce para a refeição',
        icon: Dessert,
        imageUrl: 'https://cdn.pixabay.com/photo/2016/06/12/15/03/cupcakes-1452178_1280.jpg',
      },
    ],
  },
  entrega: {
    eyebrow: 'Entrega onde você estiver',
    title: 'Peça sem sair de casa',
    description: 'Veja as opções preparadas para viagem e receba com praticidade.',
    categories: [
      {
        title: 'Pratos feitos',
        subtitle: 'Refeições completas para hoje',
        icon: Utensils,
        imageUrl: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&q=80',
      },
      {
        title: 'Lanches',
        subtitle: 'Favoritos para pedir agora',
        icon: ChefHat,
        imageUrl: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&q=80',
      },
      {
        title: 'Bebidas',
        subtitle: 'Para acompanhar seu pedido',
        icon: Coffee,
        imageUrl: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=600&q=80',
      },
      {
        title: 'Porções',
        subtitle: 'Boas para compartilhar',
        icon: Dessert,
        imageUrl: 'https://images.unsplash.com/photo-1541592106381-b31e9677c0e5?w=600&q=80',
      },
    ],
  },
};

export default function HomeScreen({ navigation, route }: Partial<Props> & { route?: any }) {
  const [serviceMode, setServiceMode] = useState<'local' | 'entrega'>('local');
  const [showScanner, setShowScanner] = useState(false);
  const [scannedResult, setScannedResult] = useState<string | null>(null);
  
  // Estado para controlar a abertura/fechamento do menu lateral
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { tableNumber, sessionActive, openTableSession, closeTableSession } = useTableSession();
  const { user, logout, updateProfile, changePassword } = useAuth();
  const { orders } = useOrders();
  const { favorites, toggleFavorite } = useFavorites();
  const [accountSection, setAccountSection] = useState<'history' | 'favorites' | 'account' | null>(null);
  const [accountForm, setAccountForm] = useState({ name: '', email: '', address: '', currentPassword: '', newPassword: '' });

  useEffect(() => {
    if (user) setAccountForm(current => ({ ...current, name: user.name, email: user.email, address: user.address || '' }));
  }, [user]);

  useEffect(() => {
    const routeTable = route?.params?.tableNumber;
    if (routeTable) {
      openTableSession(String(routeTable), 'qr');
      setScannedResult(String(routeTable));
      setServiceMode('local');
    }
  }, [route?.params?.tableNumber]);

  const menu = menuByService[serviceMode];

  const handleMenuNavigation = (destination: 'history' | 'favorites' | 'account') => {
    setIsMenuOpen(false);
    if (!user) return navigation?.navigate('loginView');
    setAccountSection(destination);
  };

  const handleSignIn = () => {
    setIsMenuOpen(false);
    navigation?.navigate('loginView');
  };

  const userOrders = getOrdersForUser(user);
  const saveAccount = async () => {
    if (!accountForm.name.trim() || !accountForm.email.includes('@')) return Alert.alert('Dados inválidos', 'Informe nome e e-mail válidos.');
    try { await updateProfile({ name: accountForm.name.trim(), email: accountForm.email.trim(), address: accountForm.address.trim() }); Alert.alert('Conta atualizada', 'Seus dados foram salvos.'); }
    catch (error: any) { Alert.alert('Não foi possível salvar', error?.message || 'Tente novamente.'); }
  };
  const saveNewPassword = async () => {
    try { await changePassword(accountForm.currentPassword, accountForm.newPassword); setAccountForm(current => ({ ...current, currentPassword: '', newPassword: '' })); Alert.alert('Senha alterada', 'Sua nova senha foi salva.'); }
    catch (error: any) { Alert.alert('Não foi possível alterar', error?.message || 'Tente novamente.'); }
  };

  const handleScanSuccess = (data: string) => {
    setShowScanner(false);
    const table = getTableNumberFromLink(data);
    if (!table) {
      Alert.alert('QR Code inválido', 'Use um QR Code no formato https://seu-projeto.vercel.app/mesa/12.');
      return;
    }
    openTableSession(table, 'qr');
    setScannedResult(table);
    setServiceMode('local');
    Alert.alert('Mesa identificada', `Pedido vinculado à mesa ${table}. Delivery foi bloqueado.`);
  };

  const handleScannerOpen = () => {
    setShowScanner(true);
  };

  const handleLeaveTable = () => {
    Alert.alert('Sair da mesa', 'Deseja desvincular este atendimento da mesa? Novos pedidos deixarão de ser enviados para ela.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Sair da mesa',
        style: 'destructive',
        onPress: () => {
          closeTableSession();
          setScannedResult(null);
        },
      },
    ]);
  };

  const displayTable = tableNumber || scannedResult;
  const displayTablePadded = displayTable ? String(displayTable).padStart(2, '0') : null;

  const handleCategory = (categoryTitle: string) => {
    navigation?.navigate('cardapioView', { category: categoryTitle, tableNumber: tableNumber || undefined, orderType: sessionActive ? 'local' : serviceMode === 'entrega' ? 'delivery' : 'local' });
  };

  if (showScanner) {
    return (
      <Scanner
        onCodeRead={handleScanSuccess}
        onClose={() => setShowScanner(false)}
      />
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          <View style={styles.header}>
            <Pressable style={styles.menuButton} onPress={() => setIsMenuOpen(true)}>
              <Menu size={22} color="#ffffff" />
            </Pressable>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.brandTitle}>Cardápio Nativo</Text>
              <Text style={styles.brandSubtitle}>Seu pedido, do seu jeito</Text>
            </View>
          </View>

          <View style={styles.qrCard}>
            <View style={styles.qrCardContent}>
              <View style={{ flex: 1 }}>
                <Text style={styles.qrTag}>COMECE POR AQUI</Text>
                <Text style={styles.qrTitle}>
                  {displayTablePadded ? `Mesa: ${displayTablePadded}` : 'Escaneie sua mesa'}
                </Text>
                <Text style={styles.qrSub}>
                  {displayTablePadded
                    ? 'Seu atendimento já está personalizado para este local.'
                    : 'Use o QR code da mesa para personalizar seu atendimento.'}
                </Text>
                {displayTablePadded ? (
                  <Pressable onPress={handleLeaveTable} style={{ marginTop: 6 }}>
                    <Text style={styles.qrLeaveLink}>Sair da mesa</Text>
                  </Pressable>
                ) : null}
              </View>
              <Pressable style={styles.qrButton} onPress={handleScannerOpen}>
                <ScanLine size={28} color="#ffffff" />
              </Pressable>
            </View>
          </View>
        </View>

        <View style={styles.tabsContainer}>
          <View style={styles.tabsWrapper}>
            <Pressable
              style={[styles.tab, serviceMode === 'local' && styles.activeTab]}
              onPress={() => setServiceMode('local')}>
              <View style={styles.tabContent}>
                <MapPin
                  size={16}
                  color={serviceMode === 'local' ? '#6344FF' : '#71717a'}
                />
                <Text
                  style={[
                    styles.tabText,
                    serviceMode === 'local' && styles.activeTabText,
                  ]}>
                  No local
                </Text>
              </View>
            </Pressable>

            <Pressable
              style={[styles.tab, serviceMode === 'entrega' && styles.activeTab, sessionActive && styles.disabledTab]}
              disabled={sessionActive}
              onPress={() => {
                if (sessionActive) return Alert.alert('Delivery indisponível', `O QR Code da mesa ${displayTablePadded} está ativo.`);
                setServiceMode('entrega');
              }}>
              <View style={styles.tabContent}>
                <Bike
                  size={16}
                  color={sessionActive ? '#B8B3AD' : serviceMode === 'entrega' ? '#6344FF' : '#71717a'}
                />
                <Text
                  style={[
                    styles.tabText,
                    serviceMode === 'entrega' && styles.activeTabText,
                    sessionActive && styles.disabledTabText,
                  ]}>
                  Entrega
                </Text>
              </View>
            </Pressable>
          </View>
        </View>

        <View style={styles.content}>
          <View style={styles.sectionHeader}>
            <View style={styles.dot} />
            <Text style={styles.eyebrow}>{menu.eyebrow}</Text>
          </View>
          <Text style={styles.sectionTitle}>{menu.title}</Text>
          <Text style={styles.sectionSub}>{menu.description}</Text>

          <View style={styles.categoryList}>
            {menu.categories.map((category) => {
              const IconComponent = category.icon;
              return (
                <Pressable
                  key={category.title}
                  style={styles.categoryCardContainer}
                  onPress={() => handleCategory(category.title)}>
                  <ImageBackground
                    source={{ uri: category.imageUrl }}
                    style={styles.categoryBackgroundImage}
                    imageStyle={{ borderRadius: 16 }}>
                    <View style={styles.categoryOverlay}>
                      <View style={styles.categoryIconBg}>
                        <IconComponent size={20} color="#6344FF" />
                      </View>
                      <View style={{ flex: 1, marginLeft: 16 }}>
                        <Text style={styles.categoryTitle}>{category.title}</Text>
                        <Text style={styles.categorySub}>{category.subtitle}</Text>
                      </View>
                      <ChevronRight size={20} color="#ffffff" />
                    </View>
                  </ImageBackground>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.infoBox}>
            <Info size={20} color="#6344FF" />
            <Text style={styles.infoText}>
              {displayTablePadded
                ? `Pedidos feitos agora vão direto para a Mesa ${displayTablePadded}.`
                : 'Escaneie o QR Code da sua mesa para vincular o pedido a ela, ou peça para retirada/entrega.'}
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Componente do Menu Lateral */}
      <SideMenu
        open={isMenuOpen}
        onClose={() => setIsMenuOpen(false)}
        onNavigate={(destination) => {
          handleMenuNavigation(destination);
        }}
        onSignIn={() => {
          setIsMenuOpen(false);
          navigation?.navigate('loginView');
        }}
        onSignOut={() => {
          setIsMenuOpen(false);
          logout();
          Alert.alert('Sessão encerrada', 'Você saiu da sua conta.');
        }}
        user={user}
      />
      <Modal visible={!!accountSection} transparent animationType="slide" onRequestClose={() => setAccountSection(null)}>
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalKeyboard}>
            <View style={styles.accountModal}>
              <View style={styles.modalHeader}><Text style={styles.modalTitle}>{accountSection === 'history' ? 'Histórico de pedidos' : accountSection === 'favorites' ? 'Meus favoritos' : 'Minha conta'}</Text><Pressable onPress={() => setAccountSection(null)}><X size={22} color="#71717a" /></Pressable></View>
              {accountSection === 'history' && <ScrollView style={styles.modalScroll}>{!user ? <Text style={styles.emptyText}>Entre na conta para visualizar seu histórico.</Text> : userOrders.length === 0 ? <Text style={styles.emptyText}>Você ainda não realizou pedidos.</Text> : userOrders.slice().reverse().map(order => <View key={order.id} style={styles.historyCard}><View style={styles.historyTop}><Text style={styles.historyId}>Pedido #{order.id}</Text><Text style={styles.historyStatus}>{order.status}</Text></View><Text style={styles.historyInfo}>{new Date(order.createdAt).toLocaleDateString('pt-BR')} às {order.time}</Text><Text style={styles.historyInfo}>{order.items || 'Itens do pedido'}</Text><Text style={styles.historyTotal}>R$ {order.total}</Text></View>)}</ScrollView>}
              {accountSection === 'favorites' && <ScrollView style={styles.modalScroll}>{favorites.length === 0 ? <Text style={styles.emptyText}>Nenhum favorito ainda. Toque no coração dos produtos para salvar.</Text> : favorites.map(item => <View key={item.id} style={styles.favoriteRow}><View style={{ flex: 1 }}><Text style={styles.favoriteName}>{item.name}</Text><Text style={styles.historyInfo}>{item.category} • R$ {item.price}</Text></View><Pressable onPress={() => toggleFavorite(item)}><Heart size={20} color="#C84325" fill="#C84325" /></Pressable></View>)}</ScrollView>}
              {accountSection === 'account' && <ScrollView style={styles.modalScroll}><Text style={styles.fieldLabel}>Nome</Text><TextInput style={styles.accountInput} value={accountForm.name} onChangeText={value => setAccountForm(current => ({ ...current, name: value }))} /><Text style={styles.fieldLabel}>E-mail / login</Text><TextInput style={styles.accountInput} autoCapitalize="none" keyboardType="email-address" value={accountForm.email} onChangeText={value => setAccountForm(current => ({ ...current, email: value }))} /><Text style={styles.fieldLabel}>Endereço de entrega</Text><TextInput style={[styles.accountInput, { minHeight: 72 }]} multiline value={accountForm.address} onChangeText={value => setAccountForm(current => ({ ...current, address: value }))} placeholder="Informe seu endereço" placeholderTextColor="#a1a1aa" /><Pressable style={styles.primaryAccountButton} onPress={saveAccount}><Text style={styles.primaryAccountText}>Salvar dados da conta</Text></Pressable><Text style={styles.securityTitle}>Alterar senha</Text><Text style={styles.fieldLabel}>Senha atual</Text><TextInput style={styles.accountInput} secureTextEntry value={accountForm.currentPassword} onChangeText={value => setAccountForm(current => ({ ...current, currentPassword: value }))} /><Text style={styles.fieldLabel}>Nova senha</Text><TextInput style={styles.accountInput} secureTextEntry value={accountForm.newPassword} onChangeText={value => setAccountForm(current => ({ ...current, newPassword: value }))} /><Pressable style={styles.outlineAccountButton} onPress={saveNewPassword}><Text style={styles.outlineAccountText}>Alterar senha</Text></Pressable><Text style={styles.passwordHint}>Por segurança, a senha nunca é exibida na tela; ela aparece mascarada e pode ser alterada informando a senha atual.</Text></ScrollView>}
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modalKeyboard: { width: '100%' },
  accountModal: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '88%', padding: 22 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 },
  modalTitle: { fontSize: 21, fontWeight: '800', color: '#1A1A1A' },
  modalScroll: { maxHeight: 560 },
  emptyText: { textAlign: 'center', color: '#7A7571', paddingVertical: 36, lineHeight: 22 },
  historyCard: { borderWidth: 1, borderColor: '#E0DDD6', borderRadius: 12, padding: 14, marginBottom: 10 },
  historyTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 7 },
  historyId: { fontWeight: '800', color: '#1A1A1A' },
  historyStatus: { color: '#2E7D32', fontWeight: '700', fontSize: 12 },
  historyInfo: { color: '#7A7571', fontSize: 13, marginTop: 4 },
  historyTotal: { color: '#C84325', fontSize: 16, fontWeight: '800', marginTop: 8 },
  favoriteRow: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#F0EEEA', paddingVertical: 14 },
  favoriteName: { color: '#1A1A1A', fontSize: 15, fontWeight: '700' },
  fieldLabel: { color: '#7A7571', fontWeight: '700', fontSize: 12, marginBottom: 6, marginTop: 10 },
  accountInput: { borderWidth: 1, borderColor: '#D1CEC7', borderRadius: 10, padding: 12, fontSize: 15, color: '#1A1A1A' },
  primaryAccountButton: { backgroundColor: '#C84325', padding: 14, borderRadius: 10, alignItems: 'center', marginTop: 16 },
  primaryAccountText: { color: '#fff', fontWeight: '800' },
  securityTitle: { color: '#1A1A1A', fontWeight: '800', fontSize: 17, marginTop: 25, marginBottom: 4 },
  outlineAccountButton: { borderWidth: 1, borderColor: '#D1CEC7', padding: 14, borderRadius: 10, alignItems: 'center', marginTop: 16 },
  outlineAccountText: { color: '#1A1A1A', fontWeight: '800' },
  passwordHint: { color: '#7A7571', fontSize: 12, lineHeight: 18, marginTop: 12, marginBottom: 20 },
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  scrollContent: {
    paddingBottom: 40,
  },
  content: {
    width: '100%',
    maxWidth: 600,
    alignSelf: 'center',
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  menuButton: {
    height: 44,
    width: 44,
    borderRadius: 16,
    backgroundColor: '#6344FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  brandTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#71717a',
  },
  brandSubtitle: {
    fontSize: 12,
    color: '#a1a1aa',
    marginTop: 2,
  },
  qrCard: {
    marginTop: 20,
    borderRadius: 24,
    backgroundColor: '#F8F7FF',
    padding: 20,
  },
  qrCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
  },
  qrTag: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6344FF',
  },
  qrTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#09090b',
    marginTop: 6,
  },
  qrSub: {
    fontSize: 13,
    color: '#71717a',
    marginTop: 6,
    lineHeight: 18,
  },
  qrLeaveLink: {
    fontSize: 12,
    color: '#C84325',
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
  qrButton: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: '#6344FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabsContainer: {
    marginTop: 28,
    borderBottomWidth: 1,
    borderBottomColor: '#e4e4e7',
  },
  tabsWrapper: {
    width: '100%',
    maxWidth: 600,
    alignSelf: 'center',
    flexDirection: 'row',
    paddingHorizontal: 20,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#6344FF',
  },
  disabledTab: {
    opacity: 0.55,
  },
  tabContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  tabText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#71717a',
  },
  activeTabText: {
    color: '#09090b',
    fontWeight: '700',
  },
  disabledTabText: {
    color: '#B8B3AD',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 16,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#6344FF',
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: '600',
    color: '#71717a',
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#09090b',
    marginTop: 8,
  },
  sectionSub: {
    fontSize: 14,
    color: '#71717a',
    marginTop: 6,
    lineHeight: 20,
  },
  categoryList: {
    marginTop: 24,
    gap: 12,
  },
  categoryCardContainer: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  categoryBackgroundImage: {
    width: '100%',
  },
  categoryOverlay: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    padding: 16,
    borderRadius: 16,
  },
  categoryIconBg: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
  },
  categorySub: {
    fontSize: 12,
    color: '#e4e4e7',
    marginTop: 2,
  },
  infoBox: {
    marginTop: 28,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    backgroundColor: '#F8F7FF',
    padding: 16,
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    color: '#27272a',
    lineHeight: 18,
  },
});
