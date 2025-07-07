// apps/mobile/src/navigation/CustomerNavigator.tsx (updated)
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { theme } from '@/constants/theme';
import { getFocusedRouteNameFromRoute } from '@react-navigation/native';

// Import screens
import { ScanTableScreen } from '@/screens/customer/ScanTableScreen';
import OrdersScreen from '@/screens/customer/OrdersScreen';
import { StallListScreen } from '@/screens/customer/StallListScreen';
import { CartScreen } from '@/screens/customer/CartScreen';
import { MenuScreen } from '@/screens/customer/MenuScreen';
import { PaymentScreen } from '@/screens/customer/PaymentScreen';
import ProfileScreen from '@/screens/customer/ProfileScreen';

export type CustomerStackParamList = {
  ScanTable: undefined;
  StallList: { hawkerId: string; tableNumber: string };
  Menu: { 
    stallId: string; 
    stallName: string;
    reorderItems?: Array<{
      id: string;
      menuItemId: string;
      quantity: number;
      specialInstructions?: string;
      menuItem: {
        id: string;
        name: string;
        price: number;
      };
    }>;
  };
  Cart: undefined;
  Payment: {
    orderId: string;
    orderNumber: string;
    amount: number;
    paymentMode: string;
    stallName: string;
  };
};

export type CustomerTabParamList = {
  Order: undefined;
  Orders: undefined;
  Profile: undefined;
};

const Tab = createBottomTabNavigator<CustomerTabParamList>();
const Stack = createStackNavigator<CustomerStackParamList>();

// Stack navigator for the ordering flow
function OrderingStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen 
        name="ScanTable" 
        component={ScanTableScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="StallList" 
        component={StallListScreen}
        options={{ 
          title: 'Choose a Stall',
          headerStyle: {
            backgroundColor: theme.colors.primary,
          },
          headerTintColor: '#fff',
        }}
      />
      <Stack.Screen 
        name="Menu" 
        component={MenuScreen}
        options={({ route }) => ({
          title: route.params.stallName,
          headerStyle: {
            backgroundColor: theme.colors.primary,
          },
          headerTintColor: '#fff',
        })}
      />
      <Stack.Screen 
        name="Cart" 
        component={CartScreen}
        options={{ 
          title: 'Your Cart',
          headerStyle: {
            backgroundColor: theme.colors.primary,
          },
          headerTintColor: '#fff',
        }}
      />
      <Stack.Screen 
        name="Payment" 
        component={PaymentScreen}
        options={{ 
          title: 'Payment',
          headerStyle: {
            backgroundColor: theme.colors.primary,
          },
          headerTintColor: '#fff',
        }}
      />
    </Stack.Navigator>
  );
}

export function CustomerNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: string;

          if (route.name === 'Order') {
            iconName = focused ? 'qrcode-scan' : 'qrcode';
          } else if (route.name === 'Orders') {
            iconName = focused ? 'receipt' : 'receipt';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'account' : 'account-outline';
          } else {
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
        name="Order" 
        component={OrderingStack}
        options={({ route }) => ({
          title: 'Order',
          // Hide tab bar when in certain screens
          tabBarStyle: ((route) => {
            const routeName = getFocusedRouteNameFromRoute(route) ?? '';
            if (['Menu', 'Cart'].includes(routeName)) {
              return { display: 'none' };
            }
            return {
              height: 60,
              paddingBottom: 8,
              paddingTop: 8,
            };
          })(route),
        })}
      />
      <Tab.Screen 
        name="Orders" 
        component={OrdersScreen}
        options={{ 
          title: 'My Orders',
          headerShown: true,
          headerStyle: {
            backgroundColor: theme.colors.primary,
          },
          headerTintColor: '#fff',
        }}
      />
      <Tab.Screen 
        name="Profile" 
        component={ProfileScreen}
        options={{ 
          title: 'Profile',
          headerShown: true,
          headerStyle: {
            backgroundColor: theme.colors.primary,
          },
          headerTintColor: '#fff',
        }}
      />
    </Tab.Navigator>
  );
}