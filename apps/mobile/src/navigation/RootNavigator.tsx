import React, { useEffect } from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { useAuthStore } from '@store/authStore';

import { SplashScreen } from '@screens/shared/SplashScreen';
import { LoginScreen } from '@/screens/auth/LoginScreen';
import { CustomerNavigator } from './CustomerNavigation';
import VendorNavigator from './VendorNavigator';
import { navigationRef } from '@/services/navigation';

export type RootStackParamList = {
  Splash: undefined;
  Login: undefined;
  CustomerMain: undefined;
  VendorMain: undefined;
};

const Stack = createStackNavigator<RootStackParamList>();

export function RootNavigator() {
  const { isAuthenticated, userRole, justLoggedIn, clearJustLoggedIn } = useAuthStore();

  useEffect(() => {
    if (isAuthenticated && justLoggedIn && userRole && navigationRef.isReady()) {
      navigationRef.reset({
        index: 0,
        routes: [{ name: userRole === 'vendor' ? 'VendorMain' : 'CustomerMain' }],
      });
      clearJustLoggedIn();
    }
  }, [isAuthenticated, justLoggedIn, userRole]);

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
