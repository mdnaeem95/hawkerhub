// apps/mobile/src/navigation/VendorNavigator.tsx
import React, { useState, useEffect } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { theme } from '@/constants/theme';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/services/api';
import { useSocket, useSocketConnection } from '@/hooks/useSocket';

// Import vendor screens
import { DashboardScreen } from '@/screens/vendor/DashboardScreen';
import { VendorOrdersScreen } from '@/screens/vendor/OrdersScreen';
import ProfileScreen from '@/screens/vendor/ProfileScreen';
import { MenuManagementScreen } from '@/screens/vendor/MenuScreen';
import { AnalyticsScreen } from '@/screens/vendor/AnalyticsScreen';
import { POSIntegrationScreen } from '@/screens/vendor/POSIntegrationScreen';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export type VendorTabParamList = {
  Dashboard: undefined;
  Orders: undefined;
  Menu: undefined;
  Analytics: undefined;
  Profile: undefined;
  POSIntegration: undefined;
};

export type VendorStackParamList = {
  VendorTabs: undefined;
  OrderDetails: { orderId: string };
  AddMenuItem: undefined;
  EditMenuItem: { itemId: string };
  Settings: undefined;
};

const Tab = createBottomTabNavigator<VendorTabParamList>();
const Stack = createStackNavigator<VendorStackParamList>();

function VendorTabs() {
  const insets = useSafeAreaInsets();
  const [pendingOrdersCount, setPendingOrdersCount] = useState(0);
  
  // Initialize socket connection
  useSocketConnection();

  // Fetch initial pending orders count
  const { data: ordersData } = useQuery({
    queryKey: ['vendor-pending-orders-count'],
    queryFn: async () => {
      const response = await api.get('/vendor/orders/stats');
      return response.data;
    },
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Update count when data is fetched
  useEffect(() => {
    if (ordersData?.pendingCount !== undefined) {
      setPendingOrdersCount(ordersData.pendingCount);
    }
  }, [ordersData]);

  // Listen for new orders via socket
  useSocket('new-order', (data) => {
    setPendingOrdersCount(prev => prev + 1);
  });

  // Listen for order updates
  useSocket('order:updated', (order) => {
    // If order moved from PENDING to another status, decrement
    if (order.previousStatus === 'PENDING' && order.status !== 'PENDING') {
      setPendingOrdersCount(prev => Math.max(0, prev - 1));
    }
  });

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: string;

          switch (route.name) {
            case 'Dashboard':
              iconName = focused ? 'view-dashboard' : 'view-dashboard-outline';
              break;
            case 'Orders':
              iconName = focused ? 'clipboard-list' : 'clipboard-list-outline';
              break;
            case 'Menu':
              iconName = focused ? 'food' : 'food-outline';
              break;
            case 'Analytics':
              iconName = focused ? 'chart-line' : 'chart-line-variant';
              break;
            case 'Profile':
              iconName = focused ? 'account' : 'account-outline';
              break;
            case 'POSIntegration':
              iconName = focused ? 'account' : 'account-outline';
              break;
            default:
              iconName = 'circle';
          }

          return <Icon name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.gray[500],
        tabBarStyle: {
          height: 52 + insets.bottom,
          paddingBottom: insets.bottom,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 12,
        },
        headerShown: false,
      })}
    >
      <Tab.Screen 
        name="Dashboard" 
        component={DashboardScreen}
        options={{ title: 'Dashboard' }}
      />
      <Tab.Screen 
        name="Orders" 
        component={VendorOrdersScreen}
        options={{ 
          title: 'Orders',
          tabBarBadge: pendingOrdersCount > 0 ? pendingOrdersCount : undefined,
        }}
      />
      <Tab.Screen 
        name="Menu" 
        component={MenuManagementScreen}
        options={{ title: 'Menu' }}
      />
      <Tab.Screen 
        name="Analytics" 
        component={AnalyticsScreen}
        options={{ title: 'Analytics' }}
      />
      <Tab.Screen 
        name="Profile" 
        component={ProfileScreen}
        options={{ title: 'Profile' }}
      />
      <Tab.Screen 
        name="POSIntegration" 
        component={POSIntegrationScreen}
        options={{ title: 'POS Integration' }}
      />
    </Tab.Navigator>
  );
}

export function VendorNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: theme.colors.primary,
        },
        headerTintColor: 'white',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
      <Stack.Screen 
        name="VendorTabs" 
        component={VendorTabs}
        options={{ headerShown: false }}
      />
      {/* Add other vendor stack screens here as needed */}
    </Stack.Navigator>
  );
}