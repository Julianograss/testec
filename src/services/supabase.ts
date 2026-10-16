import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL as string | undefined;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY as string | undefined;

/** false quando as variáveis EXPO_PUBLIC_SUPABASE_* não foram configuradas (ex.: na Vercel). */
export const supabaseConfigured = !!url && !!anonKey;
if (!supabaseConfigured) {
  console.error(
    '[Supabase] Defina EXPO_PUBLIC_SUPABASE_URL e EXPO_PUBLIC_SUPABASE_ANON_KEY (Vercel > Settings > Environment Variables) e faça um novo deploy.',
  );
}

// Sem as variáveis o createClient lançaria erro e a tela ficaria em branco;
// com valores provisórios o app abre e as chamadas ao banco apenas falham.
export const supabase = createClient(url || 'https://oymcywaglefoxrzifswg.supabase.co', anonKey || 'sb_publishable_EASXo9K2ItfBB-iqTtxe0g_TLUrPmSy', {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

/** uuid v4 gerado no app (o pedido precisa do id antes de ir ao banco). */
export const newUuid = () =>
  'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
