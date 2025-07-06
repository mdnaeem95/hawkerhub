// apps/mobile/src/services/pushNotification.service.ts
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from './api';

// Configure how notifications should be presented when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true
  }),
});

class PushNotificationService {
  private notificationListener: any;
  private responseListener: any;

  async registerForPushNotifications(): Promise<string | null> {
    try {
      // Check if device supports push notifications
      if (!Device.isDevice) {
        console.log('Push notifications only work on physical devices');
        return null;
      }

      // Get existing permission status
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      // Request permission if not granted
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.log('Failed to get push notification permission');
        return null;
      }

      // Get Expo push token
      const token = await Notifications.getExpoPushTokenAsync({
        projectId: Constants.expoConfig?.extra?.eas?.projectId,
      });

      console.log('Push token:', token.data);

      // Configure Android-specific settings
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('orders', {
          name: 'Order Updates',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF231F7C',
          sound: 'default',
        });

        await Notifications.setNotificationChannelAsync('promotions', {
          name: 'Promotions',
          importance: Notifications.AndroidImportance.DEFAULT,
          sound: 'default',
        });
      }

      // Save token locally
      await AsyncStorage.setItem('pushToken', token.data);

      // Send token to backend
      await this.savePushTokenToServer(token.data);

      return token.data;
    } catch (error) {
      console.error('Error registering for push notifications:', error);
      return null;
    }
  }

  private async savePushTokenToServer(token: string) {
    try {
      await api.post('/notifications/register', {
        token,
        platform: Platform.OS,
      });
      console.log('Push token saved to server');
    } catch (error) {
      console.error('Error saving push token to server:', error);
    }
  }

  // Schedule a local notification
  async scheduleLocalNotification(
    title: string,
    body: string,
    data?: any,
    seconds: number = 0
  ) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data,
        sound: 'default',
      },
      trigger: seconds > 0 ? { 
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds,
        repeats: false
       } : null,
    });
  }

  // Listen for notifications
  setupNotificationListeners(
    onNotificationReceived: (notification: Notifications.Notification) => void,
    onNotificationResponse: (response: Notifications.NotificationResponse) => void
  ) {
    // Handle notifications when app is in foreground
    this.notificationListener = Notifications.addNotificationReceivedListener(
      onNotificationReceived
    );

    // Handle notification taps
    this.responseListener = Notifications.addNotificationResponseReceivedListener(
      onNotificationResponse
    );
  }

  // Clean up listeners
  removeNotificationListeners() {
    if (this.notificationListener) {
      Notifications.removeNotificationSubscription(this.notificationListener);
    }
    if (this.responseListener) {
      Notifications.removeNotificationSubscription(this.responseListener);
    }
  }

  // Get stored push token
  async getStoredPushToken(): Promise<string | null> {
    return await AsyncStorage.getItem('pushToken');
  }

  // Handle different notification types
  handleNotificationResponse(response: Notifications.NotificationResponse) {
    const { notification } = response;
    const data = notification.request.content.data;

    console.log('Notification tapped:', data);

    // Navigate based on notification type
    if (data.type === 'order_ready') {
      // Navigate to orders screen
      return { screen: 'Orders', params: { orderId: data.orderId } };
    } else if (data.type === 'new_order') {
      // For vendors - navigate to vendor orders
      return { screen: 'VendorOrders', params: { orderId: data.orderId } };
    } else if (data.type === 'payment_confirmed') {
      // Navigate to order details
      return { screen: 'Orders', params: { orderId: data.orderId } };
    }

    return null;
  }
}

export const pushNotificationService = new PushNotificationService();