// apps/mobile/App.tsx (updated)
import 'react-native-gesture-handler';
import { useEffect, useRef } from 'react';
import { StatusBar } from 'expo-status-bar';
import { PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { NavigationContainer } from '@react-navigation/native';
import * as Notifications from 'expo-notifications';
import { RootNavigator } from '@navigation/RootNavigator';
import { theme } from '@/constants/theme';
import { navigationRef } from '@/services/navigation';
import { socketService } from '@/services/socket.service';
import { pushNotificationService } from '@/services/pushNotification.service';
import { useAuthStore } from '@/store/authStore';

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
  const notificationListener = useRef<Notifications.EventSubscription | null>(null);
  const responseListener = useRef<Notifications.EventSubscription | null>(null);

  useEffect(() => {
    // Register for push notifications when authenticated
    if (isAuthenticated) {
      pushNotificationService.registerForPushNotifications();
      socketService.connect();
    } else {
      socketService.disconnect();
    }
  }, [isAuthenticated]);

  useEffect(() => {
    // Setup notification listeners
    pushNotificationService.setupNotificationListeners(
      // Handle notifications received while app is open
      (notification: Notifications.Notification) => {
        console.log('Notification received:', notification);
        
        // You can show a custom in-app notification here
        const { title, body } = notification.request.content;
        console.log(`📬 ${title}: ${body}`);
      },
      // Handle notification taps
      (response: Notifications.NotificationResponse) => {
        console.log('Notification tapped:', response);
        
        const navigation = pushNotificationService.handleNotificationResponse(response);
        if (navigation && navigationRef.current?.isReady()) {
          // Navigate to the appropriate screen
          navigationRef.current.navigate(navigation.screen as any, navigation.params as never);
        } else {
          navigationRef.current?.navigate(navigation?.screen as any)
        }
      }
    );

    // Handle notifications that opened the app
    Notifications.getLastNotificationResponseAsync().then(response => {
      if (response) {
        const navigation = pushNotificationService.handleNotificationResponse(response);
        if (navigation && navigationRef.current?.isReady()) {
          setTimeout(() => {
            navigationRef.current?.navigate(navigation.screen as any, navigation.params as never);
          }, 100);
        } else {
          navigationRef.current?.navigate(navigation?.screen as any)
        }
      }
    });

    return () => {
      pushNotificationService.removeNotificationListeners();
    };
  }, []);

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