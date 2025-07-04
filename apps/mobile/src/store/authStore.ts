import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '@/services/api';

interface User {
  id: string;
  phoneNumber: string;
  name: string;
  userType: 'customer' | 'vendor';
}

interface AuthState {
  token: string | null;
  user: User | null;
  isAuthenticated: boolean;
  userRole: 'customer' | 'vendor' | null;
  hasHydrated: boolean;
  setHasHydrated: () => void;
  justLoggedIn: boolean;
  clearJustLoggedIn: () => void;
  
  // Actions
  setAuth: (token: string, user: User) => void;
  logout: () => void;
  checkAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      isAuthenticated: false,
      userRole: null,
      hasHydrated: false,
      justLoggedIn: false,

      setAuth: (token: string, user: User) => {
        // Set token in API client
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;

        api.interceptors.request.use(config => {
          config.headers.Authorization = `Bearer ${token}`;
          return config
        })
        
        set({
          token,
          user,
          isAuthenticated: true,
          userRole: user.userType,
          justLoggedIn: true,
        });
      },

      logout: () => {
        // Remove token from API client
        delete api.defaults.headers.common['Authorization'];
        
        set({
          token: null,
          user: null,
          isAuthenticated: false,
          userRole: null
        });
      },

      checkAuth: async () => {
        const state = get();
        if (state.token) {
          try {
            // Verify token is still valid
            const response = await api.get('/auth/me');
            if (response.data.success) {
              set({
                user: response.data.user,
                isAuthenticated: true,
                userRole: response.data.user.userType
              });
            } else {
              get().logout();
            }
          } catch (error) {
            get().logout();
          }
        }
      },

      setHasHydrated: () => set({ hasHydrated: true }),

      clearJustLoggedIn: () => {
        set({ justLoggedIn: false });
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);