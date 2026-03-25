// src/store/authStore.ts
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { tokenStorage } from "../services/api";
import { authService } from "../services/authService";
import { TokenResponse, User } from "../types";

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (tokens: TokenResponse) => Promise<void>;
  logout: () => void;
  fetchMe: () => Promise<void>;
  setUser: (user: User) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,

      login: async (tokens: TokenResponse) => {
        tokenStorage.set(tokens.access_token, tokens.refresh_token);
        set({ isLoading: true });
        try {
          const user = await authService.getMe();
          set({ user, isAuthenticated: true, isLoading: false });
        } catch {
          tokenStorage.clear();
          set({ isLoading: false });
        }
      },

      logout: () => {
        tokenStorage.clear();
        set({ user: null, isAuthenticated: false });
      },

      fetchMe: async () => {
        const token = tokenStorage.getAccess();
        if (!token) return;
        set({ isLoading: true });
        try {
          const user = await authService.getMe();
          set({ user, isAuthenticated: true, isLoading: false });
        } catch {
          tokenStorage.clear();
          set({ user: null, isAuthenticated: false, isLoading: false });
        }
      },

      setUser: (user: User) => set({ user }),
    }),
    {
      name: "auth-storage",
      partialize: (state) => ({ user: state.user, isAuthenticated: state.isAuthenticated }),
    }
  )
);
