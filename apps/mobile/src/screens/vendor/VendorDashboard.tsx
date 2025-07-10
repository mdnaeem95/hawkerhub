import React, { useEffect } from 'react';
import { pushNotificationService } from '@/services/pushNotification.service';
import { useAuthStore } from '@/store/authStore';
import { DashboardScreen } from './DashboardScreen';

export const VendorDashboard: React.FC = () => {
  const { userRole } = useAuthStore();

  useEffect(() => {
    // Register for push notifications when vendor logs in
    if (userRole === 'vendor') {
      pushNotificationService.registerForPushNotifications()
        .then(token => {
          if (token) {
            console.log('[VendorDashboard] Push notifications registered');
          }
        })
        .catch(error => {
          console.error('[VendorDashboard] Push notification registration failed:', error);
        });
    }
  }, [userRole]);

  // Set up notification listeners
  useEffect(() => {
    const handleNotificationReceived = (notification: any) => {
      console.log('[VendorDashboard] Notification received:', notification);
    };

    const handleNotificationResponse = (response: any) => {
      console.log('[VendorDashboard] Notification response:', response);
      // Handle navigation based on notification type
      const navigationTarget = pushNotificationService.handleNotificationResponse(response);
      if (navigationTarget) {
        // Navigate to the appropriate screen
        console.log('[VendorDashboard] Should navigate to:', navigationTarget);
      }
    };

    pushNotificationService.setupNotificationListeners(
      handleNotificationReceived,
      handleNotificationResponse
    );

    return () => {
      pushNotificationService.removeNotificationListeners();
    };
  }, []);

  return <DashboardScreen />;
};