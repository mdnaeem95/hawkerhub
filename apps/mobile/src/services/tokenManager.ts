import AsyncStorage from '@react-native-async-storage/async-storage';

class TokenManager {
  private token: string | null = null;

  async getToken(): Promise<string | null> {
    if (this.token) return this.token;
    
    // Get from storage
    try {
      const authData = await AsyncStorage.getItem('auth-storage');
      if (authData) {
        const parsed = JSON.parse(authData);
        this.token = parsed?.state?.token || null;
        return this.token;
      }
    } catch (error) {
      console.error('Error getting token:', error);
    }
    return null;
  }

  setToken(token: string | null) {
    this.token = token;
  }

  clearToken() {
    this.token = null;
  }
}

export const tokenManager = new TokenManager();