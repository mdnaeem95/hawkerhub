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
        // Set token in API client
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        
        set({
          token,
          user,
          isAuthenticated: true,
          userRole: user.userType
        });
      },

      logout: async () => {
        // Remove token from API client
        delete api.defaults.headers.common['Authorization'];
        
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
          try {
            // Set token in headers
            api.defaults.headers.common['Authorization'] = `Bearer ${state.token}`;
            
            // Verify token is still valid
            const response = await api.get('/auth/me');
            if (response.data.success && response.data.user) {
              set({
                user: response.data.user,
                isAuthenticated: true,
                userRole: response.data.user.userType
              });
            } else {
              // Token invalid, logout
              await get().logout();
            }
          } catch (error) {
            console.error('Auth check error:', error);
            // Token invalid, logout
            await get().logout();
          }
        } else {
          // No token, ensure logged out state
          set({
            isAuthenticated: false,
            userRole: null
          });
        }
      }
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ 
        token: state.token,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        userRole: state.userRole
      }),
    }
  )
);