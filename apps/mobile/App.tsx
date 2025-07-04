import 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import { PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { NavigationContainer } from '@react-navigation/native';
import { RootNavigator } from '@navigation/RootNavigator';
import { theme } from '@/constants/theme';
import { navigationRef } from '@/services/navigation';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <PaperProvider theme={theme}>
        <SafeAreaProvider>
          <NavigationContainer ref={navigationRef}>
            <RootNavigator />
            <StatusBar style="auto" />
          </NavigationContainer>
        </SafeAreaProvider>
      </PaperProvider>
    </QueryClientProvider>
  );
}