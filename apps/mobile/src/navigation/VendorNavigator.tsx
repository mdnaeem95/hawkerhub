import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { theme } from '@/constants/theme';
import DashboardScreen from '@/screens/vendor/DashboardScreen';
import OrdersScreen from '@/screens/vendor/OrdersScreen';
import MenuScreen from '@/screens/vendor/MenuScreen';
import ProfileScreen from '@/screens/vendor/ProfileScreen';

export type VendorTabParamList = {
  Dashboard: undefined;
  Orders: undefined;
  Menu: undefined;
  Profile: undefined;
};

const Tab = createBottomTabNavigator<VendorTabParamList>();

export const VendorNavigator: React.FC = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: string = '';

          if (route.name === 'Dashboard') {
            iconName = 'view-dashboard';
          } else if (route.name === 'Orders') {
            iconName = 'clipboard-list';
          } else if (route.name === 'Menu') {
            iconName = 'food';
          } else if (route.name === 'Profile') {
            iconName = 'account';
          }

          return <Icon name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.gray[400],
        headerShown: false,
        tabBarStyle: {
          borderTopWidth: 1,
          borderTopColor: theme.colors.gray[200],
        },
      })}
    >
      <Tab.Screen 
        name="Dashboard" 
        component={DashboardScreen}
        options={{ title: 'Dashboard' }}
      />
      <Tab.Screen 
        name="Orders" 
        component={OrdersScreen}
        options={{ title: 'Orders' }}
      />
      <Tab.Screen 
        name="Menu" 
        component={MenuScreen}
        options={{ title: 'Menu' }}
      />
      <Tab.Screen 
        name="Profile" 
        component={ProfileScreen}
        options={{ title: 'Profile' }}
      />
    </Tab.Navigator>
  );
};