import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { tokenManager } from '@/services/tokenManager';

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

      setAuth: (token: string, user: User) => {
        // Update token manager
        tokenManager.setToken(token);
        
        set({
          token,
          user,
          isAuthenticated: true,
          userRole: user.userType
        });
      },

      logout: async () => {
        // Clear token manager
        tokenManager.clearToken();
        
        // Clear storage
        await AsyncStorage.removeItem('auth-storage');
        
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
          // Update token manager
          tokenManager.setToken(state.token);
          
          try {
            // Import api here to avoid circular dependency at module level
            const { authApi } = await import('@/services/auth.api');
            const response = await authApi.getCurrentUser();
            
            if (response.data.user) {
              set({
                user: response.data.user,
                isAuthenticated: true,
                userRole: response.data.user.userType
              });
            }
          } catch (error) {
            console.error('Auth check failed:', error);
            get().logout();
          }
        }
      }
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);