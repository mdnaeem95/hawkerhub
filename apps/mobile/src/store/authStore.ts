import { create } from 'zustand';
import { MMKV } from 'react-native-mmkv';

const storage = new MMKV();

interface AuthState {
  isAuthenticated: boolean;
  userRole: 'customer' | 'vendor' | null;
  token: string | null;
  setAuth: (token: string, role: 'customer' | 'vendor') => void;
  logout: () => void;
  loadAuth: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  isAuthenticated: false,
  userRole: null,
  token: null,
  
  setAuth: (token, role) => {
    storage.set('auth.token', token);
    storage.set('auth.role', role);
    set({ isAuthenticated: true, token, userRole: role });
  },
  
  logout: () => {
    storage.delete('auth.token');
    storage.delete('auth.role');
    set({ isAuthenticated: false, token: null, userRole: null });
  },
  
  loadAuth: () => {
    const token = storage.getString('auth.token');
    const role = storage.getString('auth.role') as 'customer' | 'vendor' | null;
    if (token && role) {
      set({ isAuthenticated: true, token, userRole: role });
    }
  },
}));