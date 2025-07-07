import { api } from './api';

export const authApi = {
  checkPhone: (phoneNumber: string, userType: 'customer' | 'vendor') =>
    api.post('/auth/check-phone', { phoneNumber, userType }),

  sendOTP: (phoneNumber: string, userType: 'customer' | 'vendor') =>
    api.post('/auth/send-otp', { phoneNumber, userType }),

  verifyOTP: (phoneNumber: string, otp: string, userType: 'customer' | 'vendor', name?:string) =>
    api.post('/auth/verify-otp', { phoneNumber, otp, userType, name }),

  getCurrentUser: () =>
    api.get('/auth/me'),

  logout: () =>
    api.post('/auth/logout'),
};