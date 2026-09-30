import React from 'react';
import { NavigationContainer, LinkingOptions } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AuthProvider } from './src/controller/AuthController';
import { CartProvider } from './src/store/Cart';
import { TableSessionProvider } from './src/store/table-session';
import { FavoritesProvider } from './src/store/Favorites';
import { CatalogProvider } from './src/controller/CatalogController';
import { useAuth } from './src/controller/AuthController';
import HomeView from './src/view/homeView';
import CardapioView from './src/view/cardapioView';
import LoginView from './src/view/loginView';
import RegisterView from './src/view/registerView';
import CheckoutView from './src/view/checkoutView';
import AtendimentoView from './src/view/atendimentoView';
import CozinhaView from './src/view/cozinhaView';
import AdminView from './src/view/adminView';

export type RootStackParamList = {
  homeView: { tableNumber?: string } | undefined;
  cardapioView: { category?: string; tableNumber?: string; orderType?: 'local' | 'delivery' | 'retirada' } | undefined;
  loginView: undefined;
  LoginScreen: undefined;
  registerView: undefined;
  Checkout: { orderType?: 'local' | 'delivery' | 'retirada'; tableNumber?: string } | undefined;
  atendimentoView: undefined;
  cozinhaView: undefined;
  adminView: undefined;
};

// No web, usa automaticamente o domínio atual da Vercel; no mobile mantém os prefixos locais.
const CURRENT_WEB_ORIGIN = (globalThis as any)?.location?.origin;
const VERCEL_PRODUCTION_URL = CURRENT_WEB_ORIGIN || 'https://seu-projeto.vercel.app';
const linking: LinkingOptions<RootStackParamList> = {
  prefixes: [VERCEL_PRODUCTION_URL, 'http://localhost:8081', 'http://localhost:19006'],
  config: {
    screens: {
      homeView: { path: 'mesa/:tableNumber' },
      loginView: 'loginView',
      LoginScreen: 'login',
      registerView: 'registerView',
      cardapioView: 'cardapioView',
      Checkout: 'Checkout',
      atendimentoView: 'atendimentoView',
      cozinhaView: 'cozinhaView',
      adminView: 'adminView',
    },
  },
};

const Stack = createNativeStackNavigator<RootStackParamList>();

function routeForRole(role?: string): keyof RootStackParamList {
  if (role === 'ADMIN') return 'adminView';
  if (role === 'ATTENDANT') return 'atendimentoView';
  if (role === 'KITCHEN') return 'cozinhaView';
  return 'homeView';
}

function AppNavigation() {
  const { user, loading } = useAuth();
  if (loading) return null;
  return (
    <NavigationContainer linking={linking}>
      <Stack.Navigator initialRouteName={routeForRole(user?.role)} screenOptions={{ headerShown: false }}>
        <Stack.Screen name="homeView" component={HomeView} />
        <Stack.Screen name="cardapioView" component={CardapioView} />
        <Stack.Screen name="loginView" component={LoginView} />
        <Stack.Screen name="LoginScreen" component={LoginView} />
        <Stack.Screen name="registerView" component={RegisterView} />
        <Stack.Screen name="Checkout" component={CheckoutView} />
        <Stack.Screen name="atendimentoView" component={AtendimentoView} />
        <Stack.Screen name="cozinhaView" component={CozinhaView} />
        <Stack.Screen name="adminView" component={AdminView} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <TableSessionProvider>
        <CatalogProvider>
          <CartProvider>
            <FavoritesProvider>
              <AppNavigation />
            </FavoritesProvider>
          </CartProvider>
        </CatalogProvider>
      </TableSessionProvider>
    </AuthProvider>
  );
}
