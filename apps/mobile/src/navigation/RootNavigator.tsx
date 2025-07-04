import React, { useEffect, useState } from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { useAuthStore } from '@/store/authStore';
import { SplashScreen } from '@/screens/shared/SplashScreen';
import { LoginScreen } from '@/screens/auth/LoginScreen';
import { VendorNavigator } from './VendorNavigator';
import { CustomerNavigator } from './CustomerNavigator';

export type RootStackParamList = {
  Splash: undefined;
  Login: undefined;
  CustomerMain: undefined;
  VendorMain: undefined;
};

const Stack = createStackNavigator<RootStackParamList>();

export function RootNavigator() {
  const { isAuthenticated, userRole, checkAuth } = useAuthStore();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check auth status on app start
    const initializeAuth = async () => {
      try {
        await checkAuth();
      } catch (error) {
        console.error('Auth check failed:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, [checkAuth]);

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