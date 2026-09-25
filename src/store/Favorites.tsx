import React, { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { PRODUCTS } from '../data/demoData';

export type FavoriteProduct = { id: string; name: string; description: string; category: string; price: string; active?: boolean; highlight?: boolean };
type FavoritesContextValue = { favorites: FavoriteProduct[]; isFavorite: (id: string) => boolean; toggleFavorite: (product: FavoriteProduct) => void; removeFavorite: (id: string) => void };
const FavoritesContext = createContext<FavoritesContextValue | undefined>(undefined);
const KEY = 'fogo-fumaca-favorites-v1';
const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value));

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const [favorites, setFavorites] = useState<FavoriteProduct[]>([]);
  useEffect(() => { try { const saved = (globalThis as any)?.localStorage?.getItem(KEY); setFavorites(saved ? JSON.parse(saved) : []); } catch { setFavorites([]); } }, []);
  const persist = (next: FavoriteProduct[]) => { setFavorites(next); try { (globalThis as any)?.localStorage?.setItem(KEY, JSON.stringify(next)); } catch { /* memória no mobile */ } };
  const isFavorite = (id: string) => favorites.some(item => item.id === id);
  const toggleFavorite = (product: FavoriteProduct) => persist(isFavorite(product.id) ? favorites.filter(item => item.id !== product.id) : [...favorites, clone(product)]);
  const removeFavorite = (id: string) => persist(favorites.filter(item => item.id !== id));
  const value = useMemo(() => ({ favorites, isFavorite, toggleFavorite, removeFavorite }), [favorites]);
  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>;
}
export function useFavorites(): FavoritesContextValue { const value = useContext(FavoritesContext); if (!value) throw new Error('useFavorites precisa estar dentro de <FavoritesProvider>.'); return value; }
export const favoriteSeed = PRODUCTS;
