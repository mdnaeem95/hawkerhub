import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { useAuthStore } from '@store/authStore';

// Screens
import { SplashScreen } from '@screens/shared/SplashScreen';
import { LoginScreen } from '@screens/auth/LoginScreen';
import { CustomerNavigator } from './CustomerNavigator';
import { VendorNavigator } from './VendorNavigator';

export type RootStackParamList = {
  Splash: undefined;
  Login: undefined;
  CustomerMain: undefined;
  VendorMain: undefined;
};

const Stack = createStackNavigator<RootStackParamList>();

export function RootNavigator() {
  const { isAuthenticated, userRole } = useAuthStore();

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Splash" component={SplashScreen} />
      {!isAuthenticated ? (
        <Stack.Screen name="Login" component={LoginScreen} />
      ) : userRole === 'vendor' ? (
        <Stack.Screen name="VendorMain" component={VendorNavigator} />
      ) : (
        <Stack.Screen name="CustomerMain" component={CustomerNavigator} />
      )}
    </Stack.Navigator>
  );
}