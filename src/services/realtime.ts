import { supabase } from './supabase';

/**
 * Avisa quando qualquer uma das tabelas mudar (em qualquer aparelho).
 * Agrupa rajadas de eventos numa única chamada. Retorna a função de cancelar.
 */
export function onTablesChange(tables: string[], callback: () => void): () => void {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const fire = () => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(callback, 150);
  };
  const channel = supabase.channel(`rt-${tables.join('-')}-${Math.random().toString(36).slice(2)}`);
  tables.forEach(table =>
    channel.on('postgres_changes', { event: '*', schema: 'public', table }, fire),
  );
  channel.subscribe();
  return () => {
    if (timer) clearTimeout(timer);
    supabase.removeChannel(channel);
  };
}
