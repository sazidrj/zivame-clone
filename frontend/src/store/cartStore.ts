// src/store/cartStore.ts
import { create } from "zustand";
import { persist } from "zustand/middleware";
import api from "../services/api";
import { useAuthStore } from "./authStore";

export interface CartItemState {
  id: number;
  product_id: number;
  product_name: string;
  product_slug: string;
  product_image?: string;
  price: number;
  mrp?: number;
  quantity: number;
  size?: string;
  subtotal: number;
}

interface CartState {
  cartId: number | null;
  items: CartItemState[];
  totalItems: number;
  totalAmount: number;
  savings: number;
  isLoading: boolean;

  fetchCart: () => Promise<void>;
  addItem: (productId: number, quantity?: number, size?: string) => Promise<void>;
  updateItem: (itemId: number, quantity: number) => Promise<void>;
  removeItem: (itemId: number) => Promise<void>;
  clearCart: () => Promise<void>;

  // Guest cart (before login)
  guestItems: Omit<CartItemState, "id">[];
  addGuestItem: (item: Omit<CartItemState, "id">) => void;
  removeGuestItem: (productId: number, size?: string) => void;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      cartId: null,
      items: [],
      totalItems: 0,
      totalAmount: 0,
      savings: 0,
      isLoading: false,
      guestItems: [],

      fetchCart: async () => {
        const { isAuthenticated } = useAuthStore.getState();
        if (!isAuthenticated) return;

        set({ isLoading: true });
        try {
          const { data } = await api.get("/cart");
          set({
            cartId: data.id,
            items: data.items,
            totalItems: data.total_items,
            totalAmount: data.total_amount,
            savings: data.savings,
            isLoading: false,
          });
        } catch {
          set({ isLoading: false });
        }
      },

      addItem: async (productId, quantity = 1, size) => {
        const { isAuthenticated } = useAuthStore.getState();
        if (!isAuthenticated) {
          // Will be handled by guest cart
          return;
        }
        set({ isLoading: true });
        try {
          const { data } = await api.post("/cart/items", {
            product_id: productId,
            quantity,
            size,
          });
          set({
            cartId: data.id,
            items: data.items,
            totalItems: data.total_items,
            totalAmount: data.total_amount,
            savings: data.savings,
            isLoading: false,
          });
        } catch {
          set({ isLoading: false });
          throw new Error("Failed to add item to cart");
        }
      },

      updateItem: async (itemId, quantity) => {
        set({ isLoading: true });
        try {
          const { data } = await api.patch(`/cart/items/${itemId}`, { quantity });
          set({
            items: data.items,
            totalItems: data.total_items,
            totalAmount: data.total_amount,
            savings: data.savings,
            isLoading: false,
          });
        } catch {
          set({ isLoading: false });
        }
      },

      removeItem: async (itemId) => {
        set({ isLoading: true });
        try {
          const { data } = await api.delete(`/cart/items/${itemId}`);
          set({
            items: data.items,
            totalItems: data.total_items,
            totalAmount: data.total_amount,
            savings: data.savings,
            isLoading: false,
          });
        } catch {
          set({ isLoading: false });
        }
      },

      clearCart: async () => {
        await api.delete("/cart");
        set({ items: [], totalItems: 0, totalAmount: 0, savings: 0 });
      },

      addGuestItem: (item) => {
        set((state) => {
          const existing = state.guestItems.find(
            (i) => i.product_id === item.product_id && i.size === item.size
          );
          if (existing) {
            return {
              guestItems: state.guestItems.map((i) =>
                i.product_id === item.product_id && i.size === item.size
                  ? { ...i, quantity: i.quantity + item.quantity }
                  : i
              ),
            };
          }
          return { guestItems: [...state.guestItems, item] };
        });
      },

      removeGuestItem: (productId, size) => {
        set((state) => ({
          guestItems: state.guestItems.filter(
            (i) => !(i.product_id === productId && i.size === size)
          ),
        }));
      },
    }),
    {
      name: "cart-storage",
      partialize: (state) => ({ guestItems: state.guestItems }),
    }
  )
);
