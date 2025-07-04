// apps/mobile/src/screens/customer/OrdersScreen.tsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  SectionList,
  Image,
  Alert,
} from 'react-native';
import {
  Text,
  Card,
  Chip,
  Button,
  ActivityIndicator,
  ProgressBar,
  List,
  Divider,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { theme, spacing } from '@/constants/theme';
import { ordersApi } from '@/services/api';
import { useAuthStore } from '@/store/authStore';
import { useSocket, useSocketConnection } from '@/hooks/useSocket';
import { Snackbar } from 'react-native-paper';

interface OrderItem {
  id: string;
  menuItemId: string;
  quantity: number;
  price: number;
  specialInstructions?: string;
  menuItem: {
    id: string;
    name: string;
    nameZh?: string;
  };
}

interface Order {
  id: string;
  orderNumber: string;
  status: 'PENDING' | 'PREPARING' | 'READY' | 'COMPLETED' | 'CANCELLED';
  totalAmount: number;
  paymentMode: string;
  createdAt: string;
  updatedAt: string;
  items: OrderItem[];
  stall: {
    id: string;
    name: string;
    phoneNumber: string;
  };
  table: {
    number: string;
  };
}

interface OrderSection {
  title: string;
  data: Order[];
}

const OrdersScreen: React.FC = () => {
  const { user } = useAuthStore();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [notification, setNotification] = useState<{
    visible: boolean;
    message: string;
    type: 'success' | 'info' | 'error';
  }>({ visible: false, message: '', type: 'info' });

  useSocketConnection();

    // Handle real-time order updates
    useSocket('order:updated', useCallback((updatedOrder: Order) => {
      console.log('Order updated via socket:', updatedOrder);
      
      setOrders(prevOrders => {
        const index = prevOrders.findIndex(o => o.id === updatedOrder.id);
        if (index !== -1) {
          const newOrders = [...prevOrders];
          newOrders[index] = updatedOrder;
          return newOrders;
        }
        return prevOrders;
      });

      // Show notification based on status
      const statusMessages = {
        'PREPARING': '👨‍🍳 Your order is being prepared!',
        'READY': '✅ Your order is ready for collection!',
        'COMPLETED': '🎉 Order completed. Thank you!',
        'CANCELLED': '❌ Your order has been cancelled.'
      };

      const message = statusMessages[updatedOrder.status as keyof typeof statusMessages];
      if (message) {
        setNotification({
          visible: true,
          message: `Order #${updatedOrder.orderNumber}: ${message}`,
          type: updatedOrder.status === 'CANCELLED' ? 'error' : 
                updatedOrder.status === 'READY' ? 'success' : 'info'
        });
      }
    }, []));

  // Fetch orders
  const fetchOrders = async (showLoader = true) => {
    try {
      if (showLoader) setLoading(true);
      
      // Debug logging in development
      if (__DEV__) {
        console.log('Fetching orders...');
        const { authDebug } = require('@/utils/authDebug');
        await authDebug.fullDebug();
      }
      
      const response = await ordersApi.getMyOrders();
      
      if (response.data.success) {
        setOrders(response.data.orders);
        console.log(`Fetched ${response.data.orders.length} orders`);
      }
    } catch (error: any) {
      console.error('Error fetching orders:', error);
      console.error('Error details:', error.response?.data);
      console.error('Error status:', error.response?.status);
      
      // Show error to user if needed
      if (error.response?.status === 401) {
        console.error('Authentication error - user may need to log in again');
        // You might want to show an alert or toast here
        Alert.alert(
          'Authentication Error',
          'Please log in again to continue',
          [
            {
              text: 'OK',
              onPress: () => {
                // The interceptor will handle logout
              }
            }
          ]
        );
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Handle new orders created
  useSocket('order:created', useCallback((newOrder: Order) => {
    console.log('New order created via socket:', newOrder);
    
    setOrders(prevOrders => [newOrder, ...prevOrders]);
    
    setNotification({
      visible: true,
      message: `Order #${newOrder.orderNumber} placed successfully!`,
      type: 'success'
    });
  }, []));

  // Refresh orders when screen is focused
  useFocusEffect(
    useCallback(() => {
      fetchOrders();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchOrders(false);
  };

  // Group orders by status
  const sections: OrderSection[] = React.useMemo(() => {
    const activeOrders = orders.filter(order => 
      ['PENDING', 'PREPARING', 'READY'].includes(order.status)
    );
    const pastOrders = orders.filter(order => 
      ['COMPLETED', 'CANCELLED'].includes(order.status)
    );

    const result: OrderSection[] = [];
    
    if (activeOrders.length > 0) {
      result.push({ title: 'Active Orders', data: activeOrders });
    }
    
    if (pastOrders.length > 0) {
      result.push({ title: 'Past Orders', data: pastOrders });
    }
    
    return result;
  }, [orders]);

  const getStatusColor = (status: Order['status']) => {
    switch (status) {
      case 'PENDING': return theme.colors.warning;
      case 'PREPARING': return theme.colors.info;
      case 'READY': return theme.colors.success;
      case 'COMPLETED': return theme.colors.gray[500];
      case 'CANCELLED': return theme.colors.error;
      default: return theme.colors.gray[500];
    }
  };

  const getStatusText = (status: Order['status']) => {
    switch (status) {
      case 'PENDING': return 'Waiting for confirmation';
      case 'PREPARING': return 'Preparing your order';
      case 'READY': return 'Ready for collection';
      case 'COMPLETED': return 'Completed';
      case 'CANCELLED': return 'Cancelled';
      default: return status;
    }
  };

  const renderOrderItem = ({ item: order }: { item: Order }) => (
    <Card style={styles.orderCard} mode="elevated">
      <Card.Content>
        <View style={styles.orderHeader}>
          <View>
            <Text style={styles.orderNumber}>Order #{order.orderNumber}</Text>
            <Text style={styles.stallName}>{order.stall.name}</Text>
            <Text style={styles.tableNumber}>Table {order.table.number}</Text>
          </View>
          <View style={styles.orderHeaderRight}>
            <Chip
              mode="flat"
              style={[styles.statusChip, { backgroundColor: getStatusColor(order.status) }]}
              textStyle={styles.statusText}
            >
              {order.status}
            </Chip>
            <Text style={styles.totalAmount}>${order.totalAmount.toFixed(2)}</Text>
          </View>
        </View>

        <Divider style={styles.divider} />

        <View style={styles.itemsContainer}>
          {order.items.map((item, index) => (
            <View key={item.id} style={styles.orderItem}>
              <Text style={styles.itemQuantity}>{item.quantity}x</Text>
              <Text style={styles.itemName} numberOfLines={1}>
                {item.menuItem.name}
              </Text>
              <Text style={styles.itemPrice}>${(item.price * item.quantity).toFixed(2)}</Text>
            </View>
          ))}
        </View>

        {['PENDING', 'PREPARING'].includes(order.status) && (
          <>
            <Divider style={styles.divider} />
            <View style={styles.statusContainer}>
              <Icon name="clock-outline" size={20} color={getStatusColor(order.status)} />
              <Text style={[styles.statusMessage, { color: getStatusColor(order.status) }]}>
                {getStatusText(order.status)}
              </Text>
            </View>
          </>
        )}

        {order.status === 'READY' && (
          <>
            <Divider style={styles.divider} />
            <Button
              mode="contained"
              onPress={() => {/* Handle collection */}}
              style={styles.collectButton}
            >
              Mark as Collected
            </Button>
          </>
        )}
      </Card.Content>
    </Card>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading orders...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (orders.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView
          contentContainerStyle={styles.emptyContainer}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          <Icon name="receipt" size={80} color={theme.colors.gray[300]} />
          <Text style={styles.emptyTitle}>No orders yet</Text>
          <Text style={styles.emptyText}>
            Your orders will appear here once you place them
          </Text>
          <Button
            mode="contained"
            onPress={() => {/* Navigate to scan */}}
            style={styles.scanButton}
          >
            Scan Table to Order
          </Button>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        renderItem={renderOrderItem}
        renderSectionHeader={({ section: { title } }) => (
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{title}</Text>
          </View>
        )}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      />

      {/* Notification Snackbar */}
      <Snackbar
        visible={notification.visible}
        onDismiss={() => setNotification(prev => ({ ...prev, visible: false }))}
        duration={4000}
        action={{
          label: 'Dismiss',
          onPress: () => setNotification(prev => ({ ...prev, visible: false })),
        }}
        style={{
          backgroundColor: 
            notification.type === 'success' ? theme.colors.success :
            notification.type === 'error' ? theme.colors.error :
            theme.colors.info
        }}
      >
        {notification.message}
      </Snackbar>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.gray[50],
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: 16,
    color: theme.colors.gray[600],
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: theme.colors.gray[800],
    marginTop: spacing.lg,
  },
  emptyText: {
    fontSize: 16,
    color: theme.colors.gray[600],
    textAlign: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.xl,
  },
  scanButton: {
    paddingHorizontal: spacing.xl,
  },
  listContent: {
    paddingBottom: spacing.xl,
  },
  sectionHeader: {
    backgroundColor: theme.colors.gray[50],
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.gray[800],
  },
  separator: {
    height: spacing.md,
  },
  orderCard: {
    marginHorizontal: spacing.lg,
    backgroundColor: 'white',
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  orderNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.gray[900],
  },
  stallName: {
    fontSize: 14,
    color: theme.colors.gray[700],
    marginTop: 2,
  },
  tableNumber: {
    fontSize: 12,
    color: theme.colors.gray[500],
    marginTop: 2,
  },
  orderHeaderRight: {
    alignItems: 'flex-end',
  },
  statusChip: {
    marginBottom: spacing.xs,
  },
  statusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  totalAmount: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.gray[900],
  },
  divider: {
    marginVertical: spacing.md,
  },
  itemsContainer: {
    gap: spacing.sm,
  },
  orderItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemQuantity: {
    fontSize: 14,
    color: theme.colors.gray[600],
    width: 30,
  },
  itemName: {
    flex: 1,
    fontSize: 14,
    color: theme.colors.gray[800],
  },
  itemPrice: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.gray[700],
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  statusMessage: {
    fontSize: 14,
    fontWeight: '500',
  },
  collectButton: {
    marginTop: spacing.sm,
  },
});

export default OrdersScreen;