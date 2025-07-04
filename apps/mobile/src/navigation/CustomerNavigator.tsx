// apps/mobile/src/navigation/CustomerNavigator.tsx
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { theme } from '@constants/theme';

import { ScanTableScreen } from '@/screens/customer/ScanTableScreen';
import OrdersScreen from '@/screens/customer/OrdersScreen';
import ProfileScreen from '@/screens/customer/ProfileScreen';
import { createStackNavigator } from '@react-navigation/stack';
import { StallListScreen } from '@/screens/customer/StallListScreen';
import MenuScreen from '@/screens/vendor/MenuScreen';
import CartScreen from '@/screens/customer/CartScreen';

export type CustomerStackParamList = {
  ScanTable: undefined;
  StallList: { hawkerId: string; tableNumber: string };
  Menu: { stallId: string; stallName: string };
  Cart: undefined;
};

const Tab = createBottomTabNavigator();
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
    </Stack.Navigator>
  );
}

export const CustomerNavigator: React.FC = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: string = '';

          if (route.name === 'Order') {
            iconName = 'qrcode-scan';
          } else if (route.name === 'Orders') {
            iconName = 'receipt';
          } else if (route.name === 'Profile') {
            iconName = 'account';
          }

          return <Icon name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.onSurfaceVariant,
        headerShown: false,
      })}
    >
      <Tab.Screen name="Order" component={OrderingStack} options={{ title: 'Order Food' }} />
      <Tab.Screen name="Orders" component={OrdersScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
};