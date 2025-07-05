// apps/mobile/src/screens/vendor/VendorOrdersScreen.tsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Alert,
} from 'react-native';
import {
  Text,
  Card,
  Chip,
  Button,
  ActivityIndicator,
  FAB,
  Portal,
  Modal,
  RadioButton,
  Divider,
  IconButton,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { theme, spacing } from '@/constants/theme';
import { api } from '@/services/api';
import { useAuthStore } from '@/store/authStore';
import { useSocket, useSocketConnection } from '@/hooks/useSocket';

interface OrderItem {
  id: string;
  menuItemId: string;
  quantity: number;
  price: number;
  specialInstructions?: string;
  menuItem: {
    id: string;
    name: string;
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
  table: {
    id: string;
    number: string;
  };
  customer?: {
    id: string;
    name: string;
    phoneNumber: string;
  };
}

export const VendorOrdersScreen: React.FC = () => {
  const { user } = useAuthStore();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [statusModalVisible, setStatusModalVisible] = useState(false);
  const [newStatus, setNewStatus] = useState<string>('');

  // Initialize socket connection
  useSocketConnection();

  // Real-time order updates
  useSocket('order:new', useCallback((newOrder: Order) => {
    console.log('New order received:', newOrder);
    setOrders(prev => [newOrder, ...prev]);
    
    // Play sound or vibrate for new order
    // Vibration.vibrate();
    
    Alert.alert(
      '🆕 New Order!',
      `Order #${newOrder.orderNumber} from Table ${newOrder.table.number}`,
      [{ text: 'OK' }]
    );
  }, []));

  useSocket('order:updated', useCallback((updatedOrder: Order) => {
    console.log('Order updated:', updatedOrder);
    setOrders(prev => prev.map(order => 
      order.id === updatedOrder.id ? updatedOrder : order
    ));
  }, []));

  // Fetch vendor orders
  const fetchOrders = async (showLoader = true) => {
    try {
      if (showLoader) setLoading(true);
      
      const response = await api.get('/vendor/orders');
      
      if (response.data.success) {
        setOrders(response.data.orders);
        console.log(`Fetched ${response.data.orders.length} vendor orders`);
      }
    } catch (error: any) {
      console.error('Error fetching vendor orders:', error);
      console.error('Error details:', error.response?.data);
      
      if (error.response?.status === 403) {
        Alert.alert(
          'Access Denied',
          'You need vendor access to view orders',
          [{ text: 'OK' }]
        );
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchOrders();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchOrders(false);
  };

  // Update order status
  const updateOrderStatus = async (orderId: string, status: string) => {
    try {
      console.log('Updating order status:', { orderId, status });
      
      const response = await api.patch(`/orders/${orderId}/status`, { status });
      
      console.log('Update response:', response.data);
      
      if (response.data.success) {
        Alert.alert('Success', 'Order status updated successfully!');
        
        // Update local state immediately
        setOrders(prev => prev.map(order => 
          order.id === orderId 
            ? { ...order, status: status as Order['status'] }
            : order
        ));
      }
    } catch (error: any) {
      console.error('Error updating order status:', error);
      console.error('Error response:', error.response?.data);
      console.error('Error status:', error.response?.status);
      
      Alert.alert(
        'Error', 
        error.response?.data?.message || 'Failed to update order status'
      );
    }
  };

  // Filter orders by status
  const filteredOrders = orders.filter(order => {
    if (selectedStatus === 'ALL') return true;
    return order.status === selectedStatus;
  });

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

  const StatusFilter = ({ status, label, count }: any) => (
    <Chip
      selected={selectedStatus === status}
      onPress={() => setSelectedStatus(status)}
      style={styles.filterChip}
      mode="outlined"
    >
      {label} {count > 0 && `(${count})`}
    </Chip>
  );

  const renderOrderCard = (order: Order) => (
    <Card key={order.id} style={styles.orderCard} mode="elevated">
      <Card.Content>
        {/* Order Header */}
        <View style={styles.orderHeader}>
          <View>
            <Text style={styles.orderNumber}>Order #{order.orderNumber}</Text>
            <Text style={styles.tableNumber}>Table {order.table.number}</Text>
            <Text style={styles.orderTime}>
              {new Date(order.createdAt).toLocaleTimeString()}
            </Text>
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

        {/* Order Items */}
        <View style={styles.itemsContainer}>
          {order.items.map((item) => (
            <View key={item.id} style={styles.orderItem}>
              <Text style={styles.itemQuantity}>{item.quantity}x</Text>
              <View style={styles.itemDetails}>
                <Text style={styles.itemName}>{item.menuItem.name}</Text>
                {item.specialInstructions && (
                  <Text style={styles.specialInstructions}>
                    Note: {item.specialInstructions}
                  </Text>
                )}
              </View>
              <Text style={styles.itemPrice}>
                ${(item.price * item.quantity).toFixed(2)}
              </Text>
            </View>
          ))}
        </View>

        <Divider style={styles.divider} />

        {/* Action Buttons */}
        <View style={styles.actions}>
          {order.status === 'PENDING' && (
            <>
              <Button
                mode="outlined"
                onPress={() => updateOrderStatus(order.id, 'CANCELLED')}
                style={styles.actionButton}
                textColor={theme.colors.error}
              >
                Reject
              </Button>
              <Button
                mode="contained"
                onPress={() => updateOrderStatus(order.id, 'PREPARING')}
                style={styles.actionButton}
              >
                Accept Order
              </Button>
            </>
          )}
          
          {order.status === 'PREPARING' && (
            <Button
              mode="contained"
              onPress={() => updateOrderStatus(order.id, 'READY')}
              style={[styles.actionButton, styles.fullWidthButton]}
              buttonColor={theme.colors.success}
            >
              Mark as Ready
            </Button>
          )}
          
          {order.status === 'READY' && (
            <Button
              mode="contained"
              onPress={() => updateOrderStatus(order.id, 'COMPLETED')}
              style={[styles.actionButton, styles.fullWidthButton]}
            >
              Complete Order
            </Button>
          )}
          
          {['COMPLETED', 'CANCELLED'].includes(order.status) && (
            <Text style={styles.completedText}>
              {order.status === 'COMPLETED' ? 'Order completed' : 'Order cancelled'}
            </Text>
          )}
        </View>
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

  // Count orders by status
  const orderCounts = {
    ALL: orders.length,
    PENDING: orders.filter(o => o.status === 'PENDING').length,
    PREPARING: orders.filter(o => o.status === 'PREPARING').length,
    READY: orders.filter(o => o.status === 'READY').length,
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Status Filters */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterContainer}
        contentContainerStyle={styles.filterContent}
      >
        <StatusFilter status="ALL" label="All" count={orderCounts.ALL} />
        <StatusFilter status="PENDING" label="Pending" count={orderCounts.PENDING} />
        <StatusFilter status="PREPARING" label="Preparing" count={orderCounts.PREPARING} />
        <StatusFilter status="READY" label="Ready" count={orderCounts.READY} />
      </ScrollView>

      {/* Orders List */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={styles.ordersContent}
      >
        {filteredOrders.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Icon name="receipt" size={80} color={theme.colors.gray[300]} />
            <Text style={styles.emptyTitle}>No orders</Text>
            <Text style={styles.emptyText}>
              {selectedStatus === 'ALL' 
                ? 'New orders will appear here'
                : `No ${selectedStatus.toLowerCase()} orders`}
            </Text>
          </View>
        ) : (
          filteredOrders.map(renderOrderCard)
        )}
      </ScrollView>
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
  filterContainer: {
    backgroundColor: 'white',
    maxHeight: 60,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.gray[200],
  },
  filterContent: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  filterChip: {
    marginRight: spacing.sm,
  },
  ordersContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xl * 2,
  },
  orderCard: {
    marginBottom: spacing.md,
    backgroundColor: 'white',
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  orderNumber: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.gray[900],
  },
  tableNumber: {
    fontSize: 16,
    color: theme.colors.gray[700],
    marginTop: 2,
  },
  orderTime: {
    fontSize: 14,
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
    fontSize: 20,
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
    alignItems: 'flex-start',
  },
  itemQuantity: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.gray[700],
    width: 35,
  },
  itemDetails: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    color: theme.colors.gray[800],
  },
  specialInstructions: {
    fontSize: 14,
    color: theme.colors.gray[600],
    fontStyle: 'italic',
    marginTop: 2,
  },
  itemPrice: {
    fontSize: 16,
    fontWeight: '500',
    color: theme.colors.gray[700],
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  actionButton: {
    flex: 1,
  },
  fullWidthButton: {
    flex: 1,
  },
  completedText: {
    textAlign: 'center',
    color: theme.colors.gray[600],
    fontSize: 14,
    width: '100%',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.xl * 4,
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
  },
});