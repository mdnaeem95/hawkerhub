// apps/mobile/src/navigation/RootNavigator.tsx
import React, { useEffect, useState } from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { useAuthStore } from '@/store/authStore';
import { SplashScreen } from '@/screens/shared/SplashScreen';
import { LoginScreen } from '@/screens/auth/LoginScreen';
import { VendorNavigator } from './VendorNavigator';
import { CustomerNavigator } from './CustomerNavigator';
import { api } from '@/services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type RootStackParamList = {
  Splash: undefined;
  Login: undefined;
  CustomerMain: undefined;
  VendorMain: undefined;
};

const Stack = createStackNavigator<RootStackParamList>();

export function RootNavigator() {
  const { isAuthenticated, userRole, checkAuth, token } = useAuthStore();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Initialize auth on app start
    const initializeAuth = async () => {
      try {
        // First, try to get token from storage and set it in axios headers
        const authData = await AsyncStorage.getItem('auth-storage');
        if (authData) {
          const parsedData = JSON.parse(authData);
          if (parsedData?.state?.token) {
            api.defaults.headers.common['Authorization'] = `Bearer ${parsedData.state.token}`;
          }
        }
        
        // Then check if the token is still valid
        await checkAuth();
      } catch (error) {
        console.error('Auth initialization failed:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, []);

  // Update axios headers when token changes
  useEffect(() => {
    if (token) {
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      delete api.defaults.headers.common['Authorization'];
    }
  }, [token]);

  if (isLoading) {
    return <SplashScreen />;
  }

  return (
    <Stack.Navigator 
      screenOptions={{ 
        headerShown: false, 
      }}
    >
      {!isAuthenticated ? (
        // Auth screens
        <Stack.Screen 
          name="Login" 
          component={LoginScreen}
          options={{
            animationTypeForReplace: !isAuthenticated ? 'pop' : 'push',
          }}
        />
      ) : (
        // Authenticated screens
        <>
          {userRole === 'vendor' ? (
            <Stack.Screen name="VendorMain" component={VendorNavigator} />
          ) : (
            <Stack.Screen name="CustomerMain" component={CustomerNavigator} />
          )}
        </>
      )}
    </Stack.Navigator>
  );
}