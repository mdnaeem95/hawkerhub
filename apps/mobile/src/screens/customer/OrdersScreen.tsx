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
  Pressable,
  Animated,
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
  Badge,
  IconButton,
  Portal,
  Modal,
  Surface,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { theme, spacing } from '@/constants/theme';
import { ordersApi, api } from '@/services/api';
import { useAuthStore } from '@/store/authStore';
import { useSocket, useSocketConnection } from '@/hooks/useSocket';
import { Snackbar } from 'react-native-paper';
import { formatDistanceToNow } from 'date-fns';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
    imageUrl?: string;
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
  estimatedReadyTime?: string;
  collectionCode?: string;
  items: OrderItem[];
  stall: {
    id: string;
    name: string;
    phoneNumber: string;
    imageUrl?: string;
    location?: string;
  };
  table: {
    number: string;
  };
  hawker: {
    name: string;
  };
}

interface OrderSection {
  title: string;
  data: Order[];
}

const OrdersScreen: React.FC = () => {
  // Import navigation types
  const navigation = useNavigation<any>(); // Fix navigation type error
  const { user } = useAuthStore();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [notification, setNotification] = useState<{
    visible: boolean;
    message: string;
    type: 'success' | 'info' | 'error';
  }>({ visible: false, message: '', type: 'info' });

  // Animation values
  const pulseAnim = new Animated.Value(1);

  useSocketConnection();

  // Pulse animation for ready orders
  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, []);

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

    // Enhanced notifications
    const statusMessages = {
      'PREPARING': {
        title: '👨‍🍳 Order Being Prepared',
        message: `Your order #${updatedOrder.orderNumber} is now being prepared by ${updatedOrder.stall.name}`,
        icon: 'chef-hat'
      },
      'READY': {
        title: '✅ Order Ready!',
        message: `Please collect order #${updatedOrder.orderNumber} from ${updatedOrder.stall.name}`,
        icon: 'bell-ring'
      },
      'COMPLETED': {
        title: '🎉 Thank You!',
        message: `Order #${updatedOrder.orderNumber} completed. Enjoy your meal!`,
        icon: 'check-circle'
      },
      'CANCELLED': {
        title: '❌ Order Cancelled',
        message: `Order #${updatedOrder.orderNumber} has been cancelled. Please contact the stall.`,
        icon: 'close-circle'
      }
    };

    const status = statusMessages[updatedOrder.status as keyof typeof statusMessages];
    if (status) {
      // Show in-app notification
      setNotification({
        visible: true,
        message: status.message,
        type: updatedOrder.status === 'CANCELLED' ? 'error' : 
              updatedOrder.status === 'READY' ? 'success' : 'info'
      });

      // Show system notification if app is in background
      if (updatedOrder.status === 'READY') {
        // This would trigger a push notification in production
        console.log('Order ready notification:', status);
      }
    }
  }, []));

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

  // Fetch orders
  const fetchOrders = async (showLoader = true) => {
    try {
      if (showLoader) setLoading(true);
      
      const response = await ordersApi.getMyOrders();
      
      if (response.data.success) {
        // Add mock data for demonstration
        const ordersWithEstimates = response.data.orders.map((order: Order) => ({
          ...order,
          estimatedReadyTime: getEstimatedTime(order),
          collectionCode: generateCollectionCode(order.orderNumber),
          stall: {
            ...order.stall,
            location: `Stall ${Math.floor(Math.random() * 50) + 1}`,
          }
        }));
        setOrders(ordersWithEstimates);
      }
    } catch (error: any) {
      console.error('Error fetching orders:', error);
      if (error.response?.status === 401) {
        Alert.alert(
          'Authentication Error',
          'Please log in again to continue',
          [{ text: 'OK' }]
        );
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Generate estimated ready time based on order status
  const getEstimatedTime = (order: Order) => {
    const createdTime = new Date(order.createdAt);
    const now = new Date();
    
    switch (order.status) {
      case 'PENDING':
        createdTime.setMinutes(createdTime.getMinutes() + 15);
        break;
      case 'PREPARING':
        createdTime.setMinutes(createdTime.getMinutes() + 10);
        break;
      case 'READY':
      case 'COMPLETED':
      case 'CANCELLED':
        return null;
    }
    
    return createdTime > now ? createdTime.toISOString() : null;
  };

  // Generate collection code
  const generateCollectionCode = (orderNumber: string) => {
    return orderNumber.slice(-4).toUpperCase();
  };

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

  // Reorder functionality
  const handleReorder = async (order: Order) => {
    // Check if user has an active session
    const sessionStr = await AsyncStorage.getItem('currentSession');
    
    if (!sessionStr) {
      // No active session, need to scan QR first
      Alert.alert(
        'Scan Table First',
        'Please scan your table QR code to start a new order',
        [
          {
            text: 'Cancel',
            style: 'cancel'
          },
          {
            text: 'Scan QR',
            onPress: async () => {
              // Store reorder info
              await AsyncStorage.setItem('reorderInfo', JSON.stringify({
                stallId: order.stall.id,
                stallName: order.stall.name,
                items: order.items
              }));
              
              // Navigate to scan screen
              navigation.navigate('Order' as any);
            }
          }
        ]
      );
    } else {
      // Has active session, can reorder directly
      const session = JSON.parse(sessionStr);
      
      Alert.alert(
        'Reorder',
        `Reorder from ${order.stall.name}?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Reorder',
            onPress: () => {
              navigation.navigate('Order' as any, {
                screen: 'Menu',
                params: {
                  stallId: order.stall.id,
                  stallName: order.stall.name,
                  reorderItems: order.items
                }
              });
            }
          }
        ]
      );
    }
  };

  // Show order details
  const showOrderDetails = (order: Order) => {
    setSelectedOrder(order);
    setShowDetailsModal(true);
  };

  const getStatusProgress = (status: Order['status']) => {
    switch (status) {
      case 'PENDING': return 0.25;
      case 'PREPARING': return 0.5;
      case 'READY': return 0.75;
      case 'COMPLETED': return 1;
      case 'CANCELLED': return 0;
      default: return 0;
    }
  };

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

  const getStatusIcon = (status: Order['status']) => {
    switch (status) {
      case 'PENDING': return 'clock-outline';
      case 'PREPARING': return 'chef-hat';
      case 'READY': return 'check-circle';
      case 'COMPLETED': return 'check-all';
      case 'CANCELLED': return 'close-circle';
      default: return 'help-circle';
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

  const renderOrderItem = ({ item: order }: { item: Order }) => {
    const isReady = order.status === 'READY';
    const animatedStyle = isReady ? {
      transform: [{ scale: pulseAnim }]
    } : {};

    return (
      <Pressable onPress={() => showOrderDetails(order)}>
        <Animated.View style={animatedStyle}>
          <Card style={[
            styles.orderCard,
            isReady && styles.readyCard
          ]} mode="elevated">
            <Card.Content>
              {/* Status Progress Bar */}
              {order.status !== 'CANCELLED' && (
                <View style={styles.progressContainer}>
                  <ProgressBar
                    progress={getStatusProgress(order.status)}
                    color={getStatusColor(order.status)}
                    style={styles.progressBar}
                  />
                  <View style={styles.progressSteps}>
                    <Icon name="receipt" size={16} color={getStatusProgress(order.status) >= 0.25 ? theme.colors.primary : theme.colors.gray[400]} />
                    <Icon name="chef-hat" size={16} color={getStatusProgress(order.status) >= 0.5 ? theme.colors.primary : theme.colors.gray[400]} />
                    <Icon name="check-circle" size={16} color={getStatusProgress(order.status) >= 0.75 ? theme.colors.primary : theme.colors.gray[400]} />
                    <Icon name="check-all" size={16} color={getStatusProgress(order.status) >= 1 ? theme.colors.primary : theme.colors.gray[400]} />
                  </View>
                </View>
              )}

              {/* Order Header */}
              <View style={styles.orderHeader}>
                <View style={styles.orderInfo}>
                  <View style={styles.orderNumberRow}>
                    <Text style={styles.orderNumber}>Order #{order.orderNumber}</Text>
                    {isReady && (
                      <Badge style={styles.readyBadge}>
                        READY
                      </Badge>
                    )}
                  </View>
                  <Text style={styles.stallName}>{order.stall.name}</Text>
                  <View style={styles.locationRow}>
                    <Icon name="map-marker" size={14} color={theme.colors.gray[600]} />
                    <Text style={styles.location}>
                      {order.hawker.name} • {order.stall.location}
                    </Text>
                  </View>
                </View>
                <Icon 
                  name={getStatusIcon(order.status)} 
                  size={32} 
                  color={getStatusColor(order.status)} 
                />
              </View>

              {/* Collection Code for Ready Orders */}
              {isReady && order.collectionCode && (
                <Surface style={styles.collectionCode} elevation={2}>
                  <Text style={styles.collectionLabel}>Collection Code</Text>
                  <Text style={styles.collectionNumber}>{order.collectionCode}</Text>
                </Surface>
              )}

              {/* Order Details */}
              <View style={styles.orderDetails}>
                <View style={styles.detailRow}>
                  <Icon name="food" size={16} color={theme.colors.gray[600]} />
                  <Text style={styles.detailText}>
                    {order.items.length} item{order.items.length > 1 ? 's' : ''} • ${order.totalAmount.toFixed(2)}
                  </Text>
                </View>
                
                {order.estimatedReadyTime && order.status !== 'READY' && (
                  <View style={styles.detailRow}>
                    <Icon name="clock-outline" size={16} color={theme.colors.gray[600]} />
                    <Text style={styles.detailText}>
                      Ready in ~{formatDistanceToNow(new Date(order.estimatedReadyTime))}
                    </Text>
                  </View>
                )}

                <View style={styles.detailRow}>
                  <Icon name="table-furniture" size={16} color={theme.colors.gray[600]} />
                  <Text style={styles.detailText}>Table {order.table.number}</Text>
                </View>
              </View>

              {/* Status Text */}
              <Chip
                icon={getStatusIcon(order.status)}
                style={[
                  styles.statusChip,
                  { backgroundColor: `${getStatusColor(order.status)}20` }
                ]}
                textStyle={{ color: getStatusColor(order.status), fontSize: 12 }}
              >
                {getStatusText(order.status)}
              </Chip>

              {/* Action Buttons */}
              {order.status === 'COMPLETED' && (
                <View style={styles.actionButtons}>
                  <Button
                    mode="outlined"
                    onPress={() => handleReorder(order)}
                    icon="repeat"
                    compact
                    style={styles.reorderButton}
                  >
                    Reorder
                  </Button>
                </View>
              )}
            </Card.Content>
          </Card>
        </Animated.View>
      </Pressable>
    );
  };

  const renderSectionHeader = ({ section }: { section: OrderSection }) => (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{section.title}</Text>
      <Text style={styles.sectionCount}>{section.data.length}</Text>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading your orders...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>My Orders</Text>
        {orders.filter(o => o.status === 'READY').length > 0 && (
          <Badge style={styles.headerBadge}>
            {`${orders.filter(o => o.status === 'READY').length} Ready`}
          </Badge>
        )}
      </View>

      {orders.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Icon name="receipt-text-outline" size={80} color={theme.colors.gray[300]} />
          <Text style={styles.emptyTitle}>No orders yet</Text>
          <Text style={styles.emptyText}>
            Scan a table QR code to start ordering
          </Text>
          <Button
            mode="contained"
            onPress={() => navigation.navigate('Order' as any)}
            style={styles.scanButton}
            icon="qrcode-scan"
          >
            Scan Table QR
          </Button>
        </View>
      ) : (
        <SectionList
          sections={sections}
          renderItem={renderOrderItem}
          renderSectionHeader={renderSectionHeader}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[theme.colors.primary]}
            />
          }
          contentContainerStyle={styles.listContent}
          stickySectionHeadersEnabled={false}
        />
      )}

      {/* Order Details Modal */}
      <Portal>
        <Modal
          visible={showDetailsModal}
          onDismiss={() => setShowDetailsModal(false)}
          contentContainerStyle={styles.modalContent}
        >
          {selectedOrder && (
            <>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Order Details</Text>
                <IconButton
                  icon="close"
                  onPress={() => setShowDetailsModal(false)}
                />
              </View>
              
              <ScrollView>
                <View style={styles.modalStallInfo}>
                  <Text style={styles.modalStallName}>{selectedOrder.stall.name}</Text>
                  <Text style={styles.modalOrderNumber}>Order #{selectedOrder.orderNumber}</Text>
                </View>

                <Divider />

                <View style={styles.modalItems}>
                  <Text style={styles.modalSectionTitle}>Items</Text>
                  {selectedOrder.items.map((item) => (
                    <View key={item.id} style={styles.modalItem}>
                      <View style={styles.modalItemInfo}>
                        <Text style={styles.modalItemName}>
                          {item.quantity}x {item.menuItem.name}
                        </Text>
                        {item.specialInstructions && (
                          <Text style={styles.modalItemNote}>
                            Note: {item.specialInstructions}
                          </Text>
                        )}
                      </View>
                      <Text style={styles.modalItemPrice}>
                        ${(item.price * item.quantity).toFixed(2)}
                      </Text>
                    </View>
                  ))}
                </View>

                <Divider />

                <View style={styles.modalTotal}>
                  <Text style={styles.modalTotalLabel}>Total</Text>
                  <Text style={styles.modalTotalAmount}>
                    ${selectedOrder.totalAmount.toFixed(2)}
                  </Text>
                </View>

                {selectedOrder.status === 'READY' && selectedOrder.collectionCode && (
                  <>
                    <Divider />
                    <Surface style={styles.modalCollectionCode} elevation={2}>
                      <Text style={styles.modalCollectionLabel}>Show this code at collection</Text>
                      <Text style={styles.modalCollectionNumber}>
                        {selectedOrder.collectionCode}
                      </Text>
                    </Surface>
                  </>
                )}

                <View style={styles.modalActions}>
                  {selectedOrder.status === 'COMPLETED' && (
                    <Button
                      mode="contained"
                      onPress={() => {
                        setShowDetailsModal(false);
                        handleReorder(selectedOrder);
                      }}
                      icon="repeat"
                    >
                      Reorder
                    </Button>
                  )}
                  {(selectedOrder.status === 'PENDING' || selectedOrder.status === 'PREPARING') && (
                    <Button
                      mode="outlined"
                      onPress={() => {
                        Alert.alert(
                          'Contact Stall',
                          `Call ${selectedOrder.stall.name} at ${selectedOrder.stall.phoneNumber}?`,
                          [
                            { text: 'Cancel', style: 'cancel' },
                            { text: 'Call', onPress: () => console.log('Calling...') }
                          ]
                        );
                      }}
                      icon="phone"
                    >
                      Contact Stall
                    </Button>
                  )}
                </View>
              </ScrollView>
            </>
          )}
        </Modal>
      </Portal>

      {/* Notification Snackbar */}
      <Snackbar
        visible={notification.visible}
        onDismiss={() => setNotification(prev => ({ ...prev, visible: false }))}
        duration={4000}
        action={{
          label: 'Dismiss',
          onPress: () => setNotification(prev => ({ ...prev, visible: false })),
        }}
        style={[
          styles.snackbar,
          notification.type === 'error' && styles.errorSnackbar,
          notification.type === 'success' && styles.successSnackbar,
        ]}
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: theme.colors.gray[900],
  },
  headerBadge: {
    backgroundColor: theme.colors.success,
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
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.gray[900],
    marginTop: spacing.lg,
  },
  emptyText: {
    fontSize: 16,
    color: theme.colors.gray[600],
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  scanButton: {
    marginTop: spacing.lg,
  },
  listContent: {
    paddingBottom: spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: theme.colors.gray[50],
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.gray[700],
  },
  sectionCount: {
    fontSize: 14,
    color: theme.colors.gray[500],
  },
  orderCard: {
    marginHorizontal: spacing.lg,
    marginVertical: spacing.sm,
  },
  readyCard: {
    borderColor: theme.colors.success,
    borderWidth: 2,
  },
  progressContainer: {
    marginBottom: spacing.md,
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
  },
  progressSteps: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
    paddingHorizontal: spacing.xs,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  orderInfo: {
    flex: 1,
  },
  orderNumberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  orderNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.gray[900],
  },
  readyBadge: {
    backgroundColor: theme.colors.success,
  },
  stallName: {
    fontSize: 16,
    color: theme.colors.gray[800],
    marginTop: spacing.xs,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xs,
    gap: spacing.xs,
  },
  location: {
    fontSize: 14,
    color: theme.colors.gray[600],
  },
  collectionCode: {
    marginVertical: spacing.md,
    padding: spacing.md,
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: theme.colors.primary + '10',
  },
  collectionLabel: {
    fontSize: 12,
    color: theme.colors.gray[600],
    marginBottom: spacing.xs,
  },
  collectionNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.primary,
    letterSpacing: 2,
  },
  orderDetails: {
    marginTop: spacing.md,
    gap: spacing.xs,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  detailText: {
    fontSize: 14,
    color: theme.colors.gray[700],
  },
  statusChip: {
    marginTop: spacing.md,
    alignSelf: 'flex-start',
  },
  actionButtons: {
    marginTop: spacing.md,
    flexDirection: 'row',
    gap: spacing.sm,
  },
  reorderButton: {
    borderColor: theme.colors.primary,
  },
  modalContent: {
    backgroundColor: 'white',
    margin: 20,
    borderRadius: 8,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.gray[900],
  },
  modalStallInfo: {
    padding: spacing.lg,
  },
  modalStallName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.gray[900],
  },
  modalOrderNumber: {
    fontSize: 14,
    color: theme.colors.gray[600],
    marginTop: spacing.xs,
  },
  modalItems: {
    padding: spacing.lg,
  },
  modalSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.gray[800],
    marginBottom: spacing.md,
  },
  modalItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  modalItemInfo: {
    flex: 1,
  },
  modalItemName: {
    fontSize: 14,
    color: theme.colors.gray[800],
  },
  modalItemNote: {
    fontSize: 12,
    color: theme.colors.gray[600],
    marginTop: spacing.xs,
  },
  modalItemPrice: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.gray[900],
  },
  modalTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: spacing.lg,
  },
  modalTotalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.gray[800],
  },
  modalTotalAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
  modalCollectionCode: {
    margin: spacing.lg,
    padding: spacing.lg,
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: theme.colors.primary + '10',
  },
  modalCollectionLabel: {
    fontSize: 14,
    color: theme.colors.gray[600],
    marginBottom: spacing.sm,
  },
  modalCollectionNumber: {
    fontSize: 32,
    fontWeight: 'bold',
    color: theme.colors.primary,
    letterSpacing: 4,
  },
  modalActions: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  snackbar: {
    bottom: 20,
  },
  errorSnackbar: {
    backgroundColor: theme.colors.error,
  },
  successSnackbar: {
    backgroundColor: theme.colors.success,
  },
});

export default OrdersScreen;