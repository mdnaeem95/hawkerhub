// apps/mobile/src/store/authStore.ts
import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface AuthStore {
  isAuthenticated: boolean;
  userRole: 'customer' | 'vendor' | null;
  token: string | null;
  setAuth: (token: string, role: 'customer' | 'vendor') => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthStore>((set) => ({
  isAuthenticated: false,
  userRole: null,
  token: null,
  
  setAuth: async (token: string, role: 'customer' | 'vendor') => {
    await AsyncStorage.setItem('auth_token', token);
    await AsyncStorage.setItem('user_role', role);
    set({ isAuthenticated: true, token, userRole: role });
  },
  
  logout: async () => {
    await AsyncStorage.multiRemove(['auth_token', 'user_role']);
    set({ isAuthenticated: false, token: null, userRole: null });
  },
  
  checkAuth: async () => {
    const token = await AsyncStorage.getItem('auth_token');
    const role = await AsyncStorage.getItem('user_role') as 'customer' | 'vendor' | null;
    
    if (token && role) {
      set({ isAuthenticated: true, token, userRole: role });
    }
  },
}));