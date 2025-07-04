// apps/mobile/src/services/api.ts
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuthStore } from '@/store/authStore';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

export const api = axios.create({
  baseURL: API_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  async (config) => {
    try {
      // First check if token is already in headers (set by authStore)
      if (config.headers.Authorization) {
        return config;
      }
      
      // Otherwise, get auth data from AsyncStorage
      const authData = await AsyncStorage.getItem('auth-storage');
      if (authData) {
        const parsedData = JSON.parse(authData);
        if (parsedData?.state?.token) {
          config.headers.Authorization = `Bearer ${parsedData.state.token}`;
        }
      }
    } catch (error) {
      console.error('Error getting auth token from storage:', error);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle auth errors
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Clear auth storage on 401
      try {
        await AsyncStorage.removeItem('auth-storage');
        // The app will handle navigation to login screen based on auth state
      } catch (storageError) {
        console.error('Error clearing auth storage:', storageError);
      }
    }
    return Promise.reject(error);
  }
);

// API endpoints
export const authApi = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),
  
  register: (data: any) =>
    api.post('/auth/register', data),
  
  logout: () =>
    api.post('/auth/logout'),
};

export const ordersApi = {
  create: (data: any) =>
    api.post('/orders', data),
  
  getByTable: (tableId: string) =>
    api.get(`/orders/table/${tableId}`),
  
  getMyOrders: async () => {
    // Ensure token is set before making the request
    const token = useAuthStore.getState().token;
    if (token && !api.defaults.headers.common['Authorization']) {
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    }
    
    return api.get('/orders/my-orders');
  },
  
  updateStatus: (orderId: string, status: string) =>
    api.patch(`/orders/${orderId}/status`, { status }),
};

export const menuApi = {
  getByStall: (stallId: string) =>
    api.get(`/menu/stall/${stallId}`),
  
  create: (data: any) =>
    api.post('/menu', data),
  
  update: (itemId: string, data: any) =>
    api.patch(`/menu/${itemId}`, data),
};