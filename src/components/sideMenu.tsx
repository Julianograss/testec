import React, { useEffect, useRef } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Animated,
  Dimensions,
  Easing,
  StatusBar,
} from 'react-native';
import {
  X,
  History,
  Heart,
  User,
  LogIn,
  LogOut,
  ChevronRight,
} from 'lucide-react-native';

// Obtém a largura da tela para calcular a largura do menu (ex: 75% da tela)
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const MENU_WIDTH = SCREEN_WIDTH * 0.75; // Menu ocupará 75% da largura da tela

interface SideMenuProps {
  open: boolean;
  onClose: () => void;
  onNavigate: (destination: 'history' | 'favorites' | 'account') => void;
  onSignIn: () => void;
  onSignOut: () => void;
  user?: { name: string; email: string } | null;
}

export function SideMenu({
  open,
  onClose,
  onNavigate,
  onSignIn,
  onSignOut,
  user,
}: SideMenuProps) {
  // 1. Criar o valor da animação (começa fora da tela à esquerda, -MENU_WIDTH)
  const translateX = useRef(new Animated.Value(-MENU_WIDTH)).current;
  // Valor para o fundo preto transparente (começa em 0, transparente)
  const overlayOpacity = useRef(new Animated.Value(0)).current;

  // 2. Controlar a animação quando a prop 'open' mudar
  useEffect(() => {
    Animated.parallel([
      Animated.timing(translateX, {
        toValue: open ? 0 : -MENU_WIDTH, // Vai para 0 (aparece) ou -MENU_WIDTH (some)
        duration: 300,
        easing: Easing.out(Easing.quad), // Suavidade na entrada/saída
        useNativeDriver: true, // Importante para performance
      }),
      Animated.timing(overlayOpacity, {
        toValue: open ? 1 : 0, // Opacidade total ou transparente
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  }, [open]);

  // Se o menu estiver fechado e a animação já tiver acabado, não renderizar o overlay
  // Mas para garantir que a animação de saída ocorra, só verificamos o 'open' para renderizar
  // os componentes. Para fechar, a animação move o menu para fora antes de sumir.

  // Renderizamos sempre, mas usamos pointerEvents para desativar o toque no overlay
  // quando estiver fechado, prevenindo que o overlay invisível bloqueie a Home.
  return (
    <View style={styles.root} pointerEvents={open ? 'auto' : 'none'}>
      {/* 3. O Fundo escurecido e clicável */}
      <Animated.View
        style={[
          styles.overlay,
          {
            opacity: overlayOpacity, // Controlado pela animação
          },
        ]}>
        {/* Clicar no fundo fecha o menu */}
        <Pressable style={styles.pressableOverlay} onPress={onClose} />
      </Animated.View>

      {/* 4. O Painel  SafeAreaView, do Menu Animado */}
      <Animated.View
        style={[
          styles.menuContainer,
          {
            transform: [{ translateX }], // A propriedade mágica da animação
          },
        ]}>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.header}>
            <Text style={styles.title}>Menu</Text>
            <Pressable style={styles.closeButton} onPress={onClose}>
              <X size={22} color="#09090b" />
            </Pressable>
          </View>

          <View style={styles.userSection}>
            {user ? (
              <View>
                <Text style={styles.userName}>{user.name}</Text>
                <Text style={styles.userEmail}>{user.email}</Text>
              </View>
            ) : (
              <Pressable style={styles.loginButton} onPress={onSignIn}>
                <LogIn size={20} color="#ffffff" />
                <Text style={styles.loginButtonText}>Entrar na conta</Text>
              </Pressable>
            )}
          </View>

          <View style={styles.menuItems}>
            <Pressable
              style={styles.menuItem}
              onPress={() => onNavigate('history')}>
              <View style={styles.menuItemLeft}>
                <History size={20} color="#71717a" />
                <Text style={styles.menuItemText}>Histórico de Pedidos</Text>
              </View>
              <ChevronRight size={18} color="#a1a1aa" />
            </Pressable>

            <Pressable
              style={styles.menuItem}
              onPress={() => onNavigate('favorites')}>
              <View style={styles.menuItemLeft}>
                <Heart size={20} color="#71717a" />
                <Text style={styles.menuItemText}>Meus Favoritos</Text>
              </View>
              <ChevronRight size={18} color="#a1a1aa" />
            </Pressable>

            <Pressable
              style={styles.menuItem}
              onPress={() => onNavigate('account')}>
              <View style={styles.menuItemLeft}>
                <User size={20} color="#71717a" />
                <Text style={styles.menuItemText}>Minha Conta</Text>
              </View>
              <ChevronRight size={18} color="#a1a1aa" />
            </Pressable>
          </View>

          {user && (
            <Pressable style={styles.signOutButton} onPress={onSignOut}>
              <LogOut size={20} color="#ef4444" />
              <Text style={styles.signOutText}>Sair da conta</Text>
            </Pressable>
          )}
        </SafeAreaView>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  // Root view que cobre toda a tela para conter o overlay e o menu
  root: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    // Opcional: Garante que fique acima de tudo
    zIndex: 1000,
    // Corrigir SafeAreaView em Android com StatusBar
    marginTop: StatusBar.currentHeight,
  },
  // Fundo escuro transparente que ocupa a tela toda
  overlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  // Área clicável do overlay para fechar
  pressableOverlay: {
    flex: 1,
  },
  // O painel do menu em si, animado
  menuContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: MENU_WIDTH, // Definido anteriormente (ex: 75%)
    height: '100%',
    backgroundColor: '#ffffff',
    elevation: 8, // Sombra no Android
    shadowColor: '#000', // Sombra no iOS
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
  },
  safeArea: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 10, // Ajuste para SafeAreaView
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f4f4f5',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#09090b',
  },
  closeButton: {
    padding: 8,
  },
  userSection: {
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f4f4f5',
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#09090b',
  },
  userEmail: {
    fontSize: 14,
    color: '#71717a',
    marginTop: 2,
  },
  loginButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#6344FF',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    gap: 8,
  },
  loginButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  menuItems: {
    marginTop: 10,
    gap: 4,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#fafafa',
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  menuItemText: {
    fontSize: 15,
    color: '#27272a',
    fontWeight: '500',
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 'auto',
    marginBottom: 30,
    paddingVertical: 12,
  },
  signOutText: {
    color: '#ef4444',
    fontSize: 15,
    fontWeight: '600',
  },
});