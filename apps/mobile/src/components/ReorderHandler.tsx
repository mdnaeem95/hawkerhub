// Create a new component: apps/mobile/src/components/ReorderHandler.tsx
import React, { useEffect } from 'react';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { useCartStore } from '@/store/cartStore';

interface ReorderInfo {
  stallId: string;
  stallName: string;
  items: Array<{
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
}

export const ReorderHandler: React.FC = () => {
  const navigation = useNavigation<any>();

  useEffect(() => {
    checkForReorder();
  }, []);

  const checkForReorder = async () => {
    try {
      // Check if we have reorder info
      const reorderInfoStr = await AsyncStorage.getItem('reorderInfo');
      if (!reorderInfoStr) return;

      const reorderInfo: ReorderInfo = JSON.parse(reorderInfoStr);
      
      // Check if we have a current session
      const sessionStr = await AsyncStorage.getItem('currentSession');
      if (!sessionStr) return;

      const session = JSON.parse(sessionStr);
      
      // Clear the reorder info
      await AsyncStorage.removeItem('reorderInfo');

      // Navigate to the menu with reorder items
      navigation.navigate('Order', {
        screen: 'Menu',
        params: {
          stallId: reorderInfo.stallId,
          stallName: reorderInfo.stallName,
          reorderItems: reorderInfo.items
        }
      });
    } catch (error) {
      console.error('Error handling reorder:', error);
    }
  };

  return null;
};