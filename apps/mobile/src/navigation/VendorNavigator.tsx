// apps/mobile/src/navigation/VendorNavigator.tsx
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { theme } from '@/constants/theme';

// Import vendor screens
import { DashboardScreen } from '@/screens/vendor/DashboardScreen';
import { VendorOrdersScreen } from '@/screens/vendor/OrdersScreen';
import ProfileScreen from '@/screens/vendor/ProfileScreen';
import { MenuManagementScreen } from '@/screens/vendor/MenuScreen';
import { AnalyticsScreen } from '@/screens/vendor/AnalyticsScreen';

export type VendorTabParamList = {
  Dashboard: undefined;
  Orders: undefined;
  Menu: undefined;
  Analytics: undefined;
  Profile: undefined;
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
            default:
              iconName = 'circle';
          }

          return <Icon name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.gray[500],
        tabBarStyle: {
          height: 60,
          paddingBottom: 8,
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
          tabBarBadge: 3, // Show pending orders count
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