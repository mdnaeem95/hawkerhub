// apps/mobile/src/utils/authDebug.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '@/services/api';

export const authDebug = {
  // Check what's in AsyncStorage
  async checkStorage() {
    try {
      const authData = await AsyncStorage.getItem('auth-storage');
      console.log('=== Auth Storage Debug ===');
      console.log('Raw storage:', authData);
      
      if (authData) {
        const parsed = JSON.parse(authData);
        console.log('Parsed storage:', parsed);
        console.log('Token:', parsed?.state?.token);
        console.log('User:', parsed?.state?.user);
      } else {
        console.log('No auth data in storage');
      }
      
      // Also check all keys
      const allKeys = await AsyncStorage.getAllKeys();
      console.log('All AsyncStorage keys:', allKeys);
      
      console.log('========================');
    } catch (error) {
      console.error('Error checking storage:', error);
    }
  },

  // Check current axios headers
  checkAxiosHeaders() {
    console.log('=== Axios Headers Debug ===');
    console.log('Authorization header:', api.defaults.headers.common['Authorization']);
    console.log('All common headers:', api.defaults.headers.common);
    console.log('==========================');
  },

  // Test auth endpoint
  async testAuthEndpoint() {
    console.log('=== Testing Auth Endpoint ===');
    try {
      const response = await api.get('/auth/me');
      console.log('Auth test successful:', response.data);
    } catch (error: any) {
      console.error('Auth test failed:', error.response?.status, error.response?.data);
    }
    console.log('============================');
  },

  // Full debug check
  async fullDebug() {
    console.log('\n🔍 Running Full Auth Debug...\n');
    await this.checkStorage();
    this.checkAxiosHeaders();
    await this.testAuthEndpoint();
  }
};

// Export for use in React Native Debugger console
if (__DEV__) {
  (global as any).authDebug = authDebug;
}