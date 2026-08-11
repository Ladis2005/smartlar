'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import {
  addToCart,
  cartCount,
  cartSubtotal,
  removeFromCart,
  updateQuantity,
  type CartItem,
} from './cart';

interface CartState {
  items: CartItem[];
  hydrated: boolean;
  add: (item: CartItem) => void;
  remove: (productId: string) => void;
  setQuantity: (productId: string, quantity: number) => void;
  clear: () => void;
  setHydrated: () => void;
}

export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      hydrated: false,
      add: (item) => set((state) => ({ items: addToCart(state.items, item) })),
      remove: (productId) => set((state) => ({ items: removeFromCart(state.items, productId) })),
      setQuantity: (productId, quantity) =>
        set((state) => ({ items: updateQuantity(state.items, productId, quantity) })),
      clear: () => set({ items: [] }),
      setHydrated: () => set({ hydrated: true }),
    }),
    {
      name: 'smartlar-carrinho',
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ items: state.items }),
      onRehydrateStorage: () => (state) => state?.setHydrated(),
    },
  ),
);

export function useCartItems(): CartItem[] {
  return useCartStore((state) => state.items);
}

export function useCartCount(): number {
  const items = useCartStore((state) => state.items);
  const hydrated = useCartStore((state) => state.hydrated);
  return hydrated ? cartCount(items) : 0;
}

export function useCartSubtotal(): number {
  return cartSubtotal(useCartStore((state) => state.items));
}
