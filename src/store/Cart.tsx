import React, { createContext, useState, useContext, ReactNode } from 'react';

// 1. Definição da interface do Item do Carrinho
export interface CartItem {
  id: string;
  title: string;
  desc?: string;
  price: string | number;
  icon?: string;
  badge?: string | null;
  quantity: number;
}

// 2. Definição do contrato (Shape) do Contexto - ADICIONADO: mesa e setMesa
interface CartContextType {
  items: CartItem[];
  mesa: string | null;
  setMesa: (mesa: string | null) => void;
  addToCart: (product: Omit<CartItem, 'quantity'>) => void;
  removeFromCart: (productId: string) => void;
  clearCart: () => void;
  cartCount: number;
  cartTotal: number;
}

// 3. Criação do contexto fortemente tipado
const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const [items, setItems] = useState<CartItem[]>([]);
  // Estado para armazenar o identificador da Mesa
  const [mesa, setMesa] = useState<string | null>(null);

  const addToCart = (product: Omit<CartItem, 'quantity'>) => {
    setItems((currentItems) => {
      const existingItem = currentItems.find((item) => item.id === product.id);

      if (existingItem) {
        return currentItems.map((item) =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }

      return [...currentItems, { ...product, quantity: 1 }];
    });
  };

  const removeFromCart = (productId: string) => {
    setItems((currentItems) => {
      const existingItem = currentItems.find((item) => item.id === productId);

      if (!existingItem) return currentItems;

      if (existingItem.quantity === 1) {
        return currentItems.filter((item) => item.id !== productId);
      }

      return currentItems.map((item) =>
        item.id === productId
          ? { ...item, quantity: item.quantity - 1 }
          : item
      );
    });
  };

  const clearCart = () => {
    setItems([]);
  };

  const cartCount = items.reduce((total, item) => total + item.quantity, 0);

  const cartTotal = items.reduce((total, item) => {
    const priceAsNumber =
      typeof item.price === 'string'
        ? parseFloat(item.price.replace(',', '.'))
        : item.price;

    return total + priceAsNumber * item.quantity;
  }, 0);

  return (
    <CartContext.Provider
      value={{
        items,
        mesa,
        setMesa,
        addToCart,
        removeFromCart,
        clearCart,
        cartCount,
        cartTotal,
      }}>
      {children}
    </CartContext.Provider>
  );
};

// 4. Hook personalizado com proteção de escopo
export const useCart = (): CartContextType => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart deve ser utilizado dentro de um CartProvider');
  }
  return context;
};