import 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import { PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { NavigationContainer } from '@react-navigation/native';
import { RootNavigator } from '@navigation/RootNavigator';
import { theme } from '@/constants/theme';
import { navigationRef } from '@/services/navigation';
import { useAuthStore } from '@/store/authStore';
import { useEffect } from 'react';
import { socketService } from '@/services/socket.service';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

if (__DEV__) {
  // @ts-ignore
  global.clearAppData = async () => {
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    await AsyncStorage.clear();
    console.log('App data cleared! Restart the app.');
  };
  console.log('Dev mode: Run clearAppData() in console to clear all data');
}

function AppContent() {
  const { isAuthenticated } = useAuthStore();

  useEffect(() => {
    // Connect socket when user is authenticated
    if (isAuthenticated) {
      socketService.connect();
    } else {
      socketService.disconnect();
    }
  }, [isAuthenticated]);

  return (
    <NavigationContainer ref={navigationRef}>
      <RootNavigator />
      <StatusBar style="auto" />
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <PaperProvider theme={theme}>
        <SafeAreaProvider>
          <AppContent />
        </SafeAreaProvider>
      </PaperProvider>
    </QueryClientProvider>
  );
}