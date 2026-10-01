import React, { useEffect, useRef, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
} from 'react-native';
import { Alert } from '../utils/alert';
import { 
  ShoppingBag, 
  Flame, 
  ArrowLeft, 
  BellRing 
  ,Heart
} from 'lucide-react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCart } from '../store/Cart';
import CartBar from '../components/cartBar';
import CartModal from '../components/cartModal';
import { useTableSession } from '../store/table-session';
import { useFavorites } from '../store/Favorites';
import { openCall, useCalls } from '../store/Calls';

type RootStackParamList = {
  homeView: undefined;
  cardapioView: { category: string; tableNumber?: string; orderType?: 'local' | 'delivery' | 'retirada' } | undefined;
  Checkout: { orderType?: 'local' | 'delivery' | 'retirada'; tableNumber?: string } | undefined;
};

type Props = Partial<NativeStackScreenProps<RootStackParamList, 'cardapioView'>>;

const COLORS = {
  background: '#F7F4F0',
  white: '#FFFFFF',
  dark: '#2A2421',
  primary: '#C84325',
  grayLight: '#EBE8E2',
  grayImageBg: '#E5E2DC',
  border: '#D1CEC7',
  textMain: '#1A1A1A',
  textMuted: '#7A7571',
};

export default function MenuScreen({ route, navigation }: Props) {
  const category = route?.params?.category || 'Churrasco';
  const [activeFilter, setActiveFilter] = useState('Todos');
  const { addToCart, cartCount } = useCart();
  const { tableNumber, sessionActive } = useTableSession();
  const { isFavorite, toggleFavorite } = useFavorites();
  const [isCartOpen, setIsCartOpen] = useState(false);
  const { pending: pendingCalls } = useCalls();
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<any>(null);

  useEffect(() => () => clearTimeout(toastTimer.current), []);

  // Aviso rápido que some sozinho (não bloqueia a tela como o Alert).
  const showToast = (message: string) => {
    clearTimeout(toastTimer.current);
    setToast(message);
    toastTimer.current = setTimeout(() => setToast(null), 2200);
  };

  const handleCallWaiter = () => {
    if (!sessionActive || !tableNumber) {
      Alert.alert('Escaneie a mesa', 'Para chamar o garçom, escaneie o QR Code da sua mesa na tela inicial.');
      return;
    }
    // As mesas do atendimento usam 2 dígitos (01, 02...).
    const table = String(tableNumber).padStart(2, '0');
    if (pendingCalls.some(call => call.table === table)) {
      showToast('O garçom já foi avisado e está a caminho.');
      return;
    }
    openCall(table, 'Solicitou atendimento');
    showToast(`Garçom chamado para a mesa ${table}.`);
  };

  const getFilters = () => {
    const cat = category.toLowerCase().trim();
    if (cat.includes('bebida')) return ['Todos', 'Sem álcool', 'Com álcool'];
    if (cat.includes('lanche')) return ['Todos', 'Hambúrgueres', 'Porções'];
    if (cat.includes('prato')) return ['Todos', 'Tradicional', 'Especiais'];
    if (cat.includes('porç')) return ['Todos', 'Petiscos', 'Fritas'];
    if (cat.includes('sobremesa')) return ['Todos', 'Doces', 'Gelados'];
    return ['Todos', 'Cortes', 'Espetinhos'];
  };

  const getProducts = () => {
    const cat = category.toLowerCase().trim();

    if (cat.includes('churrasco')) {
      return [
        { id: '1', title: 'Picanha na brasa', desc: '300g, sal de parrilla e farofa da casa', price: '54.00', icon: '🥩', badge: 'Mais pedido' },
        { id: '2', title: 'Costela fogo lento', desc: 'Macia, defumada por 8 horas', price: '48.00', icon: '🍖', badge: null },
        { id: '3', title: 'Linguiça campeira', desc: 'Acompanha pão de alho', price: '32.00', icon: '🌭', badge: null },
      ];
    }

    if (cat.includes('lanche')) {
      return [
        { id: '4', title: 'X-Burguer Artesanal', desc: 'Hambúrguer 180g, queijo cheddar e molho especial', price: '28.00', icon: '🍔', badge: 'Mais pedido' },
        { id: '5', title: 'Smash Bacon', desc: 'Dois discos de 90g, muito bacon e queijo prato', price: '32.00', icon: '🥓', badge: null },
      ];
    }

    if (cat.includes('prato')) {
      return [
        { id: '6', title: 'PF de Bife acebolado', desc: 'Arroz, feijão, bife de alcatra, batata frita e salada', price: '25.00', icon: '🍽️', badge: 'Popular' },
        { id: '7', title: 'PF de Frango Grelhado', desc: 'Arroz integral, feijão, filé de frango e legumes', price: '22.00', icon: '🥗', badge: null },
      ];
    }

    if (cat.includes('bebida')) {
      return [
        { id: '8', title: 'Refrigerante Lata', desc: '350ml - Coca-Cola, Guaraná ou Soda', price: '6.00', icon: '🥤', badge: null },
        { id: '9', title: 'Cerveja Artesanal IPA', desc: '500ml bem gelada', price: '18.00', icon: '🍺', badge: 'Recomendado' },
        { id: '10', title: 'Suco Natural de Laranja', desc: 'Copão de 500ml sem açúcar', price: '9.00', icon: '🍊', badge: null },
      ];
    }

    if (cat.includes('porç')) {
      return [
        { id: '11', title: 'Batata Frita Suprema', desc: '500g com molho de queijo e bacon', price: '26.00', icon: '🍟', badge: 'Mais pedido' },
        { id: '12', title: 'Mandioca Frita', desc: 'Crocante por fora e macia por dentro', price: '20.00', icon: '🧆', badge: null },
      ];
    }

    if (cat.includes('sobremesa')) {
      return [
        { id: '13', title: 'Pudim de Leite Condensado', desc: 'Fatia generosa com calda de caramelo', price: '12.00', icon: '🍮', badge: 'Favorito' },
        { id: '14', title: 'Petit Gâteau', desc: 'Acompanha uma bola de sorvete de baunilha', price: '18.00', icon: '🍨', badge: null },
      ];
    }

    return [];
  };

  // Subcategoria de cada produto, usada pelos botões de filtro.
  const KIND_BY_ID: Record<string, string> = {
    '1': 'Cortes', '2': 'Cortes', '3': 'Espetinhos',
    '4': 'Hambúrgueres', '5': 'Hambúrgueres',
    '6': 'Tradicional', '7': 'Especiais',
    '8': 'Sem álcool', '9': 'Com álcool', '10': 'Sem álcool',
    '11': 'Fritas', '12': 'Petiscos',
    '13': 'Doces', '14': 'Gelados',
  };

  const filters = getFilters();
  const products = getProducts();
  const visibleProducts = products.filter(
    item => activeFilter === 'Todos' || KIND_BY_ID[item.id] === activeFilter,
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Cabeçalho */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerButton} onPress={() => navigation?.goBack()}>
          <ArrowLeft color={COLORS.textMain} size={24} />
        </TouchableOpacity>
        
        <View style={styles.logoContainer}>
          <View style={styles.logoIcon}>
            <Flame color={COLORS.white} size={16} />
          </View>
          <Text style={styles.logoText}>Fogo & Fumaça</Text>
        </View>
        
        {/* Ao clicar no ícone do topo, abre o modal em vez de ir direto ao Checkout */}
        <TouchableOpacity 
          style={[styles.headerButton, styles.cartButton]} 
          onPress={() => setIsCartOpen(true)}>
          <ShoppingBag color={COLORS.white} size={20} />
          {cartCount > 0 && (
            <View style={styles.badgeCount}>
              <Text style={styles.badgeCountText}>{cartCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        
        <TouchableOpacity style={styles.backButton} onPress={() => navigation?.goBack()}>
          <ArrowLeft color={COLORS.textMuted} size={16} />
          <Text style={styles.backButtonText}>Todas as categorias</Text>
        </TouchableOpacity>

          <View style={styles.categoryHeaderRow}>
          <View>
            <Text style={styles.categoryOverline}>Cardápio</Text>
            <Text style={styles.categoryTitle}>{category}</Text>
          </View>
          <View style={styles.demoBadge}>
            <Text style={styles.demoBadgeText}>{sessionActive ? `Mesa ${tableNumber}` : 'Demonstração'}</Text>
          </View>
        </View>

        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false} 
          style={styles.filtersWrapper} 
          contentContainerStyle={styles.filtersContainer}>
          {filters.map((filter) => (
            <TouchableOpacity 
              key={filter} 
              style={[styles.filterPill, activeFilter === filter && styles.activeFilterPill]} 
              onPress={() => setActiveFilter(filter)}>
              <Text style={[styles.filterPillText, activeFilter === filter && styles.activeFilterPillText]}>
                {filter}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={styles.productList}>
          {visibleProducts.length === 0 && (
            <Text style={{ textAlign: 'center', color: COLORS.textMuted, paddingVertical: 24 }}>
              Nenhum item nesta seleção ainda.
            </Text>
          )}
          {visibleProducts.map((item) => (
            <View key={item.id} style={styles.productCard}>
              <View style={styles.productImageArea}>
                <Text style={styles.productEmoji}>{item.icon}</Text>
                <TouchableOpacity style={styles.favoriteButton} onPress={() => toggleFavorite({ id: item.id, name: item.title, description: item.desc, category, price: item.price })}>
                  <Heart size={18} color={isFavorite(item.id) ? '#C84325' : '#7A7571'} fill={isFavorite(item.id) ? '#C84325' : 'transparent'} />
                </TouchableOpacity>
                {item.badge && (
                  <View style={styles.productBadge}>
                    <Text style={styles.productBadgeText}>{item.badge}</Text>
                  </View>
                )}
              </View>

              <View style={styles.productInfoArea}>
                <Text style={styles.productTitle}>{item.title}</Text>
                <Text style={styles.productDesc}>{item.desc}</Text>
                
                <View style={styles.productFooter}>
                  <Text style={styles.productPrice}>
                    R$ {parseFloat(item.price).toFixed(2).replace('.', ',')}
                  </Text>
                  
                  <TouchableOpacity 
                    style={styles.addButton}
                    onPress={() => {
                      addToCart(item);
                      showToast(`${item.title} adicionado à sacola!`);
                    }}>
                    <Text style={styles.addButtonText}>+ Adicionar</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* 1. Barra Flutuante no Rodapé */}
      <CartBar onPress={() => setIsCartOpen(true)} />

      {/* 2. Modal do Carrinho */}
      <CartModal
        visible={isCartOpen}
        onClose={() => setIsCartOpen(false)}
          onCheckout={() => {
            setIsCartOpen(false);
            navigation?.navigate('Checkout', { orderType: sessionActive ? 'local' : route?.params?.orderType || 'local', tableNumber: sessionActive ? tableNumber || undefined : undefined });
          }}
      />

      {toast && (
        <View pointerEvents="none" style={styles.toast}>
          <Text style={styles.toastText}>{toast}</Text>
        </View>
      )}

      <TouchableOpacity style={styles.fab} activeOpacity={0.9} onPress={handleCallWaiter}>
        <BellRing color={COLORS.white} size={20} strokeWidth={2.5} />
        <Text style={styles.fabText}>Chamar garçom</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.background },
  toast: { position: 'absolute', top: 72, alignSelf: 'center', maxWidth: '90%', backgroundColor: COLORS.dark, paddingVertical: 10, paddingHorizontal: 18, borderRadius: 24, zIndex: 50, elevation: 6 },
  toastText: { color: COLORS.white, fontSize: 14, fontWeight: '600', textAlign: 'center' },
  scrollContent: { paddingBottom: 100 },
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingHorizontal: 20, 
    paddingTop: Platform.OS === 'android' ? 20 : 10, 
    paddingBottom: 15 
  },
  headerButton: { 
    width: 44, 
    height: 44, 
    backgroundColor: COLORS.grayLight, 
    borderRadius: 12, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  cartButton: { backgroundColor: COLORS.dark },
  badgeCount: { 
    position: 'absolute', 
    top: -5, 
    right: -5, 
    backgroundColor: COLORS.primary, 
    width: 20, 
    height: 20, 
    borderRadius: 10, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  badgeCountText: { color: '#FFF', fontSize: 10, fontWeight: 'bold' },
  logoContainer: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logoIcon: { backgroundColor: COLORS.primary, padding: 6, borderRadius: 8 },
  logoText: { fontSize: 16, fontWeight: '700', color: COLORS.textMain },
  backButton: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 20, marginBottom: 16 },
  backButtonText: { color: COLORS.textMuted, fontSize: 14, fontWeight: '500' },
  categoryHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingHorizontal: 20, marginBottom: 20 },
  categoryOverline: { fontSize: 12, color: COLORS.textMuted, marginBottom: 2 },
  categoryTitle: { fontSize: 24, fontWeight: 'bold', color: COLORS.textMain, letterSpacing: -0.5 },
  demoBadge: { borderWidth: 1, borderColor: COLORS.border, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
  demoBadgeText: { fontSize: 11, fontWeight: '700', color: COLORS.textMain },
  filtersWrapper: { marginBottom: 24 },
  filtersContainer: { paddingHorizontal: 20, gap: 12 },
  filterPill: { paddingVertical: 8, paddingHorizontal: 20, borderRadius: 20, backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.border },
  activeFilterPill: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  filterPillText: { fontSize: 14, fontWeight: '600', color: COLORS.textMuted },
  activeFilterPillText: { color: COLORS.white },
  productList: { paddingHorizontal: 20, gap: 16 },
  productCard: { backgroundColor: COLORS.white, borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: '#EFECE7', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 5, elevation: 2 },
  productImageArea: { backgroundColor: COLORS.grayImageBg, height: 110, padding: 16, justifyContent: 'center', position: 'relative' },
  favoriteButton: { position: 'absolute', right: 10, top: 10, width: 34, height: 34, borderRadius: 17, backgroundColor: COLORS.white, justifyContent: 'center', alignItems: 'center' },
  productEmoji: { fontSize: 48 },
  productBadge: { position: 'absolute', top: 16, right: 16, backgroundColor: '#AD381D', paddingVertical: 4, paddingHorizontal: 8, borderRadius: 4 },
  productBadgeText: { color: COLORS.white, fontSize: 11, fontWeight: 'bold' },
  productInfoArea: { padding: 16 },
  productTitle: { fontSize: 16, fontWeight: 'bold', color: COLORS.textMain, marginBottom: 6 },
  productDesc: { fontSize: 13, color: COLORS.textMuted, lineHeight: 18, marginBottom: 16 },
  productFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  productPrice: { fontSize: 16, fontWeight: 'bold', color: COLORS.textMain },
  addButton: { backgroundColor: COLORS.primary, paddingVertical: 8, paddingHorizontal: 14, borderRadius: 6 },
  addButtonText: { color: COLORS.white, fontSize: 14, fontWeight: '700' },
  fab: { position: 'absolute', bottom: 24, right: 20, backgroundColor: COLORS.primary, flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 20, borderRadius: 30, gap: 10, shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 8 },
  fabText: { color: COLORS.white, fontSize: 15, fontWeight: '700' }
});
