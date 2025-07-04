import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface CartItem {
  id: string;
  menuItemId: string;
  stallId: string;
  stallName: string;
  name: string;
  price: number;
  quantity: number;
  specialInstructions?: string;
  imageUrl?: string;
}

interface CartState {
  items: CartItem[];
  
  // Actions
  addItem: (item: Omit<CartItem, 'id'>) => void;
  updateQuantity: (itemId: string, quantity: number) => void;
  removeItem: (itemId: string) => void;
  clearCart: () => void;
  clearStallItems: (stallId: string) => void;
  
  // Computed
  getTotalItems: () => number;
  getTotalPrice: () => number;
  getStallItems: (stallId: string) => CartItem[];
  getGroupedByStall: () => Record<string, CartItem[]>;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (item) => {
        const id = `${item.menuItemId}-${Date.now()}`;
        set((state) => ({
          items: [...state.items, { ...item, id }],
        }));
      },

      updateQuantity: (itemId, quantity) => {
        if (quantity <= 0) {
          get().removeItem(itemId);
          return;
        }
        set((state) => ({
          items: state.items.map((item) =>
            item.id === itemId ? { ...item, quantity } : item
          ),
        }));
      },

      removeItem: (itemId) => {
        set((state) => ({
          items: state.items.filter((item) => item.id !== itemId),
        }));
      },

      clearCart: () => {
        set({ items: [] });
      },

      clearStallItems: (stallId) => {
        set((state) => ({
          items: state.items.filter((item) => item.stallId !== stallId),
        }));
      },

      getTotalItems: () => {
        const state = get();
        return state.items.reduce((total, item) => total + item.quantity, 0);
      },

      getTotalPrice: () => {
        const state = get();
        return state.items.reduce(
          (total, item) => total + item.price * item.quantity,
          0
        );
      },

      getStallItems: (stallId) => {
        const state = get();
        return state.items.filter((item) => item.stallId === stallId);
      },

      getGroupedByStall: () => {
        const state = get();
        return state.items.reduce((groups, item) => {
          if (!groups[item.stallId]) {
            groups[item.stallId] = [];
          }
          groups[item.stallId].push(item);
          return groups;
        }, {} as Record<string, CartItem[]>);
      },
    }),
    {
      name: 'cart-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);