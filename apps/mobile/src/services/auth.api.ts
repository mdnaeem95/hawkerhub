import { api } from './api';

export const authApi = {
  sendOTP: (phoneNumber: string, userType: 'customer' | 'vendor') =>
    api.post('/auth/send-otp', { phoneNumber, userType }),

  verifyOTP: (phoneNumber: string, otp: string, userType: 'customer' | 'vendor') =>
    api.post('/auth/verify-otp', { phoneNumber, otp, userType }),

  getCurrentUser: () =>
    api.get('/auth/me'),

  logout: () =>
    api.post('/auth/logout'),
};