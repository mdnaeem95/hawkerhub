import axios from 'axios';
import { useAuthStore } from '@store/authStore';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

export const api = axios.create({
  baseURL: API_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().token;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().logout();
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